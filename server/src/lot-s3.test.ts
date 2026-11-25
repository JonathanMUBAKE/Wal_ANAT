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

describe("S3.1 : un avenant n'est jamais pris au piège de la résiliation de son accord", () => {
  let n = 0;
  const day = () => new Date().toISOString().slice(0, 10);
  /** Un accord en vigueur, et un de ses avenants envoyé à la signature de la DG. */
  async function avenantAuParapheur() {
    const p = (
      await g.api("u_alice", "POST", "/api/partners", {
        name: `Partenaire S31 ${++n}`,
        type_code: "organisation_internationale",
        categories: ["ptf"],
      })
    ).body;
    const a = (
      await g.api("u_alice", "POST", "/api/agreements", {
        type_code: "protocole_accord",
        title: "Accord S31",
        content: "Les parties conviennent de coopérer.",
        partner_ids: [p.id],
        focal_id: "u_karim",
      })
    ).body;
    const act = await g.api("u_alice", "POST", `/api/agreements/${a.id}/activate`, { signed_on: day() });
    expect(act.body.error ?? act.status).toBe(200);
    const av = (await g.api("u_alice", "POST", `/api/agreements/${a.id}/amend`, { title: "Avenant S31", content: "Prolongation" })).body;
    const s = await g.api("u_alice", "POST", `/api/agreements/${av.id}/sign`, {
      steps: [
        { actor_id: "u_karim", action: "visa" },
        { actor_id: "u_alice", action: "signature" },
      ],
    });
    expect(s.body.error ?? s.status).toBe(200);
    expect(s.body.state).toBe("signature");
    const doc = s.body.sign_document.id as string;
    // Le visa est donné : l'avenant attend désormais la signature de la DG
    expect((await g.api("u_karim", "POST", `/api/signature/${doc}/decide`, { decision: "approve" })).status).toBe(200);
    return { a, av, doc };
  }
  const state = async (id: string) =>
    (await g.ctx.db.one<Any>("SELECT state, sign_document_id FROM agreements WHERE id = $1", [id]))!;

  it("résilier un accord dont un avenant est au signataire : refus motivé, rien ne bouge ; une fois l'avenant rejeté, la résiliation passe", async () => {
    const { a, av, doc } = await avenantAuParapheur();
    const t = await g.api("u_alice", "POST", `/api/agreements/${a.id}/terminate`, { reason: "Fin de coopération", ended_on: day() });
    expect(t.status).toBe(409);
    expect(t.body.error).toMatch(/avenant/i);
    expect(t.body.error).toMatch(/parapheur|signataire|rejet/i);
    expect((await state(a.id)).state).toBe("vigueur");
    expect((await state(av.id)).state).toBe("signature");
    const rej = await g.api("u_alice", "POST", `/api/signature/${doc}/decide`, { decision: "reject", comment: "Plus d'objet" });
    expect(rej.status).toBe(200);
    expect((await state(av.id)).state).toBe("preparation");
    const ok = await g.api("u_alice", "POST", `/api/agreements/${a.id}/terminate`, { reason: "Fin de coopération", ended_on: day() });
    expect(ok.status).toBe(200);
    // L'avenant resté en préparation s'abandonne : il n'est pas une impasse
    expect((await g.api("u_alice", "DELETE", `/api/agreements/${av.id}`)).status).toBe(200);
  });

  it("si le parent n'est plus en vigueur à la signature, l'avenant revient en préparation avec un message, et la signature aboutit sans erreur", async () => {
    const { a, av, doc } = await avenantAuParapheur();
    // Le cas ne doit plus naître de la résiliation ; il reste atteignable par une autre voie (reprise de données)
    await g.ctx.db.query("UPDATE agreements SET state = 'resilie' WHERE id = $1", [a.id]);
    const r = await g.api("u_alice", "POST", `/api/signature/${doc}/decide`, { decision: "approve" });
    expect(r.status).toBe(200);
    const after = await state(av.id);
    expect(after.state).toBe("preparation");
    expect(after.sign_document_id).toBeNull();
    const avis = await g.ctx.db.query<Any>("SELECT * FROM notifications WHERE kind = 'agreement.blocked'");
    expect(avis.length).toBeGreaterThan(0);
    expect(avis[0].body).toMatch(/n.est plus en vigueur/);
    const h = await g.ctx.db.query<Any>("SELECT * FROM partner_history WHERE body LIKE '%sans effet%'");
    expect(h.length).toBeGreaterThan(0);
    // L'avenant se supprime : plus d'impasse
    expect((await g.api("u_alice", "DELETE", `/api/agreements/${av.id}`)).status).toBe(200);
  });
});

