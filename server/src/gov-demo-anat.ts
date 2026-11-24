import { Gaps } from "./gaps.js";
import { anatLife } from "./gov-demo-anat-life.js";
import { Hr } from "./hr.js";
import type { Provisioning } from "./auth/provisioning.js";
import type { Services } from "./services.js";
import { PALETTE } from "./palette.js";

/*
 * Démonstration ANAT (ANAT_DEMO=1) : le contenu hérité du jeu générique (une start-up qui sort une application) devient
 * celui d'une agence d'aménagement du territoire, et les entités sont peuplées de chefs et d'agents fictifs dont le
 * profil correspond à la responsabilité. Tout est fictif ; tout se rejoue sans rien dupliquer (docs/ANALYSE-MODULES.md,
 * thème 7). Les tests gardent le jeu générique : seule la démonstration est transformée.
 */

/** Projets : [nom d'origine, nouveau nom, description]. */
const PROJECTS: [string, string, string][] = [
  [
    "Application mobile v2",
    "Système d'information géographique national",
    "Mise en place du SIG national de l'Agence : fonds de carte, données foncières des provinces, saisie de terrain hors connexion et tableaux de bord cartographiques. Objectif : mise en service avant la fin de l'année.",
  ],
  [
    "Campagne de lancement",
    "Campagne d'information sur le schéma national",
    "Faire connaître le schéma national d'aménagement aux provinces et au public : film institutionnel, presse, publications et relais provinciaux.",
  ],
  [
    "Refonte du site web",
    "Refonte du site institutionnel",
    "Nouveau site de l'Agence : missions, actualités, appels d'offres et espace documentaire des publications.",
  ],
  [
    "Plateforme de tests automatisés",
    "Numérisation des archives cartographiques",
    "Exemple fictif : numériser et indexer les cartes papier de l'Ingénierie territoriale, puis les relier au SIG national.",
  ],
];

