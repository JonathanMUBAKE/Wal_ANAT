import { uid } from "./db.js";
import type { Permission } from "./permissions.js";
import { HttpError, badRequest, forbidden, notFound, type Services } from "./services.js";

/** Listes paramétrables de l'institution (docs/PARAMETRAGE.md). Les autres listes restent fixes : des règles en dépendent. */
export const LISTS = [
  "activity_type",
  "unit_type",
  "partner_type",
  "partner_category",
  "agreement_type",
  "partner_doc_nature",
] as const;
export type List = (typeof LISTS)[number];
/** Teintes du système de design, lisibles en clair et en sombre. */
export const COLORS = ["blue", "teal", "green", "ochre", "terracotta", "indigo", "violet", "slate"] as const;
export const ICONS = [
  "landmark",
  "mic",
  "handshake",
  "calendar-clock",
  "briefcase",
  "map",
  "users",
  "flag",
  "building",
  "globe",
  "file-text",
  "graduation-cap",
  "scale",
  "map-pin",
  "network",
  "circle",
] as const;
/** Propriétés admises par liste : elles portent les règles qui dépendaient autrefois d'une valeur figée. */
const PROPS: Record<List, Record<string, "boolean" | "string">> = {
  activity_type: { confidential_default: "boolean", tracks_progress: "boolean", counterpart_label: "string" },
  unit_type: { provincial: "boolean" },
  partner_type: { public: "boolean" },
  partner_category: { financial: "boolean", supplier: "boolean" },
  agreement_type: { binding: "boolean", financial: "boolean" },
  partner_doc_nature: {
    official: "boolean",
    dated: "boolean",
    expires: "boolean",
    referenced: "boolean",
    precise: "boolean",
  },
};
/** Qui peut ajouter un type depuis un formulaire du module (« Autre… ») : le droit de gestion de ce module. */
const CONTRIBUTORS: Record<List, Permission> = {
  activity_type: "agenda.manage",
  unit_type: "org.structure",
  partner_type: "partners.manage",
  partner_category: "partners.manage",
  agreement_type: "partners.manage",
  partner_doc_nature: "partners.manage",
};
const LIST_NAME: Record<List, string> = {
  activity_type: "Type d'activité",
  unit_type: "Type d'entité",
  partner_type: "Type de partenaire",
  partner_category: "Catégorie de partenaire",
  agreement_type: "Type d'accord",
  partner_doc_nature: "Nature de pièce",
};

