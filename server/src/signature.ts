import { createHash } from "node:crypto";
import { uid } from "./db.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, type Services, localDate } from "./services.js";

export interface SignDoc {
  id: string;
  org_id: string;
  year: number;
  seq: number;
  title: string;
  kind: string;
  body: string;
  domain_id: string | null;
  unit_id: string | null;
  confidential: boolean;
  status: "draft" | "in_circuit" | "signed" | "rejected";
  /** Le document engage l'Agence : sa signature finale revient à la DG (thème 2, CV-1). */
  binding: boolean;
  content_hash: string | null;
  due_on: string | null;
  created_by: string | null;
}
interface Step {
  id: string;
  document_id: string;
  position: number;
  actor_id: string | null;
  action: "avis" | "visa" | "signature";
  status: "waiting" | "pending" | "approved" | "rejected";
}
export interface SignInput {
  title: string;
  kind?: string;
  body?: string;
  domain_id?: string | null;
  unit_id?: string | null;
  confidential?: boolean;
  due_on?: string | null;
  steps: { actor_id: string; action: Step["action"] }[];
  /** Imposé par le module appelant (un accord engage toujours l'Agence) ; sinon déduit de la nature. */
  binding?: boolean;
}
/** Natures qui engagent l'Agence envers un tiers : leur signature revient à la DG ou à son délégataire. */
const BINDING = /(convention|accord|avenant|contrat|protocole|m[ée]morandum|arr[êe]t[ée]|engagement)/i;
export const isBinding = (i: Pick<SignInput, "kind" | "binding">) => !!i.binding || BINDING.test(i.kind ?? "");
/** Durée maximale d'une délégation (PH-3) : au-delà, on la renouvelle, ce qui laisse une trace. */
const DELEGATION_MAX_DAYS = 30;
const today = () => localDate();
const reference = (d: Pick<SignDoc, "year" | "seq">) => `PAR/${d.year}/${String(d.seq).padStart(4, "0")}`;
export const signReference = reference;

/**
 * Suites données à la fin d'un circuit par les modules qui passent par le parapheur (ex. un accord avec un
 * partenaire entre en vigueur à sa signature). Elles s'exécutent après l'enregistrement de la décision.
 */
export type SignatureHook = (
  svc: Services,
  doc: SignDoc,
  outcome: "signed" | "rejected",
  actorId: string,
  comment: string,
) => Promise<void>;
export const signatureHooks: SignatureHook[] = [];
const hashOf = (d: Pick<SignDoc, "title" | "body">) =>
  createHash("sha256")
    .update(JSON.stringify([d.title, d.body]))
    .digest("hex");
const notDraft = () => new HttpError(409, "Ce document est déjà dans le circuit : il ne peut plus être modifié");

/** Délégations en cours au profit d'une personne : qui l'a chargée d'agir à sa place aujourd'hui. */
/** Délégations en cours : à la date locale du serveur, pas CURRENT_DATE (UTC) qui retarde autour de minuit. */
const DELEGATORS = `SELECT from_user, scope FROM delegations WHERE org_id = $1 AND to_user = $2 AND start_on <= $3::date AND end_on >= $3::date AND revoked_at IS NULL`;

export class Signature {
  constructor(private svc: Services) {}

