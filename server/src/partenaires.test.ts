import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { Partners } from "./partners.js";

/*
 * Lot PA1 — l'annuaire des partenaires (docs/CONCEPTION.md, partie 4).
 * Un annuaire unique des tiers : type et catégories paramétrables, états à cycle fixe, contacts, points focaux,
 * doublons refusés, fusion, notes d'échange et historique. Alice gère (propriétaire), Karim consulte (membre).
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
let n = 0;
const create = (body: Record<string, unknown> = {}, who = "u_alice") =>
  g.api(who, "POST", "/api/partners", {
    name: `Partenaire ${++n}`,
    type_code: "organisation_internationale",
    categories: ["ptf"],
    ...body,
  });
const get = (id: string, who = "u_alice") => g.api(who, "GET", `/api/partners/${id}`);
const state = (id: string, body: Record<string, unknown>, who = "u_alice") =>
  g.api(who, "POST", `/api/partners/${id}/state`, body);
const list = async (q = "", who = "u_alice") => (await g.api(who, "GET", `/api/partners${q}`)).body as Any[];
const sysAdmin = () => g.ctx.db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_alice'");

describe("partenaires : référentiels", () => {
  it("types et catégories sont des référentiels lus par tous, avec leurs propriétés", async () => {
    const r = (await g.api("u_karim", "GET", "/api/referentials")).body;
    const types = r.partner_type.map((v: Any) => v.code);
    expect(types).toEqual(
      expect.arrayContaining(["institution_publique", "entreprise_privee", "etablissement_public"]),
    );
    expect(r.partner_type.find((v: Any) => v.code === "institution_publique").props.public).toBe(true);
    const ptf = r.partner_category.find((v: Any) => v.code === "ptf");
    expect(ptf.label).toBe("Partenaire technique et financier");
    expect(ptf.props.financial).toBe(true);
    expect(r.partner_category.find((v: Any) => v.code === "prestataire").props.supplier).toBe(true);
  });

  it("l'administrateur système ajoute un type ; une valeur archivée n'est plus proposée à la création", async () => {
    await sysAdmin();
    const added = await g.api("u_alice", "POST", "/api/admin/referentials", {
      list: "partner_type",
      label: "Fondation",
      props: { public: false },
    });
    expect(added.status).toBe(200);
    expect((await create({ type_code: "fondation" })).status).toBe(200);
    await g.api("u_alice", "PATCH", `/api/admin/referentials/${added.body.id}`, { archived: true });
    const r = await create({ type_code: "fondation" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/archivé/);
    // Une propriété inconnue pour la liste est refusée
    expect(
      (
        await g.api("u_alice", "POST", "/api/admin/referentials", {
          list: "partner_category",
          label: "X",
          props: { provincial: true },
        })
      ).status,
    ).toBe(400);
  });

  it("type ou catégorie inconnus sont refusés ; le type est obligatoire", async () => {
    expect((await create({ type_code: "inexistant" })).status).toBe(400);
    expect((await create({ categories: ["inexistante"] })).status).toBe(400);
    expect((await create({ type_code: "" })).status).toBe(400);
  });
});

describe("partenaires : fiche et droits", () => {
  it("le gestionnaire crée une fiche « Identifiée », tracée ; le membre consulte sans écrire", async () => {
    const r = await create({
      name: "Banque de développement fictive",
      acronym: "BDF",
      categories: ["ptf", "partenaire_technique"],
      country: "CD",
      focal_id: "u_karim",
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ state: "identifie", acronym: "BDF", focal_id: "u_karim", country: "CD" });
    expect(r.body.categories.sort()).toEqual(["partenaire_technique", "ptf"]);
    expect(r.body.history[0].kind).toBe("created");
    const logged = await g.ctx.db.one("SELECT 1 FROM activity WHERE kind = 'partner.created' AND org_id = $1", [g.org]);
    expect(logged).toBeTruthy();
    expect((await get(r.body.id, "u_karim")).status).toBe(200);
    expect((await list("", "u_karim")).some((p) => p.id === r.body.id)).toBe(true);
    expect((await create({}, "u_hugo")).status).toBe(403);
  });

  it("un pays inconnu, un site invalide ou un point focal hors institution sont refusés", async () => {
    expect((await create({ country: "ZZZ" })).status).toBe(400);
    expect((await create({ website: "javascript:alert(1)" })).status).toBe(400);
    expect((await create({ focal_id: "ai_atlas" })).status).toBe(400);
    expect((await create({ focal_id: "inconnu" })).status).toBe(400);
  });

  it("le point focal modifie la présentation, pas le point focal, la confidentialité ni le type", async () => {
    const p = (await create({ focal_id: "u_karim" })).body;
    const ok = await g.api("u_karim", "PATCH", `/api/partners/${p.id}`, { description: "Appui aux schémas" });
    expect(ok.status).toBe(200);
    expect(ok.body.description).toBe("Appui aux schémas");
    for (const body of [{ focal_id: "u_hugo" }, { confidential: true }, { type_code: "entreprise_privee" }])
      expect((await g.api("u_karim", "PATCH", `/api/partners/${p.id}`, body)).status).toBe(403);
    // Un membre qui n'est pas point focal ne modifie rien
    const other = (await create()).body;
    expect((await g.api("u_karim", "PATCH", `/api/partners/${other.id}`, { description: "x" })).status).toBe(403);
  });

  it("des points focaux supplémentaires partagent les droits du point focal principal", async () => {
    const p = (await create({ focal_ids: ["u_karim"] })).body;
    expect(p.focal_ids).toEqual(["u_karim"]);
    expect((await g.api("u_karim", "PATCH", `/api/partners/${p.id}`, { description: "y" })).status).toBe(200);
  });

  it("une fiche confidentielle n'est visible que des gestionnaires et de ses points focaux", async () => {
    const p = (await create({ confidential: true })).body;
    expect((await get(p.id, "u_karim")).status).toBe(404);
    expect((await list("", "u_karim")).some((x) => x.id === p.id)).toBe(false);
    await g.api("u_alice", "PATCH", `/api/partners/${p.id}`, { focal_id: "u_karim" });
    expect((await get(p.id, "u_karim")).status).toBe(200);
  });

  it("aucun coéquipier IA ne crée ni ne modifie un partenaire", async () => {
    const svc = new Partners(g.ctx.svc);
    await expect(
      svc.create("ai_atlas", g.org, { name: "IA", type_code: "entreprise_privee", categories: [] }),
    ).rejects.toMatchObject({ status: 403 });
    const p = (await create()).body;
    await expect(svc.update("ai_atlas", p.id, { description: "x" })).rejects.toMatchObject({ status: 403 });
    await expect(svc.setState("ai_atlas", p.id, { state: "en_discussion" })).rejects.toMatchObject({ status: 403 });
  });

  it("une autre organisation n'atteint aucune fiche", async () => {
    const p = (await create()).body;
    const b = await g.foreignOrg();
    expect((await get(p.id, b.who)).status).toBe(404);
    expect((await g.api(b.who, "PATCH", `/api/partners/${p.id}`, { description: "x" })).status).toBe(404);
    expect((await g.api(b.who, "POST", `/api/partners/${p.id}/contacts`, { name: "X" })).status).toBe(404);
    expect((await list("", b.who)).length).toBe(0);
  });
});

describe("partenaires : doublons et fusion", () => {
  it("même nom (casse, accents, ponctuation), même sigle ou même identifiant officiel : refusé avec la fiche existante", async () => {
    const p = (await create({ name: "Ministère de l'Aménagement", acronym: "MAT", official_id: "NIF-123" })).body;
    for (const body of [
      { name: "ministere de l amenagement" },
      { name: "Autre nom", acronym: "m.a.t" },
      { name: "Encore un autre", official_id: "nif-123" },
    ]) {
      const r = await create(body);
      expect(r.status).toBe(409);
      expect(r.body.duplicate).toMatchObject({ id: p.id, name: "Ministère de l'Aménagement" });
    }
    // Renommer une fiche vers un nom déjà pris est refusé de même
    const q = (await create({ name: "Ville fictive" })).body;
    expect(
      (await g.api("u_alice", "PATCH", `/api/partners/${q.id}`, { name: "Ministère de l’Aménagement" })).status,
    ).toBe(409);
  });

  it("la fusion déplace contacts, notes, catégories et points focaux ; la fiche absorbée renvoie vers l'autre", async () => {
    const keep = (await create({ name: "Agence fictive", categories: ["ptf"] })).body;
    const dup = (
      await create({ name: "Agence fictive (doublon)", categories: ["partenaire_technique"], focal_ids: ["u_karim"] })
    ).body;
    await g.api("u_alice", "POST", `/api/partners/${dup.id}/contacts`, { name: "Mme Contact" });
    await g.api("u_alice", "POST", `/api/partners/${dup.id}/notes`, { body: "Premier échange" });
    expect((await g.api("u_karim", "POST", `/api/partners/${dup.id}/merge`, { into_id: keep.id })).status).toBe(403);
    expect((await g.api("u_alice", "POST", `/api/partners/${dup.id}/merge`, { into_id: dup.id })).status).toBe(400);
    const r = await g.api("u_alice", "POST", `/api/partners/${dup.id}/merge`, { into_id: keep.id });
    expect(r.status).toBe(200);
    expect(r.body.id).toBe(keep.id);
    expect(r.body.categories.sort()).toEqual(["partenaire_technique", "ptf"]);
    expect(r.body.contacts.map((c: Any) => c.name)).toContain("Mme Contact");
    expect(r.body.notes.map((x: Any) => x.body)).toContain("Premier échange");
    expect(r.body.focal_ids).toContain("u_karim");
    expect(r.body.history.some((h: Any) => h.kind === "merged")).toBe(true);
    const gone = await get(dup.id);
    expect(gone.status).toBe(200);
    expect(gone.body.merged_into).toBe(keep.id);
    expect((await list()).some((p) => p.id === dup.id)).toBe(false);
    // Plus rien ne s'écrit sur une fiche absorbée, et l'on ne fusionne pas vers elle
    expect((await g.api("u_alice", "PATCH", `/api/partners/${dup.id}`, { description: "x" })).status).toBe(409);
    const third = (await create()).body;
    expect((await g.api("u_alice", "POST", `/api/partners/${third.id}/merge`, { into_id: dup.id })).status).toBe(400);
    // Son nom redevient libre
    expect((await create({ name: "Agence fictive (doublon)" })).status).toBe(200);
  });
});

describe("partenaires : états", () => {
  it("suit le cycle Identifié → En discussion → Actif → Suspendu → Actif → Clos, avec motif pour suspendre et clore", async () => {
    const p = (await create()).body;
    expect((await state(p.id, { state: "suspendu", reason: "x" })).status).toBe(409);
    expect((await state(p.id, { state: "en_discussion" })).body.state).toBe("en_discussion");
    expect((await state(p.id, { state: "actif" })).body.state).toBe("actif");
    expect((await state(p.id, { state: "actif" })).status).toBe(409);
    const noReason = await state(p.id, { state: "suspendu" });
    expect(noReason.status).toBe(400);
    expect(noReason.body.error).toMatch(/motif/i);
    const s = await state(p.id, { state: "suspendu", reason: "Gel des financements" });
    expect(s.body).toMatchObject({ state: "suspendu", state_reason: "Gel des financements" });
    expect((await state(p.id, { state: "actif" })).body.state).toBe("actif");
    expect((await state(p.id, { state: "clos" })).status).toBe(400);
    const c = await state(p.id, { state: "clos", reason: "Fin du programme" });
    expect(c.body.state).toBe("clos");
    expect(c.body.closed_at).toBeTruthy();
    expect(c.body.history.filter((h: Any) => h.kind === "state").length).toBe(5);
    // Rouverte par un gestionnaire, avec motif
    expect((await state(p.id, { state: "actif" })).status).toBe(409);
    expect((await state(p.id, { state: "en_discussion", reason: "Nouveau programme" })).body.state).toBe(
      "en_discussion",
    );
  });

  it("le point focal fait avancer la discussion ; suspendre, clore et rouvrir sont réservés aux gestionnaires", async () => {
    const p = (await create({ focal_id: "u_karim" })).body;
    expect((await state(p.id, { state: "en_discussion" }, "u_karim")).status).toBe(200);
    expect((await state(p.id, { state: "actif" }, "u_karim")).status).toBe(200);
    expect((await state(p.id, { state: "suspendu", reason: "x" }, "u_karim")).status).toBe(403);
    expect((await state(p.id, { state: "clos", reason: "x" }, "u_karim")).status).toBe(403);
  });

  it("une fiche close ou suspendue n'est plus proposée par défaut, mais se retrouve par filtre", async () => {
    const p = (await create()).body;
    await state(p.id, { state: "clos", reason: "Erreur de périmètre" });
    expect((await list("?selectable=1")).some((x) => x.id === p.id)).toBe(false);
    expect((await list("?state=clos")).some((x) => x.id === p.id)).toBe(true);
  });

  it("une fiche jamais sortie de « Identifié » et sans note se supprime ; sinon elle se clôt", async () => {
    const a = (await create()).body;
    expect((await g.api("u_karim", "DELETE", `/api/partners/${a.id}`)).status).toBe(403);
    expect((await g.api("u_alice", "DELETE", `/api/partners/${a.id}`)).status).toBe(200);
    expect((await get(a.id)).status).toBe(404);
    const b = (await create()).body;
    await state(b.id, { state: "en_discussion" });
    expect((await g.api("u_alice", "DELETE", `/api/partners/${b.id}`)).status).toBe(409);
    const c = (await create()).body;
    await g.api("u_alice", "POST", `/api/partners/${c.id}/notes`, { body: "Appel" });
    expect((await g.api("u_alice", "DELETE", `/api/partners/${c.id}`)).status).toBe(409);
  });
});

describe("partenaires : contacts et historique", () => {
  it("contacts : un seul principal, archivés et non supprimés, adresse contrôlée", async () => {
    const p = (await create({ focal_id: "u_karim" })).body;
    const c1 = await g.api("u_karim", "POST", `/api/partners/${p.id}/contacts`, {
      name: "M. Premier",
      title: "Chargé de programme",
      email: "premier@exemple.test",
      principal: true,
    });
    expect(c1.status).toBe(200);
    const c2 = await g.api("u_alice", "POST", `/api/partners/${p.id}/contacts`, {
      name: "Mme Seconde",
      principal: true,
    });
    const contacts = (await get(p.id)).body.contacts as Any[];
    expect(contacts.filter((c) => c.principal).map((c) => c.name)).toEqual(["Mme Seconde"]);
    expect(
      (await g.api("u_alice", "POST", `/api/partners/${p.id}/contacts`, { name: "X", email: "pas-une-adresse" }))
        .status,
    ).toBe(400);
    expect((await g.api("u_hugo", "POST", `/api/partners/${p.id}/contacts`, { name: "Y" })).status).toBe(403);
    const arch = await g.api("u_alice", "PATCH", `/api/partner-contacts/${c2.body.id}`, { archived: true });
    expect(arch.status).toBe(200);
    const after = (await get(p.id)).body.contacts as Any[];
    expect(after.find((c) => c.id === c2.body.id).archived).toBe(true);
    expect(after.find((c) => c.id === c2.body.id).principal).toBe(false);
    expect((await g.api("u_hugo", "PATCH", `/api/partner-contacts/${c1.body.id}`, { name: "Z" })).status).toBe(403);
  });

  it("notes d'échange : datées, jamais dans le futur, versées à l'historique et non modifiables", async () => {
    const p = (await create({ focal_id: "u_karim" })).body;
    expect((await g.api("u_karim", "POST", `/api/partners/${p.id}/notes`, { body: "" })).status).toBe(400);
    expect(
      (await g.api("u_karim", "POST", `/api/partners/${p.id}/notes`, { body: "x", happened_on: "2999-01-01" })).status,
    ).toBe(400);
    const r = await g.api("u_karim", "POST", `/api/partners/${p.id}/notes`, {
      body: "Entretien téléphonique avec le chargé de programme",
      happened_on: "2026-11-02",
    });
    expect(r.status).toBe(200);
    expect(r.body.notes[0]).toMatchObject({ happened_on: "2026-11-02", author_name: "Karim Benali" });
    expect((await g.api("u_hugo", "POST", `/api/partners/${p.id}/notes`, { body: "x" })).status).toBe(403);
  });

  it("la liste se filtre par état, type, catégorie et recherche, et compte les contacts", async () => {
    const a = (
      await create({
        name: "Université fictive du Nord",
        type_code: "universite",
        categories: ["partenaire_technique"],
      })
    ).body;
    await g.api("u_alice", "POST", `/api/partners/${a.id}/contacts`, { name: "Doyen" });
    await create({ name: "Entreprise fictive", type_code: "entreprise_privee", categories: ["prestataire"] });
    expect((await list("?type=universite")).map((p) => p.id)).toEqual([a.id]);
    expect((await list("?category=partenaire_technique")).map((p) => p.id)).toEqual([a.id]);
    expect((await list("?q=nord")).map((p) => p.id)).toEqual([a.id]);
    expect((await list("?q=%25")).length).toBe(0);
    expect((await list("?type=universite"))[0].contacts_count).toBe(1);
  });
});
