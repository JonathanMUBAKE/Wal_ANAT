import type { FastifyInstance } from "fastify";
import { uid } from "./db.js";
import { forbidden, localDate, notFound, type Services } from "./services.js";

/*
 * Lot T1 — tâches d'entité et suivi par le responsable.
 *
 * Chaque entité (direction, service, cellule) a un registre de tâches : les tâches qui ne relèvent d'aucun projet.
 * C'est un « projet » de nature 'unit', créé à la première ouverture, jamais montré dans le portefeuille : il hérite
 * de tout ce que savent faire les tâches (vues liste, tableau, calendrier ; sous-tâches, commentaires, pièces,
 * rappels, traces). L'accès est réglé dans ACCESS_SQL (services.ts) : le responsable de l'entité, et ceux des
 * entités au-dessus, l'administrent ; les agents de l'entité y travaillent ; les règles d'attribution sont dans
 * `checkUnitBoard` (un agent ne confie rien à un collègue).
 *
 * Le suivi montre au responsable l'état des tâches de chacun de ses agents, entité et entités rattachées, y compris
 * les tâches portées dans les projets, dans la limite des projets qu'il peut lire.
 */

const SECTIONS = ["À faire", "En cours", "Terminé"];

type Unit = { id: string; org_id: string; name: string; manager_id: string | null; parent_id: string | null };

export class UnitTasks {
  constructor(private svc: Services) {}

  private async unit(orgId: string, unitId: string) {
    const u = await this.svc.db.one<Unit>(
      "SELECT id, org_id, name, manager_id, parent_id FROM org_units WHERE id = $1 AND org_id = $2",
      [unitId, orgId],
    );
    if (!u) throw notFound("Entité introuvable");
    return u;
  }

  /** Entités que la personne dirige (directement ou au-dessus) et entité dont elle est agent. */
  async mine(actorId: string, orgId: string) {
    await this.svc.requireOrg(actorId, orgId, "member");
    const rows = await this.svc.db.query<{ id: string; name: string; parent_id: string | null; role: string }>(
      `WITH RECURSIVE managed(id) AS (
         SELECT id FROM org_units WHERE manager_id = $1 AND org_id = $2
         UNION SELECT u.id FROM org_units u JOIN managed m ON u.parent_id = m.id
       )
       SELECT u.id, u.name, u.parent_id, 'responsable' AS role FROM org_units u WHERE u.id IN (SELECT id FROM managed)
       UNION
       SELECT u.id, u.name, u.parent_id, 'agent' FROM org_units u JOIN org_members om ON om.unit_id = u.id
        WHERE om.user_id = $1 AND om.org_id = $2 AND u.id NOT IN (SELECT id FROM managed)`,
      [actorId, orgId],
    );
    // Les entités dirigées d'abord, de la plus haute à la plus basse
    const depth = (id: string | null, seen = 0): number => {
      const r = rows.find((x) => x.id === id);
      return r && seen < 20 ? 1 + depth(r.parent_id, seen + 1) : 0;
    };
    return rows
      .map((r) => ({ id: r.id, name: r.name, role: r.role as "responsable" | "agent", depth: depth(r.parent_id) }))
      .sort((a, b) =>
        a.role === b.role ? a.depth - b.depth || a.name.localeCompare(b.name) : a.role === "responsable" ? -1 : 1,
      );
  }

  /** Ouvre le registre de l'entité (le crée au besoin). */
  async board(actorId: string, orgId: string, unitId: string) {
    const u = await this.unit(orgId, unitId);
    let p = await this.svc.db.one<{ id: string }>(
      "SELECT id FROM projects WHERE org_id = $1 AND unit_id = $2 AND kind = 'unit'",
      [orgId, unitId],
    );
    if (!p) {
      // Personne d'extérieur ne fait naître le registre d'une entité qui n'est pas la sienne
      if (!(await this.canOpen(actorId, orgId, unitId))) throw this.denied(u);
      const id = uid("prj");
      const key = await this.svc.suggestKey(orgId, `Entité ${u.name}`);
      await this.svc.db.tx(async (q) => {
        await q.query(
          `INSERT INTO projects (id, org_id, key, access, name, description, icon, owner_id, unit_id, kind)
           VALUES ($1, $2, $3, 'private', $4, $5, 'users', $6, $7, 'unit')
           ON CONFLICT DO NOTHING`,
          [
            id,
            orgId,
            key,
            `Tâches — ${u.name}`,
            "Les tâches de l'entité qui ne relèvent d'aucun projet.",
            u.manager_id,
            unitId,
          ],
        );
        for (let i = 0; i < SECTIONS.length; i++)
          await q.query(
            "INSERT INTO sections (id, project_id, name, position) SELECT $1, $2, $3, $4 WHERE EXISTS (SELECT 1 FROM projects WHERE id = $2)",
            [uid("sec"), id, SECTIONS[i], (i + 1) * 1024],
          );
      });
      p = await this.svc.db.one<{ id: string }>(
        "SELECT id FROM projects WHERE org_id = $1 AND unit_id = $2 AND kind = 'unit'",
        [orgId, unitId],
      );
      if (!p) throw notFound("Registre introuvable");
    }
    const role = await this.svc.projectRole(actorId, p.id);
    if (!role) throw this.denied(u);
    // Les personnes à qui confier une tâche. Le responsable voit aussi les agents des entités rattachées : leur
    // tâche se range alors dans le registre de leur propre entité, pour qu'ils y aient accès.
    const responsable = role === "admin";
    const members = await this.svc.db.query<{
      id: string;
      name: string;
      title: string | null;
      manager: boolean;
      unit_id: string;
      unit_name: string;
    }>(
      `WITH RECURSIVE tree(id) AS (SELECT $2::text UNION SELECT c.id FROM org_units c JOIN tree ON c.parent_id = tree.id WHERE $3)
       SELECT u.id, u.name, u.title, false AS manager, ou.id AS unit_id, ou.name AS unit_name
         FROM org_members om JOIN users u ON u.id = om.user_id JOIN org_units ou ON ou.id = om.unit_id
        WHERE om.org_id = $1 AND om.unit_id IN (SELECT id FROM tree) AND NOT u.is_ai AND u.status = 'active'
       UNION
       SELECT u.id, u.name, u.title, true, ou.id, ou.name FROM org_units ou JOIN users u ON u.id = ou.manager_id WHERE ou.id = $2
       ORDER BY manager DESC, unit_name, name`,
      [orgId, unitId, responsable],
    );
    return {
      project_id: p.id,
      unit: { id: u.id, name: u.name, manager_id: u.manager_id },
      role: role === "admin" ? "responsable" : "agent",
      can: { assign: responsable },
      members: members.filter((m) => m.manager || !members.some((x) => x.manager && x.id === m.id)),
    };
  }

