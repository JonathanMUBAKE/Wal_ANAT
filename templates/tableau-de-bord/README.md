# Centre de commande — gabarit de tableau de bord

Gabarit de référence pour les interfaces d'administration : **vingt-huit pages** remplies,
habillées à la charte UniFi, avec des agents IA embarqués sous validation humaine.
À recopier et à rhabiller projet par projet.

```
templates/tableau-de-bord/
├── react/                            ← la source de vérité
│   └── src/
│       ├── styles/tokens.css         ← les jetons : la SEULE chose à changer pour rhabiller
│       ├── lib/
│       │   ├── navigation.ts         ← source unique du rail, du panneau et de la palette
│       │   ├── donnees.ts            ← socle simulé (comptes, journaux, audit, alertes)
│       │   ├── sigrh.ts              ← le cas simulé : services, tâches, files, sessions…
│       │   ├── infrastructure.ts     ← capteurs matériels, système, base de données
│       │   ├── intelligence.ts       ← agents IA, modèles, connecteurs MCP
│       │   ├── communication.ts      ← SMTP, SMS, WhatsApp, modèles, envois
│       │   └── format.ts             ← formats français, export CSV, jetons CSS
│       ├── composants/               ← la bibliothèque réutilisable
│       ├── vues/                     ← les vingt-huit écrans
│       └── CentreDeCommande.tsx      ← la coquille (rail + panneau + barre + clavier)
└── maquette/centre-de-commande.html  ← première maquette d'un fichier (habillage d'origine)
```

```powershell
cd templates\tableau-de-bord\react; npm install; npm run dev
```

`npm run typecheck` et `npm run build` passent. React 19 · Vite 7 · Tailwind 4 · TypeScript 5 ·
Chart.js 4. Rien d'autre : icônes en ligne, graphiques pilotés directement, ni bibliothèque de
composants ni routeur.

## Les vingt-huit pages

| Domaine | Pages |
|---|---|
| **Pilotage** | Vue d'ensemble · Activité · Rapports |
| **Contrôles** | **Registre des contrôles** · **Approbations** · **Garde-fous** |
| **Exploitation** | Services · Tâches · Files d'attente · Déploiements · **Console d'exploitation** · **Incidents et astreinte** |
| **Infrastructure** | Santé du serveur · Base de données · **Capacité et coûts** |
| **Sécurité** | **Posture de sécurité** · **Anomalies et correctifs** · **Surveillance réseau** |
| **Observabilité** | Journaux · **Collecte des journaux** · **Actions critiques** · Traces · Alertes · Disponibilité |
| **Intelligence** | Agents IA · Modèles et clés · Connecteurs MCP |
| **Communication** | Canaux d'envoi (SMTP · SMS · WhatsApp) · Modèles de messages · Envois |
| **Accès** | Utilisateurs · Rôles et droits · Sessions · **Comptes dormants** · Jetons d'API |
| **Système** | Paramètres · Intégrations · Sauvegardes · Journal d'audit |

**Trente-neuf écrans, dix domaines.** Le centre de commande sert **l'administration système** :
exploitation, infrastructure, sécurité, observabilité, intelligence artificielle, communication,
accès, système — et les contrôles qui encadrent tout cela.

> **Ce que ce tableau de bord n'est pas.** Une première version portait des écrans métier —
> portefeuille de projets, courrier, séances, registre des décisions, signataire. C'était une
> erreur de frontière : *un administrateur système ne gère pas les dossiers.* Il regarde des
> statistiques, gère des comptes, voit l'activité, surveille la santé du système et tranche ce qui
> attend une main humaine. Ces six écrans ont été retirés le 26 novembre 2026 ; ils restent
> accessibles dans l'historique au commit `e27c053`.

## Le brancher sur un vrai système

La console tourne aujourd'hui sur des données inventées. Le travail de raccordement à une
application réelle — ANAT Pilotage en premier — se mène avec l'agent qui développe cette
application, par échange de documents dans **`docs/`** :

| Fichier | Ce qu'il contient |
|---|---|
| `docs/00-bonjour.md` | la proposition de travail en commun |
| `docs/01-architecture-proposee.md` | les deux patrons possibles, et pourquoi la console est séparée |
| `docs/02-ce-que-les-ecrans-demandent.md` | écran par écran : ce qui se lit, ce qui se déclenche |
| `docs/03-questions.md` | les questions des deux côtés, et les réponses |
| `docs/04-plan-commun.md` | le plan en sept lots |
| `docs/JOURNAL.md` | une ligne datée par pas |

Deux décisions sont déjà prises et valent pour toute application branchée : **la console n'a pas
d'identité propre** — elle porte la session de la personne et se heurte aux mêmes refus que
n'importe qui — et **l'application reste seule juge** de ses règles. La console est un miroir,
jamais un gardien.

