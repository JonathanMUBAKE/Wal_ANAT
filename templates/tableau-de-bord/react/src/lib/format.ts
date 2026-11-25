/* Formats français : virgule décimale, espace insécable fine, unités lisibles. */

export const NF = (d = 0) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export type Format = "nombre" | "compact" | "pourcent" | "ms" | "euro" | "octets";

export function fmt(v: number, type: Format = "nombre", d?: number): string {
  switch (type) {
    case "compact":
      if (Math.abs(v) >= 1e6) return NF(1).format(v / 1e6) + " M";
      if (Math.abs(v) >= 1e3) return NF(1).format(v / 1e3) + " k";
      return NF(0).format(v);
    case "pourcent":
      return NF(d ?? 2).format(v) + " %";
    case "ms":
      return NF(0).format(v) + " ms";
    case "euro":
      return NF(0).format(v) + " €";
    case "octets": {
      const u = ["o", "Kio", "Mio", "Gio", "Tio"];
      let i = 0;
      while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
      return NF(i ? 1 : 0).format(v) + " " + u[i];
    }
    default:
      return NF(d ?? 0).format(v);
  }
}

/** Comparaison insensible à la casse et aux accents — indispensable en français. */
export const normaliser = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const initiales = (nom: string) =>
  nom.split(" ").map((m) => m[0] ?? "").join("").slice(0, 2).toUpperCase();

/** Lit un jeton CSS courant — les graphiques s'habillent ainsi au thème actif. */
export const jeton = (nom: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(nom).trim();

/** Voile une couleur hexadécimale pour les aires et les survols. */
export function voiler(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const plein = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(plein, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Concaténation de classes, en ignorant les valeurs fausses. */
export const cx = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");

/** Export CSV compatible Excel français (point-virgule + BOM). */
export function exporterCSV<T extends object>(nom: string, lignes: readonly T[]): boolean {
  if (!lignes.length) return false;
  const cles = Object.keys(lignes[0]) as Array<keyof T & string>;
  const ech = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const csv =
    "\uFEFF" +
    [cles.join(";"), ...lignes.map((l) => cles.map((c) => ech(l[c])).join(";"))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `${nom}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
