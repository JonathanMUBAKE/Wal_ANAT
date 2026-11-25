import { useEffect, useMemo, useRef, useState } from "react";
import { Icone, type NomIcone } from "./Icone";
import { Kbd } from "./Primitives";
import { Voile } from "./Superpositions";
import { NAVIGATION } from "../lib/navigation";
import { cx, normaliser } from "../lib/format";
import { flotte } from "../lib/donnees";

export interface Commande {
  famille: string;
  nom: string;
  sous?: string;
  icone: NomIcone;
  faire: () => void;
}

/* Palette Ctrl + K : navigation, actions et entités dans un seul champ.
   Tout ce qui se fait à la souris doit pouvoir se lancer d'ici. */
export function PaletteCommandes({ ouverte, fermer, aller, actions }: {
  ouverte: boolean;
  fermer: () => void;
  aller: (cle: string) => void;
  actions: Commande[];
}) {
  const [q, poserQ] = useState("");
  const [index, poserIndex] = useState(0);
  const champ = useRef<HTMLInputElement>(null);
  const liste = useRef<HTMLDivElement>(null);

  const toutes = useMemo<Commande[]>(() => [
    ...NAVIGATION.flatMap((g) => g.entrees.map((e) => ({
      famille: "Aller à", nom: e.nom, sous: g.groupe, icone: e.icone, faire: () => aller(e.cle),
    }))),
    ...actions,
    ...flotte.map((s) => ({
      famille: "Serveurs", nom: s.nom, sous: `${s.role} · ${s.region}`,
      icone: "serveur" as NomIcone, faire: () => aller("apercu"),
    })),
  ], [aller, actions]);

  const resultats = useMemo(() => {
    const n = normaliser(q.trim());
    return toutes.filter((r) => !n || normaliser(r.nom + " " + (r.sous ?? "")).includes(n)).slice(0, 24);
  }, [q, toutes]);

  useEffect(() => { if (ouverte) { poserQ(""); poserIndex(0); setTimeout(() => champ.current?.focus(), 40); } }, [ouverte]);
  useEffect(() => { poserIndex(0); }, [q]);
  useEffect(() => {
    liste.current?.querySelector('[data-actif="1"]')?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!ouverte) return null;

  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); poserIndex((i) => Math.min(i + 1, resultats.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); poserIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const r = resultats[index]; if (r) { fermer(); r.faire(); } }
    else if (e.key === "Escape") fermer();
  };

  let famille: string | null = null;
  return (
    <>
      <Voile onClick={fermer} />
      <div
        role="dialog" aria-modal="true" aria-label="Palette de commandes" onKeyDown={clavier}
        className="fixed top-[14vh] left-1/2 -translate-x-1/2 z-90 w-[min(620px,calc(100vw-32px))] rounded-[8px] bg-surface border border-bordure-2 shadow-haute overflow-hidden anim-monte"
      >
        <div className="flex items-center gap-[11px] px-4 py-[14px] border-b border-bordure">
          <Icone nom="recherche" taille="l" className="text-encre-3" />
          <input
            ref={champ} value={q} onChange={(e) => poserQ(e.target.value)}
            placeholder="Aller à une page ou lancer une action…" autoComplete="off" spellCheck={false}
            className="flex-1 bg-transparent outline-none text-[15px] text-encre placeholder:text-encre-4"
          />
          <Kbd enfants="Échap" />
        </div>

        <div ref={liste} className="max-h-[48vh] overflow-y-auto p-[6px]" role="listbox">
          {resultats.length === 0 && <p className="px-3 py-9 text-center text-[13px] text-encre-3">Aucun résultat.</p>}
          {resultats.map((r, i) => {
            const nouvelle = r.famille !== famille;
            famille = r.famille;
            return (
              <div key={r.famille + r.nom + i}>
                {nouvelle && (
                  <div className="px-[10px] pt-[9px] pb-[5px] text-[10.5px] font-semibold tracking-[.08em] uppercase text-encre-4">{r.famille}</div>
                )}
                <button
                  type="button" role="option" aria-selected={i === index} data-actif={i === index ? 1 : 0}
                  onMouseEnter={() => poserIndex(i)}
                  onClick={() => { fermer(); r.faire(); }}
                  className={cx(
                    "flex items-center gap-[11px] w-full px-[10px] py-2 rounded-[4px] text-[13.5px] text-left",
                    i === index ? "bg-accent-voile text-encre" : "text-encre-2",
                  )}
                >
                  <Icone nom={r.icone} className={i === index ? "text-accent-fort" : "text-encre-3"} />
                  <span>{r.nom}</span>
                  {r.sous && <span className="text-encre-4 text-[12px]">{r.sous}</span>}
                  {i === index && <span className="ml-auto"><Kbd enfants="Entrée" /></span>}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-[14px] px-[14px] py-[9px] border-t border-bordure text-[11.5px] text-encre-4">
          <span className="inline-flex items-center gap-[5px]"><Kbd enfants="↑" /><Kbd enfants="↓" /> naviguer</span>
          <span className="inline-flex items-center gap-[5px]"><Kbd enfants="Entrée" /> lancer</span>
          <span className="inline-flex items-center gap-[5px]"><Kbd enfants="Échap" /> fermer</span>
        </div>
      </div>
    </>
  );
}