/** Tâches et sous-tâches : [intitulé d'origine, nouvel intitulé, description (facultative)]. */
const TASKS: [string, string, string?][] = [
  // Système d'information géographique national
  [
    "Tests de non-régression iOS",
    "Contrôle qualité des couches cartographiques",
    "Vérification complète des couches foncière, routière et hydrographique des provinces pilotes.",
  ],
  ["Carte bancaire", "Couche foncière"],
  ["Apple Pay", "Couche routière"],
  ["Google Pay", "Couche hydrographique"],
  ["Wireframes", "Maquettes des écrans de saisie"],
  [
    "Bug : le panier se vide après mise en arrière-plan",
    "Anomalie : les relevés de terrain se perdent hors connexion",
    "Signalé par la Représentation provinciale Nord : sur tablette, les relevés saisis hors connexion disparaissent à la reprise du réseau.",
  ],
  [
    "Maquettes du nouveau parcours de paiement",
    "Maquettes du parcours de saisie terrain",
    "Écrans relevé → contrôle → envoi, cas d'erreur compris. Validées en revue de conception.",
  ],
  [
    "Intégrer le SDK de paiement",
    "Intégrer les fonds de carte de l'institut géographique",
    "Intégration des fonds de carte fournis par l'institut géographique : cadastre, routes et hydrographie.",
  ],
  ["Revue de sécurité du paiement", "Revue de sécurité des données foncières"],
  [
    "Définir l'architecture du mode hors ligne",
    "Définir l'architecture du mode hors connexion",
    "Choix de la stratégie de synchronisation des relevés de terrain et de résolution des conflits.",
  ],
  ["Accessibilité : contrastes et tailles de police dynamiques", "Lisibilité des cartes : légendes et contrastes"],
  ["Plan de test du mode hors ligne", "Plan de contrôle du mode hors connexion"],
  ["Écran tableau de bord personnalisé", "Tableau de bord cartographique par province"],
  ["Prototype animé", "Prototype interactif"],
  ["Instrumentation analytics du tunnel de paiement", "Statistiques d'utilisation du SIG"],
  ["Synchronisation hors ligne : file d'opérations", "Synchronisation des relevés de terrain"],
  ["Rédiger les notes de version", "Rédiger le guide d'utilisation"],
  ["Migration des comptes utilisateurs v1", "Reprise des données de l'ancien inventaire"],
  ["Icônes et illustrations de l'onboarding", "Symbologie et pictogrammes des cartes"],
  ["Préparer les fiches App Store et Play Store", "Préparer la formation des agents provinciaux"],
  // Campagne d'information sur le schéma national
  ["Brief créatif de la campagne", "Note de cadrage de la campagne"],
  ["Script de la vidéo de lancement", "Script du film institutionnel"],
  ["Storyboard vidéo", "Story-board du film institutionnel"],
  ["Liste des journalistes et influenceurs", "Liste des médias et relais provinciaux"],
  ["Budget média T4", "Budget de diffusion du quatrième trimestre"],
  ["Calendrier éditorial réseaux sociaux", "Calendrier des publications institutionnelles"],
  ["Visuels pour les stores", "Affiches pour les provinces"],
  ["Tableau de suivi des conversions", "Tableau de suivi de l'audience"],
  // Refonte du site institutionnel
  ["Design system web", "Charte graphique du site"],
  ["Page tarifs", "Page des appels d'offres"],
  ["Migration du blog", "Migration des actualités"],
  ["Centre d'aide : structure des articles", "Espace documentaire : classement des publications"],
  // RH · Recrutements 2027
  ["Fiche de poste : développeur·se mobile senior", "Fiche de poste : urbaniste-aménagiste principal"],
  // Numérisation des archives cartographiques
  ["Choisir l'outil de tests", "Choisir la solution de numérisation"],
  ["Écrire les premiers scénarios", "Numériser le premier lot de cartes"],
  ["Brancher la chaîne d'intégration", "Relier l'index des cartes au SIG national"],
  ["Former les développeurs", "Former les archivistes"],
  // Registres des entités (Suivi-évaluation, Ingénierie territoriale)
  ["Recenser les anomalies du trimestre", "Recenser les écarts du trimestre"],
  ["Rédiger la procédure de recette", "Rédiger la procédure de collecte des données"],
  ["Mettre à jour le plan de tests", "Mettre à jour le plan de suivi-évaluation"],
  ["Former l'équipe aux tests de charge", "Former les points focaux provinciaux"],
  ["Auditer les tests automatisés", "Auditer les indicateurs du plan de travail"],
  ["Préparer la revue qualité mensuelle", "Préparer la revue mensuelle de performance"],
  ["Consolider les indicateurs qualité", "Consolider les indicateurs de performance"],
  ["Vérifier la conformité d'accessibilité", "Vérifier la complétude des données provinciales"],
  ["Planifier la campagne de tests d'été", "Planifier les missions de suivi du premier trimestre"],
  ["Relire la charte de qualité", "Relire le manuel de suivi-évaluation"],
  ["Arbitrer le budget des licences", "Arbitrer le budget des missions de terrain"],
];

/** Étiquettes des tâches. */
const TAGS: Record<string, string> = {
  qa: "contrôle",
  bug: "anomalie",
  design: "conception",
  tech: "technique",
  paiement: "données",
  a11y: "lisibilité",
  data: "suivi",
  release: "déploiement",
  marketing: "formation",
  social: "médias",
  vidéo: "film",
};

const COMMENTS: [string, string][] = [
  [
    "J'attends toujours la clé sandbox du prestataire, relancé deux fois.",
    "J'attends toujours l'accès aux données de l'institut géographique, relancé deux fois.",
  ],
  ["Je m'en occupe avec leur account manager.", "Je m'en occupe avec leur directeur général."],
];

/** Équipes : [nom d'origine, nouveau nom, description]. Les équipes servent aux groupes transversaux. */
const TEAMS: [string, string, string][] = [
  [
    "Équipe Mobile",
    "Groupe projet SIG national",
    "Groupe transversal : Ingénierie territoriale, Cartographie et SIG, Suivi-évaluation.",
  ],
  [
    "Marketing",
    "Comité éditorial",
    "Publications, campagnes et relations avec la presse, avec les directions concernées.",
  ],
  ["Produit & Design", "Groupe de travail du site institutionnel", "Contenus et charte du site de l'Agence."],
  ["RH", "Comité de recrutement", "Confidentiel. Ouverture de postes, grilles et entretiens."],
];

const PLAN_ACTIVITIES: [string, string][] = [
  ["Audit de sécurité des applications", "Audit de sécurité du SIG national"],
];

