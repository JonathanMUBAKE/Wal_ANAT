# ANAT Pilotage — Le contexte institutionnel

> Écrit le 25 novembre 2026, d'après ce que Jonathan a décrit du fonctionnement réel de l'Agence, et
> d'après un vrai compte rendu de réunion dont seule la structure a été reprise.
>
> **À lire avant `docs/INTERVENTIONS.md`.** Ce document ne dit pas quoi coder : il dit **pourquoi**.
> Un agent qui exécute une liste de corrections sans comprendre la logique poursuivie produira un
> logiciel qui passe les tests et dont personne ne se sert.

---

## 1. Ce qu'est l'Agence, et pourquoi sa forme compte

L'Agence Nationale d'Aménagement du Territoire est un établissement public congolais, **placé sous la
tutelle du Ministère de l'Aménagement du Territoire**, aux côtés de trois structures sœurs — FONAT,
ONAT, CTCAT. Sa mission est l'assistance technique à l'État et aux provinces : diagnostic, outils de
planification, modernisation des villes. Elle travaille sur 2,3 millions de km² et 145 territoires, avec
quelque **192 agents**.

Comme tout établissement public congolais, l'Agence a **trois structures organiques**, fixées par la
**loi n° 08/009 du 7 juillet 2008** : un Conseil d'administration, une Direction générale, un Collège
des commissaires aux comptes. Il faut comprendre ce que chacune fait, parce que **deux d'entre elles ne
sont pas opérationnelles** — et l'outil ne doit pas prétendre les outiller.

Le **Conseil d'administration** est l'organe de *conception, d'orientation, de contrôle et de décision*.
Il définit la politique générale, détermine le programme de l'établissement, **arrête le budget** et
**approuve les états financiers** de fin d'exercice. Il se réunit **trimestriellement** en séance
ordinaire. Il ne gère pas : il oriente et il arrête.

Le **Collège des commissaires aux comptes** contrôle les opérations financières. Il est composé de deux
personnes issues de structures professionnelles distinctes, et — c'est important — **ses membres ne
peuvent prendre individuellement aucune décision**. C'est un organe de contrôle, pas un acteur.

La **Direction générale** est **l'organe de gestion**. Elle exécute les décisions du conseil, exécute le
budget, élabore les états financiers, dirige l'ensemble des services — et **représente l'établissement
vis-à-vis des tiers**.

Cette dernière phrase est le fondement de la règle que Jonathan a énoncée : *la direction générale seule
engage l'Agence*. Ce n'est pas un usage interne ni une préférence de la maison, c'est la loi. Et c'est
pourquoi le circuit d'un courrier sortant finit toujours à la même signature.

**Ce que l'outil couvre, c'est donc la gestion** — la sphère de la direction générale et des services.
Les actes du conseil n'y sont pas produits : ils y **entrent**, comme des données d'amont que la
direction exécute. Une résolution du conseil devient, dans l'outil, une charge à suivre ; elle ne s'y
délibère pas. Les états financiers y sont élaborés ; ils sont approuvés ailleurs.

La **direction générale** est tenue par une **directrice générale** et **un** directeur général adjoint.
Un seul. Au-dessous, il n'y a que des **directeurs** et des **chefs de cellule**.

Quatre **services sont rattachés à la direction générale** : la Cellule de communication, la Cellule
NTIC, la Cellule de conformité, et le **Secrétariat de direction** — vingt personnes, dont la charge est
« coordination administrative, **gestion du courrier** et support logistique ». C'est donc le plus gros
service rattaché, et le courrier est son métier. Le **service courrier** se tient à la réception,
physiquement, là où les gens entrent.

Viennent ensuite les **directions centrales** — Planification spatiale, Modernisation des villes —
chacune tenue par un directeur, et sous elles des **divisions** et des **bureaux**, qui prennent la forme
de services.

Enfin l'Agence est présente dans tout le pays par des **pools territoriaux**, six au total, chacun
couvrant plusieurs provinces et dirigé par un **directeur de pool**. Le Pool Grand Ouest siège à Kinshasa
et couvre cinq provinces ; le Pool Grand Katanga siège à **Lubumbashi** et en couvre quatre. Ces deux
sièges ne sont pas à la même heure : Kinshasa est à UTC+1, Lubumbashi à UTC+2. Ce n'est pas une
curiosité géographique — c'est la raison pour laquelle « aujourd'hui » n'est pas le même jour partout
dans l'Agence.