## Rien ne se fait sans contrôle

Le domaine *Contrôles* est la colonne vertébrale de l'outil, pas un module de plus.

**Le registre** recense chaque geste que l'outil permet, et ce qu'il faut traverser pour le
faire : son effet (lire, écrire, détruire, configurer, envoyer, exécuter), son niveau de contrôle
(libre · confirmation · mot à retaper · double regard · quorum de deux · interdit), qui peut le
déclencher, s'il est journalisé, s'il se défait et dans quel délai, et **pourquoi ce niveau** —
la colonne qu'on relit dans six mois. Chaque type d'effet a un **plancher** : une destruction
exige au minimum un double regard. Un geste sous son plancher est un **défaut**, affiché en tête
de page tant qu'il dure — sauf s'il porte un **écart signé** : le motif, le nom de celui qui
l'assume, la date, et la date à laquelle on y revient. Un contrôle allégé en silence est un
défaut ; allégé par écrit, c'est une décision.

Le registre se protège lui-même : relever ou abaisser un niveau est le geste `G-062`, sous
quorum de deux et vingt-quatre heures de délai. Couper une journalisation est le geste `G-063`,
et il est **interdit** — retiré de l'outil, pas seulement fermé.

**Les approbations** réunissent dans une file unique tout ce qui attend une main humaine :
correctifs proposés par l'IA, opérations, appels MCP en écriture, suppressions, envois en masse,
dérogations. Trois files qu'on ne regarde plus deviennent une file qu'on vide. L'écran tient
quatre règles : un avis sans motif n'est pas un avis (les boutons restent inertes tant que rien
n'est écrit) ; un agent ne donne qu'un avis par demande et le demandeur n'approuve jamais sa
propre demande ; une demande non tranchée expire et ne s'exécute pas — le silence ne décide de
rien ; l'IA propose, mais c'est le nom de l'approbateur qui est inscrit au journal.

**Les garde-fous** sont ce qui refuse le geste *avant* qu'il soit demandé : fenêtres de
changement, gel de fin de période, plafonds d'envoi et de dépense, séparation des tâches,
dépendances (pas de migration sans retour arrière testé), listes blanches, formes refusées à
l'entrée (une requête d'écriture sans clause de restriction, un jeton sans échéance). Un contrôle
réclame une main ; un garde-fou, lui, dit non — et c'est ce qui évite les deux cents approbations
qu'on finirait par signer sans lire. Une règle éteinte reste affichée en tête de page, avec un
rappel hebdomadaire, jusqu'à ce qu'elle soit remise.

### La politique de dormance

Un compte qu'on n'utilise plus ne gêne personne : c'est précisément le problème. Il garde ses
droits, il ne lève aucune alerte, et personne ne s'étonne qu'il ne fasse rien. C'est le compte
qu'on vole. Ce qui est dangereux n'est donc pas la dormance, c'est **la dormance avec des
droits** — et l'écran trie dans cet ordre, pas dans celui des jours : un ordonnateur absent
depuis trois mois passe devant un lecteur absent depuis sept.

Trois seuils, et **aucune coupure automatique**. À 60 jours l'agent et son responsable sont
prévenus, et rien ne change sur le compte. À 90 jours le compte entre dans la vague du mois,
déposée dans la file d'approbation avec sa fiche complète : ce qu'il a fait en dernier, les
droits qu'il conserve, les dossiers qu'il laisserait sans propriétaire. Un humain tranche compte
par compte, et toute désactivation se défait d'un clic pendant 30 jours. À 180 jours la clôture
est proposée, le repreneur des dossiers étant nommé avant la coupure, jamais après.

L'écran dit aussi, mot pour mot, **ce qui compte comme activité** : une connexion, une action
journalisée, un appel d'API portant le jeton du compte — et ce qui n'en est pas, à commencer par
l'ouverture d'un courriel envoyé par la plateforme. L'avertissement de 60 jours reprend les deux
listes, parce qu'un agent coupé sans avoir compris pourquoi est un agent qu'on recréera dans
l'urgence, avec les mêmes droits et moins de contrôle.

Les exemptions — congé long, détachement, mission, compte de service — se signent comme un écart
au registre : un motif, un signataire, **une date de revue**. Sans date de revue l'écran les
refuse (`GF-15`), et une exemption dont la revue est passée remonte en tête de page. Un compte
dont l'absence est déclarée n'entre jamais dans une vague (`GF-16`), et un compte qui porte des
dossiers ouverts ne se clôture pas sans repreneur (`GF-17`).

## Ce que le centre de commande couvre

