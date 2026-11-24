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
  /** Confirmation après coup par la DG d'une décision inscrite par son secrétariat (DEC-1). */
  confirmed_by: string | null;
  confirmed_at: string | null;
  /** Le chargé a déclaré l'exécution : elle attend la confirmation du secrétariat de la DG (DEC-3). */
  execution_declared_by: string | null;
  execution_declared_at: string | null;
  execution_confirmed_by: string | null;
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
  /** Décision sans exécution à suivre (prise de position, orientation) : ni chargé ni échéance (DEC-2). */
  no_execution?: boolean;
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
/**
 * Une décision concerne la personne ($2) quand elle en est chargée ou l'a inscrite, ou que son dossier d'origine la
 * concerne : projet dont elle est membre, activité de son périmètre ($3 : ses entités), réunion où elle siégeait.
 */
const concerns = (me: string, units: string) => `(d.owner_id = ${me} OR d.recorded_by = ${me}
  OR EXISTS (SELECT 1 FROM memberships ms WHERE ms.project_id = d.project_id AND ms.user_id = ${me})
  OR EXISTS (SELECT 1 FROM agency_activities aa WHERE aa.id = d.activity_id AND (aa.lead_id = ${me} OR aa.unit_id = ANY(${units}::text[])))
  OR EXISTS (SELECT 1 FROM meetings mt WHERE mt.id = d.meeting_id AND (mt.writer_id = ${me} OR mt.chair_id = ${me}
     OR EXISTS (SELECT 1 FROM meeting_attendees x WHERE x.meeting_id = mt.id AND x.user_id = ${me}))))`;
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
      to_confirm: !d.confirmed_at && d.status !== "remplacee",
    };
  }

  private async confirmer(actorId: string, orgId: string) {
    return (await this.svc.permissionsOf(actorId, orgId)).includes("decisions.confirm");
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
      const manager = await this.manager(actorId, d.org_id);
      if (d.confidential && !manager) throw notFound("Décision introuvable");
      // Un agent voit les décisions qui le concernent (DEC-6)
      if (!manager) {
        const s = await this.svc.scopeOf(actorId, d.org_id);
        const rows = await this.svc.db.query(`${SELECT} WHERE d.id = $1 AND ${concerns("$2", "$3")}`, [id, actorId, s.units]);
        if (!s.wide && !rows.length) throw notFound("Décision introuvable");
      }
    }
    return d;
  }

  async list(actorId: string, orgId: string, f: { status?: DecisionStatus } = {}) {
    await this.svc.requirePerm(actorId, orgId, "decisions.view");
    const manager = await this.manager(actorId, orgId);
    const scope = await this.svc.scopeOf(actorId, orgId);
    const rows = await this.svc.db.query<Row>(
      `${SELECT} WHERE d.org_id = $1 AND (NOT d.confidential OR $2 OR d.owner_id = $3 OR d.recorded_by = $3)
       AND ($4::text IS NULL OR d.status = $4)
       AND ($2 OR $5 OR ${concerns("$3", "$6")})
       ORDER BY d.year DESC, d.seq DESC`,
      [orgId, manager, actorId, f.status ?? null, scope.wide, scope.units],
    );
    const today = day();
    return rows.map((r) => this.view(r, today));
  }

  async get(actorId: string, id: string) {
    const d = await this.readable(actorId, id);
    const manager = await this.manager(actorId, d.org_id);
    const open = d.status === "a_executer" || d.status === "en_cours";
    const declared = !!d.execution_declared_at;
    return {
      ...this.view(d),
      can: {
        execute: open && !declared && (manager || d.owner_id === actorId),
        // Deux pas distincts : le secrétariat met en route, le chargé déclare l'exécution faite (DEC-3). Les
        // confondre faisait proposer au secrétariat une déclaration que le serveur refuse (execute, ci-dessous).
        start: open && !declared && (manager || d.owner_id === actorId) && d.status === "a_executer",
        declare:
          open &&
          !declared &&
          (manager || d.owner_id === actorId) &&
          (!d.owner_id || d.owner_id === actorId) &&
          !!d.confirmed_at,
        confirm_execution: open && declared && manager && d.execution_declared_by !== actorId,
        confirm: !d.confirmed_at && d.status !== "remplacee" && (await this.confirmer(actorId, d.org_id)),
        replace: manager && d.status !== "remplacee",
      },
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
    // Une décision est suivie jusqu'à son exécution : chargé et échéance, sauf décision sans exécution (DEC-2).
    // Une décision de séance qui n'en désigne pas est inscrite comme décision sans exécution.
    let noExecution = !!i.no_execution;
    if (!noExecution && (!i.owner_id || !i.due_on)) {
      if (opts.viaValidation) noExecution = true;
      else
        throw badRequest(
          "Une décision a un chargé d'exécution et une échéance ; sinon, marquez-la « sans exécution »",
        );
    }
    if (noExecution) i = { ...i, owner_id: null, due_on: null };
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
    let closed: { requested_by: string | null; question: string }[] = [];
    const year = Number(i.decided_on.slice(0, 4));
    const confidential = !!i.confidential || src.confidential || !!old?.confidential;
    // Inscrite par la DG : confirmée d'emblée ; par son secrétariat : numérotée, puis confirmée après coup (DEC-1)
    const confirmedNow = await this.confirmer(actorId, orgId);
    for (let attempt = 0; ; attempt++) {
      try {
        await this.svc.db.tx(async (q) => {
          await q.query(
            `INSERT INTO dg_decisions (id, org_id, year, seq, title, content, decided_on, project_id, activity_id, meeting_id, source_label, owner_id, due_on, confidential, replaces_id, recorded_by, confirmed_by, confirmed_at, no_execution, status, executed_at)
             VALUES ($1,$2,$3,(SELECT COALESCE(max(seq),0)+1 FROM dg_decisions WHERE org_id = $2 AND year = $3),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
               CASE WHEN $18 THEN 'executee' ELSE 'a_executer' END, CASE WHEN $18 THEN now() ELSE NULL END)`,
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
              confirmedNow ? actorId : null,
              confirmedNow ? new Date().toISOString() : null,
              noExecution,
            ],
          );
          // La décision attendue du dossier est levée par une décision de la DG elle-même : une inscription du
          // secrétariat ne la lève qu'à la confirmation (contrôle des testeurs)
          if (confirmedNow && i.project_id) await q.query("UPDATE projects SET decision_needed = '' WHERE id = $1", [i.project_id]);
          if (confirmedNow && i.activity_id)
            await q.query("UPDATE agency_activities SET decision_needed = '' WHERE id = $1", [i.activity_id]);
          // Une seule porte : la décision de la DG inscrite sur un dossier tranche l'arbitrage qui y était en attente,
          // jamais au profit de celui qui l'a demandé
          if (confirmedNow && (i.project_id || i.activity_id))
            closed = await q.query<{ requested_by: string | null; question: string }>(
              `UPDATE project_arbitrations SET status = 'tranche', decision_id = $2, decided_by = $3, decided_at = now(),
                 decision_note = CASE WHEN decision_note = '' THEN 'Tranché par une décision inscrite au registre' ELSE decision_note END
               WHERE org_id = $1 AND status = 'en_attente' AND (project_id = $4 OR activity_id = $5)
                 AND requested_by IS DISTINCT FROM $3
               RETURNING requested_by, question`,
              [orgId, id, actorId, i.project_id ?? null, i.activity_id ?? null],
            );
          if (old && confirmedNow) {
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
    for (const c of closed)
      if (c.requested_by && c.requested_by !== actorId)
        await this.svc.notify(c.requested_by, orgId, {
          kind: "arbitration.decided",
          title: `Arbitrage rendu : ${c.question}`,
          body: `${decisionRef(d)} · ${d.title}`,
          actor_id: actorId,
          link: "/decisions",
          category: "decisions",
        });
    await this.svc.log(actorId, "decision.recorded", {
      orgId,
      projectId: i.project_id ?? null,
      data: { id, reference: decisionRef(d), replaces: i.replaces_id ?? null },
    });
    if (!confirmedNow)
      for (const to of await this.confirmers(orgId, actorId))
        await this.svc.notify(to, orgId, {
          kind: "decision.to_confirm",
          title: `Décision inscrite en votre nom, à confirmer : ${d.title}`,
          body: `${decisionRef(d)} · inscrite par ${(await this.svc.user(actorId)).name}`,
          actor_id: actorId,
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
    if (d.execution_declared_at) throw new HttpError(409, "L'exécution est déclarée : elle attend la confirmation du secrétariat de la DG");
    if (i.status === "executee" && !d.confirmed_at)
      throw new HttpError(409, "La DG n'a pas encore confirmé cette décision : son exécution ne se déclare pas");
    // Le secrétariat ne déclare pas à la place du chargé : il confirme ce que le chargé a déclaré (contrôle des testeurs)
    if (i.status === "executee" && d.owner_id && d.owner_id !== actorId)
      throw forbidden("Le chargé d'exécution déclare l'exécution ; le secrétariat de la DG la confirme ensuite");
    // Le chargé déclare l'exécution ; le secrétariat de la DG la confirme (DEC-3)
    if (i.status === "executee" && !(await this.manager(actorId, d.org_id))) return this.declare(actorId, d, i.note);
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

  private async declare(actorId: string, d: Row, note?: string) {
    const moved = await this.svc.db.one(
      `UPDATE dg_decisions SET status = 'en_cours', execution_declared_by = $1, execution_declared_at = now(),
        execution_note = CASE WHEN $2::text IS NULL THEN execution_note ELSE $2 END
       WHERE id = $3 AND status = $4 AND execution_declared_at IS NULL RETURNING id`,
      [actorId, note?.trim() ?? null, d.id, d.status],
    );
    if (!moved) throw new HttpError(409, "La décision a changé entre-temps, rechargez la page");
    await this.svc.log(actorId, "decision.execution_declared", {
      orgId: d.org_id,
      data: { id: d.id, reference: decisionRef(d), note: note?.trim() ?? "" },
    });
    for (const to of await this.secretariat(d.org_id, actorId))
      await this.svc.notify(to, d.org_id, {
        kind: "decision.execution_declared",
        title: `Exécution déclarée, à confirmer : ${d.title}`,
        body: `${decisionRef(d)}${note?.trim() ? ` · ${note.trim()}` : ""}`,
        actor_id: actorId,
      });
    return this.get(actorId, d.id);
  }

  /** Qui tient le registre (secrétariat de la DG et DG), sauf l'auteur du geste. */
  private async secretariat(orgId: string, except: string) {
    const out: string[] = [];
    const members = await this.svc.db.query<{ user_id: string }>(
      "SELECT om.user_id FROM org_members om JOIN users u ON u.id = om.user_id WHERE om.org_id = $1 AND NOT u.is_ai AND u.status = 'active'",
      [orgId],
    );
    for (const m of members)
      if (m.user_id !== except && (await this.manager(m.user_id, orgId))) out.push(m.user_id);
    return out;
  }
  private async confirmers(orgId: string, except: string) {
    const out: string[] = [];
    for (const id of await this.secretariat(orgId, except)) if (await this.confirmer(id, orgId)) out.push(id);
    return out;
  }

  /** Le secrétariat de la DG confirme l'exécution déclarée par le chargé : la décision est close. */
  async confirmExecution(actorId: string, id: string) {
    const d = await this.readable(actorId, id);
    if (!(await this.manager(actorId, d.org_id)))
      throw forbidden("Seul le secrétariat de la DG confirme l'exécution d'une décision");
    if (!d.execution_declared_at) throw badRequest("Aucune exécution n'a été déclarée pour cette décision");
    if (d.execution_declared_by === actorId)
      throw forbidden("Celui qui déclare l'exécution ne la confirme pas : une autre personne du secrétariat le fait");
    const moved = await this.svc.db.one(
      `UPDATE dg_decisions SET status = 'executee', executed_at = now(), execution_confirmed_by = $1
       WHERE id = $2 AND status = 'en_cours' AND execution_declared_at IS NOT NULL RETURNING id`,
      [actorId, id],
    );
    if (!moved) throw new HttpError(409, "La décision a changé entre-temps, rechargez la page");
    await this.svc.log(actorId, "decision.execution_confirmed", {
      orgId: d.org_id,
      data: { id, reference: decisionRef(d) },
    });
    for (const to of new Set([d.execution_declared_by, d.recorded_by]))
      if (to && to !== actorId)
        await this.svc.notify(to, d.org_id, {
          kind: to === d.execution_declared_by ? "decision.execution_confirmed" : "decision.executed",
          title: `Décision exécutée : ${d.title}`,
          body: `${decisionRef(d)}${d.execution_note ? ` · ${d.execution_note}` : ""}`,
          actor_id: actorId,
        });
    return this.get(actorId, id);
  }

  /** Le secrétariat renvoie l'exécution déclarée, avec un motif : la décision reste en cours. */
  async returnExecution(actorId: string, id: string, comment: string) {
    const d = await this.readable(actorId, id);
    if (!(await this.manager(actorId, d.org_id)))
      throw forbidden("Seul le secrétariat de la DG renvoie l'exécution d'une décision");
    if (!d.execution_declared_at) throw badRequest("Aucune exécution n'a été déclarée pour cette décision");
    const why = comment.trim();
    if (!why) throw badRequest("Dites ce qui manque : le motif du renvoi est obligatoire");
    await this.svc.db.query(
      "UPDATE dg_decisions SET execution_declared_at = NULL, execution_declared_by = NULL WHERE id = $1",
      [id],
    );
    await this.svc.log(actorId, "decision.execution_returned", {
      orgId: d.org_id,
      data: { id, reference: decisionRef(d), comment: why },
    });
    if (d.execution_declared_by && d.execution_declared_by !== actorId)
      await this.svc.notify(d.execution_declared_by, d.org_id, {
        kind: "decision.execution_returned",
        title: `Exécution renvoyée : ${d.title}`,
        body: `${decisionRef(d)} · ${why}`,
        actor_id: actorId,
      });
    return this.get(actorId, id);
  }

  /** La DG confirme après coup une décision inscrite en son nom (DEC-1). */
  async confirm(actorId: string, id: string) {
    const d = await this.readable(actorId, id);
    if (!(await this.confirmer(actorId, d.org_id)))
      throw forbidden("Seule la DG confirme une décision inscrite en son nom");
    if (d.status === "remplacee") throw new HttpError(409, "Cette décision a été remplacée");
    const done = await this.svc.db.one(
      "UPDATE dg_decisions SET confirmed_by = $1, confirmed_at = now() WHERE id = $2 AND confirmed_at IS NULL RETURNING id",
      [actorId, id],
    );
    if (!done) throw new HttpError(409, "Cette décision est déjà confirmée");
    // Le remplacement prend effet à la confirmation de la DG (contrôle des testeurs)
    const replaces = await this.svc.db.one<{ replaces_id: string | null }>("SELECT replaces_id FROM dg_decisions WHERE id = $1", [id]);
    if (replaces?.replaces_id)
      await this.svc.db.query("UPDATE dg_decisions SET status = 'remplacee' WHERE id = $1 AND status <> 'remplacee'", [
        replaces.replaces_id,
      ]);
    await this.svc.log(actorId, "decision.confirmed", { orgId: d.org_id, data: { id, reference: decisionRef(d) } });
    if (d.recorded_by && d.recorded_by !== actorId)
      await this.svc.notify(d.recorded_by, d.org_id, {
        kind: "decision.confirmed",
        title: `Décision confirmée par la DG : ${d.title}`,
        body: decisionRef(d),
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
