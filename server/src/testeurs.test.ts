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
