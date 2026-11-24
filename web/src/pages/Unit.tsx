import { RECURRENCE_LABELS } from "@/components/TaskDrawer";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  CalendarDays,
  ChartNoAxesGantt,
  FolderKanban,
  FolderPlus,
  Landmark,
  LayoutList,
  Plus,
  SquareKanban,
  UserCheck,
  Users,
} from "lucide-react";
import { Button, Empty, Hint, Spinner, cn } from "@/components/ui";
import { Drawer, DrawerSection } from "@/components/drawer";
import { Field, Input, PageHeader, Section, Select, StatCard, Status, Table, Td, Tr, frDate } from "@/components/gov";
import { UnitDashboardView, UnitProjects } from "@/components/unit-dashboard";
import { MeetingsBrowser } from "@/components/MeetingViews";
import { NewMeeting, type MeetingRow } from "./Meetings";
import { isActive } from "@/components/ai";
import { useCan, useMe, useMyUnits, useProject, useProjectTasks, useRuns } from "@/lib/hooks";
import { useShell } from "@/lib/shell";
import { useTaskMenu } from "@/lib/context-menu";
import { todayIso, pl } from "@/lib/format";
import { api } from "@/lib/api";
import type { ProjectDetail, Task, UnitBoard, UnitDashboard, UnitFollowUp } from "@/lib/types";
import { TabBar } from "@/components/tabs";
import { ListView } from "@/views/ListView";
import { BoardView } from "@/views/BoardView";
import { CalendarView } from "@/views/CalendarView";
import { TimelineView } from "@/views/TimelineView";

/*
 * Mon entité — l'espace de travail d'une entité, à la manière d'Asana. Une tâche n'a pas besoin d'un projet : elle
 * se crée ici, dans le registre de l'entité, et se travaille en liste, tableau, calendrier ou chronologie. Un projet
 * se crée aussi d'ici et reste porté par l'entité. Le responsable y confie les tâches et suit chaque agent ; la vue
 * d'ensemble est le tableau de bord de l'entité.
 */
type View = "ensemble" | "liste" | "tableau" | "calendrier" | "chronologie" | "projets" | "reunions" | "suivi";
const VIEWS: { id: View; label: string; Icon: typeof LayoutList; responsable?: boolean }[] = [
  { id: "ensemble", label: "Vue d'ensemble", Icon: BarChart3 },
  { id: "liste", label: "Liste", Icon: LayoutList },
  { id: "tableau", label: "Tableau", Icon: SquareKanban },
  { id: "calendrier", label: "Calendrier", Icon: CalendarDays },
  { id: "chronologie", label: "Chronologie", Icon: ChartNoAxesGantt },
  { id: "projets", label: "Projets", Icon: FolderKanban },
  { id: "reunions", label: "Réunions", Icon: Landmark },
  { id: "suivi", label: "Suivi des agents", Icon: UserCheck, responsable: true },
];

