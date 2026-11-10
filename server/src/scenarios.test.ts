import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Scénarios de fonctionnement, module par module (docs/SCENARIOS.md).
 * Chaque cas rejoue une situation réelle de l'Agence et verrouille une incohérence corrigée.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const year = () => day().slice(0, 4);
type Note = { kind: string };
const notes = async (who: string) => (await g.api(who, "GET", "/api/notifications")).body as Note[];

describe("réunions : un compte rendu officiel ne se valide que s'il est complet", () => {
  const meeting = async (date = day(-2)) =>
    (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Comité de direction",
        meeting_date: date,
        writer_id: "u_karim",
      })
    ).body;
  const fill = (id: string, actions: Record<string, unknown>[]) =>
    g.api("u_alice", "PUT", `/api/meetings/${id}/content`, {
      agenda: [{ subject: "Budget", notes: "Discuté", actions }],
      attendees: [],
    });
  const complete = { text: "Préparer la note", responsible_id: "u_hugo", due_on: day(10) };

  it("refuse de valider le compte rendu d'une réunion qui n'a pas encore eu lieu", async () => {
    const m = await meeting(day(5));
    await fill(m.id, [complete]);
    const r = await g.api("u_alice", "POST", `/api/meetings/${m.id}/validate`);
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/pas encore eu lieu/);
  });
  it("refuse une recommandation sans responsable ou sans échéance", async () => {
    const m = await meeting();
    await fill(m.id, [{ text: "Sans échéance", responsible_id: "u_hugo" }]);
    const r = await g.api("u_alice", "POST", `/api/meetings/${m.id}/validate`);
    expect(r.status).toBe(400);
    expect(r.body.error).toContain("Sans échéance");
    await fill(m.id, [complete]);
    expect((await g.api("u_alice", "POST", `/api/meetings/${m.id}/validate`)).body.status).toBe("validated");
  });
  it("prévient le rédacteur quand un responsable soumet sa recommandation", async () => {
    const m = (await fill((await meeting()).id, [complete])).body;
    await g.api("u_alice", "POST", `/api/meetings/${m.id}/validate`);
    await g.api("u_hugo", "PATCH", `/api/meeting-actions/${m.agenda[0].actions[0].id}`, { status: "soumis" });
    expect((await notes("u_karim")).some((n) => n.kind === "meeting.action.submitted")).toBe(true);
  });
});

