/*
 * Domaines des notifications : chaque avis appartient à un domaine, qui donne son lien par défaut et le réglage de
 * courriel de chacun. Les avis de sécurité du compte ne se coupent pas.
 */
export const NOTIFICATION_CATEGORIES = [
  {
    id: "taches",
    label: "Tâches",
    hint: "Attributions, modifications, mentions, commentaires, échéances",
    route: "/my-tasks",
  },
  {
    id: "reunions",
    label: "Réunions",
    hint: "Convocations, changements, annulations, comptes rendus, recommandations",
    route: "/reunions",
  },
  { id: "courrier", label: "Courrier", hint: "Imputations, délais de réponse", route: "/courrier" },
  { id: "decisions", label: "Décisions", hint: "Décisions à exécuter, remplacements", route: "/decisions" },
  {
    id: "signataire",
    label: "Signataire",
    hint: "Documents à viser ou signer, signés, rejetés, délégations",
    route: "/signataire",
  },
  {
    id: "projets",
    label: "Projets et livrables",
    hint: "Livrables, contrats, points d'avancement, plans de travail",
    route: "/activites",
  },
  { id: "partenariats", label: "Partenariats", hint: "Accords, échéances, points focaux", route: "/conventions" },
  { id: "equipe", label: "Équipe et entité", hint: "Retards de vos agents, demandes d'équipe", route: "/entite" },
  {
    id: "rh",
    label: "Ressources humaines",
    hint: "Congés et absences, intérims, fins de contrat",
    route: "/conges",
  },
  { id: "ia", label: "Coéquipiers IA", hint: "Validations demandées par l'IA", route: "/inbox" },
  { id: "autres", label: "Autres", hint: "Le reste", route: "/inbox" },
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]["id"];

export function categoryOfKind(kind: string): NotificationCategory {
  if (kind.endsWith(".late.manager") || kind.startsWith("team.")) return "equipe";
  if (kind.startsWith("leave.") || kind.startsWith("contract.ending") || kind.startsWith("hr.")) return "rh";
  if (/^(assigned|mention|comment|task\.|task$)/.test(kind)) return "taches";
  if (kind.startsWith("meeting") || kind === "recommendation") return "reunions";
  if (kind.startsWith("correspondence") || kind === "mail") return "courrier";
  if (kind.startsWith("decision")) return "decisions";
  if (kind.startsWith("signature") || kind.startsWith("delegation")) return "signataire";
  if (/^(deliverable|contract|project|plan)/.test(kind)) return "projets";
  if (/^(agreement|partner)/.test(kind)) return "partenariats";
  if (kind === "approval" || kind === "ai" || kind === "rule") return "ia";
  return "autres";
}

/** Domaine d'un rappel d'échéance, d'après ce qui est rappelé. */
export const categoryOfReminder: Record<string, NotificationCategory> = {
  task: "taches",
  mail: "courrier",
  decision: "decisions",
  recommendation: "reunions",
  deliverable: "projets",
};