export function UnitPage() {
  const can = useCan();
  const { data: units } = useMyUnits();
  const [params, setParams] = useSearchParams();
  // L'entité de rattachement s'ouvre par défaut, même quand la personne en dirige d'autres (E-4)
  const unitId = params.get("unite") || units?.find((u) => u.home)?.id || units?.[0]?.id || "";
  const unit = units?.find((u) => u.id === unitId);
  const { data: board, error } = useQuery({
    queryKey: ["unit-board", unitId],
    queryFn: () => api.get<UnitBoard>(`/api/units/${unitId}/board`),
    enabled: !!unitId,
  });
  const responsable = board?.role === "responsable";
  const views = VIEWS.filter((v) => !v.responsable || responsable);
  const asked = (params.get("vue") as View) || "ensemble";
  const view = views.some((v) => v.id === asked) ? asked : "ensemble";
  const go = (patch: Record<string, string>) => setParams({ unite: unitId, vue: view, ...patch });
  const [giving, setGiving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [meeting, setMeeting] = useState(false);

  if (!units) return <Spinner />;
  if (!units.length)
    return (
      <Empty icon={<Users className="size-6" />} title="Aucune entité">
        Vous n'êtes rattaché·e à aucune entité. Demandez à l'administration de vous y ranger.
      </Empty>
    );
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        Icon={Users}
        crumbs={["Mon entité", board?.unit.name ?? unit?.name ?? ""]}
        title={board?.unit.name ?? unit?.name ?? "Mon entité"}
        subtitle={
          responsable
            ? "Vous en êtes responsable : vous créez et confiez les tâches, lancez les projets de l'entité et suivez chaque agent."
            : "L'espace de votre entité : vos tâches hors projet, celles de l'entité et ses projets."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Le responsable lit le tableau de sa direction, comme la DG (P-5) */}
            {responsable && unitId && (
              <Link
                to={`/pilotage/directions/${unitId}`}
                className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-[13px] hover:bg-hover"
              >
                Tableau de la direction
              </Link>
            )}
            {units.length > 1 && (
              <Select
                aria-label="Entité"
                value={unitId}
                onChange={(e) => setParams({ unite: e.target.value, vue: view })}
                className="w-full sm:w-[300px]"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role === "responsable" ? "responsable" : "agent"}
                  </option>
                ))}
              </Select>
            )}
            {board?.can.assign && (
              <Button icon={<Landmark className="size-4" />} onClick={() => setMeeting(true)}>
                Réunion
              </Button>
            )}
            {board && can("projects.create") && (
              <Button icon={<FolderPlus className="size-4" />} onClick={() => setCreating(true)}>
                Projet
              </Button>
            )}
            {board && (
              <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setGiving(true)}>
                {responsable ? "Confier une tâche" : "Tâche"}
              </Button>
            )}
          </div>
        }
      />
      <TabBar
        label="Vues de l'entité"
        className="mx-auto -mb-px w-full max-w-[1480px] border-b border-line px-4 sm:flex-wrap sm:overflow-visible sm:px-8"
        value={view}
        onChange={(v) => go({ vue: v })}
        items={views.map((v) => ({ id: v.id, label: v.label, Icon: v.Icon }))}
      />
      <div className="min-h-0 flex-1">
        {error ? (
          <p className="p-8 text-[13px] text-danger">{(error as Error).message}</p>
        ) : !board ? (
          <Spinner />
        ) : view === "ensemble" || view === "projets" ? (
          <Overview
            unitId={unitId}
            projectsOnly={view === "projets"}
            onNewProject={can("projects.create") ? () => setCreating(true) : undefined}
            onNewTask={() => setGiving(true)}
          />
        ) : view === "reunions" ? (
          <UnitMeetings board={board} onNew={() => setMeeting(true)} />
        ) : view === "suivi" ? (
          <div className="mx-auto max-w-[1480px] space-y-4 px-4 pb-16 pt-5 sm:px-8">
            <FollowUp unitId={unitId} />
          </div>
        ) : (
          <BoardViews board={board} view={view} />
        )}
      </div>
      {giving && board && <GiveTask board={board} onClose={() => setGiving(false)} />}
      {creating && board && <NewUnitProject board={board} onClose={() => setCreating(false)} />}
      {meeting && board && (
        <NewMeeting unit={{ id: board.unit.id, name: board.unit.name }} onClose={() => setMeeting(false)} />
      )}
    </div>
  );
}

/**
 * Réunions de l'entité : le module Réunions, filtré sur l'entité (liste, tableau, calendrier ; compte rendu et
 * circuit de validation inchangés). Le responsable les programme ; toute l'entité est convoquée d'office.
 */
