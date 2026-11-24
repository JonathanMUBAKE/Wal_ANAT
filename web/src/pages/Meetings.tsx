import { useOpenFromUrl } from "@/components/quick-entry";
import { DOCUMENT_FORMATS, ExportMenu } from "@/components/export-menu";
import { todayIso } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CornerUpLeft,
  Eye,
  FolderOpen,
  Megaphone,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ConfirmDialog, Dialog, Empty, IconButton, Markdown, cn } from "@/components/ui";
import {
  DomainSelect,
  Field,
  Input,
  LoadingRows,
  PageHeader,
  PeopleSelect,
  Section,
  Select,
  Stamp,
  Status,
  Table,
  Td,
  Textarea,
  Tr,
  frDate,
  isLate,
  type Tone,
} from "@/components/gov";
import { Seal } from "@/components/collection";
import { PreviewDrawer } from "@/components/AttachmentPreview";
import { MeetingsBrowser } from "@/components/MeetingViews";
import { useShell } from "@/lib/shell";
import { api } from "@/lib/api";
import { useCan, useMe, useUnits, useUsers } from "@/lib/hooks";
import { PartnerSelect, usePartnerOptions, usePartnerContacts } from "@/components/partners";
import { Fact, Facts, LongText } from "@/components/record";

type ActionStatus = "a_faire" | "en_cours" | "soumis" | "realise" | "reporte" | "annule";
interface MeetingAction {
  id?: string;
  text: string;
  responsible_id: string | null;
  responsible_name: string;
  due_on: string | null;
  original_due_on?: string | null;
  status: ActionStatus;
  meeting_id?: string;
  meeting_reference?: string;
  meeting_type?: string;
  task_id?: string | null;
  /** Parue dans un compte rendu validé : elle s'annule, elle ne se retire pas (R-4). */
  published?: boolean;
}
/** Décision annoncée en séance : inscrite au registre des décisions à la validation du compte rendu. */
interface MeetingDecision {
  id?: string;
  text: string;
  owner_id: string | null;
  owner_name?: string | null;
  due_on: string | null;
  decision_reference?: string | null;
}
interface AgendaItem {
  id?: string;
  subject: string;
  speakers: string;
  notes: string;
  domain_id?: string | null;
  actions: MeetingAction[];
  decisions: MeetingDecision[];
}
type Response = "pending" | "accepted" | "declined" | "delegated";
interface Attendee {
  id?: string;
  user_id: string | null;
  name: string;
  function_label: string;
  presence: string;
  invited?: boolean;
  response?: Response | null;
  delegate_name?: string;
}
interface MeetingDocument {
  id: string;
  filename: string;
  mime: string;
  size: number;
  uploader_name: string | null;
}
export interface MeetingRow {
  end_time?: string | null;
  id: string;
  reference: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  location: string;
  status: "planned" | "held" | "submitted" | "validated" | "cancelled";
  confidential: boolean;
  open_actions: number;
  action_count: number;
  writer_name: string;
  start_time: string | null;
  chair_name?: string | null;
  series_id?: string | null;
  my_response?: Response | null;
}
export interface MeetingDetail extends MeetingRow {
  end_time: string | null;
  convened_by: string;
  facilitator: string;
  timekeeper: string;
  attendance_note: string;
  previous_summary: string;
  summary: string;
  next_date: string | null;
  next_time: string | null;
  next_location: string;
  next_topics: string;
  chair_id: string | null;
  video_link: string;
  convened_at: string | null;
  submitted_at: string | null;
  return_comment: string;
  dossier: { kind: "project" | "activity"; id: string; label: string; href: string } | null;
  partners?: { id: string; name: string; acronym: string }[];
  documents: MeetingDocument[];
  agenda: AgendaItem[];
  attendees: Attendee[];
  previous: { id: string; reference: string; meeting_date: string } | null;
  carried: MeetingAction[];
  can: {
    edit: boolean;
    validate: boolean;
    convene: boolean;
    submit: boolean;
    decide: boolean;
    respond: boolean;
    reopen?: boolean;
    declare_not_held?: boolean;
  };
  validated_on_behalf?: string | null;
  not_held_reason?: string;
}

const MEETING: Record<MeetingRow["status"], { label: string; tone: Tone }> = {
  planned: { label: "Planifiée", tone: "neutral" },
  held: { label: "Tenue", tone: "info" },
  submitted: { label: "Soumis à validation", tone: "warning" },
  validated: { label: "Validé", tone: "success" },
  cancelled: { label: "Annulée", tone: "danger" },
};
/** Réponse d'un convoqué à la convocation. */
const RESPONSE: Record<Response, { label: string; tone: Tone }> = {
  pending: { label: "En attente de réponse", tone: "neutral" },
  accepted: { label: "Sera présent", tone: "success" },
  declined: { label: "Excusé", tone: "warning" },
  delegated: { label: "Représenté", tone: "info" },
};
const ACTION: Record<ActionStatus, { label: string; tone: Tone }> = {
  a_faire: { label: "À faire", tone: "neutral" },
  en_cours: { label: "En cours", tone: "info" },
  soumis: { label: "Soumis", tone: "warning" },
  realise: { label: "Réalisé", tone: "success" },
  reporte: { label: "Reporté", tone: "warning" },
  annule: { label: "Annulé", tone: "danger" },
};
const PRESENCE = { present: "Présent", represente: "Représenté", excuse: "Excusé", absent: "Absent" };
const fail = (e: unknown) => toast.error((e as Error).message);

export function MeetingsPage() {
  const can = useCan();
  const [creating, setCreating] = useState(false);
  useOpenFromUrl(() => setCreating(true));
  const { data, isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => api.get<MeetingRow[]>("/api/meetings"),
  });
  return (
    <div className="mx-auto min-h-full max-w-[1480px] p-4 sm:px-8 sm:py-6">
      <MeetingsBrowser
        rows={data ?? []}
        isLoading={isLoading}
        primary={
          can("meetings.manage") && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Nouvelle réunion
            </Button>
          )
        }
        renderActions={(mine) => <ActionsTracker mine={mine} />}
      />
      {creating && <NewMeeting onClose={() => setCreating(false)} />}
    </div>
  );
}

/** Convoqué choisi à la programmation : une personne, une entité entière, ou une personne extérieure nommée. */
type InviteeChip = { user_id?: string; unit_id?: string; contact_id?: string; name?: string; label: string };

