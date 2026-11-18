import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Anomalies relevées par les agents testeurs (DG et cabinet, chefs et agents, RH et administration, partenariats et
 * robustesse) sur l'instance de démonstration, le 18/11/2026. Chaque test rejoue le contournement constaté.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("administration : pas d'élévation de privilèges", () => {
  it("l'administrateur système non membre n'ouvre pas un compte « Propriétaire » dans une institution dirigée", async () => {
    await g.ctx.db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_karim'");
    await g.ctx.db.query("DELETE FROM org_members WHERE user_id = 'u_karim' AND org_id = $1", [g.org]);
    const r = await g.api("u_karim", "POST", "/api/admin/accounts", {
      org_id: g.org,
      name: "Compte fictif",
      email: "compte.fictif@exemple.test",
      profile_id: `prf_owner_${g.org}`,
    });
    expect(r.status).toBe(403);
  });

  it("le lien de réinitialisation d'autrui ne revient jamais à l'administrateur", async () => {
    await g.ctx.db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_karim'");
    const r = await g.api("u_karim", "POST", "/api/admin/users/u_hugo/reset", {});
    expect(r.status).toBe(200);
    expect(r.body.link).toBeUndefined();
  });

  it("personne ne se nomme soi-même chef ; la tête d'une entité dirigée par la DG relève de la DG", async () => {
    const [unit] = await g.units(1);
    await g.direction("u_hugo");
    await g.ctx.db.query(
      "UPDATE org_members SET permission_overrides = permission_overrides || '{\"org.structure\": true}'::jsonb WHERE org_id = $1 AND user_id = 'u_hugo'",
      [g.org],
    );
    // Même la DG, qui gère la structure, ne se nomme pas elle-même
    const self = await g.api("u_alice", "PATCH", `/api/units/${unit}`, { manager_id: "u_alice" });
    expect(self.status).toBe(403);
    expect(self.body.error).toMatch(/soi-même/);
    expect((await g.api("u_alice", "PATCH", `/api/units/${unit}`, { manager_id: "u_karim" })).status).toBe(200);
    const root = (await g.ctx.db.one<{ id: string }>("SELECT id FROM org_units WHERE org_id = $1 AND parent_id IS NULL", [g.org]))!.id;
    expect((await g.api("u_hugo", "PATCH", `/api/units/${root}`, { manager_id: "u_karim" })).status).toBe(403);
  });

  it("la sortie du dernier administrateur système est refusée ; un compte sorti ne se réactive pas", async () => {
    await g.ctx.db.query("UPDATE users SET platform_role = NULL WHERE platform_role = 'super_admin'");
    await g.ctx.db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_hugo'");
    await g.api("u_alice", "POST", "/api/hr/agents", { user_id: "u_hugo", last_name: "Lukusa", status: "fonctionnaire" });
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_hugo'");
    const r = await g.api("u_alice", "POST", "/api/hr/agents/u_hugo/exit", { exit_on: day(), reason: "autre" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/dernier administrateur/);
  });
});

