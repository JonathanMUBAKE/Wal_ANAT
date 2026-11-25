/* =========================================================================
   COMMUNICATION — canaux d'envoi, modèles de messages, journal des envois
   Trois canaux, trois logiques différentes :
   - la messagerie se juge à sa réputation (SPF, DKIM, DMARC, rebonds) ;
   - le SMS se juge à son coût et à sa couverture ;
   - WhatsApp impose des modèles approuvés et une fenêtre de 24 heures.
   Tout est simulé.
   ========================================================================= */

import { alea, choix, entre, serie } from "./donnees";
import { AGENTS_NOMS } from "./sigrh";

export type EtatCanal = "actif" | "dégradé" | "en erreur" | "non configuré";

/* --- Messagerie (SMTP) --------------------------------------------------- */
export const smtp = {
  etat: "actif" as EtatCanal,
  hote: "smtp.exemple.org",
  port: 587,
  chiffrement: "STARTTLS",
  authentification: "Nom d'utilisateur et mot de passe",
  utilisateur: "sigrh@exemple.org",
  expediteur: "SIGRH <sigrh@exemple.org>",
  repondreA: "rh@exemple.org",
  limiteParHeure: 2000,
  envoyeDerniereHeure: 684,
  filesEnAttente: 412,
  tailleMaxPiece: 10,
  verifications: [
    { nom: "SPF", etat: "bon" as const, detail: "L'enregistrement autorise le serveur d'envoi." },
    { nom: "DKIM", etat: "bon" as const, detail: "Signature valide, sélecteur sigrh2026." },
    { nom: "DMARC", etat: "vigilance" as const, detail: "Politique en « none » : les messages usurpés ne sont pas rejetés." },
    { nom: "TLS sortant", etat: "bon" as const, detail: "Négocié en TLS 1.3 sur les 1 000 derniers envois." },
    { nom: "Liste noire", etat: "bon" as const, detail: "L'adresse d'envoi n'apparaît sur aucune liste surveillée." },
  ],
  statistiques: {
    envoyes30j: 184_200,
    delivres: 97.8,
    rebondsDurs: 1.1,
    rebondsSouples: 0.8,
    plaintes: 0.03,
    ouverts: 62.4,
  },
  historique: serie(24, 680, 120),
};

/* --- SMS ----------------------------------------------------------------- */
export const sms = {
  etat: "actif" as EtatCanal,
  fournisseur: "Opérateur national",
  identifiantExpediteur: "SIGRH",
  pays: ["République démocratique du Congo"],
  coutUnitaire: 0.021,
  devise: "€",
  creditRestant: 1_284.4,
  seuilAlerte: 200,
  limiteParMinute: 120,
  envoyesMois: 42_800,
  delivres: 94.2,
  echecs: 5.8,
  motifsEchec: [
    { motif: "Numéro invalide ou inexistant", part: 48 },
    { motif: "Téléphone hors couverture", part: 31 },
    { motif: "Mémoire du téléphone pleine", part: 12 },
    { motif: "Refus de l'opérateur", part: 9 },
  ],
  historique: serie(24, 120, 40),
};

/* --- WhatsApp ------------------------------------------------------------ */
export const whatsapp = {
  etat: "dégradé" as EtatCanal,
  numero: "+243 00 000 00 00",
  compte: "Compte professionnel vérifié",
  qualite: "Moyenne" as "Élevée" | "Moyenne" | "Faible",
  limiteConversations: 1000,
  conversationsOuvertes: 284,
  fenetre: "24 heures après le dernier message de l'agent",
  envoyesMois: 9_400,
  delivres: 98.6,
  lus: 81.2,
  reponses: 34.8,
  avertissement:
    "La qualité du numéro est passée de « Élevée » à « Moyenne » après une série de signalements. " +
    "Trois baisses consécutives suspendent l'envoi de modèles.",
  historique: serie(24, 42, 14),
};

/* --- Modèles de messages -------------------------------------------------- */
export type CanalModele = "Messagerie" | "SMS" | "WhatsApp";

export interface ModeleMessage {
  id: string; nom: string; canal: CanalModele; categorie: string;
  objet: string; corps: string; variables: string[];
  etat: "approuvé" | "en attente" | "refusé" | "brouillon";
  envois30j: number; derniereModification: string; auteur: string;
  langue: string; motifRefus?: string;
}

