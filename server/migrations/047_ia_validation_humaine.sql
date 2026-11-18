-- Coéquipiers IA (thème 2 de l'analyse) : l'IA propose, un humain décide, sans exception. La validation automatique
-- des règles disparaît (I-1) ; une proposition retient les personnes qu'elle vise, qui ne la valident pas (I-4).
UPDATE ai_rules SET auto_approve = FALSE WHERE auto_approve;
ALTER TABLE ai_approvals ADD COLUMN target_ids JSONB NOT NULL DEFAULT '[]';
