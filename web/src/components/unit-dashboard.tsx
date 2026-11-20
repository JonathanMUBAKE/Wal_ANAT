import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  FolderKanban,
  Gauge,
  Landmark,
  Plus,
} from "lucide-react";
import { UpcomingMeetingList } from "@/components/upcoming-meetings";
import { Button, ProjectIcon, cn } from "@/components/ui";
import { frDate } from "@/components/gov";
import { useShell } from "@/lib/shell";
import { useTaskMenu } from "@/lib/context-menu";
import type { UnitDashboard } from "@/lib/types";

/*
 * Tableau de bord d'une entité (Mon entité › Vue d'ensemble). Règles de visualisation (skill dataviz) :
 * une seule échelle par graphique, barres fines à bouts arrondis posées sur la ligne de base, 2 px d'écart entre
 * segments, légende dès deux séries, survol avec infobulle, couleur d'état réservée au retard (toujours avec son
 * libellé), grille discrète, données disponibles en tableau.
 */

const PRIORITY: Record<string, string> = {
  urgent: "Urgente",
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
  none: "Sans priorité",
};
const STATUS: Record<string, string> = {
  on_track: "En bonne voie",
  at_risk: "À risque",
  off_track: "En difficulté",
  done: "Terminé",
};

function Card({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-panel p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Tile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone?: "danger";
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-4 py-3.5 shadow-sm">
      <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
        <span className={cn("text-faint", tone === "danger" && "text-danger")}>{icon}</span>
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

const weekLabel = (iso: string, last: boolean) =>
  last ? "Cette sem." : `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

/** Tâches créées et terminées, semaine par semaine : deux séries, une échelle, barres groupées. */
function Trend({ data }: { data: UnitDashboard["trend"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.completed]));
  const step = max <= 4 ? 1 : Math.ceil(max / 4);
  const top = step * Math.ceil(max / step);
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  const H = 160;
  return (
    <div>
      <div className="relative flex gap-2" style={{ height: H + 24 }}>
        <div className="relative w-6 shrink-0 text-right text-[11px] text-faint" style={{ height: H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: H - (t / top) * H }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-line"
              style={{ top: H - (t / top) * H, borderStyle: t === 0 ? "solid" : "dashed" }}
            />
          ))}
          <div className="absolute inset-x-0 top-0 flex" style={{ height: H }}>
            {data.map((d, i) => (
              <div
                key={d.week}
                className={cn(
                  "relative flex flex-1 items-end justify-center gap-[2px] rounded-md",
                  hover === i && "bg-hover",
                )}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {(
                  [
                    [d.created, "var(--viz-1)"],
                    [d.completed, "var(--viz-2)"],
                  ] as const
                ).map(([v, color], k) => (
                  <div
                    key={k}
                    className="w-[10px] rounded-t-[4px] sm:w-[14px]"
                    style={{ height: v ? Math.max(3, (v / top) * H) : 0, background: color }}
                  />
                ))}
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 w-max rounded-lg border border-line bg-panel px-3 py-2 text-[12px] shadow-lg">
                    <p className="font-medium">Semaine du {frDate(d.week)}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-muted">
                      <span className="size-2 rounded-[2px]" style={{ background: "var(--viz-1)" }} />
                      Créées : <span className="font-medium text-fg tabular-nums">{d.created}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-muted">
                      <span className="size-2 rounded-[2px]" style={{ background: "var(--viz-2)" }} />
                      Terminées : <span className="font-medium text-fg tabular-nums">{d.completed}</span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 flex" style={{ top: H + 6 }}>
            {data.map((d, i) => (
              <span key={d.week} className="flex-1 text-center text-[11px] text-faint">
                {weekLabel(d.week, i === data.length - 1)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="mt-2 text-[12px] text-muted">
        <summary className="cursor-pointer">Voir les données</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr>
              <th className="py-1 font-medium">Semaine du</th>
              <th className="py-1 font-medium">Créées</th>
              <th className="py-1 font-medium">Terminées</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.week} className="border-t border-line">
                <td className="py-1">{frDate(d.week)}</td>
                <td className="py-1 tabular-nums">{d.created}</td>
                <td className="py-1 tabular-nums">{d.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Barres horizontales d'une seule série : la longueur dit la quantité, la valeur est écrite. */
function BarList({ rows }: { rows: { key: string; label: string; count: number; danger?: boolean }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[120px_1fr_32px] items-center gap-3 text-[13px]">
          <span
            className={cn("flex items-center gap-1.5 truncate text-muted", r.danger && r.count > 0 && "text-danger")}
          >
            {r.danger && r.count > 0 && <AlertTriangle className="size-3.5 shrink-0" />}
            {r.label}
          </span>
          <span className="h-2.5 rounded-full bg-hover" title={`${r.label} : ${r.count}`}>
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(r.count / max) * 100}%`,
                minWidth: r.count ? 6 : 0,
                background: r.danger ? "var(--danger)" : "var(--viz-1)",
              }}
            />
          </span>
          <span className="text-right font-medium tabular-nums">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

