import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertTriangle, ChevronRight, CircleCheck, Siren } from "lucide-react";
import { cn } from "@/components/ui";

/*
 * Tableau de bord DG — vue par direction (docs/GUIDE-FONCTIONNEL.md § 5.15). Une ligne par direction : appréciation
 * écrite (jamais la couleur seule) et ses raisons, santé des projets, avancement du plan face à l'attendu à date,
 * retards. Un clic descend au détail de la direction, puis de ses services.
 */

export interface DirectionStats {
  agents: number;
  projects: { total: number; on_track: number; at_risk: number; off_track: number; done: number };
  tasks: { open: number; overdue: number };
  decisions: { open: number; late: number };
  mail: { open: number; late: number };
  recommendations: { open: number; late: number };
  plan: { activities: number; progress: number | null; expected: number | null; behind: number; late: number };
  assessment: "sous_controle" | "vigilance" | "alerte";
  alerts: string[];
}
export interface DirectionRow extends DirectionStats {
  id: string;
  name: string;
  kind: string;
  manager_name: string | null;
  services?: number;
}

export const ASSESSMENT = {
  sous_controle: { label: "Sous contrôle", cls: "bg-success-soft text-success", Icon: CircleCheck },
  vigilance: { label: "Vigilance", cls: "bg-warning-soft text-warning", Icon: AlertTriangle },
  alerte: { label: "Alerte", cls: "bg-danger-soft text-danger", Icon: Siren },
} as const;

export function Assessment({ value }: { value: DirectionStats["assessment"] }) {
  const a = ASSESSMENT[value];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11.5px] font-medium",
        a.cls,
      )}
    >
      <a.Icon className="size-3" strokeWidth={2.25} />
      {a.label}
    </span>
  );
}

/** Avancement du plan : la barre est le réalisé, le trait vertical l'attendu à date. */
export function PlanBar({ progress, expected }: { progress: number | null; expected: number | null }) {
  if (progress === null) return <span className="text-[12px] text-faint">Pas de plan approuvé</span>;
  const behind = expected !== null && expected - progress >= 15;
  return (
    <span className="block min-w-[120px]">
      <span
        className="relative block h-1.5 rounded-full bg-hover"
        role="img"
        aria-label={`Réalisé ${progress} %${expected !== null ? `, attendu à date ${expected} %` : ""}`}
      >
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress}%` }} />
        {expected !== null && (
          <span
            className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-fg"
            style={{ left: `calc(${Math.min(expected, 100)}% - 1px)` }}
          />
        )}
      </span>
      <span className="mt-1 block text-[12px] tabular-nums text-muted">
        <span className={cn("font-medium text-fg", behind && "text-danger")}>{progress} %</span>
        {expected !== null && <> · attendu {expected} %</>}
      </span>
    </span>
  );
}

const Late = ({ n, label }: { n: number; label: string }) =>
  n ? (
    <span className="whitespace-nowrap">
      <span className="font-semibold tabular-nums text-danger">{n}</span> <span className="text-muted">{label}</span>
    </span>
  ) : null;

/** La carte « Par direction » du tableau de bord DG. */
export function ByDirection({ className }: { className?: string }) {
  const { data, error } = useQuery({
    queryKey: ["pilotage-directions"],
    queryFn: () =>
      api.get<{ today: string; agency: DirectionRow | null; directions: DirectionRow[] }>("/api/pilotage/directions"),
  });
  const alerts = data?.directions.filter((d) => d.assessment === "alerte").length ?? 0;
  return (
    <section id="par-direction" className={cn("flex min-w-0 flex-col scroll-mt-4 rounded-2xl border border-line bg-panel", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
        <h2 className="text-[14.5px] font-semibold tracking-[-0.01em]">Par direction</h2>
        {data && (
          <span className="text-[12px] text-muted">
            {data.directions.length} direction{data.directions.length > 1 ? "s" : ""}
            {alerts ? ` · ${alerts} en alerte` : ""} · le trait marque l'avancement attendu à date
          </span>
        )}
      </div>
      {error ? (
        <p className="px-5 pb-5 text-[13px] text-danger">{(error as Error).message}</p>
      ) : !data ? (
        <p className="px-5 pb-5 text-[13px] text-muted">Chargement…</p>
      ) : (
        <DirectionTable
          rows={[
            // Ce qui est rattaché à l'Agence elle-même (son plan, son courrier), en tête (I-16)
            ...(data.agency ? [{ ...data.agency, name: `${data.agency.name} · niveau de l'Agence` }] : []),
            ...data.directions,
          ]}
          empty="Aucune direction : créez-les dans Organisation › Structure."
        />
      )}
    </section>
  );
}

/** Le tableau des directions (ou des services d'une direction). */
export function DirectionTable({ rows, empty }: { rows: DirectionRow[]; empty?: string }) {
  if (!rows.length) return <p className="px-5 pb-5 text-[13px] text-muted">{empty ?? "Aucune entité."}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[12px] text-muted">
            <th className="px-5 py-2 font-medium">Entité</th>
            <th className="px-3 py-2 font-medium">Appréciation</th>
            <th className="px-3 py-2 font-medium">Projets</th>
            <th className="px-3 py-2 font-medium">Plan de travail</th>
            <th className="px-3 py-2 font-medium">Retards</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="group border-b border-line last:border-0 hover:bg-hover">
              <td className="px-5 py-3 align-top">
                <Link to={`/pilotage/directions/${d.id}`} className="block font-medium hover:underline">
                  {d.name}
                </Link>
                <span className="block text-[12px] text-muted">
                  {d.manager_name ?? "Sans chef désigné"} · {d.agents} agent{d.agents > 1 ? "s" : ""}
                  {d.services ? ` · ${d.services} service${d.services > 1 ? "s" : ""}` : ""}
                </span>
              </td>
              <td className="max-w-[260px] px-3 py-3 align-top">
                <Assessment value={d.assessment} />
                {d.alerts.length > 0 && (
                  <span className="mt-1 block text-[12px] leading-snug text-muted">
                    {d.alerts.slice(0, 2).join(" · ")}
                  </span>
                )}
              </td>
              <td className="px-3 py-3 align-top">
                <span className="block font-medium tabular-nums">{d.projects.total}</span>
                {d.projects.total > 0 && (
                  <span className="block text-[12px] text-muted">
                    {[
                      d.projects.off_track && `${d.projects.off_track} en difficulté`,
                      d.projects.at_risk && `${d.projects.at_risk} à surveiller`,
                      d.projects.on_track && `${d.projects.on_track} dans les temps`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </td>
              <td className="px-3 py-3 align-top">
                <PlanBar progress={d.plan.progress} expected={d.plan.expected} />
              </td>
              <td className="px-3 py-3 align-top text-[12.5px]">
                <span className="flex flex-col gap-0.5">
                  <Late n={d.tasks.overdue} label={`tâche${d.tasks.overdue > 1 ? "s" : ""}`} />
                  <Late n={d.decisions.late} label={`décision${d.decisions.late > 1 ? "s" : ""}`} />
                  <Late n={d.mail.late} label="courrier" />
                  <Late n={d.recommendations.late} label={`recommandation${d.recommendations.late > 1 ? "s" : ""}`} />
                  {!d.tasks.overdue && !d.decisions.late && !d.mail.late && !d.recommendations.late && (
                    <span className="text-muted">Aucun</span>
                  )}
                </span>
              </td>
              <td className="pr-4 align-middle">
                <Link to={`/pilotage/directions/${d.id}`} aria-label={`Ouvrir ${d.name}`}>
                  <ChevronRight className="size-4 text-faint group-hover:text-fg" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
