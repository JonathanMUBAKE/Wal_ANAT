import { existsSync, readFileSync } from "node:fs";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ActionStatus, MeetingDetail } from "./meetings.js";

// Charte relevée sur le modèle officiel de compte rendu de l'ANAT
const FONT = "Montserrat";
const BLUE = "007BC4";
const GREY = "E8E8E8";
const WIDTH = 9356;
const LOGO = new URL("../assets/anat-logo.png", import.meta.url);
const BULLETS = "puces-anat";
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const STATUS: Record<ActionStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  soumis: "Soumis",
  realise: "Réalisé",
  reporte: "Reporté",
  annule: "Annulé",
};

const shortDate = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");
const longDate = (d: string | null) =>
  d ? `Le ${Number(d.slice(8, 10))} ${MONTHS.at(Number(d.slice(5, 7)) - 1)} ${d.slice(0, 4)}` : "";
const hour = (t: string | null) => (t ? t.replace(":", "h") : "");

const run = (text: string, o: { bold?: boolean; color?: string; size?: number } = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, color: o.color });
/** **gras** dans une ligne saisie, le reste tel quel. */
const runs = (line: string) =>
  line
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((p) => (p.startsWith("**") ? run(p.slice(2, -2), { bold: true }) : run(p)));
const para = (
  text: string,
  o: {
    bold?: boolean;
    color?: string;
    size?: number;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {},
) => new Paragraph({ alignment: o.alignment, spacing: { after: 40 }, children: [run(text, o)] });
/** Texte libre : une ligne commençant par « - » devient une puce. */
const blocks = (text: string) => {
  const lines = text.split("\n").filter((l) => l.trim());
  if (!lines.length) return [para("")];
  return lines.map((l) => {
    const bullet = /^\s*[-•]\s+/.test(l);
    return new Paragraph({
      spacing: { after: 60 },
      numbering: bullet ? { reference: BULLETS, level: 0 } : undefined,
      children: runs(l.replace(/^\s*[-•]\s+/, "")),
    });
  });
};

const cell = (children: Paragraph[], width: number, o: { span?: number; fill?: string } = {}) =>
  new TableCell({
    children,
    columnSpan: o.span,
    width: { size: width, type: WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
  });
const label = (text: string, width: number) => cell([para(text, { bold: true })], width, { fill: GREY });
const value = (text: string, width: number, span?: number) => cell(blocks(text), width, { span });
const table = (columns: number[], rows: TableCell[][]) =>
  new Table({
    width: { size: WIDTH, type: WidthType.DXA },
    columnWidths: columns,
    borders: Object.fromEntries(
      ["top", "bottom", "left", "right", "insideHorizontal", "insideVertical"].map((b) => [
        b,
        { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" },
      ]),
    ),
    rows: rows.map((children) => new TableRow({ children })),
  });
const heading = (text: string) =>
  new Paragraph({ spacing: { before: 220, after: 90 }, children: [run(text, { bold: true, color: BLUE, size: 24 })] });
const pair = (rows: [string, string][]) =>
  table(
    [2800, 6556],
    rows.map(([l, v]) => [label(l, 2800), value(v, 6556)]),
  );

function logoHeader() {
  if (!existsSync(LOGO)) return [para("Agence Nationale d'Aménagement du Territoire", { bold: true, color: BLUE })];
  const data = readFileSync(LOGO);
  const ratio = data.readUInt32BE(20) / data.readUInt32BE(16);
  return [
    new Paragraph({
      spacing: { after: 160 },
      children: [new ImageRun({ type: "png", data, transformation: { width: 190, height: Math.round(190 * ratio) } })],
    }),
  ];
}

export function reportFileName(m: Pick<MeetingDetail, "reference">) {
  return `CR-${m.reference.replace(/[^A-Za-z0-9-]+/g, "-")}.docx`;
}

/** Compte rendu officiel, dans l'ordre et les intitulés du modèle de l'agence. */
export async function buildMeetingReport(m: MeetingDetail): Promise<Buffer> {
  const present = m.attendees
    .filter((a) => a.presence === "present" || a.presence === "represente")
    .map((a) => (a.function_label ? `${a.name} (${a.function_label})` : a.name));
  const excused = m.attendees.filter((a) => a.presence === "excuse" || a.presence === "absent").map((a) => a.name);
  const participants = [
    present.join(", ") || m.attendance_note || "Cfr liste des présences",
    excused.length ? `Absents ou excusés : ${excused.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const notesCols = [4200, 2100, 1656, 1400];

  const children = [
    ...logoHeader(),
    table(
      [5400, 3956],
      [
        [
          cell([para("COMPTE RENDU DE REUNION", { bold: true, color: "FFFFFF", size: 26 })], 5400, { fill: BLUE }),
          cell([para(`Compte-rendu N° ${m.reference}`, { bold: true })], 3956, { fill: GREY }),
        ],
        [cell([para(m.title, { bold: true, alignment: AlignmentType.CENTER })], WIDTH, { span: 2 })],
      ],
    ),
    heading("Informations générales"),
    table(
      [1500, 1100, 1250, 800, 1150, 800, 750, 2006],
      [
        [
          label("Date de la réunion :", 1500),
          value(shortDate(m.meeting_date), 1100),
          label("Heure de début :", 1250),
          value(hour(m.start_time), 800),
          label("Heure de fin :", 1150),
          value(hour(m.end_time), 800),
          label("Lieu :", 750),
          value(m.location, 2006),
        ],
      ],
    ),
    new Paragraph({ spacing: { after: 80 }, children: [] }),
    pair([
      ["Réunion convoquée par :", m.convened_by],
      ["Type de réunion :", m.meeting_type],
      ["Animateur :", m.facilitator],
      ["Rédacteur :", m.writer_name],
      ["Maître du temps :", m.timekeeper],
      ["Participants", participants],
    ]),
    heading("Précédente réunion"),
    pair([
      [
        "Date et heure",
        m.previous
          ? `${shortDate(m.previous.meeting_date)} ; ${hour(m.previous.start_time)} à ${hour(m.previous.end_time)}`
          : "",
      ],
      ["Synthèse des points abordés", m.previous_summary],
    ]),
    heading("Ordre du jour"),
    table(
      [800, 5556, 3000],
      [
        [label("N°", 800), label("Sujets à aborder", 5556), label("Intervenants", 3000)],
        ...m.agenda.map((i, n) => [value(`${n + 1}.`, 800), value(i.subject, 5556), value(i.speakers, 3000)]),
      ],
    ),
    heading("Prise de note"),
    ...(m.agenda.length
      ? m.agenda.flatMap((i, n) => [
          table(notesCols, [
            [cell([para(`Ordre du jour ${n + 1} : ${i.subject}`, { bold: true })], WIDTH, { span: 4, fill: GREY })],
            [cell(blocks(i.notes), WIDTH, { span: 4 })],
            [
              label("Recommandations", 4200),
              label("Responsables", 2100),
              label("Échéance", 1656),
              label("Statut", 1400),
            ],
            ...(i.actions.length
              ? i.actions.map((a) => [
                  value(a.text, 4200),
                  value(a.responsible_name, 2100),
                  value(longDate(a.due_on), 1656),
                  value(STATUS[a.status], 1400),
                ])
              : [[cell([para("Aucune recommandation")], WIDTH, { span: 4 })]]),
            // Les décisions annoncées en séance, avec leur numéro au registre une fois le compte rendu validé
            ...(i.decisions.length
              ? [
                  [
                    label("Décisions de la séance", 4200),
                    label("Chargé d'exécution", 2100),
                    label("Échéance", 1656),
                    label("Registre", 1400),
                  ],
                  ...i.decisions.map((d) => [
                    value(d.text, 4200),
                    value(d.owner_name ?? "", 2100),
                    value(longDate(d.due_on), 1656),
                    value(d.decision_reference ?? "À inscrire", 1400),
                  ]),
                ]
              : []),
          ]),
          new Paragraph({ spacing: { after: 120 }, children: [] }),
        ])
      : [para("")]),
    heading("Conclusion"),
    table([WIDTH], [[label("Résumé", WIDTH)], [value(m.summary, WIDTH)]]),
    heading("Prochaine réunion"),
    pair([
      ["Date et heure :", [longDate(m.next_date), hour(m.next_time)].filter(Boolean).join(", ") || "N/D"],
      ["Lieu :", m.next_location || "N/D"],
      ["Synthèse des points à aborder :", m.next_topics || "N/D"],
    ]),
    new Paragraph({ spacing: { after: 240 }, children: [] }),
    table(
      [4678, 4678],
      [
        [label("Rédigé par :", 4678), label("Signature", 4678)],
        [value(m.writer_name, 4678), cell([para(""), para(""), para("")], 4678)],
      ],
    ),
  ];

  const doc = new Document({
    creator: "ANAT",
    title: `Compte rendu ${m.reference}`,
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { size: { width: 11900, height: 16840 }, margin: { top: 1000, right: 1268, bottom: 993, left: 1276 } },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    font: FONT,
                    size: 16,
                    children: ["Page ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
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
  return Packer.toBuffer(doc);
}
