/*
 * Le classement des actes par gravité, et rien d'autre.
 *
 * Il vivait dans `audit.ts`, qui dépend des services ; la table de sortie en a besoin, et les
 * services dépendent d'elle. Le sortir ici rompt le cycle sans rien dupliquer : une brique écrite
 * une fois, appelée partout — le journal d'administration pour trier ses écrans, l'expéditeur pour
 * décider ce qui part devant quand la liaison est lente.
 *
 * Trois valeurs, jamais deux : une suppression n'est pas un changement d'état, et un changement
 * d'état n'est pas un commentaire. L'enveloppe envoyée au centre de commande porte les trois.
 */

export type Severity = "critique" | "importante" | "normale";
export const SEVERITIES: Severity[] = ["critique", "importante", "normale"];

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
  "project.oversight_read",
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
