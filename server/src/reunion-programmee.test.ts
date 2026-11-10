import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Lot P2 (docs/PARCOURS-METIER.md, parcours 1) : programmer, convoquer, répondre, joindre les pièces,
 * soumettre le compte rendu, le retourner ou le valider par la présidence, puis le diffuser.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
type Note = { kind: string };
const notes = async (who: string) => (await g.api(who, "GET", "/api/notifications")).body as Note[];
const program = (body: Record<string, unknown> = {}) =>
  g.api("u_alice", "POST", "/api/meetings", {
    meeting_type: "Comité de direction",
    meeting_date: day(5),
    start_time: "09:00",
    writer_id: "u_karim",
    chair_id: "u_hugo",
    invitees: [{ user_id: "u_karim" }, { user_id: "u_hugo" }],
    ...body,
  });
const agenda = (id: string, actions: Record<string, unknown>[] = []) =>
  g.api("u_alice", "PUT", `/api/meetings/${id}/content`, {
    agenda: [{ subject: "Budget 2027", notes: "Arbitrages présentés", actions }],
    attendees: [],
  });
/** Une séance passée, tenue, au compte rendu complet. */
const held = async (body: Record<string, unknown> = {}) => {
  const m = (await program({ meeting_date: day(-1), ...body })).body;
  await agenda(m.id, [{ text: "Préparer la note", responsible_id: "u_karim", due_on: day(10) }]);
  return m;
};

describe("programmer", () => {
  it("enregistre présidence, visioconférence et convoqués, et développe une entité convoquée en ses membres", async () => {
    const [unit] = await g.units(1);
    await g.api("u_alice", "PUT", "/api/org/members/u_karim/unit", { unit_id: unit });
    const r = await program({
      video_link: "https://visio.exemple/cd",
      invitees: [{ unit_id: unit }, { name: "M. Expert" }],
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ chair_id: "u_hugo", video_link: "https://visio.exemple/cd" });
    const invited = r.body.attendees.filter((a: { invited: boolean }) => a.invited);
    expect(invited.map((a: { name: string }) => a.name)).toContain("M. Expert");
    expect(invited.map((a: { user_id: string | null }) => a.user_id)).toContain("u_karim");
  });

  it("refuse un convoqué ou une présidence hors de l'institution", async () => {
    await g.foreignOrg();
    expect((await program({ invitees: [{ user_id: "u_hugo" }] })).status).toBe(400);
    expect((await program({ chair_id: "u_hugo", invitees: [] })).status).toBe(400);
  });

  it("rattache la réunion à un projet, et liste les réunions du dossier", async () => {
    const prj = await g.project();
    const m = (await program({ project_id: prj })).body;
    await program();
    const list = (await g.api("u_alice", "GET", `/api/meetings?project_id=${prj}`)).body as { id: string }[];
    expect(list.map((x) => x.id)).toEqual([m.id]);
    expect((await program({ project_id: "prj_inconnu" })).status).toBe(400);
  });

  it("programme une série : chaque semaine, mêmes convoqués, 12 séances au plus", async () => {
    const r = await program({ repeat: { every: "week", count: 4 } });
    expect(r.status).toBe(200);
    const list = (await g.api("u_alice", "GET", "/api/meetings")).body as {
      series_id: string | null;
      meeting_date: string;
    }[];
    const series = list.filter((x) => x.series_id && x.series_id === r.body.series_id).map((x) => x.meeting_date);
    expect(series.sort()).toEqual([day(5), day(12), day(19), day(26)]);
    expect((await program({ repeat: { every: "week", count: 13 } })).status).toBe(400);
  });

  it("ouvre d'office le point de suivi des recommandations restées ouvertes", async () => {
    await held({ meeting_date: day(-8) });
    const next = (await program()).body;
    expect(next.agenda[0].subject).toBe("Suivi des recommandations de la réunion précédente");
    expect(next.agenda[0].notes).toContain("Préparer la note");
  });
});

