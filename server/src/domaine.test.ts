import { beforeAll, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/* Domaine principal de l'institution : réglé par l'administration, contrôlé et journalisé. */
describe("domaine principal de l'institution", () => {
  let g: GovCtx;
  const domains = async () =>
    (await g.ctx.db.one<{ domains: string[] }>("SELECT domains FROM organizations WHERE id = $1", [g.org]))!.domains;

  beforeAll(async () => {
    g = await boot();
  });

  it("s'enregistre en minuscules, sans doublon, le domaine principal en premier", async () => {
    const r = await g.api("u_alice", "PATCH", "/api/org", {
      domains: [" Exemple.Gouv.CD ", "exemple.gouv.cd", "autre.cd"],
    });
    expect(r.status).toBe(200);
    expect(await domains()).toEqual(["exemple.gouv.cd", "autre.cd"]);
  });

  it("refuse un nom de domaine invalide", async () => {
    for (const bad of ["pas un domaine", "exemple", "http://exemple.cd", "exemple..cd"]) {
      const r = await g.api("u_alice", "PATCH", "/api/org", { domains: [bad] });
      expect(r.status, bad).toBe(400);
      expect(r.body.error).toMatch(/domaine/i);
    }
    expect(await domains()).toEqual(["exemple.gouv.cd", "autre.cd"]);
  });

  it("est réservé aux paramètres de l'institution", async () => {
    const r = await g.api("u_karim", "PATCH", "/api/org", { domains: ["intrus.cd"] });
    expect(r.status).toBe(403);
    expect(await domains()).toEqual(["exemple.gouv.cd", "autre.cd"]);
  });

  it("est journalisé et rendu à l'interface avec l'institution courante", async () => {
    const log = await g.ctx.db.one<{ data: { from: string[]; to: string[] } }>(
      "SELECT data FROM activity WHERE org_id = $1 AND kind = 'org.domains' ORDER BY created_at DESC LIMIT 1",
      [g.org],
    );
    expect(log?.data.to).toEqual(["exemple.gouv.cd", "autre.cd"]);
    const me = await g.api("u_karim", "GET", "/api/me");
    const current = (me.body.orgs as { id: string; domains: string[] }[]).find((o) => o.id === g.org);
    expect(current?.domains[0]).toBe("exemple.gouv.cd");
  });
});
