/* =========================================================================
   INFRASTRUCTURE — santé matérielle, système d'exploitation, base de données
   La forme des relevés suit ce que les contrôleurs d'administration des
   constructeurs exposent (Dell iDRAC, HPE iLO) : refroidissement, alimentation,
   mémoire, stockage, journal d'événements système. Les seuils de la base de
   données suivent les repères usuels de supervision PostgreSQL.
   Tout est simulé.
   ========================================================================= */

import { alea, choix, entre, serie } from "./donnees";

export type EtatMateriel = "bon" | "vigilance" | "critique" | "absent";

/* --- Capteurs : une mesure, deux seuils, un état ------------------------- */
export interface Capteur {
  nom: string; emplacement: string; valeur: number; unite: string;
  seuilVigilance: number; seuilCritique: number; etat: EtatMateriel;
}

function capteur(nom: string, emplacement: string, valeur: number, unite: string, sv: number, sc: number): Capteur {
  return {
    nom, emplacement, valeur, unite, seuilVigilance: sv, seuilCritique: sc,
    etat: valeur >= sc ? "critique" : valeur >= sv ? "vigilance" : "bon",
  };
}

export const temperatures: Capteur[] = [
  capteur("Entrée d'air", "Façade", Math.round(entre(19, 27)), "°C", 35, 42),
  capteur("Processeur 1", "Socle 1", Math.round(entre(48, 71)), "°C", 75, 88),
  capteur("Processeur 2", "Socle 2", Math.round(entre(46, 69)), "°C", 75, 88),
  capteur("Mémoire, zone A", "Barrettes 1-6", Math.round(entre(38, 54)), "°C", 62, 70),
  capteur("Mémoire, zone B", "Barrettes 7-12", Math.round(entre(37, 52)), "°C", 62, 70),
  capteur("Contrôleur de stockage", "Fente 3", Math.round(entre(44, 76)), "°C", 70, 82),
  capteur("Sortie d'air", "Arrière", Math.round(entre(32, 44)), "°C", 50, 58),
];

export interface Ventilateur {
  index: number; emplacement: string; vitesse: number; pourcentage: number;
  etat: EtatMateriel; redondance: boolean;
}
export const ventilateurs: Ventilateur[] = Array.from({ length: 6 }, (_, i) => {
  const panne = i === 4;
  const pourcentage = panne ? 0 : Math.round(entre(32, 78));
  return {
    index: i + 1,
    emplacement: `Baie ${i + 1} · ${i < 3 ? "avant" : "arrière"}`,
    vitesse: panne ? 0 : Math.round(pourcentage * 142),
    pourcentage,
    etat: panne ? "critique" : pourcentage > 72 ? "vigilance" : "bon",
    redondance: !panne,
  };
});

export interface Alimentation {
  index: number; modele: string; capacite: number; consommation: number;
  etat: EtatMateriel; entree: string; redondante: boolean;
}
export const alimentations: Alimentation[] = [
  { index: 1, modele: "Bloc redondant 1100 W", capacite: 1100, consommation: Math.round(entre(280, 460)), etat: "bon", entree: "Onduleur A · 230 V", redondante: true },
  { index: 2, modele: "Bloc redondant 1100 W", capacite: 1100, consommation: Math.round(entre(270, 450)), etat: "bon", entree: "Onduleur B · 230 V", redondante: true },
];

export interface Barrette {
  fente: string; capacite: number; type: string; frequence: number;
  etat: EtatMateriel; erreursCorrigees: number;
}
export const memoire: Barrette[] = Array.from({ length: 12 }, (_, i) => {
  const occupee = i < 8;
  const erreurs = i === 5 ? Math.round(entre(140, 420)) : Math.round(entre(0, 3));
  return {
    fente: `A${Math.floor(i / 4) + 1}-${(i % 4) + 1}`,
    capacite: occupee ? 32 : 0,
    type: occupee ? "DDR5 RDIMM" : "—",
    frequence: occupee ? 4800 : 0,
    etat: !occupee ? "absent" : erreurs > 100 ? "vigilance" : "bon",
    erreursCorrigees: occupee ? erreurs : 0,
  };
});

