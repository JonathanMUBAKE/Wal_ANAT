import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { uid } from "./db.js";
import { expectedProgress } from "./pilotage-directions.js";
import { HttpError, badRequest, forbidden, notFound, today, type Services } from "./services.js";

/*
 * Revue trimestrielle du plan de travail (pilotage stratégique).
 *
 * Chaque trimestre, l'entité rend compte de son plan approuvé. À l'ouverture, la revue relève pour chaque activité
 * l'avancement constaté (celui des dossiers qui la réalisent, sinon celui déclaré) et l'avancement attendu à la fin du
 * trimestre (ou à la date du jour si le trimestre court encore), au prorata du calendrier ; une appréciation est
 * proposée (atteint, en bonne voie, en retard, compromis). L'entité la corrige, explique chaque retard et propose une
 * mesure, et rédige une synthèse. Elle soumet ; la direction générale (plans.approve) valide ou retourne avec un
 * motif — jamais celui qui a soumis. Validée, la revue est figée.
 *
 * Préparent : le service du plan (plans.manage) et le chef de l'entité du plan. Lisent : plans.view et ceux qui
 * préparent. Toute étape est journalisée et prévient les intéressés.
 */

export const ASSESSMENTS = ["atteint", "en_bonne_voie", "en_retard", "compromis"] as const;
type Assessment = (typeof ASSESSMENTS)[number];
const LABEL: Record<Assessment, string> = {
  atteint: "atteint",
  en_bonne_voie: "en bonne voie",
  en_retard: "en retard",
  compromis: "compromis",
};

interface Review {
  id: string;
  org_id: string;
  plan_id: string;
  quarter: number;
  period_end: string;
  status: "brouillon" | "soumise" | "retournee" | "validee";
  summary: string;
  difficulties: string;
  measures: string;
  return_comment: string;
  validation_comment: string;
  created_by: string | null;
  submitted_by: string | null;
  validated_by: string | null;
}
interface PlanRef {
  id: string;
  org_id: string;
  unit_id: string;
  year: number;
  title: string;
  status: string;
  unit_name: string;
}

const Open = z.object({ quarter: z.number().int() });
const Patch = z.object({
  summary: z.string().trim().max(10_000).optional(),
  difficulties: z.string().trim().max(10_000).optional(),
  measures: z.string().trim().max(10_000).optional(),
  lines: z
    .array(
      z.object({
        activity_id: z.string().max(100),
        assessment: z.enum(ASSESSMENTS).optional(),
        comment: z.string().trim().max(5000).optional(),
        measure: z.string().trim().max(5000).optional(),
      }),
    )
    .max(500)
    .optional(),
});
const Comment = z.object({ comment: z.string().trim().max(5000).optional() });

const quarterEnd = (year: number, q: number) =>
  ["", `${year}-03-31`, `${year}-06-30`, `${year}-09-30`, `${year}-12-31`][q];
/** L'appréciation proposée d'après les chiffres ; l'entité la corrige. */
export const proposedAssessment = (progress: number, expected: number | null): Assessment =>
  progress >= 100
    ? "atteint"
    : expected === null || expected - progress < 15
      ? "en_bonne_voie"
      : expected - progress >= 40
        ? "compromis"
        : "en_retard";
const frozen = () => new HttpError(409, "Cette revue a été soumise ou validée : elle ne se modifie plus");

export class PlanReviews {
  constructor(private svc: Services) {}

  private async plan(id: string) {
    const p = await this.svc.db.one<PlanRef>(
      "SELECT p.id, p.org_id, p.unit_id, p.year, p.title, p.status, ou.name AS unit_name FROM work_plans p JOIN org_units ou ON ou.id = p.unit_id WHERE p.id = $1",
      [id],
    );
    if (!p) throw notFound("Plan introuvable");
    return p;
  }
  private async row(orgId: string, id: string) {
    const r = await this.svc.db.one<Review>(
      `SELECT r.*, to_char(r.period_end, 'YYYY-MM-DD') AS period_end FROM plan_reviews r WHERE r.org_id = $1 AND r.id = $2`,
      [orgId, id],
    );
    if (!r) throw notFound("Revue introuvable");
    return r;
  }
  /** Le chef de l'entité du plan (ou d'une entité au-dessus). */
  private async heads(actorId: string, unitId: string) {
    return !!(await this.svc.db.one(
      `WITH RECURSIVE up(id, manager_id, parent_id) AS (
         SELECT id, manager_id, parent_id FROM org_units WHERE id = $1
         UNION SELECT p.id, p.manager_id, p.parent_id FROM org_units p JOIN up ON p.id = up.parent_id
       ) SELECT 1 FROM up WHERE manager_id = $2`,
      [unitId, actorId],
    ));
  }
  private async rights(actorId: string, p: PlanRef) {
    const perms = await this.svc.permissionsOf(actorId, p.org_id);
    const prepare = perms.includes("plans.manage") || (await this.heads(actorId, p.unit_id));
    return { prepare, read: prepare || perms.includes("plans.view"), approve: perms.includes("plans.approve") };
  }

