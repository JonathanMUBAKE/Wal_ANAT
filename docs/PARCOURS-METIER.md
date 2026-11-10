# Parcours métier — comment l'institution travaille, et ce que l'outil doit en faire

> Point de départ de toute la conception à venir. Chaque parcours part d'un **cas concret** (fictif), suit les
> **gestes réels de l'administration**, et dit à chaque étape **ce que l'on remplit**, **qui agit**, **ce que l'outil
> fait ensuite**. Les écarts avec l'outil actuel sont signalés « Aujourd'hui ». Les procédures citées (marchés publics,
> délais) sont des pratiques courantes : elles sont à confirmer avec les textes de l'ANAT et deviennent des paramètres.

---

## 1. Le principe qui donne un sens à tout : le dossier

Dans une administration, tout travail se fait **dans un dossier**. Un dossier a un objet, un responsable, une entité
porteuse, des pièces, des échéances et une fin. L'outil reprend ce principe :

| Dossier | Quand | Exemples |
| --- | --- | --- |
| **Projet** | Un travail à produire, sur une durée, avec une équipe | Schéma provincial d'aménagement, étude foncière, refonte du système d'information |
| **Activité** | Une représentation ou un engagement ponctuel de l'institution | Commission interministérielle, conférence, audience, atelier |

Tout le reste **appartient à un dossier** et s'y retrouve : tâches, livrables, contrats de prestataires, réunions du
dossier, décisions, documents, courriers. Les écrans transverses (Mes tâches, tableau de bord, registres) sont des
**vues** qui rassemblent ce qui est rangé dans les dossiers ; ils ne sont jamais le domicile d'un objet.

Exception assumée : les **registres officiels** (courrier, comptes rendus de réunion, décisions de la DG) ont leur
propre page parce qu'ils portent une **numérotation officielle continue** ; chaque pièce du registre reste
rattachée à son dossier.

La chaîne qui relie tout, de la mission au résultat :

```
Attributions de l'entité ── ce dont elle répond
        │
Plan de travail annuel ──── ce qu'elle s'engage à faire cette année (activités, cibles, budget)
        │
Projets et activités ────── comment elle le fait (dossiers)
        │
Tâches, livrables, contrats ─ le travail et ceux qui le font
        │
Réunions, décisions ─────── le pilotage
        │
Avancement, indicateurs ─── le résultat, qui remonte au plan puis au tableau de bord de la DG
```

---

## 2. Qui est qui

| Notion administrative | Dans l'outil | Ce que ce n'est pas |
| --- | --- | --- |
| **Agent** de l'institution | Personne interne, rattachée à une entité, avec un profil de droits | — |
| **Entité** (direction, service, représentation provinciale) | Nœud de la structure, avec responsable et fiche d'attributions | — |
| **Équipe** | Groupe de travail de personnes de l'institution (cellule, task force, comité technique) | **Pas un consultant**, pas une entité |
| **Prestataire** | Consultant individuel ou cabinet, extérieur à l'institution | Pas un agent, pas une équipe |
| **Consultant** (personne) | Personne **externe**, compte à accès limité aux dossiers de son contrat, qui expire avec lui | Pas une équipe |
| **Contrat** (de consultant ou de prestation) | Pièce du **projet** : objet, termes de référence, durée, montant, superviseur, échéancier | Pas un module à part |
| **Termes de référence (TdR)** | Le texte du contrat qui fixe mission, tâches et livrables du consultant | Pas une fiche d'attributions |
| **Livrable** | Produit attendu **dans un projet**, validé par une autre personne que son auteur ; contractuel s'il dépend d'un contrat | Pas un module à part |

**« Un consultant est-il créé comme une équipe ? »** Non. Une équipe regroupe des personnes **de l'institution**
qui travaillent ensemble dans la durée. Un consultant est une **personne extérieure liée par un contrat** :
1. on crée le **contrat dans le projet** ;
2. on donne au consultant un **compte externe** qui ne voit que ce projet ;
3. on l'ajoute à l'**équipe du projet** avec le rôle « Consultant — expert foncier » ;
4. son accès s'arrête à la fin du contrat.

Un **cabinet** est un prestataire qui fournit plusieurs experts : un seul contrat, plusieurs comptes externes.

**« Ses attributions ? »** Pour un consultant, ce sont ses **termes de référence**, annexés au contrat : mission,
tâches, livrables, échéances, superviseur. La **fiche d'attributions** reste réservée aux entités et aux agents
permanents (elle décrit une responsabilité durable, pas une prestation).

---

## 3. Les parcours

### Parcours 1 — Programmer une réunion et produire son compte rendu