export interface DisquePhysique {
  baie: string; modele: string; capacite: string; type: string;
  etat: EtatMateriel; heures: number; reallouees: number; usure: number;
  temperature: number; grappe: string;
}
export const disquesPhysiques: DisquePhysique[] = [
  { baie: "0:1:0", modele: "SSD NVMe 1,92 To", capacite: "1,92 To", type: "NVMe", etat: "bon", heures: 18420, reallouees: 0, usure: 7, temperature: 41, grappe: "Grappe système" },
  { baie: "0:1:1", modele: "SSD NVMe 1,92 To", capacite: "1,92 To", type: "NVMe", etat: "bon", heures: 18420, reallouees: 0, usure: 8, temperature: 43, grappe: "Grappe système" },
  { baie: "0:1:2", modele: "SSD SAS 3,84 To", capacite: "3,84 To", type: "SAS", etat: "bon", heures: 22810, reallouees: 2, usure: 19, temperature: 38, grappe: "Grappe données" },
  { baie: "0:1:3", modele: "SSD SAS 3,84 To", capacite: "3,84 To", type: "SAS", etat: "vigilance", heures: 22810, reallouees: 164, usure: 23, temperature: 46, grappe: "Grappe données" },
  { baie: "0:1:4", modele: "SSD SAS 3,84 To", capacite: "3,84 To", type: "SAS", etat: "bon", heures: 22808, reallouees: 0, usure: 18, temperature: 39, grappe: "Grappe données" },
  { baie: "0:1:5", modele: "SSD SAS 3,84 To", capacite: "3,84 To", type: "SAS", etat: "bon", heures: 9140, reallouees: 0, usure: 4, temperature: 37, grappe: "Réserve dynamique" },
];

export interface GrappeRAID {
  nom: string; niveau: string; capacite: string; utilise: number;
  etat: EtatMateriel; disques: number; reserve: string;
  operation: { nom: string; avancement: number } | null;
  dernierControle: string;
}
export const grappes: GrappeRAID[] = [
  { nom: "Grappe système", niveau: "RAID 1", capacite: "1,92 To", utilise: 38, etat: "bon", disques: 2, reserve: "aucune", operation: null, dernierControle: "il y a 6 j" },
  { nom: "Grappe données", niveau: "RAID 5", capacite: "7,68 To", utilise: 71, etat: "vigilance", disques: 3, reserve: "0:1:5 (dynamique)", operation: { nom: "Contrôle de cohérence", avancement: 42 }, dernierControle: "en cours" },
];

/* --- Système d'exploitation --------------------------------------------- */
export const systeme = {
  hote: "sigrh-prod-01",
  modele: "Serveur lame 2 socles",
  numeroSerie: "XJ4K7P2",
  systeme: "Debian 13 · noyau 6.12",
  demarre: "il y a 1 sem. 3 j 15 h",
  processeurs: "2 × 16 cœurs (64 fils)",
  charge: [Number(entre(1.2, 6.4).toFixed(2)), Number(entre(1.4, 5.8).toFixed(2)), Number(entre(1.6, 4.9).toFixed(2))] as [number, number, number],
  memoireTotale: 256,
  memoireUtilisee: Number(entre(118, 196).toFixed(1)),
  memoireCache: Number(entre(28, 54).toFixed(1)),
  echange: Number(entre(0, 2.4).toFixed(2)),
  echangeTotal: 16,
  processeurUtilise: Math.round(entre(22, 78)),
  processeurAttenteES: Number(entre(0.4, 7.2).toFixed(1)),
  misesAJour: { total: 14, securite: 3, redemarrageRequis: true },
  horloge: { source: "ntp.exemple.org", ecart: Number(entre(-28, 28).toFixed(1)), unite: "ms" },
};

export const systemesFichiers = [
  { point: "/", peripherique: "/dev/mapper/sys-root", taille: 240, utilise: 91, type: "ext4" },
  { point: "/var", peripherique: "/dev/mapper/sys-var", taille: 480, utilise: 312, type: "ext4" },
  { point: "/var/lib/postgresql", peripherique: "/dev/mapper/data-pg", taille: 3200, utilise: 2944, type: "ext4" },
  { point: "/var/lib/documents", peripherique: "/dev/mapper/data-doc", taille: 3800, utilise: 1420, type: "xfs" },
  { point: "/boot", peripherique: "/dev/sda2", taille: 2, utilise: 0.7, type: "ext4" },
];

export const interfacesReseau = [
  { nom: "bond0", etat: "actif", debit: "2 × 25 Gb/s agrégés", entrant: Number(entre(120, 680).toFixed(0)), sortant: Number(entre(90, 540).toFixed(0)), erreurs: 0, rejets: 0 },
  { nom: "eno1", etat: "actif", debit: "25 Gb/s", entrant: Number(entre(60, 340).toFixed(0)), sortant: Number(entre(40, 270).toFixed(0)), erreurs: 0, rejets: 0 },
  { nom: "eno2", etat: "actif", debit: "25 Gb/s", entrant: Number(entre(60, 340).toFixed(0)), sortant: Number(entre(40, 270).toFixed(0)), erreurs: 14, rejets: 2 },
  { nom: "idrac", etat: "actif", debit: "1 Gb/s", entrant: 2, sortant: 1, erreurs: 0, rejets: 0 },
];

