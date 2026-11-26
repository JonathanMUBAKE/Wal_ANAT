-- Signataire à circuit ordonné, délégations, registre du courrier, risques, indicateurs, écarts de participation.
CREATE TABLE sign_documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'Note',
  body TEXT NOT NULL DEFAULT '',
  domain_id TEXT,
  unit_id TEXT,
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_circuit', 'signed', 'rejected')),
  content_hash TEXT,
  due_on DATE,
  signed_at TIMESTAMPTZ,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, year, seq),
  UNIQUE (org_id, id),
  FOREIGN KEY (org_id, domain_id) REFERENCES activity_domains (org_id, id),
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id)
);

CREATE TABLE sign_steps (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('avis', 'visa', 'signature')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'pending', 'approved', 'rejected')),
  acted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  acted_at TIMESTAMPTZ,
  comment TEXT NOT NULL DEFAULT '',
  UNIQUE (document_id, position),
  FOREIGN KEY (org_id, document_id) REFERENCES sign_documents (org_id, id) ON DELETE CASCADE
);

CREATE TABLE delegations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_on DATE NOT NULL,
  end_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_user <> to_user),
  CHECK (end_on >= start_on)
);

CREATE TABLE correspondence (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('entrant', 'sortant')),
  year INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  subject TEXT NOT NULL,
  correspondent TEXT NOT NULL,
  doc_date DATE,
  received_on DATE NOT NULL,
  unit_id TEXT,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  due_on DATE,
  status TEXT NOT NULL DEFAULT 'enregistre' CHECK (status IN ('enregistre', 'impute', 'traite')),
  response_ref TEXT NOT NULL DEFAULT '',
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  UNIQUE (org_id, direction, year, seq),
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id)
);

CREATE TABLE risks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  probability INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  mitigation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE indicators (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_label TEXT NOT NULL DEFAULT '',
  baseline NUMERIC(16, 2) NOT NULL DEFAULT 0,
  target NUMERIC(16, 2) NOT NULL,
  result NUMERIC(16, 2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE participation_gaps (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('absence', 'consultation_omise', 'reunion_incomplete', 'hors_attribution', 'chevauchement', 'concentration')),
  unit_id TEXT,
  domain_id TEXT,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'justified', 'to_fix', 'review', 'resolved')),
  note TEXT NOT NULL DEFAULT '',
  decided_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, fingerprint),
  FOREIGN KEY (org_id, unit_id) REFERENCES org_units (org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, domain_id) REFERENCES activity_domains (org_id, id)
);

CREATE INDEX sign_documents_org_idx ON sign_documents (org_id, status);
CREATE INDEX sign_documents_domain_idx ON sign_documents (org_id, domain_id);
CREATE INDEX sign_documents_unit_idx ON sign_documents (org_id, unit_id);
CREATE INDEX sign_documents_created_idx ON sign_documents (created_by);
CREATE INDEX sign_steps_org_idx ON sign_steps (org_id, document_id);
CREATE INDEX sign_steps_actor_idx ON sign_steps (actor_id, status);
CREATE INDEX sign_steps_acted_idx ON sign_steps (acted_by);
CREATE INDEX delegations_org_idx ON delegations (org_id);
CREATE INDEX delegations_from_idx ON delegations (from_user);
CREATE INDEX delegations_to_idx ON delegations (to_user);
CREATE INDEX correspondence_org_idx ON correspondence (org_id, received_on DESC);
CREATE INDEX correspondence_unit_idx ON correspondence (org_id, unit_id);
CREATE INDEX correspondence_assignee_idx ON correspondence (assignee_id);
CREATE INDEX correspondence_created_idx ON correspondence (created_by);
CREATE INDEX risks_org_idx ON risks (org_id);
CREATE INDEX risks_owner_idx ON risks (owner_id);
CREATE INDEX indicators_org_idx ON indicators (org_id);
CREATE INDEX participation_gaps_unit_idx ON participation_gaps (org_id, unit_id);
CREATE INDEX participation_gaps_domain_idx ON participation_gaps (org_id, domain_id);
CREATE INDEX participation_gaps_decided_idx ON participation_gaps (decided_by);

ALTER TABLE sign_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE correspondence ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation_gaps ENABLE ROW LEVEL SECURITY;
