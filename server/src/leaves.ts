import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { uid } from "./db.js";
import { badRequest, forbidden, notFound, today, workingDays, type Services } from "./services.js";

/*
 * RH, deuxième étape — congés et absences.
 *
 * L'agent demande (type, dates, motif, intérimaire éventuel). La demande va au chef de son entité, ou de l'entité
 * au-dessus quand il dirige la sienne ; sans chef, au service RH. Le valideur accepte ou refuse (motif obligatoire
 * pour un refus). Préparer n'est pas valider : personne ne décide de sa propre demande, ni de celle qu'il a saisie.
 * Le service RH (hr.manage) enregistre au nom d'un agent une absence constatée (maladie, mission…) : elle est
 * acquise d'emblée et l'agent en est prévenu. L'agent annule sa demande tant que le congé n'a pas commencé.
 *
 * Qui voit quoi : chacun ses demandes ; le chef, celles des agents de ses entités (et de leurs sous-entités) ;
 * hr.view / hr.manage, toutes. Toute écriture est journalisée et chaque étape prévient les intéressés.
 */

export const LEAVE_KINDS = [
  "conge_annuel",
  "maladie",
  "maternite",
  "paternite",
  "permission",
  "formation",
  "mission",
  "autre",
] as const;
export const LEAVE_LABELS: Record<(typeof LEAVE_KINDS)[number], string> = {
  conge_annuel: "Congé annuel",
  maladie: "Congé de maladie",
  maternite: "Congé de maternité",
  paternite: "Congé de paternité",
  permission: "Permission d'absence",
  formation: "Formation",
  mission: "Mission",
  autre: "Autre absence",
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const Ask = z.object({
  kind: z.enum(LEAVE_KINDS),
  start_on: date,
  end_on: date,
  reason: z.string().trim().max(2000).optional(),
  interim_id: z.string().max(100).nullable().optional(),
  /** Saisie au nom d'un agent : réservée au service RH. */
  user_id: z.string().max(100).optional(),
});
const Decide = z.object({ approve: z.boolean(), note: z.string().trim().max(2000).optional() });
const Cancel = z.object({ note: z.string().trim().max(2000).optional() });

export interface Leave {
  id: string;
  org_id: string;
  user_id: string;
  kind: (typeof LEAVE_KINDS)[number];
  start_on: string;
  end_on: string;
  days: number;
  reason: string;
  interim_id: string | null;
  approver_id: string | null;
  status: "demande" | "approuve" | "refuse" | "annule";
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string;
  created_by: string | null;
  created_at: string;
}

const COLS = `l.id, l.org_id, l.user_id, l.kind, to_char(l.start_on, 'YYYY-MM-DD') AS start_on,
  to_char(l.end_on, 'YYYY-MM-DD') AS end_on, l.days, l.reason, l.interim_id, l.approver_id, l.status, l.decided_by,
  l.decided_at, l.decision_note, l.created_by, l.created_at, u.name AS user_name, i.name AS interim_name,
  d.name AS decided_by_name, ou.name AS unit_name`;
const FROM = `agent_leaves l JOIN users u ON u.id = l.user_id
  LEFT JOIN users i ON i.id = l.interim_id LEFT JOIN users d ON d.id = l.decided_by
  LEFT JOIN org_members om ON om.org_id = l.org_id AND om.user_id = l.user_id
  LEFT JOIN org_units ou ON ou.id = om.unit_id`;
/** Les agents des entités que dirige $2 (et de leurs sous-entités), dans l'organisation $1. */
const TEAM_SQL = `WITH RECURSIVE down(id) AS (
    SELECT id FROM org_units WHERE org_id = $1 AND manager_id = $2
    UNION SELECT c.id FROM org_units c JOIN down ON c.parent_id = down.id
  ) SELECT om.user_id FROM org_members om WHERE om.org_id = $1 AND om.unit_id IN (SELECT id FROM down) AND om.user_id <> $2`;
const frDate = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export class Leaves {
  constructor(private svc: Services) {}

  /**
   * Catégorie protégée (santé) : la nature et le motif d'un congé de maladie restent à l'agent et au service RH ;
   * le chef et la direction voient une absence et ses dates, ce qui suffit à organiser le travail.
   */
  private async mask<T extends { user_id: string; kind: string; reason?: string }>(actorId: string, orgId: string, rows: T[]) {
    // Le service RH par sa fonction, pas le rôle de propriétaire qui ouvre tout : la DG voit l'absence, pas la maladie
    const manage = await this.svc.grantedByFunction(actorId, orgId, "hr.manage");
    return rows.map((r) =>
      r.user_id === actorId || manage || r.kind !== "maladie" ? r : { ...r, kind: "absence", reason: "" },
    );
  }

  /** Ce que `to` a le droit de lire d'une demande : le même masque que les écrans, pour tout ce qui sort en notification. */
  private async seenBy<T extends { user_id: string; kind: string; reason?: string; start_on: string; end_on: string }>(
    to: string,
    orgId: string,
    l: T,
  ) {
    const [shown] = await this.mask(to, orgId, [l]);
    const label = shown.kind === "absence" ? "Absence" : LEAVE_LABELS[shown.kind as keyof typeof LEAVE_LABELS];
    const what = `${label} du ${frDate(l.start_on)} au ${frDate(l.end_on)}`;
    return { what, reason: shown.reason ?? "", row: shown };
  }

  private async perms(actorId: string, orgId: string) {
    const p = await this.svc.permissionsOf(actorId, orgId);
    return { view: p.includes("hr.view") || p.includes("hr.manage"), manage: p.includes("hr.manage") };
  }

  /** Le chef de l'agent : celui de son entité, ou de l'entité au-dessus quand l'agent dirige la sienne. */
  async headOf(orgId: string, userId: string) {
    return (
      (
        await this.svc.db.one<{ manager_id: string }>(
          `WITH RECURSIVE up(id, manager_id, parent_id, depth) AS (
             SELECT u.id, u.manager_id, u.parent_id, 0 FROM org_units u
               JOIN org_members om ON om.unit_id = u.id AND om.org_id = $1 AND om.user_id = $2
             UNION SELECT p.id, p.manager_id, p.parent_id, up.depth + 1 FROM org_units p JOIN up ON p.id = up.parent_id
           ) SELECT manager_id FROM up WHERE manager_id IS NOT NULL AND manager_id <> $2 ORDER BY depth LIMIT 1`,
          [orgId, userId],
        )
      )?.manager_id ?? null
    );
  }
  private async heads(actorId: string, orgId: string, userId: string) {
    return !!(await this.svc.db.one(`SELECT 1 FROM (${TEAM_SQL}) t WHERE t.user_id = $3`, [orgId, actorId, userId]));
  }
  /** Les personnes du service RH (droit « tenir les dossiers ») : elles reçoivent ce qui n'a pas de chef. */
  async hrManagers(orgId: string) {
    const members = await this.svc.db.query<{ user_id: string }>(
      "SELECT om.user_id FROM org_members om JOIN users u ON u.id = om.user_id WHERE om.org_id = $1 AND NOT u.is_ai AND u.status = 'active'",
      [orgId],
    );
    const out: string[] = [];
    for (const m of members) if ((await this.perms(m.user_id, orgId)).manage) out.push(m.user_id);
    return out;
  }

  private async row(orgId: string, id: string) {
    const l = await this.svc.db.one<Leave & { user_name: string }>(
      `SELECT ${COLS} FROM ${FROM} WHERE l.org_id = $1 AND l.id = $2`,
      [orgId, id],
    );
    if (!l) throw notFound("Demande introuvable");
    return l;
  }
  private async canRead(actorId: string, l: Leave) {
    if (l.user_id === actorId || l.interim_id === actorId || l.approver_id === actorId) return true;
    if ((await this.perms(actorId, l.org_id)).view) return true;
    return this.heads(actorId, l.org_id, l.user_id);
  }
  /** Décider : le chef de l'agent ou le service RH ; jamais l'agent, jamais celui qui a saisi la demande. */
  private async canDecide(actorId: string, l: Leave) {
    if (l.user_id === actorId || l.created_by === actorId) return false;
    if (l.approver_id === actorId) return true;
    if ((await this.perms(actorId, l.org_id)).manage) return true;
    return this.heads(actorId, l.org_id, l.user_id);
  }

  async get(actorId: string, orgId: string, id: string) {
    const l = await this.row(orgId, id);
    if (!(await this.canRead(actorId, l))) throw forbidden("Cette demande ne vous est pas ouverte");
    const [shown] = await this.mask(actorId, orgId, [l]);
    return {
      ...shown,
      can: {
        decide: l.status === "demande" && (await this.canDecide(actorId, l)),
        cancel: await this.canCancel(actorId, l),
      },
    };
  }

  async list(actorId: string, orgId: string, f: { scope: "mine" | "team" | "all"; status?: string; on?: string }) {
    const params: unknown[] = [orgId, actorId];
    const where = ["l.org_id = $1"];
    if (f.scope === "mine") where.push("l.user_id = $2");
    else if (f.scope === "team") where.push(`l.user_id IN (${TEAM_SQL})`);
    else if (!(await this.perms(actorId, orgId)).view) throw forbidden("Réservé au service des ressources humaines");
    else where.push("$2::text IS NOT NULL");
    if (f.status) {
      params.push(f.status);
      where.push(`l.status = $${params.length}`);
    }
    if (f.on) {
      params.push(f.on);
      where.push(`l.start_on <= $${params.length}::date AND l.end_on >= $${params.length}::date`);
    }
    return this.mask(
      actorId,
      orgId,
      await this.svc.db.query<Leave>(
        `SELECT ${COLS} FROM ${FROM} WHERE ${where.join(" AND ")}
        ORDER BY (l.status = 'demande') DESC, l.start_on DESC LIMIT 500`,
        params,
      ),
    );
  }

  /** Ce que l'accueil et l'écran montrent d'un coup d'œil. */
  async summary(actorId: string, orgId: string) {
    const p = await this.perms(actorId, orgId);
    const year = today().slice(0, 4);
    const mine = await this.svc.db.one<{ pending: number; taken: number; upcoming: number }>(
      `SELECT count(*) FILTER (WHERE status = 'demande')::int AS pending,
              COALESCE(sum(days) FILTER (WHERE status = 'approuve' AND kind = 'conge_annuel' AND to_char(start_on, 'YYYY') = $3), 0)::int AS taken,
              count(*) FILTER (WHERE status = 'approuve' AND start_on > $4::date)::int AS upcoming
         FROM agent_leaves WHERE org_id = $1 AND user_id = $2`,
      [orgId, actorId, year, today()],
    );
    const scope = p.view ? "l.org_id = $1 AND $2::text IS NOT NULL" : `l.org_id = $1 AND l.user_id IN (${TEAM_SQL})`;
    const pending = await this.svc.db.query<Leave>(
      `SELECT ${COLS} FROM ${FROM} WHERE ${scope} AND l.status = 'demande'`,
      [orgId, actorId],
    );
    let toDecide = 0;
    for (const l of pending) if (await this.canDecide(actorId, l)) toDecide++;
    const absent = await this.svc.db.query<{ user_id: string; kind: string }>(
      `SELECT l.user_id, u.name AS user_name, l.kind, to_char(l.end_on, 'YYYY-MM-DD') AS end_on, l.interim_id, i.name AS interim_name
         FROM agent_leaves l JOIN users u ON u.id = l.user_id LEFT JOIN users i ON i.id = l.interim_id
        WHERE ${scope} AND l.status = 'approuve' AND l.start_on <= $3::date AND l.end_on >= $3::date
        ORDER BY u.name`,
      [orgId, actorId, today()],
    );
    return {
      mine,
      to_decide: toDecide,
      absent_today: await this.mask(actorId, orgId, absent),
      can: { all: p.view, manage: p.manage },
    };
  }

  async ask(actorId: string, orgId: string, input: z.infer<typeof Ask>) {
    const userId = input.user_id ?? actorId;
    const onBehalf = userId !== actorId;
    if (onBehalf && !(await this.perms(actorId, orgId)).manage)
      throw forbidden("Seul le service des ressources humaines enregistre une absence au nom d'un agent");
    if (!(await this.svc.db.one("SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2", [orgId, userId])))
      throw badRequest("Cette personne n'appartient pas à l'institution");
    if (input.end_on < input.start_on) throw badRequest("La date de fin doit suivre la date de début");
    if (input.interim_id) {
      if (input.interim_id === userId) throw badRequest("L'intérimaire est une autre personne");
      if (
        !(await this.svc.db.one("SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2", [
          orgId,
          input.interim_id,
        ]))
      )
        throw badRequest("L'intérimaire doit appartenir à l'institution");
    }
    const overlap = await this.svc.db.one<{ start_on: string; end_on: string }>(
      `SELECT to_char(start_on, 'YYYY-MM-DD') AS start_on, to_char(end_on, 'YYYY-MM-DD') AS end_on FROM agent_leaves
        WHERE org_id = $1 AND user_id = $2 AND status IN ('demande', 'approuve') AND start_on <= $4::date AND end_on >= $3::date`,
      [orgId, userId, input.start_on, input.end_on],
    );
    if (overlap)
      throw badRequest(
        `Ces dates chevauchent une autre demande (du ${frDate(overlap.start_on)} au ${frDate(overlap.end_on)})`,
      );
    const approver = onBehalf ? null : await this.headOf(orgId, userId);
    const id = uid("lv");
    await this.svc.db.query(
      `INSERT INTO agent_leaves (id, org_id, user_id, kind, start_on, end_on, days, reason, interim_id, approver_id, status,
         decided_by, decided_at, decision_note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id,
        orgId,
        userId,
        input.kind,
        input.start_on,
        input.end_on,
        workingDays(input.start_on, input.end_on),
        input.reason ?? "",
        input.interim_id ?? null,
        approver,
        onBehalf ? "approuve" : "demande",
        onBehalf ? actorId : null,
        onBehalf ? new Date().toISOString() : null,
        onBehalf ? "Enregistré par le service des ressources humaines" : "",
        actorId,
      ],
    );
    const l = await this.row(orgId, id);
    const what = `${LEAVE_LABELS[l.kind]} du ${frDate(l.start_on)} au ${frDate(l.end_on)}`;
    await this.svc.log(actorId, onBehalf ? "leave.recorded" : "leave.requested", {
      orgId,
      data: { leave_id: id, user_id: userId, kind: l.kind, start_on: l.start_on, end_on: l.end_on, days: l.days },
    });
    if (onBehalf) {
      await this.svc.notify(userId, orgId, {
        kind: "leave.recorded",
        title: `Absence enregistrée à votre dossier : ${what}`,
        body: input.reason || undefined,
        actor_id: actorId,
        link: "/conges",
      });
      await this.notifyInterim(actorId, l);
    } else {
      for (const to of approver ? [approver] : await this.hrManagers(orgId))
        if (to !== actorId) {
          const seen = await this.seenBy(to, orgId, l);
          await this.svc.notify(to, orgId, {
            kind: "leave.requested",
            title: `${l.user_name} demande : ${seen.what}`,
            body: `${l.days} jour(s) ouvré(s)${seen.reason ? ` · ${seen.reason}` : ""}. À valider ou refuser.`,
            actor_id: actorId,
            link: "/conges?onglet=valider",
          });
        }
    }
    return (await this.mask(actorId, orgId, [l]))[0];
  }

  private async notifyInterim(actorId: string, l: Leave & { user_name: string }) {
    if (l.interim_id && l.interim_id !== actorId) {
      const seen = await this.seenBy(l.interim_id, l.org_id, l);
      await this.svc.notify(l.interim_id, l.org_id, {
        kind: "leave.interim",
        title: `Vous assurez l'intérim de ${l.user_name}`,
        body: seen.what,
        actor_id: actorId,
        link: "/conges",
      });
    }
  }

  async decide(actorId: string, orgId: string, id: string, input: z.infer<typeof Decide>) {
    const l = await this.row(orgId, id);
    if (!(await this.canDecide(actorId, l)))
      throw forbidden(
        l.user_id === actorId || l.created_by === actorId
          ? "Vous ne pouvez pas valider une demande que vous avez faite ou saisie"
          : "Seul le chef de l'agent ou le service des ressources humaines décide de cette demande",
      );
    if (l.status !== "demande") throw badRequest("Cette demande a déjà été traitée");
    if (!input.approve && !input.note) throw badRequest("Indiquez le motif du refus");
    const status = input.approve ? "approuve" : "refuse";
    await this.svc.db.query(
      "UPDATE agent_leaves SET status = $3, decided_by = $4, decided_at = now(), decision_note = $5, updated_at = now() WHERE org_id = $1 AND id = $2",
      [orgId, id, status, actorId, input.note ?? ""],
    );
    const after = await this.row(orgId, id);
    const what = `${LEAVE_LABELS[l.kind]} du ${frDate(l.start_on)} au ${frDate(l.end_on)}`;
    await this.svc.log(actorId, input.approve ? "leave.approved" : "leave.refused", {
      orgId,
      data: { leave_id: id, user_id: l.user_id, note: input.note ?? "" },
    });
    await this.svc.notify(l.user_id, orgId, {
      kind: input.approve ? "leave.approved" : "leave.refused",
      title: input.approve ? `Demande accordée : ${what}` : `Demande refusée : ${what}`,
      body: input.note || undefined,
      actor_id: actorId,
      link: "/conges",
    });
    if (input.approve) await this.notifyInterim(actorId, after);
    return (await this.mask(actorId, orgId, [after]))[0];
  }

  private async canCancel(actorId: string, l: Leave) {
    if (!["demande", "approuve"].includes(l.status)) return false;
    if (l.user_id === actorId) return l.status === "demande" || l.start_on > today();
    return (await this.perms(actorId, l.org_id)).manage;
  }

  async cancel(actorId: string, orgId: string, id: string, input: z.infer<typeof Cancel>) {
    const l = await this.row(orgId, id);
    if (!(await this.canRead(actorId, l))) throw forbidden("Cette demande ne vous est pas ouverte");
    if (!(await this.canCancel(actorId, l)))
      throw l.user_id === actorId
        ? badRequest("Un congé commencé ou traité ne s'annule plus : adressez-vous au service des ressources humaines")
        : forbidden("Seul l'agent ou le service des ressources humaines annule cette demande");
    await this.svc.db.query(
      "UPDATE agent_leaves SET status = 'annule', decision_note = CASE WHEN $3 = '' THEN decision_note ELSE $3 END, updated_at = now() WHERE org_id = $1 AND id = $2",
      [orgId, id, input.note ?? ""],
    );
    await this.svc.log(actorId, "leave.cancelled", { orgId, data: { leave_id: id, user_id: l.user_id } });
    const told = new Set<string>();
    for (const to of [l.status === "approuve" ? (l.decided_by ?? l.approver_id) : l.approver_id, l.interim_id])
      if (to && to !== actorId && !told.has(to)) {
        told.add(to);
        const seen = await this.seenBy(to, orgId, l);
        await this.svc.notify(to, orgId, {
          kind: "leave.cancelled",
          title: `${l.user_name} a annulé : ${seen.what}`,
          body: input.note || undefined,
          actor_id: actorId,
          link: "/conges",
        });
      }
    if (l.user_id !== actorId)
      await this.svc.notify(l.user_id, orgId, {
        kind: "leave.cancelled",
        title: `Votre demande a été annulée : ${(await this.seenBy(l.user_id, orgId, l)).what}`,
        body: input.note || undefined,
        actor_id: actorId,
        link: "/conges",
      });
    return (await this.mask(actorId, orgId, [await this.row(orgId, id)]))[0];
  }
}

type Id = { Params: { id: string } };
export function leaveRoutes(r: FastifyInstance, leaves: Leaves) {
  r.get("/api/leaves", async (req) => {
    const q = z
      .object({
        scope: z.enum(["mine", "team", "all"]).default("mine"),
        status: z.enum(["demande", "approuve", "refuse", "annule"]).optional(),
        on: date.optional(),
      })
      .parse(req.query ?? {});
    return leaves.list(req.userId, req.orgId, q);
  });
  r.get("/api/leaves/summary", async (req) => leaves.summary(req.userId, req.orgId));
  r.post("/api/leaves", async (req) => leaves.ask(req.userId, req.orgId, Ask.parse(req.body)));
  r.get<Id>("/api/leaves/:id", async (req) => leaves.get(req.userId, req.orgId, req.params.id));
  r.post<Id>("/api/leaves/:id/decide", async (req) =>
    leaves.decide(req.userId, req.orgId, req.params.id, Decide.parse(req.body)),
  );
  r.post<Id>("/api/leaves/:id/cancel", async (req) =>
    leaves.cancel(req.userId, req.orgId, req.params.id, Cancel.parse(req.body ?? {})),
  );
}
