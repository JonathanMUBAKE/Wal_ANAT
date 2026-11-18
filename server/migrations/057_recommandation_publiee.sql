-- R-4 : une recommandation parue dans un compte rendu validé ne se supprime plus ; elle s'annule
ALTER TABLE meeting_actions ADD COLUMN published BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE meeting_actions SET published = TRUE
 WHERE meeting_id IN (SELECT id FROM meetings WHERE status = 'validated' OR validated_at IS NOT NULL);
