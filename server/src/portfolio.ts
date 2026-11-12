import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { uid } from "./db.js";
import { Decisions } from "./decisions.js";
import { expectedProgress } from "./pilotage-directions.js";
import { badRequest, forbidden, notFound, today, type Services } from "./services.js";

/*
 * Portefeuille de projets (pilotage stratégique).
 *
 * Revue de portefeuille : pour chaque projet ouvert à la personne, la santé déclarée par son chef et la santé
 * calculée d'après les faits — calendrier (avancement face à l'attendu entre la création et l'échéance), livrables
 * en retard, budget consommé face au temps écoulé, tâches en retard, arbitrage en attente — avec ses raisons écrites.
 * Un projet dont la santé calculée est plus grave que celle déclarée est « en écart » : il vient en tête.
 *
 * Arbitrages : le chef de projet (ou un administrateur du projet) pose une question à la DG — contexte, au moins deux
 * options et leurs conséquences, sa recommandation, la date souhaitée. La question devient la « décision attendue »
 * du projet (tableau de bord DG). La DG (decisions.record) tranche — jamais celui qui a demandé — et la décision
 * s'inscrit au registre, rattachée au projet, son chef chargé de l'exécution. Le demandeur peut retirer sa demande.
 */

type Health = "on_track" | "at_risk" | "off_track" | "done";
const RANK: Record<Health, number> = { done: 0, on_track: 1, at_risk: 2, off_track: 3 };
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

const Option = z.object({
  label: z.string().trim().min(1).max(300),
  consequences: z.string().trim().max(3000).optional(),
});
const Ask = z.object({
  question: z.string().trim().min(1, "Posez la question à trancher").max(500),
  context: z.string().trim().max(10_000).optional(),
  options: z.array(Option).max(6),
  recommendation: z.number().int().min(0).nullable().optional(),
  wanted_by: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});
