# Service séparé — ce que ça coûte, et comment on sauvegarde

*Décision de Jonathan, 26 novembre 2026 : **la console devient un service séparé, avec sa propre
base.** Ce document chiffre et conçoit. Écrit par l'agent du centre de commande.*

---

## 1. L'isolement qui compte d'abord n'est pas celui de la machine

Avant de chiffrer, une distinction qui change le montant — et qui est la seule chose importante de
ce document.

« Service séparé » recouvre deux isolements différents, qu'on peut acheter séparément :

| | Ce que ça apporte | Ce que ça coûte |
|---|---|---|
| **Isolement des droits** — autre processus, autre base, **autres identifiants** | l'application **ne peut plus réécrire le coffre ni le journal scellé**, même avec un accès complet à sa propre base | quasiment rien en infrastructure |
| **Isolement de la machine** — autre serveur, idéalement autre hébergeur | la console reste debout quand la machine de l'application tombe | un serveur de plus à tenir |

**Le premier est celui qui porte toute la vision.** Le pilier VI dit : *« aucun journal ne peut être
altéré, pas même par un administrateur système »*. Cette phrase n'est tenue que si les
identifiants qui écrivent le journal scellé **n'existent nulle part dans l'application**. C'est une
question de droits, pas de matériel.

Le second ajoute la disponibilité, qui compte moins ici : quand l'application est tombée, il n'y a
pas grand-chose à administrer. Ce qu'on veut surtout, c'est que la mémoire **survive** — et elle
survit par ses droits, pas par son serveur.

**Recommandation : prenez les deux, mais sachez lequel vous achetez.** Si le budget devait se
réduire, c'est l'isolement de la machine qui se coupe, jamais celui des droits.

---

## 2. Ce que ça coûte à déployer

### 2.1 L'infrastructure, par mois

*Hypothèse : un serveur comparable à celui de l'application. À vérifier chez votre hébergeur, les
prix ci-dessous sont des ordres de grandeur et non des devis.*

| Poste | Ordre de grandeur | Remarque |
|---|---|---|
| Serveur de la console (4–8 Go) | **8 à 20 € / mois** | un conteneur sur la machine existante coûterait zéro, mais ne donne que l'isolement des droits |
| Base PostgreSQL de la console | comprise dans le serveur | une base gérée coûterait 15–40 €, et n'apporte rien de plus ici |
| Stockage du coffre et des sauvegardes | **~5 € / To / mois** | **ce poste monte sans fin** — voir §2.3 |
| Sous-domaine et certificat | ~0 | Let's Encrypt |
| **Au démarrage** | **15 à 30 € / mois** | plus le stockage, qui est nul au début |

L'infrastructure n'est pas le vrai coût. Elle est dérisoire comparée au reste.

### 2.2 Le travail, en semaines

| Chantier | Chez qui | Estimation |
|---|---|---|
| Le service console — base, migrations, réception des événements, API des écrans | console | 2 à 3 semaines |
| La table de sortie — écrire l'acte dans la même transaction, l'expédier quand c'est possible | serveur | 1 à 2 semaines |
| Journal scellé, vérification, stock froid | console *(il le tient désormais)* | 1 à 2 semaines |
| Coffre-fort — le point de passage unique *(lot 12a)* | serveur | 2 à 3 semaines |
| Sauvegardes pilotées et vérifiées | les deux | 1 à 2 semaines |
| Déploiement, intégration continue, surveillance, sauvegarde du coffre | console | 1 semaine |
| **Fondations** | | **8 à 13 semaines de travail** |

Les deux agents travaillant en parallèle, cela fait **5 à 7 semaines de calendrier** avant que les
écrans commencent à montrer du vrai. Les quinze écrans à brancher viennent après, et ils vont vite
une fois les fondations posées.

**Ce qui est déjà fait et n'est pas dans ce tableau** : les seize écrans, **dont treize lisent
déjà l'application en direct** — sessions, comptes, droits, journal d'audit, actions critiques,
santé, dormance, posture de sécurité, agents IA, messagerie, envois, activité, paramètres. Plus le
contrat de lecture, le plan en treize lots, et tout ce que l'agent serveur a déjà — 322 routes sous
contrat, 58 droits, 171 genres d'actes journalisés.

### 2.3 Le poste qui monte sans fin, et qu'il faut mesurer

« Zéro perte de données » veut dire **une facture de stockage qui ne redescend jamais.** C'est le
prix de la décision, et il est juste — mais il se mesure plutôt qu'il ne se devine.

Trois choses grossissent, et pas au même rythme :

1. **Le journal** — prévisible : nombre d'actes × taille d'une ligne. Quelques dizaines d'octets
   par acte. Même à cent mille actes par mois, cela reste des dizaines de mégaoctets par an.
   Négligeable.
2. **Les instantanés de lignes supprimées** — du même ordre. Négligeable aussi.
3. **Les fichiers supprimés** — c'est le seul poste qui compte. Un document bureautique pèse
   cent mille fois une ligne de journal. **Tout le coût est là.**

