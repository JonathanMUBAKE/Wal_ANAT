import { uid } from "./db.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, type Services } from "./services.js";

export type DeliverableStatus = "prevu" | "en_cours" | "soumis" | "en_revue" | "a_corriger" | "valide";
export interface Deliverable {
  id: string;
  org_id: string;
  activity_id: string | null;
  contract_id: string | null;
  title: string;
  description: string;
  criteria: string;
  responsible_id: string | null;
  validator_id: string | null;
  due_on: string | null;
  status: DeliverableStatus;
  version: number;
  review_comment: string;
  to_pay: boolean;
  reception_ref: string | null;
}
export interface Contract {
  id: string;
  org_id: string;
  user_id: string | null;
  consultant_name: string;
  title: string;
  terms: string;
  start_on: string;
  end_on: string;
  amount: number | null;
  currency: string;
  supervisor_id: string | null;
  status: "active" | "ended";
  evaluation: string;
  rating: number | null;
  reminded: boolean;
}
export type DeliverableInput = Partial<
  Pick<
    Deliverable,
    "activity_id" | "contract_id" | "title" | "description" | "criteria" | "responsible_id" | "validator_id" | "due_on"
  >
>;
export type ContractInput = {
  user_id?: string | null;
  consultant_name?: string;
  title: string;
  terms?: string;
  start_on: string;
  end_on: string;
  amount?: number | null;
  currency?: string;
  supervisor_id: string;
};
const WARNING_DAYS = 15;
const frozen = () => new HttpError(409, "Ce livrable est validé : il ne peut plus être modifié");
const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

export class Deliverables {
  constructor(private svc: Services) {}

  private async row(id: string) {
    const d = await this.svc.db.one<Deliverable>("SELECT * FROM deliverables WHERE id = $1", [id]);
    if (!d) throw notFound("Livrable introuvable");
    return d;
  }
  private async perms(actorId: string, orgId: string) {
    return this.svc.permissionsOf(actorId, orgId);
  }
  /** Le consultant ne voit que ce qui le concerne : sa mission et ses livrables. */
  private async readable(actorId: string, id: string) {
    const d = await this.row(id);
    if (!(await this.svc.orgRole(actorId, d.org_id))) throw forbidden("Vous n'appartenez pas à cette organisation");
    const p = await this.perms(actorId, d.org_id);
    if (!p.includes("deliverables.view") && d.responsible_id !== actorId && d.validator_id !== actorId)
      throw notFound("Livrable introuvable");
    return { d, p };
  }
  private async assertRefs(orgId: string, i: DeliverableInput) {
    if (i.due_on && !isRealDate(i.due_on)) throw badRequest(`Date invalide : ${i.due_on}`);
    for (const u of [i.responsible_id, i.validator_id])
      if (u && !(await this.svc.orgRole(u, orgId)))
        throw badRequest("Cette personne n'appartient pas à l'organisation");
    if (i.responsible_id && i.validator_id && i.responsible_id === i.validator_id)
      throw badRequest("Le valideur doit être une autre personne que le responsable");
    if (
      i.activity_id &&
      !(await this.svc.db.one("SELECT 1 FROM plan_activities WHERE org_id = $1 AND id = $2", [orgId, i.activity_id]))
    )
      throw badRequest("Activité du plan inconnue");
    if (i.contract_id) {
      const c = await this.svc.db.one<{ status: string; end_on: string }>(
        "SELECT status, end_on::text AS end_on FROM consultant_contracts WHERE org_id = $1 AND id = $2",
        [orgId, i.contract_id],
      );
      if (!c) throw badRequest("Mission inconnue");
      // Un livrable de mission s'inscrit dans la durée de la mission
      if (c.status === "ended" || c.end_on < day())
        throw badRequest("Cette mission est terminée : aucun livrable ne peut plus y être rattaché");
      if (i.due_on && i.due_on > c.end_on)
        throw badRequest(`L'échéance dépasse la fin de la mission (${c.end_on})`);
    }
  }

