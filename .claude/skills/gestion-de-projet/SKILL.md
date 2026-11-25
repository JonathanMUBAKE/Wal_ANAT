---
name: gestion-de-projet
description: Conduire le grand chantier d'ANAT Pilotage — cadrer un lot, tenir le registre des risques, rendre un état d'avancement, instruire une demande de changement, clôturer un lot. À appeler avant d'ouvrir un lot, à chaque point d'avancement, et avant de déclarer un lot fini.
---

# Conduire le chantier d'ANAT Pilotage

Ce chantier n'a ni budget en argent ni équipe salariée : il a un **budget de jetons**, des **agents** qui
travaillent en série, et un utilisateur qui a dit une chose qu'il faut tenir —
**« pas coder des histoires à moitié »**.

La gestion de projet sert ici à une seule fin : qu'à chaque instant on sache **ce qui est fini, ce qui
est en cours, ce qui est bloqué, et ce qui attend une décision**. Rien d'autre.

## Les cinq documents, et ce que chacun dit

| Document | Ce qu'on y trouve | Quand on l'ouvre |
|---|---|---|
| `docs/CONTEXTE-INSTITUTIONNEL.md` | Comment l'Agence fonctionne, et **pourquoi** chaque intervention est demandée. | **Avant tout.** Un agent qui ne l'a pas lu produit un logiciel qui passe les tests et dont personne ne se sert. |
| `docs/PLAN-INTERVENTION.md` | Ce que le logiciel doit devenir, et les critères qui disent si on y est. | Au cadrage d'un chantier. |
| `docs/PLAN-DE-TRAVAIL.md` § 3 bis et 3 ter | Les 102 points constatés, et l'ordre d'exécution en onze phases. | Pour choisir le lot suivant. |
| `docs/INTERVENTIONS.md` | Le détail de chaque point : défaut, preuve, ce qu'on change, test, critère de fin. | Au moment d'écrire. |
| `docs/DESIGN-SYSTEM.md` | La loi visuelle et les règles de comportement de l'interface. | Dès qu'un écran est touché. |

## La maille de travail : le lot

On ne travaille pas en sprints. On travaille en **lots**, et un lot a quatre propriétés.

1. **Il tient dans une branche.** Une branche par lot, jamais de travail direct sur `main`.
2. **Il a un seul propriétaire.** Jamais deux agents sur les mêmes fichiers.
3. **Il se termine ou ne se commence pas.** Pas de moitié de parcours, pas de bouton posé sur une règle
   absente, pas de règle serveur sans l'écran qui va avec.
4. **Il a un critère de fin écrit avant d'être ouvert**, repris de `INTERVENTIONS.md`.

### Cadrer un lot — la fiche à produire avant d'écrire

```markdown
## Lot {code} — {titre}

**Pourquoi** : {ce que l'Agence y gagne, en une phrase, tirée du contexte institutionnel}
**Points couverts** : {références INTERVENTIONS.md}
**Propriétaire** : agent serveur | agent interface
**Branche** : {nom}
**Dépend de** : {lots qui doivent être finis avant, ou « rien »}

### Ce qui est dans le lot
- {…}

### Ce qui n'y est pas, exprès
- {…, et pourquoi}

### Fini quand
- [ ] {critère vérifiable par quelqu'un d'autre}
- [ ] `npm run typecheck`, `npm test`, `npm run lint` au vert
- [ ] Le nombre de tests a augmenté
- [ ] Vérifié au navigateur si quelque chose se voit
- [ ] Journal de `docs/PLAN-DE-TRAVAIL.md` complété
- [ ] Commité sur la branche, **non poussé**

### Risques du lot
| Risque | Probabilité | Gravité | Score | Parade |
|---|---|---|---|---|
```

## Le registre des risques

**Score = Probabilité × Gravité**, chacune de 1 à 5.

| Probabilité | | Gravité (ici, pas en argent) | |
|---|---|---|---|
| 1 Très improbable | < 10 % | 1 Négligeable | une retouche |
| 2 Improbable | 10-30 % | 2 Mineure | un lot allongé |
| 3 Possible | 30-50 % | 3 Modérée | un lot à refaire |
| 4 Probable | 50-70 % | 4 Majeure | plusieurs lots à refaire |
| 5 Très probable | > 70 % | 5 Sévère | une fuite, une perte de données, une fausse écriture |

