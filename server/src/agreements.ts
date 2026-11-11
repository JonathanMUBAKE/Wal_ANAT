import { ATTACHMENT_MAX_BYTES, cleanName } from "./attachments.js";
import { type Queryable, uid } from "./db.js";
import { ALLOWED_FORMATS, detectType } from "./documents/filetypes.js";
import { Partners, agreementRef, agreementState } from "./partners.js";
import { Referentials } from "./referentials.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, today, type Services } from "./services.js";
import { Signature, type SignDoc, signReference, signatureHooks } from "./signature.js";

/*
 * Accords avec les partenaires et pièces de collaboration (lot PA2, docs/CONCEPTION.md § 4.4 à 4.6).
 * Un accord est préparé, passe au parapheur s'il est contraignant, entre en vigueur avec son numéro CONV/AAAA/NNNN
 * et son texte figé ; un avenant le modifie, une résiliation motivée le clôt. L'IA ne pose aucun de ces actes.
 */

export type AgreementState = "preparation" | "signature" | "vigueur" | "resilie";
/** Seuils d'alerte avant l'échéance, du plus large au plus serré (paramétrables au lot P5). */
const REMINDERS = [90, 30, 7];
const MAX_DOCUMENTS = 100;

export interface AgreementInput {
  type_code?: string;
  title?: string;
  content?: string;
  partner_ids?: string[];
  lead_partner_id?: string | null;
  partner_ref?: string;
  effective_on?: string | null;
  end_on?: string | null;
  new_end_on?: string | null;
  tacit_renewal?: boolean;
  unit_id?: string | null;
  focal_id?: string | null;
  confidential?: boolean;
}

interface Row {
  id: string;
  org_id: string;
  type_code: string;
  title: string;
  content: string;
  partner_ref: string;
  state: AgreementState;
  year: number | null;
  seq: number | null;
  signed_on: string | null;
  signed_outside: boolean;
  effective_on: string | null;
  end_on: string | null;
  tacit_renewal: boolean;
  unit_id: string | null;
  unit_name: string | null;
  focal_id: string | null;
  focal_name: string | null;
  confidential: boolean;
  parent_id: string | null;
  amendment_no: number | null;
  new_end_on: string | null;
  sign_document_id: string | null;
  reminded_days: number | null;
  ended_on: string | null;
  ended_reason: string;
  created_by: string | null;
  created_at: string;
  parties: { id: string; name: string; acronym: string; state: string; lead: boolean; focal: boolean }[];
}

const SELECT = (
  actor: string,
) => `SELECT a.id, a.org_id, a.type_code, a.title, a.content, a.partner_ref, a.state, a.year, a.seq,
  a.signed_on::text AS signed_on, a.signed_outside, a.effective_on::text AS effective_on, a.end_on::text AS end_on,
  a.tacit_renewal, a.unit_id, u.name AS unit_name, a.focal_id, f.name AS focal_name, a.confidential, a.parent_id,
  a.amendment_no, a.new_end_on::text AS new_end_on, a.sign_document_id, a.reminded_days, a.ended_on::text AS ended_on,
  a.ended_reason, a.created_by, a.created_at,
  COALESCE((SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'acronym', p.acronym, 'state', p.state,
      'lead', ap.lead, 'focal', (p.focal_id = ${actor} OR EXISTS (SELECT 1 FROM partner_focals pf WHERE pf.partner_id = p.id AND pf.user_id = ${actor})))
    ORDER BY ap.lead DESC, p.name)
    FROM agreement_parties ap JOIN partners p ON p.id = ap.partner_id WHERE ap.agreement_id = a.id), '[]'::json) AS parties
  FROM agreements a
  LEFT JOIN org_units u ON u.id = a.unit_id
  LEFT JOIN users f ON f.id = a.focal_id`;

const STATE_LABEL: Record<string, string> = {
  preparation: "En préparation",
  signature: "En signature",
  vigueur: "En vigueur",
  resilie: "Résilié",
  echu: "Échu",
};

export class Agreements {
  private ref: Referentials;
  private partners: Partners;
  constructor(private svc: Services) {
    this.ref = new Referentials(svc);
    this.partners = new Partners(svc);
  }

  // ------------------------------------------------------------------ droits

  private async human(actorId: string) {
    if ((await this.svc.userOrNull(actorId))?.is_ai)
      throw forbidden("Un accord est préparé et conclu par une personne, jamais par un coéquipier IA");
  }
  private async manager(actorId: string, orgId: string) {
    return (await this.svc.permissionsOf(actorId, orgId)).includes("partners.manage");
  }
  private async row(actorId: string, id: string) {
    return this.svc.db.one<Row>(`${SELECT("$2")} WHERE a.id = $1`, [id, actorId]);
  }
  /** Le suivi : point focal de l'accord ou de l'un de ses partenaires. */
  private follows = (a: Row, actorId: string) => a.focal_id === actorId || a.parties.some((p) => p.focal);

