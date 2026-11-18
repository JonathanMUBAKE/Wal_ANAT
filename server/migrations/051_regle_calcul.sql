-- Une seule règle de calcul (thème 4 de l'analyse). Un indicateur peut être relié à une source de l'outil et se
-- calculer seul (RI-4) ; chaque activité d'un plan a un poids (PT-3) ; une réunion sans titre prend son type (R-1).
ALTER TABLE indicators ADD COLUMN computed_from TEXT
  CHECK (computed_from IN ('plans_approved', 'recommendations_done', 'decisions_executed', 'agreements_in_force'));
ALTER TABLE plan_activities ADD COLUMN weight INTEGER NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 100);
UPDATE meetings SET title = meeting_type WHERE trim(title) IN ('', 'Réunion') AND meeting_type <> '';
