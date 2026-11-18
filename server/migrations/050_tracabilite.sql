-- Journal et traçabilité (thème 3 de l'analyse, PH-5) : chaque circuit de signature clos par un rejet est conservé
-- avec ses visas, ses auteurs et son motif, pour rester lisible sur la fiche après une relance.
ALTER TABLE sign_documents ADD COLUMN round INTEGER NOT NULL DEFAULT 1;
CREATE TABLE sign_step_history (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  position INTEGER NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  acted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  acted_at TIMESTAMPTZ,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, document_id) REFERENCES sign_documents (org_id, id) ON DELETE CASCADE
);
CREATE INDEX sign_step_history_doc_idx ON sign_step_history (org_id, document_id, round);
CREATE INDEX sign_step_history_actor_idx ON sign_step_history (actor_id);
CREATE INDEX sign_step_history_acted_by_idx ON sign_step_history (acted_by);
ALTER TABLE sign_step_history ENABLE ROW LEVEL SECURITY;
