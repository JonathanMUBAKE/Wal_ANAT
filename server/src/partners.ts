import { Activities } from "./activities.js";
import { type Queryable, uid } from "./db.js";
import { Deliverables } from "./deliverables.js";
import { Meetings } from "./meetings.js";
import { linkPartner } from "./partner-links.js";
import { Referentials } from "./referentials.js";
import { Registers } from "./registers.js";
import { HttpError, badRequest, forbidden, isRealDate, notFound, today, type Services } from "./services.js";

/*
 * Annuaire des partenaires (lot PA1, docs/CONCEPTION.md partie 4).
 * Un annuaire unique des tiers de l'institution : type et catégories tirés des référentiels, état à cycle fixe,
 * contacts, points focaux, notes d'échange et historique. L'IA ne crée ni ne modifie rien ; tout est tracé.
 */

export const PARTNER_STATES = ["identifie", "en_discussion", "actif", "suspendu", "clos"] as const;
export type PartnerState = (typeof PARTNER_STATES)[number];
/** Le cycle de la relation : seules ces transitions existent. */
const NEXT: Record<PartnerState, PartnerState[]> = {
  identifie: ["en_discussion", "actif", "clos"],
  en_discussion: ["actif", "clos"],
  actif: ["suspendu", "clos"],
  suspendu: ["actif", "clos"],
  clos: ["en_discussion"],
};
/** Ce que le point focal peut faire seul : faire avancer la discussion. Le reste revient aux gestionnaires. */
const FOCAL_MOVES = new Set(["identifie>en_discussion", "identifie>actif", "en_discussion>actif"]);
const LABEL: Record<PartnerState, string> = {
  identifie: "Identifié",
  en_discussion: "En discussion",
  actif: "Actif",
  suspendu: "Suspendu",
  clos: "Clos",
};

/** Forme simple d'un nom, d'un sigle ou d'un identifiant : sans accents, casse, espaces ni ponctuation. */
export const partnerKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/** Numéro du registre des conventions, attribué à l'entrée en vigueur. */
export const agreementRef = (a: { year: number | null; seq: number | null }) =>
  a.year && a.seq ? `CONV/${a.year}/${String(a.seq).padStart(4, "0")}` : null;
/** Un accord en vigueur dont l'échéance est passée se lit « échu », sauf reconduction tacite. */
export const agreementState = (
  a: { state: string; end_on: string | null; tacit_renewal: boolean },
  now = today(),
): "preparation" | "signature" | "vigueur" | "resilie" | "echu" =>
  a.state === "vigueur" && a.end_on && a.end_on < now && !a.tacit_renewal
    ? "echu"
    : (a.state as "preparation" | "signature" | "vigueur" | "resilie");
/**
 * Accord qui lie encore un partenaire : en vigueur et non échu. La date du jour est celle du serveur, passée en
 * paramètre : `CURRENT_DATE` de la base (UTC) diffère de la date locale autour de minuit.
 */
export const liveAgreement = (day: string) =>
  `a.state = 'vigueur' AND (a.end_on IS NULL OR a.end_on >= ${day}::date OR a.tacit_renewal)`;

const REGIONS = new Intl.DisplayNames(["fr"], { type: "region" });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Textes libres que le rapprochement relie aux fiches. Les mentions confidentielles n'y figurent pas. */
const RECONCILE = {
  sponsor: {
    table: "projects",
    text: "sponsor",
    fk: "sponsor_partner_id",
    where: "TRUE",
    label: "Commanditaire de projet",
  },
  counterpart: {
    table: "agency_activities",
    text: "counterpart",
    fk: "counterpart_partner_id",
    where: "NOT confidential",
    label: "Interlocuteur d'activité",
  },
  correspondent: {
    table: "correspondence",
    text: "correspondent",
    fk: "partner_id",
    where: "NOT confidential",
    label: "Correspondant de courrier",
  },
  contractor: {
    table: "consultant_contracts",
    text: "consultant_name",
    fk: "partner_id",
    where: "TRUE",
    label: "Prestataire de contrat",
  },
} as const;
export type ReconcileSource = keyof typeof RECONCILE;
export const RECONCILE_SOURCES = Object.keys(RECONCILE) as [ReconcileSource, ...ReconcileSource[]];

export interface PartnerInput {
  name?: string;
  acronym?: string;
  official_id?: string;
  type_code?: string;
  categories?: string[];
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  description?: string;
  unit_id?: string | null;
  focal_id?: string | null;
  focal_ids?: string[];
  confidential?: boolean;
}
export interface ContactInput {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  notes?: string;
  principal?: boolean;
  archived?: boolean;
}

interface Row {
  id: string;
  org_id: string;
  name: string;
  acronym: string;
  official_id: string;
  type_code: string;
  state: PartnerState;
  state_reason: string;
  engaged: boolean;
  country: string;
  city: string;
  address: string;
  website: string;
  email: string;
  phone: string;
  description: string;
  unit_id: string | null;
  unit_name: string | null;
  focal_id: string | null;
  focal_name: string | null;
  confidential: boolean;
  merged_into: string | null;
  merged_into_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  categories: string[];
  focal_ids: string[];
  contacts_count: number;
  last_note_on: string | null;
  deletable: boolean;
}

