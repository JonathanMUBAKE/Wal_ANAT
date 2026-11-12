import { uid } from "./db.js";
import { notFound, type Services, localDate } from "./services.js";

export type GapKind =
  | "absence"
  | "consultation_omise"
  | "reunion_incomplete"
  | "hors_attribution"
  | "chevauchement"
  | "concentration";
interface Found {
  fingerprint: string;
  kind: GapKind;
  unit_id: string | null;
  domain_id: string | null;
  summary: string;
  evidence: { type: string; id: string; label: string }[];
}
interface Holder {
  unit_id: string;
  unit_name: string;
  domain_id: string;
  domain_name: string;
  role: string;
}
const CONCENTRATION_MIN_ACTIONS = 5;
const CONCENTRATION_SHARE = 0.8;

/**
 * Compare les attributions approuvées à l'activité enregistrée. Le constat vient de règles fixes et vérifiables,
 * chaque écart cite ses preuves, et l'analyse reste au niveau des entités : jamais une note de personne.
 */
export class Gaps {
  constructor(private svc: Services) {}

  async list(actorId: string, orgId: string, f: { status?: string }) {
    await this.svc.requirePerm(actorId, orgId, "pilotage.view");
    return this.svc.db.query(
      `SELECT g.*, ou.name AS unit_name, d.name AS domain_name, u.name AS decided_by_name FROM participation_gaps g
       LEFT JOIN org_units ou ON ou.id = g.unit_id LEFT JOIN activity_domains d ON d.id = g.domain_id LEFT JOIN users u ON u.id = g.decided_by
       WHERE g.org_id = $1 AND ($2::text IS NULL OR g.status = $2) ORDER BY g.status = 'open' DESC, g.detected_at DESC`,
      [orgId, f.status ?? null],
    );
  }

  async decide(actorId: string, id: string, i: { status: "justified" | "to_fix" | "review"; note: string }) {
    const g = await this.svc.db.one<{ org_id: string }>("SELECT org_id FROM participation_gaps WHERE id = $1", [id]);
    if (!g) throw notFound("Écart introuvable");
    await this.svc.requirePerm(actorId, g.org_id, "attributions.manage");
    await this.svc.db.query(
      "UPDATE participation_gaps SET status = $1, note = $2, decided_by = $3, decided_at = now() WHERE id = $4",
      [i.status, i.note.trim(), actorId, id],
    );
    await this.svc.log(actorId, "gap.decided", { orgId: g.org_id, data: { id, status: i.status } });
    return (await this.list(actorId, g.org_id, {})).find((x) => (x as { id: string }).id === id);
  }

