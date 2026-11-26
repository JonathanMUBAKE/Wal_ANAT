/* =========================================================================
   Contrôles — le registre de ce que l'outil permet, et à quel prix.

   Le principe : rien ne se fait sans contrôle. Pas « rien ne se fait sans
   permission » — une permission dit qui peut, elle ne dit pas ce qu'il faut
   traverser pour le faire. Un geste destructeur qui se déclenche d'un clic
   est une permission accordée sans contrôle.

   Chaque geste que l'outil permet déclare donc six choses, et elles se
   lisent sur un seul écran :
     1. son effet (lire, écrire, détruire, configurer, envoyer, exécuter) ;
     2. le niveau de contrôle qu'il faut traverser ;
     3. qui peut le déclencher ;
     4. s'il est journalisé — et un geste non journalisé n'existe pas ;
     5. s'il se défait, et dans quel délai ;
     6. pourquoi ce niveau a été retenu.

   Un geste qui détruit sans double regard, ou qui n'est pas journalisé, est
   un défaut de l'outil, pas une préférence de l'administrateur. L'écran le
   dit en ces termes.
   ========================================================================= */

/* --- Les niveaux, du plus léger au plus lourd -------------------------- */
export type NiveauControle = "libre" | "confirmation" | "mot" | "double" | "quorum" | "interdit";

export const NIVEAUX: Record<NiveauControle, {
  nom: string;
  rang: number;
  /** Ce que l'opérateur traverse, dit à l'opérateur. */
  traverse: string;
  ton: "neutre" | "accent" | "vigilance" | "serieux" | "critique";
}> = {
  libre: {
    nom: "libre", rang: 0, ton: "neutre",
    traverse: "Le geste part au clic. Il est journalisé, rien de plus.",
  },
  confirmation: {
    nom: "confirmation", rang: 1, ton: "accent",
    traverse: "Une question posée en toutes lettres, qui dit la conséquence avant de dire le bouton.",
  },
  mot: {
    nom: "mot à retaper", rang: 2, ton: "vigilance",
    traverse: "Un mot à retaper à la main. On ne retape pas un mot par inadvertance.",
  },
  double: {
    nom: "double regard", rang: 3, ton: "serieux",
    traverse: "Un second agent, qui n'est pas le demandeur, approuve avant exécution.",
  },
  quorum: {
    nom: "quorum de deux", rang: 4, ton: "critique",
    traverse: "Deux approbateurs distincts, aucun n'étant le demandeur.",
  },
  interdit: {
    nom: "interdit", rang: 5, ton: "critique",
    traverse: "Le geste n'existe pas dans l'outil. Il se fait ailleurs, par d'autres mains.",
  },
};

export type EffetGeste = "lecture" | "écriture" | "destruction" | "configuration" | "envoi" | "exécution";

/** Le plancher exigé par effet : en dessous, l'outil est en défaut. */
export const PLANCHER: Record<EffetGeste, NiveauControle> = {
  lecture: "libre",
  écriture: "confirmation",
  configuration: "confirmation",
  envoi: "confirmation",
  exécution: "mot",
  destruction: "double",
};

export interface Geste {
  id: string;
  nom: string;
  module: string;
  effet: EffetGeste;
  niveau: NiveauControle;
  /** Qui peut le déclencher. Vide : personne, le geste est fermé. */
  roles: string[];
  journalise: boolean;
  /** « oui » se défait d'un clic, « fenêtre » dans un délai, « non » jamais. */
  reversible: "oui" | "fenêtre" | "non";
  /** Fenêtre de rétractation, quand elle existe. */
  fenetre?: string;
  /** Délai de réflexion imposé entre l'approbation et l'exécution. */
  delai?: string;
  usages30j: number;
  dernier: string;
  /** Pourquoi ce niveau. C'est la colonne qu'on relit dans six mois. */
  note: string;
  /* Écart assumé : le geste reste sous le plancher de son effet, mais
     quelqu'un l'a signé, daté, et a fixé la date à laquelle on y revient.
     Sans cela, un registre finit par afficher vingt défauts que plus
     personne ne regarde — et le vrai défaut se cache parmi eux. */
  ecart?: { motif: string; signePar: string; le: string; revoirLe: string };
}

/** Le geste atteint-il le plancher de son effet ? */
export function auPlancher(g: Geste): boolean {
  return NIVEAUX[g.niveau].rang >= NIVEAUX[PLANCHER[g.effet]].rang;
}

/** Conforme : au plancher, ou en dessous mais avec un écart signé. Et
    journalisé dans tous les cas — aucune signature ne rachète une trace
    manquante. */
export function conforme(g: Geste): boolean {
  return g.journalise && (auPlancher(g) || Boolean(g.ecart));
}

/** Sous le plancher, mais assumé par écrit. Ni un défaut, ni rien. */
export function ecartAssume(g: Geste): boolean {
  return !auPlancher(g) && Boolean(g.ecart);
}

/** Ce qui manque, dit en une phrase à l'opérateur. */
export function manque(g: Geste): string | null {
  if (!g.journalise) return "Le geste n'est pas journalisé : il se fait sans laisser de trace.";
  if (g.ecart) return null;
  const p = PLANCHER[g.effet];
  if (NIVEAUX[g.niveau].rang < NIVEAUX[p].rang)
    return `Un geste de type « ${g.effet} » demande au minimum « ${NIVEAUX[p].nom} ». Celui-ci est en « ${NIVEAUX[g.niveau].nom} ».`;
  return null;
}

