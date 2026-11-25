import { useRef, useState, type ReactNode } from "react";
import { Icone, type NomIcone } from "./Icone";
import { cx } from "../lib/format";
import { useClicExterieur } from "../lib/preferences";

/* =========================================================================
   BOUTON — quatre tons, trois tailles, variante icône seule
   ========================================================================= */
type TonBouton = "neutre" | "principal" | "danger" | "fantome";
export function Bouton({
  ton = "neutre", taille = "m", icone, iconeFin, actif, enfants, className, ...reste
}: {
  ton?: TonBouton;
  taille?: "s" | "m";
  icone?: NomIcone;
  iconeFin?: NomIcone;
  actif?: boolean;
  enfants?: ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tons: Record<TonBouton, string> = {
    neutre: "bg-surface-2 border-bordure hover:bg-survol hover:border-bordure-2 text-encre",
    principal: "bg-accent border-accent text-accent-encre hover:bg-accent-fort hover:border-accent-fort",
    danger: "bg-critique border-critique text-white hover:brightness-110",
    fantome: "bg-transparent border-transparent text-encre-2 hover:bg-survol hover:text-encre",
  };
  const seule = !enfants;
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-[7px] rounded-[4px] border font-medium whitespace-nowrap",
        "transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0,0,.2,1)]",
        "disabled:opacity-45 disabled:pointer-events-none active:translate-y-[1px] active:scale-[.985]",
        taille === "s" ? (seule ? "h-[27px] w-[27px]" : "h-[27px] px-2 text-[12.5px]") : (seule ? "h-8 w-8" : "h-8 px-[11px] text-[13px]"),
        actif ? "bg-accent-voile border-accent text-accent-fort" : tons[ton],
        className,
      )}
      {...reste}
    >
      {icone && <Icone nom={icone} taille={taille === "s" ? "s" : "s"} />}
      {enfants}
      {iconeFin && <Icone nom={iconeFin} taille="s" />}
    </button>
  );
}

/* =========================================================================
   CARTE
   ========================================================================= */
export function Carte({ className, enfants }: { className?: string; enfants: ReactNode }) {
  return (
    <section className={cx("bg-surface border border-bordure rounded-[4px] shadow-carte", className)}>
      {enfants}
    </section>
  );
}

export function TeteCarte({ titre, sous, outils }: { titre: string; sous?: ReactNode; outils?: ReactNode }) {
  return (
    <header className="flex items-start gap-[10px] px-[var(--pas-carte)] pt-[var(--pas-carte)]">
      <div className="min-w-0">
        <h2 className="text-[13.5px] font-semibold tracking-[-.005em]">{titre}</h2>
        {sous && <p className="text-[12px] text-encre-3">{sous}</p>}
      </div>
      {outils && <div className="ml-auto flex items-center gap-[5px] sans-impression">{outils}</div>}
    </header>
  );
}

/* =========================================================================
   JETON D'ÉTAT — jamais la couleur seule : toujours un mot avec
   ========================================================================= */
export type TonEtat = "bon" | "vigilance" | "serieux" | "critique" | "neutre" | "accent";
export function Jeton({ ton = "neutre", point = true, enfants }: {
  ton?: TonEtat; point?: boolean; enfants?: ReactNode;
}) {
  const tons: Record<TonEtat, string> = {
    bon: "bg-bon-voile text-bon",
    vigilance: "bg-vigilance-voile text-[#8a5d00] dark:text-vigilance",
    serieux: "bg-serieux-voile text-serieux",
    critique: "bg-critique-voile text-critique",
    neutre: "bg-surface-3 text-encre-3",
    accent: "bg-accent-voile text-accent-fort",
  };
  return (
    <span className={cx("inline-flex items-center gap-[5px] h-[21px] px-2 rounded-full text-[11.5px] font-medium whitespace-nowrap", tons[ton])}>
      {point && <i className="w-[6px] h-[6px] rounded-full bg-current shrink-0" />}
      {enfants}
    </span>
  );
}

