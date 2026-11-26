# La vision de Jonathan — ce qu'elle change, et les quatre tensions à trancher

*Lecture du document `VISION.md`, partagé le 26 novembre 2026 aux deux agents.*
*Écrit par l'agent du centre de commande. À compléter par l'agent serveur.*

---

## 1. Ce que ce document change

Jusqu'ici nous construisions **un miroir** : une console qui lit l'API de l'application, affiche,
et n'ajoute rien. C'était la bonne réponse à la question posée.

La question a changé. Le document demande **un plan de contrôle souverain** : un système qui garde
une mémoire que l'application ne garde pas, qui survit à l'application quand elle tombe, qui
conserve ce qu'elle efface, et qui peut ouvrir la session d'un utilisateur.

Ce n'est pas la même chose en plus grand. **C'est autre chose.** Un miroir n'a pas besoin de base
de données ; un coffre-fort, si. Et la phrase qui résume tout le document est la plus simple :
*« je veux être en mesure de tout gérer, sans exception »*.

Trois choses restent vraies, et elles ne sont pas négociées par ce document :

1. **Le serveur reste seul juge.** La console agit au nom d'une personne, avec ses droits. Rien
   dans la vision ne demande le contraire — « gouverner » n'est pas « contourner ».
2. **Votre application reste où elle est.** Elle n'est ni absorbée, ni réécrite, ni déplacée. Elle
   est pilotée.
3. **La console n'affiche jamais ce qu'elle n'a pas pu lire**, et ne calcule aucun total sur une
   fenêtre tronquée.

---

## 2. Les six piliers, et où nous en sommes vraiment

| Pilier | Ce qui existe déjà chez vous | Ce qui manque |
|---|---|---|
| **I — Cycle de vie des comptes** | comptes, profils, 58 droits modifiables à chaud, sessions, suspension, réactivation — et **la révocation est bien immédiate** | la suppression *contrôlée* au sens de la vision, qui suppose une archive |
| **II — Observabilité temps réel** | `activity`, `security_events`, `GET /api/admin/health` avec ses `alerts[]` | **rien.** Ni canal continu, ni événements servis en flux, ni captation des exceptions applicatives. Tout se lit après coup, par une requête |
| **III — Coffre-fort forensique** | **presque rien** — une suppression est une vraie suppression, le contenu d'avant n'est conservé nulle part ; le journal dit qu'un acte a eu lieu, pas ce qui a disparu | tout : archive, instantané avant/après, restauration, empreinte géographique |
| **IV — Défense active** | verrouillage après échecs, tentatives enregistrées, double facteur | ni bannissement d'adresse, ni détection de connexion géographiquement impossible, ni double approbation sur un acte critique |
| **V — Orchestration de l'IA** | les règles existent et sont modifiables, les propositions passent par une validation humaine | ni choix de modèle, ni quota, ni plafond de coût, ni audit des décisions au sens de la vision |
| **VI — Journaux immuables** | aucune purge : append-only **de fait** | **rien au sens strict.** Les actes vivent dans une table ordinaire : qui atteint la base peut la réécrire. Le scellement en chaîne est faisable, il n'est pas écrit |

> *Ce tableau est celui de l'agent serveur, qui l'a établi de l'intérieur le 26 novembre. Ma
> première version, écrite de l'extérieur, était trop optimiste sur trois points.*

**La phrase la plus importante de son relevé**, et je la reprends telle quelle :

> *« Le pilier III n'est pas une fonctionnalité de console : c'est une modification de chaque
> module qui supprime quelque chose. »*

C'est exactement cela, et c'est pourquoi je le place avant-dernier dans le plan. Un coffre-fort ne
s'ajoute pas à côté d'une application : il se branche sur chaque endroit où elle efface. Tant qu'un
seul module supprime pour de bon, le coffre ne garantit rien — et un coffre qui garantit presque
tout ne garantit rien du tout.

**Ce que ce tableau dit** : les piliers I, V et VI sont à portée — l'essentiel existe, il faut
l'exposer et le garantir. Le pilier IV demande une brique nouvelle mais bornée. Les piliers II et
III sont des chantiers à part entière, et le III est le plus lourd de tout ce que nous avons
envisagé jusqu'ici.

---

## 3. Les quatre tensions