const SELECT = `SELECT p.id, p.org_id, p.name, p.acronym, p.official_id, p.type_code, p.state, p.state_reason, p.engaged,
  p.country, p.city, p.address, p.website, p.email, p.phone, p.description, p.unit_id, u.name AS unit_name,
  p.focal_id, f.name AS focal_name, p.confidential, p.merged_into, m.name AS merged_into_name,
  p.created_by, p.created_at, p.updated_at, p.closed_at,
  COALESCE((SELECT json_agg(pc.code ORDER BY pc.code) FROM partner_categories pc WHERE pc.partner_id = p.id), '[]'::json) AS categories,
  COALESCE((SELECT json_agg(pf.user_id ORDER BY pf.user_id) FROM partner_focals pf WHERE pf.partner_id = p.id), '[]'::json) AS focal_ids,
  (SELECT count(*)::int FROM partner_contacts c WHERE c.partner_id = p.id AND NOT c.archived) AS contacts_count,
  -- Une relation vivante sans échange noté depuis six mois se signale (PA-5)
  (p.state IN ('en_discussion', 'actif') AND p.merged_into IS NULL
    AND COALESCE((SELECT max(h.happened_on) FROM partner_history h WHERE h.partner_id = p.id AND h.kind = 'note'),
                 p.created_at::date) < (now() - interval '6 months')::date) AS no_contact,
  -- Une relation en discussion ou active sans point focal n'est suivie par personne (PA-4)
  (p.state IN ('en_discussion', 'actif') AND p.merged_into IS NULL AND p.focal_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM partner_focals pf WHERE pf.partner_id = p.id)) AS no_focal,
  (SELECT max(h.happened_on)::text FROM partner_history h WHERE h.partner_id = p.id AND h.kind = 'note') AS last_note_on,
  -- Une fiche sans histoire (jamais sortie de « Identifié », ni échange, ni lien) se supprime ; les autres se closent
  (NOT p.engaged AND p.merged_into IS NULL
    AND NOT EXISTS (SELECT 1 FROM partner_history h WHERE h.partner_id = p.id AND h.kind = 'note')
    AND NOT EXISTS (SELECT 1 FROM partners x WHERE x.merged_into = p.id)
    AND NOT EXISTS (SELECT 1 FROM agreement_parties x WHERE x.partner_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM partner_documents x WHERE x.partner_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM projects x WHERE x.sponsor_partner_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM agency_activities x WHERE x.counterpart_partner_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM correspondence x WHERE x.partner_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM consultant_contracts x WHERE x.partner_id = p.id)
    AND NOT EXISTS (SELECT 1 FROM meeting_partners x WHERE x.partner_id = p.id)) AS deletable
  FROM partners p
  LEFT JOIN org_units u ON u.id = p.unit_id
  LEFT JOIN users f ON f.id = p.focal_id
  LEFT JOIN partners m ON m.id = p.merged_into`;
/** Une fiche confidentielle n'est visible que des gestionnaires, de ses points focaux et de son auteur. */
const VISIBLE = (manager: string, actor: string) =>
  `(NOT p.confidential OR ${manager} OR p.focal_id = ${actor} OR p.created_by = ${actor}
    OR EXISTS (SELECT 1 FROM partner_focals pf WHERE pf.partner_id = p.id AND pf.user_id = ${actor}))`;

export class Partners {
  private ref: Referentials;
  constructor(private svc: Services) {
    this.ref = new Referentials(svc);
  }

  // ------------------------------------------------------------------ droits

  private async human(actorId: string) {
    if ((await this.svc.userOrNull(actorId))?.is_ai)
      throw forbidden("Un partenaire est géré par une personne, jamais par un coéquipier IA");
  }
  private async manager(actorId: string, orgId: string) {
    return (await this.svc.permissionsOf(actorId, orgId)).includes("partners.manage");
  }
  private focal = (p: Row, actorId: string) => p.focal_id === actorId || p.focal_ids.includes(actorId);

  private async row(id: string) {
    return this.svc.db.one<Row>(`${SELECT} WHERE p.id = $1`, [id]);
  }

  /** Hors de l'institution, ou confidentielle et hors de portée : la fiche n'existe pas. */
  private async readable(actorId: string, id: string) {
    const p = await this.row(id);
    if (!p || !(await this.svc.orgRole(actorId, p.org_id))) throw notFound("Partenaire introuvable");
    const manager = await this.manager(actorId, p.org_id);
    const mine = this.focal(p, actorId) || p.created_by === actorId;
    if (!manager && !mine) {
      await this.svc.requirePerm(actorId, p.org_id, "partners.view");
      if (p.confidential) throw notFound("Partenaire introuvable");
    }
    return { p, manager };
  }

  /** Accès à une fiche pour les modules qui s'y rattachent (accords, pièces). */
  async access(actorId: string, id: string) {
    const r = await this.readable(actorId, id);
    return { ...r, focal: this.focal(r.p, actorId) };
  }

  /** Écrire sur une fiche : la fiche est vivante, l'auteur est une personne gestionnaire ou point focal. */
  private async writable(actorId: string, id: string) {
    await this.human(actorId);
    const r = await this.readable(actorId, id);
    if (r.p.merged_into)
      throw new HttpError(409, `Cette fiche a été fusionnée avec « ${r.p.merged_into_name ?? "une autre fiche"} »`);
    if (!r.manager && !this.focal(r.p, actorId))
      throw forbidden("Seuls les gestionnaires des partenariats et les points focaux modifient cette fiche");
    return r;
  }

  // ------------------------------------------------------------------ lecture

  private view(p: Row) {
    return { ...p, state_label: LABEL[p.state] };
  }

  async list(
    actorId: string,
    orgId: string,
    f: { state?: PartnerState; type?: string; category?: string; q?: string; selectable?: boolean } = {},
  ) {
    await this.svc.requirePerm(actorId, orgId, "partners.view");
    const manager = await this.manager(actorId, orgId);
    const q = f.q?.trim() ?? "";
    const key = partnerKey(q);
    const rows = await this.svc.db.query<Row>(
      `${SELECT} WHERE p.org_id = $1 AND p.merged_into IS NULL AND ${VISIBLE("$2", "$3")}
       AND ($4::text IS NULL OR p.state = $4)
       AND ($5::text IS NULL OR p.type_code = $5)
       AND ($6::text IS NULL OR EXISTS (SELECT 1 FROM partner_categories pc WHERE pc.partner_id = p.id AND pc.code = $6))
       AND ($7::text IS NULL OR p.name ILIKE $7 ESCAPE '\\' OR p.acronym ILIKE $7 ESCAPE '\\'
            OR ($8::text <> '' AND (p.name_key LIKE '%' || $8 || '%' OR p.acronym_key = $8)))
       AND (NOT $9 OR p.state NOT IN ('suspendu', 'clos'))
       ORDER BY p.name_key`,
      [
        orgId,
        manager,
        actorId,
        f.state ?? null,
        f.type ?? null,
        f.category ?? null,
        q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null,
        key,
        !!f.selectable,
      ],
    );
    return rows.map((r) => this.view(r));
  }

