import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { uid } from "./db.js";
import type { Provisioning } from "./auth/provisioning.js";
import type { RequestInfo } from "./auth/service.js";
import { badRequest, forbidden, localDate, notFound, type Services } from "./services.js";

/*
 * Module RH — identification des agents (premier jet, appelé à grandir : carrière, congés, évaluation).
 *
 * Toute personne créée comme agent devient utilisatrice : son compte est ouvert avec le profil « Agent », elle
 * reçoit un lien pour choisir son mot de passe. Le dossier réunit l'identité, la situation administrative (statut,
 * grade, catégorie, échelon, fonction), l'affectation et son historique, les diplômes et les personnes à prévenir.
 *
 * Qui fait quoi : le service RH (hr.manage) crée et tient les dossiers ; hr.view les consulte tous ; l'agent lit
 * le sien sans pouvoir le modifier ; le chef d'une entité (ou d'une entité au-dessus) lit ceux de ses agents.
 * Personne ne modifie son propre dossier, pas même un gestionnaire RH : un autre gestionnaire s'en charge.
 * Toute écriture est journalisée.
 */

const STATUSES = ["fonctionnaire", "contractuel", "detache", "stagiaire", "consultant", "autre"] as const;
const PROFILE_OF_STATUS: Record<string, string> = { stagiaire: "stagiaire", consultant: "consultant" };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const txt = (max = 200) => z.string().trim().max(max);

const Identity = z.object({
  matricule: txt(40).optional(),
  civility: txt(20).optional(),
  last_name: txt(120).min(1, "Le nom est obligatoire"),
  first_names: txt(200).optional(),
  birth_date: date.nullable().optional(),
  birth_place: txt().optional(),
  nationality: txt(80).optional(),
  gender: z.enum(["", "F", "M"]).optional(),
  marital_status: txt(60).optional(),
  children_count: z.number().int().min(0).max(30).nullable().optional(),
  id_document_type: txt(80).optional(),
  id_document_number: txt(80).optional(),
  address: txt(500).optional(),
  phone: txt(60).optional(),
  personal_email: txt(320).optional(),
  status: z.enum(STATUSES).optional(),
  grade: txt(120).optional(),
  category: txt(40).optional(),
  echelon: txt(40).optional(),
  function_title: txt(200).optional(),
  hired_on: date.nullable().optional(),
  function_since: date.nullable().optional(),
  contract_end_on: date.nullable().optional(),
  notes: txt(5000).optional(),
});
const Create = Identity.extend({
  /** Compte existant (personne déjà membre) ; sinon une adresse pour ouvrir le compte. */
  user_id: z.string().max(100).optional(),
  email: z.string().trim().toLowerCase().email("Adresse électronique invalide").max(320).optional(),
  unit_id: z.string().max(100).nullable().optional(),
});
const Patch = Identity.partial().extend({
  unit_id: z.string().max(100).nullable().optional(),
  assignment_reference: txt(300).optional(),
});
const Diploma = z.object({
  title: txt(300).min(1, "L'intitulé du diplôme est obligatoire"),
  field: txt().optional(),
  institution: txt(300).optional(),
  year: z.number().int().min(1940).max(2100).nullable().optional(),
  level: txt(60).optional(),
});
const Contact = z.object({
  name: txt(200).min(1, "Le nom de la personne à prévenir est obligatoire"),
  relation: txt(80).optional(),
  phone: txt(60).optional(),
  email: txt(320).optional(),
});

const FIELDS = Object.keys(Identity.shape).filter((k) => k !== "matricule");

type Row = Record<string, unknown> & { org_id: string; user_id: string; last_name: string };
/** Données personnelles du dossier : réservées à l'agent et au service RH, pas à son chef (thème 5, D-2). */
const PERSONAL = [
  "birth_date",
  "birth_place",
  "nationality",
  "gender",
  "marital_status",
  "children_count",
  "id_document_type",
  "id_document_number",
  "address",
  "phone",
  "personal_email",
] as const;

