import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Lot P3a (docs/PARCOURS-METIER.md) : la séance alimente le registre et le projet.
 * Décisions de séance inscrites au registre à la validation ; recommandations devenant tâches du projet,
 * les deux suivis restant synchronisés.
 */
let g: GovCtx;
let prj: string;
beforeEach(async () => {
  g = await boot();
  prj = await g.project();
  await g.api("u_alice", "PUT", `/api/projects/${prj}/members/u_hugo`, { role: "editor" });
});
afterEach(() => g.ctx.app.close());

const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const year = () => day().slice(0, 4);
type Note = { kind: string; title: string };
const notes = async (who: string) => (await g.api(who, "GET", "/api/notifications")).body as Note[];
const tasksOf = async (project: string) =>
  (await g.api("u_alice", "GET", `/api/tasks?project_id=${project}`)).body as {
    id: string;
    title: string;
    assignee_id: string | null;
    due_on: string | null;
    completed: boolean;
    description: string;
  }[];

/** Une séance passée, rattachée (ou non) à un projet, avec décisions et recommandations. */
const held = async (p: {
  project?: string | null;
  confidential?: boolean;
  decisions?: Record<string, unknown>[];
  actions?: Record<string, unknown>[];
}) => {
  const m = (
    await g.api("u_alice", "POST", "/api/meetings", {
      meeting_type: `Comité ${Math.random()}`,
      meeting_date: day(-1),
      writer_id: "u_karim",
      project_id: p.project ?? null,
      confidential: p.confidential ?? false,
    })
  ).body;
  await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
    agenda: [
      {
        subject: "Dossier foncier",
        notes: "Présenté",
        decisions: p.decisions ?? [],
        actions: p.actions ?? [],
      },
    ],
    attendees: [],
  });
  return m.id as string;
};
const submit = (id: string) => g.api("u_karim", "POST", `/api/meetings/${id}/submit`);
const validate = (id: string) => g.api("u_alice", "POST", `/api/meetings/${id}/validate`);

describe("décisions de séance → registre des décisions", () => {
  it("inscrit chaque décision au registre à la validation, rattachée à la réunion, et prévient le chargé d'exécution", async () => {
    const id = await held({
      decisions: [{ text: "Le recrutement du consultant foncier est approuvé.", owner_id: "u_hugo", due_on: day(20) }],
      actions: [{ text: "Préparer la note", responsible_id: "u_hugo", due_on: day(10) }],
    });
    await submit(id);
    const v = await validate(id);
    expect(v.status).toBe(200);
    const d = v.body.agenda[0].decisions[0];
    expect(d.decision_reference).toBe(`DEC/${year()}/0001`);
    const reg = (await g.api("u_alice", "GET", "/api/decisions")).body as Record<string, unknown>[];
    const mine = reg.find((x) => x.reference === `DEC/${year()}/0001`)!;
    expect(mine).toMatchObject({
      content: "Le recrutement du consultant foncier est approuvé.",
      owner_id: "u_hugo",
      due_on: day(20),
      status: "a_executer",
    });
    expect((mine.source as { kind: string }).kind).toBe("meeting");
    expect((await notes("u_hugo")).some((n) => n.kind === "decision.assigned")).toBe(true);
  });

  it("n'inscrit pas deux fois : rouvrir puis revalider ne crée aucun doublon", async () => {
    const id = await held({ decisions: [{ text: "Décision unique." }] });
    await submit(id);
    await validate(id);
    await g.api("u_alice", "POST", `/api/meetings/${id}/reopen`);
    await submit(id);
    await validate(id);
    const reg = (await g.api("u_alice", "GET", "/api/decisions")).body as { content: string }[];
    expect(reg.filter((x) => x.content === "Décision unique.")).toHaveLength(1);
  });

  it("le compte rendu d'une réunion confidentielle produit une décision confidentielle", async () => {
    const id = await held({ confidential: true, decisions: [{ text: "Décision sensible." }] });
    await submit(id);
    await validate(id);
    const reg = (await g.api("u_alice", "GET", "/api/decisions")).body as {
      content: string;
      confidential: boolean;
    }[];
    expect(reg.find((x) => x.content === "Décision sensible.")?.confidential).toBe(true);
  });

  it("une décision inscrite ne se modifie plus dans le compte rendu rouvert", async () => {
    const id = await held({ decisions: [{ text: "Texte initial." }] });
    await submit(id);
    const v = await validate(id);
    const dec = v.body.agenda[0].decisions[0];
    await g.api("u_alice", "POST", `/api/meetings/${id}/reopen`);
    await g.api("u_alice", "PUT", `/api/meetings/${id}/content`, {
      agenda: [
        {
          id: v.body.agenda[0].id,
          subject: "Dossier foncier",
          notes: "Présenté",
          decisions: [{ id: dec.id, text: "Texte falsifié." }],
          actions: [],
        },
      ],
      attendees: [],
    });
    const after = (await g.api("u_alice", "GET", `/api/meetings/${id}`)).body;
    expect(after.agenda[0].decisions[0].text).toBe("Texte initial.");
  });
});