  private async findAll(orgId: string, days: number): Promise<Found[]> {
    const db = this.svc.db;
    const since = localDate(new Date(Date.now() - days * 864e5));
    const holders = await db.query<Holder>(
      `SELECT s.unit_id, ou.name AS unit_name, sd.domain_id, d.name AS domain_name, sd.role FROM attribution_sheets s
       JOIN sheet_domains sd ON sd.sheet_id = s.id JOIN activity_domains d ON d.id = sd.domain_id JOIN org_units ou ON ou.id = s.unit_id
       WHERE s.org_id = $1 AND s.status = 'approved' AND s.unit_id IS NOT NULL AND (s.valid_to IS NULL OR s.valid_to >= CURRENT_DATE) AND NOT d.archived`,
      [orgId],
    );
    const found: Found[] = [];
    const responsibles = holders.filter((h) => h.role === "responsable");

    // Toute action enregistrée, par couple entité-domaine
    const actions = await db.query<{ unit_id: string; domain_id: string; type: string; id: string; label: string }>(
      `SELECT p.unit_id, a.domain_id, 'plan' AS type, a.id, a.title AS label FROM plan_activities a JOIN work_plans p ON p.id = a.plan_id WHERE a.org_id = $1 AND a.domain_id IS NOT NULL
       UNION ALL SELECT x.unit_id, x.domain_id, 'activite', x.id, x.title FROM agency_activities x WHERE x.org_id = $1 AND x.unit_id IS NOT NULL AND x.domain_id IS NOT NULL AND (x.start_on IS NULL OR x.start_on >= $2::date)
       UNION ALL SELECT om.unit_id, p.domain_id, 'tache', t.id, t.title FROM tasks t JOIN projects p ON p.id = t.project_id JOIN org_members om ON om.user_id = t.assignee_id AND om.org_id = p.org_id WHERE p.org_id = $1 AND p.domain_id IS NOT NULL AND om.unit_id IS NOT NULL AND t.updated_at >= $2::date
       UNION ALL SELECT DISTINCT om.unit_id, i.domain_id, 'reunion', m.id, m.meeting_type FROM meeting_agenda_items i JOIN meetings m ON m.id = i.meeting_id JOIN meeting_attendees a ON a.meeting_id = m.id AND a.presence IN ('present','represente') JOIN org_members om ON om.user_id = a.user_id AND om.org_id = m.org_id WHERE m.org_id = $1 AND i.domain_id IS NOT NULL AND om.unit_id IS NOT NULL AND m.meeting_date >= $2::date`,
      [orgId, since],
    );
    const key = (u: string, d: string) => `${u}|${d}`;
    const byPair = new Map<string, typeof actions>();
    for (const a of actions)
      byPair.set(key(a.unit_id, a.domain_id), [...(byPair.get(key(a.unit_id, a.domain_id)) ?? []), a]);
    const ev = (a: (typeof actions)[number]) => ({ type: a.type, id: a.id, label: a.label });

    // Absence : un responsable sans aucune action sur la période
    for (const h of responsibles)
      if (!byPair.has(key(h.unit_id, h.domain_id)))
        found.push({
          fingerprint: `absence:${h.unit_id}:${h.domain_id}`,
          kind: "absence",
          unit_id: h.unit_id,
          domain_id: h.domain_id,
          summary: `${h.unit_name} est responsable du domaine « ${h.domain_name} » et n'y a aucune action enregistrée depuis ${days} jours.`,
          evidence: [],
        });

    // Chevauchement : deux responsables déclarés pour un même domaine
    const perDomain = new Map<string, Holder[]>();
    for (const h of responsibles) perDomain.set(h.domain_id, [...(perDomain.get(h.domain_id) ?? []), h]);
    for (const [domainId, list] of perDomain)
      if (list.length > 1)
        found.push({
          fingerprint: `chevauchement:${domainId}`,
          kind: "chevauchement",
          unit_id: null,
          domain_id: domainId,
          summary: `Le domaine « ${list[0].domain_name} » a ${list.length} entités responsables : ${list.map((h) => h.unit_name).join(", ")}.`,
          evidence: list.map((h) => ({ type: "fiche", id: h.unit_id, label: h.unit_name })),
        });

    // Réunion incomplète : un point du domaine traité sans l'entité responsable
    const items = await db.query<{
      id: string;
      subject: string;
      domain_id: string;
      meeting_id: string;
      meeting_type: string;
      units: string[];
    }>(
      `SELECT i.id, i.subject, i.domain_id, m.id AS meeting_id, m.meeting_type,
        ARRAY(SELECT om.unit_id FROM meeting_attendees a JOIN org_members om ON om.user_id = a.user_id AND om.org_id = m.org_id WHERE a.meeting_id = m.id AND a.presence IN ('present','represente') AND om.unit_id IS NOT NULL) AS units
       FROM meeting_agenda_items i JOIN meetings m ON m.id = i.meeting_id WHERE m.org_id = $1 AND i.domain_id IS NOT NULL AND m.meeting_date >= $2::date AND m.status <> 'planned' AND m.status <> 'cancelled'`,
      [orgId, since],
    );
    for (const i of items)
      for (const h of responsibles.filter((r) => r.domain_id === i.domain_id))
        if (!i.units.includes(h.unit_id))
          found.push({
            fingerprint: `reunion:${i.id}:${h.unit_id}`,
            kind: "reunion_incomplete",
            unit_id: h.unit_id,
            domain_id: i.domain_id,
            summary: `« ${i.subject} » a été traité en ${i.meeting_type} sans ${h.unit_name}, responsable du domaine.`,
            evidence: [{ type: "reunion", id: i.meeting_id, label: i.meeting_type }],
          });

    // Hors attribution : une entité dotée d'une fiche agit sur un domaine qui n'y figure pas
    const withSheet = new Set(holders.map((h) => h.unit_id));
    const known = new Set(holders.map((h) => key(h.unit_id, h.domain_id)));
    const names = new Map(
      (await db.query<{ id: string; name: string }>("SELECT id, name FROM org_units WHERE org_id = $1", [orgId])).map(
        (u) => [u.id, u.name],
      ),
    );
    const domainNames = new Map(
      (
        await db.query<{ id: string; name: string }>("SELECT id, name FROM activity_domains WHERE org_id = $1", [orgId])
      ).map((d) => [d.id, d.name]),
    );
    for (const a of actions)
      if (
        (a.type === "plan" || a.type === "activite") &&
        withSheet.has(a.unit_id) &&
        !known.has(key(a.unit_id, a.domain_id))
      )
        found.push({
          fingerprint: `hors:${a.type}:${a.id}`,
          kind: "hors_attribution",
          unit_id: a.unit_id,
          domain_id: a.domain_id,
          summary: `${names.get(a.unit_id)} porte « ${a.label} » alors que le domaine « ${domainNames.get(a.domain_id)} » ne figure pas dans ses attributions.`,
          evidence: [ev(a)],
        });

    // Consultation omise : un document avance sans l'entité dont l'avis est obligatoire
    const relations = await db.query<{
      unit_id: string;
      target_unit_id: string;
      domain_id: string | null;
      target_name: string;
    }>(
      `SELECT s.unit_id, r.target_unit_id, r.domain_id, ou.name AS target_name FROM sheet_relations r JOIN attribution_sheets s ON s.id = r.sheet_id JOIN org_units ou ON ou.id = r.target_unit_id
       WHERE s.org_id = $1 AND s.status = 'approved' AND s.unit_id IS NOT NULL AND r.kind IN ('consultation', 'validation')`,
      [orgId],
    );
    const docs = await db.query<{ id: string; title: string; unit_id: string; domain_id: string; units: string[] }>(
      `SELECT d.id, d.title, d.unit_id, d.domain_id,
        ARRAY(SELECT om.unit_id FROM sign_steps s JOIN org_members om ON om.user_id = s.actor_id AND om.org_id = d.org_id WHERE s.document_id = d.id AND om.unit_id IS NOT NULL) AS units
       FROM sign_documents d WHERE d.org_id = $1 AND d.status IN ('in_circuit', 'signed') AND d.unit_id IS NOT NULL AND d.domain_id IS NOT NULL AND d.created_at >= $2::date`,
      [orgId, since],
    );
    for (const d of docs)
      for (const r of relations.filter((x) => x.unit_id === d.unit_id && (!x.domain_id || x.domain_id === d.domain_id)))
        if (!d.units.includes(r.target_unit_id))
          found.push({
            fingerprint: `consultation:${d.id}:${r.target_unit_id}`,
            kind: "consultation_omise",
            unit_id: d.unit_id,
            domain_id: d.domain_id,
            summary: `« ${d.title} » avance dans le circuit sans ${r.target_name}, dont l'intervention est prévue par les attributions.`,
            evidence: [{ type: "document", id: d.id, label: d.title }],
          });

    // Concentration : une seule entité porte presque tout un domaine partagé
    const sharers = new Map<string, Holder[]>();
    for (const h of holders.filter((x) => x.role === "responsable" || x.role === "contributeur"))
      sharers.set(h.domain_id, [...(sharers.get(h.domain_id) ?? []), h]);
    for (const [domainId, list] of sharers) {
      if (list.length < 2) continue;
      const counts = list.map((h) => ({ h, n: byPair.get(key(h.unit_id, domainId))?.length ?? 0 }));
      const total = counts.reduce((s, c) => s + c.n, 0);
      const top = counts.reduce((a, b) => (b.n > a.n ? b : a));
      if (total >= CONCENTRATION_MIN_ACTIONS && top.n / total >= CONCENTRATION_SHARE)
        found.push({
          fingerprint: `concentration:${domainId}`,
          kind: "concentration",
          unit_id: top.h.unit_id,
          domain_id: domainId,
          summary: `${top.h.unit_name} porte ${top.n} des ${total} actions du domaine « ${top.h.domain_name} », partagé entre ${list.length} entités.`,
          evidence: counts.map((c) => ({ type: "compte", id: c.h.unit_id, label: `${c.h.unit_name} : ${c.n}` })),
        });
    }
    return found;
  }