describe("S3.3 : un agent n'est enrôlé qu'une fois son dossier validé", () => {
  const body = async (over: Record<string, unknown> = {}) => ({
    last_name: "Fictive",
    first_names: "Awa Marie",
    email: "awa.s33@exemple.test",
    status: "contractuel",
    function_title: "Chargée d'études",
    unit_id: ((await g.api("u_alice", "GET", "/api/org/units")).body as Any[])[1].id,
    hired_on: "2024-01-08",
    ...over,
  });
  const traces = async () => ({
    users: (await g.ctx.db.query<Any>("SELECT id FROM users WHERE lower(email) = 'awa.s33@exemple.test'")).length,
    invitations: (await g.ctx.db.query<Any>("SELECT id FROM org_invitations WHERE lower(email) = 'awa.s33@exemple.test'")).length,
    members: (await g.ctx.db.query<Any>("SELECT user_id FROM org_members")).length,
    records: (await g.ctx.db.query<Any>("SELECT user_id FROM agent_records")).length,
    avis: (await g.ctx.db.query<Any>("SELECT id FROM notifications WHERE kind = 'hr.account_opened'")).length,
    journal: (await g.ctx.db.query<Any>("SELECT id FROM activity WHERE kind = 'hr.account_opened'")).length,
  });

  it("contractuel sans date de fin : 400 et aucun compte, aucune invitation, aucun membre, aucun avis ; avec la date, tout passe", async () => {
    // Un autre administrateur existe : c'est lui que l'ouverture de compte préviendrait
    expect((await g.promote("u_karim")).status).toBe(200);
    const before = await traces();
    const refused = await g.api("u_alice", "POST", "/api/hr/agents", await body());
    expect(refused.status).toBe(400);
    expect(refused.body.error).toMatch(/date de fin/);
    expect(await traces()).toEqual(before);
    const ok = await g.api("u_alice", "POST", "/api/hr/agents", await body({ contract_end_on: "2030-12-31" }));
    expect(ok.status).toBe(200);
    const after = await traces();
    expect(after).toMatchObject({ users: 1, invitations: 1, records: before.records + 1, members: before.members + 1 });
    expect(after.avis).toBeGreaterThan(before.avis);
    expect(after.journal).toBe(before.journal + 1);
  });

  it("un compte existant qui a déjà un dossier : 400 sans rien changer", async () => {
    const first = await g.api("u_alice", "POST", "/api/hr/agents", await body({ user_id: "u_hugo", email: undefined, contract_end_on: "2030-12-31" }));
    expect(first.status).toBe(200);
    const before = await traces();
    const again = await g.api("u_alice", "POST", "/api/hr/agents", await body({ user_id: "u_hugo", email: undefined, contract_end_on: "2030-12-31" }));
    expect(again.status).toBe(400);
    expect(again.body.error).toMatch(/déjà un dossier/);
    expect(await traces()).toEqual(before);
  });

  it("si l'écriture du dossier échoue, l'enrôlement est défait : ni compte ni invitation", async () => {
    // Un matricule déjà pris par une autre personne est refusé avant tout ; on force l'échec au cœur de la transaction
    await g.ctx.db.query(
      "ALTER TABLE agent_records ADD CONSTRAINT s33_echec CHECK (function_title IS DISTINCT FROM 'PANNE')",
    ).catch(() => {});
    const before = await traces();
    const r = await g.api("u_alice", "POST", "/api/hr/agents", await body({ function_title: "PANNE", contract_end_on: "2030-12-31" }));
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(await traces()).toEqual(before);
  });
});

