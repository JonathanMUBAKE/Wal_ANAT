import { uid } from "./db.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, type Services } from "./services.js";

export const DOMAIN_ROLES = ["responsable", "contributeur", "consulte", "validateur", "informe"] as const;
export const RELATION_KINDS = [
  "hierarchique",
  "appui",
  "consultation",
  "validation",
  "coordination",
  "information",
] as const;
export type DomainRole = (typeof DOMAIN_ROLES)[number];
export type RelationKind = (typeof RELATION_KINDS)[number];

export interface Domain {
  id: string;
  org_id: string;
  name: string;
  description: string;
  archived: boolean;
}
export interface Sheet {
  id: string;
  org_id: string;
  unit_id: string | null;
  user_id: string | null;
  version: number;
  mission: string;
  legal_ref: string;
  valid_from: string | null;
  valid_to: string | null;
  status: "draft" | "approved" | "archived";
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
}
export interface SheetInput {
  unit_id?: string | null;
  user_id?: string | null;
  mission: string;
  legal_ref?: string;
  valid_from?: string | null;
  valid_to?: string | null;
  domains: { domain_id: string; role: DomainRole }[];
  relations: { target_unit_id: string; kind: RelationKind; domain_id?: string | null; note?: string }[];
}

const notDraft = () => new HttpError(409, "Cette fiche est approuvée : créez une nouvelle version pour la modifier");

export class Attributions {
  constructor(private svc: Services) {}

