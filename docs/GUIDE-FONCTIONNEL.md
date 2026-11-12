# Guide fonctionnel — ANAT Pilotage

> Ce document explique **comment fonctionne l'outil dans son ensemble** : à quoi il sert au quotidien, qui fait quoi,
> ce que chaque écran affiche et ce que l'outil fait de lui-même (numéros, notifications, rappels, traces).
> Il décrit l'état réel de la branche `lot-partenaires` au 12 novembre 2026 ; ce qui n'existe pas encore est signalé
> comme tel (« **À construire** »).
>
> Documents voisins : `FONCTIONNEMENT-PAR-MODULE.md` (ce que fait chaque module, incohérences), `MODELE-INSTITUTIONNEL.md` (concepts, rôles, diagnostic), `CONCEPTION.md` (vision et conception des modules), `PARCOURS-METIER.md` (parcours détaillés),
> `PARAMETRAGE.md` (listes paramétrables), `DESIGN-SYSTEM.md` (règles d'écran), `PLAN-DE-TRAVAIL.md` (lots et journal).

---

## 1. À quoi sert l'outil

ANAT Pilotage est l'outil de travail et de pilotage de l'Agence. Il sert au quotidien à :

| Besoin | Où | En une phrase |
| --- | --- | --- |
| Gérer et suivre les tâches des agents d'une entité | Mes tâches, projets, Accueil | Un responsable confie une tâche à un agent, fixe une échéance et suit son état ; l'agent la voit dans « Mes tâches » et est prévenu. |
| Gérer les projets | Pilotage › Portefeuille, fiche projet | Le projet est le **dossier complet** : équipe, tâches, documents, livrables, contrats, réunions, décisions, risques, indicateurs. |
| Gérer les partenariats | Partenariats › Partenaires, Conventions | Un annuaire unique des tiers, leurs contacts, leurs documents, et le registre des accords conclus. |
| Programmer et suivre les réunions | Pilotage › Réunions | De la convocation au compte rendu validé, avec recommandations et décisions qui alimentent les registres. |
| Suivre les décisions | Pilotage › Décisions | Registre numéroté des décisions de la DG, avec leur exécution. |
| Traiter le courrier | Secrétariat › Courrier, Parapheur | Enregistrement, annotation et imputation par la DG, délais, réponse signée au parapheur. |
| Planifier l'année | Suivi-évaluation › Plans de travail | Plan annuel par entité, soumis, approuvé, réalisé par les projets et activités. |
| Piloter | Pilotage › Tableau de bord DG | Ce qui est en retard, ce qui attend une décision, ce qui arrive à échéance. |
| Administrer | Administration système | Comptes, profils, paramètres, **journal d'audit**. |

## 2. Les règles qui valent partout

Ce sont les règles d'une institution publique. Elles sont **contrôlées par le serveur**, pas seulement par l'écran :
un bouton masqué ne suffit jamais, la règle est vérifiée à chaque demande.

1. **Tout est tracé.** Chaque action qui crée, modifie, valide, signe, supprime ou consulte une pièce sensible laisse
   une trace : qui, quoi, quand, depuis quelle adresse, sur quel objet. Les connexions et échecs de connexion aussi.
   Une trace ne se modifie ni ne se supprime. Consulter l'analyse du journal ou l'exporter laisse aussi une trace.
2. **Rien ne se fait de manière isolée.** Ce qui engage l'institution passe par au moins deux personnes : le
   rédacteur d'un compte rendu ne le valide pas, celui qui soumet un plan ne l'approuve pas, l'auteur d'un livrable
   ne le valide pas, un document part au parapheur pour visa puis signature. L'analyse du journal signale tout cas
   où la même personne a préparé et validé.
3. **Ce qui est validé est figé.** Compte rendu validé, décision enregistrée, accord en vigueur, document signé :
   le texte ne se modifie plus. On corrige par un acte nouveau (réouverture motivée, décision de remplacement,
   avenant).
4. **L'IA propose, un humain décide.** Les coéquipiers IA rédigent, résument, proposent ; ils ne valident, ne
   signent, ne suppriment ni ne créent rien d'engageant. Leurs propositions attendent une validation humaine.
5. **Chacun voit ce qu'il a le droit de voir.** Les droits viennent du **profil** de la personne (Administrateur,
   Membre, etc.), ajustables individuellement, et de son appartenance aux projets. Ce qui est confidentiel reste
   masqué même dans les listes, les recherches et les fiches liées.
6. **Consulter d'abord, modifier ensuite.** Une fiche s'ouvre en lecture ; « Modifier » ouvre les champs. Fermer
   avec des modifications non enregistrées demande confirmation.