export const gestes: Geste[] = [
  /* --- Accès ---------------------------------------------------------- */
  { id: "G-001", nom: "Consulter la liste des utilisateurs", module: "Accès", effet: "lecture",
    niveau: "libre", roles: ["Administrateur", "Exploitant", "Lecteur", "Audit"], journalise: true,
    reversible: "oui", usages30j: 1842, dernier: "il y a 2 min",
    note: "Une lecture reste libre, mais elle est journalisée : savoir qui a consulté quel dossier a déjà servi." },
  { id: "G-002", nom: "Créer un compte", module: "Accès", effet: "écriture",
    niveau: "confirmation", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 31, dernier: "hier, 16:40",
    note: "Le compte créé n'a aucun droit tant qu'un rôle ne lui est pas attribué — la création seule n'ouvre rien." },
  { id: "G-003", nom: "Attribuer le rôle Administrateur", module: "Accès", effet: "configuration",
    niveau: "double", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 2, dernier: "il y a 11 jours",
    note: "C'est le seul geste de l'outil qui fabrique quelqu'un capable de tout. Un administrateur ne s'en fabrique pas un deuxième seul." },
  { id: "G-004", nom: "Supprimer un compte", module: "Accès", effet: "destruction",
    niveau: "quorum", roles: ["Administrateur"], journalise: true, reversible: "fenêtre",
    fenetre: "30 jours", delai: "1 heure", usages30j: 1, dernier: "il y a 19 jours",
    note: "La suppression efface aussi l'historique du compte. Le quorum et l'heure de réflexion ont été ajoutés après un départ réglé un vendredi soir." },
  { id: "G-005", nom: "Révoquer une session", module: "Accès", effet: "exécution",
    niveau: "confirmation", roles: ["Administrateur", "Exploitant"], journalise: true,
    reversible: "non", usages30j: 24, dernier: "il y a 3 h",
    note: "Déconnecter quelqu'un est brusque mais sans dégât : il se reconnecte. C'est le geste à faire vite après une fuite de mot de passe.",
    ecart: { motif: "Déconnecter quelqu'un ne détruit rien : il se reconnecte. Le geste doit rester rapide, c'est le premier réflexe après une fuite de mot de passe.",
      signePar: "Awa Diallo", le: "4 septembre 2026", revoirLe: "4 mars 2027" } },
  { id: "G-006", nom: "Désactiver le deuxième facteur d'un agent", module: "Accès", effet: "configuration",
    niveau: "double", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 4, dernier: "il y a 6 jours",
    note: "Le prétexte est toujours le même — « j'ai changé de téléphone » — et c'est aussi le prétexte de celui qui appelle en se faisant passer pour un agent." },

  { id: "G-007", nom: "Désactiver un compte dormant", module: "Accès", effet: "configuration",
    niveau: "confirmation", roles: ["Administrateur"], journalise: true, reversible: "fenêtre",
    fenetre: "30 jours", usages30j: 6, dernier: "il y a 26 jours",
    note: "La désactivation ne détruit rien et se défait d'un clic pendant trente jours. Ce qui est contrôlé ici, c'est la vague : la politique propose, elle ne coupe pas. La confirmation dit les droits conservés et les dossiers laissés sans propriétaire." },
  { id: "G-008", nom: "Exempter un compte de la politique de dormance", module: "Accès", effet: "configuration",
    niveau: "double", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 1, dernier: "il y a 9 jours",
    note: "Une exemption rend un compte invisible à la politique : c'est exactement ce que chercherait quelqu'un qui veut garder un accès oublié. Elle exige un motif, un signataire et une date de revue, faute de quoi l'écran la refuse." },
  { id: "G-009", nom: "Clôturer un compte dormant depuis six mois", module: "Accès", effet: "destruction",
    niveau: "quorum", roles: ["Administrateur"], journalise: true, reversible: "fenêtre",
    fenetre: "30 jours", delai: "1 heure", usages30j: 1, dernier: "il y a 56 jours",
    note: "La clôture sort le compte du référentiel actif et laisse ses dossiers sans propriétaire. Le repreneur se nomme avant la coupure, jamais après — c'est la leçon d'un départ réglé un vendredi soir." },

  /* --- Données -------------------------------------------------------- */
  { id: "G-010", nom: "Exporter un jeu de données", module: "Base de données", effet: "lecture",
    niveau: "confirmation", roles: ["Administrateur", "Exploitant", "Audit"], journalise: true,
    reversible: "non", usages30j: 58, dernier: "il y a 40 min",
    note: "Une donnée exportée sort de l'outil et de ses contrôles. La confirmation nomme le nombre de lignes et les colonnes personnelles emportées." },
  { id: "G-011", nom: "Exécuter une requête en écriture", module: "Base de données", effet: "exécution",
    niveau: "mot", roles: ["Administrateur"], journalise: true, reversible: "non",
    usages30j: 7, dernier: "il y a 2 jours",
    note: "La console refuse toute requête sans clause de restriction, et affiche le nombre de lignes touchées avant d'exécuter." },
  { id: "G-012", nom: "Appliquer une migration de schéma", module: "Base de données", effet: "exécution",
    niveau: "double", roles: ["Administrateur"], journalise: true, reversible: "fenêtre",
    fenetre: "le temps du retour arrière", delai: "15 minutes", usages30j: 3, dernier: "il y a 8 jours",
    note: "Toute migration arrive avec son retour arrière écrit et testé, sinon elle est refusée à l'entrée." },
  { id: "G-013", nom: "Supprimer une table", module: "Base de données", effet: "destruction",
    niveau: "interdit", roles: [], journalise: true, reversible: "non",
    usages30j: 0, dernier: "jamais",
    note: "Le geste a été retiré de l'outil. Une table se supprime par une migration relue, pas depuis un écran d'administration." },
  { id: "G-014", nom: "Restaurer une sauvegarde", module: "Sauvegardes", effet: "exécution",
    niveau: "quorum", roles: ["Administrateur"], journalise: true, reversible: "non",
    delai: "30 minutes", usages30j: 0, dernier: "il y a 4 mois",
    note: "Restaurer, c'est perdre tout ce qui a été saisi depuis. Le délai sert à prévenir les directions avant la coupure." },
  { id: "G-015", nom: "Purger les journaux", module: "Observabilité", effet: "destruction",
    niveau: "interdit", roles: [], journalise: true, reversible: "non",
    usages30j: 0, dernier: "jamais",
    note: "Un journal qu'un administrateur peut effacer ne prouve rien. La purge est automatique à l'échéance de conservation, et elle est elle-même journalisée." },

  /* --- Exploitation --------------------------------------------------- */
  { id: "G-020", nom: "Redémarrer un service", module: "Exploitation", effet: "exécution",
    niveau: "confirmation", roles: ["Administrateur", "Exploitant"], journalise: true,
    reversible: "non", usages30j: 46, dernier: "il y a 5 h",
    note: "La confirmation dit combien de requêtes sont en vol et combien d'agents sont connectés au service.",
    ecart: { motif: "Un service se redémarre quarante fois par mois. Un mot à retaper à chaque fois produirait un mot tapé sans le lire, ce qui ne protège plus rien.",
      signePar: "Ibrahima Ndiaye", le: "12 juin 2026", revoirLe: "12 décembre 2026" } },
  { id: "G-021", nom: "Mettre la plateforme en maintenance", module: "Exploitation", effet: "exécution",
    niveau: "mot", roles: ["Administrateur", "Exploitant"], journalise: true, reversible: "oui",
    usages30j: 2, dernier: "il y a 12 jours",
    note: "Tout le monde le voit, personne ne travaille pendant ce temps. Le mot à retaper est le nom de la plateforme." },
  { id: "G-022", nom: "Déployer en production", module: "Déploiements", effet: "exécution",
    niveau: "double", roles: ["Administrateur", "Exploitant"], journalise: true,
    reversible: "fenêtre", fenetre: "retour arrière en 90 s", usages30j: 18, dernier: "il y a 1 jour",
    note: "Le second regard n'est pas une relecture du code : c'est quelqu'un qui confirme que le moment est bon." },
  { id: "G-023", nom: "Rejouer une file d'attente", module: "Files d'attente", effet: "exécution",
    niveau: "confirmation", roles: ["Administrateur", "Exploitant"], journalise: true,
    reversible: "non", usages30j: 12, dernier: "il y a 7 h",
    note: "Rejouer peut envoyer deux fois le même message. La confirmation annonce combien de messages partiront en double.",
    ecart: { motif: "Le rejeu est borné : il ne peut porter que sur une file nommée, et l'écran annonce les doublons avant de partir.",
      signePar: "Ibrahima Ndiaye", le: "12 juin 2026", revoirLe: "12 décembre 2026" } },
  { id: "G-024", nom: "Vider une file d'attente", module: "Files d'attente", effet: "destruction",
    niveau: "mot", roles: ["Administrateur"], journalise: true, reversible: "non",
    usages30j: 1, dernier: "il y a 21 jours",
    note: "Les messages jetés ne reviennent pas. Le niveau devrait être « double regard » : c'est le défaut le plus ancien du registre." },

  /* --- Sécurité ------------------------------------------------------- */
  { id: "G-030", nom: "Bloquer une adresse IP", module: "Sécurité", effet: "configuration",
    niveau: "confirmation", roles: ["Administrateur", "Exploitant"], journalise: true,
    reversible: "oui", usages30j: 34, dernier: "il y a 25 min",
    note: "Un blocage se défait d'un clic, donc il reste léger. L'écran avertit quand l'adresse porte des agents connectés." },
  { id: "G-031", nom: "Mettre une adresse en liste blanche", module: "Sécurité", effet: "configuration",
    niveau: "double", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 3, dernier: "il y a 9 jours",
    note: "Une liste blanche désarme les détections pour cette adresse. C'est plus dangereux qu'un blocage, donc plus contrôlé." },
  { id: "G-032", nom: "Désactiver une règle de détection", module: "Sécurité", effet: "configuration",
    niveau: "double", roles: ["Administrateur"], journalise: true, reversible: "oui",
    delai: "aucun", usages30j: 2, dernier: "il y a 15 jours",
    note: "Couper une détection est le premier geste de qui veut passer inaperçu. Il est approuvé, journalisé, et rappelé chaque semaine tant qu'il dure." },
  { id: "G-033", nom: "Appliquer un correctif proposé par l'IA", module: "Anomalies", effet: "écriture",
    niveau: "double", roles: ["Administrateur", "Exploitant"], journalise: true,
    reversible: "fenêtre", fenetre: "retour arrière immédiat", usages30j: 9, dernier: "il y a 4 h",
    note: "L'IA propose, un humain décide. Le correctif est montré ligne par ligne, et le nom de l'approbateur est inscrit dans le journal, pas celui du modèle." },

  /* --- Intelligence --------------------------------------------------- */
  { id: "G-040", nom: "Appeler un outil MCP en lecture", module: "Connecteurs MCP", effet: "lecture",
    niveau: "libre", roles: ["Administrateur", "Exploitant", "Agent IA"], journalise: true,
    reversible: "oui", usages30j: 4120, dernier: "à l'instant",
    note: "Les outils de lecture sont séparés des outils d'écriture, précisément pour que ceux-ci restent libres." },
  { id: "G-041", nom: "Appeler un outil MCP en écriture", module: "Connecteurs MCP", effet: "écriture",
    niveau: "double", roles: ["Administrateur", "Exploitant"], journalise: true,
    reversible: "non", usages30j: 27, dernier: "il y a 1 h",
    note: "Un outil d'écriture appelé par un modèle agit au nom de l'Agence. Il attend une main humaine, toujours." },
  { id: "G-042", nom: "Approuver un nouvel outil MCP", module: "Connecteurs MCP", effet: "configuration",
    niveau: "double", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 3, dernier: "il y a 2 jours",
    note: "Un outil qui apparaît après coup dans un serveur arrive en « jamais approuvé » et reste inappelable jusqu'à ce qu'on le lise." },
  { id: "G-043", nom: "Modifier les instructions d'un agent IA", module: "Agents IA", effet: "configuration",
    niveau: "confirmation", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 14, dernier: "il y a 6 h",
    note: "Les garde-fous ne sont pas dans les instructions : les changer ne peut pas élargir ce que l'agent a le droit de faire." },
  { id: "G-044", nom: "Enregistrer une clé de modèle", module: "Modèles et clés", effet: "configuration",
    niveau: "mot", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 2, dernier: "il y a 16 jours",
    note: "La clé est écrite une fois et ne se relit jamais depuis l'outil — seuls ses quatre derniers caractères s'affichent." },

  /* --- Communication -------------------------------------------------- */
  { id: "G-050", nom: "Envoyer un message d'essai", module: "Communication", effet: "envoi",
    niveau: "libre", roles: ["Administrateur", "Exploitant"], journalise: true,
    reversible: "non", usages30j: 88, dernier: "il y a 30 min",
    note: "L'essai part sur le compte de celui qui le déclenche, jamais sur une adresse saisie à la main.",
    ecart: { motif: "L'essai part sur le compte de celui qui le déclenche, jamais sur une adresse saisie. Il n'atteint personne d'autre.",
      signePar: "Fatou Sow", le: "20 mars 2026", revoirLe: "20 mars 2027" } },
  { id: "G-051", nom: "Envoyer en masse à tous les agents", module: "Communication", effet: "envoi",
    niveau: "quorum", roles: ["Administrateur"], journalise: true, reversible: "non",
    delai: "20 minutes", usages30j: 2, dernier: "il y a 10 jours",
    note: "Mille deux cents personnes reçoivent le message et aucune ne peut le dépublier. Le délai de vingt minutes a déjà servi deux fois." },
  { id: "G-052", nom: "Modifier un modèle de message", module: "Communication", effet: "configuration",
    niveau: "confirmation", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 11, dernier: "hier",
    note: "Le modèle modifié repart à l'approbation du fournisseur avant de pouvoir servir — l'outil ne peut pas court-circuiter cela." },

  /* --- Système -------------------------------------------------------- */
  { id: "G-060", nom: "Modifier un paramètre général", module: "Système", effet: "configuration",
    niveau: "confirmation", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 19, dernier: "il y a 1 jour",
    note: "Chaque paramètre garde sa valeur précédente : le journal d'audit montre l'avant et l'après côte à côte." },
  { id: "G-061", nom: "Créer un jeton d'API", module: "Accès", effet: "configuration",
    niveau: "mot", roles: ["Administrateur"], journalise: true, reversible: "oui",
    usages30j: 6, dernier: "il y a 3 jours",
    note: "Le jeton naît avec une portée étroite et une échéance. Un jeton sans échéance est refusé par l'écran." },
  { id: "G-062", nom: "Changer le niveau de contrôle d'un geste", module: "Contrôles", effet: "configuration",
    niveau: "quorum", roles: ["Administrateur"], journalise: true, reversible: "oui",
    delai: "24 heures", usages30j: 1, dernier: "il y a 27 jours",
    note: "Le registre se protège lui-même : abaisser un contrôle demande deux approbateurs et un jour d'attente, pour que la baisse se voie avant de prendre effet." },
  { id: "G-063", nom: "Désactiver la journalisation d'un geste", module: "Contrôles", effet: "configuration",
    niveau: "interdit", roles: [], journalise: true, reversible: "oui",
    usages30j: 0, dernier: "jamais",
    note: "Rien dans l'outil ne peut éteindre une trace. C'est la seule garantie qui tient quand toutes les autres ont été contournées." },
];

