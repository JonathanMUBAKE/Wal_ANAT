import { Icone, type NomIcone } from "./Icone";
import { Carte, Delta } from "./Primitives";
import { Etincelle } from "./Graphique";
import { fmt, type Format } from "../lib/format";

export interface DefIndicateur {
  cle: string;
  etiquette: string;
  icone?: NomIcone;
  valeur: number;
  format?: Format;
  decimales?: number;
  delta?: number;
  /** Dans quel sens la variation est une bonne nouvelle. */
  sensBon?: "haut" | "bas";
  contexte?: string;
  /** Part d'objectif atteinte, de 0 à 1. */
  objectif?: number;
  couleur?: string;
  serie?: number[];
}

/* Carte d'indicateur : une valeur, sa variation qualifiée, une phrase de
   contexte sur une ligne, et une tendance muette. Pas de chiffre sur chaque
   point : l'étincelle donne une forme, pas une lecture. */
export function Indicateur({ def }: { def: DefIndicateur }) {
  return (
    <Carte className="relative overflow-hidden px-[15px] pt-[14px] pb-[10px]" enfants={
      <>
        <div className="flex items-center gap-[6px] text-[11.5px] font-semibold tracking-[.055em] uppercase text-encre-3 mb-[7px]">
          {def.icone && <Icone nom={def.icone} taille="s" className="text-encre-4" />}
          {def.etiquette}
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <div className="text-[26px] font-bold tracking-[-.025em] leading-[1.1] tab-num">
            {fmt(def.valeur, def.format ?? "nombre", def.decimales)}
          </div>
          {def.delta !== undefined && <Delta valeur={def.delta} sensBon={def.sensBon} />}
        </div>

        {def.contexte && (
          <div className="mt-1 text-[11.5px] text-encre-3 truncate" title={def.contexte}>{def.contexte}</div>
        )}

        {def.objectif !== undefined && (
          <div className="h-[3px] rounded-sm bg-surface-3 mt-[9px] overflow-hidden">
            <i className="block h-full rounded-sm" style={{
              width: Math.min(100, def.objectif * 100) + "%",
              background: `var(${def.couleur ?? "--accent"})`,
            }} />
          </div>
        )}

        {def.serie && <Etincelle valeurs={def.serie} couleur={def.couleur ?? "--accent"} />}
      </>
    } />
  );
}

export function GrilleIndicateurs({ definitions }: { definitions: DefIndicateur[] }) {
  return (
    <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(166px, 1fr))" }}>
      {definitions.map((d) => <Indicateur key={d.cle} def={d} />)}
    </div>
  );
}
