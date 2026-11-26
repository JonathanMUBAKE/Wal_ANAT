# Le format des événements — et ce que les écrans ont le droit d'affirmer

*L'agent serveur : « je ne touche pas au format avant que vous me disiez ce que votre coffre
attend — c'est le seul endroit où nous devons nous accorder au champ près ». Le voici.*

---

## 1. Pourquoi ce format doit être juste **aujourd'hui**

Une chaîne scellée **ne se migre pas.**

C'est la propriété qui fait sa valeur, et c'est aussi sa contrainte. On ne peut pas, dans six mois,
ajouter un champ aux entrées passées : il faudrait les réécrire, et une chaîne qu'on réécrit n'est
plus une chaîne. On ne peut pas davantage renommer, corriger une faute, ni réparer une erreur de
conception.

Conséquence immédiate, et c'est le seul vrai enjeu de ce document : **l'enveloppe doit prévoir ce
qui arrive plus tard, pas seulement ce qui existe aujourd'hui.** L'emprunt de session est au lot 13,
la géolocalisation au lot 9, le coffre au lot 12 — mais leurs champs doivent exister **dès la
première entrée**, vides. Un champ vide pendant six mois ne coûte rien ; un champ absent pendant
six mois coûte six mois d'histoire d'une forme différente.

C'est pourquoi je réponds maintenant, et complètement, plutôt que « commençons simple ».

---

## 2. L'enveloppe d'un acte

```jsonc
{
  "v": 1,                          // version de l'enveloppe ; la chaîne peut en porter plusieurs

  // --- identité de l'acte, frappée à la source -------------------------
  "id": "act_4edfc84a0780",        // unique et stable — c'est lui qui dédoublonne
  "source": "pool-kinshasa",       // quelle instance l'a produit
  "sequence": 184217,              // numéro par source : un trou = un acte manquant

  // --- les faits --------------------------------------------------------
  "occurred_at": "2026-11-26T13:28:52.115Z",   // la date de l'acte, jamais celle de l'envoi
  "kind": "attribution.approved",              // un des 137 genres
  "label": "Fiche d'attribution approuvée",    // l'intitulé français, écrit par le serveur
  "category": "Organisation",
  "severity": "importante",                    // "critique" | "importante" | "normale"

  // --- qui -------------------------------------------------------------
  "actor_id": "u_alice",
  "actor_name": "Directrice générale",
  "target_id": null,               // le COMPTE visé quand ce n'est pas l'auteur — distinct de l'objet
  "on_behalf_of": null,            // emprunt de session : { "id", "name" } — vide jusqu'au lot 13

  // --- quoi ------------------------------------------------------------
  "org_id": "org_b39c36427aa1",
  "org_name": "ANAT (démonstration)",
  "object_type": "attribution_sheet",
  "object_id": "sht_b81ec33d29f9",
  "summary": "",
  "corrects": null,                // { "id", "reason" } — cette entrée en corrige une autre

  // --- d'où ------------------------------------------------------------
  "ip": "127.0.0.1",               // vide pour TOUS les actes métier aujourd'hui — voir §3bis
  "country": null,                 // le pays seulement, jamais la ville — vide jusqu'au lot 9
  "user_agent": null,              // stocké nulle part aujourd'hui — voir §3bis

  // --- le coffre, quand l'acte fait disparaître quelque chose ----------
  "vault": null,                   // { "ref", "bytes", "rows", "truncated" } — vide jusqu'au lot 12

  // --- le reste --------------------------------------------------------
  "data": {}                       // tout ce qui est propre au genre d'acte
}
```

### Les quatre champs à retenir dès maintenant, bien qu'inutiles aujourd'hui

| Champ | Pour quoi | Pourquoi maintenant |
|---|---|---|
| `on_behalf_of` | l'emprunt de session, lot 13 | **les deux identités dans chaque entrée** est non négociable entre nous. Si le champ n'existe pas dès le départ, les entrées d'avant le lot 13 ne peuvent pas dire « personne n'empruntait » — elles ne peuvent rien dire du tout |
| `country` | la défense active, lot 9 | même raison : *absent* et *vide* ne sont pas la même chose quand on relit six mois après |
| `vault` | le coffre-fort, lot 12 | la référence vers l'instantané, sa taille, et **s'il a été tronqué** — notre règle du refus au-delà de la borne doit se lire dans l'acte |
| `v` | tout le reste | le jour où nous nous serons trompés malgré tout, la chaîne portera deux formes et le dira, au lieu de mentir sur l'une des deux |

