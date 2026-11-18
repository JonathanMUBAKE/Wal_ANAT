import { assessProjects } from "./portfolio.js";
import type { FastifyInstance } from "fastify";
import { notFound, today, type Services } from "./services.js";
import { lateTasksByAssignee, weightedProgress } from "./rules.js";

/*
 * Tableau de bord DG — vue par direction.
 *
 * Une direction est une entité du premier niveau sous l'institution ; elle porte tout ce qui lui est rattaché : ses
 * services (toute la descendance), leurs agents, les projets qui leur sont rattachés (à défaut, le projet suit
 * l'entité de son responsable), le plan de travail de chacune de ses entités, le courrier qui leur est imputé, les
 * décisions et recommandations confiées à ses agents.
 *
 * Pour chaque périmètre : projets et leur santé ; tâches ouvertes et en retard de ses agents ; avancement du plan
 * comparé à l'avancement attendu à date (au prorata du calendrier de chaque activité) ; décisions à exécuter ;
 * courrier à traiter ; recommandations en retard. Une appréciation en découle, avec ses raisons écrites :
 * « sous contrôle », « vigilance » ou « alerte ». Le détail descend d'une direction à ses services et à leurs
 * dossiers. Les éléments confidentiels ne sont ni comptés ni montrés ; les projets ne sont listés qu'à ceux qui y
 * ont accès. Réservé aux profils de pilotage (pilotage.view).
 */

type Health = "on_track" | "at_risk" | "off_track" | "done";
interface Unit {
  id: string;
  parent_id: string | null;
  name: string;
  kind: string;
  manager_id: string | null;
  manager_name: string | null;
  position: number;
}
interface Counts {
  open: number;
  overdue: number;
}
export interface Stats {
  agents: number;
  projects: { total: number; on_track: number; at_risk: number; off_track: number; done: number };
  tasks: Counts;
  decisions: { open: number; late: number };
  mail: { open: number; late: number };
  recommendations: { open: number; late: number };
  plan: { activities: number; progress: number | null; expected: number | null; behind: number; late: number };
  assessment: "sous_controle" | "vigilance" | "alerte";
  alerts: string[];
}
interface PlanRow {
  id: string;
  unit_id: string;
  title: string;
  progress: number;
  start_on: string | null;
  end_on: string | null;
  responsible_name: string | null;
  weight: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
/** L'avancement attendu à date, au prorata du calendrier de l'activité. */
export const expectedProgress = (start: string | null, end: string | null, now: string) => {
  if (!end) return null;
  if (now >= end) return 100;
  if (!start || now <= start) return 0;
  const span = Date.parse(end) - Date.parse(start);
  return span > 0 ? Math.round((100 * (Date.parse(now) - Date.parse(start))) / span) : 100;
};
/** Une activité est en décalage quand elle accuse 15 points de retard sur son calendrier. */
const BEHIND = 15;

export class Directions {
  constructor(private svc: Services) {}

