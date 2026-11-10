import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

const sheet = (unit_id: string, domain_id: string, patch: Record<string, unknown> = {}) => ({
  unit_id,
  mission: "Suivre l'exécution budgétaire",
  legal_ref: "Organigramme",
  valid_from: "2026-01-01",
  domains: [{ domain_id, role: "responsable" }],
  relations: [],
  ...patch,
});

describe("catalogue des domaines", () => {
  it("un administrateur crée un domaine, un membre le lit mais ne le crée pas", async () => {
    const d = await g.api("u_alice", "POST", "/api/domains", { name: "Budget" });
    expect(d.status).toBe(200);
    expect((await g.api("u_karim", "GET", "/api/domains")).body.map((x: { name: string }) => x.name)).toContain(
      "Budget",
    );
    expect((await g.api("u_karim", "POST", "/api/domains", { name: "Autre" })).status).toBe(403);
  });
  it("refuse un doublon dans le catalogue", async () => {
    await g.api("u_alice", "POST", "/api/domains", { name: "Budget" });
    expect((await g.api("u_alice", "POST", "/api/domains", { name: "Budget" })).status).toBe(409);
  });
});

describe("fiches d'attributions", () => {
  it("crée la fiche d'une entité avec ses domaines et ses rapports", async () => {
    const [u1, u2] = await g.units(2);
    const d = (await g.api("u_alice", "POST", "/api/domains", { name: "Marchés" })).body;
    const r = await g.api(
      "u_alice",
      "POST",
      "/api/attributions",
      sheet(u1, d.id, {
        relations: [{ target_unit_id: u2, kind: "consultation", domain_id: d.id, note: "Avis préalable" }],
      }),
    );
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ version: 1, status: "draft" });
    expect(r.body.domains[0]).toMatchObject({ name: "Marchés", role: "responsable" });
    expect(r.body.relations[0]).toMatchObject({ kind: "consultation", domain_name: "Marchés" });
  });
  it("une fiche porte sur une seule entité", async () => {
    const [u] = await g.units(1);
    const d = (await g.api("u_alice", "POST", "/api/domains", { name: "X" })).body;
    expect((await g.api("u_alice", "POST", "/api/attributions", sheet(u, d.id, { user_id: "u_karim" }))).status).toBe(
      400,
    );
    expect((await g.api("u_alice", "POST", "/api/attributions", sheet("", d.id, { unit_id: null }))).status).toBe(400);
  });
  it("le rédacteur ne peut pas approuver sa propre fiche, un autre administrateur si", async () => {
    const [u] = await g.units(1);
    const d = (await g.api("u_alice", "POST", "/api/domains", { name: "X" })).body;
    const s = (await g.api("u_alice", "POST", "/api/attributions", sheet(u, d.id))).body;
    expect((await g.api("u_alice", "POST", `/api/attributions/${s.id}/approve`)).status).toBe(403);
    await g.promote("u_karim");
    const ok = await g.api("u_karim", "POST", `/api/attributions/${s.id}/approve`);
    expect(ok.body).toMatchObject({ status: "approved", approved_by: "u_karim" });
  });
  it("une fiche approuvée est figée, une nouvelle version archive l'ancienne à son approbation", async () => {
    const [u] = await g.units(1);
    const d = (await g.api("u_alice", "POST", "/api/domains", { name: "X" })).body;
    const v1 = (await g.api("u_alice", "POST", "/api/attributions", sheet(u, d.id))).body;
    await g.promote("u_karim");
    await g.api("u_karim", "POST", `/api/attributions/${v1.id}/approve`);
    expect((await g.api("u_alice", "PUT", `/api/attributions/${v1.id}`, sheet(u, d.id))).status).toBe(409);
    expect((await g.api("u_alice", "DELETE", `/api/attributions/${v1.id}`)).status).toBe(409);
    const v2 = (await g.api("u_alice", "POST", "/api/attributions", sheet(u, d.id, { mission: "Nouvelle mission" })))
      .body;
    expect(v2.version).toBe(2);
    await g.api("u_karim", "POST", `/api/attributions/${v2.id}/approve`);
    expect((await g.api("u_alice", "GET", `/api/attributions/${v1.id}`)).body.status).toBe("archived");
    const list = (await g.api("u_alice", "GET", "/api/attributions")).body as { id: string }[];
    expect(list.map((s) => s.id)).toEqual([v2.id]);
  });
  it("refuse une deuxième version en préparation", async () => {
    const [u] = await g.units(1);
    const d = (await g.api("u_alice", "POST", "/api/domains", { name: "X" })).body;
    await g.api("u_alice", "POST", "/api/attributions", sheet(u, d.id));
    expect((await g.api("u_alice", "POST", "/api/attributions", sheet(u, d.id))).status).toBe(409);
  });
  it("refuse un domaine ou une entité d'une autre organisation", async () => {
    const [u] = await g.units(1);
    const other = await g.foreignOrg();
    const d = (await g.api("u_alice", "POST", "/api/domains", { name: "X" })).body;
    const foreign = (await g.api(other.who, "POST", "/api/domains", { name: "Y" })).body;
    expect((await g.api("u_alice", "POST", "/api/attributions", sheet(u, foreign.id))).status).toBe(400);
    expect(
      (
        await g.api(
          "u_alice",
          "POST",
          "/api/attributions",
          sheet(u, d.id, { relations: [{ target_unit_id: other.unit, kind: "appui" }] }),
        )
      ).status,
    ).toBe(400);
  });
  it("une autre organisation n'accède pas à la fiche", async () => {
    const [u] = await g.units(1);
    const other = await g.foreignOrg();
    const d = (await g.api("u_alice", "POST", "/api/domains", { name: "X" })).body;
    const s = (await g.api("u_alice", "POST", "/api/attributions", sheet(u, d.id))).body;
    expect((await g.api(other.who, "GET", `/api/attributions/${s.id}`)).status).toBe(403);
    expect((await g.api(other.who, "GET", "/api/attributions")).body).toEqual([]);
  });
  it("approuver exige au moins un domaine", async () => {
    const [u] = await g.units(1);
    const d = (await g.api("u_alice", "POST", "/api/domains", { name: "X" })).body;
    const s = (await g.api("u_alice", "POST", "/api/attributions", sheet(u, d.id, { domains: [] }))).body;
    await g.promote("u_karim");
    expect((await g.api("u_karim", "POST", `/api/attributions/${s.id}/approve`)).status).toBe(400);
  });
});
