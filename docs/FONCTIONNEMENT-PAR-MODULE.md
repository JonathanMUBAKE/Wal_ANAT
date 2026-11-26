# ANAT Pilotage — fonctionnement module par module

> **À quoi sert ce document.** Décrire ce que fait réellement le système aujourd'hui (branche `main`, novembre 2026),
> module par module, avec toutes ses fonctionnalités, pour **repérer les incohérences** d'un coup d'œil. Il a été établi
> à partir du code (routes du serveur, droits, profils, écrans), pas des intentions.
>
> Chaque module suit la même grille : **À quoi il sert** · **Où** (menu) · **Qui** (droits) · **Objets et cycle de
> vie** · **Fonctionnalités** · **Règles contrôlées par le serveur** · **Avis envoyés** · **Liens avec les autres
> modules** · **Export** · **Ce que la DG y saisit** · **Incohérences et points à trancher** (numérotés `I-xx`,
> repris dans la synthèse en fin de document).
>
> Documents voisins : `GUIDE-FONCTIONNEL.md` (mode d'emploi), `MODELE-INSTITUTIONNEL.md` (concepts et rôles),
> `PLAN-DE-TRAVAIL.md` (journal des lots).

---

## 0. Vue d'ensemble

### 0.1 Principes qui valent pour tous les modules
- **Tout est contrôlé par le serveur** : un bouton caché n'est jamais la seule protection ; chaque route est
  vérifiée par la matrice des droits (`matrice.test.ts`).
- **Préparer n'est pas valider** : celui qui soumet ne valide pas (plans, comptes rendus, revues, livrables,
  arbitrages, congés).
- **Ce qui est validé est figé** : décisions, comptes rendus validés, accords en vigueur, revues validées ; une
  erreur se corrige par un acte nouveau (remplacement, avenant, révision tracée).
- **L'IA propose, un humain décide** : un coéquipier IA n'inscrit jamais une décision ni ne valide.
- **Tout est tracé** : journal d'activité et événements de sécurité, consultables dans le journal d'audit.
- **Chacun ne voit que ce qui lui est ouvert** : droits du profil, appartenance au projet, entité dirigée,
  confidentialité.

### 0.2 Le menu (barre latérale)
| Rubrique | Entrées | Condition d'affichage |
| --- | --- | --- |
| (haut) | Accueil · Mes tâches · Mon entité · Mon dossier · Coéquipiers IA | Mon entité : si la personne appartient à une entité |
| **Pilotage** | Tableau de bord DG · Portefeuille · Décisions · Réunions | droits `pilotage.view` · `agenda.view` ou `projects.create` · `decisions.view` ou `decisions.record` · `meetings.view` |
| **Suivi-évaluation** | Plans de travail | `plans.view` |
| **Partenariats** | Partenaires · Conventions | `partners.view` |
| **Secrétariat** | Signataire · Courrier | `signature.use` · courrier pour tout non-invité |
| **Organisation** | Structure · Équipes · Ressources humaines · Administration système | RH : `hr.view`/`hr.manage` ; Administration : administrateur de la plateforme |

### 0.3 Les profils (droits regroupés)
| Profil | Base | En résumé |
| --- | --- | --- |
| Propriétaire | owner | Tous les droits, non modifiable |
| Administrateur | admin | Administre l'organisation, ses personnes et ses projets |
| **DG** | admin | Voit tout le pilotage, tranche et enregistre les décisions, approuve, signe ; ne règle pas la technique (messagerie, profils) |
| **DGA** | admin | Pilote l'ensemble, approuve les plans, gère les réunions et le courrier, consulte les dossiers RH ; n'enregistre pas les décisions de la DG (point ouvert) |
| Chef d'entité | member | Confie les tâches et suit ses agents, prépare le plan de travail, porte les projets, valide les livrables, tient les réunions de son entité |
| Agent | member | Ses tâches, son entité, son courrier, son dossier |
| Stagiaire | member | Comme l'agent, plus restreint |
| Consultant | guest | Uniquement ce qui lui est partagé |
| Responsable informatique | member | Administre l'outil (personnes, structure, profils, messagerie, règles IA) sans accès au pilotage, aux décisions ni au courrier confidentiel |
| Membre / Lecture seule / Invité | member / guest | Profils génériques |

