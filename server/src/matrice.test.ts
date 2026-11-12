import { readdirSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

/*
 * Contrat d'accès de toute l'API, rejoué à chaque test : anonyme, lecteur strict, propriétaire externe, propriétaire légitime.
 * Une route ajoutée sans entrée dans TABLE fait échouer la suite : aucune route ne peut échapper à ce contrôle.
 */
type Any = any;
type Kind = "P1" | "P2" | "P3" | "P4";
const PNG = "data:image/png;base64,iVBORw0KGgo=",
  GOOD = "cheval-agrafe-batterie-42",
  NO_LIMITS = {
    anonymousPerMinute: 1e6,
    sessionPerMinute: 1e6,
    aiPerMinute: 1e6,
    invitationsPerHour: 1e6,
    aiRunsPerHour: 1e6,
  };
const PUBLIC = /^\/api\/auth\/(login|logout|config|users$|mfa$|token|activate|reset|forgot|request-access)/;
/** Écritures qui ne concernent que son propre compte : un lecteur y a droit. */
const PERSONAL =
  /^(POST \/api\/auth\/(password|mfa\/setup|mfa\/confirm|mfa\/disable)|DELETE \/api\/auth\/sessions|POST \/api\/notifications\/read|PUT \/api\/me\/notification-prefs|PATCH \/api\/hr\/me|POST \/api\/orgs\/:id\/switch|POST \/api\/invitations\/)/;
const DEMO_ONLY = "POST /api/orgs"; // Hors mode démo, réservé à l'administrateur système (voir auth.test.ts)
/** Réponses normales du propriétaire : l'essai vise volontairement un refus métier. */
const OWNER_EXPECTED =
  /^(PUT|DELETE) \/api\/users\/:id\/avatar|^GET \/api\/avatars|^POST \/api\/auth\/(password|mfa\/confirm|mfa\/disable)|^POST \/api\/invitations\/:id|\/api\/admin\//;
let n = 0;
const u = (p: string) => `${p}${++n}`;
const cookieOf = (r: Any) =>
  ([] as string[])
    .concat(r.headers["set-cookie"] ?? [])
    .map((c) => c.split(";")[0])
    .filter((c) => !/=$/.test(c))
    .join("; ");

async function boot(kind: Kind) {
  const ctx = await buildApp({ provider: "demo", demoDelayMs: 0, limits: NO_LIMITS });
  const c: Record<string, string> = {};
  const inj = async (who: string | null, method: Any, url: string, payload?: Any) => {
    const res = await ctx.app.inject({ method, url, payload, headers: who && c[who] ? { cookie: c[who] } : {} });
    let body: Any = null;
    try {
      body = res.body ? JSON.parse(res.body) : null;
    } catch {
      body = res.body;
    }
    return { status: res.statusCode, body, res };
  };
  for (const id of ["u_alice", "u_karim", "u_hugo"])
    c[id] = cookieOf((await inj(null, "POST", "/api/auth/login", { user_id: id })).res);
  const a = "u_alice";
  const org = (await ctx.db.one<Any>("SELECT id FROM organizations WHERE name='Nova Mobile'")).id as string;
  const app = (await ctx.db.one<Any>("SELECT id FROM projects WHERE name LIKE '%Application mobile%'")).id as string;
  const profs = (await inj(a, "GET", "/api/org/profiles")).body as Any[],
    prof = (x: string) => profs.find((p) => p.name === x).id as string;
  const detail = (await inj(a, "GET", `/api/projects/${app}`)).body;
  await inj(a, "PUT", "/api/org/mail", { domain: "nova.test", smtp: { host: "127.0.0.1", port: 1, security: "none" } });
  const addr = (await inj(a, "GET", "/api/org/mail/addresses")).body[0];
  let who: string | null = null;
  if (kind === "P2") {
    who = "u_hugo";
    await ctx.db.query("DELETE FROM memberships WHERE user_id='u_hugo'");
    await ctx.db.query("DELETE FROM team_members WHERE user_id='u_hugo'");
    const p = (await inj(a, "POST", "/api/org/profiles", { name: "Sans droit", base_role: "member", permissions: [] }))
      .body;
    await inj(a, "PUT", "/api/org/members/u_hugo/profile", { profile_id: p.id });
    await inj(a, "PUT", `/api/projects/${app}/members/u_hugo`, { role: "viewer" });
  }
  if (kind === "P3") {
    const b = await inj("u_hugo", "POST", "/api/orgs", { name: "Organisation B" });
    c.b = `${c.u_hugo.split(";")[0]}; ${cookieOf(b.res)}`;
    who = "b";
    await ctx.db.query("DELETE FROM memberships WHERE user_id='u_hugo'");
    await ctx.db.query("DELETE FROM team_members WHERE user_id='u_hugo'");
    await ctx.db.query("DELETE FROM org_members WHERE user_id='u_hugo' AND org_id=$1", [org]);
  }
  if (kind === "P4") who = a;
  const X: Any = {
    org,
    app,
    prof,
    detail,
    addr,
    task: async () => (await inj(a, "POST", "/api/tasks", { project_id: app, title: u("Tache") })).body,
    comment: async (t: Any) => (await inj(a, "POST", `/api/tasks/${t.id}/comments`, { body: "commentaire" })).body,
    att: async (t: Any) =>
      JSON.parse(
        (
          await ctx.app.inject({
            method: "POST",
            url: `/api/tasks/${t.id}/attachments?name=a.txt`,
            payload: Buffer.from("texte"),
            headers: { cookie: c[a], "content-type": "application/octet-stream" },
          })
        ).body,
      ),
    project: async () => {
      const p = (await inj(a, "POST", "/api/projects", { name: u("Projet") })).body;
      if (kind === "P2") await inj(a, "PUT", `/api/projects/${p.id}/members/u_hugo`, { role: "viewer" });
      return p;
    },
    section: async () => (await inj(a, "POST", `/api/projects/${app}/sections`, { name: u("S") })).body,
    unit: async () => ({
      id: (
        await inj(a, "POST", "/api/org/units", {
          name: u("U"),
          parent_id: (await inj(a, "GET", "/api/org/units")).body[0].id,
        })
      ).body.id,
    }),
    team: async (visibility = "public") => (await inj(a, "POST", "/api/teams", { name: u("Eq"), visibility })).body,
    rule: async () =>
      (
        await inj(a, "POST", `/api/projects/${app}/ai/rules`, {
          name: u("R"),
          trigger: "task_moved",
          agent_id: "ai_atlas",
          instructions: "x",
        })
      ).body,
    profile: async () =>
      (await inj(a, "POST", "/api/org/profiles", { name: u("Pr"), base_role: "member", permissions: [] })).body,
    invite: async () =>
      (
        await inj(a, "POST", "/api/org/invitations", {
          email: `${u("x")}@x.test`,
          name: "X",
          profile_id: prof("Membre"),
        })
      ).body,
    run: async () => {
      const t = await X.task();
      return (await inj(a, "POST", `/api/tasks/${t.id}/ai/run`, { agent_id: "ai_atlas", instructions: "attente" })).body
        .run_id;
    },
    approval: async () => {
      const t = await X.task();
      await inj(a, "POST", `/api/tasks/${t.id}/ai/run`, {
        agent_id: "ai_atlas",
        instructions: "Crée une tâche de test",
      });
      for (let i = 0; i < 40; i++) {
        const r = await ctx.db.one<Any>("SELECT id FROM ai_approvals WHERE task_id=$1 AND status='pending'", [t.id]);
        if (r) return r.id;
        await new Promise((s) => setTimeout(s, 50));
      }
      return "aucune";
    },
    meeting: async () =>
      (
        await inj(a, "POST", "/api/meetings", {
          meeting_type: "Hebdomadaire",
          meeting_date: "2026-07-13",
          writer_id: "u_karim",
        })
      ).body,
    filled: async () => {
      const m = await X.meeting();
      return (
        await inj(a, "PUT", `/api/meetings/${m.id}/content`, {
          agenda: [{ subject: "Point", actions: [{ text: "Faire", responsible_id: "u_karim", due_on: "2026-07-20" }] }],
          attendees: [],
        })
      ).body;
    },
    plan: async () => {
      X.planCount = (X.planCount ?? 0) + 1;
      const y = 2030 + X.planCount;
      return (await inj(a, "POST", "/api/plans", { unit_id: (await X.unit()).id, year: y, title: u("Plan") })).body;
    },
    fullPlan: async () => {
      const p = await X.plan();
      return (
        await inj(a, "POST", `/api/plans/${p.id}/activities`, {
          title: "A",
          responsible_id: "u_karim",
          target_value: 1,
          end_on: "2027-01-01",
        })
      ).body;
    },
    submittedByKarim: async () => {
      const p = await X.fullPlan();
      await ctx.db.query("UPDATE work_plans SET status = 'submitted', submitted_by = 'u_karim' WHERE id = $1", [p.id]);
      return p;
    },
    approvedPlan: async () => {
      const p = await X.submittedByKarim();
      return (await inj(a, "POST", `/api/plans/${p.id}/approve`)).body;
    },
    deliverable: async (responsible: string, validator = responsible === "u_alice" ? "u_karim" : "u_alice") =>
      (
        await inj(a, "POST", "/api/deliverables", {
          project_id: app,
          title: u("L"),
          responsible_id: responsible,
          validator_id: validator,
        })
      ).body,
    deliverableAt: async (status: string, responsible = "u_karim") => {
      const d = await X.deliverable(responsible);
      await ctx.db.query("UPDATE deliverables SET status = $1 WHERE id = $2", [status, d.id]);
      return d.id;
    },
    referential: async () =>
      ((await inj(a, "GET", "/api/referentials")).body.activity_type as Any[]).find((v) => v.code === "commission"),
    partner: async () => (await inj(a, "POST", "/api/partners", { name: u("Partenaire"), type_code: "autre" })).body,
    partnerContact: async () =>
      (await inj(a, "POST", `/api/partners/${(await X.partner()).id}/contacts`, { name: "Contact" })).body,
    agreement: async () =>
      (
        await inj(a, "POST", "/api/agreements", {
          type_code: "protocole_accord",
          title: u("Accord"),
          content: "Texte",
          partner_ids: [(await X.partner()).id],
        })
      ).body,
    agreementInForce: async () => {
      const ag = await X.agreement();
      await inj(a, "POST", `/api/agreements/${ag.id}/activate`, { signed_on: "2026-03-02" });
      return ag;
    },
    ddoc: async () =>
      JSON.parse(
        (
          await ctx.app.inject({
            method: "POST",
            url: `/api/dossier-documents?owner=project&owner_id=${app}&name=a.txt&nature=autre&other_label=Note`,
            payload: Buffer.from("texte"),
            headers: { cookie: c[a], "content-type": "application/octet-stream" },
          })
        ).body,
      ),
    pdoc: async () =>
      JSON.parse(
        (
          await ctx.app.inject({
            method: "POST",
            url: `/api/partners/${(await X.partner()).id}/documents?name=a.txt&nature=autre&other_label=Note`,
            payload: Buffer.from("texte"),
            headers: { cookie: c[a], "content-type": "application/octet-stream" },
          })
        ).body,
      ),
    decision: async () =>
      (
        await inj(a, "POST", "/api/decisions", {
          title: u("Décision"),
          content: "Texte",
          decided_on: "2026-03-02",
          owner_id: "u_karim",
        })
      ).body,
    toPay: async () => {
      const id = await X.deliverableAt("valide");
      await ctx.db.query("UPDATE deliverables SET to_pay = TRUE WHERE id = $1", [id]);
      return id;
    },
    contract: async () =>
      (
        await inj(a, "POST", "/api/contracts", {
          project_id: app,
          consultant_name: "C",
          title: "M",
          start_on: "2026-01-01",
          end_on: "2026-12-31",
          supervisor_id: "u_alice",
        })
      ).body,
    doc: async () =>
      (await inj(a, "POST", "/api/signature", { title: u("D"), steps: [{ actor_id: "u_karim", action: "signature" }] }))
        .body,
    docForAlice: async () => {
      const d = (
        await inj("u_karim", "POST", "/api/signature", { title: u("D"), steps: [{ actor_id: a, action: "signature" }] })
      ).body;
      await inj("u_karim", "POST", `/api/signature/${d.id}/start`);
      return d.id;
    },
    delegation: async () =>
      (await inj(a, "POST", "/api/delegations", { to_user: "u_karim", start_on: "2026-01-01", end_on: "2026-01-02" }))
        .body,
    mail: async () =>
      (
        await inj(a, "POST", "/api/correspondence", {
          direction: "entrant",
          subject: u("S"),
          correspondent: "C",
          received_on: "2026-03-02",
        })
      ).body,
    risk: async () => (await inj(a, "POST", "/api/risks", { title: u("R"), probability: 2, impact: 3 })).body,
    indicator: async () => (await inj(a, "POST", "/api/indicators", { name: u("I"), target: 3 })).body,
    gap: async () => {
      const id = u("gap_");
      await ctx.db.query(
        "INSERT INTO participation_gaps (id, org_id, fingerprint, kind, summary) VALUES ($1,$2,$3,'absence','x')",
        [id, org, id],
      );
      return id;
    },
    activity: async () => (await inj(a, "POST", "/api/activities", { kind: "commission", title: u("A") })).body,
    followup: async () => {
      const x = await X.activity();
      return (await inj(a, "POST", `/api/activities/${x.id}/followups`, { text: "x" })).body.followups[0].id;
    },
    domain: async () => (await inj(a, "POST", "/api/domains", { name: u("Domaine") })).body,
    sheet: async () => {
      const d = await X.domain();
      return (
        await inj(a, "POST", "/api/attributions", {
          unit_id: (await X.unit()).id,
          mission: "Mission",
          domains: [{ domain_id: d.id, role: "responsable" }],
          relations: [],
        })
      ).body;
    },
    karimSheet: async () => {
      const d = await X.domain();
      await ctx.db.query(
        "UPDATE org_members SET profile_id = $1, role = 'admin' WHERE user_id = 'u_karim' AND org_id = $2",
        [X.prof("Administrateur"), org],
      );
      const s = (
        await inj("u_karim", "POST", "/api/attributions", {
          unit_id: (await X.unit()).id,
          mission: "Mission",
          domains: [{ domain_id: d.id, role: "responsable" }],
          relations: [],
        })
      ).body;
      return s;
    },
    // Le compte rendu se soumet avant d'être validé (docs/PARCOURS-METIER.md, lot P2)
    submitted: async () => {
      const m = await X.filled();
      await ctx.db.query("UPDATE meetings SET status = 'submitted' WHERE id = $1", [m.id]);
      return m;
    },
    validated: async () => {
      const m = await X.submitted();
      await inj(a, "POST", `/api/meetings/${m.id}/validate`);
      return m;
    },
    /** Une séance future, avec ordre du jour et convoqués : prête à être convoquée. */
    upcoming: async (invitee = "u_karim") => {
      const m = (
        await inj(a, "POST", "/api/meetings", {
          meeting_type: u("Comité"),
          meeting_date: "2030-01-15",
          writer_id: "u_karim",
          invitees: [{ user_id: invitee }],
        })
      ).body;
      await inj(a, "PUT", `/api/meetings/${m.id}/content`, { agenda: [{ subject: "Point" }], attendees: [] });
      return m;
    },
    convened: async () => {
      const m = await X.upcoming(a);
      await inj(a, "POST", `/api/meetings/${m.id}/convene`, {});
      return m;
    },
    agent: async () =>
      (
        await inj(a, "POST", "/api/hr/agents", {
          last_name: u("Agent"),
          email: `${u("agent")}@exemple.test`,
          status: "fonctionnaire",
        })
      ).body.agent.user_id as string,
    diploma: async () =>
      (await inj(a, "POST", `/api/hr/agents/${await X.agent()}/diplomas`, { title: "Master" })).body.id as string,
    hrContact: async () =>
      (await inj(a, "POST", `/api/hr/agents/${await X.agent()}/contacts`, { name: "Proche" })).body.id as string,
    selfAgent: async () => {
      const me = (await inj(a, "GET", "/api/hr/me")).body;
      if (!me) await inj(a, "POST", "/api/hr/agents", { user_id: a, last_name: "Titulaire" });
    },
    mdoc: async () => {
      const m = await X.meeting();
      return JSON.parse(
        (
          await ctx.app.inject({
            method: "POST",
            url: `/api/meetings/${m.id}/documents?name=note.txt`,
            payload: Buffer.from("texte"),
            headers: { cookie: c[a], "content-type": "application/octet-stream" },
          })
        ).body,
      ).id as string;
    },
    request: async () => {
      const t = await X.team("request");
      await inj("u_karim", "POST", `/api/teams/${t.id}/join`);
      return (await ctx.db.one<Any>("SELECT id FROM team_requests WHERE team_id=$1", [t.id])).id;
    },
  };
  return { ctx, c, inj, X, who };
}

type Fixture = (X: Any) => Any;
const R_ = (m: string, p: string, f: Fixture = () => ({})) => [m, p, f] as const;
const taskUrl =
  (s = "") =>
  async (X: Any) => ({ url: `/api/tasks/${(await X.task()).id}${s}` });
const TABLE = [
  R_("GET", "/api/me"),
  R_("GET", "/api/users"),
  R_("PUT", "/api/users/:id/avatar", () => ({ url: "/api/users/u_karim/avatar", body: { data_url: PNG } })),
  R_("DELETE", "/api/users/:id/avatar", () => ({ url: "/api/users/u_karim/avatar" })),
  R_("GET", "/api/avatars/:id", () => ({ url: "/api/avatars/u_alice" })),
  R_("GET", "/api/org/mail"),
  R_("PUT", "/api/org/mail", () => ({
    body: { domain: "nova.test", smtp: { host: "127.0.0.1", port: 1, security: "none" } },
  })),
  R_("POST", "/api/org/mail/test"),
  R_("GET", "/api/org/mail/log"),
  R_("GET", "/api/org/mail/addresses"),
  R_("PATCH", "/api/org/mail/addresses/:id", (X) => ({
    url: `/api/org/mail/addresses/${X.addr.id}`,
    body: { local_part: u("adr") },
  })),
  R_("POST", "/api/orgs", () => ({ body: { name: u("Org") } })),
  R_("POST", "/api/orgs/:id/switch", (X) => ({ url: `/api/orgs/${X.org}/switch` })),
  R_("PATCH", "/api/org", () => ({ body: { name: "Nova Mobile" } })),
  R_("PUT", "/api/org/members/:userId", () => ({ url: "/api/org/members/u_karim", body: { role: "member" } })),
  R_("PUT", "/api/org/members/:userId/unit", () => ({ url: "/api/org/members/u_karim/unit", body: { unit_id: null } })),
  R_("GET", "/api/org/units"),
  R_("POST", "/api/org/units", () => ({ body: { name: u("U") } })),
  // Module RH
  R_("GET", "/api/hr/agents"),
  R_("GET", "/api/hr/unregistered"),
  R_("POST", "/api/hr/agents", () => ({
    body: { last_name: u("Agent"), email: `${u("rh")}@exemple.test`, status: "contractuel" },
  })),
  R_("GET", "/api/hr/me"),
  R_("PATCH", "/api/hr/me", async (X) => {
    await X.selfAgent();
    return { body: { phone: "+000" } };
  }),
  R_("GET", "/api/hr/agents/:id", async (X) => ({ url: `/api/hr/agents/${await X.agent()}` })),
  R_("PATCH", "/api/hr/agents/:id", async (X) => ({ url: `/api/hr/agents/${await X.agent()}`, body: { grade: "A1" } })),
  R_("POST", "/api/hr/agents/:id/diplomas", async (X) => ({
    url: `/api/hr/agents/${await X.agent()}/diplomas`,
    body: { title: "Licence" },
  })),
  R_("POST", "/api/hr/agents/:id/contacts", async (X) => ({
    url: `/api/hr/agents/${await X.agent()}/contacts`,
    body: { name: "Proche" },
  })),
  R_("DELETE", "/api/hr/diplomas/:id", async (X) => ({ url: `/api/hr/diplomas/${await X.diploma()}` })),
  R_("DELETE", "/api/hr/contacts/:id", async (X) => ({ url: `/api/hr/contacts/${await X.hrContact()}` })),
  R_("GET", "/api/me/units"),
  R_("GET", "/api/me/meetings"),
  R_("GET", "/api/me/notification-prefs"),
  R_("PUT", "/api/me/notification-prefs", () => ({ body: { taches: { email: true } } })),
  R_("GET", "/api/units/:id/board", async (X) => ({ url: `/api/units/${(await X.unit()).id}/board` })),
  R_("GET", "/api/units/:id/dashboard", async (X) => ({ url: `/api/units/${(await X.unit()).id}/dashboard` })),
  R_("POST", "/api/units/:id/projects", async (X) => ({
    url: `/api/units/${(await X.unit()).id}/projects`,
    body: { name: u("Projet entité") },
  })),
  R_("GET", "/api/units/:id/follow-up", async (X) => ({ url: `/api/units/${(await X.unit()).id}/follow-up` })),
  R_("PATCH", "/api/units/:id", async (X) => ({ url: `/api/units/${(await X.unit()).id}`, body: { name: u("U") } })),
  R_("DELETE", "/api/units/:id", async (X) => ({ url: `/api/units/${(await X.unit()).id}` })),
  R_("GET", "/api/teams"),
  R_("POST", "/api/teams", () => ({ body: { name: u("Eq") } })),
  R_("GET", "/api/teams/:id", async (X) => ({ url: `/api/teams/${(await X.team()).id}` })),
  R_("PATCH", "/api/teams/:id", async (X) => ({ url: `/api/teams/${(await X.team()).id}`, body: { name: u("Eq") } })),
  R_("PUT", "/api/teams/:id/members/:userId", async (X) => ({
    url: `/api/teams/${(await X.team()).id}/members/u_karim`,
    body: { role: "member" },
  })),
  R_("POST", "/api/teams/:id/join", async (X) => ({ url: `/api/teams/${(await X.team()).id}/join` })),
  R_("POST", "/api/team-requests/:id", async (X) => ({
    url: `/api/team-requests/${await X.request()}`,
    body: { approve: true },
  })),
  R_("GET", "/api/projects"),
  R_("POST", "/api/projects", () => ({ body: { name: u("Projet") } })),
  R_("GET", "/api/projects/:id", (X) => ({ url: `/api/projects/${X.app}` })),
  R_("PATCH", "/api/projects/:id", (X) => ({ url: `/api/projects/${X.app}`, body: { description: "x" } })),
  R_("DELETE", "/api/projects/:id", async (X) => {
    const p = await X.project();
    return { url: `/api/projects/${p.id}`, body: { confirm: p.name } };
  }),
  R_("PUT", "/api/projects/:id/members/:userId", (X) => ({
    url: `/api/projects/${X.app}/members/u_karim`,
    body: { role: "editor" },
  })),
  R_("GET", "/api/projects/:id/tasks", (X) => ({ url: `/api/projects/${X.app}/tasks` })),
  R_("GET", "/api/projects/:id/stats", (X) => ({ url: `/api/projects/${X.app}/stats` })),
  R_("GET", "/api/projects/:id/activity", (X) => ({ url: `/api/projects/${X.app}/activity` })),
  R_("GET", "/api/projects/:id/updates", (X) => ({ url: `/api/projects/${X.app}/updates` })),
  R_("POST", "/api/projects/:id/updates", (X) => ({
    url: `/api/projects/${X.app}/updates`,
    body: { status: "on_track", headline: "x", summary: "x", risks: [], next_steps: [] },
  })),
  R_("POST", "/api/projects/:id/sections", (X) => ({ url: `/api/projects/${X.app}/sections`, body: { name: u("S") } })),
  R_("PATCH", "/api/sections/:id", async (X) => ({
    url: `/api/sections/${(await X.section()).id}`,
    body: { name: u("S") },
  })),
  R_("POST", "/api/sections/:id/move", async (X) => ({
    url: `/api/sections/${(await X.section()).id}/move`,
    body: { direction: "left" },
  })),
  R_("DELETE", "/api/sections/:id", async (X) => ({ url: `/api/sections/${(await X.section()).id}` })),
  R_("GET", "/api/tasks"),
  R_("POST", "/api/tasks", (X) => ({ body: { project_id: X.app, title: u("T") } })),
  R_("POST", "/api/projects/:id/tasks/bulk", (X) => ({
    url: `/api/projects/${X.app}/tasks/bulk`,
    body: { tasks: [{ title: u("T") }] },
  })),
  R_("GET", "/api/tasks/:id", taskUrl()),
  R_("PATCH", "/api/tasks/:id", async (X) => ({ ...(await taskUrl()(X)), body: { title: u("T") } })),
  R_("POST", "/api/tasks/:id/move", async (X) => ({
    ...(await taskUrl("/move")(X)),
    body: { section_id: X.detail.sections[1].id },
  })),
  R_("POST", "/api/tasks/:id/duplicate", async (X) => ({ ...(await taskUrl("/duplicate")(X)), body: {} })),
  R_("POST", "/api/tasks/:id/move-project", async (X) => {
    const p = await X.project();
    return { ...(await taskUrl("/move-project")(X)), body: { project_id: p.id } };
  }),
  R_("DELETE", "/api/tasks/:id", taskUrl()),
  R_("POST", "/api/tasks/:id/comments", async (X) => ({ ...(await taskUrl("/comments")(X)), body: { body: "x" } })),
  R_("PATCH", "/api/comments/:id", async (X) => ({
    url: `/api/comments/${(await X.comment(await X.task())).id}`,
    body: { body: "y" },
  })),
  R_("DELETE", "/api/comments/:id", async (X) => ({ url: `/api/comments/${(await X.comment(await X.task())).id}` })),
  R_("POST", "/api/tasks/:id/attachments", async (X) => ({
    url: `/api/tasks/${(await X.task()).id}/attachments?name=a.txt`,
    bin: "texte",
  })),
  R_("GET", "/api/attachments/:id", async (X) => ({ url: `/api/attachments/${(await X.att(await X.task())).id}` })),
  R_("GET", "/api/attachments/:id/preview", async (X) => ({
    url: `/api/attachments/${(await X.att(await X.task())).id}/preview`,
  })),
  R_("POST", "/api/comments/:id/attachments", async (X) => ({
    url: `/api/comments/${(await X.comment(await X.task())).id}/attachments?name=a.txt`,
    bin: "texte",
  })),
  R_("DELETE", "/api/attachments/:id", async (X) => ({ url: `/api/attachments/${(await X.att(await X.task())).id}` })),
  R_("POST", "/api/import/analyze", () => ({
    url: "/api/import/analyze?name=plan.txt",
    bin: "Phase 1\n- Tache A\n- Tache B\n",
  })),
  R_("POST", "/api/import/create", () => ({
    body: {
      name: u("Imp"),
      filename: "a.txt",
      sections: ["S"],
      tasks: [
        {
          title: "T",
          description: "",
          section: "S",
          assignee_id: null,
          due_on: null,
          priority: "none",
          completed: false,
          subtasks: [],
        },
      ],
    },
  })),
  R_("GET", "/api/notifications"),
  R_("POST", "/api/notifications/read", () => ({ body: { all: true } })),
  R_("GET", "/api/search", () => ({ url: "/api/search?q=test" })),
  R_("GET", "/api/ai/status"),
  R_("GET", "/api/ai/agents"),
  R_("POST", "/api/tasks/:id/ai/run", async (X) => ({
    ...(await taskUrl("/ai/run")(X)),
    body: { agent_id: "ai_atlas" },
  })),
  R_("POST", "/api/ai/chat", () => ({ body: { messages: [{ role: "user", content: "Bonjour" }] } })),
  R_("GET", "/api/ai/runs"),
  R_("GET", "/api/ai/runs/:id", async (X) => ({ url: `/api/ai/runs/${await X.run()}` })),
  R_("POST", "/api/ai/runs/:id/cancel", async (X) => ({ url: `/api/ai/runs/${await X.run()}/cancel` })),
  R_("GET", "/api/ai/approvals"),
  R_("POST", "/api/ai/approvals/:id", async (X) => ({
    url: `/api/ai/approvals/${await X.approval()}`,
    body: { approve: false },
  })),
  R_("POST", "/api/tasks/:id/ai/subtasks", async (X) => ({ ...(await taskUrl("/ai/subtasks")(X)), body: {} })),
  R_("POST", "/api/tasks/:id/ai/description", async (X) => ({ ...(await taskUrl("/ai/description")(X)), body: {} })),
  R_("POST", "/api/projects/:id/ai/status", (X) => ({ url: `/api/projects/${X.app}/ai/status`, body: {} })),
  R_("POST", "/api/projects/:id/ai/parse", (X) => ({
    url: `/api/projects/${X.app}/ai/parse`,
    body: { text: "Faire X" },
  })),
  R_("GET", "/api/projects/:id/ai/rules", (X) => ({ url: `/api/projects/${X.app}/ai/rules` })),
  R_("POST", "/api/projects/:id/ai/rules", (X) => ({
    url: `/api/projects/${X.app}/ai/rules`,
    body: { name: u("R"), trigger: "task_moved", agent_id: "ai_atlas", instructions: "x" },
  })),
  R_("DELETE", "/api/projects/:id/ai/rules/:ruleId", async (X) => ({
    url: `/api/projects/${X.app}/ai/rules/${(await X.rule()).id}`,
  })),
  R_("GET", "/api/signature"),
  R_("POST", "/api/signature", () => ({ body: { title: "D", steps: [{ actor_id: "u_karim", action: "signature" }] } })),
  R_("GET", "/api/signature/:id", async (X) => ({ url: `/api/signature/${(await X.doc()).id}` })),
  R_("PUT", "/api/signature/:id", async (X) => ({
    url: `/api/signature/${(await X.doc()).id}`,
    body: { title: "E", steps: [{ actor_id: "u_karim", action: "signature" }] },
  })),
  R_("DELETE", "/api/signature/:id", async (X) => ({ url: `/api/signature/${(await X.doc()).id}` })),
  R_("POST", "/api/signature/:id/start", async (X) => ({ url: `/api/signature/${(await X.doc()).id}/start` })),
  R_("POST", "/api/signature/:id/decide", async (X) => ({
    url: `/api/signature/${await X.docForAlice()}/decide`,
    body: { decision: "approve" },
  })),
  R_("GET", "/api/delegations"),
  R_("POST", "/api/delegations", () => ({
    body: { to_user: "u_karim", start_on: "2026-01-01", end_on: "2026-01-02" },
  })),
  R_("DELETE", "/api/delegations/:id", async (X) => ({ url: `/api/delegations/${(await X.delegation()).id}` })),
  R_("GET", "/api/correspondence"),
  R_("POST", "/api/correspondence", () => ({
    body: { direction: "entrant", subject: "S", correspondent: "C", received_on: "2026-03-02" },
  })),
  R_("POST", "/api/correspondence/:id/assign", async (X) => ({
    url: `/api/correspondence/${(await X.mail()).id}/assign`,
    body: { assignee_id: "u_karim" },
  })),
  R_("POST", "/api/correspondence/:id/close", async (X) => ({
    url: `/api/correspondence/${(await X.mail()).id}/close`,
    body: {},
  })),
  R_("GET", "/api/risks"),
  R_("POST", "/api/risks", () => ({ body: { title: "R", probability: 2, impact: 3 } })),
  R_("PATCH", "/api/risks/:id", async (X) => ({ url: `/api/risks/${(await X.risk()).id}`, body: { mitigation: "x" } })),
  R_("GET", "/api/indicators"),
  R_("POST", "/api/indicators", () => ({ body: { name: "I", target: 3 } })),
  R_("PATCH", "/api/indicators/:id", async (X) => ({
    url: `/api/indicators/${(await X.indicator()).id}`,
    body: { result: 1 },
  })),
  R_("GET", "/api/gaps"),
  R_("POST", "/api/gaps/detect", () => ({ body: {} })),
  R_("PATCH", "/api/gaps/:id", async (X) => ({
    url: `/api/gaps/${await X.gap()}`,
    body: { status: "justified", note: "x" },
  })),
  R_("GET", "/api/plan-activities"),
  R_("GET", "/api/plans"),
  R_("POST", "/api/plans", async (X) => ({ body: { unit_id: (await X.unit()).id, year: 2027, title: "Plan" } })),
  R_("GET", "/api/plans/:id", async (X) => ({ url: `/api/plans/${(await X.plan()).id}` })),
  R_("DELETE", "/api/plans/:id", async (X) => ({ url: `/api/plans/${(await X.plan()).id}` })),
  R_("POST", "/api/plans/:id/activities", async (X) => ({
    url: `/api/plans/${(await X.plan()).id}/activities`,
    body: { title: "A" },
  })),
  R_("POST", "/api/plans/:id/submit", async (X) => ({ url: `/api/plans/${(await X.fullPlan()).id}/submit` })),
  R_("POST", "/api/plans/:id/approve", async (X) => ({ url: `/api/plans/${(await X.submittedByKarim()).id}/approve` })),
  R_("POST", "/api/plans/:id/return", async (X) => ({
    url: `/api/plans/${(await X.submittedByKarim()).id}/return`,
    body: { comment: "x" },
  })),
  R_("PATCH", "/api/plan-activities/:id", async (X) => ({
    url: `/api/plan-activities/${(await X.fullPlan()).activities[0].id}`,
    body: { title: "B" },
  })),
  R_("DELETE", "/api/plan-activities/:id", async (X) => ({
    url: `/api/plan-activities/${(await X.fullPlan()).activities[0].id}`,
  })),
  R_("PATCH", "/api/plan-activities/:id/progress", async (X) => ({
    url: `/api/plan-activities/${(await X.approvedPlan()).activities[0].id}/progress`,
    body: { progress: 10 },
  })),
  R_("POST", "/api/plan-activities/:id/revise", async (X) => ({
    url: `/api/plan-activities/${(await X.approvedPlan()).activities[0].id}/revise`,
    body: { changes: { title: "C" }, reason: "x" },
  })),
  R_("GET", "/api/deliverables"),
  R_("POST", "/api/deliverables", (X) => ({
    body: { project_id: X.app, title: "L", responsible_id: "u_karim", validator_id: "u_alice" },
  })),
  R_("GET", "/api/deliverables/:id", async (X) => ({
    url: `/api/deliverables/${(await X.deliverable("u_karim")).id}`,
  })),
  R_("PATCH", "/api/deliverables/:id", async (X) => ({
    url: `/api/deliverables/${(await X.deliverable("u_karim")).id}`,
    body: { title: "M" },
  })),
  R_("DELETE", "/api/deliverables/:id", async (X) => ({
    url: `/api/deliverables/${(await X.deliverable("u_karim")).id}`,
  })),
  R_("POST", "/api/deliverables/:id/start", async (X) => ({
    url: `/api/deliverables/${(await X.deliverable("u_alice", "u_karim")).id}/start`,
  })),
  R_("POST", "/api/deliverables/:id/submit", async (X) => ({
    url: `/api/deliverables/${await X.deliverableAt("en_cours", "u_alice")}/submit`,
  })),
  R_("POST", "/api/deliverables/:id/review", async (X) => ({
    url: `/api/deliverables/${await X.deliverableAt("soumis")}/review`,
  })),
  R_("POST", "/api/deliverables/:id/decide", async (X) => ({
    url: `/api/deliverables/${await X.deliverableAt("en_revue")}/decide`,
    body: { decision: "valide" },
  })),
  R_("POST", "/api/deliverables/:id/paid", async (X) => ({ url: `/api/deliverables/${await X.toPay()}/paid` })),
  R_("GET", "/api/contracts"),
  R_("POST", "/api/contracts", (X) => ({
    body: {
      project_id: X.app,
      consultant_name: "C",
      title: "M",
      start_on: "2026-01-01",
      end_on: "2026-12-31",
      supervisor_id: "u_alice",
    },
  })),
  R_("POST", "/api/contracts/:id/evaluate", async (X) => ({
    url: `/api/contracts/${(await X.contract()).id}/evaluate`,
    body: { evaluation: "Bien", rating: 4 },
  })),
  R_("GET", "/api/pilotage"),
  R_("GET", "/api/referentials"),
  R_("POST", "/api/referentials", () => ({ body: { list: "partner_type", label: u("Type") } })),
  R_("POST", "/api/admin/referentials", () => ({ body: { list: "activity_type", label: u("Type") } })),
  R_("PATCH", "/api/admin/referentials/:id", async (X) => ({
    url: `/api/admin/referentials/${(await X.referential()).id}`,
    body: { plural: "x" },
  })),
  R_("GET", "/api/partners"),
  R_("GET", "/api/partners/reconcile"),
  R_("POST", "/api/partners/reconcile", async (X) => ({
    body: { source: "correspondent", text: "Texte libre", partner_id: (await X.partner()).id },
  })),
  R_("POST", "/api/partners", () => ({ body: { name: u("Partenaire"), type_code: "autre", categories: ["ptf"] } })),
  R_("GET", "/api/partners/:id", async (X) => ({ url: `/api/partners/${(await X.partner()).id}` })),
  R_("PATCH", "/api/partners/:id", async (X) => ({
    url: `/api/partners/${(await X.partner()).id}`,
    body: { description: "Présentation" },
  })),
  R_("DELETE", "/api/partners/:id", async (X) => ({ url: `/api/partners/${(await X.partner()).id}` })),
  R_("POST", "/api/partners/:id/state", async (X) => ({
    url: `/api/partners/${(await X.partner()).id}/state`,
    body: { state: "en_discussion" },
  })),
  R_("POST", "/api/partners/:id/merge", async (X) => ({
    url: `/api/partners/${(await X.partner()).id}/merge`,
    body: { into_id: (await X.partner()).id },
  })),
  R_("POST", "/api/partners/:id/contacts", async (X) => ({
    url: `/api/partners/${(await X.partner()).id}/contacts`,
    body: { name: "Contact" },
  })),
  R_("PATCH", "/api/partner-contacts/:id", async (X) => ({
    url: `/api/partner-contacts/${(await X.partnerContact()).id}`,
    body: { title: "Chargé de programme" },
  })),
  R_("POST", "/api/partners/:id/notes", async (X) => ({
    url: `/api/partners/${(await X.partner()).id}/notes`,
    body: { body: "Échange téléphonique" },
  })),
  R_("GET", "/api/agreements"),
  R_("POST", "/api/agreements", async (X) => ({
    body: { type_code: "protocole_accord", title: "Accord", partner_ids: [(await X.partner()).id] },
  })),
  R_("GET", "/api/agreements/:id", async (X) => ({ url: `/api/agreements/${(await X.agreement()).id}` })),
  R_("PATCH", "/api/agreements/:id", async (X) => ({
    url: `/api/agreements/${(await X.agreement()).id}`,
    body: { content: "Texte revu" },
  })),
  R_("DELETE", "/api/agreements/:id", async (X) => ({ url: `/api/agreements/${(await X.agreement()).id}` })),
  R_("POST", "/api/agreements/:id/sign", async (X) => ({
    url: `/api/agreements/${(await X.agreement()).id}/sign`,
    body: { steps: [{ actor_id: "u_karim", action: "signature" }] },
  })),
  R_("POST", "/api/agreements/:id/activate", async (X) => ({
    url: `/api/agreements/${(await X.agreement()).id}/activate`,
    body: { signed_on: "2026-03-02" },
  })),
  R_("POST", "/api/agreements/:id/amend", async (X) => ({
    url: `/api/agreements/${(await X.agreementInForce()).id}/amend`,
    body: { title: "Avenant", content: "Texte" },
  })),
  R_("POST", "/api/agreements/:id/terminate", async (X) => ({
    url: `/api/agreements/${(await X.agreementInForce()).id}/terminate`,
    body: { reason: "Fin", ended_on: "2026-03-03" },
  })),
  R_("POST", "/api/partners/:id/documents", async (X) => ({
    url: `/api/partners/${(await X.partner()).id}/documents?name=a.txt&nature=autre&other_label=Note`,
    bin: "texte",
  })),
  R_("GET", "/api/partner-documents/:id", async (X) => ({ url: `/api/partner-documents/${(await X.pdoc()).id}` })),
  R_("GET", "/api/partner-documents/:id/preview", async (X) => ({
    url: `/api/partner-documents/${(await X.pdoc()).id}/preview`,
  })),
  R_("DELETE", "/api/partner-documents/:id", async (X) => ({ url: `/api/partner-documents/${(await X.pdoc()).id}` })),
  R_("PATCH", "/api/partner-documents/:id", async (X) => ({
    url: `/api/partner-documents/${(await X.pdoc()).id}`,
    body: { title: "Pièce renommée" },
  })),
  R_("DELETE", "/api/partner-contacts/:id", async (X) => ({
    url: `/api/partner-contacts/${(await X.partnerContact()).id}`,
  })),
  R_("GET", "/api/dossier-documents", (X) => ({ url: `/api/dossier-documents?owner=project&owner_id=${X.app}` })),
  R_("POST", "/api/dossier-documents", (X) => ({
    url: `/api/dossier-documents?owner=project&owner_id=${X.app}&name=a.txt&nature=autre&other_label=Note`,
    bin: "texte",
  })),
  R_("GET", "/api/dossier-documents/:id", async (X) => ({ url: `/api/dossier-documents/${(await X.ddoc()).id}` })),
  R_("GET", "/api/dossier-documents/:id/preview", async (X) => ({
    url: `/api/dossier-documents/${(await X.ddoc()).id}/preview`,
  })),
  R_("PATCH", "/api/dossier-documents/:id", async (X) => ({
    url: `/api/dossier-documents/${(await X.ddoc()).id}`,
    body: { title: "Document renommé" },
  })),
  R_("DELETE", "/api/dossier-documents/:id", async (X) => ({ url: `/api/dossier-documents/${(await X.ddoc()).id}` })),
  R_("GET", "/api/decisions"),
  R_("POST", "/api/decisions", () => ({ body: { title: "D", content: "Texte", decided_on: "2026-03-02" } })),
  R_("GET", "/api/decisions/:id", async (X) => ({ url: `/api/decisions/${(await X.decision()).id}` })),
  R_("PATCH", "/api/decisions/:id/execution", async (X) => ({
    url: `/api/decisions/${(await X.decision()).id}/execution`,
    body: { status: "en_cours" },
  })),
  R_("GET", "/api/activities"),
  R_("POST", "/api/activities", () => ({ body: { kind: "commission", title: "Commission" } })),
  R_("GET", "/api/activities/:id", async (X) => ({ url: `/api/activities/${(await X.activity()).id}` })),
  R_("PATCH", "/api/activities/:id", async (X) => ({
    url: `/api/activities/${(await X.activity()).id}`,
    body: { outcome: "x" },
  })),
  R_("DELETE", "/api/activities/:id", async (X) => ({ url: `/api/activities/${(await X.activity()).id}` })),
  R_("POST", "/api/activities/:id/followups", async (X) => ({
    url: `/api/activities/${(await X.activity()).id}/followups`,
    body: { text: "x" },
  })),
  R_("PATCH", "/api/activity-followups/:id", async (X) => ({
    url: `/api/activity-followups/${await X.followup()}`,
    body: { done: true },
  })),
  R_("GET", "/api/projects/:id/governance", (X) => ({ url: `/api/projects/${X.app}/governance` })),
  R_("PUT", "/api/projects/:id/governance", (X) => ({
    url: `/api/projects/${X.app}/governance`,
    body: { sponsor: "x" },
  })),
  R_("PUT", "/api/projects/:id/team/:userId", (X) => ({
    url: `/api/projects/${X.app}/team/u_karim`,
    body: { function_label: "Chef" },
  })),
  R_("GET", "/api/domains"),
  R_("POST", "/api/domains", () => ({ body: { name: u("Domaine") } })),
  R_("PATCH", "/api/domains/:id", async (X) => ({
    url: `/api/domains/${(await X.domain()).id}`,
    body: { description: "x" },
  })),
  R_("GET", "/api/attributions"),
  R_("POST", "/api/attributions", async (X) => ({
    body: {
      unit_id: (await X.unit()).id,
      mission: "Mission",
      domains: [{ domain_id: (await X.domain()).id, role: "responsable" }],
      relations: [],
    },
  })),
  R_("GET", "/api/attributions/:id", async (X) => ({ url: `/api/attributions/${(await X.sheet()).id}` })),
  R_("PUT", "/api/attributions/:id", async (X) => ({
    url: `/api/attributions/${(await X.sheet()).id}`,
    body: { mission: "Autre", domains: [], relations: [] },
  })),
  R_("DELETE", "/api/attributions/:id", async (X) => ({ url: `/api/attributions/${(await X.sheet()).id}` })),
  R_("POST", "/api/attributions/:id/approve", async (X) => ({
    url: `/api/attributions/${(await X.karimSheet()).id}/approve`,
  })),
  R_("GET", "/api/meetings"),
  R_("POST", "/api/meetings", () => ({
    body: { meeting_type: "Hebdomadaire", meeting_date: "2026-07-13", writer_id: "u_karim" },
  })),
  R_("GET", "/api/meetings/:id", async (X) => ({ url: `/api/meetings/${(await X.filled()).id}` })),
  R_("PATCH", "/api/meetings/:id", async (X) => ({
    url: `/api/meetings/${(await X.meeting()).id}`,
    body: { location: "Salle" },
  })),
  R_("DELETE", "/api/meetings/:id", async (X) => ({ url: `/api/meetings/${(await X.meeting()).id}` })),
  R_("PUT", "/api/meetings/:id/content", async (X) => ({
    url: `/api/meetings/${(await X.meeting()).id}/content`,
    body: { agenda: [], attendees: [] },
  })),
  R_("PUT", "/api/meetings/:id/invitees", async (X) => ({
    url: `/api/meetings/${(await X.meeting()).id}/invitees`,
    body: { invitees: [{ user_id: "u_karim" }] },
  })),
  R_("POST", "/api/meetings/:id/convene", async (X) => ({ url: `/api/meetings/${(await X.upcoming()).id}/convene` })),
  R_("POST", "/api/meetings/:id/respond", async (X) => ({
    url: `/api/meetings/${(await X.convened()).id}/respond`,
    body: { response: "accepted" },
  })),
  R_("POST", "/api/meetings/:id/documents", async (X) => ({
    url: `/api/meetings/${(await X.meeting()).id}/documents?name=a.txt`,
    bin: "texte",
  })),
  R_("GET", "/api/meeting-documents/:id", async (X) => ({ url: `/api/meeting-documents/${await X.mdoc()}` })),
  R_("GET", "/api/meeting-documents/:id/preview", async (X) => ({
    url: `/api/meeting-documents/${await X.mdoc()}/preview`,
  })),
  R_("DELETE", "/api/meeting-documents/:id", async (X) => ({ url: `/api/meeting-documents/${await X.mdoc()}` })),
  R_("POST", "/api/meetings/:id/submit", async (X) => ({ url: `/api/meetings/${(await X.filled()).id}/submit` })),
  R_("POST", "/api/meetings/:id/return", async (X) => ({
    url: `/api/meetings/${(await X.submitted()).id}/return`,
    body: { comment: "À compléter" },
  })),
  R_("POST", "/api/meetings/:id/validate", async (X) => ({
    url: `/api/meetings/${(await X.submitted()).id}/validate`,
  })),
  R_("POST", "/api/meetings/:id/reopen", async (X) => ({ url: `/api/meetings/${(await X.validated()).id}/reopen` })),
  R_("GET", "/api/meetings/:id/report.docx", async (X) => ({
    url: `/api/meetings/${(await X.filled()).id}/report.docx`,
  })),
  R_("GET", "/api/meeting-actions"),
  R_("PATCH", "/api/meeting-actions/:id", async (X) => ({
    url: `/api/meeting-actions/${(await X.filled()).agenda[0].actions[0].id}`,
    body: { status: "en_cours" },
  })),
  R_("GET", "/api/auth/sessions"),
  R_("DELETE", "/api/auth/sessions/:id", () => ({ url: "/api/auth/sessions/inconnue" })),
  R_("POST", "/api/auth/password", () => ({ body: { current: "faux-mot-de-passe", password: GOOD } })),
  R_("POST", "/api/auth/mfa/setup"),
  R_("POST", "/api/auth/mfa/confirm", () => ({ body: { code: "000000" } })),
  R_("POST", "/api/auth/mfa/disable", () => ({ body: { password: "faux-mot-de-passe" } })),
  R_("GET", "/api/org/invitations"),
  R_("POST", "/api/org/invitations", (X) => ({
    body: { email: `${u("n")}@x.test`, name: "N", profile_id: X.prof("Membre") },
  })),
  R_("POST", "/api/org/invitations/:id/resend", async (X) => ({
    url: `/api/org/invitations/${(await X.invite()).invitation_id}/resend`,
  })),
  R_("DELETE", "/api/org/invitations/:id", async (X) => ({
    url: `/api/org/invitations/${(await X.invite()).invitation_id}`,
  })),
  R_("GET", "/api/invitations"),
  R_("POST", "/api/invitations/:id/accept", async (X) => ({
    url: `/api/invitations/${(await X.invite()).invitation_id}/accept`,
  })),
  R_("POST", "/api/invitations/:id/decline", async (X) => ({
    url: `/api/invitations/${(await X.invite()).invitation_id}/decline`,
  })),
  R_("GET", "/api/org/permissions"),
  R_("GET", "/api/org/profiles"),
  R_("POST", "/api/org/profiles", () => ({ body: { name: u("Pr"), base_role: "member", permissions: [] } })),
  R_("PATCH", "/api/org/profiles/:id", async (X) => ({
    url: `/api/org/profiles/${(await X.profile()).id}`,
    body: { name: u("Pr") },
  })),
  R_("DELETE", "/api/org/profiles/:id", async (X) => ({ url: `/api/org/profiles/${(await X.profile()).id}` })),
  R_("PUT", "/api/org/members/:userId/profile", (X) => ({
    url: "/api/org/members/u_karim/profile",
    body: { profile_id: X.prof("Membre") },
  })),
  R_("GET", "/api/org/members/:userId/access", () => ({ url: "/api/org/members/u_karim/access" })),
  R_("PUT", "/api/org/members/:userId/permissions", () => ({
    url: "/api/org/members/u_karim/permissions",
    body: { overrides: { "tasks.create": false } },
  })),
  ...["users", "orgs", "events", "settings", "audit", "audit.csv"].map((p) => R_("GET", `/api/admin/${p}`)),
  R_("PATCH", "/api/admin/settings", () => ({ body: { registration: "invite" } })),
  R_("POST", "/api/admin/users/:id/approve", (X) => ({
    url: "/api/admin/users/u_karim/approve",
    body: { org_id: X.org, profile_id: X.prof("Membre") },
  })),
  R_("POST", "/api/admin/audit/analysis", () => ({ body: {} })),
  R_("GET", "/api/admin/users/:id/journal", () => ({ url: "/api/admin/users/u_karim/journal" })),
  R_("POST", "/api/admin/accounts", (X) => ({
    body: {
      org_id: X.org,
      name: "Compte matrice",
      email: u("matrice") + "@exemple.test",
      profile_id: X.prof("Membre"),
    },
  })),
  ...["reject", "suspend", "reactivate", "revoke-sessions", "reset", "resend-invitation"].map((p) =>
    R_("POST", `/api/admin/users/:id/${p}`, () => ({ url: `/api/admin/users/u_karim/${p}`, body: {} })),
  ),
  R_("PUT", "/api/admin/users/:id/platform-role", () => ({
    url: "/api/admin/users/u_karim/platform-role",
    body: { super_admin: true },
  })),
];

const results: Record<string, Partial<Record<Kind, number>>> = {};
const ok = (s?: number) => s !== undefined && s >= 200 && s < 300;

describe("contrat d'accès de toute l'API", () => {
  beforeAll(async () => {
    for (const kind of ["P1", "P2", "P3", "P4"] as Kind[]) {
      const { ctx, c, inj, X, who } = await boot(kind);
      for (const [m, p, f] of TABLE) {
        const d = await f(X),
          url = d.url ?? p;
        const res =
          d.bin !== undefined
            ? await ctx.app.inject({
                method: m as Any,
                url,
                payload: Buffer.from(d.bin),
                headers: { ...(who ? { cookie: c[who] } : {}), "content-type": "application/octet-stream" },
              })
            : (await inj(who, m, url, m === "GET" ? undefined : (d.body ?? (m === "POST" ? {} : undefined)))).res;
        (results[`${m} ${p}`] ??= {})[kind] = res.statusCode;
      }
      await ctx.app.close();
    }
  }, 300_000);
  afterAll(() => {
    for (const k of Object.keys(results)) delete results[k];
  });

  it("toute route privée déclarée figure dans le contrat", () => {
    const declared = readdirSync(new URL(".", import.meta.url))
      .filter((f) => f.endsWith("-routes.ts"))
      .map((f) => `./${f}`)
      .concat("./app.ts", "./auth/routes.ts")
      .flatMap((f) =>
        [
          ...readFileSync(new URL(f, import.meta.url), "utf8").matchAll(
            /\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*"(\/api[^"]+)"/g,
          ),
        ].map((m) => `${m[1].toUpperCase()} ${m[2]}`),
      );
    const known = new Set(TABLE.map(([m, p]) => `${m} ${p}`));
    expect(declared.filter((r) => !PUBLIC.test(r.split(" ")[1]) && r !== "GET /api/events" && !known.has(r))).toEqual(
      [],
    );
  });
  const offenders = (test: (key: string, r: Partial<Record<Kind, number>>) => boolean) =>
    Object.entries(results)
      .filter(([k, r]) => test(k, r))
      .map(([k, r]) => `${k} ${JSON.stringify(r)}`);

  it("un anonyme est toujours refusé", () => {
    expect(offenders((_k, r) => r.P1 !== 401)).toEqual([]);
  });
  it("un profil sans droit n'écrit rien en dehors de son propre compte", () => {
    expect(offenders((k, r) => !k.startsWith("GET ") && ok(r.P2) && !PERSONAL.test(k) && k !== DEMO_ONLY)).toEqual([]);
  });
  it("un propriétaire externe n'atteint aucun objet de l'organisation A", () => {
    expect(offenders((k, r) => k.includes(":") && ok(r.P3) && k !== "DELETE /api/auth/sessions/:id")).toEqual([]);
  });
  it("le propriétaire légitime accède à toutes ses routes", () => {
    expect(offenders((k, r) => !ok(r.P4) && !OWNER_EXPECTED.test(k))).toEqual([]);
  });
  it("aucune route ne répond par une erreur serveur", () => {
    expect(offenders((_k, r) => Object.values(r).some((s) => (s ?? 0) >= 500))).toEqual([]);
  });
});
