import { useEffect, useRef, useState, type ReactNode } from "react";
import { Chart, registerables, type ChartConfiguration } from "chart.js";
import type { ScriptableContext } from "chart.js";
import { cx, fmt, jeton, voiler, type Format } from "../lib/format";
import { useApp } from "../lib/contexte";
import type { Serie } from "../lib/donnees";
import { Bouton, Carte, TeteCarte } from "./Primitives";

Chart.register(...registerables);

/* =========================================================================
   RÈGLES TENUES ICI
   - un seul axe de valeurs par graphique (jamais deux échelles opposées) ;
   - marques fines, grille effacée, étiquettes en encre et non en couleur
     de série ;
   - légende dès deux séries, avec une valeur qui dit ce qu'elle est ;
   - repli tabulaire disponible sous chaque graphique.
   ========================================================================= */

export function optionsCommunes() {
  const encre3 = jeton("--encre-3"), grille = jeton("--bordure");
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 420 as const },
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: jeton("--surface"),
        titleColor: jeton("--encre"),
        bodyColor: jeton("--encre-2"),
        borderColor: jeton("--bordure-2"),
        borderWidth: 1, padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
        titleFont: { weight: 600 as const, size: 12 }, bodyFont: { size: 12 },
      },
    },
    scales: {
      x: {
        grid: { display: false }, border: { color: grille },
        ticks: { color: encre3, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 18 },
      },
      y: {
        beginAtZero: true, grid: { color: grille, drawTicks: false }, border: { display: false },
        ticks: { color: encre3, font: { size: 11 }, padding: 8, maxTicksLimit: 6 },
      },
    },
  };
}

/* --- Tracé progressif ----------------------------------------------------
   Une courbe qui se dessine de gauche à droite dit deux choses qu'une courbe
   posée d'un coup ne dit pas : que le temps va dans ce sens, et que ce qu'on
   voit vient d'arriver. L'animation dure moins d'une seconde et ne se rejoue
   qu'au premier rendu — une donnée qui change ensuite glisse, elle ne se
   redessine pas. */
type ContexteAnim = ScriptableContext<"line"> & {
  type?: string; index: number; datasetIndex: number;
  xStarted?: boolean; yStarted?: boolean;
};

export function animationTrace(nbPoints: number) {
  const total = 850;
  const pas = total / Math.max(1, nbPoints);
  const depart = (ctx: ContexteAnim) => {
    if (ctx.index === 0) return ctx.chart.scales.y.getPixelForValue(ctx.chart.scales.y.min);
    const precedent = ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1];
    return precedent ? (precedent.getProps(["y"], true) as { y: number }).y
      : ctx.chart.scales.y.getPixelForValue(ctx.chart.scales.y.min);
  };
  return {
    x: {
      type: "number", easing: "linear", duration: pas, from: NaN,
      delay(ctx: ContexteAnim) {
        if (ctx.type !== "data" || ctx.xStarted) return 0;
        ctx.xStarted = true; return ctx.index * pas;
      },
    },
    y: {
      type: "number", easing: "linear", duration: pas, from: depart,
      delay(ctx: ContexteAnim) {
        if (ctx.type !== "data" || ctx.yStarted) return 0;
        ctx.yStarted = true; return ctx.index * pas;
      },
    },
  };
}

const mouvementReduit = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Rend un graphique Chart.js et le reconstruit quand le thème change. */
export function Graphique({ config, hauteur = 268, cacher, surInstance }: {
  config: () => ChartConfiguration;
  hauteur?: number;
  /** Index des séries masquées depuis la légende. */
  cacher?: Set<number>;
  /** Donne l'instance à la vue, pour les mises à jour en direct. */
  surInstance?: (c: Chart | null) => void;
}) {
  const toile = useRef<HTMLCanvasElement>(null);
  const instance = useRef<Chart | null>(null);
  const { theme } = useApp();

  useEffect(() => {
    if (!toile.current) return;
    const cfg = config();
    /* Toute courbe se trace progressivement, sans que chaque vue ait à le
       demander. Les barres et les anneaux gardent l'animation par défaut. */
    if (cfg.type === "line" && !mouvementReduit()) {
      const n = (cfg.data.datasets[0]?.data as unknown[] | undefined)?.length ?? 0;
      cfg.options = { ...cfg.options, animations: animationTrace(n) as never };
    }
    const c = new Chart(toile.current, cfg);
    instance.current = c;
    surInstance?.(c);
    return () => { c.destroy(); instance.current = null; surInstance?.(null); };
    // La configuration est reconstruite à chaque bascule de thème : les
    // couleurs sont lues sur les jetons CSS au moment du rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  useEffect(() => {
    const c = instance.current;
    if (!c || !cacher) return;
    c.data.datasets.forEach((_, i) => c.setDatasetVisibility(i, !cacher.has(i)));
    c.update();
  }, [cacher]);

  return (
    <div className="relative px-[var(--pas-carte)] pb-[var(--pas-carte)] pt-3" style={{ height: hauteur }}>
      <canvas ref={toile} />
    </div>
  );
}