  async list(actorId: string, orgId: string, f: { mine?: boolean }) {
    if (!(await this.svc.orgRole(actorId, orgId))) throw forbidden("Vous n'appartenez pas à cette organisation");
    const all = (await this.perms(actorId, orgId)).includes("deliverables.view") && !f.mine;
    return this.svc.db.query<
      Deliverable & { responsible_name: string | null; validator_name: string | null; contract_title: string | null }
    >(
      `SELECT d.*, r.name AS responsible_name, v.name AS validator_name, c.title AS contract_title
       FROM deliverables d LEFT JOIN users r ON r.id = d.responsible_id LEFT JOIN users v ON v.id = d.validator_id LEFT JOIN consultant_contracts c ON c.id = d.contract_id
       WHERE d.org_id = $1 AND ($2 OR d.responsible_id = $3 OR d.validator_id = $3) ORDER BY d.status = 'valide', d.due_on NULLS LAST, d.created_at DESC`,
      [orgId, all, actorId],
    );
  }

  async get(actorId: string, id: string) {
    const { d, p } = await this.readable(actorId, id);
    const events = await this.svc.db.query<{
      id: string;
      actor_name: string | null;
      from_status: string;
      to_status: string;
      comment: string;
      created_at: string;
    }>(
      "SELECT e.id, u.name AS actor_name, e.from_status, e.to_status, e.comment, e.created_at FROM deliverable_events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.deliverable_id = $1 ORDER BY e.created_at DESC",
      [id],
    );
    const validates =
      (p.includes("deliverables.validate") || d.validator_id === actorId) && d.responsible_id !== actorId;
    return {
      ...d,
      events,
      can: {
        edit: d.status !== "valide" && p.includes("deliverables.manage"),
        advance: d.responsible_id === actorId && ["prevu", "en_cours", "a_corriger"].includes(d.status),
        review: validates && d.status === "soumis",
        decide: validates && d.status === "en_revue",
      },
    };
  }

