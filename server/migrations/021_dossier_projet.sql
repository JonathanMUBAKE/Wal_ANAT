-- Lot P1 (docs/PARCOURS-METIER.md) : le projet est le dossier complet.
-- Contrats et livrables y sont rangés ; chaque livrable contractuel porte une tranche de paiement.
-- Les pièces créées avant ce lot n'ont pas de projet : elles restent lisibles, le serveur exige un projet pour toute nouvelle pièce.
ALTER TABLE consultant_contracts ADD COLUMN project_id TEXT;
ALTER TABLE consultant_contracts ADD CONSTRAINT contracts_project_fk
  FOREIGN KEY (org_id, project_id) REFERENCES projects (org_id, id) ON DELETE RESTRICT;
CREATE INDEX contracts_project_idx ON consultant_contracts (org_id, project_id);

ALTER TABLE deliverables ADD COLUMN project_id TEXT;
ALTER TABLE deliverables ADD CONSTRAINT deliverables_project_fk
  FOREIGN KEY (org_id, project_id) REFERENCES projects (org_id, id) ON DELETE RESTRICT;
CREATE INDEX deliverables_project_idx ON deliverables (org_id, project_id);

-- Tranche de paiement : part du montant du contrat payée à la réception du livrable
ALTER TABLE deliverables ADD COLUMN payment_percent NUMERIC(5, 2) CHECK (payment_percent > 0 AND payment_percent <= 100);
ALTER TABLE deliverables ADD CONSTRAINT deliverables_payment_contract CHECK (payment_percent IS NULL OR contract_id IS NOT NULL);