  private async readable(actorId: string, id: string) {
    const a = await this.row(actorId, id);
    if (!a || !(await this.svc.orgRole(actorId, a.org_id))) throw notFound("Accord introuvable");
    const manager = await this.manager(actorId, a.org_id);
    const mine = this.follows(a, actorId) || a.created_by === actorId;
    if (!manager && !mine) {
      await this.svc.requirePerm(actorId, a.org_id, "partners.view");
      if (a.confidential) throw notFound("Accord introuvable");
    }
    return { a, manager, edit: manager || this.follows(a, actorId) };
  }

  private async writable(actorId: string, id: string) {
    await this.human(actorId);
    const r = await this.readable(actorId, id);
    if (!r.edit)
      throw forbidden("Seuls les gestionnaires des partenariats et les points focaux font avancer cet accord");
    return r;
  }

  // ------------------------------------------------------------------ lecture

  private view(a: Row, now = today()) {
    const { reminded_days, ...rest } = a;
    return {
      ...rest,
      reference: agreementRef(a),
      state: agreementState(a, now),
      state_label: STATE_LABEL[agreementState(a, now)],
    };
  }

  async list(
    actorId: string,
    orgId: string,
    f: { state?: string; partner_id?: string; type?: string; q?: string } = {},
  ) {
    await this.svc.requirePerm(actorId, orgId, "partners.view");
    const manager = await this.manager(actorId, orgId);
    const q = f.q?.trim();
    const rows = await this.svc.db.query<Row>(
      `${SELECT("$3")} WHERE a.org_id = $1
       AND (NOT a.confidential OR $2 OR a.focal_id = $3 OR a.created_by = $3 OR EXISTS (
         SELECT 1 FROM agreement_parties ap JOIN partners p ON p.id = ap.partner_id WHERE ap.agreement_id = a.id
         AND (p.focal_id = $3 OR EXISTS (SELECT 1 FROM partner_focals pf WHERE pf.partner_id = p.id AND pf.user_id = $3))))
       AND ($4::text IS NULL OR EXISTS (SELECT 1 FROM agreement_parties ap WHERE ap.agreement_id = a.id AND ap.partner_id = $4))
       AND ($5::text IS NULL OR a.type_code = $5)
       AND ($6::text IS NULL OR a.title ILIKE $6 ESCAPE '\\' OR a.partner_ref ILIKE $6 ESCAPE '\\')
       ORDER BY a.year DESC NULLS FIRST, a.seq DESC NULLS FIRST, a.created_at DESC`,
      [orgId, manager, actorId, f.partner_id ?? null, f.type ?? null, q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null],
    );
    const now = today();
    return rows
      .map((r) => {
        const { content, ...v } = this.view(r, now);
        return v;
      })
      .filter((r) => !f.state || r.state === f.state);
  }

  async get(actorId: string, id: string) {
    const { a, manager, edit } = await this.readable(actorId, id);
    const db = this.svc.db;
    const v = this.view(a);
    const amendments = (
      await db.query<{
        id: string;
        title: string;
        state: string;
        year: number | null;
        seq: number | null;
        amendment_no: number;
        end_on: string | null;
        tacit_renewal: boolean;
        new_end_on: string | null;
      }>(
        `SELECT id, title, state, year, seq, amendment_no, end_on::text AS end_on, tacit_renewal, new_end_on::text AS new_end_on
         FROM agreements WHERE parent_id = $1 ORDER BY amendment_no`,
        [id],
      )
    ).map((x) => ({ ...x, reference: agreementRef(x), state: agreementState(x) }));
    const parent = a.parent_id
      ? await db.one<{ id: string; title: string; year: number | null; seq: number | null }>(
          "SELECT id, title, year, seq FROM agreements WHERE id = $1",
          [a.parent_id],
        )
      : null;
    const documents = await db.query(
      `SELECT d.id, d.nature_code, d.official, d.filename, d.mime, d.size, d.created_at, d.uploader_id, u.name AS uploader_name
       FROM partner_documents d LEFT JOIN users u ON u.id = d.uploader_id WHERE d.agreement_id = $1 ORDER BY d.created_at DESC`,
      [id],
    );
    const sign = a.sign_document_id
      ? await db.one<Pick<SignDoc, "id" | "year" | "seq" | "status">>(
          "SELECT id, year, seq, status FROM sign_documents WHERE id = $1",
          [a.sign_document_id],
        )
      : null;
    const type = (await this.ref.values(a.org_id, "agreement_type")).find((t) => t.code === a.type_code);
    const human = !(await this.svc.userOrNull(actorId))?.is_ai;
    const live = a.state === "vigueur";
    return {
      ...v,
      binding: !!type?.props.binding,
      parent: parent && { id: parent.id, title: parent.title, reference: agreementRef(parent) },
      amendments,
      documents,
      sign_document: sign && { id: sign.id, status: sign.status, reference: signReference(sign) },
      can: {
        edit: human && edit && a.state === "preparation",
        sign: human && edit && a.state === "preparation",
        activate: human && edit && a.state === "preparation" && (!type?.props.binding || manager),
        amend: human && edit && live && !a.parent_id,
        terminate: human && manager && live,
        delete: human && (manager || a.created_by === actorId) && a.state === "preparation",
      },
    };
  }

