-- Lot PA2 (docs/CONCEPTION.md § 4.4 à 4.6) : accords avec les partenaires et pièces de collaboration.
-- Un accord lie un ou plusieurs partenaires ; il reçoit son numéro CONV/AAAA/NNNN à l'entrée en vigueur, son texte
-- est alors figé ; un avenant le modifie. Les pièces se rangent dans le partenaire ou dans l'accord, par nature.

ALTER TABLE ref_values DROP CONSTRAINT IF EXISTS ref_values_list_check;
ALTER TABLE ref_values ADD CONSTRAINT ref_values_list_check
  CHECK (list IN ('activity_type', 'unit_type', 'partner_type', 'partner_category', 'agreement_type', 'partner_doc_nature'));

-- Le fil d'un partenaire retrace aussi ses accords
ALTER TABLE partner_history DROP CONSTRAINT IF EXISTS partner_history_kind_check;
ALTER TABLE partner_history ADD CONSTRAINT partner_history_kind_check
  CHECK (kind IN ('created', 'state', 'note', 'merged', 'absorbed', 'contact', 'updated', 'agreement', 'document'));

CREATE TABLE agreements (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  type_code TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  partner_ref TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'preparation' CHECK (state IN ('preparation', 'signature', 'vigueur', 'resilie')),
  -- Numéro du registre, attribué à l'entrée en vigueur selon l'année de signature
  year INTEGER,
  seq INTEGER,
  signed_on DATE,
  -- Exemplaire signé sur papier, déclaré par un gestionnaire, plutôt que signé au signataire
  signed_outside BOOLEAN NOT NULL DEFAULT FALSE,
  effective_on DATE,
  end_on DATE,
  tacit_renewal BOOLEAN NOT NULL DEFAULT FALSE,
  unit_id TEXT,
  focal_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  -- Avenant : l'accord qu'il modifie, son rang, la nouvelle échéance qu'il porte
  parent_id TEXT,
  amendment_no INTEGER,
  new_end_on DATE,
  sign_document_id TEXT,
  -- Seuil d'alerte d'échéance déjà signalé (90, 30, 7 jours) : chaque seuil ne prévient qu'une fois
  reminded_days INTEGER,
  ended_on DATE,
  ended_reason TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (org_id, year, seq),
  CHECK ((year IS NULL) = (seq IS NULL)),
  CHECK (state IN ('preparation', 'signature') OR seq IS NOT NULL),
  CHECK (end_on IS NULL OR effective_on IS NULL OR end_on >= effective_on),
  CHECK ((parent_id IS NULL) = (amendment_no IS NULL)),
  FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id) ON DELETE SET NULL (unit_id),
  FOREIGN KEY (org_id, parent_id) REFERENCES agreements (org_id, id),
  FOREIGN KEY (org_id, sign_document_id) REFERENCES sign_documents (org_id, id) ON DELETE SET NULL (sign_document_id)
);
CREATE UNIQUE INDEX agreements_amendment_uq ON agreements (parent_id, amendment_no) WHERE parent_id IS NOT NULL;
CREATE INDEX agreements_org_idx ON agreements (org_id, state, end_on);
CREATE INDEX agreements_unit_idx ON agreements (org_id, unit_id);
CREATE INDEX agreements_parent_idx ON agreements (org_id, parent_id);
CREATE INDEX agreements_sign_idx ON agreements (org_id, sign_document_id);
CREATE INDEX agreements_focal_idx ON agreements (focal_id);
CREATE INDEX agreements_created_by_idx ON agreements (created_by);
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

-- Les parties : un ou plusieurs partenaires, dont un chef de file
CREATE TABLE agreement_parties (
  org_id TEXT NOT NULL,
  agreement_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  lead BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (agreement_id, partner_id),
  FOREIGN KEY (org_id, agreement_id) REFERENCES agreements (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, partner_id) REFERENCES partners (org_id, id)
);
CREATE UNIQUE INDEX agreement_parties_lead_uq ON agreement_parties (agreement_id) WHERE lead;
CREATE INDEX agreement_parties_agreement_idx ON agreement_parties (org_id, agreement_id);
CREATE INDEX agreement_parties_partner_idx ON agreement_parties (org_id, partner_id);
ALTER TABLE agreement_parties ENABLE ROW LEVEL SECURITY;

-- Pièces de collaboration : jointes au partenaire, et le cas échéant à l'un de ses accords
CREATE TABLE partner_documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  agreement_id TEXT,
  nature_code TEXT NOT NULL,
  official BOOLEAN NOT NULL DEFAULT FALSE,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, partner_id) REFERENCES partners (org_id, id),
  FOREIGN KEY (org_id, agreement_id) REFERENCES agreements (org_id, id)
);
CREATE INDEX partner_documents_partner_idx ON partner_documents (org_id, partner_id, created_at DESC);
CREATE INDEX partner_documents_agreement_idx ON partner_documents (org_id, agreement_id);
CREATE INDEX partner_documents_uploader_idx ON partner_documents (uploader_id);
ALTER TABLE partner_documents ENABLE ROW LEVEL SECURITY;
