import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

let g: GovCtx;
let app: string;
beforeEach(async () => {
  g = await boot();
  app = (await g.ctx.db.one<{ id: string }>("SELECT id FROM projects WHERE name LIKE '%Application mobile%'"))!.id;
});
afterEach(() => g.ctx.app.close());
const today = new Date().toISOString().slice(0, 10);
const add = async (patch: Record<string, unknown> = {}) =>
  (await g.api("u_alice", "POST", "/api/activities", { kind: "commission", title: "Commission nationale", ...patch }))
    .body;

describe("activités de l'Agence", () => {
  it("crée chaque forme d'activité", async () => {
    for (const kind of ["commission", "conference", "rendez_vous", "interne"])
      expect((await add({ kind })).kind).toBe(kind);
  });
  it("un membre lit mais ne crée pas", async () => {
    await add();
    expect((await g.api("u_karim", "GET", "/api/activities")).body).toHaveLength(1);
    expect((await g.api("u_karim", "POST", "/api/activities", { kind: "interne", title: "x" })).status).toBe(403);
  });
  it("un rendez-vous est confidentiel par défaut et invisible d'un membre", async () => {
    const a = await add({ kind: "rendez_vous", title: "Audience" });
    expect(a.confidential).toBe(true);
    expect((await g.api("u_karim", "GET", "/api/activities")).body).toEqual([]);
    expect((await g.api("u_karim", "GET", `/api/activities/${a.id}`)).status).toBe(404);
  });
  it("le responsable désigné modifie son activité sans droit de gestion", async () => {
    const a = await add({ lead_id: "u_karim" });
    const r = await g.api("u_karim", "PATCH", `/api/activities/${a.id}`, { outcome: "Position défendue" });
    expect(r.body.outcome).toBe("Position défendue");
    expect((await g.api("u_karim", "DELETE", `/api/activities/${a.id}`)).status).toBe(403);
  });
  it("refuse une date impossible, une fin avant le début, un responsable extérieur", async () => {
    expect(
      (await g.api("u_alice", "POST", "/api/activities", { kind: "interne", title: "x", start_on: "2026-02-31" }))
        .status,
    ).toBe(400);
    expect(
      (
        await g.api("u_alice", "POST", "/api/activities", {
          kind: "interne",
          title: "x",
          start_on: "2026-03-02",
          end_on: "2026-03-01",
        })
      ).status,
    ).toBe(400);
    expect(
      (await g.api("u_alice", "POST", "/api/activities", { kind: "interne", title: "x", lead_id: "inconnu" })).status,
    ).toBe(400);
  });
  it("suit les suites à donner et prévient le responsable", async () => {
    const a = await add();
    const r = await g.api("u_alice", "POST", `/api/activities/${a.id}/followups`, {
      text: "Transmettre la note",
      responsible_id: "u_karim",
      due_on: "2026-12-01",
    });
    expect(r.body.followups[0]).toMatchObject({
      text: "Transmettre la note",
      responsible_name: "Karim Benali",
      done: false,
    });
    const notes = (await g.api("u_karim", "GET", "/api/notifications")).body as { kind: string }[];
    expect(notes.some((n) => n.kind === "activity.followup")).toBe(true);
    const done = await g.api("u_karim", "PATCH", `/api/activity-followups/${r.body.followups[0].id}`, { done: true });
    expect(done.body.followups[0].done).toBe(true);
  });
  it("une autre organisation n'y a pas accès", async () => {
    const a = await add();
    const o = await g.foreignOrg();
    expect((await g.api(o.who, "GET", `/api/activities/${a.id}`)).status).toBe(403);
    expect((await g.api(o.who, "GET", "/api/activities")).body).toEqual([]);
  });
});

