# Analyse module par module

Revue d'ANAT Pilotage menée module par module, dans l'ordre du menu, en jouant la démonstration
avec les six comptes fictifs. Aucune modification de code pendant l'analyse : chaque remarque est
enregistrée ici, puis traitée dans un lot d'amélioration.

Les personnes et les entités citées sont celles de la démonstration (données fictives).

## Comptes utilisés

| Personne | Profil | Fonction dans la démo |
|---|---|---|
| Bernadette Mbuyi | Propriétaire | Directrice générale |
| Esther Mukendi | Assistant(e) de direction | Assistante de direction |
| Fiston Banza | Chef d'entité | Chef du département Ingénierie territoriale |
| Didier Lukusa | Chef d'entité | Directeur de la Communication et des Partenariats |
| Clarisse Diala | Agent | Chargée d'études |
| Gaston Kalala | Agent | Chef du service Suivi-évaluation |

## Avancement

| # | Module | Analyse | Améliorations |
|---|---|---|---|
| 1 | Accueil | Faite | À faire |
| 2 | Mes tâches | Faite | À faire |
| 3 | Mon entité | Faite | À faire |
| 4 | Mon dossier | Faite | À faire |
| 5 | Coéquipiers IA | Faite | À faire |
| 6 | Tableau de bord DG | Faite | À faire |
| 7 | Portefeuille | Faite | À faire |
| 8 | Décisions | Faite | À faire |
| 9 | Réunions | Faite | À faire |
| 10 | Risques et indicateurs | Faite | À faire |
| 11 | Plans de travail | Faite | À faire |
| 12 | Partenaires | Faite | À faire |
| 13 | Conventions | Faite | À faire |
| 14 | Parapheur | Faite | À faire |
| 15 | Courrier | Faite | À faire |
| 16 | Structure | Faite | À faire |
| 17 | Équipes | Faite | À faire |
| 18 | Ressources humaines | Faite | À faire |
| 19 | Administration système | Faite | À faire |

---

## 1. Accueil

### Rôle

Première page après la connexion, la même pour tout le monde. Son contenu change selon les droits.

**Colonne principale :**

| Bloc | Contenu | Qui le voit |
|---|---|---|
| En-tête | Date, « Bonjour, Prénom », tâches ouvertes, en retard, terminées cette semaine | Tout le monde |
| Saisir | Inscrire une décision, trancher un arbitrage, enregistrer un courrier, programmer une réunion, nouvelle activité, viser ou signer | Chaque bouton selon le droit correspondant |
| Ce qui vous attend | Courrier à imputer (ou « Mon courrier »), documents à viser, retards de « votre entité », décisions à exécuter | Selon le profil et les données |
| Mes tâches | Onglets À venir, En retard, Terminées (9 tâches au plus) | Tout le monde |
| Projets | Projets dont on est membre : avancement, santé, retards ; « Archivés », « Nouveau projet » | Tout le monde |

**Colonne de droite :** Mes prochaines réunions, Assistant IA, validations IA en attente,
Activité des coéquipiers IA.

### Ce que chacun voit