/** Anciens noms d'entités encore présents dans des textes figés (historique du courrier, écarts). */
const OLD_NAMES: [string, string][] = [
  ["Direction Produit & Technologie", "Direction technique"],
  ["Direction Marketing", "Direction de la Communication et des Partenariats"],
  ["Nova Mobile", "ANAT (démonstration)"],
];

const AI: [string, string, string][] = [
  [
    "ai_atlas",
    "chargé de suivi IA : relances, points d'avancement, préparation de notes et de synthèses",
    "Rapports courts, en puces, retards et risques en premier. Quand tu relances quelqu'un, rappelle toujours l'échéance et propose ton aide. Ne change jamais une échéance sans le signaler.",
  ],
  [
    "ai_nova",
    "analyste IA des données : contrôle la complétude des données, signale les incohérences, prépare les synthèses",
    "Pour une anomalie : vérifie qu'elle précise la province, la couche ou le document concernés et ce qui est attendu ; sinon demande-le en commentaire. Fixe la priorité selon l'effet sur les provinces.",
  ],
];
const RULE =
  "Qualifie la nouvelle tâche : fixe une priorité selon l'effet sur les provinces. Si c'est une anomalie sans province ni couche précisée, demande-les en commentaire. Si un contrôle des données est nécessaire, mentionne @Gaston.";

/**
 * Personnes : les six d'origine et neuf ajoutées. [id, nom, courriel, fonction, couleur, entité de rattachement,
 * profil, civilité, statut, grade, date d'entrée].
 */
type Person = [string, string, string, string, string, string, string, string, string, string, string];
const PEOPLE: Person[] = [
  ["u_alice", "Bernadette Mbuyi", "", "Directrice générale", "", "Direction générale", "dg", "", "", "", ""],
  ["u_ines", "Esther Mukendi", "", "Assistante de direction", "", "Direction générale", "assistant_dg", "", "", "", ""],
  [
    "u_karim",
    "Fiston Banza",
    "",
    "Chef du département Ingénierie territoriale",
    "",
    "Ingénierie territoriale",
    "chef_entite",
    "",
    "",
    "",
    "",
  ],
  [
    "u_theo",
    "Gaston Kalala",
    "",
    "Chef du service Suivi-évaluation",
    "",
    "Suivi-évaluation",
    "chef_entite",
    "",
    "",
    "",
    "",
  ],
  ["u_chloe", "Clarisse Diala", "", "Chargée d'études", "", "Études et Prospective", "agent", "", "", "", ""],
  [
    "u_hugo",
    "Didier Lukusa",
    "",
    "Directeur de la Communication et des Partenariats",
    "",
    "Direction de la Communication et des Partenariats",
    "chef_entite",
    "",
    "",
    "",
    "",
  ],
  [
    "u_albert",
    "Albert Mwamba",
    "albert@cadence.app",
    "Directeur technique",
    PALETTE[5],
    "Direction technique",
    "chef_entite",
    "M.",
    "fonctionnaire",
    "Ingénieur général",
    "2010-03-15",
  ],
  [
    "u_cedric",
    "Cédric Ilunga",
    "cedric@cadence.app",
    "Responsable informatique (administrateur système)",
    PALETTE[1],
    "Direction technique",
    "informatique",
    "M.",
    "contractuel",
    "Ingénieur informaticien",
    "2019-06-03",
  ],
  [
    "u_jeanpierre",
    "Jean-Pierre Kabongo",
    "jean-pierre@cadence.app",
    "Chef du département Études et Prospective",
    PALETTE[2],
    "Études et Prospective",
    "chef_entite",
    "M.",
    "fonctionnaire",
    "Économiste principal",
    "2013-05-06",
  ],
  [
    "u_patrick",
    "Patrick Ilunga",
    "patrick@cadence.app",
    "Chef du service Cartographie et SIG",
    PALETTE[0],
    "Cartographie et SIG",
    "chef_entite",
    "M.",
    "fonctionnaire",
    "Ingénieur géomaticien",
    "2017-09-04",
  ],
  [
    "u_aimee",
    "Aimée Ngalula",
    "aimee@cadence.app",
    "Géomaticienne",
    PALETTE[6],
    "Cartographie et SIG",
    "agent",
    "Mme",
    "contractuel",
    "Attachée",
    "2022-02-01",
  ],
  [
    "u_samuel",
    "Samuel Kalonji",
    "samuel@cadence.app",
    "Chargé de suivi-évaluation",
    PALETTE[3],
    "Suivi-évaluation",
    "agent",
    "M.",
    "fonctionnaire",
    "Attaché",
    "2020-11-02",
  ],
  [
    "u_sylvie",
    "Sylvie Kasongo",
    "sylvie@cadence.app",
    "Cheffe du service des Ressources humaines",
    PALETTE[7],
    "Ressources humaines",
    "chef_entite",
    "Mme",
    "fonctionnaire",
    "Attachée principale",
    "2011-01-10",
  ],
  // Seconde gestionnaire RH : le dossier de la cheffe du service est tenu par une autre personne (contrôle croisé)
  [
    "u_mireille",
    "Mireille Ngoy",
    "mireille@cadence.app",
    "Gestionnaire des ressources humaines",
    PALETTE[6],
    "Ressources humaines",
    "agent",
    "Mme",
    "fonctionnaire",
    "Attachée",
    "2016-09-01",
  ],
  [
    "u_rose",
    "Rose Mbombo",
    "rose@cadence.app",
    "Cheffe du service Communication",
    PALETTE[5],
    "Communication",
    "chef_entite",
    "Mme",
    "fonctionnaire",
    "Attachée principale",
    "2016-07-18",
  ],
  [
    "u_joseph",
    "Joseph Tshibangu",
    "joseph@cadence.app",
    "Représentant provincial Nord",
    PALETTE[1],
    "Représentation provinciale Nord (exemple)",
    "chef_entite",
    "M.",
    "fonctionnaire",
    "Administrateur civil",
    "2014-04-22",
  ],
  [
    "u_prisca",
    "Prisca Kanku",
    "prisca@cadence.app",
    "Cheffe de l'Antenne Sud",
    PALETTE[4],
    "Antenne Sud (exemple)",
    "chef_entite",
    "Mme",
    "fonctionnaire",
    "Administratrice civile",
    "2015-10-12",
  ],
];

