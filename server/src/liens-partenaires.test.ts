import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Lot PA3 — les liens (docs/CONCEPTION.md § 4.7) : là où l'on tapait le nom d'un tiers, on choisit un partenaire de
 * l'annuaire. Projet (commanditaire), activité (interlocuteur), courrier (correspondant), contrat (prestataire),
 * réunion (partenaires et contacts convoqués). La fiche du partenaire rassemble tout, selon les droits de chacun ;
 * le texte libre existant se rapproche des fiches, après relecture.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
let n = 0;
// Date locale, comme le serveur : autour de minuit, la date UTC serait celle de la veille
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const partner = async (body: Record<string, unknown> = {}) =>
  (
    await g.api("u_alice", "POST", "/api/partners", {
      name: `Partenaire ${++n}`,
      type_code: "institution_publique",
      ...body,
    })
  ).body as Any;
const contact = async (p: string, name = "Mme Contact", title = "Directrice") =>
  (await g.api("u_alice", "POST", `/api/partners/${p}/contacts`, { name, title })).body as Any;
const detail = async (p: string, who = "u_alice") => (await g.api(who, "GET", `/api/partners/${p}`)).body as Any;
const mail = (body: Record<string, unknown>) =>
  g.api("u_alice", "POST", "/api/correspondence", {
    direction: "entrant",
    subject: `Courrier ${++n}`,
    received_on: day(),
    ...body,
  });