  private async row(id: string) {
    const d = await this.svc.db.one<SignDoc>("SELECT * FROM sign_documents WHERE id = $1", [id]);
    if (!d) throw notFound("Document introuvable");
    return d;
  }
  private steps(id: string) {
    return this.svc.db.query<
      Step & { actor_name: string | null; acted_by_name: string | null; acted_at: string | null; comment: string }
    >(
      `SELECT s.*, a.name AS actor_name, b.name AS acted_by_name FROM sign_steps s LEFT JOIN users a ON a.id = s.actor_id LEFT JOIN users b ON b.id = s.acted_by WHERE s.document_id = $1 ORDER BY s.position`,
      [id],
    );
  }
  /** Qui m'a délégué son parapheur aujourd'hui ; pour une signature, seulement les délégations de signature. */
  private async delegators(orgId: string, userId: string, action?: Step["action"]) {
    return (await this.svc.db.query<{ from_user: string; scope: string }>(DELEGATORS, [orgId, userId, today()]))
      .filter((r) => action !== "signature" || r.scope === "signature")
      .map((r) => r.from_user);
  }
  /** L'auteur n'intervient qu'en signataire final, après le visa ou l'avis d'une autre personne (PH-2). */
  private authorMaySign(d: Pick<SignDoc, "created_by">, steps: Pick<Step, "actor_id" | "action" | "position">[], s: Pick<Step, "actor_id" | "action" | "position">) {
    const last = steps.reduce((m, x) => Math.max(m, x.position), -1);
    return (
      s.actor_id === d.created_by &&
      s.action === "signature" &&
      s.position === last &&
      steps.some((x) => x.position < s.position && x.actor_id && x.actor_id !== d.created_by)
    );
  }
  private async readable(actorId: string, id: string) {
    const d = await this.row(id);
    await this.svc.requirePerm(actorId, d.org_id, "signature.use");
    const steps = await this.steps(id);
    const mine = new Set([actorId, ...(await this.delegators(d.org_id, actorId))]);
    const participant = d.created_by === actorId || steps.some((s) => s.actor_id && mine.has(s.actor_id));
    const oversight = !d.confidential && (await this.svc.permissionsOf(actorId, d.org_id)).includes("pilotage.view");
    if (!participant && !oversight) throw notFound("Document introuvable");
    return { d, steps, mine };
  }
  private async assertInput(orgId: string, actorId: string, i: SignInput) {
    if (!i.steps.length) throw badRequest("Le circuit doit comporter au moins une étape");
    if (i.steps.at(-1)?.action !== "signature")
      throw badRequest("La dernière étape du circuit doit être une signature");
    for (const [n, s] of i.steps.entries()) {
      if (s.actor_id === actorId) {
        const last = n === i.steps.length - 1 && s.action === "signature";
        if (!last) throw badRequest("L'auteur d'un document ne peut pas le viser ni donner son avis dans son circuit");
        if (!i.steps.slice(0, n).some((x) => x.actor_id !== actorId))
          throw badRequest(
            "Pour signer un document que vous avez préparé, le circuit doit comporter un visa ou un avis d'une autre personne",
          );
      }
      const role = await this.svc.orgRole(s.actor_id, orgId);
      if (!role) throw badRequest("Chaque intervenant doit être membre de l'organisation");
      // Sans accès au parapheur, l'intervenant ne pourrait jamais agir : le document resterait bloqué à son étape
      if (role === "guest" || !(await this.svc.permissionsOf(s.actor_id, orgId)).includes("signature.use"))
        throw badRequest("Chaque intervenant doit avoir accès au parapheur");
    }
    const final = i.steps.at(-1)!;
    if (isBinding(i) && !(await this.svc.permissionsOf(final.actor_id, orgId)).includes("signature.institution"))
      throw badRequest(
        "Ce document engage l'Agence (convention, accord, avenant…) : la signature finale revient à la DG, qui peut la déléguer",
      );
    if (i.due_on && !isRealDate(i.due_on)) throw badRequest(`Date invalide : ${i.due_on}`);
    if (
      i.domain_id &&
      !(await this.svc.db.one("SELECT 1 FROM activity_domains WHERE org_id = $1 AND id = $2", [orgId, i.domain_id]))
    )
      throw badRequest("Domaine inconnu du catalogue");
    if (
      i.unit_id &&
      !(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [orgId, i.unit_id]))
    )
      throw badRequest("Entité inconnue");
  }

  async list(actorId: string, orgId: string, box: "to_sign" | "mine" | "all") {
    await this.svc.requirePerm(actorId, orgId, "signature.use");
    const me = [actorId, ...(await this.delegators(orgId, actorId))];
    const signers = [actorId, ...(await this.delegators(orgId, actorId, "signature"))];
    const rows = await this.svc.db.query<
      SignDoc & { pending_action: string | null; pending_actor: string | null; author_name: string | null }
    >(
      `SELECT d.*, u.name AS author_name, p.action AS pending_action, a.name AS pending_actor
       FROM sign_documents d LEFT JOIN users u ON u.id = d.created_by
       LEFT JOIN sign_steps p ON p.document_id = d.id AND p.status = 'pending' LEFT JOIN users a ON a.id = p.actor_id
       WHERE d.org_id = $1 AND (
         ($2 = 'to_sign' AND (p.actor_id = ANY($5) OR (p.action <> 'signature' AND p.actor_id = ANY($3)))) OR
         ($2 = 'mine' AND d.created_by = $4) OR
         ($2 = 'all' AND (d.created_by = $4 OR EXISTS (SELECT 1 FROM sign_steps s WHERE s.document_id = d.id AND s.actor_id = ANY($3))))
       ) ORDER BY d.due_on NULLS LAST, d.created_at DESC`,
      [orgId, box, me, actorId, signers],
    );
    return rows.map((d) => ({ ...d, body: undefined, reference: reference(d) }));
  }

  async get(actorId: string, id: string) {
    const { d, steps } = await this.readable(actorId, id);
    const pending = steps.find((s) => s.status === "pending");
    const acts = pending ? await this.actsFor(actorId, d, steps, pending) : false;
    const past = await this.svc.db.query<Record<string, unknown> & { round: number }>(
      `SELECT h.round, h.position, h.actor_id, a.name AS actor_name, h.action, h.status, h.acted_by, b.name AS acted_by_name,
              h.acted_at, h.comment
         FROM sign_step_history h LEFT JOIN users a ON a.id = h.actor_id LEFT JOIN users b ON b.id = h.acted_by
        WHERE h.document_id = $1 ORDER BY h.round DESC, h.position`,
      [id],
    );
    const history = [...new Set(past.map((p) => p.round))].map((round) => ({
      round,
      steps: past.filter((p) => p.round === round),
    }));
    return {
      ...d,
      reference: reference(d),
      steps,
      history,
      intact: d.content_hash ? d.content_hash === hashOf(d) : null,
      can: {
        edit: d.status === "draft" && d.created_by === actorId,
        start: (d.status === "draft" || d.status === "rejected") && d.created_by === actorId,
        decide: d.status === "in_circuit" && acts,
      },
    };
  }

  async create(actorId: string, orgId: string, i: SignInput) {
    await this.svc.requirePerm(actorId, orgId, "signature.use");
    await this.assertInput(orgId, actorId, i);
    const id = uid("doc");
    const year = Number(today().slice(0, 4));
    for (let attempt = 0; ; attempt++) {
      try {
        await this.svc.db.tx(async (q) => {
          await q.query(
            `INSERT INTO sign_documents (id, org_id, year, seq, title, kind, body, domain_id, unit_id, confidential, due_on, created_by, binding)
             VALUES ($1,$2,$3,(SELECT COALESCE(max(seq),0)+1 FROM sign_documents WHERE org_id = $2 AND year = $3),$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              id,
              orgId,
              year,
              i.title.trim(),
              i.kind ?? "Note",
              i.body ?? "",
              i.domain_id ?? null,
              i.unit_id ?? null,
              i.confidential ?? false,
              i.due_on ?? null,
              actorId,
              isBinding(i),
            ],
          );
          for (const [n, s] of i.steps.entries())
            await q.query(
              "INSERT INTO sign_steps (id, org_id, document_id, position, actor_id, action) VALUES ($1,$2,$3,$4,$5,$6)",
              [uid("stp"), orgId, id, n, s.actor_id, s.action],
            );
        });
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "23505" || attempt >= 8) throw e;
      }
    }
    await this.svc.log(actorId, "signature.created", { orgId, data: { id } });
    return this.get(actorId, id);
  }

  async update(actorId: string, id: string, i: SignInput) {
    const d = await this.row(id);
    await this.svc.requirePerm(actorId, d.org_id, "signature.use");
    if (d.created_by !== actorId) throw forbidden("Seul l'auteur modifie ce document");
    if (d.status !== "draft" && d.status !== "rejected") throw notDraft();
    // Un document engageant le reste : changer sa nature ne permet pas de contourner la signature de la DG
    const binding = d.binding || isBinding({ kind: i.kind ?? d.kind, binding: i.binding });
    await this.assertInput(d.org_id, actorId, { ...i, binding });
    await this.svc.db.tx(async (q) => {
      await q.query(
        `UPDATE sign_documents SET title = $1, kind = $2, body = $3, domain_id = $4, unit_id = $5, confidential = $6, due_on = $7, status = 'draft', content_hash = NULL, binding = ${binding ? "TRUE" : "FALSE"} WHERE id = $8`,
        [
          i.title.trim(),
          i.kind ?? d.kind,
          i.body ?? "",
          i.domain_id ?? null,
          i.unit_id ?? null,
          i.confidential ?? false,
          i.due_on ?? null,
          id,
        ],
      );
      await q.query("DELETE FROM sign_steps WHERE document_id = $1", [id]);
      for (const [n, s] of i.steps.entries())
        await q.query(
          "INSERT INTO sign_steps (id, org_id, document_id, position, actor_id, action) VALUES ($1,$2,$3,$4,$5,$6)",
          [uid("stp"), d.org_id, id, n, s.actor_id, s.action],
        );
    });
    return this.get(actorId, id);
  }

  async remove(actorId: string, id: string) {
    const d = await this.row(id);
    await this.svc.requirePerm(actorId, d.org_id, "signature.use");
    if (d.created_by !== actorId) throw forbidden("Seul l'auteur supprime ce document");
    if (d.status !== "draft") throw notDraft();
    await this.svc.db.query("DELETE FROM sign_documents WHERE id = $1", [id]);
    await this.svc.log(actorId, "signature.deleted", { orgId: d.org_id, data: { id, title: d.title } });
  }

  private async notifyActors(d: SignDoc, actorId: string | null) {
    if (!actorId) return;
    await this.svc.notify(actorId, d.org_id, {
      kind: "signature.pending",
      title: `À traiter au parapheur : ${d.title}`,
      body: reference(d),
    });
    for (const r of await this.svc.db.query<{ to_user: string }>(
      "SELECT to_user FROM delegations WHERE org_id = $1 AND from_user = $2 AND start_on <= $3::date AND end_on >= $3::date",
      [d.org_id, actorId, today()],
    ))
      await this.svc.notify(r.to_user, d.org_id, {
        kind: "signature.pending",
        title: `À traiter par délégation : ${d.title}`,
        body: reference(d),
      });
  }

  /** Le contenu est scellé à l'entrée dans le circuit : l'empreinte prouve qu'il n'a pas changé depuis. */
  async start(actorId: string, id: string) {
    const d = await this.row(id);
    await this.svc.requirePerm(actorId, d.org_id, "signature.use");
    if (d.created_by !== actorId) throw forbidden("Seul l'auteur lance le circuit");
    if (d.status !== "draft" && d.status !== "rejected") throw notDraft();
    const first = (await this.steps(id))[0];
    await this.svc.db.tx(async (q) => {
      await q.query(
        "UPDATE sign_steps SET status = 'waiting', acted_by = NULL, acted_at = NULL, comment = '' WHERE document_id = $1",
        [id],
      );
      await q.query("UPDATE sign_steps SET status = 'pending' WHERE id = $1", [first.id]);
      await q.query(
        `UPDATE sign_documents SET status = 'in_circuit', content_hash = $1,
           round = CASE WHEN status = 'rejected' THEN round + 1 ELSE round END WHERE id = $2`,
        [hashOf(d), id],
      );
    });
    await this.notifyActors(d, first.actor_id);
    await this.svc.log(actorId, "signature.started", { orgId: d.org_id, data: { id } });
    return this.get(actorId, id);
  }

  async decide(actorId: string, id: string, i: { decision: "approve" | "reject"; comment?: string }) {
    const { d, steps } = await this.readable(actorId, id);
    if (d.status !== "in_circuit") throw badRequest("Ce document n'est pas dans le circuit");
    const pending = steps.find((s) => s.status === "pending");
    if (d.created_by === actorId && !(pending && this.authorMaySign(d, steps, pending)))
      throw forbidden("L'auteur ne peut pas viser son propre document");
    if (!pending?.actor_id || !(await this.actsFor(actorId, d, steps, pending)))
      throw forbidden("Ce n'est pas à vous d'intervenir à cette étape");
    if (i.decision === "reject" && !i.comment?.trim()) throw badRequest("Indiquez le motif du rejet");
    const next = steps.find((s) => s.position === pending.position + 1);
    const moved = await this.svc.db.tx(async (q) => {
      const r = await q.query(
        "UPDATE sign_steps SET status = $1, acted_by = $2, acted_at = now(), comment = $3 WHERE id = $4 AND status = 'pending' RETURNING id",
        [i.decision === "approve" ? "approved" : "rejected", actorId, i.comment?.trim() ?? "", pending.id],
      );
      if (!r.length) return false;
      if (i.decision === "reject") {
        await q.query("UPDATE sign_documents SET status = 'rejected' WHERE id = $1", [id]);
        // Le circuit clos par le rejet est conservé tel quel : visas, auteurs, motif (thème 3, PH-5)
        await q.query(
          `INSERT INTO sign_step_history (id, org_id, document_id, round, position, actor_id, action, status, acted_by, acted_at, comment)
           SELECT 'ssh_' || s.id || '_' || d.round, s.org_id, s.document_id, d.round, s.position, s.actor_id, s.action, s.status,
                  s.acted_by, s.acted_at, s.comment
             FROM sign_steps s JOIN sign_documents d ON d.id = s.document_id WHERE s.document_id = $1`,
          [id],
        );
      }
      else if (next) await q.query("UPDATE sign_steps SET status = 'pending' WHERE id = $1", [next.id]);
      else await q.query("UPDATE sign_documents SET status = 'signed', signed_at = now() WHERE id = $1", [id]);
      return true;
    });
    if (!moved) throw new HttpError(409, "Cette étape vient d'être traitée : rechargez la page");
    if (i.decision === "reject" || !next)
      for (const hook of signatureHooks)
        await hook(this.svc, d, i.decision === "reject" ? "rejected" : "signed", actorId, i.comment?.trim() ?? "");
    await this.svc.log(actorId, `signature.${i.decision}`, {
      orgId: d.org_id,
      data: { id, step: pending.position, for: pending.actor_id },
    });
    if (i.decision === "reject" && d.created_by)
      await this.svc.notify(d.created_by, d.org_id, {
        kind: "signature.rejected",
        title: `Document rejeté : ${d.title}`,
        body: i.comment?.trim(),
      });
    else if (next) await this.notifyActors(d, next.actor_id);
    else if (d.created_by)
      await this.svc.notify(d.created_by, d.org_id, {
        kind: "signature.signed",
        title: `Document signé : ${d.title}`,
        body: reference(d),
      });
    return this.get(actorId, id);
  }

  /** L'acteur peut-il agir à cette étape : titulaire, ou délégataire de la bonne portée ? */
  private async actsFor(actorId: string, d: SignDoc, steps: Step[], s: Step) {
    if (!s.actor_id) return false;
    if (d.created_by === actorId && !this.authorMaySign(d, steps, s)) return false;
    if (s.actor_id === actorId) return true;
    return (await this.delegators(d.org_id, actorId, s.action)).includes(s.actor_id);
  }

  // ---------------------------------------------------------------- délégations
  async delegations(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "signature.use");
    return this.svc.db.query(
      `SELECT d.*, f.name AS from_name, t.name AS to_name FROM delegations d JOIN users f ON f.id = d.from_user JOIN users t ON t.id = d.to_user
       WHERE d.org_id = $1 AND (d.from_user = $2 OR d.to_user = $2) ORDER BY d.end_on DESC`,
      [orgId, actorId],
    );
  }
  async delegate(
    actorId: string,
    orgId: string,
    i: { to_user: string; start_on: string; end_on: string; scope?: "visa" | "signature" },
  ) {
    await this.svc.requirePerm(actorId, orgId, "signature.use");
    const scope = i.scope ?? "signature";
    if (i.to_user === actorId) throw badRequest("On ne se délègue pas à soi-même");
    for (const d of [i.start_on, i.end_on]) if (!isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    if (i.end_on < i.start_on) throw badRequest("La fin de délégation précède son début");
    if ((Date.parse(i.end_on) - Date.parse(i.start_on)) / 864e5 + 1 > DELEGATION_MAX_DAYS)
      throw badRequest(`Une délégation dure au plus ${DELEGATION_MAX_DAYS} jours : renouvelez-la si l'absence se prolonge`);
    const role = await this.svc.orgRole(i.to_user, orgId);
    if (!role) throw badRequest("Le délégataire doit être membre de l'organisation");
    if (role === "guest" || !(await this.svc.permissionsOf(i.to_user, orgId)).includes("signature.use"))
      throw badRequest("Le délégataire doit avoir accès au parapheur : un invité ne peut pas recevoir de délégation");
    if (scope === "signature" && !(await this.svc.permissionsOf(i.to_user, orgId)).includes("units.lead"))
      throw badRequest(
        "Une délégation de signature va à un responsable (profil de chef d'entité, DGA ou DG) ; à un agent, déléguez le visa seulement",
      );
    const id = uid("dlg");
    await this.svc.db.query(
      "INSERT INTO delegations (id, org_id, from_user, to_user, start_on, end_on, scope) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id, orgId, actorId, i.to_user, i.start_on, i.end_on, scope],
    );
    await this.svc.log(actorId, "delegation.created", {
      orgId,
      data: { id, to: i.to_user, from_date: i.start_on, to_date: i.end_on, scope },
    });
    await this.svc.notify(i.to_user, orgId, {
      kind: "delegation.received",
      title: scope === "signature" ? "Délégation de signature reçue" : "Délégation de visa reçue",
      body: `Du ${i.start_on} au ${i.end_on}`,
    });
    return { id };
  }
  async revoke(actorId: string, id: string) {
    const d = await this.svc.db.one<{ org_id: string; from_user: string }>(
      "SELECT org_id, from_user FROM delegations WHERE id = $1",
      [id],
    );
    if (!d) throw notFound("Délégation introuvable");
    await this.svc.requirePerm(actorId, d.org_id, "signature.use");
    if (d.from_user !== actorId) throw forbidden("Seul l'auteur de la délégation peut la retirer");
    // Retirée, la délégation reste dans l'historique (PH-3)
    const done = await this.svc.db.one(
      "UPDATE delegations SET revoked_at = now(), revoked_by = $1 WHERE id = $2 AND revoked_at IS NULL RETURNING id",
      [actorId, id],
    );
    if (!done) throw new HttpError(409, "Cette délégation est déjà retirée");
    await this.svc.log(actorId, "delegation.revoked", { orgId: d.org_id, data: { id } });
  }
}
