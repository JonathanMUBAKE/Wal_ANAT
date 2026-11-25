/* =========================================================================
   DONNÉES DU CAS SIMULÉ — SIGRH
   Le système administré est un Système Intégré de Gestion des Ressources
   Humaines : référentiel des agents, présences, congés, carrières, documents,
   tableaux de bord, notifications, administration.
   Tout est inventé. Aucune donnée réelle d'une organisation n'entre ici :
   c'est un gabarit, et il sera lu par des gens qui n'ont pas à connaître vos
   agents. Remplacez ce module par vos appels réseau.
   ========================================================================= */

import { alea, choix, entre, serie } from "./donnees";

/* --- Référentiel commun -------------------------------------------------- */
export const DIRECTIONS = [
  "Direction générale",
  "Planification territoriale",
  "Études et prospective",
  "Administration et finances",
  "Ressources humaines",
  "Systèmes d'information",
  "Communication",
  "Antennes provinciales",
];

export const AGENTS_NOMS = [
  "Awa Diallo", "Moussa Traoré", "Chantal Mbaye", "Idriss Kouassi", "Léa Bernard",
  "Samuel Ndiaye", "Nadia Camara", "Victor Sow", "Sarah Keita", "Oumar Fall",
  "Claire Moreau", "Thomas Diop", "Rokia Touré", "Hugo Leroy", "Mariam Cissé",
  "Paul Rousseau", "Esther Barry", "Karim Bakayoko", "Lucie Dubois", "Daniel Martin",
];

export const SERVICES_SIGRH = [
  { nom: "sigrh-referentiel", role: "Référentiel des agents", critique: true },
  { nom: "sigrh-presences", role: "Présences et horaires", critique: true },
  { nom: "sigrh-conges", role: "Congés et absences", critique: true },
  { nom: "sigrh-carrieres", role: "Carrières et mouvements", critique: false },
  { nom: "sigrh-documents", role: "Documents et archivage", critique: false },
  { nom: "sigrh-rapports", role: "Rapports et tableaux de bord", critique: false },
  { nom: "sigrh-notifications", role: "Notifications", critique: false },
  { nom: "passerelle-api", role: "Passerelle d'entrée", critique: true },
  { nom: "service-auth", role: "Authentification et habilitations", critique: true },
  { nom: "moteur-recherche", role: "Recherche plein texte", critique: false },
  { nom: "service-export", role: "Exports et éditions", critique: false },
  { nom: "collecteur-pointages", role: "Collecte des pointeuses", critique: true },
];

export const horoRelatif = (minutes: number) =>
  minutes < 1 ? "à l'instant"
    : minutes < 60 ? `il y a ${Math.round(minutes)} min`
      : minutes < 1440 ? `il y a ${Math.round(minutes / 60)} h`
        : `il y a ${Math.round(minutes / 1440)} j`;

const dateDecalee = (jours: number) => new Date(Date.now() - jours * 864e5);
const dateFr = (d: Date) => d.toLocaleDateString("fr-FR");
const dateHeureFr = (d: Date) =>
  d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/* =========================================================================
   PILOTAGE — Activité
   ========================================================================= */
export interface EvenementActivite {
  id: string; quand: string; minutes: number; agent: string; direction: string;
  module: string; action: string; cible: string; canal: "Web" | "Mobile" | "Pointeuse" | "API";
}

const MODULES = ["Présences", "Congés", "Carrières", "Documents", "Référentiel", "Rapports"];

const ACTIONS_PAR_MODULE: Record<string, Array<[string, string]>> = {
  "Présences": [["Pointage d'arrivée", "07 h 48"], ["Pointage de départ", "17 h 12"], ["Régularisation d'un retard", "12/11"], ["Validation des heures supplémentaires", "4 h 30"]],
  "Congés": [["Demande de congé annuel", "12 jours"], ["Validation hiérarchique", "demande C-2048"], ["Refus motivé", "demande C-2051"], ["Annulation d'une permission", "demande C-2044"]],
  "Carrières": [["Proposition de promotion", "grade B2 → B3"], ["Enregistrement d'une nomination", "Chef de service"], ["Changement d'affectation", "Antenne provinciale"], ["Clôture d'évaluation annuelle", "exercice 2026"]],
  "Documents": [["Dépôt d'une pièce", "attestation de service"], ["Archivage d'un dossier", "dossier individuel"], ["Partage d'un document", "fiche de poste"], ["Signature électronique", "décision n°114"]],
  "Référentiel": [["Création d'un agent", "matricule A-2317"], ["Mise à jour d'état civil", "matricule A-1182"], ["Rattachement à un service", "Planification"], ["Désactivation d'un compte agent", "matricule A-0904"]],
  "Rapports": [["Génération d'un rapport", "effectifs par direction"], ["Export d'un tableau", "absentéisme mensuel"], ["Programmation d'un envoi", "hebdomadaire, lundi 7 h"], ["Consultation d'un indicateur", "taux de présence"]],
};

