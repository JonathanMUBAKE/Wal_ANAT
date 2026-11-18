import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Thème 4 de l'analyse (docs/ANALYSE-MODULES.md) : une seule règle de calcul. Un retard se compte de la même façon
 * sur toutes les pages ; l'état d'un projet est le calculé partout ; une « décision attendue » est une seule notion ;
 * un indicateur dont l'outil connaît la valeur se calcule seul ; l'avancement d'un plan est pondéré.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("une seule règle des retards (A-2, P-1)", () => {
  it("le compteur du tableau de bord et la ligne « Institution » de la vue par direction donnent le même chiffre", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "editor" });
    const late = (await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Échue", assignee_id: "u_hugo", due_on: day(-3) })).body;
    // Une sous-tâche échue ne compte pas : la tâche principale porte le retard
    await g.api("u_alice", "POST", "/api/tasks", { project_id: p, parent_id: late.id, title: "Sous-tâche échue", assignee_id: "u_hugo", due_on: day(-3) });
    const pil = (await g.api("u_alice", "GET", "/api/pilotage")).body;
    const dir = (await g.api("u_alice", "GET", "/api/pilotage/directions")).body;
    expect(pil.counters.retards_detail.taches).toBe(dir.institution.tasks.overdue);
    expect(pil.counters.retards_detail.taches).toBeGreaterThan(0);
    expect(pil.counters.retards_detail).toHaveProperty("suites");
    // La règle est écrite une fois et renvoyée avec les chiffres
    expect(pil.counters.late_rule).toMatch(/tâche principale/);
  });

  it("le registre d'une entité compte comme les autres pages : sous-tâches exclues", async () => {
    const [u] = await g.units(1);
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [u]);
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_hugo'", [u, g.org]);
    const board = (await g.api("u_karim", "GET", `/api/units/${u}/board`)).body;
    const t = (await g.api("u_karim", "POST", "/api/tasks", { project_id: board.project_id ?? board.project.id, title: "Relevés", assignee_id: "u_hugo", due_on: day(-2) })).body;
    await g.api("u_karim", "POST", "/api/tasks", { project_id: t.project_id, parent_id: t.id, title: "Sous", assignee_id: "u_hugo", due_on: day(-2) });
    const dash = (await g.api("u_karim", "GET", `/api/units/${u}/dashboard`)).body;
    expect(dash.kpis.overdue).toBe(1);
  });
});

describe("l'état d'un projet est le calculé, partout (F-1)", () => {
  it("la liste des projets donne l'état calculé et le déclaré quand ils divergent", async () => {
    const p = await g.project();
    await g.api("u_alice", "PATCH", `/api/projects/${p}`, { due_on: day(-5), status: "on_track" });
    await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Ouverte" });
    const list = (await g.api("u_alice", "GET", "/api/projects/health")).body as Any[];
    const row = list.find((x) => x.id === p);
    expect(row).toMatchObject({ health_declared: "on_track", health_computed: "off_track", divergent: true });
    expect(row.reasons.join(" ")).toMatch(/échéance du projet dépassée/);
    // Le même chiffre que la revue de portefeuille
    const review = (await g.api("u_alice", "GET", "/api/portfolio/review")).body;
    expect(review.projects.find((x: Any) => x.id === p).health_computed).toBe("off_track");
  });
});

describe("une seule notion de « décision attendue » (F-3)", () => {
  it("dossier marqué « décision attendue » ou arbitrage en attente : compté une fois, même chiffre partout", async () => {
    const p = await g.project();
    await g.ctx.db.query("UPDATE projects SET decision_needed = 'Choisir le prestataire' WHERE id = $1", [p]);
    const q = await g.project();
    await g.api("u_alice", "POST", `/api/projects/${q}/arbitrations`, {
      question: "Quel site pilote ?",
      options: [{ label: "Kananga" }, { label: "Mbuji-Mayi" }],
    });
    const pil = (await g.api("u_alice", "GET", "/api/pilotage")).body;
    const review = (await g.api("u_alice", "GET", "/api/portfolio/review")).body;
    const mine = pil.decisions.filter((d: Any) => [p, q].includes(d.id));
    expect(mine).toHaveLength(2);
    const inReview = review.projects.filter((r: Any) => [p, q].includes(r.id) && r.decision_expected);
    expect(inReview).toHaveLength(2);
    expect(review.summary.decisions_expected).toBe(review.projects.filter((r: Any) => r.decision_expected).length);
  });
});