export function NewMeeting({
  projectId,
  partner,
  unit,
  onClose,
}: {
  projectId?: string;
  /** Réunion programmée depuis l'espace d'une entité : elle lui appartient, toute l'entité est convoquée d'office. */
  unit?: { id: string; name: string };
  /** Réunion programmée depuis la fiche d'un partenaire : il est prérempli, ses contacts sont convocables. */
  partner?: { id: string; name: string };
  onClose: () => void;
}) {
  const { data: me } = useMe();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({
    meeting_type: "",
    meeting_date: todayIso(),
    start_time: "09:00",
    end_time: "10:00",
    location: "",
    video_link: "",
    convened_by: "",
    facilitator: "",
    timekeeper: "",
    writer_id: me?.id ?? "",
    chair_id: "",
    confidential: false,
  });
  const [invitees, setInvitees] = useState<InviteeChip[]>(
    unit ? [{ unit_id: unit.id, label: `Toute l'entité ${unit.name}` }] : [],
  );
  const [external, setExternal] = useState("");
  const [partnerIds, setPartnerIds] = useState<string[]>(partner ? [partner.id] : []);
  const { data: partnerOptions } = usePartnerOptions();
  const contacts = usePartnerContacts(partnerIds);
  const partnerName = (id: string) =>
    partnerOptions?.find((p) => p.id === id)?.name ?? (id === partner?.id ? partner.name : id);
  const [every, setEvery] = useState<"" | "week" | "2weeks" | "month">("");
  // Réunion à venir (programmée à partir d'aujourd'hui) ou déjà tenue (enregistrée pour la traçabilité)
  const [timing, setTiming] = useState<"upcoming" | "past">("upcoming");
  const past = timing === "past";
  const t = todayIso();
  const dateError = !f.meeting_date
    ? null
    : past && f.meeting_date > t
      ? "Une réunion déjà tenue a lieu au plus tard aujourd'hui"
      : !past && f.meeting_date < t
        ? "Une réunion à venir part d'aujourd'hui"
        : null;
  const [count, setCount] = useState(4);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const addChip = (c: InviteeChip) =>
    setInvitees((list) => (list.some((x) => x.label === c.label) ? list : [...list, c]));
  const create = useMutation({
    mutationFn: () =>
      api.post<MeetingDetail>("/api/meetings", {
        ...f,
        chair_id: f.chair_id || null,
        project_id: projectId ?? null,
        unit_id: unit?.id ?? null,
        partner_ids: partnerIds,
        invitees: invitees.map(({ label: _l, ...rest }) => rest),
        timing,
        repeat: every && !past ? { every, count } : null,
      }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["unit-dashboard"] });
      nav(`/reunions/${m.id}`);
    },
    onError: fail,
  });
  const people = users?.filter((u) => !u.is_ai) ?? [];
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={(past ? "Enregistrer une réunion déjà tenue" : "Programmer une réunion") + (unit ? ` — ${unit.name}` : "")}
      description={
        past
          ? "Pour la traçabilité : la séance entre au registre comme tenue, avec ses participants ; son compte rendu suit ensuite le circuit de validation."
          : projectId
            ? "La réunion sera rattachée à ce projet. Le numéro officiel est attribué automatiquement."
            : "Le numéro officiel est attribué automatiquement. Les réunions de même type se suivent et reprennent la synthèse précédente."
      }
      width={640}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={
              !f.meeting_type.trim() ||
              !f.meeting_date ||
              !!dateError ||
              !f.writer_id ||
              (!past && !!every && (count < 2 || count > 12))
            }
            onClick={() => create.mutate()}
          >
            {past ? "Enregistrer la réunion" : every ? `Programmer ${count} séances` : "Programmer la réunion"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div role="radiogroup" aria-label="Moment de la réunion" className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          {(
            [
              ["upcoming", "Réunion à venir", "À partir d'aujourd'hui : programmée, puis convoquée."],
              ["past", "Réunion déjà tenue", "Jusqu'à aujourd'hui : enregistrée pour la traçabilité."],
            ] as const
          ).map(([v, label, hint]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={timing === v}
              onClick={() => setTiming(v)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                timing === v ? "border-primary bg-brand-soft" : "border-line hover:bg-hover",
              )}
            >
              <span className="block text-[13px] font-medium">{label}</span>
              <span className="block text-[12px] text-muted">{hint}</span>
            </button>
          ))}
        </div>
        <Field
          label="Type de réunion"
          required
          className="sm:col-span-2"
          hint="Exemple : Comité de direction hebdomadaire"
        >
          {(a) => <Input {...a} autoFocus value={f.meeting_type} onChange={set("meeting_type")} />}
        </Field>
        <Field label="Date" required error={dateError}>
          {(a) => (
            <Input
              {...a}
              type="date"
              min={past ? undefined : t}
              max={past ? t : undefined}
              value={f.meeting_date}
              onChange={set("meeting_date")}
            />
          )}
        </Field>
        {past ? (
          <span />
        ) : (
          <Field label="Récurrence">
            {(a) => (
              <span className="flex gap-2">
                <Select {...a} value={every} onChange={(e) => setEvery(e.target.value as typeof every)}>
                  <option value="">Séance unique</option>
                  <option value="week">Chaque semaine</option>
                  <option value="2weeks">Toutes les 2 semaines</option>
                  <option value="month">Chaque mois</option>
                </Select>
                {every && (
                  <Input
                    aria-label="Nombre de séances"
                    type="number"
                    min={2}
                    max={12}
                    className="w-20"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                )}
              </span>
            )}
          </Field>
        )}
        <Field label="Heure de début">
          {(a) => <Input {...a} type="time" value={f.start_time} onChange={set("start_time")} />}
        </Field>
        <Field label="Heure de fin">
          {(a) => <Input {...a} type="time" value={f.end_time} onChange={set("end_time")} />}
        </Field>
        <Field label="Lieu">{(a) => <Input {...a} value={f.location} onChange={set("location")} />}</Field>
        <Field label="Lien de visioconférence">
          {(a) => <Input {...a} placeholder="https://…" value={f.video_link} onChange={set("video_link")} />}
        </Field>
        <Field label="Présidence de séance" hint="C'est elle qui validera le compte rendu.">
          {(a) => (
            <PeopleSelect
              {...a}
              people={users}
              placeholder="Non désignée"
              value={f.chair_id}
              onChange={(v) => setF({ ...f, chair_id: v })}
            />
          )}
        </Field>
        <Field label="Rédacteur" required>
          {(a) => (
            <PeopleSelect {...a} people={users} value={f.writer_id} onChange={(v) => setF({ ...f, writer_id: v })} />
          )}
        </Field>
        <Field label="Convoquée par" hint="L'autorité affichée sur le compte rendu officiel.">
          {(a) => <Input {...a} value={f.convened_by} onChange={set("convened_by")} />}
        </Field>
        <Field label="Animateur">{(a) => <Input {...a} value={f.facilitator} onChange={set("facilitator")} />}</Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-[12.5px] font-medium text-muted">Partenaires concernés</legend>
          {!!partnerIds.length && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {partnerIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[12.5px]"
                >
                  {partnerName(id)}
                  <button
                    type="button"
                    aria-label={`Retirer ${partnerName(id)}`}
                    className="text-faint hover:text-fg"
                    onClick={() => {
                      setPartnerIds(partnerIds.filter((x) => x !== id));
                      setInvitees(
                        invitees.filter((c) => !contacts.some((k) => k.id === c.contact_id && k.partner_id === id)),
                      );
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <PartnerSelect
            aria-label="Ajouter un partenaire concerné"
            placeholder="Ajouter un partenaire de l'annuaire…"
            value=""
            onChange={(id) => id && !partnerIds.includes(id) && setPartnerIds([...partnerIds, id])}
          />
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-[12.5px] font-medium text-muted">{past ? "Participants" : "Convoqués"}</legend>
          {!!invitees.length && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {invitees.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 rounded-full bg-hover px-2.5 py-1 text-[12.5px]"
                >
                  {c.label}
                  <button
                    type="button"
                    aria-label={`Retirer ${c.label}`}
                    className="text-faint hover:text-fg"
                    onClick={() => setInvitees(invitees.filter((x) => x.label !== c.label))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <Select
              aria-label="Convoquer une personne"
              value=""
              onChange={(e) => {
                const u = people.find((x) => x.id === e.target.value);
                if (u) addChip({ user_id: u.id, label: u.name });
              }}
            >
              <option value="">Personne…</option>
              {people.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Convoquer une entité entière"
              value=""
              onChange={(e) => {
                const u = units?.find((x) => x.id === e.target.value);
                if (u) addChip({ unit_id: u.id, label: `${u.name} (entité)` });
              }}
            >
              <option value="">Entité entière…</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Personne extérieure"
              placeholder="Personne extérieure ⏎"
              value={external}
              onChange={(e) => setExternal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && external.trim()) {
                  e.preventDefault();
                  addChip({ name: external.trim(), label: external.trim() });
                  setExternal("");
                }
              }}
            />
          </div>
          {!!contacts.length && (
            <Select
              aria-label="Convoquer un contact d'un partenaire"
              className="mt-2"
              value=""
              onChange={(e) => {
                const c = contacts.find((x) => x.id === e.target.value);
                if (c) addChip({ contact_id: c.id, label: `${c.name} (${c.partner_label})` });
              }}
            >
              <option value="">Contact d'un partenaire…</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.title ? ` — ${c.title}` : ""} ({c.partner_label})
                </option>
              ))}
            </Select>
          )}
        </fieldset>
        <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
          <input
            type="checkbox"
            checked={f.confidential}
            onChange={(e) => setF({ ...f, confidential: e.target.checked })}
          />
          Réunion confidentielle : visible des seuls participants, de la présidence, du rédacteur et des gestionnaires
        </label>
      </div>
    </Dialog>
  );
}

function ActionsTracker({ mine }: { mine: boolean }) {
  const can = useCan();
  const { data: me } = useMe();
  const shell = useShell();
  const qc = useQueryClient();
  const [postponing, setPostponing] = useState<MeetingAction | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["meeting-actions", mine],
    queryFn: () => api.get<MeetingAction[]>(`/api/meeting-actions${mine ? "?mine=true" : ""}`),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/api/meeting-actions/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-actions"] }),
    onError: fail,
  });
  const manager = can("meetings.manage");
  const options = (a: MeetingAction): ActionStatus[] =>
    manager
      ? ["a_faire", "en_cours", "soumis", "realise", "reporte", "annule"]
      : a.responsible_id === me?.id
        ? ["en_cours", "soumis"]
        : [];
  if (isLoading) return <LoadingRows />;
  if (!data?.length)
    return (
      <Section>
        <Empty title="Aucune recommandation">Les recommandations des comptes rendus apparaîtront ici.</Empty>
      </Section>
    );
  return (
    <Section>
      <Table head={["Recommandation", "Compte rendu", "Responsable", "Échéance", "Statut", "Suivi"]}>
        {data.map((a) => {
          const open = a.status !== "realise" && a.status !== "annule";
          const choices = options(a);
          return (
            <Tr key={a.id}>
              <Td className="max-w-md">
                {a.text}
                {a.task_id && (
                  <button
                    type="button"
                    onClick={() => shell.openTask(a.task_id as string)}
                    className="mt-0.5 block text-[12px] text-primary hover:underline"
                  >
                    Voir la tâche du projet liée
                  </button>
                )}
              </Td>
              <Td>
                <Link to={`/reunions/${a.meeting_id}`} className="font-mono text-[12px] text-primary hover:underline">
                  {a.meeting_reference}
                </Link>
              </Td>
              <Td>{a.responsible_name || "—"}</Td>
              <Td className={open && isLate(a.due_on) ? "font-semibold text-danger tabular" : "tabular"}>
                {frDate(a.due_on)}
                {a.original_due_on && a.original_due_on !== a.due_on && (
                  <span className="block text-[11.5px] font-normal text-muted">
                    initiale : {frDate(a.original_due_on)}
                  </span>
                )}
              </Td>
              <Td>
                <Status {...ACTION[a.status]} />
              </Td>
              <Td>
                {!!choices.length && (
                  <Select
                    aria-label="Changer le statut"
                    className="h-8 min-w-[120px] text-[12.5px]"
                    value={choices.includes(a.status) ? a.status : ""}
                    onChange={(e) => {
                      const status = e.target.value as ActionStatus;
                      if (status === "reporte") setPostponing(a);
                      else if (status) update.mutate({ id: a.id!, body: { status } });
                    }}
                  >
                    {!choices.includes(a.status) && <option value="">Changer…</option>}
                    {choices.map((s) => (
                      <option key={s} value={s}>
                        {ACTION[s].label}
                      </option>
                    ))}
                  </Select>
                )}
              </Td>
            </Tr>
          );
        })}
      </Table>
      {postponing && <Postpone action={postponing} onClose={() => setPostponing(null)} />}
    </Section>
  );
}

