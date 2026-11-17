-- Thème 1 de l'analyse (docs/ANALYSE-MODULES.md) : droits et profils cohérents.

-- Diriger une entité : les profils de chef, d'administration et le profil générique « Membre » ;
-- et tout profil dont une personne dirige déjà une entité, pour ne bloquer personne en poste.
UPDATE access_profiles SET permissions = permissions || '["units.lead"]'::jsonb
 WHERE NOT permissions ? 'units.lead'
   AND ((is_system AND (base_role IN ('owner', 'admin') OR id LIKE 'prf\_member\_%' OR id LIKE 'prf\_chef\_entite\_%'
          OR id LIKE 'prf\_informatique\_%'))
     OR id IN (SELECT om.profile_id FROM org_members om JOIN org_units ou ON ou.org_id = om.org_id AND ou.manager_id = om.user_id));

-- Les indicateurs stratégiques ont leur propre droit : il revient au pilotage, plus au seul gestionnaire des risques.
UPDATE access_profiles SET permissions = permissions || '["indicators.manage"]'::jsonb
 WHERE base_role IN ('owner', 'admin') AND permissions ? 'risks.manage' AND NOT permissions ? 'indicators.manage';

-- Préparer les plans de toutes les entités : ceux qui les approuvent.
UPDATE access_profiles SET permissions = permissions || '["plans.manage_all"]'::jsonb
 WHERE permissions ? 'plans.approve' AND NOT permissions ? 'plans.manage_all';

-- Un chef gère les équipes dont il est responsable sans droit particulier ; « gérer les équipes » vaut désormais
-- pour toutes les équipes de l'institution et quitte le profil de chef d'entité.
UPDATE access_profiles SET permissions = permissions - 'teams.manage'
 WHERE is_system AND id LIKE 'prf\_chef\_entite\_%';
