/* =========================================================================
   Dormance des comptes — la politique du trimestre sans activité.

   Un compte qu'on n'utilise plus ne gêne personne : c'est précisément le
   problème. Il garde ses droits, il ne lève aucune alerte, et personne ne
   s'étonne qu'il ne fasse rien. C'est le compte qu'on vole.

   Ce qui est dangereux n'est donc pas la dormance, c'est la dormance **avec
   des droits**. Un lecteur qui ne s'est pas connecté depuis six mois ne
   présente presque aucun risque ; un ordonnateur dans le même état en
   présente beaucoup. L'écran trie dans cet ordre, pas dans l'ordre des jours.

   Trois seuils, et aucune coupure automatique :
     60 jours  — l'agent et son responsable sont prévenus. Rien ne change.
     90 jours  — le compte entre dans la vague du mois, déposée dans la file
                 d'approbation. Un humain tranche, compte par compte.
    180 jours  — la clôture définitive est proposée : le compte sort du
                 référentiel actif et ses dossiers cherchent un repreneur.

   La politique ne désactive jamais seule. Elle avertit, elle marque, elle
   propose. C'est la règle de l'outil entier, et une politique qui s'en
   dispenserait serait la première brèche.
   ========================================================================= */

export const SEUILS = {
  /** L'agent et son responsable reçoivent un avertissement. */
  avertissement: 60,
  /** Le compte entre dans la vague proposée à l'approbation. */
  proposition: 90,
  /** La clôture définitive est proposée. */
  cloture: 180,
  /** Délai entre l'avertissement et la proposition : le temps de réagir. */
  preavis: 14,
  /** Une désactivation se défait d'un clic pendant ce délai. */
  retractation: 30,
} as const;

/* Ce qui remet le compteur à zéro. La liste est courte et elle est dite à
   l'écran : un agent qui croit que lire un courriel suffit se fait couper. */
export const ACTIVITE_RECONNUE = [
  "une connexion à la plateforme, quel que soit le canal",
  "une action journalisée — saisie, validation, dépôt, consultation d'un dossier",
  "un appel d'API portant le jeton du compte",
] as const;

export const ACTIVITE_NON_RECONNUE = [
  "la réception d'un message ou d'une notification",
  "l'ouverture d'un courriel envoyé par la plateforme",
  "l'activité d'un collègue sur un dossier dont le compte est destinataire",
] as const;

export type EtatDormance = "éveillé" | "averti" | "proposé" | "exempté" | "désactivé" | "clôturé";

export type MotifExemption =
  | "congé de longue durée"
  | "détachement"
  | "mission de terrain"
  | "compte de service"
  | "mandat en cours";

export interface CompteDormant {
  id: string;
  agent: string;
  matricule: string;
  direction: string;
  fonction: string;
  role: string;
  /** Jours écoulés depuis la dernière activité reconnue. */
  jours: number;
  derniereActivite: string;
  /** Ce qu'il a fait en dernier : utile pour juger si l'absence s'explique. */
  dernierGeste: string;
  etat: EtatDormance;
  avertiLe?: string;
  /** Date de la vague dans laquelle il entre, quand il est proposé. */
  echeance?: string;
  deuxFacteurs: boolean;
  sessionsOuvertes: number;
  /** Les droits que le compte conserve pendant qu'il dort. Le vrai risque. */
  droitsSensibles: string[];
  /** Ce que la désactivation laisserait sans propriétaire. */
  dossiersOuverts: number;
  exemption?: {
    motif: MotifExemption;
    precision: string;
    signePar: string;
    le: string;
    revoirLe: string;
    /** Vrai quand la date de revue est dépassée : l'exemption ne tient plus. */
    perimee: boolean;
  };
}

/* Un compte dormant qui garde des droits forts pèse plus lourd qu'un compte
   dormant depuis plus longtemps mais sans pouvoir. C'est le tri de l'écran. */
export function poids(c: CompteDormant): number {
  const parJours = Math.min(3, Math.floor(c.jours / 60));
  const parDroits = c.droitsSensibles.length * 2;
  const sansDeuxFacteurs = c.deuxFacteurs ? 0 : 2;
  const sessionOuverte = c.sessionsOuvertes > 0 ? 3 : 0;
  return parJours + parDroits + sansDeuxFacteurs + sessionOuverte;
}

export function gravite(c: CompteDormant): "faible" | "moyen" | "élevé" {
  const p = poids(c);
  return p >= 8 ? "élevé" : p >= 4 ? "moyen" : "faible";
}

