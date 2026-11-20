import { useOpenFromUrl } from "@/components/quick-entry";
import { todayIso } from "@/lib/format";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, CalendarRange, Lock, Plus, Trash2, GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import { Button, Checkbox, ConfirmDialog, Dialog, Empty, IconButton, ProjectIcon, Tip, cn } from "@/components/ui";
import { useShell } from "@/lib/shell";
import { PartnerSelect } from "@/components/partners";
import { DossierDocuments } from "@/components/documents";
import { Fact, Facts, LongText, RecordActions, RowActions, useRecord } from "@/components/record";
import { RefSelect } from "@/components/refselect";
import type { ProjectSummary } from "@/lib/types";
import {
  DomainSelect,
  Field,
  Input,
  LoadingRows,
  PageHeader,
  PlanActivitySelect,
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
import { useCan, useMe, useProjectHealth, useProjects, useUnits, useUserMap, useUsers } from "@/lib/hooks";
import { ExportMenu, tableDoc } from "@/components/export-menu";
import { type RefValue, useForms, useReferentials } from "@/lib/referentials";
import { HEALTH } from "./Pilotage";
import { ContractsPayments } from "./ProjectDossier";
import { ActivityArbitrations, ArbitrationsBoard, PortfolioReview } from "@/components/portfolio";

/** Code d'un type d'activité du référentiel de l'institution. */
type Kind = string;
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
  counterpart_partner_id: string | null;
  counterpart_partner_name?: string | null;
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
  plan_activity_id: string | null;
  plan_activity_label: string | null;
  can: { edit: boolean; remove: boolean };
}
const fail = (e: unknown) => toast.error((e as Error).message);
/** Libellé du champ interlocuteur : propriété du type, paramétrée par l'administrateur système. */
const counterpartOf = (v: RefValue | undefined) => v?.props.counterpart_label?.trim() || "Interlocuteur";