export const activite: EvenementActivite[] = Array.from({ length: 120 }, (_, i) => {
  const module = choix(MODULES);
  const [action, cible] = choix(ACTIONS_PAR_MODULE[module]);
  const minutes = Math.round(entre(0, 240)) + i * 11;
  return {
    id: "EV-" + (9000 - i),
    minutes, quand: horoRelatif(minutes),
    agent: choix(AGENTS_NOMS), direction: choix(DIRECTIONS),
    module, action, cible,
    canal: choix(["Web", "Web", "Web", "Mobile", "Pointeuse", "API"] as const),
  };
}).sort((a, b) => a.minutes - b.minutes);

export const activiteParModule = MODULES.map((m, i) => ({
  nom: m, valeurs: serie(24, 300 - i * 32, 40), couleur: `--serie-${i + 1}`,
}));

export const activiteParDirection = DIRECTIONS.map((d) => ({
  nom: d,
  agents: Math.round(entre(8, 96)),
  actions: Math.round(entre(120, 2400)),
  tauxPresence: Number(entre(86, 99).toFixed(1)),
}));

/* =========================================================================
   PILOTAGE — Rapports
   ========================================================================= */
export interface Rapport {
  id: string; nom: string; famille: string; description: string;
  frequence: "À la demande" | "Quotidien" | "Hebdomadaire" | "Mensuel" | "Trimestriel";
  destinataires: number; dernier: string; duree: string; format: "PDF" | "Excel" | "CSV";
  actif: boolean; favori: boolean;
}

export const rapports: Rapport[] = [
  { id: "R-01", nom: "Effectifs par direction", famille: "Référentiel", description: "Répartition des agents par direction, service et catégorie, à une date donnée.", frequence: "Mensuel", destinataires: 7, dernier: "01/11/2026", duree: "12 s", format: "PDF", actif: true, favori: true },
  { id: "R-02", nom: "Taux de présence", famille: "Présences", description: "Présences, retards et absences non justifiées, par direction et par semaine.", frequence: "Hebdomadaire", destinataires: 12, dernier: "24/11/2026", duree: "31 s", format: "Excel", actif: true, favori: true },
  { id: "R-03", nom: "Soldes de congés", famille: "Congés", description: "Droits acquis, consommés et restants par agent, avec les reliquats reportables.", frequence: "Mensuel", destinataires: 4, dernier: "01/11/2026", duree: "48 s", format: "Excel", actif: true, favori: false },
  { id: "R-04", nom: "Absentéisme", famille: "Présences", description: "Jours d'absence par motif, durée moyenne, comparaison au trimestre précédent.", frequence: "Mensuel", destinataires: 9, dernier: "01/11/2026", duree: "26 s", format: "PDF", actif: true, favori: true },
  { id: "R-05", nom: "Heures supplémentaires", famille: "Présences", description: "Heures déclarées, validées et payées, par direction et par agent.", frequence: "Mensuel", destinataires: 5, dernier: "01/11/2026", duree: "19 s", format: "Excel", actif: true, favori: false },
  { id: "R-06", nom: "Mouvements du personnel", famille: "Carrières", description: "Recrutements, départs, promotions, mutations et changements de position.", frequence: "Trimestriel", destinataires: 6, dernier: "01/10/2026", duree: "22 s", format: "PDF", actif: true, favori: false },
  { id: "R-07", nom: "Pyramide des âges", famille: "Référentiel", description: "Répartition par tranche d'âge, projection des départs à la retraite sur cinq ans.", frequence: "Trimestriel", destinataires: 3, dernier: "01/10/2026", duree: "9 s", format: "PDF", actif: true, favori: false },
  { id: "R-08", nom: "Ancienneté et grades", famille: "Carrières", description: "Ancienneté moyenne par grade, agents promouvables à échéance.", frequence: "À la demande", destinataires: 2, dernier: "18/11/2026", duree: "14 s", format: "Excel", actif: false, favori: false },
  { id: "R-09", nom: "Dossiers individuels incomplets", famille: "Documents", description: "Agents dont le dossier manque d'une pièce obligatoire, par type de pièce.", frequence: "Hebdomadaire", destinataires: 4, dernier: "24/11/2026", duree: "37 s", format: "CSV", actif: true, favori: true },
  { id: "R-10", nom: "Journal des habilitations", famille: "Sécurité", description: "Attributions et retraits de droits sur la période, avec l'auteur de chaque geste.", frequence: "Mensuel", destinataires: 2, dernier: "01/11/2026", duree: "7 s", format: "CSV", actif: true, favori: false },
];