/** Ce qui saute aux yeux sur une ligne, dit en une phrase. */
export function pourquoiCaCompte(c: CompteDormant): string | null {
  if (c.sessionsOuvertes > 0)
    return `Une session est encore ouverte sur ce compte alors qu'il n'a rien fait depuis ${c.jours} jours. C'est le cas qui se regarde en premier.`;
  if (c.droitsSensibles.length >= 3)
    return `Le compte dort depuis ${c.jours} jours en gardant ${c.droitsSensibles.length} droits sensibles, dont « ${c.droitsSensibles[0]} ».`;
  if (!c.deuxFacteurs && c.droitsSensibles.length > 0)
    return "Le compte garde des droits sensibles sans deuxième facteur : un mot de passe suffit à le reprendre.";
  if (c.exemption?.perimee)
    return `L'exemption « ${c.exemption.motif} » devait être revue le ${c.exemption.revoirLe}. Elle ne tient plus.`;
  return null;
}

export const comptesDormants: CompteDormant[] = [
  /* --- Ceux qui comptent vraiment ------------------------------------- */
  { id: "U-1104", agent: "Mamadou Bâ", matricule: "4102", direction: "Direction du patrimoine",
    fonction: "Chef de service", role: "Gestionnaire", jours: 118,
    derniereActivite: "30 juillet 2026", dernierGeste: "Validation d'un marché de travaux (4,2 M F CFA)",
    etat: "proposé", avertiLe: "28 septembre 2026", echeance: "30 novembre 2026",
    deuxFacteurs: true, sessionsOuvertes: 1,
    droitsSensibles: ["Valider un engagement de dépense", "Signer un bon de commande", "Approuver un marché"],
    dossiersOuverts: 4 },

  { id: "U-1211", agent: "Nadia Camara", matricule: "3877", direction: "Direction financière",
    fonction: "Ordonnateur délégué", role: "Administrateur", jours: 96,
    derniereActivite: "21 août 2026", dernierGeste: "Ordonnancement de la paie d'août",
    etat: "proposé", avertiLe: "20 octobre 2026", echeance: "30 novembre 2026",
    deuxFacteurs: false, sessionsOuvertes: 0,
    droitsSensibles: ["Ordonnancer un paiement", "Modifier un référentiel de paie", "Exporter les données de paie"],
    dossiersOuverts: 2 },

  { id: "U-1033", agent: "Victor Dubois", matricule: "2914", direction: "Direction des systèmes d'information",
    fonction: "Administrateur système", role: "Administrateur système", jours: 134,
    derniereActivite: "14 juillet 2026", dernierGeste: "Création d'un jeton d'API de portée « lecture »",
    etat: "proposé", avertiLe: "12 septembre 2026", echeance: "30 novembre 2026",
    deuxFacteurs: true, sessionsOuvertes: 0,
    droitsSensibles: ["Administrer les comptes", "Exécuter une requête en écriture", "Approuver un outil MCP", "Déployer en production"],
    dossiersOuverts: 0 },

  { id: "U-1176", agent: "Rokia Keita", matricule: "4418", direction: "Direction des ressources humaines",
    fonction: "Gestionnaire de carrière", role: "Gestionnaire", jours: 104,
    derniereActivite: "13 août 2026", dernierGeste: "Enrôlement de six agents de la promotion de juillet",
    etat: "proposé", avertiLe: "11 octobre 2026", echeance: "30 novembre 2026",
    deuxFacteurs: false, sessionsOuvertes: 0,
    droitsSensibles: ["Enrôler un agent", "Modifier un dossier d'agent"],
    dossiersOuverts: 7 },

  { id: "U-1290", agent: "Karim Touré", matricule: "4501", direction: "Direction régionale de Thiès",
    fonction: "Chargé d'études", role: "Opérateur", jours: 91,
    derniereActivite: "26 août 2026", dernierGeste: "Dépôt du rapport trimestriel de la région",
    etat: "proposé", avertiLe: "25 octobre 2026", echeance: "30 novembre 2026",
    deuxFacteurs: true, sessionsOuvertes: 0,
    droitsSensibles: ["Déposer un rapport régional"],
    dossiersOuverts: 1 },

  /* --- Exemptions, dont une périmée ----------------------------------- */
  { id: "U-1058", agent: "Aminata Diop", matricule: "3210", direction: "Direction de la planification",
    fonction: "Cheffe de division", role: "Gestionnaire", jours: 147,
    derniereActivite: "1er juillet 2026", dernierGeste: "Arbitrage sur le schéma directeur de Kaolack",
    etat: "exempté", deuxFacteurs: true, sessionsOuvertes: 0,
    droitsSensibles: ["Arbitrer un dossier", "Valider un schéma directeur"],
    dossiersOuverts: 3,
    exemption: { motif: "congé de longue durée", precision: "Congé de maternité puis congé annuel, retour prévu le 5 janvier 2027.",
      signePar: "Fatou Sow", le: "28 juin 2026", revoirLe: "15 janvier 2027", perimee: false } },

  { id: "U-1122", agent: "Idriss Fall", matricule: "3655", direction: "Direction générale",
    fonction: "Conseiller technique", role: "Analyste", jours: 203,
    derniereActivite: "6 mai 2026", dernierGeste: "Consultation du tableau de bord de la direction générale",
    etat: "exempté", deuxFacteurs: true, sessionsOuvertes: 0,
    droitsSensibles: ["Lire les dossiers de la direction générale"],
    dossiersOuverts: 0,
    exemption: { motif: "détachement", precision: "Détachement auprès du ministère, initialement pour six mois.",
      signePar: "Awa Diallo", le: "2 mai 2026", revoirLe: "2 novembre 2026", perimee: true } },

  { id: "U-1301", agent: "robot-moissonneur", matricule: "—", direction: "Direction des systèmes d'information",
    fonction: "Compte de service", role: "Opérateur", jours: 112,
    derniereActivite: "5 août 2026", dernierGeste: "Moisson nocturne du référentiel géographique",
    etat: "exempté", deuxFacteurs: false, sessionsOuvertes: 0,
    droitsSensibles: ["Écrire dans le référentiel géographique"],
    dossiersOuverts: 0,
    exemption: { motif: "compte de service", precision: "Compte technique du moissonneur : il ne se connecte pas, il porte un jeton. Sa surveillance passe par la rotation du secret, pas par la dormance.",
      signePar: "Ibrahima Ndiaye", le: "12 février 2026", revoirLe: "12 février 2027", perimee: false } },

  { id: "U-1245", agent: "Oumar Cissé", matricule: "4096", direction: "Direction régionale de Ziguinchor",
    fonction: "Enquêteur de terrain", role: "Opérateur", jours: 88,
    derniereActivite: "29 août 2026", dernierGeste: "Saisie de 42 fiches d'enquête hors ligne",
    etat: "exempté", deuxFacteurs: true, sessionsOuvertes: 0,
    droitsSensibles: [],
    dossiersOuverts: 2,
    exemption: { motif: "mission de terrain", precision: "Campagne d'enquête en Casamance, saisie hors ligne synchronisée au retour.",
      signePar: "Ibrahima Ndiaye", le: "15 septembre 2026", revoirLe: "31 décembre 2026", perimee: false } },

  /* --- Avertis, pas encore proposés ----------------------------------- */
  { id: "U-1187", agent: "Chantal Mbaye", matricule: "3988", direction: "Direction de la communication",
    fonction: "Chargée de communication", role: "Opérateur", jours: 71,
    derniereActivite: "15 septembre 2026", dernierGeste: "Publication d'un communiqué sur le site",
    etat: "averti", avertiLe: "14 novembre 2026",
    deuxFacteurs: true, sessionsOuvertes: 0,
    droitsSensibles: ["Publier sur le site institutionnel"],
    dossiersOuverts: 1 },

  { id: "U-1264", agent: "Samuel Ndiaye", matricule: "4277", direction: "Direction des études",
    fonction: "Statisticien", role: "Analyste", jours: 67,
    derniereActivite: "19 septembre 2026", dernierGeste: "Export de la série des indicateurs régionaux",
    etat: "averti", avertiLe: "18 novembre 2026",
    deuxFacteurs: true, sessionsOuvertes: 0,
    droitsSensibles: ["Exporter un jeu de données"],
    dossiersOuverts: 0 },

  { id: "U-1099", agent: "Léa Rousseau", matricule: "3541", direction: "Direction juridique",
    fonction: "Juriste", role: "Lecteur", jours: 63,
    derniereActivite: "23 septembre 2026", dernierGeste: "Consultation d'un accord de partenariat",
    etat: "averti", avertiLe: "22 novembre 2026",
    deuxFacteurs: false, sessionsOuvertes: 0,
    droitsSensibles: [],
    dossiersOuverts: 0 },

  /* --- Déjà tranchés --------------------------------------------------- */
  { id: "U-1017", agent: "Pierre Bernard", matricule: "2788", direction: "Direction administrative",
    fonction: "Agent comptable adjoint", role: "Gestionnaire", jours: 168,
    derniereActivite: "11 juin 2026", dernierGeste: "Rapprochement bancaire de mai",
    etat: "désactivé", avertiLe: "10 août 2026", echeance: "31 octobre 2026",
    deuxFacteurs: true, sessionsOuvertes: 0,
    droitsSensibles: ["Rapprocher un compte", "Exporter les écritures"],
    dossiersOuverts: 0 },

  { id: "U-1150", agent: "Esther Barry", matricule: "3802", direction: "Direction des ressources humaines",
    fonction: "Assistante", role: "Opérateur", jours: 212,
    derniereActivite: "28 avril 2026", dernierGeste: "Saisie d'un congé",
    etat: "clôturé", avertiLe: "27 juin 2026", echeance: "30 septembre 2026",
    deuxFacteurs: false, sessionsOuvertes: 0,
    droitsSensibles: [],
    dossiersOuverts: 0 },

  { id: "U-1222", agent: "Thomas Moreau", matricule: "3999", direction: "Direction du patrimoine",
    fonction: "Technicien", role: "Opérateur", jours: 12,
    derniereActivite: "14 novembre 2026", dernierGeste: "Mise à jour d'une fiche d'immobilisation",
    etat: "éveillé", avertiLe: "3 octobre 2026",
    deuxFacteurs: true, sessionsOuvertes: 1,
    droitsSensibles: ["Modifier une fiche d'immobilisation"],
    dossiersOuverts: 2 },
];

