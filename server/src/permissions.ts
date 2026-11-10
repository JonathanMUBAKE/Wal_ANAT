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
      { key: "plans.manage", label: "Préparer les plans de travail" },
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
      { key: "risks.manage", label: "Gérer les risques et les indicateurs" },
      { key: "agenda.view", label: "Consulter l'agenda de la direction" },
      { key: "agenda.manage", label: "Gérer l'agenda de la direction" },
    ],
  },
  {
    group: "Équipes",
    items: [
      { key: "teams.create", label: "Créer des équipes" },
      { key: "teams.join", label: "Rejoindre des équipes" },
      { key: "teams.manage", label: "Gérer les équipes dont on est responsable" },
    ],
  },
  {
    group: "Administration de l'organisation",
    items: [
      { key: "org.settings", label: "Modifier l'organisation" },
      { key: "org.structure", label: "Gérer l'organigramme" },
      { key: "org.members", label: "Inviter et gérer les personnes" },
      { key: "org.profiles", label: "Gérer les profils et les droits" },
      { key: "org.mail", label: "Configurer la messagerie" },
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
  "deliverables.manage",
  "deliverables.validate",
  "consultants.manage",
  "correspondence.manage",
  "pilotage.view",
  "decisions.record",
  "risks.manage",
  "agenda.manage",
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
  "agenda.view",
  "projects.create",
  "projects.import",
  "teams.create",
  "teams.join",
  "teams.manage",
]);

/** Droits des quatre profils créés avec chaque organisation : ils reproduisent les rôles historiques. */
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
