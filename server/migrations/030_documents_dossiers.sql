-- Documents des dossiers (docs/DESIGN-SYSTEM.md § 4) : l'espace Documents d'un projet, la pièce d'un courrier,
-- les documents d'une activité. Décrits selon leur nature (référentiel des natures de documents) ; un document
-- officiel ne se supprime pas ; chaque document suit les droits de son dossier.
CREATE TABLE dossier_documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  project_id TEXT,
  activity_id TEXT,
  correspondence_id TEXT,
  nature_code TEXT NOT NULL,
  official BOOLEAN NOT NULL DEFAULT FALSE,
  title TEXT NOT NULL,
  other_label TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  issued_on DATE,
  expires_on DATE,
  notes TEXT NOT NULL DEFAULT '',
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(project_id, activity_id, correspondence_id) = 1),
  CHECK (expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on),
  FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, project_id) REFERENCES projects (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, activity_id) REFERENCES agency_activities (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, correspondence_id) REFERENCES correspondence (org_id, id)
);
CREATE INDEX dossier_documents_project_idx ON dossier_documents (org_id, project_id, created_at DESC);
CREATE INDEX dossier_documents_activity_idx ON dossier_documents (org_id, activity_id, created_at DESC);
CREATE INDEX dossier_documents_mail_idx ON dossier_documents (org_id, correspondence_id, created_at DESC);
CREATE INDEX dossier_documents_uploader_idx ON dossier_documents (uploader_id);
ALTER TABLE dossier_documents ENABLE ROW LEVEL SECURITY;
