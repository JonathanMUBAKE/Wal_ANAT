import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Lock,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button, ConfirmDialog, Dialog, Empty, IconButton } from "@/components/ui";
import {
  DomainSelect,
  Field,
  Input,
  LoadingRows,
  PageHeader,
  Section,
  Select,
  Stamp,
  Status,
  Table,
  Tabs,
  Td,
  Textarea,
  Tr,
  frDate,
  isLate,
  type Tone,
} from "@/components/gov";
import { MeetingsOverview } from "@/components/MeetingsOverview";
import { api } from "@/lib/api";
import { useCan, useMe, useUsers } from "@/lib/hooks";

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
}
interface AgendaItem {
  id?: string;
  subject: string;
  speakers: string;
  notes: string;
  domain_id?: string | null;
  actions: MeetingAction[];
}
interface Attendee {
  user_id: string | null;
  name: string;
  function_label: string;
  presence: string;
}
interface MeetingRow {
  id: string;
  reference: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  location: string;
  status: "planned" | "held" | "validated" | "cancelled";
  confidential: boolean;
  open_actions: number;
  action_count: number;
  writer_name: string;
  start_time: string | null;
}
interface MeetingDetail extends MeetingRow {
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
  agenda: AgendaItem[];
  attendees: Attendee[];
  previous: { id: string; reference: string; meeting_date: string } | null;
  carried: MeetingAction[];
  can: { edit: boolean; validate: boolean };
}