  async create(
    actorId: string,
    orgId: string,
    i: DeliverableInput & { title: string; responsible_id: string; validator_id: string },
  ) {
    await this.svc.requirePerm(actorId, orgId, "deliverables.manage");
    await this.assertRefs(orgId, i);
    const id = uid("liv");
    await this.svc.db.query(
      "INSERT INTO deliverables (id, org_id, activity_id, contract_id, title, description, criteria, responsible_id, validator_id, due_on, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [
        id,
        orgId,
        i.activity_id ?? null,
        i.contract_id ?? null,
        i.title.trim(),
        i.description ?? "",
        i.criteria ?? "",
        i.responsible_id,
        i.validator_id,
        i.due_on ?? null,
        actorId,
      ],
    );
    await this.svc.log(actorId, "deliverable.created", { orgId, data: { id } });
    return this.get(actorId, id);
  }

  async update(actorId: string, id: string, i: DeliverableInput) {
    const d = await this.row(id);
    await this.svc.requirePerm(actorId, d.org_id, "deliverables.manage");
    if (d.status === "valide") throw frozen();
    const responsible = i.responsible_id === undefined ? d.responsible_id : i.responsible_id;
    const validator = i.validator_id === undefined ? d.validator_id : i.validator_id;
    await this.assertRefs(d.org_id, { ...i, responsible_id: responsible, validator_id: validator });
    await this.svc.db.query(
      "UPDATE deliverables SET activity_id = $1, contract_id = $2, title = $3, description = $4, criteria = $5, responsible_id = $6, validator_id = $7, due_on = $8 WHERE id = $9",
      [
        i.activity_id === undefined ? d.activity_id : i.activity_id,
        i.contract_id === undefined ? d.contract_id : i.contract_id,
        i.title?.trim() ?? d.title,
        i.description ?? d.description,
        i.criteria ?? d.criteria,
        responsible,
        validator,
        i.due_on === undefined ? d.due_on : i.due_on,
        id,
      ],
    );
    return this.get(actorId, id);
  }

  async remove(actorId: string, id: string) {
    const d = await this.row(id);
    await this.svc.requirePerm(actorId, d.org_id, "deliverables.manage");
    if (d.status === "valide") throw frozen();
    await this.svc.db.query("DELETE FROM deliverables WHERE id = $1", [id]);
    await this.svc.log(actorId, "deliverable.deleted", { orgId: d.org_id, data: { id, title: d.title } });
  }

  private async move(
    actorId: string,
    d: Deliverable,
    to: DeliverableStatus,
    comment = "",
    extra: { set?: string; values?: unknown[] } = {},
  ) {
    const params = [to, comment, d.id, d.status, ...(extra.values ?? [])];
    const done = await this.svc.db.tx(async (q) => {
      const r = await q.query(
        `UPDATE deliverables SET status = $1, review_comment = CASE WHEN $2 = '' THEN review_comment ELSE $2 END${extra.set ?? ""} WHERE id = $3 AND status = $4 RETURNING id`,
        params,
      );
      if (!r.length) return false;
      await q.query(
        "INSERT INTO deliverable_events (id, org_id, deliverable_id, actor_id, from_status, to_status, comment) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [uid("lev"), d.org_id, d.id, actorId, d.status, to, comment],
      );
      return true;
    });
    if (!done) throw new HttpError(409, "Ce livrable vient de changer d'état : rechargez la page");
    await this.svc.log(actorId, `deliverable.${to}`, { orgId: d.org_id, data: { id: d.id } });
  }

  /** Le responsable démarre et soumet ; il ne valide jamais son propre travail. */
  async start(actorId: string, id: string) {
    const { d } = await this.readable(actorId, id);
    if (d.responsible_id !== actorId) throw forbidden("Seul le responsable fait avancer ce livrable");
    if (d.status !== "prevu" && d.status !== "a_corriger") throw badRequest("Ce livrable est déjà en cours");
    await this.move(actorId, d, "en_cours", "", d.status === "a_corriger" ? { set: ", version = version + 1" } : {});
    return this.get(actorId, id);
  }
  async submit(actorId: string, id: string) {
    const { d } = await this.readable(actorId, id);
    if (d.responsible_id !== actorId) throw forbidden("Seul le responsable soumet ce livrable");
    if (d.status !== "en_cours") throw badRequest("Seul un livrable en cours peut être soumis");
    await this.move(actorId, d, "soumis");
    if (d.validator_id)
      await this.svc.notify(d.validator_id, d.org_id, {
        kind: "deliverable.submitted",
        title: `Livrable à valider : ${d.title}`,
      });
    return this.get(actorId, id);
  }
  private async assertValidator(actorId: string, d: Deliverable, p: string[]) {
    if (d.responsible_id === actorId) throw forbidden("Le responsable ne peut pas valider son propre livrable");
    if (d.validator_id !== actorId && !p.includes("deliverables.validate"))
      throw forbidden("Seul le valideur désigné décide de ce livrable");
  }
  async review(actorId: string, id: string) {
    const { d, p } = await this.readable(actorId, id);
    await this.assertValidator(actorId, d, p);
    if (d.status !== "soumis") throw badRequest("Seul un livrable soumis peut être mis en revue");
    await this.move(actorId, d, "en_revue");
    return this.get(actorId, id);
  }
  /** Un livrable de mission validé produit un procès-verbal de réception et un signal « à payer ». */
  async decide(actorId: string, id: string, i: { decision: "valide" | "a_corriger"; comment?: string }) {
    const { d, p } = await this.readable(actorId, id);
    await this.assertValidator(actorId, d, p);
    if (d.status !== "en_revue") throw badRequest("Seul un livrable en revue peut être décidé");
    if (i.decision === "a_corriger") {
      if (!i.comment?.trim()) throw badRequest("Indiquez ce qui doit être corrigé");
      await this.move(actorId, d, "a_corriger", i.comment.trim());
      if (d.responsible_id)
        await this.svc.notify(d.responsible_id, d.org_id, {
          kind: "deliverable.returned",
          title: `Livrable à corriger : ${d.title}`,
          body: i.comment.trim(),
        });
      return this.get(actorId, id);
    }
    // Numérotation annuelle des procès-verbaux : elle repart à 1 chaque année
    const pvYear = day().slice(0, 4);
    const seq = await this.svc.db.one<{ n: number }>(
      "SELECT COALESCE(max(substring(reception_ref FROM 9)::int), 0) + 1 AS n FROM deliverables WHERE org_id = $1 AND reception_ref LIKE $2",
      [d.org_id, `PV-${pvYear}-%`],
    );
    const ref = d.contract_id ? `PV-${pvYear}-${String(seq?.n ?? 1).padStart(4, "0")}` : null;
    await this.move(actorId, d, "valide", i.comment?.trim() ?? "", {
      set: ", validated_by = $5, validated_at = now(), to_pay = $6, reception_ref = $7",
      values: [actorId, !!d.contract_id, ref],
    });
    if (d.contract_id) {
      const c = await this.svc.db.one<Contract>("SELECT * FROM consultant_contracts WHERE id = $1", [d.contract_id]);
      if (c?.supervisor_id)
        await this.svc.notify(c.supervisor_id, d.org_id, {
          kind: "deliverable.to_pay",
          title: `À payer : ${d.title}`,
          body: `Procès-verbal ${ref}`,
        });
    }
    return this.get(actorId, id);
  }

  /** Le paiement d'un livrable reçu se constate une fois : la date et l'auteur restent dans l'historique. */
  async markPaid(actorId: string, id: string) {
    const d = await this.row(id);
    await this.svc.requirePerm(actorId, d.org_id, "consultants.manage");
    if (!d.to_pay) throw new HttpError(409, "Ce livrable n'attend aucun paiement");
    const done = await this.svc.db.tx(async (q) => {
      const r = await q.query(
        "UPDATE deliverables SET to_pay = FALSE, paid_at = now(), paid_by = $1 WHERE id = $2 AND to_pay RETURNING id",
        [actorId, id],
      );
      if (!r.length) return false;
      await q.query(
        "INSERT INTO deliverable_events (id, org_id, deliverable_id, actor_id, from_status, to_status, comment) VALUES ($1,$2,$3,$4,$5,$5,$6)",
        [uid("lev"), d.org_id, id, actorId, d.status, `Paiement constaté (${d.reception_ref ?? "sans procès-verbal"})`],
      );
      return true;
    });
    if (!done) throw new HttpError(409, "Ce livrable n'attend aucun paiement");
    await this.svc.log(actorId, "deliverable.paid", { orgId: d.org_id, data: { id, reception: d.reception_ref } });
    return this.get(actorId, id);
  }

  // ---------------------------------------------------------------- missions des consultants
  private async contract(id: string) {
    const c = await this.svc.db.one<Contract>(
      "SELECT *, amount::float8 AS amount FROM consultant_contracts WHERE id = $1",
      [id],
    );
    if (!c) throw notFound("Mission introuvable");
    return c;
  }
  async contracts(actorId: string, orgId: string) {
    if (!(await this.svc.orgRole(actorId, orgId))) throw forbidden("Vous n'appartenez pas à cette organisation");
    const manager = (await this.perms(actorId, orgId)).includes("consultants.manage");
    return this.svc.db.query<Contract & { supervisor_name: string | null; open_deliverables: number; to_pay: number }>(
      `SELECT c.*, c.amount::float8 AS amount, s.name AS supervisor_name,
        (SELECT count(*)::int FROM deliverables d WHERE d.contract_id = c.id AND d.status <> 'valide') AS open_deliverables,
        (SELECT count(*)::int FROM deliverables d WHERE d.contract_id = c.id AND d.to_pay) AS to_pay
       FROM consultant_contracts c LEFT JOIN users s ON s.id = c.supervisor_id WHERE c.org_id = $1 AND ($2 OR c.user_id = $3 OR c.supervisor_id = $3) ORDER BY c.status, c.end_on`,
      [orgId, manager, actorId],
    );
  }
  async createContract(actorId: string, orgId: string, i: ContractInput) {
    await this.svc.requirePerm(actorId, orgId, "consultants.manage");
    for (const d of [i.start_on, i.end_on]) if (!isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    if (i.end_on < i.start_on) throw badRequest("La fin de mission précède son début");
    if (!(await this.svc.orgRole(i.supervisor_id, orgId)))
      throw badRequest("Le superviseur doit être membre de l'organisation");
    if (i.user_id && !(await this.svc.orgRole(i.user_id, orgId)))
      throw badRequest("Le consultant doit d'abord être invité dans l'organisation");
    const name = i.consultant_name?.trim() || (i.user_id ? (await this.svc.user(i.user_id)).name : "");
    if (!name) throw badRequest("Indiquez le nom du consultant");
    const id = uid("mis");
    await this.svc.db.query(
      "INSERT INTO consultant_contracts (id, org_id, user_id, consultant_name, title, terms, start_on, end_on, amount, currency, supervisor_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
      [
        id,
        orgId,
        i.user_id ?? null,
        name,
        i.title.trim(),
        i.terms ?? "",
        i.start_on,
        i.end_on,
        i.amount ?? null,
        i.currency ?? "USD",
        i.supervisor_id,
        actorId,
      ],
    );
    await this.svc.log(actorId, "contract.created", { orgId, data: { id } });
    return this.contract(id);
  }
  async evaluate(actorId: string, id: string, i: { evaluation: string; rating: number }) {
    const c = await this.contract(id);
    if (c.supervisor_id !== actorId) await this.svc.requirePerm(actorId, c.org_id, "consultants.manage");
    else if (!(await this.svc.orgRole(actorId, c.org_id)))
      throw forbidden("Vous n'appartenez pas à cette organisation");
    await this.svc.db.query("UPDATE consultant_contracts SET evaluation = $1, rating = $2 WHERE id = $3", [
      i.evaluation.trim(),
      i.rating,
      id,
    ]);
    return this.contract(id);
  }

  /** Alerte le superviseur avant l'échéance, puis ferme l'accès du consultant invité à la fin de la mission. */
  async sweep(now = day()) {
    const limit = new Date(Date.parse(`${now}T00:00:00Z`) + WARNING_DAYS * 864e5).toISOString().slice(0, 10);
    const soon = await this.svc.db.query<Contract>(
      "SELECT * FROM consultant_contracts WHERE status = 'active' AND NOT reminded AND end_on >= $1::date AND end_on <= $2::date",
      [now, limit],
    );
    for (const c of soon) {
      if (c.supervisor_id)
        await this.svc.notify(c.supervisor_id, c.org_id, {
          kind: "contract.ending",
          title: `Fin de mission proche : ${c.consultant_name}`,
          body: `${c.title}, jusqu'au ${c.end_on}`,
        });
      await this.svc.db.query("UPDATE consultant_contracts SET reminded = TRUE WHERE id = $1", [c.id]);
    }
    const ended = await this.svc.db.query<Contract>(
      "SELECT * FROM consultant_contracts WHERE status = 'active' AND end_on < $1::date",
      [now],
    );
    for (const c of ended) {
      await this.svc.db.tx(async (q) => {
        await q.query("UPDATE consultant_contracts SET status = 'ended', ended_at = now() WHERE id = $1", [c.id]);
        if (!c.user_id) return;
        // Seul un invité perd son accès : un agent de l'Agence garde le sien
        const guest = await q.query("SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2 AND role = 'guest'", [
          c.org_id,
          c.user_id,
        ]);
        if (!guest.length) return;
        await q.query(
          "DELETE FROM team_members WHERE user_id = $1 AND team_id IN (SELECT id FROM teams WHERE org_id = $2)",
          [c.user_id, c.org_id],
        );
        await q.query(
          "DELETE FROM memberships WHERE user_id = $1 AND project_id IN (SELECT id FROM projects WHERE org_id = $2)",
          [c.user_id, c.org_id],
        );
        await q.query("DELETE FROM org_members WHERE org_id = $1 AND user_id = $2", [c.org_id, c.user_id]);
      });
      if (c.supervisor_id)
        await this.svc.notify(c.supervisor_id, c.org_id, {
          kind: "contract.ended",
          title: `Mission terminée : ${c.consultant_name}`,
          body: "Accès fermé. Pensez à l'évaluation et au transfert des documents.",
        });
    }
    return { warned: soon.length, ended: ended.length };
  }
}
