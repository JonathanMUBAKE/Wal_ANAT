import { uid } from "./db.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, type Services, localDate } from "./services.js";

export type DecisionStatus = "a_executer" | "en_cours" | "executee" | "remplacee";
interface Decision {
  id: string;
  org_id: string;
  year: number;
  seq: number;
  title: string;
  content: string;
  decided_on: string;
  project_id: string | null;
  activity_id: string | null;
  meeting_id: string | null;
  source_label: string;
  owner_id: string | null;
  due_on: string | null;
  confidential: boolean;
  status: DecisionStatus;
  execution_note: string;
  executed_at: string | null;
  replaces_id: string | null;
  recorded_by: string | null;
  created_at: string;
}
export interface DecisionInput {
  title: string;
  content: string;
  decided_on: string;
  project_id?: string | null;
  activity_id?: string | null;
  meeting_id?: string | null;
  owner_id?: string | null;
  due_on?: string | null;
  confidential?: boolean;
  replaces_id?: string | null;
}

export const decisionRef = (d: Pick<Decision, "year" | "seq">) => `DEC/${d.year}/${String(d.seq).padStart(4, "0")}`;
const day = () => localDate();
/** L'exécution n'avance que dans un sens. */
const STEP: Record<DecisionStatus, number> = { a_executer: 0, en_cours: 1, executee: 2, remplacee: 3 };

const SELECT = `SELECT d.*, o.name AS owner_name, r.name AS recorded_by_name,
  old.year AS old_year, old.seq AS old_seq, nxt.id AS replaced_by_id, nxt.year AS new_year, nxt.seq AS new_seq
  FROM dg_decisions d
  LEFT JOIN users o ON o.id = d.owner_id
  LEFT JOIN users r ON r.id = d.recorded_by
  LEFT JOIN dg_decisions old ON old.id = d.replaces_id
  LEFT JOIN dg_decisions nxt ON nxt.replaces_id = d.id`;
type Row = Decision & {
  owner_name: string | null;
  recorded_by_name: string | null;
  old_year: number | null;
  old_seq: number | null;
  replaced_by_id: string | null;
  new_year: number | null;
  new_seq: number | null;
};

/** Registre des décisions de la DG : l'IA peut préparer, seul un humain habilité enregistre ; le texte est figé. */
export class Decisions {
  constructor(private svc: Services) {}

  private view(d: Row, today = day()) {
    const { old_year, old_seq, new_year, new_seq, ...rest } = d;
    const source = d.project_id
      ? { kind: "project" as const, id: d.project_id, href: `/projects/${d.project_id}/dashboard` }
      : d.activity_id
        ? { kind: "activity" as const, id: d.activity_id, href: `/activites/${d.activity_id}` }
        : d.meeting_id
          ? { kind: "meeting" as const, id: d.meeting_id, href: `/reunions/${d.meeting_id}` }
          : null;
    return {
      ...rest,
      reference: decisionRef(d),
      source: source && { ...source, label: d.source_label },
      replaces_reference: old_year ? decisionRef({ year: old_year, seq: old_seq ?? 0 }) : null,
      replaced_by_reference: new_year ? decisionRef({ year: new_year, seq: new_seq ?? 0 }) : null,
      late: !!d.due_on && d.due_on < today && (d.status === "a_executer" || d.status === "en_cours"),
    };
  }

  private async manager(actorId: string, orgId: string) {
    return (await this.svc.permissionsOf(actorId, orgId)).includes("decisions.record");
  }

  private async row(id: string) {
    const d = await this.svc.db.one<Row>(`${SELECT} WHERE d.id = $1`, [id]);
    if (!d) throw notFound("Décision introuvable");
    return d;
  }

  /** Le chargé d'exécution et l'auteur voient toujours leur décision ; les autres selon le droit et la confidentialité. */
  private async readable(actorId: string, id: string) {
    const d = await this.row(id);
    const mine = d.owner_id === actorId || d.recorded_by === actorId;
    if (!mine) {
      await this.svc.requirePerm(actorId, d.org_id, "decisions.view");
      if (d.confidential && !(await this.manager(actorId, d.org_id))) throw notFound("Décision introuvable");
    }
    return d;
  }

  async list(actorId: string, orgId: string, f: { status?: DecisionStatus } = {}) {
    await this.svc.requirePerm(actorId, orgId, "decisions.view");
    const manager = await this.manager(actorId, orgId);
    const rows = await this.svc.db.query<Row>(
      `${SELECT} WHERE d.org_id = $1 AND (NOT d.confidential OR $2 OR d.owner_id = $3 OR d.recorded_by = $3)
       AND ($4::text IS NULL OR d.status = $4) ORDER BY d.year DESC, d.seq DESC`,
      [orgId, manager, actorId, f.status ?? null],
    );
    const today = day();
    return rows.map((r) => this.view(r, today));
  }

