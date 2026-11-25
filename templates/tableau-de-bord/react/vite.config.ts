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
  },
});
