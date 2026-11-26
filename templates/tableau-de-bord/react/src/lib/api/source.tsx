import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { EchecAppel, expliquer } from "./client";
import { moi, type Moi } from "./anat";

/* =========================================================================
   D'où viennent les données affichées — et le dire toujours.

   La console sert deux usages qui ne doivent jamais être confondus :

   - **Démonstration** : des données inventées, pour montrer ce que la console
     sait faire sur un système qu'elle ne pilote pas encore. C'est le gabarit,
     réutilisable ailleurs.
   - **Application** : les vraies données d'ANAT Pilotage, lues à travers son
     API, avec la session de la personne connectée.

   Un écran de démonstration qui se ferait passer pour du réel serait la pire
   faute possible dans un outil d'administration. La source est donc affichée
   en permanence dans la barre supérieure, et elle n'est jamais devinée.
   ========================================================================= */

export type Source = "demonstration" | "application";

interface EtatSource {
  source: Source;
  poserSource: (s: Source) => void;
  /** La personne connectée à l'application, quand la source est « application ». */
  identite: Moi | null;
  /** Pourquoi l'application n'est pas joignable, le cas échéant. */
  empechement: string | null;
  verifier: () => void;
}

const Contexte = createContext<EtatSource | null>(null);
const CLE = "centre-de-commande:source";

export function FournisseurSource({ children }: { children: ReactNode }) {
  const [source, poser] = useState<Source>(() => {
    try {
      return localStorage.getItem(CLE) === "application" ? "application" : "demonstration";
    } catch {
      return "demonstration";
    }
  });
  const [identite, poserIdentite] = useState<Moi | null>(null);
  const [empechement, poserEmpechement] = useState<string | null>(null);

  const verifier = useCallback(() => {
    moi()
      .then((m) => { poserIdentite(m); poserEmpechement(null); })
      .catch((e: unknown) => {
        poserIdentite(null);
        poserEmpechement(
          e instanceof EchecAppel && e.nature === "refus"
            ? "Vous n'êtes pas connecté à l'application. Ouvrez une session, puis revenez."
            : expliquer(e).texte,
        );
      });
  }, []);

  useEffect(() => {
    if (source === "application") verifier();
    else { poserIdentite(null); poserEmpechement(null); }
  }, [source, verifier]);

  const poserSource = useCallback((s: Source) => {
    poser(s);
    try { localStorage.setItem(CLE, s); } catch { /* navigation privée */ }
  }, []);

  return (
    <Contexte.Provider value={{ source, poserSource, identite, empechement, verifier }}>
      {children}
    </Contexte.Provider>
  );
}

export function useSource(): EtatSource {
  const c = useContext(Contexte);
  if (!c) throw new Error("useSource doit être appelé sous <FournisseurSource>");
  return c;
}
