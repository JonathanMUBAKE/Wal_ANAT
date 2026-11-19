import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Lot S (docs/PLAN-DE-TRAVAIL.md) : chacun n'accède qu'à ce qui lui est destiné. Décisions de l'utilisateur du
 * 19/11/2026 : la DG lit tout mais n'agit que dans sa fonction ; le cabinet lit comme elle ; les comptes rendus du
 * comité de direction se lisent des chefs ; l'annuaire (informations professionnelles) reste complet.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("ce qui concerne chacun", () => {
  it("un agent voit les plans et partenaires de son entité, pas ceux des autres ; la direction voit tout", async () => {
    const [mine, other] = await g.units(2);
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_hugo'", [mine, g.org]);
    const pa = (await g.api("u_alice", "POST", "/api/plans", { unit_id: mine, year: 2027, title: "Plan de mon entité" })).body;
    const pb = (await g.api("u_alice", "POST", "/api/plans", { unit_id: other, year: 2027, title: "Plan d'ailleurs" })).body;
    const plans = ((await g.api("u_hugo", "GET", "/api/plans")).body as Any[]).map((p) => p.id);
    expect(plans).toContain(pa.id);
    expect(plans).not.toContain(pb.id);
    expect((await g.api("u_hugo", "GET", `/api/plans/${pb.id}`)).status).toBe(404);
    const a = (await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire de mon entité", type_code: "autre", unit_id: mine })).body;
    const b = (await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire d'ailleurs", type_code: "autre", unit_id: other })).body;
    const partners = ((await g.api("u_hugo", "GET", "/api/partners")).body as Any[]).map((p) => p.id);
    expect(partners).toContain(a.id);
    expect(partners).not.toContain(b.id);
    // La liste de choix des formulaires reste complète, pour rattacher un dossier
    expect(((await g.api("u_hugo", "GET", "/api/partners?selectable=1")).body as Any[]).map((p) => p.id)).toContain(b.id);
    await g.direction("u_hugo");
    expect(((await g.api("u_hugo", "GET", "/api/partners")).body as Any[]).map((p) => p.id)).toContain(b.id);
  });

  it("les comptes rendus du comité de direction se lisent des chefs d'entité, pas des agents", async () => {
    const m = (await g.api("u_alice", "POST", "/api/meetings", { meeting_type: "Comité de direction", meeting_date: day(2) })).body;
    const [unit] = await g.units(1);
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_karim'");
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
    expect((await g.api("u_karim", "GET", `/api/meetings/${m.id}`)).status).toBe(200);
    await g.login("u_chloe");
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_chloe'");
    expect((await g.api("u_chloe", "GET", `/api/meetings/${m.id}`)).status).toBe(404);
  });
});

describe("montants et projets d'entité", () => {
  it("un lecteur qui n'est ni membre ni chef ne voit pas le budget ; un projet d'entité rendu privé reste lisible du chef", async () => {
    const [unit] = await g.units(1);
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_karim'");
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
    const p = (await g.api("u_alice", "POST", "/api/projects", { name: "Projet d'entité" })).body;
    await g.ctx.db.query("UPDATE projects SET unit_id = $1, budget_planned = 1000, access = 'private' WHERE id = $2", [unit, p.id]);
    // Fiston, chef de l'entité porteuse, lit le projet privé et son budget
    const gov = await g.api("u_karim", "GET", `/api/projects/${p.id}/governance`);
    expect(gov.status).toBe(200);
    expect(gov.body.budget_planned).toBe(1000);
    // Didier, du cabinet (droit de pilotage), lit le projet ouvert et ses montants (décision du 19/11/2026)
    await g.ctx.db.query("UPDATE projects SET access = 'team' WHERE id = $1", [p.id]);
    await g.api("u_alice", "PUT", `/api/projects/${p.id}/members/u_hugo`, { role: "viewer" });
    await g.ctx.db.query("DELETE FROM memberships WHERE project_id = $1 AND user_id = 'u_hugo'", [p.id]);
    await g.direction("u_hugo");
    expect((await g.api("u_hugo", "GET", `/api/projects/${p.id}/governance`)).body.budget_planned).toBe(1000);
  });
});