**Voir les problèmes.** La page *Anomalies* met au même endroit les **failles**, les **bugs** et
les **erreurs de données** — parce qu'ils se traitent pareil : on constate, on comprend, on
corrige, on vérifie. Chacun porte un **correctif rédigé par un agent** : le diff, la requête SQL
ou la configuration exacte, avec sa portée chiffrée, sa réversibilité et la façon dont on saura
que c'est corrigé. L'agent écrit, il n'exécute pas — l'application part de vous et porte votre
nom au journal.

**Surveiller le système.** *Surveillance réseau* donne l'IP, la géolocalisation, le fournisseur
et le type de réseau de chaque connexion — réseau interne, opérateur mobile, **VPN commercial**,
hébergeur, **réseau d'anonymisation** — avec un indice de risque, les signaux qui l'expliquent
(voyage impossible, appareil jamais vu, pays jamais vu, rafale), les **listes blanche et noire**
et le blocage d'une adresse. Neuf règles de détection, dont trois seulement bloquent
automatiquement : les six autres signalent, et un humain tranche.

**Surveiller les gestes.** *Actions critiques* ne retient que ce dont on voudra se souvenir :
suppression définitive, export massif, attribution d'un droit d'administration, modification d'un
paramètre de sécurité, signature, consultation en masse de dossiers, verrouillage de compte.
Avec qui, d'où, combien, et la règle qui l'a fait remonter.

**Collecter les journaux.** *Collecte* montre les huit sources, leur débit, leur retard, leur
niveau d'analyse (structurée, partielle, brute), la chaîne de traitement en cinq étapes, les
motifs détectés — dont ceux qui sont **nouveaux**, plus parlants qu'un seuil franchi — et le
coût du stockage.

## L'habillage UniFi

Les valeurs ont été relevées sur l'interface d'Ubiquiti (ui.com) et sur un contrôleur
UniFi Network 11, le 25 novembre 2026 — pas imitées à vue d'œil.

| Ce qui vient d'UniFi | Valeurs |
|---|---|
| Gamme neutre | `#ffffff → #212327` en clair, `#141414 → #fafafa` en sombre |
| Bleu | `#006eff` (clair) / `#4797ff` (sombre), gamme complète de 01 à 10 |
| Surfaces sombres | page `#0d0d0d`, panneaux `#131416`, séparateurs `rgb(249 250 250 / .07)` |
| Rayons | 4 px partout, 8 px pour ce qui flotte, 16 px au-delà |
| Mouvement | 50 / 100 / 200 / 400 ms, sorties en `cubic-bezier(0, 0, .2, 1)` |
| Typographie | Inter, base 13 px, échelle 9 / 11 / 13 / 15 / 19 / 23 / 27 / 35 |
| Navigation | rail d'icônes 48 px + panneau de section 236 px |
| Tableau de bord | barre d'outils fine, graphique héros, curseur de période, rangées de tuiles, anneaux à total central |

**Une différence assumée.** UniFi superpose deux échelles de valeurs sur son graphique héros
(ms à gauche, Mb/s à droite). Le gabarit ne le fait pas : deux échelles sur un même dessin
produisent des croisements qui ne veulent rien dire. Les séries d'unités différentes sont
ramenées à un indice base 100, et l'infobulle redonne la valeur réelle.

## La santé du serveur

La page suit ce qu'exposent les contrôleurs d'administration des constructeurs — refroidissement,
alimentation, mémoire, stockage, journal d'événements système — avec en plus l'état du système
d'exploitation.

- **Capteurs** avec leurs deux seuils, le repère de vigilance marqué sur la barre.
- **Ventilateurs** : vitesse, redondance, perte de redondance signalée.
- **Alimentations** redondantes, marge avant perte de redondance.
- **Mémoire** : plan des fentes, erreurs corrigées par barrette.
- **Stockage** : disques physiques (heures, secteurs réalloués, usure), grappes RAID avec
  contrôle de cohérence et réserve dynamique.
- **Système** : charge, mémoire, échange, systèmes de fichiers, interfaces, certificats,
  écart d'horloge, mises à jour en attente.
- **Journal matériel** à la façon d'un journal d'événements système.