  /** Suivi des agents par le responsable de l'entité (ou un administrateur de l'organisation). */
  async followUp(actorId: string, orgId: string, unitId: string) {
    const u = await this.unit(orgId, unitId);
    if (!(await this.manages(actorId, orgId, unitId)))
      throw forbidden(`Le suivi de « ${u.name} » est réservé à son responsable`);
    const agents = await this.svc.db.query<{
      user_id: string;
      name: string;
      title: string | null;
      unit_id: string;
      unit_name: string;
    }>(
      `WITH RECURSIVE tree(id) AS (SELECT $2::text UNION SELECT c.id FROM org_units c JOIN tree ON c.parent_id = tree.id)
       SELECT u.id AS user_id, u.name, u.title, ou.id AS unit_id, ou.name AS unit_name
         FROM org_members om JOIN users u ON u.id = om.user_id JOIN org_units ou ON ou.id = om.unit_id
        WHERE om.org_id = $1 AND om.unit_id IN (SELECT id FROM tree) AND NOT u.is_ai AND u.id <> $3
        ORDER BY (ou.id = $2) DESC, ou.name, u.name`,
      [orgId, unitId, actorId],
    );
    const readable = await this.svc.readableProjectIds(actorId, orgId);
    const today = localDate();
    const since = localDate(new Date(Date.now() - 30 * 864e5));
    const tasks = agents.length
      ? await this.svc.db.query<{
          id: string;
          key: string;
          title: string;
          assignee_id: string;
          project_id: string;
          project_name: string;
          in_unit_board: boolean;
          section_name: string | null;
          priority: string;
          due_on: string | null;
          completed: boolean;
          completed_at: string | null;
        }>(
          `SELECT t.id, p.key || '-' || t.number AS key, t.title, t.assignee_id, t.project_id, p.name AS project_name,
                  (p.kind = 'unit') AS in_unit_board, s.name AS section_name, t.priority,
                  to_char(t.due_on, 'YYYY-MM-DD') AS due_on, t.completed, t.completed_at
             FROM tasks t JOIN projects p ON p.id = t.project_id LEFT JOIN sections s ON s.id = t.section_id
            WHERE t.assignee_id = ANY($1) AND t.project_id = ANY($2) AND t.parent_id IS NULL AND NOT p.archived
              AND (NOT t.completed OR t.completed_at >= $3::date)
            ORDER BY t.completed, t.due_on NULLS LAST, t.created_at`,
          [agents.map((a) => a.user_id), readable, since],
        )
      : [];
    const soon = localDate(new Date(Date.now() + 7 * 864e5));
    return {
      unit: { id: u.id, name: u.name },
      agents: agents.map((a) => {
        const mine = tasks.filter((t) => t.assignee_id === a.user_id);
        const open = mine.filter((t) => !t.completed);
        return {
          ...a,
          open: open.length,
          overdue: open.filter((t) => t.due_on && t.due_on < today).length,
          due_soon: open.filter((t) => t.due_on && t.due_on >= today && t.due_on <= soon).length,
          done_30: mine.filter((t) => t.completed).length,
        };
      }),
      tasks: tasks.map((t) => ({ ...t, overdue: !t.completed && !!t.due_on && t.due_on < today })),
    };
  }

  private denied(u: Unit) {
    return forbidden(`Les tâches de « ${u.name} » sont réservées à ses agents et à son responsable`);
  }
  private async manages(actorId: string, orgId: string, unitId: string) {
    if (["owner", "admin"].includes((await this.svc.orgRole(actorId, orgId)) ?? "")) return true;
    return !!(await this.svc.db.one(
      `WITH RECURSIVE up(id, manager_id, parent_id) AS (
         SELECT id, manager_id, parent_id FROM org_units WHERE id = $1
         UNION SELECT p.id, p.manager_id, p.parent_id FROM org_units p JOIN up ON p.id = up.parent_id
       ) SELECT 1 FROM up WHERE manager_id = $2`,
      [unitId, actorId],
    ));
  }
  private async canOpen(actorId: string, orgId: string, unitId: string) {
    if (await this.manages(actorId, orgId, unitId)) return true;
    return !!(await this.svc.db.one("SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2 AND unit_id = $3", [
      orgId,
      actorId,
      unitId,
    ]));
  }
}

type Id = { Params: { id: string } };
export function unitTaskRoutes(r: FastifyInstance, ut: UnitTasks) {
  r.get("/api/me/units", async (req) => ut.mine(req.userId, req.orgId));
  r.get<Id>("/api/units/:id/board", async (req) => ut.board(req.userId, req.orgId, req.params.id));
  r.get<Id>("/api/units/:id/follow-up", async (req) => ut.followUp(req.userId, req.orgId, req.params.id));
}
