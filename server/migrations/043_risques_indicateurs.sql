-- Risques et indicateurs saisissables et reliés : un risque se rattache à un projet (son équipe le voit dans le
-- dossier), un indicateur à une activité du plan de travail. Les profils qui portent ou pilotent les projets (chef
-- d'entité, DGA, DG) reçoivent le droit de les gérer.
ALTER TABLE risks ADD COLUMN project_id TEXT;
ALTER TABLE risks ADD CONSTRAINT risks_project_fk FOREIGN KEY (org_id, project_id)
  REFERENCES projects (org_id, id) ON DELETE SET NULL (project_id);
CREATE INDEX risks_project_idx ON risks (org_id, project_id);
ALTER TABLE indicators ADD COLUMN plan_activity_id TEXT;
ALTER TABLE indicators ADD CONSTRAINT indicators_plan_activity_fk FOREIGN KEY (org_id, plan_activity_id)
  REFERENCES plan_activities (org_id, id) ON DELETE SET NULL (plan_activity_id);
CREATE INDEX indicators_plan_activity_idx ON indicators (org_id, plan_activity_id);
UPDATE access_profiles SET permissions = permissions || '["risks.manage"]'::jsonb
 WHERE (id LIKE 'prf\_chef\_entite\_%' OR id LIKE 'prf\_dga\_%' OR id LIKE 'prf\_dg\_%')
   AND NOT permissions ? 'risks.manage';
