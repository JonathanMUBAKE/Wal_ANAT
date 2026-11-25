/* =========================================================================
   INTELLIGENCE — agents IA, modèles et connecteurs MCP
   Trois partis pris, tirés de ce que font les plateformes sérieuses :
   1. Les garde-fous ne vivent pas dans les instructions. Une consigne écrite
      en prose se négocie ; une liste d'outils autorisés, non.
   2. Un outil qui écrit est séparé d'un outil qui lit, et tout ce qui écrit
      demande un humain.
   3. Un outil ajouté après coup à un connecteur ne s'exécute pas tout seul :
      il repasse par une approbation.
   Tout est simulé.
   ========================================================================= */

import { alea, choix, entre } from "./donnees";
import { AGENTS_NOMS } from "./sigrh";

/* --- Modèles disponibles ------------------------------------------------- */
export interface ModeleIA {
  cle: string; nom: string; fournisseur: string; usage: string;
  entree: number; sortie: number; contexte: string; latence: number;
  heberge: "Nuage" | "Sur site"; actif: boolean; defaut: boolean;
}
export const modeles: ModeleIA[] = [
  { cle: "grand", nom: "Modèle de raisonnement", fournisseur: "Fournisseur A", usage: "Analyse, rédaction, interprétation des journaux", entree: 3, sortie: 15, contexte: "200 k jetons", latence: 2400, heberge: "Nuage", actif: true, defaut: true },
  { cle: "rapide", nom: "Modèle rapide", fournisseur: "Fournisseur A", usage: "Classement, extraction, réponses courtes", entree: 0.8, sortie: 4, contexte: "200 k jetons", latence: 620, heberge: "Nuage", actif: true, defaut: false },
  { cle: "local", nom: "Modèle sur site", fournisseur: "Hébergé par l'Agence", usage: "Données sensibles qui ne sortent pas du réseau", entree: 0, sortie: 0, contexte: "32 k jetons", latence: 4100, heberge: "Sur site", actif: true, defaut: false },
  { cle: "vision", nom: "Modèle documents", fournisseur: "Fournisseur B", usage: "Lecture de pièces scannées", entree: 2, sortie: 8, contexte: "128 k jetons", latence: 3200, heberge: "Nuage", actif: false, defaut: false },
];

export const clesModeles = [
  { id: "K-01", nom: "Clé de production", fournisseur: "Fournisseur A", prefixe: "sk-prod-9f21", creePar: "Idriss Kouassi", creeLe: "12/03/2026", derniereUtilisation: "il y a 2 min", actif: true, plafondMensuel: 400, consomme: 284.6 },
  { id: "K-02", nom: "Clé de recette", fournisseur: "Fournisseur A", prefixe: "sk-rec-4b08", creePar: "Awa Diallo", creeLe: "12/03/2026", derniereUtilisation: "il y a 3 j", actif: true, plafondMensuel: 50, consomme: 8.2 },
  { id: "K-03", nom: "Lecture de documents", fournisseur: "Fournisseur B", prefixe: "sk-doc-1cd7", creePar: "Idriss Kouassi", creeLe: "04/09/2026", derniereUtilisation: "jamais", actif: false, plafondMensuel: 100, consomme: 0 },
];

export const confidentialite = {
  sortieDonnees: "Pseudonymisée avant envoi",
  retentionFournisseur: "Zéro jour (conservation désactivée au contrat)",
  entrainement: false,
  journalisationInvites: true,
  retentionInvites: 90,
  modeleParDefautSensible: "local",
  categoriesInterdites: ["Numéro de sécurité sociale", "Données de santé", "Coordonnées bancaires"],
};

/* --- Agents -------------------------------------------------------------- */
export type EtatAgent = "actif" | "en essai" | "suspendu";

