import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ATTACHMENT_MAX_BYTES } from "./attachments.js";
import { buildMeetingReport, reportFileName } from "./meetings-report.js";
import type { Meetings } from "./meetings.js";

type Id = { Params: { id: string } };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const short = z.string().max(300);
const long = z.string().max(50_000);
const ActionStatus = z.enum(["a_faire", "en_cours", "soumis", "realise", "reporte", "annule"]);

const Fields = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  start_time: time.nullable().optional(),
  end_time: time.nullable().optional(),
  location: short.optional(),
  convened_by: short.optional(),
  facilitator: short.optional(),
  timekeeper: short.optional(),
  writer_id: z.string().max(100).optional(),
  writer_initials: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{1,8}$/)
    .optional(),
  service_code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{1,12}$/)
    .optional(),
  attendance_note: short.optional(),
  previous_summary: long.optional(),
  summary: long.optional(),
  next_date: date.nullable().optional(),
  next_time: time.nullable().optional(),
  next_location: short.optional(),
  next_topics: long.optional(),
  confidential: z.boolean().optional(),
  chair_id: z.string().max(100).nullable().optional(),
  video_link: z.string().trim().max(500).optional(),
  project_id: z.string().max(100).nullable().optional(),
  activity_id: z.string().max(100).nullable().optional(),
  partner_ids: z.array(z.string().max(100)).max(20).optional(),
});
const Invitee = z.object({
  user_id: z.string().max(100).nullable().optional(),
  contact_id: z.string().max(100).nullable().optional(),
  name: z.string().trim().max(200).optional(),
  function_label: short.optional(),
  unit_id: z.string().max(100).optional(),
});
const Invitees = z.array(Invitee).max(300);
const Create = Fields.extend({
  meeting_type: z.string().trim().min(1).max(200),
  meeting_date: date,
  timing: z.enum(["upcoming", "past"]).optional(),
  invitees: Invitees.optional(),
  repeat: z
    .object({ every: z.enum(["week", "2weeks", "month"]), count: z.number().int() })
    .nullable()
    .optional(),
});
const Patch = Fields.extend({
  meeting_type: z.string().trim().min(1).max(200).optional(),
  meeting_date: date.optional(),
  status: z.enum(["planned", "held", "cancelled"]).optional(),
});
const Content = z.object({
  agenda: z
    .array(
      z.object({
        id: z.string().max(100).optional(),
        subject: z.string().trim().min(1).max(500),
        domain_id: z.string().max(100).nullable().optional(),
        speakers: short.optional(),
        notes: long.optional(),
        actions: z
          .array(
            z.object({
              id: z.string().max(100).optional(),
              text: z.string().trim().min(1).max(2000),
              responsible_id: z.string().max(100).nullable().optional(),
              responsible_name: short.optional(),
              due_on: date.nullable().optional(),
              status: ActionStatus.optional(),
            }),
          )
          .max(100)
          .optional(),
        decisions: z
          .array(
            z.object({
              id: z.string().max(100).optional(),
              text: z.string().trim().min(1).max(5000),
              owner_id: z.string().max(100).nullable().optional(),
              due_on: date.nullable().optional(),
            }),
          )
          .max(50)
          .optional(),
      }),
    )
    .max(100),
  attendees: z
    .array(
      z.object({
        user_id: z.string().max(100).nullable().optional(),
        name: z.string().trim().min(1).max(200),
        function_label: short.optional(),
        presence: z.enum(["present", "excuse", "absent", "represente"]).optional(),
      }),
    )
    .max(300),
});
const ActionPatch = z.object({
  status: ActionStatus.optional(),
  due_on: date.optional(),
  postponed_reason: z.string().max(1000).optional(),
});

