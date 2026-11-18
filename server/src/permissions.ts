/** Catalogue des droits qu'un profil peut cocher. Ajouter une ligne ici la rend disponible partout. */
export const PERMISSION_GROUPS = [
  {
    group: "Projets",
    items: [
      { key: "projects.create", label: "Créer des projets" },
      { key: "projects.import", label: "Importer un projet depuis un fichier" },
      { key: "projects.edit", label: "Modifier les projets" },
      { key: "projects.archive", label: "Archiver et restaurer les projets" },
      { key: "projects.delete", label: "Supprimer les projets" },
      { key: "projects.members", label: "Gérer les membres des projets" },
      { key: "sections.manage", label: "Gérer les sections" },
    ],
  },
  {
    group: "Tâches",
    items: [
      { key: "tasks.create", label: "Créer des tâches" },
      { key: "tasks.edit", label: "Modifier les tâches" },
      { key: "tasks.delete", label: "Supprimer des tâches" },
      { key: "tasks.move", label: "Déplacer des tâches vers un autre projet" },
      { key: "tasks.comment", label: "Commenter" },
      { key: "attachments.upload", label: "Joindre des fichiers" },
      { key: "attachments.delete", label: "Supprimer des pièces jointes" },
    ],
  },
  {
    group: "Intelligence artificielle",
    items: [
      { key: "ai.assistant", label: "Utiliser l'assistant" },
      { key: "ai.delegate", label: "Confier du travail à l'IA" },
      { key: "ai.approve", label: "Valider les actions de l'IA" },
      { key: "ai.rules", label: "Gérer les règles IA" },
    ],
  },
  {
    group: "Réunions",
    items: [
      { key: "meetings.view", label: "Consulter les réunions et comptes rendus" },
      { key: "meetings.manage", label: "Créer et modifier les réunions" },
      { key: "meetings.validate", label: "Valider les comptes rendus" },
    ],
  },
  {
    group: "Attributions",
    items: [
      { key: "attributions.view", label: "Consulter les attributions des entités" },
      { key: "attributions.manage", label: "Rédiger les fiches d'attributions" },
      { key: "attributions.approve", label: "Approuver les fiches d'attributions" },
    ],
  },
  {
    group: "Plans de travail",
    items: [
      { key: "plans.view", label: "Consulter les plans de travail" },
      { key: "plans.manage", label: "Préparer le plan de son entité et des entités rattachées" },
      { key: "plans.manage_all", label: "Préparer les plans de toutes les entités" },
      { key: "plans.approve", label: "Approuver et réviser les plans de travail" },
    ],
  },
  {
    group: "Livrables et consultants",
    items: [
      { key: "deliverables.view", label: "Consulter tous les livrables" },
      { key: "deliverables.manage", label: "Créer et modifier les livrables" },
      { key: "deliverables.validate", label: "Valider les livrables" },
      { key: "consultants.manage", label: "Gérer les missions des consultants" },
    ],
  },
  {
    group: "Parapheur et courrier",
    items: [
      { key: "signature.use", label: "Utiliser le parapheur" },
      { key: "signature.institution", label: "Signer au nom de l'Agence (conventions, accords, actes)" },
      { key: "correspondence.view", label: "Consulter le courrier" },
      { key: "correspondence.manage", label: "Enregistrer et imputer le courrier" },
    ],
  },
  {
    group: "Pilotage",
    items: [
      { key: "pilotage.view", label: "Accéder au poste de pilotage" },
      { key: "decisions.view", label: "Consulter le registre des décisions" },
      { key: "decisions.record", label: "Enregistrer les décisions de la DG" },
      { key: "decisions.confirm", label: "Confirmer les décisions inscrites au nom de la DG" },
      { key: "risks.manage", label: "Gérer le registre des risques" },
      { key: "indicators.manage", label: "Gérer les indicateurs stratégiques" },
      { key: "agenda.view", label: "Consulter l'agenda de la direction" },
      { key: "agenda.manage", label: "Gérer l'agenda de la direction" },
    ],
  },
  {
    group: "Partenariats",
    items: [
      { key: "partners.view", label: "Consulter l'annuaire des partenaires" },
      { key: "partners.manage", label: "Gérer les partenaires" },
    ],
  },
  {
    group: "Équipes",
    items: [
      { key: "teams.create", label: "Créer des équipes" },
      { key: "teams.join", label: "Rejoindre des équipes" },
      { key: "teams.manage", label: "Gérer toutes les équipes de l'institution" },
    ],
  },
  {
    group: "Ressources humaines",
    items: [
      { key: "hr.view", label: "Consulter les dossiers des agents" },
      { key: "hr.manage", label: "Créer les agents et tenir leurs dossiers" },
    ],
  },
  {
    group: "Administration de l'organisation",
    items: [
      { key: "org.settings", label: "Modifier l'organisation" },
      { key: "org.structure", label: "Gérer l'organigramme" },
      { key: "units.lead", label: "Pouvoir être nommé chef d'une entité" },
      { key: "org.members", label: "Inviter et gérer les personnes" },
      { key: "org.profiles", label: "Gérer les profils et les droits" },
      { key: "org.mail", label: "Configurer la messagerie" },
      { key: "audit.review", label: "Relire et viser le journal des actions de l'administrateur système" },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["items"][number]["key"];
export type BaseRole = "owner" | "admin" | "member" | "guest";

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key)) as Permission[];
const LABELS = new Map<string, string>(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label] as const)));
export const permissionLabel = (p: string) => LABELS.get(p) ?? p;
export const isPermission = (p: string): p is Permission => LABELS.has(p);

