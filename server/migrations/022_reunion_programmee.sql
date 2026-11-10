-- Lot P2 (docs/PARCOURS-METIER.md, parcours 1) : la réunion programmée.
-- Présidence, visioconférence, dossier rattaché, convocation, réponses, série, soumission et retour du compte rendu.
ALTER TABLE meetings ADD COLUMN chair_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE meetings ADD COLUMN video_link TEXT NOT NULL DEFAULT '';
ALTER TABLE meetings ADD COLUMN project_id TEXT;
ALTER TABLE meetings ADD COLUMN activity_id TEXT;
ALTER TABLE meetings ADD COLUMN series_id TEXT;
ALTER TABLE meetings ADD COLUMN convened_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN convened_actor TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE meetings ADD COLUMN submitted_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE meetings ADD COLUMN return_comment TEXT NOT NULL DEFAULT '';
ALTER TABLE meetings ADD CONSTRAINT meetings_project_fk FOREIGN KEY (org_id, project_id) REFERENCES projects (org_id, id) ON DELETE SET NULL (project_id);
ALTER TABLE meetings ADD CONSTRAINT meetings_activity_fk FOREIGN KEY (org_id, activity_id) REFERENCES agency_activities (org_id, id) ON DELETE SET NULL (activity_id);
ALTER TABLE meetings ADD CONSTRAINT meetings_one_dossier CHECK (num_nonnulls(project_id, activity_id) <= 1);
-- Un compte rendu soumis attend la décision de la présidence
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('planned', 'held', 'submitted', 'validated', 'cancelled'));
CREATE INDEX meetings_chair_idx ON meetings (chair_id);
CREATE INDEX meetings_project_idx ON meetings (org_id, project_id);
CREATE INDEX meetings_activity_idx ON meetings (org_id, activity_id);
CREATE INDEX meetings_series_idx ON meetings (series_id);
CREATE INDEX meetings_convened_actor_idx ON meetings (convened_actor);
CREATE INDEX meetings_submitted_by_idx ON meetings (submitted_by);

-- Les convoqués sont des participants marqués « convoqués », avec leur réponse ; la présence se constate en séance
ALTER TABLE meeting_attendees ADD COLUMN invited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE meeting_attendees ADD COLUMN response TEXT CHECK (response IN ('pending', 'accepted', 'declined', 'delegated'));
ALTER TABLE meeting_attendees ADD COLUMN delegate_name TEXT NOT NULL DEFAULT '';
ALTER TABLE meeting_attendees ADD COLUMN responded_at TIMESTAMPTZ;

-- Pièces de l'ordre du jour : jointes à la réunion ou à un point
CREATE TABLE meeting_documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  agenda_item_id TEXT REFERENCES meeting_agenda_items(id) ON DELETE SET NULL,
  uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, meeting_id) REFERENCES meetings (org_id, id) ON DELETE CASCADE
);
CREATE INDEX meeting_documents_org_idx ON meeting_documents (org_id, meeting_id);
CREATE INDEX meeting_documents_item_idx ON meeting_documents (agenda_item_id);
CREATE INDEX meeting_documents_uploader_idx ON meeting_documents (uploader_id);
ALTER TABLE meeting_documents ENABLE ROW LEVEL SECURITY;
