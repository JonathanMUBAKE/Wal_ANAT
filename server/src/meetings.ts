import { ATTACHMENT_MAX_BYTES } from "./attachments.js";
import { uid, type Queryable } from "./db.js";
import { Decisions, decisionRef } from "./decisions.js";
import { ALLOWED_FORMATS, detectType } from "./documents/filetypes.js";
import { linkContact, linkPartner } from "./partner-links.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, type Services, localDate } from "./services.js";

export type ActionStatus = "a_faire" | "en_cours" | "soumis" | "realise" | "reporte" | "annule";
export type MeetingStatus = "planned" | "held" | "submitted" | "validated" | "cancelled";
export type Response = "pending" | "accepted" | "declined" | "delegated";
/** Convoqué : une personne de l'institution, une personne extérieure nommée, ou une entité entière. */
export interface InviteeInput {
  user_id?: string | null;
  /** Contact d'un partenaire, convoqué comme personne extérieure (lot PA3). */
  contact_id?: string | null;
  name?: string;
  function_label?: string;
  unit_id?: string;
}
export interface Repeat {
  every: "week" | "2weeks" | "month";
  count: number;
}
const MAX_SERIES = 12;
const MAX_DOCUMENTS = 30;
const NOTICE_HOURS = 48;
const FOLLOW_UP = "Suivi des recommandations de la réunion précédente";
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
  /** Entité à laquelle appartient la réunion (programmée depuis son espace, ou entité convoquée en entier). */
  unit_id: string | null;
  status: MeetingStatus;
  validated_by: string | null;
  validated_at: string | null;
  chair_id: string | null;
  video_link: string;
  project_id: string | null;
  activity_id: string | null;
  series_id: string | null;
  convened_at: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  return_comment: string;
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
  /** La tâche du projet née de cette recommandation (lot P3a). */
  task_id: string | null;
}
/** Décision annoncée en séance : inscrite au registre des décisions à la validation du compte rendu. */
export interface MeetingDecision {
  id: string;
  agenda_item_id: string;
  position: number;
  text: string;
  owner_id: string | null;
  owner_name?: string | null;
  due_on: string | null;
  decision_id: string | null;
  decision_reference?: string | null;
}
type ActionWithMeeting = MeetingAction & Pick<MeetingRow, "seq" | "service_code" | "writer_initials" | "meeting_date">;
export interface AgendaItem {
  id: string;
  position: number;
  subject: string;
  speakers: string;
  notes: string;
  actions: MeetingAction[];
  decisions: MeetingDecision[];
}
export interface Attendee {
  id: string;
  user_id: string | null;
  name: string;
  function_label: string;
  presence: string;
  invited: boolean;
  response: Response | null;
  delegate_name: string;
  contact_id?: string | null;
}
export interface MeetingDocument {
  id: string;
  agenda_item_id: string | null;
  filename: string;
  mime: string;
  size: number;
  uploader_name: string | null;
  created_at: string;
}
export interface MeetingDetail extends MeetingRow {
  reference: string;
  chair_name: string | null;
  dossier: { kind: "project" | "activity"; id: string; label: string; href: string } | null;
  documents: MeetingDocument[];
  agenda: AgendaItem[];
  attendees: Attendee[];
  partners: { id: string; name: string; acronym: string }[];
  previous: {
    id: string;
    reference: string;
    meeting_date: string;
    start_time: string | null;
    end_time: string | null;
  } | null;
  carried: (MeetingAction & { meeting_reference: string })[];
  can: { edit: boolean; validate: boolean; convene: boolean; submit: boolean; decide: boolean; respond: boolean; reopen: boolean; declare_not_held: boolean };
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
    | "chair_id"
    | "video_link"
    | "project_id"
    | "activity_id"
    | "unit_id"
  >
> & { status?: "planned" | "held" | "cancelled"; partner_ids?: string[] };

export interface ContentInput {
  agenda: {
    id?: string;
    subject: string;
    speakers?: string;
    notes?: string;
    domain_id?: string | null;
    actions?: {
      id?: string;
      text: string;
      responsible_id?: string | null;
      responsible_name?: string;
      due_on?: string | null;
      status?: ActionStatus;
    }[];
    decisions?: { id?: string; text: string; owner_id?: string | null; due_on?: string | null }[];
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

/** La fin d'une séance suit son début, et la prochaine séance suit celle-ci (testeurs). */
const assertSchedule = (i: { meeting_date?: string | null; start_time?: string | null; end_time?: string | null; next_date?: string | null }) => {
  if (i.start_time && i.end_time && i.end_time <= i.start_time) throw badRequest("L'heure de fin précède l'heure de début");
  if (i.next_date && i.meeting_date && i.next_date <= i.meeting_date)
    throw badRequest("La prochaine séance doit suivre celle-ci");
};
const assertDate = (v: string | null | undefined) => {
  if (v && !isRealDate(v)) throw badRequest(`Date invalide : ${v}`);
};
const locked = () => new HttpError(409, "Ce compte rendu est validé : rouvrez-le pour le modifier");
const pending = () =>
  new HttpError(409, "Ce compte rendu est soumis à validation : demandez son retour pour le modifier");
const today = () => localDate();
const cleanName = (name: string) =>
  name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .split(/[\\/]/)
    .pop()!
    .trim()
    .slice(-200) || "piece";
/** Date de la séance suivante d'une série. */
const nextDate = (d: string, every: Repeat["every"], n: number) => {
  const t = new Date(`${d}T00:00:00Z`);
  if (every === "month") t.setUTCMonth(t.getUTCMonth() + n);
  else t.setUTCDate(t.getUTCDate() + n * (every === "week" ? 7 : 14));
  return t.toISOString().slice(0, 10);
};
/**
 * Qui voit une réunion. `level` vaut 'manage' (gestionnaire des réunions), 'wide' (droit de pilotage) ou 'none'.
 * Une réunion confidentielle ne se voit que de ses gestionnaires, de sa présidence, de son rédacteur et de ses
 * participants. Une réunion ordinaire se voit aussi de la direction et de qui elle concerne : son entité (ou une
 * entité qu'il dirige), le projet dont il est membre, l'activité dont il est responsable (thème 5, R-8).
 */
const VISIBLE = (alias: string, actor: string, level: string) =>
  `(${level}::text = 'manage' OR ${alias}.writer_id = ${actor} OR ${alias}.chair_id = ${actor}
    OR EXISTS (SELECT 1 FROM meeting_attendees x WHERE x.meeting_id = ${alias}.id AND x.user_id = ${actor})
    OR (NOT ${alias}.confidential AND (${level}::text = 'wide'
      OR ${alias}.unit_id IN (WITH RECURSIVE down(id) AS (
           SELECT id FROM org_units WHERE manager_id = ${actor}
           UNION SELECT u.id FROM org_units u JOIN down ON u.parent_id = down.id)
         SELECT id FROM down UNION SELECT unit_id FROM org_members WHERE user_id = ${actor} AND unit_id IS NOT NULL)
      OR EXISTS (SELECT 1 FROM memberships ms WHERE ms.project_id = ${alias}.project_id AND ms.user_id = ${actor})
      OR EXISTS (SELECT 1 FROM agency_activities aa WHERE aa.id = ${alias}.activity_id AND aa.lead_id = ${actor}))))`;

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

  /** Niveau de lecture pour VISIBLE : gestionnaire, direction (pilotage) ou personne concernée seulement. */
  private async level(actorId: string, orgId: string, manage: boolean) {
    if (manage) return "manage";
    return (await this.svc.permissionsOf(actorId, orgId)).includes("pilotage.view") ? "wide" : "none";
  }

  private async attends(actorId: string, meetingId: string) {
    return !!(await this.svc.db.one("SELECT 1 FROM meeting_attendees WHERE meeting_id = $1 AND user_id = $2", [
      meetingId,
      actorId,
    ]));
  }

  /** Le responsable d'une entité (ou d'une entité au-dessus) gère les réunions de cette entité. */
  async managesUnit(actorId: string, unitId: string | null | undefined) {
    if (!unitId) return false;
    return !!(await this.svc.db.one(
      `WITH RECURSIVE up(id, manager_id, parent_id) AS (
         SELECT id, manager_id, parent_id FROM org_units WHERE id = $1
         UNION SELECT p.id, p.manager_id, p.parent_id FROM org_units p JOIN up ON p.id = up.parent_id
       ) SELECT 1 FROM up WHERE manager_id = $2`,
      [unitId, actorId],
    ));
  }

  private async readable(actorId: string, id: string) {
    const m = await this.row(id);
    await this.svc.requirePerm(actorId, m.org_id, "meetings.view");
    const can = await this.can(actorId, m.org_id);
    if (!can.manage && (await this.managesUnit(actorId, m.unit_id))) can.manage = true;
    if (
      m.confidential &&
      !can.manage &&
      m.writer_id !== actorId &&
      m.chair_id !== actorId &&
      !(await this.attends(actorId, id))
    )
      throw notFound("Réunion introuvable");
    if (
      !can.manage &&
      !(await this.svc.db.one(`SELECT 1 FROM meetings m WHERE m.id = $1 AND ${VISIBLE("m", "$2", "$3")}`, [
        id,
        actorId,
        await this.level(actorId, m.org_id, false),
      ]))
    )
      throw notFound("Réunion introuvable");
    return { m, can };
  }

  private async editable(actorId: string, id: string) {
    const { m, can } = await this.readable(actorId, id);
    if (!can.manage && m.writer_id !== actorId)
      throw forbidden("Seuls le rédacteur et les gestionnaires modifient cette réunion");
    if (m.status === "validated") throw locked();
    if (m.status === "submitted") throw pending();
    return m;
  }

  /** Valide ou retourne un compte rendu : la présidence de séance si elle est désignée, sinon un valideur ; jamais le rédacteur. */
  /** Valide-t-il ce compte rendu, et pour qui ? La présidence, ou son délégataire en son absence (R-2). */
  private async assertDecider(actorId: string, m: MeetingRow): Promise<{ onBehalf: string | null }> {
    if (m.writer_id === actorId) throw forbidden("Le rédacteur ne peut pas valider son propre compte rendu");
    if (m.chair_id) {
      if (m.chair_id === actorId) {
        await this.svc.requirePerm(actorId, m.org_id, "meetings.validate");
        return { onBehalf: null };
      }
      if (await this.delegateOf(m.chair_id, actorId, m.org_id)) return { onBehalf: m.chair_id };
      const chair = await this.svc.db.one<{ name: string }>("SELECT name FROM users WHERE id = $1", [m.chair_id]);
      throw forbidden(
        `Seule la présidence de séance (${chair?.name ?? "désignée"}) valide ce compte rendu, ou la personne à qui elle a délégué sa signature`,
      );
    }
    await this.svc.requirePerm(actorId, m.org_id, "meetings.validate");
    return { onBehalf: null };
  }
  /** Délégation de signature en cours de la présidence vers cette personne (celle du parapheur). */
  private async delegateOf(chairId: string, actorId: string, orgId: string) {
    return !!(await this.svc.db.one(
      `SELECT 1 FROM delegations WHERE org_id = $1 AND from_user = $2 AND to_user = $3 AND scope = 'signature'
         AND revoked_at IS NULL AND start_on <= $4::date AND end_on >= $4::date`,
      [orgId, chairId, actorId, today()],
    ));
  }

  /** Dossier rattaché : un projet ou une activité de l'institution, jamais les deux. */
  private async assertDossier(orgId: string, i: { project_id?: string | null; activity_id?: string | null }) {
    if (i.project_id && i.activity_id) throw badRequest("Une réunion se rattache à un seul dossier");
    if (
      i.project_id &&
      !(await this.svc.db.one("SELECT 1 FROM projects WHERE org_id = $1 AND id = $2", [orgId, i.project_id]))
    )
      throw badRequest("Projet inconnu dans cette institution");
    if (
      i.activity_id &&
      !(await this.svc.db.one("SELECT 1 FROM agency_activities WHERE org_id = $1 AND id = $2", [orgId, i.activity_id]))
    )
      throw badRequest("Activité inconnue dans cette institution");
  }

  /** Les convoqués : une entité convoquée l'est par ses membres ; une personne de l'institution par son compte. */
  private async resolveInvitees(orgId: string, list: InviteeInput[]) {
    const out = new Map<
      string,
      { user_id: string | null; name: string; function_label: string; contact_id?: string; partner_id?: string }
    >();
    for (const i of list) {
      if (i.contact_id) {
        // Un contact d'un partenaire : une personne extérieure, nommée avec sa fonction et son organisation
        const c = (await linkContact(this.svc, orgId, i.contact_id))!;
        out.set(`n:${c.name.trim().toLowerCase()}`, {
          user_id: null,
          name: c.name,
          function_label: [c.title, c.partner_acronym || c.partner_name].filter(Boolean).join(" — "),
          contact_id: c.id,
          partner_id: c.partner_id,
        });
      } else if (i.unit_id) {
        if (!(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [orgId, i.unit_id])))
          throw badRequest("Entité inconnue dans cette institution");
        const members = await this.svc.db.query<{ id: string; name: string; title: string | null }>(
          `SELECT u.id, u.name, u.title FROM org_members om JOIN users u ON u.id = om.user_id
           WHERE om.org_id = $1 AND om.unit_id = $2 AND NOT u.is_ai AND u.status = 'active'`,
          [orgId, i.unit_id],
        );
        for (const u of members) out.set(u.id, { user_id: u.id, name: u.name, function_label: u.title ?? "" });
      } else if (i.user_id) {
        await this.assertMember(orgId, i.user_id, "Un convoqué");
        const u = await this.svc.user(i.user_id);
        out.set(u.id, { user_id: u.id, name: u.name, function_label: i.function_label ?? u.title ?? "" });
      } else if (i.name?.trim()) {
        out.set(`n:${i.name.trim().toLowerCase()}`, {
          user_id: null,
          name: i.name.trim(),
          function_label: i.function_label ?? "",
        });
      }
    }
    return [...out.values()];
  }

