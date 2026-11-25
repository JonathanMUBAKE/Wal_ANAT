/* =========================================================================
   MODULES INSTITUTIONNELS
   Six patrons qui reviennent dans tout outil de pilotage d'une organisation,
   quel que soit son métier :
     portefeuille · courrier · séances · décisions · signataire · accords
   Ils sont ici en version générique, pour être recopiés et adaptés. Les
   règles qu'ils portent (un objet figé après validation, un circuit avec un
   état propre à chacun, un registre numéroté qui ne se réécrit pas) valent
   bien au-delà du cas simulé.
   Tout est inventé.
   ========================================================================= */

import { alea, choix, entre } from "./donnees";
import { AGENTS_NOMS, DIRECTIONS } from "./sigrh";

const jours = (n: number) => new Date(Date.now() + n * 864e5);
const dateFr = (d: Date) => d.toLocaleDateString("fr-FR");
const dateHeureFr = (d: Date) =>
  d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export type Sante = "bonne" | "à surveiller" | "dégradée";

/* =========================================================================
   1. PORTEFEUILLE — projets et activités
   La seule idée à retenir : la santé **déclarée** par le chef de projet est
   confrontée à la santé **calculée** à partir du calendrier, des livrables,
   du budget et des tâches. Les écarts passent en tête. On ne demande à
   personne de se noter : on montre les deux chiffres côte à côte.
   ========================================================================= */
export interface Dossier {
  code: string; intitule: string; type: "Projet" | "Commission" | "Conférence" | "Rendez-vous" | "Activité interne";
  responsable: string; entite: string; domaine: string;
  debut: string; fin: string; avancement: number;
  santeDeclaree: Sante; santeCalculee: Sante; raisonEcart: string;
  budget: number; engage: number;
  livrables: { total: number; faits: number; enRetard: number };
  taches: { total: number; faites: number; enRetard: number };
  suites: { intitule: string; responsable: string; echeance: string; faite: boolean }[];
  arbitrageAttendu: boolean; confidentiel: boolean;
  prochaineEcheance: string;
}

