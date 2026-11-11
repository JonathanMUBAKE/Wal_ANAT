import { badRequest, isRealDate, today } from "./services.js";

/*
 * Description d'un document (docs/DESIGN-SYSTEM.md § 4, « Grille CRUD ») : les champs exigés dépendent de sa nature,
 * tirée du référentiel des natures de documents. Commun aux pièces des partenaires et aux documents des dossiers.
 */

export interface DocumentMeta {
  title?: string;
  other_label?: string;
  reference?: string;
  issued_on?: string | null;
  expires_on?: string | null;
  notes?: string;
}

/** Contrôle de la description selon la nature : dates, référence, précision ; dates réelles et cohérentes. */
export function checkDocumentMeta(nature: { label: string; props: Record<string, unknown> }, i: DocumentMeta) {
  const m = {
    title: i.title?.trim() ?? "",
    other_label: i.other_label?.trim() ?? "",
    reference: i.reference?.trim() ?? "",
    issued_on: i.issued_on || null,
    expires_on: i.expires_on || null,
    notes: i.notes?.trim() ?? "",
  };
  const what = `pour un document « ${nature.label} »`;
  if (nature.props.dated && !m.issued_on) throw badRequest(`La date de production est obligatoire ${what}`);
  if (nature.props.expires && !m.expires_on) throw badRequest(`La date d'expiration est obligatoire ${what}`);
  if (nature.props.referenced && !m.reference) throw badRequest(`La référence est obligatoire ${what}`);
  if (nature.props.precise && !m.other_label) throw badRequest("Précisez la nature du document");
  for (const d of [m.issued_on, m.expires_on]) if (d && !isRealDate(d)) throw badRequest(`Date invalide : ${d}`);
  if (m.issued_on && m.issued_on > today()) throw badRequest("La date de production ne peut pas être dans le futur");
  if (m.issued_on && m.expires_on && m.expires_on < m.issued_on)
    throw badRequest("La date d'expiration précède la date de production");
  return m;
}