describe("gouvernance des projets", () => {
  it("renseigne projet confié, commanditaire, responsable et budget", async () => {
    const r = await g.api("u_alice", "PUT", `/api/projects/${app}/governance`, {
      origin: "confie",
      sponsor: "Ministère",
      convention_ref: "CONV-12",
      lead_id: "u_karim",
      budget_planned: 1000,
      budget_spent: 250,
    });
    expect(r.body).toMatchObject({
      origin: "confie",
      sponsor: "Ministère",
      lead_name: "Karim Benali",
      budget_planned: 1000,
      budget_spent: 250,
    });
  });
  it("attribue un rôle précis à chaque membre de l'équipe", async () => {
    const r = await g.api("u_alice", "PUT", `/api/projects/${app}/team/u_karim`, {
      function_label: "Responsable technique",
    });
    expect(r.body.team.find((m: { user_id: string }) => m.user_id === "u_karim").function_label).toBe(
      "Responsable technique",
    );
  });
  it("refuse un rôle pour une personne hors de l'équipe", async () => {
    await g.ctx.db.query("DELETE FROM memberships WHERE user_id = 'u_hugo' AND project_id = $1", [app]);
    await g.ctx.db.query("DELETE FROM team_members WHERE user_id = 'u_hugo'");
    expect((await g.api("u_alice", "PUT", `/api/projects/${app}/team/u_hugo`, { function_label: "X" })).status).toBe(
      403,
    );
  });
  it("seul l'administrateur du projet modifie la gouvernance", async () => {
    await g.api("u_alice", "PUT", `/api/projects/${app}/members/u_karim`, { role: "viewer" });
    expect((await g.api("u_karim", "PUT", `/api/projects/${app}/governance`, { sponsor: "x" })).status).toBe(403);
  });
  it("la vue projet liste l'équipe, les retards et les prochaines échéances", async () => {
    await g.api("u_alice", "POST", "/api/tasks", {
      project_id: app,
      title: "En retard",
      due_on: "2020-01-01",
      assignee_id: "u_karim",
    });
    const r = await g.api("u_alice", "GET", `/api/projects/${app}/governance`);
    expect(r.body.late.map((t: { title: string }) => t.title)).toContain("En retard");
    expect(r.body.team.find((m: { user_id: string }) => m.user_id === "u_karim").late).toBeGreaterThan(0);
  });
});

describe("grand tableau de bord", () => {
  it("réunit toutes les formes d'activité avec leurs compteurs", async () => {
    await g.api("u_alice", "PUT", `/api/projects/${app}/governance`, {
      origin: "confie",
      decision_needed: "Arbitrer le budget",
    });
    await add();
    await add({ kind: "conference", title: "Conférence", start_on: today });
    await add({ kind: "interne", title: "Chantier", progress: 40, health: "off_track" });
    const r = await g.api("u_alice", "GET", "/api/pilotage");
    expect(r.status).toBe(200);
    expect(r.body.counters).toMatchObject({
      projets_confies: 1,
      commissions: 1,
      conferences: 1,
      activites_internes: 1,
    });
    expect(r.body.decisions.map((d: { title: string }) => d.title).join()).toContain("Application mobile");
    expect(r.body.agenda.map((d: { title: string }) => d.title)).toContain("Conférence");
    expect(r.body.health.off_track).toBeGreaterThan(0);
    expect(r.body.brief.length).toBe(4);
  });
  it("compte les recommandations en retard", async () => {
    const m = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "CODIR",
        meeting_date: "2026-01-05",
        writer_id: "u_karim",
      })
    ).body;
    await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
      agenda: [{ subject: "S", actions: [{ text: "Faire", responsible_id: "u_karim", due_on: "2020-01-01" }] }],
      attendees: [],
    });
    const r = await g.api("u_alice", "GET", "/api/pilotage");
    expect(r.body.recommendations.late).toBe(1);
    expect(r.body.recommendations.late_list[0].reference).toContain("/ANAT/");
  });
  it("n'expose pas les recommandations d'une réunion confidentielle", async () => {
    const m = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Secret",
        meeting_date: "2026-01-05",
        writer_id: "u_karim",
        confidential: true,
      })
    ).body;
    await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
      agenda: [{ subject: "S", actions: [{ text: "Faire", due_on: "2020-01-01" }] }],
      attendees: [],
    });
    expect((await g.api("u_alice", "GET", "/api/pilotage")).body.recommendations.late).toBe(0);
  });
  it("est réservé aux profils de pilotage", async () => {
    expect((await g.api("u_karim", "GET", "/api/pilotage")).status).toBe(403);
  });
});
