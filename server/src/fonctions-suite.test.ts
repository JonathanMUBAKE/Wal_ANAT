import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { Meetings } from "./meetings.js";
import { localDate } from "./services.js";

/*
 * Thème 6 de l'analyse (docs/ANALYSE-MODULES.md), suite : validation d'un compte rendu par le délégataire de la
 * présidence (R-2), séance passée non tenue (R-6), rappel de convocation (R-7), campagne des plans (PT-5) et volet
 * financier des accords (CV-2).
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const notes = async (who: string) => (await g.api(who, "GET", "/api/notifications")).body as Any[];
const meeting = async (body: Record<string, unknown>) =>
  (await g.api("u_alice", "POST", "/api/meetings", { meeting_type: "Comité de direction", writer_id: "u_karim", ...body }))
    .body as Any;

describe("réunions : intérim, séance non tenue, rappel (R-2, R-6, R-7)", () => {
  it("R-2 : le délégataire de la présidence valide le compte rendu, par délégation", async () => {
    const m = await meeting({ meeting_date: day(-2), chair_id: "u_alice" });
    await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, { agenda: [{ subject: "Budget" }], attendees: [] });
    await g.ctx.db.query("UPDATE meetings SET status = 'submitted' WHERE id = $1", [m.id]);
    // Didier n'a pas de délégation : refusé
    await g.direction("u_hugo");
    expect((await g.api("u_hugo", "POST", `/api/meetings/${m.id}/validate`)).status).toBe(403);
    await g.api("u_alice", "POST", "/api/delegations", { to_user: "u_hugo", start_on: day(), end_on: day(5) });
    const ok = await g.api("u_hugo", "POST", `/api/meetings/${m.id}/validate`);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: "validated", validated_by: "u_hugo", validated_on_behalf: "u_alice" });
    const log = await g.ctx.db.one<{ data: Any }>("SELECT data FROM activity WHERE kind = 'meeting.validated' ORDER BY created_at DESC LIMIT 1");
    expect(log!.data).toMatchObject({ on_behalf: "u_alice" });
  });

  it("R-6 : une séance passée sans compte rendu se déclare non tenue, avec un motif", async () => {
    const m = await meeting({ meeting_date: day(-5) });
    const fresh = (await g.api("u_alice", "GET", `/api/meetings/${m.id}`)).body;
    expect(fresh.can.declare_not_held).toBe(true);
    expect((await g.api("u_alice", "POST", `/api/meetings/${m.id}/not-held`, { reason: "" })).status).toBe(400);
    const r = await g.api("u_alice", "POST", `/api/meetings/${m.id}/not-held`, { reason: "Quorum non atteint" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("cancelled");
    const future = await meeting({ meeting_date: day(5) });
    expect((await g.api("u_alice", "POST", `/api/meetings/${future.id}/not-held`, { reason: "x" })).status).toBe(400);
  });

  it("R-7 : le rédacteur est prévenu d'une séance proche non convoquée, et d'une séance passée restée sans suite", async () => {
    await meeting({ meeting_date: day(5) });
    await meeting({ meeting_date: day(-4) });
    const m = new Meetings(g.ctx.svc);
    await m.sweep(day());
    await m.sweep(day());
    const mine = (await notes("u_karim")).filter((n) => n.kind === "meeting.reminder");
    expect(mine).toHaveLength(2);
    expect(mine.map((n) => n.title).join(" ")).toMatch(/à convoquer/);
    expect(mine.map((n) => n.title).join(" ")).toMatch(/sans compte rendu/);
  });
});

describe("campagne des plans de travail (PT-5)", () => {
  it("la liste des entités sans plan pour l'année, et un rappel à leurs chefs", async () => {
    const [a, b] = await g.units(2);
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_karim'");
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [b]);
    await g.api("u_alice", "POST", "/api/plans", { unit_id: a, year: 2032, title: "Plan A" });
    const c = await g.api("u_alice", "GET", "/api/plans/campaign?year=2032");
    expect(c.status).toBe(200);
    const ids = c.body.missing.map((x: Any) => x.unit_id);
    expect(ids).toContain(b);
    expect(ids).not.toContain(a);
    expect((await g.api("u_karim", "POST", "/api/plans/campaign/remind", { year: 2032 })).status).toBe(403);
    const r = await g.api("u_alice", "POST", "/api/plans/campaign/remind", { year: 2032 });
    expect(r.status).toBe(200);
    expect((await notes("u_karim")).some((n) => n.kind === "plan.campaign")).toBe(true);
  });
});

describe("volet financier des accords (CV-2)", () => {
  it("montant, devise et contribution de chaque partie", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "Bailleur", type_code: "organisation_internationale", categories: ["ptf"] })).body;
    const a = (await g.api("u_alice", "POST", "/api/agreements", { type_code: "protocole_accord", title: "Appui", content: "x", partner_ids: [p.id] })).body;
    expect((await g.api("u_alice", "PUT", `/api/agreements/${a.id}/finance`, { amount: 1000, currency: "XX" })).status).toBe(400);
    const r = await g.api("u_alice", "PUT", `/api/agreements/${a.id}/finance`, {
      amount: 2500000,
      currency: "usd",
      agency_contribution: 500000,
      contributions: [{ partner_id: p.id, amount: 2000000 }],
    });
    expect(r.status).toBe(200);
    expect(r.body.finance).toMatchObject({
      amount: 2500000,
      currency: "USD",
      agency_contribution: 500000,
      contributions: [{ partner_id: p.id, amount: 2000000 }],
    });
    const over = await g.api("u_alice", "PUT", `/api/agreements/${a.id}/finance`, {
      amount: 100,
      currency: "USD",
      agency_contribution: 80,
      contributions: [{ partner_id: p.id, amount: 50 }],
    });
    expect(over.status).toBe(400);
    expect(over.body.error).toMatch(/dépassent le montant/);
    await g.direction("u_hugo");
    expect((await g.api("u_hugo", "PUT", `/api/agreements/${a.id}/finance`, { amount: 1, currency: "USD" })).status).toBe(403);
  });
});
