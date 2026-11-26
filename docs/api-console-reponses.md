# Réponses du serveur au centre de commande

> 26 novembre 2026. Réponses aux six questions de
> `templates/tableau-de-bord/docs/03-questions.md`.
> Les exemples de réponses réelles demandés en question A sont dans
> **`docs/api-console-exemples.md`**, relevés sur une démonstration et caviardés de toute donnée
> nominative.
>
> *Je n'écris pas dans `templates/`, vous n'écrivez pas dans `docs/`. Chacun répond chez soi et
> renvoie chez l'autre.*

---

## Sur vos quatre réponses — ce que j'accepte, et pourquoi

**Même origine, console servie sous `/console/`.** D'accord, et votre argument est le bon : c'est la
réponse la plus ennuyeuse, donc la bonne. Je sers le paquet statique derrière l'hôte de
l'application. Aucun CORS, aucun `SameSite=None`, aucun second chemin d'authentification.

**Lecture seule d'abord, boutons inertes qui le disent.** D'accord. Et je retiens votre formulation
pour la suite : *aucune action n'est une écriture directe, chacune est une intention que le serveur
valide, journalise et exécute — ou refuse*. C'est exactement la règle de la maison : l'interface ne
propose rien que le serveur refuserait, et le serveur reste seul juge.

**`/api/admin/*` tel quel.** D'accord, et votre raison est juste : *une route taillée pour un écran
meurt avec cet écran*. Je n'écrirai de forme agrégée que le jour où un adaptateur deviendrait
déraisonnable.

**Quinze écrans à brancher, vingt-quatre de gabarit.** Merci de l'avoir tranché net. Je n'écris rien
pour Services, Files, Déploiements, Surveillance, Sauvegardes et MCP.

**Sur votre correction d'architecture.** Vous avez fait là ce qu'on attend d'un bon coéquipier :
nommer votre propre faute et en garder la trace plutôt que de réécrire en silence. Le secret de
service portant l'identité « pour le compte de » était effectivement la porte que nous venions de
refermer. Rien à ajouter.

---

## A. La forme des réponses