export const dossiers: Dossier[] = [
  {
    code: "PRJ/2026/014", intitule: "Schéma directeur d'aménagement de la province", type: "Projet",
    responsable: "Awa Diallo", entite: "Planification territoriale", domaine: "Aménagement",
    debut: dateFr(jours(-210)), fin: dateFr(jours(62)), avancement: 58,
    santeDeclaree: "bonne", santeCalculee: "dégradée",
    raisonEcart: "Deux livrables sur six sont en retard et le budget est engagé à 91 % pour 58 % d'avancement.",
    budget: 480_000, engage: 436_800,
    livrables: { total: 6, faits: 3, enRetard: 2 }, taches: { total: 84, faites: 48, enRetard: 11 },
    suites: [
      { intitule: "Relancer le bureau d'études sur le rapport intermédiaire", responsable: "Awa Diallo", echeance: dateFr(jours(4)), faite: false },
      { intitule: "Présenter l'arbitrage budgétaire à la direction", responsable: "Moussa Traoré", echeance: dateFr(jours(-2)), faite: false },
    ],
    arbitrageAttendu: true, confidentiel: false, prochaineEcheance: "Comité de pilotage, dans 4 jours",
  },
  {
    code: "PRJ/2026/022", intitule: "Système intégré de gestion des ressources humaines", type: "Projet",
    responsable: "Idriss Kouassi", entite: "Systèmes d'information", domaine: "Numérique",
    debut: dateFr(jours(-96)), fin: dateFr(jours(148)), avancement: 41,
    santeDeclaree: "à surveiller", santeCalculee: "à surveiller",
    raisonEcart: "",
    budget: 310_000, engage: 118_400,
    livrables: { total: 9, faits: 4, enRetard: 0 }, taches: { total: 142, faites: 61, enRetard: 4 },
    suites: [
      { intitule: "Valider le cahier des charges du module présences", responsable: "Chantal Mbaye", echeance: dateFr(jours(9)), faite: false },
    ],
    arbitrageAttendu: false, confidentiel: false, prochaineEcheance: "Recette du module congés, dans 9 jours",
  },
  {
    code: "PRJ/2026/008", intitule: "Refonte du site institutionnel", type: "Projet",
    responsable: "Léa Bernard", entite: "Communication", domaine: "Communication",
    debut: dateFr(jours(-142)), fin: dateFr(jours(-6)), avancement: 96,
    santeDeclaree: "bonne", santeCalculee: "à surveiller",
    raisonEcart: "La date de fin est dépassée de six jours ; le dernier livrable attend la validation du comité.",
    budget: 64_000, engage: 61_200,
    livrables: { total: 4, faits: 3, enRetard: 1 }, taches: { total: 38, faites: 36, enRetard: 1 },
    suites: [{ intitule: "Obtenir le visa de mise en ligne", responsable: "Léa Bernard", echeance: dateFr(jours(2)), faite: false }],
    arbitrageAttendu: false, confidentiel: false, prochaineEcheance: "Mise en ligne, dans 2 jours",
  },
  {
    code: "PRJ/2026/031", intitule: "Étude prospective sur la démographie régionale", type: "Projet",
    responsable: "Samuel Ndiaye", entite: "Études et prospective", domaine: "Études",
    debut: dateFr(jours(-38)), fin: dateFr(jours(224)), avancement: 12,
    santeDeclaree: "bonne", santeCalculee: "bonne", raisonEcart: "",
    budget: 185_000, engage: 21_300,
    livrables: { total: 5, faits: 0, enRetard: 0 }, taches: { total: 52, faites: 7, enRetard: 0 },
    suites: [], arbitrageAttendu: false, confidentiel: true, prochaineEcheance: "Revue de cadrage, dans 18 jours",
  },
  {
    code: "ACT/2026/107", intitule: "Commission mixte de coopération territoriale", type: "Commission",
    responsable: "Moussa Traoré", entite: "Direction générale", domaine: "Coopération",
    debut: dateFr(jours(-3)), fin: dateFr(jours(-3)), avancement: 100,
    santeDeclaree: "bonne", santeCalculee: "bonne", raisonEcart: "",
    budget: 0, engage: 0,
    livrables: { total: 0, faits: 0, enRetard: 0 }, taches: { total: 0, faites: 0, enRetard: 0 },
    suites: [
      { intitule: "Transmettre le relevé de conclusions au partenaire", responsable: "Nadia Camara", echeance: dateFr(jours(1)), faite: false },
      { intitule: "Préparer le projet de convention", responsable: "Moussa Traoré", echeance: dateFr(jours(14)), faite: false },
    ],
    arbitrageAttendu: true, confidentiel: false, prochaineEcheance: "Relevé à transmettre, demain",
  },
  {
    code: "ACT/2026/112", intitule: "Conférence nationale sur l'aménagement", type: "Conférence",
    responsable: "Nadia Camara", entite: "Communication", domaine: "Communication",
    debut: dateFr(jours(34)), fin: dateFr(jours(36)), avancement: 22,
    santeDeclaree: "à surveiller", santeCalculee: "à surveiller", raisonEcart: "",
    budget: 92_000, engage: 14_800,
    livrables: { total: 0, faits: 0, enRetard: 0 }, taches: { total: 26, faites: 6, enRetard: 2 },
    suites: [{ intitule: "Confirmer le lieu et la capacité d'accueil", responsable: "Nadia Camara", echeance: dateFr(jours(6)), faite: false }],
    arbitrageAttendu: false, confidentiel: false, prochaineEcheance: "Réservation du lieu, dans 6 jours",
  },
  {
    code: "ACT/2026/118", intitule: "Rendez-vous avec le bailleur régional", type: "Rendez-vous",
    responsable: "Awa Diallo", entite: "Direction générale", domaine: "Coopération",
    debut: dateFr(jours(7)), fin: dateFr(jours(7)), avancement: 0,
    santeDeclaree: "bonne", santeCalculee: "bonne", raisonEcart: "",
    budget: 0, engage: 0,
    livrables: { total: 0, faits: 0, enRetard: 0 }, taches: { total: 4, faites: 1, enRetard: 0 },
    suites: [], arbitrageAttendu: false, confidentiel: true, prochaineEcheance: "Note de cadrage, dans 5 jours",
  },
];