  /** Peut-il préparer les revues de ce plan ? (pour la fiche du plan) */
  async canPrepare(actorId: string, planId: string) {
    return (await this.rights(actorId, await this.plan(planId))).prepare;
  }

  /** Les revues d'un plan (pour sa fiche). */
  async ofPlan(planId: string) {
    return this.svc.db.query<{ id: string; quarter: number; status: string; period_end: string }>(
      "SELECT id, quarter, status, to_char(period_end, 'YYYY-MM-DD') AS period_end FROM plan_reviews WHERE plan_id = $1 ORDER BY quarter",
      [planId],
    );
  }

  async get(actorId: string, orgId: string, id: string) {
    const r = await this.row(orgId, id);
    const p = await this.plan(r.plan_id);
    const can = await this.rights(actorId, p);
    if (!can.read) throw forbidden("Cette revue ne vous est pas ouverte");
    const lines = await this.svc.db.query(
      `SELECT l.activity_id, l.title, l.progress, l.expected, l.assessment, l.comment, l.measure, u.name AS responsible_name,
              to_char(a.end_on, 'YYYY-MM-DD') AS end_on
         FROM plan_review_lines l JOIN plan_activities a ON a.id = l.activity_id LEFT JOIN users u ON u.id = a.responsible_id
        WHERE l.review_id = $1 ORDER BY a.end_on NULLS LAST, l.title`,
      [id],
    );
    const names = await this.svc.db.query<{ id: string; name: string }>(
      "SELECT id, name FROM users WHERE id = ANY($1)",
      [[r.submitted_by, r.validated_by, r.created_by].filter(Boolean)],
    );
    const name = (u: string | null) => names.find((n) => n.id === u)?.name ?? null;
    const editable = r.status === "brouillon" || r.status === "retournee";
    return {
      ...r,
      plan: { id: p.id, title: p.title, year: p.year, unit_name: p.unit_name },
      submitted_by_name: name(r.submitted_by),
      validated_by_name: name(r.validated_by),
      lines,
      can: {
        edit: editable && can.prepare,
        submit: editable && can.prepare,
        decide: r.status === "soumise" && can.approve && r.submitted_by !== actorId,
      },
    };
  }