/** Chef de chaque entité. */
const CHIEFS: [string, string][] = [
  ["ANAT (démonstration)", "u_alice"],
  ["Direction générale", "u_alice"],
  ["Ressources humaines", "u_sylvie"],
  ["Direction technique", "u_albert"],
  ["Études et Prospective", "u_jeanpierre"],
  ["Ingénierie territoriale", "u_karim"],
  ["Cartographie et SIG", "u_patrick"],
  ["Suivi-évaluation", "u_theo"],
  ["Direction de la Communication et des Partenariats", "u_hugo"],
  ["Communication", "u_rose"],
  ["Représentation provinciale Nord (exemple)", "u_joseph"],
  ["Antenne Sud (exemple)", "u_prisca"],
];

/** `units` : les renommages d'entités faits avant (nom d'origine → nom ANAT), repris dans l'historique. */
export async function anatContent(svc: Services, org: string, units: [string, string][] = []) {
  const db = svc.db;
  await removeOtherOrganizations(svc, org);

  const projects = await db.query<{ id: string }>("SELECT id FROM projects WHERE org_id = $1", [org]);
  const ids = projects.map((p) => p.id);
  for (const [from, to, description] of PROJECTS)
    await db.query("UPDATE projects SET name = $3, description = $4 WHERE org_id = $1 AND name = $2", [
      org,
      from,
      to,
      description,
    ]);
  for (const [from, to, description] of TASKS)
    await db.query(
      "UPDATE tasks SET title = $3, description = COALESCE($4, description) WHERE project_id = ANY($1) AND title = $2",
      [ids, from, to, description ?? null],
    );
  const tagged = await db.query<{ id: string; tags: string[] }>(
    "SELECT id, tags FROM tasks WHERE project_id = ANY($1) AND jsonb_array_length(tags) > 0",
    [ids],
  );
  for (const t of tagged) {
    const next = t.tags.map((x) => TAGS[x] ?? x);
    if (next.join() !== t.tags.join())
      await db.query("UPDATE tasks SET tags = $2 WHERE id = $1", [t.id, JSON.stringify(next)]);
  }
  for (const [from, to] of COMMENTS)
    await db.query(
      "UPDATE comments SET body = $3 WHERE body = $2 AND task_id IN (SELECT id FROM tasks WHERE project_id = ANY($1))",
      [ids, from, to],
    );
  for (const [from, to, description] of TEAMS)
    await db.query("UPDATE teams SET name = $3, description = $4 WHERE org_id = $1 AND name = $2", [
      org,
      from,
      to,
      description,
    ]);
  for (const [from, to] of PLAN_ACTIVITIES)
    await db.query("UPDATE plan_activities SET title = $3 WHERE org_id = $1 AND title = $2", [org, from, to]);

  // Une réunion sans titre propre porte le nom de son type (« Comité de direction » plutôt que « Réunion »)
  await db.query("UPDATE meetings SET title = meeting_type WHERE org_id = $1 AND title = 'Réunion'", [org]);

  for (const [id, role, instructions] of AI)
    await db.query("UPDATE users SET ai_role = $2, ai_instructions = $3 WHERE id = $1", [id, role, instructions]);
  await db.query("UPDATE ai_rules SET instructions = $2 WHERE project_id = ANY($1) AND agent_id = 'ai_nova'", [
    ids,
    RULE,
  ]);

  await people(svc, org);

  for (const [from, to] of OLD_NAMES) {
    await db.query("UPDATE correspondence_annotations SET text = replace(text, $2, $3) WHERE org_id = $1", [
      org,
      from,
      to,
    ]);
    await db.query("UPDATE participation_gaps SET summary = replace(summary, $2, $3) WHERE org_id = $1", [
      org,
      from,
      to,
    ]);
  }
  // L'historique des projets (créations, renommages) raconte la même histoire que leur contenu
  for (const [from, to] of [...TASKS.map(([f, t]) => [f, t]), ...PLAN_ACTIVITIES])
    await db.query(
      "UPDATE activity SET data = jsonb_set(data, '{title}', to_jsonb($3::text)) WHERE org_id = $1 AND data->>'title' = $2",
      [org, from, to],
    );
  for (const [from, to] of [...PROJECTS.map(([f, t]) => [f, t]), ...TEAMS.map(([f, t]) => [f, t]), ...units])
    await db.query(
      "UPDATE activity SET data = jsonb_set(data, '{name}', to_jsonb($3::text)) WHERE org_id = $1 AND data->>'name' = $2",
      [org, from, to],
    );
  await new Gaps(svc).detect("u_alice", org);
  // Une agence vivante : décisions, courrier, risques, plans, partenaires, attributions (thème 7, suite)
  await anatLife(svc, org);
  await byFunction(svc, org);
}

