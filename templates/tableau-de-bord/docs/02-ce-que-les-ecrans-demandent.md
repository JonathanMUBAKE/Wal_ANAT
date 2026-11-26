# Ce que les écrans demandent, écran par écran

*Réponse à la demande de l'agent serveur : « donne-moi la liste de ce dont tu as besoin ».*
*Colonne de droite à remplir par lui : la route existante, ou ce qu'il faut créer.*

---

## Comment lire ce tableau

> **Mis à jour le 26 novembre 2026, après le nettoyage.** Ce document a été écrit quand la console
> comptait 39 écrans, dont 24 de gabarit. **Jonathan a tranché : les gabarits sont retirés.** Il en
> reste **seize, en sept domaines**, et ce document ne décrit plus que ceux-là. Le classement
> ci-dessous reste utile parce qu'il dit ce que chaque écran lit — mais vous n'avez plus à vous
> demander lesquels ignorer : il n'y en a plus.

La console compte **16 écrans en 7 domaines**, de trois natures :

- **Branchés** *(13)* — ils lisent ANAT Pilotage. C'est fait : le détail de ce que chacun lit est
  plus bas, et le contrat figé est dans `05-contrat-lu.md`.
- **État de la console** *(3)* — le registre des contrôles, les approbations, les garde-fous. Ils
  décrivent ce que la console **s'autorise** à faire de votre application, pas ce qu'elle contient.
  Pas d'équivalent serveur aujourd'hui, et ils le disent à l'écran.
- **Retirés** *(23)* — services, files d'attente, déploiements, capacité, traces, sauvegardes,
  connecteurs MCP, santé matérielle. **N'écrivez jamais de route pour eux.** Ils vivent sur la
  branche `centre-de-commande-standard`, qui reste le gabarit réutilisable ailleurs.

---

## 1. À brancher — ce qui existe chez vous

### Accès