describe("parapheur, arbitrages et décisions", () => {
  it("la pile de la DG ne transmet jamais le fichier", async () => {
    await g.direction("u_hugo");
    const d = (
      await g.api("u_alice", "POST", "/api/signature", {
        title: "Note",
        body: "Texte",
        steps: [
          { actor_id: "u_karim", action: "visa" },
          { actor_id: "u_alice", action: "signature" },
        ],
      })
    ).body;
    await g.ctx.db.query("UPDATE sign_documents SET file_name = 'x.pdf', file_data = 'abc'::bytea WHERE id = $1", [d.id]);
    await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    await g.api("u_karim", "POST", `/api/signature/${d.id}/decide`, { decision: "approve" });
    const pile = (await g.api("u_hugo", "GET", "/api/signature?box=dg")).body as Any[];
    expect(pile.length).toBeGreaterThan(0);
    for (const x of pile) expect(x.file_data).toBeUndefined();
  });

  it("le secrétariat ne tranche pas un arbitrage ; il ne déclare pas exécutée une décision non confirmée", async () => {
    await g.login("u_ines");
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_ines'");
    expect((await g.promote("u_ines", "Assistant(e) de direction")).status).toBe(200);
    const p = await g.project();
    const arb = await g.api("u_alice", "POST", `/api/projects/${p}/arbitrations`, {
      question: "Signer l'avenant ?",
      options: [{ label: "Oui" }, { label: "Non" }],
    });
    expect(arb.status).toBe(200);
    expect((await g.api("u_ines", "POST", `/api/arbitrations/${arb.body.id}/decide`, { option: 0, due_on: day(10) })).status).toBe(403);
    const dec = (
      await g.api("u_ines", "POST", "/api/decisions", {
        title: "Décision du cabinet",
        content: "Texte",
        decided_on: day(),
        owner_id: "u_karim",
        due_on: day(20),
      })
    ).body;
    expect(dec.to_confirm).toBe(true);
    const r = await g.api("u_ines", "PATCH", `/api/decisions/${dec.id}/execution`, { status: "executee", note: "fait" });
    expect(r.status).toBe(409);
  });

  it("un remplacement inscrit par le secrétariat ne prend effet qu'à la confirmation de la DG", async () => {
    await g.login("u_ines");
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_ines'");
    expect((await g.promote("u_ines", "Assistant(e) de direction")).status).toBe(200);
    const first = (
      await g.api("u_alice", "POST", "/api/decisions", { title: "D1", content: "x", decided_on: day(), no_execution: true })
    ).body;
    const second = (
      await g.api("u_ines", "POST", "/api/decisions", {
        title: "D2",
        content: "y",
        decided_on: day(),
        no_execution: true,
        replaces_id: first.id,
      })
    ).body;
    expect((await g.api("u_alice", "GET", `/api/decisions/${first.id}`)).body.status).not.toBe("remplacee");
    expect((await g.api("u_alice", "POST", `/api/decisions/${second.id}/confirm`)).status).toBe(200);
    expect((await g.api("u_alice", "GET", `/api/decisions/${first.id}`)).body.status).toBe("remplacee");
  });
});

describe("tâches confiées : le verrou ne se contourne pas", () => {
  it("le chargé ne se retire pas, ne se réattribue pas, ne supprime pas ; le chef de sous-entité reste chargé", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "admin" });
    const t = (
      await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Note confiée", assignee_id: "u_hugo", due_on: day(5) })
    ).body;
    // Didier administre le projet mais reste le chargé : il ne lève pas le verrou de Bernadette
    expect((await g.api("u_hugo", "PATCH", `/api/tasks/${t.id}`, { assignee_id: null })).status).toBe(403);
    expect((await g.api("u_hugo", "PATCH", `/api/tasks/${t.id}`, { due_on: day(60) })).status).toBe(403);
    expect((await g.api("u_hugo", "PATCH", `/api/tasks/${t.id}`, { recurrence: "weekly" })).status).toBe(403);
    expect((await g.api("u_hugo", "DELETE", `/api/tasks/${t.id}`)).status).toBe(403);
    const done = (await g.api("u_hugo", "PATCH", `/api/tasks/${t.id}`, { completed: true })).body;
    expect(done.completed).toBe(false);
    expect(done.done_declared_at).toBeTruthy();
  });
});

describe("réunions : la présidence est une personne habilitée", () => {
  it("ni une IA ni une personne sans droit de validation ne préside", async () => {
    const make = (chair: string) =>
      g.api("u_alice", "POST", "/api/meetings", { meeting_type: "Réunion de cabinet", meeting_date: day(3), chair_id: chair });
    expect((await make("ai_atlas")).status).toBe(400);
    await g.api("u_alice", "PUT", "/api/org/members/u_hugo/permissions", { overrides: { "meetings.validate": false } });
    expect((await make("u_hugo")).status).toBe(400);
    expect((await make("u_alice")).status).toBe(200);
  });
});

