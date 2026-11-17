import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Lot P1 (docs/PARCOURS-METIER.md) : le projet est le dossier complet.
 * Contrats et livrables y sont rangés ; les tranches de paiement suivent les livrables validés.
 */
let g: GovCtx;
let prj: string;
beforeEach(async () => {
  g = await boot();
  prj = await g.project();
});
afterEach(() => g.ctx.app.close());

const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const contract = (patch: Record<string, unknown> = {}) =>
  g.api("u_alice", "POST", "/api/contracts", {
    project_id: prj,
    user_id: "u_hugo",
    title: "Diagnostic foncier",
    terms: "Contexte, objectifs, tâches et livrables.",
    start_on: day(-10),
    end_on: day(80),
    amount: 10000,
    supervisor_id: "u_karim",
    ...patch,
  });
const deliverable = (patch: Record<string, unknown> = {}) =>
  g.api("u_alice", "POST", "/api/deliverables", {
    project_id: prj,
    title: "Rapport de démarrage",
    responsible_id: "u_hugo",
    validator_id: "u_karim",
    ...patch,
  });
const validate = async (id: string) => {
  await g.api("u_hugo", "POST", `/api/deliverables/${id}/start`);
  await g.api("u_hugo", "POST", `/api/deliverables/${id}/submit`);
  await g.api("u_karim", "POST", `/api/deliverables/${id}/review`);
  return g.api("u_karim", "POST", `/api/deliverables/${id}/decide`, { decision: "valide" });
};

describe("le projet est le domicile des contrats et des livrables", () => {
  it("refuse un contrat ou un livrable sans projet", async () => {
    const c = await contract({ project_id: undefined });
    expect(c.status).toBe(400);
    expect(c.body.error).toMatch(/projet/);
    expect((await deliverable({ project_id: undefined })).status).toBe(400);
    expect((await contract({ project_id: "prj_inconnu" })).status).toBe(400);
  });

  it("refuse un projet d'une autre organisation", async () => {
    const o = await g.foreignOrg();
    const foreign = (await g.api(o.who, "POST", "/api/projects", { name: "Projet B" })).body.id;
    expect((await contract({ project_id: foreign })).status).toBe(400);
    expect((await deliverable({ project_id: foreign })).status).toBe(400);
  });

  it("un livrable contractuel appartient au même projet que son contrat", async () => {
    const c = (await contract()).body;
    expect(c.project_id).toBe(prj);
    const other = await g.project();
    const r = await deliverable({ project_id: other, contract_id: c.id });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/même projet/);
    expect((await deliverable({ contract_id: c.id })).status).toBe(200);
  });

  it("liste les contrats et les livrables d'un projet", async () => {
    const c = (await contract()).body;
    await deliverable({ contract_id: c.id });
    const other = await g.project();
    await deliverable({ project_id: other, title: "Ailleurs" });
    const list = (await g.api("u_alice", "GET", `/api/deliverables?project_id=${prj}`)).body as { title: string }[];
    expect(list.map((d) => d.title)).toEqual(["Rapport de démarrage"]);
    const cs = (await g.api("u_alice", "GET", `/api/contracts?project_id=${prj}`)).body as { id: string }[];
    expect(cs.map((x) => x.id)).toEqual([c.id]);
  });
});

describe("l'échéancier de paiement suit les livrables", () => {
  it("une tranche exige un contrat, et le total des tranches d'un contrat ne dépasse pas 100 %", async () => {
    expect((await deliverable({ payment_percent: 30 })).status).toBe(400);
    const c = (await contract()).body;
    expect((await deliverable({ contract_id: c.id, payment_percent: 60 })).status).toBe(200);
    const over = await deliverable({ contract_id: c.id, payment_percent: 50, title: "Rapport final" });
    expect(over.status).toBe(400);
    expect(over.body.error).toMatch(/100/);
    expect((await deliverable({ contract_id: c.id, payment_percent: 40, title: "Rapport final" })).status).toBe(200);
  });

  it("validé, le livrable rend sa tranche « à payer » avec son montant ; le paiement se constate une fois", async () => {
    const c = (await contract()).body;
    const d = (await deliverable({ contract_id: c.id, payment_percent: 30 })).body;
    const v = await validate(d.id);
    expect(v.body).toMatchObject({ status: "valide", to_pay: true, amount_due: 3000, currency: "USD" });
    // La fiche nomme les personnes et le contrat : elle se lit sans détour
    expect(v.body).toMatchObject({ contract_title: "Diagnostic foncier", responsible_name: expect.any(String) });
    expect(v.body.validator_name).toBeTruthy();
    const before = (await g.api("u_alice", "GET", `/api/contracts?project_id=${prj}`)).body[0];
    expect(before).toMatchObject({ to_pay_amount: 3000, paid_amount: 0, scheduled_percent: 30 });
    expect((await g.api("u_alice", "POST", `/api/deliverables/${d.id}/paid`)).status).toBe(200);
    expect((await g.api("u_alice", "POST", `/api/deliverables/${d.id}/paid`)).status).toBe(409);
    const after = (await g.api("u_alice", "GET", `/api/contracts?project_id=${prj}`)).body[0];
    expect(after).toMatchObject({ to_pay_amount: 0, paid_amount: 3000 });
  });
});

describe("les membres du dossier voient ses pièces", () => {
  it("un membre du projet sans droit général lit les livrables et contrats du projet, rien d'autre", async () => {
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_hugo'"); // un chef garde un profil de chef (A-3)
    await g.promote("u_hugo", "Lecture seule");
    const c = (await contract({ user_id: null, consultant_name: "Cabinet Géo" })).body;
    const d = (await deliverable({ responsible_id: "u_karim", validator_id: "u_alice", contract_id: c.id })).body;
    const outside = await g.project();
    const hidden = (await deliverable({ project_id: outside, responsible_id: "u_karim", validator_id: "u_alice" }))
      .body;
    expect((await g.api("u_hugo", "GET", `/api/deliverables/${d.id}`)).status).toBe(404);
    await g.api("u_alice", "PUT", `/api/projects/${prj}/members/u_hugo`, { role: "viewer" });
    expect((await g.api("u_hugo", "GET", `/api/deliverables/${d.id}`)).status).toBe(200);
    const list = (await g.api("u_hugo", "GET", `/api/deliverables?project_id=${prj}`)).body as { id: string }[];
    expect(list.map((x) => x.id)).toEqual([d.id]);
    expect((await g.api("u_hugo", "GET", `/api/contracts?project_id=${prj}`)).body).toHaveLength(1);
    expect((await g.api("u_hugo", "GET", `/api/deliverables/${hidden.id}`)).status).toBe(404);
    expect((await g.api("u_hugo", "GET", `/api/deliverables?project_id=${outside}`)).status).toBe(403);
  });

  it("un projet qui porte des pièces contractuelles ne se supprime pas, il s'archive", async () => {
    const name = (await g.api("u_alice", "GET", `/api/projects/${prj}`)).body.name;
    await contract();
    const r = await g.api("u_alice", "DELETE", `/api/projects/${prj}`, { confirm: name });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/archiv/);
  });
});
