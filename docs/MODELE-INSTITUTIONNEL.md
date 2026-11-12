# Modèle institutionnel — ANAT Pilotage

> **Objet.** Poser, une fois pour toutes, la logique de l'outil à partir du fonctionnement normal d'une institution
> publique : les concepts et leurs frontières, qui voit quoi, qui fait quoi, qui valide quoi, et l'état de chaque
> module. Ce document fait référence : un écran, une route ou un droit qui le contredit est une anomalie.
>
> Rédigé le 12 novembre 2026, sur l'état de la branche `lot-partenaires`. Documents liés : `GUIDE-FONCTIONNEL.md`
> (mode d'emploi), `CONCEPTION.md` (conception des modules), `PARCOURS-METIER.md` (parcours détaillés).

---

## 1. Synthèse

1. **L'institution travaille sur trois horloges.** L'**année** (plan de travail, budget, conventions), le **mois**
   (comités, réunions de service, rapports aux partenaires), le **jour** (tâches, courrier, parapheur). L'outil
   donne à chaque horloge son objet et relie les trois : une tâche du jour fait avancer une activité du plan de
   l'année, sous une décision prise en comité.
2. **Deux axes se croisent : l'organisation et le travail.** L'axe *organisation* dit qui est responsable
   (entités, chefs, agents). L'axe *travail* dit ce qui est fait (dossiers, tâches, réunions, décisions, courrier).
   Toute chose de l'axe travail est **rattachée à une entité** et **portée par une personne**.
3. **Un objet, un domicile, un responsable.** Chaque objet a une seule page où il vit, un seul responsable nommé,
   un cycle de vie fixe. Le reste (tableaux de bord, listes, rappels) n'en montre que des vues.
4. **Rien ne se fait de manière isolée.** Ce qui engage l'institution passe par au moins deux personnes (préparer /
   valider), laisse une trace, et ce qui est validé est figé.
5. **Chacun voit ce qui le concerne d'abord.** L'accueil, « Mon entité », « Mon courrier », « Mes tâches » et la
   boîte de réception mettent en avant ce que la personne doit faire ; le reste se consulte selon ses droits.

---

## 2. Comment fonctionne une institution publique (le modèle de référence)

| Niveau | Qui | Ce qu'il décide | Où dans l'outil |
| --- | --- | --- | --- |
| **Direction générale** | DG, DGA, cabinet | Orientations, arbitrages, signature, imputation du courrier | Tableau de bord DG, Décisions, Parapheur, Courrier |
| **Directions** | Directeurs | Plan de travail de la direction, conduite des projets, visa | Mon entité, Plans de travail, Portefeuille, Parapheur |
| **Services / cellules** | Chefs de service | Répartition du travail entre agents, suivi | Mon entité (suivi des agents) |
| **Agents** | Agents, stagiaires | Exécution : tâches, instruction du courrier, rédaction | Mes tâches, Mon courrier, Réunions |
| **Extérieurs** | Consultants, invités, partenaires | Production sous contrat, participation | Projets ouverts, réunions |
| **Fonctions support** | RH, informatique, bureau d'ordre, secrétariat | Personnes, outil, registres | RH, Administration, Courrier, Réunions |

**Les cycles.**

| Cycle | Ce qui se passe | Objets |
| --- | --- | --- |
| **Annuel** | Chaque entité prépare son plan de travail ; la direction l'approuve ; les conventions se signent ou se renouvellent | Plan de travail, activités du plan, accords |
| **Mensuel** | Comités et réunions de service ; décisions et recommandations ; rapports aux bailleurs | Réunions, comptes rendus, décisions, recommandations |
| **Quotidien** | Le courrier arrive et s'impute ; les tâches se font ; les documents se visent et se signent | Courrier, tâches, parapheur |
| **Continu** | Traces, délais, rappels, alertes | Journal d'audit, notifications, tableau de bord |

---

## 3. Dictionnaire des concepts (et leurs frontières)

### 3.1 L'axe organisation

