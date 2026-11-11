import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ATTACHMENT_MAX_BYTES } from "./attachments.js";
import { type DossierDocuments, OWNERS } from "./dossier-documents.js";
import { previewDocument } from "./documents/extract.js";
import { sendFile } from "./file-reply.js";

type Id = { Params: { id: string } };
const id = z.string().max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Meta = z.object({
  title: z.string().max(300).optional(),
  other_label: z.string().max(200).optional(),
  reference: z.string().max(120).optional(),
  issued_on: date.nullable().optional(),
  expires_on: date.nullable().optional(),
  notes: z.string().max(5000).optional(),
});
const Owner = z.object({ owner: z.enum(OWNERS), owner_id: id });

/** Documents des dossiers : projet, courrier, activité. Chaque document suit les droits de son dossier. */
export function dossierDocumentRoutes(r: FastifyInstance, d: DossierDocuments) {
  r.get("/api/dossier-documents", async (req) => {
    const q = Owner.parse(req.query);
    return d.folder(req.userId, q.owner, q.owner_id);
  });
  r.post("/api/dossier-documents", { bodyLimit: ATTACHMENT_MAX_BYTES }, async (req) => {
    const q = Owner.extend({
      name: z.string().min(1).max(500),
      nature: z.string().trim().min(1).max(60),
      ...Meta.shape,
    }).parse(req.query);
    return d.add(req.userId, q.owner, q.owner_id, q.name, req.body instanceof Buffer ? req.body : Buffer.alloc(0), q);
  });
  r.get<Id>("/api/dossier-documents/:id", async (req, reply) => {
    const f = await d.download(req.userId, req.params.id);
    return sendFile(reply, f, (req.query as { inline?: string }).inline === "1");
  });
  // Aperçu dans le tiroir : PDF et images dans la page ; Word, Excel et texte en texte structuré, sans HTML du fichier
  r.get<Id>("/api/dossier-documents/:id/preview", async (req) => {
    const f = await d.download(req.userId, req.params.id);
    return previewDocument(f.filename, Buffer.from(f.data));
  });
  r.patch<Id>("/api/dossier-documents/:id", async (req) =>
    d.update(
      req.userId,
      req.params.id,
      Meta.extend({ nature_code: z.string().trim().min(1).max(60).optional() }).parse(req.body),
    ),
  );
  r.delete<Id>("/api/dossier-documents/:id", async (req) => d.remove(req.userId, req.params.id));
}
