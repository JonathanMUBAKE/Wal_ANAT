import { HttpError, badRequest, type Services } from "./services.js";

/*
 * Choisir un partenaire de l'annuaire depuis un autre module (lot PA3, docs/CONCEPTION.md § 4.7).
 * Module sans dépendance vers les autres services : projets, activités, courrier, contrats et réunions l'utilisent.
 */

export interface LinkedPartner {
  id: string;
  name: string;
  acronym: string;
  state: string;
}

/**
 * Partenaire de l'institution, fiche vivante. Un partenaire clos n'est plus proposé pour un nouveau lien ; le lien
 * qu'un dossier porte déjà (`current`) reste valable. Un prestataire de contrat porte une catégorie « prestataire ».
 */
export async function linkPartner(
  svc: Services,
  orgId: string,
  partnerId: string | null | undefined,
  opts: { current?: string | null; supplier?: boolean; allowClosed?: boolean; actorId?: string } = {},
): Promise<LinkedPartner | null> {
  if (!partnerId) return null;
  const p = await svc.db.one<LinkedPartner & { merged_into: string | null; confidential: boolean }>(
    "SELECT id, name, acronym, state, merged_into, confidential FROM partners WHERE org_id = $1 AND id = $2",
    [orgId, partnerId],
  );
  if (!p || p.merged_into) throw badRequest("Partenaire inconnu dans l'annuaire, ou fiche fusionnée");
  // Une fiche confidentielle qu'on ne lit pas reste inconnue : on ne la lie pas, on ne lit pas son nom (testeurs)
  if (p.confidential && opts.actorId && partnerId !== opts.current) {
    const sees =
      (await svc.permissionsOf(opts.actorId, orgId)).includes("partners.manage") ||
      !!(await svc.db.one(
        `SELECT 1 FROM partners x WHERE x.id = $1 AND (x.focal_id = $2 OR x.created_by = $2
           OR EXISTS (SELECT 1 FROM partner_focals pf WHERE pf.partner_id = x.id AND pf.user_id = $2))`,
        [partnerId, opts.actorId],
      ));
    if (!sees) throw badRequest("Partenaire inconnu dans l'annuaire, ou fiche fusionnée");
  }
  if (p.state === "clos" && partnerId !== opts.current && !opts.allowClosed)
    throw new HttpError(409, `« ${p.name} » est clos : il n'est plus proposé pour un nouveau lien`);
  if (
    opts.supplier &&
    !(await svc.db.one(
      `SELECT 1 FROM partner_categories pc JOIN ref_values rv ON rv.org_id = pc.org_id AND rv.list = 'partner_category'
        AND rv.code = pc.code WHERE pc.partner_id = $1 AND (rv.props->>'supplier')::boolean LIMIT 1`,
      [partnerId],
    ))
  )
    throw badRequest(`« ${p.name} » n'est pas classé prestataire : ajoutez-lui la catégorie correspondante`);
  return { id: p.id, name: p.name, acronym: p.acronym, state: p.state };
}

/** Contact d'un partenaire de l'institution, non archivé ; s'il est donné, `partnerId` doit être le sien. */
export async function linkContact(
  svc: Services,
  orgId: string,
  contactId: string | null | undefined,
  partnerId?: string | null,
) {
  if (!contactId) return null;
  const c = await svc.db.one<{
    id: string;
    name: string;
    title: string;
    partner_id: string;
    partner_name: string;
    partner_acronym: string;
    archived: boolean;
  }>(
    `SELECT c.id, c.name, c.title, c.partner_id, c.archived, p.name AS partner_name, p.acronym AS partner_acronym
     FROM partner_contacts c JOIN partners p ON p.id = c.partner_id WHERE c.org_id = $1 AND c.id = $2`,
    [orgId, contactId],
  );
  if (!c || c.archived) throw badRequest("Contact inconnu ou archivé");
  if (partnerId && c.partner_id !== partnerId) throw badRequest("Ce contact appartient à un autre partenaire");
  return c;
}