- **Critique (20-25)** — on arrête et on traite.
- **Élevé (15-19)** — parade active, point à chaque lot.
- **Moyen (8-14)** — parade écrite, point toutes les deux semaines.
- **Faible (1-7)** — noté, accepté.

**Tout ce qui touche à une fuite, à une perte de données ou à une fausse écriture au journal a une
gravité de 5**, quelle que soit sa probabilité. Dans une institution où l'écrit fait foi, ce sont les
seuls défauts qui ne se rattrapent pas.

## L'état d'avancement

À rendre à chaque fin de lot, et à la demande. **Court. Pas de récit.**

```markdown
# Avancement du chantier — {date}

**État** : 🟢 en bonne voie | 🟡 attention | 🔴 bloqué

## Depuis la dernière fois
- {ce qui est fini, avec le commit}
- {ce qui a échoué, et pourquoi}

## Les chiffres
| | Départ | Aujourd'hui | Cible |
|---|---|---|---|
| Points du plan traités | 0 / 102 | {n} / 102 | 102 |
| Tests | 760 | {n} | ne baisse jamais |
| Manquements WCAG | 0 | {n} | 0 |
| Clics pour replanifier 7 tâches | 28 | {n} | < 10 |
| Clics pour déposer une note au signataire | 8 | {n} | < 5 |
| Écrans pour la revue du matin de la DG | 7 | {n} | 1 |

## En cours
- {lot, propriétaire, où il en est}

## Bloqué
- {ce qui est bloqué, par quoi, depuis quand}

## Décisions attendues de Jonathan
1. {la décision, et ce qu'elle bloque}
```

Les six lignes de chiffres ne changent pas de forme d'un rapport à l'autre : c'est ce qui permet de voir
la pente.

## La demande de changement

Dès qu'une idée arrive en cours de chantier — et il en arrivera.

```markdown
## Demande de changement {n° } — {titre}

**Demandée par** : {qui}, {date}
**Ce qui est demandé** : {…}
**Pourquoi** : {…}

### Ce que ça coûte
- **Portée** : {quels lots sont touchés}
- **Ordre** : {est-ce que ça change la séquence des phases ?}
- **Risque** : {ce que ça introduit}
- **Ce qu'on ne fera pas si on fait ça** : {le vrai coût}

### Décision
☐ Retenue, dans le lot {…}  ☐ Reportée après {…}  ☐ Écartée — {raison}
```

La dernière ligne du coût est la plus importante. Un chantier ne déraille pas parce qu'on ajoute : il
déraille parce qu'on ajoute **sans retirer**.

## Les règles de capacité

- **Un lot à la fois par propriétaire.** Deux agents peuvent travailler en parallèle s'ils ne touchent
  pas les mêmes fichiers — sinon, en série.
- **Les agents lisent le code.** Ils n'ouvrent un navigateur que pour vérifier ce qu'ils viennent
  d'écrire, et ne lancent aucun sous-agent. La campagne des six testeurs au navigateur a coûté plus que
  les quinze constats obtenus par simple lecture.
- **Les testeurs ne reviennent qu'à la fin**, un par profil, uniquement sur ce qui a été corrigé.
- **La compétence de la phase s'invoque avant d'écrire**, pas après (tableau en fin de
  `docs/PLAN-DE-TRAVAIL.md`).

## Clôturer un lot

1. Les critères de fin sont tous cochés — **vérifiés, pas déclarés**. Un rapport d'agent n'est pas une
   preuve : on relit le diff et on lance les tests soi-même.
2. Le journal de `docs/PLAN-DE-TRAVAIL.md` reçoit sa ligne : date, ce qui a changé, pourquoi, branche.
3. Les cases des points couverts sont cochées dans `INTERVENTIONS.md`.
4. Ce qui n'a pas été fait est **dit**, pas tu.
5. La branche reste non poussée tant que Jonathan n'a pas tranché.

## Ce qui fait échouer ce chantier

Trois choses, et elles sont déjà arrivées une fois chacune.

- **Déclarer fini ce qui ne l'est pas.** D'où la règle : on relit le diff et on lance les tests soi-même.
- **Ajouter sans retirer.** D'où la demande de changement, qui oblige à nommer ce qu'on ne fera pas.
- **Dépenser le budget en découvertes plutôt qu'en corrections.** On a 102 points documentés : on les
  traite. On ne relance pas une campagne de découverte sans raison.