  // ------------------------------------------------------------------ contrôles

  /** Partenaires de l'accord : de l'institution, fiches vivantes, ni suspendus ni clos. */
  private async parties(orgId: string, ids: string[], lead?: string | null) {
    const unique = [...new Set(ids)];
    if (!unique.length) throw badRequest("Un accord lie au moins un partenaire");
    const rows = await this.svc.db.query<{
      id: string;
      name: string;
      state: string;
      confidential: boolean;
      merged_into: string | null;
    }>("SELECT id, name, state, confidential, merged_into FROM partners WHERE org_id = $1 AND id = ANY($2::text[])", [
      orgId,
      unique,
    ]);
    if (rows.length !== unique.length || rows.some((r) => r.merged_into))
      throw badRequest("Partenaire inconnu dans l'annuaire ou fiche fusionnée");
    const blocked = rows.find((r) => r.state === "suspendu" || r.state === "clos");
    if (blocked)
      throw new HttpError(
        409,
        `« ${blocked.name} » est ${blocked.state === "clos" ? "clos" : "suspendu"} : aucun nouvel accord tant qu'il l'est`,
      );
    if (lead && !unique.includes(lead)) throw badRequest("Le chef de file doit être l'un des partenaires de l'accord");
    return { ids: unique, lead: lead ?? unique[0], confidential: rows.some((r) => r.confidential) };
  }

  private dates(i: AgreementInput, current?: Row) {
    for (const d of [i.effective_on, i.end_on, i.new_end_on])
      if (d && !isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    const start = i.effective_on !== undefined ? i.effective_on : (current?.effective_on ?? null);
    const end = i.end_on !== undefined ? i.end_on : (current?.end_on ?? null);
    if (start && end && end < start) throw badRequest("L'échéance précède la date d'entrée en vigueur");
  }

  private async person(orgId: string, userId: string | null | undefined) {
    if (!userId) return;
    const u = await this.svc.userOrNull(userId);
    const role = u ? await this.svc.orgRole(userId, orgId) : null;
    if (!u || u.is_ai || !role || role === "guest")
      throw badRequest("Le point focal doit être une personne de l'institution");
  }

  private async unit(orgId: string, unitId: string | null | undefined) {
    if (unitId && !(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [orgId, unitId])))
      throw badRequest("Entité inconnue dans l'institution");
  }

  private history(q: Queryable, orgId: string, partnerIds: string[], actorId: string, body: string, data = {}) {
    return Promise.all(
      partnerIds.map((p) =>
        q.query(
          `INSERT INTO partner_history (id, org_id, partner_id, actor_id, kind, body, data, happened_on)
           VALUES ($1,$2,$3,$4,'agreement',$5,$6,$7::date)`,
          [uid("phi"), orgId, p, actorId, body, JSON.stringify(data), today()],
        ),
      ),
    );
  }

  /** Les partenaires d'un accord en discussion ou conclu avancent d'eux-mêmes dans leur cycle. */
  private async advancePartners(
    q: Queryable,
    orgId: string,
    ids: string[],
    actorId: string,
    to: "en_discussion" | "actif",
  ) {
    const from = to === "actif" ? ["identifie", "en_discussion"] : ["identifie"];
    const moved = await q.query<{ id: string; old: string }>(
      `UPDATE partners p SET state = $1, engaged = TRUE, state_reason = '', updated_at = now()
       FROM (SELECT id, state AS old FROM partners WHERE org_id = $2 AND id = ANY($3::text[]) AND state = ANY($4::text[])) o
       WHERE p.id = o.id RETURNING p.id, o.old`,
      [to, orgId, ids, from],
    );
    for (const m of moved)
      await q.query(
        `INSERT INTO partner_history (id, org_id, partner_id, actor_id, kind, body, data, happened_on)
         VALUES ($1,$2,$3,$4,'state',$5,$6,$7::date)`,
        [
          uid("phi"),
          orgId,
          m.id,
          actorId,
          to === "actif" ? "Accord entré en vigueur" : "Accord en préparation",
          JSON.stringify({ from: m.old, to }),
          today(),
        ],
      );
  }

  // ------------------------------------------------------------------ écriture