Sources consultées : [Dell, surveiller la santé depuis iDRAC9](https://www.dell.com/support/kbdoc/en-us/000391164/poweredge-how-to-monitor-server-health-from-the-idrac9) ·
[iDRAC10](https://www.dell.com/support/kbdoc/en-us/000394350/poweredge-how-to-monitor-server-health-from-idrac10) ·
[Paessler, santé physique via iDRAC, iLO, iRMC, IPMI](https://blog.paessler.com/get-alerted-on-physical-server-health-state-via-idrac-ilo-irmc-and-ipmi).

## La base de données

Les cinq endroits où une base se dégrade sans prévenir, avec les repères usuels de supervision
PostgreSQL : connexions (70 % / 90 %), requêtes lentes classées par temps **total** et non
unitaire, verrous présentés bloqueur → bloqué, tuples morts (10 % / 20 %), réplication
(30 s / 5 min) et emplacements de réplication oubliés — la façon la plus courante de remplir
un disque sans que rien n'ait changé.

Sources : [Grafana, tableau de bord PostgreSQL](https://grafana.com/grafana/dashboards/24298-postgresql-monitoring-dashboard/) ·
[Percona](https://www.percona.com/blog/postgresql-monitoring-with-percona-monitoring-and-management-a-redefined-summary/) ·
[DigitalOcean](https://docs.digitalocean.com/products/databases/postgresql/how-to/monitor-databases/).

## Les agents IA

Six agents simulés : lecteur de journaux, rédacteur de comptes rendus, contrôleur de dossiers,
assistant congés, détecteur d'anomalies de pointage, recherche documentaire. Chacun porte ses
instructions, ses documents, ses outils, ses garde-fous, ses plafonds et son panneau d'essai.

Trois partis pris, repris de ce que font les plateformes sérieuses :

1. **Les garde-fous ne vivent pas dans les instructions.** Une consigne écrite en prose se
   négocie, s'oublie, se réinterprète. Une liste d'outils autorisés, non. Les garde-fous sont
   appliqués par le système, et les retirer demande de retaper un mot.
2. **Lire et écrire sont séparés.** Tout outil qui écrit demande un humain, sans exception.
3. **Un outil ajouté après coup ne s'exécute pas tout seul.** Un connecteur MCP peut grandir
   après son installation : les nouveaux outils arrivent marqués « jamais approuvé » et restent
   bloqués. Une approbation vaut pour un appel et ses arguments exactement, et elle expire.

Le composant `AssistantIA` est la brique commune, posée sur les journaux, la santé du serveur,
la base de données et les envois. Il tient en quatre règles : il ne décide de rien, il cite ses
preuves, il dit quand il ne peut pas conclure, et il affiche toujours son modèle et son coût.

Sources : [Datadog MCP, portées d'approbation](https://www.truefoundry.com/blog/datadog-mcp-server) ·
[Anthropic, politiques de permission](https://platform.claude.com/docs/en/managed-agents/permission-policies) ·
[MCP Guard](https://github.com/nraj46/mcp-guard) ·
[eSEOspace, journalisation MCP](https://eseospace.com/blog/mcp-audit-logging/) ·
[Comparatif des assistants d'observabilité](https://metoro.io/blog/best-observability-tools-with-ai).

## Les canaux d'envoi

Trois canaux, trois façons de tomber en panne : la messagerie se juge à sa réputation
(SPF, DKIM, DMARC, rebonds durs), le SMS à son crédit et à sa couverture, WhatsApp à la qualité
de son numéro, à ses modèles approuvés et à sa fenêtre de 24 heures. Un canal « actif » qui
n'envoie plus rien se repère ici, pas dans les réclamations trois jours plus tard.

## Le cas simulé

Le système administré est un **SIGRH** — Système Intégré de Gestion des Ressources Humaines.
**Rien de réel n'est entré dans le dépôt** : noms, matricules, chiffres et directions sont
inventés. `src/lib/*.ts` se remplace par vos appels réseau ; les types exportés sont le contrat
que les vues attendent.

## Rhabiller le gabarit

1. **Les couleurs** : `src/styles/tokens.css`, `--accent` et `--accent-fort`.
2. **Les pages** : une ligne dans `NAVIGATION`, un `case` dans `Vue()`.
3. **Le résumé de domaine** : `src/composants/ResumeGroupe.tsx`, trois à six lignes et une alerte.
4. **Les données** : les cinq modules de `src/lib/`.

## Les partis pris

- **L'IA propose, un humain décide.** Partout, sans exception.
- **Toute action à conséquence passe par `ui.confirmer`** ; les irréversibles font retaper un mot.
- **Rien ne repose sur la couleur seule** : un état porte toujours un mot.
- **Un seul axe de valeurs par graphique.**
- **Tout ce qui se fait à la souris se fait au clavier** : `Ctrl K`, `Ctrl B`, `T`, `D`, `?`,
  et `G` puis `O / U / J / A / D / S / H / B / I / M / C`.
- **Le journal d'audit ne se vide pas depuis l'interface.**
- **Le serveur reste seul juge.**

## Ce qui reste à faire chez vous

Ni authentification, ni routeur, ni appels réseau, ni tests : ces choix appartiennent au projet
d'accueil. La maquette HTML d'un fichier porte encore l'habillage d'origine, antérieur à UniFi.
