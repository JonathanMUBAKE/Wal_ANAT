import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Bouton, Carte } from "./Primitives";
import { Icone } from "./Icone";
import { SqueletteCarte } from "./Mouvement";
import { EchecAppel, expliquer } from "../lib/api/client";
import { useSource } from "../lib/api/source";
import { cx } from "../lib/format";

/* =========================================================================
   Lire quelque chose de distant, et ne jamais mentir sur le résultat.

   Quatre états, et un seul affiche des chiffres :

     chargement — on ne sait pas encore
     ok         — on sait
     refus      — la personne n'a pas ce droit. Ce n'est PAS une panne
     panne      — on n'a pas pu lire. Surtout pas de zéro à la place

   C'est le composant qui tient la règle la plus importante de cette console :
   un écran qui affiche 0 alors qu'il n'a pas réussi à lire est un mensonge, et
   ce mensonge-là est indétectable par celui qui le lit.
   ========================================================================= */

export type EtatLecture = "chargement" | "ok" | "refus" | "panne";

export function useDistant<T>(charger: () => Promise<T>, deps: unknown[] = []) {
  const { source } = useSource();
  const [donnees, poserDonnees] = useState<T | null>(null);
  const [etat, poserEtat] = useState<EtatLecture>("chargement");
  const [echec, poserEchec] = useState<unknown>(null);
  const vivant = useRef(true);

  const relancer = useCallback(() => {
    if (source !== "application") { poserEtat("ok"); poserDonnees(null); return; }
    poserEtat("chargement");
    charger()
      .then((d) => { if (!vivant.current) return; poserDonnees(d); poserEtat("ok"); })
      .catch((e: unknown) => {
        if (!vivant.current) return;
        poserEchec(e);
        poserEtat(e instanceof EchecAppel && e.nature === "refus" ? "refus" : "panne");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, ...deps]);

  useEffect(() => {
    vivant.current = true;
    relancer();
    return () => { vivant.current = false; };
  }, [relancer]);

  return { donnees, etat, echec, relancer, direct: source === "application" };
}

/* --- Ce qu'on montre quand on n'a pas pu lire --------------------------- */
export function Empechement({ etat, echec, relancer, compact }: {
  etat: EtatLecture; echec: unknown; relancer?: () => void; compact?: boolean;
}) {
  if (etat !== "refus" && etat !== "panne") return null;
  const { titre, texte, ton } = expliquer(echec);
  return (
    <div className={cx(
      "flex items-start gap-3 flex-wrap rounded-[4px] border anim-apparait",
      compact ? "px-3 py-[10px]" : "px-4 py-3",
      ton === "critique" ? "bg-critique-voile border-critique/40" : "bg-vigilance-voile border-vigilance/40",
    )}>
      <Icone nom={etat === "refus" ? "verrou" : "halte"}
        className={cx("mt-[2px]", ton === "critique" ? "text-critique" : "text-vigilance")} />
      <div className="flex-1 min-w-[min(100%,240px)] text-[13px]">
        <b>{titre}</b> <span className="text-encre-2">{texte}</span>
      </div>
      {etat === "panne" && relancer && (
        <Bouton taille="s" icone="rafraichir" onClick={relancer} enfants="Réessayer" />
      )}
    </div>
  );
}

/* --- L'enveloppe d'un écran branché ------------------------------------- */
export function Zone({ etat, echec, relancer, squelette = 3, enfants, gabarit }: {
  etat: EtatLecture; echec: unknown; relancer?: () => void;
  /** Nombre de lignes de squelette pendant le chargement. */
  squelette?: number;
  enfants: ReactNode;
  /** Ce qu'on montre en mode démonstration : les données inventées. */
  gabarit?: ReactNode;
}) {
  const { source } = useSource();
  if (source !== "application") return <>{gabarit ?? enfants}</>;
  if (etat === "chargement") return <SqueletteCarte lignes={squelette} />;
  if (etat === "refus" || etat === "panne")
    return <Carte enfants={<div className="pas-carte"><Empechement etat={etat} echec={echec} relancer={relancer} compact /></div>} />;
  return <>{enfants}</>;
}

/* --- Le bandeau « cette liste est tronquée » ---------------------------- */
export function Tronquee({ combien }: { combien: number }) {
  return (
    <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-surface-2 border border-bordure">
      <Icone nom="info" className="text-encre-3 mt-[2px]" />
      <p className="flex-1 min-w-[min(100%,240px)] text-[13px] text-encre-2">
        <b>Les {combien} entrées les plus récentes.</b> Il y en a davantage, et cet écran ne sait pas
        aller plus loin — l'application ne propose pas encore de parcourir l'historique. Les chiffres
        de cette page ne portent donc que sur ce qui est affiché.
      </p>
    </div>
  );
}

/* =========================================================================
   Les écrans qui ne sont pas branchés doivent le dire eux-mêmes.

   C'est posé une seule fois, dans le routeur, plutôt que répété dans vingt
   fichiers : la liste des écrans branchés est la seule chose à tenir à jour,
   et un écran qu'on oublie d'y inscrire se signale comme gabarit — l'erreur
   par défaut est donc celle qui ne ment pas.
   ========================================================================= */
export const ECRANS_BRANCHES = new Set([
  "apercu", "sessions", "utilisateurs", "droits", "audit",
  "dormance", "gestes", "parametres", "agents", "canaux", "envois", "activite",
]);

export function BandeauGabarit({ cle }: { cle: string }) {
  const { source } = useSource();
  if (source !== "application" || ECRANS_BRANCHES.has(cle)) return null;
  return (
    <div className="flex items-start gap-3 flex-wrap px-4 py-3 rounded-[4px] mb-4 bg-surface-2 border border-bordure border-dashed">
      <Icone nom="boite" className="text-encre-3 mt-[2px]" />
      <p className="flex-1 min-w-[min(100%,260px)] text-[13px] text-encre-2">
        <b>Cet écran est un gabarit.</b> Tout ce qu'il affiche est inventé : ANAT Pilotage n'expose
        rien de comparable, et c'est normal — il montre ce qu'une console sait faire pour un autre
        genre de système, un serveur loué ou un cluster. Rien ici ne décrit votre installation.
      </p>
    </div>
  );
}