/**
 * Comptes désignés par leur fonction (demande de l'utilisateur, 20/11/2026) : aucun nom de personne dans la
 * démonstration ; les noms réels viendront plus tard. Le nom de la DG se lit dans un réglage local (ANAT_DG_NAME,
 * fichier .env exclu du dépôt) : il ne part jamais sur GitHub.
 */
const FUNCTIONS: [string, string, string][] = [
  ["u_alice", "Directrice générale", "Directrice générale"],
  ["u_ines", "Assistante de direction", "Assistante de direction"],
  ["u_albert", "Directeur technique", "Directeur technique"],
  ["u_hugo", "Directeur Communication et Partenariats", "Directeur de la Communication et des Partenariats"],
  ["u_karim", "Chef de cellule Ingénierie territoriale", "Chef de la cellule Ingénierie territoriale"],
  ["u_jeanpierre", "Chef de cellule Études et Prospective", "Chef de la cellule Études et Prospective"],
  ["u_patrick", "Chef de cellule Cartographie et SIG", "Chef de la cellule Cartographie et SIG"],
  ["u_theo", "Chef de cellule Suivi-évaluation", "Chef de la cellule Suivi-évaluation"],
  ["u_sylvie", "Chef de cellule Ressources humaines", "Chef de la cellule Ressources humaines"],
  ["u_rose", "Chef de cellule Communication", "Chef de la cellule Communication"],
  ["u_joseph", "Représentant provincial Nord", "Représentant provincial Nord"],
  ["u_prisca", "Chef d'antenne Sud", "Chef de l'Antenne Sud"],
  ["u_cedric", "Responsable informatique", "Responsable informatique (administrateur système)"],
  ["u_chloe", "Agent Études et Prospective", "Chargée d'études"],
  ["u_aimee", "Agent Cartographie et SIG", "Géomaticienne"],
  ["u_samuel", "Agent Suivi-évaluation", "Chargé de suivi-évaluation"],
  ["u_mireille", "Agent Ressources humaines", "Gestionnaire des ressources humaines"],
];
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

