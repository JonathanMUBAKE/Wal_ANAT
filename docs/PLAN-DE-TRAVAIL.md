# Cadence — Plan de travail : corrections et améliorations

> Rédigé le 9 novembre 2026, après l'audit complet du système.
> Cadence = le projet de la conversation « Asana avec IA embarquée ».
> Dépôt : https://github.com/JonathanMUBAKE/cadence — branche de référence : `main`.

Ce document est la feuille de route partagée par **tous les agents** qui travaillent sur Cadence
(session cloud et session sur l'ordinateur). Il dit quoi faire, dans quel ordre, où, et comment
vérifier que c'est fait. Cochez les cases au fil de l'eau et commitez ce fichier avec le travail.

---

## 0. Règles de travail (à lire avant tout)

1. **Toujours partir de la dernière version** : `git fetch origin && git checkout main && git pull`.
2. **Une branche par lot** : `lot-a-securite`, `lot-b-robustesse`, `lot-c-console`… Jamais de travail direct sur `main`.
3. **Tests d'abord** (TDD) : écrire le test qui échoue, puis le code. Chaque lot ajoute ses tests dans `server/src/*.test.ts`.
4. **Avant chaque commit** : `npm run typecheck` et `npm test` doivent passer (51 tests aujourd'hui, ce nombre ne doit jamais baisser).
5. **Vérifier dans un navigateur** toute modification d'interface (`npm run build && npm start`, puis http://localhost:4000).
6. **Pousser** la branche sur `origin`, puis noter dans la section « Journal » en bas de ce fichier ce qui a été fait.
7. **Langue** : interface, messages d'erreur et commits en français.
8. **Ne jamais commiter** de secret (clé API, mot de passe) : ils vont dans `.env` (ignoré par git).

Commandes utiles : `npm install` · `npm run build` · `npm start` · `npm run dev` (rechargement à chaud) ·
`npm test` · `npm run typecheck` · `npm run e2e`.

---

## 1. État au 9 novembre 2026

| Vérification | Résultat |
| --- | --- |
| Tests serveur (Vitest) | 51 / 51 réussis |
| Typage TypeScript (serveur + web) | 0 erreur |
| Audit des dépendances (`npm audit --omit=dev`) | 0 vulnérabilité |
| Parcours navigateur (Playwright) | OK, aucune erreur JavaScript |
| Claude réel (clé API) | **non testé** (mode démo seulement) |
| Supabase réel | **non testé** (PGlite, même SQL) |
| Installateur Windows `.exe` | **non produit** (nécessite `wine`) ; zip Windows produit, non testé sur Windows |

Architecture et modules : voir `README.md` (section Architecture) et le rapport complet partagé séparément.

---

## 2. Erreurs constatées

| N° | Gravité | Constat | Où | Lot |
| --- | --- | --- | --- | --- |
| E1 | **Bloquant** | Connexion **sans mot de passe** : `POST /api/auth/login {user_id}` connecte n'importe qui (vérifié : connexion en tant que Hugo, réponse 200) | `server/src/app.ts` (route `/api/auth/login`) | A |
| E2 | **Bloquant** | `GET /api/auth/users` liste **tous les utilisateurs de toutes les organisations, avec leur e-mail**, sans être connecté | `server/src/app.ts` (route `/api/auth/users`), `web/src/pages/Login.tsx` | A |
| E3 | Élevé | Aucune limite de tentatives (force brute) ni en-têtes de sécurité HTTP | `server/src/app.ts` | A |
| E4 | Élevé | Secrets par défaut si `COOKIE_SECRET` / `CADENCE_SECRET_KEY` absents : sessions falsifiables et mots de passe SMTP déchiffrables avec une valeur publique | `server/src/app.ts` l.39, `server/src/crypto.ts` | A |
| E5 | Moyen | Une **seule file d'envoi d'e-mails** pour toutes les organisations : un SMTP lent (jusqu'à 20 s) bloque les autres ; aucun nouvel essai en cas d'échec | `server/src/mail.ts` (`enqueue`) | B |
| E6 | Moyen | Le temps réel (SSE) fait une requête en base **par événement et par personne connectée** pour vérifier les droits | `server/src/app.ts` (`route`) | B |
| E7 | Faible | Adresses de service en doublon de nom : `produit-et-design@` (équipe) et `produit-et-design-2@` (entité) | `server/src/mail.ts` (`ensureAddresses`) | B |
| E8 | Faible | La recherche traite `%` et `_` comme des jokers SQL | `server/src/services.ts` l.658 | B |
| E9 | Faible | `ensureAddresses` est appelé à chaque lecture d'adresses et à chaque envoi (requêtes inutiles) | `server/src/mail.ts` | B |

---

## 3. Lots de travail, dans l'ordre

### Lot A — Sécurité bloquante (avant toute mise en ligne)

Objectif : plus personne ne peut se connecter à la place d'un autre ni lister les utilisateurs.

- [x] **A1. Vraie authentification par e-mail + mot de passe** (corrige E1)
  - Migration `004_authentification.sql` : colonne `users.password_hash`, table `sessions` (id, user_id, created_at, expires_at, ip, user_agent, revoked_at), table `login_attempts`.
  - Hachage **argon2id** (paquet `@node-rs/argon2`) ou `crypto.scrypt` natif si on veut zéro dépendance native.
  - `POST /api/auth/login {email, password}` ; message d'erreur unique « E-mail ou mot de passe incorrect » (ne pas révéler si l'e-mail existe).
  - Cookie de session = identifiant de session opaque (plus l'id utilisateur), `httpOnly`, `sameSite=lax`, `secure` en production ; déconnexion = révocation en base.
  - Les coéquipiers IA n'ont jamais de mot de passe et ne peuvent pas se connecter.
  - **Mode démo conservé** derrière `CADENCE_DEMO=1` (choix d'un profil), désactivé par défaut en production.
  - Données de démo : mot de passe commun documenté dans le README (ex. `cadence-demo`).
  - Tests : connexion OK, mauvais mot de passe → 401, IA → refus, session révoquée → 401, cookie forgé → 401.
- [x] **A2. Fermer la liste publique des utilisateurs** (corrige E2)
  - Supprimer `GET /api/auth/users` hors mode démo ; page de connexion = formulaire e-mail + mot de passe.
  - Test : `GET /api/auth/users` → 404 quand `CADENCE_DEMO` n'est pas actif.
- [ ] **A3. Limitation de débit et en-têtes** (corrige E3)
  - `@fastify/rate-limit` : 10 tentatives de connexion / 15 min par IP et par e-mail ; 300 requêtes / min par session sur l'API.
  - `@fastify/helmet` : CSP adaptée à l'interface Vite, `X-Content-Type-Options`, `Referrer-Policy`, HSTS en production.
  - Protection CSRF : vérifier l'en-tête `Origin` sur les requêtes qui modifient (POST/PUT/PATCH/DELETE).
- [x] **A4. Secrets obligatoires en production** (corrige E4)
  - Si `NODE_ENV=production` et que `COOKIE_SECRET` ou `CADENCE_SECRET_KEY` manque ou fait moins de 32 caractères → refuser de démarrer avec un message clair.
  - Documenter dans `.env.example` et le README.
- [x] **A5. Mot de passe oublié** (utilise la messagerie existante)
  - Lien à usage unique valable 30 min, envoyé depuis `contact@<domaine>` de l'organisation (ou SMTP plateforme, voir Lot C).

**Critère de fin du lot A** : les 4 failles E1–E4 ont chacune un test qui échouait avant et passe après.

### Lot B — Robustesse

- [ ] **B1. Une file d'e-mails par organisation, avec reprise** (corrige E5)
  - Table `email_queue` (statut `pending/sending/sent/failed`, `attempts`, `next_attempt_at`) ; 3 essais avec délais croissants (1 min, 5 min, 30 min) ; envois parallèles entre organisations, séquentiels au sein d'une organisation.
  - Le journal `email_log` reste la trace visible dans l'onglet Messagerie.
  - Test : un SMTP qui ne répond pas pour l'organisation A ne retarde pas l'organisation B.
- [ ] **B2. Cache des droits pour le temps réel** (corrige E6)
  - Par connexion SSE, mémoriser les projets visibles ; invalider sur `project.changed`, `org.changed`, changements d'adhésion.
- [ ] **B3. Adresses de service** (corrige E7, E9)
  - Créer les adresses à la création d'une entité ou d'une équipe (abonnement au bus), plus à chaque lecture.
  - En cas de conflit de nom, suffixer par le type (`produit-et-design-dept@`) plutôt que par un chiffre.
- [ ] **B4. Recherche** (corrige E8) : échapper `%`, `_` et `\` avant le `ILIKE`.

### Lot C — Console d'administration (socle)

Besoin exprimé : une console qui gère **plusieurs entreprises clientes** (super admin de la plateforme)
**et** l'administration interne d'une entreprise (admin d'organisation).

- [ ] **C1. Rôle plateforme** : colonne `users.platform_role` (`super_admin` | null). Le premier super admin est créé par la commande `npm run admin:create -- --email … --password …` (jamais par l'interface).
- [ ] **C2. Espace `/admin`** (interface séparée, menu latéral propre) avec deux périmètres :
  - **Super admin** : toutes les entreprises.
  - **Admin d'entreprise** : son entreprise seulement (les pages réutilisent les mêmes composants, filtrées par organisation).
- [ ] **C3. Entreprises clientes** (super admin) : liste, création (nom, domaine, premier administrateur invité par e-mail), suspension (plus de connexion possible, données conservées), réactivation, quotas (nombre d'utilisateurs, d'agents IA, appels IA/mois).
- [ ] **C4. Utilisateurs** : liste filtrable (entreprise, rôle, statut), invitation par e-mail, désactivation, réinitialisation du mot de passe, sessions actives avec révocation, changement de rôle.
- [ ] **C5. Paramètres plateforme** (super admin) : SMTP par défaut de la plateforme (utilisé quand une entreprise n'a pas le sien), clé API IA par défaut, modèle par défaut.
- [ ] **C6. Supervision** : état de la base, file d'e-mails (en attente / échecs), exécutions IA du jour (nombre, erreurs, durée), dernières erreurs serveur, nombre de connectés. Rafraîchissement automatique.

### Lot D — Agents IA configurables

Besoin exprimé : « créer un agent IA, lui donner un prompt système, un nom, des attributions, une clé API, l'attacher à une organisation et qu'il fonctionne bien ».

- [ ] **D1. Fiche agent** : nom, photo, rôle affiché, **prompt système**, modèle (par défaut `claude-opus-5-5`), température, nombre maximal d'étapes.
- [ ] **D2. Attributions** : liste des outils autorisés (lecture seule ; créer des tâches ; modifier ; commenter ; mémoriser), et « agir sans validation » limité aux règles explicites. Le moteur (`server/src/ai/engine.ts`, `tools.ts`) refuse tout outil non attribué.
- [ ] **D3. Clé API** : chiffrée avec `server/src/crypto.ts` (comme le mot de passe SMTP), jamais réaffichée. Ordre de résolution : clé de l'agent → clé de l'entreprise → clé de la plateforme → mode démo. ⚠️ Décision ouverte, voir section 4.
- [ ] **D4. Rattachement** : un agent appartient à une organisation ; ajout aux projets et équipes comme un membre.
- [ ] **D5. Bouton « Essayer l'agent »** : envoie une question de test, affiche la réponse, la durée et l'erreur éventuelle (clé invalide, quota, modèle inconnu) en clair.
- [ ] **D6. Consommation** : jetons et coût estimé par agent, par entreprise et par mois ; plafond mensuel par entreprise (lié aux quotas C3).
- Le fournisseur `server/src/ai/provider.ts` doit être instancié **par agent** (clé et modèle propres) au lieu d'un fournisseur global.

### Lot E — Audit, sécurité et journaux

- [ ] **E1. Journal d'audit unifié** : qui, quoi, quand, depuis quelle IP, sur quel objet, avant/après. Les actions existantes passent déjà par `svc.log` : le compléter (connexions, échecs de connexion, changements de rôle, configuration SMTP, clés API, suspensions).
- [ ] **E2. Écran Audit** : filtres (personne, type d'action, période, entreprise), export CSV, rétention configurable (par défaut 1 an).
- [ ] **E3. Historique des connexions** par utilisateur (date, IP, navigateur, succès/échec).
- [ ] **E4. Politiques de sécurité par entreprise** : longueur minimale du mot de passe, expiration des sessions, double authentification (TOTP) obligatoire ou non, domaines e-mail autorisés.
- [ ] **E5. Journaux techniques** consultables : e-mails (existe), exécutions IA (existe), erreurs serveur (à ajouter : table `error_log` alimentée par le gestionnaire d'erreurs de `app.ts`).

### Lot F — Documents et aperçu intégré

- [x] **F1. Pièces jointes** (stockage objet : à faire si `STORAGE_URL` est retenu) sur les tâches et les commentaires : table `attachments` (stockage en base comme les photos, ou stockage objet S3/Supabase Storage si `STORAGE_URL` est défini), 25 Mo max par fichier, contrôle du type réel du fichier.
- [ ] **F2. Aperçu intégré** dans le panneau de tâche : images, PDF (lecteur du navigateur), texte et Markdown, Word (`.docx` → HTML avec `mammoth`), Excel (`.xlsx` → tableau avec `xlsx`/SheetJS).
- [ ] **F3. Droits** : un fichier hérite des droits de sa tâche ; téléchargement journalisé.

### Lot H — Paramétrage et administration système de l'ANAT (demandé le 10 novembre 2026, à coder après le registre des décisions)

Besoin exprimé : « dynamiser le paramétrage » ; les listes métier (types d'activités par exemple) se modifient dans les
paramètres, dans un **espace d'administration système réservé à l'administrateur système**.
**Pas de logique multi-organisations dans la version ANAT** : une seule institution, avec ses entités (directions,
services) et ses **représentations provinciales**. Ce lot remplace, pour l'ANAT, la partie « entreprises clientes » du Lot C.

Conception détaillée : `docs/PARAMETRAGE.md`.

- [x] **H1. Inventaire** de toutes les listes aujourd'hui figées dans le code (types d'activités, états de santé, statuts, rôles d'attribution, types de rapports entre entités, natures de documents au parapheur, types de réunions, catégories de courrier, unités des indicateurs…) : lesquelles deviennent paramétrables, lesquelles restent fixes parce que des règles en dépendent.
- [x] **H2. Référentiels paramétrables** : table de référentiels (libellé, code stable, ordre, couleur, icône, actif ou archivé) ; une valeur utilisée ne se supprime pas, elle s'archive ; chaque changement est journalisé. Fait pour les types d'activités et d'entités ; restent types de réunions, natures de documents, unités des indicateurs (voir `docs/PARAMETRAGE.md` § 2).
- [x] **H3. Espace « Administration système »** réservé à l'administrateur système (`platform_role`), distinct de l'administration courante : référentiels, paramètres de l'institution, sécurité, journaux.
- [x] **H4. Une seule institution** : retirer de l'interface ANAT le changement d'organisation et la création d'organisations ; l'isolation par `org_id` reste en place côté serveur (sans coût, et protège les données).
- [x] **H5. Provinces** : un type d'entité « représentation provinciale » dans la structure, avec ses entités, ses responsables et ses attributions, comme le siège.

### Lot G — Connecteurs (plus tard)

Messageries (Slack, Teams), visioconférence (Teams, Zoom, Meet), drives (Nextcloud, OneDrive, Google Drive),
réception d'e-mails sur les adresses de service pour créer des tâches. Le détail est dans
`docs/superpowers/plans/2026-11-09-p2-connecteurs.md`.

---

## 4. Décisions ouvertes (à trancher par Jonathan)

| N° | Question | Proposition par défaut |
| --- | --- | --- |
| Q1 | La clé API des agents IA vient-elle du super admin (pour tous les clients), de chaque entreprise, ou des deux ? | **Les deux** : clé plateforme par défaut, une entreprise peut fournir la sienne, un agent peut avoir la sienne |
| Q2 | Le mode démo (choix d'un profil sans mot de passe) doit-il rester disponible ? | Oui, uniquement avec `CADENCE_DEMO=1` |
| Q3 | Les pièces jointes : stockage en base ou stockage objet (Supabase Storage) ? | En base au départ, stockage objet dès que `STORAGE_URL` est défini |

| Q4 | Un contrat de consultant est-il toujours rattaché à un projet ? | Oui ; un appui ponctuel se range dans un projet « Appui » de l'entité |
| Q5 | Qui valide le compte rendu d'une réunion ? | La présidence de séance ; à défaut la DG |
| Q6 | Sélection des consultants : suivi des étapes ou module de passation des marchés ? | Suivi des étapes et des pièces |
| Q7 | Délais de référence (convocation, compte rendu, réponse au courrier) | 48 h, 48 h, 10 jours ouvrés, à confirmer, paramétrables |

Ne pas commencer le Lot D3 avant la réponse à Q1. Les lots P1 à P5 (`docs/PARCOURS-METIER.md` § 6) suivent les réponses à Q4 à Q7.

---

## 5. Journal

| Date | Qui | Lot | Ce qui a été fait | Branche / commit |
| --- | --- | --- | --- | --- |
| 2026-11-09 | Claude (session cloud) | — | Audit complet, rédaction de ce plan | `main` |
| 2026-11-09 | Claude (session sur l'ordinateur) | A (partiel) | A4 fait. E2 réduit : plus d'e-mail dans la liste publique. E1 contenu, pas corrigé : écoute locale par défaut, refus de démarrer sur le réseau ou en production sans `CADENCE_DEMO=1`. Un administrateur ne peut plus modifier un propriétaire. A1, A2, A3 et A5 restent à faire. | `lot-a-securite` |
| 2026-11-09 | Claude (session sur l'ordinateur) | Stabilisation | Tableau Kanban : dépôt fiable dans une colonne vide ou courte. Mentions accentuées, dates impossibles, membre inexistant, retards incohérents, plafond de 500 tâches, clés identiques entre organisations, exécutions IA orphelines ou impossibles à annuler, règles sur une section étrangère, date locale, `npm run dev` sous Windows, page d'erreur. E5 à E9 restent à faire (lot B). | `lot-a-securite` |
| 2026-11-09 | Claude (session sur l'ordinateur) | F (partiel) | Pièces jointes des tâches (F1, droits F3, images affichées). Import d'un projet depuis Word, Excel, CSV ou texte, avec relecture avant création. Puis pièces jointes des commentaires (F1), aperçu intégré (F2 : texte structuré pour Word, tableau pour Excel, pas de HTML venu d'un fichier), import des .doc, .xls et PDF, outil `read_attachment` pour les coéquipiers IA. SheetJS 0.20.3 installé depuis le CDN de l'éditeur, car la version du registre npm a des failles connues. Migrations 005 et 006 : 004 est prise par les rapports, l'authentification devra utiliser 007. | `lot-f-documents` |
| 2026-11-09 | Claude (session sur l'ordinateur) | Droits | Revue des actions sensibles. Suppression et sortie d'une tâche réservées à l'auteur et aux administrateurs ; suppression de section et archivage aux administrateurs ; actions IA payantes aux éditeurs ; cible d'une validation IA verrouillée ; annuaire limité pour les invités ; dernier responsable d'équipe protégé ; confirmations et journal complétés. Temps réel : relecture à la reconnexion. | `lot-f-documents` |
| 2026-11-09 | Claude (session sur l'ordinateur) | A | Authentification complète (A1, A2, A5 ; A3 sans @fastify/rate-limit : limites maison sur la connexion, en-têtes et contrôle d'origine). Hachage scrypt plutôt qu'argon2, sans dépendance native. Administrateur système (C1) créé par lien affiché au démarrage, sans mot de passe en ligne de commande. Profils dynamiques et exceptions par personne. Q2 tranchée : mode démo avec `CADENCE_DEMO=1`, local uniquement. Migration 007 ; les rapports (004) restent sur leur branche. | `lot-a-authentification` |
| 2026-11-09 | Claude (session sur l'ordinateur) | A (audit) | Audit de sécurité, puis correction des 3 failles critiques et 6 élevées, avec 31 tests dans `durcissement.test.ts`. Un compte en attente n'a de lien que par sa première organisation ; compte suspendu impossible à inviter, ses liens annulés. Réinitialisation uniquement par le SMTP de la plateforme. Ancienne route de rôle soumise à la règle des profils. Coéquipiers IA limités au périmètre du demandeur ; @mention et assignation soumises à `ai.delegate`. Essais de connexion comptés avant vérification, scrypt plafonné à 2 calculs, `TRUST_PROXY` en nombre de proxys. 2FA verrouillée par compte (migration 008). Jetons après le `#` des liens. Restent : 8 failles moyennes de l'audit, 2FA obligatoire pour les administrateurs, confirmation de l'adresse à la première invitation. | `lot-a-authentification` |
| 2026-11-09 | Claude (session sur l'ordinateur) | A (audit) | Audit multi-tenant : 110 routes × 7 profils, scénarios d'attaque, schéma et qualité. Constats, corrections par lots et décisions dans `docs/AUDIT-MULTI-TENANT.md`. Aucune correction appliquée à ce stade. | `lot-a-authentification` |
| 2026-11-09 | Claude (session sur l'ordinateur) | A (audit, lot 1) | Invitations avec acceptation par le titulaire, liens envoyés uniquement par le SMTP de la plateforme, obligatoire hors usage local (migration 009, table `org_invitations`). Plus d'ajout direct d'un compte à une organisation. Photo modifiable par son seul titulaire. Session contrôlée avant la lecture du corps. Rôle explicite plafond, droit `teams.join`. 20 tests dans `isolation.test.ts`. Restent les lots 2 à 5 de `docs/AUDIT-MULTI-TENANT.md`. | `lot-a-authentification` |
| 2026-11-09 | Claude (session sur l'ordinateur) | A (audit, lot 2) | Limites par IP, session, personne (IA), organisation (invitations, exécutions IA) et connexions temps réel, sans dépendance ajoutée. Organisation active périmée : 409 au lieu d'un repli. `org_id` et clés composites posés sur les tables métier, remplis par la base (migration 010). `matrice.test.ts` rejoue tout le contrat d'accès et échoue si une route n'y figure pas. Les politiques RLS par organisation restent à faire : elles exigent un environnement Supabase réel. | `lot-a-authentification` |
| 2026-11-09 | Claude (session sur l'ordinateur) | A (audit, lot 3) | Lectures sans écriture (adresses de service tenues à jour sur événement). Commentaires soumis à `tasks.comment` de bout en bout. Un administrateur n'agit plus sur un pair. Projet archivé en lecture seule. Règles IA suspendues au droit de leur créatrice et plafonnées ; la validation automatique ne couvre plus la modification d'une tâche. Profil système Lecture seule (migration 011). | `lot-a-authentification` |
| 2026-11-09 | Claude (session sur l'ordinateur) | A (audit, lot 4) | Consommation atomique des codes et décisions IA, lien de réinitialisation annulé au changement de mot de passe. Sur un serveur HTTPS : 2FA obligatoire pour administrer, SMTP interne refusé, cookies sécurisés. HTTPS et certificat Supabase exigés au démarrage. Champs bornés, caractère NUL refusé, `%` et `_` échappés. Chiffrement HKDF versionné, ancien secret public retiré, codes de secours salés, journaux purgés et adresses masquées. | `lot-a-authentification` |
| 2026-11-09 | Claude (session sur l'ordinateur) | A (audit, lot 5) | Biome (lint et formatage, car ESLint et Prettier dépendent d'une API absente de TypeScript 7) et intégration continue GitHub. Toutes les clés étrangères indexées (migration 012), liste des projets sans N+1, historique conservé à la suppression d'un projet, invitation transactionnelle, erreurs d'outil assainies, arrêt ordonné. Restent, à traiter comme chantiers dédiés : découpage de `Services` et des fonctions complexes (Q-03, Q-04), plusieurs serveurs (Q-08), suppression logique et idempotence (fin de Q-09), politiques RLS par organisation. | `lot-a-authentification` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — réunions (serveur) | Dépôt Wal_ANAT créé. Réunions, compte rendu au modèle officiel (numéro annuel, export Word à la charte), recommandations suivies, validation par un autre que le rédacteur, confidentialité, matrice des droits complétée. Interface à suivre. | `lot-reunions` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — système complet | Design raffiné aux couleurs de l'Agence, activités (commissions, conférences, rendez-vous, internes), projets internes ou confiés, grand tableau de bord et tableau par projet, plans figés et révisions, livrables, consultants, parapheur, courrier, risques, indicateurs, attributions, écarts de participation. Données fictives : `npm run demo:anat`. Restent à faire : voir le document ANAT, section État de construction. | `lot-plans` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — identité visuelle | Le territoire comme fil visuel : courbes de niveau tracées à l'ouverture (bandeaux, en-têtes, connexion), barre latérale bleu nuit, jauge de santé du portefeuille, une teinte par forme d'activité (toujours avec icône et nom), frise des sept prochains jours, jauge d'exécution des recommandations. Vérifié en clair, en sombre et sur téléphone. | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — style des modèles fournis | Sur les modèles choisis par l'utilisateur : fond gris clair, grandes cartes blanches très arrondies, boutons et onglets en pilule, icônes cerclées, barre latérale claire flottante, chiffres en Geist demi-gras. Tableau de bord recomposé : carte chiffre mise en avant au bleu de l'Agence, anneau de santé, barres arrondies par forme (filtre au clic), agenda en cartes, décisions en cartes pastel, indicateurs en barres épaisses. Le relief topographique reste sur les cartes foncées. | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — système de design « Cadastre » | `docs/DESIGN-SYSTEM.md` : principes, jetons, composants, gabarits, règles d'écriture et lexique. Briques de collection (`collection.tsx`) : en-tête avec compteur, filtres repliables, sélecteur de vue, recherche « / », tableau triable avec sélection, export CSV et pagination, colonnes kanban, mini-mois, grille horaire, grille mensuelle. Réunions en trois vues (Liste, Tableau par étape, Calendrier jour/semaine/mois avec prochaine réunion et panneau de détail). Le choix de vue est mémorisé sur le poste. | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — harmonisation façon Asana | Échelle unique : commandes de 36 px au rayon de 10 px, cartes à 16 px, pilules réservées aux statuts, ombres retirées des éléments posés. En-tête de page unique (fil d'Ariane, titre, une rangée d'onglets soulignés, outils à droite). Liste des réunions groupée par étape, sections repliables. Barre latérale blanche rangée en sections (Pilotage, Secrétariat, Organisation, Projets). Tableau de bord ramené à la même échelle. Règles ajoutées à `docs/DESIGN-SYSTEM.md`. | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — ajustements d'après quatre modèles Dribbble | Action principale à l'encre bleu nuit, chiffres clés regroupés dans une carte « vue d'ensemble » à filets avec pastilles d'état, point de situation en bandeau clair, relief topographique retiré du tableau de bord (gardé sur la connexion). | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — charpente des modèles | Barre du haut (recherche, accès rapides, notifications, pastille du compte), barre latérale avec marque en tête et sections en petites capitales, en-têtes de tableau sur bande grise arrondie. Le menu du compte quitte la barre latérale. | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — tableau de bord allégé | Après critique : couleurs réduites aux états (barres en une seule teinte, décisions neutres), portefeuille ramené aux six priorités avec lien vers le portefeuille complet, recommandations intégrées aux indicateurs, trois rangées équilibrées au lieu de onze cartes. Page environ un tiers plus courte. | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — tableau de bord façon LumiLearn | Graphique en vedette (agenda des sept jours, jour le plus chargé accentué, clic pour filtrer), anneau fin et trois lignes à carrés pastel, décisions en cartes pastel, chiffres clés à icônes pastel, colonne de droite avec mini-calendrier, programme en frise, point de situation et risques. | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — tableau de bord en grille bento | Tri : gardé ce qui sert à décider (quatre chiffres d'action, santé, décisions, agenda, priorités, indicateurs, risques) ; retiré le mini-calendrier (doublon de l'agenda), « Écarts » et la bande de chiffres secondaire. Grille de 12 colonnes, carte Assistant IA sur deux rangées avec le point de situation et trois demandes prêtes. Tout le tableau tient dans un écran. | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — gabarit étendu à toutes les pages | `PageHeader` et `Tabs` alignés sur le gabarit (fil d'Ariane, carré d'icône, titre 24 px, onglets soulignés) : Activités, Plans, Livrables, Parapheur, Courrier, Attributions. Champs ramenés à 36 px. Livrables groupés par étape. | `lot-identite` |
| 2026-11-10 | Claude (session sur l'ordinateur) | ANAT — architecture de l'information | `docs/ARCHITECTURE-INFORMATION.md` : chaque objet a un seul domicile. Attributions, écarts et référentiel des domaines intégrés à Organisation › Structure ; la fiche d'attributions s'ouvre dès la création d'une entité et se consulte depuis son panneau. Portefeuille = projets + activités. Groupe Suivi-évaluation (plans, livrables et missions). Section « Projets » retirée de la barre latérale. `/attributions` renvoie vers `/org?tab=attributions`. | `lot-identite` |
| 2026-11-11 | Claude (session sur l'ordinateur) | ANAT — scénarios et cohérence logique | `docs/SCENARIOS.md` : chaque module rejoué, 18 incohérences corrigées et verrouillées par `scenarios.test.ts` (réunions, activités, tableau de bord, plans, livrables, parapheur, courrier). Nouvelle route « paiement constaté » (matrice à jour) et migration 018. Manques listés, en tête le registre des décisions de la DG. | `lot-identite` |
| 2026-11-11 | Claude (session sur l'ordinateur) | ANAT — registre des décisions de la DG | Migration 019 (`dg_decisions`, clés composites, RLS) ; droits « Consulter le registre » (membres) et « Enregistrer les décisions de la DG » (administration). Numéro annuel `DEC/AAAA/NNNN`, texte figé (aucune route de modification), exécution à sens unique (à exécuter → en cours → exécutée), correction par décision de remplacement, confidentialité héritée du dossier, refus d'un coéquipier IA, décision attendue du dossier levée, chargé puis secrétariat prévenus, tout journalisé. Tableau de bord : « Arbitrer » ouvre l'enregistrement, retards d'exécution comptés. Page Pilotage › Décisions. 10 tests (`decisions.test.ts`), 4 routes dans la matrice : 386 tests au vert. Demande notée pour plus tard : Lot H (paramétrage, administration système, institution unique avec provinces). | `lot-identite` |
| 2026-11-11 | Claude (session sur l'ordinateur) | H — paramétrage et administration système | `docs/PARAMETRAGE.md` (inventaire des listes, principes, contrat). Migration 020 : table `ref_values` (code stable, archivage, propriétés), contrainte figée des types d'activités retirée, types d'entités convertis en codes. Types d'activités et d'entités paramétrables ; les règles figées deviennent des propriétés (confidentielle par défaut, avancement suivi, libellé de l'interlocuteur, province). Routes `GET /api/referentials`, `POST` et `PATCH /api/admin/referentials` réservées à l'administrateur système, journalisées. Onglet « Paramètres de l'institution » dans Administration système ; portefeuille, tableau de bord et structure lisent le référentiel ; repère « Province ». Menu du compte : plus de changement ni de création d'organisation. 8 tests (`referentiels.test.ts`), 3 routes dans la matrice : 394 tests au vert. | `lot-identite` |
| 2026-11-11 | Claude (session sur l'ordinateur) | Conception — parcours métier | `docs/PARCOURS-METIER.md` : huit parcours concrets (réunion et compte rendu, recrutement d'un consultant jusqu'au paiement, projet, courrier, plan de travail, représentation, décision, entité), principe du dossier, qui est qui (un consultant n'est pas une équipe ; ses attributions sont ses termes de référence), réorganisation (le projet devient le dossier complet, retrait du module « Livrables et missions ») et lots P1 à P5. Aucun code modifié. | `lot-identite` |
| 2026-11-11 | Claude (session sur l'ordinateur) | P1 — le projet devient le dossier complet | Migration 021 : contrats et livrables rattachés au projet (clé composite, suppression du projet refusée), tranche de paiement par livrable. Serveur : projet exigé pour toute nouvelle pièce (réponse par défaut à Q4), contrat et livrable dans le même projet, tranches plafonnées à 100 %, montant « à payer » au procès-verbal, lecture par les membres du projet, totaux payé / à payer par contrat. Écrans : onglets « Livrables » et « Contrats » du projet (échéancier, évaluation du prestataire), livrables à produire et à valider dans « Mes tâches », vue « Contrats et paiements » dans le portefeuille pour le service financier ; module « Livrables et missions » retiré (l'ancienne adresse mène à Mes tâches). Démonstration : étude foncière rangée dans un projet, trois tranches 30 / 40 / 30 %. 8 tests (`dossier.test.ts`), tests existants mis à jour sans rien retirer. | `lot-identite` |
| 2026-11-11 | Claude (session sur l'ordinateur) | P2 — la réunion programmée (**en cours, sauvegarde intermédiaire**) | **Fait côté serveur** : migration 022 (présidence, visioconférence, dossier rattaché, série, convocation, réponses, soumission, retour, pièces), règles et routes (convoqués, convoquer, répondre, pièces, soumettre, retourner, valider par la présidence, diffusion), point de suivi d'office, 16 tests (`reunion-programmee.test.ts`), tests existants passés au circuit « soumettre puis valider », 8 routes dans la matrice. Fichiers ciblés au vert (81 tests). **Reste à faire** : écrans (programmer avec convoqués et série, convoquer, répondre, pièces, soumettre / retourner / valider, onglet Réunions du projet, étapes de la liste), vérifier les données de démonstration, suite complète, navigateur. Tant que les écrans ne sont pas faits, le bouton « Valider » de l'écran actuel est refusé par le serveur (il faut d'abord soumettre). | `lot-identite` |
| 2026-11-12 | Claude (session sur l'ordinateur) | P2 — la réunion programmée (**terminé**) | Écrans mis au niveau du serveur : programmation avec présidence, visioconférence, convoqués (personne, entité, extérieur) et série ; carte « Convocation » (envoi, urgence sous 48 h, réponses visibles, ajout/retrait de convoqués) ; bannière « Vous êtes convoqué·e » avec Présent / Excusé / Représenté par ; pièces de l'ordre du jour (joindre, télécharger, supprimer) ; circuit du compte rendu à l'écran (Soumettre → Retourner avec motif / Valider par la présidence) ; nouvel état « Soumis à validation » dans la liste, le tableau et le calendrier ; onglet « Réunions » du projet. Démonstration enrichie (compte rendu soumis, comité convoqué avec réponses, série mensuelle avec les provinces, comité de pilotage rattaché au projet). Vérifié au navigateur. 418 tests au vert. | `lot-identite` |
| 2026-11-11 | Claude (session sur l'ordinateur) | P3 — les liens qui donnent du sens (trois commits : P3a, P3b, P3c) | **P3a** (migration 023) : décisions de séance saisies par point d'ordre du jour, inscrites au registre des décisions à la validation du compte rendu (numéro, confidentialité héritée, chargé prévenu, jamais deux fois), recommandations d'un compte rendu rattaché à un projet devenant tâches du projet, suivis synchronisés dans les deux sens, rapport Word enrichi. **P3b** (migration 024) : la réponse sortante clôt l'entrant et reste liée dans les deux sens, instruction d'imputation conservée et transmise, courrier rattaché à un dossier. **P3c** (migration 025) : projet et activité rattachés à l'activité du plan qu'ils réalisent (gestionnaires seuls), avancement remonté partout (plan, liste, retards du tableau de bord), saisie manuelle refusée dès qu'un dossier existe, catalogue `GET /api/plan-activities`. 14 tests (`liens.test.ts`), 430 au total. Vérifié au navigateur, démonstration enrichie. | `lot-identite` |
| 2026-11-11 | Claude (session sur l'ordinateur) | Conception d'ensemble et module Partenaires | `docs/CONCEPTION.md` : vision commune, carte des modules, état de chaque module (construit, partiel, à construire), conception détaillée du module Partenaires (annuaire unique des tiers, types et catégories paramétrables, états, contacts et points focaux, accords numérotés `CONV/AAAA/NNNN` avec avenants, engagements et décaissements, pièces, réunions avec le partenaire, liens avec projets, activités, courrier, contrats, parapheur et tableau de bord), droits, règles serveur, données, lots PA1 à PA5, questions Q8 à Q13. Aucun code modifié. | `lot-partenaires` |
| 2026-11-11 | Claude (session sur l'ordinateur) | PA1 — l'annuaire des partenaires | Migration 026 : `partners`, catégories, points focaux, contacts, historique (clés composites, RLS, index) ; listes `partner_type` et `partner_category` ajoutées aux référentiels (propriétés `public`, `financial`, `supplier`). Droits « Consulter l'annuaire » (membres) et « Gérer les partenaires » (administration). Serveur : doublons refusés sur nom, sigle ou identifiant officiel ramenés à leur forme simple (409 avec la fiche existante), fusion d'un doublon (contacts, échanges, catégories et points focaux déplacés ; la fiche absorbée reste lisible et renvoie à l'autre), cycle d'états fixe avec motif pour suspendre, clore ou rouvrir, point focal limité à faire avancer la discussion et à tenir la fiche, confidentialité, suppression seulement d'une fiche jamais sortie de « Identifié » et sans échange, contacts archivés et jamais supprimés avec un seul principal, notes d'échange datées et non modifiables, aucune écriture par un coéquipier IA, tout journalisé. Écrans : Partenariats › Partenaires (onglets par état, recherche, filtres type et catégorie), fiche (Vue d'ensemble, Contacts, Historique, changement d'état, fusion), listes paramétrables dans Administration système. Démonstration fictive (six partenaires). 19 tests (`partenaires.test.ts`), 10 routes dans la matrice : 449 tests au vert. Vérifié au navigateur (gestionnaire, membre, téléphone). | `lot-partenaires` |
| 2026-11-11 | Claude (session sur l'ordinateur) | PA2 — accords et pièces de collaboration | Migration 027 : `agreements` (registre `CONV/AAAA/NNNN` par année de signature, avenants rattachés, seuil d'alerte), `agreement_parties` (multipartite, un chef de file), `partner_documents` ; listes `agreement_type` (`binding`, `financial`) et `partner_doc_nature` (`official`). Serveur : accord en préparation lié à un ou plusieurs partenaires vivants, ni suspendus ni clos (ils passent « En discussion ») ; préparé par un gestionnaire ou le point focal d'un partenaire ; type contraignant en vigueur seulement par le parapheur (texte scellé pendant le circuit, rejet = retour en préparation, signature = entrée en vigueur via un point d'accroche du parapheur) ou par l'exemplaire signé joint, déclaré par un gestionnaire ; à l'entrée en vigueur : numéro, texte figé, partenaires actifs ; avenant numéroté qui reporte sa nouvelle échéance ; résiliation motivée par un gestionnaire ; « échu » calculé (sauf reconduction tacite) ; un partenaire lié par un accord en vigueur ne se clôt pas ; alertes à 90, 30 et 7 jours (balayage horaire) ; confidentialité héritée des partenaires ; pièces par nature (officielle = jamais supprimée), téléchargement journalisé ; fusion des partenaires étendue aux accords et pièces ; aucune action par l'IA. Écrans : Partenariats › Conventions (registre, alerte d'échéance), fiche accord (texte, parties, dates, pièces, avenants, parapheur, entrée en vigueur, résiliation), onglets Accords et Documents de la fiche partenaire, listes dans Administration système. Démonstration fictive (protocole en vigueur avec avenant, convention au parapheur, convention en préparation). 18 tests (`accords.test.ts`), 12 routes dans la matrice. Vérifié au navigateur (avenant, signature au parapheur, pièces). | `lot-partenaires` |
| 2026-11-12 | Claude (session sur l'ordinateur) | PA3 — les liens des partenaires | Migration 028 : commanditaire de projet, interlocuteur d'activité, correspondant et contact du courrier, prestataire de contrat rattachés à l'annuaire ; table `meeting_partners` et contact sur les convoqués. Module `partner-links.ts` (partenaire de l'institution, fiche vivante ; un partenaire clos n'est plus proposé mais un lien existant reste valable ; un prestataire porte une catégorie « prestataire » ; contact non archivé et du bon partenaire). Le texte libre reste et se remplit du nom du partenaire s'il est vide ; une réponse de courrier hérite du partenaire de l'entrant ; un contact convoqué ajoute son partenaire à la réunion. La fiche partenaire rassemble dossiers, contrats, réunions et courrier, chaque module appliquant ses propres droits (projet privé, audience et courrier confidentiels masqués). Fusion étendue à tous ces liens ; une fiche liée ne se supprime plus. Rapprochement de l'existant : textes libres sans fiche groupés avec suggestion (même nom ou sigle), reliés après relecture par un gestionnaire, texte d'origine conservé, mentions confidentielles exclues, tracé. Écrans : choix du partenaire dans la fiche projet, les activités, l'enregistrement du courrier et les contrats ; partenaires et contacts dans la programmation des réunions ; onglets Dossiers, Réunions (« Programmer une réunion » prérempli), Courrier ; page « Rapprocher l'existant ». Démonstration : réunion de suivi avec le bailleur fictif, courrier du ministère fictif. 11 tests (`liens-partenaires.test.ts`), 2 routes dans la matrice. Vérifié au navigateur. Correctif révélé à minuit : le contrôle « accord en vigueur » et la date des événements de la fiche utilisaient `CURRENT_DATE` de la base (UTC) au lieu de la date locale du serveur ; les tests des partenaires calculent aussi leurs dates en heure locale. | `lot-partenaires` |
| 2026-11-12 | Claude (session sur l'ordinateur) | Harmonisation des vues, documents, rappels (quatre commits) | **Règles** (`docs/DESIGN-SYSTEM.md` § 4 et 5) : consulter d'abord, modifier ensuite ; page pour un dossier, tiroir pour consulter une fiche secondaire, modal pour décider ; 20 règles de comportement pour une institution publique. **Fiches en lecture puis « Modifier »** : partenaire, accord, activité, réunion (compte rendu mis en forme, éditeur sur demande) ; contact, document, courrier, décision et document du parapheur dans un **tiroir**, fermeture protégée quand des modifications ne sont pas enregistrées. **Grilles CRUD** selon les droits : annuaire, contacts (suppression d'un contact jamais cité, sinon archivage), documents, registre des conventions, accords du partenaire, portefeuille, courrier. **Documents décrits par type** (migration 029) : date de production, d'expiration, référence, précision du type « Autre », nature « Contrat », contrôles serveur, documents expirés signalés. **Types dynamiques** : « Autre… » crée un type de partenaire, une catégorie, un type d'accord, une nature de document ou un type d'activité par le gestionnaire du module (`POST /api/referentials`). **Documents des dossiers** (migration 030) : espace Documents du projet, pièce numérisée du courrier, documents de l'activité. **Aperçu à la demande** (œil) : PDF et images dans la page, Word, Excel et texte en texte structuré. **Courriels** : signés « ANAT Pilotage » avec le lien vers l'outil ; **rappels d'échéance** (migration 031) pour tâches, courrier imputé, décisions, recommandations et livrables, une fois avant et une fois en retard. **Correctif** : tout le serveur et l'interface prennent la date locale (entre minuit et 1 h, une décision du jour était refusée comme « future »). | `lot-partenaires` |
| 2026-11-12 | Claude (session sur l'ordinateur) | Réunions antérieures et postérieures | À la création d'une réunion, choix « à venir » (date à partir d'aujourd'hui, programmée puis convoquée) ou « déjà tenue » (date au plus tard aujourd'hui, enregistrée « tenue » pour la traçabilité, participants notés présents, ni convocation ni série) ; contrôlé par le serveur, proposé partout où l'on crée une réunion. 2 tests (`reunions-anterieures.test.ts`) : 495 tests au vert. | `lot-partenaires` |