  /** Partenaires d'une réunion (lot PA3) : de l'institution, vivants ; un partenaire déjà lié reste valable s'il est clos. */
  private async partnersOf(
    orgId: string,
    ids: string[],
    invitees: { partner_id?: string }[],
    current: string[],
    actorId?: string,
  ) {
    const all = [...new Set([...ids, ...invitees.flatMap((i) => (i.partner_id ? [i.partner_id] : []))])];
    for (const p of all) await linkPartner(this.svc, orgId, p, { actorId, current: current.includes(p) ? p : null });
    return all;
  }
  private async currentPartners(meetingId: string) {
    return (
      await this.svc.db.query<{ partner_id: string }>("SELECT partner_id FROM meeting_partners WHERE meeting_id = $1", [
        meetingId,
      ])
    ).map((r) => r.partner_id);
  }
  private async writePartners(q: Queryable, m: Pick<MeetingRow, "id" | "org_id">, ids: string[], replace: boolean) {
    if (replace)
      await q.query("DELETE FROM meeting_partners WHERE meeting_id = $1 AND NOT (partner_id = ANY($2))", [m.id, ids]);
    for (const p of ids)
      await q.query(
        "INSERT INTO meeting_partners (org_id, meeting_id, partner_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [m.org_id, m.id, p],
      );
  }

  /** Fixe la liste des convoqués sans toucher à la présence déjà notée ni aux réponses des convoqués maintenus. */
  private async writeInvitees(
    q: Queryable,
    m: Pick<MeetingRow, "id" | "org_id" | "convened_at">,
    list: { user_id: string | null; name: string; function_label: string; contact_id?: string }[],
  ) {
    const key = (a: { user_id: string | null; name: string }) => a.user_id ?? `n:${a.name.trim().toLowerCase()}`;
    const existing = await q.query<Attendee>("SELECT * FROM meeting_attendees WHERE meeting_id = $1", [m.id]);
    const wanted = new Set(list.map(key));
    for (const a of existing)
      if (a.invited && !wanted.has(key(a))) await q.query("DELETE FROM meeting_attendees WHERE id = $1", [a.id]);
    for (const i of list) {
      const found = existing.find((a) => key(a) === key(i));
      if (found) {
        if (!found.invited)
          await q.query("UPDATE meeting_attendees SET invited = TRUE, response = $1 WHERE id = $2", [
            m.convened_at ? "pending" : null,
            found.id,
          ]);
      } else
        await q.query(
          "INSERT INTO meeting_attendees (id, org_id, meeting_id, user_id, name, function_label, presence, invited, response, contact_id) VALUES ($1,$2,$3,$4,$5,$6,'present',TRUE,$7,$8)",
          [
            uid("att"),
            m.org_id,
            m.id,
            i.user_id,
            i.name,
            i.function_label,
            m.convened_at ? "pending" : null,
            i.contact_id ?? null,
          ],
        );
    }
  }

  /** Recommandations encore ouvertes des réunions précédentes du même type, présentées au point de suivi. */
  private async openFromPrevious(m: Pick<MeetingRow, "org_id" | "meeting_type" | "meeting_date" | "confidential">) {
    return this.svc.db.query<{ text: string; responsible_name: string; due_on: string | null }>(
      `SELECT a.text, a.responsible_name, a.due_on FROM meeting_actions a JOIN meetings p ON p.id = a.meeting_id
       WHERE a.org_id = $1 AND p.meeting_type = $2 AND p.meeting_date < $3 AND p.status <> 'cancelled'
         AND a.status NOT IN ('realise','annule') AND (NOT p.confidential OR $4) ORDER BY a.due_on NULLS LAST`,
      [m.org_id, m.meeting_type, m.meeting_date, m.confidential],
    );
  }
  /** `open` est lu avant la transaction : la base embarquée n'accepte pas de lecture parallèle à une transaction ouverte. */
  private async addFollowUp(
    q: Queryable,
    m: Pick<MeetingRow, "id" | "org_id">,
    open: { text: string; responsible_name: string; due_on: string | null }[],
  ) {
    if (!open.length) return;
    if (
      (await q.query("SELECT 1 FROM meeting_agenda_items WHERE meeting_id = $1 AND subject = $2", [m.id, FOLLOW_UP]))
        .length
    )
      return;
    await q.query("UPDATE meeting_agenda_items SET position = position + 1 WHERE meeting_id = $1", [m.id]);
    const lines = open.map(
      (a) =>
        `- ${a.text}${a.responsible_name ? ` (${a.responsible_name}` : " ("}${a.due_on ? `, échéance ${a.due_on})` : ")"}`,
    );
    await q.query(
      "INSERT INTO meeting_agenda_items (id, org_id, meeting_id, position, subject, speakers, notes) VALUES ($1,$2,$3,0,$4,'Secrétariat',$5)",
      [uid("agd"), m.org_id, m.id, FOLLOW_UP, lines.join("\n")],
    );
  }

