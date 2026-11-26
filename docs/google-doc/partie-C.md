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
