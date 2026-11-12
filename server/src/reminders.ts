import { categoryOfReminder } from "./notification-categories.js";
import { today, type Services } from "./services.js";

/*
 * Rappels d'échéance (docs/DESIGN-SYSTEM.md § 5.6 et parcours métier) : chaque responsable est prévenu avant
 * l'échéance de ce qu'il doit rendre, puis une fois s'il est en retard. Un rappel n'est envoyé qu'une fois : la
 * table reminders_sent en garde la trace. La notification devient un courriel quand la messagerie est configurée.
 */

interface Due {
  id: string;
  org_id: string;
  user_id: string;
  label: string;
  due_on: string;
  project_id?: string | null;
  task_id?: string | null;
}
/** Ce qui se rappelle, à qui, et combien de jours avant. Les délais deviendront des paramètres (lot P5). */
const SOURCES: { kind: string; noun: string; ahead: number; sql: string }[] = [
  {
    kind: "task",
    noun: "Tâche",
    ahead: 1,
    sql: `SELECT t.id, t.org_id, t.assignee_id AS user_id, t.title AS label, t.due_on::text AS due_on, t.project_id, t.id AS task_id
          FROM tasks t WHERE NOT t.completed AND t.assignee_id IS NOT NULL AND t.due_on IS NOT NULL AND t.due_on <= $1::date`,
  },
  {
    kind: "mail",
    noun: "Courrier à traiter",
    ahead: 2,
    sql: `SELECT c.id, c.org_id, c.assignee_id AS user_id, c.subject AS label, c.due_on::text AS due_on
          FROM correspondence c WHERE c.status <> 'traite' AND c.assignee_id IS NOT NULL AND c.due_on IS NOT NULL AND c.due_on <= $1::date`,
  },
  {
    kind: "decision",
    noun: "Décision à exécuter",
    ahead: 2,
    sql: `SELECT d.id, d.org_id, d.owner_id AS user_id, d.title AS label, d.due_on::text AS due_on
          FROM dg_decisions d WHERE d.status IN ('a_executer', 'en_cours') AND d.owner_id IS NOT NULL AND d.due_on IS NOT NULL AND d.due_on <= $1::date`,
  },
  {
    kind: "recommendation",
    noun: "Recommandation",
    ahead: 2,
    sql: `SELECT a.id, a.org_id, a.responsible_id AS user_id, a.text AS label, a.due_on::text AS due_on
          FROM meeting_actions a WHERE a.status NOT IN ('realise', 'annule') AND a.responsible_id IS NOT NULL AND a.due_on IS NOT NULL AND a.due_on <= $1::date`,
  },
  {
    kind: "deliverable",
    noun: "Livrable à produire",
    ahead: 2,
    sql: `SELECT l.id, l.org_id, l.responsible_id AS user_id, l.title AS label, l.due_on::text AS due_on, l.project_id
          FROM deliverables l WHERE l.status NOT IN ('soumis', 'en_revue', 'valide') AND l.responsible_id IS NOT NULL AND l.due_on IS NOT NULL AND l.due_on <= $1::date`,
  },
];

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const frDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export class Reminders {
  constructor(private svc: Services) {}

  /**
   * Un retard est signalé une fois au chef de l'entité du chargé (ou de l'entité au-dessus si le chargé la dirige) :
   * il peut relancer, réattribuer ou ajuster l'échéance.
   */
  private async escalate(s: (typeof SOURCES)[number], r: Due) {
    const head = await this.svc.db.one<{ manager_id: string; name: string }>(
      `WITH RECURSIVE up(id, manager_id, parent_id, depth) AS (
         SELECT u.id, u.manager_id, u.parent_id, 0 FROM org_units u
           JOIN org_members om ON om.unit_id = u.id AND om.org_id = $1 AND om.user_id = $2
         UNION SELECT p.id, p.manager_id, p.parent_id, up.depth + 1 FROM org_units p JOIN up ON p.id = up.parent_id
       )
       SELECT up.manager_id, us.name FROM up JOIN users us ON us.id = $2
        WHERE up.manager_id IS NOT NULL AND up.manager_id <> $2 ORDER BY up.depth LIMIT 1`,
      [r.org_id, r.user_id],
    );
    if (!head) return;
    await this.svc.notify(head.manager_id, r.org_id, {
      kind: `${s.kind}.late.manager`,
      title: `${head.name} est en retard : ${r.label}`,
      body: `${s.noun} attendue le ${frDate(r.due_on)}. Vous pouvez relancer, réattribuer ou ajuster l'échéance.`,
      project_id: r.project_id ?? null,
      task_id: r.task_id ?? null,
      category: "equipe",
    });
  }

  async sweep(now = today()) {
    for (const s of SOURCES) {
      const rows = await this.svc.db.query<Due>(s.sql, [addDays(now, s.ahead)]);
      for (const r of rows) {
        const late = r.due_on < now;
        // Un rappel « bientôt » et un rappel « en retard » au plus, par objet et par échéance
        const key = `${s.kind}:${r.id}:${r.due_on}:${late ? "late" : "soon"}`;
        const fresh = await this.svc.db.query(
          "INSERT INTO reminders_sent (key, org_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING key",
          [key, r.org_id],
        );
        if (!fresh.length) continue;
        const when =
          r.due_on === now ? "aujourd'hui" : r.due_on === addDays(now, 1) ? "demain" : `le ${frDate(r.due_on)}`;
        await this.svc.notify(r.user_id, r.org_id, {
          kind: late ? "deadline.late" : "deadline.soon",
          title: late ? `En retard depuis le ${frDate(r.due_on)} : ${r.label}` : `Échéance ${when} : ${r.label}`,
          body: late
            ? `${s.noun} : l'échéance est passée. Mettez à jour l'avancement ou rendez-en compte.`
            : `${s.noun} à rendre ${when}.`,
          project_id: r.project_id ?? null,
          task_id: r.task_id ?? null,
          category: categoryOfReminder[s.kind],
        });
        if (late) await this.escalate(s, r);
      }
    }
  }
}