  // ---------------------------------------------------------------- catalogue des domaines
  async domains(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "attributions.view");
    return this.svc.db.query<Domain>("SELECT * FROM activity_domains WHERE org_id = $1 ORDER BY archived, name", [
      orgId,
    ]);
  }

  async createDomain(actorId: string, orgId: string, input: { name: string; description?: string }) {
    await this.svc.requirePerm(actorId, orgId, "attributions.manage");
    const id = uid("dom");
    try {
      await this.svc.db.query("INSERT INTO activity_domains (id, org_id, name, description) VALUES ($1,$2,$3,$4)", [
        id,
        orgId,
        input.name.trim(),
        input.description ?? "",
      ]);
    } catch (e) {
      if ((e as { code?: string }).code === "23505")
        throw new HttpError(409, "Ce domaine existe déjà dans le catalogue");
      throw e;
    }
    await this.svc.log(actorId, "domain.created", { orgId, data: { id, name: input.name } });
    return this.svc.db.one<Domain>("SELECT * FROM activity_domains WHERE id = $1", [id]);
  }

  async updateDomain(actorId: string, id: string, patch: { name?: string; description?: string; archived?: boolean }) {
    const d = await this.svc.db.one<Domain>("SELECT * FROM activity_domains WHERE id = $1", [id]);
    if (!d) throw notFound("Domaine introuvable");
    await this.svc.requirePerm(actorId, d.org_id, "attributions.manage");
    return this.svc.db.one<Domain>(
      "UPDATE activity_domains SET name = $1, description = $2, archived = $3 WHERE id = $4 RETURNING *",
      [patch.name?.trim() ?? d.name, patch.description ?? d.description, patch.archived ?? d.archived, id],
    );
  }

  // ---------------------------------------------------------------- fiches
  private async row(id: string) {
    const s = await this.svc.db.one<Sheet>("SELECT * FROM attribution_sheets WHERE id = $1", [id]);
    if (!s) throw notFound("Fiche introuvable");
    return s;
  }

  async list(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "attributions.view");
    return this.svc.db.query<
      Sheet & { unit_name: string | null; user_name: string | null; domain_count: number; relation_count: number }
    >(
      `SELECT s.*, ou.name AS unit_name, u.name AS user_name,
        (SELECT count(*)::int FROM sheet_domains d WHERE d.sheet_id = s.id) AS domain_count,
        (SELECT count(*)::int FROM sheet_relations r WHERE r.sheet_id = s.id) AS relation_count
       FROM attribution_sheets s LEFT JOIN org_units ou ON ou.id = s.unit_id LEFT JOIN users u ON u.id = s.user_id
       WHERE s.org_id = $1 AND s.status <> 'archived' ORDER BY COALESCE(ou.name, u.name), s.version DESC`,
      [orgId],
    );
  }

  async get(actorId: string, id: string) {
    const s = await this.row(id);
    await this.svc.requirePerm(actorId, s.org_id, "attributions.view");
    const perms = await this.svc.permissionsOf(actorId, s.org_id);
    const [domains, relations] = await Promise.all([
      this.svc.db.query<{ domain_id: string; role: DomainRole; name: string }>(
        "SELECT sd.domain_id, sd.role, d.name FROM sheet_domains sd JOIN activity_domains d ON d.id = sd.domain_id WHERE sd.sheet_id = $1 ORDER BY d.name",
        [id],
      ),
      this.svc.db.query<{
        target_unit_id: string;
        kind: RelationKind;
        domain_id: string | null;
        note: string;
        target_name: string;
        domain_name: string | null;
      }>(
        `SELECT r.target_unit_id, r.kind, r.domain_id, r.note, ou.name AS target_name, d.name AS domain_name
         FROM sheet_relations r JOIN org_units ou ON ou.id = r.target_unit_id LEFT JOIN activity_domains d ON d.id = r.domain_id
         WHERE r.sheet_id = $1 ORDER BY ou.name`,
        [id],
      ),
    ]);
    return {
      ...s,
      domains,
      relations,
      can: {
        edit: s.status === "draft" && perms.includes("attributions.manage"),
        approve: s.status === "draft" && perms.includes("attributions.approve") && s.created_by !== actorId,
        version: s.status === "approved" && perms.includes("attributions.manage"),
      },
    };
  }

  private async assertContent(orgId: string, input: Omit<SheetInput, "unit_id" | "user_id">) {
    for (const d of [input.valid_from, input.valid_to])
      if (d && !isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
    if (input.valid_from && input.valid_to && input.valid_to < input.valid_from)
      throw badRequest("La fin de validité précède son début");
    const ids = new Set(
      (
        await this.svc.db.query<{ id: string }>("SELECT id FROM activity_domains WHERE org_id = $1 AND NOT archived", [
          orgId,
        ])
      ).map((r) => r.id),
    );
    const units = new Set(
      (await this.svc.db.query<{ id: string }>("SELECT id FROM org_units WHERE org_id = $1", [orgId])).map((r) => r.id),
    );
    const seen = new Set<string>();
    for (const d of input.domains) {
      if (!ids.has(d.domain_id)) throw badRequest("Domaine inconnu du catalogue");
      if (seen.has(d.domain_id)) throw badRequest("Un domaine ne peut figurer qu'une fois sur la fiche");
      seen.add(d.domain_id);
    }
    for (const r of input.relations) {
      if (!units.has(r.target_unit_id)) throw badRequest("Entité liée inconnue");
      if (r.domain_id && !ids.has(r.domain_id)) throw badRequest("Domaine inconnu du catalogue");
    }
  }

  private async writeLines(q: Pick<Services["db"], "query">, orgId: string, id: string, input: SheetInput) {
    await q.query("DELETE FROM sheet_domains WHERE sheet_id = $1", [id]);
    await q.query("DELETE FROM sheet_relations WHERE sheet_id = $1", [id]);
    for (const d of input.domains)
      await q.query("INSERT INTO sheet_domains (id, org_id, sheet_id, domain_id, role) VALUES ($1,$2,$3,$4,$5)", [
        uid("sdm"),
        orgId,
        id,
        d.domain_id,
        d.role,
      ]);
    for (const r of input.relations)
      await q.query(
        "INSERT INTO sheet_relations (id, org_id, sheet_id, target_unit_id, kind, domain_id, note) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [uid("srl"), orgId, id, r.target_unit_id, r.kind, r.domain_id ?? null, r.note ?? ""],
      );
  }

  /**
   * Une fiche se rédige pour son périmètre : son entité, celles qui lui sont rattachées et leurs agents ; le pilotage
   * partout (contrôle des testeurs).
   */
  private async assertSheetScope(actorId: string, orgId: string, unitId: string | null, userId: string | null) {
    const scope = await this.svc.scopeOf(actorId, orgId);
    if (scope.wide) return;
    const managed = (
      await this.svc.db.query<{ id: string }>(
        `WITH RECURSIVE down(id) AS (
           SELECT id FROM org_units WHERE org_id = $1 AND manager_id = $2
           UNION SELECT u.id FROM org_units u JOIN down ON u.parent_id = down.id
         ) SELECT id FROM down`,
        [orgId, actorId],
      )
    ).map((r) => r.id);
    const target = unitId
      ? unitId
      : (await this.svc.db.one<{ unit_id: string | null }>("SELECT unit_id FROM org_members WHERE org_id = $1 AND user_id = $2", [orgId, userId]))?.unit_id ?? null;
    if (!target || !managed.includes(target)) throw forbidden("Cette fiche ne relève pas de votre périmètre");
  }

  async create(actorId: string, orgId: string, input: SheetInput) {
    await this.svc.requirePerm(actorId, orgId, "attributions.manage");
    const unitId = input.unit_id ?? null;
    const userId = input.user_id ?? null;
    if (!unitId === !userId) throw badRequest("Une fiche porte sur une seule entité ou une seule personne");
    await this.assertSheetScope(actorId, orgId, unitId, userId);
    if (unitId && !(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [orgId, unitId])))
      throw badRequest("Entité inconnue");
    if (userId && !(await this.svc.orgRole(userId, orgId)))
      throw badRequest("Cette personne n'appartient pas à l'organisation");
    await this.assertContent(orgId, input);
    const id = uid("sht");
    try {
      await this.svc.db.tx(async (q) => {
        const last = await q.query<{ v: number }>(
          "SELECT COALESCE(max(version), 0)::int AS v FROM attribution_sheets WHERE org_id = $1 AND unit_id IS NOT DISTINCT FROM $2 AND user_id IS NOT DISTINCT FROM $3",
          [orgId, unitId, userId],
        );
        await q.query(
          "INSERT INTO attribution_sheets (id, org_id, unit_id, user_id, version, mission, legal_ref, valid_from, valid_to, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          [
            id,
            orgId,
            unitId,
            userId,
            (last[0]?.v ?? 0) + 1,
            input.mission.trim(),
            input.legal_ref ?? "",
            input.valid_from ?? null,
            input.valid_to ?? null,
            actorId,
          ],
        );
        await this.writeLines(q, orgId, id, input);
      });
    } catch (e) {
      if ((e as { code?: string }).code === "23505")
        throw new HttpError(409, "Une version en préparation existe déjà pour cette entité");
      throw e;
    }
    await this.svc.log(actorId, "attribution.created", { orgId, data: { id } });
    return this.get(actorId, id);
  }

  async update(actorId: string, id: string, input: SheetInput) {
    const s = await this.row(id);
    await this.svc.requirePerm(actorId, s.org_id, "attributions.manage");
    await this.assertSheetScope(actorId, s.org_id, s.unit_id, s.user_id);
    if (s.status !== "draft") throw notDraft();
    await this.assertContent(s.org_id, input);
    await this.svc.db.tx(async (q) => {
      await q.query(
        "UPDATE attribution_sheets SET mission = $1, legal_ref = $2, valid_from = $3, valid_to = $4, updated_at = now() WHERE id = $5",
        [input.mission.trim(), input.legal_ref ?? "", input.valid_from ?? null, input.valid_to ?? null, id],
      );
      await this.writeLines(q, s.org_id, id, input);
    });
    return this.get(actorId, id);
  }

  async remove(actorId: string, id: string) {
    const s = await this.row(id);
    await this.svc.requirePerm(actorId, s.org_id, "attributions.manage");
    await this.assertSheetScope(actorId, s.org_id, s.unit_id, s.user_id);
    if (s.status !== "draft") throw notDraft();
    await this.svc.db.query("DELETE FROM attribution_sheets WHERE id = $1", [id]);
    await this.svc.log(actorId, "attribution.deleted", { orgId: s.org_id, data: { id } });
  }

  /** Approuver archive la version précédente : l'historique reste, une seule version fait foi. */
  async approve(actorId: string, id: string) {
    const s = await this.row(id);
    await this.svc.requirePerm(actorId, s.org_id, "attributions.approve");
    if (s.status !== "draft") throw notDraft();
    if (s.created_by === actorId) throw forbidden("Le rédacteur d'une fiche ne peut pas l'approuver lui-même");
    const n = await this.svc.db.one<{ n: number }>("SELECT count(*)::int AS n FROM sheet_domains WHERE sheet_id = $1", [
      id,
    ]);
    if (!n?.n) throw badRequest("La fiche doit comporter au moins un domaine d'activité");
    await this.svc.db.tx(async (q) => {
      await q.query(
        "UPDATE attribution_sheets SET status = 'archived', updated_at = now() WHERE org_id = $1 AND status = 'approved' AND unit_id IS NOT DISTINCT FROM $2 AND user_id IS NOT DISTINCT FROM $3",
        [s.org_id, s.unit_id, s.user_id],
      );
      await q.query(
        "UPDATE attribution_sheets SET status = 'approved', approved_by = $1, approved_at = now(), updated_at = now() WHERE id = $2",
        [actorId, id],
      );
    });
    await this.svc.log(actorId, "attribution.approved", { orgId: s.org_id, data: { id, version: s.version } });
    return this.get(actorId, id);
  }
}