export interface OutilAgent {
  nom: string; portee: "lecture" | "écriture"; source: string; approbation: "automatique" | "humaine";
}
export interface DocumentAgent {
  nom: string; type: string; taille: string; indexe: string; morceaux: number; sensibilite: "Interne" | "Restreint" | "Public";
}
export interface AgentIA {
  cle: string; nom: string; role: string; etat: EtatAgent; modele: string;
  instructions: string;
  outils: OutilAgent[];
  documents: DocumentAgent[];
  gardeFous: { libelle: string; actif: boolean; explication: string }[];
  budgetSession: number; budgetJour: number; consommeJour: number;
  executions7j: number; tauxValidation: number; derniereExecution: string;
  responsable: string;
}

export const agentsIA: AgentIA[] = [
  {
    cle: "journaux",
    nom: "Lecteur de journaux",
    role: "Explique une erreur, regroupe les lignes qui racontent la même histoire, propose une cause.",
    etat: "actif", modele: "grand",
    instructions:
      "Tu lis des journaux techniques d'un système de gestion des ressources humaines.\n\n" +
      "Pour une sélection de lignes, rends trois choses, dans cet ordre :\n" +
      "1. Ce qui s'est passé, en une phrase, sans jargon.\n" +
      "2. La cause la plus probable, et ce qui te fait le penser — cite les lignes.\n" +
      "3. Ce que tu vérifierais ensuite, dans l'ordre où tu le ferais.\n\n" +
      "Quand les lignes ne suffisent pas à conclure, dis-le au lieu de choisir une cause plausible. " +
      "Tu ne proposes jamais d'action sur la production : un humain décide.",
    outils: [
      { nom: "journaux.rechercher", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "traces.lire", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "services.etat", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "alertes.creer", portee: "écriture", source: "Interne", approbation: "humaine" },
    ],
    documents: [
      { nom: "Procédures d'exploitation", type: "PDF", taille: "2,4 Mio", indexe: "il y a 3 j", morceaux: 412, sensibilite: "Interne" },
      { nom: "Comptes rendus d'incidents 2025-2026", type: "Markdown", taille: "840 Kio", indexe: "il y a 1 j", morceaux: 196, sensibilite: "Restreint" },
      { nom: "Architecture du SIGRH", type: "PDF", taille: "1,1 Mio", indexe: "il y a 12 j", morceaux: 88, sensibilite: "Interne" },
    ],
    gardeFous: [
      { libelle: "Aucun accès en écriture sans approbation", actif: true, explication: "La liste d'outils, pas les instructions, décide de ce qu'il peut appeler." },
      { libelle: "Pas de données nominatives dans l'invite", actif: true, explication: "Les matricules et les noms sont remplacés avant l'envoi au modèle." },
      { libelle: "Refus de conclure sans preuve", actif: true, explication: "Une réponse sans ligne citée est rejetée et redemandée." },
      { libelle: "Plafond de dépense par session", actif: true, explication: "La session s'arrête au plafond plutôt que de continuer silencieusement." },
    ],
    budgetSession: 0.4, budgetJour: 12, consommeJour: 7.42,
    executions7j: 1284, tauxValidation: 86, derniereExecution: "il y a 4 min",
    responsable: "Systèmes d'information",
  },
  {
    cle: "incidents",
    nom: "Rédacteur de comptes rendus",
    role: "Rassemble la chronologie d'un incident et prépare le compte rendu, que le rapporteur corrige.",
    etat: "actif", modele: "grand",
    instructions:
      "Tu prépares le compte rendu d'un incident à partir des alertes, des déploiements et des journaux de la période.\n\n" +
      "Rends la chronologie des faits avec leur horodatage, ce qui a été touché et pendant combien de temps, " +
      "puis ce qui a permis le rétablissement.\n\n" +
      "Tu n'attribues jamais de faute à une personne. Tu écris ce qui s'est passé, pas qui s'est trompé. " +
      "Le texte est un brouillon : il part en validation avant d'être diffusé.",
    outils: [
      { nom: "alertes.lire", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "deploiements.lire", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "journaux.rechercher", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "documents.deposer", portee: "écriture", source: "Interne", approbation: "humaine" },
    ],
    documents: [
      { nom: "Modèle de compte rendu d'incident", type: "Markdown", taille: "18 Kio", indexe: "il y a 20 j", morceaux: 6, sensibilite: "Interne" },
      { nom: "Comptes rendus d'incidents 2025-2026", type: "Markdown", taille: "840 Kio", indexe: "il y a 1 j", morceaux: 196, sensibilite: "Restreint" },
    ],
    gardeFous: [
      { libelle: "Aucune publication directe", actif: true, explication: "Le brouillon ne quitte pas l'outil sans validation humaine." },
      { libelle: "Pas de désignation de personne", actif: true, explication: "Les noms des opérateurs sont retirés du brouillon." },
      { libelle: "Plafond de dépense par session", actif: true, explication: "Un compte rendu coûte au plus le plafond fixé." },
    ],
    budgetSession: 0.8, budgetJour: 6, consommeJour: 1.24,
    executions7j: 14, tauxValidation: 71, derniereExecution: "il y a 2 j",
    responsable: "Systèmes d'information",
  },
  {
    cle: "dossiers",
    nom: "Contrôleur de dossiers",
    role: "Repère les pièces manquantes ou périmées dans les dossiers individuels des agents.",
    etat: "actif", modele: "rapide",
    instructions:
      "Tu compares le contenu d'un dossier individuel à la liste des pièces obligatoires.\n\n" +
      "Rends la liste des pièces manquantes, des pièces périmées et des pièces illisibles, " +
      "avec pour chacune ce qu'il faut demander à l'agent.\n\n" +
      "Tu ne juges jamais le contenu d'une pièce, seulement sa présence, sa date et sa lisibilité.",
    outils: [
      { nom: "documents.lister", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "referentiel.lire", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "notifications.envoyer", portee: "écriture", source: "Interne", approbation: "humaine" },
    ],
    documents: [
      { nom: "Liste des pièces obligatoires", type: "PDF", taille: "240 Kio", indexe: "il y a 30 j", morceaux: 22, sensibilite: "Interne" },
      { nom: "Statut du personnel", type: "PDF", taille: "3,8 Mio", indexe: "il y a 30 j", morceaux: 640, sensibilite: "Public" },
    ],
    gardeFous: [
      { libelle: "Modèle sur site imposé", actif: false, explication: "Les dossiers sortent du réseau ; à basculer si la direction le demande." },
      { libelle: "Aucun envoi direct à l'agent", actif: true, explication: "Les relances passent par la direction des ressources humaines." },
      { libelle: "Pas de données nominatives dans l'invite", actif: true, explication: "Le dossier est traité par matricule, sans état civil." },
    ],
    budgetSession: 0.1, budgetJour: 20, consommeJour: 14.8,
    executions7j: 2840, tauxValidation: 94, derniereExecution: "il y a 18 min",
    responsable: "Ressources humaines",
  },
  {
    cle: "conges",
    nom: "Assistant congés",
    role: "Répond aux agents sur leurs droits, leurs soldes et la procédure à suivre.",
    etat: "en essai", modele: "rapide",
    instructions:
      "Tu réponds aux questions des agents sur les congés : droits acquis, reliquats, procédure, délais.\n\n" +
      "Tu t'appuies uniquement sur le règlement et sur le solde de l'agent qui pose la question. " +
      "Tu ne te prononces jamais sur une demande en cours : c'est au responsable hiérarchique de décider. " +
      "Quand la question sort du règlement, tu renvoies vers les ressources humaines.",
    outils: [
      { nom: "conges.solde", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "reglement.rechercher", portee: "lecture", source: "Interne", approbation: "automatique" },
    ],
    documents: [
      { nom: "Règlement intérieur", type: "PDF", taille: "1,9 Mio", indexe: "il y a 60 j", morceaux: 284, sensibilite: "Public" },
      { nom: "Notes de service 2026", type: "PDF", taille: "620 Kio", indexe: "il y a 8 j", morceaux: 74, sensibilite: "Interne" },
    ],
    gardeFous: [
      { libelle: "Lecture seule", actif: true, explication: "Aucun outil d'écriture n'est attaché à cet agent." },
      { libelle: "Réponse limitée au demandeur", actif: true, explication: "Il ne peut lire que le solde de l'agent qui l'interroge." },
      { libelle: "Phrase de renvoi obligatoire", actif: true, explication: "Chaque réponse rappelle que la décision appartient au responsable." },
    ],
    budgetSession: 0.05, budgetJour: 8, consommeJour: 0.92,
    executions7j: 412, tauxValidation: 68, derniereExecution: "il y a 1 h",
    responsable: "Ressources humaines",
  },
  {
    cle: "anomalies",
    nom: "Détecteur d'anomalies de pointage",
    role: "Signale les badgeages improbables : doublons, oublis, horaires impossibles.",
    etat: "actif", modele: "rapide",
    instructions:
      "Tu examines les badgeages d'une journée et tu signales ce qui mérite un regard humain : " +
      "double pointage, arrivée sans départ, horaires incompatibles avec une mission déclarée.\n\n" +
      "Tu classes chaque signalement par ce qu'il coûterait de l'ignorer. " +
      "Tu ne corriges rien : tu signales, et la direction des ressources humaines tranche.",
    outils: [
      { nom: "pointages.lire", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "missions.lire", portee: "lecture", source: "Interne", approbation: "automatique" },
      { nom: "pointages.corriger", portee: "écriture", source: "Interne", approbation: "humaine" },
    ],
    documents: [
      { nom: "Règles de pointage", type: "Markdown", taille: "42 Kio", indexe: "il y a 14 j", morceaux: 18, sensibilite: "Interne" },
    ],
    gardeFous: [
      { libelle: "Aucune correction automatique", actif: true, explication: "Une correction de pointage touche la paie : elle exige un humain." },
      { libelle: "Signalement motivé obligatoire", actif: true, explication: "Un signalement sans motif lisible est rejeté." },
      { libelle: "Plafond quotidien", actif: true, explication: "L'agent s'arrête au plafond plutôt que de traiter deux fois la même journée." },
    ],
    budgetSession: 0.02, budgetJour: 4, consommeJour: 2.18,
    executions7j: 8_400, tauxValidation: 79, derniereExecution: "il y a 6 min",
    responsable: "Ressources humaines",
  },
  {
    cle: "recherche",
    nom: "Recherche documentaire",
    role: "Retrouve une pièce ou un passage dans les archives, et cite d'où il vient.",
    etat: "suspendu", modele: "local",
    instructions:
      "Tu réponds à une question en citant les passages des documents archivés qui la traitent.\n\n" +
      "Chaque affirmation porte sa source : nom du document, page. " +
      "Quand rien dans les archives ne répond, tu le dis — tu n'inventes pas de référence.",
    outils: [
      { nom: "archives.rechercher", portee: "lecture", source: "Interne", approbation: "automatique" },
    ],
    documents: [
      { nom: "Archives 2022-2026", type: "Index", taille: "412 Gio", indexe: "suspendu", morceaux: 1_840_000, sensibilite: "Restreint" },
    ],
    gardeFous: [
      { libelle: "Modèle sur site imposé", actif: true, explication: "Les archives ne sortent pas du réseau de l'Agence." },
      { libelle: "Citation obligatoire", actif: true, explication: "Une réponse sans source est rejetée." },
    ],
    budgetSession: 0.3, budgetJour: 0, consommeJour: 0,
    executions7j: 0, tauxValidation: 0, derniereExecution: "il y a 22 j",
    responsable: "Systèmes d'information",
  },
];

