-- Un livrable de mission validé devient « à payer » ; le paiement se constate une fois, avec sa date et son auteur.
ALTER TABLE deliverables ADD COLUMN paid_at TIMESTAMPTZ;
ALTER TABLE deliverables ADD COLUMN paid_by TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX deliverables_paid_by_idx ON deliverables (paid_by);
