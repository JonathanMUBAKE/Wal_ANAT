-- Plans de travail annuels figés après approbation, livrables à circuit de validation, missions des consultants.
CREATE TABLE work_plans (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  return_comment TEXT NOT NULL DEFAULT '',
  submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, unit_id, year),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id)
);

CREATE TABLE plan_activities (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  parent_id TEXT REFERENCES plan_activities(id) ON DELETE SET NULL,
  domain_id TEXT,
  title TEXT NOT NULL,
  responsible_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  objective TEXT NOT NULL DEFAULT '',
  target_value NUMERIC(16, 2),
  actual_value NUMERIC(16, 2),
  unit_label TEXT NOT NULL DEFAULT '',
  start_on DATE,
  end_on DATE,
  budget_planned NUMERIC(16, 2),
  budget_committed NUMERIC(16, 2),
  budget_spent NUMERIC(16, 2),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  baseline JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, plan_id) REFERENCES work_plans (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, domain_id) REFERENCES activity_domains (org_id, id)
);

CREATE TABLE plan_revisions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, activity_id) REFERENCES plan_activities (org_id, id) ON DELETE CASCADE
);

CREATE TABLE consultant_contracts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  consultant_name TEXT NOT NULL,
  title TEXT NOT NULL,
  terms TEXT NOT NULL DEFAULT '',
  start_on DATE NOT NULL,
  end_on DATE NOT NULL,
  amount NUMERIC(16, 2),
  currency TEXT NOT NULL DEFAULT 'USD',
  supervisor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  evaluation TEXT NOT NULL DEFAULT '',
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  reminded BOOLEAN NOT NULL DEFAULT FALSE,
  ended_at TIMESTAMPTZ,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, id)
);

CREATE TABLE deliverables (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES plan_activities(id) ON DELETE SET NULL,
  contract_id TEXT REFERENCES consultant_contracts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  criteria TEXT NOT NULL DEFAULT '',
  responsible_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  validator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_on DATE,
  status TEXT NOT NULL DEFAULT 'prevu' CHECK (status IN ('prevu', 'en_cours', 'soumis', 'en_revue', 'a_corriger', 'valide')),
  version INTEGER NOT NULL DEFAULT 1,
  review_comment TEXT NOT NULL DEFAULT '',
  to_pay BOOLEAN NOT NULL DEFAULT FALSE,
  reception_ref TEXT,
  validated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, id)
);

CREATE TABLE deliverable_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  deliverable_id TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, deliverable_id) REFERENCES deliverables (org_id, id) ON DELETE CASCADE
);

CREATE INDEX work_plans_org_idx ON work_plans (org_id, year);
CREATE INDEX work_plans_submitted_idx ON work_plans (submitted_by);
CREATE INDEX work_plans_approved_idx ON work_plans (approved_by);
CREATE INDEX work_plans_created_idx ON work_plans (created_by);
CREATE INDEX plan_activities_org_idx ON plan_activities (org_id, plan_id);
CREATE INDEX plan_activities_parent_idx ON plan_activities (parent_id);
CREATE INDEX plan_activities_domain_idx ON plan_activities (org_id, domain_id);
CREATE INDEX plan_activities_responsible_idx ON plan_activities (responsible_id);
CREATE INDEX plan_revisions_org_idx ON plan_revisions (org_id, activity_id);
CREATE INDEX plan_revisions_author_idx ON plan_revisions (author_id);
CREATE INDEX contracts_org_idx ON consultant_contracts (org_id, end_on);
CREATE INDEX contracts_user_idx ON consultant_contracts (user_id);
CREATE INDEX contracts_supervisor_idx ON consultant_contracts (supervisor_id);
CREATE INDEX contracts_created_idx ON consultant_contracts (created_by);
CREATE INDEX deliverables_org_idx ON deliverables (org_id, due_on);
CREATE INDEX deliverables_activity_idx ON deliverables (activity_id);
CREATE INDEX deliverables_contract_idx ON deliverables (contract_id);
CREATE INDEX deliverables_responsible_idx ON deliverables (responsible_id);
CREATE INDEX deliverables_validator_idx ON deliverables (validator_id);
CREATE INDEX deliverables_validated_idx ON deliverables (validated_by);
CREATE INDEX deliverables_created_idx ON deliverables (created_by);
CREATE INDEX deliverable_events_org_idx ON deliverable_events (org_id, deliverable_id);
CREATE INDEX deliverable_events_actor_idx ON deliverable_events (actor_id);

ALTER TABLE work_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_events ENABLE ROW LEVEL SECURITY;
