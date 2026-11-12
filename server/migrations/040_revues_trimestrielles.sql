-- Revue trimestrielle du plan de travail : pour chaque trimestre, l'entité relève l'avancement constaté et attendu de
-- chaque activité, apprécie, explique les écarts et propose des mesures ; la direction générale valide ou retourne.
-- Validée, la revue est figée. (Le numéro 039 est réservé au module des congés, mis de côté sur sa branche.)
CREATE TABLE plan_reviews (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'soumise', 'retournee', 'validee')),
  summary TEXT NOT NULL DEFAULT '',
  difficulties TEXT NOT NULL DEFAULT '',
  measures TEXT NOT NULL DEFAULT '',
  return_comment TEXT NOT NULL DEFAULT '',
  validation_comment TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  validated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  UNIQUE (plan_id, quarter),
  FOREIGN KEY (org_id, plan_id) REFERENCES work_plans (org_id, id) ON DELETE CASCADE
);
CREATE INDEX plan_reviews_plan_idx ON plan_reviews (org_id, plan_id);
CREATE INDEX plan_reviews_created_by_idx ON plan_reviews (created_by);
CREATE INDEX plan_reviews_submitted_by_idx ON plan_reviews (submitted_by);
CREATE INDEX plan_reviews_validated_by_idx ON plan_reviews (validated_by);
ALTER TABLE plan_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE plan_review_lines (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  title TEXT NOT NULL,
  progress INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
  expected INTEGER CHECK (expected BETWEEN 0 AND 100),
  assessment TEXT NOT NULL CHECK (assessment IN ('atteint', 'en_bonne_voie', 'en_retard', 'compromis')),
  comment TEXT NOT NULL DEFAULT '',
  measure TEXT NOT NULL DEFAULT '',
  UNIQUE (review_id, activity_id),
  FOREIGN KEY (org_id, review_id) REFERENCES plan_reviews (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, activity_id) REFERENCES plan_activities (org_id, id) ON DELETE CASCADE
);
CREATE INDEX plan_review_lines_review_idx ON plan_review_lines (org_id, review_id);
CREATE INDEX plan_review_lines_activity_idx ON plan_review_lines (org_id, activity_id);
ALTER TABLE plan_review_lines ENABLE ROW LEVEL SECURITY;
