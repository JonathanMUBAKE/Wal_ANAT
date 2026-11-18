export type Role = "viewer" | "commenter" | "editor" | "admin";
export type Priority = "none" | "low" | "medium" | "high" | "urgent";
export type ProjectStatus = "on_track" | "at_risk" | "off_track" | "done";

export interface User {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  avatar_color: string;
  is_ai: boolean;
  ai_role: string | null;
  ai_instructions: string | null;
  /** Photo de profil (lien versionné), ou null : on affiche les initiales. */
  avatar_url?: string | null;
}
export type SmtpSecurity = "none" | "starttls" | "tls";
export interface MailConfig {
  domain: string;
  from_name: string;
  notifications: boolean;
  /** Adresse d'envoi des notifications (ex. noreply@agence.gouv.cd), vide pour l'adresse de l'équipe. */
  notify_from: string;
  smtp: { host: string; port: number; security: SmtpSecurity; username: string; password_set: boolean };
}
export interface ServiceAddress {
  id: string;
  target_type: "org" | "unit" | "team";
  target_id: string;
  name: string;
  kind: string;
  parent_name: string | null;
  local_part: string;
  address: string;
}
export interface EmailLogEntry {
  id: string;
  from_address: string;
  to_address: string;
  subject: string;
  status: "sent" | "failed";
  error: string | null;
  created_at: string;
}
export type OrgRole = "owner" | "admin" | "member" | "guest";
export interface Organization {
  id: string;
  name: string;
  slug: string;
  domains: string[];
  role: OrgRole;
  /** Le profil de la personne dans l'organisation (Agent, Chef d'entité, DG…). */
  profile_name?: string | null;
}
export interface Me extends User {
  org_id: string;
  orgs: Organization[];
  permissions: string[];
  platform_role: "super_admin" | null;
  mfa_enabled: boolean;
  mfa_required: boolean;
  /** La messagerie est en service : sinon, l'interface ne promet aucun courriel (AD-3). */
  mail_ready?: boolean;
}
export interface PermissionGroup {
  group: string;
  items: { key: string; label: string }[];
}
export type BaseRole = "owner" | "admin" | "member" | "guest";
export interface AccessProfile {
  id: string;
  name: string;
  description: string;
  base_role: BaseRole;
  permissions: string[];
  is_system: boolean;
  member_count: number;
}
export interface MemberAccess {
  role: BaseRole;
  profile_id: string | null;
  overrides: Record<string, boolean>;
  profile_permissions: string[];
  effective: string[];
}
export interface Invitation {
  id: string;
  name: string;
  email: string;
  profile_id: string | null;
  profile_name: string | null;
  created_at: string;
}
export interface InviteResult {
  sent: boolean;
  link?: string;
}
export interface ReceivedInvitation {
  id: string;
  org_name: string;
  profile_name: string;
  created_at: string;
}
export interface SessionInfo {
  id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
  current: boolean;
}
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: "active" | "invited" | "pending" | "suspended" | "rejected";
  platform_role: string | null;
  totp_enabled: boolean;
  last_login_at: string | null;
  access_request_note: string | null;
  active_sessions: number;
  orgs: { org_id: string; org_name: string; role: string }[];
}
export interface AdminOrg {
  id: string;
  name: string;
  profiles: { id: string; name: string; base_role: BaseRole }[];
  units: { id: string; name: string; kind: string }[];
}
export interface AuditEntry {
  id: string;
  source: "activity" | "security";
  created_at: string;
  kind: string;
  label: string;
  category: string;
  severity: Severity;
  actor_id: string | null;
  actor_name: string;
  target_id: string | null;
  object_id: string | null;
  summary: string;
  org_id: string | null;
  org_name: string | null;
  ip: string | null;
}
export interface SecurityEvent {
  id: string;
  kind: string;
  ip: string | null;
  data: Record<string, unknown>;
  created_at: string;
  user_name: string | null;
  actor_name: string | null;
}
export interface OrgUser extends User {
  org_role: OrgRole;
  unit_id: string | null;
  profile_id: string | null;
  status: string;
}
export interface OrgUnit {
  id: string;
  org_id: string;
  parent_id: string | null;
  name: string;
  kind: string;
  manager_id: string | null;
  position: number;
  depth: number;
  member_count: number;
  team_count: number;
}
export type TeamVisibility = "public" | "request" | "private";
export interface Team {
  id: string;
  org_id: string;
  unit_id: string | null;
  name: string;
  description: string;
  visibility: TeamVisibility;
  color: string;
  member_count: number;
  project_count: number;
  my_role: "lead" | "member" | null;
  request_pending: boolean;
}
export interface TeamDetail extends Team {
  members: { user_id: string; role: "lead" | "member" }[];
  projects: ProjectSummary[];
  requests: { id: string; user_id: string; created_at: string }[];
}
export interface Section {
  id: string;
  project_id: string;
  name: string;
  position: number;
}
export interface ProjectSummary {
  id: string;
  key: string;
  team_id: string | null;
  team_name: string | null;
  access: "team" | "private";
  name: string;
  description: string;
  color: string;
  icon: string;
  status: ProjectStatus;
  due_on: string | null;
  owner_id: string | null;
  created_at: string;
  role: Role;
  task_count: number;
  done_count: number;
  overdue_count: number;
  members: string[];
}
export interface ProjectDetail extends Omit<ProjectSummary, "task_count" | "done_count" | "overdue_count" | "members"> {
  sections: Section[];
  members: { user_id: string; role: Role; source: "explicit" | "team" }[];
  archived: boolean;
  /** « unit » : le registre de tâches d'une entité (lot T1), pas un projet du portefeuille. */
  kind?: "project" | "unit";
  unit_id?: string | null;
}
export interface MyUnit {
  id: string;
  name: string;
  role: "responsable" | "agent";
  /** L'entité de rattachement de la personne, même quand elle la dirige (T-9, E-4). */
  home?: boolean;
  depth: number;
}
export interface UnitBoard {
  project_id: string;
  unit: { id: string; name: string; manager_id: string | null };
  role: "responsable" | "agent";
  can: { assign: boolean };
  members: { id: string; name: string; title: string | null; manager: boolean; unit_id: string; unit_name: string }[];
}
export interface UnitFollowUp {
  unit: { id: string; name: string };
  agents: {
    user_id: string;
    name: string;
    title: string | null;
    unit_id: string;
    unit_name: string;
    /** Responsable de l'entité suivie (E-1). */
    is_head?: boolean;
    /** Entités rattachées que la personne dirige (E-3). */
    leads?: string | null;
    open: number;
    overdue: number;
    due_soon: number;
    done_30: number;
  }[];
  tasks: {
    id: string;
    key: string;
    title: string;
    assignee_id: string;
    project_id: string;
    project_name: string;
    in_unit_board: boolean;
    section_name: string | null;
    priority: string;
    due_on: string | null;
    completed: boolean;
    completed_at: string | null;
    overdue: boolean;
  }[];
}
export type Recurrence = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export interface Task {
  id: string;
  number: number;
  key: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  title: string;
  description: string;
  assignee_id: string | null;
  creator_id: string | null;
  /** Qui a confié la tâche : il en garde l'intitulé, l'échéance et la priorité, et confirme sa clôture. */
  assigned_by?: string | null;
  done_declared_at?: string | null;
  done_declared_by?: string | null;
  priority: Priority;
  start_on: string | null;
  due_on: string | null;
  completed: boolean;
  completed_at: string | null;
  position: number;
  tags: string[];
  recurrence: Recurrence | null;
  next_occurrence_id: string | null;
  created_at: string;
  updated_at: string;
  subtask_count?: number;
  subtask_done?: number;
  comment_count?: number;
  /** Titre de la tâche parente d'une sous-tâche (T-5). */
  parent_title?: string | null;
  /** Entité d'une tâche hors projet (T-4). */
  unit_name?: string | null;
}
export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  ai_run_id: string | null;
  created_at: string;
  edited_at: string | null;
}
export interface Activity {
  id: string;
  project_id: string | null;
  task_id: string | null;
  actor_id: string;
  kind: string;
  data: Record<string, unknown>;
  created_at: string;
}
export interface Attachment {
  id: string;
  task_id: string;
  comment_id: string | null;
  uploader_id: string;
  filename: string;
  mime: string;
  size: number;
  created_at: string;
}
export type AttachmentPreviewData =
  | { kind: "image" | "pdf" | "none" }
  | { kind: "document" | "text"; text: string; truncated: boolean }
  | { kind: "sheets"; sheets: { name: string; rows: string[][] }[]; truncated: boolean };
