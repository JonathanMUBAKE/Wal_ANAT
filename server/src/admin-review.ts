import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Audit, AuditEntry } from "./audit.js";
import { uid } from "./db.js";
import { forbidden, type Services } from "./services.js";

/*
 * Contrôle croisé de l'administration (thème 2 de l'analyse, AD-1). L'administrateur système (le responsable
 * informatique) gère comptes, profils et plateforme ; une autre personne, la DG, relit le journal de ses actions
 * depuis la dernière relecture et le vise. L'administrateur ne relit jamais ses propres actions.
 */
export class AdminReview {
  constructor(
    private svc: Services,
    private audit: Audit,
  ) {}

  private async admins() {
    return this.svc.db.query<{ id: string; name: string; title: string | null }>(
      "SELECT id, name, title FROM users WHERE platform_role = 'super_admin' AND status = 'active' ORDER BY name",
    );
  }

  private async lastReview(orgId: string) {
    return (
      (await this.svc.db.one<{
        id: string;
        reviewer_id: string | null;
        reviewer_name: string | null;
        period_end: string;
        count: number;
        comment: string;
        created_at: string;
      }>(
        `SELECT r.*, u.name AS reviewer_name FROM admin_reviews r LEFT JOIN users u ON u.id = r.reviewer_id
          WHERE r.org_id = $1 ORDER BY r.created_at DESC LIMIT 1`,
        [orgId],
      )) ?? null
    );
  }

  private async assertReviewer(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "audit.review");
    if ((await this.admins()).some((a) => a.id === actorId))
      throw forbidden("L'administrateur système ne relit pas ses propres actions : une autre personne le fait");
  }

  /** Les actions des administrateurs depuis la dernière relecture, et l'historique des relectures. */
  async pending(actorId: string, orgId: string) {
    await this.assertReviewer(actorId, orgId);
    const admins = await this.admins();
    const last = await this.lastReview(orgId);
    const since = last ? new Date(last.period_end).getTime() : 0;
    const entries: AuditEntry[] = [];
    for (const a of admins)
      for (const e of (await this.audit.list({ actor_id: a.id, limit: 500 })).entries)
        if (new Date(e.created_at).getTime() > since && (!e.org_id || e.org_id === orgId)) entries.push(e);
    entries.sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
    const history = await this.svc.db.query(
      `SELECT r.id, r.reviewer_id, u.name AS reviewer_name, r.period_end, r.count, r.comment, r.created_at
         FROM admin_reviews r LEFT JOIN users u ON u.id = r.reviewer_id WHERE r.org_id = $1
        ORDER BY r.created_at DESC LIMIT 12`,
      [orgId],
    );
    return { admins, last_review: last, entries: entries.slice(0, 300), count: entries.length, history };
  }

  /** Viser le journal : la relecture couvre tout ce qui précède, elle est tracée et l'administrateur en est prévenu. */
  async review(actorId: string, orgId: string, comment = "") {
    const current = await this.pending(actorId, orgId);
    const end = new Date().toISOString();
    await this.svc.db.query(
      "INSERT INTO admin_reviews (id, org_id, reviewer_id, period_end, count, comment) VALUES ($1,$2,$3,$4,$5,$6)",
      [uid("arv"), orgId, actorId, end, current.count, comment.trim()],
    );
    await this.svc.log(actorId, "admin.journal.reviewed", {
      orgId,
      data: { count: current.count, comment: comment.trim() },
    });
    const reviewer = (await this.svc.user(actorId)).name;
    for (const a of current.admins)
      await this.svc.notify(a.id, orgId, {
        kind: "admin.journal.reviewed",
        title: `Journal d'administration relu par ${reviewer}`,
        body: `${current.count} action${current.count > 1 ? "s" : ""} relue${current.count > 1 ? "s" : ""}${comment.trim() ? ` · ${comment.trim()}` : ""}`,
        actor_id: actorId,
      });
    return this.pending(actorId, orgId);
  }
}

export function adminReviewRoutes(r: FastifyInstance, a: AdminReview) {
  r.get("/api/org/admin-review", async (req) => a.pending(req.userId, req.orgId));
  r.post("/api/org/admin-review", async (req) =>
    a.review(req.userId, req.orgId, z.object({ comment: z.string().max(2000).optional() }).parse(req.body ?? {}).comment),
  );
}