function UnitMeetings({ board, onNew }: { board: UnitBoard; onNew: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["meetings", "unit", board.unit.id],
    queryFn: () => api.get<MeetingRow[]>(`/api/meetings?unit_id=${board.unit.id}`),
  });
  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-16 pt-5 sm:px-8">
      <MeetingsBrowser
        rows={data ?? []}
        isLoading={isLoading}
        primary={
          board.can.assign && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={onNew}>
              Programmer une réunion
            </Button>
          )
        }
        renderActions={() => (
          <p className="p-5 text-[13px] text-muted">Les recommandations se suivent depuis la page Réunions.</p>
        )}
      />
    </div>
  );
}

function Overview({
  unitId,
  projectsOnly,
  onNewProject,
  onNewTask,
}: {
  unitId: string;
  projectsOnly: boolean;
  onNewProject?: () => void;
  onNewTask: () => void;
}) {
  const { data, error } = useQuery({
    queryKey: ["unit-dashboard", unitId],
    queryFn: () => api.get<UnitDashboard>(`/api/units/${unitId}/dashboard`),
  });
  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-16 pt-5 sm:px-8">
      {error ? (
        <p className="text-[13px] text-danger">{(error as Error).message}</p>
      ) : !data ? (
        <Spinner />
      ) : projectsOnly ? (
        <Section title={`Projets de l'entité : ${data.projects.filter((p) => p.role !== "contribue").length} ${pl(data.projects.filter((p) => p.role !== "contribue").length, "porté(s)")}, ${data.projects.filter((p) => p.role === "contribue").length} en contribution`}>
          <div className="p-5 pt-3">
            <UnitProjects rows={data.projects} onCreate={onNewProject} />
          </div>
        </Section>
      ) : (
        <UnitDashboardView data={data} onNewProject={onNewProject} onNewTask={onNewTask} />
      )}
    </div>
  );
}

/** Les vues des tâches (celles d'un projet), appliquées au registre de l'entité. */
function BoardViews({ board, view }: { board: UnitBoard; view: View }) {
  const can = useCan();
  const { data: project } = useProject(board.project_id);
  const { data: tasks } = useProjectTasks(board.project_id);
  const { data: runs } = useRuns({ projectId: board.project_id });
  const aiActive = useMemo(
    () => new Set((runs ?? []).filter((r) => isActive(r.status) && r.task_id).map((r) => r.task_id!)),
    [runs],
  );
  if (!project || !tasks) return <Spinner />;
  // Registre de l'entité : le serveur exige le rôle sur le tableau ET le droit du profil (règle 5.1.3)
  const editor = project.role === "editor" || project.role === "admin";
  const props = {
    project: project as ProjectDetail,
    tasks,
    aiActive,
    canEdit: editor && can("projects.edit"),
    canAddTask: editor && can("tasks.create"),
    canEditTask: editor && can("tasks.edit"),
    canSections: editor && can("sections.manage"),
  };
  return (
    <>
      {view === "liste" && <ListView {...props} />}
      {view === "tableau" && <BoardView {...props} />}
      {view === "calendrier" && <CalendarView {...props} />}
      {view === "chronologie" && <TimelineView {...props} />}
    </>
  );
}