export const executionsRapports = Array.from({ length: 14 }, (_, i) => {
  const r = choix(rapports);
  const echec = alea() < 0.12;
  return {
    id: "X-" + (3000 - i),
    rapport: r.nom,
    quand: dateHeureFr(new Date(Date.now() - i * Math.round(entre(3, 40)) * 36e5)),
    declencheur: alea() < 0.6 ? "Programmation" : choix(AGENTS_NOMS),
    duree: Math.round(entre(5, 90)) + " s",
    lignes: Math.round(entre(40, 2400)),
    etat: echec ? "échoué" : "réussi",
    motif: echec ? "Délai dépassé sur le référentiel" : "",
  };
});

/* =========================================================================
   EXPLOITATION — Services
   ========================================================================= */
export interface ServiceSIGRH {
  nom: string; role: string; critique: boolean;
  etat: "bon" | "vigilance" | "critique"; version: string;
  instances: number; instancesVoulues: number;
  latence: number; erreurs: number; debit: number;
  processeur: number; memoire: number; redemarrages: number; depuis: string;
}

export const servicesSIGRH: ServiceSIGRH[] = SERVICES_SIGRH.map((s, i) => {
  const erreurs = Number(entre(0, s.critique ? 1.4 : 3.2).toFixed(2));
  const latence = Math.round(entre(28, 420));
  const etat = erreurs > 2 || latence > 350 ? "critique" : erreurs > 0.8 || latence > 240 ? "vigilance" : "bon";
  const instancesVoulues = s.critique ? 3 : 2;
  return {
    ...s,
    etat: etat as ServiceSIGRH["etat"],
    version: `v${2 + (i % 3)}.${i % 9}.${i % 5}`,
    instances: alea() < 0.12 ? instancesVoulues - 1 : instancesVoulues,
    instancesVoulues, latence, erreurs,
    debit: Math.round(entre(40, 1800)),
    processeur: Math.round(entre(8, 88)),
    memoire: Math.round(entre(22, 90)),
    redemarrages: Math.round(entre(0, 4)),
    depuis: Math.round(entre(2, 90)) + " j",
  };
});

/* =========================================================================
   EXPLOITATION — Tâches planifiées
   ========================================================================= */
export interface TachePlanifiee {
  id: string; nom: string; description: string; expression: string; lisible: string;
  active: boolean; derniere: string; duree: string; prochaine: string;
  etat: "réussie" | "échouée" | "en cours"; traite: string; proprietaire: string;
}

