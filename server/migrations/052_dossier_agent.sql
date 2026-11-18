-- Dossier d'agent (thème 6 de l'analyse) : sortie d'un agent (RH-1), formations et évaluations (D-9), demandes de
-- correction adressées au service RH (D-4), pièces du dossier rangées avec les documents des dossiers (D-9).
ALTER TABLE agent_records ADD COLUMN exit_on DATE;
ALTER TABLE agent_records ADD COLUMN exit_reason TEXT
  CHECK (exit_reason IN ('retraite', 'fin_contrat', 'mutation', 'demission', 'licenciement', 'deces', 'autre'));
ALTER TABLE agent_records ADD COLUMN exit_reference TEXT NOT NULL DEFAULT '';
ALTER TABLE agent_records ADD COLUMN exit_applied BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agent_records ADD COLUMN exited_by TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX agent_records_exited_by_idx ON agent_records (exited_by);

CREATE TABLE agent_trainings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT '',
  start_on DATE,
  end_on DATE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_on IS NULL OR start_on IS NULL OR end_on >= start_on),
  FOREIGN KEY (org_id, user_id) REFERENCES agent_records (org_id, user_id) ON DELETE CASCADE
);
CREATE INDEX agent_trainings_agent_idx ON agent_trainings (org_id, user_id);
CREATE INDEX agent_trainings_created_by_idx ON agent_trainings (created_by);
ALTER TABLE agent_trainings ENABLE ROW LEVEL SECURITY;

CREATE TABLE agent_evaluations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('excellent', 'tres_bien', 'bien', 'passable', 'insuffisant')),
  comment TEXT NOT NULL DEFAULT '',
  evaluator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id, year),
  FOREIGN KEY (org_id, user_id) REFERENCES agent_records (org_id, user_id) ON DELETE CASCADE
);
CREATE INDEX agent_evaluations_evaluator_idx ON agent_evaluations (evaluator_id);
ALTER TABLE agent_evaluations ENABLE ROW LEVEL SECURITY;

CREATE TABLE agent_corrections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  response TEXT NOT NULL DEFAULT '',
  handled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, user_id) REFERENCES agent_records (org_id, user_id) ON DELETE CASCADE
);
CREATE INDEX agent_corrections_agent_idx ON agent_corrections (org_id, user_id);
CREATE INDEX agent_corrections_handled_by_idx ON agent_corrections (handled_by);
ALTER TABLE agent_corrections ENABLE ROW LEVEL SECURITY;

ALTER TABLE dossier_documents ADD COLUMN agent_user_id TEXT;
ALTER TABLE dossier_documents ADD CONSTRAINT dossier_documents_agent_fk FOREIGN KEY (org_id, agent_user_id)
  REFERENCES agent_records (org_id, user_id) ON DELETE CASCADE;
ALTER TABLE dossier_documents DROP CONSTRAINT dossier_documents_check;
ALTER TABLE dossier_documents ADD CONSTRAINT dossier_documents_owner_check
  CHECK (num_nonnulls(project_id, activity_id, correspondence_id, agent_user_id) = 1);
CREATE INDEX dossier_documents_agent_idx ON dossier_documents (org_id, agent_user_id, created_at DESC);
