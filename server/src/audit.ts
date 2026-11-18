import { describeError } from "./ai/engine.js";
import type { AiProvider } from "./ai/provider.js";
import type { Auth } from "./auth/service.js";
import { localDate, type Services } from "./services.js";

/*
 * Journal d'audit de l'administration système. Il réunit, sans rien recopier, les deux traces que l'outil tient déjà :
 * le fil d'activité métier (table activity : partenaires, décisions, réunions, courrier, projets, tâches…) et le
 * journal de sécurité (table security_events : connexions, comptes, profils, mots de passe…). Chaque ligne est
 * rendue en clair : date, auteur, domaine, action, objet concerné, institution.
 */

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
  /** Compte concerné quand ce n'est pas l'auteur (sécurité : le compte visé ; métier : la personne désignée). */
  target_id: string | null;
  /** Identifiant de l'objet concerné, quand la trace le garde. */
  object_id: string | null;
  summary: string;
  org_id: string | null;
  org_name: string | null;
  ip: string | null;
}

export interface AuditFilter {
  from?: string;
  to?: string;
  actor_id?: string;
  category?: string;
  kind?: string;
  org_id?: string;
  q?: string;
  severity?: Severity;
  /** Tout ce que la personne a fait, et tout ce qui a été fait sur son compte. */
  user_id?: string;
  source?: "activity" | "security";
  limit?: number;
}

export type Severity = "critique" | "importante" | "normale";
export const SEVERITIES: Severity[] = ["critique", "importante", "normale"];