describe("accords : partenaires confidentiels et avenants", () => {
  it("un point focal ne lie pas une fiche confidentielle qu'il ne voit pas", async () => {
    const mine = (await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire suivi", type_code: "autre", focal_id: "u_karim" })).body;
    const secret = (await g.api("u_alice", "POST", "/api/partners", { name: "Fiche secrète", type_code: "autre", confidential: true })).body;
    const r = await g.api("u_karim", "POST", "/api/agreements", {
      type_code: "protocole_accord",
      title: "Accord",
      partner_ids: [mine.id, secret.id],
    });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).not.toMatch(/Fiche secrète/);
  });

  it("une résiliation ne se date pas dans le futur ; l'avenant d'un accord résilié ne prend pas effet", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire fictif", type_code: "autre" })).body;
    const a = (
      await g.api("u_alice", "POST", "/api/agreements", {
        type_code: "protocole_accord",
        title: "Accord",
        content: "Texte",
        partner_ids: [p.id],
        end_on: day(300),
        focal_id: "u_karim",
      })
    ).body;
    await g.api("u_alice", "POST", `/api/agreements/${a.id}/activate`, { signed_on: day() });
    const av = (await g.api("u_alice", "POST", `/api/agreements/${a.id}/amend`, { title: "Prolongation", new_end_on: day(700) })).body;
    expect((await g.api("u_alice", "POST", `/api/agreements/${a.id}/terminate`, { reason: "Fin", ended_on: day(30) })).status).toBe(400);
    expect((await g.api("u_alice", "POST", `/api/agreements/${a.id}/terminate`, { reason: "Fin", ended_on: day() })).status).toBe(200);
    // L'avenant ne prend plus effet : ni parapheur ni entrée en vigueur
    expect((await g.api("u_alice", "POST", `/api/agreements/${av.id}/activate`, { signed_on: day() })).status).toBe(409);
    expect((await g.api("u_alice", "GET", `/api/agreements/${a.id}`)).body.end_on).toBe(day(300));
  });
});

