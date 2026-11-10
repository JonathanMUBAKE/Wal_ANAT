-- Registre des décisions de la DG : numéro annuel, texte figé, dossier d'origine, exécution suivie.
CREATE TABLE dg_decisions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  decided_on DATE NOT NULL,
  project_id TEXT,
  activity_id TEXT,
  meeting_id TEXT,
  -- Intitulé du dossier au moment de la décision : le registre reste lisible si le dossier disparaît
  source_label TEXT NOT NULL DEFAULT '',
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_on DATE,
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'a_executer' CHECK (status IN ('a_executer', 'en_cours', 'executee', 'remplacee')),
  execution_note TEXT NOT NULL DEFAULT '',
  executed_at TIMESTAMPTZ,
  replaces_id TEXT,
  recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, year, seq),
  UNIQUE (org_id, id),
  CHECK (num_nonnulls(project_id, activity_id, meeting_id) <= 1),
  CHECK (due_on IS NULL OR due_on >= decided_on),
  FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, project_id) REFERENCES projects (org_id, id) ON DELETE SET NULL (project_id),
  FOREIGN KEY (org_id, activity_id) REFERENCES agency_activities (org_id, id) ON DELETE SET NULL (activity_id),
  FOREIGN KEY (org_id, meeting_id) REFERENCES meetings (org_id, id) ON DELETE SET NULL (meeting_id),
  FOREIGN KEY (org_id, replaces_id) REFERENCES dg_decisions (org_id, id)
);
-- Une décision n'est remplacée qu'une seule fois
CREATE UNIQUE INDEX dg_decisions_replaces_uq ON dg_decisions (replaces_id) WHERE replaces_id IS NOT NULL;
CREATE INDEX dg_decisions_org_idx ON dg_decisions (org_id, status, due_on);
CREATE INDEX dg_decisions_project_idx ON dg_decisions (org_id, project_id);
CREATE INDEX dg_decisions_activity_idx ON dg_decisions (org_id, activity_id);
CREATE INDEX dg_decisions_meeting_idx ON dg_decisions (org_id, meeting_id);
CREATE INDEX dg_decisions_owner_idx ON dg_decisions (owner_id);
CREATE INDEX dg_decisions_recorded_by_idx ON dg_decisions (recorded_by);
ALTER TABLE dg_decisions ENABLE ROW LEVEL SECURITY;

-- Droits du registre pour les profils système existants
UPDATE access_profiles SET permissions = permissions || '["decisions.view","decisions.record"]'::jsonb
  WHERE is_system AND base_role IN ('owner', 'admin');
UPDATE access_profiles SET permissions = permissions || '["decisions.view"]'::jsonb
  WHERE is_system AND id LIKE 'prf_member_%';
