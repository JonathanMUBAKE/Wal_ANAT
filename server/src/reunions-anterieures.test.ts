import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Réunions antérieures et postérieures. Une réunion à venir se programme à partir d'aujourd'hui, puis se convoque.
 * Une réunion déjà tenue s'enregistre pour la traçabilité : sa date ne dépasse pas aujourd'hui, elle est « tenue »
 * d'emblée, ses participants sont notés (pas de convocation, pas de série) et son compte rendu suit le circuit.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const create = (body: Record<string, unknown>) =>
  g.api("u_alice", "POST", "/api/meetings", { meeting_type: "Comité technique", ...body });

describe("réunions antérieures et postérieures", () => {
  it("une réunion à venir part d'aujourd'hui ; une réunion tenue ne dépasse pas aujourd'hui", async () => {
    const past = await create({ timing: "upcoming", meeting_date: day(-1) });
    expect(past.status).toBe(400);
    expect(past.body.error).toMatch(/aujourd'hui/);
    expect((await create({ timing: "upcoming", meeting_date: day() })).body.status).toBe("planned");
    const future = await create({ timing: "past", meeting_date: day(1) });
    expect(future.status).toBe(400);
    expect(future.body.error).toMatch(/aujourd'hui/);
  });

  it("une réunion déjà tenue est enregistrée « tenue », avec ses participants, sans convocation ni série", async () => {
    expect((await create({ timing: "past", meeting_date: day(-30), repeat: { every: "week", count: 3 } })).status).toBe(
      400,
    );
    const r = await create({
      timing: "past",
      meeting_date: day(-30),
      start_time: "09:00",
      invitees: [{ user_id: "u_karim" }, { name: "M. Extérieur" }],
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "held", convened_at: null });
    expect(
      r.body.attendees.map((a: { name: string; invited: boolean; presence: string }) => [
        a.name,
        a.invited,
        a.presence,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["Karim Benali", false, "present"],
        ["M. Extérieur", false, "present"],
      ]),
    );
    expect((await g.api("u_alice", "POST", `/api/meetings/${r.body.id}/convene`, { short_notice: true })).status).toBe(
      400,
    );
    // Son compte rendu se rédige et se soumet comme les autres
    await g.api("u_alice", "PUT", `/api/meetings/${r.body.id}/content`, {
      agenda: [{ subject: "Point unique", notes: "Échanges tenus." }],
      attendees: r.body.attendees.map((a: { user_id: string | null; name: string }) => ({
        user_id: a.user_id,
        name: a.name,
      })),
    });
    expect((await g.api("u_alice", "POST", `/api/meetings/${r.body.id}/submit`)).status).toBe(200);
  });
});
