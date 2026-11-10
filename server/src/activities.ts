import { uid } from "./db.js";
import { Referentials } from "./referentials.js";
import { badRequest, forbidden, isRealDate, notFound, type Services } from "./services.js";

export const HEALTHS = ["on_track", "at_risk", "off_track", "done"] as const;
/** Code d'une valeur du référentiel « types d'activités » de l'institution (docs/PARAMETRAGE.md). */
export type ActivityKind = string;
export type Health = (typeof HEALTHS)[number];

export interface Activity {
  id: string;
  org_id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  lead_id: string | null;
  unit_id: string | null;
  domain_id: string | null;
  start_on: string | null;
  start_time: string | null;
  end_on: string | null;
  location: string;
  counterpart: string;
  mandate: string;
  delegation: string;
  outcome: string;
  decision_needed: string;
  progress: number;
  next_due_on: string | null;
  health: Health;
  confidential: boolean;
  created_by: string | null;
}
export type ActivityInput = Partial<Omit<Activity, "id" | "org_id" | "created_by" | "kind">> & {
  kind?: ActivityKind;
  title?: string;
};
export interface Governance {
  origin?: "interne" | "confie";
  sponsor?: string;
  convention_ref?: string;
  lead_id?: string | null;
  unit_id?: string | null;
  domain_id?: string | null;
  budget_planned?: number | null;
  budget_spent?: number | null;
  decision_needed?: string;
}

const FIELDS = [
  "title",
  "description",
  "lead_id",
  "unit_id",
  "domain_id",
  "start_on",
  "start_time",
  "end_on",
  "location",
  "counterpart",
  "mandate",
  "delegation",
  "outcome",
  "decision_needed",
  "progress",
  "next_due_on",
  "health",
  "confidential",
] as const;

export class Activities {
  constructor(private svc: Services) {}

  private async canManage(actorId: string, orgId: string) {
    return (await this.svc.permissionsOf(actorId, orgId)).includes("agenda.manage");
  }

  private async row(id: string) {
    const a = await this.svc.db.one<Activity>("SELECT * FROM agency_activities WHERE id = $1", [id]);
    if (!a) throw notFound("Activité introuvable");
    return a;
  }

  private async readable(actorId: string, id: string) {
    const a = await this.row(id);
    await this.svc.requirePerm(actorId, a.org_id, "agenda.view");
    if (a.confidential && a.lead_id !== actorId && !(await this.canManage(actorId, a.org_id)))
      throw notFound("Activité introuvable");
    return a;
  }

  private async assertRefs(orgId: string, i: ActivityInput) {
    for (const d of [i.start_on, i.end_on, i.next_due_on])
      if (d && !isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    if (i.start_on && i.end_on && i.end_on < i.start_on) throw badRequest("La fin précède le début");
    if (i.lead_id && !(await this.svc.orgRole(i.lead_id, orgId)))
      throw badRequest("Le responsable doit être membre de l'organisation");
    if (
      i.unit_id &&
      !(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [orgId, i.unit_id]))
    )
      throw badRequest("Entité inconnue");
    if (
      i.domain_id &&
      !(await this.svc.db.one("SELECT 1 FROM activity_domains WHERE org_id = $1 AND id = $2", [orgId, i.domain_id]))
    )
      throw badRequest("Domaine inconnu du catalogue");
  }

  async list(actorId: string, orgId: string, f: { kind?: ActivityKind }) {
    await this.svc.requirePerm(actorId, orgId, "agenda.view");
    const manager = await this.canManage(actorId, orgId);
    return this.svc.db.query<Activity & { lead_name: string | null; unit_name: string | null; open_followups: number }>(
      `SELECT a.*, u.name AS lead_name, ou.name AS unit_name,
        (SELECT count(*)::int FROM activity_followups x WHERE x.activity_id = a.id AND NOT x.done) AS open_followups
       FROM agency_activities a LEFT JOIN users u ON u.id = a.lead_id LEFT JOIN org_units ou ON ou.id = a.unit_id
       WHERE a.org_id = $1 AND (NOT a.confidential OR $2 OR a.lead_id = $3) AND ($4::text IS NULL OR a.kind = $4)
       ORDER BY a.start_on DESC NULLS LAST, a.created_at DESC`,
      [orgId, manager, actorId, f.kind ?? null],
    );
  }

  async get(actorId: string, id: string) {
    const a = await this.readable(actorId, id);
    const followups = await this.svc.db.query<{
      id: string;
      text: string;
      responsible_id: string | null;
      responsible_name: string | null;
      due_on: string | null;
      done: boolean;
    }>(
      `SELECT f.id, f.text, f.responsible_id, u.name AS responsible_name, f.due_on, f.done
       FROM activity_followups f LEFT JOIN users u ON u.id = f.responsible_id WHERE f.activity_id = $1 ORDER BY f.done, f.due_on NULLS LAST, f.created_at`,
      [id],
    );
    const manager = await this.canManage(actorId, a.org_id);
    return { ...a, followups, can: { edit: manager || a.lead_id === actorId, remove: manager } };
  }