export class Hr {
  constructor(
    private svc: Services,
    private provisioning: Provisioning,
  ) {}

  private async perms(actorId: string, orgId: string) {
    const p = await this.svc.permissionsOf(actorId, orgId);
    return { view: p.includes("hr.view") || p.includes("hr.manage"), manage: p.includes("hr.manage") };
  }
  private async requireManage(actorId: string, orgId: string) {
    if (!(await this.perms(actorId, orgId)).manage) throw forbidden("Réservé au service des ressources humaines");
  }
  /** Écrire dans le dossier d'un agent : réservé au service RH, et jamais dans le sien. */
  private async requireWrite(actorId: string, orgId: string, userId: string) {
    await this.requireManage(actorId, orgId);
    if (actorId === userId)
      throw forbidden("Vous ne pouvez pas modifier votre propre dossier : un autre gestionnaire RH s'en charge");
  }
  /** Le chef de l'entité de l'agent, ou d'une entité au-dessus. */
  private async heads(actorId: string, orgId: string, userId: string) {
    return !!(await this.svc.db.one(
      `WITH RECURSIVE up(id, manager_id, parent_id) AS (
         SELECT u.id, u.manager_id, u.parent_id FROM org_units u
           JOIN org_members om ON om.unit_id = u.id AND om.org_id = $1 AND om.user_id = $2
         UNION SELECT p.id, p.manager_id, p.parent_id FROM org_units p JOIN up ON p.id = up.parent_id
       ) SELECT 1 FROM up WHERE manager_id = $3`,
      [orgId, userId, actorId],
    ));
  }
  private async canRead(actorId: string, orgId: string, userId: string) {
    if (actorId === userId) return true;
    if ((await this.perms(actorId, orgId)).view) return true;
    return this.heads(actorId, orgId, userId);
  }

  private async row(orgId: string, userId: string) {
    const r = await this.svc.db.one<Row>(
      `SELECT a.*, to_char(a.birth_date, 'YYYY-MM-DD') AS birth_date, to_char(a.hired_on, 'YYYY-MM-DD') AS hired_on,
              to_char(a.function_since, 'YYYY-MM-DD') AS function_since,
              to_char(a.contract_end_on, 'YYYY-MM-DD') AS contract_end_on,
              u.email, u.status AS account_status, u.name AS display_name, om.unit_id, ou.name AS unit_name,
              p.name AS profile_name, mgr.name AS manager_name
         FROM agent_records a JOIN users u ON u.id = a.user_id
         JOIN org_members om ON om.org_id = a.org_id AND om.user_id = a.user_id
         LEFT JOIN org_units ou ON ou.id = om.unit_id
         -- Supérieur : le chef de l'entité, ou de l'entité au-dessus quand l'agent dirige la sienne
         LEFT JOIN LATERAL (
           WITH RECURSIVE up(id, manager_id, parent_id, depth) AS (
             SELECT u2.id, u2.manager_id, u2.parent_id, 0 FROM org_units u2 WHERE u2.id = om.unit_id
             UNION SELECT p2.id, p2.manager_id, p2.parent_id, up.depth + 1 FROM org_units p2 JOIN up ON p2.id = up.parent_id
           ) SELECT up.manager_id FROM up WHERE up.manager_id IS NOT NULL AND up.manager_id <> a.user_id ORDER BY up.depth LIMIT 1
         ) sup ON TRUE
         LEFT JOIN users mgr ON mgr.id = sup.manager_id
         LEFT JOIN access_profiles p ON p.id = om.profile_id
        WHERE a.org_id = $1 AND a.user_id = $2`,
      [orgId, userId],
    );
    if (!r) throw notFound("Dossier d'agent introuvable");
    return r;
  }

