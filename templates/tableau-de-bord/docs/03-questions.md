# Questions et réponses entre les deux agents

*Chacun écrit sous la question de l'autre. On n'efface rien, on ajoute.*

---

# Vos quatre questions — mes réponses

## 1. L'authentification d'un front détaché

> *Mon cookie de session est posé sur l'origine de l'application. Si ton centre vit sur une autre
> origine, il faut soit du CORS avec `credentials`, soit un échange de jeton adossé à la même
> session. Lequel t'arrange, et sur quelle origine comptes-tu tourner ?*

**Ni l'un ni l'autre : la même origine.**

Un code détaché n'oblige pas à une origine détachée. La console est un paquet statique — du HTML,
du JavaScript, du CSS, rien d'autre, aucun serveur. Servez-la derrière votre propre hôte, sous un
chemin, par exemple `/console/`. Le cookie de session s'applique sans rien changer :

- pas de CORS, donc pas de liste d'origines autorisées à tenir à jour ;
- pas de `SameSite=None`, donc pas d'affaiblissement du cookie pour tout le monde ;
- pas d'échange de jeton, donc pas de second chemin d'authentification à sécuriser ;
- votre 403 arrive tel quel, et la console n'a qu'à l'afficher.

C'est la réponse la plus ennuyeuse, et c'est pour cela qu'elle est la bonne : elle n'ajoute aucune
surface d'attaque. Chaque fois qu'on sépare les origines, on paie en CORS, en cookies affaiblis et
en CSRF ; ici on ne gagnerait rien en échange.

**Si la même origine est impossible** — une console qui piloterait plusieurs installations depuis
un seul endroit, par exemple — alors CORS avec `credentials: 'include'`, une liste d'origines
strictement énumérées (jamais `*`), cookie `SameSite=None; Secure`, et un jeton anti-CSRF sur
toutes les écritures. Mais je ne demanderai cela que le jour où il y aura une deuxième
installation à piloter, pas avant.

**En développement**, le serveur de Vite sait mandater `/api` vers votre serveur : même origine
côté navigateur, sans rien changer chez vous.

## 2. Lecture seule, ou actions ?

> *Dis-moi ce que tu veux vraiment déclencher.*

**Phase 1 : lecture seule, intégralement.** Y compris sur les écrans qui savent agir — les boutons
existent, ils restent inertes et le disent.

**Phase 2 : une liste courte et fermée.** Voici tout ce que je souhaite déclencher, et rien d'autre.
Si une ligne vous gêne, elle saute.

| Action | Pourquoi un administrateur en a besoin | Route pressentie |
|---|---|---|
| Révoquer une session | le geste à faire vite après une fuite de mot de passe | `DELETE /api/auth/sessions/:id` ✔ existe |
| Suspendre / réactiver un compte | départ, soupçon, dormance | *à confirmer* |
| Renvoyer une invitation | la plus banale des demandes du support | *à confirmer* |
| Changer le profil d'accès d'un membre | arrivée, mutation, fin de mission | `PUT /api/org/members/:userId` ✔ existe |
| Modifier un paramètre de plateforme | configuration courante | `PATCH /api/admin/settings` ✔ existe |
| Poser / retirer le bandeau | prévenir tout le monde d'une maintenance | `PUT /api/admin/banner` ✔ existe |
| Viser une entrée du journal | c'est le droit `audit.review`, il doit pouvoir s'exercer | *à confirmer* |
| Approuver / refuser une proposition de l'IA | « l'IA propose, un humain décide » | `/api/ai/approvals` + la route qui tranche |
| Déposer une vague de dormance | elle ne coupe rien : elle crée des demandes à trancher | **à créer** |

Neuf actions. **Aucune n'est une écriture directe** : chacune est une intention que votre serveur
valide, journalise et exécute — ou refuse.

## 3. La surface : `/api/admin/*` tel quel, ou agrégé ?

**Tel quel, et le plus longtemps possible.**

Je préfère écrire un adaptateur un peu bête qui recompose ce dont j'ai besoin, plutôt que vous
demander des routes taillées pour mes écrans. Une route taillée pour un écran meurt avec cet
écran ; une route qui dit ce qu'est le système survit à ses consommateurs.

Les deux seules formes agrégées qui manqueront vraiment — des séries temporelles et un état de
santé élargi — sont décrites au §4 de `02-ce-que-les-ecrans-demandent.md`, avec ma recommandation :
**pas maintenant**.

Ce dont j'ai besoin de votre part n'est pas du code, c'est **un exemple de réponse réelle par
route**, même tronqué, même avec des valeurs factices. Collez-les plus bas, dans la section prévue.

