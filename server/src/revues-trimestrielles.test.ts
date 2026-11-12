import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Revue trimestrielle du plan de travail. Chaque trimestre, l'entité rend compte de son plan : pour chaque activité,
 * l'avancement constaté et l'avancement attendu à la fin du trimestre sont relevés, l'entité apprécie (atteint, en
 * bonne voie, en retard, compromis), explique les écarts et propose des mesures ; elle rédige une synthèse. La revue
 * est soumise, puis validée ou retournée par la direction générale (jamais par celui qui l'a soumise). Validée, elle
 * est figée : c'est la trace de ce qui a été dit au trimestre.
 */
let g: GovCtx;
let unit: string;
beforeEach(async () => {
  g = await boot();
  [unit] = await g.units(1);
  await g.login("u_chloe");
});
afterEach(() => g.ctx.app.close());

type Any = any;
const act = (title: string, end_on: string) => ({
  title,
  responsible_id: "u_karim",
  target_value: 1,
  unit_label: "rapport",
  start_on: "2027-01-01",
  end_on,
});
const approvedPlan = async () => {
  const p = (await g.api("u_alice", "POST", "/api/plans", { unit_id: unit, year: 2027, title: "Plan 2027" })).body;
  await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, act("Étude de cadrage", "2027-03-31"));
  await g.api("u_alice", "POST", `/api/plans/${p.id}/activities`, act("Schéma directeur", "2027-12-31"));
  await g.api("u_alice", "POST", `/api/plans/${p.id}/submit`);
  await g.promote("u_karim");
  return (await g.api("u_karim", "POST", `/api/plans/${p.id}/approve`)).body;
};
const notes = (user: string) => g.ctx.db.query<Any>("SELECT kind FROM notifications WHERE user_id = $1", [user]);