/** Routes du module réunions : toutes derrière le contrôle de session du périmètre privé. */
export function meetingRoutes(r: FastifyInstance, meetings: Meetings) {
  r.get("/api/meetings", async (req) =>
    meetings.list(
      req.userId,
      req.orgId,
      z
        .object({
          project_id: z.string().max(100).optional(),
          activity_id: z.string().max(100).optional(),
          partner_id: z.string().max(100).optional(),
        })
        .parse(req.query),
    ),
  );
  r.post("/api/meetings", async (req) => meetings.create(req.userId, req.orgId, Create.parse(req.body)));
  r.get<Id>("/api/meetings/:id", async (req) => meetings.get(req.userId, req.params.id));
  r.patch<Id>("/api/meetings/:id", async (req) => meetings.update(req.userId, req.params.id, Patch.parse(req.body)));
  r.delete<Id>("/api/meetings/:id", async (req) => {
    await meetings.remove(req.userId, req.params.id);
    return { ok: true };
  });
  r.put<Id>("/api/meetings/:id/content", async (req) =>
    meetings.saveContent(req.userId, req.params.id, Content.parse(req.body)),
  );
  // Programmation et convocation (docs/PARCOURS-METIER.md, parcours 1)
  r.put<Id>("/api/meetings/:id/invitees", async (req) =>
    meetings.setInvitees(req.userId, req.params.id, z.object({ invitees: Invitees }).parse(req.body).invitees),
  );
  r.post<Id>("/api/meetings/:id/convene", async (req) =>
    meetings.convene(
      req.userId,
      req.params.id,
      z.object({ short_notice: z.boolean().optional() }).parse(req.body ?? {}),
    ),
  );
  r.post<Id>("/api/meetings/:id/respond", async (req) =>
    meetings.respond(
      req.userId,
      req.params.id,
      z
        .object({ response: z.enum(["accepted", "declined", "delegated"]), delegate_name: short.optional() })
        .parse(req.body),
    ),
  );
  r.post<Id>("/api/meetings/:id/documents", { bodyLimit: ATTACHMENT_MAX_BYTES }, async (req) => {
    const q = z.object({ name: z.string().min(1).max(500), item: z.string().max(100).optional() }).parse(req.query);
    return meetings.addDocument(
      req.userId,
      req.params.id,
      q.name,
      req.body instanceof Buffer ? req.body : Buffer.alloc(0),
      q.item,
    );
  });
  r.get<Id>("/api/meeting-documents/:id", async (req, reply) => {
    const d = await meetings.document(req.userId, req.params.id);
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
  r.delete<Id>("/api/meeting-documents/:id", async (req) => {
    await meetings.removeDocument(req.userId, req.params.id);
    return { ok: true };
  });
  // Circuit du compte rendu : soumis par le rédacteur, retourné ou validé par la présidence
  r.post<Id>("/api/meetings/:id/submit", async (req) => meetings.submit(req.userId, req.params.id));
  r.post<Id>("/api/meetings/:id/return", async (req) =>
    meetings.returnReport(
      req.userId,
      req.params.id,
      z.object({ comment: z.string().max(2000) }).parse(req.body).comment,
    ),
  );
  r.post<Id>("/api/meetings/:id/validate", async (req) => meetings.validate(req.userId, req.params.id));
  r.post<Id>("/api/meetings/:id/reopen", async (req) => meetings.reopen(req.userId, req.params.id));
  r.get<Id>("/api/meetings/:id/report.docx", async (req, reply) => {
    const m = await meetings.get(req.userId, req.params.id);
    return reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      .header("Content-Disposition", `attachment; filename="${reportFileName(m)}"`)
      .header("Cache-Control", "private, no-store")
      .send(await buildMeetingReport(m));
  });
  r.get("/api/meeting-actions", async (req) =>
    meetings.listActions(req.userId, req.orgId, {
      mine: z.object({ mine: z.enum(["true", "false"]).optional() }).parse(req.query).mine === "true",
    }),
  );
  r.patch<Id>("/api/meeting-actions/:id", async (req) =>
    meetings.updateAction(req.userId, req.params.id, ActionPatch.parse(req.body)),
  );
}