describe("plans de travail : la soumission atteint ceux qui approuvent", () => {
  it("prévient les approbateurs, jamais l'auteur de la soumission", async () => {
    const [unit] = await g.units(1);
    await g.promote("u_karim");
    const p = (await g.api("u_alice", "POST", "/api/plans", { unit_id: unit, year: 2031, title: "Plan" })).body;
    await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, {
      title: "Étude",
      responsible_id: "u_karim",
      target_value: 1,
      end_on: "2031-06-30",
    });
    await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`);
    expect((await notes("u_karim")).some((n) => n.kind === "plan.submitted")).toBe(true);
    expect((await notes("u_alice")).some((n) => n.kind === "plan.submitted")).toBe(false);
  });
});

describe("livrables et missions : réception, paiement, durée de la mission", () => {
  const mission = async (start: string, end: string) =>
    (
      await g.api("u_alice", "POST", "/api/contracts", {
        project_id: await g.project(),
        consultant_name: "Cabinet Géo",
        title: "Étude foncière",
        start_on: start,
        end_on: end,
        supervisor_id: "u_alice",
      })
    ).body;
  const validated = async () => {
    const c = await mission(day(-30), day(60));
    const d = (
      await g.api("u_alice", "POST", "/api/deliverables", {
        title: "Rapport",
        responsible_id: "u_karim",
        validator_id: "u_alice",
        contract_id: c.id,
      project_id: c.project_id,
      })
    ).body;
    await g.ctx.db.query("UPDATE deliverables SET status = 'en_revue' WHERE id = $1", [d.id]);
    return (await g.api("u_alice", "POST", `/api/deliverables/${d.id}/decide`, { decision: "valide" })).body;
  };

  it("numérote les procès-verbaux de réception par année", async () => {
    await g.ctx.db.query(
      "INSERT INTO deliverables (id, org_id, title, status, reception_ref) VALUES ('liv_ancien', $1, 'Ancien', 'valide', 'PV-2020-0007')",
      [g.org],
    );
    expect((await validated()).reception_ref).toBe(`PV-${year()}-0001`);
  });
  it("refuse un livrable rattaché à une mission terminée", async () => {
    const c = await mission("2025-01-01", "2025-06-30");
    const r = await g.api("u_alice", "POST", "/api/deliverables", {
      title: "Hors délai",
      responsible_id: "u_karim",
      validator_id: "u_alice",
      contract_id: c.id,
      project_id: c.project_id,
    });
    expect(r.status).toBe(400);
  });
  it("refuse une échéance postérieure à la fin de la mission", async () => {
    const c = await mission(day(-10), day(20));
    const r = await g.api("u_alice", "POST", "/api/deliverables", {
      title: "Trop tard",
      responsible_id: "u_karim",
      validator_id: "u_alice",
      contract_id: c.id,
      project_id: c.project_id,
      due_on: day(40),
    });
    expect(r.status).toBe(400);
  });
  it("le paiement se constate une seule fois et éteint le signal « à payer »", async () => {
    const d = await validated();
    expect(d.to_pay).toBe(true);
    expect((await g.api("u_karim", "POST", `/api/deliverables/${d.id}/paid`)).status).toBe(403);
    const paid = await g.api("u_alice", "POST", `/api/deliverables/${d.id}/paid`);
    expect(paid.body).toMatchObject({ to_pay: false });
    expect(paid.body.paid_at).toBeTruthy();
    expect((await g.api("u_alice", "POST", `/api/deliverables/${d.id}/paid`)).status).toBe(409);
  });
});

describe("parapheur : personne ne reste bloqué dans un circuit", () => {
  it("refuse un intervenant qui n'a pas accès au parapheur", async () => {
    await g.promote("u_hugo", "Lecture seule");
    const r = await g.api("u_alice", "POST", "/api/signature", {
      title: "Note",
      steps: [{ actor_id: "u_hugo", action: "signature" }],
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/parapheur/);
  });
  it("refuse une délégation de signature au profit d'un invité", async () => {
    await g.ctx.db.query("UPDATE org_members SET role = 'guest' WHERE user_id = 'u_hugo' AND org_id = $1", [g.org]);
    const r = await g.api("u_karim", "POST", "/api/delegations", { to_user: "u_hugo", start_on: day(), end_on: day() });
    expect(r.status).toBe(400);
  });
});

describe("courrier : un registre officiel ne se contredit pas", () => {
  const reg = (patch: Record<string, unknown> = {}) =>
    g.api("u_alice", "POST", "/api/correspondence", {
      direction: "entrant",
      subject: "Demande",
      correspondent: "Ministère",
      received_on: "2026-03-02",
      ...patch,
    });
  it("un courrier traité ne se clôture pas une seconde fois", async () => {
    const m = (await reg()).body;
    await g.api("u_alice", "POST", `/api/correspondence/${m.id}/close`, { response_ref: "SOR/2026/0001" });
    const again = await g.api("u_alice", "POST", `/api/correspondence/${m.id}/close`, { response_ref: "autre" });
    expect(again.status).toBe(409);
  });
  it("le délai de réponse ne précède pas la réception", async () => {
    expect((await reg({ due_on: "2026-03-01" })).status).toBe(400);
    const m = (await reg()).body;
    expect((await g.api("u_alice", "POST", `/api/correspondence/${m.id}/assign`, { due_on: "2026-02-01" })).status).toBe(
      400,
    );
  });
  it("un retard sans responsable d'entité remonte à la personne imputée", async () => {
    const [unit] = await g.units(1);
    const m = (await reg()).body;
    await g.api("u_alice", "POST", `/api/correspondence/${m.id}/assign`, {
      unit_id: unit,
      assignee_id: "u_karim",
      due_on: "2026-03-10",
    });
    const r = new (await import("./registers.js")).Registers(g.ctx.svc);
    await r.sweep("2026-03-11");
    expect((await notes("u_karim")).some((n) => n.kind === "correspondence.late")).toBe(true);
  });
});

describe("activités : dates et responsabilités cohérentes", () => {
  const activity = async (patch: Record<string, unknown> = {}) =>
    (
      await g.api("u_alice", "POST", "/api/activities", {
        kind: "commission",
        title: "Commission foncière",
        lead_id: "u_karim",
        start_on: "2026-12-01",
        ...patch,
      })
    ).body;
  it("une nouvelle fin ne précède pas le début déjà enregistré", async () => {
    const a = await activity();
    expect((await g.api("u_alice", "PATCH", `/api/activities/${a.id}`, { end_on: "2026-11-01" })).status).toBe(400);
  });
  it("le responsable rend compte, mais ne transfère pas l'activité ni ne lève sa confidentialité", async () => {
    const a = await activity({ confidential: true });
    expect((await g.api("u_karim", "PATCH", `/api/activities/${a.id}`, { outcome: "Avis favorable" })).status).toBe(200);
    expect((await g.api("u_karim", "PATCH", `/api/activities/${a.id}`, { lead_id: "u_hugo" })).status).toBe(403);
    expect((await g.api("u_karim", "PATCH", `/api/activities/${a.id}`, { confidential: false })).status).toBe(403);
  });
});

describe("tableau de bord : une lecture fidèle", () => {
  const pilotage = async (who = "u_alice") => (await g.api(who, "GET", "/api/pilotage")).body;

  it("une activité confidentielle reste hors du tableau d'un lecteur qui n'en a pas la charge", async () => {
    await g.ctx.db.query(
      `UPDATE org_members SET permission_overrides = '{"pilotage.view": true}'::jsonb WHERE user_id = 'u_karim' AND org_id = $1`,
      [g.org],
    );
    await g.api("u_alice", "POST", "/api/activities", {
      kind: "rendez_vous",
      title: "Audience réservée",
      start_on: day(1),
      confidential: true,
    });
    const k = await pilotage("u_karim");
    expect(JSON.stringify(k.items)).not.toContain("Audience réservée");
    expect(JSON.stringify(k.agenda)).not.toContain("Audience réservée");
    expect(JSON.stringify((await pilotage()).items)).toContain("Audience réservée");
  });
  it("une activité dont une suite est en retard n'est pas affichée « dans les temps »", async () => {
    const a = (await g.api("u_alice", "POST", "/api/activities", { kind: "interne", title: "Inventaire" })).body;
    await g.api("u_alice", "POST", `/api/activities/${a.id}/followups`, { text: "Relancer", due_on: day(-3) });
    const item = (await pilotage()).items.find((i: { id: string }) => i.id === a.id);
    expect(item.health).toBe("at_risk");
  });
  it("les retards comptent aussi les livrables, les activités de plan et le courrier", async () => {
    const before = (await pilotage()).counters;
    await g.api("u_alice", "POST", "/api/deliverables", {
      project_id: await g.project(),
      title: "En retard",
      responsible_id: "u_karim",
      validator_id: "u_alice",
      due_on: day(-5),
    });
    const after = (await pilotage()).counters;
    expect(after.retards).toBe(before.retards + 1);
    expect(after.retards_detail.livrables).toBe(before.retards_detail.livrables + 1);
  });
});