  async list(actorId: string, orgId: string) {
    if (!(await this.perms(actorId, orgId)).view) throw forbidden("Réservé au service des ressources humaines");
    return this.svc.db.query(
      `SELECT a.user_id, a.matricule, a.civility, a.last_name, a.first_names, a.status, a.grade, a.category,
              a.function_title, to_char(a.hired_on, 'YYYY-MM-DD') AS hired_on,
              to_char(a.contract_end_on, 'YYYY-MM-DD') AS contract_end_on, u.email, u.status AS account_status,
              om.unit_id, ou.name AS unit_name, p.name AS profile_name,
              (SELECT count(*)::int FROM agent_diplomas d WHERE d.org_id = a.org_id AND d.user_id = a.user_id) AS diploma_count,
              (SELECT count(*)::int FROM agent_contacts c WHERE c.org_id = a.org_id AND c.user_id = a.user_id) AS contact_count
         FROM agent_records a JOIN users u ON u.id = a.user_id
         JOIN org_members om ON om.org_id = a.org_id AND om.user_id = a.user_id
         LEFT JOIN org_units ou ON ou.id = om.unit_id LEFT JOIN access_profiles p ON p.id = om.profile_id
        WHERE a.org_id = $1 ORDER BY a.last_name, a.first_names`,
      [orgId],
    );
  }

  /** Les membres sans dossier : à identifier (personnes créées avant le module RH). */
  async unregistered(actorId: string, orgId: string) {
    await this.requireManage(actorId, orgId);
    return this.svc.db.query(
      `SELECT u.id, u.name, u.email, u.title, om.unit_id FROM org_members om JOIN users u ON u.id = om.user_id
        WHERE om.org_id = $1 AND NOT u.is_ai
          AND NOT EXISTS (SELECT 1 FROM agent_records a WHERE a.org_id = om.org_id AND a.user_id = om.user_id)
        ORDER BY u.name`,
      [orgId],
    );
  }

  async get(actorId: string, orgId: string, userId: string) {
    if (!(await this.canRead(actorId, orgId, userId))) throw forbidden("Ce dossier ne vous est pas ouvert");
    const r = await this.row(orgId, userId);
    // La consultation d'un dossier par un tiers est journalisée (thème 3, D-3), une fois par lecteur et par demi-heure
    if (actorId !== userId) {
      const recent = await this.svc.db.one(
        `SELECT 1 FROM activity WHERE org_id = $1 AND actor_id = $2 AND kind = 'hr.agent.viewed'
            AND data->>'user_id' = $3 AND created_at > now() - interval '30 minutes'`,
        [orgId, actorId, userId],
      );
      if (!recent)
        await this.svc.log(actorId, "hr.agent.viewed", {
          orgId,
          data: { user_id: userId, name: [r.first_names, r.last_name].filter(Boolean).join(" ") },
        });
    }
    const [diplomas, contacts, assignments] = await Promise.all([
      this.svc.db.query(
        "SELECT id, title, field, institution, year, level FROM agent_diplomas WHERE org_id = $1 AND user_id = $2 ORDER BY year DESC NULLS LAST, created_at",
        [orgId, userId],
      ),
      this.svc.db.query(
        "SELECT id, name, relation, phone, email FROM agent_contacts WHERE org_id = $1 AND user_id = $2 ORDER BY created_at",
        [orgId, userId],
      ),
      this.svc.db.query(
        `SELECT s.id, s.unit_id, ou.name AS unit_name, s.function_title, to_char(s.started_on, 'YYYY-MM-DD') AS started_on,
                to_char(s.ended_on, 'YYYY-MM-DD') AS ended_on, s.reference
           FROM agent_assignments s LEFT JOIN org_units ou ON ou.id = s.unit_id
          WHERE s.org_id = $1 AND s.user_id = $2 ORDER BY s.started_on DESC, s.created_at DESC`,
        [orgId, userId],
      ),
    ]);
    const p = await this.perms(actorId, orgId);
    // Les observations du service RH restent au service RH (D-1) ; le chef lit la partie administrative (D-2)
    const hr = p.view || p.manage;
    const record: Record<string, unknown> = { ...r };
    if (!hr) delete record.notes;
    const restricted = !hr && actorId !== userId;
    if (restricted) for (const k of PERSONAL) delete record[k];
    return {
      ...record,
      diplomas,
      contacts: restricted ? [] : contacts,
      assignments,
      restricted,
      can: { manage: p.manage && actorId !== userId, self: actorId === userId },
    };
  }