/** Nouveau projet porté par l'entité ; ses agents peuvent en être membres d'emblée. */
function NewUnitProject({ board, onClose }: { board: UnitBoard; onClose: () => void }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", description: "", due_on: "", open: true });
  const [busy, setBusy] = useState(false);
  const pastDue = !!f.due_on && f.due_on < todayIso();
  const submit = () => {
    setBusy(true);
    api
      .post<{ id: string }>(`/api/units/${board.unit.id}/projects`, {
        name: f.name.trim(),
        description: f.description.trim() || undefined,
        due_on: f.due_on || null,
        open_to_unit: f.open,
      })
      .then(
        (p) => {
          qc.invalidateQueries({ queryKey: ["projects"] });
          qc.invalidateQueries({ queryKey: ["unit-dashboard"] });
          toast.success("Projet créé et rattaché à l'entité");
          onClose();
          nav(`/projects/${p.id}`);
        },
        (e: Error) => toast.error(e.message),
      )
      .finally(() => setBusy(false));
  };
  return (
    <Drawer
      open
      onClose={onClose}
      dirty={!!(f.name || f.description) && !busy}
      width={560}
      subtitle={`Mon entité · ${board.unit.name}`}
      title="Nouveau projet de l'entité"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!f.name.trim() || pastDue || busy} onClick={submit}>
            Créer le projet
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="rounded-lg bg-info-soft px-3 py-2 text-[13px] text-info">
          Le projet est porté par l'entité : il apparaît dans son espace et au portefeuille. Vous en êtes
          l'administrateur ; le responsable de l'entité le consulte.
        </p>
        <DrawerSection title="Le projet">
          <div className="grid gap-3">
            <Field label="Nom" required>
              {(a) => (
                <Input
                  {...a}
                  value={f.name}
                  onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))}
                  placeholder="Ex. Atlas des communes"
                  autoFocus
                />
              )}
            </Field>
            <Field label="Objectif">
              {(a) => (
                <textarea
                  {...a}
                  rows={3}
                  value={f.description}
                  onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))}
                  className="field-ring w-full rounded-lg border border-field bg-panel px-3 py-2 text-[13.5px] outline-none"
                />
              )}
            </Field>
            <Field label="Échéance" error={pastDue ? "L'échéance ne peut pas être passée" : null}>
              {(a) => (
                <Input
                  {...a}
                  type="date"
                  min={todayIso()}
                  value={f.due_on}
                  onChange={(e) => setF((x) => ({ ...x, due_on: e.target.value }))}
                />
              )}
            </Field>
          </div>
        </DrawerSection>
        <label className="flex items-start gap-2.5 text-[13.5px]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={f.open}
            onChange={(e) => setF((x) => ({ ...x, open: e.target.checked }))}
          />
          <span>
            Ouvrir aux agents de l'entité
            <span className="block text-[12.5px] text-muted">
              Ils en deviennent membres et peuvent y travailler. Sinon, vous ajouterez les membres vous-même.
            </span>
          </span>
        </label>
      </div>
    </Drawer>
  );
}