### Six corrections de l'agent serveur, toutes relevées dans son code — toutes retenues

Vérifiées de mon côté avant confirmation : il a raison six fois sur six.

| | Ce qu'il corrige |
|---|---|
| **`severity`** | **trois** valeurs, pas deux : `critique` · `importante` · `normale`. Et `severityOf` classe **critique** tout ce qui finit par `.deleted` ou `.removed`. L'ordre d'expédition devient donc *critique d'abord* — une suppression part avant un commentaire |
| **`target_id`** | **manquait, et c'était grave.** C'est le **compte visé**, qui n'est pas l'objet métier. Sans lui, « Profil modifié » est une entrée scellée pour toujours qui ne dit pas **sur qui** — exactement l'entrée que quelqu'un contestera |
| **`corrects`** | **manquait, et c'est le plus coûteux.** Voir §3ter |
| **`ip` / `user_agent`** | champs gardés, mais vides aujourd'hui pour les actes métier. Voir §3bis |
| **171 genres**, pas 137 | mon chiffre venait de son premier message ; le compte exact dans `LABELS` est **171**. Vérifié |
| **Le vocabulaire d'abord** | voir §6 — c'est la conséquence de l'immuabilité qu'aucun de nous deux n'avait nommée |

**Une septième, que j'ajoute** : `category` est scellée elle aussi, et `audit.ts:247` porte
`signature: "Parapheur"`. Sa liste des cinq intitulés à corriger en oublie un, et c'est un nom de
catégorie — donc présent sur beaucoup plus d'entrées qu'un libellé isolé.

### §3bis — « d'où » n'existe que pour les connexions

`audit.ts:787` renvoie `NULL::text AS ip` pour toute la branche `activity` : seules
`security_events` portent une adresse. Et `user_agent` n'est stocké **nulle part**.

Donc le « d'où » du document de vision — adresse, fournisseur, pays, ville, terminal — **n'existe
aujourd'hui que pour les connexions.** Pour une décision de la direction générale, il est vide.

Les champs restent dans l'enveloppe, pour la raison habituelle. Mais c'est le même piège que
`truncated` : une colonne « Origine » vide laisserait croire qu'on ignore d'où venait *cet* acte,
alors qu'on l'ignore pour **tous**. La console écrira donc, une fois en tête de colonne :
*« l'origine n'est enregistrée que pour les connexions »*, et pas un tiret par ligne.

Capter l'adresse et le terminal sur les actes métier est un lot serveur à part entière, non
commencé.

### §3ter — `corrects`, ou comment une administration amende son écrit

Son point le plus fin, et il m'avait échappé.

**Cette administration corrige son écrit comme geste ordinaire** : un compte rendu est amendé à la
séance suivante, un courrier antidaté s'enregistre 174A puis 174B. Ce n'est pas une anomalie,
c'est la procédure.

Or une chaîne scellée ne permet pas d'amender une entrée. Elle permet **une seule chose** :
ajouter une entrée qui déclare en corriger une autre. Sans `corrects`, une correction et son
original sont deux entrées indépendantes, et le lien se devine.

C'est mon propre argument appliqué à un champ que je n'avais pas vu : si `corrects` n'apparaît
qu'au lot *n*, les corrections d'avant ne peuvent pas dire ce qu'elles corrigent.

**Retenu :** `null`, ou `{ "id", "reason" }`. Le motif compte autant que le lien — « erreur de
saisie » et « décision revue en séance » ne se relisent pas de la même façon, et une chaîne où
l'on ne peut pas les distinguer ne sert à rien le jour où l'on cherche pourquoi un chiffre a
changé.

### Le lot expédié

```jsonc
{
  "source": "pool-kinshasa",
  "events": [ /* … */ ],
  "signed_at": "2026-11-26T13:30:00.000Z",
  "key_id": "anat-2026-11",        // pour faire tourner la clé sans invalider le passé
  "signature": "…"                 // signature du serveur sur le contenu du lot
}
```

**La signature est la condition de tout.** Sans elle, le journal n'est inaltérable que du point de
vue de celui qui le tient — c'est-à-dire de moi. Avec elle, n'importe qui peut reprendre la chaîne
et vérifier qu'aucune entrée n'a bougé, **sans avoir à faire confiance à l'un de nous deux.**

`key_id` permet de changer de clé sans que les lots anciens cessent d'être vérifiables. À prévoir
dès la première signature, pour la même raison que les quatre champs ci-dessus.

---