describe("revue trimestrielle", () => {
  it("relève, pour chaque activité, l'avancement constaté et l'attendu à la fin du trimestre", async () => {
    const p = await approvedPlan();
    await g.api("u_karim", "PATCH", `/api/plan-activities/${p.activities[0].id}/progress`, { progress: 40 });
    const r = await g.api("u_alice", "POST", `/api/plans/${p.id}/reviews`, { quarter: 1 });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ quarter: 1, status: "brouillon", period_end: "2027-03-31" });
    const lines = r.body.lines as Any[];
    expect(lines).toHaveLength(2);
    const cadrage = lines.find((l) => l.title === "Étude de cadrage");
    // Le trimestre n'est pas encore échu : l'attendu se calcule à la date du jour, plafonnée à la fin du trimestre
    expect(cadrage).toMatchObject({ progress: 40, assessment: expect.any(String) });
    expect(cadrage.expected).toBeGreaterThanOrEqual(0);
    // Une seule revue par trimestre ; le plan doit être approuvé
    expect((await g.api("u_alice", "POST", `/api/plans/${p.id}/reviews`, { quarter: 1 })).status).toBe(409);
    expect((await g.api("u_alice", "POST", `/api/plans/${p.id}/reviews`, { quarter: 5 })).status).toBe(400);
    const draft = (await g.api("u_alice", "POST", "/api/plans", { unit_id: unit, year: 2028, title: "Plan 2028" }))
      .body;
    expect((await g.api("u_alice", "POST", `/api/plans/${draft.id}/reviews`, { quarter: 1 })).status).toBe(400);
    // Un agent sans droit sur les plans ne prépare pas de revue
    expect((await g.api("u_chloe", "POST", `/api/plans/${p.id}/reviews`, { quarter: 2 })).status).toBe(403);
    // Le plan liste ses revues
    expect((await g.api("u_alice", "GET", `/api/plans/${p.id}`)).body.reviews).toEqual([
      expect.objectContaining({ quarter: 1, status: "brouillon" }),
    ]);
  });

  it("explique tout écart avant de soumettre ; la direction générale valide ou retourne ; validée, elle est figée", async () => {
    const p = await approvedPlan();
    const rv = (await g.api("u_alice", "POST", `/api/plans/${p.id}/reviews`, { quarter: 1 })).body;
    const [l1, l2] = rv.lines as Any[];
    // Une activité en retard sans cause ni mesure : la revue ne part pas
    await g.api("u_alice", "PATCH", `/api/plan-reviews/${rv.id}`, {
      summary: "Trimestre de lancement",
      lines: [{ activity_id: l1.activity_id, assessment: "en_retard" }],
    });
    const early = await g.api("u_alice", "POST", `/api/plan-reviews/${rv.id}/submit`);
    expect(early.status).toBe(400);
    expect(early.body.error).toMatch(/Étude de cadrage/);
    await g.api("u_alice", "PATCH", `/api/plan-reviews/${rv.id}`, {
      lines: [
        {
          activity_id: l1.activity_id,
          assessment: "en_retard",
          comment: "Données de terrain arrivées tard",
          measure: "Renfort d'un cartographe en avril",
        },
        { activity_id: l2.activity_id, assessment: "en_bonne_voie" },
      ],
      difficulties: "Recrutement",
      measures: "Recruter un cartographe",
    });
    const sub = await g.api("u_alice", "POST", `/api/plan-reviews/${rv.id}/submit`);
    expect(sub.status).toBe(200);
    expect(sub.body.status).toBe("soumise");
    expect((await notes("u_karim")).some((n: Any) => n.kind === "plan.review.submitted")).toBe(true);
    // Soumise : on ne la retouche plus ; celui qui l'a soumise ne la valide pas
    expect((await g.api("u_alice", "PATCH", `/api/plan-reviews/${rv.id}`, { summary: "x" })).status).toBe(409);
    expect((await g.api("u_alice", "POST", `/api/plan-reviews/${rv.id}/validate`)).status).toBe(403);
    // Retournée avec un motif, corrigée, soumise à nouveau, validée
    expect((await g.api("u_karim", "POST", `/api/plan-reviews/${rv.id}/return`, {})).status).toBe(400);
    const back = await g.api("u_karim", "POST", `/api/plan-reviews/${rv.id}/return`, {
      comment: "Chiffrez le retard",
    });
    expect(back.body).toMatchObject({ status: "retournee", return_comment: "Chiffrez le retard" });
    expect((await notes("u_alice")).some((n: Any) => n.kind === "plan.review.returned")).toBe(true);
    await g.api("u_alice", "PATCH", `/api/plan-reviews/${rv.id}`, { summary: "Retard de six semaines sur le cadrage" });
    await g.api("u_alice", "POST", `/api/plan-reviews/${rv.id}/submit`);
    const ok = await g.api("u_karim", "POST", `/api/plan-reviews/${rv.id}/validate`, { comment: "Vu" });
    expect(ok.body).toMatchObject({ status: "validee", validated_by: "u_karim" });
    expect((await notes("u_alice")).some((n: Any) => n.kind === "plan.review.validated")).toBe(true);
    expect((await g.api("u_alice", "PATCH", `/api/plan-reviews/${rv.id}`, { summary: "x" })).status).toBe(409);
    const read = (await g.api("u_alice", "GET", `/api/plan-reviews/${rv.id}`)).body;
    expect(read.lines.find((l: Any) => l.activity_id === l1.activity_id)).toMatchObject({
      assessment: "en_retard",
      comment: "Données de terrain arrivées tard",
    });
    // Tout est tracé
    const kinds = (await g.ctx.db.query<Any>("SELECT kind FROM activity WHERE kind LIKE 'plan.review%'")).map(
      (a: Any) => a.kind,
    );
    expect(kinds).toEqual(
      expect.arrayContaining([
        "plan.review.opened",
        "plan.review.submitted",
        "plan.review.returned",
        "plan.review.validated",
      ]),
    );
  });
});