  async get(actorId: string, id: string) {
    const { p, manager } = await this.readable(actorId, id);
    const db = this.svc.db;
    const contacts = await db.query(
      `SELECT c.id, c.name, c.title, c.email, c.phone, c.notes, c.principal, c.archived, c.created_at,
        NOT EXISTS (SELECT 1 FROM correspondence m WHERE m.contact_id = c.id)
          AND NOT EXISTS (SELECT 1 FROM meeting_attendees a WHERE a.contact_id = c.id) AS deletable
       FROM partner_contacts c WHERE c.partner_id = $1 ORDER BY c.archived, c.principal DESC, c.name`,
      [id],
    );
    const history = await db.query<{ kind: string }>(
      `SELECT h.id, h.kind, h.body, h.happened_on::text AS happened_on, h.data, h.created_at, h.actor_id, a.name AS author_name
       FROM partner_history h LEFT JOIN users a ON a.id = h.actor_id
       WHERE h.partner_id = $1 ORDER BY h.happened_on DESC, h.created_at DESC`,
      [id],
    );
    const focal = this.focal(p, actorId);
    const live = !p.merged_into;
    // Les notes d'échange restent aux gestionnaires, aux points focaux et à la direction (PA-3)
    const readNotes = manager || focal || (await this.svc.permissionsOf(actorId, p.org_id)).includes("pilotage.view");
    const notes = readNotes ? history.filter((h) => h.kind === "note") : [];
    const states = live ? NEXT[p.state].filter((s) => manager || (focal && FOCAL_MOVES.has(`${p.state}>${s}`))) : [];
    const focals = p.focal_ids.length
      ? await db.query<{ id: string; name: string }>(
          "SELECT id, name FROM users WHERE id = ANY($1::text[]) ORDER BY name",
          [p.focal_ids],
        )
      : [];
    // Accords du partenaire : un accord confidentiel n'apparaît qu'aux gestionnaires et à ses points focaux
    const agreements = (
      await db.query<{
        id: string;
        type_code: string;
        title: string;
        state: string;
        year: number | null;
        seq: number | null;
        signed_on: string | null;
        end_on: string | null;
        tacit_renewal: boolean;
        parent_id: string | null;
        amendment_no: number | null;
        confidential: boolean;
        lead: boolean;
      }>(
        `SELECT a.id, a.type_code, a.title, a.state, a.year, a.seq, a.signed_on::text AS signed_on, a.end_on::text AS end_on,
          a.tacit_renewal, a.parent_id, a.amendment_no, a.confidential, ap.lead
         FROM agreements a JOIN agreement_parties ap ON ap.agreement_id = a.id
         WHERE ap.partner_id = $1 AND (NOT a.confidential OR $2 OR $3 OR a.focal_id = $4 OR a.created_by = $4)
         ORDER BY a.year DESC NULLS FIRST, a.seq DESC NULLS FIRST, a.created_at DESC`,
        [id, manager, focal, actorId],
      )
    ).map((a) => ({ ...a, reference: agreementRef(a), state: agreementState(a) }));
    const documents = await db.query(
      `SELECT d.id, d.agreement_id, d.nature_code, d.official, d.filename, d.mime, d.size, d.created_at, d.uploader_id,
        u.name AS uploader_name, d.title, d.other_label, d.reference, d.issued_on::text AS issued_on,
        d.expires_on::text AS expires_on, d.notes, (d.expires_on IS NOT NULL AND d.expires_on < $3::date) AS expired
       FROM partner_documents d LEFT JOIN users u ON u.id = d.uploader_id
       WHERE d.partner_id = $1 AND (d.agreement_id IS NULL OR d.agreement_id = ANY($2::text[]))
       ORDER BY d.created_at DESC`,
      [id, agreements.map((a) => a.id), today()],
    );
    const links = await this.links(actorId, p);
    return {
      ...this.view(p),
      focals,
      agreements,
      documents,
      ...links,
      contacts,
      notes,
      history: readNotes ? history : history.filter((h) => h.kind !== "note"),
      can: {
        read_notes: readNotes,
        edit: live && (manager || focal),
        manage: live && manager,
        states,
        delete: live && manager && p.deletable,
      },
    };
  }

  // ------------------------------------------------------------------ contrôles

  private async checkPerson(orgId: string, userId: string, what: string) {
    const u = await this.svc.userOrNull(userId);
    const role = u ? await this.svc.orgRole(userId, orgId) : null;
    if (!u || u.is_ai || !role || role === "guest") throw badRequest(`${what} doit être une personne de l'institution`);
  }

  private clean(i: PartnerInput) {
    const out: PartnerInput = { ...i };
    for (const k of ["name", "acronym", "official_id", "city", "address", "email", "phone", "description"] as const)
      if (out[k] !== undefined) out[k] = out[k]!.trim();
    if (out.name !== undefined && !out.name) throw badRequest("Le nom du partenaire est obligatoire");
    if (out.country !== undefined) {
      const c = out.country.trim().toUpperCase();
      if (c && (!/^[A-Z]{2}$/.test(c) || REGIONS.of(c) === c)) throw badRequest(`Pays inconnu : ${out.country}`);
      out.country = c;
    }
    if (out.website !== undefined) {
      let w = out.website.trim();
      if (w && !/^[a-z][a-z0-9+.-]*:/i.test(w)) w = `https://${w}`;
      if (w) {
        let url: URL;
        try {
          url = new URL(w);
        } catch {
          throw badRequest("Adresse du site invalide");
        }
        if (url.protocol !== "https:" && url.protocol !== "http:") throw badRequest("Adresse du site invalide");
      }
      out.website = w;
    }
    if (out.email && !EMAIL.test(out.email)) throw badRequest("Adresse électronique invalide");
    return out;
  }

  /** Nom, sigle ou identifiant officiel déjà portés par une fiche vivante : on renvoie vers elle. */
  private async assertUnique(
    orgId: string,
    actorId: string,
    k: { name: string; acronym: string; official: string },
    except?: string,
  ) {
    const d = await this.svc.db.one<{ id: string; name: string; confidential: boolean; focal_id: string | null }>(
      `SELECT id, name, confidential, focal_id FROM partners WHERE org_id = $1 AND merged_into IS NULL AND id <> $2
       AND (name_key = $3 OR ($4 <> '' AND acronym_key = $4) OR ($5 <> '' AND official_key = $5)) LIMIT 1`,
      [orgId, except ?? "", k.name, k.acronym, k.official],
    );
    if (!d) return;
    const seen = !d.confidential || d.focal_id === actorId || (await this.manager(actorId, orgId));
    throw new HttpError(
      409,
      seen ? `Ce partenaire existe déjà : « ${d.name} »` : "Ce partenaire existe déjà dans l'annuaire",
      seen ? { duplicate: { id: d.id, name: d.name } } : undefined,
    );
  }

  private async categories(orgId: string, codes: string[], current: string[] = []) {
    const out = new Set<string>();
    for (const c of codes)
      out.add((await this.ref.resolve(orgId, "partner_category", c, current.includes(c) ? c : undefined)).code);
    return [...out];
  }

