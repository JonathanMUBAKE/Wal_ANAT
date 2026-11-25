import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { uid } from "./db.js";
import { Leaves } from "./leaves.js";
import type { Provisioning } from "./auth/provisioning.js";
import type { RequestInfo } from "./auth/service.js";
import { HttpError, badRequest, forbidden, localDate, notFound, type Services } from "./services.js";

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
/** Sortie d'un agent (RH-1) : date, motif, référence de l'acte. */
export const EXIT_REASONS = ["retraite", "fin_contrat", "mutation", "demission", "licenciement", "deces", "autre"] as const;
const Exit = z.object({
  exit_on: date,
  reason: z.enum(EXIT_REASONS, { message: "Motif de sortie inconnu" }),
  reference: txt(300).optional(),
});
const CancelExit = z.object({
  reason: txt(2000).min(3, "Le motif de l'annulation est obligatoire : dites pourquoi la sortie est annulée"),
});
const Training = z.object({
  title: txt(300).min(1, "L'intitulé de la formation est obligatoire"),
  provider: txt(300).optional(),
  start_on: date.nullable().optional(),
  end_on: date.nullable().optional(),
});
const RATINGS = ["excellent", "tres_bien", "bien", "passable", "insuffisant"] as const;
const Evaluation = z.object({
  year: z.number().int().min(1990).max(2100),
  rating: z.enum(RATINGS, { message: "Appréciation inconnue" }),
  comment: txt(5000).optional(),
});
/** Statuts à durée limitée : leur date de fin est obligatoire (RH-3). */
const LIMITED = new Set(["contractuel", "stagiaire", "consultant"]);
/** Âge de départ à la retraite retenu pour l'alerte (paramètre de l'Agence). */
const RETIREMENT_AGE = 65;
const addDays = (d: string, n: number) => localDate(new Date(Date.parse(`${d}T12:00:00`) + n * 864e5));
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
              -- Indicateurs du service (RH-4) : tranche d'âge, sans la date de naissance, et départ en retraite
              CASE WHEN a.birth_date IS NULL THEN NULL
                   WHEN date_part('year', age(a.birth_date)) < 30 THEN 'moins de 30 ans'
                   WHEN date_part('year', age(a.birth_date)) < 40 THEN '30 à 39 ans'
                   WHEN date_part('year', age(a.birth_date)) < 50 THEN '40 à 49 ans'
                   WHEN date_part('year', age(a.birth_date)) < 60 THEN '50 à 59 ans'
                   ELSE '60 ans et plus' END AS age_band,
              to_char(a.birth_date + make_interval(years => ${RETIREMENT_AGE}), 'YYYY-MM-DD') AS retire_on,
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
    const self = actorId === userId;
    const trainings = await this.svc.db.query(
      `SELECT id, title, provider, to_char(start_on, 'YYYY-MM-DD') AS start_on, to_char(end_on, 'YYYY-MM-DD') AS end_on
         FROM agent_trainings WHERE org_id = $1 AND user_id = $2 ORDER BY start_on DESC NULLS LAST, created_at DESC`,
      [orgId, userId],
    );
    // L'évaluation reste au service RH et à l'agent (D-9)
    const evaluations =
      hr || self
        ? await this.svc.db.query(
            `SELECT e.id, e.year, e.rating, e.comment, u.name AS evaluator_name FROM agent_evaluations e
               LEFT JOIN users u ON u.id = e.evaluator_id WHERE e.org_id = $1 AND e.user_id = $2 ORDER BY e.year DESC`,
            [orgId, userId],
          )
        : [];
    const corrections =
      hr || self
        ? await this.svc.db.query(
            `SELECT id, message, status, response, created_at, handled_at FROM agent_corrections
               WHERE org_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
            [orgId, userId],
          )
        : [];
    const record: Record<string, unknown> = { ...r };
    if (!hr) delete record.notes;
    const restricted = !hr && actorId !== userId;
    if (restricted) for (const k of PERSONAL) delete record[k];
    return {
      ...record,
      diplomas,
      contacts: restricted ? [] : contacts,
      assignments,
      trainings,
      evaluations,
      corrections,
      restricted,
      can: { manage: p.manage && actorId !== userId, self: actorId === userId },
    };
  }

  async mine(actorId: string, orgId: string) {
    if (!(await this.svc.db.one("SELECT 1 FROM agent_records WHERE org_id = $1 AND user_id = $2", [orgId, actorId])))
      return null;
    return this.get(actorId, orgId, actorId);
  }

  /** Matricule provisoire si les RH n'en saisissent pas : il suit l'année d'entrée, à défaut l'année en cours (RH-5). */
  private async nextMatricule(orgId: string, hiredOn?: string | null) {
    const year = hiredOn ? Number(hiredOn.slice(0, 4)) : new Date().getFullYear();
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
    // Tous les contrôles d'abord : rien n'est créé, envoyé ni journalisé tant que le dossier n'est pas valide (S3.3)
    if (LIMITED.has(input.status ?? "") && !input.contract_end_on)
      throw badRequest("Un contractuel, un stagiaire ou un consultant a une date de fin : indiquez-la");
    let staged: Awaited<ReturnType<Provisioning["stageAgent"]>> | null = null;
    let profile: { id: string; base_role: string } | undefined;
    if (userId) {
      await this.requireWrite(actorId, orgId, userId);
      if (!(await this.svc.db.one("SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2", [orgId, userId])))
        throw badRequest("Cette personne n'est pas membre de l'institution");
      if (await this.svc.db.one("SELECT 1 FROM agent_records WHERE org_id = $1 AND user_id = $2", [orgId, userId]))
        throw badRequest("Cette personne a déjà un dossier d'agent");
    } else {
      if (!input.email) throw badRequest("L'adresse électronique est obligatoire pour ouvrir le compte de l'agent");
      const slug = PROFILE_OF_STATUS[input.status ?? ""] ?? "agent";
      profile = await this.svc.db.one<{ id: string; base_role: string }>(
        "SELECT id, base_role FROM access_profiles WHERE id = $1",
        [`prf_${slug}_${orgId}`],
      );
      if (!profile) throw badRequest("Le profil « Agent » n'existe pas dans cette institution");
      staged = await this.provisioning.stageAgent(
        actorId,
        orgId,
        { email: input.email, name, profile_id: profile.id, unit_id: input.unit_id ?? null, title: input.function_title },
        info,
      );
      userId = staged.userId;
      if (await this.svc.db.one("SELECT 1 FROM agent_records WHERE org_id = $1 AND user_id = $2", [orgId, userId]))
        throw badRequest("Cette personne a déjà un dossier d'agent");
    }
    const matricule = input.matricule || (await this.nextMatricule(orgId, input.hired_on));
    const cols = FIELDS.filter((k) => (input as Record<string, unknown>)[k] !== undefined);
    await this.svc.db.tx(async (q) => {
      if (staged) {
        // Compte, invitation et rattachement : dans la même transaction que le dossier, ou pas du tout
        await staged.insert(q);
        await q.query(
          "INSERT INTO org_members (org_id, user_id, role, profile_id, unit_id) SELECT $1, $2, p.base_role, p.id, $4 FROM access_profiles p WHERE p.id = $3 ON CONFLICT (org_id, user_id) DO NOTHING",
          [orgId, userId, profile!.id, input.unit_id ?? null],
        );
      }
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
    if (staged) {
      const r = await staged.complete();
      link = { sent: r.sent, ...(r.link ? { link: r.link } : {}) };
      // Les administrateurs contrôlent après coup chaque compte ouvert par les RH (RH-2)
      for (const u of await this.svc.usersOf(orgId)) {
        if (u.is_ai || u.id === actorId) continue;
        if (!(await this.svc.permissionsOf(u.id, orgId)).includes("org.members")) continue;
        await this.svc.notify(u.id, orgId, {
          kind: "hr.account_opened",
          title: `Compte ouvert par les RH : ${name || input.email}`,
          body: "Profil « Agent » ou équivalent selon le statut. Vérifiez le profil et le rattachement dans Structure.",
          actor_id: actorId,
          link: "/org",
        });
      }
      await this.svc.log(actorId, "hr.account_opened", { orgId, data: { email: input.email, profile: profile!.id } });
    }
    await this.svc.log(actorId, "hr.agent.created", { orgId, data: { user_id: userId, matricule, name } });
    return { agent: await this.row(orgId, userId!), ...(link ?? { sent: false }) };
  }

  async update(actorId: string, orgId: string, userId: string, input: z.infer<typeof Patch>) {
    await this.requireWrite(actorId, orgId, userId);
    const before = await this.row(orgId, userId);
    const status = String(input.status ?? before.status);
    const end = input.contract_end_on !== undefined ? input.contract_end_on : before.contract_end_on;
    if (LIMITED.has(status) && !end)
      throw badRequest("Un contractuel, un stagiaire ou un consultant a une date de fin : indiquez-la");
    await this.assertUnit(orgId, input.unit_id);
    // Les RH rattachent les agents ; un chef en poste ou la DG se déplace par la structure, pas par le dossier (M5)
    if (input.unit_id !== undefined) {
      const cur = await this.svc.db.one<{ unit_id: string | null }>("SELECT unit_id FROM org_members WHERE org_id = $1 AND user_id = $2", [orgId, userId]);
      if ((input.unit_id ?? null) !== (cur?.unit_id ?? null)) {
        const leads = await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND manager_id = $2 LIMIT 1", [orgId, userId]);
        const dg = (await this.svc.permissionsOf(userId, orgId)).includes("signature.institution");
        if (leads || dg)
          throw forbidden("Le rattachement d'un chef en poste ou de la DG se change dans la structure, par qui la gère");
      }
    }
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

  // ---------------------------------------------------------------- sortie (RH-1)
  /**
   * L'acte de sortie : date, motif, référence. À sa date, l'affectation en cours se clôt, le compte est suspendu et
   * ses sessions fermées ; le chef est prévenu des tâches encore ouvertes. Un chef en poste est d'abord remplacé.
   */
  async exit(actorId: string, orgId: string, userId: string, i: z.infer<typeof Exit>) {
    await this.requireWrite(actorId, orgId, userId);
    const r = await this.row(orgId, userId);
    if (r.exit_on) throw new HttpError(409, "La sortie de cet agent est déjà enregistrée");
    const led = await this.svc.db.query<{ name: string }>(
      "SELECT name FROM org_units WHERE org_id = $1 AND manager_id = $2 ORDER BY name",
      [orgId, userId],
    );
    if (led.length)
      throw badRequest(
        `${r.display_name ?? r.last_name} dirige « ${led.map((u) => u.name).join(" », « ")} » : désignez d'abord un autre chef`,
      );
    // La sortie d'un administrateur système ne laisse pas la plateforme sans administrateur (contrôle des testeurs, H5)
    const admin = await this.svc.db.one<{ platform_role: string | null }>("SELECT platform_role FROM users WHERE id = $1", [userId]);
    if (admin?.platform_role === "super_admin") {
      const others = await this.svc.db.one<{ n: number }>(
        "SELECT count(*)::int AS n FROM users WHERE platform_role = 'super_admin' AND status = 'active' AND id <> $1",
        [userId],
      );
      if (!others?.n)
        throw badRequest("C'est le dernier administrateur système : désignez-en d'abord un autre avant d'enregistrer sa sortie");
    }
    await this.svc.db.query(
      "UPDATE agent_records SET exit_on = $3, exit_reason = $4, exit_reference = $5, exited_by = $6, updated_at = now() WHERE org_id = $1 AND user_id = $2",
      [orgId, userId, i.exit_on, i.reason, i.reference?.trim() ?? "", actorId],
    );
    await this.svc.log(actorId, "hr.agent.exit", {
      orgId,
      data: { user_id: userId, name: r.last_name, on: i.exit_on, reason: i.reason, reference: i.reference ?? "" },
    });
    if (i.exit_on <= localDate()) await this.applyExit(orgId, userId, actorId);
    return this.get(actorId, orgId, userId);
  }

  /**
   * Une sortie posée par erreur se défait (S3.2) : motif obligatoire, journal ; si elle était déjà appliquée, le compte est
   * rouvert et l'affectation close par la sortie reprend. Les congés refusés et les intérims retirés ne sont pas rétablis :
   * l'agent et ses collègues les redemandent.
   */
  async cancelExit(actorId: string, orgId: string, userId: string, i: z.infer<typeof CancelExit>) {
    await this.requireWrite(actorId, orgId, userId);
    const r = await this.svc.db.one<{ exit_on: string | null; applied: boolean; reason: string | null; last_name: string }>(
      "SELECT to_char(exit_on, 'YYYY-MM-DD') AS exit_on, exit_applied AS applied, exit_reason AS reason, last_name FROM agent_records WHERE org_id = $1 AND user_id = $2",
      [orgId, userId],
    );
    if (!r) throw notFound("Dossier d'agent introuvable");
    if (!r.exit_on) throw new HttpError(409, "Aucune sortie n'est enregistrée pour cet agent : il n'y a rien à annuler");
    await this.svc.db.tx(async (q) => {
      await q.query(
        "UPDATE agent_records SET exit_on = NULL, exit_reason = NULL, exit_reference = '', exit_applied = FALSE, exited_by = NULL, updated_at = now() WHERE org_id = $1 AND user_id = $2",
        [orgId, userId],
      );
      if (r.applied) {
        await q.query(
          "UPDATE agent_assignments SET ended_on = NULL WHERE id = (SELECT id FROM agent_assignments WHERE org_id = $1 AND user_id = $2 AND ended_on = $3::date ORDER BY started_on DESC, created_at DESC LIMIT 1)",
          [orgId, userId, r.exit_on],
        );
        await q.query("UPDATE users SET status = 'active' WHERE id = $1 AND status = 'suspended'", [userId]);
      }
    });
    await this.svc.log(actorId, "hr.agent.exit_cancelled", {
      orgId,
      data: { user_id: userId, name: r.last_name, was_on: r.exit_on, was_reason: r.reason, applied: r.applied, reason: i.reason },
    });
    if (r.applied) {
      const chief = await this.chiefOf(orgId, userId);
      const name = (await this.svc.userOrNull(userId))?.name ?? r.last_name;
      if (chief && chief !== actorId)
        await this.svc.notify(chief, orgId, {
          kind: "hr.exit_cancelled",
          title: `La sortie de ${name} est annulée`,
          body: `Son compte est rouvert et son affectation reprend. Motif : ${i.reason}`,
          actor_id: actorId,
        });
    }
    return this.get(actorId, orgId, userId);
  }

  /** Effets de la sortie, une seule fois : affectation close, compte suspendu, congés et intérims réglés, chef prévenu. */
  private async applyExit(orgId: string, userId: string, actorId: string | null) {
    const r = await this.svc.db.one<{ exit_on: string; applied: boolean; last_name: string }>(
      "SELECT to_char(exit_on, 'YYYY-MM-DD') AS exit_on, exit_applied AS applied, last_name FROM agent_records WHERE org_id = $1 AND user_id = $2",
      [orgId, userId],
    );
    if (!r?.exit_on || r.applied) return;
    await this.svc.db.tx(async (q) => {
      await q.query("UPDATE agent_records SET exit_applied = TRUE WHERE org_id = $1 AND user_id = $2", [orgId, userId]);
      await q.query(
        "UPDATE agent_assignments SET ended_on = $3 WHERE org_id = $1 AND user_id = $2 AND ended_on IS NULL",
        [orgId, userId, r.exit_on],
      );
      await q.query("UPDATE users SET status = 'suspended' WHERE id = $1 AND status <> 'suspended'", [userId]);
      await q.query("UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [userId]);
    });
    await new Leaves(this.svc).settleExit(actorId, orgId, userId, r.exit_on);
    const name = (await this.svc.userOrNull(userId))?.name ?? r.last_name;
    const open = await this.svc.db.query<{ key: string; title: string }>(
      `SELECT p.key || '-' || t.number AS key, t.title FROM tasks t JOIN projects p ON p.id = t.project_id
        WHERE t.assignee_id = $1 AND NOT t.completed AND p.org_id = $2 ORDER BY t.due_on NULLS LAST LIMIT 20`,
      [userId, orgId],
    );
    const chief = await this.chiefOf(orgId, userId);
    if (chief)
      await this.svc.notify(chief, orgId, {
        kind: "hr.exit",
        title: `${name} a quitté l'Agence le ${r.exit_on.split("-").reverse().join("/")}`,
        body: open.length
          ? `Tâches encore ouvertes à réattribuer : ${open.map((t) => `${t.key} « ${t.title} »`).join(" ; ")}`
          : "Aucune tâche ouverte.",
        actor_id: actorId,
      });
  }

  /** Le chef de l'agent : celui de son entité, ou de l'entité au-dessus quand il dirige la sienne. */
  private async chiefOf(orgId: string, userId: string) {
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
  /** Les gestionnaires RH de l'institution. */
  private async hrManagers(orgId: string, except?: string) {
    const out: string[] = [];
    for (const m of await this.svc.db.query<{ user_id: string }>(
      "SELECT om.user_id FROM org_members om JOIN users u ON u.id = om.user_id WHERE om.org_id = $1 AND NOT u.is_ai AND u.status = 'active'",
      [orgId],
    ))
      if (m.user_id !== except && (await this.svc.permissionsOf(m.user_id, orgId)).includes("hr.manage"))
        out.push(m.user_id);
    return out;
  }

  // ---------------------------------------------------------------- échéances (RH-3)
  /** Fins de contrat et départs à la retraite dans les 90 jours, pour le service RH. */
  async deadlines(actorId: string, orgId: string) {
    if (!(await this.perms(actorId, orgId)).view) throw forbidden("Réservé au service des ressources humaines");
    return this.due(orgId, localDate(), 90);
  }
  private async due(orgId: string, now: string, ahead: number) {
    const rows = await this.svc.db.query<{
      user_id: string;
      name: string;
      status: string;
      contract_end_on: string | null;
      birth_date: string | null;
    }>(
      `SELECT a.user_id, u.name, a.status, to_char(a.contract_end_on, 'YYYY-MM-DD') AS contract_end_on,
              to_char(a.birth_date, 'YYYY-MM-DD') AS birth_date
         FROM agent_records a JOIN users u ON u.id = a.user_id WHERE a.org_id = $1 AND a.exit_on IS NULL`,
      [orgId],
    );
    const limit = addDays(now, ahead);
    const out: { user_id: string; name: string; kind: "fin_contrat" | "retraite"; on: string; days: number }[] = [];
    const days = (d: string) => Math.round((Date.parse(d) - Date.parse(now)) / 864e5);
    for (const r of rows) {
      if (r.contract_end_on && r.contract_end_on >= now && r.contract_end_on <= limit)
        out.push({ user_id: r.user_id, name: r.name, kind: "fin_contrat", on: r.contract_end_on, days: days(r.contract_end_on) });
      if (r.birth_date) {
        const retire = `${Number(r.birth_date.slice(0, 4)) + RETIREMENT_AGE}${r.birth_date.slice(4)}`;
        if (retire >= now && retire <= limit)
          out.push({ user_id: r.user_id, name: r.name, kind: "retraite", on: retire, days: days(retire) });
      }
    }
    return out.sort((a, b) => a.on.localeCompare(b.on));
  }

  /** Tâche périodique : sorties arrivées à leur date, alertes d'échéance à 90 puis 30 jours. */
  async sweep(now = localDate()) {
    const exits = await this.svc.db.query<{ org_id: string; user_id: string }>(
      "SELECT org_id, user_id FROM agent_records WHERE exit_on IS NOT NULL AND NOT exit_applied AND exit_on <= $1::date",
      [now],
    );
    for (const e of exits) await this.applyExit(e.org_id, e.user_id, null);
    const orgs = await this.svc.db.query<{ org_id: string }>("SELECT DISTINCT org_id FROM agent_records");
    for (const { org_id } of orgs)
      for (const d of await this.due(org_id, now, 90)) {
        const step = d.days <= 30 ? 30 : 90;
        const fresh = await this.svc.db.query(
          "INSERT INTO reminders_sent (key, org_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING key",
          [`hr:${d.kind}:${d.user_id}:${d.on}:${step}`, org_id],
        );
        if (!fresh.length) continue;
        const label = d.kind === "fin_contrat" ? "Fin de contrat" : "Départ à la retraite";
        const when = d.on.split("-").reverse().join("/");
        const to = new Set([...(await this.hrManagers(org_id)), (await this.chiefOf(org_id, d.user_id)) ?? ""]);
        for (const u of to)
          if (u)
            await this.svc.notify(u, org_id, {
              kind: "hr.deadline",
              title: `${label} de ${d.name} le ${when}`,
              body: `Dans ${d.days} jours : prévoir le renouvellement, la relève ou l'acte de sortie.`,
            });
      }
  }

  // ---------------------------------------------------------------- demandes de correction (D-4)
  async requestCorrection(actorId: string, orgId: string, message: string) {
    if (!(await this.svc.db.one("SELECT 1 FROM agent_records WHERE org_id = $1 AND user_id = $2", [orgId, actorId])))
      throw notFound("Vous n'avez pas encore de dossier");
    const text = message.trim();
    if (!text) throw badRequest("Décrivez ce qui doit être corrigé");
    const id = uid("cor");
    await this.svc.db.query("INSERT INTO agent_corrections (id, org_id, user_id, message) VALUES ($1,$2,$3,$4)", [
      id,
      orgId,
      actorId,
      text,
    ]);
    await this.svc.log(actorId, "hr.correction.requested", { orgId, data: { user_id: actorId } });
    const name = (await this.svc.user(actorId)).name;
    for (const u of await this.hrManagers(orgId, actorId))
      await this.svc.notify(u, orgId, {
        kind: "hr.correction",
        title: `${name} demande une correction de son dossier`,
        body: text,
        actor_id: actorId,
      });
    return { id };
  }
  async corrections(actorId: string, orgId: string) {
    await this.requireManage(actorId, orgId);
    return this.svc.db.query(
      `SELECT c.id, c.user_id, u.name, c.message, c.status, c.response, c.created_at, c.handled_at
         FROM agent_corrections c JOIN users u ON u.id = c.user_id WHERE c.org_id = $1
        ORDER BY (c.status = 'open') DESC, c.created_at DESC`,
      [orgId],
    );
  }
  async closeCorrection(actorId: string, orgId: string, id: string, response: string) {
    const c = await this.svc.db.one<{ user_id: string; status: string }>(
      "SELECT user_id, status FROM agent_corrections WHERE org_id = $1 AND id = $2",
      [orgId, id],
    );
    if (!c) throw notFound("Demande introuvable");
    await this.requireWrite(actorId, orgId, c.user_id);
    if (c.status !== "open") throw new HttpError(409, "Cette demande est déjà traitée");
    await this.svc.db.query(
      "UPDATE agent_corrections SET status = 'done', response = $1, handled_by = $2, handled_at = now() WHERE id = $3",
      [response.trim(), actorId, id],
    );
    await this.svc.log(actorId, "hr.correction.closed", { orgId, data: { user_id: c.user_id } });
    await this.svc.notify(c.user_id, orgId, {
      kind: "hr.correction.closed",
      title: "Votre demande de correction a été traitée",
      body: response.trim(),
      actor_id: actorId,
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------- formations et évaluations (D-9)
  async addTraining(actorId: string, orgId: string, userId: string, i: z.infer<typeof Training>) {
    await this.canEditLists(actorId, orgId, userId);
    if (i.start_on && i.end_on && i.end_on < i.start_on) throw badRequest("La fin de la formation précède son début");
    const id = uid("trn");
    await this.svc.db.query(
      "INSERT INTO agent_trainings (id, org_id, user_id, title, provider, start_on, end_on, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, orgId, userId, i.title, i.provider ?? "", i.start_on ?? null, i.end_on ?? null, actorId],
    );
    await this.svc.log(actorId, "hr.training.added", { orgId, data: { user_id: userId, title: i.title } });
    return { id };
  }
  async addEvaluation(actorId: string, orgId: string, userId: string, i: z.infer<typeof Evaluation>) {
    await this.canEditLists(actorId, orgId, userId);
    const id = uid("evl");
    try {
      await this.svc.db.query(
        "INSERT INTO agent_evaluations (id, org_id, user_id, year, rating, comment, evaluator_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [id, orgId, userId, i.year, i.rating, i.comment ?? "", actorId],
      );
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw badRequest(`L'évaluation ${i.year} existe déjà`);
      throw e;
    }
    await this.svc.log(actorId, "hr.evaluation.added", { orgId, data: { user_id: userId, year: i.year } });
    return { id };
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
  async remove(
    actorId: string,
    orgId: string,
    table: "agent_diplomas" | "agent_contacts" | "agent_trainings" | "agent_evaluations",
    id: string,
  ) {
    const r = await this.svc.db.one<{ user_id: string }>(`SELECT user_id FROM ${table} WHERE id = $1 AND org_id = $2`, [
      id,
      orgId,
    ]);
    if (!r) throw notFound("Élément introuvable");
    await this.canEditLists(actorId, orgId, r.user_id);
    await this.svc.db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    const kind = {
      agent_diplomas: "hr.diploma.deleted",
      agent_contacts: "hr.contact.deleted",
      agent_trainings: "hr.training.deleted",
      agent_evaluations: "hr.evaluation.deleted",
    }[table];
    await this.svc.log(actorId, kind, {
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
  // Thème 6 : sortie, échéances, demandes de correction, formations et évaluations
  r.post<Id>("/api/hr/agents/:id/exit", async (req) =>
    hr.exit(req.userId, req.orgId, req.params.id, Exit.parse(req.body)),
  );
  r.post<Id>("/api/hr/agents/:id/exit/cancel", async (req) =>
    hr.cancelExit(req.userId, req.orgId, req.params.id, CancelExit.parse(req.body)),
  );
  r.get("/api/hr/deadlines", async (req) => hr.deadlines(req.userId, req.orgId));
  r.post("/api/hr/me/corrections", async (req) =>
    hr.requestCorrection(req.userId, req.orgId, z.object({ message: z.string().max(5000) }).parse(req.body).message),
  );
  r.get("/api/hr/corrections", async (req) => hr.corrections(req.userId, req.orgId));
  r.post<Id>("/api/hr/corrections/:id/close", async (req) =>
    hr.closeCorrection(
      req.userId,
      req.orgId,
      req.params.id,
      z.object({ response: z.string().max(5000) }).parse(req.body ?? {}).response ?? "",
    ),
  );
  r.post<Id>("/api/hr/agents/:id/trainings", async (req) =>
    hr.addTraining(req.userId, req.orgId, req.params.id, Training.parse(req.body)),
  );
  r.post<Id>("/api/hr/agents/:id/evaluations", async (req) =>
    hr.addEvaluation(req.userId, req.orgId, req.params.id, Evaluation.parse(req.body)),
  );
  r.delete<Id>("/api/hr/trainings/:id", async (req) => hr.remove(req.userId, req.orgId, "agent_trainings", req.params.id));
  r.delete<Id>("/api/hr/evaluations/:id", async (req) =>
    hr.remove(req.userId, req.orgId, "agent_evaluations", req.params.id),
  );
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
