-- RI-5, CV-5 : un risque se rattache aussi à une activité ou à un accord ; sa mesure de maîtrise a une échéance
ALTER TABLE risks ADD COLUMN activity_id TEXT REFERENCES agency_activities(id) ON DELETE SET NULL;
ALTER TABLE risks ADD COLUMN agreement_id TEXT REFERENCES agreements(id) ON DELETE SET NULL;
ALTER TABLE risks ADD COLUMN mitigation_due_on DATE;
CREATE INDEX risks_activity_idx ON risks (activity_id);
CREATE INDEX risks_agreement_idx ON risks (agreement_id);
-- RI-7 : un indicateur créé par erreur s'archive (il ne se supprime pas : ses mesures restent au journal)
ALTER TABLE indicators ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
