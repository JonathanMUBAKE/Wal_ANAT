-- RH, deuxième étape : congés et absences. L'agent demande ; le chef de son entité (ou le service RH à défaut)
-- valide ou refuse, avec un motif s'il refuse ; personne ne valide sa propre demande ni celle qu'il a saisie. Le
-- service RH enregistre au nom d'un agent les absences constatées (maladie, mission). Tout est tracé.
CREATE TABLE agent_leaves (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL
    CHECK (kind IN ('conge_annuel', 'maladie', 'maternite', 'paternite', 'permission', 'formation', 'mission', 'autre')),
  start_on DATE NOT NULL,
  end_on DATE NOT NULL,
  days INTEGER NOT NULL CHECK (days >= 0),
  reason TEXT NOT NULL DEFAULT '',
  interim_id TEXT,
  approver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'demande' CHECK (status IN ('demande', 'approuve', 'refuse', 'annule')),
  decided_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_on >= start_on),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, user_id) REFERENCES org_members (org_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, interim_id) REFERENCES org_members (org_id, user_id) ON DELETE SET NULL (interim_id)
);
CREATE INDEX agent_leaves_agent_idx ON agent_leaves (org_id, user_id, start_on);
CREATE INDEX agent_leaves_interim_idx ON agent_leaves (org_id, interim_id);
CREATE INDEX agent_leaves_approver_idx ON agent_leaves (approver_id);
CREATE INDEX agent_leaves_decided_by_idx ON agent_leaves (decided_by);
CREATE INDEX agent_leaves_created_by_idx ON agent_leaves (created_by);
CREATE INDEX agent_leaves_status_idx ON agent_leaves (org_id, status, start_on);
ALTER TABLE agent_leaves ENABLE ROW LEVEL SECURITY;
