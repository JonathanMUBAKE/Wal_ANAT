import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Lot S2 — faire dire la vérité au journal (docs/INTERVENTIONS.md, S2.1 à S2.3).
 * Une trace qui ment est pire qu'une trace absente.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const acts = (kind: string) =>
  g.ctx.db.query<Any>("SELECT * FROM activity WHERE kind = $1 ORDER BY created_at, id", [kind]);

describe("S2.1 : une validation n'est journalisée que si quelque chose s'exécute", () => {
  it("approuver une proposition dont l'attente a disparu : 409, la ligne reste en attente, rien au journal", async () => {
    const p = await g.project();
    const t = (await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Note" })).body;
    await g.ctx.db.query(
      `INSERT INTO ai_runs (id, org_id, agent_id, kind, task_id, project_id, requested_by, status, provider)
       VALUES ('run_s21', $1, 'ai_cadence', 'task', $2, $3, 'u_alice', 'waiting_approval', 'mock')`,
      [g.org, t.id, p],
    );
    await g.ctx.db.query(
      `INSERT INTO ai_approvals (id, run_id, agent_id, task_id, project_id, tool, input, summary, status, target_ids)
       VALUES ('apr_s21', 'run_s21', 'ai_cadence', $1, $2, 'update_task', '{}', 'Changer la priorité', 'pending', '[]')`,
      [t.id, p],
    );
    for (const approve of [true, false]) {
      const r = await g.api("u_alice", "POST", "/api/ai/approvals/apr_s21", { approve });
      expect(r.status).toBe(409);
      expect(r.body.error).toMatch(/redémarr|plus en attente|relancer/i);
    }
    const row = await g.ctx.db.one<Any>("SELECT status, decided_by FROM ai_approvals WHERE id = 'apr_s21'");
    expect(row.status).toBe("pending");
    expect(row.decided_by).toBeNull();
    expect(await acts("ai.approved")).toHaveLength(0);
    expect(await acts("ai.rejected")).toHaveLength(0);
  });
});
