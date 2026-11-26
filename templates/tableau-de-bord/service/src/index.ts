import { construire } from "./app.js";

/* Démarrage du service. Rien d'autre : toute la logique est dans `app.ts`,
   de sorte que les tests construisent exactement ce qui tourne en vrai. */
const port = Number(process.env.PORT ?? 4500);
const { app } = await construire({ url: process.env.DATABASE_URL });

await app.listen({ port, host: "127.0.0.1" });

console.log(`\n  Centre de commande — service du journal scellé`);
console.log(`  http://127.0.0.1:${port}`);
console.log(`  Réception des lots : POST /reception/lots`);
if (!process.env.SECRET_RECEPTION)
  console.log(`  ⚠ Aucun secret de réception : n'importe qui peut déposer des actes.\n`);
else console.log("");
