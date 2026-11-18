import type { Queryable } from "./db.js";

/*
 * Règles de calcul uniques (thème 4 de l'analyse) : chaque chiffre affiché par plusieurs pages se calcule ici, une
 * seule fois. Une page qui compte autrement contredit les autres.
 */

/** La règle des retards, écrite en clair : elle accompagne les chiffres pour que chacun sache ce qui est compté. */
export const LATE_RULE =
  "Une tâche est en retard quand c'est une tâche principale (pas une sous-tâche), confiée à une personne, non terminée, dont l'échéance est passée, dans un dossier non archivé.";

/** Tâches ouvertes et en retard, par personne chargée, selon la règle unique. */
export function lateTasksByAssignee(db: Queryable, orgId: string, today: string) {
  return db.query<{ user_id: string; open: number; overdue: number }>(
    `SELECT t.assignee_id AS user_id, count(*)::int AS open, count(*) FILTER (WHERE t.due_on < $2::date)::int AS overdue
       FROM tasks t JOIN projects p ON p.id = t.project_id
      WHERE p.org_id = $1 AND NOT t.completed AND t.assignee_id IS NOT NULL AND t.parent_id IS NULL AND NOT p.archived
      GROUP BY t.assignee_id`,
    [orgId, today],
  );
}

/** Une décision est attendue de la DG sur un dossier quand il est marqué « décision attendue » ou qu'un arbitrage y attend. */
export const awaitsDecision = (d: { decision_needed?: string | null; arbitration?: unknown }) =>
  !!d.decision_needed?.trim() || !!d.arbitration;

/** Avancement d'un ensemble d'activités : moyenne pondérée par le poids de chacune (1 par défaut). */
export const weightedProgress = (rows: { progress: number; weight?: number | null }[]) => {
  const total = rows.reduce((s, r) => s + (r.weight ?? 1), 0);
  return total ? Math.round(rows.reduce((s, r) => s + r.progress * (r.weight ?? 1), 0) / total) : null;
};

/** Sources dont l'outil connaît la valeur : un indicateur qui y est relié se calcule seul (RI-4). */
export const INDICATOR_SOURCES = {
  plans_approved: "Plans de travail approuvés de l'année",
  recommendations_done: "Recommandations de réunion réalisées",
  decisions_executed: "Décisions de la DG exécutées dans l'année",
  agreements_in_force: "Accords de partenariat en vigueur",
} as const;
export type IndicatorSource = keyof typeof INDICATOR_SOURCES;

/** La valeur de chaque source, pour l'année en cours. */
export async function indicatorValues(db: Queryable, orgId: string, today: string) {
  const year = Number(today.slice(0, 4));
  const r = (
    await db.query<Record<IndicatorSource, number>>(
      `SELECT
        (SELECT count(*)::int FROM work_plans WHERE org_id = $1 AND status = 'approved' AND year = $2) AS plans_approved,
        (SELECT count(*)::int FROM meeting_actions WHERE org_id = $1 AND status = 'realise') AS recommendations_done,
        (SELECT count(*)::int FROM dg_decisions WHERE org_id = $1 AND status = 'executee' AND year = $2) AS decisions_executed,
        (SELECT count(*)::int FROM agreements WHERE org_id = $1 AND state = 'vigueur') AS agreements_in_force`,
      [orgId, year],
    )
  )[0];
  return r;
}

/** Remplace le résultat saisi par la valeur calculée quand l'indicateur est relié à une source de l'outil. */
export async function withComputed<T extends { computed_from?: string | null; result: number }>(
  db: Queryable,
  orgId: string,
  today: string,
  rows: T[],
) {
  const values = rows.some((x) => x.computed_from) ? await indicatorValues(db, orgId, today) : null;
  return rows.map((x) => ({
    ...x,
    computed: !!x.computed_from,
    result: x.computed_from && values ? Number(values[x.computed_from as IndicatorSource] ?? 0) : x.result,
  }));
}
