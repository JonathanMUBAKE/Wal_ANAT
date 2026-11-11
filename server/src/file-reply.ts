import type { FastifyReply } from "fastify";

/**
 * Envoi d'un fichier déposé. Seuls les PDF et les images s'affichent dans la page (aperçu) ; tout le reste se
 * télécharge, pour qu'aucun fichier ne s'exécute dans l'application. Même règle que les pièces jointes des tâches.
 */
export function sendFile(
  reply: FastifyReply,
  f: { filename: string; mime: string; data: Buffer },
  inlineRequested: boolean,
) {
  const pdf = f.mime === "application/pdf";
  const inline = inlineRequested && (pdf || f.mime.startsWith("image/"));
  return (
    reply
      .header("Content-Type", f.mime)
      .header(
        "Content-Disposition",
        `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      )
      .header("X-Content-Type-Options", "nosniff")
      // Le bac à sable empêcherait le lecteur PDF du navigateur de s'ouvrir dans l'aperçu
      .header("Content-Security-Policy", inline && pdf ? "frame-ancestors 'self'" : "sandbox")
      .header("Cache-Control", "private, no-store")
      .send(f.data)
  );
}