export interface RefValue {
  id: string;
  org_id: string;
  list: List;
  code: string;
  label: string;
  plural: string;
  color: string;
  icon: string;
  position: number;
  archived: boolean;
  props: Record<string, unknown>;
}
type Seed = Pick<RefValue, "code" | "label" | "plural" | "color" | "icon" | "props">;
/** Valeurs de départ : elles reproduisent les listes figées d'avant le paramétrage. */
const DEFAULTS: Record<List, Seed[]> = {
  activity_type: [
    {
      code: "commission",
      label: "Commission",
      plural: "Commissions",
      color: "ochre",
      icon: "landmark",
      props: { counterpart_label: "Instance" },
    },
    {
      code: "conference",
      label: "Conférence",
      plural: "Conférences",
      color: "terracotta",
      icon: "mic",
      props: { counterpart_label: "Organisateur" },
    },
    {
      code: "rendez_vous",
      label: "Rendez-vous",
      plural: "Rendez-vous",
      color: "indigo",
      icon: "handshake",
      props: { counterpart_label: "Interlocuteur", confidential_default: true },
    },
    {
      code: "interne",
      label: "Activité interne",
      plural: "Activités internes",
      color: "slate",
      icon: "calendar-clock",
      props: { counterpart_label: "Partenaire", tracks_progress: true },
    },
  ],
  unit_type: [
    { code: "organisation", label: "Institution", plural: "Institution", color: "blue", icon: "landmark", props: {} },
    {
      code: "direction_generale",
      label: "Direction générale",
      plural: "Directions générales",
      color: "blue",
      icon: "building",
      props: {},
    },
    { code: "direction", label: "Direction", plural: "Directions", color: "blue", icon: "building", props: {} },
    { code: "departement", label: "Département", plural: "Départements", color: "teal", icon: "network", props: {} },
    { code: "service", label: "Service", plural: "Services", color: "slate", icon: "briefcase", props: {} },
    { code: "cellule", label: "Cellule", plural: "Cellules", color: "slate", icon: "users", props: {} },
    {
      code: "representation_provinciale",
      label: "Représentation provinciale",
      plural: "Représentations provinciales",
      color: "green",
      icon: "map-pin",
      props: { provincial: true },
    },
    { code: "antenne", label: "Antenne", plural: "Antennes", color: "green", icon: "map", props: { provincial: true } },
  ],
  // Nature juridique du partenaire : un seul type par fiche (docs/CONCEPTION.md § 4.3)
  partner_type: [
    {
      code: "institution_publique",
      label: "Institution publique",
      plural: "Institutions publiques",
      color: "blue",
      icon: "landmark",
      props: { public: true },
    },
    {
      code: "collectivite",
      label: "Collectivité territoriale",
      plural: "Collectivités territoriales",
      color: "green",
      icon: "map-pin",
      props: { public: true },
    },
    {
      code: "etablissement_public",
      label: "Établissement public",
      plural: "Établissements publics",
      color: "teal",
      icon: "building",
      props: { public: true },
    },
    {
      code: "entreprise_privee",
      label: "Entreprise privée",
      plural: "Entreprises privées",
      color: "ochre",
      icon: "briefcase",
      props: { public: false },
    },
    {
      code: "organisation_internationale",
      label: "Organisation internationale",
      plural: "Organisations internationales",
      color: "indigo",
      icon: "globe",
      props: { public: false },
    },
    {
      code: "cooperation_bilaterale",
      label: "Agence de coopération bilatérale",
      plural: "Agences de coopération bilatérale",
      color: "violet",
      icon: "flag",
      props: { public: false },
    },
    {
      code: "ong",
      label: "ONG, association",
      plural: "ONG et associations",
      color: "terracotta",
      icon: "users",
      props: { public: false },
    },
    {
      code: "universite",
      label: "Université, centre de recherche",
      plural: "Universités et centres de recherche",
      color: "slate",
      icon: "graduation-cap",
      props: { public: false },
    },
    { code: "autre", label: "Autre", plural: "Autres", color: "slate", icon: "circle", props: { public: false } },
  ],
  // Rôle du partenaire dans la relation : plusieurs catégories par fiche
  partner_category: [
    {
      code: "ptf",
      label: "Partenaire technique et financier",
      plural: "Partenaires techniques et financiers",
      color: "indigo",
      icon: "landmark",
      props: { financial: true, supplier: false },
    },
    {
      code: "partenaire_technique",
      label: "Partenaire technique",
      plural: "Partenaires techniques",
      color: "teal",
      icon: "network",
      props: { financial: false, supplier: false },
    },
    {
      code: "partenaire_institutionnel",
      label: "Partenaire institutionnel",
      plural: "Partenaires institutionnels",
      color: "blue",
      icon: "scale",
      props: { financial: false, supplier: false },
    },
    {
      code: "mise_en_oeuvre",
      label: "Partenaire de mise en œuvre",
      plural: "Partenaires de mise en œuvre",
      color: "green",
      icon: "handshake",
      props: { financial: false, supplier: false },
    },
    {
      code: "prestataire",
      label: "Prestataire",
      plural: "Prestataires",
      color: "ochre",
      icon: "briefcase",
      props: { financial: false, supplier: true },
    },
    {
      code: "mecene",
      label: "Mécène, sponsor",
      plural: "Mécènes et sponsors",
      color: "terracotta",
      icon: "flag",
      props: { financial: true, supplier: false },
    },
  ],
  // Acte qui encadre une collaboration ; « contraignant » : il n'entre en vigueur que signé (docs/CONCEPTION.md § 4.4)
  agreement_type: [
    {
      code: "convention_partenariat",
      label: "Convention de partenariat",
      plural: "Conventions de partenariat",
      color: "blue",
      icon: "handshake",
      props: { binding: true, financial: false },
    },
    {
      code: "protocole_accord",
      label: "Protocole d'accord",
      plural: "Protocoles d'accord",
      color: "teal",
      icon: "file-text",
      props: { binding: false, financial: false },
    },
    {
      code: "accord_financement",
      label: "Accord de financement",
      plural: "Accords de financement",
      color: "indigo",
      icon: "landmark",
      props: { binding: true, financial: true },
    },
    {
      code: "convention_subvention",
      label: "Convention de subvention",
      plural: "Conventions de subvention",
      color: "violet",
      icon: "scale",
      props: { binding: true, financial: true },
    },
    {
      code: "contrat_cadre",
      label: "Contrat-cadre",
      plural: "Contrats-cadres",
      color: "ochre",
      icon: "briefcase",
      props: { binding: true, financial: false },
    },
    {
      code: "lettre_intention",
      label: "Lettre d'intention",
      plural: "Lettres d'intention",
      color: "slate",
      icon: "flag",
      props: { binding: false, financial: false },
    },
  ],
  // Nature des pièces de collaboration ; une pièce « officielle » ne se supprime pas
  partner_doc_nature: [
    {
      code: "convention_signee",
      label: "Convention signée",
      plural: "Conventions signées",
      color: "blue",
      icon: "file-text",
      props: { official: true, dated: true, expires: false, referenced: false, precise: false },
    },
    {
      code: "avenant",
      label: "Avenant",
      plural: "Avenants",
      color: "indigo",
      icon: "file-text",
      props: { official: true, dated: true, expires: false, referenced: false, precise: false },
    },
    {
      code: "contrat",
      label: "Contrat",
      plural: "Contrats",
      color: "violet",
      icon: "scale",
      props: { official: true, dated: true, expires: true, referenced: true, precise: false },
    },
    {
      code: "lettre_intention",
      label: "Lettre d'intention",
      plural: "Lettres d'intention",
      color: "teal",
      icon: "flag",
      props: { official: true, dated: true, expires: false, referenced: false, precise: false },
    },
    {
      code: "rapport_activite",
      label: "Rapport d'activité",
      plural: "Rapports d'activité",
      color: "green",
      icon: "file-text",
      props: { official: false, dated: true, expires: false, referenced: false, precise: false },
    },
    {
      code: "rapport_financier",
      label: "Rapport financier",
      plural: "Rapports financiers",
      color: "ochre",
      icon: "file-text",
      props: { official: false, dated: true, expires: false, referenced: false, precise: false },
    },
    {
      code: "compte_rendu",
      label: "Compte rendu",
      plural: "Comptes rendus",
      color: "slate",
      icon: "file-text",
      props: { official: false, dated: true, expires: false, referenced: false, precise: false },
    },
    {
      code: "correspondance",
      label: "Correspondance",
      plural: "Correspondances",
      color: "slate",
      icon: "file-text",
      props: { official: false, dated: true, expires: false, referenced: true, precise: false },
    },
    {
      code: "presentation",
      label: "Fiche de présentation",
      plural: "Fiches de présentation",
      color: "slate",
      icon: "file-text",
      props: { official: false, dated: false, expires: false, referenced: false, precise: false },
    },
    {
      code: "autre",
      label: "Autre",
      plural: "Autres",
      color: "slate",
      icon: "circle",
      props: { official: false, dated: false, expires: false, referenced: false, precise: true },
    },
  ],
};

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);

