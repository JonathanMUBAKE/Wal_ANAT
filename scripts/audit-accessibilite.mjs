// Audit d'accessibilité : pilote un vrai navigateur sur la démonstration ANAT et passe chaque écran au moteur
// axe-core (celui de Deque, le même qui équipe Axe DevTools), dans le thème sombre puis dans le thème clair.
// Usage : npm run build && npm run audit:a11y
//         npm run audit:a11y -- --url http://localhost:4310   (réutilise une démonstration déjà lancée)
//         npm run audit:a11y -- --mobile                      (écran de téléphone, 375 × 812)
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axeSource = require.resolve("axe-core/axe.min.js");

const arg = (nom) => {
  const i = process.argv.indexOf(nom);
  return i === -1 ? null : (process.argv[i + 1] ?? "");
};
const externe = arg("--url");
const mobile = process.argv.includes("--mobile");
const PORT = 4322;
const BASE = externe || `http://localhost:${PORT}`;

// Les écrans parcourus, dans l'ordre du menu. Chacun est audité dans les deux thèmes.
const ECRANS = [
  ["/", "Accueil"],
  ["/my-tasks", "Mes tâches"],
  ["/entite", "Mon entité"],
  ["/mon-dossier", "Mon dossier"],
  ["/ai", "Coéquipiers IA"],
  ["/activites", "Portefeuille"],
  ["/decisions", "Décisions"],
  ["/reunions", "Réunions"],
  ["/risques", "Risques et indicateurs"],
  ["/plans", "Plans de travail"],
  ["/partenaires", "Partenaires"],
  ["/conventions", "Conventions"],
  ["/signataire", "Signataire"],
  ["/courrier", "Courrier"],
  ["/org", "Organisation"],
  ["/teams", "Équipes"],
  ["/rh", "Ressources humaines"],
  ["/conges", "Congés"],
  ["/controle-administration", "Administration"],
];

// Seules les règles qui correspondent à un critère WCAG comptent comme manquement ; les bonnes pratiques
// d'axe-core sont rapportées à part, car elles n'engagent pas la conformité.
const estWcag = (v) => v.tags.some((t) => /^wcag\d/.test(t));

let serveur;
let navigateur;
const manquements = [];
const pratiques = [];

try {
  if (!externe) {
    serveur = spawn(process.execPath, ["server/dist/index.js"], {
      env: { ...process.env, PORT: String(PORT), DATA_DIR: ":memory:", CADENCE_DEMO: "1", ANAT_DEMO: "1", ANTHROPIC_API_KEY: "" },
      stdio: "ignore",
    });
    for (let i = 0; i < 300; i++) {
      try {
        if ((await fetch(`${BASE}/api/auth/users`)).ok) break;
      } catch {}
      await sleep(200);
    }
  }

  navigateur = await chromium.launch();
  // L'application sert une politique de sécurité du contenu stricte, qui interdit tout script injecté : c'est
  // voulu et il faut que cela reste. On ne la lève donc que dans ce navigateur de mesure, le temps de l'audit.
  const contexte = await navigateur.newContext({
    bypassCSP: true,
    viewport: mobile ? { width: 375, height: 812 } : { width: 1440, height: 900 },
  });
  const page = await contexte.newPage();
  await page.goto(`${BASE}/login`);
  // On audite l'application telle que la voit la direction générale : c'est le profil qui voit le plus d'écrans.
  await page.evaluate(() =>
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id: "u_alice" }),
    }),
  );

  for (const theme of ["dark", "light"]) {
    await page.evaluate((t) => localStorage.setItem("cadence-theme", t), theme);
    const nomTheme = theme === "dark" ? "sombre" : "clair";
    for (const [chemin, ecran] of ECRANS) {
      await page.goto(`${BASE}${chemin}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await page.addScriptTag({ path: axeSource });
      const res = await page.evaluate(() => window.axe.run(document, { resultTypes: ["violations"] }));
      for (const v of res.violations) {
        const ligne = {
          theme: nomTheme,
          ecran,
          chemin,
          regle: v.id,
          gravite: v.impact ?? "—",
          aide: v.help,
          nombre: v.nodes.length,
          exemples: v.nodes.slice(0, 3).map((n) => ({
            cible: n.target.join(" "),
            extrait: n.html.replace(/\s+/g, " ").slice(0, 110),
            raison: (n.any[0] ?? n.all[0] ?? n.none[0])?.message ?? "",
          })),
        };
        (estWcag(v) ? manquements : pratiques).push(ligne);
      }
      const n = res.violations.filter(estWcag).reduce((s, v) => s + v.nodes.length, 0);
      console.log(`  ${n === 0 ? "✓" : "✗"} ${nomTheme.padEnd(7)} ${ecran.padEnd(24)} ${n === 0 ? "conforme" : `${n} élément(s) en défaut`}`);
    }
  }

  const total = (l) => l.reduce((s, x) => s + x.nombre, 0);
  console.log(`\n  ${manquements.length === 0 ? "Aucun manquement WCAG." : `${total(manquements)} élément(s) en défaut, ${manquements.length} constat(s).`}`);
  const parRegle = new Map();
  for (const m of manquements) parRegle.set(m.regle, (parRegle.get(m.regle) ?? 0) + m.nombre);
  for (const [regle, n] of [...parRegle].sort((a, b) => b[1] - a[1])) {
    const ex = manquements.find((m) => m.regle === regle);
    console.log(`\n  ${regle} — ${ex.aide} (${ex.gravite}, ${n} élément(s))`);
    for (const e of ex.exemples) console.log(`      ${e.cible}\n        ${e.extrait}\n        ${e.raison}`);
    console.log(`      écrans : ${[...new Set(manquements.filter((m) => m.regle === regle).map((m) => `${m.ecran} (${m.theme})`))].join(", ")}`);
  }
  if (pratiques.length) console.log(`\n  ${total(pratiques)} élément(s) relevant des bonnes pratiques d'axe-core, hors conformité WCAG.`);
  process.exitCode = manquements.length ? 1 : 0;
} finally {
  await navigateur?.close();
  serveur?.kill();
}