export interface ImportSubtask {
  title: string;
  assignee_id: string | null;
  due_on: string | null;
}
export interface ImportTask {
  title: string;
  description: string;
  section: string;
  assignee_id: string | null;
  due_on: string | null;
  priority: Priority;
  completed: boolean;
  subtasks: ImportSubtask[];
}
export interface ImportProposal {
  name: string;
  description: string;
  due_on: string | null;
  sections: string[];
  tasks: ImportTask[];
  notes: string[];
}
export interface ImportAnalysis {
  filename: string;
  truncated: boolean;
  proposal: ImportProposal;
}
export interface TaskPostponement {
  id: string;
  requested_by: string;
  from_due: string | null;
  due_on: string;
  reason: string;
  status: "pending" | "accepted" | "refused";
  decided_by: string | null;
  decided_at: string | null;
  comment: string;
  created_at: string;
}
export interface TaskDetail extends Task {
  role: Role;
  /** Tâche confiée : la personne qui l'a confiée, et si c'est moi (ou un administrateur du projet). */
  responsible: { id: string; name: string; is_me: boolean } | null;
  postponement: TaskPostponement | null;
  attachments: Attachment[];
  project: { id: string; name: string; color: string; icon: string; description: string; key: string; org_id: string };
  section: Section | null;
  parent: { id: string; number: number; key: string; title: string } | null;
  subtasks: Task[];
  comments: Comment[];
  activity: Activity[];
}
export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string;
  task_id: string | null;
  project_id: string | null;
  approval_id: string | null;
  actor_id: string | null;
  /** Domaine : taches, reunions, courrier, decisions, parapheur, projets, partenariats, equipe, ia, autres. */
  category?: string;
  /** Où agir. */
  link?: string | null;
  read: boolean;
  created_at: string;
}
export interface NotificationPrefs {
  categories: { id: string; label: string; hint: string; route: string }[];
  prefs: Record<string, { email: boolean }>;
}
export interface Stats {
  total: number;
  done: number;
  overdue: number;
  due_this_week: number;
  unassigned: number;
  bySection: { id: string; name: string; open: number; done: number }[];
  byPriority: { priority: Priority; open: number }[];
  byAssignee: { user_id: string | null; open: number; done: number; overdue: number }[];
  burnup: { day: string; done: number; total: number }[];
}
export type RunStatus = "queued" | "running" | "waiting_approval" | "done" | "failed" | "cancelled";
export interface AiRun {
  id: string;
  agent_id: string;
  kind: "task" | "mention" | "rule" | "assistant";
  task_id: string | null;
  project_id: string | null;
  requested_by: string | null;
  rule_id: string | null;
  status: RunStatus;
  summary: string | null;
  error: string | null;
  provider: string;
  created_at: string;
  finished_at: string | null;
  step_count?: number;
  pending_approvals?: number;
}
export interface AiStep {
  id: string;
  run_id: string;
  seq: number;
  kind: string;
  tool: string | null;
  input: Record<string, unknown> | null;
  output: unknown;
  status: string;
  created_at: string;
}
export interface AiApproval {
  id: string;
  run_id: string;
  agent_id: string;
  task_id: string | null;
  project_id: string | null;
  tool: string;
  input: Record<string, unknown>;
  summary: string;
  status: "pending" | "approved" | "rejected" | "expired";
  decided_by: string | null;
  decided_at: string | null;
  /** Les personnes visées par la proposition : elles ne la valident pas elles-mêmes. */
  target_ids?: string[];
  created_at: string;
}
export interface AiRunDetail extends AiRun {
  steps: AiStep[];
  approvals: AiApproval[];
}
export interface AiRule {
  id: string;
  project_id: string;
  name: string;
  trigger: "task_created" | "task_moved" | "task_overdue";
  section_id: string | null;
  agent_id: string;
  instructions: string;
  auto_approve: boolean;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
}
export interface StatusProposal {
  status: "on_track" | "at_risk" | "off_track";
  headline: string;
  summary: string;
  risks: string[];
  next_steps: string[];
}
export interface ParsedTask {
  title: string;
  description: string;
  assignee_id: string | null;
  due_on: string | null;
  priority: Priority;
  section_id: string | null;
}