  private async assertMember(orgId: string, userId: string, label: string) {
    if (!(await this.svc.orgRole(userId, orgId))) throw badRequest(`${label} doit être membre de l'organisation`);
    // Une IA ne préside ni ne rédige : l'IA propose, une personne décide (testeurs)
    if ((await this.svc.userOrNull(userId))?.is_ai) throw badRequest(`${label} doit être une personne`);
  }
  /** La présidence valide le compte rendu : elle en a le droit (testeurs). */
  private async assertChair(orgId: string, userId: string) {
    await this.assertMember(orgId, userId, "La présidence de séance");
    if (!(await this.svc.permissionsOf(userId, orgId)).includes("meetings.validate"))
      throw badRequest("La présidence de séance revient à une personne habilitée à valider les comptes rendus");
  }

  // ---------------------------------------------------------------- lecture
  async list(
    actorId: string,
    orgId: string,
    f: { project_id?: string; activity_id?: string; partner_id?: string; unit_id?: string } = {},
  ) {
    await this.svc.requirePerm(actorId, orgId, "meetings.view");
    const can = await this.can(actorId, orgId);
    const rows = await this.svc.db.query<
      MeetingRow & {
        open_actions: number;
        action_count: number;
        my_response: Response | null;
        chair_name: string | null;
      }
    >(
      `SELECT m.*, c.name AS chair_name, (SELECT count(*)::int FROM meeting_actions a WHERE a.meeting_id = m.id) AS action_count,
        (SELECT count(*)::int FROM meeting_actions a WHERE a.meeting_id = m.id AND a.status NOT IN ('realise','annule')) AS open_actions,
        (SELECT x.response FROM meeting_attendees x WHERE x.meeting_id = m.id AND x.user_id = $2 AND x.invited LIMIT 1) AS my_response
       FROM meetings m LEFT JOIN users c ON c.id = m.chair_id
       WHERE m.org_id = $1 AND ${VISIBLE("m", "$2", "$3")} AND ($4::text IS NULL OR m.project_id = $4) AND ($5::text IS NULL OR m.activity_id = $5)
         AND ($6::text IS NULL OR EXISTS (SELECT 1 FROM meeting_partners mp WHERE mp.meeting_id = m.id AND mp.partner_id = $6))
         AND ($7::text IS NULL OR m.unit_id = $7)
       ORDER BY m.meeting_date DESC, m.seq DESC`,
      [
        orgId,
        actorId,
        await this.level(actorId, orgId, can.manage),
        f.project_id ?? null,
        f.activity_id ?? null,
        f.partner_id ?? null,
        f.unit_id ?? null,
      ],
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
    const items = await db.query<Omit<AgendaItem, "actions" | "decisions">>(
      "SELECT id, position, subject, speakers, notes, domain_id FROM meeting_agenda_items WHERE meeting_id = $1 ORDER BY position",
      [m.id],
    );
    const actions = await db.query<MeetingAction>(
      "SELECT * FROM meeting_actions WHERE meeting_id = $1 ORDER BY position",
      [m.id],
    );
    const decisions = await db.query<MeetingDecision & { reg_year: number | null; reg_seq: number | null }>(
      `SELECT d.*, u.name AS owner_name, r.year AS reg_year, r.seq AS reg_seq
       FROM meeting_decisions d LEFT JOIN users u ON u.id = d.owner_id LEFT JOIN dg_decisions r ON r.id = d.decision_id
       WHERE d.meeting_id = $1 ORDER BY d.position`,
      [m.id],
    );
    const decisionView = (d: MeetingDecision & { reg_year: number | null; reg_seq: number | null }) => {
      const { reg_year, reg_seq, ...rest } = d;
      return { ...rest, decision_reference: reg_year ? decisionRef({ year: reg_year, seq: reg_seq ?? 0 }) : null };
    };
    const previous = m.previous_meeting_id
      ? await db.one<MeetingRow>("SELECT * FROM meetings WHERE id = $1", [m.previous_meeting_id])
      : undefined;
    const carried = await db.query<ActionWithMeeting>(
      `SELECT p.seq, p.service_code, p.writer_initials, p.meeting_date, a.* FROM meeting_actions a JOIN meetings p ON p.id = a.meeting_id
       WHERE a.org_id = $1 AND p.meeting_type = $2 AND p.meeting_date < $3 AND a.status NOT IN ('realise','annule') AND ${VISIBLE("p", "$4", "$5")}
       ORDER BY a.due_on NULLS LAST`,
      [m.org_id, m.meeting_type, m.meeting_date, actorId, await this.level(actorId, m.org_id, can.manage)],
    );
    const attendees = await db.query<Attendee>(
      "SELECT id, user_id, name, function_label, presence, invited, response, delegate_name, contact_id FROM meeting_attendees WHERE meeting_id = $1 ORDER BY invited DESC, name",
      [m.id],
    );
    const chair = m.chair_id
      ? await db.one<{ name: string }>("SELECT name FROM users WHERE id = $1", [m.chair_id])
      : null;
    const dossier = m.project_id
      ? await db.one<{ label: string }>("SELECT name AS label FROM projects WHERE id = $1", [m.project_id])
      : m.activity_id
        ? await db.one<{ label: string }>("SELECT title AS label FROM agency_activities WHERE id = $1", [m.activity_id])
        : null;
    const documents = await db.query<MeetingDocument>(
      `SELECT d.id, d.agenda_item_id, d.filename, d.mime, d.size, u.name AS uploader_name, d.created_at
       FROM meeting_documents d LEFT JOIN users u ON u.id = d.uploader_id WHERE d.meeting_id = $1 ORDER BY d.created_at`,
      [m.id],
    );
    const t = today();
    const writes = can.manage || m.writer_id === actorId;
    const decides =
      m.writer_id !== actorId &&
      (m.chair_id
        ? m.chair_id === actorId || (await this.delegateOf(m.chair_id, actorId, m.org_id))
        : can.validate);
    const invited = attendees.find((a) => a.invited && a.user_id === actorId);
    // Rouvrir un compte rendu validé : la personne qui l'a validé, ou la DG (R-3)
    const reopens =
      m.status === "validated" &&
      can.validate &&
      (m.validated_by === actorId || (await this.svc.permissionsOf(actorId, m.org_id)).includes("decisions.confirm"));
    return {
      ...m,
      reference: meetingReference(m),
      chair_name: chair?.name ?? null,
      dossier:
        dossier && (m.project_id || m.activity_id)
          ? m.project_id
            ? { kind: "project", id: m.project_id, label: dossier.label, href: `/projects/${m.project_id}/reunions` }
            : {
                kind: "activity",
                id: m.activity_id as string,
                label: dossier.label,
                href: `/activites/${m.activity_id}`,
              }
          : null,
      documents,
      agenda: items.map((i) => ({
        ...i,
        actions: actions.filter((a) => a.agenda_item_id === i.id),
        decisions: decisions.filter((d) => d.agenda_item_id === i.id).map(decisionView),
      })),
      attendees,
      partners: await db.query<{ id: string; name: string; acronym: string }>(
        "SELECT p.id, p.name, p.acronym FROM meeting_partners mp JOIN partners p ON p.id = mp.partner_id WHERE mp.meeting_id = $1 ORDER BY p.name",
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
        edit: (m.status === "planned" || m.status === "held") && writes,
        // Valideur de ce compte rendu : la présidence si elle est désignée, sinon un détenteur du droit
        validate: decides,
        convene: m.status === "planned" && writes && m.meeting_date >= t,
        submit: (m.status === "planned" || m.status === "held") && writes && m.meeting_date <= t,
        decide: m.status === "submitted" && decides,
        respond: !!invited && !!m.convened_at && m.status === "planned" && m.meeting_date >= t,
        reopen: reopens,
        // Séance passée restée sans compte rendu : la déclarer non tenue (R-6)
        declare_not_held: m.status === "planned" && m.meeting_date < t && writes,
      },
    };
  }

  // ---------------------------------------------------------------- écriture
  /**
   * Programmer : une séance, ou une série (au plus 12). Chaque séance reçoit son numéro à la programmation,
   * ses convoqués, et d'office le point de suivi des recommandations restées ouvertes.
   */
  async create(
    actorId: string,
    orgId: string,
    input: MeetingInput & {
      meeting_type: string;
      meeting_date: string;
      invitees?: InviteeInput[];
      repeat?: Repeat | null;
      /** « upcoming » : programmée à partir d'aujourd'hui ; « past » : déjà tenue, enregistrée pour la traçabilité. */
      timing?: "upcoming" | "past";
    },
  ) {
    // Réunion d'une entité : celle choisie, sinon l'entité convoquée en entier
    const unitId = input.unit_id ?? input.invitees?.find((i) => i.unit_id)?.unit_id ?? null;
    if (unitId && !(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [orgId, unitId])))
      throw badRequest("Entité inconnue");
    if (
      !(await this.can(actorId, orgId)).manage &&
      !(input.unit_id && (await this.managesUnit(actorId, input.unit_id)))
    )
      await this.svc.requirePerm(actorId, orgId, "meetings.manage");
    assertDate(input.meeting_date);
    assertDate(input.next_date);
    assertSchedule(input);
    if (input.timing === "upcoming" && input.meeting_date < today())
      throw badRequest(
        "Une réunion à venir se programme à partir d'aujourd'hui : pour une séance passée, enregistrez une réunion déjà tenue",
      );
    if (input.timing === "past") {
      if (input.meeting_date > today())
        throw badRequest(
          "Une réunion déjà tenue a eu lieu au plus tard aujourd'hui : pour une date à venir, programmez-la",
        );
      if (input.repeat) throw badRequest("Une réunion déjà tenue s'enregistre séance par séance, sans série");
    }
    const writerId = input.writer_id ?? actorId;
    await this.assertMember(orgId, writerId, "Le rédacteur");
    if (input.chair_id) await this.assertChair(orgId, input.chair_id);
    await this.assertDossier(orgId, input);
    const count = input.repeat?.count ?? 1;
    if (!Number.isInteger(count) || count < 1 || count > MAX_SERIES)
      throw badRequest(`Une série compte de 1 à ${MAX_SERIES} séances`);
    const invitees = await this.resolveInvitees(orgId, input.invitees ?? []);
    // Partenaires concernés : ceux choisis, et ceux dont un contact est convoqué
    const partners = await this.partnersOf(orgId, input.partner_ids ?? [], invitees, [], actorId);
    const seriesId = count > 1 ? uid("ser") : null;
    let first = "";
    for (let n = 0; n < count; n++) {
      const date = input.repeat ? nextDate(input.meeting_date, input.repeat.every, n) : input.meeting_date;
      const id = await this.insertOne(actorId, orgId, { ...input, meeting_date: date }, writerId, seriesId);
      first ||= id;
      const m = await this.row(id);
      const open = await this.openFromPrevious(m);
      await this.svc.db.tx(async (q) => {
        await this.writeInvitees(q, m, invitees);
        await this.addFollowUp(q, m, open);
        await this.writePartners(q, m, partners, false);
        // Séance déjà tenue : elle entre au registre « tenue » ; ses participants sont notés présents, sans convocation
        if (input.timing === "past") {
          await q.query("UPDATE meetings SET status = 'held', updated_at = now() WHERE id = $1", [id]);
          await q.query(
            "UPDATE meeting_attendees SET invited = FALSE, response = NULL, presence = 'present' WHERE meeting_id = $1",
            [id],
          );
        }
      });
    }
    if (unitId)
      await this.svc.db.query(
        "UPDATE meetings SET unit_id = $1 WHERE id = $2 OR (series_id IS NOT NULL AND series_id = $3)",
        [unitId, first, seriesId],
      );
    await this.svc.log(actorId, "meeting.created", {
      orgId,
      projectId: input.project_id ?? null,
      data: { id: first, type: input.meeting_type, series: seriesId, count, unit_id: unitId },
    });
    return this.get(actorId, first);
  }

