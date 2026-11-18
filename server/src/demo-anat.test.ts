import { beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { seedGovDemo } from "./gov-demo.js";

/*
 * Démonstration ANAT (ANAT_DEMO=1) : une agence d'aménagement crédible, sans reste du jeu générique de start-up,
 * des entités peuplées, des chefs dont le profil correspond à la responsabilité (docs/ANALYSE-MODULES.md, thème 7).
 */
const NO_LIMITS = {
  anonymousPerMinute: 1e6,
  sessionPerMinute: 1e6,
  aiPerMinute: 1e6,
  invitationsPerHour: 1e6,
  aiRunsPerHour: 1e6,
};

const STARTUP = [
  "Campagne de lancement",
  "Application mobile v2",
  "Refonte du site web",
  "Plateforme de tests automatisés",
  "Marketing",
  "Produit & Design",
  "Équipe Mobile",
  "Studio Lumen",
  "Nova Mobile",
  "Produit & Technologie",
  "de paiement",
  "Apple Pay",
  "Google Pay",
  "iOS",
  "App Store",
  "panier",
  "tests automatisés",
  "QA",
  "bug",
];
const startup = (s: string | null | undefined) =>
  STARTUP.find((w) => (s ?? "").toLowerCase().includes(w.toLowerCase()));

describe("démonstration ANAT", () => {
  let ctx: Awaited<ReturnType<typeof buildApp>>;
  let org: string;
  const q = <T>(sql: string, params: unknown[] = []) => ctx.db.query<T & Record<string, unknown>>(sql, params);

  beforeAll(async () => {
    ctx = await buildApp({ provider: "demo", demoDelayMs: 0, limits: NO_LIMITS });
    await seedGovDemo(ctx.svc);
    org = (await ctx.db.one<{ id: string }>("SELECT id FROM organizations WHERE name = 'ANAT (démonstration)'"))!.id;
  }, 120_000);

  it("ne garde aucun reste de start-up dans les projets, tâches, équipes et commentaires", async () => {
    const orgs = await q<{ name: string }>("SELECT name FROM organizations");
    expect(orgs.map((o) => o.name)).toEqual(["ANAT (démonstration)"]);
    const texts = [
      ...(await q<{ t: string }>("SELECT name || ' ' || description AS t FROM projects WHERE org_id = $1", [org])),
      ...(await q<{ t: string }>(
        "SELECT t.title || ' ' || t.description || ' ' || t.tags::text AS t FROM tasks t JOIN projects p ON p.id = t.project_id WHERE p.org_id = $1",
        [org],
      )),
      ...(await q<{ t: string }>("SELECT name || ' ' || description AS t FROM teams WHERE org_id = $1", [org])),
      ...(await q<{ t: string }>(
        "SELECT c.body AS t FROM comments c JOIN tasks t ON t.id = c.task_id JOIN projects p ON p.id = t.project_id WHERE p.org_id = $1",
        [org],
      )),
      ...(await q<{ t: string }>("SELECT name AS t FROM org_units WHERE org_id = $1", [org])),
      ...(await q<{ t: string }>("SELECT summary AS t FROM participation_gaps WHERE org_id = $1", [org])),
      ...(await q<{ t: string }>("SELECT text AS t FROM correspondence_annotations WHERE org_id = $1", [org])),
      ...(await q<{ t: string }>("SELECT title AS t FROM plan_activities WHERE org_id = $1", [org])),
      ...(await q<{ t: string }>(
        "SELECT coalesce(ai_role, '') || ' ' || coalesce(ai_instructions, '') AS t FROM users WHERE is_ai",
      )),
      ...(await q<{ t: string }>("SELECT instructions AS t FROM ai_rules")),
      // L'historique des projets raconte la même histoire que leur contenu
      ...(await q<{ t: string }>(
        "SELECT coalesce(data->>'title', '') || ' ' || coalesce(data->>'name', '') AS t FROM activity WHERE org_id = $1",
        [org],
      )),
    ].map((r) => r.t);
    expect(texts.filter((t) => startup(t))).toEqual([]);
  });

  it("présente de vrais projets de l'Agence", async () => {
    const names = (
      await q<{ name: string }>("SELECT name FROM projects WHERE org_id = $1 AND kind = 'project'", [org])
    ).map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Système d'information géographique national",
        "Campagne d'information sur le schéma national",
        "Refonte du site institutionnel",
        "Numérisation des archives cartographiques",
      ]),
    );
  });

  it("donne un nom parlant à chaque réunion", async () => {
    const generic = await q("SELECT id FROM meetings WHERE org_id = $1 AND title = 'Réunion'", [org]);
    expect(generic).toEqual([]);
  });

  it("peuple les entités : chacune a un chef rattaché à elle, avec le profil de sa responsabilité", async () => {
    const units = await q<{ name: string; parent_id: string | null; manager_id: string | null }>(
      "SELECT name, parent_id, manager_id FROM org_units WHERE org_id = $1",
      [org],
    );
    expect(units.length).toBeGreaterThanOrEqual(12);
    const managers = new Map<string, number>();
    for (const u of units) {
      expect(u.manager_id, `${u.name} a un chef`).toBeTruthy();
      managers.set(u.manager_id!, (managers.get(u.manager_id!) ?? 0) + 1);
    }
    // Hors la DG (institution et Direction générale), personne ne dirige deux entités
    for (const [id, n] of managers) if (id !== "u_alice") expect(n, `${id} dirige ${n} entités`).toBe(1);
    const chefs = await q<{ name: string; profile: string | null; unit: string; home: string | null }>(
      `SELECT ou.name, om.profile_id AS profile, ou.id AS unit, om.unit_id AS home
         FROM org_units ou JOIN org_members om ON om.org_id = ou.org_id AND om.user_id = ou.manager_id
        WHERE ou.org_id = $1 AND ou.parent_id IS NOT NULL AND ou.manager_id <> 'u_alice'`,
      [org],
    );
    for (const c of chefs) {
      expect(c.profile, `profil du chef de ${c.name}`).toBe(`prf_chef_entite_${org}`);
      expect(c.home, `le chef de ${c.name} y est rattaché`).toBe(c.unit);
    }
    const members = await q<{ unit_id: string }>("SELECT unit_id FROM org_members WHERE org_id = $1", [org]);
    expect(members.length).toBeGreaterThanOrEqual(15);
    // Plus aucun agent ne dirige d'entité
    const agents = await q(
      `SELECT 1 FROM org_units ou JOIN org_members om ON om.org_id = ou.org_id AND om.user_id = ou.manager_id
        WHERE ou.org_id = $1 AND om.profile_id = $2`,
      [org, `prf_agent_${org}`],
    );
    expect(agents).toEqual([]);
  });

  it("présente la DG avec le profil DG et confie les dossiers RH au service RH", async () => {
    const dg = await ctx.db.one<{ role: string; profile: string; name: string }>(
      "SELECT om.role, om.profile_id AS profile, ap.name FROM org_members om JOIN access_profiles ap ON ap.id = om.profile_id WHERE om.org_id = $1 AND om.user_id = 'u_alice'",
      [org],
    );
    expect(dg).toEqual({ role: "owner", profile: `prf_dg_${org}`, name: "DG" });
    const rh = await ctx.db.one<{ manager_id: string }>(
      "SELECT manager_id FROM org_units WHERE org_id = $1 AND name = 'Ressources humaines'",
      [org],
    );
    expect(rh!.manager_id).not.toBe("u_ines");
    const perms = await ctx.svc.permissionsOf(rh!.manager_id, org);
    expect(perms).toContain("hr.manage");
  });

  it("donne à chaque direction les droits de sa fonction : partenariats, plans, et chefs aptes à diriger", async () => {
    const chief = async (unit: string) =>
      (await ctx.db.one<{ m: string }>("SELECT manager_id AS m FROM org_units WHERE org_id = $1 AND name = $2", [
        org,
        unit,
      ]))!.m;
    const partners = await ctx.svc.permissionsOf(await chief("Direction de la Communication et des Partenariats"), org);
    expect(partners).toContain("partners.manage");
    const plan = await ctx.svc.permissionsOf(await chief("Suivi-évaluation"), org);
    expect(plan).toContain("plans.manage_all");
    for (const u of await ctx.db.query<{ name: string; m: string }>(
      "SELECT name, manager_id AS m FROM org_units WHERE org_id = $1 AND manager_id IS NOT NULL",
      [org],
    ))
      expect([u.name, (await ctx.svc.permissionsOf(u.m, org)).includes("units.lead")]).toEqual([u.name, true]);
  });

  it("sépare l'administration technique de la direction : le responsable informatique administre, la DG relit (AD-1)", async () => {
    const admins = await q<{ id: string; title: string }>(
      "SELECT id, title FROM users WHERE platform_role = 'super_admin' AND status = 'active'",
    );
    expect(admins.map((a) => a.id)).toEqual(["u_cedric"]);
    expect(admins[0].title).toMatch(/informatique/i);
    const it = await ctx.svc.permissionsOf("u_cedric", org);
    expect(it).toEqual(expect.arrayContaining(["org.members", "org.profiles", "org.structure"]));
    for (const p of ["pilotage.view", "decisions.record", "audit.review"]) expect(it).not.toContain(p);
    expect(await ctx.svc.permissionsOf("u_alice", org)).toContain("audit.review");
  });

  it("aligne le dossier RH de chacun sur son entité", async () => {
    const rows = await q<{ user_id: string; member: string | null; assigned: string | null }>(
      `SELECT om.user_id, om.unit_id AS member,
          (SELECT s.unit_id FROM agent_assignments s WHERE s.org_id = om.org_id AND s.user_id = om.user_id AND s.ended_on IS NULL) AS assigned
         FROM org_members om JOIN users u ON u.id = om.user_id WHERE om.org_id = $1 AND NOT u.is_ai AND om.user_id <> 'u_alice'`,
      [org],
    );
    expect(rows.length).toBeGreaterThanOrEqual(14);
    for (const r of rows) expect(r.assigned, `affectation de ${r.user_id}`).toBe(r.member);
  });

  it("se recharge sans rien dupliquer", async () => {
    const count = async () =>
      (await ctx.db.one<{ n: number }>("SELECT count(*)::int AS n FROM users"))!.n +
      (await ctx.db.one<{ n: number }>("SELECT count(*)::int AS n FROM projects"))!.n * 1000;
    const before = await count();
    await seedGovDemo(ctx.svc);
    expect(await count()).toBe(before);
  }, 60_000);
});
