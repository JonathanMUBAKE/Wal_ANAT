import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PARTNER_STATES, type Partners } from "./partners.js";

type Id = { Params: { id: string } };
const id = z.string().max(100);
const code = z.string().trim().max(60);
const text = (max: number) => z.string().max(max);
const Fields = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  acronym: text(40).optional(),
  official_id: text(80).optional(),
  type_code: code.min(1).optional(),
  categories: z.array(code).max(20).optional(),
  country: text(3).optional(),
  city: text(120).optional(),
  address: text(500).optional(),
  website: text(300).optional(),
  email: text(200).optional(),
  phone: text(60).optional(),
  description: text(10_000).optional(),
  unit_id: id.nullable().optional(),
  focal_id: id.nullable().optional(),
  focal_ids: z.array(id).max(20).optional(),
  confidential: z.boolean().optional(),
});
const Contact = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  title: text(200).optional(),
  email: text(200).optional(),
  phone: text(60).optional(),
  notes: text(2000).optional(),
  principal: z.boolean().optional(),
  archived: z.boolean().optional(),
});
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Annuaire des partenaires (lot PA1). Aucune route ne supprime un contact ni une note : ils s'archivent ou restent. */
export function partnerRoutes(r: FastifyInstance, p: Partners) {
  r.get("/api/partners", async (req) => {
    const q = z
      .object({
        state: z.enum(PARTNER_STATES).optional(),
        type: code.optional(),
        category: code.optional(),
        q: text(200).optional(),
        selectable: z.enum(["0", "1"]).optional(),
      })
      .parse(req.query);
    return p.list(req.userId, req.orgId, { ...q, selectable: q.selectable === "1" });
  });
  r.post("/api/partners", async (req) =>
    p.create(
      req.userId,
      req.orgId,
      Fields.extend({ name: z.string().trim().min(1).max(300), type_code: code.min(1) }).parse(req.body),
    ),
  );
  r.get<Id>("/api/partners/:id", async (req) => p.get(req.userId, req.params.id));
  r.patch<Id>("/api/partners/:id", async (req) => p.update(req.userId, req.params.id, Fields.parse(req.body)));
  r.delete<Id>("/api/partners/:id", async (req) => p.remove(req.userId, req.params.id));
  r.post<Id>("/api/partners/:id/state", async (req) =>
    p.setState(
      req.userId,
      req.params.id,
      z.object({ state: z.enum(PARTNER_STATES), reason: text(2000).optional() }).parse(req.body),
    ),
  );
  r.post<Id>("/api/partners/:id/merge", async (req) =>
    p.merge(req.userId, req.params.id, z.object({ into_id: id }).parse(req.body).into_id),
  );
  r.post<Id>("/api/partners/:id/contacts", async (req) =>
    p.addContact(
      req.userId,
      req.params.id,
      Contact.extend({ name: z.string().trim().min(1).max(200) }).parse(req.body),
    ),
  );
  r.patch<Id>("/api/partner-contacts/:id", async (req) =>
    p.updateContact(req.userId, req.params.id, Contact.parse(req.body)),
  );
  r.post<Id>("/api/partners/:id/notes", async (req) =>
    p.addNote(
      req.userId,
      req.params.id,
      z.object({ body: text(10_000), happened_on: date.optional() }).parse(req.body),
    ),
  );
}
