import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Remarques de gravité moyenne de l'analyse module par module (docs/ANALYSE-MODULES.md), lot 11.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("Mes tâches et Mon entité (T-4, T-5, T-9, E-4)", () => {
  let unit: string;
  let sub: string;
  beforeEach(async () => {
    [unit] = await g.units(1);
    sub = (await g.api("u_alice", "POST", "/api/org/units", { name: "Cellule rattachée", parent_id: unit })).body.id;
    // Fiston dirige l'entité et la cellule rattachée ; il est rattaché à la cellule
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_karim'", [sub, g.org]);
  });

  it("T-4 : une tâche d'entité dit de quelle entité ; T-5 : une sous-tâche donne sa tâche parente", async () => {
    const pid = (await g.api("u_karim", "GET", `/api/units/${unit}/board`)).body.project_id;
    const t = (await g.api("u_karim", "POST", "/api/tasks", { project_id: pid, title: "Note", assignee_id: "u_karim" })).body;
    await g.api("u_karim", "POST", "/api/tasks", { project_id: pid, parent_id: t.id, title: "Annexe", assignee_id: "u_karim" });
    const mine = (await g.api("u_karim", "GET", "/api/tasks?assignee=me&subtasks=true")).body as Any[];
    expect(mine.find((x) => x.title === "Note")).toMatchObject({ unit_name: expect.any(String), parent_title: null });
    expect(mine.find((x) => x.title === "Annexe")).toMatchObject({ parent_title: "Note" });
  });

  it("T-9, E-4 : l'entité de rattachement est signalée, même quand la personne la dirige", async () => {
    const mine = (await g.api("u_karim", "GET", "/api/me/units")).body as Any[];
    expect(mine.find((u) => u.id === sub)).toMatchObject({ role: "responsable", home: true });
    expect(mine.find((u) => u.id === unit)).toMatchObject({ home: false });
    expect(mine.filter((u) => u.home)).toHaveLength(1);
  });

  it("E-3 : le chef d'une entité rattachée est présenté comme tel, après le responsable et avant les agents", async () => {
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_ines' WHERE id = $1", [sub]);
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id IN ('u_ines', 'u_hugo')", [
      unit,
      g.org,
    ]);
    const f = (await g.api("u_karim", "GET", `/api/units/${unit}/follow-up`)).body;
    const ids = f.agents.map((a: Any) => a.user_id);
    expect(f.agents.find((a: Any) => a.user_id === "u_ines")).toMatchObject({ leads: "Cellule rattachée" });
    expect(f.agents.find((a: Any) => a.user_id === "u_hugo").leads).toBeNull();
    expect(ids.indexOf("u_karim")).toBe(0);
    expect(ids.indexOf("u_ines")).toBeLessThan(ids.indexOf("u_hugo"));
  });
});

describe("Point focal des partenariats (PA-4, CV-4)", () => {
  it("PA-4 : une relation en discussion ou active a un point focal ; une fiche ancienne qui n'en a pas est signalée", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "Bailleur fictif", type_code: "autre" })).body;
    const r = await g.api("u_alice", "POST", `/api/partners/${p.id}/state`, { state: "actif" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/point focal/);
    await g.api("u_alice", "PATCH", `/api/partners/${p.id}`, { focal_id: "u_karim" });
    expect((await g.api("u_alice", "POST", `/api/partners/${p.id}/state`, { state: "actif" })).status).toBe(200);
    // Le dernier point focal ne se retire pas d'une relation active
    expect((await g.api("u_alice", "PATCH", `/api/partners/${p.id}`, { focal_id: null })).status).toBe(400);
    // Une fiche passée active avant la règle est signalée « sans point focal »
    await g.ctx.db.query("UPDATE partners SET focal_id = NULL WHERE id = $1", [p.id]);
    expect((await g.api("u_alice", "GET", `/api/partners/${p.id}`)).body.no_focal).toBe(true);
  });

  it("CV-4 : un accord ne part pas au parapheur sans point focal", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire fictif", type_code: "autre" })).body;
    const a = (
      await g.api("u_alice", "POST", "/api/agreements", {
        type_code: "protocole_accord",
        title: "Accord sans suivi",
        content: "Les parties conviennent de coopérer.",
        partner_ids: [p.id],
      })
    ).body;
    const steps = [
      { actor_id: "u_karim", action: "visa" },
      { actor_id: "u_alice", action: "signature" },
    ];
    const r = await g.api("u_alice", "POST", `/api/agreements/${a.id}/sign`, { steps });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/point focal/);
    await g.api("u_alice", "PATCH", `/api/agreements/${a.id}`, { focal_id: "u_karim" });
    expect((await g.api("u_alice", "POST", `/api/agreements/${a.id}/sign`, { steps })).status).toBe(200);
  });
});