/** Charge par agent : barre empilée « en retard » (état, libellé dans la légende) + « autres ouvertes ». */
function Workload({ rows }: { rows: NonNullable<UnitDashboard["workload"]> }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.open));
  if (!rows.length) return <p className="text-[13px] text-muted">Aucun agent n'est rangé dans cette entité.</p>;
  return (
    <div className="space-y-3">
      <Legend
        items={[
          { label: "En retard", color: "var(--danger)" },
          { label: "Autres tâches ouvertes", color: "var(--viz-1)" },
        ]}
      />
      <ul className="space-y-2.5">
        {[...rows]
          .sort((a, b) => Number(!!b.is_head) - Number(!!a.is_head) || b.open - a.open)
          .map((r) => (
            <li
              key={r.user_id}
              className="relative grid grid-cols-[150px_1fr_40px] items-center gap-3 text-[13px]"
              onMouseEnter={() => setHover(r.user_id)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="truncate">
                {r.name}
                <span className="block truncate text-[11.5px] text-faint">
                  {r.is_head ? "Responsable · " : ""}
                  {r.unit_name}
                </span>
              </span>
              <span className="flex h-3 gap-[2px]">
                {r.overdue > 0 && (
                  <span
                    className="rounded-l-[4px]"
                    style={{ width: `${(r.overdue / max) * 100}%`, minWidth: 6, background: "var(--danger)" }}
                  />
                )}
                {r.open - r.overdue > 0 && (
                  <span
                    className={cn("rounded-r-[4px]", r.overdue === 0 && "rounded-l-[4px]")}
                    style={{ width: `${((r.open - r.overdue) / max) * 100}%`, minWidth: 6, background: "var(--viz-1)" }}
                  />
                )}
              </span>
              <span className="text-right font-medium tabular-nums">{r.open}</span>
              {hover === r.user_id && (
                <div className="pointer-events-none absolute left-[160px] top-full z-10 mt-1 w-max rounded-lg border border-line bg-panel px-3 py-2 text-[12px] shadow-lg">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-muted">
                    {r.open} ouverte(s) · <span className="text-danger">{r.overdue} en retard</span> · {r.due_soon} sous
                    7 jours · {r.done_30} terminée(s) en 30 jours
                  </p>
                </div>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}

function TaskList({ rows, empty, late }: { rows: UnitDashboard["overdue"]; empty: string; late?: boolean }) {
  const shell = useShell();
  const taskMenu = useTaskMenu();
  if (!rows.length) return <p className="py-4 text-center text-[13px] text-muted">{empty}</p>;
  return (
    <ul className="-mx-2 divide-y divide-line">
      {rows.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => shell.openTask(t.id)}
            onContextMenu={taskMenu(t)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-hover"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">{t.title}</span>
              <span className="block truncate text-[12px] text-muted">
                {t.assignee_name ?? "Non attribuée"}
                {t.project_name ? ` · ${t.project_name}` : " · Tâche d'entité"}
              </span>
            </span>
            <span
              className={cn("shrink-0 text-[12.5px] tabular-nums", late ? "font-medium text-danger" : "text-muted")}
            >
              {frDate(t.due_on)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function UnitProjects({ rows, onCreate }: { rows: UnitDashboard["projects"]; onCreate?: () => void }) {
  const nav = useNavigate();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((p) => (
        <button
          type="button"
          key={p.id}
          onClick={() => nav(`/projects/${p.id}`)}
          className="rounded-xl border border-line p-4 text-left transition-colors hover:border-line-strong hover:bg-hover"
        >
          <span className="flex items-center gap-2.5">
            <ProjectIcon icon={p.icon} color={p.color} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{p.name}</span>
              <span className="block truncate text-[12px] text-muted">
                {p.role === "contribue" ? "Contribution · " : ""}
                {STATUS[p.status] ?? p.status}
                {p.owner_name ? ` · ${p.owner_name}` : ""}
              </span>
            </span>
          </span>
          <span className="mt-3 flex items-center gap-2 text-[12px] text-muted">
            <span className="h-2 flex-1 rounded-full bg-hover">
              <span
                className="block h-full rounded-full"
                style={{ width: `${p.progress}%`, minWidth: p.progress ? 6 : 0, background: "var(--viz-1)" }}
              />
            </span>
            <span className="tabular-nums">{p.progress} %</span>
          </span>
          <span className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-muted">
            <span>
              {p.done_count}/{p.task_count} tâches
            </span>
            {p.overdue_count > 0 && (
              <span className="flex items-center gap-1 text-danger">
                <AlertTriangle className="size-3" />
                {p.overdue_count} en retard
              </span>
            )}
            {p.due_on && <span>Échéance {frDate(p.due_on)}</span>}
          </span>
        </button>
      ))}
      {onCreate && (
      <button
        type="button"
        onClick={onCreate}
        className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line p-4 text-[13px] text-muted hover:border-line-strong hover:text-fg"
      >
        <Plus className="size-5" />
        Nouveau projet de l'entité
      </button>
      )}
    </div>
  );
}

export function UnitDashboardView({
  data,
  onNewProject,
  onNewTask,
}: {
  data: UnitDashboard;
  onNewProject?: () => void;
  onNewTask: () => void;
}) {
  const k = data.kpis;
  const responsable = data.role === "responsable";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile
          label="Tâches ouvertes"
          value={k.open}
          hint={k.unassigned ? `dont ${k.unassigned} non attribuée(s)` : "toutes attribuées"}
          icon={<CircleDot className="size-3.5" />}
        />
        <Tile
          label="En retard"
          value={k.overdue}
          hint={k.overdue ? "à traiter en priorité" : "aucun retard"}
          icon={<AlertTriangle className="size-3.5" />}
          tone={k.overdue ? "danger" : undefined}
        />
        <Tile
          label="Sous 7 jours"
          value={k.due_week}
          hint="échéances à venir"
          icon={<CalendarClock className="size-3.5" />}
        />
        <Tile
          label="Terminées (30 j)"
          value={k.done_30}
          hint={responsable && k.agents !== null ? `${k.agents} agent(s) suivi(s)` : undefined}
          icon={<CheckCircle2 className="size-3.5" />}
        />
        <div className="col-span-2 rounded-2xl border border-line bg-panel px-4 py-3.5 shadow-sm lg:col-span-1">
          <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <Gauge className="size-3.5 text-faint" />
            Achèvement (30 j)
          </p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
            {k.completion_rate} %
          </p>
          <span
            className="mt-2.5 block h-1.5 rounded-full bg-hover"
            role="img"
            aria-label={`${k.completion_rate} % des tâches terminées sur 30 jours`}
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${k.completion_rate}%`,
                minWidth: k.completion_rate ? 6 : 0,
                background: "var(--viz-1)",
              }}
            />
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Réunions de l'entité" aside={<Landmark className="size-4 text-faint" />}>
          <UpcomingMeetingList
            rows={data.meetings.unit}
            empty={
              responsable
                ? "Aucune réunion prévue. Programmez la réunion hebdomadaire de l'entité depuis « Réunion »."
                : "Aucune réunion de l'entité n'est prévue."
            }
          />
        </Card>
        <Card title="Où vous êtes attendu·e" aside={<CalendarDays className="size-4 text-faint" />}>
          {/* Une réunion déjà listée pour l'entité ne se répète pas ici (E-5) */}
          <UpcomingMeetingList
            rows={data.meetings.mine.filter((m) => !data.meetings.unit.some((u) => u.id === m.id))}
            empty={
              data.meetings.mine.length
                ? "Vos autres réunions sont celles de l'entité, ci-contre."
                : "Aucune réunion prévue où vous êtes convoqué·e."
            }
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card
          title="Activité des 8 dernières semaines"
          className="lg:col-span-8"
          aside={
            <Legend
              items={[
                { label: "Créées", color: "var(--viz-1)" },
                { label: "Terminées", color: "var(--viz-2)" },
              ]}
            />
          }
        >
          <Trend data={data.trend} />
        </Card>
        <Card title="Échéances des tâches" className="lg:col-span-4">
          <BarList
            rows={data.by_status.map((s) => ({
              key: s.key,
              label: s.label,
              count: s.count,
              danger: s.key === "overdue",
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {responsable && data.workload ? (
          <Card title="Charge des agents" className="lg:col-span-8">
            <Workload rows={data.workload} />
          </Card>
        ) : (
          <Card
            title="Cette semaine"
            className="lg:col-span-8"
            aside={
              <Button size="sm" icon={<Plus className="size-3.5" />} onClick={onNewTask}>
                Tâche
              </Button>
            }
          >
            <TaskList rows={data.upcoming} empty="Aucune échéance dans les 7 prochains jours." />
          </Card>
        )}
        <Card title="Tâches ouvertes par priorité" className="lg:col-span-4">
          <BarList
            rows={data.by_priority.map((p) => ({
              key: p.priority,
              label: PRIORITY[p.priority] ?? p.priority,
              count: p.count,
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`En retard (${k.overdue})`}>
          <TaskList rows={data.overdue} empty="Aucune tâche en retard." late />
        </Card>
        {responsable ? (
          <Card
            title="Cette semaine"
            aside={
              <Button size="sm" icon={<Plus className="size-3.5" />} onClick={onNewTask}>
                Confier
              </Button>
            }
          >
            <TaskList rows={data.upcoming} empty="Aucune échéance dans les 7 prochains jours." />
          </Card>
        ) : (
          <Card title="Projets de l'entité">
            <p className="text-[13px] text-muted">
              {data.projects.length
                ? `${data.projects.length} projet(s) porté(s) par l'entité, détaillés ci-dessous.`
                : "Aucun projet n'est encore porté par l'entité."}
            </p>
          </Card>
        )}
      </div>

      <Card
        title={`Projets de l'entité : ${data.projects.filter((p) => p.role !== "contribue").length} porté(s), ${data.projects.filter((p) => p.role === "contribue").length} en contribution`}
        aside={<FolderKanban className="size-4 text-faint" />}
      >
        <UnitProjects rows={data.projects} onCreate={onNewProject} />
      </Card>
    </div>
  );
}
