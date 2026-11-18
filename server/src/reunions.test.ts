import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

type Ctx = Awaited<ReturnType<typeof buildApp>>;
let ctx: Ctx;
const cookies: Record<string, string> = {};
const cookieOf = (res: { headers: Record<string, unknown> }) =>
  String(([] as unknown[]).concat(res.headers["set-cookie"] ?? [])[0]).split(";")[0];
type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
async function api(who: string, method: Method, url: string, payload?: unknown) {
  const res = await ctx.app.inject({
    method,
    url,
    payload: payload as never,
    headers: { cookie: cookies[who] ?? who },
  });
  let body = null;
  try {
    body = res.body ? JSON.parse(res.body) : null;
  } catch {
    body = res.body;
  }
  return { status: res.statusCode, body, headers: res.headers, raw: res.rawPayload };
}
const orgId = async () =>
  (await ctx.db.one<{ id: string }>("SELECT id FROM organizations WHERE name = 'Nova Mobile'"))!.id;
const base = {
  meeting_type: "Réunion hebdomadaire des Directions",
  meeting_date: "2026-07-13",
  start_time: "14:18",
  end_time: "16:30",
  location: "Salle de réunion",
  convened_by: "Les Directions",
  facilitator: "Directrice générale",
  timekeeper: "Directrice générale",
  writer_id: "u_karim",
  writer_initials: "KBB",
};
const create = async (patch: Record<string, unknown> = {}) =>
  (await api("u_alice", "POST", "/api/meetings", { ...base, ...patch })).body as Meeting;
interface Action {
  id: string;
  text: string;
  responsible_id: string | null;
  responsible_name: string;
  due_on: string | null;
  original_due_on: string | null;
  status: string;
}
interface Item {
  id: string;
  subject: string;
  speakers: string;
  notes: string;
  actions: Action[];
}
interface Meeting {
  id: string;
  reference: string;
  status: string;
  previous_summary: string;
  agenda: Item[];
  attendees: { name: string }[];
  carried: Action[];
  can: { edit: boolean; validate: boolean };
}
const content = (actions: Record<string, unknown>[] = []) => ({
  agenda: [
    {
      subject: "Communication de la Direction",
      speakers: "Directrice générale",
      notes: "**Budget :** point fait.\n- Suite à donner",
      actions,
    },
  ],
  attendees: [{ name: "Fiston", user_id: "u_karim", presence: "present" }],
});
const action = (patch: Record<string, unknown> = {}) => ({
  text: "Préparer le planning",
  responsible_id: "u_theo",
  responsible_name: "Gaston",
  due_on: "2026-07-15",
  status: "a_faire",
  ...patch,
});
const readOnlyMember = async (user: string) => {
  const p = (await api("u_alice", "GET", "/api/org/profiles")).body.find(
    (x: { name: string }) => x.name === "Lecture seule",
  );
  await ctx.db.query("UPDATE org_units SET manager_id = NULL WHERE manager_id = $1", [user]); // un chef garde un profil de chef (A-3)
  await api("u_alice", "PUT", `/api/org/members/${user}/profile`, { profile_id: p.id });
};
const saved = async (m: Meeting, actions = [action()]) =>
  (await api("u_alice", "PUT", `/api/meetings/${m.id}/content`, content(actions))).body as Meeting;

beforeEach(async () => {
  ctx = await buildApp({ provider: "demo", demoDelayMs: 0 });
  for (const u of ["u_alice", "u_karim", "u_theo", "u_hugo", "u_ines"])
    cookies[u] = cookieOf(await ctx.app.inject({ method: "POST", url: "/api/auth/login", payload: { user_id: u } }));
});
afterEach(async () => {
  await ctx.app.close();
});

