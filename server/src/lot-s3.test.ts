import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Lot S3 — ouvrir ce qui est enfermé (docs/INTERVENTIONS.md, S3.1 à S3.4).
 * Un état sans issue n'est pas une gêne : c'est un dossier qu'il faut aller déverrouiller dans la base.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const waitFor = async <T,>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 6000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (ok(v) || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
};

describe("S3.4 : une proposition de l'IA sans décideur ne verrouille pas la tâche", () => {
  /** Un projet créé par Karim, seul membre humain ; le droit de valider l'IA lui est retiré, et Bernadette n'en est pas membre. */
  async function sansDecideur() {
    await g.api("u_alice", "PUT", "/api/org/members/u_karim/permissions", {
      overrides: { "ai.delegate": true, "ai.approve": false },
    });
    const p = (await g.api("u_karim", "POST", "/api/projects", { name: "Sans décideur", access: "private" })).body.id as string;
    await g.api("u_karim", "PUT", `/api/projects/${p}/members/ai_atlas`, { role: "editor" });
    await g.ctx.db.query("UPDATE projects SET owner_id = 'u_karim' WHERE id = $1", [p]);
    return p;
  }

  it("aucun décideur possible : l'attente n'est pas ouverte, le chef du projet est prévenu, la tâche reste utilisable", async () => {
    const p = await sansDecideur();
    const t = (await g.api("u_karim", "POST", "/api/tasks", { project_id: p, title: "À confier", assignee_id: "ai_atlas" })).body;
    const run = () => g.ctx.db.one<Any>("SELECT id, status, summary FROM ai_runs WHERE task_id = $1", [t.id]);
    const end = (await waitFor(run, (r) => r?.status === "done" || r?.status === "failed")) as Any;
    expect(end.status).toBe("done");
    expect(end.summary).toMatch(/personne n.est habilité/i);
    expect(await g.ctx.db.query("SELECT id FROM ai_approvals WHERE task_id = $1 AND status = 'pending'", [t.id])).toHaveLength(0);
    const avis = await g.ctx.db.query<Any>("SELECT * FROM notifications WHERE user_id = 'u_karim' AND task_id = $1", [t.id]);
    expect(avis.length).toBeGreaterThan(0);
    expect(avis[0].body).toMatch(/valider|décideur|habilit/i);
    // La tâche n'est pas fermée à l'IA : une nouvelle intervention peut démarrer
    await g.api("u_alice", "PUT", "/api/org/members/u_karim/permissions", { overrides: { "ai.delegate": true, "ai.approve": true } });
    const again = await g.api("u_karim", "POST", `/api/tasks/${t.id}/ai/run`, { agent_id: "ai_atlas" });
    expect(again.status).toBe(200);
    expect(again.body.run_id).toBeTruthy();
  });

  it("une attente laissée en plan expire, libère la tâche et le dit", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/ai_atlas`, { role: "editor" });
    (g.ctx.ai as Any).approvalTimeoutMs = 150;
    const t = (await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "À confier", assignee_id: "ai_atlas" })).body;
    const run = () => g.ctx.db.one<Any>("SELECT id, status, summary FROM ai_runs WHERE task_id = $1", [t.id]);
    await waitFor(run, (r) => r?.status === "waiting_approval", 3000);
    const end = (await waitFor(run, (r) => r?.status === "done")) as Any;
    expect(end.status).toBe("done");
    expect(end.summary).toMatch(/délai|expir/i);
    const a = await g.ctx.db.one<Any>("SELECT status FROM ai_approvals WHERE task_id = $1", [t.id]);
    expect(a!.status).toBe("expired");
    const again = await g.api("u_alice", "POST", `/api/tasks/${t.id}/ai/run`, { agent_id: "ai_atlas" });
    expect(again.status).toBe(200);
  });

  it("une tâche déjà prise par une intervention : la route dit pourquoi au lieu de répondre un identifiant vide", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/ai_atlas`, { role: "editor" });
    const t = (await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "À confier", assignee_id: "ai_atlas" })).body;
    await waitFor(
      () => g.ctx.db.one<Any>("SELECT status FROM ai_runs WHERE task_id = $1", [t.id]),
      (r) => r?.status === "waiting_approval",
    );
    const r = await g.api("u_alice", "POST", `/api/tasks/${t.id}/ai/run`, { agent_id: "ai_atlas" });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/en attente de validation|décision/i);
  });
});
