import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { boot, type GovCtx } from "./gov-test-helpers.js";

/*
 * Export en plusieurs formats. On clique sur « Exporter » et on choisit le format : Word, PDF, Excel ou CSV pour un
 * tableau ; Word ou PDF pour un document officiel (compte rendu). Un tableau d'écran est rendu tel qu'il est affiché ;
 * les exports d'administration (comptes, journal) sont produits par le serveur. Tout export est tracé.
 */
let g: GovCtx;
beforeEach(async () => {
  g = await boot();
  await g.ctx.db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_alice'");
});
afterEach(() => g.ctx.app.close());

type Any = any;
const doc = {
  title: "Registre des décisions",
  reference: "Exemple fictif",
  sections: [
    {
      heading: "Synthèse",
      blocks: [
        {
          kind: "facts",
          rows: [
            ["Décisions", 2],
            ["Période", "2026"],
          ],
        },
      ],
    },
    {
      heading: "Décisions",
      blocks: [
        {
          kind: "table",
          head: ["Référence", "Intitulé", "Échéance"],
          rows: [
            ["DEC/2026/0001", "Lancer l'étude – phase 1 ; « urgente »", "12/12/2026"],
            ["DEC/2026/0002", "Recruter un cartographe", null],
          ],
        },
      ],
    },
  ],
};
const post = (format: string, body: Any = doc) =>
  g.ctx.app.inject({
    method: "POST",
    url: "/api/export",
    payload: { format, doc: body },
    headers: { cookie: (g as Any).cookie?.("u_alice") ?? "" },
  });

describe("export d'un tableau", () => {
  it("rend le même contenu en PDF, Word, Excel et CSV", async () => {
    const pdf = await g.api("u_alice", "POST", "/api/export", { format: "pdf", doc });
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
    expect(pdf.raw.subarray(0, 4).toString()).toBe("%PDF");
    expect(String(pdf.headers["content-disposition"])).toMatch(/Registre/);

    const docx = await g.api("u_alice", "POST", "/api/export", { format: "docx", doc });
    expect(docx.raw.subarray(0, 2).toString()).toBe("PK");

    const xlsx = await g.api("u_alice", "POST", "/api/export", { format: "xlsx", doc });
    const wb = XLSX.read(xlsx.raw);
    expect(wb.SheetNames).toEqual(["Synthèse", "Décisions"]);
    const rows = XLSX.utils.sheet_to_json<Any[]>(wb.Sheets.Décisions, { header: 1 });
    expect(rows[0]).toEqual(["Référence", "Intitulé", "Échéance"]);
    expect(rows[1][1]).toBe("Lancer l'étude – phase 1 ; « urgente »");

    const csv = await g.api("u_alice", "POST", "/api/export", { format: "csv", doc });
    const text = csv.raw.toString("utf8");
    expect(text.startsWith("﻿")).toBe(true);
    expect(text).toContain("Référence;Intitulé;Échéance");
    expect(text).toContain('"Lancer l\'étude – phase 1 ; « urgente »"');

    // L'export est tracé
    const act = await g.ctx.db.query<Any>("SELECT kind, data FROM activity WHERE kind = 'export.generated'");
    expect(act.length).toBe(4);
    expect(act[0].data).toMatchObject({ title: "Registre des décisions" });
  });

  it("refuse un format inconnu, un contenu invalide, une personne non connectée", async () => {
    expect((await g.api("u_alice", "POST", "/api/export", { format: "odt", doc })).status).toBe(400);
    expect((await g.api("u_alice", "POST", "/api/export", { format: "pdf", doc: { title: "" } })).status).toBe(400);
    expect((await post("pdf")).statusCode).toBe(401);
  });
});

describe("documents et exports d'administration", () => {
  it("le compte rendu d'une réunion sort en Word ou en PDF", async () => {
    const m = (
      await g.api("u_alice", "POST", "/api/meetings", {
        meeting_type: "Comité de direction",
        meeting_date: "2026-12-01",
        start_time: "09:00",
        timing: "upcoming",
      })
    ).body;
    const pdf = await g.api("u_alice", "GET", `/api/meetings/${m.id}/report?format=pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.raw.subarray(0, 4).toString()).toBe("%PDF");
    const word = await g.api("u_alice", "GET", `/api/meetings/${m.id}/report?format=docx`);
    expect(word.raw.subarray(0, 2).toString()).toBe("PK");
    expect((await g.api("u_alice", "GET", `/api/meetings/${m.id}/report?format=xlsx`)).status).toBe(400);
  });

  it("les comptes et le journal d'audit sortent en Excel, PDF, Word ou CSV, et l'export est tracé", async () => {
    const acc = await g.api("u_alice", "GET", "/api/admin/accounts/export?format=xlsx");
    expect(acc.status).toBe(200);
    const rows = XLSX.utils.sheet_to_json<Any[]>(XLSX.read(acc.raw).Sheets.Comptes, { header: 1 });
    expect(rows[0]).toContain("Adresse");
    const audit = await g.api("u_alice", "GET", "/api/admin/audit/export?format=pdf&category=Accès");
    expect(audit.status).toBe(200);
    expect(audit.raw.subarray(0, 4).toString()).toBe("%PDF");
    const sec = await g.ctx.db.query<Any>(
      "SELECT kind FROM security_events WHERE kind IN ('accounts.exported', 'audit.exported')",
    );
    expect(sec.map((s: Any) => s.kind).sort()).toEqual(["accounts.exported", "audit.exported"]);
    // Réservé à l'administrateur système
    expect((await g.api("u_karim", "GET", "/api/admin/accounts/export?format=pdf")).status).toBe(403);
  });
});