describe("référence officielle", () => {
  it("suit le format de l'agence et se suit dans l'année", async () => {
    expect((await create()).reference).toBe("0001/ANAT/DIR/CR/KBB/07-26");
    expect((await create({ meeting_date: "2026-08-02" })).reference).toBe("0002/ANAT/DIR/CR/KBB/08-26");
    expect((await create({ meeting_date: "2027-01-05" })).reference).toBe("0001/ANAT/DIR/CR/KBB/01-27");
  });
  it("reste unique en cas de créations simultanées", async () => {
    const all = await Promise.all([...Array(6)].map(() => create()));
    expect(new Set(all.map((m) => m.reference)).size).toBe(6);
  });
  it("déduit les initiales du rédacteur si elles ne sont pas fournies", async () => {
    const m = await create({ writer_initials: undefined });
    expect(m.reference).toMatch(/^0001\/ANAT\/DIR\/CR\/[A-Z]{2,}\/07-26$/);
  });
});

describe("fiche de réunion", () => {
  it("refuse une date impossible et un rédacteur hors organisation", async () => {
    expect((await api("u_alice", "POST", "/api/meetings", { ...base, meeting_date: "2026-02-31" })).status).toBe(400);
    expect((await api("u_alice", "POST", "/api/meetings", { ...base, writer_id: "inconnu" })).status).toBe(400);
  });
  it("enregistre l'ordre du jour, les notes et les recommandations", async () => {
    const m = await saved(await create());
    expect(m.agenda[0]).toMatchObject({ subject: "Communication de la Direction", speakers: "Directrice générale" });
    expect(m.agenda[0].actions[0]).toMatchObject({
      text: "Préparer le planning",
      status: "a_faire",
      responsible_id: "u_theo",
    });
    expect(m.attendees).toHaveLength(1);
  });
  it("conserve l'identité des lignes existantes à la sauvegarde", async () => {
    const m = await saved(await create());
    const again = (
      await api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
        agenda: m.agenda.map((i) => ({ ...i, notes: "changé" })),
        attendees: [],
      })
    ).body as Meeting;
    expect(again.agenda[0].id).toBe(m.agenda[0].id);
    expect(again.agenda[0].actions[0].id).toBe(m.agenda[0].actions[0].id);
    expect(again.agenda[0].notes).toBe("changé");
  });
  it("refuse une ligne qui appartient à une autre réunion", async () => {
    const a = await saved(await create());
    const b = await create();
    const stolen = { ...content(), agenda: [{ ...a.agenda[0] }] };
    expect((await api("u_alice", "PUT", `/api/meetings/${b.id}/content`, stolen)).status).toBe(400);
    expect(
      (await ctx.db.one<{ meeting_id: string }>("SELECT meeting_id FROM meeting_agenda_items WHERE id = $1", [
        a.agenda[0].id,
      ]))!.meeting_id,
    ).toBe(a.id);
  });
  it("refuse un responsable hors organisation", async () => {
    const m = await create();
    expect(
      (await api("u_alice", "PUT", `/api/meetings/${m.id}/content`, content([action({ responsible_id: "inconnu" })])))
        .status,
    ).toBe(400);
  });
  it("reprend la synthèse et les recommandations non closes de la réunion précédente", async () => {
    const first = await saved(await create());
    await api("u_alice", "PATCH", `/api/meetings/${first.id}`, { summary: "Synthèse de la semaine" });
    const second = await create({ meeting_date: "2026-07-20" });
    expect(second.previous_summary).toBe("Synthèse de la semaine");
    expect(second.carried.map((a) => a.text)).toEqual(["Préparer le planning"]);
  });
});

