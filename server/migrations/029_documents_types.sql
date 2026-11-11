-- Fiches et grilles CRUD (docs/DESIGN-SYSTEM.md § 4) : un document de collaboration est décrit par un formulaire
-- dont les champs dépendent de sa nature (référentiel) ; le serveur contrôle ce que chaque nature exige.

ALTER TABLE partner_documents ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE partner_documents ADD COLUMN other_label TEXT NOT NULL DEFAULT '';
ALTER TABLE partner_documents ADD COLUMN reference TEXT NOT NULL DEFAULT '';
ALTER TABLE partner_documents ADD COLUMN issued_on DATE;
ALTER TABLE partner_documents ADD COLUMN expires_on DATE;
ALTER TABLE partner_documents ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE partner_documents ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE partner_documents ADD CONSTRAINT partner_documents_dates_check
  CHECK (expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on);
UPDATE partner_documents SET title = filename WHERE title = '';

-- Ce que chaque nature demande : date de production (dated), date d'expiration (expires), référence (referenced),
-- précision du type (precise). Les valeurs déjà installées reçoivent les règles des valeurs de départ.
UPDATE ref_values SET props = props || '{"dated": true, "expires": false, "referenced": false, "precise": false}'::jsonb
  WHERE list = 'partner_doc_nature'
    AND code IN ('convention_signee', 'avenant', 'lettre_intention', 'rapport_activite', 'rapport_financier', 'compte_rendu');
UPDATE ref_values SET props = props || '{"dated": true, "expires": false, "referenced": true, "precise": false}'::jsonb
  WHERE list = 'partner_doc_nature' AND code = 'correspondance';
UPDATE ref_values SET props = props || '{"dated": false, "expires": false, "referenced": false, "precise": false}'::jsonb
  WHERE list = 'partner_doc_nature' AND code = 'presentation';
UPDATE ref_values SET props = props || '{"dated": false, "expires": false, "referenced": false, "precise": true}'::jsonb
  WHERE list = 'partner_doc_nature' AND code = 'autre';
