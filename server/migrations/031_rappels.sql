-- Rappels d'échéance : trace des rappels envoyés, pour qu'aucun ne parte deux fois.
-- La clé nomme l'objet, son échéance et le moment (« bientôt » ou « en retard ») : une nouvelle échéance rappelle à nouveau.
CREATE TABLE reminders_sent (
  key TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reminders_sent_org_idx ON reminders_sent (org_id, created_at);
ALTER TABLE reminders_sent ENABLE ROW LEVEL SECURITY;
