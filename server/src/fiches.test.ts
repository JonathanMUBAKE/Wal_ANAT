import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Fiches et grilles CRUD (docs/DESIGN-SYSTEM.md § 4) : documents décrits par un formulaire dont les champs dépendent
 * de leur nature, contacts gérés de bout en bout. Les contrôles sont faits par le serveur.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
let n = 0;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const partner = async (body: Record<string, unknown> = {}) =>
  (await g.api("u_alice", "POST", "/api/partners", { name: `Partenaire ${++n}`, type_code: "autre", ...body }))
    .body as Any;
const up = (who: string, p: string, q: Record<string, string>, data = "contenu") =>
  g.upload(who, `/api/partners/${p}/documents?${new URLSearchParams({ name: "piece.txt", ...q })}`, Buffer.from(data));

describe("documents : un formulaire selon la nature", () => {
  it("chaque nature dit quels champs elle demande ; « Contrat » demande dates et référence", async () => {
    const r = (await g.api("u_hugo", "GET", "/api/referentials")).body;
    const nat = (code: string) => r.partner_doc_nature.find((v: Any) => v.code === code);
    expect(nat("contrat").props).toMatchObject({ official: true, dated: true, expires: true, referenced: true });
    expect(nat("autre").props).toMatchObject({ precise: true });
    expect(nat("rapport_activite").props).toMatchObject({ dated: true, expires: false });
  });

  it("refuse un contrat sans ses dates ou sa référence, des dates incohérentes, une production future", async () => {
    const p = await partner();
    const base = { nature: "contrat", title: "Contrat de service", reference: "CTR-2026-01" };
    const missing = await up("u_alice", p.id, { ...base, expires_on: day(300) });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toMatch(/date de production/i);
    expect((await up("u_alice", p.id, { ...base, issued_on: day(-10) })).body.error).toMatch(/expiration/i);
    expect(
      (await up("u_alice", p.id, { nature: "contrat", issued_on: day(-10), expires_on: day(30) })).body.error,
    ).toMatch(/référence/i);
    expect((await up("u_alice", p.id, { ...base, issued_on: day(-10), expires_on: day(-20) })).status).toBe(400);
    expect((await up("u_alice", p.id, { ...base, issued_on: day(5), expires_on: day(30) })).status).toBe(400);
    const ok = await up("u_alice", p.id, { ...base, issued_on: day(-10), expires_on: day(300), notes: "Maintenance" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      title: "Contrat de service",
      nature_code: "contrat",
      official: true,
      issued_on: day(-10),
      expires_on: day(300),
      reference: "CTR-2026-01",
    });
  });

  it("« Autre » exige de préciser la nature ; le nom vaut par défaut celui du fichier", async () => {
    const p = await partner();
    const r = await up("u_alice", p.id, { nature: "autre" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/précise/i);
    const ok = await up("u_alice", p.id, { nature: "autre", other_label: "Plan de masse" });
    expect(ok.body).toMatchObject({ title: "piece.txt", other_label: "Plan de masse" });
  });

  it("la fiche du partenaire décrit chaque pièce et signale celles qui ont expiré", async () => {
    const p = await partner();
    const d = (
      await up("u_alice", p.id, {
        nature: "contrat",
        title: "Bail",
        reference: "B-1",
        issued_on: day(-400),
        expires_on: day(-1),
      })
    ).body;
    const docs = (await g.api("u_alice", "GET", `/api/partners/${p.id}`)).body.documents as Any[];
    expect(docs.find((x) => x.id === d.id)).toMatchObject({ title: "Bail", reference: "B-1", expired: true });
  });

  it("se modifie par son auteur ou un gestionnaire, avec les mêmes contrôles ; une pièce officielle le reste", async () => {
    const p = await partner({ focal_id: "u_karim" });
    const d = (await up("u_karim", p.id, { nature: "rapport_activite", title: "Rapport T1", issued_on: day(-3) })).body;
    const edit = (body: Record<string, unknown>, who = "u_karim") =>
      g.api(who, "PATCH", `/api/partner-documents/${d.id}`, body);
    expect((await edit({ title: "Rapport du 1er trimestre" })).body.title).toBe("Rapport du 1er trimestre");
    expect((await edit({ issued_on: null })).status).toBe(400);
    expect((await edit({ title: "x" }, "u_hugo")).status).toBe(404); // lot S : hors de son périmètre, la fiche n'existe pas
    expect((await edit({ nature_code: "autre", other_label: "Note" })).status).toBe(200);
    const o = (await up("u_alice", p.id, { nature: "convention_signee", title: "Convention", issued_on: day(-5) }))
      .body;
    expect(
      (await g.api("u_alice", "PATCH", `/api/partner-documents/${o.id}`, { nature_code: "autre", other_label: "x" }))
        .status,
    ).toBe(409);
    expect(
      (await g.api("u_alice", "PATCH", `/api/partner-documents/${o.id}`, { title: "Convention signée" })).status,
    ).toBe(200);
    const b = await g.foreignOrg();
    expect((await g.api(b.who, "PATCH", `/api/partner-documents/${d.id}`, { title: "x" })).status).toBe(404);
  });
});

describe("contacts : gestion complète", () => {
  it("un contact jamais cité se supprime ; un contact cité dans le courrier s'archive", async () => {
    const p = await partner({ focal_id: "u_karim" });
    const a = (await g.api("u_karim", "POST", `/api/partners/${p.id}/contacts`, { name: "M. Un" })).body;
    const b = (await g.api("u_karim", "POST", `/api/partners/${p.id}/contacts`, { name: "Mme Deux" })).body;
    expect((await g.api("u_hugo", "DELETE", `/api/partner-contacts/${a.id}`)).status).toBe(404); // lot S : hors de son périmètre, la fiche n'existe pas
    expect((await g.api("u_karim", "DELETE", `/api/partner-contacts/${a.id}`)).status).toBe(200);
    await g.api("u_alice", "POST", "/api/correspondence", {
      direction: "entrant",
      subject: "Lettre",
      received_on: day(),
      partner_id: p.id,
      contact_id: b.id,
    });
    const r = await g.api("u_karim", "DELETE", `/api/partner-contacts/${b.id}`);
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/archiv/i);
    const contacts = (await g.api("u_alice", "GET", `/api/partners/${p.id}`)).body.contacts as Any[];
    expect(contacts.map((c) => c.name)).toEqual(["Mme Deux"]);
    expect(contacts[0].deletable).toBe(false);
    const b2 = await g.foreignOrg();
    expect((await g.api(b2.who, "DELETE", `/api/partner-contacts/${b.id}`)).status).toBe(404);
  });
});