describe("droits", () => {
  it("un membre lit mais ne crée pas", async () => {
    const m = await create();
    expect((await api("u_hugo", "GET", `/api/meetings/${m.id}`)).status).toBe(200);
    expect((await api("u_hugo", "POST", "/api/meetings", base)).status).toBe(403);
    expect((await api("u_hugo", "PATCH", `/api/meetings/${m.id}`, { location: "x" })).status).toBe(403);
  });
  it("le rédacteur modifie sa fiche, même sans le droit de gestion", async () => {
    const m = await create();
    expect((await api("u_karim", "PATCH", `/api/meetings/${m.id}`, { location: "Salle 2" })).status).toBe(200);
  });
  it("un profil Lecture seule n'accède pas aux réunions sans le droit coché", async () => {
    const m = await create();
    await readOnlyMember("u_hugo");
    expect((await api("u_hugo", "GET", `/api/meetings/${m.id}`)).status).toBe(403);
    expect((await api("u_hugo", "GET", "/api/meetings")).status).toBe(403);
  });
  it("une réunion confidentielle n'est visible que de ses participants et des gestionnaires", async () => {
    const m = await create({ confidential: true });
    await api("u_alice", "PUT", `/api/meetings/${m.id}/content`, {
      agenda: [],
      attendees: [{ name: "Gaston", user_id: "u_theo", presence: "present" }],
    });
    expect((await api("u_hugo", "GET", `/api/meetings/${m.id}`)).status).toBe(404);
    expect((await api("u_hugo", "GET", `/api/meetings/${m.id}/report.docx`)).status).toBe(404);
    expect((await api("u_hugo", "GET", "/api/meetings")).body).toHaveLength(0);
    expect((await api("u_theo", "GET", `/api/meetings/${m.id}`)).status).toBe(200);
    expect((await api("u_alice", "GET", `/api/meetings/${m.id}`)).status).toBe(200);
  });
  it("une autre organisation n'atteint rien", async () => {
    const m = await saved(await create());
    const b = await api("u_hugo", "POST", "/api/orgs", { name: "Org B" });
    const other = `${cookies.u_hugo}; ${cookieOf(b as never)}`;
    await ctx.db.query("DELETE FROM org_members WHERE user_id = 'u_hugo' AND org_id = $1", [await orgId()]);
    expect((await api(other, "GET", `/api/meetings/${m.id}`)).status).toBe(403);
    expect(
      (await api(other, "PATCH", `/api/meeting-actions/${m.agenda[0].actions[0].id}`, { status: "realise" })).status,
    ).toBe(403);
    expect((await api(other, "GET", "/api/meetings")).body).toHaveLength(0);
  });
});

describe("validation", () => {
  it("le rédacteur ne valide pas son propre compte rendu", async () => {
    const m = await saved(await create());
    await ctx.db.query(
      "UPDATE org_members SET role = 'admin', profile_id = 'prf_admin_' || org_id WHERE user_id = 'u_karim'",
    );
    // Le compte rendu se soumet d'abord (docs/PARCOURS-METIER.md, lot P2)
    await api("u_karim", "POST", `/api/meetings/${m.id}/submit`);
    expect((await api("u_karim", "POST", `/api/meetings/${m.id}/validate`)).status).toBe(403);
    expect((await api("u_alice", "POST", `/api/meetings/${m.id}/validate`)).body.status).toBe("validated");
  });
  it("refuse un compte rendu sans ordre du jour", async () => {
    const m = await create();
    expect((await api("u_karim", "POST", `/api/meetings/${m.id}/submit`)).status).toBe(400);
    expect((await api("u_alice", "POST", `/api/meetings/${m.id}/validate`)).status).toBe(400);
  });
  it("un compte rendu validé est figé, et se rouvre en le traçant", async () => {
    const m = await saved(await create());
    await api("u_karim", "POST", `/api/meetings/${m.id}/submit`);
    await api("u_alice", "POST", `/api/meetings/${m.id}/validate`);
    expect((await api("u_alice", "PATCH", `/api/meetings/${m.id}`, { location: "x" })).status).toBe(409);
    expect((await api("u_alice", "PUT", `/api/meetings/${m.id}/content`, content())).status).toBe(409);
    expect((await api("u_alice", "DELETE", `/api/meetings/${m.id}`)).status).toBe(409);
    expect((await api("u_alice", "POST", `/api/meetings/${m.id}/reopen`, { reason: "Erreur de lieu" })).body.status).toBe(
      "held",
    );
    expect(await ctx.db.one("SELECT 1 FROM activity WHERE kind = 'meeting.reopened'")).toBeTruthy();
    expect((await api("u_alice", "PATCH", `/api/meetings/${m.id}`, { location: "x" })).status).toBe(200);
  });
  it("prévient les responsables à la validation", async () => {
    const m = await saved(await create());
    await api("u_karim", "POST", `/api/meetings/${m.id}/submit`);
    await api("u_alice", "POST", `/api/meetings/${m.id}/validate`);
    expect(
      (await api("u_theo", "GET", "/api/notifications")).body.some(
        (n: { kind: string }) => n.kind === "meeting.action",
      ),
    ).toBe(true);
  });
});

