import { type ExportDoc, formatOf, sendExport } from "./export-doc.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Provisioning } from "./auth/provisioning.js";
import type { Auth } from "./auth/service.js";
import { PERMISSION_GROUPS } from "./permissions.js";
import { localDate, notFound, type Services } from "./services.js";

/*
 * Administration système, suite. Surveiller (état du système, sessions ouvertes), informer (bandeau affiché à
 * tous), comprendre (matrice des rôles : qui voit, fait et valide quoi) et rendre compte (export des comptes).
 * Réservé à l'administrateur système ; chaque action qui touche un compte ou la plateforme est tracée.
 */

const csvCell = (v: unknown) => {
  const s = String(v ?? "").replace(/\r?\n/g, " ");
  return /[;"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export class AdminPlus {
  constructor(
    private svc: Services,
    private provisioning: Provisioning,
    private auth: Auth,
  ) {}

  async health(actorId: string) {
    await this.provisioning.requireSuperAdmin(actorId);
    const one = async (sql: string, params: unknown[] = []) =>
      Number((await this.svc.db.one<{ n: number | string }>(sql, params))?.n ?? 0);
    const accounts = {
      total: await one("SELECT count(*) AS n FROM users WHERE NOT is_ai"),
      active: await one("SELECT count(*) AS n FROM users WHERE NOT is_ai AND status = 'active'"),
      invited: await one("SELECT count(*) AS n FROM users WHERE NOT is_ai AND status = 'invited'"),
      suspended: await one("SELECT count(*) AS n FROM users WHERE NOT is_ai AND status = 'suspended'"),
      pending: await one("SELECT count(*) AS n FROM users WHERE NOT is_ai AND status = 'pending'"),
      without_mfa_admins: await one(
        `SELECT count(DISTINCT u.id) AS n FROM users u
          WHERE NOT u.is_ai AND u.status = 'active' AND NOT u.totp_enabled
            AND (u.platform_role = 'super_admin'
                 OR EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = u.id AND om.role IN ('owner', 'admin')))`,
      ),
      never_logged: await one(
        "SELECT count(*) AS n FROM users u WHERE NOT u.is_ai AND u.status = 'active' AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)",
      ),
    };
    const sessions = {
      // Une session inactive depuis plus de 7 jours ne sert plus : elle n'est pas comptée (AD-6)
      active: await one(
        "SELECT count(*) AS n FROM sessions WHERE revoked_at IS NULL AND NOT mfa_pending AND expires_at > now() AND last_seen_at > now() - interval '7 days'",
      ),
      users: await one(
        "SELECT count(DISTINCT user_id) AS n FROM sessions WHERE revoked_at IS NULL AND NOT mfa_pending AND expires_at > now() AND last_seen_at > now() - interval '7 days'",
      ),
    };
    const orgsMail = await this.svc.db.query<{ name: string; host: string | null; on: boolean | null }>(
      "SELECT name, settings->'mail'->'smtp'->>'host' AS host, (settings->'mail'->>'notifications')::boolean AS on FROM organizations",
    );
    const mail = {
      configured: !!process.env.SMTP_URL || orgsMail.some((o) => !!o.host),
      sent_7d: await one(
        "SELECT count(*) AS n FROM email_log WHERE status = 'sent' AND created_at > now() - interval '7 days'",
      ),
      failed_7d: await one(
        "SELECT count(*) AS n FROM email_log WHERE status = 'failed' AND created_at > now() - interval '7 days'",
      ),
    };
    const sizes = await this.svc.db.query<{ n: number | string; bytes: number | string | null }>(
      `SELECT count(*) AS n, sum(size) AS bytes FROM attachments
       UNION ALL SELECT count(*), sum(size) FROM dossier_documents
       UNION ALL SELECT count(*), sum(octet_length(data)) FROM partner_documents
       UNION ALL SELECT count(*), sum(size) FROM meeting_documents`,
    );
    const storage = {
      files: sizes.reduce((s, r) => s + Number(r.n), 0),
      bytes: sizes.reduce((s, r) => s + Number(r.bytes ?? 0), 0),
    };
    const volumes = {
      organizations: await one("SELECT count(*) AS n FROM organizations"),
      units: await one("SELECT count(*) AS n FROM org_units"),
      projects: await one("SELECT count(*) AS n FROM projects WHERE kind = 'project'"),
      tasks: await one("SELECT count(*) AS n FROM tasks"),
      tasks_late: await one("SELECT count(*) AS n FROM tasks WHERE NOT completed AND due_on < $1::date", [localDate()]),
      meetings: await one("SELECT count(*) AS n FROM meetings"),
      decisions: await one("SELECT count(*) AS n FROM dg_decisions"),
      mail: await one("SELECT count(*) AS n FROM correspondence"),
      mail_late: await one(
        "SELECT count(*) AS n FROM correspondence WHERE status NOT IN ('traite', 'classe') AND due_on < $1::date",
        [localDate()],
      ),
      partners: await one("SELECT count(*) AS n FROM partners"),
      agents: await one("SELECT count(*) AS n FROM agent_records"),
    };
    const security = {
      failed_logins_24h: await one(
        "SELECT count(*) AS n FROM security_events WHERE kind = 'login.failed' AND created_at > now() - interval '24 hours'",
      ),
      locked_24h: await one(
        "SELECT count(*) AS n FROM security_events WHERE kind = 'account.locked' AND created_at > now() - interval '24 hours'",
      ),
    };
    // Ce qui mérite l'attention de l'administrateur, du plus grave au moins grave
    const alerts: { level: "danger" | "warning" | "info"; text: string }[] = [];
    if (security.locked_24h)
      alerts.push({ level: "danger", text: `${security.locked_24h} compte(s) verrouillé(s) en 24 h.` });
    if (security.failed_logins_24h >= 5)
      alerts.push({ level: "warning", text: `${security.failed_logins_24h} échecs de connexion en 24 h.` });
    if (accounts.without_mfa_admins)
      alerts.push({
        level: "warning",
        text: `${accounts.without_mfa_admins} compte(s) à droits élevés sans double authentification.`,
      });
    if (!mail.configured)
      alerts.push({
        level: "warning",
        text: "Aucune messagerie configurée : les notifications ne partent pas par courriel.",
      });
    if (mail.failed_7d)
      alerts.push({ level: "warning", text: `${mail.failed_7d} courriel(s) en échec cette semaine.` });
    if (accounts.pending) alerts.push({ level: "info", text: `${accounts.pending} demande(s) d'accès à traiter.` });
    if (accounts.invited)
      alerts.push({ level: "info", text: `${accounts.invited} compte(s) en attente de finalisation.` });
    return {
      generated_at: new Date().toISOString(),
      version: process.env.npm_package_version ?? "",
      accounts,
      sessions,
      mail,
      storage,
      volumes,
      security,
      alerts,
    };
  }

  async sessions(actorId: string) {
    await this.provisioning.requireSuperAdmin(actorId);
    return this.svc.db.query(
      `SELECT s.public_id AS id, s.user_id, u.name AS user_name, u.email, s.ip, s.user_agent, s.created_at, s.last_seen_at,
              s.expires_at, (s.user_id = $1) AS mine
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.revoked_at IS NULL AND s.expires_at > now() AND NOT s.mfa_pending
        ORDER BY s.last_seen_at DESC LIMIT 500`,
      [actorId],
    );
  }

  async revokeSession(actorId: string, publicId: string, ip: string) {
    await this.provisioning.requireSuperAdmin(actorId);
    const s = await this.svc.db.one<{ user_id: string }>(
      "UPDATE sessions SET revoked_at = now() WHERE public_id = $1 AND revoked_at IS NULL RETURNING user_id",
      [publicId],
    );
    if (!s) throw notFound("Session introuvable ou déjà fermée");
    await this.auth.record("session.revoked", { userId: s.user_id, actorId, ip, data: { session: publicId } });
    return { ok: true };
  }

  async banner() {
    const r = await this.svc.db.one<{ value: { text: string; level: string; updated_at: string } }>(
      "SELECT value FROM platform_settings WHERE key = 'banner'",
    );
    return r?.value?.text ? r.value : null;
  }
  async setBanner(actorId: string, i: { text: string; level?: "info" | "warning" | "danger" }, ip: string) {
    await this.provisioning.requireSuperAdmin(actorId);
    const value = { text: i.text.trim(), level: i.level ?? "info", updated_at: new Date().toISOString() };
    await this.svc.db.query(
      "INSERT INTO platform_settings (key, value) VALUES ('banner', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [JSON.stringify(value)],
    );
    await this.auth.record(value.text ? "platform.banner" : "platform.banner.removed", {
      actorId,
      ip,
      data: { text: value.text, level: value.level },
    });
    return value.text ? value : null;
  }

  /** Qui voit, fait et valide quoi : chaque profil de chaque institution, et combien de personnes le portent. */
  async rolesMatrix(actorId: string) {
    await this.provisioning.requireSuperAdmin(actorId);
    const profiles = await this.svc.db.query<{
      id: string;
      org_name: string;
      name: string;
      description: string;
      base_role: string;
      permissions: string[];
      is_system: boolean;
      members: number;
    }>(
      `SELECT p.id, o.name AS org_name, p.name, p.description, p.base_role, p.permissions, p.is_system,
              (SELECT count(*)::int FROM org_members om WHERE om.profile_id = p.id) AS members
         FROM access_profiles p JOIN organizations o ON o.id = p.org_id
        ORDER BY o.name, p.is_system DESC, p.created_at`,
    );
    return {
      groups: PERMISSION_GROUPS.map((g) => ({
        group: g.group,
        items: g.items.map((i) => ({ key: i.key, label: i.label })),
      })),
      profiles: profiles.map((p) => ({
        ...p,
        permissions:
          p.base_role === "owner" ? PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key)) : p.permissions,
      })),
    };
  }

  /** Les comptes de la plateforme, en tableau : l'export, quel que soit son format, est tracé. */
  async accountsTable(actorId: string, ip: string) {
    await this.provisioning.requireSuperAdmin(actorId);
    const rows = await this.svc.db.query<Record<string, unknown>>(
      `SELECT u.name, u.email, u.status, u.totp_enabled,
              (SELECT string_agg(o.name, ', ' ORDER BY o.name) FROM org_members om JOIN organizations o ON o.id = om.org_id WHERE om.user_id = u.id) AS orgs,
              (SELECT string_agg(p.name, ', ' ORDER BY p.name) FROM org_members om JOIN access_profiles p ON p.id = om.profile_id WHERE om.user_id = u.id) AS profiles,
              (SELECT max(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS last_login
         FROM users u WHERE NOT u.is_ai ORDER BY u.name`,
    );
    const STATUS: Record<string, string> = {
      active: "Actif",
      invited: "Invité",
      pending: "À valider",
      suspended: "Suspendu",
      rejected: "Refusé",
    };
    const head = ["Nom", "Adresse", "État", "Institutions", "Profils", "Double authentification", "Dernière connexion"];
    const table = rows.map((r) => [
      String(r.name ?? ""),
      String(r.email ?? ""),
      STATUS[String(r.status)] ?? String(r.status),
      String(r.orgs ?? ""),
      String(r.profiles ?? ""),
      r.totp_enabled ? "Oui" : "Non",
      r.last_login ? new Date(String(r.last_login)).toISOString().slice(0, 16).replace("T", " ") : "Jamais",
    ]);
    await this.auth.record("accounts.exported", { actorId, ip, data: { lines: rows.length } });
    return { head, rows: table };
  }

  async accountsCsv(actorId: string, ip: string) {
    const t = await this.accountsTable(actorId, ip);
    return `﻿${[t.head, ...t.rows].map((r) => r.map(csvCell).join(";")).join("\n")}\n`;
  }
}

