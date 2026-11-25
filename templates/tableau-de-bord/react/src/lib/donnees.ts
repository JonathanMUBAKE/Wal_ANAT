/* =========================================================================
   DONNÉES SIMULÉES
   Remplacez ce module par vos appels réseau : les types ci-dessous sont le
   contrat que les vues attendent. Le tirage est déterministe (graine fixe)
   pour que deux ouvertures donnent la même page.
   ========================================================================= */

export type Gravite = "critique" | "serieux" | "vigilance";
export type EtatSante = "bon" | "vigilance" | "critique";
export type NiveauJournal = "ERREUR" | "ALERTE" | "INFO" | "DEBUG";

export interface Noeud {
  nom: string; role: string; region: string; version: string; duree: string;
  cpu: number; ram: number; disque: number; etat: EtatSante;
}
export interface Compte {
  id: string; nom: string; courriel: string; role: string; espace: string;
  statut: "actif" | "invite" | "suspendu";
  deuxFacteurs: boolean; sessions: number; derniere: number; cree: string;
}
export interface LigneJournal {
  id: number; horo: string; niveau: NiveauJournal; source: string; message: string; requete: string;
}
export interface Alerte {
  gravite: Gravite; titre: string; service: string; depuis: string; astreinte: string; code: string;
}
export interface EntreeAudit {
  horo: string; auteur: string; action: string; cible: string; origine: string; resultat: string;
}
export interface Notification {
  id: number; ton: "critique" | "vigilance" | "bon" | "neutre";
  titre: string; texte: string; quand: string; lu: boolean;
}
export interface Travail {
  nom: string; etat: "en cours" | "en attente" | "échoué"; fait: number; debit: string;
}
export interface Serie { nom: string; valeurs: number[]; couleur?: string; rampe?: number }

/* --- Tirage déterministe ------------------------------------------------ */
let graine = 20261125;
export const alea = () => (graine = (graine * 1664525 + 1013904223) % 4294967296) / 4294967296;
export const entre = (a: number, b: number) => a + alea() * (b - a);
export const choix = <T,>(t: readonly T[]): T => t[Math.floor(alea() * t.length)];

export function serie(n: number, base: number, amplitude: number): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += entre(-amplitude, amplitude);
    const heure = i % 24;
    const jour = 0.55 + 0.45 * Math.sin(((heure - 4) / 24) * Math.PI * 2);
    out.push(Math.max(0, Math.round(v * jour)));
  }
  return out;
}

export const HEURES = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00");

/* --- Séries de la vue d'ensemble ---------------------------------------- */
export const charge: Serie[] = [
  { nom: "Applicatif web", couleur: "--serie-1", valeurs: serie(24, 2400, 160) },
  { nom: "API publique", couleur: "--serie-2", valeurs: serie(24, 1500, 120) },
  { nom: "Traitements", couleur: "--serie-3", valeurs: serie(24, 620, 70) },
];
export const latence: Serie[] = [
  { nom: "p50", rampe: 2, valeurs: serie(24, 58, 5) },
  { nom: "p95", rampe: 4, valeurs: serie(24, 180, 16) },
  { nom: "p99", rampe: 5, valeurs: serie(24, 410, 42) },
];
export const parService = [
  { nom: "passerelle-api", v: 128400 }, { nom: "service-comptes", v: 96200 },
  { nom: "service-documents", v: 71800 }, { nom: "moteur-recherche", v: 54300 },
  { nom: "service-notifications", v: 38900 }, { nom: "service-export", v: 21400 },
];
export const parCode = [
  { nom: "2xx — succès", v: 412380 },
  { nom: "3xx — redirections", v: 28140 },
  { nom: "4xx — erreurs client", v: 9470 },
  { nom: "5xx — erreurs serveur", v: 1286 },
];
export const travaux: Travail[] = [
  { nom: "Indexation documentaire", etat: "en cours", fait: 68, debit: "1 240/min" },
  { nom: "Envoi des notifications", etat: "en cours", fait: 92, debit: "860/min" },
  { nom: "Export comptable mensuel", etat: "en attente", fait: 0, debit: "—" },
  { nom: "Purge des sessions expirées", etat: "échoué", fait: 41, debit: "arrêté" },
];

