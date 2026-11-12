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
      lead_name: expect.stringContaining("Karim"),
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
