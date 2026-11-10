// Présentation locale d'ANAT Pilotage avec des données fictives : npm run demo:anat
import { execSync, spawn } from "node:child_process";

const env = { ...process.env, PORT: process.env.PORT ?? "4300", DATA_DIR: ":memory:", CADENCE_DEMO: "1", ANAT_DEMO: "1" };
execSync("npm run build", { stdio: "inherit", shell: true });
console.log(`\n  ANAT Pilotage : http://127.0.0.1:${env.PORT}/pilotage`);
console.log("  Données fictives, effacées à l'arrêt du serveur.\n");
const server = spawn("npm", ["start"], { stdio: "inherit", shell: true, env });
server.on("exit", (code) => process.exit(code ?? 0));
