// Assemble les parties du dossier de conception (docs/google-doc/partie-*.md) en un seul fichier HTML
// portant les styles du document Google de l'ANAT (docs/google-doc/STYLE.md), prêt à être téléversé
// dans Drive, qui le convertit en document Google.
//
//   node scripts/dossier-vers-html.mjs
//
// Conventions lues dans les sources :
//   #/##/###/####   -> Titre, Titre 1, Titre 2, Titre 3
//   <!-- fiche -->  -> tableau à libellés : première colonne bleu clair, en gras
//   <!-- matrice -->-> tableau large : ligne « @@ … » en bande bleu ANAT, en-têtes gris
//   ```             -> bloc préformaté (schémas en art ASCII)
//   [[SOMMAIRE]]    -> table des matières, fabriquée à partir des titres
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SRC = ["partie-A.md", "partie-B.md", "partie-C.md"].map((f) => `docs/google-doc/${f}`);
const SORTIE = "docs/google-doc/dossier.html";

// --- les couleurs et les polices de la maison, relevées dans le document existant
const C = {
  titre: "#0F4761",
  bande: "#007BC4",
  libelle: "#CDECFF",
  entete: "#D9D9D9",
  filet: "#000000",
  sourdine: "#595959",
};
const P = { titres: "'Play', sans-serif", texte: "'Aptos', 'Calibri', sans-serif", tableaux: "'Montserrat', sans-serif" };

const ech = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Gras, italique et code dans une ligne de texte courant. */
function enrichir(s) {
  return ech(s)
    .replace(/`([^`]+)`/g, '<span style="font-family:\'Roboto Mono\',monospace;font-size:10pt">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
}

const STYLE = {
  h1: `font-family:${P.titres};font-size:28pt;margin:0 0 4pt;page-break-before:always`,
  h2: `font-family:${P.titres};font-size:20pt;color:${C.titre};margin:18pt 0 4pt`,
  h3: `font-family:${P.titres};font-size:16pt;color:${C.titre};margin:8pt 0 4pt`,
  h4: `font-size:14pt;color:${C.titre};margin:8pt 0 4pt`,
  p: `font-family:${P.texte};font-size:12pt;margin:0 0 8pt;text-align:justify`,
  li: `font-family:${P.texte};font-size:12pt;margin:0 0 3pt`,
  pre: `font-family:'Roboto Mono',monospace;font-size:9pt;background:#F5F6F8;padding:8pt;border:0.5pt solid ${C.entete};white-space:pre;margin:0 0 8pt`,
  table: `border-collapse:collapse;width:100%;margin:0 0 10pt;font-family:${P.tableaux};font-size:10pt`,
  td: `border:0.5pt solid ${C.filet};padding:4pt 6pt;vertical-align:top`,
};

/** Découpe une ligne « | a | b | c | » en cellules. */
const cellules = (l) =>
  l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const estSeparateur = (l) => /^\|[\s:|-]+\|$/.test(l.trim());

function tableau(lignes, gabarit) {
  const rangs = lignes.filter((l) => !estSeparateur(l)).map(cellules);
  if (!rangs.length) return "";
  // Une bande de titre se place au-dessus des en-têtes de colonnes. Selon la source, elle arrive
  // avant (markdown : la bande sert de ligne d'en-tête) ou juste après : on remet l'ordre.
  const bande = (r) => r[0].startsWith("@@");
  if (rangs.length > 1 && !bande(rangs[0]) && bande(rangs[1])) {
    [rangs[0], rangs[1]] = [rangs[1], rangs[0]];
  }
  const cols = Math.max(...rangs.map((r) => r.length));
  const out = [`<table style="${STYLE.table}">`];
  let enteteFaite = false;
  for (const r of rangs) {
    const bande = r[0].startsWith("@@");
    if (bande) {
      const t = r[0].replace(/^@@\s*/, "");
      out.push(
        `<tr><td colspan="${cols}" style="${STYLE.td};background:${C.bande};color:#FFFFFF;font-weight:700">${enrichir(t)}</td></tr>`,
      );
      continue;
    }
    const estEntete = !enteteFaite;
    enteteFaite = true;
    const tds = [];
    for (let i = 0; i < cols; i++) {
      const v = enrichir(r[i] ?? "");
      let s = STYLE.td;
      if (estEntete && gabarit === "matrice") s += `;background:${C.entete};font-weight:700`;
      else if (gabarit === "fiche" && i === 0) s += `;background:${C.libelle};font-weight:700`;
      else if (estEntete && gabarit === "fiche") s += ";font-weight:700";
      tds.push(`<td style="${s}">${v || "&nbsp;"}</td>`);
    }
    out.push(`<tr>${tds.join("")}</tr>`);
  }
  out.push("</table>");
  return out.join("\n");
}

// --- lecture et conversion
const blocs = [];
const sommaire = [];
let compteurs = [0, 0, 0];