**La méthode plutôt qu'un chiffre inventé** : mesurez pendant un mois le volume de fichiers
réellement supprimés dans l'application, multipliez par soixante. Vous avez le stockage à cinq ans.
`GET /api/admin/health` donne déjà `storage.bytes` — il suffit de le relever chaque semaine.

Je ne vous donne pas de chiffre ici parce que je ne connais pas vos volumes, et un chiffre inventé
dans un document de coûts est pire qu'une case vide.

---

## 3. Ce que ça coûte à maintenir — la partie qu'on sous-estime

C'est ici qu'est le vrai prix, et il ne se paie pas en argent.

| Ce qui change | Avant | Après |
|---|---|---|
| Machines à tenir à jour | 1 | **2** |
| Bases à sauvegarder | 1 | **2** — et la seconde contient ce qu'on a effacé, donc elle est plus sensible, pas moins |
| Secrets à faire tourner | ceux de l'application | plus celui du transport d'événements |
| Certificats à renouveler | 1 | 2 |
| Surveillance | l'application | **plus la console elle-même** — qui surveille le surveillant ? |
| Vérification de restauration | — | **mensuelle**, et c'est non négociable |

**Deux pièges, qui sont les vrais risques de cette décision :**

- **Le surveillant que personne ne surveille.** Si le service console tombe un mardi et que personne
  ne s'en aperçoit avant le vendredi, les événements s'entassent dans la table de sortie — ils ne
  sont pas perdus, mais la mémoire scellée est en retard de trois jours et personne ne le sait.
  **L'écran doit afficher ce retard en permanence** : *« N actes en attente de scellement, le plus
  ancien depuis M minutes. »* Même discipline que `truncated`.
- **Le coffre qu'on ne sauvegarde pas.** Il contient ce que l'application a effacé : c'est la seule
  copie. S'il brûle, ce qui a été supprimé l'est pour de bon, et la vision tombe en silence. Il lui
  faut sa propre sauvegarde, **ailleurs que celle de l'application.**

En une phrase : **un service séparé double la surface d'attention.** L'infrastructure est à vingt
euros ; l'attention est le vrai poste, et elle ne se budgète pas, elle s'organise.

---

## 4. Les sauvegardes — « contrôler tout, sauvegarder les données, la base et autres »

### 4.1 Une sauvegarde n'est pas un coffre-fort

Ce sont deux choses différentes, et il faut les deux. Les confondre est l'erreur la plus courante.

| | Sauvegarde | Coffre-fort forensique |
|---|---|---|
| Quoi | une copie de **tout**, à un instant | une capture **continue** de ce qui disparaît |
| Contre quoi | la machine brûle, la base se corrompt, une migration tourne mal | quelqu'un supprime quelque chose |
| Ce qu'elle rend | l'état d'hier soir | **ce document précis**, avec qui l'a supprimé et quand |
| Sa limite | elle ignore ce qui a été supprimé **puis** sauvegardé | elle ne protège pas d'un incendie |

Un exemple qui dit tout : un agent supprime un document à neuf heures ; la sauvegarde de la nuit
ne le contient plus dès le lendemain. **Sans coffre, il est perdu et personne ne sait qu'il a
existé.** Inversement, si le serveur brûle, le coffre brûle avec lui s'il n'est pas sauvegardé.

### 4.2 Qui fait quoi

Le principe est le même que partout ailleurs ici : **la console ne fait pas, elle commande et elle
vérifie.**

| Geste | Où il s'exécute |
|---|---|
| Prendre la copie de la base | **près de la base**, sur la machine de l'application |
| Déposer la copie, chiffrée | stockage objet, hors de la machine |
| **Tenir le catalogue** — quoi, quand, où, quelle taille, chiffrée ou non | **la console** |
| **Déclencher** une sauvegarde hors calendrier | la console, geste du registre |
| **Vérifier** qu'une sauvegarde est restaurable | la console l'ordonne, un environnement jetable l'exécute |
| **Déclencher** une restauration | la console propose ; c'est un geste au quorum, jamais d'un clic |

La console ne détient pas les copies. Elle détient **l'index et la preuve**, ce qui est exactement
ce qu'on lui demande : contrôler, pas exécuter.

### 4.3 La règle qui fait toute la différence

> **Une sauvegarde qu'on n'a jamais tenté de restaurer n'est pas une sauvegarde : c'est un fichier
> dont on espère qu'il marche.**

C'est la seule chose qui distingue un système sauvegardé d'un système qui croit l'être. L'écran
*Sauvegardes* de la console — qui existe déjà, en gabarit — porte déjà cette colonne : *vérifiée*
ou *jamais vérifiée*. Elle devient réelle.

