-- Tâche confiée (thème 2 de l'analyse, T-1 à T-3) : qui confie une tâche en garde l'intitulé, l'échéance et la
-- priorité, et confirme sa clôture. L'agent déclare la tâche réalisée et demande un report ; le responsable tranche.
ALTER TABLE tasks ADD COLUMN assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN done_declared_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN done_declared_by TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX tasks_assigned_by_idx ON tasks (assigned_by);
CREATE INDEX tasks_done_declared_by_idx ON tasks (done_declared_by);
UPDATE tasks SET assigned_by = creator_id
 WHERE assignee_id IS NOT NULL AND creator_id IS NOT NULL AND assignee_id <> creator_id
   -- Une recommandation de réunion a son propre circuit : déclarée réalisée, puis clôturée par le rédacteur
   AND id NOT IN (SELECT task_id FROM meeting_actions WHERE task_id IS NOT NULL);

CREATE TABLE task_postponements (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_due DATE,
  due_on DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused')),
  decided_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX task_postponements_task_idx ON task_postponements (task_id);
CREATE INDEX task_postponements_requested_by_idx ON task_postponements (requested_by);
CREATE INDEX task_postponements_decided_by_idx ON task_postponements (decided_by);
CREATE UNIQUE INDEX task_postponements_one_pending ON task_postponements (task_id) WHERE status = 'pending';
ALTER TABLE task_postponements ENABLE ROW LEVEL SECURITY;