async function byFunction(svc: Services, org: string) {
  const db = svc.db;
  const dg = process.env.ANAT_DG_NAME?.trim();
  const before = await db.query<{ id: string; name: string }>("SELECT id, name FROM users WHERE id = ANY($1)", [
    FUNCTIONS.map(([id]) => id),
  ]);
  const label = new Map(FUNCTIONS.map(([id, l]) => [id, id === "u_alice" && dg ? dg : l]));
  // Remplacements : noms complets d'abord, puis prénoms et noms seuls (les plus longs en premier)
  const swaps: [string, string][] = [];
  for (const u of before) {
    const to = label.get(u.id)!;
    if (u.name === to) continue;
    swaps.push([u.name, to]);
    for (const part of u.name.split(" ").filter((w) => w.length > 2)) swaps.push([part, to]);
  }
  swaps.sort((x, y) => y[0].length - x[0].length);
  const cols = await db.query<{ table_name: string; column_name: string; data_type: string }>(
    `SELECT c.table_name, c.column_name, c.data_type FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND c.data_type IN ('text', 'jsonb')
        AND c.table_name NOT IN ('users', 'partner_contacts', 'partner_history')`,
  );
  for (const c of cols)
    for (const [from, to] of swaps) {
      const col = `"${c.column_name}"`;
      const value = c.data_type === "jsonb" ? `replace(${col}::text, $1, $2)::jsonb` : `replace(${col}, $1, $2)`;
      await db.query(
        `UPDATE "${c.table_name}" SET ${col} = ${value} WHERE ${col}::text LIKE '%' || $1 || '%'`,
        [from, c.data_type === "jsonb" ? JSON.stringify(to).slice(1, -1) : to],
      );
    }
  for (const [id, , title] of FUNCTIONS) {
    const name = label.get(id)!;
    await db.query("UPDATE users SET name = $2, title = $3, email = $4 WHERE id = $1", [
      id,
      name,
      title,
      `${id === "u_alice" ? "dg" : slug(FUNCTIONS.find((x) => x[0] === id)![1])}@anat.example`,
    ]);
    await db.query(
      "UPDATE agent_records SET civility = '', first_names = $3, last_name = '', function_title = $4 WHERE org_id = $1 AND user_id = $2",
      [org, id, name, title],
    );
  }
  // L'Agence compte des directions et des cellules : départements et services deviennent des cellules
  await db.query("UPDATE org_units SET kind = 'cellule' WHERE org_id = $1 AND kind IN ('departement', 'service')", [org]);
}

/** Le jeu générique crée un second espace (Studio Lumen) : il n'a pas sa place dans la démonstration de l'Agence. */
async function removeOtherOrganizations(svc: Services, org: string) {
  const others = await svc.db.query<{ id: string }>("SELECT id FROM organizations WHERE id <> $1", [org]);
  for (const o of others)
    await svc.db.tx(async (q) => {
      await q.query("DELETE FROM projects WHERE org_id = $1", [o.id]);
      await q.query("DELETE FROM teams WHERE org_id = $1", [o.id]);
      await q.query("DELETE FROM organizations WHERE id = $1", [o.id]);
    });
}