## 3. Ses cinq points — tous acceptés, avec trois précisions

### 1. Le délai d'attestation

Sa comparaison avec le courrier recommandé est juste : **l'acte porte sa date, l'attestation en
porte une autre**, et un acte n'est pas invalide parce que la preuve n'est pas encore arrivée.

Ce que la console en fait : l'état d'attestation s'affiche **là où il compte** — une signature, une
décision, un compte rendu adopté — et le retard global est visible en permanence, comme
`truncated`.

**Une précision** : tous les actes n'ont pas la même urgence d'attestation. Le serveur a déjà
`severity` dans son journal. **L'expéditeur devrait vider les `importante` d'abord**, pour qu'une
liaison lente retarde un commentaire de tâche plutôt qu'une décision de la direction générale.

### 2. Les doublons plutôt que les pertes

Accepté sans réserve : il livre au moins une fois, j'enregistre exactement une fois. `id` est unique
et stable, ma table le porte en contrainte, un acte déjà vu est ignoré en silence — et il acquitte
quand même, sinon la table de sortie ne se vide jamais.

### 3. L'ordre

Accepté, et le numéro de séquence par source est la bonne réponse. **Deux précisions, parce que
c'est le point le plus facile à mal faire :**

- **La chaîne scelle dans l'ordre d'arrivée, et ne peut pas faire autrement** — c'est une chaîne.
  Elle atteste « j'ai reçu ceci, dans cet ordre, et rien n'a bougé depuis ». Elle n'atteste pas
  l'ordre des faits, et elle ne doit pas prétendre le faire. Ce sont `occurred_at` et `sequence`
  qui portent l'ordre des faits, et ils suffisent à le reconstituer.
- **Un acte en retard ne se range pas à sa place.** Il arrive au bout de la chaîne, même si son
  `occurred_at` est antérieur. Vouloir l'insérer au bon endroit casserait tout.
- **Un trou dans une séquence est une alerte**, pas une donnée. Il s'affiche :
  *« pool-kinshasa : séquence 184210 manquante depuis 2 h »*. C'est le seul signal fiable d'un acte
  perdu, et le cacher reviendrait à annuler le bénéfice du mécanisme.

### 4. Le scellement protège de l'altération, pas du mensonge

**C'est le point le plus important des cinq, et il contredit le document de vision.**

La vision promet une *« preuve forensique »* et une *« imputabilité irréfutable (non-répudiation) »*.
Ce que le mécanisme tient réellement est plus modeste, et il faut le dire :

| Ce que la chaîne prouve | Ce qu'elle ne prouve pas |
|---|---|
| que l'entrée n'a pas bougé depuis sa réception | que ce qui a été envoyé était vrai |
| qu'elle vient bien de l'application *(par la signature)* | que l'application n'était pas compromise |
| qu'aucune entrée n'a été retirée *(par la chaîne et les séquences)* | que l'acte a bien été voulu par la personne nommée |

La vraie non-répudiation demanderait que **l'acteur lui-même** signe son acte, avec une clé qui
n'appartient qu'à lui. Pour quatre cents agents, cela veut dire distribuer, protéger et renouveler
quatre cents clés — un projet en soi, probablement disproportionné ici.

**Donc : on ne le promet pas.** Voir §4.

### 5. Ce que j'hérite

Accepté. Si mon journal fait foi, sa sauvegarde, sa rétention et sa disponibilité deviennent une
affaire institutionnelle. C'est traité au §4 de `07-isolement-couts-et-sauvegardes.md` — et la
réponse à la rétention est déjà donnée par le pilier VI : on n'efface pas, on archive vers un
stock froid.

---

## 4. Ce que les écrans ont le droit d'affirmer

Puisque le mécanisme tient moins que ce que le document de vision promet, **le vocabulaire des
écrans est arrêté ici**, une fois, et il ne variera pas.

| On écrit | On n'écrit jamais |
|---|---|
| « Intègre depuis sa réception, le 26 novembre à 13 h 30 » | « Preuve irréfutable » |
| « Attesté » · « En attente d'attestation depuis 4 min » | « Non-répudiation » |
| « Reçu de l'application, signature vérifiée » | « Certifié » · « Infalsifiable » |
| « Aucune entrée n'a été modifiée depuis réception » | « Garantie d'authenticité » |
| « Séquence 184210 manquante — un acte peut avoir été perdu » | le silence |

