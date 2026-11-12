import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Risques et indicateurs (docs/FONCTIONNEMENT-PAR-MODULE.md, I-12). Ils s'affichaient au tableau de bord DG sans
 * pouvoir être saisis. Un risque se rattache désormais à un projet (son équipe le voit dans le dossier) ; un indicateur
 * se rattache à une activité du plan de travail. Les profils qui portent ou pilotent les projets les gèrent.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;

describe("risques", () => {
  it("un risque se rattache à un projet ; l'équipe du projet le voit, même sans accès au pilotage", async () => {
    const p = (await g.api("u_alice", "POST", "/api/projects", { name: "Projet risqué (essai)" })).body.id;
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "editor" });
    const r = await g.api("u_alice", "POST", "/api/risks", {
      title: "Retard de livraison des données",
      probability: 4,
      impact: 3,
      owner_id: "u_hugo",
      mitigation: "Relance hebdomadaire du fournisseur",
      project_id: p,
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ project_id: p, score: 12 });
    // Hugo n'a pas le pilotage, mais il est dans le projet
    const sans = await g.api("u_hugo", "GET", "/api/risks");
    expect(sans.status).toBe(403);
    const mine = await g.api("u_hugo", "GET", `/api/risks?project_id=${p}`);
    expect(mine.status).toBe(200);
    expect(mine.body.map((x: Any) => x.title)).toEqual(["Retard de livraison des données"]);
    // Le registre de la DG nomme le projet
    const all = (await g.api("u_alice", "GET", "/api/risks")).body as Any[];
    expect(all.find((x) => x.id === r.body.id)).toMatchObject({ project_name: "Projet risqué (essai)" });
    // Un projet inconnu est refusé
    expect(
      (await g.api("u_alice", "POST", "/api/risks", { title: "X", probability: 1, impact: 1, project_id: "inconnu" }))
        .status,
    ).toBe(400);
    // Fermer un risque
    const closed = await g.api("u_alice", "PATCH", `/api/risks/${r.body.id}`, { status: "closed" });
    expect(closed.body.status).toBe("closed");
  });

  it("les profils qui portent ou pilotent les projets gèrent les risques et les indicateurs", async () => {
    const profiles = (await g.api("u_alice", "GET", "/api/org/profiles")).body as Any[];
    for (const name of ["DG", "DGA", "Chef d'entité"])
      expect(profiles.find((p) => p.name === name)?.permissions).toContain("risks.manage");
  });
});

describe("indicateurs", () => {
  it("un indicateur se rattache à une activité du plan de travail", async () => {
    const [unit] = await g.units(1);
    const plan = (await g.api("u_alice", "POST", "/api/plans", { unit_id: unit, year: 2027, title: "Plan 2027" })).body;
    const withAct = (
      await g.api("u_alice", "POST", `/api/plans/${plan.id}/activities`, {
        title: "Élaborer le schéma",
        responsible_id: "u_karim",
        target_value: 1,
        end_on: "2027-12-31",
      })
    ).body;
    const act = withAct.activities[0].id;
    const i = await g.api("u_alice", "POST", "/api/indicators", {
      name: "Communes couvertes par un schéma",
      unit_label: "communes",
      baseline: 10,
      target: 40,
      result: 18,
      plan_activity_id: act,
    });
    expect(i.status).toBe(200);
    expect(i.body).toMatchObject({ plan_activity_id: act, plan_activity_title: "Élaborer le schéma" });
    const list = (await g.api("u_alice", "GET", "/api/indicators")).body as Any[];
    expect(list.find((x) => x.id === i.body.id)).toMatchObject({ plan_activity_title: "Élaborer le schéma" });
    expect(
      (await g.api("u_alice", "POST", "/api/indicators", { name: "X", target: 1, plan_activity_id: "inconnue" }))
        .status,
    ).toBe(400);
  });
});
