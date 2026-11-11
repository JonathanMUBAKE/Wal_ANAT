-- Lot PA1 (docs/CONCEPTION.md, partie 4) : l'annuaire des partenaires.
-- Un annuaire unique des tiers : type et catégories tirés des référentiels, état à cycle fixe, contacts,
-- points focaux, notes d'échange et historique. Une fiche absorbée par une fusion reste lisible et renvoie à l'autre.

-- Deux nouvelles listes paramétrables : types et catégories de partenaires
ALTER TABLE ref_values DROP CONSTRAINT IF EXISTS ref_values_list_check;
ALTER TABLE ref_values ADD CONSTRAINT ref_values_list_check
  CHECK (list IN ('activity_type', 'unit_type', 'partner_type', 'partner_category'));

CREATE TABLE partners (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Nom, sigle et identifiant ramenés à leur forme simple (sans accents, casse ni ponctuation) : contrôle des doublons
  name_key TEXT NOT NULL,
  acronym TEXT NOT NULL DEFAULT '',
  acronym_key TEXT NOT NULL DEFAULT '',
  official_id TEXT NOT NULL DEFAULT '',
  official_key TEXT NOT NULL DEFAULT '',
  type_code TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'identifie'
    CHECK (state IN ('identifie', 'en_discussion', 'actif', 'suspendu', 'clos')),
  state_reason TEXT NOT NULL DEFAULT '',
  -- Il a quitté au moins une fois l'état « Identifié » : la fiche ne se supprime plus
  engaged BOOLEAN NOT NULL DEFAULT FALSE,
  country TEXT NOT NULL DEFAULT '' CHECK (country = '' OR country ~ '^[A-Z]{2}$'),
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  unit_id TEXT,
  focal_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  merged_into TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  UNIQUE (org_id, id),
  CHECK (merged_into IS NULL OR merged_into <> id),
  FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id) ON DELETE SET NULL (unit_id),
  FOREIGN KEY (org_id, merged_into) REFERENCES partners (org_id, id)
);
-- Un nom, un sigle, un identifiant officiel ne désignent qu'une fiche vivante de l'institution
CREATE UNIQUE INDEX partners_name_uq ON partners (org_id, name_key) WHERE merged_into IS NULL;
CREATE UNIQUE INDEX partners_acronym_uq ON partners (org_id, acronym_key) WHERE merged_into IS NULL AND acronym_key <> '';
CREATE UNIQUE INDEX partners_official_uq ON partners (org_id, official_key) WHERE merged_into IS NULL AND official_key <> '';
CREATE INDEX partners_org_idx ON partners (org_id, state, type_code);
CREATE INDEX partners_unit_idx ON partners (org_id, unit_id);
CREATE INDEX partners_merged_idx ON partners (org_id, merged_into);
CREATE INDEX partners_focal_idx ON partners (focal_id);
CREATE INDEX partners_created_by_idx ON partners (created_by);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Catégories : plusieurs par partenaire (PTF, partenaire technique, prestataire…)
CREATE TABLE partner_categories (
  org_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  code TEXT NOT NULL,
  PRIMARY KEY (partner_id, code),
  FOREIGN KEY (org_id, partner_id) REFERENCES partners (org_id, id) ON DELETE CASCADE
);
CREATE INDEX partner_categories_partner_idx ON partner_categories (org_id, partner_id);
CREATE INDEX partner_categories_code_idx ON partner_categories (org_id, code);
ALTER TABLE partner_categories ENABLE ROW LEVEL SECURITY;

-- Points focaux supplémentaires (le principal est partners.focal_id)
CREATE TABLE partner_focals (
  org_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (partner_id, user_id),
  FOREIGN KEY (org_id, partner_id) REFERENCES partners (org_id, id) ON DELETE CASCADE
);
CREATE INDEX partner_focals_partner_idx ON partner_focals (org_id, partner_id);
CREATE INDEX partner_focals_user_idx ON partner_focals (user_id);
ALTER TABLE partner_focals ENABLE ROW LEVEL SECURITY;

-- Personnes chez le partenaire : jamais des comptes de l'outil ; elles s'archivent, ne se suppriment pas
CREATE TABLE partner_contacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, partner_id) REFERENCES partners (org_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX partner_contacts_principal_uq ON partner_contacts (partner_id) WHERE principal;
CREATE INDEX partner_contacts_partner_idx ON partner_contacts (org_id, partner_id);
CREATE INDEX partner_contacts_created_by_idx ON partner_contacts (created_by);
ALTER TABLE partner_contacts ENABLE ROW LEVEL SECURITY;

-- Fil de la relation : notes d'échange saisies et événements de la fiche (création, état, fusion, contacts)
CREATE TABLE partner_history (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('created', 'state', 'note', 'merged', 'absorbed', 'contact', 'updated')),
  body TEXT NOT NULL DEFAULT '',
  happened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, partner_id) REFERENCES partners (org_id, id) ON DELETE CASCADE
);
CREATE INDEX partner_history_partner_idx ON partner_history (org_id, partner_id, happened_on DESC);
CREATE INDEX partner_history_actor_idx ON partner_history (actor_id);
ALTER TABLE partner_history ENABLE ROW LEVEL SECURITY;

-- Droits de l'annuaire pour les profils système existants
UPDATE access_profiles SET permissions = permissions || '["partners.view","partners.manage"]'::jsonb
  WHERE is_system AND base_role IN ('owner', 'admin');
UPDATE access_profiles SET permissions = permissions || '["partners.view"]'::jsonb
  WHERE is_system AND id LIKE 'prf_member_%';
