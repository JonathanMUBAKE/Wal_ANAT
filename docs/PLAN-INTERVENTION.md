# ANAT Pilotage — Plan d'intervention

> Arrêté le 25 novembre 2026, avant la première ligne de code du grand chantier.
> Les constats numérotés (T1, X10, AD4…) renvoient à `docs/PLAN-DE-TRAVAIL.md`, section 3 bis,
> où les 102 points sont décrits avec leurs preuves.

Ce document dit **ce qu'on construit**, pas seulement ce qu'on répare. Le plan de travail est organisé
par défaut constaté ; celui-ci est organisé par ce que le logiciel doit devenir.

---

## 1. Ce qu'on veut obtenir, en termes vérifiables

Trois mots ont été demandés : **costaud, fonctionnel, très beau avec une bonne expérience**. Tant qu'ils
restent des mots, personne ne peut dire si on y est. Voici ce qu'ils veulent dire ici, et comment on
le prouve.

| Mot | Ce que ça veut dire | Comment on le mesure |
|---|---|---|
| **Costaud** | Le serveur tient ses règles, rien ne fuit, rien ne ment, rien ne s'enferme. | Les 322 routes sous contrat restent sous contrat ; aucun droit du catalogue n'est contourné ; chaque acte qui engage l'Agence est au journal ; aucun état d'où l'on ne peut pas sortir. |
| **Fonctionnel** | Les modules font ce que l'institution fait réellement, pas ce que le logiciel savait faire. | Les cinq séquences réelles se jouent de bout en bout sans sortir de l'outil : courrier reçu → imputé → traité → classé ; réunion programmée → tenue → compte rendu adopté → recommandation close ; plan préparé → approuvé → suivi ; livrable produit → remis avec sa pièce → validé → payé ; agent recruté → affecté → doté de ses accès. |
| **Beau** | Une seule langue visuelle, tenue partout, sans exception. | Aucune balise `<button>`, `<input>`, `<select>` ou `<textarea>` hors des briques ; aucune couleur, taille ou rayon écrits en dur ; un test l'interdit. |
| **Bonne expérience** | Le geste courant est court, et rien n'est caché à qui a le droit de le voir. | Le coût en clics des cinq séquences est mesuré avant et après, et il baisse ; chaque écran est atteignable depuis le rail **ou** la recherche ; chaque acte engageant répond ; zéro manquement WCAG. |

**Le chiffre de départ**, relevé par les testeurs : 28 clics pour replanifier 7 tâches un lundi matin,
8 clics pour déposer une note au signataire, 7 écrans pour que la direction générale fasse le tour de
sa matinée. Ce sont les trois repères à battre.

---

## 2. Le principe de séquence

Quatre règles décident de l'ordre, et aucune n'est négociable.

1. **On ne décore pas ce qu'on va réécrire.** La refonte visuelle d'un module vient après sa refonte
   fonctionnelle, jamais avant.
2. **On ne construit pas sur des copies.** Tant qu'un bouton existe en 144 exemplaires, toute
   amélioration doit être faite 144 fois. Les briques passent donc avant tout le reste.
3. **La règle serveur précède l'écran qui s'y appuie.** Un bouton posé sur une règle absente est une
   histoire à moitié.
4. **Ce qui protège passe avant ce qui embellit.** Une fuite ouverte pendant qu'on dessine est une
   fuite qu'on a choisi de laisser ouverte.

---

## 3. Le plan serveur

Cinq chantiers, dans cet ordre. Chacun finit par ses tests, et le nombre de tests ne baisse jamais.

### S1 — Fermer ce qui est ouvert *(6 points : AA1, AD1, AD2, AD12, AA2, AA3)*

**Ce qu'on change.** Les documents d'un dossier de projet passent sous le rôle tenu sur le projet. Le
masque des congés s'applique aussi aux notifications et aux valeurs renvoyées, pas seulement aux listes.
Un seul masque du budget, appelé par la revue **et** par la santé des projets. Une demande d'arbitrage ne
part qu'à ceux qui peuvent ouvrir le dossier. Un contrat de mission se lit par ceux que le projet
concerne. Un projet naît ouvert à l'équipe choisie, et à personne si aucune.