export const tachesInitiales: TachePlanifiee[] = [
  { id: "T-01", nom: "Import des pointages", description: "Récupère les badgeages des pointeuses biométriques et les rattache aux agents.", expression: "*/15 * * * *", lisible: "toutes les 15 minutes", active: true, derniere: "il y a 6 min", duree: "41 s", prochaine: "dans 9 min", etat: "réussie", traite: "1 284 badgeages", proprietaire: "Systèmes d'information" },
  { id: "T-02", nom: "Calcul des soldes de congés", description: "Recalcule les droits acquis et les reliquats de chaque agent.", expression: "0 2 * * *", lisible: "chaque jour à 2 h", active: true, derniere: "il y a 13 h", duree: "3 min 12 s", prochaine: "dans 11 h", etat: "réussie", traite: "412 agents", proprietaire: "Ressources humaines" },
  { id: "T-03", nom: "Relance des évaluations", description: "Rappelle aux responsables les évaluations annuelles non clôturées.", expression: "0 8 * * 1", lisible: "chaque lundi à 8 h", active: true, derniere: "il y a 2 j", duree: "18 s", prochaine: "dans 5 j", etat: "réussie", traite: "37 relances", proprietaire: "Ressources humaines" },
  { id: "T-04", nom: "Synchronisation de l'annuaire", description: "Aligne les comptes du SIGRH sur l'annuaire d'entreprise.", expression: "0 */6 * * *", lisible: "toutes les 6 heures", active: true, derniere: "il y a 1 h", duree: "1 min 04 s", prochaine: "dans 5 h", etat: "échouée", traite: "arrêtée à 68 %", proprietaire: "Systèmes d'information" },
  { id: "T-05", nom: "Sauvegarde complète", description: "Instantané chiffré de la base et des documents, déposé hors site.", expression: "0 1 * * *", lisible: "chaque jour à 1 h", active: true, derniere: "il y a 14 h", duree: "8 min 47 s", prochaine: "dans 10 h", etat: "réussie", traite: "42,8 Gio", proprietaire: "Systèmes d'information" },
  { id: "T-06", nom: "Purge des sessions expirées", description: "Ferme les sessions inactives au-delà de la durée autorisée.", expression: "0 * * * *", lisible: "chaque heure", active: true, derniere: "il y a 22 min", duree: "2 s", prochaine: "dans 38 min", etat: "réussie", traite: "19 sessions", proprietaire: "Systèmes d'information" },
  { id: "T-07", nom: "Indexation documentaire", description: "Indexe les pièces déposées pour la recherche plein texte.", expression: "*/30 * * * *", lisible: "toutes les 30 minutes", active: true, derniere: "il y a 12 min", duree: "1 min 51 s", prochaine: "dans 18 min", etat: "en cours", traite: "en cours : 68 %", proprietaire: "Systèmes d'information" },
  { id: "T-08", nom: "Alerte fins de contrat", description: "Signale les contrats arrivant à échéance dans les soixante jours.", expression: "0 7 * * *", lisible: "chaque jour à 7 h", active: true, derniere: "il y a 8 h", duree: "6 s", prochaine: "dans 16 h", etat: "réussie", traite: "5 contrats", proprietaire: "Ressources humaines" },
  { id: "T-09", nom: "Archivage des dossiers clos", description: "Déplace vers l'archive les dossiers des agents partis depuis plus d'un an.", expression: "0 3 1 * *", lisible: "le 1er de chaque mois à 3 h", active: false, derniere: "il y a 56 j", duree: "12 min", prochaine: "désactivée", etat: "réussie", traite: "0 dossier", proprietaire: "Ressources humaines" },
  { id: "T-10", nom: "Contrôle d'intégrité", description: "Vérifie la cohérence entre le référentiel, les présences et la paie.", expression: "0 4 * * 0", lisible: "chaque dimanche à 4 h", active: true, derniere: "il y a 4 j", duree: "5 min 29 s", prochaine: "dans 3 j", etat: "réussie", traite: "3 écarts signalés", proprietaire: "Systèmes d'information" },
];

/* =========================================================================
   EXPLOITATION — Files d'attente
   ========================================================================= */
export interface FileAttente {
  nom: string; role: string; enAttente: number; enCours: number; echecs: number;
  debit: number; plusVieux: string; consommateurs: number; enPause: boolean;
}

export const filesInitiales: FileAttente[] = [
  { nom: "notifications", role: "Courriels et messages aux agents", enAttente: 412, enCours: 8, echecs: 3, debit: 860, plusVieux: "22 s", consommateurs: 4, enPause: false },
  { nom: "pointages", role: "Badgeages à rattacher aux agents", enAttente: 1284, enCours: 16, echecs: 0, debit: 1240, plusVieux: "1 min 04", consommateurs: 6, enPause: false },
  { nom: "documents", role: "Indexation et conversion des pièces", enAttente: 96, enCours: 4, echecs: 11, debit: 180, plusVieux: "4 min 12", consommateurs: 2, enPause: false },
  { nom: "exports", role: "Rapports et éditions lourdes", enAttente: 7, enCours: 1, echecs: 2, debit: 12, plusVieux: "18 min", consommateurs: 1, enPause: false },
  { nom: "paie-interface", role: "Écritures vers la comptabilité", enAttente: 0, enCours: 0, echecs: 48, debit: 0, plusVieux: "2 h 41", consommateurs: 0, enPause: true },
];

