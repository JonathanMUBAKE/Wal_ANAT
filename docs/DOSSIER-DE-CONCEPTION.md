# ANAT Pilotage — Dossier de conception

> Version du 25 novembre 2026. Ce fichier est la version de travail du document remis à la direction
> générale (« Projet de système de pilotage de l'ANAT »). Il est assemblé à partir de
> `docs/google-doc/partie-A.md`, `partie-B.md` et `partie-C.md` par `scripts/dossier-vers-html.mjs`
> pour la version Google ; cette copie-ci sert aux agents qui travaillent sur le code.
>
> **À lire avec** : `docs/CONTEXTE-INSTITUTIONNEL.md` (pourquoi), `docs/SPECIFICATION.md` (les 477
> exigences), `docs/INTERVENTIONS.md` (le détail de chaque correction), `docs/PLAN-PROJET.md` (quand).

---

# Projet de système de pilotage de l'ANAT

<!-- fiche -->
| | |
|---|---|
| Intitulé du projet | ANAT Pilotage — système de pilotage de la gestion de l'Agence |
| Maître d'ouvrage | Agence Nationale d'Aménagement du Territoire — Direction générale |
| Objet du document | Dossier de conception : cadrage, contexte, objectifs, périmètre, parties prenantes et principes directeurs |
| Nature du document | Dossier de conception, partie A — fondations du projet |
| Version | 0.1 |
| Date | 25 novembre 2026 |
| État | En rédaction, non validé par le maître d'ouvrage |
| Rédaction | Agent chef de projet, d'après les entretiens des 24 et 25 novembre 2026 |
| Références | Contexte institutionnel ; Dossier de spécification ; Plan de projet ; Plan d'intervention ; loi n° 08/009 du 7 juillet 2008 |
| Réserve juridique | Le cadre légal a été établi à partir de copies du texte et de travaux universitaires, non du Journal officiel ; à vérifier au texte officiel avant tout usage dans un acte |
| Diffusion | Direction générale ; équipe du projet. Aucune donnée nominative ni donnée réelle de l'Agence |

[[SOMMAIRE]]

## 1. Contexte institutionnel

### 1.1 L'Agence et sa tutelle

L'Agence Nationale d'Aménagement du Territoire est un établissement public congolais, placé sous la tutelle du Ministère de l'Aménagement du Territoire. Elle a trois structures sœurs, également sous cette tutelle : FONAT, ONAT et CTCAT. Sa mission est l'assistance technique à l'État et aux provinces : diagnostic du territoire, outils de planification, modernisation des villes.

Les chiffres donnent la mesure de la tâche. L'Agence travaille sur 2,3 millions de km², 145 territoires et 9 provinces, avec environ 192 agents. Moins de deux cents personnes répondent donc d'un espace plus vaste que bien des États, et c'est cette disproportion qui commande la conception du système : chaque geste économisé se multiplie par l'effectif, et chaque erreur de trace se paie sur tout le territoire.

### 1.2 Les trois structures organiques

Comme tout établissement public congolais, l'Agence repose sur trois structures organiques fixées par la loi n° 08/009 du 7 juillet 2008 portant dispositions générales applicables aux établissements publics. Il faut comprendre ce que chacune fait, parce que deux d'entre elles ne sont pas des organes opérationnels et que le système ne doit pas prétendre les outiller.

Le Conseil d'administration est l'organe de conception, d'orientation, de contrôle et de décision. Il définit la politique générale, détermine le programme de l'établissement, arrête le budget et approuve les états financiers de fin d'exercice. Il se réunit chaque trimestre en séance ordinaire. Il ne gère pas : il oriente et il arrête.

Le Collège des commissaires aux comptes contrôle les opérations financières. Il se compose de deux personnes issues de structures professionnelles distinctes, et ses membres ne peuvent prendre individuellement aucune décision. C'est un organe de contrôle, pas un acteur.

La Direction générale est l'organe de gestion. Elle exécute les décisions du conseil, exécute le budget, élabore les états financiers, dirige l'ensemble des services et représente l'établissement vis-à-vis des tiers. Cette dernière attribution est le fondement d'une règle que le système tient sans exception : la Direction générale seule engage l'Agence. Ce n'est ni un usage interne ni une préférence de la maison, c'est la loi, et c'est pourquoi le circuit d'un courrier sortant finit toujours à la même signature.

<!-- matrice -->
| @@ Les organes de l'Agence | | | |
|---|---|---|---|
| Organe | Nature | Rôle | Place dans le système |
| Conseil d'administration | Organe de conception, d'orientation, de contrôle et de décision | Fixe la politique générale, détermine le programme, arrête le budget, approuve les états financiers ; se réunit chaque trimestre | Hors périmètre. Ses actes entrent : une résolution devient une charge à suivre, un budget arrêté devient le cadre d'exécution |
| Collège des commissaires aux comptes | Organe de contrôle, deux membres, aucune décision individuelle | Contrôle les opérations financières | Hors périmètre. Destinataire extérieur : un document qui lui est transmis sort de l'institution comme tout courrier sortant |
| Direction générale | Organe de gestion | Exécute les décisions du conseil et le budget, élabore les états financiers, dirige les services, représente l'Agence vis-à-vis des tiers | Cœur du périmètre. Seule instance qui engage l'Agence |
| Services rattachés à la Direction générale | Quatre services d'appui | Communication, NTIC, conformité, et Secrétariat de direction (vingt personnes : coordination administrative, courrier, support logistique) | Dans le périmètre. Le Secrétariat de direction est le métier du courrier |
| Directions centrales | Directions techniques | Planification spatiale ; Modernisation des villes ; sous elles, des divisions et des bureaux | Dans le périmètre, chacune autonome dans son fonctionnement |
| Pools territoriaux | Six entités territoriales | Présence de l'Agence dans le pays ; chacun couvre plusieurs provinces et est dirigé par un directeur de pool | Dans le périmètre, avec leur fuseau horaire propre |

### 1.3 La Direction générale et ses services rattachés

La Direction générale est tenue par une directrice générale et par un seul directeur général adjoint. Au-dessous, il n'existe que des directeurs et des chefs de cellule : l'Agence est plate, et cette platitude se retrouve dans les droits du système.

Quatre services sont rattachés à la Direction générale : la Cellule de communication, la Cellule NTIC, la Cellule de conformité et le Secrétariat de direction. Ce dernier compte vingt personnes, dont la charge est la coordination administrative, la gestion du courrier et le support logistique. C'est le plus gros service rattaché, et le courrier est son métier. Le service courrier se tient à la réception, physiquement, là où les gens entrent : c'est lui qui accuse réception et qui remet au porteur la preuve que l'Agence a reçu.

### 1.4 Les directions centrales

Viennent ensuite les directions centrales, Planification spatiale et Modernisation des villes, chacune tenue par un directeur. Sous elles se trouvent des divisions et des bureaux, qui prennent la forme de services. Ces entités préparent leurs plans de travail, tiennent leurs réunions, suivent leurs risques, produisent des livrables. Aucune ne demande à la Direction générale la permission de fonctionner.

### 1.5 Les pools territoriaux et les deux fuseaux horaires

L'Agence est présente dans tout le pays par six pools territoriaux, chacun couvrant plusieurs provinces et dirigé par un directeur de pool. Le Pool Grand Ouest siège à Kinshasa et couvre cinq provinces. Le Pool Grand Katanga siège à Lubumbashi et en couvre quatre.

Ces deux sièges ne sont pas à la même heure : Kinshasa est à UTC+1, Lubumbashi à UTC+2. Ce n'est pas une curiosité géographique. C'est la raison pour laquelle « aujourd'hui » n'est pas le même jour partout dans l'Agence, et pourquoi le système porte le fuseau par l'entité, et non seulement par l'institution.

### 1.6 Ce que cette forme commande

Trois conséquences gouvernent la conception. La première : une entité est autonome dans son fonctionnement. Une cellule tient ses réunions, adopte ses propres comptes rendus, prépare son plan, suit ses risques. Faire remonter à la Direction générale la validation des comptes rendus de chaque cellule ne durcirait pas le contrôle ; cela casserait le fonctionnement normal d'une administration et mettrait six cents validations par an sur le bureau de deux personnes.

La deuxième : un chef d'entité se limite à son entité et aux endroits où il a été invité. Ce n'est pas une restriction de sécurité ajoutée après coup, c'est la définition de sa fonction. La troisième : la Direction générale seule engage l'Agence. Tout le reste de l'institution prépare ; une seule personne engage, et le directeur général adjoint seulement pendant un intérim déclaré.

## 2. Le problème à résoudre

### 2.1 Pourquoi un outil de pilotage

La direction générale d'un établissement public ne manque pas d'informations ; elle manque d'un endroit où elles tiennent ensemble. Le courrier arrive par la réception, se dispatche au secrétariat, s'annote à l'antichambre. Les réunions produisent des charges qui se perdent entre deux comptes rendus. Les livrables d'un consultant déclenchent des paiements. Les risques, les partenaires, les dossiers des agents vivent chacun dans leur cahier. Piloter, c'est savoir chaque matin ce qui est arrivé, ce qui est en retard, ce qui attend une décision et de qui. Aujourd'hui, ce tour d'horizon coûte sept écrans.

### 2.2 Pourquoi un outil ordinaire ne convient pas

Trois faits de l'Agence écartent les gestionnaires de tâches du commerce.

L'Agence travaille sur registres. Courrier, décisions, comptes rendus, conventions, circuit du signataire : la matière première n'est pas la tâche mais l'acte écrit, numéroté, daté, signé, classé. Un courrier qui arrive sans numéro n'est pas encore entré dans l'institution ; une décision qui n'est pas inscrite au registre n'a pas été prise ; un compte rendu qui n'a pas été adopté est un projet. Un registre a trois propriétés qu'un gestionnaire de tâches n'a pas à tenir. Il est continu : les numéros se suivent, et un trou dans la série est une question à laquelle il faut pouvoir répondre. Il est daté de l'acte, non de la saisie : un courrier reçu le 3 et enregistré le 7 est du 3, ce qui rend l'antidatage possible mais exige qu'il alerte et laisse une trace. Il ne ment pas : ce qui est au journal a eu lieu.

L'Agence est dispersée et mal connectée. Six pools, deux fuseaux horaires, des antennes provinciales. Le système doit fonctionner hors connexion et se recaler ensuite, sans jamais produire deux fois le même numéro ni une date fausse.

L'Agence est petite en effectif et large en responsabilités. Cent quatre-vingt-douze agents pour 2,3 millions de km² : le coût d'un geste compte. Un outil qui exige trois fois trop de clics se fait contourner en six mois, et l'Agence retourne au cahier.

### 2.3 Trois coûts mesurés

Les testeurs ont relevé, sur l'outil actuel, trois coûts qui servent de repères à battre.

<!-- matrice -->
| @@ Les trois coûts de référence | | | |
|---|---|---|---|
| Geste | Coût constaté | Cible | Source de la cible |
| Replanifier les sept tâches ouvertes d'un lundi matin | 28 clics | Moins de dix clics | Critère de fin du lot des écrans à refaire |
| Déposer une note au signataire | 8 clics | Divisé au moins par deux, soit quatre clics au plus | Objectif O4 |
| Faire le tour de sa matinée, pour la direction générale | 7 écrans | Divisé au moins par deux, soit trois écrans au plus | Objectif O4 |

Ces trois chiffres ne sont pas des détails de confort. Ils décident si, dans six mois, quelqu'un rouvrira un cahier.

## 3. Objectifs

Cinq objectifs cadrent le système. Chacun porte une mesure vérifiable, de sorte que l'on puisse dire, à la recette, s'il est atteint.

<!-- matrice -->
| @@ Les cinq objectifs du système | | | |
|---|---|---|---|
| Repère | Objectif | Mesure | Ce que l'objectif écarte |
| O1 | Tenir les registres de l'Agence avec la rigueur d'un acte administratif | Aucune série discontinue sans trace ; aucune écriture au journal sans exécution correspondante | Un journal qui inscrit « approuvé » alors que rien ne s'est exécuté |
| O2 | Faire circuler le travail sans qu'on sorte de l'outil | Les cinq séquences de référence se jouent de bout en bout : courrier reçu, imputé, traité, classé ; réunion programmée, tenue, compte rendu adopté, recommandation close ; plan préparé, approuvé, suivi ; livrable produit, remis avec sa pièce, validé, payé ; agent recruté, affecté, doté de ses accès | Le retour au cahier ou au tableur entre deux étapes |
| O3 | Ne jamais laisser fuir ce qui est protégé | Aucune donnée masquée dans une vue n'est accessible par une autre voie | Un masque posé sur l'écran mais absent de la notification ou de la route de santé |
| O4 | Rendre le geste courant court | Les trois coûts de référence sont divisés au moins par deux | Vingt-huit clics pour une replanification du lundi |
| O5 | Fonctionner quel que soit l'état du réseau | Les actes d'enregistrement et de consultation restent possibles hors connexion | Un numéro en double, ou une date fausse, après une coupure |

Ces objectifs s'accompagnent d'une exigence de qualité mesurée d'une autre manière : zéro manquement au référentiel d'accessibilité WCAG 2.1 niveau AA, dans les deux thèmes, sur écran de bureau comme de téléphone.

## 4. Périmètre

### 4.1 Ce qui est dans le périmètre

Le système couvre la sphère de gestion, c'est-à-dire ce qui relève de la Direction générale au sens de la loi : exécution des décisions du conseil, exécution du budget, direction des services, représentation de l'établissement vis-à-vis des tiers. Il comprend seize modules : Courrier, Signataire, Réunions, Décisions, Plans de travail, Attributions, Portefeuille, Tâches, Livrables et consultants, Partenaires, Risques et indicateurs, Ressources humaines, Organisation, Administration, Coéquipiers IA et Documents.

### 4.2 Ce qui en est exclu, et pourquoi

Le Conseil d'administration et le Collège des commissaires aux comptes ne sont pas des organes de gestion, et le système est un outil de gestion. Leurs actes entrent dans le système ; ils ne s'y délibèrent pas. Une résolution du conseil devient une charge à suivre, un budget arrêté devient le cadre d'exécution, des états financiers approuvés deviennent un document de référence. Jamais une délibération à conduire dans l'application.

<!-- fiche -->
| Exclusion | Raison |
|---|---|
| Le Conseil d'administration et ses délibérations | Organe de conception, d'orientation, de contrôle et de décision, pas de gestion. Ses actes entrent dans le système, ils ne s'y délibèrent pas |
| Le Collège des commissaires aux comptes | Organe de contrôle dont les membres ne prennent individuellement aucune décision. Destinataire d'actes, pas acteur du système |
| La comptabilité générale et la paie | Métiers propres, outillés ailleurs. Le système s'y raccorde par les livrables et les contrats, il ne les remplace pas |
| Le site public de l'Agence | Autre produit, autre dépôt |
| Les annexes volumineuses du courrier | Reportées par le maître d'ouvrage, à reprendre dans une version ultérieure |

### 4.3 Les interfaces avec l'extérieur

Le Ministère de tutelle, la Cour des comptes et le Collège des commissaires aux comptes sont des destinataires extérieurs : tout document qui leur est transmis sort de l'institution par le module Courrier, comme n'importe quel courrier sortant. Les partenaires au développement relèvent des modules Partenaires et Livrables. Le système s'appuie en outre sur un serveur de temps pour disposer d'une heure sûre, et sur une messagerie pour les avis sortants.

## 5. Parties prenantes

L'Agence raisonne par fonctions, pas par rangs. Le rang technique dans l'outil ne donne pas le métier : la directrice générale est propriétaire du système et ne règle pas la messagerie ; le responsable informatique administre l'outil sans voir le pilotage. Un compte peut donc cumuler tous les pouvoirs techniques et peu de droits métier, et inversement. Quatorze acteurs sont retenus.

<!-- matrice -->
| @@ Les quatorze acteurs du système | | | |
|---|---|---|---|
| Acteur | Rôle dans le système | Ce qu'il attend du système | Ce qu'il ne fait pas |
| Directrice générale | Oriente, arbitre, tranche, approuve, signe au nom de l'Agence ; lit tout le pilotage | Un tour d'horizon de sa matinée en peu d'écrans ; le courrier à annoter avant toute affectation | Ne règle ni la messagerie ni les profils |
| Directeur général adjoint | Mêmes attributions de pilotage, hors enregistrement des décisions de la directrice générale | Voir ce que la directrice voit ; signer sans ambiguïté pendant un intérim | Ne signe qu'en intérim déclaré ; il n'y en a qu'un |
| Assistant de direction | Saisit pour la directrice générale : courrier, agenda, réunions, décisions dictées ; tient l'antichambre et le suivi | Saisir une fois, relancer sans ressaisir ; une frontière claire entre inscrire et décider | Ne décide pas à la place de la direction, ne signe pas |
| Directeur | Dirige une direction centrale : plan, projets, livrables, réunions de service, risques | Agir sur son périmètre sans solliciter la direction générale | N'agit pas hors de sa direction et des espaces où il est invité |
| Chef de cellule | Mêmes responsabilités, pour une cellule | Fonctionner de façon autonome ; ne se voir proposer que ce qui a un sens dans son monde | N'agit pas au niveau de l'Agence entière |
| Directeur de pool | Mêmes responsabilités, pour un pool couvrant plusieurs provinces | Des dates et des échéances à l'heure de son siège | N'agit pas hors de son pool |
| Agent | Ses tâches, celles de son entité, ses projets, son dossier ; vise au signataire quand il est dans le circuit | Une seule liste de ce qu'on lui demande, quelle qu'en soit l'origine | Ne modifie pas ce qu'il ne fait que consulter |
| Rapporteur | Programme les réunions, prend note de chaque point, rédige le compte rendu, porte son adoption | Ne rien perdre d'un compte rendu en cours ; consigner les modifications de l'assemblée | N'écrit que : il ne décide pas |
| Service courrier | Reçoit, enregistre, accuse réception, remet l'étiquette | Enregistrer une seule fois, à l'entrée ; remettre une preuve au porteur | N'impute pas |
| Secrétariat de direction | Dispatche, finalise les sortants, numérote, imprime, archive | Des numéros qui se suivent, sans trou ; une finalisation qui est son rôle et non celui de l'auteur | Ne modifie pas un texte figé pour signature |
| Responsable informatique | Administre comptes, profils, structure, messagerie, règles IA | Un outil administrable sans exposer les données métier | Aucun droit métier de direction : ne voit ni le pilotage, ni les décisions, ni le courrier confidentiel |
| Stagiaire | Travaille sur ce qu'on lui ouvre | Comprendre dès le premier écran ce qu'on attend de lui et à qui demander | Ne voit que ce qu'on lui ouvre |
| Consultant | Prestataire sous contrat : ses tâches, son contrat, le plan du projet, ses livrables | Savoir ce qu'il doit produire, pour quand, et comment le remettre | Ne voit que son contrat et son projet |
| Lecture seule | Suit sans modifier | Avoir quelque chose à suivre : un module vide reste visible | Ne modifie rien. Sa portée exacte reste à préciser (décision en cours) |

L'assistant de direction tient la frontière la plus délicate de l'institution. Il inscrit au registre une décision que la directrice générale a prise ; il ne la prend pas. Il prépare une lettre ; il ne la signe pas. Le système ne lui propose donc jamais un geste qui franchirait cette frontière.

## 6. Principes directeurs

Huit principes gouvernent toute décision de conception. Quand deux solutions s'opposent, celle qui respecte ces principes l'emporte, y compris si elle est plus longue à réaliser.

### 6.1 L'écrit fait foi

Une administration publique fonctionne à l'acte écrit, numéroté, daté, signé, classé. Le numéro est une donnée stockée et non un affichage calculé ; il porte un suffixe, de sorte que l'on puisse insérer 0001A et 0001B entre deux rangs plutôt que de renuméroter. L'heure du serveur date les actes, et elle se vérifie. Le journal ne s'écrit qu'après l'exécution, jamais avant, et tout acte qui engage l'Agence y figure. La liste des genres d'actes journalisés s'allonge, elle ne raccourcit jamais. Un document validé est figé.

### 6.2 Ce qui n'est pas permis n'est pas proposé

Le serveur vérifie tout droit avant d'exécuter un acte, quelle que soit la voie d'appel. L'interface, de son côté, ne propose jamais un geste que le serveur refusera : une liste de choix ne présente que des valeurs acceptées, un chef de cellule ne se voit pas offrir un risque « Agence entière ». Proposer puis refuser est la pire des deux fautes, parce qu'elle apprend à l'utilisateur que l'écran ment.

### 6.3 L'IA propose, un humain décide

L'Agence accepte des coéquipiers IA à une condition : une proposition passe par une validation humaine avant d'avoir le moindre effet. Deux conséquences suivent. Une proposition qui attend un décideur qu'elle n'a pas ne reste pas en suspens : elle expire et prévient le responsable. Et une validation humaine n'est jamais inscrite au journal avant que l'action ait réellement eu lieu, car dans une institution où l'écrit fait foi, une approbation inscrite à tort est pire que pas d'approbation.

### 6.4 Une fonctionnalité s'écrit une fois

Tout élément réutilisable, du bouton à la brique « ce qu'on me demande », est défini une fois et appelé partout. Seuls le module et les droits varient. Cent quarante-quatre boutons écrits à la main signifient cent quarante-quatre endroits à corriger à chaque amélioration. Le même principe vaut pour les objets métier : un courrier est enregistré une fois, et il apparaît ensuite partout où il doit apparaître, dans un état propre à chacun.

### 6.5 Un casier vide reste un casier

Un module sans contenu reste visible pour qui a le droit de le voir, et une liste vide explique pourquoi elle l'est et ce qu'il faut faire. Cacher un écran parce qu'il est vide le fait découvrir à ceux qui s'en servent déjà et le laisse introuvable aux autres. Un droit de consultation ouvre une porte, au même titre qu'un droit d'agir.

### 6.6 Le geste courant est court

Le coût en clics est une exigence au même titre que la sécurité. Les gestes de tous les jours, replanifier, déposer au signataire, faire le tour de sa matinée, se mesurent avant et après, et le chiffre doit baisser. Une personne a une seule liste de ce qu'on lui demande, quelle que soit l'origine : tâche de projet, action de réunion, courrier reçu pour traitement, décision à exécuter. Si chaque module tient son propre suivi, personne ne saura où regarder le matin.

### 6.7 L'entité est autonome

Ce qui se décide dans une entité se décide dans cette entité. Un compte rendu est adopté collégialement à la séance suivante, par l'assemblée qui l'a tenue, et non validé par la direction générale. L'autonomie est un principe de conception, pas une permission que l'on accorde puis retire.

### 6.8 Un lot se termine ou ne se commence pas

Le chantier avance par lots, chacun avec un critère de fin écrit avant la première ligne de code. Un lot n'est pas fini sur la foi d'un rapport : il est fini quand ses critères sont vérifiés, tests passés et diff relu. Il n'existe pas de lot à moitié fait que l'on laisse en l'état pour en ouvrir un autre. Le nombre de tests ne baisse jamais.

## 7. Bénéfices attendus

Chaque bénéfice est rattaché à un acteur et à une mesure. Les cibles chiffrées reprennent celles des objectifs ; là où aucun chiffre n'est encore arrêté, la mesure est un critère vérifiable, non une promesse.

<!-- matrice -->
| @@ Les bénéfices attendus par acteur | | | |
|---|---|---|---|
| Acteur | Aujourd'hui | Avec le système | Mesure |
| Directrice générale | Sept écrans pour faire le tour de sa matinée ; le courrier lui parvient sans passage prévu pour annotation | Un tour d'horizon en trois écrans au plus ; le courrier entre au signataire pour son annotation avant toute affectation | Sept écrans ramenés à trois au plus ; chaque courrier annoté avant imputation |
| Directeur général adjoint | Aucune délégation de signature n'existe | Une délégation datée, qui ne vaut que pendant un intérim déclaré | Aucune signature hors délégation valide |
| Assistant de direction | Le même courrier est enregistré trois fois, puis relancé à la main | Un seul enregistrement, des relances tous les deux jours, un retard signalé à une semaine | Un enregistrement par courrier ; zéro relance manuelle |
| Directeur, chef de cellule, directeur de pool | Le logiciel remonte les comptes rendus à la direction générale ; des propositions sans sens pour leur périmètre | Adoption des comptes rendus au sein de l'entité ; seules les actions de leur périmètre sont proposées | Zéro validation de compte rendu par la direction générale ; zéro choix refusé par le serveur dans une liste |
| Agent | Vingt-huit clics pour replanifier sept tâches ; une liste de tâches qui ne reprend pas les actions de réunion ni le courrier | Une liste unique de charges, avec son origine ; replanification en moins de dix clics | Vingt-huit clics ramenés à moins de dix ; une seule liste pour toutes les origines |
| Rapporteur | Un compte rendu de cent quatre champs peut s'effacer sur un simple clic dans le menu | Aucune perte sans confirmation ; modifications de l'assemblée consignées ; rôles de rapporteur et d'intervenant distincts | Zéro saisie perdue à la navigation ; modifications d'adoption tracées avec leur auteur |
| Service courrier | Une étiquette collée à la main | Une étiquette imprimable, le porteur repart avec la preuve | Chaque accusé de réception produit une étiquette |
| Secrétariat de direction | Numéros calculés à l'affichage, aucun suffixe possible | Numéro stocké, avec suffixe ; finalisation et impression dans son rôle | Aucune série discontinue sans trace |
| Responsable informatique | Droits corrigés au cas par cas ; vérifier puis changer un droit coûte deux écrans et six clics | Droits vérifiés au serveur et sans contournement ; un seul écran | Zéro droit de l'interface sans correspondant serveur |
| Stagiaire | Un écran d'accueil qui ne dit pas ce qu'on attend de lui | Un premier écran qui nomme ses attentes et son responsable | Attentes et responsable affichés au premier écran |
| Consultant | Remise d'un livrable en deux clics, zéro champ, zéro pièce | Remise impossible sans pièce ; son contrat et ses échéances visibles | Zéro remise et zéro validation sans pièce ; zéro paiement sur livrable sans pièce |
| Lecture seule | Une ouverture « pour qu'il suive » sans porte vers quoi que ce soit | Chaque droit de lecture ouvre sa porte, même sur un module vide | Chaque écran autorisé atteignable depuis le rail ou la recherche |
| Agence entière | Des numéros ou des dates à risque hors connexion ; une horloge de machine non vérifiée | Un temps de référence qui ne recule pas, un fuseau par entité, un numéro unique entre postes | Zéro numéro en double ; zéro manquement d'accessibilité WCAG 2.1 niveau AA |

---

## Architecture fonctionnelle

Le système compte seize modules. Ils ne forment pas seize outils côte à côte : ils s'organisent autour de ce que l'Agence produit réellement, qui est de l'écrit — des actes numérotés, datés, signés, classés — et du travail qui en découle pour des personnes précises. Ce chapitre pose la carte d'ensemble, dit ce qui relie les modules entre eux, puis nomme les quatre objets qui les traversent tous : la charge, l'acte, l'entité et le document. Les seize chapitres suivants reprennent chaque module dans le même ordre et la même forme.

### La carte des seize modules

Les modules se rangent en quatre familles. Les registres de l'écrit tiennent les actes : courrier, signataire, réunions, décisions. Le travail de l'entité tient ce que chaque direction ou cellule s'est engagée à faire : attributions, plans de travail, portefeuille, livrables, partenaires, risques. Les personnes et la structure disent qui est qui et qui peut quoi : ressources humaines, organisation, administration. Deux modules sont transverses : les tâches, qui rassemblent ce qu'on demande à une personne, quelle qu'en soit l'origine, et les documents, qui portent les pièces de tous les autres. Les coéquipiers IA proposent dans tous les modules et ne décident dans aucun.

<!-- matrice -->
| @@ Les seize modules | | | |
|---|---|---|---|
| Code | Module | Ce qu'il tient dans la vie de l'Agence | Famille |
| COU | Courrier | Le registre du courrier entrant et sortant, de l'accusé de réception au classement | Registres de l'écrit |
| SIG | Signataire | Le circuit de visa puis de signature de tout ce qui sort de l'Agence ou l'engage | Registres de l'écrit |
| REU | Réunions | Programmation, tenue, compte rendu adopté collégialement, recommandations | Registres de l'écrit |
| DEC | Décisions | Le registre des décisions de la direction générale et leur exécution | Registres de l'écrit |
| PLA | Plans de travail | L'engagement annuel d'une entité, approuvé au-dessus d'elle | Travail de l'entité |
| ATT | Attributions | La fiche de ce dont une entité a la charge, selon le cadre organique | Travail de l'entité |
| POR | Portefeuille | Les projets et les activités que la direction pilote, leur santé, leurs arbitrages | Travail de l'entité |
| TAC | Tâches | Les tâches, et la liste unique de ce qu'on demande à une personne | Transverse |
| LIV | Livrables | Les produits attendus, leur validation, les contrats des consultants | Travail de l'entité |
| PAR | Partenaires | L'annuaire des tiers, les conventions, les avenants | Travail de l'entité |
| RIS | Risques | Le registre des risques et les indicateurs qui en mesurent la tenue | Travail de l'entité |
| RH | Ressources humaines | Les dossiers, les arrivées et sorties, les congés, le secret médical | Personnes et structure |
| ORG | Organisation | La forme de l'Agence : entités, chefs, périmètres, fuseaux | Personnes et structure |
| ADM | Administration | Comptes, profils, droits, messagerie, journal d'audit | Personnes et structure |
| IA | Coéquipiers IA | Ce que l'IA propose et qu'un humain valide ou refuse | Transverse |
| DOC | Documents | Pièces, modèles, génération, exports, archives | Transverse |

```
REGISTRES DE L'ECRIT      Courrier ---> Signataire ---> Decisions
                          Reunions -------------------> Decisions
                              |  charges   charges  |
                              v                     v
LA LISTE UNIQUE           TACHES  (ce qu'on demande a une personne)
                              ^                     ^
TRAVAIL DE L'ENTITE   Attributions -> Plans -> Portefeuille -> Livrables
                                                  |  Risques   Partenaires
                                                  v
PERSONNES, STRUCTURE   Ressources humaines   Organisation   Administration
                                      (qui est qui, qui peut quoi, ou, a quelle heure)
TRANSVERSES            Documents (pieces, modeles, archives)    Coequipiers IA
```

### Ce qui relie les modules

Un module ne tient pas sa propre version de ce qu'un autre module a déjà établi. Le courrier ne recopie pas les entités : il les lit dans l'organisation. Une recommandation de réunion ne devient pas une tâche parallèle : elle alimente la liste de la personne. Un accord signé ne se signe pas ailleurs que dans le signataire. Cette règle est celle des briques : une fonction s'écrit une fois et s'appelle partout ; seuls le module et les droits varient.

Le tableau suivant dit ce qui circule entre les modules. Chaque ligne est un lien que le système doit tenir ; une ligne sans lien tenu est un défaut d'architecture, pas seulement de module.

<!-- matrice -->
| @@ Les liens entre modules | | | |
|---|---|---|---|
| De | Vers | Ce qui circule | Règle |
| Courrier | Signataire | Le courrier entrant pour l'annotation de la direction générale ; le projet de courrier sortant pour visa et signature | RG-COU-05, RG-SIG-08 |
| Courrier | Tâches | Une charge pour tout destinataire recevant un courrier pour traitement | RG-COU-04 |
| Signataire | Courrier, Partenaires, Livrables | Le document signé, daté, figé, avec sa mention éventuelle de délégation | RG-SIG-04, RG-SIG-06 |
| Réunions | Tâches | Une recommandation décidée en séance devient une tâche pour son responsable | RG-REU-11 |
| Réunions | Décisions | Une décision prise en séance est inscrite au registre | RG-DEC-01 |
| Décisions | Tâches | Une décision à exécuter est une charge pour son chargé d'exécution | RG-DEC-06 |
| Portefeuille | Décisions | La demande d'arbitrage d'un dossier, tranchée par la direction générale | RG-DEC-03 |
| Portefeuille | Plans de travail | L'avancement d'un dossier remonte à l'activité du plan qu'il réalise | RG-PLA-07 |
| Attributions | Plans de travail | Les attributions de l'entité fondent son plan | RG-ATT-05 |
| Livrables | Portefeuille | Les livrables en retard alimentent la santé calculée du dossier | RG-POR-06 |
| Partenaires | Signataire | Les accords et avenants empruntent le circuit de signature | RG-PAR-02 |
| Ressources humaines | Organisation, Administration | L'arrivée crée le compte et l'affectation ; la sortie les suspend et les clôt | RG-RH-04 |
| Organisation | Tous | Le périmètre d'un chef et le fuseau d'une entité bornent chaque module | RG-ORG-07, RG-ORG-10 |
| Administration | Tous | Les profils et les droits, vérifiés au serveur avant tout acte | RG-ADM-01 |
| Coéquipiers IA | Tous | Une proposition, sans effet avant la validation d'un humain | RG-IA-01 |
| Documents | Tous | Les pièces, les modèles, les exports, les archives | RG-DOC-02 |

### Les quatre objets qui traversent tout le système

Quatre objets reviennent dans presque tous les chapitres. Les comprendre une fois évite de les redécouvrir module par module.

<!-- fiche -->
| Objet | Ce que c'est | Où il naît, où il vit |
|---|---|---|
| La charge | Ce qu'on attend d'une personne, avec une échéance | Elle naît dans un module d'origine (tâche, réunion, courrier, décision, livrable) et se lit dans la liste unique de la personne |
| L'acte | Ce qui est écrit, numéroté, daté, signé, classé | Il naît dans un registre (courrier, décision, compte rendu, accord) et ne se réécrit plus une fois figé |
| L'entité | Un lieu de l'Agence qui fonctionne en autonomie | Elle naît dans l'organisation ; elle borne le périmètre, le fuseau et l'autonomie de tout le reste |
| Le document | La pièce qui porte l'acte ou le prouve | Il est rangé dans un seul objet porteur et suit l'accès de cet objet |

#### La charge

Une personne a une seule liste de ce qu'on lui demande, quelle que soit l'origine. Une tâche de projet, une action décidée en réunion, un courrier reçu pour traitement, une décision à exécuter, un livrable à produire ou à valider : tout cela est une charge. La charge garde son domicile dans le module qui l'a produite ; la liste de la personne n'en est qu'une vue. C'est pourquoi le module Tâches n'est pas un module de plus : il est l'endroit où l'on regarde le matin. Si chaque module tient son propre suivi, personne ne sait où regarder, et l'outil a échoué sur ce qu'on lui demande de faire. Chaque charge dit d'où elle vient, à qui s'adresser, et se relance avant son échéance.

#### L'acte

Une administration publique fonctionne à l'acte écrit. Un courrier sans numéro n'est pas entré dans l'Agence ; une décision qui n'est pas inscrite n'a pas été prise ; un compte rendu qui n'a pas été adopté est un projet. Tout acte porte un numéro unique dans sa série et son exercice, une date qui est celle de sa survenance et non de sa saisie, et une trace de qui l'a produit. On peut insérer un acte entre deux rangs par un numéro suffixé, on peut antidater en le signalant, on ne réécrit jamais un acte figé : on le remplace par un autre. Le journal n'inscrit que ce qui a eu lieu. Seule la direction générale engage l'Agence ; le directeur général adjoint le fait pendant un intérim déclaré, par une délégation datée.

#### L'entité

L'Agence raisonne par fonctions et par lieux, pas par rangs. Une entité — direction, division, bureau, cellule, pool, représentation provinciale, antenne — tient ses réunions, adopte ses comptes rendus, prépare son plan, suit ses risques, sans demander la permission de la direction générale. Son chef exerce ses droits sur elle, sur les entités qui lui sont rattachées et sur les espaces où il a été invité, nulle part ailleurs. L'entité porte aussi le fuseau horaire : Kinshasa est à UTC+1, Lubumbashi à UTC+2, et « aujourd'hui » n'est pas le même jour partout. Le périmètre est une dimension distincte du droit : avoir un droit ne dit pas pour quelle entité.

#### Le document

Un document est rangé dans un seul objet porteur — un dossier, un partenaire, un accord, un courrier, une réunion — et son accès suit celui de cet objet. Il est décrit par un type. Un document validé ou signé est figé et ne se supprime pas. On le génère à partir d'un modèle plutôt que de le retaper. Quand il est classé, le registre dit qui l'a classé et à quel dossier il se rattache. Un export de registre est un document comme un autre : il est tracé et ne contient rien qui soit masqué à l'écran.

### Lire les tableaux de fonctions

Chaque module se termine par un tableau des fonctions, tiré des exigences de la spécification. Une ligne peut regrouper plusieurs exigences, dont les références figurent dans la colonne Fonction. L'état de chaque ligne a été établi en confrontant l'exigence à l'existant ; il vaut au jour de la rédaction, le 25 novembre 2026.

<!-- fiche -->
| État | Sens |
|---|---|
| Existant | La fonction est tenue par le système aujourd'hui |
| Partiel | Elle existe, mais une partie de l'exigence n'est pas tenue |
| À corriger | Elle existe et fait autre chose, ou le contraire, de ce qu'exige l'Agence |
| À construire | Rien n'existe : l'absence est constatée |
| Non vérifié | L'exigence est écrite mais personne n'a encore relu le code pour dire si elle est tenue |

Cette cinquième valeur n'est pas un défaut de rédaction : sur les 477 exigences, 292 n'ont pas encore été confrontées à l'existant. Les ranger sous l'une des quatre autres valeurs serait affirmer ce que personne n'a vérifié. Elles doivent l'être avant l'ouverture des lots concernés.

## Module Courrier

Le Secrétariat de direction compte vingt personnes, et la gestion du courrier est son métier : c'est la charge que l'Agence lui a donnée, avec la coordination administrative et le support logistique. Le service courrier se tient à la réception, physiquement, là où les gens entrent. Quand quelqu'un pousse la porte avec une enveloppe, le service accuse réception, et le porteur repart avec une étiquette : c'est sa preuve que l'Agence a reçu. Le courrier, lui, commence son chemin.

Aujourd'hui, ce chemin enregistre trois fois le même pli : au service courrier, au secrétariat, à l'antichambre de la direction générale. Le module supprime ce gaspillage. Un courrier est enregistré une seule fois, à son entrée ; ensuite il apparaît partout où il doit apparaître, mais pas de la même façon partout. Au secrétariat il est à dispatcher ; à l'antichambre, à transmettre à la direction générale ; chez une direction, pour traitement, avec une échéance ; chez trois autres personnes, pour information. Un courrier, autant d'états que de personnes concernées : c'est le cœur du module, et c'est ce qu'un destinataire unique ne peut pas représenter.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Service courrier | Reçoit, enregistre une fois, accuse réception, remet l'étiquette |
| Secrétariat de direction | Dispatche, finalise les sortants, numérote, imprime, classe |
| Antichambre de la direction générale | Transmet à la direction, dispatche après annotation, suit, peut partager avec toute personne |
| Directrice générale | Annote avant toute imputation, instruit, signe les sortants |
| Entité ou agent destinataire | Traite, répond, déclare l'action prise avec une pièce |
| Tout agent concerné | Lit ce qui lui est adressé pour information |

### Le cycle de vie

Un courrier porte un état global, qui est la synthèse, et pour chaque destinataire un état propre. Entrant, il est reçu, enregistré, puis passe au signataire pour que la direction générale le voie et l'annote ; l'annotation commande l'imputation, c'est-à-dire l'affectation à une entité et à une personne, pour préparer une réponse, prendre une action ou classer. Chaque destinataire pour traitement reçoit une charge et fait avancer son propre état jusqu'au traitement ; ceux qui sont en copie le lisent seulement. Le courrier est classé quand tous les traitements sont faits. Une réponse est un courrier sortant, qui prépare son texte, passe par l'antichambre, se fige à la signature, puis est finalisé par le secrétariat. L'enregistrement de la réponse clôt l'entrant.

```
ENTRANT
RECEPTION --> ENREGISTRE --> AU SIGNATAIRE --> ANNOTE --> IMPUTE --> EN TRAITEMENT --> TRAITE --> CLASSE
 (etiquette)   (une fois)    (vu par la DG)  (instruction) (N acheminements)  |                (registre)
                                                                              +-- reponse --> SORTANT

SORTANT
PROJET --> ANTICHAMBRE --> SIGNATURE (texte fige) --> SIGNE --> FINALISE (numero, impression) --> CLASSE

CHAQUE DESTINATAIRE : pour traitement (charge + echeance) / pour information / les deux
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-COU-01 | Un courrier n'est enregistré qu'une fois, à son entrée dans l'Agence. | Fonctionnement de l'Agence |
| RG-COU-02 | Chaque destinataire d'un courrier a son propre état d'avancement. | Fonctionnement de l'Agence |
| RG-COU-03 | Un destinataire reçoit un courrier pour traitement ou pour information ; il peut recevoir les deux. | Fonctionnement de l'Agence |
| RG-COU-04 | Un courrier reçu pour traitement crée une charge pour son destinataire. | Fonctionnement de l'Agence |
| RG-COU-05 | L'instruction de la direction générale précède et commande l'imputation. | Fonctionnement de l'Agence |
| RG-COU-06 | Une instruction est d'une de ces natures : préparer une réponse, prendre une action, classer. | Fonctionnement de l'Agence |
| RG-COU-07 | Un courrier sortant est signé par la direction générale, ou par le directeur général adjoint en intérim déclaré. | Loi |
| RG-COU-08 | Un chef d'entité impute à un agent de son entité ; la direction impute sans cette restriction. | Fonctionnement de l'Agence |
| RG-COU-09 | Le rang suit l'ordre d'enregistrement, par exercice, entrants et sortants confondus. | Fonctionnement de l'Agence |
| RG-COU-10 | Un courrier non traité est relancé tous les deux jours ; au bout d'une semaine il est en retard. | Fonctionnement de l'Agence |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Courrier | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Réception | Enregistrer un courrier entrant une seule fois, avec expéditeur, destinataire, objet, date de réception et numéro (EX-COU-001) | Service courrier | RG-COU-01 | Partiel |
| Réception | Produire l'étiquette d'accusé de réception imprimable, portant le numéro et les mentions d'identification ; contenu exact attendu du maître d'ouvrage (EX-COU-002) | Service courrier | RG-COU-01 | À construire |
| Numérotation | Attribuer et stocker le numéro sens/exercice/rang, le rang étant déduit de l'exercice à l'enregistrement (EX-COU-003) | Système | RG-COU-09 | Partiel |
| Numérotation | Attribuer un numéro secondaire suffixé pour insérer un courrier entre deux rangs (EX-COU-004) | Secrétariat de direction | RG-COU-09 | À construire |
| Numérotation | Avertir et journaliser quand la date de réception est antérieure au jour (EX-COU-005) | Service courrier | RG-COU-09 | À corriger |
| Numérotation | Refuser une date de réception postérieure au jour (EX-COU-006) | Système | RG-COU-09 | Existant |
| Acheminement | Représenter autant d'acheminements que de destinataires, chacun avec sa mention, son état et son échéance (EX-COU-010) | Secrétariat, antichambre | RG-COU-02 | À corriger |
| Acheminement | Distinguer la mention pour traitement de la mention pour information (EX-COU-011) | Secrétariat, antichambre | RG-COU-03 | Partiel |
| Acheminement | Présenter en un seul courrier, marqué pour traitement, ce que reçoit une personne qui cumule les deux mentions (EX-COU-012) | Destinataire | RG-COU-03 | Non vérifié |
| Acheminement | Créer une charge, avec l'échéance de l'imputation, pour tout destinataire pour traitement (EX-COU-013) | Système | RG-COU-04 | À construire |
| Acheminement | Transmettre un courrier à l'antichambre, qui le dispatche après annotation (EX-COU-014) | Secrétariat, antichambre | RG-COU-05 | À construire |
| Acheminement | Partager un courrier avec toute personne de l'Agence (EX-COU-015) | Antichambre | RG-COU-05 | Non vérifié |
| Instruction | Annoter un courrier avant toute imputation (EX-COU-020) | Direction générale | RG-COU-05 | À corriger |
| Instruction | Porter la nature de l'instruction : préparer une réponse, prendre une action, classer (EX-COU-021) | Direction générale | RG-COU-06 | À construire |
| Imputation | Limiter l'imputation d'un chef à son entité, sans restriction pour la direction | Chef d'entité, direction | RG-COU-08 | Non vérifié |
| Traitement | Déclarer l'action prise et y joindre une pièce (EX-COU-022) | Destinataire | RG-COU-04 | Non vérifié |
| Traitement | Répondre depuis le courrier entrant en reprenant ses informations (EX-COU-023) | Destinataire | RG-COU-05 | À corriger |
| Traitement | Clore l'entrant à l'enregistrement de sa réponse (EX-COU-024) | Système | RG-COU-05 | Existant |
| Sortant | Soumettre un projet de courrier sortant, sur instruction ou sur initiative (EX-COU-030) | Toute personne autorisée | RG-COU-07 | Non vérifié |
| Sortant | Faire passer tout projet par l'antichambre avant la signature (EX-COU-031) | Antichambre | RG-COU-07 | À construire |
| Sortant | Modifier un projet ou le retourner à son auteur pendant la préparation (EX-COU-032) | Antichambre | RG-SIG-02 | À corriger |
| Sortant | Figer le contenu dès l'entrée en phase de signature (EX-COU-033) | Système | RG-SIG-02 | Partiel |
| Sortant | N'accepter la signature que de la direction générale, ou du DGA en intérim déclaré (EX-COU-034) | Direction générale | RG-COU-07 | Partiel |
| Sortant | Générer un courrier depuis un modèle déposé, en-têtes compris (EX-COU-035) | Tout agent autorisé | RG-DOC-04 | À construire |
| Sortant | Réserver au secrétariat la finalisation : numérotation et impression (EX-COU-036) | Secrétariat de direction | RG-DOC-05 | Non vérifié |
| Suivi | Relancer le chargé d'un courrier non traité tous les deux jours (EX-COU-040) | Système | RG-COU-10 | À corriger |
| Suivi | Marquer en retard un courrier non traité au bout d'une semaine, calendaire ou ouvrable selon la décision attendue (EX-COU-041) | Système | RG-COU-10 | Non vérifié |
| Suivi | Remonter au chef d'entité puis à la direction générale un courrier qui demeure non traité (EX-COU-042) | Système | RG-COU-10 | Partiel |
| Classement | Tenir un registre unique des classés, avec qui a classé et à quel dossier (EX-COU-043) | Secrétariat de direction | RG-DOC-06 | Partiel |
| Classement | Présenter les archives en trois vues, secrétariat, direction générale et projet, d'un même registre (EX-COU-044) | Secrétariat, direction | RG-DOC-06 | À construire |
| Classement | Rechercher et filtrer le registre du courrier (EX-COU-045) | Tout utilisateur du registre | RG-COU-09 | À corriger |
| Classement | Enregistrer plusieurs courriers à la suite sans revenir à la liste (EX-COU-046) | Service courrier | RG-COU-01 | Non vérifié |
| Confidentialité | Ne révéler l'objet d'un courrier confidentiel qu'à ses destinataires et aux personnes habilitées (EX-COU-050) | Système | EX-TRA-010 | Non vérifié |
| Confidentialité | Ne proposer comme expéditeur que des partenaires que le destinataire peut lire (EX-COU-051) | Système | RG-PAR-07 | À corriger |

### Ce qui manque aujourd'hui

Sur trente-trois exigences, vingt-trois ont été confrontées à l'existant : deux sont tenues, sept le sont en partie, sept ne le sont pas, sept n'existent pas. L'écart tient en une phrase : l'outil représente un courrier qui a un destinataire, alors que l'Agence a un courrier qui a des destinataires. Il n'existe qu'un seul chargé par courrier, les autres ne sont que des copies, et la mention pour traitement n'existe pas comme telle. Il s'ensuit qu'aucune charge n'est créée dans la liste de la personne, et que le courrier n'entre jamais au signataire : l'annotation de la direction générale se saisit pendant l'imputation, par celui qui impute, alors qu'à l'Agence elle la précède et la commande. Il n'y a pas d'accusé de réception, donc pas d'étiquette pour le porteur ; le numéro est calculé et non stocké, donc aucune insertion possible ; l'antidatage est accepté sans un mot. Répondre à un entrant coûte quatre clics et trois informations ressaisies. Aucune recherche, aucun filtre. Les relances sont un rappel unique, à l'échéance, au lieu d'un toutes les deux jours. Enfin un partenaire confidentiel figure dans la liste des expéditeurs et son nom est livré avant que le lien soit refusé. Ce qui tient : la date future est refusée et la réponse clôt bien l'entrant. Dix exigences ne sont pas vérifiées et le resteront jusqu'à relecture du code.

## Module Signataire

Tout ce qui sort de l'Agence ou l'engage passe par un circuit où le document recueille des visas, puis une signature. Une lettre au ministère de tutelle, une convention avec un bailleur, un avenant, un contrat de mission : la direction générale seule engage l'Agence vis-à-vis des tiers, et c'est la loi qui le dit, non un usage de la maison. Tout le reste de l'institution prépare ; une seule personne signe. L'Agence appelle ce circuit le signataire. Les testeurs l'ont jugé bien fait, et c'est le seul circuit de signature du système : le courrier sortant n'en a pas d'autre.

Le module sépare deux temps. Pendant la préparation, l'auteur et l'antichambre écrivent librement, corrigent, se renvoient le texte. Pendant la signature, le texte est figé : un circuit de signature ne vaut que parce que le contenu n'a pas bougé depuis son entrée. On modifie avant, jamais pendant. Le module porte aussi la délégation de signature : le directeur général adjoint ne signe qu'en intérim déclaré, par une délégation datée qui s'ouvre et se ferme seule.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Auteur | Prépare le document, le soumet, le retire |
| Antichambre de la direction générale | Corrige ou retourne un projet pendant la préparation |
| Visant | Donne ou refuse son visa à son étape ; n'engage pas l'Agence |
| Secrétariat de direction | Finalise : numérotation, impression |
| Directrice générale | Vise, signe au nom de l'Agence, délègue sa signature |
| Directeur général adjoint | Signe pendant un intérim déclaré, par délégation datée, et pendant lui seulement |
| Coéquipier IA | Ne vise ni ne signe |

### Le cycle de vie

Un document naît en préparation, où son texte est libre. L'auteur compose la suite ordonnée des étapes de visa et lance le circuit : le texte est alors figé et son empreinte conservée. Chaque visant, à son étape, donne son visa ou le refuse ; un refus porte un motif écrit et ramène le document à son auteur, en préparation. Une fois les visas recueillis, la direction générale signe, ou le directeur général adjoint sous une délégation ouverte. Le document signé ne revient jamais ; le secrétariat le finalise, c'est-à-dire le numérote et l'imprime. Un document peut être retiré du circuit à tout moment avant la signature, avec un motif.

```
PREPARATION --> VISAS --------------> SIGNATURE --> SIGNE --> FINALISE
 (texte libre)  (etapes ordonnees)    (texte fige)   (acte)   (numero, impression)
     ^               |                     |
     +--- retrait ---+---- refus motive ---+

DELEGATION : declaree (dates de debut et de fin) --> ouverte --> fermee d'elle-meme
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-SIG-01 | Un document au signataire passe par deux phases : préparation, puis signature. | Fonctionnement de l'Agence |
| RG-SIG-02 | Le texte se modifie en préparation ; il est figé dès l'entrée en phase de signature. | Fonctionnement de l'Agence |
| RG-SIG-03 | Un visa est l'accord d'une étape intermédiaire ; il n'engage pas l'Agence. | Fonctionnement de l'Agence |
| RG-SIG-04 | Seule la direction générale signe au nom de l'Agence ; le DGA le fait pendant un intérim déclaré. | Loi |
| RG-SIG-05 | L'intérim se déclare par une délégation datée qui s'ouvre et se ferme seule. | Fonctionnement de l'Agence |
| RG-SIG-06 | Un document qui engage l'Agence est signé par la direction générale, quel que soit son auteur. | Loi |
| RG-SIG-07 | Un coéquipier IA ne vise ni ne signe. | Fonctionnement de l'Agence |
| RG-SIG-08 | Courrier sortant, annotation d'un entrant, accords et avenants empruntent ce circuit. | Fonctionnement de l'Agence |
| RG-SIG-09 | Un refus de visa porte un motif écrit et ramène le document à son auteur. | Métier |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Signataire | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Deux phases | Distinguer pour tout document la phase de préparation et la phase de signature (EX-SIG-001) | Auteur, système | RG-SIG-01 | Partiel |
| Deux phases | Modifier le texte pendant la préparation (EX-SIG-002) | Auteur, antichambre | RG-SIG-02 | À corriger |
| Deux phases | Refuser toute modification dès l'entrée en phase de signature (EX-SIG-003) | Système | RG-SIG-02 | Existant |
| Deux phases | Conserver une empreinte du texte figé et permettre d'en vérifier l'intégrité (EX-SIG-004) | Système | RG-SIG-02 | Non vérifié |
| Deux phases | Retirer un document du circuit et le remettre en préparation, motif obligatoire (EX-SIG-005) | Auteur | RG-SIG-09 | Non vérifié |
| Visas | Composer, avant le lancement, une suite ordonnée d'étapes de visa (EX-SIG-010) | Auteur | RG-SIG-03 | Non vérifié |
| Visas | Présenter à chaque visant les documents qui attendent son visa (EX-SIG-011) | Visant | RG-SIG-03 | Non vérifié |
| Visas | Enregistrer pour chaque visa son auteur, sa date et son avis (EX-SIG-012) | Système | RG-SIG-03 | Non vérifié |
| Visas | Refuser un visa à une personne qui n'est pas dans le circuit (EX-SIG-013) | Système | RG-SIG-03 | Non vérifié |
| Visas | Refuser un visa négatif sans motif et ramener le document à son auteur (EX-SIG-014) | Visant | RG-SIG-09 | Non vérifié |
| Visas | Avertir le visant suivant quand une étape est franchie (EX-SIG-015) | Système | RG-SIG-03 | Non vérifié |
| Visas | Produire pour un document signé un bordereau de ses visas et de sa signature (EX-SIG-016) | Secrétariat de direction | RG-SIG-03 | Non vérifié |
| Signature | N'accepter la signature que de la direction générale, ou du DGA pendant une délégation ouverte (EX-SIG-020) | Direction générale, DGA | RG-SIG-04, RG-SIG-06 | Partiel |
| Délégation | Déléguer la signature au DGA par une délégation datée (EX-SIG-021) | Direction générale | RG-SIG-05 | À construire |
| Délégation | Refuser une délégation sans date de début ni date de fin (EX-SIG-022) | Système | RG-SIG-05 | À construire |
| Délégation | Ouvrir et fermer la délégation à ses dates, sans geste de personne (EX-SIG-023) | Système | RG-SIG-05 | À construire |
| Délégation | Journaliser l'ouverture, la fermeture et chaque signature accomplie sous délégation (EX-SIG-024) | Système | EX-TRA-007 | À construire |
| Délégation | Indiquer sur tout acte signé par délégation qu'il l'a été ainsi, et pour quelle période (EX-SIG-025) | Système | RG-SIG-05 | À construire |
| Signature | Refuser qu'un coéquipier IA vise ou signe (EX-SIG-026) | Système | RG-SIG-07 | Non vérifié |
| Signature | Présenter à la direction générale la pile à signer, séparée de la pile à viser (EX-SIG-027) | Direction générale | RG-SIG-03 | Non vérifié |
| Entrées | Accepter au signataire un projet de courrier sortant (EX-SIG-030) | Auteur | RG-SIG-08 | À construire |
| Entrées | Accepter l'annotation de la direction générale sur un courrier entrant (EX-SIG-031) | Direction générale | RG-SIG-08 | À construire |
| Entrées | Accepter les accords et leurs avenants (EX-SIG-032) | Gestionnaire des partenariats | RG-SIG-08 | Non vérifié |
| Entrées | Retirer du circuit, avec motif, un avenant dont l'accord parent n'est plus en vigueur (EX-SIG-033) | Système | RG-PAR-04 | À corriger |
| Retour | Répondre par un message écrit à l'enregistrement d'un brouillon, au lancement d'un circuit et à l'approbation (EX-SIG-040) | Auteur, visant | EX-TRA-050 | À corriger |
| Vocabulaire | Nommer signataire le circuit et Signé par la personne qui signe un accord (EX-SIG-041) | Tous | EX-TRA-062 | À corriger |

### Ce qui manque aujourd'hui

Sur vingt-six exigences, quatorze ont été confrontées : une est tenue, deux le sont en partie, quatre ne le sont pas, sept n'existent pas. Le circuit lui-même fonctionne et son intégrité tient depuis l'entrée du document ; ce qui manque est tout ce qui l'entoure. La phase de préparation n'est pas distinguée, si bien que l'antichambre ne peut pas corriger un projet dans le circuit. Le courrier n'y entre jamais, ni en sortant ni pour l'annotation de la direction générale. La délégation de signature n'existe pas : le droit de signer au nom de l'Agence est un droit permanent du seul profil de la direction générale, et l'intérim n'est connu du système que pour les congés d'un agent. Rien n'ouvre ni ne ferme une période d'intérim, rien ne la journalise, rien ne la mentionne sur l'acte signé. Une résiliation d'accord laisse son avenant coincé au statut signature : il ne peut plus entrer en vigueur, ni être supprimé, ni être rejeté. Trois actes engageants — enregistrer un brouillon, lancer un circuit, approuver — ne répondent rien. Et le mot « signataire » est employé deux cent trente-deux fois, tandis que Signataire désigne déjà une personne dans l'écran des accords. Douze exigences ne sont pas vérifiées.

## Module Réunions

L'Agence se gouverne en réunions. Chaque entité tient les siennes — réunion de service, de cellule, de projet — et il existe en outre une réunion hebdomadaire des directions, qui rassemble les directions et les cellules. Ce que produit une séance n'est pas seulement un document : ce sont des charges. À l'issue d'une réunion des directions, chaque intervenant repart avec ce qu'il doit faire et pour quand ; le module doit retracer ces charges et les relancer, faute de quoi la séance suivante les redécouvre.

Le compte rendu ne se valide pas, il s'adopte. Il est adopté collégialement à la séance suivante, au premier point de l'ordre du jour, avec ou sans modifications consignées. Entre la séance et son adoption, tous les présents peuvent l'amender, avec trace de qui a écrit quoi ; c'est le rapporteur qui saisit. Ni la directrice générale ni le directeur général adjoint ne valident les comptes rendus des entités : ce n'est pas leur rôle, et leur confier cette validation mettrait sur leur bureau de l'ordre de six cents actes par an. Une entité est autonome dans son fonctionnement, et c'est le premier endroit où cela se voit.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Animateur | Conduit la séance ; il est aussi le maître du temps |
| Rapporteur | Programme, prend note de chaque point, rédige le compte rendu et le saisit ; il écrit, il ne décide pas |
| Intervenant | Développe un point de l'ordre du jour |
| Présents | Amendent le projet de compte rendu, l'adoptent à la séance suivante |
| Responsable d'une charge | Change l'état de sa charge et dépose une pièce |
| Assistant de direction | Programme et rédige pour la direction générale, sans décider à sa place |
| Directrice générale, directeur général adjoint | Participent ; ne valident pas les comptes rendus des entités |
| Tout agent | Lit le compte rendu d'une réunion des directions |

### Le cycle de vie

Une réunion est programmée par son rapporteur, avec un type pris dans un référentiel fermé et un ordre du jour ; elle est convoquée, ce que le système refuse tant que l'ordre du jour est vide, puis tenue. Le rapporteur rédige le projet de compte rendu, qui s'ouvre sur un rappel de la séance précédente. Tant qu'il n'est pas adopté, le compte rendu reste un projet, que tous les présents peuvent amender ; chaque amendement garde son auteur, sa date, le texte avant et après. À la séance suivante, l'adoption du compte rendu précédent est le premier point de l'ordre du jour ; l'assemblée l'adopte, avec ou sans modifications, et il est figé. Les recommandations non closes sont reportées à l'ordre du jour de la séance suivante de la même série. Une séance qui n'a pas de séance suivante laisse son compte rendu à l'état de projet, et le système le dit. Une séance peut aussi être déclarée non tenue ou annulée, avec un motif.

```
PROGRAMMEE --> CONVOQUEE --> TENUE --> PROJET DE COMPTE RENDU ----------> ADOPTE --> FIGE
    |         (ordre du jour             (amende par les presents)            ^
    |          obligatoire)    |                                              |
    |                          +-- recommandations --> report a la seance suivante
    +--> NON TENUE / ANNULEE                           (1er point : adoption du precedent,
                                                        avec ou sans modifications consignees)
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-REU-01 | Une réunion appartient à une entité ou à un dossier et porte un type pris dans un référentiel fermé. | Fonctionnement de l'Agence |
| RG-REU-02 | Une réunion a trois fonctions distinctes : animateur, rapporteur, intervenants. | Fonctionnement de l'Agence |
| RG-REU-03 | Le rapporteur rédige et saisit ; il ne décide rien. | Fonctionnement de l'Agence |
| RG-REU-04 | Le compte rendu est adopté collégialement, au premier point de l'ordre du jour de la séance suivante. | Fonctionnement de l'Agence |
| RG-REU-05 | L'assemblée peut adopter avec modifications ; elles sont consignées. | Fonctionnement de l'Agence |
| RG-REU-06 | Entre la séance et l'adoption, tous les présents peuvent amender le projet, avec trace de qui a écrit quoi. | Fonctionnement de l'Agence |
| RG-REU-07 | Ni la direction générale ni le DGA ne valident les comptes rendus des entités. | Fonctionnement de l'Agence |
| RG-REU-08 | Le type de réunion commande la numérotation, le chaînage des séries, le report des recommandations et la visibilité. | Fonctionnement de l'Agence |
| RG-REU-09 | Le compte rendu d'une réunion des directions se lit par tous les agents. | Fonctionnement de l'Agence |
| RG-REU-10 | Le compte rendu s'ouvre sur un rappel de la séance précédente et la synthèse de ses points. | Fonctionnement de l'Agence |
| RG-REU-11 | Une action décidée en séance est à la fois une recommandation suivie jusqu'à sa clôture et une tâche pour la personne. | Fonctionnement de l'Agence |
| RG-REU-12 | Tous les participants voient le compte rendu et peuvent demander des modifications ; le responsable d'une charge en change l'état et y dépose une pièce. | Fonctionnement de l'Agence |
| RG-REU-13 | Une convocation exige un ordre du jour. | Fonctionnement de l'Agence |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Réunions | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Programmation | Programmer une réunion de son entité (EX-REU-001) | Rapporteur | RG-REU-01 | Non vérifié |
| Programmation | Rattacher toute réunion à un type d'un référentiel fermé (EX-REU-002) | Rapporteur | RG-REU-01 | À corriger |
| Programmation | Chaîner les séries sur l'identifiant du type et jamais sur un libellé ; ne faire dépendre aucune règle d'un champ libre (EX-REU-003, EX-REU-004) | Système | RG-REU-08 | À corriger |
| Programmation | Demander l'ordre du jour dans le formulaire de programmation (EX-REU-005) | Rapporteur | RG-REU-13 | À corriger |
| Programmation | Refuser de convoquer une réunion dont l'ordre du jour est vide (EX-REU-006) | Système | RG-REU-13 | Partiel |
| Programmation | Indiquer à l'écran quels points le report automatique a ajoutés (EX-REU-007) | Rapporteur | RG-REU-08 | À corriger |
| Programmation | Refuser une heure de fin antérieure à l'heure de début (EX-REU-008) | Système | RG-REU-01 | Non vérifié |
| Programmation | Numéroter une réunion avec le code de l'entité qui la tient (EX-REU-009) | Système | RG-REU-08 | À corriger |
| Programmation | Déclarer une séance non tenue, avec un motif (EX-REU-010) | Rapporteur | RG-REU-01 | Non vérifié |
| Fonctions | Porter pour chaque réunion un animateur, maître du temps (EX-REU-011) | Rapporteur | RG-REU-02 | Partiel |
| Fonctions | Porter pour chaque réunion un rapporteur (EX-REU-012) | Rapporteur | RG-REU-02 | Non vérifié |
| Fonctions | Porter un ou plusieurs intervenants par point de l'ordre du jour (EX-REU-013) | Rapporteur | RG-REU-02 | Partiel |
| Fonctions | Refuser qu'un coéquipier IA occupe une fonction de réunion (EX-REU-014) | Système | RG-IA-04 | Non vérifié |
| Fonctions | Réserver la saisie du compte rendu au rapporteur (EX-REU-015) | Rapporteur | RG-REU-03 | Non vérifié |
| Fonctions | Nommer intervenant celui qui développe un point et rapporteur celui qui rédige (EX-REU-016) | Tous | RG-REU-02 | À corriger |
| Compte rendu | Reprendre en tête le rappel de la séance précédente et la synthèse de ses points (EX-REU-020) | Rapporteur | RG-REU-10 | Non vérifié |
| Compte rendu | Consigner pour chaque point ce qui a été abordé (EX-REU-021) | Rapporteur | RG-REU-03 | Non vérifié |
| Compte rendu | Tenir le compte rendu à l'état de projet jusqu'à son adoption (EX-REU-022) | Système | RG-REU-04 | Non vérifié |
| Adoption | Permettre à tout présent d'amender le projet, avec auteur, date, texte avant et après (EX-REU-023, EX-REU-024) | Présents | RG-REU-06 | À construire |
| Adoption | Inscrire l'adoption du compte rendu précédent au premier point de la séance suivante (EX-REU-025) | Système | RG-REU-04 | À construire |
| Adoption | Enregistrer l'adoption décidée par l'assemblée (EX-REU-026) | Rapporteur | RG-REU-04 | Non vérifié |
| Adoption | Enregistrer une adoption avec modifications et les porter au document figé, avec la mention qu'elles l'ont été en séance (EX-REU-027, EX-REU-028) | Rapporteur | RG-REU-05 | À construire |
| Adoption | Figer le compte rendu dès son adoption (EX-REU-029) | Système | RG-REU-04 | Non vérifié |
| Adoption | Refuser qu'une personne seule, direction générale et DGA compris, valide un compte rendu (EX-REU-030) | Système | RG-REU-07 | À corriger |
| Adoption | Indiquer qu'un compte rendu reste à l'état de projet tant qu'aucune séance suivante n'est programmée (EX-REU-031) | Système | RG-REU-04 | À construire |
| Adoption | Permettre à tout participant de demander une modification du compte rendu (EX-REU-032) | Participants | RG-REU-12 | Non vérifié |
| Visibilité | Ouvrir à tous les agents le compte rendu d'une réunion des directions, sur le type de la réunion et non sur son libellé (EX-REU-040, EX-REU-041) | Tout agent | RG-REU-09 | À corriger |
| Visibilité | Réserver une réunion confidentielle à ses convoqués et aux personnes habilitées (EX-REU-042) | Système | EX-TRA-010 | Non vérifié |
| Recommandations | Enregistrer une action décidée en séance comme recommandation, avec responsable et échéance (EX-REU-050) | Rapporteur | RG-REU-11 | Non vérifié |
| Recommandations | Créer pour le responsable une tâche dans sa liste unique (EX-REU-051) | Système | RG-REU-11 | Partiel |
| Recommandations | Synchroniser l'état de la recommandation et celui de sa tâche dans les deux sens (EX-REU-052) | Système | RG-REU-11 | Non vérifié |
| Recommandations | Relancer le responsable d'une recommandation avant son échéance (EX-REU-053) | Système | RG-REU-11 | À corriger |
| Recommandations | Reporter à la séance suivante de la même série les recommandations non closes (EX-REU-054) | Système | RG-REU-08 | Non vérifié |
| Recommandations | Laisser le responsable d'une charge en changer l'état et y déposer une pièce (EX-REU-055, EX-REU-056) | Responsable de la charge | RG-REU-12 | Non vérifié |
| Recommandations | Refuser l'annulation d'une recommandation sans motif (EX-REU-057) | Système | RG-REU-11 | Non vérifié |
| Recommandations | N'ouvrir le geste de décision d'une séance qu'à qui le serveur l'autorise (EX-REU-058) | Système | EX-ACT-008 | Partiel |

### Ce qui manque aujourd'hui

Sur quarante et une exigences, vingt-deux ont été confrontées : aucune n'est tenue, cinq le sont en partie, onze ne le sont pas, six n'existent pas. Le module a faux au point central : l'adoption collégiale n'existe pas. Aucun amendement du projet par les présents n'est décrit, la validation est individuelle, et le droit de valider les comptes rendus est un droit personnel détenu par deux personnes, ce qui reproduit exactement ce que l'Agence refuse. L'adoption à la séance suivante, l'adoption avec modifications, le cas d'une séance sans suivante : rien. Le type de réunion est un champ libre ; le chaînage des séries se fait par égalité de chaîne, si bien que trois séances sur quatre deviennent orphelines. La visibilité du compte rendu d'une réunion des directions vise un libellé qui n'existe pas, le nom réel étant celui de la réunion hebdomadaire des directions. Le code de service n'est jamais envoyé : tous les comptes rendus portent le même sigle. Le formulaire de programmation compte seize champs et aucun pour l'ordre du jour : sept clics pour programmer puis convoquer. L'écran appelle rapporteur la personne qui intervient sur un point, les deux mots de la maison étant intervertis. Rien ne relance une recommandation, et elle ne devient tâche que si elle a un dossier de rattachement. Dix-neuf exigences ne sont pas vérifiées.

## Module Décisions

Une décision qui n'est pas inscrite au registre n'a pas été prise. C'est la direction générale qui décide ; l'assistant de direction inscrit ce qu'elle a décidé, sans jamais le décider à sa place. Ce module tient le registre de ces décisions et ce qui y conduit ou en découle : l'arbitrage qu'un responsable de dossier demande, la décision à confirmer, l'exécution que le chargé déclare.

Un seul mot recouvre aujourd'hui trois objets, et c'est le premier travail du module que de les séparer. Sur trois écrans, sept objets portent le nom de décision, et des compteurs annoncent des listes qui ne les contiennent pas : « trois décisions attendent votre arbitrage » mène à un onglet vide. Le module en fait donc trois objets distincts, chacun avec sa liste, son cycle et son acteur. Les noms définitifs sont attendus du maître d'ouvrage ; ceux d'arbitrage, de décision et d'exécution sont employés ici à titre provisoire. Le module accueille aussi, comme charges à suivre, les actes d'amont du conseil d'administration : une résolution y entre pour être exécutée, elle ne s'y délibère pas.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Directrice générale | Tranche un arbitrage, confirme une décision |
| Assistant de direction | Inscrit une décision prise par la direction générale ; ne la prend pas, ne tranche pas, ne confirme pas |
| Directeur général adjoint | Consulte ; n'enregistre pas les décisions de la direction générale |
| Demandeur d'un arbitrage | Pose la question ; ne tranche jamais sa propre demande |
| Chargé d'exécution | Exécute, déclare l'exécution |
| Secrétariat de direction | Suit l'exécution ; confirme une exécution déclarée, sous réserve de la décision du maître d'ouvrage |
| Agent | Consulte les décisions qui le concernent |
| Coéquipier IA | N'inscrit, ne tranche ni ne confirme rien |

### Le cycle de vie

Trois objets, trois cycles. L'arbitrage naît quand le responsable d'un projet ou d'une activité pose sa question, avec son contexte, ses options, ses conséquences, sa recommandation et la date souhaitée ; il est tranché par la direction générale, jamais par le demandeur, ou retiré par le demandeur tant qu'il n'est pas tranché. Le trancher inscrit une décision au registre. La décision est inscrite avec un numéro de série et d'exercice, datée du jour où la direction l'a prise, son texte figé ; elle est confirmée par la direction générale, et elle ne se corrige pas : une décision de remplacement la remplace et ne prend effet qu'à sa confirmation. L'exécution naît avec le chargé et l'échéance, passe en cours, est déclarée exécutée par le chargé avec une pièce s'il y a lieu, puis confirmée par une autre personne que lui.

```
ARBITRAGE          DEMANDE ----> TRANCHE ----> (une decision est inscrite au registre)
(d'un dossier)        |
                      +----> RETIRE (par le demandeur)

DECISION           INSCRITE ----> CONFIRMEE ----> REMPLACEE (par une decision de remplacement)
(a confirmer)      (texte fige)   (par la DG)

EXECUTION          A EXECUTER --> EN COURS --> DECLAREE EXECUTEE --> CONFIRMEE
(declaree)                                      (par le charge)      (par une autre personne)
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-DEC-01 | La direction générale décide ; l'assistant inscrit ce qu'elle a décidé. | Fonctionnement de l'Agence |
| RG-DEC-02 | Le DGA n'enregistre pas les décisions de la direction générale. | Fonctionnement de l'Agence |
| RG-DEC-03 | Un arbitrage est tranché par la direction générale, jamais par son demandeur. | Fonctionnement de l'Agence |
| RG-DEC-04 | Une décision inscrite est numérotée dans sa série et son exercice, et son texte est figé. | Fonctionnement de l'Agence |
| RG-DEC-05 | Une décision ne se modifie pas : elle se remplace par une décision de remplacement. | Métier |
| RG-DEC-06 | Une décision a un chargé d'exécution et une échéance, sauf décision déclarée sans exécution. | Fonctionnement de l'Agence |
| RG-DEC-07 | Une exécution déclarée par le chargé est confirmée par une autre personne. | Métier |
| RG-DEC-08 | La confidentialité d'une décision est celle du dossier qu'elle concerne. | Qualité |
| RG-DEC-09 | Un coéquipier IA n'inscrit, ne tranche ni ne confirme rien. | Fonctionnement de l'Agence |
| RG-DEC-10 | Un compteur renvoie à la liste qu'il compte. | Qualité |
| RG-DEC-11 | Une résolution du conseil d'administration entre comme charge à suivre ; elle ne se délibère pas dans le système. | Loi |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Décisions | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Trois objets | Distinguer arbitrage, décision à confirmer et exécution déclarée comme trois objets, chacun avec sa liste et son cycle (EX-DEC-001) | Tous | RG-DEC-10 | À corriger |
| Trois objets | Donner à chacun un nom propre, employé seul dans toute l'interface ; noms attendus du maître d'ouvrage (EX-DEC-002) | Tous | EX-TRA-062 | À corriger |
| Trois objets | Renvoyer chaque compteur vers la liste qu'il compte (EX-DEC-003) | Direction générale | RG-DEC-10 | À corriger |
| Trois objets | Ne pas proposer de geste de décision quand la liste correspondante est vide (EX-DEC-004) | Direction générale | RG-DEC-10 | Non vérifié |
| Arbitrage | Demander un arbitrage avec question, contexte, options, conséquences, recommandation et date souhaitée (EX-DEC-010) | Responsable de dossier | RG-DEC-03 | Non vérifié |
| Arbitrage | N'avertir d'une demande que les personnes qui peuvent ouvrir le dossier (EX-DEC-011) | Système | RG-DEC-08 | À corriger |
| Arbitrage | Remonter à la direction générale, et en informer le demandeur, une demande dont personne ne peut décider (EX-DEC-012) | Système | RG-DEC-03 | À corriger |
| Arbitrage | Réserver la décision d'un arbitrage à la direction générale (EX-DEC-013) | Direction générale | RG-DEC-03 | Non vérifié |
| Arbitrage | Refuser que le demandeur tranche sa propre demande (EX-DEC-014) | Système | RG-DEC-03 | Existant |
| Arbitrage | Inscrire au registre la décision qui tranche un arbitrage, si l'auteur de l'inscription peut le trancher (EX-DEC-015, EX-DEC-019) | Direction générale | RG-DEC-01 | Non vérifié |
| Arbitrage | Informer le demandeur de la décision, lever la décision attendue du dossier, permettre le retrait de la demande (EX-DEC-016, EX-DEC-017, EX-DEC-018) | Système, demandeur | RG-DEC-03 | Non vérifié |
| Décision | Permettre à l'assistant d'inscrire une décision prise par la direction générale (EX-DEC-020) | Assistant de direction | RG-DEC-01 | Non vérifié |
| Décision | Réserver la confirmation à la direction générale ; refuser l'inscription au DGA et à un coéquipier IA (EX-DEC-021, EX-DEC-022, EX-DEC-023) | Système | RG-DEC-02, RG-DEC-09 | Non vérifié |
| Décision | Numéroter toute décision DEC/exercice/rang et la dater du jour où la direction l'a prise (EX-DEC-024, EX-DEC-025) | Système | RG-DEC-04 | Non vérifié |
| Décision | Figer le texte dès l'inscription et corriger par une décision de remplacement qui ne prend effet qu'à sa confirmation (EX-DEC-026, EX-DEC-027) | Système | RG-DEC-05 | Non vérifié |
| Décision | Distinguer dans le registre une décision non encore confirmée (EX-DEC-028) | Tous | RG-DEC-04 | Non vérifié |
| Décision | Exiger un chargé d'exécution et une échéance, sauf décision déclarée sans exécution (EX-DEC-029) | Système | RG-DEC-06 | Non vérifié |
| Décision | Donner à une décision la confidentialité du dossier qu'elle concerne (EX-DEC-030) | Système | RG-DEC-08 | Non vérifié |
| Décision | Relancer le chargé avant l'échéance (EX-DEC-031) | Système | RG-DEC-06 | Non vérifié |
| Décision | Placer une décision à exécuter dans la liste unique de son chargé (EX-DEC-032) | Système | RG-TAC-04 | À corriger |
| Exécution | Déclarer l'exécution d'une décision, avec une pièce s'il y a lieu (EX-DEC-040) | Chargé d'exécution | RG-DEC-07 | Non vérifié |
| Exécution | Réserver la confirmation à une personne autre que le déclarant et refuser l'état exécuté sans confirmation (EX-DEC-041, EX-DEC-042) | Système | RG-DEC-07 | Non vérifié |
| Exécution | Compter les retards d'exécution au tableau de bord de la direction générale (EX-DEC-043) | Direction générale | RG-DEC-06 | Non vérifié |
| Actes d'amont | Enregistrer une résolution du conseil d'administration comme charge à suivre (EX-DEC-050) | Direction générale | RG-DEC-11 | À construire |
| Actes d'amont | Retenir un budget arrêté par le conseil comme cadre d'exécution consultable (EX-DEC-051) | Direction générale | RG-DEC-11 | À construire |

### Ce qui manque aujourd'hui

Sur trente-trois exigences, neuf ont été confrontées : une est tenue, six ne le sont pas, deux n'existent pas. Le refus qu'un demandeur tranche sa propre demande est la seule chose qui tienne. Pour le reste, le module n'existe pas sous la forme que l'Agence lui donne : sept objets sous un même mot, trois arbitrages, deux décisions à confirmer, deux exécutions déclarées, et les compteurs mentent. « Tout voir » mène à un registre de soixante-deux lignes où aucun des trois arbitrages ne figure ; « aucun en attente » mène à un onglet vide pendant que l'écran annonce trois décisions en attente. Une demande d'arbitrage nomme le dossier à des personnes qui ne peuvent pas l'ouvrir. Un demandeur qui est le seul décideur possible se refuse lui-même, et personne n'est prévenu. Une décision à exécuter n'entre pas dans la liste de son chargé. Les noms des trois objets ne sont pas arrêtés. Rien n'existe pour les actes d'amont du conseil : une résolution n'entre pas, un budget arrêté ne sert pas de cadre. Enfin l'écrit fait foi, et vingt-quatre exigences, dont la numérotation, la datation, le figement du texte et la décision de remplacement, n'ont pas été relues au code. Le module est donc, de tous, celui dont l'état réel est le moins connu au regard de son importance.

## Module Plans de travail

Une entité sait ce qu'elle a à faire parce que sa fiche d'attributions le dit ; son plan de travail dit ce qu'elle s'engage à faire cette année, et pour quand. Le plan s'accroche à l'exercice annuel et à la cadence trimestrielle de l'Agence, comme les états financiers et les revues. Il dit quoi et pour quand : il ne se fait pas lui-même, ce sont les dossiers — projets et activités — qui le réalisent, et dont l'avancement remonte.

Le plan est préparé par l'entité et approuvé au-dessus d'elle. Celui qui le soumet ne peut pas l'approuver, et c'est juste ; mais l'outil doit alors dire qui le peut, au lieu de laisser la personne devant un écran sans issue. Chaque trimestre, une revue confronte le constaté à l'attendu, explique les écarts, puis se fige. Un plan approuvé est figé : il ne change que par une révision qui suit le même circuit.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Chef d'entité | Prépare le plan de son entité et des entités qui lui sont rattachées, le soumet |
| Approbateur | Approuve le plan, au-dessus de l'entité ; n'est jamais celui qui l'a soumis |
| Directrice générale | Lit tous les plans, approuve ceux qui lui reviennent |
| Directeur général adjoint | Approuve ; lit tous les plans |
| Agent | Lit le plan de son entité et ses activités |
| Porteur d'un dossier | Rattache son projet ou son activité à une activité du plan |

### Le cycle de vie

Le plan est préparé par l'entité, à partir de ses attributions, pour un exercice. Soumis, il attend un approbateur désigné, qui l'approuve ou le renvoie avec un motif obligatoire ; renvoyé, il retourne en préparation. Approuvé, il est figé. S'il faut le changer en cours d'année, il passe en révision, avec un motif, et suit de nouveau le circuit de soumission et d'approbation. Chaque trimestre, la revue confronte le constaté à l'attendu pour chaque activité du plan ; chaque écart est expliqué, puis la revue est figée.

```
PREPARATION --> SOUMIS --> APPROUVE --> EN REVISION --> SOUMIS --> APPROUVE
  (entite)        |        (fige)        (motif)
                  +-- renvoye avec motif --> PREPARATION

REVUE TRIMESTRIELLE : constate / attendu --> ecarts expliques --> revue figee
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-PLA-01 | Un plan porte sur un exercice et sur une entité. | Fonctionnement de l'Agence |
| RG-PLA-02 | Le plan découle des attributions de l'entité. | Fonctionnement de l'Agence |
| RG-PLA-03 | Celui qui soumet un plan ne l'approuve pas. | Fonctionnement de l'Agence |
| RG-PLA-04 | Le système dit à celui qui soumet qui peut approuver. | Fonctionnement de l'Agence |
| RG-PLA-05 | Un chef prépare le plan de son entité et des entités rattachées, et d'aucune autre. | Fonctionnement de l'Agence |
| RG-PLA-06 | Un plan approuvé est figé ; il ne change que par révision. | Métier |
| RG-PLA-07 | L'avancement d'une activité du plan vient des dossiers qui la réalisent. | Fonctionnement de l'Agence |
| RG-PLA-08 | Les budgets d'un plan se masquent hors de la direction, des chefs de l'entité et des membres. | Qualité |
| RG-PLA-09 | La revue trimestrielle confronte le constaté à l'attendu ; chaque écart est expliqué. | Fonctionnement de l'Agence |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Plans de travail | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Préparation | Préparer le plan annuel de son entité (EX-PLA-001) | Chef d'entité | RG-PLA-01 | Non vérifié |
| Préparation | Refuser à un chef de préparer le plan d'une entité hors de son périmètre (EX-PLA-002) | Système | RG-PLA-05 | Non vérifié |
| Préparation | Rattacher chaque plan à un exercice (EX-PLA-003) | Système | RG-PLA-01 | Non vérifié |
| Préparation | Rattacher chaque activité du plan à une attribution de l'entité (EX-PLA-004) | Chef d'entité | RG-PLA-02 | À construire |
| Préparation | Refuser une activité dont les dates sortent de l'exercice, ou dont le responsable est hors du périmètre (EX-PLA-005, EX-PLA-006) | Système | RG-PLA-01, RG-PLA-05 | Non vérifié |
| Approbation | Soumettre un plan à approbation (EX-PLA-010) | Chef d'entité | RG-PLA-03 | Non vérifié |
| Approbation | Refuser l'approbation par la personne qui a soumis (EX-PLA-011) | Système | RG-PLA-03 | Non vérifié |
| Approbation | Indiquer à celui qui soumet qui peut approuver le plan (EX-PLA-012) | Chef d'entité | RG-PLA-04 | À corriger |
| Approbation | Avertir l'approbateur et lui présenter la liste des plans qui attendent (EX-PLA-013, EX-PLA-014) | Approbateur | RG-PLA-03 | Partiel |
| Approbation | Renvoyer un plan à son entité avec un motif obligatoire (EX-PLA-015) | Approbateur | RG-PLA-03 | Non vérifié |
| Approbation | Figer un plan approuvé et le réviser par un circuit identique avec un motif (EX-PLA-016, EX-PLA-017) | Système | RG-PLA-06 | Non vérifié |
| Approbation | Journaliser la soumission, l'approbation, le renvoi et la révision (EX-PLA-018) | Système | EX-TRA-007 | Non vérifié |
| Avancement | Calculer l'avancement d'une activité du plan à partir des dossiers qui la réalisent, et refuser la saisie manuelle quand elle a des dossiers (EX-PLA-020, EX-PLA-021) | Système | RG-PLA-07 | Non vérifié |
| Avancement | Pondérer les activités pour calculer l'avancement du plan (EX-PLA-022) | Système | RG-PLA-07 | Non vérifié |
| Revue | Présenter chaque trimestre le constaté face à l'attendu (EX-PLA-023) | Chef d'entité, direction | RG-PLA-09 | Non vérifié |
| Revue | Exiger une explication pour tout écart et figer la revue arrêtée (EX-PLA-024, EX-PLA-025) | Chef d'entité | RG-PLA-09 | Non vérifié |
| Revue | Signaler à la direction générale les activités du plan en retard (EX-PLA-026) | Direction générale | RG-PLA-09 | Non vérifié |
| Visibilité | Masquer les budgets d'un plan hors de la direction, des chefs de l'entité et des membres (EX-PLA-030) | Système | RG-PLA-08 | Non vérifié |
| Visibilité | Permettre à la direction générale de consulter tous les plans (EX-PLA-031) | Direction générale | RG-PLA-01 | Non vérifié |
| Visibilité | Ne proposer dans les formulaires que les entités que le serveur acceptera (EX-PLA-032) | Chef d'entité | EX-TRA-013 | Non vérifié |

### Ce qui manque aujourd'hui

C'est, avec les attributions, le module le moins instruit : trois exigences sur vingt-cinq ont été confrontées à l'existant, et le dossier des cent deux défauts ne contient aucun point qui lui soit propre. On ne peut donc pas dire qu'il est sain ; on peut dire qu'on ne l'a pas regardé. Ce qui est établi est mince et franc. Le cadre organique est inconnu de l'outil et les attributions y sont du texte libre : un plan ne peut donc pas découler de ses attributions, ce qui est pourtant sa raison d'être. L'outil n'indique pas qui peut approuver un plan, si bien que celui qui soumet se trouve devant un écran sans issue. Et dans le rail de navigation, l'entrée Plans n'apparaît que si le module contient déjà quelque chose : un approbateur dont rien n'attend ne découvre jamais où le chercher. Pour les vingt-deux autres exigences, y compris le figement du plan approuvé, la révision et la revue trimestrielle, l'état est à établir avant l'ouverture de tout lot.

## Module Attributions

Aucune entité de l'Agence ne se définit elle-même. Une direction, une division, une cellule sait ce qui lui incombe parce qu'une fiche d'attributions le dit, et cette fiche ne s'écrit pas librement : elle se rédige selon le cadre organique, le texte qui crée les entités et leur donne leurs charges. L'entité rédige les siennes, dans les limites de ce cadre. Ces attributions fondent ensuite son plan de travail.

Le module tient ces fiches. Deux décisions sont attendues du maître d'ouvrage : qui arrête une fiche, et si le cadre organique se consulte dans l'outil ou reste une référence extérieure. Tant qu'elles ne sont pas prises, le cycle de vie décrit ci-dessous est sous réserve, et personne n'arrête les fiches.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Chef d'entité | Rédige la fiche de son entité et des entités rattachées, pas au-delà |
| Autorité qui arrête la fiche | À préciser : décision attendue du maître d'ouvrage |
| Agent | Lit la fiche de son entité |
| Direction générale | Lit toutes les fiches |
| Responsable informatique | Administre la structure ; ne rédige pas les attributions |

### Le cycle de vie

La fiche est un brouillon que l'entité rédige en s'appuyant sur les références du cadre organique. Elle est soumise, puis arrêtée par l'autorité que le maître d'ouvrage désignera ; une fois arrêtée, elle ne se modifie plus sans trace, avec le texte avant et après, et l'historique des versions arrêtées est conservé. Elle repasse en révision à la demande de l'entité, suit de nouveau la soumission, puis est de nouveau arrêtée.

```
BROUILLON --> SOUMISE --> ARRETEE --> EN REVISION --> SOUMISE --> ARRETEE
 (l'entite)               (autorite a preciser)
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-ATT-01 | Une entité a une fiche d'attributions. | Fonctionnement de l'Agence |
| RG-ATT-02 | La fiche se rédige selon les conditions du cadre organique. | Fonctionnement de l'Agence |
| RG-ATT-03 | Une entité rédige ses attributions, dans les limites du cadre organique. | Fonctionnement de l'Agence |
| RG-ATT-04 | Un chef d'entité rédige pour son entité et les entités rattachées, pas au-delà. | Fonctionnement de l'Agence |
| RG-ATT-05 | Les attributions d'une entité fondent son plan de travail. | Fonctionnement de l'Agence |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Attributions | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Rédaction | Rédiger la fiche d'attributions de son entité (EX-ATT-001) | Chef d'entité | RG-ATT-03 | Non vérifié |
| Rédaction | Refuser à un chef de rédiger ou de supprimer la fiche d'une entité hors de son périmètre (EX-ATT-002) | Système | RG-ATT-04 | Non vérifié |
| Rédaction | Ne proposer Créer la fiche que pour les entités où la personne peut la rédiger (EX-ATT-003) | Chef d'entité | RG-ATT-04 | À corriger |
| Rédaction | Rattacher chaque attribution à une référence du cadre organique (EX-ATT-004) | Chef d'entité | RG-ATT-02 | À construire |
| Arrêt | Distinguer le brouillon de la fiche arrêtée (EX-ATT-005) | Système | RG-ATT-01 | Non vérifié |
| Arrêt | Réserver l'arrêt de la fiche à la personne ou à l'instance désignée par le maître d'ouvrage (EX-ATT-006) | Autorité à désigner | RG-ATT-01 | À construire |
| Arrêt | Journaliser toute modification d'une fiche arrêtée, texte avant et après (EX-ATT-007) | Système | EX-TRA-007 | Non vérifié |
| Arrêt | Conserver l'historique des versions arrêtées (EX-ATT-008) | Système | RG-ATT-01 | Non vérifié |
| Suivi | Lister les entités qui n'ont pas de fiche (EX-ATT-009) | Direction générale | RG-ATT-01 | Non vérifié |
| Consultation | Présenter à tout agent la fiche de son entité (EX-ATT-010) | Agent | RG-ATT-01 | Non vérifié |
| Consultation | Ouvrir à un droit de consultation une porte dans la navigation (EX-ATT-011) | Tout détenteur du droit | EX-ACT-009 | À corriger |

### Ce qui manque aujourd'hui

Onze exigences, dont quatre confrontées : deux ne sont pas tenues, deux n'existent pas. Le module est tenu pour l'essentiel par défaut. L'outil ignore le cadre organique : les attributions s'y écrivent en texte libre, sans référence, ce qui est exactement ce que l'Agence interdit. Personne n'arrête les fiches ; la question de qui le fait est posée et sans réponse, et elle bloque le cycle de vie du module. Un chef de cellule se voit proposer de créer la fiche des treize entités, alors qu'il n'en peut rédiger qu'une partie : l'interface lit le droit, jamais l'étendue. Enfin le droit de consulter les attributions n'a aucun chemin dans la navigation : celui qui le détient ne peut pas atteindre le module. Sept exigences ne sont pas vérifiées. L'échéance de ce module dépend de la décision sur l'autorité qui arrête la fiche.

## Module Portefeuille

La direction générale pilote des dossiers, et le portefeuille est la vue d'ensemble de ces dossiers : ce n'est pas un objet qu'on crée, c'est ce que l'on voit. Il en existe deux sortes. Le projet produit un résultat, avec une équipe, des tâches, des livrables, des contrats, des réunions, des risques ; il a une fin. L'activité est un dossier d'événement ou de représentation — commission, conférence, rendez-vous, activité interne — avec un mandat et des suites à donner. Une mission permanente n'est pas un projet. Chacun est rattaché à une entité, porté par une personne, et réalise une activité du plan de travail.

Le module porte aussi la revue de portefeuille. Un dossier a deux santés : celle que son responsable déclare, celle que le système calcule à partir du calendrier, des livrables, du budget, des tâches et des arbitrages. L'écart entre les deux est la matière de la revue. Quand un responsable ne peut pas avancer sans une décision de la direction générale, il demande un arbitrage depuis la fiche du dossier. Enfin le module tient la frontière de la confidentialité : un projet naît ouvert à l'équipe choisie et à personne si aucune n'est choisie, et un projet privé reste lisible de la hiérarchie de l'entité porteuse, avec trace.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Directrice générale, directeur général adjoint | Lisent tous les dossiers non privés, revoient le portefeuille ; la direction générale tranche les arbitrages |
| Chef d'entité | Porte les dossiers de son entité ; lit ceux de son arbre, même privés, avec trace |
| Responsable d'un dossier | Conduit le dossier, déclare sa santé, demande un arbitrage |
| Membre de l'équipe | Travaille dans le dossier selon son rôle : lecteur ou éditeur |
| Invité, consultant | Accède à ce qu'on lui ouvre, rien d'autre |

### Le cycle de vie

Le portefeuille n'a pas de cycle de vie : c'est une vue. Les dossiers en ont un. Un projet est créé, passe en cours, puis est clos ; pendant qu'il est en cours, son responsable peut demander un arbitrage, qui sort du dossier pour devenir une décision de la direction générale. Une activité est créée, passe en cours, est tenue, puis est close ; ses suites à donner continuent d'être suivies après coup, avec un responsable et une échéance. À tout moment, la santé calculée se compare à la santé déclarée.

```
PROJET :    CREE --> EN COURS --> CLOS
                        |
                        +-- arbitrage demande --> decision de la DG (voir Decisions)

ACTIVITE :  CREEE --> EN COURS --> TENUE --> CLOSE   (suites a donner suivies apres coup)

SANTE :     declaree (par le responsable)   <-- ecart a la revue -->   calculee (par le systeme)
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-POR-01 | Le portefeuille est une vue : il n'a pas de cycle de vie propre. | Fonctionnement de l'Agence |
| RG-POR-02 | Tout dossier est rattaché à une entité et porté par une personne. | Fonctionnement de l'Agence |
| RG-POR-03 | Un projet a une fin ; une mission permanente n'est pas un projet. | Métier |
| RG-POR-04 | Un projet naît ouvert à l'équipe choisie, et à personne si aucune n'est choisie. | Fonctionnement de l'Agence |
| RG-POR-05 | Le droit d'écrire un document de dossier suit le rôle tenu sur le projet : un lecteur lit, un éditeur dépose, un invité sans rôle n'accède pas. | Fonctionnement de l'Agence |
| RG-POR-06 | La santé calculée se présente à côté de la santé déclarée ; l'écart se signale. | Fonctionnement de l'Agence |
| RG-POR-07 | Une raison budgétaire ne sort que pour qui voit le budget. | Qualité |
| RG-POR-08 | Un projet privé reste lisible de la hiérarchie de l'entité porteuse ; cette lecture entre au journal du projet. | Fonctionnement de l'Agence |
| RG-POR-09 | Un chef d'entité se limite à son entité et aux endroits où il a été invité. | Fonctionnement de l'Agence |
| RG-POR-10 | Tout changement de confidentialité, de responsable ou de santé d'un dossier est journalisé. | Qualité |
| RG-POR-11 | L'avancement d'un dossier remonte à l'activité du plan qu'il réalise. | Fonctionnement de l'Agence |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Portefeuille | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Création | Créer un projet dont le seul membre est son créateur quand aucune équipe n'est choisie, ou qui compte l'équipe choisie et personne d'autre (EX-POR-001, EX-POR-002) | Responsable de dossier | RG-POR-04 | À corriger |
| Création | N'imposer aucune équipe par défaut à la création (EX-POR-003) | Responsable de dossier | RG-POR-04 | À corriger |
| Création | Présenter le même formulaire de création depuis l'accueil et depuis Mon entité (EX-POR-004) | Responsable de dossier | EX-TRA-070 | Partiel |
| Création | Rattacher tout dossier à une entité et à un responsable (EX-POR-005) | Système | RG-POR-02 | Non vérifié |
| Accès | Refuser le dépôt d'un document à toute personne sans rôle d'écriture dans le dossier (EX-POR-006) | Système | RG-POR-05 | À corriger |
| Accès | Ouvrir le dépôt à l'éditeur, la lecture au lecteur, rien à l'invité sans rôle (EX-POR-007) | Système | RG-POR-05 | À corriger |
| Accès | Ne révéler le nom d'un dossier inaccessible dans aucun message d'erreur (EX-POR-008) | Système | EX-TRA-010 | Non vérifié |
| Accès | Journaliser la consultation d'un projet privé par la hiérarchie (EX-POR-009) | Système | RG-POR-08 | Non vérifié |
| Accès | Limiter un chef d'entité à son entité, aux entités rattachées et aux espaces où il est invité (EX-POR-010) | Système | RG-POR-09 | Non vérifié |
| Accès | Permettre à la direction générale de lire tous les dossiers non privés (EX-POR-025) | Direction générale | RG-POR-01 | Non vérifié |
| Santé | Calculer la santé d'un dossier à partir du calendrier, des livrables, du budget, des tâches et de l'arbitrage (EX-POR-020) | Système | RG-POR-06 | Non vérifié |
| Santé | Présenter la santé calculée à côté de la santé déclarée (EX-POR-021) | Direction générale | RG-POR-06 | Non vérifié |
| Santé | Placer en tête de revue les projets dont les deux santés divergent (EX-POR-022) | Direction générale | RG-POR-06 | Non vérifié |
| Santé | Appliquer la même règle de retard au portefeuille, au tableau de bord et à l'accueil (EX-POR-026) | Système | EX-TRA-062 | Non vérifié |
| Budget | Appliquer un masque unique du budget à toute route qui renvoie des raisons (EX-POR-023) | Système | RG-POR-07 | À corriger |
| Budget | Ne renvoyer ni montant ni raison budgétaire à qui ne voit pas le budget (EX-POR-024) | Système | RG-POR-07 | À corriger |
| Arbitrage | Demander l'arbitrage de la direction générale depuis la fiche d'un dossier (EX-POR-030) | Responsable de dossier | RG-DEC-03 | Non vérifié |
| Activités | Journaliser toute modification d'une activité, avec les valeurs avant et après (EX-POR-040) | Système | RG-POR-10 | À corriger |
| Activités | Prévenir le nouveau responsable d'une activité (EX-POR-041) | Système | RG-POR-10 | À corriger |
| Activités | Journaliser l'ajout et la modification d'une suite à donner (EX-POR-042) | Système | RG-POR-10 | À corriger |
| Activités | Tenir pour chaque activité ses suites à donner, avec responsable et échéance (EX-POR-043) | Responsable d'activité | RG-POR-02 | Non vérifié |
| Avancement | Remonter l'avancement d'un dossier à l'activité du plan qu'il réalise (EX-POR-050) | Système | RG-POR-11 | Non vérifié |
| Avancement | Réserver le rattachement à une activité du plan aux gestionnaires du dossier (EX-POR-051) | Gestionnaire du dossier | RG-POR-11 | Non vérifié |

### Ce qui manque aujourd'hui

Sur vingt-quatre exigences, onze ont été confrontées : une est tenue en partie, dix ne le sont pas, aucune n'est tenue. Ce que le module montre, il ne le tient pas. Un projet créé depuis l'accueil naît avec trois éditeurs que personne n'a choisis, dont la directrice générale, et la liste d'équipe n'offre qu'une entrée imposée. Un compte en lecture seule a déposé un document dans un dossier de projet, et le serveur a répondu que tout allait bien : aucune règle d'écriture n'existe sur les documents de dossier. Les raisons budgétaires sortent par la route de santé des projets sans passer par le masque : « budget consommé à 125 % » est lisible par tout lecteur du projet. La modification d'une activité n'est jamais journalisée ; une activité confidentielle peut être ouverte puis refermée sans trace, et le nouveau responsable n'est pas prévenu. Treize exigences ne sont pas vérifiées, dont le calcul de la santé, qui est pourtant l'objet de la revue.

## Module Tâches

Le matin, une personne ouvre l'outil et se demande ce qu'on attend d'elle. Dans l'Agence, ce qu'on lui demande lui vient de partout : une tâche d'un projet, une action décidée à la réunion des directions, un courrier reçu pour traitement, une décision à exécuter, un livrable à produire ou à valider. Si chaque module tient son propre suivi, personne ne saura où regarder. Le module Tâches est donc deux choses : l'unité de travail qu'est la tâche, confiée à une personne avec une échéance, et la liste unique de ce qu'on lui demande, quelle que soit l'origine.

Une tâche vit dans un projet ou dans le registre de son entité, qui tient le travail courant hors projet. Une tâche ne se valide pas : elle se termine. Une charge qui n'est pas une tâche garde le cycle de son module d'origine, son responsable en change l'état et y dépose une pièce, et la liste n'en est qu'une vue. Le module doit aussi servir ceux qui ont peu de droits : un stagiaire qui arrive doit comprendre dès son premier écran ce qu'on attend de lui et à qui demander ; un consultant voit ses tâches et ses livrables attendus.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Chargé d'une tâche | La fait, en change l'état, y dépose une pièce, demande un report |
| Chef d'entité | Confie une tâche à un agent de son entité, confirme ou renvoie la clôture |
| Responsable d'une tâche confiée | Celui qui l'a confiée : lui seul retire ou change le chargé |
| Stagiaire | Comprend dès son premier écran ce qu'on attend de lui et à qui demander |
| Consultant | Voit ses tâches et ses livrables attendus |

### Le cycle de vie

Une tâche passe de à faire à en cours, puis à terminée. Quand elle a été confiée par un chef, le chargé demande la clôture, que le responsable confirme ou renvoie : la tâche retourne alors en cours. Le chargé peut aussi demander le report de l'échéance. Une charge d'une autre origine suit le cycle de son module : la recommandation de réunion se clôt dans la réunion, le courrier dans le courrier ; la liste de la personne les rassemble et les relance avant l'échéance, puis les signale en retard.

```
A FAIRE --> EN COURS --> TERMINEE
               |
               +-- tache confiee : cloture demandee --> confirmee par le responsable
                                                    +--> renvoyee --> EN COURS

LISTE UNIQUE (vue) :  taches + recommandations + courriers pour traitement + decisions + livrables
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-TAC-01 | Une tâche est confiée à une seule personne. | Fonctionnement de l'Agence |
| RG-TAC-02 | Une tâche vit dans un projet ou dans le registre d'une entité. | Fonctionnement de l'Agence |
| RG-TAC-03 | Une personne a une seule liste de charges, quelle que soit l'origine. | Fonctionnement de l'Agence |
| RG-TAC-04 | Un courrier reçu pour traitement, une recommandation de réunion et une décision à exécuter créent une charge. | Fonctionnement de l'Agence |
| RG-TAC-05 | Une charge qui n'est pas une tâche garde son objet d'origine pour domicile ; la liste n'en est qu'une vue. | Fonctionnement de l'Agence |
| RG-TAC-06 | Seul le responsable d'une tâche confiée la retire ou en change le chargé. | Fonctionnement de l'Agence |
| RG-TAC-07 | Un chef confie une tâche à un agent de son entité et des entités rattachées. | Fonctionnement de l'Agence |
| RG-TAC-08 | Le même composant de ligne, de tiroir et de formulaire sert tout écran et toute origine. | Qualité |
| RG-TAC-09 | Une charge est relancée avant son échéance et signalée en retard. | Fonctionnement de l'Agence |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Tâches | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Liste unique | Placer dans la liste d'une personne les tâches de projet et de registre d'entité qui lui sont confiées (EX-TAC-001) | Chargé | RG-TAC-03 | Existant |
| Liste unique | Y placer les actions décidées en réunion dont elle est responsable (EX-TAC-002) | Chargé | RG-TAC-04 | Partiel |
| Liste unique | Y placer les courriers qu'elle reçoit pour traitement (EX-TAC-003) | Chargé | RG-TAC-04 | À construire |
| Liste unique | Y placer les décisions dont elle est chargée (EX-TAC-004) | Chargé | RG-TAC-04 | À construire |
| Liste unique | Y placer les livrables qu'elle doit produire ou valider (EX-TAC-005) | Chargé | RG-TAC-03 | Existant |
| Liste unique | Ne montrer qu'une fois une charge qui parvient par deux voies, et filtrer par origine (EX-TAC-006, EX-TAC-007) | Chargé | RG-TAC-05 | Non vérifié |
| Gestes | Déplacer une tâche directement en vue calendrier (EX-TAC-010) | Chargé | RG-TAC-08 | À corriger |
| Gestes | Déplacer une tâche directement en vue tableau, et grouper celui-ci par état et non par section de projet (EX-TAC-011, EX-TAC-014) | Chargé | RG-TAC-08 | À corriger |
| Gestes | Changer l'échéance et la priorité depuis le menu contextuel (EX-TAC-012) | Chargé | RG-TAC-08 | À corriger |
| Gestes | Trier la liste des tâches (EX-TAC-013) | Chargé | RG-TAC-08 | À corriger |
| Gestes | Replanifier sept tâches ouvertes en moins de dix clics (EX-TAC-015) | Chargé | RG-TAC-08 | À corriger |
| Gestes | Employer la même ligne, le même tiroir et le même formulaire de tâche dans tout contexte (EX-TAC-016) | Tous | RG-TAC-08 | À corriger |
| Confier | Confier une tâche à un agent du périmètre du chef et refuser hors périmètre (EX-TAC-020, EX-TAC-021) | Chef d'entité | RG-TAC-07 | Non vérifié |
| Confier | Ne proposer dans toute liste de personnes que celles que le serveur acceptera, avec leur fonction (EX-TAC-022) | Chef d'entité | EX-TRA-013 | À corriger |
| Confier | Réserver au responsable d'une tâche confiée le retrait ou le changement de son chargé (EX-TAC-023) | Responsable | RG-TAC-06 | Non vérifié |
| Confier | Demander le report d'une échéance, confirmer ou renvoyer la clôture (EX-TAC-024, EX-TAC-025) | Chargé, responsable | RG-TAC-06 | Non vérifié |
| Confier | Laisser le responsable d'une charge en changer l'état et y déposer une pièce (EX-TAC-026, EX-TAC-027) | Responsable de la charge | RG-TAC-05 | Non vérifié |
| Rappels | Relancer le chargé avant l'échéance (EX-TAC-030) | Système | RG-TAC-09 | Partiel |
| Rappels | Signaler une tâche en retard à son chargé (EX-TAC-031) | Système | RG-TAC-09 | Non vérifié |
| Arrivants | Indiquer sur chaque charge à qui s'adresser (EX-TAC-032) | Stagiaire, chargé | RG-ORG-04 | Non vérifié |

### Ce qui manque aujourd'hui

Sur vingt-cinq exigences, quatorze ont été confrontées : deux sont tenues, deux le sont en partie, huit ne le sont pas, deux n'existent pas. La liste unique est la promesse du module, et elle n'est tenue qu'à moitié : les tâches et les livrables y figurent, mais aucun courrier reçu pour traitement ni aucune décision à exécuter n'y entre, et une recommandation de réunion ne devient tâche que lorsqu'elle a un dossier de rattachement. Une personne a donc encore plusieurs endroits où regarder. Ensuite le geste courant est trop long : zéro élément déplaçable en vue calendrier comme en vue tableau, un menu contextuel de cinq entrées sans échéance ni priorité, un seul filtre et aucun tri ; les sept tâches ouvertes d'un lundi matin coûtent vingt-huit clics à replanifier, alors que l'Agence en attend moins de dix. La vue tableau empile les sections de trois projets en six colonnes de sens différents. La ligne, le tiroir et le formulaire de tâche ne se comportent pas pareil selon l'écran. Enfin le sélecteur de personne propose dix-sept noms pour une cellule de deux, et imputer accepte un agent d'ailleurs. Onze exigences ne sont pas vérifiées.

## Module Livrables

L'Agence rémunère des consultants sur ce qu'ils produisent. Un livrable est un produit attendu — rapport d'étude, cahier des charges, plan, carte, procès-verbal —, remis par son auteur et validé par une autre personne que lui. Il n'est jamais isolé : il provient d'un travail, d'une activité, d'un projet ou d'une mission, et selon son type il obéit à des règles différentes. La liste de ces types est attendue des directions.

Un livrable porte de l'argent. Sa validation engage une tranche de paiement à un consultant : quarante pour cent d'un contrat, dans la démonstration. Valider un document qu'on n'a pas vu, puis engager la tranche, n'est pas une gêne d'ergonomie, c'est un risque financier ; le système est, de fait, dans la chaîne de la dépense. C'est pourquoi un livrable ne se remet pas sans sa pièce, ne se valide pas sans sa pièce, et ne se valide jamais par son auteur. Le module porte aussi le contrat de mission du consultant — termes de référence, échéancier, montant — et ce que le consultant voit : ce qu'il doit produire, pour quand, et comment le remettre. Ce contrat engage l'Agence ; il est signé par la direction générale.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Consultant | Produit, remet ; lit son contrat, le plan du projet, ses livrables attendus et remis |
| Valideur | Valide ou rejette ; n'est jamais l'auteur |
| Chef d'entité, responsable du projet | Supervise ; voit les engagements de son périmètre |
| Membre du projet | Voit les livrables ; les engagements seulement avec le droit correspondant |
| Direction générale | Voit tout ; signe le contrat de mission, comme tout acte qui engage l'Agence |

### Le cycle de vie

Un livrable est attendu, avec son type et son rattachement. Le consultant le remet avec sa pièce, accompagnée d'un mot au valideur ; le livrable est alors remis et reste visible chez son auteur avec son nouvel état. Le valideur le valide ou le rejette : le rejet porte un commentaire obligatoire, le consultant corrige et remet de nouveau, car un livrable se corrige tant qu'il n'est pas validé. La validation engage la tranche de paiement liée au livrable, une seule fois, puis le paiement constaté est enregistré. Le consultant voit l'état de chaque livrable : non traité, validé, rejeté, et en retard quand l'échéance est passée.

```
ATTENDU --> REMIS ----------------> VALIDE --> TRANCHE ENGAGEE --> PAIEMENT CONSTATE
(type,      (piece obligatoire)        |        (ex. 40 %)
 rattache)       |                     |
                 +--- REJETE ----------+   (commentaire ; le consultant corrige et remet)

CONSULTANT voit : non traite / valide / rejete / en retard
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-LIV-01 | Un livrable est rattaché à une activité, un projet ou une mission, selon son type. | Fonctionnement de l'Agence |
| RG-LIV-02 | Les règles d'un livrable dépendent de son type ; la liste des types est attendue. | Fonctionnement de l'Agence |
| RG-LIV-03 | Un livrable ne se remet pas sans sa pièce. | Fonctionnement de l'Agence |
| RG-LIV-04 | Un livrable ne se valide pas sans sa pièce. | Fonctionnement de l'Agence |
| RG-LIV-05 | Un livrable est validé par une autre personne que son auteur. | Métier |
| RG-LIV-06 | La validation d'un livrable engage une tranche de paiement. | Fonctionnement de l'Agence |
| RG-LIV-07 | Un livrable se corrige tant qu'il n'est pas validé. | Fonctionnement de l'Agence |
| RG-LIV-08 | Un contrat de mission se lit par le consultant titulaire, sa hiérarchie et les membres du projet qui ont le droit d'en voir les engagements ; non par les autres consultants. | Fonctionnement de l'Agence |
| RG-LIV-09 | Un montant est un champ sensible : il se masque par fonction. | Qualité |
| RG-LIV-10 | Un contrat de mission engage l'Agence : il est signé par la direction générale. | Loi |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Livrables | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Rattachement | Refuser de créer un livrable qui n'est rattaché à rien (EX-LIV-001) | Système | RG-LIV-01 | À corriger |
| Rattachement | Exiger le rattachement que le type prescrit : activité, projet ou mission (EX-LIV-002) | Système | RG-LIV-01 | À corriger |
| Types | Porter pour chaque livrable un type pris dans un référentiel fermé, liste attendue des directions (EX-LIV-003) | Responsable du projet | RG-LIV-02 | À construire |
| Types | Appliquer à chaque type ses règles propres de remise et de validation (EX-LIV-004) | Système | RG-LIV-02 | À construire |
| Correction | Corriger un livrable tant qu'il n'est pas validé, et journaliser la correction avant et après (EX-LIV-005, EX-LIV-006) | Auteur | RG-LIV-07 | À corriger |
| Remise | Refuser la remise d'un livrable sans fichier (EX-LIV-010) | Système | RG-LIV-03 | À corriger |
| Remise | Présenter pour remettre une fenêtre de deux champs : le fichier et un mot au valideur (EX-LIV-011) | Consultant | RG-LIV-03 | À corriger |
| Remise | Lier le document remis au livrable et le rendre visible au valideur (EX-LIV-012) | Système | RG-LIV-03 | À corriger |
| Remise | Laisser visible chez son auteur un livrable remis, avec son nouvel état (EX-LIV-013) | Consultant | EX-TRA-050 | À corriger |
| Remise | Répondre à la remise par un message écrit qui la nomme (EX-LIV-014) | Consultant | EX-TRA-050 | À corriger |
| Validation | Refuser la validation d'un livrable sans pièce (EX-LIV-020) | Système | RG-LIV-04 | À corriger |
| Validation | Refuser la validation par l'auteur du livrable (EX-LIV-021) | Système | RG-LIV-05 | Non vérifié |
| Validation | Exiger un commentaire pour rejeter, et informer le consultant de la validation ou du rejet (EX-LIV-022, EX-LIV-023) | Valideur | RG-LIV-05 | Non vérifié |
| Validation | Présenter au consultant l'état de chaque livrable soumis : non traité, validé, rejeté (EX-LIV-024) | Consultant | RG-LIV-05 | Non vérifié |
| Paiement | Engager la tranche de paiement liée au livrable à sa validation (EX-LIV-025) | Système | RG-LIV-06 | Existant |
| Paiement | Refuser d'engager deux fois la même tranche (EX-LIV-026) | Système | RG-LIV-06 | Non vérifié |
| Paiement | Enregistrer le paiement constaté d'une tranche (EX-LIV-027) | Responsable du projet | RG-LIV-06 | Non vérifié |
| Paiement | Journaliser la validation et l'engagement de la tranche (EX-LIV-028) | Système | EX-TRA-007 | Non vérifié |
| Contrats | Rattacher à un projet le contrat d'un consultant, avec termes de référence et échéancier (EX-LIV-030) | Responsable du projet | RG-LIV-08 | Non vérifié |
| Contrats | Réserver la lecture d'un contrat au titulaire, à sa hiérarchie et aux membres autorisés, et la refuser à un autre consultant (EX-LIV-031, EX-LIV-032) | Système | RG-LIV-08 | À corriger |
| Contrats | Déclarer la route de lecture d'un contrat au contrat d'accès (EX-LIV-033) | Système | RG-LIV-08 | À corriger |
| Contrats | Faire signer un contrat de mission par la direction générale (EX-LIV-034) | Direction générale | RG-LIV-10 | Non vérifié |
| Contrats | Signaler un contrat à l'approche de son terme (EX-LIV-035) | Système | RG-LIV-08 | Non vérifié |
| Consultant | Présenter au consultant ses tâches, son contrat, le plan du projet, ses livrables attendus et soumis (EX-LIV-040) | Consultant | RG-LIV-08 | Partiel |
| Consultant | Faire remonter sur son accueil ses livrables en retard (EX-LIV-041) | Consultant | RG-LIV-05 | À corriger |
| Consultant | Limiter la lecture des livrables au périmètre de la personne (EX-LIV-042) | Système | RG-LIV-09 | Non vérifié |

### Ce qui manque aujourd'hui

Sur vingt-neuf exigences, dix-sept ont été confrontées : une est tenue, une l'est en partie, treize ne le sont pas, deux n'existent pas. La seule qui tienne est celle qui fait le moins peur : la validation engage bien une tranche. Tout ce qui devrait la protéger manque. Un livrable peut n'être lié à rien, puisque projet, activité du plan et contrat sont trois champs facultatifs. Aucun type de livrable n'existe. La table n'a aucune colonne de fichier : le consultant remet en deux clics, zéro champ, zéro pièce, et aucun document n'est lié. Le valideur reçoit un statut et deux événements sans commentaire, puis engage une tranche : quarante pour cent, sept mille deux cents dollars dans la démonstration. La ligne disparaît de la liste de celui qui vient de remettre, la remise répond sans un mot, et la fenêtre se démonte. Le serveur expose la correction d'un livrable, mais la fiche ne la propose pas. Enfin un consultant invité lit intégralement le contrat d'un autre : montant, échéancier, termes de référence ; et la route n'est pas déclarée au contrat d'accès. L'accueil du consultant annonce zéro tâche ouverte alors qu'un livrable est en retard de la veille. Douze exigences ne sont pas vérifiées. La liste des types de livrables est une décision attendue du maître d'ouvrage : les deux exigences correspondantes ne peuvent pas être closes avant elle.

## Module Partenaires

L'Agence travaille avec des tiers : le ministère de tutelle, des bailleurs et partenaires au développement, des collectivités, des entreprises. Le module tient l'annuaire de ces partenaires, une fiche par partenaire, et les accords conclus avec eux : conventions, avenants, pièces. Un accord engage l'Agence ; il est donc signé par la direction générale, ou par le directeur général adjoint en intérim déclaré, par le circuit du signataire, et numéroté à son entrée en vigueur.

Le module est aussi la porte des interfaces extérieures. Le ministère de tutelle, la Cour des comptes et le collège des commissaires aux comptes sont des destinataires : un document qui leur est transmis sort de l'institution comme tout courrier sortant, mais eux ne sont pas des acteurs du système. Certains partenaires sont confidentiels ; la direction les lit en lecture seule, leurs gestionnaires les gèrent, un agent ne les voit pas. Le montant d'un accord est un champ sensible.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Gestionnaire des partenariats | Tient l'annuaire, prépare les accords, gère les partenaires confidentiels |
| Point focal | Interlocuteur de l'Agence pour un partenaire |
| Direction générale | Signe les accords ; lit les partenaires confidentiels, en lecture seule |
| Cabinet | Lit comme la direction générale ; ne signe pas |
| Agent | Consulte les partenaires et accords de son périmètre |

### Le cycle de vie

Un partenaire est actif, peut être suspendu puis réactivé, et finit clos ; la clôture est refusée tant qu'un accord est en vigueur sur sa fiche. Deux fiches du même partenaire se fusionnent, la fiche absorbée renvoyant vers la fiche gardée, qui doit être active. Un accord est préparé, passe au signataire, y est signé par la direction générale, puis entre en vigueur, ce qui lui donne son numéro, à condition que toutes ses parties soient actives. Il prend fin par résiliation ou par échéance. Un avenant suit le même cycle mais ne peut exister sans un accord parent en vigueur ; si le parent cesse de l'être avant la signature, l'avenant est remis en préparation avec un message explicite, ou retiré du circuit avec un motif.

```
PARTENAIRE :  ACTIF <--> SUSPENDU --> CLOS     (cloture refusée si un accord est en vigueur)
                 +-- fusion --> fiche absorbee (renvoie vers la fiche gardee, qui doit etre ACTIVE)

ACCORD :   PREPARATION --> SIGNATURE --> EN VIGUEUR --> RESILIE | ECHU
                              |               |
                              |               +--> AVENANT (meme cycle ; le parent doit etre en vigueur)
                              +-- signe par la DG ; numerote a l'entree en vigueur
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-PAR-01 | Il y a un seul annuaire : une fiche par partenaire. | Fonctionnement de l'Agence |
| RG-PAR-02 | Un accord engage l'Agence : il est signé par la direction générale, ou par le DGA en intérim déclaré. | Loi |
| RG-PAR-03 | Un accord est numéroté à son entrée en vigueur. | Fonctionnement de l'Agence |
| RG-PAR-04 | Un avenant modifie un accord en vigueur ; il ne peut exister sans parent en vigueur. | Fonctionnement de l'Agence |
| RG-PAR-05 | Une fiche qui porte un accord en vigueur ne se clôt pas. | Métier |
| RG-PAR-06 | Un accord en vigueur n'a pas de partie close ou suspendue. | Métier |
| RG-PAR-07 | Un partenaire confidentiel se lit par la direction, en lecture seule, et par ses gestionnaires ; non par un agent. | Fonctionnement de l'Agence |
| RG-PAR-08 | La fiche d'un partenaire ne liste que les accords et pièces du périmètre de celui qui la lit. | Qualité |
| RG-PAR-09 | Une résiliation traite les avenants en cours. | Métier |
| RG-PAR-10 | Le montant d'un accord est un champ sensible. | Qualité |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Partenaires | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Annuaire | Tenir une seule fiche par partenaire et distinguer actif, suspendu et clos (EX-PAR-001, EX-PAR-002) | Gestionnaire des partenariats | RG-PAR-01 | Non vérifié |
| Annuaire | Refuser de clore une fiche qui porte un accord en vigueur (EX-PAR-003) | Système | RG-PAR-05 | Existant |
| Annuaire | Refuser de fusionner vers une fiche qui n'est pas active (EX-PAR-004) | Système | RG-PAR-01 | À corriger |
| Annuaire | Journaliser une fusion avec les deux fiches concernées (EX-PAR-005) | Système | EX-TRA-007 | Non vérifié |
| Annuaire | Tenir pour chaque partenaire ses contacts et un point focal (EX-PAR-010) | Gestionnaire des partenariats | RG-PAR-01 | Non vérifié |
| Annuaire | Retrouver un partenaire par la recherche générale (EX-PAR-009) | Tout agent | RG-PAR-08 | À corriger |
| Annuaire | Refuser une date antérieure à 1900 ou un montant hors bornes par une erreur de saisie (EX-PAR-011) | Système | EX-TRA-051 | Non vérifié |
| Confidentialité | Refuser de lier un partenaire que l'auteur du lien ne peut pas lire (EX-PAR-006) | Système | RG-PAR-07 | À corriger |
| Confidentialité | Réserver la lecture d'un partenaire confidentiel à la direction et aux gestionnaires (EX-PAR-007) | Système | RG-PAR-07 | Non vérifié |
| Confidentialité | Limiter la fiche aux accords et pièces du périmètre de la personne (EX-PAR-008) | Système | RG-PAR-08 | Non vérifié |
| Accords | Enregistrer un accord avec parties, objet, dates, montant et devise (EX-PAR-020) | Gestionnaire des partenariats | RG-PAR-03 | Non vérifié |
| Accords | Numéroter un accord à son entrée en vigueur (EX-PAR-021) | Système | RG-PAR-03 | Non vérifié |
| Accords | Faire signer un accord par la direction générale ; nommer Signé par la personne qui signe (EX-PAR-022, EX-PAR-023) | Direction générale | RG-PAR-02 | À corriger |
| Accords | Refuser l'entrée en vigueur d'un accord dont une partie n'est pas active (EX-PAR-024) | Système | RG-PAR-06 | Existant |
| Avenants | Refuser l'entrée en vigueur d'un avenant dont le parent n'est pas en vigueur (EX-PAR-025) | Système | RG-PAR-04 | Partiel |
| Avenants | Traiter les avenants en circuit quand un accord est résilié (EX-PAR-026) | Système | RG-PAR-09 | À corriger |
| Avenants | Remettre en préparation, avec un message explicite, un avenant dont le parent cesse d'être en vigueur avant sa signature (EX-PAR-027) | Système | RG-PAR-04 | À corriger |
| Avenants | Supprimer ou rejeter un avenant au signataire, avec un motif (EX-PAR-028) | Gestionnaire des partenariats | RG-PAR-04 | À corriger |
| Suivi | Journaliser l'entrée en vigueur, l'avenant et la résiliation (EX-PAR-029) | Système | EX-TRA-007 | Non vérifié |
| Suivi | Signaler un accord à l'approche de son échéance (EX-PAR-030) | Système | RG-PAR-03 | Non vérifié |
| Suivi | Masquer le montant d'un accord à qui n'en a pas le droit (EX-PAR-031) | Système | RG-PAR-10 | Non vérifié |

### Ce qui manque aujourd'hui

Sur vingt-trois exigences, dix ont été confrontées : deux sont tenues, une l'est en partie, sept ne le sont pas. Deux règles de fond tiennent : on ne clôt pas une fiche qui porte un accord en vigueur, et on n'active pas un accord dont une partie est close ou suspendue. Le reste du cycle des avenants est cassé. La résiliation d'un accord ne regarde pas les avenants en cours : l'avenant reste au statut signature, la direction générale a signé un acte sans effet, et il ne peut plus ni entrer en vigueur, ni être supprimé, ni être rejeté. Le contrôle du parent n'a lieu qu'à la signature, après que la direction générale a signé. La fusion transfère les parties vers la fiche gardée sans regarder son état. Un partenaire confidentiel figure dans la liste, son nom est livré, puis le lien est refusé. La recherche générale ne couvre ni les partenaires ni les accords. Le mot Signataire désigne la personne qui signe dans l'écran des accords, alors qu'il désigne le circuit partout ailleurs. Treize exigences ne sont pas vérifiées, dont la numérotation d'un accord et le masque du montant.

## Module Risques

Une entité sait ce qui peut l'empêcher de tenir son plan, et elle le suit sans demander la permission de la direction générale. Le module tient le registre des risques de l'Agence : chacun avec sa probabilité, son impact, sa portée, son responsable et sa parade. La direction générale lit l'ensemble. Le module tient aussi les indicateurs qui mesurent la tenue du plan : un indicateur se calcule quand sa source est dans le système, il se saisit sinon, et le droit de le gérer est distinct du droit sur les risques.

La portée d'un risque borne ce que son auteur peut exercer. Un chef de cellule ne crée pas de risque « Agence entière » : il n'est pas devant un bouton de trop, il est devant une proposition qui n'a pas de sens dans son monde. Une parade a une échéance, et cette échéance se relance : un risque dont la parade est écrite et jamais relancée est un risque que personne ne suit.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Responsable d'un risque | Met à jour la parade et l'état |
| Chef d'entité | Déclare et suit les risques de son entité et des projets de son périmètre |
| Directrice générale, directeur général adjoint | Lisent tout le registre ; seuls habilités aux risques Agence entière |
| Détenteur du droit sur les indicateurs | Définit les indicateurs et saisit les mesures ; droit distinct, direction générale et DGA |
| Agent | Voit ses risques et ceux de ses activités |

### Le cycle de vie

Un risque est identifié avec sa portée — une entité, un projet ou l'Agence entière — et son responsable. Il passe en traitement quand sa parade est écrite avec une échéance, que le système relance avant la date. Il est mitigé quand il porte au moins une mesure, le système refusant de le marquer mitigé sinon. Il est clos quand il n'a plus lieu d'être, et un risque clos ne se modifie plus. Les risques d'un projet privé sont exclus du registre commun.

```
IDENTIFIE --> EN TRAITEMENT --> MITIGE --> CLOS
 (portee,      (parade ecrite,    (au moins   (non modifiable)
  responsable)  echeance relancee)  une mesure)

INDICATEUR : defini (unite, cible, source) --> mesure (date obligatoire) --> calcule si la source est dans le systeme
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-RIS-01 | Un risque a une portée : une entité, un projet, ou l'Agence entière. | Fonctionnement de l'Agence |
| RG-RIS-02 | La portée d'un risque se limite à ce que son auteur peut exercer ; un chef de cellule ne crée pas de risque Agence entière. | Fonctionnement de l'Agence |
| RG-RIS-03 | Un risque a un responsable. | Métier |
| RG-RIS-04 | Une parade a une échéance, et cette échéance se relance. | Métier |
| RG-RIS-05 | Un risque mitigé porte au moins une mesure. | Métier |
| RG-RIS-06 | Un risque clos ne se modifie plus. | Métier |
| RG-RIS-07 | Le registre ne s'ouvre pas aux projets privés hors du cercle du projet. | Qualité |
| RG-RIS-08 | Un indicateur se calcule quand sa source est dans le système ; il se saisit sinon. | Métier |
| RG-RIS-09 | Le droit sur les indicateurs est distinct du droit sur les risques. | Fonctionnement de l'Agence |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Risques | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Déclaration | Déclarer un risque avec probabilité, impact, portée et responsable (EX-RIS-001) | Chef d'entité | RG-RIS-01 | Non vérifié |
| Déclaration | Ne proposer à une personne que les portées qu'elle peut exercer (EX-RIS-002) | Chef d'entité | RG-RIS-02 | À corriger |
| Déclaration | Refuser à un chef d'entité un risque de portée Agence entière (EX-RIS-003) | Système | RG-RIS-02 | À corriger |
| Visibilité | Limiter la lecture du registre aux entités et projets que la personne peut lire (EX-RIS-004) | Système | RG-RIS-07 | Non vérifié |
| Visibilité | Exclure du registre commun les risques d'un projet privé (EX-RIS-005) | Système | RG-RIS-07 | Non vérifié |
| Suivi | Mettre à jour la parade et l'état d'un risque (EX-RIS-006) | Responsable du risque | RG-RIS-03 | Non vérifié |
| Suivi | Calculer la criticité à partir de la probabilité et de l'impact (EX-RIS-007) | Système | RG-RIS-01 | Non vérifié |
| Suivi | Présenter à la direction générale la matrice des risques de son périmètre (EX-RIS-008) | Direction générale | RG-RIS-01 | Non vérifié |
| Suivi | Journaliser le changement de responsable, de cotation et de clôture (EX-RIS-009) | Système | EX-TRA-007 | Non vérifié |
| Parade | Saisir et afficher l'échéance de la parade sur la fiche du risque (EX-RIS-010, EX-RIS-011) | Responsable du risque | RG-RIS-04 | À corriger |
| Parade | Relancer le responsable avant l'échéance de la parade (EX-RIS-012) | Système | RG-RIS-04 | À construire |
| Parade | Refuser de marquer mitigé un risque sans mesure ; refuser de modifier un risque clos (EX-RIS-013, EX-RIS-014) | Système | RG-RIS-05, RG-RIS-06 | Non vérifié |
| Indicateurs | Définir un indicateur avec son unité, sa cible et sa source (EX-RIS-020) | Détenteur du droit | RG-RIS-09 | Non vérifié |
| Indicateurs | Refuser une date de mesure inexistante par un message de saisie, et une mesure sans date (EX-RIS-021, EX-RIS-022) | Système | EX-TRA-051 | Non vérifié |
| Indicateurs | Calculer un indicateur depuis sa source quand elle est dans le système (EX-RIS-023) | Système | RG-RIS-08 | Non vérifié |
| Indicateurs | Réserver la gestion des indicateurs aux détenteurs du droit distinct (EX-RIS-024) | Système | RG-RIS-09 | Non vérifié |

### Ce qui manque aujourd'hui

Sur dix-neuf exigences, cinq ont été confrontées : quatre ne sont pas tenues, une n'existe pas. Le module propose ce que l'Agence interdit : l'interface lit le droit, jamais l'étendue, et un risque Agence entière est proposé à un chef de cellule, l'aide du champ l'y invitant. La parade a une échéance que le serveur porte, valide et renvoie, mais que l'interface ne montre ni ne permet de saisir. Et la relance n'existe pas : le mécanisme de rappels n'a aucune source risque, de sorte qu'une parade écrite n'est jamais relancée. C'est le défaut le plus lourd, parce qu'il vide de son sens ce que l'Agence attend d'un registre de risques. Quatorze exigences ne sont pas vérifiées, dont les indicateurs, leur calcul et leur droit distinct, que personne n'a encore confrontés à l'existant.

## Module Ressources humaines

L'Agence compte environ cent quatre-vingt-douze agents, dispersés sur six pools et deux fuseaux horaires. Le service des ressources humaines tient leurs dossiers, enregistre les arrivées et les sorties, suit les congés et les intérims. Le module porte les données les plus protégées du système : dossiers personnels, contrats, santé. Il ne remplace ni la paie ni la comptabilité, qui sont outillées ailleurs ; il en est l'amont.

Un principe le gouverne : ce qu'on sait d'une personne ne sort pas du cercle de ceux qui doivent le savoir. Le secret médical en est la catégorie la plus fermée, et il est de loi : la nature et le motif d'un congé de maladie ne sont lisibles que de l'agent et du service des ressources humaines. Même la hiérarchie et la direction générale voient « absence » et des dates, jamais davantage. L'intérimaire, qui remplace l'agent pendant son congé, ne sait rien de sa nature. Ce secret doit tenir par toutes les voies : liste, fiche, notification, retour d'écriture, export, journal.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Service des ressources humaines | Tient les dossiers, pose les sorties, lit le détail d'un congé |
| Agent | Lit son propre dossier ; demande ses congés ; désigne son intérimaire |
| Chef d'entité | Décide les congés de son équipe ; lit la partie administrative du dossier de ses agents |
| Directrice générale, directeur général adjoint | Lisent ; décident quand aucun chef n'existe au-dessus de la demande |
| Intérimaire | Remplace l'agent pendant son congé ; ne sait rien de sa nature |
| Responsable informatique | Crée les comptes ; ne lit ni dossiers RH ni pilotage |

### Le cycle de vie

Trois cycles se tiennent côte à côte. L'agent arrive : l'arrivée se contrôle en entier avant que quoi que ce soit soit créé, puis le compte est invité et activé. Il est actif jusqu'à ce que sa sortie soit posée ; la sortie suspend le compte, révoque les sessions, clôt l'affectation, refuse avec un motif les demandes de congé en cours et retire ou réaffecte les intérims ; posée par erreur, elle s'annule avec un motif et une trace, et le compte et l'affectation se rouvrent. Le congé est demandé, puis approuvé ou refusé par un décideur qui n'est ni l'auteur ni le saisisseur ; à défaut de chef, la demande remonte à la direction générale. L'absence, enfin, s'affiche comme absence et dates, rien de plus.

```
AGENT :   ARRIVEE --> INVITE --> ACTIF --> SORTIE POSEE --> SORTI
          (controles)  (compte)              |   ^
                                             +---+  annulation (motif, journal)

CONGE :   DEMANDE --> APPROUVE --> PRIS
                 +--> REFUSE
          (decideur : ni l'auteur ni le saisisseur ; a defaut de chef, la DG)

ABSENCE : affichee "absence" + dates ; nature et motif d'un conge de maladie : agent et RH seulement
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-RH-01 | Tout agent a un dossier et un compte ; un consultant a un compte, sans dossier d'agent. | Fonctionnement de l'Agence |
| RG-RH-02 | Un contractuel, un stagiaire et un consultant ont une date de fin. | Fonctionnement de l'Agence |
| RG-RH-03 | Une arrivée se contrôle en entier avant que quoi que ce soit soit créé. | Métier |
| RG-RH-04 | Une sortie suspend le compte, révoque les sessions, clôt l'affectation et règle les congés et les intérims de l'agent. | Fonctionnement de l'Agence |
| RG-RH-05 | Une sortie posée par erreur s'annule, avec un motif et une trace. | Métier |
| RG-RH-06 | La nature et le motif d'un congé de maladie ne sont lisibles que de l'agent et du service RH. | Loi |
| RG-RH-07 | Un jour de congé est un jour ouvré qui n'est pas férié ; les jours fériés de l'Agence sont un référentiel. | Fonctionnement de l'Agence |
| RG-RH-08 | Chaque nature de congé a un droit annuel ; une demande qui le dépasse est refusée. | Fonctionnement de l'Agence |
| RG-RH-09 | Le décideur d'un congé n'est ni son auteur ni son saisisseur ; sans décideur, la demande remonte à la direction générale. | Métier |
| RG-RH-10 | Le décideur se détermine à la lecture, non à la création. | Métier |
| RG-RH-11 | Les notes et évaluations RH sont réservées au service RH. | Fonctionnement de l'Agence |
| RG-RH-12 | L'annuaire n'expose que les informations professionnelles : nom, fonction, entité, adresse professionnelle. | Qualité |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Ressources humaines | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Dossier | Tenir pour chaque agent un dossier : identité, fonction, entité, affectation, contrat (EX-RH-001) | Service RH | RG-RH-01 | Non vérifié |
| Dossier | Réserver la modification des notes et évaluations au service RH, et limiter un chef à la partie administrative (EX-RH-008, EX-RH-009) | Service RH, chef d'entité | RG-RH-11 | Non vérifié |
| Dossier | N'exposer dans l'annuaire que les informations professionnelles (EX-RH-010) | Système | RG-RH-12 | Non vérifié |
| Dossier | Signaler à 90 puis 30 jours le terme des contrats (EX-RH-011) | Service RH | RG-RH-02 | Non vérifié |
| Arrivée | Refuser l'arrivée d'un contractuel, d'un stagiaire ou d'un consultant sans date de fin (EX-RH-002) | Système | RG-RH-02 | Non vérifié |
| Arrivée | N'enrôler un agent qu'après tous les contrôles, sans compte, membre ni avis après un refus (EX-RH-003, EX-RH-004) | Système | RG-RH-03 | À corriger |
| Arrivée | Offrir un seul chemin pour faire entrer une personne, le formulaire qui demande entité et fonction (EX-RH-005) | Service RH | RG-RH-03 | À corriger |
| Arrivée | Annoncer à la création du compte la seconde étape ; réafficher et corriger l'entité et la fonction d'une invitation en attente (EX-RH-006, EX-RH-007) | Service RH | RG-RH-03 | À corriger |
| Sortie | Poser la date de sortie d'un agent (EX-RH-020) | Service RH | RG-RH-04 | Non vérifié |
| Sortie | Suspendre le compte, révoquer les sessions et clore l'affectation d'un agent sorti (EX-RH-021) | Système | RG-RH-04 | Existant |
| Sortie | Refuser avec motif les demandes de congé en cours d'un agent sorti (EX-RH-022) | Système | RG-RH-04 | À corriger |
| Sortie | Retirer ou réaffecter les intérims que tenait un agent sorti (EX-RH-023) | Système | RG-RH-04 | À corriger |
| Sortie | Annuler une sortie avec un motif obligatoire et rouvrir compte et affectation (EX-RH-024, EX-RH-025) | Service RH | RG-RH-05 | À construire |
| Sortie | Journaliser la pose et l'annulation d'une sortie (EX-RH-026) | Système | EX-TRA-007 | Non vérifié |
| Sortie | Refuser la sortie du dernier administrateur du système (EX-RH-027) | Système | RG-RH-04 | Non vérifié |
| Congés | Demander un congé avec nature, dates et, s'il y a lieu, un motif (EX-RH-030) | Agent | RG-RH-07 | Non vérifié |
| Congés | Refuser une date inexistante par un message de saisie et borner la durée d'une demande (EX-RH-031, EX-RH-032) | Système | EX-TRA-051 | À corriger |
| Congés | Exclure du décompte les jours fériés, tenus dans un référentiel (EX-RH-033, EX-RH-034) | Système | RG-RH-07 | À corriger |
| Congés | Tenir un droit annuel par nature et refuser une demande qui dépasse le solde, en indiquant le solde restant (EX-RH-035, EX-RH-036) | Système | RG-RH-08 | À corriger |
| Congés | Refuser une demande dont le décompte est de zéro jour (EX-RH-037) | Système | RG-RH-07 | À corriger |
| Congés | Répartir sur leurs exercices les jours d'une demande à cheval sur deux exercices (EX-RH-038) | Système | RG-RH-08 | À corriger |
| Décision | Refuser qu'un auteur ou un saisisseur décide sa propre demande (EX-RH-039) | Système | RG-RH-09 | Existant |
| Décision | Remonter à la direction générale une demande sans décideur possible (EX-RH-040) | Système | RG-RH-09 | À corriger |
| Décision | Recalculer le décideur à la lecture quand le chef a changé (EX-RH-041) | Système | RG-RH-10 | À corriger |
| Décision | Désigner son intérimaire pour la durée d'un congé (EX-RH-042) | Agent | RG-RH-04 | Non vérifié |
| Secret médical | Écrire ni la nature ni le motif d'un congé de maladie dans une notification, intitulée demande une absence pour le chef (EX-RH-050, EX-RH-054) | Système | RG-RH-06 | À corriger |
| Secret médical | Ne pas l'écrire dans la valeur de retour d'une écriture (EX-RH-051) | Système | RG-RH-06 | À corriger |
| Secret médical | Ne pas l'écrire dans un export ni dans le journal d'administration (EX-RH-052, EX-RH-053) | Système | RG-RH-06 | Non vérifié |
| Secret médical | Ne pas nommer la nature du congé à l'intérimaire (EX-RH-055) | Système | RG-RH-06 | À corriger |
| Secret médical | Montrer à toute autre personne absence et les dates seules (EX-RH-056) | Système | RG-RH-06 | Partiel |

### Ce qui manque aujourd'hui

Sur trente-neuf exigences, vingt-six ont été confrontées : deux sont tenues, une l'est en partie, dix-neuf ne le sont pas, quatre n'existent pas. C'est le module où l'écart touche le plus de monde. Le secret médical, qui est de loi, fuit : l'avis au chef écrit le type du congé dans son titre et le motif en clair dans son corps, l'intérimaire se voit nommer la nature du congé, et la décision renvoie la ligne non masquée ; le masque ne couvre que la lecture directe, la liste et le résumé. L'arrivée crée le compte, le lien et le membre, et prévient les administrateurs avant d'avoir fait les contrôles, et il existe deux formulaires d'arrivée dont le second ne demande ni entité ni fonction. La sortie est posée mais n'est pas réglée : les demandes de congé restent ouvertes chez un chef, l'agent sorti demeure intérimaire d'autres personnes, et une sortie posée par erreur ne s'annule pas. Le calcul des congés compte tous les lundis aux vendredis, sans jours fériés, sans droit annuel, sans plafond de solde ; une demande du samedi au dimanche donne zéro jour et passe ; une date inexistante fait répondre le serveur par une erreur ; une période sans borne fait des millions d'itérations. Le décideur est figé à la création et jamais recalculé, et s'il est le seul détenteur du droit de gestion, personne ne reçoit rien. Treize exigences ne sont pas vérifiées, dont les exports et le journal d'administration au regard du secret médical.

## Module Organisation

La forme de l'Agence n'est pas un organigramme décoratif. Elle commande trois choses : l'autonomie des entités, le périmètre de chaque chef, et le fuseau horaire. La direction générale est tenue par une directrice générale et un seul directeur général adjoint. Quatre services lui sont rattachés : la cellule de communication, la cellule NTIC, la cellule de conformité et le secrétariat de direction. Sous elle viennent les directions centrales, avec leurs divisions et leurs bureaux ; enfin l'Agence est présente dans le pays par six pools territoriaux, chacun couvrant plusieurs provinces et dirigé par un directeur de pool.

Le module tient cette structure : les entités, leurs types, leurs chefs, leurs équipes, les personnes qui y sont affectées, et l'étendue de ce que chacun peut exercer. Deux sièges de pool ne sont pas à la même heure, Kinshasa à UTC+1 et Lubumbashi à UTC+2 : « aujourd'hui » n'est pas le même jour partout, et le fuseau se porte donc par l'entité. Le Conseil d'administration et le collège des commissaires aux comptes ne sont pas outillés : leurs actes entrent dans le système, ils n'y délibèrent pas.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Responsable informatique | Administre la structure : crée, rattache, nomme les chefs, gère les fonctions et les types |
| Service RH | Affecte les personnes ; tient leurs dossiers |
| Chef d'entité, directeur de pool | Dirige son entité et les entités rattachées ; gère son équipe |
| Directrice générale | Lit toute la structure |
| Agent, stagiaire | Lit son entité, son responsable, l'annuaire professionnel |

### Le cycle de vie

La structure est un arbre : elle n'a pas d'états, seul l'arrivant en a un, décrit au module Ressources humaines. Chaque entité a un seul parent, un type tiré d'un référentiel fermé et un chef ; une entité de type pool a un directeur de pool. On ne nomme chef qu'une personne dont le profil le permet ; nul ne se nomme chef de son propre chef et nul ne remplace un chef de rang supérieur. Le fuseau se porte par l'institution et se surcharge par l'entité. Une équipe est un groupe de travail transversal, elle n'est pas une entité.

```
Agence (institution)
 +- Direction generale -- DG, DGA -- Secretariat de direction, Cellule de communication,
 |                                    Cellule NTIC, Cellule de conformite
 +- Directions centrales -- directeur -- Divisions -- Bureaux
 +- Pools territoriaux (6) -- directeur de pool -- Representations provinciales, Antennes

Fuseau : institution --> surcharge par l'entite (Kinshasa UTC+1, Lubumbashi UTC+2)
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-ORG-01 | La structure est un arbre d'entités dont la racine est l'institution. | Fonctionnement de l'Agence |
| RG-ORG-02 | Le type d'une entité se prend dans un référentiel fermé. | Fonctionnement de l'Agence |
| RG-ORG-03 | Il y a un seul directeur général adjoint. | Fonctionnement de l'Agence |
| RG-ORG-04 | Chaque entité a un chef ; une entité de type pool a un directeur de pool. | Fonctionnement de l'Agence |
| RG-ORG-05 | On ne nomme chef qu'une personne dont le profil le permet. | Fonctionnement de l'Agence |
| RG-ORG-06 | Nul ne se nomme chef de son propre chef ; nul ne remplace un chef de rang supérieur. | Qualité |
| RG-ORG-07 | Un chef d'entité se limite à son entité, aux entités rattachées et aux endroits où il a été invité. | Fonctionnement de l'Agence |
| RG-ORG-08 | Le périmètre est une dimension distincte du droit : avoir un droit ne dit pas pour quelle entité. | Fonctionnement de l'Agence |
| RG-ORG-09 | Une entité est autonome dans son fonctionnement : ce qui se décide dans une entité se décide dans cette entité. | Fonctionnement de l'Agence |
| RG-ORG-10 | Le fuseau horaire se porte par l'institution et se surcharge par l'entité. | Fonctionnement de l'Agence |
| RG-ORG-11 | Le Conseil d'administration et le collège des commissaires aux comptes ne sont pas outillés. | Loi |
| RG-ORG-12 | Une équipe est un groupe de travail transversal ; ce n'est pas une entité. | Fonctionnement de l'Agence |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Organisation | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Types et fonctions | Tenir les types d'entité dans un référentiel fermé, modifiable dans les paramètres sans toucher au code (EX-ORG-001) | Responsable informatique | RG-ORG-02 | Non vérifié |
| Types et fonctions | Offrir le type d'entité Division (EX-ORG-002) | Responsable informatique | RG-ORG-02 | À construire |
| Types et fonctions | Offrir le type d'entité Bureau (EX-ORG-003) | Responsable informatique | RG-ORG-02 | À construire |
| Types et fonctions | Offrir le type d'entité Pool (EX-ORG-004) | Responsable informatique | RG-ORG-02 | À construire |
| Types et fonctions | Offrir la fonction de directeur de pool (EX-ORG-005) | Responsable informatique | RG-ORG-04 | À construire |
| Types et fonctions | Refuser un second directeur général adjoint (EX-ORG-006) | Système | RG-ORG-03 | Non vérifié |
| Types et fonctions | N'offrir au catalogue des profils qu'un seul profil de directeur général adjoint (EX-ORG-007) | Responsable informatique | RG-ORG-03 | À corriger |
| Structure | Rattacher une entité à un seul parent et refuser un rattachement qui crée un cycle (EX-ORG-010, EX-ORG-011) | Système | RG-ORG-01 | Non vérifié |
| Structure | Créer, renommer et rattacher les entités (EX-ORG-012) | Responsable informatique | RG-ORG-01 | Non vérifié |
| Chefs | Refuser de nommer chef une personne dont le profil ne le permet pas (EX-ORG-013) | Système | RG-ORG-05 | Existant |
| Chefs | Refuser qu'une personne se nomme chef ou remplace un chef de rang supérieur (EX-ORG-014, EX-ORG-015) | Système | RG-ORG-06 | Non vérifié |
| Chefs | Ne proposer dans le sélecteur de chef que des personnes que le serveur acceptera (EX-ORG-016) | Responsable informatique | EX-TRA-013 | À corriger |
| Chefs | Compter le responsable d'une entité parmi ses membres (EX-ORG-017) | Système | RG-ORG-04 | Non vérifié |
| Chefs | Nommer le responsable en tête de l'écran d'entité, avec un moyen de le joindre (EX-ORG-018) | Tout agent | RG-ORG-04 | À corriger |
| Chefs | Désigner l'intérimaire d'un chef d'entité (EX-ORG-019) | Chef d'entité | RG-ORG-04 | À construire |
| Périmètre | Contrôler l'étendue d'un droit comme le droit lui-même (EX-ORG-030) | Système | RG-ORG-08 | À corriger |
| Périmètre | N'offrir à un chef, dans ses formulaires, que les entités de son périmètre (EX-ORG-031) | Chef d'entité | RG-ORG-07 | Non vérifié |
| Périmètre | Inviter une personne dans une entité ou un espace pour étendre son périmètre (EX-ORG-032) | Chef d'entité | RG-ORG-07 | Non vérifié |
| Fuseau | Porter un fuseau pour l'institution et le surcharger pour une entité (EX-ORG-040, EX-ORG-041) | Responsable informatique | RG-ORG-10 | À construire |
| Fuseau | Calculer aujourd'hui, en retard et cette semaine dans le fuseau de l'entité (EX-ORG-042) | Système | RG-ORG-10 | À corriger |
| Équipes | Constituer une équipe transversale et laisser son responsable la gérer (EX-ORG-050, EX-ORG-051) | Chef d'entité | RG-ORG-12 | Non vérifié |
| Équipes | Dire à un arrivant, sur son premier écran, ce qu'on attend de lui et à qui il s'adresse (EX-ORG-052) | Stagiaire, agent | RG-ORG-04 | À corriger |
| Équipes | Distinguer visiblement une équipe d'une entité (EX-ORG-053) | Tous | RG-ORG-12 | Non vérifié |
| Hors périmètre | N'offrir aucun écran de délibération du conseil d'administration ni du collège des commissaires aux comptes (EX-ORG-054) | Système | RG-ORG-11 | Non vérifié |

### Ce qui manque aujourd'hui

Sur vingt-huit exigences, quatorze ont été confrontées : une est tenue, six ne le sont pas, sept n'existent pas. Le référentiel connaît institution, direction générale, direction, département, service, cellule, représentation provinciale et antenne ; il ne connaît ni division, ni bureau, ni pool. Le secrétariat de direction, qui est une division de la direction générale, ne peut donc pas être représenté pour ce qu'il est, et les six pools territoriaux n'existent pas dans le système, ni la fonction de directeur de pool. Aucun fuseau n'existe : l'Agence a pourtant des sièges à deux heures différentes, et à zéro heure trente à Kinshasa, un serveur en temps universel date de la veille. L'intérim d'un chef d'entité manque, et le catalogue des profils ne reflète pas l'unicité du directeur général adjoint. L'écran d'entité ne nomme jamais son responsable, alors que le serveur le renvoie ; un stagiaire ne sait pas à qui demander. Le sélecteur de chef propose dix-sept personnes dont cinq seront refusées, soit vingt-neuf pour cent de choix voués au refus. Enfin l'interface lit le droit et jamais l'étendue : le périmètre, qui est la définition même de la fonction d'un chef, n'est pas contrôlé de bout en bout. Quatorze exigences ne sont pas vérifiées.

## Module Administration

Dans l'Agence, trois fonctions sont distinctes et aucune ne donne accès aux données des deux autres : piloter, c'est la direction générale ; administrer la plateforme, c'est le responsable informatique ; gérer les personnes, ce sont les ressources humaines. La directrice générale est propriétaire technique du système et ne règle ni la messagerie ni les profils, parce que ce n'est pas son travail. Le responsable informatique administre l'outil et ne voit ni le pilotage, ni les décisions, ni le courrier confidentiel. Un compte peut cumuler tous les pouvoirs techniques et peu de droits métier, et l'inverse.

Le module tient donc ce qui permet à l'outil de fonctionner sans que personne y voie trop : les demandes d'accès, les comptes, les profils de fonction et leurs droits, la messagerie sortante, les paramètres et les référentiels, et le journal d'audit. Ce journal est ce que la direction générale relit pour s'assurer que les administrateurs n'ont pas changé leurs propres droits. Il ne s'écrit qu'après l'exécution, ne porte aucun contenu de dossier RH, et la liste des genres d'actes qu'il consigne s'allonge sans jamais raccourcir.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Responsable informatique | Crée les comptes, administre profils, structure, messagerie, règles IA ; aucun droit métier de direction |
| Administrateur système | État du système, sessions, journal d'audit |
| Directrice générale | Relit le journal des administrateurs ; ne règle pas la messagerie ni les profils |
| Service RH | Lit les demandes d'accès d'agents ; tient les dossiers |
| Demandeur d'accès | Demande un compte ; en reçoit la réponse |

### Le cycle de vie

Une demande d'accès est approuvée ou refusée ; elle ne reste pas en attente. Un refus porte un motif et la personne en est avertie. Une demande approuvée donne un compte invité, puis actif ; un compte actif peut être suspendu, et un compte suspendu ne se connecte pas. La sortie d'un agent, décrite au module Ressources humaines, ferme le cycle. Les profils et les droits n'ont pas d'états mais une règle : nul ne s'accorde un droit, ne change son propre profil, ni n'attribue un profil supérieur à ce qu'il peut lui-même attribuer. Tout acte d'administration est journalisé, avec son auteur et sa date, une fois exécuté.

```
DEMANDE D'ACCES --> APPROUVEE --> INVITE --> ACTIF <--> SUSPENDU --> SORTI
       |                                                   (voir Ressources humaines)
       +--> REFUSEE (motif ; avis a la personne)

JOURNAL : acte execute --> journalise (auteur, date, avant/apres) --> relu par la DG (droits sensibles)
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-ADM-01 | Les droits d'une personne découlent de son profil de fonction, non de son rang technique. | Fonctionnement de l'Agence |
| RG-ADM-02 | Nul ne s'accorde un droit ni ne change son propre profil. | Qualité |
| RG-ADM-03 | Tout droit sensible accordé est signalé à qui relit le journal des administrateurs. | Qualité |
| RG-ADM-04 | Un administrateur ne connaît jamais le mot de passe d'autrui et ne reçoit pas le lien d'activation d'un compte de rang supérieur. | Qualité |
| RG-ADM-05 | Une demande d'accès est approuvée ou refusée ; elle ne reste pas en attente indéfiniment. | Métier |
| RG-ADM-06 | Un compte suspendu ne se connecte pas. | Qualité |
| RG-ADM-07 | Tout acte d'administration est journalisé, et seulement une fois exécuté. | Qualité |
| RG-ADM-08 | La liste des genres d'actes journalisés s'allonge ; elle ne raccourcit jamais. | Fonctionnement de l'Agence |
| RG-ADM-09 | Le journal d'administration ne porte aucun contenu de dossier RH. | Qualité |
| RG-ADM-10 | Un référentiel fermé ne s'allonge que par son gestionnaire. | Qualité |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Administration | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Demandes d'accès | Approuver une demande d'accès (EX-ADM-001) | Responsable informatique | RG-ADM-05 | Non vérifié |
| Demandes d'accès | Refuser une demande d'accès avec un motif (EX-ADM-002) | Responsable informatique | RG-ADM-05 | À corriger |
| Demandes d'accès | Informer la personne dont la demande est refusée (EX-ADM-003) | Système | RG-ADM-05 | À corriger |
| Demandes d'accès | Signaler à l'administrateur les demandes qui attendent (EX-ADM-004) | Système | RG-ADM-05 | À corriger |
| Comptes | Refuser la connexion d'un compte suspendu (EX-ADM-005) | Système | RG-ADM-06 | Non vérifié |
| Comptes | Ne remettre à un administrateur ni le mot de passe ni le lien de réinitialisation d'un autre compte (EX-ADM-006) | Système | RG-ADM-04 | Non vérifié |
| Comptes | Refuser d'attribuer un profil supérieur à ce que l'administrateur peut attribuer (EX-ADM-007) | Système | RG-ADM-04 | Non vérifié |
| Profils et droits | Attribuer à chaque profil l'ensemble de ses droits de consultation et d'action (EX-ADM-010) | Responsable informatique | RG-ADM-01 | Non vérifié |
| Profils et droits | Donner au profil Lecture seule les droits de consultation que son nom annonce (EX-ADM-011) | Responsable informatique | RG-ADM-01 | À corriger |
| Profils et droits | Refuser qu'une personne s'accorde un droit ou change son propre profil (EX-ADM-012) | Système | RG-ADM-02 | Partiel |
| Profils et droits | Journaliser toute modification d'un profil, avant et après, et signaler l'attribution d'un droit sensible (EX-ADM-013, EX-ADM-014) | Système | RG-ADM-03 | Partiel |
| Profils et droits | Permettre à la direction générale de relire le journal des administrateurs (EX-ADM-015) | Direction générale | RG-ADM-03 | Non vérifié |
| Matrice des droits | Figer l'en-tête et la première colonne de la matrice (EX-ADM-016) | Responsable informatique | RG-ADM-01 | À corriger |
| Matrice des droits | Rechercher un droit et filtrer la matrice par groupe de droits (EX-ADM-017, EX-ADM-018) | Responsable informatique | RG-ADM-01 | À corriger |
| Matrice des droits | Modifier un droit sur place, depuis la matrice, pour qui en a le droit (EX-ADM-019) | Responsable informatique | RG-ADM-01 | À corriger |
| Messagerie | Réserver le réglage de la messagerie sortante au responsable informatique (EX-ADM-030) | Responsable informatique | RG-ADM-01 | Non vérifié |
| Messagerie | Chiffrer le mot de passe de la messagerie et ne jamais le réafficher (EX-ADM-031) | Système | RG-ADM-04 | Non vérifié |
| Paramètres | Régler l'adresse du serveur de temps et le fuseau de l'institution (EX-ADM-032) | Responsable informatique | EX-TRA-020 | À construire |
| Paramètres | Gérer les référentiels sans toucher au code : types d'entité, de réunion, jours fériés, types de livrable (EX-ADM-033) | Responsable informatique | RG-ADM-10 | Partiel |
| Paramètres | Réserver l'ajout d'une valeur d'un référentiel fermé à son gestionnaire (EX-ADM-034) | Système | RG-ADM-10 | Non vérifié |
| Journal | Journaliser tout acte d'administration, avec auteur et date, et n'y écrire aucun contenu de dossier RH (EX-ADM-040, EX-ADM-041) | Système | RG-ADM-07, RG-ADM-09 | Non vérifié |
| Journal | Filtrer le journal par acteur, genre d'acte et date (EX-ADM-042) | Administrateur système | RG-ADM-07 | Non vérifié |
| Journal | Exporter le journal (EX-ADM-043) | Administrateur système | RG-ADM-07 | Non vérifié |
| Journal | Ne jamais retirer un genre d'acte de la liste des actes journalisés (EX-ADM-044) | Système | RG-ADM-08 | Non vérifié |

### Ce qui manque aujourd'hui

Sur vingt-sept exigences, treize ont été confrontées : aucune n'est tenue, quatre le sont en partie, huit ne le sont pas, une n'existe pas. Une demande d'accès peut être approuvée, jamais refusée : la route existe, aucun bouton ne la porte ; la personne n'est pas avertie, et la demande reste en attente indéfiniment. Le profil Lecture seule n'a aucun des cinquante-huit droits, donc aucun des dix modules de suivi : quelqu'un à qui l'on a ouvert l'outil pour qu'il suive n'a rien à suivre. Le détenteur du droit de gestion des profils peut ajouter à son propre profil n'importe lequel des cinquante-huit droits ; la journalisation et le signalement de cet acte à qui relit le journal ne sont pas établis. La matrice des droits, outil quotidien du responsable informatique, n'a ni recherche, ni filtre, ni en-tête figé ; vérifier puis changer un droit coûte deux écrans et six clics. Il n'existe aucune horloge de référence ni aucun fuseau configurable, et plusieurs valeurs de référentiel manquent. Quatorze exigences ne sont pas vérifiées, parmi lesquelles le journal lui-même, dont dépend la confiance qu'on peut avoir dans tout le reste.

## Module Coéquipiers IA

L'Agence accepte des coéquipiers IA à une condition, qui est la règle de l'outil : l'IA propose, un humain décide. Une proposition n'a aucun effet avant la validation d'un humain. L'IA lit avec les droits de la personne qui la lance, jamais plus ; elle n'agit jamais comme une personne et n'occupe aucune fonction humaine : ni signataire, ni chargé d'exécution, ni rapporteur, ni intervenant, ni décideur. Le module tient ce que l'IA propose, ce qui attend une validation, les règles d'automatisation qui la déclenchent et les exécutions qui en résultent.

Dans une institution où l'écrit fait foi, deux conséquences en découlent. Une proposition qui attend un décideur qu'elle n'a pas ne doit pas rester en suspens pour toujours : elle expire, libère la tâche et prévient. Une validation humaine ne s'inscrit jamais au journal avant que l'action ait réellement eu lieu : une approbation inscrite à tort est pire que pas d'approbation du tout.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Personne qui lance | Demande une intervention ; l'IA lit avec ses droits, jamais plus |
| Approbateur | Valide ou refuse une proposition ; n'est jamais la personne visée par elle |
| Auteur d'une règle | Écrit la consigne ; la règle s'exécute sous ses droits |
| Chef de projet | Est prévenu quand une proposition n'a aucun décideur |
| Responsable informatique | Administre les règles et le fournisseur |
| Coéquipier IA | Propose ; n'agit jamais comme une personne |

### Le cycle de vie

Une intervention, lancée par une personne ou déclenchée par une règle, produit une proposition. Si aucun décideur n'est possible, aucune attente n'est ouverte et le chef de projet est prévenu. Sinon la proposition attend un approbateur, qui ne peut être la personne qu'elle vise. Approuvée, elle est exécutée, attribuée à l'approbateur avec la mention qu'elle a été proposée par un coéquipier IA, et seulement alors journalisée. Refusée, elle arrête l'intervention. Au bout d'un délai défini, une attente expire : la tâche est libérée et le demandeur est prévenu.

```
INTERVENTION --> PROPOSITION --> EN ATTENTE --> APPROUVEE --> EXECUTEE --> JOURNALISEE
                      |              |
                      |              +--> REFUSEE (arrete l'intervention)
                      |              +--> EXPIREE (delai ; tache liberee ; demandeur prevenu)
                      |
                      +-- aucun decideur possible : pas d'attente ouverte ; le chef de projet est prevenu
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-IA-01 | Une proposition de l'IA n'a d'effet qu'après validation humaine. | Fonctionnement de l'Agence |
| RG-IA-02 | L'IA lit avec les droits de la personne qui la lance, jamais plus. | Fonctionnement de l'Agence |
| RG-IA-03 | L'IA n'agit jamais comme une personne. | Fonctionnement de l'Agence |
| RG-IA-04 | L'IA n'occupe aucune fonction humaine : ni signataire, ni chargé d'exécution, ni rapporteur, ni décideur. | Fonctionnement de l'Agence |
| RG-IA-05 | La personne visée par une proposition ne la valide pas. | Fonctionnement de l'Agence |
| RG-IA-06 | Une proposition sans décideur possible n'ouvre pas d'attente. | Métier |
| RG-IA-07 | Une attente expire au bout d'un délai défini. | Métier |
| RG-IA-08 | Une règle s'exécute sous les droits de qui a écrit sa consigne en vigueur. | Qualité |
| RG-IA-09 | Un refus arrête l'intervention. | Fonctionnement de l'Agence |
| RG-IA-10 | Le journal n'enregistre que ce qui a été exécuté. | Qualité |
| RG-IA-11 | L'IA demande la permission avant chaque lecture envoyée à un service extérieur. | Fonctionnement de l'Agence |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Coéquipiers IA | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Validation humaine | Attendre la validation d'un humain avant toute écriture proposée par un coéquipier IA (EX-IA-001) | Approbateur | RG-IA-01 | Non vérifié |
| Validation humaine | N'inscrire approuvée au journal qu'après l'exécution de l'action (EX-IA-002) | Système | RG-IA-10 | À corriger |
| Validation humaine | Refuser, avec un motif, l'approbation d'une proposition dont l'attente n'existe plus, sans écrire ni journaliser (EX-IA-003, EX-IA-004) | Système | RG-IA-10 | À corriger |
| Validation humaine | Refuser qu'une personne valide une proposition qui la vise (EX-IA-005) | Système | RG-IA-05 | Non vérifié |
| Validation humaine | Recalculer les décideurs d'une proposition modifiée avant sa validation (EX-IA-006) | Système | RG-IA-05 | Non vérifié |
| Validation humaine | Arrêter l'intervention quand la proposition est refusée (EX-IA-007) | Système | RG-IA-09 | Non vérifié |
| Validation humaine | Attribuer toute écriture issue d'une validation à l'approbateur, avec la mention de la proposition par un coéquipier IA (EX-IA-008) | Système | RG-IA-03 | Non vérifié |
| Sans décideur | Ne pas ouvrir d'attente pour une proposition sans décideur possible (EX-IA-010) | Système | RG-IA-06 | À corriger |
| Sans décideur | Prévenir le chef du projet quand une proposition n'a aucun décideur possible (EX-IA-011) | Système | RG-IA-06 | À corriger |
| Expiration | Faire expirer une attente au bout d'un délai défini (EX-IA-012) | Système | RG-IA-07 | À corriger |
| Expiration | Libérer la tâche à l'expiration d'une attente (EX-IA-013) | Système | RG-IA-07 | À corriger |
| Expiration | Informer le demandeur quand une attente expire (EX-IA-014) | Système | RG-IA-07 | Non vérifié |
| Expiration | Dire pourquoi une intervention n'a pas pu démarrer (EX-IA-015) | Système | RG-IA-07 | À corriger |
| Règles | Exécuter une règle sous les droits de qui a écrit sa consigne en vigueur et réaffecter l'auteur à celui qui la modifie (EX-IA-020, EX-IA-021) | Auteur d'une règle | RG-IA-08 | À corriger |
| Règles | Exiger de l'éditeur d'une règle le droit que la règle fait exercer (EX-IA-022) | Système | RG-IA-08 | À corriger |
| Règles | Journaliser la création et la modification d'une règle, consigne avant et après (EX-IA-023) | Système | EX-TRA-007 | À corriger |
| Limites | Refuser qu'un coéquipier IA tienne une fonction humaine (EX-IA-030) | Système | RG-IA-04 | Non vérifié |
| Limites | Limiter la lecture d'un coéquipier IA aux droits de la personne qui le lance (EX-IA-031) | Système | RG-IA-02 | Non vérifié |
| Limites | Demander la permission avant chaque lecture envoyée à un service extérieur (EX-IA-032) | Personne qui lance | RG-IA-11 | Non vérifié |
| Limites | Chiffrer la clé du fournisseur d'IA et ne jamais la réafficher (EX-IA-033) | Système | RG-IA-11 | Non vérifié |
| Consultation | Appliquer le filtre des projets lisibles avant la limite de pagination des exécutions (EX-IA-040) | Système | RG-IA-02 | À corriger |
| Consultation | Présenter à une personne les exécutions des projets qu'elle lit (EX-IA-041) | Tout agent | RG-IA-02 | Non vérifié |

### Ce qui manque aujourd'hui

Treize exigences ont été confrontées sur vingt-quatre, et treize ne sont pas tenues : c'est le module où le constat est le plus net, aucune exigence vérifiée n'y est tenue. La règle fondatrice, que le journal ne dise que le vrai, est violée : une approbation est inscrite au journal avant que le système cherche l'attente en mémoire ; si elle n'existe plus après un redémarrage, la ligne devient expirée et la réponse est un succès. Une proposition sans décideur attend indéfiniment et verrouille la tâche, qui est alors fermée à toute nouvelle intervention ; personne n'est prévenu quand la liste des approbateurs est vide, et le démarrage d'une intervention refusée ne dit pas pourquoi, si bien que les règles qui s'y déclenchent échouent sans bruit. Une règle modifiée garde les droits de son premier auteur ; un administrateur de projet sans le droit de déléguer à l'IA peut réécrire la consigne ; la création et la modification d'une règle ne sont pas journalisées. Enfin le filtre des projets lisibles s'applique après la pagination : un agent dont les projets sont peu actifs ne voit aucune exécution. Onze exigences ne sont pas vérifiées, dont l'interdiction faite à l'IA de tenir une fonction humaine, qui est pourtant la règle de la maison.

## Module Documents

L'Agence travaille sur l'acte écrit, numéroté, daté, signé, classé, et le module Documents tient les pièces que tous les autres manipulent : les documents déposés dans un dossier, un partenaire, un accord, un courrier ou une réunion ; les modèles à partir desquels le système génère un document ; les archives, où l'écrit validé est conservé ; les exports des registres. Le secrétariat de direction y finalise les sortants et classe ; la direction générale y consulte les archives.

Le module garantit trois choses. Un document validé ou signé est figé et ne se supprime pas. L'accès à un document suit celui de l'objet qui le porte : qui ne peut pas lire le dossier ne lit pas ses pièces, et qui n'a aucun droit d'écriture sur lui n'y dépose rien. Enfin on produit un document à partir d'un modèle plutôt que de le retaper : on dépose le modèle avec ses en-têtes, la personne saisit les informations variables, le système génère. Le module est aussi le lieu des actes d'amont du conseil d'administration : états financiers approuvés, budget arrêté, cadre organique entrent comme documents de référence, jamais comme délibérations. Les annexes volumineuses du courrier sont reportées par le maître d'ouvrage et ne sont pas spécifiées ici.

### Les acteurs du module

<!-- fiche -->
| Acteur | Rôle dans le module |
|---|---|
| Déposant | Dépose une pièce dans l'objet où il tient un rôle d'écriture |
| Lecteur | Lit les pièces de l'objet qu'il a le droit de lire |
| Gestionnaire des modèles | Dépose et met à jour les modèles et leurs en-têtes |
| Secrétariat de direction | Finalise un sortant, numérote, imprime, classe |
| Direction générale | Consulte les archives ; signe |
| Tout agent concerné | Génère un document à partir d'un modèle |

### Le cycle de vie

Un document est déposé dans un objet porteur et décrit par son type, ses dates de production et d'expiration, sa référence. S'il est remplacé, l'ancienne version est conservée. Validé ou signé, il est figé, puis classé : le registre dit alors qui l'a classé et à quel dossier il se rattache. Un modèle suit un autre chemin : on le dépose, la personne saisit ses champs, le document est généré, puis il entre dans le circuit du signataire. Les archives forment un registre unique, que le secrétariat, la direction générale et le projet consultent chacun sous leur vue.

```
DEPOSE --> (decrit : type, dates, reference) --> VALIDE / SIGNE --> FIGE --> CLASSE (archive)
   |                                                                            |
   +-- remplace : l'ancienne version est conservee         qui l'a classe, a quel dossier

MODELE --> saisie des champs --> DOCUMENT GENERE --> circuit du signataire
```

### Les règles de gestion

<!-- matrice -->
| N° | Règle | Origine |
|---|---|---|
| RG-DOC-01 | Un document est rangé dans un objet porteur et décrit par un type. | Fonctionnement de l'Agence |
| RG-DOC-02 | L'accès à un document suit celui de son objet porteur. | Qualité |
| RG-DOC-03 | Un document validé ou signé est figé. | Fonctionnement de l'Agence |
| RG-DOC-04 | On dépose un modèle avec ses en-têtes ; la personne saisit ; le système génère. | Fonctionnement de l'Agence |
| RG-DOC-05 | La finalisation d'un sortant, numéro et impression, revient au secrétariat. | Fonctionnement de l'Agence |
| RG-DOC-06 | Un registre archivé est unique ; secrétariat, direction générale et projet en sont des vues. | Fonctionnement de l'Agence |
| RG-DOC-07 | Un export est tracé et ne contient rien qui soit masqué à la vue. | Qualité |
| RG-DOC-08 | Les actes d'amont du conseil entrent comme documents de référence ; leur délibération reste hors du système. | Loi |

### Le tableau des fonctions

<!-- matrice -->
| @@ Module Documents | | | | |
|---|---|---|---|---|
| Sous-module | Fonction | Acteurs | Règle appliquée | État |
| Pièces | Ranger tout document dans un seul objet porteur et le décrire par un type d'un référentiel (EX-DOC-001, EX-DOC-002) | Déposant | RG-DOC-01 | Non vérifié |
| Pièces | Renseigner la date de production, la date d'expiration et la référence ; signaler les documents expirés (EX-DOC-003, EX-DOC-004) | Déposant | RG-DOC-01 | Non vérifié |
| Pièces | Appliquer à un document le droit de lecture de son objet porteur (EX-DOC-005) | Système | RG-DOC-02 | Non vérifié |
| Pièces | Refuser le dépôt à toute personne sans droit d'écriture sur l'objet porteur (EX-DOC-006) | Système | RG-DOC-02 | À corriger |
| Pièces | Ne jamais renvoyer le contenu binaire d'un document dans une liste (EX-DOC-007) | Système | RG-DOC-02 | Non vérifié |
| Pièces | Permettre l'aperçu d'un document PDF, image, Word, Excel ou texte sans le télécharger (EX-DOC-008) | Lecteur | RG-DOC-02 | Non vérifié |
| Pièces | Conserver l'ancienne version d'un document remplacé (EX-DOC-009) | Système | RG-DOC-03 | Non vérifié |
| Pièces | Figer un document dès qu'il est validé ou signé, et refuser la suppression d'un document signé (EX-DOC-010, EX-DOC-011) | Système | RG-DOC-03 | Non vérifié |
| Modèles | Déposer un modèle de document avec ses en-têtes (EX-DOC-020) | Gestionnaire des modèles | RG-DOC-04 | À construire |
| Modèles | Saisir les informations variables d'un modèle dans des champs (EX-DOC-021) | Tout agent concerné | RG-DOC-04 | À construire |
| Modèles | Générer un document à partir d'un modèle et des informations saisies (EX-DOC-022) | Tout agent concerné | RG-DOC-04 | À construire |
| Modèles | Réserver la gestion des modèles à leurs gestionnaires (EX-DOC-023) | Système | RG-DOC-04 | Non vérifié |
| Modèles | Offrir la génération à tout module qui produit un document : courrier, convention, note (EX-DOC-024) | Tout agent concerné | RG-DOC-04 | Non vérifié |
| Modèles | Réserver au secrétariat la finalisation d'un sortant généré (EX-DOC-025) | Secrétariat de direction | RG-DOC-05 | À construire |
| Exports | Exporter les registres en Excel, PDF, Word ou CSV, dans la charte de l'Agence (EX-DOC-030) | Tout utilisateur du registre | RG-DOC-07 | Non vérifié |
| Exports | Journaliser chaque export (EX-DOC-031) | Système | RG-DOC-07 | Non vérifié |
| Exports | Neutraliser toute formule contenue dans une cellule exportée (EX-DOC-032) | Système | RG-DOC-07 | Non vérifié |
| Exports | N'écrire dans un export aucune donnée masquée à la vue (EX-DOC-033) | Système | RG-DOC-07 | Non vérifié |
| Archives | Tenir un registre unique des documents archivés, avec qui a classé et à quel dossier (EX-DOC-040) | Secrétariat de direction | RG-DOC-06 | Partiel |
| Archives | Présenter les archives en trois vues, secrétariat, direction générale, projet, d'un même registre (EX-DOC-041) | Secrétariat, direction | RG-DOC-06 | À construire |
| Documents de référence | Conserver les états financiers approuvés comme document de référence (EX-DOC-050) | Direction générale | RG-DOC-08 | À construire |
| Documents de référence | Conserver le budget arrêté comme cadre d'exécution consultable (EX-DOC-051) | Direction générale | RG-DOC-08 | À construire |
| Documents de référence | Consulter le cadre organique dans l'outil, sous réserve de la décision du maître d'ouvrage (EX-DOC-052) | Tout agent | RG-DOC-08 | À construire |

### Ce qui manque aujourd'hui

Sur vingt-six exigences, dix ont été confrontées : aucune n'est tenue, une l'est en partie, une ne l'est pas, huit n'existent pas. Ce module est celui où l'on trouve le plus d'absences nettes : aucun modèle de document n'existe, donc ni dépôt de modèle, ni champs, ni génération, et la finalisation d'un sortant n'est pas un rôle du secrétariat. Les courriers se classent, mais sans registre unifié ni rattachement explicite, et les trois archives dont l'Agence parle ne sont pas les vues d'un même registre. Aucun état financier approuvé, aucun budget arrêté n'entre comme document de référence ; l'outil ignore le cadre organique. Ce qui existe est fragile : un compte en lecture seule a déposé un document dans un dossier de projet et le serveur a répondu que tout allait bien, parce qu'aucune règle d'écriture n'existe sur les documents de dossier. Seize exigences ne sont pas vérifiées, dont la plus grave pour un registre d'actes : on ne sait pas si un document signé est vraiment figé et protégé de la suppression, ni si un export respecte les masques de la vue.

---

# Partie C — Architecture technique, qualité et trajectoire

Arrêtée le 25 novembre 2026. Cette partie dit comment le système est construit, comment on vérifie qu'il tient, et selon quel calendrier il sera livré. Elle distingue partout ce qui existe aujourd'hui de ce qui est visé : une cible n'est jamais présentée comme un état.

## 1. Architecture technique

### 1.1 La pile et ses raisons

La pile est celle du dépôt, sans ajout prévu pour la livraison du 13 février 2027.

<!-- matrice -->
| Couche | Technologie | Rôle | Pourquoi ce choix |
|---|---|---|---|
| @@ La pile employée | | | |
| Exécution | Node.js 22.5 ou plus | Serveur et outils du chantier | Un seul langage, TypeScript, du serveur à l'interface ; le même contrôle de types des deux côtés |
| Serveur | Fastify 5 | Routes, validation, sessions par témoin | Léger, rapide sur matériel modeste, routes déclaratives qu'un test peut balayer |
| Base de données | PostgreSQL | Registre de toutes les données | Transactions et contraintes d'intégrité : un registre ne tolère ni doublon ni demi-écriture |
| Base locale | PGlite | Même moteur, embarqué | Poste de développement, tests et installation autonome sans serveur de base à administrer |
| Base hébergée | Supabase | PostgreSQL en production | Même dialecte que la base locale : aucune réécriture entre les deux |
| Interface | React 19 | Écrans et briques | Composition : une brique s'écrit une fois et se rappelle partout |
| Construction | Vite | Compilation de l'interface | Démarrage et reconstruction rapides |
| Style | Tailwind | Jetons et classes utilitaires | Les jetons du système de design deviennent les seules valeurs permises |
| Tests | Vitest, axe-core, Playwright | Tests serveur, audit d'accessibilité, parcours | Une commande par famille de preuve |

Le dépôt est un espace de travail à deux paquets, serveur et interface. Une migration numérotée décrit chaque évolution du schéma ; 58 fichiers de migration existent aujourd'hui. L'isolation par organisation est doublée par la sécurité au niveau de la ligne de PostgreSQL, posée par la deuxième migration.

### 1.2 Le découpage serveur et interface

Le serveur porte les règles ; l'interface les présente. Aucune règle de gestion ne vit seulement dans l'interface.

- Le serveur est organisé par domaine : un fichier de règles et un fichier de routes par domaine (activités, accords, décisions, réunions, partenaires, plans, registres, référentiels, attributions, documents de dossier). Les règles ne connaissent pas HTTP ; les routes ne contiennent pas de règle.
- Les services transverses sont isolés : authentification et second facteur, droits, journal d'audit, notifications et bus d'événements, rappels, messagerie, chiffrement des secrets, garde réseau, limites d'usage, coéquipiers IA et leur moteur de validation.
- L'interface comprend les pages (un écran par module), les composants (briques, gabarits de collection, formulaires, tiroirs) et une bibliothèque de fonctions : appels au serveur, formats, référentiels, jetons.
- Un jeu d'essai de démonstration alimente les installations locales ; aucune donnée réelle de l'Agence n'entre dans le dépôt.

### 1.3 Le schéma des couches

```
+------------------------------------------------------------------+
|  NAVIGATEUR  (bureau, tablette, téléphone)                       |
|  Pages --> Briques (Button, Field, Input, Select, DataTable...)  |
|            Jetons : couleurs, 12 tailles, 6 rayons, 3 surfaces   |
|  Ne propose que ce que le serveur accepte (droits lus du serveur)|
+------------------------------+-----------------------------------+
                               |  HTTPS, témoin de session
+------------------------------v-----------------------------------+
|  SERVEUR FASTIFY                                                 |
|  1. Session et second facteur                                    |
|  2. Contrôle du droit (catalogue de 58 droits)                   |
|  3. Règles de gestion par domaine                                |
|  4. Masques de confidentialité (liste, fiche, notification,      |
|     retour d'écriture, export)                                   |
|  5. Journal des actes (137 genres)                               |
|  6. Notifications, rappels, messagerie sortante                  |
+------------------------------+-----------------------------------+
        |                      |                       |
+-------v------+   +-----------v-----------+   +-------v----------+
| POSTGRESQL   |   | COÉQUIPIERS IA        |   | SOURCES EXTERNES |
| (PGlite en   |   | proposent seulement ; |   | serveur de temps,|
| local,       |   | un humain décide      |   | messagerie SMTP  |
| Supabase en  |   | (validation humaine)  |   |                  |
| production)  |   +-----------------------+   +------------------+
| sécurité au  |
| niveau ligne |
+--------------+
```

### 1.4 Le contrat d'accès

Le contrat d'accès est le test qui interdit au serveur de laisser passer. Il s'applique à toutes les routes déclarées.

<!-- fiche -->
| Élément | Mesure |
|---|---|
| Routes sous contrat | 322 |
| Profils éprouvés | 4, chacun contre chaque route |
| Épreuve d'erreur | Aucune route ne répond par une erreur 500, quelle que soit l'entrée |
| Droits du catalogue | 58 ; chacun est soit consulté par l'interface, soit couvert par une exception écrite et justifiée |
| Genres d'actes journalisés | 137 ; la liste s'allonge, elle ne raccourcit pas |
| Règle de tenue | Toute route nouvelle est déclarée dans le contrat avant d'exister ; le nombre de tests ne baisse jamais |

Les droits du catalogue sont portés par des profils d'accès. Une personne reçoit un profil, et le serveur vérifie le droit avant tout acte, quelle que soit la voie d'appel. Un droit de consultation ouvre l'accès à son module au même titre qu'un droit d'action.

### 1.5 Le journal des actes

Tout acte qui engage l'Agence, modifie un droit, lève une confidentialité ou change un responsable est inscrit au journal avec son auteur, sa date, et les valeurs avant et après lorsqu'elles existent. Le journal n'inscrit qu'un acte effectivement exécuté : une validation refusée ou expirée n'y figure pas comme approuvée.

Deux défauts constatés le 25 novembre en montrent l'enjeu. Une validation humaine est aujourd'hui journalisée comme approuvée puis marquée expirée sans exécution. La modification d'une activité n'est pas journalisée, levée de confidentialité comprise. Ils sont traités en phase 2 du plan.

## 2. Modèle de données

Le schéma compte une centaine de tables. Cette partie en décrit les familles. Toute table porte l'identifiant de son organisation ; tout acte engageant porte son auteur et sa date. Un document validé est figé : il ne se modifie plus, il se remplace par un acte daté.

### 2.1 Organisation, personnes et profils

<!-- matrice -->
| Entité | Ce qu'elle porte | À quoi elle se rattache | Règle de cycle de vie |
|---|---|---|---|
| @@ Organisation, personnes et profils | | | |
| Organisation | Le périmètre étanche : toutes les données d'un ensemble d'entités | Rien au-dessus | Créée à l'installation ; jamais supprimée tant qu'elle porte des actes |
| Entité d'organisation | Direction générale, service rattaché, direction centrale, pool, antenne ; son chef, son fuseau | Une entité parente, une organisation | Un chef par entité, avec un intérim daté ; le type pool et la fonction de directeur de pool sont à ajouter |
| Personne (agent) | Identité, fonction, fiche d'agent, diplômes, formations, évaluations | Une ou plusieurs entités par affectation | Recrutée, affectée, dotée d'accès ; une sortie s'annule avec motif et au journal |
| Profil d'accès | Un ensemble de droits du catalogue | Des personnes | Le catalogue ne porte qu'un profil de directeur général adjoint : il n'y en a qu'un |
| Congé | Dates, solde, nature, motif | Un agent, un décideur | Demandé, décidé, pris ; la nature et le motif d'une maladie ne se lisent que par l'agent et les ressources humaines |
| Délégation | Délégant, délégataire, bornes de dates, étendue | Deux personnes | Ouverte et fermée aux dates fixées ; mentionnée sur l'acte signé |

### 2.2 Courrier, réunions et décisions

<!-- matrice -->
| Entité | Ce qu'elle porte | À quoi elle se rattache | Règle de cycle de vie |
|---|---|---|---|
| @@ Courrier, réunions et décisions | | | |
| Courrier | Numéro, sens, correspondant, objet, date de survenance, étiquette, annotation de la direction générale | Une série et un exercice | Enregistré une fois, vu partout ; un courrier, plusieurs états |
| Acheminement | Destinataire, mention pour traitement ou pour information, état propre | Un courrier, une personne, une entité | Reçu, imputé, traité, classé ; aucun état sans sortie |
| Document à signer et ses étapes | Pièce, signataire, circuit, historique des étapes | Un courrier ou un livrable | Déposé, signé ou refusé ; une fois signé, figé |
| Réunion | Type, date, ordre du jour, présents, rapporteur, intervenants | Une entité, éventuellement des partenaires | Programmée, tenue, close ; un compte rendu y est rattaché |
| Compte rendu | Texte, amendements, modifications consignées | Une réunion | Adopté collégialement à la séance suivante, par le rapporteur ; figé après adoption |
| Décision de la direction générale | Objet, date, exécutant, échéance | Une réunion, un courrier ou une résolution | Prise, exécution déclarée, confirmée ; le confirmant reste à décider |
| Résolution du conseil d'administration | Texte et référence de l'acte d'amont | Une décision ou une charge à suivre | À créer : aujourd'hui rien ne reçoit les actes d'amont |

### 2.3 Plans, activités, livrables, contrats et tâches

<!-- matrice -->
| Entité | Ce qu'elle porte | À quoi elle se rattache | Règle de cycle de vie |
|---|---|---|---|
| @@ Plans, activités, livrables, contrats et tâches | | | |
| Plan de travail | Activités, échéances, révisions | Une entité | Préparé, soumis, approuvé, suivi ; l'écran nomme qui peut l'approuver |
| Activité | Forme (projet interne, projet confié, commission, conférence, rendez-vous, interne), responsable, santé, confidentialité | Un plan, une entité | Toute modification est journalisée, avec valeurs avant et après pour la confidentialité, le responsable et la santé |
| Projet | Équipe, budget, sections, jalons | Une activité | Ouvert à l'équipe choisie, à personne si aucune ; budget masqué hors des rôles autorisés |
| Livrable | Type, échéance, pièce, événements | Un projet ou un contrat | Aucune remise sans pièce ; aucun paiement sans livrable remis |
| Contrat de mission | Consultant, montant, période | Un projet | Lisible seulement par les personnes que le projet concerne |
| Tâche | Responsable, échéance, report, commentaires | Un projet, une réunion ou un courrier | Une seule brique, quelle que soit l'origine ; les reports sont tracés |
| Risque et indicateur | Probabilité, gravité, parade, valeurs, historique | Un projet ou une entité | Évalué, suivi, clos ; l'échéance de la parade est affichée |

### 2.4 Partenaires, accords, documents et coéquipiers IA

<!-- matrice -->
| Entité | Ce qu'elle porte | À quoi elle se rattache | Règle de cycle de vie |
|---|---|---|---|
| @@ Partenaires, accords, documents et coéquipiers IA | | | |
| Partenaire | Catégorie, points focaux, contacts, historique | L'organisation | Fusionnable, sans toucher aux accords en vigueur |
| Accord | Parties, signataire, avenants, échéance | Un ou plusieurs partenaires | Résilié seulement après règlement du sort de ses avenants en cours |
| Document de dossier | Pièce, version, rôle d'accès | Un projet, un accord ou un dossier | Lisible sous le rôle tenu sur le projet ; états financiers approuvés et budget arrêté conservés comme références |
| Pièce jointe | Fichier, taille, type | Une tâche, un courrier ou un livrable | Aperçu en lecture ; limite par fichier à décider avec les annexes, reportées |
| Exécution et validation IA | Étapes, proposition, décideur | Une règle d'automatisation, un décideur | Propose seulement ; sans décideur possible, elle expire, prévient et libère la tâche |
| Règle d'automatisation | Consigne, déclencheur | Une personne auteur | S'exécute sous les droits de l'auteur de la consigne en vigueur |

### 2.5 Le schéma des relations principales

```
Organisation
  |-- Entité (parente) --< Entité (pool, direction, service)
  |        |                    |
  |        |                    +--< Personne --- Profil --< Droit (58)
  |        |                              |
  |        |                              +--< Congé, Délégation, Affectation
  |        |
  |        +--< Plan de travail --< Activité --- Projet --< Tâche
  |                                     |           |
  |                                     |           +--< Livrable --- Pièce
  |                                     |           +--< Contrat de mission
  |                                     +--< Risque, Indicateur
  |
  |-- Courrier --< Acheminement >-- Personne / Entité
  |      |--< Document à signer --< Étape (signataire)
  |      +--< Tâche créée par l'imputation
  |
  |-- Réunion --< Compte rendu (adopté à la séance suivante)
  |      |--< Décision --< Exécution (confirmée)
  |      +--< Action --> Tâche
  |
  |-- Partenaire --< Accord --< Avenant
  |
  +-- Journal des actes (137 genres) : référence tous les objets ci-dessus
```

## 3. Le temps et le fonctionnement hors connexion

C'est la pièce la plus délicate du système, parce que l'Agence travaille sur registres : un numéro dupliqué ou une date fausse sont des fautes de registre, non des défauts d'affichage. L'état actuel est le suivant : aucune horloge de référence, aucun fuseau configuré, et le fonctionnement hors connexion n'est pas traité. Les exigences correspondantes sont toutes absentes. Ce chapitre décrit la cible, livrée en phase 5, qui conditionne tout le courrier.

### 3.1 L'heure vérifiée

Quand une connexion existe, le système vérifie l'heure auprès d'une source de temps sûre et ne se fie jamais à la seule horloge de la machine. L'écart constaté entre la machine et la source est conservé. Une machine dont l'horloge a été avancée ou reculée à la main ne fausse donc aucun acte.

### 3.2 Le plancher qui ne recule pas

Le système conserve un temps de référence : le dernier instant vérifié. Hors connexion, il repart de ce temps de référence, augmenté du temps écoulé mesuré par une horloge monotone, qui ne recule pas. Si l'horloge de la machine indique un instant antérieur au plancher, le système refuse le recul, garde le plancher et journalise l'écart constaté. L'enregistrement d'un acte à une date antérieure à celle du jour avertit la personne et laisse une trace au journal : l'antidatage n'est plus silencieux.

### 3.3 Les deux fuseaux de la RDC

Les dates et les heures se calculent dans le fuseau de l'entité concernée : UTC+1 à Kinshasa, UTC+2 à Lubumbashi. Le fuseau est porté par l'institution et, au besoin, par l'entité. Un acte est daté de sa survenance, non de sa saisie. L'UTC brut n'est jamais affiché ni utilisé pour décider qu'un acte appartient à tel jour ou tel exercice. Le fuseau fixe, à lui seul, l'exercice d'un acte enregistré à la limite du 31 décembre.

### 3.4 Le rang déduit de l'exercice

Le rang d'un acte se déduit de son exercice au moment de l'enregistrement. Il n'existe aucun traitement planifié à déclencher au changement d'année, donc aucun à manquer. Une insertion entre deux rangs existants se fait par un numéro secondaire suffixé. Aujourd'hui le rang est calculé et non stocké, et aucune insertion n'est possible.

### 3.5 L'unicité entre postes hors connexion

Deux enregistrements effectués hors connexion sur deux postes distincts n'obtiennent jamais le même numéro. Le mécanisme n'est pas arrêté : c'est la décision D1, la plus urgente du projet, nécessaire avant le 15 décembre 2026. Elle commande la structure du numéro, donc le modèle de données du courrier. Deux familles de réponse se présentent, sans que le choix soit fait : réserver à chaque poste une plage de numéros, ou attribuer le numéro définitif à la synchronisation en n'affichant qu'un numéro provisoire entre-temps. Chacune a un coût d'usage que le maître d'ouvrage doit arbitrer.

### 3.6 Le récapitulatif unique au redémarrage

Après une interruption, le système affiche la durée de l'interruption et l'écart d'horloge constaté. Il émet un seul récapitulatif par personne, au lieu de rejouer deux mois de relances échues. Les rappels déjà envoyés sont mémorisés pour ne pas être répétés.

## 4. Sécurité et confidentialité

### 4.1 Les quatre règles

- Le serveur juge. Il vérifie tout droit avant d'exécuter un acte, quelle que soit la voie d'appel : écran, interface de programmation ou coéquipier IA.
- L'interface ne propose pas l'impossible. Une liste de choix ne présente que des valeurs que le serveur acceptera. Aujourd'hui, 29 % des choix du sélecteur de chef d'entité mènent à un refus.
- Une donnée masquée l'est par toutes les voies : liste, fiche, notification, valeur de retour d'écriture, export. Une notification ne révèle rien que son destinataire n'a pas le droit de lire, titre compris.
- Un acte engageant est journalisé, avec son auteur, sa date et les valeurs avant et après.

### 4.2 Les données à protection particulière

<!-- matrice -->
| Donnée | Qui peut la lire | Voies à fermer | État constaté |
|---|---|---|---|
| @@ Les données protégées | | | |
| Motif et nature d'un congé de maladie (secret médical) | L'agent concerné et le service des ressources humaines | Notifications, retours d'écriture, listes, exports | Le masque ne couvre pas les notifications ni les retours d'écriture ; correction en phase 1 |
| Contrat de mission | Les personnes que le projet concerne | Liste des contrats, fiche du consultant, export | Lecture à resserrer ; correction en phase 1 |
| Budget de projet et ses raisons | Les rôles autorisés sur le projet | Revue, santé des projets, demande d'arbitrage | Les raisons sortent par la route de santé des projets ; un seul masque, appelé par la revue et la santé, en phase 1 |
| Documents de dossier | Le rôle tenu sur le projet | Liste, aperçu, téléchargement | À placer sous le rôle tenu sur le projet ; phase 1 |
| Demande d'arbitrage | Ceux qui peuvent ouvrir le dossier | Destinataires de la notification | Une demande nomme le dossier à qui ne peut pas l'ouvrir ; phase 1 |

### 4.3 Les autres protections

- Authentification par mot de passe, second facteur, jetons à usage unique, limitation des essais de connexion et événements de sécurité conservés.
- Secrets chiffrés au repos ; aucun secret dans le dépôt.
- Garde réseau sur les appels sortants.
- Sécurité au niveau de la ligne dans la base, en plus du contrôle du serveur.
- Un projet naît ouvert à l'équipe choisie, et à personne si aucune n'est choisie.
- L'intelligence artificielle propose, un humain décide : une proposition n'a d'effet qu'après validation humaine, et une règle d'automatisation s'exécute sous les droits de l'auteur de sa consigne en vigueur.

Une règle générale reste à créer sous forme de test : toute donnée masquée dans une liste l'est aussi dans les notifications et les réponses d'écriture, vérifié par balayage comme le contrat d'accès balaie les routes.

## 5. Exigences non fonctionnelles

<!-- matrice -->
| Exigence | Niveau visé | Critère de vérification | État |
|---|---|---|---|
| @@ Exigences non fonctionnelles | | | |
| Disponibilité | Consultation et enregistrement possibles sans connexion ; reprise sans perte | Scénario de coupure rejoué en recette ; récapitulatif unique au redémarrage | Non traité |
| Volumétrie | 192 agents, 9 provinces, 145 territoires, 6 pools | Jeu d'essai de la taille de l'Agence rejoué en recette | Jeu de démonstration seulement ; non mesuré à la taille réelle |
| Volume d'actes par an | Ordre de grandeur à établir avec le maître d'ouvrage avant la recette | Relevé du registre papier d'un exercice | Non établi ; aucun chiffre n'est avancé ici |
| Performance | Une action courante répond sans attente perceptible, sur liaison faible | Seuils à fixer à partir du jeu de taille réelle ; mesure en recette | Seuils non fixés ; non vérifié |
| Accessibilité | WCAG 2.1 niveau AA, thèmes clair et sombre, bureau et téléphone | Commande d'audit axe-core : zéro manquement | Tenue : zéro manquement mesuré le 25 novembre sur la branche principale |
| Langue | Interface, erreurs et documents produits en français ; vocabulaire de l'Agence | Relecture des libellés ; un terme désigne une seule chose | Non tenue : « signataire » employé 232 fois, « décision » désigne quatre objets |
| Navigateurs | Versions récentes des navigateurs courants, bureau et mobile | Parcours Playwright sur les navigateurs retenus | La liste des navigateurs reste à arrêter |
| Matériel modeste | Poste ancien, liaison lente ou intermittente | Poids des pages mesuré ; parcours sur poste de référence | Non mesuré |
| Maintenabilité | Une brique, un endroit ; aucune balise brute hors des briques | Test qui échoue si une balise brute réapparaît | 144 boutons et 91 champs hors des briques ; test à créer |
| Traçabilité | Tout acte engageant au journal | Contrat d'accès et balayage du journal | 137 genres journalisés ; deux défauts connus |

## 6. Interface et expérience

### 6.1 Le système de design

Le système de design, nommé Cadastre, fait foi pour tout nouvel écran. Son principe : une grille rigoureuse, des pièces numérotées, de la couleur seulement là où elle porte un sens.

<!-- fiche -->
| Élément | Règle |
|---|---|
| Jetons | Toutes les couleurs, tailles et rayons sont des jetons ; aucune valeur écrite en dur dans un composant |
| Trois surfaces | La carte posée dans la page, le dialogue centré, le panneau latéral ; aucune ne s'écrit à la main |
| Douze pas typographiques | De 11 à 52 px ; une taille hors tableau est une erreur |
| Six rayons | De 4 px à 16 px, plus le rond réservé aux statuts, avatars et pastilles |
| Une palette | Huit teintes ; le bleu de l'Agence pour l'action et l'identité, les couleurs d'état pour l'état, le violet réservé à l'intelligence artificielle |
| Hauteurs de commande | 32, 36 et 40 px ; deux commandes côte à côte ont la même hauteur |
| Couleur seule | Jamais : toujours un mot ou une icône ; tout couple texte et fond tient 4,5 pour 1 |
| Repères de registre | Numéros, dates, heures et montants en chasse fixe tabulaire, reconnus automatiquement |

### 6.2 Le principe des briques

Une fonctionnalité s'écrit une fois et s'appelle partout ; seuls le module et les droits varient. Chaque élément réutilisable est défini une fois, et son comportement ne varie ni selon le module ni selon l'écran. Seule l'accentuation d'un bouton varie avec l'insistance de l'action ; sa taille et sa forme ne varient pas. Cible : aucune balise de bouton, de champ, de liste de choix ou de zone de texte hors des fichiers de briques, et un test l'interdit.

### 6.3 Les règles de comportement

- Tout acte engageant répond. Un message écrit nomme ce qui vient de se passer. Quatre actes engageants sont muets aujourd'hui.
- Un échec affiche la raison donnée par le serveur et ce qu'il faut faire, et reste affiché jusqu'à ce que la personne le ferme.
- Rien ne se perd. Des champs modifiés ne se ferment pas sans confirmation, qu'il s'agisse d'un tiroir, d'une page ou d'une navigation. La règle est tenue pour le tiroir et l'éditeur de compte rendu, pas pour les autres formulaires de page.
- Un casier vide reste un casier. Une entrée du rail s'ouvre sur un droit de lecture ; une pastille dit ce qui attend ; une liste vide explique pourquoi elle l'est et ce qu'il faut faire.
- Tout écran auquel une personne a droit est atteignable depuis la navigation ou depuis la recherche. La recherche cherche ce qu'elle annonce et dit « aucun résultat » quand il n'y en a pas.
- Une liste unique de ce qu'on attend d'une personne, quelle que soit l'origine de la charge : tâche, action de réunion, courrier pour traitement, décision à exécuter.

### 6.4 Les trois coûts mesurés

<!-- matrice -->
| Parcours | Départ | Cible | Mesure |
|---|---|---|---|
| @@ Coût d'usage | | | |
| Replanifier sept tâches un lundi matin | 28 clics | Moins de 10 clics | Comptage des clics sur le parcours, avant et après |
| Déposer une note au signataire | 8 clics | Moins de 5 clics | Idem |
| Revue du matin de la direction générale | 7 écrans | 1 écran | Nombre d'écrans à ouvrir |

## 7. Recette et vérification

### 7.1 Les cinq séquences de référence

Elles se jouent de bout en bout, profil par profil, sans sortir de l'outil. Un profil qui doit sortir de l'outil pour finir sa séquence a fait échouer la recette.

<!-- matrice -->
| Séquence | Étapes | Profils joués | Fin attendue |
|---|---|---|---|
| @@ Les cinq séquences de référence | | | |
| Courrier | Reçu, imputé, traité, classé | Secrétariat, direction générale, chef d'entité, agent | Courrier classé, étiquette portée, chaque état propre à son porteur |
| Réunion | Programmée, tenue, compte rendu adopté, recommandation close | Rapporteur, intervenants, chef d'entité | Compte rendu adopté à la séance suivante, modifications consignées |
| Plan | Préparé, approuvé, suivi | Chef d'entité, direction générale | Plan approuvé par qui le devait, suivi visible |
| Livrable | Produit, remis avec sa pièce, validé, payé | Consultant référent, responsable de projet, direction générale | Aucun paiement sans pièce |
| Agent | Recruté, affecté, doté de ses accès | Ressources humaines, chef d'entité | Accès conformes au profil ; sortie annulable avec motif |

### 7.2 Le harnais

- Les tests automatisés du serveur, lancés par la commande de test du dépôt : 760 au 25 novembre 2026. Le nombre ne baisse jamais ; chaque lot en ajoute.
- L'audit d'accessibilité, lancé par sa commande propre : zéro manquement, dans les deux thèmes, en bureau et en téléphone.
- Le contrat d'accès : 322 routes, quatre profils, épreuve de l'erreur 500.
- La vérification des types sur les deux paquets, avant chaque validation de travail.
- Trois garanties à créer : les briques, les masques, les états sans sortie.
- Les testeurs reviennent en phase 11, un par profil, uniquement sur ce qui a été corrigé. Ils jugent l'expérience, non la conformité à l'existant.

Une règle de preuve prime : le rapport d'un agent n'est pas une preuve. Un lot est déclaré fini quand le diff est relu, les tests lancés et chaque case du critère de fin vérifiée.

### 7.3 Le tableau de bord à six chiffres

Les mêmes six chiffres, mesurés à chaque fin de sprint, pour qu'on voie la pente. Le projet est réussi quand tous sont à leur cible, non quand les 102 points sont cochés.

<!-- matrice -->
| Chiffre | Départ | Au 25 novembre 2026 | Cible |
|---|---|---|---|
| @@ Tableau de bord | | | |
| Points traités | 0 sur 102 | 0 sur 102 | 102 |
| Tests | 745 | 760 | Ne baisse jamais |
| Manquements WCAG | 0 | 0 | 0 |
| Clics pour replanifier sept tâches | 28 | 28 | Moins de 10 |
| Clics pour déposer une note au signataire | 8 | 8 | Moins de 5 |
| Écrans de la revue du matin de la direction générale | 7 | 7 | 1 |

## 8. Trajectoire

### 8.1 Les onze phases

Une phase 0 prépare le terrain ; onze phases numérotées de 1 à 11 suivent. Les 102 points constatés y sont répartis ; huit points hors chantier se traitent au fil de l'eau.

<!-- matrice -->
| Phase | Objet | Lots | Livrable |
|---|---|---|---|
| @@ Les phases du chantier | | | |
| 0 | Mettre la table | Fusion des branches, briques (8 points) | L1, L2 |
| 1 | Fermer ce qui est ouvert | S1 : 6 points | L3 |
| 2 | La vérité du journal | S2 : 3 points | L3 |
| 3 | Ouvrir ce qui est enfermé | S3 : 4 points | L3 |
| 4 | L'exactitude | S4 : 5 points | L3, L7 |
| 5 | Le temps | S5 : 5 points | L4 |
| 6 | Le courrier | M1a à M1d | L5 |
| 7 | Les réunions | M2a, M2b | L6 |
| 8 | Les livrables | M3 : 4 points | L7 |
| 9 | L'interface | F2 (5 points), F3 (9 points), F4 (4 points) | L8, L9 |
| 10 | Le vocabulaire | F5 : 3 points | L10 |
| 11 | La recette | R : les six profils rejouent | L11 |

### 8.2 Les sprints

Le sprint S0 met la table ; les neuf sprints d'une semaine, S1 à S9, portent le chantier. Le vendredi est le point d'avancement et la revue du livrable ; le lundi, le cadrage du lot suivant. Arrêt du 22 décembre 2026 au 2 janvier 2027.

<!-- matrice -->
| Sprint | Semaine | Objectif | Lots |
|---|---|---|---|
| @@ Les sprints | | | |
| S0 | 25 au 28 novembre 2026 | Mettre la table | 0.1 (fait), 0.2 |
| S1 | 1er au 5 décembre | Rien ne fuit | S1 |
| S2 | 8 au 12 décembre | Le journal dit vrai, rien n'est enfermé | S2, S3 |
| S3 | 15 au 19 décembre | Les calculs sont exacts, le temps est juste | S4, S5 |
| Arrêt | 22 décembre au 2 janvier 2027 | Aucun travail | Aucun |
| S4 | 5 au 9 janvier 2027 | Le courrier : le modèle | M1a |
| S5 | 12 au 16 janvier | Le courrier : le circuit et les numéros | M1b, M1c |
| S6 | 19 au 23 janvier | Le courrier : les écrans ; les réunions : l'adoption | M1d, M2a |
| S7 | 26 au 30 janvier | Les réunions et les livrables | M2b, M3 |
| S8 | 2 au 6 février | L'interface | F2, F3, F4 |
| S9 | 9 au 13 février | Le vocabulaire, puis la recette | F5, R |

La livraison est visée le 13 février 2027. Ce calendrier tient à une condition qui ne dépend pas des agents : les décisions du maître d'ouvrage doivent être prises aux dates ci-dessous. Une décision qui glisse d'une semaine fait glisser son sprint d'une semaine, et tous ceux qui en dépendent.

### 8.3 Les onze livrables

<!-- matrice -->
| Livrable | Objet | Reconnu à | État |
|---|---|---|---|
| @@ Les onze livrables | | | |
| L1 | Une base commune | La branche principale porte le design et les droits fusionnés ; 760 tests ; zéro manquement | Fait le 25 novembre 2026 |
| L2 | Des briques tenues | Aucune balise brute hors des briques, un test l'interdit | Non fait |
| L3 | Un serveur qui ne laisse rien passer | Aucune des six fuites, aucun état sans sortie, un journal qui ne porte que ce qui a eu lieu | Non fait |
| L4 | Un temps qui ne ment pas | Heure vérifiée, fuseau de l'entité, rang déduit de l'année | Non fait |
| L5 | Le module courrier | Les cinq étapes se jouent de la réception au classement, étiquette comprise | Non fait |
| L6 | Le module réunions | Un compte rendu s'adopte collégialement à la séance suivante | Non fait |
| L7 | Le module livrables | Aucun paiement sur un livrable sans pièce | Non fait |
| L8 | Une interface qui répond et ne cache rien | Tout acte engageant répond ; tout droit de lecture a une porte ; la recherche trouve ce qu'elle annonce | Non fait |
| L9 | Les écrans refaits | Replanifier sept tâches coûte moins de dix clics | Non fait |
| L10 | Le vocabulaire de la maison | « Signataire » partout ; « décision » ne désigne plus qu'une chose | Non fait |
| L11 | La recette | Les six profils rejouent leurs séquences ; les six chiffres sont à leur cible | Non fait |

### 8.4 Le chemin critique

Le chemin critique passe par le temps et le courrier : seize points sur 102, mais en série, et dépendant de deux décisions du maître d'ouvrage. Tout retard sur ce chemin se répercute intégralement sur la livraison.

```
Briques --> F2 --> F3 --> F4 ------------------------+
                                                      +--> F5 --> Recette
S1 --> S2 --> S3 --> S4 --> S5 (temps) --> M1a --> M1b --> M1c --> M1d --+
                                   |
                                   +--> M2a --> M2b
                                   +--> M3
```

Deux chaînes avancent en parallèle : les briques et l'interface d'un côté, le serveur de l'autre, par deux agents qui ne touchent jamais les mêmes fichiers. Ce qui ne peut pas avancer en parallèle : le courrier avant le temps. Numéroter un registre avec une horloge qui ment n'a aucun sens.

### 8.5 Les neuf décisions du maître d'ouvrage

<!-- matrice -->
| Décision | Objet | Ce qu'elle bloque | Nécessaire avant le |
|---|---|---|---|
| @@ Les décisions attendues | | | |
| D1 | L'unicité du rang du courrier entre postes hors connexion | Le temps (S5), puis tout le courrier, soit seize points | 15 décembre 2026 |
| D2 | « En retard » : semaine calendaire ou ouvrable | Numéros, archives et rappels (M1c) | 12 janvier 2027 |
| D3 | Le contenu de l'étiquette d'accusé de réception | Les écrans du courrier (M1d) | 19 janvier 2027 |
| D4 | Les types de livrables | Les livrables (M3) | 26 janvier 2027 |
| D5 | Le cadre organique : dans l'outil ou en dehors | M3 et un point hors chantier | 26 janvier 2027 |
| D6 | Les noms définitifs des trois objets appelés « décision » | Le vocabulaire (F5) | 2 février 2027 |
| D7 | La règle de non-perte partout : conversion du routeur, ou non | Les écrans refaits (F4) | 2 février 2027 |
| D8 | Les annexes du courrier | Rien : reportée par le maître d'ouvrage | Sans échéance |
| D9 | Qui confirme une exécution déclarée : secrétariat de direction ou direction générale | Le circuit d'exécution des décisions | Date non arrêtée au plan ; l'échéance dépend de cette décision |

D1 est la plus urgente, et de loin. La neuvième décision a été ajoutée par la spécification ; le plan de projet n'en comptait que huit et doit être tenu à jour.

## 9. Gouvernance du projet

### 9.1 Qui fait quoi

<!-- matrice -->
| Rôle | Responsabilité | Limite |
|---|---|---|
| @@ Les rôles | | |
| Maître d'ouvrage | Commanditaire ; seul à trancher les neuf décisions | Ne code pas |
| Session principale | Conduit le chantier, relit, fusionne, parle au maître d'ouvrage | Ne pousse rien sans son accord |
| Chef de projet | Cadre les lots, mesure, rend les états d'avancement, vérifie les fins de lot | Ne code pas ; ne modifie aucun fichier du serveur ni de l'interface |
| Agent serveur | Phases 1 à 5, moitié serveur des phases 6 à 8 | Jamais sur les fichiers de l'agent interface |
| Agent interface | Phase 0, puis phase 9, moitié interface des phases 6 à 8 | Jamais sur les fichiers de l'agent serveur |
| Testeurs | Phase 11 seulement, un par profil | Ne jugent que ce qui a été corrigé |

### 9.2 Le rythme

- Lundi : cadrage du lot de la semaine, avec sa fiche de lot, ce qui n'y est pas et pourquoi, et son critère de fin écrit avant la première ligne de code.
- Vendredi : état d'avancement chiffré, sur une page, avec les six chiffres toujours les mêmes ; revue du livrable s'il y en a un.
- À tout moment : une demande de changement s'instruit, avec ce qu'elle coûte et surtout ce qu'on ne fera pas si on la retient. Elle ne s'improvise pas.

Règles de conduite : un lot se termine ou ne se commence pas ; deux agents au plus en parallèle ; un travail par branche ; on fait de grandes retouches, mais selon une bonne logique, et jamais des fonctionnalités à moitié. Les contraintes du chantier portent sur un budget de jetons, non sur un budget monétaire.

### 9.3 Le registre des risques

Score égal à la probabilité multipliée par la gravité, de 1 à 5 chacune. Tout ce qui touche à une fuite, une perte de données ou une fausse écriture a une gravité de 5.

<!-- matrice -->
| Risque | Probabilité et gravité | Score | Parade |
|---|---|---|---|
| @@ Le registre des risques | | | |
| R1 Une décision tarde et bloque le chemin critique | 4 et 4 | 16, élevé | Les dates sont rappelées à chaque état d'avancement ; D1 est demandée dès maintenant |
| R2 Le modèle du courrier est écrit avant d'être arrêté | 3 et 5 | 15, élevé | Le modèle de données s'arrête par écrit avant M1a ; le lot ne s'ouvre pas sans sa fiche |
| R3 Un lot est déclaré fini sans l'être | 3 et 4 | 12, moyen | Le chef de projet relit le diff et lance les tests lui-même ; c'est déjà arrivé une fois |
| R4 Le budget de jetons s'épuise en découvertes | 3 et 4 | 12, moyen | Les 102 points sont documentés : on les traite ; aucune campagne nouvelle sans raison |
| R5 Le renommage « signataire » entre en conflit avec les lots en cours | 4 et 2 | 8, moyen | Il est placé en phase 10, après que tout le reste est posé |
| R6 Deux agents touchent les mêmes fichiers | 2 et 3 | 6, faible | Un propriétaire par lot ; répartition serveur et interface écrite |
| R7 Une correction en casse une autre | 2 et 3 | 6, faible | 760 tests, chaque lot en ajoute ; le nombre ne baisse jamais |
| R8 L'arrêt de fin d'année allonge la reprise | 4 et 1 | 4, faible | L'état d'avancement du 19 décembre sert de point de reprise |

## 10. Maintenance

Les trois formes de maintenance ne s'ouvrent qu'à la livraison du 13 février 2027. Jusque-là, le chantier les absorbe. Le porteur de chacune après la livraison n'est pas désigné : c'est une décision du maître d'ouvrage, à prendre avant la recette.

<!-- matrice -->
| Forme | Ce qu'elle couvre | Déclencheur | Porteur |
|---|---|---|---|
| @@ La maintenance | | | |
| Corrective | Défaut constaté après livraison : fuite, faux calcul, état sans sortie, manquement d'accessibilité. Chaque correction commence par un test qui échoue | Un constat d'un utilisateur ou d'un balayage | À désigner par le maître d'ouvrage |
| Préventive | Mise à jour des dépendances, des migrations, des sauvegardes ; relance périodique du contrat d'accès, de l'audit d'accessibilité et des tests ; contrôle du serveur de temps | Calendrier trimestriel | À désigner par le maître d'ouvrage |
| Évolutive | Nouvelle exigence, nouveau module, nouveau référentiel, annexes du courrier | Une demande de changement instruite : coût, et ce qu'on ne fera pas si on la retient | Le maître d'ouvrage décide ; le chef de projet instruit |

Règles communes : toute évolution passe par une demande de changement ; toute route nouvelle entre dans le contrat d'accès ; toute écriture engageante entre au journal ; le nombre de tests ne baisse jamais ; la spécification et le plan se mettent à jour avec le code.

## 11. Analyse des écarts — synthèse

### 11.1 Ce que pèse le dossier

La spécification compte 477 exigences, réparties sur 16 modules. 185 ont été confrontées à l'existant ; l'état de 292 n'est pas établi. Ce n'est pas une omission mais une étape : elles ont été déduites du fonctionnement de l'Agence et personne n'est encore allé lire le code pour savoir si elles sont tenues. Cet établissement est un travail à part entière, à conduire avant d'ouvrir les lots concernés.

### 11.2 L'état des 185 exigences confrontées

<!-- matrice -->
| État | Nombre | Part | Lecture |
|---|---|---|---|
| @@ L'état de ce qui a été vérifié | | | |
| Tenue | 10 | 5 % | Conforme à l'exigence |
| Partielle | 19 | 10 % | Tenue pour une part du besoin |
| Non tenue | 113 | 61 % | L'existant contredit l'exigence |
| Absente | 43 | 23 % | Rien n'existe |

Sur vingt exigences vérifiées, une est tenue. Ce chiffre mesure l'écart entre un outil bâti par ajouts successifs et un système spécifié à partir du fonctionnement d'une institution ; il ne juge pas la qualité du code. Les deux tiers des manques étaient déjà connus et chiffrés dans les 102 points. Le dernier quart ne l'était pas. Un module se détache : les coéquipiers IA, treize exigences confrontées, treize non tenues, aucune tenue. Les plans de travail et les attributions ont des tableaux d'écarts très courts parce que les 102 points les couvraient peu, non parce qu'ils sont sains : ils sont les premiers candidats au travail d'établissement des états.

### 11.3 Ce que la spécification a trouvé et que la chasse aux défauts n'avait pas vu

On ne peut pas voir une absence en lisant du code. Ces exigences n'avaient aucun point d'intervention, parce que rien dans le système ne les évoquait.

<!-- matrice -->
| Trouvaille | Ce qui manque | Exigences |
|---|---|---|
| @@ Les absences que seule la spécification a révélées | | |
| Les actes d'amont du conseil d'administration | Rien ne reçoit une résolution du conseil comme charge à suivre, ni un budget arrêté comme cadre d'exécution, ni les états financiers approuvés comme document de référence. Le conseil n'est pas outillé, c'est délibéré, mais ses actes entrent dans la gestion | EX-DEC-050, EX-DEC-051, EX-DOC-050, EX-DOC-051 |
| Les pools territoriaux | L'Agence est présente par six pools et le référentiel ne les connaît pas : ni le type d'entité pool, ni la fonction de directeur de pool | EX-ORG-004, EX-ORG-005 |
| L'intérim d'un chef d'entité | Aucune continuité de service quand un chef est absent ; le modèle institutionnel le signalait déjà | EX-ORG-019 |
| L'unicité du directeur général adjoint | Le catalogue des profils doit refléter qu'il n'y en a qu'un | EX-ORG-007 |
| Le chemin d'approbation d'un plan | L'écran ne dit pas à celui qui soumet un plan qui peut l'approuver | EX-PLA-012 |

### 11.4 Les exigences d'amont d'un travail déjà prévu

Trois points d'intervention n'en couvraient qu'une partie. Les exigences s'écrivent avant l'ouverture du lot, pour ne pas livrer la moitié du sujet.

- La délégation de signature : délégation datée, bornes obligatoires, ouverture et fermeture automatiques, journal, mention portée sur l'acte signé. Le point prévu n'en nommait qu'une.
- L'adoption collégiale d'un compte rendu : amendement par les présents avec trace, adoption à la séance suivante, modifications consignées, et le cas d'une séance qui n'a pas de suivante.
- Les types de livrables : à écrire quand la liste sera arrêtée, décision D4.
