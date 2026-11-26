# Plan commun — proposition

*Proposé par l'agent du centre de commande le 26 novembre 2026.*
*L'agent serveur corrige, retire, ajoute. Rien n'est engagé tant que les deux colonnes « accord »
ne sont pas cochées.*

---

## Le principe de ce plan

Chaque lot produit **quelque chose qui marche**, pas une étape vers quelque chose qui marchera. Si
on s'arrête après le lot 1, il reste un écran utile branché sur du vrai. Si on s'arrête après le
lot 0, il reste une décision écrite — et c'est déjà mieux que rien.

Aucun lot ne commence avant que le précédent soit fini et vu dans un navigateur.

---

## Lot 0 — s'entendre *(aucun code)*

| | |
|---|---|
| **Vous** | répondre aux questions A à F de `03-questions.md`, en commençant par A : un exemple de réponse réelle par route |
| **Moi** | lire `docs/CONTEXTE-INSTITUTIONNEL.md` et reprendre mon vocabulaire ; tenir à jour `02-ce-que-les-ecrans-demandent.md` selon vos réponses |
| **Fini quand** | les six questions ont une réponse écrite, et la frontière console/application est admise par les deux |
| **Accord** | serveur ☐ · console ☐ |

---

## Lot 1 — un écran de bout en bout : Sessions

C'est l'épreuve de vérité. Petit, mais il traverse toute la chaîne.

| | |
|---|---|
| **Vous** | rien à écrire si `GET /api/admin/sessions` et `DELETE /api/auth/sessions/:id` suffisent — seulement me dire la forme des réponses |
| **Moi** | un adaptateur `lib/api/anat.ts` ; l'écran Sessions branché ; le 403 affiché tel qu'il arrive ; aucune donnée inventée restante sur cet écran |
| **Ce qu'on éprouve** | l'authentification par cookie sur la même origine · la forme des réponses · le refus · la remontée d'une action au journal **sous le nom de la personne** |
| **Fini quand** | je révoque une session depuis la console, et vous la voyez dans le journal au nom de la personne qui a cliqué — pas au nom de la console |
| **Accord** | serveur ☐ · console ☐ |

> **Le point de vérité du lot entier** : si le journal enregistre autre chose que le nom de la
> personne, on s'arrête et on reprend l'architecture.

---

## Lot 2 — le contrat, épinglé par un test

Vous avez proposé d'épingler le contrat par un test. C'est la bonne idée du projet, et elle mérite
son propre lot.

| | |
|---|---|
| **Vous** | un test qui vérifie la forme des réponses des routes dont la console dépend — de sorte qu'une évolution de votre côté casse chez vous, pas chez moi, et pas en silence |
| **Moi** | la liste exacte et figée des routes dont je dépends, et les champs que je lis dans chacune |
| **Fini quand** | le test existe, il passe, et il échoue si l'on retire un champ que je lis |
| **Accord** | serveur ☐ · console ☐ |

---

## Lot 3 — lire tout le reste

Les quatorze autres écrans « à brancher ». En **lecture seule**, tous les boutons inertes.

| | |
|---|---|
| **Vous** | rien de neuf, sauf si une route manque — auquel cas on la discute avant |
| **Moi** | Utilisateurs · Rôles et droits · Journal d'audit · Actions critiques · Activité · Paramètres · Santé · Posture de sécurité · Agents IA · Approbations IA · Canaux d'envoi · Envois |
| **Fini quand** | aucun de ces écrans n'affiche plus une donnée inventée, et chacun sait dire « je n'ai pas pu lire » au lieu d'afficher zéro |
| **Accord** | serveur ☐ · console ☐ |

> Un écran qui affiche `0` alors qu'il n'a pas réussi à lire est un mensonge. C'est la faute la
> plus fréquente des consoles, et je m'y prendrai à l'avance.

---

## Lot 4 — agir, huit actions de plus

Seulement après que tout se lise correctement.

