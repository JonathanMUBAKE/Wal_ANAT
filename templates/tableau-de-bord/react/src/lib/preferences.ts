import { useEffect, useState } from "react";

/** Préférence d'affichage persistée, posée en attribut sur <html>. */
export function usePreference(cle: string, parDefaut: string, attribut?: string) {
  const [valeur, poser] = useState<string>(() => {
    try { return localStorage.getItem("cdc." + cle) ?? parDefaut; } catch { return parDefaut; }
  });
  useEffect(() => {
    try { localStorage.setItem("cdc." + cle, valeur); } catch { /* navigation privée */ }
    if (attribut) document.documentElement.setAttribute(attribut, valeur);
  }, [cle, valeur, attribut]);
  return [valeur, poser] as const;
}

/** Ferme une superposition à la touche Échap. */
export function useEchap(actif: boolean, fermer: () => void) {
  useEffect(() => {
    if (!actif) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [actif, fermer]);
}

/** Ferme un menu au clic hors de sa zone. */
export function useClicExterieur<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  actif: boolean,
  fermer: () => void,
) {
  useEffect(() => {
    if (!actif) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fermer();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, actif, fermer]);
}
