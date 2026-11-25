import { uid } from "./db.js";
import { linkPartner } from "./partner-links.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, type Services, localDate } from "./services.js";

export type DeliverableStatus = "prevu" | "en_cours" | "soumis" | "en_revue" | "a_corriger" | "valide";
export interface Deliverable {
  id: string;
  org_id: string;
  project_id: string | null;
  activity_id: string | null;
  contract_id: string | null;
  payment_percent: number | null;
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
  project_id: string | null;
  user_id: string | null;
  consultant_name: string;
  partner_id: string | null;
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
    | "project_id"
    | "activity_id"
    | "contract_id"
    | "payment_percent"
    | "title"
    | "description"
    | "criteria"
    | "responsible_id"
    | "validator_id"
    | "due_on"
  >
>;
export type ContractInput = {
  project_id?: string | null;
  user_id?: string | null;
  /** Le cabinet prestataire, choisi dans l'annuaire des partenaires (lot PA3). */
  partner_id?: string | null;
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
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

export class Deliverables {
  constructor(private svc: Services) {}

  private async row(id: string) {
    const d = await this.svc.db.one<
      Deliverable & { project_name: string | null; amount_due: number | null; currency: string | null }
    >(
      `SELECT d.*, d.payment_percent::float8 AS payment_percent, p.name AS project_name, c.currency, c.title AS contract_title,
        r.name AS responsible_name, v.name AS validator_name,
        CASE WHEN d.payment_percent IS NOT NULL AND c.amount IS NOT NULL THEN round(c.amount * d.payment_percent / 100, 2)::float8 END AS amount_due
       FROM deliverables d LEFT JOIN consultant_contracts c ON c.id = d.contract_id LEFT JOIN projects p ON p.id = d.project_id
       LEFT JOIN users r ON r.id = d.responsible_id LEFT JOIN users v ON v.id = d.validator_id
       WHERE d.id = $1`,
      [id],
    );
    if (!d) throw notFound("Livrable introuvable");
    return d;
  }
  private async perms(actorId: string, orgId: string) {
    return this.svc.permissionsOf(actorId, orgId);
  }
  /** Les membres d'un projet voient les pièces de ce dossier (docs/PARCOURS-METIER.md). */
  private async seesProject(actorId: string, projectId: string | null) {
    if (!projectId) return false;
    return this.svc.require(actorId, projectId, "viewer", { allowArchived: true }).then(
      () => true,
      () => false,
    );
  }
  /**
   * Agir sur un livrable ou un contrat : le droit ne suffit pas, il s'exerce sur un dossier que l'on lit ; seul le
   * pilotage (DG, cabinet) agit sur tous (contrôle des testeurs).
   */
  private async assertScope(actorId: string, orgId: string, projectId: string | null) {
    if ((await this.perms(actorId, orgId)).includes("pilotage.view")) return;
    if (!(await this.seesProject(actorId, projectId))) throw forbidden("Ce dossier n'est pas dans votre périmètre");
  }
  /** Le projet doit exister dans l'institution : c'est le domicile de toute nouvelle pièce. */
  private async assertProject(orgId: string, projectId: string | null | undefined, what: string) {
    if (!projectId) throw badRequest(`${what} appartient à un projet : choisissez le projet concerné`);
    if (!(await this.svc.db.one("SELECT 1 FROM projects WHERE org_id = $1 AND id = $2", [orgId, projectId])))
      throw badRequest("Projet inconnu dans cette institution");
  }
  /** Le consultant ne voit que ce qui le concerne : sa mission et ses livrables ; les membres du projet voient le dossier. */
  private async readable(actorId: string, id: string) {
    const d = await this.row(id);
    if (!(await this.svc.orgRole(actorId, d.org_id))) throw forbidden("Vous n'appartenez pas à cette organisation");
    const p = await this.perms(actorId, d.org_id);
    if (
      !p.includes("pilotage.view") &&
      d.responsible_id !== actorId &&
      d.validator_id !== actorId &&
      !(await this.seesProject(actorId, d.project_id))
    )
      throw notFound("Livrable introuvable");
    return { d, p };
  }
  /** Tranche de paiement : elle exige un contrat, et les tranches d'un contrat ne dépassent jamais 100 %. */
  private async assertPayment(contractId: string | null, percent: number | null, exceptId: string | null) {
    if (percent === null) return;
    if (!contractId) throw badRequest("Une tranche de paiement n'a de sens que pour un livrable de contrat");
    const used = await this.svc.db.one<{ n: number }>(
      "SELECT COALESCE(sum(payment_percent), 0)::float8 AS n FROM deliverables WHERE contract_id = $1 AND id IS DISTINCT FROM $2",
      [contractId, exceptId],
    );
    const total = (used?.n ?? 0) + percent;
    if (total > 100)
      throw badRequest(`Les tranches de ce contrat dépasseraient 100 % (${Math.round(total * 100) / 100} %)`);
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
      const c = await this.svc.db.one<{ status: string; end_on: string; project_id: string | null }>(
        "SELECT status, end_on::text AS end_on, project_id FROM consultant_contracts WHERE org_id = $1 AND id = $2",
        [orgId, i.contract_id],
      );
      if (!c) throw badRequest("Mission inconnue");
      if (i.project_id !== undefined && c.project_id !== i.project_id)
        throw badRequest("Un livrable de contrat appartient au même projet que son contrat");
      // Un livrable de mission s'inscrit dans la durée de la mission
      if (c.status === "ended" || c.end_on < day())
        throw badRequest("Cette mission est terminée : aucun livrable ne peut plus y être rattaché");
      if (i.due_on && i.due_on > c.end_on) throw badRequest(`L'échéance dépasse la fin de la mission (${c.end_on})`);
    }
  }

  async list(actorId: string, orgId: string, f: { mine?: boolean; project_id?: string }) {
    if (!(await this.svc.orgRole(actorId, orgId))) throw forbidden("Vous n'appartenez pas à cette organisation");
    // Le pilotage voit tous les livrables ; le droit de les suivre s'exerce sur les projets que l'on lit (testeurs)
    const perms = await this.perms(actorId, orgId);
    let all = perms.includes("pilotage.view") && !f.mine;
    const follow = perms.includes("deliverables.view") && !f.mine;
    const readable = follow ? await this.svc.readableProjectIds(actorId, orgId) : [];
    if (f.project_id) {
      await this.assertProject(orgId, f.project_id, "Un livrable");
      // Le dossier d'un projet se lit par ses membres ; les autres n'y accèdent qu'avec le droit général
      if (!all && !f.mine) {
        if (!(await this.seesProject(actorId, f.project_id))) throw forbidden("Vous n'avez pas accès à ce projet");
        all = true;
      }
    }
    return this.svc.db.query<
      Deliverable & {
        responsible_name: string | null;
        validator_name: string | null;
        contract_title: string | null;
        project_name: string | null;
        amount_due: number | null;
      }
    >(
      `SELECT d.*, d.payment_percent::float8 AS payment_percent, r.name AS responsible_name, v.name AS validator_name,
        c.title AS contract_title, c.currency, p.name AS project_name,
        CASE WHEN d.payment_percent IS NOT NULL AND c.amount IS NOT NULL THEN round(c.amount * d.payment_percent / 100, 2)::float8 END AS amount_due
       FROM deliverables d LEFT JOIN users r ON r.id = d.responsible_id LEFT JOIN users v ON v.id = d.validator_id
       LEFT JOIN consultant_contracts c ON c.id = d.contract_id LEFT JOIN projects p ON p.id = d.project_id
       WHERE d.org_id = $1 AND ($2 OR d.responsible_id = $3 OR d.validator_id = $3 OR d.project_id = ANY($5::text[]))
         AND ($4::text IS NULL OR d.project_id = $4)
       ORDER BY d.status = 'valide', d.due_on NULLS LAST, d.created_at DESC`,
      [orgId, all, actorId, f.project_id ?? null, readable],
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
    await this.assertProject(orgId, i.project_id, "Un livrable");
    await this.assertScope(actorId, orgId, i.project_id ?? null);
    await this.assertRefs(orgId, i);
    await this.assertPayment(i.contract_id ?? null, i.payment_percent ?? null, null);
    const id = uid("liv");
    await this.svc.db.query(
      "INSERT INTO deliverables (id, org_id, project_id, activity_id, contract_id, payment_percent, title, description, criteria, responsible_id, validator_id, due_on, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
      [
        id,
        orgId,
        i.project_id,
        i.activity_id ?? null,
        i.contract_id ?? null,
        i.payment_percent ?? null,
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
    await this.assertScope(actorId, d.org_id, d.project_id);
    if (d.status === "valide") throw frozen();
    const responsible = i.responsible_id === undefined ? d.responsible_id : i.responsible_id;
    const validator = i.validator_id === undefined ? d.validator_id : i.validator_id;
    const contractId = i.contract_id === undefined ? d.contract_id : i.contract_id;
    const percent = i.payment_percent === undefined ? d.payment_percent : i.payment_percent;
    // Le projet d'un livrable ne change pas : il reste rangé dans son dossier
    await this.assertRefs(d.org_id, {
      ...i,
      project_id: d.project_id ?? undefined,
      contract_id: i.contract_id,
      responsible_id: responsible,
      validator_id: validator,
    });
    await this.assertPayment(contractId, percent, d.id);
    await this.svc.db.query(
      "UPDATE deliverables SET activity_id = $1, contract_id = $2, title = $3, description = $4, criteria = $5, responsible_id = $6, validator_id = $7, due_on = $8, payment_percent = $10 WHERE id = $9",
      [
        i.activity_id === undefined ? d.activity_id : i.activity_id,
        contractId,
        i.title?.trim() ?? d.title,
        i.description ?? d.description,
        i.criteria ?? d.criteria,
        responsible,
        validator,
        i.due_on === undefined ? d.due_on : i.due_on,
        id,
        percent,
      ],
    );
    return this.get(actorId, id);
  }

  async remove(actorId: string, id: string) {
    const d = await this.row(id);
    await this.svc.requirePerm(actorId, d.org_id, "deliverables.manage");
    await this.assertScope(actorId, d.org_id, d.project_id);
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
    await this.assertScope(actorId, d.org_id, d.project_id);
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
  /** Un consultant : invité extérieur, ou titulaire d'un contrat de mission. Son périmètre se borne à son propre contrat. */
  private async isConsultant(actorId: string, orgId: string) {
    if ((await this.svc.orgRole(actorId, orgId)) === "guest") return true;
    return !!(await this.svc.db.one("SELECT 1 FROM consultant_contracts WHERE org_id = $1 AND user_id = $2 LIMIT 1", [
      orgId,
      actorId,
    ]));
  }
  /** Contrats : le service gestionnaire voit tout ; les membres d'un projet voient ceux de leur dossier. */
  async contracts(actorId: string, orgId: string, f: { project_id?: string } = {}) {
    if (!(await this.svc.orgRole(actorId, orgId))) throw forbidden("Vous n'appartenez pas à cette organisation");
    // Le pilotage lit tous les contrats ; un gestionnaire, ceux de ses entités et de ses dossiers (F-5)
    const scope = await this.svc.scopeOf(actorId, orgId);
    const manager = (await this.perms(actorId, orgId)).includes("consultants.manage");
    let all = scope.wide;
    if (f.project_id) {
      await this.assertProject(orgId, f.project_id, "Un contrat");
      if (!all) {
        if (!(await this.seesProject(actorId, f.project_id))) throw forbidden("Vous n'avez pas accès à ce projet");
        // Un consultant lit son contrat, pas celui des autres consultants du même projet
        all = !(await this.isConsultant(actorId, orgId));
      }
    }
    return this.svc.db.query<
      Contract & {
        supervisor_name: string | null;
        project_name: string | null;
        open_deliverables: number;
        to_pay: number;
        scheduled_percent: number;
        to_pay_amount: number;
        paid_amount: number;
      }
    >(
      `SELECT c.*, c.amount::float8 AS amount, s.name AS supervisor_name, p.name AS project_name,
        (SELECT count(*)::int FROM deliverables d WHERE d.contract_id = c.id AND d.status <> 'valide') AS open_deliverables,
        (SELECT count(*)::int FROM deliverables d WHERE d.contract_id = c.id AND d.to_pay) AS to_pay,
        (SELECT COALESCE(sum(d.payment_percent), 0)::float8 FROM deliverables d WHERE d.contract_id = c.id) AS scheduled_percent,
        (SELECT COALESCE(round(sum(c.amount * d.payment_percent / 100), 2), 0)::float8 FROM deliverables d WHERE d.contract_id = c.id AND d.to_pay) AS to_pay_amount,
        (SELECT COALESCE(round(sum(c.amount * d.payment_percent / 100), 2), 0)::float8 FROM deliverables d WHERE d.contract_id = c.id AND d.paid_at IS NOT NULL) AS paid_amount
       FROM consultant_contracts c LEFT JOIN users s ON s.id = c.supervisor_id LEFT JOIN projects p ON p.id = c.project_id
       WHERE c.org_id = $1 AND (($2 AND (p.access IS DISTINCT FROM 'private'
           OR EXISTS (SELECT 1 FROM memberships pm WHERE pm.project_id = c.project_id AND pm.user_id = $3)))
         OR c.user_id = $3 OR c.supervisor_id = $3
         OR ($5 AND (p.unit_id = ANY($6::text[])
           OR EXISTS (SELECT 1 FROM memberships pm WHERE pm.project_id = c.project_id AND pm.user_id = $3))))
         AND ($4::text IS NULL OR c.project_id = $4)
       ORDER BY c.status, c.end_on`,
      [orgId, all, actorId, f.project_id ?? null, manager, scope.units],
    );
  }
  async createContract(actorId: string, orgId: string, i: ContractInput) {
    await this.svc.requirePerm(actorId, orgId, "consultants.manage");
    await this.assertProject(orgId, i.project_id, "Un contrat");
    for (const d of [i.start_on, i.end_on]) if (!isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    if (i.end_on < i.start_on) throw badRequest("La fin de mission précède son début");
    if (!(await this.svc.orgRole(i.supervisor_id, orgId)))
      throw badRequest("Le superviseur doit être membre de l'organisation");
    if (i.user_id && !(await this.svc.orgRole(i.user_id, orgId)))
      throw badRequest("Le consultant doit d'abord être invité dans l'organisation");
    const partner = await linkPartner(this.svc, orgId, i.partner_id, { supplier: true });
    const name =
      i.consultant_name?.trim() || (i.user_id ? (await this.svc.user(i.user_id)).name : "") || partner?.name || "";
    if (!name) throw badRequest("Indiquez le nom du consultant");
    const id = uid("mis");
    await this.svc.db.query(
      "INSERT INTO consultant_contracts (id, org_id, user_id, consultant_name, title, terms, start_on, end_on, amount, currency, supervisor_id, created_by, project_id, partner_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
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
        i.project_id,
        partner?.id ?? null,
      ],
    );
    await this.svc.log(actorId, "contract.created", { orgId, projectId: i.project_id, data: { id } });
    return this.contract(id);
  }
  async evaluate(actorId: string, id: string, i: { evaluation: string; rating: number }) {
    const c = await this.contract(id);
    if (c.supervisor_id !== actorId) {
      await this.svc.requirePerm(actorId, c.org_id, "consultants.manage");
      await this.assertScope(actorId, c.org_id, c.project_id);
    } else if (!(await this.svc.orgRole(actorId, c.org_id)))
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