  async open(actorId: string, planId: string, input: z.infer<typeof Open>) {
    const p = await this.plan(planId);
    if (!(await this.rights(actorId, p)).prepare)
      throw forbidden("Seuls le service du plan et le chef de l'entité préparent la revue");
    if (input.quarter < 1 || input.quarter > 4) throw badRequest("Le trimestre va de 1 à 4");
    if (p.status !== "approved") throw badRequest("La revue porte sur un plan approuvé");
    if (
      await this.svc.db.one("SELECT 1 FROM plan_reviews WHERE plan_id = $1 AND quarter = $2", [planId, input.quarter])
    )
      throw new HttpError(409, `La revue du trimestre ${input.quarter} existe déjà`);
    const periodEnd = quarterEnd(p.year, input.quarter);
    const at = today() < periodEnd ? today() : periodEnd;
    const acts = await this.svc.db.query<{
      id: string;
      title: string;
      progress: number;
      start_on: string;
      end_on: string | null;
    }>(
      `SELECT a.id, a.title, COALESCE(eff.progress, a.progress)::int AS progress,
              to_char(COALESCE(a.start_on, make_date($2::int, 1, 1)), 'YYYY-MM-DD') AS start_on,
              to_char(a.end_on, 'YYYY-MM-DD') AS end_on
         FROM plan_activities a
         LEFT JOIN LATERAL (
           SELECT round(avg(x.progress))::int AS progress FROM (
             SELECT CASE WHEN count(t.id) > 0 THEN 100.0 * count(t.id) FILTER (WHERE t.completed) / count(t.id) ELSE 0 END AS progress
               FROM projects pj LEFT JOIN tasks t ON t.project_id = pj.id AND t.parent_id IS NULL
              WHERE pj.plan_activity_id = a.id GROUP BY pj.id
             UNION ALL
             SELECT aa.progress::numeric FROM agency_activities aa WHERE aa.plan_activity_id = a.id
           ) x
         ) eff ON TRUE
        WHERE a.plan_id = $1 ORDER BY a.end_on NULLS LAST, a.title`,
      [planId, p.year],
    );
    const id = uid("rvw");
    await this.svc.db.tx(async (q) => {
      await q.query(
        "INSERT INTO plan_reviews (id, org_id, plan_id, quarter, period_end, created_by) VALUES ($1,$2,$3,$4,$5,$6)",
        [id, p.org_id, planId, input.quarter, periodEnd, actorId],
      );
      for (const a of acts) {
        // L'attendu ne dépasse jamais la fin de l'activité : une activité échue est attendue à 100 %
        const expected = expectedProgress(a.start_on, a.end_on, at);
        await q.query(
          `INSERT INTO plan_review_lines (id, org_id, review_id, activity_id, title, progress, expected, assessment)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [uid("rvl"), p.org_id, id, a.id, a.title, a.progress, expected, proposedAssessment(a.progress, expected)],
        );
      }
    });
    await this.svc.log(actorId, "plan.review.opened", {
      orgId: p.org_id,
      data: { review_id: id, plan_id: planId, quarter: input.quarter },
    });
    return this.get(actorId, p.org_id, id);
  }

  async update(actorId: string, orgId: string, id: string, input: z.infer<typeof Patch>) {
    const r = await this.row(orgId, id);
    const p = await this.plan(r.plan_id);
    if (!(await this.rights(actorId, p)).prepare)
      throw forbidden("Seuls le service du plan et le chef de l'entité préparent la revue");
    if (r.status !== "brouillon" && r.status !== "retournee") throw frozen();
    await this.svc.db.tx(async (q) => {
      await q.query(
        `UPDATE plan_reviews SET summary = COALESCE($3, summary), difficulties = COALESCE($4, difficulties),
           measures = COALESCE($5, measures), updated_at = now() WHERE org_id = $1 AND id = $2`,
        [orgId, id, input.summary ?? null, input.difficulties ?? null, input.measures ?? null],
      );
      for (const l of input.lines ?? []) {
        const done = await q.query(
          `UPDATE plan_review_lines SET assessment = COALESCE($3, assessment), comment = COALESCE($4, comment),
             measure = COALESCE($5, measure) WHERE review_id = $1 AND activity_id = $2 RETURNING id`,
          [id, l.activity_id, l.assessment ?? null, l.comment ?? null, l.measure ?? null],
        );
        if (!done.length) throw badRequest("Cette activité n'appartient pas à la revue");
      }
    });
    await this.svc.log(actorId, "plan.review.updated", { orgId, data: { review_id: id } });
    return this.get(actorId, orgId, id);
  }

  async submit(actorId: string, orgId: string, id: string) {
    const r = await this.row(orgId, id);
    const p = await this.plan(r.plan_id);
    if (!(await this.rights(actorId, p)).prepare)
      throw forbidden("Seuls le service du plan et le chef de l'entité soumettent la revue");
    if (r.status !== "brouillon" && r.status !== "retournee") throw frozen();
    if (!r.summary.trim()) throw badRequest("Rédigez la synthèse du trimestre avant de soumettre la revue");
    // Un retard ou une activité compromise s'explique : cause et mesure corrective
    const gaps = await this.svc.db.query<{ title: string }>(
      `SELECT title FROM plan_review_lines WHERE review_id = $1 AND assessment IN ('en_retard', 'compromis')
         AND (btrim(comment) = '' OR btrim(measure) = '') ORDER BY title`,
      [id],
    );
    if (gaps.length)
      throw badRequest(
        `Indiquez la cause de l'écart et la mesure corrective pour : ${gaps.map((g) => g.title).join(", ")}`,
      );
    await this.svc.db.query(
      "UPDATE plan_reviews SET status = 'soumise', submitted_by = $3, submitted_at = now(), updated_at = now() WHERE org_id = $1 AND id = $2",
      [orgId, id, actorId],
    );
    await this.svc.log(actorId, "plan.review.submitted", { orgId, data: { review_id: id, plan_id: p.id } });
    for (const u of await this.svc.usersOf(orgId)) {
      if (u.is_ai || u.id === actorId) continue;
      if (!(await this.svc.permissionsOf(u.id, orgId)).includes("plans.approve")) continue;
      await this.svc.notify(u.id, orgId, {
        kind: "plan.review.submitted",
        title: `Revue du T${r.quarter} ${p.year} à valider : ${p.unit_name}`,
        body: "La revue trimestrielle du plan de travail attend votre validation.",
        actor_id: actorId,
        link: `/plans/${p.id}?revue=${id}`,
      });
    }
    return this.get(actorId, orgId, id);
  }

  private async decide(actorId: string, orgId: string, id: string, approve: boolean, comment?: string) {
    const r = await this.row(orgId, id);
    const p = await this.plan(r.plan_id);
    await this.svc.requirePerm(actorId, orgId, "plans.approve");
    if (r.status !== "soumise") throw badRequest("Cette revue n'attend pas de validation");
    if (r.submitted_by === actorId) throw forbidden("Celui qui soumet une revue ne peut pas la valider lui-même");
    if (!approve && !comment) throw badRequest("Indiquez ce qui est à reprendre");
    await this.svc.db.query(
      approve
        ? "UPDATE plan_reviews SET status = 'validee', validated_by = $3, validated_at = now(), validation_comment = $4, updated_at = now() WHERE org_id = $1 AND id = $2"
        : "UPDATE plan_reviews SET status = 'retournee', return_comment = $4, updated_at = now(), validated_by = NULL WHERE org_id = $1 AND id = $2 AND $3::text IS NOT NULL",
      [orgId, id, actorId, comment ?? ""],
    );
    await this.svc.log(actorId, approve ? "plan.review.validated" : "plan.review.returned", {
      orgId,
      data: { review_id: id, plan_id: p.id, comment: comment ?? "" },
    });
    if (r.submitted_by)
      await this.svc.notify(r.submitted_by, orgId, {
        kind: approve ? "plan.review.validated" : "plan.review.returned",
        title: approve
          ? `Revue du T${r.quarter} ${p.year} validée : ${p.unit_name}`
          : `Revue du T${r.quarter} ${p.year} à reprendre : ${p.unit_name}`,
        body: comment || undefined,
        actor_id: actorId,
        link: `/plans/${p.id}?revue=${id}`,
      });
    return this.get(actorId, orgId, id);
  }
  validate = (a: string, o: string, id: string, c?: string) => this.decide(a, o, id, true, c);
  returnReview = (a: string, o: string, id: string, c?: string) => this.decide(a, o, id, false, c);
}

type Id = { Params: { id: string } };
export function planReviewRoutes(r: FastifyInstance, rv: PlanReviews) {
  r.post<Id>("/api/plans/:id/reviews", async (req) => rv.open(req.userId, req.params.id, Open.parse(req.body)));
  r.get<Id>("/api/plan-reviews/:id", async (req) => rv.get(req.userId, req.orgId, req.params.id));
  r.patch<Id>("/api/plan-reviews/:id", async (req) =>
    rv.update(req.userId, req.orgId, req.params.id, Patch.parse(req.body ?? {})),
  );
  r.post<Id>("/api/plan-reviews/:id/submit", async (req) => rv.submit(req.userId, req.orgId, req.params.id));
  r.post<Id>("/api/plan-reviews/:id/validate", async (req) =>
    rv.validate(req.userId, req.orgId, req.params.id, Comment.parse(req.body ?? {}).comment),
  );
  r.post<Id>("/api/plan-reviews/:id/return", async (req) =>
    rv.returnReview(req.userId, req.orgId, req.params.id, Comment.parse(req.body ?? {}).comment),
  );
}