/* =========================================================================
   EXPLOITATION — Déploiements
   ========================================================================= */
export interface EtapeDeploiement { nom: string; etat: "faite" | "en cours" | "attente" | "échouée"; duree?: string }
export interface Deploiement {
  id: string; service: string; version: string; environnement: "Production" | "Recette" | "Bac à sable";
  auteur: string; quand: string; duree: string;
  etat: "réussi" | "en cours" | "échoué" | "annulé";
  etapes: EtapeDeploiement[]; note: string;
}

const ETAPES_OK: EtapeDeploiement[] = [
  { nom: "Construction", etat: "faite", duree: "1 min 12" },
  { nom: "Tests", etat: "faite", duree: "2 min 40" },
  { nom: "Recette", etat: "faite", duree: "48 s" },
  { nom: "Production", etat: "faite", duree: "1 min 05" },
];

export const deploiements: Deploiement[] = [
  {
    id: "D-318", service: "sigrh-presences", version: "v3.4.0", environnement: "Production",
    auteur: "Awa Diallo", quand: "il y a 42 min", duree: "5 min 45", etat: "en cours",
    etapes: [{ nom: "Construction", etat: "faite", duree: "1 min 08" }, { nom: "Tests", etat: "faite", duree: "2 min 31" }, { nom: "Recette", etat: "en cours" }, { nom: "Production", etat: "attente" }],
    note: "Corrige le rattachement des badgeages pour les agents en mission.",
  },
  {
    id: "D-317", service: "sigrh-conges", version: "v2.9.1", environnement: "Production",
    auteur: "Moussa Traoré", quand: "il y a 5 h", duree: "5 min 45", etat: "réussi", etapes: ETAPES_OK,
    note: "Report des reliquats au 31 décembre, conforme à la note de service.",
  },
  {
    id: "D-316", service: "collecteur-pointages", version: "v1.7.3", environnement: "Production",
    auteur: "Idriss Kouassi", quand: "il y a 1 j", duree: "3 min 02", etat: "échoué",
    etapes: [{ nom: "Construction", etat: "faite", duree: "1 min 10" }, { nom: "Tests", etat: "faite", duree: "1 min 52" }, { nom: "Recette", etat: "échouée" }, { nom: "Production", etat: "attente" }],
    note: "Pointeuse d'une antenne provinciale injoignable pendant la recette.",
  },
  {
    id: "D-315", service: "sigrh-documents", version: "v4.1.0", environnement: "Recette",
    auteur: "Léa Bernard", quand: "il y a 1 j", duree: "4 min 18", etat: "réussi", etapes: ETAPES_OK,
    note: "Signature électronique des décisions individuelles.",
  },
  {
    id: "D-314", service: "sigrh-referentiel", version: "v5.0.2", environnement: "Production",
    auteur: "Awa Diallo", quand: "il y a 3 j", duree: "6 min 31", etat: "réussi", etapes: ETAPES_OK,
    note: "Nouveau champ « position administrative » sur la fiche agent.",
  },
  {
    id: "D-313", service: "sigrh-rapports", version: "v2.2.0", environnement: "Production",
    auteur: "Samuel Ndiaye", quand: "il y a 4 j", duree: "2 min 55", etat: "annulé",
    etapes: [{ nom: "Construction", etat: "faite", duree: "1 min 02" }, { nom: "Tests", etat: "faite", duree: "1 min 53" }, { nom: "Recette", etat: "attente" }, { nom: "Production", etat: "attente" }],
    note: "Interrompu à la demande de la direction des ressources humaines.",
  },
  {
    id: "D-312", service: "service-auth", version: "v3.8.4", environnement: "Production",
    auteur: "Idriss Kouassi", quand: "il y a 6 j", duree: "7 min 12", etat: "réussi", etapes: ETAPES_OK,
    note: "Deuxième facteur rendu obligatoire pour les rôles d'administration.",
  },
];

/* =========================================================================
   OBSERVABILITÉ — Traces
   ========================================================================= */
