-- « Parapheur » devient « le signataire » : le domaine d'avis change de clé, et le réglage de
-- courriel que chacun a posé doit suivre. Sans cela, la préférence serait muette et chacun
-- recevrait de nouveau les courriels qu'il avait coupés — une clé renommée en silence est une
-- préférence perdue en silence.
UPDATE users
   SET notification_prefs = (notification_prefs - 'parapheur')
       || jsonb_build_object('signataire', notification_prefs -> 'parapheur')
 WHERE notification_prefs ? 'parapheur';
