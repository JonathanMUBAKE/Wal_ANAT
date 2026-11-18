-- Décisions de la DG (thème 2 de l'analyse, DEC-1 et DEC-3). Une décision inscrite par le secrétariat est numérotée
-- tout de suite, puis confirmée après coup par la DG. Le chargé déclare l'exécution ; le secrétariat de la DG la
-- confirme ou la renvoie avec un motif.
ALTER TABLE dg_decisions ADD COLUMN confirmed_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE dg_decisions ADD COLUMN confirmed_at TIMESTAMPTZ;
ALTER TABLE dg_decisions ADD COLUMN execution_declared_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE dg_decisions ADD COLUMN execution_declared_at TIMESTAMPTZ;
ALTER TABLE dg_decisions ADD COLUMN execution_confirmed_by TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX dg_decisions_confirmed_by_idx ON dg_decisions (confirmed_by);
CREATE INDEX dg_decisions_execution_declared_by_idx ON dg_decisions (execution_declared_by);
CREATE INDEX dg_decisions_execution_confirmed_by_idx ON dg_decisions (execution_confirmed_by);
-- Le registre existant est réputé vu : seules les nouvelles inscriptions attendent la DG
UPDATE dg_decisions SET confirmed_by = recorded_by, confirmed_at = created_at;
UPDATE access_profiles SET permissions = permissions || '["decisions.confirm"]'::jsonb
 WHERE (id LIKE 'prf\_dg\_%' OR (is_system AND base_role = 'owner')) AND NOT permissions ? 'decisions.confirm';