export interface RefInput {
  label?: string;
  plural?: string;
  color?: string;
  icon?: string;
  position?: number;
  archived?: boolean;
  props?: Record<string, unknown>;
}

const seeded = new WeakMap<Services, Set<string>>();

export class Referentials {
  constructor(private svc: Services) {}

  /** Installe une fois par organisation les valeurs de départ manquantes ; une valeur existante n'est jamais modifiée. */
  async ensure(orgId: string) {
    let done = seeded.get(this.svc);
    if (!done) seeded.set(this.svc, (done = new Set()));
    if (done.has(orgId)) return;
    for (const list of LISTS)
      for (const [i, v] of DEFAULTS[list].entries())
        await this.svc.db.query(
          `INSERT INTO ref_values (id, org_id, list, code, label, plural, color, icon, position, props)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (org_id, list, code) DO NOTHING`,
          [uid("ref"), orgId, list, v.code, v.label, v.plural, v.color, v.icon, (i + 1) * 10, JSON.stringify(v.props)],
        );
    done.add(orgId);
  }

  async values(orgId: string, list: List) {
    await this.ensure(orgId);
    return this.svc.db.query<RefValue>(
      "SELECT * FROM ref_values WHERE org_id = $1 AND list = $2 ORDER BY position, created_at",
      [orgId, list],
    );
  }