type Id = { Params: { id: string } };
/** Les comptes de la plateforme, au format choisi (Excel, PDF, Word, CSV) : l'export est tracé. */
async function accountsDoc(a: AdminPlus, actorId: string, ip: string): Promise<ExportDoc> {
  const { head, rows } = await a.accountsTable(actorId, ip);
  return {
    title: "Comptes de la plateforme",
    filename: "comptes",
    landscape: true,
    sections: [{ heading: "Comptes", blocks: [{ kind: "table", head, rows, widths: [3, 4, 1.5, 4, 3, 2, 2.5] }] }],
  };
}
export function adminPlusRoutes(r: FastifyInstance, a: AdminPlus) {
  r.get("/api/admin/health", async (req) => a.health(req.userId));
  r.get("/api/admin/sessions", async (req) => a.sessions(req.userId));
  r.delete<Id>("/api/admin/sessions/:id", async (req) => a.revokeSession(req.userId, req.params.id, req.ip));
  r.get("/api/platform/banner", async () => a.banner());
  r.put("/api/admin/banner", async (req) =>
    a.setBanner(
      req.userId,
      z.object({ text: z.string().max(500), level: z.enum(["info", "warning", "danger"]).optional() }).parse(req.body),
      req.ip,
    ),
  );
  r.get("/api/admin/roles-matrix", async (req) => a.rolesMatrix(req.userId));
  r.get("/api/admin/accounts/export", async (req, reply) =>
    sendExport(reply, await accountsDoc(a, req.userId, req.ip), formatOf(req.query, ["xlsx", "pdf", "docx", "csv"])),
  );
  r.get("/api/admin/accounts.csv", async (req, reply) =>
    reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="comptes.csv"')
      .send(await a.accountsCsv(req.userId, req.ip)),
  );
}