/* --- Vagues : ce que la politique a produit, mois après mois ------------ */
export interface Vague {
  mois: string;
  proposes: number;
  desactives: number;
  exemptes: number;
  reveilles: number;
  /** Comptes qui se sont reconnectés après l'avertissement. C'est le chiffre
      qui dit si l'avertissement sert à quelque chose. */
  etat: "close" | "en cours";
}

export const vagues: Vague[] = [
  { mois: "Novembre 2026", proposes: 5, desactives: 0, exemptes: 1, reveilles: 3, etat: "en cours" },
  { mois: "Octobre 2026", proposes: 8, desactives: 6, exemptes: 1, reveilles: 1, etat: "close" },
  { mois: "Septembre 2026", proposes: 11, desactives: 7, exemptes: 2, reveilles: 2, etat: "close" },
  { mois: "Août 2026", proposes: 6, desactives: 4, exemptes: 0, reveilles: 2, etat: "close" },
  { mois: "Juillet 2026", proposes: 9, desactives: 5, exemptes: 3, reveilles: 1, etat: "close" },
  { mois: "Juin 2026", proposes: 14, desactives: 9, exemptes: 2, reveilles: 3, etat: "close" },
];

/* --- Les politiques voisines, même mécanique ---------------------------- */
export interface PolitiqueCycle {
  id: string;
  nom: string;
  seuil: string;
  quoi: string;
  concernes: number;
  actif: boolean;
}

