import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Tableau de bord DG — vue par direction. Chaque direction (premier niveau sous l'institution) et tout ce qui lui
 * est rattaché (ses services, leurs agents) donne une photo : projets et leur santé, tâches ouvertes et en retard
 * de ses agents, avancement de son plan de travail comparé à l'avancement attendu à date, décisions à exécuter,
 * courrier imputé, recommandations en retard ; une appréciation (« sous contrôle », « vigilance », « alerte ») en
 * découle. La DG descend d'une direction à ses services et à leurs dossiers. Réservé aux profils de pilotage.
 */
let g: GovCtx;
let dir: string;
let svc: string;
let other: string;
let root: string;
beforeEach(async () => {
  g = await boot();
  root = (await g.ctx.db.one<{ id: string }>("SELECT id FROM org_units WHERE org_id = $1 AND parent_id IS NULL", [
    g.org,
  ]))!.id;
  const mk = async (name: string, parent: string, kind: string) =>
    (await g.api("u_alice", "POST", "/api/org/units", { name, parent_id: parent, kind })).body.id as string;
  dir = await mk("Direction de l'aménagement (essai)", root, "Direction");
  svc = await mk("Service de la planification (essai)", dir, "Service");
  other = await mk("Direction des études (essai)", root, "Direction");
  await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [dir]);
  await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_hugo'", [svc, g.org]);
  // Hugo arrive sans charge : ce qu'il porte dans les données de démonstration reste ailleurs
  await g.ctx.db.query("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = 'u_hugo'");
  await g.ctx.db.query("UPDATE dg_decisions SET owner_id = NULL WHERE owner_id = 'u_hugo'");
  await g.ctx.db.query("UPDATE meeting_actions SET responsible_id = NULL WHERE responsible_id = 'u_hugo'");
  await g.ctx.db.query(
    "UPDATE projects SET unit_id = $1 WHERE unit_id IS NULL AND (lead_id = 'u_hugo' OR owner_id = 'u_hugo')",
    [root],
  );
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const of = (list: Any[], id: string) => list.find((d: Any) => d.id === id);

describe("vue par direction", () => {
  it("rassemble projets, retards, plan, décisions et courrier de la direction et de ses services", async () => {
    // Un projet du service, en difficulté, avec une tâche en retard confiée à Hugo
    const p = (await g.api("u_alice", "POST", "/api/projects", { name: "Schéma d'aménagement (essai)" })).body.id;
    await g.ctx.db.query("UPDATE projects SET unit_id = $1, status = 'off_track' WHERE id = $2", [svc, p]);
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "editor" });
    await g.api("u_alice", "POST", "/api/tasks", {
      project_id: p,
      title: "Relevé de terrain",
      assignee_id: "u_hugo",
      due_on: day(-3),
    });
    // Une décision à exécuter par Hugo, en retard
    await g.api("u_alice", "POST", "/api/decisions", {
      title: "Lancer l'étude de faisabilité",
      content: "Décision d'essai",
      decided_on: day(-20),
      owner_id: "u_hugo",
      due_on: day(-2),
    });
    // Un courrier imputé au service, en retard
    await g.ctx.db.query(
      `INSERT INTO correspondence (id, org_id, direction, year, seq, subject, correspondent, unit_id, due_on, status, received_on)
       VALUES ('cor_essai', $1, 'entrant', 2026, 9999, 'Demande d''avis (essai)', 'Préfecture (fictive)', $2, $3, 'impute', $4)`,
      [g.org, svc, day(-1), day(-10)],
    );
    // Le plan de travail de la direction : une activité à mi-parcours, à 10 %
    await g.ctx.db.query(
      "INSERT INTO work_plans (id, org_id, unit_id, year, title, status) VALUES ('wp_essai', $1, $2, $3, 'Plan d''essai', 'approved')",
      [g.org, dir, Number(day().slice(0, 4))],
    );
    await g.ctx.db.query(
      `INSERT INTO plan_activities (id, org_id, plan_id, title, start_on, end_on, progress)
       VALUES ('pa_essai', $1, 'wp_essai', 'Élaborer le schéma', $2, $3, 10)`,
      [g.org, day(-50), day(50)],
    );

    const r = await g.api("u_alice", "GET", "/api/pilotage/directions");
    expect(r.status).toBe(200);
    const d = of(r.body.directions, dir);
    expect(d).toMatchObject({
      name: "Direction de l'aménagement (essai)",
      manager_name: expect.stringContaining("Karim"),
      agents: 1,
      projects: { total: 1, off_track: 1 },
      tasks: { open: 1, overdue: 1 },
      decisions: { open: 1, late: 1 },
      mail: { open: 1, late: 1 },
      plan: { activities: 1, progress: 10 },
    });
    // Attendu à date : environ la moitié ; l'activité est en retard sur son calendrier
    expect(d.plan.expected).toBeGreaterThanOrEqual(45);
    expect(d.plan.behind).toBe(1);
    expect(d.assessment).toBe("alerte");
    expect(d.alerts.length).toBeGreaterThan(0);
    // Rien ne déborde sur l'autre direction
    expect(of(r.body.directions, other)).toMatchObject({
      agents: 0,
      projects: { total: 0 },
      tasks: { overdue: 0 },
      assessment: "sous_controle",
    });
    // Le service n'est pas une direction : il apparaît dans le détail
    expect(of(r.body.directions, svc)).toBeUndefined();
  });

  it("détaille une direction : ses services, ses dossiers, ses agents, ce qui est en retard", async () => {
    const p = (await g.api("u_alice", "POST", "/api/projects", { name: "Atlas régional (essai)" })).body.id;
    await g.ctx.db.query("UPDATE projects SET unit_id = $1 WHERE id = $2", [svc, p]);
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "editor" });
    await g.api("u_alice", "POST", "/api/tasks", {
      project_id: p,
      title: "Cartes",
      assignee_id: "u_hugo",
      due_on: day(-1),
    });
    await g.api("u_alice", "POST", "/api/decisions", {
      title: "Valider la méthode",
      content: "Décision d'essai",
      decided_on: day(-9),
      owner_id: "u_hugo",
      due_on: day(-4),
    });
    const r = await g.api("u_alice", "GET", `/api/pilotage/directions/${dir}`);
    expect(r.status).toBe(200);
    expect(r.body.unit).toMatchObject({ id: dir, name: "Direction de l'aménagement (essai)" });
    // Les compteurs du périmètre restent distincts des listes de projets et d'agents
    expect(r.body.stats).toMatchObject({ agents: 1, projects: { total: 1 }, tasks: { overdue: 1 } });
    expect(r.body.children.map((c: Any) => c.id)).toEqual([svc]);
    expect(r.body.children[0]).toMatchObject({ tasks: { overdue: 1 } });
    expect(r.body.projects.map((x: Any) => x.id)).toContain(p);
    expect(r.body.agents).toBeUndefined();
    expect(r.body.late.some((x: Any) => x.kind === "decision" && x.title === "Valider la méthode")).toBe(true);
    // On descend au service
    const s = await g.api("u_alice", "GET", `/api/pilotage/directions/${svc}`);
    expect(s.body.unit.id).toBe(svc);
    expect(s.body.breadcrumb.map((b: Any) => b.id)).toEqual([dir, svc]);
  });

  it("une entité inconnue n'existe pas (le refus aux profils sans pilotage est vérifié par la matrice)", async () => {
    expect((await g.api("u_alice", "GET", "/api/pilotage/directions/inconnue")).status).toBe(404);
  });
});

describe("la vue de la DG", () => {
  it("la fiche d'une direction donne la synthèse, pas la charge nominative des agents", async () => {
    const r = (await g.api("u_alice", "GET", `/api/pilotage/directions/${dir}`)).body;
    expect(r.agents).toBeUndefined();
    expect(r.stats).toMatchObject({ agents: 1 });
  });

  it("le profil Assistant(e) de direction saisit pour la DG : décisions, courrier, réunions, agenda", async () => {
    const profiles = (await g.api("u_alice", "GET", "/api/org/profiles")).body as Any[];
    const a = profiles.find((p) => p.name === "Assistant(e) de direction");
    expect(a).toBeTruthy();
    expect(a.permissions).toEqual(
      expect.arrayContaining([
        "decisions.record",
        "correspondence.manage",
        "meetings.manage",
        "agenda.manage",
        "pilotage.view",
      ]),
    );
    // Il prépare et enregistre ; il ne signe ni n'approuve à la place de la DG
    expect(a.permissions).not.toContain("plans.approve");
    expect(a.permissions).not.toContain("meetings.validate");
  });
});
