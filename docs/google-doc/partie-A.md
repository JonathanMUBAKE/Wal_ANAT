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