/** Libellé lisible de chaque action tracée ; une action inconnue garde son code technique. */
const LABELS: Record<string, string> = {
  // Partenariats
  "partner.created": "Partenaire créé",
  "partner.updated": "Fiche partenaire modifiée",
  "partner.deleted": "Partenaire supprimé",
  "partner.state": "État du partenaire changé",
  "partner.contact": "Contact du partenaire mis à jour",
  "partner.note": "Note ajoutée à un partenaire",
  "partner.merged": "Partenaires fusionnés",
  "partner.reconciled": "Partenaire rapproché",
  "partner.document": "Document partenaire ajouté",
  "partner.document.updated": "Document partenaire modifié",
  "partner.document.deleted": "Document partenaire supprimé",
  "partner.document.read": "Document partenaire consulté",
  "agreement.created": "Accord créé",
  "agreement.updated": "Accord modifié",
  "agreement.deleted": "Accord supprimé",
  "agreement.sign": "Accord envoyé au parapheur",
  "agreement.in_force": "Accord entré en vigueur",
  "agreement.terminated": "Accord résilié",
  "agreement.amendment": "Avenant ajouté",
  // Décisions
  "decision.recorded": "Décision enregistrée",
  "decision.execution": "Exécution d'une décision suivie",
  "gap.detected": "Écart de participation relevé",
  "gap.decided": "Écart de participation tranché",
  // Réunions
  "meeting.created": "Réunion programmée",
  "meeting.convened": "Réunion convoquée",
  "meeting.response": "Réponse à une convocation",
  "meeting.submitted": "Compte rendu soumis",
  "meeting.returned": "Compte rendu renvoyé",
  "meeting.validated": "Compte rendu validé",
  "meeting.reopened": "Compte rendu rouvert",
  "meeting.deleted": "Réunion supprimée",
  "meeting.action": "Action de réunion mise à jour",
  "meeting.document": "Document de réunion ajouté",
  "meeting.document.deleted": "Document de réunion supprimé",
  // Courrier et parapheur
  "correspondence.registered": "Courrier enregistré",
  "correspondence.assigned": "Courrier imputé",
  "correspondence.closed": "Courrier clôturé",
  "correspondence.started": "Courrier pris en charge",
  "correspondence.filed": "Courrier classé sans suite",
  "correspondence.annotated": "Courrier annoté",
  "signature.started": "Circuit de signature lancé",
  "signature.created": "Document déposé au parapheur",
  "signature.deleted": "Document retiré du parapheur",
  "signature.approve": "Visa ou signature apposé",
  "signature.reject": "Document rejeté au parapheur",
  "delegation.created": "Délégation de signature accordée",
  "delegation.revoked": "Délégation de signature révoquée",
  // Projets
  "project.created": "Projet créé",
  "project.imported": "Projet importé",
  "project.deleted": "Projet supprimé",
  "project.status": "Statut du projet changé",
  "project.update": "Point d'avancement publié",
  "project.member": "Membre du projet mis à jour",
  "project.governance": "Gouvernance du projet modifiée",
  "risk.created": "Risque ajouté",
  "indicator.created": "Indicateur ajouté",
  "contract.created": "Contrat de consultant créé",
  "deliverable.created": "Livrable ajouté",
  "deliverable.deleted": "Livrable supprimé",
  "deliverable.paid": "Livrable mis en paiement",
  "deliverable.en_cours": "Livrable mis en production",
  "deliverable.soumis": "Livrable soumis",
  "deliverable.en_revue": "Livrable mis en revue",
  "deliverable.a_corriger": "Livrable à corriger",
  "deliverable.valide": "Livrable validé",
  // Tâches
  "task.created": "Tâche créée",
  "task.deleted": "Tâche supprimée",
  "task.moved_project": "Tâche déplacée vers un autre projet",
  "task.title": "Tâche renommée",
  "task.description": "Description de tâche modifiée",
  "task.assignee_id": "Tâche attribuée",
  "task.due_on": "Échéance de tâche changée",
  "task.start_on": "Début de tâche changé",
  "task.priority": "Priorité de tâche changée",
  "task.section_id": "Tâche changée de colonne",
  "task.completed": "Tâche terminée ou rouverte",
  "task.parent_id": "Tâche rattachée à une autre",
  "comment.created": "Commentaire ajouté",
  "comment.deleted": "Commentaire supprimé",
  "attachment.added": "Pièce jointe ajoutée",
  "attachment.removed": "Pièce jointe retirée",
  // Activités et plans
  "activity.created": "Activité créée",
  "activity.deleted": "Activité supprimée",
  "plan.created": "Plan de travail créé",
  "plan.submitted": "Plan de travail soumis",
  "plan.returned": "Plan de travail renvoyé",
  "plan.approved": "Plan de travail approuvé",
  "plan.revised": "Plan de travail révisé",
  "plan.deleted": "Plan de travail supprimé",
  // Documents des dossiers
  "dossier.document": "Document de dossier ajouté",
  "dossier.document.updated": "Document de dossier modifié",
  "dossier.document.deleted": "Document de dossier supprimé",
  "dossier.document.read": "Document de dossier consulté",
  // Ressources humaines
  "hr.agent.created": "Agent créé (dossier et compte)",
  "hr.agent.updated": "Dossier d'agent modifié",
  "hr.agent.self": "Coordonnées mises à jour par l'agent",
  "hr.diploma.added": "Diplôme ajouté",
  "hr.diploma.deleted": "Diplôme retiré",
  "hr.contact.added": "Personne à prévenir ajoutée",
  "hr.contact.deleted": "Personne à prévenir retirée",
  // Organisation et paramétrage
  "org.created": "Institution créée",
  "org.member": "Membre de l'institution mis à jour",
  "org.mail.address": "Adresse d'envoi modifiée",
  "org.mail.config": "Messagerie configurée",
  "org.domains": "Domaine principal de l'institution modifié",
  "unit.created": "Entité créée",
  "unit.deleted": "Entité supprimée",
  "unit.renamed": "Entité renommée",
  "unit.moved": "Entité déplacée dans la structure",
  "unit.manager": "Chef d'entité changé",
  "unit.kind": "Type d'entité changé",
  "unit.member": "Entité d'une personne changée",
  "team.created": "Équipe créée",
  "team.updated": "Équipe modifiée",
  "team.member.added": "Membre ajouté à une équipe",
  "team.member.removed": "Membre retiré d'une équipe",
  "team.member.role": "Rôle dans une équipe changé",
  "team.joined": "Équipe rejointe",
  "team.request.approved": "Demande d'adhésion à une équipe acceptée",
  "team.request.rejected": "Demande d'adhésion à une équipe refusée",
  "hr.agent.viewed": "Dossier d'agent consulté par un tiers",
  "admin.journal.reviewed": "Journal d'administration relu et visé",
  "domain.created": "Domaine d'activité créé",
  "attribution.created": "Fiche d'attribution créée",
  "attribution.approved": "Fiche d'attribution approuvée",
  "attribution.deleted": "Fiche d'attribution supprimée",
  "referential.created": "Valeur de référentiel ajoutée",
  "referential.updated": "Valeur de référentiel modifiée",
  "rule.deleted": "Règle d'automatisation supprimée",
  "section.deleted": "Section supprimée",
  "user.avatar": "Photo de profil changée",
  // Sécurité
  "login.success": "Connexion réussie",
  "login.failed": "Connexion refusée",
  "account.invited": "Compte créé, lien de finalisation envoyé",
  "account.activated": "Compte activé",
  "account.locked": "Compte verrouillé après des échecs",
  "account.suspended": "Compte suspendu",
  "account.reactivated": "Compte réactivé",
  "invitation.accepted": "Invitation acceptée",
  "invitation.declined": "Invitation déclinée",
  "invitation.cancelled": "Invitation annulée",
  "access.requested": "Demande d'accès",
  "access.approved": "Demande d'accès approuvée",
  "access.rejected": "Demande d'accès refusée",
  "member.profile": "Profil d'un membre changé",
  "member.permissions": "Droits d'un membre ajustés",
  "profile.created": "Profil d'accès créé",
  "profile.updated": "Profil d'accès modifié",
  "profile.deleted": "Profil d'accès supprimé",
  "password.changed": "Mot de passe changé",
  "password.forgot": "Mot de passe oublié signalé",
  "password.reset_requested": "Réinitialisation demandée",
  "password.reset": "Mot de passe réinitialisé",
  "mfa.enabled": "Double authentification activée",
  "mfa.disabled": "Double authentification désactivée",
  "mfa.recovery_used": "Code de secours utilisé",
  "sessions.revoked": "Sessions fermées",
  "settings.registration": "Mode d'inscription changé",
  "audit.analysed": "Journal d'audit analysé",
  "audit.exported": "Journal d'audit exporté",
  "session.revoked": "Session fermée par l'administrateur",
  "platform.banner": "Bandeau d'information publié",
  "platform.banner.removed": "Bandeau d'information retiré",
  "accounts.exported": "Liste des comptes exportée",
  "platform.granted": "Rôle d'administrateur système accordé",
  "platform.revoked": "Rôle d'administrateur système retiré",
  "mfa.failed": "Code de vérification erroné",
};