/* --- Légende maison : identité, valeur qualifiée, bascule au clic -------- */
export function Legende({ items, cachees, basculer }: {
  items: Array<{ nom: string; couleur: string; valeur?: string }>;
  cachees?: Set<number>;
  basculer?: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-[15px] gap-y-[6px] px-[var(--pas-carte)] pt-[10px]">
      {items.map((it, i) => (
        <button
          key={it.nom} type="button" disabled={!basculer} onClick={() => basculer?.(i)}
          className={cx(
            "inline-flex items-center gap-[6px] text-[12px] text-encre-2 select-none",
            basculer && "cursor-pointer", cachees?.has(i) && "opacity-40 line-through",
          )}
        >
          <span className="w-[9px] h-[9px] rounded-sm shrink-0" style={{ background: it.couleur }} />
          <span>{it.nom}</span>
          {it.valeur && <span className="text-encre font-semibold tab-num">{it.valeur}</span>}
        </button>
      ))}
    </div>
  );
}

/* --- Repli tabulaire ------------------------------------------------------ */
export function TableDonnees({ etiquettes, series, format = "nombre" }: {
  etiquettes: string[]; series: Serie[]; format?: Format;
}) {
  return (
    <div className="px-[var(--pas-carte)] pb-[var(--pas-carte)] max-h-[240px] overflow-auto">
      <table className="w-full text-[13px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky top-0 bg-surface-2 text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 border-b border-bordure">Heure</th>
            {series.map((s) => (
              <th key={s.nom} className="sticky top-0 bg-surface-2 text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 border-b border-bordure">{s.nom}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {etiquettes.map((e, i) => (
            <tr key={e}>
              <td className="px-3 py-2 border-b border-bordure font-mono text-encre-3">{e}</td>
              {series.map((s) => (
                <td key={s.nom} className="px-3 py-2 border-b border-bordure text-right tab-num">{fmt(s.valeurs[i], format)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --- Carte complète : titre, outils, légende, graphique, repli ----------- */
export function CarteGraphique({
  titre, sous, className, legende, outils, etiquettes, series, format, enfants,
}: {
  titre: string; sous?: string; className?: string;
  legende?: ReactNode; outils?: ReactNode;
  etiquettes?: string[]; series?: Serie[]; format?: Format;
  enfants: ReactNode;
}) {
  const [table, poserTable] = useState(false);
  const repliable = Boolean(etiquettes && series);
  return (
    <Carte className={className} enfants={
      <>
        <TeteCarte titre={titre} sous={sous} outils={
          <>
            {repliable && (
              <Bouton ton="fantome" taille="s" aria-pressed={table} onClick={() => poserTable((t) => !t)}
                enfants={table ? "Masquer les données" : "Voir les données"} />
            )}
            {outils}
          </>
        } />
        {legende}
        {enfants}
        {table && repliable && <TableDonnees etiquettes={etiquettes!} series={series!} format={format} />}
      </>
    } />
  );
}

/* --- Étincelle : une tendance, sans axe ni valeur ------------------------- */
export function Etincelle({ valeurs, couleur, hauteur = 30 }: {
  valeurs: number[]; couleur: string; hauteur?: number;
}) {
  const toile = useRef<HTMLCanvasElement>(null);
  const { theme } = useApp();
  useEffect(() => {
    if (!toile.current) return;
    const col = jeton(couleur);
    const c = new Chart(toile.current, {
      type: "line",
      data: {
        labels: valeurs.map((_, i) => String(i)),
        datasets: [{
          data: valeurs, borderColor: col, backgroundColor: voiler(col, 0.16),
          borderWidth: 1.75, fill: true, tension: 0.35, pointRadius: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    });
    return () => c.destroy();
  }, [valeurs, couleur, theme]);
  return <div style={{ height: hauteur }} className="-mx-[3px] -mb-1 mt-[6px]"><canvas ref={toile} /></div>;
}

/* =========================================================================
   ANNEAU À TOTAL CENTRAL — la forme des cartes de synthèse d'UniFi :
   un anneau épais, le total au milieu, son intitulé dessous, et le détail
   en tableau à côté plutôt qu'en légende.
   ========================================================================= */
export function AnneauTotal({ parts, total, intitule, taille = 150 }: {
  parts: Array<{ nom: string; valeur: number; couleur: string }>;
  total: string;
  intitule: string;
  taille?: number;
}) {
  const toile = useRef<HTMLCanvasElement>(null);
  const { theme } = useApp();

  useEffect(() => {
    if (!toile.current) return;
    const c = new Chart(toile.current, {
      type: "doughnut",
      data: {
        labels: parts.map((p) => p.nom),
        datasets: [{
          data: parts.map((p) => p.valeur),
          backgroundColor: parts.map((p) => jeton(p.couleur)),
          borderColor: jeton("--surface"),
          borderWidth: 2,
          hoverOffset: 5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: jeton("--surface"), titleColor: jeton("--encre"),
            bodyColor: jeton("--encre-2"), borderColor: jeton("--bordure-2"),
            borderWidth: 1, padding: 10, cornerRadius: 8, usePointStyle: true,
          },
        },
      },
    });
    return () => c.destroy();
  }, [parts, theme]);

  return (
    <div className="relative shrink-0" style={{ width: taille, height: taille }}>
      <canvas ref={toile} />
      <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
        <div>
          <div className="text-[19px] font-semibold tab-num leading-[1.1]">{total}</div>
          <div className="text-[11px] text-encre-3 mt-[2px]">{intitule}</div>
        </div>
      </div>
    </div>
  );
}
