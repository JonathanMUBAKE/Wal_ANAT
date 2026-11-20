import { type ReactNode } from "react";
import { cn } from "./ui";

/*
 * Un composant par nature de contenu (demande de l'utilisateur, 20/11/2026) : un agenda se lit comme un agenda, des
 * risques comme une matrice ; une bascule permet de revenir à la liste. Le choix de vue se retient par bloc.
 */

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
    // La matrice et sa légende se mettent côte à côte quand la carte est assez large, l'une sous l'autre sinon
    <div className="@container">
    <div className={cn("grid gap-x-6 gap-y-4", legend && "@lg:grid-cols-[minmax(0,230px)_minmax(0,1fr)]")}>
      <div className="mx-auto w-full max-w-[236px] @lg:max-w-none">
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
        <ol className="min-w-0 self-center [&>li:nth-child(n+4)]:hidden @lg:[&>li:nth-child(n+4)]:flex">
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
    </div>
  );
}
