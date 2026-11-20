import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertTriangle, CircleCheck, Siren } from "lucide-react";
import { cn } from "@/components/ui";

/*
 * Tableau de bord DG — vue par direction (docs/GUIDE-FONCTIONNEL.md § 5.15). Une ligne par direction : appréciation
 * écrite (jamais la couleur seule) et ses raisons, santé des projets, avancement du plan face à l'attendu à date,
 * retards. Un clic descend au détail de la direction, puis de ses services.
 */

export interface DirectionStats {
  agents: number;
  projects: {
    total: number;
    on_track: number;
    at_risk: number;
    off_track: number;
    done: number;
  };
  tasks: { open: number; overdue: number };
  decisions: { open: number; late: number };
  mail: { open: number; late: number };
  recommendations: { open: number; late: number };
  plan: {
    activities: number;
    progress: number | null;
    expected: number | null;
    behind: number;
    late: number;
  };
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
  sous_controle: {
    label: "Sous contrôle",
    cls: "bg-success-soft text-success",
    Icon: CircleCheck,
  },
  vigilance: {
    label: "Vigilance",
    cls: "bg-warning-soft text-warning",
    Icon: AlertTriangle,
  },
  alerte: { label: "Alerte", cls: "bg-danger-soft text-danger", Icon: Siren },
} as const;

export function Assessment({ value }: { value: DirectionStats["assessment"] }) {
  const a = ASSESSMENT[value];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-[12.5px] font-medium",
        a.cls,
      )}
    >
      {a.label}
    </span>
  );
}

/** Avancement du plan : la barre est le réalisé, le trait vertical l'attendu à date. */
export function PlanBar({
  progress,
  expected,
}: {
  progress: number | null;
  expected: number | null;
}) {
  if (progress === null)
    return <span className="text-faint">—</span>;
  const behind = expected !== null && expected - progress >= 15;
  return (
    <span className="flex min-w-[150px] items-center gap-3" title={expected !== null ? `Réalisé ${progress} %, attendu à date ${expected} % (le trait)` : `Réalisé ${progress} %`}>
      <span
        className="relative block h-1.5 flex-1 rounded-full bg-hover"
        role="img"
        aria-label={`Réalisé ${progress} %${expected !== null ? `, attendu à date ${expected} %` : ""}`}
      >
        <span
          className={cn(
            "bar-fill absolute inset-y-0 left-0 rounded-full",
            behind ? "bg-danger" : expected !== null && progress >= expected ? "bg-success" : "bg-warning",
          )}
          style={{ width: `${progress}%` }}
        />
        {expected !== null && (
          <span
            className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-fg"
            style={{ left: `calc(${Math.min(expected, 100)}% - 1px)` }}
          />
        )}
      </span>
      <span className="w-10 text-right text-[12.5px] tabular-nums">
        <span className={cn("font-medium text-fg", behind && "text-danger")}>
          {progress} %
        </span>
      </span>
    </span>
  );
}


/** La carte « Par direction » du tableau de bord DG. */
export function ByDirection({ className }: { className?: string }) {
  const { data, error } = useQuery({
    queryKey: ["pilotage-directions"],
    queryFn: () =>
      api.get<{
        today: string;
        agency: DirectionRow | null;
        directions: DirectionRow[];
      }>("/api/pilotage/directions"),
  });
  return (
    <section id="par-direction" className={cn("min-w-0 scroll-mt-4 overflow-hidden rounded-2xl border border-line bg-panel shadow-sm", className)}>
      <h2 className="px-4 pb-1 pt-3.5 text-[14px] font-medium">Directions</h2>
      {error ? (
        <p className="px-5 pb-5 text-[13px] text-danger">
          {(error as Error).message}
        </p>
      ) : !data ? (
        <p className="px-5 pb-5 text-[13px] text-muted">Chargement…</p>
      ) : (
        <DirectionTable
          rows={[
            // Ce qui est rattaché à l'Agence elle-même (son plan, son courrier), en tête (I-16)
            ...(data.agency
              ? [
                  {
                    ...data.agency,
                    name: "Agence",
                  },
                ]
              : []),
            ...data.directions,
          ]}
          empty="Aucune direction : créez-les dans Organisation › Structure."
        />
      )}
    </section>
  );
}

/** Le tableau des directions (ou des services d'une direction). */
export function DirectionTable({
  rows,
  empty,
}: {
  rows: DirectionRow[];
  empty?: string;
}) {
  if (!rows.length)
    return (
      <p className="px-5 pb-5 text-[13px] text-muted">
        {empty ?? "Aucune entité."}
      </p>
    );
  return (
    <div className="grid-scroll">
      <table className="grid-table min-w-[640px]">
        <thead>
          <tr className="text-left text-[12px] text-muted">
            <th className="py-2.5 pl-4 pr-3 font-normal">Entité</th>
            <th className="px-3 py-2.5 font-normal">État</th>
            <th className="px-3 py-2.5 text-right font-normal">Projets</th>
            <th className="px-3 py-2.5 font-normal">Plan de travail</th>
            <th className="py-2.5 pl-3 pr-4 text-right font-normal">Retards</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const late = d.tasks.overdue + d.decisions.late + d.mail.late + d.recommendations.late + d.plan.late;
            return (
              <tr key={d.id} className="border-t border-line hover:bg-hover">
                <td
                  className={cn(
                    "border-l-[3px] py-3 pl-[13px] pr-3",
                    d.assessment === "alerte" ? "border-l-danger" : d.assessment === "vigilance" ? "border-l-warning" : "border-l-transparent",
                  )}
                >
                  <Link to={`/pilotage/directions/${d.id}`} className="hover:underline">
                    {d.name}
                  </Link>
                </td>
                <td className="px-3 py-3" title={d.alerts.slice(0, 3).join(" · ") || undefined}>
                  <Assessment value={d.assessment} />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{d.projects.total || <span className="text-faint">—</span>}</td>
                <td className="px-3 py-3">
                  <PlanBar progress={d.plan.progress} expected={d.plan.expected} />
                </td>
                <td className="py-3 pl-3 pr-4 text-right tabular-nums">
                  {late ? <span className="font-semibold text-danger">{late}</span> : <span className="text-faint">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