  async get(actorId: string, id: string) {
    const d = await this.readable(actorId, id);
    const manager = await this.manager(actorId, d.org_id);
    const open = d.status === "a_executer" || d.status === "en_cours";
    return {
      ...this.view(d),
      can: { execute: open && (manager || d.owner_id === actorId), replace: manager && d.status !== "remplacee" },
    };
  }

  /** Dossier d'origine : il doit appartenir à l'organisation ; sa confidentialité se transmet à la décision. */
  private async source(orgId: string, i: DecisionInput) {
    const db = this.svc.db;
    if (i.project_id) {
      const p = await db.one<{ name: string }>("SELECT name FROM projects WHERE org_id = $1 AND id = $2", [
        orgId,
        i.project_id,
      ]);
      if (!p) throw badRequest("Projet inconnu dans cette organisation");
      return { label: p.name, confidential: false };
    }
    if (i.activity_id) {
      const a = await db.one<{ title: string; confidential: boolean }>(
        "SELECT title, confidential FROM agency_activities WHERE org_id = $1 AND id = $2",
        [orgId, i.activity_id],
      );
      if (!a) throw badRequest("Activité inconnue dans cette organisation");
      return { label: a.title, confidential: a.confidential };
    }
    if (i.meeting_id) {
      const m = await db.one<{ meeting_type: string; meeting_date: string; confidential: boolean }>(
        "SELECT meeting_type, meeting_date, confidential FROM meetings WHERE org_id = $1 AND id = $2",
        [orgId, i.meeting_id],
      );
      if (!m) throw badRequest("Réunion inconnue dans cette organisation");
      return { label: `${m.meeting_type} du ${m.meeting_date}`, confidential: m.confidential };
    }
    return { label: "", confidential: false };
  }