Ce sont les points où le document, pris à la lettre, se contredit ou contredit ce que nous avons
décidé. Mieux vaut les trancher maintenant.

### Tension 1 — « tracer tout sans voir les données »

> *« Pas besoin de voir les données des utilisateurs, mais des traces de tout. »* — Jonathan
> *« Le contenu exact de la donnée avant et après l'action. »* — pilier III

Les deux phrases ne peuvent pas être vraies en même temps, et c'est la contradiction la plus
importante du document.

Un coffre-fort qui restaure doit conserver le contenu ; sinon il ne restaure rien, il note qu'une
suppression a eu lieu. Donc **le coffre contient les données**. La question n'est pas *si* elles y
sont, mais **qui les voit, quand, et à quel prix.**

**Ce que je propose**, et qui réconcilie les deux phrases :

- le coffre **stocke** le contenu, chiffré, parce que c'est la condition de la restauration ;
- la console **n'affiche jamais** le contenu par défaut. Elle montre la fiche de l'événement : qui,
  quoi *(le type d'objet, pas sa substance)*, quand, d'où, et la taille de ce qui a été supprimé ;
- **ouvrir un instantané est un geste contrôlé** — nommé, journalisé, motivé, et soumis au double
  regard. Un administrateur qui lit le contenu d'un document supprimé laisse une trace aussi nette
  que celui qui l'a supprimé ;
- **restaurer ne demande pas de lire.** Le geste courant — remettre la donnée en place — se fait
  sans jamais ouvrir le contenu. C'est ce qui rend la règle tenable au quotidien.

Autrement dit, la phrase de Jonathan devient exacte : *on ne voit pas les données des utilisateurs*
— sauf par un geste délibéré qui se voit lui aussi.

### Tension 2 — une console souveraine n'est plus un miroir

> *« Si l'application subit un pic de charge ou une anomalie, le centre de commande reste 100 %
> disponible. »* — pilier IV d'AWS

Une console qui ne fait que lire l'API de l'application **tombe avec elle**. C'est précisément le
moment où un administrateur en a besoin.

**Donc la console a besoin de son propre dépôt de données.** J'avais écrit le contraire dans
`01-architecture-proposee.md` §3 — « pas de serveur pour la console, pas tout de suite ». Cette
vision rend ce « pas tout de suite » caduc pour trois objets, et trois seulement :

1. **le coffre-fort forensique** — il doit survivre à la base qu'il protège, sinon il ne protège
   rien ;
2. **une copie scellée du journal** — le pilier VI demande qu'aucun administrateur ne puisse
   altérer la mémoire ; tant qu'elle vit dans la même base que le reste, cette garantie est une
   déclaration d'intention ;
3. **l'état propre à la console** — le registre des contrôles, les niveaux d'exigence, la file
   d'approbations.

**Tout le reste continue de passer par votre API**, en direct. La console ne duplique pas vos
comptes, ni vos projets, ni vos dossiers. Elle garde ce que vous ne gardez pas, et rien d'autre.

C'est un renversement, et je préfère le dire franchement plutôt que le faire glisser dans un lot.

### Tension 3 — le sous-domaine

Jonathan veut la console sur **un sous-domaine distinct**, connecté à l'application. Nous étions
convenus de la même origine. C'est sa décision et elle se tient — une console séparée se voit
mieux, se protège séparément, et se coupe en cas de besoin.

**Ce que cela coûte, précisément** — et c'est moins cher que ce que je craignais, parce qu'un
sous-domaine du même domaine n'est pas un site tiers :

| | Même origine *(ce qu'on avait prévu)* | Sous-domaine *(ce que Jonathan veut)* |
|---|---|---|
| Cookie | rien à faire | `Domain=.exemple.sn` pour qu'il vaille sur les deux |
| `SameSite` | `Lax` suffit | **`Lax` suffit encore** — même site, pas tiers |
| CORS | aucun | nécessaire : origines **énumérées**, jamais `*`, avec `credentials` |
| CSRF | risque faible | **jeton anti-CSRF obligatoire sur toutes les écritures** |
| Certificat | celui de l'application | un de plus, ou un certificat joker |

Le seul vrai travail est le jeton anti-CSRF, et il est de votre côté. Ce n'est pas un obstacle.

### Tension 4 — l'immuabilité répond à la question de la rétention

Nous attendions une décision de Jonathan sur la rétention des journaux. **Le pilier VI y répond** :
*« aucun journal ne peut être altéré ou effacé, pas même par un administrateur système »*.

Donc : **on ne purge pas**. Ce qui était un oubli devient une décision, et c'est la bonne dans une
administration où l'écrit fait foi.

Mais cela déplace le problème plutôt que de le supprimer. Un journal qui ne s'efface jamais doit
être **archivé** : les entrées anciennes sortent de la base vive vers un stock froid, scellé,
toujours lisible mais plus interrogé par les écrans. Sans quoi la table grossit jusqu'à ce que les
requêtes s'effondrent — et la mémoire sacrée deviendra la cause de la panne.

« Ne jamais effacer » et « tout garder dans la même table » sont deux choses différentes. La
première est une décision d'institution ; la seconde serait une négligence technique.

---

## 4. Ouvrir la session d'un utilisateur — le geste le plus dangereux du système

> *« Être capable, s'il le faut, de cliquer sur un bouton et ouvrir la session d'un utilisateur,
> comme avec cPanel ou WHM. »* — Jonathan

C'est une fonction standard et légitime : Stripe, Zendesk, Intercom, Salesforce et WHM l'ont tous.
C'est aussi, de très loin, **le geste le plus dangereux que nous aurons à écrire** — celui qui, mal
fait, transforme une console d'administration en outil de surveillance, et rend le journal
inutilisable puisque les actes d'un administrateur y apparaîtraient sous le nom de quelqu'un
d'autre.

Il ne se refuse pas. Il s'encadre. **Sept garde-fous**, et je les propose tous les sept ensemble —
en retirer un suffit à rendre le reste décoratif :

1. **La session empruntée est marquée.** Le serveur sait qu'il s'agit d'un emprunt. Ce n'est pas
   une connexion comme une autre.
2. **Chaque acte porte les deux identités.** Le journal écrit « *l'administrateur X, agissant au
   nom de Y* ». Jamais « Y » seul. C'est ce qui rend le journal encore vrai après.
3. **L'emprunt expire tout seul**, au bout de trente minutes par exemple. On n'oublie pas d'en
   sortir.
4. **En lecture seule par défaut.** Écrire au nom de quelqu'un est un second geste, avec sa propre
   approbation. Voir ce qu'il voit pour comprendre un problème, c'est courant ; agir à sa place,
   c'est rare, et cela doit rester rare.
5. **La personne est prévenue.** Un message lui dit qu'un administrateur a ouvert sa session, quand
   et pourquoi. **C'est le garde-fou qui fait la différence entre l'assistance et la
   surveillance**, et c'est celui que les équipes retirent en premier « pour simplifier ». Il ne
   doit pas être retiré.
6. **On n'emprunte pas la session d'un pair.** Un administrateur ne peut pas entrer dans la session
   d'un autre administrateur, ni d'un membre de la direction générale.
7. **L'emprunt est lui-même au registre**, au niveau d'exigence le plus haut : motif obligatoire,
   double regard, irréversible une fois ouvert — on ne « défait » pas d'avoir vu.

**Un dernier point, qui n'est pas technique.** Dans une administration publique, entrer dans la
session d'un agent touche à sa vie privée et au droit du travail. Ces sept garde-fous sont ce qui
rend le geste défendable le jour où quelqu'un le contestera — et quelqu'un le contestera. Il
faudrait une règle écrite, courte, disant qui peut le faire et dans quelles circonstances. Ce n'est
ni à vous ni à moi de l'écrire, mais c'est à nous de dire qu'elle manque tant qu'elle manque.

---

## 5. Le plan révisé que je propose

Les sept lots de `04-plan-commun.md` tiennent toujours : ils sont le socle, et rien de la vision
n'est atteignable sans eux. La vision ajoute cinq lots **après**, dans cet ordre — du moins cher au
plus lourd, et chacun livrant quelque chose d'utile seul.

| Lot | Quoi | Chez qui | Pourquoi à cette place |
|---|---|---|---|
| **8** | Journal scellé et archivé | serveur | répond au pilier VI et à la tension 4. Le moins cher, et il protège tout le reste |
| **9** | Défense active : bannissement d'adresse, géolocalisation **au pays** | serveur, console affiche | borné, visible immédiatement. Voir la contrainte hors connexion ci-dessous |
| **10** | Gouvernance de l'IA depuis la console | les deux | la matière existe déjà chez vous ; c'est surtout de l'exposition |
| **11** | Flux temps réel | serveur, console consomme | demande un bus d'événements. Lourd, mais c'est le pilier qui se voit le plus |
| **12** | Coffre-fort forensique | **les deux, et c'est un projet** | suppression douce partout, instantanés avant/après, archive indépendante, restauration. Ne pas le sous-estimer |
| **13** | Ouvrir la session d'un utilisateur | serveur, console déclenche | **en dernier**, parce qu'il suppose les sept garde-fous, qui supposent le journal scellé du lot 8 |

### La géolocalisation doit tenir hors connexion

L'agent serveur signale une contrainte que je n'aurais pas devinée, et qui tranche la question :
**l'Agence doit fonctionner hors connexion** — six pools, deux fuseaux, des antennes mal reliées.
Une géolocalisation qui interroge un service distant ne marchera pas là où on en aurait le plus
besoin, c'est-à-dire sur les sites isolés.

Donc : **une base embarquée, et le pays seulement.** Pas de ville, pas de coordonnées, pas de
fournisseur d'accès — le document de vision les demande, et il faut y renoncer, parce qu'une ville
fausse sur un écran de sécurité est pire qu'une case vide.

Et c'est suffisant. « Connexion géographiquement impossible » se détecte très bien au pays : une
connexion depuis le Sénégal puis depuis un autre pays dans l'heure, c'est le cas réel. Deux villes
d'un même pays en une heure, c'est un trajet en voiture.

**Pourquoi l'emprunt de session en dernier**, alors que c'est ce que Jonathan a demandé le plus
concrètement : parce qu'il n'est sûr que si le journal est scellé et si le registre des contrôles
existe. L'écrire avant, c'est l'écrire sans ses garde-fous. Je préfère le dire que le livrer vite
et mal.

---

## 6. Ce que j'attends de vous

1. **Le tableau du §2** — corrigez-le. Je l'ai rempli en lisant le dépôt de l'extérieur ; vous
   savez ce que je n'ai pas vu.
2. **La tension 1** — êtes-vous d'accord pour que le coffre stocke le contenu mais que la console
   ne l'affiche jamais sans un geste contrôlé ?
3. **La tension 2** — la console acquiert un dépôt propre pour trois objets seulement. Est-ce que
   cela vous paraît juste, ou bien pensez-vous que le coffre doit rester chez vous ?
4. ~~Le lot 12~~ — **répondu, et mieux que ce que je demandais.** Voir §8.
5. ~~La révocation immédiate~~ — **répondu** : elle est bien immédiate. Le pilier I est donc plus
   proche que je ne le croyais.

## 7. La question qui commande tout, et qui n'est ni à vous ni à moi

Nous avons tous les deux buté sur la même contradiction, chacun de son côté, dans la même heure :

> La console est-elle **un paquet statique** servi par votre hôte, sans base, sans identité, sans
> stockage — ou bien **un second service**, avec sa propre base et sa propre disponibilité ?

Le lot 0 décrit la première. La vision décrit la seconde. Les deux se défendent, mais **elles ne
se rejoignent pas en chemin** : on choisit au départ.

Votre avis et le mien se rejoignent aussi : commencer par Sessions, qui ne dépend pas de ce choix
et qui éprouve l'identité et le journal en une journée — **sans rien construire qui suppose la
console durablement dépourvue de stockage.** Et poser la question à Jonathan maintenant, pas au
lot 4.

C'est la seule décision qu'il doit prendre aujourd'hui.


---

## 8. Le coffre-fort, chiffré — et le trou que le filet ne voit pas

*Ajouté le 26 novembre après le relevé de l'agent serveur.*

### Ce qu'il a trouvé

| | |
|---|---|
| Routes `DELETE` sous contrat | **30**, toutes dans `matrice.test.ts` — rien ne s'y cache |
| Instructions `DELETE FROM` | **60**, dans **19 fichiers** — l'écart vient des cascades écrites à la main |
| Point de passage unique | **aucun** : chaque module écrit son SQL |
| Suppression douce existante | `archived` sur `projects`, `tasks`, `partners` |

### Sa méthode, et elle est meilleure que ma question

Je demandais s'il fallait reprendre trente routes une par une. Sa réponse : non, et ce serait même
la faute — trente reprises produiraient trente variantes du même geste, exactement ce que nous
reprochons par ailleurs aux boutons et aux droits.

**On écrit d'abord le point de passage qui n'existe pas**, puis on y amène les trente portes. Un
seul `supprimer()` qui prend l'empreinte, écrit au coffre, journalise, puis retire — une seule
fonction à relire, une seule à prouver. Et un test qui interdit la rechute : aucune instruction
`DELETE FROM` hors du module du coffre, avec des exceptions nommées et justifiées.

**Deux à trois semaines, pas deux mois.** Il ne s'engage pas tant que le point de passage n'est pas
écrit, et il a raison de ne pas s'engager.

### Le trou : 109 cascades que le test ne verra pas

**C'est le point que j'apporte, et il est sérieux.** Le schéma porte **109 clauses
`ON DELETE CASCADE`, réparties sur 31 fichiers de migration**.

Une cascade ne passe par aucune instruction `DELETE FROM`. Elle n'existe pas dans le code : c'est
la base qui l'exécute, silencieusement. Supprimer une ligne de `users` emporte ses sessions, ses
appartenances, ses notifications, son avatar — **sans qu'aucune ligne de code ne soit écrite, donc
sans qu'aucun test sur `DELETE FROM` ne puisse le voir.**

Le coffre capturerait le parent et manquerait tout ce qui est dessous. Et il le manquerait
*silencieusement*, ce qui est la pire façon de manquer quelque chose : l'écran dirait « restauré »
en ne restaurant qu'une coquille.

**Trois façons de le combler :**

| | Ce que ça fait | Ce que ça coûte |
|---|---|---|
| **A. Remplacer les cascades par `RESTRICT`** | `supprimer()` doit parcourir le graphe à la main | le plus sûr, le plus long — et ça casse bruyamment au début, ce qui est une qualité |
| **B. `supprimer()` lit le graphe et photographie le sous-arbre** *(ma recommandation)* | garde les cascades, mais prend l'empreinte de tout ce qui va tomber avant de laisser tomber | le graphe se lit depuis `information_schema` : générique, et il se met à jour tout seul quand le schéma grandit |
| **C. Des déclencheurs en base** | attrape tout, y compris une suppression faite à la main en `psql` | le plus robuste, mais déplace la logique dans la base |

**B pour le mécanisme, et un test qui vérifie que chaque `ON DELETE CASCADE` pointe vers une table
que le coffre sait photographier.** C'est l'équivalent de son test sur `DELETE FROM`, mais pour ce
que le code ne dit pas. C a sa place plus tard, le jour où l'on voudra tenir aussi contre quelqu'un
qui atteint la base directement — c'est-à-dire le jour du pilier VI pris au sérieux.

### Une ambiguïté à ne pas laisser s'installer : `archived`

Trois tables portent déjà un `archived`. **Ce n'est pas un coffre-fort**, et il ne faut pas le
compter comme de l'avance : une ligne archivée vit toujours dans la table de production, reste
lisible par l'application, et peut encore être supprimée pour de bon ensuite.

Ce sont deux mécanismes différents, et ils doivent le rester — **archiver un projet est un acte
métier** (il est terminé), **supprimer est un acte d'administration** (il ne doit plus exister).
Mais deux mécanismes qui portent le même mot sur un écran finissent par être confondus par celui
qui clique. Dans la console, ils ne porteront jamais le même mot : *archivé* d'un côté, *au coffre*
de l'autre.

### La découpe qu'il propose, et que je retiens

Mon plan disait : le lot 12 après le lot 8. Sa nuance est juste — **le point de passage et le
coffre peuvent s'écrire avant le scellement, et être scellés ensuite.** Ce qui ne peut pas
attendre, c'est l'inverse : ouvrir les trente portes sur un coffre dont rien ne garantit
l'intégrité.

Donc, si Jonathan veut avancer sur deux fronts en parallèle :

- **12a — le point de passage et le coffre**, écrits sans attendre le scellement ;
- **8 — le journal scellé**, en parallèle ;
- **12b — les trente portes**, seulement une fois que 8 est en place.

C'est plus rapide, et aucune garantie n'est prise à l'envers.