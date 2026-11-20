import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, Empty, cn, Hint } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { useMe, useMyTasks, useMyUnits, useProjects, useUpdateTask } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { UnitBoard } from "@/lib/types";
import { GiveTask } from "./Unit";
import { useShell } from "@/lib/shell";
import { isoIn, todayIso } from "@/lib/format";
import type { ProjectSummary, Task } from "@/lib/types";
import { MyDeliverables, useLateDeliverables } from "./ProjectDossier";

/** Une tâche hors projet vit dans le registre de son entité, qui n'est pas un projet du portefeuille. */
const UNIT_TASK = { name: "Tâche d'entité", icon: "users", color: "#64748B" } as unknown as ProjectSummary;
/** Une tâche confiée par la personne, suivie où qu'elle soit (T-12, E-8). */
interface Confided {
  id: string;
  key: string;
  title: string;
  assignee_name: string | null;
  due_on: string | null;
  completed: boolean;
  done_declared_at: string | null;
  place: string | null;
  overdue: boolean;
  postpone_pending: boolean;
}
function ConfidedTasks({ onOpen }: { onOpen: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["tasks", "confided"],
    queryFn: () => api.get<Confided[]>("/api/tasks/confided"),
  });
  const [open, setOpen] = useState(true);
  if (!data?.length) return null;
  const pending = data.filter((t) => !t.completed);
  return (
    <section className="border-t border-line">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center gap-2 border-b border-line px-4 text-left sm:px-8"
      >
        <ChevronDown className={cn("size-4 text-faint transition-transform", !open && "-rotate-90")} />
        <span className="text-[13px] font-semibold">Tâches que j'ai confiées</span>
        <span className="text-[12px] tabular text-faint">{pending.length}</span>
        {pending.some((t) => t.overdue) && (
          <span className="text-[12px] text-danger">{pending.filter((t) => t.overdue).length} en retard</span>
        )}
      </button>
      {open && (
        <ul className="divide-y divide-line sm:px-4">
          {data.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => onOpen(t.id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-hover sm:px-4"
              >
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[13.5px]", t.completed && "text-faint line-through")}>
                    {t.title}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {t.assignee_name ?? "—"}
                    {t.place ? ` · ${t.place}` : ""}
                  </span>
                </span>
                {t.postpone_pending && <span className="text-[12px] text-warning">report demandé</span>}
                {!t.completed && t.done_declared_at && <span className="text-[12px] text-primary">à valider</span>}
                <span className={cn("text-[12px] tabular", t.overdue ? "font-medium text-danger" : "text-muted")}>
                  {t.completed ? "terminée" : t.due_on ? t.due_on.split("-").reverse().join("/") : "sans échéance"}
                </span>
              </button>
            </li>
          ))}
        </ul>
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

export function MyTasksPage() {
  const { data: me } = useMe();
  const { data: tasks } = useMyTasks();
  const { data: projects } = useProjects();
  const update = useUpdateTask();
  const shell = useShell();
  const [showDone, setShowDone] = useState(false);
  // Une tâche hors projet se range dans le registre de l'entité de la personne (lot T1)
  const { data: units } = useMyUnits();
  // L'entité de rattachement, même dirigée : pour la DG, la Direction générale et non la racine (T-9)
  const home = units?.find((u) => u.home) ?? units?.find((u) => u.role === "agent") ?? units?.[0];
  // Les livrables à produire en retard comptent avec les retards (T-6)
  const lateDeliverables = useLateDeliverables(me?.id);
  const [board, setBoard] = useState<UnitBoard | null>(null);
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
  const done = (tasks ?? [])
    .filter(match)
    .filter((t) => t.completed)
    .sort((a, b) => ((b.completed_at ?? "") < (a.completed_at ?? "") ? -1 : 1));

  return (
    <div className="mx-auto max-w-[1480px] pb-16">
      <header className="flex flex-wrap items-end gap-3 px-4 pb-5 pt-8 sm:px-8">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Mes tâches</h1>
          <Hint className="mt-1">
            Tout ce qui vous est assigné, dans vos projets et dans votre entité : livrables à produire ou à valider,
            puis tâches.
          </Hint>
        </div>
        {home && (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={newTask}>
            Tâche hors projet
          </Button>
        )}
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
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="accent-[var(--fg)]"
          />
          Afficher les terminées
        </label>
      </header>
      {board && <GiveTask board={board} self onClose={() => setBoard(null)} />}
      {/* Les livrables à produire ou à valider vivent dans leur projet ; ils se retrouvent ici (docs/PARCOURS-METIER.md) */}
      <div className="px-4 pb-6 sm:px-8">
        <MyDeliverables />
      </div>
      <div className="border-t border-line">
        {open.length === 0 && <Empty title="Vous êtes à jour">Aucune tâche ouverte ne vous est assignée.</Empty>}
        {!open.some(BUCKETS[0].test) && lateDeliverables > 0 && (
          <div className="flex h-10 items-center gap-2 border-b border-line px-4 sm:px-8">
            <span className="text-[13px] font-semibold text-danger">En retard</span>
            <span className="text-[12px] text-danger">
              {lateDeliverables} livrable{lateDeliverables > 1 ? "s" : ""} en retard, ci-dessus
            </span>
          </div>
        )}
        {BUCKETS.map((b) => {
          const items = open.filter(b.test);
          if (!items.length) return null;
          return (
            <section key={b.id}>
              <button
                onClick={() => setCollapsed({ ...collapsed, [b.id]: !collapsed[b.id] })}
                className="sticky top-0 z-10 flex h-10 w-full items-center gap-2 border-b border-line bg-bg/90 px-4 text-left backdrop-blur sm:px-8"
              >
                <ChevronDown
                  className={cn("size-4 text-faint transition-transform", collapsed[b.id] && "-rotate-90")}
                />
                <span className={cn("text-[13px] font-semibold", b.id === "overdue" && "text-danger")}>{b.label}</span>
                <span className="text-[12px] tabular text-faint">{items.length}</span>
                {b.id === "overdue" && lateDeliverables > 0 && (
                  <span className="text-[12px] text-danger">
                    + {lateDeliverables} livrable{lateDeliverables > 1 ? "s" : ""} en retard, ci-dessus
                  </span>
                )}
              </button>
              {!collapsed[b.id] && (
                <div className="sm:px-4">
                  {items.map((t) => (
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
          );
        })}
        <ConfidedTasks onOpen={(id) => shell.openTask(id)} />
        {showDone && done.length > 0 && (
          <section>
            <div className="flex h-10 items-center gap-2 border-b border-line px-4 sm:px-8">
              <span className="text-[13px] font-semibold text-muted">Terminées</span>
              <span className="text-[12px] text-faint">{done.length}</span>
            </div>
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
          </section>
        )}
      </div>
    </div>
  );
}
