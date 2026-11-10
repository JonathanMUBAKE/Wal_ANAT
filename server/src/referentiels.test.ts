import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Référentiels paramétrables de l'institution (docs/PARAMETRAGE.md) : types d'activités et types d'entités.
 * Lus par tous, modifiés par le seul administrateur système, jamais supprimés, toujours tracés.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Value = {
  id: string;
  list: string;
  code: string;
  label: string;
  plural: string;
  color: string;
  icon: string;
  archived: boolean;
  props: Record<string, unknown>;
};
const lists = async (who = "u_alice") => (await g.api(who, "GET", "/api/referentials")).body as Record<string, Value[]>;
const sysAdmin = () => g.ctx.db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_alice'");
const add = (body: Record<string, unknown>, who = "u_alice") => g.api(who, "POST", "/api/admin/referentials", body);
const edit = (id: string, body: Record<string, unknown>) =>
  g.api("u_alice", "PATCH", `/api/admin/referentials/${id}`, body);
const value = async (list: string, code: string) => (await lists())[list].find((v) => v.code === code) as Value;

describe("référentiels : lecture", () => {
  it("chaque personne de l'institution lit les types d'activités et d'entités, avec leurs propriétés", async () => {
    const r = await lists("u_karim");
    expect(r.activity_type.map((v) => v.code)).toEqual(["commission", "conference", "rendez_vous", "interne"]);
    expect(r.activity_type.find((v) => v.code === "rendez_vous")?.props.confidential_default).toBe(true);
    expect(r.activity_type.find((v) => v.code === "interne")?.props.tracks_progress).toBe(true);
    expect(r.unit_type.find((v) => v.code === "representation_provinciale")?.props.provincial).toBe(true);
  });
});

describe("référentiels : réservés à l'administrateur système", () => {
  it("refuse toute modification à un propriétaire d'organisation qui n'est pas administrateur système", async () => {
    expect((await add({ list: "activity_type", label: "Mission de terrain" })).status).toBe(403);
    const v = await value("activity_type", "commission");
    expect((await edit(v.id, { label: "Autre" })).status).toBe(403);
  });

  it("ajoute un type d'activité aussitôt utilisable et compté au tableau de bord", async () => {
    await sysAdmin();
    const r = await add({
      list: "activity_type",
      label: "Mission de terrain",
      plural: "Missions de terrain",
      color: "teal",
      icon: "map",
      props: { tracks_progress: true },
    });
    expect(r.status).toBe(200);
    expect(r.body.code).toBe("mission_de_terrain");
    expect((await add({ list: "activity_type", label: "mission de terrain" })).status).toBe(400);
    const a = await g.api("u_alice", "POST", "/api/activities", { kind: "mission_de_terrain", title: "Kwilu" });
    expect(a.status).toBe(200);
    const o = (await g.api("u_alice", "GET", "/api/pilotage")).body;
    expect(o.counters.by_type.find((t: { code: string }) => t.code === "mission_de_terrain")).toMatchObject({
      label: "Mission de terrain",
      count: 1,
    });
    expect((await g.api("u_alice", "POST", "/api/activities", { kind: "inconnu", title: "X" })).status).toBe(400);
  });

  it("une propriété remplace la règle figée : confidentialité par défaut", async () => {
    await sysAdmin();
    await add({ list: "activity_type", label: "Audience privée", props: { confidential_default: true } });
    const a = (await g.api("u_alice", "POST", "/api/activities", { kind: "audience_privee", title: "Audience" })).body;
    expect(a.confidential).toBe(true);
    const c = (await g.api("u_alice", "POST", "/api/activities", { kind: "commission", title: "Commission" })).body;
    expect(c.confidential).toBe(false);
  });

  it("renommer garde le code : les dossiers existants suivent", async () => {
    await sysAdmin();
    const a = (await g.api("u_alice", "POST", "/api/activities", { kind: "rendez_vous", title: "Ministre" })).body;
    const v = await value("activity_type", "rendez_vous");
    const r = await edit(v.id, { label: "Audience", plural: "Audiences", code: "audience" });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ code: "rendez_vous", label: "Audience" });
    expect((await g.api("u_alice", "GET", `/api/activities/${a.id}`)).body.kind).toBe("rendez_vous");
  });

  it("archiver retire la valeur des choix sans toucher aux dossiers ; la dernière valeur active reste", async () => {
    await sysAdmin();
    const a = (await g.api("u_alice", "POST", "/api/activities", { kind: "conference", title: "Forum" })).body;
    const conf = await value("activity_type", "conference");
    expect((await edit(conf.id, { archived: true })).body.archived).toBe(true);
    const refused = await g.api("u_alice", "POST", "/api/activities", { kind: "conference", title: "Autre" });
    expect(refused.status).toBe(400);
    expect(refused.body.error).toMatch(/archivé/);
    expect((await g.api("u_alice", "GET", `/api/activities/${a.id}`)).status).toBe(200);
    for (const code of ["commission", "rendez_vous"])
      await edit((await value("activity_type", code)).id, { archived: true });
    expect((await edit((await value("activity_type", "interne")).id, { archived: true })).status).toBe(409);
  });

  it("refuse une couleur, une icône ou une propriété inconnues, et trace chaque changement", async () => {
    await sysAdmin();
    expect((await add({ list: "activity_type", label: "A", color: "fluo" })).status).toBe(400);
    expect((await add({ list: "activity_type", label: "B", icon: "licorne" })).status).toBe(400);
    expect((await add({ list: "activity_type", label: "C", props: { provincial: true } })).status).toBe(400);
    expect((await add({ list: "inconnue", label: "D" })).status).toBe(400);
    const v = (await add({ list: "unit_type", label: "Bureau de liaison", props: { provincial: true } })).body;
    await edit(v.id, { label: "Bureau provincial de liaison" });
    const kinds = await g.ctx.db.query<{ kind: string }>(
      "SELECT kind FROM activity WHERE kind LIKE 'referential.%' ORDER BY created_at",
    );
    expect(kinds.map((k) => k.kind)).toEqual(["referential.created", "referential.updated"]);
  });
});

describe("structure : les types d'entités viennent du référentiel, provinces comprises", () => {
  it("accepte un code ou un libellé connu, refuse un type inconnu", async () => {
    const root = (await g.api("u_alice", "GET", "/api/org/units")).body[0].id;
    const unit = (kind: string) =>
      g.api("u_alice", "POST", "/api/org/units", { name: `E ${Math.random()}`, parent_id: root, kind });
    const p = await unit("representation_provinciale");
    expect(p.status).toBe(200);
    const s = await unit("Service");
    expect(s.status).toBe(200);
    const units = (await g.api("u_alice", "GET", "/api/org/units")).body as { id: string; kind: string }[];
    expect(units.find((u) => u.id === p.body.id)?.kind).toBe("representation_provinciale");
    expect(units.find((u) => u.id === s.body.id)?.kind).toBe("service");
    expect((await unit("Galaxie")).status).toBe(400);
    expect((await g.api("u_alice", "PATCH", `/api/units/${s.body.id}`, { kind: "Galaxie" })).status).toBe(400);
  });
});