| Concept | Définition | N'est pas |
| --- | --- | --- |
| **Institution** | L'organisation (l'Agence) : ses entités, ses personnes, ses paramètres. | — |
| **Entité** | Un nœud de l'organigramme : direction, service, cellule, représentation provinciale. A un **chef** (responsable) et des **agents**. | Une équipe. |
| **Chef d'entité** | Le responsable d'une entité. Il dirige aussi, par délégation, les entités rattachées. | Un rôle technique : c'est une fonction dans l'organigramme. |
| **Agent** | Une personne de l'institution, rangée dans une entité, avec un **dossier RH** et un **profil d'accès**. | Un compte seulement : tout agent a un compte, tout compte n'est pas un agent (consultant). |
| **Équipe** | Un groupe de travail transversal (task force, comité technique), qui peut réunir des agents de plusieurs entités. | Une entité ; ni un consultant. |
| **Profil d'accès** | L'ensemble des droits d'une personne (Agent, Chef d'entité, DG…). | La fonction RH : le profil dit ce que l'on peut faire dans l'outil, la fonction dit le poste. |

### 3.2 L'axe travail

| Concept | Définition | Frontière |
| --- | --- | --- |
| **Plan de travail** | L'engagement annuel d'une entité : des **activités du plan** avec cibles et indicateurs. Soumis, approuvé, révisé. | Il dit **quoi** et **pour quand** ; il ne se « fait » pas lui-même. |
| **Dossier** | Ce qui réalise le plan ou répond à une demande. Deux formes : le **projet** et l'**activité**. | Le dossier dit **comment** ; il porte l'avancement qui remonte au plan. |
| **Projet** | Un dossier qui produit un résultat, avec une équipe, des tâches, des livrables, des contrats, des documents, des réunions, des risques. Interne ou confié par un partenaire. | Un projet a une **fin** ; une mission permanente n'est pas un projet. |
| **Activité** | Un dossier d'événement ou de représentation : commission, conférence, rendez-vous, activité interne. A un mandat et des suites à donner. | Pas de tâches en série ni de livrables : quand il en faut, c'est un projet. |
| **Portefeuille** | **Une vue, pas un objet** : l'ensemble des dossiers (projets et activités) de l'institution, que la direction pilote. | On ne « crée » pas un portefeuille ; on y voit ses dossiers. |
| **Registre de l'entité** | Les **tâches hors projet** d'une entité (le travail courant). | Ni un projet du portefeuille, ni une équipe. |
| **Tâche** | Une unité de travail confiée à **une** personne, avec une échéance. Vit dans un projet **ou** dans le registre de son entité. | Une recommandation de réunion devient une tâche quand elle a un dossier. |
| **Livrable** | Un produit attendu dans un projet, validé par une autre personne que son auteur ; peut ouvrir un paiement. | Une tâche ne se « valide » pas : elle se termine. |
| **Contrat** | Le lien avec un consultant ou un cabinet, dans un projet : termes de référence, échéancier. | Pas une fiche d'attributions. |
| **Réunion** | Une séance : convocation, ordre du jour, compte rendu, décisions et recommandations. Appartient à une entité ou à un dossier. | Un rendez-vous de représentation est une activité. |
| **Décision** | Un acte de la DG, numéroté, figé, avec un chargé d'exécution. | Une recommandation (à suivre, non numérotée au registre). |
| **Recommandation** | Une suite à donner issue d'une réunion, avec un responsable et une échéance. | Une décision. |
| **Courrier** | Une correspondance entrante ou sortante, numérotée, imputée, avec un délai. | Un document de dossier. |
| **Document au parapheur** | Un acte soumis à un circuit de visa puis de signature. | Un document déposé dans un dossier. |
| **Document** | Une pièce rangée dans un dossier, un partenaire, un accord, un courrier ou une réunion, décrite par son type. | — |
| **Partenaire** | Un tiers de l'annuaire unique (ministère, bailleur, collectivité, entreprise). | Un contact (personne chez le partenaire). |
| **Accord** | Un acte conclu avec un ou plusieurs partenaires, numéroté à l'entrée en vigueur, modifié par avenant. | Un contrat de prestataire (qui vit dans le projet). |

