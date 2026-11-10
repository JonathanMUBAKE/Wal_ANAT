import { Decisions } from "./decisions.js";
import { meetingReference } from "./meetings.js";
import type { Services } from "./services.js";

export type Form = "projet_interne" | "projet_confie" | "commission" | "conference" | "rendez_vous" | "interne";
export interface PilotageItem {
  id: string;
  form: Form;
  title: string;
  lead_name: string | null;
  unit_name: string | null;
  health: "on_track" | "at_risk" | "off_track" | "done";
  progress: number | null;
  next_due: string | null;
  overdue: number;
  decision_needed: string;
  href: string;
}
const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Le grand tableau de bord : une seule lecture de toutes les formes d'activité auxquelles la personne a accès. */
export class Pilotage {
  constructor(private svc: Services) {}

  async overview(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "pilotage.view");
    const perms = await this.svc.permissionsOf(actorId, orgId);
    const db = this.svc.db;
    const today = day();
    const projects = await this.svc.listProjects(actorId, orgId);
    const ids = projects.map((p) => p.id);
    const gov = new Map(
      (
        await db.query<{
          id: string;
          origin: string;
          decision_needed: string;
          lead_name: string | null;
          unit_name: string | null;
        }>(
          "SELECT p.id, p.origin, p.decision_needed, COALESCE(l.name, o.name) AS lead_name, ou.name AS unit_name FROM projects p LEFT JOIN users l ON l.id = p.lead_id LEFT JOIN users o ON o.id = p.owner_id LEFT JOIN org_units ou ON ou.id = p.unit_id WHERE p.id = ANY($1)",
          [ids],
        )
      ).map((g) => [g.id, g]),
    );
    const nextDue = new Map(
      (
        await db.query<{ project_id: string; d: string }>(
          "SELECT project_id, min(due_on) AS d FROM tasks WHERE project_id = ANY($1) AND NOT completed AND due_on >= $2::date GROUP BY project_id",
          [ids, today],
        )
      ).map((r) => [r.project_id, r.d]),
    );
    const activities = await db.query<{
      id: string;
      kind: Form;
      title: string;
      lead_name: string | null;
      unit_name: string | null;
      health: PilotageItem["health"];
      progress: number;
      next_due_on: string | null;
      start_on: string | null;
      decision_needed: string;
      overdue: number;
    }>(
      `SELECT a.id, a.kind, a.title, u.name AS lead_name, ou.name AS unit_name, a.health, a.progress, a.next_due_on, a.start_on, a.decision_needed,
        (SELECT count(*)::int FROM activity_followups f WHERE f.activity_id = a.id AND NOT f.done AND f.due_on < $2::date) AS overdue
       FROM agency_activities a LEFT JOIN users u ON u.id = a.lead_id LEFT JOIN org_units ou ON ou.id = a.unit_id
       WHERE a.org_id = $1 AND (NOT a.confidential OR $3 OR a.lead_id = $4)`,
      // Une activité confidentielle n'apparaît qu'à son responsable et aux gestionnaires, comme dans le portefeuille
      [orgId, today, perms.includes("agenda.manage"), actorId],
    );
    // L'état affiché tient compte des retards : une activité en retard n'est jamais « dans les temps »
    const effective = (h: PilotageItem["health"], overdue: number) =>
      h === "on_track" && overdue > 0 ? "at_risk" : h;
    const items: PilotageItem[] = [
      ...projects.map((p) => {
        const g = gov.get(p.id);
        return {
          id: p.id,
          form: (g?.origin === "confie" ? "projet_confie" : "projet_interne") as Form,
          title: p.name,
          lead_name: g?.lead_name ?? null,
          unit_name: g?.unit_name ?? p.team_name,
          health: effective(p.status, p.overdue_count),
          progress: p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0,
          next_due: nextDue.get(p.id) ?? p.due_on,
          overdue: p.overdue_count,
          decision_needed: g?.decision_needed ?? "",
          href: `/projects/${p.id}/dashboard`,
        };
      }),
      ...activities.map((a) => ({
        id: a.id,
        form: a.kind,
        title: a.title,
        lead_name: a.lead_name,
        unit_name: a.unit_name,
        health: effective(a.health, a.overdue),
        progress: a.kind === "interne" ? a.progress : null,
        next_due: a.next_due_on ?? a.start_on,
        overdue: a.overdue,
        decision_needed: a.decision_needed,
        href: `/activites/${a.id}`,
      })),
    ];
    const count = (f: Form) => items.filter((i) => i.form === f).length;
    const health = { on_track: 0, at_risk: 0, off_track: 0, done: 0 };
    for (const i of items) health[i.health]++;

