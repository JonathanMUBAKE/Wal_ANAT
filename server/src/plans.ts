import { uid } from "./db.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, type Services } from "./services.js";
import { PlanReviews } from "./plan-reviews.js";
import { weightedProgress } from "./rules.js";

export interface Plan {
  id: string;
  org_id: string;
  unit_id: string;
  year: number;
  title: string;
  status: "draft" | "submitted" | "approved";
  return_comment: string;
  submitted_by: string | null;
  approved_by: string | null;
  created_by: string | null;
}
export interface PlanActivity {
  id: string;
  org_id: string;
  plan_id: string;
  /** Poids dans l'avancement du plan (PT-3). */
  weight: number;
  parent_id: string | null;
  domain_id: string | null;
  title: string;
  responsible_id: string | null;
  objective: string;
  target_value: number | null;
  actual_value: number | null;
  unit_label: string;
  start_on: string | null;
  end_on: string | null;
  budget_planned: number | null;
  budget_committed: number | null;
  budget_spent: number | null;
  progress: number;
  baseline: Record<string, unknown> | null;
}
export type ActivityInput = Partial<
  Pick<
    PlanActivity,
    | "weight"
    | "parent_id"
    | "domain_id"
    | "title"
    | "responsible_id"
    | "objective"
    | "target_value"
    | "unit_label"
    | "start_on"
    | "end_on"
    | "budget_planned"
  >
>;
const EDITABLE = [
  "weight",
  "parent_id",
  "domain_id",
  "title",
  "responsible_id",
  "objective",
  "target_value",
  "unit_label",
  "start_on",
  "end_on",
  "budget_planned",
] as const;
const REVISABLE = [
  "title",
  "responsible_id",
  "objective",
  "target_value",
  "start_on",
  "end_on",
  "budget_planned",
] as const;
const SELECT_ACTIVITY = `a.*, a.target_value::float8 AS target_value, a.actual_value::float8 AS actual_value, a.budget_planned::float8 AS budget_planned,
  a.budget_committed::float8 AS budget_committed, a.budget_spent::float8 AS budget_spent`;
const frozen = () => new HttpError(409, "Ce plan n'est plus en préparation : passez par une révision tracée");

export class Plans {
  constructor(private svc: Services) {}

  private async row(id: string) {
    const p = await this.svc.db.one<Plan>("SELECT * FROM work_plans WHERE id = $1", [id]);
    if (!p) throw notFound("Plan introuvable");
    return p;
  }
  private async activity(id: string) {
    const a = await this.svc.db.one<PlanActivity>(`SELECT ${SELECT_ACTIVITY} FROM plan_activities a WHERE a.id = $1`, [
      id,
    ]);
    if (!a) throw notFound("Activité du plan introuvable");
    return a;
  }

  async list(actorId: string, orgId: string, f: { year?: number }) {
    await this.svc.requirePerm(actorId, orgId, "plans.view");
    // L'avancement affiché tient compte des dossiers qui réalisent chaque activité (lot P3c)
    return this.svc.db.query<Plan & { unit_name: string; activity_count: number; progress: number; late: number }>(
      `SELECT p.*, ou.name AS unit_name, count(a.id)::int AS activity_count,
        -- Avancement pondéré par le poids de chaque activité (thème 4, PT-3)
        COALESCE(round(sum(COALESCE(eff.progress, a.progress) * a.weight)::numeric / NULLIF(sum(a.weight), 0)), 0)::int AS progress,
        count(a.id) FILTER (WHERE a.end_on < CURRENT_DATE AND COALESCE(eff.progress, a.progress) < 100)::int AS late
       FROM work_plans p JOIN org_units ou ON ou.id = p.unit_id LEFT JOIN plan_activities a ON a.plan_id = p.id
       LEFT JOIN LATERAL (
         SELECT round(avg(x.progress))::int AS progress FROM (
           SELECT CASE WHEN count(t.id) > 0 THEN 100.0 * count(t.id) FILTER (WHERE t.completed) / count(t.id) ELSE 0 END AS progress
            FROM projects pj LEFT JOIN tasks t ON t.project_id = pj.id AND t.parent_id IS NULL
            WHERE pj.plan_activity_id = a.id GROUP BY pj.id
           UNION ALL
           SELECT aa.progress::numeric FROM agency_activities aa WHERE aa.plan_activity_id = a.id
         ) x
       ) eff ON TRUE
       WHERE p.org_id = $1 AND ($2::int IS NULL OR p.year = $2) GROUP BY p.id, ou.name ORDER BY p.year DESC, ou.name`,
      [orgId, f.year ?? null],
    );
  }

