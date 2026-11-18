-- Une décision a un chargé d'exécution et une échéance, sauf une décision sans exécution, marquée comme telle (DEC-2).
ALTER TABLE dg_decisions ADD COLUMN no_execution BOOLEAN NOT NULL DEFAULT FALSE;
