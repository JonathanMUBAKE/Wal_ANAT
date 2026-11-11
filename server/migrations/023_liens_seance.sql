-- Lot P3a (docs/PARCOURS-METIER.md) : la séance alimente le registre et le projet.
-- Décisions de la séance, saisies point par point, inscrites au registre à la validation du compte rendu.
CREATE TABLE meeting_decisions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  agenda_item_id TEXT NOT NULL REFERENCES meeting_agenda_items(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_on DATE,
  decision_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, meeting_id) REFERENCES meetings (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, decision_id) REFERENCES dg_decisions (org_id, id) ON DELETE SET NULL (decision_id)
);
CREATE INDEX meeting_decisions_org_idx ON meeting_decisions (org_id, meeting_id);
CREATE INDEX meeting_decisions_item_idx ON meeting_decisions (agenda_item_id);
CREATE INDEX meeting_decisions_owner_idx ON meeting_decisions (owner_id);
CREATE INDEX meeting_decisions_decision_idx ON meeting_decisions (decision_id);
ALTER TABLE meeting_decisions ENABLE ROW LEVEL SECURITY;

-- Une recommandation d'un compte rendu rattaché à un projet devient une tâche de ce projet
ALTER TABLE meeting_actions ADD COLUMN task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX meeting_actions_task_idx ON meeting_actions (task_id);
