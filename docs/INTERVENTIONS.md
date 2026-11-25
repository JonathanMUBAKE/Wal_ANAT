# ANAT Pilotage — Dossier d'intervention

> Arrêté le 25 novembre 2026. Source : les rapports des six agents testeurs (un par profil), le rapport
> de lecture des cinq modules non parcourus, l'audit du serveur et de l'administration, l'audit
> d'accessibilité, l'audit du système de design, et les décisions prises en conversation les 24 et
> 25 novembre.
>
> **À lire d'abord** : `docs/CONTEXTE-INSTITUTIONNEL.md` — comment l'Agence fonctionne réellement, et
> pourquoi chacune de ces interventions est demandée. Un agent qui exécute cette liste sans avoir lu ce
> document produira un logiciel qui passe les tests et dont personne ne se sert.
>
> **Stratégie** : `docs/PLAN-INTERVENTION.md`. **Ordre d'exécution** : `docs/PLAN-DE-TRAVAIL.md` § 3 ter.
> **Ici** : le détail de chaque intervention, pour qu'un agent l'exécute sans rien redécouvrir.

## Mode d'emploi

Chaque intervention porte quatre champs.

- **Défaut** — ce qui ne va pas, avec sa preuve dans le code. Une preuve sans fichier est une opinion.
- **Change** — ce qu'on écrit. Précis, pas « améliorer ».
- **Test** — ce qui échoue aujourd'hui et passera demain. Écrit **avant** le code.
- **Fini quand** — le critère que quelqu'un d'autre peut vérifier.

Les références `file:ligne` valent pour `main` au commit `39bf8c9`. Un point marqué *(à localiser)* n'a
pas été vérifié ligne à ligne : le vérifier fait partie du travail.

---

# Chantier S1 — Fermer ce qui est ouvert

Six interventions. Rien d'autre ne commence tant que celles-ci ne sont pas faites.

## S1.1 — Un compte sans aucun droit dépose un document dans un dossier de projet *(AA1)*

> **Corrigé le 25 novembre 2026 : le constat était faux, et sa vraie cause est ailleurs.** La règle
> d'écriture **existe** — `dossier-documents.ts:63`, `write: role === "editor" || role === "admin"` —
> et elle est éprouvée : sans rôle 404, lecteur 403, commentateur 403, éditeur 200. Si le testeur a
> obtenu un 200 sous le profil « Lecture seule », c'est que **son compte tenait un rôle d'éditeur sur le
> projet** — ce qui est précisément le défaut S1.6 : un projet créé depuis l'accueil naissait avec des
> éditeurs que personne n'avait choisis. Le trou n'était donc pas dans les documents, il était dans la
> création des projets, et il est bouché.
>
> **Reste une question de modèle, qui revient au maître d'ouvrage.** La règle des documents s'appuie sur
> le **rôle tenu sur le projet**, jamais sur le profil. Un profil « Lecture seule », zéro droit sur
> cinquante-huit, peut donc écrire dans un dossier dès qu'on lui donne un rôle d'éditeur quelque part.
> Est-ce voulu ? Un profil sans aucun droit devrait-il pouvoir devenir éditeur par un rôle de projet ?

- **Ce qui a été fait** — Aucun code serveur modifié : il n'y avait rien à corriger. Un test couvre
  désormais les quatre cas (sans rôle, lecteur, commentateur, éditeur) sous le profil « Lecture seule »,
  pour que la règle ne puisse plus être perdue en silence.
- **Change** — Le droit d'écrire un document de dossier suit **le rôle tenu sur le projet** (décision de
  l'utilisateur, question 6). Un lecteur lit, un éditeur dépose, un invité sans rôle n'accède pas.
  La lecture suit la même règle que le reste du dossier.
- **Test** — Les quatre profils de `matrice.test.ts` contre la route de dépôt ; plus un test dédié :
  « lecture seule » reçoit 403, un éditeur 200, un membre d'une autre organisation 404.
- **Fini quand** — La route figure au contrat d'accès et aucun profil sans rôle ne peut écrire.

## S1.2 — Le secret médical sort par les notifications *(AD1)*

- **Défaut** — `leaves.ts:94-100` masque le type « maladie » en « absence » et vide le motif, mais
  seulement pour `get`, `list` et `summary`. L'avis au chef (`leaves.ts:296-303`) écrit le type dans son
  titre et **le motif en clair dans son corps** ; `decide()` (335-349) renvoie la ligne non masquée ;
  `notifyInterim` (309-318) nomme le type à l'intérimaire. Le commentaire du code énonce pourtant
  l'intention : « la DG voit l'absence, pas la maladie ».
- **Change** — Le masque devient le seul chemin de sortie : toute notification, toute valeur de retour
  d'écriture et tout export passent par lui. Le titre d'un avis de congé maladie dit « demande une
  absence » ; le motif n'y figure pas. Le service RH, et lui seul, voit le détail.
- **Test** — Un test qui demande un congé maladie, puis lit **la notification reçue par le chef** et
  vérifie qu'elle ne contient ni « maladie » ni le motif ; même chose pour l'intérimaire et pour le corps
  de la réponse de `decide`.
- **Fini quand** — Aucune chaîne du motif ni du type « maladie » n'atteint quelqu'un d'autre que l'agent
  et le service RH, par quelque route que ce soit.

## S1.3 — Les raisons budgétaires fuient par la route voisine *(AD2)*

- **Défaut** — `portfolio.ts:198-202` retire les montants et les raisons commençant par `budget` pour qui
  n'a pas `seesBudget`. `health()` (227-236) renvoie `reasons` tel quel à **tout lecteur du projet**, sans
  appeler `seesBudget` — dont « budget consommé à 125 % » (147-149).
- **Change** — Un seul masque du budget, extrait en fonction, appelé par `review()` **et** par `health()`,
  et par toute route future qui renvoie des raisons.
- **Test** — Un lecteur sans droit budgétaire appelle les deux routes : aucune des deux ne renvoie de
  montant ni de raison budgétaire. Un test de non-régression vérifie que les deux routes passent par la
  même fonction.
- **Fini quand** — `seesBudget` est appelé partout où des raisons sortent.

## S1.4 — Une demande d'arbitrage part hors du cercle *(AD12)*

- **Défaut** — `ask()` (`portfolio.ts:293-307`) notifie **tous** les détenteurs de `decisions.record`,
  avec le nom du dossier et la question, alors que `list()` filtre les projets privés et les activités
  confidentielles. `decide()` (309-355) ne vérifie pas la visibilité et n'empêche pas le cas où le
  demandeur est le seul décideur possible — il se refuse alors lui-même.
- **Change** — L'avis ne part qu'à ceux qui peuvent ouvrir le dossier. Si personne ne reste, la demande
  remonte explicitement à la direction générale et le demandeur en est informé, au lieu d'attendre.
- **Test** — Un dossier confidentiel, un détenteur de `decisions.record` qui n'y a pas accès : il ne
  reçoit rien. Et un arbitrage dont le demandeur est le seul décideur : la demande ne reste pas muette.
- **Fini quand** — Aucun titre de dossier confidentiel n'apparaît dans une notification hors cercle.

## S1.5 — Un consultant lit le contrat de mission d'un autre *(AA2)*