/* --- Exécutions récentes, en attente de validation ----------------------- */
export interface ExecutionAgent {
  id: string; agent: string; declencheur: string; quand: string; duree: number;
  jetonsEntree: number; jetonsSortie: number; cout: number;
  etat: "validée" | "en attente" | "rejetée" | "automatique";
  resume: string; valideePar: string;
}
export const executionsAgents: ExecutionAgent[] = Array.from({ length: 22 }, (_, i) => {
  const a = choix(agentsIA.filter((x) => x.etat !== "suspendu"));
  const etat = i < 3 ? "en attente" : alea() < 0.1 ? "rejetée" : alea() < 0.4 ? "validée" : "automatique";
  return {
    id: "E-" + (4000 - i),
    agent: a.nom,
    declencheur: alea() < 0.5 ? "Programmation" : choix(AGENTS_NOMS),
    quand: i === 0 ? "à l'instant" : `il y a ${Math.round(entre(1, 240)) + i * 3} min`,
    duree: Math.round(entre(600, 9400)),
    jetonsEntree: Math.round(entre(1200, 48000)),
    jetonsSortie: Math.round(entre(180, 2400)),
    cout: Number(entre(0.004, 0.42).toFixed(3)),
    etat: etat as ExecutionAgent["etat"],
    resume: choix([
      "Trois erreurs 500 sur la passerelle remontent toutes au même délai de base de données.",
      "Dossier A-1182 : attestation de service manquante, pièce d'identité périmée depuis 4 mois.",
      "Double pointage le 24/11 pour 6 agents de l'antenne — la pointeuse a rejoué son tampon.",
      "Le solde de congés de l'agent interrogé est de 12 jours, dont 4 reportés de 2025.",
      "La coupure de 22 h 11 vient de l'onduleur B, pas du service : aucun code applicatif en cause.",
    ]),
    valideePar: etat === "validée" ? choix(AGENTS_NOMS) : "",
  };
});