Les droits individuels peuvent s'ajouter ou se retirer à un profil (Structure › Personnes › accès).
**Il n'existe pas de profil « Assistant(e) de la DG »** (voir I-30).

### 0.4 Carte des modules et de leurs liens
```
Organisation (structure, personnes, profils) ──► tout le reste (qui voit, qui fait, qui valide)
Plans de travail ◄── avancement ── Projets / Activités ◄── tâches, livrables, réunions, documents
       │                                   │
       ▼                                   ▼
 Revue trimestrielle            Revue de portefeuille ── arbitrage ──► Registre des décisions
       │                                   │                                   ▲
       └──────────► Tableau de bord DG ◄───┘                                   │
                      (vue par direction)              Réunions ── décisions de séance ┘
Courrier ── réponse ──► Signataire ── signature ──► Conventions / Courrier sortant
Partenaires ──► Conventions, projets, courrier, réunions
```

---

## 1. Accueil

- **À quoi il sert** : ouvrir l'outil sur ce que la personne doit faire aujourd'hui.
- **Où** : Accueil.
- **Qui** : tout le monde.
- **Fonctionnalités**
  - Salutation, nombre de tâches ouvertes, en retard, terminées cette semaine.
  - **« Ce qui vous attend »** selon les droits : courrier à imputer (direction) ou Mon courrier (agent), documents
    à viser ou signer, retards de l'entité dirigée, décisions à exécuter.
  - **Mes tâches** (à venir, en retard, terminées).
  - **Mes prochaines réunions** : convocations à répondre en tête, réunion hebdomadaire de l'entité toujours visible.
- **Ce que la DG y saisit** : rien. L'accueil de la DG n'est pas différent de celui des autres (I-31).

## 2. Mes tâches

- **À quoi il sert** : la liste personnelle de tout ce qui est confié à la personne, tous projets et entités confondus.
- **Où** : Mes tâches.
- **Qui** : tout le monde (ses propres tâches).
- **Objets** : tâche (intitulé, description, chargé, priorité, début, échéance, étiquettes, sous-tâches, commentaires,
  pièces jointes, **répétition**).
- **Fonctionnalités**
  - Regroupement : en retard, cette semaine, plus tard, sans échéance ; livrables à produire en tête.
  - **Tâche hors projet** : rangée dans le registre de l'entité de la personne.
  - Fiche de la tâche (tiroir) : tous les champs, sous-tâches, conversation, pièces jointes, IA (description,
    sous-tâches suggérées, délégation à un coéquipier IA sous validation).
  - **Tâche récurrente** (jour, semaine, quinzaine, mois, trimestre, année) : la terminer crée la suivante, une fois.
- **Règles** : dates cohérentes ; un agent ne confie pas de tâche à un collègue dans le registre d'entité ; une
  sous-tâche ne se répète pas seule.
- **Avis** : attribution, retrait, modification (un avis résumé), échéance (veille, puis retard, puis le chef).
- **Incohérences** : la répétition ne se choisit que dans la fiche d'une tâche existante, pas à la création (I-20).

## 3. Mon entité