    const horizon = day(7);
    const agendaActivities = activities
      .filter((a) => a.start_on && a.start_on >= today && a.start_on <= horizon)
      .map((a) => ({
        id: a.id,
        form: a.kind as string,
        title: a.title,
        date: a.start_on as string,
        href: `/activites/${a.id}`,
      }));
    const meetings = await db.query<{
      id: string;
      meeting_type: string;
      meeting_date: string;
      start_time: string | null;
      location: string;
    }>(
      "SELECT id, meeting_type, meeting_date, start_time, location FROM meetings WHERE org_id = $1 AND status <> 'cancelled' AND NOT confidential AND meeting_date BETWEEN $2::date AND $3::date ORDER BY meeting_date",
      [orgId, today, horizon],
    );
    const agenda = [
      ...agendaActivities,
      ...meetings.map((m) => ({
        id: m.id,
        form: "reunion",
        title: m.meeting_type,
        date: m.meeting_date,
        href: `/reunions/${m.id}`,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const recs = await db.one<{ open: number; late: number; done: number }>(
      `SELECT count(*) FILTER (WHERE a.status NOT IN ('realise','annule'))::int AS open,
        count(*) FILTER (WHERE a.status NOT IN ('realise','annule') AND a.due_on < $2::date)::int AS late,
        count(*) FILTER (WHERE a.status = 'realise')::int AS done
       FROM meeting_actions a JOIN meetings m ON m.id = a.meeting_id WHERE a.org_id = $1 AND NOT m.confidential`,
      [orgId, today],
    );
    const lateRecs = await db.query<{
      id: string;
      text: string;
      responsible_name: string;
      due_on: string;
      meeting_id: string;
      seq: number;
      service_code: string;
      writer_initials: string;
      meeting_date: string;
    }>(
      `SELECT a.id, a.text, a.responsible_name, a.due_on, a.meeting_id, m.seq, m.service_code, m.writer_initials, m.meeting_date
       FROM meeting_actions a JOIN meetings m ON m.id = a.meeting_id
       WHERE a.org_id = $1 AND NOT m.confidential AND a.status NOT IN ('realise','annule') AND a.due_on < $2::date ORDER BY a.due_on LIMIT 6`,
      [orgId, today],
    );
    // Tout ce qui a dépassé son échéance, quelle que soit sa nature : la DG voit un seul chiffre et son détail
    const lateCounts = await db.one<{ livrables: number; activites_plan: number; courrier: number }>(
      `SELECT
        (SELECT count(*)::int FROM deliverables WHERE org_id = $1 AND status <> 'valide' AND due_on < $2::date) AS livrables,
        (SELECT count(*)::int FROM plan_activities a JOIN work_plans p ON p.id = a.plan_id
          WHERE a.org_id = $1 AND p.status = 'approved' AND a.progress < 100 AND a.end_on < $2::date) AS activites_plan,
        (SELECT count(*)::int FROM correspondence WHERE org_id = $1 AND status <> 'traite' AND NOT confidential AND due_on < $2::date) AS courrier`,
      [orgId, today],
    );
    const decisions = items.filter((i) => i.decision_needed.trim() && i.health !== "done");
    const registry = await new Decisions(this.svc).summary(actorId, orgId);
    const critical = items.filter((i) => i.health === "off_track");
    const overdueTasks = items.filter((i) => i.overdue > 0).reduce((s, i) => s + i.overdue, 0);
    const counters = {
      projets: count("projet_interne") + count("projet_confie"),
      projets_internes: count("projet_interne"),
      projets_confies: count("projet_confie"),
      commissions: count("commission"),
      conferences: count("conference"),
      rendez_vous: count("rendez_vous"),
      activites_internes: count("interne"),
      decisions: decisions.length,
      retards:
        overdueTasks +
        (recs?.late ?? 0) +
        (lateCounts?.livrables ?? 0) +
        (lateCounts?.activites_plan ?? 0) +
        (lateCounts?.courrier ?? 0) +
        registry.late,
      decisions_a_executer: registry.open,
      retards_detail: {
        taches_et_suites: overdueTasks,
        recommandations: recs?.late ?? 0,
        livrables: lateCounts?.livrables ?? 0,
        activites_plan: lateCounts?.activites_plan ?? 0,
        courrier: lateCounts?.courrier ?? 0,
        decisions: registry.late,
      },
    };
    const delegators = (
      await db.query<{ from_user: string }>(
        "SELECT from_user FROM delegations WHERE org_id = $1 AND to_user = $2 AND start_on <= CURRENT_DATE AND end_on >= CURRENT_DATE",
        [orgId, actorId],
      )
    ).map((r) => r.from_user);
    const toSign =
      (
        await db.one<{ n: number }>(
          "SELECT count(*)::int AS n FROM sign_steps s JOIN sign_documents d ON d.id = s.document_id WHERE d.org_id = $1 AND s.status = 'pending' AND s.actor_id = ANY($2)",
          [orgId, [actorId, ...delegators]],
        )
      )?.n ?? 0;
    const lateDeliverables =
      (
        await db.one<{ n: number }>(
          "SELECT count(*)::int AS n FROM deliverables WHERE org_id = $1 AND status <> 'valide' AND due_on < $2::date",
          [orgId, today],
        )
      )?.n ?? 0;
    const endingContracts = await db.query<{ id: string; consultant_name: string; title: string; end_on: string }>(
      "SELECT id, consultant_name, title, end_on FROM consultant_contracts WHERE org_id = $1 AND status = 'active' AND end_on <= $2::date ORDER BY end_on LIMIT 5",
      [orgId, day(30)],
    );
    const openGaps =
      (
        await db.one<{ n: number }>(
          "SELECT count(*)::int AS n FROM participation_gaps WHERE org_id = $1 AND status = 'open'",
          [orgId],
        )
      )?.n ?? 0;
    const risks = await db.query<{
      id: string;
      title: string;
      score: number;
      owner_name: string | null;
      mitigation: string;
    }>(
      `SELECT r.id, r.title, r.probability * r.impact AS score, u.name AS owner_name, r.mitigation FROM risks r LEFT JOIN users u ON u.id = r.owner_id
       WHERE r.org_id = $1 AND r.status = 'open' ORDER BY score DESC LIMIT 5`,
      [orgId],
    );
    const indicators = await db.query<{
      id: string;
      name: string;
      unit_label: string;
      baseline: number;
      target: number;
      result: number;
      source: string;
    }>(
      "SELECT id, name, unit_label, source, baseline::float8 AS baseline, target::float8 AS target, result::float8 AS result FROM indicators WHERE org_id = $1 ORDER BY name LIMIT 8",
      [orgId],
    );
    const plans = await db.one<{ n: number; approved: number }>(
      "SELECT count(*)::int AS n, count(*) FILTER (WHERE status = 'approved')::int AS approved FROM work_plans WHERE org_id = $1 AND year = $2",
      [orgId, Number(today.slice(0, 4))],
    );
    const brief = [
      ...(toSign ? [`${plural(toSign, "document attend", "documents attendent")} votre visa ou votre signature.`] : []),
      `${plural(items.length, "activité suivie", "activités suivies")}, dont ${plural(critical.length, "en difficulté", "en difficulté")}.`,
      decisions.length
        ? `${plural(decisions.length, "décision attend", "décisions attendent")} votre arbitrage.`
        : "Aucune décision en attente.",
      recs?.late
        ? `${plural(recs.late, "recommandation est", "recommandations sont")} en retard d'exécution.`
        : "Aucune recommandation en retard.",
      agenda.length
        ? `${plural(agenda.length, "rendez-vous ou séance", "rendez-vous ou séances")} dans les 7 prochains jours.`
        : "Agenda libre sur les 7 prochains jours.",
    ];
    return {
      today,
      counters,
      health,
      items,
      decisions,
      recent_decisions: registry.recent,
      agenda,
      recommendations: {
        open: recs?.open ?? 0,
        late: recs?.late ?? 0,
        done: recs?.done ?? 0,
        late_list: lateRecs.map((r) => ({
          id: r.id,
          text: r.text,
          responsible_name: r.responsible_name,
          due_on: r.due_on,
          meeting_id: r.meeting_id,
          reference: meetingReference(r),
        })),
      },
      brief,
      to_sign: toSign,
      late_deliverables: lateDeliverables,
      open_gaps: openGaps,
      ending_contracts: endingContracts,
      risks,
      indicators,
      plans: { total: plans?.n ?? 0, approved: plans?.approved ?? 0 },
    };
  }
}
