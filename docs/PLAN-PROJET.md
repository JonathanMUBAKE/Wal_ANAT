# ANAT Pilotage — Plan de projet

> Arrêté le 25 novembre 2026. **Recadrage** : le projet a commencé sans planification stratégique. Il y
> avait un inventaire de défauts, pas un calendrier. Ce document donne les sprints, les tâches, les
> livrables et les échéances.
>
> Tenu par l'agent **`chef-de-projet`**, qui invoque la compétence `gestion-de-projet`.

---

## 1. Charte du projet

**Objectif.** Faire d'ANAT Pilotage un outil de gestion sur lequel la direction générale et les services
de l'Agence travaillent tous les jours — costaud, fonctionnel, beau, et court à l'usage.

**Périmètre.** La sphère de gestion : la direction générale, les services rattachés, les directions
centrales et les pools. Les 102 points constatés, répartis en onze phases.

**Hors périmètre, et c'est délibéré.**
- Le Conseil d'administration et le Collège des commissaires aux comptes : ce ne sont pas des organes de
  gestion. Leurs actes entrent dans l'outil, ils ne s'y délibèrent pas.
- La comptabilité et la paie.
- Le site public de l'Agence.
- Les annexes du courrier — **reportées par Jonathan**.

**Critères de succès.** Les six chiffres du tableau de bord (§ 7). Le projet est réussi quand ils sont
tous à leur cible, pas quand les 102 cases sont cochées.

**Contraintes.**
- Un budget de **jetons**, pas d'argent. Les agents lisent le code ; ils n'ouvrent un navigateur que pour
  vérifier ce qu'ils viennent d'écrire.
- Deux agents au plus en parallèle, jamais sur les mêmes fichiers.
- **Un lot se termine ou ne se commence pas.**
- Rien n'est poussé sans l'accord de Jonathan.

**Commanditaire et seul décideur** : Jonathan. **Huit décisions lui appartiennent** (§ 6) et elles sont
sur le chemin critique.

---

## 2. Les livrables

Ce que le chantier rend, et à quoi ça se reconnaît.

| # | Livrable | Reconnu à |
|---|---|---|
| L1 | **Une base commune** | `main` porte le design et les droits fusionnés ; 760 tests ; zéro manquement WCAG. ✅ *fait le 25/11* |
| L2 | **Des briques tenues** | Aucune balise `<button>`, `<input>`, `<select>`, `<textarea>` hors des fichiers de briques, et un test l'interdit. |
| L3 | **Un serveur qui ne laisse rien passer** | Aucune des six fuites ; aucun état sans sortie ; le journal ne porte que ce qui a eu lieu. |
| L4 | **Un temps qui ne ment pas** | L'heure se vérifie sur une source sûre, porte le fuseau de l'entité, et le rang d'un courrier se déduit de son année. |
| L5 | **Le module courrier** | Les cinq étapes de la séquence réelle se jouent dans l'outil, de la réception au classement, étiquette comprise. |
| L6 | **Le module réunions** | Un compte rendu s'adopte collégialement à la séance suivante, avec modifications consignées. |
| L7 | **Le module livrables** | Aucun paiement ne s'engage sur un livrable sans pièce. |
| L8 | **Une interface qui répond et ne cache rien** | Tout acte engageant répond ; tout droit de lecture a une porte ; la recherche trouve ce qu'elle annonce. |
| L9 | **Les écrans refaits** | Replanifier sept tâches coûte moins de dix clics. |
| L10 | **Le vocabulaire de la maison** | « Signataire » partout ; « décision » ne désigne plus qu'une chose. |
| L11 | **La recette** | Les six profils rejouent leurs séquences ; les six chiffres sont à leur cible. |

---

## 3. Découpage : phases → lots → points