export interface SegmentTrace { nom: string; debut: number; duree: number; service: string }
export interface Trace {
  id: string; operation: string; service: string; duree: number; segments: number;
  etat: "réussie" | "erreur"; quand: string; agent: string; code: number;
  cascade: SegmentTrace[];
}

const OPERATIONS: Array<[string, string]> = [
  ["GET /agents/{id}/dossier", "passerelle-api"],
  ["POST /conges/demandes", "sigrh-conges"],
  ["GET /presences/journal", "sigrh-presences"],
  ["POST /rapports/effectifs", "sigrh-rapports"],
  ["GET /recherche", "moteur-recherche"],
  ["POST /pointages/lot", "collecteur-pointages"],
  ["PUT /carrieres/mouvements", "sigrh-carrieres"],
];

export const traces: Trace[] = Array.from({ length: 36 }, (_, i) => {
  const [operation, service] = choix(OPERATIONS);
  const duree = Math.round(entre(18, 3200));
  const erreur = alea() < 0.11;
  const n = Math.round(entre(4, 11));
  let curseur = 0;
  const cascade: SegmentTrace[] = Array.from({ length: n }, () => {
    const d = Math.max(1, Math.round((duree / n) * entre(0.4, 1.4)));
    const seg: SegmentTrace = {
      nom: choix(["authentification", "lecture du référentiel", "requête SQL", "appel interne", "sérialisation", "contrôle des droits", "écriture du journal", "cache"]),
      debut: curseur, duree: d, service: choix(SERVICES_SIGRH).nom,
    };
    curseur = Math.min(duree - 1, curseur + Math.round(d * entre(0.3, 0.8)));
    return seg;
  });
  return {
    id: "tr_" + Math.floor(alea() * 1e9).toString(36),
    operation, service, duree, segments: n,
    etat: (erreur ? "erreur" : "réussie") as Trace["etat"],
    quand: horoRelatif(Math.round(entre(0, 180)) + i),
    agent: choix(AGENTS_NOMS),
    code: erreur ? choix([500, 502, 504, 409]) : 200,
    cascade,
  };
}).sort((a, b) => b.duree - a.duree);

/* =========================================================================
   OBSERVABILITÉ — Disponibilité
   ========================================================================= */
export const disponibilite = SERVICES_SIGRH.slice(0, 8).map((s) => {
  const jours = Array.from({ length: 90 }, (_, i) => {
    const r = alea();
    return {
      date: dateDecalee(89 - i).toISOString().slice(0, 10),
      taux: r < 0.03 ? Number(entre(92, 99).toFixed(2)) : r < 0.1 ? Number(entre(99.5, 99.95).toFixed(2)) : 100,
    };
  });
  const moyenne = jours.reduce((a, b) => a + b.taux, 0) / jours.length;
  return {
    ...s, jours,
    taux90: Number(moyenne.toFixed(3)),
    engagement: s.critique ? 99.9 : 99.5,
    interruptions: jours.filter((j) => j.taux < 99.5).length,
    retablissement: Math.round(entre(4, 48)) + " min",
  };
});

export const incidentsDisponibilite = [
  { code: "INC-2048", titre: "Latence de la passerelle d'entrée", service: "passerelle-api", debut: dateHeureFr(dateDecalee(0.01)), duree: "en cours", impact: "Connexions ralenties pour tous les agents", gravite: "critique" as const },
  { code: "INC-2047", titre: "Espace disque sous 8 % sur la base principale", service: "sigrh-referentiel", debut: dateHeureFr(dateDecalee(0.03)), duree: "en cours", impact: "Risque d'arrêt des écritures", gravite: "critique" as const },
  { code: "INC-2041", titre: "Pointeuses d'une antenne injoignables", service: "collecteur-pointages", debut: dateHeureFr(dateDecalee(3)), duree: "4 h 12", impact: "Badgeages saisis à la main pour 34 agents", gravite: "serieux" as const },
  { code: "INC-2038", titre: "Export des soldes de congés interrompu", service: "service-export", debut: dateHeureFr(dateDecalee(9)), duree: "48 min", impact: "Rapport mensuel retardé d'une journée", gravite: "vigilance" as const },
  { code: "INC-2031", titre: "Coupure électrique du site principal", service: "toute la plateforme", debut: dateHeureFr(dateDecalee(21)), duree: "1 h 37", impact: "Plateforme indisponible, bascule sur le site de secours", gravite: "critique" as const },
];