**La garantie qu'on ajoute.** Un test par fuite, qui échoue si le chemin se rouvre. Et une règle
générale : *toute donnée masquée dans une liste l'est aussi dans les notifications et les réponses
d'écriture* — à vérifier par balayage, comme le contrat d'accès balaie les routes.

### S2 — Faire dire la vérité au journal *(3 points : AD10, AD7, AD8)*

**Ce qu'on change.** Une validation humaine n'est journalisée qu'une fois exécutée ; si l'attente
n'existe plus, elle est refusée avant toute écriture. Modifier une activité est journalisé, avec
l'ancienne et la nouvelle valeur pour la confidentialité, le responsable et la santé. Une règle IA
modifiée change d'auteur, ou exige de son éditeur le droit qu'elle fait exercer.

**La garantie.** Un acte qui engage l'Agence et qui n'est pas au journal est un défaut, pas un oubli.
Les 137 genres d'actes journalisés sont la base ; la liste s'allonge, elle ne raccourcit pas.

### S3 — Ouvrir ce qui est enfermé *(4 points : AD4, AD5, AD3, AD9)*

**Ce qu'on change.** Résilier un accord règle d'abord le sort de ses avenants en cours. Une sortie
d'agent s'annule, avec motif et au journal, et règle ses congés et ses intérims. La création d'un agent
valide avant d'enrôler. Une proposition de l'IA sans décideur expire, prévient, et libère la tâche.

**La garantie.** Pour chaque objet à états, un test qui parcourt le graphe et vérifie qu'aucun état
n'est sans sortie.

### S4 — Rendre les calculs exacts *(5 points : Z2, AD6, AD11, AD14, AD13)*

**Ce qu'on change.** Pas de remise de livrable sans pièce. Les dates de congé passent la même validation
que partout ailleurs, avec jours fériés et plafond de solde. Les exécutions IA sont filtrées par droits
**avant** d'être tronquées. Une demande de congé a toujours quelqu'un pour la décider, recalculé si le
chef change. La fusion de partenaires respecte la règle des accords en vigueur.

### S5 — Le temps *(X16, prérequis de tout le chantier courrier)*

**Ce qu'on change.** L'heure se vérifie sur un serveur de l'heure quand une connexion existe, et ne se
croit jamais sur parole. Hors ligne, elle repart d'un plancher qui ne recule pas. Le fuseau est celui de
la RDC, porté par l'institution et au besoin par l'entité — Kinshasa à UTC+1, Lubumbashi à UTC+2 — jamais
l'UTC brut. Le rang d'un courrier se déduit de son année : aucune réinitialisation à déclencher, donc
aucune à manquer. Au redémarrage après un arrêt, un seul récapitulatif, pas deux mois de relances
rejouées.

**À trancher avant d'écrire :** l'unicité du rang quand plusieurs postes enregistrent hors ligne.

---

## 4. Le plan interface

Cinq chantiers. Le premier conditionne les quatre autres.

### F1 — Les briques *(lot T)*

**Ce qu'on change.** Un composant par rôle, et rien d'autre. 144 boutons et 91 champs écrits à la main
rejoignent `Button`, `Field`, `Input`, `Select`, `Textarea` ; un tableau sur deux rejoint `DataTable`.
Les trois composants `Card` locaux disparaissent au profit de `Section`. Une seule brique « tâche »,
quels que soient l'écran et l'origine. Une seule brique « ce qu'on me demande », quelle que soit
l'origine de la charge.

**La garantie.** Un test échoue si une balise brute réapparaît hors des fichiers de briques.

### F2 — Brancher ce qui est déjà calculé *(lot U)*

Le serveur écrit cinq phrases par jour pour la direction générale et les jette. Idem pour les retards,
les écarts, les contrats qui finissent, le responsable d'une entité, l'échéance d'une parade au risque.
**Rien à concevoir, rien à décider : raccorder.** Meilleur rapport effet/coût du chantier.

### F3 — Répondre et ne rien cacher *(lots V et W)*

Tout acte engageant répond par écrit. Les listes de personnes se ferment sur le bon périmètre. Le rail
ouvre une entrée sur un droit de **lecture**, et une pastille dit ce qui attend — un casier vide reste
un casier. La recherche cherche ce qu'elle annonce, et dit « aucun résultat » quand il n'y en a pas.

