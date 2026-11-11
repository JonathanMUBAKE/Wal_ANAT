import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Agreements } from "./agreements.js";
import { ATTACHMENT_MAX_BYTES } from "./attachments.js";

type Id = { Params: { id: string } };
const id = z.string().max(100);
const code = z.string().trim().max(60);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Fields = z.object({
  type_code: code.min(1).optional(),
  title: z.string().trim().min(1).max(300).optional(),
  content: z.string().max(100_000).optional(),
  partner_ids: z.array(id).max(20).optional(),
  lead_partner_id: id.nullable().optional(),
  partner_ref: z.string().max(120).optional(),
  effective_on: date.nullable().optional(),
  end_on: date.nullable().optional(),
  new_end_on: date.nullable().optional(),
  tacit_renewal: z.boolean().optional(),
  unit_id: id.nullable().optional(),
  focal_id: id.nullable().optional(),
  confidential: z.boolean().optional(),
});

/** Accords avec les partenaires (lot PA2) : aucune route ne modifie un accord conclu, sauf l'avenant et la résiliation. */
export function agreementRoutes(r: FastifyInstance, a: Agreements) {
  r.get("/api/agreements", async (req) =>
    a.list(
      req.userId,
      req.orgId,
      z
        .object({
          state: z.enum(["preparation", "signature", "vigueur", "resilie", "echu"]).optional(),
          partner_id: id.optional(),
          type: code.optional(),
          q: z.string().max(200).optional(),
        })
        .parse(req.query),
    ),
  );
  r.post("/api/agreements", async (req) =>
    a.create(
      req.userId,
      req.orgId,
      Fields.extend({
        type_code: code.min(1),
        title: z.string().trim().min(1).max(300),
        partner_ids: z.array(id).max(20),
      }).parse(req.body),
    ),
  );
  r.get<Id>("/api/agreements/:id", async (req) => a.get(req.userId, req.params.id));
  r.patch<Id>("/api/agreements/:id", async (req) => a.update(req.userId, req.params.id, Fields.parse(req.body)));
  r.delete<Id>("/api/agreements/:id", async (req) => a.remove(req.userId, req.params.id));
  r.post<Id>("/api/agreements/:id/sign", async (req) =>
    a.sign(
      req.userId,
      req.params.id,
      z
        .object({ steps: z.array(z.object({ actor_id: id, action: z.enum(["avis", "visa", "signature"]) })).max(20) })
        .parse(req.body).steps,
    ),
  );
  r.post<Id>("/api/agreements/:id/activate", async (req) =>
    a.activate(
      req.userId,
      req.params.id,
      z.object({ signed_on: date, effective_on: date.nullable().optional() }).parse(req.body),
    ),
  );
  r.post<Id>("/api/agreements/:id/amend", async (req) =>
    a.amend(
      req.userId,
      req.params.id,
      z
        .object({
          title: z.string().trim().min(1).max(300),
          content: z.string().max(100_000).optional(),
          new_end_on: date.nullable().optional(),
        })
        .parse(req.body),
    ),
  );
  r.post<Id>("/api/agreements/:id/terminate", async (req) =>
    a.terminate(req.userId, req.params.id, z.object({ reason: z.string().max(2000), ended_on: date }).parse(req.body)),
  );
  // Pièces de collaboration : au partenaire, et le cas échéant à l'un de ses accords
  r.post<Id>("/api/partners/:id/documents", { bodyLimit: ATTACHMENT_MAX_BYTES }, async (req) => {
    const q = z
      .object({ name: z.string().min(1).max(500), nature: code.min(1), agreement_id: id.optional() })
      .parse(req.query);
    return a.addDocument(req.userId, req.params.id, q.name, req.body instanceof Buffer ? req.body : Buffer.alloc(0), {
      nature: q.nature,
      agreement_id: q.agreement_id,
    });
  });
  r.get<Id>("/api/partner-documents/:id", async (req, reply) => {
    const d = await a.document(req.userId, req.params.id);
    // Une pièce se télécharge : aucun fichier ne s'exécute dans la page
    return reply
      .header("Content-Type", d.mime)
      .header(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(d.filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      )
      .header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "sandbox")
      .header("Cache-Control", "private, no-store")
      .send(d.data);
  });
  r.delete<Id>("/api/partner-documents/:id", async (req) => a.removeDocument(req.userId, req.params.id));
}
