# Le service du centre de commande

Le journal scellé — et plus tard le coffre-fort et le registre des contrôles.

Il ne contient **que ce que l'application ne garde pas**. Les comptes, les sessions, les droits
continuent de passer par l'API de l'application en direct, avec la session de la personne
connectée. Ce service n'a pas d'identité d'utilisateur et ne se connecte à rien : **il reçoit**.

---

## Pourquoi il existe

L'application pilotée a un journal, mais il ne peut pas faire foi, pour deux raisons qu'elle
assume elle-même :

- **il est réécrivable** — c'est une table ordinaire, et qui atteint la base la modifie ;
- **sa moitié sécurité s'efface au bout d'un an** — connexions, échecs, verrouillages, droits
  changés : passé ce délai, elle n'en garde rien.

Ce service est donc le seul endroit où un acte de sécurité de plus d'un an existera. Le pilier
« journaux immuables » n'est pas un perfectionnement : il remplace quelque chose qui n'existe pas.

---

## Ce que la chaîne prouve, et ce qu'elle ne prouve pas

| Elle prouve | Elle ne prouve pas |
|---|---|
| qu'aucune entrée n'a bougé **depuis sa réception** | que ce qui a été envoyé était vrai |
| qu'aucune entrée n'a été retirée ou interchangée | que l'application n'était pas compromise |
| qu'un acte manque, quand la numérotation saute | que l'acte a bien été voulu par la personne nommée |

**« Intègre depuis sa réception » est exact ; « preuve irréfutable » ne l'est pas.** La vraie
non-répudiation demanderait que chaque agent signe ses propres actes avec une clé qui n'appartient
qu'à lui — quatre cents clés à distribuer, protéger et renouveler. Le vocabulaire des écrans est
arrêté dans `../docs/08-format-des-evenements.md` et ne variera pas.

Et tant que la clé publique de la source n'est pas installée ici, la signature des lots est
**conservée sans être vérifiée** : la chaîne n'est alors inaltérable que du point de vue de la
console. Le service le dit dans `/sante` plutôt que de laisser croire autre chose.

---

## Le faire tourner

```
npm start          # http://127.0.0.1:4500, base en mémoire
npm test           # 40 tests
npm run typecheck
```

PGlite en mémoire par défaut, PostgreSQL avec `DATABASE_URL`. Le même dialecte, le même code :
l'Agence travaille hors connexion, et une console qui exigerait un serveur de base de données
joignable serait inutilisable là où on en a le plus besoin.

`SECRET_RECEPTION` authentifie la machine qui dépose les lots. Il ne porte aucune identité
d'utilisateur et n'ouvre donc aucune des portes que nous avons refusé d'ouvrir : on ne peut rien
faire avec, à part déposer des actes qui seront scellés tels quels.

---

## Les routes

| | |
|---|---|
| `POST /reception/lots` | reçoit un lot signé, dédoublonne, scelle. Tout ou rien |
| `GET /journal` | lit la chaîne. Dit `tronquee` quand il y en avait plus |
| `GET /verification` | reparcourt toute la chaîne et consigne le résultat |
| `GET /sources` | où en est chaque source, et ce qui lui manque |
| `GET /sante` | nombre d'actes, dernière vérification, et ce qui n'est pas vérifiable |

---

## Le contrat avec l'application

**Elle livre au moins une fois, la console enregistre exactement une fois.** Sa table de sortie
n'efface qu'après acquittement : aucune perte possible, mais des doublons certains si un
acquittement se perd. C'est le bon côté du compromis — *un doublon se reconnaît à son identifiant,
une perte ne se reconnaît à rien*.

La console acquitte **tout** ce qu'un lot portait, doublons compris : sans cela, la table de sortie
ne se viderait jamais de ce qui a déjà été livré.

**L'ordre.** La chaîne scelle dans l'ordre de **réception** et ne peut pas faire autrement. Un acte
en retard arrive au bout, même si sa date est antérieure — vouloir l'insérer à sa place casserait
tout. L'ordre des faits se reconstitue par `occurred_at` et `sequence`, et l'ordre entre deux
sources n'est pas établissable : six pools, deux fuseaux, des horloges locales.

**Les trous.** La source numérote sans jamais sauter — elle compte sur une ligne de table et non
sur une séquence PostgreSQL, précisément pour qu'une transaction annulée ne laisse pas filer un
numéro. *Un trou doit vouloir dire une perte, sinon il ne veut rien dire.* Il s'affiche.

---

## Éprouvé sur de vraies données

Le 26 novembre 2026 : **200 actes réels** lus sur le journal d'ANAT Pilotage, convertis à
l'enveloppe convenue, déposés en deux lots. Chaîne intacte, vérifiée en 8 ms. Le premier lot
renvoyé une seconde fois : **0 retenu, 100 reconnus**, aucun doublon entré, chaîne toujours intacte.

Les 40 tests couvrent ce que l'épreuve ne montre pas : une entrée modifiée directement en base, une
entrée supprimée, deux entrées interverties, une entrée ajoutée au milieu — et dans chaque cas la
vérification désigne le **premier** rang en défaut, parce que tout ce qui précède reste prouvé.

---

## Ce qui n'est pas encore là

- **Le coffre-fort** : il attend le point de passage `supprimer()` côté application. Son champ
  existe déjà dans l'enveloppe, vide — une chaîne scellée ne se migre pas, et un champ absent
  pendant six mois coûterait six mois d'histoire d'une autre forme.
- **La vérification des signatures** : la clé publique de la source n'est pas installée.
- **Le chiffrement des instantanés** : une clé par instantané, détruite plutôt que la donnée. Le
  procédé et ses trois pièges sont dans `../docs/09-les-cles-du-coffre.md`.
- **Le stock froid** : « ne jamais effacer » n'est pas « tout garder dans la même table ».
