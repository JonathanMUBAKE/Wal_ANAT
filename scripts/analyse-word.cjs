// Analyse module par module (Word), produite depuis docs/ANALYSE-MODULES.md. Données fictives uniquement.
// Usage : node scripts/analyse-word.cjs  (écrit docs/word/ANAT-Pilotage-analyse-modules.docx)
// Le Markdown reste la source : modifier le .md puis relancer ce script.
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(ROOT, "docs/ANALYSE-MODULES.md");
const OUT = process.argv[2] ?? path.resolve(ROOT, "docs/word/ANAT-Pilotage-analyse-modules.docx");
const docx = require(path.resolve(ROOT, "node_modules/docx"));
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LevelFormat, Packer, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} = docx;

const BLUE = "007BC4";
const FONT = "Arial";
const W = 9638; // largeur utile A4 (marges 1134)

const t = (text, o = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 21, bold: o.bold, italics: o.italics, color: o.color });

/** **gras**, *italique* et `code` dans une ligne. */
function rich(line, o = {}) {
  return line
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/)
    .filter(Boolean)
    .map((s) => {
      if (s.startsWith("**")) return t(s.slice(2, -2), { ...o, bold: true });
      if (s.startsWith("`")) return new TextRun({ text: s.slice(1, -1), font: "Consolas", size: (o.size ?? 21) - 2, color: o.color });
      if (s.startsWith("*") && s.length > 2) return t(s.slice(1, -1), { ...o, italics: true });
      return t(s, o);
    });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFC8D2" };
const borders = { top: border, bottom: border, left: border, right: border };

/** Couleur de la case « Gravité ». */
function gravityFill(text) {
  if (/^Haute/.test(text)) return "FBE3E1";
  if (/^Moyenne/.test(text)) return "FDF1D8";
  if (/^Basse/.test(text)) return "E7F3E8";
  return undefined;
}

function table(head, rows) {
  // Largeurs : proportionnelles à la longueur moyenne du texte de chaque colonne, bornées.
  const n = head.length;
  const weights = head.map((h, i) => {
    const lens = [h, ...rows.map((r) => r[i] ?? "")].map((s) => s.length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    return Math.min(Math.max(avg, 6), 70);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const cols = weights.map((w) => Math.round((W * w) / total));
  cols[n - 1] += W - cols.reduce((a, b) => a + b, 0);
  const gIdx = head.findIndex((h) => h === "Gravité");
  const cell = (text, i, header) =>
    new TableCell({
      borders,
      width: { size: cols[i], type: WidthType.DXA },
      shading: header
        ? { fill: "E6F0F8", type: ShadingType.CLEAR, color: "auto" }
        : i === gIdx && gravityFill(text)
          ? { fill: gravityFill(text), type: ShadingType.CLEAR, color: "auto" }
          : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: rich(text, { size: 19, bold: header || undefined }) })],
    });
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: head.map((_, i) => cell(r[i] ?? "", i, false)) })),
    ],
  });
}

const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

// --- Lecture du Markdown ---
const lines = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n").split("\n");
const content = [];
let title = "Analyse module par module";
let para = [];
let firstH2 = true;
const flush = () => {
  if (para.length) content.push(new Paragraph({ spacing: { after: 120 }, children: rich(para.join(" ")) }));
  para = [];
};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/^\s*$/.test(line) || /^---\s*$/.test(line)) {
    flush();
    continue;
  }
  let m;
  if ((m = line.match(/^# (.+)/))) {
    flush();
    title = m[1];
    content.push(new Paragraph({ spacing: { after: 80 }, children: [t("ANAT Pilotage", { size: 22, color: BLUE, bold: true })] }));
    content.push(new Paragraph({ spacing: { after: 240 }, children: [t(title, { size: 44, bold: true })] }));
  } else if ((m = line.match(/^## (.+)/))) {
    flush();
    // Chaque module commence sur une nouvelle page ; les sections d'introduction restent groupées.
    const isModule = /^\d+\./.test(m[1]);
    content.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: isModule && !firstH2, children: [new TextRun(m[1])] }));
    if (isModule) firstH2 = false;
  } else if ((m = line.match(/^### (.+)/))) {
    flush();
    content.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(m[1])] }));
  } else if (line.trim().startsWith("|")) {
    flush();
    const head = splitRow(line);
    const rows = [];
    i++; // ligne de séparation
    while (i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) rows.push(splitRow(lines[++i]));
    content.push(table(head, rows));
    content.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  } else if ((m = line.match(/^- (.+)/))) {
    flush();
    let text = m[1];
    while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !/^\s*- /.test(lines[i + 1])) text += " " + lines[++i].trim();
    content.push(new Paragraph({ numbering: { reference: "puces", level: 0 }, spacing: { after: 60 }, children: rich(text) }));
  } else {
    para.push(line.trim());
  }
}
flush();

const doc = new Document({
  creator: "ANAT Pilotage",
  title: `ANAT Pilotage — ${title}`,
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 34, bold: true, color: BLUE }, paragraph: { spacing: { before: 240, after: 160 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 26, bold: true, color: "1F2A37" }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "puces", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }] },
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t("ANAT Pilotage · analyse module par module", { size: 16, color: "888888" })] })] }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ font: FONT, size: 16, color: "888888", children: ["Page ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES] })] })],
        }),
      },
      children: content,
    },
  ],
});

Packer.toBuffer(doc).then((b) => {
  try {
    fs.writeFileSync(OUT, b);
  } catch (e) {
    if (e.code === "EBUSY" || e.code === "EPERM") {
      console.error(`Le fichier est ouvert dans Word : fermez-le puis relancez.\n${OUT}`);
      process.exit(1);
    }
    throw e;
  }
  console.log("ok", OUT, b.length);
});
