import { existsSync, readFileSync } from "node:fs";
import type { FastifyReply } from "fastify";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { z } from "zod";

/*
 * Export commun : un même contenu — titre, référence, sections faites de fiches (libellé / valeur), de texte et de
 * tableaux — se rend en Word, PDF, Excel ou CSV, à la charte de l'agence (logo, bleu ANAT, pied de page daté et
 * paginé). Les documents officiels (compte rendu de réunion) gardent leur modèle Word dédié ; tout le reste passe ici.
 */

export const FORMATS = ["docx", "pdf", "xlsx", "csv"] as const;
export type Format = (typeof FORMATS)[number];
const MIME: Record<Format, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
};

const Cell = z.union([z.string().max(20_000), z.number(), z.null()]).optional();
const Block = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("facts"), rows: z.array(z.tuple([z.string().max(300), Cell])).max(200) }),
  z.object({ kind: z.literal("text"), text: z.string().max(50_000) }),
  z.object({
    kind: z.literal("table"),
    head: z.array(z.string().max(300)).min(1).max(30),
    rows: z.array(z.array(Cell).max(30)).max(10_000),
    widths: z.array(z.number().positive()).max(30).optional(),
  }),
]);
export const ExportDocSchema = z.object({
  title: z.string().trim().min(1).max(300),
  reference: z.string().max(200).optional(),
  subtitle: z.string().max(1000).optional(),
  filename: z
    .string()
    .max(120)
    .regex(/^[\p{L}\p{N} ._-]+$/u, "Nom de fichier invalide")
    .optional(),
  landscape: z.boolean().optional(),
  sections: z
    .array(z.object({ heading: z.string().max(300).optional(), blocks: z.array(Block).max(100) }))
    .min(1)
    .max(100),
});
export type ExportDoc = z.infer<typeof ExportDocSchema>;
type CellValue = string | number | null | undefined;