/* =========================================================================
   DELTA — la couleur dit « bon » ou « mauvais », pas « monte » ou « descend »
   ========================================================================= */
export function Delta({ valeur, sensBon = "haut" }: { valeur: number; sensBon?: "haut" | "bas" }) {
  const plat = Math.abs(valeur) < 0.005;
  const bon = (sensBon === "haut") === (valeur >= 0);
  const d = Math.abs(valeur) < 1 ? 2 : 1;
  return (
    <span className={cx(
      "inline-flex items-center gap-[3px] text-[12px] font-semibold tab-num whitespace-nowrap",
      plat ? "text-encre-3" : bon ? "text-bon" : "text-critique",
    )}>
      <Icone nom={valeur >= 0 ? "tendanceHaut" : "tendanceBas"} taille="s" />
      {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })
        .format(Math.abs(valeur))} %
    </span>
  );
}

/* =========================================================================
   MENU DÉROULANT
   ========================================================================= */
export function Menu({ declencheur, align = "droite", vers = "bas", largeur = 212, enfants }: {
  declencheur: (props: { ouvert: boolean; basculer: () => void }) => ReactNode;
  align?: "gauche" | "droite";
  vers?: "bas" | "haut";
  largeur?: number;
  enfants: (fermer: () => void) => ReactNode;
}) {
  const [ouvert, poser] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClicExterieur(ref, ouvert, () => poser(false));
  return (
    <div className="relative" ref={ref}>
      {declencheur({ ouvert, basculer: () => poser((o) => !o) })}
      {ouvert && (
        <div
          role="menu"
          style={{ minWidth: largeur }}
          className={cx(
            "absolute z-60 p-[5px] rounded-[4px] bg-surface border border-bordure shadow-haute anim-apparait",
            align === "droite" ? "right-0" : "left-0",
            vers === "bas" ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]",
          )}
        >
          {enfants(() => poser(false))}
        </div>
      )}
    </div>
  );
}

export function ItemMenu({ icone, raccourci, danger, desactive, onClick, enfants }: {
  icone?: NomIcone; raccourci?: string; danger?: boolean; desactive?: boolean;
  onClick?: () => void; enfants: ReactNode;
}) {
  return (
    <button
      type="button" role="menuitem" disabled={desactive} onClick={onClick}
      className={cx(
        "flex items-center gap-[9px] w-full px-[9px] py-[7px] rounded-[4px] text-[13px] text-left",
        "hover:bg-survol disabled:opacity-50 disabled:pointer-events-none",
        danger ? "text-critique" : "text-encre",
      )}
    >
      {icone && <Icone nom={icone} taille="s" />}
      {enfants}
      {raccourci && <span className="ml-auto text-[11px] text-encre-4 font-mono">{raccourci}</span>}
    </button>
  );
}

export const TitreMenu = ({ enfants }: { enfants: ReactNode }) => (
  <div className="px-[9px] pt-[7px] pb-[5px] text-[10.5px] font-semibold tracking-[.08em] uppercase text-encre-4">{enfants}</div>
);
export const TraitMenu = () => <div className="h-px bg-bordure my-[5px]" />;

/* =========================================================================
   DIVERS
   ========================================================================= */
export const Kbd = ({ enfants }: { enfants: ReactNode }) => (
  <kbd className="font-mono text-[10.5px] px-[5px] py-[2px] rounded bg-surface-3 border border-bordure text-encre-3 leading-[1.3]">{enfants}</kbd>
);

export function EtatVide({ icone = "boite", titre, texte, actions }: {
  icone?: NomIcone; titre: string; texte: string; actions?: ReactNode;
}) {
  return (
    <div className="grid place-items-center text-center px-6 py-14 gap-1">
      <div className="w-11 h-11 rounded-[8px] bg-surface-2 border border-bordure grid place-items-center text-encre-3 mb-[10px]">
        <Icone nom={icone} taille="l" />
      </div>
      <h3 className="text-[14.5px] font-semibold">{titre}</h3>
      <p className="text-[13px] text-encre-3 max-w-[380px] mb-3">{texte}</p>
      {actions && <div className="flex items-center justify-center gap-[10px] flex-wrap">{actions}</div>}
    </div>
  );
}