7. **Numéros officiels attribués par l'outil** : `DEC/2026/0001` (décision), `CONV/2026/0001` (accord),
   `ENT/2026/0142` et `SOR/2026/0098` (courrier), numéros de réunion et de parapheur. Jamais saisis à la main.
8. **Date locale.** Toutes les dates « aujourd'hui », échéances et retards sont calculés à l'heure de l'Agence.

## 3. Qui fait quoi

| Personne | Ce qu'elle fait dans l'outil |
| --- | --- |
| **Directeur·rice général·e (DG)** | Consulte le tableau de bord, annote et impute le courrier, enregistre les décisions, préside et valide les comptes rendus, signe au parapheur. |
| **Responsable d'entité** (direction, service, cellule) | Confie des tâches à ses agents et les suit dans « Mon entité », prépare le plan de travail de son entité, porte les projets, vise au parapheur. |
| **Agent** | Traite ses tâches, le courrier qui lui est imputé, ses recommandations de réunion ; rédige des comptes rendus ; tient les fiches partenaires dont il est point focal. |
| **Secrétariat / bureau d'ordre** | Enregistre le courrier, programme et convoque les réunions, rédige les comptes rendus. |
| **Gestionnaire d'un module** (partenariats, réunions…) | Profil qui porte le droit « gérer » du module : crée, modifie, archive, définit de nouveaux types. |
| **Consultant** (extérieur) | Compte limité aux projets de son contrat ; produit des livrables. |
| **Administrateur système** | Crée les comptes, règle les profils et les listes, consulte et analyse le journal d'audit. Ne connaît jamais le mot de passe d'autrui. |
| **Coéquipier IA** | Assistant : propose, résume, rédige ; ne décide jamais. |

Les droits se règlent par **profil** dans Organisation › Structure, onglet « Profils et droits » : chaque profil coche des droits
regroupés par domaine (Projets, Tâches, Réunions, Plans de travail, Livrables, Parapheur et courrier, Partenaires,
Pilotage, IA…). Un droit peut être ajouté ou retiré à une personne précise ; ce réglage est une action **critique**
du journal.

## 4. Se repérer dans l'écran

La **barre latérale** regroupe les espaces :