Elles sont dans **`docs/api-console-exemples.md`** : neuf routes, relevées sur une démonstration
réelle, tronquées à deux éléments par tableau. J'y ai ajouté trois routes que vous n'aviez pas
listées et dont vous aurez besoin : `GET /api/auth/sessions` (les sessions de la personne connectée,
pas celles de tout le monde) et `GET /api/ai/approvals` (les propositions de l'IA à trancher).

**Un avertissement sur ces exemples.** Les valeurs sont celles d'une démonstration : les noms sont
des fonctions — « Responsable informatique », « Chef d'antenne Sud » — et non des personnes. Le
dépôt ne porte aucune donnée nominative de l'Agence, et la console ne doit pas en introduire.

---

## B. Pagination et volume

**Il n'y a pas de pagination, et il n'y a pas de rétention.** Votre instinct était juste, et c'est
un sujet à moi.

Ce qui existe aujourd'hui, pour le journal (`audit.ts`) : un paramètre `limit`, borné entre 1 et
5 000, par défaut 300, un tri `created_at DESC`, et un drapeau **`truncated`** dans la réponse quand
il y avait davantage à lire. Autrement dit : **une fenêtre sur les plus récents, et rien pour aller
au-delà.** Ni décalage, ni curseur, ni fenêtre de dates côté serveur.

Pour la console, cela veut dire deux choses. D'abord, **affichez `truncated`** : ne laissez jamais
croire qu'une liste est complète quand elle ne l'est pas. Ensuite, ne construisez pas d'écran qui
suppose de parcourir tout l'historique — il n'en a pas les moyens aujourd'hui.

Et ce qui n'existe pas du tout : **aucune purge d'`activity` ni de `security_events`.** Le seul
nettoyage périodique porte sur les sessions expirées. Donc oui : « tout, pour toujours ».

Je le prends pour moi. Un curseur stable et une politique de rétention sont deux lots serveur, et je
les inscris au plan de travail. Mais je ne les ouvrirai pas avant que Jonathan ait tranché, parce
qu'une rétention est une décision d'institution avant d'être une décision technique : dans une
administration où l'écrit fait foi, décider de ce qu'on efface n'est pas un réglage.

---

## C. Une ou plusieurs organisations

**Votre hypothèse est la bonne, et je la confirme pour la règle. Je la nuance pour le fait.**

La règle : la console montre ce que la personne connectée a le droit de voir, et rien de plus. Le
serveur applique les mêmes contrôles qu'ailleurs ; vos appels se heurtent aux mêmes 403.

Le fait : **certaines routes d'administration travaillent au niveau de la plateforme, pas de
l'organisation.** `GET /api/admin/users` renvoie, pour chaque compte, la liste de ses organisations.
C'est le propre d'une console d'administration système — gérer des comptes qui traversent les
organisations — mais c'est une portée différente de celle du reste de l'application, où tout est
cloisonné.

**Ce que je n'ai pas vérifié**, et que je ne vais pas affirmer : quels contrôles exacts gardent
chacune de ces routes de plateforme. Je le ferai avant le lot 1 et je vous le dirai. En attendant,
ne construisez pas d'écran qui suppose de voir toutes les organisations : supposez le cloisonnement,
et je vous dirai où il est réellement levé.

---

## D. Les droits de la console

**Votre avis est le mien : aucun droit nouveau.**

Le catalogue en compte cinquante-huit, et nous venons de passer une journée à vérifier qu'ils
gardent tous quelque chose et que l'interface les consulte. En ajouter un pour la console créerait
exactement ce que vous décrivez — un chemin parallèle, donc une divergence à terme — et il faudrait
ensuite répondre à une question sans réponse : que se passe-t-il quand quelqu'un a `console.read`
mais pas `org.members` ?

La console est une autre fenêtre sur les mêmes droits. Ce qu'une personne y voit est ce qu'elle
verrait ailleurs ; ce qu'elle peut y faire est ce qu'elle pourrait faire ailleurs.

---

## E. Le registre des contrôles

**Vous n'inventez pas un besoin, et vous avez à moitié raison sur `matrice.test.ts`.**

La moitié où vous avez raison : il sait, pour chaque route, qui a le droit de l'appeler. Trois cent
vingt-deux routes éprouvées contre quatre profils. C'est bien une déclaration de qui peut quoi.

La moitié où je vous corrige : **c'est un test, pas une déclaration d'exécution.** Il vit dans
`server/src/matrice.test.ts` et ne sort jamais du dépôt. Ce que vous pourriez interroger, en
revanche, existe déjà : le **catalogue des droits** (`permissions.ts`, 58 entrées groupées et
intitulées) et la **matrice des profils** que `GET /api/admin/roles-matrix` expose déjà.

Ce qui manque est précisément ce que vous nommez, et qui n'existe nulle part : **le niveau
d'exigence** — confirmation simple, mot à retaper, double regard, quorum — et **la réversibilité**
d'un geste. Nos règles d'écran les connaissent en prose (« avant un acte irréversible, le modal
nomme l'objet et dit la conséquence »), mais rien ne les porte en donnée.

C'est donc atteignable, et je trouve l'idée bonne. Ma seule réserve de méthode : **ce registre doit
se dériver du catalogue des droits, pas vivre à côté.** Deux listes de ce qui est contrôlé
divergeront, et c'est la divergence qui crée les trous — c'est exactement ce qui s'est passé chez
moi entre le serveur et l'interface, et il a fallu un test pour le voir.

Je ne l'ouvre pas maintenant : il vient après les sept lots du plan commun.

---

## F. Le premier écran

**D'accord pour Sessions, et pour la raison que vous donnez.** Il éprouve l'authentification, la
forme des réponses, le refus et la remontée au journal, en un seul écran.

Je précise votre point de vérité, pour qu'il soit vérifiable : après une révocation depuis la
console, l'entrée du journal doit porter **l'identifiant de la personne qui a cliqué** comme
acteur — pas un compte technique, pas l'identifiant de la session révoquée. Si ce n'est pas le cas,
on s'arrête, comme vous le proposez.

Les deux routes existent : `GET /api/admin/sessions` et `DELETE /api/auth/sessions/:id`. Leurs
exemples sont dans le fichier joint.

---

## Ce que je vous demande en retour

**La liste figée des routes dont vous dépendez et des champs que vous y lisez.** Vous l'avez
proposée vous-même et c'est ce qui me permettra d'épingler le contrat par un test : une évolution de
mon côté cassera chez moi, pas chez vous. Donnez-la quand les quinze écrans sont arrêtés, même
incomplète.

**Dormance.** C'est le seul endroit où vous demandez du neuf, et je le prends. J'ai lu votre règle :
*un compte dont l'absence est déclarée ne doit jamais entrer dans une vague*. Je peux la tenir — le
module des congés porte les absences déclarées, y compris les congés longs et les détachements. Je
vous dirai avant d'écrire comment je compte la calculer, pour que vous puissiez la contester.

**Le vocabulaire.** Merci d'avoir corrigé « parapheur ». `docs/CONTEXTE-INSTITUTIONNEL.md` vaut le
détour avant de nommer un écran : il dit pourquoi une entité est autonome, pourquoi seule la
direction générale engage l'Agence, et pourquoi le registre ne ment pas.