**Cas.** Comité de direction hebdomadaire du lundi 16 novembre 2026, 9 h, salle du conseil. Convoqué et présidé
par la Directrice générale ; le secrétariat de direction rédige.

| Étape | Qui | Ce que l'on remplit / fait | Ce que l'outil fait ensuite |
| --- | --- | --- | --- |
| 1. Programmer | Secrétariat de direction | **Type** (référentiel : comité de direction), **objet**, date, heure de début et de fin, **lieu ou lien de visioconférence**, **convoquée par** (DG), **présidée par**, **rédacteur**, **participants convoqués** (personnes ou entités entières), **dossier rattaché** (facultatif : un projet pour un comité de pilotage), confidentialité, **récurrence** (chaque lundi) | Réunion « programmée » ; elle apparaît dans l'agenda de chaque convoqué |
| 2. Préparer l'ordre du jour | Secrétariat, avec les rapporteurs | Points, **rapporteur** par point, durée, **pièces jointes** (notes, présentations) | Le point « **Suivi des recommandations de la réunion précédente** » est ajouté d'office avec la liste des recommandations encore ouvertes |
| 3. Convoquer | Secrétariat | « Envoyer la convocation » (règle : au moins 48 h avant, paramétrable) | Chaque convoqué reçoit la convocation (notification, courriel, invitation de calendrier) avec l'ordre du jour ; il répond **présent / excusé / représenté par…** |
| 4. Tenir la séance | Rédacteur | **Feuille de présence** (préremplie avec les réponses), notes par point, **recommandations** (quoi, qui, pour quand), **décisions** annoncées par la présidente | Réunion « tenue » |
| 5. Rédiger le compte rendu | Rédacteur | Mise en forme sur le modèle officiel (délai : 48 h après la séance, paramétrable) ; « **Soumettre pour validation** » | La présidente de séance est prévenue qu'un compte rendu l'attend |
| 6. Valider | Présidente de séance (jamais le rédacteur) | Relit, demande une correction **ou** valide | Le compte rendu est **numéroté, figé**, exporté au format officiel et **diffusé** aux participants et aux responsables de recommandations ; chaque décision est **inscrite au registre des décisions** ; chaque recommandation rattachée à un projet devient une **tâche du projet** |
| 7. Suivre | Chaque responsable ; le secrétariat | Le responsable fait avancer sa recommandation (en cours → soumise) ; le rédacteur la clôt | Les retards remontent au tableau de bord ; le bilan s'affiche au point « suivi » de la réunion suivante |

Règles : pas de validation avant la séance ; une recommandation a toujours un responsable et une échéance ; le
compte rendu validé ne se modifie plus (une réouverture est tracée et motivée).

**Aujourd'hui** : déjà en place, la saisie des points, des participants, des recommandations ; la validation qui
numérote et fige le compte rendu ; le suivi des recommandations.

Ce qui manque encore :
- pas de participants convoqués avant la séance, pas de convocation ni de réponse des convoqués ;
- pas d'étape « soumettre pour validation », pas de diffusion du compte rendu ;
- pas de rattachement à un dossier, pas de récurrence ;
- les décisions de séance ne vont pas au registre, et les recommandations ne deviennent pas des tâches du projet.

### Parcours 2 — Recruter un consultant et suivre sa mission jusqu'au paiement

**Cas.** La Direction de la planification a besoin d'un **diagnostic foncier** pour le projet « Schéma national
d'aménagement ». Consultant individuel, 3 mois, superviseur : le chef du service foncier.

