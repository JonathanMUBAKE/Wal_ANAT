import { uid } from "./db.js";
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
}
export interface MailInput {
  direction: Mail["direction"];
  subject: string;
  correspondent: string;
  doc_date?: string | null;
  received_on: string;
  due_on?: string | null;
  confidential?: boolean;
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
  async listMail(actorId: string, orgId: string, f: { direction?: Mail["direction"] }) {
    await this.svc.requirePerm(actorId, orgId, "correspondence.view");
    const manager = (await this.svc.permissionsOf(actorId, orgId)).includes("correspondence.manage");
    const rows = await this.svc.db.query<Mail & { unit_name: string | null; assignee_name: string | null }>(
      `SELECT c.*, ou.name AS unit_name, u.name AS assignee_name FROM correspondence c LEFT JOIN org_units ou ON ou.id = c.unit_id LEFT JOIN users u ON u.id = c.assignee_id
       WHERE c.org_id = $1 AND (NOT c.confidential OR $2 OR c.assignee_id = $3) AND ($4::text IS NULL OR c.direction = $4) ORDER BY c.received_on DESC, c.seq DESC`,
      [orgId, manager, actorId, f.direction ?? null],
    );
    return rows.map((m) => ({ ...m, reference: mailRef(m) }));
  }
  async registerMail(actorId: string, orgId: string, i: MailInput) {
    await this.svc.requirePerm(actorId, orgId, "correspondence.manage");
    for (const d of [i.doc_date, i.received_on, i.due_on])
      if (d && !isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    if (i.due_on && i.due_on < i.received_on) throw badRequest("Le délai de réponse précède la date de réception");
    const id = uid("crr");
    const year = Number(i.received_on.slice(0, 4));
    for (let attempt = 0; ; attempt++) {
      try {
        await this.svc.db.query(
          `INSERT INTO correspondence (id, org_id, direction, year, seq, subject, correspondent, doc_date, received_on, due_on, confidential, created_by)
           VALUES ($1,$2,$3,$4,(SELECT COALESCE(max(seq),0)+1 FROM correspondence WHERE org_id = $2 AND direction = $3 AND year = $4),$5,$6,$7,$8,$9,$10,$11)`,
          [
            id,
            orgId,
            i.direction,
            year,
            i.subject.trim(),
            i.correspondent.trim(),
            i.doc_date ?? null,
            i.received_on,
            i.due_on ?? null,
            i.confidential ?? false,
            actorId,
          ],
        );
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "23505" || attempt >= 8) throw e;
      }
    }
    await this.svc.log(actorId, "correspondence.registered", { orgId, data: { id } });
    const m = await this.mail(id);
    return { ...m, reference: mailRef(m) };
  }
  async assignMail(
    actorId: string,
    id: string,
    i: { unit_id?: string | null; assignee_id?: string | null; due_on?: string | null },
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
      "UPDATE correspondence SET unit_id = COALESCE($1, unit_id), assignee_id = COALESCE($2, assignee_id), due_on = COALESCE($3, due_on), status = 'impute', escalated = FALSE WHERE id = $4",
      [i.unit_id ?? null, i.assignee_id ?? null, i.due_on ?? null, id],
    );
    if (i.assignee_id)
      await this.svc.notify(i.assignee_id, m.org_id, {
        kind: "correspondence.assigned",
        title: `Courrier imputé : ${m.subject}`,
        body: mailRef(m),
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