export interface Arbitrage {
  code: string; dossier: string; question: string; contexte: string;
  options: { intitule: string; consequence: string; recommandee: boolean }[];
  demandeur: string; demandeLe: string; souhaiteeLe: string;
  etat: "en attente" | "tranché" | "retiré"; decision?: string;
}
export const arbitrages: Arbitrage[] = [
  {
    code: "ARB/2026/009", dossier: "PRJ/2026/014",
    question: "Faut-il réduire le périmètre du schéma directeur ou demander une rallonge budgétaire ?",
    contexte: "Le budget est engagé à 91 % pour 58 % d'avancement. Les deux provinces ajoutées en cours de route n'étaient pas au devis initial.",
    options: [
      { intitule: "Réduire le périmètre aux huit provinces initiales", consequence: "Tient le budget. Les deux provinces ajoutées devront faire l'objet d'un avenant l'an prochain.", recommandee: true },
      { intitule: "Demander une rallonge de 120 000 €", consequence: "Préserve le périmètre. Suppose un accord du bailleur, incertain avant la fin de l'exercice.", recommandee: false },
      { intitule: "Étaler la fin du projet sur l'exercice suivant", consequence: "Ne coûte rien cette année mais décale la restitution de six mois.", recommandee: false },
    ],
    demandeur: "Awa Diallo", demandeLe: dateFr(jours(-5)), souhaiteeLe: dateFr(jours(2)), etat: "en attente",
  },
  {
    code: "ARB/2026/008", dossier: "ACT/2026/107",
    question: "Signe-t-on la convention avant ou après la validation du schéma directeur ?",
    contexte: "Le partenaire souhaite signer au premier trimestre. Le schéma directeur ne sera pas validé avant juin.",
    options: [
      { intitule: "Signer maintenant avec une clause de révision", consequence: "Sécurise le partenariat. Expose à une renégociation si le schéma change les priorités.", recommandee: true },
      { intitule: "Attendre la validation", consequence: "Plus sûr sur le fond, mais le partenaire a annoncé un autre arbitrage en juillet.", recommandee: false },
    ],
    demandeur: "Moussa Traoré", demandeLe: dateFr(jours(-12)), souhaiteeLe: dateFr(jours(-4)),
    etat: "tranché", decision: "DEC/2026/0147",
  },
];

/* =========================================================================
   2. COURRIER
   Enregistré une fois au bureau d'ordre, puis vu partout — mais dans un état
   qui est propre à chacun. Le même courrier est « à imputer » pour le
   secrétariat, « à traiter » pour l'agent chargé, « pour information » pour
   celui qui est en copie. Un seul objet, plusieurs vérités.
   ========================================================================= */
export type EtatCourrier = "enregistré" | "imputé" | "en traitement" | "traité" | "classé sans suite";

export interface Courrier {
  code: string; sens: "Entrant" | "Sortant"; objet: string;
  correspondant: string; recuLe: string; etat: EtatCourrier;
  entite: string; charge: string; instruction: string;
  echeance: string; joursRestants: number;
  annotation: string; copies: string[];
  etiquettes: string[]; piece: string; confidentiel: boolean;
  monEtat: "à imputer" | "à traiter" | "pour information" | "pour avis" | "rien à faire";
}

const OBJETS_ENTRANTS = [
  "Demande d'avis sur un projet d'arrêté provincial",
  "Invitation à la conférence régionale d'aménagement",
  "Transmission du rapport d'audit annuel",
  "Demande de mise à disposition d'un agent",
  "Réclamation d'un prestataire sur un paiement",
  "Notification d'attribution d'un financement",
  "Convocation à une réunion interministérielle",
  "Demande de données cartographiques",
];
const OBJETS_SORTANTS = [
  "Réponse à la demande d'avis sur l'arrêté provincial",
  "Transmission du schéma directeur pour observation",
  "Note de cadrage du projet numérique",
  "Lettre d'accompagnement du rapport d'activité",
  "Demande de rendez-vous au bailleur régional",
];
const ETIQUETTES = ["Urgent", "Réservé", "Suivi direction", "À archiver", "Réponse attendue", "Dossier projet"];

export const courriers: Courrier[] = Array.from({ length: 42 }, (_, i) => {
  const sortant = alea() < 0.3;
  const etats: EtatCourrier[] = ["enregistré", "imputé", "en traitement", "en traitement", "traité", "traité", "classé sans suite"];
  const etat = i < 3 ? "enregistré" : choix(etats);
  const restants = Math.round(entre(-6, 14));
  return {
    code: `${sortant ? "SOR" : "ENT"}/2026/${String(1040 - i).padStart(4, "0")}`,
    sens: sortant ? "Sortant" : "Entrant",
    objet: sortant ? choix(OBJETS_SORTANTS) : choix(OBJETS_ENTRANTS),
    correspondant: choix([
      "Ministère de l'Aménagement", "Province du Kongo-Central", "Banque régionale de développement",
      "Cabinet d'études territoriales", "Agence nationale partenaire", "Préfecture régionale",
      "Organisation internationale", "Bureau d'études cartographiques",
    ]),
    recuLe: dateHeureFr(jours(-Math.round(entre(0, 40)))),
    etat,
    entite: choix(DIRECTIONS),
    charge: etat === "enregistré" ? "—" : choix(AGENTS_NOMS),
    instruction: etat === "enregistré" ? "" : choix([
      "Pour traitement et réponse sous huitaine",
      "Pour avis technique avant réponse",
      "Pour information et classement",
      "À rapprocher du dossier projet en cours",
      "Me rendre compte avant toute réponse",
    ]),
    echeance: dateFr(jours(restants)),
    joursRestants: restants,
    annotation: alea() < 0.3 ? choix([
      "Voir avec la direction des études avant de répondre.",
      "Réponse à me soumettre avant signature.",
      "Dossier sensible : copie restreinte.",
    ]) : "",
    copies: alea() < 0.5 ? [choix(AGENTS_NOMS), choix(AGENTS_NOMS)] : [],
    etiquettes: alea() < 0.6 ? [choix(ETIQUETTES)] : [],
    piece: `scan-${String(1040 - i)}.pdf`,
    confidentiel: alea() < 0.12,
    monEtat: etat === "enregistré" ? "à imputer"
      : etat === "imputé" || etat === "en traitement"
        ? choix(["à traiter", "pour information", "pour avis", "rien à faire"] as const)
        : "rien à faire",
  };
});

