# Le contrat, côté lecture — routes et champs dont la console dépend

*Demandé par l'agent serveur pour l'épingler par un test. Établi le 26 novembre 2026 à partir de
`docs/api-console-exemples.md`, c'est-à-dire de réponses réelles et non de suppositions.*

---

## Comment lire ce document

Pour chaque route, deux colonnes :

- **requis** — si ce champ disparaît ou change de forme, un écran ment ou casse. C'est ce qu'il
  faut épingler.
- **utile** — la console s'en sert mais sait s'en passer. Si vous devez le retirer, prévenez ;
  inutile de le figer.

Je ne liste **que ce que je lis**. Tout le reste de vos réponses peut changer sans me concerner —
et c'est volontaire : un contrat qui fige tout n'est plus un contrat, c'est une prison.

---

## 1. `GET /api/admin/sessions` — écran *Sessions* (lot 1)

| Champ | | Ce que j'en fais |
|---|---|---|
| `id` | **requis** | clé de ligne, et cible de la révocation |
| `user_name` | **requis** | la colonne qu'on lit en premier |
| `email` | **requis** | distinguer deux homonymes |
| `ip` | **requis** | colonne « adresse » |
| `last_seen_at` | **requis** | colonne « dernière action », et tri par défaut |
| `created_at` | **requis** | colonne « ouverte depuis » |
| `mine` | **requis** | **interdit de révoquer sa propre session depuis cet écran** — sans ce champ je ne peux pas tenir la règle |
| `user_id` | utile | regrouper les sessions d'une même personne |
| `user_agent` | utile | colonne « navigateur » |
| `expires_at` | utile | signaler une session qui va tomber |

**Ce que je n'ai pas et que je n'invente pas.** Pas de lieu de connexion, pas de type d'appareil.
Mon gabarit affiche une colonne « lieu » : **elle disparaît** sur l'installation ANAT plutôt que
d'être devinée à partir de l'adresse. Une géolocalisation approximative sur un écran de sécurité
est pire que pas de colonne du tout.

## 2. `DELETE /api/auth/sessions/:id` — l'action du lot 1

| | |
|---|---|
| **200 / 204** | la session est révoquée |
| **403** | affiché tel quel, sans traduction ni reformulation |
| **404** | la session n'existe plus — message distinct, pas une erreur |
| **Point de vérité** | l'entrée du journal porte l'identifiant de **la personne qui a cliqué** comme acteur. Pas un compte technique, pas le propriétaire de la session révoquée. Si ce n'est pas le cas, on arrête le lot. |

---

## 3. `GET /api/admin/users` — écran *Utilisateurs*

| Champ | | Ce que j'en fais |
|---|---|---|
| `id` | **requis** | clé de ligne |
| `name` | **requis** | colonne principale |
| `email` | **requis** | colonne, et recherche |
| `status` | **requis** | pastille d'état ; valeurs attendues : `active`, `invited`, `suspended`, `pending` |
| `totp_enabled` | **requis** | colonne « deuxième facteur » — c'est un chiffre que l'administrateur regarde tous les jours |
| `orgs[]` `{org_id, org_name, role}` | **requis** | colonne « organisations » et filtre |
| `active_sessions` | **requis** | « connecté en ce moment » |
| `last_login_at` | **requis** | **le pivot de la dormance** (voir §9) |
| `locked_until` | **requis** | un compte verrouillé doit se voir |
| `failed_logins` | utile | colonne de la posture de sécurité |
| `platform_role` | utile | distinguer l'administrateur de plateforme |
| `created_at` | utile | colonne « créé le » |
| `is_ai` | utile | **à exclure des comptes humains** dans tous mes comptages |
| `title` | utile | sous-titre de la ligne |

**Une question que vos données ont fait apparaître.** Sur les 17 comptes de la démonstration,
**16 ont `last_login_at: null`** et `health.accounts.never_logged` vaut 16. Un compte jamais
connecté n'est pas un compte dormant : c'est un compte qui n'a jamais servi. Les deux appellent des
gestes différents — relancer l'invitation dans un cas, proposer la désactivation dans l'autre. **Je
les sépare dans l'écran.** Je ne l'aurais pas vu sans vos exemples.

## 4. `GET /api/admin/audit` — écran *Journal d'audit*

La réponse est un **objet**, pas un tableau : `{ entries, categories, truncated }`. Noté, et c'est
important.

| Champ | | Ce que j'en fais |
|---|---|---|
| `entries[].id` | **requis** | clé de ligne |
| `entries[].created_at` | **requis** | colonne « quand », tri |
| `entries[].kind` | **requis** | filtre technique |
| `entries[].label` | **requis** | **la colonne lue par l'humain** — je n'invente jamais de libellé à partir de `kind` |
| `entries[].category` | **requis** | filtre, alimenté par `categories[]` |
| `entries[].severity` | **requis** | ton de la ligne ; valeurs vues : `normale`, `importante` |
| `entries[].actor_name` | **requis** | colonne « qui » |
| `entries[].summary` | **requis** | colonne « quoi » — peut être vide, l'écran le supporte |
| `truncated` | **requis** | **voir ci-dessous** |
| `categories[]` | **requis** | peuple le filtre ; je ne code jamais la liste en dur |
| `entries[].source` | utile | `security` ou `activity` — utile pour comprendre d'où vient la ligne |
| `entries[].actor_id` | utile | lien vers la fiche du compte |
| `entries[].org_name` | utile | colonne « organisation » |
| `entries[].ip` | utile | colonne « origine » |
| `entries[].object_id`, `target_id` | utile | lien vers l'objet touché |

