import { afterEach, describe, expect, it } from "vitest";
import { buildApp, type AppOptions } from "./app.js";

/*
 * Thème 2 de l'analyse (docs/ANALYSE-MODULES.md), coéquipiers IA : l'IA propose, un humain décide, toujours.
 * Plus de validation automatique (I-1) ; un refus arrête l'intervention, sauf si l'on choisit de la laisser
 * continuer (I-2) ; la personne visée par une proposition ne la valide pas elle-même (I-4).
 */
type Ctx = Awaited<ReturnType<typeof buildApp>>;
type Any = any;
let ctx: Ctx;
const cookies: Record<string, string> = {};
type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
async function api(who: string, method: Method, url: string, payload?: unknown) {
  const res = await ctx.app.inject({ method, url, payload: payload as never, headers: { cookie: cookies[who] } });
  let body = null;
  try {
    body = res.body ? JSON.parse(res.body) : null;
  } catch {
    body = res.body;
  }
  return { status: res.statusCode, body };
}
async function start(provider: AppOptions["provider"] = "demo") {
  ctx = await buildApp({ provider, demoDelayMs: 0 });
  for (const u of ["u_alice", "u_karim", "u_hugo"])
    cookies[u] = String(
      ([] as string[]).concat(
        (await ctx.app.inject({ method: "POST", url: "/api/auth/login", payload: { user_id: u } })).headers[
          "set-cookie"
        ] as string,
      )[0],
    ).split(";")[0];
}
afterEach(async () => {
  await ctx.app.close();
});
const appId = async () =>
  (await ctx.db.one<{ id: string }>("SELECT id FROM projects WHERE name LIKE '%Application mobile%'"))!.id;
const waitFor = async <T,>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 6000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (ok(v) || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
};

/** Un coéquipier qui commente la tâche visée, puis crée une tâche de suivi, puis s'arrête. */
const stub = (target: () => string) => ({
  name: "stub",
  async turn({ messages }: { messages: { role: string; content: unknown }[] }) {
    const done = messages.filter((m) => Array.isArray(m.content) && (m.content as Any[]).some((b) => b.type === "tool_result"));
    if (done.length === 0)
      return {
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "c1", name: "add_comment", input: { task: target(), body: "@Didier petite relance" } },
        ],
      };
    if (done.length === 1)
      return {
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", id: "c2", name: "create_task", input: { project_id: "APP", title: "Suite de la relance" } },
        ],
      };
    return { stop_reason: "end_turn", content: [{ type: "text", text: "" }] };
  },
  async json() {
    return {};
  },
});

async function launch() {
  let key = "";
  await start(stub(() => key) as never);
  const p = await appId();
  // Une seule intervention à suivre : les règles du projet de démonstration sont coupées
  await ctx.db.query("UPDATE ai_rules SET enabled = FALSE");
  await api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "editor" });
  const app = (await api("u_alice", "GET", `/api/projects/${p}`)).body;
  // La tâche visée par la relance est confiée à Didier
  const visee = (await api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Intégrer le SDK", assignee_id: "u_hugo" }))
    .body;
  key = visee.key;
  const work = (await api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Point d'avancement" })).body;
  await api("u_alice", "PATCH", `/api/tasks/${work.id}`, { assignee_id: "ai_atlas" });
  const pending = await waitFor(
    async () => (await api("u_alice", "GET", "/api/ai/approvals")).body as Any[],
    (a) => a.length > 0,
  );
  return { p, app, work, approval: pending[0] };
}

describe("coéquipiers IA : validation humaine", () => {
  it("une règle ne peut plus valider seule (I-1)", async () => {
    await start();
    const p = await appId();
    const r = await api("u_alice", "POST", `/api/projects/${p}/ai/rules`, {
      name: "Triage",
      trigger: "task_created",
      agent_id: "ai_atlas",
      instructions: "Trie",
      auto_approve: true,
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/validation automatique/);
    const ok = await api("u_alice", "POST", `/api/projects/${p}/ai/rules`, {
      name: "Triage",
      trigger: "task_created",
      agent_id: "ai_atlas",
      instructions: "Trie",
    });
    expect(ok.status).toBe(200);
    expect(ok.body.auto_approve).toBe(false);
  });

  it("la personne visée par une proposition ne la valide pas elle-même (I-4)", async () => {
    const { approval } = await launch();
    expect(approval.tool).toBe("add_comment");
    expect(approval.target_ids).toContain("u_hugo");
    const self = await api("u_hugo", "POST", `/api/ai/approvals/${approval.id}`, { approve: true });
    expect(self.status).toBe(403);
    expect(self.body.error).toMatch(/vous vise/);
    // Didier n'est pas sollicité pour valider ce qui le vise
    const list = (await api("u_hugo", "GET", "/api/ai/approvals")).body as Any[];
    expect(list.map((a) => a.id)).not.toContain(approval.id);
    expect((await api("u_alice", "POST", `/api/ai/approvals/${approval.id}`, { approve: true })).status).toBe(200);
  });

  it("un refus arrête l'intervention (I-2)", async () => {
    const { work, approval } = await launch();
    const r = await api("u_alice", "POST", `/api/ai/approvals/${approval.id}`, { approve: false });
    expect(r.status).toBe(200);
    const [run] = (await api("u_alice", "GET", `/api/ai/runs?task_id=${work.id}`)).body;
    const end = await waitFor(
      async () => (await api("u_alice", "GET", `/api/ai/runs/${run.id}`)).body,
      (x) => x.status === "done",
    );
    expect(end.status).toBe("done");
    expect(end.summary).toMatch(/arrêtée/);
    const n = await ctx.db.one<{ n: number }>("SELECT count(*)::int AS n FROM ai_approvals WHERE run_id = $1", [run.id]);
    expect(n!.n).toBe(1);
  });

  it("refuser en laissant continuer : le coéquipier poursuit avec la proposition suivante (I-2)", async () => {
    const { work, approval } = await launch();
    await api("u_alice", "POST", `/api/ai/approvals/${approval.id}`, { approve: false, continue: true });
    const next = await waitFor(
      async () => (await api("u_alice", "GET", "/api/ai/approvals")).body as Any[],
      (a) => a.some((x) => x.tool === "create_task"),
    );
    expect(next.some((x) => x.tool === "create_task")).toBe(true);
    const [run] = (await api("u_alice", "GET", `/api/ai/runs?task_id=${work.id}`)).body;
    await api("u_alice", "POST", `/api/ai/runs/${run.id}/cancel`);
  });
});