/* =========================================================================
   3. SÉANCES ET COMPTES RENDUS
   Le compte rendu passe de brouillon à soumis, puis validé — et devient figé.
   La validation est collégiale, à la séance suivante : c'est le rapporteur
   qui la porte, pas la hiérarchie. Un compte rendu validé par un supérieur
   n'engage que lui ; validé par la séance, il engage ceux qui y étaient.
   ========================================================================= */
export type EtatCompteRendu = "pas de compte rendu" | "brouillon" | "soumis" | "retourné" | "validé";

export interface Seance {
  code: string; intitule: string; quand: string; dansXJours: number;
  lieu: string; visio: boolean;
  presidence: string; rapporteur: string; maitreDuTemps: string;
  dossier: string; recurrente: boolean;
  convoques: number; presents: number; excuses: number; representes: number;
  pointsOrdreDuJour: { intitule: string; porteur: string; duree: number; traite: boolean }[];
  compteRendu: EtatCompteRendu;
  decisionsSeance: number; recommandations: number;
  motifRetour: string;
}

export const seances: Seance[] = [
  {
    code: "0147/ANAT/DG", intitule: "Réunion hebdomadaire de direction", quand: dateHeureFr(jours(2)), dansXJours: 2,
    lieu: "Salle du conseil", visio: true, presidence: "Awa Diallo", rapporteur: "Nadia Camara", maitreDuTemps: "Thomas Diop",
    dossier: "—", recurrente: true, convoques: 12, presents: 0, excuses: 1, representes: 0,
    pointsOrdreDuJour: [
      { intitule: "Suivi des décisions de la séance précédente", porteur: "Nadia Camara", duree: 15, traite: false },
      { intitule: "Arbitrage budgétaire du schéma directeur", porteur: "Awa Diallo", duree: 30, traite: false },
      { intitule: "Point sur le système de gestion des ressources humaines", porteur: "Idriss Kouassi", duree: 20, traite: false },
      { intitule: "Divers", porteur: "—", duree: 10, traite: false },
    ],
    compteRendu: "pas de compte rendu", decisionsSeance: 0, recommandations: 0, motifRetour: "",
  },
  {
    code: "0146/ANAT/DG", intitule: "Réunion hebdomadaire de direction", quand: dateHeureFr(jours(-5)), dansXJours: -5,
    lieu: "Salle du conseil", visio: true, presidence: "Awa Diallo", rapporteur: "Nadia Camara", maitreDuTemps: "Thomas Diop",
    dossier: "—", recurrente: true, convoques: 12, presents: 9, excuses: 2, representes: 1,
    pointsOrdreDuJour: [
      { intitule: "Suivi des décisions", porteur: "Nadia Camara", duree: 15, traite: true },
      { intitule: "Convention de coopération territoriale", porteur: "Moussa Traoré", duree: 25, traite: true },
      { intitule: "Calendrier de la conférence nationale", porteur: "Nadia Camara", duree: 20, traite: true },
    ],
    compteRendu: "soumis", decisionsSeance: 3, recommandations: 5, motifRetour: "",
  },
  {
    code: "0145/ANAT/DG", intitule: "Comité de pilotage du schéma directeur", quand: dateHeureFr(jours(-12)), dansXJours: -12,
    lieu: "Salle de réunion 2", visio: false, presidence: "Moussa Traoré", rapporteur: "Sarah Keita", maitreDuTemps: "—",
    dossier: "PRJ/2026/014", recurrente: false, convoques: 8, presents: 7, excuses: 1, representes: 0,
    pointsOrdreDuJour: [
      { intitule: "Avancement des livrables", porteur: "Awa Diallo", duree: 30, traite: true },
      { intitule: "Écart budgétaire", porteur: "Oumar Fall", duree: 40, traite: true },
    ],
    compteRendu: "retourné", decisionsSeance: 2, recommandations: 4,
    motifRetour: "Le relevé ne distingue pas ce qui a été décidé de ce qui a été seulement évoqué. À reprendre point par point.",
  },
  {
    code: "0144/ANAT/DG", intitule: "Commission mixte de coopération", quand: dateHeureFr(jours(-3)), dansXJours: -3,
    lieu: "Hôtel de la province", visio: false, presidence: "Awa Diallo", rapporteur: "Moussa Traoré", maitreDuTemps: "—",
    dossier: "ACT/2026/107", recurrente: false, convoques: 14, presents: 12, excuses: 2, representes: 0,
    pointsOrdreDuJour: [
      { intitule: "Présentation des axes de coopération", porteur: "Awa Diallo", duree: 45, traite: true },
      { intitule: "Projet de convention", porteur: "Moussa Traoré", duree: 60, traite: true },
      { intitule: "Calendrier de signature", porteur: "Nadia Camara", duree: 20, traite: true },
    ],
    compteRendu: "validé", decisionsSeance: 4, recommandations: 6, motifRetour: "",
  },
  {
    code: "0143/ANAT/SI", intitule: "Revue technique du système de gestion", quand: dateHeureFr(jours(-19)), dansXJours: -19,
    lieu: "Visioconférence", visio: true, presidence: "Idriss Kouassi", rapporteur: "Chantal Mbaye", maitreDuTemps: "—",
    dossier: "PRJ/2026/022", recurrente: false, convoques: 6, presents: 6, excuses: 0, representes: 0,
    pointsOrdreDuJour: [
      { intitule: "Architecture retenue", porteur: "Idriss Kouassi", duree: 40, traite: true },
      { intitule: "Reprise des données existantes", porteur: "Chantal Mbaye", duree: 35, traite: true },
    ],
    compteRendu: "validé", decisionsSeance: 2, recommandations: 3, motifRetour: "",
  },
  {
    code: "0142/ANAT/DG", intitule: "Réunion hebdomadaire de direction", quand: dateHeureFr(jours(-12)), dansXJours: -12,
    lieu: "Salle du conseil", visio: true, presidence: "Awa Diallo", rapporteur: "Nadia Camara", maitreDuTemps: "Thomas Diop",
    dossier: "—", recurrente: true, convoques: 12, presents: 10, excuses: 2, representes: 0,
    pointsOrdreDuJour: [{ intitule: "Ordre du jour courant", porteur: "Nadia Camara", duree: 60, traite: true }],
    compteRendu: "brouillon", decisionsSeance: 1, recommandations: 2, motifRetour: "",
  },
];

