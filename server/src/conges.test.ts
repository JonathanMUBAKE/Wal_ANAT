import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { Hr } from "./hr.js";
import { localDate, workingDays } from "./services.js";

/*
 * RH, deuxième étape — congés et absences, fins de contrat. L'agent demande ; le chef de son entité (ou de l'entité
 * au-dessus) valide ou refuse, avec un motif s'il refuse ; préparer n'est pas valider : personne ne valide sa
 * propre demande, ni celle qu'il a saisie. Le service RH voit tout et enregistre les absences constatées (maladie,
 * mission) au nom d'un agent. Chacun est prévenu à chaque étape. Le service RH et le chef sont alertés des contrats
 * qui arrivent à échéance.
 */
let g: GovCtx;
let unit: string;
beforeEach(async () => {
  g = await boot();
  for (const id of ["u_chloe", "u_ines"]) await g.login(id);
  [unit] = await g.units(1);
  // Karim dirige l'entité ; Hugo et Chloé y travaillent ; Inès est ailleurs
  await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
  await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id IN ('u_hugo', 'u_chloe')", [
    unit,
    g.org,
  ]);
  await g.ctx.db.query("UPDATE org_members SET unit_id = NULL WHERE org_id = $1 AND user_id = 'u_ines'", [g.org]);
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const notes = (user: string) =>
  g.ctx.db.query<Any>("SELECT kind, title, category, link FROM notifications WHERE user_id = $1", [user]);
const ask = (who: string, body: Any) => g.api(who, "POST", "/api/leaves", body);

describe("jours ouvrés", () => {
  it("compte du lundi au vendredi", () => {
    expect(workingDays("2026-11-09", "2026-11-13")).toBe(5);
    expect(workingDays("2026-11-13", "2026-11-16")).toBe(2);
    expect(workingDays("2026-11-14", "2026-11-15")).toBe(0);
  });
});

describe("demande de congé", () => {
  it("l'agent demande, son chef valide ; l'agent et l'intérimaire sont prévenus", async () => {
    const r = await ask("u_hugo", {
      kind: "conge_annuel",
      start_on: day(10),
      end_on: day(14),
      reason: "Congé familial",
      interim_id: "u_ines",
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "demande", user_id: "u_hugo", approver_id: "u_karim" });
    expect(r.body.days).toBe(workingDays(day(10), day(14)));
    expect((await notes("u_karim")).some((n: Any) => n.kind === "leave.requested" && n.category === "rh")).toBe(true);

    // Le chef voit la demande à valider ; un collègue ne la voit pas
    const team = (await g.api("u_karim", "GET", "/api/leaves?scope=team")).body as Any[];
    expect(team.map((l) => l.id)).toContain(r.body.id);
    expect((await g.api("u_chloe", "GET", "/api/leaves?scope=team")).body).toEqual([]);
    expect((await g.api("u_chloe", "GET", `/api/leaves/${r.body.id}`)).status).toBe(403);

    // L'agent ne valide pas sa propre demande ; un collègue non plus
    expect((await g.api("u_hugo", "POST", `/api/leaves/${r.body.id}/decide`, { approve: true })).status).toBe(403);
    expect((await g.api("u_chloe", "POST", `/api/leaves/${r.body.id}/decide`, { approve: true })).status).toBe(403);

    const ok = await g.api("u_karim", "POST", `/api/leaves/${r.body.id}/decide`, { approve: true, note: "Bon congé" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: "approuve", decided_by: "u_karim" });
    expect((await notes("u_hugo")).some((n: Any) => n.kind === "leave.approved")).toBe(true);
    expect((await notes("u_ines")).some((n: Any) => n.kind === "leave.interim")).toBe(true);
    // Une décision prise ne se reprend pas
    expect((await g.api("u_karim", "POST", `/api/leaves/${r.body.id}/decide`, { approve: false })).status).toBe(400);
  });

  it("refuser exige un motif ; dates incohérentes et chevauchements sont refusés", async () => {
    const r = (await ask("u_hugo", { kind: "permission", start_on: day(3), end_on: day(3) })).body;
    const bare = await g.api("u_karim", "POST", `/api/leaves/${r.id}/decide`, { approve: false });
    expect(bare.status).toBe(400);
    expect(bare.body.error).toMatch(/motif/);
    const no = await g.api("u_karim", "POST", `/api/leaves/${r.id}/decide`, {
      approve: false,
      note: "Clôture budgétaire ce jour-là",
    });
    expect(no.body.status).toBe("refuse");
    expect((await notes("u_hugo")).some((n: Any) => n.kind === "leave.refused")).toBe(true);

    expect((await ask("u_hugo", { kind: "conge_annuel", start_on: day(9), end_on: day(5) })).status).toBe(400);
    await ask("u_hugo", { kind: "conge_annuel", start_on: day(20), end_on: day(25) });
    const overlap = await ask("u_hugo", { kind: "formation", start_on: day(24), end_on: day(28) });
    expect(overlap.status).toBe(400);
    expect(overlap.body.error).toMatch(/chevauche/);
    // Une demande refusée ne bloque pas les dates
    expect((await ask("u_hugo", { kind: "permission", start_on: day(3), end_on: day(3) })).status).toBe(200);
  });

  it("l'agent annule sa demande ; le chef est prévenu si elle était validée", async () => {
    const r = (await ask("u_hugo", { kind: "conge_annuel", start_on: day(30), end_on: day(31) })).body;
    await g.api("u_karim", "POST", `/api/leaves/${r.id}/decide`, { approve: true });
    expect((await g.api("u_chloe", "POST", `/api/leaves/${r.id}/cancel`, {})).status).toBe(403);
    const c = await g.api("u_hugo", "POST", `/api/leaves/${r.id}/cancel`, {});
    expect(c.body.status).toBe("annule");
    expect((await notes("u_karim")).some((n: Any) => n.kind === "leave.cancelled")).toBe(true);
  });

  it("sans chef au-dessus, la demande va au service RH", async () => {
    const r = (await ask("u_ines", { kind: "conge_annuel", start_on: day(12), end_on: day(13) })).body;
    expect(r.approver_id).toBeNull();
    expect((await notes("u_alice")).some((n: Any) => n.kind === "leave.requested")).toBe(true);
    const ok = await g.api("u_alice", "POST", `/api/leaves/${r.id}/decide`, { approve: true });
    expect(ok.body.status).toBe("approuve");
  });
});