Cette forme n'est pas un organigramme décoratif. Elle commande trois choses.

D'abord, **une entité est autonome dans son fonctionnement**. Une cellule tient ses réunions, valide ses
propres comptes rendus, prépare son plan de travail, suit ses risques. Elle ne demande pas la permission
de la direction générale pour fonctionner. Quand le logiciel fait remonter à la DG la validation des
comptes rendus de chaque cellule, il ne durcit pas le contrôle : **il casse le fonctionnement normal
d'une administration**, et il met six cents validations par an sur le bureau de deux personnes.

Ensuite, **un chef d'entité se limite à son entité et aux endroits où il a été invité**. Ce n'est pas une
restriction de sécurité qu'on ajoute : c'est la définition de sa fonction. Un chef de cellule qui se voit
proposer de créer un risque « Agence entière » n'est pas devant un bouton de trop, il est devant une
proposition qui n'a pas de sens dans son monde.

Enfin, **la direction générale seule engage l'Agence** — parce que la loi lui donne de représenter
l'établissement vis-à-vis des tiers. Un accord, une convention, une lettre qui sort :
c'est la directrice générale qui signe, et le directeur général adjoint seulement en cas d'intérim. Tout
le reste de l'institution **prépare** ; une seule personne **engage**.

### Ce que ça veut dire pour le code

- Les types d'entité doivent couvrir ce qui existe : il manque **Division**, **Bureau** et **Pool**.
  Le référentiel connaît aujourd'hui Institution, Direction générale, Direction, Département, Service,
  Cellule, Représentation provinciale, Antenne.
- **Ne pas outiller le Conseil d'administration ni le Collège des commissaires aux comptes.** Ce ne sont
  pas des organes de gestion, et l'outil est un outil de gestion. Ce qui entre dans l'outil, ce sont
  leurs **actes** : une résolution du conseil devient une charge à suivre, un budget arrêté devient le
  cadre d'exécution, des états financiers approuvés deviennent un document de référence. Jamais une
  délibération à conduire dans l'application.
- Le **Collège des commissaires aux comptes** et la **Cour des comptes** sont des **destinataires
  extérieurs**. Un document qui leur est transmis sort de l'institution, comme tout courrier sortant.
- La cadence **trimestrielle** du conseil et l'exercice annuel donnent le rythme de l'Agence : le plan de
  travail, les états financiers et les revues s'y accrochent.
- Il y a **un seul** directeur général adjoint. Les profils du catalogue doivent le refléter.
- Les fonctions à nommer : directeur, chef de cellule, **directeur de pool**.
- L'autonomie d'une entité est un principe de conception, pas une permission : ce qui se décide dans une
  entité se décide **dans** cette entité.
- Deux fuseaux dans la même organisation, avec deux sièges réels : le fuseau se porte par l'entité, pas
  seulement par l'institution.
- « Le périmètre » est une dimension à part entière, distincte du droit. Avoir le droit de rédiger une
  fiche d'attributions ne dit pas **pour quelle entité**.
- Le droit de signer au nom de l'Agence ne peut pas être un droit permanent qu'on donne et qu'on oublie
  de reprendre. Il lui faut une **délégation datée**.

---

## 2. Le principe qui commande tout : l'écrit fait foi

Une administration publique ne fonctionne pas à la conversation. Elle fonctionne à l'**acte écrit,
numéroté, daté, signé, classé**. Un courrier qui arrive sans numéro n'est pas encore entré dans
l'institution. Une décision qui n'est pas inscrite au registre n'a pas été prise. Un compte rendu qui n'a
pas été adopté est un projet, pas un compte rendu.

C'est pour cela que l'outil s'appelle un outil de pilotage et non un outil de productivité. Sa matière
première n'est pas la tâche : c'est le **registre**. Et un registre a trois propriétés qu'un gestionnaire
de tâches n'a pas besoin d'avoir.

**Il est continu.** Les numéros se suivent. Un trou dans la série est une question à laquelle il faut
pouvoir répondre. C'est pourquoi l'on peut insérer `0001A` et `0001B` entre deux rangs plutôt que de
renuméroter : le registre ne se réécrit pas.