const GOVERNANCE = new Set<Permission>([
  "meetings.manage",
  "meetings.validate",
  "attributions.manage",
  "attributions.approve",
  "plans.manage",
  "plans.approve",
  "plans.manage_all",
  "deliverables.manage",
  "deliverables.validate",
  "consultants.manage",
  "correspondence.manage",
  "pilotage.view",
  "decisions.record",
  "decisions.confirm",
  "signature.institution",
  "audit.review",
  "partners.manage",
  "risks.manage",
  "indicators.manage",
  "agenda.manage",
  "hr.view",
  "hr.manage",
]);
const ADMIN_ONLY = (p: Permission) => p.startsWith("org.") || GOVERNANCE.has(p);
const NOT_FOR_GUESTS = new Set<Permission>([
  "meetings.view",
  "attributions.view",
  "plans.view",
  "deliverables.view",
  "signature.use",
  "correspondence.view",
  "decisions.view",
  "partners.view",
  "agenda.view",
  "projects.create",
  "projects.import",
  "teams.create",
  "teams.join",
  "teams.manage",
  "units.lead",
]);

/*
 * Profils de l'institution (docs/MODELE-INSTITUTIONNEL.md) : qui voit quoi, qui fait quoi, qui valide quoi.
 * Un profil se règle ensuite dans « Profils et droits » ; ceux-ci sont créés avec chaque organisation.
 */
const AGENT: Permission[] = [
  "projects.create",
  "projects.edit",
  "sections.manage",
  "tasks.create",
  "tasks.edit",
  "tasks.move",
  "tasks.comment",
  "attachments.upload",
  "ai.assistant",
  "meetings.view",
  "attributions.view",
  "plans.view",
  "signature.use",
  "decisions.view",
  "partners.view",
  "agenda.view",
  "teams.join",
];
const CHEF_ENTITE: Permission[] = [
  ...AGENT,
  "units.lead",
  "risks.manage",
  "projects.import",
  "projects.archive",
  "projects.members",
  "tasks.delete",
  "attachments.delete",
  "ai.delegate",
  "ai.approve",
  "attributions.manage",
  "plans.manage",
  "deliverables.view",
  "deliverables.manage",
  "deliverables.validate",
  "consultants.manage",
  "correspondence.view",
  "teams.create",
];
const DGA: Permission[] = [
  ...CHEF_ENTITE,
  "meetings.manage",
  "meetings.validate",
  "attributions.approve",
  "plans.approve",
  "plans.manage_all",
  "indicators.manage",
  "teams.manage",
  "correspondence.manage",
  "pilotage.view",
  "agenda.manage",
  "partners.manage",
  "hr.view",
];
const DG: Permission[] = [...DGA, "projects.delete", "decisions.record", "decisions.confirm", "signature.institution", "audit.review", "ai.rules"];
/** L'assistant(e) de la DG saisit pour elle (courrier, agenda, réunions, décisions dictées) ; il ne signe ni n'approuve. */
const ASSISTANT_DG: Permission[] = [
  ...new Set<Permission>([
    ...AGENT,
    "pilotage.view",
    "agenda.view",
    "agenda.manage",
    "correspondence.view",
    "correspondence.manage",
    "decisions.view",
    "decisions.record",
    "meetings.manage",
    "partners.view",
    "deliverables.view",
  ]),
];
const INFORMATIQUE: Permission[] = [
  ...AGENT,
  "units.lead",
  "projects.members",
  "ai.rules",
  "teams.create",
  "teams.manage",
  "org.settings",
  "org.structure",
  "org.members",
  "org.profiles",
  "org.mail",
];
const STAGIAIRE: Permission[] = [
  "tasks.create",
  "tasks.edit",
  "tasks.comment",
  "attachments.upload",
  "ai.assistant",
  "meetings.view",
  "attributions.view",
];
const CONSULTANT: Permission[] = ["tasks.create", "tasks.edit", "tasks.comment", "attachments.upload", "ai.assistant"];