/* =========================================================================
   La file d'attente : tout ce qui attend une main humaine, en un seul endroit.
   ========================================================================= */
export interface Approbation {
  id: string;
  objet: string;
  nature: "correctif" | "opération" | "appel MCP" | "suppression" | "accès" | "envoi" | "dépense" | "contrôle";
  geste: string;
  demandeur: string;
  /** Vrai quand c'est un modèle qui demande. Change ce qu'on vérifie. */
  parIA: boolean;
  quand: string;
  echeance: string;
  risque: "faible" | "moyen" | "élevé";
  requis: number;
  obtenus: number;
  /** Pourquoi le demandeur demande. Sans cela, on n'approuve pas. */
  justification: string;
  /** Ce qui change une fois approuvé, dit en toutes lettres. */
  consequence: string;
  reversible: "oui" | "fenêtre" | "non";
  pieces: Array<{ nom: string; detail: string }>;
  etat: "en attente" | "approuvée" | "refusée" | "expirée";
  /** Qui a déjà approuvé — sert à interdire le second avis du même. */
  avis: Array<{ qui: string; sens: "pour" | "contre"; motif: string; quand: string }>;
}

export const approbations: Approbation[] = [
  { id: "A-4812", objet: "Correctif : requête sans index sur la table des pointages", nature: "correctif",
    geste: "G-033", demandeur: "Assistant d'exploitation", parIA: true,
    quand: "il y a 12 min", echeance: "dans 3 h 48", risque: "moyen", requis: 1, obtenus: 0,
    justification: "La requête de l'écran Pointages parcourt 2,1 millions de lignes à chaque ouverture. L'index proposé porte sur (agent_id, jour) et ramène le temps de réponse de 4,2 s à 40 ms sur l'échantillon.",
    consequence: "La création de l'index verrouille la table en écriture pendant environ 11 secondes. Les pointages saisis pendant ce temps sont mis en attente, aucun n'est perdu.",
    reversible: "oui",
    pieces: [
      { nom: "Plan d'exécution avant", detail: "Seq Scan sur pointages — coût 184 200, 2 140 118 lignes" },
      { nom: "Plan d'exécution après", detail: "Index Scan using idx_pointages_agent_jour — coût 412" },
      { nom: "Retour arrière", detail: "DROP INDEX idx_pointages_agent_jour — immédiat" },
    ],
    etat: "en attente", avis: [] },

  { id: "A-4811", objet: "Appel MCP en écriture : créer 14 fiches d'agent depuis le fichier de la DRH", nature: "appel MCP",
    geste: "G-041", demandeur: "Agent d'enrôlement", parIA: true,
    quand: "il y a 38 min", echeance: "dans 2 h 22", risque: "élevé", requis: 1, obtenus: 0,
    justification: "Le fichier des quatorze recrutements de novembre a été déposé par la DRH. L'agent a lu le fichier, vérifié que les quatorze matricules sont libres et que les pièces obligatoires sont présentes pour douze d'entre eux.",
    consequence: "Quatorze fiches sont créées, dont deux incomplètes qui resteront en brouillon. Les agents créés n'ont ni compte ni accès : l'enrôlement est un second geste, distinct.",
    reversible: "fenêtre",
    pieces: [
      { nom: "Fichier source", detail: "recrutements-novembre.xlsx — déposé par la DRH, 14 lignes" },
      { nom: "Fiches incomplètes", detail: "Matricules 4418 et 4423 — acte de nomination manquant" },
      { nom: "Vérification des doublons", detail: "aucun matricule déjà pris, aucun homonyme exact" },
    ],
    etat: "en attente", avis: [] },

  { id: "A-4810", objet: "Suppression du compte de Mamadou Bâ (départ à la retraite)", nature: "suppression",
    geste: "G-004", demandeur: "Awa Diallo", parIA: false,
    quand: "il y a 1 h", echeance: "dans 23 h", risque: "élevé", requis: 2, obtenus: 1,
    justification: "Départ à la retraite au 30 novembre. La direction des ressources humaines demande la clôture du compte et le transfert des dossiers en cours à la direction du patrimoine.",
    consequence: "Le compte est fermé et bascule en corbeille pour 30 jours. Les 4 dossiers encore ouverts à son nom passent sans propriétaire et apparaîtront dans la file de la direction du patrimoine.",
    reversible: "fenêtre",
    pieces: [
      { nom: "Dossiers à reprendre", detail: "4 dossiers ouverts, dont 1 avec échéance le 15 décembre" },
      { nom: "Sessions actives", detail: "aucune depuis 6 jours" },
      { nom: "Note de la DRH", detail: "arrêté de mise à la retraite du 4 novembre" },
    ],
    etat: "en attente",
    avis: [{ qui: "Fatou Sow", sens: "pour", motif: "Départ confirmé par la DRH, les dossiers sont repris par Ibrahima.", quand: "il y a 52 min" }] },

  { id: "A-4809", objet: "Désactivation de la règle « connexion depuis deux pays en une heure »", nature: "contrôle",
    geste: "G-032", demandeur: "Ibrahima Ndiaye", parIA: false,
    quand: "il y a 2 h", echeance: "dans 22 h", risque: "élevé", requis: 1, obtenus: 0,
    justification: "La mission de la direction régionale à Nouakchott déclenche l'alerte vingt fois par jour depuis lundi. La demande porte sur une suspension de dix jours, le temps de la mission.",
    consequence: "Pendant dix jours, une connexion depuis deux pays en une heure ne lèvera plus d'alerte — pour tout le monde, pas seulement pour la mission. C'est le scénario exact du vol d'identifiants.",
    reversible: "oui",
    pieces: [
      { nom: "Alertes concernées", detail: "61 alertes en 4 jours, dont 58 attribuées à la mission" },
      { nom: "Les 3 autres", detail: "2 agents en télétravail transfrontalier, 1 non expliquée" },
      { nom: "Autre voie possible", detail: "liste blanche sur les 6 adresses de la mission — portée bien plus étroite" },
    ],
    etat: "en attente", avis: [] },

  { id: "A-4808", objet: "Envoi en masse : note de service sur la fermeture de fin d'année", nature: "envoi",
    geste: "G-051", demandeur: "Fatou Sow", parIA: false,
    quand: "il y a 3 h", echeance: "dans 21 h", risque: "moyen", requis: 2, obtenus: 1,
    justification: "Note de service signée par la direction générale, à diffuser à l'ensemble des agents avant le 28 novembre.",
    consequence: "1 214 messages partent par messagerie et 1 180 par SMS. Aucun ne peut être rappelé une fois parti. Le coût des SMS est de 47 200 F CFA.",
    reversible: "non",
    pieces: [
      { nom: "Destinataires", detail: "1 214 agents actifs — les comptes fermés sont exclus" },
      { nom: "Modèle employé", detail: "note-de-service-v3 — approuvé le 12 novembre" },
      { nom: "Relecture", detail: "deux variables non remplies détectées puis corrigées" },
    ],
    etat: "en attente",
    avis: [{ qui: "Awa Diallo", sens: "pour", motif: "Texte conforme à la note signée, destinataires vérifiés.", quand: "il y a 2 h" }] },

  { id: "A-4807", objet: "Correctif : message d'erreur qui divulgue le nom de la base", nature: "correctif",
    geste: "G-033", demandeur: "Assistant de sécurité", parIA: true,
    quand: "il y a 5 h", echeance: "dans 19 h", risque: "faible", requis: 1, obtenus: 0,
    justification: "L'écran de dépôt de pièce renvoie la trace technique complète quand le fichier dépasse la taille autorisée : nom de la base, nom du schéma, chemin du serveur. Un visiteur non authentifié peut l'obtenir.",
    consequence: "Le message devient « Ce fichier dépasse la taille autorisée de 10 Mo. » La trace complète continue d'aller au journal, où elle a sa place.",
    reversible: "oui",
    pieces: [
      { nom: "Reproduction", detail: "dépôt d'un fichier de 12 Mo sur /pieces — trace visible dans la réponse" },
      { nom: "Occurrences", detail: "41 fois en 30 jours, dont 3 depuis l'extérieur du réseau" },
      { nom: "Diff proposé", detail: "4 lignes dans server/src/pieces/depot.ts" },
    ],
    etat: "en attente", avis: [] },

  { id: "A-4806", objet: "Déploiement 2026.11.4 en production", nature: "opération",
    geste: "G-022", demandeur: "Ibrahima Ndiaye", parIA: false,
    quand: "il y a 6 h", echeance: "dans 18 h", risque: "moyen", requis: 1, obtenus: 0,
    justification: "Onze corrections dont la mise en page des écrans sur téléphone et le blocage des avenants d'accords résiliés. Aucune migration de schéma.",
    consequence: "Bascule progressive sur les quatre serveurs, environ 3 minutes. Retour arrière disponible pendant 90 secondes après la bascule.",
    reversible: "fenêtre",
    pieces: [
      { nom: "Tests", detail: "780 tests passés, 72 fichiers — aucun ignoré" },
      { nom: "Écarts de dépendances", detail: "aucun" },
      { nom: "Fenêtre de changement", detail: "ouverte — mardi 25 novembre, 18 h à 22 h" },
    ],
    etat: "en attente", avis: [] },

  { id: "A-4813", objet: "Vague de novembre : désactiver 5 comptes sans activité depuis plus de 90 jours", nature: "accès",
    geste: "G-007", demandeur: "Politique de dormance", parIA: false,
    quand: "ce matin, 06:00", echeance: "dans 4 j", risque: "moyen", requis: 2, obtenus: 0,
    justification: "Cinq comptes dépassent le seuil de 90 jours sans activité reconnue. Tous ont été avertis, eux et leur responsable, et le préavis de 14 jours est écoulé. Trois autres comptes avertis se sont reconnectés depuis : ils sortent de la vague.",
    consequence: "Les cinq comptes passent en désactivé. Ils perdent 13 droits sensibles, dont trois droits d'ordonnancement et un droit d'administration système. Quatorze dossiers ouverts passent sans propriétaire et remontent dans la file de leur direction. La désactivation se défait d'un clic pendant 30 jours.",
    reversible: "fenêtre",
    pieces: [
      { nom: "Le plus lourd", detail: "Victor Dubois — administrateur système, 134 jours, 4 droits dont « déployer en production »" },
      { nom: "Session encore ouverte", detail: "Mamadou Bâ — 118 jours sans action, mais une session tient toujours" },
      { nom: "Sans deuxième facteur", detail: "Nadia Camara et Rokia Keita — droits de paie et d'enrôlement conservés" },
      { nom: "Repreneurs nommés", detail: "14 dossiers sur 14 — aucun ne restera sans propriétaire" },
      { nom: "Écartés par un garde-fou", detail: "4 comptes en absence déclarée (GF-16), hors vague" },
    ],
    etat: "en attente", avis: [] },

  { id: "A-4805", objet: "Blocage définitif de la plage 185.220.101.0/24", nature: "accès",
    geste: "G-030", demandeur: "Assistant de sécurité", parIA: true,
    quand: "hier, 22:14", echeance: "expirée", risque: "moyen", requis: 1, obtenus: 1,
    justification: "412 tentatives de connexion échouées en 20 minutes depuis 14 adresses de cette plage, toutes sur des comptes existants.",
    consequence: "La plage entière est bloquée. Aucun agent ne s'est jamais connecté depuis cette plage.",
    reversible: "oui",
    pieces: [{ nom: "Tentatives", detail: "412 échecs, 0 succès, 9 comptes visés" }],
    etat: "approuvée",
    avis: [{ qui: "Awa Diallo", sens: "pour", motif: "Aucun agent légitime sur cette plage, blocage réversible.", quand: "hier, 22:31" }] },

  { id: "A-4804", objet: "Vider la file « notifications » (18 400 messages en attente)", nature: "opération",
    geste: "G-024", demandeur: "Exploitation", parIA: false,
    quand: "hier, 15:02", echeance: "—", risque: "élevé", requis: 1, obtenus: 0,
    justification: "La file a gonflé pendant la panne du fournisseur SMS et bloque les envois suivants.",
    consequence: "18 400 notifications sont jetées sans être envoyées. Les agents concernés ne sauront jamais que leur congé a été validé.",
    reversible: "non",
    pieces: [
      { nom: "Composition de la file", detail: "14 200 rappels de pointage, 4 200 validations de congé" },
      { nom: "Autre voie possible", detail: "rejouer les 4 200 validations, jeter les rappels périmés" },
    ],
    etat: "refusée",
    avis: [{ qui: "Awa Diallo", sens: "contre", motif: "Les 4 200 validations de congé doivent partir. On trie, on ne vide pas.", quand: "hier, 15:40" }] },
];

