# Les genres d'actes du journal

> Relevé de `server/src/audit.ts` le 26 novembre 2026, pour le centre de commande.
> **171 genres** : 42 critiques, 53 importantes, 76 normales.
>
> Le `kind` est la clé : c'est sur lui qu'on regroupe, filtre et compte. L'intitulé est ce que
> l'application disait au moment de l'acte — ce qu'un journal doit précisément garder, et ce qui
> sera scellé. Il ne sert pas de clé, et il ne doit pas en servir.
>
> Les actes de sécurité sont classés de la même façon : `login.failed` est critique.
>
> **La catégorie dépend aussi de la source**, pas seulement du genre : `categoryOf` classe
> « Sécurité » tout acte venant de `security_events`, quel que soit son code. Les 36 genres marqués
> « Autre » ci-dessous n'ont pas de catégorie métier ; la plupart sont des actes de sécurité et
> s'afficheront « Sécurité ». La colonne donne la catégorie métier seule.

| Genre | Intitulé scellé | Catégorie | Gravité |
| :--- | :--- | :--- | :--- |
| `access.approved` | Demande d'accès approuvée | Autre | importante |
| `access.rejected` | Demande d'accès refusée | Autre | importante |
| `access.requested` | Demande d'accès | Autre | normale |
| `account.activated` | Compte activé | Autre | importante |
| `account.invited` | Compte créé, lien de finalisation envoyé | Autre | importante |
| `account.locked` | Compte verrouillé après des échecs | Autre | critique |
| `account.reactivated` | Compte réactivé | Autre | importante |
| `account.suspended` | Compte suspendu | Autre | critique |
| `accounts.exported` | Liste des comptes exportée | Autre | importante |
| `activity.created` | Activité créée | Activités | normale |
| `activity.deleted` | Activité supprimée | Activités | critique |
| `admin.journal.reviewed` | Journal d'administration relu et visé | Organisation | importante |
| `agreement.amendment` | Avenant ajouté | Partenariats | importante |
| `agreement.created` | Accord créé | Partenariats | normale |
| `agreement.deleted` | Accord supprimé | Partenariats | critique |
| `agreement.in_force` | Accord entré en vigueur | Partenariats | importante |
| `agreement.sign` | Accord envoyé au parapheur | Partenariats | importante |
| `agreement.terminated` | Accord résilié | Partenariats | critique |
| `agreement.updated` | Accord modifié | Partenariats | normale |
| `attachment.added` | Pièce jointe ajoutée | Tâches | normale |
| `attachment.removed` | Pièce jointe retirée | Tâches | critique |
| `attribution.approved` | Fiche d'attribution approuvée | Organisation | importante |
| `attribution.created` | Fiche d'attribution créée | Organisation | normale |
| `attribution.deleted` | Fiche d'attribution supprimée | Organisation | critique |
| `audit.analysed` | Journal d'audit analysé | Autre | importante |
| `audit.exported` | Journal d'audit exporté | Autre | importante |
| `comment.created` | Commentaire ajouté | Tâches | normale |
| `comment.deleted` | Commentaire supprimé | Tâches | critique |
| `contract.created` | Contrat de consultant créé | Projets | normale |
| `correspondence.annotated` | Courrier annoté | Courrier | normale |
| `correspondence.assigned` | Courrier imputé | Courrier | importante |
| `correspondence.closed` | Courrier clôturé | Courrier | importante |
| `correspondence.filed` | Courrier classé sans suite | Courrier | critique |
| `correspondence.registered` | Courrier enregistré | Courrier | normale |
| `correspondence.started` | Courrier pris en charge | Courrier | importante |
| `decision.execution` | Exécution d'une décision suivie | Décisions | importante |
| `decision.recorded` | Décision enregistrée | Décisions | importante |
| `delegation.created` | Délégation de signature accordée | Parapheur | importante |
| `delegation.revoked` | Délégation de signature révoquée | Parapheur | importante |
| `deliverable.a_corriger` | Livrable à corriger | Projets | normale |
| `deliverable.created` | Livrable ajouté | Projets | normale |
| `deliverable.deleted` | Livrable supprimé | Projets | critique |
| `deliverable.en_cours` | Livrable mis en production | Projets | normale |
| `deliverable.en_revue` | Livrable mis en revue | Projets | normale |
| `deliverable.paid` | Livrable mis en paiement | Projets | importante |
| `deliverable.soumis` | Livrable soumis | Projets | normale |
| `deliverable.valide` | Livrable validé | Projets | importante |
| `domain.created` | Domaine d'activité créé | Organisation | normale |
| `dossier.document` | Document de dossier ajouté | Documents | normale |
| `dossier.document.deleted` | Document de dossier supprimé | Documents | critique |
| `dossier.document.read` | Document de dossier consulté | Documents | normale |
| `dossier.document.updated` | Document de dossier modifié | Documents | normale |
| `gap.decided` | Écart de participation tranché | Décisions | importante |
| `gap.detected` | Écart de participation relevé | Décisions | normale |
| `hr.account_opened` | Compte ouvert par les RH | Ressources humaines | normale |
| `hr.agent.created` | Agent créé (dossier et compte) | Ressources humaines | importante |
| `hr.agent.self` | Coordonnées mises à jour par l'agent | Ressources humaines | normale |
| `hr.agent.updated` | Dossier d'agent modifié | Ressources humaines | importante |
| `hr.agent.viewed` | Dossier d'agent consulté par un tiers | Ressources humaines | importante |
| `hr.contact.added` | Personne à prévenir ajoutée | Ressources humaines | normale |
| `hr.contact.deleted` | Personne à prévenir retirée | Ressources humaines | critique |
| `hr.diploma.added` | Diplôme ajouté | Ressources humaines | normale |
| `hr.diploma.deleted` | Diplôme retiré | Ressources humaines | critique |
| `indicator.created` | Indicateur ajouté | Projets | normale |
| `invitation.accepted` | Invitation acceptée | Autre | normale |
| `invitation.cancelled` | Invitation annulée | Autre | importante |
| `invitation.declined` | Invitation déclinée | Autre | normale |
| `login.failed` | Connexion refusée | Autre | critique |
| `login.success` | Connexion réussie | Autre | normale |
| `meeting.action` | Action de réunion mise à jour | Réunions | normale |
| `meeting.convened` | Réunion convoquée | Réunions | importante |
| `meeting.created` | Réunion programmée | Réunions | normale |
| `meeting.deleted` | Réunion supprimée | Réunions | critique |
| `meeting.document` | Document de réunion ajouté | Réunions | normale |
| `meeting.document.deleted` | Document de réunion supprimé | Réunions | critique |
| `meeting.reopened` | Compte rendu rouvert | Réunions | importante |
| `meeting.response` | Réponse à une convocation | Réunions | normale |
| `meeting.returned` | Compte rendu renvoyé | Réunions | importante |
| `meeting.submitted` | Compte rendu soumis | Réunions | normale |
| `meeting.validated` | Compte rendu validé | Réunions | importante |
| `member.permissions` | Droits d'un membre ajustés | Autre | critique |
| `member.profile` | Profil d'un membre changé | Autre | importante |
| `mfa.disabled` | Double authentification désactivée | Autre | critique |
| `mfa.enabled` | Double authentification activée | Autre | importante |
| `mfa.failed` | Code de vérification erroné | Autre | critique |
| `mfa.recovery_used` | Code de secours utilisé | Autre | critique |
| `org.created` | Institution créée | Organisation | normale |
| `org.domains` | Domaine principal de l'institution modifié | Organisation | critique |
| `org.mail.address` | Adresse d'envoi modifiée | Organisation | normale |
| `org.mail.config` | Messagerie configurée | Organisation | critique |
| `org.member` | Membre de l'institution mis à jour | Organisation | importante |
| `partner.contact` | Contact du partenaire mis à jour | Partenariats | normale |
| `partner.created` | Partenaire créé | Partenariats | normale |
| `partner.deleted` | Partenaire supprimé | Partenariats | critique |
| `partner.document` | Document partenaire ajouté | Partenariats | normale |
| `partner.document.deleted` | Document partenaire supprimé | Partenariats | critique |
| `partner.document.read` | Document partenaire consulté | Partenariats | normale |
| `partner.document.updated` | Document partenaire modifié | Partenariats | normale |
| `partner.merged` | Partenaires fusionnés | Partenariats | critique |
| `partner.note` | Note ajoutée à un partenaire | Partenariats | normale |
| `partner.reconciled` | Partenaire rapproché | Partenariats | normale |
| `partner.state` | État du partenaire changé | Partenariats | importante |
| `partner.suspension_requested` | Suspension d'un partenaire demandée | Partenariats | normale |
| `partner.updated` | Fiche partenaire modifiée | Partenariats | normale |
| `password.changed` | Mot de passe changé | Autre | importante |
| `password.forgot` | Mot de passe oublié signalé | Autre | normale |
| `password.reset` | Mot de passe réinitialisé | Autre | critique |
| `password.reset_requested` | Réinitialisation demandée | Autre | normale |
| `plan.approved` | Plan de travail approuvé | Plans de travail | importante |
| `plan.created` | Plan de travail créé | Plans de travail | normale |
| `plan.deleted` | Plan de travail supprimé | Plans de travail | critique |
| `plan.progress` | Avancement d'une activité de plan justifié | Plans de travail | normale |
| `plan.returned` | Plan de travail renvoyé | Plans de travail | importante |
| `plan.revised` | Plan de travail révisé | Plans de travail | normale |
| `plan.submitted` | Plan de travail soumis | Plans de travail | importante |
| `platform.banner` | Bandeau d'information publié | Autre | importante |
| `platform.banner.removed` | Bandeau d'information retiré | Autre | critique |
| `platform.granted` | Rôle d'administrateur système accordé | Autre | critique |
| `platform.revoked` | Rôle d'administrateur système retiré | Autre | critique |
| `profile.created` | Profil d'accès créé | Autre | importante |
| `profile.deleted` | Profil d'accès supprimé | Autre | critique |
| `profile.updated` | Profil d'accès modifié | Autre | importante |
| `project.created` | Projet créé | Projets | normale |
| `project.deleted` | Projet supprimé | Projets | critique |
| `project.governance` | Gouvernance du projet modifiée | Projets | importante |
| `project.imported` | Projet importé | Projets | normale |
| `project.member` | Membre du projet mis à jour | Projets | normale |
| `project.oversight_read` | Projet privé consulté par la hiérarchie | Projets | importante |
| `project.status` | Statut du projet changé | Projets | importante |
| `project.update` | Point d'avancement publié | Projets | normale |
| `referential.created` | Valeur de référentiel ajoutée | Paramétrage | normale |
| `referential.updated` | Valeur de référentiel modifiée | Paramétrage | normale |
| `risk.created` | Risque ajouté | Projets | normale |
| `rule.deleted` | Règle d'automatisation supprimée | Paramétrage | critique |
| `section.deleted` | Section supprimée | Paramétrage | critique |
| `session.revoked` | Session fermée par l'administrateur | Autre | critique |
| `sessions.revoked` | Sessions fermées | Autre | critique |
| `settings.registration` | Mode d'inscription changé | Autre | critique |
| `signature.approve` | Visa ou signature apposé | Parapheur | importante |
| `signature.created` | Document déposé au parapheur | Parapheur | normale |
| `signature.deleted` | Document retiré du parapheur | Parapheur | critique |
| `signature.reject` | Document rejeté au parapheur | Parapheur | critique |
| `signature.started` | Circuit de signature lancé | Parapheur | importante |
| `task.assignee_id` | Tâche attribuée | Tâches | importante |
| `task.completed` | Tâche terminée ou rouverte | Tâches | normale |
| `task.created` | Tâche créée | Tâches | normale |
| `task.deleted` | Tâche supprimée | Tâches | critique |
| `task.description` | Description de tâche modifiée | Tâches | normale |
| `task.due_on` | Échéance de tâche changée | Tâches | importante |
| `task.moved_project` | Tâche déplacée vers un autre projet | Tâches | normale |
| `task.parent_id` | Tâche rattachée à une autre | Tâches | normale |
| `task.priority` | Priorité de tâche changée | Tâches | normale |
| `task.section_id` | Tâche changée de colonne | Tâches | normale |
| `task.start_on` | Début de tâche changé | Tâches | normale |
| `task.title` | Tâche renommée | Tâches | normale |
| `team.created` | Équipe créée | Organisation | normale |
| `team.joined` | Équipe rejointe | Organisation | normale |
| `team.member.added` | Membre ajouté à une équipe | Organisation | importante |
| `team.member.removed` | Membre retiré d'une équipe | Organisation | critique |
| `team.member.role` | Rôle dans une équipe changé | Organisation | normale |
| `team.request.approved` | Demande d'adhésion à une équipe acceptée | Organisation | normale |
| `team.request.rejected` | Demande d'adhésion à une équipe refusée | Organisation | normale |
| `team.updated` | Équipe modifiée | Organisation | normale |
| `unit.created` | Entité créée | Organisation | normale |
| `unit.deleted` | Entité supprimée | Organisation | critique |
| `unit.kind` | Type d'entité changé | Organisation | normale |
| `unit.manager` | Chef d'entité changé | Organisation | importante |
| `unit.member` | Entité d'une personne changée | Organisation | importante |
| `unit.moved` | Entité déplacée dans la structure | Organisation | importante |
| `unit.renamed` | Entité renommée | Organisation | normale |
| `user.avatar` | Photo de profil changée | Paramétrage | normale |
