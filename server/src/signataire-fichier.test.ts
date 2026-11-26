import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Thème 6 de l'analyse (docs/ANALYSE-MODULES.md), PH-1 : le signataire signe le document réel. L'auteur joint le
 * fichier (PDF, Word) ; il est scellé par son empreinte à l'entrée dans le circuit ; une fois signé, l'outil produit
 * le bordereau des visas et signatures, qui cite l'empreinte du fichier signé.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
});
afterEach(() => g.ctx.app.close());

type Any = any;
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
const draft = async () =>
  (
    await g.api("u_alice", "POST", "/api/signature", {
      title: "Note au ministère",
      body: "Voir le fichier joint",
      steps: [
        { actor_id: "u_karim", action: "visa" },
        { actor_id: "u_hugo", action: "signature" },
      ],
    })
  ).body as Any;
const attach = (who: string, id: string, data = PDF, name = "note.pdf") =>
  g.upload(who, `/api/signature/${id}/file?name=${encodeURIComponent(name)}`, data);

describe("signataire : signature de fichiers (PH-1)", () => {
  it("l'auteur joint le fichier ; il est scellé à l'entrée dans le circuit", async () => {
    const d = await draft();
    expect((await attach("u_karim", d.id)).status).toBe(403);
    const up = await attach("u_alice", d.id);
    expect(up.status).toBe(200);
    expect(up.body.file).toMatchObject({ name: "note.pdf", mime: "application/pdf", size: PDF.length });
    expect(up.body.file.hash).toHaveLength(64);
    // Un exécutable déguisé est refusé
    expect((await attach("u_alice", d.id, Buffer.from("MZ\x90\x00binaire"), "note.pdf")).status).toBe(400);
    const s = (await g.api("u_alice", "POST", `/api/signature/${d.id}/start`)).body;
    expect(s.intact).toBe(true);
    // Dans le circuit, le fichier ne se remplace plus
    expect((await attach("u_alice", d.id)).status).toBe(409);
    // Une altération directe du fichier est détectée
    await g.ctx.db.query("UPDATE sign_documents SET file_data = $1 WHERE id = $2", [Buffer.from("%PDF-1.4 falsifié"), d.id]);
    expect((await g.api("u_alice", "GET", `/api/signature/${d.id}`)).body.intact).toBe(false);
  });

  it("les intervenants téléchargent le fichier ; un tiers non", async () => {
    const d = await draft();
    await attach("u_alice", d.id);
    await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    const r = await g.ctx.app.inject({ method: "GET", url: `/api/signature/${d.id}/file`, headers: { cookie: "" } });
    expect(r.statusCode).toBe(401);
    const k = await g.api("u_karim", "GET", `/api/signature/${d.id}/file`);
    expect(k.status).toBe(200);
    expect(Buffer.from(k.raw).equals(PDF)).toBe(true);
    await g.login("u_chloe");
    expect((await g.api("u_chloe", "GET", `/api/signature/${d.id}/file`)).status).toBe(404);
  });

  it("une fois signé, le bordereau des visas et signatures se produit en PDF et en Word", async () => {
    const d = await draft();
    await attach("u_alice", d.id);
    await g.api("u_alice", "POST", `/api/signature/${d.id}/start`);
    expect((await g.api("u_alice", "GET", `/api/signature/${d.id}/bordereau?format=pdf`)).status).toBe(409);
    await g.api("u_karim", "POST", `/api/signature/${d.id}/decide`, { decision: "approve" });
    await g.api("u_hugo", "POST", `/api/signature/${d.id}/decide`, { decision: "approve" });
    const pdf = await g.api("u_alice", "GET", `/api/signature/${d.id}/bordereau?format=pdf`);
    expect(pdf.status).toBe(200);
    expect(String(pdf.headers["content-type"])).toMatch(/pdf/);
    expect(pdf.raw.subarray(0, 5).toString()).toBe("%PDF-");
    const docx = await g.api("u_karim", "GET", `/api/signature/${d.id}/bordereau?format=docx`);
    expect(docx.status).toBe(200);
    expect(docx.raw.subarray(0, 2).toString()).toBe("PK");
  });
});
