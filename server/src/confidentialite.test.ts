import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp, type AppOptions } from "./app.js";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Thème 5 de l'analyse (docs/ANALYSE-MODULES.md) : confidentialité et données personnelles. Décisions de la direction :
 * le chef lit la partie administrative du dossier de ses agents ; un agent voit du pilotage ce qui le concerne ; un chef
 * lit le courrier de son entité ; l'IA demande la permission avant chaque lecture envoyée au service extérieur.
 */
type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("pilotage, dossiers et courrier", () => {
  let g: GovCtx;
  let unitA: string;
  let unitB: string;
  beforeEach(async () => {
    g = await boot();
    [unitA, unitB] = await g.units(2);
    // Fiston dirige l'entité A ; Didier y est agent
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

  it("D-1, D-2 : les observations des RH restent aux RH ; le chef lit la partie administrative seulement", async () => {
    await g.api("u_alice", "POST", "/api/hr/agents", {
      user_id: "u_hugo",
      civility: "M.",
      last_name: "Lukusa",
      first_names: "Didier",
      status: "fonctionnaire",
      grade: "Attaché",
      unit_id: unitA,
      hired_on: "2020-01-06",
      address: "12 avenue fictive",
      id_document_number: "X-000",
      notes: "Entretien de recadrage prévu",
    });
    await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/contacts", { name: "Contact fictif", relation: "Conjoint" });
    const hr = (await g.api("u_alice", "GET", "/api/hr/agents/u_hugo")).body;
    expect(hr.notes).toBe("Entretien de recadrage prévu");
    const self = (await g.api("u_hugo", "GET", "/api/hr/me")).body;
    expect(self.address).toBe("12 avenue fictive");
    expect(self).not.toHaveProperty("notes");
    const chief = await g.api("u_karim", "GET", "/api/hr/agents/u_hugo");
    expect(chief.status).toBe(200);
    expect(chief.body).toMatchObject({ grade: "Attaché", restricted: true });
    for (const k of ["notes", "address", "id_document_number", "birth_date", "phone", "personal_email"])
      expect(chief.body).not.toHaveProperty(k);
    expect(chief.body.contacts).toEqual([]);
    expect(chief.body.assignments.length).toBeGreaterThan(0);
  });

  it("F-4 : un agent voit les activités de son entité ou dont il est responsable, pas celles des autres", async () => {
    const mine = (await g.api("u_alice", "POST", "/api/activities", { kind: "commission", title: "Commission A", unit_id: unitA })).body;
    const other = (await g.api("u_alice", "POST", "/api/activities", { kind: "commission", title: "Commission B", unit_id: unitB })).body;
    const list = (await g.api("u_hugo", "GET", "/api/activities")).body as Any[];
    expect(list.map((a) => a.id)).toContain(mine.id);
    expect(list.map((a) => a.id)).not.toContain(other.id);
    expect((await g.api("u_hugo", "GET", `/api/activities/${other.id}`)).status).toBe(404);
    const dg = (await g.api("u_alice", "GET", "/api/activities")).body as Any[];
    expect(dg.map((a) => a.id)).toEqual(expect.arrayContaining([mine.id, other.id]));
  });

  it("DEC-6 : un agent voit les décisions qui le concernent", async () => {
    const decide = (body: Record<string, unknown>) =>
      g.api("u_alice", "POST", "/api/decisions", { title: "D", content: "Texte", decided_on: day(), due_on: day(30), ...body });
    const his = (await decide({ owner_id: "u_hugo" })).body;
    const other = (await decide({ owner_id: "u_alice" })).body;
    const list = (await g.api("u_hugo", "GET", "/api/decisions")).body as Any[];
    expect(list.map((d) => d.id)).toContain(his.id);
    expect(list.map((d) => d.id)).not.toContain(other.id);
    expect((await g.api("u_hugo", "GET", `/api/decisions/${other.id}`)).status).toBe(404);
  });

  it("R-8 : le comité de direction reste à ses participants et à la direction", async () => {
    const meet = (body: Record<string, unknown>) =>
      g.api("u_alice", "POST", "/api/meetings", { meeting_date: day(-2), writer_id: "u_alice", ...body });
    const unit = (await meet({ meeting_type: "Réunion de service", unit_id: unitA })).body;
    const codir = (await meet({ meeting_type: "Comité de direction" })).body;
    const ids = async () => ((await g.api("u_hugo", "GET", "/api/meetings")).body as Any[]).map((m) => m.id);
    expect(await ids()).toContain(unit.id);
    expect(await ids()).not.toContain(codir.id);
    expect((await g.api("u_hugo", "GET", `/api/meetings/${codir.id}`)).status).toBe(404);
    await g.ctx.db.query("INSERT INTO meeting_attendees (id, org_id, meeting_id, user_id, name, invited) VALUES ('att_x', $1, $2, 'u_hugo', 'Didier Lukusa', TRUE)", [g.org, codir.id]);
    expect(await ids()).toContain(codir.id);
  });

  it("CV-3 : un agent voit les accords de son entité, pas les autres", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire", type_code: "organisation_internationale", categories: ["ptf"] })).body;
    const accord = (unit: string) =>
      g.api("u_alice", "POST", "/api/agreements", { type_code: "protocole_accord", title: `Accord ${unit}`, content: "x", partner_ids: [p.id], unit_id: unit });
    const a = (await accord(unitA)).body;
    const b = (await accord(unitB)).body;
    const ids = ((await g.api("u_hugo", "GET", "/api/agreements")).body as Any[]).map((x) => x.id);
    expect(ids).toContain(a.id);
    expect(ids).not.toContain(b.id);
    expect((await g.api("u_hugo", "GET", `/api/agreements/${b.id}`)).status).toBe(404);
  });

  it("PT-6 : les budgets d'un plan sont masqués aux agents", async () => {
    const plan = (await g.api("u_alice", "POST", "/api/plans", { unit_id: unitA, year: 2031, title: "Plan A" })).body;
    await g.api("u_alice", "POST", `/api/plans/${plan.id}/activities`, { title: "Atelier", budget_planned: 5000000 });
    const agent = (await g.api("u_hugo", "GET", `/api/plans/${plan.id}`)).body;
    expect(agent.budgets_hidden).toBe(true);
    expect(agent.activities[0].budget_planned).toBeNull();
    const chief = (await g.api("u_karim", "GET", `/api/plans/${plan.id}`)).body;
    expect(chief.budgets_hidden).toBe(false);
    expect(chief.activities[0].budget_planned).toBe(5000000);
  });

  it("C-3 : un chef lit le courrier de son entité ; le secrétariat garde le registre complet", async () => {
    const mail = async (unit: string) => {
      const m = (await g.api("u_alice", "POST", "/api/correspondence", { direction: "entrant", subject: `Courrier ${unit}`, correspondent: "Ministère", received_on: day() })).body;
      await g.ctx.db.query("UPDATE correspondence SET unit_id = $1 WHERE id = $2", [unit, m.id]);
      return m.id as string;
    };
    const a = await mail(unitA);
    const b = await mail(unitB);
    const ids = ((await g.api("u_karim", "GET", "/api/correspondence")).body as Any[]).map((m) => m.id);
    expect(ids).toContain(a);
    expect(ids).not.toContain(b);
    expect((await g.api("u_karim", "GET", `/api/correspondence/${b}`)).status).toBe(404);
    const all = ((await g.api("u_alice", "GET", "/api/correspondence")).body as Any[]).map((m) => m.id);
    expect(all).toEqual(expect.arrayContaining([a, b]));
  });

  it("PA-3 : les notes d'échange restent aux gestionnaires, aux points focaux et à la direction", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "Bailleur", type_code: "organisation_internationale", categories: ["ptf"] })).body;
    await g.api("u_alice", "POST", `/api/partners/${p.id}/notes`, { body: "Le bailleur hésite sur la seconde tranche" });
    const agent = (await g.api("u_hugo", "GET", `/api/partners/${p.id}`)).body;
    expect(agent.notes).toEqual([]);
    expect(agent.history.some((h: Any) => h.kind === "note")).toBe(false);
    expect(agent.can.read_notes).toBe(false);
    const dg = (await g.api("u_alice", "GET", `/api/partners/${p.id}`)).body;
    expect(dg.notes).toHaveLength(1);
  });
});

