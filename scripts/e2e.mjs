// Test de bout en bout : démarre Cadence (mode démo), pilote un vrai navigateur, vérifie le parcours IA.
// Usage : npm run build && npm run e2e
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const PORT = 4321;
const BASE = `http://localhost:${PORT}`;

const server = spawn(process.execPath, ["server/dist/index.js"], {
  // Sans CADENCE_DEMO, le serveur ne sème aucune donnée et la connexion par choix de profil n'existe pas :
  // ce test attendait un écran de connexion vide depuis que le mode démo a cessé d'être le comportement par défaut.
  env: { ...process.env, PORT: String(PORT), DATA_DIR: ":memory:", CADENCE_DEMO: "1", ANTHROPIC_API_KEY: "", NODE_ENV: "test" },
  stdio: "inherit",
});
const step = (m) => console.log(`  ✓ ${m}`);
let browser;

try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(`${BASE}/api/auth/users`)).ok) break; } catch {} await sleep(100); }
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // Le compte de tête est lu au serveur : le jeu de démonstration a déjà été renommé une fois, et ce test
  // cherchait encore « Alice Martin » sans que personne s'en aperçoive — il ne pouvait pas s'exécuter.
  const comptes = await (await fetch(`${BASE}/api/auth/users`)).json();
  const moi = comptes.find((u) => u.id === "u_alice") ?? comptes.find((u) => !u.is_ai);
  assert.ok(moi, "aucun compte dans le jeu de démonstration");

  await page.goto(`${BASE}/login`);
  await page.getByText(moi.name, { exact: true }).first().click();
  await page.getByRole("heading", { name: new RegExp(moi.name.split(" ")[0]) }).waitFor();
  step(`connexion et accueil (${moi.name})`);

  // On ouvre le tableau du projet par son adresse : l'accueil de la direction ne liste plus les projets
  // depuis que le tableau de bord du jour l'a remplacé, et ce test cliquait encore un lien disparu.
  const projets = await page.evaluate(() => fetch("/api/projects").then((r) => r.json()));
  const projet = projets.find((p) => /Application mobile/.test(p.name)) ?? projets[0];
  assert.ok(projet, "aucun projet dans le jeu de démonstration");
  await page.goto(`${BASE}/projects/${projet.id}/board`);
  await page.getByText("Point d'avancement hebdo").first().click();
  await page.getByRole("dialog", { name: "Détail de la tâche" }).waitFor();
  step(`tableau Kanban et panneau de tâche (${projet.name})`);

  await page.getByRole("button", { name: /Confier à Atlas/ }).click();
  let approved = 0;
  for (let i = 0; i < 40; i++) {
    const btn = page.getByRole("button", { name: "Autoriser" }).first();
    if (await btn.count()) { if (await btn.click({ timeout: 2000 }).then(() => true, () => false)) approved++; await sleep(300); continue; }
    if (await page.getByText(/Point sur [A-Z]+-\d+/).count()) break;
    await sleep(250);
  }
  assert.ok(approved >= 2, `au moins deux validations attendues, reçu ${approved}`);
  await page.getByText(/Point sur [A-Z]+-\d+/).first().waitFor();
  step(`Atlas a travaillé, ${approved} action(s) validée(s), compte rendu publié`);

  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+j");
  await page.getByRole("button", { name: "Qu'est-ce qui est en retard, et pourquoi ?" }).click();
  await page.getByText(/J'ai trouvé \d+ tâche/).waitFor();
  step("l'assistant répond avec les tâches en retard");

  assert.deepEqual(errors, [], "aucune erreur JavaScript");
  console.log("\nE2E : OK");
} catch (e) {
  console.error("\nE2E : ÉCHEC\n", e);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
