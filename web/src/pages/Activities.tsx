import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, CalendarRange, Lock, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Checkbox, ConfirmDialog, Dialog, Empty, IconButton, ProjectIcon, cn } from "@/components/ui";
import { useShell } from "@/lib/shell";
import type { ProjectSummary } from "@/lib/types";
import {
  DomainSelect,
  Field,
  Input,
  LoadingRows,
  PageHeader,
  ProgressBar,
  Section,
  Select,
  Status,
  Table,
  Tabs,
  Td,
  Textarea,
  Tr,
  frDate,
  isLate,
} from "@/components/gov";
import { api } from "@/lib/api";
import { useCan, useProjects, useUnits, useUsers } from "@/lib/hooks";
import { FORMS, HEALTH } from "./Pilotage";

type Kind = "commission" | "conference" | "rendez_vous" | "interne";
type Health = keyof typeof HEALTH;
interface Activity {
  id: string;
  kind: Kind;
  title: string;
  description: string;
  lead_id: string | null;
  lead_name: string | null;
  unit_id: string | null;
  domain_id: string | null;
  unit_name: string | null;
  start_on: string | null;
  start_time: string | null;
  end_on: string | null;
  location: string;
  counterpart: string;
  mandate: string;
  delegation: string;
  outcome: string;
  decision_needed: string;
  progress: number;
  next_due_on: string | null;
  health: Health;
  confidential: boolean;
  open_followups: number;
}
interface Detail extends Activity {
  followups: { id: string; text: string; responsible_name: string | null; due_on: string | null; done: boolean }[];
  can: { edit: boolean; remove: boolean };
}
const KINDS: Kind[] = ["commission", "conference", "rendez_vous", "interne"];
const fail = (e: unknown) => toast.error((e as Error).message);
const COUNTERPART: Record<Kind, string> = {
  commission: "Institution organisatrice",
  conference: "Organisateur",
  rendez_vous: "Interlocuteur",
  interne: "Bénéficiaire",
};