  private async unit(orgId: string, unitId: string | null | undefined) {
    if (!unitId) return;
    if (!(await this.svc.db.one("SELECT 1 FROM org_units WHERE org_id = $1 AND id = $2", [orgId, unitId])))
      throw badRequest("Entité inconnue dans l'institution");
  }

  private async focals(orgId: string, i: PartnerInput) {
    if (i.focal_id) await this.checkPerson(orgId, i.focal_id, "Le point focal");
    for (const u of i.focal_ids ?? []) await this.checkPerson(orgId, u, "Chaque point focal");
  }

  /**
   * Le point focal ne suspend pas une relation : il le demande, motif à l'appui ; les gestionnaires des partenariats
   * sont prévenus et décident (PA-2). La demande entre au fil de la fiche.
   */
  async requestSuspension(actorId: string, id: string, reason: string) {
    await this.human(actorId);
    const { p } = await this.readable(actorId, id);
    if (!this.focal(p, actorId)) throw forbidden("Seuls les points focaux demandent la suspension d'une relation");
    if (p.state !== "actif" && p.state !== "en_discussion")
      throw new HttpError(409, `Une relation « ${LABEL[p.state]} » ne se suspend pas`);
    const motif = reason.trim();
    if (!motif) throw badRequest("Un motif est obligatoire pour demander la suspension");
    await this.history(this.svc.db, p.org_id, id, actorId, "note", `Demande de suspension : ${motif}`, {
      suspension_request: true,
    });
    for (const u of await this.svc.usersOf(p.org_id)) {
      if (u.is_ai || u.id === actorId) continue;
      if (!(await this.svc.permissionsOf(u.id, p.org_id)).includes("partners.manage")) continue;
      await this.svc.notify(u.id, p.org_id, {
        kind: "partner.suspension_request",
        title: `Suspension demandée : ${p.name}`,
        body: motif,
        actor_id: actorId,
        link: `/partenaires/${id}`,
      });
    }
    await this.svc.log(actorId, "partner.suspension_requested", { orgId: p.org_id, data: { id, reason: motif } });
    return { ok: true };
  }

  private history(
    q: Queryable,
    orgId: string,
    partnerId: string,
    actorId: string,
    kind: string,
    body = "",
    data: Record<string, unknown> = {},
    happenedOn?: string,
  ) {
    return q.query(
      `INSERT INTO partner_history (id, org_id, partner_id, actor_id, kind, body, data, happened_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::date)`,
      [uid("phi"), orgId, partnerId, actorId, kind, body, JSON.stringify(data), happenedOn ?? today()],
    );
  }

  private async onConflict<T>(
    fn: () => Promise<T>,
    orgId: string,
    actorId: string,
    k: Parameters<Partners["assertUnique"]>[2],
    except?: string,
  ) {
    try {
      return await fn();
    } catch (e) {
      // Deux saisies simultanées du même partenaire : la seconde reçoit la même réponse qu'un doublon
      if ((e as { code?: string }).code === "23505") await this.assertUnique(orgId, actorId, k, except);
      throw e;
    }
  }

  // ------------------------------------------------------------------ écriture