  async mine(actorId: string, orgId: string) {
    if (!(await this.svc.db.one("SELECT 1 FROM agent_records WHERE org_id = $1 AND user_id = $2", [orgId, actorId])))
      return null;
    return this.get(actorId, orgId, actorId);
  }

  private async nextMatricule(orgId: string) {
    const year = new Date().getFullYear();
    const n = await this.svc.db.one<{ n: number }>(
      "SELECT count(*)::int AS n FROM agent_records WHERE org_id = $1 AND matricule LIKE $2",
      [orgId, `AG-${year}-%`],
    );
    for (let i = (n?.n ?? 0) + 1; ; i++) {
      const m = `AG-${year}-${String(i).padStart(4, "0")}`;
      if (!(await this.svc.db.one("SELECT 1 FROM agent_records WHERE org_id = $1 AND matricule = $2", [orgId, m])))
        return m;
    }
  }

  private async assertUnit(orgId: string, unitId: string | null | undefined) {
    if (unitId && !(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [orgId, unitId])))
      throw badRequest("Entité inconnue");
  }

  /** Créer un agent : son dossier, et son compte s'il n'existe pas (lien de finalisation, profil Agent). */
  async create(actorId: string, orgId: string, input: z.infer<typeof Create>, info: RequestInfo) {
    await this.requireManage(actorId, orgId);
    await this.assertUnit(orgId, input.unit_id);
    if (
      input.matricule &&
      (await this.svc.db.one("SELECT 1 FROM agent_records WHERE org_id = $1 AND matricule = $2", [
        orgId,
        input.matricule,
      ]))
    )
      throw badRequest(`Le matricule ${input.matricule} est déjà attribué`);
    let userId = input.user_id;
    let link: { sent: boolean; link?: string } | null = null;
    const name = [input.first_names, input.last_name].filter(Boolean).join(" ").trim();
    if (userId) {
      await this.requireWrite(actorId, orgId, userId);
      if (!(await this.svc.db.one("SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2", [orgId, userId])))
        throw badRequest("Cette personne n'est pas membre de l'institution");
    } else {
      if (!input.email) throw badRequest("L'adresse électronique est obligatoire pour ouvrir le compte de l'agent");
      const slug = PROFILE_OF_STATUS[input.status ?? ""] ?? "agent";
      const profile = await this.svc.db.one<{ id: string }>("SELECT id FROM access_profiles WHERE id = $1", [
        `prf_${slug}_${orgId}`,
      ]);
      if (!profile) throw badRequest("Le profil « Agent » n'existe pas dans cette institution");
      const r = await this.provisioning.enrolAgent(
        actorId,
        orgId,
        {
          email: input.email,
          name,
          profile_id: profile.id,
          unit_id: input.unit_id ?? null,
          title: input.function_title,
        },
        info,
      );
      link = { sent: r.sent, ...(r.link ? { link: r.link } : {}) };
      userId = (await this.svc.db.one<{ id: string }>("SELECT id FROM users WHERE lower(email) = $1", [input.email]))!
        .id;
      // L'invitation range la personne à l'activation ; le dossier, lui, existe dès maintenant
      await this.svc.db.query(
        "INSERT INTO org_members (org_id, user_id, role, profile_id, unit_id) SELECT $1, $2, p.base_role, p.id, $4 FROM access_profiles p WHERE p.id = $3 ON CONFLICT (org_id, user_id) DO NOTHING",
        [orgId, userId, profile.id, input.unit_id ?? null],
      );
    }
    if (await this.svc.db.one("SELECT 1 FROM agent_records WHERE org_id = $1 AND user_id = $2", [orgId, userId]))
      throw badRequest("Cette personne a déjà un dossier d'agent");
    const matricule = input.matricule || (await this.nextMatricule(orgId));
    const cols = FIELDS.filter((k) => (input as Record<string, unknown>)[k] !== undefined);
    await this.svc.db.tx(async (q) => {
      await q.query(
        `INSERT INTO agent_records (org_id, user_id, matricule, created_by${cols.map((c) => `, ${c}`).join("")})
         VALUES ($1, $2, $3, $4${cols.map((_, i) => `, $${i + 5}`).join("")})`,
        [orgId, userId, matricule, actorId, ...cols.map((c) => (input as Record<string, unknown>)[c] ?? null)],
      );
      if (input.unit_id) {
        await q.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = $3", [
          input.unit_id,
          orgId,
          userId,
        ]);
      }
      await q.query(
        "INSERT INTO agent_assignments (id, org_id, user_id, unit_id, function_title, started_on, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [
          uid("asg"),
          orgId,
          userId,
          input.unit_id ?? null,
          input.function_title ?? "",
          input.function_since ?? input.hired_on ?? localDate(),
          actorId,
        ],
      );
    });
    await this.svc.log(actorId, "hr.agent.created", { orgId, data: { user_id: userId, matricule, name } });
    return { agent: await this.row(orgId, userId!), ...(link ?? { sent: false }) };
  }

  async update(actorId: string, orgId: string, userId: string, input: z.infer<typeof Patch>) {
    await this.requireWrite(actorId, orgId, userId);
    const before = await this.row(orgId, userId);
    await this.assertUnit(orgId, input.unit_id);
    const cols = FIELDS.filter((k) => (input as Record<string, unknown>)[k] !== undefined);
    if (input.matricule && input.matricule !== before.matricule) {
      if (
        await this.svc.db.one("SELECT 1 FROM agent_records WHERE org_id = $1 AND matricule = $2", [
          orgId,
          input.matricule,
        ])
      )
        throw badRequest(`Le matricule ${input.matricule} est déjà attribué`);
      cols.push("matricule");
    }
    const moved = input.unit_id !== undefined && input.unit_id !== before.unit_id;
    const newFunction = input.function_title !== undefined && input.function_title !== before.function_title;
    await this.svc.db.tx(async (q) => {
      if (cols.length)
        await q.query(
          `UPDATE agent_records SET ${cols.map((c, i) => `${c} = $${i + 3}`).join(", ")}, updated_at = now()
            WHERE org_id = $1 AND user_id = $2`,
          [orgId, userId, ...cols.map((c) => (input as Record<string, unknown>)[c] ?? null)],
        );
      if (moved)
        await q.query("UPDATE org_members SET unit_id = $1 WHERE org_id = $2 AND user_id = $3", [
          input.unit_id,
          orgId,
          userId,
        ]);
      // Mutation ou changement de fonction : l'affectation en cours se ferme, une nouvelle s'ouvre
      if (moved || newFunction) {
        const day = localDate();
        await q.query(
          "UPDATE agent_assignments SET ended_on = $3 WHERE org_id = $1 AND user_id = $2 AND ended_on IS NULL",
          [orgId, userId, day],
        );
        await q.query(
          "INSERT INTO agent_assignments (id, org_id, user_id, unit_id, function_title, started_on, reference, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            uid("asg"),
            orgId,
            userId,
            moved ? input.unit_id : before.unit_id,
            input.function_title ?? before.function_title ?? "",
            day,
            input.assignment_reference ?? "",
            actorId,
          ],
        );
      }
    });
    await this.svc.log(actorId, "hr.agent.updated", {
      orgId,
      data: { user_id: userId, name: before.last_name, fields: [...cols, ...(moved ? ["unit_id"] : [])] },
    });
    // Même trace que depuis Structure : un changement d'entité se lit au même endroit du journal (S-1, S-2)
    if (moved) {
      const to = input.unit_id
        ? ((await this.svc.db.one<{ name: string }>("SELECT name FROM org_units WHERE id = $1", [input.unit_id]))?.name ?? "")
        : "";
      await this.svc.log(actorId, "unit.member", {
        orgId,
        data: { user: userId, name: before.display_name ?? before.last_name, from: before.unit_name ?? "", to },
      });
    }
    return this.get(actorId, orgId, userId);
  }

  /** Diplômes et personnes à prévenir : le service RH, pour le dossier d'un autre. */
  private async canEditLists(actorId: string, orgId: string, userId: string) {
    await this.requireWrite(actorId, orgId, userId);
    await this.row(orgId, userId);
  }
  async addDiploma(actorId: string, orgId: string, userId: string, i: z.infer<typeof Diploma>) {
    await this.canEditLists(actorId, orgId, userId);
    const id = uid("dip");
    await this.svc.db.query(
      "INSERT INTO agent_diplomas (id, org_id, user_id, title, field, institution, year, level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, orgId, userId, i.title, i.field ?? "", i.institution ?? "", i.year ?? null, i.level ?? ""],
    );
    await this.svc.log(actorId, "hr.diploma.added", { orgId, data: { user_id: userId, title: i.title } });
    return { id };
  }
  async addContact(actorId: string, orgId: string, userId: string, i: z.infer<typeof Contact>) {
    await this.canEditLists(actorId, orgId, userId);
    const id = uid("ctc");
    await this.svc.db.query(
      "INSERT INTO agent_contacts (id, org_id, user_id, name, relation, phone, email) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [id, orgId, userId, i.name, i.relation ?? "", i.phone ?? "", i.email ?? ""],
    );
    await this.svc.log(actorId, "hr.contact.added", { orgId, data: { user_id: userId, name: i.name } });
    return { id };
  }
  async remove(actorId: string, orgId: string, table: "agent_diplomas" | "agent_contacts", id: string) {
    const r = await this.svc.db.one<{ user_id: string }>(`SELECT user_id FROM ${table} WHERE id = $1 AND org_id = $2`, [
      id,
      orgId,
    ]);
    if (!r) throw notFound("Élément introuvable");
    await this.canEditLists(actorId, orgId, r.user_id);
    await this.svc.db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    await this.svc.log(actorId, table === "agent_diplomas" ? "hr.diploma.deleted" : "hr.contact.deleted", {
      orgId,
      data: { user_id: r.user_id },
    });
    return { ok: true };
  }
}

