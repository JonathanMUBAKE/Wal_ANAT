/* =========================================================================
   ANAT Pilotage — les routes dont la console dépend, et rien d'autre.

   Les formes ci-dessous ne sont pas supposées : elles sont relevées sur des
   réponses réelles, le 26 novembre 2026, et consignées dans
   `docs/05-contrat-lu.md`. L'agent serveur épingle ce contrat par un test de
   son côté, de sorte qu'une évolution casse chez lui et non ici.

   Ce fichier ne contient aucune logique d'écran. Il traduit des réponses en
   types, et s'arrête là.
   ========================================================================= */
import { ecrire, lire } from "./client";

/* --- Sessions --------------------------------------------------------- */
export interface SessionDistante {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  /** La vôtre. Elle ne peut pas être révoquée depuis cet écran. */
  mine: boolean;
}
export const sessions = () => lire<SessionDistante[]>("/api/admin/sessions");
export const revoquerSession = (id: string) => ecrire<void>(`/api/auth/sessions/${id}`, "DELETE");

/** Mes propres sessions. `current` désigne CELLE d'où l'on regarde. */
export interface MaSession { id: string; ip: string | null; user_agent: string | null; created_at: string; last_seen_at: string; current: boolean }
export const mesSessions = () => lire<MaSession[]>("/api/auth/sessions");

/* `mine` de /api/admin/sessions vaut `s.user_id = moi` : il marque TOUTES mes
   sessions, pas celle d'où je regarde. S'en servir pour interdire la
   révocation empêcherait un administrateur de fermer sa propre session restée
   ouverte ailleurs — le geste le plus légitime de cet écran. On croise donc
   les deux routes : seule la session `current` est intouchable. */
export async function sessionsAvecCourante() {
  const [toutes, miennes] = await Promise.all([sessions(), mesSessions().catch(() => [] as MaSession[])]);
  const courante = new Set(miennes.filter((m) => m.current).map((m) => m.id));
  return toutes.map((s) => ({ ...s, courante: courante.has(s.id) }));
}
export type SessionAffichee = SessionDistante & { courante: boolean };

/* --- Comptes ---------------------------------------------------------- */
export interface OrgDuCompte { org_id: string; org_name: string; role: string }
export interface CompteDistant {
  id: string;
  name: string;
  email: string;
  title: string | null;
  is_ai: boolean;
  created_at: string;
  status: "active" | "invited" | "suspended" | "pending";
  platform_role: string | null;
  failed_logins: number;
  locked_until: string | null;
  /** `null` = jamais connecté. Ce n'est PAS un compte dormant. */
  last_login_at: string | null;
  totp_enabled: boolean;
  orgs: OrgDuCompte[];
  active_sessions: number;
}
export const comptes = () => lire<CompteDistant[]>("/api/admin/users");

/* --- Santé ------------------------------------------------------------ */
export interface AlerteSante { level: string; text: string }
export interface Sante {
  generated_at: string;
  version: string;
  accounts: {
    total: number; active: number; invited: number; suspended: number; pending: number;
    without_mfa_admins: number; never_logged: number;
  };
  sessions: { active: number; users: number };
  mail: { configured: boolean; sent_7d: number; failed_7d: number };
  storage: { files: number; bytes: number };
  volumes: Record<string, number>;
  security: { failed_logins_24h: number; locked_24h: number };
  /** Des phrases écrites pour un humain. Affichées mot pour mot. */
  alerts: AlerteSante[];
}
export const sante = () => lire<Sante>("/api/admin/health");

/* --- Journal ---------------------------------------------------------- */
export type Gravite = "critique" | "importante" | "normale";
export interface EntreeJournal {
  id: string;
  source: "activity" | "security";
  created_at: string;
  /** La clé. On regroupe, filtre et compte sur elle — jamais sur `label`. */
  kind: string;
  /** Ce que l'application disait à ce moment-là. Jamais reconstruit ici. */
  label: string;
  category: string;
  severity: Gravite;
  actor_id: string | null;
  actor_name: string | null;
  /** Le compte visé quand ce n'est pas l'auteur. */
  target_id: string | null;
  object_id: string | null;
  summary: string;
  org_id: string | null;
  org_name: string | null;
  ip: string | null;
}
export interface ReponseJournal {
  entries: EntreeJournal[];
  categories: string[];
  /** Vrai : il y avait davantage à lire, et cet écran ne sait pas aller plus loin. */
  truncated: boolean;
}
export const journal = (limite = 300) => lire<ReponseJournal>(`/api/admin/audit?limit=${limite}`);

/* --- Événements de sécurité ------------------------------------------- */
export interface EvenementSecurite {
  id: string;
  kind: string;
  ip: string | null;
  data: Record<string, unknown>;
  created_at: string;
  user_name: string | null;
  /** Peut être nul : l'acte n'a pas d'auteur distinct du sujet. */
  actor_name: string | null;
}
export const evenements = () => lire<EvenementSecurite[]>("/api/admin/events");

/* --- Droits ------------------------------------------------------------ */
export interface DroitCatalogue { key: string; label: string }
export interface GroupeDroits { group: string; items: DroitCatalogue[] }
export interface ProfilAcces {
  id: string;
  org_name: string;
  name: string;
  description: string;
  base_role: "owner" | "admin" | "member" | "guest";
  /** Pour un profil `owner`, c'est TOUT le catalogue : une dérivation, pas
      une décision. L'écran doit le dire au lieu d'afficher 58 cases cochées. */
  permissions: string[];
  is_system: boolean;
  members: number;
}
export interface MatriceDroits { groups: GroupeDroits[]; profiles: ProfilAcces[] }
/** Réservée au super-administrateur de plateforme : un 403 est normal ici. */
export const matriceDroits = () => lire<MatriceDroits>("/api/admin/roles-matrix");

/** Vrai quand les droits affichés sont dérivés et non accordés. */
export const droitsDerives = (p: ProfilAcces) => p.base_role === "owner";

/* --- Paramètres -------------------------------------------------------- */
export const parametres = () => lire<Record<string, unknown>>("/api/admin/settings");

/* --- Identité de la personne connectée --------------------------------- */
export interface Moi { id: string; name: string; email?: string; title?: string | null }
export const moi = () => lire<Moi>("/api/me");