/* =========================================================================
   4. DÉCISIONS — le registre
   Numérotée, figée, confiée à quelqu'un avec une échéance, suivie jusqu'à
   son exécution. Elle ne se modifie pas : elle se remplace par une nouvelle,
   et l'ancienne reste lisible. C'est ce qui distingue un registre d'une
   liste de tâches.
   ========================================================================= */
export type EtatDecision = "à exécuter" | "en cours" | "exécutée" | "remplacée";

export interface Decision {
  code: string; titre: string; texte: string; prise: string;
  dossier: string; charge: string; echeance: string; joursRestants: number;
  etat: EtatDecision; origine: "Registre" | "Arbitrage" | "Séance" | "Tableau de bord";
  remplacePar: string; confidentiel: boolean;
}

export const decisions: Decision[] = [
  {
    code: "DEC/2026/0152", titre: "Réduction du périmètre du schéma directeur",
    texte: "Le périmètre du schéma directeur est ramené aux huit provinces initialement prévues. Les deux provinces ajoutées feront l'objet d'un avenant au prochain exercice budgétaire.",
    prise: dateFr(jours(-1)), dossier: "PRJ/2026/014", charge: "Awa Diallo",
    echeance: dateFr(jours(13)), joursRestants: 13, etat: "à exécuter", origine: "Arbitrage",
    remplacePar: "", confidentiel: false,
  },
  {
    code: "DEC/2026/0151", titre: "Signature de la convention de coopération",
    texte: "La convention de coopération territoriale est signée au premier trimestre, assortie d'une clause de révision annuelle liée aux priorités du schéma directeur.",
    prise: dateFr(jours(-3)), dossier: "ACT/2026/107", charge: "Moussa Traoré",
    echeance: dateFr(jours(28)), joursRestants: 28, etat: "en cours", origine: "Séance",
    remplacePar: "", confidentiel: false,
  },
  {
    code: "DEC/2026/0150", titre: "Report de la conférence nationale",
    texte: "La conférence nationale sur l'aménagement est reportée de deux semaines, pour permettre la publication du schéma directeur avant sa tenue.",
    prise: dateFr(jours(-6)), dossier: "ACT/2026/112", charge: "Nadia Camara",
    echeance: dateFr(jours(-1)), joursRestants: -1, etat: "en cours", origine: "Séance",
    remplacePar: "", confidentiel: false,
  },
  {
    code: "DEC/2026/0149", titre: "Deuxième facteur obligatoire pour l'administration",
    texte: "Tout compte disposant d'un rôle d'administration doit enregistrer un deuxième facteur d'authentification avant la fin du mois.",
    prise: dateFr(jours(-14)), dossier: "PRJ/2026/022", charge: "Idriss Kouassi",
    echeance: dateFr(jours(-4)), joursRestants: -4, etat: "exécutée", origine: "Registre",
    remplacePar: "", confidentiel: false,
  },
  {
    code: "DEC/2026/0148", titre: "Mise à disposition d'un agent auprès de la province",
    texte: "Un agent de la direction de la planification est mis à disposition de la province pour une durée de six mois renouvelable.",
    prise: dateFr(jours(-21)), dossier: "—", charge: "Chantal Mbaye",
    echeance: dateFr(jours(-9)), joursRestants: -9, etat: "exécutée", origine: "Registre",
    remplacePar: "", confidentiel: true,
  },
  {
    code: "DEC/2026/0147", titre: "Calendrier de signature de la convention",
    texte: "La signature de la convention est subordonnée à la validation préalable du schéma directeur.",
    prise: dateFr(jours(-28)), dossier: "ACT/2026/107", charge: "Moussa Traoré",
    echeance: dateFr(jours(-12)), joursRestants: -12, etat: "remplacée", origine: "Arbitrage",
    remplacePar: "DEC/2026/0151", confidentiel: false,
  },
  {
    code: "DEC/2026/0146", titre: "Ouverture d'un marché d'études cartographiques",
    texte: "Un marché d'études cartographiques est ouvert pour la couverture des deux provinces ajoutées au schéma directeur.",
    prise: dateFr(jours(-34)), dossier: "PRJ/2026/014", charge: "Oumar Fall",
    echeance: dateFr(jours(6)), joursRestants: 6, etat: "en cours", origine: "Tableau de bord",
    remplacePar: "", confidentiel: false,
  },
];