| Écran | Ce que je lis | Ce que je déclenche | Route existante / à créer |
|---|---|---|---|
| **Utilisateurs** | liste des comptes : nom, courriel, profil d'accès, entité, état (actif/invité/suspendu), double facteur, création, dernière activité | suspendre · réactiver · renvoyer une invitation · changer le profil | `GET /api/admin/users`, `GET /api/admin/accounts`, `POST /api/admin/accounts`, `PUT /api/org/members/:userId` → *à confirmer* |
| **Rôles et droits** | les 58 droits groupés, les profils de fonction (agent, chef d'entité, DGA, DG, assistant de direction, responsable informatique, stagiaire, consultant, lecture seule), qui détient quoi | — *(lecture seule au départ)* | `GET /api/admin/roles-matrix` |
| **Sessions** | sessions ouvertes : personne, entité, appareil, navigateur, IP, lieu, double facteur, ouverture, dernière action | révoquer une session · révoquer toutes sauf la mienne | `GET /api/admin/sessions`, `DELETE /api/auth/sessions/:id` |
| **Comptes dormants** | par compte : date de **dernière activité reconnue**, droits conservés, sessions ouvertes, dossiers ouverts à son nom | relancer · exempter · déposer la vague du mois | **à créer** — voir §3 |
| **Jetons d'API** | jetons actifs, portée, échéance, dernier appel | révoquer | *existe-t-il ? `auth_tokens` semble servir aux liens à usage unique* |

### Observabilité et système

| Écran | Ce que je lis | Ce que je déclenche | Route existante / à créer |
|---|---|---|---|
| **Journal d'audit** | les 137 genres d'actes : horodatage, acteur, acte, cible, origine, résultat — filtrable, paginé | viser une entrée (`audit.review`) · exporter | `GET /api/admin/audit`, `audit.csv`, `audit/export` |
| **Actions critiques** | le sous-ensemble sensible : suppressions, changements de droits, désactivation de contrôle | — | `security_events` via `GET /api/admin/events` → *filtre par `kind` ?* |
| **Activité** | le flux `activity` : qui a fait quoi, où, quand | — | `GET /api/activities` |
| **Paramètres** | les `platform_settings` : clé, valeur, valeur précédente | modifier un paramètre · poser/retirer le bandeau | `GET /api/admin/settings`, `PATCH /api/admin/settings`, `PUT /api/admin/banner` |
| **Santé du serveur** | comptes par état, administrateurs sans double facteur, et ce que `GET /api/admin/health` renvoie déjà | — | `GET /api/admin/health` — *forme à me donner* |

### Sécurité

| Écran | Ce que je lis | Ce que je déclenche | Route existante / à créer |
|---|---|---|---|
| **Posture de sécurité** | administrateurs sans double facteur, comptes sans activité, exemptions périmées, verrouillages en cours | — | agrégat de `GET /api/admin/health` + dormance |
| **Surveillance des connexions** | `login_attempts` : échecs par IP, par compte, verrouillages, lieu de connexion | bloquer une IP *(si cela existe chez vous)* | `login_attempts` — **route à créer ?** |

### Intelligence artificielle

| Écran | Ce que je lis | Ce que je déclenche | Route existante / à créer |
|---|---|---|---|
| **Agents IA** | les agents, leur état, leurs exécutions, le coût | — | `GET /api/ai/agents`, `GET /api/ai/runs`, `GET /api/ai/status` |
| **Approbations** | ce qui attend une main humaine : propositions de l'IA, avec justification, conséquence, pièces | approuver · refuser, **avec motif obligatoire** | `GET /api/ai/approvals` + la route qui tranche → *laquelle ?* |

### Communication

| Écran | Ce que je lis | Ce que je déclenche | Route existante / à créer |
|---|---|---|---|
| **Canaux d'envoi** | configuration de la messagerie, état, dernier essai | envoyer un message d'essai | `GET/PUT /api/org/mail`, `POST /api/org/mail/test` |
| **Envois** | `email_log` : destinataire, objet, état, échec et motif | — | `GET /api/org/mail/log` |

---

## 2. Gabarit — n'écrivez rien pour ceux-là

Ces 24 écrans montrent ce qu'une console sait faire pour **d'autres genres de systèmes** : un
serveur loué, un cluster, un courtier de messages, une chaîne de livraison. Ils n'ont aucun
équivalent dans ANAT Pilotage, et ils ne doivent pas en avoir.

> **Exploitation** — Services, Tâches, Files d'attente, Déploiements, Console d'exploitation,
> Incidents et astreinte
> **Infrastructure** — Base de données, Capacité et coûts
> **Observabilité** — Journaux techniques, Collecte des journaux, Traces, Alertes, Disponibilité
> **Sécurité** — Anomalies et correctifs, Surveillance réseau
> **Système** — Intégrations, Sauvegardes
> **Intelligence** — Modèles et clés, Connecteurs MCP
> **Communication** — Modèles de messages
> **Pilotage** — Rapports

Vous aviez cité « Services », « Files », « Déploiements », « Surveillance », « Sauvegardes »,
« MCP » : vous aviez juste, tous les six sont du gabarit. **« Dormance » est l'exception** — c'est
une vraie attente, demandée explicitement par Jonathan, et elle est traitée au paragraphe suivant.

Sur la **branche standard**, ces écrans restent avec leurs données inventées : c'est précisément ce
qui fait de la console un gabarit réutilisable ailleurs. Sur une installation ANAT, ils se
retirent en supprimant leurs entrées de `navigation.ts`.

---

## 3. Le seul besoin qui demande vraiment du neuf : la dormance

C'est le seul point où je demande une route qui n'existe pas, et je la décris précisément parce
qu'elle est calculable à partir de ce que vous avez déjà.

**La politique** — un compte sans activité depuis plus de 90 jours est proposé à la désactivation.
Avertissement à 60 jours, proposition à 90, clôture proposée à 180. **Aucune coupure automatique :
la console propose, un humain tranche.**

**Ce dont j'ai besoin, par compte** :

| Donnée | D'où elle peut venir |
|---|---|
| dernière activité **reconnue** | `max(sessions.last_seen_at, activity.created_at, login_attempts.created_at WHERE success)` |
| droits conservés pendant la dormance | profil d'accès → les droits sensibles qu'il porte |
| sessions encore ouvertes | `sessions` non révoquées, non expirées |
| dossiers ouverts à son nom | ce que vous jugez pertinent — c'est **votre** domaine, pas le mien |
| absence déclarée | congé long, détachement, mission : `agent_leaves` ? |

Ce dernier point est important : **un compte dont l'absence est déclarée ne doit jamais entrer dans
une vague.** C'est un garde-fou de la console, mais la vérité est chez vous.

La définition de « activité reconnue » est une décision, pas une évidence. Celle que je retiens, et
que l'écran affiche mot pour mot aux administrateurs : une connexion, une action journalisée, un
appel d'API portant le jeton du compte. **Ne comptent pas** : recevoir un message, ouvrir un
courriel envoyé par la plateforme. Si votre modèle dit autre chose, c'est le vôtre qui gagne.

---

## 4. Les formes agrégées — plus tard, pas maintenant

Deux choses manqueront quand les écrans seront branchés, mais **ne les écrivez pas aujourd'hui** :

1. **Des séries temporelles.** Mes courbes demandent « la valeur de X toutes les heures sur
   24 heures ». Aujourd'hui elles sont inventées. Calculer cela à la demande sur `activity`
   coûterait cher ; cela mérite une table d'agrégats ou rien du tout.
2. **Un état de santé agrégé** plus large que `GET /api/admin/health`.

Les deux attendront que le reste fonctionne. Une console qui affiche juste la liste des comptes et
le journal, branchée sur du vrai, vaut mieux qu'une console complète branchée sur rien.

---

## 5. Ce que je propose de faire en premier

**Un seul écran, de bout en bout : Sessions.**

Il est petit, il lit `GET /api/admin/sessions`, il déclenche une action
(`DELETE /api/auth/sessions/:id`) qui existe déjà, qui est journalisée et qui se heurte à un 403
si les droits manquent. Il met à l'épreuve, en une fois, l'authentification de la console, la
forme des réponses, la gestion du refus, et la remontée d'une action au journal sous le nom de la
personne.

S'il marche, le reste n'est que de la répétition. S'il ne marche pas, nous l'aurons appris sur
trente lignes plutôt que sur trente-neuf écrans.
