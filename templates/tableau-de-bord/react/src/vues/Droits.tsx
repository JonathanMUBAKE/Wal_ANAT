import { useMemo, useState } from "react";
import { Bouton, Carte, Jeton, TeteCarte } from "../composants/Primitives";
import { useUI } from "../composants/Superpositions";
import { droitsInitiaux, permissions, rolesDroits, type Case, type EtatDroit } from "../lib/donnees";
import { cx } from "../lib/format";

const SUIVANT: Record<EtatDroit, EtatDroit> = { aucun: "lecture", lecture: "complet", complet: "aucun" };

/* Matrice des droits à trois états. Le brouillon n'est appliqué qu'après
   confirmation : on ne modifie jamais les droits en vigueur par inadvertance. */
export function Droits() {
  const ui = useUI();
  const [reference, poserReference] = useState<Record<string, Case[]>>(droitsInitiaux);
  const [brouillon, poserBrouillon] = useState<Record<string, Case[]>>(() =>
    structuredClone(droitsInitiaux));

  const modifie = useMemo(
    () => JSON.stringify(brouillon) !== JSON.stringify(reference), [brouillon, reference]);

  const basculer = (cle: string, i: number) => poserBrouillon((b) => {
    const n = structuredClone(b);
    if (n[cle][i].verrou) return b;
    n[cle][i].etat = SUIVANT[n[cle][i].etat];
    return n;
  });

  async function enregistrer() {
    const ok = await ui.confirmer({
      titre: "Appliquer la nouvelle matrice ?",
      texte: "Les droits prennent effet à la prochaine requête de chaque session. Le serveur reste seul juge : cette matrice ne remplace pas ses contrôles.",
      bouton: "Appliquer", ton: "vigilance",
    });
    if (!ok) return;
    poserReference(structuredClone(brouillon));
    ui.message("Matrice des droits enregistrée et journalisée.", "bon");
  }

  let groupe: string | null = null;

  return (
    <Carte enfants={
      <>
        <TeteCarte
          titre="Matrice des droits"
          sous="Le serveur reste seul juge : cette matrice décrit ce que l'interface demande, pas ce qu'elle accorde."
          outils={
            <>
              {modifie && <Jeton ton="vigilance" enfants="Modifications non enregistrées" />}
              <Bouton taille="s" disabled={!modifie}
                onClick={() => { poserBrouillon(structuredClone(reference)); ui.message("Modifications abandonnées.", "info"); }}
                enfants="Annuler" />
              <Bouton taille="s" ton="principal" icone="check" disabled={!modifie} onClick={enregistrer} enfants="Enregistrer" />
            </>
          }
        />
        <div className="pas-carte">
          <p className="text-[12px] text-encre-3 mb-3">
            Trois états par case : <b className="text-encre-2">aucun</b> · <b className="text-accent-fort">lecture</b> ·{" "}
            <b className="text-bon">complet</b>. Les cases grisées sont imposées par le rôle et ne se modifient pas.
          </p>
          <div className="overflow-auto max-h-[520px]">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  <th className="sticky top-0 z-2 bg-surface-2 text-left px-[10px] py-2 text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 border-b border-bordure">
                    Permission
                  </th>
                  {rolesDroits.map((r) => (
                    <th key={r} className="sticky top-0 z-2 bg-surface-2 text-center px-[10px] py-2 text-[11px] font-semibold uppercase tracking-[.06em] text-encre-3 border-b border-bordure">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => {
                  const tete = p.groupe !== groupe;
                  groupe = p.groupe;
                  return (
                    <tr key={p.cle} className="hover:bg-surface-2">
                      {tete && (
                        <td colSpan={rolesDroits.length + 1} className="hidden" />
                      )}
                      <th scope="row" className="text-left font-normal text-encre-2 px-[10px] py-2 border-b border-bordure whitespace-nowrap">
                        {tete && <span className="block text-[10.5px] font-semibold uppercase tracking-[.06em] text-encre-4 pb-1">{p.groupe}</span>}
                        {p.nom}
                        <small className="block font-mono text-[11px] text-encre-4">{p.cle}</small>
                      </th>
                      {brouillon[p.cle].map((c, i) => (
                        <td key={i} className="text-center px-[10px] py-2 border-b border-bordure">
                          <button
                            type="button" disabled={c.verrou} onClick={() => basculer(p.cle, i)}
                            aria-label={`${p.nom} — ${rolesDroits[i]} : ${c.etat}`}
                            className={cx(
                              "w-[74px] h-[26px] rounded-[4px] border text-[11.5px] font-semibold transition-all",
                              c.etat === "complet" ? "bg-bon-voile border-bon/45 text-bon"
                                : c.etat === "lecture" ? "bg-accent-voile border-accent/45 text-accent-fort"
                                : "bg-surface-2 border-bordure text-encre-4 hover:border-bordure-2",
                              c.verrou && "opacity-55 cursor-not-allowed",
                            )}
                          >
                            {c.etat}
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    } />
  );
}
