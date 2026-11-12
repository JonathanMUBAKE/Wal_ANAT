-- Administration système : un compte créé par l'administrateur porte l'entité et la fonction de la personne,
-- appliquées quand elle finalise son accès. Le journal d'audit lit l'activité par institution et par date.
ALTER TABLE org_invitations ADD COLUMN unit_id TEXT;
ALTER TABLE org_invitations ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE org_invitations ADD CONSTRAINT org_invitations_unit_fk
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id) ON DELETE SET NULL (unit_id);
CREATE INDEX org_invitations_unit_idx ON org_invitations (org_id, unit_id);
CREATE INDEX activity_org_date_idx ON activity (org_id, created_at DESC);
CREATE INDEX security_events_actor_idx ON security_events (actor_id, created_at DESC);