/** Domaine d'une action d'après son préfixe. */
const CATEGORY_OF: Record<string, string> = {
  partner: "Partenariats",
  agreement: "Partenariats",
  decision: "Décisions",
  gap: "Décisions",
  meeting: "Réunions",
  correspondence: "Courrier",
  signature: "Parapheur",
  delegation: "Parapheur",
  project: "Projets",
  risk: "Projets",
  indicator: "Projets",
  contract: "Projets",
  deliverable: "Projets",
  task: "Tâches",
  comment: "Tâches",
  attachment: "Tâches",
  activity: "Activités",
  plan: "Plans de travail",
  dossier: "Documents",
  hr: "Ressources humaines",
  org: "Organisation",
  unit: "Organisation",
  team: "Organisation",
  admin: "Organisation",
  domain: "Organisation",
  attribution: "Organisation",
  referential: "Paramétrage",
  rule: "Paramétrage",
  section: "Paramétrage",
  user: "Paramétrage",
};
export const AUDIT_CATEGORIES = [
  "Partenariats",
  "Décisions",
  "Réunions",
  "Courrier",
  "Parapheur",
  "Projets",
  "Tâches",
  "Activités",
  "Plans de travail",
  "Documents",
  "Ressources humaines",
  "Organisation",
  "Paramétrage",
  "Sécurité",
  "Autre",
];

const prefix = (kind: string) => kind.split(".")[0];

/**
 * Gravité d'une action. Critique : ce qui retire, efface, ouvre des droits ou trahit une tentative d'intrusion.
 * Importante : ce qui engage l'institution (validation, signature, décision, attribution, imputation). Normale : le reste.
 */
const CRITICAL = new Set([
  "login.failed",
  "account.locked",
  "account.suspended",
  "platform.granted",
  "platform.revoked",
  "mfa.disabled",
  "mfa.failed",
  "mfa.recovery_used",
  "password.reset",
  "member.permissions",
  "profile.deleted",
  "sessions.revoked",
  "settings.registration",
  "partner.merged",
  "agreement.terminated",
  "signature.reject",
  "org.mail.config",
  "org.domains",
  "session.revoked",
  "correspondence.filed",
]);
const IMPORTANT = new Set([
  "account.invited",
  "account.activated",
  "account.reactivated",
  "access.approved",
  "access.rejected",
  "member.profile",
  "profile.created",
  "profile.updated",
  "invitation.cancelled",
  "password.changed",
  "mfa.enabled",
  "decision.recorded",
  "decision.execution",
  "gap.decided",
  "agreement.in_force",
  "agreement.sign",
  "agreement.amendment",
  "partner.state",
  "meeting.convened",
  "meeting.validated",
  "meeting.returned",
  "meeting.reopened",
  "correspondence.assigned",
  "correspondence.closed",
  "signature.started",
  "signature.approve",
  "delegation.created",
  "delegation.revoked",
  "plan.approved",
  "plan.returned",
  "plan.submitted",
  "attribution.approved",
  "deliverable.valide",
  "deliverable.paid",
  "project.status",
  "project.governance",
  "task.assignee_id",
  "task.due_on",
  "org.member",
  "audit.analysed",
  "audit.exported",
  "hr.agent.created",
  "hr.agent.updated",
  "hr.agent.viewed",
  "unit.manager",
  "unit.moved",
  "unit.member",
  "team.member.added",
  "admin.journal.reviewed",
  "platform.banner",
  "accounts.exported",
  "correspondence.started",
]);
export const severityOf = (kind: string): Severity =>
  CRITICAL.has(kind) || kind.endsWith(".deleted") || kind.endsWith(".removed")
    ? "critique"
    : IMPORTANT.has(kind)
      ? "importante"
      : "normale";
const TARGET_KEYS = ["user", "user_id", "member", "for"];
export const categoryOf = (source: "activity" | "security", kind: string) =>
  source === "security" ? "Sécurité" : (CATEGORY_OF[prefix(kind)] ?? "Autre");