describe("le service RH", () => {
  it("voit toutes les demandes et enregistre une absence au nom d'un agent, sans pouvoir la valider lui-même", async () => {
    await ask("u_hugo", { kind: "conge_annuel", start_on: day(40), end_on: day(41) });
    const all = (await g.api("u_alice", "GET", "/api/leaves?scope=all")).body as Any[];
    expect(all.some((l) => l.user_id === "u_hugo")).toBe(true);
    // Un agent sans droit RH ne voit pas tout
    expect((await g.api("u_chloe", "GET", "/api/leaves?scope=all")).status).toBe(403);
    // Un agent ne saisit rien au nom d'un autre
    expect(
      (await ask("u_chloe", { kind: "maladie", start_on: day(0), end_on: day(1), user_id: "u_hugo" })).status,
    ).toBe(403);

    const sick = await ask("u_alice", {
      kind: "maladie",
      start_on: day(-1),
      end_on: day(2),
      user_id: "u_chloe",
      reason: "Certificat médical reçu",
    });
    expect(sick.status).toBe(200);
    expect(sick.body).toMatchObject({ status: "approuve", created_by: "u_alice", user_id: "u_chloe" });
    expect((await notes("u_chloe")).some((n: Any) => n.kind === "leave.recorded")).toBe(true);

    // Absents aujourd'hui : le chef de l'entité le voit
    const sum = (await g.api("u_karim", "GET", "/api/leaves/summary")).body;
    expect(sum.absent_today.map((a: Any) => a.user_id)).toContain("u_chloe");
    expect(sum.to_decide).toBe(1);
    const mine = (await g.api("u_hugo", "GET", "/api/leaves/summary")).body;
    expect(mine.mine).toMatchObject({ pending: 1 });
  });

  it("le chef qui saisit une demande pour son agent ne la valide pas lui-même", async () => {
    await g.ctx.db.query("UPDATE org_members SET unit_id = NULL WHERE org_id = $1 AND user_id = 'u_alice'", [g.org]);
    const id = "lv_test_saisie";
    await g.ctx.db.query(
      `INSERT INTO agent_leaves (id, org_id, user_id, kind, start_on, end_on, days, created_by)
       VALUES ($1, $2, 'u_hugo', 'permission', $3, $3, 1, 'u_karim')`,
      [id, g.org, day(15)],
    );
    expect((await g.api("u_karim", "POST", `/api/leaves/${id}/decide`, { approve: true })).status).toBe(403);
    expect((await g.api("u_alice", "POST", `/api/leaves/${id}/decide`, { approve: true })).status).toBe(200);
  });
});

// Une seule alerte de fin de contrat dans l'outil : celle du dossier d'agent, à 90 puis 30 jours (thème 6, RH-3)
describe("fins de contrat", () => {
  it("le service RH et le chef sont alertés une fois par seuil", async () => {
    const created = (
      await g.api("u_alice", "POST", "/api/hr/agents", {
        user_id: "u_hugo",
        last_name: "Martin",
        status: "contractuel",
        contract_end_on: day(45),
      })
    ).body;
    expect(created.agent.user_id).toBe("u_hugo");
    const hr = new Hr(g.ctx.svc, null as never);
    await hr.sweep();
    await hr.sweep();
    const alerts = (await notes("u_alice")).filter((n: Any) => n.kind === "hr.deadline");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ category: "rh" });
    expect((await notes("u_karim")).filter((n: Any) => n.kind === "hr.deadline")).toHaveLength(1);
    expect((await notes("u_hugo")).filter((n: Any) => n.kind === "hr.deadline")).toHaveLength(0);
  });
});
