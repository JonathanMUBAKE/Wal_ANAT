-- Signataire (thème 2 de l'analyse, CV-1, PH-2, PH-3). Un document qui engage l'Agence (convention, accord, avenant,
-- contrat, protocole, acte) est signé par la DG, ou par son délégataire désigné. Une délégation est bornée dans le
-- temps, porte sur le visa seul ou sur la signature, et reste dans l'historique quand elle est retirée.
ALTER TABLE sign_documents ADD COLUMN binding BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE sign_documents SET binding = TRUE
 WHERE kind ~* '(convention|accord|avenant|contrat|protocole|m[ée]morandum|arr[êe]t[ée]|engagement)';
ALTER TABLE delegations ADD COLUMN scope TEXT NOT NULL DEFAULT 'signature' CHECK (scope IN ('visa', 'signature'));
ALTER TABLE delegations ADD COLUMN revoked_at TIMESTAMPTZ;
ALTER TABLE delegations ADD COLUMN revoked_by TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX delegations_revoked_by_idx ON delegations (revoked_by);
UPDATE access_profiles SET permissions = permissions || '["signature.institution"]'::jsonb
 WHERE (id LIKE 'prf\_dg\_%' OR (is_system AND base_role = 'owner')) AND NOT permissions ? 'signature.institution';
