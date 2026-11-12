import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Module RH (identification des agents) et profils institutionnels.
 *
 * Toute personne créée comme agent devient utilisateur : un compte est ouvert, elle reçoit un lien pour choisir son
 * mot de passe et n'a accès qu'à la vue Agent. Son dossier réunit identité, situation administrative (statut,
 * grade, fonction), affectation et son historique, diplômes et personnes à prévenir. Le service RH tient les
 * dossiers ; l'agent consulte le sien sans le modifier ; le chef d'entité consulte ceux de ses agents.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const GOOD = "cheval-agrafe-batterie-42";
const tokenOf = (link: string) => link.split("#token=")[1];

const newAgent = async (over: Record<string, unknown> = {}) => {
  const units = (await g.api("u_alice", "GET", "/api/org/units")).body as Any[];
  return g.api("u_alice", "POST", "/api/hr/agents", {
    civility: "Mme",
    last_name: "Fictive",
    first_names: "Awa Marie",
    email: "awa.fictive@exemple.test",
    birth_date: "1990-04-12",
    birth_place: "Ville fictive",
    nationality: "Fictivienne",
    gender: "F",
    phone: "+000 00 00 00",
    status: "fonctionnaire",
    grade: "Attaché principal",
    category: "A",
    function_title: "Chargée d'études",
    unit_id: units[1].id,
    hired_on: "2020-01-06",
    ...over,
  });
};