export const certificats = [
  { nom: "sigrh.exemple.org", emetteur: "Autorité interne", expire: "dans 212 jours", jours: 212, etat: "bon" as EtatMateriel },
  { nom: "api.sigrh.exemple.org", emetteur: "Autorité publique", expire: "dans 9 jours", jours: 9, etat: "vigilance" as EtatMateriel },
  { nom: "Contrôleur d'administration", emetteur: "Autogéré", expire: "dans 1 480 jours", jours: 1480, etat: "bon" as EtatMateriel },
];

export interface EvenementMateriel {
  horo: string; gravite: "bon" | "vigilance" | "critique"; source: string; message: string; code: string;
}
export const journalMateriel: EvenementMateriel[] = [
  { horo: "25/11 14:02", gravite: "critique", source: "Refroidissement", message: "Le ventilateur 5 ne tourne plus. La redondance de refroidissement est perdue.", code: "FAN0005" },
  { horo: "25/11 13:48", gravite: "vigilance", source: "Stockage", message: "Le disque 0:1:3 signale 164 secteurs réalloués. Remplacement conseillé.", code: "PDR1016" },
  { horo: "25/11 11:20", gravite: "vigilance", source: "Mémoire", message: "Erreurs corrigées répétées sur la barrette A2-2.", code: "MEM0701" },
  { horo: "25/11 09:04", gravite: "bon", source: "Alimentation", message: "Retour du secteur sur l'onduleur B. Redondance rétablie.", code: "PSU0164" },
  { horo: "24/11 22:11", gravite: "critique", source: "Alimentation", message: "Perte d'entrée secteur sur l'onduleur B. Bascule sur batterie.", code: "PSU0163" },
  { horo: "24/11 03:00", gravite: "bon", source: "Stockage", message: "Contrôle de cohérence terminé sur la grappe système, sans écart.", code: "VDR0101" },
  { horo: "22/11 16:40", gravite: "bon", source: "Micrologiciel", message: "Mise à jour du contrôleur d'administration appliquée.", code: "UEFI0107" },
];

export const chargeHistorique = {
  processeur: serie(24, 46, 9),
  memoire: serie(24, 62, 5),
  entreeSortie: serie(24, 28, 11),
};

/* =========================================================================
   BASE DE DONNÉES
   ========================================================================= */
export const baseInfo = {
  moteur: "PostgreSQL 17.2",
  role: "Primaire",
  taille: "2,87 Tio",
  demarree: "il y a 38 j",
  connexionsMax: 400,
  version: "17.2 (Debian 17.2-1)",
  encodage: "UTF8",
  fuseau: "Africa/Kinshasa",
};

export const connexions = {
  actives: Math.round(entre(40, 120)),
  inactives: Math.round(entre(60, 140)),
  inactivesTransaction: Math.round(entre(0, 18)),
  enAttente: Math.round(entre(0, 9)),
  reservees: 6,
};

export interface RequeteLente {
  id: string; requete: string; appels: number; tempsMoyen: number; tempsTotal: number;
  lignesMoyennes: number; cacheRatio: number; base: string; utilisateur: string;
}
export const requetesLentes: RequeteLente[] = [
  { id: "q1", requete: "SELECT * FROM presences p JOIN agents a ON a.id = p.agent_id WHERE p.jour BETWEEN $1 AND $2", appels: 184200, tempsMoyen: 1842, tempsTotal: 339_300, lignesMoyennes: 4120, cacheRatio: 72.4, base: "sigrh", utilisateur: "sigrh_app" },
  { id: "q2", requete: "SELECT count(*) FROM documents WHERE to_tsvector('french', contenu) @@ plainto_tsquery($1)", appels: 9400, tempsMoyen: 2940, tempsTotal: 27_636, lignesMoyennes: 1, cacheRatio: 41.8, base: "sigrh", utilisateur: "sigrh_recherche" },
  { id: "q3", requete: "UPDATE soldes_conges SET restant = restant - $1 WHERE agent_id = $2", appels: 412_800, tempsMoyen: 62, tempsTotal: 25_594, lignesMoyennes: 1, cacheRatio: 99.1, base: "sigrh", utilisateur: "sigrh_app" },
  { id: "q4", requete: "SELECT direction_id, count(*) FROM agents GROUP BY direction_id", appels: 72_400, tempsMoyen: 284, tempsTotal: 20_562, lignesMoyennes: 8, cacheRatio: 98.4, base: "sigrh", utilisateur: "sigrh_rapports" },
  { id: "q5", requete: "INSERT INTO journal_audit (auteur, action, cible, origine) VALUES ($1, $2, $3, $4)", appels: 1_284_000, tempsMoyen: 4, tempsTotal: 5_136, lignesMoyennes: 1, cacheRatio: 99.8, base: "sigrh", utilisateur: "sigrh_app" },
  { id: "q6", requete: "VACUUM ANALYZE pointages", appels: 96, tempsMoyen: 42_100, tempsTotal: 4_041, lignesMoyennes: 0, cacheRatio: 64.2, base: "sigrh", utilisateur: "postgres" },
];

