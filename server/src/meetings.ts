import { uid, type Queryable } from "./db.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, type Services } from "./services.js";

export type ActionStatus = "a_faire" | "en_cours" | "soumis" | "realise" | "reporte" | "annule";
export type MeetingStatus = "planned" | "held" | "validated" | "cancelled";
const CLOSED: ActionStatus[] = ["realise", "annule"];

export interface MeetingRow {
  id: string;
  org_id: string;
  year: number;
  seq: number;
  service_code: string;
  writer_initials: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  convened_by: string;
  facilitator: string;
  timekeeper: string;
  writer_id: string | null;
  writer_name: string;
  attendance_note: string;
  previous_meeting_id: string | null;
  previous_summary: string;
  summary: string;
  next_date: string | null;
  next_time: string | null;
  next_location: string;
  next_topics: string;
  confidential: boolean;
  status: MeetingStatus;
  validated_by: string | null;
  validated_at: string | null;
}
export interface MeetingAction {
  id: string;
  org_id: string;
  meeting_id: string;
  agenda_item_id: string;
  position: number;
  text: string;
  responsible_id: string | null;
  responsible_name: string;
  due_on: string | null;
  original_due_on: string | null;
  postponed_reason: string | null;
  status: ActionStatus;
  closed_by: string | null;
  closed_at: string | null;
}
type ActionWithMeeting = MeetingAction & Pick<MeetingRow, "seq" | "service_code" | "writer_initials" | "meeting_date">;
export interface AgendaItem {
  id: string;
  position: number;
  subject: string;
  speakers: string;
  notes: string;
  actions: MeetingAction[];
}
export interface Attendee {
  id: string;
  user_id: string | null;
  name: string;
  function_label: string;
  presence: string;
}
export interface MeetingDetail extends MeetingRow {
  reference: string;
  agenda: AgendaItem[];
  attendees: Attendee[];
  previous: {
    id: string;
    reference: string;
    meeting_date: string;
    start_time: string | null;
    end_time: string | null;
  } | null;
  carried: (MeetingAction & { meeting_reference: string })[];
  can: { edit: boolean; validate: boolean };
}

export type MeetingInput = Partial<
  Pick<
    MeetingRow,
    | "title"
    | "meeting_type"
    | "meeting_date"
    | "start_time"
    | "end_time"
    | "location"
    | "convened_by"
    | "facilitator"
    | "timekeeper"
    | "writer_id"
    | "writer_initials"
    | "service_code"
    | "attendance_note"
    | "previous_summary"
    | "summary"
    | "next_date"
    | "next_time"
    | "next_location"
    | "next_topics"
    | "confidential"
  >
> & { status?: "planned" | "held" | "cancelled" };

export interface ContentInput {
  agenda: {
    id?: string;
    subject: string;
    speakers?: string;
    notes?: string;
    actions?: {
      id?: string;
      text: string;
      responsible_id?: string | null;
      responsible_name?: string;
      due_on?: string | null;
      status?: ActionStatus;
    }[];
  }[];
  attendees: { user_id?: string | null; name: string; function_label?: string; presence?: string }[];
}

/** « 0010/ANAT/DIR/CR/PBB/07-26 » : numéro annuel, service, initiales du rédacteur, mois et année de la réunion. */
export const meetingReference = (m: Pick<MeetingRow, "seq" | "service_code" | "writer_initials" | "meeting_date">) =>
  `${String(m.seq).padStart(4, "0")}/ANAT/${m.service_code}/CR/${m.writer_initials}/${m.meeting_date.slice(5, 7)}-${m.meeting_date.slice(2, 4)}`;

const initialsOf = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[^\p{L}\s-]/gu, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "XX";