- **Accueil** (ce qui m'attend aujourd'hui), **Mes tâches**, **Mon entité** (espace de l'entité : tableau de bord, tâches hors projet, projets, suivi des agents), **Coéquipiers IA** ;
- **Pilotage** : Tableau de bord DG, Portefeuille, Décisions, Réunions ;
- **Suivi-évaluation** : Plans de travail ;
- **Partenariats** : Partenaires, Conventions ;
- **Secrétariat** : Parapheur, Courrier ;
- **Organisation** : structure (organigramme, attributions, personnes, profils et droits, messagerie), équipes ;
- **Administration système** (administrateur seulement).

En haut : recherche (raccourci `Ctrl K`), notifications, compte. Les écrans suivent trois formes :
**page** pour un dossier (projet, partenaire, accord, réunion), **tiroir** (panneau à droite) pour consulter une
fiche secondaire sans perdre la liste (contact, document, courrier, décision, trace du journal), **fenêtre** pour
décider (confirmer, motiver, valider).

---

## 5. Les usages, un par un

### 5.1 Tâches des agents d'une entité

**Ce qui existe.**
- Une tâche a un titre, une description, un **responsable** (l'agent), une **échéance** (et un début), une
  priorité, une colonne d'avancement (sections), des **sous-tâches**, des commentaires avec mentions, des pièces
  jointes et un historique.
- Les tâches s'affichent en **liste, tableau (kanban), calendrier ou chronologie**, comme dans Asana.
- **Mes tâches** rassemble tout ce qui est confié à la personne, tous projets confondus, avec aussi les livrables
  à produire ou à valider ; l'**Accueil** montre ce qui est dû aujourd'hui et en retard.
- Attribuer une tâche **prévient l'agent** (notification et courriel). Terminer une tâche prévient son créateur.
- **Rappels** : la veille de l'échéance, puis une fois en retard (jamais en boucle).
- Chaque changement (attribution, échéance, colonne, achèvement…) est tracé au journal ; attribution et échéance
  sont classées « importantes ».
- Les recommandations d'un compte rendu rattaché à un projet **deviennent des tâches** du projet.

**Tâches hors projet et suivi par le responsable (lot T1).**
- Une tâche n'est pas forcément dans un projet : chaque entité (direction, service, cellule) a son **registre de
  tâches**, créé à la première ouverture. Ses tâches ont tout ce qu'ont les autres (vues liste, tableau, calendrier,
  chronologie ; sous-tâches, commentaires, pièces, rappels, traces) mais n'apparaissent pas au portefeuille.
- **Mon entité** (barre latérale, sous « Mes tâches ») est l'espace de travail de l'entité, à la manière d'Asana :
  - **Vue d'ensemble** — le tableau de bord. En tête, les **réunions** : « Réunions de l'entité » (la prochaine
    séance de chaque série, donc la réunion hebdomadaire est toujours là, et les réunions d'une entité parente où
    l'entité est convoquée) et « Où vous êtes attendu·e ». Puis les tâches ouvertes (et non attribuées), en retard, dues sous 7 jours,
    terminées en 30 jours, taux d'achèvement ; **activité des 8 dernières semaines** (tâches créées et terminées,
    semaine par semaine, avec infobulle et données en tableau) ; **échéances** (en retard, sous 7 jours, plus tard,
    sans échéance) ; **tâches ouvertes par priorité** ; pour le responsable, la **charge de chaque agent** (en retard
    et autres tâches ouvertes) ; listes « En retard » et « Cette semaine » (un clic ouvre la tâche) ; **projets de
    l'entité** avec leur avancement ;
  - **Liste, Tableau, Calendrier, Chronologie** — les vues des tâches de l'entité, comme dans un projet : on crée
    une tâche directement dans une colonne, sans passer par un projet ;
  - **Réunions** — le module Réunions filtré sur l'entité (liste, tableau, calendrier ; convocation, compte rendu et
    validation inchangés). Le responsable **programme** les réunions de son entité (bouton « Réunion ») : toute
    l'entité est convoquée d'office et il en est le gestionnaire, sans avoir besoin du droit général de gestion des
    réunions. Une réunion où toute une entité est convoquée appartient à cette entité ;
  - **Projets** — les projets portés par l'entité, et ceux où son responsable ou ses agents sont invités, chacun ne
    voyant que ceux auxquels il a accès ; « Projet » en crée un nouveau, rattaché à l'entité, ouvert ou
    non à ses agents (ils en deviennent membres). Le responsable lit d'office les projets ouverts de son entité ;
  - **Suivi des agents** (responsable) : tableau par agent et liste des tâches filtrable par agent et par état. Le
    suivi couvre l'entité **et les entités rattachées**, et compte les tâches portées dans les **projets**, dans la
    limite des projets que le responsable peut lire ;
  - **Confier une tâche** (responsable) ou **Tâche** (agent) : intitulé, précisions, agent, échéance, priorité. L'agent
    est prévenu (notification et courriel) et la retrouve dans « Mes tâches », marquée « Tâche d'entité ». Confiée à
    un agent d'une entité rattachée, la tâche se range dans le registre de l'entité de cet agent.
- **Plus tard** : un module d'**évaluation** des agents pourra s'appuyer sur ces données (tâches tenues, délais,
  charge), toujours sous appréciation humaine.
