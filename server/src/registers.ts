import { uid } from "./db.js";
import { INDICATOR_SOURCES, withComputed } from "./rules.js";
import { linkContact, linkPartner } from "./partner-links.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, type Services, localDate } from "./services.js";

interface Mail {
  id: string;
  org_id: string;
  direction: "entrant" | "sortant";
  year: number;
  seq: number;
  subject: string;
  correspondent: string;
  doc_date: string | null;
  received_on: string;
  unit_id: string | null;
  assignee_id: string | null;
  due_on: string | null;
  status: "enregistre" | "impute" | "en_traitement" | "traite" | "classe";
  started_at?: string | null;
  filed_reason?: string;
  response_ref: string;
  confidential: boolean;
  escalated: boolean;
  reply_to_id: string | null;
  instruction: string;
  project_id: string | null;
  activity_id: string | null;
  partner_id: string | null;
  contact_id: string | null;
}
export interface MailInput {
  direction: Mail["direction"];
  subject: string;
  /** Facultatif quand un partenaire est choisi : son nom remplit le champ (lot PA3). */
  correspondent?: string;
  partner_id?: string | null;
  contact_id?: string | null;
  doc_date?: string | null;
  received_on: string;
  due_on?: string | null;
  confidential?: boolean;
  /** Courrier sortant : l'entrant auquel il répond (lot P3b). */
  reply_to_id?: string | null;
  project_id?: string | null;
  activity_id?: string | null;
}
export interface RiskInput {
  title?: string;
  probability?: number;
  impact?: number;
  owner_id?: string | null;
  mitigation?: string;
  status?: "open" | "mitigated" | "closed";
  project_id?: string | null;
}
export interface IndicatorInput {
  name?: string;
  unit_label?: string;
  baseline?: number;
  target?: number;
  result?: number;
  source?: string;
  plan_activity_id?: string | null;
  /** Source de l'outil qui calcule le résultat (RI-4) ; vide : résultat saisi. */
  computed_from?: string | null;
}
const mailRef = (m: Pick<Mail, "direction" | "year" | "seq">) =>
  `${m.direction === "entrant" ? "ENT" : "SOR"}/${m.year}/${String(m.seq).padStart(4, "0")}`;
const day = () => localDate();

/** Registre officiel du courrier, risques et indicateurs de performance. */
export class Registers {
  constructor(private svc: Services) {}