/* --- Flotte -------------------------------------------------------------- */
export const flotte: Noeud[] = ["web-01","web-02","web-03","api-01","api-02","trav-01","bdd-01","cache-01"]
  .map((nom, i) => {
    const cpu = Math.round(entre(12, 94)), ram = Math.round(entre(30, 92)), disque = Math.round(entre(20, 88));
    const pire = Math.max(cpu, ram, disque);
    return {
      nom,
      region: choix(["eu-ouest-1", "eu-ouest-3", "af-sud-1"]),
      role: nom.startsWith("bdd") ? "Base de données" : nom.startsWith("cache") ? "Cache"
        : nom.startsWith("api") ? "API" : nom.startsWith("trav") ? "Traitements" : "Web",
      cpu, ram, disque,
      etat: (pire > 90 ? "critique" : pire > 78 ? "vigilance" : "bon") as EtatSante,
      duree: Math.round(entre(3, 240)) + " j",
      version: `v${4 + (i % 2)}.${i % 7}.${i % 4}`,
    };
  });

/* --- Comptes -------------------------------------------------------------- */
const PRENOMS = ["Awa","Fabrice","Fatou","Moussa","Chantal","Idriss","Léa","Samuel","Nadia","Pierre","Aminata","Victor","Sarah","Oumar","Claire","Thomas","Rokia","Hugo","Mariam","Paul","Esther","Karim","Lucie","Daniel"];
const NOMS = ["Diallo","Mbaye","Traoré","Ndiaye","Kouassi","Bakayoko","Martin","Sow","Camara","Dubois","Cissé","Fall","Leroy","Diop","Bernard","Keita","Moreau","Touré","Rousseau","Barry"];
export const ROLES = ["Administrateur système","Administrateur","Gestionnaire","Opérateur","Analyste","Lecteur","Auditeur"];
export const ESPACES = ["Production","Recette","Bac à sable","Partenaires"];

export const comptes: Compte[] = Array.from({ length: 134 }, (_, i) => {
  const p = choix(PRENOMS), n = choix(NOMS);
  return {
    id: "U-" + String(1000 + i),
    nom: `${p} ${n}`,
    courriel: (p[0] + n).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") + "@exemple.org",
    role: choix(ROLES),
    espace: choix(ESPACES),
    statut: (alea() < 0.78 ? "actif" : alea() < 0.6 ? "invite" : "suspendu") as Compte["statut"],
    deuxFacteurs: alea() < 0.64,
    sessions: Math.round(entre(0, 6)),
    derniere: Math.round(entre(0, 72)),
    cree: new Date(Date.now() - Math.round(entre(20, 1200)) * 864e5).toISOString().slice(0, 10),
  };
});

/* --- Journaux -------------------------------------------------------------- */
const SOURCES = ["passerelle-api","service-comptes","service-documents","moteur-recherche","ordonnanceur","service-export"];
const MESSAGES: Record<NiveauJournal, string[]> = {
  ERREUR: ["échec de connexion à la base : délai dépassé après 5000 ms","réponse 500 renvoyée au client (requête abandonnée)","le lot d'export s'est interrompu : fichier source introuvable","la limite de débit du fournisseur externe est atteinte"],
  ALERTE: ["temps de réponse au-delà du seuil (p95 = 842 ms)","file d'attente au-dessus de 5 000 messages","certificat expirant dans 9 jours","reprise automatique après un échec isolé"],
  INFO: ["démarrage du service, 8 ouvriers prêts","déploiement terminé en 54 s","sauvegarde quotidienne écrite (4,2 Gio)","configuration rechargée sans interruption"],
  DEBUG: ["cache atteint pour la clé util:1042","requête SQL exécutée en 12 ms","trace émise vers le collecteur","verrou acquis sur la ressource lot-2048"],
};
let compteurJournal = 0;
export function ligneJournal(decalageSecondes = 0): LigneJournal {
  const r = alea();
  const niveau: NiveauJournal = r < 0.07 ? "ERREUR" : r < 0.2 ? "ALERTE" : r < 0.78 ? "INFO" : "DEBUG";
  return {
    id: ++compteurJournal,
    horo: new Date(Date.now() - decalageSecondes * 1000).toTimeString().slice(0, 8),
    niveau,
    source: choix(SOURCES),
    message: choix(MESSAGES[niveau]),
    requete: "req_" + Math.floor(alea() * 1e9).toString(36),
  };
}
export const journauxInitiaux: LigneJournal[] =
  Array.from({ length: 160 }, (_, i) => ligneJournal(160 - i));