for (const f of SRC) {
  if (!existsSync(f)) {
    console.warn(`  (absent, ignoré) ${f}`);
    continue;
  }
  const lignes = readFileSync(f, "utf8").split(/\r?\n/);
  let i = 0;
  while (i < lignes.length) {
    const l = lignes[i];

    if (l.trim() === "[[SOMMAIRE]]") {
      blocs.push({ t: "sommaire" });
      i++;
      continue;
    }
    if (l.startsWith("```")) {
      const buf = [];
      i++;
      while (i < lignes.length && !lignes[i].startsWith("```")) buf.push(lignes[i++]);
      i++;
      blocs.push({ t: "pre", v: buf.join("\n") });
      continue;
    }
    if (/^\|/.test(l.trim())) {
      const buf = [];
      const gabarit = blocs.at(-1)?.t === "gabarit" ? blocs.pop().v : "matrice";
      while (i < lignes.length && /^\|/.test(lignes[i].trim())) buf.push(lignes[i++]);
      blocs.push({ t: "table", v: buf, g: gabarit });
      continue;
    }
    const com = l.match(/^<!--\s*(fiche|matrice)\s*-->$/);
    if (com) {
      blocs.push({ t: "gabarit", v: com[1] });
      i++;
      continue;
    }
    const titre = l.match(/^(#{1,4})\s+(.*)$/);
    if (titre) {
      const n = titre[1].length;
      const texte = titre[2].trim();
      if (n === 2) compteurs = [compteurs[0] + 1, 0, 0];
      if (n === 3) compteurs[1]++;
      if (n === 4) compteurs[2]++;
      // Les parties sont rédigées séparément : certaines numérotent déjà leurs titres. On ne
      // renumérote que ce qui ne l'est pas, sinon on obtient « 1. 1. Contexte institutionnel ».
      const dejaNumerote = /^\d+(\.\d+)*[.)]?\s/.test(texte);
      const num = dejaNumerote ? "" : n === 2 ? `${compteurs[0]}. ` : n === 3 ? `${compteurs[0]}.${compteurs[1]}. ` : "";
      const id = `t${sommaire.length}`;
      if (n <= 3) sommaire.push({ n, texte: num + texte, id });
      blocs.push({ t: `h${n}`, v: num + texte, id });
      i++;
      continue;
    }
    if (/^[-*]\s+/.test(l)) {
      const buf = [];
      while (i < lignes.length && /^[-*]\s+/.test(lignes[i])) buf.push(lignes[i++].replace(/^[-*]\s+/, ""));
      blocs.push({ t: "ul", v: buf });
      continue;
    }
    if (l.trim()) {
      blocs.push({ t: "p", v: l.trim() });
      i++;
      continue;
    }
    i++;
  }
}

function rendreSommaire() {
  const out = [`<h2 style="${STYLE.h2}">Sommaire</h2>`];
  for (const s of sommaire) {
    const marge = (s.n - 2) * 18;
    const gras = s.n === 2 ? "font-weight:700;" : "";
    out.push(
      `<p style="${STYLE.p};margin:0 0 2pt ${marge}pt;${gras}"><a href="#${s.id}" style="color:${C.titre};text-decoration:none">${ech(s.texte)}</a></p>`,
    );
  }
  return out.join("\n");
}

const corps = blocs
  .map((b) => {
    switch (b.t) {
      case "h1":
        return `<h1 id="${b.id}" style="${STYLE.h1}">${ech(b.v)}</h1>`;
      case "h2":
        return `<h2 id="${b.id}" style="${STYLE.h2}">${ech(b.v)}</h2>`;
      case "h3":
        return `<h3 id="${b.id}" style="${STYLE.h3}">${ech(b.v)}</h3>`;
      case "h4":
        return `<h4 style="${STYLE.h4}">${ech(b.v)}</h4>`;
      case "p":
        return `<p style="${STYLE.p}">${enrichir(b.v)}</p>`;
      case "ul":
        return `<ul style="margin:0 0 8pt 0">${b.v.map((x) => `<li style="${STYLE.li}">${enrichir(x)}</li>`).join("")}</ul>`;
      case "pre":
        return `<pre style="${STYLE.pre}">${ech(b.v)}</pre>`;
      case "table":
        return tableau(b.v, b.g);
      case "sommaire":
        return rendreSommaire();
      case "gabarit":
        return "";
      default:
        return "";
    }
  })
  .join("\n");

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Projet de système de pilotage de l'ANAT</title>
<style>
@page { size: A4; margin: 2.5cm; }
body { font-family: ${P.texte}; font-size: 12pt; color: #000; }
a { color: ${C.titre}; }
</style></head>
<body>
${corps}
</body></html>
`;

writeFileSync(SORTIE, html, "utf8");
const pages = Math.round(html.replace(/<[^>]+>/g, "").length / 2600);
console.log(`  ${SORTIE}`);
console.log(`  ${blocs.length} blocs · ${blocs.filter((b) => b.t === "table").length} tableaux · ${sommaire.length} entrées de sommaire`);
console.log(`  ${html.length} caractères, soit de l'ordre de ${pages} pages`);