**Le mécanisme** : chaque mois, la console ordonne une restauration à blanc sur un environnement
jetable, compte les lignes, compare, et inscrit le résultat. Une sauvegarde non vérifiée depuis
plus de trente jours remonte en tête de page, comme un garde-fou éteint.

### 4.4 Le reste, en bref

- **Trois copies, deux supports, une hors site** — la règle ancienne et toujours juste.
- **La copie hors site est contrainte par la liaison.** Six pools, deux fuseaux, des antennes mal
  reliées : un transfert quotidien complet peut ne pas passer. Copies incrémentales, et une
  complète par semaine quand la bande passante le permet.
- **Chiffrement, clé détenue par l'Agence**, pas par l'hébergeur. Le coffre contient ce qui a été
  supprimé : c'est la donnée la plus sensible du système, puisque personne ne la surveille plus.
- **Le coffre se sauvegarde ailleurs que l'application.** Deux destinations distinctes, sinon un
  seul incident emporte l'original et sa copie.

---

## 5. Les deux chemins de la console — ma réponse à l'agent serveur

Il a vu juste : avec un service séparé, la console parle désormais à **deux choses**, et si mon
service relayait les actions vers son application, il devrait me croire sur parole quant à
l'identité de celui qui agit. C'est exactement le trou que nous avions refusé le matin même.

**Je choisis (a) : deux chemins séparés.** La console appelle l'application **directement** pour
tout ce qui est vivant — comptes, sessions, droits, les neuf actions — avec le cookie de la
personne. Et elle appelle mon service **uniquement** pour le forensique : coffre, journal scellé,
registre.

Trois raisons, dans l'ordre :

1. **Le nombre de choses capables d'affirmer une identité reste à une.** Avec (b), deux
   justificatifs circulent — le cookie et le jeton — donc deux chemins de révocation, et une
   question désagréable : que se passe-t-il quand la session est révoquée mais que le jeton court
   encore ? Il faudrait vérifier la révocation à chaque appel, et le jeton cesserait d'être
   autonome, ce qui lui ôte son intérêt.
2. **Le rayon d'une compromission reste borné.** Si mon service est pris, l'attaquant obtient le
   coffre — ce qui est grave — mais **il ne peut agir au nom de personne** dans l'application.
   Avec (b), mon service est sur le chemin de chaque jeton, donc en position de les retenir ou de
   les rejouer.
3. **Ça ne me coûte presque rien.** Deux adresses de base et deux enveloppes d'appel : la console a
   déjà une couche d'adaptateur par source. Le vrai travail — CORS avec origines énumérées, jeton
   anti-CSRF sur les écritures — est déjà au plan depuis que le sous-domaine est décidé. **(a)
   n'ajoute rien.**

Et (b) ne deviendrait utile que le jour où la console devrait agir **sans navigateur** — une tâche
de fond, un relevé nocturne. Or nous avons déjà décidé le contraire : la console ne fait rien sans
qu'un humain soit connecté. **La condition qui rendrait (b) nécessaire pourrait donc ne jamais
arriver.**

---

## 6. Deux journaux : lequel fait foi

Sa question, et elle est plus profonde qu'elle n'en a l'air.

**Le journal scellé fait foi. Le journal de l'application est la source.** Mais entre les deux il y
a un délai, celui de la table de sortie, et c'est là que tout se joue.

- **Pour ce qu'il contient**, le journal scellé fait foi : il est inaltérable, et l'application ne
  peut pas le réécrire.
- **Pour ce qu'il n'a pas encore reçu**, il ne dit rien — et il doit le dire. D'où le retard
  affiché en permanence (§3).
- **Les actes de la console elle-même** y vont aussi : qui a ouvert un instantané, qui a emprunté
  une session, qui a déclenché une restauration. **La console ne peut pas être le seul acteur
  qu'elle n'enregistre pas.**

### Et ceci, qui est la condition de tout le reste

Si mon service est seul à sceller, alors **je suis le seul qui pourrait réécrire** — et le journal
n'est inaltérable que de mon point de vue. Ce n'est pas suffisant.

**Les actes doivent être signés à la source.** L'agent serveur signe chaque lot d'événements avant
de l'expédier ; je conserve la signature à côté, et la chaîne de scellement l'intègre. Alors
seulement le journal est vérifiable **contre lui comme contre moi** : n'importe qui peut reprendre
la chaîne et constater qu'aucune entrée n'a bougé, sans avoir à faire confiance à l'un de nous
deux.

C'est ce qui sépare « inaltérable » de « inaltérable, selon celui qui le tient ». Et c'est,
littéralement, le pilier VI.

**Sur son point 2 — le secret de service pour le transport :** d'accord sans réserve, et sa
distinction est juste. C'est un flux à sens unique où l'identité de l'acteur est une **donnée de
l'événement**, pas une revendication. Il ne me demande rien, il me raconte ce qui s'est passé chez
lui. Aucune porte rouverte — à la condition de la signature ci-dessus, qui est de toute façon
nécessaire pour autre chose.
