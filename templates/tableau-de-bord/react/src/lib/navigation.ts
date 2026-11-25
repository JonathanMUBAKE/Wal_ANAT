import type { NomIcone } from "../composants/Icone";

export interface EntreeNav {
  cle: string;
  nom: string;
  icone: NomIcone;
  compte?: number;
  ton?: "critique" | "vigilance";
}
export interface GroupeNav { groupe: string; icone: NomIcone; entrees: EntreeNav[] }

/* Source unique : le rail d'icônes, le panneau de section, le fil d'Ariane et
   la palette de commandes lisent tous cette liste. Ajouter une page = une
   ligne ici, plus un `case` dans Vue() de CentreDeCommande.tsx. */
export const NAVIGATION: GroupeNav[] = [
  { groupe: "Pilotage", icone: "grille", entrees: [
    { cle: "apercu", nom: "Vue d'ensemble", icone: "grille" },
    { cle: "activite", nom: "Activité", icone: "pouls" },
    { cle: "rapports", nom: "Rapports", icone: "rapport" },
  ]},
  { groupe: "Dossiers", icone: "boite", entrees: [
    { cle: "portefeuille", nom: "Portefeuille", icone: "balance", compte: 1, ton: "vigilance" },
    { cle: "accords", nom: "Accords et partenaires", icone: "rapport", compte: 2, ton: "vigilance" },
  ]},
  { groupe: "Secrétariat", icone: "enveloppe", entrees: [
    { cle: "courrier", nom: "Courrier", icone: "enveloppe", compte: 3, ton: "vigilance" },
    { cle: "seances", nom: "Séances", icone: "utilisateurs", compte: 1, ton: "vigilance" },
    { cle: "decisions", nom: "Registre des décisions", icone: "balance", compte: 2, ton: "critique" },
    { cle: "signataire", nom: "Signataire", icone: "cle", compte: 2 },
  ]},
  { groupe: "Exploitation", icone: "serveur", entrees: [
    { cle: "services", nom: "Services", icone: "serveur", compte: 12 },
    { cle: "taches", nom: "Tâches", icone: "tache", compte: 10 },
    { cle: "files", nom: "Files d'attente", icone: "file" },
    { cle: "deploiements", nom: "Déploiements", icone: "fusee", compte: 1 },
    { cle: "console", nom: "Console d'exploitation", icone: "terminal" },
    { cle: "incidents", nom: "Incidents et astreinte", icone: "alerte", compte: 2, ton: "critique" },
  ]},
  { groupe: "Infrastructure", icone: "puce", entrees: [
    { cle: "sante", nom: "Santé du serveur", icone: "thermometre", compte: 2, ton: "vigilance" },
    { cle: "basededonnees", nom: "Base de données", icone: "base", compte: 1, ton: "critique" },
    { cle: "capacite", nom: "Capacité et coûts", icone: "monnaie", compte: 1, ton: "critique" },
  ]},
  { groupe: "Sécurité", icone: "bouclier", entrees: [
    { cle: "securite", nom: "Posture de sécurité", icone: "bouclier", compte: 1, ton: "critique" },
    { cle: "anomalies", nom: "Anomalies et correctifs", icone: "alerte", compte: 6, ton: "critique" },
    { cle: "surveillance", nom: "Surveillance réseau", icone: "boussole", compte: 2, ton: "critique" },
  ]},
  { groupe: "Observabilité", icone: "trace", entrees: [
    { cle: "journaux", nom: "Journaux", icone: "terminal" },
    { cle: "collecte", nom: "Collecte des journaux", icone: "file", compte: 1, ton: "vigilance" },
    { cle: "gestes", nom: "Actions critiques", icone: "corbeille", compte: 3, ton: "critique" },
    { cle: "traces", nom: "Traces", icone: "trace" },
    { cle: "alertes", nom: "Alertes", icone: "alerte", compte: 5, ton: "critique" },
    { cle: "disponibilite", nom: "Disponibilité", icone: "horloge" },
  ]},
  { groupe: "Intelligence", icone: "etoiles", entrees: [
    { cle: "agents", nom: "Agents IA", icone: "robot", compte: 6 },
    { cle: "modeles", nom: "Modèles et clés", icone: "puce" },
    { cle: "mcp", nom: "Connecteurs MCP", icone: "branche", compte: 3, ton: "vigilance" },
  ]},
  { groupe: "Communication", icone: "discussion", entrees: [
    { cle: "canaux", nom: "Canaux d'envoi", icone: "prise" },
    { cle: "modelesmessages", nom: "Modèles de messages", icone: "rapport" },
    { cle: "envois", nom: "Envois", icone: "enveloppe" },
  ]},
  { groupe: "Accès", icone: "utilisateurs", entrees: [
    { cle: "utilisateurs", nom: "Utilisateurs", icone: "utilisateurs" },
    { cle: "droits", nom: "Rôles et droits", icone: "bouclier" },
    { cle: "sessions", nom: "Sessions", icone: "moniteur" },
    { cle: "jetons", nom: "Jetons d'API", icone: "cle" },
  ]},
  { groupe: "Système", icone: "reglages", entrees: [
    { cle: "parametres", nom: "Paramètres", icone: "reglages" },
    { cle: "integrations", nom: "Intégrations", icone: "prise", compte: 1, ton: "critique" },
    { cle: "sauvegardes", nom: "Sauvegardes", icone: "base" },
    { cle: "audit", nom: "Journal d'audit", icone: "audit" },
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