| Étape | Qui | Ce que l'on remplit / fait | Ce que l'outil fait ensuite |
| --- | --- | --- | --- |
| 1. Vérifier que le besoin est prévu | Directeur de la planification | Le diagnostic est une activité du **plan de travail approuvé**, avec budget ; le projet existe | Le projet affiche l'activité du plan qu'il réalise et le budget disponible |
| 2. Rédiger les TdR | Service foncier, **dans le projet** | Contexte, objectifs, tâches, **livrables attendus** (titre, contenu, échéance, critères d'acceptation), profil recherché, durée, superviseur, estimation du coût | TdR en préparation, pièce du projet |
| 3. Faire valider TdR et dépense | Circuit du **parapheur** | Avis de la direction financière et de la cellule des marchés, visa du directeur, signature de la DG | Le document signé est **rattaché au projet** |
| 4. Sélectionner | Cellule des marchés, comité d'évaluation | Selon la procédure applicable (consultation de CV ou appel à manifestation d'intérêt) : candidats, grille, **procès-verbal d'évaluation**, attribution | L'outil suit les étapes et range les pièces ; il ne remplace pas la procédure de passation |
| 5. Contracter | Cellule des marchés ; DG | **Contrat dans le projet** : prestataire, objet, TdR annexés, dates, montant, **échéancier de paiement lié aux livrables** (ex. 30 % au rapport de démarrage, 40 % au rapport intermédiaire, 30 % au rapport final) ; signature au parapheur | Les **livrables contractuels** sont créés d'après les TdR, dans l'onglet Livrables du projet, avec le superviseur comme valideur |
| 6. Accueillir | Responsable du projet | Création du **compte externe** du consultant, ajout à l'équipe du projet avec son rôle | Le consultant ne voit que ce projet ; son accès s'arrêtera à la fin du contrat |
| 7. Exécuter | Consultant, superviseur | Réunion de démarrage (rattachée au projet), tâches assignées, échanges | Avancement visible dans le projet |
| 8. Livrer | Consultant → superviseur | Le consultant **soumet** le livrable (fichier joint) ; le superviseur le prend en revue, demande des corrections ou **valide** | Validation par une autre personne que l'auteur ; **procès-verbal de réception** numéroté (PV-2026-0007) ; la **tranche de paiement** liée devient « à payer » |
| 9. Payer | Service administratif et financier | Constate le paiement (date, référence) | Tranche « payée » ; le dossier du contrat se complète |
| 10. Clôturer | Superviseur ; responsable du projet | Quand tous les livrables sont validés et payés : **évaluation du prestataire**, clôture du contrat | Accès externe désactivé ; l'avancement de l'activité du plan est mis à jour |

**Aujourd'hui** : déjà en place, les livrables avec circuit de validation, le procès-verbal de réception et le
constat de paiement.

Ce qui manque encore :
- le contrat et les livrables **ne sont pas rattachés au projet** : un module « Livrables et missions » isolé, sans
  sens administratif ;
- pas de TdR structurés ;
- pas d'échéancier de paiement par livrable ;
- pas d'accès externe qui expire ;
- pas de lien avec l'activité du plan.

### Parcours 3 — Monter et conduire un projet

**Cas.** « Schéma provincial d'aménagement du Nord » (fictif), confié à l'Agence par le ministère de tutelle par
convention.

| Étape | Qui | Ce que l'on remplit / fait | Ce que l'outil fait ensuite |
| --- | --- | --- | --- |
| 1. Ouvrir le dossier | DG ou directeur, sur décision ou convention | Origine (interne / confié), commanditaire, référence de la convention, **activité(s) du plan réalisée(s)**, entité porteuse, responsable, objectif, dates, budget prévu | Projet créé dans le portefeuille ; la décision ou le courrier d'origine y est rattaché |
| 2. Constituer l'équipe | Responsable du projet | Agents (rôle dans le projet), entités contributrices, plus tard les consultants | Chacun voit le projet dans son espace |
| 3. Planifier | Équipe | Phases et **jalons**, **tâches** (qui, quand), **livrables** (qui produit, qui valide, quand) | Calendrier et charge visibles |
| 4. Piloter | Responsable ; comité de pilotage | **Réunions du projet** (rattachées), décisions demandées à la DG (« décision attendue » → registre), risques, budget engagé et dépensé | Le projet passe « à surveiller » dès qu'un retard existe ; une alerte apparaît si le dépensé dépasse le prévu |
| 5. Rendre compte | Responsable | Avancement, livrables validés | L'avancement **remonte à l'activité du plan**, puis au tableau de bord de la DG |
| 6. Clôturer | Responsable ; DG | Rapport d'achèvement, contrats clôturés, archives | Projet « terminé », figé en lecture |

**Aujourd'hui** :
- les projets ont une équipe et des tâches, mais pas de livrables, de contrats ni de réunions rattachés ;
- aucun lien avec le plan de travail ;
- pas d'alerte de dépassement budgétaire.

### Parcours 4 — Traiter un courrier entrant jusqu'à la réponse

**Cas.** Le gouverneur de la province du Nord demande un appui technique pour son plan d'urbanisme.

| Étape | Qui | Ce que l'on remplit / fait | Ce que l'outil fait ensuite |
| --- | --- | --- | --- |
| 1. Enregistrer | Bureau d'ordre | Expéditeur, date et référence de la lettre, objet, date de réception, pièce numérisée | Numéro **ENT/2026/0142** |
| 2. Imputer | DG (annotation) | Entité et agent chargés, **instruction** (« pour traitement », « pour avis », « pour information »), délai de réponse | L'agent est prévenu ; le délai court |
| 3. Traiter | Agent imputé | Instruit ; si un vrai travail en découle, **ouvre ou rattache un dossier** (projet ou activité) | Le courrier apparaît dans le dossier |
| 4. Répondre | Agent → parapheur | Projet de réponse soumis au circuit (visa du directeur, signature de la DG) | Une fois signée, la réponse est **enregistrée en sortie** (SOR/2026/0098) **liée au courrier entrant**, qui est **clôturé** |
| 5. Relancer | Outil | — | Délai dépassé : relance de l'agent, puis remontée au responsable de l'entité |