describe("IA : une retouche ne fait pas du décideur la personne visée", () => {
  it("se désigner chargé en retouchant la proposition est refusé", async () => {
    const p = await g.project();
    const t = (await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Note" })).body;
    await g.ctx.db.query(
      `INSERT INTO ai_runs (id, org_id, agent_id, kind, task_id, project_id, requested_by, status, provider)
       VALUES ('run_t', $1, 'ai_cadence', 'task', $2, $3, 'u_karim', 'waiting_approval', 'mock')`,
      [g.org, t.id, p],
    );
    await g.ctx.db.query(
      `INSERT INTO ai_approvals (id, run_id, agent_id, task_id, project_id, tool, input, summary, status, target_ids)
       VALUES ('apr_t', 'run_t', 'ai_cadence', $1, $2, 'create_task', '{"title":"Sous-tâche"}', 'Créer', 'pending', '[]')`,
      [t.id, p],
    );
    const r = await g.api("u_alice", "POST", "/api/ai/approvals/apr_t", { approve: true, edits: { assignee: "u_alice" } });
    expect(r.status).toBe(403);
    expect(r.body.error).toMatch(/vous vise/);
  });
});

describe("livrables et contrats dans le périmètre de chacun", () => {
  it("un chef ne lit, ne crée ni n'évalue rien sur un projet qu'il ne lit pas ; la DG, si", async () => {
    await g.promote("u_karim", "Chef d'entité");
    const p = await g.project();
    const d = await g.api("u_alice", "POST", "/api/deliverables", {
      title: "Rapport d'étape",
      project_id: p,
      responsible_id: "u_hugo",
      validator_id: "u_alice",
    });
    expect(d.status).toBe(200);
    expect(((await g.api("u_karim", "GET", "/api/deliverables")).body as Any[]).some((x) => x.id === d.body.id)).toBe(false);
    expect((await g.api("u_karim", "GET", `/api/deliverables/${d.body.id}`)).status).toBe(404);
    expect(
      (await g.api("u_karim", "POST", "/api/deliverables", { title: "Intrus", project_id: p, responsible_id: "u_karim", validator_id: "u_alice" }))
        .status,
    ).toBe(403);
    const c = (
      await g.api("u_alice", "POST", "/api/contracts", {
        project_id: p,
        consultant_name: "Cabinet fictif",
        title: "Étude",
        start_on: "2026-01-01",
        end_on: "2026-12-31",
        amount: 1000,
        supervisor_id: "u_alice",
      })
    ).body;
    expect((await g.api("u_karim", "POST", `/api/contracts/${c.id}/evaluate`, { evaluation: "x", rating: 1 })).status).toBe(403);
  });
});

describe("risques dans le périmètre de chacun", () => {
  it("un chef ne lit ni ne modifie le risque d'un projet privé qu'il ne lit pas", async () => {
    await g.promote("u_karim", "Chef d'entité");
    const p = await g.project();
    const r = (await g.api("u_alice", "POST", "/api/risks", { title: "Désistement", probability: 2, impact: 3, project_id: p })).body;
    expect(((await g.api("u_karim", "GET", "/api/risks")).body as Any[]).some((x) => x.id === r.id)).toBe(false);
    expect((await g.api("u_karim", "PATCH", `/api/risks/${r.id}`, { probability: 4 })).status).toBe(403);
    expect(((await g.api("u_alice", "GET", "/api/risks")).body as Any[]).some((x) => x.id === r.id)).toBe(true);
  });
});

describe("robustesse des entrées", () => {
  it("une date d'année 0000 ou 0999 est refusée proprement, jamais en erreur interne", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire fictif", type_code: "autre", focal_id: "u_alice" })).body;
    for (const d of ["0000-01-01", "0999-06-01"]) {
      const r = await g.api("u_alice", "POST", `/api/partners/${p.id}/notes`, { body: "Note", happened_on: d });
      expect(r.status).toBe(400);
    }
  });

  it("les erreurs de validation sont en français ; l'API n'est pas mise en cache", async () => {
    const r = await g.api("u_alice", "POST", "/api/risks", { title: "R", probability: 6, impact: 1 });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/Requête invalide : probability/);
    expect(JSON.stringify(r.body.details)).not.toMatch(/Too big|expected number/);
    const me = await g.ctx.app.inject({ method: "GET", url: "/api/auth/config" });
    expect(me.headers["cache-control"]).toBe("no-store");
  });

  it("un export CSV neutralise les formules", async () => {
    const r = await g.api("u_alice", "POST", "/api/export", {
      format: "csv",
      doc: { title: "Export", sections: [{ blocks: [{ kind: "table", head: ["Nom"], rows: [["=HYPERLINK(1)"], ["@SUM(1)"]] }] }] },
    });
    expect(r.status).toBe(200);
    const text = typeof r.body === "string" ? r.body : JSON.stringify(r.body);
    expect(text).toContain("'=HYPERLINK");
    expect(text).toContain("'@SUM");
  });
});

describe("courrier, réunions, indicateurs : saisies cohérentes", () => {
  it("le courrier ne se reçoit pas dans le futur ; il ne se répond pas à lui-même ; un courrier traité ne se relie plus", async () => {
    const reg = (body: Record<string, unknown>) =>
      g.api("u_alice", "POST", "/api/correspondence", { subject: "Objet", correspondent: "X", ...body });
    expect((await reg({ direction: "entrant", received_on: day(30) })).status).toBe(400);
    expect((await reg({ direction: "entrant", received_on: day(), doc_date: day(1) })).status).toBe(400);
    const out = (await reg({ direction: "sortant", received_on: day() })).body;
    expect((await g.api("u_alice", "POST", `/api/correspondence/${out.id}/close`, { reply_id: out.id })).status).toBe(400);
    const inc = (await reg({ direction: "entrant", received_on: day() })).body;
    await g.api("u_alice", "POST", `/api/correspondence/${inc.id}/close`, {});
    const late = await g.api("u_alice", "POST", `/api/correspondence/${inc.id}/close`, { reply_id: out.id });
    expect(late.status).toBe(409);
    const list = (await g.api("u_alice", "GET", "/api/correspondence")).body as Any[];
    expect(list.find((x) => x.id === out.id).reply_to_id).toBeNull();
  });

  it("une réunion ne finit pas avant de commencer ; une mesure ne se date pas dans le futur", async () => {
    const r = await g.api("u_alice", "POST", "/api/meetings", {
      meeting_type: "Réunion",
      meeting_date: day(3),
      start_time: "15:00",
      end_time: "10:00",
    });
    expect(r.status).toBe(400);
    const i = await g.api("u_alice", "POST", "/api/indicators", { name: "Taux", target: 10, result: 3, measured_on: "abcdefghij" });
    expect(i.status).toBe(400);
    expect(((await g.api("u_alice", "GET", "/api/indicators")).body as Any[]).some((x) => x.name === "Taux")).toBe(false);
  });
});