export function Jauge({ nom, valeur }: { nom: string; valeur: number }) {
  const ton = valeur > 90 ? "bg-critique" : valeur > 78 ? "bg-vigilance" : "bg-accent";
  return (
    <div className="mt-[7px] first:mt-0">
      <div className="flex justify-between text-[11px] text-encre-3 mb-[3px]">
        <span>{nom}</span>
        <b className="text-encre-2 font-semibold tab-num">{valeur} %</b>
      </div>
      <div className="h-1 rounded-[3px] bg-surface-3 overflow-hidden">
        <i className={cx("block h-full rounded-[3px] transition-[width] duration-500", ton)} style={{ width: valeur + "%" }} />
      </div>
    </div>
  );
}

export function Progression({ valeur, ton = "accent" }: { valeur: number; ton?: "accent" | "bon" | "critique" }) {
  const c = { accent: "bg-accent", bon: "bg-bon", critique: "bg-critique" }[ton];
  return (
    <div className="h-[5px] rounded-[3px] bg-surface-3 overflow-hidden min-w-[90px] flex-1">
      <i className={cx("block h-full rounded-[3px] transition-[width] duration-700", c)} style={{ width: valeur + "%" }} />
    </div>
  );
}

export function CaseACocher({ indetermine, className, ...reste }: {
  indetermine?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      ref={(el) => { if (el) el.indeterminate = Boolean(indetermine); }}
      className={cx(
        "appearance-none w-[15px] h-[15px] rounded border-[1.5px] border-bordure-2 bg-surface shrink-0 cursor-pointer",
        "grid place-items-center transition-colors",
        "checked:bg-accent checked:border-accent indeterminate:bg-accent indeterminate:border-accent",
        "checked:after:content-[''] checked:after:w-1 checked:after:h-2 checked:after:border-white",
        "checked:after:border-[0_2px_2px_0] checked:after:border-solid checked:after:rotate-45 checked:after:-translate-y-px",
        "indeterminate:after:content-[''] indeterminate:after:w-2 indeterminate:after:h-[2px] indeterminate:after:bg-white indeterminate:after:rounded-sm",
        className,
      )}
      {...reste}
    />
  );
}

/* =========================================================================
   PIÈCES PROPRES À L'HABILLAGE UNIFI
   ========================================================================= */

/** Ligne « étiquette à gauche, valeur à droite » : la signature des panneaux
    latéraux d'UniFi. C'est la brique de tous les résumés de cette interface. */
export function LigneStat({ etiquette, valeur, ton, indice }: {
  etiquette: ReactNode; valeur: ReactNode; ton?: "bon" | "vigilance" | "critique" | "accent"; indice?: ReactNode;
}) {
  const couleurs = { bon: "text-bon", vigilance: "text-vigilance", critique: "text-critique", accent: "text-accent" };
  return (
    <div className="flex items-baseline gap-3 py-[5px] text-[13px]">
      <span className="text-encre-3 truncate">{etiquette}</span>
      <span className={cx("ml-auto text-right tab-num shrink-0", ton ? couleurs[ton] : "text-encre")}>{valeur}</span>
      {indice}
    </div>
  );
}

/** Interrupteur. Toute bascule qui change l'état du système passe par là. */
export function Interrupteur({ actif, surChangement, etiquette, desactive }: {
  actif: boolean; surChangement: (v: boolean) => void; etiquette: string; desactive?: boolean;
}) {
  return (
    <button
      type="button" role="switch" aria-checked={actif} aria-label={etiquette} disabled={desactive}
      onClick={() => surChangement(!actif)}
      className={cx(
        "relative w-[34px] h-[20px] rounded-full shrink-0 transi",
        actif ? "bg-accent" : "bg-surface-3 border border-bordure-2",
        desactive && "opacity-45 pointer-events-none",
      )}
    >
      <i className={cx(
        "absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full bg-white shadow-basse",
        "transition-[left] duration-200 ease-[cubic-bezier(0,0,0.2,1)]",
        actif ? "left-[17px]" : "left-[3px]",
      )} />
    </button>
  );
}