**Aujourd'hui** :
- le parcours fonctionne, sauf ces liens : le courrier sortant n'est pas lié au courrier entrant, et le courrier
  n'est rattaché à aucun dossier ;
- l'instruction d'imputation n'est pas saisie ;
- un document signé au parapheur n'alimente pas le courrier sortant.

### Parcours 5 — Préparer, approuver et suivre le plan de travail annuel

**Cas.** Plan de travail 2027 de la Direction de la planification.

| Étape | Qui | Ce que l'on remplit / fait | Ce que l'outil fait ensuite |
| --- | --- | --- | --- |
| 1. Cadrer | DG | Note de cadrage (orientations, plafonds), calendrier de préparation | Chaque entité reçoit la demande et l'échéance |
| 2. Préparer | Chaque entité | Activités rattachées à ses **attributions** (domaines), responsable, cible et unité, échéance, budget | Brouillon ; l'outil signale une activité hors attributions |
| 3. Soumettre puis arbitrer | Entité → comité de direction | Soumission ; arbitrage en réunion (rattachée au plan) | Les approbateurs sont prévenus |
| 4. Approuver | DG ou délégataire (pas l'auteur) | Approuve ou renvoie avec motif | Plan **figé** : le prévu ne bouge plus, toute révision est motivée et tracée |
| 5. Exécuter | Responsables | Chaque activité est réalisée par des **projets** ou des **activités** | L'avancement des dossiers remonte à l'activité du plan |
| 6. Revoir | Comité de direction, chaque trimestre | Revue d'exécution (réunion), révisions motivées | Taux d'exécution physique et financier par entité |
| 7. Rendre compte | Entité ; DG | Rapport annuel de performance | Généré à partir des données du plan |

**Aujourd'hui** :
- en place : la préparation, la soumission, l'approbation qui fige le plan et les révisions tracées ;
- l'avancement est saisi à la main, sans lien avec les projets et les livrables ;
- pas de note de cadrage, pas de rapport généré.

### Parcours 6 — Représenter l'institution (commission, conférence, audience)

**Cas.** Invitation à la commission interministérielle d'aménagement du 20 novembre.

| Étape | Qui | Ce que l'on remplit / fait | Ce que l'outil fait ensuite |
| --- | --- | --- | --- |
| 1. Recevoir l'invitation | Bureau d'ordre | Courrier entrant | Imputé au responsable concerné |
| 2. Ouvrir l'activité | Responsable | Type (référentiel), date, lieu, organisateur, **courrier d'invitation rattaché** | Activité dans le portefeuille et l'agenda |
| 3. Fixer le mandat | Responsable → DG | Position à défendre, **délégation** désignée ; validation par la DG si nécessaire (décision attendue) | Le mandat validé est inscrit au registre des décisions |
| 4. Participer, rendre compte | Délégation | **Compte rendu de mission** sous quelques jours (paramétrable), résultats | La DG est prévenue |
| 5. Donner suite | Responsable | **Suites à donner** (qui, quand) ; si un travail en découle, un projet | Les suites en retard remontent au tableau de bord |

**Aujourd'hui** :
- en place : l'activité, son mandat, sa délégation et ses suites ;
- il manque le lien avec le courrier d'invitation, le délai du compte rendu de mission et l'inscription du mandat
  au registre des décisions.

### Parcours 7 — La DG tranche (déjà construit)

Une décision attendue (projet, activité, réunion) est arbitrée : numéro annuel, texte figé, chargé d'exécution,
échéance, exécution suivie (voir `docs/SCENARIOS.md` § 9). Les parcours 1, 3 et 6 l'alimentent.

### Parcours 8 — Créer une entité et l'organiser (déjà construit)

Création dans la structure (type du référentiel, siège ou province), responsable, **fiche d'attributions** aussitôt
définie, approuvée par une autre personne, figée et versionnée ; les écarts entre attributions et activité réelle
sont détectés.

---

## 4. Ce que ces parcours imposent à l'architecture

1. **Un domicile par objet : son dossier.**
   - Les livrables et les contrats appartiennent au **projet**.
   - Une réunion, un courrier, un document du parapheur ou une décision **peut être rattaché** à un dossier et
     apparaît alors dans son onglet.
2. **Les écrans transverses sont des vues.**
   - « Mes tâches » rassemble aussi les livrables à produire ou à valider et les recommandations à exécuter.
   - Le tableau de bord rassemble les retards et les décisions attendues.
   - Les registres officiels (courrier, comptes rendus, décisions) gardent leur page pour la numérotation.
3. **Le plan dit quoi, le dossier dit comment.**
   - Un projet ou une activité réalise une ou plusieurs activités du plan.
   - L'avancement et la dépense remontent du dossier vers le plan.
4. **Chaque passage de main prévient quelqu'un, chaque acte officiel est numéroté et figé, chaque action sensible
   est tracée.** Règle déjà appliquée ; les parcours ajoutent la convocation, la soumission du compte rendu, la
   diffusion et la relance.
5. **Interne et externe sont distincts.**
   - Une personne externe (consultant) n'accède qu'aux dossiers de son contrat, et seulement pendant sa durée.
6. **Les délais administratifs sont des paramètres** (convocation, rédaction du compte rendu, réponse au courrier,
   compte rendu de mission), réglés dans Administration système › Paramètres de l'institution.

## 5. Réorganisation qui en découle

| Aujourd'hui | Demain | Pourquoi |
| --- | --- | --- |
| Module « Livrables et missions » dans Suivi-évaluation | **Supprimé de la navigation.** Livrables et contrats deviennent des onglets du **projet** | Un livrable et un contrat n'existent que pour un projet |
| Livrables à valider : seulement dans le module | Dans **Mes tâches** (« À produire », « À valider ») et au tableau de bord | C'est là que chacun cherche son travail |
| Paiements à constater : seulement dans le module | Vue transverse **« Contrats et paiements »** pour le service administratif et financier (filtre du portefeuille) | Le service financier suit tous les contrats sans en être le domicile |
| Réunion sans lien | Réunion rattachable à un projet ; onglet **Réunions** du projet | Comité de pilotage, réunion de démarrage |
| Projet : équipe et tâches | Projet : **Vue d'ensemble · Tâches · Livrables · Contrats · Réunions · Décisions · Documents** | Le dossier complet au même endroit |

Navigation cible :

```
Accueil · Mes tâches · Coéquipiers IA
PILOTAGE            Tableau de bord DG · Portefeuille · Décisions · Réunions
SUIVI-ÉVALUATION    Plans de travail · (Indicateurs et risques, à venir)
SECRÉTARIAT         Parapheur · Courrier
ORGANISATION        Structure · Équipes
```

## 6. Lots de construction proposés, dans l'ordre

| Lot | Contenu | Parcours servis |
| --- | --- | --- |
| **P1. Le projet devient le dossier complet** | Contrats et livrables rattachés au projet (avec reprise des données existantes), onglets Livrables et Contrats dans le projet, échéancier de paiement par livrable, « À produire / À valider » dans Mes tâches, vue Contrats et paiements, retrait du module | 2, 3 |
| **P2. La réunion programmée** | Participants convoqués, convocation avec réponse, pièces de l'ordre du jour, point de suivi automatique, soumission puis validation par la présidence, diffusion, rattachement à un dossier, récurrence | 1 |
| **P3. Les liens entre dossiers** | Projet ↔ activité du plan (avancement remonté), recommandation → tâche du projet, décision de séance → registre, courrier sortant ↔ entrant, courrier et parapheur rattachés à un dossier, instruction d'imputation | 1, 3, 4, 5, 6 |
| **P4. L'accès externe des consultants** | Compte externe limité aux dossiers du contrat, expirant avec lui ; TdR structurés | 2 |
| **P5. Les délais comme paramètres** | Délais de convocation, de compte rendu, de réponse, de compte rendu de mission ; relances | 1, 4, 6 |

## 7. Questions à trancher

| N° | Question | Proposition par défaut |
| --- | --- | --- |
| Q4 | Un contrat de consultant est-il **toujours** rattaché à un projet ? | Oui. Un appui ponctuel (ex. au cabinet de la DG) se range dans un projet « Appui » de l'entité |
| Q5 | Qui valide le compte rendu d'une réunion ? | La personne qui a présidé la séance ; à défaut, la DG |
| Q6 | La sélection des consultants : simple suivi des étapes et des pièces, ou véritable module de passation des marchés ? | Simple suivi des étapes et des pièces ; la passation reste régie par la procédure applicable |
| Q7 | Les délais de référence (convocation 48 h, compte rendu 48 h, réponse au courrier 10 jours ouvrés) | À confirmer avec les textes internes de l'ANAT ; modifiables dans les paramètres |