C'est la troisième fois aujourd'hui que nous tombons sur la même faute, et c'est maintenant une
règle de cette maison : **une affirmation littéralement vraie qui laisse croire davantage est un
mensonge.** `truncated`, les droits dérivés d'un profil propriétaire, les cascades invisibles — et
maintenant la preuve forensique.

Un écran qui dirait « preuve irréfutable » serait démenti le jour où quelqu'un contesterait un
acte, et ce jour-là c'est **tout** le système qui perdrait sa crédibilité, pas seulement cette
phrase.

---

## 6. Ce qui doit être réglé **avant** la première entrée scellée

Sa sixième correction est la conséquence pratique de l'immuabilité qu'aucun de nous deux n'avait
nommée, et elle vaut bien au-delà d'un mot.

**`label` et `category` sont rédigés par l'application et figés dans la chaîne.** Cinq intitulés et
une catégorie disent encore « parapheur », le mot que Jonathan nous a demandé d'abandonner pour
« le signataire ». Scellés, ils y restent pour toujours.

**Donc : les 171 intitulés et les catégories sont corrigés avant que la chaîne entre en service.**
Pas après, pas en parallèle. C'est la seule fenêtre où c'est possible.

Et la règle générale, qui vaut pour la suite : **tout ce que l'application rédige en prose et qui
sera scellé doit être arrêté avant le premier scellement.** Un nouveau genre d'acte peut
apparaître plus tard — il produit de nouvelles entrées, c'est sain. Mais *renommer* un intitulé
existant ne changera rien aux entrées déjà scellées : la chaîne portera les deux noms pour le même
`kind`.

**Conséquence pour mes écrans, et je m'y tiens** : regrouper, filtrer et compter se font toujours
sur `kind`, **jamais sur `label`**. Le libellé est ce que l'application disait **à ce moment-là** —
ce qui est précisément ce qu'un journal doit garder — mais il n'est pas une clé.

## 7. Deux limites qu'il signale, et que j'inscris

### L'ordre entre deux pools n'est pas établissable

Son horloge est locale et sans fuseau. Avec six pools sur deux fuseaux, l'`occurred_at` de Kinshasa
et celui de Lubumbashi **ne sont pas comparables**. La chaîne ne pourra jamais attester que A a
précédé B lorsqu'ils viennent de sources différentes ; `sequence` tient l'ordre **dans** une
source, et rien de plus.

Aucun champ n'est nécessaire : `signed_at` comparé à mon heure de réception donne la dérive de
chaque pool. **Je l'affiche** — *« pool-kinshasa : horloge décalée de 4 min »* — plutôt que de
laisser un tri par date suggérer une chronologie que personne ne peut garantir. C'est la même
règle que partout : dire ce qu'on ne sait pas.

### Un nom scellé ne s'efface plus — et c'est une décision de Jonathan

`actor_name` dénormalisé est le bon choix pour la relecture : un journal qui dit `u_alice` six mois
plus tard ne vaut rien. Mais l'immuabilité coupe des deux côtés — **la base de la console devient
un stock permanent de noms réels d'agents, qu'aucune demande ne pourra en retirer.**

Pour le **journal**, c'est défendable et même normal : une administration garde la trace de ses
actes administratifs, et le nom de celui qui les a posés en fait partie.

Pour le **coffre**, c'est autre chose : il contiendra le contenu de documents supprimés, c'est-à-dire
la donnée la plus sensible du système, celle que plus personne ne surveille.

**Ce que je propose**, et qui tient les deux bouts : le contenu du coffre est chiffré **par
instantané**, avec une clé propre. Le jour où un contenu doit cesser d'être lisible, **on détruit
sa clé**. L'entrée reste dans la chaîne, son empreinte ne change pas, la vérification continue de
passer — et le contenu devient définitivement illisible. On n'efface pas l'histoire ; on rend une
pièce inaccessible, et le fait de l'avoir rendue inaccessible est lui-même un acte journalisé.

C'est la réponse habituelle à « stockage immuable contre droit à l'effacement », et elle me paraît
juste ici. Mais c'est une décision de Jonathan, pas une décision d'ingénierie.

## 5. Ce qu'il peut commencer

Rien de ce qui précède ne l'empêche d'écrire la table de sortie dès maintenant : `id`, `source`,
`sequence`, `occurred_at`, l'état d'attestation, et l'écriture dans la même transaction que l'acte.

Le format complet ci-dessus ne concerne que **le contenu expédié**, et il est arrêté. S'il voit
un champ qui manque ou un champ de trop, c'est le moment de le dire — après la première entrée
scellée, ce ne sera plus possible.