describe("recommandations → tâches du projet", () => {
  it("à la validation, chaque recommandation ouverte devient une tâche assignée du projet", async () => {
    const id = await held({
      project: prj,
      actions: [{ text: "Cartographier les conflits fonciers", responsible_id: "u_hugo", due_on: day(12) }],
    });
    await submit(id);
    const v = await validate(id);
    const action = v.body.agenda[0].actions[0];
    expect(action.task_id).toBeTruthy();
    const tasks = await tasksOf(prj);
    const t = tasks.find((x) => x.title === "Cartographier les conflits fonciers")!;
    expect(t).toMatchObject({ assignee_id: "u_hugo", due_on: day(12), completed: false });
    expect(t.description).toContain(v.body.reference);
  });

  it("sans projet rattaché, aucune tâche n'est créée", async () => {
    const id = await held({ actions: [{ text: "Sans projet", responsible_id: "u_hugo", due_on: day(5) }] });
    await submit(id);
    const v = await validate(id);
    expect(v.body.agenda[0].actions[0].task_id).toBeNull();
  });

  it("un responsable sans accès au projet donne une tâche non assignée qui le nomme", async () => {
    const closed = await g.project();
    const id = await held({
      project: closed,
      actions: [{ text: "Tâche réservée", responsible_id: "u_karim", due_on: day(5) }],
    });
    await g.ctx.db.query("DELETE FROM memberships WHERE project_id = $1 AND user_id = 'u_karim'", [closed]);
    await submit(id);
    await validate(id);
    const t = (await tasksOf(closed)).find((x) => x.title === "Tâche réservée")!;
    expect(t.assignee_id).toBeNull();
    expect(t.description).toContain("Karim");
  });

  it("lot P3b — la réponse sortante clôt l'entrant et les deux restent liés", async () => {
    const register = (body: Record<string, unknown> = {}) =>
      g.api("u_alice", "POST", "/api/correspondence", {
        direction: "entrant",
        subject: "Demande d'appui technique",
        correspondent: "Gouverneur du Nord",
        received_on: day(-5),
        ...body,
      });
    const inMail = (await register({})).body;
    const out = (
      await register({
        direction: "sortant",
        subject: "Réponse à la demande d'appui",
        reply_to_id: inMail.id,
        received_on: day(0),
      })
    ).body;
    expect(out.reply_to_reference).toBe(inMail.reference);
    const entrants = (await g.api("u_alice", "GET", "/api/correspondence?direction=entrant")).body as Record<
      string,
      unknown
    >[];
    const closed = entrants.find((x) => x.id === inMail.id)!;
    expect(closed).toMatchObject({ status: "traite", response_ref: out.reference, response_reference: out.reference });
    // Une seconde réponse garde le lien sans écraser la première clôture
    const again = (
      await register({ direction: "sortant", subject: "Complément", reply_to_id: inMail.id, received_on: day(1) })
    ).body;
    expect(again.reply_to_reference).toBe(inMail.reference);
    const after = (await g.api("u_alice", "GET", "/api/correspondence?direction=entrant")).body.find(
      (x: { id: string }) => x.id === inMail.id,
    );
    expect(after.response_ref).toBe(out.reference);
    // Refus : répondre à un sortant, ou répondre depuis un entrant
    expect((await register({ direction: "sortant", reply_to_id: out.id, received_on: day(1) })).status).toBe(400);
    expect((await register({ reply_to_id: inMail.id })).status).toBe(400);
  });

  it("lot P3b — l'instruction d'imputation est conservée et transmise ; le courrier vit dans son dossier", async () => {
    const inMail = (
      await g.api("u_alice", "POST", "/api/correspondence", {
        direction: "entrant",
        subject: "Plan d'urbanisme provincial",
        correspondent: "Gouverneur du Nord",
        received_on: day(-2),
        project_id: prj,
      })
    ).body;
    await g.api("u_alice", "POST", `/api/correspondence/${inMail.id}/assign`, {
      assignee_id: "u_karim",
      due_on: day(10),
      instruction: "Pour avis",
    });
    const list = (await g.api("u_alice", "GET", `/api/correspondence?project_id=${prj}`)).body as Record<
      string,
      unknown
    >[];
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: inMail.id, instruction: "Pour avis", project_name: expect.any(String) });
    const note = (await notes("u_karim")).find((n) => n.kind === "correspondence.assigned") as
      | (Note & { body?: string })
      | undefined;
    expect(note?.body).toContain("Pour avis");
    // Dossier inconnu ou double dossier : refusé
    const bad = await g.api("u_alice", "POST", "/api/correspondence", {
      direction: "entrant",
      subject: "X",
      correspondent: "Y",
      received_on: day(0),
      project_id: "prj_inconnu",
    });
    expect(bad.status).toBe(400);
  });

  it("clore la recommandation termine la tâche ; terminer la tâche soumet la recommandation et prévient le rédacteur", async () => {
    const id = await held({
      project: prj,
      actions: [
        { text: "Première recommandation", responsible_id: "u_hugo", due_on: day(6) },
        { text: "Seconde recommandation", responsible_id: "u_hugo", due_on: day(8) },
      ],
    });
    await submit(id);
    const v = await validate(id);
    const [a1, a2] = v.body.agenda[0].actions;
    // Sens 1 : le gestionnaire clôt la recommandation, la tâche liée se termine
    await g.api("u_alice", "PATCH", `/api/meeting-actions/${a1.id}`, { status: "realise" });
    expect((await tasksOf(prj)).find((t) => t.id === a1.task_id)?.completed).toBe(true);
    // Sens 2 : le responsable termine sa tâche, la recommandation passe « soumise » et le rédacteur est prévenu
    await g.api("u_hugo", "PATCH", `/api/tasks/${a2.task_id}`, { completed: true });
    const actions = (await g.api("u_alice", "GET", "/api/meeting-actions")).body as {
      id: string;
      status: string;
    }[];
    expect(actions.find((x) => x.id === a2.id)?.status).toBe("soumis");
    expect((await notes("u_karim")).some((n) => n.kind === "meeting.action.submitted")).toBe(true);
  });
});