export function ActivitiesPage() {
  const can = useCan();
  const nav = useNavigate();
  const shell = useShell();
  const [tab, setTab] = useState<Kind | "all" | "projects">("all");
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api.get<Activity[]>("/api/activities"),
  });
  const { data: projects } = useProjects();
  const rows = data?.filter((a) => tab === "all" || a.kind === tab) ?? [];
  // Le portefeuille de la DG : projets et activités au même endroit (docs/ARCHITECTURE-INFORMATION.md)
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={Briefcase}
        crumbs={["Pilotage", "Portefeuille"]}
        title="Portefeuille"
        subtitle="Projets internes et confiés, commissions, conférences, rendez-vous et activités internes, suivis jusqu'à leurs suites."
        actions={
          tab === "projects" ? (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => shell.setNewProject(true)}>
              Nouveau projet
            </Button>
          ) : (
            can("agenda.manage") && (
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Nouvelle activité
              </Button>
            )
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "all" as const, label: "Toutes les activités" },
          { id: "projects" as const, label: "Projets", badge: projects?.length },
          ...KINDS.map((k) => ({ id: k, label: FORMS[k].plural, badge: data?.filter((a) => a.kind === k).length })),
        ]}
      />
      <div className="mx-auto max-w-[1240px] p-4 sm:px-8 sm:py-6">
        {tab === "projects" ? (
          <ProjectsList projects={projects} />
        ) : (
        <Section>
          {isLoading ? (
            <LoadingRows />
          ) : rows.length ? (
            <Table head={["Activité", "Nature", "Responsable", "Date", "État", "Suites ouvertes"]}>
              {rows.map((a) => (
                <Tr key={a.id} onClick={() => nav(`/activites/${a.id}`)}>
                  <Td className="font-medium">
                    {a.title}
                    {a.confidential && (
                      <Lock aria-label="Confidentielle" className="ml-1.5 inline size-3 text-warning" />
                    )}
                  </Td>
                  <Td>{FORMS[a.kind].label}</Td>
                  <Td>{a.lead_name ?? "—"}</Td>
                  <Td className="tabular">{frDate(a.start_on)}</Td>
                  <Td>
                    <Status label={HEALTH[a.health].label} tone={HEALTH[a.health].tone} />
                  </Td>
                  <Td className="tabular">{a.open_followups || "—"}</Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty icon={<CalendarRange className="size-6" />} title="Aucune activité">
              Enregistrez une commission, une conférence, un rendez-vous ou une activité interne.
            </Empty>
          )}
        </Section>
        )}
      </div>
      {creating && (
        <NewActivity
          defaultKind={tab === "all" || tab === "projects" ? "commission" : tab}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

/** Projets du portefeuille : un clic ouvre le tableau de bord du projet. */
function ProjectsList({ projects }: { projects: ProjectSummary[] | undefined }) {
  const nav = useNavigate();
  if (!projects) return <LoadingRows />;
  if (!projects.length)
    return (
      <Section>
        <Empty icon={<Briefcase className="size-6" />} title="Aucun projet">
          Créez un projet interne ou un projet confié à l'Agence avec « Nouveau projet ».
        </Empty>
      </Section>
    );
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Section>
      <Table head={["Projet", "Équipe", "Avancement", "Échéance", "Tâches en retard", "État"]}>
        {projects.map((p) => {
          const pct = p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
          return (
            <Tr key={p.id} onClick={() => nav(`/projects/${p.id}`)}>
              <Td>
                <span className="flex items-center gap-2.5">
                  <ProjectIcon icon={p.icon} color={p.color} size={22} />
                  <span className="font-medium">{p.name}</span>
                </span>
              </Td>
              <Td className="text-muted">{p.team_name ?? "—"}</Td>
              <Td className="min-w-[130px]">
                <span className="flex items-center gap-2">
                  <ProgressBar value={pct} />
                  <span className="w-9 text-right text-[12px] tabular text-muted">{pct}%</span>
                </span>
              </Td>
              <Td className={cn("tabular", isLate(p.due_on, today) && "font-medium text-danger")}>{frDate(p.due_on)}</Td>
              <Td className={cn("tabular", p.overdue_count > 0 && "font-semibold text-danger")}>
                {p.overdue_count || "—"}
              </Td>
              <Td>
                <Status label={HEALTH[p.status].label} tone={HEALTH[p.status].tone} />
              </Td>
            </Tr>
          );
        })}
      </Table>
    </Section>
  );
}

function NewActivity({ defaultKind, onClose }: { defaultKind: Kind; onClose: () => void }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const [f, setF] = useState({
    kind: defaultKind,
    title: "",
    lead_id: "",
    start_on: "",
    start_time: "",
    location: "",
    counterpart: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const create = useMutation({
    mutationFn: () =>
      api.post<Detail>("/api/activities", {
        ...f,
        lead_id: f.lead_id || undefined,
        start_on: f.start_on || null,
        start_time: f.start_time || null,
      }),
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["pilotage"] });
      nav(`/activites/${a.id}`);
    },
    onError: fail,
  });
  return (
    <Dialog
      open
      onOpenChange={onClose}
      title="Nouvelle activité"
      width={560}
      description={f.kind === "rendez_vous" ? "Un rendez-vous reste confidentiel par défaut." : undefined}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={!f.title.trim()}
            onClick={() => create.mutate()}
          >
            Créer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nature" required>
          {(a) => (
            <Select {...a} value={f.kind} onChange={set("kind")}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {FORMS[k].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Responsable">
          {(a) => (
            <Select {...a} value={f.lead_id} onChange={set("lead_id")}>
              <option value="">Moi-même</option>
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
        <Field label="Intitulé" required className="sm:col-span-2">
          {(a) => <Input {...a} autoFocus value={f.title} onChange={set("title")} />}
        </Field>
        <Field label="Date">{(a) => <Input {...a} type="date" value={f.start_on} onChange={set("start_on")} />}</Field>
        <Field label="Heure">
          {(a) => <Input {...a} type="time" value={f.start_time} onChange={set("start_time")} />}
        </Field>
        <Field label="Lieu">{(a) => <Input {...a} value={f.location} onChange={set("location")} />}</Field>
        <Field label={COUNTERPART[f.kind]}>
          {(a) => <Input {...a} value={f.counterpart} onChange={set("counterpart")} />}
        </Field>
      </div>
    </Dialog>
  );
}

export function ActivityPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const {
    data: a,
    isLoading,
    error,
  } = useQuery({ queryKey: ["activity", id], queryFn: () => api.get<Detail>(`/api/activities/${id}`) });
  const [d, setD] = useState<Detail | null>(null);
  const [dirty, setDirty] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [note, setNote] = useState({ text: "", responsible_id: "", due_on: "" });
  useEffect(() => {
    if (a) {
      setD(a);
      setDirty(false);
    }
  }, [a]);
  const refresh = (r: Detail) => {
    qc.setQueryData(["activity", id], r);
    qc.invalidateQueries({ queryKey: ["activities"] });
    qc.invalidateQueries({ queryKey: ["pilotage"] });
  };
  const save = useMutation({
    mutationFn: () =>
      api.patch<Detail>(`/api/activities/${id}`, {
        title: d!.title,
        description: d!.description,
        lead_id: d!.lead_id,
        unit_id: d!.unit_id,
        domain_id: d!.domain_id,
        start_on: d!.start_on || null,
        start_time: d!.start_time || null,
        end_on: d!.end_on || null,
        location: d!.location,
        counterpart: d!.counterpart,
        mandate: d!.mandate,
        delegation: d!.delegation,
        outcome: d!.outcome,
        decision_needed: d!.decision_needed,
        progress: d!.progress,
        next_due_on: d!.next_due_on || null,
        health: d!.health,
        confidential: d!.confidential,
      }),
    onSuccess: (r) => {
      refresh(r);
      toast.success("Activité enregistrée");
    },
    onError: fail,
  });
  const addNote = useMutation({
    mutationFn: () =>
      api.post<Detail>(`/api/activities/${id}/followups`, {
        text: note.text,
        responsible_id: note.responsible_id || null,
        due_on: note.due_on || null,
      }),
    onSuccess: (r) => {
      refresh(r);
      setNote({ text: "", responsible_id: "", due_on: "" });
    },
    onError: fail,
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; done: boolean }) =>
      api.patch<Detail>(`/api/activity-followups/${v.id}`, { done: v.done }),
    onSuccess: refresh,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/activities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["pilotage"] });
      nav("/activites");
    },
    onError: fail,
  });
  if (isLoading || (!d && !error)) return <LoadingRows rows={8} />;
  if (error || !d) return <Empty title="Activité inaccessible">{(error as Error)?.message}</Empty>;
  const ro = !d.can.edit;
  const patch = (p: Partial<Detail>) => {
    setD({ ...d, ...p });
    setDirty(true);
  };
  const text = (k: "title" | "location" | "counterpart" | "delegation" | "decision_needed") => ({
    disabled: ro,
    value: d[k],
    onChange: (e: { target: { value: string } }) => patch({ [k]: e.target.value }),
  });
  const area = (k: "description" | "mandate" | "outcome") => ({
    disabled: ro,
    value: d[k],
    onChange: (e: { target: { value: string } }) => patch({ [k]: e.target.value }),
  });
  const people = users?.filter((u) => !u.is_ai) ?? [];
  return (
    <div className="min-h-full pb-10">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link to="/activites" aria-label="Retour au portefeuille" className="text-muted hover:text-fg">
              <ArrowLeft className="size-5" />
            </Link>
            {d.title}
          </span>
        }
        subtitle={FORMS[d.kind].label}
        actions={
          <>
            <Status label={HEALTH[d.health].label} tone={HEALTH[d.health].tone} />
            {d.can.remove && (
              <IconButton label="Supprimer" onClick={() => setRemoving(true)}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
            {!ro && (
              <Button
                variant="primary"
                icon={<Save className="size-4" />}
                disabled={!dirty || !d.title.trim()}
                loading={save.isPending}
                onClick={() => save.mutate()}
              >
                Enregistrer
              </Button>
            )}
          </>
        }
      />
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-4 p-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Section title="Fiche">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <Field label="Intitulé" required className="sm:col-span-2">
                {(a) => <Input {...a} {...text("title")} />}
              </Field>
              <Field label="Responsable">
                {(a) => (
                  <Select
                    {...a}
                    disabled={ro || !d.can.remove}
                    title={!d.can.remove ? "Seul un gestionnaire confie l'activité à une autre personne" : undefined}
                    value={d.lead_id ?? ""}
                    onChange={(e) => patch({ lead_id: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {people.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Domaine d'activité">
                {(a) => (
                  <DomainSelect
                    {...a}
                    disabled={ro}
                    value={d.domain_id}
                    onChange={(v) => patch({ domain_id: v || null })}
                  />
                )}
              </Field>
              <Field label="Entité">
                {(a) => (
                  <Select
                    {...a}
                    disabled={ro}
                    value={d.unit_id ?? ""}
                    onChange={(e) => patch({ unit_id: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {units?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Date">
                {(a) => (
                  <Input
                    {...a}
                    disabled={ro}
                    type="date"
                    value={d.start_on ?? ""}
                    onChange={(e) => patch({ start_on: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Heure">
                {(a) => (
                  <Input
                    {...a}
                    disabled={ro}
                    type="time"
                    value={d.start_time ?? ""}
                    onChange={(e) => patch({ start_time: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Lieu">{(a) => <Input {...a} {...text("location")} />}</Field>
              <Field label={COUNTERPART[d.kind]}>{(a) => <Input {...a} {...text("counterpart")} />}</Field>
              {d.kind === "commission" && (
                <Field label="Mandat de l'Agence" className="sm:col-span-2" hint="La position que l'Agence y défend.">
                  {(a) => <Textarea {...a} {...area("mandate")} />}
                </Field>
              )}
              {d.kind === "conference" && (
                <Field label="Délégation" className="sm:col-span-2">
                  {(a) => <Input {...a} {...text("delegation")} />}
                </Field>
              )}
              <Field label="Objet" className="sm:col-span-2">
                {(a) => <Textarea {...a} {...area("description")} />}
              </Field>
              <Field label={d.kind === "conference" ? "Retombées" : "Résultat"} className="sm:col-span-2">
                {(a) => <Textarea {...a} {...area("outcome")} />}
              </Field>
            </div>
          </Section>
        </div>
        <div className="space-y-4">
          <Section title="Pilotage">
            <div className="space-y-3 p-4">
              <Field label="État">
                {(a) => (
                  <Select
                    {...a}
                    disabled={ro}
                    value={d.health}
                    onChange={(e) => patch({ health: e.target.value as Health })}
                  >
                    {(Object.keys(HEALTH) as Health[]).map((h) => (
                      <option key={h} value={h}>
                        {HEALTH[h].label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {d.kind === "interne" && (
                <Field label={`Avancement : ${d.progress} %`}>
                  {(a) => (
                    <input
                      {...a}
                      disabled={ro}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      className="w-full accent-[var(--primary)]"
                      value={d.progress}
                      onChange={(e) => patch({ progress: Number(e.target.value) })}
                    />
                  )}
                </Field>
              )}
              <Field label="Prochaine échéance">
                {(a) => (
                  <Input
                    {...a}
                    disabled={ro}
                    type="date"
                    value={d.next_due_on ?? ""}
                    onChange={(e) => patch({ next_due_on: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Décision attendue de la DG">{(a) => <Input {...a} {...text("decision_needed")} />}</Field>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  disabled={ro || !d.can.remove}
                  checked={d.confidential}
                  onChange={(e) => patch({ confidential: e.target.checked })}
                />
                Confidentielle
              </label>
            </div>
          </Section>
          <Section title="Suites à donner">
            <div className="space-y-2 p-4">
              {!d.followups.length && <p className="text-[13px] text-muted">Aucune suite enregistrée.</p>}
              <ul className="stagger space-y-2">
                {d.followups.map((f) => (
                  <li key={f.id} className="flex items-start gap-2 text-[13px]">
                    <span className="mt-0.5">
                      <Checkbox
                        checked={f.done}
                        label={f.text}
                        onChange={(v) => toggle.mutate({ id: f.id, done: v })}
                      />
                    </span>
                    <span className={f.done ? "text-faint line-through" : ""}>
                      {f.text}
                      <span className="block text-[12px] text-muted">
                        {f.responsible_name ?? "Sans responsable"} ·{" "}
                        <span className={!f.done && isLate(f.due_on) ? "text-danger" : ""}>{frDate(f.due_on)}</span>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {!ro && (
                <div className="space-y-2 border-t border-line pt-3">
                  <Input
                    aria-label="Nouvelle suite"
                    placeholder="Nouvelle suite à donner"
                    value={note.text}
                    onChange={(e) => setNote({ ...note, text: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      aria-label="Responsable"
                      value={note.responsible_id}
                      onChange={(e) => setNote({ ...note, responsible_id: e.target.value })}
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
                      value={note.due_on}
                      onChange={(e) => setNote({ ...note, due_on: e.target.value })}
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!note.text.trim()}
                    loading={addNote.isPending}
                    onClick={() => addNote.mutate()}
                  >
                    Ajouter
                  </Button>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="Supprimer cette activité ?"
        description={`« ${d.title} » et ses suites seront supprimées définitivement.`}
        confirmLabel="Supprimer"
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