/* =========================================================================
   5. SIGNATAIRE — le circuit de visa et de signature
   On dit « le signataire », pas « parapheur » : le mot désigne la personne
   qui engage, pas le classeur qui transporte. Un document en circuit est
   figé ; chaque signataire est prévenu à son tour ; une signature alimente
   le dossier d'origine.
   ========================================================================= */
export type EtatCircuit = "préparé" | "en circuit" | "signé" | "rejeté";

export interface Circuit {
  code: string; document: string; type: "Convention" | "Décision" | "Courrier sortant" | "Note" | "Marché";
  dossier: string; prepare: string; preparePar: string;
  etat: EtatCircuit; urgence: "normale" | "urgente";
  etapes: { ordre: number; role: "Visa" | "Signature"; personne: string; etat: "faite" | "en cours" | "attente" | "rejetée"; quand: string; commentaire: string }[];
  motifRejet: string;
}

export const circuits: Circuit[] = [
  {
    code: "SIG/2026/0231", document: "Convention de coopération territoriale", type: "Convention",
    dossier: "ACT/2026/107", prepare: dateFr(jours(-2)), preparePar: "Nadia Camara",
    etat: "en circuit", urgence: "urgente",
    etapes: [
      { ordre: 1, role: "Visa", personne: "Moussa Traoré", etat: "faite", quand: dateHeureFr(jours(-2)), commentaire: "Conforme au relevé de la commission mixte." },
      { ordre: 2, role: "Visa", personne: "Oumar Fall", etat: "faite", quand: dateHeureFr(jours(-1)), commentaire: "Engagement budgétaire vérifié." },
      { ordre: 3, role: "Visa", personne: "Sarah Keita", etat: "en cours", quand: "", commentaire: "" },
      { ordre: 4, role: "Signature", personne: "Awa Diallo", etat: "attente", quand: "", commentaire: "" },
    ],
    motifRejet: "",
  },
  {
    code: "SIG/2026/0230", document: "Réponse à la demande d'avis sur l'arrêté provincial", type: "Courrier sortant",
    dossier: "SOR/2026/1038", prepare: dateFr(jours(-1)), preparePar: "Thomas Diop",
    etat: "en circuit", urgence: "normale",
    etapes: [
      { ordre: 1, role: "Visa", personne: "Samuel Ndiaye", etat: "faite", quand: dateHeureFr(jours(-1)), commentaire: "" },
      { ordre: 2, role: "Signature", personne: "Awa Diallo", etat: "en cours", quand: "", commentaire: "" },
    ],
    motifRejet: "",
  },
  {
    code: "SIG/2026/0229", document: "Décision de réduction du périmètre", type: "Décision",
    dossier: "DEC/2026/0152", prepare: dateFr(jours(-2)), preparePar: "Nadia Camara",
    etat: "signé", urgence: "normale",
    etapes: [
      { ordre: 1, role: "Visa", personne: "Oumar Fall", etat: "faite", quand: dateHeureFr(jours(-2)), commentaire: "Impact budgétaire chiffré en annexe." },
      { ordre: 2, role: "Signature", personne: "Awa Diallo", etat: "faite", quand: dateHeureFr(jours(-1)), commentaire: "" },
    ],
    motifRejet: "",
  },
  {
    code: "SIG/2026/0228", document: "Marché d'études cartographiques", type: "Marché",
    dossier: "PRJ/2026/014", prepare: dateFr(jours(-6)), preparePar: "Oumar Fall",
    etat: "rejeté", urgence: "normale",
    etapes: [
      { ordre: 1, role: "Visa", personne: "Sarah Keita", etat: "faite", quand: dateHeureFr(jours(-6)), commentaire: "" },
      { ordre: 2, role: "Visa", personne: "Moussa Traoré", etat: "rejetée", quand: dateHeureFr(jours(-5)), commentaire: "Le montant dépasse le seuil de la procédure simplifiée. À reprendre en appel d'offres." },
      { ordre: 3, role: "Signature", personne: "Awa Diallo", etat: "attente", quand: "", commentaire: "" },
    ],
    motifRejet: "Le montant dépasse le seuil de la procédure simplifiée. À reprendre en appel d'offres.",
  },
  {
    code: "SIG/2026/0227", document: "Note de cadrage du projet numérique", type: "Note",
    dossier: "PRJ/2026/022", prepare: dateFr(jours(-8)), preparePar: "Idriss Kouassi",
    etat: "signé", urgence: "normale",
    etapes: [
      { ordre: 1, role: "Signature", personne: "Awa Diallo", etat: "faite", quand: dateHeureFr(jours(-7)), commentaire: "" },
    ],
    motifRejet: "",
  },
];

