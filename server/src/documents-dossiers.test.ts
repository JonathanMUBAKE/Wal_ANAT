import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";
import { localDate } from "./services.js";

/*
 * Documents des dossiers : l'espace Documents d'un projet, la pièce d'un courrier, les documents d'une activité.
 * Même formulaire selon la nature que pour les partenaires ; chaque document suit les droits de son dossier.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const day = (offset = 0) => localDate(new Date(Date.now() + offset * 864e5));
const up = (who: string, owner: string, ownerId: string, q: Record<string, string>, data = "contenu") =>
  g.upload(
    who,
    `/api/dossier-documents?${new URLSearchParams({ owner, owner_id: ownerId, name: "piece.txt", ...q })}`,
    Buffer.from(data),
  );
const list = (who: string, owner: string, ownerId: string) =>
  g.api(who, "GET", `/api/dossier-documents?owner=${owner}&owner_id=${ownerId}`);

describe("documents des dossiers", () => {
  it("projet : l'équipe dépose et décrit ses documents ; un lecteur consulte ; un officiel reste", async () => {
    const prj = await g.project();
    expect((await up("u_alice", "project", prj, { nature: "contrat", title: "Contrat" })).status).toBe(400);
    const c = await up("u_alice", "project", prj, {
      nature: "contrat",
      title: "Contrat de maîtrise d'œuvre",
      reference: "MO-2026-03",
      issued_on: day(-20),
      expires_on: day(200),
    });
    expect(c.status).toBe(200);
    expect(c.body).toMatchObject({ title: "Contrat de maîtrise d'œuvre", official: true, can: { delete: false } });
    // Hors de l'équipe : le dossier n'existe pas
    expect((await list("u_karim", "project", prj)).status).toBe(404);
    await g.api("u_alice", "PUT", `/api/projects/${prj}/members/u_karim`, { role: "viewer" });
    expect((await list("u_karim", "project", prj)).body.documents.map((d: Any) => d.id)).toEqual([c.body.id]);
    expect((await up("u_karim", "project", prj, { nature: "autre", other_label: "Note" })).status).toBe(403);
    await g.api("u_alice", "PUT", `/api/projects/${prj}/members/u_karim`, { role: "editor" });
    const k = await up("u_karim", "project", prj, { nature: "rapport_activite", title: "Rapport", issued_on: day(-1) });
    expect(k.status).toBe(200);
    const dl = await g.api("u_karim", "GET", `/api/dossier-documents/${k.body.id}`);
    expect(dl.raw.toString()).toBe("contenu");
    expect(
      (await g.api("u_karim", "PATCH", `/api/dossier-documents/${k.body.id}`, { title: "Rapport d'étape" })).body.title,
    ).toBe("Rapport d'étape");
    expect(
      (
        await g.api("u_alice", "PATCH", `/api/dossier-documents/${c.body.id}`, {
          nature_code: "autre",
          other_label: "x",
        })
      ).status,
    ).toBe(409);
    expect((await g.api("u_alice", "DELETE", `/api/dossier-documents/${c.body.id}`)).status).toBe(409);
    expect((await g.api("u_alice", "DELETE", `/api/dossier-documents/${k.body.id}`)).status).toBe(200);
  });

  it("courrier : la pièce numérisée se joint au registre ; l'agent imputé la complète ; le confidentiel reste caché", async () => {
    const m = (
      await g.api("u_alice", "POST", "/api/correspondence", {
        direction: "entrant",
        subject: "Demande d'appui",
        correspondent: "Gouvernorat fictif",
        received_on: day(),
      })
    ).body;
    const scan = await up("u_alice", "mail", m.id, {
      nature: "correspondance",
      title: "Lettre du gouverneur",
      reference: "GOUV/2026/118",
      issued_on: day(-3),
    });
    expect(scan.status).toBe(200);
    expect((await list("u_hugo", "mail", m.id)).body).toMatchObject({
      documents: [{ id: scan.body.id }],
      can: { add: false },
    });
    expect((await up("u_hugo", "mail", m.id, { nature: "autre", other_label: "Annexe" })).status).toBe(403);
    await g.api("u_alice", "POST", `/api/correspondence/${m.id}/assign`, { assignee_id: "u_hugo" });
    expect((await up("u_hugo", "mail", m.id, { nature: "autre", other_label: "Annexe" })).status).toBe(200);
    const secret = (
      await g.api("u_alice", "POST", "/api/correspondence", {
        direction: "entrant",
        subject: "Confidentiel",
        correspondent: "X",
        received_on: day(),
        confidential: true,
      })
    ).body;
    const d = await up("u_alice", "mail", secret.id, { nature: "autre", other_label: "Note" });
    expect((await list("u_karim", "mail", secret.id)).status).toBe(404);
    expect((await g.api("u_karim", "GET", `/api/dossier-documents/${d.body.id}`)).status).toBe(404);
  });

  it("activité : son responsable dépose ; les autres consultent ; une autre organisation n'atteint rien", async () => {
    const a = (
      await g.api("u_alice", "POST", "/api/activities", { kind: "commission", title: "Commission", lead_id: "u_karim" })
    ).body;
    const r = await up("u_karim", "activity", a.id, {
      nature: "compte_rendu",
      title: "Compte rendu de mission",
      issued_on: day(),
    });
    expect(r.status).toBe(200);
    expect((await list("u_hugo", "activity", a.id)).body.documents.length).toBe(1);
    expect((await up("u_hugo", "activity", a.id, { nature: "autre", other_label: "Note" })).status).toBe(403);
    const b = await g.foreignOrg();
    expect((await list(b.who, "activity", a.id)).status).toBe(404);
    expect((await g.api(b.who, "GET", `/api/dossier-documents/${r.body.id}`)).status).toBe(404);
    expect((await g.api(b.who, "DELETE", `/api/dossier-documents/${r.body.id}`)).status).toBe(404);
    expect((await g.api("u_alice", "GET", "/api/dossier-documents?owner=inconnu&owner_id=x")).status).toBe(400);
  });
});