### 3.3 Les liens qui donnent du sens

```
Plan de travail ─ activité du plan ◄─ réalisée par ─ Dossier (projet | activité)
                                                        │
Entité ─ chef / agents ─────────── porte ──────────────┤
                                                        ├─ Tâches, livrables, contrats, documents
Réunion ─ décisions ─► Registre des décisions           ├─ Réunions (comité de pilotage)
        └ recommandations ─► tâches du dossier          └─ Courrier rattaché
Courrier ─ imputé à ─► Entité ─► Agent ─ réponse ─► Parapheur ─► Courrier sortant
Partenaire ─ accords ─ documents ─ réunions ─ courrier ─ dossiers (commanditaire)
```

---

## 4. Qui voit quoi, qui fait quoi, qui valide quoi

Légende : **V** voit · **F** fait (crée, modifie, exécute) · **A** approuve / valide / signe · « soi » = ce qui le
concerne · « ent. » = son entité et les entités rattachées.

| Domaine | Invité | Stagiaire | Consultant | Agent | Chef d'entité | DGA | DG | Resp. informatique |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mes tâches, Mon dossier | V F soi | V F soi | V F soi | V F soi | V F soi | V F soi | V F soi | V F soi |
| Mon entité (registre, réunions) | — | V F soi | — | V F soi | V F A ent. | V | V | V F soi |
| Suivi des agents | — | — | — | — | V ent. | V | V | — |
| Projets | V ouverts | V F ouverts | V F mission | V F (crée) | V F A (porte) | V F A tous | V F A tous | V F |
| Livrables | — | — | F (produit) | V | V F A | V A | V A | — |
| Plans de travail | — | — | — | V | V F (prépare) | V A (approuve) | V A | — |
| Réunions | V convoqué | V | V convoqué | V | V F A ent. | V F A | V F A | V |
| Décisions | — | — | — | V | V | V | V F (enregistre) | — |
| Courrier | — | V soi | — | V F soi (imputé) | V F ent. (impute) | V F (impute) | V F (annote, impute) | — |
| Parapheur | — | — | — | V F (vise si circuit) | V F A (vise) | V F A | V A (signe) | — |
| Partenaires, conventions | — | — | — | V | V | V F | V F | — |
| Tableau de bord DG | — | — | — | — | — | V | V | — |
| Ressources humaines | Mon dossier | Mon dossier | — | Mon dossier | V ent. | V | V | — |
| Organisation, profils, messagerie | — | — | — | V | V | V | V | V F |
| Administration système | — | — | — | — | — | — | — | (console : administrateur système) |

**Règles qui ne bougent pas** (contrôlées par le serveur) :
- le rédacteur d'un compte rendu ne le valide pas ; celui qui soumet un plan ne l'approuve pas ; l'auteur d'un
  livrable ne le valide pas ;
- seul le chef d'une entité (ou d'une entité au-dessus) confie une tâche à un agent de son entité et impute à un
  agent le courrier imputé à son entité ;
- le DG enregistre les décisions ; le DGA approuve et pilote mais n'enregistre pas les décisions de la DG ;
- le responsable informatique administre l'outil sans voir le pilotage, les décisions ni le courrier confidentiel ;
- l'administrateur système ne connaît jamais le mot de passe d'autrui ; tout ce qu'il fait est tracé.

### 4.1 La vue de chacun (ce que l'outil met en avant)

