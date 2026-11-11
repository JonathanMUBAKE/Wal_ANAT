import { uid } from "./db.js";
import { linkContact, linkPartner } from "./partner-links.js";
import { HttpError, badRequest, isRealDate, notFound, type Services } from "./services.js";

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
  status: "enregistre" | "impute" | "traite";
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
}
export interface IndicatorInput {
  name?: string;
  unit_label?: string;
  baseline?: number;
  target?: number;
  result?: number;
  source?: string;
}
const mailRef = (m: Pick<Mail, "direction" | "year" | "seq">) =>
  `${m.direction === "entrant" ? "ENT" : "SOR"}/${m.year}/${String(m.seq).padStart(4, "0")}`;
const day = () => new Date().toISOString().slice(0, 10);

/** Registre officiel du courrier, risques et indicateurs de performance. */
export class Registers {
  constructor(private svc: Services) {}

  private async mail(id: string) {
    const m = await this.svc.db.one<Mail>("SELECT * FROM correspondence WHERE id = $1", [id]);
    if (!m) throw notFound("Courrier introuvable");
    return m;
  }
  private async mailReadable(actorId: string, id: string) {
    const m = await this.mail(id);
    await this.svc.requirePerm(actorId, m.org_id, "correspondence.view");
    const manager = (await this.svc.permissionsOf(actorId, m.org_id)).includes("correspondence.manage");
    if (m.confidential && !manager && m.assignee_id !== actorId) throw notFound("Courrier introuvable");
    return { m, manager };
  }
  async listMail(
    actorId: string,
    orgId: string,
    f: { direction?: Mail["direction"]; project_id?: string; activity_id?: string; partner_id?: string },
  ) {
    await this.svc.requirePerm(actorId, orgId, "correspondence.view");
    const manager = (await this.svc.permissionsOf(actorId, orgId)).includes("correspondence.manage");
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
       WHERE c.org_id = $1 AND (NOT c.confidential OR $2 OR c.assignee_id = $3) AND ($4::text IS NULL OR c.direction = $4)
         AND ($5::text IS NULL OR c.project_id = $5) AND ($6::text IS NULL OR c.activity_id = $6)
         AND ($7::text IS NULL OR c.partner_id = $7)
       ORDER BY c.received_on DESC, c.seq DESC`,
      [orgId, manager, actorId, f.direction ?? null, f.project_id ?? null, f.activity_id ?? null, f.partner_id ?? null],
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
    i: { unit_id?: string | null; assignee_id?: string | null; due_on?: string | null; instruction?: string },
  ) {
    const m = await this.mail(id);
    await this.svc.requirePerm(actorId, m.org_id, "correspondence.manage");
    if (m.status === "traite") throw new HttpError(409, "Ce courrier est clôturé");
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
    if (i.assignee_id)
      await this.svc.notify(i.assignee_id, m.org_id, {
        kind: "correspondence.assigned",
        title: `Courrier imputé : ${m.subject}`,
        body: `${mailRef(m)}${i.instruction?.trim() ? ` · ${i.instruction.trim()}` : ""}`,
      });
    await this.svc.log(actorId, "correspondence.assigned", { orgId: m.org_id, data: { id } });
    const r = await this.mail(id);
    return { ...r, reference: mailRef(r) };
  }
  async closeMail(actorId: string, id: string, i: { response_ref?: string }) {
    const { m, manager } = await this.mailReadable(actorId, id);
    if (!manager && m.assignee_id !== actorId) await this.svc.requirePerm(actorId, m.org_id, "correspondence.manage");
    // Une clôture est un fait du registre : elle ne s'écrase pas
    const closed = await this.svc.db.one(
      "UPDATE correspondence SET status = 'traite', response_ref = $1, closed_at = now() WHERE id = $2 AND status <> 'traite' RETURNING id",
      [i.response_ref ?? "", id],
    );
    if (!closed) throw new HttpError(409, "Ce courrier est déjà traité");
    await this.svc.log(actorId, "correspondence.closed", { orgId: m.org_id, data: { id } });
    const r = await this.mail(id);
    return { ...r, reference: mailRef(r) };
  }
  /** Un courrier en retard remonte une seule fois au responsable de l'entité. */
  async sweep(now = day()) {
    const late = await this.svc.db.query<Mail & { manager_id: string | null; created_by: string | null }>(
      "SELECT c.*, ou.manager_id FROM correspondence c LEFT JOIN org_units ou ON ou.id = c.unit_id WHERE c.status <> 'traite' AND NOT c.escalated AND c.due_on < $1::date",
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
  async risks(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "pilotage.view");
    return this.svc.db.query(
      "SELECT r.*, r.probability * r.impact AS score, u.name AS owner_name FROM risks r LEFT JOIN users u ON u.id = r.owner_id WHERE r.org_id = $1 ORDER BY r.status, score DESC",
      [orgId],
    );
  }
  async createRisk(
    actorId: string,
    orgId: string,
    i: RiskInput & { title: string; probability: number; impact: number },
  ) {
    await this.svc.requirePerm(actorId, orgId, "risks.manage");
    if (i.owner_id && !(await this.svc.orgRole(i.owner_id, orgId)))
      throw badRequest("Le responsable doit être membre de l'organisation");
    const id = uid("rsk");
    await this.svc.db.query(
      "INSERT INTO risks (id, org_id, title, probability, impact, owner_id, mitigation) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id, orgId, i.title.trim(), i.probability, i.impact, i.owner_id ?? null, i.mitigation ?? ""],
    );
    await this.svc.log(actorId, "risk.created", { orgId, data: { id } });
    return this.svc.db.one("SELECT * FROM risks WHERE id = $1", [id]);
  }
  async updateRisk(actorId: string, id: string, i: RiskInput) {
    const r = await this.svc.db.one<{ org_id: string }>("SELECT org_id FROM risks WHERE id = $1", [id]);
    if (!r) throw notFound("Risque introuvable");
    await this.svc.requirePerm(actorId, r.org_id, "risks.manage");
    if (i.owner_id && !(await this.svc.orgRole(i.owner_id, r.org_id)))
      throw badRequest("Le responsable doit être membre de l'organisation");
    return this.svc.db.one(
      "UPDATE risks SET title = COALESCE($1, title), probability = COALESCE($2, probability), impact = COALESCE($3, impact), owner_id = COALESCE($4, owner_id), mitigation = COALESCE($5, mitigation), status = COALESCE($6, status) WHERE id = $7 RETURNING *",
      [
        i.title?.trim() ?? null,
        i.probability ?? null,
        i.impact ?? null,
        i.owner_id ?? null,
        i.mitigation ?? null,
        i.status ?? null,
        id,
      ],
    );
  }

  // ---------------------------------------------------------------- indicateurs
  async indicators(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "pilotage.view");
    return this.svc.db.query(
      "SELECT id, name, unit_label, source, baseline::float8 AS baseline, target::float8 AS target, result::float8 AS result FROM indicators WHERE org_id = $1 ORDER BY name",
      [orgId],
    );
  }
  async createIndicator(actorId: string, orgId: string, i: IndicatorInput & { name: string; target: number }) {
    await this.svc.requirePerm(actorId, orgId, "risks.manage");
    const id = uid("ind");
    await this.svc.db.query(
      "INSERT INTO indicators (id, org_id, name, unit_label, baseline, target, result, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, orgId, i.name.trim(), i.unit_label ?? "", i.baseline ?? 0, i.target, i.result ?? 0, i.source ?? ""],
    );
    await this.svc.log(actorId, "indicator.created", { orgId, data: { id } });
    return this.svc.db.one(
      "SELECT id, name, unit_label, source, baseline::float8 AS baseline, target::float8 AS target, result::float8 AS result FROM indicators WHERE id = $1",
      [id],
    );
  }
  async updateIndicator(actorId: string, id: string, i: IndicatorInput) {
    const r = await this.svc.db.one<{ org_id: string }>("SELECT org_id FROM indicators WHERE id = $1", [id]);
    if (!r) throw notFound("Indicateur introuvable");
    await this.svc.requirePerm(actorId, r.org_id, "risks.manage");
    return this.svc.db.one(
      "UPDATE indicators SET name = COALESCE($1, name), unit_label = COALESCE($2, unit_label), baseline = COALESCE($3, baseline), target = COALESCE($4, target), result = COALESCE($5, result), source = COALESCE($6, source) WHERE id = $7 RETURNING id, name, unit_label, source, baseline::float8 AS baseline, target::float8 AS target, result::float8 AS result",
      [
        i.name?.trim() ?? null,
        i.unit_label ?? null,
        i.baseline ?? null,
        i.target ?? null,
        i.result ?? null,
        i.source ?? null,
        id,
      ],
    );
  }
}
