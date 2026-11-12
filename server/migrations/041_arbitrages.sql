-- Portefeuille de projets : demandes d'arbitrage. Le chef de projet pose une question à la DG, avec son contexte, au
-- moins deux options (et leurs conséquences) et sa recommandation ; la DG tranche — jamais celui qui a demandé — et la
-- décision s'inscrit au registre des décisions, rattachée au projet. La demande peut être retirée. Tout est tracé.
CREATE TABLE project_arbitrations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  question TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  options JSONB NOT NULL,
  recommendation INTEGER,
  wanted_by DATE,
  status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'tranche', 'retire')),
  requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_option INTEGER,
  decision_note TEXT NOT NULL DEFAULT '',
  decision_id TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, project_id) REFERENCES projects (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, decision_id) REFERENCES dg_decisions (org_id, id) ON DELETE SET NULL (decision_id)
);
CREATE INDEX project_arbitrations_project_idx ON project_arbitrations (org_id, project_id);
CREATE INDEX project_arbitrations_status_idx ON project_arbitrations (org_id, status);
CREATE INDEX project_arbitrations_decision_idx ON project_arbitrations (org_id, decision_id);
CREATE INDEX project_arbitrations_requested_by_idx ON project_arbitrations (requested_by);
CREATE INDEX project_arbitrations_decided_by_idx ON project_arbitrations (decided_by);
ALTER TABLE project_arbitrations ENABLE ROW LEVEL SECURITY;