const MEETING: Record<MeetingRow["status"], { label: string; tone: Tone }> = {
  planned: { label: "Planifiée", tone: "neutral" },
  held: { label: "Tenue", tone: "info" },
  validated: { label: "Validé", tone: "success" },
  cancelled: { label: "Annulée", tone: "danger" },
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
  const [tab, setTab] = useState<"list" | "actions" | "mine">("list");
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => api.get<MeetingRow[]>("/api/meetings"),
  });
  const nav = useNavigate();
  return (
    <div className="min-h-full">
      <PageHeader
        title="Réunions et comptes rendus"
        subtitle="Chaque réunion produit un compte rendu officiel, et chaque recommandation reste suivie jusqu'à sa clôture."
        actions={
          can("meetings.manage") && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              Nouvelle réunion
            </Button>
          )
        }
      />
      {isLoading ? <LoadingRows /> : <MeetingsOverview rows={data ?? []} />}
      <div className="h-3" />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "list", label: "Comptes rendus" },
          { id: "actions", label: "Toutes les recommandations" },
          { id: "mine", label: "Mes recommandations" },
        ]}
      />
      <div className="mx-auto max-w-[1240px] p-4 sm:px-8 sm:py-6">
        {tab === "list" ? (
          <Section>
            {isLoading ? (
              <LoadingRows />
            ) : !data?.length ? (
              <Empty icon={<FileText className="size-6" />} title="Aucune réunion enregistrée">
                Créez la première réunion pour établir son compte rendu.
              </Empty>
            ) : (
              <Table head={["Référence", "Réunion", "Date", "Rédacteur", "Recommandations ouvertes", "Statut"]}>
                {data.map((m) => (
                  <Tr key={m.id} onClick={() => nav(`/reunions/${m.id}`)}>
                    <Td className="font-mono text-[12px]">{m.reference}</Td>
                    <Td className="font-medium">
                      {m.meeting_type}
                      {m.confidential && (
                        <Lock aria-label="Confidentielle" className="ml-1.5 inline size-3 text-warning" />
                      )}
                    </Td>
                    <Td className="tabular">{frDate(m.meeting_date)}</Td>
                    <Td>{m.writer_name}</Td>
                    <Td className="tabular">
                      {m.open_actions} / {m.action_count}
                    </Td>
                    <Td>
                      <Status {...MEETING[m.status]} />
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Section>
        ) : (
          <ActionsTracker mine={tab === "mine"} />
        )}
      </div>
      {creating && <NewMeeting onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewMeeting({ onClose }: { onClose: () => void }) {
  const { data: me } = useMe();
  const { data: users } = useUsers();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({
    meeting_type: "",
    meeting_date: new Date().toISOString().slice(0, 10),
    start_time: "09:00",
    end_time: "10:00",
    location: "",
    convened_by: "",
    facilitator: "",
    timekeeper: "",
    writer_id: me?.id ?? "",
    confidential: false,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const create = useMutation({
    mutationFn: () => api.post<MeetingDetail>("/api/meetings", f),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      nav(`/reunions/${m.id}`);
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouvelle réunion"
      description="Le numéro officiel est attribué automatiquement. Les réunions de même type se suivent et reprennent la synthèse précédente."
      width={620}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={!f.meeting_type.trim() || !f.meeting_date || !f.writer_id}
            onClick={() => create.mutate()}
          >
            Créer la réunion
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Type de réunion"
          required
          className="sm:col-span-2"
          hint="Exemple : Comité de direction hebdomadaire"
        >
          {(a) => <Input {...a} autoFocus value={f.meeting_type} onChange={set("meeting_type")} />}
        </Field>
        <Field label="Date" required>
          {(a) => <Input {...a} type="date" value={f.meeting_date} onChange={set("meeting_date")} />}
        </Field>
        <Field label="Lieu">{(a) => <Input {...a} value={f.location} onChange={set("location")} />}</Field>
        <Field label="Heure de début">
          {(a) => <Input {...a} type="time" value={f.start_time} onChange={set("start_time")} />}
        </Field>
        <Field label="Heure de fin">
          {(a) => <Input {...a} type="time" value={f.end_time} onChange={set("end_time")} />}
        </Field>
        <Field label="Convoquée par">
          {(a) => <Input {...a} value={f.convened_by} onChange={set("convened_by")} />}
        </Field>
        <Field label="Animateur">{(a) => <Input {...a} value={f.facilitator} onChange={set("facilitator")} />}</Field>
        <Field label="Maître du temps">
          {(a) => <Input {...a} value={f.timekeeper} onChange={set("timekeeper")} />}
        </Field>
        <Field label="Rédacteur" required>
          {(a) => (
            <Select {...a} value={f.writer_id} onChange={set("writer_id")}>
              <option value="">Choisir…</option>
              {users
                ?.filter((u) => !u.is_ai)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
          <input
            type="checkbox"
            checked={f.confidential}
            onChange={(e) => setF({ ...f, confidential: e.target.checked })}
          />
          Réunion confidentielle : visible des seuls participants, du rédacteur et des gestionnaires
        </label>
      </div>
    </Dialog>
  );
}

function ActionsTracker({ mine }: { mine: boolean }) {
  const can = useCan();
  const { data: me } = useMe();
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
              <Td className="max-w-md">{a.text}</Td>
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
  const { data: users } = useUsers();
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
  const [justValidated, setJustValidated] = useState(false);
  const [removing, setRemoving] = useState(false);
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
        })),
        attendees: d.attendees.map((a) => ({ ...a })),
      });
    },
    onSuccess: (r) => {
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
    mutationFn: () => api.post<MeetingDetail>(`/api/meetings/${id}/reopen`),
    onSuccess: (r) => {
      setJustValidated(false);
      qc.setQueryData(["meeting", id], r);
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
  if (isLoading || (!draft && !error)) return <LoadingRows rows={8} />;
  if (error || !draft)
    return (
      <Empty title="Réunion inaccessible">
        {(error as Error)?.message ?? "Cette réunion n'existe pas ou vous n'y avez pas accès."}
      </Empty>
    );
  const ro = !draft.can.edit;
  const people = users?.filter((u) => !u.is_ai) ?? [];
  const setItem = (i: number, p: Partial<AgendaItem>) =>
    patch({ agenda: draft.agenda.map((x, n) => (n === i ? { ...x, ...p } : x)) });
  const setAction = (i: number, j: number, p: Partial<MeetingAction>) =>
    setItem(i, { actions: draft.agenda[i].actions.map((x, n) => (n === j ? { ...x, ...p } : x)) });

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
            <a href={`/api/meetings/${id}/report.docx`} className="contents">
              <Button icon={<Download className="size-4" />}>Export Word</Button>
            </a>
            {!ro && draft.status !== "validated" && (
              <IconButton label="Supprimer la réunion" onClick={() => setRemoving(true)}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
            {draft.status === "validated" && draft.can.validate && (
              <Button
                icon={<RotateCcw className="size-4" />}
                loading={reopen.isPending}
                onClick={() => reopen.mutate()}
              >
                Rouvrir
              </Button>
            )}
            {draft.status !== "validated" && draft.can.validate && (
              <Button
                icon={<ShieldCheck className="size-4" />}
                disabled={dirty}
                title={dirty ? "Enregistrez d'abord vos modifications" : undefined}
                loading={validate.isPending}
                onClick={() => validate.mutate()}
              >
                Valider
              </Button>
            )}
            {!ro && (
              <Button
                variant="primary"
                icon={<Save className="size-4" />}
                disabled={
                  !dirty || draft.agenda.some((i) => !i.subject.trim() || i.actions.some((a) => !a.text.trim()))
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
      <div className="mx-auto max-w-[1040px] space-y-4 p-4 sm:px-8 sm:py-6">
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
                  patch({ agenda: [...draft.agenda, { subject: "", speakers: "", notes: "", actions: [] }] })
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
                              { text: "", responsible_id: null, responsible_name: "", due_on: null, status: "a_faire" },
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
                        {!ro && (
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
      </div>
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