/* --- Audit, alertes, notifications ----------------------------------------- */
const ACTIONS_AUDIT: Array<[string, string]> = [
  ["Suspension d'un compte", "utilisateur U-1042"], ["Modification des droits", "rôle Gestionnaire"],
  ["Création d'un jeton d'API", "jeton tok_7d21"], ["Redémarrage d'un service", "api-02"],
  ["Export de données", "134 comptes"], ["Connexion refusée", "2 facteurs invalide"],
  ["Restauration d'une sauvegarde", "bdd-01"], ["Mise en maintenance", "web-03"],
];
export const audit: EntreeAudit[] = Array.from({ length: 24 }, (_, i) => {
  const [action, cible] = choix(ACTIONS_AUDIT);
  return {
    horo: new Date(Date.now() - i * Math.round(entre(60, 900)) * 1000)
      .toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    auteur: `${choix(PRENOMS)} ${choix(NOMS)[0]}.`,
    action, cible,
    origine: [Math.floor(entre(10,200)), Math.floor(entre(0,255)), Math.floor(entre(0,255)), Math.floor(entre(1,254))].join("."),
    resultat: alea() < 0.88 ? "accepté" : "refusé",
  };
});

export const alertesInitiales: Alerte[] = [
  { gravite: "critique", titre: "Latence de la passerelle de paiement", service: "passerelle-api", depuis: "14 min", astreinte: "Awa K.", code: "INC-2048" },
  { gravite: "critique", titre: "Espace disque sous 8 % sur bdd-01", service: "bdd-01", depuis: "41 min", astreinte: "Moussa T.", code: "INC-2047" },
  { gravite: "serieux", titre: "Taux d'erreur 5xx au-dessus de 1 %", service: "service-documents", depuis: "1 h 12", astreinte: "Awa K.", code: "INC-2045" },
  { gravite: "vigilance", titre: "Certificat TLS expirant dans 9 jours", service: "passerelle-api", depuis: "3 h", astreinte: "—", code: "ALE-881" },
  { gravite: "vigilance", titre: "File de notifications au-dessus du seuil", service: "service-notifications", depuis: "22 min", astreinte: "—", code: "ALE-882" },
];

export const notificationsInitiales: Notification[] = [
  { id: 1, ton: "critique", titre: "Incident P1 ouvert", texte: "Latence de la passerelle de paiement · INC-2048", quand: "il y a 14 min", lu: false },
  { id: 2, ton: "vigilance", titre: "Seuil disque atteint", texte: "bdd-01 est sous 8 % d'espace libre", quand: "il y a 41 min", lu: false },
  { id: 3, ton: "bon", titre: "Déploiement réussi", texte: "service-comptes v4.2.1 en production", quand: "il y a 1 h", lu: true },
  { id: 4, ton: "neutre", titre: "Sauvegarde terminée", texte: "Instantané quotidien écrit (4,2 Gio)", quand: "il y a 3 h", lu: true },
];

/* --- Droits ---------------------------------------------------------------- */
export const rolesDroits = ["Administrateur système", "Administrateur", "Gestionnaire", "Opérateur", "Lecteur"];
export const permissions = [
  { groupe: "Comptes", nom: "Créer et inviter", cle: "comptes.creer" },
  { groupe: "Comptes", nom: "Suspendre et supprimer", cle: "comptes.suspendre" },
  { groupe: "Comptes", nom: "Réinitialiser les accès", cle: "comptes.acces" },
  { groupe: "Exploitation", nom: "Redémarrer un service", cle: "exploit.redemarrer" },
  { groupe: "Exploitation", nom: "Déployer en production", cle: "exploit.deployer" },
  { groupe: "Exploitation", nom: "Ouvrir une console", cle: "exploit.console" },
  { groupe: "Données", nom: "Exporter des données", cle: "donnees.exporter" },
  { groupe: "Données", nom: "Restaurer une sauvegarde", cle: "donnees.restaurer" },
  { groupe: "Sécurité", nom: "Modifier les rôles", cle: "secu.roles" },
  { groupe: "Sécurité", nom: "Lire le journal d'audit", cle: "secu.audit" },
];
export type EtatDroit = "aucun" | "lecture" | "complet";
export interface Case { etat: EtatDroit; verrou: boolean }

export const droitsInitiaux: Record<string, Case[]> = Object.fromEntries(
  permissions.map((p) => [
    p.cle,
    rolesDroits.map((r, i): Case => {
      if (i === 0) return { etat: "complet", verrou: true };
      if (r === "Lecteur") return { etat: p.cle === "secu.audit" ? "lecture" : "aucun", verrou: false };
      const n = alea();
      return { etat: n < 0.3 ? "aucun" : n < 0.65 ? "lecture" : "complet", verrou: false };
    }),
  ]),
);