  private async mail(id: string) {
    const m = await this.svc.db.one<Mail>("SELECT * FROM correspondence WHERE id = $1", [id]);
    if (!m) throw notFound("Courrier introuvable");
    return m;
  }
  /** Ce que la personne est pour ce courrier : registre, gestionnaire, imputée, chef de l'entité imputée, en copie. */
  private async relation(actorId: string, m: Mail) {
    const perms = await this.svc.permissionsOf(actorId, m.org_id);
    const manager = perms.includes("correspondence.manage");
    // Registre complet : le secrétariat et la direction ; un chef lit le courrier de son entité (C-3)
    const registry = manager || (perms.includes("correspondence.view") && perms.includes("pilotage.view"));
    const assignee = m.assignee_id === actorId;
    const head = !!m.unit_id && (await this.heads(actorId, m.unit_id));
    const copy = !!(await this.svc.db.one(
      "SELECT 1 FROM correspondence_copies WHERE correspondence_id = $1 AND user_id = $2",
      [m.id, actorId],
    ));
    return { manager, registry, assignee, head, copy };
  }
  /** Chef de cette entité, ou d'une entité au-dessus. */
  private async heads(actorId: string, unitId: string) {
    return !!(await this.svc.db.one(
      `WITH RECURSIVE up(id, manager_id, parent_id) AS (
         SELECT id, manager_id, parent_id FROM org_units WHERE id = $1
         UNION SELECT p.id, p.manager_id, p.parent_id FROM org_units p JOIN up ON p.id = up.parent_id
       ) SELECT 1 FROM up WHERE manager_id = $2`,
      [unitId, actorId],
    ));
  }
  private async mailReadable(actorId: string, id: string) {
    const m = await this.mail(id);
    const rel = await this.relation(actorId, m);
    const concerned = rel.assignee || rel.head || rel.copy;
    if (!concerned && !rel.registry) throw notFound("Courrier introuvable");
    if (m.confidential && !rel.manager && !concerned) throw notFound("Courrier introuvable");
    return { m, manager: rel.manager, rel };
  }
  /** Lecture d'un courrier par un autre module (documents du dossier) : mêmes droits que le registre. */
  access(actorId: string, id: string) {
    return this.mailReadable(actorId, id);
  }
  async listMail(
    actorId: string,
    orgId: string,
    f: { direction?: Mail["direction"]; project_id?: string; activity_id?: string; partner_id?: string },
  ) {
    await this.svc.requireOrg(actorId, orgId, "member");
    const perms = await this.svc.permissionsOf(actorId, orgId);
    const manager = perms.includes("correspondence.manage");
    const registry = manager || (perms.includes("correspondence.view") && perms.includes("pilotage.view"));
    const rows = await this.svc.db.query<
      Mail & {
        unit_name: string | null;
        assignee_name: string | null;
        project_name: string | null;
        activity_title: string | null;
        partner_name: string | null;
        contact_name: string | null;
        rt_direction: Mail["direction"] | null;
        rt_year: number | null;
        rt_seq: number | null;
        rsp_direction: Mail["direction"] | null;
        rsp_year: number | null;
        rsp_seq: number | null;
      }
    >(
      `SELECT c.*, ou.name AS unit_name, u.name AS assignee_name, p.name AS project_name, aa.title AS activity_title,
        pt.name AS partner_name, ct.name AS contact_name,
        rt.direction AS rt_direction, rt.year AS rt_year, rt.seq AS rt_seq,
        rsp.direction AS rsp_direction, rsp.year AS rsp_year, rsp.seq AS rsp_seq
       FROM correspondence c
       LEFT JOIN org_units ou ON ou.id = c.unit_id
       LEFT JOIN users u ON u.id = c.assignee_id
       LEFT JOIN projects p ON p.id = c.project_id
       LEFT JOIN agency_activities aa ON aa.id = c.activity_id
       LEFT JOIN partners pt ON pt.id = c.partner_id
       LEFT JOIN partner_contacts ct ON ct.id = c.contact_id
       LEFT JOIN correspondence rt ON rt.id = c.reply_to_id
       LEFT JOIN LATERAL (SELECT r2.direction, r2.year, r2.seq FROM correspondence r2 WHERE r2.reply_to_id = c.id ORDER BY r2.created_at LIMIT 1) rsp ON TRUE
       WHERE c.org_id = $1
         AND (($8 AND (NOT c.confidential OR $2)) OR c.assignee_id = $3
              OR EXISTS (SELECT 1 FROM correspondence_copies cc WHERE cc.correspondence_id = c.id AND cc.user_id = $3)
              OR c.unit_id IN (WITH RECURSIVE down(id) AS (
                   SELECT id FROM org_units WHERE manager_id = $3 AND org_id = $1
                   UNION SELECT u.id FROM org_units u JOIN down ON u.parent_id = down.id) SELECT id FROM down))
         AND ($4::text IS NULL OR c.direction = $4)
         AND ($5::text IS NULL OR c.project_id = $5) AND ($6::text IS NULL OR c.activity_id = $6)
         AND ($7::text IS NULL OR c.partner_id = $7)
       ORDER BY c.received_on DESC, c.seq DESC`,
      [
        orgId,
        manager,
        actorId,
        f.direction ?? null,
        f.project_id ?? null,
        f.activity_id ?? null,
        f.partner_id ?? null,
        registry,
      ],
    );
    return rows.map(({ rt_direction, rt_year, rt_seq, rsp_direction, rsp_year, rsp_seq, ...m }) => ({
      ...m,
      reference: mailRef(m),
      reply_to_reference: rt_direction
        ? mailRef({ direction: rt_direction, year: rt_year ?? 0, seq: rt_seq ?? 0 })
        : null,
      response_reference: rsp_direction
        ? mailRef({ direction: rsp_direction, year: rsp_year ?? 0, seq: rsp_seq ?? 0 })
        : null,
    }));
  }