const assertDate = (v: string | null | undefined) => {
  if (v && !isRealDate(v)) throw badRequest(`Date invalide : ${v}`);
};
const locked = () => new HttpError(409, "Ce compte rendu est validé : rouvrez-le pour le modifier");
/** Une réunion confidentielle ne se voit que de ses gestionnaires, de son rédacteur et de ses participants. */
const VISIBLE = (alias: string, actor: string, manager: string) =>
  `(NOT ${alias}.confidential OR ${manager} OR ${alias}.writer_id = ${actor} OR EXISTS (SELECT 1 FROM meeting_attendees x WHERE x.meeting_id = ${alias}.id AND x.user_id = ${actor}))`;

export class Meetings {
  constructor(private svc: Services) {}

  private async row(id: string) {
    const m = await this.svc.db.one<MeetingRow>("SELECT * FROM meetings WHERE id = $1", [id]);
    if (!m) throw notFound("Réunion introuvable");
    return m;
  }

  private async can(actorId: string, orgId: string) {
    const perms = await this.svc.permissionsOf(actorId, orgId);
    return {
      view: perms.includes("meetings.view"),
      manage: perms.includes("meetings.manage"),
      validate: perms.includes("meetings.validate"),
    };
  }

  private async attends(actorId: string, meetingId: string) {
    return !!(await this.svc.db.one("SELECT 1 FROM meeting_attendees WHERE meeting_id = $1 AND user_id = $2", [
      meetingId,
      actorId,
    ]));
  }

  private async readable(actorId: string, id: string) {
    const m = await this.row(id);
    await this.svc.requirePerm(actorId, m.org_id, "meetings.view");
    const can = await this.can(actorId, m.org_id);
    if (m.confidential && !can.manage && m.writer_id !== actorId && !(await this.attends(actorId, id)))
      throw notFound("Réunion introuvable");
    return { m, can };
  }

  private async editable(actorId: string, id: string) {
    const { m, can } = await this.readable(actorId, id);
    if (!can.manage && m.writer_id !== actorId)
      throw forbidden("Seuls le rédacteur et les gestionnaires modifient cette réunion");
    if (m.status === "validated") throw locked();
    return m;
  }

  private async assertMember(orgId: string, userId: string, label: string) {
    if (!(await this.svc.orgRole(userId, orgId))) throw badRequest(`${label} doit être membre de l'organisation`);
  }