| Personne | Saisir | Ce qui vous attend | Tâches |
|---|---|---|---|
| Bernadette (DG) | Les 6 boutons | Courrier à imputer 2 · À signer 1 · Votre entité : ANAT, 5 retards | 1 ouverte |
| Esther (assistante) | 5 boutons | Courrier à imputer 2 · Votre entité : Ressources humaines | 3 |
| Fiston (chef d'entité) | Viser ou signer seulement | Mon courrier 1 (en retard) · À signer 1 · Ingénierie territoriale 3 retards · Décisions à exécuter 2 | 8, dont 2 sous-tâches |
| Didier (chef d'entité) | Viser ou signer seulement | Votre entité : 0 retard | 6, 1 en retard |
| Gaston (Agent) | Viser ou signer seulement | Votre entité : Suivi-évaluation, 2 retards | 7, 3 en retard |
| Clarisse (Agent) | Viser ou signer seulement | Votre entité : Études et Prospective | 7, dont 2 sous-tâches |

### Cas d'usage

- **La DG ouvre l'outil le lundi matin.** Elle voit ses alertes : 2 courriers à imputer, 1 document
  à signer, 5 retards dans l'Agence. Le reste de la page est celui d'un collaborateur : une tâche
  personnelle, six projets dont « Campagne de lancement » et « Application mobile v2 ». Ce qui
  l'intéresse (décisions en retard, arbitrages, santé des directions) est sur le Tableau de bord DG.
- **L'assistante arrive.** Les 2 courriers à imputer et les raccourcis de saisie conviennent.
  Mais une carte « Votre entité : Ressources humaines » s'affiche, car elle est encore cheffe des RH.
- **Un agent, Gaston, arrive.** Ses 3 tâches en retard sont utiles. Mais il voit un bloc « Saisir »
  réduit à « Viser ou signer », et une carte « Votre entité » car la démo le fait chef d'un service
  alors que son profil est Agent.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| A-1 | L'Accueil de la DG est une page de collaborateur (mes tâches, mes projets, IA). Sa page de travail, le Tableau de bord DG, est ailleurs. | Haute | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : pas de redirection automatique ; l'Accueil de qui a le droit de pilotage mène d'abord au tableau de bord DG |
| A-2 | Les retards de l'Accueil comptent les sous-tâches, contrairement à la règle du lot 3 (« un retard = une tâche principale échue ») appliquée par le Tableau de bord DG et la vue par direction. Les chiffres diffèrent d'une page à l'autre. | Haute | **Fait** (lot 6) : l'Accueil compte les retards comme le tableau de bord (tâches principales) ; les sous-tâches échues restent listées sans être comptées |
| A-3 | Profil et responsabilité se contredisent : Gaston et Clarisse (Agent) dirigent une entité, Esther (assistante) reste cheffe des RH, Fiston dirige aussi l'Antenne Sud et la Représentation Nord. L'outil ne contrôle pas cet écart. | Haute | Décidé le 17/11/2026 : on refuse la nomination (lot 3) ; démo corrigée (lot 1) |
| A-4 | La DG apparaît comme « Propriétaire » dans l'en-tête, pas comme « DG ». | Moyenne | **Fait** (lot 1) : la DG a le profil « DG » et s'affiche comme telle |
| A-5 | « Viser ou signer » figure deux fois (Saisir et Ce qui vous attend). Pour un agent, le bloc Saisir se réduit à ce seul bouton. | Moyenne | **Fait** (lot 11) : l'Accueil n'affiche plus « Viser ou signer » dans « Saisir » : le parapheur reste dans « Ce qui vous attend » |
| A-6 | « Nouveau projet » s'affiche pour tout le monde sans vérifier le droit de créer un projet ; un stagiaire ou un consultant reçoit un refus en cliquant. | Moyenne | **Fait** (lot 3) : « Nouveau projet » ne s'affiche qu'à qui a le droit de créer un projet |
| A-7 | Projets et tâches de démo issus d'une start-up (« Campagne de lancement », « Application mobile v2 », « Refonte du site web », « Tests de non-régression iOS »). | Moyenne (démo) | **Fait** (lot 1) : projets et tâches d'une agence d'aménagement (SIG national, schéma national, site institutionnel, archives cartographiques) |
| A-8 | Trois réunions s'appellent seulement « Réunion » dans « Mes prochaines réunions ». | Moyenne (démo) | **Fait** (lot 1) : chaque réunion porte le nom de son type (Comité de direction, Comité de pilotage, Réunion avec les provinces) |
| A-9 | Le bloc IA prend beaucoup de place (Assistant IA, Activité des coéquipiers IA vide, « Assignez une tâche à Atlas »). | Basse | **Fait** (lot 12) : l'activité des coéquipiers IA n'apparaît sur l'Accueil que s'il y en a une ; le bloc Assistant est resserré |
| A-10 | Vers 800 px de large, libellés coupés (« Inscrire une dé… ») et cartes de projets écrasées. Correct à 1440 px. | Basse | **Fait** (lot 12) : les libellés de « Saisir » passent à la ligne au lieu d'être coupés vers 800 px |
| A-11 | Constat initial : le résumé du courrier renverrait les chiffres de toute l'organisation à tout le monde. **Infirmé à l'analyse du module Courrier** : les chiffres suivent les droits de chacun (un agent sans droit sur le courrier reçoit 0 ; un chef qui consulte le registre reçoit les chiffres du registre, qu'il a le droit de voir). | Sans objet | Aucune suite |

### Ce qui fonctionne bien

- Les raccourcis « Saisir » suivent les droits et ouvrent directement le bon formulaire.
- Les alertes de « Ce qui vous attend » sont justes.
- Les réunions signalent les convocations à confirmer et le rôle de la personne
  (« Vous présidez », « Vous rédigez »).

### Décisions ouvertes

- A-1 : la DG arrive-t-elle sur le Tableau de bord DG plutôt que sur l'Accueil ?
- A-3 : un Agent peut-il diriger une entité, ou l'outil doit-il l'empêcher ?

---

## 2. Mes tâches

### Rôle

La liste de travail personnelle : tout ce qui est assigné à la personne, dans les projets et dans le
registre de son entité. La page compte trois parties :

| Bloc | Contenu |
|---|---|
| En-tête | Bouton « Tâche hors projet » (si la personne a une entité), case « Afficher les terminées » |
| Livrables | « À valider » (livrables soumis dont on est valideur) et « À produire » (livrables dont on est responsable, non encore remis) |
| Tâches | Groupées par échéance : En retard, Aujourd'hui, Cette semaine, Plus tard, Sans échéance. Chaque groupe se replie. Cocher une tâche la termine. |

Une tâche du registre d'entité s'affiche avec l'étiquette « Tâche d'entité » à la place du nom du projet.

### Ce que chacun voit

| Personne | Livrables | Tâches ouvertes | Remarque |
|---|---|---|---|
| Bernadette (DG) | Aucun à valider (la note d'orientation n'est pas encore remise) | 1 : « Grille de rémunération 2027 » | Une seule tâche, de RH |
| Esther (assistante) | — | 3, dont 2 de start-up (« Instrumentation analytics du tunnel de paiement », « Tableau de suivi des conversions ») | |
| Fiston (chef d'entité) | À produire : « Note d'orientation stratégique » (Schéma national d'aménagement) | 8 : 1 en retard, 3 cette semaine, 2 plus tard, 2 sans échéance | Les 2 sans échéance sont les sous-tâches « Apple Pay » et « Google Pay » |
| Didier (chef d'entité) | À produire : « Rapport intermédiaire », en retard depuis le 15/11 | 6, dont 1 en retard | Le rapport en retard n'apparaît pas dans « En retard » |
| Clarisse (Agent) | — | 7, dont 2 sous-tâches | Toutes issues de projets de start-up |
| Gaston (Agent) | — | 7, dont 3 en retard | 5 tâches d'entité (Suivi-évaluation), 2 de projet |

### Cas d'usage

- **Fiston ouvre sa liste le lundi.** Il voit d'abord son livrable à produire, puis « Intégrer le SDK
  de paiement » en retard. Trois tâches portent l'étiquette « Tâche d'entité » sans dire de quelle
  entité : il en dirige cinq (Ingénierie territoriale, Antenne Sud, Représentation Nord, Cartographie
  et SIG, Suivi-évaluation). En bas, « Apple Pay » et « Google Pay » apparaissent seules, sans
  rappeler qu'elles sont des sous-tâches de « Intégrer le SDK de paiement ».
- **La DG confie une tâche à son assistante, échéance au 17/11.** Test réel sur la démo, puis tâche
  supprimée. Connectée comme Esther, l'assistante a pu :
  - repousser l'échéance au 31/03/2027 : accepté ;
  - changer l'intitulé : accepté ;
  - baisser la priorité : accepté ;
  - se retirer la tâche ou la passer à quelqu'un d'autre : refusé, à juste titre ;
  - la supprimer : refusé, à juste titre ;
  - la marquer terminée : accepté, et la DG a reçu « Esther Mukendi a terminé « Titre changé par
    l'agent » ».

  La DG n'a reçu aucune notification pour le report d'échéance ni pour le changement d'intitulé. Elle
  découvre la tâche terminée sous un autre nom.
- **La DG clique sur « Tâche hors projet » depuis Mes tâches.** La fenêtre s'intitule « Confier une
  tâche » et vise l'entité racine « ANAT (démonstration) ». Le champ « Confiée à » vaut par défaut
  « Non attribuée pour l'instant » : une tâche enregistrée ainsi n'apparaît pas dans Mes tâches. La
  liste propose « Fiston Banza — Cartographie et SIG » alors que Fiston dirige l'Ingénierie
  territoriale.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| T-1 | Un agent peut repousser l'échéance, changer l'intitulé et la priorité d'une tâche que son responsable lui a confiée. Le retard disparaît des tableaux sans que le responsable le sache. | Haute | **Fait** (lot 4) : l'intitulé, l'échéance et la priorité d'une tâche confiée restent à qui l'a confiée ; le chargé demande un report, accepté ou refusé |
| T-2 | Aucune notification ni trace visible pour le responsable quand l'agent modifie une tâche confiée (seule la fin de la tâche est notifiée). | Haute | **Fait** (lot 4) : le responsable est prévenu de ce que d'autres changent sur une tâche qu'il a confiée |
| T-3 | Une tâche confiée se termine d'un clic, sans validation du responsable. Pour un travail qui produit un document, l'agent déclare « fait » et la tâche sort des retards. | Moyenne | **Fait** (lot 4) : le chargé déclare la tâche réalisée ; le responsable confirme la clôture ou la renvoie avec un motif |
| T-4 | « Tâche d'entité » ne dit pas de quelle entité. Pour un chef qui en dirige plusieurs, les tâches ne se distinguent pas. | Moyenne | **Fait** (lot 11) : une tâche hors projet porte le nom de son entité |
| T-5 | Les sous-tâches apparaissent seules (« Apple Pay ») sans le nom de la tâche parente. | Moyenne | **Fait** (lot 11) : une sous-tâche s'affiche « Tâche parente › sous-tâche » |
| T-6 | Un livrable en retard (Didier, « Rapport intermédiaire ») reste dans « Livrables » avec une date rouge. Il n'est ni dans « En retard » ni dans le compteur de retards. | Moyenne | **Fait** (lot 11) : les livrables en retard se rangent en tête, en rouge, et comptent avec les retards de Mes tâches |
| T-7 | Le valideur ne voit pas un livrable en retard qu'il devra valider (Fiston ne voit pas le rapport de Didier tant qu'il n'est pas remis). | Basse | **Fait** (lot 12) : « Attendus de vos équipes » : le valideur voit les livrables à venir avant leur remise, retards en tête |
| T-8 | « Tâche hors projet » ouvre « Confier une tâche » avec « Non attribuée » par défaut. Depuis Mes tâches, on veut une tâche pour soi : elle n'apparaît pas dans la liste après création. | Moyenne | **Fait** (lot 11) : depuis Mes tâches, « Tâche hors projet » est attribuée par défaut à la personne |
| T-9 | Pour la DG, « Tâche hors projet » vise l'entité racine « ANAT », pas la Direction générale. | Moyenne | **Fait** (lot 11) : la tâche hors projet vise l'entité de rattachement de la personne (la Direction générale pour la DG) |
| T-10 | Données de démo : Fiston est rattaché à Cartographie et SIG alors qu'il dirige l'Ingénierie territoriale. Même famille que A-3. | Moyenne (démo) | **Fait** (lot 1) : Fiston est rattaché à l'Ingénierie territoriale, qu'il dirige |
| T-11 | Pas de recherche, de filtre par projet ou entité, ni de tri autre que par échéance. Pas d'export. | Basse | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : recherche et filtre par projet ou entité dans Mes tâches ; l'export reste à faire |
| T-12 | Un responsable ne voit pas ici les tâches qu'il a confiées aux autres (« confiées par moi »). Vérifié au module 3 : « Suivi des agents » montre les tâches des agents de l'entité et des entités rattachées, mais pas une tâche confiée à une personne hors de cet arbre. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : « Tâches que j'ai confiées » dans Mes tâches : chargé, lieu, échéance, retard, report demandé, déclaration à valider |
| T-13 | Tâches de démo de start-up (paiement, Apple Pay, tunnel de conversion, stores). Même famille que A-7. | Moyenne (démo) | **Fait** (lot 1) : tâches de l'Agence (couches foncières, relevés de terrain, formation des agents provinciaux) |

### Ce qui fonctionne bien

- Le regroupement par échéance est clair, avec le nombre de tâches dans chaque groupe.
- Les livrables à produire ou à valider sont en tête de page, avec leur projet, leur date et leur état.
- Un agent ne peut ni se retirer une tâche confiée, ni la passer à un collègue, ni la supprimer.
- Le responsable est prévenu quand une tâche qu'il a confiée est terminée.
- Une tâche née d'une recommandation de réunion, une fois terminée, soumet la recommandation au
  rédacteur.

### Décisions prises (16/11/2026)

- **T-1** : sur une tâche confiée, l'agent ne modifie plus l'échéance, l'intitulé ni la priorité. Il
  demande un report en indiquant la nouvelle date et le motif ; le responsable accepte ou refuse.
- **T-2** : la demande de report et la réponse sont notifiées et inscrites dans l'historique de la
  tâche.
- **T-3** : l'agent déclare la tâche réalisée ; le responsable confirme la clôture ou la renvoie avec
  un commentaire. Tant qu'elle n'est pas confirmée, la tâche reste suivie (« réalisée, à confirmer »).
- **T-7** : le valideur voit, dans Mes tâches, les livrables attendus de ses équipes avant leur remise,
  avec leur échéance et leur retard éventuel.

---

## 3. Mon entité

### Rôle

L'espace de travail d'une entité (direction, département, service, antenne). Le menu ne l'affiche que
si la personne est rattachée à une entité ou en dirige une. Une liste déroulante permet de passer
d'une entité à l'autre quand on en a plusieurs.

| Élément | Contenu | Qui |
|---|---|---|
| Boutons | « Réunion » (programmer une réunion de l'entité), « Projet » (projet porté par l'entité), « Confier une tâche » (responsable) ou « Tâche » (agent, pour lui-même) | Réunion : responsable ; les autres : tout le monde |
| Vue d'ensemble | Tâches ouvertes, en retard, sous 7 jours, terminées sur 30 jours, taux d'achèvement ; réunions de l'entité et réunions où l'on est attendu ; activité sur 8 semaines ; échéances ; charge des agents ; priorités ; listes « En retard » et « Cette semaine » ; projets de l'entité | Tout le monde, périmètre réduit pour un agent |
| Liste, Tableau, Calendrier, Chronologie | Le registre des tâches de l'entité (tâches hors projet), en colonnes À faire, En cours, Terminé | Tout le monde |
| Projets | Projets de l'entité, avec avancement | Tout le monde |
| Réunions | Réunions de l'entité (liste, tableau, calendrier) | Tout le monde |
| Suivi des agents | Par agent : ouvertes, en retard, sous 7 jours, terminées ; puis la liste des tâches, filtrable | Responsable seulement |

Le périmètre du responsable couvre son entité et toutes les entités rattachées en dessous. Un
propriétaire ou administrateur de l'organisation est responsable de toutes les entités.

### Ce que chacun voit (entité ouverte par défaut)

| Personne | Entité par défaut | Ouvertes | Retards | Agents suivis | Projets de l'entité |
|---|---|---|---|---|---|
| Bernadette (DG) | ANAT (démonstration) parmi 12 | 27 | 5 | 5 | 5, dont 3 de start-up |
| Esther (assistante) | **Ressources humaines** (responsable), pas la Direction générale où elle travaille | 0 | 0 | 0 | 3, dont « Campagne de lancement » et « Application mobile v2 » |
| Fiston (chef d'entité) | Ingénierie territoriale parmi 5 | 12, dont 2 non attribuées | 3 | **1** (Gaston) | 3 : Plateforme de tests automatisés, Schéma national d'aménagement, Refonte du site web |
| Didier (chef d'entité) | Direction de la Communication et des Partenariats | **0** | 0 | **0** | 4, dont 3 de start-up |
| Clarisse (Agent) | Études et Prospective (responsable) | 0 | 0 | 0 | 3, toutes de start-up |
| Gaston (Agent) | Suivi-évaluation (responsable) | 5 | 2 | 0 | 0 |

### Cas d'usage

- **Fiston prépare sa réunion de département du lundi.** Il ouvre l'Ingénierie territoriale : 12
  tâches ouvertes, 3 en retard, un taux d'achèvement de 29 %. Les 3 retards sont tous de Gaston, qui
  dirige lui-même le service Suivi-évaluation. Fiston n'a qu'un « agent » à suivre ; ses propres 6
  tâches de projet ne figurent pas dans la charge de l'entité, alors que ses 3 tâches d'entité sont
  comptées dans les chiffres.
- **Fiston regarde les projets de son département.** Il y trouve « Refonte du site web », portée par
  Clarisse (Études et Prospective), et le « Schéma national d'aménagement », porté par la DG. Un projet
  est compté dans l'entité dès que le responsable ou un agent en est membre, même s'il ne le porte pas.
- **Didier ouvre sa direction.** Tout est à 0, et « Aucun agent ». Ses 6 tâches, dont une en retard,
  n'apparaissent pas : le responsable est exclu de son propre suivi. La DG, elle, voit bien Didier
  avec 6 tâches ouvertes et 1 retard.
- **Esther ouvre Mon entité.** Elle tombe sur les Ressources humaines, entité vide, au lieu de la
  Direction générale où elle travaille. Elle doit changer d'entité dans la liste.
- **Réunions.** Pour Fiston, la « Réunion hebdomadaire de l'Ingénierie territoriale » qu'il préside
  apparaît deux fois (réunions de l'entité, et réunions où il est attendu), marquée « Pas encore
  convoquée ». Trois autres réunions s'appellent seulement « Réunion » (même constat que A-8).

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| E-1 | Le responsable est exclu de la charge et du suivi de son entité. Ses tâches de projet ne comptent pas, ses tâches d'entité comptent : le périmètre des chiffres est incohérent. Un directeur seul dans sa direction voit « 0 » alors qu'il a un retard. | Haute | **Fait** (lot 10) : le responsable compte dans les chiffres et la charge de son entité, en tête, avec la mention « Responsable » |
| E-2 | Les projets « de l'entité » incluent tout projet dont le responsable ou un agent est simple membre (Refonte du site web chez l'Ingénierie territoriale, Schéma national chez plusieurs entités). Les mêmes projets se retrouvent comptés dans plusieurs entités. | Haute | **Fait** (lot 10) : projets portés par l'entité et projets auxquels elle contribue, distingués et comptés à part |
| E-3 | Le chef d'une entité rattachée apparaît comme simple « agent » dans le suivi de l'entité du dessus (Gaston, chef du Suivi-évaluation, dans le suivi de Fiston). | Moyenne | **Fait** (lot 11) : le chef d'une entité rattachée est présenté « Responsable · entité », après le responsable et avant les agents |
| E-4 | L'entité ouverte par défaut est la première entité dirigée, pas l'entité de rattachement (Esther arrive aux RH, la DG à la racine « ANAT » et non à la Direction générale). | Moyenne | **Fait** (lot 11) : Mon entité s'ouvre sur l'entité de rattachement, même quand la personne en dirige d'autres |
| E-5 | Une réunion de l'entité que l'on préside apparaît deux fois dans la vue d'ensemble. | Basse | **Fait** (lot 12) : une réunion déjà listée pour l'entité ne se répète plus dans « Où vous êtes attendu·e » |
| E-6 | La réunion hebdomadaire présidée par Fiston, dans 7 jours, est « Pas encore convoquée », sans rappel visible. | Basse | **Fait** (lot 12) : le rappel « réunion à convoquer » prévient aussi la présidence, même sans rédacteur désigné |
| E-7 | Le bouton « Projet » s'affiche pour tout le monde ; le serveur refuse ensuite si le profil n'a pas le droit de créer un projet. Même famille que A-6. | Moyenne | **Fait** (lot 3) : le bouton n'apparaît qu'avec le droit de créer un projet |
| E-8 | Pas de vue « tâches que j'ai confiées » (voir T-12) : une tâche confiée hors de l'arbre de l'entité n'est suivie nulle part par celui qui l'a confiée. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : voir T-12 : une tâche confiée hors de l'arbre de l'entité est suivie par qui l'a confiée |
| E-9 | Données de démo : départements vides ou presque (Fiston n'a qu'un agent, Didier et Clarisse aucun), Esther cheffe des RH, projets de start-up. Même famille que A-3 et A-7. | Haute (démo) | **Fait en partie** (lots 1 et 9) : un chef distinct par entité, des agents dans les services, projets de l'Agence ; certaines entités restent peu peuplées |
| E-10 | Vers 800 px de large, les onglets débordent (« Suivi des agents » coupé) et défilent horizontalement. | Basse | **Fait** (lot 12) : les onglets passent à la ligne dès la tablette ; ils ne défilent que sur téléphone |

### Ce qui fonctionne bien

- Un vrai tableau de bord par entité : chiffres, échéances, priorités, activité, charge, retards.
- Le responsable voit toutes les entités rattachées et passe de l'une à l'autre.
- Le suivi des agents permet de filtrer par agent et par état (ouvertes, en retard, terminées).
- Les tâches hors projet ont un registre par entité, avec les mêmes vues qu'un projet.
- La réunion de l'entité convoque d'office tous ses membres.
- Un agent ne peut confier une tâche qu'à lui-même.

### Décisions ouvertes

- E-1 : les tâches du responsable comptent-elles dans les chiffres de son entité ?
- E-2 : un projet appartient-il à une seule entité (celle qui le porte), les autres n'y contribuant ?
- E-8 : faut-il une vue « tâches que j'ai confiées », dans Mes tâches ou dans Mon entité ?

---

## 4. Mon dossier

### Rôle

Le dossier administratif de la personne connectée, tenu par le service des ressources humaines.
Il s'affiche en lecture seule : depuis le 16/11/2026, l'agent ne modifie plus rien lui-même, pas même
ses coordonnées. Un bandeau le rappelle : « Votre dossier est tenu par le service des ressources
humaines. Pour corriger une information, adressez-vous à lui ».

| Bloc | Contenu |
|---|---|
| En-tête | Civilité, nom, fonction, entité, statut |
| Identité | Matricule, naissance, nationalité, sexe, situation de famille, enfants, pièce d'identité |
| Situation administrative | Statut, grade, catégorie et échelon, date d'entrée, fin de contrat, fonction et date, entité, supérieur hiérarchique |
| Historique des affectations | Entité, fonction, dates, acte de nomination |
| Diplômes | Intitulé, niveau, spécialité, établissement, année |
| Coordonnées | Adresse professionnelle, téléphone, courriel personnel, adresse |
| Personnes à prévenir | Nom, lien, téléphone, courriel |
| Compte | État de l'accès, profil, date de l'affectation en cours |

Sans dossier ouvert par les RH, la page affiche « Pas encore de dossier ».

### Qui lit quel dossier (test réel sur la démo)

| Lecteur | Son dossier | Dossiers des autres |
|---|---|---|
| Bernadette (DG, propriétaire) | Oui | Les 5 autres |
| Esther (assistante, cheffe des RH dans la démo) | Oui | Aucun |
| Fiston (chef d'entité) | Oui | Gaston, qui dépend de lui |
| Didier, Clarisse, Gaston | Oui | Aucun |

Un responsable d'entité lit le dossier complet de ses agents : identité, situation de famille, pièce
d'identité, adresse personnelle, personnes à prévenir et observations du service RH.

### Ce que chacun voit

| Personne | Fonction affichée | Entité affichée | Constat |
|---|---|---|---|
| Bernadette | Directrice générale | Direction générale | Historique des affectations vide |
| Esther | Assistante de direction | Direction générale | Correct |
| Fiston | Chef du département Ingénierie territoriale | **Cartographie et SIG** | Fonction et entité se contredisent, jusque dans l'historique |
| Didier | Directeur de la Communication et des Partenariats | **Communication** (service) | Rangé dans un service, pas dans sa direction |
| Clarisse | Chargée d'études | Études et Prospective | Correct |
| Gaston | Chef du service Suivi-évaluation | Suivi-évaluation | Correct (mais profil Agent, voir A-3) |

### Cas d'usage

- **Fiston veut vérifier sa situation avant une promotion.** Il lit son grade (Ingénieur en chef), sa
  catégorie (A), sa date d'entrée. Son entité affichée est « Cartographie et SIG » alors qu'il dirige
  le département : il doit écrire au service RH, hors de l'outil, pour le signaler.
- **Un agent change de numéro de téléphone.** Il ne peut plus le corriger lui-même (décision du
  16/11/2026). Rien dans la page ne lui permet de transmettre la demande : il faut un courriel ou un
  passage au service RH.
- **Un chef de service ouvre le dossier d'un de ses agents** pour préparer son évaluation. Il voit
  aussi sa situation de famille, sa pièce d'identité, son adresse et les observations internes des
  RH. Cette consultation n'est pas journalisée.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| D-1 | Le serveur renvoie le champ « Observations » (notes internes des RH) à l'agent lui-même et à son chef. L'écran le masque, mais il est lisible dans la réponse. | Haute | **Fait** (lot 7) : les observations du service RH ne quittent plus le serveur que pour le service RH |
| D-2 | Un chef d'entité lit le dossier complet de ses agents, données personnelles comprises (famille, pièce d'identité, adresse, personnes à prévenir). | Haute | **Décidé et fait** (lot 7) : le chef lit la partie administrative (situation, affectations, diplômes) ; famille, pièce d'identité, coordonnées personnelles et personnes à prévenir restent à l'agent et aux RH |
| D-3 | La consultation d'un dossier par quelqu'un d'autre que l'agent n'est pas journalisée. | Haute | **Fait** (lot 5) : chaque consultation par un tiers est journalisée (« Dossier d'agent consulté par un tiers », une fois par lecteur et par demi-heure) |
| D-4 | L'agent ne peut rien corriger, mais aucun bouton ne lui permet de signaler une erreur ou de demander une mise à jour au service RH. | Moyenne | **Fait** (lot 8) : « Demander une correction » ; le service RH traite, l'agent est prévenu, la demande reste au dossier |
| D-5 | Fonction et entité se contredisent dans les dossiers de démo (Fiston rangé dans Cartographie et SIG, Didier dans le service Communication). Même famille que A-3. | Moyenne (démo) | **Fait** (lot 1) : fonction et entité des dossiers alignées sur le rattachement |
| D-6 | L'historique des affectations de la DG est vide. | Basse (démo) | **Fait** (lot 12) : chaque dossier de la démonstration a son affectation ; la DG garde aussi son poste précédent |
| D-7 | Les adresses professionnelles sont en « @cadence.app » et la nationalité vaut « Fictivienne ». | Basse (démo) | **Fait** (lot 9) : adresses en « @anat.example » (domaine fictif réservé), domaine de l'institution assorti, nationalité « Congolaise » |
| D-8 | Dans la démo, personne d'autre que la DG ne gère les dossiers RH : la cheffe des RH (Esther) n'en lit aucun. La DG ne pouvant pas modifier son propre dossier, il ne peut être tenu par personne. | Moyenne (démo) | **Fait** (lot 1) : la cheffe du service RH tient les dossiers (droit « gérer les RH ») |
| D-9 | Le dossier ne contient ni congés, ni pièces (actes de nomination, contrats, arrêtés), ni formations, ni évaluations. | Moyenne | **Décidé et fait** (lot 8) : pièces du dossier (RH et agent), formations, évaluations (RH et agent), congés et absences |

### Ce qui fonctionne bien

- Lecture seule pour l'agent, avec un bandeau clair.
- Un gestionnaire RH ne peut pas modifier son propre dossier.
- Un agent ne lit que son dossier ; un chef ne lit que ceux de ses agents.
- Le dossier rassemble identité, situation administrative, historique et diplômes sur une seule page.

### Décisions ouvertes

- D-2 : quelle partie du dossier d'un agent son chef peut-il lire ? **Décidé le 18/11/2026 : la partie administrative seulement.**
- D-4 : faut-il un bouton « Demander une correction » ?
- D-9 : que doit contenir le dossier au-delà de l'existant (congés, pièces, formations, évaluations) ? **Décidé le 18/11/2026 : pièces, formations, évaluations et congés.**

---

## 5. Coéquipiers IA

### Rôle

Des agents d'intelligence artificielle qui travaillent dans les projets comme des membres de l'équipe.
On leur confie une tâche, on les mentionne dans un commentaire, ou une règle d'automatisation les
déclenche (par exemple à chaque nouvelle tâche d'une colonne). Ils lisent le projet, puis
**proposent** des actions (créer une tâche ou une sous-tâche, modifier une tâche, commenter,
mémoriser) qu'un humain accepte, retouche ou refuse.

| Bloc de la page | Contenu |
|---|---|
| En-tête | « Des collègues qui ne dorment jamais, et qui demandent la permission. » et le mode : démonstration (moteur de règles) ou Claude si une clé est configurée sur le serveur |
| Trois principes | Contexte, Validations, Droits |
| Fiches des coéquipiers | Atlas (« chef de projet IA ») et Nova (« analyste QA et triage ») : rôle, consignes permanentes, projets, interventions |
| En attente de votre accord | Les actions proposées, à accepter, retoucher ou refuser |
| Journal des interventions | Chaque intervention, étape par étape |

Droits dans la démo : la DG, Fiston et Didier peuvent confier du travail à l'IA et valider ses actions.
Esther, Clarisse et Gaston peuvent seulement utiliser l'assistant. Seule la DG peut créer des règles
d'automatisation.

### Test réel sur la démo

Fiston crée, dans « Application mobile v2 », la tâche « Préparer un point d'avancement » et la confie
à Atlas. La tâche, ses propositions et le commentaire validé ont été supprimés après le test.

1. **Deux coéquipiers démarrent au lieu d'un.** Atlas, à qui la tâche est confiée, et Nova, déclenchée
   par la règle « Triage du backlog » parce que la tâche est tombée dans la colonne Backlog.
2. **Ils proposent exactement la même chose** : un commentaire de relance sur la tâche « Intégrer le
   SDK de paiement », adressé à Fiston lui-même (« @Fiston petite relance… 4 j de retard »). Le rôle
   de Nova (triage qualité) n'a pas joué.
3. **Qui est prévenu :** la DG et Fiston reçoivent une notification. Gaston et Clarisse ne sont pas
   prévenus, mais voient les deux propositions dans leur liste « en attente ».
4. **Qui peut décider :**
   - Gaston, éditeur du projet sans le droit de valider : refusé ;
   - Didier, qui a le droit de valider mais seulement en lecture sur le projet : refusé ;
   - Fiston, administrateur du projet : il retouche le texte et valide. Il a donc validé une relance
     qui le visait lui-même.
5. **Refuser n'arrête pas l'intervention.** Après les refus, les deux coéquipiers ont continué :
   commentaire sur « Tests de non-régression iOS », puis création de deux sous-tâches génériques
   (« Rassembler les éléments et l'état des lieux », « Produire une première version »). Il a fallu
   annuler les interventions à la main.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| I-1 | Une règle d'automatisation peut être réglée en « validation automatique » pour créer une tâche, commenter ou mémoriser sans accord humain. Cela contredit la règle du projet « l'IA propose et un humain décide ». | Haute | **Décidé et fait** (lot 4) : validation automatique supprimée ; les règles existantes repassent en validation humaine |
| I-2 | Refuser une proposition n'arrête pas l'intervention : le coéquipier enchaîne d'autres propositions. | Haute | **Fait** (lot 4) : un refus arrête l'intervention ; « Refuser, laisser continuer » permet au coéquipier de poursuivre |
| I-3 | Deux coéquipiers peuvent travailler en même temps sur la même tâche (tâche confiée + règle) et proposer la même action. | Moyenne | **Fait** (lot 11) : une seule intervention de l'IA à la fois sur une tâche, quel que soit le coéquipier |
| I-4 | La personne visée par une proposition peut la valider elle-même (Fiston valide la relance qui le concerne). | Moyenne | **Décidé et fait** (lot 4) : la personne visée (chargé de la tâche touchée, personne mentionnée) ne valide pas la proposition et n'est pas sollicitée |
| I-5 | Les propositions sont visibles par des personnes qui ne peuvent pas les valider (Gaston, Clarisse) et absentes des notifications de ceux qui pourraient (autres éditeurs avec le droit). | Basse | **Fait** (lot 12) : seules les personnes qui peuvent décider (droit de valider l'IA et rôle d'éditeur) voient et reçoivent les propositions |
| I-6 | Les coéquipiers ne sont membres que des projets de start-up. Aucun projet de l'ANAT (Schéma national d'aménagement, RH) ne les utilise. | Moyenne (démo) | **Fait** (lot 1) : les coéquipiers travaillent dans les projets de l'Agence |
| I-7 | Les rôles et consignes viennent d'une start-up (« chef de projet IA », « analyste QA et triage », bugs, étapes de reproduction). | Moyenne | **Fait** (lot 1) : rôles de chargé de suivi et d'analyste des données, règle de tri sans vocabulaire de start-up |
| I-8 | Le ton de la page (« Des collègues qui ne dorment jamais ») et le message vide « Assignez une tâche à Atlas ou Nova » ne conviennent pas à un outil institutionnel. | Basse | **Fait** (lot 12) : ton institutionnel : « L'IA prépare le travail, une personne habilitée décide » |
| I-9 | Avec une clé configurée, le contenu des tâches, commentaires et pièces jointes lues est envoyé à un service d'IA hors de l'agence. La page ne le dit pas et aucun réglage ne permet d'exclure un projet ou une pièce confidentielle. | Haute | **Décidé et fait** (lot 7) : avec un service extérieur, l'IA demande la permission avant chaque lecture (et avant d'envoyer la tâche de départ) ; un refus arrête l'intervention ; la règle est affichée sur la page des coéquipiers |
| I-10 | En mode démonstration, les propositions sont génériques (sous-tâches « Produire une première version ») et ne reflètent pas ce que ferait le vrai modèle. | Basse | **Fait** (lot 12) : noté dans le guide fonctionnel (§ 5.15 bis) : en mode démonstration, les propositions sont simulées |

### Ce qui fonctionne bien

- Toute action d'écriture passe par une proposition, que l'humain peut retoucher avant de valider.
- Le droit de valider est vérifié côté serveur, et il faut en plus pouvoir modifier le projet.
- Chaque intervention est consultable étape par étape (ce que l'IA a lu, ce qu'elle a proposé).
- Une intervention se laisse annuler.
- Les coéquipiers n'accèdent qu'aux projets dont ils sont membres.

### Décisions ouvertes

- I-1 : garde-t-on une validation automatique, et pour quelles actions ? **Décidé le 18/11/2026 : non, supprimée.**
- I-4 : la personne visée par une proposition peut-elle la valider ? **Décidé le 18/11/2026 : non.**
- I-9 : quels projets et documents l'IA peut-elle lire, compte tenu de l'envoi à un service extérieur ? **Décidé le 18/11/2026 : l'IA demande la permission avant chaque lecture envoyée au service extérieur.**

---

## 6. Tableau de bord DG

### Rôle

La page de travail de la Directrice générale : « l'essentiel pour décider aujourd'hui ». Elle n'est
ouverte qu'aux profils qui ont le droit « accéder au poste de pilotage » : dans la démo, la DG et son
assistante. Les chefs de direction et les agents reçoivent un refus.

| Bloc | Contenu |
|---|---|
| En-tête | Salutation, date, raccourcis Réunions et Parapheur, bouton « Nouvelle activité » |
| Saisir | Les six raccourcis de saisie (les mêmes que sur l'Accueil) |
| Quatre chiffres | Activités suivies et part « en bonne voie », décisions attendues, retards à résorber, documents à signer |
| Par direction | Une ligne par direction : appréciation (sous contrôle, vigilance, alerte) et sa raison, projets, avancement du plan de travail comparé à l'attendu, retards par nature |
| Santé du portefeuille | Anneau « dans les temps ou terminées », répartition dans les temps, à surveiller, en difficulté |
| Décisions attendues | Les dossiers qui attendent un arbitrage, avec « Arbitrer » ou « Trancher » |
| Assistant IA | « Point de situation » en cinq lignes, et trois demandes toutes faites (résumer la semaine, proposer les priorités, préparer le comité) |
| Agenda de la semaine | Rendez-vous par jour sur 7 jours, avec les 3 prochains |
| À suivre en priorité | Les 5 activités les plus préoccupantes |
| Indicateurs stratégiques | Réalisé par rapport à la cible, plus le taux de recommandations réalisées |
| Risques majeurs | Score probabilité × impact et responsable |

### Ce que la DG voit dans la démo (16/11/2026)

- **13 activités suivies, 46 % en bonne voie** : 6 dans les temps, 6 à surveiller, 1 en difficulté
  (« Inventaire du patrimoine immobilier »).
- **3 décisions attendues** : approuver l'avenant à la convention de « Campagne de lancement », valider
  la position de l'Agence sur le schéma national, arbitrer le recours à un prestataire pour
  l'inventaire.
- **10 retards à résorber** : 4 tâches ou suites, 1 recommandation, 1 livrable, 2 activités du plan,
  1 courrier, 1 décision.
- **1 document à signer.**
- **Par direction** : l'Agence en alerte (plan 62 % pour 94 % attendu, 1 courrier hors délai) ;
  Direction technique en alerte (4 tâches, 1 décision et 1 recommandation en retard) ; Communication
  et Partenariats en vigilance ; Direction générale en vigilance (3 projets à surveiller) ; Antenne
  Sud et Représentation Nord sous contrôle, mais vides.
- **Agenda** : 7 rendez-vous sur 7 jours (comité de direction, audience avec le bailleur, commission
  interministérielle, forum des villes durables…).
- **Indicateurs** : plans de travail approuvés 5/8, provinces couvertes par un schéma 11/26,
  recommandations exécutées 62/90.
- **Risques** : retard de décaissement du bailleur (20, Fiston), disponibilité des données
  provinciales (9, la DG).

### Cas d'usage

- **Lundi matin, la DG prépare le comité de direction.** La page lui donne d'un coup d'œil ce qui
  coince par direction et pourquoi, les décisions à prendre et l'agenda. C'est la page la plus utile
  de l'outil pour elle, mais ce n'est pas celle sur laquelle elle arrive (voir A-1).
- **Elle compare deux chiffres de retards de tâches.** Le compteur du haut annonce « 4 tâches ou
  suites » en retard, la ligne « Institution » du bloc par direction en compte 5, et l'Accueil aussi
  5. Le premier ne compte que les tâches des projets du portefeuille et les suites d'activités ; le
  second compte toutes les tâches des agents, registres d'entité compris.
- **Elle lit les indicateurs.** Sur la même carte : « Recommandations exécutées 62/90 » (indicateur
  saisi à la main) et « Recommandations réalisées 0/2 » (calculé depuis les comptes rendus). Deux
  chiffres pour la même notion.
- **Elle veut voir le détail des 10 retards.** La carte « Retards à résorber » n'est pas cliquable,
  contrairement aux trois autres chiffres.
- **Fiston, chef de département, veut voir où en est sa direction.** Il n'a pas accès au tableau de
  bord : seule sa page Mon entité lui donne ses chiffres, calculés autrement (voir E-1).

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| P-1 | Deux définitions de « tâche en retard » sur la même page : 4 dans le compteur du haut (projets du portefeuille et suites d'activités), 5 dans le bloc par direction et sur l'Accueil (toutes les tâches des agents). Même famille que A-2. | Haute | **Fait** (lot 6) : une seule règle des retards, écrite dans le code et renvoyée avec les chiffres ; le compteur sépare tâches et suites d'activités, et l'institution compte les mêmes tâches que la vue par direction |
| P-2 | « Recommandations exécutées 62/90 » (indicateur saisi) et « Recommandations réalisées 0/2 » (calculé) côte à côte. | Moyenne | **Décidé et fait** (lot 6) : l'indicateur relié aux recommandations réalisées est calculé ; la ligne en double disparaît ; chaque indicateur dit s'il est calculé ou saisi |
| P-3 | « Retards à résorber » additionne des natures différentes (tâches, recommandations, livrables, plan, courrier, décisions) et ne mène nulle part. | Moyenne | **Fait** (lot 11) : la carte « Retards à résorber » ouvre le détail par nature, chaque ligne menant à la page où le traiter |
| P-4 | Le bloc « Assistant IA » affiche un « Point de situation » calculé par des règles, pas par l'IA. Le titre laisse croire que l'IA a analysé la situation. | Basse | **Fait** (lot 12) : le bloc s'intitule « Point de situation », calculé à partir des données de l'outil ; « Assistant IA » est réservé aux demandes |
| P-5 | Les chefs de direction n'ont pas accès au tableau de bord, même limité à leur direction. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : un chef lit la page de la direction qu'il dirige (lien depuis Mon entité) ; la liste de toutes les directions reste au pilotage |
| P-6 | Données de démo : la DG est aussi responsable de la Direction technique ; l'Antenne Sud et la Représentation Nord sont vides ; les projets du portefeuille sont ceux d'une start-up (« Campagne de lancement », « Application mobile v2 »). Même famille que A-3 et A-7. | Moyenne (démo) | **Fait** (lot 1) : un chef distinct par direction, antenne et représentation peuplées, portefeuille de l'Agence |
| P-7 | « 5 directions · 1 en alerte » alors que deux lignes sont en alerte (l'Agence et la Direction technique). | Basse | **Fait** (lot 12) : l'en-tête « Par direction » signale à part l'alerte de la ligne Agence |
| P-8 | La page reprend le bloc « Saisir » de l'Accueil : la DG le voit deux fois si elle passe d'une page à l'autre. | Basse | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : le bloc « Saisir » n'est plus répété sur l'Accueil de la direction ; il reste sur le tableau de bord |

### Ce qui fonctionne bien

- Une vraie page de décision : par direction, l'appréciation est expliquée (« 1 activité du plan
  échue non achevée », « 1 décision en retard d'exécution »), pas seulement colorée.
- L'avancement du plan de travail est comparé à l'avancement attendu à la date du jour.
- Les décisions attendues s'arbitrent directement depuis la page.
- Une activité confidentielle n'apparaît qu'à son responsable et aux gestionnaires.
- L'accès est contrôlé côté serveur.

### Décisions ouvertes

- P-1 : quelle est la règle unique d'un retard (tâches principales seulement, registres d'entité
  compris, suites d'activités comprises) ?
- P-2 : quel indicateur de recommandations garde-t-on ?
- P-5 : les chefs de direction voient-ils la partie du tableau de bord qui concerne leur direction ?

---

## 7. Portefeuille

### Rôle

Tous les dossiers que suit la Direction générale, au même endroit : projets internes et confiés,
commissions, conférences, rendez-vous et activités internes, avec leurs suites. Le menu apparaît pour
tout profil qui peut voir l'agenda ou créer un projet, c'est-à-dire tout le monde dans la démo.

| Onglet | Contenu | Qui |
|---|---|---|
| Revue de portefeuille | Pour chaque projet : santé déclarée et santé calculée (calendrier, livrables, budget, tâches, arbitrage), écart entre les deux, raison | DG et assistante |
| Arbitrages | Les demandes d'arbitrage adressées à la DG | DG et assistante |
| Tous les dossiers | Projets et activités dans une même liste : nature, responsable, date, état, suites ouvertes | Tout le monde |
| Projets | Avancement, échéance, tâches en retard, état | Tout le monde |
| Un onglet par type d'activité | Commissions, Conférences, Rendez-vous, Activités internes (types paramétrables) | Tout le monde |
| Contrats et paiements | Vue transversale des contrats rangés dans les projets | Profils qui gèrent les consultants |

Boutons : « Exporter » (Word ou PDF de la liste affichée), « Nouvelle activité » (droit de gérer
l'agenda), « Nouveau projet » (onglet Projets). Une activité se modifie par son responsable ou par un
gestionnaire de l'agenda, et ne se supprime que par un gestionnaire. La suppression est tracée.

### Ce que chacun voit

| Personne | Projets visibles | Activités visibles | Onglets de pilotage |
|---|---|---|---|
| Bernadette (DG) | 6 | 7, dont l'audience confidentielle avec le bailleur | Oui, et Contrats et paiements |
| Esther (assistante) | **4** | 7, dont l'audience confidentielle | Oui, sans Contrats et paiements |
| Fiston (chef d'entité) | 4 | 6 | Non, mais Contrats et paiements |
| Didier (chef d'entité) | 4 | 6 | Non, mais Contrats et paiements |
| Clarisse (Agent) | 3 | 6 | Non |
| Gaston (Agent) | 2 | 6 | Non |

### Cas d'usage

- **La DG ouvre « Tous les dossiers ».** Les projets « Campagne de lancement », « Refonte du site
  web », « RH · Recrutements 2027 » et « Schéma national d'aménagement » sont affichés **« Dans les
  temps »**. Dans l'onglet « Revue de portefeuille » de la même page, et sur le Tableau de bord DG, les
  quatre sont **« À surveiller »**, marqués « EN ÉCART » : budget consommé à 52 % pour 25 % du temps
  écoulé, 69 % pour 6 %, un livrable en retard. La liste principale affiche ce que déclare le chef de
  projet, la revue ce que disent les faits.
- **L'assistante prépare le comité.** Elle voit le tableau de bord et la revue, mais seulement 4
  projets dans le portefeuille : la liste des projets ne montre que ceux dont on est membre. Deux
  projets suivis par la DG lui échappent.
- **Un agent, Gaston, ouvre le Portefeuille.** Il voit toutes les commissions, conférences et
  activités internes de la DG (« Commission interministérielle d'aménagement », « Inventaire du
  patrimoine immobilier » en difficulté). Seule l'audience marquée confidentielle lui est cachée.
- **La DG compte ses décisions.** Le Tableau de bord annonce « 3 décisions attendues », la revue de
  portefeuille « Arbitrages attendus : 0 ». Les premières sont des dossiers dont le champ « décision
  attendue » est rempli, les secondes des demandes d'arbitrage formelles.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| F-1 | L'état d'un projet diffère selon l'onglet : déclaré (« Dans les temps ») dans Tous les dossiers et Projets, calculé (« À surveiller ») dans la revue et le Tableau de bord DG. | Haute | **Fait** (lot 6) : l'état calculé s'affiche partout (Tous les dossiers, Projets, Accueil), avec le déclaré à côté quand ils divergent et les raisons au survol |
| F-2 | La liste des projets ne montre que les projets dont on est membre. Le portefeuille de l'assistante de la DG est incomplet (4 sur 6), alors qu'elle a accès au tableau de bord. | Haute | **Fait** (lot 10) : le droit de pilotage donne la lecture de tous les projets non privés de l'institution |
| F-3 | « 3 décisions attendues » (tableau de bord) et « Arbitrages attendus : 0 » (revue) : deux notions proches, deux chiffres. | Moyenne | **Décidé et fait** (lot 6) : une seule notion, « décision attendue de la DG » : dossier marqué « décision attendue » ou arbitrage en attente, compté une fois ; la revue précise son périmètre (« sur ces projets ») |
| F-4 | Tous les agents voient toutes les activités non confidentielles de la DG (commissions, conférences, activités internes, leur état). | Moyenne | **Décidé et fait** (lot 7) : un agent voit les activités dont il est responsable, dont il suit une suite, ou de son entité ; la direction voit tout le non-confidentiel |
| F-5 | L'onglet « Contrats et paiements » est ouvert aux chefs d'entité (Fiston, Didier) mais pas à l'assistante de la DG. | Basse | **Fait** (lot 12) : le pilotage lit tous les contrats ; un gestionnaire ne lit que ceux de ses entités, de ses dossiers et de ses missions |
| F-6 | Un responsable d'activité modifie lui-même l'état (santé) de son activité. L'état affiché est corrigé si des suites sont en retard, mais pas pour les autres signaux. | Basse | **Décidé (option prudente, en l'absence de l'utilisateur)** (lot 13) : même règle que F-1 : l'état déclaré reste, l'état calculé s'affiche à côté ; aucun changement de code |
| F-7 | « Nouveau projet » apparaît dans l'onglet Projets sans vérifier le droit. Même famille que A-6 et E-7. | Basse | **Fait** (lot 3) : « Nouveau projet » ne s'affiche qu'avec le droit |
| F-8 | Données de démo : « Campagne de lancement » a pour responsable Fiston, chef de l'Ingénierie territoriale ; projets de start-up. Même famille que A-7. | Moyenne (démo) | **Fait** (lot 1) : projets de l'Agence, confiés aux chefs concernés |

### Ce qui fonctionne bien

- La revue de portefeuille compare le déclaré et le calculé, et dit pourquoi (« budget consommé à 52 %
  pour 25 % du temps écoulé »). C'est l'outil de contrôle attendu par une DG.
- Projets et activités sont réunis dans une même liste, exportable en Word ou PDF.
- Les activités confidentielles ne sont visibles que de leur responsable et des gestionnaires.
- Une question soumise à l'arbitrage de la DG ne peut plus être réécrite à la main.
- La suppression d'une activité est réservée aux gestionnaires et tracée.

### Décisions ouvertes

- F-1 : quel état afficher dans les listes (calculé, déclaré, ou les deux) ?
- F-3 : « décision attendue » et « arbitrage » : une seule notion ou deux ?
- F-4 : les agents voient-ils le portefeuille de la DG ? **Décidé le 18/11/2026 : un agent voit ce qui le concerne.**

---

## 8. Décisions

### Rôle

Le registre des décisions de la DG : « chaque décision de la DG est numérotée, figée et suivie jusqu'à
son exécution ». Une décision reçoit un numéro annuel (DEC/2026/0001), un objet, un texte, une date,
un chargé d'exécution, une échéance, et peut être confidentielle. Elle passe par quatre états :
à exécuter, en cours, exécutée, remplacée. Elle ne se modifie pas : pour la changer, on la remplace
par une nouvelle décision qui renvoie à l'ancienne.

| Élément | Contenu | Qui |
|---|---|---|
| Onglets | « Toutes les décisions », « À exécuter par moi » | Tout profil qui voit les décisions |
| Liste | Groupée par état, avec retard signalé | Idem ; les confidentielles seulement pour le secrétariat de la DG, le chargé et l'auteur |
| « Inscrire une décision » | Objet, texte, date (jamais future), chargé d'exécution, échéance, confidentialité | Profils qui enregistrent les décisions : la DG et son assistante |
| Fiche d'une décision | État, chargé, échéance, auteur de l'inscription, dossier d'origine ; « En cours » puis « Exécutée » avec un compte rendu d'exécution ; « Remplacer » | Avancer : le chargé ou le secrétariat de la DG |
| Exporter | Word ou PDF de la liste | Tout le monde |

Une décision prise sur un dossier (projet ou activité) se rattache à ce dossier, lève la « décision
attendue » et clôt l'arbitrage en attente. Une décision de séance est inscrite automatiquement à la
validation du compte rendu. Aucun coéquipier IA ne peut inscrire de décision.

### Ce que la démo contient

Deux décisions seulement, toutes deux confiées à Fiston et visibles par tous les profils :

| Référence | Objet | État | Échéance |
|---|---|---|---|
| DEC/2026/0002 | Transmission du rapport annuel de performance | À exécuter, **en retard** | 12/11/2026 |
| DEC/2026/0001 | Lancement des ateliers provinciaux | En cours | 06/12/2026 |

Aucune n'est rattachée à un dossier.

### Tests réels

| Action | Résultat |
|---|---|
| Gaston (agent) fait avancer la décision de Fiston | Refusé : « Seul le chargé d'exécution ou le secrétariat de la DG fait avancer une décision » |
| Didier (chef d'une autre direction) la déclare exécutée | Refusé, même message |
| Fiston repasse une décision « en cours » à l'état précédent | Refusé : « L'exécution d'une décision ne revient pas en arrière » |
| Clarisse (agent) inscrit une décision | Refusé : pas le droit d'enregistrer les décisions de la DG |
| La DG inscrit une décision datée du mois prochain | Refusé : « La date de la décision ne peut pas être dans le futur » |

### Cas d'usage

- **Après le comité, l'assistante inscrit trois décisions dictées par la DG.** Elle en a le droit. La
  décision entre au registre, numérotée et figée, avec « Enregistrée par : Esther Mukendi ». La DG
  n'a rien à confirmer : rien ne distingue une décision qu'elle a vue d'une décision saisie en son nom.
- **L'assistante oublie le chargé d'exécution et l'échéance** (ils sont facultatifs). La décision est
  inscrite « à exécuter », sans responsable ni date : elle ne sera jamais en retard et n'apparaîtra
  dans le « À exécuter par moi » de personne.
- **Fiston termine le rapport annuel de performance.** Il clique « Exécutée » et écrit le compte rendu
  d'exécution. La décision est close ; l'auteur de l'inscription est prévenu. Personne ne vérifie que
  le rapport a bien été transmis.
- **Une faute de frappe dans l'objet.** La décision ne se corrige pas : il faut la remplacer, ce qui
  crée un nouveau numéro.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| DEC-1 | Une décision inscrite par l'assistante entre au registre sans confirmation de la DG. Rien ne la distingue d'une décision que la DG a vue. (Décision déjà ouverte dans le plan de travail.) | Haute | **Décidé et fait** (lot 4) : confirmation après coup. La décision est numérotée dès son inscription, marquée « à confirmer par la DG », et la DG la confirme (droit « Confirmer les décisions inscrites au nom de la DG ») |
| DEC-2 | Le chargé d'exécution et l'échéance sont facultatifs : une décision peut rester sans suivi ni retard possible. | Haute | **Fait** (lot 10) : chargé et échéance obligatoires, sauf décision marquée « sans exécution » ; une décision de séance sans chargé est inscrite sans exécution ; un arbitrage se tranche avec une échéance |
| DEC-3 | Le chargé déclare seul la décision exécutée, sans vérification. Même logique que T-3. | Moyenne | **Décidé et fait** (lot 4) : le secrétariat de la DG ou la DG confirme l'exécution déclarée par le chargé, ou la renvoie avec un motif |
| DEC-4 | Aucune correction possible, même d'une faute de frappe : il faut remplacer, ce qui crée un nouveau numéro. | Basse | **Décidé (option prudente, en l'absence de l'utilisateur)** (lot 13) : pas de correction d'une décision inscrite : on la remplace, ce qui garde la trace de la version première |
| DEC-5 | Le formulaire « Inscrire une décision » de cette page ne propose pas de rattacher la décision à un dossier ; seule l'action « Arbitrer » depuis un dossier le fait. | Moyenne | **Fait** (lot 11) : le formulaire « Inscrire une décision » propose le dossier : projet, activité ou réunion |
| DEC-6 | Tous les profils, agents compris, voient toutes les décisions non confidentielles. | Basse | **Décidé et fait** (lot 7) : un agent voit les décisions dont il est chargé ou dont le dossier le concerne (projet, activité, réunion) |
| DEC-7 | Données de démo : deux décisions seulement, toutes deux pour Fiston, sans dossier d'origine. | Moyenne (démo) | **Fait** (lot 9) : onze décisions, issues de comités, de projets et d'activités, confiées à neuf personnes ; deux à confirmer par la DG, deux exécutées et confirmées |

### Ce qui fonctionne bien

- Numérotation annuelle, décision figée, remplacement tracé qui renvoie à l'ancienne décision.
- L'exécution n'avance que dans un sens et seulement par le chargé ou le secrétariat de la DG.
- Une date future est refusée, une échéance antérieure à la décision aussi.
- Aucun coéquipier IA ne peut inscrire une décision.
- La décision prise sur un dossier clôt l'arbitrage en attente et lève la « décision attendue ».
- Le chargé retrouve ses décisions dans « À exécuter par moi », et l'auteur est prévenu de l'exécution.

### Décisions ouvertes

- DEC-1 : la DG confirme-t-elle les décisions inscrites par son assistante ? **Décidé le 18/11/2026 : confirmation après coup.**
- DEC-3 : la clôture d'une décision est-elle confirmée par le secrétariat de la DG ? **Décidé le 18/11/2026 : oui, secrétariat ou DG.**
- DEC-4 : correction de forme autorisée, ou remplacement seulement ?

---

## 9. Réunions

### Rôle

« Chaque réunion produit un compte rendu officiel, et chaque recommandation reste suivie jusqu'à sa
clôture. » Le module couvre tout le cycle d'une séance :

- **Programmer** : type (comité de direction, comité de pilotage, réunion de service…), date, lieu ou
  visioconférence, présidence, rédacteur, dossier ou entité de rattachement, série (chaque semaine,
  toutes les deux semaines, chaque mois, 12 séances au plus), confidentialité. Un numéro de compte
  rendu est attribué dès la programmation (par exemple 0003/ANAT/DIR/CR/FB/11-26).
- **Convoquer** : convoqués (personnes, personnes extérieures, entités entières), ordre du jour
  obligatoire, pièces (30 au plus). À moins de 48 h, l'urgence doit être confirmée. Chaque convoqué
  répond : présent, absent, ou représenté.
- **Rédiger le compte rendu** : ordre du jour, feuille de présence, décisions de séance,
  recommandations (responsable, échéance), prochaine séance. Les recommandations ouvertes de la
  séance précédente du même type sont reprises.
- **Soumettre puis valider** : le rédacteur soumet ; la présidence de séance (ou, sans présidence, un
  valideur) valide ou retourne avec un commentaire. Le rédacteur ne valide jamais son propre compte
  rendu. À la validation, les décisions de séance entrent au registre des décisions et les
  recommandations deviennent des tâches.
- **Suivre les recommandations** : onglet « Recommandations », jusqu'à la clôture par un
  gestionnaire ; un report exige une nouvelle échéance et un motif.

Vues : Liste (groupée par état), Tableau, Calendrier, Recommandations, filtre « Les miennes ».
Exports : compte rendu en PDF et en Word.

### Ce que la démo contient

16 réunions, toutes visibles par les six comptes :

- **Soumis à validation** : comité de direction du 09/11, soumis aujourd'hui, en attente de la DG
  (présidente). Il compte un point, une décision de séance (« recrutement d'un consultant pour le
  diagnostic foncier ») et deux recommandations, avec seulement deux présents (la DG et Fiston).
- **Compte rendu à établir** : « Point d'étape des directions » du 13/11, sans ordre du jour.
- **À venir** : 14 séances, dont le comité de direction d'aujourd'hui et le comité de pilotage du
  19/11 (convoqués), une série de 8 réunions hebdomadaires de l'Ingénierie territoriale et trois
  réunions avec les provinces (non convoquées).
- **Recommandations** : « Transmettre le tableau de suivi budgétaire » (Fiston, en retard depuis le
  14/11), « Préparer la note de conjoncture » (la DG, au 22/11).

Fiston est rédacteur de 15 réunions sur 16, comité de direction compris.

### Tests réels

| Action | Résultat |
|---|---|
| Fiston (rédacteur) valide son propre compte rendu | Refusé : « Le rédacteur ne peut pas valider son propre compte rendu » |
| L'assistante, gestionnaire des réunions, valide le compte rendu | Refusé : « Seule la présidence de séance (Bernadette Mbuyi) valide ce compte rendu » |
| Clarisse, non convoquée, répond à une convocation | Refusé : « Seuls les convoqués répondent à cette convocation » |
| Fiston soumet le compte rendu vide de la réunion du 13/11 | Refusé : « Le compte rendu doit contenir au moins un point à l'ordre du jour » |

### Cas d'usage

- **L'assistante prépare le comité de direction.** Elle programme la séance, convoque, joint les
  pièces. Le numéro de compte rendu est attribué dès maintenant.
- **La DG regarde « Mes prochaines réunions » sur l'Accueil.** Elle lit « Réunion », « Réunion »,
  « Réunion ». Sur la page Réunions, les mêmes séances s'appellent « Comité de direction », « Comité
  de pilotage des projets », « Réunion avec les provinces » : la page Réunions remplace un titre
  générique par le type, l'Accueil et Mon entité non.
- **Le compte rendu du comité du 09/11 attend la DG depuis ce matin.** Seule la présidente peut le
  valider. Si elle est absente, le compte rendu reste bloqué : ni l'assistante ni un intérimaire ne
  peuvent valider à sa place.
- **Une série hebdomadaire est créée jusqu'en janvier.** Les numéros sont réservés à la
  programmation : en janvier 2027, la réunion du 24/01 porte le n° 0001 et celle du 04/01 le n° 0002.
  Si une séance est annulée, son numéro manque dans la suite.
- **Un compte rendu validé est rouvert.** Tout profil qui a le droit de valider des comptes rendus
  peut le rouvrir, pas seulement la présidente qui l'a validé. La réouverture est tracée ; les
  décisions déjà inscrites au registre restent, mais des recommandations peuvent être retirées en
  modifiant le compte rendu rouvert.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| R-1 | Le titre « Réunion » s'affiche tel quel sur l'Accueil et dans Mon entité, alors que la page Réunions affiche le type (« Comité de direction »). Cause de A-8. | Moyenne | **Fait** (lot 6) : une réunion sans titre prend son type ; les anciennes « Réunion » sont renommées par la migration |
| R-2 | Seule la présidence valide un compte rendu qu'elle a présidé. En son absence, rien ne permet une validation par intérim. | Moyenne | **Décidé et fait** (lot 8) : le délégataire de la présidence (délégation de signature) valide, « par délégation » |
| R-3 | Tout profil autorisé à valider peut rouvrir un compte rendu validé, même s'il ne l'a pas validé. Un document validé doit rester figé. | Haute | **Fait** (lot 4) : réouverture par la personne qui a validé ou par la DG, motif obligatoire inscrit au journal, valideur et rédacteur prévenus |
| R-4 | Après réouverture, des recommandations peuvent être retirées du compte rendu, y compris celles déjà transformées en tâches. | Moyenne | **Fait** (lot 11) : une recommandation d'un compte rendu validé ne se supprime plus après réouverture : elle s'annule (migration 057) |
| R-5 | Les numéros de compte rendu sont attribués à la programmation : ordre non chronologique dans une série, trous en cas d'annulation. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur)** (lot 13) : numérotation à la programmation conservée (les références circulent dès la convocation) ; les trous et l'ordre sont documentés |
| R-6 | Une réunion passée non tenue (13/11) reste « Compte rendu à établir » indéfiniment ; rien ne propose de la déclarer non tenue ou annulée. | Basse | **Fait** (lot 8) : une séance passée sans compte rendu se déclare non tenue, avec un motif ; rappel au rédacteur |
| R-7 | Des réunions proches ne sont pas convoquées (revue avec le bailleur du 22/11, réunion avec les provinces du 24/11) et aucun rappel ne prévient le rédacteur. | Moyenne | **Fait** (lot 8) : rappel au rédacteur d'une séance non convoquée à 7 jours |
| R-8 | Toutes les réunions non confidentielles sont visibles de tous, y compris le comité de direction et ses comptes rendus. | Moyenne | **Décidé et fait** (lot 7) : une réunion se voit de ses participants, de son entité, de son projet et de la direction ; le comité de direction reste à ses participants et à la direction |
| R-9 | Données de démo : Fiston rédige 15 réunions sur 16, comité de direction compris ; le comité du 09/11 n'a que deux présents ; l'assistante n'est convoquée à rien. | Moyenne (démo) | **Fait** (lot 9) : l'assistante de la DG rédige les comités de direction et le point d'étape ; les sept membres du comité sont convoqués ; d'autres réunions ont leur propre rédacteur |

### Ce qui fonctionne bien

- Un cycle complet et contrôlé : programmation, convocation, réponses, compte rendu, soumission,
  validation, recommandations suivies.
- Le rédacteur ne valide jamais son propre compte rendu ; la présidence désignée est seule à valider.
- Une convocation à moins de 48 h exige de confirmer l'urgence ; une séance passée ne se convoque plus.
- Les décisions de séance entrent au registre à la validation et y restent, même si le compte rendu
  est modifié ensuite.
- Les recommandations de la séance précédente sont reprises automatiquement.
- Compte rendu exportable en PDF et en Word.

### Décisions ouvertes

- R-2 : validation d'un compte rendu par intérim en l'absence de la présidence ? **Décidé le 18/11/2026 : par le délégataire de la présidence.**
- R-5 : numéro attribué à la programmation ou à la validation ?
- R-8 : qui peut lire les comptes rendus du comité de direction ? **Décidé le 18/11/2026 : participants et direction.**

---

## 10. Risques et indicateurs

### Rôle

« Les risques qui menacent les engagements de l'Agence, et les indicateurs qui mesurent l'atteinte du
plan de travail. Le tableau de bord DG les affiche. »

| Onglet | Contenu |
|---|---|
| Risques | Intitulé, probabilité et impact (1 à 5), score (probabilité × impact), responsable, mesures de maîtrise, état (ouvert, maîtrisé, clos), projet éventuel |
| Indicateurs | Nom, unité, situation de départ, cible, réalisé, source, activité du plan de travail éventuelle |

Un projet affiche aussi ses propres risques dans son espace, pour son équipe.

Droits : la page n'est ouverte qu'aux profils de pilotage (la DG et son assistante dans la démo).
Créer ou modifier un risque ou un indicateur demande un autre droit, « gérer les risques », que
possèdent la DG, Fiston et Didier. Chaque création et modification est journalisée.

### Ce que la démo contient

| Risque | Score | Responsable | Mesures |
|---|---|---|---|
| Retard de décaissement du bailleur | 4 × 5 = 20 | Fiston | « Relance et plan de trésorerie » |
| Disponibilité des données provinciales | 3 × 3 = 9 | La DG | aucune |

| Indicateur | Départ | Cible | Réalisé | Source |
|---|---|---|---|---|
| Plans de travail approuvés | 0 | 8 | 5 plans | Secrétariat |
| Provinces couvertes par un schéma | 4 | 26 | 11 provinces | Direction technique |
| Recommandations exécutées | 40 | 90 | 62 % | Comptes rendus |

Aucun risque n'est rattaché à un projet, aucun indicateur à une activité du plan de travail.

### Tests réels

| Lecteur | Voit la page | Peut modifier |
|---|---|---|
| La DG | Oui | Oui |
| L'assistante | Oui | **Non** |
| Fiston, Didier (chefs) | **Non** (« accéder au poste de pilotage » refusé) | **Oui** : Fiston a pu enregistrer une modification de son risque par l'interface technique (sans rien changer) |
| Clarisse, Gaston | Non | Non |

### Cas d'usage

- **Fiston est responsable du risque « Retard de décaissement du bailleur ».** Il ne peut pas ouvrir
  la page Risques pour le voir, ni être prévenu d'un changement de score. Pourtant son profil peut
  créer et modifier n'importe quel risque, et même modifier les indicateurs stratégiques de la DG
  (résultat, cible), à condition de connaître l'identifiant.
- **L'assistante prépare la revue des risques du comité.** Elle voit tout mais ne peut rien mettre à
  jour : elle doit demander à la DG de saisir les nouveaux scores.
- **La DG veut savoir si le risque de décaissement s'aggrave.** Le registre n'affiche que le score
  actuel : pas d'historique des scores, pas de date de dernière revue, pas d'échéance pour les
  mesures de maîtrise.
- **Le secrétariat met à jour « Plans de travail approuvés : 5/8 ».** Le chiffre est saisi à la main,
  sans date de mesure ni historique, alors que le module Plans de travail connaît le nombre réel de
  plans approuvés. Même constat pour « Recommandations exécutées 62 % » face au calcul du module
  Réunions (voir P-2).

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| RI-1 | Les droits sont incohérents : les chefs d'entité peuvent créer et modifier risques et indicateurs mais ne peuvent pas voir la page ; l'assistante voit tout mais ne peut rien mettre à jour. | Haute | **Fait** (lot 3) : qui gère les risques voit le registre ; le responsable d'un risque le voit et met à jour sa parade et son état |
| RI-2 | Un profil « gérer les risques » peut modifier les indicateurs stratégiques de la DG (cible, résultat). | Haute | **Fait** (lot 3) : droit distinct « Gérer les indicateurs stratégiques » (DG, DGA) ; les chefs les lisent sans les modifier |
| RI-3 | Aucun historique : ni des scores de risque, ni des valeurs d'indicateur. Pas de date de mesure, pas de date de dernière revue. | Moyenne | **Fait** (lot 11) : chaque révision d'un risque et chaque mesure d'indicateur gardent valeur, date et auteur ; tendance et date de revue affichées (migration 058) |
| RI-4 | Les indicateurs sont saisis à la main même quand l'outil connaît la valeur (plans approuvés, recommandations exécutées). | Moyenne | **Décidé et fait** (lot 6) : un indicateur peut être relié à une source de l'outil (plans approuvés, recommandations réalisées, décisions exécutées, accords en vigueur) ; son résultat se calcule seul et ne se saisit plus |
| RI-5 | Un risque ne se rattache qu'à un projet, pas à une activité, une direction ou une convention ; il n'a pas d'échéance pour ses mesures de maîtrise. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : un risque se rattache à un projet, une activité ou un accord ; sa mesure de maîtrise a une échéance |
| RI-6 | Le responsable d'un risque n'est prévenu de rien (attribution, changement de score). | Moyenne | **Fait** (lot 11) : le responsable d'un risque est prévenu de son attribution et de tout changement de score |
| RI-7 | Un risque ne se supprime pas (il se clôt) ; c'est cohérent, mais un indicateur créé par erreur ne se supprime pas non plus. | Basse | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : un indicateur s'archive (il sort des listes, ses mesures restent) ; il ne se supprime pas |
| RI-8 | Données de démo : deux risques et trois indicateurs, sans lien avec les projets ni le plan de travail. | Basse (démo) | **Fait** (lot 9) : trois risques rattachés à des projets, avec leur responsable et leur parade ; un indicateur relié au plan de travail |

### Ce qui fonctionne bien

- Matrice simple et lisible : probabilité × impact, couleur selon le score, tri par gravité.
- Les risques majeurs et les indicateurs remontent sur le Tableau de bord DG.
- Chaque création et modification est journalisée avec son contenu.
- Les risques d'un projet sont visibles par son équipe dans l'espace du projet.

### Décisions ouvertes

- RI-1 : qui voit et qui met à jour les risques (DG, assistante, responsable du risque, chefs) ?
- RI-2 : qui peut modifier les indicateurs stratégiques ?
- RI-4 : faut-il calculer automatiquement les indicateurs dont la source est dans l'outil ?

---

## 11. Plans de travail

### Rôle

« Un plan annuel par entité. Une fois approuvé, il devient la référence et toute révision reste
tracée. » Le cycle :

- **Préparer** (droit « gérer les plans ») : créer le plan d'une entité pour une année, y ajouter des
  activités (responsable, objectif, cible et unité, dates, budget prévu, domaine, sous-activités).
- **Soumettre** : chaque activité doit avoir un responsable, une cible et une date de fin.
- **Approuver ou retourner** (droit « approuver les plans ») : celui qui a soumis ne peut pas approuver.
- **Suivre** : une fois le plan approuvé, le responsable d'une activité saisit l'avancement, le
  réalisé et le budget engagé et dépensé. Si des dossiers (projets, activités du portefeuille)
  réalisent l'activité, l'avancement remonte de ces dossiers et ne se saisit plus à la main.
- **Réviser** : après approbation, une modification garde l'ancienne valeur, la nouvelle, la raison
  et l'auteur.
- **Revue trimestrielle** : synthèse rédigée par le service du plan ou le chef de l'entité, soumise
  puis validée (jamais par celui qui l'a soumise), figée ensuite.

Liste : plan, entité, année, nombre d'activités, avancement, retards, statut ; export en Word ou PDF.

### Ce que la démo contient

| Plan | Entité | Activités | Avancement | Retards |
|---|---|---|---|---|
| Plan de travail 2026 | ANAT (démonstration) | 3 | 62 % | 1 |
| Plan de travail 2026 (exemple) | Direction de la Communication et des Partenariats | 2 | 45 % | 0 |
| Plan de travail 2026 (exemple) | Direction technique | 3 | 67 % | 1 |

Plan de l'Agence : « Rapport annuel de performance » (Fiston, fin le 13/11, 55 %, en retard),
« Ateliers provinciaux de concertation » (5 ateliers sur 6, 80 %), « Révision du schéma
d'aménagement » (réalisée par le projet « Schéma national d'aménagement »). Toutes les activités sont
confiées à Fiston, sans date de début.

Droits dans la démo : tout le monde voit les plans, budgets compris ; Fiston et Didier peuvent les
préparer ; seule la DG les approuve.

### Cas d'usage

- **Novembre : la Direction technique doit préparer son plan 2027.** Aucun plan 2027 n'est en
  préparation, et rien ne le rappelle. Le jour où Didier, chef de la Communication, ouvre « Nouveau
  plan », il peut choisir n'importe quelle entité, y compris la Direction technique : le droit
  « gérer les plans » n'est pas limité à sa propre direction. Il peut aussi modifier ou supprimer le
  brouillon d'une autre direction.
- **Fiston met à jour l'avancement du « Rapport annuel de performance ».** Il saisit lui-même le
  pourcentage, sans pièce ni justification. Le même sujet existe au registre des décisions
  (DEC/2026/0002 « Transmission du rapport annuel de performance », en retard), mais les deux ne sont
  pas reliés.
- **La DG révise l'échéance d'une activité approuvée.** Elle est la seule à pouvoir réviser, et sa
  révision s'applique immédiatement, avec la raison tracée. Personne d'autre n'a à la confirmer.
- **Le secrétariat met à jour l'indicateur « Plans de travail approuvés : 5/8 ».** L'outil en
  compte 3 approuvés. Les deux chiffres ne se parlent pas (voir RI-4).

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| PT-1 | Le droit « gérer les plans » vaut pour toutes les entités : un chef de direction prépare, modifie ou supprime le plan d'une autre direction. | Haute | **Fait** (lot 3) : un chef prépare le plan de son entité et des entités rattachées ; droit « Préparer les plans de toutes les entités » pour la DG, le DGA et le service du plan |
| PT-2 | L'avancement saisi à la main par le responsable n'exige ni justification ni pièce. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : un avancement saisi à la main exige une justification, gardée sur l'activité et journalisée |
| PT-3 | L'avancement d'un plan est la moyenne simple de ses activités, sans pondération (un atelier pèse autant que la révision du schéma national). | Moyenne | **Décidé et fait** (lot 6) : chaque activité a un poids (1 par défaut, de 1 à 100) ; l'avancement du plan est la moyenne pondérée, partout |
| PT-4 | Les activités de la démo n'ont pas de date de début : l'« avancement attendu à date » du Tableau de bord DG est alors approximatif. | Moyenne | **Fait** (lot 11) : date de début obligatoire à la soumission du plan ; démonstration complétée |
| PT-5 | Aucune campagne de préparation : pas de rappel pour le plan de l'année suivante, pas de vue « entités sans plan ». | Moyenne | **Fait** (lot 8) : campagne des plans (entités sans plan pour l'année) et relance de leurs chefs |
| PT-6 | Tous les profils voient tous les plans, budgets prévus et dépensés compris. | Basse | **Décidé et fait** (lot 7) : budgets des plans réservés à la direction, aux chefs de l'entité et à qui prépare ou approuve les plans |
| PT-7 | Les retards de la liste des plans sont calculés sur la date UTC du serveur (`CURRENT_DATE`), pas sur la date de Kinshasa : entre minuit et 1 h, un jour d'écart. | Basse | **Fait** (lot 12) : plus aucune requête ne compare à CURRENT_DATE (UTC) ; un test l'interdit |
| PT-8 | Données de démo : 3 plans pour 12 entités, aucun pour la Direction générale ni l'Ingénierie territoriale ; toutes les activités de l'Agence confiées à Fiston. | Moyenne (démo) | **Fait** (lot 9) : plans de la Direction générale et de l'Ingénierie territoriale (en préparation) ; activités du plan de l'Agence réparties entre les directions |

### Ce qui fonctionne bien

- Cycle préparation, soumission, approbation, suivi, révision, revue trimestrielle, avec séparation
  des rôles (celui qui soumet n'approuve pas).
- La soumission exige responsable, cible et date de fin pour chaque activité.
- Après approbation, toute révision garde l'ancienne valeur, la nouvelle, la raison et l'auteur.
- L'avancement remonte automatiquement des dossiers qui réalisent l'activité.
- Le Tableau de bord DG compare l'avancement au calendrier attendu.

### Décisions ouvertes

- PT-1 : qui prépare le plan d'une entité (son chef, le service du plan, les deux) ?
- PT-2 : l'avancement saisi à la main doit-il être justifié ou validé ?
- PT-3 : pondérer les activités dans l'avancement d'un plan ?

---

## 12. Partenaires

### Rôle

L'annuaire unique des tiers de l'institution : bailleurs, ministères, universités, associations,
cabinets. Chaque fiche porte :

- identité (nom, sigle, identifiant officiel, type et catégories tirés des référentiels, pays, ville,
  coordonnées), entité de rattachement, confidentialité ;
- **état de la relation**, à cycle fixe : identifié, en discussion, actif, suspendu, clos ;
- **points focaux** : les personnes de l'Agence qui suivent la relation ;
- contacts, notes d'échange datées, historique ;
- tout ce qui s'y rattache : accords et conventions, documents, dossiers, réunions, courrier, contrats.

Règles :

- Créer, supprimer, fusionner deux fiches, suspendre, clore ou rouvrir une relation : gestionnaires des
  partenariats. Un motif est exigé pour suspendre, clore ou rouvrir.
- Un point focal fait avancer la discussion (identifié → en discussion → actif), ajoute des notes et
  des contacts.
- Une relation liée par un accord en vigueur ne peut pas être close.
- Un contact cité dans le courrier ou une réunion ne se supprime pas : il s'archive.
- Une fiche confidentielle n'existe pas pour qui n'est ni gestionnaire, ni point focal, ni auteur.
- L'IA ne crée ni ne modifie rien. Tout est tracé.
- Un outil de rapprochement repère les doublons.

### Ce que la démo contient

| Partenaire | État | Point focal | Liens |
|---|---|---|---|
| Fonds fictif pour le développement territorial (FFDT) | Actif | Fiston | 2 contacts, 2 accords, 1 réunion, 2 notes |
| Ministère fictif de l'Urbanisme et de l'Habitat (MFUH) | Actif | La DG | 1 contact, 3 accords, 1 courrier |
| Université fictive des Grands Lacs (UFGL) | En discussion | aucun | 1 accord, 1 note |
| Association fictive Terres et Villes | Suspendu | aucun | aucun |
| Cabinet fictif Géo-Conseil | Identifié | aucun | aucun |
| Agence fictive de coopération du Nord (AFCN) | Identifié, confidentielle | aucun | 1 note |

Aucun partenaire n'est rattaché à un projet ou à une activité du portefeuille, alors que le FFDT est
présenté comme le bailleur du programme.

### Tests réels

| Action | Résultat |
|---|---|
| Gaston (agent) ajoute une note sur la fiche du ministère | Refusé : « Seuls les gestionnaires des partenariats et les points focaux modifient cette fiche » |
| Didier, Directeur de la Communication **et des Partenariats**, crée un partenaire | **Refusé : « Votre profil ne vous autorise pas à : gérer les partenaires »** |
| Fiston, point focal du FFDT, suspend la relation | Refusé : « Suspendre, clore ou rouvrir une relation est réservé aux gestionnaires des partenariats » |
| Les cinq autres comptes ouvrent l'annuaire | Ils voient 5 fiches ; la fiche confidentielle (AFCN) leur est cachée |

### Cas d'usage

- **Didier, directeur des partenariats, rencontre un nouveau bailleur.** Il ne peut pas créer la
  fiche, ni la passer « en discussion », ni noter l'échange : seule la DG gère les partenaires dans
  la démo. Le directeur chargé des partenariats est simple lecteur de l'annuaire.
- **Fiston, point focal du FFDT, apprend que le bailleur gèle ses décaissements.** Il peut noter
  l'échange mais pas suspendre la relation : il doit demander à un gestionnaire, hors de l'outil.
- **Un agent consulte la fiche du FFDT** avant une réunion : il lit les notes d'échange (« calendrier
  des décaissements confirmé… »). Les notes d'échange sont visibles de tout profil qui voit
  l'annuaire.
- **Quatre partenaires sur six n'ont pas de point focal** : personne n'est chargé de faire vivre la
  relation, et rien ne le signale.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| PA-1 | Le Directeur de la Communication et des Partenariats n'a pas le droit de gérer les partenaires ; seule la DG l'a. | Haute (profils) | **Fait** (lot 3) : dans la démonstration, le directeur de la Communication et des Partenariats gère l'annuaire ; ailleurs, le droit se coche dans Profils et droits |
| PA-2 | Un point focal ne peut pas suspendre une relation, même en urgence ; il n'a aucun moyen de le demander dans l'outil. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : le point focal demande la suspension, motif à l'appui ; les gestionnaires sont prévenus et décident |
| PA-3 | Les notes d'échange sont lisibles par tous les profils qui voient l'annuaire. | Moyenne | **Fait** (lot 7) : notes d'échange réservées aux gestionnaires, aux points focaux et à la direction |
| PA-4 | Rien ne signale un partenaire actif ou en discussion sans point focal (4 sur 6 dans la démo). | Moyenne | **Fait** (lot 11) : point focal obligatoire pour passer « En discussion » ou « Actif », et le dernier ne se retire pas ; une fiche ancienne sans point focal est signalée |
| PA-5 | Rien ne signale une relation sans échange depuis longtemps (date de dernière note connue mais non exploitée). | Basse | **Fait** (lot 12) : une relation vivante sans échange noté depuis six mois est signalée (« sans contact ») |
| PA-6 | Données de démo : aucun partenaire rattaché à un projet ou une activité du portefeuille, contacts presque vides. | Moyenne (démo) | **Fait** (lot 9) : le FFDT commanditaire du schéma national et interlocuteur de l'audience ; le ministère à la commission interministérielle ; un contact principal pour cinq partenaires |

### Ce qui fonctionne bien

- Un annuaire unique, avec repérage des doublons et fusion tracée.
- Un cycle de relation fixe, des motifs obligatoires pour suspendre, clore ou rouvrir.
- Une relation encore liée par un accord en vigueur ne peut pas être close.
- La fiche rassemble accords, documents, dossiers, réunions, courrier et contrats du partenaire.
- La confidentialité cache la fiche à qui n'y a pas part ; l'IA ne touche à rien ; tout est tracé.

### Décisions ouvertes

- PA-1 : qui gère les partenaires (DG, direction des partenariats, service dédié) ?
- PA-2 : le point focal peut-il suspendre une relation, ou seulement le demander ?
- PA-3 : qui lit les notes d'échange ? **Décidé le 18/11/2026 : gestionnaires, points focaux et direction.**

---

## 13. Conventions

### Rôle

Le registre des accords avec les partenaires : conventions de partenariat, protocoles d'accord, et
leurs avenants. Un accord suit un cycle :

- **Préparation** : type (référentiel), titre, texte, parties (au moins un partenaire, un chef de
  file), référence du partenaire, dates d'entrée en vigueur et d'échéance, reconduction tacite,
  entité, point focal, confidentialité.
- **Signature** : un accord contraignant passe au parapheur ; son texte est scellé pendant le
  circuit. Signé, il entre en vigueur ; rejeté, il revient en préparation et le point focal est
  prévenu. Un accord non contraignant, ou signé sur papier, est déclaré en vigueur par un
  gestionnaire (date de signature jamais future).
- **En vigueur** : numéro CONV/AAAA/NNNN, texte figé. Rappels avant l'échéance à 90, 30 et 7 jours.
  Un accord échu sans reconduction tacite se lit « échu ».
- **Avenant** : seul un accord en vigueur se modifie, par avenant (même type, mêmes parties, nouvelle
  échéance éventuelle).
- **Résiliation** : réservée aux gestionnaires, motif obligatoire.

Pièces de collaboration : jusqu'à 100 par partenaire, rattachées ou non à un accord ; une pièce
officielle ne se supprime pas. L'IA ne pose aucun acte.

### Ce que la démo contient

| Référence | Objet | Parties | État | Période | Point focal |
|---|---|---|---|---|---|
| CONV/2025/0001 | Appui à l'élaboration des schémas provinciaux d'aménagement | FFDT, MFUH | En vigueur | 10/01/2025 → 10/01/2027 | Fiston |
| — | Prolongation d'un an et extension à une quatrième province (avenant) | FFDT, MFUH | Préparation | — | Fiston |
| — | Partage des données cartographiques et formation des cadres provinciaux | UFGL | Au parapheur | → 20/11/2029, tacite | **aucun** |
| — | Comité conjoint de suivi des plans d'urbanisme | MFUH | Préparation | — | La DG |

Les six comptes voient les quatre accords.

### Cas d'usage

- **Fiston, point focal, envoie l'avenant au parapheur.** C'est lui qui compose le circuit : il peut
  désigner comme signataire final n'importe quelle personne qui a accès au parapheur, c'est-à-dire
  tout le monde dans la démo, agents compris. L'outil vérifie seulement que la dernière étape est une
  signature et que l'auteur ne figure pas dans le circuit. À la signature, l'avenant entre en vigueur
  avec son numéro. Rien n'impose que la signature finale soit celle de la DG, qui représente
  l'Agence.
- **La convention avec le FFDT arrive à échéance le 10/01/2027**, dans moins de 90 jours. Le rappel
  part vers le point focal ; l'avenant de prolongation est toujours en préparation.
- **La DG veut savoir combien le FFDT apporte.** L'accord n'a aucun champ financier (montant,
  contribution de chaque partie, échéancier de décaissement) : l'information est dans le texte, ou
  ailleurs. Le risque « Retard de décaissement du bailleur » (score 20) n'est pas relié à cet accord.
- **La convention avec l'université est au parapheur sans point focal** : quand elle sera signée ou
  rejetée, seul son auteur sera prévenu.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| CV-1 | Le circuit de signature d'un accord est composé librement par qui l'envoie : n'importe quelle personne ayant accès au parapheur peut être signataire final, et sa signature fait entrer l'accord en vigueur. | Haute | **Fait** (lot 4) : un accord engage l'Agence : la signature finale revient à la DG (droit « Signer au nom de l'Agence ») ou à son délégataire |
| CV-2 | Aucun volet financier : montant, contributions, échéancier de décaissement. (Décision « finance des partenariats » déjà reportée dans le plan de travail.) | Moyenne | **Décidé et fait** (lot 8) : montant, devise, contribution de l'Agence et de chaque partie, fixés pendant la préparation ; l'échéancier reste pour plus tard |
| CV-3 | Tous les profils voient tous les accords non confidentiels, texte compris. | Basse | **Décidé et fait** (lot 7) : un agent voit les accords de son entité ou qu'il suit ; la direction voit tout le non-confidentiel |
| CV-4 | Un accord peut être préparé et envoyé au parapheur sans point focal. | Moyenne | **Fait** (lot 11) : un accord ne part pas au parapheur sans point focal |
| CV-5 | Les risques ne se rattachent pas à un accord (voir RI-5). | Basse | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : voir RI-5 : un risque se rattache à un accord |
| CV-6 | Un avenant en préparation n'empêche pas l'échéance de l'accord principal : aucune alerte croisée « échéance proche, avenant non signé ». | Basse | **Fait** (lot 12) : le rappel d'échéance signale l'avenant pas encore signé |

### Ce qui fonctionne bien

- Cycle complet et verrouillé : préparation, parapheur, vigueur avec numéro et texte figé, avenant,
  résiliation motivée.
- Le texte est scellé pendant le circuit ; un rejet ramène l'accord en préparation et prévient le
  point focal.
- La date de signature ne peut pas être future ; l'échéance ne peut pas précéder l'entrée en vigueur.
- Rappels automatiques à 90, 30 et 7 jours de l'échéance ; état « échu » calculé.
- Une relation partenaire ne se clôt pas tant qu'un accord la lie (module Partenaires).
- Une pièce officielle ne se supprime pas ; l'IA ne pose aucun acte.

### Décisions ouvertes

- CV-1 : qui signe un accord au nom de l'Agence (DG seule, ou délégataires désignés par type) ?
- CV-2 : ajoute-t-on maintenant le volet financier des accords ? **Décidé le 18/11/2026 : oui, montant et devise.**
- CV-4 : le point focal est-il obligatoire avant la signature ?

---

## 14. Parapheur

### Rôle

Le circuit de visa et de signature des documents de l'Agence. Un document (titre, nature, texte,
domaine, entité, échéance, confidentialité) reçoit un numéro PAR/AAAA/NNNN et suit un circuit
d'étapes que compose son auteur :

- étapes successives d'**avis**, de **visa** ou de **signature** (20 au plus), la dernière étant
  toujours une signature ;
- l'auteur ne figure jamais dans le circuit et ne vise jamais son propre document ;
- au lancement, le texte est scellé par une empreinte : il ne se modifie plus pendant le circuit ;
- chaque intervenant approuve ou rejette (motif obligatoire) ; un rejet renvoie le document à son
  auteur, qui peut le corriger et relancer le circuit ;
- à la dernière signature, le document est signé et l'auteur prévenu ; les modules qui passent par
  le parapheur (conventions) en tirent la suite (entrée en vigueur).

**Délégations** : chacun peut déléguer son parapheur à un collègue pour une période ; le délégataire
agit alors à sa place, et son nom est enregistré.

Onglets : à signer, mes documents, tous, délégations ; export de la liste.

### Ce que la démo contient

| Référence | Document | Auteur | Circuit | État |
|---|---|---|---|---|
| PAR/2026/0001 | Note au ministère de tutelle | Fiston | Signature : la DG | En attente de la DG, échéance 18/11 |
| PAR/2026/0002 | Convention de partenariat avec l'Université fictive des Grands Lacs | **La DG** | Signature : **Fiston** | En attente de Fiston |

Aucune délégation en cours.

### Cas d'usage

- **La DG a préparé elle-même la convention avec l'université.** Comme l'auteur ne peut pas figurer
  dans son circuit, elle ne peut pas la signer : le signataire désigné est Fiston, chef de
  département. À sa signature, la convention entrera en vigueur au nom de l'Agence. C'est le cas
  CV-1 vécu dans la démo.
- **Fiston doit faire signer une note au ministère, rédigée sous Word.** Le parapheur n'accepte pas
  de fichier : il faut recopier le texte dans le champ « texte ». La signature porte sur ce texte
  saisi, pas sur le document qui partira réellement. Rien n'est produit en sortie (document signé
  avec mention des visas et signatures).
- **L'assistante veut savoir ce qui attend la DG au parapheur.** L'onglet « Tous » ne lui montre rien :
  il ne liste que les documents dont on est auteur ou intervenant. Elle peut ouvrir un document si
  elle en connaît le lien, mais pas voir la pile de la DG.
- **La DG part en mission dix jours.** Elle délègue son parapheur à un collègue. Rien ne limite la
  durée, ni le choix du délégataire (un agent peut recevoir la signature de la DG), ni la portée (tous
  les documents, conventions comprises). Retirer une délégation l'efface de la liste.
- **Un document est rejeté puis relancé.** Le nouveau circuit repart de zéro : les visas et le motif
  du premier rejet disparaissent de la fiche (ils restent seulement dans le journal).

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| PH-1 | Le parapheur ne signe que du texte saisi : pas de fichier joint (lettre, note, convention en PDF ou Word), pas de document signé produit en sortie. | Haute | **Fait** (lot 8) : le fichier à signer est joint et scellé par son empreinte ; une fois signé, le bordereau des visas et signatures (PDF ou Word) cite l'empreinte du fichier signé |
| PH-2 | L'auteur compose librement le circuit : n'importe quel détenteur du parapheur peut être signataire final, y compris pour une convention. Et quand la DG est l'auteur, elle ne peut pas signer. | Haute | **Fait** (lot 4) : signature finale de la DG imposée pour les documents qui engagent l'Agence (convention, accord, avenant, contrat, protocole, acte) ; l'auteur peut signer en dernier après le visa ou l'avis d'une autre personne |
| PH-3 | Délégation sans limite de durée, de délégataire ni de portée ; une délégation retirée disparaît de la liste. | Haute | **Fait** (lot 4) : 30 jours au plus ; portée « visa et avis » ou « visa et signature » ; la signature ne se délègue qu'à un responsable ; une délégation retirée reste dans l'historique |
| PH-4 | Le secrétariat de la DG ne voit pas la pile de documents qui attendent la DG. | Moyenne | **Fait** (lot 11) : onglet « Parapheur de la DG » pour le cabinet (droit de pilotage), en lecture ; texte non transmis, intitulé confidentiel masqué |
| PH-5 | Après un rejet et une relance, les visas et le motif du premier circuit disparaissent de la fiche. | Moyenne | **Fait** (lot 5) : chaque circuit clos par un rejet est conservé (visas, auteurs, dates, motif) et se relit sur la fiche, sous « Circuits précédents » |
| PH-6 | Tous les profils ont accès au parapheur : chacun peut lancer un circuit vers la DG. | Basse | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : un document adressé à la DG passe par son secrétariat ou son cabinet : ils le lancent, ou le visent avant elle |

### Ce qui fonctionne bien

- Circuit ordonné avis, visa, signature ; la dernière étape est toujours une signature.
- L'auteur ne vise jamais son propre document ; le texte est scellé par une empreinte pendant le
  circuit.
- Rejet motivé, retour à l'auteur, relance possible.
- Délégation tracée : le nom de qui a réellement agi est enregistré.
- Le circuit déclenche la suite dans les autres modules (entrée en vigueur d'une convention).

### Décisions ouvertes

- PH-1 : le parapheur doit-il signer des fichiers (PDF, Word) et produire le document signé ?
- PH-2 : qui signe quoi (matrice nature du document → signataire) ?
- PH-3 : quelles limites pour les délégations (durée, délégataire, portée) ?

---

## 15. Courrier

### Rôle

Le registre officiel du courrier entrant et sortant (bureau d'ordre). Chaque courrier reçoit un numéro
ENT/AAAA/NNNN ou SOR/AAAA/NNNN et suit un cycle :

- **Enregistrer** (droit « enregistrer et imputer le courrier ») : sens, objet, correspondant (texte
  libre ou partenaire de l'annuaire, avec son contact), date du document, date de réception, délai de
  réponse, confidentialité, dossier (projet ou activité). Un sortant peut répondre à un entrant.
- **Imputer** : à une entité et à un agent, avec une instruction, un délai et des copies (pour
  information ou pour avis). Imputation en cascade : le chef de l'entité imputée confie le courrier à
  un agent de son entité.
- **Traiter** : l'agent imputé prend le courrier en charge, puis le clôture avec la référence de la
  réponse ; la direction peut le classer sans suite, avec un motif obligatoire.
- **Annoter** : les personnes concernées échangent des annotations, gardées dans l'historique.
- **Relancer** : un courrier en retard remonte une fois au chef de l'entité imputée (à défaut à
  l'agent, puis au bureau d'ordre).

Le courrier peut porter sa pièce numérisée (documents de dossier). Qui voit quoi : le bureau d'ordre
et les profils qui consultent le registre voient tout le non-confidentiel ; l'agent imputé, son chef
et les personnes en copie voient le courrier qui les concerne, même confidentiel.

### Ce que la démo contient

| Référence | Objet | Correspondant | Reçu | État | Imputé à | Délai |
|---|---|---|---|---|---|---|
| ENT/2026/0001 | Demande de données foncières | Ministère de tutelle | 11/11 | Imputé | Fiston (entité : ANAT) | 15/11, **en retard** |
| ENT/2026/0003 | Demande d'appui pour la révision des plans d'urbanisme provinciaux | Ministère fictif de l'Urbanisme et de l'Habitat | 14/11 | À imputer | — | 24/11 |
| ENT/2026/0002 | Invitation au forum régional | « Partenaire technique » | 15/11 | À imputer | — | 25/11 |

Historique de ENT/2026/0001 : « Enregistré au bureau d'ordre », « **Imputé à Nova Mobile** »,
« Imputé à Fiston Banza », tous par la DG.

### Tests réels

| Lecteur | Droits courrier | Voit | Résumé |
|---|---|---|---|
| La DG, l'assistante | Enregistrer, imputer, consulter | 3 | 2 à imputer, 1 en cours, 1 en retard |
| Fiston, Didier | Consulter le registre | 3 | Mêmes chiffres ; Fiston : 1 à traiter, en retard |
| Clarisse, Gaston | Aucun | 0 | Tout à 0 |

| Action | Résultat |
|---|---|
| Fiston impute un courrier qui ne lui est pas imputé | Refusé : pas le droit d'enregistrer et imputer le courrier |
| Didier clôture le courrier imputé à Fiston | Refusé : « Seuls l'agent imputé, son chef et la direction clôturent ce courrier » |
| Didier enregistre un courrier | Refusé |
| Gaston annote un courrier qui ne le concerne pas | Le courrier n'existe pas pour lui |

### Cas d'usage

- **Lundi, l'assistante ouvre le courrier.** Deux courriers reçus jeudi et vendredi attendent
  l'imputation de la DG ; un troisième, imputé à Fiston, est en retard depuis samedi. Le chef de
  l'entité imputée est prévenu une fois du retard, ici la DG elle-même, car le courrier est imputé à
  l'entité racine « ANAT ».
- **Le ministère écrit à l'Agence.** Il est choisi dans l'annuaire des partenaires, ce qui relie le
  courrier à la fiche du ministère. L'invitation au forum vient, elle, d'un « Partenaire technique »
  saisi en texte libre : elle ne remonte sur aucune fiche.
- **Un chef de département consulte le registre** : il voit tout le courrier non confidentiel de
  l'Agence, pas seulement celui de son département.
- **Un agent reçoit un courrier imputé** : il le voit, le prend en charge, l'annote et le clôture avec
  la référence de la réponse. Rien ne vérifie qu'un courrier sortant a bien été enregistré en
  réponse.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| C-1 | L'historique du courrier porte encore « Imputé à Nova Mobile » : les annotations figées gardent l'ancien nom de l'organisation de démonstration. | Basse (démo) | **Fait** (lot 1) : les textes figés du courrier portent les noms de l'Agence |
| C-2 | La clôture d'un courrier demande une référence de réponse en texte libre ; elle n'est pas reliée au courrier sortant enregistré. | Moyenne | **Fait** (lot 11) : la clôture d'un courrier entrant propose les courriers sortants enregistrés ; le choix relie les deux et reprend la référence |
| C-3 | Les chefs d'entité qui consultent le registre voient tout le courrier non confidentiel, pas seulement celui de leur entité. | Moyenne | **Décidé et fait** (lot 7) : un chef lit le courrier de son entité (et des entités rattachées) ; le secrétariat et la direction gardent le registre complet |
| C-4 | Un correspondant saisi en texte libre (« Partenaire technique ») ne se rattache à aucune fiche partenaire. | Basse | **Fait** (lot 12) : un correspondant tapé à la main qui ressemble à une fiche de l'annuaire propose son rattachement |
| C-5 | Imputer à l'entité racine « ANAT » fait remonter les retards à la DG elle-même. | Basse | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : l'imputation à l'entité racine est réservée à la DG |
| C-6 | Données de démo : la DG fait office de bureau d'ordre (enregistre et impute) ; trois courriers seulement, aucun sortant. | Moyenne (démo) | **Fait** (lot 9) : l'assistante tient le bureau d'ordre (enregistre et impute) ; deux courriers sortants répondent à des entrants |

### Ce qui fonctionne bien

- Numérotation séparée entrant et sortant, réponse reliée à l'entrant.
- Imputation en cascade limitée à son entité et à ses agents ; copies pour information ou pour avis.
- Classement sans suite réservé à la direction, avec motif obligatoire.
- Relance automatique, une seule fois, au chef de l'entité imputée.
- Confidentialité respectée : le courrier n'existe pas pour qui n'est pas concerné.
- Correspondant choisi dans l'annuaire des partenaires ; pièce numérisée possible.

### Décisions ouvertes

- C-2 : la clôture doit-elle obligatoirement désigner le courrier sortant de réponse ?
- C-3 : les chefs voient-ils tout le registre ou seulement le courrier de leur entité ? **Décidé le 18/11/2026 : le courrier de son entité.**
- C-5 : l'imputation à l'entité racine est-elle permise ?

---

## 16. Structure

### Rôle

L'organisation de l'Agence : « chaque entité porte sa fiche d'attributions et ses rapports avec les
autres ». La page compte sept onglets :

| Onglet | Contenu | Qui |
|---|---|---|
| Organigramme | L'arbre des entités (institution, directions, départements, services, antennes, représentations provinciales), leur chef, leurs équipes et leurs effectifs ; créer, renommer, déplacer, supprimer une entité vide | Tout le monde ; modifier : droit « structure » |
| Attributions | La fiche d'attributions de chaque entité (domaines dont elle est responsable ou qu'elle appuie), versionnée, préparée puis approuvée | Lecture : tout le monde ; préparer : DG et chefs ; approuver : DG |
| Écarts de participation | Comparaison entre attributions approuvées et activité enregistrée sur 90 jours (absence, consultation omise, réunion incomplète, hors attribution, chevauchement, concentration) — « un signal à examiner, jamais une sanction » | Profils de pilotage |
| Personnes | Chaque personne, son profil d'accès et son entité, modifiables directement dans la liste ; « Ajuster » ses droits | Gestion des membres |
| Profils et droits | Les profils d'accès (Agent, Chef d'entité, DG, DGA, Assistant(e) de direction…) et leurs droits | Gestion des profils |
| Référentiel des domaines | Les domaines d'activité de l'Agence | Lecture des attributions |
| Messagerie | Réglages du courriel de l'institution | Gestion de la messagerie |

Règles de l'organigramme : une seule entité racine ; pas de cycle (une entité ne passe pas sous une
de ses sous-entités) ; une entité ne se supprime que vide ; la racine ne se supprime pas.

### Ce que la démo contient

| Entité | Type | Rattachée à | Chef |
|---|---|---|---|
| ANAT (démonstration) | Institution | — | Bernadette |
| Direction technique | Direction | ANAT | Bernadette |
| Études et Prospective | Département | Direction technique | Clarisse |
| Ingénierie territoriale | Département | Direction technique | Fiston |
| Cartographie et SIG | Service | Ingénierie territoriale | Fiston |
| Suivi-évaluation | Service | Ingénierie territoriale | Gaston |
| Direction de la Communication et des Partenariats | Direction | ANAT | Didier |
| Communication | Service | Direction de la Communication et des Partenariats | Didier |
| Direction générale | Direction | ANAT | Bernadette |
| Ressources humaines | Service | Direction générale | Esther |
| Représentation provinciale Nord (exemple) | Représentation provinciale | ANAT | Fiston |
| Antenne Sud (exemple) | Antenne | ANAT | Fiston |

12 entités pour 6 personnes. Deux fiches d'attributions approuvées (ANAT et Direction technique) sur
12 entités. Deux écarts ouverts.

La liste des profils comprend un profil **« DG »**, mais Bernadette a le profil « Propriétaire ».

### Cas d'usage

- **Fiston est nommé directeur technique.** Dans l'organigramme, la DG le désigne chef de la
  Direction technique. Le changement est immédiat, mais il n'est pas journalisé, son profil
  d'accès ne change pas (il reste « Chef d'entité », sans les droits d'un directeur), et son dossier
  RH ne reçoit aucune nouvelle affectation.
- **Une personne change de service.** Dans l'onglet Personnes, on change son entité dans la liste
  déroulante : l'effet est immédiat, sans confirmation ni trace au journal, et l'historique des
  affectations du dossier RH n'est pas mis à jour. Le même changement fait depuis Ressources humaines,
  lui, ouvre une nouvelle affectation datée. Deux portes pour un même fait, qui ne produisent pas la
  même chose : c'est l'origine des écarts constatés en D-5 (Fiston rangé dans Cartographie et SIG
  alors qu'il dirige l'Ingénierie territoriale).
- **La DG lance l'analyse des écarts.** Les deux écarts ouverts parlent encore de « Direction Produit
  & Technologie » et de « Nova Mobile » : le texte a été figé avant le renommage de la démo.
- **Un chef de département prépare la fiche d'attributions de son entité** : seules 2 entités sur 12
  en ont une ; l'analyse des écarts ne porte donc que sur elles.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| S-1 | Changer le chef d'une entité, la renommer ou la déplacer, et changer l'entité d'une personne ne sont pas journalisés (seules la création et la suppression d'une entité le sont). | Haute | **Fait** (lot 5) : renommer, déplacer, changer le chef ou le type d'une entité, et changer l'entité d'une personne sont journalisés avec les noms d'avant et d'après |
| S-2 | L'entité d'une personne se change à deux endroits (Structure et Ressources humaines) avec des effets différents : seul le passage par les RH crée une affectation datée dans le dossier. | Haute | **Fait** (lot 5) : un seul effet, d'où que vienne le changement ; depuis Structure, il ferme aussi l'affectation en cours du dossier RH et en ouvre une nouvelle, datée |
| S-3 | Désigner une personne chef d'une entité ne touche pas à son profil d'accès, et rien ne signale l'écart (un Agent chef de service, un chef de département chef d'antenne). Même famille que A-3. | Haute | Décidé le 17/11/2026 avec A-3 : le serveur refuse (lot 3) |
| S-4 | Les listes déroulantes de profil et d'entité modifient immédiatement, sans confirmation. Un clic malheureux change les droits ou le rattachement de quelqu'un. | Moyenne | **Fait** (lot 11) : changer un profil ou un rattachement passe par une confirmation ; le profil exige un motif, contrôlé par le serveur et journalisé |
| S-5 | Un profil « DG » existe, mais la DG de la démo a le profil « Propriétaire ». Même famille que A-4. | Moyenne (démo) | **Fait** (lot 1) : la DG a le profil « DG » |
| S-6 | Les écarts de participation gardent un texte figé avec les anciens noms (« Direction Produit & Technologie », « Nova Mobile »). Même famille que C-1. | Basse (démo) | **Fait** (lot 1) : les écarts de participation portent les noms de l'Agence |
| S-7 | Seules 2 entités sur 12 ont une fiche d'attributions : l'analyse des écarts ne couvre presque rien. | Moyenne (démo) | **Fait** (lot 9) : fiches d'attributions approuvées pour les entités (rédigées par leur chef, approuvées par la DG) |
| S-8 | Structure de démo peu crédible : la DG dirige aussi la Direction technique ; un chef de département dirige aussi une antenne et une représentation provinciale ; les RH sont un service sans personne. | Moyenne (démo) | **Fait** (lot 1) : un chef distinct par entité ; le service RH a sa cheffe et ses agents |

### Ce qui fonctionne bien

- Organigramme lisible, avec types d'entités (direction, département, service, antenne,
  représentation provinciale), chefs, équipes et effectifs.
- Garde-fous de structure : une racine unique, pas de cycle, suppression d'une entité vide seulement.
- Fiches d'attributions versionnées et approuvées, base de l'analyse des écarts.
- Analyse des écarts présentée comme un signal, avec ses preuves, jamais une sanction.
- Changements de profil et de rôle contrôlés (on n'accorde pas un droit qu'on n'a pas) et journalisés.

### Décisions ouvertes

- S-2 : où change-t-on l'entité d'une personne (RH seulement, ou les deux avec le même effet) ? **Tranché le 18/11/2026 : les deux, avec le même effet.**
- S-3 : la désignation d'un chef doit-elle ajuster ou contrôler son profil ?
- S-4 : confirmation et motif pour les changements de profil ?

---

## 17. Équipes

### Rôle

Des groupes de travail qui portent des projets, hérités de Cadence (à la manière d'Asana). Une équipe
a un nom, une description, une couleur, une entité de rattachement facultative, une adresse de
service, des membres et un ou plusieurs responsables, et une visibilité :

| Visibilité | Effet |
|---|---|
| Publique | Tout membre de l'Agence la voit et la rejoint |
| Sur demande | Tout membre la voit et demande à la rejoindre ; un responsable accepte ou refuse |
| Privée | Invisible pour les non-membres ; seul un responsable ajoute des membres |

Règles : une équipe garde au moins un responsable ; un invité ne rejoint pas une équipe ; créer une
équipe et gérer ses membres demandent des droits distincts (« créer », « gérer », « rejoindre »).

### Ce que la démo contient

| Équipe | Visibilité | Entité | Responsables | Projet |
|---|---|---|---|---|
| Marketing | Sur demande | Communication | Didier | Campagne de lancement |
| Produit & Design | Publique | Études et Prospective | Clarisse | Refonte du site web |
| RH | Privée | Ressources humaines | Esther, la DG | RH · Recrutements 2027 |
| Équipe Mobile | Publique | Cartographie et SIG | Fiston | Application mobile v2 |

Les entités ont été renommées pour l'ANAT, les équipes non : leurs noms restent ceux d'une start-up.

### Cas d'usage

- **Clarisse est responsable de l'équipe « Produit & Design ».** Elle veut ajouter un collègue :
  refusé. Son profil (Agent) n'a pas le droit « gérer les équipes », et ce droit est exigé même du
  responsable de l'équipe. Même chose pour Esther, responsable de l'équipe RH avec un profil
  d'assistante.
- **Un agent cherche où travailler.** Il a « Mon entité » (son service, ses tâches, ses projets) et
  « Équipes » (des groupes qui portent aussi des projets). Les deux notions se recouvrent : l'équipe
  « RH » double le service « Ressources humaines », l'équipe « Marketing » double le service
  « Communication ».
- **Un responsable retire un membre de son équipe.** Le membre perd l'accès aux projets de l'équipe ;
  rien n'est journalisé.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| EQ-1 | Le responsable d'une équipe ne peut pas la gérer si son profil n'a pas le droit « gérer les équipes » (Clarisse, Esther). | Moyenne | **Fait** (lot 3) : être responsable d'une équipe suffit pour la gérer |
| EQ-2 | Équipes et entités se recouvrent : deux façons de regrouper les personnes et de porter des projets. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : les équipes restent pour les groupes transversaux (comités, groupes de travail) ; la page le dit ; rien n'est supprimé |
| EQ-3 | Ajouts, retraits et changements de responsable d'une équipe ne sont pas journalisés, alors qu'ils ouvrent ou ferment l'accès à des projets. | Moyenne | **Fait** (lot 5) : création, modification, ajout, retrait, changement de rôle, adhésion et réponse à une demande sont journalisés |
| EQ-4 | Données de démo : équipes de start-up (« Marketing », « Produit & Design », « Équipe Mobile »). Même famille que A-7. | Moyenne (démo) | **Fait** (lot 1) : Comité éditorial, Groupe de travail du site institutionnel, Comité de recrutement, Groupe projet SIG national |

### Ce qui fonctionne bien

- Trois visibilités claires, avec demandes d'adhésion pour les équipes sur demande.
- Une équipe garde toujours au moins un responsable ; un invité n'y entre pas.
- L'équipe privée est invisible pour les non-membres.

### Décisions ouvertes

- EQ-1 : le responsable d'une équipe la gère-t-il quel que soit son profil ?
- EQ-2 : à quoi servent les équipes à côté des entités ?

---

## 18. Ressources humaines

### Rôle

Le registre des agents, tenu par le service des ressources humaines (« premier jet, appelé à grandir :
carrière, congés, évaluation »). Il réunit pour chaque agent le dossier vu au module Mon dossier :
identité, situation administrative, affectation et son historique, diplômes, personnes à prévenir,
observations.

| Élément | Contenu |
|---|---|
| Onglet « Agents » | Matricule, nom, statut, grade, fonction, entité, date d'entrée, état du compte ; export Word ou PDF |
| Onglet « À identifier » | Les personnes qui ont un compte mais pas encore de dossier |
| « Nouvel agent » | Crée le dossier ; si la personne n'a pas de compte, l'ouvre avec le profil « Agent » (ou « Stagiaire », « Consultant » selon le statut) et lui envoie un lien pour choisir son mot de passe |
| Fiche de l'agent | Le dossier complet ; « Modifier » ; ajout et retrait de diplômes et de personnes à prévenir |

Règles : le service RH (« gérer les RH ») crée et tient les dossiers ; « consulter les RH » les lit
tous ; un chef lit ceux de ses agents ; personne ne modifie son propre dossier, pas même un
gestionnaire RH ; un changement d'entité ouvre une nouvelle affectation datée, avec la référence de
l'acte ; toute écriture est journalisée.

### Ce que la démo contient

| Matricule | Agent | Statut | Grade | Fonction | Entité | Entrée |
|---|---|---|---|---|---|---|
| AG-2026-0001 | M. Fiston Banza | Fonctionnaire | Ingénieur en chef | Chef du département Ingénierie territoriale | **Cartographie et SIG** | 02/02/2015 |
| AG-2026-0002 | Mme Clarisse Diala | **Contractuelle** | Attachée | Chargée d'études | Études et Prospective | 17/06/2019 |
| AG-2026-0003 | M. Gaston Kalala | Fonctionnaire | Ingénieur des travaux | Chef du service Suivi-évaluation | Suivi-évaluation | 08/01/2018 |
| AG-2026-0004 | M. Didier Lukusa | Fonctionnaire | Attaché principal | Directeur de la Communication et des Partenariats | **Communication** | 11/04/2016 |
| AG-DEMO-0001 | Mme Bernadette Mbuyi | Fonctionnaire | Administrateur civil principal | Directrice générale | Direction générale | 03/09/2012 |
| AG-2026-0005 | Mme Esther Mukendi | Fonctionnaire | Attachée principale | Assistante de direction | Direction générale | 01/10/2014 |

Personne n'est « à identifier ». Seule la DG accède au registre : les cinq autres comptes reçoivent
« Réservé au service des ressources humaines », y compris Esther, présentée comme cheffe des RH.

### Cas d'usage

- **Le service RH recrute un agent.** Il crée le dossier avec l'adresse électronique : le compte est
  ouvert d'office avec le profil « Agent », et le lien de mot de passe part. Le service RH ouvre donc
  aussi les accès informatiques, sans intervention de l'administrateur.
- **Le contrat de Clarisse, contractuelle, arrive à échéance.** Son dossier n'a pas de date de fin de
  contrat, et l'outil ne l'exige pas pour un contractuel. Quand une date est saisie, rien ne prévient
  à l'approche de l'échéance.
- **Un agent quitte l'Agence (retraite, fin de contrat, mutation).** Il n'existe pas d'acte de
  sortie : ni date ni motif de départ, ni clôture de l'affectation, ni suspension du compte. Le
  compte reste actif tant qu'un administrateur ne le suspend pas ailleurs.
- **Le service RH cherche les agents d'une direction, ou ceux qui partent à la retraite dans l'année.**
  La liste n'offre ni filtre par entité, statut ou grade, ni calcul de l'âge ou de la date de départ.
- **Le matricule.** L'outil attribue AG-2026-0001 à un agent entré en 2015 : le numéro suit l'année
  de saisie, pas l'année d'entrée. Le matricule officiel de l'agent peut être saisi à la main.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| RH-1 | Pas de sortie d'un agent : ni date, ni motif, ni clôture de l'affectation, ni suspension du compte. Le compte reste actif après le départ. | Haute | **Décidé et fait** (lot 8) : les RH saisissent l'acte de sortie ; à sa date, affectation close, compte suspendu, chef prévenu des tâches ouvertes ; un chef en poste est d'abord remplacé |
| RH-2 | Créer un dossier ouvre un compte d'accès automatiquement : le service RH ouvre les accès informatiques. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : les RH ouvrent le compte avec le profil le plus restreint du statut ; chaque ouverture est signalée aux administrateurs et journalisée |
| RH-3 | Aucune alerte sur les échéances : fin de contrat, fin de stage, départ à la retraite. Un contractuel peut n'avoir aucune date de fin. | Moyenne | **Fait** (lot 8) : date de fin obligatoire pour contractuels, stagiaires et consultants ; alertes à 90 et 30 jours (fin de contrat, retraite à 65 ans) au service RH et au chef |
| RH-4 | La liste n'a ni filtre (entité, statut, grade), ni indicateurs (effectifs par entité, pyramide des âges, départs prévus). | Moyenne | **Fait** (lot 11) : filtres par entité et par grade ; effectifs par entité, pyramide des âges, départs des douze prochains mois |
| RH-5 | Le matricule automatique suit l'année de saisie (AG-2026-…) et non l'année d'entrée ; le format diffère pour la DG (AG-DEMO-0001). | Basse | **Décidé (option prudente, en l'absence de l'utilisateur) et fait** (lot 13) : le matricule saisi par les RH fait foi ; le matricule provisoire suit l'année d'entrée |
| RH-6 | Dans la démo, seule la DG accède au registre ; la cheffe des RH n'a pas le droit « gérer les RH ». Même famille que D-8. | Moyenne (démo) | **Fait** (lot 1) : la cheffe du service RH accède au registre et tient les dossiers |
| RH-7 | Entité du dossier en contradiction avec la fonction (Fiston, Didier). Même famille que D-5 et S-2. | Moyenne (démo) | **Fait** (lot 1) : l'entité du dossier suit le rattachement ; depuis le lot 5, un changement d'entité ouvre une affectation datée (S-2) |
| RH-8 | Le module ne couvre ni congés (lot reporté), ni carrière (avancements, promotions), ni formation, ni évaluation, ni pièces (actes, contrats). Même famille que D-9. | Moyenne | **Décidé (option prudente, en l'absence de l'utilisateur)** (lot 13) : pièces, formations, évaluations et congés sont faits (lot 8) ; le prochain volet est la carrière (avancements, promotions) |

### Ce qui fonctionne bien

- Dossier complet, identique à ce que lit l'agent dans Mon dossier.
- Personne ne modifie son propre dossier ; l'agent est en lecture seule.
- Un changement d'entité ouvre une affectation datée avec la référence de l'acte.
- Création d'un agent et ouverture de son compte en une seule fois, avec profil selon le statut.
- Toute écriture est journalisée ; les personnes « à identifier » sont signalées.

### Décisions ouvertes

- RH-1 : quelle procédure de sortie (et qui suspend le compte) ? **Décidé le 18/11/2026 : les RH saisissent, le compte est suspendu à la date de sortie.**
- RH-2 : le service RH ouvre-t-il seul les comptes d'accès ?
- RH-5 : quel matricule pour l'ANAT ?

---

## 19. Administration système

### Rôle

« Réservée à l'administrateur système : état du système, paramètres, comptes, sessions, rôles et
droits, inscriptions, journal d'audit. » Le menu n'apparaît que pour un administrateur de la
plateforme.

| Onglet | Contenu |
|---|---|
| État du système | Comptes (actifs, invités, suspendus, sans double authentification), sessions, messagerie, stockage, volumes, sécurité (échecs de connexion, verrouillages), alertes ; bandeau d'information à tous |
| Paramètres de l'institution | Nom, logo, réglages généraux |
| Comptes | Créer, suspendre, réactiver un compte ; export CSV |
| Sessions | Les sessions ouvertes, révocables une à une |
| Rôles et droits | La matrice des droits par profil |
| Inscriptions | Les demandes d'accès à valider ou refuser |
| Journal d'audit | Toutes les actions tracées, filtrables par catégorie, gravité, personne ; « Analyse du journal » avec une appréciation par l'IA |

La double authentification (application d'authentification) existe pour les comptes.

### Ce que la démo contient (état du système le 17/11/2026)

| Mesure | Valeur |
|---|---|
| Comptes | 6 actifs, aucun invité, suspendu ou en attente |
| Comptes à droits élevés sans double authentification | **2** (alerte) |
| Sessions actives | 30 pour 6 personnes |
| Messagerie | **Non configurée** : les notifications ne partent pas par courriel (alerte) |
| Organisations | **2** (l'ANAT et une organisation de démonstration restante) |
| Volumes | 13 entités, 7 projets, 60 tâches dont 5 en retard, 16 réunions, 2 décisions, 3 courriers, 6 partenaires, 6 agents |

L'administrateur de la plateforme est **la DG elle-même** (Bernadette). Aucun autre compte n'y a
accès ; le profil « Responsable informatique » existe mais n'est attribué à personne.

### Cas d'usage

- **La DG est aussi administratrice système.** Elle crée et suspend des comptes, change les droits,
  révoque des sessions et lit le journal d'audit qui trace ses propres actions. Aucun contrôle
  croisé : la personne contrôlée et la personne qui administre le contrôle sont la même.
- **Le responsable informatique de l'Agence prend son poste.** Le profil existe, mais il n'est
  attribué à personne dans la démo ; il faudra aussi lui donner le rôle d'administrateur de la
  plateforme, qui ne s'attribue pas depuis l'interface de l'institution.
- **L'outil annonce « il est prévenu par notification et courriel ».** Tant que la messagerie n'est
  pas configurée, aucun courriel ne part : seules les notifications dans l'outil fonctionnent.
- **L'administrateur lance l'« Analyse du journal ».** Avec une clé d'IA configurée, des extraits du
  journal d'audit (noms, actions) sont envoyés au service d'IA extérieur pour une appréciation. Même
  question que I-9.
- **Deux comptes à droits élevés n'ont pas de double authentification.** L'outil le signale, mais ne
  l'impose pas.

### Remarques

| # | Constat | Gravité | Suite |
|---|---|---|---|
| AD-1 | La DG est administratrice de la plateforme : pas de séparation entre la direction et l'administration technique, ni de contrôle croisé du journal. | Haute | **Décidé et fait** (lot 4) : le responsable informatique est l'administrateur système ; la DG garde le pilotage et relit le journal de ses actions (page « Contrôle de l'administration », droit « Relire et viser le journal ») |
| AD-2 | La double authentification est proposée mais pas imposée aux comptes à droits élevés (2 sans, signalés). | Haute | **Fait** (lot 10) : sur un serveur exposé, la double authentification est exigée pour l'administration et les droits sensibles (pilotage de la DG, RH, courrier, partenariats, signature au nom de l'Agence) |
| AD-3 | La messagerie n'est pas configurée : aucun courriel ne part, alors que plusieurs écrans annoncent un envoi par courriel. | Moyenne | **Fait** (lot 11) : l'interface sait si la messagerie est en service et ne promet plus de courriel sinon |
| AD-4 | L'analyse du journal d'audit par l'IA envoie des données nominatives à un service extérieur. Même famille que I-9. | Moyenne | **Décidé et fait** (lot 7) : avec un service extérieur, l'appréciation du journal attend un accord explicite donné après avoir vu ce qui partirait |
| AD-5 | Une seconde organisation de démonstration subsiste (« Studio Lumen »). Même famille que A-7. | Basse (démo) | **Fait** (lot 1) : le second espace « Studio Lumen » est retiré de la démonstration |
| AD-6 | 30 sessions actives pour 6 personnes : les sessions s'accumulent (une par connexion) sans durée visible. | Basse | **Fait** (lot 12) : au-delà de dix sessions ouvertes, les plus anciennes sont fermées ; le compteur ignore les sessions inactives |

### Ce qui fonctionne bien

- Un état du système clair, avec des alertes utiles (double authentification, messagerie).
- Sessions visibles et révocables ; échecs de connexion et verrouillages comptés.
- Matrice des droits lisible par profil ; export des comptes.
- Journal d'audit filtrable par catégorie, gravité et personne ; accès réservé à l'administrateur.
- Bandeau d'information pour prévenir tous les utilisateurs (maintenance, consignes).

### Décisions ouvertes

- AD-1 : qui est administrateur système de l'ANAT ? **Décidé le 18/11/2026 : le responsable informatique ; la DG relit le journal de ses actions.**
- AD-2 : quels comptes doivent obligatoirement activer la double authentification ?

---

## Synthèse de l'analyse

Les 19 modules ont été analysés entre le 16 et le 17/11/2026, sans modifier le code. Les remarques se
regroupent en sept thèmes. Les traiter par thème plutôt que module par module évite de corriger
plusieurs fois la même cause.

| Thème | Remarques | Ce qu'il faut faire |
|---|---|---|
| 1. Droits et profils incohérents | A-3, A-4, A-6, E-7, F-7, RI-1, RI-2, PT-1, PA-1, EQ-1, S-3, S-5, RH-6, D-8 | Revoir la matrice des profils (DG, assistante, directeur, chef de service, agent, RH, informatique) ; aligner chef d'entité et profil ; cacher tout bouton que le serveur refuserait |
| 2. Validation humaine et contrôle croisé | T-1, T-2, T-3, DEC-1, DEC-3, I-1, I-2, I-4, R-3, CV-1, PH-2, PH-3, AD-1 | Qui valide quoi : clôture des tâches et décisions confirmées, signataire imposé par nature de document, délégations bornées, réouverture motivée, IA sans validation automatique |
| 3. Journal et traçabilité | D-3, S-1, S-2, EQ-3, PH-5 | Journaliser structure, rattachements, équipes, consultation des dossiers ; garder l'historique des circuits |
| 4. Une seule règle de calcul | A-2, P-1, P-2, F-1, F-3, RI-4, PT-3, R-1 | Une règle unique des retards, de l'état d'un projet, des décisions attendues ; indicateurs calculés quand la source est dans l'outil |
| 5. Confidentialité et données personnelles | D-1, D-2, I-9, AD-4, PA-3, F-4, DEC-6, R-8, CV-3, PT-6, C-3 | Qui lit quoi (portefeuille de la DG, comptes rendus, notes partenaires, dossiers RH) ; ce que l'IA peut lire et envoyer à l'extérieur |
| 6. Fonctions manquantes | PH-1, RH-1, RH-3, CV-2, D-4, D-9, PT-5, R-2, R-6, R-7 | Signature de fichiers, sortie d'un agent, alertes d'échéance RH, volet financier des accords, demande de correction, campagne de plans, intérim |
| 7. Données de démonstration | A-7, A-8, T-10, T-13, E-9, D-5, D-6, D-7, I-6, I-7, P-6, F-8, DEC-7, R-9, RI-8, PT-8, PA-6, C-1, C-6, S-6, S-7, S-8, EQ-4, AD-5 | Refaire une démo ANAT crédible : projets, équipes, entités peuplées, profils cohérents, décisions, courrier et partenaires reliés, plus aucun reste de start-up |

### Ordre de travail proposé

1. **Démo ANAT crédible** (thème 7) : rapide et nécessaire pour montrer l'outil ; corrige aussi une
   partie des incohérences de profils.
2. **Droits et profils** (thème 1), avec les décisions A-3, S-3, PA-1, RI-1, PT-1, AD-1.
3. **Validation humaine et traçabilité** (thèmes 2 et 3) : le cœur de la règle « l'IA propose, un
   humain décide » et « toute action sensible journalisée ».
4. **Règle unique de calcul** (thème 4).
5. **Confidentialité** (thème 5), après les décisions de la DG sur qui lit quoi.
6. **Fonctions manquantes** (thème 6), lot par lot, en commençant par PH-1 (signature de fichiers) et
   RH-1 (sortie d'un agent).

---

## Suivi des améliorations

### Lot 1 — Démonstration ANAT crédible (17/11/2026, branche `lot-demo-anat`)

Le contenu de démonstration hérité d'une start-up devient celui d'une agence d'aménagement, et les
entités sont peuplées. Seule la démonstration (ANAT_DEMO=1) est transformée ; le jeu des tests reste
inchangé. Code : `server/src/gov-demo-anat.ts` ; tests : `server/src/demo-anat.test.ts` (7 tests).

| Ce qui change | Avant | Après |
|---|---|---|
| Projets | Application mobile v2, Campagne de lancement, Refonte du site web, Plateforme de tests automatisés | Système d'information géographique national, Campagne d'information sur le schéma national, Refonte du site institutionnel, Numérisation des archives cartographiques |
| Tâches, étiquettes, commentaires, historique | Paiement, Apple Pay, iOS, App Store, panier, QA | Couches foncière, routière et hydrographique ; relevés de terrain ; formation des agents provinciaux… |
| Équipes | Marketing, Produit & Design, RH, Équipe Mobile | Comité éditorial, Groupe de travail du site institutionnel, Comité de recrutement, Groupe projet SIG national |
| Réunions | Plusieurs intitulées « Réunion » | Le nom du type : Comité de direction, Comité de pilotage des projets, Réunion avec les provinces |
| Coéquipiers IA | « Chef de projet IA », « analyste QA et triage », bugs | Chargé de suivi, analyste des données ; règle de tri sans vocabulaire de start-up |
| Second espace | Studio Lumen | Retiré |
| Personnes | 6 | 15 : un chef distinct par entité et des agents dans les services |
| Profils | La DG « Propriétaire » ; deux agents chefs de service ; l'assistante cheffe des RH | La DG « DG » ; chaque chef « Chef d'entité » ; les agents ne dirigent rien ; le service RH dirigé par sa cheffe, qui tient les dossiers |
| Dossiers RH | Entité contraire à la fonction ; nationalité « Fictivienne » | Affectation alignée sur le rattachement ; nationalité congolaise |
| Textes figés | « Imputé à Nova Mobile », écarts sur « Direction Produit & Technologie » | Noms ANAT |

Personnes ajoutées (fictives) : Albert Mwamba (Directeur technique), Jean-Pierre Kabongo (Chef du
département Études et Prospective), Patrick Ilunga (Chef du service Cartographie et SIG), Aimée Ngalula
(Géomaticienne), Samuel Kalonji (Chargé de suivi-évaluation), Sylvie Kasongo (Cheffe du service des
Ressources humaines), Rose Mbombo (Cheffe du service Communication), Joseph Tshibangu (Représentant
provincial Nord), Prisca Kanku (Cheffe de l'Antenne Sud).

**Remarques traitées** : A-3 (données), A-4, A-7, A-8, T-10, T-13, E-9 (en partie), D-5, D-7 (nationalité),
D-8, I-6, I-7, P-6, F-8, C-1, S-5, S-6, S-8, EQ-4, AD-5, RH-6, RH-7.

**Restent pour un lot suivant** : adresses en « @cadence.app » (D-7), rédacteur des comités et membres
convoqués (R-9), décisions, courrier, risques, plans et liens partenaires plus fournis (DEC-7, C-6, RI-8,
PT-8, PA-6), fiches d'attributions (S-7). Le journal d'audit de l'administration garde, lui, les noms
d'origine : il n'est pas réécrit.

### Lot 2 — Domaine principal et messagerie (17/11/2026, branche `lot-domaine-principal`)

Demandes de la direction : un espace pour le domaine principal du système, l'adresse noreply@ pour les
notifications, une connexion SSL/TLS, et la messagerie rangée dans Administration système.

| Ce qui change | Avant | Après |
|---|---|---|
| Domaine principal | Le champ existait en base mais aucun écran ne le réglait ; rien ne le contrôlait | Administration › Paramètres de l'institution › « Domaine principal » : format contrôlé, minuscules, sans doublon, réservé aux paramètres de l'institution, journalisé (« Domaine principal de l'institution modifié », événement sensible) |
| Adresses proposées | « mon-entreprise.fr » | prénom.nom@<domaine principal> à la création d'un compte et d'un agent |
| Adresse des notifications | Les notifications partaient de l'adresse de l'équipe | Réglable (ex. noreply@<domaine>) ; doit appartenir au domaine de la messagerie ; les réponses vont à l'équipe ou à l'entité concernée ; journalisée |
| Sécurité de la connexion | Libellé « TLS implicite » ; proposition STARTTLS | Libellé « SSL/TLS » ; une messagerie à configurer propose mail.<domaine>, SSL/TLS, port 465, noreply@<domaine> |
| Emplacement | Structure › Messagerie | Administration système › Messagerie |

Les valeurs propres à l'Agence (anat.gouv.cd, mail.anat.gouv.cd, noreply@anat.gouv.cd) se saisissent à l'écran au
déploiement : elles ne figurent ni dans le code ni dans le jeu de démonstration. Les personnes fictives de la
démonstration gardent leurs adresses d'exemple, pour qu'aucune notification ne puisse partir vers une vraie boîte de
l'Agence. Tests : `server/src/domaine.test.ts` (4) et `server/src/mail.test.ts` (2 ajoutés).

### Lot 3 — Droits et profils cohérents (17/11/2026, branche `lot-droits-profils`)

Thème 1 de la synthèse. Décision de la direction sur A-3 et S-3 : **refuser** de nommer chef une personne dont le
profil ne permet pas de diriger une entité.

| Ce qui change | Avant | Après |
|---|---|---|
| Chef d'entité et profil (A-3, S-3) | Un Agent, un Stagiaire ou un profil en lecture seule pouvait être nommé chef ; rien ne signalait l'écart | Nouveau droit « Pouvoir être nommé chef d'une entité » (Chef d'entité, DGA, DG, Responsable informatique, administrateurs). Le serveur refuse la nomination sans ce droit, et refuse aussi de donner à un chef en poste un profil ou une exception qui le lui retire : il faut d'abord désigner un autre chef |
| Bouton « Nouveau projet » (A-6, E-7, F-7) | Affiché pour tous, refusé ensuite par le serveur | Affiché seulement à qui a le droit de créer un projet : accueil, Portefeuille, Mon entité, page d'une équipe, palette de commandes |
| Registre des risques (RI-1) | Les chefs créaient des risques sans voir la page ; le responsable d'un risque ne pouvait rien y faire | Qui gère les risques voit le registre. Le responsable d'un risque le voit (la page s'affiche pour lui) et met à jour sa parade et son état, rien d'autre |
| Indicateurs stratégiques (RI-2) | « Gérer les risques » permettait de changer cible et résultat des indicateurs de la DG | Droit distinct « Gérer les indicateurs stratégiques » (DG, DGA) ; les chefs les lisent sans les modifier |
| Plans de travail (PT-1) | « Préparer les plans » valait pour toutes les entités | Un chef prépare le plan de son entité et des entités rattachées. Nouveau droit « Préparer les plans de toutes les entités » (DG, DGA, et le service du plan par exception) ; la fenêtre « Nouveau plan » ne propose que les entités permises ; même règle pour les revues trimestrielles |
| Partenaires (PA-1) | Seule la DG gérait l'annuaire | Dans la démonstration, le directeur de la Communication et des Partenariats reçoit le droit ; en production, il se coche dans Profils et droits |
| Équipes (EQ-1) | Le responsable d'une équipe ne la gérait que si son profil avait « gérer les équipes » | Être responsable de l'équipe suffit. « Gérer toutes les équipes de l'institution » reste au DG, au DGA et au responsable informatique |

Les bases déjà en service reçoivent ces droits par la migration `044_droits_profils.sql` : aucun chef en poste n'est
bloqué. Tests : `server/src/droits-profils.test.ts` (9) et un test de démonstration ; 18 anciens tests ajustés : 17 parce qu'ils
retiraient le profil de chef à une personne qui dirigeait une entité, 1 parce que le responsable d'un risque voit désormais les siens. 578 tests au vert.

**Remarques traitées** : A-3 (règle), A-6, E-7, F-7, RI-1, RI-2, PT-1, PA-1, EQ-1, S-3. A-4, S-5, D-8 et RH-6
l'avaient été par le lot 1. **Reste** : AD-1 (séparer administration technique et direction), traité avec le thème 2.

### Lot 4 — Validation humaine et contrôle croisé (18/11/2026, branche `lot-validation-humaine`)

Thème 2 de la synthèse : rien d'isolé, préparer n'est pas valider. Décisions de la direction : DEC-1 **confirmation
après coup**, DEC-3 **secrétariat ou DG**, I-1 **validation automatique supprimée**, AD-1 **responsable
informatique administrateur, la DG relit**. I-4 tranché dans le sens de la règle : la personne visée ne valide pas.

| Ce qui change | Avant | Après |
|---|---|---|
| Tâche confiée (T-1, T-2) | Le chargé repoussait l'échéance, changeait l'intitulé ou la priorité sans que le responsable le sache | Ces trois champs restent à qui a confié la tâche (ou à un administrateur du projet). Le chargé « demande un report » (nouvelle date et motif) ; le responsable accepte ou refuse ; tout est tracé et notifié. Le responsable est prévenu des autres changements |
| Clôture d'une tâche confiée (T-3) | Un clic du chargé la sortait des retards | Le chargé la déclare réalisée ; elle reste en retard jusqu'à ce que le responsable confirme la clôture ou la renvoie avec un motif (écrit dans les commentaires). Une tâche que l'on se donne à soi-même se termine toujours d'un clic |
| Décision inscrite par le secrétariat (DEC-1) | Rien ne la distinguait d'une décision vue par la DG | Numérotée et suivie dès l'inscription, marquée « à confirmer par la DG » ; la DG est prévenue et confirme (onglet « À confirmer ») |
| Exécution d'une décision (DEC-3) | Le chargé la déclarait exécutée seul | Le chargé déclare l'exécution avec son compte rendu ; le secrétariat de la DG la confirme ou la renvoie avec un motif |
| Coéquipiers IA (I-1, I-2, I-4) | Validation automatique possible ; un refus n'arrêtait rien ; la personne visée validait | Plus de validation automatique ; « Refuser et arrêter » met fin à l'intervention, « Refuser, laisser continuer » la laisse poursuivre ; la personne visée par une proposition ne la voit pas à valider et ne peut pas la valider |
| Compte rendu validé (R-3) | Tout valideur pouvait le rouvrir | Seuls la personne qui l'a validé et la DG le rouvrent, avec un motif inscrit au journal ; valideur et rédacteur prévenus |
| Signataire d'un document qui engage l'Agence (CV-1, PH-2) | N'importe quel détenteur du parapheur pouvait signer une convention ; la DG ne pouvait pas signer ce qu'elle avait préparé | Convention, accord, avenant, contrat, protocole, acte : la signature finale revient à la DG (droit « Signer au nom de l'Agence ») ou à son délégataire. L'auteur peut signer en dernier si une autre personne a visé ou donné son avis avant |
| Délégations (PH-3) | Sans limite de durée, de délégataire ni de portée ; retirée, elle disparaissait | 30 jours au plus ; portée « visa et avis » ou « visa et signature » ; la signature ne se délègue qu'à un responsable (profil de chef, DGA, DG) ; retirée, elle reste dans la liste avec sa date de retrait |
| Administration (AD-1) | La DG était administratrice de la plateforme, sans contrôle du journal | Dans la démonstration, Cédric Ilunga, responsable informatique, est l'administrateur système ; la DG ne l'est plus. Page « Contrôle de l'administration » : la DG relit les actions de l'administrateur depuis la dernière relecture et vise le journal ; l'administrateur ne relit jamais ses propres actions |

Nouveaux droits, réservés à la DG : « Confirmer les décisions inscrites au nom de la DG », « Signer au nom de l'Agence »,
« Relire et viser le journal des actions de l'administrateur système ». Migrations `045` à `049` : les bases en
service gardent leur historique (décisions existantes réputées confirmées, règles IA repassées en validation humaine,
documents engageants repérés par leur nature).

Tests : `server/src/validation-humaine.test.ts` (19), `server/src/ia-validation.test.ts` (4) et un test de
démonstration ; 7 anciens tests ajustés à la nouvelle règle (tâche récurrente confiée, exécution d'une décision,
refus d'une action IA, réouverture d'un compte rendu, signature d'un accord) et la matrice des routes complétée.
602 tests au vert.

**Remarques traitées** : T-1, T-2, T-3, DEC-1, DEC-3, I-1, I-2, I-4, R-3, CV-1, PH-2, PH-3, AD-1.

### Lot 5 — Journal et traçabilité (18/11/2026, branche `lot-tracabilite`)

Thème 3 de la synthèse : toute action sensible est journalisée. S-2 a été tranché dans le sens le moins disruptif :
on garde les deux portes (Structure et Ressources humaines), mais avec le même effet.

| Ce qui change | Avant | Après |
|---|---|---|
| Structure (S-1) | Seules la création et la suppression d'une entité étaient tracées | Renommer, déplacer, changer le chef ou le type d'une entité est journalisé, avec les noms d'avant et d'après. Une modification sans changement n'écrit rien |
| Rattachement d'une personne (S-1, S-2) | Pas de trace ; depuis Structure, aucune affectation dans le dossier RH | Journalisé (« Entité d'une personne changée »), depuis Structure comme depuis les RH. Depuis Structure, l'affectation en cours du dossier RH se ferme et une nouvelle, datée, s'ouvre |
| Équipes (EQ-3) | Ajouts, retraits et changements de responsable non tracés | Création, modification, ajout, retrait, changement de rôle, adhésion et réponse à une demande sont journalisés, avec le nom de l'équipe et de la personne |
| Dossier d'agent (D-3) | La consultation par un tiers n'était pas tracée | Chaque consultation par une autre personne que l'agent est journalisée, une fois par lecteur et par demi-heure ; lire son propre dossier ne l'est pas |
| Parapheur (PH-5) | Après un rejet et une relance, les visas et le motif disparaissaient de la fiche | Chaque circuit clos par un rejet est conservé et se relit sur la fiche, sous « Circuits précédents » |

Le journal d'audit nomme ces nouveaux événements en français et les range sous « Organisation » ou « Ressources
humaines » ; les plus sensibles (chef d'entité, rattachement, consultation d'un dossier) sont marqués « importants ».
Migration `050_tracabilite.sql`.

Tests : `server/src/tracabilite.test.ts` (6). Aucun ancien test modifié. 608 tests au vert.

**Remarques traitées** : D-3, S-1, S-2, EQ-3, PH-5.

### Lot 6 — Une seule règle de calcul (18/11/2026, branche `lot-regle-calcul`)

Thème 4 de la synthèse. Décisions de la direction : F-3 **une seule notion de décision attendue**, PT-3 **poids saisi**.
Sans préférence exprimée sur P-2 et RI-4, l'option recommandée a été retenue : **l'indicateur se calcule quand la
source est dans l'outil**.

| Ce qui change | Avant | Après |
|---|---|---|
| Retards de tâches (A-2, P-1) | 4 au compteur du tableau de bord, 5 dans la vue par direction et sur l'Accueil | Une seule règle, écrite une fois : une tâche principale, confiée, non terminée, échue, dans un dossier non archivé. Le compteur du tableau de bord donne « 5 tâches, 1 suite d'activité » ; la vue par direction compte les mêmes 5 ; l'Accueil compte de même (les sous-tâches échues restent listées sans être comptées) |
| État d'un projet (F-1) | Déclaré dans Tous les dossiers et Projets, calculé dans la revue et le tableau de bord | Calculé partout, avec « déclaré : … » à côté quand ils divergent et les raisons au survol |
| Décisions attendues (F-3) | « 3 décisions attendues » face à « Arbitrages attendus : 0 » | Une seule notion : dossier marqué « décision attendue » ou arbitrage en attente, compté une fois. Tableau de bord : 3 (1 projet, 2 activités) ; revue : « Décisions attendues sur ces projets : 1 » |
| Indicateurs (RI-4, P-2) | Saisis à la main même quand l'outil connaît la valeur ; deux chiffres pour les recommandations | Un indicateur peut être relié à une source de l'outil : plans approuvés de l'année, recommandations réalisées, décisions exécutées de l'année, accords en vigueur. Son résultat se calcule seul et ne se saisit plus (refus explicite). Chaque indicateur affiche « calculé par l'outil » ou « saisi ». Dans la démonstration, « Plans de travail approuvés » et « Recommandations de réunion réalisées » sont calculés |
| Avancement d'un plan (PT-3) | Moyenne simple : un atelier pesait autant que la révision du schéma national | Chaque activité a un poids (1 par défaut) ; moyenne pondérée dans la liste des plans, la fiche du plan et la vue par direction |
| Libellé d'une réunion (R-1) | « Réunion » sur l'Accueil et dans Mon entité | Sans titre, une réunion prend son type ; la migration renomme les anciennes |

Les règles communes sont dans `server/src/rules.ts`. Migration `051_regle_calcul.sql`.

Tests : `server/src/regle-calcul.test.ts` (8). Aucun ancien test modifié. 616 tests au vert.

**Remarques traitées** : A-2, P-1, P-2, F-1, F-3, RI-4, PT-3, R-1.

### Lot 7 — Confidentialité et données personnelles (18/11/2026, branche `lot-confidentialite`)

Thème 5 de la synthèse. Décisions de la direction : D-2 **partie administrative pour le chef** ; F-4, DEC-6, R-8, CV-3,
PT-6 **un agent voit ce qui le concerne** ; C-3 **le courrier de son entité** ; I-9 et AD-4 **l'IA demande la
permission avant chaque lecture envoyée au service extérieur**. PA-3 suit la proposition de l'analyse.

| Ce qui change | Avant | Après |
|---|---|---|
| Dossier d'agent (D-1, D-2) | Le serveur renvoyait les observations des RH à l'agent et à son chef ; le chef lisait tout le dossier | Les observations restent au service RH. Le chef lit la partie administrative : situation, affectations, diplômes ; un bandeau le lui dit, les blocs personnels ne s'affichent pas |
| Ce qu'un agent voit du pilotage (F-4, DEC-6, R-8, CV-3) | Tout le non-confidentiel, pour tous | La direction (droit de pilotage) voit tout le non-confidentiel. Les autres voient ce qui les concerne : leur entité et les entités qu'ils dirigent, ce dont ils sont responsables ou chargés, les réunions où ils siègent, les projets dont ils sont membres. Le comité de direction reste à ses participants et à la direction |
| Budgets des plans (PT-6) | Visibles de tous | Réservés à la direction, aux chefs de l'entité et à qui prépare ou approuve les plans |
| Courrier (C-3) | Un chef voyait tout le registre non confidentiel | Un chef lit le courrier de son entité et des entités rattachées, et celui qui lui est imputé ou adressé en copie ; le secrétariat et la direction gardent le registre complet |
| Notes d'échange avec les partenaires (PA-3) | Lisibles de tous ceux qui voient l'annuaire | Réservées aux gestionnaires des partenariats, aux points focaux et à la direction |
| IA et service extérieur (I-9) | Le contenu lu partait sans le dire | Avec Claude (service extérieur), l'envoi de la tâche de départ et chaque lecture attendent l'accord d'une personne habilitée ; un refus arrête l'intervention. En mode démonstration, rien ne part. La règle est affichée sur la page des coéquipiers IA |
| Analyse du journal (AD-4) | Les données nominatives partaient au service extérieur | L'appréciation attend un accord explicite, donné après avoir vu ce qui partirait ; sans accord, seuls les signaux calculés localement s'affichent |

Tests : `server/src/confidentialite.test.ts` (11). 15 anciens tests adaptés : ils faisaient lire à un simple membre
ce qui ne le concerne plus ; la personne y lit désormais au titre de la direction (droit de pilotage), ce que chaque
test dit en commentaire. 627 tests au vert.

**Remarques traitées** : D-1, D-2, I-9, AD-4, PA-3, F-4, DEC-6, R-8, CV-3, PT-6, C-3.

### Lot 8 — Fonctions manquantes (18/11/2026, branche `lot-fonctions-manquantes`)

Thème 6 de la synthèse, livré en quatre étapes. Décisions de la direction : RH-1 **les RH saisissent, le compte est
suspendu** ; CV-2 **montant et devise** ; R-2 **le délégataire de la présidence** ; D-9 **pièces, formations,
évaluations et congés**.

| Ce qui change | Avant | Après |
|---|---|---|
| Sortie d'un agent (RH-1) | Le compte restait actif après le départ | Acte de sortie (date, motif, référence) saisi par les RH. À sa date, l'affectation se clôt, le compte est suspendu et ses sessions fermées ; le chef reçoit la liste des tâches encore ouvertes. Un chef en poste est d'abord remplacé |
| Échéances (RH-3) | Aucune alerte ; un contractuel pouvait n'avoir aucune date de fin | Date de fin obligatoire pour contractuels, stagiaires et consultants. Alertes à 90 puis 30 jours (fin de contrat, retraite à 65 ans) au service RH et au chef ; liste « Échéances à 90 jours » sur la page RH |
| Demande de correction (D-4) | L'agent ne pouvait rien signaler | « Demander une correction » depuis Mon dossier ; le service RH la traite depuis sa page, l'agent est prévenu, la demande reste au dossier |
| Contenu du dossier (D-9) | Ni pièces, ni formations, ni évaluations, ni congés | Pièces du dossier (actes, contrats ; RH et agent, pas le chef), formations, évaluations annuelles (RH et agent), congés et absences |
| Signature de fichiers (PH-1) | Le parapheur ne signait que du texte saisi | Le fichier (PDF, Word…) est joint, ouvert et téléchargé par les intervenants, scellé par son empreinte SHA-256 au lancement du circuit. Une fois signé, le bordereau des visas et signatures se produit en PDF ou en Word et cite l'empreinte du fichier signé. Fusionner fichier et bordereau en un seul PDF demanderait une bibliothèque de plus, non ajoutée |
| Intérim de la présidence (R-2) | Seule la présidence validait | Son délégataire (délégation de signature du parapheur) valide, avec la mention « par délégation » |
| Séance non tenue (R-6) | « Compte rendu à établir » indéfiniment | « Déclarer non tenue », avec un motif ; les convoqués sont prévenus ; rappel au rédacteur après deux jours |
| Rappel de convocation (R-7) | Aucun | Rappel au rédacteur d'une séance non convoquée à 7 jours |
| Campagne des plans (PT-5) | Aucune vue des entités sans plan | Bloc « Campagne » sur la page des plans : entités sans plan pour l'année, relance de leurs chefs par le service du plan |
| Volet financier des accords (CV-2) | Aucun | Montant, devise, contribution de l'Agence et de chaque partie, fixés pendant la préparation ; les contributions ne dépassent pas le montant |
| Congés et absences | Module prêt sur la branche `lot-conges`, jamais fusionné | Rapatrié : demande par l'agent, validation par son chef (ou les RH), absences constatées saisies par les RH, intérim. Son alerte de fin de contrat à 60 jours est retirée au profit de celle du dossier (90 et 30 jours) ; sa migration devient la 055 |

Migrations `052` à `055`. Tests : `rh-suite.test.ts` (7), `parapheur-fichier.test.ts` (3),
`fonctions-suite.test.ts` (5), `conges.test.ts` (rapatrié) ; 3 anciens tests ajustés (un contractuel a désormais
une date de fin) et le test d'alerte de fin de contrat du lot congés aligné sur l'alerte unique. 650 tests au vert.

**Remarques traitées** : PH-1, RH-1, RH-3, CV-2, D-4, D-9, PT-5, R-2, R-6, R-7.

### Lot 9 — Une démonstration vivante (18/11/2026, branche `lot-demo-complete`)

Dernières remarques du thème 7 (données de démonstration). Toutes les données restent fictives ; la démonstration se
recharge sans rien dupliquer.

| Remarque | Ce que la démonstration contient désormais |
|---|---|
| D-7 | Adresses en « @anat.example » (domaine fictif réservé à l'exemple), domaine de l'institution assorti, nationalité « Congolaise » |
| R-9 | L'assistante de la DG rédige les comités de direction et le point d'étape ; les sept membres du comité sont convoqués (un excusé au comité passé) ; le Suivi-évaluation rédige le comité de pilotage, la Représentation Nord la réunion avec les provinces |
| DEC-7 | Onze décisions : issues du comité de direction, de projets (SIG national, recrutements, site, archives) et d'activités (commission foncière, forum, manuel) ; neuf chargés différents ; deux inscrites par l'assistante et à confirmer par la DG  ; deux exécutées, déclarées par leur chargé puis confirmées par le secrétariat |
| C-6 | L'assistante enregistre et impute trois nouveaux courriers (bailleur, ministère, province) ; deux courriers sortants répondent à des entrants |
| RI-8 | Trois risques rattachés à des projets (images satellites, recrutement, contestation du schéma), chacun avec son responsable et sa parade ; l'indicateur « Provinces couvertes par un schéma » est relié au plan |
| PT-8 | Plans de la Direction générale et de l'Ingénierie territoriale, en préparation ; les activités du plan de l'Agence, toutes confiées à Fiston, sont réparties entre les directions |
| PA-6 | Le FFDT commanditaire du schéma national et interlocuteur de l'audience avec le bailleur ; le ministère à la commission interministérielle ; un contact principal pour cinq partenaires |
| S-7 | Une fiche d'attributions approuvée pour chaque entité qui n'en avait pas, rédigée par son chef et approuvée par la DG |

Code : `server/src/gov-demo-anat-life.ts`, appelé à la fin du contenu ANAT. Tests : 8 tests de démonstration ajoutés ;
le test de rechargement compte aussi les décisions et le courrier. 658 tests au vert.

**Remarques traitées** : D-7, R-9, DEC-7, C-6, RI-8, PT-8, PA-6, S-7. Toutes les remarques de l'analyse sont désormais
traitées ou décidées, sauf celles marquées « À décider » sans suite donnée à ce jour.

### Lot 10 — Remarques graves restantes (18/11/2026, branche `lot-remarques-graves`)

Les cinq remarques de gravité haute restées hors des thèmes de la synthèse.

| Ce qui change | Avant | Après |
|---|---|---|
| Responsable dans son entité (E-1) | Exclu de la charge et des chiffres : un directeur seul voyait « 0 » malgré un retard | Il compte dans les chiffres et la charge de son entité, en tête, avec la mention « Responsable » |
| Projets de l'entité (E-2) | Tout projet dont un agent est membre, compté dans plusieurs entités | « Portés » (rattachés à l'entité) et « en contribution » (un membre de l'entité y participe), comptés à part |
| Portefeuille du cabinet (F-2) | L'assistante de la DG ne voyait que 4 projets sur 6 | Le droit de pilotage donne la lecture de tous les projets non privés ; les projets privés restent à leurs membres |
| Décision sans suivi (DEC-2) | Chargé et échéance facultatifs | Obligatoires, sauf décision marquée « sans exécution à suivre » (prise de position, orientation), qui n'entre pas dans le suivi ; une décision de compte rendu sans chargé est inscrite sans exécution ; un arbitrage se tranche avec une échéance |
| Double authentification (AD-2) | Imposée aux seuls administrateurs | Sur un serveur exposé, exigée aussi pour les droits sensibles : pilotage de la DG (inscrire, confirmer), RH, courrier, partenariats, signature au nom de l'Agence, relecture du journal ; l'en-tête le rappelle à la personne concernée |

Migration `056_decision_sans_execution.sql`. Tests : `server/src/remarques-graves.test.ts` (6) ; 12 anciens tests
ajustés pour donner un chargé et une échéance à leurs décisions (ou les marquer sans exécution), et un test de Mon
entité aligné sur E-1 (le chef compte désormais avec ses propres tâches). 664 tests au vert.

**Remarques traitées** : E-1, E-2, F-2, DEC-2, AD-2.

### Lot 11 — Remarques moyennes à corriger (18/11/2026, branche `lot-remarques-moyennes`)

Les 22 remarques de gravité moyenne marquées « À corriger ». Celles qui attendent une décision restent ouvertes.

| Module | Remarques | Ce qui change |
|---|---|---|
| Accueil, Mes tâches | A-5, T-4, T-5, T-6, T-8, T-9 | Plus de doublon « Viser ou signer » ; entité et tâche parente affichées ; livrables en retard comptés avec les retards ; tâche hors projet pour soi, dans son entité de rattachement |
| Mon entité | E-3, E-4 | Chefs des entités rattachées présentés comme tels ; ouverture sur l'entité de rattachement |
| IA | I-3 | Une seule intervention à la fois par tâche |
| Tableau de bord, décisions | P-3, DEC-5 | Détail cliquable des retards ; dossier choisi dans le formulaire de décision |
| Réunions | R-4 | Recommandation publiée : annulée, jamais supprimée |
| Risques et indicateurs | RI-3, RI-6 | Historique daté et signé, tendance ; responsable prévenu |
| Plans | PT-4 | Date de début obligatoire à la soumission |
| Partenariats | PA-4, CV-4, PH-4 | Point focal obligatoire ; parapheur de la DG visible du cabinet |
| Courrier, structure, RH, administration | C-2, S-4, RH-4, AD-3 | Réponse choisie à la clôture ; confirmation et motif des changements de profil ; filtres et indicateurs RH ; pas de courriel promis sans messagerie |

Migrations `057_recommandation_publiee.sql` et `058_historique_risques_indicateurs.sql`. Tests :
`server/src/remarques-moyennes.test.ts` (15) ; tests existants ajustés pour donner un point focal aux relations et
accords, une date de début aux activités de plan, un motif aux changements de profil, et pour écarter la règle de
triage d'exemple quand un test lance un autre coéquipier sur la même tâche (I-3).

**Remarques traitées** : A-5, T-4, T-5, T-6, T-8, T-9, E-3, E-4, I-3, P-3, DEC-5, R-4, RI-3, RI-6, PT-4, PA-4, CV-4, PH-4, C-2, S-4, RH-4, AD-3.

### Lot 12 — Remarques basses à corriger (18/11/2026, branche `lot-remarques-basses`)

Les remarques de gravité basse marquées « À corriger » ou « À vérifier », traitées en l'absence de l'utilisateur, en
retenant chaque fois l'option la plus prudente.

| Domaine | Remarques | Ce qui change |
|---|---|---|
| Accueil et tableau de bord | A-9, A-10, P-4, P-7 | Bloc IA resserré ; libellés lisibles vers 800 px ; « Point de situation » distinct de l'assistant ; alerte de l'Agence dite à part |
| Mes tâches et Mon entité | T-7, E-5, E-6, E-10 | Livrables attendus visibles du valideur ; plus de réunion en double ; rappel à la présidence ; onglets lisibles |
| IA | I-5, I-8, I-10 | Propositions réservées à qui peut décider ; ton institutionnel ; mode démonstration expliqué |
| Contrats, plans, partenariats, courrier | F-5, PT-7, PA-5, CV-6, C-4 | Contrats lus selon son périmètre ; date locale partout ; relation sans contact signalée ; avenant non signé rappelé ; correspondant rattaché à sa fiche |
| Administration et démonstration | AD-6, D-6 | Sessions plafonnées ; historique d'affectation de la DG |

Point d'attention (F-5) : un chef d'entité qui gère les prestataires ne voit plus les contrats des autres directions ;
le cabinet de la DG (droit de pilotage) les lit tous. Tests : `server/src/remarques-basses.test.ts` (10), un test de
démonstration (D-6).

**Remarques traitées** : A-9, A-10, T-7, E-5, E-6, E-10, D-6, I-5, I-8, I-10, P-4, P-7, F-5, PT-7, PA-5, CV-6, C-4, AD-6.

### Lot 13 — Décisions prudentes (18/11/2026, branche `lot-decisions-prudentes`)

L'utilisateur, absent, a demandé de trancher seul les remarques « À décider » en retenant l'option la plus prudente.
Chaque choix ci-dessous est réversible ; il est à relire à son retour.

| Remarque | Option retenue | Pourquoi c'est la plus prudente |
|---|---|---|
| A-1, P-8 | Lien vers le tableau de bord sur l'Accueil de la direction, sans redirection ; « Saisir » non répété | Rien ne change de place sans prévenir |
| T-11, T-12, E-8 | Recherche et filtre ; vue « Tâches que j'ai confiées » limitée au suivi (pas au dossier) | Le suivi ne donne pas accès au reste du dossier |
| P-5 | Un chef lit la page de sa seule direction | Ni la liste ni les autres directions |
| F-6, DEC-4, R-5 | Aucune modification : règle actuelle confirmée et documentée | Ne pas affaiblir la trace (versions, numéros) |
| RI-5, CV-5, RI-7 | Rattachements et échéance de la mesure ; archivage d'un indicateur | Rien ne se supprime |
| PT-2 | Justification obligatoire de l'avancement saisi | Ce qui est déclaré est étayé |
| PA-2 | Demande de suspension, décision aux gestionnaires | Le point focal ne coupe pas seul une relation |
| PH-6 | Passage obligé par le secrétariat ou le cabinet pour ce qui va à la DG | Filtrage avant la signature de la DG |
| C-5 | Imputation à la racine réservée à la DG | La DG décide de ce qui lui revient |
| EQ-2 | Équipes gardées pour les groupes transversaux | Rien n'est supprimé |
| RH-2 | Profil le plus restreint et signalement aux administrateurs | Contrôle croisé RH / administration |
| RH-5, RH-8 | Matricule saisi qui fait foi ; carrière en prochain volet | Pas de numéro inventé quand l'officiel existe |

Migrations `059_avancement_justifie.sql` et `060_risques_rattaches_indicateur_archive.sql`. Tests :
`server/src/remarques-decisions.test.ts` ; quatre tests du parapheur ajustés (PH-6 : l'envoi passe par le cabinet).

**Remarques traitées** : A-1, P-8, T-11, T-12, E-8, P-5, F-6, DEC-4, R-5, RI-5, RI-7, PT-2, PA-2, CV-5, PH-6, C-5, EQ-2, RH-2, RH-5, RH-8.
