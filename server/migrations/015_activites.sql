-- Toutes les formes d'activité de l'Agence : projets internes ou confiés, commissions, conférences, rendez-vous, activités internes.
ALTER TABLE projects ADD COLUMN origin TEXT NOT NULL DEFAULT 'interne' CHECK (origin IN ('interne', 'confie'));
ALTER TABLE projects ADD COLUMN sponsor TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN convention_ref TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN lead_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN unit_id TEXT REFERENCES org_units(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN budget_planned NUMERIC(16, 2);
ALTER TABLE projects ADD COLUMN budget_spent NUMERIC(16, 2);
ALTER TABLE projects ADD COLUMN decision_needed TEXT NOT NULL DEFAULT '';
CREATE INDEX projects_lead_idx ON projects (lead_id);
CREATE INDEX projects_unit_idx ON projects (unit_id);

-- Le rôle précis de chaque membre de l'équipe projet, qu'il soit membre direct ou par son équipe.
CREATE TABLE project_team_roles (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  function_label TEXT NOT NULL,
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX project_team_roles_user_idx ON project_team_roles (user_id);

CREATE TABLE agency_activities (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('commission', 'conference', 'rendez_vous', 'interne')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lead_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  unit_id TEXT,
  domain_id TEXT,
  start_on DATE,
  start_time TEXT,
  end_on DATE,
  location TEXT NOT NULL DEFAULT '',
  counterpart TEXT NOT NULL DEFAULT '',
  mandate TEXT NOT NULL DEFAULT '',
  delegation TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',
  decision_needed TEXT NOT NULL DEFAULT '',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  next_due_on DATE,
  health TEXT NOT NULL DEFAULT 'on_track' CHECK (health IN ('on_track', 'at_risk', 'off_track', 'done')),
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id),
  FOREIGN KEY (org_id, domain_id) REFERENCES activity_domains (org_id, id)
);
CREATE INDEX agency_activities_org_idx ON agency_activities (org_id, start_on);
CREATE INDEX agency_activities_unit_idx ON agency_activities (org_id, unit_id);
CREATE INDEX agency_activities_domain_idx ON agency_activities (org_id, domain_id);
CREATE INDEX agency_activities_lead_idx ON agency_activities (lead_id);
CREATE INDEX agency_activities_created_by_idx ON agency_activities (created_by);

CREATE TABLE activity_followups (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  text TEXT NOT NULL,
  responsible_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_on DATE,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, activity_id) REFERENCES agency_activities (org_id, id) ON DELETE CASCADE
);
CREATE INDEX activity_followups_org_idx ON activity_followups (org_id, activity_id);
CREATE INDEX activity_followups_responsible_idx ON activity_followups (responsible_id);

ALTER TABLE project_team_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_followups ENABLE ROW LEVEL SECURITY;