  private async insertOne(
    actorId: string,
    orgId: string,
    input: MeetingInput & { meeting_type: string; meeting_date: string },
    writerId: string,
    seriesId: string | null,
  ) {
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
          `INSERT INTO meetings (id, org_id, year, seq, service_code, writer_initials, title, meeting_type, meeting_date, start_time, end_time, location, convened_by, facilitator, timekeeper, writer_id, writer_name, attendance_note, previous_meeting_id, previous_summary, summary, next_date, next_time, next_location, next_topics, confidential, created_by, chair_id, video_link, project_id, activity_id, series_id)
           VALUES ($1, $2, $3, (SELECT COALESCE(max(seq), 0) + 1 FROM meetings WHERE org_id = $2 AND year = $3), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)`,
          [
            id,
            orgId,
            year,
            input.service_code ?? "DIR",
            input.writer_initials?.trim().toUpperCase() || initialsOf(writer.name),
            // Sans titre, la réunion prend son type : le même libellé partout (R-1)
            input.title?.trim() || input.meeting_type,
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
            input.chair_id ?? null,
            input.video_link?.trim() ?? "",
            input.project_id ?? null,
            input.activity_id ?? null,
            seriesId,
          ],
        );
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "23505" || attempt >= 8) throw e;
      }
    }
    return id;
  }

  async update(actorId: string, id: string, patch: MeetingInput) {
    const m = await this.editable(actorId, id);
    assertDate(patch.meeting_date);
    assertDate(patch.next_date);
    assertSchedule({
      meeting_date:
        patch.meeting_date ??
        (typeof m.meeting_date === "string" ? m.meeting_date.slice(0, 10) : localDate(new Date(m.meeting_date as never))),
      start_time: patch.start_time !== undefined ? patch.start_time : m.start_time,
      end_time: patch.end_time !== undefined ? patch.end_time : m.end_time,
      next_date: patch.next_date,
    });
    if (patch.meeting_date && Number(patch.meeting_date.slice(0, 4)) !== m.year)
      throw badRequest("Le numéro du compte rendu est annuel : créez une nouvelle réunion pour une autre année");
    const fields = { ...patch } as Record<string, unknown>;
    if (patch.writer_id) {
      await this.assertMember(m.org_id, patch.writer_id, "Le rédacteur");
      fields.writer_name = (await this.svc.user(patch.writer_id)).name;
    }
    if (patch.writer_initials) fields.writer_initials = patch.writer_initials.trim().toUpperCase();
    if (patch.chair_id) await this.assertChair(m.org_id, patch.chair_id);
    if (patch.project_id !== undefined || patch.activity_id !== undefined)
      await this.assertDossier(m.org_id, {
        project_id: patch.project_id === undefined ? m.project_id : patch.project_id,
        activity_id: patch.activity_id === undefined ? m.activity_id : patch.activity_id,
      });
    if (patch.video_link !== undefined) fields.video_link = patch.video_link.trim();
    if (patch.partner_ids !== undefined) {
      const partners = await this.partnersOf(m.org_id, patch.partner_ids, [], await this.currentPartners(id), actorId);
      await this.svc.db.tx((q) => this.writePartners(q, m, partners, true));
    }
    const allowed = [
      "chair_id",
      "video_link",
      "project_id",
      "activity_id",
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
    // null efface la présidence ou le dossier ; undefined ne touche à rien
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
    // Après la convocation, les convoqués sont prévenus de ce qui change pour eux : date, horaire, lieu, lien
    if (m.convened_at && m.status === "planned") {
      const fr = (d: unknown) => (d ? String(d).slice(0, 10).split("-").reverse().join("/") : "—");
      const lines: string[] = [];
      if (patch.meeting_date && patch.meeting_date !== String(m.meeting_date).slice(0, 10))
        lines.push(`Date : ${fr(m.meeting_date)} → ${fr(patch.meeting_date)}`);
      if (patch.start_time !== undefined && (patch.start_time ?? "") !== (m.start_time ?? ""))
        lines.push(`Heure : ${m.start_time ?? "—"} → ${patch.start_time ?? "—"}`);
      if (patch.location !== undefined && patch.location !== m.location)
        lines.push(`Lieu : ${m.location || "—"} → ${patch.location || "—"}`);
      if (patch.video_link !== undefined && patch.video_link.trim() !== m.video_link)
        lines.push("Lien de visioconférence modifié");
      if (lines.length)
        await this.notifyInvited(actorId, m, {
          kind: "meeting.changed",
          title: `Réunion modifiée : ${m.title || m.meeting_type}`,
          body: lines.join("\n"),
        });
    }
    return this.get(actorId, id);
  }

  /** Prévient chaque convoqué (personne de l'institution), sauf l'auteur. */
  private async notifyInvited(actorId: string, m: MeetingRow, n: { kind: string; title: string; body: string }) {
    const invited = await this.svc.db.query<{ user_id: string }>(
      "SELECT DISTINCT user_id FROM meeting_attendees WHERE meeting_id = $1 AND invited AND user_id IS NOT NULL",
      [m.id],
    );
    for (const a of invited)
      if (a.user_id !== actorId)
        await this.svc.notify(a.user_id, m.org_id, {
          ...n,
          actor_id: actorId,
          link: n.kind === "meeting.cancelled" ? "/reunions" : `/reunions/${m.id}`,
        });
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
    const knownDecisions = new Set(
      (await db.query<{ id: string }>("SELECT id FROM meeting_decisions WHERE meeting_id = $1", [id])).map((r) => r.id),
    );
    const people = new Map((await this.svc.usersOf(m.org_id)).map((u) => [u.id, u.name]));
    const domains = new Set(
      (await db.query<{ id: string }>("SELECT id FROM activity_domains WHERE org_id = $1", [m.org_id])).map(
        (r) => r.id,
      ),
    );
    for (const item of input.agenda) {
      if (item.domain_id && !domains.has(item.domain_id)) throw badRequest("Domaine inconnu du catalogue");
      if (item.id && !knownItems.has(item.id)) throw badRequest("Point de l'ordre du jour inconnu pour cette réunion");
      for (const a of item.actions ?? []) {
        if (a.id && !knownActions.has(a.id)) throw badRequest("Recommandation inconnue pour cette réunion");
        if (a.responsible_id && !people.has(a.responsible_id))
          throw badRequest("Le responsable doit être membre de l'organisation");
        assertDate(a.due_on);
      }
      for (const d of item.decisions ?? []) {
        if (d.id && !knownDecisions.has(d.id)) throw badRequest("Décision de séance inconnue pour cette réunion");
        if (d.owner_id && !people.has(d.owner_id))
          throw badRequest("Le chargé d'exécution doit être membre de l'organisation");
        assertDate(d.due_on);
      }
    }
    for (const a of input.attendees)
      if (a.user_id && !people.has(a.user_id)) throw badRequest("Le participant doit être membre de l'organisation");
    // Une recommandation parue dans un compte rendu validé ne se retire pas après réouverture : elle s'annule (R-4)
    const keptIds = new Set(input.agenda.flatMap((i) => (i.actions ?? []).flatMap((a) => (a.id ? [a.id] : []))));
    const dropped = (
      await db.query<{ id: string; text: string }>(
        "SELECT id, text FROM meeting_actions WHERE meeting_id = $1 AND published ORDER BY position",
        [id],
      )
    ).filter((a) => !keptIds.has(a.id));
    if (dropped.length)
      throw badRequest(
        `Une recommandation du compte rendu validé ne se supprime pas : annulez-la plutôt. Concernées : ${dropped.map((a) => a.text).join(", ")}`,
      );
    await db.tx(async (q) => {
      const keptItems = input.agenda.flatMap((i) => (i.id ? [i.id] : []));
      await q.query("DELETE FROM meeting_agenda_items WHERE meeting_id = $1 AND NOT (id = ANY($2))", [id, keptItems]);
      const keptActions = input.agenda.flatMap((i) => (i.actions ?? []).flatMap((a) => (a.id ? [a.id] : [])));
      await q.query("DELETE FROM meeting_actions WHERE meeting_id = $1 AND NOT (id = ANY($2))", [id, keptActions]);
      // Une décision déjà inscrite au registre survit à toute sauvegarde : seul le brouillon se retire
      const keptDecisions = input.agenda.flatMap((i) => (i.decisions ?? []).flatMap((d) => (d.id ? [d.id] : [])));
      await q.query(
        "DELETE FROM meeting_decisions WHERE meeting_id = $1 AND decision_id IS NULL AND NOT (id = ANY($2))",
        [id, keptDecisions],
      );
      for (const [position, item] of input.agenda.entries()) await this.saveItem(q, m, actorId, position, item, people);
      // Feuille de présence : les convoqués gardent leur convocation et leur réponse, la présence est notée en séance
      const before = await q.query<Attendee>("SELECT * FROM meeting_attendees WHERE meeting_id = $1", [id]);
      const key = (a: { user_id?: string | null; name: string }) => a.user_id ?? `n:${a.name.trim().toLowerCase()}`;
      await q.query("DELETE FROM meeting_attendees WHERE meeting_id = $1", [id]);
      const seen = new Set<string>();
      for (const a of input.attendees) {
        const k = key(a);
        if (seen.has(k)) continue;
        seen.add(k);
        const was = before.find((b) => key(b) === k);
        await q.query(
          "INSERT INTO meeting_attendees (id, org_id, meeting_id, user_id, name, function_label, presence, invited, response, delegate_name, responded_at, contact_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
          [
            uid("att"),
            m.org_id,
            id,
            a.user_id ?? null,
            a.user_id ? (people.get(a.user_id) ?? a.name.trim()) : a.name.trim(),
            a.function_label ?? was?.function_label ?? "",
            a.presence ?? "present",
            was?.invited ?? false,
            was?.response ?? null,
            was?.delegate_name ?? "",
            (was as { responded_at?: string | null } | undefined)?.responded_at ?? null,
            was?.contact_id ?? null,
          ],
        );
      }
      // Un convoqué absent de la feuille reste convoqué : il n'est pas effacé par mégarde
      for (const b of before)
        if (b.invited && !seen.has(key(b)))
          await q.query(
            "INSERT INTO meeting_attendees (id, org_id, meeting_id, user_id, name, function_label, presence, invited, response, delegate_name, contact_id) VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9,$10)",
            [
              uid("att"),
              m.org_id,
              id,
              b.user_id,
              b.name,
              b.function_label,
              b.presence,
              b.response,
              b.delegate_name,
              b.contact_id ?? null,
            ],
          );
      // Des notes ne font une séance « tenue » qu'une fois sa date venue : préparer l'ordre du jour ne la tient pas
      const hasNotes = input.agenda.some((i) => i.notes?.trim()) && m.meeting_date <= today();
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
      `INSERT INTO meeting_agenda_items (id, org_id, meeting_id, position, subject, speakers, notes, domain_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET position = EXCLUDED.position, subject = EXCLUDED.subject, speakers = EXCLUDED.speakers, notes = EXCLUDED.notes, domain_id = EXCLUDED.domain_id`,
      [
        itemId,
        m.org_id,
        m.id,
        position,
        item.subject.trim(),
        item.speakers ?? "",
        item.notes ?? "",
        item.domain_id ?? null,
      ],
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
    // Décisions de la séance : une décision déjà inscrite au registre ne se modifie plus
    for (const [i, d] of (item.decisions ?? []).entries()) {
      await q.query(
        `INSERT INTO meeting_decisions (id, org_id, meeting_id, agenda_item_id, position, text, owner_id, due_on)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::date)
         ON CONFLICT (id) DO UPDATE SET agenda_item_id = EXCLUDED.agenda_item_id, position = EXCLUDED.position,
           text = EXCLUDED.text, owner_id = EXCLUDED.owner_id, due_on = EXCLUDED.due_on
         WHERE meeting_decisions.decision_id IS NULL`,
        [d.id ?? uid("mdd"), m.org_id, m.id, itemId, i, d.text.trim(), d.owner_id ?? null, d.due_on ?? null],
      );
    }
  }

  /** Une séance passée qui n'a pas eu lieu se déclare non tenue, avec un motif ; les convoqués sont prévenus (R-6). */
  async notHeld(actorId: string, id: string, reason: string) {
    const { m, can } = await this.readable(actorId, id);
    if (!can.manage && m.writer_id !== actorId)
      throw forbidden("Seuls le rédacteur et les gestionnaires déclarent une séance non tenue");
    if (m.status !== "planned") throw badRequest("Seule une séance sans compte rendu se déclare non tenue");
    if (m.meeting_date >= today()) throw badRequest("Cette séance n'est pas encore passée : reportez-la ou annulez-la");
    const why = reason.trim();
    if (!why) throw badRequest("Le motif est obligatoire");
    await this.svc.db.query(
      "UPDATE meetings SET status = 'cancelled', not_held_reason = $1, updated_at = now() WHERE id = $2",
      [why, id],
    );
    await this.svc.log(actorId, "meeting.not_held", { orgId: m.org_id, data: { reference: meetingReference(m), reason: why } });
    if (m.convened_at)
      await this.notifyInvited(actorId, m, {
        kind: "meeting.cancelled",
        title: `Séance non tenue : ${m.title || m.meeting_type}`,
        body: why,
      });
    return this.get(actorId, id);
  }

  /** Rappels au rédacteur : séance proche non convoquée (R-7), séance passée restée sans suite (R-6). */
  async sweep(now = today()) {
    const in7 = new Date(Date.parse(`${now}T12:00:00`) + 7 * 864e5).toISOString().slice(0, 10);
    const ago2 = new Date(Date.parse(`${now}T12:00:00`) - 2 * 864e5).toISOString().slice(0, 10);
    const rows = await this.svc.db.query<{
      id: string;
      org_id: string;
      writer_id: string | null;
      chair_id: string | null;
      title: string;
      meeting_type: string;
      meeting_date: string;
      convened_at: string | null;
    }>(
      // Le rédacteur et la présidence sont prévenus, même sans rédacteur désigné (E-6)
      `SELECT id, org_id, writer_id, chair_id, title, meeting_type, to_char(meeting_date, 'YYYY-MM-DD') AS meeting_date, convened_at
         FROM meetings WHERE status = 'planned' AND (writer_id IS NOT NULL OR chair_id IS NOT NULL)
          AND ((convened_at IS NULL AND meeting_date >= $1::date AND meeting_date <= $2::date) OR meeting_date <= $3::date)`,
      [now, in7, ago2],
    );
    for (const r of rows) {
      const past = r.meeting_date < now;
      const key = `meeting:${past ? "unheld" : "convene"}:${r.id}:${r.meeting_date}`;
      const fresh = await this.svc.db.query(
        "INSERT INTO reminders_sent (key, org_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING key",
        [key, r.org_id],
      );
      if (!fresh.length) continue;
      const when = r.meeting_date.split("-").reverse().join("/");
      const label = r.title || r.meeting_type;
      for (const to of new Set([r.writer_id, r.chair_id].filter((x): x is string => !!x)))
        await this.svc.notify(to, r.org_id, {
          kind: "meeting.reminder",
          title: past ? `Réunion sans compte rendu : ${label} du ${when}` : `Réunion à convoquer : ${label} du ${when}`,
          body: past
            ? "Établissez le compte rendu, ou déclarez la séance non tenue."
            : "La séance approche et n'est pas encore convoquée : envoyez la convocation.",
          link: `/reunions/${r.id}`,
        });
    }
  }

  async remove(actorId: string, id: string) {
    const { m, can } = await this.readable(actorId, id);
    if (!can.manage) throw forbidden("Seuls les gestionnaires des réunions suppriment une réunion");
    if (m.status === "validated") throw locked();
    // Une séance convoquée qui disparaît : les convoqués sont prévenus de l'annulation
    if (m.convened_at && m.status === "planned")
      await this.notifyInvited(actorId, m, {
        kind: "meeting.cancelled",
        title: `Réunion annulée : ${m.title || m.meeting_type}`,
        body: `La séance du ${String(m.meeting_date).slice(0, 10).split("-").reverse().join("/")} n'aura pas lieu.`,
      });
    await this.svc.db.query("DELETE FROM meetings WHERE id = $1", [id]);
    await this.svc.log(actorId, "meeting.deleted", { orgId: m.org_id, data: { reference: meetingReference(m) } });
  }

  // ---------------------------------------------------------------- validation
  /** Un compte rendu se soumet, se valide ou se retourne seulement s'il est complet et que la séance a eu lieu. */
  private async assertComplete(m: MeetingRow) {
    const n = await this.svc.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM meeting_agenda_items WHERE meeting_id = $1",
      [m.id],
    );
    if (!n?.n) throw badRequest("Le compte rendu doit contenir au moins un point à l'ordre du jour");
    if (m.meeting_date > today())
      throw badRequest("Cette réunion n'a pas encore eu lieu : son compte rendu ne peut pas être soumis ni validé");
    const incomplete = await this.svc.db.query<{ text: string }>(
      "SELECT text FROM meeting_actions WHERE meeting_id = $1 AND status NOT IN ('realise','annule') AND (responsible_id IS NULL AND responsible_name = '' OR due_on IS NULL) ORDER BY position",
      [m.id],
    );
    if (incomplete.length)
      throw badRequest(
        `Chaque recommandation doit avoir un responsable et une échéance. À compléter : ${incomplete.map((a) => a.text).join(", ")}`,
      );
    // Une décision de séance s'inscrira au registre : son échéance ne peut pas précéder la séance
    const badDecisions = await this.svc.db.query<{ text: string }>(
      "SELECT text FROM meeting_decisions WHERE meeting_id = $1 AND decision_id IS NULL AND due_on IS NOT NULL AND due_on < $2::date ORDER BY position",
      [m.id, m.meeting_date],
    );
    if (badDecisions.length)
      throw badRequest(
        `L'échéance d'exécution d'une décision précède la date de la séance : ${badDecisions.map((d) => d.text).join(", ")}`,
      );
  }

  /** Le rédacteur soumet ; la présidence (à défaut les valideurs) est prévenue ; le compte rendu est alors figé. */
  async submit(actorId: string, id: string) {
    const { m, can } = await this.readable(actorId, id);
    if (!can.manage && m.writer_id !== actorId) throw forbidden("Seuls le rédacteur et les gestionnaires soumettent");
    if (m.status === "validated") throw locked();
    if (m.status === "submitted") throw pending();
    if (m.status === "cancelled") throw badRequest("Cette réunion est annulée");
    await this.assertComplete(m);
    const done = await this.svc.db.one(
      "UPDATE meetings SET status = 'submitted', submitted_at = now(), submitted_by = $1, return_comment = '', updated_at = now() WHERE id = $2 AND status IN ('planned','held') RETURNING id",
      [actorId, id],
    );
    if (!done) throw pending();
    const to = m.chair_id
      ? [m.chair_id]
      : (
          await this.svc.db.query<{ user_id: string }>(
            `SELECT om.user_id FROM org_members om JOIN users u ON u.id = om.user_id WHERE om.org_id = $1 AND NOT u.is_ai AND u.status = 'active'`,
            [m.org_id],
          )
        ).map((r) => r.user_id);
    for (const u of to) {
      if (u === actorId || u === m.writer_id) continue;
      if (!m.chair_id && !(await this.svc.permissionsOf(u, m.org_id)).includes("meetings.validate")) continue;
      await this.svc.notify(u, m.org_id, {
        kind: "meeting.submitted",
        title: `Compte rendu à valider : ${m.meeting_type}`,
        body: `${meetingReference(m)} · soumis par ${(await this.svc.user(actorId)).name}`,
        actor_id: actorId,
      });
    }
    await this.svc.log(actorId, "meeting.submitted", { orgId: m.org_id, data: { reference: meetingReference(m) } });
    return this.get(actorId, id);
  }

  /** Retour au rédacteur, avec un motif : il corrige puis soumet à nouveau. */
  async returnReport(actorId: string, id: string, comment: string) {
    const { m } = await this.readable(actorId, id);
    await this.assertDecider(actorId, m);
    if (m.status !== "submitted") throw badRequest("Seul un compte rendu soumis peut être retourné");
    if (!comment.trim()) throw badRequest("Indiquez ce qui doit être revu");
    await this.svc.db.query(
      "UPDATE meetings SET status = 'held', return_comment = $1, updated_at = now() WHERE id = $2",
      [comment.trim(), id],
    );
    if (m.writer_id && m.writer_id !== actorId)
      await this.svc.notify(m.writer_id, m.org_id, {
        kind: "meeting.returned",
        title: `Compte rendu à revoir : ${m.meeting_type}`,
        body: comment.trim(),
        actor_id: actorId,
      });
    await this.svc.log(actorId, "meeting.returned", { orgId: m.org_id, data: { reference: meetingReference(m) } });
    return this.get(actorId, id);
  }

  async validate(actorId: string, id: string) {
    const { m } = await this.readable(actorId, id);
    if (m.status === "validated") throw locked();
    if (m.status !== "submitted") throw badRequest("Le compte rendu doit d'abord être soumis par son rédacteur");
    const { onBehalf } = await this.assertDecider(actorId, m);
    const n = await this.svc.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM meeting_agenda_items WHERE meeting_id = $1",
      [id],
    );
    if (!n?.n) throw badRequest("Le compte rendu doit contenir au moins un point à l'ordre du jour");
    // Un compte rendu officiel rend compte d'une réunion tenue, et chaque recommandation y a un porteur et un délai
    if (m.meeting_date > today())
      throw badRequest("Cette réunion n'a pas encore eu lieu : son compte rendu ne peut pas être validé");
    const incomplete = await this.svc.db.query<{ text: string }>(
      "SELECT text FROM meeting_actions WHERE meeting_id = $1 AND status NOT IN ('realise','annule') AND (responsible_id IS NULL AND responsible_name = '' OR due_on IS NULL) ORDER BY position",
      [id],
    );
    if (incomplete.length)
      throw badRequest(
        `Chaque recommandation doit avoir un responsable et une échéance. À compléter : ${incomplete.map((a) => a.text).join(", ")}`,
      );
    if (
      !(await this.svc.db.one(
        "UPDATE meetings SET status = 'validated', validated_by = $1, validated_on_behalf = $3, validated_at = now(), updated_at = now() WHERE id = $2 AND status = 'submitted' RETURNING id",
        [actorId, id, onBehalf],
      ))
    )
      throw locked();
    // Les recommandations du compte rendu validé sont publiées : elles ne se suppriment plus (R-4)
    await this.svc.db.query("UPDATE meeting_actions SET published = TRUE WHERE meeting_id = $1", [id]);
    await this.svc.log(actorId, "meeting.validated", {
      orgId: m.org_id,
      data: { reference: meetingReference(m), ...(onBehalf ? { on_behalf: onBehalf } : {}) },
    });
    // La séance alimente le registre et le projet (docs/PARCOURS-METIER.md, lot P3a)
    await this.registerDecisions(actorId, m);
    await this.createTasksFromActions(actorId, m);
    // Diffusion : chaque participant, la présidence et le rédacteur reçoivent le compte rendu validé
    const readers = await this.svc.db.query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM (
         SELECT user_id FROM meeting_attendees WHERE meeting_id = $1 AND user_id IS NOT NULL
         UNION SELECT responsible_id FROM meeting_actions WHERE meeting_id = $1 AND responsible_id IS NOT NULL
         UNION SELECT writer_id FROM meetings WHERE id = $1 AND writer_id IS NOT NULL
         UNION SELECT chair_id FROM meetings WHERE id = $1 AND chair_id IS NOT NULL) r`,
      [id],
    );
    for (const r of readers)
      if (r.user_id !== actorId)
        await this.svc.notify(r.user_id, m.org_id, {
          kind: "meeting.report",
          title: `Compte rendu diffusé : ${m.meeting_type} du ${m.meeting_date}`,
          body: meetingReference(m),
          actor_id: actorId,
        });
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

  /** Chaque décision de séance encore en attente entre au registre, portée par le valideur. */
  private async registerDecisions(actorId: string, m: MeetingRow) {
    const pending = await this.svc.db.query<MeetingDecision>(
      "SELECT * FROM meeting_decisions WHERE meeting_id = $1 AND decision_id IS NULL ORDER BY position",
      [m.id],
    );
    if (!pending.length) return;
    const registry = new Decisions(this.svc);
    for (const d of pending) {
      const reg = await registry.record(
        actorId,
        m.org_id,
        {
          title: d.text.length > 180 ? `${d.text.slice(0, 179).trimEnd()}…` : d.text,
          content: d.text,
          decided_on: m.meeting_date,
          meeting_id: m.id,
          owner_id: d.owner_id,
          due_on: d.due_on,
          confidential: m.confidential,
        },
        { viaValidation: true },
      );
      await this.svc.db.query("UPDATE meeting_decisions SET decision_id = $1 WHERE id = $2", [reg.id, d.id]);
    }
  }

  /** Un compte rendu rattaché à un projet : chaque recommandation ouverte devient une tâche du projet. */
  private async createTasksFromActions(actorId: string, m: MeetingRow) {
    if (!m.project_id) return;
    const open = await this.svc.db.query<MeetingAction>(
      "SELECT * FROM meeting_actions WHERE meeting_id = $1 AND task_id IS NULL AND status NOT IN ('realise','annule') ORDER BY position",
      [m.id],
    );
    const reference = meetingReference(m);
    for (const a of open) {
      // Un responsable sans accès au projet n'est pas assigné : la tâche le nomme, le dossier reste étanche
      const assignable = a.responsible_id
        ? await this.svc.require(a.responsible_id, m.project_id, "viewer").then(
            () => true,
            () => false,
          )
        : false;
      const taskId = uid("tsk");
      await this.svc.db.tx(async (q) => {
        const [{ task_seq }] = await q.query<{ task_seq: number }>(
          "UPDATE projects SET task_seq = task_seq + 1 WHERE id = $1 RETURNING task_seq",
          [m.project_id],
        );
        const section = await q.query<{ id: string }>(
          "SELECT id FROM sections WHERE project_id = $1 ORDER BY position LIMIT 1",
          [m.project_id],
        );
        const pos = await q.query<{ p: number }>(
          "SELECT COALESCE(max(position), 0) + 1024 AS p FROM tasks WHERE project_id = $1",
          [m.project_id],
        );
        await q.query(
          `INSERT INTO tasks (id, number, project_id, section_id, title, description, assignee_id, creator_id, due_on, position)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10)`,
          [
            taskId,
            task_seq,
            m.project_id,
            section[0]?.id ?? null,
            a.text,
            `Recommandation du compte rendu ${reference}${assignable || !a.responsible_name ? "" : ` — responsable désigné : ${a.responsible_name}`}`,
            assignable ? a.responsible_id : null,
            actorId,
            a.due_on,
            pos[0]?.p ?? 1024,
          ],
        );
        await q.query("UPDATE meeting_actions SET task_id = $1 WHERE id = $2", [taskId, a.id]);
      });
      await this.svc.log(actorId, "task.created", {
        projectId: m.project_id,
        taskId,
        data: { title: a.text, from_meeting: reference },
      });
      this.svc.bus.emit({ type: "task.created", actorId, projectId: m.project_id, taskId });
    }
  }

  /**
   * Un document validé reste figé (thème 2, R-3) : seule la personne qui l'a validé, ou la DG, le rouvre, avec un
   * motif écrit, tracé au journal ; le valideur est prévenu quand un autre rouvre à sa place.
   */
  async reopen(actorId: string, id: string, reason = "") {
    const { m } = await this.readable(actorId, id);
    await this.svc.requirePerm(actorId, m.org_id, "meetings.validate");
    if (m.status !== "validated") throw badRequest("Ce compte rendu n'est pas validé");
    const dg = (await this.svc.permissionsOf(actorId, m.org_id)).includes("decisions.confirm");
    if (m.validated_by && m.validated_by !== actorId && !dg) {
      const by = (await this.svc.userOrNull(m.validated_by))?.name ?? "la personne qui l'a validé";
      throw forbidden(`Seule la personne qui a validé ce compte rendu (${by}) ou la DG peut le rouvrir`);
    }
    const why = reason.trim();
    if (!why) throw badRequest("Le motif de la réouverture est obligatoire");
    const moved = await this.svc.db.one(
      "UPDATE meetings SET status = 'held', validated_by = NULL, validated_on_behalf = NULL, validated_at = NULL, updated_at = now() WHERE id = $1 AND status = 'validated' RETURNING id",
      [id],
    );
    if (!moved) throw new HttpError(409, "Le compte rendu a changé entre-temps, rechargez la page");
    await this.svc.log(actorId, "meeting.reopened", {
      orgId: m.org_id,
      data: { reference: meetingReference(m), reason: why, validated_by: m.validated_by },
    });
    for (const to of new Set([m.validated_by, m.writer_id]))
      if (to && to !== actorId)
        await this.svc.notify(to, m.org_id, {
          kind: "meeting.reopened",
          title: `Compte rendu rouvert : ${meetingReference(m)}`,
          body: `Par ${(await this.svc.user(actorId)).name} · ${why}`,
          actor_id: actorId,
        });
    return this.get(actorId, id);
  }

  // ---------------------------------------------------------------- convocation
  async setInvitees(actorId: string, id: string, list: InviteeInput[]) {
    const m = await this.editable(actorId, id);
    const invitees = await this.resolveInvitees(m.org_id, list);
    const current = await this.currentPartners(id);
    const partners = await this.partnersOf(m.org_id, [], invitees, current);
    await this.svc.db.tx(async (q) => {
      await this.writeInvitees(q, m, invitees);
      await this.writePartners(q, m, partners, false);
    });
    return this.get(actorId, id);
  }

  /**
   * Convoquer : des convoqués, un ordre du jour, une séance à venir ; à moins de 48 h l'urgence est confirmée.
   * Une nouvelle convocation (date, lieu changés) remet les réponses à zéro.
   */
  async convene(actorId: string, id: string, i: { short_notice?: boolean }) {
    const m = await this.editable(actorId, id);
    if (m.status !== "planned") throw badRequest("Seule une réunion programmée peut être convoquée");
    if (m.meeting_date < today()) throw badRequest("Cette séance est passée : elle ne se convoque plus");
    const invited = await this.svc.db.query<{ user_id: string | null }>(
      "SELECT user_id FROM meeting_attendees WHERE meeting_id = $1 AND invited",
      [id],
    );
    if (!invited.length) throw badRequest("Ajoutez au moins un convoqué avant d'envoyer la convocation");
    const open = await this.openFromPrevious(m);
    await this.svc.db.tx((q) => this.addFollowUp(q, m, open));
    const items = await this.svc.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM meeting_agenda_items WHERE meeting_id = $1",
      [id],
    );
    if (!items?.n) throw badRequest("L'ordre du jour est vide : la convocation l'annonce à chaque convoqué");
    const at = Date.parse(`${m.meeting_date}T${m.start_time ?? "00:00"}:00`);
    if ((at - Date.now()) / 36e5 < NOTICE_HOURS && !i.short_notice)
      throw badRequest(`Convocation à moins de ${NOTICE_HOURS} h de la séance : confirmez l'urgence pour l'envoyer`);
    await this.svc.db.tx(async (q) => {
      await q.query(
        "UPDATE meeting_attendees SET response = 'pending', delegate_name = '', responded_at = NULL WHERE meeting_id = $1 AND invited",
        [id],
      );
      await q.query("UPDATE meetings SET convened_at = now(), convened_actor = $1, updated_at = now() WHERE id = $2", [
        actorId,
        id,
      ]);
    });
    const where = [m.location, m.video_link].filter(Boolean).join(" · ") || "lieu à préciser";
    const again = !!m.convened_at;
    for (const a of invited)
      if (a.user_id && a.user_id !== actorId)
        await this.svc.notify(a.user_id, m.org_id, {
          kind: "meeting.convened",
          title: `${again ? "Convocation modifiée" : "Convocation"} : ${m.meeting_type} du ${m.meeting_date}${m.start_time ? ` à ${m.start_time}` : ""}`,
          body: `${where}. Indiquez si vous serez présent, excusé ou représenté.`,
          actor_id: actorId,
        });
    await this.svc.log(actorId, "meeting.convened", {
      orgId: m.org_id,
      projectId: m.project_id,
      data: { reference: meetingReference(m), invited: invited.length, short_notice: !!i.short_notice, again },
    });
    return this.get(actorId, id);
  }

  /** Seul le convoqué répond, jusqu'au jour de la séance : présent, excusé, ou représenté par une personne nommée. */
  async respond(
    actorId: string,
    id: string,
    i: { response: "accepted" | "declined" | "delegated"; delegate_name?: string },
  ) {
    const m = await this.row(id);
    const row = await this.svc.db.one<{ id: string }>(
      "SELECT id FROM meeting_attendees WHERE meeting_id = $1 AND user_id = $2 AND invited",
      [id, actorId],
    );
    if (!row) throw forbidden("Seuls les convoqués répondent à cette convocation");
    if (!m.convened_at) throw badRequest("Cette réunion n'a pas encore été convoquée");
    if (m.status !== "planned" || m.meeting_date < today())
      throw badRequest("La séance est passée : la réponse est close");
    if (i.response === "delegated" && !i.delegate_name?.trim())
      throw badRequest("Indiquez le nom de la personne qui vous représente");
    await this.svc.db.query(
      "UPDATE meeting_attendees SET response = $1, delegate_name = $2, responded_at = now() WHERE id = $3",
      [i.response, i.response === "delegated" ? i.delegate_name!.trim() : "", row.id],
    );
    await this.svc.log(actorId, "meeting.response", {
      orgId: m.org_id,
      data: { reference: meetingReference(m), response: i.response },
    });
    const can = await this.can(actorId, m.org_id);
    return this.detail(m, actorId, can);
  }

  // ---------------------------------------------------------------- pièces de l'ordre du jour
  async addDocument(actorId: string, id: string, filename: string, data: Buffer, itemId?: string) {
    const m = await this.editable(actorId, id);
    if (!data.length) throw badRequest("Le fichier est vide");
    if (data.length > ATTACHMENT_MAX_BYTES) throw new HttpError(413, "Fichier trop volumineux : 25 Mo au maximum");
    const name = cleanName(filename);
    const type = detectType(name, data);
    if (!type) throw new HttpError(415, `Format non pris en charge. Formats acceptés : ${ALLOWED_FORMATS}`);
    if (
      itemId &&
      !(await this.svc.db.one("SELECT 1 FROM meeting_agenda_items WHERE meeting_id = $1 AND id = $2", [id, itemId]))
    )
      throw badRequest("Point de l'ordre du jour inconnu pour cette réunion");
    const n = await this.svc.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM meeting_documents WHERE meeting_id = $1",
      [id],
    );
    if ((n?.n ?? 0) >= MAX_DOCUMENTS) throw badRequest(`Une réunion ne peut pas avoir plus de ${MAX_DOCUMENTS} pièces`);
    const docId = uid("mdc");
    await this.svc.db.query(
      "INSERT INTO meeting_documents (id, org_id, meeting_id, agenda_item_id, uploader_id, filename, mime, size, data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [docId, m.org_id, id, itemId ?? null, actorId, name, type.mime, data.length, data],
    );
    await this.svc.log(actorId, "meeting.document", {
      orgId: m.org_id,
      data: { reference: meetingReference(m), filename: name },
    });
    return { id: docId, filename: name, mime: type.mime, size: data.length };
  }

  async document(actorId: string, docId: string) {
    const d = await this.svc.db.one<{ meeting_id: string; filename: string; mime: string; data: Buffer }>(
      "SELECT meeting_id, filename, mime, data FROM meeting_documents WHERE id = $1",
      [docId],
    );
    if (!d) throw notFound("Pièce introuvable");
    await this.readable(actorId, d.meeting_id).catch(() => {
      throw notFound("Pièce introuvable");
    });
    return d;
  }

  async removeDocument(actorId: string, docId: string) {
    const d = await this.svc.db.one<{ meeting_id: string; filename: string }>(
      "SELECT meeting_id, filename FROM meeting_documents WHERE id = $1",
      [docId],
    );
    if (!d) throw notFound("Pièce introuvable");
    const m = await this.editable(actorId, d.meeting_id);
    await this.svc.db.query("DELETE FROM meeting_documents WHERE id = $1", [docId]);
    await this.svc.log(actorId, "meeting.document.deleted", {
      orgId: m.org_id,
      data: { reference: meetingReference(m), filename: d.filename },
    });
  }

  // ---------------------------------------------------------------- suivi des recommandations
  /**
   * Prochaines réunions à mettre en avant. « mine » : celles où la personne est convoquée, préside ou rédige.
   * « unit_id » : celles de l'entité, une seule séance par série (la prochaine). Les réunions confidentielles
   * restent réservées à ceux qui peuvent les voir.
   */
  async upcoming(actorId: string, orgId: string, f: { mine?: boolean; unit_id?: string; limit?: number }) {
    const perms = await this.svc.permissionsOf(actorId, orgId);
    if (!perms.includes("meetings.view")) return [];
    const manage = perms.includes("meetings.manage");
    const rows = await this.svc.db.query<
      MeetingRow & {
        chair_name: string | null;
        unit_name: string | null;
        my_response: Response | null;
        invited: boolean;
      }
    >(
      `SELECT DISTINCT ON (COALESCE(m.series_id, m.id)) m.*, c.name AS chair_name, ou.name AS unit_name,
              (SELECT x.response FROM meeting_attendees x WHERE x.meeting_id = m.id AND x.user_id = $2 AND x.invited LIMIT 1) AS my_response,
              EXISTS (SELECT 1 FROM meeting_attendees x WHERE x.meeting_id = m.id AND x.user_id = $2) AS invited
         FROM meetings m LEFT JOIN users c ON c.id = m.chair_id LEFT JOIN org_units ou ON ou.id = m.unit_id
        WHERE m.org_id = $1 AND ${VISIBLE("m", "$2", "$3")} AND m.meeting_date >= $4::date AND m.status = 'planned'
          AND ($5::text IS NULL OR m.unit_id = $5
               OR (m.unit_id IN (WITH RECURSIVE up(id, parent_id) AS (
                     SELECT id, parent_id FROM org_units WHERE id = $5
                     UNION SELECT p.id, p.parent_id FROM org_units p JOIN up ON p.id = up.parent_id
                   ) SELECT id FROM up)
                   AND EXISTS (SELECT 1 FROM meeting_attendees x JOIN org_members om ON om.user_id = x.user_id AND om.org_id = m.org_id
                               WHERE x.meeting_id = m.id AND om.unit_id = $5)))
          AND (NOT $6 OR m.chair_id = $2 OR m.writer_id = $2
               OR EXISTS (SELECT 1 FROM meeting_attendees x WHERE x.meeting_id = m.id AND x.user_id = $2))
        ORDER BY COALESCE(m.series_id, m.id), m.meeting_date, m.start_time NULLS LAST`,
      [orgId, actorId, await this.level(actorId, orgId, manage), today(), f.unit_id ?? null, !!f.mine],
    );
    return rows
      .sort((a, b) =>
        String(a.meeting_date) === String(b.meeting_date)
          ? String(a.start_time ?? "").localeCompare(String(b.start_time ?? ""))
          : String(a.meeting_date) < String(b.meeting_date)
            ? -1
            : 1,
      )
      .slice(0, f.limit ?? 8)
      .map((m) => ({
        id: m.id,
        reference: meetingReference(m),
        title: m.title,
        meeting_type: m.meeting_type,
        meeting_date: m.meeting_date,
        start_time: m.start_time,
        location: m.location,
        video_link: m.video_link,
        status: m.status,
        convened: !!m.convened_at,
        chair_name: m.chair_name,
        unit_name: m.unit_name,
        recurring: !!m.series_id,
        invited: m.invited,
        my_response: m.my_response,
        role: m.chair_id === actorId ? "chair" : m.writer_id === actorId ? "writer" : m.invited ? "invited" : null,
      }));
  }

  async listActions(actorId: string, orgId: string, f: { mine?: boolean }) {
    await this.svc.requirePerm(actorId, orgId, "meetings.view");
    const can = await this.can(actorId, orgId);
    const rows = await this.svc.db.query<ActionWithMeeting & { meeting_type: string }>(
      `SELECT m.seq, m.service_code, m.writer_initials, m.meeting_date, m.meeting_type, a.* FROM meeting_actions a JOIN meetings m ON m.id = a.meeting_id
       WHERE a.org_id = $1 AND (${VISIBLE("m", "$2", "$3")} OR a.responsible_id = $2) AND ($4 = FALSE OR a.responsible_id = $2) ORDER BY a.due_on NULLS LAST, a.created_at`,
      [orgId, actorId, await this.level(actorId, orgId, can.manage), !!f.mine],
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
    // Un report recule l'échéance ; une annulation se motive ; une recommandation close ne se rouvre pas ici (testeurs)
    if (patch.status === "reporte" && patch.due_on && a.due_on && patch.due_on <= String(a.due_on).slice(0, 10))
      throw badRequest("Un report fixe une échéance plus tardive que l'actuelle");
    if (patch.status === "annule" && !patch.postponed_reason?.trim())
      throw badRequest("Une annulation se motive");
    if (CLOSED.includes(a.status) && patch.status && !CLOSED.includes(patch.status))
      throw new HttpError(409, "Cette recommandation est close : elle ne se rouvre pas");
    const status = patch.status ?? a.status;
    const closing = CLOSED.includes(status);
    const row = await this.svc.db.one<MeetingAction>(
      `UPDATE meeting_actions SET status = $1, due_on = COALESCE($2::date, due_on),
        original_due_on = CASE WHEN $1 = 'reporte' THEN COALESCE(original_due_on, due_on) ELSE original_due_on END,
        postponed_reason = COALESCE($3, postponed_reason), closed_by = CASE WHEN $4 THEN $5 END, closed_at = CASE WHEN $4 THEN now() END WHERE id = $6 RETURNING *`,
      [status, patch.due_on ?? null, patch.postponed_reason?.trim() ?? null, closing, actorId, id],
    );
    await this.svc.log(actorId, "meeting.action", { orgId: a.org_id, data: { id, status } });
    // Recommandation close : la tâche du projet née d'elle se termine avec elle (lot P3a)
    if (closing && a.task_id) {
      const done = await this.svc.db.one<{ project_id: string }>(
        "UPDATE tasks SET completed = TRUE, completed_at = now(), updated_at = now() WHERE id = $1 AND NOT completed RETURNING project_id",
        [a.task_id],
      );
      if (done) {
        await this.svc.log(actorId, "task.completed", {
          projectId: done.project_id,
          taskId: a.task_id,
          data: { from: false, to: true },
        });
        this.svc.bus.emit({
          type: "task.updated",
          actorId,
          projectId: done.project_id,
          taskId: a.task_id,
          changes: ["completed"],
          previous: { completed: false },
        });
      }
    }
    // Une recommandation soumise attend qu'on la clôture : le rédacteur du compte rendu en est prévenu
    if (status === "soumis" && a.status !== "soumis") {
      const m = await this.svc.db.one<MeetingRow>("SELECT * FROM meetings WHERE id = $1", [a.meeting_id]);
      if (m?.writer_id && m.writer_id !== actorId)
        await this.svc.notify(m.writer_id, a.org_id, {
          kind: "meeting.action.submitted",
          title: `Recommandation déclarée réalisée : ${a.text}`,
          body: `Compte rendu ${meetingReference(m)} : à vérifier puis clôturer`,
        });
    }
    return row;
  }
}