  /** Un écart déjà tranché ne revient pas ; un écart ouvert qui a disparu passe à « résolu ». */
  async detect(actorId: string, orgId: string, days = 90) {
    await this.svc.requirePerm(actorId, orgId, "attributions.manage");
    const found = await this.findAll(orgId, days);
    const prints = found.map((f) => f.fingerprint);
    await this.svc.db.tx(async (q) => {
      for (const f of found)
        await q.query(
          `INSERT INTO participation_gaps (id, org_id, fingerprint, kind, unit_id, domain_id, summary, evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (org_id, fingerprint) DO UPDATE SET summary = EXCLUDED.summary, evidence = EXCLUDED.evidence, detected_at = now(),
             status = CASE WHEN participation_gaps.status = 'resolved' THEN 'open' ELSE participation_gaps.status END`,
          [uid("gap"), orgId, f.fingerprint, f.kind, f.unit_id, f.domain_id, f.summary, JSON.stringify(f.evidence)],
        );
      await q.query(
        "UPDATE participation_gaps SET status = 'resolved' WHERE org_id = $1 AND status = 'open' AND NOT (fingerprint = ANY($2))",
        [orgId, prints],
      );
    });
    await this.svc.log(actorId, "gap.detected", { orgId, data: { count: found.length } });
    return this.list(actorId, orgId, {});
  }
}