  /** Tout ce qu'il faut pour composer les photos de l'institution, en quelques requêtes. */
  private async load(actorId: string, orgId: string, headOf?: string) {
    // Sans le droit de pilotage, seul le chef lit la page de l'entité qu'il dirige (P-5)
    if (!headOf || !(await this.heads(actorId, orgId, headOf)))
      await this.svc.requirePerm(actorId, orgId, "pilotage.view");
    const db = this.svc.db;
    const now = today();
    const units = await db.query<Unit>(
      `SELECT u.id, u.parent_id, u.name, u.kind, u.manager_id, m.name AS manager_name, u.position
         FROM org_units u LEFT JOIN users m ON m.id = u.manager_id WHERE u.org_id = $1 ORDER BY u.position, u.name`,
      [orgId],
    );
    const members = await db.query<{ user_id: string; name: string; unit_id: string | null }>(
      `SELECT om.user_id, u.name, om.unit_id FROM org_members om JOIN users u ON u.id = om.user_id
        WHERE om.org_id = $1 AND NOT u.is_ai AND om.role <> 'guest' ORDER BY u.name`,
      [orgId],
    );
    // Règle unique des retards (thème 4) : la même que le compteur du tableau de bord
    const tasks = await lateTasksByAssignee(db, orgId, now);
    const decisions = await db.query<{
      id: string;
      title: string;
      owner_id: string;
      owner_name: string;
      due_on: string | null;
    }>(
      `SELECT d.id, d.title, d.owner_id, u.name AS owner_name, to_char(d.due_on, 'YYYY-MM-DD') AS due_on
         FROM dg_decisions d JOIN users u ON u.id = d.owner_id
        WHERE d.org_id = $1 AND d.status IN ('a_executer', 'en_cours') AND NOT d.confidential`,
      [orgId],
    );
    const mail = await db.query<{ id: string; subject: string; unit_id: string; due_on: string | null }>(
      `SELECT c.id, c.subject, c.unit_id, to_char(c.due_on, 'YYYY-MM-DD') AS due_on FROM correspondence c
        WHERE c.org_id = $1 AND c.direction = 'entrant' AND c.unit_id IS NOT NULL
          AND c.status NOT IN ('traite', 'classe') AND NOT c.confidential`,
      [orgId],
    );
    const recs = await db.query<{
      id: string;
      text: string;
      responsible_id: string;
      responsible_name: string;
      due_on: string | null;
      meeting_id: string;
    }>(
      `SELECT a.id, a.text, a.responsible_id, a.responsible_name, to_char(a.due_on, 'YYYY-MM-DD') AS due_on, a.meeting_id
         FROM meeting_actions a JOIN meetings m ON m.id = a.meeting_id
        WHERE a.org_id = $1 AND a.responsible_id IS NOT NULL AND a.status NOT IN ('realise', 'annule') AND NOT m.confidential`,
      [orgId],
    );
    // Avancement effectif d'une activité du plan : celui des dossiers qui la réalisent, sinon celui déclaré
    const plan = await db.query<PlanRow>(
      `SELECT a.id, p.unit_id, a.title, COALESCE(eff.progress, a.progress)::int AS progress, a.weight,
              to_char(COALESCE(a.start_on, make_date(p.year, 1, 1)), 'YYYY-MM-DD') AS start_on, to_char(a.end_on, 'YYYY-MM-DD') AS end_on,
              r.name AS responsible_name
         FROM plan_activities a JOIN work_plans p ON p.id = a.plan_id LEFT JOIN users r ON r.id = a.responsible_id
         LEFT JOIN LATERAL (
           SELECT round(avg(x.progress))::int AS progress FROM (
             SELECT CASE WHEN count(t.id) > 0 THEN 100.0 * count(t.id) FILTER (WHERE t.completed) / count(t.id) ELSE 0 END AS progress
               FROM projects pj LEFT JOIN tasks t ON t.project_id = pj.id AND t.parent_id IS NULL
              WHERE pj.plan_activity_id = a.id GROUP BY pj.id
             UNION ALL
             SELECT aa.progress::numeric FROM agency_activities aa WHERE aa.plan_activity_id = a.id
           ) x
         ) eff ON TRUE
        WHERE a.org_id = $1 AND p.status = 'approved' AND p.year = $2
        ORDER BY a.end_on NULLS LAST, a.title`,
      [orgId, Number(now.slice(0, 4))],
    );
    const unitOf = new Map(members.map((m) => [m.user_id, m.unit_id]));
    const listed = await this.svc.listProjects(actorId, orgId);
    // Une seule santé : celle calculée d'après les faits, comme dans la revue de portefeuille
    const assessed = new Map((await assessProjects(this.svc, listed, now)).map((r) => [r.id, r]));
    const projects = listed.map((p) => {
      const raw = p as unknown as { unit_id: string | null; lead_id: string | null; owner_id: string | null };
      const health = (assessed.get(p.id)?.health_computed ?? p.status) as Health;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        health,
        progress: p.task_count ? Math.round((100 * p.done_count) / p.task_count) : 0,
        overdue: p.overdue_count,
        due_on: p.due_on ?? null,
        lead_id: raw.lead_id ?? raw.owner_id ?? null,
        // Rattachement : l'entité du projet, sinon celle de son responsable
        unit_id: raw.unit_id ?? unitOf.get(raw.lead_id ?? raw.owner_id ?? "") ?? null,
      };
    });
    return { now, units, members, tasks, decisions, mail, recs, plan, projects };
  }

