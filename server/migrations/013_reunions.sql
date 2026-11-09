-- Réunions, comptes rendus et recommandations suivies, d'après le modèle officiel de l'ANAT.
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  service_code TEXT NOT NULL DEFAULT 'DIR',
  writer_initials TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Réunion',
  meeting_type TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  location TEXT NOT NULL DEFAULT '',
  convened_by TEXT NOT NULL DEFAULT '',
  facilitator TEXT NOT NULL DEFAULT '',
  timekeeper TEXT NOT NULL DEFAULT '',
  writer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  writer_name TEXT NOT NULL,
  attendance_note TEXT NOT NULL DEFAULT '',
  previous_meeting_id TEXT REFERENCES meetings(id) ON DELETE SET NULL,
  previous_summary TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  next_date DATE,
  next_time TEXT,
  next_location TEXT NOT NULL DEFAULT '',
  next_topics TEXT NOT NULL DEFAULT '',
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'held', 'validated', 'cancelled')),
  validated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, year, seq),
  UNIQUE (org_id, id)
);

CREATE TABLE meeting_agenda_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  subject TEXT NOT NULL,
  speakers TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (org_id, meeting_id) REFERENCES meetings (org_id, id) ON DELETE CASCADE
);

CREATE TABLE meeting_actions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  agenda_item_id TEXT NOT NULL REFERENCES meeting_agenda_items(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  responsible_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  responsible_name TEXT NOT NULL DEFAULT '',
  due_on DATE,
  original_due_on DATE,
  postponed_reason TEXT,
  status TEXT NOT NULL DEFAULT 'a_faire' CHECK (status IN ('a_faire', 'en_cours', 'soumis', 'realise', 'reporte', 'annule')),
  closed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, meeting_id) REFERENCES meetings (org_id, id) ON DELETE CASCADE
);

CREATE TABLE meeting_attendees (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  function_label TEXT NOT NULL DEFAULT '',
  presence TEXT NOT NULL DEFAULT 'present' CHECK (presence IN ('present', 'excuse', 'absent', 'represente')),
  FOREIGN KEY (org_id, meeting_id) REFERENCES meetings (org_id, id) ON DELETE CASCADE
);

CREATE INDEX meetings_writer_idx ON meetings (writer_id);
CREATE INDEX meetings_previous_idx ON meetings (previous_meeting_id);
CREATE INDEX meetings_validated_by_idx ON meetings (validated_by);
CREATE INDEX meetings_created_by_idx ON meetings (created_by);
CREATE INDEX meetings_date_idx ON meetings (org_id, meeting_date DESC);
CREATE INDEX meeting_agenda_org_idx ON meeting_agenda_items (org_id, meeting_id);
CREATE INDEX meeting_actions_org_idx ON meeting_actions (org_id, meeting_id);
CREATE INDEX meeting_actions_item_idx ON meeting_actions (agenda_item_id);
CREATE INDEX meeting_actions_responsible_idx ON meeting_actions (responsible_id);
CREATE INDEX meeting_actions_closed_by_idx ON meeting_actions (closed_by);
CREATE INDEX meeting_attendees_org_idx ON meeting_attendees (org_id, meeting_id);
CREATE INDEX meeting_attendees_user_idx ON meeting_attendees (user_id);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;

-- Nouveaux droits : la consultation pour les membres, la gestion et la validation pour les administrateurs.
UPDATE access_profiles SET permissions = permissions || '["meetings.view", "meetings.manage", "meetings.validate"]'::jsonb
  WHERE is_system AND base_role IN ('owner', 'admin');
UPDATE access_profiles SET permissions = permissions || '["meetings.view"]'::jsonb
  WHERE is_system AND id LIKE 'prf_member_%';
