-- Lot P3c (docs/PARCOURS-METIER.md) : le plan dit quoi, le dossier dit comment.
-- Un projet ou une activité de l'institution réalise une activité du plan ; son avancement y remonte.
ALTER TABLE projects ADD COLUMN plan_activity_id TEXT;
ALTER TABLE projects ADD CONSTRAINT projects_plan_activity_fk
  FOREIGN KEY (org_id, plan_activity_id) REFERENCES plan_activities (org_id, id) ON DELETE SET NULL (plan_activity_id);
ALTER TABLE agency_activities ADD COLUMN plan_activity_id TEXT;
ALTER TABLE agency_activities ADD CONSTRAINT activities_plan_activity_fk
  FOREIGN KEY (org_id, plan_activity_id) REFERENCES plan_activities (org_id, id) ON DELETE SET NULL (plan_activity_id);
CREATE INDEX projects_plan_activity_idx ON projects (plan_activity_id);
CREATE INDEX activities_plan_activity_idx ON agency_activities (plan_activity_id);
