import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Thème 1 de l'analyse (docs/ANALYSE-MODULES.md) : droits et profils cohérents. Qui dirige une entité a un profil
 * de chef ; qui modifie voit ; les indicateurs de la DG ont leur propre droit ; un chef prépare le plan de son entité
 * et de celles qui lui sont rattachées ; le responsable d'une équipe la gère.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
  // Le jeu de test fait de Fiston et Karim des chefs : on libère leurs entités pour pouvoir changer leur profil
  await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id IN ('u_hugo', 'u_karim')");
});
afterEach(() => g.ctx.app.close());

type Any = any;
const root = async () => (await g.api("u_alice", "GET", "/api/org/units")).body[0].id as string;
const unit = async (name: string, parent_id?: string, manager_id?: string) =>
  (await g.api("u_alice", "POST", "/api/org/units", { name, parent_id: parent_id ?? (await root()), manager_id })).body
    .id as string;

describe("chef d'entité et profil (A-3, S-3)", () => {
  it("refuse de nommer chef une personne dont le profil ne permet pas de diriger une entité", async () => {
    await g.promote("u_hugo", "Agent");
    const create = await g.api("u_alice", "POST", "/api/org/units", {
      name: "Service essai",
      parent_id: await root(),
      manager_id: "u_hugo",
    });
    expect(create.status).toBe(400);
    expect(create.body.error).toMatch(/n'a pas un profil qui permet de diriger une entité/);
    const u = await unit("Service essai");
    const patch = await g.api("u_alice", "PATCH", `/api/units/${u}`, { manager_id: "u_hugo" });
    expect(patch.status).toBe(400);
    for (const name of ["Stagiaire", "Lecture seule"]) {
      await g.promote("u_hugo", name);
      expect((await g.api("u_alice", "PATCH", `/api/units/${u}`, { manager_id: "u_hugo" })).status).toBe(400);
    }
    await g.promote("u_hugo", "Chef d'entité");
    expect((await g.api("u_alice", "PATCH", `/api/units/${u}`, { manager_id: "u_hugo" })).status).toBe(200);
  });

  it("un chef en poste ne peut pas recevoir un profil qui ne permet pas de diriger", async () => {
    await g.promote("u_hugo", "Chef d'entité");
    await unit("Service dirigé", undefined, "u_hugo");
    const back = await g.promote("u_hugo", "Agent");
    expect(back.status).toBe(400);
    expect(back.body.error).toMatch(/dirige .*Service dirigé/);
    const off = await g.api("u_alice", "PUT", "/api/org/members/u_hugo/permissions", {
      overrides: { "units.lead": false },
    });
    expect(off.status).toBe(400);
  });

  it("les profils de chef portent le droit de diriger une entité, pas ceux d'agent", async () => {
    const profiles = (await g.api("u_alice", "GET", "/api/org/profiles")).body as Any[];
    const by = (n: string) => profiles.find((p) => p.name === n)!.permissions as string[];
    for (const n of ["Chef d'entité", "DGA", "DG"]) expect(by(n)).toContain("units.lead");
    for (const n of ["Agent", "Stagiaire", "Consultant", "Lecture seule", "Assistant(e) de direction"])
      expect(by(n)).not.toContain("units.lead");
  });
});

describe("risques et indicateurs (RI-1, RI-2)", () => {
  it("qui gère les risques voit le registre, et lit les indicateurs sans pouvoir les modifier", async () => {
    await g.promote("u_hugo", "Chef d'entité");
    await g.api("u_alice", "POST", "/api/risks", { title: "Retard des relevés", probability: 3, impact: 3 });
    const list = await g.api("u_hugo", "GET", "/api/risks");
    expect(list.status).toBe(200);
    expect(list.body.map((r: Any) => r.title)).toContain("Retard des relevés");
    expect((await g.api("u_hugo", "GET", "/api/indicators")).status).toBe(200);
    const ind = await g.api("u_hugo", "POST", "/api/indicators", { name: "Taux", target: 10 });
    expect(ind.status).toBe(403);
    const mine = await g.api("u_alice", "POST", "/api/indicators", { name: "Communes couvertes", target: 40 });
    expect((await g.api("u_hugo", "PATCH", `/api/indicators/${mine.body.id}`, { target: 1 })).status).toBe(403);
    expect((await g.api("u_hugo", "PATCH", `/api/indicators/${mine.body.id}`, { result: 5 })).status).toBe(403);
  });

  it("le responsable d'un risque le voit et met à jour sa parade et son état, sans toucher au reste", async () => {
    await g.promote("u_hugo", "Agent");
    const r = (
      await g.api("u_alice", "POST", "/api/risks", {
        title: "Indisponibilité des images satellites",
        probability: 4,
        impact: 4,
        owner_id: "u_hugo",
      })
    ).body;
    await g.api("u_alice", "POST", "/api/risks", { title: "Autre risque", probability: 1, impact: 1 });
    const list = await g.api("u_hugo", "GET", "/api/risks");
    expect(list.status).toBe(200);
    expect(list.body.map((x: Any) => x.title)).toEqual(["Indisponibilité des images satellites"]);
    const ok = await g.api("u_hugo", "PATCH", `/api/risks/${r.id}`, {
      mitigation: "Convention avec un second fournisseur",
      status: "mitigated",
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ mitigation: "Convention avec un second fournisseur", status: "mitigated" });
    const more = await g.api("u_hugo", "PATCH", `/api/risks/${r.id}`, { probability: 1 });
    expect(more.status).toBe(403);
    expect(more.body.error).toMatch(/parade et l'état/);
    expect((await g.api("u_hugo", "POST", "/api/risks", { title: "X", probability: 1, impact: 1 })).status).toBe(403);
  });

  it("le droit sur les indicateurs est distinct : la DG et le DGA l'ont, le chef d'entité non", async () => {
    const profiles = (await g.api("u_alice", "GET", "/api/org/profiles")).body as Any[];
    const by = (n: string) => profiles.find((p) => p.name === n)!.permissions as string[];
    expect(by("DG")).toContain("indicators.manage");
    expect(by("DGA")).toContain("indicators.manage");
    expect(by("Chef d'entité")).not.toContain("indicators.manage");
    expect(by("Chef d'entité")).toContain("risks.manage");
  });
});

describe("plans de travail (PT-1)", () => {
  it("un chef prépare le plan de son entité et des entités rattachées, pas celui d'une autre direction", async () => {
    await g.promote("u_hugo", "Chef d'entité");
    const dir = await unit("Direction A", undefined, "u_hugo");
    const svc = await unit("Service A1", dir);
    const other = await unit("Direction B");
    const own = await g.api("u_hugo", "POST", "/api/plans", { unit_id: dir, year: 2027, title: "Plan A" });
    expect(own.status).toBe(200);
    expect((await g.api("u_hugo", "POST", "/api/plans", { unit_id: svc, year: 2027, title: "Plan A1" })).status).toBe(
      200,
    );
    const refused = await g.api("u_hugo", "POST", "/api/plans", { unit_id: other, year: 2027, title: "Plan B" });
    expect(refused.status).toBe(403);
    expect(refused.body.error).toMatch(/votre entité/);
    // Le plan d'une autre direction, préparé par la DG : le chef le lit sans pouvoir le modifier ni le supprimer
    const b = (await g.api("u_alice", "POST", "/api/plans", { unit_id: other, year: 2027, title: "Plan B" })).body;
    const read = await g.api("u_hugo", "GET", `/api/plans/${b.id}`);
    expect(read.status).toBe(200);
    expect(read.body.can).toMatchObject({ edit: false, submit: false });
    expect((await g.api("u_hugo", "POST", `/api/plans/${b.id}/activities`, { title: "Ajout" })).status).toBe(403);
    expect((await g.api("u_hugo", "POST", `/api/plans/${b.id}/submit`)).status).toBe(403);
    expect((await g.api("u_hugo", "DELETE", `/api/plans/${b.id}`)).status).toBe(403);
    expect((await g.api("u_hugo", "GET", `/api/plans/${own.body.id}`)).body.can.edit).toBe(true);
  });

  it("le droit de préparer tous les plans revient au pilotage (DG, DGA) et peut être accordé au service du plan", async () => {
    const profiles = (await g.api("u_alice", "GET", "/api/org/profiles")).body as Any[];
    const by = (n: string) => profiles.find((p) => p.name === n)!.permissions as string[];
    expect(by("DG")).toContain("plans.manage_all");
    expect(by("DGA")).toContain("plans.manage_all");
    expect(by("Chef d'entité")).not.toContain("plans.manage_all");
    await g.promote("u_hugo", "Chef d'entité");
    const other = await unit("Direction C");
    await g.api("u_alice", "PUT", "/api/org/members/u_hugo/permissions", { overrides: { "plans.manage_all": true } });
    expect((await g.api("u_hugo", "POST", "/api/plans", { unit_id: other, year: 2027, title: "Plan C" })).status).toBe(
      200,
    );
  });
});

describe("équipes (EQ-1)", () => {
  it("le responsable d'une équipe en gère les membres, même si son profil n'a pas le droit de gérer les équipes", async () => {
    await g.promote("u_hugo", "Agent");
    const t = (await g.api("u_alice", "POST", "/api/teams", { name: "Comité de rédaction (essai)" })).body;
    await g.api("u_alice", "PUT", `/api/teams/${t.id}/members/u_hugo`, { role: "lead" });
    await g.api("u_alice", "PUT", "/api/org/members/u_hugo/permissions", { overrides: { "teams.manage": false } });
    const add = await g.api("u_hugo", "PUT", `/api/teams/${t.id}/members/u_karim`, { role: "member" });
    expect(add.status).toBe(200);
    expect((await g.api("u_hugo", "PATCH", `/api/teams/${t.id}`, { description: "Revue des textes" })).status).toBe(
      200,
    );
    // Un simple membre ne la gère pas
    await g.promote("u_karim", "Agent");
    expect((await g.api("u_karim", "PATCH", `/api/teams/${t.id}`, { description: "Non" })).status).toBe(403);
  });
});