describe("module RH : créer un agent", () => {
  it("crée le dossier et le compte ; l'agent reçoit un lien et n'a que la vue Agent", async () => {
    expect((await g.api("u_karim", "POST", "/api/hr/agents", { last_name: "x" })).status).toBe(403);
    const r = await newAgent();
    expect(r.status).toBe(200);
    expect(r.body.link).toMatch(/#token=/);
    expect(r.body.agent).toMatchObject({ last_name: "Fictive", grade: "Attaché principal", status: "fonctionnaire" });
    expect(r.body.agent.matricule).toMatch(/^AG-\d{4}-\d{4}$/);
    const userId = r.body.agent.user_id;
    const act = await g.ctx.app.inject({
      method: "POST",
      url: "/api/auth/activate",
      payload: { token: tokenOf(r.body.link), password: GOOD },
    });
    expect(act.statusCode).toBe(200);
    const m = await g.ctx.db.one<Any>(
      "SELECT om.unit_id, p.name AS profile FROM org_members om JOIN access_profiles p ON p.id = om.profile_id WHERE om.user_id = $1",
      [userId],
    );
    expect(m).toMatchObject({ profile: "Agent", unit_id: r.body.agent.unit_id });
    // Même adresse : refus
    expect((await newAgent()).status).toBe(400);
    expect(await g.ctx.db.one("SELECT 1 FROM activity WHERE kind = 'hr.agent.created'")).toBeTruthy();
  });

  it("tient diplômes, personnes à prévenir et historique des affectations", async () => {
    const a = (await newAgent()).body.agent;
    const id = a.user_id;
    const dip = await g.api("u_alice", "POST", `/api/hr/agents/${id}/diplomas`, {
      title: "Master en aménagement du territoire",
      institution: "Université fictive",
      year: 2014,
      level: "Bac+5",
    });
    expect(dip.status).toBe(200);
    const contact = await g.api("u_alice", "POST", `/api/hr/agents/${id}/contacts`, {
      name: "M. Proche Fictif",
      relation: "Conjoint",
      phone: "+000 11 11 11",
    });
    expect(contact.status).toBe(200);
    const units = (await g.api("u_alice", "GET", "/api/org/units")).body as Any[];
    const moved = await g.api("u_alice", "PATCH", `/api/hr/agents/${id}`, {
      unit_id: units[2].id,
      function_title: "Cheffe de projet",
      assignment_reference: "Note de service n° 12 (fictive)",
    });
    expect(moved.status).toBe(200);
    const full = (await g.api("u_alice", "GET", `/api/hr/agents/${id}`)).body;
    expect(full.diplomas.map((d: Any) => d.title)).toContain("Master en aménagement du territoire");
    expect(full.contacts.map((c: Any) => c.name)).toContain("M. Proche Fictif");
    expect(full.assignments).toHaveLength(2);
    expect(full.assignments[0]).toMatchObject({ unit_id: units[2].id, ended_on: null });
    expect(full.assignments[1].ended_on).not.toBeNull();
    expect((await g.ctx.db.one<Any>("SELECT unit_id FROM org_members WHERE user_id = $1", [id]))!.unit_id).toBe(
      units[2].id,
    );
    expect((await g.api("u_alice", "DELETE", `/api/hr/diplomas/${dip.body.id}`)).status).toBe(200);
    expect((await g.api("u_alice", "DELETE", `/api/hr/contacts/${contact.body.id}`)).status).toBe(200);
  });

  it("l'agent lit son dossier sans pouvoir le modifier ; le chef d'entité lit ceux de ses agents ; les autres non", async () => {
    // Didier devient agent (dossier ouvert pour un compte existant)
    const units = (await g.api("u_alice", "GET", "/api/org/units")).body as Any[];
    const unit = units[1].id;
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
    const opened = await g.api("u_alice", "POST", "/api/hr/agents", {
      user_id: "u_hugo",
      last_name: "Lukusa",
      first_names: "Didier",
      status: "contractuel",
      unit_id: unit,
    });
    expect(opened.status).toBe(200);
    const mine = await g.api("u_hugo", "GET", "/api/hr/me");
    expect(mine.status).toBe(200);
    expect(mine.body.last_name).toBe("Lukusa");
    // Lecture seule : l'agent ne modifie rien de son dossier, le service RH le tient
    expect(mine.body.can).toMatchObject({ manage: false, self: true });
    expect((await g.api("u_hugo", "PATCH", "/api/hr/me", { phone: "+000 22 22 22" })).status).toBe(404);
    expect((await g.api("u_hugo", "PATCH", "/api/hr/agents/u_hugo", { phone: "+000 22 22 22" })).status).toBe(403);
    expect((await g.api("u_hugo", "POST", "/api/hr/agents/u_hugo/diplomas", { title: "Doctorat" })).status).toBe(403);
    expect((await g.api("u_hugo", "POST", "/api/hr/agents/u_hugo/contacts", { name: "Proche" })).status).toBe(403);
    const dip = await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/diplomas", { title: "Licence" });
    const ctc = await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/contacts", { name: "Proche" });
    expect((await g.api("u_hugo", "DELETE", `/api/hr/diplomas/${dip.body.id}`)).status).toBe(403);
    expect((await g.api("u_hugo", "DELETE", `/api/hr/contacts/${ctc.body.id}`)).status).toBe(403);
    expect((await g.api("u_karim", "GET", "/api/hr/agents/u_hugo")).status).toBe(200);
    expect((await g.api("u_karim", "PATCH", "/api/hr/agents/u_hugo", { grade: "x" })).status).toBe(403);
    expect((await g.api("u_karim", "GET", "/api/hr/agents")).status).toBe(403);
    const list = (await g.api("u_alice", "GET", "/api/hr/agents")).body as Any[];
    expect(list.map((a) => a.user_id)).toContain("u_hugo");
  });

  it("le service RH ne modifie pas son propre dossier : un autre gestionnaire s'en charge", async () => {
    // Bernadette tient les dossiers ; Fiston reçoit aussi le droit, pour pouvoir tenir celui d'Bernadette
    await g.ctx.db.query(
      `UPDATE org_members SET permission_overrides = '{"hr.manage": true}'::jsonb WHERE user_id = 'u_karim'`,
    );
    expect(
      (await g.api("u_karim", "POST", "/api/hr/agents", { user_id: "u_alice", last_name: "Mbuyi" })).status,
    ).toBe(200);
    // Ouvrir son propre dossier lui est aussi refusé
    expect(
      (await g.api("u_karim", "POST", "/api/hr/agents", { user_id: "u_karim", last_name: "Banza" })).status,
    ).toBe(403);
    const mine = (await g.api("u_alice", "GET", "/api/hr/me")).body;
    expect(mine.can).toMatchObject({ manage: false, self: true });
    expect((await g.api("u_alice", "PATCH", "/api/hr/agents/u_alice", { grade: "Directrice" })).status).toBe(403);
    expect((await g.api("u_alice", "POST", "/api/hr/agents/u_alice/diplomas", { title: "Doctorat" })).status).toBe(
      403,
    );
    expect((await g.api("u_alice", "POST", "/api/hr/agents/u_alice/contacts", { name: "Proche" })).status).toBe(403);
    expect((await g.api("u_karim", "PATCH", "/api/hr/agents/u_alice", { grade: "Directrice" })).status).toBe(200);
  });
});

describe("profils institutionnels", () => {
  it("chaque organisation a les profils de l'institution, avec qui voit quoi et qui valide quoi", async () => {
    const profiles = (await g.api("u_alice", "GET", "/api/org/profiles")).body as Any[];
    const by = (n: string) => profiles.find((p) => p.name === n);
    for (const n of ["Agent", "Stagiaire", "Consultant", "Chef d'entité", "DGA", "DG", "Responsable informatique"])
      expect(by(n), n).toBeTruthy();
    expect(by("Agent").permissions).not.toContain("pilotage.view");
    expect(by("Agent").permissions).not.toContain("org.members");
    expect(by("Agent").permissions).toContain("tasks.create");
    expect(by("Stagiaire").permissions).not.toContain("projects.create");
    expect(by("Consultant").base_role).toBe("guest");
    expect(by("Chef d'entité").permissions).toEqual(expect.arrayContaining(["plans.manage", "deliverables.validate"]));
    expect(by("DG").permissions).toEqual(expect.arrayContaining(["decisions.record", "pilotage.view", "hr.view"]));
    expect(by("DGA").permissions).toContain("pilotage.view");
    expect(by("DGA").permissions).not.toContain("decisions.record");
    expect(by("Responsable informatique").permissions).toContain("org.members");
    expect(by("Responsable informatique").permissions).not.toContain("decisions.record");
    expect(by("Responsable informatique").permissions).not.toContain("pilotage.view");
    expect(by("Administrateur").permissions).toEqual(expect.arrayContaining(["hr.view", "hr.manage"]));
  });
});
