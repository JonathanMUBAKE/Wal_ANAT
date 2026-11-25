import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

let g: GovCtx;
let unit: string;
/** Le projet qui sert de dossier aux livrables et aux missions (docs/PARCOURS-METIER.md, lot P1). */
let prj: string;
beforeEach(async () => {
  g = await boot();
  [unit] = await g.units(1);
  prj = await g.project();
});
afterEach(() => g.ctx.app.close());
const plan = async () =>
  (await g.api("u_alice", "POST", "/api/plans", { unit_id: unit, year: 2027, title: "Plan 2027" })).body;
const full = {
  title: "Étude",
  responsible_id: "u_karim",
  target_value: 3,
  unit_label: "rapports",
  start_on: "2027-01-01",
  end_on: "2027-06-30",
  budget_planned: 1000,
};
const approved = async () => {
  const p = await plan();
  await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, full);
  await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`);
  await g.promote("u_karim");
  return (await g.api("u_karim", "POST", `/api/plans/${p.id}/approve`)).body;
};

describe("plans de travail", () => {
  it("un seul plan par entité et par année", async () => {
    await plan();
    expect((await g.api("u_alice", "POST", "/api/plans", { unit_id: unit, year: 2027, title: "Autre" })).status).toBe(
      409,
    );
  });
  it("un membre consulte mais ne prépare pas", async () => {
    await plan();
    // Le plan de son entité le concerne (lot S)
    await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_karim'", [unit, g.org]);
    expect((await g.api("u_karim", "GET", "/api/plans")).body).toHaveLength(1);
    expect((await g.api("u_karim", "POST", "/api/plans", { unit_id: unit, year: 2028, title: "x" })).status).toBe(403);
  });
  it("refuse la soumission d'un plan vide ou incomplet", async () => {
    const p = await plan();
    expect((await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`)).status).toBe(400);
    await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, { title: "Sans cible" });
    const r = await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`);
    expect(r.status).toBe(400);
    expect(r.body.error).toContain("Sans cible");
  });
  it("celui qui soumet ne peut pas approuver", async () => {
    const p = await plan();
    await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, full);
    await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`);
    expect((await g.api("u_alice", "POST", `/api/plans/${p.id}/approve`)).status).toBe(403);
  });
  it("l'approbation fige le plan et conserve le prévu d'origine", async () => {
    const p = await approved();
    expect(p.status).toBe("approved");
    expect(p.activities[0].baseline.end_on).toBe("2027-06-30");
    expect((await g.api("u_alice", "PATCH", `/api/plan-activities/${p.activities[0].id}`, { title: "x" })).status).toBe(
      409,
    );
    expect((await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, full)).status).toBe(409);
    expect((await g.api("u_alice", "DELETE", `/api/plans/${p.id}`)).status).toBe(409);
  });
  it("une révision garde l'ancien, le nouveau, la raison et l'auteur", async () => {
    const p = await approved();
    const id = p.activities[0].id;
    const r = await g.api("u_alice", "POST", `/api/plan-activities/${id}/revise`, {
      changes: { end_on: "2027-09-30" },
      reason: "Retard du bailleur",
    });
    expect(r.body.activities[0].end_on).toBe("2027-09-30");
    expect(r.body.activities[0].baseline.end_on).toBe("2027-06-30");
    expect(r.body.revisions[0]).toMatchObject({
      field: "end_on",
      new_value: "2027-09-30",
      reason: "Retard du bailleur",
      author_name: "Bernadette Mbuyi",
    });
  });
  it("une révision sans motif est refusée", async () => {
    const p = await approved();
    expect(
      (
        await g.api("u_alice", "POST", `/api/plan-activities/${p.activities[0].id}/revise`, {
          changes: { end_on: "2027-09-30" },
          reason: " ",
        })
      ).status,
    ).toBe(400);
  });
  it("le responsable suit l'avancement après approbation", async () => {
    const p = await approved();
    const r = await g.api("u_karim", "PATCH", `/api/plan-activities/${p.activities[0].id}/progress`, {
      progress: 40,
      actual_value: 1,
      budget_spent: 200,
      comment: "Rapport d'étape remis",
    });
    expect(r.body.activities[0]).toMatchObject({ progress: 40, actual_value: 1, budget_spent: 200 });
  });
  /*
   * Le bouton « Suivi » d'une activité : le serveur accepte la saisie de son responsable, ou de qui prépare le plan
   * (plans.manage sur l'entité, ou plans.manage_all). L'interface ne proposait ce bouton que sur l'état du plan,
   * sans aucun test de droit — constat d'un testeur sous le profil « Responsable informatique ». La fiche du plan
   * porte donc `can.prepare`, que l'interface compose avec le responsable de la ligne.
   */
  it("dit dans la fiche du plan qui peut en préparer le suivi, et le refus suit le drapeau", async () => {
    const p = await approved();
    const activite = p.activities[0].id as string;
    // u_alice prépare le plan de cette entité : le drapeau est ouvert, la saisie passe
    const vueAlice = (await g.api("u_alice", "GET", `/api/plans/${p.id}`)).body;
    expect(vueAlice.can.prepare).toBe(true);
    expect(
      (await g.api("u_alice", "PATCH", `/api/plan-activities/${activite}/progress`, { progress: 10, comment: "Point" }))
        .status,
    ).toBe(200);
    // u_hugo, simple agent, ne prépare rien et n'est responsable d'aucune activité : saisie refusée, et s'il lit
    // le plan, le drapeau le lui dit (selon l'entité, la fiche peut déjà lui être fermée : les deux se valent).
    await g.promote("u_hugo", "Agent");
    const vueHugo = await g.api("u_hugo", "GET", `/api/plans/${p.id}`);
    if (vueHugo.status === 200) expect(vueHugo.body.can.prepare).toBe(false);
    else expect([403, 404]).toContain(vueHugo.status);
    expect(
      (await g.api("u_hugo", "PATCH", `/api/plan-activities/${activite}/progress`, { progress: 20, comment: "Non" }))
        .status,
    ).toBe(403);
    // u_karim est responsable de l'activité : il saisit son avancement sans préparer le plan
    expect(
      (await g.api("u_karim", "PATCH", `/api/plan-activities/${activite}/progress`, { progress: 30, comment: "Fait" }))
        .status,
    ).toBe(200);
  });

  it("un plan retourné repasse en préparation avec le motif", async () => {
    const p = await plan();
    await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, full);
    await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`);
    await g.promote("u_karim");
    const r = await g.api("u_karim", "POST", `/api/plans/${p.id}/return`, { comment: "Cibles à revoir" });
    expect(r.body).toMatchObject({ status: "draft", return_comment: "Cibles à revoir" });
  });
  it("une autre organisation n'y accède pas", async () => {
    const p = await plan();
    const o = await g.foreignOrg();
    expect((await g.api(o.who, "GET", `/api/plans/${p.id}`)).status).toBe(403);
    expect((await g.api(o.who, "POST", `/api/plans/${p.id}/activities`, full)).status).toBe(403);
  });
});

describe("livrables", () => {
  const make = async (patch: Record<string, unknown> = {}) =>
    (
      await g.api("u_alice", "POST", "/api/deliverables", {
        project_id: prj,
        title: "Rapport",
        responsible_id: "u_karim",
        validator_id: "u_alice",
        ...patch,
      })
    ).body;
  it("le responsable et le valideur sont deux personnes distinctes", async () => {
    expect(
      (
        await g.api("u_alice", "POST", "/api/deliverables", {
        project_id: prj,
          title: "x",
          responsible_id: "u_karim",
          validator_id: "u_karim",
        })
      ).status,
    ).toBe(400);
  });
  it("suit le cycle complet jusqu'à la validation", async () => {
    const d = await make();
    expect((await g.api("u_karim", "POST", `/api/deliverables/${d.id}/start`)).body.status).toBe("en_cours");
    expect((await g.api("u_karim", "POST", `/api/deliverables/${d.id}/submit`)).body.status).toBe("soumis");
    expect((await g.api("u_alice", "POST", `/api/deliverables/${d.id}/review`)).body.status).toBe("en_revue");
    const v = await g.api("u_alice", "POST", `/api/deliverables/${d.id}/decide`, { decision: "valide" });
    expect(v.body).toMatchObject({ status: "valide", validated_by: "u_alice" });
    expect(v.body.events).toHaveLength(4);
  });
  it("le responsable ne valide jamais son propre livrable, même administrateur", async () => {
    await g.promote("u_karim");
    const d = await make();
    await g.api("u_karim", "POST", `/api/deliverables/${d.id}/start`);
    await g.api("u_karim", "POST", `/api/deliverables/${d.id}/submit`);
    expect((await g.api("u_karim", "POST", `/api/deliverables/${d.id}/review`)).status).toBe(403);
  });
  it("un retour exige un motif et ouvre une nouvelle version", async () => {
    const d = await make();
    await g.api("u_karim", "POST", `/api/deliverables/${d.id}/start`);
    await g.api("u_karim", "POST", `/api/deliverables/${d.id}/submit`);
    await g.api("u_alice", "POST", `/api/deliverables/${d.id}/review`);
    expect(
      (await g.api("u_alice", "POST", `/api/deliverables/${d.id}/decide`, { decision: "a_corriger" })).status,
    ).toBe(400);
    await g.api("u_alice", "POST", `/api/deliverables/${d.id}/decide`, {
      decision: "a_corriger",
      comment: "Chiffres manquants",
    });
    const again = await g.api("u_karim", "POST", `/api/deliverables/${d.id}/start`);
    expect(again.body).toMatchObject({ status: "en_cours", version: 2, review_comment: "Chiffres manquants" });
  });
  it("un livrable validé est figé", async () => {
    const d = await make();
    await g.api("u_karim", "POST", `/api/deliverables/${d.id}/start`);
    await g.api("u_karim", "POST", `/api/deliverables/${d.id}/submit`);
    await g.api("u_alice", "POST", `/api/deliverables/${d.id}/review`);
    await g.api("u_alice", "POST", `/api/deliverables/${d.id}/decide`, { decision: "valide" });
    expect((await g.api("u_alice", "PATCH", `/api/deliverables/${d.id}`, { title: "x" })).status).toBe(409);
    expect((await g.api("u_alice", "DELETE", `/api/deliverables/${d.id}`)).status).toBe(409);
  });
  it("une personne sans droit de lecture ne voit que ses livrables", async () => {
    await g.ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = 'u_hugo'"); // un chef garde un profil de chef (A-3)
    await g.promote("u_hugo", "Lecture seule");
    const mine = await make({ responsible_id: "u_hugo" });
    const other = await make();
    const list = (await g.api("u_hugo", "GET", "/api/deliverables")).body as { id: string }[];
    expect(list.map((d) => d.id)).toEqual([mine.id]);
    expect((await g.api("u_hugo", "GET", `/api/deliverables/${other.id}`)).status).toBe(404);
  });
});

describe("missions des consultants", () => {
  const contract = (patch: Record<string, unknown> = {}) =>
    g.api("u_alice", "POST", "/api/contracts", {
      project_id: prj,
      user_id: "u_hugo",
      title: "Étude foncière",
      start_on: "2026-01-01",
      end_on: "2026-12-31",
      amount: 5000,
      supervisor_id: "u_karim",
      ...patch,
    });
  it("un livrable de mission validé donne un procès-verbal et un signal à payer", async () => {
    const c = (await contract()).body;
    const d = (
      await g.api("u_alice", "POST", "/api/deliverables", {
        project_id: prj,
        title: "Rapport",
        responsible_id: "u_hugo",
        validator_id: "u_alice",
        contract_id: c.id,
      })
    ).body;
    await g.api("u_hugo", "POST", `/api/deliverables/${d.id}/start`);
    await g.api("u_hugo", "POST", `/api/deliverables/${d.id}/submit`);
    await g.api("u_alice", "POST", `/api/deliverables/${d.id}/review`);
    const v = await g.api("u_alice", "POST", `/api/deliverables/${d.id}/decide`, { decision: "valide" });
    expect(v.body.to_pay).toBe(true);
    expect(v.body.reception_ref).toMatch(/^PV-\d{4}-0001$/);
    const notes = (await g.api("u_karim", "GET", "/api/notifications")).body as { kind: string }[];
    expect(notes.some((n) => n.kind === "deliverable.to_pay")).toBe(true);
  });
  it("refuse une mission dont la fin précède le début", async () => {
    expect((await contract({ start_on: "2026-06-01", end_on: "2026-01-01" })).status).toBe(400);
  });
  it("alerte le superviseur une seule fois avant la fin de mission", async () => {
    await contract({ end_on: "2026-07-10" });
    const d = new (await import("./deliverables.js")).Deliverables(g.ctx.svc);
    expect((await d.sweep("2026-07-01")).warned).toBe(1);
    expect((await d.sweep("2026-07-02")).warned).toBe(0);
    const notes = (await g.api("u_karim", "GET", "/api/notifications")).body as { kind: string }[];
    expect(notes.filter((n) => n.kind === "contract.ending")).toHaveLength(1);
  });
  it("ferme l'accès d'un consultant invité à la fin de la mission", async () => {
    await g.ctx.db.query(
      "UPDATE org_members SET role = 'guest', profile_id = $1 WHERE user_id = 'u_hugo' AND org_id = $2",
      [g.profile("Invité"), g.org],
    );
    await contract({ end_on: "2026-07-10" });
    const d = new (await import("./deliverables.js")).Deliverables(g.ctx.svc);
    expect((await d.sweep("2026-07-11")).ended).toBe(1);
    expect(await g.ctx.svc.orgRole("u_hugo", g.org)).toBeNull();
  });
  it("conserve l'accès d'un agent de l'Agence", async () => {
    await contract({ end_on: "2026-07-10" });
    const d = new (await import("./deliverables.js")).Deliverables(g.ctx.svc);
    await d.sweep("2026-07-11");
    expect(await g.ctx.svc.orgRole("u_hugo", g.org)).not.toBeNull();
  });
});
