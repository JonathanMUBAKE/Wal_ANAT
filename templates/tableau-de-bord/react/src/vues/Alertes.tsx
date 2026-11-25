import { useMemo, useState } from "react";
import { Bouton, Carte, EtatVide, Jeton } from "../composants/Primitives";
import { GrilleIndicateurs } from "../composants/Indicateur";
import { useUI } from "../composants/Superpositions";
import { alertesInitiales, type Alerte, type Gravite } from "../lib/donnees";
import { cx } from "../lib/format";

const ETIQUETTE: Record<Gravite, string> = {
  critique: "P1 critique", serieux: "P2 sérieux", vigilance: "P3 vigilance",
};
const FILTRES: Array<{ cle: "" | Gravite; nom: string }> = [
  { cle: "", nom: "Toutes" },
  { cle: "critique", nom: "P1 critique" },
  { cle: "serieux", nom: "P2 sérieux" },
  { cle: "vigilance", nom: "P3 vigilance" },
];

export function Alertes() {
  const ui = useUI();
  const [alertes, poserAlertes] = useState<Alerte[]>(alertesInitiales);
  const [filtre, poserFiltre] = useState<"" | Gravite>("");

  const vues = useMemo(() => alertes.filter((a) => !filtre || a.gravite === filtre), [alertes, filtre]);
  const compte = (g: Gravite) => alertes.filter((a) => a.gravite === g).length;

  async function escalader(a: Alerte) {
    const ok = await ui.confirmer({
      titre: `Escalader ${a.code} ?`,
      texte: "Le niveau 2 d'astreinte sera appelé immédiatement, de jour comme de nuit.",
      bouton: "Escalader", ton: "vigilance",
    });
    if (ok) ui.message(`${a.code} escaladée au niveau 2.`, "bon");
  }

  function acquitter(a: Alerte) {
    poserAlertes((l) => l.filter((x) => x !== a));
    ui.message(`${a.code} acquittée — vous en êtes responsable.`, "bon", {
      annuler: () => poserAlertes((l) => [...l, a]),
    });
  }

  return (
    <>
      <GrilleIndicateurs definitions={[
        { cle: "ouvertes", etiquette: "Alertes ouvertes", valeur: alertes.length },
        { cle: "p1", etiquette: "P1 critiques", valeur: compte("critique"), couleur: "--critique" },
        { cle: "p2", etiquette: "P2 sérieuses", valeur: compte("serieux"), couleur: "--serieux" },
        { cle: "delai", etiquette: "Délai moyen d'acquittement", valeur: 4, format: "nombre", contexte: "minutes" },
      ]} />

      <Carte enfants={
        <>
          <div className="flex items-center gap-2 flex-wrap pas-carte border-b border-bordure sans-impression">
            <div className="flex gap-[6px] flex-wrap" role="group" aria-label="Filtrer par gravité">
              {FILTRES.map((f) => (
                <button
                  key={f.cle} type="button" aria-pressed={filtre === f.cle} onClick={() => poserFiltre(f.cle)}
                  className={cx(
                    "h-[27px] px-[10px] rounded-full border text-[12.5px]",
                    filtre === f.cle ? "bg-accent-voile border-accent text-accent-fort font-medium"
                      : "bg-surface-2 border-bordure text-encre-3 hover:text-encre hover:border-bordure-2",
                  )}
                >{f.nom}</button>
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <Bouton taille="s" icone="pause" onClick={() => ui.message("Alertes mises en sourdine pendant 2 heures.", "info")} enfants="Mettre en sourdine" />
              <Bouton taille="s" icone="reglages" onClick={() => ui.message("Éditeur de règles à brancher.", "info")} enfants="Règles de déclenchement" />
            </div>
          </div>

          {vues.length === 0 ? (
            <EtatVide icone="checkCercle" titre="Rien à signaler"
              texte="Aucune alerte ouverte à ce niveau de gravité." />
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    {["Gravité", "Alerte", "Service", "Depuis", "Astreinte", "Actions"].map((t, i) => (
                      <th key={t} className={cx(
                        "sticky top-0 z-3 bg-surface-2 px-3 py-[9px] border-b border-bordure whitespace-nowrap",
                        "text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3",
                        i === 5 ? "text-right" : "text-left",
                      )}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vues.map((a) => (
                    <tr key={a.code} className="hover:bg-surface-2">
                      <td className="px-3 pas-ligne border-b border-bordure">
                        <Jeton ton={a.gravite} enfants={ETIQUETTE[a.gravite]} />
                      </td>
                      <td className="px-3 pas-ligne border-b border-bordure">
                        <div className="font-medium">{a.titre}</div>
                        <div className="text-[12px] text-encre-3 font-mono">{a.code}</div>
                      </td>
                      <td className="px-3 pas-ligne border-b border-bordure font-mono">{a.service}</td>
                      <td className="px-3 pas-ligne border-b border-bordure">{a.depuis}</td>
                      <td className="px-3 pas-ligne border-b border-bordure">{a.astreinte}</td>
                      <td className="px-3 pas-ligne border-b border-bordure">
                        <div className="flex gap-[2px] justify-end">
                          <Bouton taille="s" onClick={() => acquitter(a)} enfants="Acquitter" />
                          <Bouton taille="s" icone="escalade" onClick={() => escalader(a)} enfants="Escalader" />
                          <Bouton ton="fantome" taille="s" icone="pause" title="Mettre en sourdine"
                            onClick={() => ui.message(`${a.code} mise en sourdine pendant 2 heures.`, "info")} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      } />
    </>
  );
}
