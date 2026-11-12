import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Download, FileSpreadsheet, FileText, FileType2, Sheet } from "lucide-react";
import { Button, Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui";

/*
 * « Exporter » partout de la même façon : on clique, on choisit le format. Un document officiel sort en Word ou en
 * PDF ; un tableau en Excel, PDF, Word ou CSV. Le fichier est produit par le serveur (charte de l'agence, export
 * tracé) : soit à partir de sa propre source (`href`), soit à partir de ce que l'écran affiche (`build`).
 */

export type ExportFormat = "docx" | "pdf" | "xlsx" | "csv";
export type ExportCell = string | number | null | undefined;
export type ExportBlock =
  | { kind: "facts"; rows: [string, ExportCell][] }
  | { kind: "text"; text: string }
  | { kind: "table"; head: string[]; rows: ExportCell[][]; widths?: number[] };
export interface ExportDoc {
  title: string;
  reference?: string;
  subtitle?: string;
  filename?: string;
  landscape?: boolean;
  sections: { heading?: string; blocks: ExportBlock[] }[];
}

const FORMAT: Record<ExportFormat, { label: string; hint: string; Icon: typeof FileText }> = {
  docx: { label: "Word", hint: ".docx · à retravailler", Icon: FileText },
  pdf: { label: "PDF", hint: ".pdf · à diffuser ou imprimer", Icon: FileType2 },
  xlsx: { label: "Excel", hint: ".xlsx · à trier et calculer", Icon: FileSpreadsheet },
  csv: { label: "CSV", hint: ".csv · pour un autre logiciel", Icon: Sheet },
};
export const TABLE_FORMATS: ExportFormat[] = ["xlsx", "pdf", "docx", "csv"];
export const DOCUMENT_FORMATS: ExportFormat[] = ["docx", "pdf"];

const fileName = (res: Response, fallback: string) => {
  const cd = res.headers.get("content-disposition") ?? "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) return decodeURIComponent(star[1]);
  return /filename="([^"]+)"/i.exec(cd)?.[1] ?? fallback;
};

async function download(res: Response, fallback: string) {
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      /* réponse non JSON */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(res, fallback);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function ExportMenu({
  formats = TABLE_FORMATS,
  href,
  build,
  label = "Exporter",
  size,
  disabled,
  compact,
}: {
  formats?: ExportFormat[];
  /** Export produit par le serveur à partir de sa source : l'adresse pour un format. */
  href?: (format: ExportFormat) => string;
  /** Export de ce que l'écran affiche. */
  build?: () => ExportDoc;
  label?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  /** Dans une ligne de tableau : un bouton rond à icône seule. */
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (f: ExportFormat) => {
    setBusy(true);
    try {
      if (href) await download(await fetch(href(f), { credentials: "include" }), `export.${f}`);
      else if (build) {
        const doc = build();
        await download(
          await fetch("/api/export", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format: f, doc }),
          }),
          `${doc.filename ?? "export"}.${f}`,
        );
      }
      toast.success(`Export ${FORMAT[f].label} prêt`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Menu>
      <MenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            aria-label={label}
            title={label}
            disabled={busy || disabled}
            onClick={(e) => e.stopPropagation()}
            className="flex size-7 items-center justify-center rounded-full text-faint transition-colors hover:bg-hover hover:text-fg"
          >
            <Download className="size-3.5" />
          </button>
        ) : (
          <Button size={size} icon={<Download className="size-4" />} loading={busy} disabled={disabled}>
            {label}
            <ChevronDown className="size-3.5 text-muted" />
          </Button>
        )}
      </MenuTrigger>
      <MenuContent align="end">
        <MenuLabel>Format du fichier</MenuLabel>
        {formats.map((f) => {
          const x = FORMAT[f];
          return (
            <MenuItem key={f} icon={<x.Icon className="size-4" />} onSelect={() => run(f)}>
              <span className="flex flex-col">
                <span>{x.label}</span>
                <span className="text-[11.5px] text-muted">{x.hint}</span>
              </span>
            </MenuItem>
          );
        })}
      </MenuContent>
    </Menu>
  );
}

/** Un registre d'écran en document exportable : titre, sous-titre, un tableau. */
export const tableDoc = (
  title: string,
  head: string[],
  rows: ExportCell[][],
  o: { subtitle?: string; filename?: string; widths?: number[]; landscape?: boolean; heading?: string } = {},
): ExportDoc => ({
  title,
  subtitle: o.subtitle,
  filename: o.filename,
  landscape: o.landscape ?? head.length > 5,
  sections: [
    {
      heading: o.heading ?? `${rows.length} ligne${rows.length > 1 ? "s" : ""}`,
      blocks: [{ kind: "table", head, rows, widths: o.widths }],
    },
  ],
});
