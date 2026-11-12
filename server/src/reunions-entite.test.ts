import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Réunions dans les entités. Le module Réunions ne change pas : une entité y organise ses réunions (programmer,
 * convoquer, compte rendu), son responsable en est le gestionnaire. Une réunion où toute l'entité est convoquée
 * appartient à l'entité. L'espace de l'entité et l'accueil de chacun mettent en avant les réunions où il faut être ;
 * la réunion hebdomadaire de l'entité y figure toujours. Les projets où l'entité ou son responsable sont invités
 * apparaissent dans l'espace de l'entité, selon l'accès de chacun.
 */
let g: GovCtx;
let unit: string;
beforeEach(async () => {
  g = await boot();
  await g.login("u_chloe");
  [unit] = await g.units(1);
  await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
  await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id IN ('u_hugo', 'u_chloe')", [
    unit,
    g.org,
  ]);
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("réunions d'une entité", () => {
  it("le responsable programme la réunion de son entité, la convoque et en tient le compte rendu ; un agent ne la programme pas", async () => {
    const body = {
      meeting_type: "Réunion de service",
      title: "Point hebdomadaire",
      meeting_date: day(1),
      start_time: "09:00",
      unit_id: unit,
      timing: "upcoming",
      invitees: [{ unit_id: unit }],
      repeat: { every: "week", count: 4 },
    };
    expect((await g.api("u_hugo", "POST", "/api/meetings", body)).status).toBe(403);
    const r = await g.api("u_karim", "POST", "/api/meetings", body);
    expect(r.status).toBe(200);
    expect(r.body.unit_id).toBe(unit);
    // Le responsable prépare l'ordre du jour comme tout gestionnaire des réunions
    expect(
      (
        await g.api("u_karim", "PUT", `/api/meetings/${r.body.id}/content`, {
          agenda: [{ subject: "Tour de table" }],
          attendees: [],
        })
      ).status,
    ).toBe(200);
    const conv = await g.api("u_karim", "POST", `/api/meetings/${r.body.id}/convene`, { short_notice: true });
    expect(conv.status).toBe(200);
    const listed = (await g.api("u_hugo", "GET", `/api/meetings?unit_id=${unit}`)).body as Any[];
    expect(listed.filter((m) => m.title === "Point hebdomadaire")).toHaveLength(4);
    // Un agent convoqué la voit mais ne la modifie pas
    expect((await g.api("u_hugo", "PATCH", `/api/meetings/${r.body.id}`, { location: "Salle B" })).status).toBe(403);
    expect((await g.api("u_karim", "PATCH", `/api/meetings/${r.body.id}`, { location: "Salle B" })).status).toBe(200);
  });

  it("une réunion où toute l'entité est convoquée lui appartient", async () => {
    const r = await g.api("u_alice", "POST", "/api/meetings", {
      meeting_type: "Comité technique",
      meeting_date: day(3),
      timing: "upcoming",
      invitees: [{ unit_id: unit }],
    });
    expect(r.status).toBe(200);
    expect(r.body.unit_id).toBe(unit);
  });

  it("l'espace de l'entité et l'accueil mettent en avant les réunions où il faut être", async () => {
    const weekly = (
      await g.api("u_karim", "POST", "/api/meetings", {
        meeting_type: "Réunion de service",
        title: "Hebdomadaire de l'entité",
        meeting_date: day(2),
        unit_id: unit,
        timing: "upcoming",
        invitees: [{ unit_id: unit }],
        repeat: { every: "week", count: 3 },
      })
    ).body;
    // Une réunion d'ailleurs où Didier est convoqué personnellement
    await g.api("u_alice", "POST", "/api/meetings", {
      meeting_type: "Comité de pilotage",
      title: "Copil régional",
      meeting_date: day(4),
      timing: "upcoming",
      invitees: [{ user_id: "u_hugo" }],
    });
    const d = (await g.api("u_hugo", "GET", `/api/units/${unit}/dashboard`)).body;
    expect(d.meetings.unit.map((m: Any) => m.title)).toContain("Hebdomadaire de l'entité");
    // La série n'apparaît qu'une fois : sa prochaine séance
    expect(d.meetings.unit.filter((m: Any) => m.title === "Hebdomadaire de l'entité")).toHaveLength(1);
    expect(d.meetings.unit.find((m: Any) => m.title === "Hebdomadaire de l'entité").id).toBe(weekly.id);
    expect(d.meetings.mine.map((m: Any) => m.title)).toEqual(expect.arrayContaining(["Copil régional"]));
    // Une cellule rattachée, convoquée à la réunion de l'entité parente, la voit dans son propre espace
    const sub = (await g.api("u_alice", "POST", "/api/org/units", { name: "Cellule", parent_id: unit })).body.id;
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_chloe'", [sub, g.org]);
    await g.api("u_karim", "POST", "/api/meetings", {
      meeting_type: "Réunion de service",
      title: "Réunion élargie",
      meeting_date: day(5),
      unit_id: unit,
      timing: "upcoming",
      invitees: [{ unit_id: sub }],
    });
    const cell = (await g.api("u_karim", "GET", `/api/units/${sub}/dashboard`)).body;
    expect(cell.meetings.unit.map((m: Any) => m.title)).toContain("Réunion élargie");
    // L'accueil de chacun : ses prochaines réunions
    const mine = (await g.api("u_hugo", "GET", "/api/me/meetings")).body as Any[];
    expect(mine.map((m) => m.title)).toEqual(expect.arrayContaining(["Copil régional", "Hebdomadaire de l'entité"]));
    expect(mine.every((m) => m.meeting_date >= day())).toBe(true);
  });
});

describe("projets visibles dans l'espace de l'entité", () => {
  it("un projet où le responsable ou l'entité sont invités apparaît, selon l'accès de chacun", async () => {
    const p = (await g.api("u_alice", "POST", "/api/projects", { name: "Projet transversal", access: "private" })).body;
    await g.api("u_alice", "PUT", `/api/projects/${p.id}/members/u_karim`, { role: "viewer" });
    const mgr = (await g.api("u_karim", "GET", `/api/units/${unit}/dashboard`)).body;
    expect(mgr.projects.map((x: Any) => x.name)).toContain("Projet transversal");
    // Didier n'y est pas invité : il ne le voit pas
    const agent = (await g.api("u_hugo", "GET", `/api/units/${unit}/dashboard`)).body;
    expect(agent.projects.map((x: Any) => x.name)).not.toContain("Projet transversal");
    // Invité à son tour, il le voit
    await g.api("u_alice", "PUT", `/api/projects/${p.id}/members/u_hugo`, { role: "editor" });
    const after = (await g.api("u_hugo", "GET", `/api/units/${unit}/dashboard`)).body;
    expect(after.projects.map((x: Any) => x.name)).toContain("Projet transversal");
  });
});