const Decide = z.object({
  option: z.number().int(),
  note: z.string().trim().max(5000).optional(),
  due_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

interface Arbitration {
  id: string;
  org_id: string;
  project_id: string;
  question: string;
  context: string;
  options: { label: string; consequences?: string }[];
  recommendation: number | null;
  wanted_by: string | null;
  status: "en_attente" | "tranche" | "retire";
  requested_by: string | null;
  decided_by: string | null;
  decided_option: number | null;
  decision_note: string;
  decision_id: string | null;
}
const COLS = `a.id, a.org_id, a.project_id, a.question, a.context, a.options, a.recommendation,
  to_char(a.wanted_by, 'YYYY-MM-DD') AS wanted_by, a.status, a.requested_by, a.decided_by, a.decided_option,
  a.decision_note, a.decision_id, a.decided_at, a.created_at, p.name AS project_name, rq.name AS requested_by_name,
  dc.name AS decided_by_name, d.year AS decision_year, d.seq AS decision_seq`;
const FROM = `project_arbitrations a JOIN projects p ON p.id = a.project_id
  LEFT JOIN users rq ON rq.id = a.requested_by LEFT JOIN users dc ON dc.id = a.decided_by
  LEFT JOIN dg_decisions d ON d.id = a.decision_id`;

export class Portfolio {
  constructor(private svc: Services) {}

  private async requireView(actorId: string, orgId: string) {
    const p = await this.svc.permissionsOf(actorId, orgId);
    if (!["pilotage.view", "agenda.view", "decisions.record", "projects.create"].some((x) => p.includes(x as never)))
      throw forbidden("La revue de portefeuille est réservée au pilotage");
  }

  /** La revue de portefeuille : déclaré face au calculé, raisons écrites, écarts en tête. */
  async review(actorId: string, orgId: string) {
    await this.requireView(actorId, orgId);
    const now = today();
    const projects = await this.svc.listProjects(actorId, orgId);
    const ids = projects.map((p) => p.id);
    const gov = new Map(
      (
        await this.svc.db.query<{
          id: string;
          lead_name: string | null;
          unit_name: string | null;
          budget_planned: number | null;
          budget_spent: number | null;
          created_on: string;
        }>(
          `SELECT p.id, COALESCE(l.name, o.name) AS lead_name, ou.name AS unit_name, p.budget_planned::float8 AS budget_planned,
                  p.budget_spent::float8 AS budget_spent, to_char(p.created_at, 'YYYY-MM-DD') AS created_on
             FROM projects p LEFT JOIN users l ON l.id = p.lead_id LEFT JOIN users o ON o.id = p.owner_id
             LEFT JOIN org_units ou ON ou.id = p.unit_id WHERE p.id = ANY($1)`,
          [ids],
        )
      ).map((r) => [r.id, r]),
    );
    const deliverables = new Map(
      (
        await this.svc.db.query<{ project_id: string; total: number; late: number }>(
          `SELECT project_id, count(*)::int AS total,
                  count(*) FILTER (WHERE status <> 'valide' AND due_on < $2::date)::int AS late
             FROM deliverables WHERE project_id = ANY($1) GROUP BY project_id`,
          [ids, now],
        )
      ).map((r) => [r.project_id, r]),
    );
    const pending = new Map(
      (
        await this.svc.db.query<{ project_id: string; id: string; question: string }>(
          "SELECT project_id, id, question FROM project_arbitrations WHERE project_id = ANY($1) AND status = 'en_attente'",
          [ids],
        )
      ).map((r) => [r.project_id, r]),
    );
    const rows = projects.map((p) => {
      const g = gov.get(p.id);
      const progress = p.task_count ? Math.round((100 * p.done_count) / p.task_count) : 0;
      const expected = p.due_on && g ? expectedProgress(g.created_on, p.due_on, now) : null;
      const dl = deliverables.get(p.id) ?? { total: 0, late: 0 };
      const planned = g?.budget_planned ?? null;
      const spent = g?.budget_spent ?? null;
      const consumed = planned && spent !== null ? Math.round((100 * spent) / planned) : null;
      const arbitration = pending.get(p.id) ?? null;
      const red: string[] = [];
      const amber: string[] = [];
      if (p.status !== "done") {
        if (p.due_on && p.due_on < now && progress < 100)
          red.push(`échéance du projet dépassée (${p.due_on.split("-").reverse().join("/")})`);
        else if (expected !== null && expected - progress >= 30)
          red.push(`avancement ${progress} % pour ${expected} % attendus`);
        else if (expected !== null && expected - progress >= 15)
          amber.push(`avancement ${progress} % pour ${expected} % attendus`);
        if (dl.late >= 2) red.push(plural(dl.late, "livrable en retard", "livrables en retard"));
        else if (dl.late) amber.push("1 livrable en retard");
        if (consumed !== null && consumed > 110) red.push(`budget consommé à ${consumed} %`);
        else if (consumed !== null && expected !== null && consumed - expected >= 20)
          amber.push(`budget consommé à ${consumed} % pour ${expected} % du temps écoulé`);
        if (p.overdue_count) amber.push(plural(p.overdue_count, "tâche en retard", "tâches en retard"));
        if (arbitration) amber.push("arbitrage attendu de la DG");
      }
      const computed: Health =
        p.status === "done" ? "done" : red.length ? "off_track" : amber.length ? "at_risk" : "on_track";
      const declared = p.status as Health;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        lead_name: g?.lead_name ?? null,
        unit_name: g?.unit_name ?? null,
        health_declared: declared,
        health_computed: computed,
        divergent: RANK[computed] > RANK[declared],
        reasons: [...red, ...amber],
        schedule: { progress, expected, due_on: p.due_on ?? null },
        deliverables: dl,
        budget: { planned, spent, consumed },
        tasks: { open: p.task_count - p.done_count, overdue: p.overdue_count },
        arbitration,
      };
    });
    rows.sort(
      (a, b) =>
        Number(b.divergent) - Number(a.divergent) ||
        RANK[b.health_computed] - RANK[a.health_computed] ||
        a.name.localeCompare(b.name),
    );
    const count = (h: Health) => rows.filter((r) => r.health_computed === h).length;
    return {
      today: now,
      summary: {
        total: rows.length,
        on_track: count("on_track"),
        at_risk: count("at_risk"),
        off_track: count("off_track"),
        done: count("done"),
        divergent: rows.filter((r) => r.divergent).length,
        arbitrations: rows.filter((r) => r.arbitration).length,
      },
      projects: rows,
    };
  }

  // ------------------------------------------------------------------ arbitrages
  private async row(orgId: string, id: string) {
    const a = await this.svc.db.one<Arbitration & { project_name: string }>(
      `SELECT ${COLS} FROM ${FROM} WHERE a.org_id = $1 AND a.id = $2`,
      [orgId, id],
    );
    if (!a) throw notFound("Demande d'arbitrage introuvable");
    return a;
  }
  /** Demander : le chef du projet ou un administrateur du projet. */
  private async canAsk(actorId: string, projectId: string) {
    const role = await this.svc.projectRole(actorId, projectId);
    if (role === "admin") return true;
    const lead = await this.svc.db.one<{ lead_id: string | null }>("SELECT lead_id FROM projects WHERE id = $1", [
      projectId,
    ]);
    return !!role && lead?.lead_id === actorId;
  }

  async ofProject(actorId: string, projectId: string) {
    await this.svc.require(actorId, projectId, "viewer");
    return this.svc.db.query(`SELECT ${COLS} FROM ${FROM} WHERE a.project_id = $1 ORDER BY a.created_at DESC`, [
      projectId,
    ]);
  }

  async list(actorId: string, orgId: string, status?: string) {
    const perms = await this.svc.permissionsOf(actorId, orgId);
    if (!perms.includes("decisions.record") && !perms.includes("pilotage.view"))
      throw forbidden("Les arbitrages sont suivis par la direction générale");
    const rows = await this.svc.db.query<Arbitration>(
      `SELECT ${COLS} FROM ${FROM} WHERE a.org_id = $1 AND ($2::text IS NULL OR a.status = $2)
        ORDER BY (a.status = 'en_attente') DESC, a.wanted_by NULLS LAST, a.created_at DESC LIMIT 300`,
      [orgId, status ?? null],
    );
    // Un projet privé n'apparaît qu'à ceux qui y ont accès
    const open = new Set((await this.svc.listProjects(actorId, orgId)).map((p) => p.id));
    return rows.filter((r) => open.has(r.project_id));
  }

  async ask(actorId: string, projectId: string, input: z.infer<typeof Ask>) {
    const orgId = await this.svc.orgOfProject(projectId);
    if (!(await this.canAsk(actorId, projectId)))
      throw forbidden("Seuls le chef du projet et ses administrateurs demandent un arbitrage");
    if (input.options.length < 2) throw badRequest("Un arbitrage oppose au moins deux options");
    if (input.recommendation != null && input.recommendation >= input.options.length)
      throw badRequest("La recommandation doit désigner l'une des options");
    if (
      await this.svc.db.one("SELECT 1 FROM project_arbitrations WHERE project_id = $1 AND status = 'en_attente'", [
        projectId,
      ])
    )
      throw badRequest("Un arbitrage est déjà en attente pour ce projet : retirez-le ou attendez la décision");
    const id = uid("arb");
    await this.svc.db.tx(async (q) => {
      await q.query(
        `INSERT INTO project_arbitrations (id, org_id, project_id, question, context, options, recommendation, wanted_by, requested_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id,
          orgId,
          projectId,
          input.question,
          input.context ?? "",
          JSON.stringify(input.options),
          input.recommendation ?? null,
          input.wanted_by ?? null,
          actorId,
        ],
      );
      // La question devient la décision attendue du projet : elle remonte au tableau de bord DG
      await q.query("UPDATE projects SET decision_needed = $2 WHERE id = $1", [projectId, input.question]);
    });
    await this.svc.log(actorId, "arbitration.requested", { orgId, projectId, data: { id, question: input.question } });
    const a = await this.row(orgId, id);
    for (const u of await this.svc.usersOf(orgId)) {
      if (u.is_ai || u.id === actorId) continue;
      if (!(await this.svc.permissionsOf(u.id, orgId)).includes("decisions.record")) continue;
      await this.svc.notify(u.id, orgId, {
        kind: "arbitration.requested",
        title: `Arbitrage demandé · ${a.project_name}`,
        body: input.question,
        project_id: projectId,
        actor_id: actorId,
        link: `/activites?onglet=arbitrages&arbitrage=${id}`,
        category: "decisions",
      });
    }
    return a;
  }

  async decide(actorId: string, orgId: string, id: string, input: z.infer<typeof Decide>) {
    const a = await this.row(orgId, id);
    await this.svc.requirePerm(actorId, orgId, "decisions.record");
    if (a.requested_by === actorId) throw forbidden("Celui qui demande un arbitrage ne le tranche pas lui-même");
    if (a.status !== "en_attente") throw badRequest("Cette demande n'est plus en attente");
    const chosen = a.options[input.option];
    if (!chosen) throw badRequest("Choisissez l'une des options proposées");
    const lead = await this.svc.db.one<{ lead_id: string | null }>("SELECT lead_id FROM projects WHERE id = $1", [
      a.project_id,
    ]);
    const content = [
      `Question : ${a.question}`,
      `Option retenue : ${chosen.label}${chosen.consequences ? ` (${chosen.consequences})` : ""}`,
      input.note ? `Observations : ${input.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const decision = await new Decisions(this.svc).record(actorId, orgId, {
      title: `${a.project_name} : ${chosen.label}`,
      content,
      decided_on: today(),
      project_id: a.project_id,
      owner_id: lead?.lead_id ?? a.requested_by,
      due_on: input.due_on ?? null,
    });
    const decisionId = (decision as { id: string }).id;
    await this.svc.db.tx(async (q) => {
      await q.query(
        `UPDATE project_arbitrations SET status = 'tranche', decided_by = $3, decided_option = $4, decision_note = $5,
           decision_id = $6, decided_at = now() WHERE org_id = $1 AND id = $2`,
        [orgId, id, actorId, input.option, input.note ?? "", decisionId],
      );
      await q.query("UPDATE projects SET decision_needed = '' WHERE id = $1", [a.project_id]);
    });
    await this.svc.log(actorId, "arbitration.decided", {
      orgId,
      projectId: a.project_id,
      data: { id, option: chosen.label, decision_id: decisionId },
    });
    for (const to of new Set([a.requested_by, lead?.lead_id].filter((x): x is string => !!x && x !== actorId)))
      await this.svc.notify(to, orgId, {
        kind: "arbitration.decided",
        title: `Arbitrage rendu · ${a.project_name} : ${chosen.label}`,
        body: input.note || undefined,
        project_id: a.project_id,
        actor_id: actorId,
        link: "/decisions",
        category: "decisions",
      });
    return this.row(orgId, id);
  }

  async withdraw(actorId: string, orgId: string, id: string) {
    const a = await this.row(orgId, id);
    if (a.requested_by !== actorId && (await this.svc.projectRole(actorId, a.project_id)) !== "admin")
      throw forbidden("Seuls le demandeur et les administrateurs du projet retirent cette demande");
    if (a.status !== "en_attente") throw badRequest("Cette demande n'est plus en attente");
    await this.svc.db.tx(async (q) => {
      await q.query("UPDATE project_arbitrations SET status = 'retire' WHERE org_id = $1 AND id = $2", [orgId, id]);
      await q.query("UPDATE projects SET decision_needed = '' WHERE id = $1 AND decision_needed = $2", [
        a.project_id,
        a.question,
      ]);
    });
    await this.svc.log(actorId, "arbitration.withdrawn", { orgId, projectId: a.project_id, data: { id } });
    return this.row(orgId, id);
  }
}

type Id = { Params: { id: string } };
export function portfolioRoutes(r: FastifyInstance, p: Portfolio) {
  r.get("/api/portfolio/review", async (req) => p.review(req.userId, req.orgId));
  r.get("/api/arbitrations", async (req) => {
    const q = z.object({ status: z.enum(["en_attente", "tranche", "retire"]).optional() }).parse(req.query ?? {});
    return p.list(req.userId, req.orgId, q.status);
  });
  r.get<Id>("/api/projects/:id/arbitrations", async (req) => p.ofProject(req.userId, req.params.id));
  r.post<Id>("/api/projects/:id/arbitrations", async (req) => p.ask(req.userId, req.params.id, Ask.parse(req.body)));
  r.post<Id>("/api/arbitrations/:id/decide", async (req) =>
    p.decide(req.userId, req.orgId, req.params.id, Decide.parse(req.body)),
  );
  r.post<Id>("/api/arbitrations/:id/withdraw", async (req) => p.withdraw(req.userId, req.orgId, req.params.id));
}