- **Défaut** — Relevé par le testeur des profils démunis : un consultant invité lit intégralement le
  contrat d'un autre — montant (18 000 USD dans la démonstration), échéancier, termes de référence.
  *(à localiser : la route de lecture d'un contrat dans `consultants` / `agreements.ts`)*
- **Change** — Un contrat de mission se lit par **ceux que le projet concerne** (décision de
  l'utilisateur, question 4) : le consultant titulaire, sa hiérarchie, et les membres du projet qui ont le
  droit d'en voir les engagements. Pas les autres consultants du même projet.
- **Test** — Deux consultants sur le même projet : chacun lit le sien, reçoit 403 ou 404 sur l'autre.
- **Fini quand** — Le montant d'un contrat n'est lisible que par le cercle défini, et la route est au
  contrat d'accès.

## S1.6 — Un projet naît ouvert à un comité privé *(AA3)*

- **Défaut** — Créé depuis l'accueil, un projet naît avec **trois éditeurs que personne n'a choisis**,
  dont la directrice générale : la liste « Équipe » n'offre qu'une entrée imposée (une équipe privée),
  l'accès par défaut est « Toute l'équipe », et aucun des deux boutons n'apparaît sélectionné. Le même
  geste depuis « Mon entité » est correct : quatre champs, une case explicite, les deux bonnes personnes.
- **Change** — Un projet naît ouvert à **l'équipe choisie, et à personne si aucune n'est choisie**
  (décision de l'utilisateur, question 5 : « suit la logique Asana »). Aucune équipe n'est imposée par
  défaut. Le formulaire de « Mon entité » sert de modèle au formulaire de l'accueil.
- **Test** — Création sans équipe : le projet a un seul membre, son créateur. Création avec équipe : ses
  membres et personne d'autre.
- **Fini quand** — Aucun projet ne naît avec un membre que son créateur n'a pas désigné.

---

# Chantier S2 — Faire dire la vérité au journal

## S2.1 — Une validation journalisée « approuvée » sans que rien ne s'exécute *(AD10)*

- **Défaut** — `decide()` (`ai/engine.ts:672-710`) passe la ligne à `approved`, **journalise
  `ai.approved` (698)**, puis cherche en mémoire l'attente correspondante. Si elle n'existe plus
  (redémarrage du serveur, ou approbation ouverte avant `init`), la ligne devient `expired` (710) et la
  réponse est 200. L'approbateur croit avoir engagé l'action, le journal l'atteste, et rien n'a eu lieu.
- **Change** — L'ordre s'inverse : on vérifie d'abord que l'attente existe. Si elle n'existe plus, 409
  avec un message qui dit pourquoi, **aucune écriture, aucun journal**. Le journal n'enregistre que ce
  qui a été exécuté.
- **Test** — Approuver une proposition dont l'attente a disparu : 409, la ligne reste en attente, aucun
  acte `ai.approved` au journal.
- **Fini quand** — Aucun acte journalisé ne peut correspondre à une exécution qui n'a pas eu lieu.

## S2.2 — Modifier une activité n'est pas journalisé *(AD7)*

- **Défaut** — `activities.ts:248-288` (`update`) n'appelle jamais `svc.log` ; `addFollowup` (297) et
  `setFollowup` (320) non plus. Seuls `create` (244) et `remove` (294) journalisent. Or `update` accepte
  `lead_id`, `confidential`, `plan_activity_id` et `health` (FIELDS, 57-78). Une activité confidentielle
  peut donc être ouverte puis refermée sans trace.
- **Change** — `update` journalise, avec **l'ancienne et la nouvelle valeur** pour `confidential`,
  `lead_id` et `health`. Le changement de responsable prévient le nouveau. Les suites sont journalisées
  aussi.
- **Test** — Lever la confidentialité d'une activité, puis la remettre : deux actes au journal, avec les
  deux valeurs ; et le nouveau responsable a reçu son avis.
- **Fini quand** — On peut répondre à « qui a ouvert ce dossier, et quand » sans lire la base.

## S2.3 — Une règle IA garde les droits de son premier auteur *(AD8)*

- **Défaut** — `saveRule` (`ai/engine.ts:880-936`) ne journalise rien ; seul `deleteRule` (944) le fait.
  À la modification, l'UPDATE (906-918) **ne change pas `created_by`**, et `ruleMayRun` (241-248) ne
  vérifie que les droits de celui-ci ; `checkOverdueRules` passe `requestedBy: r.created_by` (290). Un
  administrateur de projet sans `ai.delegate` peut donc réécrire la consigne d'une règle, et l'IA agira
  sous les droits d'un autre.
- **Change** — Modifier une règle exige de son éditeur le droit que la règle fait exercer, **et**
  réaffecte `created_by` à l'éditeur. Création et modification sont journalisées, avec la consigne avant
  et après.
- **Test** — Un éditeur sans `ai.delegate` modifie une règle : 403. Un éditeur qui l'a : la règle change
  d'auteur et l'acte est au journal.
- **Fini quand** — Aucune règle ne s'exécute sous les droits de quelqu'un qui n'a pas écrit sa consigne.

---

# Chantier S3 — Ouvrir ce qui est enfermé

## S3.1 — Un avenant bloqué par la résiliation de son accord *(AD4)*

- **Défaut** — `terminate()` (`agreements.ts:780-810`) ne regarde pas les avenants en cours. L'avenant
  reste au statut `signature` ; à la signature, `onSignature` → `enter` → `assertParentLive` (569-574,
  681) lève un 409 parce que le parent n'est plus en vigueur. `update`, `sign`, `activate` exigent
  `preparation` (477, 578, 647) et `remove` aussi (550). L'avenant ne peut donc ni entrer en vigueur, ni
  être supprimé, ni être rejeté — et la DG a signé un acte sans effet.
- **Change** — `terminate()` refuse tant qu'un avenant est en circuit, **ou** retire l'avenant du circuit
  avec un motif, au choix de la personne. Et `onSignature` traite l'échec du parent : l'avenant revient
  en préparation avec un message explicite plutôt que de rester en l'air.
- **Test** — Résilier un accord dont un avenant est au signataire : soit refus motivé, soit avenant
  retiré et journalisé. Dans les deux cas, aucun document ne reste signé sans effet.
- **Fini quand** — Le parcours d'un avenant n'a plus d'impasse.

## S3.2 — La sortie d'un agent ne se défait pas *(AD5)*

- **Défaut** — Une seule route, `POST /api/hr/agents/:id/exit` ; `exit()` lève 409 si `exit_on` est déjà
  posé. Aucune annulation n'est déclarée. `applyExit` suspend le compte, révoque les sessions et clôt
  l'affectation, mais ne touche pas à `agent_leaves` : les demandes `demande` et `approuve` restent
  ouvertes et l'agent reste intérimaire d'autres personnes.
- **Change** — Une route d'annulation, avec motif obligatoire et journal, qui rouvre le compte et
  l'affectation. Et `applyExit` règle les congés en cours (refus automatique motivé) et les intérims
  (réaffectation ou retrait).
- **Test** — Poser une sortie par erreur, l'annuler : compte actif, affectation rouverte, deux actes au
  journal. Et après une vraie sortie : aucune demande de congé de cet agent n'attend plus chez un chef.
- **Fini quand** — Une date de sortie saisie par erreur se corrige depuis le module RH, sans la base.

## S3.3 — Un agent enrôlé avant d'être validé *(AD3)*

- **Défaut** — `hr.ts:344` appelle `provisioning.enrolAgent` (compte, lien, insertion dans `org_members`
  373-376) et prévient les administrateurs (360-371) **avant** les contrôles : « date de fin obligatoire »
  pour contractuel, stagiaire ou consultant (380) et « a déjà un dossier » (378). La transaction du
  dossier ne commence qu'en 384.
- **Change** — Tous les contrôles d'abord. L'enrôlement et les avis ensuite, dans la même transaction que
  le dossier, ou pas du tout.
- **Test** — Créer un contractuel sans date de fin : 400, **et** aucun compte créé, aucun membre ajouté,
  aucun avis parti. Le second essai avec la date passe.
- **Fini quand** — Aucun état semi-créé n'est atteignable.

## S3.4 — Une proposition de l'IA sans décideur verrouille la tâche *(AD9)*

- **Défaut** — `checkpoint` (`ai/engine.ts:590-641`) crée l'approbation puis attend une promesse **sans
  délai**. Si la liste des approbateurs privée des cibles est vide (le demandeur est visé par sa propre
  proposition, ou n'a pas `ai.approve`), personne n'est prévenu (612-622). Et `start()` (298-306) refuse
  toute nouvelle intervention sur une tâche qui a une exécution en `waiting_approval` : la tâche est
  silencieusement fermée à l'IA, et les règles qui s'y déclenchent échouent sans bruit.
- **Change** — Une attente expire au bout d'un délai défini. S'il n'y a aucun décideur, on prévient le
  chef du projet et l'on n'ouvre pas l'attente. `start()` qui renvoie `null` dit pourquoi.
- **Test** — Une proposition sans décideur possible : l'attente n'est pas ouverte, un avis part au chef,
  la tâche reste utilisable. Et une attente laissée en plan expire et libère la tâche.
- **Fini quand** — Aucune tâche ne peut rester fermée à l'IA sans que personne ne le sache.

---

# Chantier S4 — Rendre les calculs exacts

## S4.1 — Un livrable se remet sans livrable *(Z2)*

- **Défaut** — La table `deliverables` n'a **aucune colonne de fichier** (colonnes vérifiées dans
  l'INSERT, `deliverables.ts:248`). Le consultant remet en deux clics, zéro champ, zéro pièce. Le valideur
  reçoit un statut et deux événements « sans commentaire », puis engage une tranche de paiement — 40 %,
  7 200 USD dans la démonstration.
- **Change** — Un livrable porte sa pièce. Une remise sans fichier est refusée (décision de
  l'utilisateur, question 1). Une fenêtre de remise à deux champs : le fichier, un mot au valideur.
- **Test** — Remise sans fichier : 400. Remise avec fichier : le document est lié au livrable et visible
  du valideur. Validation d'un livrable sans pièce : impossible.
- **Fini quand** — Aucune tranche de paiement ne peut être engagée sur un livrable sans document.

## S4.2 — Les congés sont validés moins bien qu'ailleurs *(AD6)*

- **Défaut** — `leaves.ts:40` n'a qu'une expression régulière là où le reste du serveur emploie
  `isRealDate` (`services.ts:220`) : « 2026-02-31 » atteint l'INSERT et la base répond 500.
  `workingDays` (`services.ts:211-218`) boucle jour par jour **sans borne** — `0001-01-01` à
  `9999-12-31` fait des millions d'itérations — et compte tous les lundis-vendredis **sans jours fériés**.
  Une demande du samedi au dimanche donne `days = 0` et passe (269). Aucun plafond de solde : `taken`
  (200-206) ne compte que par année de début.
- **Change** — `isRealDate` partout. Une borne de durée. Les jours fériés de l'Agence en référentiel. Un
  droit annuel par nature de congé, et un refus motivé au-delà. Une demande à zéro jour est refusée.
- **Test** — Une date impossible : 400, pas 500. Une demande qui couvre un jour férié : le jour n'est pas
  décompté. Une demande qui dépasse le solde : refus avec le solde restant. Une demande du samedi au
  dimanche : 400.
- **Fini quand** — Aucune demande de congé ne peut produire une erreur 500 ni un décompte faux.

## S4.3 — Les exécutions IA sont tronquées avant d'être filtrées *(AD11)*

- **Défaut** — `listRuns` (`ai/engine.ts:978-998`) applique `LIMIT` (50 par défaut) dans le SQL, sur
  **tous** les projets de l'organisation, puis filtre en mémoire sur les projets lisibles. Un agent dont
  les projets sont peu actifs ne voit rien et conclut que l'IA n'a rien fait.
- **Change** — Le filtre des projets lisibles entre dans le `WHERE`, avant la limite.
- **Test** — Cinquante exécutions sur des projets étrangers, une sur le sien : il voit la sienne.
- **Fini quand** — La pagination porte sur ce que la personne peut lire.

## S4.4 — Une demande de congé sans personne pour la décider *(AD14)*

- **Défaut** — `canDecide` (`leaves.ts:150-155`) exclut l'auteur et le saisisseur (151). Sans chef,
  l'approbateur est `null` et ce sont les gestionnaires RH qui reçoivent (296) — mais `to !== actorId`
  (297) retire le demandeur, et s'il est le seul détenteur de `hr.manage`, personne ne reçoit rien. De
  plus `approver_id` est figé à la création (256) et n'est jamais recalculé si le chef change.
- **Change** — Un repli explicite : sans décideur, la demande remonte à la direction générale. Et
  l'approbateur se recalcule à la lecture, au lieu d'être figé.
- **Test** — Le seul gestionnaire RH demande un congé : la demande arrive à la direction générale. Un
  chef change entre la demande et la décision : c'est le nouveau qui décide.
- **Fini quand** — Aucune demande ne peut rester en attente sans destinataire.

## S4.5 — La fusion de partenaires contourne la règle des accords *(AD13)*

- **Défaut** — `setState` refuse de clore une fiche qui porte un accord en vigueur
  (`partners.ts:726-735`), mais `merge` (804-888) transfère les `agreement_parties` vers la fiche gardée
  **sans regarder son état** ; il ne vérifie que `keep.merged_into` (810). On obtient un accord en vigueur
  dont la partie est close ou suspendue — état que `activate()` refuse justement (`agreements.ts:667-669`).
- **Change** — La fusion refuse une fiche gardée non active, ou exige de la rouvrir d'abord.
- **Test** — Fusionner vers une fiche close : 400. Vers une fiche active : 200, et l'accord reste
  cohérent.
- **Fini quand** — Aucun accord en vigueur ne peut avoir une partie close.

---

# Chantier S5 — Le temps

Prérequis de tout le chantier courrier. Détail complet au point **X16** du plan de travail.

## S5.1 — L'heure se vérifie, elle ne se croit pas

- **Défaut** — `localDate()` (`services.ts:181-183`) lit l'horloge de la machine
  (`getFullYear/getMonth/getDate`), sans aucun fuseau configuré nulle part dans le serveur. Sur un serveur
  réglé en UTC, un courrier enregistré à 00 h 30 à Kinshasa prend la date **et le rang** de la veille.
- **Change** — Une horloge de référence tenue par le serveur. Connecté, elle se vérifie sur un serveur de
  l'heure (NTP), ou à défaut sur l'en-tête `Date` d'un appel déjà fait. Hors ligne, elle repart du dernier
  temps enregistré augmenté du temps écoulé, mesuré par une horloge monotone. **Un recul est refusé** ;
  l'écart constaté au retour est journalisé et affiché au redémarrage.
- **Test** — Avancer l'horloge de la machine de deux mois : accepté, écart journalisé. La reculer d'un
  jour : refusé, et « aujourd'hui » ne change pas.
- **Fini quand** — Changer la date du poste ne change plus la date d'un enregistrement.

## S5.2 — Le fuseau est celui de la RDC

- **Défaut** — Aucun fuseau n'existe. Et la RDC en a deux : Kinshasa à UTC+1, Lubumbashi à UTC+2 — alors
  que l'Agence a des représentations provinciales et des antennes.
- **Change** — Le fuseau est porté par l'institution, et surchargeable par l'entité. « Aujourd'hui »,
  « en retard », « cette semaine » se calculent dans le fuseau de l'entité concernée.
- **Test** — Deux entités dans deux fuseaux, un même instant : chacune voit sa propre date.
- **Fini quand** — Aucun calcul de date n'emploie l'UTC brut ni l'horloge locale du processus.

## S5.3 — Le rang se déduit de l'année, sans réinitialisation

- **Défaut** — Le numéro `ENT/2026/0142` est **calculé** (sens, année, rang) et n'admet aucun suffixe.
  Une réinitialisation déclenchée au 1er janvier échouerait en silence si la machine est éteinte ce
  jour-là — question de l'utilisateur, « et si le système ne tourne pas pendant deux mois ? ».
- **Change** — Le rang n'est pas un compteur : c'est le n-ième courrier **de son année**, calculé à
  l'enregistrement. Il est **stocké**, avec un suffixe à côté (`0001A`, `0001B`) pour les insertions.
- **Test** — Enregistrer le premier courrier d'une année neuve : rang `0001`, sans qu'aucun travail
  planifié n'ait tourné. Insérer entre deux rangs : suffixe attribué.
- **Fini quand** — Aucun travail planifié n'est nécessaire au passage d'une année.

## S5.4 — L'unicité du rang hors ligne — **à trancher avant d'écrire**

- **Défaut** — Si deux postes enregistrent hors ligne, les deux attribueront le même rang.
- **Change** — Deux voies possibles, à choisir : *(a)* le rang n'est attribué qu'au serveur, et un
  courrier saisi hors ligne porte un numéro provisoire jusqu'à la synchronisation ; *(b)* chaque poste
  reçoit à l'avance une plage réservée. **Décision de l'utilisateur attendue.**
- **Test** — Deux enregistrements concurrents : deux rangs différents, jamais le même.
- **Fini quand** — Le registre ne peut pas contenir deux fois le même numéro.

## S5.5 — Pas de rattrapage mécanique des relances

- **Défaut** — Après un long arrêt, toutes les échéances expirées déclencheraient leurs relances d'un
  coup.
- **Change** — Au redémarrage, **un seul récapitulatif** par personne, au lieu de rejouer l'arriéré.
- **Test** — Deux mois d'échéances en retard : une notification, pas trente.
- **Fini quand** — Un redémarrage ne produit jamais plus d'un avis de rattrapage par personne.

---

# Chantier F1 — Les briques

## F1.1 — Les boutons *(T5)*

> **Corrigé le 25 novembre 2026, après examen.** Le constat d'origine — « 144 boutons hors de la
> brique » — reposait sur un comptage de balises `<button>`, et ce comptage était trompeur. Les 148
> balises ont été reprises une par une : **presque aucune n'est un bouton d'action**. Ce sont des lignes
> et des cartes cliquables, des déclencheurs de sélecteurs dont le contenu est une valeur affichée, des
> onglets, des liens textuels en ligne, des pastilles de couleur. Les convertir en `Button` aurait changé
> la forme et le comportement de ces écrans. Une seule balise méritait la conversion ; elle est faite.

- **Défaut réel** — Le système de design n'a **qu'une** brique interactive, `Button`, et **aucun mot**
  pour les cinq autres motifs qui existent pourtant partout : la ligne cliquable, le déclencheur de
  sélecteur, l'onglet, le lien en ligne, la pastille. Faute de brique, chacun est réécrit à la main —
  d'où les **100 hauteurs** posées une par une (`h-7`, `h-8`, `h-9`, `h-10`…), qui sont le vrai défaut.
  Le composant partagé, lui, est bien employé : quatre variantes (138 `primary`, 23 `ghost`, 13 `danger`,
  8 `ai`) et deux tailles (120 `sm`, 6 `lg`). **La palette d'accentuation est la bonne.**
- **Change** — Nommer les cinq motifs et donner une brique à chacun, dans `docs/DESIGN-SYSTEM.md` puis
  dans `components/ui.tsx`. C'est une décision de design avant d'être un travail de conversion.
  **Elle appartient au maître d'ouvrage** : voir la question ouverte en fin de dossier.
- **Fait** — `server/src/boutons-briques.test.ts` épingle les **143 balises brutes restantes**, par
  fichier, avec une raison écrite et un compte exact dans les deux sens. Aucune nouvelle balise ne peut
  plus apparaître en silence, et le jour où une brique naît, le test dit exactement ce qu'elle remplace.
- **Reste** — « Recharger » dans `components/ErrorBoundary.tsx` est un vrai bouton, laissé brut parce
  que le convertir change la couleur de l'écran de secours. Inscrit comme tel dans le test.
- **Fini quand** — Chaque motif interactif a sa brique, et la liste d'exceptions ne contient plus que des
  cas nommés par le design.

## F1.2 — Les champs *(T6)*

- **Défaut** — 91 `<input>`, 26 `<select>`, 20 `<textarea>` à la main, alors que `Field`, `Input`,
  `Select` et `Textarea` existent dans `components/gov.tsx` et portent le libellé permanent, le halo de
  focus et l'erreur sous le champ (règles 5.4 du système de design).
- **Change** — Tout champ passe par la brique. Un champ sans libellé permanent est un défaut.
- **Test** — F1.8.
- **Fini quand** — Idem.

## F1.3 — Les tableaux *(T7)*

- **Défaut** — 10 `<table>` à la main contre 8 appels de `DataTable` / `GroupedTable` : un tableau sur
  deux ignore la sélection, le tri, les actions de ligne et la pagination de la maison.
- **Change** — Tout tableau de données passe par `DataTable` ou `GroupedTable`. Un tableau de mise en
  page n'en est pas un.
- **Fini quand** — Les dix exceptions sont justifiées par écrit, ou supprimées.

## F1.4 — Les cartes locales *(T3)*

- **Défaut** — Trois composants `Card` locaux refont `Section` sans son filet :
  `pages/Pilotage.tsx`, `pages/Account.tsx`, `components/unit-dashboard.tsx`. Sur l'accueil, le filet
  existe de fait par un `border-t`, mais en retrait de 16 px au lieu d'aller d'un bord à l'autre.
- **Change** — Les trois disparaissent au profit de `Section`.
- **Fini quand** — `Section` est le seul composant de carte titrée.

## F1.5 — Les grilles de mois et les formulaires d'arrivée *(T3)*

- **Défaut** — Deux implémentations de grille de mois ; deux formulaires d'arrivée d'une personne
  (5 champs en `/admin`, 3 en `/org`, le second sans entité ni fonction).
- **Change** — Une seule de chaque. Le formulaire d'arrivée est celui qui demande l'entité et la fonction.
- **Fini quand** — Un seul chemin pour faire entrer quelqu'un.

## F1.6 — La brique « tâche » *(T2)*

- **Défaut** — La ligne, le tiroir et le formulaire de tâche se comportent différemment selon l'écran.
- **Change** — Un composant de ligne, un tiroir, un formulaire — quels que soient l'écran et l'origine
  (projet, entité, réunion, courrier, décision). Ce qui varie est **le niveau d'accès** et **le module**,
  jamais le comportement.
- **Test** — Un test de rendu qui monte la brique dans trois contextes et vérifie que les mêmes gestes
  produisent les mêmes effets.
- **Fini quand** — Un seul fichier décrit le comportement d'une tâche.

## F1.7 — La brique « ce qu'on me demande » *(T4)*

- **Défaut** — Chaque module tiendra son propre suivi : tâches de projet, actions de réunion, courrier
  pour traitement, décisions à exécuter. Personne ne saura où regarder le matin.
- **Change** — Une seule liste des charges d'une personne, alimentée par toutes les origines, avec
  l'origine affichée sur chaque ligne.
- **Fini quand** — « Mes tâches » montre tout ce qu'on attend de la personne, quelle qu'en soit la source.

## F1.8 — Le test qui interdit la rechute *(T8)*

- **Change** — Un test qui balaie `web/src` et échoue si une balise `<button>`, `<input>`, `<select>` ou
  `<textarea>` apparaît hors des fichiers de briques, sur le modèle de `server/src/droits-interface.test.ts`
  (liste d'exceptions nommées et justifiées, vérifiées).
- **Fini quand** — Le test passe et la liste d'exceptions est courte et justifiée.

---

# Chantier F2 — Brancher ce qui est déjà calculé

## F2.1 — Le brief du matin *(U1)*

- **Défaut** — `/api/pilotage` construit `brief` (cinq phrases prêtes, `pilotage.ts:327`) et le renvoie
  (361). `pages/Pilotage.tsx` le déclare dans son type (82) et **ne l'affiche nulle part**. Idem pour
  `recommendations.late_list`, `late_deliverables`, `open_gaps`, `ending_contracts`, `recent_decisions`.
  Mesuré en session : le serveur annonce « 1 document attend votre visa », « 3 décisions attendent votre
  arbitrage » — et les pastilles de la même page affichent 0.
- **Change** — Le brief s'affiche en tête de l'accueil. Les pastilles lisent les mêmes chiffres que les
  panneaux voisins. Les cinq listes alimentent les blocs correspondants.
- **Fini quand** — Aucune pastille ne contredit un panneau de la même page.

## F2.2 — L'accueil d'un consultant *(U2)*

- **Défaut** — Il annonce « 0 tâche ouverte · Rien à l'horizon » alors qu'un livrable est en retard de la
  veille, et `useLateDeliverables` existe déjà.
- **Change** — Les livrables en retard remontent sur l'accueil des profils qui en portent.
- **Fini quand** — Aucun accueil ne dit « rien à l'horizon » quand quelque chose est en retard.

## F2.3 — Le responsable d'une entité *(U3)*

- **Défaut** — L'écran d'entité ne nomme jamais son responsable, alors que `/api/units/:id/board` renvoie
  `unit.manager_id` et le membre `manager: true`. Un stagiaire ne sait donc pas à qui demander.
- **Change** — Le responsable est nommé en tête de l'écran d'entité, avec un moyen de le joindre.
- **Fini quand** — Un arrivant sait à qui s'adresser depuis le premier écran.

## F2.4 — L'échéance d'une parade au risque *(U4)*

- **Défaut** — `mitigation_due_on` est porté, validé et renvoyé (`registers.ts:613,641`) et absent de
  l'interface. Et `reminders.ts` n'a aucune source « risque » : une parade écrite n'est jamais relancée.
- **Change** — L'échéance s'affiche et se saisit sur la fiche du risque, et entre dans les rappels.
- **Fini quand** — Une parade avec échéance produit une relance.

## F2.5 — Le code de service dans la numérotation *(U5)*

- **Défaut** — `service_code` est accepté par la route de numérotation et jamais envoyé par l'écran :
  tous les comptes rendus portent « DIR », quelle que soit l'entité (`meetings.ts:807`).
- **Change** — L'écran envoie le code de l'entité de la réunion.
- **Fini quand** — Deux entités produisent deux numéros distincts.

---

# Chantier F3 — Répondre, et ne rien cacher

## F3.1 — Les actes engageants muets *(V1, V2, V3)*

- **Défaut** — Au signataire, « Enregistrer le brouillon », « Lancer le circuit » et « Approuver » sont
  muets tous les trois. La remise d'un livrable répond 200 sans un mot, la fenêtre se démonte, et la ligne
  disparaît de la liste de celui qui vient de remettre (`TO_PRODUCE`, `ProjectDossier.tsx:861`).
  Contraire à la règle 5.5.14 du système de design.
- **Change** — Tout acte engageant répond par une bulle brève qui nomme ce qui vient de se passer. Une
  ligne remise reste visible chez son auteur, avec son nouvel état.
- **Test** — Un test de rendu par acte : après l'action, le message existe.
- **Fini quand** — Aucune action engageante ne se termine en silence.

## F3.2 — Les listes de personnes ignorent le périmètre *(W1)*

- **Défaut** — 17 noms proposés pour une cellule de 2 ; deux listes de 17 pour un seul livrable ;
  « Imputer » laisse 18 agents quelle que soit l'entité et **accepte** un agent d'ailleurs ; le sélecteur
  de chef d'entité propose 17 personnes dont 5 seront refusées (29 % de choix voués au 400). Le bon patron
  existe : « Confier une tâche » depuis Mon entité propose 3 noms avec la fonction en clair.
- **Change** — Toute liste de personnes se ferme sur le périmètre que le serveur acceptera, et affiche la
  fonction. Un choix impossible n'est pas proposé.
- **Fini quand** — Aucun choix d'une liste de personnes ne peut produire un 400.

## F3.3 — Le rail n'ouvre que sur un droit d'agir *(W2)*

- **Défaut** — `Sidebar.tsx:144-172`. Trois régimes coexistent : `show.mail` teste
  `correspondence.view` **directement** et ouvre l'entrée ; `plans`, `partners`, `agreements`,
  `meetings`, `decisions`, `signature` n'accordent au droit de lecture qu'une **sonde** (`ask` +
  `useHas`), si bien que l'entrée ne paraît que si le module contient déjà quelque chose ; et
  `structure` n'accorde rien du tout à `attributions.view`, qui n'a donc **aucun chemin**. L'outil se
  découvre en s'en étant déjà servi : 9 liens avant de déposer une pièce au signataire, 11 après.
- **Change** — Aligner sur `show.mail` : un droit de consultation ouvre l'entrée. La sonde ne sert qu'à
  ceux qui n'ont aucun des deux droits. Écrire le principe dans `docs/DESIGN-SYSTEM.md`.
- **Fini quand** — Tout droit de lecture a une porte.

## F3.4 — Les pastilles de compte *(audit du rail)*

- **Défaut** — Le composant de lien sait afficher une pastille (`Sidebar.tsx:206-215`) et **une seule
  entrée sur dix-neuf** s'en sert (Coéquipiers IA). Parapheur, Courrier, Congés, Décisions, Mes tâches :
  rien.
- **Change** — Une pastille sur chaque entrée qui a quelque chose à annoncer, comptant **ce qui attend la
  personne**, pas le contenu du module. Un module sans rien à faire n'affiche aucun chiffre.
- **Fini quand** — On sait où est le travail sans ouvrir les modules.

## F3.5 — Trois icônes servent deux fois *(audit du rail)*

- **Défaut** — `IdCard` pour « Mon dossier » **et** « Ressources humaines » ; `Users` pour « Mon entité »
  **et** « Équipes » ; `ShieldCheck` pour « Administration système » **et** « Contrôle de
  l'administration ». Trois paires sur dix-neuf entrées, et ce sont celles qu'il ne faut pas confondre.
- **Change** — Une icône par entrée. « Mon dossier » prend une carte personnelle, « Mon entité » un
  bâtiment, « Administration système » un réseau ; la carte reste aux RH, le groupe aux Équipes, le
  bouclier au contrôle.
- **Fini quand** — Aucune icône n'apparaît deux fois dans le rail.

## F3.6 — La recherche ne cherche pas ce qu'elle annonce *(W3)*

- **Défaut** — La barre promet « Rechercher une réunion, un dossier, une personne… »
  (`Sidebar.tsx:318`) et `search()` (`services.ts:2772`) ne fait que deux requêtes : les tâches et les
  noms de projets. Sur huit requêtes portant sur des objets présents, sept rendent zéro. Et
  `shouldFilter={!results}` (`CommandPalette.tsx:59`) tombe à faux dès qu'une réponse arrive, même vide :
  la palette réaffiche ses raccourcis et ses projets, donc **« Aucun résultat » ne s'affiche jamais**.
- **Change** — Deux travaux séparables. *(a)* Le filtre : une ligne, pour qu'une réponse vide affiche
  « Aucun résultat ». *(b)* L'étendue : la recherche couvre réunions, courriers, décisions, partenaires,
  personnes et écrans — ou la promesse de la barre est réduite à ce qu'elle fait.
- **Fini quand** — Ce que la barre annonce est ce qu'elle trouve.

---

# Chantier F4 — Les écrans à refaire

## F4.1 — « Mes tâches » *(AC1)*

- **Défaut** — Menu contextuel de 5 entrées sans échéance ni priorité ; **0 élément déplaçable** en vue
  Calendrier comme en vue Tableau ; un seul filtre, aucun tri ; reporter une échéance coûte 4 clics et une
  ouverture de tiroir — **28 clics pour les 7 tâches ouvertes d'un lundi matin**. La vue Tableau empile
  les sections de trois projets en six colonnes de sens différents.
- **Change** — Déplacement direct en calendrier et en tableau, échéance et priorité au menu contextuel,
  tri et filtres. La vue Tableau groupe par état, pas par section de projet.
- **Fini quand** — Replanifier sept tâches coûte moins de dix clics.

## F4.2 — La matrice des profils et des droits *(AC2)*

- **Défaut** — 13 profils × 58 droits, 2 986 px dans 836 px — 3,6 écrans —, en-tête en position statique
  qui part à −1 495 px après défilement, première colonne non figée, aucune recherche ni filtre, et un
  onglet en lecture seule qui renvoie **par une phrase sans lien** vers l'éditeur situé ailleurs.
  Vérifier puis changer un droit : 2 écrans, 6 clics.
- **Change** — En-tête et première colonne figés, recherche sur les droits, filtre par groupe, et
  modification sur place pour qui en a le droit.
- **Fini quand** — Changer un droit se fait sans quitter la matrice.

## F4.3 — L'arrivée d'une personne *(AC3, AD3 côté écran)*

- **Défaut** — 7 clics et 5 champs pour créer le compte, puis la personne est absente de `/api/users`
  donc de tous les sélecteurs jusqu'à son activation — **un second passage qu'aucun texte n'annonce**.
  L'entité et la fonction saisies ne sont réaffichées nulle part (`/api/org/invitations` ne rend ni
  `unit_id` ni `title`) : une faute de frappe ne se découvre qu'après l'activation, et coûte 2 écrans,
  6 clics et 5 champs retapés.
- **Change** — L'écran annonce la seconde étape. L'invitation en attente montre l'entité et la fonction,
  et se corrige.
- **Fini quand** — On sait, en créant un compte, ce qu'il restera à faire.

## F4.4 — La règle anti-perte sur tous les formulaires de page *(AC4)*

- **Défaut** — Seul l'éditeur de compte rendu est protégé (commits `f6cd4fa`, `276f78b`). Douze fichiers
  tiennent un drapeau `dirty`, mais dans presque tous il est passé au `Drawer` ou à `record.tsx`, qui
  tiennent déjà la confirmation. `web/src/pages` compte 17 fichiers portant des champs `<Field>`.
- **Change** — Passer les formulaires de page en revue, un par un. La couverture complète demande la
  conversion en routeur de données (`createBrowserRouter`), qui couvrirait aussi les boutons Précédent et
  Suivant — **décision de l'utilisateur attendue**.
- **Fini quand** — Aucun formulaire de page ne perd de saisie sans confirmation.

---

# Chantier F5 — La finition

## F5.1 — « Parapheur » devient « Signataire » *(AB1)*

- **Défaut** — Le dépôt dit « parapheur » **232 fois** : `pages/Parapheur.tsx`, `server/src/signature.ts`,
  `audit.ts`, `notification-categories.ts`, les pages Accords, une dizaine de documents de `docs/`, et la
  route `/parapheur`. Le mot de la maison est « le signataire ».
- **Change** — Renommage complet, route comprise. **Aucune migration** : les clés de droits sont déjà
  `signature.use` et `signature.institution`.
- **Fini quand** — Le mot « parapheur » n'apparaît plus, sauf dans l'historique.

## F5.2 — Le champ « Signataire » devient « Signé par » *(AB2)*

- **Défaut** — `pages/Agreements.tsx:893` emploie déjà « Signataire » pour **la personne** qui signe, avec
  l'indication « En principe la Directrice générale ». Si le module prend ce nom, un même écran dira deux
  choses avec un mot.
- **Change** — La personne devient « Signé par ».
- **Fini quand** — Un mot, une chose.

## F5.3 — « Décision » se scinde en trois *(AB3)*

- **Défaut** — Sept objets sous un même mot sur trois écrans : 3 arbitrages de dossier, 2 décisions à
  confirmer, 2 exécutions déclarées. Le « Tout voir » de « Décisions attendues » mène à `/decisions`
  (`Pilotage.tsx:348`), registre de 62 lignes où **aucun des 3 arbitrages ne figure**. « Saisir →
  Trancher un arbitrage — aucun en attente » mène à un onglet vide pendant que le même écran annonce
  « 3 décisions attendent votre arbitrage ».
- **Change** — Trois objets, trois noms (décision de l'utilisateur, question 10), et chaque renvoi pointe
  sur la liste qu'il compte. **Noms définitifs attendus de l'utilisateur.**
- **Fini quand** — Aucun compteur ne contredit la liste qu'il annonce.

---

# Module M1 — Le courrier

Seize interventions. Le modèle de données s'arrête et s'écrit **avant** qu'une ligne soit posée. Détail
des décisions : `docs/PLAN-DE-TRAVAIL.md` lot X, et la mémoire du circuit décrit par l'utilisateur.

## M1.1 — Un seul enregistrement *(X1)*

- **Défaut** — Sur papier, le courrier est enregistré **trois fois** : service courrier à la réception,
  secrétariat, antichambre de la DG.
- **Change** — Une seule entrée, à la réception. Les autres étapes voient le même courrier, pas une copie.

## M1.2 — Un état par personne et par entité *(X2)* — **le cœur du module**

- **Défaut** — `correspondence` ne porte **qu'un seul `assignee_id`** (`registers.ts:17`) et une table de
  copies avec un motif (`correspondence_copies`, `purpose: information | avis`). Le même courrier ne peut
  donc pas être, au même moment, *à dispatcher* pour le secrétariat, *à transmettre* pour l'antichambre,
  *pour lecture* pour cinq personnes et *pour traitement* pour deux autres.
- **Change** — Une table d'acheminements : un courrier, N lignes, chacune avec son destinataire (personne
  ou entité), sa mention, son état, son échéance. L'état du courrier devient la synthèse des siens.
- **Test** — Un courrier, trois destinataires, trois états différents, chacun ne voyant que le sien.
- **Fini quand** — Deux personnes peuvent traiter le même courrier sans se marcher dessus.

## M1.3 — « Pour traitement » et « Pour information » *(X3)*

- **Change** — Deux mentions, cumulables sur une même personne — qui voit alors le courrier une fois,
  marqué *pour traitement*. L'usage français dit « pour attribution » ; écarté tant que « Attributions »
  désigne autre chose dans l'outil.

## M1.4 — Un courrier pour traitement crée une tâche *(X4)*

- **Change** — Même brique que les actions de réunion (F1.7). L'échéance de la tâche est celle de
  l'imputation.

## M1.5 — L'étiquette et l'accusé de réception *(X5)*

- **Défaut** — Aucun accusé de réception n'existe nulle part dans l'outil.
- **Change** — Une étiquette imprimable à coller sur le document, portant le numéro d'enregistrement et
  les informations d'identification. **Contenu exact attendu de l'utilisateur** (il cite le système du
  Ministère des Finances).

## M1.6 — Le circuit passe par le signataire *(X6)*

- **Défaut** — Un courrier n'entre **jamais** au signataire : la seule mention de `signature` dans
  `registers.ts` est le droit `signature.institution` exigé pour imputer à l'entité racine (329).
- **Change** — L'annotation de la DG sur un entrant, et le projet de réponse sortant, empruntent le
  circuit existant : visa, puis signature.

## M1.7 — Deux phases pour le sortant *(X7)*

- **Défaut** — Le signataire garantit que le contenu est **intact depuis l'entrée dans le circuit** ; or
  l'antichambre doit pouvoir modifier le projet.
- **Change** — Préparation (l'auteur et l'antichambre écrivent) puis signature (texte figé). La
  modification se fait avant, pas pendant.

## M1.8 — La délégation de signature *(X8)*

- **Défaut** — `signature.institution` n'appartient qu'au profil DG ; le DGA ne l'a pas. L'outil connaît
  l'intérim **pour les congés d'un agent** (`leaves.ts`) et aucune délégation de signature. Un intérim
  obligerait à donner le droit au DGA et à penser à le reprendre.
- **Change** — Une délégation datée, qui s'ouvre et se ferme seule, journalisée, et visible sur les actes
  signés pendant sa durée.

## M1.9 — Les modèles de courrier *(X9)*

- **Défaut** — Aucun modèle de document n'existe dans le dépôt.
- **Change** — Déposer un modèle (en-têtes compris), la personne saisit, le système génère. La
  finalisation — numéros, impression — revient au secrétariat.

## M1.10 à M1.13 — Le temps et les numéros *(X10, X11, X16)*

- Voir **S5**. Le numéro principal stocké, le suffixe, l'antidatage qui alerte, le calendrier et
  l'horloge.

## M1.14 — Les archives *(X12)*

- **Change** — **Un seul registre**, où chaque courrier porte qui l'a classé et à quel dossier il se
  rattache. Les trois archives citées par l'utilisateur — secrétariat, DG, par projet — en sont trois
  vues. Même principe que le portefeuille, qui est une vue et non un module.

## M1.15 — Les rappels *(X13)*

- **Défaut** — Un seul rappel part, et seulement une fois l'échéance atteinte (`reminders.ts:32-33`) ;
  l'escalade au chef d'entité se produit une fois (`registers.ts:543-557`) puis plus rien.
- **Change** — Relance **tous les deux jours**, « en retard » au bout d'une semaine, puis remontée.
  *(Semaine calendaire ou ouvrable : réponse de l'utilisateur attendue.)*

## M1.16 — Le registre et la réponse *(X14)*

- **Défaut** — « Répondre » n'existe pas sur un courrier entrant (4 clics par un autre onglet, puis 3
  informations ressaisies que l'entrant porte déjà) ; le registre n'a ni recherche ni filtre ; ses cinq
  compteurs ne sont pas cliquables ; il n'y a pas d'« Enregistrer et suivant » pour le courrier du matin.
- **Change** — Un bouton « Répondre » qui préremplit, une recherche, des compteurs cliquables, et un
  enchaînement pour la saisie en série.

---

# Module M2 — Les réunions

## M2.1 — Ni la DG ni les DGA ne valident les comptes rendus des entités *(Y1)*

- **Défaut** — `meetings.validate` est un droit personnel détenu par deux personnes. Estimation du
  testeur : ~600 validations par an si chaque cellule tient une réunion hebdomadaire. **Le modèle était
  faux** : chaque entité valide les siens.
- **Change** — Le droit disparaît comme condition d'adoption. Voir M2.2.

## M2.2 — L'adoption est collégiale, à la séance suivante *(Y2, Y3, Y4)*

- **Change** — Le compte rendu est **adopté par l'assemblée au premier point de la séance suivante**,
  pour une réunion d'entité comme pour la réunion des directions. L'adoption peut se faire **avec
  modifications, consignées**. Entre la séance et son adoption, **tous les présents** amendent le projet,
  avec trace de qui a écrit quoi. C'est le rapporteur qui saisit.
- **Test** — Une séance sans suivante : le compte rendu reste en projet, et l'outil le dit. Une adoption
  avec modifications : le document figé les porte, avec la mention qu'elles ont été demandées en séance.
- **Fini quand** — Aucune personne seule ne peut valider un compte rendu.

## M2.3 — Le rapporteur, l'animateur, les intervenants *(Y5)*

- **Défaut** — `Meetings.tsx:1968` affiche « Rapporteur : {item.speakers} » pour la personne qui
  **intervient** sur un point. Dans l'Agence, cette personne est un **intervenant** ; le **rapporteur**
  tient le secrétariat et rédige. Les deux mots sont intervertis. Le vrai compte rendu porte aussi un
  **Animateur** et un **Maître du temps** — et l'utilisateur précise que c'est la même personne.
- **Change** — Le rapporteur est une fonction de la réunion ; l'animateur aussi (maître du temps compris) ;
  chaque point porte ses intervenants.

## M2.4 — La réunion des directions se lit par tous les agents *(Y6, Y7)*

- **Défaut** — `meetings.ts:260` accroche une règle de confidentialité à
  `meeting_type ILIKE 'Comité de direction%'`. Le nom réel est **« Réunion hebdomadaire des Directions »**.
- **Change** — Le libellé change, la lecture s'ouvre à tous les agents, et la règle cesse de dépendre
  d'une comparaison de texte.

## M2.5 — Le type de réunion devient un référentiel fermé *(Y8)*

- **Défaut** — Champ libre dont dépendent, **par égalité exacte de chaîne**, la numérotation officielle,
  le chaînage des séries (`meetings.ts:789-791`), le report des recommandations, et la règle de
  confidentialité ci-dessus. Sur quatre séances programmées, « Réunion de service rh » et « Réunion
  service RH » deviennent orphelines — **trois sur quatre** — et perdent le point de suivi et la synthèse
  précédente, sans aucun avertissement.
- **Change** — Un référentiel, comme les six autres. La série se chaîne sur un identifiant, pas sur un
  libellé.
- **Fini quand** — Aucune règle de l'outil ne dépend de l'orthographe d'un champ libre.

## M2.6 — L'ordre du jour à la programmation *(Y9)*

- **Défaut** — Le formulaire de programmation compte 16 champs et **aucun pour l'ordre du jour**, alors
  que la convocation l'exige ; on le saisit derrière « Modifier le compte rendu » d'une séance qui n'a pas
  eu lieu. Soit 7 clics pour programmer puis convoquer. Et selon qu'il restait ou non des recommandations
  ouvertes, la convocation passe **avec un ordre du jour que personne n'a écrit**, ou échoue.
- **Change** — L'ordre du jour est dans le formulaire de programmation, et l'écran dit ce que le report
  automatique a ajouté.

## M2.7 — Une action décidée en séance *(Y10)*

- **Change** — C'est une recommandation **et** une tâche pour la personne (décision de l'utilisateur,
  question 17), avec rappel au responsable **avant** l'échéance. Aujourd'hui rien ne relance sur une
  recommandation de réunion.

## M2.8 — Le drapeau de décision d'une réunion

- **Défaut** — Déjà corrigé (commit `247944c`) : `can.decide` s'ouvrait à la présidence de séance sans
  exiger `meetings.validate`, là où `assertDecider` l'exige. À reprendre dans le nouveau modèle.

---

# Module M3 — Les livrables

## M3.1 — Un livrable est rattaché à quelque chose *(Z1)*

- **Défaut** — Projet, activité de plan et contrat sont les trois **facultatifs** : un livrable peut
  n'être lié à rien. L'utilisateur : « un livrable provient d'un travail, projet, mission… ça ne peut pas
  être juste isolé comme ça comme module ».
- **Change** — Le rattachement est obligatoire, et sa nature dépend du **type** de livrable.

## M3.2 — Pas de remise sans pièce *(Z2)*

- Voir **S4.1**.

## M3.3 — On peut corriger un livrable *(Z3)*

- **Défaut** — Le serveur expose PATCH et calcule `can.edit` ; `pages/ProjectDossier.tsx` ne lit que
  `can.review` (323) et `can.decide` (329). **Aucun écran ne permet de modifier un livrable** — une faute
  de frappe oblige à en créer un autre.
- **Change** — La fiche lit `can.edit` et ouvre les champs.

## M3.4 — Les types de livrables *(Z4)* — **décision attendue**

- L'utilisateur dit que la règle dépend du type, et n'a pas encore donné la liste. Rapport d'étude,
  cahier des charges, plan, carte, procès-verbal ? **À établir avec les directions.**

## M3.5 — Ce qu'un consultant voit *(Z5)*

- **Change** — Ses tâches, son contrat, le plan de travail, les livrables attendus et ceux soumis avec
  leur état — « Non traité, validé, rejeté… » (réponse de l'utilisateur, question 12).

---

# Points hors chantier

## H1 — Une demande d'accès ne peut pas être refusée *(AA7)*

- **Défaut** — `POST /api/admin/users/:id/reject` existe (`auth/routes.ts:277`) **sans aucun bouton** dans
  l'interface. Une demande peut être approuvée, jamais refusée : elle reste en attente indéfiniment.
- **Change** — Un bouton « Refuser », avec motif, et l'avis à la personne.

## H2 — « Lecture seule » ne suit rien *(AA4)*

- **Défaut** — Zéro droit sur cinquante-huit : aucun des dix modules de suivi. Sept entrées de barre
  latérale, dont quatre ne parlent que de la personne elle-même.
- **Change** — Le profil porte les droits de consultation que son nom annonce (décision de l'utilisateur,
  question 11).

## H3 — Division et Bureau manquent aux types d'entité *(AA5)*

- **Défaut** — Le référentiel connaît Institution, Direction générale, Direction, Département, Service,
  Cellule, Représentation provinciale, Antenne (`referentials.ts:118-140`). Ni **Division** ni **Bureau**,
  alors que le secrétariat est une division de la direction générale.
- **Change** — Deux valeurs à ajouter. **Se règle dans les paramètres, sans toucher au code.**

## H4 — Le cadre organique *(AA6)* — **décision attendue**

- Les attributions d'une entité se rédigent « selon les conditions existantes dans le cadre organique de
  l'Agence ». L'outil ne connaît aucun cadre organique : les attributions s'écrivent en texte libre, sans
  référence. Document consultable dans l'outil, rattachement article par article, ou référence extérieure ?

## H5 — Le périmètre d'un chef d'entité *(W4)*

- **Défaut** — L'interface lit le droit mais jamais l'étendue : un risque « Agence entière » est proposé à
  un chef de cellule (et l'aide du champ l'y invite) ; « Créer la fiche » d'attributions est proposé pour
  les treize entités.
- **Change** — « Un chef d'entité se limite à son entité et aux endroits où il a été invité » (réponse de
  l'utilisateur, question 7). L'étendue se contrôle comme le droit.

## H6 — Les attributions, qui les rédige et qui les arrête *(question 14)*

- Réponse de l'utilisateur : « L'entité peut en rédiger selon les conditions existantes dans le cadre
  organique de l'Agence. » À préciser : qui les arrête.

## H7 — Le circuit du courrier inscrit deux lignes pour une imputation

- **Défaut** — Relevé par le testeur assistant(e) de direction ; peut-être un artefact des données de
  démonstration. **À vérifier avant de corriger.**

## H8 — `org.profiles` permet de s'ajouter n'importe quel droit

- **Défaut** — Relevé sans en faire un écart par le testeur responsable informatique : le détenteur de
  `org.profiles` peut ajouter à son propre profil n'importe lequel des 58 droits. C'est logique — c'est
  lui qui administre — mais cela doit au moins être journalisé et visé (`audit.review` existe).

---

# Ce qui attend une décision de l'utilisateur

1. **L'unicité du rang** du courrier entre postes hors ligne *(S5.4)*.
2. **Le contenu de l'étiquette** d'accusé de réception *(M1.5)*.
3. **Les types de livrables** *(M3.4)*.
4. **Les noms des trois objets** aujourd'hui appelés « décision » *(F5.3)*.
5. **Le cadre organique** : dans l'outil ou dehors *(H4)*.
6. **La règle anti-perte partout** : conversion en routeur de données, ou pas *(F4.4)*.
7. **Les annexes** : limite par fichier ou espace externe — **remis à plus tard par l'utilisateur**.
8. **« En retard » au bout d'une semaine** : calendaire ou ouvrable *(M1.15)*.