  async create(actorId: string, orgId: string, input: PartnerInput & { name: string; type_code: string }) {
    await this.human(actorId);
    await this.svc.requirePerm(actorId, orgId, "partners.manage");
    const i = this.clean(input);
    const type = await this.ref.resolve(orgId, "partner_type", i.type_code ?? "");
    const cats = await this.categories(orgId, i.categories ?? []);
    await this.unit(orgId, i.unit_id);
    await this.focals(orgId, i);
    const k = {
      name: partnerKey(i.name!),
      acronym: partnerKey(i.acronym ?? ""),
      official: partnerKey(i.official_id ?? ""),
    };
    if (!k.name) throw badRequest("Le nom du partenaire doit contenir des lettres ou des chiffres");
    await this.assertUnique(orgId, actorId, k);
    const id = uid("par");
    await this.onConflict(
      () =>
        this.svc.db.tx(async (q) => {
          await q.query(
            `INSERT INTO partners (id, org_id, name, name_key, acronym, acronym_key, official_id, official_key, type_code,
              country, city, address, website, email, phone, description, unit_id, focal_id, confidential, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
            [
              id,
              orgId,
              i.name,
              k.name,
              i.acronym ?? "",
              k.acronym,
              i.official_id ?? "",
              k.official,
              type.code,
              i.country ?? "",
              i.city ?? "",
              i.address ?? "",
              i.website ?? "",
              i.email ?? "",
              i.phone ?? "",
              i.description ?? "",
              i.unit_id ?? null,
              i.focal_id ?? null,
              !!i.confidential,
              actorId,
            ],
          );
          for (const c of cats)
            await q.query("INSERT INTO partner_categories (org_id, partner_id, code) VALUES ($1,$2,$3)", [
              orgId,
              id,
              c,
            ]);
          for (const u of new Set(i.focal_ids ?? []))
            if (u !== i.focal_id)
              await q.query("INSERT INTO partner_focals (org_id, partner_id, user_id) VALUES ($1,$2,$3)", [
                orgId,
                id,
                u,
              ]);
          await this.history(q, orgId, id, actorId, "created", "", { name: i.name });
        }),
      orgId,
      actorId,
      k,
    );
    await this.svc.log(actorId, "partner.created", { orgId, data: { id, name: i.name, type: type.code } });
    await this.notifyFocals(actorId, orgId, i.name!, [i.focal_id, ...(i.focal_ids ?? [])]);
    return this.get(actorId, id);
  }

  private async notifyFocals(actorId: string, orgId: string, name: string, users: (string | null | undefined)[]) {
    for (const u of new Set(users.filter((x): x is string => !!x && x !== actorId)))
      await this.svc.notify(u, orgId, {
        kind: "partner.focal",
        title: `Vous êtes point focal : ${name}`,
        body: "Vous suivez désormais cette relation dans Partenariats › Partenaires.",
        actor_id: actorId,
      });
  }

  async update(actorId: string, id: string, input: PartnerInput) {
    const { p, manager } = await this.writable(actorId, id);
    const i = this.clean(input);
    // Le classement de la fiche et la désignation des points focaux reviennent aux gestionnaires
    if (!manager) {
      const same = (a: string[], b: string[]) => [...a].sort().join() === [...b].sort().join();
      const changes: string[] = [];
      if (i.type_code !== undefined && i.type_code !== p.type_code) changes.push("type");
      if (i.categories !== undefined && !same(i.categories, p.categories)) changes.push("catégories");
      if (i.unit_id !== undefined && (i.unit_id ?? null) !== p.unit_id) changes.push("entité");
      if (i.focal_id !== undefined && (i.focal_id ?? null) !== p.focal_id) changes.push("point focal");
      if (i.focal_ids !== undefined && !same(i.focal_ids, p.focal_ids)) changes.push("points focaux");
      if (i.confidential !== undefined && i.confidential !== p.confidential) changes.push("confidentialité");
      if (changes.length) throw forbidden(`Réservé aux gestionnaires des partenariats : ${changes.join(", ")}`);
    }
    const type =
      i.type_code !== undefined
        ? (await this.ref.resolve(p.org_id, "partner_type", i.type_code, p.type_code)).code
        : p.type_code;
    const cats = i.categories !== undefined ? await this.categories(p.org_id, i.categories, p.categories) : null;
    if (i.unit_id !== undefined) await this.unit(p.org_id, i.unit_id);
    await this.focals(p.org_id, i);
    const name = i.name ?? p.name;
    const acronym = i.acronym ?? p.acronym;
    const official = i.official_id ?? p.official_id;
    const k = { name: partnerKey(name), acronym: partnerKey(acronym), official: partnerKey(official) };
    if (!k.name) throw badRequest("Le nom du partenaire doit contenir des lettres ou des chiffres");
    await this.assertUnique(p.org_id, actorId, k, id);
    const focalId = i.focal_id !== undefined ? (i.focal_id ?? null) : p.focal_id;
    // Une relation en discussion ou active garde au moins un point focal (PA-4)
    if (
      (p.state === "en_discussion" || p.state === "actif") &&
      !focalId &&
      !(i.focal_ids ?? p.focal_ids).length
    )
      throw badRequest(`Une relation « ${LABEL[p.state]} » garde au moins un point focal`);
    await this.onConflict(
      () =>
        this.svc.db.tx(async (q) => {
          await q.query(
            `UPDATE partners SET name = $1, name_key = $2, acronym = $3, acronym_key = $4, official_id = $5, official_key = $6,
              type_code = $7, country = $8, city = $9, address = $10, website = $11, email = $12, phone = $13,
              description = $14, unit_id = $15, focal_id = $16, confidential = $17, updated_at = now()
             WHERE id = $18`,
            [
              name,
              k.name,
              acronym,
              k.acronym,
              official,
              k.official,
              type,
              i.country ?? p.country,
              i.city ?? p.city,
              i.address ?? p.address,
              i.website ?? p.website,
              i.email ?? p.email,
              i.phone ?? p.phone,
              i.description ?? p.description,
              i.unit_id !== undefined ? (i.unit_id ?? null) : p.unit_id,
              focalId,
              i.confidential ?? p.confidential,
              id,
            ],
          );
          if (cats) {
            await q.query("DELETE FROM partner_categories WHERE partner_id = $1", [id]);
            for (const c of cats)
              await q.query("INSERT INTO partner_categories (org_id, partner_id, code) VALUES ($1,$2,$3)", [
                p.org_id,
                id,
                c,
              ]);
          }
          if (i.focal_ids !== undefined) {
            await q.query("DELETE FROM partner_focals WHERE partner_id = $1", [id]);
            for (const u of new Set(i.focal_ids))
              if (u !== focalId)
                await q.query("INSERT INTO partner_focals (org_id, partner_id, user_id) VALUES ($1,$2,$3)", [
                  p.org_id,
                  id,
                  u,
                ]);
          } else if (focalId)
            await q.query("DELETE FROM partner_focals WHERE partner_id = $1 AND user_id = $2", [id, focalId]);
        }),
      p.org_id,
      actorId,
      k,
      id,
    );
    const changed = Object.keys(input).filter((key) => key !== "description" || input.description !== p.description);
    await this.svc.log(actorId, "partner.updated", {
      orgId: p.org_id,
      data: { id, name, fields: changed, before: { name: p.name, type: p.type_code, focal_id: p.focal_id } },
    });
    if (i.name !== undefined && i.name !== p.name)
      await this.history(this.svc.db, p.org_id, id, actorId, "updated", `Renommé : « ${p.name} » devient « ${name} »`);
    const added = [
      focalId !== p.focal_id ? focalId : null,
      ...(i.focal_ids ?? []).filter((u) => !p.focal_ids.includes(u)),
    ];
    await this.notifyFocals(actorId, p.org_id, name, added);
    return this.get(actorId, id);
  }

  async setState(actorId: string, id: string, i: { state: PartnerState; reason?: string }) {
    await this.human(actorId);
    const { p, manager } = await this.readable(actorId, id);
    if (p.merged_into) throw new HttpError(409, "Cette fiche a été fusionnée avec une autre");
    if (p.state === i.state) throw new HttpError(409, `Le partenaire est déjà « ${LABEL[i.state]} »`);
    if (
      i.state === "clos" &&
      (await this.svc.db.one(
        `SELECT 1 FROM agreements a JOIN agreement_parties ap ON ap.agreement_id = a.id
         WHERE ap.partner_id = $1 AND ${liveAgreement("$2")} LIMIT 1`,
        [id, today()],
      ))
    )
      throw new HttpError(409, "Un accord en vigueur lie encore ce partenaire : résiliez-le ou attendez son échéance");
    if (!NEXT[p.state].includes(i.state))
      throw new HttpError(409, `Un partenaire « ${LABEL[p.state]} » ne passe pas directement à « ${LABEL[i.state]} »`);
    if (!manager && !(this.focal(p, actorId) && FOCAL_MOVES.has(`${p.state}>${i.state}`)))
      throw forbidden(
        this.focal(p, actorId)
          ? "Suspendre, clore ou rouvrir une relation est réservé aux gestionnaires des partenariats"
          : "Seuls les gestionnaires des partenariats et les points focaux changent l'état de cette fiche",
      );
    if ((i.state === "en_discussion" || i.state === "actif") && !p.focal_id && !p.focal_ids.length)
      throw badRequest(`Désignez un point focal avant de passer la relation à « ${LABEL[i.state]} »`);
    const reason = i.reason?.trim() ?? "";
    if ((i.state === "suspendu" || i.state === "clos" || p.state === "clos") && !reason)
      throw badRequest(
        p.state === "clos"
          ? "Un motif est obligatoire pour rouvrir la relation"
          : `Un motif est obligatoire pour passer à « ${LABEL[i.state]} »`,
      );
    const moved = await this.svc.db.tx(async (q) => {
      const r = await q.query(
        `UPDATE partners SET state = $1, state_reason = $2, engaged = engaged OR $1 <> 'identifie',
          closed_at = CASE WHEN $1 = 'clos' THEN now() ELSE NULL END, updated_at = now()
         WHERE id = $3 AND state = $4 RETURNING id`,
        [i.state, reason, id, p.state],
      );
      if (r.length) await this.history(q, p.org_id, id, actorId, "state", reason, { from: p.state, to: i.state });
      return r.length > 0;
    });
    if (!moved) throw new HttpError(409, "La fiche a changé entre-temps, rechargez la page");
    await this.svc.log(actorId, "partner.state", {
      orgId: p.org_id,
      data: { id, name: p.name, from: p.state, to: i.state, reason },
    });
    if (i.state === "suspendu" || i.state === "clos")
      for (const u of new Set([p.focal_id, ...p.focal_ids].filter((x): x is string => !!x && x !== actorId)))
        await this.svc.notify(u, p.org_id, {
          kind: "partner.state",
          title: `${p.name} : relation ${i.state === "clos" ? "close" : "suspendue"}`,
          body: reason,
          actor_id: actorId,
        });
    return this.get(actorId, id);
  }

  /** Une fiche créée par erreur se supprime tant qu'elle n'a jamais vécu ; sinon elle se clôt. */
  async remove(actorId: string, id: string) {
    await this.human(actorId);
    const { p, manager } = await this.readable(actorId, id);
    if (!manager) throw forbidden("Supprimer une fiche est réservé aux gestionnaires des partenariats");
    const lived =
      p.engaged ||
      p.merged_into ||
      (await this.svc.db.one(
        `SELECT 1 FROM partner_history WHERE partner_id = $1 AND kind = 'note'
         UNION ALL SELECT 1 FROM partners WHERE merged_into = $1
         UNION ALL SELECT 1 FROM agreement_parties WHERE partner_id = $1
         UNION ALL SELECT 1 FROM partner_documents WHERE partner_id = $1
         UNION ALL SELECT 1 FROM projects WHERE sponsor_partner_id = $1
         UNION ALL SELECT 1 FROM agency_activities WHERE counterpart_partner_id = $1
         UNION ALL SELECT 1 FROM correspondence WHERE partner_id = $1
         UNION ALL SELECT 1 FROM consultant_contracts WHERE partner_id = $1
         UNION ALL SELECT 1 FROM meeting_partners WHERE partner_id = $1 LIMIT 1`,
        [id],
      ));
    if (lived)
      throw new HttpError(
        409,
        "Cette fiche a une histoire (échanges, état, fusion) : elle se clôt, elle ne se supprime pas",
      );
    await this.svc.db.query("DELETE FROM partners WHERE id = $1", [id]);
    await this.svc.log(actorId, "partner.deleted", { orgId: p.org_id, data: { id, name: p.name } });
    return { ok: true };
  }

  /** Fusion d'un doublon : tout ce qu'il porte rejoint la fiche gardée ; il reste lisible et renvoie vers elle. */
  async merge(actorId: string, id: string, intoId: string) {
    await this.human(actorId);
    const { p: dup, manager } = await this.readable(actorId, id);
    if (!manager) throw forbidden("Fusionner des fiches est réservé aux gestionnaires des partenariats");
    if (dup.merged_into) throw new HttpError(409, "Cette fiche a déjà été fusionnée");
    if (intoId === id) throw badRequest("Une fiche ne se fusionne pas avec elle-même");
    const keep = await this.row(intoId);
    if (!keep || keep.org_id !== dup.org_id || keep.merged_into)
      throw badRequest("La fiche à garder est introuvable ou déjà fusionnée");
    await this.svc.db.tx(async (q) => {
      await q.query(
        `INSERT INTO partner_categories (org_id, partner_id, code) SELECT org_id, $1, code FROM partner_categories
         WHERE partner_id = $2 ON CONFLICT DO NOTHING`,
        [intoId, id],
      );
      for (const u of new Set([dup.focal_id, ...dup.focal_ids]))
        if (u && u !== keep.focal_id)
          await q.query(
            "INSERT INTO partner_focals (org_id, partner_id, user_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
            [keep.org_id, intoId, u],
          );
      // Un seul contact principal sur la fiche gardée
      if (
        await q
          .query("SELECT 1 FROM partner_contacts WHERE partner_id = $1 AND principal", [intoId])
          .then((r) => r.length)
      )
        await q.query("UPDATE partner_contacts SET principal = FALSE WHERE partner_id = $1", [id]);
      await q.query("UPDATE partner_contacts SET partner_id = $1 WHERE partner_id = $2", [intoId, id]);
      // Accords et pièces suivent : un accord qui liait déjà les deux fiches garde la fiche conservée, chef de file compris
      const shared = await q.query<{ agreement_id: string; lead: boolean }>(
        `DELETE FROM agreement_parties d WHERE d.partner_id = $2
         AND EXISTS (SELECT 1 FROM agreement_parties k WHERE k.partner_id = $1 AND k.agreement_id = d.agreement_id)
         RETURNING d.agreement_id, d.lead`,
        [intoId, id],
      );
      for (const s of shared.filter((x) => x.lead))
        await q.query("UPDATE agreement_parties SET lead = TRUE WHERE agreement_id = $1 AND partner_id = $2", [
          s.agreement_id,
          intoId,
        ]);
      await q.query("UPDATE agreement_parties SET partner_id = $1 WHERE partner_id = $2", [intoId, id]);
      await q.query("UPDATE partner_documents SET partner_id = $1 WHERE partner_id = $2", [intoId, id]);
      // Les dossiers, courriers, contrats et réunions qui citaient le doublon citent désormais la fiche gardée
      await q.query("UPDATE projects SET sponsor_partner_id = $1 WHERE sponsor_partner_id = $2", [intoId, id]);
      await q.query("UPDATE agency_activities SET counterpart_partner_id = $1 WHERE counterpart_partner_id = $2", [
        intoId,
        id,
      ]);
      await q.query("UPDATE correspondence SET partner_id = $1 WHERE partner_id = $2", [intoId, id]);
      await q.query("UPDATE consultant_contracts SET partner_id = $1 WHERE partner_id = $2", [intoId, id]);
      await q.query(
        `DELETE FROM meeting_partners d WHERE d.partner_id = $2
         AND EXISTS (SELECT 1 FROM meeting_partners k WHERE k.partner_id = $1 AND k.meeting_id = d.meeting_id)`,
        [intoId, id],
      );
      await q.query("UPDATE meeting_partners SET partner_id = $1 WHERE partner_id = $2", [intoId, id]);
      await q.query(
        "UPDATE partner_history SET partner_id = $1 WHERE partner_id = $2 AND kind IN ('note', 'contact')",
        [intoId, id],
      );
      // La fiche gardée devient confidentielle si le doublon l'était : rien n'est exposé par la fusion
      await q.query(
        "UPDATE partners SET confidential = confidential OR $1, engaged = engaged OR $2, updated_at = now() WHERE id = $3",
        [dup.confidential, dup.engaged, intoId],
      );
      await q.query(
        `UPDATE partners SET merged_into = $1, state = 'clos', closed_at = now(), engaged = TRUE,
          state_reason = $2, updated_at = now() WHERE id = $3`,
        [intoId, `Fusionnée avec « ${keep.name} »`, id],
      );
      await this.history(q, keep.org_id, intoId, actorId, "merged", `Fiche « ${dup.name} » fusionnée dans celle-ci`, {
        from: id,
      });
      await this.history(q, keep.org_id, id, actorId, "absorbed", `Fusionnée dans « ${keep.name} »`, { into: intoId });
    });
    await this.svc.log(actorId, "partner.merged", {
      orgId: keep.org_id,
      data: { from: id, from_name: dup.name, into: intoId, into_name: keep.name },
    });
    return this.get(actorId, intoId);
  }

  // ------------------------------------------------------------------ liens avec les autres modules (lot PA3)

  /** Ce qui cite le partenaire ailleurs, chaque module appliquant ses propres droits de lecture. */
  private async links(actorId: string, p: Row) {
    // Sans le droit de lire un module, sa liste est simplement vide ; toute autre erreur remonte
    const safe = async <T>(p: Promise<T[]>): Promise<T[]> => {
      try {
        return await p;
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status && status < 500) return [];
        throw e;
      }
    };
    const projects: { id: string; name: string }[] = [];
    for (const prj of await this.svc.db.query<{ id: string; name: string }>(
      "SELECT id, name FROM projects WHERE org_id = $1 AND sponsor_partner_id = $2 ORDER BY name",
      [p.org_id, p.id],
    ))
      if (
        await this.svc.require(actorId, prj.id, "viewer").then(
          () => true,
          () => false,
        )
      )
        projects.push(prj);
    const activities = (await safe(new Activities(this.svc).list(actorId, p.org_id, {}))).filter(
      (a) => a.counterpart_partner_id === p.id,
    );
    const dossiers = [
      ...projects.map((x) => ({
        kind: "project" as const,
        id: x.id,
        label: x.name,
        role: "Commanditaire",
        type_code: null as string | null,
        date: null as string | null,
        href: `/projects/${x.id}/dashboard`,
      })),
      ...activities.map((a) => ({
        kind: "activity" as const,
        id: a.id,
        label: a.title,
        role: "Interlocuteur",
        type_code: a.kind as string | null,
        date: a.start_on,
        href: `/activites/${a.id}`,
      })),
    ];
    const meetings = (await safe(new Meetings(this.svc).list(actorId, p.org_id, { partner_id: p.id }))).map((m) => ({
      id: m.id,
      reference: m.reference,
      meeting_type: m.meeting_type,
      title: m.title,
      meeting_date: m.meeting_date,
      start_time: m.start_time,
      status: m.status,
    }));
    const mail = (await safe(new Registers(this.svc).listMail(actorId, p.org_id, { partner_id: p.id }))).map((m) => ({
      id: m.id,
      reference: m.reference,
      direction: m.direction,
      subject: m.subject,
      correspondent: m.correspondent,
      contact_name: m.contact_name,
      received_on: m.received_on,
      status: m.status,
      confidential: m.confidential,
    }));
    const contracts = (await safe(new Deliverables(this.svc).contracts(actorId, p.org_id)))
      .filter((c) => c.partner_id === p.id)
      .map((c) => ({
        id: c.id,
        title: c.title,
        consultant_name: c.consultant_name,
        project_id: c.project_id,
        project_name: c.project_name,
        start_on: c.start_on,
        end_on: c.end_on,
        status: c.status,
      }));
    return { dossiers, meetings, mail, contracts };
  }

  /** Textes libres sans fiche (commanditaires, interlocuteurs, correspondants, prestataires), avec une suggestion. */
  async reconcileList(actorId: string, orgId: string) {
    await this.svc.requirePerm(actorId, orgId, "partners.manage");
    const fiches = await this.svc.db.query<{ id: string; name: string; name_key: string; acronym_key: string }>(
      "SELECT id, name, name_key, acronym_key FROM partners WHERE org_id = $1 AND merged_into IS NULL",
      [orgId],
    );
    const out: {
      source: ReconcileSource;
      label: string;
      text: string;
      count: number;
      suggestion: { id: string; name: string } | null;
    }[] = [];
    for (const source of RECONCILE_SOURCES) {
      const s = RECONCILE[source];
      const rows = await this.svc.db.query<{ t: string; n: number }>(
        `SELECT ${s.text} AS t, count(*)::int AS n FROM ${s.table}
         WHERE org_id = $1 AND ${s.fk} IS NULL AND trim(${s.text}) <> '' AND ${s.where}
         GROUP BY ${s.text} ORDER BY count(*) DESC, ${s.text}`,
        [orgId],
      );
      for (const r of rows) {
        const key = partnerKey(r.t);
        const match = key ? fiches.find((x) => x.name_key === key || x.acronym_key === key) : undefined;
        out.push({
          source,
          label: s.label,
          text: r.t,
          count: r.n,
          suggestion: match ? { id: match.id, name: match.name } : null,
        });
      }
    }
    return out;
  }

  /** Relie à une fiche toutes les mentions d'un même texte libre ; le texte d'origine est conservé. */
  async reconcile(actorId: string, orgId: string, i: { source: ReconcileSource; text: string; partner_id: string }) {
    await this.human(actorId);
    await this.svc.requirePerm(actorId, orgId, "partners.manage");
    const s = RECONCILE[i.source];
    const p = (await linkPartner(this.svc, orgId, i.partner_id, {
      allowClosed: true,
      supplier: i.source === "contractor",
    }))!;
    const rows = await this.svc.db.query(
      `UPDATE ${s.table} SET ${s.fk} = $1 WHERE org_id = $2 AND ${s.fk} IS NULL AND ${s.text} = $3 AND ${s.where} RETURNING id`,
      [p.id, orgId, i.text],
    );
    if (rows.length) {
      await this.history(
        this.svc.db,
        orgId,
        p.id,
        actorId,
        "updated",
        `Rapprochement : ${rows.length} mention${rows.length > 1 ? "s" : ""} « ${i.text} » (${s.label.toLowerCase()}) reliée${rows.length > 1 ? "s" : ""} à cette fiche`,
      );
      await this.svc.log(actorId, "partner.reconciled", {
        orgId,
        data: { partner: p.id, source: i.source, text: i.text, count: rows.length },
      });
    }
    return { linked: rows.length };
  }

  // ------------------------------------------------------------------ contacts et notes

  private checkContact(i: ContactInput) {
    const c: ContactInput = { ...i };
    for (const k of ["name", "title", "email", "phone", "notes"] as const) if (c[k] !== undefined) c[k] = c[k]!.trim();
    if (c.name !== undefined && !c.name) throw badRequest("Le nom du contact est obligatoire");
    if (c.email && !EMAIL.test(c.email)) throw badRequest("Adresse électronique du contact invalide");
    return c;
  }

  async addContact(actorId: string, partnerId: string, input: ContactInput & { name: string }) {
    const { p } = await this.writable(actorId, partnerId);
    const c = this.checkContact(input);
    const id = uid("pct");
    await this.svc.db.tx(async (q) => {
      if (c.principal)
        await q.query("UPDATE partner_contacts SET principal = FALSE WHERE partner_id = $1", [partnerId]);
      await q.query(
        `INSERT INTO partner_contacts (id, org_id, partner_id, name, title, email, phone, notes, principal, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id,
          p.org_id,
          partnerId,
          c.name,
          c.title ?? "",
          c.email ?? "",
          c.phone ?? "",
          c.notes ?? "",
          !!c.principal,
          actorId,
        ],
      );
      await this.history(
        q,
        p.org_id,
        partnerId,
        actorId,
        "contact",
        `Contact ajouté : ${c.name}${c.title ? `, ${c.title}` : ""}`,
      );
    });
    await this.svc.log(actorId, "partner.contact", {
      orgId: p.org_id,
      data: { partner: partnerId, contact: id, action: "added" },
    });
    return this.svc.db.one("SELECT * FROM partner_contacts WHERE id = $1", [id]);
  }

  async updateContact(actorId: string, contactId: string, input: ContactInput) {
    const ct = await this.svc.db.one<{
      partner_id: string;
      name: string;
      title: string;
      email: string;
      phone: string;
      notes: string;
      principal: boolean;
      archived: boolean;
    }>("SELECT * FROM partner_contacts WHERE id = $1", [contactId]);
    if (!ct) throw notFound("Contact introuvable");
    const { p } = await this.writable(actorId, ct.partner_id);
    const c = this.checkContact(input);
    const archived = c.archived ?? ct.archived;
    const principal = !archived && (c.principal ?? ct.principal);
    await this.svc.db.tx(async (q) => {
      if (principal && !ct.principal)
        await q.query("UPDATE partner_contacts SET principal = FALSE WHERE partner_id = $1", [ct.partner_id]);
      await q.query(
        `UPDATE partner_contacts SET name = $1, title = $2, email = $3, phone = $4, notes = $5, principal = $6, archived = $7
         WHERE id = $8`,
        [
          c.name ?? ct.name,
          c.title ?? ct.title,
          c.email ?? ct.email,
          c.phone ?? ct.phone,
          c.notes ?? ct.notes,
          principal,
          archived,
          contactId,
        ],
      );
      if (archived !== ct.archived)
        await this.history(
          q,
          p.org_id,
          ct.partner_id,
          actorId,
          "contact",
          `${archived ? "Contact archivé" : "Contact réactivé"} : ${c.name ?? ct.name}`,
        );
    });
    await this.svc.log(actorId, "partner.contact", {
      orgId: p.org_id,
      data: { partner: ct.partner_id, contact: contactId, action: "updated", fields: Object.keys(input) },
    });
    return this.get(actorId, ct.partner_id);
  }

  /** Un contact jamais cité (courrier, réunion) se supprime ; un contact cité s'archive, pour garder la trace. */
  async removeContact(actorId: string, contactId: string) {
    const ct = await this.svc.db.one<{ partner_id: string; name: string }>(
      "SELECT partner_id, name FROM partner_contacts WHERE id = $1",
      [contactId],
    );
    if (!ct) throw notFound("Contact introuvable");
    const { p } = await this.writable(actorId, ct.partner_id);
    if (
      await this.svc.db.one(
        "SELECT 1 FROM correspondence WHERE contact_id = $1 UNION ALL SELECT 1 FROM meeting_attendees WHERE contact_id = $1 LIMIT 1",
        [contactId],
      )
    )
      throw new HttpError(409, "Ce contact est cité dans le courrier ou une réunion : archivez-le plutôt");
    await this.svc.db.tx(async (q) => {
      await q.query("DELETE FROM partner_contacts WHERE id = $1", [contactId]);
      await this.history(q, p.org_id, ct.partner_id, actorId, "contact", `Contact supprimé : ${ct.name}`);
    });
    await this.svc.log(actorId, "partner.contact", {
      orgId: p.org_id,
      data: { partner: ct.partner_id, contact: contactId, action: "deleted" },
    });
    return { ok: true };
  }

  /** Note d'échange : un fait daté de la relation (appel, visite, mission). Elle ne se modifie pas. */
  async addNote(actorId: string, partnerId: string, i: { body: string; happened_on?: string }) {
    const { p } = await this.writable(actorId, partnerId);
    const body = i.body.trim();
    if (!body) throw badRequest("La note est vide");
    if (i.happened_on && !isRealDate(i.happened_on)) throw badRequest(`Date invalide : ${i.happened_on}`);
    if (i.happened_on && i.happened_on > today()) throw badRequest("Un échange ne se note pas dans le futur");
    await this.history(this.svc.db, p.org_id, partnerId, actorId, "note", body, {}, i.happened_on ?? today());
    await this.svc.log(actorId, "partner.note", { orgId: p.org_id, data: { partner: partnerId } });
    return this.get(actorId, partnerId);
  }
}