describe("PT-4 : une activité du plan a une date de début", () => {
  it("le plan ne se soumet pas tant qu'une activité n'a pas de date de début", async () => {
    const [unit] = await g.units(1);
    const p = (await g.api("u_alice", "POST", "/api/plans", { unit_id: unit, year: 2027, title: "Plan 2027" })).body;
    await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, {
      title: "Étude",
      responsible_id: "u_karim",
      target_value: 1,
      end_on: "2027-06-30",
    });
    const a = (await g.api("u_alice", "GET", `/api/plans/${p.id}`)).body.activities[0];
    const r = await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`);
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/début/);
    const fix = await g.api("u_alice", "PATCH", `/api/plan-activities/${a.id}`, { start_on: "2027-01-01" });
    expect(fix.status).toBe(200);
    const ok = await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`);
    expect(ok.body.error).toBeUndefined();
    expect(ok.status).toBe(200);
  });
});

describe("R-4 : une recommandation d'un compte rendu validé s'annule, elle ne se supprime pas", () => {
  it("après réouverture, la retirer du compte rendu est refusé ; la garder passe", async () => {
    const m = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Comité de direction",
        meeting_date: day(-3),
        writer_id: "u_karim",
      })
    ).body;
    const action = { text: "Relancer les provinces", responsible_id: "u_karim", due_on: day(20) };
    await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
      agenda: [{ subject: "Budget", actions: [action] }],
      attendees: [],
    });
    await g.ctx.db.query("UPDATE meetings SET status = 'submitted' WHERE id = $1", [m.id]);
    expect((await g.api("u_alice", "POST", `/api/meetings/${m.id}/validate`)).status).toBe(200);
    expect((await g.api("u_alice", "POST", `/api/meetings/${m.id}/reopen`, { reason: "Relecture" })).status).toBe(200);
    const full = (await g.api("u_alice", "GET", `/api/meetings/${m.id}`)).body;
    const item = full.agenda[0];
    const drop = await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
      agenda: [{ id: item.id, subject: "Budget", actions: [] }],
      attendees: [],
    });
    expect(drop.status).toBe(400);
    expect(drop.body.error).toMatch(/annulez-la/);
    const keep = await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
      agenda: [{ id: item.id, subject: "Budget révisé", actions: [{ ...action, id: item.actions[0].id }] }],
      attendees: [],
    });
    expect(keep.status).toBe(200);
  });
});

describe("C-2 : un courrier se clôt en choisissant le sortant de réponse", () => {
  it("la clôture relie le courrier sortant et reprend sa référence ; un entrant ne sert pas de réponse", async () => {
    const reg = (direction: string, subject: string) =>
      g.api("u_alice", "POST", "/api/correspondence", {
        direction,
        subject,
        correspondent: "Ministère fictif",
        received_on: day(),
      });
    const inMail = (await reg("entrant", "Demande d'avis")).body;
    const other = (await reg("entrant", "Autre demande")).body;
    const out = (await reg("sortant", "Avis de l'Agence")).body;
    const bad = await g.api("u_alice", "POST", `/api/correspondence/${inMail.id}/close`, { reply_id: other.id });
    expect(bad.status).toBe(400);
    const ok = await g.api("u_alice", "POST", `/api/correspondence/${inMail.id}/close`, { reply_id: out.id });
    expect(ok.status).toBe(200);
    expect(ok.body.response_ref).toBe(out.reference);
    const list = (await g.api("u_alice", "GET", "/api/correspondence")).body as Any[];
    expect(list.find((x) => x.id === out.id).reply_to_id).toBe(inMail.id);
    expect(list.find((x) => x.id === inMail.id).response_reference).toBe(out.reference);
  });
});

describe("S-4 : un changement de profil se motive", () => {
  it("sans motif, le profil ne change pas ; le motif est journalisé", async () => {
    const profiles = (await g.api("u_alice", "GET", "/api/org/profiles")).body as Any[];
    const member = profiles.find((p) => p.name === "Membre").id;
    const bare = await g.api("u_alice", "PUT", "/api/org/members/u_hugo/profile", { profile_id: member });
    expect(bare.status).toBe(400);
    expect(bare.body.error).toMatch(/motif/);
    const ok = await g.api("u_alice", "PUT", "/api/org/members/u_hugo/profile", {
      profile_id: member,
      reason: "Nouvelle affectation",
    });
    expect(ok.status).toBe(200);
  });
});

