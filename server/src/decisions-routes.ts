import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Decisions } from "./decisions.js";

type Id = { Params: { id: string } };
const id = z.string().max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Record_ = z.object({
  title: z.string().trim().min(1).max(300),
  content: z.string().trim().min(1).max(20_000),
  decided_on: date,
  project_id: id.nullable().optional(),
  activity_id: id.nullable().optional(),
  meeting_id: id.nullable().optional(),
  owner_id: id.nullable().optional(),
  due_on: date.nullable().optional(),
  confidential: z.boolean().optional(),
  replaces_id: id.nullable().optional(),
});

/** Registre des décisions de la DG : aucune route ne modifie ni ne supprime une décision enregistrée. */
export function decisionRoutes(r: FastifyInstance, d: Decisions) {
  r.get("/api/decisions", async (req) =>
    d.list(
      req.userId,
      req.orgId,
      z.object({ status: z.enum(["a_executer", "en_cours", "executee", "remplacee"]).optional() }).parse(req.query),
    ),
  );
  r.post("/api/decisions", async (req) => d.record(req.userId, req.orgId, Record_.parse(req.body)));
  r.get<Id>("/api/decisions/:id", async (req) => d.get(req.userId, req.params.id));
  r.patch<Id>("/api/decisions/:id/execution", async (req) =>
    d.execute(
      req.userId,
      req.params.id,
      z.object({ status: z.enum(["en_cours", "executee"]), note: z.string().max(2000).optional() }).parse(req.body),
    ),
  );
}