/** Onglets soulignés, comme « Internet / WiFi » dans UniFi. */
export function Onglets({ onglets, actif, surChoix, compact }: {
  onglets: Array<{ cle: string; nom: string; compte?: number }>;
  actif: string; surChoix: (cle: string) => void; compact?: boolean;
}) {
  return (
    <div className="flex gap-0 border-b border-bordure" role="tablist">
      {onglets.map((o) => (
        <button
          key={o.cle} type="button" role="tab" aria-selected={actif === o.cle} onClick={() => surChoix(o.cle)}
          className={cx(
            "relative px-3 text-[13px] whitespace-nowrap transi",
            compact ? "py-[7px]" : "py-[10px]",
            actif === o.cle ? "text-encre font-semibold" : "text-encre-3 hover:text-encre",
          )}
        >
          {o.nom}
          {o.compte !== undefined && (
            <span className={cx("ml-[6px] text-[11px] tab-num", actif === o.cle ? "text-accent" : "text-encre-4")}>{o.compte}</span>
          )}
          {actif === o.cle && <i className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent" />}
        </button>
      ))}
    </div>
  );
}

/** Sélecteur de période en texte nu, actif en bleu — la forme UniFi. */
export function SelecteurPeriode({ options, valeur, surChoix }: {
  options: string[]; valeur: string; surChoix: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Période observée">
      {options.map((o) => (
        <button
          key={o} type="button" aria-pressed={valeur === o} onClick={() => surChoix(o)}
          className={cx(
            "h-[26px] px-[9px] rounded-[4px] text-[12px] whitespace-nowrap transi",
            valeur === o ? "text-accent font-semibold bg-accent-voile" : "text-encre-3 hover:text-encre hover:bg-survol",
          )}
        >{o}</button>
      ))}
    </div>
  );
}

/** Pastille d'état animée : le point pulse tant que la chose est vivante. */
export function Pastille({ ton, pulse }: {
  ton: "bon" | "vigilance" | "serieux" | "critique" | "neutre" | "accent"; pulse?: boolean;
}) {
  const c = {
    bon: "text-bon", vigilance: "text-vigilance", serieux: "text-serieux",
    critique: "text-critique", neutre: "text-encre-4", accent: "text-accent",
  }[ton];
  return (
    <span className={cx("relative inline-flex w-[7px] h-[7px] rounded-full bg-current shrink-0", c, pulse && "pulse-etat")} />
  );
}

/** Barre d'activité en ligne, pour les colonnes de tableau. */
export function BarreMini({ valeur, ton = "accent", largeur = 72 }: {
  valeur: number; ton?: "accent" | "bon" | "vigilance" | "critique"; largeur?: number;
}) {
  const c = { accent: "bg-accent", bon: "bg-bon", vigilance: "bg-vigilance", critique: "bg-critique" }[ton];
  return (
    <span className="inline-block h-[4px] rounded-full bg-surface-3 overflow-hidden align-middle" style={{ width: largeur }}>
      <i className={cx("block h-full rounded-full transition-[width] duration-400 ease-[cubic-bezier(0,0,0.2,1)]", c)}
         style={{ width: Math.max(2, Math.min(100, valeur)) + "%" }} />
    </span>
  );
}

/** En-tête de page : titre, phrase d'explication, actions à droite. */
export function Entete({ titre, sous, actions }: { titre: string; sous?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 flex-wrap mb-4">
      <div className="min-w-0">
        <h1 className="text-[19px] leading-[28px] font-semibold tracking-[-.01em]">{titre}</h1>
        {sous && <p className="text-[13px] text-encre-3 mt-[2px]">{sous}</p>}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2 flex-wrap sans-impression">{actions}</div>}
    </div>
  );
}

/** Ligne de réglage : intitulé, explication, et le contrôle à droite. */
export function LigneReglage({ titre, texte, controle, avertissement }: {
  titre: string; texte: string; controle: ReactNode; avertissement?: string;
}) {
  return (
    <div className="flex items-start gap-4 py-[14px] border-b border-bordure last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{titre}</div>
        <p className="text-[12px] text-encre-3 mt-[2px]">{texte}</p>
        {avertissement && (
          <p className="text-[12px] text-vigilance mt-[6px] flex items-start gap-[6px]">
            <Icone nom="alerte" taille="s" className="mt-[2px]" />{avertissement}
          </p>
        )}
      </div>
      <div className="shrink-0 pt-[2px]">{controle}</div>
    </div>
  );
}

/** Chronologie verticale : déploiements, mouvements de carrière, incidents. */
export function Chronologie({ points }: {
  points: Array<{ quand: string; titre: string; texte?: ReactNode; ton?: "bon" | "vigilance" | "critique" | "neutre"; }>;
}) {
  const tons = { bon: "bg-bon", vigilance: "bg-vigilance", critique: "bg-critique", neutre: "bg-encre-4" };
  return (
    <ol className="relative pl-[22px]">
      <i className="absolute left-[5px] top-[6px] bottom-[6px] w-px bg-bordure" aria-hidden="true" />
      {points.map((p, i) => (
        <li key={i} className="relative pb-4 last:pb-0 anim-entre" style={{ animationDelay: i * 40 + "ms" }}>
          <i className={cx("absolute -left-[22px] top-[5px] w-[11px] h-[11px] rounded-full border-2 border-surface", tons[p.ton ?? "neutre"])} />
          <div className="text-[11px] text-encre-3 tab-num">{p.quand}</div>
          <div className="text-[13px] font-semibold">{p.titre}</div>
          {p.texte && <div className="text-[12px] text-encre-2 mt-[2px]">{p.texte}</div>}
        </li>
      ))}
    </ol>
  );
}

/** Frise de disponibilité : une case par jour, comme une page d'état publique. */
export function FriseDisponibilite({ jours, legende = true }: {
  jours: Array<{ date: string; taux: number }>; legende?: boolean;
}) {
  const ton = (t: number) => t >= 99.95 ? "bg-bon" : t >= 99.5 ? "bg-vigilance" : t >= 98 ? "bg-serieux" : "bg-critique";
  return (
    <div>
      <div className="flex gap-[2px] items-end">
        {jours.map((j) => (
          <span
            key={j.date} title={`${new Date(j.date).toLocaleDateString("fr-FR")} — ${j.taux.toFixed(2)} %`}
            className={cx("flex-1 min-w-[3px] h-[30px] rounded-[1px] transi hover:opacity-70", ton(j.taux))}
          />
        ))}
      </div>
      {legende && (
        <div className="flex items-center justify-between text-[11px] text-encre-3 mt-[6px]">
          <span>il y a {jours.length} jours</span>
          <span className="flex items-center gap-[10px]">
            <span className="inline-flex items-center gap-[4px]"><i className="w-[7px] h-[7px] rounded-[1px] bg-bon" />complet</span>
            <span className="inline-flex items-center gap-[4px]"><i className="w-[7px] h-[7px] rounded-[1px] bg-vigilance" />dégradé</span>
            <span className="inline-flex items-center gap-[4px]"><i className="w-[7px] h-[7px] rounded-[1px] bg-critique" />interrompu</span>
          </span>
          <span>aujourd'hui</span>
        </div>
      )}
    </div>
  );
}

/** Étapes d'un enchaînement : construction, tests, livraison. */
export function Etapes({ etapes }: {
  etapes: Array<{ nom: string; etat: "faite" | "en cours" | "attente" | "échouée"; duree?: string }>;
}) {
  return (
    <div className="flex items-stretch gap-[2px] flex-wrap">
      {etapes.map((e, i) => {
        const fond = e.etat === "faite" ? "bg-bon-voile text-bon border-bon/30"
          : e.etat === "en cours" ? "bg-accent-voile text-accent border-accent/40"
          : e.etat === "échouée" ? "bg-critique-voile text-critique border-critique/40"
          : "bg-surface-2 text-encre-3 border-bordure";
        return (
          <div key={i} className={cx("flex items-center gap-[6px] px-[10px] h-[28px] rounded-[4px] border text-[12px] font-medium", fond)}>
            {e.etat === "faite" && <Icone nom="check" taille="s" />}
            {e.etat === "en cours" && <Icone nom="rafraichir" taille="s" className="animate-spin [animation-duration:1.6s]" />}
            {e.etat === "échouée" && <Icone nom="croix" taille="s" />}
            {e.nom}
            {e.duree && <span className="text-encre-4 tab-num">{e.duree}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================================
   TUILES — les rangées « Principaux AP / clients / applications » d'UniFi :
   des carrés arrondis, le premier mis en avant, l'intitulé tronqué dessous.
   ========================================================================= */
export function RangeeTuiles({ titre, tuiles, surChoix }: {
  titre: string;
  tuiles: Array<{ cle: string; nom: string; icone?: NomIcone; initiales?: string; valeur: string; actif?: boolean }>;
  surChoix?: (cle: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold text-encre-3 mb-[10px]">{titre}</div>
      <div className="flex gap-[6px] overflow-x-auto pb-1">
        {tuiles.map((t) => (
          <button
            key={t.cle} type="button" onClick={() => surChoix?.(t.cle)} title={`${t.nom} — ${t.valeur}`}
            className="shrink-0 w-[46px] text-center group"
          >
            <span className={cx(
              "w-[46px] h-[46px] rounded-[8px] grid place-items-center border transi souleve",
              t.actif
                ? "bg-accent text-accent-encre border-accent"
                : "bg-surface-2 border-bordure text-encre-2 group-hover:border-bordure-2",
            )}>
              {t.icone
                ? <Icone nom={t.icone} taille="l" />
                : <span className="text-[13px] font-semibold">{t.initiales}</span>}
            </span>
            <span className="block text-[10px] text-encre-3 mt-[5px] truncate">{t.nom}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Curseur de période : la barre bleue sous le graphique héros d'UniFi. */
export function CurseurPeriode({ debut, fin, surEtendre }: {
  debut: string; fin: string; surEtendre?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-[var(--pas-carte)] pb-[var(--pas-carte)]">
      <Icone nom="boussole" taille="s" className="text-encre-4 shrink-0" />
      <div className="relative flex-1 h-[6px] rounded-full bg-surface-3 overflow-hidden">
        <i className="absolute inset-y-0 left-0 right-0 rounded-full bg-accent" />
      </div>
      <span className="text-[10px] text-encre-4 tab-num shrink-0 max-sm:hidden">{debut} → {fin}</span>
      <button type="button" onClick={surEtendre} aria-label="Étendre la période"
        className="text-encre-4 hover:text-encre transi shrink-0">
        <Icone nom="chevronDroite" taille="s" />
      </button>
    </div>
  );
}

/* Case à cocher colorée servant de légende, comme les bascules de séries
   au-dessus du graphique d'UniFi. */
export function CaseSerie({ nom, couleur, actif, surChangement }: {
  nom: string; couleur: string; actif: boolean; surChangement: () => void;
}) {
  return (
    <button type="button" role="checkbox" aria-checked={actif} onClick={surChangement}
      className="inline-flex items-center gap-[7px] h-[26px] px-[8px] rounded-[4px] hover:bg-survol transi">
      <span className={cx(
        "w-[14px] h-[14px] rounded-[3px] border grid place-items-center shrink-0",
        actif ? "border-transparent" : "border-bordure-2 bg-surface",
      )} style={actif ? { background: couleur } : undefined}>
        {actif && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"
               strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>
        )}
      </span>
      <span className="inline-flex items-center gap-[5px] text-[12px] text-encre-2 whitespace-nowrap">
        <i className="w-[6px] h-[6px] rounded-full" style={{ background: couleur }} />
        {nom}
      </span>
    </button>
  );
}