describe("convoquer et répondre", () => {
  it("exige des convoqués et un ordre du jour, prévient chacun et trace l'envoi", async () => {
    const empty = (await program({ invitees: [] })).body;
    expect((await g.api("u_alice", "POST", `/api/meetings/${empty.id}/convene`, {})).status).toBe(400);
    const m = (await program()).body;
    expect((await g.api("u_alice", "POST", `/api/meetings/${m.id}/convene`, {})).body.error).toMatch(/ordre du jour/);
    await agenda(m.id);
    const r = await g.api("u_alice", "POST", `/api/meetings/${m.id}/convene`, {});
    expect(r.status).toBe(200);
    expect(r.body.convened_at).toBeTruthy();
    for (const who of ["u_karim", "u_hugo"])
      expect((await notes(who)).some((n) => n.kind === "meeting.convened")).toBe(true);
    const log = await g.ctx.db.query("SELECT 1 FROM activity WHERE kind = 'meeting.convened'");
    expect(log).toHaveLength(1);
  });

  it("à moins de 48 heures, l'urgence doit être confirmée ; une séance passée ne se convoque plus", async () => {
    const soon = (await program({ meeting_date: day(1) })).body;
    await agenda(soon.id);
    const r = await g.api("u_alice", "POST", `/api/meetings/${soon.id}/convene`, {});
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/48/);
    expect((await g.api("u_alice", "POST", `/api/meetings/${soon.id}/convene`, { short_notice: true })).status).toBe(200);
    const past = (await program({ meeting_date: day(-1) })).body;
    await agenda(past.id);
    expect((await g.api("u_alice", "POST", `/api/meetings/${past.id}/convene`, { short_notice: true })).status).toBe(400);
  });

  it("seul le convoqué répond ; « représenté » exige le nom du représentant", async () => {
    const m = (await program()).body;
    await agenda(m.id);
    await g.api("u_alice", "POST", `/api/meetings/${m.id}/convene`, {});
    const url = `/api/meetings/${m.id}/respond`;
    expect((await g.api("u_alice", "POST", url, { response: "accepted" })).status).toBe(403);
    expect((await g.api("u_karim", "POST", url, { response: "delegated" })).status).toBe(400);
    expect((await g.api("u_karim", "POST", url, { response: "delegated", delegate_name: "Mme Adjointe" })).status).toBe(
      200,
    );
    const r = await g.api("u_hugo", "POST", url, { response: "declined" });
    const mine = r.body.attendees.find((a: { user_id: string }) => a.user_id === "u_karim");
    expect(mine).toMatchObject({ response: "delegated", delegate_name: "Mme Adjointe" });
  });

  it("une nouvelle convocation remet les réponses à zéro", async () => {
    const m = (await program()).body;
    await agenda(m.id);
    await g.api("u_alice", "POST", `/api/meetings/${m.id}/convene`, {});
    await g.api("u_karim", "POST", `/api/meetings/${m.id}/respond`, { response: "accepted" });
    await g.api("u_alice", "PATCH", `/api/meetings/${m.id}`, { location: "Salle B" });
    const again = (await g.api("u_alice", "POST", `/api/meetings/${m.id}/convene`, {})).body;
    expect(again.attendees.find((a: { user_id: string }) => a.user_id === "u_karim").response).toBe("pending");
  });

  it("garde les réponses quand le rédacteur enregistre la feuille de présence", async () => {
    const m = (await program()).body;
    await agenda(m.id);
    await g.api("u_alice", "POST", `/api/meetings/${m.id}/convene`, {});
    await g.api("u_karim", "POST", `/api/meetings/${m.id}/respond`, { response: "accepted" });
    const r = await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
      agenda: [{ subject: "Budget 2027" }],
      attendees: [
        { user_id: "u_karim", name: "Karim", presence: "present" },
        { user_id: "u_hugo", name: "Hugo", presence: "excuse" },
      ],
    });
    const k = r.body.attendees.find((a: { user_id: string }) => a.user_id === "u_karim");
    expect(k).toMatchObject({ invited: true, response: "accepted", presence: "present" });
  });
});

