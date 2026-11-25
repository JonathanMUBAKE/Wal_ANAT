import type { ReactNode } from "react";
import { Icone } from "./Icone";
import { Bouton, ItemMenu, Menu, TitreMenu, TraitMenu } from "./Primitives";
import { NAVIGATION } from "../lib/navigation";
import { cx } from "../lib/format";

/* =========================================================================
   NAVIGATION À DEUX NIVEAUX — la forme d'UniFi
   Un rail d'icônes à gauche pour les grands domaines, puis un panneau qui
   liste les pages du domaine choisi et porte son résumé contextuel.
   Avantage pratique : on change de domaine sans perdre la page courante
   des yeux, et le panneau sert de place pour l'essentiel du domaine.
   ========================================================================= */

export function RailApplications({ groupeActif, surChoixGroupe, replie, basculerRepli, ouvrirPalette, raccourcis }: {
  groupeActif: string;
  surChoixGroupe: (groupe: string) => void;
  replie: boolean;
  basculerRepli: () => void;
  ouvrirPalette: () => void;
  raccourcis: () => void;
}) {
  return (
    <nav
      className="w-[48px] shrink-0 bg-rail border-r border-bordure flex flex-col items-center py-2 gap-1 sans-impression"
      aria-label="Domaines"
    >
      <div className="w-[26px] h-[26px] rounded-[6px] grid place-items-center text-[11px] font-bold text-white mb-2 shrink-0"
           style={{ background: "linear-gradient(135deg, var(--accent), var(--serie-7))" }}>
        AN
      </div>

      {NAVIGATION.map((g) => {
        const actif = g.groupe === groupeActif;
        return (
          <button
            key={g.groupe} type="button" title={g.groupe} aria-label={g.groupe} aria-current={actif ? "true" : undefined}
            onClick={() => surChoixGroupe(g.groupe)}
            className={cx(
              "relative w-[34px] h-[34px] rounded-[4px] grid place-items-center transi group",
              actif ? "bg-accent-voile text-accent" : "text-encre-3 hover:bg-survol hover:text-encre",
            )}
          >
            {actif && <i className="absolute -left-2 top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-r-[3px] bg-accent" />}
            <Icone nom={g.icone} />
            <span className="pointer-events-none absolute left-[42px] z-70 px-[8px] py-[4px] rounded-[4px] bg-surface border border-bordure shadow-flottant
                             text-[12px] whitespace-nowrap opacity-0 group-hover:opacity-100 transi text-encre">
              {g.groupe}
            </span>
          </button>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1">
        <button type="button" title="Rechercher (Ctrl + K)" aria-label="Rechercher" onClick={ouvrirPalette}
                className="w-[34px] h-[34px] rounded-[4px] grid place-items-center text-encre-3 hover:bg-survol hover:text-encre transi">
          <Icone nom="recherche" />
        </button>
        <button type="button" title="Raccourcis clavier (?)" aria-label="Raccourcis clavier" onClick={raccourcis}
                className="w-[34px] h-[34px] rounded-[4px] grid place-items-center text-encre-3 hover:bg-survol hover:text-encre transi">
          <Icone nom="clavier" />
        </button>
        <button type="button" title={replie ? "Déplier le panneau" : "Replier le panneau"} aria-label="Replier le panneau"
                onClick={basculerRepli}
                className="w-[34px] h-[34px] rounded-[4px] grid place-items-center text-encre-3 hover:bg-survol hover:text-encre transi">
          <Icone nom={replie ? "chevronDroite" : "chevronGauche"} />
        </button>
        <Menu
          align="gauche" vers="haut"
          declencheur={({ basculer }) => (
            <button type="button" aria-label="Mon compte" onClick={basculer}
                    className="w-[34px] h-[34px] rounded-full grid place-items-center text-[11px] font-semibold bg-surface-3 border border-bordure text-encre hover:border-bordure-2 transi">
              AD
            </button>
          )}
          enfants={(fermer) => (
            <>
              <TitreMenu enfants="Awa Diallo · Administratrice système" />
              <ItemMenu icone="utilisateurs" onClick={fermer} enfants="Mon profil" />
              <ItemMenu icone="reglages" onClick={fermer} enfants="Préférences" />
              <TraitMenu />
              <ItemMenu icone="deconnexion" danger onClick={fermer} enfants="Se déconnecter" />
            </>
          )}
        />
      </div>
    </nav>
  );
}

export function PanneauSection({ groupe, vue, aller, replie, resume, ouvertMobile }: {
  groupe: string;
  vue: string;
  aller: (cle: string) => void;
  replie: boolean;
  resume?: ReactNode;
  ouvertMobile: boolean;
}) {
  const g = NAVIGATION.find((x) => x.groupe === groupe);
  if (!g || replie) return null;
  return (
    <aside
      className={cx(
        "w-[236px] shrink-0 bg-rail border-r border-bordure flex flex-col sans-impression",
        "max-md:fixed max-md:left-[48px] max-md:top-0 max-md:bottom-0 max-md:z-85 max-md:transition-transform max-md:duration-200",
        ouvertMobile ? "max-md:translate-x-0" : "max-md:-translate-x-[284px]",
      )}
      aria-label={"Pages — " + groupe}
    >
      <div className="h-[46px] shrink-0 flex items-center px-3 border-b border-bordure">
        <h2 className="text-[13px] font-semibold truncate">{groupe}</h2>
      </div>

      <div className="p-2 echelonne">
        {g.entrees.map((e) => {
          const actif = vue === e.cle;
          return (
            <button
              key={e.cle} type="button" onClick={() => aller(e.cle)} aria-current={actif ? "page" : undefined}
              className={cx(
                "flex items-center gap-[10px] w-full px-[9px] py-[7px] rounded-[4px] text-[13px] text-left transi",
                actif ? "bg-accent-voile text-accent font-semibold" : "text-encre-2 hover:bg-survol hover:text-encre",
              )}
            >
              <Icone nom={e.icone} taille="s" />
              <span className="flex-1 min-w-0 truncate">{e.nom}</span>
              {e.compte !== undefined && (
                <span className={cx(
                  "min-w-[18px] h-[17px] px-[5px] rounded-full text-[10px] font-semibold grid place-items-center tab-num",
                  e.ton === "critique" ? "bg-critique text-white"
                    : e.ton === "vigilance" ? "bg-vigilance text-[#212327]" : "bg-surface-3 text-encre-2",
                )}>{e.compte}</span>
              )}
            </button>
          );
        })}
      </div>

      {resume && <div className="flex-1 overflow-y-auto border-t border-bordure px-3 py-3">{resume}</div>}
    </aside>
  );
}

export { Bouton };
