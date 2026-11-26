import { useMemo, useState } from "react";
import { Bouton, Carte, Jeton, TeteCarte } from "../composants/Primitives";
import { useUI } from "../composants/Superpositions";
import { droitsInitiaux, permissions, rolesDroits, type Case, type EtatDroit } from "../lib/donnees";
import { cx } from "../lib/format";
import { Empechement, useDistant } from "../composants/Distant";
import { droitsDerives, matriceDroits, type ProfilAcces } from "../lib/api/anat";
import { useSource } from "../lib/api/source";
import { Icone } from "../composants/Icone";
import { LigneStat } from "../composants/Primitives";

/* La matrice réelle d'ANAT Pilotage : 58 droits, 13 groupes, et les profils
   de chaque organisation.

   Deux choses s'y disent, et aucune des deux ne va de soi.

   1. Cette vue est réservée au super-administrateur de plateforme : la route
      appelle `requireSuperAdmin`. Un refus est donc un cas NORMAL de cet
      écran, pas une panne, et il s'affiche comme tel.

   2. Pour un profil « propriétaire », le champ des droits ne contient pas ce
      qui est stocké : il est remplacé par la totalité du catalogue. C'est une
      dérivation, pas une décision. Afficher 58 cases cochées laisserait croire
      que quelqu'un les a cochées. */
function MatriceReelle() {
  const d = useDistant(matriceDroits);
  const m = d.donnees;

  if (d.etat !== "ok" || !m)
    return (
      <div className="grid gap-4">
        <Empechement etat={d.etat} echec={d.echec} relancer={d.relancer} />
        {d.etat === "refus" && (
          <Carte enfants={
            <div className="pas-carte text-[13px] text-encre-2 leading-[20px]">
              La matrice des droits est réservée au super-administrateur de la plateforme, parce qu'elle
              montre les profils de <b>toutes</b> les organisations. Ce refus est le fonctionnement normal :
              la console n'ouvre aucune porte que l'application vous fermerait.
            </div>
          } />
        )}
      </div>
    );

  const total = m.groups.reduce((n, g) => n + g.items.length, 0);
  const derives = m.profiles.filter(droitsDerives).length;
  const orgs = new Set(m.profiles.map((p) => p.org_name)).size;

  const resume = (p: ProfilAcces) =>
    droitsDerives(p)
      ? "Tous les droits, par construction"
      : `${p.permissions.length} droit${p.permissions.length > 1 ? "s" : ""} sur ${total}`;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Droits au catalogue" valeur={String(total)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Groupes" valeur={String(m.groups.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Profils" valeur={String(m.profiles.length)} />} />
        <Carte className="pas-carte" enfants={<LigneStat etiquette="Organisations" valeur={String(orgs)} ton="accent" />} />
      </div>

      {derives > 0 && (
        <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] bg-surface-2 border border-bordure anim-apparait">
          <Icone nom="info" className="text-encre-3 mt-[2px]" />
          <p className="flex-1 min-w-[min(100%,260px)] text-[13px] text-encre-2">
            <b>{derives} profil{derives > 1 ? "s" : ""} « propriétaire » {derives > 1 ? "portent" : "porte"} tous les droits par construction.</b>{" "}
            Ce n'est pas un octroi : l'application renvoie la totalité du catalogue pour ces profils,
            parce qu'ils ne sont soumis à aucune restriction. Personne n'a coché {total} cases.
          </p>
        </div>
      )}

      <Carte enfants={
        <>
          <TeteCarte titre="Les profils" sous="Ce que chacun peut faire, lu sur l'application" />
          <div className="divide-y divide-bordure">
            {m.profiles.map((p) => (
              <div key={p.id} className="flex items-start gap-3 flex-wrap pas-carte">
                <div className="min-w-[min(100%,220px)] flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold">{p.name}</span>
                    <Jeton ton="neutre" point={false} enfants={p.base_role} />
                    {p.is_system && <Jeton ton="accent" point={false} enfants="système" />}
                    <span className="text-[11.5px] text-encre-4">{p.org_name}</span>
                  </div>
                  <p className="text-[12px] text-encre-3 mt-[3px]">{p.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className={cx("text-[13px]", droitsDerives(p) ? "text-accent font-medium" : "text-encre-2")}>
                    {resume(p)}
                  </div>
                  <div className="text-[11.5px] text-encre-4 mt-[2px]">
                    {p.members} membre{p.members > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      } />

      <Carte enfants={
        <>
          <TeteCarte titre="Le catalogue des droits" sous={`${total} droits, en ${m.groups.length} groupes`} />
          <div className="pas-carte pt-3 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {m.groups.map((g) => (
              <div key={g.group} className="p-3 rounded-[4px] border border-bordure bg-surface-2">
                <div className="text-[12.5px] font-semibold mb-2">{g.group}</div>
                <div className="grid gap-[5px]">
                  {g.items.map((it) => (
                    <div key={it.key} className="text-[12px] text-encre-2 leading-[16px]">
                      {it.label}
                      <span className="block font-mono text-[10.5px] text-encre-4">{it.key}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      } />
    </div>
  );
}

const SUIVANT: Record<EtatDroit, EtatDroit> = { aucun: "lecture", lecture: "complet", complet: "aucun" };

/* Matrice des droits à trois états. Le brouillon n'est appliqué qu'après
   confirmation : on ne modifie jamais les droits en vigueur par inadvertance. */
export function Droits() {
  const ui = useUI();
  const { source } = useSource();
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

  if (source === "application") return <MatriceReelle />;

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