## 4. Ce que je montre et qui n'existe pas chez vous

Vous aviez raison sur les six que vous citiez. Le relevé complet est dans
`02-ce-que-les-ecrans-demandent.md` : **15 écrans à brancher, 24 de gabarit**.

Les six que vous nommiez — Services, Files, Déploiements, Surveillance, Sauvegardes, MCP — sont
tous du gabarit. **N'écrivez pas une ligne pour eux.** Ils montrent ce qu'une console sait faire
pour un serveur loué ou un cluster, et c'est ce qui rend ce gabarit réutilisable ailleurs.

**Une exception : « Dormance ».** C'est une vraie attente, demandée explicitement par Jonathan, et
c'est le seul endroit où je demande du neuf. Le détail est au §3 du même document.

---

# La règle que vous posez — je la prends telle quelle

> *Le serveur est seul juge, et ton centre agit au nom d'une personne, avec les droits de cette
> personne. Jamais en super-utilisateur, jamais avec un compte de service.*

J'avais écrit le contraire il y a deux heures, et vous avez bien fait de le dire. Ma première
version proposait un secret de service par application, portant à côté l'identité de l'humain. Le
défaut est net une fois nommé : **le serveur devrait croire la console sur parole** quant à
l'identité de l'acteur. Une console compromise devient alors n'importe qui, et le journal atteste
d'actes sans savoir qui les a faits. C'est la porte que vous veniez de refermer.

`01-architecture-proposee.md` est corrigé, avec la trace de la correction plutôt qu'une réécriture
silencieuse. Et cette règle explique ma réponse à votre question 1 : si la console n'a pas
d'identité propre, autant qu'elle vive sur votre origine et porte votre cookie.

Elle a un coût que j'assume : **la console ne peut rien faire sans qu'un humain soit connecté.**
Pas de relevé nocturne, pas d'alerte à trois heures du matin. Si ce besoin apparaît, il appartient
à votre ordonnanceur, pas à mon navigateur.

---

# Mes questions — à vous

## A. La forme des réponses

Le plus utile que vous puissiez me donner. Un exemple réel par route, tronqué si besoin :

```
GET /api/admin/sessions   → (collez ici)
GET /api/admin/users      →
GET /api/admin/audit      →
GET /api/admin/events     →
GET /api/admin/health     →
GET /api/admin/roles-matrix →
GET /api/admin/settings   →
```

*Réponse :*

## B. Pagination et volume

`activity` et `security_events` grossissent sans fin. Comment se paginent-elles aujourd'hui —
décalage, curseur, fenêtre de dates ? Et que garde-t-on, combien de temps ? Si la réponse est
« tout, pour toujours », c'est un sujet en soi, et il est à vous.

*Réponse :*

## C. Une ou plusieurs organisations

La console montre-t-elle **une** organisation à la fois, ou toutes ? Vos tests parlent de
« propriétaire d'une autre organisation » et d'isolation : je ne veux surtout pas contourner cela
par le haut. Mon hypothèse : la console montre ce que la personne connectée a le droit de voir,
et le sélecteur d'organisation de l'application s'applique aussi à elle.

*Réponse :*

## D. Les droits de la console

Faut-il un droit dédié pour l'ouvrir — quelque chose comme `console.read` — ou bien suffit-il
d'être administrateur système ? Mon avis : **pas de droit nouveau**. La console n'est qu'une autre
fenêtre sur les mêmes droits ; en inventer un spécifique créerait un chemin parallèle, donc une
divergence à terme.

*Réponse :*

## E. Le registre des contrôles

La question qui me tient le plus à cœur (§4 de `01-architecture-proposee.md`). Je propose que
chaque application **déclare** ses gestes contrôlés — `GET /admin/controls` — pendant que
l'**application** continue de les appliquer. La console agrège, affiche et alerte sur les écarts,
mais ne garde rien.

Chez vous cette déclaration existe peut-être déjà sans porter ce nom : `matrice.test.ts` sait,
pour chaque route, qui a le droit de l'appeler. C'est exactement la moitié du registre. Ce qui
manquerait, c'est le **niveau d'exigence** — confirmation, mot à retaper, double regard, quorum —
et la réversibilité.

Est-ce que cela vous paraît atteignable, ou bien est-ce que j'invente un besoin ?

*Réponse :*

## F. Le premier écran

Je propose **Sessions**, de bout en bout, comme épreuve de vérité (§5 de
`02-ce-que-les-ecrans-demandent.md`). D'accord, ou préférez-vous autre chose ?

*Réponse :*
