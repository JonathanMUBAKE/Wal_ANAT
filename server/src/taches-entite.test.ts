import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Lot T1 — tâches d'entité. Une tâche n'est pas forcément dans un projet : chaque entité (direction, service,
 * cellule) a son registre de tâches. Le responsable de l'entité y confie des tâches à ses agents et suit leur état,
 * y compris les tâches que ses agents portent dans les projets. Un agent y note ses propres tâches, mais ne confie
 * rien à un collègue : attribuer revient au responsable. Une personne extérieure à l'entité n'y a pas accès.
 */
let g: GovCtx;
let unit: string;
let sub: string;
beforeEach(async () => {
  g = await boot();
  for (const id of ["u_chloe", "u_ines"]) await g.login(id);
  [unit] = await g.units(1);
  sub = (await g.api("u_alice", "POST", "/api/org/units", { name: "Cellule cartographie", parent_id: unit })).body.id;
  // Karim dirige l'entité ; Hugo et Chloé y travaillent ; Inès travaille dans la cellule rattachée
  await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
  await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id IN ('u_hugo', 'u_chloe')", [
    unit,
    g.org,
  ]);
  await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_ines'", [sub, g.org]);
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const board = async (who: string, u = unit) => g.api(who, "GET", `/api/units/${u}/board`);