export const labelOf = (kind: string) => LABELS[kind] ?? kind;

/** Où retrouver l'intitulé de l'objet concerné, pour les actions qui ne gardent que son identifiant. */
const OBJECT_TABLE: Record<string, { table: string; column: string }> = {
  partner: { table: "partners", column: "name" },
  agreement: { table: "agreements", column: "title" },
  decision: { table: "dg_decisions", column: "title" },
  meeting: { table: "meetings", column: "COALESCE(NULLIF(title, ''), meeting_type)" },
  correspondence: { table: "correspondence", column: "subject" },
  signature: { table: "sign_documents", column: "title" },
  project: { table: "projects", column: "name" },
  risk: { table: "risks", column: "title" },
  indicator: { table: "indicators", column: "name" },
  contract: { table: "consultant_contracts", column: "title" },
  deliverable: { table: "deliverables", column: "title" },
  task: { table: "tasks", column: "title" },
  activity: { table: "agency_activities", column: "title" },
  plan: { table: "work_plans", column: "title" },
  unit: { table: "org_units", column: "name" },
  domain: { table: "activity_domains", column: "name" },
};

type Row = {
  id: string;
  source: "activity" | "security";
  created_at: string | Date;
  kind: string;
  actor_id: string | null;
  user_id: string | null;
  org_id: string | null;
  project_id: string | null;
  task_id: string | null;
  ip: string | null;
  data: Record<string, unknown> | string | null;
};

const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

export interface AuditSignal {
  code: string;
  severity: Severity;
  title: string;
  detail: string;
  count: number;
  /** Quelques traces à l'appui, pour vérifier. */
  evidence: { id: string; created_at: string; actor_name: string; label: string; summary: string }[];
}

