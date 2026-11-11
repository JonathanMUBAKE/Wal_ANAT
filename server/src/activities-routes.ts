import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { type Activities, HEALTHS } from "./activities.js";
import type { Pilotage } from "./pilotage.js";

type Id = { Params: { id: string } };
const id = z.string().max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const short = z.string().max(500);
const long = z.string().max(10_000);
const Fields = z.object({
  description: long.optional(),
  lead_id: id.nullable().optional(),
  unit_id: id.nullable().optional(),
  domain_id: id.nullable().optional(),
  start_on: date.nullable().optional(),
  start_time: time.nullable().optional(),
  end_on: date.nullable().optional(),
  location: short.optional(),
  counterpart: short.optional(),
  mandate: long.optional(),
  delegation: short.optional(),
  outcome: long.optional(),
  decision_needed: short.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  next_due_on: date.nullable().optional(),
  health: z.enum(HEALTHS).optional(),
  confidential: z.boolean().optional(),
  plan_activity_id: id.nullable().optional(),
});
const title = z.string().trim().min(1).max(300);
// Le type est contrôlé par le service contre le référentiel de l'institution
const kind = z.string().trim().min(1).max(60);
const Create = Fields.extend({ kind, title });
const Patch = Fields.extend({ title: title.optional() });
const Followup = z.object({
  text: z.string().trim().min(1).max(2000),
  responsible_id: id.nullable().optional(),
  due_on: date.nullable().optional(),
});
const money = z.number().min(0).max(1e14).nullable().optional();
const Governance = z.object({
  origin: z.enum(["interne", "confie"]).optional(),
  sponsor: short.optional(),
  convention_ref: short.optional(),
  lead_id: id.nullable().optional(),
  unit_id: id.nullable().optional(),
  domain_id: id.nullable().optional(),
  budget_planned: money,
  budget_spent: money,
  decision_needed: short.optional(),
  plan_activity_id: id.nullable().optional(),
});

export function activityRoutes(r: FastifyInstance, a: Activities, p: Pilotage) {
  r.get("/api/pilotage", async (req) => p.overview(req.userId, req.orgId));
  r.get("/api/activities", async (req) =>
    a.list(req.userId, req.orgId, z.object({ kind: kind.optional() }).parse(req.query)),
  );
  r.post("/api/activities", async (req) => a.create(req.userId, req.orgId, Create.parse(req.body)));
  r.get<Id>("/api/activities/:id", async (req) => a.get(req.userId, req.params.id));
  r.patch<Id>("/api/activities/:id", async (req) => a.update(req.userId, req.params.id, Patch.parse(req.body)));
  r.delete<Id>("/api/activities/:id", async (req) => {
    await a.remove(req.userId, req.params.id);
    return { ok: true };
  });
  r.post<Id>("/api/activities/:id/followups", async (req) =>
    a.addFollowup(req.userId, req.params.id, Followup.parse(req.body)),
  );
  r.patch<Id>("/api/activity-followups/:id", async (req) =>
    a.setFollowup(req.userId, req.params.id, z.object({ done: z.boolean() }).parse(req.body).done),
  );
  r.get<Id>("/api/projects/:id/governance", async (req) => a.governance(req.userId, req.params.id));
  r.put<Id>("/api/projects/:id/governance", async (req) =>
    a.setGovernance(req.userId, req.params.id, Governance.parse(req.body)),
  );
  r.put<{ Params: { id: string; userId: string } }>("/api/projects/:id/team/:userId", async (req) =>
    a.setTeamRole(
      req.userId,
      req.params.id,
      req.params.userId,
      z.object({ function_label: z.string().max(120) }).parse(req.body).function_label,
    ),
  );
}
