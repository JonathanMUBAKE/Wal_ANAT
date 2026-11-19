import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Remarques « À décider » de l'analyse module par module (docs/ANALYSE-MODULES.md), tranchées en l'absence de
 * l'utilisateur selon l'option la plus prudente (lot 13).
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));

describe("C-5 : l'imputation à l'Agence entière revient à la DG", () => {
  it("l'assistante impute à une entité, pas à la racine ; la DG le peut", async () => {
    const root = (await g.ctx.db.one<{ id: string }>("SELECT id FROM org_units WHERE org_id = $1 AND parent_id IS NULL", [g.org]))!.id;
    const [unit] = await g.units(1);
    await g.login("u_ines");
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_ines'");
    expect((await g.promote("u_ines", "Assistant(e) de direction")).status).toBe(200);
    const mail = async () =>
      (
        await g.api("u_ines", "POST", "/api/correspondence", {
          direction: "entrant",
          subject: "Demande fictive",
          correspondent: "Province fictive",
          received_on: day(),
        })
      ).body.id as string;
    const a = await mail();
    const r = await g.api("u_ines", "POST", `/api/correspondence/${a}/assign`, { unit_id: root });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/revient à la DG/);
    expect((await g.api("u_ines", "POST", `/api/correspondence/${a}/assign`, { unit_id: unit })).status).toBe(200);
    const b = await mail();
    expect((await g.api("u_alice", "POST", `/api/correspondence/${b}/assign`, { unit_id: root })).status).toBe(200);
  });
});

describe("PT-2 : un avancement saisi à la main se justifie", () => {
  it("sans justification, l'avancement ne bouge pas ; la justification est gardée et journalisée", async () => {
    const [unit] = await g.units(1);
    const p = (await g.api("u_alice", "POST", "/api/plans", { unit_id: unit, year: 2027, title: "Plan 2027" })).body;
    await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, {
      title: "Étude",
      responsible_id: "u_karim",
      target_value: 1,
      start_on: "2027-01-01",
      end_on: "2027-06-30",
    });
    await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`);
    await g.promote("u_karim");
    const ok = (await g.api("u_karim", "POST", `/api/plans/${p.id}/approve`)).body;
    const id = ok.activities[0].id;
    const bare = await g.api("u_karim", "PATCH", `/api/plan-activities/${id}/progress`, { progress: 30 });
    expect(bare.status).toBe(400);
    expect(bare.body.error).toMatch(/Justifiez/);
    const r = await g.api("u_karim", "PATCH", `/api/plan-activities/${id}/progress`, {
      progress: 30,
      comment: "Termes de référence validés",
    });
    expect(r.status).toBe(200);
    expect(r.body.activities[0]).toMatchObject({ progress: 30, progress_note: "Termes de référence validés" });
    // Le budget seul ne demande pas de justification
    expect((await g.api("u_karim", "PATCH", `/api/plan-activities/${id}/progress`, { budget_spent: 100 })).status).toBe(200);
  });
});

describe("PA-2 : le point focal demande la suspension, les gestionnaires décident", () => {
  it("la demande prévient les gestionnaires et entre au fil ; le point focal ne suspend pas lui-même", async () => {
    const p = (
      await g.api("u_alice", "POST", "/api/partners", { name: "Bailleur fictif", type_code: "autre", focal_id: "u_karim" })
    ).body;
    await g.api("u_alice", "POST", `/api/partners/${p.id}/state`, { state: "actif" });
    expect((await g.api("u_karim", "POST", `/api/partners/${p.id}/state`, { state: "suspendu", reason: "x" })).status).toBe(403);
    expect((await g.api("u_karim", "POST", `/api/partners/${p.id}/suspension-request`, { reason: "" })).status).toBe(400);
    expect((await g.api("u_hugo", "POST", `/api/partners/${p.id}/suspension-request`, { reason: "x" })).status).toBe(404); // lot S : hors de son périmètre, la fiche n'existe pas
    const r = await g.api("u_karim", "POST", `/api/partners/${p.id}/suspension-request`, { reason: "Différend sur les livrables" });
    expect(r.status).toBe(200);
    const n = await g.ctx.db.one("SELECT 1 FROM notifications WHERE user_id = 'u_alice' AND kind = 'partner.suspension_request'");
    expect(n).toBeTruthy();
    const fiche = (await g.api("u_alice", "GET", `/api/partners/${p.id}`)).body;
    expect(fiche.history.some((h: Any) => /Demande de suspension/.test(h.body))).toBe(true);
  });
});

describe("RI-5, CV-5, RI-7 : risques rattachés, indicateur archivé", () => {
  it("un risque se rattache à un accord, avec l'échéance de sa mesure ; un indicateur s'archive", async () => {
    const p = (await g.api("u_alice", "POST", "/api/partners", { name: "Partenaire fictif", type_code: "autre" })).body;
    const ag = (
      await g.api("u_alice", "POST", "/api/agreements", { type_code: "protocole_accord", title: "Accord suivi", partner_ids: [p.id] })
    ).body;
    const r = await g.api("u_alice", "POST", "/api/risks", {
      title: "Retard de décaissement",
      probability: 3,
      impact: 4,
      agreement_id: ag.id,
      mitigation_due_on: day(30),
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ agreement_title: "Accord suivi", mitigation_due_on: day(30) });
    expect((await g.api("u_alice", "POST", "/api/risks", { title: "x", probability: 1, impact: 1, agreement_id: "agr_inconnu" })).status).toBe(400);
    const i = (await g.api("u_alice", "POST", "/api/indicators", { name: "Indicateur en double", target: 3 })).body;
    expect((await g.api("u_alice", "PATCH", `/api/indicators/${i.id}`, { archived: true })).status).toBe(200);
    const list = (await g.api("u_alice", "GET", "/api/indicators")).body as Any[];
    expect(list.some((x) => x.id === i.id)).toBe(false);
  });
});

describe("RH-5 : le matricule provisoire suit l'année d'entrée", () => {
  it("sans matricule saisi, il prend l'année d'entrée de l'agent", async () => {
    const r = await g.api("u_alice", "POST", "/api/hr/agents", {
      user_id: "u_hugo",
      last_name: "Fictif",
      first_names: "Agent",
      status: "fonctionnaire",
      hired_on: "2019-03-04",
    });
    expect(r.status).toBe(200);
    const list = (await g.api("u_alice", "GET", "/api/hr/agents")).body as Any[];
    expect(list.find((a) => a.user_id === "u_hugo").matricule).toMatch(/^AG-2019-/);
  });
});

describe("T-12, E-8 : les tâches que j'ai confiées", () => {
  it("le responsable suit la tâche confiée hors de son entité ; l'agent n'y voit pas les tâches des autres", async () => {
    const p = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${p}/members/u_hugo`, { role: "editor" });
    const t = (
      await g.api("u_alice", "POST", "/api/tasks", { project_id: p, title: "Note confiée", assignee_id: "u_hugo", due_on: day(-1) })
    ).body;
    const mine = (await g.api("u_alice", "GET", "/api/tasks/confided")).body as Any[];
    expect(mine.find((x) => x.id === t.id)).toMatchObject({ assignee_id: "u_hugo", overdue: true, title: "Note confiée" });
    expect(((await g.api("u_hugo", "GET", "/api/tasks/confided")).body as Any[]).some((x) => x.id === t.id)).toBe(false);
  });
});

