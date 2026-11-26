import type { NomIcone } from "../composants/Icone";

export interface EntreeNav {
  cle: string;
  nom: string;
  icone: NomIcone;
  compte?: number;
  ton?: "critique" | "vigilance";
}
export interface GroupeNav { groupe: string; icone: NomIcone; entrees: EntreeNav[] }

/* =========================================================================
   Source unique : le rail d'icônes, le panneau de section, le fil d'Ariane et
   la palette de commandes lisent tous cette liste.

   **Règle de cette liste, depuis le 26 novembre 2026 :** un écran n'y figure
   que s'il correspond à quelque chose de réel.

   Il y en avait trente-neuf. Vingt-trois montraient ce qu'une console sait
   faire pour *un autre genre de système* — un serveur loué, un cluster, un
   courtier de messages : services, files d'attente, déploiements, capacité,
   traces, sauvegardes, connecteurs MCP. Pour administrer ANAT Pilotage, ils ne
   voulaient rien dire, et un écran qui ne veut rien dire en apprend un faux.

   Il en reste seize, en sept domaines. Treize lisent l'application ; trois
   portent l'état propre à la console — le registre des contrôles, la file
   d'approbation, les garde-fous — et ceux-là n'ont pas d'équivalent serveur
   parce qu'ils n'en ont pas besoin : ils décrivent ce que la console s'autorise.

   Les écrans retirés ne sont pas perdus : ils vivent sur la branche
   `centre-de-commande-standard`, qui reste le gabarit réutilisable ailleurs.
   Ici, c'est une console pour ANAT Pilotage, et rien d'autre.
   ========================================================================= */
export const NAVIGATION: GroupeNav[] = [
  { groupe: "Pilotage", icone: "grille", entrees: [
    { cle: "apercu", nom: "Vue d'ensemble", icone: "grille" },
    { cle: "activite", nom: "Activité", icone: "pouls" },
  ]},
  { groupe: "Accès", icone: "utilisateurs", entrees: [
    { cle: "utilisateurs", nom: "Utilisateurs", icone: "utilisateurs" },
    { cle: "droits", nom: "Rôles et droits", icone: "bouclier" },
    { cle: "sessions", nom: "Sessions", icone: "moniteur" },
    { cle: "dormance", nom: "Comptes dormants", icone: "horloge" },
  ]},
  { groupe: "Sécurité", icone: "bouclier", entrees: [
    { cle: "securite", nom: "Posture de sécurité", icone: "bouclier" },
    { cle: "gestes", nom: "Actions critiques", icone: "corbeille" },
    { cle: "audit", nom: "Journal d'audit", icone: "audit" },
  ]},
  { groupe: "Contrôles", icone: "verrou", entrees: [
    { cle: "controles", nom: "Registre des contrôles", icone: "verrou" },
    { cle: "approbations", nom: "Approbations", icone: "tampon" },
    { cle: "gardefous", nom: "Garde-fous", icone: "bouclier" },
  ]},
  { groupe: "Intelligence", icone: "etoiles", entrees: [
    { cle: "agents", nom: "Agents IA", icone: "robot" },
  ]},
  { groupe: "Communication", icone: "discussion", entrees: [
    { cle: "canaux", nom: "Canaux d'envoi", icone: "prise" },
    { cle: "envois", nom: "Envois", icone: "enveloppe" },
  ]},
  { groupe: "Système", icone: "reglages", entrees: [
    { cle: "parametres", nom: "Paramètres", icone: "reglages" },
  ]},
];

/* Toutes les pages sont branchées : chacune a sa vue dans src/vues. */
export const VUES_BRANCHEES = new Set(
  NAVIGATION.flatMap((g) => g.entrees.map((e) => e.cle)),
);

export function trouverEntree(cle: string): (EntreeNav & { groupe: string }) | null {
  for (const g of NAVIGATION) {
    const e = g.entrees.find((x) => x.cle === cle);
    if (e) return { ...e, groupe: g.groupe };
  }
  return null;
}

export function groupeDe(cle: string): GroupeNav | null {
  return NAVIGATION.find((g) => g.entrees.some((e) => e.cle === cle)) ?? null;
}
