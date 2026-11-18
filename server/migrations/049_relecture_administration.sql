-- Administration (thème 2 de l'analyse, AD-1) : l'administrateur système est distinct de la direction, et le journal
-- de ses actions est relu par une autre personne (la DG). Chaque relecture est conservée.
CREATE TABLE admin_reviews (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  period_end TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_reviews_org_idx ON admin_reviews (org_id, created_at);
CREATE INDEX admin_reviews_reviewer_idx ON admin_reviews (reviewer_id);
ALTER TABLE admin_reviews ENABLE ROW LEVEL SECURITY;
UPDATE access_profiles SET permissions = permissions || '["audit.review"]'::jsonb
 WHERE (id LIKE 'prf\_dg\_%' OR (is_system AND base_role = 'owner')) AND NOT permissions ? 'audit.review';
