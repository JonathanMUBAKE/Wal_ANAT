import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    port: 4184,
    strictPort: true,
    /* Vite refuse par défaut les requêtes dont l'en-tête Host lui est inconnu.
       On autorise le domaine des tunnels Cloudflare éphémères, et rien d'autre :
       le serveur de développement reste inaccessible depuis un autre nom. */
    allowedHosts: [".trycloudflare.com"],
    /* Même origine en développement : le navigateur appelle /api sur le port de
       la console, et Vite relaie vers ANAT Pilotage. Aucun CORS, aucun cookie
       affaibli — exactement ce qui est promis à l'agent serveur dans
       docs/03-questions.md, et ce que fera le déploiement sous /console/. */
    proxy: {
      "/api": { target: process.env.ANAT_API ?? "http://127.0.0.1:4300", changeOrigin: false },
    },
  },
});
