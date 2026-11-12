-- Tâches récurrentes : une tâche porte une périodicité ; la terminer fait naître l'occurrence suivante, une seule
-- fois (next_occurrence_id garde le lien et empêche les doublons quand on rouvre puis termine à nouveau).
ALTER TABLE tasks ADD COLUMN recurrence TEXT
  CHECK (recurrence IN ('daily','weekly','biweekly','monthly','quarterly','yearly'));
ALTER TABLE tasks ADD COLUMN next_occurrence_id TEXT;
ALTER TABLE tasks ADD CONSTRAINT tasks_next_occurrence_org_fk FOREIGN KEY (org_id, next_occurrence_id)
  REFERENCES tasks (org_id, id) ON DELETE SET NULL (next_occurrence_id);
CREATE INDEX tasks_next_occurrence_idx ON tasks (org_id, next_occurrence_id);
