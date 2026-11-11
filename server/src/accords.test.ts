import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Agreements } from "./agreements.js";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Lot PA2 — accords et pièces de collaboration (docs/CONCEPTION.md § 4.4 à 4.6).
 * Un accord lie un ou plusieurs partenaires ; il entre en vigueur par la signature au parapheur (type contraignant)
 * ou par la date de signature (type non contraignant) ; il reçoit alors son numéro CONV/AAAA/NNNN et son texte
 * est figé. Toute modification passe par un avenant. Alice gère, Karim est point focal, Hugo consulte.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
let n = 0;
const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const year = Number(day().slice(0, 4));
const partner = async (body: Record<string, unknown> = {}) =>
  (
    await g.api("u_alice", "POST", "/api/partners", {
      name: `Partenaire ${++n}`,
      type_code: "organisation_internationale",
      categories: ["ptf"],
      ...body,
    })
  ).body as Any;
const create = (body: Record<string, unknown>, who = "u_alice") =>
  g.api(who, "POST", "/api/agreements", {
    type_code: "protocole_accord",
    title: `Accord ${++n}`,
    content: "Les parties conviennent de coopérer.",
    ...body,
  });
const get = (id: string, who = "u_alice") => g.api(who, "GET", `/api/agreements/${id}`);
const activate = (id: string, body: Record<string, unknown> = { signed_on: day() }, who = "u_alice") =>
  g.api(who, "POST", `/api/agreements/${id}/activate`, body);
const ref = (seq: number, y = year) => `CONV/${y}/${String(seq).padStart(4, "0")}`;

describe("accords : référentiels et création", () => {
  it("types d'accords et natures de pièces sont des référentiels avec leurs règles", async () => {
    const r = (await g.api("u_hugo", "GET", "/api/referentials")).body;
    const conv = r.agreement_type.find((v: Any) => v.code === "convention_partenariat");
    expect(conv.props).toMatchObject({ binding: true, financial: false });
    expect(r.agreement_type.find((v: Any) => v.code === "protocole_accord").props.binding).toBe(false);
    expect(r.agreement_type.find((v: Any) => v.code === "accord_financement").props.financial).toBe(true);
    expect(r.partner_doc_nature.find((v: Any) => v.code === "convention_signee").props.official).toBe(true);
    expect(r.partner_doc_nature.find((v: Any) => v.code === "rapport_activite").props.official).toBe(false);
  });

  it("un accord multipartite naît « En préparation », sans numéro ; ses partenaires passent « En discussion »", async () => {
    const a = await partner();
    const b = await partner();
    const r = await create({ partner_ids: [a.id, b.id], lead_partner_id: b.id, focal_id: "u_karim", end_on: day(400) });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ state: "preparation", reference: null, focal_id: "u_karim" });
    expect(r.body.parties.map((p: Any) => [p.id, p.lead])).toEqual(
      expect.arrayContaining([
        [a.id, false],
        [b.id, true],
      ]),
    );
    expect((await g.api("u_alice", "GET", `/api/partners/${a.id}`)).body.state).toBe("en_discussion");
    expect((await g.api("u_alice", "GET", `/api/partners/${a.id}`)).body.agreements[0].id).toBe(r.body.id);
    expect(await g.ctx.db.one("SELECT 1 FROM activity WHERE kind = 'agreement.created'")).toBeTruthy();
    expect((await get(r.body.id, "u_hugo")).status).toBe(200);
  });

  it("le point focal d'un partenaire prépare un accord avec lui ; un simple membre, non", async () => {
    const p = await partner({ focal_id: "u_karim" });
    expect((await create({ partner_ids: [p.id] }, "u_karim")).status).toBe(200);
    expect((await create({ partner_ids: [p.id] }, "u_hugo")).status).toBe(403);
    const other = await partner();
    expect((await create({ partner_ids: [other.id] }, "u_karim")).status).toBe(403);
  });

  it("refuse type inconnu, accord sans partenaire, chef de file étranger, dates incohérentes", async () => {
    const p = await partner();
    expect((await create({ partner_ids: [p.id], type_code: "inconnu" })).status).toBe(400);
    expect((await create({ partner_ids: [] })).status).toBe(400);
    expect((await create({ partner_ids: [p.id], lead_partner_id: (await partner()).id })).status).toBe(400);
    expect((await create({ partner_ids: [p.id], effective_on: day(10), end_on: day(5) })).status).toBe(400);
    expect((await create({ partner_ids: ["par_inconnu"] })).status).toBe(400);
  });

  it("un partenaire suspendu, clos ou fusionné ne reçoit pas de nouvel accord", async () => {
    const s = await partner();
    await g.api("u_alice", "POST", `/api/partners/${s.id}/state`, { state: "actif" });
    await g.api("u_alice", "POST", `/api/partners/${s.id}/state`, { state: "suspendu", reason: "Gel" });
    expect((await create({ partner_ids: [s.id] })).status).toBe(409);
    const c = await partner();
    await g.api("u_alice", "POST", `/api/partners/${c.id}/state`, { state: "clos", reason: "Fin" });
    expect((await create({ partner_ids: [c.id] })).status).toBe(409);
    const keep = await partner();
    const dup = await partner();
    await g.api("u_alice", "POST", `/api/partners/${dup.id}/merge`, { into_id: keep.id });
    expect((await create({ partner_ids: [dup.id] })).status).toBe(400);
  });

  it("aucun coéquipier IA ne prépare ni ne fait entrer en vigueur un accord", async () => {
    const svc = new Agreements(g.ctx.svc);
    const p = await partner();
    await expect(
      svc.create("ai_atlas", g.org, { type_code: "protocole_accord", title: "IA", content: "x", partner_ids: [p.id] }),
    ).rejects.toMatchObject({ status: 403 });
    const a = (await create({ partner_ids: [p.id] })).body;
    await expect(svc.activate("ai_atlas", a.id, { signed_on: day() })).rejects.toMatchObject({ status: 403 });
  });
});