/* =========================================================================
   ACCÈS — Sessions
   ========================================================================= */
export interface Session {
  id: string; agent: string; direction: string; appareil: string; navigateur: string;
  ip: string; lieu: string; ouverte: string; derniereAction: string;
  courante: boolean; deuxFacteurs: boolean; risque: "normal" | "à vérifier";
}

export const sessionsInitiales: Session[] = Array.from({ length: 42 }, (_, i) => {
  const risque = alea() < 0.09;
  return {
    id: "S-" + (7000 + i),
    agent: choix(AGENTS_NOMS), direction: choix(DIRECTIONS),
    appareil: choix(["Poste fixe", "Portable", "Téléphone", "Tablette"]),
    navigateur: choix(["Chrome 142 · Windows", "Edge 142 · Windows", "Safari · iOS", "Firefox 139 · Linux", "Chrome · Android"]),
    ip: `10.${Math.floor(entre(0, 40))}.${Math.floor(entre(0, 255))}.${Math.floor(entre(2, 254))}`,
    lieu: risque ? "Hors réseau de l'Agence" : choix(["Siège", "Siège", "Antenne provinciale", "Télétravail"]),
    ouverte: horoRelatif(Math.round(entre(1, 600))),
    derniereAction: horoRelatif(Math.round(entre(0, 90))),
    courante: i === 0,
    deuxFacteurs: alea() < 0.72,
    risque: risque ? "à vérifier" : "normal",
  };
});

/* =========================================================================
   ACCÈS — Jetons d'API
   ========================================================================= */
export interface JetonAPI {
  id: string; nom: string; prefixe: string; portee: string[]; creePar: string; creeLe: string;
  derniereUtilisation: string; appels30j: number; expire: string; actif: boolean; expireBientot: boolean;
}

export const jetonsInitiaux: JetonAPI[] = [
  { id: "J-01", nom: "Interface paie", prefixe: "sk_paie_7d21", portee: ["agents:lecture", "presences:lecture", "conges:lecture"], creePar: "Idriss Kouassi", creeLe: dateFr(dateDecalee(214)), derniereUtilisation: "il y a 12 min", appels30j: 184200, expire: dateFr(dateDecalee(-31)), actif: true, expireBientot: true },
  { id: "J-02", nom: "Collecteur de pointeuses", prefixe: "sk_point_19ab", portee: ["pointages:ecriture"], creePar: "Idriss Kouassi", creeLe: dateFr(dateDecalee(402)), derniereUtilisation: "il y a 2 min", appels30j: 1284000, expire: "sans échéance", actif: true, expireBientot: false },
  { id: "J-03", nom: "Portail agent (mobile)", prefixe: "sk_mobile_c4e0", portee: ["agents:lecture", "conges:ecriture", "documents:lecture"], creePar: "Awa Diallo", creeLe: dateFr(dateDecalee(96)), derniereUtilisation: "il y a 1 h", appels30j: 96400, expire: dateFr(dateDecalee(-269)), actif: true, expireBientot: false },
  { id: "J-04", nom: "Tableau de bord direction", prefixe: "sk_dir_55f1", portee: ["rapports:lecture"], creePar: "Samuel Ndiaye", creeLe: dateFr(dateDecalee(58)), derniereUtilisation: "il y a 3 j", appels30j: 1840, expire: dateFr(dateDecalee(-307)), actif: true, expireBientot: false },
  { id: "J-05", nom: "Import initial des agents", prefixe: "sk_import_0a9c", portee: ["agents:ecriture", "carrieres:ecriture"], creePar: "Idriss Kouassi", creeLe: dateFr(dateDecalee(430)), derniereUtilisation: "il y a 398 j", appels30j: 0, expire: dateFr(dateDecalee(65)), actif: false, expireBientot: false },
  { id: "J-06", nom: "Supervision externe", prefixe: "sk_watch_e31b", portee: ["sante:lecture"], creePar: "Moussa Traoré", creeLe: dateFr(dateDecalee(180)), derniereUtilisation: "il y a 1 min", appels30j: 43200, expire: "sans échéance", actif: true, expireBientot: false },
];