  /** Dossier d'un courrier : un projet ou une activité de l'institution, jamais les deux. */
  private async assertDossier(orgId: string, i: Pick<MailInput, "project_id" | "activity_id">) {
    if (i.project_id && i.activity_id) throw badRequest("Un courrier se rattache à un seul dossier");
    if (
      i.project_id &&
      !(await this.svc.db.one("SELECT 1 FROM projects WHERE org_id = $1 AND id = $2", [orgId, i.project_id]))
    )
      throw badRequest("Projet inconnu dans cette institution");
    if (
      i.activity_id &&
      !(await this.svc.db.one("SELECT 1 FROM agency_activities WHERE org_id = $1 AND id = $2", [orgId, i.activity_id]))
    )
      throw badRequest("Activité inconnue dans cette institution");
  }
  async registerMail(actorId: string, orgId: string, i: MailInput) {
    await this.svc.requirePerm(actorId, orgId, "correspondence.manage");
    for (const d of [i.doc_date, i.received_on, i.due_on])
      if (d && !isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    if (i.due_on && i.due_on < i.received_on) throw badRequest("Le délai de réponse précède la date de réception");
    await this.assertDossier(orgId, i);
    // Une réponse est un courrier sortant lié à un courrier entrant de l'institution (lot P3b)
    let replied: Mail | undefined;
    if (i.reply_to_id) {
      if (i.direction !== "sortant") throw badRequest("Seul un courrier sortant répond à un courrier entrant");
      replied = await this.svc.db.one<Mail>("SELECT * FROM correspondence WHERE org_id = $1 AND id = $2", [
        orgId,
        i.reply_to_id,
      ]);
      if (!replied) throw badRequest("Courrier entrant introuvable dans cette institution");
      if (replied.direction !== "entrant") throw badRequest("On ne répond qu'à un courrier entrant");
    }
    // Le correspondant choisi dans l'annuaire (lot PA3) ; une réponse s'adresse par défaut au même partenaire
    const contact = await linkContact(this.svc, orgId, i.contact_id, i.partner_id);
    const partnerId = i.partner_id ?? contact?.partner_id ?? (i.contact_id ? null : replied?.partner_id) ?? null;
    const partner = await linkPartner(this.svc, orgId, partnerId, {
      current: replied?.partner_id ?? null,
    });
    const correspondent = i.correspondent?.trim() || partner?.name || replied?.correspondent || "";
    if (!correspondent) throw badRequest("Indiquez le correspondant, ou choisissez un partenaire de l'annuaire");
    const contactId =
      contact?.id ?? (partner && partner.id === replied?.partner_id ? replied?.contact_id : null) ?? null;
    const id = uid("crr");
    const year = Number(i.received_on.slice(0, 4));
    for (let attempt = 0; ; attempt++) {
      try {
        await this.svc.db.query(
          `INSERT INTO correspondence (id, org_id, direction, year, seq, subject, correspondent, doc_date, received_on, due_on, confidential, created_by, reply_to_id, project_id, activity_id, partner_id, contact_id)
           VALUES ($1,$2,$3,$4,(SELECT COALESCE(max(seq),0)+1 FROM correspondence WHERE org_id = $2 AND direction = $3 AND year = $4),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            id,
            orgId,
            i.direction,
            year,
            i.subject.trim(),
            correspondent,
            i.doc_date ?? null,
            i.received_on,
            i.due_on ?? null,
            i.confidential ?? false,
            actorId,
            i.reply_to_id ?? null,
            i.project_id ?? null,
            i.activity_id ?? null,
            partner?.id ?? null,
            contactId,
          ],
        );
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "23505" || attempt >= 8) throw e;
      }
    }
    await this.svc.log(actorId, "correspondence.registered", { orgId, data: { id, reply_to: i.reply_to_id ?? null } });
    await this.annotate({ id, org_id: orgId }, actorId, "enregistrement", "Enregistré au bureau d'ordre");
    const m = await this.mail(id);
    // La réponse clôt l'entrant encore ouvert ; une clôture déjà faite n'est jamais écrasée
    if (replied) {
      const closed = await this.svc.db.one(
        "UPDATE correspondence SET status = 'traite', response_ref = $1, closed_at = now() WHERE id = $2 AND status <> 'traite' RETURNING id",
        [mailRef(m), replied.id],
      );
      if (closed)
        await this.svc.log(actorId, "correspondence.closed", {
          orgId,
          data: { id: replied.id, by: mailRef(m) },
        });
    }
    return { ...m, reference: mailRef(m), reply_to_reference: replied ? mailRef(replied) : null };
  }
  async assignMail(
    actorId: string,
    id: string,
    i: {
      unit_id?: string | null;
      assignee_id?: string | null;
      due_on?: string | null;
      instruction?: string;
      annotation?: string;
      copies?: { user_id: string; purpose?: "information" | "avis" }[];
    },
  ) {
    const m = await this.mail(id);
    const rel = await this.relation(actorId, m);
    if (!rel.manager) {
      // Imputation en cascade : le chef de l'entité imputée confie le courrier à un agent de son entité
      if (!rel.head) {
        if (rel.assignee || rel.copy) throw forbidden("Seuls la direction et le chef de l'entité imputent ce courrier");
        await this.svc.requirePerm(actorId, m.org_id, "correspondence.manage");
      }
      if (i.unit_id && !(await this.heads(actorId, i.unit_id)))
        throw badRequest("Vous imputez seulement à une entité que vous dirigez");
      if (i.assignee_id) {
        const inUnit = await this.svc.db.one<{ unit_id: string }>(
          "SELECT unit_id FROM org_members WHERE org_id = $1 AND user_id = $2 AND unit_id IS NOT NULL",
          [m.org_id, i.assignee_id],
        );
        if (!inUnit || !(await this.heads(actorId, inUnit.unit_id)))
          throw badRequest("Vous imputez seulement à un agent de votre entité");
      }
    }
    if (m.status === "traite" || m.status === "classe") throw new HttpError(409, "Ce courrier est clôturé");
    if (
      i.unit_id &&
      !(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [m.org_id, i.unit_id]))
    )
      throw badRequest("Entité inconnue");
    if (i.assignee_id && !(await this.svc.orgRole(i.assignee_id, m.org_id)))
      throw badRequest("La personne doit être membre de l'organisation");
    if (i.due_on && !isRealDate(i.due_on)) throw badRequest(`Date invalide : ${i.due_on}`);
    if (i.due_on && i.due_on < String(m.received_on).slice(0, 10))
      throw badRequest("Le délai de réponse précède la date de réception");
    await this.svc.db.query(
      `UPDATE correspondence SET unit_id = COALESCE($1, unit_id), assignee_id = COALESCE($2, assignee_id), due_on = COALESCE($3, due_on),
        instruction = CASE WHEN $5::text IS NULL THEN instruction ELSE $5 END, status = 'impute', escalated = FALSE WHERE id = $4`,
      [i.unit_id ?? null, i.assignee_id ?? null, i.due_on ?? null, id, i.instruction?.trim() ?? null],
    );
    const instruction = i.instruction?.trim() || m.instruction;
    const ref = mailRef(m);
    if (i.unit_id && i.unit_id !== m.unit_id) {
      const unit = await this.svc.db.one<{ name: string; manager_id: string | null }>(
        "SELECT name, manager_id FROM org_units WHERE id = $1",
        [i.unit_id],
      );
      await this.annotate(
        m,
        actorId,
        "imputation",
        `Imputé à ${unit?.name ?? "l'entité"}${instruction ? ` · ${instruction}` : ""}`,
        {
          unit_id: i.unit_id,
        },
      );
      if (unit?.manager_id && unit.manager_id !== actorId && unit.manager_id !== i.assignee_id)
        await this.svc.notify(unit.manager_id, m.org_id, {
          kind: "correspondence.unit",
          title: `Courrier imputé à ${unit.name} : ${m.subject}`,
          body: `${ref}${instruction ? ` · ${instruction}` : ""}${i.due_on ? ` · réponse attendue le ${i.due_on.split("-").reverse().join("/")}` : ""}. Imputez-le à un agent de votre entité.`,
          actor_id: actorId,
          link: "/courrier",
        });
    }
    if (i.assignee_id && i.assignee_id !== m.assignee_id) {
      const who = await this.svc.user(i.assignee_id);
      await this.annotate(m, actorId, "imputation", `Imputé à ${who.name}${instruction ? ` · ${instruction}` : ""}`, {
        user_id: i.assignee_id,
      });
      if (i.assignee_id !== actorId)
        await this.svc.notify(i.assignee_id, m.org_id, {
          kind: "correspondence.assigned",
          title: `Courrier imputé : ${m.subject}`,
          body: `${ref}${instruction ? ` · ${instruction}` : ""}`,
          actor_id: actorId,
          link: "/courrier",
        });
    }
    if (i.annotation?.trim()) await this.annotate(m, actorId, "annotation", i.annotation.trim());
    for (const c of i.copies ?? []) {
      if (!(await this.svc.orgRole(c.user_id, m.org_id))) throw badRequest("Une copie va à un membre de l'institution");
      const added = await this.svc.db.query(
        "INSERT INTO correspondence_copies (org_id, correspondence_id, user_id, purpose, created_by) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING user_id",
        [m.org_id, m.id, c.user_id, c.purpose ?? "information", actorId],
      );
      if (!added.length) continue;
      const who = await this.svc.user(c.user_id);
      await this.annotate(
        m,
        actorId,
        "copie",
        `Copie ${c.purpose === "avis" ? "pour avis" : "pour information"} à ${who.name}`,
        {
          user_id: c.user_id,
        },
      );
      await this.svc.notify(c.user_id, m.org_id, {
        kind: "correspondence.copy",
        title: `Courrier en copie ${c.purpose === "avis" ? "pour avis" : "pour information"} : ${m.subject}`,
        body: ref,
        actor_id: actorId,
        link: "/courrier",
      });
    }
    await this.svc.log(actorId, "correspondence.assigned", { orgId: m.org_id, data: { id, reference: ref } });
    const r = await this.mail(id);
    return { ...r, reference: mailRef(r) };
  }
  async closeMail(actorId: string, id: string, i: { response_ref?: string }) {
    const { m, manager, rel } = await this.mailReadable(actorId, id);
    if (!manager && !rel.assignee && !rel.head)
      throw forbidden("Seuls l'agent imputé, son chef et la direction clôturent ce courrier");
    if (m.status === "classe") throw new HttpError(409, "Ce courrier est classé sans suite");
    // Une clôture est un fait du registre : elle ne s'écrase pas
    const closed = await this.svc.db.one(
      "UPDATE correspondence SET status = 'traite', response_ref = $1, closed_at = now() WHERE id = $2 AND status <> 'traite' RETURNING id",
      [i.response_ref ?? "", id],
    );
    if (!closed) throw new HttpError(409, "Ce courrier est déjà traité");
    await this.annotate(m, actorId, "cloture", i.response_ref ? `Traité · réponse ${i.response_ref}` : "Traité");
    await this.svc.log(actorId, "correspondence.closed", { orgId: m.org_id, data: { id } });
    const r = await this.mail(id);
    return { ...r, reference: mailRef(r) };
  }
  private async annotate(
    m: Pick<Mail, "id" | "org_id">,
    authorId: string,
    kind: string,
    text: string,
    to: { unit_id?: string; user_id?: string } = {},
  ) {
    await this.svc.db.query(
      "INSERT INTO correspondence_annotations (id, org_id, correspondence_id, author_id, kind, text, unit_id, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [uid("cra"), m.org_id, m.id, authorId, kind, text, to.unit_id ?? null, to.user_id ?? null],
    );
  }

  /** L'agent imputé prend le courrier en charge : il passe « en traitement ». */
  async startMail(actorId: string, id: string) {
    const { m, rel } = await this.mailReadable(actorId, id);
    if (!rel.assignee && !rel.manager) throw forbidden("Seul l'agent imputé prend ce courrier en charge");
    const r = await this.svc.db.one(
      "UPDATE correspondence SET status = 'en_traitement', started_at = now() WHERE id = $1 AND status = 'impute' RETURNING id",
      [id],
    );
    if (!r) throw new HttpError(409, "Seul un courrier imputé se prend en charge");
    await this.annotate(m, actorId, "prise_en_charge", "Pris en charge");
    await this.svc.log(actorId, "correspondence.started", { orgId: m.org_id, data: { id, reference: mailRef(m) } });
    const after = await this.mail(id);
    return { ...after, reference: mailRef(after) };
  }

  /** Classer sans suite : un acte de la direction, toujours motivé. */
  async fileMail(actorId: string, id: string, reason: string) {
    const { m, manager } = await this.mailReadable(actorId, id);
    if (!manager) throw forbidden("Seule la direction classe un courrier sans suite");
    if (!reason.trim()) throw badRequest("Le motif du classement est obligatoire");
    const r = await this.svc.db.one(
      "UPDATE correspondence SET status = 'classe', filed_reason = $1, closed_at = now() WHERE id = $2 AND status NOT IN ('traite', 'classe') RETURNING id",
      [reason.trim(), id],
    );
    if (!r) throw new HttpError(409, "Ce courrier est déjà clôturé");
    await this.annotate(m, actorId, "classement", `Classé sans suite · ${reason.trim()}`);
    await this.svc.log(actorId, "correspondence.filed", { orgId: m.org_id, data: { id, reference: mailRef(m) } });
    const after = await this.mail(id);
    return { ...after, reference: mailRef(after) };
  }

  /** Annoter : la direction, le chef d'entité, l'agent imputé ou une personne en copie (pour avis). */
  async addAnnotation(actorId: string, id: string, text: string) {
    const { m, rel } = await this.mailReadable(actorId, id);
    if (!rel.manager && !rel.head && !rel.assignee && !rel.copy)
      throw forbidden("Seules les personnes concernées par ce courrier l'annotent");
    if (!text.trim()) throw badRequest("L'annotation est vide");
    const kind = rel.manager || rel.head ? "annotation" : "note";
    await this.annotate(m, actorId, kind, text.trim());
    // L'agent imputé est prévenu d'une annotation de sa hiérarchie
    if (kind === "annotation" && m.assignee_id && m.assignee_id !== actorId)
      await this.svc.notify(m.assignee_id, m.org_id, {
        kind: "correspondence.annotation",
        title: `Nouvelle annotation sur « ${m.subject} »`,
        body: text.trim().slice(0, 300),
        actor_id: actorId,
        link: "/courrier",
      });
    await this.svc.log(actorId, "correspondence.annotated", { orgId: m.org_id, data: { id, reference: mailRef(m) } });
    return { ok: true };
  }
  async annotations(actorId: string, id: string) {
    await this.mailReadable(actorId, id);
    return this.svc.db.query(
      `SELECT a.id, a.kind, a.text, a.created_at, a.author_id, u.name AS author_name, a.unit_id, ou.name AS unit_name,
              a.user_id, t.name AS user_name
         FROM correspondence_annotations a LEFT JOIN users u ON u.id = a.author_id
         LEFT JOIN org_units ou ON ou.id = a.unit_id LEFT JOIN users t ON t.id = a.user_id
        WHERE a.correspondence_id = $1 ORDER BY a.created_at, a.id`,
      [id],
    );
  }

  /** Tableau de bord du courrier : ce qui attend, au registre et pour soi. */
  async summary(actorId: string, orgId: string) {
    const rows = (await this.listMail(actorId, orgId, {})) as (Mail & { id: string })[];
    const now = localDate();
    const open = (m: Mail) => !["traite", "classe"].includes(m.status);
    const late = (m: Mail) => open(m) && !!m.due_on && String(m.due_on).slice(0, 10) < now;
    const month = now.slice(0, 7);
    const mine = rows.filter((m) => m.assignee_id === actorId);
    return {
      to_assign: rows.filter((m) => m.status === "enregistre" && m.direction === "entrant").length,
      in_progress: rows.filter((m) => m.status === "impute" || m.status === "en_traitement").length,
      late: rows.filter(late).length,
      done_month: rows.filter(
        (m) => m.status === "traite" && String((m as { closed_at?: string }).closed_at ?? "").slice(0, 7) === month,
      ).length,
      mine: { open: mine.filter(open).length, late: mine.filter(late).length },
    };
  }

  /** Un courrier en retard remonte une seule fois au responsable de l'entité. */
  async sweep(now = day()) {
    const late = await this.svc.db.query<Mail & { manager_id: string | null; created_by: string | null }>(
      "SELECT c.*, ou.manager_id FROM correspondence c LEFT JOIN org_units ou ON ou.id = c.unit_id WHERE c.status NOT IN ('traite', 'classe') AND NOT c.escalated AND c.due_on < $1::date",
      [now],
    );
    for (const m of late) {
      // Responsable de l'entité d'abord ; à défaut la personne imputée, puis le bureau d'ordre qui a enregistré
      const to = m.manager_id ?? m.assignee_id ?? m.created_by;
      if (to)
        await this.svc.notify(to, m.org_id, {
          kind: "correspondence.late",
          title: `Courrier en retard : ${m.subject}`,
          body: mailRef(m),
        });
      await this.svc.db.query("UPDATE correspondence SET escalated = TRUE WHERE id = $1", [m.id]);
    }
    return { escalated: late.length };
  }

  // ---------------------------------------------------------------- risques
  /**
   * Les risques : le registre complet pour qui pilote ou gère les risques (qui modifie voit, RI-1), ceux d'un projet
   * pour son équipe, et, pour les autres, les risques dont ils sont responsables.
   */
  async risks(actorId: string, orgId: string, projectId?: string) {
    let ownerOnly = false;
    if (projectId) await this.svc.require(actorId, projectId, "viewer");
    else {
      await this.svc.requireOrg(actorId, orgId, "member");
      const perms = await this.svc.permissionsOf(actorId, orgId);
      ownerOnly = !perms.includes("pilotage.view") && !perms.includes("risks.manage");
    }
    return this.svc.db.query(
      `SELECT r.*, r.probability * r.impact AS score, u.name AS owner_name, p.name AS project_name
         FROM risks r LEFT JOIN users u ON u.id = r.owner_id LEFT JOIN projects p ON p.id = r.project_id
        WHERE r.org_id = $1 AND ($2::text IS NULL OR r.project_id = $2) AND (NOT $3 OR r.owner_id = $4)
        ORDER BY r.status, score DESC, r.created_at DESC`,
      [orgId, projectId ?? null, ownerOnly, actorId],
    );
  }
  private async riskRow(id: string) {
    return this.svc.db.one(
      `SELECT r.*, r.probability * r.impact AS score, u.name AS owner_name, p.name AS project_name
         FROM risks r LEFT JOIN users u ON u.id = r.owner_id LEFT JOIN projects p ON p.id = r.project_id WHERE r.id = $1`,
      [id],
    );
  }
  private async assertRiskRefs(orgId: string, i: RiskInput) {
    if (i.owner_id && !(await this.svc.orgRole(i.owner_id, orgId)))
      throw badRequest("Le responsable doit être membre de l'organisation");
    if (
      i.project_id &&
      !(await this.svc.db.one("SELECT 1 FROM projects WHERE org_id = $1 AND id = $2 AND kind = 'project'", [
        orgId,
        i.project_id,
      ]))
    )
      throw badRequest("Projet inconnu");
  }
  async createRisk(
    actorId: string,
    orgId: string,
    i: RiskInput & { title: string; probability: number; impact: number },
  ) {
    await this.svc.requirePerm(actorId, orgId, "risks.manage");
    await this.assertRiskRefs(orgId, i);
    const id = uid("rsk");
    await this.svc.db.query(
      "INSERT INTO risks (id, org_id, title, probability, impact, owner_id, mitigation, project_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id,
        orgId,
        i.title.trim(),
        i.probability,
        i.impact,
        i.owner_id ?? null,
        i.mitigation ?? "",
        i.project_id ?? null,
      ],
    );
    await this.svc.log(actorId, "risk.created", {
      orgId,
      projectId: i.project_id ?? null,
      data: { id, title: i.title },
    });
    return this.riskRow(id);
  }
  async updateRisk(actorId: string, id: string, i: RiskInput) {
    const r = await this.svc.db.one<{ org_id: string; project_id: string | null; owner_id: string | null }>(
      "SELECT org_id, project_id, owner_id FROM risks WHERE id = $1",
      [id],
    );
    if (!r) throw notFound("Risque introuvable");
    // Le responsable du risque tient sa parade et son état ; le reste revient à qui gère le registre
    const own = r.owner_id === actorId && !!(await this.svc.orgRole(actorId, r.org_id));
    if (!(await this.svc.permissionsOf(actorId, r.org_id)).includes("risks.manage")) {
      if (!own) await this.svc.requirePerm(actorId, r.org_id, "risks.manage");
      else if (Object.keys(i).some((k) => k !== "mitigation" && k !== "status" && i[k as keyof RiskInput] !== undefined))
        throw forbidden("Le responsable d'un risque met à jour sa parade et l'état ; le reste revient au gestionnaire des risques");
    }
    await this.assertRiskRefs(r.org_id, i);
    await this.svc.db.query(
      `UPDATE risks SET title = COALESCE($1, title), probability = COALESCE($2, probability), impact = COALESCE($3, impact),
         owner_id = CASE WHEN $8 THEN $4 ELSE owner_id END, mitigation = COALESCE($5, mitigation), status = COALESCE($6, status),
         project_id = CASE WHEN $9 THEN $10 ELSE project_id END
       WHERE id = $7`,
      [
        i.title?.trim() ?? null,
        i.probability ?? null,
        i.impact ?? null,
        i.owner_id ?? null,
        i.mitigation ?? null,
        i.status ?? null,
        id,
        i.owner_id !== undefined,
        i.project_id !== undefined,
        i.project_id ?? null,
      ],
    );
    await this.svc.log(actorId, "risk.updated", { orgId: r.org_id, projectId: r.project_id, data: { id, ...i } });
    return this.riskRow(id);
  }

  private static INDICATOR =
    `SELECT i.id, i.name, i.unit_label, i.source, i.computed_from, i.baseline::float8 AS baseline, i.target::float8 AS target,
      i.result::float8 AS result, i.plan_activity_id, pa.title AS plan_activity_title, wp.year AS plan_year, ou.name AS plan_unit_name
    FROM indicators i LEFT JOIN plan_activities pa ON pa.id = i.plan_activity_id LEFT JOIN work_plans wp ON wp.id = pa.plan_id
    LEFT JOIN org_units ou ON ou.id = wp.unit_id`;
  async indicators(actorId: string, orgId: string) {
    const perms = await this.svc.permissionsOf(actorId, orgId);
    if (!["pilotage.view", "indicators.manage", "risks.manage"].some((p) => perms.includes(p as never)))
      await this.svc.requirePerm(actorId, orgId, "pilotage.view");
    return this.computed(orgId, await this.svc.db.query(`${Registers.INDICATOR} WHERE i.org_id = $1 ORDER BY i.name`, [orgId]));
  }
  /** Un indicateur relié à une source de l'outil se calcule seul (thème 4, RI-4). */
  private computed(orgId: string, rows: unknown[]) {
    return withComputed(this.svc.db, orgId, localDate(), rows as { computed_from: string | null; result: number }[]);
  }
  private async oneIndicator(orgId: string, id: string) {
    return (await this.computed(orgId, [await this.svc.db.one(`${Registers.INDICATOR} WHERE i.id = $1`, [id])]))[0];
  }
  private assertSource(src: string | null | undefined) {
    if (src && !(src in INDICATOR_SOURCES))
      throw badRequest(`Source de calcul inconnue : ${src}. Possibles : ${Object.keys(INDICATOR_SOURCES).join(", ")}`);
  }
  private async assertPlanActivity(orgId: string, id: string | null | undefined) {
    if (id && !(await this.svc.db.one("SELECT 1 FROM plan_activities WHERE org_id = $1 AND id = $2", [orgId, id])))
      throw badRequest("Activité du plan inconnue");
  }
  async createIndicator(actorId: string, orgId: string, i: IndicatorInput & { name: string; target: number }) {
    await this.svc.requirePerm(actorId, orgId, "indicators.manage");
    await this.assertPlanActivity(orgId, i.plan_activity_id);
    this.assertSource(i.computed_from);
    const id = uid("ind");
    await this.svc.db.query(
      "INSERT INTO indicators (id, org_id, name, unit_label, baseline, target, result, source, plan_activity_id, computed_from) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        id,
        orgId,
        i.name.trim(),
        i.unit_label ?? "",
        i.baseline ?? 0,
        i.target,
        i.result ?? 0,
        i.computed_from ? INDICATOR_SOURCES[i.computed_from as keyof typeof INDICATOR_SOURCES] : (i.source ?? ""),
        i.plan_activity_id ?? null,
        i.computed_from ?? null,
      ],
    );
    await this.svc.log(actorId, "indicator.created", { orgId, data: { id, name: i.name } });
    return this.oneIndicator(orgId, id);
  }
  async updateIndicator(actorId: string, id: string, i: IndicatorInput) {
    const r = await this.svc.db.one<{ org_id: string; computed_from: string | null }>(
      "SELECT org_id, computed_from FROM indicators WHERE id = $1",
      [id],
    );
    if (!r) throw notFound("Indicateur introuvable");
    await this.svc.requirePerm(actorId, r.org_id, "indicators.manage");
    await this.assertPlanActivity(r.org_id, i.plan_activity_id);
    this.assertSource(i.computed_from);
    const source = i.computed_from !== undefined ? i.computed_from : r.computed_from;
    if (source && i.result !== undefined)
      throw badRequest(
        `Ce résultat est calculé par l'outil (${INDICATOR_SOURCES[source as keyof typeof INDICATOR_SOURCES]}) : il ne se saisit pas`,
      );
    if (i.computed_from !== undefined)
      await this.svc.db.query("UPDATE indicators SET computed_from = $1 WHERE id = $2", [i.computed_from || null, id]);
    await this.svc.db.query(
      `UPDATE indicators SET name = COALESCE($1, name), unit_label = COALESCE($2, unit_label), baseline = COALESCE($3, baseline),
         target = COALESCE($4, target), result = COALESCE($5, result), source = COALESCE($6, source),
         plan_activity_id = CASE WHEN $8 THEN $9 ELSE plan_activity_id END WHERE id = $7`,
      [
        i.name?.trim() ?? null,
        i.unit_label ?? null,
        i.baseline ?? null,
        i.target ?? null,
        i.result ?? null,
        i.source ?? null,
        id,
        i.plan_activity_id !== undefined,
        i.plan_activity_id ?? null,
      ],
    );
    await this.svc.log(actorId, "indicator.updated", { orgId: r.org_id, data: { id, ...i } });
    return this.oneIndicator(r.org_id, id);
  }
}
