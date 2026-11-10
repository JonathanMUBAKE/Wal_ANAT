-- Référentiels paramétrables de l'institution : types d'activités, types d'entités (docs/PARAMETRAGE.md).
-- Une valeur a un code stable, ne se supprime pas (elle s'archive) ; seul l'administrateur système la modifie.
CREATE TABLE ref_values (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  list TEXT NOT NULL CHECK (list IN ('activity_type', 'unit_type')),
  code TEXT NOT NULL CHECK (code ~ '^[a-z0-9_]{1,60}$'),
  label TEXT NOT NULL,
  plural TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'slate',
  icon TEXT NOT NULL DEFAULT 'circle',
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  props JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, list, code),
  UNIQUE (org_id, id)
);
CREATE INDEX ref_values_list_idx ON ref_values (org_id, list, position);
ALTER TABLE ref_values ENABLE ROW LEVEL SECURITY;

-- Les types d'activités ne sont plus figés dans la base : le serveur contrôle qu'ils existent dans le référentiel
ALTER TABLE agency_activities DROP CONSTRAINT IF EXISTS agency_activities_kind_check;

-- Les types d'entités saisis en texte libre deviennent des valeurs du référentiel, repérées par un code stable
INSERT INTO ref_values (id, org_id, list, code, label, position)
SELECT 'ref_' || substr(md5(k.org_id || k.kind), 1, 12), k.org_id, 'unit_type',
  trim(both '_' from regexp_replace(translate(lower(k.kind), 'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc'), '[^a-z0-9]+', '_', 'g')),
  k.kind, 500
FROM (SELECT DISTINCT org_id, kind FROM org_units) k
ON CONFLICT (org_id, list, code) DO NOTHING;
UPDATE org_units SET kind = trim(both '_' from regexp_replace(translate(lower(kind), 'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc'), '[^a-z0-9]+', '_', 'g'));