/* --- Connecteurs MCP ----------------------------------------------------- */
export type PolitiqueMCP = "nommés" | "destructifs" | "tous";

export interface OutilMCP {
  nom: string; description: string; destructif: boolean;
  approbation: "automatique" | "humaine"; appels30j: number; nouveau: boolean;
}
export interface ConnecteurMCP {
  cle: string; nom: string; fournisseur: string; transport: "stdio" | "HTTP" | "WebSocket";
  etat: "connecté" | "dégradé" | "arrêté"; version: string;
  politique: PolitiqueMCP; outils: OutilMCP[];
  derniereVerification: string; agents: string[]; portee: string;
}

export const connecteursMCP: ConnecteurMCP[] = [
  {
    cle: "sigrh", nom: "Référentiel SIGRH", fournisseur: "Interne", transport: "HTTP",
    etat: "connecté", version: "1.4.2", politique: "destructifs",
    derniereVerification: "il y a 2 min", agents: ["Lecteur de journaux", "Contrôleur de dossiers", "Assistant congés"],
    portee: "Lecture du référentiel, écriture sur approbation",
    outils: [
      { nom: "referentiel.lire", description: "Fiche d'un agent par matricule", destructif: false, approbation: "automatique", appels30j: 184_200, nouveau: false },
      { nom: "conges.solde", description: "Solde de congés d'un agent", destructif: false, approbation: "automatique", appels30j: 42_800, nouveau: false },
      { nom: "pointages.lire", description: "Badgeages d'une période", destructif: false, approbation: "automatique", appels30j: 96_400, nouveau: false },
      { nom: "pointages.corriger", description: "Corriger un badgeage", destructif: true, approbation: "humaine", appels30j: 184, nouveau: false },
      { nom: "agent.desactiver", description: "Désactiver un compte agent", destructif: true, approbation: "humaine", appels30j: 2, nouveau: true },
    ],
  },
  {
    cle: "observabilite", nom: "Observabilité", fournisseur: "Interne", transport: "HTTP",
    etat: "connecté", version: "2.0.1", politique: "destructifs",
    derniereVerification: "il y a 1 min", agents: ["Lecteur de journaux", "Rédacteur de comptes rendus"],
    portee: "Lecture des journaux, traces, alertes",
    outils: [
      { nom: "journaux.rechercher", description: "Recherche plein texte dans les journaux", destructif: false, approbation: "automatique", appels30j: 412_000, nouveau: false },
      { nom: "traces.lire", description: "Cascade d'une requête", destructif: false, approbation: "automatique", appels30j: 18_400, nouveau: false },
      { nom: "alertes.lire", description: "Alertes ouvertes et closes", destructif: false, approbation: "automatique", appels30j: 9_200, nouveau: false },
      { nom: "alertes.creer", description: "Créer une règle d'alerte", destructif: true, approbation: "humaine", appels30j: 14, nouveau: false },
    ],
  },
  {
    cle: "documents", nom: "Documents et archives", fournisseur: "Interne", transport: "stdio",
    etat: "dégradé", version: "0.9.4", politique: "tous",
    derniereVerification: "il y a 41 min", agents: ["Contrôleur de dossiers", "Recherche documentaire"],
    portee: "Lecture des pièces, dépôt sur approbation",
    outils: [
      { nom: "documents.lister", description: "Pièces d'un dossier individuel", destructif: false, approbation: "humaine", appels30j: 86_400, nouveau: false },
      { nom: "archives.rechercher", description: "Recherche dans les archives", destructif: false, approbation: "humaine", appels30j: 4_200, nouveau: false },
      { nom: "documents.deposer", description: "Déposer une pièce", destructif: true, approbation: "humaine", appels30j: 96, nouveau: false },
      { nom: "documents.supprimer", description: "Supprimer une pièce", destructif: true, approbation: "humaine", appels30j: 0, nouveau: true },
    ],
  },
  {
    cle: "calendrier", nom: "Agenda institutionnel", fournisseur: "Éditeur externe", transport: "HTTP",
    etat: "arrêté", version: "3.1.0", politique: "tous",
    derniereVerification: "il y a 6 j", agents: [],
    portee: "Aucune — connecteur arrêté",
    outils: [
      { nom: "agenda.lire", description: "Réunions et disponibilités", destructif: false, approbation: "humaine", appels30j: 0, nouveau: false },
      { nom: "agenda.inviter", description: "Créer une invitation", destructif: true, approbation: "humaine", appels30j: 0, nouveau: false },
    ],
  },
];

