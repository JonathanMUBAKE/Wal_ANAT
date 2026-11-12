import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Le circuit du courrier d'une institution publique. Le bureau d'ordre enregistre ; la DG annote et impute à une
 * entité (avec une instruction et un délai), éventuellement avec des copies pour information ou pour avis ; le chef
 * de l'entité impute à son tour à un agent de son entité ; l'agent prend en charge, traite et clôture (ou le
 * courrier est classé sans suite, motif à l'appui). Chaque étape s'inscrit au fil des annotations ; chacun voit le
 * courrier qui le concerne, même sans accès au registre.
 */
let g: GovCtx;
let unit: string;
let mail: string;
beforeEach(async () => {
  g = await boot();
  for (const id of ["u_chloe", "u_ines"]) await g.login(id);
  [unit] = await g.units(1);
  await g.ctx.db.query("UPDATE org_units SET manager_id = 'u_karim' WHERE id = $1", [unit]);
  await g.ctx.db.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = 'u_hugo'", [unit, g.org]);
  // Hugo et Chloé : sans accès au registre du courrier
  for (const u of ["u_hugo", "u_chloe", "u_karim"])
    await g.ctx.db.query(
      'UPDATE org_members SET permission_overrides = \'{"correspondence.view": false, "correspondence.manage": false}\' WHERE org_id = $1 AND user_id = $2',
      [g.org, u],
    );
  mail = (
    await g.api("u_alice", "POST", "/api/correspondence", {
      direction: "entrant",
      subject: "Demande d'appui (fictive)",
      correspondent: "Province fictive",
      received_on: localDate(new Date(Date.now() - 7 * 864e5)),
    })
  ).body.id;
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (o = 0) => localDate(new Date(Date.now() + o * 864e5));
const notes = (u: string) => g.ctx.db.query<Any>("SELECT kind, title FROM notifications WHERE user_id = $1", [u]);

describe("circuit du courrier", () => {
  it("la DG impute à l'entité ; son chef impute à un agent de son entité ; l'agent voit son courrier", async () => {
    const r = await g.api("u_alice", "POST", `/api/correspondence/${mail}/assign`, {
      unit_id: unit,
      instruction: "Pour traitement",
      due_on: day(10),
      annotation: "Voir avec la direction technique, urgent.",
    });
    expect(r.status).toBe(200);
    expect((await notes("u_karim")).some((n: Any) => n.kind === "correspondence.unit")).toBe(true);
    // Le chef d'entité voit le courrier de son entité, sans accès au registre
    expect(((await g.api("u_karim", "GET", "/api/correspondence")).body as Any[]).map((m) => m.id)).toContain(mail);
    // Il ne l'impute qu'à un agent de son entité
    expect(
      (await g.api("u_karim", "POST", `/api/correspondence/${mail}/assign`, { assignee_id: "u_ines" })).status,
    ).toBe(400);
    const sub = await g.api("u_karim", "POST", `/api/correspondence/${mail}/assign`, {
      assignee_id: "u_hugo",
      annotation: "Préparer un projet de réponse.",
    });
    expect(sub.status).toBe(200);
    expect((await notes("u_hugo")).some((n: Any) => n.kind === "correspondence.assigned")).toBe(true);
    // Un agent ne réimpute pas
    expect(
      (await g.api("u_hugo", "POST", `/api/correspondence/${mail}/assign`, { assignee_id: "u_karim" })).status,
    ).toBe(403);
    const mine = (await g.api("u_hugo", "GET", "/api/correspondence")).body as Any[];
    expect(mine.map((m) => m.id)).toEqual([mail]);
    // Chloé n'est concernée par rien : elle ne voit rien
    expect((await g.api("u_chloe", "GET", "/api/correspondence")).body).toEqual([]);
  });

  it("le fil des annotations retrace chaque étape ; copies pour information ; prise en charge puis clôture", async () => {
    await g.api("u_alice", "POST", `/api/correspondence/${mail}/assign`, {
      unit_id: unit,
      assignee_id: "u_hugo",
      instruction: "Pour traitement",
      copies: [{ user_id: "u_chloe", purpose: "information" }],
    });
    expect((await notes("u_chloe")).some((n: Any) => n.kind === "correspondence.copy")).toBe(true);
    expect(((await g.api("u_chloe", "GET", "/api/correspondence")).body as Any[]).map((m) => m.id)).toContain(mail);
    expect((await g.api("u_chloe", "POST", `/api/correspondence/${mail}/close`, {})).status).toBe(403);
    expect((await g.api("u_hugo", "POST", `/api/correspondence/${mail}/start`)).body.status).toBe("en_traitement");
    expect(
      (
        await g.api("u_hugo", "POST", `/api/correspondence/${mail}/annotations`, {
          text: "Projet de réponse en relecture.",
        })
      ).status,
    ).toBe(200);
    // Lire le registre ne suffit pas pour annoter : il faut être concerné
    expect(
      (await g.api("u_ines", "POST", `/api/correspondence/${mail}/annotations`, { text: "Intrusion" })).status,
    ).toBe(403);
    const thread = (await g.api("u_chloe", "GET", `/api/correspondence/${mail}/annotations`)).body as Any[];
    expect(thread.map((a) => a.kind)).toEqual(
      expect.arrayContaining(["imputation", "copie", "prise_en_charge", "note"]),
    );
    expect(thread.find((a) => a.kind === "note")).toMatchObject({
      text: "Projet de réponse en relecture.",
      author_name: "Hugo Lefèvre",
    });
    expect(
      (await g.api("u_hugo", "POST", `/api/correspondence/${mail}/close`, { response_ref: "SOR fictive" })).status,
    ).toBe(200);
  });

  it("le classement sans suite est motivé et réservé ; le tableau de bord compte ce qui attend", async () => {
    await g.api("u_alice", "POST", `/api/correspondence/${mail}/assign`, {
      unit_id: unit,
      assignee_id: "u_hugo",
      due_on: day(-1),
    });
    expect((await g.api("u_hugo", "POST", `/api/correspondence/${mail}/file`, { reason: "Sans objet" })).status).toBe(
      403,
    );
    const s = (await g.api("u_alice", "GET", "/api/correspondence/summary")).body;
    expect(s).toMatchObject({
      late: expect.any(Number),
      to_assign: expect.any(Number),
      in_progress: expect.any(Number),
    });
    expect(s.late).toBeGreaterThanOrEqual(1);
    const mineSummary = (await g.api("u_hugo", "GET", "/api/correspondence/summary")).body;
    expect(mineSummary.mine.late).toBe(1);
    expect((await g.api("u_alice", "POST", `/api/correspondence/${mail}/file`, { reason: "" })).status).toBe(400);
    const filed = await g.api("u_alice", "POST", `/api/correspondence/${mail}/file`, {
      reason: "Demande retirée par l'expéditeur",
    });
    expect(filed.status).toBe(200);
    expect(filed.body.status).toBe("classe");
  });
});