describe("S3.2 : la sortie d'un agent règle ses congés et intérims, et se défait", () => {
  let unit: string;
  const day = (offset = 0) => {
    const d = new Date(Date.now() + offset * 864e5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  beforeEach(async () => {
    [unit] = await g.units(1);
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id IN ('u_hugo', 'u_karim')");
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id IN ('u_hugo', 'u_karim')", [unit, g.org]);
    await g.promote("u_hugo", "Agent");
    await g.promote("u_karim", "Chef d'entité");
    for (const [id, last] of [["u_hugo", "Lukusa"], ["u_karim", "Banza"]] as const)
      expect(
        (await g.api("u_alice", "POST", "/api/hr/agents", { user_id: id, last_name: last, status: "fonctionnaire", function_title: "Chargé", unit_id: unit, hired_on: "2015-01-06" })).status,
      ).toBe(200);
  });
  const leave = async (who: string, over: Record<string, unknown> = {}) => {
    const r = await g.api(who, "POST", "/api/leaves", { kind: "conge_annuel", start_on: day(20), end_on: day(25), ...over });
    expect(r.body.error ?? r.status).toBe(200);
    return r.body.id as string;
  };
  const leaveRow = (id: string) => g.ctx.db.one<Any>("SELECT status, interim_id, decision_note FROM agent_leaves WHERE id = $1", [id]);
  const exit = (who = "u_alice", over: Record<string, unknown> = {}) =>
    g.api(who, "POST", "/api/hr/agents/u_hugo/exit", { exit_on: day(), reason: "demission", ...over });

  it("après la sortie : aucune demande de l'agent n'attend plus chez un chef, ses intérims sont retirés et leurs titulaires prévenus", async () => {
    const own = await leave("u_hugo");
    const approved = await leave("u_hugo", { start_on: day(40), end_on: day(41) });
    expect((await g.api("u_alice", "POST", `/api/leaves/${approved}/decide`, { approve: true })).status).toBe(200);
    const chiefs = await leave("u_karim", { interim_id: "u_hugo" });
    expect((await exit()).status).toBe(200);
    for (const id of [own, approved]) {
      const l = await leaveRow(id);
      expect(l.status).toBe("refuse");
      expect(l.decision_note).toMatch(/sortie|quitte/i);
    }
    const open = await g.ctx.db.query<Any>("SELECT id FROM agent_leaves WHERE user_id = 'u_hugo' AND status IN ('demande', 'approuve')");
    expect(open).toHaveLength(0);
    expect((await leaveRow(chiefs)).interim_id).toBeNull();
    const avis = await g.ctx.db.query<Any>("SELECT * FROM notifications WHERE user_id = 'u_karim' AND kind = 'leave.interim_removed'");
    expect(avis).toHaveLength(1);
    expect(avis[0].body).toMatch(/intérim/i);
  });

  it("une sortie posée par erreur s'annule avec un motif : compte actif, affectation rouverte, deux actes au journal", async () => {
    expect((await exit()).status).toBe(200);
    expect((await g.ctx.db.one<Any>("SELECT status FROM users WHERE id = 'u_hugo'"))!.status).toBe("suspended");
    const url = "/api/hr/agents/u_hugo/exit/cancel";
    expect((await g.api("u_karim", "POST", url, { reason: "Erreur de saisie" })).status).toBe(403);
    expect((await g.api("u_alice", "POST", url, {})).status).toBe(400);
    expect((await g.api("u_alice", "POST", url, { reason: " " })).status).toBe(400);
    const r = await g.api("u_alice", "POST", url, { reason: "Date saisie pour le mauvais agent" });
    expect(r.status).toBe(200);
    expect(r.body.exit_on).toBeNull();
    expect(r.body.assignments.filter((a: Any) => !a.ended_on)).toHaveLength(1);
    expect((await g.ctx.db.one<Any>("SELECT status FROM users WHERE id = 'u_hugo'"))!.status).toBe("active");
    const acts = await g.ctx.db.query<Any>("SELECT kind, data FROM activity WHERE kind IN ('hr.agent.exit', 'hr.agent.exit_cancelled') ORDER BY created_at, id");
    expect(acts.map((a) => a.kind).sort()).toEqual(["hr.agent.exit", "hr.agent.exit_cancelled"]);
    expect(acts.find((a) => a.kind === "hr.agent.exit_cancelled").data.reason).toBe("Date saisie pour le mauvais agent");
    // Rien à annuler : 409 ; et la sortie peut être reposée correctement
    expect((await g.api("u_alice", "POST", url, { reason: "Encore" })).status).toBe(409);
    expect((await exit("u_alice", { exit_on: day(30) })).status).toBe(200);
  });

  it("une sortie future non encore appliquée s'annule aussi, sans toucher au compte", async () => {
    expect((await exit("u_alice", { exit_on: day(30) })).status).toBe(200);
    const r = await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/exit/cancel", { reason: "Départ reporté" });
    expect(r.status).toBe(200);
    expect(r.body.exit_on).toBeNull();
    expect((await g.ctx.db.one<Any>("SELECT status FROM users WHERE id = 'u_hugo'"))!.status).toBe("active");
  });
});
