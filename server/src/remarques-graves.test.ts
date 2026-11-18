import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Remarques graves restées hors des thèmes de la synthèse (docs/ANALYSE-MODULES.md) : E-1, E-2 (Mon entité),
 * F-2 (portefeuille du cabinet), DEC-2 (décision sans suivi), AD-2 (double authentification des comptes sensibles).
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("Mon entité : le responsable compte, les projets portés sont distingués (E-1, E-2)", () => {
  let unit: string;
  beforeEach(async () => {
    [unit] = await g.units(1);
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_karim'");
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id IN ('u_karim', 'u_hugo')", [
      unit,
      g.org,
    ]);
  });

  it("E-1 : les tâches du responsable comptent dans les chiffres de l'entité et il figure en tête de la charge", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_karim`, { role: "editor" });
    await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Note du chef", assignee_id: "u_karim", due_on: day(-2) });
    const dash = (await g.api("u_karim", "GET", `/api/units/${unit}/dashboard`)).body;
    expect(dash.kpis.overdue).toBeGreaterThanOrEqual(1);
    expect(dash.workload[0]).toMatchObject({ user_id: "u_karim", is_head: true });
    expect(dash.workload[0].overdue).toBeGreaterThanOrEqual(1);
  });

  it("E-2 : projets portés par l'entité et projets auxquels elle contribue, comptés à part", async () => {
    const carried = (await g.api("u_alice", "POST", "/api/projects", { name: "Projet porté" })).body;
    await g.ctx.db.query("UPDATE projects SET unit_id = $1 WHERE id = $2", [unit, carried.id]);
    await g.api("u_alice", "PUT", `/api/projects/${carried.id}/members/u_karim`, { role: "editor" });
    const helped = (await g.api("u_alice", "POST", "/api/projects", { name: "Projet aidé" })).body;
    await g.api("u_alice", "PUT", `/api/projects/${helped.id}/members/u_hugo`, { role: "editor" });
    await g.api("u_alice", "PUT", `/api/projects/${helped.id}/members/u_karim`, { role: "viewer" });
    const dash = (await g.api("u_karim", "GET", `/api/units/${unit}/dashboard`)).body;
    const role = (id: string) => dash.projects.find((x: Any) => x.id === id)?.role;
    expect(role(carried.id)).toBe("porte");
    expect(role(helped.id)).toBe("contribue");
    expect(dash.kpis.projects).toBe(dash.projects.filter((x: Any) => x.role === "porte").length);
    expect(dash.kpis.projects_contributed).toBe(dash.projects.filter((x: Any) => x.role === "contribue").length);
  });
});

describe("F-2 : le cabinet de la DG voit tout le portefeuille, hors projets privés", () => {
  it("un profil qui a le droit de pilotage lit les projets de l'institution", async () => {
    const team = (await g.api("u_alice", "POST", "/api/projects", { name: "Projet d'équipe", access: "team" })).body;
    const secret = await g.project();
    const before = ((await g.api("u_hugo", "GET", "/api/projects")).body as Any[]).map((p) => p.id);
    expect(before).not.toContain(team.id);
    await g.direction("u_hugo");
    const after = ((await g.api("u_hugo", "GET", "/api/projects")).body as Any[]).map((p) => p.id);
    expect(after).toContain(team.id);
    expect(after).not.toContain(secret);
    // Lecture seule : il ne modifie pas
    expect((await g.api("u_hugo", "PATCH", `/api/projects/${team.id}`, { name: "Autre" })).status).toBe(403);
  });
});

describe("DEC-2 : une décision a un chargé et une échéance, ou se déclare sans exécution", () => {
  const record = (body: Record<string, unknown>) =>
    g.api("u_alice", "POST", "/api/decisions", { title: "D", content: "Texte", decided_on: day(), ...body });

  it("refuse une décision sans chargé ou sans échéance", async () => {
    const r = await record({});
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/chargé d'exécution et une échéance/);
    expect((await record({ owner_id: "u_karim" })).status).toBe(400);
    expect((await record({ owner_id: "u_karim", due_on: day(10) })).status).toBe(200);
  });

  it("une décision sans exécution se marque comme telle et n'entre pas dans le suivi", async () => {
    const r = await record({ no_execution: true });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ no_execution: true, status: "executee", late: false });
    const open = ((await g.api("u_alice", "GET", "/api/decisions?status=a_executer")).body as Any[]).map((d) => d.id);
    expect(open).not.toContain(r.body.id);
  });
});

describe("AD-2 : double authentification des comptes sensibles", () => {
  it("sur un serveur exposé, un gestionnaire du courrier sans double authentification est arrêté", async () => {
    // Didier devient assistant de direction : il enregistre le courrier
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_hugo'");
    expect((await g.promote("u_hugo", "Assistant(e) de direction")).status).toBe(200);
    g.ctx.svc.requireAdminMfa = true;
    const r = await g.api("u_hugo", "POST", "/api/correspondence", {
      direction: "entrant",
      subject: "Lettre",
      correspondent: "Ministère",
      received_on: day(),
    });
    expect(r.status).toBe(403);
    expect(r.body.error).toMatch(/double authentification/);
    const me = (await g.api("u_hugo", "GET", "/api/me")).body;
    expect(me.mfa_required).toBe(true);
    // Un agent sans droit sensible n'est pas concerné
    const karim = (await g.api("u_karim", "GET", "/api/me")).body;
    expect(karim.mfa_required).toBe(false);
  });
});