| Profil | En tête de son accueil et de sa barre latérale |
| --- | --- |
| **Agent** | Mes tâches (à venir, en retard), mes prochaines réunions et convocations à répondre, Mon courrier, Mon entité, Mon dossier |
| **Stagiaire** | Mes tâches, mes réunions, Mon entité, Mon dossier ; pas de portefeuille ni de courrier hors ce qui lui est confié |
| **Consultant** | Les projets de sa mission, ses tâches et livrables ; rien d'autre (profil « invité ») |
| **Invité** | Ce qui lui est partagé, ses convocations |
| **Chef d'entité** | Mon entité : tableau de bord (retards, charge des agents, réunions de l'entité, projets), courrier imputé à l'entité, plan de travail, livrables à valider |
| **DGA** | Tableau de bord DG, portefeuille, réunions, plans à approuver, courrier à imputer |
| **DG** | Tableau de bord DG (ce qui attend une décision), parapheur à signer, courrier à annoter, décisions en retard |
| **Responsable informatique** | Organisation (personnes, structure, profils, messagerie), état du système (s'il est administrateur système) |
| **Administrateur système** | État du système, comptes, sessions, rôles et droits, journal d'audit |

Ces vues sont obtenues aujourd'hui par les **profils** (la barre latérale n'affiche que ce que le profil permet) et
par les écrans « Mon … ». La séparation fine des écrans par profil (accueil propre à chacun) est un lot à venir,
quand la notion d'accès sera finalisée (voir § 6).

---

## 5. Diagnostic module par module

Échelle : **Complet** (le cycle de vie entier, contrôlé par le serveur, tracé) · **Utilisable** (l'essentiel, des
manques identifiés) · **Partiel** (une partie du cycle manque) · **À construire**.