describe("IA et service extérieur (I-9, AD-4)", () => {
  type Ctx = Awaited<ReturnType<typeof buildApp>>;
  let ctx: Ctx;
  const cookies: Record<string, string> = {};
  const api = async (who: string, method: "GET" | "POST" | "PATCH" | "PUT", url: string, payload?: unknown) => {
    const res = await ctx.app.inject({ method, url, payload: payload as never, headers: { cookie: cookies[who] } });
    return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null };
  };
  const start = async (provider: AppOptions["provider"]) => {
    ctx = await buildApp({ provider, demoDelayMs: 0 });
    for (const u of ["u_alice", "u_karim"])
      cookies[u] = String(
        ([] as string[]).concat(
          (await ctx.app.inject({ method: "POST", url: "/api/auth/login", payload: { user_id: u } })).headers[
            "set-cookie"
          ] as string,
        )[0],
      ).split(";")[0];
  };
  afterEach(async () => {
    await ctx.app.close();
  });
  const waitFor = async <T,>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 6000) => {
    const end = Date.now() + ms;
    for (;;) {
      const v = await fn();
      if (ok(v) || Date.now() > end) return v;
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  it("I-9 : avec un service extérieur, chaque lecture demande la permission ; un refus arrête la lecture", async () => {
    let target = "";
    const provider = {
      name: "externe",
      external: true,
      async turn({ messages }: { messages: { content: unknown }[] }) {
        const last = messages[messages.length - 1].content;
        if (Array.isArray(last) && last.some((b: Any) => b.type === "tool_result"))
          return { stop_reason: "end_turn", content: [{ type: "text", text: "" }] };
        return { stop_reason: "tool_use", content: [{ type: "tool_use", id: "r1", name: "get_task", input: { task: target } }] };
      },
      async json() {
        return {};
      },
    };
    await start(provider as never);
    await ctx.db.query("UPDATE ai_rules SET enabled = FALSE");
    const p = (await ctx.db.one<{ id: string }>("SELECT id FROM projects WHERE name LIKE '%Application mobile%'"))!.id;
    const secret = (await api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Note confidentielle" })).body;
    target = secret.key;
    const work = (await api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Synthèse" })).body;
    await api("u_alice", "PATCH", `/api/tasks/${work.id}`, { assignee_id: "ai_atlas" });
    const pending = await waitFor(
      async () => (await api("u_alice", "GET", "/api/ai/approvals")).body as Any[],
      (a) => a.length > 0,
    );
    // L'envoi du contexte de départ est lui-même soumis à permission, puis chaque lecture
    expect(pending[0].tool).toBe("read_context");
    expect(pending[0].summary).toMatch(/service d'IA extérieur/);
    await api("u_alice", "POST", `/api/ai/approvals/${pending[0].id}`, { approve: true });
    const read = await waitFor(
      async () => (await api("u_alice", "GET", "/api/ai/approvals")).body as Any[],
      (a) => a.some((x) => x.tool === "get_task"),
    );
    const ask = read.find((x) => x.tool === "get_task");
    expect(ask.summary).toMatch(/Lire/);
    await api("u_alice", "POST", `/api/ai/approvals/${ask.id}`, { approve: false });
    const [run] = (await api("u_alice", "GET", `/api/ai/runs?task_id=${work.id}`)).body;
    const end = await waitFor(
      async () => (await api("u_alice", "GET", `/api/ai/runs/${run.id}`)).body,
      (x) => x.status === "done",
    );
    expect(end.steps.some((s: Any) => s.tool === "get_task" && s.status === "rejected")).toBe(true);
  });

  it("I-9 : en mode démonstration (local), rien ne part : pas de permission de lecture demandée", async () => {
    await start("demo");
    const status = (await api("u_alice", "GET", "/api/ai/status")).body;
    expect(status.external).toBe(false);
    expect(status.read_rule).toMatch(/local/);
  });

  it("AD-4 : l'analyse du journal par un service extérieur attend une permission explicite", async () => {
    const provider = {
      name: "externe",
      external: true,
      async turn() {
        return { stop_reason: "end_turn", content: [] };
      },
      async json() {
        return { summary: "RAS", points: [], recommendations: [] };
      },
    };
    await start(provider as never);
    await ctx.db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_alice'");
    const ask = await api("u_alice", "POST", "/api/admin/audit/analysis", {});
    expect(ask.status).toBe(200);
    expect(ask.body).toMatchObject({ ai: null, consent_required: true });
    expect(ask.body.preview).toBeTruthy();
    const ok = await api("u_alice", "POST", "/api/admin/audit/analysis", { consent: true });
    expect(ok.body.ai).toMatchObject({ summary: "RAS" });
  });
});
