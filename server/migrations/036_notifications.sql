-- Notifications partout : chaque avis porte son domaine (tâches, réunions, courrier…) et son lien ; chacun choisit
-- par domaine s'il reçoit aussi un courriel (l'avis dans l'outil reste toujours).
ALTER TABLE notifications ADD COLUMN category TEXT NOT NULL DEFAULT 'autres';
ALTER TABLE notifications ADD COLUMN link TEXT;
ALTER TABLE users ADD COLUMN notification_prefs JSONB NOT NULL DEFAULT '{}';
CREATE INDEX notifications_user_date_idx ON notifications (user_id, created_at DESC);
