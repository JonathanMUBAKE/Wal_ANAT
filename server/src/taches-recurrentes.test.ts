import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate, nextOccurrence } from "./services.js";

/*
 * Tâches récurrentes. Le travail courant d'une entité se répète (point hebdomadaire, rapport mensuel, bilan
 * trimestriel). Une tâche porte une périodicité ; la terminer fait naître l'occurrence suivante, une seule fois,
 * avec les mêmes intitulé, chargé, priorité, étiquettes et sous-tâches, et l'échéance décalée d'une période.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("calcul de l'occurrence suivante", () => {
  it("décale l'échéance d'une période, en gardant la fin de mois", () => {
    expect(nextOccurrence("2026-11-12", "daily")).toBe("2026-11-13");
    expect(nextOccurrence("2026-11-12", "weekly")).toBe("2026-11-19");
    expect(nextOccurrence("2026-11-12", "biweekly")).toBe("2026-11-26");
    expect(nextOccurrence("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextOccurrence("2026-11-30", "quarterly")).toBe("2027-02-28");
    expect(nextOccurrence("2028-02-29", "yearly")).toBe("2029-02-28");
  });
});

describe("tâches récurrentes", () => {
  it("terminer une tâche récurrente crée la suivante, une seule fois", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_karim`, { role: "editor" });
    const t = (
      await g.api("u_alice", "POST", "/api/tasks", {
        project_id: p,
        title: "Point hebdomadaire",
        assignee_id: "u_karim",
        priority: "high",
        tags: ["rituel"],
        start_on: day(-1),
        due_on: day(2),
        recurrence: "weekly",
      })
    ).body;
    expect(t.recurrence).toBe("weekly");
    await g.api("u_alice", "POST", "/api/tasks", { project_id: p, parent_id: t.id, title: "Préparer l'ordre du jour" });

    const done = await g.api("u_karim", "PATCH", `/api/tasks/${t.id}`, { completed: true });
    expect(done.status).toBe(200);
    expect(done.body.next_occurrence_id).toBeTruthy();
    const next = (await g.api("u_karim", "GET", `/api/tasks/${done.body.next_occurrence_id}`)).body;
    expect(next).toMatchObject({
      title: "Point hebdomadaire",
      assignee_id: "u_karim",
      priority: "high",
      tags: ["rituel"],
      recurrence: "weekly",
      completed: false,
      start_on: day(6),
      due_on: day(9),
      section_id: t.section_id,
    });
    expect(next.subtasks.map((s: Any) => [s.title, s.completed])).toEqual([["Préparer l'ordre du jour", false]]);

    // Rouvrir puis terminer à nouveau ne crée pas de doublon
    await g.api("u_karim", "PATCH", `/api/tasks/${t.id}`, { completed: false });
    await g.api("u_karim", "PATCH", `/api/tasks/${t.id}`, { completed: true });
    const all = await g.ctx.db.query<Any>(
      "SELECT id FROM tasks WHERE project_id = $1 AND title = 'Point hebdomadaire'",
      [p],
    );
    expect(all).toHaveLength(2);
    // L'activité garde la trace de la création de l'occurrence
    const act = await g.ctx.db.query<Any>("SELECT kind FROM activity WHERE task_id = $1", [t.id]);
    expect(act.map((a: Any) => a.kind)).toContain("task.recurred");
  });

  it("sans échéance, la suivante part de la date du jour ; arrêter la récurrence n'en crée plus", async () => {
    const p = await g.project();
    const t = (
      await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Rapport mensuel", recurrence: "monthly" })
    ).body;
    const done = (await g.api("u_alice", "PATCH", `/api/tasks/${t.id}`, { completed: true })).body;
    const next = (await g.api("u_alice", "GET", `/api/tasks/${done.next_occurrence_id}`)).body;
    expect(next.due_on).toBe(nextOccurrence(day(0), "monthly"));

    await g.api("u_alice", "PATCH", `/api/tasks/${next.id}`, { recurrence: null });
    const stopped = (await g.api("u_alice", "PATCH", `/api/tasks/${next.id}`, { completed: true })).body;
    expect(stopped.next_occurrence_id).toBeNull();
  });

  it("refuse une périodicité inconnue et une sous-tâche récurrente", async () => {
    const p = await g.project();
    const bad = await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "X", recurrence: "hourly" });
    expect(bad.status).toBe(400);
    const t = (await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Parent" })).body;
    const sub = await g.api("u_alice", "POST", "/api/tasks", {
      project_id: p,
      parent_id: t.id,
      title: "Sous-tâche",
      recurrence: "weekly",
    });
    expect(sub.status).toBe(400);
    expect(sub.body.error ?? sub.body.message).toMatch(/sous-tâche/i);
  });
});