export interface Verrou {
  bloqueur: string; bloqueurRequete: string; bloque: string; bloqueRequete: string;
  attente: string; relation: string; mode: string;
}
export const verrous: Verrou[] = [
  { bloqueur: "pid 24180", bloqueurRequete: "UPDATE soldes_conges SET …", bloque: "pid 24412", bloqueRequete: "SELECT … FOR UPDATE", attente: "4 min 12", relation: "soldes_conges", mode: "RowExclusiveLock" },
  { bloqueur: "pid 24180", bloqueurRequete: "UPDATE soldes_conges SET …", bloque: "pid 24590", bloqueRequete: "UPDATE soldes_conges SET …", attente: "3 min 48", relation: "soldes_conges", mode: "RowExclusiveLock" },
];

export interface TableBase {
  nom: string; lignes: number; taille: string; index: string;
  tuplesMorts: number; ratioMorts: number; dernierVacuum: string; dernierAnalyze: string;
}
export const tables: TableBase[] = [
  { nom: "pointages", lignes: 184_200_000, taille: "1,42 Tio", index: "412 Gio", tuplesMorts: 48_200_000, ratioMorts: 26.2, dernierVacuum: "il y a 9 j", dernierAnalyze: "il y a 2 j" },
  { nom: "journal_audit", lignes: 92_400_000, taille: "684 Gio", index: "128 Gio", tuplesMorts: 1_200_000, ratioMorts: 1.3, dernierVacuum: "il y a 1 j", dernierAnalyze: "il y a 1 j" },
  { nom: "documents", lignes: 1_840_000, taille: "412 Gio", index: "86 Gio", tuplesMorts: 240_000, ratioMorts: 13.0, dernierVacuum: "il y a 4 j", dernierAnalyze: "il y a 1 j" },
  { nom: "presences", lignes: 42_800_000, taille: "184 Gio", index: "62 Gio", tuplesMorts: 980_000, ratioMorts: 2.3, dernierVacuum: "il y a 1 j", dernierAnalyze: "il y a 12 h" },
  { nom: "agents", lignes: 412, taille: "4,2 Mio", index: "1,8 Mio", tuplesMorts: 14, ratioMorts: 3.4, dernierVacuum: "il y a 6 h", dernierAnalyze: "il y a 6 h" },
  { nom: "soldes_conges", lignes: 412, taille: "2,1 Mio", index: "0,9 Mio", tuplesMorts: 188, ratioMorts: 45.6, dernierVacuum: "il y a 14 j", dernierAnalyze: "il y a 14 j" },
];

export const replication = {
  mode: "Flux asynchrone",
  secondaires: [
    { nom: "sigrh-prod-02", role: "Secondaire chaud", etat: "bon" as EtatMateriel, retard: 1.4, retardOctets: "2,1 Mio", lieu: "Site de secours" },
    { nom: "sigrh-prod-03", role: "Secondaire de lecture", etat: "vigilance" as EtatMateriel, retard: 48.2, retardOctets: "1,8 Gio", lieu: "Antenne provinciale" },
  ],
  emplacements: [
    { nom: "secours_01", actif: true, retenu: "2,1 Mio", risque: false },
    { nom: "lecture_02", actif: true, retenu: "1,8 Gio", risque: false },
    { nom: "ancien_export", actif: false, retenu: "412 Gio", risque: true },
  ],
};

export const metriquesBase = {
  transactions: serie(24, 1840, 220),
  cacheRatio: Number(entre(97.8, 99.6).toFixed(2)),
  lecturesDisque: serie(24, 420, 90),
  tempsMoyen: serie(24, 12, 4),
};

export const sessionsBase = Array.from({ length: 14 }, (_, i) => ({
  pid: 24000 + i * 23,
  utilisateur: choix(["sigrh_app", "sigrh_rapports", "sigrh_recherche", "postgres"]),
  base: "sigrh",
  client: `10.${Math.floor(entre(0, 20))}.${Math.floor(entre(0, 255))}.${Math.floor(entre(2, 254))}`,
  etat: choix(["active", "idle", "idle in transaction", "active", "active"]),
  depuis: Math.round(entre(1, 980)) + " s",
  attente: alea() < 0.2 ? "Lock" : "—",
  requete: choix([
    "SELECT * FROM presences WHERE …",
    "UPDATE soldes_conges SET …",
    "INSERT INTO journal_audit …",
    "SELECT count(*) FROM documents …",
    "COMMIT",
  ]),
}));
