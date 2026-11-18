-- Thème 6 de l'analyse, suite. Un compte rendu validé par le délégataire de la présidence garde la trace de qui
-- il remplaçait (R-2) ; une séance passée se déclare non tenue avec un motif (R-6) ; un accord porte un montant, une
-- devise et la contribution de chaque partie (CV-2).
ALTER TABLE meetings ADD COLUMN validated_on_behalf TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE meetings ADD COLUMN not_held_reason TEXT NOT NULL DEFAULT '';
CREATE INDEX meetings_validated_on_behalf_idx ON meetings (validated_on_behalf);
ALTER TABLE agreements ADD COLUMN amount NUMERIC(16, 2);
ALTER TABLE agreements ADD COLUMN currency TEXT CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE agreements ADD COLUMN agency_contribution NUMERIC(16, 2);
ALTER TABLE agreement_parties ADD COLUMN contribution NUMERIC(16, 2);