**Il est daté de l'acte, pas de la saisie.** Un courrier reçu le 3 et enregistré le 7 est du 3. C'est
pourquoi antidater doit rester possible — et c'est aussi pourquoi cela doit **alerter et laisser une
trace** : la même possibilité qui sert l'exactitude sert aussi la dissimulation.

**Il ne ment pas.** Ce qui est au journal a eu lieu. Un outil qui inscrit « approuvé » alors que rien ne
s'est exécuté ne commet pas un défaut d'affichage : il produit une fausse écriture.

### Ce que ça veut dire pour le code

- Le numéro est une **donnée stockée**, pas un affichage calculé, et il porte un suffixe.
- L'heure du serveur n'est pas une commodité technique : c'est ce qui date les actes. Elle se vérifie.
- Le journal ne s'écrit **qu'après** l'exécution, jamais avant.
- Tout acte qui engage l'Agence est journalisé. La liste des 137 genres d'actes s'allonge, elle ne
  raccourcit jamais.

---

## 3. La journée d'un courrier qui arrive

Quelqu'un pousse la porte de l'Agence avec une enveloppe. Voici ce qui se passe réellement, et ce que
l'outil doit en faire.

**À la réception**, le service courrier reçoit le pli. Il tient un cahier : l'expéditeur, le
destinataire, l'objet, le numéro. Il **accuse réception** — et c'est là le geste essentiel, parce que le
porteur repart avec la preuve que l'Agence a reçu. Aujourd'hui, c'est une étiquette qu'on colle sur le
document. Le porteur s'en va ; le courrier, lui, commence son chemin.

**Au secrétariat**, le pli est enregistré une seconde fois, puis **dispatché** vers les concernés.

**À l'antichambre de la direction générale**, il est enregistré une troisième fois, dans un tableau. Puis
l'assistant le porte à la directrice générale.

**La directrice générale annote.** Elle écrit en marge ce qu'elle veut : que quelqu'un prépare un projet
de réponse, que telle direction prenne une action, ou simplement « secrétariat pour archivage ».
**L'annotation commande tout ce qui suit.** C'est elle qui décide à qui le courrier est affecté, pour
quoi faire, et pour quand. Puis l'assistant de la DG en fait le suivi : relance tous les deux jours, et
au bout d'une semaine le dossier est en retard.

Ce récit contient trois enseignements que le logiciel doit entendre.

**Le même courrier est enregistré trois fois.** C'est le gaspillage que l'outil doit supprimer :
**un seul enregistrement, à l'entrée**, et ensuite le même courrier apparaît partout où il doit
apparaître.

**Mais il n'apparaît pas de la même façon partout.** Au secrétariat, il est *à dispatcher*. À
l'antichambre, il est *à transmettre à la DG*. Chez une direction, il est *pour traitement*, avec une
échéance. Chez trois autres personnes, il est *pour information*. Et quelqu'un peut être les deux à la
fois — en copie **et** chargé d'une action. C'est le cœur du module : **un courrier, autant d'états que
de personnes concernées.** Un seul destinataire ne suffit pas.

**L'annotation de la DG précède l'affectation.** Dans l'outil actuel, l'instruction se saisit *pendant*
l'imputation, par celui qui impute. Dans l'Agence, c'est l'inverse : la DG voit le courrier, l'annote, et
l'affectation suit son annotation. Il manque donc une étape entière — le passage **au signataire** pour
que la DG voie et annote, avant que quoi que ce soit soit affecté.

### Ce que ça veut dire pour le code

- Une table d'acheminements : un courrier, N lignes, chacune avec son destinataire, sa mention, son
  état, son échéance.
- Deux mentions : **« pour traitement »** et **« pour information »**, cumulables.
- Un courrier *pour traitement* crée une **tâche** pour la personne, avec l'échéance de l'imputation.
- Une étiquette imprimable, parce que le porteur repart avec quelque chose.
- Le courrier entre au **signataire** pour l'annotation de la DG.
- Relance tous les deux jours ; retard à une semaine ; puis remontée.

---

## 4. La journée d'un courrier qui sort

Une lettre part de l'Agence pour deux raisons : parce que la directrice générale a demandé qu'on
l'écrive — c'est l'action confiée par une annotation —, ou parce que quelqu'un prend l'initiative
d'écrire à une structure.

