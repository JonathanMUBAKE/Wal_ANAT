-- Lot P3b (docs/PARCOURS-METIER.md) : le courrier relié.
-- La réponse sortante est liée à l'entrant qu'elle clôt ; l'imputation porte une instruction ; un courrier peut vivre dans un dossier.
ALTER TABLE correspondence ADD CONSTRAINT correspondence_org_id_uq UNIQUE (org_id, id);
ALTER TABLE correspondence ADD COLUMN reply_to_id TEXT;
ALTER TABLE correspondence ADD CONSTRAINT correspondence_reply_fk
  FOREIGN KEY (org_id, reply_to_id) REFERENCES correspondence (org_id, id) ON DELETE SET NULL (reply_to_id);
ALTER TABLE correspondence ADD COLUMN instruction TEXT NOT NULL DEFAULT '';
ALTER TABLE correspondence ADD COLUMN project_id TEXT;
ALTER TABLE correspondence ADD COLUMN activity_id TEXT;
ALTER TABLE correspondence ADD CONSTRAINT correspondence_project_fk
  FOREIGN KEY (org_id, project_id) REFERENCES projects (org_id, id) ON DELETE SET NULL (project_id);
ALTER TABLE correspondence ADD CONSTRAINT correspondence_activity_fk
  FOREIGN KEY (org_id, activity_id) REFERENCES agency_activities (org_id, id) ON DELETE SET NULL (activity_id);
ALTER TABLE correspondence ADD CONSTRAINT correspondence_one_dossier CHECK (num_nonnulls(project_id, activity_id) <= 1);
CREATE INDEX correspondence_reply_idx ON correspondence (reply_to_id);
CREATE INDEX correspondence_project_idx ON correspondence (org_id, project_id);
CREATE INDEX correspondence_activity_idx ON correspondence (org_id, activity_id);