const BLUE = "#007BC4";
const LOGO = new URL("../assets/anat-logo.png", import.meta.url);
const text = (v: CellValue) => (v === null || v === undefined ? "" : String(v));
const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} à ${p(d.getHours())}h${p(d.getMinutes())}`;
};
/** pdfkit (polices standard) ne connaît que le jeu latin : on remplace ce qu'il ne sait pas dessiner. */
const latin = (s: string) =>
  s
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[  ]/g, " ")
    .replace(/→/g, "->")
    // biome-ignore lint/suspicious/noControlCharactersInRegex: on ne garde que ce que la police sait dessiner
    .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿŒœŸ€]/g, "");

// ------------------------------------------------------------------ PDF
function renderPdf(doc: ExportDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size: "A4",
      layout: doc.landscape ? "landscape" : "portrait",
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      info: { Title: latin(doc.title), Author: "ANAT Pilotage" },
    });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    const left = pdf.page.margins.left;
    const width = pdf.page.width - left - pdf.page.margins.right;
    const bottom = () => pdf.page.height - pdf.page.margins.bottom;
    const ensure = (h: number) => {
      if (pdf.y + h > bottom()) pdf.addPage();
    };
    if (existsSync(LOGO)) {
      pdf.image(readFileSync(LOGO), left, pdf.y, { width: 120 });
      pdf.moveDown(4.2);
    }
    pdf.font("Helvetica-Bold").fontSize(17).fillColor(BLUE).text(latin(doc.title), left, pdf.y, { width });
    if (doc.reference) pdf.font("Helvetica").fontSize(10).fillColor("#555555").text(latin(doc.reference), { width });
    if (doc.subtitle) pdf.font("Helvetica").fontSize(10).fillColor("#555555").text(latin(doc.subtitle), { width });
    pdf.moveDown(0.8);
    for (const s of doc.sections) {
      if (s.heading) {
        ensure(40);
        pdf.moveDown(0.4).font("Helvetica-Bold").fontSize(12.5).fillColor(BLUE).text(latin(s.heading), left, pdf.y, {
          width,
        });
        pdf.moveDown(0.3);
      }
      for (const b of s.blocks) {
        if (b.kind === "text") {
          for (const line of b.text.split("\n")) {
            const bullet = /^\s*[-•]\s+/.test(line);
            const t = latin(line.replace(/^\s*[-•]\s+/, "").replace(/\*\*/g, ""));
            ensure(16);
            pdf.font("Helvetica").fontSize(10).fillColor("#111111");
            if (bullet) pdf.text(`•  ${t}`, left + 10, pdf.y, { width: width - 10 });
            else pdf.text(t || " ", left, pdf.y, { width });
          }
          pdf.moveDown(0.4);
        } else if (b.kind === "facts") {
          const lw = Math.min(170, width * 0.35);
          for (const [label, value] of b.rows) {
            pdf.font("Helvetica").fontSize(10);
            const v = latin(text(value)) || "-";
            const h =
              Math.max(
                pdf.heightOfString(latin(label), { width: lw - 8 }),
                pdf.heightOfString(v, { width: width - lw - 8 }),
              ) + 8;
            ensure(h);
            const y = pdf.y;
            pdf.rect(left, y, lw, h).fill("#EEF1F4");
            pdf
              .font("Helvetica-Bold")
              .fillColor("#333333")
              .text(latin(label), left + 4, y + 4, { width: lw - 8 });
            pdf
              .font("Helvetica")
              .fillColor("#111111")
              .text(v, left + lw + 4, y + 4, { width: width - lw - 8 });
            pdf
              .moveTo(left, y + h)
              .lineTo(left + width, y + h)
              .lineWidth(0.5)
              .strokeColor("#D5DAE0")
              .stroke();
            pdf.y = y + h;
          }
          pdf.moveDown(0.6);
        } else {
          const total = b.widths?.length === b.head.length ? b.widths.reduce((x, w) => x + w, 0) : b.head.length;
          const cols = b.head.map((_, i) => (width * (b.widths?.length === b.head.length ? b.widths[i] : 1)) / total);
          const row = (cells: string[], head: boolean) => {
            pdf.font(head ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
            const h = Math.max(...cells.map((c, i) => pdf.heightOfString(c || " ", { width: cols[i] - 8 }))) + 8;
            if (pdf.y + h > bottom()) {
              pdf.addPage();
              if (!head) row(b.head.map(latin), true);
            }
            const y = pdf.y;
            if (head) pdf.rect(left, y, width, h).fill("#E8ECF1");
            let x = left;
            cells.forEach((c, i) => {
              pdf
                .fillColor(head ? "#222222" : "#111111")
                .font(head ? "Helvetica-Bold" : "Helvetica")
                .text(c, x + 4, y + 4, { width: cols[i] - 8 });
              x += cols[i];
            });
            pdf
              .moveTo(left, y + h)
              .lineTo(left + width, y + h)
              .lineWidth(0.5)
              .strokeColor("#D5DAE0")
              .stroke();
            pdf.y = y + h;
          };
          ensure(40);
          row(b.head.map(latin), true);
          for (const r of b.rows)
            row(
              b.head.map((_, i) => latin(text(r[i]))),
              false,
            );
          pdf.moveDown(0.8);
        }
      }
    }
    const range = pdf.bufferedPageRange();
    const foot = `ANAT Pilotage · exporté le ${stamp()}`;
    for (let i = 0; i < range.count; i++) {
      pdf.switchToPage(range.start + i);
      const y = pdf.page.height - 40;
      pdf.font("Helvetica").fontSize(8).fillColor("#777777");
      pdf.text(latin(foot), left, y, { width, lineBreak: false });
      pdf.text(`Page ${i + 1} / ${range.count}`, left, y, { width, align: "right", lineBreak: false });
    }
    pdf.end();
  });
}

// ------------------------------------------------------------------ Word
const FONT = "Montserrat";
const run = (t: string, o: { bold?: boolean; color?: string; size?: number } = {}) =>
  new TextRun({ text: t, font: FONT, size: o.size ?? 19, bold: o.bold, color: o.color });
const para = (t: string, o: { bold?: boolean; color?: string; size?: number } = {}) =>
  new Paragraph({ spacing: { after: 50 }, children: [run(t, o)] });
const BORDERS = Object.fromEntries(
  ["top", "bottom", "left", "right", "insideHorizontal", "insideVertical"].map((b) => [
    b,
    { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
  ]),
);
const wcell = (children: Paragraph[], width: number, fill?: string) =>
  new TableCell({
    children,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    shading: fill ? { type: ShadingType.CLEAR, color: "auto", fill } : undefined,
  });
const lines = (v: CellValue) =>
  text(v)
    .split("\n")
    .map((l) => para(l));

function renderDocx(doc: ExportDoc): Promise<Buffer> {
  const page = doc.landscape ? 14800 : 9356;
  const children: (Paragraph | Table)[] = [];
  if (existsSync(LOGO)) {
    const data = readFileSync(LOGO);
    const ratio = data.readUInt32BE(20) / data.readUInt32BE(16);
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new ImageRun({ type: "png", data, transformation: { width: 170, height: Math.round(170 * ratio) } }),
        ],
      }),
    );
  }
  children.push(para(doc.title, { bold: true, color: "007BC4", size: 32 }));
  if (doc.reference) children.push(para(doc.reference, { color: "555555" }));
  if (doc.subtitle) children.push(para(doc.subtitle, { color: "555555" }));
  for (const s of doc.sections) {
    if (s.heading)
      children.push(
        new Paragraph({
          spacing: { before: 240, after: 100 },
          children: [run(s.heading, { bold: true, color: "007BC4", size: 24 })],
        }),
      );
    for (const b of s.blocks) {
      if (b.kind === "text")
        for (const l of b.text.split("\n"))
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              bullet: /^\s*[-•]\s+/.test(l) ? { level: 0 } : undefined,
              children: [run(l.replace(/^\s*[-•]\s+/, "").replace(/\*\*/g, ""))],
            }),
          );
      else if (b.kind === "facts") {
        const lw = Math.round(page * 0.32);
        children.push(
          new Table({
            width: { size: page, type: WidthType.DXA },
            columnWidths: [lw, page - lw],
            borders: BORDERS,
            rows: b.rows.map(
              ([l, v]) =>
                new TableRow({
                  children: [wcell([para(l, { bold: true })], lw, "EEF1F4"), wcell(lines(v), page - lw)],
                }),
            ),
          }),
          new Paragraph({ children: [] }),
        );
      } else {
        const total = b.widths?.length === b.head.length ? b.widths.reduce((x, w) => x + w, 0) : b.head.length;
        const cols = b.head.map((_, i) =>
          Math.round((page * (b.widths?.length === b.head.length ? b.widths[i] : 1)) / total),
        );
        children.push(
          new Table({
            width: { size: page, type: WidthType.DXA },
            columnWidths: cols,
            borders: BORDERS,
            rows: [
              new TableRow({
                tableHeader: true,
                children: b.head.map((h, i) => wcell([para(h, { bold: true, size: 17 })], cols[i], "E8ECF1")),
              }),
              ...b.rows.map(
                (r) =>
                  new TableRow({
                    children: b.head.map((_, i) =>
                      wcell(
                        text(r[i])
                          .split("\n")
                          .map((l) => para(l, { size: 17 })),
                        cols[i],
                      ),
                    ),
                  }),
              ),
            ],
          }),
          new Paragraph({ children: [] }),
        );
      }
    }
  }
  const d = new Document({
    creator: "ANAT Pilotage",
    title: doc.title,
    sections: [
      {
        properties: {
          page: {
            size: doc.landscape
              ? { width: 16840, height: 11900, orientation: PageOrientation.LANDSCAPE }
              : { width: 11900, height: 16840 },
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    font: FONT,
                    size: 15,
                    color: "777777",
                    children: [
                      `ANAT Pilotage · exporté le ${stamp()} · page `,
                      PageNumber.CURRENT,
                      " / ",
                      PageNumber.TOTAL_PAGES,
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(d);
}

// ------------------------------------------------------------------ Excel et CSV
function renderXlsx(doc: ExportDoc) {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const name = (n: string) => {
    let base =
      n
        .replace(/[\\/?*[\]:]/g, " ")
        .slice(0, 28)
        .trim() || "Feuille";
    let k = 1;
    while (used.has(base)) base = `${base.slice(0, 25)} ${++k}`;
    used.add(base);
    return base;
  };
  const facts: CellValue[][] = [
    [doc.title],
    ...(doc.reference ? [[doc.reference]] : []),
    [`Exporté le ${stamp()}`],
    [],
  ];
  let tables = 0;
  for (const s of doc.sections)
    for (const b of s.blocks) {
      if (b.kind === "table") {
        const ws = XLSX.utils.aoa_to_sheet([b.head, ...b.rows.map((r) => b.head.map((_, i) => r[i] ?? ""))]);
        ws["!cols"] = b.head.map((h, i) => ({
          wch: Math.min(60, Math.max(h.length, ...b.rows.slice(0, 200).map((r) => text(r[i]).length)) + 2),
        }));
        XLSX.utils.book_append_sheet(wb, ws, name(s.heading ?? `Tableau ${++tables}`));
      } else if (b.kind === "facts") {
        if (s.heading) facts.push([s.heading]);
        for (const [l, v] of b.rows) facts.push([l, v ?? ""]);
        facts.push([]);
      } else {
        if (s.heading) facts.push([s.heading]);
        for (const l of b.text.split("\n")) facts.push([l]);
        facts.push([]);
      }
    }
  if (facts.length > 4 || !wb.SheetNames.length) {
    const ws = XLSX.utils.aoa_to_sheet(facts);
    ws["!cols"] = [{ wch: 36 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws, name("Synthèse"));
    // La synthèse en premier
    wb.SheetNames.unshift(wb.SheetNames.pop() as string);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function renderCsv(doc: ExportDoc) {
  const cell = (v: CellValue) => {
    const s = text(v).replace(/\r?\n/g, " ");
    return /[;"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const out: string[] = [];
  for (const s of doc.sections)
    for (const b of s.blocks)
      if (b.kind === "table") {
        if (out.length) out.push("");
        out.push(b.head.map(cell).join(";"), ...b.rows.map((r) => b.head.map((_, i) => cell(r[i])).join(";")));
      } else if (b.kind === "facts") for (const [l, v] of b.rows) out.push(`${cell(l)};${cell(v)}`);
  // Le BOM fait reconnaître l'UTF-8 (accents) par Excel
  return Buffer.from(`﻿${out.join("\r\n")}\r\n`, "utf8");
}

export async function renderExport(doc: ExportDoc, format: Format) {
  const body =
    format === "pdf"
      ? await renderPdf(doc)
      : format === "docx"
        ? await renderDocx(doc)
        : format === "xlsx"
          ? renderXlsx(doc)
          : renderCsv(doc);
  return {
    body,
    mime: MIME[format],
    filename: `${(doc.filename ?? doc.title).replace(/[^\p{L}\p{N} ._-]+/gu, "-").slice(0, 100)}.${format}`,
  };
}

export async function sendExport(reply: FastifyReply, doc: ExportDoc, format: Format) {
  const f = await renderExport(doc, format);
  const ascii = f.filename
    .normalize("NFD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/"/g, "");
  return reply
    .header("Content-Type", f.mime)
    .header(
      "Content-Disposition",
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
    )
    .header("Cache-Control", "no-store")
    .send(f.body);
}

export const formatOf = (q: unknown, allowed: readonly Format[] = FORMATS) =>
  z.object({ format: z.enum(allowed as [Format, ...Format[]]).default(allowed[0]) }).parse(q ?? {}).format;
