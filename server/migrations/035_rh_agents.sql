-- Module RH (identification des agents). Un dossier par agent et par institution, rattaché à son compte : toute
-- personne créée comme agent devient utilisateur (lien de finalisation, profil Agent). Données personnelles :
-- lues par le service RH, l'agent lui-même et le chef de son entité ; tenues par le service RH ; tout est tracé.
CREATE TABLE agent_records (
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  matricule TEXT NOT NULL,
  civility TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL,
  first_names TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  birth_place TEXT NOT NULL DEFAULT '',
  nationality TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '' CHECK (gender IN ('', 'F', 'M')),
  marital_status TEXT NOT NULL DEFAULT '',
  children_count INTEGER CHECK (children_count IS NULL OR children_count BETWEEN 0 AND 30),
  id_document_type TEXT NOT NULL DEFAULT '',
  id_document_number TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  personal_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'fonctionnaire'
    CHECK (status IN ('fonctionnaire', 'contractuel', 'detache', 'stagiaire', 'consultant', 'autre')),
  grade TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  echelon TEXT NOT NULL DEFAULT '',
  function_title TEXT NOT NULL DEFAULT '',
  hired_on DATE,
  function_since DATE,
  contract_end_on DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id),
  UNIQUE (org_id, matricule),
  FOREIGN KEY (org_id, user_id) REFERENCES org_members (org_id, user_id) ON DELETE CASCADE
);
CREATE INDEX agent_records_user_idx ON agent_records (user_id);
CREATE INDEX agent_records_created_by_idx ON agent_records (created_by);
ALTER TABLE agent_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE agent_diplomas (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  field TEXT NOT NULL DEFAULT '',
  institution TEXT NOT NULL DEFAULT '',
  year INTEGER CHECK (year IS NULL OR year BETWEEN 1940 AND 2100),
  level TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, user_id) REFERENCES agent_records (org_id, user_id) ON DELETE CASCADE
);
CREATE INDEX agent_diplomas_agent_idx ON agent_diplomas (org_id, user_id);
ALTER TABLE agent_diplomas ENABLE ROW LEVEL SECURITY;

CREATE TABLE agent_contacts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, user_id) REFERENCES agent_records (org_id, user_id) ON DELETE CASCADE
);
CREATE INDEX agent_contacts_agent_idx ON agent_contacts (org_id, user_id);
ALTER TABLE agent_contacts ENABLE ROW LEVEL SECURITY;

-- Historique des affectations : une ligne ouverte (ended_on vide) par agent, fermée à chaque mutation
CREATE TABLE agent_assignments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  unit_id TEXT,
  function_title TEXT NOT NULL DEFAULT '',
  started_on DATE NOT NULL,
  ended_on DATE,
  reference TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, user_id) REFERENCES agent_records (org_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id) ON DELETE SET NULL (unit_id)
);
CREATE INDEX agent_assignments_agent_idx ON agent_assignments (org_id, user_id, started_on DESC);
CREATE INDEX agent_assignments_unit_idx ON agent_assignments (org_id, unit_id);
CREATE INDEX agent_assignments_created_by_idx ON agent_assignments (created_by);
ALTER TABLE agent_assignments ENABLE ROW LEVEL SECURITY;

-- Les profils d'administration existants reçoivent les droits RH
UPDATE access_profiles SET permissions = permissions || '["hr.view", "hr.manage"]'::jsonb
 WHERE is_system AND base_role IN ('owner', 'admin') AND id LIKE 'prf\_admin\_%' AND NOT permissions ? 'hr.manage';
