import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());
const doc = async (patch: Record<string, unknown> = {}, who = "u_alice") =>
  (
    await g.api(who, "POST", "/api/signature", {
      title: "Note au ministère",
      body: "Contenu",
      steps: [
        { actor_id: "u_karim", action: "visa" },
        { actor_id: "u_hugo", action: "signature" },
      ],
      ...patch,
    })
  ).body;

describe("signataire", () => {
  it("numérote et enregistre le circuit", async () => {
    const d = await doc();
    expect(d.reference).toMatch(/^PAR\/\d{4}\/0001$/);
    expect(d.steps.map((s: { action: string }) => s.action)).toEqual(["visa", "signature"]);
  });
  it("refuse un circuit sans signature finale ou contenant l'auteur", async () => {
    expect(
      (
        await g.api("u_alice", "POST", "/api/signature", {
          title: "x",
          steps: [{ actor_id: "u_karim", action: "visa" }],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await g.api("u_alice", "POST", "/api/signature", {
          title: "x",
          steps: [{ actor_id: "u_alice", action: "signature" }],
        })
      ).status,
    ).toBe(400);
  });
  it("suit l'ordre du circuit jusqu'à la signature et scelle le contenu", async () => {
    const d = await doc();
    const s = await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    expect(s.body.status).toBe("in_circuit");
    expect(s.body.content_hash).toHaveLength(64);
    expect((await g.api("u_hugo", "POST", `/api/signature/${d.id}/decide`, { decision: "approve" })).status).toBe(403);
    await g.api("u_karim", "POST", `/api/signature/${d.id}/decide`, { decision: "approve" });
    const done = await g.api("u_hugo", "POST", `/api/signature/${d.id}/decide`, { decision: "approve" });
    expect(done.body).toMatchObject({ status: "signed", intact: true });
  });
  it("un document dans le circuit ne se modifie plus", async () => {
    const d = await doc();
    await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    expect(
      (
        await g.api("u_alice", "PUT", `/api/signature/${d.id}`, {
          title: "Autre",
          steps: [{ actor_id: "u_karim", action: "signature" }],
        })
      ).status,
    ).toBe(409);
    expect((await g.api("u_alice", "DELETE", `/api/signature/${d.id}`)).status).toBe(409);
  });
  it("une altération directe du contenu est détectée", async () => {
    const d = await doc();
    await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    await g.ctx.db.query("UPDATE sign_documents SET body = 'falsifié' WHERE id = $1", [d.id]);
    expect((await g.api("u_alice", "GET", `/api/signature/${d.id}`)).body.intact).toBe(false);
  });
  it("un rejet exige un motif et revient à l'auteur", async () => {
    const d = await doc();
    await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    expect((await g.api("u_karim", "POST", `/api/signature/${d.id}/decide`, { decision: "reject" })).status).toBe(400);
    const r = await g.api("u_karim", "POST", `/api/signature/${d.id}/decide`, {
      decision: "reject",
      comment: "À revoir",
    });
    expect(r.body.status).toBe("rejected");
    const notes = (await g.api("u_alice", "GET", "/api/notifications")).body as { kind: string }[];
    expect(notes.some((n) => n.kind === "signature.rejected")).toBe(true);
  });
  it("un délégataire agit à la place du titulaire, avec une trace à son nom", async () => {
    const today = localDate();
    await g.api("u_karim", "POST", "/api/delegations", { to_user: "u_hugo", start_on: today, end_on: today });
    const d = await doc({ steps: [{ actor_id: "u_karim", action: "signature" }] });
    await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    expect((await g.api("u_hugo", "GET", "/api/signature")).body.map((x: { id: string }) => x.id)).toContain(d.id);
    const r = await g.api("u_hugo", "POST", `/api/signature/${d.id}/decide`, { decision: "approve" });
    expect(r.body.status).toBe("signed");
    expect(r.body.steps[0]).toMatchObject({ actor_id: "u_karim", acted_by: "u_hugo" });
  });
  it("une délégation expirée n'ouvre plus aucun droit", async () => {
    await g.api("u_karim", "POST", "/api/delegations", {
      to_user: "u_hugo",
      start_on: "2020-01-01",
      end_on: "2020-01-02",
    });
    const d = await doc({ steps: [{ actor_id: "u_karim", action: "signature" }] });
    await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    expect((await g.api("u_hugo", "POST", `/api/signature/${d.id}/decide`, { decision: "approve" })).status).toBe(404);
  });
  it("un tiers ne voit pas le document", async () => {
    const d = await doc({ steps: [{ actor_id: "u_karim", action: "signature" }] });
    expect((await g.api("u_hugo", "GET", `/api/signature/${d.id}`)).status).toBe(404);
  });
  it("seul l'auteur retire sa délégation", async () => {
    const today = localDate();
    const { id } = (
      await g.api("u_karim", "POST", "/api/delegations", { to_user: "u_hugo", start_on: today, end_on: today })
    ).body;
    expect((await g.api("u_hugo", "DELETE", `/api/delegations/${id}`)).status).toBe(403);
    expect((await g.api("u_karim", "DELETE", `/api/delegations/${id}`)).status).toBe(200);
  });
});

describe("courrier", () => {
  const reg = (patch: Record<string, unknown> = {}) =>
    g.api("u_alice", "POST", "/api/correspondence", {
      direction: "entrant",
      subject: "Demande",
      correspondent: "Ministère",
      received_on: "2026-03-02",
      ...patch,
    });
  it("attribue un numéro d'enregistrement par sens et par année", async () => {
    expect((await reg()).body.reference).toBe("ENT/2026/0001");
    expect((await reg()).body.reference).toBe("ENT/2026/0002");
    expect((await reg({ direction: "sortant" })).body.reference).toBe("SOR/2026/0001");
  });
  it("un membre consulte mais n'enregistre pas", async () => {
    await reg();
    // Lecture au titre de la direction : sans le droit de pilotage, un agent ne voit que ce qui le concerne (thème 5)
    await g.direction("u_karim");
    expect((await g.api("u_karim", "GET", "/api/correspondence")).body).toHaveLength(1);
    expect(
      (
        await g.api("u_karim", "POST", "/api/correspondence", {
          direction: "entrant",
          subject: "x",
          correspondent: "y",
          received_on: "2026-03-02",
        })
      ).status,
    ).toBe(403);
  });
  it("impute, prévient et clôture", async () => {
    const m = (await reg()).body;
    const a = await g.api("u_alice", "POST", `/api/correspondence/${m.id}/assign`, {
      assignee_id: "u_karim",
      due_on: "2026-04-01",
    });
    expect(a.body.status).toBe("impute");
    const c = await g.api("u_karim", "POST", `/api/correspondence/${m.id}/close`, { response_ref: "SOR/2026/0009" });
    expect(c.body).toMatchObject({ status: "traite", response_ref: "SOR/2026/0009" });
  });
  it("un courrier confidentiel reste invisible d'un membre non concerné", async () => {
    const m = (await reg({ confidential: true })).body;
    expect((await g.api("u_karim", "GET", "/api/correspondence")).body).toEqual([]);
    await g.api("u_alice", "POST", `/api/correspondence/${m.id}/assign`, { assignee_id: "u_karim" });
    expect((await g.api("u_karim", "GET", "/api/correspondence")).body).toHaveLength(1);
  });
  it("un retard remonte une seule fois au responsable de l'entité", async () => {
    const [unit] = await g.units(1);
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
    const m = (await reg()).body;
    await g.api("u_alice", "POST", `/api/correspondence/${m.id}/assign`, { unit_id: unit, due_on: "2026-03-10" });
    const r = new (await import("./registers.js")).Registers(g.ctx.svc);
    expect((await r.sweep("2026-03-11")).escalated).toBe(1);
    expect((await r.sweep("2026-03-12")).escalated).toBe(0);
    const notes = (await g.api("u_karim", "GET", "/api/notifications")).body as { kind: string }[];
    expect(notes.filter((n) => n.kind === "correspondence.late")).toHaveLength(1);
  });
});

describe("risques et indicateurs", () => {
  it("calcule le score et réserve la gestion", async () => {
    await g.api("u_alice", "POST", "/api/risks", { title: "Retard du financement", probability: 4, impact: 5 });
    expect((await g.api("u_alice", "GET", "/api/risks")).body[0].score).toBe(20);
    expect((await g.api("u_karim", "POST", "/api/risks", { title: "x", probability: 1, impact: 1 })).status).toBe(403);
    expect((await g.api("u_alice", "POST", "/api/risks", { title: "x", probability: 9, impact: 1 })).status).toBe(400);
  });
  it("enregistre un indicateur avec sa source", async () => {
    const i = await g.api("u_alice", "POST", "/api/indicators", {
      name: "Plans validés",
      target: 10,
      baseline: 2,
      source: "Direction",
    });
    const r = await g.api("u_alice", "PATCH", `/api/indicators/${i.body.id}`, { result: 6 });
    expect(r.body).toMatchObject({ target: 10, baseline: 2, result: 6 });
  });
});

describe("écarts de participation", () => {
  const setup = async () => {
    const [a, b] = await g.units(2);
    const d = (await g.api("u_alice", "POST", "/api/domains", { name: "Budget" })).body.id as string;
    await g.promote("u_karim");
    const sheet = async (unit: string, role: string, relations: unknown[] = []) => {
      const s = (
        await g.api("u_alice", "POST", "/api/attributions", {
          unit_id: unit,
          mission: "M",
          domains: [{ domain_id: d, role }],
          relations,
        })
      ).body;
      await g.api("u_karim", "POST", `/api/attributions/${s.id}/approve`);
    };
    return { a, b, d, sheet };
  };
  const detect = async () =>
    (await g.api("u_alice", "POST", "/api/gaps/detect", {})).body as {
      kind: string;
      unit_id: string | null;
      status: string;
      id: string;
      summary: string;
    }[];

  it("signale un responsable sans action", async () => {
    const { a, sheet } = await setup();
    await sheet(a, "responsable");
    const gaps = await detect();
    expect(gaps.some((x) => x.kind === "absence" && x.unit_id === a)).toBe(true);
  });
  it("ne signale plus l'absence dès qu'une action existe, et passe l'écart à résolu", async () => {
    const { a, d, sheet } = await setup();
    await sheet(a, "responsable");
    await detect();
    await g.api("u_alice", "POST", "/api/activities", { kind: "interne", title: "Budget", unit_id: a, domain_id: d });
    const gaps = await detect();
    expect(gaps.filter((x) => x.kind === "absence")[0].status).toBe("resolved");
  });
  it("signale deux responsables sur un même domaine", async () => {
    const { a, b, sheet } = await setup();
    await sheet(a, "responsable");
    await sheet(b, "responsable");
    expect((await detect()).some((x) => x.kind === "chevauchement")).toBe(true);
  });
  it("signale une activité hors attribution", async () => {
    const { a, b, d, sheet } = await setup();
    const other = (await g.api("u_alice", "POST", "/api/domains", { name: "Autre" })).body.id;
    await sheet(a, "responsable");
    void b;
    await g.api("u_alice", "POST", "/api/activities", {
      kind: "interne",
      title: "Hors champ",
      unit_id: a,
      domain_id: other,
    });
    void d;
    expect((await detect()).some((x) => x.kind === "hors_attribution" && x.summary.includes("Hors champ"))).toBe(true);
  });
  it("signale une consultation omise", async () => {
    const { a, b, d, sheet } = await setup();
    await sheet(a, "responsable", [{ target_unit_id: b, kind: "consultation", domain_id: d }]);
    const doc = (
      await g.api("u_alice", "POST", "/api/signature", {
        title: "Marché",
        unit_id: a,
        domain_id: d,
        steps: [{ actor_id: "u_karim", action: "signature" }],
      })
    ).body;
    await g.api("u_alice", "POST", `/api/signature/${doc.id}/start`);
    expect((await detect()).some((x) => x.kind === "consultation_omise")).toBe(true);
  });
  it("signale une réunion sans l'entité responsable", async () => {
    const { a, d, sheet } = await setup();
    await sheet(a, "responsable");
    const m = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Comité",
        meeting_date: localDate(),
        writer_id: "u_karim",
      })
    ).body;
    await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
      agenda: [{ subject: "Budget", notes: "Discuté", domain_id: d }],
      attendees: [],
    });
    expect((await detect()).some((x) => x.kind === "reunion_incomplete")).toBe(true);
  });
  it("une décision humaine reste acquise à la détection suivante et exige un motif", async () => {
    const { a, sheet } = await setup();
    await sheet(a, "responsable");
    const [gap] = await detect();
    expect((await g.api("u_alice", "PATCH", `/api/gaps/${gap.id}`, { status: "justified", note: " " })).status).toBe(
      400,
    );
    await g.api("u_alice", "PATCH", `/api/gaps/${gap.id}`, {
      status: "justified",
      note: "Domaine suspendu cette année",
    });
    const again = await detect();
    expect(again.find((x) => x.id === gap.id)?.status).toBe("justified");
  });
  it("le constat ne cite aucune personne et l'accès est réservé", async () => {
    const { a, sheet } = await setup();
    await sheet(a, "responsable");
    const gaps = await detect();
    expect(JSON.stringify(gaps)).not.toMatch(/Fiston|Bernadette/);
    expect((await g.api("u_hugo", "GET", "/api/gaps")).status).toBe(403);
    expect((await g.api("u_hugo", "POST", "/api/gaps/detect", {})).status).toBe(403);
  });
});