describe("accords : entrée en vigueur", () => {
  it("un type non contraignant entre en vigueur à sa date de signature : numéro annuel, texte figé, partenaires actifs", async () => {
    const p = await partner();
    const a = (await create({ partner_ids: [p.id], focal_id: "u_karim" })).body;
    expect((await activate(a.id, { signed_on: day(2) })).status).toBe(400);
    const r = await activate(a.id);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ state: "vigueur", reference: ref(1), signed_on: day() });
    expect((await g.api("u_alice", "GET", `/api/partners/${p.id}`)).body.state).toBe("actif");
    expect((await g.api("u_alice", "PATCH", `/api/agreements/${a.id}`, { title: "Autre" })).status).toBe(409);
    expect((await activate(a.id)).status).toBe(409);
    const b = (await create({ partner_ids: [p.id] })).body;
    expect((await activate(b.id)).body.reference).toBe(ref(2));
    // Le numéro suit l'année de signature
    const c = (await create({ partner_ids: [p.id] })).body;
    expect((await activate(c.id, { signed_on: `${year - 1}-12-30` })).body.reference).toBe(ref(1, year - 1));
  });

  it("un type contraignant ne se déclare pas en vigueur sans l'exemplaire signé, et seul un gestionnaire le fait", async () => {
    const p = await partner({ focal_id: "u_karim" });
    const a = (await create({ partner_ids: [p.id], type_code: "convention_partenariat" })).body;
    const r = await activate(a.id);
    expect(r.status).toBe(409);
    expect(r.body.error).toMatch(/parapheur/);
    const up = await g.upload(
      "u_alice",
      `/api/partners/${p.id}/documents?name=convention.txt&nature=convention_signee&agreement_id=${a.id}`,
      Buffer.from("Exemplaire signé"),
    );
    expect(up.status).toBe(200);
    expect((await activate(a.id, { signed_on: day(-30) }, "u_karim")).status).toBe(403);
    const ok = await activate(a.id, { signed_on: day(-30) });
    expect(ok.status).toBe(200);
    expect(ok.body.signed_outside).toBe(true);
  });

  it("au parapheur : la convention est scellée pendant le circuit, entre en vigueur à la signature, revient en préparation si rejetée", async () => {
    const p = await partner();
    const a = (await create({ partner_ids: [p.id], type_code: "convention_partenariat", focal_id: "u_karim" })).body;
    const steps = [{ actor_id: "u_karim", action: "signature" }];
    expect((await g.api("u_hugo", "POST", `/api/agreements/${a.id}/sign`, { steps })).status).toBe(403);
    const s = await g.api("u_alice", "POST", `/api/agreements/${a.id}/sign`, { steps });
    expect(s.status).toBe(200);
    expect(s.body.state).toBe("signature");
    expect(s.body.sign_document.reference).toMatch(/^PAR\//);
    expect((await g.api("u_alice", "PATCH", `/api/agreements/${a.id}`, { content: "Autre" })).status).toBe(409);
    expect((await activate(a.id)).status).toBe(409);
    const doc = s.body.sign_document.id;
    // Rejet : retour en préparation, de nouveau modifiable
    await g.api("u_karim", "POST", `/api/signature/${doc}/decide`, {
      decision: "reject",
      comment: "Article 3 à revoir",
    });
    const back = (await get(a.id)).body;
    expect(back.state).toBe("preparation");
    expect((await g.api("u_alice", "PATCH", `/api/agreements/${a.id}`, { content: "Article 3 revu" })).status).toBe(
      200,
    );
    // Nouveau passage, puis signature
    const again = (await g.api("u_alice", "POST", `/api/agreements/${a.id}/sign`, { steps })).body;
    const signed = await g.api("u_karim", "POST", `/api/signature/${again.sign_document.id}/decide`, {
      decision: "approve",
    });
    expect(signed.status).toBe(200);
    const done = (await get(a.id)).body;
    expect(done).toMatchObject({ state: "vigueur", reference: ref(1), signed_on: day(), signed_outside: false });
    expect(done.content).toBe("Article 3 revu");
    expect((await g.api("u_alice", "GET", `/api/partners/${p.id}`)).body.state).toBe("actif");
  });

  it("un partenaire suspendu entre-temps bloque l'entrée en vigueur", async () => {
    const p = await partner();
    const a = (await create({ partner_ids: [p.id] })).body;
    await g.api("u_alice", "POST", `/api/partners/${p.id}/state`, { state: "actif" });
    await g.api("u_alice", "POST", `/api/partners/${p.id}/state`, { state: "suspendu", reason: "Différend" });
    expect((await activate(a.id)).status).toBe(409);
  });
});

