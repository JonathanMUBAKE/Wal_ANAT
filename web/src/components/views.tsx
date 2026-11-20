import { type ReactNode, useId, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { addDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "./ui";

/*
 * Un composant par nature de contenu (demande de l'utilisateur, 20/11/2026) : un agenda se lit comme un agenda, des
 * risques comme une matrice ; une bascule permet de revenir à la liste. Le choix de vue se retient par bloc.
 */

export interface AgendaEvent {
  id: string;
  title: string;
  date: string;
  href: string;
  color?: string;
  kind?: string;
  /** Heure de début « HH:MM » ; absente pour un rendez-vous sur la journée. */
  time?: string | null;
  place?: string | null;
}
const hour = (t: string) => `${Number(t.slice(0, 2))} h ${t.slice(3, 5)}`;

/**
 * La semaine en une frise de sept jours ; le jour choisi déroule ses rendez-vous en entier : heure, titre, lieu.
 * Rien n'est coupé dans une case étroite : la vue d'ensemble tient dans les points de couleur sous chaque jour.
 */
export function WeekAgenda({ start, events }: { start: string; events: AgendaEvent[] }) {
  const group = useId();
  const days = Array.from({ length: 7 }, (_, n) => {
    const d = addDays(parseISO(start), n);
    const key = format(d, "yyyy-MM-dd");
    return { key, d, events: events.filter((e) => e.date === key) };
  });
  // Au départ : aujourd'hui, ou le premier jour qui a quelque chose
  const [picked, setPicked] = useState<string | null>(null);
  const day = days.find((d) => d.key === picked) ?? (days[0].events.length ? days[0] : (days.find((d) => d.events.length) ?? days[0]));
  return (
    <div className="border-t border-line">
      <div role="tablist" aria-label="Jours de la semaine" className="grid grid-cols-7 gap-1 px-3 pt-3">
        {days.map((d, n) => {
          const on = d.key === day.key;
          return (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${format(d.d, "EEEE d MMMM", { locale: fr })}, ${d.events.length} rendez-vous`}
              onClick={() => setPicked(d.key)}
              className={cn(
                "relative flex h-[66px] flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200",
                !on && "hover:bg-hover",
              )}
            >
              {on && (
                <motion.span
                  layoutId={`day-${group}`}
                  className="absolute inset-0 rounded-xl border border-line-strong bg-hover"
                  transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
                />
              )}
              <span className={cn("relative text-[11.5px] capitalize leading-none", n === 0 ? "font-medium text-primary" : "text-muted")}>
                {format(d.d, "EEE", { locale: fr }).replace(".", "")}
              </span>
              <span
                className={cn(
                  "relative text-[16px] font-semibold leading-none tabular",
                  !d.events.length && !on && "font-normal text-muted",
                )}
              >
                {format(d.d, "d")}
              </span>
              <span className="relative flex h-1.5 items-center gap-[3px]">
                {d.events.slice(0, 3).map((e) => (
                  <span key={e.id} className="size-1.5 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <motion.ul
        key={day.key}
        role="tabpanel"
        className="min-h-[140px] px-3 pb-3 pt-2"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {day.events.map((e) => (
          <li key={e.id}>
            <Link
              to={e.href}
              title={[e.title, e.kind, e.place].filter(Boolean).join(", ")}
              className="flex h-11 items-center gap-3 rounded-lg px-2 transition-colors duration-150 hover:bg-hover"
            >
              <span className="w-[54px] shrink-0 whitespace-nowrap text-[12.5px] tabular text-muted">
                {e.time ? hour(e.time) : "Journée"}
              </span>
              <span className="h-5 w-[3px] shrink-0 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{e.title}</span>
              <span className="hidden max-w-[42%] shrink-0 truncate text-[12.5px] text-muted sm:block">{e.place || e.kind}</span>
            </Link>
          </li>
        ))}
        {!day.events.length && <li className="flex h-11 items-center px-2 text-[13px] text-faint">Rien de prévu ce jour</li>}
      </motion.ul>
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
          <span className="flex rotate-180 items-center justify-center text-[12px] text-muted [writing-mode:vertical-rl]">Probabilité</span>
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
        <p className="mt-1.5 pl-5 text-center text-[12px] text-muted">Impact</p>
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
