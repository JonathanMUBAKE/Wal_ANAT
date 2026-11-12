import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Notifications partout. Chaque changement qui concerne quelqu'un le prévient : tâche modifiée (échéance, priorité,
 * intitulé, réouverture), tâche retirée, réunion modifiée ou annulée après convocation, retard signalé au chef
 * d'entité. Chaque notification porte son domaine et son lien. Chacun règle, par domaine, s'il la reçoit aussi par
 * courriel ; l'avis dans l'outil reste toujours.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const notes = (user: string) =>
  g.ctx.db.query<Any>(
    "SELECT kind, title, body, category, link FROM notifications WHERE user_id = $1 ORDER BY created_at",
    [user],
  );

describe("notifications des tâches", () => {
  it("le chargé est prévenu des changements de sa tâche, en un seul avis ; l'ancien chargé quand elle lui est retirée", async () => {
    const p = await g.project();
    for (const u of ["u_karim", "u_hugo"])
      await g.api("u_alice", "PUT", `/api/projects/${p}/members/${u}`, { role: "editor" });
    const t = (
      await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Rédiger la note", assignee_id: "u_karim" })
    ).body;
    await g.api("u_alice", "PATCH", `/api/tasks/${t.id}`, { due_on: day(5), priority: "high" });
    const changed = (await notes("u_karim")).filter((n: Any) => n.kind === "task.changed");
    expect(changed).toHaveLength(1);
    expect(changed[0].body).toMatch(/Échéance/);
    expect(changed[0].body).toMatch(/Priorité/);
    expect(changed[0]).toMatchObject({ category: "taches" });
    expect(changed[0].link).toContain(`task=${t.id}`);
    // Le chargé qui modifie sa propre tâche ne se prévient pas lui-même
    await g.api("u_karim", "PATCH", `/api/tasks/${t.id}`, { title: "Rédiger la note de cadrage" });
    expect((await notes("u_karim")).filter((n: Any) => n.kind === "task.changed")).toHaveLength(1);
    // Réattribuée : Hugo est prévenu (assignation), Karim aussi (retrait)
    await g.api("u_alice", "PATCH", `/api/tasks/${t.id}`, { assignee_id: "u_hugo" });
    expect((await notes("u_karim")).some((n: Any) => n.kind === "task.unassigned")).toBe(true);
    expect((await notes("u_hugo")).some((n: Any) => n.kind === "assigned")).toBe(true);
  });
});

describe("notifications des réunions", () => {
  it("les convoqués sont prévenus d'un changement de date ou de lieu, puis de l'annulation", async () => {
    const m = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Comité technique",
        meeting_date: day(3),
        start_time: "09:00",
        timing: "upcoming",
        invitees: [{ user_id: "u_karim" }],
      })
    ).body;
    await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, { agenda: [{ subject: "Point" }], attendees: [] });
    await g.api("u_alice", "POST", `/api/meetings/${m.id}/convene`, { short_notice: true });
    await g.api("u_alice", "PATCH", `/api/meetings/${m.id}`, { meeting_date: day(4), location: "Salle B" });
    const changed = (await notes("u_karim")).find((n: Any) => n.kind === "meeting.changed");
    expect(changed).toBeTruthy();
    expect(changed.body).toMatch(/Date/);
    expect(changed.body).toMatch(/Salle B/);
    expect(changed).toMatchObject({ category: "reunions", link: `/reunions/${m.id}` });
    expect((await g.api("u_alice", "DELETE", `/api/meetings/${m.id}`)).status).toBe(200);
    expect((await notes("u_karim")).some((n: Any) => n.kind === "meeting.cancelled")).toBe(true);
  });
});

describe("retards signalés au chef d'entité", () => {
  it("une tâche en retard prévient son chargé, puis le chef de son entité, une seule fois", async () => {
    const [unit] = await g.units(1);
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_hugo'", [unit, g.org]);
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "editor" });
    await g.api("u_alice", "POST", "/api/tasks", {
      project_id: p,
      title: "Rapport en souffrance",
      assignee_id: "u_hugo",
      due_on: day(-3),
    });
    const sweep = async () => (await import("./reminders.js")).Reminders;
    const R = await sweep();
    await new R(g.ctx.svc).sweep();
    await new R(g.ctx.svc).sweep();
    expect(
      (await notes("u_hugo")).filter(
        (n: Any) => n.kind === "deadline.late" && n.title.includes("Rapport en souffrance"),
      ).length,
    ).toBe(1);
    const escalated = (await notes("u_karim")).filter(
      (n: Any) => n.kind === "task.late.manager" && n.title.includes("Rapport en souffrance"),
    );
    expect(escalated).toHaveLength(1);
    expect(escalated[0].title).toMatch(/Hugo/);
  });
});

describe("préférences de notification", () => {
  it("chacun choisit par domaine s'il reçoit aussi un courriel ; l'avis dans l'outil reste", async () => {
    const r = await g.api("u_karim", "GET", "/api/me/notification-prefs");
    expect(r.status).toBe(200);
    expect(r.body.categories.map((c: Any) => c.id)).toEqual(expect.arrayContaining(["taches", "reunions", "courrier"]));
    expect(r.body.prefs.taches).toMatchObject({ email: true });
    expect((await g.api("u_karim", "PUT", "/api/me/notification-prefs", { taches: { email: false } })).status).toBe(
      200,
    );
    expect((await g.api("u_karim", "GET", "/api/me/notification-prefs")).body.prefs.taches.email).toBe(false);
    expect((await g.api("u_karim", "PUT", "/api/me/notification-prefs", { inconnu: { email: false } })).status).toBe(
      400,
    );
  });
});