  private subtree(units: Unit[], id: string) {
    const out = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const u of units)
        if (u.parent_id && out.has(u.parent_id) && !out.has(u.id)) {
          out.add(u.id);
          grew = true;
        }
    }
    return out;
  }

  private stats(data: Awaited<ReturnType<Directions["load"]>>, scope: Set<string>, everyone = false): Stats {
    const { now } = data;
    // L'institution entière compte aussi les personnes sans entité : même total que le tableau de bord
    const people = new Set(
      data.members.filter((m) => everyone || (m.unit_id && scope.has(m.unit_id))).map((m) => m.user_id),
    );
    const projects = data.projects.filter((p) => p.unit_id && scope.has(p.unit_id));
    const health = { total: projects.length, on_track: 0, at_risk: 0, off_track: 0, done: 0 };
    for (const p of projects) health[p.health]++;
    const tasks = { open: 0, overdue: 0 };
    for (const t of data.tasks)
      if (people.has(t.user_id)) {
        tasks.open += t.open;
        tasks.overdue += t.overdue;
      }
    const late = (d: string | null) => !!d && d < now;
    const dec = data.decisions.filter((d) => people.has(d.owner_id));
    const mail = data.mail.filter((m) => scope.has(m.unit_id));
    const recs = data.recs.filter((r) => people.has(r.responsible_id));
    const plan = data.plan.filter((a) => scope.has(a.unit_id));
    const expected = plan.map((a) => expectedProgress(a.start_on, a.end_on, now)).filter((e) => e !== null);
    const s: Stats = {
      agents: people.size,
      projects: health,
      tasks,
      decisions: { open: dec.length, late: dec.filter((d) => late(d.due_on)).length },
      mail: { open: mail.length, late: mail.filter((m) => late(m.due_on)).length },
      recommendations: { open: recs.length, late: recs.filter((r) => late(r.due_on)).length },
      plan: {
        activities: plan.length,
        // Avancement pondéré par le poids de chaque activité (PT-3)
        progress: weightedProgress(plan),
        expected: expected.length ? Math.round(expected.reduce((x, e) => x + e, 0) / expected.length) : null,
        behind: plan.filter((a) => {
          const e = expectedProgress(a.start_on, a.end_on, now);
          return e !== null && a.progress < 100 && e - a.progress >= BEHIND;
        }).length,
        late: plan.filter((a) => a.progress < 100 && late(a.end_on)).length,
      },
      assessment: "sous_controle",
      alerts: [],
    };
    // L'appréciation et ses raisons, écrites : la couleur seule ne dit rien
    const alert: string[] = [];
    const watch: string[] = [];
    if (s.projects.off_track)
      alert.push(`${plural(s.projects.off_track, "projet en difficulté", "projets en difficulté")}`);
    if (s.plan.late)
      alert.push(`${plural(s.plan.late, "activité du plan échue", "activités du plan échues")} non achevée(s)`);
    if (s.tasks.overdue >= 3 && s.tasks.overdue / Math.max(1, s.tasks.open) >= 0.3)
      alert.push(`${s.tasks.overdue} tâches en retard sur ${s.tasks.open} ouvertes`);
    else if (s.tasks.overdue) watch.push(plural(s.tasks.overdue, "tâche en retard", "tâches en retard"));
    if (s.decisions.late)
      alert.push(plural(s.decisions.late, "décision en retard d'exécution", "décisions en retard d'exécution"));
    if (s.plan.behind)
      watch.push(`${plural(s.plan.behind, "activité du plan", "activités du plan")} en décalage sur le calendrier`);
    if (s.projects.at_risk) watch.push(plural(s.projects.at_risk, "projet à surveiller", "projets à surveiller"));
    if (s.mail.late) watch.push(plural(s.mail.late, "courrier hors délai", "courriers hors délai"));
    if (s.recommendations.late)
      watch.push(plural(s.recommendations.late, "recommandation en retard", "recommandations en retard"));
    s.assessment = alert.length ? "alerte" : watch.length ? "vigilance" : "sous_controle";
    s.alerts = [...alert, ...watch];
    return s;
  }

  /** Les directions de l'institution et la photo de chacune. */
  async list(actorId: string, orgId: string) {
    const data = await this.load(actorId, orgId);
    const roots = new Set(data.units.filter((u) => !u.parent_id).map((u) => u.id));
    const directions = data.units
      .filter((u) => u.parent_id && roots.has(u.parent_id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        kind: u.kind,
        manager_name: u.manager_name,
        services: data.units.filter((c) => c.parent_id === u.id).length,
        ...this.stats(data, this.subtree(data.units, u.id)),
      }));
    const all = new Set(data.units.map((u) => u.id));
    // Le niveau de l'Agence elle-même (direction générale) : son plan, son courrier, ses projets propres (I-16)
    const root = data.units.find((u) => !u.parent_id);
    const agency = root
      ? { id: root.id, name: root.name, kind: root.kind, manager_name: root.manager_name, ...this.stats(data, roots) }
      : null;
    return { today: data.now, institution: this.stats(data, all, true), agency, directions };
  }

  /** Le détail d'une direction (ou de l'un de ses services) : ses entités, ses dossiers, ses agents, ses retards. */
  /** La personne dirige cette entité, ou une entité au-dessus d'elle. */
  private async heads(actorId: string, orgId: string, unitId: string) {
    return !!(await this.svc.db.one(
      `WITH RECURSIVE up(id, parent_id, manager_id) AS (
         SELECT id, parent_id, manager_id FROM org_units WHERE org_id = $1 AND id = $2
         UNION SELECT u.id, u.parent_id, u.manager_id FROM org_units u JOIN up ON u.id = up.parent_id
       ) SELECT 1 FROM up WHERE manager_id = $3 LIMIT 1`,
      [orgId, unitId, actorId],
    ));
  }

  async detail(actorId: string, orgId: string, unitId: string) {
    const data = await this.load(actorId, orgId, unitId);
    const unit = data.units.find((u) => u.id === unitId);
    if (!unit) throw notFound("Entité introuvable");
    const scope = this.subtree(data.units, unitId);
    const byId = new Map(data.units.map((u) => [u.id, u]));
    const breadcrumb: { id: string; name: string }[] = [];
    for (let u: Unit | undefined = unit; u?.parent_id; u = byId.get(u.parent_id))
      breadcrumb.unshift({ id: u.id, name: u.name });
    const people = data.members.filter((m) => m.unit_id && scope.has(m.unit_id));
    const taskOf = new Map(data.tasks.map((t) => [t.user_id, t]));
    const { now } = data;
    const late = (d: string | null) => !!d && d < now;
    const unitName = (id: string | null) => (id ? (byId.get(id)?.name ?? null) : null);
    return {
      today: now,
      unit: { id: unit.id, name: unit.name, kind: unit.kind, manager_name: unit.manager_name },
      breadcrumb,
      stats: this.stats(data, scope),
      children: data.units
        .filter((c) => c.parent_id === unitId)
        .map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
          manager_name: c.manager_name,
          ...this.stats(data, this.subtree(data.units, c.id)),
        })),
      projects: data.projects
        .filter((p) => p.unit_id && scope.has(p.unit_id))
        .map((p) => ({ ...p, unit_name: unitName(p.unit_id) }))
        .sort(
          (a, b) =>
            ["off_track", "at_risk", "on_track", "done"].indexOf(a.health) -
            ["off_track", "at_risk", "on_track", "done"].indexOf(b.health),
        ),
      // La DG voit la synthèse ; la charge nominative des agents relève du chef d'entité (Mon entité)
      plan_activities: data.plan
        .filter((a) => scope.has(a.unit_id))
        .map((a) => {
          const expected = expectedProgress(a.start_on, a.end_on, now);
          return {
            ...a,
            unit_name: unitName(a.unit_id),
            expected,
            behind: expected !== null && a.progress < 100 && expected - a.progress >= BEHIND,
            late: a.progress < 100 && late(a.end_on),
          };
        }),
      late: [
        ...data.decisions
          .filter((d) => late(d.due_on) && people.some((p) => p.user_id === d.owner_id))
          .map((d) => ({
            kind: "decision",
            id: d.id,
            title: d.title,
            who: d.owner_name,
            due_on: d.due_on,
            href: "/decisions",
          })),
        ...data.mail
          .filter((m) => late(m.due_on) && scope.has(m.unit_id))
          .map((m) => ({
            kind: "courrier",
            id: m.id,
            title: m.subject,
            who: unitName(m.unit_id),
            due_on: m.due_on,
            href: "/courrier",
          })),
        ...data.recs
          .filter((r) => late(r.due_on) && people.some((p) => p.user_id === r.responsible_id))
          .map((r) => ({
            kind: "recommandation",
            id: r.id,
            title: r.text,
            who: r.responsible_name,
            due_on: r.due_on,
            href: `/reunions/${r.meeting_id}`,
          })),
      ].sort((a, b) => String(a.due_on).localeCompare(String(b.due_on))),
    };
  }
}

export function directionRoutes(r: FastifyInstance, d: Directions) {
  r.get("/api/pilotage/directions", async (req) => d.list(req.userId, req.orgId));
  r.get<{ Params: { id: string } }>("/api/pilotage/directions/:id", async (req) =>
    d.detail(req.userId, req.orgId, req.params.id),
  );
}
