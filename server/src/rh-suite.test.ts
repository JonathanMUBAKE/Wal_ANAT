import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { Hr } from "./hr.js";
import { localDate } from "./services.js";

/*
 * Thème 6 de l'analyse (docs/ANALYSE-MODULES.md), dossier d'agent : sortie d'un agent (RH-1), échéances de contrat et
 * de retraite (RH-3), demande de correction par l'agent (D-4), pièces, formations et évaluations (D-9).
 */
let g: GovCtx;
let unitA: string;
beforeEach(async () => {
  g = await boot();
  [unitA] = await g.units(1);
  await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id IN ('u_hugo', 'u_karim')");
  await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unitA]);
  await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id IN ('u_hugo', 'u_karim')", [
    unitA,
    g.org,
  ]);
  await g.promote("u_hugo", "Agent");
  await g.promote("u_karim", "Chef d'entité");
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const record = (over: Record<string, unknown> = {}) =>
  g.api("u_alice", "POST", "/api/hr/agents", {
    user_id: "u_hugo",
    civility: "M.",
    last_name: "Lukusa",
    first_names: "Didier",
    status: "fonctionnaire",
    function_title: "Chargé de communication",
    unit_id: unitA,
    hired_on: "2015-01-06",
    ...over,
  });
const notes = async (who: string) => (await g.api(who, "GET", "/api/notifications")).body as Any[];

describe("sortie d'un agent (RH-1)", () => {
  it("l'acte de sortie clôt l'affectation, suspend le compte et prévient le chef des tâches ouvertes", async () => {
    await record();
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "editor" });
    await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Rapport à finir", assignee_id: "u_hugo" });
    // Seul le service RH enregistre une sortie
    expect((await g.api("u_karim", "POST", "/api/hr/agents/u_hugo/exit", { exit_on: day(), reason: "mutation" })).status).toBe(403);
    expect((await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/exit", { exit_on: day(), reason: "inconnu" })).status).toBe(400);
    const r = await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/exit", {
      exit_on: day(),
      reason: "mutation",
      reference: "Arrêté n° 042/2026",
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ exit_on: day(), exit_reason: "mutation", exit_reference: "Arrêté n° 042/2026" });
    expect(r.body.assignments.filter((a: Any) => !a.ended_on)).toHaveLength(0);
    const u = await g.ctx.db.one<{ status: string }>("SELECT status FROM users WHERE id = 'u_hugo'");
    expect(u!.status).toBe("suspended");
    const n = (await notes("u_karim")).find((x) => x.kind === "hr.exit");
    expect(n.body).toMatch(/Rapport à finir/);
    expect((await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/exit", { exit_on: day(), reason: "mutation" })).status).toBe(409);
  });

  it("une sortie future s'applique à sa date ; un chef en poste ne sort pas avant d'être remplacé", async () => {
    await record();
    const r = await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/exit", { exit_on: day(10), reason: "retraite" });
    expect(r.status).toBe(200);
    const before = await g.ctx.db.one<{ status: string }>("SELECT status FROM users WHERE id = 'u_hugo'");
    expect(before!.status).toBe("active");
    await new Hr(g.ctx.svc, null as never).sweep(day(10));
    const after = await g.ctx.db.one<{ status: string }>("SELECT status FROM users WHERE id = 'u_hugo'");
    expect(after!.status).toBe("suspended");
    await record({ user_id: "u_karim", last_name: "Banza", first_names: "Fiston" });
    const chief = await g.api("u_alice", "POST", "/api/hr/agents/u_karim/exit", { exit_on: day(), reason: "demission" });
    expect(chief.status).toBe(400);
    expect(chief.body.error).toMatch(/dirige/);
  });
});

