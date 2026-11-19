import { beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { seedGovDemo } from "./gov-demo.js";
import { ALL_PERMISSIONS } from "./permissions.js";

/*
 * Propriété technique séparée de la fonction de DG (lot S, décision de l'utilisateur : « la DG peut tout lire, mais ne
 * peut pas tout faire »). Le niveau « Propriétaire » règle l'administration de l'outil ; il n'ouvre plus à lui seul
 * tous les droits métier ni tous les projets quand la personne tient un profil de fonction. Ses actions restent
 * relues par une autre personne (contrôle croisé).
 */
const NO_LIMITS = {
  anonymousPerMinute: 1e6,
  sessionPerMinute: 1e6,
  aiPerMinute: 1e6,
  invitationsPerHour: 1e6,
  aiRunsPerHour: 1e6,
};

describe("propriété technique et fonction de DG", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  let org: string;
  const cookies: Record<string, string> = {};
  const login = async (id: string) => {
    const res = await ctx.app.inject({ method: "POST", url: "/api/auth/login", payload: { user_id: id } });
    cookies[id] = ([] as unknown[])
      .concat(res.headers["set-cookie"] ?? [])
      .map((c) => String(c).split(";")[0])
      .filter((c) => !/=$/.test(c))
      .join("; ");
  };
  const api = async (who: string, method: "GET" | "POST" | "PUT" | "PATCH", url: string, payload?: unknown) => {
    const res = await ctx.app.inject({ method, url, payload: payload as never, headers: { cookie: cookies[who] } });
    return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null };
  };

  beforeAll(async () => {
    ctx = await buildApp({ provider: "demo", demoDelayMs: 0, limits: NO_LIMITS });
    await seedGovDemo(ctx.svc);
    org = (await ctx.db.one<{ id: string }>("SELECT id FROM organizations WHERE name = 'ANAT (démonstration)'"))!.id;
    for (const id of ["u_alice", "u_cedric", "u_sylvie", "u_karim"]) await login(id);
  }, 120_000);

  it("la DG n'est plus propriétaire : ses droits sont ceux de son profil DG", async () => {
    expect(await ctx.svc.orgRole("u_alice", org)).not.toBe("owner");
    const perms = await ctx.svc.permissionsOf("u_alice", org);
    expect(perms).toContain("pilotage.view");
    expect(perms).toContain("decisions.confirm");
    expect(perms).toContain("signature.institution");
    // Elle ne règle ni les dossiers RH, ni les profils, ni les comptes
    for (const p of ["hr.manage", "org.profiles", "org.members"]) expect(perms).not.toContain(p);
    expect(perms.length).toBeLessThan(ALL_PERMISSIONS.length);
  });

  it("la propriété technique revient au responsable informatique, sans droits métier", async () => {
    expect(await ctx.svc.orgRole("u_cedric", org)).toBe("owner");
    const perms = await ctx.svc.permissionsOf("u_cedric", org);
    expect(perms).toContain("org.profiles");
    for (const p of ["pilotage.view", "decisions.record", "hr.view", "signature.institution"])
      expect(perms).not.toContain(p);
  });

  it("l'institution garde exactement un propriétaire actif", async () => {
    const owners = await ctx.db.query<{ user_id: string }>(
      "SELECT user_id FROM org_members WHERE org_id = $1 AND role = 'owner'",
      [org],
    );
    expect(owners.map((o) => o.user_id)).toEqual(["u_cedric"]);
  });

  it("le propriétaire technique n'ouvre pas les projets privés dont il n'est pas membre", async () => {
    const priv = await ctx.db.query<{ id: string }>(
      `SELECT p.id FROM projects p WHERE p.org_id = $1 AND p.access = 'private'
          AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.project_id = p.id AND m.user_id = 'u_cedric')`,
      [org],
    );
    expect(priv.length).toBeGreaterThan(0);
    for (const p of priv) expect(await ctx.svc.projectRole("u_cedric", p.id)).toBeNull();
  });

  it("la DG lit tous les projets de l'Agence mais n'administre pas ceux dont elle n'est pas membre", async () => {
    const others = await ctx.db.query<{ id: string }>(
      `SELECT p.id FROM projects p WHERE p.org_id = $1 AND p.kind = 'project' AND NOT p.archived
          AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.project_id = p.id AND m.user_id = 'u_alice')
          AND NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = p.team_id AND tm.user_id = 'u_alice')`,
      [org],
    );
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) expect(await ctx.svc.projectRole("u_alice", p.id)).toBe("viewer");
  });

  it("personne ne s'accorde un droit à soi-même, pas même le propriétaire", async () => {
    const r = await api("u_cedric", "PUT", "/api/org/members/u_cedric/permissions", { overrides: { "pilotage.view": true } });
    expect(r.status).toBe(403);
    expect(await ctx.svc.permissionsOf("u_cedric", org)).not.toContain("pilotage.view");
  });

  it("personne ne change son propre profil : une autre personne le fait", async () => {
    const dg = (await api("u_cedric", "GET", "/api/org/profiles")).body.find((p: { name: string }) => p.name === "DG");
    const r = await api("u_cedric", "PUT", "/api/org/members/u_cedric/profile", {
      profile_id: dg.id,
      reason: "Essai",
    });
    expect(r.status).toBe(403);
  });

  it("un droit sensible accordé par l'administration est signalé à qui relit son journal", async () => {
    const r = await api("u_cedric", "PUT", "/api/org/members/u_karim/permissions", { overrides: { "hr.view": true } });
    expect(r.status).toBeLessThan(300);
    const n = await ctx.db.one<{ title: string }>(
      "SELECT title FROM notifications WHERE user_id = 'u_alice' AND kind = 'access.sensitive_granted' ORDER BY created_at DESC LIMIT 1",
    );
    expect(n?.title).toMatch(/Fiston/);
  });
});

describe("organisation ordinaire : le propriétaire garde tous les droits", () => {
  it("le profil système « Propriétaire » ouvre toujours tout", async () => {
    const ctx = await buildApp({ provider: "demo", demoDelayMs: 0, limits: NO_LIMITS });
    const org = (await ctx.db.one<{ id: string }>("SELECT id FROM organizations WHERE name = 'Nova Mobile'"))!.id;
    expect(await ctx.svc.orgRole("u_alice", org)).toBe("owner");
    expect(await ctx.svc.permissionsOf("u_alice", org)).toEqual(ALL_PERMISSIONS);
  }, 60_000);
});
