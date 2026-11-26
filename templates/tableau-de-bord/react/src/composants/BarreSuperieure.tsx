import { Icone } from "./Icone";
import { useSource } from "../lib/api/source";
import { Bouton, ItemMenu, Kbd, Menu, Pastille, TitreMenu, TraitMenu } from "./Primitives";
import type { Notification } from "../lib/donnees";
import { cx } from "../lib/format";

/* Barre supérieure à la UniFi : l'installation à gauche, le nom du produit au
   centre, les commandes transverses à droite. Les réglages propres à une page
   restent dans la page — la barre ne porte que ce qui vaut partout. */
export function BarreSuperieure({
  installation, etatInstallation, theme, basculerTheme, densite, basculerDensite,
  ouvrirPalette, ouvrirMenuMobile, notifications, toutLu, ouvrirNotification,
  exporter, maintenance, raccourcis,
}: {
  installation: string;
  etatInstallation: { ton: "bon" | "vigilance" | "critique"; texte: string };
  theme: string; basculerTheme: () => void;
  densite: string; basculerDensite: () => void;
  ouvrirPalette: () => void; ouvrirMenuMobile: () => void;
  notifications: Notification[];
  toutLu: () => void; ouvrirNotification: (n: Notification) => void;
  exporter: () => void; maintenance: () => void; raccourcis: () => void;
}) {
  const nonLues = notifications.filter((n) => !n.lu).length;
  const { source, poserSource, identite, empechement } = useSource();
  const direct = source === "application";
  const tons = { critique: "bg-critique", vigilance: "bg-vigilance", bon: "bg-bon", neutre: "bg-encre-4" };

  return (
    <header className="h-[46px] shrink-0 flex items-center gap-2 px-2 bg-rail border-b border-bordure sans-impression">
      <Bouton ton="fantome" icone="menu" aria-label="Ouvrir le menu" className="md:hidden" onClick={ouvrirMenuMobile} />

      <Menu
        align="gauche" largeur={240}
        declencheur={({ basculer }) => (
          <button type="button" onClick={basculer}
            className="flex items-center gap-[8px] h-[32px] px-[10px] rounded-[4px] hover:bg-survol transi max-w-[260px]">
            <Pastille ton={etatInstallation.ton} pulse />
            <span className="text-[13px] font-semibold truncate">{installation}</span>
            <Icone nom="selecteur" taille="s" className="text-encre-3" />
          </button>
        )}
        enfants={(fermer) => (
          <>
            <TitreMenu enfants="Installations" />
            <ItemMenu onClick={fermer} enfants={<>Production <Icone nom="check" taille="s" className="ml-auto text-accent" /></>} />
            <ItemMenu onClick={fermer} enfants="Recette" />
            <ItemMenu onClick={fermer} enfants="Bac à sable" />
            <TraitMenu />
            <ItemMenu icone="plus" onClick={fermer} enfants="Déclarer une installation" />
          </>
        )}
      />

      {/* D'où viennent les chiffres affichés. Toujours visible : un écran de
          démonstration qui se ferait passer pour du réel serait la pire faute
          possible dans un outil d'administration. */}
      <Menu
        align="gauche" largeur={300}
        declencheur={({ basculer }) => (
          <button type="button" onClick={basculer}
            title={direct ? "Les écrans lisent ANAT Pilotage" : "Les écrans montrent des données inventées"}
            className={cx("flex items-center gap-[7px] h-[32px] px-[10px] rounded-[4px] transi text-[12.5px] shrink-0",
              direct
                ? (empechement ? "bg-critique-voile text-critique" : "bg-bon-voile text-bon")
                : "bg-surface-2 text-encre-3 border border-bordure hover:border-bordure-2")}>
            <Icone nom={direct ? "prise" : "boite"} taille="s" />
            <span className="font-semibold max-sm:hidden">{direct ? "ANAT Pilotage" : "Démonstration"}</span>
            <Icone nom="selecteur" taille="s" className="opacity-60" />
          </button>
        )}
        enfants={(fermer) => (
          <>
            <TitreMenu enfants="D'où viennent les chiffres" />
            <ItemMenu onClick={() => { poserSource("demonstration"); fermer(); }}
              enfants={<>Démonstration {!direct && <Icone nom="check" taille="s" className="ml-auto text-accent" />}</>} />
            <ItemMenu onClick={() => { poserSource("application"); fermer(); }}
              enfants={<>ANAT Pilotage {direct && <Icone nom="check" taille="s" className="ml-auto text-accent" />}</>} />
            <TraitMenu />
            <div className="px-[10px] py-[7px] text-[11.5px] leading-[16px] text-encre-3">
              {direct
                ? (empechement
                    ? <span className="text-critique">{empechement}</span>
                    : <>Lu au nom de <b className="text-encre-2">{identite?.name ?? "…"}</b>, avec ses droits.
                       Les écrans non branchés restent en démonstration et le disent.</>)
                : <>Données inventées. Rien de ce qui est affiché ne vient d'un vrai système.</>}
            </div>
          </>
        )}
      />

      <span className="absolute left-1/2 -translate-x-1/2 text-[13px] font-semibold tracking-[.02em] text-encre-3 max-lg:hidden pointer-events-none">
        SIGRH
      </span>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={ouvrirPalette}
          className="flex items-center gap-2 h-[32px] px-[10px] min-w-[220px] rounded-[4px] bg-surface-2 border border-bordure text-encre-3 text-[13px] hover:border-bordure-2 transi max-lg:hidden">
          <Icone nom="recherche" taille="s" />
          <span className="truncate">Rechercher un agent, un service, une action…</span>
          <span className="ml-auto"><Kbd enfants="Ctrl K" /></span>
        </button>

        <Menu
          largeur={380}
          declencheur={({ basculer }) => (
            <span className="relative inline-flex">
              <Bouton ton="fantome" icone="cloche" aria-label="Notifications" onClick={basculer} />
              {nonLues > 0 && <i className="absolute top-[6px] right-[6px] w-[7px] h-[7px] rounded-full bg-critique border-2 border-rail" />}
            </span>
          )}
          enfants={(fermer) => (
            <div className="-m-[5px]">
              <div className="flex items-center px-[14px] py-[10px] border-b border-bordure">
                <strong className="text-[13px]">Notifications</strong>
                <Bouton ton="fantome" taille="s" className="ml-auto" onClick={toutLu} enfants="Tout marquer comme lu" />
              </div>
              <div className="max-h-[340px] overflow-y-auto">
                {notifications.map((n) => (
                  <button key={n.id} type="button" onClick={() => { ouvrirNotification(n); fermer(); }}
                    className="flex gap-[11px] w-full px-[14px] py-[10px] border-b border-bordure last:border-0 text-left hover:bg-surface-2 transi">
                    <i className={cx("w-[7px] h-[7px] rounded-full mt-[6px] shrink-0", tons[n.ton], n.lu && "opacity-30")} />
                    <span className="flex-1 min-w-0">
                      <span className={cx("block text-[13px]", n.lu ? "text-encre-2" : "font-semibold")}>{n.titre}</span>
                      <span className="block text-[12px] text-encre-3">{n.texte}</span>
                      <span className="block text-[11px] text-encre-4 mt-[2px]">{n.quand}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        />

        <Bouton ton="fantome" icone={theme === "sombre" ? "soleil" : "lune"} aria-label="Basculer le thème"
          title="Basculer clair / sombre (T)" onClick={basculerTheme} />

        <Menu
          declencheur={({ basculer }) => (
            <Bouton ton="fantome" icone="points" aria-label="Options" onClick={basculer} />
          )}
          enfants={(fermer) => (
            <>
              <TitreMenu enfants="Affichage" />
              <ItemMenu icone="colonnes" raccourci={densite} onClick={() => { basculerDensite(); fermer(); }} enfants="Densité" />
              <ItemMenu icone="clavier" raccourci="?" onClick={() => { raccourcis(); fermer(); }} enfants="Raccourcis clavier" />
              <TraitMenu />
              <TitreMenu enfants="Exporter" />
              <ItemMenu icone="telecharger" onClick={() => { exporter(); fermer(); }} enfants="Données affichées (CSV)" />
              <ItemMenu icone="rapport" raccourci="Ctrl P" onClick={() => { window.print(); fermer(); }} enfants="Imprimer / PDF" />
              <TraitMenu />
              <ItemMenu icone="puissance" onClick={() => { maintenance(); fermer(); }} enfants="Mode maintenance…" />
            </>
          )}
        />
      </div>
    </header>
  );
}