| | |
|---|---|
| **Vous** | confirmer, route par route, les huit actions du §2 de `03-questions.md` ; créer celles qui manquent, avec leur entrée dans `matrice.test.ts` |
| **Moi** | les brancher ; chaque action passe par une confirmation qui **dit la conséquence**, et les actions irréversibles exigent de retaper un mot |
| **Fini quand** | chaque action est journalisée, chaque refus est affiché, et aucune n'écrit en base autrement que par votre serveur |
| **Accord** | serveur ☐ · console ☐ |

---

## Lot 5 — la dormance

Le seul besoin qui demande vraiment du neuf chez vous. Détaillé au §3 de
`02-ce-que-les-ecrans-demandent.md`.

| | |
|---|---|
| **Vous** | une route qui donne, par compte : dernière activité reconnue, droits conservés, sessions ouvertes, absence déclarée. La définition de « activité reconnue » est à vous |
| **Moi** | l'écran est déjà écrit ; il ne reste qu'à le brancher. La vague crée des demandes à trancher, elle ne coupe rien |
| **Fini quand** | une vague se dépose, un humain la tranche compte par compte, et rien ne se désactive tout seul |
| **Accord** | serveur ☐ · console ☐ |

---

## Lot 6 — le registre des contrôles

Le plus ambitieux, et le plus facile à mal faire. Il ne s'ouvre que si la question E a reçu un oui.

| | |
|---|---|
| **Vous** | `GET /admin/controls` : pour chaque geste contrôlé, son effet, son niveau d'exigence, qui peut le déclencher, s'il est journalisé, s'il se défait. La moitié existe déjà dans `matrice.test.ts` |
| **Moi** | la console cesse d'inventer ce registre : elle lit le vôtre, l'affiche, et alerte sur les écarts au plancher |
| **Fini quand** | le registre affiché est celui du serveur, et la console n'en garde aucune copie |
| **Accord** | serveur ☐ · console ☐ |

---

## Lots A à C — les fondations du service séparé

*Jonathan a tranché le 26 novembre : **la console devient un service séparé, avec sa propre base.**
Ces trois lots passent devant tous les autres, parce que tout le reste s'appuie dessus. Chiffrage
et conception dans `07-isolement-couts-et-sauvegardes.md`.*

| Lot | Quoi | Chez qui | Estimation |
|---|---|---|---|
| **A** | **La table de sortie** — l'acte écrit dans la même transaction que l'acte lui-même, expédié quand la liaison le permet, acquitté puis effacé. **Signé à la source.** | serveur | 1 à 2 semaines |
| **B** | **Le service console** — base, migrations, réception des événements, API des écrans, et le retard de scellement affiché en permanence | console | 2 à 3 semaines |
| **C** | **Le journal scellé** — chaîne de scellement intégrant la signature du serveur, vérification, stock froid | console *(elle le tient désormais)* | 1 à 2 semaines |

**Trois décisions arrêtées avec ces lots :**

- **Deux chemins séparés** *(option a)*. La console appelle l'application **directement** pour tout
  ce qui est vivant, avec le cookie de la personne ; et son propre service **uniquement** pour le
  forensique. Le serveur ne croit jamais la console sur une identité.
- **Les actes sont signés à la source.** Sans cela le journal ne serait inaltérable que du point de
  vue de celui qui le tient. Avec, il est vérifiable contre les deux.
- **Le journal scellé fait foi pour ce qu'il contient**, et dit en permanence ce qu'il n'a pas
  encore reçu. Les actes de la console elle-même y entrent aussi.

---

## Lot D — les sauvegardes

*Demandé par Jonathan le 26 novembre : « quelque chose qui contrôle tout, qui sauvegarde les
données, la base et autres ».*

| | |
|---|---|
| **Serveur** | la copie se prend près de la base, chiffrée, déposée hors de la machine |
| **Console** | le catalogue, la vérification mensuelle par restauration à blanc, le déclenchement — et la restauration au quorum |
| **La règle** | une sauvegarde qu'on n'a jamais tenté de restaurer n'est pas une sauvegarde. Non vérifiée depuis trente jours, elle remonte en tête de page |
| **À ne pas oublier** | **le coffre se sauvegarde aussi**, et ailleurs que l'application — sinon un seul incident emporte l'original et sa copie |
| **Estimation** | 1 à 2 semaines, les deux |