describe("accords : vie de l'accord", () => {
  it("un avenant modifie un accord en vigueur : numéroté, il prolonge l'échéance à son entrée en vigueur", async () => {
    const p = await partner();
    const a = (await create({ partner_ids: [p.id], end_on: day(100) })).body;
    expect(
      (await g.api("u_alice", "POST", `/api/agreements/${a.id}/amend`, { title: "Av", content: "x" })).status,
    ).toBe(409);
    await activate(a.id);
    const av = await g.api("u_alice", "POST", `/api/agreements/${a.id}/amend`, {
      title: "Prolongation d'un an",
      content: "L'échéance est portée au …",
      new_end_on: day(465),
    });
    expect(av.status).toBe(200);
    expect(av.body).toMatchObject({
      state: "preparation",
      parent_id: a.id,
      amendment_no: 1,
      type_code: "protocole_accord",
    });
    expect(av.body.parties.map((x: Any) => x.id)).toEqual([p.id]);
    const on = await activate(av.body.id);
    expect(on.body.reference).toBe(ref(2));
    const parent = (await get(a.id)).body;
    expect(parent.end_on).toBe(day(465));
    expect(parent.amendments.map((x: Any) => [x.id, x.amendment_no, x.reference])).toEqual([[av.body.id, 1, ref(2)]]);
    // Un avenant d'avenant n'existe pas : on amende l'accord lui-même
    expect(
      (await g.api("u_alice", "POST", `/api/agreements/${av.body.id}/amend`, { title: "X", content: "y" })).status,
    ).toBe(400);
  });

  it("résiliation motivée par un gestionnaire ; un partenaire lié par un accord en vigueur ne se clôt pas", async () => {
    const p = await partner({ focal_id: "u_karim" });
    const a = (await create({ partner_ids: [p.id], focal_id: "u_karim" })).body;
    await activate(a.id);
    expect(
      (await g.api("u_alice", "POST", `/api/partners/${p.id}/state`, { state: "clos", reason: "Fin" })).status,
    ).toBe(409);
    expect(
      (await g.api("u_karim", "POST", `/api/agreements/${a.id}/terminate`, { reason: "x", ended_on: day() })).status,
    ).toBe(403);
    expect(
      (await g.api("u_alice", "POST", `/api/agreements/${a.id}/terminate`, { reason: "", ended_on: day() })).status,
    ).toBe(400);
    const t = await g.api("u_alice", "POST", `/api/agreements/${a.id}/terminate`, {
      reason: "Objectifs atteints par anticipation",
      ended_on: day(),
    });
    expect(t.body).toMatchObject({ state: "resilie", ended_reason: "Objectifs atteints par anticipation" });
    expect(
      (await g.api("u_alice", "POST", `/api/partners/${p.id}/state`, { state: "clos", reason: "Fin" })).status,
    ).toBe(200);
  });

  it("un accord dont l'échéance est passée se lit « Échu », sauf reconduction tacite", async () => {
    const p = await partner();
    const a = (await create({ partner_ids: [p.id], end_on: day(10) })).body;
    const b = (await create({ partner_ids: [p.id], end_on: day(10), tacit_renewal: true })).body;
    await activate(a.id, { signed_on: day(-40) });
    await activate(b.id, { signed_on: day(-40) });
    await g.ctx.db.query("UPDATE agreements SET end_on = $1 WHERE id = ANY($2)", [day(-1), [a.id, b.id]]);
    expect((await get(a.id)).body.state).toBe("echu");
    expect((await get(b.id)).body.state).toBe("vigueur");
    expect((await g.api("u_alice", "GET", "/api/agreements?state=echu")).body.map((x: Any) => x.id)).toEqual([a.id]);
    // Un accord échu ne retient plus le partenaire
    expect(
      (await g.api("u_alice", "POST", `/api/agreements/${b.id}/terminate`, { reason: "Dénoncé", ended_on: day() }))
        .status,
    ).toBe(200);
    expect(
      (await g.api("u_alice", "POST", `/api/partners/${p.id}/state`, { state: "clos", reason: "Fin" })).status,
    ).toBe(200);
  });

  it("alerte le point focal à 90, 30 et 7 jours de l'échéance, une fois par seuil", async () => {
    const p = await partner();
    const a = (await create({ partner_ids: [p.id], end_on: day(20), focal_id: "u_karim" })).body;
    await activate(a.id);
    const svc = new Agreements(g.ctx.svc);
    const count = async () =>
      (await g.ctx.db.one<{ n: number }>(
        "SELECT count(*)::int AS n FROM notifications WHERE user_id = 'u_karim' AND kind = 'agreement.ending'",
      ))!.n;
    await svc.sweep(day());
    expect(await count()).toBe(1);
    await svc.sweep(day());
    expect(await count()).toBe(1);
    await svc.sweep(day(15));
    expect(await count()).toBe(2);
  });

  it("une préparation se supprime ; un accord entré en vigueur, jamais", async () => {
    const p = await partner();
    const a = (await create({ partner_ids: [p.id] })).body;
    expect((await g.api("u_hugo", "DELETE", `/api/agreements/${a.id}`)).status).toBe(403);
    expect((await g.api("u_alice", "DELETE", `/api/agreements/${a.id}`)).status).toBe(200);
    const b = (await create({ partner_ids: [p.id] })).body;
    await activate(b.id);
    expect((await g.api("u_alice", "DELETE", `/api/agreements/${b.id}`)).status).toBe(409);
  });

  it("confidentialité héritée des partenaires ; registre filtrable ; aucune autre organisation n'y accède", async () => {
    const secret = await partner({ confidential: true });
    const open = await partner();
    const c = (await create({ partner_ids: [secret.id] })).body;
    expect(c.confidential).toBe(true);
    expect((await get(c.id, "u_hugo")).status).toBe(404);
    const o = (await create({ partner_ids: [open.id] })).body;
    await activate(o.id);
    const reg = (await g.api("u_hugo", "GET", "/api/agreements")).body as Any[];
    expect(reg.map((x) => x.id)).toEqual([o.id]);
    expect(
      (await g.api("u_alice", "GET", `/api/agreements?state=preparation&partner_id=${secret.id}`)).body.length,
    ).toBe(1);
    const b = await g.foreignOrg();
    expect((await get(o.id, b.who)).status).toBe(404);
    expect((await g.api(b.who, "PATCH", `/api/agreements/${o.id}`, { title: "x" })).status).toBe(404);
    expect((await g.api(b.who, "GET", "/api/agreements")).body.length).toBe(0);
  });
});