- **À quoi il sert** : l'espace de travail d'une entité (direction, service, cellule), à la manière d'Asana.
- **Où** : Mon entité (choix de l'entité si la personne en a plusieurs).
- **Qui** : les agents de l'entité ; son chef ; les chefs des entités au-dessus.
- **Fonctionnalités**
  - Onglets : Vue d'ensemble · Liste · Tableau · Calendrier · Chronologie · Projets · Réunions · Suivi des agents.
  - **Tableau de bord** : tâches ouvertes et en retard, tendance sur 8 semaines, par état et priorité, échéances
    proches, charge par agent, projets (y compris ceux où l'entité est invitée), réunions de l'entité.
  - Le chef **confie** une tâche à un agent (y compris d'une sous-entité) ; l'agent **note** ses propres tâches.
  - **Créer un projet** rattaché à l'entité.
  - **Réunions de l'entité** : le chef les programme et les convoque (module Réunions réutilisé).
- **Règles** : seul le chef attribue ou modifie la tâche d'un autre agent.
- **Incohérences** : le compte des retards diffère de celui du tableau de bord DG et de la vue par direction (I-11).

## 4. Mon dossier (RH, côté agent)

- **À quoi il sert** : l'agent consulte son dossier, en lecture seule.
- **Qui** : l'agent lui-même.
- **Fonctionnalités** : identité, situation administrative, affectation et historique, diplômes, personnes à
  prévenir. L'agent ne modifie rien : une correction se demande au service RH. Un gestionnaire RH ne modifie pas
  non plus son propre dossier ; un autre gestionnaire s'en charge.

## 5. Coéquipiers IA

- **À quoi il sert** : confier du travail à des agents IA qui proposent ; un humain valide chaque action.
- **Fonctionnalités** : liste des coéquipiers IA, travaux en cours, **validations demandées**, règles d'automatisation
  par projet, assistant conversationnel (barre latérale), rédaction de description, découpage en sous-tâches,
  analyse du journal d'audit.
- **Règles** : déléguer à l'IA exige `ai.delegate` ; valider exige `ai.approve` ; aucune décision inscrite par l'IA.

---

## 6. Tableau de bord DG

- **À quoi il sert** : l'essentiel pour décider aujourd'hui.
- **Où** : Pilotage › Tableau de bord DG.
- **Qui** : `pilotage.view`.
- **Fonctionnalités**
  - Quatre chiffres : activités suivies (et % en bonne voie), **décisions attendues**, **retards à résorber** (total
    et détail : tâches et suites, recommandations, livrables, activités du plan, courrier, décisions), à signer.
  - **Par direction** : une ligne par direction (premier niveau sous l'institution) — appréciation écrite et motivée
    (sous contrôle, vigilance, alerte), projets et santé, plan réalisé face à l'attendu, retards ; un clic ouvre la
    **fiche de la direction** (services rattachés, ce qui a dépassé son échéance, charge et retards par agent, projets,
    activités du plan) et l'on descend d'un service à l'autre.
  - Santé du portefeuille, **décisions attendues** (bouton **Arbitrer**), assistant IA, agenda de la semaine, à
    suivre en priorité, indicateurs stratégiques, risques majeurs.
  - Raccourcis : Réunions, Signataire, **Nouvelle activité**.
- **Ce que la DG y saisit** : *Arbitrer* (inscrit une décision), *Nouvelle activité*. Les autres saisies sont
  ailleurs (Décisions, Courrier, Signataire, Réunions) : il n'y a pas de point de saisie rassemblé (I-31).
- **Incohérences**
  - « Décisions attendues » = phrases libres des dossiers, distinctes des arbitrages formels (I-01, I-02).
  - Santé « déclarée » (avec retard de tâches) alors que la revue de portefeuille affiche une santé « calculée »
    (I-10).
  - La fiche de direction montre la charge **nominative** des agents : niveau de détail de chef d'entité, pas de DG
    (I-32).
  - **Indicateurs stratégiques** et **risques majeurs** affichés, mais aucun écran pour les créer ou les modifier
    (I-12).

## 7. Portefeuille

- **À quoi il sert** : la **vue** de tous les dossiers que la direction pilote. Ce n'est pas un objet : on n'y range
  rien, on y compare, on y priorise, on y arbitre. Un **projet** est un dossier de travail (objectif, fin, équipe,
  tâches, livrables, budget) ; une **activité** est un dossier sans livrables (commission, conférence, rendez-vous,
  activité interne) qui a des suites à donner.
- **Où** : Pilotage › Portefeuille.
- **Qui** : `agenda.view` ou `projects.create` ; revue et arbitrages : `pilotage.view` ou `decisions.record`.
- **Onglets** : Revue de portefeuille · Arbitrages · Toutes les activités · Projets · un onglet par type d'activité
  (Commissions, Conférences, Rendez-vous, Activités internes) · Contrats et paiements (`consultants.manage`).
- **Activités** (commission, conférence, rendez-vous, interne)
  - Fiche : intitulé, responsable, entité, domaine, dates et heure, lieu, interlocuteur (partenaire), mandat,
    délégation, résultat, **décision attendue**, avancement, prochaine échéance, santé déclarée, confidentialité,
    activité du plan réalisée.
  - **Suites à donner** : chacune avec responsable et échéance, cochées une fois faites.
  - Documents, courrier lié, réunions.
- **Revue de portefeuille** (projets seulement) : santé déclarée face à santé **calculée** (calendrier, livrables,
  budget, tâches, arbitrage attendu), raisons écrites, projets **en écart** en tête.
- **Arbitrages** (projets seulement) : demandés par le chef de projet (question, contexte, options et conséquences,
  recommandation, date souhaitée) ; la DG tranche ; la décision s'inscrit au registre ; retrait possible.
- **Export** : revue de portefeuille et arbitrages (Excel, PDF, Word, CSV).
- **Ce que la DG y saisit** : Nouvelle activité, trancher un arbitrage.
- **Incohérences**
  - L'onglet « Toutes les activités » n'inclut pas les projets, alors que le portefeuille couvre projets et
    activités (I-13).
  - Revue et arbitrages ignorent les activités (I-03, I-14).
  - Pas d'export sur « Toutes les activités » et « Projets » (I-22).
  - La DG voit tous les dossiers qui lui sont ouverts, pas seulement ceux qui lui sont adressés (I-33).

## 8. Projets (le dossier projet)

- **À quoi il sert** : exécuter un projet du début à la fin.
- **Où** : Portefeuille › Projets, ou une entité, ou la recherche.
- **Qui** : membres du projet selon leur rôle (administrateur, éditeur, commentateur, lecteur) + droits du profil
  (`projects.*`, `tasks.*`, `sections.manage`…).
- **Vues** : Liste · Tableau · Calendrier · Chronologie · Livrables · Contrats · Réunions · Documents · **Tableau de
  bord** · Automatisations.
- **Fonctionnalités**
  - Sections, tâches et sous-tâches, glisser-déposer, duplication, déplacement vers un autre projet, import d'un
    projet depuis un fichier, création en masse, points d'avancement (« updates »).
  - **Gouvernance** (tableau de bord) : origine (interne / confié), commanditaire (partenaire), référence de
    convention, chef de projet, entité, domaine, budget prévu et dépensé, **décision attendue** (champ libre),
    activité du plan réalisée ; équipe et rôles ; retards et échéances proches ; **arbitrages de la DG**.
  - **Livrables** : prévu → en cours → soumis → en revue → à corriger / validé → payé ; responsable et valideur
    distincts.
  - **Contrats de consultants** : mission, montant, superviseur, évaluation.
  - Santé **déclarée** (dans les temps, à surveiller, en difficulté, terminé), échéance du projet.
- **Règles** : un valideur de livrable n'est pas son responsable ; une tâche d'un projet privé n'est visible qu'aux
  membres.
- **Incohérences**
  - « Décision attendue » modifiable à la main, même pendant un arbitrage (I-02).
  - Pas de date de début : le calendrier attendu part de la date de création (I-15).
  - Les risques ne sont pas rattachés aux projets (I-12).
  - Budget : prévu et dépensé seulement ; ni engagements ni décaissements (volet finance reporté).

## 9. Décisions (registre des décisions de la DG)

- **À quoi il sert** : le **registre officiel** des décisions de la DG — comme le registre des délibérations d'un
  conseil. Chaque décision est numérotée, figée, confiée à un chargé d'exécution avec une échéance, et suivie
  jusqu'à son exécution.
- **Où** : Pilotage › Décisions.
- **Qui** : consulter `decisions.view` ; inscrire `decisions.record` ; exécuter : le chargé d'exécution.
- **Objets et cycle de vie** : décision `DEC/AAAA/NNNN` — titre, texte figé, date, dossier rattaché (projet,
  activité ou réunion), chargé d'exécution, échéance, confidentialité héritée ; **à exécuter → en cours → exécutée**
  (sens unique) ; **remplacée** par une nouvelle décision (l'ancienne reste lisible).
- **Les quatre portes d'entrée**
  1. Directement dans le registre (« Enregistrer une décision »).
  2. Depuis le tableau de bord DG, bouton **Arbitrer** sur une décision attendue.
  3. Par un **arbitrage** tranché (Portefeuille › Arbitrages).
  4. Par la **validation d'un compte rendu** : les décisions de séance sont inscrites automatiquement.
- **Règles** : pas de décision dans le futur ; échéance après la décision ; un seul dossier rattaché ; chargé
  d'exécution = personne membre ; jamais par l'IA ; inscrire une décision rattachée à un dossier efface sa
  « décision attendue ».
- **Avis** : décision à exécuter (chargé), remplacée (ancien chargé), rappels avant échéance et en retard.
- **Export** : registre (Excel, PDF, Word, CSV).
- **Ce que la DG y saisit** : Enregistrer une décision ; Arbitrer.
- **Incohérences**
  - Quatre notions portent le mot « décision » : décision attendue, arbitrage, décision de séance, décision au
    registre (I-04).
  - « Arbitrer » depuis le tableau de bord inscrit la décision **sans clore l'arbitrage** en attente (I-01).
  - Grille non homogène (pas de « consulter puis Modifier » ni d'actions en ligne) (I-21).
  - Le DGA n'inscrit pas de décision (point ouvert, I-34).

## 10. Réunions

- **À quoi il sert** : du calendrier au compte rendu officiel, et le suivi de ce qui y a été décidé.
- **Où** : Pilotage › Réunions ; aussi dans chaque entité, projet, activité, partenaire.
- **Qui** : `meetings.view`, `meetings.manage`, `meetings.validate` ; le chef d'une entité gère les réunions de son
  entité ; chaque convoqué voit ses réunions.
- **Objets et cycle de vie** : réunion `NNNN/ANAT/…` — à venir (planifiée → convoquée) puis tenue ; compte rendu
  **brouillon → soumis → retourné / validé** (figé) ; réouverture tracée.
- **Fonctionnalités**
  - Vues : Liste (à venir, tenues) · Tableau (par étape) · Calendrier · Recommandations · Les miennes ; recherche et
    filtres.
  - Séance : date, horaire, lieu, lien de visioconférence, présidence, animation, rédaction, maître du temps,
    dossier rattaché, série récurrente (réunion hebdomadaire).
  - **Convocation** : convoqués (personnes ou entité entière), envoi, réponses (présent, excusé, représenté).
  - Ordre du jour, pièces (aperçu), présences, notes par point, **recommandations** (responsable, échéance, statut)
    et **décisions de séance**.
  - Soumettre, retourner (motif), valider ; à la validation, les décisions de séance entrent au registre.
- **Avis** : convocation, changement de date ou de lieu, annulation, compte rendu soumis, retourné, validé ;
  recommandations (échéance, retard).
- **Export** : compte rendu **Word (modèle officiel) ou PDF** ; liste sélectionnée (Excel, PDF, Word, CSV).
- **Ce que la DG y saisit** : présider, valider le compte rendu ; créer une réunion si elle a le droit.
- **Incohérences** : la carte « Convocation » reste en champs modifiables dans la fiche en lecture (I-23) ; une
  décision de séance reste « À inscrire » jusqu'à la validation, sans lien avec la décision attendue du dossier
  rattaché (I-04).

## 11. Plans de travail (suivi-évaluation)

- **À quoi il sert** : le plan annuel de chaque entité et son suivi.
- **Où** : Suivi-évaluation › Plans de travail.
- **Qui** : consulter `plans.view` ; préparer `plans.manage` ; approuver et réviser `plans.approve` ; revue
  trimestrielle : service du plan ou chef de l'entité, validée par `plans.approve`.
- **Objets et cycle de vie** : plan (une entité, une année) **en préparation → soumis → approuvé** (ou renvoyé) ;
  activité du plan (responsable, objectif, cible et réalisé chiffrés, unité, début, fin, budget prévu, engagé,
  dépensé, avancement) ; **révisions tracées** après approbation ; **revue trimestrielle** brouillon → soumise →
  retournée / validée (figée).
- **Fonctionnalités**
  - Soumission refusée si une activité n'a pas responsable, cible et date de fin.
  - L'avancement d'une activité réalisée par des projets ou activités **remonte d'eux** (il ne se saisit plus).
  - **Revue trimestrielle** : avancement constaté et attendu relevés, appréciation proposée puis corrigée, cause et
    mesure exigées pour tout retard, synthèse obligatoire.
- **Export** : liste des plans (Excel, PDF, Word, CSV).
- **Incohérences**
  - Cibles et réalisés des activités du plan d'un côté, **indicateurs stratégiques** de l'autre : aucun lien (I-12).
  - Le plan de l'institution elle-même n'apparaît dans aucune direction de la vue DG (I-16).
  - Grille non homogène (I-21).

## 12. Partenaires

- **À quoi il sert** : l'annuaire unique des tiers (ministères, collectivités, bailleurs, entreprises, ONG…).
- **Où** : Partenariats › Partenaires.
- **Qui** : `partners.view`, `partners.manage` ; points focaux.
- **Objets et cycle de vie** : partenaire **identifié → en discussion → actif → suspendu / clos** (motif obligatoire).
- **Fonctionnalités** : fiche, contacts (un principal ; archivés plutôt que supprimés), accords, documents typés,
  dossiers liés, réunions, courrier, historique des échanges (non modifiable) ; doublons refusés, **fusion** ;
  **rapprochement** des noms saisis librement.
- **Incohérences** : pas d'export de l'annuaire (I-22).

## 13. Conventions (accords)

- **À quoi il sert** : le registre des actes conclus avec les partenaires et de leurs avenants.
- **Où** : Partenariats › Conventions.
- **Objets et cycle de vie** : accord **en préparation → au signataire → en vigueur (CONV/AAAA/NNNN) → échu /
  résilié** ; avenants numérotés.
- **Fonctionnalités** : parties (multipartite, chef de file), dates, reconduction tacite, préavis, point focal,
  documents (exemplaire signé), alertes à 90, 30, 7 jours ; soumettre au signataire ou déclarer en vigueur ;
  avenant ; résiliation motivée.
- **Incohérences** : volet finance (engagements, décaissements, obligations de rapport) absent — reporté ; pas
  d'export du registre (I-22).

## 14. Signataire

- **À quoi il sert** : le circuit de visa et de signature.
- **Où** : Secrétariat › Signataire.
- **Qui** : `signature.use`.
- **Objets et cycle de vie** : document avec circuit (visas puis signature) **préparé → en circuit → signé /
  rejeté** ; délégations de signature datées.
- **Fonctionnalités** : à viser ou signer, mes envois, suivi ; chaque signataire prévenu à son tour ; approuver ou
  rejeter avec commentaire ; document figé pendant le circuit ; la signature alimente le dossier d'origine (accord
  en vigueur, courrier sortant).
- **Ce que la DG y saisit** : viser, signer, rejeter ; déléguer sa signature.
- **Incohérences** : grille non homogène (I-21) ; pas d'export (I-22) ; signature électronique qualifiée absente.

## 15. Courrier

- **À quoi il sert** : le circuit du courrier, du bureau d'ordre à la réponse.
- **Où** : Secrétariat › Courrier.
- **Qui** : enregistrer et imputer `correspondence.manage` ; registre `correspondence.view` ; chacun voit le courrier
  qui le concerne (« Mon courrier »).
- **Objets et cycle de vie** : courrier entrant `ENT/AAAA/NNNN` ou sortant `SOR/AAAA/NNNN` — **enregistré → imputé →
  en traitement → traité / classé sans suite** (motif).
- **Fonctionnalités** : enregistrement (expéditeur de l'annuaire, pièce numérisée) ; **imputation** par la direction
  (entité, agent, instruction, délai, annotation, copies pour information ou avis) puis **en cascade** par le chef
  d'entité ; prise en charge ; annotations ; réponse par le signataire ; clôture ; fil du courrier ; tableau de bord
  (à imputer, en cours, en retard, traités ce mois, à moi).
- **Avis** : imputation, copie, annotation, délai proche ou dépassé (puis le chef).
- **Export** : registre (Excel, PDF, Word, CSV).
- **Ce que la DG y saisit** : imputer, annoter ; enregistrer si elle a le droit. En pratique, son assistant.

## 16. Structure (organisation)

- **Où** : Organisation › Structure.
- **Onglets** : Organigramme · Attributions · Écarts de participation · Personnes · Profils et droits · Référentiel
  des domaines. (La messagerie est réglée dans Administration système.)
- **Fonctionnalités** : entités et chefs ; **fiches d'attributions** des entités (rédigées, approuvées) ; **écarts
  de participation** (une entité absente des dossiers de son domaine) ; personnes, invitations, profils et droits
  individuels ; domaines d'activité.
- **Incohérences** : grille non homogène (I-21) ; pas d'intérim d'un chef d'entité.

## 17. Équipes

- **À quoi il sert** : des groupes de travail transverses (au-delà de l'organigramme).
- **Fonctionnalités** : créer, rejoindre (publique) ou demander (privée), responsable d'équipe, projets d'équipe.
- **Incohérences** : recouvrement avec les entités et les projets à clarifier : une équipe n'a ni plan ni tableau de
  bord (I-17).

## 18. Ressources humaines

- **Où** : Organisation › Ressources humaines.
- **Qui** : `hr.view`, `hr.manage` ; le chef d'entité lit les dossiers de ses agents.
- **Fonctionnalités** : registre des agents, **créer un agent ouvre son compte** (lien, profil Agent / Stagiaire /
  Consultant selon le statut), matricule automatique, fiche (consulter puis Modifier), historique des affectations,
  diplômes, personnes à prévenir, onglet « À identifier ».
- **Export** : registre des agents (Excel, PDF, Word, CSV).
- **Congés et absences** : rapatriés au lot 8 (18/11/2026) ; fins de contrat et retraites alertées à 90 et 30 jours (I-35).

## 19. Administration système

- **Qui** : administrateur de la plateforme.
- **Onglets** : État du système · Paramètres de l'institution · Messagerie · Comptes · Sessions · Rôles et droits ·
  Inscriptions · Journal d'audit.
- **Domaine principal** (Paramètres de l'institution) : le domaine de l'institution (ex. agence.gouv.cd), saisi à
  l'écran et jamais dans le code ; il propose les adresses des agents (prénom.nom@domaine) et le point de départ de la
  messagerie. Contrôlé (format) et journalisé.
- **Messagerie** : domaine des adresses, nom d'expéditeur, **adresse des notifications** (ex. noreply@domaine, du même
  domaine ; les réponses vont à l'équipe ou à l'entité concernée), serveur SMTP (proposé : mail.domaine), sécurité
  SSL/TLS (port 465) ou STARTTLS (port 587), identifiants chiffrés ; adresses de service par entité et par équipe ;
  envoi de test ; derniers envois.
- **Fonctionnalités** : alertes (droits élevés sans double authentification, messagerie absente…), bandeau
  d'information, comptes (créer avec lien de finalisation, renvoyer, réinitialiser, suspendre), sessions (fermer),
  matrice des rôles, journal d'audit (filtres, gravité, journal par personne, analyse IA).
- **Export** : comptes et journal (Excel, PDF, Word, CSV), tracés en événements de sécurité.

## 20. Fonctions transverses

- **Notifications** : boîte de réception par domaine (tâches, réunions, courrier, décisions, signataire, projets,
  partenariats, équipe, IA, autres), préférences de courriel par domaine, rappels d'échéance.
- **Documents** : typés, aperçu partout, téléchargements des pièces sensibles tracés, pièces officielles non
  supprimables.
- **Recherche** (Ctrl/⌘ K) : réunions, dossiers, personnes, tâches.
- **Export** : bouton « Exporter » → choix du format (Word, PDF ; Excel, CSV pour les tableaux), charte de l'agence,
  tracé.
- **Mise en page** : toutes les pages au même gabarit (celui de Réunions).

---

## 21. Synthèse des incohérences et points à trancher

> **État au 12 novembre 2026 (branche `lot-corrections`)** : corrigés — I-01, I-02, I-03, I-10, I-11, I-12, I-13, I-16,
> I-20, I-22 (portefeuille, partenaires, conventions, risques ; reste Signataire et Mon entité), I-23, I-30, I-31, I-32,
> I-36. Restent ouverts : I-04 (lien décision de séance / décision attendue), I-14, I-15, I-17, I-21, I-33, I-34, I-35.
> Le guide Word `docs/word/ANAT-Pilotage-guide-module-par-module.docx` décrit le fonctionnement corrigé avec des scénarios.

Gravité : **A** = fausse l'information ou la décision · **B** = parcours incohérent · **C** = finition.

| N° | Module | Constat | Gravité | Piste |
| --- | --- | --- | --- | --- |
| I-01 | Décisions / Arbitrages | « Arbitrer » depuis le tableau de bord inscrit une décision sans clore l'arbitrage en attente : il reste « en attente » et la revue affiche toujours « arbitrage attendu ». | A | Une seule porte : le bouton tranche l'arbitrage s'il existe. |
| I-02 | Projets / Activités | « Décision attendue » est un champ libre modifiable à la main, même pendant un arbitrage. | A | La décision attendue devient le reflet de l'arbitrage en cours. |
| I-03 | Activités | Les activités ont une décision attendue libre mais pas de circuit d'arbitrage. | B | Étendre l'arbitrage aux activités. |
| I-04 | Décisions | Quatre notions sous le mot « décision » (attendue, arbitrage, de séance, au registre) ; une décision de séance n'éteint pas la décision attendue du dossier. | B | Vocabulaire unique et liens entre ces notions. |
| I-10 | Pilotage / Portefeuille | Trois mesures de santé : déclarée (+ retard de tâches) au tableau de bord DG et dans la vue par direction, calculée dans la revue de portefeuille. Un projet peut être « dans les temps » ici et « en difficulté » là. | A | La santé calculée devient la référence partout, la déclarée affichée à côté. |
| I-11 | Pilotage / Entités | Les retards ne sont pas comptés pareil : tableau de bord DG (tâches principales des projets accessibles + autres natures), vue par direction (toutes les tâches des agents), Mon entité (son propre compte). | A | Une seule définition du retard, partagée. |
| I-12 | Pilotage / Plans / Projets | Indicateurs stratégiques et risques majeurs affichés sans écran de saisie ; risques non rattachés aux projets ; indicateurs sans lien avec les cibles du plan. | A | Écrans risques et indicateurs ; risque rattaché au projet ; indicateur relié au plan. |
| I-13 | Portefeuille | « Toutes les activités » n'inclut pas les projets. | B | « Tous les dossiers », projets et activités ensemble. |
| I-14 | Portefeuille | La revue de portefeuille ignore les activités (santé seulement déclarée). | B | Étendre la revue aux activités. |
| I-15 | Projets | Pas de date de début : l'attendu part de la date de création. | B | Ajouter la date de début du projet. |
| I-16 | Plans / Pilotage | Le plan de l'institution n'apparaît dans aucune direction. | C | Une ligne « Institution » dans la vue par direction. |
| I-17 | Équipes | Recouvrement équipe / entité / projet non expliqué. | C | Préciser le rôle des équipes ou les fondre. |
| I-20 | Tâches | La répétition ne se choisit pas à la création. | C | Champ « Répétition » dans les formulaires de création. |
| I-21 | Décisions, Signataire, Plans, Structure | Grilles sans « consulter puis Modifier » ni actions en ligne. | B | Grilles homogènes. |
| I-22 | Transverse | Export absent de : Toutes les activités, Projets, Partenaires, Conventions, Signataire, Mon entité. Mise en page PDF non vérifiée à l'œil. | C | Bouton Exporter partout ; relecture d'un PDF. |
| I-23 | Réunions | Carte « Convocation » en champs modifiables dans la fiche en lecture. | C | Lecture d'abord, « Modifier » ensuite. |
| I-30 | Profils | Pas de profil « Assistant(e) de la DG » ; une saisie faite pour la DG n'est pas marquée « pour le compte de la DG ». | A | Profil Assistant ; saisie « pour le compte de ». |
| I-31 | Accueil / Tableau de bord DG | Les saisies de la DG sont dispersées (Décisions, Courrier, Signataire, Réunions, Portefeuille) ; son accueil est celui de tout le monde. | B | Un bloc « Saisir » simple sur l'accueil et le tableau de bord DG (décision, courrier, activité, réunion, arbitrage). |
| I-32 | Tableau de bord DG | La fiche de direction affiche la charge nominative de chaque agent : niveau chef d'entité. | B | Synthèse seulement pour la DG ; détail par agent pour le chef. |
| I-33 | Portefeuille / Pilotage | La DG voit tout ce qui lui est ouvert, pas seulement ce qui lui est adressé ; elle voit aussi des tâches internes. | A | Notion de « dossier suivi par la DG » (transmis ou stratégique) ; tâches internes hors de sa vue. |
| I-34 | Profils | DGA : inscrit-il des décisions par délégation ? Responsable informatique administrateur de droit ? Stagiaires et portefeuille ? | — | Décisions à prendre. |
| I-35 | RH | Congés et absences, fins de contrat. | — | **Fait** au lot 8 (migration 055). |
| I-36 | Démonstration | Personnes fictives aux profils génériques ; le chef de cellule Ingénierie territoriale est administrateur et voit tout, ce qui fausse l'essai des vues par rôle. | C | Donner à chaque personne fictive un profil institutionnel. |

### Ordre de correction proposé
1. **I-01, I-02, I-03, I-04** — une seule porte pour les décisions : l'arbitrage, étendu aux activités.
2. **I-30, I-31, I-32, I-33** — la DG voit ce qui lui est adressé ; un bloc « Saisir » simple ; un profil Assistant.
3. **I-10, I-11** — une seule santé, une seule définition du retard.
4. **I-12** — risques et indicateurs saisissables et reliés.
5. **I-13 à I-17, I-20 à I-23, I-36** — cohérence d'ensemble et finitions.
