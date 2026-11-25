import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Portefeuille de projets. La revue de portefeuille confronte la santé déclarée de chaque projet à sa santé calculée
 * d'après les faits (calendrier, livrables, budget, tâches, arbitrage en attente), raisons écrites, et signale les
 * écarts. Le chef de projet demande un arbitrage à la DG (question, contexte, options, recommandation) ; la DG
 * tranche — jamais celui qui a demandé — et la décision s'inscrit au registre des décisions, rattachée au projet.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const mkProject = async (name: string) => {
  const p = (await g.api("u_alice", "POST", "/api/projects", { name })).body.id as string;
  await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_karim`, { role: "admin" });
  await g.api("u_alice", "PUT", `/api/projects/${p}/governance`, { lead_id: "u_karim" });
  return p;
};
const notes = (user: string) => g.ctx.db.query<Any>("SELECT kind FROM notifications WHERE user_id = $1", [user]);

describe("revue de portefeuille", () => {
  it("calcule la santé d'après les faits et signale l'écart avec la santé déclarée", async () => {
    const p = await mkProject("Projet déclaré serein (essai)");
    // Déclaré « dans les temps », mais l'échéance du projet est passée et le budget est dépassé
    await g.ctx.db.query(
      "UPDATE projects SET status = 'on_track', due_on = $2, created_at = now() - interval '90 days' WHERE id = $1",
      [p, day(-5)],
    );
    await g.api("u_alice", "PUT", `/api/projects/${p}/governance`, { budget_planned: 1000, budget_spent: 1500 });
    await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Rapport", due_on: day(-10) });
    const calm = await mkProject("Projet tranquille (essai)");
    await g.ctx.db.query("UPDATE projects SET due_on = $2 WHERE id = $1", [calm, day(200)]);

    const r = await g.api("u_alice", "GET", "/api/portfolio/review");
    expect(r.status).toBe(200);
    const row = r.body.projects.find((x: Any) => x.id === p);
    expect(row).toMatchObject({
      health_declared: "on_track",
      health_computed: "off_track",
      divergent: true,
      lead_name: expect.stringContaining("Fiston"),
      tasks: { overdue: 1 },
      budget: { planned: 1000, spent: 1500, consumed: 150 },
    });
    expect(row.reasons.join(" ")).toMatch(/échéance/i);
    expect(row.reasons.join(" ")).toMatch(/budget/i);
    const ok = r.body.projects.find((x: Any) => x.id === calm);
    expect(ok).toMatchObject({ health_computed: "on_track", divergent: false });
    expect(r.body.summary.divergent).toBeGreaterThanOrEqual(1);
    // Les projets en écart viennent en tête
    expect(r.body.projects[0].divergent).toBe(true);
  });
});

describe("arbitrages", () => {
  it("le chef de projet demande, la DG tranche, la décision s'inscrit au registre", async () => {
    const p = await mkProject("Schéma régional (essai)");
    // Une demande d'arbitrage offre au moins deux options
    const thin = await g.api("u_karim", "POST", `/api/projects/${p}/arbitrations`, {
      question: "Quel tracé retenir ?",
      options: [{ label: "Tracé nord" }],
    });
    expect(thin.status).toBe(400);
    const a = await g.api("u_karim", "POST", `/api/projects/${p}/arbitrations`, {
      question: "Quel tracé retenir pour la desserte ?",
      context: "Deux tracés étudiés ; coûts et délais différents.",
      options: [
        { label: "Tracé nord", consequences: "Plus court, coût élevé" },
        { label: "Tracé sud", consequences: "Plus long, moins cher" },
      ],
      recommendation: 1,
      wanted_by: day(10),
    });
    expect(a.status).toBe(200);
    expect(a.body).toMatchObject({ status: "en_attente", requested_by: "u_karim", recommendation: 1 });
    expect((await notes("u_alice")).some((n: Any) => n.kind === "arbitration.requested")).toBe(true);
    // La question remonte au tableau de bord DG comme décision attendue
    const pil = (await g.api("u_alice", "GET", "/api/pilotage")).body;
    expect(pil.decisions.some((d: Any) => d.id === p)).toBe(true);
    // La DG voit les arbitrages en attente
    const list = (await g.api("u_alice", "GET", "/api/arbitrations?status=en_attente")).body as Any[];
    expect(list.map((x) => x.id)).toContain(a.body.id);

    // Celui qui demande ne tranche pas ; un agent sans droit non plus
    await g.promote("u_karim");
    expect((await g.api("u_karim", "POST", `/api/arbitrations/${a.body.id}/decide`, { option: 0 })).status).toBe(403);
    expect((await g.api("u_alice", "POST", `/api/arbitrations/${a.body.id}/decide`, { option: 7 })).status).toBe(400);

    const d = await g.api("u_alice", "POST", `/api/arbitrations/${a.body.id}/decide`, {
      option: 1,
      note: "Retenir le tracé sud, étaler le chantier",
      due_on: day(30),
    });
    expect(d.status).toBe(200);
    expect(d.body).toMatchObject({ status: "tranche", decided_option: 1, decided_by: "u_alice" });
    expect(d.body.decision_id).toBeTruthy();
    const reg = (await g.api("u_alice", "GET", "/api/decisions")).body as Any[];
    const dec = reg.find((x) => x.id === d.body.decision_id);
    expect(dec).toMatchObject({ project_id: p, owner_id: "u_karim" });
    expect(dec.content).toMatch(/Tracé sud/);
    expect((await notes("u_karim")).some((n: Any) => n.kind === "arbitration.decided")).toBe(true);
    // La décision attendue disparaît du projet ; une demande tranchée ne se rejoue pas
    const gov = (await g.api("u_alice", "GET", `/api/projects/${p}/governance`)).body;
    expect(gov.decision_needed).toBe("");
    expect((await g.api("u_alice", "POST", `/api/arbitrations/${a.body.id}/decide`, { option: 0 })).status).toBe(400);
    // L'historique du projet garde la demande et sa réponse
    const hist = (await g.api("u_karim", "GET", `/api/projects/${p}/arbitrations`)).body as Any[];
    expect(hist[0]).toMatchObject({ id: a.body.id, status: "tranche" });
  });

  it("le demandeur retire sa demande ; une personne extérieure au projet ne demande rien", async () => {
    const p = await mkProject("Atlas (essai)");
    const a = (
      await g.api("u_karim", "POST", `/api/projects/${p}/arbitrations`, {
        question: "Faut-il prolonger la mission ?",
        options: [{ label: "Oui" }, { label: "Non" }],
      })
    ).body;
    await g.login("u_chloe");
    expect(
      (
        await g.api("u_chloe", "POST", `/api/projects/${p}/arbitrations`, {
          question: "x",
          options: [{ label: "a" }, { label: "b" }],
        })
      ).status,
    ).toBeGreaterThanOrEqual(403);
    expect((await g.api("u_chloe", "POST", `/api/arbitrations/${a.id}/withdraw`, {})).status).toBeGreaterThanOrEqual(
      403,
    );
    const w = await g.api("u_karim", "POST", `/api/arbitrations/${a.id}/withdraw`, {});
    expect(w.body.status).toBe("retire");
    expect((await g.api("u_alice", "GET", `/api/projects/${p}/governance`)).body.decision_needed).toBe("");
  });
});

describe("une seule porte pour les décisions", () => {
  it("inscrire au registre une décision sur un projet clôt l'arbitrage en attente", async () => {
    const p = await mkProject("Projet arbitré au registre (essai)");
    const a = (
      await g.api("u_karim", "POST", `/api/projects/${p}/arbitrations`, {
        question: "Faut-il recruter ?",
        options: [{ label: "Oui" }, { label: "Non" }],
      })
    ).body;
    const d = await g.api("u_alice", "POST", "/api/decisions", {
      title: "Recruter un cartographe",
      content: "Décision d'essai",
      decided_on: day(0),
      project_id: p,
      owner_id: "u_karim",
      due_on: day(30),
    });
    expect(d.status).toBe(200);
    const hist = (await g.api("u_alice", "GET", `/api/projects/${p}/arbitrations`)).body as Any[];
    expect(hist.find((x) => x.id === a.id)).toMatchObject({ status: "tranche", decision_id: d.body.id });
    const review = (await g.api("u_alice", "GET", "/api/portfolio/review")).body;
    expect(review.projects.find((x: Any) => x.id === p).arbitration).toBeNull();
  });

  it("la décision attendue ne se modifie pas à la main pendant un arbitrage", async () => {
    const p = await mkProject("Projet verrouillé (essai)");
    await g.api("u_karim", "POST", `/api/projects/${p}/arbitrations`, {
      question: "Quel prestataire ?",
      options: [{ label: "A" }, { label: "B" }],
    });
    const r = await g.api("u_alice", "PUT", `/api/projects/${p}/governance`, { decision_needed: "Autre chose" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/arbitrage/);
    // Les autres champs restent modifiables
    expect((await g.api("u_alice", "PUT", `/api/projects/${p}/governance`, { budget_planned: 10 })).status).toBe(200);
  });

  it("une activité demande aussi un arbitrage ; la décision s'inscrit rattachée à l'activité", async () => {
    const act = (
      await g.api("u_alice", "POST", "/api/activities", {
        kind: "commission",
        title: "Commission foncière (essai)",
        lead_id: "u_karim",
      })
    ).body;
    await g.promote("u_karim");
    const a = await g.api("u_karim", "POST", `/api/activities/${act.id}/arbitrations`, {
      question: "Quelle position défendre ?",
      options: [{ label: "Position A" }, { label: "Position B" }],
      recommendation: 0,
    });
    expect(a.status).toBe(200);
    expect(a.body).toMatchObject({ activity_id: act.id, project_id: null, status: "en_attente" });
    expect((await g.api("u_alice", "GET", `/api/activities/${act.id}`)).body.decision_needed).toBe(
      "Quelle position défendre ?",
    );
    expect(((await g.api("u_alice", "GET", "/api/arbitrations")).body as Any[]).some((x) => x.id === a.body.id)).toBe(
      true,
    );
    // Une décision a une échéance d'exécution (DEC-2)
    const d = await g.api("u_alice", "POST", `/api/arbitrations/${a.body.id}/decide`, { option: 0, due_on: day(30) });
    expect(d.status).toBe(200);
    const reg = (await g.api("u_alice", "GET", "/api/decisions")).body as Any[];
    expect(reg.find((x) => x.id === d.body.decision_id)?.source).toMatchObject({ kind: "activity", id: act.id });
    expect((await g.api("u_alice", "GET", `/api/activities/${act.id}`)).body.decision_needed).toBe("");
    const hist = (await g.api("u_alice", "GET", `/api/activities/${act.id}/arbitrations`)).body as Any[];
    expect(hist[0]).toMatchObject({ id: a.body.id, status: "tranche" });
  });
});

describe("une seule santé, un seul retard", () => {
  it("le tableau de bord DG et la vue par direction reprennent la santé calculée de la revue", async () => {
    const p = await mkProject("Projet échu déclaré serein (essai)");
    await g.ctx.db.query(
      "UPDATE projects SET status = 'on_track', due_on = $2, created_at = now() - interval '60 days' WHERE id = $1",
      [p, day(-3)],
    );
    const review = (await g.api("u_alice", "GET", "/api/portfolio/review")).body;
    expect(review.projects.find((x: Any) => x.id === p).health_computed).toBe("off_track");
    const pil = (await g.api("u_alice", "GET", "/api/pilotage")).body;
    const item = pil.items.find((x: Any) => x.id === p);
    expect(item).toMatchObject({ health: "off_track", health_declared: "on_track" });
  });

  it("un retard est une tâche principale échue : les sous-tâches ne comptent pas en double", async () => {
    const [unit] = await g.units(1);
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_karim'", [
      unit,
      g.org,
    ]);
    await g.ctx.db.query("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = 'u_karim'");
    const p = await mkProject("Projet aux sous-tâches (essai)");
    const t = (
      await g.api("u_alice", "POST", "/api/tasks", {
        project_id: p,
        title: "Mère",
        assignee_id: "u_karim",
        due_on: day(-2),
      })
    ).body;
    await g.api("u_alice", "POST", "/api/tasks", {
      project_id: p,
      parent_id: t.id,
      title: "Fille",
      assignee_id: "u_karim",
      due_on: day(-2),
    });
    const d = (await g.api("u_alice", "GET", `/api/pilotage/directions/${unit}`)).body;
    expect(d.stats.tasks).toMatchObject({ open: 1, overdue: 1 });
  });
});

describe("le budget d'un projet ne sort par aucune route de santé", () => {
  it("un lecteur sans droit budgétaire ne reçoit aucune raison budgétaire, ni de la revue ni de la santé", async () => {
    await g.login("u_chloe");
    const team = (await g.api("u_alice", "POST", "/api/teams", { name: "Équipe ouverte (essai)", visibility: "public" }))
      .body;
    const p = (await g.api("u_alice", "POST", "/api/projects", { name: "Projet à budget (essai)", team_id: team.id }))
      .body.id as string;
    await g.ctx.db.query("UPDATE projects SET access = 'team' WHERE id = $1", [p]);
    await g.ctx.db.query("DELETE FROM memberships WHERE project_id = $1 AND user_id = 'u_chloe'", [p]);
    await g.api("u_alice", "PUT", `/api/projects/${p}/governance`, { budget_planned: 1000, budget_spent: 1500 });
    // Chloé lit le projet mais n'a ni rôle, ni entité, ni droit de pilotage : le budget ne la concerne pas
    expect(await g.ctx.svc.seesBudget("u_chloe", g.org, p)).toBe(false);

    const sante = (await g.api("u_chloe", "GET", "/api/projects/health")).body as Any[];
    const ligne = sante.find((x) => x.id === p);
    expect(ligne).toBeDefined();
    expect(ligne.reasons.join(" ")).not.toMatch(/budget/i);
    expect(JSON.stringify(ligne)).not.toMatch(/150|1500/);

    // La direction, elle, lit la raison budgétaire
    const dg = (await g.api("u_alice", "GET", "/api/projects/health")).body as Any[];
    expect(dg.find((x) => x.id === p).reasons.join(" ")).toMatch(/budget/i);
  });

  it("les deux routes passent par le même masque", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./portfolio.ts", import.meta.url), "utf8");
    const appels = src.match(/maskBudgetReasons/g) ?? [];
    expect(appels.length).toBeGreaterThanOrEqual(3); // la définition, review() et health()
  });
});

describe("une demande d'arbitrage ne part qu'à ceux qui peuvent ouvrir le dossier", () => {
  const demande = (p: string, who = "u_karim") =>
    g.api(who, "POST", `/api/projects/${p}/arbitrations`, {
      question: "Faut-il réattribuer le marché de Kolwezi ?",
      options: [{ label: "Oui" }, { label: "Non" }],
    });
  const titres = async (u: string) =>
    JSON.stringify(await g.ctx.db.query("SELECT title, body FROM notifications WHERE user_id = $1", [u]));

  it("un détenteur de decisions.record sans accès au dossier privé ne reçoit rien", async () => {
    const p = await mkProject("Dossier privé de la DG (essai)");
    await g.ctx.db.query("UPDATE projects SET access = 'private' WHERE id = $1", [p]);
    await g.api("u_alice", "PUT", "/api/org/members/u_hugo/permissions", { overrides: { "decisions.record": true } });
    expect((await g.ctx.svc.permissionsOf("u_hugo", g.org)).includes("decisions.record")).toBe(true);
    expect(await g.ctx.svc.projectRole("u_hugo", p)).toBeFalsy();

    expect((await demande(p)).status).toBe(200);
    expect(await titres("u_hugo")).not.toMatch(/Kolwezi|Dossier privé/);
    // Celui qui peut ouvrir le dossier, lui, est prévenu
    expect(await titres("u_alice")).toMatch(/Kolwezi/);
  });

  it("si personne ne peut décider, la demande ne reste pas muette : le demandeur en est informé", async () => {
    const p = await mkProject("Dossier sans décideur (essai)");
    // Alice est la seule à détenir le droit : en demandant elle-même, personne d'autre ne reçoit l'avis
    const r = await demande(p, "u_alice");
    expect(r.status).toBe(200);
    const mine = await g.ctx.db.query<Any>("SELECT kind, title FROM notifications WHERE user_id = 'u_alice' AND kind LIKE 'arbitration.%'");
    expect(mine.some((n) => n.kind === "arbitration.unrouted")).toBe(true);
  });
});
