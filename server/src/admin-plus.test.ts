import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Administration système, suite : état du système, sessions actives de toute la plateforme, bandeau d'information
 * affiché à tous, matrice des rôles (qui voit quoi, qui valide quoi), export des comptes. Réservé à
 * l'administrateur système ; chaque action est tracée.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
  await g.ctx.db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_alice'");
});
afterEach(() => g.ctx.app.close());

type Any = any;

describe("administration système : surveiller et informer", () => {
  it("l'état du système donne volumes, comptes, messagerie, stockage et alertes", async () => {
    expect((await g.api("u_karim", "GET", "/api/admin/health")).status).toBe(403);
    const h = (await g.api("u_alice", "GET", "/api/admin/health")).body;
    expect(h).toMatchObject({
      accounts: { total: expect.any(Number), active: expect.any(Number), invited: expect.any(Number) },
      sessions: { active: expect.any(Number) },
      mail: { configured: expect.any(Boolean) },
      storage: { bytes: expect.any(Number), files: expect.any(Number) },
    });
    expect(h.volumes.projects).toBeGreaterThan(0);
    expect(h.accounts.without_mfa_admins).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(h.alerts)).toBe(true);
  });

  it("liste les sessions ouvertes de toute la plateforme et en ferme une, tracé", async () => {
    const list = (await g.api("u_alice", "GET", "/api/admin/sessions")).body as Any[];
    const karim = list.find((s) => s.user_id === "u_karim");
    expect(karim).toMatchObject({ user_name: "Fiston Banza" });
    expect(karim.id).toBeTruthy();
    expect((await g.api("u_alice", "DELETE", `/api/admin/sessions/${karim.id}`)).status).toBe(200);
    expect((await g.api("u_karim", "GET", "/api/me")).status).toBe(401);
    expect(
      await g.ctx.db.one("SELECT 1 FROM security_events WHERE kind = 'session.revoked' AND user_id = 'u_karim'"),
    ).toBeTruthy();
  });

  it("publie un bandeau d'information lu par tous, puis le retire", async () => {
    expect((await g.api("u_karim", "PUT", "/api/admin/banner", { text: "x" })).status).toBe(403);
    expect(
      (
        await g.api("u_alice", "PUT", "/api/admin/banner", {
          text: "Maintenance samedi de 8 h à 10 h.",
          level: "warning",
        })
      ).status,
    ).toBe(200);
    expect((await g.api("u_karim", "GET", "/api/platform/banner")).body).toMatchObject({
      text: "Maintenance samedi de 8 h à 10 h.",
      level: "warning",
    });
    await g.api("u_alice", "PUT", "/api/admin/banner", { text: "" });
    expect((await g.api("u_karim", "GET", "/api/platform/banner")).body).toBeNull();
  });

  it("matrice des rôles : chaque profil, ce qu'il voit, fait et valide", async () => {
    const r = (await g.api("u_alice", "GET", "/api/admin/roles-matrix")).body;
    expect(r.groups.map((x: Any) => x.group)).toEqual(expect.arrayContaining(["Réunions", "Ressources humaines"]));
    const dg = r.profiles.find((p: Any) => p.name === "DG");
    expect(dg.permissions).toContain("decisions.record");
    expect(r.profiles.find((p: Any) => p.name === "Agent").members).toEqual(expect.any(Number));
  });

  it("exporte les comptes en tableur", async () => {
    const r = await g.api("u_alice", "GET", "/api/admin/accounts.csv");
    expect(String(r.headers["content-type"])).toMatch(/text\/csv/);
    const text = r.raw.toString("utf8");
    expect(text.split("\n")[0]).toMatch(
      /Nom;Adresse;État;Institutions;Profils;Double authentification;Dernière connexion/,
    );
    expect(text).toContain("Fiston Banza");
    expect(await g.ctx.db.one("SELECT 1 FROM security_events WHERE kind = 'accounts.exported'")).toBeTruthy();
  });
});
