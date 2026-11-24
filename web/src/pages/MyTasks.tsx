import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleCheck,
  CircleDot,
  FolderClosed,
  LayoutList,
  Plus,
  SquareKanban,
} from "lucide-react";
import { useLocalPref } from "@/components/collection";
import { TaskBoard } from "@/views/BoardView";
import { InlineAdd } from "@/views/ListView";
import { TabBar, type TabItem } from "@/components/tabs";
import { CalendarView } from "@/views/CalendarView";
import type { ProjectDetail } from "@/lib/types";
import { toast } from "sonner";
import { Avatar, Button, Empty, cn, Hint } from "@/components/ui";
import { LineBadge, TaskGroupHeader, TaskLine, TaskRow } from "@/components/TaskRow";
import { DueChip } from "@/components/pickers";
import { useCan, useMe, useMyTasks, useMyUnits, useProjects, useStageTask, useUpdateTask, useUserMap } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { UnitBoard } from "@/lib/types";
import { GiveTask } from "./Unit";
import { useShell } from "@/lib/shell";
import { isoIn, pl, todayIso } from "@/lib/format";
import type { ProjectSummary, Task } from "@/lib/types";
import { MyDeliverables, useLateDeliverables } from "./ProjectDossier";

/** Une tâche hors projet vit dans le registre de son entité, qui n'est pas un projet du portefeuille. */
const UNIT_TASK = { name: "Tâche d'entité", icon: "users", color: "var(--hue-slate)" } as unknown as ProjectSummary;
/** Une tâche confiée par la personne, suivie où qu'elle soit (T-12, E-8). */
interface Confided {
  id: string;
  key: string;
  title: string;
  assignee_id: string | null;
  assignee_name: string | null;
  due_on: string | null;
  completed: boolean;
  done_declared_at: string | null;
  place: string | null;
  overdue: boolean;
  postpone_pending: boolean;
  priority?: Task["priority"];
  section_name?: string | null;
}
function ConfidedTasks({ onOpen }: { onOpen: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["tasks", "confided"],
    queryFn: () => api.get<Confided[]>("/api/tasks/confided"),
  });
  const users = useUserMap();
  const [open, setOpen] = useState(true);
  if (!data?.length) return null;
  const pending = data.filter((t) => !t.completed);
  const late = pending.filter((t) => t.overdue).length;
  return (
    <section>
      <TaskGroupHeader
        label="Tâches que j'ai confiées"
        count={pending.length}
        note={late ? `${late} en retard` : undefined}
        open={open}
        onToggle={() => setOpen(!open)}
      />
      {open && (
        <div className="sm:px-4">
          {data.map((t) => (
            <TaskLine
              key={t.id}
              // La personne qui a confié ne coche pas : elle lit l'état (faite, déclarée faite, en cours)
              leading={
                t.completed ? (
                  <CheckCircle2 className="size-[18px] text-success" aria-label="Terminée" />
                ) : t.done_declared_at ? (
                  <CircleDot className="size-[18px] text-info" aria-label="Déclarée faite" />
                ) : (
                  <Circle className="size-[18px] text-faint" aria-label="En cours" />
                )
              }
              title={t.title}
              detail={t.assignee_name ?? undefined}
              done={t.completed}
              badges={
                <>
                  {t.postpone_pending && <LineBadge tone="warning">Report demandé</LineBadge>}
                  {!t.completed && t.done_declared_at && <LineBadge tone="info">À valider</LineBadge>}
                </>
              }
              place={
                t.place ? (
                  <>
                    <FolderClosed className="size-4 shrink-0 text-faint" />
                    <span className="truncate">{t.place}</span>
                  </>
                ) : null
              }
              due={<DueChip due={t.due_on} done={t.completed} />}
              person={
                <span title={t.assignee_name ?? undefined}>
                  <Avatar user={t.assignee_id ? users.get(t.assignee_id) : null} size={22} />
                </span>
              }
              onOpen={() => onOpen(t.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Le nom de l'entité distingue les tâches d'un chef qui en dirige plusieurs (T-4). */
const unitTask = (t: Task) => (t.unit_name ? { ...UNIT_TASK, name: t.unit_name } : UNIT_TASK);

const BUCKETS: { id: string; label: string; test: (t: Task) => boolean }[] = [
  { id: "overdue", label: "En retard", test: (t) => !!t.due_on && t.due_on < todayIso() },
  { id: "today", label: "Aujourd'hui", test: (t) => t.due_on === todayIso() },
  { id: "week", label: "Cette semaine", test: (t) => !!t.due_on && t.due_on > todayIso() && t.due_on <= isoIn(7) },
  { id: "later", label: "Plus tard", test: (t) => !!t.due_on && t.due_on > isoIn(7) },
  { id: "none", label: "Sans échéance", test: (t) => !t.due_on },
];

type View = "liste" | "tableau" | "calendrier";
const VIEWS: TabItem<View>[] = [
  { id: "liste", label: "Liste", Icon: LayoutList },
  { id: "tableau", label: "Tableau", Icon: SquareKanban },
  { id: "calendrier", label: "Calendrier", Icon: CalendarDays },
];
const NO_AI = new Set<string>();
/** Colonnes de base d'un tableau de tâches, et l'ordre habituel des colonnes de projet. */
const STAGES = ["À faire", "En cours", "Terminé"];
const ORDER = ["backlog", "à faire", "en cours", "en revue", "terminé"];
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const rank = (name: string) => {
  const i = ORDER.indexOf(name.trim().toLowerCase());
  // Une colonne propre à un projet se place avant « Terminé »
  return i < 0 ? ORDER.length - 1.5 : i;
};
/** L'échéance que prend une tâche déposée dans une colonne du tableau. */
const DUE_FOR: Record<string, () => string | null> = {
  today: () => todayIso(),
  week: () => isoIn(7),
  later: () => isoIn(14),
  none: () => null,
};

export function MyTasksPage() {
  const can = useCan();
  const { data: me } = useMe();
  const { data: tasks } = useMyTasks();
  const { data: projects } = useProjects();
  const update = useUpdateTask();
  const stage = useStageTask();
  const shell = useShell();
  const [showDone, setShowDone] = useState(false);
  // Une tâche hors projet se range dans le registre de l'entité de la personne (lot T1)
  const { data: units } = useMyUnits();
  // L'entité de rattachement, même dirigée : pour la DG, la Direction générale et non la racine (T-9)
  const home = units?.find((u) => u.home) ?? units?.find((u) => u.role === "agent") ?? units?.[0];
  // Les livrables à produire en retard comptent avec les retards (T-6)
  const lateDeliverables = useLateDeliverables(me?.id);
  const [board, setBoard] = useState<UnitBoard | null>(null);
  const { data: register } = useQuery({
    queryKey: ["unit-board", home?.id],
    queryFn: () => api.get<UnitBoard>(`/api/units/${home!.id}/board`),
    enabled: !!home,
  });
  const newTask = () =>
    home && api.get<UnitBoard>(`/api/units/${home.id}/board`).then(setBoard, (e: Error) => toast.error(e.message));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const pm = useMemo(() => new Map(projects?.map((p) => [p.id, p])), [projects]);
  // Recherche et filtre par projet ou entité (T-11)
  const [q, setQ] = useState("");
  const [where, setWhere] = useState("");
  const placeOf = (t: Task) => pm.get(t.project_id)?.name ?? t.unit_name ?? "Tâche d'entité";
  const places = [...new Set((tasks ?? []).map(placeOf))].sort();
  const match = (t: Task) =>
    (!where || placeOf(t) === where) &&
    (!q || `${t.title} ${t.parent_title ?? ""} ${t.key}`.toLowerCase().includes(q.trim().toLowerCase()));
  const open = (tasks ?? [])
    .filter(match)
    .filter((t) => !t.completed)
    .sort((a, b) => ((a.due_on ?? "9") < (b.due_on ?? "9") ? -1 : 1));
  // Une sous-tâche se range sous sa tâche quand celle-ci est dans la liste ; sinon elle garde sa place et cite sa tâche
  const mine = new Set(open.map((t) => t.id));
  const nestedUnder = (t: Task) => !!t.parent_id && mine.has(t.parent_id);
  const childrenOf = (id: string) => open.filter((t) => t.parent_id === id);
  const top = open.filter((t) => !nestedUnder(t));
  const [view, setView] = useLocalPref<View>("anat.vue.mes-taches", "liste");
  const { data: confided } = useQuery({
    queryKey: ["tasks", "confided"],
    queryFn: () => api.get<Confided[]>("/api/tasks/confided"),
  });
  const given = (confided ?? []).filter((t) => !t.completed);
  const givenTasks = given.map(
    (t) =>
      ({
        id: t.id,
        key: t.key,
        title: t.title,
        completed: false,
        due_on: t.due_on,
        assignee_id: t.assignee_id,
        done_declared_at: t.done_declared_at,
        section_name: t.section_name ?? null,
        priority: t.priority ?? "none",
        tags: [],
        subtask_count: 0,
        subtask_done: 0,
      }) as unknown as Task,
  );
  const done = (tasks ?? [])
    .filter(match)
    .filter((t) => t.completed)
    .sort((a, b) => ((b.completed_at ?? "") < (a.completed_at ?? "") ? -1 : 1));

  const confidedIds = new Set(givenTasks.map((t) => t.id));
  // Les colonnes du tableau : les trois de base, plus celles que portent les projets des tâches affichées
  const stageOf = (t: Task) => t.section_name ?? STAGES[0];
  const stages = [...STAGES, ...new Set([...open, ...givenTasks].map(stageOf))]
    .filter((n, i, all) => all.findIndex((x) => same(x, n)) === i)
    .sort((x, y) => rank(x) - rank(y));
  const onBoard = [...open, ...givenTasks].sort((a, b) => ((a.due_on ?? "9") < (b.due_on ?? "9") ? -1 : 1));
  return (
    <div className="flex min-h-full flex-col">
      {/* Même en-tête que la page d'un projet : titre et actions, puis les vues en onglets soulignés */}
      <header className="border-b border-line px-4 pt-5 sm:px-8 sm:pt-7">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <CircleCheck className="size-5" />
          </span>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Mes tâches</h1>
          <Hint iconOnly>
            Tout ce qui vous est assigné, dans vos projets et dans votre entité : livrables à produire ou à valider,
            puis tâches.
          </Hint>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              aria-label="Rechercher une tâche"
              placeholder="Rechercher…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-44 rounded-lg border border-line bg-panel px-2.5 text-[13px]"
            />
            <select
              aria-label="Projet ou entité"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              className="h-9 max-w-[220px] rounded-lg border border-line bg-panel px-2 text-[13px]"
            >
              <option value="">Tous les projets et entités</option>
              {places.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {home && can("tasks.create") && (
              <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={newTask}>
                Tâche
              </Button>
            )}
          </div>
        </div>
        <TabBar label="Vues" className="-mb-px mt-5" value={view} onChange={setView} items={VIEWS} />
      </header>
      {board && <GiveTask board={board} self onClose={() => setBoard(null)} />}
      {view === "liste" && (
        <div className="flex items-center gap-3 border-b border-line px-4 py-2 text-[12.5px] text-muted sm:px-8">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={!showDone}
              onChange={(e) => setShowDone(!e.target.checked)}
              className="accent-[var(--fg)]"
            />
            Masquer les terminées
          </label>
          <span className="ml-auto tabular">
            {done.length}/{done.length + open.length} terminées
          </span>
        </div>
      )}
      {/* Les livrables à produire ou à valider vivent dans leur projet ; ils se retrouvent ici (docs/PARCOURS-METIER.md) */}
      {view === "liste" && (
        <div className="border-b border-line px-4 py-5 empty:hidden sm:px-8">
          <MyDeliverables />
        </div>
      )}
      {view === "tableau" && (
        <div className="rise-in min-h-0 flex-1">
          <TaskBoard
            canEdit
            // Les colonnes d'un projet, tous projets confondus : déplacer une carte fait avancer la tâche, ici comme
            // dans son projet. L'échéance, elle, ne change pas (pour une tâche confiée, elle reste à qui l'a confiée).
            columns={stages.map((name) => ({
              id: name,
              name,
              tasks: onBoard.filter((t) => same(stageOf(t), name)),
              footer:
                name === STAGES[0] && register && me ? (
                  <InlineAdd compact projectId={register.project_id} extra={{ assignee_id: me.id }} />
                ) : undefined,
            }))}
            readOnly={(t) => confidedIds.has(t.id)}
            onMove={({ task, from, to, revert }) => {
              // L'ordre dans une colonne appartient au projet : ici on ne fait que changer de colonne
              if (from === to) return revert();
              stage.mutate({ id: task.id, name: to }, { onError: revert });
            }}
          />
        </div>
      )}
      {view === "calendrier" && (
        <div className="rise-in">
        <CalendarView
          project={UNIT_TASK as unknown as ProjectDetail}
          tasks={[...open, ...givenTasks]}
          aiActive={NO_AI}
          canEdit={false}
          canAddTask={false}
          canEditTask={false}
          canSections={false}
          canDelegate={false}
        />
        </div>
      )}
      <div className={cn("rise-in pb-24", view !== "liste" && "hidden")}>
        {open.length === 0 && <Empty title="Vous êtes à jour">Aucune tâche ouverte ne vous est assignée.</Empty>}
        {!open.some(BUCKETS[0].test) && lateDeliverables > 0 && (
          <div className="flex h-11 items-center gap-2 border-b border-line px-4 sm:px-8">
            <span className="text-[13.5px] font-semibold text-danger">En retard</span>
            <span className="text-[12px] text-danger">
              {lateDeliverables} livrable{lateDeliverables > 1 ? "s" : ""} en retard, ci-dessus
            </span>
          </div>
        )}
        {BUCKETS.map((b) => {
          const items = top.filter(b.test);
          if (!items.length) return null;
          const row = (t: Task, nested?: boolean) => (
            <TaskRow
              key={t.id}
              t={t}
              nested={nested}
              assignee={me}
              project={pm.get(t.project_id) ?? unitTask(t)}
              onOpen={() => shell.openTask(t.id)}
              onToggle={(v) => update.mutate({ id: t.id, completed: v })}
            />
          );
          return (
            <section key={b.id}>
              <TaskGroupHeader
                label={b.label}
                count={items.length}
                danger={b.id === "overdue"}
                note={
                  b.id === "overdue" && lateDeliverables > 0
                    ? `+ ${lateDeliverables} ${pl(lateDeliverables, "livrable(s)")} en retard, ci-dessus`
                    : undefined
                }
                open={!collapsed[b.id]}
                onToggle={() => setCollapsed({ ...collapsed, [b.id]: !collapsed[b.id] })}
              />
              {!collapsed[b.id] && (
                <div className="sm:px-4">
                  {items.flatMap((t) => [row(t), ...childrenOf(t.id).map((c) => row(c, true))])}
                  {b.id !== "overdue" && register && me && (
                    <InlineAdd projectId={register.project_id} extra={{ assignee_id: me.id, due_on: DUE_FOR[b.id]() }} />
                  )}
                </div>
              )}
            </section>
          );
        })}
        <ConfidedTasks onOpen={(id) => shell.openTask(id)} />
        {showDone && done.length > 0 && (
          <section>
            <TaskGroupHeader
              label="Terminées"
              count={done.length}
              open={!collapsed.done}
              onToggle={() => setCollapsed({ ...collapsed, done: !collapsed.done })}
            />
            {!collapsed.done && (
              <div className="sm:px-4">
                {done.map((t) => (
                  <TaskRow
                    key={t.id}
                    t={t}
                    assignee={me}
                    project={pm.get(t.project_id) ?? unitTask(t)}
                    onOpen={() => shell.openTask(t.id)}
                    onToggle={(v) => update.mutate({ id: t.id, completed: v })}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