describe("registre des tâches d'une entité", () => {
  it("s'ouvre pour le responsable et les agents de l'entité, pas pour les autres", async () => {
    const mgr = await board("u_karim");
    expect(mgr.status).toBe(200);
    expect(mgr.body).toMatchObject({ unit: { id: unit }, can: { assign: true } });
    expect(mgr.body.members.map((m: Any) => m.id)).toEqual(expect.arrayContaining(["u_hugo", "u_chloe", "u_karim"]));
    const agent = await board("u_hugo");
    expect(agent.status).toBe(200);
    expect(agent.body.project_id).toBe(mgr.body.project_id);
    expect(agent.body.can.assign).toBe(false);
    // Inès (cellule rattachée) n'appartient pas à cette entité ; son responsable hiérarchique ouvre la cellule
    expect((await board("u_ines")).status).toBe(403);
    expect((await board("u_karim", sub)).status).toBe(200);
    expect((await board("u_hugo", sub)).status).toBe(403);
    // Le registre n'est pas un projet du portefeuille
    const projects = (await g.api("u_karim", "GET", "/api/projects")).body as Any[];
    expect(projects.some((p) => p.id === mgr.body.project_id)).toBe(false);
    // « Mes entités » : rôle de chacun
    const mine = (await g.api("u_karim", "GET", "/api/me/units")).body as Any[];
    expect(mine.find((u) => u.id === unit)?.role).toBe("responsable");
    expect(mine.find((u) => u.id === sub)?.role).toBe("responsable");
    const hugo = ((await g.api("u_hugo", "GET", "/api/me/units")).body as Any[]).map((u) => [u.id, u.role]);
    expect(hugo).toContainEqual([unit, "agent"]);
    expect(hugo.some(([id]) => id === sub)).toBe(false);
  });

  it("le responsable confie une tâche à un agent, qui est prévenu ; l'agent ne confie rien à un collègue", async () => {
    const pid = (await board("u_karim")).body.project_id;
    const given = await g.api("u_karim", "POST", "/api/tasks", {
      project_id: pid,
      title: "Préparer la note de cadrage",
      assignee_id: "u_hugo",
      due_on: day(3),
    });
    expect(given.status).toBe(200);
    expect(
      await g.ctx.db.one(
        "SELECT 1 FROM notifications WHERE user_id = 'u_hugo' AND kind = 'assigned' AND task_id = $1",
        [given.body.id],
      ),
    ).toBeTruthy();
    // L'agent note sa propre tâche, hors de tout projet
    expect(
      (
        await g.api("u_hugo", "POST", "/api/tasks", {
          project_id: pid,
          title: "Relire le rapport",
          assignee_id: "u_hugo",
        })
      ).status,
    ).toBe(200);
    // … mais n'en confie pas à une collègue, ni ne réattribue celle qu'on lui a confiée
    const toColleague = await g.api("u_hugo", "POST", "/api/tasks", {
      project_id: pid,
      title: "Pour Chloé",
      assignee_id: "u_chloe",
    });
    expect(toColleague.status).toBe(403);
    expect(toColleague.body.error).toMatch(/responsable/);
    expect((await g.api("u_hugo", "PATCH", `/api/tasks/${given.body.id}`, { assignee_id: "u_chloe" })).status).toBe(
      403,
    );
    // Il fait avancer la sienne ; il ne touche pas à celle d'une collègue
    expect((await g.api("u_hugo", "PATCH", `/api/tasks/${given.body.id}`, { completed: true })).status).toBe(200);
    const chloe = (
      await g.api("u_karim", "POST", "/api/tasks", { project_id: pid, title: "Tâche de Chloé", assignee_id: "u_chloe" })
    ).body;
    expect((await g.api("u_hugo", "PATCH", `/api/tasks/${chloe.id}`, { completed: true })).status).toBe(403);
    // Le responsable ne confie pas une tâche à quelqu'un d'extérieur à l'entité
    expect(
      (await g.api("u_karim", "POST", "/api/tasks", { project_id: pid, title: "x", assignee_id: "u_ines" })).status,
    ).toBe(400);
    // Le responsable voit aussi les agents des entités rattachées ; leur tâche se range dans le registre de leur entité
    const ines = (await board("u_karim")).body.members.find((m: Any) => m.id === "u_ines");
    expect(ines).toMatchObject({ unit_id: sub });
    const subBoard = (await board("u_karim", sub)).body.project_id;
    const forInes = await g.api("u_karim", "POST", "/api/tasks", {
      project_id: subBoard,
      title: "Mettre à jour la carte",
      assignee_id: "u_ines",
    });
    expect(forInes.status).toBe(200);
    expect((await g.api("u_ines", "PATCH", `/api/tasks/${forInes.body.id}`, { completed: true })).status).toBe(200);
    // Un agent ne voit que les personnes de sa propre entité
    expect((await board("u_hugo")).body.members.some((m: Any) => m.id === "u_ines")).toBe(false);
    // La tâche figure dans « Mes tâches » de l'agent
    const mine = (await g.api("u_hugo", "GET", "/api/tasks?assignee=me")).body as Any[];
    expect(mine.map((t) => t.title)).toEqual(
      expect.arrayContaining(["Préparer la note de cadrage", "Relire le rapport"]),
    );
  });

  it("le responsable suit chaque agent : tâches de l'entité et tâches portées dans les projets", async () => {
    const pid = (await board("u_karim")).body.project_id;
    await g.api("u_karim", "POST", "/api/tasks", {
      project_id: pid,
      title: "En retard",
      assignee_id: "u_hugo",
      due_on: day(-2),
    });
    await g.api("u_karim", "POST", "/api/tasks", { project_id: pid, title: "Pour Inès", assignee_id: "u_karim" });
    // Une tâche de projet confiée à Chloé, dans un projet que le responsable peut lire
    const project = (await g.api("u_karim", "POST", "/api/projects", { name: "Schéma régional", access: "private" }))
      .body;
    await g.api("u_karim", "PUT", `/api/projects/${project.id}/members/u_chloe`, { role: "editor" });
    await g.api("u_karim", "POST", "/api/tasks", {
      project_id: project.id,
      title: "Tâche projet",
      assignee_id: "u_chloe",
    });
    const r = await g.api("u_karim", "GET", `/api/units/${unit}/follow-up`);
    expect(r.status).toBe(200);
    const hugo = r.body.agents.find((a: Any) => a.user_id === "u_hugo");
    expect(hugo.overdue).toBeGreaterThanOrEqual(1);
    expect(r.body.tasks.find((t: Any) => t.title === "En retard")).toMatchObject({
      overdue: true,
      in_unit_board: true,
    });
    expect(r.body.agents.some((a: Any) => a.user_id === "u_ines")).toBe(true); // la cellule rattachée est suivie
    const titles = r.body.tasks.map((t: Any) => t.title);
    expect(titles).toEqual(expect.arrayContaining(["En retard", "Tâche projet"]));
    expect(r.body.tasks.find((t: Any) => t.title === "Tâche projet")).toMatchObject({
      project_name: "Schéma régional",
      in_unit_board: false,
    });
    // Les agents ne voient pas le suivi des autres ; une personne extérieure non plus
    expect((await g.api("u_hugo", "GET", `/api/units/${unit}/follow-up`)).status).toBe(403);
    expect((await g.api("u_ines", "GET", `/api/units/${unit}/follow-up`)).status).toBe(403);
  });
});