  /** Lecture pour tous : les écrans en ont besoin pour afficher libellés, couleurs et icônes. */
  async all(actorId: string, orgId: string) {
    if (!(await this.svc.orgRole(actorId, orgId))) throw forbidden("Réservé aux membres de l'institution");
    const out: Record<string, RefValue[]> = {};
    for (const list of LISTS) out[list] = await this.values(orgId, list);
    return out;
  }

  /**
   * Valeur utilisable pour un nouveau dossier : active, connue par son code ou, pour la compatibilité, par son libellé.
   * Une valeur archivée reste acceptée si le dossier la porte déjà (`current`).
   */
  async resolve(orgId: string, list: List, input: string, current?: string) {
    const all = await this.values(orgId, list);
    const key = input.trim();
    const v = all.find((x) => x.code === key) ?? all.find((x) => x.label.toLowerCase() === key.toLowerCase());
    const name = LIST_NAME[list];
    if (!v) throw badRequest(`${name} inconnu : ${key}`);
    if (v.archived && v.code !== current) throw badRequest(`${name} archivé : ${v.label}`);
    return v;
  }

  private async requireSystemAdmin(actorId: string) {
    if (
      !(await this.svc.db.one(
        "SELECT 1 FROM users WHERE id = $1 AND platform_role = 'super_admin' AND status = 'active'",
        [actorId],
      ))
    )
      throw forbidden("Réservé à l'administrateur système");
    await this.svc.assertAdminMfa(actorId);
  }

  private check(list: List, i: RefInput) {
    if (i.color !== undefined && !(COLORS as readonly string[]).includes(i.color))
      throw badRequest(`Couleur inconnue : ${i.color}`);
    if (i.icon !== undefined && !(ICONS as readonly string[]).includes(i.icon))
      throw badRequest(`Icône inconnue : ${i.icon}`);
    for (const [k, v] of Object.entries(i.props ?? {})) {
      const type = PROPS[list][k];
      if (!type) throw badRequest(`Propriété inconnue pour cette liste : ${k}`);
      if (typeof v !== type) throw badRequest(`Valeur invalide pour la propriété ${k}`);
    }
  }

  private async assertUniqueLabel(orgId: string, list: List, label: string, except?: string) {
    const clash = (await this.values(orgId, list)).find(
      (v) => v.id !== except && v.label.trim().toLowerCase() === label.trim().toLowerCase(),
    );
    if (clash) throw badRequest(`Le libellé « ${label.trim()} » existe déjà dans cette liste`);
  }

  async create(actorId: string, orgId: string, list: string, i: RefInput & { label: string }) {
    await this.requireSystemAdmin(actorId);
    return this.insert(actorId, orgId, list, i, "admin");
  }