export const politiquesVoisines: PolitiqueCycle[] = [
  { id: "P-01", nom: "Comptes sans activité", seuil: "90 jours", concernes: 5, actif: true,
    quoi: "Avertis à 60 jours, proposés à la désactivation à 90, clôture proposée à 180." },
  { id: "P-02", nom: "Invitations jamais acceptées", seuil: "14 jours", concernes: 3, actif: true,
    quoi: "Une invitation non acceptée expire. Le compte n'a jamais existé, il n'y a rien à désactiver." },
  { id: "P-03", nom: "Jetons d'API dormants", seuil: "60 jours", concernes: 2, actif: true,
    quoi: "Un jeton qu'on n'appelle plus est révoqué après avis de son propriétaire." },
  { id: "P-04", nom: "Comptes de service sans rotation", seuil: "12 mois", concernes: 1, actif: true,
    quoi: "Un compte de service ne dort pas : il est surveillé sur la rotation de son secret." },
  { id: "P-05", nom: "Exemptions périmées", seuil: "à la date de revue", concernes: 1, actif: true,
    quoi: "Une exemption dont la date de revue est passée ne protège plus rien et remonte en tête." },
];

/* --- Chiffres de la page ------------------------------------------------ */
export const CHIFFRES_DORMANCE = {
  get proposes() { return comptesDormants.filter((c) => c.etat === "proposé").length; },
  get avertis() { return comptesDormants.filter((c) => c.etat === "averti").length; },
  get exemptes() { return comptesDormants.filter((c) => c.etat === "exempté").length; },
  get perimees() { return comptesDormants.filter((c) => c.exemption?.perimee).length; },
  get graves() { return comptesDormants.filter((c) => c.etat !== "désactivé" && c.etat !== "clôturé" && gravite(c) === "élevé").length; },
  get droitsDormants() {
    return comptesDormants
      .filter((c) => c.etat === "proposé" || c.etat === "averti" || c.etat === "exempté")
      .reduce((s, c) => s + c.droitsSensibles.length, 0);
  },
};