### F4 — Les écrans à refaire *(lot AC)*

« Mes tâches », qu'un agent ouvre tous les matins et qui ne permet pas de préparer sa semaine. La matrice
des profils et des droits, illisible dès qu'on la défile. L'arrivée d'une personne, qui ne peut pas se
finir en une fois. Et la règle anti-perte sur tous les formulaires de page.

### F5 — La finition *(lot AB et la passe visuelle)*

Le vocabulaire en dernier : « signataire », « signé par », et les trois objets qui s'appellent aujourd'hui
« décision ». Puis la passe visuelle sur les modules devenus stables — jamais avant.

---

## 5. Là où les deux se rencontrent

Trois modules se refont des deux côtés à la fois. Pour chacun, **le modèle de données est arrêté et écrit
avant qu'une ligne soit posée**, et la moitié serveur précède la moitié interface.

| Module | Le changement de fond | Serveur d'abord | Interface ensuite |
|---|---|---|---|
| **Courrier** *(lot X, 16 points)* | Un courrier, **N états** — un par personne et par entité. C'est une refonte de données, pas un écran à retoucher. | Le modèle, les mentions « pour traitement » et « pour information », la tâche créée, le circuit par le signataire, la numérotation, les archives, les rappels. | L'enregistrement unique, l'étiquette, le dispatch, l'espace de chacun, la génération depuis un modèle. |
| **Réunions** *(lot Y, 10 points)* | L'adoption est **collégiale, à la séance suivante** ; ni la DG ni les DGA ne valident les comptes rendus des entités. | Le nouveau modèle d'adoption, les amendements tracés, la visibilité de la réunion des directions, le type de réunion en référentiel. | Le rapporteur et les intervenants, l'ordre du jour à la programmation, l'adoption en séance. |
| **Livrables** *(lot Z, 5 points)* | Un livrable est **rattaché** et **porte sa pièce** ; il engage un paiement. | Le rattachement obligatoire, la colonne de document, la modification, les types. | La remise en deux champs, l'accusé, la fiche. |

---

## 6. Les garanties permanentes

Elles existent déjà pour la plupart. Elles ne doivent jamais baisser, et chaque chantier en ajoute.

- **Le contrat d'accès** : 322 routes éprouvées contre quatre profils et contre l'erreur 500.
- **La couverture des droits** : chaque droit du catalogue est consulté par l'interface, ou couvert par
  une exception écrite et justifiée.
- **Les appels sensibles** : une table dit quelle route exige quel droit et quels fichiers ont le droit
  de l'appeler.
- **L'accessibilité** : zéro manquement WCAG, dans les deux thèmes, en bureau comme en téléphone.
- **Le nombre de tests ne baisse jamais.** 760 aujourd'hui.
- *(à créer)* **Les briques** : aucune balise brute hors des fichiers de briques.
- *(à créer)* **Les masques** : ce qui est masqué dans une liste l'est partout.
- *(à créer)* **Les états** : aucun état sans sortie.

---

## 7. Qui travaille, et comment

- **Un agent serveur** : S1 à S5, puis la moitié serveur des trois modules communs.
- **Un agent interface** : F1, puis F2 à F4, puis la moitié interface des trois modules communs.
- **Jamais les deux sur les mêmes fichiers.** Un lot à la fois, chacun sur sa branche.
- **Les testeurs** reviennent à la fin, un par profil, **uniquement sur ce qui a été corrigé**.
- **Chaque agent invoque la compétence de sa phase avant d'écrire** (tableau en fin de
  `docs/PLAN-DE-TRAVAIL.md`).
- **Un lot se termine ou ne se commence pas.** Pas de moitié de parcours, pas de bouton sur une règle
  absente.

## 8. Ce qui attend encore une décision

- La liste des **types de livrables**, à établir avec les directions.
- L'**unicité du rang** du courrier entre postes hors ligne.
- Les **annexes** : limite par fichier, ou espace externe — remis à plus tard.
- Le **cadre organique** : document consultable dans l'outil, ou référence extérieure.
- Les trois objets qui s'appellent « décision » : leurs noms définitifs.