```
Chantier (102 points)
├── Phase 0  Mettre la table ........... L1, L2
│   ├── Lot 0.1  Fusion des branches ................ ✅ fait
│   └── Lot 0.2  Les briques (T1-T8) ................ 8 points
├── Phase 1  Fermer ce qui est ouvert .. L3
│   └── Lot S1 (AA1, AD1, AD2, AD12, AA2, AA3) ...... 6 points
├── Phase 2  La vérité du journal ...... L3
│   └── Lot S2 (AD10, AD7, AD8) ..................... 3 points
├── Phase 3  Ouvrir ce qui est enfermé . L3
│   └── Lot S3 (AD4, AD5, AD3, AD9) ................. 4 points
├── Phase 4  L'exactitude .............. L3, L7
│   └── Lot S4 (Z2, AD6, AD11, AD14, AD13) .......... 5 points
├── Phase 5  Le temps .................. L4
│   └── Lot S5 (X16 a-e) ............................ 5 points
├── Phase 6  Le courrier ............... L5
│   ├── Lot M1a  Modèle et acheminements ............ X1-X4
│   ├── Lot M1b  Signataire et sortant .............. X6-X9
│   ├── Lot M1c  Numéros, archives, rappels ......... X10-X15
│   └── Lot M1d  Les écrans du courrier ............. X5, X14
├── Phase 7  Les réunions .............. L6
│   ├── Lot M2a  L'adoption collégiale .............. Y1-Y4
│   └── Lot M2b  Fonctions, types, ordre du jour .... Y5-Y10
├── Phase 8  Les livrables ............. L7
│   └── Lot M3 (Z1, Z3, Z4, Z5) ..................... 4 points
├── Phase 9  L'interface ............... L8, L9
│   ├── Lot F2  Brancher le calculé (U1-U5) ......... 5 points
│   ├── Lot F3  Répondre et ne rien cacher .......... 9 points
│   └── Lot F4  Les écrans à refaire (AC1-AC4) ...... 4 points
├── Phase 10 Le vocabulaire ............ L10
│   └── Lot F5 (AB1-AB3) ............................ 3 points
└── Phase 11 La recette ................ L11
    └── Lot R  Les six profils rejouent ............. —
```

**Les points hors chantier** (H1 à H8) se traitent au fil de l'eau, dans le lot dont ils sont le plus
proches.

---

## 4. Calendrier

Neuf sprints d'une semaine. Le vendredi est le point d'avancement et la revue du livrable ; le lundi, le
cadrage du lot suivant.

| Sprint | Semaine | Objectif | Lots | Livrable |
|---|---|---|---|---|
| **S0** | 25-28 nov. | Mettre la table | 0.1 ✅, 0.2 | L1 ✅, L2 |
| **S1** | 1-5 déc. | Rien ne fuit | S1 | L3 ⅓ |
| **S2** | 8-12 déc. | Le journal dit vrai, rien n'est enfermé | S2, S3 | L3 ⅔ |
| **S3** | 15-19 déc. | Les calculs sont exacts, le temps est juste | S4, S5 | L3, L4 |
| — | 22 déc. - 2 janv. | *Arrêt* | — | — |
| **S4** | 5-9 janv. | Le courrier : le modèle | M1a | — |
| **S5** | 12-16 janv. | Le courrier : le circuit et les numéros | M1b, M1c | — |
| **S6** | 19-23 janv. | Le courrier : les écrans. Les réunions : l'adoption | M1d, M2a | **L5** |
| **S7** | 26-30 janv. | Les réunions et les livrables | M2b, M3 | **L6, L7** |
| **S8** | 2-6 févr. | L'interface | F2, F3, F4 | **L8, L9** |
| **S9** | 9-13 févr. | Le vocabulaire, puis la recette | F5, R | **L10, L11** |

**Livraison visée : le 13 février 2027.**

**Ce calendrier tient à une condition**, et elle ne dépend pas des agents : **les huit décisions du § 6
doivent être prises aux dates indiquées.** Une décision qui glisse d'une semaine fait glisser son sprint
d'une semaine, et tous ceux qui en dépendent.

---

## 5. Chemin critique et dépendances

