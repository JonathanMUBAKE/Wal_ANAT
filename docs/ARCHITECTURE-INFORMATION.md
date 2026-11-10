# Architecture de l'information — ANAT Pilotage

> Complète `docs/DESIGN-SYSTEM.md`. Répond à une seule question : **qu'est-ce qui va où, et pourquoi.**
> Les parcours métier qui fondent ces choix sont dans `docs/PARCOURS-METIER.md` ; ils font du **projet le dossier
> complet** (livrables et contrats y seront rangés, lot P1) et retirent le module « Livrables et missions ».

## 1. Méthode

Quatre règles de conception, appliquées dans cet ordre :

1. **Penser en objets, pas en écrans** (conception orientée objets). On liste les objets que manipule l'Agence, puis on range chaque information **dans l'objet auquel elle appartient**. Un objet qui n'existe que par un autre n'a pas de page à lui dans la navigation.
2. **La navigation suit le modèle mental de la DG**, pas la structure technique : on pilote (décider), on suit et évalue (vérifier l'exécution), on traite le secrétariat (signer, répondre), on organise (qui fait quoi).
3. **Au plus 5 à 7 entrées par groupe**, et pas de doublon : une information a **un seul domicile** ; ailleurs, elle apparaît en **lien contextuel** (« voir la fiche », « voir le plan »).
4. **Les référentiels et réglages vivent avec ce qu'ils règlent**, jamais au même niveau que le travail quotidien.

## 2. Les objets et leur domicile

| Objet | Domicile | Il contient | Il apparaît aussi (lien contextuel) |
| --- | --- | --- | --- |
| **Entité** (direction, service…) | Organisation › Structure | Responsable, sous-entités, personnes, équipes, **fiche d'attributions**, rapports avec les autres entités | Plan de travail de l'entité, écarts qui la concernent |
| **Fiche d'attributions** | **Dans l'entité** | Mission, domaines et rôles, rapports, versions | Vue d'ensemble « Attributions » (toutes les fiches, pour contrôler qu'aucune ne manque) |
| **Écart de participation** | Organisation › Écarts | Constat, preuves, décision | Tableau de bord (s'il en reste à examiner) |
| **Domaine d'activité** (référentiel) | Organisation › Référentiel | Nom, description | Choisi dans les fiches, les points d'ordre du jour, les projets |
| **Personne, profil et droits** | Organisation › Personnes / Profils | Rattachement, profil | — |
| **Équipe** | Organisation › Équipes | Membres, projets | Entité de rattachement |
| **Projet** (interne ou confié) | **Pilotage › Portefeuille** | Équipe et rôles, tâches, budget, décisions, tableau de bord du projet | Équipe, tableau de bord DG |
| **Activité** (commission, conférence, rendez-vous, interne) | **Pilotage › Portefeuille** | Mandat, suites à donner | Tableau de bord DG, agenda |
| **Décision de la DG** | **Pilotage › Décisions** (registre) | Numéro annuel, date, objet, texte, dossier d'origine, chargé d'exécution, échéance, exécution | Dossier d'origine (projet, activité, réunion), tableau de bord DG |
| **Réunion et compte rendu** | Pilotage › Réunions | Ordre du jour, participants, **recommandations** | Tableau de bord (exécution), « Mes recommandations » |
| **Plan de travail** | Suivi-évaluation › Plans | Activités planifiées, révisions | Entité concernée |
| **Livrable, contrat de prestataire** | **Dans le projet** (onglets Livrables et Contrats) | Validation, historique, tranche de paiement, termes de référence | Mes tâches (à produire, à valider), Portefeuille › Contrats et paiements (service financier) |
| **Indicateur, risque** | Suivi-évaluation (écrans de saisie à venir) | Valeurs, cotation | Tableau de bord DG |
| **Document à signer, délégation** | Secrétariat › Parapheur | Circuit, visas, délégations | Tableau de bord (« À signer ») |
| **Courrier** | Secrétariat › Courrier | Numéro, imputation, délai | Entité imputée |

## 3. Ce qui change

| Avant | Après | Raison |
| --- | --- | --- |
| « Attributions » module à part dans la navigation | **Dans Organisation** : la fiche se définit depuis l'entité, dès sa création ; une vue d'ensemble reste disponible en onglet | La fiche n'existe que par l'entité (règle 1) |
| « Catalogue des domaines » dans Attributions | Organisation › **Référentiel** | C'est un réglage partagé (règle 4) |
| « Écarts de participation » dans Attributions | Organisation › **Écarts** | Ils portent sur les entités et leurs attributions |
| « Activités » sans les projets ; projets dans une liste à part de la barre latérale | **Portefeuille** : projets et activités ensemble, en onglets | Le portefeuille de la DG est un tout (règle 2) ; une seule maison pour les projets (règle 3) |
| Section « PROJETS » de la barre latérale | Retirée | Doublon du Portefeuille et des Équipes |
| Plans et Livrables dans « Pilotage » | Groupe **Suivi-évaluation** | Ce sont des outils de vérification de l'exécution, distincts de la décision |
| « Organigramme » | **Structure** | C'est l'objet (l'organisation et ses entités), pas un dessin |

## 4. Navigation cible

```
Accueil · Mes tâches · Coéquipiers IA
PILOTAGE            Tableau de bord DG · Portefeuille · Décisions · Réunions
SUIVI-ÉVALUATION    Plans de travail
SECRÉTARIAT         Parapheur · Courrier
ORGANISATION        Structure · Équipes · (Administration)
```

**Organisation › Structure** a ses onglets : Organigramme · Attributions · Écarts · Personnes · Profils et droits · Référentiel · Messagerie.
**Pilotage › Portefeuille** a ses onglets : Tout · Projets · Commissions · Conférences · Rendez-vous · Activités internes.

## 5. Parcours de référence : créer une entité

1. Organisation › Structure › choisir l'entité mère › « Ajouter une sous-entité ».
2. L'entité est créée, puis **la fiche d'attributions s'ouvre aussitôt** : mission, domaines et rôles, rapports avec les autres entités.
3. La fiche reste en préparation jusqu'à son approbation par une autre personne ; elle est ensuite figée et versionnée.
4. Dans le panneau de l'entité, le bloc « Attributions » affiche l'état de la fiche et l'ouvre.

## 6. Parcours de référence : la DG tranche

1. Un projet ou une activité porte une **décision attendue** ; elle remonte dans le tableau de bord DG (« Décisions attendues »).
2. « Arbitrer » ouvre l'enregistrement : objet, texte de la décision, date, chargé d'exécution, échéance.
3. La décision reçoit un **numéro annuel** (`DEC/2026/0001`), est **figée** et la décision attendue du dossier est levée.
4. Le chargé d'exécution est prévenu ; il fait avancer l'exécution (à exécuter → en cours → exécutée) jusqu'à son terme.
5. Une décision ne se modifie jamais : une erreur se corrige par **une nouvelle décision qui remplace** la précédente (marquée « remplacée »).

## 7. Anciennes adresses

`/attributions` renvoie vers `/org?tab=attributions`. Les liens existants restent valides.