/** Droits des profils créés avec chaque organisation : les rôles historiques, puis ceux de l'institution. */
export const SYSTEM_PROFILES: {
  role: BaseRole;
  slug?: string;
  name: string;
  description: string;
  permissions: Permission[];
}[] = [
  {
    role: "owner",
    name: "Propriétaire",
    description: "Tous les droits. Ce profil ne peut pas être modifié.",
    permissions: ALL_PERMISSIONS,
  },
  {
    role: "admin",
    name: "Administrateur",
    description: "Administre l'organisation, ses personnes et ses projets.",
    permissions: ALL_PERMISSIONS,
  },
  {
    role: "member",
    name: "Membre",
    description: "Travaille dans les équipes et les projets auxquels il a accès.",
    permissions: ALL_PERMISSIONS.filter((p) => !ADMIN_ONLY(p)),
  },
  {
    role: "guest",
    name: "Invité",
    description: "N'accède qu'aux projets partagés avec lui.",
    permissions: ALL_PERMISSIONS.filter((p) => !ADMIN_ONLY(p) && !NOT_FOR_GUESTS.has(p)),
  },
  {
    role: "member",
    slug: "readonly",
    name: "Lecture seule",
    description: "Consulte ce qui lui est partagé, sans rien pouvoir modifier.",
    permissions: [],
  },
  {
    role: "member",
    slug: "agent",
    name: "Agent",
    description:
      "Agent de l'institution : ses tâches et celles de son entité, ses projets, ses réunions ; consulte décisions, plans et partenaires ; vise au parapheur quand il est dans le circuit.",
    permissions: AGENT,
  },
  {
    role: "member",
    slug: "stagiaire",
    name: "Stagiaire",
    description:
      "Stagiaire : travaille sur les tâches et projets qui lui sont ouverts, consulte les réunions ; ne crée pas de projet.",
    permissions: STAGIAIRE,
  },
  {
    role: "guest",
    slug: "consultant",
    name: "Consultant",
    description:
      "Consultant extérieur sous contrat : n'accède qu'aux projets de sa mission, y produit tâches et livrables ; son accès s'arrête avec le contrat.",
    permissions: CONSULTANT,
  },
  {
    role: "member",
    slug: "chef_entite",
    name: "Chef d'entité",
    description:
      "Responsable d'une direction, d'un service ou d'une cellule : confie les tâches et suit ses agents, prépare le plan de travail, porte les projets, valide les livrables, tient les réunions de son entité.",
    permissions: CHEF_ENTITE,
  },
  {
    role: "admin",
    slug: "dga",
    name: "DGA",
    description:
      "Directeur général adjoint : pilote l'ensemble, approuve les plans, gère les réunions et le courrier, consulte les dossiers RH ; n'enregistre pas les décisions de la DG.",
    permissions: DGA,
  },
  {
    role: "admin",
    slug: "dg",
    name: "DG",
    description:
      "Directeur général : voit tout le pilotage, tranche et enregistre les décisions, approuve, signe ; ne règle pas la technique (messagerie, profils).",
    permissions: DG,
  },
  {
    role: "member",
    slug: "assistant_dg",
    name: "Assistant(e) de direction",
    description:
      "Assiste la DG : enregistre le courrier et l'impute sur instruction, tient l'agenda et les réunions, inscrit au registre les décisions prises par la DG ; ne signe pas, n'approuve pas, ne valide pas les comptes rendus.",
    permissions: ASSISTANT_DG,
  },
  {
    role: "member",
    slug: "informatique",
    name: "Responsable informatique",
    description:
      "Administre l'outil (personnes, structure, profils, messagerie, règles IA) sans accès au pilotage, aux décisions ni au courrier confidentiel.",
    permissions: INFORMATIQUE,
  },
];

/** Profil + exceptions individuelles : une exception l'emporte toujours sur le profil. */
export function effectivePermissions(
  role: BaseRole,
  profile: string[] | null,
  overrides: Record<string, boolean>,
): Permission[] {
  if (role === "owner") return ALL_PERMISSIONS;
  const base = new Set<string>(profile ?? SYSTEM_PROFILES.find((p) => p.role === role)!.permissions);
  for (const [k, allowed] of Object.entries(overrides)) {
    if (allowed) base.add(k);
    else base.delete(k);
  }
  return ALL_PERMISSIONS.filter((p) => base.has(p));
}