describe("échéances (RH-3)", () => {
  it("un contractuel a une date de fin ; le service RH et le chef sont prévenus à 90 puis 30 jours", async () => {
    const missing = await record({ status: "contractuel" });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toMatch(/date de fin/);
    await record({ status: "contractuel", contract_end_on: day(30) });
    const hr = new Hr(g.ctx.svc, null as never);
    await hr.sweep(day());
    await hr.sweep(day());
    const mine = (await notes("u_karim")).filter((n) => n.kind === "hr.deadline");
    expect(mine).toHaveLength(1);
    expect(mine[0].title).toMatch(/Fin de contrat/);
    const list = (await g.api("u_alice", "GET", "/api/hr/deadlines")).body as Any[];
    expect(list[0]).toMatchObject({ user_id: "u_hugo", kind: "fin_contrat", on: day(30) });
  });

  it("la retraite se calcule à partir de la date de naissance", async () => {
    const born = `${Number(day(60).slice(0, 4)) - 65}-${day(60).slice(5)}`;
    await record({ birth_date: born });
    const list = (await g.api("u_alice", "GET", "/api/hr/deadlines")).body as Any[];
    expect(list.find((x) => x.kind === "retraite")).toMatchObject({ user_id: "u_hugo" });
  });
});

describe("demande de correction (D-4)", () => {
  it("l'agent signale une erreur ; le service RH la traite et l'agent est prévenu", async () => {
    await record();
    expect((await g.api("u_hugo", "POST", "/api/hr/me/corrections", { message: "" })).status).toBe(400);
    const c = await g.api("u_hugo", "POST", "/api/hr/me/corrections", { message: "Mon grade est Attaché principal" });
    expect(c.status).toBe(200);
    expect((await notes("u_alice")).some((n) => n.kind === "hr.correction")).toBe(true);
    const list = (await g.api("u_alice", "GET", "/api/hr/corrections")).body as Any[];
    expect(list[0]).toMatchObject({ user_id: "u_hugo", status: "open" });
    expect((await g.api("u_hugo", "GET", "/api/hr/corrections")).status).toBe(403);
    const done = await g.api("u_alice", "POST", `/api/hr/corrections/${list[0].id}/close`, { response: "Grade corrigé" });
    expect(done.status).toBe(200);
    expect((await notes("u_hugo")).some((n) => n.kind === "hr.correction.closed")).toBe(true);
    const self = (await g.api("u_hugo", "GET", "/api/hr/me")).body;
    expect(self.corrections[0]).toMatchObject({ status: "done", response: "Grade corrigé" });
  });
});

describe("pièces, formations et évaluations (D-9)", () => {
  it("formations et évaluations : tenues par les RH ; l'évaluation reste aux RH et à l'agent", async () => {
    await record();
    const t = await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/trainings", {
      title: "Systèmes d'information géographique",
      provider: "Institut géographique",
      start_on: "2025-03-01",
      end_on: "2025-03-15",
    });
    expect(t.status).toBe(200);
    const e = await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/evaluations", {
      year: 2025,
      rating: "tres_bien",
      comment: "Excellent suivi des relevés",
    });
    expect(e.status).toBe(200);
    expect((await g.api("u_karim", "POST", "/api/hr/agents/u_hugo/trainings", { title: "X" })).status).toBe(403);
    const self = (await g.api("u_hugo", "GET", "/api/hr/me")).body;
    expect(self.trainings).toHaveLength(1);
    expect(self.evaluations[0]).toMatchObject({ year: 2025, rating: "tres_bien" });
    const chief = (await g.api("u_karim", "GET", "/api/hr/agents/u_hugo")).body;
    expect(chief.trainings).toHaveLength(1);
    expect(chief.evaluations).toEqual([]);
  });

  it("les pièces du dossier se déposent par les RH et se lisent par l'agent, pas par son chef", async () => {
    await record();
    const up = await g.upload(
      "u_alice",
      "/api/dossier-documents?owner=agent&owner_id=u_hugo&name=arrete.txt&nature=autre&other_label=Arrêté de nomination",
      Buffer.from("Arrêté fictif"),
    );
    expect(up.status).toBe(200);
    const self = await g.api("u_hugo", "GET", "/api/dossier-documents?owner=agent&owner_id=u_hugo");
    expect(self.status).toBe(200);
    expect(self.body.documents).toHaveLength(1);
    expect(self.body.can.add).toBe(false);
    expect((await g.api("u_karim", "GET", "/api/dossier-documents?owner=agent&owner_id=u_hugo")).status).toBe(404);
  });
});
