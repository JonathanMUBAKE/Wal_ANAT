-- Circuit du courrier : prise en charge (en traitement), classement sans suite motivé, fil des annotations
-- (imputations, annotations de la DG, notes de l'agent), copies pour information ou pour avis.
ALTER TABLE correspondence DROP CONSTRAINT correspondence_status_check;
ALTER TABLE correspondence ADD CONSTRAINT correspondence_status_check
  CHECK (status IN ('enregistre', 'impute', 'en_traitement', 'traite', 'classe'));
ALTER TABLE correspondence ADD COLUMN started_at TIMESTAMPTZ;
ALTER TABLE correspondence ADD COLUMN filed_reason TEXT NOT NULL DEFAULT '';

CREATE TABLE correspondence_annotations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  correspondence_id TEXT NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('enregistrement', 'imputation', 'annotation', 'copie', 'prise_en_charge', 'note', 'cloture', 'classement')),
  text TEXT NOT NULL DEFAULT '',
  unit_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, correspondence_id) REFERENCES correspondence (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id) ON DELETE SET NULL (unit_id)
);
CREATE INDEX correspondence_annotations_mail_idx ON correspondence_annotations (org_id, correspondence_id, created_at);
CREATE INDEX correspondence_annotations_author_idx ON correspondence_annotations (author_id);
CREATE INDEX correspondence_annotations_user_idx ON correspondence_annotations (user_id);
CREATE INDEX correspondence_annotations_unit_idx ON correspondence_annotations (org_id, unit_id);
ALTER TABLE correspondence_annotations ENABLE ROW LEVEL SECURITY;

CREATE TABLE correspondence_copies (
  org_id TEXT NOT NULL,
  correspondence_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL DEFAULT 'information' CHECK (purpose IN ('information', 'avis')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (correspondence_id, user_id),
  FOREIGN KEY (org_id, correspondence_id) REFERENCES correspondence (org_id, id) ON DELETE CASCADE
);
CREATE INDEX correspondence_copies_user_idx ON correspondence_copies (user_id);
CREATE INDEX correspondence_copies_org_mail_idx ON correspondence_copies (org_id, correspondence_id);
CREATE INDEX correspondence_copies_created_by_idx ON correspondence_copies (created_by);
ALTER TABLE correspondence_copies ENABLE ROW LEVEL SECURITY;
