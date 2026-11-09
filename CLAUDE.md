# Cadence — consignes pour les agents

Cadence est le projet de la conversation « Asana avec IA embarquée » : un outil de gestion de projet
multi-organisations avec des coéquipiers IA sous validation humaine.
Node.js 22.5+ · Fastify · PostgreSQL (PGlite en local, Supabase en production) · React 19 + Vite + Tailwind.

**Avant toute modification, lisez `docs/PLAN-DE-TRAVAIL.md`** : erreurs constatées, lots de travail
dans l'ordre, règles de travail et décisions ouvertes. Mettez à jour sa section « Journal » à chaque lot.

Règles essentielles :
- Ce dépôt est la version dédiée à l'ANAT (Agence Nationale d'Aménagement du Territoire), dérivée de Cadence : outil de pilotage stratégique pour la DG. Il est privé.
- Partir de `main` à jour, travailler sur une branche par lot, pousser sur `origin` (github.com/JonathanMUBAKE/Wal_ANAT). Ne jamais y pousser de compte rendu ou de donnée réelle de l'agence.
- Règle de robustesse : toute route déclarée dans `matrice.test.ts`, toute règle contrôlée côté serveur, toute action sensible journalisée, tout document validé figé, l'IA propose et un humain décide.
- `npm run typecheck` et `npm test` doivent passer avant chaque commit ; le nombre de tests ne baisse jamais.
- Tests d'abord, puis le code. Vérifier toute modification d'interface dans un navigateur.
- Interface, erreurs et commits en français. Aucun secret dans le dépôt.
