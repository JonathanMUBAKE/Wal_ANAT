-- RI-3 : chaque révision d'un risque et chaque mesure d'un indicateur gardent la valeur, la date et l'auteur
CREATE TABLE risk_history (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_id TEXT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  probability INTEGER NOT NULL,
  impact INTEGER NOT NULL,
  status TEXT NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX risk_history_risk_idx ON risk_history (risk_id, recorded_at DESC);
ALTER TABLE risk_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ADD COLUMN last_reviewed_at TIMESTAMPTZ;

CREATE TABLE indicator_values (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_id TEXT NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  result NUMERIC(16, 2) NOT NULL,
  measured_on DATE NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX indicator_values_indicator_idx ON indicator_values (indicator_id, measured_on DESC, recorded_at DESC);
ALTER TABLE indicator_values ENABLE ROW LEVEL SECURITY;

-- Les risques et indicateurs existants partent de leur état actuel
INSERT INTO risk_history (id, org_id, risk_id, probability, impact, status, author_id, recorded_at)
  SELECT 'rkh_' || id, org_id, id, probability, impact, status, NULL, created_at FROM risks;
INSERT INTO indicator_values (id, org_id, indicator_id, result, measured_on, author_id, recorded_at)
  SELECT 'inv_' || id, org_id, id, result, created_at::date, NULL, created_at FROM indicators WHERE result <> 0;
CREATE INDEX risk_history_org_idx ON risk_history (org_id);
CREATE INDEX risk_history_author_idx ON risk_history (author_id);
CREATE INDEX indicator_values_org_idx ON indicator_values (org_id);
CREATE INDEX indicator_values_author_idx ON indicator_values (author_id);