describe("pièces de l'ordre du jour", () => {
  it("se joignent, se lisent par qui voit la réunion, et se figent avec le compte rendu", async () => {
    const m = (await program({ confidential: true, chair_id: null })).body;
    const up = await g.upload("u_alice", `/api/meetings/${m.id}/documents?name=note.txt`, Buffer.from("Note de cadrage"));
    expect(up.status).toBe(200);
    const doc = up.body.id as string;
    expect((await g.api("u_karim", "GET", `/api/meeting-documents/${doc}`)).raw.toString()).toBe("Note de cadrage");
    await g.api("u_alice", "PUT", `/api/meetings/${m.id}/invitees`, { invitees: [{ user_id: "u_karim" }] });
    expect((await g.api("u_hugo", "GET", `/api/meeting-documents/${doc}`)).status).toBe(404);
    expect((await g.api("u_alice", "GET", `/api/meetings/${m.id}`)).body.documents).toHaveLength(1);
  });
});

describe("soumettre, retourner, valider, diffuser", () => {
  it("le rédacteur soumet ; le compte rendu soumis n'est plus modifiable ; la présidence est prévenue", async () => {
    const m = await held();
    expect((await g.api("u_alice", "POST", `/api/meetings/${m.id}/validate`)).status).toBe(400);
    const s = await g.api("u_karim", "POST", `/api/meetings/${m.id}/submit`);
    expect(s.body.status).toBe("submitted");
    expect((await notes("u_hugo")).some((n) => n.kind === "meeting.submitted")).toBe(true);
    expect((await agenda(m.id)).status).toBe(409);
  });

  it("refuse de soumettre un compte rendu incomplet", async () => {
    const m = (await program({ meeting_date: day(-1) })).body;
    await agenda(m.id, [{ text: "Sans échéance", responsible_id: "u_karim" }]);
    expect((await g.api("u_karim", "POST", `/api/meetings/${m.id}/submit`)).status).toBe(400);
  });

  it("un retour exige un motif et rend la main au rédacteur", async () => {
    const m = await held();
    await g.api("u_karim", "POST", `/api/meetings/${m.id}/submit`);
    expect((await g.api("u_hugo", "POST", `/api/meetings/${m.id}/return`, { comment: "" })).status).toBe(400);
    const r = await g.api("u_hugo", "POST", `/api/meetings/${m.id}/return`, { comment: "Compléter le point 1" });
    expect(r.body).toMatchObject({ status: "held", return_comment: "Compléter le point 1" });
    expect((await notes("u_karim")).some((n) => n.kind === "meeting.returned")).toBe(true);
    expect((await agenda(m.id, [{ text: "Préparer la note", responsible_id: "u_karim", due_on: day(9) }])).status).toBe(
      200,
    );
  });

  it("la présidence de séance valide, nul autre ; le compte rendu validé est diffusé à tous les participants", async () => {
    const m = await held();
    await g.api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
      agenda: [
        {
          subject: "Budget 2027",
          actions: [{ text: "Préparer la note", responsible_id: "u_karim", due_on: day(10) }],
        },
      ],
      attendees: [
        { user_id: "u_karim", name: "Karim", presence: "present" },
        { user_id: "u_hugo", name: "Hugo", presence: "present" },
        { user_id: "u_alice", name: "Alice", presence: "present" },
      ],
    });
    await g.api("u_karim", "POST", `/api/meetings/${m.id}/submit`);
    const other = await g.api("u_alice", "POST", `/api/meetings/${m.id}/validate`);
    expect(other.status).toBe(403);
    expect(other.body.error).toMatch(/présid/);
    const v = await g.api("u_hugo", "POST", `/api/meetings/${m.id}/validate`);
    expect(v.body.status).toBe("validated");
    expect((await notes("u_alice")).some((n) => n.kind === "meeting.report")).toBe(true);
    expect((await notes("u_karim")).some((n) => n.kind === "meeting.report")).toBe(true);
  });

  it("sans présidence désignée, un détenteur du droit de validation valide", async () => {
    const m = await held({ chair_id: null });
    await g.api("u_karim", "POST", `/api/meetings/${m.id}/submit`);
    expect((await g.api("u_alice", "POST", `/api/meetings/${m.id}/validate`)).body.status).toBe("validated");
  });
});