| Module | État | Ce qui est en place | Ce qui manque |
| --- | --- | --- | --- |
| Accès, comptes, profils | **Complet** | Comptes, invitation et lien de finalisation, 2FA, profils institutionnels, droits individuels, sessions | Politique de mot de passe et de durée de session par institution |
| Journal d'audit, notifications | **Complet** | Journal unifié, gravité, par personne, analyse IA ; notifications partout, préférences de courriel | Conservation paramétrable, valeurs avant / après de chaque champ |
| Administration système | **Complet** | État du système, comptes, sessions, rôles et droits, bandeau, paramètres, journal | Politique de sécurité par institution |
| RH (identification) | **Utilisable** | Dossier d'agent, compte automatique, diplômes, personnes à prévenir, historique des affectations | Carrière (avancements, échelons), congés et absences, évaluation annuelle, pièces du dossier |
| Organisation (structure, équipes) | **Utilisable** | Organigramme, chefs, attributions, équipes, écarts | Grilles en lecture puis « Modifier » (comme ailleurs) ; intérim d'un chef |
| Mon entité, tâches | **Complet** | Registre hors projet, vues Asana, confier / noter, suivi des agents, tableau de bord, réunions de l'entité | Tâches récurrentes ; modèle de tâches |
| Projets (dossier complet) | **Complet** | Équipe, tâches, documents, livrables, contrats, réunions, risques, avancement remonté au plan ; revue de portefeuille (santé calculée face à la déclarée) et arbitrages de la DG inscrits au registre | Budget détaillé et décaissements (volet finance) |
| Activités | **Utilisable** | Commission, conférence, rendez-vous, interne ; suites à donner ; documents | Mandat et compte rendu de mission formalisés |
| Plans de travail | **Complet** | Préparer, soumettre, approuver, réviser ; avancement par les dossiers ; revue trimestrielle (constaté face à l'attendu, écarts expliqués, validation par la DG, revue figée) | Grille CRUD homogène |
| Réunions | **Complet** | À venir / déjà tenue, convocation, réponses, ordre du jour et pièces, compte rendu, validation, décisions et recommandations, réunions d'entité | Convocation en lecture (carte encore en champs) |
| Décisions | **Utilisable** | Registre numéroté, exécution, remplacement, rappels | Grille CRUD homogène (actions en ligne) |
| Courrier | **Complet** | Registre, imputation en cascade, annotations, copies, prise en charge, clôture, classement motivé, réponse liée, délais, tableau de bord, Mon courrier | Modèles de réponse ; accusé de réception automatique |
| Parapheur | **Utilisable** | Circuit de visa et signature, délégations, accroches (accords, courrier) | Grille CRUD homogène ; signature électronique qualifiée |
| Partenaires, conventions | **Utilisable** | Annuaire, états, contacts, documents typés, accords, avenants, rapprochement, liens | Finance (engagements, décaissements) et obligations de rapport — reportés à la demande |
| Tableau de bord DG | **Complet** | Retards, décisions attendues, agenda, santé du portefeuille ; vue par direction (appréciation motivée, projets, plan réalisé face à l'attendu, retards) et fiche de chaque direction et service | Tendances d'un mois sur l'autre |
| Coéquipiers IA | **Utilisable** | Assistant, délégation sous validation, analyse du journal | Fournisseur par agent IA |

### 5.1 Ce qui était à moitié et a été corrigé dans cette série

| Constat | Correction |
| --- | --- |
| Une tâche devait toujours appartenir à un projet ; le chef d'entité n'avait aucun suivi de ses agents | Registre de l'entité, « Mon entité » façon Asana, suivi des agents, tableau de bord |
| Les réunions exigeaient un droit réservé à l'administration ; une entité ne pouvait pas tenir ses réunions | Réunions d'entité gérées par leur chef ; mise en avant des réunions où l'on est attendu |
| Le courrier ne connaissait qu'un niveau d'imputation ; un agent imputé ne voyait pas son courrier sans le droit général | Circuit complet : cascade direction → chef → agent, annotations, copies, prise en charge, classement motivé, Mon courrier |
| Les notifications ignoraient les modifications (échéance, retrait, réunion déplacée ou annulée) ; pas de préférences | Avis à chaque changement, retard signalé au chef, domaine et lien de chaque avis, préférences de courriel |
| Aucun dossier RH ; les comptes étaient créés sans identification | Module RH ; tout agent créé devient utilisateur (lien, vue Agent) |
| Profils trop génériques (Membre / Administrateur) | Profils de l'institution : Agent, Stagiaire, Consultant, Chef d'entité, DGA, DG, Responsable informatique |
| Aucun aperçu pour les pièces de réunion ; bouton d'aperçu caché dans les tableaux étroits | Aperçu partout, toujours visible |
| Administration système limitée aux comptes et au journal | État du système, sessions, bandeau, matrice des rôles, export des comptes |

---

## 6. Feuille de route proposée (par valeur pour l'institution)

| Priorité | Lot | Pourquoi | Effort |
| --- | --- | --- | --- |
| 1 | **Accueil par profil** : l'écran d'accueil propre à l'Agent, au Chef d'entité, au DG | Chacun ouvre l'outil sur ce qu'il doit faire, sans chercher | Moyen |
| 2 | **Grilles homogènes** : décisions, parapheur, plans, équipes, structure en lecture puis « Modifier », actions en ligne | Cohérence d'usage dans tout l'outil (règle § 4 du design) | Moyen |
| 3 | **RH, deuxième étape** : carrière, congés et absences, pièces du dossier, alertes de fin de contrat | Le dossier d'agent devient l'outil du service RH | Moyen |
| 4 | **Évaluation des agents** : objectifs, entretien annuel, appuyé sur les tâches tenues et les délais (appréciation humaine) | Demandé ; s'appuie sur des données déjà présentes | Moyen |
| 5 | **Finance des partenariats** (PA4) : engagements, échéancier des décaissements, tableau des bailleurs | Reporté à la demande | Élevé |
| 6 | **Politique de sécurité** par institution : mot de passe, durée de session, 2FA obligatoire pour les droits élevés | Robustesse | Faible |
| 7 | **Tâches récurrentes** (fait) ; modèles de tâches à venir | Le travail courant d'une entité se répète | Faible |

**Décisions à prendre** : faut-il que le DGA enregistre des décisions par délégation (aujourd'hui non) ? Le
responsable informatique doit-il être administrateur système de droit (aujourd'hui non, c'est un rôle à part) ?
Les stagiaires voient-ils le portefeuille (aujourd'hui non) ?