describe("liens : choisir un partenaire dans chaque module", () => {
  it("projet : le commanditaire est un partenaire ; son nom remplit le champ texte", async () => {
    const p = await partner({ name: "Ministère fictif de tutelle" });
    const prj = await g.project();
    const r = await g.api("u_alice", "PUT", `/api/projects/${prj}/governance`, { sponsor_partner_id: p.id });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      sponsor_partner_id: p.id,
      sponsor: "Ministère fictif de tutelle",
      sponsor_partner_name: "Ministère fictif de tutelle",
    });
    // Le texte saisi reste celui de l'utilisateur s'il en donne un
    const r2 = await g.api("u_alice", "PUT", `/api/projects/${prj}/governance`, { sponsor: "MFT (cabinet)" });
    expect(r2.body).toMatchObject({ sponsor_partner_id: p.id, sponsor: "MFT (cabinet)" });
    expect(
      (await g.api("u_alice", "PUT", `/api/projects/${prj}/governance`, { sponsor_partner_id: "par_x" })).status,
    ).toBe(400);
  });

  it("un partenaire clos ou fusionné n'est plus choisi ; un lien existant reste valable", async () => {
    const clos = await partner();
    const prj = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${prj}/governance`, { sponsor_partner_id: clos.id });
    await g.api("u_alice", "POST", `/api/partners/${clos.id}/state`, { state: "clos", reason: "Fin" });
    expect(
      (await g.api("u_alice", "PUT", `/api/projects/${prj}/governance`, { sponsor_partner_id: clos.id })).status,
    ).toBe(200);
    expect(
      (await g.api("u_alice", "PUT", `/api/projects/${await g.project()}/governance`, { sponsor_partner_id: clos.id }))
        .status,
    ).toBe(409);
    const keep = await partner();
    const dup = await partner();
    await g.api("u_alice", "POST", `/api/partners/${dup.id}/merge`, { into_id: keep.id });
    expect(
      (
        await g.api("u_alice", "POST", "/api/activities", {
          kind: "commission",
          title: "C",
          counterpart_partner_id: dup.id,
        })
      ).status,
    ).toBe(400);
  });

  it("activité : l'interlocuteur est un partenaire, modifiable ensuite", async () => {
    const a = await partner({ name: "Primature fictive" });
    const b = await partner({ name: "Assemblée fictive" });
    const r = await g.api("u_alice", "POST", "/api/activities", {
      kind: "commission",
      title: "Commission interministérielle",
      counterpart_partner_id: a.id,
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ counterpart_partner_id: a.id, counterpart: "Primature fictive" });
    const u = await g.api("u_alice", "PATCH", `/api/activities/${r.body.id}`, { counterpart_partner_id: b.id });
    expect(u.body).toMatchObject({ counterpart_partner_id: b.id, counterpart: "Assemblée fictive" });
    const list = (await g.api("u_alice", "GET", "/api/activities")).body as Any[];
    expect(list.find((x) => x.id === r.body.id).counterpart_partner_name).toBe("Assemblée fictive");
  });

  it("courrier : le correspondant est un partenaire et un de ses contacts ; la réponse hérite du partenaire", async () => {
    const p = await partner({ name: "Gouvernorat fictif du Nord" });
    const c = await contact(p.id, "M. le Gouverneur", "Gouverneur");
    const other = await contact((await partner()).id);
    expect((await mail({ partner_id: p.id, contact_id: other.id })).status).toBe(400);
    expect((await mail({})).status).toBe(400); // ni correspondant ni partenaire
    const r = await mail({ partner_id: p.id, contact_id: c.id });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ partner_id: p.id, contact_id: c.id, correspondent: "Gouvernorat fictif du Nord" });
    const reply = await g.api("u_alice", "POST", "/api/correspondence", {
      direction: "sortant",
      subject: "Réponse",
      received_on: day(),
      reply_to_id: r.body.id,
    });
    expect(reply.body).toMatchObject({ partner_id: p.id, correspondent: "Gouvernorat fictif du Nord" });
    const filtered = (await g.api("u_alice", "GET", `/api/correspondence?partner_id=${p.id}`)).body as Any[];
    expect(filtered.map((m) => m.id).sort()).toEqual([r.body.id, reply.body.id].sort());
  });

  it("contrat : le prestataire est un partenaire de catégorie « prestataire »", async () => {
    const cab = await partner({ name: "Cabinet fictif", type_code: "entreprise_privee", categories: ["prestataire"] });
    const ptf = await partner({ type_code: "organisation_internationale", categories: ["ptf"] });
    const body = (partner_id: string) => ({
      project_id: undefined as unknown,
      partner_id,
      title: "Étude",
      start_on: day(),
      end_on: day(90),
      supervisor_id: "u_alice",
    });
    const prj = await g.project();
    const bad = await g.api("u_alice", "POST", "/api/contracts", { ...body(ptf.id), project_id: prj });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/prestataire/);
    const ok = await g.api("u_alice", "POST", "/api/contracts", { ...body(cab.id), project_id: prj });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ partner_id: cab.id, consultant_name: "Cabinet fictif" });
  });

  it("réunion : partenaires concernés et contacts convoqués comme extérieurs", async () => {
    const p = await partner({ name: "Fonds fictif", acronym: "FF" });
    const q = await partner({ name: "Ville fictive" });
    const c = await contact(p.id, "Mme Awa Exemple", "Chargée de programme");
    const r = await g.api("u_alice", "POST", "/api/meetings", {
      meeting_type: "Réunion de travail",
      meeting_date: day(5),
      partner_ids: [q.id],
      invitees: [{ contact_id: c.id }, { user_id: "u_karim" }],
    });
    expect(r.status).toBe(200);
    expect(r.body.partners.map((x: Any) => x.id).sort()).toEqual([p.id, q.id].sort());
    const ext = r.body.attendees.find((a: Any) => a.contact_id === c.id);
    expect(ext).toMatchObject({ user_id: null, name: "Mme Awa Exemple", function_label: "Chargée de programme — FF" });
    expect((await g.api("u_alice", "GET", `/api/meetings?partner_id=${p.id}`)).body.map((m: Any) => m.id)).toEqual([
      r.body.id,
    ]);
    const u = await g.api("u_alice", "PATCH", `/api/meetings/${r.body.id}`, { partner_ids: [q.id] });
    expect(u.body.partners.map((x: Any) => x.id)).toEqual([q.id]);
    // Un contact archivé ou d'une autre institution n'est pas convocable
    await g.api("u_alice", "PATCH", `/api/partner-contacts/${c.id}`, { archived: true });
    expect(
      (await g.api("u_alice", "PUT", `/api/meetings/${r.body.id}/invitees`, { invitees: [{ contact_id: c.id }] }))
        .status,
    ).toBe(400);
  });
});

describe("liens : la fiche du partenaire rassemble tout", () => {
  it("dossiers, réunions, courrier et contrats, selon les droits de chacun", async () => {
    const p = await partner({ categories: ["prestataire"], type_code: "entreprise_privee" });
    const prj = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${prj}/governance`, { sponsor_partner_id: p.id });
    const act = (
      await g.api("u_alice", "POST", "/api/activities", {
        kind: "commission",
        title: "C",
        counterpart_partner_id: p.id,
      })
    ).body;
    const secret = (
      await g.api("u_alice", "POST", "/api/activities", {
        kind: "rendez_vous",
        title: "Audience",
        counterpart_partner_id: p.id,
      })
    ).body;
    const m1 = (await mail({ partner_id: p.id })).body;
    const m2 = (await mail({ partner_id: p.id, confidential: true })).body;
    const meet = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Réunion",
        meeting_date: day(3),
        partner_ids: [p.id],
      })
    ).body;
    const ctr = (
      await g.api("u_alice", "POST", "/api/contracts", {
        project_id: prj,
        partner_id: p.id,
        title: "Étude",
        start_on: day(),
        end_on: day(30),
        supervisor_id: "u_alice",
      })
    ).body;
    const all = await detail(p.id);
    expect(all.dossiers.map((d: Any) => d.id).sort()).toEqual([prj, act.id, secret.id].sort());
    expect(all.dossiers.find((d: Any) => d.id === prj)).toMatchObject({ kind: "project", role: "Commanditaire" });
    expect(all.mail.map((x: Any) => x.id).sort()).toEqual([m1.id, m2.id].sort());
    expect(all.meetings.map((x: Any) => x.id)).toEqual([meet.id]);
    expect(all.contracts.map((x: Any) => x.id)).toEqual([ctr.id]);
    // Hugo, simple membre : ni le projet privé d'Alice, ni l'audience confidentielle, ni le courrier confidentiel
    const h = await detail(p.id, "u_hugo");
    expect(h.dossiers.map((d: Any) => d.id)).toEqual([act.id]);
    expect(h.mail.map((x: Any) => x.id)).toEqual([m1.id]);
    expect(h.contracts).toEqual([]);
  });

  it("une fiche liée à un dossier ne se supprime plus ; la fusion déplace tous les liens", async () => {
    const keep = await partner();
    const dup = await partner();
    const prj = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${prj}/governance`, { sponsor_partner_id: dup.id });
    expect((await g.api("u_alice", "DELETE", `/api/partners/${dup.id}`)).status).toBe(409);
    const m = (await mail({ partner_id: dup.id })).body;
    const meet = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Réunion",
        meeting_date: day(3),
        partner_ids: [dup.id, keep.id],
      })
    ).body;
    await g.api("u_alice", "POST", `/api/partners/${dup.id}/merge`, { into_id: keep.id });
    const k = await detail(keep.id);
    expect(k.dossiers.map((d: Any) => d.id)).toEqual([prj]);
    expect(k.mail.map((x: Any) => x.id)).toEqual([m.id]);
    expect(k.meetings.map((x: Any) => x.id)).toEqual([meet.id]);
    expect((await g.api("u_alice", "GET", `/api/meetings/${meet.id}`)).body.partners.map((x: Any) => x.id)).toEqual([
      keep.id,
    ]);
  });
});

describe("liens : rapprochement du texte libre existant", () => {
  it("liste les textes sans fiche, avec une suggestion ; les relie après relecture", async () => {
    const p = await partner({ name: "Ministère de l'Aménagement fictif", acronym: "MAF" });
    const prj = await g.project();
    await g.api("u_alice", "PUT", `/api/projects/${prj}/governance`, { sponsor: "MAF" });
    await g.api("u_alice", "POST", "/api/activities", {
      kind: "commission",
      title: "C",
      counterpart: "ministere de l'amenagement fictif",
    });
    await mail({ correspondent: "MAF" });
    await mail({ correspondent: "MAF" });
    await mail({ correspondent: "Confidentiel SA", confidential: true });
    await mail({ correspondent: "Inconnu" });
    expect((await g.api("u_hugo", "GET", "/api/partners/reconcile")).status).toBe(403);
    const groups = (await g.api("u_alice", "GET", "/api/partners/reconcile")).body as Any[];
    const find = (source: string, text: string) => groups.find((x) => x.source === source && x.text === text);
    expect(find("correspondent", "MAF")).toMatchObject({ count: 2, suggestion: { id: p.id } });
    expect(find("sponsor", "MAF")).toMatchObject({ count: 1, suggestion: { id: p.id } });
    expect(find("counterpart", "ministere de l'amenagement fictif").suggestion.id).toBe(p.id);
    expect(find("correspondent", "Inconnu").suggestion).toBeNull();
    expect(find("correspondent", "Confidentiel SA")).toBeUndefined();
    const r = await g.api("u_alice", "POST", "/api/partners/reconcile", {
      source: "correspondent",
      text: "MAF",
      partner_id: p.id,
    });
    expect(r.body.linked).toBe(2);
    expect(
      (await g.api("u_alice", "GET", "/api/partners/reconcile")).body.some(
        (x: Any) => x.source === "correspondent" && x.text === "MAF",
      ),
    ).toBe(false);
    const mails = (await detail(p.id)).mail as Any[];
    expect(mails.length).toBe(2);
    expect(mails[0].correspondent).toBe("MAF"); // le texte d'origine est conservé
    expect((await detail(p.id)).history.some((h: Any) => /Rapprochement/.test(h.body))).toBe(true);
  });

  it("un texte de prestataire ne se rapproche que d'un partenaire prestataire", async () => {
    const p = await partner({ name: "Cabinet X" });
    const prj = await g.project();
    await g.api("u_alice", "POST", "/api/contracts", {
      project_id: prj,
      consultant_name: "Cabinet X",
      title: "Étude",
      start_on: day(),
      end_on: day(30),
      supervisor_id: "u_alice",
    });
    expect(
      (
        await g.api("u_alice", "POST", "/api/partners/reconcile", {
          source: "contractor",
          text: "Cabinet X",
          partner_id: p.id,
        })
      ).status,
    ).toBe(400);
    await g.api("u_alice", "PATCH", `/api/partners/${p.id}`, { categories: ["prestataire"] });
    expect(
      (
        await g.api("u_alice", "POST", "/api/partners/reconcile", {
          source: "contractor",
          text: "Cabinet X",
          partner_id: p.id,
        })
      ).body.linked,
    ).toBe(1);
  });

  it("une autre organisation ne voit ni ne relie les textes de l'institution", async () => {
    const p = await partner();
    await mail({ correspondent: "Texte A" });
    const b = await g.foreignOrg();
    expect((await g.api(b.who, "GET", "/api/partners/reconcile")).body).toEqual([]);
    expect(
      (
        await g.api(b.who, "POST", "/api/partners/reconcile", {
          source: "correspondent",
          text: "Texte A",
          partner_id: p.id,
        })
      ).status,
    ).toBe(400);
  });
});