  /**
   * « Autre… » dans un formulaire : le gestionnaire du module ajoute un type qui manque, avec ses règles.
   * Renommer, réordonner ou archiver reste l'affaire de l'administrateur système.
   */
  async contribute(actorId: string, orgId: string, list: string, i: RefInput & { label: string }) {
    if ((await this.svc.userOrNull(actorId))?.is_ai)
      throw forbidden("Un type est ajouté par une personne, jamais par un coéquipier IA");
    const perm = CONTRIBUTORS[list as List];
    if (!perm) throw badRequest(`Liste inconnue : ${list}`);
    await this.svc.requirePerm(actorId, orgId, perm);
    return this.insert(actorId, orgId, list, { label: i.label, plural: i.plural, props: i.props }, "module");
  }

  private async insert(actorId: string, orgId: string, list: string, i: RefInput & { label: string }, by: string) {
    if (!(LISTS as readonly string[]).includes(list)) throw badRequest(`Liste inconnue : ${list}`);
    const l = list as List;
    if (!i.label.trim()) throw badRequest("Le libellé est obligatoire");
    this.check(l, i);
    await this.assertUniqueLabel(orgId, l, i.label);
    const all = await this.values(orgId, l);
    // Le code est dérivé du libellé, une fois pour toutes ; un suffixe le rend unique
    const base = slug(i.label) || "valeur";
    let code = base;
    for (let n = 2; all.some((v) => v.code === code); n++) code = `${base}_${n}`;
    const id = uid("ref");
    await this.svc.db.query(
      `INSERT INTO ref_values (id, org_id, list, code, label, plural, color, icon, position, props)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        orgId,
        l,
        code,
        i.label.trim(),
        i.plural?.trim() || i.label.trim(),
        i.color ?? "slate",
        i.icon ?? "circle",
        i.position ?? Math.max(0, ...all.map((v) => v.position)) + 10,
        JSON.stringify(i.props ?? {}),
      ],
    );
    await this.svc.log(actorId, "referential.created", {
      orgId,
      data: { id, list: l, code, label: i.label.trim(), by },
    });
    return this.svc.db.one<RefValue>("SELECT * FROM ref_values WHERE id = $1", [id]);
  }

  async update(actorId: string, orgId: string, id: string, i: RefInput) {
    await this.requireSystemAdmin(actorId);
    const v = await this.svc.db.one<RefValue>("SELECT * FROM ref_values WHERE id = $1 AND org_id = $2", [id, orgId]);
    if (!v) throw notFound("Valeur introuvable");
    this.check(v.list, i);
    if (i.label !== undefined) {
      if (!i.label.trim()) throw badRequest("Le libellé est obligatoire");
      await this.assertUniqueLabel(orgId, v.list, i.label, v.id);
    }
    if (i.archived && !v.archived) {
      const active = (await this.values(orgId, v.list)).filter((x) => !x.archived);
      if (active.length <= 1)
        throw new HttpError(409, "La dernière valeur active d'une liste ne peut pas être archivée");
    }
    const props = i.props ? { ...v.props, ...i.props } : v.props;
    await this.svc.db.query(
      `UPDATE ref_values SET label = $1, plural = $2, color = $3, icon = $4, position = $5, archived = $6, props = $7, updated_at = now()
       WHERE id = $8`,
      [
        i.label?.trim() ?? v.label,
        i.plural?.trim() ?? v.plural,
        i.color ?? v.color,
        i.icon ?? v.icon,
        i.position ?? v.position,
        i.archived ?? v.archived,
        JSON.stringify(props),
        id,
      ],
    );
    await this.svc.log(actorId, "referential.updated", {
      orgId,
      data: {
        id,
        list: v.list,
        code: v.code,
        before: { label: v.label, archived: v.archived },
        changes: i as Record<string, unknown>,
      },
    });
    return this.svc.db.one<RefValue>("SELECT * FROM ref_values WHERE id = $1", [id]);
  }
}
