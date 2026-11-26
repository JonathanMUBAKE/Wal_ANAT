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
  "severity": "importante",                    // "normale" | "importante"

  // --- qui -------------------------------------------------------------
  "actor_id": "u_alice",
  "actor_name": "Directrice générale",
  "on_behalf_of": null,            // emprunt de session : { "id", "name" } — vide jusqu'au lot 13

  // --- quoi ------------------------------------------------------------
  "org_id": "org_b39c36427aa1",
  "org_name": "ANAT (démonstration)",
  "object_type": "attribution_sheet",
  "object_id": "sht_b81ec33d29f9",
  "summary": "",

  // --- d'où ------------------------------------------------------------
  "ip": "127.0.0.1",
  "country": null,                 // le pays seulement, jamais la ville — vide jusqu'au lot 9
  "user_agent": "node",

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

## 5. Ce qu'il peut commencer

Rien de ce qui précède ne l'empêche d'écrire la table de sortie dès maintenant : `id`, `source`,
`sequence`, `occurred_at`, l'état d'attestation, et l'écriture dans la même transaction que l'acte.

Le format complet ci-dessus ne concerne que **le contenu expédié**, et il est arrêté. S'il voit
un champ qui manque ou un champ de trop, c'est le moment de le dire — après la première entrée
scellée, ce ne sera plus possible.