Dans les deux cas, **le chemin est le même, et il ne se contourne pas**. La personne rédige son projet de
lettre et le soumet. Il passe à l'**antichambre de la direction générale**, qui peut demander des
modifications ou les faire elle-même. Il va ensuite au **secrétariat** pour la finalisation : les
numéros, l'impression. Et il finit **chez la directrice générale pour signature**.

Ce chemin est exactement celui d'un signataire — ce que l'Agence appelle **le signataire** : un document
qui circule pour recueillir des visas, et qui finit par une signature. L'outil en possède déjà un, et les
testeurs l'ont jugé bien fait. Le courrier sortant n'a donc pas besoin d'un second circuit : **il doit
entrer dans celui-là**.

Une tension doit être résolue au passage. Un circuit de signature vaut parce qu'il garantit que **le
contenu n'a pas bougé depuis l'entrée**. Or l'antichambre doit pouvoir corriger le projet. Les deux ne
tiennent ensemble qu'en séparant deux temps : la **préparation**, où l'auteur et l'antichambre écrivent
librement, et la **signature**, où le texte est figé. On modifie avant, pas pendant.

Enfin, l'Agence veut **générer la lettre depuis un modèle** : on dépose le modèle avec ses en-têtes, la
personne saisit les informations, le système produit le document. Rien de tel n'existe aujourd'hui.

### Ce que ça veut dire pour le code

- Le sortant emprunte le circuit du signataire, en deux phases.
- `signature.institution` devient une **délégation datée**, pas un droit permanent.
- Des modèles de document, et une génération.
- La finalisation — numéro, impression — est un rôle du secrétariat, pas de l'auteur.

---

## 5. La semaine d'une réunion

Chaque entité tient ses réunions. Il existe par ailleurs une **réunion hebdomadaire des Directions**, qui
rassemble toutes les directions et les cellules — et qui ne s'appelle pas « comité de direction », quoi
qu'en dise le code.

Une réunion porte trois fonctions distinctes. Un **animateur**, qui conduit la séance et qui est aussi le
maître du temps. Un **rapporteur**, qui programme, prend note de chaque point abordé et rédige le compte
rendu — **il écrit, il ne décide pas**. Et des **intervenants**, qui développent les sujets de l'ordre
du jour. L'outil appelle aujourd'hui « rapporteur » la personne qui intervient sur un point : il a
interverti les deux mots de la maison.

Le document s'ouvre sur un rappel de la **séance précédente** et la synthèse de ses points. C'est ainsi
que les réunions se chaînent, et que ce qui n'a pas été fait revient à l'ordre du jour.

**Et voici le point que le logiciel avait faux.** Le compte rendu n'est pas validé par une personne qui
en détiendrait le droit. Il est **adopté collégialement, à la séance suivante**, au premier point de
l'ordre du jour. L'assemblée peut l'adopter **avec des modifications, qui sont consignées**. Entre la
séance et son adoption, **tous les présents** peuvent amender le projet. C'est le rapporteur qui saisit
tout cela dans le système.

Ni la directrice générale ni les adjoints ne valident les comptes rendus des entités. Ce n'est pas une
question de confiance : c'est que **ce n'est pas leur rôle**.

### Ce que ça veut dire pour le code

- `meetings.validate` comme droit personnel n'a pas de correspondant dans l'institution.
- L'adoption est un acte d'assemblée, à la séance suivante, avec modifications consignées.
- Tous les présents amendent le projet, avec trace de qui a écrit quoi.
- Le type de réunion commande la numérotation, le chaînage des séries, le report des recommandations et
  la visibilité. **Un tel champ ne peut pas rester du texte libre** : une minuscule de différence rend
  trois séries sur quatre orphelines.
- Le compte rendu d'une réunion des directions se lit par **tous les agents**.

---

## 6. Ce qui reste après une réunion

Une réunion ne produit pas qu'un document. Elle produit des **charges**. À l'issue de la réunion des
directions, sur le point du site web de l'Agence, on confie au responsable informatique de proposer un
cahier des charges ; c'est lui qui annonce pour quand. Chaque intervenant repart ainsi avec ce qu'il doit
faire.