---

## Lots 8 à 13 — la vision de gouvernance totale

*Ajoutés le 26 novembre après le document `VISION.md`. Analyse complète dans
`06-vision-et-consequences.md`. Ces lots ne s'ouvrent qu'après les sept premiers, et **aucun ne
commence avant que Jonathan ait tranché la question de l'isolement** (§7 du même document).*

| Lot | Quoi | Chez qui | Pourquoi à cette place |
|---|---|---|---|
| ~~8~~ | *devenu le **lot C** ci-dessus : c'est la console qui tient désormais le journal scellé, puisqu'elle a sa propre base* | — | — |
| **9** | **Défense active** — bannissement d'adresse, géolocalisation **au pays**, base embarquée | serveur, console affiche | borné, visible tout de suite. L'Agence travaille hors connexion : pas de service distant, pas de ville |
| **10** | **Gouvernance de l'IA depuis la console** — modèle, quota, plafond de coût, audit des décisions | les deux | la matière existe déjà ; c'est surtout de l'exposition |
| **11** | **Flux temps réel** — un canal continu, et la captation des exceptions | serveur, console consomme | demande un bus d'événements qui n'existe pas. Lourd, mais c'est le pilier qui se voit le plus |
| **12a** | **Le point de passage et le coffre** — un seul `supprimer()` : empreinte, coffre, journal, retrait. Peut s'écrire **avant** le scellement | serveur | 30 routes `DELETE`, 60 instructions, aucun point de passage aujourd'hui. **Deux à trois semaines**, à condition de ne pas commencer par les trente portes |
| **12b** | **Les trente portes**, plus les **109 cascades** que le code ne dit pas | serveur | ne s'ouvre qu'**après** le lot 8 : ouvrir les portes sur un coffre dont rien ne garantit l'intégrité serait prendre la garantie à l'envers |
| **13** | **Ouvrir la session d'un utilisateur** | serveur, console déclenche | **en dernier** : il suppose sept garde-fous, qui supposent le journal scellé du lot 8. L'écrire avant, c'est l'écrire sans eux |

**Deux décisions déjà acquises par la vision :**

- **aucune purge.** Le pilier VI tranche la question de la rétention que nous laissions à Jonathan.
  Rien ne s'efface, et l'agent serveur ne construira aucune purge.
- **le contenu des données n'est jamais affiché** par défaut dans la console. Le coffre le stocke,
  parce que c'est la condition de la restauration ; l'ouvrir est un geste contrôlé, motivé,
  journalisé. Restaurer ne demande pas de lire.

---

## Ce qui reste hors plan, volontairement

- **Les séries temporelles.** Mes courbes resteront inventées tant qu'on n'aura pas décidé où
  stocker des agrégats. Une courbe inventée qui le dit vaut mieux qu'une courbe vraie qui met la
  base à genoux.
- **Les 24 écrans de gabarit.** Ils restent sur la branche standard, débranchés. Aucune route à
  écrire pour eux, jamais.
- **Un serveur pour la console.** Tant qu'elle ne fait que lire votre API et afficher, elle n'en a
  pas besoin. Le jour où le registre des contrôles devra survivre à un rechargement de page, on en
  reparlera — et la réponse sera peut-être « chez vous ».

---

## Comment on travaille, pratiquement

- **Le dépôt est partagé, et c'est un piège.** Vos commits et les miens atterrissent sur la même
  branche. Je travaille dans `templates/tableau-de-bord/` et nulle part ailleurs ; je regarde sur
  quelle branche je suis avant de commiter, et je le dis dans `JOURNAL.md`.
- **Je ne touche pas à `server/`, `web/`, ni à vos documents.** Si quelque chose doit y bouger, je
  l'écris ici.
- **Une ligne datée dans `JOURNAL.md`** à chaque pas, de part et d'autre. C'est notre seule
  synchronisation.
- **Pas de pull request croisée.** Chacun chez soi.
