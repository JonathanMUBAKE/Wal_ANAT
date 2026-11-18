import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Thème 3 de l'analyse (docs/ANALYSE-MODULES.md) : journal et traçabilité. Toute modification de la structure, des
 * rattachements et des équipes est journalisée ; la consultation d'un dossier d'agent par un tiers aussi ; un circuit
 * de signature rejeté puis relancé garde l'historique de ses visas.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
  // Le jeu de départ journalise sa propre mise en place : chaque test ne lit que ce qu'il produit
  await g.ctx.db.query("DELETE FROM activity");
});
afterEach(() => g.ctx.app.close());

type Any = any;
const log = async (prefix: string) =>
  g.ctx.db.query<{ kind: string; actor_id: string; data: Any }>(
    "SELECT kind, actor_id, data FROM activity WHERE kind LIKE $1 ORDER BY created_at",
    [`${prefix}%`],
  );
const root = async () => (await g.api("u_alice", "GET", "/api/org/units")).body[0].id as string;
const unit = async (name: string, parent_id?: string) =>
  (await g.api("u_alice", "POST", "/api/org/units", { name, parent_id: parent_id ?? (await root()) })).body
    .id as string;

describe("structure et rattachements journalisés (S-1)", () => {
  it("renommer, déplacer, changer le chef ou le type d'une entité laisse une trace lisible", async () => {
    const a = await unit("Direction A");
    const b = await unit("Direction B");
    const s = await unit("Service essai", a);
    await g.api("u_alice", "PATCH", `/api/units/${s}`, { name: "Service des études" });
    await g.api("u_alice", "PATCH", `/api/units/${s}`, { parent_id: b });
    await g.api("u_alice", "PATCH", `/api/units/${s}`, { manager_id: "u_karim" });
    // Rien ne change : rien n'est journalisé
    await g.api("u_alice", "PATCH", `/api/units/${s}`, { name: "Service des études", manager_id: "u_karim" });
    const rows = (await log("unit.")).filter((r) => r.kind !== "unit.created");
    expect(rows.map((r) => r.kind)).toEqual(["unit.renamed", "unit.moved", "unit.manager"]);
    expect(rows[0].data).toMatchObject({ from: "Service essai", to: "Service des études" });
    expect(rows[1].data).toMatchObject({ name: "Service des études", from: "Direction A", to: "Direction B" });
    expect(rows[2].data).toMatchObject({ name: "Service des études", to: "Fiston Banza", user: "u_karim" });
    const audit = await g.api("u_alice", "GET", "/api/admin/audit?category=Organisation");
    if (audit.status === 200) expect(audit.body.entries.some((e: Any) => e.label === "Chef d'entité changé")).toBe(true);
  });

  it("changer l'entité d'une personne est journalisé, d'où que vienne le changement", async () => {
    const a = await unit("Direction A");
    const r = await g.api("u_alice", "PUT", "/api/org/members/u_hugo/unit", { unit_id: a });
    expect(r.status).toBe(200);
    const [row] = await log("unit.member");
    expect(row.data).toMatchObject({ user: "u_hugo", to: "Direction A" });
  });
});

describe("une seule règle pour le rattachement (S-2)", () => {
  it("changer l'entité depuis Structure ouvre aussi une affectation datée dans le dossier RH", async () => {
    const a = await unit("Direction A");
    const b = await unit("Direction B");
    const created = await g.api("u_alice", "POST", "/api/hr/agents", {
      user_id: "u_hugo",
      civility: "M.",
      last_name: "Lukusa",
      first_names: "Didier",
      status: "fonctionnaire",
      function_title: "Chargé de communication",
      unit_id: a,
      hired_on: "2020-01-06",
    });
    expect(created.status).toBe(200);
    await g.api("u_alice", "PUT", "/api/org/members/u_hugo/unit", { unit_id: b });
    const dossier = (await g.api("u_alice", "GET", "/api/hr/agents/u_hugo")).body;
    expect(dossier.unit_id).toBe(b);
    const open = dossier.assignments.filter((x: Any) => !x.ended_on);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ unit_id: b, function_title: "Chargé de communication" });
    expect(dossier.assignments.some((x: Any) => x.unit_id === a && x.ended_on)).toBe(true);
  });
});

describe("équipes journalisées (EQ-3)", () => {
  it("création, ajout, changement de rôle, retrait et adhésion laissent une trace", async () => {
    const t = (await g.api("u_alice", "POST", "/api/teams", { name: "Comité de rédaction", visibility: "public" })).body;
    await g.api("u_alice", "PUT", `/api/teams/${t.id}/members/u_hugo`, { role: "member" });
    await g.api("u_alice", "PUT", `/api/teams/${t.id}/members/u_hugo`, { role: "lead" });
    await g.api("u_alice", "PUT", `/api/teams/${t.id}/members/u_hugo`, { role: null });
    await g.api("u_karim", "POST", `/api/teams/${t.id}/join`);
    const rows = await log("team.");
    expect(rows.map((r) => r.kind)).toEqual([
      "team.created",
      "team.member.added",
      "team.member.role",
      "team.member.removed",
      "team.joined",
    ]);
    expect(rows[1].data).toMatchObject({ team: "Comité de rédaction", user: "u_hugo", role: "member" });
    expect(rows[2].data).toMatchObject({ from: "member", to: "lead" });
  });
});

describe("consultation d'un dossier d'agent par un tiers (D-3)", () => {
  it("est journalisée une fois par lecteur et par demi-heure ; lire son propre dossier ne l'est pas", async () => {
    await g.api("u_alice", "POST", "/api/hr/agents", {
      user_id: "u_hugo",
      civility: "M.",
      last_name: "Lukusa",
      first_names: "Didier",
      status: "fonctionnaire",
      hired_on: "2020-01-06",
    });
    expect((await g.api("u_hugo", "GET", "/api/hr/me")).status).toBe(200);
    expect(await log("hr.agent.viewed")).toHaveLength(0);
    await g.api("u_alice", "GET", "/api/hr/agents/u_hugo");
    await g.api("u_alice", "GET", "/api/hr/agents/u_hugo");
    const rows = await log("hr.agent.viewed");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actor_id: "u_alice", data: { user_id: "u_hugo" } });
  });
});

describe("historique des circuits de signature (PH-5)", () => {
  it("un circuit rejeté puis relancé garde ses visas et son motif sur la fiche", async () => {
    const d = (
      await g.api("u_alice", "POST", "/api/signature", {
        title: "Note au ministère",
        body: "Texte",
        steps: [
          { actor_id: "u_karim", action: "visa" },
          { actor_id: "u_hugo", action: "signature" },
        ],
      })
    ).body;
    await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    await g.api("u_karim", "POST", `/api/signature/${d.id}/decide`, { decision: "approve" });
    await g.api("u_hugo", "POST", `/api/signature/${d.id}/decide`, { decision: "reject", comment: "Chiffres à revoir" });
    const again = await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    expect(again.body.status).toBe("in_circuit");
    expect(again.body.steps.every((s: Any) => s.status !== "approved")).toBe(true);
    expect(again.body.history).toHaveLength(1);
    const [round] = again.body.history;
    expect(round.round).toBe(1);
    expect(round.steps.map((s: Any) => [s.action, s.status, s.acted_by])).toEqual([
      ["visa", "approved", "u_karim"],
      ["signature", "rejected", "u_hugo"],
    ]);
    expect(round.steps[1].comment).toBe("Chiffres à revoir");
  });
});