```
0.2 briques ──┬─> F2 ─> F3 ─> F4 ──────────────────┐
              │                                     ├─> F5 ─> Recette
S1 ─> S2 ─> S3 ─> S4 ─> S5 temps ─> M1a ─> M1b ─> M1c ─> M1d ─┘
                                 └─> M2a ─> M2b
                                 └─> M3
```

**Le chemin critique passe par le temps et le courrier.** Seize points sur 102, mais ils sont en série et
ils dépendent de deux décisions de Jonathan. Tout retard là se répercute intégralement sur la livraison.

**Ce qui peut avancer en parallèle** : les briques et la phase 9 (interface) d'un côté, les phases 1 à 5
(serveur) de l'autre — deux agents, pas les mêmes fichiers.

**Ce qui ne peut pas** : M1 avant S5. Numéroter un registre avec une horloge qui ment n'a aucun sens.

---

## 6. Les huit décisions, et quand elles sont nécessaires

| # | Décision | Bloque | **Nécessaire avant le** |
|---|---|---|---|
| D1 | L'unicité du rang du courrier entre postes hors ligne | S5, puis tout M1 | **15 déc.** (sprint S3) |
| D2 | « En retard » : semaine calendaire ou ouvrable | M1c | **12 janv.** |
| D3 | Le contenu de l'étiquette d'accusé de réception | M1d | **19 janv.** |
| D4 | Les types de livrables | M3 | **26 janv.** |
| D5 | Le cadre organique : dans l'outil ou dehors | M3, H4 | **26 janv.** |
| D6 | Les noms des trois objets appelés « décision » | F5 | **2 févr.** |
| D7 | La règle anti-perte partout : conversion du routeur, ou pas | F4 | **2 févr.** |
| D8 | Les annexes du courrier | *reporté par Jonathan* | — |

**D1 est la plus urgente**, et de loin : elle commande la structure du numéro, donc le modèle de données
du courrier, donc seize points.

---

## 7. Tableau de bord

Les six chiffres, mesurés à chaque fin de sprint. **Toujours les mêmes, pour qu'on voie la pente.**

| | Départ | Aujourd'hui | Cible |
|---|---|---|---|
| Points traités | 0 / 102 | 0 / 102 | 102 |
| Tests | 745 | 760 | ne baisse jamais |
| Manquements WCAG | 0 | 0 | 0 |
| Clics — replanifier 7 tâches | 28 | 28 | < 10 |
| Clics — déposer une note au signataire | 8 | 8 | < 5 |
| Écrans — la revue du matin de la DG | 7 | 7 | 1 |

---

## 8. Registre des risques

Score = probabilité × gravité, de 1 à 5 chacune. Tout ce qui touche à une fuite, une perte de données ou
une fausse écriture a une gravité de 5.

| # | Risque | P | G | Score | Parade |
|---|---|---|---|---|---|
| R1 | **Une décision tarde et bloque le chemin critique** | 4 | 4 | **16 élevé** | Les dates du § 6 sont rappelées à chaque état d'avancement ; D1 est demandée dès maintenant. |
| R2 | **Le modèle du courrier est écrit avant d'être arrêté** | 3 | 5 | **15 élevé** | Le modèle de données s'arrête par écrit avant M1a ; le lot ne s'ouvre pas sans sa fiche. |
| R3 | **Un lot est déclaré fini sans l'être** | 3 | 4 | 12 moyen | Le chef de projet relit le diff et lance les tests lui-même. C'est déjà arrivé une fois. |
| R4 | **Le budget de jetons s'épuise en découvertes** | 3 | 4 | 12 moyen | 102 points sont documentés : on les traite. Aucune nouvelle campagne sans raison. |
| R5 | **Le renommage « signataire » entre en conflit avec les lots en cours** | 4 | 2 | 8 moyen | Il est placé en phase 10, exprès, après que tout le reste est posé. |
| R6 | **Deux agents touchent les mêmes fichiers** | 2 | 3 | 6 faible | Un propriétaire par lot ; la répartition serveur/interface est écrite. |
| R7 | **Une correction en casse une autre** | 2 | 3 | 6 faible | 760 tests, et chaque lot en ajoute. Le nombre ne baisse jamais. |
| R8 | **L'arrêt de fin d'année allonge la reprise** | 4 | 1 | 4 faible | L'état d'avancement du 19 décembre sert de point de reprise. |