  async create(
    actorId: string,
    orgId: string,
    i: AgreementInput & { title: string; type_code: string; partner_ids: string[] },
  ) {
    await this.human(actorId);
    const p = await this.parties(orgId, i.partner_ids ?? [], i.lead_partner_id);
    if (!(await this.manager(actorId, orgId))) {
      // Le point focal d'un des partenaires prépare l'accord qu'il suit
      const follows = await this.svc.db.one(
        `SELECT 1 FROM partners p WHERE p.id = ANY($1::text[]) AND (p.focal_id = $2
          OR EXISTS (SELECT 1 FROM partner_focals pf WHERE pf.partner_id = p.id AND pf.user_id = $2)) LIMIT 1`,
        [p.ids, actorId],
      );
      if (!follows)
        throw forbidden(
          "Seuls les gestionnaires des partenariats et les points focaux des partenaires préparent un accord",
        );
    }
    const type = await this.ref.resolve(orgId, "agreement_type", i.type_code);
    this.dates(i);
    await this.person(orgId, i.focal_id);
    await this.unit(orgId, i.unit_id);
    const id = uid("agr");
    await this.svc.db.tx(async (q) => {
      await q.query(
        `INSERT INTO agreements (id, org_id, type_code, title, content, partner_ref, effective_on, end_on, tacit_renewal,
          unit_id, focal_id, confidential, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          id,
          orgId,
          type.code,
          i.title.trim(),
          i.content?.trim() ?? "",
          i.partner_ref?.trim() ?? "",
          i.effective_on ?? null,
          i.end_on ?? null,
          !!i.tacit_renewal,
          i.unit_id ?? null,
          i.focal_id ?? null,
          !!i.confidential || p.confidential,
          actorId,
        ],
      );
      for (const pid of p.ids)
        await q.query("INSERT INTO agreement_parties (org_id, agreement_id, partner_id, lead) VALUES ($1,$2,$3,$4)", [
          orgId,
          id,
          pid,
          pid === p.lead,
        ]);
      await this.advancePartners(q, orgId, p.ids, actorId, "en_discussion");
      await this.history(q, orgId, p.ids, actorId, `Accord en préparation : ${i.title.trim()}`, { agreement: id });
    });
    await this.svc.log(actorId, "agreement.created", { orgId, data: { id, title: i.title.trim(), type: type.code } });
    if (i.focal_id && i.focal_id !== actorId)
      await this.svc.notify(i.focal_id, orgId, {
        kind: "agreement.focal",
        title: `Accord à suivre : ${i.title.trim()}`,
        body: "Vous êtes point focal de cet accord (Partenariats › Conventions).",
        actor_id: actorId,
      });
    return this.get(actorId, id);
  }

  async update(actorId: string, id: string, i: AgreementInput) {
    const { a, manager } = await this.writable(actorId, id);
    if (a.state !== "preparation")
      throw new HttpError(
        409,
        a.state === "signature"
          ? "L'accord est au parapheur : son texte est scellé pendant le circuit"
          : "Un accord entré en vigueur ne se modifie plus : passez par un avenant",
      );
    if (!manager && (i.focal_id !== undefined || i.confidential !== undefined))
      if ((i.focal_id ?? null) !== a.focal_id || (i.confidential !== undefined && i.confidential !== a.confidential))
        throw forbidden("Désigner le point focal et régler la confidentialité reviennent aux gestionnaires");
    if (a.parent_id && (i.partner_ids !== undefined || i.type_code !== undefined))
      throw badRequest("Un avenant garde le type et les parties de l'accord qu'il modifie");
    const type =
      i.type_code !== undefined
        ? (await this.ref.resolve(a.org_id, "agreement_type", i.type_code, a.type_code)).code
        : a.type_code;
    const p =
      i.partner_ids !== undefined
        ? await this.parties(a.org_id, i.partner_ids, i.lead_partner_id)
        : i.lead_partner_id !== undefined
          ? await this.parties(
              a.org_id,
              a.parties.map((x) => x.id),
              i.lead_partner_id,
            )
          : null;
    this.dates(i, a);
    if (i.focal_id !== undefined) await this.person(a.org_id, i.focal_id);
    if (i.unit_id !== undefined) await this.unit(a.org_id, i.unit_id);
    await this.svc.db.tx(async (q) => {
      await q.query(
        `UPDATE agreements SET type_code = $1, title = $2, content = $3, partner_ref = $4, effective_on = $5, end_on = $6,
          tacit_renewal = $7, unit_id = $8, focal_id = $9, confidential = $10, new_end_on = $11, updated_at = now()
         WHERE id = $12 AND state = 'preparation'`,
        [
          type,
          i.title?.trim() || a.title,
          i.content !== undefined ? i.content.trim() : a.content,
          i.partner_ref !== undefined ? i.partner_ref.trim() : a.partner_ref,
          i.effective_on !== undefined ? i.effective_on : a.effective_on,
          i.end_on !== undefined ? i.end_on : a.end_on,
          i.tacit_renewal ?? a.tacit_renewal,
          i.unit_id !== undefined ? i.unit_id : a.unit_id,
          i.focal_id !== undefined ? i.focal_id : a.focal_id,
          (i.confidential ?? a.confidential) || !!p?.confidential,
          a.parent_id && i.new_end_on !== undefined ? i.new_end_on : a.new_end_on,
          id,
        ],
      );
      if (p) {
        await q.query("DELETE FROM agreement_parties WHERE agreement_id = $1", [id]);
        for (const pid of p.ids)
          await q.query("INSERT INTO agreement_parties (org_id, agreement_id, partner_id, lead) VALUES ($1,$2,$3,$4)", [
            a.org_id,
            id,
            pid,
            pid === p.lead,
          ]);
        await this.advancePartners(q, a.org_id, p.ids, actorId, "en_discussion");
      }
    });
    await this.svc.log(actorId, "agreement.updated", { orgId: a.org_id, data: { id, fields: Object.keys(i) } });
    return this.get(actorId, id);
  }

  async remove(actorId: string, id: string) {
    await this.human(actorId);
    const { a, manager } = await this.readable(actorId, id);
    if (!manager && a.created_by !== actorId)
      throw forbidden("Supprimer un accord en préparation revient à son auteur ou aux gestionnaires");
    if (a.state !== "preparation")
      throw new HttpError(409, "Un accord passé au parapheur ou entré en vigueur ne se supprime pas");
    await this.svc.db.tx(async (q) => {
      // Les pièces restent au partenaire : seule la préparation disparaît
      await q.query("UPDATE partner_documents SET agreement_id = NULL WHERE agreement_id = $1", [id]);
      await q.query("DELETE FROM agreements WHERE id = $1", [id]);
      await this.history(
        q,
        a.org_id,
        a.parties.map((p) => p.id),
        actorId,
        `Accord en préparation abandonné : ${a.title}`,
      );
    });
    await this.svc.log(actorId, "agreement.deleted", { orgId: a.org_id, data: { id, title: a.title } });
    return { ok: true };
  }

  /** Passage au parapheur : le texte est scellé pendant le circuit ; la signature fait entrer l'accord en vigueur. */
  async sign(actorId: string, id: string, steps: { actor_id: string; action: "avis" | "visa" | "signature" }[]) {
    const { a } = await this.writable(actorId, id);
    if (a.state !== "preparation") throw new HttpError(409, "Seul un accord en préparation passe au parapheur");
    if (!a.content.trim()) throw badRequest("Rédigez le texte de l'accord avant de le soumettre à la signature");
    const type = (await this.ref.values(a.org_id, "agreement_type")).find((t) => t.code === a.type_code);
    const parties = a.parties.map((p) => p.name).join(", ");
    const signature = new Signature(this.svc);
    const doc = await signature.create(actorId, a.org_id, {
      title: `${type?.label ?? "Accord"} — ${a.title}`,
      kind: type?.label ?? "Accord",
      body: `Parties : Agence et ${parties}\n\n${a.content}`,
      unit_id: a.unit_id,
      confidential: a.confidential,
      steps,
    });
    await signature.start(actorId, doc.id);
    const moved = await this.svc.db.one(
      "UPDATE agreements SET state = 'signature', sign_document_id = $1, updated_at = now() WHERE id = $2 AND state = 'preparation' RETURNING id",
      [doc.id, id],
    );
    if (!moved) throw new HttpError(409, "L'accord a changé entre-temps, rechargez la page");
    await this.history(
      this.svc.db,
      a.org_id,
      a.parties.map((p) => p.id),
      actorId,
      `Accord soumis au parapheur (${signReference(doc)}) : ${a.title}`,
    );
    await this.svc.log(actorId, "agreement.sign", { orgId: a.org_id, data: { id, document: doc.id } });
    return this.get(actorId, id);
  }

  /** Suite du parapheur : signé, l'accord entre en vigueur ; rejeté, il revient en préparation. */
  async onSignature(doc: SignDoc, outcome: "signed" | "rejected", actorId: string, comment: string) {
    const a = await this.svc.db.one<Row>(`${SELECT("$2")} WHERE a.sign_document_id = $1 AND a.state = 'signature'`, [
      doc.id,
      actorId,
    ]);
    if (!a) return;
    if (outcome === "rejected") {
      await this.svc.db.query(
        "UPDATE agreements SET state = 'preparation', sign_document_id = NULL, updated_at = now() WHERE id = $1",
        [a.id],
      );
      await this.history(
        this.svc.db,
        a.org_id,
        a.parties.map((p) => p.id),
        actorId,
        `Accord rejeté au parapheur, de retour en préparation : ${comment}`,
      );
      for (const u of new Set([a.focal_id, a.created_by].filter((x): x is string => !!x)))
        await this.svc.notify(u, a.org_id, {
          kind: "agreement.rejected",
          title: `Accord rejeté au parapheur : ${a.title}`,
          body: comment,
          actor_id: actorId,
        });
      return;
    }
    await this.enter(a, actorId, today(), null, false);
  }

  /** Entrée en vigueur sans parapheur : type non contraignant, ou exemplaire signé sur papier déclaré par un gestionnaire. */
  async activate(actorId: string, id: string, i: { signed_on: string; effective_on?: string | null }) {
    const { a, manager } = await this.writable(actorId, id);
    if (a.state !== "preparation")
      throw new HttpError(
        409,
        a.state === "signature"
          ? "L'accord est au parapheur : il entrera en vigueur à sa signature"
          : "Cet accord est déjà conclu",
      );
    if (!isRealDate(i.signed_on) || (i.effective_on && !isRealDate(i.effective_on))) throw badRequest("Date invalide");
    if (i.signed_on > today()) throw badRequest("La date de signature ne peut pas être dans le futur");
    const type = (await this.ref.values(a.org_id, "agreement_type")).find((t) => t.code === a.type_code);
    let outside = false;
    if (type?.props.binding) {
      if (
        !(await this.svc.db.one("SELECT 1 FROM partner_documents WHERE agreement_id = $1 AND official LIMIT 1", [id]))
      )
        throw new HttpError(
          409,
          "Un accord de ce type entre en vigueur par sa signature au parapheur, ou en joignant l'exemplaire signé (pièce officielle)",
        );
      if (!manager)
        throw forbidden("Déclarer un accord signé hors parapheur revient aux gestionnaires des partenariats");
      outside = true;
    }
    const blocked = a.parties.find((p) => p.state === "suspendu" || p.state === "clos");
    if (blocked)
      throw new HttpError(409, `« ${blocked.name} » est ${blocked.state} : l'accord ne peut pas entrer en vigueur`);
    const start = i.effective_on ?? a.effective_on ?? i.signed_on;
    if (a.end_on && a.end_on < start) throw badRequest("L'échéance précède la date d'entrée en vigueur");
    await this.enter(a, actorId, i.signed_on, i.effective_on ?? null, outside);
    return this.get(actorId, id);
  }

  /** Numéro du registre, texte figé, partenaires actifs ; un avenant reporte sa nouvelle échéance sur l'accord. */
  private async enter(a: Row, actorId: string, signedOn: string, effectiveOn: string | null, outside: boolean) {
    const year = Number(signedOn.slice(0, 4));
    for (let attempt = 0; ; attempt++) {
      try {
        await this.svc.db.tx(async (q) => {
          const r = await q.query(
            `UPDATE agreements SET state = 'vigueur', year = $1,
              seq = (SELECT COALESCE(max(seq), 0) + 1 FROM agreements WHERE org_id = $2 AND year = $1),
              signed_on = $3, effective_on = COALESCE($4::date, effective_on, $3::date), signed_outside = $5,
              reminded_days = NULL, updated_at = now()
             WHERE id = $6 AND state IN ('preparation', 'signature') RETURNING id`,
            [year, a.org_id, signedOn, effectiveOn, outside, a.id],
          );
          if (!r.length) throw new HttpError(409, "L'accord a changé entre-temps, rechargez la page");
          if (a.parent_id && a.new_end_on)
            await q.query("UPDATE agreements SET end_on = $1, reminded_days = NULL, updated_at = now() WHERE id = $2", [
              a.new_end_on,
              a.parent_id,
            ]);
          const ids = a.parties.map((p) => p.id);
          await this.advancePartners(q, a.org_id, ids, actorId, "actif");
          await this.history(q, a.org_id, ids, actorId, `Accord entré en vigueur : ${a.title}`, { agreement: a.id });
        });
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "23505" || attempt >= 8) throw e;
      }
    }
    const done = await this.svc.db.one<{ year: number; seq: number }>(
      "SELECT year, seq FROM agreements WHERE id = $1",
      [a.id],
    );
    await this.svc.log(actorId, "agreement.in_force", {
      orgId: a.org_id,
      data: { id: a.id, reference: done && agreementRef(done), outside, amends: a.parent_id },
    });
    for (const u of new Set([a.focal_id, a.created_by].filter((x): x is string => !!x && x !== actorId)))
      await this.svc.notify(u, a.org_id, {
        kind: "agreement.in_force",
        title: `Accord en vigueur : ${a.title}`,
        body: done ? (agreementRef(done) ?? "") : "",
        actor_id: actorId,
      });
  }

  async amend(actorId: string, id: string, i: { title: string; content?: string; new_end_on?: string | null }) {
    const { a } = await this.writable(actorId, id);
    if (a.parent_id) throw badRequest("Un avenant se rattache à l'accord lui-même, pas à un autre avenant");
    if (a.state !== "vigueur") throw new HttpError(409, "Seul un accord en vigueur se modifie par avenant");
    if (i.new_end_on && (!isRealDate(i.new_end_on) || (a.effective_on && i.new_end_on < a.effective_on)))
      throw badRequest("Nouvelle échéance invalide");
    const id2 = uid("agr");
    const no =
      ((
        await this.svc.db.one<{ n: number }>(
          "SELECT COALESCE(max(amendment_no), 0)::int AS n FROM agreements WHERE parent_id = $1",
          [id],
        )
      )?.n ?? 0) + 1;
    await this.svc.db.tx(async (q) => {
      await q.query(
        `INSERT INTO agreements (id, org_id, type_code, title, content, partner_ref, unit_id, focal_id, confidential,
          parent_id, amendment_no, new_end_on, created_by)
         VALUES ($1,$2,$3,$4,$5,'',$6,$7,$8,$9,$10,$11,$12)`,
        [
          id2,
          a.org_id,
          a.type_code,
          i.title.trim(),
          i.content?.trim() ?? "",
          a.unit_id,
          a.focal_id,
          a.confidential,
          id,
          no,
          i.new_end_on ?? null,
          actorId,
        ],
      );
      for (const p of a.parties)
        await q.query("INSERT INTO agreement_parties (org_id, agreement_id, partner_id, lead) VALUES ($1,$2,$3,$4)", [
          a.org_id,
          id2,
          p.id,
          p.lead,
        ]);
      await this.history(
        q,
        a.org_id,
        a.parties.map((p) => p.id),
        actorId,
        `Avenant n° ${no} en préparation : ${i.title.trim()}`,
        { agreement: id2 },
      );
    });
    await this.svc.log(actorId, "agreement.amendment", { orgId: a.org_id, data: { id: id2, amends: id, no } });
    return this.get(actorId, id2);
  }

  async terminate(actorId: string, id: string, i: { reason: string; ended_on: string }) {
    await this.human(actorId);
    const { a, manager } = await this.readable(actorId, id);
    if (!manager) throw forbidden("Résilier un accord revient aux gestionnaires des partenariats");
    if (a.state !== "vigueur") throw new HttpError(409, "Seul un accord conclu se résilie");
    const reason = i.reason.trim();
    if (!reason) throw badRequest("Le motif de la résiliation est obligatoire");
    if (!isRealDate(i.ended_on) || (a.signed_on && i.ended_on < a.signed_on))
      throw badRequest("Date de résiliation invalide");
    await this.svc.db.tx(async (q) => {
      await q.query(
        "UPDATE agreements SET state = 'resilie', ended_on = $1, ended_reason = $2, updated_at = now() WHERE id = $3",
        [i.ended_on, reason, id],
      );
      await this.history(
        q,
        a.org_id,
        a.parties.map((p) => p.id),
        actorId,
        `Accord résilié (${agreementRef(a)}) : ${reason}`,
      );
    });
    await this.svc.log(actorId, "agreement.terminated", {
      orgId: a.org_id,
      data: { id, reference: agreementRef(a), reason },
    });
    return this.get(actorId, id);
  }

  /** Alertes d'échéance : chaque seuil (90, 30, 7 jours) prévient une seule fois le point focal, à défaut l'auteur. */
  async sweep(now = today()) {
    const rows = await this.svc.db.query<{
      id: string;
      org_id: string;
      title: string;
      year: number;
      seq: number;
      end_on: string;
      tacit_renewal: boolean;
      focal_id: string | null;
      created_by: string | null;
      reminded_days: number | null;
    }>(
      `SELECT id, org_id, title, year, seq, end_on::text AS end_on, tacit_renewal, focal_id, created_by, reminded_days
       FROM agreements WHERE state = 'vigueur' AND end_on IS NOT NULL AND end_on >= $1::date AND end_on <= $1::date + $2::int`,
      [now, REMINDERS[0]],
    );
    for (const a of rows) {
      const left = Math.round((Date.parse(`${a.end_on}T00:00:00Z`) - Date.parse(`${now}T00:00:00Z`)) / 864e5);
      const threshold = [...REMINDERS].reverse().find((t) => left <= t);
      if (!threshold || (a.reminded_days !== null && threshold >= a.reminded_days)) continue;
      const to = a.focal_id ?? a.created_by;
      if (to)
        await this.svc.notify(to, a.org_id, {
          kind: "agreement.ending",
          title: `Échéance dans ${left} jour${left > 1 ? "s" : ""} : ${a.title}`,
          body: `${agreementRef(a)} · ${
            a.tacit_renewal
              ? "reconduction tacite : dénoncer avant l'échéance si nécessaire"
              : "prolonger par avenant ou laisser échoir"
          }`,
        });
      await this.svc.db.query("UPDATE agreements SET reminded_days = $1 WHERE id = $2", [threshold, a.id]);
    }
  }

  // ------------------------------------------------------------------ pièces de collaboration

  async addDocument(
    actorId: string,
    partnerId: string,
    filename: string,
    data: Buffer,
    i: { nature: string; agreement_id?: string },
  ) {
    await this.human(actorId);
    const { p, manager, focal } = await this.partners.access(actorId, partnerId);
    if (p.merged_into) throw new HttpError(409, "Cette fiche a été fusionnée avec une autre");
    if (!manager && !focal)
      throw forbidden("Seuls les gestionnaires des partenariats et les points focaux joignent des pièces");
    const nature = await this.ref.resolve(p.org_id, "partner_doc_nature", i.nature);
    if (
      i.agreement_id &&
      !(await this.svc.db.one("SELECT 1 FROM agreement_parties WHERE agreement_id = $1 AND partner_id = $2", [
        i.agreement_id,
        partnerId,
      ]))
    )
      throw badRequest("Cet accord ne lie pas ce partenaire");
    if (!data.length) throw badRequest("Le fichier est vide");
    if (data.length > ATTACHMENT_MAX_BYTES) throw new HttpError(413, "Fichier trop volumineux : 25 Mo au maximum");
    const name = cleanName(filename);
    const type = detectType(name, data);
    if (!type) throw new HttpError(415, `Format non pris en charge. Formats acceptés : ${ALLOWED_FORMATS}`);
    const n = await this.svc.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM partner_documents WHERE partner_id = $1",
      [partnerId],
    );
    if ((n?.n ?? 0) >= MAX_DOCUMENTS)
      throw badRequest(`Un partenaire ne peut pas avoir plus de ${MAX_DOCUMENTS} pièces`);
    const id = uid("pdc");
    await this.svc.db.tx(async (q) => {
      await q.query(
        `INSERT INTO partner_documents (id, org_id, partner_id, agreement_id, nature_code, official, filename, mime, size, data, uploader_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          p.org_id,
          partnerId,
          i.agreement_id ?? null,
          nature.code,
          !!nature.props.official,
          name,
          type.mime,
          data.length,
          data,
          actorId,
        ],
      );
      await q.query(
        `INSERT INTO partner_history (id, org_id, partner_id, actor_id, kind, body, happened_on)
         VALUES ($1,$2,$3,$4,'document',$5,$6::date)`,
        [uid("phi"), p.org_id, partnerId, actorId, `Pièce jointe (${nature.label}) : ${name}`, today()],
      );
    });
    await this.svc.log(actorId, "partner.document", {
      orgId: p.org_id,
      data: { partner: partnerId, document: id, nature: nature.code, filename: name },
    });
    return {
      id,
      filename: name,
      mime: type.mime,
      size: data.length,
      nature_code: nature.code,
      official: !!nature.props.official,
    };
  }

  private async documentRow(actorId: string, docId: string) {
    const d = await this.svc.db.one<{
      id: string;
      org_id: string;
      partner_id: string;
      agreement_id: string | null;
      official: boolean;
      filename: string;
      mime: string;
      uploader_id: string | null;
    }>(
      "SELECT id, org_id, partner_id, agreement_id, official, filename, mime, uploader_id FROM partner_documents WHERE id = $1",
      [docId],
    );
    if (!d) throw notFound("Pièce introuvable");
    const access = await this.partners.access(actorId, d.partner_id).catch(() => {
      throw notFound("Pièce introuvable");
    });
    // Une pièce d'un accord confidentiel suit l'accord
    if (d.agreement_id)
      await this.readable(actorId, d.agreement_id).catch(() => {
        throw notFound("Pièce introuvable");
      });
    return { d, ...access };
  }

  async document(actorId: string, docId: string) {
    const { d } = await this.documentRow(actorId, docId);
    const file = await this.svc.db.one<{ data: Buffer }>("SELECT data FROM partner_documents WHERE id = $1", [docId]);
    await this.svc.log(actorId, "partner.document.read", { orgId: d.org_id, data: { document: docId } });
    return { ...d, data: file!.data };
  }

  /** Une pièce officielle (convention signée, avenant…) ne se supprime pas ; les autres, par leur auteur ou un gestionnaire. */
  async removeDocument(actorId: string, docId: string) {
    await this.human(actorId);
    const { d, manager } = await this.documentRow(actorId, docId);
    if (d.official) throw new HttpError(409, "Une pièce officielle ne se supprime pas : elle reste au dossier");
    if (!manager && d.uploader_id !== actorId)
      throw forbidden("Seuls l'auteur de la pièce et les gestionnaires des partenariats la suppriment");
    await this.svc.db.query("DELETE FROM partner_documents WHERE id = $1", [docId]);
    await this.svc.log(actorId, "partner.document.deleted", {
      orgId: d.org_id,
      data: { partner: d.partner_id, filename: d.filename },
    });
    return { ok: true };
  }
}

// Le parapheur prévient les accords de l'issue de leur circuit
signatureHooks.push((svc, doc, outcome, actorId, comment) =>
  new Agreements(svc).onSignature(doc, outcome, actorId, comment),
);