  async record(actorId: string, orgId: string, i: DecisionInput, opts: { viaValidation?: boolean } = {}) {
    // L'IA propose, un humain décide : aucun coéquipier IA n'inscrit une décision au registre
    if ((await this.svc.userOrNull(actorId))?.is_ai)
      throw forbidden("Une décision de la DG est enregistrée par une personne, jamais par un coéquipier IA");
    // L'inscription d'une décision de séance est un effet de la validation du compte rendu, portée par le valideur
    if (!opts.viaValidation) await this.svc.requirePerm(actorId, orgId, "decisions.record");
    for (const d of [i.decided_on, i.due_on]) if (d && !isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    if (i.decided_on > day()) throw badRequest("La date de la décision ne peut pas être dans le futur");
    if (i.due_on && i.due_on < i.decided_on) throw badRequest("L'échéance d'exécution précède la date de la décision");
    if ([i.project_id, i.activity_id, i.meeting_id].filter(Boolean).length > 1)
      throw badRequest("Une décision se rattache à un seul dossier : projet, activité ou réunion");
    if (i.owner_id) {
      const owner = await this.svc.userOrNull(i.owner_id);
      const role = await this.svc.orgRole(i.owner_id, orgId);
      if (!owner || owner.is_ai || !role || role === "guest")
        throw badRequest("Le chargé d'exécution doit être une personne membre de l'organisation");
    }
    const src = await this.source(orgId, i);
    let old: Row | undefined;
    if (i.replaces_id) {
      old = await this.svc.db.one<Row>(`${SELECT} WHERE d.org_id = $1 AND d.id = $2`, [orgId, i.replaces_id]);
      if (!old) throw badRequest("La décision à remplacer est introuvable");
      if (old.status === "remplacee") throw new HttpError(409, "Cette décision a déjà été remplacée");
    }
    const id = uid("dec");
    const year = Number(i.decided_on.slice(0, 4));
    const confidential = !!i.confidential || src.confidential || !!old?.confidential;
    for (let attempt = 0; ; attempt++) {
      try {
        await this.svc.db.tx(async (q) => {
          await q.query(
            `INSERT INTO dg_decisions (id, org_id, year, seq, title, content, decided_on, project_id, activity_id, meeting_id, source_label, owner_id, due_on, confidential, replaces_id, recorded_by)
             VALUES ($1,$2,$3,(SELECT COALESCE(max(seq),0)+1 FROM dg_decisions WHERE org_id = $2 AND year = $3),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
            [
              id,
              orgId,
              year,
              i.title.trim(),
              i.content.trim(),
              i.decided_on,
              i.project_id ?? null,
              i.activity_id ?? null,
              i.meeting_id ?? null,
              src.label,
              i.owner_id ?? null,
              i.due_on ?? null,
              confidential,
              i.replaces_id ?? null,
              actorId,
            ],
          );
          // La décision attendue du dossier est levée : elle est désormais au registre
          if (i.project_id) await q.query("UPDATE projects SET decision_needed = '' WHERE id = $1", [i.project_id]);
          if (i.activity_id)
            await q.query("UPDATE agency_activities SET decision_needed = '' WHERE id = $1", [i.activity_id]);
          if (old) {
            const done = await q.query(
              "UPDATE dg_decisions SET status = 'remplacee' WHERE id = $1 AND status <> 'remplacee' RETURNING id",
              [old.id],
            );
            if (!done.length) throw new HttpError(409, "Cette décision a déjà été remplacée");
          }
        });
        break;
      } catch (e) {
        const err = e as { code?: string; constraint?: string };
        if (err.code === "23505" && err.constraint === "dg_decisions_replaces_uq")
          throw new HttpError(409, "Cette décision a déjà été remplacée");
        if (err.code !== "23505" || attempt >= 8) throw e;
      }
    }
    const d = await this.row(id);
    await this.svc.log(actorId, "decision.recorded", {
      orgId,
      projectId: i.project_id ?? null,
      data: { id, reference: decisionRef(d), replaces: i.replaces_id ?? null },
    });
    if (i.owner_id && i.owner_id !== actorId)
      await this.svc.notify(i.owner_id, orgId, {
        kind: "decision.assigned",
        title: `Décision à exécuter : ${d.title}`,
        body: `${decisionRef(d)}${d.due_on ? ` · échéance ${d.due_on}` : ""}`,
        actor_id: actorId,
      });
    if (old?.owner_id && old.owner_id !== actorId && old.owner_id !== i.owner_id)
      await this.svc.notify(old.owner_id, orgId, {
        kind: "decision.replaced",
        title: `Décision remplacée : ${old.title}`,
        body: `${decisionRef(old)} est remplacée par ${decisionRef(d)}`,
        actor_id: actorId,
      });
    return this.get(actorId, id);
  }

  /** Seule l'exécution avance, et toujours vers l'avant ; une décision exécutée ou remplacée est close. */
  async execute(actorId: string, id: string, i: { status: "en_cours" | "executee"; note?: string }) {
    const d = await this.readable(actorId, id);
    if (d.owner_id !== actorId && !(await this.manager(actorId, d.org_id)))
      throw forbidden("Seul le chargé d'exécution ou le secrétariat de la DG fait avancer une décision");
    if (d.status === "executee" || d.status === "remplacee")
      throw new HttpError(
        409,
        d.status === "executee" ? "Cette décision est déjà exécutée" : "Cette décision a été remplacée",
      );
    if (STEP[i.status] <= STEP[d.status])
      throw new HttpError(409, "L'exécution d'une décision ne revient pas en arrière");
    const moved = await this.svc.db.one(
      `UPDATE dg_decisions SET status = $1, execution_note = CASE WHEN $2::text IS NULL THEN execution_note ELSE $2 END,
        executed_at = CASE WHEN $1 = 'executee' THEN now() ELSE executed_at END
       WHERE id = $3 AND status = $4 RETURNING id`,
      [i.status, i.note?.trim() ?? null, id, d.status],
    );
    if (!moved) throw new HttpError(409, "La décision a changé entre-temps, rechargez la page");
    await this.svc.log(actorId, "decision.execution", {
      orgId: d.org_id,
      data: { id, reference: decisionRef(d), status: i.status },
    });
    if (i.status === "executee" && d.recorded_by && d.recorded_by !== actorId)
      await this.svc.notify(d.recorded_by, d.org_id, {
        kind: "decision.executed",
        title: `Décision exécutée : ${d.title}`,
        body: `${decisionRef(d)}${i.note?.trim() ? ` · ${i.note.trim()}` : ""}`,
        actor_id: actorId,
      });
    return this.get(actorId, id);
  }

  /** Lecture pour le tableau de bord : dernières décisions visibles et décisions en retard d'exécution. */
  async summary(actorId: string, orgId: string) {
    const perms = await this.svc.permissionsOf(actorId, orgId);
    if (!perms.includes("decisions.view") && !perms.includes("decisions.record"))
      return { recent: [], late: 0, open: 0 };
    const all = await this.list(actorId, orgId);
    return {
      recent: all.slice(0, 5).map((d) => ({
        id: d.id,
        reference: d.reference,
        title: d.title,
        decided_on: d.decided_on,
        status: d.status,
        owner_name: d.owner_name,
        due_on: d.due_on,
        late: d.late,
      })),
      late: all.filter((d) => d.late).length,
      open: all.filter((d) => d.status === "a_executer" || d.status === "en_cours").length,
    };
  }
}