describe("pièces de collaboration", () => {
  const up = (who: string, partnerId: string, q: string, data = "contenu") =>
    g.upload(who, `/api/partners/${partnerId}/documents?${q}`, Buffer.from(data));

  it("se joignent au partenaire ou à un accord, par nature ; une pièce officielle ne se supprime pas", async () => {
    const p = await partner({ focal_id: "u_karim" });
    const a = (await create({ partner_ids: [p.id] })).body;
    expect((await up("u_karim", p.id, "name=rapport.txt&nature=inconnue")).status).toBe(400);
    expect((await up("u_karim", p.id, "name=x.exe&nature=autre", "MZ\x90\x00")).status).toBe(415);
    expect((await up("u_hugo", p.id, "name=r.txt&nature=rapport_activite")).status).toBe(403);
    const other = (await create({ partner_ids: [(await partner()).id] })).body;
    expect((await up("u_karim", p.id, `name=r.txt&nature=autre&agreement_id=${other.id}`)).status).toBe(400);
    const r = await up("u_karim", p.id, "name=rapport.txt&nature=rapport_activite");
    expect(r.status).toBe(200);
    const o = await up("u_karim", p.id, `name=conv.txt&nature=convention_signee&agreement_id=${a.id}`);
    expect(o.status).toBe(200);
    const detail = (await g.api("u_hugo", "GET", `/api/partners/${p.id}`)).body;
    expect(detail.documents.map((d: Any) => [d.filename, d.nature_code, d.agreement_id])).toEqual(
      expect.arrayContaining([
        ["rapport.txt", "rapport_activite", null],
        ["conv.txt", "convention_signee", a.id],
      ]),
    );
    expect((await get(a.id)).body.documents.map((d: Any) => d.filename)).toEqual(["conv.txt"]);
    const dl = await g.api("u_hugo", "GET", `/api/partner-documents/${r.body.id}`);
    expect(dl.status).toBe(200);
    expect(dl.raw.toString()).toBe("contenu");
    expect((await g.api("u_hugo", "DELETE", `/api/partner-documents/${r.body.id}`)).status).toBe(403);
    expect((await g.api("u_alice", "DELETE", `/api/partner-documents/${o.body.id}`)).status).toBe(409);
    expect((await g.api("u_karim", "DELETE", `/api/partner-documents/${r.body.id}`)).status).toBe(200);
  });

  it("une pièce d'un partenaire confidentiel ou d'une autre organisation reste inaccessible", async () => {
    const p = await partner({ confidential: true });
    const d = await up("u_alice", p.id, "name=note.txt&nature=autre");
    expect((await g.api("u_hugo", "GET", `/api/partner-documents/${d.body.id}`)).status).toBe(404);
    const b = await g.foreignOrg();
    expect((await g.api(b.who, "GET", `/api/partner-documents/${d.body.id}`)).status).toBe(404);
  });
});