- **Mes tâches** propose aussi « Tâche hors projet », rangée dans le registre de l'entité de la personne.
- **Tâches récurrentes** : dans la fiche d'une tâche, « Répétition » (chaque jour, chaque semaine, toutes les deux
  semaines, chaque mois, chaque trimestre, chaque année). La terminer fait naître **l'occurrence suivante**, une seule
  fois : mêmes intitulé, chargé, priorité, étiquettes et colonne, sous-tâches à refaire, échéance décalée d'une
  période (depuis l'échéance, ou depuis le jour même sans échéance). Choisir « Ne se répète pas » arrête la série.
  Une sous-tâche ne se répète pas seule : c'est la tâche qui la porte.
- Règles contrôlées par le serveur : seul le responsable (de l'entité ou d'une entité au-dessus) confie une tâche à
  quelqu'un d'autre ou modifie la tâche d'un autre agent ; un agent fait avancer les tâches qui lui sont confiées et
  celles qu'il a notées ; une tâche d'entité ne peut être confiée qu'à une personne de l'entité ; une personne
  extérieure à l'entité n'ouvre ni son registre ni son suivi, et les agents ne voient pas le suivi de leurs collègues.

**L'accueil** de chacun met en avant « Mes prochaines réunions » (convoqué, président ou rédacteur), avec les
convocations qui attendent une réponse.

### 5.2 Projets

Le projet est le **dossier complet** d'une action de l'Agence. Sa fiche (Pilotage › Portefeuille) réunit :

- **Identité** : nom, objectif, statut (en bonne voie, à risque, en difficulté…), entité porteuse, chef de projet,
  **commanditaire** (choisi dans l'annuaire des partenaires), confidentialité, **activité du plan** réalisée ;
- **Équipe et parties prenantes** : membres avec leur rôle dans le projet, consultants sous contrat, partenaires ;
- **Tâches** (§ 5.1), **Documents** du projet (§ 5.10), **Livrables** (validés par une autre personne que
  l'auteur ; tranche de paiement), **Contrats** de consultants (échéancier, payé / à payer), **Réunions**
  rattachées (comité de pilotage…), **Décisions**, **Risques**, **Indicateurs**, **Points d'avancement** ;
- l'**avancement** remonte au plan de travail et au tableau de bord.

Le portefeuille liste projets et activités, filtrables par statut, entité, province ; les droits de chaque
projet s'appliquent (un projet privé n'apparaît qu'à ses membres).

**Revue de portefeuille** (Portefeuille › Revue de portefeuille, profils de pilotage) : pour chaque projet, la santé
**déclarée** par son chef et la santé **calculée** d'après les faits, avec ses raisons écrites :
- *en difficulté* : échéance du projet dépassée, avancement inférieur de 30 points à l'attendu à date (au prorata
  du temps entre la création du projet et son échéance), deux livrables en retard ou plus, budget consommé au-delà
  de 110 % ;
- *à surveiller* : 15 points de retard sur l'attendu, un livrable en retard, budget consommé plus vite que le temps
  (20 points d'avance), tâches en retard, arbitrage attendu.
Un projet est **en écart** quand les faits sont plus graves que ce qui est déclaré : il vient en tête.

**Arbitrages** : depuis le tableau de bord du projet, son chef (ou un administrateur du projet) **demande un
arbitrage** à la DG — question, contexte, au moins deux options et leurs conséquences, l'option recommandée, la date
souhaitée. La question devient la *décision attendue* du projet sur le tableau de bord DG, et les personnes qui
enregistrent les décisions sont prévenues. Dans Portefeuille › Arbitrages, la DG choisit l'option, ajoute ses
observations et une échéance, puis **tranche** : la décision s'inscrit au **registre des décisions** (rattachée au
projet, son chef chargé de l'exécution) et le demandeur est prévenu. **Celui qui demande ne tranche pas.** Le
demandeur peut retirer sa demande tant qu'elle est en attente ; un seul arbitrage en attente par projet.

### 5.3 Partenariats

**Partenaires** (Partenariats › Partenaires) est l'**annuaire unique des tiers** : ministères, collectivités,
bailleurs, entreprises, ONG, cabinets.

- Fiche : nom, sigle, type et catégories (listes paramétrables, « Autre… » pour en créer), identifiant officiel,
  coordonnées, **points focaux** internes, confidentialité.
- **États** : Identifié → En discussion → Actif → Suspendu / Clos (motif obligatoire pour suspendre, clore,
  rouvrir). Un partenaire lié par un accord en vigueur ne se clôt pas.
- Onglets : Vue d'ensemble, **Contacts** (un principal ; un contact déjà cité s'archive au lieu d'être supprimé),
  **Accords**, **Documents** (décrits par type, § 5.10), **Dossiers** (projets, activités, contrats), **Réunions**,
  **Courrier**, **Historique** (notes d'échange datées, non modifiables).
- **Doublons** refusés (même nom, sigle ou identifiant) ; **fusion** d'un doublon avec tous ses liens.
- **Rapprocher l'existant** : les noms saisis librement avant l'annuaire sont proposés au rattachement, après
  relecture par un gestionnaire.

### 5.4 Conventions — ce que l'écran affiche

**Partenariats › Conventions** est le **registre des actes conclus avec les partenaires** : conventions, protocoles,
accords-cadres, contrats de financement, et leurs avenants. C'est l'équivalent du registre papier du service
juridique.

**En haut de l'écran**
- Le titre « Conventions et accords » et le bouton **Nouvel accord** (gestionnaires et points focaux).
- Des **onglets par état**, chacun avec son nombre :
  | Onglet | Ce qu'il contient |
  | --- | --- |
  | **Tous** | Tout le registre. |
  | **En vigueur** | Accords signés et actifs, numérotés. |
  | **En préparation** | Textes en cours de rédaction : encore modifiables, sans numéro. |
  | **Au parapheur** | Textes envoyés en signature : **scellés** pendant le circuit. Un rejet les renvoie en préparation ; la signature les fait entrer en vigueur. |
  | **Échus** | Date de fin dépassée sans reconduction tacite. |
  | **Résiliés** | Accords auxquels on a mis fin avant terme, avec motif. |
- Un **bandeau d'alerte** quand des accords en vigueur arrivent à échéance **dans les 90 jours** : « à prolonger
  par avenant, à dénoncer ou à laisser échoir ». Le point focal reçoit aussi des alertes à 90, 30 et 7 jours.
- Une **recherche** (objet, numéro, référence du partenaire, nom du partenaire) et un filtre **par type** d'accord.

**Le tableau** — une ligne par accord :
| Colonne | Contenu |
| --- | --- |
| **Numéro** | `CONV/AAAA/NNNN`, attribué à l'**entrée en vigueur** (année de signature). « — » tant que l'accord est en préparation ou au parapheur. |
| **Accord** | L'objet ; « Avenant n° X — » devant un avenant ; un cadenas si confidentiel ; le type en étiquette. |
| **État** | En préparation, Au parapheur, En vigueur, Échu, Résilié. |
| **Partenaires** | Le ou les partenaires liés (un accord peut être multipartite, avec un chef de file). |
| **Échéance** | Date de fin, avec un repère quand elle approche (≤ 90 jours) ou « reconduction tacite ». |
| **Point focal** | L'agent qui suit l'accord. |
| *(actions)* | Consulter ; **Modifier** et **Abandonner** seulement en préparation et selon les droits. |

**La fiche d'un accord** (clic sur une ligne) s'ouvre en lecture :
- **Texte de l'accord** (figé dès l'entrée en vigueur) ;
- **Parties** (partenaires, chef de file, référence chez le partenaire) ;
- **Dates et suivi** : signature, entrée en vigueur, fin, reconduction tacite, préavis, entité porteuse, point focal ;
- **Documents** : exemplaire signé, annexes (pièces officielles jamais supprimées ; téléchargements tracés) ;
- **Avenants** : chacun numéroté, il peut reporter l'échéance ;
- **Actions** selon l'état : *Soumettre au parapheur* (accord contraignant) ou *Déclarer en vigueur* avec
  l'exemplaire signé joint ; *Préparer un avenant* ; *Résilier* (motif et date, gestionnaire seulement).

**Ce que l'écran n'affiche pas encore** : les engagements chiffrés et l'échéancier des décaissements (volet
**finance**, reporté), les obligations de rapport devenant des tâches.

### 5.5 Réunions

**Pilotage › Réunions** — liste par étape, tableau, calendrier (jour, semaine, mois).

- À la création, on choisit :
  - **Réunion à venir** : date à partir d'aujourd'hui ; elle est *programmée*, puis *convoquée* ;
  - **Réunion déjà tenue** : date au plus tard aujourd'hui ; enregistrée directement *tenue* pour la traçabilité,
    participants notés présents, ni convocation ni série.
- Champs : type (référentiel), objet, date et heures, lieu ou visioconférence, convoquée et présidée par,
  rédacteur, **convoqués** (personnes, entités entières, contacts de partenaires, extérieurs), partenaires
  concernés, dossier rattaché, confidentialité, **récurrence** (série).
- **Convocation** : au moins 48 h avant (sinon urgence à confirmer) ; chaque convoqué est prévenu par courriel et
  répond *présent / excusé / représenté par*.
- **Ordre du jour** avec rapporteurs et pièces ; le point « suivi des recommandations précédentes » est ajouté
  d'office.
- **Compte rendu** : le rédacteur le rédige puis le **soumet** ; la présidence le **valide** (ou le retourne avec
  motif). Validé, il est numéroté, figé, diffusé ; ses **décisions** entrent au registre des décisions, ses
  **recommandations** deviennent des tâches du projet rattaché.

### 5.6 Décisions

**Pilotage › Décisions** — le **registre des décisions de la DG**.
- Numéro `DEC/AAAA/NNNN`, titre, texte (figé), date, chargé d'exécution, échéance, dossier rattaché, confidentialité
  héritée du dossier.
- **Exécution** à sens unique : à exécuter → en cours → exécutée ; rappels avant l'échéance et en retard.
- Une erreur se corrige par une **décision de remplacement** (l'ancienne reste lisible et renvoie à la nouvelle).
- Les décisions prises en séance arrivent ici automatiquement à la validation du compte rendu.

### 5.7 Courrier

**Secrétariat › Courrier** — le circuit du courrier d'une institution, du bureau d'ordre à la réponse.

1. **Enregistrer** (bureau d'ordre) : expéditeur (partenaire de l'annuaire et contact), date et référence de la
   lettre, objet, réception, **pièce numérisée** → numéro `ENT/AAAA/NNNN`.
2. **Annoter et imputer** (direction) : à une **entité** (son chef est prévenu) et/ou à un agent, avec une
   **instruction** (pour traitement, pour avis, pour information), un **délai**, une **annotation** libre et des
   **copies** pour information ou pour avis (chaque destinataire est prévenu et voit le courrier).
3. **Imputer en cascade** (chef d'entité) : le chef de l'entité imputée confie le courrier à un agent de son entité.
   Un agent ne réimpute pas.
4. **Prendre en charge** (agent) : le courrier passe « en traitement ».
5. **Traiter** : instruire, annoter, rattacher un dossier ; **répondre** par un projet de réponse au parapheur ; la
   réponse enregistrée en sortie (`SOR/AAAA/NNNN`) clôt l'entrant.
6. **Clôturer** (agent, chef ou direction) ou **classer sans suite** (direction, motif obligatoire).

Chaque étape s'inscrit au **fil du courrier** (enregistrement, imputations, annotations, copies, prise en charge,
clôture). **Chacun voit le courrier qui le concerne** — imputé, chef de l'entité imputée, en copie — même sans
accès au registre : c'est l'onglet **Mon courrier**. Le **tableau de bord** compte ce qui est à imputer, en cours,
en retard, traité ce mois, et ce qui vous attend. Rappels deux jours avant le délai, puis en retard ; le retard
remonte au chef de l'entité.

### 5.8 Parapheur

**Secrétariat › Parapheur** — circuit de visa et de signature.
- Un document est déposé avec son circuit (visa du directeur, signature de la DG…) ; chaque signataire est prévenu
  à son tour ; il **approuve** ou **rejette** avec commentaire.
- Le document est figé pendant le circuit. Une **délégation de signature** permet à un suppléant de signer, tracée.
- Signé, il alimente le dossier d'origine : accord en vigueur, réponse de courrier enregistrée en sortie.

### 5.9 Plans de travail

**Suivi-évaluation › Plans de travail** — un plan par entité et par année : activités avec cibles et
indicateurs ; **soumis** par l'entité, **approuvé** (ou renvoyé) par une autre personne ; révisable de façon tracée.
Les projets et activités qui réalisent une activité du plan **remontent leur avancement** dans le plan.

**Revue trimestrielle** (fiche d'un plan approuvé, « Revues trimestrielles ») : une revue par trimestre, à partir
du début du trimestre.
1. **Préparer** (service du plan ou chef de l'entité) : la revue relève pour chaque activité l'**avancement
   constaté** et l'**attendu** à la fin du trimestre (ou au jour même s'il court encore), et **propose une
   appréciation** — atteint, en bonne voie, en retard, compromis — que l'entité corrige.
2. **Expliquer** : toute activité en retard ou compromise exige **la cause de l'écart et une mesure corrective** ;
   la **synthèse** du trimestre est obligatoire ; difficultés et appuis demandés complètent.
3. **Soumettre** : la direction générale (droit d'approuver les plans) est prévenue.
4. **Valider** ou **retourner** avec un motif — jamais par celui qui a soumis. L'entité est prévenue ; une revue
   retournée se corrige et se soumet à nouveau. **Validée, elle est figée** : c'est la trace de ce qui a été dit.

### 5.10 Documents

Partout où un dossier en a besoin (partenaire, accord, projet, courrier, activité, réunion), on joint des documents
**décrits par type** : on choisit le type (contrat, rapport, note…, ou « Autre » en le précisant), son nom, puis
les champs propres au type apparaissent (date de production, date d'expiration, référence…). Les documents expirés
sont signalés. **Aperçu à la demande** (bouton œil) : PDF et images dans la page, Word, Excel et texte en lecture
structurée. Ouvrir ou télécharger une pièce sensible est tracé ; une pièce **officielle** ne se supprime pas.

### 5.11 Notifications et rappels

Chaque avis arrive dans la **boîte de réception** (cloche) et, selon vos préférences, **par courriel** signé
« ANAT Pilotage » avec le lien direct. Chaque avis porte son **domaine** (tâches, réunions, courrier, décisions,
parapheur, projets, partenariats, équipe) : la boîte se filtre par domaine, et **Préférences** permet de couper le
courriel d'un domaine (l'avis dans l'outil reste toujours). Un clic mène à l'endroit où agir.

| Événement | Qui est prévenu |
| --- | --- |
| Tâche attribuée ; tâche retirée ; tâche **modifiée** (échéance, priorité, intitulé, réouverture, colonne), en un seul avis qui résume les changements | Le nouveau chargé ; l'ancien chargé ; le chargé (jamais l'auteur du changement) |
| Échéance de tâche (veille, puis retard) | Le chargé ; **puis le chef de son entité**, une fois |
| Courrier imputé à l'entité ; imputé à un agent ; en copie ; nouvelle annotation ; délai proche ou dépassé | Le chef de l'entité ; l'agent ; la personne en copie ; l'agent ; l'agent puis son chef |
| Réunion convoquée ; **modifiée après convocation** (date, heure, lieu, lien) ; **annulée** ; compte rendu soumis, retourné, validé | Les convoqués ; présidence ; rédacteur ; participants |
| Recommandation, décision, livrable, plan, parapheur, accord, partenaire | Le responsable concerné (comme avant) |

### 5.12 Administration système

Réservée à l'administrateur système. Onglets :
- **État du système** : comptes (actifs, en attente, suspendus, jamais connectés), sessions ouvertes, messagerie
  (configurée, envois et échecs sur 7 jours), documents stockés, volumes (projets, tâches et retards, réunions,
  courrier et retards…), sécurité (échecs de connexion, verrouillages), **alertes** à traiter (droits élevés sans
  double authentification, messagerie absente…), et le **bandeau d'information** affiché à tous (maintenance,
  annonce, incident).
- **Paramètres de l'institution** : toutes les listes et leurs propriétés.
- **Comptes** : créer un compte (lien de finalisation), renvoyer le lien, réinitialiser, suspendre, nommer
  administrateur ; **exporter les comptes** en tableur ; le nom ouvre le **journal de la personne**.
- **Sessions** : les sessions ouvertes de toute la plateforme ; « Fermer » déconnecte la personne (tracé).
- **Rôles et droits** : la **matrice** des profils (en colonnes) et des droits (en lignes) : qui voit, fait et valide
  quoi.
- **Inscriptions** et **Journal d'audit** (§ 6).

### 5.13 Ressources humaines

**Organisation › Ressources humaines** (service RH) et **Mon dossier** (chaque agent).
- **Créer un agent** : identité (civilité, nom, prénoms, naissance, nationalité, situation de famille, pièce
  d'identité), coordonnées, situation administrative (statut, matricule attribué automatiquement, grade,
  catégorie, échelon, date d'entrée, fin de contrat), affectation (entité, fonction). **Créer un agent ouvre son
  compte** : il reçoit un lien pour choisir son mot de passe et accède à la **vue Agent** (profil Agent ; Stagiaire
  ou Consultant selon le statut).
- **Fiche de l'agent** : lecture d'abord, « Modifier » pour le service RH. Changer d'entité ou de fonction ferme
  l'affectation en cours et en ouvre une nouvelle (**historique des affectations**, avec l'acte). **Diplômes** et
  **personnes à prévenir** s'ajoutent et se retirent.
- **Qui voit quoi** : le service RH (droits « Consulter / tenir les dossiers ») voit tout ; l'agent voit son dossier
  et met à jour ses coordonnées, diplômes et personnes à prévenir ; le **chef d'entité** consulte les dossiers de ses
  agents. Onglet **À identifier** : les personnes sans dossier.

### 5.14 L'accueil selon le profil

L'accueil met en avant **ce qui vous attend** selon votre profil : courrier à imputer (direction) ou Mon courrier
(agent), documents à viser ou signer, retards de l'entité que vous dirigez, décisions à exécuter ; puis vos tâches et
**vos prochaines réunions** (convocations à répondre). Le détail « qui voit quoi » par profil est dans
`MODELE-INSTITUTIONNEL.md`.

### 5.15 Tableau de bord DG : la vue par direction

Sur le **Tableau de bord DG**, la carte **Par direction** donne une ligne par direction (les entités du premier
niveau sous l'institution), avec tout ce qui lui est rattaché (ses services, leurs agents) :
- une **appréciation** écrite — *Sous contrôle*, *Vigilance* ou *Alerte* — et ses **raisons** (projet en
  difficulté, activité du plan échue, décision en retard d'exécution, tâches en retard, courrier hors délai,
  recommandations en retard, activité du plan en décalage) ;
- les **projets** et leur santé (un projet sans entité suit celle de son responsable) ;
- le **plan de travail** de l'année (plans approuvés) : la barre montre le **réalisé**, le trait vertical
  l'**attendu à date** (au prorata du calendrier de chaque activité) ; 15 points d'écart signalent un décalage ;
- les **retards** : tâches de ses agents, décisions, courrier imputé, recommandations.

Un clic ouvre la **fiche de la direction** : appréciation et chiffres clés, **services rattachés** (même lecture, on
y descend d'un clic), ce qui a dépassé son échéance, la charge et les retards de chaque agent, ses projets, et son
plan de travail activité par activité (achevée, dans le calendrier, en décalage, échue). Les éléments confidentiels
ne sont ni comptés ni montrés ; un projet n'est listé qu'à ceux qui y ont accès. Réservé aux profils de pilotage.

### 5.16 Exporter

Partout, le bouton **Exporter** ouvre le choix du **format du fichier** :
- un **document officiel** (compte rendu de réunion) : **Word** (.docx, modèle officiel de l'agence, à retravailler)
  ou **PDF** (.pdf, à diffuser ou imprimer) ;
- un **registre ou un tableau** (réunions sélectionnées, décisions, courrier, plans de travail, agents, revue de
  portefeuille, arbitrages, comptes, journal d'audit) : **Excel** (.xlsx), **PDF**, **Word** ou **CSV**.
Les fichiers portent la charte de l'agence (logo, titres en bleu ANAT, pied de page daté et paginé). Un tableau
d'écran est exporté tel qu'il est affiché (filtres et onglet compris) : rien d'autre ne sort que ce que la personne
voit. **Chaque export est tracé** au journal (titre, format, nombre de lignes) ; les exports des comptes et du journal
d'audit le sont dans les événements de sécurité.

## 6. Le journal d'audit

**Administration système › Journal d'audit** réunit les deux traces que l'outil tient : le **fil d'activité**
(tout ce qui se fait dans les modules) et le **journal de sécurité** (connexions, comptes, droits, mots de passe).

**Chaque ligne** : date et heure, **auteur**, **gravité**, **domaine** (Partenariats, Décisions, Réunions,
Courrier, Parapheur, Projets, Tâches, Activités, Plans de travail, Documents, Organisation, Paramétrage, Sécurité),
**action** en clair (« Accord entré en vigueur », « Tâche attribuée », « Connexion refusée »…), **objet** (nom du
partenaire, titre de la décision, numéro, document, personne concernée). Un clic ouvre la trace complète dans un
tiroir (institution, adresse IP, source, code technique).

**Gravité**
| Gravité | Exemples |
| --- | --- |
| **Critique** | Toute suppression ; échec de connexion ; compte verrouillé ou suspendu ; rôle d'administrateur système accordé ou retiré ; 2FA désactivée ; mot de passe réinitialisé ; droits individuels modifiés ; fusion de partenaires ; résiliation d'accord ; rejet au parapheur ; sessions fermées ; configuration de la messagerie. |
| **Importante** | Ce qui engage l'institution : décision enregistrée ou exécutée, accord en vigueur ou au parapheur, avenant, réunion convoquée, compte rendu validé ou retourné, courrier imputé ou clôturé, visa ou signature, délégation, plan soumis ou approuvé, livrable validé ou payé, tâche attribuée, échéance changée, compte créé, profil changé, analyse ou export du journal. |
| **Normale** | Le reste : création, modification courante, consultation de document, connexion réussie. |

**Filtres** : recherche libre, domaine, gravité, auteur, période. **Exporter** produit un fichier tableur (CSV)
avec les mêmes filtres ; l'export est lui-même tracé.

**Journal par personne** (depuis la liste des comptes, ou en cliquant sur un auteur) : chiffres clés (connexions,
échecs, adresses distinctes, actions métier, traces critiques, dernière connexion), puis deux onglets :
**Connexions et sécurité** (y compris ce que d'autres ont fait sur son compte) et **Activités**. Exportable et
analysable.

**Analyse avec l'IA** — en deux temps, pour rester vérifiable :
1. l'outil calcule des **signaux** à partir des traces, chacun avec ses traces à l'appui :
   échecs de connexion répétés sur un compte ; changements sensibles de droits ou de sécurité ; suppressions en
   série ; **préparé et validé par la même personne** ; actions importantes hors des heures ouvrées ; consultation
   massive de documents ; connexions depuis de nombreuses adresses ; exports du journal ;
2. l'IA rédige une **appréciation** et des **mesures suggérées** à partir de ces seuls signaux. Elle ne conclut à
   aucune faute ; l'administrateur apprécie et décide des suites. L'analyse est inscrite au journal.

**Pas encore** : durée de conservation paramétrable (E2), navigateur utilisé à chaque connexion (E3), valeurs
« avant / après » pour chaque modification de champ.

---

## 7. Ce qui reste à construire

| Sujet | État |
| --- | --- |
| Finance des partenariats : engagements, échéancier des décaissements, tableau des bailleurs | Reporté à la demande (PA4) |
| Obligations de rapport d'un accord devenant des tâches du point focal | À construire (PA5) |
| CRUD complet sur les grilles hors partenariats (décisions, parapheur, plans, équipes, structure) | Partiel |
| Conservation paramétrable du journal, navigateur des connexions, valeurs avant / après | À construire (E2, E3) |
| Aperçu fidèle des documents Word | Plus tard |
