import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Agreements } from "./agreements.js";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Remarques de gravité basse de l'analyse module par module (docs/ANALYSE-MODULES.md), lot 12.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("PT-7 : les retards suivent la date locale", () => {
  it("aucune requête du serveur ne compare à CURRENT_DATE (UTC), qui retarde d'un jour autour de minuit", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    const offenders = files.filter((f) =>
      readFileSync(`${dir}/${f}`, "utf8")
        .split("\n")
        .some((l) => /CURRENT_DATE/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)),
    );
    expect(offenders).toEqual([]);
  });
});

describe("PA-5 : une relation sans échange depuis six mois est signalée", () => {
  it("une relation active sans note depuis six mois porte l'alerte ; une note récente l'éteint", async () => {
    const p = (
      await g.api("u_alice", "POST", "/api/partners", { name: "Bailleur silencieux", type_code: "autre", focal_id: "u_alice" })
    ).body;
    await g.api("u_alice", "POST", `/api/partners/${p.id}/state`, { state: "actif" });
    await g.ctx.db.query("UPDATE partners SET created_at = now() - interval '8 months' WHERE id = $1", [p.id]);
    const get = async () => (await g.api("u_alice", "GET", `/api/partners/${p.id}`)).body;
    expect((await get()).no_contact).toBe(true);
    await g.api("u_alice", "POST", `/api/partners/${p.id}/notes`, { body: "Appel de suivi" });
    expect((await get()).no_contact).toBe(false);
  });
});

describe("CV-6 : le rappel d'échéance signale l'avenant non signé", () => {
  it("un avenant en préparation figure dans l'alerte d'échéance de l'accord", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire fictif", type_code: "autre" })).body;
    const a = (
      await g.api("u_alice", "POST", "/api/agreements", {
        type_code: "protocole_accord",
        title: "Accord à prolonger",
        content: "Les parties coopèrent.",
        partner_ids: [p.id],
        end_on: day(20),
        focal_id: "u_karim",
      })
    ).body;
    await g.api("u_alice", "POST", `/api/agreements/${a.id}/activate`, { signed_on: day() });
    await g.api("u_alice", "POST", `/api/agreements/${a.id}/amend`, { title: "Prolongation", new_end_on: day(400) });
    await new Agreements(g.ctx.svc).sweep(day());
    const n = await g.ctx.db.one<{ body: string }>(
      "SELECT body FROM notifications WHERE user_id = 'u_karim' AND kind = 'agreement.ending' ORDER BY created_at DESC LIMIT 1",
    );
    expect(n!.body).toMatch(/avenant.*pas encore signé/);
  });
});

describe("I-5 : on ne voit que les propositions de l'IA que l'on peut décider", () => {
  it("un éditeur sans le droit de valider l'IA ne voit pas la proposition", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "editor" });
    const t = (await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Note" })).body;
    await g.ctx.db.query(
      `INSERT INTO ai_runs (id, org_id, agent_id, kind, task_id, project_id, requested_by, status, provider)
       VALUES ('run_i5', $1, 'ai_cadence', 'task', $2, $3, 'u_alice', 'waiting_approval', 'mock')`,
      [g.org, t.id, p],
    );
    await g.ctx.db.query(
      `INSERT INTO ai_approvals (id, run_id, agent_id, task_id, project_id, tool, input, summary, status, target_ids)
       VALUES ('apr_i5', 'run_i5', 'ai_cadence', $1, $2, 'update_task', '{}', 'Changer la priorité', 'pending', '[]')`,
      [t.id, p],
    );
    const seen = async (who: string) =>
      ((await g.api(who, "GET", "/api/ai/approvals")).body as Any[]).some((a) => a.id === "apr_i5");
    expect(await seen("u_alice")).toBe(true);
    await g.api("u_alice", "PUT", "/api/org/members/u_hugo/permissions", { overrides: { "ai.approve": false } });
    expect(await seen("u_hugo")).toBe(false);
    await g.api("u_alice", "PUT", "/api/org/members/u_hugo/permissions", { overrides: { "ai.approve": true } });
    expect(await seen("u_hugo")).toBe(true);
  });
});

describe("E-6 : une réunion proche non convoquée est rappelée à sa présidence", () => {
  it("le président est prévenu, même sans rédacteur désigné", async () => {
    const m = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Réunion hebdomadaire",
        meeting_date: day(5),
        chair_id: "u_alice",
      })
    ).body;
    expect(m.id).toBeTruthy();
    await g.ctx.db.query("UPDATE meetings SET writer_id = NULL WHERE id = $1", [m.id]);
    const { Meetings } = await import("./meetings.js");
    await new Meetings(g.ctx.svc).sweep(day());
    const n = await g.ctx.db.one(
      "SELECT 1 FROM notifications WHERE user_id = 'u_alice' AND kind = 'meeting.reminder' AND link = $1",
      [`/reunions/${m.id}`],
    );
    expect(n).toBeTruthy();
  });
});

describe("AD-6 : les sessions ne s'accumulent pas", () => {
  it("au-delà de dix connexions, les sessions les plus anciennes sont fermées", async () => {
    for (let i = 0; i < 13; i++) await g.login("u_hugo");
    const open = await g.ctx.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM sessions WHERE user_id = 'u_hugo' AND revoked_at IS NULL",
    );
    expect(open!.n).toBeLessThanOrEqual(10);
    // La dernière connexion reste valable
    expect((await g.api("u_hugo", "GET", "/api/me")).status).toBe(200);
  });
});

describe("F-5 : les contrats se lisent selon son périmètre", () => {
  it("un chef qui gère les prestataires ne voit pas les contrats d'une autre direction ; le pilotage les voit tous", async () => {
    const [mine, other] = await g.units(2);
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_karim'");
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [mine]);
    await g.promote("u_karim", "Chef d'entité");
    const proj = (await g.api("u_alice", "POST", "/api/projects", { name: "Projet d'une autre direction" })).body;
    await g.ctx.db.query("UPDATE projects SET unit_id = $1 WHERE id = $2", [other, proj.id]);
    const c = await g.api("u_alice", "POST", "/api/contracts", {
      project_id: proj.id,
      consultant_name: "Cabinet fictif",
      title: "Étude",
      start_on: "2026-01-01",
      end_on: "2026-12-31",
      amount: 5000,
      supervisor_id: "u_alice",
    });
    expect(c.status).toBe(200);
    const ids = async (who: string) => ((await g.api(who, "GET", "/api/contracts")).body as Any[]).map((x) => x.id);
    expect(await ids("u_karim")).not.toContain(c.body.id);
    await g.direction("u_hugo");
    expect(await ids("u_hugo")).toContain(c.body.id);
  });
});
