import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Decisions } from "./decisions.js";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Registre des décisions de la DG (docs/SCENARIOS.md § 9) : une décision est numérotée, figée,
 * rattachée à son dossier, confiée à une personne et suivie jusqu'à son exécution.
 */
let g: GovCtx;
let project: string;
beforeEach(async () => {
  g = await boot();
  project = (await g.ctx.db.one<{ id: string }>("SELECT id FROM projects WHERE name LIKE '%Application mobile%'"))!.id;
  await g.ctx.db.query("UPDATE projects SET decision_needed = 'Choisir le prestataire' WHERE id = $1", [project]);
});
afterEach(() => g.ctx.app.close());

const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const year = () => day().slice(0, 4);
type Note = { kind: string };
const notes = async (who: string) => (await g.api(who, "GET", "/api/notifications")).body as Note[];
const decide = (body: Record<string, unknown>, who = "u_alice") =>
  g.api(who, "POST", "/api/decisions", {
    title: "Choix du prestataire",
    content: "Le cabinet Géo est retenu.",
    decided_on: day(),
    ...body,
  });

describe("registre des décisions : enregistrer", () => {
  it("numérote chaque année, lève la décision attendue du dossier et prévient le chargé d'exécution", async () => {
    const a = await decide({ project_id: project, owner_id: "u_karim", due_on: day(30) });
    expect(a.status).toBe(200);
    expect(a.body.reference).toBe(`DEC/${year()}/0001`);
    expect(a.body.status).toBe("a_executer");
    expect(a.body.source).toMatchObject({ kind: "project", id: project });
    expect((await decide({})).body.reference).toBe(`DEC/${year()}/0002`);
    const p = await g.ctx.db.one<{ decision_needed: string }>("SELECT decision_needed FROM projects WHERE id = $1", [
      project,
    ]);
    expect(p?.decision_needed).toBe("");
    expect((await notes("u_karim")).some((n) => n.kind === "decision.assigned")).toBe(true);
  });

  it("lève aussi la décision attendue d'une activité", async () => {
    const act = (
      await g.api("u_alice", "POST", "/api/activities", {
        kind: "commission",
        title: "Commission nationale",
        decision_needed: "Désigner le représentant",
      })
    ).body;
    const d = await decide({ activity_id: act.id });
    expect(d.body.source).toMatchObject({ kind: "activity", id: act.id });
    expect((await g.api("u_alice", "GET", `/api/activities/${act.id}`)).body.decision_needed).toBe("");
  });

  it("est réservé au profil autorisé ; un simple membre est refusé", async () => {
    const r = await decide({}, "u_karim");
    expect(r.status).toBe(403);
    // Le membre consulte le registre, sans pouvoir y écrire
    expect((await g.api("u_karim", "GET", "/api/decisions")).status).toBe(200);
  });

  it("n'est jamais enregistrée par un coéquipier IA", async () => {
    const svc = new Decisions(g.ctx.svc);
    await expect(
      svc.record("ai_atlas", g.org, { title: "Décision", content: "Texte", decided_on: day() }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("refuse une date future, une échéance antérieure, un dossier inconnu, un chargé d'exécution IA ou extérieur", async () => {
    expect((await decide({ decided_on: day(3) })).body.error).toMatch(/futur/);
    expect((await decide({ decided_on: day(-2), due_on: day(-5) })).body.error).toMatch(/échéance/);
    expect((await decide({ project_id: "prj_inconnu" })).status).toBe(400);
    expect((await decide({ project_id: project, activity_id: "act_x" })).body.error).toMatch(/un seul dossier/);
    expect((await decide({ owner_id: "ai_atlas" })).status).toBe(400);
    await g.foreignOrg();
    expect((await decide({ owner_id: "u_hugo" })).status).toBe(400);
  });
});

describe("registre des décisions : une décision est figée, seule l'exécution avance", () => {
  it("n'offre aucune modification du texte", async () => {
    const d = (await decide({ owner_id: "u_karim" })).body;
    const r = await g.api("u_alice", "PATCH", `/api/decisions/${d.id}`, { content: "Autre texte" });
    expect(r.status).toBe(404);
    expect((await g.api("u_alice", "GET", `/api/decisions/${d.id}`)).body.content).toBe("Le cabinet Géo est retenu.");
  });

  it("le chargé d'exécution la fait avancer ; une autre personne ne le peut pas ; exécutée, elle est close", async () => {
    const d = (await decide({ owner_id: "u_karim", due_on: day(10) })).body;
    const url = `/api/decisions/${d.id}/execution`;
    expect((await g.api("u_hugo", "PATCH", url, { status: "en_cours" })).status).toBe(403);
    expect((await g.api("u_karim", "PATCH", url, { status: "en_cours" })).body.status).toBe("en_cours");
    const done = await g.api("u_karim", "PATCH", url, { status: "executee", note: "Contrat signé" });
    expect(done.body.status).toBe("executee");
    expect(done.body.executed_at).toBeTruthy();
    expect(done.body.execution_note).toBe("Contrat signé");
    expect((await notes("u_alice")).some((n) => n.kind === "decision.executed")).toBe(true);
    expect((await g.api("u_alice", "PATCH", url, { status: "en_cours" })).status).toBe(409);
    const events = await g.ctx.db.query<{ kind: string }>(
      "SELECT kind FROM activity WHERE kind LIKE 'decision.%' ORDER BY created_at",
    );
    expect(events.map((e) => e.kind)).toEqual(["decision.recorded", "decision.execution", "decision.execution"]);
  });

  it("se corrige par une nouvelle décision qui la remplace", async () => {
    const old = (await decide({ owner_id: "u_karim" })).body;
    const fix = await decide({ content: "Le cabinet Terra est retenu.", replaces_id: old.id });
    expect(fix.status).toBe(200);
    expect(fix.body.replaces_reference).toBe(old.reference);
    const before = (await g.api("u_alice", "GET", `/api/decisions/${old.id}`)).body;
    expect(before.status).toBe("remplacee");
    expect(before.replaced_by_reference).toBe(fix.body.reference);
    expect((await g.api("u_karim", "PATCH", `/api/decisions/${old.id}/execution`, { status: "en_cours" })).status).toBe(
      409,
    );
    expect((await decide({ replaces_id: old.id })).status).toBe(409);
  });
});

describe("registre des décisions : confidentialité et tableau de bord", () => {
  it("une décision sur un dossier confidentiel n'est visible que du secrétariat, du chargé et de l'auteur", async () => {
    const act = (
      await g.api("u_alice", "POST", "/api/activities", {
        kind: "rendez_vous",
        title: "Audience du ministre",
        confidential: true,
      })
    ).body;
    const d = (await decide({ activity_id: act.id, owner_id: "u_karim" })).body;
    expect(d.confidential).toBe(true);
    expect((await g.api("u_hugo", "GET", "/api/decisions")).body.some((x: { id: string }) => x.id === d.id)).toBe(
      false,
    );
    expect((await g.api("u_hugo", "GET", `/api/decisions/${d.id}`)).status).toBe(404);
    expect((await g.api("u_karim", "GET", `/api/decisions/${d.id}`)).status).toBe(200);
  });

  it("une décision non exécutée à son échéance compte dans les retards ; les dernières décisions remontent", async () => {
    const d = (await decide({ project_id: project, decided_on: day(-10), due_on: day(-2), owner_id: "u_karim" })).body;
    const o = (await g.api("u_alice", "GET", "/api/pilotage")).body;
    expect(o.counters.retards_detail.decisions).toBe(1);
    expect(o.recent_decisions[0]).toMatchObject({ id: d.id, reference: d.reference, late: true });
    expect(o.items.find((i: { id: string }) => i.id === project).decision_needed).toBe("");
  });
});