/* =========================================================================
   Les garde-fous : ce qui refuse le geste avant même qu'il soit demandé.

   Un contrôle demande une main. Un garde-fou, lui, ne demande rien : il dit
   non. C'est ce qui évite les deux cents approbations qu'on finirait par
   signer sans lire.
   ========================================================================= */
export interface GardeFou {
  id: string;
  nom: string;
  famille: "fenêtre" | "gel" | "plafond" | "séparation" | "dépendance" | "liste" | "forme";
  /** Ce que la règle refuse, dit à l'opérateur. */
  regle: string;
  portee: string;
  actif: boolean;
  /** Qui peut passer outre, et à quel prix. Vide : personne. */
  derogation: string;
  blocages30j: number;
  dernier: string;
}

export const gardeFous: GardeFou[] = [
  { id: "GF-01", nom: "Fenêtre de changement", famille: "fenêtre", actif: true,
    regle: "Aucun déploiement ni migration entre 7 h et 18 h en semaine, ni le vendredi après 15 h.",
    portee: "Déploiements, migrations de schéma", derogation: "Quorum de deux, avec motif écrit",
    blocages30j: 14, dernier: "il y a 2 jours" },
  { id: "GF-02", nom: "Gel de fin de période", famille: "gel", actif: true,
    regle: "Du 20 au 31 de chaque mois, les écrans de paie et de pointage sont en lecture seule.",
    portee: "Paie, pointages", derogation: "Aucune — le gel se lève à l'échéance",
    blocages30j: 31, dernier: "il y a 4 h" },
  { id: "GF-03", nom: "Quatre yeux sur les destructions", famille: "séparation", actif: true,
    regle: "Le demandeur d'un geste destructeur ne peut jamais être l'un de ses approbateurs.",
    portee: "Tous les gestes de type destruction", derogation: "Aucune",
    blocages30j: 3, dernier: "il y a 6 jours" },
  { id: "GF-04", nom: "Plafond d'envois par heure", famille: "plafond", actif: true,
    regle: "Pas plus de 2 000 messages par heure, tous canaux confondus. Au-delà, l'envoi s'étale.",
    portee: "Communication", derogation: "Administrateur, avec confirmation",
    blocages30j: 2, dernier: "il y a 10 jours" },
  { id: "GF-05", nom: "Plafond de dépense d'inférence", famille: "plafond", actif: true,
    regle: "Au-delà de 180 000 F CFA par mois, les agents IA passent en lecture seule.",
    portee: "Agents IA, modèles", derogation: "Administrateur, avec quorum de deux",
    blocages30j: 0, dernier: "jamais atteint" },
  { id: "GF-06", nom: "Retour arrière obligatoire", famille: "dépendance", actif: true,
    regle: "Une migration sans script de retour arrière testé est refusée à l'entrée.",
    portee: "Base de données", derogation: "Aucune",
    blocages30j: 2, dernier: "il y a 8 jours" },
  { id: "GF-07", nom: "Jeton sans échéance", famille: "forme", actif: true,
    regle: "Un jeton d'API doit porter une échéance et une portée nommée. Sinon il n'est pas créé.",
    portee: "Jetons d'API", derogation: "Aucune",
    blocages30j: 5, dernier: "il y a 3 jours" },
  { id: "GF-08", nom: "Écriture sans clause de restriction", famille: "forme", actif: true,
    regle: "La console refuse toute requête d'écriture dépourvue de clause WHERE ou LIMIT.",
    portee: "Console de base de données", derogation: "Aucune",
    blocages30j: 7, dernier: "hier" },
  { id: "GF-09", nom: "Liste blanche des serveurs MCP", famille: "liste", actif: true,
    regle: "Un serveur MCP absent de la liste ne répond pas, même déclaré dans la configuration.",
    portee: "Connecteurs MCP", derogation: "Administrateur, avec double regard",
    blocages30j: 1, dernier: "il y a 12 jours" },
  { id: "GF-10", nom: "Outil MCP nouvellement apparu", famille: "dépendance", actif: true,
    regle: "Un outil qui apparaît dans un serveur déjà approuvé arrive en « jamais approuvé » et reste inappelable.",
    portee: "Connecteurs MCP", derogation: "Administrateur, avec double regard",
    blocages30j: 3, dernier: "il y a 2 jours" },
  { id: "GF-11", nom: "Délai de réflexion", famille: "fenêtre", actif: true,
    regle: "Les gestes qui portent un délai ne s'exécutent pas avant son terme, même approuvés.",
    portee: "Suppressions, restaurations, envois en masse", derogation: "Aucune",
    blocages30j: 4, dernier: "il y a 5 jours" },
  { id: "GF-12", nom: "Approbation expirée", famille: "fenêtre", actif: true,
    regle: "Une demande non tranchée dans son délai expire. Elle ne s'exécute pas par défaut.",
    portee: "Toute la file d'attente", derogation: "Aucune",
    blocages30j: 6, dernier: "il y a 1 jour" },
  { id: "GF-13", nom: "Second avis du même agent", famille: "séparation", actif: true,
    regle: "Un agent ne peut donner qu'un seul avis par demande, quel qu'en soit le sens.",
    portee: "Toute la file d'attente", derogation: "Aucune",
    blocages30j: 1, dernier: "il y a 14 jours" },
  { id: "GF-15", nom: "Exemption sans date de revue", famille: "forme", actif: true,
    regle: "Une exemption à la politique de dormance sans motif, signataire et date de revue est refusée à l'écriture.",
    portee: "Comptes dormants", derogation: "Aucune",
    blocages30j: 2, dernier: "il y a 9 jours" },
  { id: "GF-16", nom: "Dormance et absence déclarée", famille: "dépendance", actif: true,
    regle: "Un compte dont l'absence est déclarée au référentiel — congé long, détachement, mission — n'entre jamais dans une vague de désactivation.",
    portee: "Comptes dormants", derogation: "Aucune",
    blocages30j: 4, dernier: "il y a 3 jours" },
  { id: "GF-17", nom: "Coupure sans repreneur", famille: "dépendance", actif: true,
    regle: "Un compte qui porte des dossiers ouverts ne se clôture pas avant qu'un repreneur ait été nommé.",
    portee: "Comptes dormants, sorties d'agent", derogation: "Aucune",
    blocages30j: 3, dernier: "il y a 6 jours" },
  { id: "GF-14", nom: "Écriture MCP par un modèle seul", famille: "séparation", actif: false,
    regle: "Un modèle ne déclenche jamais un outil d'écriture sans qu'un humain ait approuvé l'appel.",
    portee: "Connecteurs MCP", derogation: "Aucune",
    blocages30j: 0, dernier: "règle désactivée le 18 novembre" },
];

/* --- Vues agrégées ----------------------------------------------------- */
export const CHIFFRES_CONTROLES = {
  get gestes() { return gestes.length; },
  get enDefaut() { return gestes.filter((g) => !conforme(g)).length; },
  get ecarts() { return gestes.filter((g) => ecartAssume(g)).length; },
  get fermes() { return gestes.filter((g) => g.niveau === "interdit").length; },
  get nonJournalises() { return gestes.filter((g) => !g.journalise).length; },
  get enAttente() { return approbations.filter((a) => a.etat === "en attente").length; },
  get parIA() { return approbations.filter((a) => a.etat === "en attente" && a.parIA).length; },
  get gardeFousActifs() { return gardeFous.filter((g) => g.actif).length; },
  get blocages30j() { return gardeFous.reduce((s, g) => s + g.blocages30j, 0); },
};

/** Répartition des gestes par niveau, pour le graphique du registre. */
export function repartitionNiveaux() {
  const ordre: NiveauControle[] = ["libre", "confirmation", "mot", "double", "quorum", "interdit"];
  return ordre.map((n) => ({ niveau: n, nom: NIVEAUX[n].nom, compte: gestes.filter((g) => g.niveau === n).length }));
}