/* =========================================================================
   SYSTÈME — Intégrations
   ========================================================================= */
export interface Integration {
  cle: string; nom: string; categorie: string; description: string;
  etat: "connectée" | "dégradée" | "non connectée" | "en erreur";
  derniereSynchro: string; volume: string; sens: "Entrant" | "Sortant" | "Bidirectionnel";
}

export const integrationsInitiales: Integration[] = [
  { cle: "annuaire", nom: "Annuaire d'entreprise (LDAP)", categorie: "Identité", description: "Source des comptes et des rattachements hiérarchiques.", etat: "dégradée", derniereSynchro: "il y a 1 h", volume: "412 comptes", sens: "Entrant" },
  { cle: "pointeuses", nom: "Pointeuses biométriques", categorie: "Présences", description: "Huit terminaux au siège et dans les antennes provinciales.", etat: "connectée", derniereSynchro: "il y a 6 min", volume: "1 284 badgeages par jour", sens: "Entrant" },
  { cle: "messagerie", nom: "Messagerie institutionnelle", categorie: "Notifications", description: "Envoi des accusés, convocations et relances.", etat: "connectée", derniereSynchro: "il y a 3 min", volume: "860 messages par jour", sens: "Sortant" },
  { cle: "sms", nom: "Passerelle SMS", categorie: "Notifications", description: "Alertes aux agents sans adresse électronique.", etat: "non connectée", derniereSynchro: "—", volume: "—", sens: "Sortant" },
  { cle: "signature", nom: "Signature électronique", categorie: "Documents", description: "Signature des décisions individuelles et des attestations.", etat: "connectée", derniereSynchro: "il y a 27 min", volume: "34 documents par semaine", sens: "Bidirectionnel" },
  { cle: "comptabilite", nom: "Logiciel de paie et comptabilité", categorie: "Finances", description: "Transmission des éléments variables de paie.", etat: "en erreur", derniereSynchro: "il y a 2 j", volume: "48 écritures en échec", sens: "Sortant" },
  { cle: "archivage", nom: "Archivage légal", categorie: "Documents", description: "Dépôt à valeur probante des dossiers individuels clos.", etat: "connectée", derniereSynchro: "il y a 14 h", volume: "2,1 Gio par mois", sens: "Sortant" },
];

/* =========================================================================
   SYSTÈME — Sauvegardes
   ========================================================================= */
export const sauvegardes = Array.from({ length: 16 }, (_, i) => {
  const complete = i % 7 === 0;
  const echec = i === 4;
  return {
    id: "B-" + (820 - i),
    quand: dateHeureFr(new Date(Date.now() - i * 864e5 - 23 * 36e5)),
    type: complete ? "Complète" : "Incrémentale",
    taille: complete ? Number(entre(38, 46).toFixed(1)) + " Gio" : Number(entre(0.6, 4.2).toFixed(1)) + " Gio",
    duree: complete ? "8 min " + Math.round(entre(10, 59)) + " s" : Math.round(entre(40, 180)) + " s",
    emplacement: complete ? "Site de secours + archive froide" : "Site de secours",
    chiffree: true,
    verifiee: !echec && alea() > 0.1,
    etat: echec ? "échouée" : "réussie",
    motif: echec ? "Espace insuffisant sur le dépôt distant" : "",
  };
});

/* =========================================================================
   SYSTÈME — Paramètres
   ========================================================================= */
export const parametresInitiaux = {
  organisation: "Agence nationale (exemple)",
  fuseau: "Afrique/Kinshasa (UTC+1)",
  langue: "Français",
  debutSemaine: "Lundi",
  heureArrivee: "07:30",
  heureDepart: "16:30",
  toleranceRetard: 15,
  seuilHeuresSup: 2,
  joursCongesAnnuels: 30,
  reportReliquats: true,
  validationHierarchique: true,
  doubleValidationCadres: false,
  deuxFacteursObligatoire: true,
  dureeSession: 60,
  longueurMotDePasse: 12,
  renouvellementMotDePasse: 180,
  retentionJournaux: 365,
  retentionSauvegardes: 90,
  anonymisationDeparts: 1095,
  modeMaintenance: false,
  banniereInformation: false,
};
export type Parametres = typeof parametresInitiaux;