type Id = { Params: { id: string } };
export function hrRoutes(r: FastifyInstance, hr: Hr) {
  const info = (req: { ip: string; headers: Record<string, unknown> }): RequestInfo => ({
    ip: req.ip,
    userAgent: String(req.headers["user-agent"] ?? ""),
  });
  r.get("/api/hr/agents", async (req) => hr.list(req.userId, req.orgId));
  r.get("/api/hr/unregistered", async (req) => hr.unregistered(req.userId, req.orgId));
  r.post("/api/hr/agents", async (req) => hr.create(req.userId, req.orgId, Create.parse(req.body), info(req)));
  r.get("/api/hr/me", async (req) => hr.mine(req.userId, req.orgId));
  r.get<Id>("/api/hr/agents/:id", async (req) => hr.get(req.userId, req.orgId, req.params.id));
  r.patch<Id>("/api/hr/agents/:id", async (req) =>
    hr.update(req.userId, req.orgId, req.params.id, Patch.parse(req.body ?? {})),
  );
  r.post<Id>("/api/hr/agents/:id/diplomas", async (req) =>
    hr.addDiploma(req.userId, req.orgId, req.params.id, Diploma.parse(req.body)),
  );
  r.post<Id>("/api/hr/agents/:id/contacts", async (req) =>
    hr.addContact(req.userId, req.orgId, req.params.id, Contact.parse(req.body)),
  );
  r.delete<Id>("/api/hr/diplomas/:id", async (req) =>
    hr.remove(req.userId, req.orgId, "agent_diplomas", req.params.id),
  );
  r.delete<Id>("/api/hr/contacts/:id", async (req) =>
    hr.remove(req.userId, req.orgId, "agent_contacts", req.params.id),
  );
}