export const modelesMessages: ModeleMessage[] = [
  {
    id: "M-01", nom: "Accusé de demande de congé", canal: "Messagerie", categorie: "Congés",
    objet: "Votre demande de congé du {{date_debut}} a bien été reçue",
    corps: "Bonjour {{prenom}},\n\nVotre demande de congé du {{date_debut}} au {{date_fin}}, soit {{nombre_jours}} jours, a été enregistrée sous le numéro {{reference}}.\n\nElle est transmise à {{responsable}} pour décision. Vous serez prévenu dès qu'elle aura été traitée.\n\nVotre solde avant cette demande : {{solde}} jours.",
    variables: ["prenom", "date_debut", "date_fin", "nombre_jours", "reference", "responsable", "solde"],
    etat: "approuvé", envois30j: 1_284, derniereModification: "12/10/2026", auteur: "Ressources humaines", langue: "Français",
  },
  {
    id: "M-02", nom: "Décision sur une demande de congé", canal: "Messagerie", categorie: "Congés",
    objet: "Votre demande {{reference}} a été {{decision}}",
    corps: "Bonjour {{prenom}},\n\nVotre demande de congé {{reference}} a été {{decision}} par {{responsable}} le {{date_decision}}.\n\n{{motif}}\n\nVotre solde après décision : {{solde}} jours.",
    variables: ["prenom", "reference", "decision", "responsable", "date_decision", "motif", "solde"],
    etat: "approuvé", envois30j: 1_180, derniereModification: "12/10/2026", auteur: "Ressources humaines", langue: "Français",
  },
  {
    id: "M-03", nom: "Rappel de pointage manquant", canal: "SMS", categorie: "Présences",
    objet: "—",
    corps: "SIGRH : aucun pointage de départ enregistré pour le {{date}}. Merci de régulariser avant le {{echeance}} auprès de votre responsable.",
    variables: ["date", "echeance"],
    etat: "approuvé", envois30j: 8_420, derniereModification: "03/09/2026", auteur: "Ressources humaines", langue: "Français",
  },
  {
    id: "M-04", nom: "Convocation à un entretien", canal: "WhatsApp", categorie: "Carrières",
    objet: "—",
    corps: "Bonjour {{prenom}}, vous êtes convoqué(e) à un entretien d'évaluation le {{date}} à {{heure}}, {{lieu}}. Merci de confirmer votre présence.",
    variables: ["prenom", "date", "heure", "lieu"],
    etat: "approuvé", envois30j: 184, derniereModification: "28/10/2026", auteur: "Ressources humaines", langue: "Français",
  },
  {
    id: "M-05", nom: "Pièce manquante au dossier", canal: "WhatsApp", categorie: "Documents",
    objet: "—",
    corps: "Bonjour {{prenom}}, il manque {{piece}} à votre dossier individuel. Merci de la déposer avant le {{echeance}} sur le portail agent.",
    variables: ["prenom", "piece", "echeance"],
    etat: "en attente", envois30j: 0, derniereModification: "21/11/2026", auteur: "Ressources humaines", langue: "Français",
  },
  {
    id: "M-06", nom: "Fin de contrat approchante", canal: "Messagerie", categorie: "Carrières",
    objet: "Votre contrat arrive à échéance le {{date_fin}}",
    corps: "Bonjour {{prenom}},\n\nVotre contrat arrive à échéance le {{date_fin}}. La direction des ressources humaines prendra contact avec vous avant cette date.",
    variables: ["prenom", "date_fin"],
    etat: "approuvé", envois30j: 14, derniereModification: "02/07/2026", auteur: "Ressources humaines", langue: "Français",
  },
  {
    id: "M-07", nom: "Offre de formation", canal: "WhatsApp", categorie: "Carrières",
    objet: "—",
    corps: "Bonjour {{prenom}} ! Profitez de notre nouvelle formation, places limitées, inscrivez-vous vite !",
    variables: ["prenom"],
    etat: "refusé", envois30j: 0, derniereModification: "18/11/2026", auteur: "Communication", langue: "Français",
    motifRefus: "Modèle à caractère promotionnel : la catégorie déclarée était « service ». À reclasser en « marketing » et à faire consentir, ou à reformuler.",
  },
  {
    id: "M-08", nom: "Code de vérification", canal: "SMS", categorie: "Sécurité",
    objet: "—",
    corps: "SIGRH : votre code de vérification est {{code}}. Il est valable {{duree}} minutes. Ne le communiquez à personne.",
    variables: ["code", "duree"],
    etat: "approuvé", envois30j: 32_400, derniereModification: "14/02/2026", auteur: "Systèmes d'information", langue: "Français",
  },
  {
    id: "M-09", nom: "Interruption de service programmée", canal: "Messagerie", categorie: "Exploitation",
    objet: "Le SIGRH sera indisponible le {{date}} de {{debut}} à {{fin}}",
    corps: "Bonjour,\n\nUne intervention technique rendra le SIGRH indisponible le {{date}}, de {{debut}} à {{fin}}.\n\nNature de l'intervention : {{nature}}.\n\nAucune action de votre part n'est nécessaire.",
    variables: ["date", "debut", "fin", "nature"],
    etat: "brouillon", envois30j: 0, derniereModification: "24/11/2026", auteur: "Systèmes d'information", langue: "Français",
  },
];

/* --- Journal des envois --------------------------------------------------- */
export interface Envoi {
  id: string; quand: string; canal: CanalModele; modele: string;
  destinataire: string; destination: string;
  etat: "délivré" | "envoyé" | "en attente" | "échec" | "lu";
  tentatives: number; cout: number; motif: string; declencheur: string;
}

const ETATS: Array<Envoi["etat"]> = ["délivré", "délivré", "délivré", "lu", "envoyé", "en attente", "échec"];
const MOTIFS_ECHEC = [
  "Adresse inexistante (rebond dur)",
  "Boîte pleine (rebond souple)",
  "Numéro invalide",
  "Téléphone hors couverture",
  "Hors fenêtre de 24 heures",
  "Modèle non approuvé pour cette catégorie",
];

export const envois: Envoi[] = Array.from({ length: 140 }, (_, i) => {
  const m = choix(modelesMessages.filter((x) => x.etat === "approuvé"));
  const etat = choix(ETATS);
  const agent = choix(AGENTS_NOMS);
  return {
    id: "N-" + (60000 - i),
    quand: i === 0 ? "à l'instant" : `il y a ${Math.round(entre(1, 50)) + i * 7} min`,
    canal: m.canal,
    modele: m.nom,
    destinataire: agent,
    destination: m.canal === "Messagerie"
      ? agent.split(" ")[0][0].toLowerCase() + agent.split(" ")[1].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@exemple.org"
      : "+243 •• ••• •• " + String(Math.floor(entre(10, 99))),
    etat,
    tentatives: etat === "échec" ? Math.round(entre(2, 3)) : 1,
    cout: m.canal === "SMS" ? 0.021 : m.canal === "WhatsApp" ? 0.038 : 0,
    motif: etat === "échec" ? choix(MOTIFS_ECHEC) : "",
    declencheur: alea() < 0.7 ? "Automatique" : choix(AGENTS_NOMS),
  };
});