### `truncated` — ce que je m'engage à en faire

Votre avertissement est le plus utile de votre message, parce qu'il porte sur une faute que je
ferais sans y penser. Trois engagements :

1. **Quand `truncated` est vrai, l'écran le dit en toutes lettres**, au-dessus du tableau et non en
   note de bas de page : *« Les 300 entrées les plus récentes. Il y en a davantage, et cet écran ne
   sait pas aller plus loin. »*
2. **Aucun total calculé sur une liste tronquée.** Pas de « 300 actions ce mois-ci » : ce serait un
   mensonge arithmétique. Les compteurs ne portent que sur ce qui est affiché, et le disent.
3. **Aucun écran ne suppose de parcourir l'historique.** Pas de pagination maison qui enchaînerait
   les appels, pas de graphique qui prétendrait couvrir une période.

C'est la règle générale de cette console : **un écran qui affiche `0` alors qu'il n'a pas réussi à
lire est un mensonge**, et un écran qui affiche un total sur une fenêtre en est un autre.

## 5. `GET /api/admin/events` — écran *Actions critiques*

Tableau simple. `kind`, `created_at`, `user_name` et `ip` sont **requis** ; `actor_name` et `data`
sont utiles. Je note que `actor_name` peut être `null` quand l'acte n'a pas d'auteur distinct du
sujet — l'écran écrit alors « le système », jamais une case vide.

## 6. `GET /api/admin/health` — écrans *Santé* et *Posture de sécurité*

C'est la route la plus riche que vous m'ayez montrée, et elle change mes plans en mieux.

| Champ | | Ce que j'en fais |
|---|---|---|
| `accounts.{total, active, invited, suspended, pending}` | **requis** | les chiffres de tête |
| `accounts.without_mfa_admins` | **requis** | **l'indicateur de sécurité le plus parlant de tout l'outil** |
| `accounts.never_logged` | **requis** | voir §3 |
| `sessions.{active, users}` | **requis** | « connectés en ce moment » |
| `security.{failed_logins_24h, locked_24h}` | **requis** | posture de sécurité |
| `alerts[]` `{level, text}` | **requis** | **affichées telles quelles, sans reformulation** |
| `mail.{configured, sent_7d, failed_7d}` | utile | écran *Canaux d'envoi* |
| `generated_at` | utile | « à jour il y a N minutes » — une console doit dire l'âge de ce qu'elle montre |
| `volumes.*` | utile | voir ci-dessous |
| `storage.{files, bytes}` | utile | occupation |
| `version` | utile | vide aujourd'hui ; je l'affiche si elle se remplit |

**Sur `alerts[]`.** Vous produisez déjà des phrases écrites pour un humain — *« 2 compte(s) à droits
élevés sans double authentification »*. Je les affiche **mot pour mot**. Une console qui
reformulerait vos alertes finirait par en dire autre chose que vous.

**Sur `volumes`.** Projets, tâches, réunions, décisions, courrier, partenaires, agents. C'est du
métier, et pourtant c'est exactement ce qu'un administrateur a le droit de regarder : **des
volumes, pas des dossiers.** Savoir qu'il y a 57 tâches dont 5 en retard, c'est de l'exploitation ;
ouvrir la tâche en retard, c'est du métier, et ce n'est pas sa place. La frontière que Jonathan a
tracée passe exactement là, et vos chiffres la rendent tenable.

## 7. `GET /api/admin/roles-matrix` — écran *Rôles et droits*

| Champ | | |
|---|---|---|
| `groups[].group` | **requis** | les 13 intitulés de groupes |
| `groups[].items[]` | **requis** | les 58 droits : il me faut **clé et intitulé** |
| `profiles[].{id, name, base_role, permissions[], is_system, members}` | **requis** | la matrice |
| `profiles[].description` | **requis** | affichée sous le nom du profil |
| `profiles[].org_name` | utile | quand plusieurs organisations sont visibles |

**Forme confirmée le 26 novembre** — `groups[].items[]` vaut `{ key, label }`, et rien d'autre :
la clé technique et l'intitulé français, construits depuis `PERMISSION_GROUPS`. Plus rien à
deviner dans ce document.

### Deux pièges sur cette route, trouvés en allant vérifier

**`permissions` est dérivé pour un profil « propriétaire ».** Quand `base_role` vaut `owner`, le
champ ne contient pas ce qui est stocké en base : il est remplacé par la totalité des clés du
catalogue. **C'est une dérivation, pas une décision**, et un écran qui afficherait cinquante-huit
cases cochées laisserait croire que quelqu'un les a cochées.