describe("indicateurs calculés quand la source est dans l'outil (RI-4, P-2)", () => {
  it("un indicateur relié aux plans approuvés se calcule seul et ne se saisit plus", async () => {
    const [u] = await g.units(1);
    const plan = (await g.api("u_alice", "POST", "/api/plans", { unit_id: u, year: Number(day().slice(0, 4)), title: "Plan" })).body;
    await g.ctx.db.query("UPDATE work_plans SET status = 'approved' WHERE id = $1", [plan.id]);
    const i = await g.api("u_alice", "POST", "/api/indicators", { name: "Plans approuvés", target: 8, computed_from: "plans_approved" });
    expect(i.status).toBe(200);
    expect(i.body).toMatchObject({ computed_from: "plans_approved", computed: true });
    const list = (await g.api("u_alice", "GET", "/api/indicators")).body as Any[];
    const approved = (await g.ctx.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM work_plans WHERE org_id = $1 AND status = 'approved' AND year = $2",
      [g.org, Number(day().slice(0, 4))],
    ))!.n;
    expect(list.find((x) => x.id === i.body.id).result).toBe(approved);
    const typed = await g.api("u_alice", "PATCH", `/api/indicators/${i.body.id}`, { result: 99 });
    expect(typed.status).toBe(400);
    expect(typed.body.error).toMatch(/calculé par l'outil/);
    // Le tableau de bord montre la même valeur
    const pil = (await g.api("u_alice", "GET", "/api/pilotage")).body;
    expect(pil.indicators.find((x: Any) => x.id === i.body.id)).toMatchObject({ result: approved, computed: true });
  });

  it("refuse une source inconnue ; un indicateur sans source reste saisi", async () => {
    expect((await g.api("u_alice", "POST", "/api/indicators", { name: "X", target: 1, computed_from: "inconnu" })).status).toBe(400);
    const free = (await g.api("u_alice", "POST", "/api/indicators", { name: "Provinces couvertes", target: 26, result: 11 })).body;
    expect(free).toMatchObject({ computed: false, result: 11 });
  });
});

describe("avancement d'un plan pondéré (PT-3)", () => {
  it("chaque activité pèse selon son poids ; sans poids saisi, la moyenne reste simple", async () => {
    const [u] = await g.units(1);
    const plan = (await g.api("u_alice", "POST", "/api/plans", { unit_id: u, year: 2031, title: "Plan pondéré" })).body;
    await g.api("u_alice", "POST", `/api/plans/${plan.id}/activities`, { title: "Révision du schéma national" });
    await g.api("u_alice", "POST", `/api/plans/${plan.id}/activities`, { title: "Atelier" });
    const acts = (await g.api("u_alice", "GET", `/api/plans/${plan.id}`)).body.activities as Any[];
    const big = acts.find((a) => a.title.startsWith("Révision"));
    const small = acts.find((a) => a.title === "Atelier");
    // L'avancement se déclare sur un plan approuvé ; on le pose directement pour isoler le calcul
    await g.ctx.db.query("UPDATE plan_activities SET progress = 20 WHERE id = $1", [big.id]);
    await g.ctx.db.query("UPDATE plan_activities SET progress = 100 WHERE id = $1", [small.id]);
    const avg = async () =>
      ((await g.api("u_alice", "GET", "/api/plans")).body as Any[]).find((x) => x.id === plan.id).progress;
    expect(await avg()).toBe(60);
    const w = await g.api("u_alice", "PATCH", `/api/plan-activities/${big.id}`, { weight: 4 });
    expect(w.status).toBe(200);
    // (20 × 4 + 100 × 1) / 5 = 36
    expect(await avg()).toBe(36);
    expect((await g.api("u_alice", "PATCH", `/api/plan-activities/${big.id}`, { weight: 0 })).status).toBe(400);
    expect((await g.api("u_alice", "GET", `/api/plans/${plan.id}`)).body.progress).toBe(36);
  });
});

describe("libellé d'une réunion (R-1)", () => {
  it("sans titre, une réunion prend son type comme titre", async () => {
    const m = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Comité de direction",
        meeting_date: day(3),
        writer_id: "u_karim",
      })
    ).body;
    expect(m.title).toBe("Comité de direction");
  });
});