  // ---------------------------------------------------------------- lecture
  async list(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "meetings.view");
    const can = await this.can(actorId, orgId);
    const rows = await this.svc.db.query<MeetingRow & { open_actions: number; action_count: number }>(
      `SELECT m.*, (SELECT count(*)::int FROM meeting_actions a WHERE a.meeting_id = m.id) AS action_count,
        (SELECT count(*)::int FROM meeting_actions a WHERE a.meeting_id = m.id AND a.status NOT IN ('realise','annule')) AS open_actions
       FROM meetings m WHERE m.org_id = $1 AND ${VISIBLE("m", "$2", "$3")} ORDER BY m.meeting_date DESC, m.seq DESC`,
      [orgId, actorId, can.manage],
    );
    return rows.map((m) => ({ ...m, reference: meetingReference(m) }));
  }

  async get(actorId: string, id: string): Promise<MeetingDetail> {
    const { m, can } = await this.readable(actorId, id);
    return this.detail(m, actorId, can);
  }

  private async detail(
    m: MeetingRow,
    actorId: string,
    can: { manage: boolean; validate: boolean },
  ): Promise<MeetingDetail> {
    const db = this.svc.db;
    const items = await db.query<Omit<AgendaItem, "actions">>(
      "SELECT id, position, subject, speakers, notes FROM meeting_agenda_items WHERE meeting_id = $1 ORDER BY position",
      [m.id],
    );
    const actions = await db.query<MeetingAction>(
      "SELECT * FROM meeting_actions WHERE meeting_id = $1 ORDER BY position",
      [m.id],
    );
    const previous = m.previous_meeting_id
      ? await db.one<MeetingRow>("SELECT * FROM meetings WHERE id = $1", [m.previous_meeting_id])
      : undefined;
    const carried = await db.query<ActionWithMeeting>(
      `SELECT p.seq, p.service_code, p.writer_initials, p.meeting_date, a.* FROM meeting_actions a JOIN meetings p ON p.id = a.meeting_id
       WHERE a.org_id = $1 AND p.meeting_type = $2 AND p.meeting_date < $3 AND a.status NOT IN ('realise','annule') AND ${VISIBLE("p", "$4", "$5")}
       ORDER BY a.due_on NULLS LAST`,
      [m.org_id, m.meeting_type, m.meeting_date, actorId, can.manage],
    );
    return {
      ...m,
      reference: meetingReference(m),
      agenda: items.map((i) => ({ ...i, actions: actions.filter((a) => a.agenda_item_id === i.id) })),
      attendees: await db.query<Attendee>(
        "SELECT id, user_id, name, function_label, presence FROM meeting_attendees WHERE meeting_id = $1 ORDER BY name",
        [m.id],
      ),
      previous: previous
        ? {
            id: previous.id,
            reference: meetingReference(previous),
            meeting_date: previous.meeting_date,
            start_time: previous.start_time,
            end_time: previous.end_time,
          }
        : null,
      carried: carried.map((a) => ({ ...a, meeting_reference: meetingReference(a) })),
      can: {
        edit: m.status !== "validated" && (can.manage || m.writer_id === actorId),
        validate: can.validate && m.writer_id !== actorId,
      },
    };
  }

  // ---------------------------------------------------------------- écriture
  async create(actorId: string, orgId: string, input: MeetingInput & { meeting_type: string; meeting_date: string }) {
    await this.svc.requirePerm(actorId, orgId, "meetings.manage");
    assertDate(input.meeting_date);
    assertDate(input.next_date);
    const writerId = input.writer_id ?? actorId;
    await this.assertMember(orgId, writerId, "Le rédacteur");
    const writer = await this.svc.user(writerId);
    const previous = await this.svc.db.one<MeetingRow>(
      "SELECT * FROM meetings WHERE org_id = $1 AND meeting_type = $2 AND meeting_date < $3 AND status <> 'cancelled' ORDER BY meeting_date DESC, seq DESC LIMIT 1",
      [orgId, input.meeting_type, input.meeting_date],
    );
    const id = uid("mtg");
    const year = Number(input.meeting_date.slice(0, 4));
    // Le numéro annuel est calculé par la base ; deux créations simultanées retentent au lieu de partager un numéro
    for (let attempt = 0; ; attempt++) {
      try {
        await this.svc.db.query(
          `INSERT INTO meetings (id, org_id, year, seq, service_code, writer_initials, title, meeting_type, meeting_date, start_time, end_time, location, convened_by, facilitator, timekeeper, writer_id, writer_name, attendance_note, previous_meeting_id, previous_summary, summary, next_date, next_time, next_location, next_topics, confidential, created_by)
           VALUES ($1, $2, $3, (SELECT COALESCE(max(seq), 0) + 1 FROM meetings WHERE org_id = $2 AND year = $3), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
          [
            id,
            orgId,
            year,
            input.service_code ?? "DIR",
            input.writer_initials?.trim().toUpperCase() || initialsOf(writer.name),
            input.title ?? "Réunion",
            input.meeting_type,
            input.meeting_date,
            input.start_time ?? null,
            input.end_time ?? null,
            input.location ?? "",
            input.convened_by ?? "",
            input.facilitator ?? "",
            input.timekeeper ?? "",
            writerId,
            writer.name,
            input.attendance_note ?? "",
            previous?.id ?? null,
            input.previous_summary ?? previous?.summary ?? "",
            input.summary ?? "",
            input.next_date ?? null,
            input.next_time ?? null,
            input.next_location ?? "",
            input.next_topics ?? "",
            input.confidential ?? false,
            actorId,
          ],
        );
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "23505" || attempt >= 8) throw e;
      }
    }
    await this.svc.log(actorId, "meeting.created", { orgId, data: { id, type: input.meeting_type } });
    return this.get(actorId, id);
  }

  async update(actorId: string, id: string, patch: MeetingInput) {
    const m = await this.editable(actorId, id);
    assertDate(patch.meeting_date);
    assertDate(patch.next_date);
    if (patch.meeting_date && Number(patch.meeting_date.slice(0, 4)) !== m.year)
      throw badRequest("Le numéro du compte rendu est annuel : créez une nouvelle réunion pour une autre année");
    const fields = { ...patch } as Record<string, unknown>;
    if (patch.writer_id) {
      await this.assertMember(m.org_id, patch.writer_id, "Le rédacteur");
      fields.writer_name = (await this.svc.user(patch.writer_id)).name;
    }
    if (patch.writer_initials) fields.writer_initials = patch.writer_initials.trim().toUpperCase();
    const allowed = [
      "title",
      "meeting_type",
      "meeting_date",
      "start_time",
      "end_time",
      "location",
      "convened_by",
      "facilitator",
      "timekeeper",
      "writer_id",
      "writer_name",
      "writer_initials",
      "service_code",
      "attendance_note",
      "previous_summary",
      "summary",
      "next_date",
      "next_time",
      "next_location",
      "next_topics",
      "confidential",
      "status",
    ];
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const k of allowed) {
      if (fields[k] === undefined) continue;
      vals.push(fields[k]);
      sets.push(`${k} = $${vals.length}`);
    }
    if (sets.length) {
      vals.push(id);
      await this.svc.db.query(
        `UPDATE meetings SET ${sets.join(", ")}, updated_at = now() WHERE id = $${vals.length}`,
        vals,
      );
    }
    return this.get(actorId, id);
  }

  async saveContent(actorId: string, id: string, input: ContentInput) {
    const m = await this.editable(actorId, id);
    const db = this.svc.db;
    const knownItems = new Set(
      (await db.query<{ id: string }>("SELECT id FROM meeting_agenda_items WHERE meeting_id = $1", [id])).map(
        (r) => r.id,
      ),
    );
    const knownActions = new Set(
      (await db.query<{ id: string }>("SELECT id FROM meeting_actions WHERE meeting_id = $1", [id])).map((r) => r.id),
    );
    const people = new Map((await this.svc.usersOf(m.org_id)).map((u) => [u.id, u.name]));
    for (const item of input.agenda) {
      if (item.id && !knownItems.has(item.id)) throw badRequest("Point de l'ordre du jour inconnu pour cette réunion");
      for (const a of item.actions ?? []) {
        if (a.id && !knownActions.has(a.id)) throw badRequest("Recommandation inconnue pour cette réunion");
        if (a.responsible_id && !people.has(a.responsible_id))
          throw badRequest("Le responsable doit être membre de l'organisation");
        assertDate(a.due_on);
      }
    }
    for (const a of input.attendees)
      if (a.user_id && !people.has(a.user_id)) throw badRequest("Le participant doit être membre de l'organisation");
    await db.tx(async (q) => {
      const keptItems = input.agenda.flatMap((i) => (i.id ? [i.id] : []));
      await q.query("DELETE FROM meeting_agenda_items WHERE meeting_id = $1 AND NOT (id = ANY($2))", [id, keptItems]);
      const keptActions = input.agenda.flatMap((i) => (i.actions ?? []).flatMap((a) => (a.id ? [a.id] : [])));
      await q.query("DELETE FROM meeting_actions WHERE meeting_id = $1 AND NOT (id = ANY($2))", [id, keptActions]);
      for (const [position, item] of input.agenda.entries()) await this.saveItem(q, m, actorId, position, item, people);
      await q.query("DELETE FROM meeting_attendees WHERE meeting_id = $1", [id]);
      for (const a of input.attendees)
        await q.query(
          "INSERT INTO meeting_attendees (id, org_id, meeting_id, user_id, name, function_label, presence) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [uid("att"), m.org_id, id, a.user_id ?? null, a.user_id ? (people.get(a.user_id) ?? a.name.trim()) : a.name.trim(), a.function_label ?? "", a.presence ?? "present"],
        );
      const hasNotes = input.agenda.some((i) => i.notes?.trim());
      await q.query(
        `UPDATE meetings SET updated_at = now(), status = CASE WHEN status = 'planned' AND $1 THEN 'held' ELSE status END WHERE id = $2`,
        [hasNotes, id],
      );
    });
    return this.get(actorId, id);
  }

  private async saveItem(
    q: Queryable,
    m: MeetingRow,
    actorId: string,
    position: number,
    item: ContentInput["agenda"][number],
    people: Map<string, string>,
  ) {
    const itemId = item.id ?? uid("agd");
    await q.query(
      `INSERT INTO meeting_agenda_items (id, org_id, meeting_id, position, subject, speakers, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET position = EXCLUDED.position, subject = EXCLUDED.subject, speakers = EXCLUDED.speakers, notes = EXCLUDED.notes`,
      [itemId, m.org_id, m.id, position, item.subject.trim(), item.speakers ?? "", item.notes ?? ""],
    );
    for (const [i, a] of (item.actions ?? []).entries()) {
      const name = a.responsible_name?.trim() || (a.responsible_id ? (people.get(a.responsible_id) ?? "") : "");
      const status = a.status ?? "a_faire";
      await q.query(
        `INSERT INTO meeting_actions (id, org_id, meeting_id, agenda_item_id, position, text, responsible_id, responsible_name, due_on, status, closed_by, closed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10, CASE WHEN $10 = 'realise' THEN $11 END, CASE WHEN $10 = 'realise' THEN now() END)
         ON CONFLICT (id) DO UPDATE SET agenda_item_id = EXCLUDED.agenda_item_id, position = EXCLUDED.position, text = EXCLUDED.text, responsible_id = EXCLUDED.responsible_id,
           responsible_name = EXCLUDED.responsible_name, due_on = EXCLUDED.due_on, status = EXCLUDED.status,
           closed_by = CASE WHEN EXCLUDED.status = 'realise' THEN COALESCE(meeting_actions.closed_by, EXCLUDED.closed_by) END,
           closed_at = CASE WHEN EXCLUDED.status = 'realise' THEN COALESCE(meeting_actions.closed_at, EXCLUDED.closed_at) END`,
        [
          a.id ?? uid("rec"),
          m.org_id,
          m.id,
          itemId,
          i,
          a.text.trim(),
          a.responsible_id ?? null,
          name,
          a.due_on ?? null,
          status,
          actorId,
        ],
      );
    }
  }

  async remove(actorId: string, id: string) {
    const m = await this.row(id);
    await this.svc.requirePerm(actorId, m.org_id, "meetings.manage");
    if (m.status === "validated") throw locked();
    await this.svc.db.query("DELETE FROM meetings WHERE id = $1", [id]);
    await this.svc.log(actorId, "meeting.deleted", { orgId: m.org_id, data: { reference: meetingReference(m) } });
  }

  // ---------------------------------------------------------------- validation
  async validate(actorId: string, id: string) {
    const { m } = await this.readable(actorId, id);
    await this.svc.requirePerm(actorId, m.org_id, "meetings.validate");
    if (m.writer_id === actorId) throw forbidden("Le rédacteur ne peut pas valider son propre compte rendu");
    const n = await this.svc.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM meeting_agenda_items WHERE meeting_id = $1",
      [id],
    );
    if (!n?.n) throw badRequest("Le compte rendu doit contenir au moins un point à l'ordre du jour");
    if (
      !(await this.svc.db.one(
        "UPDATE meetings SET status = 'validated', validated_by = $1, validated_at = now(), updated_at = now() WHERE id = $2 AND status <> 'validated' RETURNING id",
        [actorId, id],
      ))
    )
      throw locked();
    await this.svc.log(actorId, "meeting.validated", { orgId: m.org_id, data: { reference: meetingReference(m) } });
    const owners = await this.svc.db.query<{ responsible_id: string }>(
      "SELECT DISTINCT responsible_id FROM meeting_actions WHERE meeting_id = $1 AND responsible_id IS NOT NULL AND status NOT IN ('realise','annule')",
      [id],
    );
    for (const o of owners)
      await this.svc.notify(o.responsible_id, m.org_id, {
        kind: "meeting.action",
        title: `Recommandation à suivre : ${m.meeting_type}`,
        body: `Compte rendu ${meetingReference(m)}`,
      });
    return this.get(actorId, id);
  }

  async reopen(actorId: string, id: string) {
    const { m } = await this.readable(actorId, id);
    await this.svc.requirePerm(actorId, m.org_id, "meetings.validate");
    if (m.status !== "validated") throw badRequest("Ce compte rendu n'est pas validé");
    await this.svc.db.query(
      "UPDATE meetings SET status = 'held', validated_by = NULL, validated_at = NULL, updated_at = now() WHERE id = $1",
      [id],
    );
    await this.svc.log(actorId, "meeting.reopened", { orgId: m.org_id, data: { reference: meetingReference(m) } });
    return this.get(actorId, id);
  }

  // ---------------------------------------------------------------- suivi des recommandations
  async listActions(actorId: string, orgId: string, f: { mine?: boolean }) {
    await this.svc.requirePerm(actorId, orgId, "meetings.view");
    const can = await this.can(actorId, orgId);
    const rows = await this.svc.db.query<ActionWithMeeting & { meeting_type: string }>(
      `SELECT m.seq, m.service_code, m.writer_initials, m.meeting_date, m.meeting_type, a.* FROM meeting_actions a JOIN meetings m ON m.id = a.meeting_id
       WHERE a.org_id = $1 AND ${VISIBLE("m", "$2", "$3")} AND ($4 = FALSE OR a.responsible_id = $2) ORDER BY a.due_on NULLS LAST, a.created_at`,
      [orgId, actorId, can.manage, !!f.mine],
    );
    return rows.map((a) => ({ ...a, meeting_reference: meetingReference(a) }));
  }

  /** Le responsable avance et soumet ; clore, reporter ou annuler revient aux gestionnaires. */
  async updateAction(
    actorId: string,
    id: string,
    patch: { status?: ActionStatus; due_on?: string; postponed_reason?: string },
  ) {
    const a = await this.svc.db.one<MeetingAction>("SELECT * FROM meeting_actions WHERE id = $1", [id]);
    if (!a) throw notFound("Recommandation introuvable");
    const responsible = a.responsible_id === actorId;
    if (!responsible) await this.readable(actorId, a.meeting_id);
    const { manage } = await this.can(actorId, a.org_id);
    if (!manage && !responsible)
      throw forbidden("Seuls le responsable et les gestionnaires suivent cette recommandation");
    if (!manage && (patch.due_on !== undefined || !patch.status || !["en_cours", "soumis"].includes(patch.status)))
      throw forbidden("Seul un gestionnaire clôt, reporte ou annule une recommandation");
    assertDate(patch.due_on);
    if (patch.status === "reporte" && (!patch.due_on || !patch.postponed_reason?.trim()))
      throw badRequest("Un report exige une nouvelle échéance et un motif");
    const status = patch.status ?? a.status;
    const closing = CLOSED.includes(status);
    const row = await this.svc.db.one<MeetingAction>(
      `UPDATE meeting_actions SET status = $1, due_on = COALESCE($2::date, due_on),
        original_due_on = CASE WHEN $1 = 'reporte' THEN COALESCE(original_due_on, due_on) ELSE original_due_on END,
        postponed_reason = COALESCE($3, postponed_reason), closed_by = CASE WHEN $4 THEN $5 END, closed_at = CASE WHEN $4 THEN now() END WHERE id = $6 RETURNING *`,
      [status, patch.due_on ?? null, patch.postponed_reason?.trim() ?? null, closing, actorId, id],
    );
    await this.svc.log(actorId, "meeting.action", { orgId: a.org_id, data: { id, status } });
    return row;
  }
}