export interface AuditAnalysis {
  generated_at: string;
  provider: string;
  filters: AuditFilter;
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

const STEPS: [string, string][] = [
  // Préparer puis valider soi-même : rien ne doit se faire de manière isolée
  ["plan.submitted", "plan.approved"],
  ["meeting.submitted", "meeting.validated"],
  ["attribution.created", "attribution.approved"],
  ["signature.started", "signature.approve"],
  ["deliverable.soumis", "deliverable.valide"],
  ["agreement.sign", "agreement.in_force"],
];

const AI_SYSTEM = [
  "Tu es l'assistant d'audit interne d'une institution publique (ANAT, Agence Nationale d'Aménagement du Territoire).",
  "Tu lis un résumé chiffré du journal d'audit et les signaux relevés automatiquement, et tu rédiges en français,",
  "sobrement et sans dramatiser, une appréciation destinée à l'administrateur système.",
  "Tu ne conclus jamais à une faute : tu signales ce qui mérite d'être vérifié, et par qui. Tu n'inventes aucun fait :",
  "tu t'en tiens aux chiffres et aux signaux fournis. L'administrateur décide des suites.",
].join(" ");
const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "points", "recommendations"],
  properties: {
    summary: { type: "string", description: "Appréciation d'ensemble en 2 à 4 phrases." },
    points: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "title", "detail"],
        properties: {
          severity: { type: "string", enum: SEVERITIES },
          title: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

export class Audit {
  constructor(
    private svc: Services,
    private provider?: AiProvider,
    private auth?: Auth,
  ) {}

  /** Journal d'une personne : ses connexions (et ce qui touche à son compte), puis ses activités. */
  async journal(userId: string, f: AuditFilter = {}) {
    const user = await this.svc.db.one<{
      id: string;
      name: string;
      email: string;
      status: string;
      title: string | null;
    }>("SELECT id, name, email, status, title FROM users WHERE id = $1", [userId]);
    if (!user) return null;
    const base = { ...f, user_id: userId, limit: f.limit ?? 500 };
    const connections = (await this.list({ ...base, source: "security" })).entries;
    const activities = (await this.list({ ...base, source: "activity" })).entries;
    const logins = connections.filter((e) => e.kind === "login.success" && e.actor_id === userId);
    const stats = {
      logins: logins.length,
      failed_logins: connections.filter((e) => e.kind === "login.failed").length,
      last_login_at: logins[0]?.created_at ?? null,
      addresses: [...new Set(logins.map((e) => e.ip).filter(Boolean))].length,
      activities: activities.filter((e) => e.actor_id === userId).length,
      critical: [...connections, ...activities].filter((e) => e.severity === "critique").length,
    };
    return { user, stats, connections, activities };
  }

  /**
   * Analyse : des signaux calculés (sûrs, vérifiables, toujours disponibles), puis une appréciation rédigée par l'IA
   * à partir de ces seuls signaux. L'IA propose ; l'administrateur apprécie et décide. L'analyse est elle-même tracée.
   */
  async analysis(actorId: string, f: AuditFilter, ip?: string | null): Promise<AuditAnalysis> {
    const { entries } = await this.list({ ...f, limit: 5000 });
    const signals = this.signals(entries);
    const count = (k: Severity) => entries.filter((e) => e.severity === k).length;
    const tally = <K>(key: (e: AuditEntry) => K) => {
      const m = new Map<K, { e: AuditEntry; count: number }>();
      for (const e of entries) {
        const k = key(e);
        const cur = m.get(k);
        if (cur) cur.count++;
        else m.set(k, { e, count: 1 });
      }
      return [...m.values()].sort((a, b) => b.count - a.count);
    };
    const stats = {
      total: entries.length,
      critique: count("critique"),
      importante: count("importante"),
      normale: count("normale"),
      actors: new Set(entries.map((e) => e.actor_id)).size,
      by_category: tally((e) => e.category).map((x) => ({ category: x.e.category, count: x.count })),
      top_actors: tally((e) => e.actor_id)
        .slice(0, 5)
        .map((x) => ({ actor_id: x.e.actor_id, actor_name: x.e.actor_name, count: x.count })),
    };
    let ai: AuditAnalysis["ai"] = null;
    let ai_error: string | undefined;
    if (this.provider)
      try {
        const facts = {
          period: { from: f.from ?? entries.at(-1)?.created_at ?? null, to: f.to ?? entries[0]?.created_at ?? null },
          stats,
          signals: signals.map(({ evidence, ...s }) => ({ ...s, examples: evidence.slice(0, 3) })),
        };
        ai = await this.provider.json<NonNullable<AuditAnalysis["ai"]>>({
          system: AI_SYSTEM,
          schema: AI_SCHEMA,
          effort: "medium",
          hint: { kind: "audit", data: facts },
          prompt: [
            `Date du jour : ${localDate()}.`,
            "Voici le résumé du journal d'audit et les signaux relevés automatiquement (JSON) :",
            JSON.stringify(facts),
            "Rédige : summary (appréciation d'ensemble), points (ce qui mérite vérification, du plus grave au moins grave),",
            "recommendations (mesures concrètes et proportionnées : vérifier auprès de, renforcer, documenter…).",
          ].join("\n"),
        });
      } catch (err) {
        ai_error = describeError(err);
      }
    await this.auth?.record("audit.analysed", {
      actorId,
      userId: f.user_id ?? null,
      ip: ip ?? null,
      data: { filters: f, signals: signals.map((s) => s.code), total: entries.length },
    });
    return {
      generated_at: new Date().toISOString(),
      provider: this.provider?.name ?? "aucun",
      filters: f,
      stats,
      signals,
      ai,
      ...(ai_error ? { ai_error } : {}),
    };
  }

  /** Signaux déterministes : chacun dit ce qui a été vu et s'appuie sur des traces précises. */
  signals(entries: AuditEntry[]): AuditSignal[] {
    const out: AuditSignal[] = [];
    const ev = (list: AuditEntry[]) =>
      list.slice(0, 10).map((e) => ({
        id: e.id,
        created_at: e.created_at,
        actor_name: e.actor_name,
        label: e.label,
        summary: e.summary,
      }));
    const groupBy = (list: AuditEntry[], key: (e: AuditEntry) => string) => {
      const m = new Map<string, AuditEntry[]>();
      for (const e of list) m.set(key(e), [...(m.get(key(e)) ?? []), e]);
      return m;
    };
    const day = (e: AuditEntry) => localDate(new Date(e.created_at));
    // 1. Échecs de connexion répétés sur un même compte (ou une même adresse)
    for (const [, list] of groupBy(
      entries.filter((e) => e.kind === "login.failed"),
      (e) => e.target_id ?? e.actor_id ?? e.summary,
    ))
      if (list.length >= 3)
        out.push({
          code: "failed_logins",
          severity: "critique",
          title: "Échecs de connexion répétés",
          detail: `${list.length} tentatives refusées ${list[0].target_id || list[0].actor_id ? `sur le compte de ${list[0].actor_name}` : `pour ${list[0].summary || "une adresse inconnue"}`}. À vérifier avec la personne : oubli ou tentative d'intrusion.`,
          count: list.length,
          evidence: ev(list),
        });
    // 2. Verrouillages, rôles système, double authentification retirée
    const sensitive = entries.filter((e) =>
      ["account.locked", "platform.granted", "platform.revoked", "mfa.disabled", "member.permissions"].includes(e.kind),
    );
    if (sensitive.length)
      out.push({
        code: "sensitive_access",
        severity: "critique",
        title: "Changements sensibles de droits ou de sécurité",
        detail: `${sensitive.length} changement(s) : verrouillage, rôle d'administrateur système, double authentification ou droits individuels. Chacun doit correspondre à une demande connue.`,
        count: sensitive.length,
        evidence: ev(sensitive),
      });
    // 3. Suppressions en série par une même personne, le même jour
    for (const [, list] of groupBy(
      entries.filter((e) => e.source === "activity" && e.kind.endsWith(".deleted")),
      (e) => `${e.actor_id}|${day(e)}`,
    ))
      if (list.length >= 5)
        out.push({
          code: "mass_deletion",
          severity: "critique",
          title: "Suppressions en série",
          detail: `${list[0].actor_name} a supprimé ${list.length} éléments le ${day(list[0])}. S'assurer qu'il s'agit d'un nettoyage voulu.`,
          count: list.length,
          evidence: ev(list),
        });
    // 4. Préparer et valider soi-même : un contrôle à quatre yeux contourné
    const solo: AuditEntry[] = [];
    const byObject = new Map<string, AuditEntry[]>();
    for (const e of entries) {
      const id = e.object_id ? `${prefix(e.kind)}|${e.object_id}` : "";
      if (id) byObject.set(id, [...(byObject.get(id) ?? []), e]);
    }
    for (const [, list] of byObject)
      for (const [first, second] of STEPS) {
        const a = list.find((e) => e.kind === first);
        const b = list.find((e) => e.kind === second);
        if (a && b && a.actor_id && a.actor_id === b.actor_id) solo.push(b);
      }
    if (solo.length)
      out.push({
        code: "self_validation",
        severity: "critique",
        title: "Préparé et validé par la même personne",
        detail: `${solo.length} dossier(s) ont été préparés puis validés ou signés par la même personne. Dans une institution publique, rien ne doit se faire de manière isolée : vérifier la délégation qui l'autorisait.`,
        count: solo.length,
        evidence: ev(solo),
      });
    // 5. Actions hors des heures ouvrées (avant 7 h, après 20 h, ou le week-end)
    const late = entries.filter((e) => {
      if (e.kind === "login.failed") return false;
      const d = new Date(e.created_at);
      return d.getDay() === 0 || d.getDay() === 6 || d.getHours() < 7 || d.getHours() >= 20;
    });
    const lateImportant = late.filter((e) => e.severity !== "normale");
    if (lateImportant.length)
      out.push({
        code: "off_hours",
        severity: "importante",
        title: "Actions importantes hors des heures ouvrées",
        detail: `${lateImportant.length} action(s) importantes ou critiques ont eu lieu le soir, la nuit ou le week-end. Souvent légitime ; à rapprocher des permanences connues.`,
        count: lateImportant.length,
        evidence: ev(lateImportant),
      });
    // 6. Consultations massives de documents par une même personne, le même jour
    for (const [, list] of groupBy(
      entries.filter((e) => e.kind.endsWith(".document.read")),
      (e) => `${e.actor_id}|${day(e)}`,
    ))
      if (list.length >= 20)
        out.push({
          code: "mass_reading",
          severity: "importante",
          title: "Consultation massive de documents",
          detail: `${list[0].actor_name} a ouvert ${list.length} documents le ${day(list[0])}.`,
          count: list.length,
          evidence: ev(list),
        });
    // 7. Connexions depuis de nombreuses adresses
    for (const [, list] of groupBy(
      entries.filter((e) => e.kind === "login.success" && e.ip),
      (e) => e.actor_id ?? "",
    )) {
      const ips = new Set(list.map((e) => e.ip));
      if (ips.size >= 4)
        out.push({
          code: "many_addresses",
          severity: "importante",
          title: "Connexions depuis de nombreuses adresses",
          detail: `${list[0].actor_name} s'est connecté(e) depuis ${ips.size} adresses différentes.`,
          count: ips.size,
          evidence: ev(list),
        });
    }
    // 8. Exports du journal
    const exports = entries.filter((e) => e.kind === "audit.exported");
    if (exports.length)
      out.push({
        code: "audit_exported",
        severity: "normale",
        title: "Exports du journal d'audit",
        detail: `Le journal a été exporté ${exports.length} fois. Un export contient des données personnelles : il se conserve et se transmet avec soin.`,
        count: exports.length,
        evidence: ev(exports),
      });
    const rank: Record<Severity, number> = { critique: 0, importante: 1, normale: 2 };
    return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
  }

  async list(f: AuditFilter): Promise<{ entries: AuditEntry[]; categories: string[]; truncated: boolean }> {
    const limit = Math.min(Math.max(Number(f.limit) || 300, 1), 5000);
    // Les filtres de date, d'auteur et d'institution se font en base ; domaine et texte se font sur le rendu.
    const narrow = !!(f.q || f.category || f.severity);
    const fetch = narrow ? 5000 : limit + 1;
    const where = (alias: string, actor: string) => {
      const c: string[] = [];
      const p: unknown[] = [];
      if (f.from) {
        p.push(f.from);
        c.push(`${alias}.created_at >= $${p.length}::date`);
      }
      if (f.to) {
        p.push(f.to);
        c.push(`${alias}.created_at < ($${p.length}::date + 1)`);
      }
      if (f.actor_id) {
        p.push(f.actor_id);
        c.push(`${actor} = $${p.length}`);
      }
      if (f.kind) {
        p.push(f.kind);
        c.push(`${alias}.kind = $${p.length}`);
      }
      return { c, p };
    };
    const rows: Row[] = [];
    const wantActivity = (!f.category || f.category !== "Sécurité") && f.source !== "security";
    const wantSecurity = (!f.category || f.category === "Sécurité") && f.source !== "activity";
    if (wantActivity) {
      const w = where("a", "a.actor_id");
      if (f.user_id) {
        w.p.push(f.user_id);
        w.c.push(
          `(a.actor_id = $${w.p.length} OR ${TARGET_KEYS.map((k) => `a.data->>'${k}' = $${w.p.length}`).join(" OR ")})`,
        );
      }
      if (f.org_id) {
        w.p.push(f.org_id);
        w.c.push(`a.org_id = $${w.p.length}`);
      }
      w.p.push(fetch);
      rows.push(
        ...(await this.svc.db.query<Row>(
          `SELECT a.id, 'activity' AS source, a.created_at, a.kind, a.actor_id, NULL::text AS user_id, a.org_id,
                  a.project_id, a.task_id, NULL::text AS ip, a.data
             FROM activity a ${w.c.length ? `WHERE ${w.c.join(" AND ")}` : ""}
            ORDER BY a.created_at DESC LIMIT $${w.p.length}`,
          w.p,
        )),
      );
    }
    if (wantSecurity) {
      const w = where("s", "COALESCE(s.actor_id, s.user_id)");
      if (f.user_id) {
        w.p.push(f.user_id);
        w.c.push(`(s.actor_id = $${w.p.length} OR s.user_id = $${w.p.length})`);
      }
      if (f.org_id) {
        w.p.push(f.org_id);
        w.c.push(`s.data->>'org_id' = $${w.p.length}`);
      }
      w.p.push(fetch);
      rows.push(
        ...(await this.svc.db.query<Row>(
          `SELECT s.id, 'security' AS source, s.created_at, s.kind, COALESCE(s.actor_id, s.user_id) AS actor_id, s.user_id,
                  s.data->>'org_id' AS org_id, NULL::text AS project_id, NULL::text AS task_id, s.ip, s.data
             FROM security_events s ${w.c.length ? `WHERE ${w.c.join(" AND ")}` : ""}
            ORDER BY s.created_at DESC LIMIT $${w.p.length}`,
          w.p,
        )),
      );
    }
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const entries = await this.render(rows);
    const q = f.q?.trim().toLowerCase();
    const filtered = entries.filter(
      (e) =>
        (!f.category || e.category === f.category) &&
        (!f.severity || e.severity === f.severity) &&
        (!q || [e.label, e.summary, e.actor_name, e.kind, e.org_name ?? ""].join(" ").toLowerCase().includes(q)),
    );
    return { entries: filtered.slice(0, limit), categories: AUDIT_CATEGORIES, truncated: filtered.length > limit };
  }

  /** Noms des auteurs, des institutions et des objets, lus en quelques requêtes groupées. */
  private async render(rows: Row[]): Promise<AuditEntry[]> {
    const data = rows.map(
      (r) => (typeof r.data === "string" ? JSON.parse(r.data) : (r.data ?? {})) as Record<string, unknown>,
    );
    const people = new Set<string>();
    const orgs = new Set<string>();
    const objects = new Map<string, Set<string>>();
    const want = (key: string, id: unknown) => {
      if (typeof id !== "string" || !id) return;
      if (!objects.has(key)) objects.set(key, new Set());
      objects.get(key)!.add(id);
    };
    rows.forEach((r, i) => {
      if (r.actor_id) people.add(r.actor_id);
      if (r.user_id) people.add(r.user_id);
      for (const k of [...TARGET_KEYS, "owner"]) if (typeof data[i][k] === "string") people.add(String(data[i][k]));
      if (r.org_id) orgs.add(r.org_id);
      const p = prefix(r.kind);
      if (OBJECT_TABLE[p]) want(p, data[i].id);
      if (typeof data[i].partner === "string") want("partner", data[i].partner);
      if (r.project_id) want("project", r.project_id);
      if (r.task_id) want("task", r.task_id);
    });
    const names = new Map<string, string>();
    if (people.size)
      for (const u of await this.svc.db.query<{ id: string; name: string }>(
        "SELECT id, name FROM users WHERE id = ANY($1)",
        [[...people]],
      ))
        names.set(u.id, u.name);
    const orgNames = new Map<string, string>();
    if (orgs.size)
      for (const o of await this.svc.db.query<{ id: string; name: string }>(
        "SELECT id, name FROM organizations WHERE id = ANY($1)",
        [[...orgs]],
      ))
        orgNames.set(o.id, o.name);
    const titles = new Map<string, string>();
    for (const [key, ids] of objects) {
      const t = OBJECT_TABLE[key];
      for (const o of await this.svc.db.query<{ id: string; label: string }>(
        `SELECT id, ${t.column} AS label FROM ${t.table} WHERE id = ANY($1)`,
        [[...ids]],
      ))
        titles.set(`${key}:${o.id}`, o.label ?? "");
    }
    return rows.map((r, i) => {
      const d = data[i];
      const p = prefix(r.kind);
      const parts: string[] = [];
      const ref = text(d.reference);
      const own = OBJECT_TABLE[p] && typeof d.id === "string" ? titles.get(`${p}:${d.id}`) : undefined;
      const named = text(d.name) || text(d.title) || text(d.subject) || own || "";
      const object = [ref, named].filter(Boolean).join(" — ");
      if (object) parts.push(object);
      const file = text(d.filename) || text(d.document);
      if (file && !parts.includes(file)) parts.push(file);
      if (typeof d.partner === "string" && p !== "partner") {
        const pn = titles.get(`partner:${d.partner}`);
        if (pn) parts.push(`partenaire ${pn}`);
      }
      if (r.task_id && p !== "task") {
        const tn = titles.get(`task:${r.task_id}`);
        if (tn) parts.push(`tâche « ${tn} »`);
      }
      if (r.project_id && p !== "project") {
        const pn = titles.get(`project:${r.project_id}`);
        if (pn) parts.push(`projet ${pn}`);
      }
      const target =
        r.source === "security" ? r.user_id : TARGET_KEYS.map((k) => text(d[k])).find((v) => v && names.has(v)) || null;
      if (target && target !== r.actor_id && names.get(target)) parts.push(`pour ${names.get(target)}`);
      if (r.source === "security" && text(d.email)) parts.push(text(d.email));
      if (d.demo === true) parts.push("connexion de démonstration");
      if (r.kind === "audit.analysed") parts.push(`${Number(d.total) || 0} trace(s) analysée(s)`);
      if (r.kind === "audit.exported") parts.push(`${Number(d.lines) || 0} ligne(s) exportée(s)`);
      const at = r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at);
      return {
        id: r.id,
        source: r.source,
        created_at: at,
        kind: r.kind,
        label: labelOf(r.kind),
        category: categoryOf(r.source, r.kind),
        severity: severityOf(r.kind),
        actor_id: r.actor_id,
        actor_name: r.actor_id ? (names.get(r.actor_id) ?? "Compte supprimé") : "Système",
        target_id: target && target !== r.actor_id ? target : null,
        object_id: typeof d.id === "string" ? d.id : null,
        summary: parts.join(" · "),
        org_id: r.org_id,
        org_name: r.org_id ? (orgNames.get(r.org_id) ?? null) : null,
        ip: r.ip,
      };
    });
  }

  /** Export tableur (point-virgule, UTF-8 avec BOM pour Excel), mêmes filtres que l'écran. */
  /** Le journal filtré, au format choisi : l'export est tracé comme le CSV. */
  async exportDoc(f: AuditFilter, actorId: string, ip: string | null) {
    const { entries } = await this.list({ ...f, limit: f.limit ?? 5000 });
    await this.auth?.record("audit.exported", {
      actorId,
      userId: f.user_id ?? null,
      ip,
      data: { filters: f, lines: entries.length },
    });
    const when = (iso: string) => {
      const d = new Date(iso);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const filters = Object.entries(f)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k} : ${v}`)
      .join(" · ");
    return {
      title: "Journal d'audit",
      subtitle: filters ? `Filtres : ${filters}` : "Sans filtre",
      filename: "journal-audit",
      landscape: true,
      sections: [
        {
          heading: `Événements (${entries.length})`,
          blocks: [
            {
              kind: "table" as const,
              head: ["Date", "Auteur", "Domaine", "Action", "Objet", "Gravité", "Institution", "Adresse IP"],
              widths: [2, 2.5, 2, 3, 5, 1.5, 2.5, 2],
              rows: entries.map((e) => [
                when(e.created_at),
                e.actor_name,
                e.category,
                e.label,
                e.summary,
                e.severity,
                e.org_name,
                e.ip,
              ]),
            },
          ],
        },
      ],
    };
  }

  async csv(f: AuditFilter, actorId?: string, ip?: string | null) {
    const { entries } = await this.list({ ...f, limit: f.limit ?? 5000 });
    // Rien ne sort du journal sans laisser de trace
    if (actorId)
      await this.auth?.record("audit.exported", {
        actorId,
        userId: f.user_id ?? null,
        ip: ip ?? null,
        data: { filters: f, lines: entries.length },
      });
    const cell = (v: string | null) => {
      const s = (v ?? "").replace(/\r?\n/g, " ");
      return /[;"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const when = (iso: string) => {
      const d = new Date(iso);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const lines = [
      "Date;Auteur;Domaine;Action;Objet;Gravité;Institution;Adresse IP;Code",
      ...entries.map((e) =>
        [when(e.created_at), e.actor_name, e.category, e.label, e.summary, e.severity, e.org_name, e.ip, e.kind]
          .map(cell)
          .join(";"),
      ),
    ];
    return `﻿${lines.join("\n")}\n`;
  }
}