describe("suivi des recommandations", () => {
  const firstAction = async () => (await saved(await create())).agenda[0].actions[0];
  const patch = (who: string, id: string, body: unknown) => api(who, "PATCH", `/api/meeting-actions/${id}`, body);

  it("le responsable avance et soumet, mais ne clôt pas", async () => {
    const a = await firstAction();
    expect((await patch("u_theo", a.id, { status: "en_cours" })).status).toBe(200);
    expect((await patch("u_theo", a.id, { status: "soumis" })).status).toBe(200);
    expect((await patch("u_theo", a.id, { status: "realise" })).status).toBe(403);
    expect((await patch("u_alice", a.id, { status: "realise" })).body).toMatchObject({
      status: "realise",
      closed_by: "u_alice",
    });
  });
  it("une personne non concernée ne change rien", async () => {
    const a = await firstAction();
    expect((await patch("u_hugo", a.id, { status: "en_cours" })).status).toBe(403);
  });
  it("un report exige un motif et conserve la date d'origine", async () => {
    const a = await firstAction();
    expect((await patch("u_alice", a.id, { status: "reporte", due_on: "2026-08-01" })).status).toBe(400);
    const r = await patch("u_alice", a.id, {
      status: "reporte",
      due_on: "2026-08-01",
      postponed_reason: "Attente du Trésor",
    });
    expect(r.body).toMatchObject({
      due_on: "2026-08-01",
      original_due_on: "2026-07-15",
      postponed_reason: "Attente du Trésor",
    });
  });
  it("liste les recommandations de l'organisation et les miennes", async () => {
    await firstAction();
    expect((await api("u_alice", "GET", "/api/meeting-actions")).body).toHaveLength(1);
    expect((await api("u_theo", "GET", "/api/meeting-actions?mine=true")).body[0]).toMatchObject({
      meeting_reference: "0001/ANAT/DIR/CR/KBB/07-26",
    });
    expect((await api("u_karim", "GET", "/api/meeting-actions?mine=true")).body).toHaveLength(0);
  });
});

describe("compte rendu Word", () => {
  it("reprend toute la structure du modèle officiel", async () => {
    const m = await saved(await create());
    await api("u_alice", "PATCH", `/api/meetings/${m.id}`, {
      summary: "Résumé final",
      next_date: "2026-07-20",
      next_location: "Salle ANAT",
    });
    const res = await api("u_alice", "GET", `/api/meetings/${m.id}/report.docx`);
    expect(res.status).toBe(200);
    expect(String(res.headers["content-type"])).toContain("wordprocessingml");
    expect(String(res.headers["content-disposition"])).toContain("attachment");
    const xml = await (await JSZip.loadAsync(res.raw)).file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, " ");
    for (const part of [
      "COMPTE RENDU DE REUNION",
      "N° 0001/ANAT/DIR/CR/KBB/07-26",
      "Informations générales",
      "Heure de début",
      "Réunion convoquée par",
      "Animateur",
      "Rédacteur",
      "Maître du temps",
      "Précédente réunion",
      "Ordre du jour",
      "Prise de note",
      "Recommandations",
      "Responsables",
      "Échéance",
      "Statut",
      "Conclusion",
      "Résumé final",
      "Prochaine réunion",
      "Rédigé par",
      "Préparer le planning",
      "Salle ANAT",
    ])
      expect(text, part).toContain(part);
  });
  it("neutralise le texte saisi", async () => {
    const m = await create({ location: "<b>&Salle" });
    const res = await api("u_alice", "GET", `/api/meetings/${m.id}/report.docx`);
    const xml = await (await JSZip.loadAsync(res.raw)).file("word/document.xml")!.async("string");
    expect(xml).toContain("&lt;b&gt;&amp;Salle");
  });
});