  /** Catalogue des activités du plan, pour rattacher un dossier (projet, activité) à ce qu'il réalise. */
  async catalog(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "plans.view");
    return this.svc.db.query<{
      id: string;
      title: string;
      year: number;
      plan_title: string;
      plan_status: string;
      unit_name: string;
    }>(
      `SELECT a.id, a.title, p.year, p.title AS plan_title, p.status AS plan_status, ou.name AS unit_name
       FROM plan_activities a JOIN work_plans p ON p.id = a.plan_id JOIN org_units ou ON ou.id = p.unit_id
       WHERE a.org_id = $1 ORDER BY p.year DESC, ou.name, a.title`,
      [orgId],
    );
  }

  /** Les dossiers (projets, activités) qui réalisent des activités du plan, avec leur avancement. */
  private async dossiersOf(activityIds: string[]) {
    if (!activityIds.length) return [];
    return this.svc.db.query<{
      plan_activity_id: string;
      kind: "project" | "activity";
      id: string;
      label: string;
      progress: number;
    }>(
      `SELECT p.plan_activity_id, 'project' AS kind, p.id, p.name AS label,
        CASE WHEN count(t.id) > 0 THEN round(100.0 * count(t.id) FILTER (WHERE t.completed) / count(t.id)) ELSE 0 END::int AS progress
       FROM projects p LEFT JOIN tasks t ON t.project_id = p.id AND t.parent_id IS NULL
       WHERE p.plan_activity_id = ANY($1) GROUP BY p.id
       UNION ALL
       SELECT a.plan_activity_id, 'activity', a.id, a.title, a.progress FROM agency_activities a WHERE a.plan_activity_id = ANY($1)`,
      [activityIds],
    );
  }

  /** Peut-il préparer le plan de cette entité ? Tous les plans, ou celui de son entité et des entités rattachées (PT-1). */
  private async mayPrepare(actorId: string, orgId: string, unitId: string, perms?: string[]) {
    const have = perms ?? (await this.svc.permissionsOf(actorId, orgId));
    if (have.includes("plans.manage_all")) return true;
    return have.includes("plans.manage") && (await this.svc.heads(actorId, unitId));
  }
  private async assertPrepare(actorId: string, orgId: string, unitId: string) {
    await this.svc.requirePerm(actorId, orgId, "plans.manage");
    if (!(await this.mayPrepare(actorId, orgId, unitId)))
      throw forbidden("Vous préparez le plan de votre entité et des entités qui lui sont rattachées, pas celui-ci");
  }

  async get(actorId: string, id: string) {
    const p = await this.row(id);
    await this.svc.requirePerm(actorId, p.org_id, "plans.view");
    const perms = await this.svc.permissionsOf(actorId, p.org_id);
    const rows = await this.svc.db.query<
      PlanActivity & { responsible_name: string | null; domain_name: string | null }
    >(
      `SELECT ${SELECT_ACTIVITY}, u.name AS responsible_name, d.name AS domain_name FROM plan_activities a
       LEFT JOIN users u ON u.id = a.responsible_id LEFT JOIN activity_domains d ON d.id = a.domain_id WHERE a.plan_id = $1 ORDER BY a.end_on NULLS LAST, a.created_at`,
      [id],
    );
    // L'avancement d'une activité réalisée par des dossiers est la moyenne de leurs avancements (lot P3c)
    const dossiers = await this.dossiersOf(rows.map((a) => a.id));
    const activities = rows.map((a) => {
      const mine = dossiers
        .filter((d) => d.plan_activity_id === a.id)
        .map(({ plan_activity_id: _p, ...d }) => ({
          ...d,
          href: d.kind === "project" ? `/projects/${d.id}/dashboard` : `/activites/${d.id}`,
        }));
      return {
        ...a,
        dossiers: mine,
        progress_effective: mine.length
          ? Math.round(mine.reduce((s, d) => s + d.progress, 0) / mine.length)
          : a.progress,
      };
    });
    const revisions = await this.svc.db.query<{
      id: string;
      activity_id: string;
      field: string;
      old_value: string | null;
      new_value: string | null;
      reason: string;
      author_name: string | null;
      created_at: string;
    }>(
      `SELECT r.id, r.activity_id, r.field, r.old_value, r.new_value, r.reason, u.name AS author_name, r.created_at FROM plan_revisions r
       LEFT JOIN users u ON u.id = r.author_id JOIN plan_activities a ON a.id = r.activity_id WHERE a.plan_id = $1 ORDER BY r.created_at DESC`,
      [id],
    );
    const unit = await this.svc.db.one<{ name: string }>("SELECT name FROM org_units WHERE id = $1", [p.unit_id]);
    const prepare = await this.mayPrepare(actorId, p.org_id, p.unit_id, perms);
    // Les budgets restent à la direction, aux chefs de l'entité et à qui prépare ou approuve les plans (PT-6)
    const budgets =
      prepare ||
      perms.includes("pilotage.view") ||
      perms.includes("plans.approve") ||
      (await this.svc.heads(actorId, p.unit_id));
    return {
      ...p,
      unit_name: unit?.name ?? "",
      progress: weightedProgress(activities.map((a) => ({ progress: a.progress_effective, weight: a.weight }))) ?? 0,
      budgets_hidden: !budgets,
      activities: budgets
        ? activities
        : activities.map((a) => ({ ...a, budget_planned: null, budget_committed: null, budget_spent: null })),
      revisions,
      reviews: await new PlanReviews(this.svc).ofPlan(id),
      can: {
        edit: p.status === "draft" && prepare,
        submit: p.status === "draft" && prepare,
        approve: p.status === "submitted" && perms.includes("plans.approve") && p.submitted_by !== actorId,
        revise: p.status === "approved" && perms.includes("plans.approve"),
        review: p.status === "approved" && (await new PlanReviews(this.svc).canPrepare(actorId, id)),
      },
    };
  }

  // ---------------------------------------------------------------- campagne (PT-5)
  private async assertCampaign(actorId: string, orgId: string) {
    const p = await this.svc.permissionsOf(actorId, orgId);
    if (!["plans.manage_all", "plans.approve", "pilotage.view"].some((x) => p.includes(x as never)))
      throw forbidden("La campagne des plans revient au service du plan et à la direction");
    return p;
  }
  /** Les entités qui n'ont pas encore de plan pour l'année, avec leur chef. */
  async campaign(actorId: string, orgId: string, year: number) {
    await this.assertCampaign(actorId, orgId);
    const missing = await this.svc.db.query<{ unit_id: string; name: string; manager_id: string | null; manager_name: string | null }>(
      `SELECT u.id AS unit_id, u.name, u.manager_id, m.name AS manager_name FROM org_units u LEFT JOIN users m ON m.id = u.manager_id
        WHERE u.org_id = $1 AND u.parent_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM work_plans w WHERE w.unit_id = u.id AND w.year = $2)
        ORDER BY u.position, u.name`,
      [orgId, year],
    );
    const total = (await this.svc.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM org_units WHERE org_id = $1 AND parent_id IS NOT NULL",
      [orgId],
    ))!.n;
    return { year, total, missing };
  }
  /** Rappel aux chefs des entités sans plan : préparer le plan de l'année. */
  async remindCampaign(actorId: string, orgId: string, year: number) {
    const p = await this.assertCampaign(actorId, orgId);
    if (!p.includes("plans.manage_all") && !p.includes("plans.approve"))
      throw forbidden("Le rappel de campagne revient au service du plan");
    const { missing } = await this.campaign(actorId, orgId, year);
    let sent = 0;
    for (const u of missing)
      if (u.manager_id && u.manager_id !== actorId) {
        await this.svc.notify(u.manager_id, orgId, {
          kind: "plan.campaign",
          title: `Plan de travail ${year} à préparer : ${u.name}`,
          body: "La campagne de préparation des plans est ouverte : préparez le plan de votre entité et soumettez-le.",
          actor_id: actorId,
          link: "/plans",
        });
        sent++;
      }
    await this.svc.log(actorId, "plan.campaign", { orgId, data: { year, sent } });
    return { sent };
  }

  async create(actorId: string, orgId: string, i: { unit_id: string; year: number; title: string }) {
    await this.svc.requirePerm(actorId, orgId, "plans.manage");
    if (!(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [orgId, i.unit_id])))
      throw badRequest("Entité inconnue");
    await this.assertPrepare(actorId, orgId, i.unit_id);
    const id = uid("pln");
    try {
      await this.svc.db.query(
        "INSERT INTO work_plans (id, org_id, unit_id, year, title, created_by) VALUES ($1,$2,$3,$4,$5,$6)",
        [id, orgId, i.unit_id, i.year, i.title.trim(), actorId],
      );
    } catch (e) {
      if ((e as { code?: string }).code === "23505")
        throw new HttpError(409, "Cette entité a déjà un plan pour cette année");
      throw e;
    }
    await this.svc.log(actorId, "plan.created", { orgId, data: { id } });
    return this.get(actorId, id);
  }

  async remove(actorId: string, id: string) {
    const p = await this.row(id);
    await this.assertPrepare(actorId, p.org_id, p.unit_id);
    if (p.status !== "draft") throw frozen();
    await this.svc.db.query("DELETE FROM work_plans WHERE id = $1", [id]);
    await this.svc.log(actorId, "plan.deleted", { orgId: p.org_id, data: { id, title: p.title } });
  }

  private async assertActivity(p: Plan, i: ActivityInput) {
    for (const d of [i.start_on, i.end_on]) if (d && !isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    if (i.start_on && i.end_on && i.end_on < i.start_on) throw badRequest("La fin précède le début");
    if (i.responsible_id && !(await this.svc.orgRole(i.responsible_id, p.org_id)))
      throw badRequest("Le responsable doit être membre de l'organisation");
    if (
      i.domain_id &&
      !(await this.svc.db.one("SELECT 1 FROM activity_domains WHERE org_id = $1 AND id = $2", [p.org_id, i.domain_id]))
    )
      throw badRequest("Domaine inconnu du catalogue");
    if (
      i.parent_id &&
      !(await this.svc.db.one("SELECT 1 FROM plan_activities WHERE org_id = $1 AND id = $2", [p.org_id, i.parent_id]))
    )
      throw badRequest("Activité de rattachement inconnue");
  }

  async addActivity(actorId: string, planId: string, i: ActivityInput & { title: string }) {
    const p = await this.row(planId);
    await this.assertPrepare(actorId, p.org_id, p.unit_id);
    if (p.status !== "draft") throw frozen();
    await this.assertActivity(p, i);
    await this.svc.db.query(
      `INSERT INTO plan_activities (id, org_id, plan_id, parent_id, domain_id, title, responsible_id, objective, target_value, unit_label, start_on, end_on, budget_planned, weight)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        uid("pac"),
        p.org_id,
        planId,
        i.parent_id ?? null,
        i.domain_id ?? null,
        i.title.trim(),
        i.responsible_id ?? null,
        i.objective ?? "",
        i.target_value ?? null,
        i.unit_label ?? "",
        i.start_on ?? null,
        i.end_on ?? null,
        i.budget_planned ?? null,
        i.weight ?? 1,
      ],
    );
    return this.get(actorId, planId);
  }

  async updateActivity(actorId: string, id: string, i: ActivityInput) {
    const a = await this.activity(id);
    const p = await this.row(a.plan_id);
    await this.assertPrepare(actorId, p.org_id, p.unit_id);
    if (p.status !== "draft") throw frozen();
    await this.assertActivity(p, i);
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const k of EDITABLE) {
      if (i[k] === undefined) continue;
      vals.push(i[k]);
      sets.push(`${k} = $${vals.length}`);
    }
    if (sets.length) {
      vals.push(id);
      await this.svc.db.query(`UPDATE plan_activities SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    }
    return this.get(actorId, a.plan_id);
  }

  async removeActivity(actorId: string, id: string) {
    const a = await this.activity(id);
    const p = await this.row(a.plan_id);
    await this.assertPrepare(actorId, p.org_id, p.unit_id);
    if (p.status !== "draft") throw frozen();
    await this.svc.db.query("DELETE FROM plan_activities WHERE id = $1", [id]);
    return this.get(actorId, a.plan_id);
  }

  /** Responsable unique, objectif chiffré, date de fin : un plan incomplet ne part pas en validation. */
  async submit(actorId: string, id: string) {
    const p = await this.row(id);
    await this.assertPrepare(actorId, p.org_id, p.unit_id);
    if (p.status !== "draft") throw frozen();
    const rows = await this.svc.db.query<PlanActivity>(
      `SELECT ${SELECT_ACTIVITY} FROM plan_activities a WHERE a.plan_id = $1`,
      [id],
    );
    if (!rows.length) throw badRequest("Le plan doit comporter au moins une activité");
    // La date de début fonde l'avancement attendu à date du tableau de bord (PT-4)
    const missing = rows.filter((a) => !a.responsible_id || !a.start_on || !a.end_on || a.target_value === null);
    if (missing.length)
      throw badRequest(
        `Responsable, cible, dates de début et de fin manquent pour : ${missing.map((a) => a.title).join(", ")}`,
      );
    await this.svc.db.query(
      "UPDATE work_plans SET status = 'submitted', submitted_by = $1, submitted_at = now(), return_comment = '' WHERE id = $2",
      [actorId, id],
    );
    await this.svc.log(actorId, "plan.submitted", { orgId: p.org_id, data: { id } });
    // Ceux qui peuvent approuver en sont prévenus ; l'auteur de la soumission, qui ne peut pas approuver, ne l'est pas
    for (const u of await this.svc.usersOf(p.org_id)) {
      if (u.is_ai || u.id === actorId) continue;
      if (!(await this.svc.permissionsOf(u.id, p.org_id)).includes("plans.approve")) continue;
      await this.svc.notify(u.id, p.org_id, {
        kind: "plan.submitted",
        title: `Plan à approuver : ${p.title}`,
        body: "Le plan de travail attend votre approbation ou ses corrections.",
      });
    }
    return this.get(actorId, id);
  }

  async returnPlan(actorId: string, id: string, comment: string) {
    const p = await this.row(id);
    await this.svc.requirePerm(actorId, p.org_id, "plans.approve");
    if (p.status !== "submitted") throw badRequest("Ce plan n'est pas en attente d'approbation");
    await this.svc.db.query("UPDATE work_plans SET status = 'draft', return_comment = $1 WHERE id = $2", [
      comment.trim(),
      id,
    ]);
    if (p.submitted_by)
      await this.svc.notify(p.submitted_by, p.org_id, {
        kind: "plan.returned",
        title: `Plan à corriger : ${p.title}`,
        body: comment.trim(),
      });
    await this.svc.log(actorId, "plan.returned", { orgId: p.org_id, data: { id, comment } });
    return this.get(actorId, id);
  }

  /** L'approbation fige la version de référence : prévu d'origine conservé pour toujours. */
  async approve(actorId: string, id: string) {
    const p = await this.row(id);
    await this.svc.requirePerm(actorId, p.org_id, "plans.approve");
    if (p.status !== "submitted") throw badRequest("Ce plan n'est pas en attente d'approbation");
    if (p.submitted_by === actorId) throw forbidden("Celui qui soumet un plan ne peut pas l'approuver lui-même");
    await this.svc.db.tx(async (q) => {
      await q.query(
        `UPDATE plan_activities SET baseline = jsonb_build_object('start_on', start_on, 'end_on', end_on, 'target_value', target_value, 'budget_planned', budget_planned, 'responsible_id', responsible_id) WHERE plan_id = $1`,
        [id],
      );
      await q.query("UPDATE work_plans SET status = 'approved', approved_by = $1, approved_at = now() WHERE id = $2", [
        actorId,
        id,
      ]);
    });
    await this.svc.log(actorId, "plan.approved", { orgId: p.org_id, data: { id } });
    return this.get(actorId, id);
  }

  async updateProgress(
    actorId: string,
    id: string,
    i: {
      progress?: number;
      actual_value?: number | null;
      budget_committed?: number | null;
      budget_spent?: number | null;
    },
  ) {
    const a = await this.activity(id);
    const p = await this.row(a.plan_id);
    if (a.responsible_id !== actorId) await this.assertPrepare(actorId, a.org_id, p.unit_id);
    else await this.svc.requirePerm(actorId, a.org_id, "plans.view");
    if (p.status !== "approved") throw badRequest("Le suivi commence une fois le plan approuvé");
    // L'avancement d'une activité réalisée par des dossiers remonte de ces dossiers : il ne se saisit plus à la main
    if (i.progress !== undefined && (await this.dossiersOf([id])).length)
      throw badRequest(
        "L'avancement de cette activité remonte de ses dossiers (projets, activités) : il ne se saisit plus à la main",
      );
    await this.svc.db.query(
      "UPDATE plan_activities SET progress = COALESCE($1, progress), actual_value = COALESCE($2, actual_value), budget_committed = COALESCE($3, budget_committed), budget_spent = COALESCE($4, budget_spent) WHERE id = $5",
      [i.progress ?? null, i.actual_value ?? null, i.budget_committed ?? null, i.budget_spent ?? null, id],
    );
    return this.get(actorId, a.plan_id);
  }

  /** Après approbation, chaque changement garde l'ancien, le nouveau, la raison et son auteur. */
  async revise(actorId: string, id: string, changes: ActivityInput, reason: string) {
    const a = await this.activity(id);
    const p = await this.row(a.plan_id);
    await this.svc.requirePerm(actorId, p.org_id, "plans.approve");
    if (p.status !== "approved") throw badRequest("Seul un plan approuvé se révise");
    await this.assertActivity(p, changes);
    await this.svc.db.tx(async (q) => {
      for (const k of REVISABLE) {
        const v = changes[k];
        if (v === undefined || String(v) === String(a[k])) continue;
        await q.query(
          "INSERT INTO plan_revisions (id, org_id, activity_id, field, old_value, new_value, reason, author_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            uid("rev"),
            p.org_id,
            id,
            k,
            a[k] === null ? null : String(a[k]),
            v === null ? null : String(v),
            reason.trim(),
            actorId,
          ],
        );
        await q.query(`UPDATE plan_activities SET ${k} = $1 WHERE id = $2`, [v, id]);
      }
    });
    await this.svc.log(actorId, "plan.revised", { orgId: p.org_id, data: { activity: id, reason } });
    return this.get(actorId, a.plan_id);
  }
}
