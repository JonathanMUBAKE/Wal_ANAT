import type { JSX } from "react";

/* Jeu d'icônes en ligne : aucune dépendance, aucun appel réseau.
   Ajouter une icône = ajouter une entrée ici. Trait de 1,7 px, grille 24. */
const TRACES: Record<string, JSX.Element> = {
  grille: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  pouls: <path d="M3 12h4l3 8 4-16 3 8h4" />,
  rapport: <><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" /><path d="M9 13h6M9 17h4" /></>,
  serveur: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
  tache: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m8 12 3 3 5-6" /></>,
  file: <><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>,
  fusee: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /></>,
  terminal: <><path d="m4 17 6-6-6-6" /><path d="M12 19h8" /></>,
  trace: <><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></>,
  alerte: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>,
  horloge: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  utilisateurs: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
  bouclier: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  moniteur: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  cle: <><circle cx="7.5" cy="15.5" r="3.5" /><path d="m10 13 8-8 3 3-2 2-2-2-2 2 2 2-3 3-2-2" /></>,
  reglages: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  prise: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /><path d="M11 7h4a2 2 0 0 1 2 2v4" /></>,
  base: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" /></>,
  audit: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3 6 1.3 1.3L6.6 5" /><path d="m3 12 1.3 1.3L6.6 11" /><path d="m3 18 1.3 1.3L6.6 17" /></>,
  recherche: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></>,
  cloche: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  soleil: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  lune: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  chevronBas: <path d="m6 9 6 6 6-6" />,
  chevronGauche: <path d="m15 18-6-6 6-6" />,
  chevronDroite: <path d="m9 18 6-6-6-6" />,
  selecteur: <path d="m8 9 4-4 4 4M8 15l4 4 4-4" />,
  croix: <path d="M18 6 6 18M6 6l12 12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  telecharger: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
  colonnes: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18" /></>,
  points: <><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" /></>,
  rafraichir: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></>,
  pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
  lecture: <path d="m6 4 14 8-14 8z" />,
  check: <path d="m4 12 5 5L20 6" />,
  checkCercle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  tendanceHaut: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  tendanceBas: <><path d="m3 7 6 6 4-4 8 8" /><path d="M15 17h6v-6" /></>,
  clavier: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6" /></>,
  deconnexion: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  eclair: <path d="M13 2 3 14h8l-1 8 10-12h-8z" />,
  monnaie: <><circle cx="12" cy="12" r="9" /><path d="M15 9.2A3.2 3.2 0 0 0 12 7.8c-1.6 0-2.9.8-2.9 2s1.3 1.7 2.9 2 2.9.8 2.9 2-1.3 2-2.9 2A3.2 3.2 0 0 1 9 14.4" /><path d="M12 6.3v1.5M12 16.2v1.5" /></>,
  escalade: <><path d="M7 17 17 7" /><path d="M9 7h8v8" /></>,
  puissance: <><path d="M12 3v9" /><path d="M18.4 6.6a9 9 0 1 1-12.8 0" /></>,
  oeil: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  corbeille: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="m6 7 1 13h10l1-13" /><path d="M9 7V4h6v3" /></>,
  puce: <><rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M3.5 10h-1.5M3.5 14h-1.5M20.5 10H22M20.5 14H22M10 3.5V2M14 3.5V2M10 20.5V22M14 20.5V22"/></>,
  memoire: <><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 17v3M10 17v3M14 17v3M18 17v3M6 11v2M10 11v2M14 11v2M18 11v2"/></>,
  thermometre: <><path d="M14 14.8V4a2 2 0 1 0-4 0v10.8a4.5 4.5 0 1 0 4 0z"/><path d="M12 9v6"/></>,
  ventilateur: <><circle cx="12" cy="12" r="2"/><path d="M12 10c0-3.5 1-7 3.5-7S19 6 16 8.5c-1.5 1.2-2.8 1.5-4 1.5z"/><path d="M14 12c3.5 0 7 1 7 3.5S18 19 15.5 16c-1.2-1.5-1.5-2.8-1.5-4z"/><path d="M10 14c0 3.5-1 7-3.5 7S5 18 8 15.5c1.5-1.2 2.8-1.5 4-1.5z"/><path d="M10 12c-3.5 0-7-1-7-3.5S6 5 8.5 8c1.2 1.5 1.5 2.8 1.5 4z"/></>,
  alimentation: <><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 12h4M14 10l2 2-2 2"/><path d="M18 10v4"/></>,
  disque: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2"/></>,
  robot: <><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none"/><path d="M4 13H2.5M21.5 13H20"/></>,
  etoiles: <><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/></>,
  branche: <><circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 7.5v9M8.5 5h4a3 3 0 0 1 3 3v2M8.5 19h4a3 3 0 0 0 3-3v-2"/></>,
  enveloppe: <><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  telephone: <path d="M6.6 3.5h3l1.5 3.8-2 1.4a12 12 0 0 0 5.2 5.2l1.4-2 3.8 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>,
  discussion: <><path d="M21 11.5a8 8 0 0 1-11.6 7.1L3.5 20.5l1.9-5.9A8 8 0 1 1 21 11.5z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></>,
  boussole: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5.5-5.5 2 2-5.5z"/></>,
  balance: <><path d="M12 4v16M7 20h10"/><path d="M5 8h14M5 8l-2.5 5a3 3 0 0 0 5 0zM19 8l2.5 5a3 3 0 0 1-5 0z"/></>,
  boite: <><path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></>,
};

export type NomIcone = keyof typeof TRACES;
export const NOMS_ICONES = Object.keys(TRACES) as NomIcone[];

const TAILLES = { s: 15, m: 18, l: 22 } as const;

export function Icone({ nom, taille = "m", className = "" }: {
  nom: NomIcone;
  taille?: keyof typeof TAILLES;
  className?: string;
}) {
  const px = TAILLES[taille];
  return (
    <svg
      width={px} height={px} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      className={"shrink-0 " + className}
      fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round"
    >
      {TRACES[nom]}
    </svg>
  );
}
