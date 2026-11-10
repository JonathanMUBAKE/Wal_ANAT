import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Deliverables } from "./deliverables.js";
import type { Plans } from "./plans.js";

type Id = { Params: { id: string } };
const id = z.string().max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().min(0).max(1e14);
const title = z.string().trim().min(1).max(300);
const Activity = z.object({
  parent_id: id.nullable().optional(),
  domain_id: id.nullable().optional(),
  title: title.optional(),
  responsible_id: id.nullable().optional(),
  objective: z.string().max(2000).optional(),
  target_value: z.number().min(0).max(1e14).nullable().optional(),
  unit_label: z.string().max(60).optional(),
  start_on: date.nullable().optional(),
  end_on: date.nullable().optional(),
  budget_planned: money.nullable().optional(),
});
const reason = z.string().trim().min(1).max(1000);
const Deliverable = z.object({
  activity_id: id.nullable().optional(),
  contract_id: id.nullable().optional(),
  title: title.optional(),
  description: z.string().max(5000).optional(),
  criteria: z.string().max(5000).optional(),
  responsible_id: id.optional(),
  validator_id: id.optional(),
  due_on: date.nullable().optional(),
});
const Contract = z.object({
  user_id: id.nullable().optional(),
  consultant_name: z.string().max(200).optional(),
  title,
  terms: z.string().max(10_000).optional(),
  start_on: date,
  end_on: date,
  amount: money.nullable().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  supervisor_id: id,
});

export function planRoutes(r: FastifyInstance, p: Plans, d: Deliverables) {
  r.get("/api/plans", async (req) =>
    p.list(req.userId, req.orgId, z.object({ year: z.coerce.number().int().optional() }).parse(req.query)),
  );
  r.post("/api/plans", async (req) =>
    p.create(
      req.userId,
      req.orgId,
      z.object({ unit_id: id, year: z.number().int().min(2000).max(2100), title }).parse(req.body),
    ),
  );
  r.get<Id>("/api/plans/:id", async (req) => p.get(req.userId, req.params.id));
  r.delete<Id>("/api/plans/:id", async (req) => {
    await p.remove(req.userId, req.params.id);
    return { ok: true };
  });
  r.post<Id>("/api/plans/:id/activities", async (req) =>
    p.addActivity(req.userId, req.params.id, Activity.extend({ title }).parse(req.body)),
  );
  r.post<Id>("/api/plans/:id/submit", async (req) => p.submit(req.userId, req.params.id));
  r.post<Id>("/api/plans/:id/approve", async (req) => p.approve(req.userId, req.params.id));
  r.post<Id>("/api/plans/:id/return", async (req) =>
    p.returnPlan(req.userId, req.params.id, z.object({ comment: reason }).parse(req.body).comment),
  );
  r.patch<Id>("/api/plan-activities/:id", async (req) =>
    p.updateActivity(req.userId, req.params.id, Activity.parse(req.body)),
  );
  r.delete<Id>("/api/plan-activities/:id", async (req) => p.removeActivity(req.userId, req.params.id));
  r.patch<Id>("/api/plan-activities/:id/progress", async (req) =>
    p.updateProgress(
      req.userId,
      req.params.id,
      z
        .object({
          progress: z.number().int().min(0).max(100).optional(),
          actual_value: money.nullable().optional(),
          budget_committed: money.nullable().optional(),
          budget_spent: money.nullable().optional(),
        })
        .parse(req.body),
    ),
  );
  r.post<Id>("/api/plan-activities/:id/revise", async (req) => {
    const b = z.object({ changes: Activity, reason }).parse(req.body);
    return p.revise(req.userId, req.params.id, b.changes, b.reason);
  });

  r.get("/api/deliverables", async (req) =>
    d.list(req.userId, req.orgId, { mine: z.object({ mine: z.string().optional() }).parse(req.query).mine === "true" }),
  );
  r.post("/api/deliverables", async (req) =>
    d.create(
      req.userId,
      req.orgId,
      Deliverable.extend({ title, responsible_id: id, validator_id: id }).parse(req.body),
    ),
  );
  r.get<Id>("/api/deliverables/:id", async (req) => d.get(req.userId, req.params.id));
  r.patch<Id>("/api/deliverables/:id", async (req) => d.update(req.userId, req.params.id, Deliverable.parse(req.body)));
  r.delete<Id>("/api/deliverables/:id", async (req) => {
    await d.remove(req.userId, req.params.id);
    return { ok: true };
  });
  r.post<Id>("/api/deliverables/:id/start", async (req) => d.start(req.userId, req.params.id));
  r.post<Id>("/api/deliverables/:id/submit", async (req) => d.submit(req.userId, req.params.id));
  r.post<Id>("/api/deliverables/:id/review", async (req) => d.review(req.userId, req.params.id));
  r.post<Id>("/api/deliverables/:id/paid", async (req) => d.markPaid(req.userId, req.params.id));
  r.post<Id>("/api/deliverables/:id/decide", async (req) =>
    d.decide(
      req.userId,
      req.params.id,
      z
        .object({ decision: z.enum(["valide", "a_corriger"]), comment: z.string().max(2000).optional() })
        .parse(req.body),
    ),
  );

  r.get("/api/contracts", async (req) => d.contracts(req.userId, req.orgId));
  r.post("/api/contracts", async (req) => d.createContract(req.userId, req.orgId, Contract.parse(req.body)));
  r.post<Id>("/api/contracts/:id/evaluate", async (req) =>
    d.evaluate(
      req.userId,
      req.params.id,
      z.object({ evaluation: reason, rating: z.number().int().min(1).max(5) }).parse(req.body),
    ),
  );
}
