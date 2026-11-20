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

  // Demande de l'utilisateur (20/11/2026) : aucun nom de personne ; chaque compte porte sa fonction (Directeur, Chef de
  // cellule, Agent…). Le nom de la DG vient d'un réglage local (ANAT_DG_NAME), jamais du dépôt.
  const FORMER = [
    "Bernadette", "Mbuyi", "Esther", "Mukendi", "Clarisse", "Diala", "Fiston", "Banza", "Gaston", "Kalala", "Didier",
    "Lukusa", "Albert", "Mwamba", "Cédric", "Jean-Pierre", "Kabongo", "Patrick", "Aimée", "Ngalula", "Samuel",
    "Kalonji", "Sylvie", "Kasongo", "Mireille", "Ngoy", "Rose Mbombo", "Mbombo", "Joseph", "Tshibangu", "Prisca", "Kanku",
  ];
  it("ne montre aucun nom de personne : chaque compte porte sa fonction", async () => {
    const users = await q<{ id: string; name: string; email: string }>(
      "SELECT u.id, u.name, u.email FROM users u JOIN org_members m ON m.user_id = u.id WHERE m.org_id = $1 AND NOT u.is_ai",
      [org],
    );
    const by = new Map(users.map((u) => [u.id, u.name]));
    expect(by.get("u_alice")).toBe(process.env.ANAT_DG_NAME?.trim() || "Directrice générale");
    expect(by.get("u_albert")).toBe("Directeur technique");
    expect(by.get("u_karim")).toBe("Chef de cellule Ingénierie territoriale");
    expect(by.get("u_chloe")).toMatch(/^Agent/);
    const mail = new Map(users.map((u) => [u.id, u.email]));
    expect(mail.get("u_aimee")).toBe("agent.cartographie.et.sig@anat.example");
    expect(mail.get("u_karim")).toBe("chef.de.cellule.ingenierie.territoriale@anat.example");
    for (const u of users) for (const w of FORMER) expect(`${u.name} ${u.email}`, u.id).not.toContain(w);
    const cols = await q<{ table_name: string; column_name: string }>(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type IN ('text', 'jsonb')",
    );
    for (const c of cols) {
      if (["audit_log", "partner_contacts", "partner_history"].includes(c.table_name)) continue;
      for (const w of FORMER) {
        const r = await ctx.db.one<{ n: number }>(
          `SELECT count(*)::int AS n FROM "${c.table_name}" WHERE "${c.column_name}"::text LIKE $1`,
          [`%${w}%`],
        );
        expect(r?.n ?? 0, `${c.table_name}.${c.column_name} contient « ${w} »`).toBe(0);
      }
    }
  }, 120_000);

  it("organise l'Agence en directions et cellules", async () => {
    const kinds = await q<{ kind: string }>("SELECT DISTINCT kind FROM org_units WHERE org_id = $1", [org]);
    expect(kinds.map((k) => k.kind)).not.toContain("departement");
    expect(kinds.map((k) => k.kind)).not.toContain("service");
    expect(kinds.map((k) => k.kind)).toContain("cellule");
  });

  it("présente la DG avec le profil DG et confie les dossiers RH au service RH", async () => {
    const dg = await ctx.db.one<{ role: string; profile: string; name: string }>(
      "SELECT om.role, om.profile_id AS profile, ap.name FROM org_members om JOIN access_profiles ap ON ap.id = om.profile_id WHERE om.org_id = $1 AND om.user_id = 'u_alice'",
      [org],
    );
    // La propriété technique est confiée à l'informatique (lot S) : la DG tient sa fonction par son profil
    expect(dg).toEqual({ role: "admin", profile: `prf_dg_${org}`, name: "DG" });
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

  it("confie le comité de recrutement au service RH", async () => {
    const rows = await q<{ user_id: string; role: string }>(
      "SELECT m.user_id, m.role FROM team_members m JOIN teams t ON t.id = m.team_id WHERE t.org_id = $1 AND t.name = 'Comité de recrutement'",
      [org],
    );
    expect(rows.filter((r) => r.role === "lead").map((r) => r.user_id)).toEqual(["u_sylvie"]);
    expect(rows.map((r) => r.user_id)).toContain("u_mireille");
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

  it("D-6 : la DG a son historique d'affectations, poste précédent compris", async () => {
    const rows = await q<{ ended_on: string | null }>(
      "SELECT ended_on::text AS ended_on FROM agent_assignments WHERE org_id = $1 AND user_id = 'u_alice'",
      [org],
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((r) => r.ended_on === null)).toBe(true);
  });

  // Remarques de démonstration restantes (D-7, R-9, DEC-7, C-6, RI-8, PT-8, PA-6, S-7) : une agence vivante
  it("D-7 : adresses à un domaine propre à l'Agence, nationalité plausible", async () => {
    const mails = await q<{ email: string }>(
      "SELECT u.email FROM users u JOIN org_members om ON om.user_id = u.id WHERE om.org_id = $1 AND u.email IS NOT NULL",
      [org],
    );
    expect(mails.filter((m) => m.email.endsWith("@cadence.app"))).toEqual([]);
    expect(mails.every((m) => m.email.endsWith("@anat.example"))).toBe(true);
    const o = await ctx.db.one<{ domains: string[] }>("SELECT domains FROM organizations WHERE id = $1", [org]);
    expect(o!.domains).toContain("anat.example");
    expect((await q("SELECT 1 FROM agent_records WHERE nationality = 'Fictivienne'")).length).toBe(0);
  });

  it("R-9 : le secrétariat de la DG rédige les comités de direction, dont les membres sont convoqués", async () => {
    const codir = await q<{ id: string; writer_id: string; n: number }>(
      `SELECT m.id, m.writer_id, (SELECT count(*)::int FROM meeting_attendees x WHERE x.meeting_id = m.id AND x.invited) AS n
         FROM meetings m WHERE m.org_id = $1 AND m.meeting_type ILIKE 'Comité de direction%'`,
      [org],
    );
    expect(codir.length).toBeGreaterThan(0);
    for (const m of codir) {
      expect(m.writer_id).toBe("u_ines");
      expect(m.n).toBeGreaterThanOrEqual(5);
    }
    const writers = await q<{ w: string }>("SELECT DISTINCT writer_id AS w FROM meetings WHERE org_id = $1", [org]);
    expect(writers.length).toBeGreaterThanOrEqual(3);
  });

  it("DEC-7 : une dizaine de décisions réparties, issues de comités et de dossiers", async () => {
    const d = await q<{ owner_id: string | null; src: boolean; confirmed_at: string | null; status: string }>(
      `SELECT owner_id, (project_id IS NOT NULL OR activity_id IS NOT NULL OR meeting_id IS NOT NULL) AS src, confirmed_at, status
         FROM dg_decisions WHERE org_id = $1`,
      [org],
    );
    expect(d.length).toBeGreaterThanOrEqual(10);
    expect(new Set(d.map((x) => x.owner_id).filter(Boolean)).size).toBeGreaterThanOrEqual(4);
    expect(d.filter((x) => x.src).length).toBeGreaterThanOrEqual(5);
    expect(d.some((x) => !x.confirmed_at)).toBe(true);
    expect(d.some((x) => x.status === "executee")).toBe(true);
  });

  it("C-6 : le secrétariat tient le bureau d'ordre ; des courriers sortants répondent aux entrants", async () => {
    const mail = await q<{ direction: string; reply_to_id: string | null; created_by: string }>(
      "SELECT direction, reply_to_id, created_by FROM correspondence WHERE org_id = $1",
      [org],
    );
    expect(mail.filter((m) => m.direction === "sortant" && m.reply_to_id).length).toBeGreaterThanOrEqual(2);
    expect(mail.filter((m) => m.created_by === "u_ines").length).toBeGreaterThanOrEqual(3);
  });

  it("RI-8 : des risques rattachés aux projets, des indicateurs reliés au plan", async () => {
    expect((await q("SELECT 1 FROM risks WHERE org_id = $1 AND project_id IS NOT NULL", [org])).length).toBeGreaterThanOrEqual(3);
    expect((await q("SELECT 1 FROM indicators WHERE org_id = $1 AND plan_activity_id IS NOT NULL", [org])).length).toBeGreaterThanOrEqual(1);
  });

  it("PT-8 : des plans pour la Direction générale et l'Ingénierie territoriale, des activités réparties", async () => {
    const plans = await q<{ name: string }>(
      "SELECT u.name FROM work_plans w JOIN org_units u ON u.id = w.unit_id WHERE w.org_id = $1",
      [org],
    );
    const names = plans.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["Direction générale", "Ingénierie territoriale"]));
    const owners = await q<{ r: string }>(
      "SELECT DISTINCT responsible_id AS r FROM plan_activities WHERE org_id = $1 AND responsible_id IS NOT NULL",
      [org],
    );
    expect(owners.length).toBeGreaterThanOrEqual(5);
  });

  it("PA-6 : des partenaires reliés au portefeuille, des contacts renseignés", async () => {
    expect((await q("SELECT 1 FROM projects WHERE org_id = $1 AND sponsor_partner_id IS NOT NULL", [org])).length).toBeGreaterThanOrEqual(1);
    expect((await q("SELECT 1 FROM agency_activities WHERE org_id = $1 AND counterpart_partner_id IS NOT NULL", [org])).length).toBeGreaterThanOrEqual(1);
    expect((await q("SELECT 1 FROM partner_contacts WHERE org_id = $1", [org])).length).toBeGreaterThanOrEqual(5);
  });

  it("S-7 : la plupart des entités ont une fiche d'attributions", async () => {
    const units = (await q("SELECT 1 FROM org_units WHERE org_id = $1 AND parent_id IS NOT NULL", [org])).length;
    const sheets = (await q("SELECT DISTINCT unit_id FROM attribution_sheets WHERE org_id = $1 AND unit_id IS NOT NULL", [org])).length;
    expect(sheets).toBeGreaterThanOrEqual(Math.min(8, units));
  });

  it("se recharge sans rien dupliquer", async () => {
    const count = async () =>
      (await ctx.db.one<{ n: number }>("SELECT count(*)::int AS n FROM users"))!.n +
      (await ctx.db.one<{ n: number }>("SELECT count(*)::int AS n FROM projects"))!.n * 1000 +
      // La démonstration complétée ne se duplique pas non plus
      (await ctx.db.one<{ n: number }>("SELECT count(*)::int AS n FROM dg_decisions"))!.n * 100_000 +
      (await ctx.db.one<{ n: number }>("SELECT count(*)::int AS n FROM correspondence"))!.n * 10_000_000;
    const before = await count();
    await seedGovDemo(ctx.svc);
    expect(await count()).toBe(before);
  }, 60_000);
});