export const delegations = [
  { de: "Awa Diallo", a: "Moussa Traoré", portee: "Courrier sortant et notes", du: dateFr(jours(-4)), au: dateFr(jours(6)), motif: "Mission à l'étranger", active: true },
  { de: "Oumar Fall", a: "Sarah Keita", portee: "Visa budgétaire sous 50 000 €", du: dateFr(jours(-30)), au: dateFr(jours(-10)), motif: "Congé annuel", active: false },
];

/* =========================================================================
   6. ACCORDS ET PARTENAIRES
   Une convention vit : elle se négocie, se signe, entre en vigueur, et
   s'éteint. Ce qui compte dans un tableau de bord, c'est l'échéance qu'on
   va rater et l'engagement qu'on a pris sans le suivre.
   ========================================================================= */
export type EtatAccord = "en négociation" | "en signature" | "en vigueur" | "échu" | "dénoncé";

export interface Partenaire {
  code: string; nom: string; type: "Institution publique" | "Bailleur" | "Collectivité" | "Organisation internationale" | "Prestataire";
  pays: string; referent: string; depuis: string;
  accords: number; accordsActifs: number; dernierContact: string;
}
export const partenaires: Partenaire[] = [
  { code: "PAR-01", nom: "Ministère de l'Aménagement", type: "Institution publique", pays: "National", referent: "Awa Diallo", depuis: "2022", accords: 4, accordsActifs: 3, dernierContact: "il y a 3 j" },
  { code: "PAR-02", nom: "Banque régionale de développement", type: "Bailleur", pays: "Régional", referent: "Oumar Fall", depuis: "2023", accords: 2, accordsActifs: 2, dernierContact: "il y a 12 j" },
  { code: "PAR-03", nom: "Province du Kongo-Central", type: "Collectivité", pays: "National", referent: "Moussa Traoré", depuis: "2024", accords: 3, accordsActifs: 1, dernierContact: "il y a 1 j" },
  { code: "PAR-04", nom: "Organisation internationale partenaire", type: "Organisation internationale", pays: "International", referent: "Nadia Camara", depuis: "2021", accords: 5, accordsActifs: 2, dernierContact: "il y a 28 j" },
  { code: "PAR-05", nom: "Cabinet d'études territoriales", type: "Prestataire", pays: "National", referent: "Sarah Keita", depuis: "2025", accords: 2, accordsActifs: 1, dernierContact: "il y a 6 j" },
];

