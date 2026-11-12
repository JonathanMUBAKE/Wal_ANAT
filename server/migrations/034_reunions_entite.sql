-- Réunions des entités : une réunion peut appartenir à une entité (programmée depuis son espace, ou entité entière
-- convoquée). Son responsable en est alors le gestionnaire ; le module Réunions reste le même.
ALTER TABLE meetings ADD COLUMN unit_id TEXT;
ALTER TABLE meetings ADD CONSTRAINT meetings_unit_fk
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id) ON DELETE SET NULL (unit_id);
CREATE INDEX meetings_unit_idx ON meetings (org_id, unit_id, meeting_date);
