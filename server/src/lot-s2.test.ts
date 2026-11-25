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
  g.ctx.db.query<Any>(
    "SELECT * FROM activity WHERE kind = $1 ORDER BY created_at, id",
    [kind],
  );

describe("S2.1 : une validation n'est journalisée que si quelque chose s'exécute", () => {
  it("approuver une proposition dont l'attente a disparu : 409, la ligne reste en attente, rien au journal", async () => {
    const p = await g.project();
    const t = (
      await g.api("u_alice", "POST", "/api/tasks", {
        project_id: p,
        title: "Note",
      })
    ).body;
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
      const r = await g.api("u_alice", "POST", "/api/ai/approvals/apr_s21", {
        approve,
      });
      expect(r.status).toBe(409);
      expect(r.body.error).toMatch(/redémarr|plus en attente|relancer/i);
    }
    const row = await g.ctx.db.one<Any>(
      "SELECT status, decided_by FROM ai_approvals WHERE id = 'apr_s21'",
    );
    expect(row.status).toBe("pending");
    expect(row.decided_by).toBeNull();
    expect(await acts("ai.approved")).toHaveLength(0);
    expect(await acts("ai.rejected")).toHaveLength(0);
  });
});

describe("S2.3 : une règle IA s'exécute sous les droits de celui qui a écrit sa consigne", () => {
  const rule = (p: string, extra: Record<string, unknown> = {}) => ({
    name: "Triage",
    trigger: "task_created",
    agent_id: "ai_atlas",
    instructions: "Trie le backlog",
    ...extra,
  });

  it("un éditeur sans le droit de déléguer à l'IA ne réécrit pas la consigne : 403 ; avec le droit, la règle change d'auteur", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, {
      role: "admin",
    });
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_karim`, {
      role: "admin",
    });
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/ai_atlas`, {
      role: "editor",
    });
    const created = await g.api(
      "u_alice",
      "POST",
      `/api/projects/${p}/ai/rules`,
      rule(p),
    );
    expect(created.status).toBe(200);
    expect(created.body.created_by).toBe("u_alice");
    const rid = created.body.id as string;
    // Hugo gère les règles du projet mais n'a pas le droit de confier du travail à l'IA
    await g.api("u_alice", "PUT", "/api/org/members/u_hugo/permissions", {
      overrides: { "ai.rules": true, "ai.delegate": false },
    });
    const refused = await g.api(
      "u_hugo",
      "POST",
      `/api/projects/${p}/ai/rules`,
      {
        ...rule(p),
        id: rid,
        instructions: "Supprime tout",
      },
    );
    expect(refused.status).toBe(403);
    const same = await g.ctx.db.one<Any>(
      "SELECT instructions, created_by FROM ai_rules WHERE id = $1",
      [rid],
    );
    expect(same.instructions).toBe("Trie le backlog");
    expect(same.created_by).toBe("u_alice");
    // Karim a les deux droits : la règle passe sous les siens
    await g.api("u_alice", "PUT", "/api/org/members/u_karim/permissions", {
      overrides: { "ai.rules": true, "ai.delegate": true },
    });
    const ok = await g.api("u_karim", "POST", `/api/projects/${p}/ai/rules`, {
      ...rule(p),
      id: rid,
      instructions: "Trie par priorité",
    });
    expect(ok.status).toBe(200);
    expect(ok.body.created_by).toBe("u_karim");
    const logged = (await acts("rule.updated")).filter(
      (a) => a.data.rule === rid,
    );
    expect(logged).toHaveLength(1);
    expect(logged[0].actor_id).toBe("u_karim");
    expect(logged[0].data.instructions).toEqual({
      from: "Trie le backlog",
      to: "Trie par priorité",
    });
    expect(logged[0].data.author).toEqual({ from: "u_alice", to: "u_karim" });
  });

  it("la création d'une règle est journalisée avec sa consigne", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/ai_atlas`, {
      role: "editor",
    });
    const r = await g.api(
      "u_alice",
      "POST",
      `/api/projects/${p}/ai/rules`,
      rule(p),
    );
    expect(r.status).toBe(200);
    const logged = (await acts("rule.created")).filter(
      (a) => a.data.rule === r.body.id,
    );
    expect(logged).toHaveLength(1);
    expect(logged[0].project_id).toBe(p);
    expect(logged[0].data.instructions).toBe("Trie le backlog");
  });
});

describe("S2.2 : modifier une activité laisse une trace", () => {
  const make = async (extra: Record<string, unknown> = {}) =>
    (
      await g.api("u_alice", "POST", "/api/activities", {
        kind: "rendez_vous",
        title: "Audience",
        lead_id: "u_alice",
        ...extra,
      })
    ).body;

  it("lever la confidentialité puis la remettre : deux actes, avec les deux valeurs", async () => {
    const a = await make();
    expect(a.confidential).toBe(true);
    expect(
      (
        await g.api("u_alice", "PATCH", `/api/activities/${a.id}`, {
          confidential: false,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await g.api("u_alice", "PATCH", `/api/activities/${a.id}`, {
          confidential: true,
        })
      ).status,
    ).toBe(200);
    const logged = (await acts("activity.updated")).filter(
      (x) => x.data.id === a.id,
    );
    expect(logged).toHaveLength(2);
    expect(logged[0].actor_id).toBe("u_alice");
    expect(logged[0].data.confidential).toEqual({ from: true, to: false });
    expect(logged[1].data.confidential).toEqual({ from: false, to: true });
    // Le journal ne recopie pas le titre d'une activité confidentielle
    expect(JSON.stringify(logged)).not.toContain("Audience");
  });

  it("changer le responsable et la santé est journalisé, et le nouveau responsable est prévenu", async () => {
    const a = await make();
    await g.api("u_alice", "PATCH", `/api/activities/${a.id}`, {
      lead_id: "u_karim",
      health: "at_risk",
    });
    const [x] = (await acts("activity.updated")).filter(
      (l) => l.data.id === a.id,
    );
    expect(x.data.lead_id).toEqual({ from: "u_alice", to: "u_karim" });
    expect(x.data.health).toEqual({ from: "on_track", to: "at_risk" });
    const n = await g.ctx.db.query<Any>(
      "SELECT * FROM notifications WHERE user_id = 'u_karim' AND kind = 'activity.assigned'",
    );
    expect(n).toHaveLength(1);
    expect(n[0].category).toBe("projets");
  });

  it("une modification qui ne change rien n'écrit rien au journal", async () => {
    const a = await make();
    await g.api("u_alice", "PATCH", `/api/activities/${a.id}`, {
      confidential: true,
      health: "on_track",
    });
    expect(
      (await acts("activity.updated")).filter((l) => l.data.id === a.id),
    ).toHaveLength(0);
  });

  it("les suites sont journalisées : ajout et clôture", async () => {
    const a = await make();
    const r = await g.api(
      "u_alice",
      "POST",
      `/api/activities/${a.id}/followups`,
      { text: "Relancer", responsible_id: "u_karim" },
    );
    expect(r.status).toBe(200);
    const f = (r.body.followups as Any[])[0];
    await g.api("u_alice", "PATCH", `/api/activity-followups/${f.id}`, {
      done: true,
    });
    expect(
      (await acts("activity.followup.added")).filter((l) => l.data.id === a.id),
    ).toHaveLength(1);
    const closed = (await acts("activity.followup.done")).filter(
      (l) => l.data.id === a.id,
    );
    expect(closed).toHaveLength(1);
    expect(closed[0].data.followup).toBe(f.id);
  });
});