Le système doit **retracer ces charges et relancer**. Et surtout : une action décidée en séance est à la
fois une **recommandation** suivie jusqu'à sa clôture **et une tâche** pour la personne. Ce n'est pas
deux objets concurrents, c'est le même travail vu de deux endroits — le registre de la réunion, et la
liste de la personne.

C'est de là que vient un principe qui dépasse les réunions. **Une personne a une seule liste de ce qu'on
lui demande**, quelle que soit l'origine : une tâche de projet, une action de réunion, un courrier reçu
pour traitement, une décision à exécuter. Si chaque module tient son propre suivi, personne ne saura où
regarder le matin — et l'outil aura échoué sur ce qu'on lui demande de faire.

Tous les participants voient le compte rendu et peuvent demander des modifications ou les appliquer.
Mais **celui qui porte une responsabilité fait plus** : il change l'état de sa charge et dépose une pièce
s'il le faut.

### Ce que ça veut dire pour le code

- Une brique « ce qu'on me demande », alimentée par toutes les origines.
- Une recommandation de réunion crée une tâche, avec rappel **avant** l'échéance.
- Le responsable d'une charge en change l'état et y attache un document.

---

## 7. Le travail d'une entité : attributions, plan, livrables

Une entité sait ce qu'elle a à faire parce qu'une **fiche d'attributions** le dit. Et cette fiche ne
s'écrit pas librement : elle se rédige **selon le cadre organique de l'Agence**, le texte qui crée les
entités et leur donne leurs charges. L'entité peut rédiger les siennes, dans les limites de ce cadre.

De ces attributions découle un **plan de travail**, préparé par l'entité et approuvé au-dessus. Celui qui
soumet un plan ne peut pas l'approuver lui-même — et c'est juste, mais l'outil doit alors dire qui le
peut, au lieu de laisser la personne devant un écran sans issue.

Du plan découlent des **activités**, et de certaines activités des **livrables**. Un livrable n'est jamais
isolé : il provient d'un travail, d'un projet, d'une mission. Et selon son type, il obéit à des règles
différentes.

**Un livrable porte de l'argent.** Sa validation déclenche une tranche de paiement à un consultant. C'est
pourquoi il ne peut pas se remettre sans sa pièce : valider un document qu'on n'a pas vu, puis engager
quarante pour cent d'un contrat, n'est pas une gêne d'ergonomie, c'est un risque.

### Ce que ça veut dire pour le code

- Le cadre organique est une référence que l'outil ignore aujourd'hui. **Décision attendue** : document
  consultable dans l'outil, ou référence extérieure.
- Un livrable a un rattachement **obligatoire**, et sa nature dépend de son type.
- Pas de remise sans pièce. Pas de validation sans pièce.
- Un plan soumis doit dire qui peut l'approuver.

---

## 8. Qui peut quoi, et pourquoi ce n'est pas une question de hiérarchie

L'Agence raisonne par **fonctions**, pas par rangs. Un agent, un stagiaire, un consultant sous contrat,
un chef d'entité, un directeur général adjoint, la directrice générale, un assistant de direction, un
responsable informatique : chacun a un métier, et de ce métier découle ce qu'il voit et ce qu'il fait.

Deux conséquences que le logiciel doit tenir.

**Le rang ne donne pas le métier.** La directrice générale est propriétaire technique du système, et
pourtant elle ne règle pas la messagerie ni les profils : ce n'est pas son travail. Le responsable
informatique administre l'outil et ne voit ni le pilotage, ni les décisions, ni le courrier confidentiel.
Un compte peut donc avoir tous les pouvoirs techniques et peu de droits métier, et inversement.

**L'assistant de direction tient la frontière la plus délicate de l'institution.** Il saisit pour la
directrice générale — le courrier, l'agenda, les réunions, les décisions dictées — **sans décider à sa
place**. Il inscrit au registre une décision que la DG a prise ; il ne la prend pas. Il prépare une
lettre ; il ne la signe pas. Quand l'outil lui propose « Trancher » un arbitrage, il ne lui propose pas
un bouton de trop : il lui propose de franchir une frontière institutionnelle.

Et puis il y a ceux qui ne peuvent presque rien, et dont on oublie de s'occuper. Un stagiaire qui arrive
doit comprendre ce qu'on attend de lui et savoir à qui demander. Un consultant doit savoir ce qu'il doit
produire, pour quand, et comment le remettre. Quelqu'un en lecture seule, à qui l'on a ouvert l'outil
« pour qu'il suive », doit pouvoir suivre quelque chose.