---

## 9. Gouvernance

**Qui.**
- **Jonathan** — commanditaire, et seul à trancher les huit décisions.
- **Session principale** — conduit le chantier, relit, fusionne, parle à Jonathan.
- **`chef-de-projet`** — cadre les lots, mesure, rend les états d'avancement, vérifie les fins de lot.
- **Agent serveur** — phases 1 à 5, moitié serveur des phases 6 à 8.
- **Agent interface** — phase 0.2, puis phase 9, moitié interface des phases 6 à 8.
- **Testeurs** — en phase 11 seulement.

**Le rythme.**
- **Lundi** : cadrage du lot de la semaine (fiche de lot, critère de fin écrit avant la première ligne).
- **Vendredi** : état d'avancement chiffré, et revue du livrable s'il y en a un.
- **À tout moment** : une demande de changement s'instruit, elle ne s'improvise pas.

**La règle qui prime sur toutes les autres**, et qui vient de Jonathan : *on fait de grandes retouches,
mais en suivant une bonne logique — pas coder des histoires à moitié.*

---

## 10. Décision du 26 novembre 2026 — le centre de commande est un service séparé

Jonathan a tranché : **le plan de contrôle vit à part, avec sa propre base.** C'est ce que demandait son
document de vision — un journal que l'application peut réécrire n'est pas immuable, et un coffre-fort
qui tombe avec elle n'en est pas un.

### Ce que cela ajoute au périmètre serveur

- [ ] **La table de sortie.** Chaque acte s'écrit dans la même transaction que l'acte lui-même : soit les
      deux, soit aucun. Un expéditeur la vide vers le plan de contrôle quand il peut, qui acquitte. Si le
      plan de contrôle est injoignable — six pools, deux fuseaux, des antennes mal reliées — l'application
      ne ralentit pas, ne perd rien et ne refuse aucune écriture. **C'est le seul mécanisme qui tienne à la
      fois le « zéro perte » et le fonctionnement hors connexion.** Elle précède le flux temps réel, qui
      n'en est que la lecture.
- [ ] **Le journal scellé passe de l'autre côté.** Celui de l'application reste la mémoire de travail ;
      celui du plan de contrôle devient la mémoire de l'institution. **Deux journaux, deux rôles — il faut
      dire lequel fait foi**, et le dire avant d'écrire la table de sortie.
- [ ] **L'authentification entre les deux services.** Un secret partagé suffit pour le transport : c'est
      un flux à sens unique où l'identité de l'acteur est une **donnée**, pas une revendication. Cela ne
      rouvre pas la porte que nous avions fermée.

### La question que cette décision rouvre

La console parlera à deux choses : au plan de contrôle pour le forensique, à l'application pour tout ce
qui est vivant. **Si le plan de contrôle relaie les actions, l'application devrait le croire sur parole
quant à l'identité de l'acteur** — exactement le trou écarté au lot 0. Deux issues, à trancher avec la
session qui construit la console :

- **(a)** la console appelle l'application **directement** pour agir, avec le cookie de la personne, et le
  plan de contrôle **uniquement** pour le forensique. Deux chemins d'appel, aucune confiance accordée.
- **(b)** l'application frappe elle-même un **jeton court, restreint et signé** portant l'identité de la
  personne ; le plan de contrôle le relaie sans jamais le fabriquer. L'application vérifie sa propre
  signature au lieu de croire sur parole.

Recommandation : **(a) pour commencer**, parce qu'elle ne demande rien de neuf et ne peut pas mal tourner.
