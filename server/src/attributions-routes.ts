import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { type Attributions, DOMAIN_ROLES, RELATION_KINDS } from "./attributions.js";

type Id = { Params: { id: string } };
const id = z.string().max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Domain = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(1000).optional() });
const Content = z.object({
  mission: z.string().trim().min(1).max(2000),
  legal_ref: z.string().max(500).optional(),
  valid_from: date.nullable().optional(),
  valid_to: date.nullable().optional(),
  domains: z.array(z.object({ domain_id: id, role: z.enum(DOMAIN_ROLES) })).max(100),
  relations: z
    .array(
      z.object({
        target_unit_id: id,
        kind: z.enum(RELATION_KINDS),
        domain_id: id.nullable().optional(),
        note: z.string().max(500).optional(),
      }),
    )
    .max(100),
});
const Create = Content.extend({ unit_id: id.nullable().optional(), user_id: id.nullable().optional() });

export function attributionRoutes(r: FastifyInstance, a: Attributions) {
  r.get("/api/domains", async (req) => a.domains(req.userId, req.orgId));
  r.post("/api/domains", async (req) => a.createDomain(req.userId, req.orgId, Domain.parse(req.body)));
  r.patch<Id>("/api/domains/:id", async (req) =>
    a.updateDomain(
      req.userId,
      req.params.id,
      Domain.partial().extend({ archived: z.boolean().optional() }).parse(req.body),
    ),
  );
  r.get("/api/attributions", async (req) => a.list(req.userId, req.orgId));
  r.post("/api/attributions", async (req) => a.create(req.userId, req.orgId, Create.parse(req.body)));
  r.get<Id>("/api/attributions/:id", async (req) => a.get(req.userId, req.params.id));
  r.put<Id>("/api/attributions/:id", async (req) => a.update(req.userId, req.params.id, Content.parse(req.body)));
  r.delete<Id>("/api/attributions/:id", async (req) => {
    await a.remove(req.userId, req.params.id);
    return { ok: true };
  });
  r.post<Id>("/api/attributions/:id/approve", async (req) => a.approve(req.userId, req.params.id));
}