function Postpone({ action, onClose }: { action: MeetingAction; onClose: () => void }) {
  const qc = useQueryClient();
  const [due, setDue] = useState("");
  const [reason, setReason] = useState("");
  const save = useMutation({
    mutationFn: () =>
      api.patch(`/api/meeting-actions/${action.id}`, { status: "reporte", due_on: due, postponed_reason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting-actions"] });
      onClose();
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Reporter la recommandation"
      description={action.text}
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!due || !reason.trim()}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Reporter
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nouvelle échéance" required>
          {(a) => <Input {...a} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}
        </Field>
        <Field label="Motif du report" required hint="L'échéance initiale reste conservée.">
          {(a) => <Textarea {...a} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
}

export function MeetingPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: me } = useMe();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const {
    data: m,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => api.get<MeetingDetail>(`/api/meetings/${id}`),
    enabled: !!id,
  });
  const [draft, setDraft] = useState<MeetingDetail | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [justValidated, setJustValidated] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [notHeld, setNotHeld] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  useEffect(() => {
    if (m) {
      setDraft(structuredClone(m));
      setDirty(false);
    }
  }, [m]);
  const patch = (p: Partial<MeetingDetail>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
  };
  const save = useMutation({
    mutationFn: async () => {
      const d = draft!;
      await api.patch(`/api/meetings/${id}`, {
        location: d.location,
        chair_id: d.chair_id || null,
        video_link: d.video_link,
        convened_by: d.convened_by,
        facilitator: d.facilitator,
        timekeeper: d.timekeeper,
        start_time: d.start_time || null,
        end_time: d.end_time || null,
        previous_summary: d.previous_summary,
        summary: d.summary,
        next_date: d.next_date || null,
        next_time: d.next_time || null,
        next_location: d.next_location,
        next_topics: d.next_topics,
      });
      return api.put<MeetingDetail>(`/api/meetings/${id}/content`, {
        agenda: d.agenda.map((i) => ({
          ...(i.id ? { id: i.id } : {}),
          subject: i.subject,
          speakers: i.speakers,
          notes: i.notes,
          domain_id: i.domain_id || null,
          actions: i.actions.map((a) => ({
            ...(a.id ? { id: a.id } : {}),
            text: a.text,
            responsible_id: a.responsible_id,
            responsible_name: a.responsible_name,
            due_on: a.due_on || null,
            status: a.status,
          })),
          decisions: i.decisions.map((dd) => ({
            ...(dd.id ? { id: dd.id } : {}),
            text: dd.text,
            owner_id: dd.owner_id,
            due_on: dd.due_on || null,
          })),
        })),
        attendees: d.attendees.map((a) => ({ ...a })),
      });
    },
    onSuccess: (r) => {
      setEditing(false);
      qc.setQueryData(["meeting", id], r);
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Compte rendu enregistré");
    },
    onError: fail,
  });
  const validate = useMutation({
    mutationFn: () => api.post<MeetingDetail>(`/api/meetings/${id}/validate`),
    onSuccess: (r) => {
      setJustValidated(true);
      qc.setQueryData(["meeting", id], r);
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: fail,
  });
  const reopen = useMutation({
    mutationFn: () => api.post<MeetingDetail>(`/api/meetings/${id}/reopen`, { reason: reopenReason }),
    onSuccess: (r) => {
      setJustValidated(false);
      setReopening(false);
      setReopenReason("");
      qc.setQueryData(["meeting", id], r);
      toast.success("Compte rendu rouvert : le motif est inscrit au journal");
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/meetings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      nav("/reunions");
    },
    onError: fail,
  });
  const refresh = (r: MeetingDetail) => {
    qc.setQueryData(["meeting", id], r);
    qc.invalidateQueries({ queryKey: ["meetings"] });
  };
  // Circuit officiel : le rédacteur soumet, la présidence retourne ou valide (docs/PARCOURS-METIER.md, lot P2)
  const submit = useMutation({
    mutationFn: () => api.post<MeetingDetail>(`/api/meetings/${id}/submit`),
    onSuccess: (r) => {
      refresh(r);
      toast.success(r.chair_name ? `Soumis à ${r.chair_name} pour validation` : "Soumis pour validation");
    },
    onError: fail,
  });
  const giveBack = useMutation({
    mutationFn: (comment: string) => api.post<MeetingDetail>(`/api/meetings/${id}/return`, { comment }),
    onSuccess: (r) => {
      refresh(r);
      setReturning(false);
      toast.success("Compte rendu retourné au rédacteur");
    },
    onError: fail,
  });
  const convene = useMutation({
    mutationFn: (short_notice: boolean) => api.post<MeetingDetail>(`/api/meetings/${id}/convene`, { short_notice }),
    onSuccess: (r) => {
      refresh(r);
      setUrgent(false);
      toast.success("Convocation envoyée aux convoqués");
    },
    onError: (e) => {
      if ((e as Error).message.includes("48")) setUrgent(true);
      else fail(e);
    },
  });
  const respond = useMutation({
    mutationFn: (v: { response: "accepted" | "declined" | "delegated"; delegate_name?: string }) =>
      api.post<MeetingDetail>(`/api/meetings/${id}/respond`, v),
    onSuccess: (r) => {
      refresh(r);
      setDelegating(false);
      toast.success("Réponse enregistrée");
    },
    onError: fail,
  });
  const setInvitees = useMutation({
    mutationFn: (invitees: { user_id?: string | null; name?: string; unit_id?: string }[]) =>
      api.put<MeetingDetail>(`/api/meetings/${id}/invitees`, { invitees }),
    onSuccess: refresh,
    onError: fail,
  });
  const [returning, setReturning] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [returnText, setReturnText] = useState("");
  const [delegateName, setDelegateName] = useState("");
  if (isLoading || (!draft && !error)) return <LoadingRows rows={8} />;
  if (error || !draft)
    return (
      <Empty title="Réunion inaccessible">
        {(error as Error)?.message ?? "Cette réunion n'existe pas ou vous n'y avez pas accès."}
      </Empty>
    );
  const ro = !editing || !draft.can.edit;
  const people = users?.filter((u) => !u.is_ai) ?? [];
  const myInvite = draft.attendees.find((a) => a.invited && a.user_id === me?.id);
  const invited = draft.attendees.filter((a) => a.invited);
  /** La liste des convoqués se modifie d'un geste : on renvoie la liste entière, le serveur garde les réponses. */
  const sendInvitees = (list: Attendee[], extra?: { user_id?: string; name?: string; unit_id?: string }) =>
    setInvitees.mutate([
      ...list.map((a) => (a.user_id ? { user_id: a.user_id } : { name: a.name })),
      ...(extra ? [extra] : []),
    ]);
  const setItem = (i: number, p: Partial<AgendaItem>) =>
    patch({ agenda: draft.agenda.map((x, n) => (n === i ? { ...x, ...p } : x)) });
  const setAction = (i: number, j: number, p: Partial<MeetingAction>) =>
    setItem(i, { actions: draft.agenda[i].actions.map((x, n) => (n === j ? { ...x, ...p } : x)) });
  const setDecision = (i: number, j: number, p: Partial<MeetingDecision>) =>
    setItem(i, { decisions: draft.agenda[i].decisions.map((x, n) => (n === j ? { ...x, ...p } : x)) });

  return (
    <div className="min-h-full pb-10">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link to="/reunions" aria-label="Retour aux réunions" className="text-muted hover:text-fg">
              <ArrowLeft className="size-5" />
            </Link>
            {draft.meeting_type}
            {justValidated ? <Stamp>Validé</Stamp> : <Status {...MEETING[draft.status]} />}
          </span>
        }
        subtitle={<span className="font-mono text-[12.5px]">N° {draft.reference}</span>}
        actions={
          <>
            <ExportMenu formats={DOCUMENT_FORMATS} href={(f) => `/api/meetings/${id}/report?format=${f}`} />
            {!editing && draft.can.edit && draft.status !== "validated" && (
              <IconButton label="Supprimer la réunion" onClick={() => setRemoving(true)}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
            {!editing && draft.can.declare_not_held && (
              <Button onClick={() => setNotHeld(true)}>Déclarer non tenue</Button>
            )}
            {notHeld && (
              <NotHeldDialog
                id={id as string}
                onClose={() => setNotHeld(false)}
                onDone={(r) => {
                  qc.setQueryData(["meeting", id], r);
                  qc.invalidateQueries({ queryKey: ["meetings"] });
                  setNotHeld(false);
                }}
              />
            )}
            {!editing && draft.status === "validated" && draft.can.reopen && (
              <Button icon={<RotateCcw className="size-4" />} onClick={() => setReopening(true)}>
                Rouvrir
              </Button>
            )}
            {reopening && (
              <Dialog
                open
                onOpenChange={() => setReopening(false)}
                title="Rouvrir le compte rendu validé"
                description="Un compte rendu validé est figé. Le rouvrir est inscrit au journal avec son motif, et la personne qui l'a validé en est prévenue."
                width={480}
                footer={
                  <>
                    <Button onClick={() => setReopening(false)}>Annuler</Button>
                    <Button
                      variant="primary"
                      disabled={!reopenReason.trim()}
                      loading={reopen.isPending}
                      onClick={() => reopen.mutate()}
                    >
                      Rouvrir
                    </Button>
                  </>
                }
              >
                <Field label="Motif de la réouverture" required>
                  {(a) => <Textarea {...a} value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />}
                </Field>
              </Dialog>
            )}
            {!editing && draft.can.submit && (
              <Button
                icon={<Send className="size-4" />}
                disabled={dirty}
                title={dirty ? "Enregistrez d'abord vos modifications" : undefined}
                loading={submit.isPending}
                onClick={() => submit.mutate()}
              >
                Soumettre pour validation
              </Button>
            )}
            {!editing && draft.can.decide && (
              <Button icon={<CornerUpLeft className="size-4" />} onClick={() => setReturning(true)}>
                Retourner
              </Button>
            )}
            {!editing && draft.can.decide && (
              <Button
                variant="primary"
                icon={<ShieldCheck className="size-4" />}
                loading={validate.isPending}
                onClick={() => validate.mutate()}
              >
                Valider
              </Button>
            )}
            {!editing && draft.can.edit && (
              <Button icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                Modifier le compte rendu
              </Button>
            )}
            {editing && (
              <Button
                icon={<X className="size-4" />}
                onClick={() => {
                  if (m) setDraft(structuredClone(m));
                  setDirty(false);
                  setEditing(false);
                }}
              >
                Annuler
              </Button>
            )}
            {editing && (
              <Button
                variant="primary"
                icon={<Save className="size-4" />}
                disabled={
                  !dirty ||
                  draft.agenda.some(
                    (i) =>
                      !i.subject.trim() ||
                      i.actions.some((a) => !a.text.trim()) ||
                      i.decisions.some((dd) => !dd.text.trim()),
                  )
                }
                loading={save.isPending}
                onClick={() => save.mutate()}
              >
                Enregistrer
              </Button>
            )}
          </>
        }
      />
      {/* En lecture, la fiche se lit à la verticale, dans une colonne de la largeur d'un document */}
      <div className={cn("mx-auto space-y-4 p-4 sm:px-8 sm:py-6", editing ? "max-w-[1480px]" : "max-w-[860px]")}>
        {draft.return_comment && draft.status !== "validated" && draft.status !== "submitted" && (
          <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px]">
            <CornerUpLeft className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>
              <b className="font-semibold">Retourné par la présidence :</b> {draft.return_comment}
            </span>
          </p>
        )}
        {draft.can.respond && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-brand-soft/60 px-4 py-3">
            <p className="min-w-0 flex-1 text-[13.5px]">
              <b className="font-semibold">Vous êtes convoqué·e à cette séance.</b>{" "}
              {myInvite?.response && myInvite.response !== "pending" ? (
                <span className="text-muted">
                  Votre réponse : {RESPONSE[myInvite.response].label.toLowerCase()}
                  {myInvite.response === "delegated" && myInvite.delegate_name ? ` (${myInvite.delegate_name})` : ""}.
                  Vous pouvez la changer jusqu'au jour de la séance.
                </span>
              ) : (
                <span className="text-muted">Indiquez votre réponse au secrétariat.</span>
              )}
            </p>
            <span className="flex flex-wrap gap-2">
              <Button size="sm" loading={respond.isPending} onClick={() => respond.mutate({ response: "accepted" })}>
                Présent
              </Button>
              <Button size="sm" loading={respond.isPending} onClick={() => respond.mutate({ response: "declined" })}>
                Excusé
              </Button>
              <Button size="sm" onClick={() => setDelegating(true)}>
                Représenté par…
              </Button>
            </span>
          </div>
        )}
        {!editing && <MeetingReading m={draft} />}
        {editing && (
          <Section title="Informations générales">
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Date">{(a) => <Input {...a} disabled value={frDate(draft.meeting_date)} />}</Field>
              <Field label="Heure de début">
                {(a) => (
                  <Input
                    {...a}
                    disabled={ro}
                    type="time"
                    value={draft.start_time ?? ""}
                    onChange={(e) => patch({ start_time: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Heure de fin">
                {(a) => (
                  <Input
                    {...a}
                    disabled={ro}
                    type="time"
                    value={draft.end_time ?? ""}
                    onChange={(e) => patch({ end_time: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Lieu">
                {(a) => (
                  <Input
                    {...a}
                    disabled={ro}
                    value={draft.location}
                    onChange={(e) => patch({ location: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Convoquée par">
                {(a) => (
                  <Input
                    {...a}
                    disabled={ro}
                    value={draft.convened_by}
                    onChange={(e) => patch({ convened_by: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Animateur">
                {(a) => (
                  <Input
                    {...a}
                    disabled={ro}
                    value={draft.facilitator}
                    onChange={(e) => patch({ facilitator: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Rédacteur">{(a) => <Input {...a} disabled value={draft.writer_name} />}</Field>
              <Field label="Maître du temps">
                {(a) => (
                  <Input
                    {...a}
                    disabled={ro}
                    value={draft.timekeeper}
                    onChange={(e) => patch({ timekeeper: e.target.value })}
                  />
                )}
              </Field>
            </div>
          </Section>
        )}
        <Section
          title="Convocation"
          aside={
            draft.can.convene &&
            !!invited.length && (
              <Button
                size="sm"
                icon={<Megaphone className="size-3.5" />}
                loading={convene.isPending}
                onClick={() => convene.mutate(false)}
              >
                {draft.convened_at ? "Nouvelle convocation" : "Envoyer la convocation"}
              </Button>
            )
          }
        >
          <div className="space-y-3 p-4">
            {/* Consulter d'abord : les champs ne s'ouvrent qu'avec « Modifier » (I-23) */}
            {editing && !ro ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Présidence de séance" hint="C'est elle qui valide le compte rendu.">
                  {(a) => (
                    <PeopleSelect
                      {...a}
                      people={users}
                      placeholder="Non désignée"
                      value={draft.chair_id ?? ""}
                      onChange={(v) => patch({ chair_id: v || null })}
                    />
                  )}
                </Field>
                <Field label="Lien de visioconférence">
                  {(a) => (
                    <Input
                      {...a}
                      placeholder="https://…"
                      value={draft.video_link}
                      onChange={(e) => patch({ video_link: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            ) : (
              <Facts className="p-0">
                <Fact label="Présidence de séance">{users?.find((u) => u.id === draft.chair_id)?.name ?? null}</Fact>
                <Fact label="Lien de visioconférence">{draft.video_link || null}</Fact>
              </Facts>
            )}
            {(draft.dossier || draft.video_link || draft.convened_at || !!draft.partners?.length) && (
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
                {draft.dossier && (
                  <Link to={draft.dossier.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <FolderOpen className="size-3.5" />
                    Dossier : {draft.dossier.label}
                  </Link>
                )}
                {draft.partners?.map((p) => (
                  <Link key={p.id} to={`/partenaires/${p.id}`} className="text-primary hover:underline">
                    Partenaire : {p.acronym || p.name}
                  </Link>
                ))}
                {draft.video_link && (
                  <a href={draft.video_link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Rejoindre la visioconférence
                  </a>
                )}
                {draft.convened_at && (
                  <span>
                    Convocation envoyée le {frDate(draft.convened_at.slice(0, 10))} ; une nouvelle convocation remet les
                    réponses à zéro.
                  </span>
                )}
              </p>
            )}
            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold">Convoqués · {invited.length}</p>
              {!invited.length && (
                <p className="text-[13px] text-muted">
                  Personne n'est convoqué : ajoutez des personnes ou une entité entière, puis envoyez la convocation.
                </p>
              )}
              <ul className="space-y-1">
                {invited.map((a) => (
                  <li key={a.id ?? a.name} className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">
                      {a.name}
                      {a.function_label && <span className="text-muted"> · {a.function_label}</span>}
                    </span>
                    {draft.convened_at && a.response && (
                      <Status
                        label={
                          a.response === "delegated" && a.delegate_name
                            ? `Représenté par ${a.delegate_name}`
                            : RESPONSE[a.response].label
                        }
                        tone={RESPONSE[a.response].tone}
                      />
                    )}
                    {!ro && (
                      <IconButton
                        label={`Retirer ${a.name} des convoqués`}
                        size="sm"
                        onClick={() => sendInvitees(invited.filter((x) => x !== a))}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
              {!ro && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Select
                    aria-label="Convoquer une personne"
                    value=""
                    onChange={(e) => e.target.value && sendInvitees(invited, { user_id: e.target.value })}
                  >
                    <option value="">Convoquer une personne…</option>
                    {people.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Convoquer une entité entière"
                    value=""
                    onChange={(e) => e.target.value && sendInvitees(invited, { unit_id: e.target.value })}
                  >
                    <option value="">Convoquer une entité entière…</option>
                    {units?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </div>
        </Section>
        {editing && (
          <>
            <MeetingDocuments draft={draft} readOnly={ro} onChanged={refresh} />

            <Section
              title="Participants"
              aside={
                !ro && (
                  <Button
                    size="sm"
                    icon={<Plus className="size-3.5" />}
                    onClick={() =>
                      patch({
                        attendees: [
                          ...draft.attendees,
                          { user_id: null, name: "", function_label: "", presence: "present" },
                        ],
                      })
                    }
                  >
                    Ajouter
                  </Button>
                )
              }
            >
              <div className="space-y-2 p-4">
                {!draft.attendees.length && <p className="text-[13px] text-muted">Aucun participant renseigné.</p>}
                {draft.attendees.map((p, i) => {
                  const up = (x: Partial<Attendee>) =>
                    patch({ attendees: draft.attendees.map((y, n) => (n === i ? { ...y, ...x } : y)) });
                  return (
                    <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_140px_32px]">
                      <Select
                        aria-label="Personne"
                        disabled={ro}
                        value={p.user_id ?? ""}
                        onChange={(e) => {
                          const u = people.find((x) => x.id === e.target.value);
                          up({
                            user_id: u?.id ?? null,
                            name: u?.name ?? p.name,
                            function_label: u?.title ?? p.function_label,
                          });
                        }}
                      >
                        <option value="">Personne extérieure…</option>
                        {people.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </Select>
                      <Input
                        aria-label="Nom"
                        placeholder="Nom"
                        disabled={ro || !!p.user_id}
                        value={p.name}
                        onChange={(e) => up({ name: e.target.value })}
                      />
                      <Select
                        aria-label="Présence"
                        disabled={ro}
                        value={p.presence}
                        onChange={(e) => up({ presence: e.target.value })}
                      >
                        {Object.entries(PRESENCE).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </Select>
                      {!ro && (
                        <IconButton
                          label="Retirer"
                          onClick={() => patch({ attendees: draft.attendees.filter((_, n) => n !== i) })}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section
              title="Précédente réunion"
              aside={
                draft.previous && (
                  <Link
                    className="text-[12.5px] font-semibold text-primary hover:underline"
                    to={`/reunions/${draft.previous.id}`}
                  >
                    {draft.previous.reference}
                  </Link>
                )
              }
            >
              <div className="space-y-3 p-4">
                <Field label="Synthèse des points abordés">
                  {(a) => (
                    <Textarea
                      {...a}
                      disabled={ro}
                      value={draft.previous_summary}
                      onChange={(e) => patch({ previous_summary: e.target.value })}
                    />
                  )}
                </Field>
                {!!draft.carried.length && (
                  <div>
                    <p className="mb-1 text-[12.5px] font-semibold">Recommandations restant ouvertes</p>
                    <ul className="space-y-1 text-[13px]">
                      {draft.carried.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center gap-2">
                          <Status {...ACTION[a.status]} />
                          <span>{a.text}</span>
                          <span className="text-muted">
                            {a.responsible_name} · {frDate(a.due_on)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Ordre du jour et prise de note</h2>
                {!ro && (
                  <Button
                    size="sm"
                    icon={<Plus className="size-3.5" />}
                    onClick={() =>
                      patch({
                        agenda: [...draft.agenda, { subject: "", speakers: "", notes: "", actions: [], decisions: [] }],
                      })
                    }
                  >
                    Ajouter un point
                  </Button>
                )}
              </div>
              {!draft.agenda.length && (
                <Section>
                  <Empty icon={<CalendarDays className="size-6" />} title="Ordre du jour vide">
                    Ajoutez au moins un point pour pouvoir valider le compte rendu.
                  </Empty>
                </Section>
              )}
              {draft.agenda.map((item, i) => (
                <Section
                  key={item.id ?? `n${i}`}
                  title={`Point ${i + 1}`}
                  aside={
                    !ro && (
                      <IconButton
                        label="Retirer ce point"
                        size="sm"
                        onClick={() => patch({ agenda: draft.agenda.filter((_, n) => n !== i) })}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    )
                  }
                >
                  <div className="space-y-3 p-4">
                    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                      <Field label="Sujet à aborder" required>
                        {(a) => (
                          <Input
                            {...a}
                            disabled={ro}
                            value={item.subject}
                            onChange={(e) => setItem(i, { subject: e.target.value })}
                          />
                        )}
                      </Field>
                      <Field label="Intervenants">
                        {(a) => (
                          <Input
                            {...a}
                            disabled={ro}
                            value={item.speakers}
                            onChange={(e) => setItem(i, { speakers: e.target.value })}
                          />
                        )}
                      </Field>
                      <Field label="Domaine d'activité">
                        {(a) => (
                          <DomainSelect
                            {...a}
                            disabled={ro}
                            value={item.domain_id}
                            onChange={(v) => setItem(i, { domain_id: v || null })}
                          />
                        )}
                      </Field>
                    </div>
                    <Field label="Prise de note" hint="**texte** pour le gras, « - » en début de ligne pour une puce.">
                      {(a) => (
                        <Textarea
                          {...a}
                          disabled={ro}
                          rows={5}
                          value={item.notes}
                          onChange={(e) => setItem(i, { notes: e.target.value })}
                        />
                      )}
                    </Field>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[12.5px] font-semibold">Recommandations</p>
                        {!ro && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Plus className="size-3.5" />}
                            onClick={() =>
                              setItem(i, {
                                actions: [
                                  ...item.actions,
                                  {
                                    text: "",
                                    responsible_id: null,
                                    responsible_name: "",
                                    due_on: null,
                                    status: "a_faire",
                                  },
                                ],
                              })
                            }
                          >
                            Ajouter
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {item.actions.map((a, j) => (
                          <div
                            key={a.id ?? `n${j}`}
                            className="grid items-center gap-2 lg:grid-cols-[1fr_190px_150px_32px]"
                          >
                            <Input
                              aria-label="Recommandation"
                              placeholder="Recommandation"
                              disabled={ro}
                              value={a.text}
                              onChange={(e) => setAction(i, j, { text: e.target.value })}
                            />
                            <Select
                              aria-label="Responsable"
                              disabled={ro}
                              value={a.responsible_id ?? ""}
                              onChange={(e) =>
                                setAction(i, j, {
                                  responsible_id: e.target.value || null,
                                  responsible_name: people.find((u) => u.id === e.target.value)?.name ?? "",
                                })
                              }
                            >
                              <option value="">Responsable…</option>
                              {people.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </Select>
                            <Input
                              aria-label="Échéance"
                              type="date"
                              disabled={ro}
                              value={a.due_on ?? ""}
                              onChange={(e) => setAction(i, j, { due_on: e.target.value || null })}
                            />
                            {!ro && !a.published && (
                              <IconButton
                                label="Retirer"
                                onClick={() => setItem(i, { actions: item.actions.filter((_, n) => n !== j) })}
                              >
                                <Trash2 className="size-4" />
                              </IconButton>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[12.5px] font-semibold">Décisions de la séance</p>
                        {!ro && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<Plus className="size-3.5" />}
                            onClick={() =>
                              setItem(i, { decisions: [...item.decisions, { text: "", owner_id: null, due_on: null }] })
                            }
                          >
                            Ajouter
                          </Button>
                        )}
                      </div>
                      {!item.decisions.length && (
                        <p className="text-[12px] text-muted">
                          Ce que la présidence tranche en séance : chaque décision sera inscrite au registre des
                          décisions à la validation du compte rendu.
                        </p>
                      )}
                      <div className="space-y-2">
                        {item.decisions.map((dd, j) =>
                          dd.decision_reference ? (
                            <div
                              key={dd.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-hover/40 px-2.5 py-2 text-[13px]"
                            >
                              <Seal>{dd.decision_reference}</Seal>
                              <span className="min-w-0 flex-1">{dd.text}</span>
                              {dd.owner_name && <span className="text-muted">{dd.owner_name}</span>}
                              {dd.due_on && <span className="tabular text-muted">{frDate(dd.due_on)}</span>}
                            </div>
                          ) : (
                            <div
                              key={dd.id ?? `n${j}`}
                              className="grid items-center gap-2 lg:grid-cols-[1fr_190px_150px_32px]"
                            >
                              <Input
                                aria-label="Décision"
                                placeholder="Décision prise en séance"
                                disabled={ro}
                                value={dd.text}
                                onChange={(e) => setDecision(i, j, { text: e.target.value })}
                              />
                              <Select
                                aria-label="Chargé d'exécution"
                                disabled={ro}
                                value={dd.owner_id ?? ""}
                                onChange={(e) => setDecision(i, j, { owner_id: e.target.value || null })}
                              >
                                <option value="">Chargé d'exécution…</option>
                                {people.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                aria-label="Échéance d'exécution"
                                type="date"
                                disabled={ro}
                                value={dd.due_on ?? ""}
                                onChange={(e) => setDecision(i, j, { due_on: e.target.value || null })}
                              />
                              {!ro && (
                                <IconButton
                                  label="Retirer"
                                  onClick={() => setItem(i, { decisions: item.decisions.filter((_, n) => n !== j) })}
                                >
                                  <Trash2 className="size-4" />
                                </IconButton>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </Section>
              ))}
            </section>

            <Section title="Conclusion">
              <div className="p-4">
                <Field label="Résumé">
                  {(a) => (
                    <Textarea
                      {...a}
                      disabled={ro}
                      rows={4}
                      value={draft.summary}
                      onChange={(e) => patch({ summary: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            </Section>
            <Section title="Prochaine réunion">
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                <Field label="Date">
                  {(a) => (
                    <Input
                      {...a}
                      disabled={ro}
                      type="date"
                      value={draft.next_date ?? ""}
                      onChange={(e) => patch({ next_date: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Heure">
                  {(a) => (
                    <Input
                      {...a}
                      disabled={ro}
                      type="time"
                      value={draft.next_time ?? ""}
                      onChange={(e) => patch({ next_time: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Lieu">
                  {(a) => (
                    <Input
                      {...a}
                      disabled={ro}
                      value={draft.next_location}
                      onChange={(e) => patch({ next_location: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Synthèse des points à aborder" className="sm:col-span-3">
                  {(a) => (
                    <Textarea
                      {...a}
                      disabled={ro}
                      value={draft.next_topics}
                      onChange={(e) => patch({ next_topics: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            </Section>
          </>
        )}
      </div>
      <Dialog
        open={returning}
        onOpenChange={setReturning}
        title="Retourner le compte rendu"
        description="Le rédacteur sera prévenu, corrigera puis soumettra à nouveau."
        width={480}
        footer={
          <>
            <Button onClick={() => setReturning(false)}>Annuler</Button>
            <Button
              variant="primary"
              disabled={!returnText.trim()}
              loading={giveBack.isPending}
              onClick={() => giveBack.mutate(returnText.trim())}
            >
              Retourner au rédacteur
            </Button>
          </>
        }
      >
        <Field label="Ce qui doit être revu" required>
          {(a) => <Textarea {...a} autoFocus value={returnText} onChange={(e) => setReturnText(e.target.value)} />}
        </Field>
      </Dialog>
      <ConfirmDialog
        open={urgent}
        onOpenChange={setUrgent}
        title="Convocation à moins de 48 heures"
        description="La séance est dans moins de 48 heures : confirmez-vous une convocation en urgence ?"
        confirmLabel="Convoquer en urgence"
        onConfirm={() => convene.mutate(true)}
      />
      <Dialog
        open={delegating}
        onOpenChange={setDelegating}
        title="Se faire représenter"
        description="La personne qui vous représentera sera indiquée sur la feuille de présence."
        width={440}
        footer={
          <>
            <Button onClick={() => setDelegating(false)}>Annuler</Button>
            <Button
              variant="primary"
              disabled={!delegateName.trim()}
              loading={respond.isPending}
              onClick={() => respond.mutate({ response: "delegated", delegate_name: delegateName.trim() })}
            >
              Confirmer
            </Button>
          </>
        }
      >
        <Field label="Nom et fonction du représentant" required>
          {(a) => <Input {...a} autoFocus value={delegateName} onChange={(e) => setDelegateName(e.target.value)} />}
        </Field>
      </Dialog>
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="Supprimer cette réunion ?"
        description={`Le compte rendu ${draft.reference} et ses recommandations seront supprimés définitivement.`}
        confirmLabel="Supprimer"
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

/** Pièces de l'ordre du jour : jointes à la réunion, diffusées avec la convocation, figées avec le compte rendu. */
function MeetingDocuments({
  draft,
  readOnly,
  onChanged,
}: {
  draft: MeetingDetail;
  readOnly: boolean;
  onChanged: (r: MeetingDetail) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const reload = async () => onChanged(await api.get<MeetingDetail>(`/api/meetings/${draft.id}`));
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/meetings/${draft.id}/documents?name=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Échec de l'envoi du fichier");
      await reload();
      toast.success("Pièce jointe à l'ordre du jour");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const [preview, setPreview] = useState<{ id: string; filename: string } | null>(null);
  const removeDoc = useMutation({
    mutationFn: (docId: string) => api.del(`/api/meeting-documents/${docId}`),
    onSuccess: reload,
    onError: fail,
  });
  if (!draft.documents.length && readOnly) return null;
  return (
    <Section
      title={`Pièces de l'ordre du jour · ${draft.documents.length}`}
      aside={
        !readOnly && (
          <>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              aria-label="Choisir une pièce à joindre"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <Button
              size="sm"
              icon={<Paperclip className="size-3.5" />}
              loading={busy}
              onClick={() => fileRef.current?.click()}
            >
              Joindre une pièce
            </Button>
          </>
        )
      }
    >
      <div className="p-4">
        {draft.documents.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {draft.documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                <Paperclip className="size-4 shrink-0 text-faint" />
                <a
                  href={`/api/meeting-documents/${d.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {d.filename}
                </a>
                <span className="shrink-0 text-[12px] tabular text-muted">
                  {Math.max(1, Math.round(d.size / 1024))} ko
                </span>
                {d.uploader_name && (
                  <span className="hidden shrink-0 text-[12px] text-muted sm:inline">{d.uploader_name}</span>
                )}
                <IconButton label={`Aperçu de ${d.filename}`} size="sm" onClick={() => setPreview(d)}>
                  <Eye className="size-3.5" />
                </IconButton>
                {!readOnly && (
                  <IconButton label={`Supprimer ${d.filename}`} size="sm" onClick={() => removeDoc.mutate(d.id)}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted">
            Notes et présentations se joignent ici : les convoqués les lisent avant la séance.
          </p>
        )}
        {preview && (
          <PreviewDrawer
            url={`/api/meeting-documents/${preview.id}`}
            name={preview.filename}
            onClose={() => setPreview(null)}
          />
        )}
      </div>
    </Section>
  );
}

/** Le compte rendu en lecture, mis en forme comme le document officiel ; « Modifier le compte rendu » ouvre l'éditeur. */
function MeetingReading({ m }: { m: MeetingDetail }) {
  const present = m.attendees.filter((a) => !a.invited || a.presence);
  return (
    <>
      <Section title="Séance">
        <Facts>
          <Fact label="Date et heure">
            {frDate(m.meeting_date)}
            {m.start_time ? ` · ${m.start_time.slice(0, 5)}${m.end_time ? ` – ${m.end_time.slice(0, 5)}` : ""}` : ""}
          </Fact>
          <Fact label="Lieu">
            {[m.location, m.video_link && !/visio/i.test(m.location ?? "") ? "visioconférence" : ""]
              .filter(Boolean)
              .join(" · ")}
          </Fact>
          <Fact label="Présidence">{m.chair_name}</Fact>
          <Fact label="Convoquée par" optional>
            {m.convened_by}
          </Fact>
          <Fact label="Animation" optional>
            {m.facilitator}
          </Fact>
          <Fact label="Rédaction">{m.writer_name}</Fact>
          <Fact label="Gardien du temps" optional>
            {m.timekeeper}
          </Fact>
          <Fact label="Dossier" optional>
            {m.dossier && (
              <Link to={m.dossier.href} className="text-primary hover:underline">
                {m.dossier.label}
              </Link>
            )}
          </Fact>
        </Facts>
      </Section>
      {/* Avant la séance, la convocation liste déjà les convoqués : pas de seconde liste (écrans sobres) */}
      {m.status !== "planned" && (
        <Section title="Participants">
          {present.length ? (
            <ul className="divide-y divide-line">
              {present.map((a) => (
                <li key={a.id ?? a.name} className="flex flex-wrap items-center gap-x-3 px-5 py-2 text-[13px]">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{a.name}</span>
                    {a.function_label && <span className="text-muted"> · {a.function_label}</span>}
                  </span>
                  <span className="text-muted">
                    {PRESENCE[a.presence as keyof typeof PRESENCE] ?? a.presence}
                    {a.delegate_name ? ` (${a.delegate_name})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-5 text-[13px] text-muted">La feuille de présence n'est pas encore remplie.</p>
          )}
        </Section>
      )}
      {m.previous_summary?.trim() && (
        <Section title="Rappel de la séance précédente">
          <div className="p-5 pt-2">
            <LongText>{m.previous_summary}</LongText>
          </div>
        </Section>
      )}
      <Section title="Ordre du jour et délibérations">
        {m.agenda.length ? (
          <ol className="divide-y divide-line">
            {m.agenda.map((item, i) => (
              <li key={item.id ?? i} className="space-y-3 px-5 py-4">
                <div>
                  <p className="text-[15px] font-semibold">
                    {i + 1}. {item.subject}
                  </p>
                  {item.speakers && <p className="text-[12.5px] text-muted">Rapporteur : {item.speakers}</p>}
                </div>
                {item.notes?.trim() ? (
                  <Markdown text={item.notes} className="text-[13.5px]" />
                ) : (
                  <p className="text-[13px] text-faint">Aucune note pour ce point.</p>
                )}
                {!!item.decisions.length && (
                  <div>
                    <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Décisions</p>
                    <ul className="space-y-1 text-[13px]">
                      {item.decisions.map((d, j) => (
                        <li key={d.id ?? j}>
                          {d.text}
                          <span className="text-muted">
                            {d.owner_name ? ` · ${d.owner_name}` : ""}
                            {d.due_on ? ` · avant le ${frDate(d.due_on)}` : ""}
                            {d.decision_reference ? ` · ${d.decision_reference}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!item.actions.length && (
                  <div>
                    <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Recommandations
                    </p>
                    <ul className="space-y-1 text-[13px]">
                      {item.actions.map((a, j) => (
                        <li key={a.id ?? j} className="flex flex-wrap items-center gap-x-2">
                          <span className="min-w-0 flex-1">
                            {a.text}
                            <span className="text-muted">
                              {a.responsible_name ? ` · ${a.responsible_name}` : ""}
                              {a.due_on ? ` · avant le ${frDate(a.due_on)}` : ""}
                            </span>
                          </span>
                          <Status {...ACTION[a.status]} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-5 pb-5 text-[13px] text-muted">L'ordre du jour n'est pas encore établi.</p>
        )}
      </Section>
      {m.summary?.trim() && (
        <Section title="Conclusion">
          <div className="p-5 pt-2">
            <Markdown text={m.summary} className="text-[13.5px]" />
          </div>
        </Section>
      )}
      {(m.next_date || m.next_topics?.trim()) && (
        <Section title="Prochaine réunion">
          <Facts>
            <Fact label="Date">
              {m.next_date && `${frDate(m.next_date)}${m.next_time ? ` · ${m.next_time.slice(0, 5)}` : ""}`}
            </Fact>
            <Fact label="Lieu">{m.next_location}</Fact>
            <Fact label="Sujets prévus" wide>
              {m.next_topics && <LongText>{m.next_topics}</LongText>}
            </Fact>
          </Facts>
        </Section>
      )}
    </>
  );
}

/** Une séance passée qui n'a pas eu lieu se déclare non tenue, avec un motif (thème 6, R-6). */
function NotHeldDialog({
  id,
  onClose,
  onDone,
}: {
  id: string;
  onClose: () => void;
  onDone: (r: MeetingDetail) => void;
}) {
  const [reason, setReason] = useState("");
  const save = useMutation({
    mutationFn: () => api.post<MeetingDetail>(`/api/meetings/${id}/not-held`, { reason }),
    onSuccess: (r) => {
      toast.success("Séance déclarée non tenue");
      onDone(r);
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Déclarer la séance non tenue"
      description="La séance est passée sans compte rendu. La déclarer non tenue la retire des comptes rendus à établir ; les convoqués en sont prévenus."
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!reason.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Déclarer non tenue
          </Button>
        </>
      }
    >
      <Field label="Motif" required hint="Exemple : quorum non atteint, séance reportée sans nouvelle date">
        {(a) => <Textarea {...a} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Field>
    </Dialog>
  );
}