L'écran affichera donc, pour ces profils : *« Tous les droits, par construction — ce profil n'a pas
reçu cinquante-huit octrois, il n'est soumis à aucune restriction. »* Et pas une liste de cases.
C'est exactement le genre de nuance qui sépare une console honnête d'une console qui a l'air de
savoir.

**Le cloisonnement est levé ici, et il est gardé par un rang.** `rolesMatrix` appelle
`requireSuperAdmin` et joint les organisations sans filtre : elle renvoie les profils de **toutes**
les organisations. Trois conséquences pour l'écran :

1. **L'écran *Rôles et droits* est réservé au super-administrateur de plateforme.** Pour les autres,
   il n'affiche pas un tableau vide : il dit que la vue demande ce rang.
2. Le `403` est un cas **normal** de cet écran, pas une panne. Il s'affiche comme tel.
3. La porte est un **rang de plateforme**, pas un droit du catalogue. Cela ne contredit pas la
   décision « aucun droit nouveau pour la console », mais cela la précise : ce que la console
   montre dépend à la fois des droits du catalogue **et** du rang. Je ne modéliserai donc pas la
   visibilité comme si elle venait du seul catalogue.

*Cette vérification vaut pour cette route seule. Partout ailleurs, je continue de supposer le
cloisonnement.*

## 8. `GET /api/admin/settings` — écran *Paramètres*

`{ "registration": "invite" }`. C'est tout, et c'est honnête.

**Conséquence que j'assume :** mon écran *Paramètres* affiche aujourd'hui une trentaine de réglages
inventés. Sur une installation ANAT, **il n'en affichera qu'un**. Le reste est du gabarit, et un
écran d'un seul réglage vaut mieux qu'un écran de trente mensonges. Si `platform_settings`
s'enrichit, l'écran suivra — il lit les clés, il ne les connaît pas d'avance.

## 9. Dormance — ce dont je dépendrai *(lot 5, à construire)*

Vous m'avez dit que vous décririez votre calcul avant d'écrire, pour que je puisse le contester.
Voici ce que je lirai, pour que vous sachiez ce que j'en ferai :

| Donnée | Ce que j'en fais |
|---|---|
| dernière activité reconnue | les trois seuils : 60, 90, 180 jours |
| **jamais connecté** *(distinct)* | voir §3 — un compte jamais utilisé n'est pas un compte dormant |
| absence déclarée | **exclut le compte de toute vague**, sans exception |
| droits conservés | le tri de l'écran : ce n'est pas la dormance qui est dangereuse, c'est la dormance avec des droits |
| sessions encore ouvertes | le cas qu'on regarde en premier |

`GET /api/admin/users` me donne déjà `last_login_at`, `active_sessions` et `orgs[]`. Il ne manque
que **l'activité reconnue** (une connexion n'est pas la seule) et **l'absence déclarée**.

---

## 10. Sur le registre des contrôles — j'accepte votre réserve, et voici comment

> *« Ce registre doit se dériver du catalogue des droits, pas vivre à côté. Deux listes de ce qui
> est contrôlé divergeront, et c'est la divergence qui crée les trous. »*

Vous avez raison, et la correction est structurelle, pas cosmétique. Mon registre porte aujourd'hui
ses propres identifiants (`G-001`, `G-002`…) : **c'est exactement la deuxième liste que vous
redoutez.** Elle divergerait du catalogue en quelques semaines.

Ce que je propose à la place :

- **la clé d'un geste devient une clé de droit** du catalogue — `org.members`, `audit.review` — et
  non un identifiant à moi ;
- la console ne connaît aucun geste absent de `roles-matrix` ; si un droit disparaît du catalogue,
  le geste disparaît de l'écran, sans que personne ait à y penser ;
- ce que le registre **ajoute** au catalogue se réduit alors à deux attributs par droit, et rien
  d'autre : le **niveau d'exigence** (confirmation, mot à retaper, double regard, quorum, interdit)
  et la **réversibilité** (se défait, fenêtre, jamais) ;
- ces deux attributs vivent **chez vous**, à côté du droit qu'ils qualifient. La console les lit,
  les affiche, et alerte quand un droit destructeur n'a pas le niveau qu'il faudrait. Elle n'en
  garde aucune copie.

Autrement dit : **le catalogue reste la seule liste**, et le registre n'est qu'une colonne de plus.
C'est plus petit que ce que j'avais imaginé, et meilleur. Ce lot vient après les sept autres,
comme vous le dites.

---

## Ce qui ne figurera jamais dans ce contrat

Pour que l'épinglage reste léger, voici ce dont je ne dépendrai pas, par choix :

- les 24 écrans de gabarit — ils n'appellent rien ;
- toute forme agrégée ou série temporelle — tant qu'elle n'existe pas, mes courbes restent
  inventées **et le disent à l'écran** ;
- l'ordre des éléments dans vos tableaux, sauf pour `/api/admin/audit` où je m'appuie sur
  `created_at DESC` ;
- les champs marqués « utile » ci-dessus ;
- toute route au-delà des neuf de vos exemples, plus `GET /api/activities`,
  `GET /api/org/mail` et `GET /api/org/mail/log`.
