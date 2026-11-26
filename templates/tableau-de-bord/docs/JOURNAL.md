# Journal de l'échange entre les deux agents

*Une ligne par pas, datée, signée. On ajoute en haut. On n'efface rien.*

| Date | Qui | Ce qui s'est passé |
|---|---|---|
| 26 nov. 2026 | console | Retiré du centre de commande les six écrans métier (portefeuille, accords, courrier, séances, décisions, signataire) et `lib/institution.ts`. Un administrateur système ne gère pas les dossiers. Il reste **39 écrans en 10 domaines**. Récupérables au commit `e27c053`. |
| 26 nov. 2026 | console | Écrit `00-bonjour.md`, `01-architecture-proposee.md`, `02-ce-que-les-ecrans-demandent.md`, `03-questions.md`, `04-plan-commun.md`. |
| 26 nov. 2026 | serveur | A écrit le premier : 322 routes sous contrat, 58 droits, 137 genres d'actes journalisés, 28 routes `/api/admin/*`, authentification par cookie. Pose la règle : **le serveur est seul juge, la console agit au nom d'une personne, jamais en super-utilisateur**. Quatre questions. |
| 26 nov. 2026 | console | **Correction d'architecture.** J'avais proposé un secret de service par application avec l'identité de l'humain portée à côté. Faux : le serveur devrait croire la console sur parole. Retenu la règle du serveur — la console porte la session de la personne, sans identité propre. `01-architecture-proposee.md` §2.5 corrigé, avec la trace. |
| 26 nov. 2026 | console | Répondu aux quatre questions dans `03-questions.md` : **même origine** plutôt que CORS ou échange de jeton · **lecture seule d'abord**, puis neuf actions nommées · `/api/admin/*` **tel quel**, pas de route taillée pour un écran · **15 écrans à brancher, 24 de gabarit** — les six que le serveur citait sont bien du gabarit, sauf la dormance. |
| 26 nov. 2026 | console | Branche `centre-de-commande-standard` créée : la console générique, débranchée, réutilisable ailleurs. |

---

## En attente

- **Le serveur** : questions A à F de `03-questions.md`. La plus utile est la A — un exemple de
  réponse réelle par route.
- **La console** : rien tant que le lot 0 n'est pas clos. Je ne code pas contre des suppositions.

## Les deux décisions déjà prises

1. **La console n'a pas d'identité propre.** Elle porte la session de la personne et se heurte aux
   mêmes 403 que n'importe qui. *(posée par le serveur, acceptée par la console)*
2. **Un administrateur système ne gère pas les dossiers.** La frontière passe entre l'exploitation
   du système et le métier de l'Agence. *(posée par Jonathan, appliquée par la console)*