export function ActivitiesPage() {
  const can = useCan();
  const nav = useNavigate();
  const shell = useShell();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Kind | "all" | "projects" | "contracts" | "revue" | "arbitrages">(
    params.get("onglet") === "arbitrages" ? "arbitrages" : params.get("onglet") === "revue" ? "revue" : "all",
  );
  const steering = can("pilotage.view") || can("decisions.record");
  const [creating, setCreating] = useState(false);
  useOpenFromUrl(() => setCreating(true));
  const [removing, setRemoving] = useState<Activity | null>(null);
  const { data: me } = useMe();
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/activities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["pilotage"] });
      toast.success("Activité supprimée");
    },
    onError: fail,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => api.get<Activity[]>("/api/activities"),
  });
  const { data: projects } = useProjects();
  const { data: refs } = useReferentials();
  const form = useForms();
  // Un onglet par type actif, plus les types archivés qui portent encore des activités
  const types = (refs?.activity_type ?? []).filter((t) => !t.archived || data?.some((a) => a.kind === t.code));
  const firstActive = refs?.activity_type.find((t) => !t.archived)?.code ?? "";
  const rows = data?.filter((a) => tab === "all" || a.kind === tab) ?? [];
  const users = useUserMap();
  const health = useProjectHealth();
  const dossierProjects = tab === "all" ? (projects ?? []) : [];
  // Le portefeuille de la DG : projets et activités au même endroit (docs/ARCHITECTURE-INFORMATION.md)
  return (
    <div className="min-h-full">
      <PageHeader
        Icon={Briefcase}
        crumbs={["Pilotage", "Portefeuille"]}
        title="Portefeuille"
        subtitle="Projets internes et confiés, commissions, conférences, rendez-vous et activités internes, suivis jusqu'à leurs suites."
        actions={
          tab === "contracts" || tab === "revue" || tab === "arbitrages" ? null : (
            <>
              <ExportMenu
                build={() =>
                  tableDoc(
                    tab === "all"
                      ? "Portefeuille · tous les dossiers"
                      : tab === "projects"
                        ? "Portefeuille · projets"
                        : `Portefeuille · ${form(tab).label}`,
                    ["Dossier", "Nature", "Responsable", "Date ou échéance", "État", "Suites ouvertes"],
                    [
                      ...(tab === "all" || tab === "projects" ? (projects ?? []) : []).map((p) => [
                        p.name,
                        "Projet",
                        (p.owner_id && users.get(p.owner_id)?.name) || "",
                        frDate(p.due_on),
                        HEALTH[p.status].label,
                        "",
                      ]),
                      ...(tab === "projects" ? [] : rows).map((a) => [
                        a.title,
                        form(a.kind).label,
                        a.lead_name,
                        frDate(a.start_on),
                        HEALTH[a.health].label,
                        a.open_followups || "",
                      ]),
                    ],
                    { filename: "portefeuille", widths: [5, 2, 3, 2, 2, 1.5] },
                  )
                }
              />
              {tab === "projects" ? (
                can("projects.create") && (
                  <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => shell.setNewProject(true)}>
                    Nouveau projet
                  </Button>
                )
              ) : (
                can("agenda.manage") && (
                  <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                    Nouvelle activité
                  </Button>
                )
              )}
            </>
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ...(steering
            ? [
                { id: "revue" as const, label: "Revue de portefeuille" },
                { id: "arbitrages" as const, label: "Arbitrages" },
              ]
            : []),
          { id: "all" as const, label: "Tous les dossiers" },
          { id: "projects" as const, label: "Projets", badge: projects?.length },
          ...types.map((t) => ({
            id: t.code,
            label: t.plural || t.label,
            badge: data?.filter((a) => a.kind === t.code).length,
          })),
          // Vue transverse du service administratif et financier : les contrats restent rangés dans leurs projets
          // Le cabinet lit les contrats ; le gestionnaire, ceux de son périmètre (F-5)
          ...(can("consultants.manage") || can("pilotage.view")
            ? [{ id: "contracts" as const, label: "Contrats et paiements" }]
            : []),
        ]}
      />
      <div className="mx-auto max-w-[1480px] p-4 sm:px-8 sm:py-6">
        {tab === "revue" ? (
          <PortfolioReview />
        ) : tab === "arbitrages" ? (
          <ArbitrationsBoard />
        ) : tab === "contracts" ? (
          <ContractsPayments />
        ) : tab === "projects" ? (
          <ProjectsList projects={projects} />
        ) : (
          <Section>
            {isLoading ? (
              <LoadingRows />
            ) : rows.length || dossierProjects.length ? (
              <Table head={["Dossier", "Nature", "Responsable", "Date", "État", "Suites ouvertes", ""]}>
                {/* Le portefeuille, ce sont les projets et les activités (I-13) */}
                {dossierProjects.map((p) => (
                  <Tr key={p.id} onClick={() => nav(`/projects/${p.id}/dashboard`)} href={`/projects/${p.id}/dashboard`}>
                    <Td className="font-medium">{p.name}</Td>
                    <Td>Projet</Td>
                    <Td>{(p.owner_id && users.get(p.owner_id)?.name) || "—"}</Td>
                    <Td className="tabular">{frDate(p.due_on)}</Td>
                    <Td>
                      <ComputedHealth p={p} health={health} />
                    </Td>
                    <Td>—</Td>
                    <Td />
                  </Tr>
                ))}
                {rows.map((a) => (
                  <Tr key={a.id} onClick={() => nav(`/activites/${a.id}`)} href={`/activites/${a.id}`}>
                    <Td className="font-medium">
                      {a.title}
                      {a.confidential && (
                        <Lock aria-label="Confidentielle" className="ml-1.5 inline size-3 text-warning" />
                      )}
                    </Td>
                    <Td>{form(a.kind).label}</Td>
                    <Td>{a.lead_name ?? "—"}</Td>
                    <Td className="tabular">{frDate(a.start_on)}</Td>
                    <Td>
                      <Status label={HEALTH[a.health].label} tone={HEALTH[a.health].tone} />
                    </Td>
                    <Td className="tabular">{a.open_followups || "—"}</Td>
                    <Td>
                      <RowActions
                        label={a.title}
                        onView={() => nav(`/activites/${a.id}`)}
                        onEdit={() => nav(`/activites/${a.id}?modifier=1`)}
                        canEdit={can("agenda.manage") || a.lead_id === me?.id}
                        onDelete={() => setRemoving(a)}
                        canDelete={can("agenda.manage")}
                      />
                    </Td>
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
          defaultKind={
            tab !== "all" &&
            tab !== "projects" &&
            tab !== "contracts" &&
            refs?.activity_type.some((t) => t.code === tab && !t.archived)
              ? tab
              : firstActive
          }
          onClose={() => setCreating(false)}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title={`Supprimer « ${removing?.title} » ?`}
        description="L'activité, ses suites et ses documents non officiels sont supprimés. La suppression est tracée."
        confirmLabel="Supprimer"
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </div>
  );
}

/** Projets du portefeuille : un clic ouvre le tableau de bord du projet. */
function ProjectsList({ projects }: { projects: ProjectSummary[] | undefined }) {
  const nav = useNavigate();
  const health = useProjectHealth();
  if (!projects) return <LoadingRows />;
  if (!projects.length)
    return (
      <Section>
        <Empty icon={<Briefcase className="size-6" />} title="Aucun projet">
          Créez un projet interne ou un projet confié à l'Agence avec « Nouveau projet ».
        </Empty>
      </Section>
    );
  const today = todayIso();
  return (
    <Section>
      <Table head={["Projet", "Équipe", "Avancement", "Échéance", "Tâches en retard", "État"]}>
        {projects.map((p) => {
          const pct = p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
          return (
            <Tr key={p.id} onClick={() => nav(`/projects/${p.id}`)} href={`/projects/${p.id}`}>
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
              <Td className={cn("tabular", isLate(p.due_on, today) && "font-medium text-danger")}>
                {frDate(p.due_on)}
              </Td>
              <Td className={cn("tabular", p.overdue_count > 0 && "font-semibold text-danger")}>
                {p.overdue_count || "—"}
              </Td>
              <Td>
                <ComputedHealth p={p} health={health} />
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
  const { data: refs } = useReferentials();
  const [f, setF] = useState({
    kind: defaultKind,
    title: "",
    lead_id: "",
    start_on: "",
    start_time: "",
    location: "",
    counterpart: "",
    counterpart_partner_id: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const choices = refs?.activity_type.filter((t) => !t.archived) ?? [];
  const type = choices.find((t) => t.code === f.kind);
  const create = useMutation({
    mutationFn: () =>
      api.post<Detail>("/api/activities", {
        ...f,
        lead_id: f.lead_id || undefined,
        start_on: f.start_on || null,
        start_time: f.start_time || null,
        counterpart_partner_id: f.counterpart_partner_id || null,
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
      description={
        type?.props.confidential_default ? `Une activité « ${type.label} » est confidentielle par défaut.` : undefined
      }
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            loading={create.isPending}
            disabled={!f.title.trim() || !type}
            onClick={() => create.mutate()}
          >
            Créer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nature" required>
          {(a) => <RefSelect {...a} list="activity_type" value={f.kind} onChange={(kind) => setF({ ...f, kind })} />}
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
        <Field
          label={counterpartOf(type)}
          className="sm:col-span-2"
          hint="Choisi dans l'annuaire des partenaires, ou saisi librement."
        >
          {(a) => (
            <span className="grid gap-1.5 sm:grid-cols-2">
              <PartnerSelect
                {...a}
                value={f.counterpart_partner_id}
                onChange={(id, p) =>
                  setF({ ...f, counterpart_partner_id: id, counterpart: p ? p.name : f.counterpart })
                }
              />
              <Input
                aria-label={`${counterpartOf(type)} (texte)`}
                value={f.counterpart}
                onChange={set("counterpart")}
              />
            </span>
          )}
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
  const { data: refs } = useReferentials();
  const form = useForms();
  const {
    data: a,
    isLoading,
    error,
  } = useQuery({ queryKey: ["activity", id], queryFn: () => api.get<Detail>(`/api/activities/${id}`) });
  const rec = useRecord(a);
  const can = useCan();
  const { data: me } = useMe();
  const [params, setParams] = useSearchParams();
  // « Modifier » depuis la grille : la fiche s'ouvre directement en modification
  useEffect(() => {
    if (a && params.get("modifier") === "1") {
      if (a.can.edit) rec.edit();
      setParams({}, { replace: true });
    }
  }, [a, params, setParams, rec]);
  const d = rec.draft;
  const [removing, setRemoving] = useState(false);
  const [note, setNote] = useState({ text: "", responsible_id: "", due_on: "" });
  const { data: domains } = useQuery({
    queryKey: ["domains"],
    queryFn: () => api.get<{ id: string; name: string }[]>("/api/domains"),
  });
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
        counterpart_partner_id: d!.counterpart_partner_id,
        mandate: d!.mandate,
        delegation: d!.delegation,
        outcome: d!.outcome,
        decision_needed: d!.decision_needed,
        progress: d!.progress,
        next_due_on: d!.next_due_on || null,
        health: d!.health,
        confidential: d!.confidential,
        plan_activity_id: d!.plan_activity_id,
      }),
    onSuccess: (r) => {
      rec.done();
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
  const ro = !rec.editing;
  const patch = rec.patch;
  const editing = rec.editing;
  const nameOf = (uid: string | null) => users?.find((u) => u.id === uid)?.name;
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
  const type = refs?.activity_type.find((t) => t.code === d.kind);
  return (
    <div className="min-h-full pb-10">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link to="/activites" aria-label="Retour au portefeuille" className="text-muted hover:text-fg">
              <ArrowLeft className="size-5" />
            </Link>
            {a?.title}
            {d.confidential && <Lock aria-label="Confidentielle" className="size-4 text-warning" />}
          </span>
        }
        subtitle={form(d.kind).label}
        actions={
          <>
            <Status label={HEALTH[d.health].label} tone={HEALTH[d.health].tone} />
            {!editing && d.can.remove && (
              <IconButton label="Supprimer l'activité" onClick={() => setRemoving(true)}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
            <RecordActions
              editing={editing}
              canEdit={d.can.edit}
              onEdit={rec.edit}
              onCancel={rec.cancel}
              onSave={() => save.mutate()}
              saving={save.isPending}
              disabled={!rec.dirty || !d.title.trim()}
            />
          </>
        }
      />
      <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-4 p-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Section title="Fiche">
            {!editing ? (
              <Facts>
                <Fact label="Intitulé" wide>
                  {d.title}
                </Fact>
                <Fact label="Responsable">{nameOf(d.lead_id)}</Fact>
                <Fact label="Domaine d'activité">{domains?.find((x) => x.id === d.domain_id)?.name}</Fact>
                <Fact label="Entité">{units?.find((u) => u.id === d.unit_id)?.name}</Fact>
                <Fact label="Date">
                  {d.start_on && `${frDate(d.start_on)}${d.start_time ? ` à ${d.start_time.slice(0, 5)}` : ""}`}
                </Fact>
                <Fact label="Lieu">{d.location}</Fact>
                <Fact label={counterpartOf(type)}>
                  {d.counterpart_partner_id ? (
                    <Link to={`/partenaires/${d.counterpart_partner_id}`} className="text-primary hover:underline">
                      {d.counterpart || d.counterpart_partner_name}
                    </Link>
                  ) : (
                    d.counterpart
                  )}
                </Fact>
                {(d.kind === "commission" || !!d.mandate) && (
                  <Fact label="Mandat de l'Agence" wide>
                    {d.mandate && <LongText>{d.mandate}</LongText>}
                  </Fact>
                )}
                {(d.kind === "conference" || !!d.delegation) && (
                  <Fact label="Délégation" wide>
                    {d.delegation}
                  </Fact>
                )}
                <Fact label="Objet" wide>
                  {d.description && <LongText>{d.description}</LongText>}
                </Fact>
                <Fact label={d.kind === "conference" ? "Retombées" : "Résultat"} wide>
                  {d.outcome && <LongText>{d.outcome}</LongText>}
                </Fact>
              </Facts>
            ) : (
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
                <Field label={counterpartOf(type)}>
                  {(a) => (
                    <span className="grid gap-1.5">
                      <PartnerSelect
                        {...a}
                        disabled={ro}
                        value={d.counterpart_partner_id}
                        current={
                          d.counterpart_partner_id
                            ? { id: d.counterpart_partner_id, name: d.counterpart_partner_name ?? d.counterpart }
                            : null
                        }
                        onChange={(id, p) =>
                          patch({ counterpart_partner_id: id || null, counterpart: p ? p.name : d.counterpart })
                        }
                      />
                      <Input aria-label={`${counterpartOf(type)} (texte)`} {...text("counterpart")} />
                      {d.counterpart_partner_id && (
                        <Link
                          to={`/partenaires/${d.counterpart_partner_id}`}
                          className="text-[12px] text-primary hover:underline"
                        >
                          Voir la fiche du partenaire
                        </Link>
                      )}
                    </span>
                  )}
                </Field>
                {(d.kind === "commission" || !!d.mandate) && (
                  <Field label="Mandat de l'Agence" className="sm:col-span-2" hint="La position que l'Agence y défend.">
                    {(a) => <Textarea {...a} {...area("mandate")} />}
                  </Field>
                )}
                {(d.kind === "conference" || !!d.delegation) && (
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
            )}
          </Section>
        </div>
        <div className="space-y-4">
          <Section title="Pilotage">
            {!editing ? (
              <Facts className="sm:grid-cols-1">
                <Fact label="État">
                  <Status label={HEALTH[d.health].label} tone={HEALTH[d.health].tone} />
                </Fact>
                {type?.props.tracks_progress && <Fact label="Avancement">{`${d.progress} %`}</Fact>}
                <Fact label="Prochaine échéance">{d.next_due_on && frDate(d.next_due_on)}</Fact>
                <Fact label="Activité du plan de travail réalisée">{d.plan_activity_label}</Fact>
                <Fact label="Décision attendue de la DG">{d.decision_needed}</Fact>
                {d.confidential && <Fact label="Diffusion">Activité confidentielle</Fact>}
              </Facts>
            ) : (
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
                {type?.props.tracks_progress && (
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
                <Field
                  label="Activité du plan de travail réalisée"
                  hint={!d.can.remove ? "Seul un gestionnaire change le rattachement au plan." : undefined}
                >
                  {(a) => (
                    <PlanActivitySelect
                      {...a}
                      disabled={ro || !d.can.remove}
                      value={d.plan_activity_id}
                      onChange={(v) => patch({ plan_activity_id: v || null })}
                    />
                  )}
                </Field>
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
            )}
          </Section>
          {!editing && (
            <ActivityArbitrations activityId={d.id} canAsk={can("agenda.manage") || (!!me && d.lead_id === me.id)} />
          )}
          {!editing && <DossierDocuments owner="activity" ownerId={d.id} title="Documents de l'activité" />}
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

/** État calculé d'un projet, avec le déclaré à côté quand ils divergent (F-1). */
function ComputedHealth({ p, health }: { p: ProjectSummary; health: Map<string, import("@/lib/hooks").ProjectHealth> }) {
  const h = health.get(p.id);
  const state = h?.health_computed ?? p.status;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Status label={HEALTH[state].label} tone={HEALTH[state].tone} />
      {/* Un seul statut visible ; l'écart avec le déclaré se signale par une icône, expliquée au survol (écrans sobres) */}
      {h?.divergent && (
        <Tip label={`Le responsable déclare « ${HEALTH[h.health_declared].label} » ; le calcul dit « ${HEALTH[state].label} »${h.reasons.length ? ` : ${h.reasons.join(" · ")}` : ""}`}>
          <span aria-label={`Écart avec le statut déclaré : ${HEALTH[h.health_declared].label}`} className="text-warning">
            <GitCompareArrows className="size-3.5" />
          </span>
        </Tip>
      )}
    </span>
  );
}
