import { type ReactNode, useId } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { addDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import { cn } from "./ui";

/*
 * Un composant par nature de contenu (demande de l'utilisateur, 20/11/2026) : un agenda se lit comme un agenda, des
 * risques comme une matrice ; une bascule permet de revenir à la liste. Le choix de vue se retient par bloc.
 */

/** Bascule de vue : piste grise, vue active sur fond blanc. */
export function ViewSwitch<T extends string>({
  value,
  onChange,
  options,
  label = "Affichage",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; Icon?: LucideIcon }[];
  label?: string;
}) {
  const group = useId();
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg bg-hover p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "relative inline-flex h-6 items-center gap-1 rounded-md px-2 text-[12px] transition-colors duration-200",
            value === o.id ? "font-medium text-fg" : "text-muted hover:text-fg",
          )}
        >
          {value === o.id && (
            <motion.span
              layoutId={`view-${group}`}
              className="absolute inset-0 rounded-md border border-line bg-panel shadow-sm"
              transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
            />
          )}
          <span className="relative inline-flex items-center gap-1">
            {o.Icon && <o.Icon className="size-3.5" />}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export interface AgendaEvent {
  id: string;
  title: string;
  date: string;
  href: string;
  color?: string;
  kind?: string;
}

/** La semaine en sept colonnes : aujourd'hui en évidence, chaque rendez-vous à sa couleur de nature. */
export function WeekAgenda({ start, events }: { start: string; events: AgendaEvent[] }) {
  const days = Array.from({ length: 7 }, (_, n) => {
    const d = addDays(parseISO(start), n);
    const key = format(d, "yyyy-MM-dd");
    return { key, d, events: events.filter((e) => e.date === key) };
  });
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[560px] grid-cols-7 border-t border-line">
        {days.map((day, n) => (
          <div key={day.key} className={cn("min-h-[148px] border-line px-1.5 pb-2 pt-2.5", n > 0 && "border-l", n === 0 && "bg-brand-soft/50")}>
            <p className="flex items-center gap-1.5 px-1 pb-2.5">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[12.5px] font-semibold tabular",
                  n === 0 && "bg-primary text-on-primary",
                )}
              >
                {format(day.d, "d")}
              </span>
              <span className={cn("text-[11.5px] capitalize", n === 0 ? "font-medium text-primary" : "text-muted")}>
                {format(day.d, "EEE", { locale: fr }).replace(".", "")}
              </span>
            </p>
            <ul className="space-y-1">
              {day.events.map((e) => (
                <li key={e.id}>
                  <Link
                    to={e.href}
                    title={e.kind ? `${e.title} · ${e.kind}` : e.title}
                    className="block rounded-lg py-1 pl-2.5 pr-1.5 text-[11.5px] font-medium leading-snug transition-[transform,filter] duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110"
                    style={{
                      background: `color-mix(in oklab, ${e.color ?? "var(--primary)"} 15%, var(--panel))`,
                      boxShadow: `inset 3px 0 0 ${e.color ?? "var(--primary)"}, inset 0 0 0 1px color-mix(in oklab, ${e.color ?? "var(--primary)"} 26%, transparent)`,
                    }}
                  >
                    <span className="line-clamp-2 hyphens-auto break-words" lang="fr">{e.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface MatrixRisk {
  id: string;
  title: string;
  probability: number;
  impact: number;
  score: number;
}
const level = (score: number) => (score >= 15 ? "danger" : score >= 8 ? "warning" : "success");
const CELL = {
  danger: "bg-danger-soft",
  warning: "bg-warning-soft",
  success: "bg-success-soft",
} as const;
const DOT = {
  danger: "bg-danger text-white",
  warning: "bg-warning text-white",
  success: "bg-success text-white",
} as const;

/**
 * Matrice des risques : la probabilité monte, l'impact va vers la droite ; la couleur d'une case dit son niveau, chaque
 * pastille est un risque (son numéro renvoie à la légende).
 */
export function RiskMatrix({
  risks,
  onOpen,
  legend = true,
}: {
  risks: MatrixRisk[];
  onOpen?: (id: string) => void;
  legend?: boolean;
}) {
  const ranked = [...risks].sort((a, b) => b.score - a.score);
  const no = new Map(ranked.map((r, i) => [r.id, i + 1]));
  const dot = (r: MatrixRisk, extra?: string): ReactNode => (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold tabular",
        DOT[level(r.score)],
        extra,
      )}
    >
      {no.get(r.id)}
    </span>
  );
  return (
    <div className={cn("grid gap-x-6 gap-y-4", legend && "sm:grid-cols-[minmax(0,230px)_minmax(0,1fr)]")}>
      <div>
        <div className="flex gap-1.5">
          <span className="flex rotate-180 items-center justify-center text-[11px] text-muted [writing-mode:vertical-rl]">Probabilité</span>
          <div className="grid flex-1 grid-cols-5 gap-1" role="img" aria-label="Matrice probabilité × impact">
            {[5, 4, 3, 2, 1].flatMap((p) =>
              [1, 2, 3, 4, 5].map((i) => {
                const here = ranked.filter((r) => r.probability === p && r.impact === i);
                return (
                  <div
                    key={`${p}-${i}`}
                    className={cn("flex aspect-square flex-wrap content-center items-center justify-center gap-0.5 rounded-md", CELL[level(p * i)])}
                  >
                    {here.map((r) =>
                      onOpen ? (
                        <button key={r.id} type="button" title={r.title} aria-label={r.title} onClick={() => onOpen(r.id)}>
                          {dot(r, "ring-2 ring-panel hover:scale-110 transition-transform")}
                        </button>
                      ) : (
                        <span key={r.id} title={r.title}>
                          {dot(r, "ring-2 ring-panel")}
                        </span>
                      ),
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
        <p className="mt-1.5 pl-5 text-center text-[11px] text-muted">Impact</p>
      </div>
      {legend && (
        <ol className="min-w-0 self-center">
          {ranked.slice(0, 6).map((r) => (
            <li key={r.id} className="flex items-center gap-2.5 border-t border-line py-2 text-[13px] first:border-t-0">
              {dot(r)}
              {onOpen ? (
                <button type="button" onClick={() => onOpen(r.id)} className="min-w-0 flex-1 truncate text-left hover:underline">
                  {r.title}
                </button>
              ) : (
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
              )}
              <span className="shrink-0 text-[12px] tabular text-muted">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