  async create(actorId: string, orgId: string, i: ActivityInput & { kind: ActivityKind; title: string }) {
    await this.svc.requirePerm(actorId, orgId, "agenda.manage");
    await this.assertRefs(orgId, i);
    // Le type vient du référentiel : ses propriétés portent les règles (confidentialité par défaut…)
    const type = await new Referentials(this.svc).resolve(orgId, "activity_type", i.kind);
    const id = uid("act");
    await this.svc.db.query(
      `INSERT INTO agency_activities (id, org_id, kind, title, description, lead_id, unit_id, domain_id, start_on, start_time, end_on, location, counterpart, mandate, delegation, decision_needed, progress, next_due_on, health, confidential, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        id,
        orgId,
        type.code,
        i.title.trim(),
        i.description ?? "",
        i.lead_id ?? actorId,
        i.unit_id ?? null,
        i.domain_id ?? null,
        i.start_on ?? null,
        i.start_time ?? null,
        i.end_on ?? null,
        i.location ?? "",
        i.counterpart ?? "",
        i.mandate ?? "",
        i.delegation ?? "",
        i.decision_needed ?? "",
        i.progress ?? 0,
        i.next_due_on ?? null,
        i.health ?? "on_track",
        i.confidential ?? type.props.confidential_default === true,
        actorId,
      ],
    );
    await this.svc.log(actorId, "activity.created", { orgId, data: { id, kind: i.kind } });
    return this.get(actorId, id);
  }

  async update(actorId: string, id: string, patch: ActivityInput) {
    const a = await this.readable(actorId, id);
    const manager = await this.canManage(actorId, a.org_id);
    if (a.lead_id !== actorId && !manager) await this.svc.requirePerm(actorId, a.org_id, "agenda.manage");
    // Le responsable rend compte ; confier l'activité à un autre ou lever sa confidentialité revient aux gestionnaires
    const leadChanged = patch.lead_id !== undefined && (patch.lead_id ?? null) !== a.lead_id;
    const secrecyChanged = patch.confidential !== undefined && patch.confidential !== a.confidential;
    if (!manager && (leadChanged || secrecyChanged))
      throw forbidden("Seul un gestionnaire change le responsable ou la confidentialité d'une activité");
    // Les dates se contrôlent avec celles déjà enregistrées, pas seulement entre elles
    const start = patch.start_on === undefined ? a.start_on : patch.start_on;
    const end = patch.end_on === undefined ? a.end_on : patch.end_on;
    if (start && end && String(end).slice(0, 10) < String(start).slice(0, 10))
      throw badRequest("La fin précède le début");
    await this.assertRefs(a.org_id, patch);
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const k of FIELDS) {
      if (patch[k] === undefined) continue;
      vals.push(patch[k]);
      sets.push(`${k} = $${vals.length}`);
    }
    if (sets.length) {
      vals.push(id);
      await this.svc.db.query(
        `UPDATE agency_activities SET ${sets.join(", ")}, updated_at = now() WHERE id = $${vals.length}`,
        vals,
      );
    }
    return this.get(actorId, id);
  }

  async remove(actorId: string, id: string) {
    const a = await this.row(id);
    await this.svc.requirePerm(actorId, a.org_id, "agenda.manage");
    await this.svc.db.query("DELETE FROM agency_activities WHERE id = $1", [id]);
    await this.svc.log(actorId, "activity.deleted", { orgId: a.org_id, data: { id, title: a.title } });
  }

  async addFollowup(
    actorId: string,
    id: string,
    i: { text: string; responsible_id?: string | null; due_on?: string | null },
  ) {
    const a = await this.readable(actorId, id);
    if (a.lead_id !== actorId) await this.svc.requirePerm(actorId, a.org_id, "agenda.manage");
    if (i.due_on && !isRealDate(i.due_on)) throw badRequest(`Date invalide : ${i.due_on}`);
    if (i.responsible_id && !(await this.svc.orgRole(i.responsible_id, a.org_id)))
      throw badRequest("Le responsable doit être membre de l'organisation");
    await this.svc.db.query(
      "INSERT INTO activity_followups (id, org_id, activity_id, text, responsible_id, due_on) VALUES ($1,$2,$3,$4,$5,$6)",
      [uid("sui"), a.org_id, id, i.text.trim(), i.responsible_id ?? null, i.due_on ?? null],
    );
    if (i.responsible_id && i.responsible_id !== actorId)
      await this.svc.notify(i.responsible_id, a.org_id, {
        kind: "activity.followup",
        title: `Suite à donner : ${a.title}`,
        body: i.text.trim(),
      });
    return this.get(actorId, id);
  }

  async setFollowup(actorId: string, followupId: string, done: boolean) {
    const f = await this.svc.db.one<{ activity_id: string; responsible_id: string | null }>(
      "SELECT activity_id, responsible_id FROM activity_followups WHERE id = $1",
      [followupId],
    );
    if (!f) throw notFound("Suite introuvable");
    const a = await this.readable(actorId, f.activity_id);
    if (f.responsible_id !== actorId && a.lead_id !== actorId)
      await this.svc.requirePerm(actorId, a.org_id, "agenda.manage");
    await this.svc.db.query("UPDATE activity_followups SET done = $1 WHERE id = $2", [done, followupId]);
    return this.get(actorId, f.activity_id);
  }

  // ---------------------------------------------------------------- projets : responsable, origine, équipe
  async governance(actorId: string, projectId: string) {
    await this.svc.require(actorId, projectId, "viewer");
    const p = await this.svc.getProject(actorId, projectId);
    const g = await this.svc.db.one<Governance & { lead_name: string | null; unit_name: string | null }>(
      `SELECT p.origin, p.sponsor, p.convention_ref, p.lead_id, p.unit_id, p.domain_id, p.budget_planned::float8 AS budget_planned, p.budget_spent::float8 AS budget_spent, p.decision_needed,
        u.name AS lead_name, ou.name AS unit_name FROM projects p LEFT JOIN users u ON u.id = p.lead_id LEFT JOIN org_units ou ON ou.id = p.unit_id WHERE p.id = $1`,
      [projectId],
    );
    const ids = p.members.map((m: { user_id: string }) => m.user_id);
    const team = await this.svc.db.query<{
      user_id: string;
      name: string;
      title: string | null;
      function_label: string | null;
      open: number;
      late: number;
    }>(
      `SELECT u.id AS user_id, u.name, u.title, r.function_label,
        (SELECT count(*)::int FROM tasks t WHERE t.project_id = $1 AND t.assignee_id = u.id AND NOT t.completed) AS open,
        (SELECT count(*)::int FROM tasks t WHERE t.project_id = $1 AND t.assignee_id = u.id AND NOT t.completed AND t.due_on < CURRENT_DATE) AS late
       FROM users u LEFT JOIN project_team_roles r ON r.project_id = $1 AND r.user_id = u.id WHERE u.id = ANY($2) AND NOT u.is_ai ORDER BY u.name`,
      [projectId, ids],
    );
    const late = await this.svc.db.query<{ id: string; title: string; due_on: string; assignee_name: string | null }>(
      `SELECT t.id, t.title, t.due_on, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.project_id = $1 AND NOT t.completed AND t.due_on < CURRENT_DATE AND t.parent_id IS NULL ORDER BY t.due_on LIMIT 6`,
      [projectId],
    );
    const upcoming = await this.svc.db.query<{
      id: string;
      title: string;
      due_on: string;
      assignee_name: string | null;
    }>(
      `SELECT t.id, t.title, t.due_on, u.name AS assignee_name FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.project_id = $1 AND NOT t.completed AND t.due_on >= CURRENT_DATE AND t.parent_id IS NULL ORDER BY t.due_on LIMIT 6`,
      [projectId],
    );
    return { ...g, team, late, upcoming };
  }

  async setGovernance(actorId: string, projectId: string, g: Governance) {
    await this.svc.require(actorId, projectId, "admin");
    const orgId = await this.svc.orgOfProject(projectId);
    await this.svc.requirePerm(actorId, orgId, "projects.edit");
    await this.assertRefs(orgId, { lead_id: g.lead_id, unit_id: g.unit_id, domain_id: g.domain_id });
    if ((g.budget_planned ?? 0) < 0 || (g.budget_spent ?? 0) < 0)
      throw badRequest("Un montant ne peut pas être négatif");
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const k of [
      "origin",
      "sponsor",
      "convention_ref",
      "lead_id",
      "unit_id",
      "domain_id",
      "budget_planned",
      "budget_spent",
      "decision_needed",
    ] as const) {
      if (g[k] === undefined) continue;
      vals.push(g[k]);
      sets.push(`${k} = $${vals.length}`);
    }
    if (sets.length) {
      vals.push(projectId);
      await this.svc.db.query(`UPDATE projects SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    }
    await this.svc.log(actorId, "project.governance", { orgId, projectId, data: g as Record<string, unknown> });
    return this.governance(actorId, projectId);
  }

  async setTeamRole(actorId: string, projectId: string, userId: string, label: string) {
    await this.svc.require(actorId, projectId, "admin");
    const { members } = await this.svc.getProject(actorId, projectId);
    if (!members.some((m: { user_id: string }) => m.user_id === userId))
      throw forbidden("Cette personne ne fait pas partie de l'équipe du projet");
    if (label.trim())
      await this.svc.db.query(
        "INSERT INTO project_team_roles (project_id, user_id, function_label) VALUES ($1,$2,$3) ON CONFLICT (project_id, user_id) DO UPDATE SET function_label = EXCLUDED.function_label",
        [projectId, userId, label.trim()],
      );
    else
      await this.svc.db.query("DELETE FROM project_team_roles WHERE project_id = $1 AND user_id = $2", [
        projectId,
        userId,
      ]);
    return this.governance(actorId, projectId);
  }
}
