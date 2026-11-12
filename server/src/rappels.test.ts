import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { notificationText } from "./mail.js";
import { Reminders } from "./reminders.js";
import { localDate } from "./services.js";

/*
 * Rappels d'échéance : chaque responsable est prévenu avant l'échéance, puis une fois en retard, pour ses tâches,
 * le courrier qui lui est imputé, les décisions qu'il exécute et les livrables qu'il produit. Chaque rappel part une
 * seule fois ; il devient un courriel quand la messagerie de l'institution est configurée.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
// Seuls les rappels des objets créés par le test comptent : la démonstration a ses propres échéances
const count = async (user: string, kind: string) =>
  (await g.ctx.db.one<{ n: number }>(
    `SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND kind = $2
     AND (title LIKE '%Rédiger la note' OR title LIKE '%Demande d''appui' OR title LIKE '%Publier le rapport' OR title LIKE '%Rapport de démarrage')`,
    [user, kind],
  ))!.n;

describe("rappels d'échéance", () => {
  it("tâche : la veille, puis une fois en retard ; jamais deux fois le même rappel", async () => {
    const prj = await g.project();
    await g.api("u_alice", "POST", "/api/tasks", {
      project_id: prj,
      title: "Rédiger la note",
      assignee_id: "u_alice",
      due_on: day(1),
    });
    const r = new Reminders(g.ctx.svc);
    await r.sweep(day());
    expect(await count("u_alice", "deadline.soon")).toBe(1);
    await r.sweep(day());
    expect(await count("u_alice", "deadline.soon")).toBe(1);
    await r.sweep(day(2));
    expect(await count("u_alice", "deadline.late")).toBe(1);
    await r.sweep(day(3));
    expect(await count("u_alice", "deadline.late")).toBe(1);
  });

  it("courrier imputé, décision à exécuter, livrable à produire : deux jours avant", async () => {
    const m = (
      await g.api("u_alice", "POST", "/api/correspondence", {
        direction: "entrant",
        subject: "Demande d'appui",
        correspondent: "Gouvernorat fictif",
        received_on: day(),
      })
    ).body;
    await g.api("u_alice", "POST", `/api/correspondence/${m.id}/assign`, { assignee_id: "u_hugo", due_on: day(2) });
    const dec = await g.api("u_alice", "POST", "/api/decisions", {
      title: "Publier le rapport",
      content: "Le rapport est publié.",
      decided_on: day(),
      owner_id: "u_karim",
      due_on: day(2),
    });
    const liv = await g.api("u_alice", "POST", "/api/deliverables", {
      project_id: await g.project(),
      title: "Rapport de démarrage",
      responsible_id: "u_karim",
      validator_id: "u_alice",
      due_on: day(1),
    });
    expect([dec.status, dec.body?.error, liv.status, liv.body?.error]).toEqual([200, undefined, 200, undefined]);
    await new Reminders(g.ctx.svc).sweep(day());
    expect(await count("u_hugo", "deadline.soon")).toBe(1);
    expect(await count("u_karim", "deadline.soon")).toBe(2);
    // Un courrier traité ne se rappelle plus
    await g.api("u_alice", "POST", `/api/correspondence/${m.id}/close`, { response_ref: "SOR/1" });
    await new Reminders(g.ctx.svc).sweep(day(5));
    expect(await count("u_hugo", "deadline.late")).toBe(0);
    expect(await count("u_karim", "deadline.late")).toBe(2);
  });
});

describe("courriel de notification", () => {
  it("signé ANAT Pilotage, avec le lien vers l'outil et sans invitation à répondre", () => {
    const t = notificationText({
      userName: "Karim Benali",
      title: "Échéance demain : Rédiger la note",
      body: "Projet de démonstration",
      orgName: "Agence fictive",
      link: "https://pilotage.exemple.test",
    });
    expect(t).toContain("Bonjour Karim Benali,");
    expect(t).toContain("Échéance demain : Rédiger la note");
    expect(t).toContain("https://pilotage.exemple.test");
    expect(t).toContain("ANAT Pilotage");
    expect(t).not.toMatch(/Cadence|Répondez/);
  });
});
