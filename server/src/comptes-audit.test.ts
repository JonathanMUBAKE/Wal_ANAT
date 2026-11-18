import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Administration système : créer un compte en renseignant la personne, lui envoyer un lien pour qu'elle finalise
 * (choix du mot de passe) ; journal d'audit qui retrace tout ce que l'outil trace, filtrable et exportable.
 * Sans messagerie (usage local), le lien est montré à l'administrateur ; en production, il part par courriel.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
  await g.ctx.db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_alice'");
});
afterEach(() => g.ctx.app.close());

type Any = any;
const GOOD = "cheval-agrafe-batterie-42";
const tokenOf = (link: string) => link.split("#token=")[1];

describe("administration système : créer un compte", () => {
  it("renseigne la personne, son entité et son profil ; elle finalise par le lien", async () => {
    const units = (await g.api("u_alice", "GET", "/api/org/units")).body as Any[];
    const body = {
      org_id: g.org,
      name: "Mme Nouvelle Recrue",
      email: "nouvelle.recrue@exemple.test",
      title: "Chargée d'études",
      unit_id: units[1]?.id ?? units[0].id,
      profile_id: g.profile("Membre"),
    };
    expect((await g.api("u_karim", "POST", "/api/admin/accounts", body)).status).toBe(403);
    const r = await g.api("u_alice", "POST", "/api/admin/accounts", body);
    expect(r.status).toBe(200);
    expect(r.body.link).toMatch(/#token=/);
    const u = (await g.ctx.db.one<Any>("SELECT id, status, title FROM users WHERE email = $1", [body.email]))!;
    expect(u).toMatchObject({ status: "invited", title: "Chargée d'études" });
    // La personne choisit son mot de passe : compte actif, membre de l'institution, rangé dans son entité
    const act = await g.ctx.app.inject({
      method: "POST",
      url: "/api/auth/activate",
      payload: { token: tokenOf(r.body.link), password: GOOD },
    });
    expect(act.statusCode).toBe(200);
    const m = await g.ctx.db.one<Any>(
      "SELECT u.status, om.unit_id, om.profile_id FROM users u JOIN org_members om ON om.user_id = u.id WHERE u.id = $1 AND om.org_id = $2",
      [u.id, g.org],
    );
    expect(m).toMatchObject({ status: "active", unit_id: body.unit_id, profile_id: body.profile_id });
    expect(
      await g.ctx.db.one(
        "SELECT 1 FROM security_events WHERE kind = 'account.invited' AND actor_id = 'u_alice' AND user_id = $1",
        [u.id],
      ),
    ).toBeTruthy();
  });

  it("refuse un membre déjà inscrit, une entité ou un profil d'ailleurs ; renvoie un lien qui annule le précédent", async () => {
    const base = { org_id: g.org, name: "M. Test", profile_id: g.profile("Membre") };
    expect(
      (await g.api("u_alice", "POST", "/api/admin/accounts", { ...base, email: "fiston@cadence.app" })).status,
    ).toBe(400);
    expect(
      (
        await g.api("u_alice", "POST", "/api/admin/accounts", {
          ...base,
          email: "x@exemple.test",
          unit_id: "unit_inconnue",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await g.api("u_alice", "POST", "/api/admin/accounts", {
          ...base,
          email: "x@exemple.test",
          profile_id: "prf_inconnu",
        })
      ).status,
    ).toBe(400);
    const first = (await g.api("u_alice", "POST", "/api/admin/accounts", { ...base, email: "y@exemple.test" })).body;
    const user = (await g.ctx.db.one<{ id: string }>("SELECT id FROM users WHERE email = 'y@exemple.test'"))!;
    const again = await g.api("u_alice", "POST", `/api/admin/users/${user.id}/resend-invitation`);
    expect(again.status).toBe(200);
    expect(again.body.link).not.toBe(first.link);
    const old = await g.ctx.app.inject({
      method: "POST",
      url: "/api/auth/activate",
      payload: { token: tokenOf(first.link), password: GOOD },
    });
    expect(old.statusCode).toBe(400);
  });
});

describe("administration système : journal d'audit", () => {
  it("retrace les actions métier et de sécurité, en clair, avec leur auteur", async () => {
    await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire tracé", type_code: "autre" });
    await g.api("u_alice", "POST", "/api/decisions", {
      title: "Décision tracée",
      content: "Texte",
      decided_on: "2026-01-05",
      no_execution: true,
    });
    expect((await g.api("u_karim", "GET", "/api/admin/audit")).status).toBe(403);
    const all = (await g.api("u_alice", "GET", "/api/admin/audit")).body as Any;
    const created = all.entries.find((e: Any) => e.kind === "partner.created");
    expect(created).toMatchObject({ label: "Partenaire créé", actor_name: "Bernadette Mbuyi", category: "Partenariats" });
    expect(created.summary).toContain("Partenaire tracé");
    expect(all.entries.some((e: Any) => e.source === "security" && e.kind === "login.success")).toBe(true);
    // Filtres : par domaine, par auteur, par texte
    const partners = (await g.api("u_alice", "GET", "/api/admin/audit?category=Partenariats")).body.entries as Any[];
    expect(partners.length).toBeGreaterThan(0);
    expect(partners.every((e) => e.category === "Partenariats")).toBe(true);
    const byKarim = (await g.api("u_alice", "GET", "/api/admin/audit?actor_id=u_karim")).body.entries as Any[];
    expect(byKarim.every((e) => e.actor_id === "u_karim")).toBe(true);
    const found = (await g.api("u_alice", "GET", "/api/admin/audit?q=tracée")).body.entries as Any[];
    expect(found.map((e) => e.kind)).toContain("decision.recorded");
    expect(all.categories).toEqual(expect.arrayContaining(["Partenariats", "Décisions", "Sécurité"]));
  });

  it("s'exporte en CSV avec les mêmes filtres", async () => {
    await g.api("u_alice", "POST", "/api/partners", { name: "Export", type_code: "autre" });
    const r = await g.api("u_alice", "GET", "/api/admin/audit.csv?category=Partenariats");
    expect(r.status).toBe(200);
    expect(String(r.headers["content-type"])).toMatch(/text\/csv/);
    const text = r.raw.toString("utf8");
    expect(text.split("\n")[0]).toMatch(/Date;Auteur;Domaine;Action;Objet/);
    expect(text).toContain("Partenaire créé");
  });
});

describe("journal d'audit : gravité, journal par utilisateur, analyse", () => {
  it("classe chaque trace par gravité et se filtre ainsi", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "À supprimer", type_code: "autre" })).body;
    await g.api("u_alice", "DELETE", `/api/partners/${p.id}`);
    const all = (await g.api("u_alice", "GET", "/api/admin/audit")).body.entries as Any[];
    expect(all.find((e) => e.kind === "partner.deleted")?.severity).toBe("critique");
    expect(all.find((e) => e.kind === "partner.created")?.severity).toBe("normale");
    const crit = (await g.api("u_alice", "GET", "/api/admin/audit?severity=critique")).body.entries as Any[];
    expect(crit.length).toBeGreaterThan(0);
    expect(crit.every((e) => e.severity === "critique")).toBe(true);
  });

  it("le journal d'un utilisateur réunit ses connexions et ses activités, y compris ce qui le concerne", async () => {
    await g.promote("u_karim");
    expect(
      (await g.api("u_karim", "POST", "/api/partners", { name: "Partenaire de Fiston", type_code: "autre" })).status,
    ).toBe(200);
    await g.api("u_alice", "POST", "/api/admin/users/u_karim/revoke-sessions");
    const r = await g.api("u_alice", "GET", "/api/admin/users/u_karim/journal");
    expect(r.status).toBe(200);
    expect(r.body.user).toMatchObject({ id: "u_karim", name: "Fiston Banza" });
    expect(r.body.connections.some((e: Any) => e.kind === "login.success")).toBe(true);
    expect(r.body.activities.some((e: Any) => e.kind === "partner.created")).toBe(true);
    // Ce qu'un autre a fait sur son compte y figure aussi
    expect(r.body.connections.some((e: Any) => e.kind === "sessions.revoked" && e.actor_id === "u_alice")).toBe(true);
    expect(r.body.stats).toMatchObject({ logins: expect.any(Number), failed_logins: 0 });
    // Fiston, dont les sessions viennent d'être fermées, est déconnecté ; un autre membre est refusé
    expect((await g.api("u_karim", "GET", "/api/admin/users/u_karim/journal")).status).toBe(401);
    expect((await g.api("u_hugo", "GET", "/api/admin/users/u_karim/journal")).status).toBe(403);
  });

  it("l'analyse relève les signaux, l'IA les commente, et l'analyse elle-même est tracée", async () => {
    for (let i = 0; i < 4; i++)
      await g.ctx.app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "fiston@cadence.app", password: "mauvais-mot-de-passe" },
      });
    const r = await g.api("u_alice", "POST", "/api/admin/audit/analysis", {});
    expect(r.status).toBe(200);
    const codes = r.body.signals.map((s: Any) => s.code);
    expect(codes).toContain("failed_logins");
    expect(r.body.signals.find((s: Any) => s.code === "failed_logins").severity).toBe("critique");
    expect(r.body.stats.total).toBeGreaterThan(0);
    expect(typeof r.body.ai.summary).toBe("string");
    expect(r.body.ai.summary.length).toBeGreaterThan(10);
    expect(Array.isArray(r.body.ai.recommendations)).toBe(true);
    expect(
      await g.ctx.db.one("SELECT 1 FROM security_events WHERE kind = 'audit.analysed' AND actor_id = 'u_alice'"),
    ).toBeTruthy();
    expect((await g.api("u_karim", "POST", "/api/admin/audit/analysis", {})).status).toBe(403);
    // L'export est tracé aussi : rien ne sort du journal sans laisser de trace
    await g.api("u_alice", "GET", "/api/admin/audit.csv");
    expect(
      await g.ctx.db.one("SELECT 1 FROM security_events WHERE kind = 'audit.exported' AND actor_id = 'u_alice'"),
    ).toBeTruthy();
  });
});