describe("Risques et indicateurs : historique et responsable prévenu (RI-3, RI-6)", () => {
  const notes = async (who: string) => (await g.api(who, "GET", "/api/notifications")).body as Any[];

  it("RI-6 : le responsable d'un risque est prévenu de son attribution et d'un changement de score", async () => {
    const r = (
      await g.api("u_alice", "POST", "/api/risks", { title: "Retard des données", probability: 2, impact: 3, owner_id: "u_karim" })
    ).body;
    expect((await notes("u_karim")).some((n) => n.kind === "risk.assigned")).toBe(true);
    await g.api("u_alice", "PATCH", `/api/risks/${r.id}`, { probability: 4 });
    expect((await notes("u_karim")).some((n) => n.kind === "risk.scored")).toBe(true);
  });

  it("RI-3 : chaque révision garde le score, la date et l'auteur ; chaque mesure d'indicateur sa valeur et sa date", async () => {
    const r = (await g.api("u_alice", "POST", "/api/risks", { title: "Crue", probability: 2, impact: 3 })).body;
    const up = (await g.api("u_alice", "PATCH", `/api/risks/${r.id}`, { probability: 4 })).body;
    expect(up).toMatchObject({ score: 12, previous_score: 6 });
    expect(up.last_reviewed_at).toBeTruthy();
    const h = (await g.api("u_alice", "GET", `/api/risks/${r.id}/history`)).body as Any[];
    expect(h.map((x) => x.score)).toEqual([12, 6]);
    expect(h[0]).toMatchObject({ author_name: expect.any(String), recorded_at: expect.any(String) });

    const i = (await g.api("u_alice", "POST", "/api/indicators", { name: "Schémas adoptés", target: 10 })).body;
    await g.api("u_alice", "PATCH", `/api/indicators/${i.id}`, { result: 2, measured_on: "2026-03-31" });
    const last = (await g.api("u_alice", "PATCH", `/api/indicators/${i.id}`, { result: 5, measured_on: "2026-06-30" })).body;
    expect(last).toMatchObject({ result: 5, previous_result: 2, measured_on: "2026-06-30" });
    const v = (await g.api("u_alice", "GET", `/api/indicators/${i.id}/history`)).body as Any[];
    expect(v.map((x) => [x.result, x.measured_on])).toEqual([
      [5, "2026-06-30"],
      [2, "2026-03-31"],
    ]);
  });
});

describe("PH-4 : le cabinet voit la pile du parapheur de la DG", () => {
  it("le droit de pilotage montre, en lecture, les documents qui attendent la signature de la DG", async () => {
    const doc = (
      await g.api("u_alice", "POST", "/api/signature", {
        title: "Note au ministre",
        body: "Texte de la note",
        steps: [
          { actor_id: "u_karim", action: "visa" },
          { actor_id: "u_alice", action: "signature" },
        ],
      })
    ).body;
    await g.api("u_alice", "POST", `/api/signature/${doc.id}/start`);
    // Le visa donné, le document attend la signature de la DG
    await g.api("u_karim", "POST", `/api/signature/${doc.id}/decide`, { decision: "approve" });
    expect((await g.api("u_hugo", "GET", "/api/signature?box=dg")).status).toBe(403);
    await g.direction("u_hugo");
    const pile = (await g.api("u_hugo", "GET", "/api/signature?box=dg")).body as Any[];
    expect(pile.map((d) => d.id)).toContain(doc.id);
    expect(pile[0].body).toBeUndefined();
  });
});

describe("AD-3 : sans messagerie, l'outil ne promet pas de courriel", () => {
  it("l'état de la messagerie est connu de l'interface", async () => {
    const me = (await g.api("u_karim", "GET", "/api/me")).body;
    expect(me.mail_ready).toBe(!!process.env.SMTP_URL);
  });
});

describe("RH-4 : la liste des agents porte ses indicateurs", () => {
  it("chaque agent a sa tranche d'âge et sa date de départ en retraite, sans exposer sa date de naissance", async () => {
    const r = await g.api("u_alice", "POST", "/api/hr/agents", {
      user_id: "u_hugo",
      last_name: "Fictif",
      first_names: "Agent",
      status: "fonctionnaire",
      birth_date: "1970-05-12",
    });
    expect(r.status).toBe(200);
    const list = (await g.api("u_alice", "GET", "/api/hr/agents")).body as Any[];
    const a = list.find((x) => x.last_name === "Fictif");
    expect(a).toMatchObject({ age_band: "50 à 59 ans", retire_on: "2035-05-12" });
    expect(a.birth_date).toBeUndefined();
  });
});

describe("I-3 : une seule intervention de l'IA à la fois sur une tâche", () => {
  it("un second coéquipier ne démarre pas tant qu'un autre travaille sur la tâche", async () => {
    const p = await g.project();
    const t = (await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Note de synthèse" })).body;
    await g.ctx.db.query(
      `INSERT INTO ai_runs (id, org_id, agent_id, kind, task_id, project_id, requested_by, status, provider)
       VALUES ('run_actif', $1, 'ai_cadence', 'task', $2, $3, 'u_alice', 'running', 'mock')`,
      [g.org, t.id, p],
    );
    const second = await g.ctx.ai.start({ agentId: "ai_atlas", kind: "rule", taskId: t.id, projectId: p });
    expect(second).toBeNull();
  });
});