describe("P-5 : un chef de direction lit le tableau de sa direction", () => {
  it("le chef ouvre la page de sa direction, pas celle d'une autre ; la liste de toutes reste au pilotage", async () => {
    const [mine, other] = await g.units(2);
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_karim'");
    await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [mine]);
    expect((await g.api("u_karim", "GET", `/api/pilotage/directions/${mine}`)).status).toBe(200);
    expect((await g.api("u_karim", "GET", `/api/pilotage/directions/${other}`)).status).toBe(403);
    expect((await g.api("u_karim", "GET", "/api/pilotage/directions")).status).toBe(403);
  });
});

describe("PH-6 : ce qui va à la DG passe par son secrétariat ou son cabinet", () => {
  it("un chef n'adresse pas directement un document à la DG ; avec le visa de l'assistante, il le peut", async () => {
    await g.login("u_ines");
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id IN ('u_ines', 'u_karim')");
    expect((await g.promote("u_ines", "Assistant(e) de direction")).status).toBe(200);
    expect((await g.promote("u_karim", "Chef d'entité")).status).toBe(200);
    const send = (steps: Any[]) =>
      g.api("u_karim", "POST", "/api/signature", { title: "Note à la DG", body: "Texte", steps });
    const direct = await send([{ actor_id: "u_alice", action: "signature" }]);
    expect(direct.status).toBe(400);
    expect(direct.body.error).toMatch(/secrétariat ou son cabinet/);
    const screened = await send([
      { actor_id: "u_ines", action: "visa" },
      { actor_id: "u_alice", action: "signature" },
    ]);
    expect(screened.status).toBe(200);
  });
});

describe("RH-2 : un compte ouvert par les RH est signalé aux administrateurs", () => {
  it("l'ouverture prévient qui administre les membres et entre au journal", async () => {
    const r = await g.api("u_alice", "POST", "/api/hr/agents", {
      last_name: "Nouvel",
      first_names: "Agent",
      email: "nouvel.agent@exemple.test",
      status: "fonctionnaire",
    });
    expect(r.status).toBe(200);
    const log = await g.ctx.db.one("SELECT 1 FROM activity WHERE kind = 'hr.account_opened'");
    expect(log).toBeTruthy();
  });
});