const PRIORITY: Record<string, string> = {
  none: "—",
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

function FollowUp({ unitId }: { unitId: string }) {
  const { data } = useQuery({
    queryKey: ["unit-follow-up", unitId],
    queryFn: () => api.get<UnitFollowUp>(`/api/units/${unitId}/follow-up`),
  });
  const shell = useShell();
  const taskMenu = useTaskMenu();
  const [agent, setAgent] = useState<string | null>(null);
  const [state, setState] = useState<"open" | "overdue" | "done">("open");
  if (!data) return <Spinner />;
  const total = (k: "open" | "overdue" | "due_soon" | "done_30") => data.agents.reduce((n, a) => n + a[k], 0);
  const names = new Map(data.agents.map((a) => [a.user_id, a.name]));
  const tasks = data.tasks.filter(
    (t) =>
      (!agent || t.assignee_id === agent) &&
      (state === "done" ? t.completed : state === "overdue" ? t.overdue : !t.completed),
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(
          [
            ["Agents suivis", data.agents.length],
            ["Tâches ouvertes", total("open")],
            ["En retard", total("overdue")],
            ["Dues sous 7 jours", total("due_soon")],
            ["Terminées (30 j)", total("done_30")],
          ] as const
        ).map(([label, v]) => (
          <StatCard key={label} label={label} value={v} strong={label === "En retard" && v > 0} />
        ))}
      </div>
      <Section
        title="Agents"
        aside={
          agent && (
            <Button size="sm" onClick={() => setAgent(null)}>
              Tous les agents
            </Button>
          )
        }
      >
        {data.agents.length === 0 ? (
          <Empty title="Aucun agent">Aucune personne n'est rangée dans cette entité.</Empty>
        ) : (
          <Table head={["Agent", "Entité", "Ouvertes", "En retard", "Sous 7 jours", "Terminées (30 j)"]}>
            {data.agents.map((a) => (
              <Tr key={a.user_id} onClick={() => setAgent(agent === a.user_id ? null : a.user_id)}>
                <Td>
                  <span className={cn("block font-medium", agent === a.user_id && "underline")}>{a.name}</span>
                  {a.is_head ? (
                    <span className="block text-[12px] text-muted">Responsable de l'entité</span>
                  ) : a.leads ? (
                    <span className="block text-[12px] text-muted">Responsable · {a.leads}</span>
                  ) : (
                    a.title && <span className="block text-[12px] text-muted">{a.title}</span>
                  )}
                </Td>
                <Td className="text-muted">{a.unit_name}</Td>
                <Td className="tabular-nums">{a.open}</Td>
                <Td className="tabular-nums">
                  {a.overdue > 0 ? <Status tone="danger" label={String(a.overdue)} /> : "0"}
                </Td>
                <Td className="tabular-nums">{a.due_soon}</Td>
                <Td className="tabular-nums">{a.done_30}</Td>
              </Tr>
            ))}
          </Table>
        )}
        <div className="h-3" />
      </Section>
      <Section
        title={agent ? `Tâches de ${names.get(agent)}` : "Tâches des agents"}
        aside={
          <Select
            aria-label="État des tâches"
            value={state}
            onChange={(e) => setState(e.target.value as typeof state)}
            className="w-auto"
          >
            <option value="open">Ouvertes</option>
            <option value="overdue">En retard</option>
            <option value="done">Terminées (30 jours)</option>
          </Select>
        }
      >
        {tasks.length === 0 ? (
          <Empty title="Rien à signaler">Aucune tâche dans cet état.</Empty>
        ) : (
          <Table head={["Tâche", "Agent", "Dossier", "Colonne", "Priorité", "Échéance"]}>
            {tasks.map((t) => (
              <Tr key={t.id} onClick={() => shell.openTask(t.id)} onContextMenu={taskMenu(t)}>
                <Td>
                  <span className="block font-medium">{t.title}</span>
                  <span className="font-mono text-[11.5px] text-faint">{t.key}</span>
                </Td>
                <Td className="text-muted">{names.get(t.assignee_id) ?? "—"}</Td>
                <Td className="text-muted">{t.in_unit_board ? "Tâche de l'entité" : `Projet ${t.project_name}`}</Td>
                <Td className="text-muted">{t.completed ? "Terminée" : (t.section_name ?? "—")}</Td>
                <Td className="text-muted">{PRIORITY[t.priority] ?? "—"}</Td>
                <Td>
                  {t.overdue ? (
                    <Status tone="danger" label={`${frDate(t.due_on)} · en retard`} />
                  ) : (
                    <span className="text-muted">{frDate(t.due_on)}</span>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
        <div className="h-3" />
      </Section>
      <Hint>
        Le suivi couvre l'entité et les entités qui lui sont rattachées. Les tâches d'un projet auquel vous n'avez pas
        accès ne sont pas montrées.
      </Hint>
    </>
  );
}

/** Confier (responsable) ou noter (agent) une tâche d'entité. Un agent ne se l'attribue qu'à lui-même. */
export function GiveTask({ board, onClose, self }: { board: UnitBoard; onClose: () => void; self?: boolean }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [f, setF] = useState({
    title: "",
    description: "",
    // Depuis Mes tâches, on note une tâche pour soi (T-8)
    assignee_id: self ? (me?.id ?? "") : "",
    due_on: "",
    priority: "none",
    recurrence: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const assignee = board.can.assign ? f.assignee_id : (me?.id ?? "");
  const pastDue = !!f.due_on && f.due_on < todayIso();
  const submit = async () => {
    setBusy(true);
    // Un agent d'une entité rattachée : la tâche va dans le registre de son entité, où il a accès
    const target = board.members.find((m) => m.id === assignee && !m.manager);
    const projectId =
      target && target.unit_id !== board.unit.id
        ? await api.get<UnitBoard>(`/api/units/${target.unit_id}/board`).then(
            (b) => b.project_id,
            () => board.project_id,
          )
        : board.project_id;
    api
      .post<Task>("/api/tasks", {
        project_id: projectId,
        title: f.title.trim(),
        description: f.description.trim() || undefined,
        assignee_id: assignee || null,
        due_on: f.due_on || undefined,
        priority: f.priority,
        recurrence: f.recurrence || null,
      })
      .then(
        () => {
          qc.invalidateQueries({ queryKey: ["tasks"] });
          qc.invalidateQueries({ queryKey: ["unit-follow-up"] });
          qc.invalidateQueries({ queryKey: ["unit-dashboard"] });
          toast.success(
            board.can.assign && assignee && assignee !== me?.id
              ? "Tâche confiée : l'agent est prévenu"
              : "Tâche enregistrée dans le registre de l'entité",
          );
          onClose();
        },
        (e: Error) => toast.error(e.message),
      )
      .finally(() => setBusy(false));
  };
  return (
    <Drawer
      open
      onClose={onClose}
      dirty={!!(f.title || f.description) && !busy}
      width={560}
      subtitle={`Mon entité · ${board.unit.name}`}
      title={board.can.assign ? "Confier une tâche" : "Noter une tâche"}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!f.title.trim() || pastDue || busy} onClick={submit}>
            {board.can.assign ? "Confier la tâche" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <DrawerSection title="La tâche">
          <div className="grid gap-3">
            <Field label="Intitulé" required>
              {(a) => (
                <Input {...a} value={f.title} onChange={set("title")} placeholder="Commencez par un verbe" autoFocus />
              )}
            </Field>
            <Field label="Précisions">
              {(a) => (
                <textarea
                  {...a}
                  value={f.description}
                  onChange={set("description")}
                  rows={4}
                  className="field-ring w-full rounded-lg border border-field bg-panel px-3 py-2 text-[13.5px] outline-none"
                />
              )}
            </Field>
          </div>
        </DrawerSection>
        <DrawerSection title="Attribution et échéance">
          <div className="grid gap-3 sm:grid-cols-2">
            {board.can.assign ? (
              <Field
                label="Confiée à"
                hint={`Agent de l'entité ; il est prévenu par notification${me?.mail_ready ? " et courriel" : ""}.`}
              >
                {(a) => (
                  <Select {...a} value={f.assignee_id} onChange={set("assignee_id")}>
                    <option value="">Non attribuée pour l'instant</option>
                    {board.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.manager
                          ? " (responsable)"
                          : m.unit_id !== board.unit.id
                            ? ` — ${m.unit_name}`
                            : m.title
                              ? ` — ${m.title}`
                              : ""}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : (
              <p className="text-[13px] text-muted sm:col-span-2">
                La tâche vous est attribuée. Confier une tâche à un collègue revient au responsable de l'entité.
              </p>
            )}
            <Field label="Échéance" error={pastDue ? "L'échéance ne peut pas être passée" : null}>
              {(a) => <Input {...a} type="date" min={todayIso()} value={f.due_on} onChange={set("due_on")} />}
            </Field>
            <Field label="Priorité">
              {(a) => (
                <Select {...a} value={f.priority} onChange={set("priority")}>
                  {Object.entries(PRIORITY).map(([v, l]) => (
                    <option key={v} value={v}>
                      {v === "none" ? "Aucune" : l}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Répétition" hint="Une tâche récurrente renaît, une fois terminée, à la période suivante.">
              {(a) => (
                <Select {...a} value={f.recurrence} onChange={set("recurrence")}>
                  <option value="">Ne se répète pas</option>
                  {Object.entries(RECURRENCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </DrawerSection>
      </div>
    </Drawer>
  );
}