/** Personnes, rattachements, chefs, profils et dossiers RH, alignés les uns sur les autres. */
async function people(svc: Services, org: string) {
  const db = svc.db;
  const unitId = new Map(
    (await db.query<{ id: string; name: string }>("SELECT id, name FROM org_units WHERE org_id = $1", [org])).map(
      (u) => [u.name, u.id],
    ),
  );
  const profileId = (slug: string) => `prf_${slug}_${org}`;
  for (const [id, name, email, title, color, unit, slug] of PEOPLE) {
    if (email) {
      await db.query(
        "INSERT INTO users (id, name, email, title, avatar_color, is_ai) VALUES ($1,$2,$3,$4,$5,false) ON CONFLICT (id) DO NOTHING",
        [id, name, email, title, color],
      );
      if (!(await db.one("SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2", [org, id])))
        await svc.addOrgMember(org, id, "member");
    }
    await db.query("UPDATE users SET title = $2 WHERE id = $1", [id, title]);
    // La propriété technique de l'institution revient au responsable informatique, sous la relecture de la DG ; la DG
    // tient sa fonction par son profil (« elle lit tout, elle ne fait pas tout », lot S)
    const role = id === "u_cedric" ? "owner" : id === "u_alice" ? "admin" : "member";
    await db.query(
      "UPDATE org_members SET unit_id = $3, profile_id = $4, role = $5 WHERE org_id = $1 AND user_id = $2",
      [org, id, unitId.get(unit) ?? null, profileId(slug), role],
    );
  }
  for (const [unit, chief] of CHIEFS)
    await db.query("UPDATE org_units SET manager_id = $3 WHERE org_id = $1 AND name = $2", [org, unit, chief]);
  // L'administration technique est distincte de la direction (AD-1) : le responsable informatique administre la
  // plateforme, la DG garde le pilotage et relit le journal de ses actions
  await db.query("UPDATE users SET platform_role = NULL WHERE platform_role = 'super_admin' AND id <> 'u_cedric'");
  await db.query("UPDATE users SET platform_role = 'super_admin' WHERE id = 'u_cedric'");
  // Le service RH tient les dossiers : sa cheffe reçoit le droit de les gérer
  await db.query(
    `UPDATE org_members SET permission_overrides = '{"hr.manage": true, "hr.view": true}' WHERE org_id = $1 AND user_id IN ('u_sylvie', 'u_mireille')`,
    [org],
  );
  // La direction chargée des partenariats gère l'annuaire (PA-1) ; le suivi-évaluation prépare tous les plans (PT-1)
  await db.query(
    `UPDATE org_members SET permission_overrides = '{"partners.manage": true}' WHERE org_id = $1 AND user_id = 'u_hugo'`,
    [org],
  );
  await db.query(
    `UPDATE org_members SET permission_overrides = '{"plans.manage_all": true}' WHERE org_id = $1 AND user_id = 'u_theo'`,
    [org],
  );

  // Dossiers RH : un dossier pour chaque nouvelle personne, et l'affectation en cours alignée sur le rattachement
  const hr = new Hr(svc, null as unknown as Provisioning);
  const info = { ip: "127.0.0.1", userAgent: "démonstration" };
  for (const [id, name, email, title, , unit, , civility, status, grade, hired_on] of PEOPLE) {
    if (!email) continue;
    const [first, ...last] = name.split(" ");
    await hr
      .create(
        // Le service RH tient les dossiers, la DG ne les crée pas (lot S) ; nul ne crée le sien
        id === "u_sylvie" ? "u_mireille" : "u_sylvie",
        org,
        {
          user_id: id,
          civility,
          first_names: first,
          last_name: last.join(" "),
          status: status as "fonctionnaire",
          grade,
          category: "A",
          function_title: title,
          hired_on,
          function_since: hired_on,
          nationality: "Congolaise",
          unit_id: unitId.get(unit) ?? null,
          // Un contractuel a une date de fin (thème 6, RH-3) : fictive dans la démonstration
          ...(status === "contractuel" ? { contract_end_on: "2027-06-30" } : {}),
        },
        info,
      )
      .catch(() => undefined);
  }
  for (const [id, , , title] of PEOPLE)
    await db.query("UPDATE agent_records SET function_title = $3 WHERE org_id = $1 AND user_id = $2", [org, id, title]);
  await db.query(
    `UPDATE agent_assignments s SET unit_id = om.unit_id, function_title = COALESCE(a.function_title, s.function_title)
       FROM org_members om LEFT JOIN agent_records a ON a.org_id = om.org_id AND a.user_id = om.user_id
      WHERE s.org_id = $1 AND om.org_id = $1 AND om.user_id = s.user_id AND s.ended_on IS NULL`,
    [org],
  );
  await db.query(
    "UPDATE agent_records SET nationality = 'Congolaise' WHERE org_id = $1 AND nationality = 'Fictivienne'",
    [org],
  );
  // Le comité de recrutement est tenu par le service RH (test du 20/11/2026) : sa cheffe le dirige, la gestionnaire y
  // siège ; la DG y reste membre, sans le diriger
  const recruit = await db.one<{ id: string }>("SELECT id FROM teams WHERE org_id = $1 AND name = 'Comité de recrutement'", [org]);
  if (recruit) {
    await db.query("UPDATE team_members SET role = 'member' WHERE team_id = $1", [recruit.id]);
    for (const [user, role] of [["u_sylvie", "lead"], ["u_mireille", "member"]])
      await db.query(
        "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role",
        [recruit.id, user, role],
      );
  }
}
