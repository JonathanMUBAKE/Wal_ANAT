-- Lot PA3 (docs/CONCEPTION.md § 4.7) : les tiers des autres modules deviennent des partenaires de l'annuaire.
-- Le texte libre existant (commanditaire, interlocuteur, correspondant, prestataire) est conservé : il reste lisible
-- et se rapproche des fiches après relecture.

ALTER TABLE projects ADD COLUMN sponsor_partner_id TEXT;
ALTER TABLE projects ADD CONSTRAINT projects_sponsor_partner_fk
  FOREIGN KEY (org_id, sponsor_partner_id) REFERENCES partners (org_id, id);
CREATE INDEX projects_sponsor_partner_idx ON projects (org_id, sponsor_partner_id);

ALTER TABLE agency_activities ADD COLUMN counterpart_partner_id TEXT;
ALTER TABLE agency_activities ADD CONSTRAINT activities_counterpart_partner_fk
  FOREIGN KEY (org_id, counterpart_partner_id) REFERENCES partners (org_id, id);
CREATE INDEX activities_counterpart_partner_idx ON agency_activities (org_id, counterpart_partner_id);

ALTER TABLE correspondence ADD COLUMN partner_id TEXT;
ALTER TABLE correspondence ADD COLUMN contact_id TEXT;
ALTER TABLE correspondence ADD CONSTRAINT correspondence_partner_fk
  FOREIGN KEY (org_id, partner_id) REFERENCES partners (org_id, id);
ALTER TABLE correspondence ADD CONSTRAINT correspondence_contact_fk
  FOREIGN KEY (org_id, contact_id) REFERENCES partner_contacts (org_id, id);
CREATE INDEX correspondence_partner_idx ON correspondence (org_id, partner_id);
CREATE INDEX correspondence_contact_idx ON correspondence (org_id, contact_id);

ALTER TABLE consultant_contracts ADD COLUMN partner_id TEXT;
ALTER TABLE consultant_contracts ADD CONSTRAINT contracts_partner_fk
  FOREIGN KEY (org_id, partner_id) REFERENCES partners (org_id, id);
CREATE INDEX contracts_partner_idx ON consultant_contracts (org_id, partner_id);

-- Les partenaires concernés par une réunion, et les contacts convoqués comme personnes extérieures
CREATE TABLE meeting_partners (
  org_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  PRIMARY KEY (meeting_id, partner_id),
  FOREIGN KEY (org_id, meeting_id) REFERENCES meetings (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, partner_id) REFERENCES partners (org_id, id)
);
CREATE INDEX meeting_partners_meeting_idx ON meeting_partners (org_id, meeting_id);
CREATE INDEX meeting_partners_partner_idx ON meeting_partners (org_id, partner_id);
ALTER TABLE meeting_partners ENABLE ROW LEVEL SECURITY;

ALTER TABLE meeting_attendees ADD COLUMN contact_id TEXT;
ALTER TABLE meeting_attendees ADD CONSTRAINT meeting_attendees_contact_fk
  FOREIGN KEY (org_id, contact_id) REFERENCES partner_contacts (org_id, id);
CREATE INDEX meeting_attendees_contact_idx ON meeting_attendees (org_id, contact_id);