export interface ApprobationMCP {
  id: string; connecteur: string; outil: string; agent: string; demandeur: string;
  arguments: string; demande: string; expire: string; destructif: boolean;
}
export const approbationsMCP: ApprobationMCP[] = [
  { id: "AP-118", connecteur: "Référentiel SIGRH", outil: "pointages.corriger", agent: "Détecteur d'anomalies de pointage", demandeur: "Programmation", arguments: '{ "matricule": "A-1182", "jour": "2026-11-24", "depart": "17:12" }', demande: "il y a 6 min", expire: "dans 54 min", destructif: true },
  { id: "AP-117", connecteur: "Référentiel SIGRH", outil: "agent.desactiver", agent: "Contrôleur de dossiers", demandeur: "Awa Diallo", arguments: '{ "matricule": "A-0904", "motif": "départ constaté" }', demande: "il y a 22 min", expire: "dans 38 min", destructif: true },
  { id: "AP-116", connecteur: "Observabilité", outil: "alertes.creer", agent: "Lecteur de journaux", demandeur: "Programmation", arguments: '{ "motif": "délai base > 5 s", "gravite": "P2" }', demande: "il y a 1 h", expire: "expire bientôt", destructif: true },
];

export interface AppelMCP {
  id: string; quand: string; agent: string; connecteur: string; outil: string;
  decision: "exécuté" | "approuvé" | "refusé" | "expiré"; duree: number; par: string; correlation: string;
}
export const appelsMCP: AppelMCP[] = Array.from({ length: 26 }, (_, i) => {
  const c = choix(connecteursMCP.filter((x) => x.etat !== "arrêté"));
  const o = choix(c.outils);
  const decision = o.destructif
    ? choix(["approuvé", "refusé", "expiré", "approuvé"] as const)
    : "exécuté" as const;
  return {
    id: "C-" + (9000 - i),
    quand: i === 0 ? "à l'instant" : `il y a ${Math.round(entre(1, 90)) + i * 4} min`,
    agent: choix(agentsIA).nom,
    connecteur: c.nom, outil: o.nom,
    decision,
    duree: Math.round(entre(18, 1400)),
    par: decision === "exécuté" ? "politique" : choix(AGENTS_NOMS),
    correlation: "cx_" + Math.floor(alea() * 1e9).toString(36),
  };
});