### Ce que ça veut dire pour le code

- Le droit se vérifie au serveur, et l'interface ne propose jamais ce que le serveur refusera.
- Un droit de **consultation** ouvre une porte, au même titre qu'un droit d'agir. Un module vide reste
  visible : **un casier vide est un casier**, et c'est une information.
- L'écran d'accueil d'un arrivant doit lui dire ce qu'on attend de lui et qui est son responsable.

---

## 9. Ce que l'institution attend du logiciel

Quatre attentes traversent tout ce qui précède. Elles ne figurent dans aucun ticket, et ce sont elles qui
décident si l'outil sera utilisé ou contourné.

**Que rien ne se perde.** Un compte rendu de cent quatre champs qui s'efface parce qu'on a cliqué dans le
menu, c'est une demi-journée de travail perdue et un utilisateur qui retourne à Word.

**Que l'outil dise ce qu'il a fait.** Un acte engageant — lancer un circuit, viser, remettre un livrable
— qui ne répond rien laisse la personne dans le doute, et elle recommence. Pire : un acte qui répond
« fait » alors qu'il a échoué détruit la confiance d'un seul coup, et elle ne revient pas.

**Que ce qu'on a le droit de voir soit visible.** Cacher un écran parce qu'il est vide fait découvrir
l'outil à ceux qui s'en servent déjà, et le laisse introuvable aux autres.

**Que le geste courant soit court.** Vingt-huit clics pour replanifier sept tâches un lundi matin, sept
écrans pour que la direction générale fasse le tour de sa matinée : ce ne sont pas des détails de
confort. C'est la raison pour laquelle, dans six mois, quelqu'un rouvrira un cahier.

---

## 10. Et l'intelligence artificielle, dans tout ça

L'Agence accepte des coéquipiers IA à une condition, qui est la règle du dépôt : **l'IA propose, un
humain décide**. Une proposition de l'IA passe par une validation humaine avant d'avoir le moindre effet.

Cela a deux conséquences que le code doit tenir sérieusement. Une proposition qui attend un décideur
qu'elle n'a pas ne doit pas rester en suspens pour toujours — elle doit expirer et prévenir. Et une
validation humaine ne doit jamais être inscrite au journal avant que l'action ait réellement eu lieu :
dans une institution où l'écrit fait foi, une approbation inscrite à tort est pire que pas
d'approbation du tout.

---

## Sources

Ce document est la mise au propre de ce que Jonathan a décrit en conversation les 24 et 25 novembre 2026,
complété par la structure d'un compte rendu réel de l'Agence — dont **aucun contenu** n'a été repris, ni
ici, ni dans le dépôt, ni dans les données de démonstration — et par le site public de l'Agence,
**https://anat.gouv.cd** (pages « Organigramme » et « Écosystème », consultées le 25 novembre 2026),
d'où viennent la composition de la haute gouvernance, les services rattachés, les directions centrales,
les pools territoriaux et les effectifs. Les noms des personnes figurant sur ce site public ne sont pas
repris ici : le dépôt ne porte aucune donnée nominative de l'Agence.

Le cadre juridique vient de la **loi n° 08/009 du 7 juillet 2008 portant dispositions générales
applicables aux établissements publics** (RDC), articles 6, 7 et suivants. **Réserve honnête** : il a été
établi à partir de copies du texte et de travaux universitaires, non du Journal officiel. Avant de s'en
servir dans un acte, il faut le vérifier au texte officiel.

- [Loi n° 08/009 du 7 juillet 2008 (leganet.cd)](https://www.leganet.cd/Legislation/Droit%20Public/EPub/loi.08.009.07.07.2008.pdf)
- [Fiche de la loi (UNEP LEAP)](https://leap.unep.org/en/countries/cd/national-legislation/loi-ndeg-08009-du-07-juillet-2008-portant-dispositions-generales) Les décisions prises figurent aussi dans
`docs/PLAN-DE-TRAVAIL.md` (§ 3 bis) et dans le dossier `docs/INTERVENTIONS.md`.

Huit points restent à trancher ; ils sont listés à la fin de `docs/INTERVENTIONS.md`.
