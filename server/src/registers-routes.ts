import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Gaps } from "./gaps.js";
import type { Registers } from "./registers.js";
import type { Signature } from "./signature.js";

type Id = { Params: { id: string } };
const id = z.string().max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const title = z.string().trim().min(1).max(300);
const score = z.number().int().min(1).max(5);
const num = z.number().min(-1e14).max(1e14);
const Doc = z.object({
  title,
  kind: z.string().max(60).optional(),
  body: z.string().max(100_000).optional(),
  domain_id: id.nullable().optional(),
  unit_id: id.nullable().optional(),
  confidential: z.boolean().optional(),
  due_on: date.nullable().optional(),
  steps: z.array(z.object({ actor_id: id, action: z.enum(["avis", "visa", "signature"]) })).max(20),
});
const Risk = z.object({
  title: title.optional(),
  probability: score.optional(),
  impact: score.optional(),
  owner_id: id.nullable().optional(),
  mitigation: z.string().max(2000).optional(),
  status: z.enum(["open", "mitigated", "closed"]).optional(),
  project_id: id.nullable().optional(),
});
const Indicator = z.object({
  name: title.optional(),
  unit_label: z.string().max(60).optional(),
  baseline: num.optional(),
  target: num.optional(),
  result: num.optional(),
  source: z.string().max(300).optional(),
  plan_activity_id: id.nullable().optional(),
});

export function registerRoutes(r: FastifyInstance, s: Signature, reg: Registers, g: Gaps) {
  r.get("/api/signature", async (req) =>
    s.list(
      req.userId,
      req.orgId,
      z.object({ box: z.enum(["to_sign", "mine", "all"]).default("to_sign") }).parse(req.query).box,
    ),
  );
  r.post("/api/signature", async (req) => s.create(req.userId, req.orgId, Doc.parse(req.body)));
  r.get<Id>("/api/signature/:id", async (req) => s.get(req.userId, req.params.id));
  r.put<Id>("/api/signature/:id", async (req) => s.update(req.userId, req.params.id, Doc.parse(req.body)));
  r.delete<Id>("/api/signature/:id", async (req) => {
    await s.remove(req.userId, req.params.id);
    return { ok: true };
  });
  r.post<Id>("/api/signature/:id/start", async (req) => s.start(req.userId, req.params.id));
  r.post<Id>("/api/signature/:id/decide", async (req) =>
    s.decide(
      req.userId,
      req.params.id,
      z.object({ decision: z.enum(["approve", "reject"]), comment: z.string().max(2000).optional() }).parse(req.body),
    ),
  );
  r.get("/api/delegations", async (req) => s.delegations(req.userId, req.orgId));
  r.post("/api/delegations", async (req) =>
    s.delegate(
      req.userId,
      req.orgId,
      z
        .object({ to_user: id, start_on: date, end_on: date, scope: z.enum(["visa", "signature"]).optional() })
        .parse(req.body),
    ),
  );
  r.delete<Id>("/api/delegations/:id", async (req) => {
    await s.revoke(req.userId, req.params.id);
    return { ok: true };
  });

  r.get("/api/correspondence", async (req) =>
    reg.listMail(
      req.userId,
      req.orgId,
      z
        .object({
          direction: z.enum(["entrant", "sortant"]).optional(),
          project_id: id.optional(),
          activity_id: id.optional(),
          partner_id: id.optional(),
        })
        .parse(req.query),
    ),
  );
  r.post("/api/correspondence", async (req) =>
    reg.registerMail(
      req.userId,
      req.orgId,
      z
        .object({
          direction: z.enum(["entrant", "sortant"]),
          subject: title,
          correspondent: z.string().trim().max(300).optional(),
          partner_id: id.nullable().optional(),
          contact_id: id.nullable().optional(),
          doc_date: date.nullable().optional(),
          received_on: date,
          due_on: date.nullable().optional(),
          confidential: z.boolean().optional(),
          reply_to_id: id.nullable().optional(),
          project_id: id.nullable().optional(),
          activity_id: id.nullable().optional(),
        })
        .parse(req.body),
    ),
  );
  r.post<Id>("/api/correspondence/:id/assign", async (req) =>
    reg.assignMail(
      req.userId,
      req.params.id,
      z
        .object({
          unit_id: id.nullable().optional(),
          assignee_id: id.nullable().optional(),
          due_on: date.nullable().optional(),
          instruction: z.string().max(300).optional(),
          annotation: z.string().max(5000).optional(),
          copies: z
            .array(z.object({ user_id: id, purpose: z.enum(["information", "avis"]).optional() }))
            .max(50)
            .optional(),
        })
        .parse(req.body),
    ),
  );
  // Circuit du courrier : prise en charge, classement sans suite, fil des annotations, tableau de bord
  r.get("/api/correspondence/summary", async (req) => reg.summary(req.userId, req.orgId));
  r.post<Id>("/api/correspondence/:id/start", async (req) => reg.startMail(req.userId, req.params.id));
  r.post<Id>("/api/correspondence/:id/file", async (req) =>
    reg.fileMail(req.userId, req.params.id, z.object({ reason: z.string().max(2000) }).parse(req.body).reason),
  );
  r.get<Id>("/api/correspondence/:id/annotations", async (req) => reg.annotations(req.userId, req.params.id));
  r.post<Id>("/api/correspondence/:id/annotations", async (req) =>
    reg.addAnnotation(req.userId, req.params.id, z.object({ text: z.string().max(5000) }).parse(req.body).text),
  );
  r.post<Id>("/api/correspondence/:id/close", async (req) =>
    reg.closeMail(
      req.userId,
      req.params.id,
      z.object({ response_ref: z.string().max(200).optional() }).parse(req.body),
    ),
  );

  r.get("/api/risks", async (req) =>
    reg.risks(req.userId, req.orgId, z.object({ project_id: id.optional() }).parse(req.query ?? {}).project_id),
  );
  r.post("/api/risks", async (req) =>
    reg.createRisk(req.userId, req.orgId, Risk.extend({ title, probability: score, impact: score }).parse(req.body)),
  );
  r.patch<Id>("/api/risks/:id", async (req) => reg.updateRisk(req.userId, req.params.id, Risk.parse(req.body)));
  r.get("/api/indicators", async (req) => reg.indicators(req.userId, req.orgId));
  r.post("/api/indicators", async (req) =>
    reg.createIndicator(req.userId, req.orgId, Indicator.extend({ name: title, target: num }).parse(req.body)),
  );
  r.patch<Id>("/api/indicators/:id", async (req) =>
    reg.updateIndicator(req.userId, req.params.id, Indicator.parse(req.body)),
  );

  r.get("/api/gaps", async (req) =>
    g.list(req.userId, req.orgId, z.object({ status: z.string().max(20).optional() }).parse(req.query)),
  );
  r.post("/api/gaps/detect", async (req) =>
    g.detect(
      req.userId,
      req.orgId,
      z.object({ days: z.number().int().min(7).max(730).optional() }).parse(req.body ?? {}).days,
    ),
  );
  r.patch<Id>("/api/gaps/:id", async (req) =>
    g.decide(
      req.userId,
      req.params.id,
      z
        .object({ status: z.enum(["justified", "to_fix", "review"]), note: z.string().trim().min(1).max(1000) })
        .parse(req.body),
    ),
  );
}
