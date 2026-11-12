-- Lot T1 — tâches d'entité. Une tâche n'est pas forcément dans un projet : chaque entité a son registre de tâches.
-- Techniquement, ce registre est un « projet » de nature 'unit' (sections, vues, commentaires, pièces, rappels et
-- traces sont ceux des tâches), jamais montré dans le portefeuille. Un seul registre par entité.
ALTER TABLE projects ADD COLUMN kind TEXT NOT NULL DEFAULT 'project' CHECK (kind IN ('project', 'unit'));
CREATE UNIQUE INDEX projects_unit_board_uq ON projects (org_id, unit_id) WHERE kind = 'unit';