export interface Accord {
  code: string; intitule: string; partenaire: string; type: "Convention-cadre" | "Convention d'application" | "Protocole" | "Marché" | "Avenant";
  etat: EtatAccord; signeLe: string; entreeEnVigueur: string; echeance: string; joursAvantEcheance: number;
  montant: number; verse: number; referent: string; dossier: string;
  reconductionTacite: boolean; preavis: number; engagements: { intitule: string; echeance: string; tenu: boolean }[];
}

export const accords: Accord[] = [
  {
    code: "ACC/2023/004", intitule: "Convention-cadre de coopération technique", partenaire: "Ministère de l'Aménagement",
    type: "Convention-cadre", etat: "en vigueur", signeLe: dateFr(jours(-740)), entreeEnVigueur: dateFr(jours(-730)),
    echeance: dateFr(jours(34)), joursAvantEcheance: 34, montant: 0, verse: 0,
    referent: "Awa Diallo", dossier: "—", reconductionTacite: true, preavis: 90,
    engagements: [
      { intitule: "Rapport annuel d'exécution", echeance: dateFr(jours(-12)), tenu: true },
      { intitule: "Comité de suivi semestriel", echeance: dateFr(jours(21)), tenu: false },
    ],
  },
  {
    code: "ACC/2024/011", intitule: "Financement du schéma directeur provincial", partenaire: "Banque régionale de développement",
    type: "Convention d'application", etat: "en vigueur", signeLe: dateFr(jours(-410)), entreeEnVigueur: dateFr(jours(-400)),
    echeance: dateFr(jours(128)), joursAvantEcheance: 128, montant: 480_000, verse: 336_000,
    referent: "Oumar Fall", dossier: "PRJ/2026/014", reconductionTacite: false, preavis: 0,
    engagements: [
      { intitule: "Remise du rapport intermédiaire", echeance: dateFr(jours(-4)), tenu: false },
      { intitule: "Audit financier de mi-parcours", echeance: dateFr(jours(54)), tenu: false },
      { intitule: "Restitution publique", echeance: dateFr(jours(118)), tenu: false },
    ],
  },
  {
    code: "ACC/2026/002", intitule: "Protocole de coopération territoriale", partenaire: "Province du Kongo-Central",
    type: "Protocole", etat: "en signature", signeLe: "—", entreeEnVigueur: "—",
    echeance: "—", joursAvantEcheance: 999, montant: 0, verse: 0,
    referent: "Moussa Traoré", dossier: "ACT/2026/107", reconductionTacite: false, preavis: 0,
    engagements: [],
  },
  {
    code: "ACC/2021/007", intitule: "Accord de partage de données cartographiques", partenaire: "Organisation internationale partenaire",
    type: "Convention-cadre", etat: "en vigueur", signeLe: dateFr(jours(-1480)), entreeEnVigueur: dateFr(jours(-1470)),
    echeance: dateFr(jours(8)), joursAvantEcheance: 8, montant: 0, verse: 0,
    referent: "Nadia Camara", dossier: "—", reconductionTacite: true, preavis: 60,
    engagements: [{ intitule: "Mise à jour annuelle du jeu de données", echeance: dateFr(jours(-30)), tenu: true }],
  },
  {
    code: "ACC/2025/009", intitule: "Marché d'assistance à maîtrise d'ouvrage", partenaire: "Cabinet d'études territoriales",
    type: "Marché", etat: "en vigueur", signeLe: dateFr(jours(-180)), entreeEnVigueur: dateFr(jours(-175)),
    echeance: dateFr(jours(-5)), joursAvantEcheance: -5, montant: 86_000, verse: 72_400,
    referent: "Sarah Keita", dossier: "PRJ/2026/022", reconductionTacite: false, preavis: 0,
    engagements: [{ intitule: "Remise du rapport final", echeance: dateFr(jours(-5)), tenu: false }],
  },
  {
    code: "ACC/2022/003", intitule: "Convention de mise à disposition de locaux", partenaire: "Province du Kongo-Central",
    type: "Convention d'application", etat: "échu", signeLe: dateFr(jours(-1100)), entreeEnVigueur: dateFr(jours(-1090)),
    echeance: dateFr(jours(-120)), joursAvantEcheance: -120, montant: 24_000, verse: 24_000,
    referent: "Moussa Traoré", dossier: "—", reconductionTacite: false, preavis: 0,
    engagements: [],
  },
  {
    code: "ACC/2020/001", intitule: "Protocole d'échange de personnel", partenaire: "Organisation internationale partenaire",
    type: "Protocole", etat: "dénoncé", signeLe: dateFr(jours(-1900)), entreeEnVigueur: dateFr(jours(-1890)),
    echeance: dateFr(jours(-300)), joursAvantEcheance: -300, montant: 0, verse: 0,
    referent: "Nadia Camara", dossier: "—", reconductionTacite: false, preavis: 0,
    engagements: [],
  },
];