export type Severity = "critique" | "importante" | "normale";
export interface UserJournalData {
  user: { id: string; name: string; email: string; status: string; title: string | null };
  stats: {
    logins: number;
    failed_logins: number;
    last_login_at: string | null;
    addresses: number;
    activities: number;
    critical: number;
  };
  connections: AuditEntry[];
  activities: AuditEntry[];
}
export interface AuditSignal {
  code: string;
  severity: Severity;
  title: string;
  detail: string;
  count: number;
  evidence: { id: string; created_at: string; actor_name: string; label: string; summary: string }[];
}
export interface AuditAnalysis {
  generated_at: string;
  provider: string;
  /** Service extérieur : l'appréciation attend un accord ; `preview` montre ce qui partirait (thème 5, AD-4). */
  consent_required?: boolean;
  preview?: unknown;
  stats: {
    total: number;
    critique: number;
    importante: number;
    normale: number;
    actors: number;
    by_category: { category: string; count: number }[];
    top_actors: { actor_id: string | null; actor_name: string; count: number }[];
  };
  signals: AuditSignal[];
  ai: {
    summary: string;
    points: { severity: Severity; title: string; detail: string }[];
    recommendations: string[];
  } | null;
  ai_error?: string;
}
export interface UnitDashboardTask {
  id: string;
  key: string;
  title: string;
  assignee_name: string | null;
  project_name: string | null;
  priority: string;
  due_on: string | null;
}
export interface UnitDashboard {
  unit: { id: string; name: string };
  role: "responsable" | "agent";
  board_id: string;
  kpis: {
    open: number;
    overdue: number;
    due_week: number;
    done_30: number;
    unassigned: number;
    completion_rate: number;
    projects: number;
    /** Projets auxquels l'entité contribue sans les porter (E-2). */
    projects_contributed?: number;
    agents: number | null;
  };
  meetings: { unit: UpcomingMeeting[]; mine: UpcomingMeeting[] };
  trend: { week: string; created: number; completed: number }[];
  by_status: { key: string; label: string; count: number }[];
  by_priority: { priority: string; count: number }[];
  overdue: UnitDashboardTask[];
  upcoming: UnitDashboardTask[];
  projects: {
    id: string;
    name: string;
    color: string;
    icon: string;
    status: string;
    due_on: string | null;
    owner_name: string | null;
    task_count: number;
    done_count: number;
    overdue_count: number;
    progress: number;
    /** Porté par l'entité, ou projet auquel elle contribue (E-2). */
    role?: "porte" | "contribue";
  }[];
  workload:
    | {
        user_id: string;
        /** Le responsable de l'entité, compté en tête (E-1). */
        is_head?: boolean;
        name: string;
        unit_name: string;
        open: number;
        overdue: number;
        due_soon: number;
        done_30: number;
      }[]
    | null;
}
/** Réunion à mettre en avant (accueil, espace de l'entité). */
export interface UpcomingMeeting {
  id: string;
  reference: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  start_time: string | null;
  location: string;
  video_link: string;
  status: string;
  convened: boolean;
  chair_name: string | null;
  unit_name: string | null;
  recurring: boolean;
  invited: boolean;
  my_response: "pending" | "accepted" | "declined" | "delegated" | null;
  role: "chair" | "writer" | "invited" | null;
}
