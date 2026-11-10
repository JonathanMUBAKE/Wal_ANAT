-- Catalogue des domaines d'activité, fiches d'attributions versionnées et rapports entre entités.
CREATE TABLE activity_domains (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name),
  UNIQUE (org_id, id)
);

CREATE TABLE attribution_sheets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  unit_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  mission TEXT NOT NULL,
  legal_ref TEXT NOT NULL DEFAULT '',
  valid_from DATE,
  valid_to DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((unit_id IS NULL) <> (user_id IS NULL)),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX attribution_one_approved_unit ON attribution_sheets (unit_id) WHERE status = 'approved' AND unit_id IS NOT NULL;
CREATE UNIQUE INDEX attribution_one_approved_user ON attribution_sheets (org_id, user_id) WHERE status = 'approved' AND user_id IS NOT NULL;
CREATE UNIQUE INDEX attribution_one_draft_unit ON attribution_sheets (unit_id) WHERE status = 'draft' AND unit_id IS NOT NULL;
CREATE UNIQUE INDEX attribution_one_draft_user ON attribution_sheets (org_id, user_id) WHERE status = 'draft' AND user_id IS NOT NULL;

CREATE TABLE sheet_domains (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('responsable', 'contributeur', 'consulte', 'validateur', 'informe')),
  UNIQUE (sheet_id, domain_id),
  FOREIGN KEY (org_id, sheet_id) REFERENCES attribution_sheets (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, domain_id) REFERENCES activity_domains (org_id, id)
);

CREATE TABLE sheet_relations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  target_unit_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('hierarchique', 'appui', 'consultation', 'validation', 'coordination', 'information')),
  domain_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (org_id, sheet_id) REFERENCES attribution_sheets (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, target_unit_id) REFERENCES org_units (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, domain_id) REFERENCES activity_domains (org_id, id)
);

ALTER TABLE meeting_agenda_items ADD COLUMN domain_id TEXT;
ALTER TABLE meeting_agenda_items ADD CONSTRAINT agenda_domain_fk FOREIGN KEY (org_id, domain_id) REFERENCES activity_domains (org_id, id);
ALTER TABLE projects ADD COLUMN domain_id TEXT;
ALTER TABLE projects ADD CONSTRAINT projects_domain_fk FOREIGN KEY (org_id, domain_id) REFERENCES activity_domains (org_id, id);

CREATE INDEX attribution_sheets_org_idx ON attribution_sheets (org_id, unit_id);
CREATE INDEX attribution_sheets_user_idx ON attribution_sheets (user_id);
CREATE INDEX attribution_sheets_approved_by_idx ON attribution_sheets (approved_by);
CREATE INDEX attribution_sheets_created_by_idx ON attribution_sheets (created_by);
CREATE INDEX sheet_domains_org_idx ON sheet_domains (org_id, sheet_id);
CREATE INDEX sheet_domains_domain_idx ON sheet_domains (org_id, domain_id);
CREATE INDEX sheet_relations_org_idx ON sheet_relations (org_id, sheet_id);
CREATE INDEX sheet_relations_target_idx ON sheet_relations (org_id, target_unit_id);
CREATE INDEX sheet_relations_domain_idx ON sheet_relations (org_id, domain_id);
CREATE INDEX agenda_domain_idx ON meeting_agenda_items (org_id, domain_id);
CREATE INDEX projects_domain_idx ON projects (org_id, domain_id);

ALTER TABLE activity_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_relations ENABLE ROW LEVEL SECURITY;

-- Droits de la version gouvernementale pour les profils système existants.
UPDATE access_profiles SET permissions = permissions || '["attributions.view","attributions.manage","attributions.approve","plans.view","plans.manage","plans.approve","deliverables.view","deliverables.manage","deliverables.validate","consultants.manage","signature.use","correspondence.view","correspondence.manage","pilotage.view","risks.manage","agenda.view","agenda.manage"]'::jsonb
  WHERE is_system AND base_role IN ('owner', 'admin');
UPDATE access_profiles SET permissions = permissions || '["attributions.view","plans.view","deliverables.view","signature.use","correspondence.view","agenda.view"]'::jsonb
  WHERE is_system AND id LIKE 'prf_member_%';
