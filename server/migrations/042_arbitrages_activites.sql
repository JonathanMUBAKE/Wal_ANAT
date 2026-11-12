-- Une seule porte pour les décisions : l'arbitrage vaut aussi pour les activités (commission, conférence, rendez-vous,
-- activité interne). Une demande porte sur un projet ou sur une activité, jamais les deux.
ALTER TABLE project_arbitrations ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE project_arbitrations ADD COLUMN activity_id TEXT;
ALTER TABLE project_arbitrations ADD CONSTRAINT project_arbitrations_activity_fk FOREIGN KEY (org_id, activity_id)
  REFERENCES agency_activities (org_id, id) ON DELETE CASCADE;
ALTER TABLE project_arbitrations ADD CONSTRAINT project_arbitrations_one_dossier
  CHECK (num_nonnulls(project_id, activity_id) = 1);
CREATE INDEX project_arbitrations_activity_idx ON project_arbitrations (org_id, activity_id);