describe("l'IA n'est jamais une intervenante humaine ; comptes et annuaire", () => {
  it("ni circuit, ni délégation, ni imputation, ni responsabilité confiés à une IA", async () => {
    const sig = await g.api("u_alice", "POST", "/api/signature", {
      title: "Note",
      body: "x",
      steps: [{ actor_id: "ai_atlas", action: "visa" }, { actor_id: "u_alice", action: "signature" }],
    });
    expect(sig.status).toBe(400);
    expect(
      (await g.api("u_alice", "POST", "/api/delegations", { to_user: "ai_atlas", start_on: day(1), end_on: day(5), scope: "signature" })).status,
    ).toBe(400);
    expect((await g.api("u_alice", "POST", "/api/risks", { title: "R", probability: 1, impact: 1, owner_id: "ai_atlas" })).status).toBe(400);
    const m = (await g.api("u_alice", "POST", "/api/correspondence", { direction: "entrant", subject: "S", correspondent: "X", received_on: day() })).body;
    expect((await g.api("u_alice", "POST", `/api/correspondence/${m.id}/assign`, { assignee_id: "ai_atlas" })).status).toBe(400);
    expect((await g.api("u_alice", "POST", `/api/correspondence/${m.id}/assign`, {})).status).toBe(400);
  });

  it("un compte suspendu ne se connecte pas, même en démonstration ; l'annuaire tait les préférences d'autrui", async () => {
    await g.ctx.db.query("UPDATE users SET status = 'suspended' WHERE id = 'u_chloe'");
    const r = await g.ctx.app.inject({ method: "POST", url: "/api/auth/login", payload: { user_id: "u_chloe" } });
    expect(r.statusCode).toBe(403);
    const users = (await g.api("u_hugo", "GET", "/api/users")).body as Any[];
    expect(users.find((u) => u.id === "u_alice").notification_prefs).toBeUndefined();
  });
});

describe("périmètres : attributions, dossiers de réunion, sessions", () => {
  it("un chef ne rédige pas la fiche d'une entité qu'il ne dirige pas ; une réunion ne se rattache pas à un projet invisible", async () => {
    const [mine, other] = await g.units(2);
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_karim'");
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [mine]);
    await g.api("u_alice", "PUT", "/api/org/members/u_karim/permissions", { overrides: { "attributions.manage": true, "meetings.manage": true } });
    const sheet = (unit: string) =>
      g.api("u_karim", "POST", "/api/attributions", { unit_id: unit, mission: "Mission", domains: [], relations: [] });
    expect((await sheet(other)).status).toBe(403);
    const secret = await g.project();
    const m = await g.api("u_karim", "POST", "/api/meetings", { meeting_type: "Réunion", meeting_date: day(3), project_id: secret });
    expect(m.status).toBe(400);
    expect(JSON.stringify(m.body)).not.toMatch(/Projet fictif|privé/);
  });

  it("fermer une session qui n'est pas la sienne répond « introuvable »", async () => {
    expect((await g.api("u_hugo", "DELETE", "/api/auth/sessions/ses_inconnue")).status).toBe(404);
  });
});
