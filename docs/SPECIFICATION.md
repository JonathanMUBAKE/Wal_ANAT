# ANAT Pilotage — Dossier de spécification du système

**Spécification des exigences et analyse des écarts avec l'existant**

| | |
|---|---|
| **Maître d'ouvrage** | Agence Nationale d'Aménagement du Territoire — Direction générale |
| **Objet** | Système de pilotage de la gestion de l'Agence |
| **Nature du document** | Spécification des exigences du système (*System Requirements Specification*), complétée d'une analyse des écarts |
| **Version** | 0.1 — 25 novembre 2026 |
| **Statut** | En rédaction |
| **Rédaction** | Session principale (ossature, chapitres 1 à 4, module 5.1) et agent `chef-de-projet` (modules 5.2 et suivants) |

---

## Avant-propos — pourquoi ce document, et pourquoi maintenant

Ce projet a commencé sans spécification. L'outil a été construit par ajouts successifs, puis audité :
cent deux défauts ont été relevés, documentés et classés. C'est un inventaire utile, mais un inventaire
de défauts n'est pas une spécification — **il dit ce qui ne va pas, jamais ce qui devrait être**.

La différence n'est pas théorique. Un défaut comme « un courrier ne porte qu'un seul destinataire »
n'apparaît que parce qu'on a regardé le code. L'exigence correspondante — *le système représente un
courrier et, pour chaque destinataire, un état propre* — se déduit, elle, du fonctionnement de
l'Agence, et elle aurait été écrite avant la première ligne. C'est la seule façon d'arrêter de
découvrir les manques un par un.

Ce document pose donc ce que le système **doit** faire, module par module, à partir du fonctionnement
réel de l'Agence. Puis il confronte chaque exigence à ce qui existe. Les cent deux défauts n'en sont
plus le plan : ils en deviennent les **preuves**.

---

## Références

### Normatives et méthodologiques

- **ISO/IEC/IEEE 29148** — *Systems and software engineering — Life cycle processes — Requirements
  engineering.* Cadre de l'ingénierie des exigences retenu pour la structure de ce document et pour la
  forme des exigences.
- **NF EN 16271** (ex NF X50-151) — *Expression fonctionnelle du besoin et cahier des charges
  fonctionnel.* Retenue pour la distinction entre le besoin exprimé en fonctions et la solution.
- **ISO 21351** — distinction entre cahier des charges fonctionnel et spécification technique de besoin.
- **WCAG 2.1 niveau AA** — accessibilité.

### Juridiques

- **Loi n° 08/009 du 7 juillet 2008** portant dispositions générales applicables aux établissements
  publics (RDC) — structures organiques et leurs rôles respectifs.
  *Réserve : établie à partir de copies du texte et de travaux universitaires, non du Journal officiel.*

### Internes au projet

| Document | Ce qu'il apporte |
|---|---|
| `docs/CONTEXTE-INSTITUTIONNEL.md` | Le fonctionnement réel de l'Agence. **Source primaire de ce document.** |
| `docs/MODELE-INSTITUTIONNEL.md` | Les profils et les règles de gouvernance déjà codés. |
| `docs/INTERVENTIONS.md` | Les 102 défauts constatés, avec leurs preuves. **Source de l'analyse des écarts.** |
| `docs/PLAN-PROJET.md` | Sprints, jalons, chemin critique, risques. |
| `docs/DESIGN-SYSTEM.md` | La loi visuelle et les règles de comportement de l'interface. |
| `docs/ARCHITECTURE-INFORMATION.md` | L'organisation des écrans. |

---

## Conventions de rédaction

**Une exigence énonce une seule idée, en une seule phrase, à la forme active, et sa satisfaction se
vérifie.** Une phrase qui contient « et » relie souvent deux exigences : on les sépare.

### Identification

```
EX-{MOD}-{nnn}
```

`{MOD}` est le code du module (tableau § 5.0), `{nnn}` un numéro séquentiel dans le module. Un numéro
attribué n'est jamais réutilisé, même si l'exigence est retirée : elle passe alors au statut *abandonnée*.

### Attributs

| Attribut | Valeurs |
|---|---|
| **Priorité** | **1 — essentielle** (le système n'a pas de sens sans elle) · **2 — nécessaire** (l'Agence s'en passe mal) · **3 — souhaitée** (confort réel) |
| **Origine** | `LOI` (texte en vigueur) · `ANAT` (fonctionnement décrit par l'Agence) · `MÉTIER` (déduite du métier) · `TECH` (contrainte technique) · `QUAL` (qualité, accessibilité, sécurité) |
| **Vérification** | `T` test automatisé · `D` démonstration au navigateur · `I` inspection du code · `A` analyse |
| **État** | `✅ tenue` · `⚠️ partielle` · `❌ non tenue` · `➖ absente` (rien n'existe) |

### Écarts

Chaque module se termine par un tableau d'écarts. Un écart cite **l'exigence**, **ce que fait le système
aujourd'hui**, **la preuve** (fichier:ligne quand elle est établie), et **le point d'intervention**
correspondant dans `docs/INTERVENTIONS.md`.

### Verbes

« Le système **doit** » n'est pas employé : toutes les lignes de ce document sont des exigences. On écrit
donc à l'indicatif présent — *le système attribue*, *le système refuse* — qui dit l'état visé sans
ambiguïté.

---

## Sommaire

| | Chapitre | État |
|---|---|---|
| 1 | Contexte, enjeux et objectifs | ✅ |
| 2 | Périmètre | ✅ |
| 3 | Acteurs, profils et droits | ✅ |
| 4 | Exigences transverses | ✅ |
| 5 | Spécification par module | |
| 5.1 | Courrier | ✅ *(module modèle)* |
| 5.2 | Signataire (circuits de visa et de signature) | ✅ |
| 5.3 | Réunions et comptes rendus | ✅ |
| 5.4 | Décisions de la direction générale | ✅ |
| 5.5 | Plans de travail | ✅ |
| 5.6 | Attributions des entités | ✅ |
| 5.7 | Portefeuille, activités et projets | ✅ |
| 5.8 | Tâches et charges | ✅ |
| 5.9 | Livrables et consultants | ✅ |
| 5.10 | Partenaires et conventions | ✅ |
| 5.11 | Risques et indicateurs | ✅ |
| 5.12 | Ressources humaines, congés et absences | ✅ |
| 5.13 | Organisation et structure | ✅ |
| 5.14 | Administration du système | ✅ |
| 5.15 | Coéquipiers IA et validations humaines | ✅ |
| 5.16 | Documents, modèles et archives | ✅ |
| 6 | Modèle de données | à rédiger |
| 7 | Architecture technique | à rédiger |
| 8 | Exigences non fonctionnelles | à rédiger |
| 9 | Recette et vérification | à rédiger |
| 10 | Synthèse des écarts | ✅ |
| 11 | Trajectoire | ✅ *(renvoi)* |
| A | Glossaire | ✅ |
| B | Matrice de traçabilité exigences × interventions | à produire |

---

# 1. Contexte, enjeux et objectifs

## 1.1 L'institution

L'Agence Nationale d'Aménagement du Territoire est un établissement public congolais placé sous la
tutelle du Ministère de l'Aménagement du Territoire, aux côtés de trois structures sœurs. Sa mission est
l'assistance technique à l'État et aux provinces en matière de diagnostic et de planification
territoriale. Elle couvre 2,3 millions de km², 145 territoires, 9 provinces, avec environ 192 agents.

Le détail de son fonctionnement — organes, structure, circuits réels, vocabulaire — fait l'objet du
document `docs/CONTEXTE-INSTITUTIONNEL.md`, qui est la **source primaire** de la présente spécification.
Il n'est pas répété ici ; seules les conséquences sur le système le sont.

## 1.2 Le point de départ du système

Trois faits cadrent le besoin.

**L'Agence travaille sur registres.** Courrier, décisions, comptes rendus, conventions, signataire : la
matière première n'est pas la tâche mais l'acte écrit, numéroté, daté, signé, classé. Un outil de
productivité ordinaire ne convient pas, parce qu'il ne garantit ni la continuité d'une série, ni la date
d'un acte, ni la véracité d'une trace.

**L'Agence est dispersée et mal connectée.** Six pools territoriaux, deux fuseaux horaires, des antennes
provinciales. Le système doit fonctionner **hors connexion** et se recaler ensuite, sans jamais produire
deux fois le même numéro ni une date fausse.

**L'Agence est petite en effectif et large en responsabilités.** Cent quatre-vingt-douze agents pour
2,3 millions de km². Le coût d'un geste compte : vingt-huit clics pour replanifier une semaine de
travail, c'est une pratique qui ne tiendra pas six mois.

## 1.3 Objectifs

| | Objectif | Mesure |
|---|---|---|
| **O1** | Tenir les registres de l'Agence avec la rigueur d'un acte administratif | Aucune série discontinue sans trace ; aucune écriture au journal sans exécution correspondante |
| **O2** | Faire circuler le travail sans qu'on sorte de l'outil | Les cinq séquences de référence (§ 9) se jouent de bout en bout |
| **O3** | Ne jamais laisser fuir ce qui est protégé | Aucune donnée masquée dans une vue n'est accessible par une autre voie |
| **O4** | Rendre le geste courant court | Les trois coûts de référence (§ 8.4) sont divisés au moins par deux |
| **O5** | Fonctionner quel que soit l'état du réseau | Les actes d'enregistrement et de consultation restent possibles hors connexion |

## 1.4 Enjeux

**Juridique.** Les actes produits engagent un établissement public. Un courrier mal daté, une signature
mal attribuée, une trace absente ont une portée qui dépasse l'inconfort.

**Financier.** La validation d'un livrable déclenche une tranche de paiement à un prestataire. Le système
est, de fait, dans la chaîne de la dépense.

**De confidentialité.** Dossiers d'agents, contrats de mission, budgets de projets, courriers
confidentiels : le système porte des données dont la divulgation a des conséquences réelles.

**D'adoption.** C'est l'enjeu dont dépendent tous les autres. Un outil qui perd une saisie, qui ne
répond rien après un acte engageant, ou qui cache un écran auquel on a droit, se fait contourner — et
l'Agence retourne au cahier.

---

# 2. Périmètre

## 2.1 Dans le périmètre

Le système couvre **la sphère de gestion**, c'est-à-dire ce qui relève de la Direction générale au sens
de la loi : exécution des décisions du conseil, exécution du budget, direction des services,
représentation de l'établissement vis-à-vis des tiers.

Seize modules, listés au § 5.0.

## 2.2 Hors périmètre, et pourquoi

| Exclusion | Raison |
|---|---|
| **Le Conseil d'administration** et ses délibérations | Organe de conception, d'orientation, de contrôle et de décision — **pas de gestion**. Ses actes *entrent* dans le système (une résolution devient une charge, un budget arrêté devient un cadre) ; ils ne s'y délibèrent pas. |
| **Le Collège des commissaires aux comptes** | Organe de contrôle, dont les membres ne prennent individuellement aucune décision. Destinataire d'actes, pas acteur du système. |
| **La comptabilité générale et la paie** | Métiers propres, outillés ailleurs. Le système s'y raccorde par les livrables et les contrats, il ne les remplace pas. |
| **Le site public de l'Agence** | Autre produit, autre dépôt. |
| **Les annexes volumineuses du courrier** | **Reportées par le maître d'ouvrage.** À reprendre dans une version ultérieure. |

## 2.3 Interfaces avec l'extérieur

| Interface | Nature | Statut |
|---|---|---|
| Ministère de tutelle | Destinataire et émetteur de courrier | Par le module Courrier |
| Cour des comptes | Destinataire d'états financiers | Par le module Courrier |
| Collège des commissaires aux comptes | Destinataire de documents | Par le module Courrier |
| Partenaires au développement | Conventions, livrables | Modules Partenaires et Livrables |
| Serveur de temps (NTP) | Source d'heure sûre | § 4.3 |
| Messagerie (SMTP) | Avis sortants | Module Administration |

---

# 3. Acteurs, profils et droits

## 3.1 Principe

**L'Agence raisonne par fonctions, pas par rangs.** Le rang technique dans l'outil ne donne pas le métier :
la directrice générale est propriétaire du système et ne règle pas la messagerie ; le responsable
informatique administre l'outil sans voir le pilotage. Un compte peut donc cumuler tous les pouvoirs
techniques et peu de droits métier, et l'inverse.

**EX-ACT-001** · P1 · `ANAT` · `T` — Les droits d'une personne découlent de son profil de fonction, et
non de son rang technique dans le système.

**EX-ACT-002** · P1 · `ANAT` · `T` — Une personne qui détient un profil de fonction n'obtient pas les
droits attachés à son rang technique.

## 3.2 Les acteurs

| Acteur | Ce qu'il fait dans le système |
|---|---|
| **Directrice générale** | Oriente, arbitre, tranche, approuve, **signe au nom de l'Agence**. Lit tout le pilotage. |
| **Directeur général adjoint** | Les mêmes attributions de pilotage, sauf l'enregistrement des décisions de la DG. **Signe en cas d'intérim seulement.** |
| **Assistant(e) de direction** | Saisit **pour** la DG — courrier, agenda, réunions, décisions dictées — **sans décider à sa place**. Tient l'antichambre et le suivi. |
| **Directeur** | Dirige une direction centrale : plan, projets, livrables, réunions de service, risques de son périmètre. |
| **Chef de cellule** | Idem, pour une cellule. |
| **Directeur de pool** | Idem, pour un pool territorial couvrant plusieurs provinces. |
| **Agent** | Ses tâches, celles de son entité, ses projets, son dossier ; consulte décisions, plans, partenaires ; vise au signataire quand il est dans le circuit. |
| **Rapporteur** | Programme les réunions, prend note de chaque point, rédige le compte rendu, porte son adoption. **Il écrit, il ne décide pas.** |
| **Service courrier** | Reçoit, enregistre, accuse réception, remet l'étiquette. |
| **Secrétariat de direction** | Dispatche, finalise les sortants, numérote, imprime, archive. |
| **Responsable informatique** | Administre comptes, profils, structure, messagerie, règles IA. **Aucun droit métier de direction.** |
| **Stagiaire** | Travaille sur ce qu'on lui ouvre ; doit comprendre dès son premier écran ce qu'on attend de lui et à qui demander. |
| **Consultant** | Prestataire sous contrat : ses tâches, **son** contrat, le plan du projet, ses livrables attendus et remis. |
| **Lecture seule** | Suit sans modifier. *(Portée à préciser — décision D en cours.)* |

## 3.3 Exigences

**EX-ACT-003** · P1 · `LOI` · `T` — Seule la Direction générale engage l'Agence vis-à-vis des tiers.

**EX-ACT-004** · P1 · `ANAT` · `T` — Le directeur général adjoint signe au nom de l'Agence pendant un
intérim déclaré, et pendant lui seulement.

**EX-ACT-005** · P1 · `ANAT` · `T` — L'assistant de direction inscrit une décision prise par la
direction générale ; il ne la prend pas.

**EX-ACT-006** · P1 · `ANAT` · `T` — Un chef d'entité exerce ses droits sur son entité, sur les entités
qui lui sont rattachées, et sur les espaces où il a été invité — nulle part ailleurs.

**EX-ACT-007** · P1 · `QUAL` · `T` — Le serveur vérifie tout droit avant d'exécuter un acte, quelle que
soit la voie d'appel.

**EX-ACT-008** · P1 · `QUAL` · `I` — L'interface ne propose aucun geste que le serveur refuserait.

**EX-ACT-009** · P2 · `MÉTIER` · `D` — Un droit de consultation ouvre l'accès à son module, au même titre
qu'un droit d'action.

### Écarts — chapitre 3

| Exigence | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|
| EX-ACT-004 | ➖ Aucune délégation de signature n'existe ; `signature.institution` est un droit permanent du seul profil DG | `permissions.ts` | M1.8 |
| EX-ACT-006 | ❌ L'interface lit le droit, jamais l'étendue : risque « Agence entière » proposé à un chef de cellule | — | H5 |
| EX-ACT-008 | ⚠️ Quatorze droits corrigés le 25/11 ; les appels sensibles sont désormais sous contrat | `droits-interface.test.ts` | — |
| EX-ACT-009 | ❌ Le rail n'ouvre une entrée que sur un droit d'agir ; un droit de lecture ne vaut qu'une sonde | `Sidebar.tsx:144-172` | F3.3 |

---

# 4. Exigences transverses

Elles s'appliquent à tous les modules. Un module qui les contredit est en défaut, même si ses exigences
propres sont tenues.

## 4.1 Le registre — continuité, date, véracité

**EX-TRA-001** · P1 · `ANAT` · `T` — Le système attribue à tout acte enregistré un numéro unique au sein
de sa série et de son exercice.

**EX-TRA-002** · P1 · `ANAT` · `T` — Le rang d'un acte se déduit de son exercice au moment de
l'enregistrement ; aucun traitement planifié n'est nécessaire au changement d'année.

**EX-TRA-003** · P1 · `ANAT` · `T` — Le système permet d'insérer un acte entre deux rangs existants au
moyen d'un numéro secondaire suffixé.

**EX-TRA-004** · P1 · `ANAT` · `T` — Le système date un acte de sa survenance, et non de sa saisie.

**EX-TRA-005** · P1 · `QUAL` · `T` — L'enregistrement d'un acte à une date antérieure à celle du jour
avertit la personne et laisse une trace au journal.

**EX-TRA-006** · P1 · `QUAL` · `T` — Le système n'inscrit au journal qu'un acte effectivement exécuté.

**EX-TRA-007** · P1 · `QUAL` · `T` — Tout acte qui engage l'Agence, modifie un droit, lève une
confidentialité ou change un responsable est journalisé avec son auteur, sa date, et les valeurs avant et
après lorsqu'elles existent.

## 4.2 La confidentialité

**EX-TRA-010** · P1 · `QUAL` · `T` — Une donnée masquée dans une vue l'est par toutes les voies : liste,
fiche, notification, valeur de retour d'écriture, export.

**EX-TRA-011** · P1 · `QUAL` · `T` — Une notification ne révèle rien que son destinataire n'a pas le
droit de lire, titre compris.

**EX-TRA-012** · P1 · `LOI` · `T` — Le motif et la nature d'un congé de maladie ne sont lisibles que par
l'agent concerné et le service des ressources humaines.

**EX-TRA-013** · P1 · `MÉTIER` · `T` — Une liste de choix ne propose que des valeurs que le serveur
acceptera.

## 4.3 Le temps

**EX-TRA-020** · P1 · `ANAT` · `T` — Le système vérifie l'heure auprès d'une source de temps sûre
lorsqu'une connexion existe, et ne se fie jamais à la seule horloge de la machine.

**EX-TRA-021** · P1 · `ANAT` · `T` — Hors connexion, le système repart du dernier temps de référence
enregistré, augmenté du temps écoulé mesuré par une horloge qui ne recule pas.

**EX-TRA-022** · P1 · `ANAT` · `T` — Le système refuse tout recul du temps de référence et journalise
l'écart constaté.

**EX-TRA-023** · P1 · `ANAT` · `D` — Le système affiche, au redémarrage après une interruption, la durée
de l'interruption et l'écart d'horloge constaté.

**EX-TRA-024** · P1 · `ANAT` · `T` — Les dates et les heures se calculent dans le fuseau de l'entité
concernée — UTC+1 à Kinshasa, UTC+2 à Lubumbashi — et jamais en temps universel brut.

**EX-TRA-025** · P2 · `MÉTIER` · `T` — Après une interruption, le système émet un récapitulatif unique
par personne au lieu de rejouer les relances échues.

## 4.4 Le fonctionnement hors connexion

**EX-TRA-030** · P1 · `ANAT` · `D` — Le système permet l'enregistrement et la consultation sans
connexion.

**EX-TRA-031** · P1 · `ANAT` · `T` — Deux enregistrements effectués hors connexion sur deux postes
distincts n'obtiennent jamais le même numéro. *(Mécanisme à arrêter — décision D1.)*

## 4.5 Les charges d'une personne

**EX-TRA-040** · P1 · `ANAT` · `D` — Le système présente à chaque personne une liste unique de ce qu'on
attend d'elle, quelle que soit l'origine de la charge : tâche de projet, action de réunion, courrier reçu
pour traitement, décision à exécuter.

**EX-TRA-041** · P2 · `MÉTIER` · `D` — Chaque charge indique son origine et permet d'y revenir en un
geste.

## 4.6 Le retour à la personne

**EX-TRA-050** · P1 · `QUAL` · `D` — Tout acte engageant produit un message écrit qui nomme ce qui vient
de se passer.

**EX-TRA-051** · P1 · `QUAL` · `D` — Un échec affiche la raison donnée par le serveur et ce qu'il faut
faire ; il reste affiché jusqu'à ce que la personne le ferme.

**EX-TRA-052** · P1 · `QUAL` · `D` — Des champs modifiés ne se ferment pas sans confirmation, qu'il
s'agisse d'un tiroir, d'une page ou d'une navigation.

**EX-TRA-053** · P2 · `MÉTIER` · `D` — Une liste vide explique pourquoi elle l'est et ce qu'il faut
faire.

## 4.7 La langue et le vocabulaire

**EX-TRA-060** · P1 · `ANAT` · `I` — L'interface, les messages d'erreur et les documents produits sont en
français.

**EX-TRA-061** · P1 · `ANAT` · `I` — Le système emploie le vocabulaire de l'Agence : *signataire*,
*rapporteur*, *intervenant*, *réunion des directions*, *pour traitement*, *pour information*.

**EX-TRA-062** · P1 · `QUAL` · `I` — Un terme désigne une seule chose dans tout le système.

## 4.8 L'interface — briques et accessibilité

**EX-TRA-070** · P1 · `QUAL` · `T` — Chaque élément d'interface réutilisable est défini une fois et
appelé partout ; son comportement ne varie ni selon le module ni selon l'écran.

**EX-TRA-071** · P1 · `QUAL` · `T` — Seule l'accentuation d'un bouton varie selon l'insistance de
l'action ; sa taille et sa forme ne varient pas.

**EX-TRA-072** · P1 · `QUAL` · `T` — L'application ne présente aucun manquement WCAG 2.1 niveau AA, dans
les deux thèmes, sur écran de bureau comme de téléphone.

**EX-TRA-073** · P2 · `QUAL` · `D` — Tout écran auquel une personne a droit est atteignable depuis la
navigation ou depuis la recherche.

## 4.9 L'intelligence artificielle

**EX-TRA-080** · P1 · `ANAT` · `T` — Une proposition de l'intelligence artificielle n'a d'effet qu'après
validation humaine.

**EX-TRA-081** · P1 · `MÉTIER` · `T` — Une proposition sans décideur possible n'est pas ouverte en
attente ; le système en informe le responsable concerné.

**EX-TRA-082** · P1 · `QUAL` · `T` — Une règle d'automatisation s'exécute sous les droits de la personne
qui a écrit sa consigne en vigueur.

### Écarts — chapitre 4

| Exigence | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|
| EX-TRA-002 | ➖ Le rang est calculé, non stocké ; aucune insertion possible | `registers.ts:76-77` | S5.3 |
| EX-TRA-003 | ➖ Aucun suffixe possible | *idem* | S5.3 |
| EX-TRA-005 | ❌ L'antidatage est permis et parfaitement silencieux | `registers.ts:212-217` | S5, M1 |
| EX-TRA-006 | ❌ Une validation est journalisée « approuvée » puis marquée expirée sans exécution | `ai/engine.ts:672-710` | S2.1 |
| EX-TRA-007 | ❌ La modification d'une activité n'est pas journalisée, levée de confidentialité comprise | `activities.ts:248-288` | S2.2 |
| EX-TRA-010 | ❌ Le masque des congés ne couvre ni les notifications ni les retours d'écriture | `leaves.ts:94-100` vs `296-303` | S1.2 |
| EX-TRA-010 | ❌ Les raisons budgétaires sortent par la route de santé des projets | `portfolio.ts:227-236` | S1.3 |
| EX-TRA-011 | ❌ Une demande d'arbitrage nomme le dossier à qui ne peut pas l'ouvrir | `portfolio.ts:293-307` | S1.4 |
| EX-TRA-013 | ❌ 29 % des choix du sélecteur de chef d'entité mènent à un refus | — | F3.2 |
| EX-TRA-020 à 024 | ➖ Aucune horloge de référence, aucun fuseau configuré | `services.ts:181-183` | S5.1, S5.2 |
| EX-TRA-030 | ➖ Le fonctionnement hors connexion n'est pas traité | — | S5 |
| EX-TRA-040 | ⚠️ « Mes tâches » ne porte que les tâches et les livrables | — | F1.7 |
| EX-TRA-050 | ❌ Quatre actes engageants sont muets | `Signataire.tsx`, `ProjectDossier.tsx:861` | F3.1 |
| EX-TRA-052 | ⚠️ Tenue pour le tiroir et l'éditeur de compte rendu ; pas pour les autres formulaires de page | `276f78b` | F4.4 |
| EX-TRA-061 | ❌ « Signataire » employé 232 fois ; « rapporteur » désigne l'intervenant | `Meetings.tsx:1968` | F5.1, M2.3 |
| EX-TRA-062 | ❌ « Décision » désigne quatre objets ; « Signataire » en désignera deux | `Pilotage.tsx:348` | F5.2, F5.3 |
| EX-TRA-070 | ❌ 144 boutons et 91 champs hors des briques | — | F1.1, F1.2 |
| EX-TRA-072 | ✅ Zéro manquement, vérifié le 25/11 sur `main` | audit `axe-core` | — |
| EX-TRA-073 | ❌ Quatre droits d'un agent n'ont aucune porte ; la recherche n'indexe aucun écran | `Sidebar.tsx`, `services.ts:2772` | F3.3, F3.6 |
| EX-TRA-081 | ❌ Une proposition sans décideur attend indéfiniment et verrouille la tâche | `ai/engine.ts:590-641` | S3.4 |
| EX-TRA-082 | ❌ Une règle modifiée garde les droits de son premier auteur | `ai/engine.ts:880-936` | S2.3 |

---

# 5. Spécification par module

## 5.0 Les modules

| Code | Module | Objet |
|---|---|---|
| `COU` | Courrier | Entrant et sortant, de la réception au classement |
| `SIG` | Signataire | Circuits de visa et de signature |
| `REU` | Réunions | Programmation, tenue, compte rendu, adoption, recommandations |
| `DEC` | Décisions | Registre des décisions de la direction générale |
| `PLA` | Plans de travail | Préparation, approbation, suivi |
| `ATT` | Attributions | Fiches d'attributions des entités |
| `POR` | Portefeuille | Activités, projets, arbitrages |
| `TAC` | Tâches | Tâches et charges d'une personne |
| `LIV` | Livrables | Livrables, contrats, consultants |
| `PAR` | Partenaires | Annuaire, conventions, accords |
| `RIS` | Risques | Registre des risques et indicateurs |
| `RH` | Ressources humaines | Dossiers, congés, absences, arrivées et sorties |
| `ORG` | Organisation | Structure, entités, équipes, personnes |
| `ADM` | Administration | Comptes, profils, droits, messagerie, journal |
| `IA` | Coéquipiers IA | Propositions, règles, validations humaines |
| `DOC` | Documents | Modèles, génération, archives |

---

## 5.1 Module Courrier — `COU`

> **Module modèle.** Les autres modules suivent cette structure : objet, acteurs, cycle de vie, règles de
> gestion, exigences, écarts.

### 5.1.1 Objet

Le module tient le registre du courrier de l'Agence, entrant et sortant. Il couvre la réception et
l'accusé de réception, l'enregistrement unique, l'acheminement vers les entités et les personnes, le
traitement, la réponse, la signature et le classement.

Le Secrétariat de direction, vingt personnes, a pour charge officielle la « gestion du courrier ». Ce
module est donc le métier du plus gros service rattaché à la Direction générale, et le plus sollicité du
système.

### 5.1.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Service courrier | Reçoit, enregistre, accuse réception, remet l'étiquette |
| Secrétariat de direction | Dispatche, finalise les sortants, numérote, imprime, classe |
| Antichambre de la DG | Transmet à la direction, dispatche après annotation, suit |
| Directrice générale | Annote, instruit, signe |
| Entité ou agent destinataire | Traite, répond, déclare l'action prise |
| Tout agent concerné | Lit ce qui lui est adressé pour information |

### 5.1.3 Cycle de vie

```
                     ┌──────────── pour information ─────────────┐
                     │                                            ▼
RÉCEPTION ─> ENREGISTRÉ ─> AU SIGNATAIRE ─> ANNOTÉ ─> IMPUTÉ ─> EN TRAITEMENT ─> TRAITÉ ─> CLASSÉ
   │              │         (vu par la DG)   (instruction)   │                      │
   │              │                                           └── réponse ──> sortant
   └─ étiquette ──┘
```

Un courrier porte **un état global** (la synthèse) et, pour chaque destinataire, **un état propre**.

### 5.1.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-COU-01 | Un courrier n'est enregistré qu'une fois, à son entrée dans l'Agence. | `ANAT` |
| RG-COU-02 | Chaque destinataire d'un courrier a son propre état d'avancement. | `ANAT` |
| RG-COU-03 | Un destinataire reçoit un courrier *pour traitement* ou *pour information* ; il peut recevoir les deux. | `ANAT` |
| RG-COU-04 | Un courrier reçu pour traitement crée une charge pour son destinataire. | `ANAT` |
| RG-COU-05 | L'instruction de la direction générale précède et commande l'imputation. | `ANAT` |
| RG-COU-06 | Une instruction est d'une de ces natures : préparer une réponse, prendre une action, classer. | `ANAT` |
| RG-COU-07 | Un courrier sortant est signé par la Direction générale, ou par le DGA en intérim déclaré. | `LOI` |
| RG-COU-08 | Un chef d'entité impute à un agent de son entité ; la direction impute sans cette restriction. | `ANAT` |
| RG-COU-09 | Le rang d'un courrier suit l'ordre d'enregistrement, par exercice, entrants et sortants confondus. | `ANAT` |
| RG-COU-10 | Un courrier non traité est relancé tous les deux jours ; au bout d'une semaine il est en retard. | `ANAT` |

### 5.1.5 Exigences

**Réception et enregistrement**

**EX-COU-001** · P1 · `ANAT` · `T` — Le système enregistre un courrier entrant une seule fois, avec son
expéditeur, son destinataire, son objet, sa date de réception et son numéro.

**EX-COU-002** · P1 · `ANAT` · `D` — Le système produit un accusé de réception imprimable sous forme
d'étiquette, portant le numéro d'enregistrement et les mentions d'identification du courrier.
*(Contenu exact à arrêter — décision D3.)*

**EX-COU-003** · P1 · `ANAT` · `T` — Le système attribue au courrier un numéro de la forme
`{sens}/{exercice}/{rang}`, le rang étant déduit de l'exercice au moment de l'enregistrement.

**EX-COU-004** · P2 · `ANAT` · `T` — Le système permet d'attribuer un numéro secondaire suffixé lorsqu'un
courrier s'insère entre deux rangs existants.

**EX-COU-005** · P1 · `QUAL` · `T` — Le système avertit et journalise lorsqu'un courrier est enregistré à
une date de réception antérieure au jour courant.

**EX-COU-006** · P1 · `ANAT` · `T` — Le système refuse une date de réception postérieure au jour courant.

**Acheminement**

**EX-COU-010** · P1 · `ANAT` · `T` — Le système représente, pour un même courrier, autant d'acheminements
que de destinataires, chacun avec son destinataire, sa mention, son état et son échéance éventuelle.

**EX-COU-011** · P1 · `ANAT` · `T` — Le système distingue la mention *pour traitement* de la mention
*pour information*.

**EX-COU-012** · P1 · `ANAT` · `D` — Le système présente à une personne qui cumule les deux mentions un
seul courrier, marqué *pour traitement*.

**EX-COU-013** · P1 · `ANAT` · `T` — Le système crée une charge pour tout destinataire recevant un
courrier pour traitement, portant l'échéance de l'imputation.

**EX-COU-014** · P1 · `ANAT` · `D` — Le système permet au secrétariat de transmettre un courrier à
l'antichambre de la direction générale, et à l'antichambre de le dispatcher après annotation.

**EX-COU-015** · P2 · `ANAT` · `D` — Le système permet à l'antichambre de partager un courrier avec
toute personne de l'Agence.

**Instruction et traitement**

**EX-COU-020** · P1 · `ANAT` · `D` — Le système permet à la direction générale d'annoter un courrier
avant toute imputation.

**EX-COU-021** · P1 · `ANAT` · `T` — Le système porte la nature de l'instruction : préparer une réponse,
prendre une action, ou classer.

**EX-COU-022** · P1 · `ANAT` · `D` — Le système permet au destinataire de déclarer l'action prise et d'y
joindre une pièce.

**EX-COU-023** · P1 · `ANAT` · `D` — Le système permet de répondre à un courrier entrant depuis ce
courrier, en reprenant les informations qu'il porte déjà.

**EX-COU-024** · P1 · `MÉTIER` · `T` — Le système clôt le courrier entrant lorsque la réponse qui s'y
rattache est enregistrée.

**Courrier sortant**

**EX-COU-030** · P1 · `ANAT` · `D` — Le système permet à toute personne autorisée de soumettre un projet
de courrier sortant, qu'il procède d'une instruction ou d'une initiative.

**EX-COU-031** · P1 · `ANAT` · `T` — Le système fait passer tout projet de courrier sortant par
l'antichambre avant la signature.

**EX-COU-032** · P1 · `ANAT` · `D` — Le système permet à l'antichambre de modifier un projet ou de le
retourner à son auteur, pendant la phase de préparation.

**EX-COU-033** · P1 · `QUAL` · `T` — Le système fige le contenu d'un projet dès son entrée en phase de
signature.

**EX-COU-034** · P1 · `LOI` · `T` — Le système n'accepte la signature d'un courrier sortant que de la
Direction générale, ou du directeur général adjoint pendant un intérim déclaré.

**EX-COU-035** · P2 · `ANAT` · `D` — Le système génère un courrier à partir d'un modèle déposé, en-têtes
compris.

**EX-COU-036** · P2 · `ANAT` · `D` — Le système réserve au secrétariat la finalisation d'un sortant :
numérotation et impression.

**Suivi et classement**

**EX-COU-040** · P1 · `ANAT` · `T` — Le système relance le chargé d'un courrier non traité tous les deux
jours.

**EX-COU-041** · P1 · `ANAT` · `T` — Le système marque en retard un courrier non traité au bout d'une
semaine. *(Calendaire ou ouvrable — décision D2.)*

**EX-COU-042** · P2 · `ANAT` · `T` — Le système remonte au chef de l'entité puis à la direction générale
un courrier qui demeure non traité.

**EX-COU-043** · P1 · `ANAT` · `T` — Le système tient un registre unique des courriers classés, chacun
portant qui l'a classé et à quel dossier il se rattache.

**EX-COU-044** · P1 · `ANAT` · `D` — Le système présente les archives selon trois vues — secrétariat,
direction générale, projet — issues du même registre.

**EX-COU-045** · P2 · `MÉTIER` · `D` — Le système permet de rechercher et de filtrer le registre du
courrier.

**EX-COU-046** · P3 · `MÉTIER` · `D` — Le système permet d'enregistrer plusieurs courriers à la suite
sans revenir à la liste.

**Confidentialité**

**EX-COU-050** · P1 · `QUAL` · `T` — Le système ne révèle l'objet d'un courrier confidentiel qu'à ses
destinataires et aux personnes habilitées.

**EX-COU-051** · P1 · `QUAL` · `T` — Le système ne propose dans ses sélecteurs d'expéditeur que des
partenaires que le destinataire a le droit de lire.

### 5.1.6 Écarts — module Courrier

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-COU-001 | ⚠️ | L'outil enregistre bien une fois, mais le circuit réel en compte trois ; aucune reprise du geste papier | — | M1.1 |
| EX-COU-002 | ➖ | Aucun accusé de réception n'existe | — | M1.5 |
| EX-COU-003 | ⚠️ | Le numéro existe mais il est **calculé** et non stocké | `registers.ts:76-77` | S5.3 |
| EX-COU-004 | ➖ | Aucun suffixe possible | *idem* | S5.3 |
| EX-COU-005 | ❌ | L'antidatage est accepté en silence | `registers.ts:215-216` | M1 |
| EX-COU-006 | ✅ | Une date future est refusée | `registers.ts:215` | — |
| EX-COU-010 | ❌ | **Un seul `assignee_id`** ; les autres ne sont que des copies | `registers.ts:17` | M1.2 |
| EX-COU-011 | ⚠️ | Une copie porte un motif `information \| avis` ; la mention « pour traitement » n'existe pas comme telle | `registers.ts:298` | M1.3 |
| EX-COU-013 | ➖ | Aucune charge n'est créée | — | M1.4 |
| EX-COU-014 | ➖ | Ni transmission à l'antichambre, ni dispatch après annotation | — | M1.2 |
| EX-COU-020 | ❌ | L'instruction se saisit **pendant** l'imputation, par celui qui impute | `registers.ts:296-345` | M1.6 |
| EX-COU-021 | ➖ | Aucune nature d'instruction | — | M1.6 |
| EX-COU-023 | ❌ | « Répondre » n'existe pas : 4 clics par un autre onglet et 3 informations ressaisies | — | M1.16 |
| EX-COU-024 | ✅ | Le chaînage entrant → réponse clôt l'entrant | `registers.ts:278` | — |
| EX-COU-031 | ➖ | Un courrier n'entre **jamais** au signataire | `registers.ts` | M1.6 |
| EX-COU-033 | ⚠️ | Le circuit garantit l'intégrité, mais aucune phase de préparation n'est distinguée | — | M1.7 |
| EX-COU-034 | ⚠️ | Le droit existe mais n'appartient qu'au profil DG, sans délégation | `permissions.ts` | M1.8 |
| EX-COU-035 | ➖ | Aucun modèle de document n'existe | — | M1.9 |
| EX-COU-040 | ❌ | Un seul rappel, et seulement une fois l'échéance atteinte | `reminders.ts:32-33` | M1.15 |
| EX-COU-042 | ⚠️ | Une escalade au chef, une seule fois, puis plus rien | `registers.ts:543-557` | M1.15 |
| EX-COU-043 | ⚠️ | Les courriers se classent, mais sans registre unifié ni rattachement explicite | — | M1.14 |
| EX-COU-045 | ❌ | Ni recherche ni filtre ; cinq compteurs non cliquables | — | M1.16 |
| EX-COU-051 | ❌ | Un partenaire confidentiel figure dans la liste et son nom est livré, puis le lien est refusé | `partner-links.ts:30-40` | M1 |

---

## 5.2 Module Signataire — `SIG`

### 5.2.1 Objet

Le module tient le circuit par lequel un document recueille des visas, puis une signature. Il sert tout
ce qui sort de l'Agence ou l'engage : courrier sortant, accords et avenants, actes de la direction.
C'est le seul circuit de signature du système : le courrier sortant n'en a pas d'autre
(voir EX-COU-031).

Le module sépare deux temps. La **préparation**, où l'auteur et l'antichambre écrivent librement. La
**signature**, où le texte est figé. Un circuit de signature ne vaut que parce que le contenu n'a pas
bougé depuis son entrée ; on modifie avant, jamais pendant.

### 5.2.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Auteur | Prépare le document, le soumet, le retire |
| Antichambre de la DG | Corrige ou retourne un projet pendant la préparation |
| Visant | Donne ou refuse son visa à son étape ; n'engage pas l'Agence |
| Secrétariat de direction | Finalise : numérotation, impression |
| Directrice générale | Vise, **signe au nom de l'Agence**, délègue sa signature |
| Directeur général adjoint | Signe pendant un intérim déclaré, par délégation datée, et pendant lui seulement |

### 5.2.3 Cycle de vie

```
PRÉPARATION ──> VISAS ──────────────> SIGNATURE ──> SIGNÉ ──> FINALISÉ
 (texte libre)  (étapes ordonnées)    (texte figé)   (acte)    (numéro, impression)
      ▲              │                    │
      └── retrait ───┴─── refus motivé ───┘
```

Un document refusé ou retiré revient en préparation, avec son motif. Un document signé ne revient
jamais.

### 5.2.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-SIG-01 | Un document au signataire passe par deux phases : préparation, puis signature. | `ANAT` |
| RG-SIG-02 | Le texte se modifie en préparation ; il est figé dès l'entrée en phase de signature. | `ANAT` |
| RG-SIG-03 | Un visa est l'accord d'une étape intermédiaire ; il n'engage pas l'Agence. | `ANAT` |
| RG-SIG-04 | Seule la Direction générale signe au nom de l'Agence ; le DGA le fait pendant un intérim déclaré. | `LOI` |
| RG-SIG-05 | L'intérim se déclare par une délégation datée qui s'ouvre et se ferme seule. | `ANAT` |
| RG-SIG-06 | Un document qui engage l'Agence est signé par la Direction générale, quel que soit son auteur. | `LOI` |
| RG-SIG-07 | Un coéquipier IA ne vise ni ne signe. | `ANAT` |
| RG-SIG-08 | Courrier sortant, annotation d'un entrant, accords et avenants empruntent ce circuit. | `ANAT` |
| RG-SIG-09 | Un refus de visa porte un motif écrit et ramène le document à son auteur. | `MÉTIER` |

### 5.2.5 Exigences

**Les deux phases**

**EX-SIG-001** · P1 · `ANAT` · `T` — Le système distingue, pour tout document, la phase de préparation et
la phase de signature.

**EX-SIG-002** · P1 · `ANAT` · `T` — Le système permet à l'auteur et à l'antichambre de modifier le texte
pendant la préparation.

**EX-SIG-003** · P1 · `QUAL` · `T` — Le système refuse toute modification du texte dès l'entrée du
document en phase de signature.

**EX-SIG-004** · P1 · `QUAL` · `T` — Le système conserve une empreinte du texte figé et permet d'en
vérifier l'intégrité.

**EX-SIG-005** · P2 · `MÉTIER` · `D` — Le système permet de retirer un document du circuit pour le
remettre en préparation, avec un motif obligatoire.

**Le circuit de visa**

**EX-SIG-010** · P1 · `ANAT` · `D` — Le système permet à l'auteur de composer, avant le lancement du
circuit, une suite ordonnée d'étapes de visa.

**EX-SIG-011** · P1 · `ANAT` · `D` — Le système présente à chaque visant les documents qui attendent son
visa.

**EX-SIG-012** · P1 · `QUAL` · `T` — Le système enregistre pour chaque visa son auteur, sa date et son
avis.

**EX-SIG-013** · P1 · `QUAL` · `T` — Le système refuse un visa à une personne qui n'est pas dans le
circuit du document.

**EX-SIG-014** · P1 · `MÉTIER` · `T` — Le système refuse un visa négatif sans motif et ramène le document
à son auteur.

**EX-SIG-015** · P2 · `MÉTIER` · `T` — Le système avertit le visant suivant lorsqu'une étape est franchie.

**EX-SIG-016** · P2 · `ANAT` · `D` — Le système produit pour un document signé un bordereau de ses visas
et de sa signature.

**La signature**

**EX-SIG-020** · P1 · `LOI` · `T` — Le système n'accepte la signature d'un document engageant l'Agence que
de la Direction générale, ou du directeur général adjoint pendant une délégation ouverte.

**EX-SIG-021** · P1 · `ANAT` · `D` — Le système permet à la Direction générale de déléguer sa signature
au directeur général adjoint par une délégation datée.

**EX-SIG-022** · P1 · `ANAT` · `T` — Le système refuse une délégation de signature sans date de début ni
date de fin.

**EX-SIG-023** · P1 · `ANAT` · `T` — Le système ouvre et ferme une délégation à ses dates, sans geste de
personne.

**EX-SIG-024** · P1 · `QUAL` · `T` — Le système journalise l'ouverture et la fermeture d'une délégation,
ainsi que chaque signature accomplie sous elle (voir EX-TRA-007).

**EX-SIG-025** · P1 · `ANAT` · `D` — Le système indique, sur tout acte signé pendant une délégation, qu'il
l'a été par délégation et pour quelle période.

**EX-SIG-026** · P1 · `ANAT` · `T` — Le système refuse qu'un coéquipier IA vise ou signe (voir
EX-TRA-080).

**EX-SIG-027** · P1 · `MÉTIER` · `D` — Le système présente à la Direction générale la pile des documents à
signer, séparée de celle des documents à viser.

**Ce qui entre au signataire**

**EX-SIG-030** · P1 · `ANAT` · `T` — Le système accepte au signataire un projet de courrier sortant (voir
EX-COU-031).

**EX-SIG-031** · P1 · `ANAT` · `T` — Le système accepte au signataire l'annotation de la Direction générale
sur un courrier entrant (voir EX-COU-020).

**EX-SIG-032** · P1 · `ANAT` · `T` — Le système accepte au signataire les accords et leurs avenants.

**EX-SIG-033** · P1 · `MÉTIER` · `T` — Le système retire du circuit un avenant dont l'accord parent n'est
plus en vigueur, avec un motif, plutôt que de le laisser signé sans effet (voir EX-PAR-026).

**Le retour à la personne et le vocabulaire**

**EX-SIG-040** · P1 · `QUAL` · `D` — Le système répond par un message écrit lorsqu'on enregistre un
brouillon, lance un circuit ou approuve un document (voir EX-TRA-050).

**EX-SIG-041** · P1 · `ANAT` · `I` — Le système nomme « signataire » le circuit, et « Signé par » la
personne qui signe un accord.

### 5.2.6 Écarts — module Signataire

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-SIG-001 | ⚠️ | Le circuit garantit l'intégrité depuis l'entrée ; la phase de préparation n'est pas distinguée | — | M1.7 |
| EX-SIG-002 | ❌ | Le texte ne se corrige pas dans le circuit : l'antichambre ne peut pas modifier un projet | — | M1.7 |
| EX-SIG-003 | ✅ | Le contenu est intact depuis l'entrée dans le circuit | — | — |
| EX-SIG-020 | ⚠️ | `signature.institution` est un droit permanent du seul profil DG | `permissions.ts` | M1.8 |
| EX-SIG-021 | ➖ | Aucune délégation de signature n'existe ; l'intérim n'est connu que pour les congés d'un agent | `leaves.ts` | M1.8 |
| EX-SIG-022 | ➖ | *idem* | — | M1.8 |
| EX-SIG-023 | ➖ | *idem* | — | M1.8 |
| EX-SIG-024 | ➖ | *idem* | — | M1.8 |
| EX-SIG-025 | ➖ | *idem* | — | M1.8 |
| EX-SIG-030 | ➖ | Un courrier n'entre jamais au signataire | `registers.ts` | M1.6 |
| EX-SIG-031 | ➖ | *idem* ; l'annotation se saisit pendant l'imputation | `registers.ts:296-345` | M1.6 |
| EX-SIG-033 | ❌ | La résiliation laisse l'avenant au statut `signature` ; il ne peut plus ni entrer en vigueur, ni être supprimé, ni être rejeté | `agreements.ts:780-810`, `569-574`, `681` | S3.1 |
| EX-SIG-040 | ❌ | « Enregistrer le brouillon », « Lancer le circuit » et « Approuver » sont muets | `Signataire.tsx` | F3.1 |
| EX-SIG-041 | ❌ | Le mot « signataire » est employé 232 fois ; « Signataire » désigne déjà la personne dans l'écran des accords | `Agreements.tsx:893` | F5.1, F5.2 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

## 5.3 Module Réunions — `REU`

### 5.3.1 Objet

Le module couvre la vie d'une réunion : programmation, ordre du jour, convocation, tenue, compte rendu,
adoption, puis ce qui reste après — les recommandations et les actions confiées.

Chaque entité tient ses réunions et adopte ses comptes rendus sans demander la permission de la
direction générale. Il existe en outre une **réunion hebdomadaire des directions**, qui rassemble les
directions et les cellules. Le compte rendu ne se « valide » pas : il **s'adopte**, collégialement, à la
séance suivante. Une séance ne produit pas seulement un document ; elle produit des charges, que le
module doit retracer et relancer.

### 5.3.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Animateur | Conduit la séance ; il est aussi le maître du temps |
| Rapporteur | Programme, prend note de chaque point, rédige le compte rendu et le saisit. **Il écrit, il ne décide pas** |
| Intervenant | Développe un point de l'ordre du jour |
| Présents | Amendent le projet de compte rendu, l'adoptent à la séance suivante |
| Responsable d'une charge | Change l'état de sa charge et dépose une pièce |
| Assistant de direction | Programme et rédige pour la Direction générale, sans décider à sa place |
| Directrice générale, DGA | Participent ; **ne valident pas** les comptes rendus des entités |
| Tout agent | Lit le compte rendu d'une réunion des directions |

### 5.3.3 Cycle de vie

```
PROGRAMMÉE ──> CONVOQUÉE ──> TENUE ──> PROJET DE COMPTE RENDU ──────> ADOPTÉ ──> FIGÉ
    │                           │         (amendé par les présents)      ▲
    │                           │                                        │
    └── NON TENUE / ANNULÉE     └─ recommandations ─> report à la séance suivante
                                                      (adoption : 1er point de l'ordre du jour,
                                                       avec ou sans modifications consignées)
```

Une séance sans séance suivante laisse son compte rendu à l'état de projet, et le système le dit.

### 5.3.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-REU-01 | Une réunion appartient à une entité, ou à un dossier, et porte un type pris dans un référentiel fermé. | `ANAT` |
| RG-REU-02 | Une réunion a trois fonctions distinctes : animateur (maître du temps), rapporteur, intervenants. | `ANAT` |
| RG-REU-03 | Le rapporteur rédige et saisit ; il ne décide rien. | `ANAT` |
| RG-REU-04 | Le compte rendu est adopté collégialement, au premier point de l'ordre du jour de la séance suivante. | `ANAT` |
| RG-REU-05 | L'assemblée peut adopter avec modifications ; elles sont consignées. | `ANAT` |
| RG-REU-06 | Entre la séance et son adoption, tous les présents peuvent amender le projet, avec trace de qui a écrit quoi. | `ANAT` |
| RG-REU-07 | Ni la direction générale ni le DGA ne valident les comptes rendus des entités. | `ANAT` |
| RG-REU-08 | Le type de réunion commande la numérotation, le chaînage des séries, le report des recommandations et la visibilité. | `ANAT` |
| RG-REU-09 | Le compte rendu d'une réunion des directions se lit par tous les agents. | `ANAT` |
| RG-REU-10 | Le compte rendu s'ouvre sur un rappel de la séance précédente et la synthèse de ses points. | `ANAT` |
| RG-REU-11 | Une action décidée en séance est à la fois une recommandation suivie jusqu'à sa clôture et une tâche pour la personne. | `ANAT` |
| RG-REU-12 | Tous les participants voient le compte rendu et peuvent demander des modifications ; le responsable d'une charge en change l'état et y dépose une pièce. | `ANAT` |
| RG-REU-13 | Une convocation exige un ordre du jour. | `ANAT` |

### 5.3.5 Exigences

**Programmation et convocation**

**EX-REU-001** · P1 · `ANAT` · `D` — Le système permet au rapporteur de programmer une réunion de son
entité.

**EX-REU-002** · P1 · `ANAT` · `T` — Le système rattache toute réunion à un type pris dans un référentiel
fermé.

**EX-REU-003** · P1 · `QUAL` · `T` — Le système chaîne les séries de réunions sur l'identifiant du type,
et jamais sur un libellé.

**EX-REU-004** · P1 · `QUAL` · `I` — Le système ne fait dépendre aucune règle — numérotation, report,
visibilité — de l'orthographe d'un champ de texte libre.

**EX-REU-005** · P1 · `ANAT` · `D` — Le système demande l'ordre du jour dans le formulaire de
programmation.

**EX-REU-006** · P1 · `ANAT` · `T` — Le système refuse de convoquer une réunion dont l'ordre du jour est
vide.

**EX-REU-007** · P2 · `MÉTIER` · `D` — Le système indique à l'écran quels points le report automatique a
ajoutés à l'ordre du jour.

**EX-REU-008** · P2 · `MÉTIER` · `T` — Le système refuse une réunion dont l'heure de fin précède l'heure de
début.

**EX-REU-009** · P1 · `ANAT` · `T` — Le système numérote une réunion avec le code de l'entité qui la
tient.

**EX-REU-010** · P2 · `MÉTIER` · `D` — Le système permet de déclarer une séance non tenue, avec un motif.

**Les trois fonctions**

**EX-REU-011** · P1 · `ANAT` · `D` — Le système porte, pour chaque réunion, un animateur qui est aussi le
maître du temps.

**EX-REU-012** · P1 · `ANAT` · `D` — Le système porte, pour chaque réunion, un rapporteur.

**EX-REU-013** · P1 · `ANAT` · `D` — Le système porte, pour chaque point de l'ordre du jour, un ou plusieurs
intervenants.

**EX-REU-014** · P1 · `ANAT` · `T` — Le système refuse qu'un coéquipier IA occupe une fonction de réunion.

**EX-REU-015** · P1 · `ANAT` · `T` — Le système réserve la saisie du compte rendu au rapporteur.

**EX-REU-016** · P1 · `ANAT` · `I` — Le système nomme « intervenant » la personne qui développe un point, et
« rapporteur » celle qui rédige.

**Le compte rendu et son adoption**

**EX-REU-020** · P1 · `ANAT` · `D` — Le système reprend en tête du compte rendu le rappel de la séance
précédente et la synthèse de ses points.

**EX-REU-021** · P1 · `ANAT` · `D` — Le système permet au rapporteur de consigner, pour chaque point, ce qui
a été abordé.

**EX-REU-022** · P1 · `ANAT` · `T` — Le système tient le compte rendu à l'état de projet jusqu'à son
adoption.

**EX-REU-023** · P1 · `ANAT` · `T` — Le système permet à tout présent d'amender le projet de compte rendu
entre la séance et son adoption.

**EX-REU-024** · P1 · `QUAL` · `T` — Le système consigne, pour chaque amendement, son auteur, sa date et le
texte avant et après.

**EX-REU-025** · P1 · `ANAT` · `T` — Le système inscrit l'adoption du compte rendu précédent au premier
point de l'ordre du jour de la séance suivante.

**EX-REU-026** · P1 · `ANAT` · `D` — Le système permet au rapporteur d'enregistrer l'adoption décidée par
l'assemblée.

**EX-REU-027** · P1 · `ANAT` · `T` — Le système permet d'enregistrer une adoption avec modifications.

**EX-REU-028** · P1 · `ANAT` · `T` — Le système porte au document figé les modifications demandées en
séance, avec la mention qu'elles l'ont été en séance.

**EX-REU-029** · P1 · `QUAL` · `T` — Le système fige le compte rendu dès son adoption.

**EX-REU-030** · P1 · `ANAT` · `T` — Le système refuse qu'une personne seule — direction générale et DGA
compris — valide un compte rendu.

**EX-REU-031** · P1 · `MÉTIER` · `D` — Le système indique qu'un compte rendu reste à l'état de projet tant
qu'aucune séance suivante n'est programmée.

**EX-REU-032** · P2 · `ANAT` · `D` — Le système permet à tout participant de demander une modification du
compte rendu.

**Visibilité**

**EX-REU-040** · P1 · `ANAT` · `T` — Le système ouvre à tous les agents la lecture du compte rendu d'une
réunion des directions.

**EX-REU-041** · P1 · `QUAL` · `T` — Le système fonde cette ouverture sur le type de la réunion, et non sur
son libellé.

**EX-REU-042** · P1 · `QUAL` · `T` — Le système réserve une réunion confidentielle à ses convoqués et aux
personnes habilitées (voir EX-TRA-010).

**Recommandations et actions**

**EX-REU-050** · P1 · `ANAT` · `T` — Le système enregistre une action décidée en séance comme
recommandation, avec un responsable et une échéance.

**EX-REU-051** · P1 · `ANAT` · `T` — Le système crée pour le responsable d'une recommandation une tâche dans
sa liste unique (voir EX-TRA-040).

**EX-REU-052** · P1 · `QUAL` · `T` — Le système tient l'état de la recommandation et celui de sa tâche
synchronisés dans les deux sens.

**EX-REU-053** · P1 · `ANAT` · `T` — Le système relance le responsable d'une recommandation avant son
échéance.

**EX-REU-054** · P1 · `ANAT` · `T` — Le système reporte à l'ordre du jour de la séance suivante de la même
série les recommandations non closes.

**EX-REU-055** · P1 · `ANAT` · `D` — Le système permet au responsable d'une charge d'en changer l'état.

**EX-REU-056** · P1 · `ANAT` · `D` — Le système permet au responsable d'une charge d'y déposer une pièce.

**EX-REU-057** · P2 · `MÉTIER` · `T` — Le système refuse l'annulation d'une recommandation sans motif.

**EX-REU-058** · P2 · `QUAL` · `D` — Le système n'ouvre le geste de décision d'une séance qu'à la personne
que le serveur autorise à l'exercer (voir EX-ACT-008).

### 5.3.6 Écarts — module Réunions

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-REU-002 | ❌ | Le type est un champ libre | — | M2.5 |
| EX-REU-003 | ❌ | Le chaînage se fait par égalité de chaîne : trois séances sur quatre deviennent orphelines | `meetings.ts:789-791` | M2.5 |
| EX-REU-004 | ❌ | La confidentialité s'accroche à `meeting_type ILIKE 'Comité de direction%'` ; la numérotation et le report dépendent aussi du libellé | `meetings.ts:260` | M2.4, M2.5 |
| EX-REU-005 | ❌ | Le formulaire de programmation compte 16 champs, aucun pour l'ordre du jour : 7 clics pour programmer puis convoquer | — | M2.6 |
| EX-REU-006 | ⚠️ | Selon qu'il restait ou non des recommandations ouvertes, la convocation passe avec un ordre du jour que personne n'a écrit, ou échoue | — | M2.6 |
| EX-REU-007 | ❌ | L'écran ne dit pas ce que le report automatique a ajouté | — | M2.6 |
| EX-REU-009 | ❌ | Le code de service n'est jamais envoyé : tous les comptes rendus portent « DIR » | `meetings.ts:807` | F2.5 |
| EX-REU-011 | ⚠️ | Une présidence existe ; l'animateur et le maître du temps ne sont pas nommés | — | M2.3 |
| EX-REU-013 | ⚠️ | Les intervenants existent par point, mais l'écran les nomme « rapporteur » | `Meetings.tsx:1968` | M2.3 |
| EX-REU-016 | ❌ | Les deux mots sont intervertis | `Meetings.tsx:1968` | M2.3 |
| EX-REU-023 | ➖ | Aucun amendement du projet par les présents n'est décrit ; la validation est individuelle | — | M2.2 |
| EX-REU-024 | ➖ | *idem* | — | M2.2 |
| EX-REU-025 | ➖ | L'adoption à la séance suivante n'existe pas | — | M2.2 |
| EX-REU-027 | ➖ | Aucune adoption avec modifications consignées | — | M2.2 |
| EX-REU-028 | ➖ | *idem* | — | M2.2 |
| EX-REU-030 | ❌ | `meetings.validate` est un droit personnel détenu par deux personnes ; estimation du testeur : ~600 validations par an | — | M2.1 |
| EX-REU-031 | ➖ | Le cas d'une séance sans suivante n'est pas traité | — | M2.2 |
| EX-REU-040 | ❌ | La règle vise un libellé qui n'existe pas : le nom réel est « Réunion hebdomadaire des Directions » | `meetings.ts:260` | M2.4 |
| EX-REU-041 | ❌ | *idem* | `meetings.ts:260` | M2.4 |
| EX-REU-051 | ⚠️ | Une recommandation devient tâche quand elle a un dossier de rattachement | `docs/MODELE-INSTITUTIONNEL.md` § 3.2 | M2.7 |
| EX-REU-053 | ❌ | Rien ne relance une recommandation de réunion | — | M2.7 |
| EX-REU-058 | ⚠️ | Corrigé dans l'ancien modèle (`can.decide` exige `meetings.validate`, comme `assertDecider`) ; à reprendre quand ce droit cesse d'être la condition d'adoption | commit `247944c` | M2.8 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.
Le nouveau modèle d'adoption (M2.8) est à reprendre dans le droit de décision de séance.*

---

## 5.4 Module Décisions — `DEC`

### 5.4.1 Objet

Le module tient le registre des décisions de la direction générale et ce qui y conduit ou en découle.
Une décision qui n'est pas inscrite au registre n'a pas été prise.

Aujourd'hui, **un seul mot recouvre trois objets** : l'arbitrage d'un dossier, la décision à confirmer,
l'exécution déclarée. Sur trois écrans, sept objets portent ce nom, et des compteurs annoncent des listes
qui ne les contiennent pas. Ce module les spécifie comme **trois objets distincts**, chacun avec sa
liste, son cycle et son acteur. *Les noms définitifs sont attendus du maître d'ouvrage ; les termes
« arbitrage », « décision » et « exécution » employés ci-dessous sont provisoires.*

Le module accueille aussi, comme **charges**, les actes d'amont du conseil d'administration : une
résolution y entre pour être suivie, elle ne s'y délibère pas.

### 5.4.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Directrice générale | Tranche un arbitrage, confirme une décision |
| Assistant de direction | Inscrit une décision **prise** par la DG ; ne la prend pas, ne tranche pas, ne confirme pas |
| Directeur général adjoint | Consulte ; n'enregistre pas les décisions de la DG |
| Demandeur d'un arbitrage | Pose la question ; **ne tranche jamais** sa propre demande |
| Chargé d'exécution | Exécute, déclare l'exécution |
| Secrétariat de direction | Suit l'exécution ; confirme une exécution déclarée *(à confirmer)* |
| Agent | Consulte les décisions qui le concernent |

### 5.4.3 Cycle de vie

Trois objets, trois cycles.

```
ARBITRAGE         DEMANDÉ ──> TRANCHÉ ──> (inscrit au registre une décision)
(d'un dossier)       │
                     └──> RETIRÉ

DÉCISION          INSCRITE ──> CONFIRMÉE ──> REMPLACÉE (par une décision de remplacement)
(à confirmer)     (texte figé)  (par la DG)

EXÉCUTION         À EXÉCUTER ──> EN COURS ──> DÉCLARÉE EXÉCUTÉE ──> CONFIRMÉE
(déclarée)                                      (par le chargé)      (par une autre personne)
```

### 5.4.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-DEC-01 | La direction générale décide ; l'assistant inscrit ce qu'elle a décidé. | `ANAT` |
| RG-DEC-02 | Le DGA n'enregistre pas les décisions de la DG. | `ANAT` |
| RG-DEC-03 | Un arbitrage est tranché par la DG, jamais par son demandeur. | `ANAT` |
| RG-DEC-04 | Une décision inscrite est numérotée dans sa série et son exercice, et son texte est figé. | `ANAT` |
| RG-DEC-05 | Une décision ne se modifie pas : elle se remplace par une décision de remplacement. | `MÉTIER` |
| RG-DEC-06 | Une décision a un chargé d'exécution et une échéance, sauf décision déclarée sans exécution. | `ANAT` |
| RG-DEC-07 | Une exécution déclarée par le chargé est confirmée par une autre personne. | `MÉTIER` |
| RG-DEC-08 | La confidentialité d'une décision est celle du dossier qu'elle concerne. | `QUAL` |
| RG-DEC-09 | Un coéquipier IA n'inscrit, ne tranche ni ne confirme rien. | `ANAT` |
| RG-DEC-10 | Un compteur renvoie à la liste qu'il compte. | `QUAL` |
| RG-DEC-11 | Une résolution du conseil d'administration entre comme charge à suivre ; elle ne se délibère pas dans le système. | `LOI` |

### 5.4.5 Exigences

**Trois objets**

**EX-DEC-001** · P1 · `ANAT` · `T` — Le système distingue l'arbitrage d'un dossier, la décision à confirmer
et l'exécution déclarée comme trois objets, chacun avec sa liste et son cycle.

**EX-DEC-002** · P1 · `QUAL` · `I` — Le système donne à chacun des trois objets un nom propre, employé
seul dans toute l'interface. *(Noms attendus du maître d'ouvrage.)*

**EX-DEC-003** · P1 · `QUAL` · `T` — Le système renvoie chaque compteur vers la liste qu'il compte.

**EX-DEC-004** · P2 · `QUAL` · `D` — Le système ne propose pas de geste de décision lorsque la liste
correspondante est vide.

**Arbitrage d'un dossier**

**EX-DEC-010** · P1 · `ANAT` · `D` — Le système permet au responsable d'un projet ou d'une activité de
demander un arbitrage, avec sa question, son contexte, ses options et leurs conséquences, sa
recommandation et la date souhaitée.

**EX-DEC-011** · P1 · `QUAL` · `T` — Le système n'avertit d'une demande d'arbitrage que les personnes qui
peuvent ouvrir le dossier (voir EX-TRA-011).

**EX-DEC-012** · P1 · `MÉTIER` · `T` — Le système remonte à la direction générale, et en informe le
demandeur, une demande dont personne ne peut décider.

**EX-DEC-013** · P1 · `ANAT` · `T` — Le système réserve la décision d'un arbitrage à la direction générale.

**EX-DEC-014** · P1 · `ANAT` · `T` — Le système refuse que le demandeur tranche sa propre demande.

**EX-DEC-015** · P1 · `ANAT` · `T` — Le système inscrit au registre la décision qui tranche un arbitrage.

**EX-DEC-016** · P2 · `MÉTIER` · `T` — Le système informe le demandeur de la décision prise.

**EX-DEC-017** · P2 · `MÉTIER` · `D` — Le système permet au demandeur de retirer sa demande tant qu'elle
n'est pas tranchée.

**EX-DEC-018** · P2 · `MÉTIER` · `T` — Le système lève la décision attendue d'un dossier lorsque son
arbitrage est tranché.

**EX-DEC-019** · P1 · `QUAL` · `T` — Le système ne ferme un arbitrage par l'inscription d'une décision que si
l'auteur de l'inscription peut le trancher.

**Décision inscrite**

**EX-DEC-020** · P1 · `ANAT` · `D` — Le système permet à l'assistant de direction d'inscrire une décision
prise par la direction générale (voir EX-ACT-005).

**EX-DEC-021** · P1 · `ANAT` · `T` — Le système réserve la confirmation d'une décision à la direction
générale.

**EX-DEC-022** · P1 · `ANAT` · `T` — Le système refuse au directeur général adjoint l'inscription d'une
décision de la direction générale.

**EX-DEC-023** · P1 · `ANAT` · `T` — Le système refuse qu'un coéquipier IA inscrive ou confirme une
décision.

**EX-DEC-024** · P1 · `ANAT` · `T` — Le système attribue à toute décision inscrite un numéro de la forme
`DEC/{exercice}/{rang}` (voir EX-TRA-001 à EX-TRA-003).

**EX-DEC-025** · P1 · `ANAT` · `T` — Le système date une décision du jour où la direction générale l'a
prise, et non du jour de sa saisie (voir EX-TRA-004).

**EX-DEC-026** · P1 · `QUAL` · `T` — Le système fige le texte d'une décision dès son inscription.

**EX-DEC-027** · P1 · `MÉTIER` · `T` — Le système corrige une décision par une décision de remplacement qui
ne prend effet qu'à sa confirmation.

**EX-DEC-028** · P2 · `QUAL` · `D` — Le système distingue dans le registre une décision non encore
confirmée.

**EX-DEC-029** · P1 · `ANAT` · `T` — Le système exige un chargé d'exécution et une échéance, sauf pour une
décision déclarée sans exécution.

**EX-DEC-030** · P1 · `QUAL` · `T` — Le système donne à une décision la confidentialité du dossier qu'elle
concerne.

**EX-DEC-031** · P1 · `ANAT` · `T` — Le système relance le chargé d'exécution avant l'échéance.

**EX-DEC-032** · P1 · `ANAT` · `D` — Le système place une décision à exécuter dans la liste unique de son
chargé (voir EX-TRA-040).

**Exécution déclarée**

**EX-DEC-040** · P1 · `ANAT` · `D` — Le système permet au chargé de déclarer l'exécution d'une décision,
avec une pièce s'il y a lieu.

**EX-DEC-041** · P1 · `MÉTIER` · `T` — Le système réserve la confirmation d'une exécution à une personne
autre que le déclarant.

**EX-DEC-042** · P1 · `MÉTIER` · `T` — Le système refuse de passer une décision à l'état exécuté sans
confirmation.

**EX-DEC-043** · P2 · `ANAT` · `D` — Le système compte les retards d'exécution au tableau de bord de la
direction générale.

**Actes d'amont**

**EX-DEC-050** · P2 · `LOI` · `D` — Le système permet d'enregistrer une résolution du conseil
d'administration comme charge à suivre, sans qu'elle s'y délibère.

**EX-DEC-051** · P3 · `ANAT` · `D` — Le système permet de retenir un budget arrêté par le conseil comme
cadre d'exécution consultable.

### 5.4.6 Écarts — module Décisions

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-DEC-001 | ❌ | Sept objets sous un même mot : 3 arbitrages, 2 décisions à confirmer, 2 exécutions déclarées | — | F5.3 |
| EX-DEC-002 | ❌ | Les noms ne sont pas arrêtés | — | F5.3 |
| EX-DEC-003 | ❌ | « Tout voir » mène à un registre de 62 lignes où aucun des 3 arbitrages ne figure ; « Trancher un arbitrage — aucun en attente » mène à un onglet vide pendant que l'écran annonce « 3 décisions attendent votre arbitrage » | `Pilotage.tsx:348` | F5.3 |
| EX-DEC-011 | ❌ | `ask()` notifie tous les détenteurs de `decisions.record`, avec le nom du dossier, alors que `list()` filtre les dossiers confidentiels | `portfolio.ts:293-307` | S1.4 |
| EX-DEC-012 | ❌ | Un demandeur seul décideur possible se refuse lui-même ; personne n'est prévenu | `portfolio.ts:309-355` | S1.4 |
| EX-DEC-014 | ✅ | Le demandeur se refuse lui-même | `portfolio.ts:309-355` | S1.4 |
| EX-DEC-032 | ❌ | « Mes tâches » ne porte que les tâches et les livrables | — | F1.7 |
| EX-DEC-050 | ➖ | Aucun acte d'amont du conseil n'entre dans le système | — | — |
| EX-DEC-051 | ➖ | *idem* | — | — |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

## 5.5 Module Plans de travail — `PLA`

### 5.5.1 Objet

Le module tient l'engagement annuel d'une entité : son plan de travail, composé d'activités du plan avec
cibles et indicateurs. Le plan découle des attributions de l'entité, il est préparé par elle et approuvé
au-dessus. Il dit **quoi** et **pour quand** ; il ne se « fait » pas lui-même — ce sont les dossiers
(projets et activités) qui le réalisent et dont l'avancement remonte.

Le plan s'accroche à l'exercice annuel et à la cadence trimestrielle de l'Agence : revue du plan,
écarts expliqués, revue figée.

### 5.5.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Chef d'entité | Prépare le plan de son entité et des entités qui lui sont rattachées, le soumet |
| Approbateur | Approuve le plan, au-dessus de l'entité ; n'est jamais celui qui l'a soumis |
| Directrice générale | Lit tous les plans, approuve ceux qui lui reviennent |
| Directeur général adjoint | Approuve ; lit tous les plans |
| Agent | Lit le plan de son entité et ses activités |
| Porteur d'un dossier | Rattache son projet ou son activité à une activité du plan |

### 5.5.3 Cycle de vie

```
PRÉPARATION ──> SOUMIS ──> APPROUVÉ ──> EN RÉVISION ──> SOUMIS ──> APPROUVÉ
 (entité)       (approbateur désigné)    (motif)                      (figé)
                    │
                    └── renvoyé avec motif ──> PRÉPARATION
```

Chaque trimestre, une **revue** confronte le constaté à l'attendu, explique les écarts, puis se fige.

### 5.5.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-PLA-01 | Un plan porte sur un exercice et sur une entité. | `ANAT` |
| RG-PLA-02 | Le plan découle des attributions de l'entité. | `ANAT` |
| RG-PLA-03 | Celui qui soumet un plan ne l'approuve pas. | `ANAT` |
| RG-PLA-04 | Le système dit à celui qui soumet qui peut approuver. | `ANAT` |
| RG-PLA-05 | Un chef prépare le plan de son entité et des entités rattachées, et d'aucune autre. | `ANAT` |
| RG-PLA-06 | Un plan approuvé est figé ; il ne change que par révision. | `MÉTIER` |
| RG-PLA-07 | L'avancement d'une activité du plan vient des dossiers qui la réalisent. | `ANAT` |
| RG-PLA-08 | Les budgets d'un plan se masquent hors de la direction, des chefs de l'entité et des membres. | `QUAL` |
| RG-PLA-09 | La revue trimestrielle confronte le constaté à l'attendu ; chaque écart est expliqué. | `ANAT` |

### 5.5.5 Exigences

**Préparation**

**EX-PLA-001** · P1 · `ANAT` · `D` — Le système permet au chef d'entité de préparer le plan annuel de son
entité.

**EX-PLA-002** · P1 · `ANAT` · `T` — Le système refuse à un chef de préparer le plan d'une entité hors de
son périmètre (voir EX-ACT-006).

**EX-PLA-003** · P1 · `ANAT` · `T` — Le système rattache chaque plan à un exercice.

**EX-PLA-004** · P2 · `ANAT` · `D` — Le système permet de rattacher chaque activité du plan à une attribution
de l'entité.

**EX-PLA-005** · P2 · `MÉTIER` · `T` — Le système refuse une activité du plan dont les dates sortent de
l'exercice du plan.

**EX-PLA-006** · P2 · `MÉTIER` · `T` — Le système refuse un responsable d'activité qui n'appartient pas au
périmètre de l'entité.

**Soumission et approbation**

**EX-PLA-010** · P1 · `ANAT` · `D` — Le système permet de soumettre un plan à approbation.

**EX-PLA-011** · P1 · `ANAT` · `T` — Le système refuse l'approbation d'un plan par la personne qui l'a
soumis.

**EX-PLA-012** · P1 · `ANAT` · `D` — Le système indique à celui qui soumet qui peut approuver le plan.

**EX-PLA-013** · P1 · `MÉTIER` · `T` — Le système avertit l'approbateur qu'un plan l'attend.

**EX-PLA-014** · P1 · `MÉTIER` · `D` — Le système présente à l'approbateur la liste des plans qui attendent
son approbation.

**EX-PLA-015** · P1 · `MÉTIER` · `T` — Le système permet de renvoyer un plan à son entité avec un motif
obligatoire.

**EX-PLA-016** · P1 · `QUAL` · `T` — Le système fige un plan approuvé.

**EX-PLA-017** · P2 · `MÉTIER` · `T` — Le système permet de réviser un plan approuvé par une révision qui
suit le même circuit et porte un motif.

**EX-PLA-018** · P1 · `QUAL` · `T` — Le système journalise la soumission, l'approbation, le renvoi et la
révision d'un plan (voir EX-TRA-007).

**Avancement et revue**

**EX-PLA-020** · P1 · `ANAT` · `T` — Le système calcule l'avancement d'une activité du plan à partir des
dossiers qui la réalisent.

**EX-PLA-021** · P2 · `MÉTIER` · `T` — Le système refuse la saisie manuelle de l'avancement d'une activité
du plan qui a des dossiers.

**EX-PLA-022** · P2 · `MÉTIER` · `A` — Le système pondère les activités du plan pour calculer l'avancement
du plan.

**EX-PLA-023** · P1 · `ANAT` · `D` — Le système présente chaque trimestre, pour chaque plan, le constaté face
à l'attendu.

**EX-PLA-024** · P2 · `ANAT` · `T` — Le système exige une explication pour tout écart d'une revue.

**EX-PLA-025** · P2 · `QUAL` · `T` — Le système fige une revue trimestrielle une fois arrêtée.

**EX-PLA-026** · P1 · `ANAT` · `D` — Le système signale à la direction générale les activités du plan en
retard.

**Visibilité**

**EX-PLA-030** · P1 · `QUAL` · `T` — Le système masque les budgets d'un plan à toute personne extérieure à la
direction, aux chefs de l'entité et aux membres (voir EX-TRA-010).

**EX-PLA-031** · P2 · `ANAT` · `D` — Le système permet à la direction générale de consulter tous les plans.

**EX-PLA-032** · P2 · `QUAL` · `D` — Le système ne propose dans les listes de choix du formulaire de plan que
les entités que le serveur acceptera (voir EX-TRA-013).

### 5.5.6 Écarts — module Plans de travail

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-PLA-004 | ➖ | Le cadre organique n'est pas connu de l'outil ; les attributions sont du texte libre | — | H4 |
| EX-PLA-012 | ❌ | L'outil n'indique pas qui peut approuver : la personne qui soumet se trouve devant un écran sans issue | `docs/CONTEXTE-INSTITUTIONNEL.md` § 7 | — |
| EX-PLA-014 | ⚠️ | Dans le rail, l'entrée « Plans » ne paraît que si le module contient déjà quelque chose | `Sidebar.tsx:144-172` | F3.3 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi. Le
dossier d'intervention ne contient aucun point propre aux plans de travail : ce module est le moins
instruit par les 102 défauts.*

---

## 5.6 Module Attributions — `ATT`

### 5.6.1 Objet

Une entité sait ce qu'elle a à faire parce qu'une **fiche d'attributions** le dit. Cette fiche ne
s'écrit pas librement : elle se rédige selon le **cadre organique** de l'Agence, le texte qui crée les
entités et leur donne leurs charges. L'entité peut rédiger les siennes, dans les limites de ce cadre.

Le module tient ces fiches. Elles fondent le plan de travail (voir § 5.5). *Deux décisions sont attendues
du maître d'ouvrage : qui arrête une fiche, et si le cadre organique se consulte dans l'outil.*

### 5.6.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Chef d'entité | Rédige la fiche de son entité et des entités rattachées |
| Autorité qui arrête la fiche | *À préciser (question 14)* |
| Agent | Lit la fiche de son entité |
| Direction générale | Lit toutes les fiches |
| Responsable informatique | Administre la structure ; ne rédige pas les attributions |

### 5.6.3 Cycle de vie

*Sous réserve de la décision sur celui qui arrête la fiche.*

```
BROUILLON ──> SOUMISE ──> ARRÊTÉE ──> EN RÉVISION ──> SOUMISE ──> ARRÊTÉE
 (l'entité)               (autorité à préciser)
```

### 5.6.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-ATT-01 | Une entité a une fiche d'attributions. | `ANAT` |
| RG-ATT-02 | La fiche se rédige selon les conditions du cadre organique. | `ANAT` |
| RG-ATT-03 | Une entité rédige ses attributions, dans les limites du cadre organique. | `ANAT` |
| RG-ATT-04 | Un chef d'entité rédige pour son entité et les entités rattachées, pas au-delà. | `ANAT` |
| RG-ATT-05 | Les attributions d'une entité fondent son plan de travail. | `ANAT` |

### 5.6.5 Exigences

**EX-ATT-001** · P1 · `ANAT` · `D` — Le système permet au chef d'entité de rédiger la fiche d'attributions de
son entité.

**EX-ATT-002** · P1 · `ANAT` · `T` — Le système refuse à un chef de rédiger ou de supprimer la fiche d'une
entité hors de son périmètre (voir EX-ACT-006).

**EX-ATT-003** · P1 · `QUAL` · `D` — Le système ne propose « Créer la fiche » que pour les entités où la
personne peut la rédiger.

**EX-ATT-004** · P2 · `ANAT` · `D` — Le système permet de rattacher chaque attribution à une référence du
cadre organique.

**EX-ATT-005** · P1 · `ANAT` · `T` — Le système distingue le brouillon d'une fiche de la fiche arrêtée.
*(Autorité attendue du maître d'ouvrage.)*

**EX-ATT-006** · P1 · `ANAT` · `T` — Le système réserve l'arrêt d'une fiche à la personne ou à l'instance que
le maître d'ouvrage désignera.

**EX-ATT-007** · P1 · `QUAL` · `T` — Le système journalise toute modification d'une fiche arrêtée, avec le
texte avant et après (voir EX-TRA-007).

**EX-ATT-008** · P2 · `MÉTIER` · `D` — Le système conserve l'historique des versions arrêtées d'une fiche.

**EX-ATT-009** · P2 · `MÉTIER` · `D` — Le système liste les entités qui n'ont pas de fiche.

**EX-ATT-010** · P2 · `ANAT` · `D` — Le système présente à tout agent la fiche de son entité.

**EX-ATT-011** · P1 · `QUAL` · `D` — Le système ouvre à un droit de consultation des attributions une porte
dans la navigation (voir EX-ACT-009).

### 5.6.6 Écarts — module Attributions

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-ATT-003 | ❌ | « Créer la fiche » est proposé pour les treize entités à un chef de cellule | — | H5 |
| EX-ATT-004 | ➖ | Les attributions s'écrivent en texte libre, sans référence | — | H4 |
| EX-ATT-006 | ➖ | Personne n'arrête les fiches ; la question est posée | — | H6 |
| EX-ATT-011 | ❌ | `attributions.view` n'a **aucun** chemin dans le rail : `structure` ne lui accorde rien | `Sidebar.tsx:144-172` | F3.3 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

## 5.7 Module Portefeuille — `POR`

### 5.7.1 Objet

Le portefeuille est **une vue, pas un objet** : l'ensemble des dossiers — projets et activités — que la
direction pilote. On n'y crée pas de portefeuille ; on y voit ses dossiers.

Le **projet** produit un résultat, avec une équipe, des tâches, des livrables, des contrats, des
documents, des réunions, des risques ; il a une fin. L'**activité** est un dossier d'événement ou de
représentation — commission, conférence, rendez-vous, activité interne — avec un mandat et des suites à
donner. Chacun est rattaché à une entité, porté par une personne, et réalise une activité du plan
(voir § 5.5). Le module porte aussi la revue de portefeuille : santé déclarée face à santé calculée, et
les demandes d'arbitrage (voir § 5.4).

### 5.7.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Directrice générale, DGA | Lisent tous les dossiers non privés, revoient le portefeuille, tranchent les arbitrages (DG) |
| Chef d'entité | Porte les dossiers de son entité ; lit ceux de son arbre, même privés, avec trace |
| Responsable d'un dossier | Conduit le dossier, déclare sa santé, demande un arbitrage |
| Membre de l'équipe | Travaille dans le dossier selon son rôle : lecteur ou éditeur |
| Invité, consultant | Accède à ce qu'on lui ouvre, rien d'autre |

### 5.7.3 Cycle de vie

```
PROJET :   CRÉÉ ──> EN COURS ──> CLOS
                       │
                       └── arbitrage demandé ──> décision de la DG (voir 5.4)

ACTIVITÉ : CRÉÉE ──> EN COURS ──> TENUE ──> CLOSE  (suites à donner suivies après coup)
```

Un dossier porte deux santés : celle que son responsable **déclare**, celle que le système **calcule**
(calendrier, livrables, budget, tâches, arbitrage). L'écart entre les deux est la matière de la revue.

### 5.7.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-POR-01 | Le portefeuille est une vue : il n'a pas de cycle de vie propre. | `ANAT` |
| RG-POR-02 | Tout dossier est rattaché à une entité et porté par une personne. | `ANAT` |
| RG-POR-03 | Un projet a une fin ; une mission permanente n'est pas un projet. | `MÉTIER` |
| RG-POR-04 | Un projet naît ouvert à l'équipe choisie, et à personne si aucune n'est choisie. | `ANAT` |
| RG-POR-05 | Le droit d'écrire un document de dossier suit le rôle tenu sur le projet : un lecteur lit, un éditeur dépose, un invité sans rôle n'accède pas. | `ANAT` |
| RG-POR-06 | La santé calculée se présente à côté de la santé déclarée ; l'écart se signale. | `ANAT` |
| RG-POR-07 | Une raison budgétaire ne sort que pour qui voit le budget. | `QUAL` |
| RG-POR-08 | Un projet privé reste lisible de la hiérarchie de l'entité porteuse ; cette lecture entre au journal du projet. | `ANAT` |
| RG-POR-09 | Un chef d'entité se limite à son entité et aux endroits où il a été invité. | `ANAT` |
| RG-POR-10 | Tout changement de confidentialité, de responsable ou de santé d'un dossier est journalisé. | `QUAL` |
| RG-POR-11 | L'avancement d'un dossier remonte à l'activité du plan qu'il réalise. | `ANAT` |

### 5.7.5 Exigences

**Création et accès**

**EX-POR-001** · P1 · `ANAT` · `T` — Le système crée un projet dont le seul membre est son créateur lorsque
aucune équipe n'a été choisie.

**EX-POR-002** · P1 · `ANAT` · `T` — Le système crée un projet qui compte pour membres l'équipe choisie et
personne d'autre.

**EX-POR-003** · P1 · `ANAT` · `D` — Le système n'impose aucune équipe par défaut à la création d'un
projet.

**EX-POR-004** · P2 · `QUAL` · `D` — Le système présente le même formulaire de création depuis l'accueil et
depuis « Mon entité ».

**EX-POR-005** · P1 · `ANAT` · `T` — Le système rattache tout dossier à une entité et à un responsable.

**EX-POR-006** · P1 · `ANAT` · `T` — Le système refuse le dépôt d'un document dans un dossier à toute
personne qui n'y tient pas un rôle d'écriture.

**EX-POR-007** · P1 · `ANAT` · `T` — Le système ouvre le dépôt à l'éditeur du projet et la lecture au
lecteur, et ne donne aucun accès à un invité sans rôle.

**EX-POR-008** · P1 · `QUAL` · `T` — Le système ne révèle le nom d'un dossier inaccessible dans aucun message
d'erreur.

**EX-POR-009** · P2 · `ANAT` · `T` — Le système journalise la consultation d'un projet privé par la
hiérarchie.

**EX-POR-010** · P1 · `ANAT` · `T` — Le système limite un chef d'entité à son entité, aux entités rattachées
et aux espaces où il a été invité (voir EX-ACT-006).

**Santé et revue**

**EX-POR-020** · P1 · `ANAT` · `T` — Le système calcule la santé d'un dossier à partir du calendrier, des
livrables, du budget, des tâches et de l'arbitrage.

**EX-POR-021** · P1 · `ANAT` · `D` — Le système présente la santé calculée à côté de la santé déclarée.

**EX-POR-022** · P2 · `MÉTIER` · `D` — Le système place en tête de revue les projets dont les deux santés
divergent.

**EX-POR-023** · P1 · `QUAL` · `T` — Le système applique un masque unique du budget à toute route qui
renvoie des raisons.

**EX-POR-024** · P1 · `QUAL` · `T` — Le système ne renvoie ni montant ni raison budgétaire à une personne qui
ne voit pas le budget (voir EX-TRA-010).

**EX-POR-025** · P1 · `ANAT` · `D` — Le système permet à la direction générale de lire tous les dossiers non
privés.

**EX-POR-026** · P2 · `QUAL` · `T` — Le système applique la même règle de retard au portefeuille, au tableau
de bord et à l'accueil.

**Arbitrage**

**EX-POR-030** · P1 · `ANAT` · `D` — Le système permet de demander l'arbitrage de la direction générale
depuis la fiche d'un projet ou d'une activité (voir EX-DEC-010).

**Activités**

**EX-POR-040** · P1 · `QUAL` · `T` — Le système journalise toute modification d'une activité, avec les valeurs
avant et après pour la confidentialité, le responsable et la santé (voir EX-TRA-007).

**EX-POR-041** · P1 · `MÉTIER` · `T` — Le système prévient le nouveau responsable d'une activité lorsque le
responsable change.

**EX-POR-042** · P2 · `QUAL` · `T` — Le système journalise l'ajout et la modification d'une suite à donner.

**EX-POR-043** · P2 · `ANAT` · `D` — Le système tient pour chaque activité ses suites à donner, avec un
responsable et une échéance.

**Avancement**

**EX-POR-050** · P1 · `ANAT` · `T` — Le système remonte l'avancement d'un dossier à l'activité du plan qu'il
réalise.

**EX-POR-051** · P2 · `MÉTIER` · `T` — Le système réserve le rattachement d'un dossier à une activité du plan
aux gestionnaires du dossier.

### 5.7.6 Écarts — module Portefeuille

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-POR-001 | ❌ | Créé depuis l'accueil, un projet naît avec trois éditeurs que personne n'a choisis, dont la directrice générale | — | S1.6 |
| EX-POR-002 | ❌ | *idem* | — | S1.6 |
| EX-POR-003 | ❌ | La liste « Équipe » n'offre qu'une entrée imposée ; l'accès par défaut est « Toute l'équipe » | — | S1.6 |
| EX-POR-004 | ⚠️ | Le formulaire de « Mon entité » est correct (quatre champs, une case explicite) ; celui de l'accueil ne l'est pas | — | S1.6 |
| EX-POR-006 | ❌ | Un compte « Lecture seule » a déposé un document dans un dossier de projet : le serveur a répondu 200 | `documents.ts` *(à localiser)* | S1.1 |
| EX-POR-007 | ❌ | Il n'existe aucune règle d'écriture sur les documents de dossier | — | S1.1 |
| EX-POR-023 | ❌ | `review()` masque ; `health()` ne passe pas par le masque | `portfolio.ts:198-202`, `227-236` | S1.3 |
| EX-POR-024 | ❌ | « Budget consommé à 125 % » sort à tout lecteur du projet | `portfolio.ts:147-149`, `227-236` | S1.3 |
| EX-POR-040 | ❌ | `update` n'appelle jamais `svc.log` ; une activité confidentielle peut être ouverte puis refermée sans trace | `activities.ts:248-288` | S2.2 |
| EX-POR-041 | ❌ | Aucun avis au nouveau responsable | `activities.ts:248-288` | S2.2 |
| EX-POR-042 | ❌ | `addFollowup` et `setFollowup` ne journalisent pas | `activities.ts:297`, `320` | S2.2 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

## 5.8 Module Tâches — `TAC`

### 5.8.1 Objet

Une **tâche** est une unité de travail confiée à **une** personne, avec une échéance. Elle vit dans un
projet ou dans le registre de son entité (le travail courant, hors projet). Une tâche ne se « valide »
pas : elle se termine.

Mais le module va plus loin que la tâche. Une personne a **une seule liste de ce qu'on lui demande**,
quelle que soit l'origine : tâche de projet, action de réunion, courrier reçu pour traitement, décision à
exécuter. Cette liste — les **charges** — est la raison d'être du module. Si chaque module tient son
propre suivi, personne ne saura où regarder le matin.

### 5.8.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Chargé d'une tâche | La fait, en change l'état, y dépose une pièce, demande un report |
| Chef d'entité | Confie une tâche à un agent de son entité, confirme ou renvoie la clôture |
| Responsable d'une tâche confiée | Celui qui l'a confiée : lui seul retire ou change le chargé |
| Stagiaire | Doit comprendre dès son premier écran ce qu'on attend de lui et à qui demander |
| Consultant | Voit ses tâches et ses livrables attendus |

### 5.8.3 Cycle de vie

```
À FAIRE ──> EN COURS ──> TERMINÉE
                │
                └── tâche confiée : clôture demandée ──> confirmée par le responsable
                                                     └─> renvoyée ──> EN COURS
```

Une charge qui n'est pas une tâche garde le cycle de son module d'origine ; son responsable en change
l'état et y dépose une pièce.

### 5.8.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-TAC-01 | Une tâche est confiée à une seule personne. | `ANAT` |
| RG-TAC-02 | Une tâche vit dans un projet ou dans le registre d'une entité. | `ANAT` |
| RG-TAC-03 | Une personne a une seule liste de charges, quelle que soit l'origine (EX-TRA-040). | `ANAT` |
| RG-TAC-04 | Un courrier reçu pour traitement, une recommandation de réunion et une décision à exécuter créent une charge. | `ANAT` |
| RG-TAC-05 | Une charge qui n'est pas une tâche garde l'objet d'origine comme domicile ; la liste n'en est qu'une vue. | `ANAT` |
| RG-TAC-06 | Seul le responsable d'une tâche confiée la retire ou en change le chargé. | `ANAT` |
| RG-TAC-07 | Un chef confie une tâche à un agent de son entité et des entités rattachées. | `ANAT` |
| RG-TAC-08 | Le même composant de ligne, de tiroir et de formulaire sert tout écran et toute origine. | `QUAL` |
| RG-TAC-09 | Une charge est relancée avant son échéance et signalée en retard. | `ANAT` |

### 5.8.5 Exigences

**La liste unique**

**EX-TAC-001** · P1 · `ANAT` · `D` — Le système place dans la liste d'une personne les tâches de projet et
du registre d'entité qui lui sont confiées.

**EX-TAC-002** · P1 · `ANAT` · `D` — Le système y place les actions décidées en réunion dont elle est
responsable.

**EX-TAC-003** · P1 · `ANAT` · `D` — Le système y place les courriers qu'elle reçoit pour traitement.

**EX-TAC-004** · P1 · `ANAT` · `D` — Le système y place les décisions dont elle est chargée.

**EX-TAC-005** · P1 · `ANAT` · `D` — Le système y place les livrables qu'elle doit produire ou valider.

**EX-TAC-006** · P2 · `MÉTIER` · `D` — Le système ne montre qu'une fois une charge qui lui parvient par deux
voies.

**EX-TAC-007** · P2 · `MÉTIER` · `D` — Le système permet de filtrer la liste par origine.

**Les gestes**

**EX-TAC-010** · P2 · `MÉTIER` · `D` — Le système permet de déplacer une tâche directement en vue
calendrier.

**EX-TAC-011** · P2 · `MÉTIER` · `D` — Le système permet de déplacer une tâche directement en vue tableau.

**EX-TAC-012** · P2 · `MÉTIER` · `D` — Le système permet de changer l'échéance et la priorité d'une tâche
depuis son menu contextuel.

**EX-TAC-013** · P2 · `MÉTIER` · `D` — Le système permet de trier la liste des tâches.

**EX-TAC-014** · P2 · `MÉTIER` · `D` — Le système groupe la vue tableau par état, et non par section de
projet.

**EX-TAC-015** · P2 · `MÉTIER` · `D` — Le système permet de replanifier sept tâches ouvertes en moins de dix
clics.

**EX-TAC-016** · P1 · `QUAL` · `T` — Le système emploie la même ligne, le même tiroir et le même formulaire
de tâche dans tout contexte (voir EX-TRA-070).

**Confier et répondre**

**EX-TAC-020** · P1 · `ANAT` · `T` — Le système permet à un chef de confier une tâche à un agent de son
périmètre.

**EX-TAC-021** · P1 · `ANAT` · `T` — Le système refuse de confier une tâche à une personne hors du
périmètre du chef.

**EX-TAC-022** · P1 · `QUAL` · `T` — Le système ne propose, dans toute liste de personnes, que les personnes
que le serveur acceptera, avec leur fonction (voir EX-TRA-013).

**EX-TAC-023** · P1 · `ANAT` · `T` — Le système réserve au responsable d'une tâche confiée le retrait ou le
changement de son chargé.

**EX-TAC-024** · P2 · `MÉTIER` · `D` — Le système permet au chargé de demander le report d'une échéance.

**EX-TAC-025** · P2 · `MÉTIER` · `D` — Le système permet au responsable de confirmer ou de renvoyer la
clôture d'une tâche confiée.

**EX-TAC-026** · P1 · `ANAT` · `D` — Le système permet au responsable d'une charge d'en changer l'état.

**EX-TAC-027** · P1 · `ANAT` · `D` — Le système permet au responsable d'une charge d'y déposer une pièce.

**Rappels et arrivants**

**EX-TAC-030** · P1 · `ANAT` · `T` — Le système relance le chargé d'une tâche avant son échéance.

**EX-TAC-031** · P1 · `ANAT` · `T` — Le système signale une tâche en retard à son chargé.

**EX-TAC-032** · P1 · `MÉTIER` · `D` — Le système indique, sur chaque charge, à qui s'adresser (voir
EX-ORG-018).

### 5.8.6 Écarts — module Tâches

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-TAC-001 | ✅ | « Mes tâches » porte les tâches | — | F1.7 |
| EX-TAC-002 | ⚠️ | Une recommandation devient tâche quand elle a un dossier de rattachement | `docs/MODELE-INSTITUTIONNEL.md` § 3.2 | M2.7 |
| EX-TAC-003 | ➖ | Aucune charge n'est créée par un courrier | — | M1.4 |
| EX-TAC-004 | ➖ | « Mes tâches » ne porte que les tâches et les livrables | — | F1.7 |
| EX-TAC-005 | ✅ | Les livrables figurent dans « Mes tâches » | — | F1.7 |
| EX-TAC-010 | ❌ | 0 élément déplaçable en vue Calendrier | — | F4.1 |
| EX-TAC-011 | ❌ | 0 élément déplaçable en vue Tableau | — | F4.1 |
| EX-TAC-012 | ❌ | Menu contextuel de 5 entrées, sans échéance ni priorité | — | F4.1 |
| EX-TAC-013 | ❌ | Un seul filtre, aucun tri | — | F4.1 |
| EX-TAC-014 | ❌ | La vue Tableau empile les sections de trois projets en six colonnes de sens différents | — | F4.1 |
| EX-TAC-015 | ❌ | 28 clics pour les 7 tâches ouvertes d'un lundi matin | — | F4.1 |
| EX-TAC-016 | ❌ | La ligne, le tiroir et le formulaire de tâche se comportent différemment selon l'écran | — | F1.6 |
| EX-TAC-022 | ❌ | 17 noms proposés pour une cellule de 2 ; « Imputer » accepte un agent d'ailleurs | — | F3.2 |
| EX-TAC-030 | ⚠️ | Les rappels couvrent les tâches ; aucune relance sur les recommandations de réunion | — | M2.7 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.
Les lignes EX-TAC-001, 005 et 030 reposent sur le dossier d'intervention et les journaux du plan de
travail, non sur une relecture du code.*

---

## 5.9 Module Livrables et consultants — `LIV`

### 5.9.1 Objet

Un **livrable** est un produit attendu, validé par une autre personne que son auteur. Il n'est **jamais
isolé** : il provient d'un travail — une activité, un projet, une mission — et, selon son type, il
obéit à des règles différentes.

**Un livrable porte de l'argent.** Sa validation engage une tranche de paiement à un consultant. Valider
un document qu'on n'a pas vu, puis engager quarante pour cent d'un contrat, n'est pas une gêne
d'ergonomie : c'est un risque financier. Le système est, de fait, dans la chaîne de la dépense.

Le module porte aussi le **contrat de mission** du consultant — termes de référence, échéancier,
montant — et ce que le consultant voit : ce qu'il doit produire, pour quand, et comment le remettre.

### 5.9.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Consultant | Produit, remet ; lit **son** contrat, le plan du projet, ses livrables attendus et remis |
| Valideur | Valide ou rejette ; **n'est jamais l'auteur** |
| Chef d'entité, responsable du projet | Supervise ; voit les engagements de son périmètre |
| Membre du projet | Voit les livrables ; les engagements seulement avec le droit correspondant |
| Direction générale | Voit tout ; son contrat de mission, comme tout acte qui engage l'Agence, se signe par elle |

### 5.9.3 Cycle de vie

```
ATTENDU ──> REMIS ──────────────> VALIDÉ ──> TRANCHE ENGAGÉE ──> PAIEMENT CONSTATÉ
 (type,     (pièce obligatoire)      │         (ex. 40 %)
 rattaché)       │                   │
                 └── REJETÉ ─────────┘  (commentaire ; le consultant corrige et remet)
```

États présentés au consultant : *non traité, validé, rejeté*, et *en retard* lorsque l'échéance est passée.

### 5.9.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-LIV-01 | Un livrable est rattaché à une activité, un projet ou une mission, selon son type. | `ANAT` |
| RG-LIV-02 | Les règles d'un livrable dépendent de son type. *(Liste des types attendue.)* | `ANAT` |
| RG-LIV-03 | Un livrable ne se remet pas sans sa pièce. | `ANAT` |
| RG-LIV-04 | Un livrable ne se valide pas sans sa pièce. | `ANAT` |
| RG-LIV-05 | Un livrable est validé par une autre personne que son auteur. | `MÉTIER` |
| RG-LIV-06 | La validation d'un livrable engage une tranche de paiement. | `ANAT` |
| RG-LIV-07 | Un livrable se corrige tant qu'il n'est pas validé. | `ANAT` |
| RG-LIV-08 | Un contrat de mission se lit par le consultant titulaire, sa hiérarchie, et les membres du projet qui ont le droit d'en voir les engagements ; non par les autres consultants. | `ANAT` |
| RG-LIV-09 | Un montant est un champ sensible : il se masque par fonction. | `QUAL` |
| RG-LIV-10 | Un contrat de mission engage l'Agence : il est signé par la Direction générale. | `LOI` |

### 5.9.5 Exigences

**Rattachement et type**

**EX-LIV-001** · P1 · `ANAT` · `T` — Le système refuse de créer un livrable qui n'est rattaché à rien.

**EX-LIV-002** · P1 · `ANAT` · `T` — Le système exige, pour un livrable, le rattachement que son type
prescrit : activité, projet ou mission.

**EX-LIV-003** · P1 · `ANAT` · `T` — Le système porte, pour chaque livrable, un type pris dans un référentiel
fermé. *(Liste des types attendue des directions : rapport d'étude, cahier des charges, plan, carte,
procès-verbal… à établir.)*

**EX-LIV-004** · P2 · `ANAT` · `T` — Le système applique à chaque type de livrable ses règles propres de
remise et de validation. *(Règles attendues avec la liste des types.)*

**EX-LIV-005** · P2 · `ANAT` · `D` — Le système permet de corriger un livrable tant qu'il n'est pas validé.

**EX-LIV-006** · P2 · `QUAL` · `T` — Le système journalise la correction d'un livrable, avec les valeurs
avant et après.

**Remise**

**EX-LIV-010** · P1 · `ANAT` · `T` — Le système refuse la remise d'un livrable sans fichier.

**EX-LIV-011** · P2 · `MÉTIER` · `D` — Le système présente, pour remettre, une fenêtre de deux champs : le
fichier et un mot au valideur.

**EX-LIV-012** · P1 · `ANAT` · `T` — Le système lie le document remis au livrable et le rend visible au
valideur.

**EX-LIV-013** · P1 · `QUAL` · `D` — Le système laisse visible chez son auteur un livrable remis, avec son
nouvel état.

**EX-LIV-014** · P1 · `QUAL` · `D` — Le système répond à la remise par un message écrit qui la nomme (voir
EX-TRA-050).

**Validation et paiement**

**EX-LIV-020** · P1 · `ANAT` · `T` — Le système refuse la validation d'un livrable sans pièce.

**EX-LIV-021** · P1 · `MÉTIER` · `T` — Le système refuse la validation d'un livrable par son auteur.

**EX-LIV-022** · P1 · `MÉTIER` · `T` — Le système exige un commentaire pour rejeter un livrable.

**EX-LIV-023** · P2 · `MÉTIER` · `T` — Le système informe le consultant de la validation ou du rejet.

**EX-LIV-024** · P2 · `ANAT` · `D` — Le système présente au consultant l'état de chaque livrable soumis :
non traité, validé, rejeté.

**EX-LIV-025** · P1 · `ANAT` · `T` — Le système engage la tranche de paiement liée à un livrable à sa
validation.

**EX-LIV-026** · P1 · `MÉTIER` · `T` — Le système refuse d'engager deux fois la même tranche.

**EX-LIV-027** · P2 · `MÉTIER` · `D` — Le système permet d'enregistrer le paiement constaté d'une tranche.

**EX-LIV-028** · P1 · `QUAL` · `T` — Le système journalise la validation d'un livrable et l'engagement de sa
tranche (voir EX-TRA-007).

**Contrats de mission**

**EX-LIV-030** · P1 · `ANAT` · `D` — Le système permet de rattacher à un projet le contrat d'un consultant,
avec ses termes de référence et son échéancier.

**EX-LIV-031** · P1 · `ANAT` · `T` — Le système réserve la lecture d'un contrat au consultant titulaire, à sa
hiérarchie et aux membres du projet qui ont le droit d'en voir les engagements.

**EX-LIV-032** · P1 · `QUAL` · `T` — Le système refuse à un consultant la lecture du contrat d'un autre
consultant du même projet.

**EX-LIV-033** · P1 · `QUAL` · `I` — Le système déclare la route de lecture d'un contrat au contrat d'accès.

**EX-LIV-034** · P1 · `LOI` · `T` — Le système fait signer un contrat de mission par la Direction générale
(voir EX-SIG-020).

**EX-LIV-035** · P2 · `MÉTIER` · `D` — Le système signale un contrat à l'approche de son terme.

**Ce que voit un consultant**

**EX-LIV-040** · P1 · `ANAT` · `D` — Le système présente au consultant ses tâches, son contrat, le plan de
travail du projet, ses livrables attendus et ses livrables soumis.

**EX-LIV-041** · P1 · `MÉTIER` · `D` — Le système fait remonter sur l'accueil du consultant ses livrables en
retard.

**EX-LIV-042** · P1 · `QUAL` · `T` — Le système limite la lecture des livrables au périmètre de la personne.

### 5.9.6 Écarts — module Livrables

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-LIV-001 | ❌ | Projet, activité de plan et contrat sont les trois facultatifs : un livrable peut n'être lié à rien | — | M3.1 |
| EX-LIV-002 | ❌ | *idem* ; la nature du rattachement ne dépend pas du type | — | M3.1 |
| EX-LIV-003 | ➖ | Aucun type de livrable n'existe | — | M3.4 |
| EX-LIV-004 | ➖ | *idem* | — | M3.4 |
| EX-LIV-005 | ❌ | Le serveur expose PATCH et calcule `can.edit` ; la fiche ne lit que `can.review` et `can.decide` | `ProjectDossier.tsx:323`, `329` | M3.3 |
| EX-LIV-010 | ❌ | La table n'a aucune colonne de fichier ; le consultant remet en deux clics, zéro champ, zéro pièce | `deliverables.ts:248` | S4.1 |
| EX-LIV-011 | ❌ | Aucune fenêtre de remise à deux champs | — | S4.1 |
| EX-LIV-012 | ❌ | Aucun document n'est lié au livrable | `deliverables.ts:248` | S4.1 |
| EX-LIV-013 | ❌ | La ligne disparaît de la liste de celui qui vient de remettre | `ProjectDossier.tsx:861` | F3.1 |
| EX-LIV-014 | ❌ | La remise répond 200 sans un mot, la fenêtre se démonte | `ProjectDossier.tsx:861` | F3.1 |
| EX-LIV-020 | ❌ | Le valideur reçoit un statut et deux événements « sans commentaire », puis engage une tranche — 40 %, 7 200 USD dans la démonstration | — | S4.1 |
| EX-LIV-025 | ✅ | La validation engage bien une tranche de paiement | — | S4.1 |
| EX-LIV-031 | ❌ | Un consultant invité lit intégralement le contrat d'un autre : montant (18 000 USD dans la démonstration), échéancier, termes de référence | `consultants` / `agreements.ts` *(à localiser)* | S1.5 |
| EX-LIV-032 | ❌ | *idem* | *idem* | S1.5 |
| EX-LIV-033 | ❌ | La route ne figure pas au contrat d'accès | — | S1.5 |
| EX-LIV-040 | ⚠️ | Tâches, contrat, plan, livrables : présents en partie ; états « non traité, validé, rejeté » à compléter | — | M3.5 |
| EX-LIV-041 | ❌ | L'accueil annonce « 0 tâche ouverte · Rien à l'horizon » alors qu'un livrable est en retard de la veille | — | F2.2 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi. La
liste des types de livrables est une décision attendue du maître d'ouvrage (M3.4) ; EX-LIV-003 et
EX-LIV-004 ne peuvent être closes avant elle.*

---

## 5.10 Module Partenaires — `PAR`

### 5.10.1 Objet

Le module tient l'annuaire des tiers avec lesquels l'Agence travaille — ministères, bailleurs,
collectivités, entreprises — et les **accords** conclus avec eux : conventions, avenants, pièces. Un accord
engage l'Agence ; il est donc signé par la Direction générale (voir § 5.2) et numéroté à son entrée en
vigueur.

Le module est aussi la porte des **interfaces extérieures** : le ministère de tutelle, la Cour des comptes
et le collège des commissaires aux comptes sont des destinataires, pas des acteurs du système.

### 5.10.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Gestionnaire des partenariats | Tient l'annuaire, prépare les accords, gère les partenaires confidentiels |
| Point focal | Interlocuteur de l'Agence pour un partenaire |
| Direction générale | Signe les accords ; lit les partenaires confidentiels, en lecture seule |
| Cabinet | Lit comme la direction générale ; ne signe pas |
| Agent | Consulte les partenaires et accords de son périmètre |

### 5.10.3 Cycle de vie

```
PARTENAIRE :  ACTIF ⇄ SUSPENDU ──> CLOS    (clôture refusée si un accord est en vigueur)
                  └── fusion ──> fiche absorbée (renvoie vers la fiche gardée, qui doit être ACTIVE)

ACCORD :  PRÉPARATION ──> SIGNATURE ──> EN VIGUEUR ──> RÉSILIÉ | ÉCHU
                              │              │
                              │              └── AVENANT (même cycle ; le parent doit être en vigueur)
                              └── signé par la DG, numéroté à l'entrée en vigueur
```

### 5.10.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-PAR-01 | Il y a un seul annuaire : une fiche par partenaire. | `ANAT` |
| RG-PAR-02 | Un accord engage l'Agence : il est signé par la Direction générale, ou par le DGA en intérim déclaré. | `LOI` |
| RG-PAR-03 | Un accord est numéroté à son entrée en vigueur. | `ANAT` |
| RG-PAR-04 | Un avenant modifie un accord en vigueur ; il ne peut exister sans parent en vigueur. | `ANAT` |
| RG-PAR-05 | Une fiche qui porte un accord en vigueur ne se clôt pas. | `MÉTIER` |
| RG-PAR-06 | Un accord en vigueur n'a pas de partie close ou suspendue. | `MÉTIER` |
| RG-PAR-07 | Un partenaire confidentiel se lit par la direction, en lecture seule, et par ses gestionnaires ; non par un agent. | `ANAT` |
| RG-PAR-08 | La fiche d'un partenaire ne liste que les accords et pièces du périmètre de celui qui la lit. | `QUAL` |
| RG-PAR-09 | Une résiliation traite les avenants en cours. | `MÉTIER` |
| RG-PAR-10 | Le montant d'un accord est un champ sensible. | `QUAL` |

### 5.10.5 Exigences

**Annuaire**

**EX-PAR-001** · P1 · `ANAT` · `T` — Le système tient une seule fiche par partenaire.

**EX-PAR-002** · P1 · `ANAT` · `T` — Le système distingue les états actif, suspendu et clos d'un partenaire.

**EX-PAR-003** · P1 · `MÉTIER` · `T` — Le système refuse de clore une fiche qui porte un accord en vigueur.

**EX-PAR-004** · P1 · `MÉTIER` · `T` — Le système refuse de fusionner vers une fiche qui n'est pas active.

**EX-PAR-005** · P2 · `QUAL` · `T` — Le système journalise une fusion, avec les deux fiches concernées (voir
EX-TRA-007).

**EX-PAR-006** · P1 · `QUAL` · `T` — Le système refuse de lier à un courrier, une réunion ou un accord un
partenaire que l'auteur du lien ne peut pas lire (voir EX-COU-051).

**EX-PAR-007** · P1 · `QUAL` · `T` — Le système réserve la lecture d'un partenaire confidentiel à la
direction et à ses gestionnaires.

**EX-PAR-008** · P1 · `QUAL` · `T` — Le système limite la fiche d'un partenaire aux accords et aux pièces du
périmètre de la personne.

**EX-PAR-009** · P2 · `MÉTIER` · `D` — Le système retrouve un partenaire par la recherche générale.

**EX-PAR-010** · P2 · `MÉTIER` · `D` — Le système tient pour chaque partenaire ses contacts et un point focal.

**EX-PAR-011** · P2 · `QUAL` · `T` — Le système refuse une date antérieure à 1900 ou un montant hors bornes
dans un accord, par une erreur de saisie et non par une erreur serveur.

**Accords et avenants**

**EX-PAR-020** · P1 · `ANAT` · `D` — Le système enregistre un accord avec ses parties, son objet, ses dates,
son montant et sa devise.

**EX-PAR-021** · P1 · `ANAT` · `T` — Le système numérote un accord à son entrée en vigueur (voir
EX-TRA-001).

**EX-PAR-022** · P1 · `LOI` · `T` — Le système fait signer un accord par la Direction générale (voir
EX-SIG-020).

**EX-PAR-023** · P2 · `ANAT` · `I` — Le système nomme « Signé par » la personne qui signe un accord.

**EX-PAR-024** · P1 · `MÉTIER` · `T` — Le système refuse l'entrée en vigueur d'un accord dont une partie
n'est pas active.

**EX-PAR-025** · P1 · `MÉTIER` · `T` — Le système refuse l'entrée en vigueur d'un avenant dont l'accord
parent n'est pas en vigueur.

**EX-PAR-026** · P1 · `MÉTIER` · `T` — Le système traite les avenants en circuit lorsqu'un accord est
résilié : il refuse la résiliation, ou retire l'avenant du circuit avec un motif.

**EX-PAR-027** · P1 · `MÉTIER` · `T` — Le système remet en préparation, avec un message explicite, un avenant
dont le parent cesse d'être en vigueur avant sa signature.

**EX-PAR-028** · P1 · `MÉTIER` · `D` — Le système permet de supprimer ou de rejeter un avenant au signataire,
avec un motif.

**EX-PAR-029** · P1 · `QUAL` · `T` — Le système journalise l'entrée en vigueur, l'avenant et la résiliation
d'un accord (voir EX-TRA-007).

**EX-PAR-030** · P2 · `MÉTIER` · `D` — Le système signale un accord à l'approche de son échéance.

**EX-PAR-031** · P2 · `QUAL` · `T` — Le système masque le montant d'un accord à la personne qui n'en a pas le
droit (voir EX-TRA-010).

### 5.10.6 Écarts — module Partenaires

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-PAR-003 | ✅ | `setState` refuse de clore une fiche qui porte un accord en vigueur | `partners.ts:726-735` | — |
| EX-PAR-004 | ❌ | `merge` transfère les parties vers la fiche gardée sans regarder son état | `partners.ts:804-888`, `810` | S4.5 |
| EX-PAR-006 | ❌ | Un partenaire confidentiel figure dans la liste et son nom est livré, puis le lien est refusé | `partner-links.ts:30-40` | M1 |
| EX-PAR-009 | ❌ | La recherche ne couvre ni partenaires ni accords | `services.ts:2772` | F3.6 |
| EX-PAR-023 | ❌ | « Signataire » désigne déjà la personne dans l'écran des accords | `Agreements.tsx:893` | F5.2 |
| EX-PAR-024 | ✅ | `activate()` refuse une partie close ou suspendue | `agreements.ts:667-669` | — |
| EX-PAR-025 | ⚠️ | Le contrôle du parent n'a lieu qu'à la signature, après que la DG a signé | `agreements.ts:569-574`, `681` | S3.1 |
| EX-PAR-026 | ❌ | `terminate()` ne regarde pas les avenants en cours | `agreements.ts:780-810` | S3.1 |
| EX-PAR-027 | ❌ | L'avenant reste au statut `signature` ; la DG a signé un acte sans effet | `agreements.ts:681` | S3.1 |
| EX-PAR-028 | ❌ | `update`, `sign`, `activate` et `remove` exigent `preparation` : l'avenant ne peut être ni supprimé ni rejeté | `agreements.ts:477`, `550`, `578`, `647` | S3.1 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

## 5.11 Module Risques et indicateurs — `RIS`

### 5.11.1 Objet

Le module tient le registre des risques de l'Agence — chacun avec sa probabilité, son impact, sa
portée, son responsable et sa parade — et les indicateurs qui en mesurent la tenue. Une entité suit ses
propres risques sans demander la permission de la direction générale ; la direction générale lit
l'ensemble.

### 5.11.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Responsable d'un risque | Met à jour la parade et l'état |
| Chef d'entité | Déclare et suit les risques de son entité et des projets de son périmètre |
| Directrice générale, DGA | Lisent tout le registre ; seuls habilités aux risques « Agence entière » |
| Détenteur du droit sur les indicateurs | Définit les indicateurs et en saisit les mesures (droit distinct, direction générale et DGA) |
| Agent | Voit ses risques et ceux de ses activités |

### 5.11.3 Cycle de vie

```
IDENTIFIÉ ──> EN TRAITEMENT ──> MITIGÉ ──> CLOS
 (portée,       (parade écrite,    (au moins       (non modifiable)
  responsable)   échéance relancée)  une mesure)
```

### 5.11.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-RIS-01 | Un risque a une portée : une entité, un projet, ou l'Agence entière. | `ANAT` |
| RG-RIS-02 | La portée d'un risque se limite à ce que son auteur peut exercer ; un chef de cellule ne crée pas de risque « Agence entière ». | `ANAT` |
| RG-RIS-03 | Un risque a un responsable. | `MÉTIER` |
| RG-RIS-04 | Une parade a une échéance, et cette échéance se relance. | `MÉTIER` |
| RG-RIS-05 | Un risque mitigé porte au moins une mesure. | `MÉTIER` |
| RG-RIS-06 | Un risque clos ne se modifie plus. | `MÉTIER` |
| RG-RIS-07 | Le registre ne s'ouvre pas aux projets privés hors du cercle du projet. | `QUAL` |
| RG-RIS-08 | Un indicateur se calcule quand sa source est dans le système ; il se saisit sinon. | `MÉTIER` |
| RG-RIS-09 | Le droit sur les indicateurs est distinct du droit sur les risques. | `ANAT` |

### 5.11.5 Exigences

**Déclarer et suivre un risque**

**EX-RIS-001** · P1 · `MÉTIER` · `D` — Le système permet de déclarer un risque avec sa probabilité, son
impact, sa portée et son responsable.

**EX-RIS-002** · P1 · `ANAT` · `D` — Le système ne propose à une personne que les portées qu'elle peut
exercer (voir EX-ACT-006).

**EX-RIS-003** · P1 · `ANAT` · `T` — Le système refuse à un chef d'entité un risque de portée « Agence
entière ».

**EX-RIS-004** · P1 · `QUAL` · `T` — Le système limite la lecture du registre aux entités et aux projets que
la personne peut lire.

**EX-RIS-005** · P1 · `QUAL` · `T` — Le système exclut du registre commun les risques d'un projet privé.

**EX-RIS-006** · P1 · `ANAT` · `D` — Le système permet au responsable d'un risque de mettre à jour sa parade
et son état.

**EX-RIS-007** · P2 · `MÉTIER` · `A` — Le système calcule la criticité d'un risque à partir de sa
probabilité et de son impact.

**EX-RIS-008** · P2 · `MÉTIER` · `D` — Le système présente la matrice des risques de son périmètre à la
direction générale.

**EX-RIS-009** · P1 · `QUAL` · `T` — Le système journalise le changement de responsable, de cotation et de
clôture d'un risque (voir EX-TRA-007).

**Parade et échéance**

**EX-RIS-010** · P1 · `MÉTIER` · `D` — Le système permet de saisir l'échéance d'une parade sur la fiche du
risque.

**EX-RIS-011** · P1 · `MÉTIER` · `D` — Le système affiche l'échéance de la parade sur la fiche du risque.

**EX-RIS-012** · P1 · `MÉTIER` · `T` — Le système relance le responsable d'un risque avant l'échéance de sa
parade.

**EX-RIS-013** · P2 · `MÉTIER` · `T` — Le système refuse de marquer mitigé un risque qui ne porte aucune
mesure.

**EX-RIS-014** · P2 · `MÉTIER` · `T` — Le système refuse la modification d'un risque clos.

**Indicateurs**

**EX-RIS-020** · P1 · `MÉTIER` · `D` — Le système permet de définir un indicateur avec son unité, sa cible et
sa source.

**EX-RIS-021** · P1 · `QUAL` · `T` — Le système refuse une date de mesure qui n'existe pas par un message de
saisie, et non par une erreur serveur.

**EX-RIS-022** · P2 · `MÉTIER` · `T` — Le système refuse une mesure sans date de mesure.

**EX-RIS-023** · P2 · `MÉTIER` · `T` — Le système calcule un indicateur depuis sa source lorsque celle-ci est
dans le système.

**EX-RIS-024** · P2 · `ANAT` · `T` — Le système réserve la gestion des indicateurs aux détenteurs du droit
distinct qui leur est attaché.

### 5.11.6 Écarts — module Risques

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-RIS-002 | ❌ | L'interface lit le droit, jamais l'étendue : un risque « Agence entière » est proposé à un chef de cellule, et l'aide du champ l'y invite | — | H5 |
| EX-RIS-003 | ❌ | *idem* | — | H5 |
| EX-RIS-010 | ❌ | `mitigation_due_on` est porté, validé et renvoyé, mais absent de l'interface | `registers.ts:613`, `641` | F2.4 |
| EX-RIS-011 | ❌ | *idem* | `registers.ts:613`, `641` | F2.4 |
| EX-RIS-012 | ➖ | `reminders.ts` n'a aucune source « risque » : une parade écrite n'est jamais relancée | — | F2.4 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

## 5.12 Module Ressources humaines — `RH`

### 5.12.1 Objet

Le module tient le dossier de chaque agent, les arrivées et les sorties, les congés et les absences, les
intérims. Il porte les **données les plus protégées** du système : dossiers personnels, contrats, santé.
Il ne remplace ni la paie ni la comptabilité (voir § 2.2) ; il en est l'amont.

Le principe qui le gouverne : **ce qu'on sait d'une personne ne sort pas du cercle de ceux qui doivent le
savoir**. Le secret médical est la catégorie la plus fermée : même la hiérarchie et la direction générale
voient « absence » et des dates, jamais la nature ni le motif.

### 5.12.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Service des ressources humaines | Tient les dossiers, pose les sorties, lit le détail d'un congé |
| Agent | Lit son propre dossier ; demande ses congés ; désigne son intérimaire |
| Chef d'entité | Décide les congés de son équipe ; lit la partie administrative du dossier de ses agents |
| Directrice générale, DGA | Lisent ; décident quand aucun chef n'existe au-dessus de la demande |
| Intérimaire | Remplace l'agent pendant son congé ; ne sait rien de sa nature |
| Responsable informatique | Crée les comptes ; **ne lit ni dossiers RH ni pilotage** |

### 5.12.3 Cycle de vie

Trois cycles.

```
AGENT :    ARRIVÉE ──> INVITÉ ──> ACTIF ──> SORTIE POSÉE ──> SORTI
           (contrôles)  (compte)              │  ▲
                                              └──┘ annulation (motif, journal)

CONGÉ :    DEMANDÉ ──> APPROUVÉ ──> PRIS
                  └──> REFUSÉ
           (décideur : ni l'auteur ni le saisisseur ; à défaut de chef, la DG)

ABSENCE :  affichée « absence » + dates ; nature et motif d'un congé de maladie : agent et RH seulement
```

### 5.12.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-RH-01 | Tout agent a un dossier et un compte ; un consultant a un compte, sans dossier d'agent. | `ANAT` |
| RG-RH-02 | Un contractuel, un stagiaire et un consultant ont une date de fin. | `ANAT` |
| RG-RH-03 | Une arrivée se contrôle en entier avant que quoi que ce soit soit créé. | `MÉTIER` |
| RG-RH-04 | Une sortie suspend le compte, révoque les sessions, clôt l'affectation et règle les congés et les intérims de l'agent. | `ANAT` |
| RG-RH-05 | Une sortie posée par erreur s'annule, avec un motif et une trace. | `MÉTIER` |
| RG-RH-06 | La nature et le motif d'un congé de maladie ne sont lisibles que de l'agent et du service RH. | `LOI` |
| RG-RH-07 | Un jour de congé est un jour ouvré qui n'est pas férié ; les jours fériés de l'Agence sont un référentiel. | `ANAT` |
| RG-RH-08 | Chaque nature de congé a un droit annuel ; une demande qui le dépasse est refusée. | `ANAT` |
| RG-RH-09 | Le décideur d'un congé n'est ni son auteur ni son saisisseur ; sans décideur, la demande remonte à la direction générale. | `MÉTIER` |
| RG-RH-10 | Le décideur se détermine à la lecture, non à la création. | `MÉTIER` |
| RG-RH-11 | Les notes et évaluations RH sont réservées au service RH. | `ANAT` |
| RG-RH-12 | L'annuaire n'expose que les informations professionnelles : nom, fonction, entité, adresse professionnelle. | `QUAL` |

### 5.12.5 Exigences

**Le dossier et l'arrivée**

**EX-RH-001** · P1 · `ANAT` · `D` — Le système tient pour chaque agent un dossier portant son identité, sa
fonction, son entité, son affectation et son contrat.

**EX-RH-002** · P1 · `ANAT` · `T` — Le système refuse l'arrivée d'un contractuel, d'un stagiaire ou d'un
consultant sans date de fin.

**EX-RH-003** · P1 · `MÉTIER` · `T` — Le système n'enrôle un agent qu'après tous les contrôles d'arrivée.

**EX-RH-004** · P1 · `MÉTIER` · `T` — Le système ne laisse, après une arrivée refusée, ni compte créé, ni
membre ajouté, ni avis parti.

**EX-RH-005** · P2 · `QUAL` · `D` — Le système offre un seul chemin pour faire entrer une personne : le
formulaire qui demande l'entité et la fonction.

**EX-RH-006** · P2 · `QUAL` · `D` — Le système annonce, à la création d'un compte, la seconde étape qui
restera à accomplir.

**EX-RH-007** · P2 · `QUAL` · `D` — Le système réaffiche l'entité et la fonction d'une invitation en
attente, et permet de les corriger.

**EX-RH-008** · P1 · `ANAT` · `T` — Le système réserve la modification des notes et évaluations RH au service
RH.

**EX-RH-009** · P1 · `ANAT` · `T` — Le système limite la lecture d'un chef à la partie administrative du
dossier de ses agents.

**EX-RH-010** · P2 · `QUAL` · `T` — Le système n'expose dans l'annuaire que les informations professionnelles.

**EX-RH-011** · P2 · `MÉTIER` · `D` — Le système signale à l'approche de leur terme, à 90 puis 30 jours, les
contrats des agents.

**La sortie**

**EX-RH-020** · P1 · `ANAT` · `D` — Le système permet au service RH de poser la date de sortie d'un agent.

**EX-RH-021** · P1 · `ANAT` · `T` — Le système suspend le compte, révoque les sessions et clôt l'affectation
d'un agent sorti.

**EX-RH-022** · P1 · `MÉTIER` · `T` — Le système refuse, avec un motif, les demandes de congé en cours d'un
agent sorti.

**EX-RH-023** · P1 · `MÉTIER` · `T` — Le système retire ou réaffecte les intérims que tenait un agent sorti.

**EX-RH-024** · P1 · `MÉTIER` · `T` — Le système permet d'annuler une sortie, avec un motif obligatoire.

**EX-RH-025** · P1 · `MÉTIER` · `T` — Le système rouvre le compte et l'affectation d'un agent dont la sortie
est annulée.

**EX-RH-026** · P1 · `QUAL` · `T` — Le système journalise la pose et l'annulation d'une sortie (voir
EX-TRA-007).

**EX-RH-027** · P2 · `QUAL` · `T` — Le système refuse la sortie du dernier administrateur du système.

**Les congés**

**EX-RH-030** · P1 · `ANAT` · `D` — Le système permet à un agent de demander un congé, avec sa nature, ses
dates et, s'il y a lieu, un motif.

**EX-RH-031** · P1 · `QUAL` · `T` — Le système refuse une date qui n'existe pas par un message de saisie, et
non par une erreur serveur.

**EX-RH-032** · P1 · `QUAL` · `T` — Le système borne la durée d'une demande de congé.

**EX-RH-033** · P1 · `ANAT` · `T` — Le système exclut du décompte les jours fériés de l'Agence.

**EX-RH-034** · P1 · `ANAT` · `A` — Le système tient les jours fériés de l'Agence dans un référentiel.

**EX-RH-035** · P1 · `ANAT` · `T` — Le système tient un droit annuel par nature de congé.

**EX-RH-036** · P1 · `ANAT` · `T` — Le système refuse une demande qui dépasse le solde de sa nature, en
indiquant le solde restant.

**EX-RH-037** · P1 · `MÉTIER` · `T` — Le système refuse une demande dont le décompte est de zéro jour.

**EX-RH-038** · P2 · `MÉTIER` · `T` — Le système répartit sur leurs exercices respectifs les jours d'une
demande qui chevauche deux exercices.

**EX-RH-039** · P1 · `MÉTIER` · `T` — Le système refuse qu'un auteur ou un saisisseur décide sa propre
demande.

**EX-RH-040** · P1 · `MÉTIER` · `T` — Le système remonte à la direction générale une demande qui n'a aucun
décideur possible.

**EX-RH-041** · P1 · `MÉTIER` · `T` — Le système recalcule le décideur d'une demande à la lecture lorsque le
chef a changé.

**EX-RH-042** · P2 · `MÉTIER` · `D` — Le système permet à un agent de désigner son intérimaire pour la durée
d'un congé.

**Le secret médical**

**EX-RH-050** · P1 · `LOI` · `T` — Le système n'écrit ni la nature ni le motif d'un congé de maladie dans
aucune notification, quel qu'en soit le destinataire, autre que l'agent et le service RH (voir EX-TRA-012).

**EX-RH-051** · P1 · `LOI` · `T` — Le système n'écrit ni la nature ni le motif d'un congé de maladie dans la
valeur de retour d'une écriture.

**EX-RH-052** · P1 · `LOI` · `T` — Le système n'écrit ni la nature ni le motif d'un congé de maladie dans un
export.

**EX-RH-053** · P1 · `LOI` · `T` — Le système n'écrit ni la nature ni le motif d'un congé de maladie dans le
journal d'administration.

**EX-RH-054** · P1 · `LOI` · `T` — Le système intitule « demande une absence » l'avis d'un congé de maladie
adressé au chef.

**EX-RH-055** · P1 · `LOI` · `T` — Le système ne nomme pas la nature du congé à l'intérimaire.

**EX-RH-056** · P1 · `LOI` · `T` — Le système montre à toute autre personne « absence » et les dates seules.

### 5.12.6 Écarts — module Ressources humaines

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-RH-003 | ❌ | `enrolAgent` crée compte, lien et membre et prévient les administrateurs **avant** les contrôles | `hr.ts:344`, `360-371`, `373-376`, `378`, `380`, `384` | S3.3 |
| EX-RH-004 | ❌ | *idem* ; la transaction du dossier ne commence qu'en 384 | `hr.ts:384` | S3.3 |
| EX-RH-005 | ❌ | Deux formulaires d'arrivée : 5 champs en `/admin`, 3 en `/org`, le second sans entité ni fonction | — | F1.5 |
| EX-RH-006 | ❌ | 7 clics et 5 champs, puis la personne est absente de tous les sélecteurs jusqu'à son activation : un second passage qu'aucun texte n'annonce | — | F4.3 |
| EX-RH-007 | ❌ | `/api/org/invitations` ne rend ni `unit_id` ni `title` | — | F4.3 |
| EX-RH-021 | ✅ | `applyExit` suspend le compte, révoque les sessions et clôt l'affectation | — | S3.2 |
| EX-RH-022 | ❌ | `applyExit` ne touche pas à `agent_leaves` : les demandes restent ouvertes chez un chef | — | S3.2 |
| EX-RH-023 | ❌ | L'agent sorti reste intérimaire d'autres personnes | — | S3.2 |
| EX-RH-024 | ➖ | Une seule route de sortie ; `exit()` lève 409 si `exit_on` est déjà posé ; aucune annulation | — | S3.2 |
| EX-RH-025 | ➖ | *idem* | — | S3.2 |
| EX-RH-031 | ❌ | Une expression régulière seulement : « 2026-02-31 » atteint l'INSERT et la base répond 500 | `leaves.ts:40` | S4.2 |
| EX-RH-032 | ❌ | `workingDays` boucle jour par jour sans borne : `0001-01-01` à `9999-12-31` fait des millions d'itérations | `services.ts:211-218` | S4.2 |
| EX-RH-033 | ❌ | Tous les lundis-vendredis comptent, sans jours fériés | `services.ts:211-218` | S4.2 |
| EX-RH-034 | ➖ | Aucun référentiel de jours fériés | — | S4.2 |
| EX-RH-035 | ➖ | Aucun droit annuel par nature de congé | — | S4.2 |
| EX-RH-036 | ❌ | Aucun plafond de solde | `leaves.ts:200-206` | S4.2 |
| EX-RH-037 | ❌ | Une demande du samedi au dimanche donne `days = 0` et passe | `leaves.ts:269` | S4.2 |
| EX-RH-038 | ❌ | `taken` ne compte que par année de début | `leaves.ts:200-206` | S4.2 |
| EX-RH-039 | ✅ | `canDecide` exclut l'auteur et le saisisseur | `leaves.ts:150-155` | — |
| EX-RH-040 | ❌ | `to !== actorId` retire le demandeur ; s'il est le seul détenteur de `hr.manage`, personne ne reçoit rien | `leaves.ts:296-297` | S4.4 |
| EX-RH-041 | ❌ | `approver_id` est figé à la création et jamais recalculé | `leaves.ts:256` | S4.4 |
| EX-RH-050 | ❌ | L'avis au chef écrit le type dans son titre et le motif en clair dans son corps | `leaves.ts:296-303` | S1.2 |
| EX-RH-051 | ❌ | `decide()` renvoie la ligne non masquée | `leaves.ts:335-349` | S1.2 |
| EX-RH-054 | ❌ | Le titre de l'avis nomme le type | `leaves.ts:296-303` | S1.2 |
| EX-RH-055 | ❌ | `notifyInterim` nomme le type à l'intérimaire | `leaves.ts:309-318` | S1.2 |
| EX-RH-056 | ⚠️ | Le masque couvre `get`, `list` et `summary`, pas les autres voies | `leaves.ts:94-100` | S1.2 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi. Les
exports (EX-RH-052) et le journal d'administration (EX-RH-053) n'ont pas été vérifiés.*

---

## 5.13 Module Organisation — `ORG`

### 5.13.1 Objet

Le module tient la forme de l'Agence : ses entités, leurs types, leurs chefs, leurs équipes, les
personnes qui y sont affectées, et l'étendue de ce que chacun peut exercer. Cette forme n'est pas un
organigramme décoratif : elle commande l'autonomie des entités, le périmètre des chefs et le fuseau
horaire.

La direction générale est tenue par une directrice générale et **un** directeur général adjoint. Quatre
services lui sont rattachés ; les directions centrales ont sous elles des divisions et des bureaux ;
l'Agence est présente dans le pays par six **pools** territoriaux, chacun dirigé par un **directeur de
pool**. Le Conseil d'administration et le collège des commissaires aux comptes ne sont **pas** outillés :
leurs actes entrent, ils n'y délibèrent pas.

### 5.13.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Responsable informatique | Administre la structure : crée, rattache, nomme les chefs, gère les fonctions et les types |
| Service RH | Affecte les personnes ; tient leurs dossiers (voir § 5.12) |
| Chef d'entité, directeur de pool | Dirige son entité et les entités rattachées ; gère son équipe |
| Directrice générale | Lit toute la structure |
| Agent, stagiaire | Lit son entité, son responsable, l'annuaire professionnel |

### 5.13.3 Cycle de vie

La structure est un arbre ; elle n'a pas d'états. Seul l'arrivant a un cycle (voir § 5.12.3).

```
Agence (institution)
 └─ Direction générale ── DG, DGA ── Secrétariat de direction, Cellule de communication,
 │                                    Cellule NTIC, Cellule de conformité
 ├─ Directions centrales ── directeur ── Divisions ── Bureaux
 └─ Pools territoriaux (6) ── directeur de pool ── Représentations provinciales, Antennes
```

### 5.13.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-ORG-01 | La structure est un arbre d'entités dont la racine est l'institution. | `ANAT` |
| RG-ORG-02 | Le type d'une entité se prend dans un référentiel fermé. | `ANAT` |
| RG-ORG-03 | Il y a un seul directeur général adjoint. | `ANAT` |
| RG-ORG-04 | Chaque entité a un chef ; une entité de type pool a un directeur de pool. | `ANAT` |
| RG-ORG-05 | On ne nomme chef qu'une personne dont le profil le permet. | `ANAT` |
| RG-ORG-06 | Nul ne se nomme chef de son propre chef ; nul ne remplace un chef de rang supérieur. | `QUAL` |
| RG-ORG-07 | Un chef d'entité se limite à son entité, aux entités rattachées et aux endroits où il a été invité. | `ANAT` |
| RG-ORG-08 | Le périmètre est une dimension distincte du droit : avoir un droit ne dit pas pour quelle entité. | `ANAT` |
| RG-ORG-09 | Une entité est autonome dans son fonctionnement : ce qui se décide dans une entité se décide dans cette entité. | `ANAT` |
| RG-ORG-10 | Le fuseau horaire se porte par l'institution et se surcharge par l'entité. | `ANAT` |
| RG-ORG-11 | Le Conseil d'administration et le collège des commissaires aux comptes ne sont pas outillés. | `LOI` |
| RG-ORG-12 | Une équipe est un groupe de travail transversal ; ce n'est pas une entité. | `ANAT` |

### 5.13.5 Exigences

**Types d'entité et fonctions**

**EX-ORG-001** · P1 · `ANAT` · `T` — Le système tient les types d'entité dans un référentiel fermé, modifiable
dans les paramètres sans toucher au code.

**EX-ORG-002** · P1 · `ANAT` · `T` — Le système offre le type d'entité *Division*.

**EX-ORG-003** · P1 · `ANAT` · `T` — Le système offre le type d'entité *Bureau*.

**EX-ORG-004** · P1 · `ANAT` · `T` — Le système offre le type d'entité *Pool*.

**EX-ORG-005** · P1 · `ANAT` · `T` — Le système offre la fonction de *directeur de pool*.

**EX-ORG-006** · P1 · `ANAT` · `T` — Le système refuse un second directeur général adjoint.

**EX-ORG-007** · P2 · `ANAT` · `A` — Le système n'offre au catalogue des profils qu'un seul profil de
directeur général adjoint.

**Structure**

**EX-ORG-010** · P1 · `ANAT` · `T` — Le système rattache une entité à une entité parente unique.

**EX-ORG-011** · P1 · `QUAL` · `T` — Le système refuse un rattachement qui crée un cycle.

**EX-ORG-012** · P1 · `ANAT` · `D` — Le système permet au responsable informatique de créer, renommer et
rattacher les entités.

**EX-ORG-013** · P1 · `ANAT` · `T` — Le système refuse de nommer chef d'entité une personne dont le profil
ne le permet pas.

**EX-ORG-014** · P1 · `QUAL` · `T` — Le système refuse qu'une personne se nomme chef d'entité.

**EX-ORG-015** · P1 · `QUAL` · `T` — Le système refuse de remplacer un chef de rang supérieur.

**EX-ORG-016** · P1 · `QUAL` · `D` — Le système ne propose, dans le sélecteur de chef d'entité, que des
personnes que le serveur acceptera (voir EX-TRA-013).

**EX-ORG-017** · P1 · `MÉTIER` · `T` — Le système compte le responsable d'une entité parmi ses membres.

**EX-ORG-018** · P1 · `MÉTIER` · `D` — Le système nomme le responsable en tête de l'écran d'entité, avec un
moyen de le joindre.

**EX-ORG-019** · P2 · `MÉTIER` · `D` — Le système permet de désigner l'intérimaire d'un chef d'entité.

**Périmètre**

**EX-ORG-030** · P1 · `ANAT` · `T` — Le système contrôle l'étendue d'un droit comme il contrôle le droit
lui-même (voir EX-ACT-006).

**EX-ORG-031** · P1 · `ANAT` · `D` — Le système n'offre à un chef d'entité, dans ses formulaires, que les
entités de son périmètre.

**EX-ORG-032** · P2 · `ANAT` · `D` — Le système permet d'inviter une personne dans une entité ou un espace
pour étendre son périmètre.

**Fuseau**

**EX-ORG-040** · P1 · `ANAT` · `T` — Le système porte un fuseau horaire pour l'institution.

**EX-ORG-041** · P1 · `ANAT` · `T` — Le système permet de surcharger le fuseau pour une entité.

**EX-ORG-042** · P1 · `ANAT` · `T` — Le système calcule « aujourd'hui », « en retard » et « cette semaine »
dans le fuseau de l'entité concernée (voir EX-TRA-024).

**Équipes et personnes**

**EX-ORG-050** · P2 · `ANAT` · `D` — Le système permet de constituer une équipe transversale qui réunit des
agents de plusieurs entités.

**EX-ORG-051** · P2 · `ANAT` · `T` — Le système permet au responsable d'une équipe de la gérer.

**EX-ORG-052** · P1 · `MÉTIER` · `D` — Le système dit à un arrivant, sur son premier écran, ce qu'on attend
de lui et à qui il s'adresse.

**EX-ORG-053** · P2 · `QUAL` · `D` — Le système distingue visiblement une équipe d'une entité.

**EX-ORG-054** · P2 · `ANAT` · `I` — Le système n'offre aucun écran de délibération du Conseil
d'administration ni du collège des commissaires aux comptes.

### 5.13.6 Écarts — module Organisation

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-ORG-002 | ➖ | Le référentiel ne connaît ni Division ni Bureau, alors que le secrétariat est une division de la direction générale | `referentials.ts:118-140` | H3 |
| EX-ORG-003 | ➖ | *idem* | `referentials.ts:118-140` | H3 |
| EX-ORG-004 | ➖ | Le référentiel connaît Institution, Direction générale, Direction, Département, Service, Cellule, Représentation provinciale, Antenne : pas Pool | `referentials.ts:118-140` | — |
| EX-ORG-005 | ➖ | Les fonctions à nommer sont directeur, chef de cellule, directeur de pool ; la dernière n'existe pas | — | — |
| EX-ORG-007 | ❌ | Les profils du catalogue doivent refléter l'unicité du DGA | — | — |
| EX-ORG-013 | ✅ | Le refus existe côté serveur | — | F3.2 |
| EX-ORG-016 | ❌ | Le sélecteur de chef d'entité propose 17 personnes dont 5 seront refusées : 29 % de choix voués au refus | — | F3.2 |
| EX-ORG-018 | ❌ | L'écran d'entité ne nomme jamais son responsable, alors que `/api/units/:id/board` renvoie `unit.manager_id` | — | F2.3 |
| EX-ORG-019 | ➖ | L'intérim d'un chef d'entité manque | `docs/MODELE-INSTITUTIONNEL.md` § 5 | — |
| EX-ORG-030 | ❌ | L'interface lit le droit, jamais l'étendue | — | H5 |
| EX-ORG-040 | ➖ | Aucun fuseau n'existe | `services.ts:181-183` | S5.2 |
| EX-ORG-041 | ➖ | *idem* ; l'Agence a pourtant des représentations provinciales et des antennes | — | S5.2 |
| EX-ORG-042 | ❌ | `localDate()` lit l'horloge de la machine : à 00 h 30 à Kinshasa, un serveur en UTC date de la veille | `services.ts:181-183` | S5.1, S5.2 |
| EX-ORG-052 | ❌ | Un stagiaire ne sait pas à qui demander | — | F2.3 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

## 5.14 Module Administration — `ADM`

### 5.14.1 Objet

Le module administre l'outil : comptes, demandes d'accès, profils et droits, messagerie, paramètres et
référentiels, journal d'audit. Son principe est la **séparation des fonctions** : piloter (direction
générale), administrer la plateforme (responsable informatique), gérer les personnes (RH) sont trois
fonctions distinctes, et aucune ne donne accès aux données des deux autres.

La directrice générale est propriétaire du système et ne règle ni la messagerie ni les profils. Le
responsable informatique administre l'outil, et ne voit ni le pilotage, ni les décisions, ni le courrier
confidentiel. Un compte peut cumuler tous les pouvoirs techniques et peu de droits métier, et
l'inverse.

### 5.14.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Responsable informatique | Crée les comptes, administre profils, structure, messagerie, règles IA. **Aucun droit métier de direction** |
| Administrateur système | État du système, sessions, journal d'audit |
| Directrice générale | Relit le journal des administrateurs ; **ne règle pas** la messagerie ni les profils |
| Service RH | Lit les demandes d'accès d'agents ; tient les dossiers (voir § 5.12) |
| Demandeur d'accès | Demande un compte ; en reçoit la réponse |

### 5.14.3 Cycle de vie

```
DEMANDE D'ACCÈS ──> APPROUVÉE ──> INVITÉ ──> ACTIF ⇄ SUSPENDU ──> SORTI
        │                                                   (voir 5.12)
        └──> REFUSÉE (motif ; avis à la personne)
```

### 5.14.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-ADM-01 | Les droits d'une personne découlent de son profil de fonction, non de son rang technique (EX-ACT-001). | `ANAT` |
| RG-ADM-02 | Nul ne s'accorde un droit ni ne change son propre profil. | `QUAL` |
| RG-ADM-03 | Tout droit sensible accordé est signalé à qui relit le journal des administrateurs. | `QUAL` |
| RG-ADM-04 | Un administrateur ne connaît jamais le mot de passe d'autrui et ne reçoit pas le lien d'activation d'un compte de rang supérieur. | `QUAL` |
| RG-ADM-05 | Une demande d'accès est approuvée ou refusée ; elle ne reste pas en attente indéfiniment. | `MÉTIER` |
| RG-ADM-06 | Un compte suspendu ne se connecte pas. | `QUAL` |
| RG-ADM-07 | Tout acte d'administration est journalisé, et seulement une fois exécuté (EX-TRA-006). | `QUAL` |
| RG-ADM-08 | La liste des genres d'actes journalisés s'allonge ; elle ne raccourcit jamais. | `ANAT` |
| RG-ADM-09 | Le journal d'administration ne porte aucun contenu de dossier RH. | `QUAL` |
| RG-ADM-10 | Un référentiel fermé ne s'allonge que par son gestionnaire. | `QUAL` |

### 5.14.5 Exigences

**Comptes et accès**

**EX-ADM-001** · P1 · `ANAT` · `D` — Le système permet d'approuver une demande d'accès.

**EX-ADM-002** · P1 · `MÉTIER` · `D` — Le système permet de refuser une demande d'accès, avec un motif.

**EX-ADM-003** · P1 · `MÉTIER` · `T` — Le système informe la personne dont la demande d'accès est refusée.

**EX-ADM-004** · P2 · `MÉTIER` · `D` — Le système signale à l'administrateur les demandes d'accès qui
attendent.

**EX-ADM-005** · P1 · `QUAL` · `T` — Le système refuse la connexion d'un compte suspendu.

**EX-ADM-006** · P1 · `QUAL` · `T` — Le système ne remet à un administrateur ni le mot de passe, ni le lien
de réinitialisation d'un autre compte.

**EX-ADM-007** · P1 · `QUAL` · `T` — Le système refuse à un administrateur d'attribuer un profil supérieur
à ce qu'il peut lui-même attribuer.

**Profils et droits**

**EX-ADM-010** · P1 · `ANAT` · `T` — Le système attribue à chaque profil l'ensemble de ses droits de
consultation et d'action.

**EX-ADM-011** · P1 · `ANAT` · `T` — Le système donne au profil « Lecture seule » les droits de consultation
que son nom annonce.

**EX-ADM-012** · P1 · `QUAL` · `T` — Le système refuse qu'une personne s'accorde un droit ou change son propre
profil.

**EX-ADM-013** · P1 · `QUAL` · `T` — Le système journalise toute modification d'un profil ou de ses droits,
avec les valeurs avant et après (voir EX-TRA-007).

**EX-ADM-014** · P1 · `QUAL` · `T` — Le système signale à qui relit le journal des administrateurs toute
attribution d'un droit sensible.

**EX-ADM-015** · P1 · `ANAT` · `T` — Le système permet à la direction générale de relire le journal des
administrateurs.

**EX-ADM-016** · P2 · `MÉTIER` · `D` — Le système fige l'en-tête et la première colonne de la matrice des
profils et des droits.

**EX-ADM-017** · P2 · `MÉTIER` · `D` — Le système permet de rechercher un droit dans la matrice.

**EX-ADM-018** · P2 · `MÉTIER` · `D` — Le système permet de filtrer la matrice par groupe de droits.

**EX-ADM-019** · P2 · `MÉTIER` · `D` — Le système permet de modifier un droit sur place, depuis la matrice,
pour qui en a le droit.

**Messagerie et paramètres**

**EX-ADM-030** · P1 · `ANAT` · `D` — Le système réserve le réglage de la messagerie sortante au responsable
informatique.

**EX-ADM-031** · P1 · `QUAL` · `I` — Le système chiffre le mot de passe de la messagerie et ne le réaffiche
jamais.

**EX-ADM-032** · P2 · `ANAT` · `D` — Le système permet de régler l'adresse du serveur de temps et le fuseau de
l'institution (voir EX-TRA-020 et EX-ORG-040).

**EX-ADM-033** · P1 · `ANAT` · `D` — Le système permet de gérer les référentiels — types d'entité, types de
réunion, jours fériés, types de livrable — sans toucher au code.

**EX-ADM-034** · P2 · `QUAL` · `T` — Le système réserve l'ajout d'une valeur à un référentiel fermé à son
gestionnaire.

**Journal**

**EX-ADM-040** · P1 · `QUAL` · `T` — Le système journalise tout acte d'administration avec son auteur et sa
date.

**EX-ADM-041** · P1 · `QUAL` · `T` — Le système n'écrit au journal d'administration aucun contenu de dossier
RH.

**EX-ADM-042** · P2 · `MÉTIER` · `D` — Le système permet de filtrer le journal par acteur, par genre d'acte et
par date.

**EX-ADM-043** · P3 · `MÉTIER` · `D` — Le système permet d'exporter le journal.

**EX-ADM-044** · P2 · `ANAT` · `I` — Le système ne retire jamais un genre d'acte de la liste des actes
journalisés.

### 5.14.6 Écarts — module Administration

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-ADM-002 | ❌ | La route existe sans aucun bouton : une demande peut être approuvée, jamais refusée | `auth/routes.ts:277` | H1 |
| EX-ADM-003 | ❌ | Aucun avis à la personne | — | H1 |
| EX-ADM-004 | ❌ | Une demande reste en attente indéfiniment | — | H1 |
| EX-ADM-011 | ❌ | « Lecture seule » : zéro droit sur cinquante-huit, aucun des dix modules de suivi | — | H2 |
| EX-ADM-012 | ⚠️ | Le détenteur de `org.profiles` peut ajouter à son propre profil n'importe lequel des 58 droits | — | H8 |
| EX-ADM-013 | ⚠️ | H8 demande que cette modification soit au moins journalisée ; la journalisation n'est pas établie | — | H8 |
| EX-ADM-014 | ⚠️ | H8 demande qu'elle soit aussi visée ; le droit `audit.review` existe, son emploi ici n'est pas établi | — | H8 |
| EX-ADM-016 | ❌ | L'en-tête part à −1 495 px après défilement ; la première colonne n'est pas figée | — | F4.2 |
| EX-ADM-017 | ❌ | Aucune recherche | — | F4.2 |
| EX-ADM-018 | ❌ | Aucun filtre | — | F4.2 |
| EX-ADM-019 | ❌ | Vérifier puis changer un droit : 2 écrans, 6 clics ; l'onglet en lecture seule renvoie par une phrase sans lien | — | F4.2 |
| EX-ADM-032 | ➖ | Aucune horloge de référence, aucun fuseau configurable | `services.ts:181-183` | S5.1, S5.2 |
| EX-ADM-033 | ⚠️ | Les référentiels existent et se règlent dans les paramètres ; plusieurs valeurs manquent | `referentials.ts:118-140` | H3 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

## 5.15 Module Coéquipiers IA — `IA`

### 5.15.1 Objet

L'Agence accepte des coéquipiers IA à une condition, qui est la règle du dépôt : **l'IA propose, un
humain décide.** Le module tient ce que l'IA propose, ce qui attend une validation, les règles
d'automatisation qui la déclenchent, et les exécutions qui en résultent.

Dans une institution où l'écrit fait foi, deux conséquences en découlent. Une proposition qui attend un
décideur qu'elle n'a pas ne doit pas rester en suspens : elle expire et prévient. Une validation humaine
ne s'inscrit jamais au journal avant que l'action ait eu lieu : une approbation inscrite à tort est pire
que pas d'approbation du tout.

### 5.15.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Personne qui lance | Demande une intervention ; l'IA lit avec ses droits, jamais plus |
| Approbateur | Valide ou refuse une proposition ; n'est jamais la personne visée par elle |
| Auteur d'une règle | Écrit la consigne ; la règle s'exécute sous ses droits |
| Chef de projet | Est prévenu quand une proposition n'a aucun décideur |
| Responsable informatique | Administre les règles et le fournisseur |
| Coéquipier IA | Propose ; **n'agit jamais comme une personne** |

### 5.15.3 Cycle de vie

```
INTERVENTION ──> PROPOSITION ──> EN ATTENTE ──> APPROUVÉE ──> EXÉCUTÉE ──> JOURNALISÉE
                      │              │
                      │              ├──> REFUSÉE (arrête l'intervention)
                      │              └──> EXPIRÉE (délai ; la tâche est libérée ; le demandeur est prévenu)
                      │
                      └── aucun décideur possible : pas d'attente ouverte ; le chef de projet est prévenu
```

Le journal n'enregistre « approuvée » qu'**après** l'exécution.

### 5.15.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-IA-01 | Une proposition de l'IA n'a d'effet qu'après validation humaine (EX-TRA-080). | `ANAT` |
| RG-IA-02 | L'IA lit avec les droits de la personne qui la lance, jamais plus. | `ANAT` |
| RG-IA-03 | L'IA n'agit jamais comme une personne. | `ANAT` |
| RG-IA-04 | L'IA n'occupe aucune fonction humaine : ni signataire, ni chargé d'exécution, ni rapporteur, ni décideur. | `ANAT` |
| RG-IA-05 | La personne visée par une proposition ne la valide pas. | `ANAT` |
| RG-IA-06 | Une proposition sans décideur possible n'ouvre pas d'attente (EX-TRA-081). | `MÉTIER` |
| RG-IA-07 | Une attente expire au bout d'un délai défini. | `MÉTIER` |
| RG-IA-08 | Une règle s'exécute sous les droits de qui a écrit sa consigne en vigueur (EX-TRA-082). | `QUAL` |
| RG-IA-09 | Un refus arrête l'intervention. | `ANAT` |
| RG-IA-10 | Le journal n'enregistre que ce qui a été exécuté (EX-TRA-006). | `QUAL` |
| RG-IA-11 | L'IA demande la permission avant chaque lecture envoyée à un service extérieur. | `ANAT` |

### 5.15.5 Exigences

**Validation humaine**

**EX-IA-001** · P1 · `ANAT` · `T` — Le système attend la validation d'un humain avant toute écriture
proposée par un coéquipier IA.

**EX-IA-002** · P1 · `QUAL` · `T` — Le système n'inscrit « approuvée » au journal qu'après l'exécution de
l'action approuvée.

**EX-IA-003** · P1 · `QUAL` · `T` — Le système refuse l'approbation d'une proposition dont l'attente n'existe
plus, avec un motif.

**EX-IA-004** · P1 · `QUAL` · `T` — Le système n'écrit rien, et ne journalise rien, quand il refuse cette
approbation.

**EX-IA-005** · P1 · `ANAT` · `T` — Le système refuse qu'une personne valide une proposition qui la vise.

**EX-IA-006** · P1 · `QUAL` · `T` — Le système recalcule les décideurs d'une proposition modifiée avant sa
validation, et refuse si l'un d'eux est visé.

**EX-IA-007** · P1 · `ANAT` · `T` — Le système arrête l'intervention lorsque la proposition est refusée.

**EX-IA-008** · P1 · `ANAT` · `T` — Le système attribue toute écriture issue d'une validation à
l'approbateur, avec la mention qu'elle a été proposée par un coéquipier IA.

**Sans décideur, expiration**

**EX-IA-010** · P1 · `MÉTIER` · `T` — Le système n'ouvre pas d'attente pour une proposition qui n'a aucun
décideur possible.

**EX-IA-011** · P1 · `MÉTIER` · `T` — Le système prévient le chef du projet lorsqu'une proposition n'a aucun
décideur possible.

**EX-IA-012** · P1 · `MÉTIER` · `T` — Le système fait expirer une attente au bout d'un délai défini.

**EX-IA-013** · P1 · `MÉTIER` · `T` — Le système libère la tâche à l'expiration d'une attente.

**EX-IA-014** · P2 · `MÉTIER` · `T` — Le système informe le demandeur lorsqu'une attente expire.

**EX-IA-015** · P1 · `QUAL` · `D` — Le système dit pourquoi une intervention n'a pas pu démarrer.

**Règles d'automatisation**

**EX-IA-020** · P1 · `QUAL` · `T` — Le système exécute une règle sous les droits de la personne qui a écrit
sa consigne en vigueur.

**EX-IA-021** · P1 · `QUAL` · `T` — Le système réaffecte l'auteur d'une règle à celui qui la modifie.

**EX-IA-022** · P1 · `QUAL` · `T` — Le système exige de l'éditeur d'une règle le droit que la règle fait
exercer.

**EX-IA-023** · P1 · `QUAL` · `T` — Le système journalise la création et la modification d'une règle, avec la
consigne avant et après (voir EX-TRA-007).

**Limites de l'IA**

**EX-IA-030** · P1 · `ANAT` · `T` — Le système refuse qu'un coéquipier IA tienne une fonction humaine :
signataire, chargé d'exécution, rapporteur, intervenant, décideur.

**EX-IA-031** · P1 · `ANAT` · `T` — Le système limite la lecture d'un coéquipier IA aux droits de la personne
qui le lance.

**EX-IA-032** · P1 · `ANAT` · `D` — Le système demande la permission avant chaque lecture envoyée à un service
extérieur.

**EX-IA-033** · P1 · `QUAL` · `I` — Le système chiffre la clé du fournisseur d'IA et ne la réaffiche jamais.

**Consultation**

**EX-IA-040** · P1 · `QUAL` · `T` — Le système applique le filtre des projets lisibles avant la limite de
pagination des exécutions.

**EX-IA-041** · P2 · `MÉTIER` · `D` — Le système présente à une personne les exécutions des projets qu'elle
lit.

### 5.15.6 Écarts — module Coéquipiers IA

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-IA-002 | ❌ | `decide()` journalise `ai.approved` avant de chercher l'attente en mémoire | `ai/engine.ts:672-710`, `698` | S2.1 |
| EX-IA-003 | ❌ | Si l'attente n'existe plus (redémarrage, ouverture avant `init`), la ligne devient `expired` et la réponse est 200 | `ai/engine.ts:710` | S2.1 |
| EX-IA-004 | ❌ | *idem* | `ai/engine.ts:672-710` | S2.1 |
| EX-IA-010 | ❌ | L'approbation est créée puis une promesse sans délai est attendue | `ai/engine.ts:590-641` | S3.4 |
| EX-IA-011 | ❌ | Si la liste des approbateurs est vide, personne n'est prévenu | `ai/engine.ts:612-622` | S3.4 |
| EX-IA-012 | ❌ | L'attente n'a aucun délai | `ai/engine.ts:590-641` | S3.4 |
| EX-IA-013 | ❌ | `start()` refuse toute nouvelle intervention sur une tâche qui a une exécution en `waiting_approval` : la tâche est fermée à l'IA | `ai/engine.ts:298-306` | S3.4 |
| EX-IA-015 | ❌ | `start()` renvoie `null` sans dire pourquoi ; les règles qui s'y déclenchent échouent sans bruit | `ai/engine.ts:298-306` | S3.4 |
| EX-IA-020 | ❌ | `checkOverdueRules` passe `requestedBy: r.created_by` ; `created_by` n'est pas changé à la modification | `ai/engine.ts:290`, `906-918` | S2.3 |
| EX-IA-021 | ❌ | L'UPDATE ne change pas `created_by` | `ai/engine.ts:906-918` | S2.3 |
| EX-IA-022 | ❌ | Un administrateur de projet sans `ai.delegate` peut réécrire la consigne ; `ruleMayRun` ne vérifie que les droits du premier auteur | `ai/engine.ts:241-248`, `880-936` | S2.3 |
| EX-IA-023 | ❌ | `saveRule` ne journalise rien ; seul `deleteRule` le fait | `ai/engine.ts:880-936`, `944` | S2.3 |
| EX-IA-040 | ❌ | `LIMIT` est appliqué dans le SQL sur tous les projets de l'organisation, puis le filtre en mémoire : un agent aux projets peu actifs ne voit rien | `ai/engine.ts:978-998` | S4.3 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

## 5.16 Module Documents — `DOC`

### 5.16.1 Objet

Le module tient les pièces que les autres modules manipulent : documents déposés dans un dossier, un
partenaire, un accord, un courrier ou une réunion, décrits par leur type ; **modèles** à partir desquels
le système génère un document ; **archives**, où l'écrit validé est conservé ; **exports** des registres.

L'Agence travaille sur l'acte écrit, numéroté, daté, signé, classé. Le module garantit qu'un document
validé est **figé**, que son accès suit celui de l'objet qui le porte, et qu'on peut en produire un à
partir d'un modèle plutôt que de le retaper. Le document est aussi, ici, le lieu des actes d'amont : états
financiers approuvés, budget arrêté, cadre organique.

*Les annexes volumineuses du courrier sont reportées par le maître d'ouvrage (voir § 2.2) ; ce module ne
les spécifie pas.*

### 5.16.2 Acteurs

| Acteur | Rôle dans le module |
|---|---|
| Déposant | Dépose une pièce dans l'objet où il tient un rôle d'écriture |
| Lecteur | Lit les pièces de l'objet qu'il a le droit de lire |
| Gestionnaire des modèles | Dépose et met à jour les modèles et leurs en-têtes |
| Secrétariat de direction | Finalise un sortant (numérotation, impression) et classe |
| Direction générale | Consulte les archives ; signe |
| Tout agent concerné | Génère un document à partir d'un modèle |

### 5.16.3 Cycle de vie

```
DÉPOSÉ ──> (décrit : type, dates, référence) ──> VALIDÉ / SIGNÉ ──> FIGÉ ──> CLASSÉ (archive)
   │                                                                              │
   └── remplacé : l'ancienne version est conservée                  qui l'a classé, à quel dossier

MODÈLE ──> saisie des champs ──> DOCUMENT GÉNÉRÉ ──> circuit du signataire (voir 5.2)
```

### 5.16.4 Règles de gestion

| | Règle | Origine |
|---|---|---|
| RG-DOC-01 | Un document est rangé dans un objet porteur et décrit par un type. | `ANAT` |
| RG-DOC-02 | L'accès à un document suit celui de son objet porteur. | `QUAL` |
| RG-DOC-03 | Un document validé ou signé est figé. | `ANAT` |
| RG-DOC-04 | On dépose un modèle avec ses en-têtes ; la personne saisit ; le système génère. | `ANAT` |
| RG-DOC-05 | La finalisation d'un sortant — numéro, impression — revient au secrétariat. | `ANAT` |
| RG-DOC-06 | Un registre archivé est unique ; secrétariat, direction générale et projet en sont des vues. | `ANAT` |
| RG-DOC-07 | Un export est tracé et ne contient rien qui soit masqué à la vue. | `QUAL` |
| RG-DOC-08 | Les actes d'amont du conseil entrent comme documents de référence ; leur délibération reste hors du système. | `LOI` |

### 5.16.5 Exigences

**Pièces et accès**

**EX-DOC-001** · P1 · `ANAT` · `T` — Le système range tout document dans un seul objet porteur.

**EX-DOC-002** · P2 · `ANAT` · `T` — Le système décrit tout document par un type pris dans un référentiel.

**EX-DOC-003** · P2 · `MÉTIER` · `D` — Le système permet de renseigner pour un document sa date de
production, sa date d'expiration et sa référence.

**EX-DOC-004** · P2 · `MÉTIER` · `D` — Le système signale les documents expirés.

**EX-DOC-005** · P1 · `QUAL` · `T` — Le système applique à un document le droit de lecture de son objet
porteur.

**EX-DOC-006** · P1 · `QUAL` · `T` — Le système refuse le dépôt d'un document à toute personne qui n'a aucun
droit d'écriture sur l'objet porteur (voir EX-POR-006).

**EX-DOC-007** · P1 · `QUAL` · `T` — Le système ne renvoie jamais le contenu binaire d'un document dans une
liste.

**EX-DOC-008** · P2 · `MÉTIER` · `D` — Le système permet l'aperçu d'un document PDF, image, Word, Excel ou
texte sans le télécharger.

**EX-DOC-009** · P2 · `MÉTIER` · `T` — Le système conserve l'ancienne version d'un document remplacé.

**EX-DOC-010** · P1 · `QUAL` · `T` — Le système fige un document dès qu'il est validé ou signé.

**EX-DOC-011** · P1 · `QUAL` · `T` — Le système refuse la suppression d'un document signé.

**Modèles et génération**

**EX-DOC-020** · P1 · `ANAT` · `D` — Le système permet de déposer un modèle de document avec ses en-têtes.

**EX-DOC-021** · P1 · `ANAT` · `D` — Le système permet de saisir les informations variables d'un modèle
dans des champs.

**EX-DOC-022** · P1 · `ANAT` · `D` — Le système génère un document à partir d'un modèle et des informations
saisies.

**EX-DOC-023** · P2 · `ANAT` · `T` — Le système réserve la gestion des modèles à leurs gestionnaires.

**EX-DOC-024** · P2 · `QUAL` · `D` — Le système offre la génération à partir d'un modèle à tout module qui
produit un document : courrier, convention, note (voir EX-TRA-070).

**EX-DOC-025** · P1 · `ANAT` · `D` — Le système réserve au secrétariat la finalisation d'un sortant généré
(voir EX-COU-036).

**Exports**

**EX-DOC-030** · P2 · `ANAT` · `D` — Le système exporte les registres en Excel, PDF, Word ou CSV, dans la
charte de l'Agence.

**EX-DOC-031** · P1 · `QUAL` · `T` — Le système journalise chaque export.

**EX-DOC-032** · P1 · `QUAL` · `T` — Le système neutralise toute formule contenue dans une cellule exportée.

**EX-DOC-033** · P1 · `QUAL` · `T` — Le système n'écrit dans un export aucune donnée masquée à la vue (voir
EX-TRA-010).

**Archives et documents de référence**

**EX-DOC-040** · P1 · `ANAT` · `T` — Le système tient un registre unique des documents archivés, chacun
portant qui l'a classé et à quel dossier il se rattache (voir EX-COU-043).

**EX-DOC-041** · P1 · `ANAT` · `D` — Le système présente les archives selon trois vues — secrétariat,
direction générale, projet — issues du même registre (voir EX-COU-044).

**EX-DOC-050** · P2 · `LOI` · `D` — Le système conserve les états financiers approuvés comme document de
référence.

**EX-DOC-051** · P2 · `LOI` · `D` — Le système conserve le budget arrêté comme cadre d'exécution
consultable.

**EX-DOC-052** · P3 · `ANAT` · `D` — Le système permet de consulter le cadre organique dans l'outil.
*(Décision attendue du maître d'ouvrage : dans l'outil, ou référence extérieure — H4.)*

### 5.16.6 Écarts — module Documents

| Exigence | État | Aujourd'hui | Preuve | Intervention |
|---|---|---|---|---|
| EX-DOC-006 | ❌ | Un compte « Lecture seule » a déposé un document dans un dossier de projet : 200 | `documents.ts` *(à localiser)* | S1.1 |
| EX-DOC-020 | ➖ | Aucun modèle de document n'existe dans le dépôt | — | M1.9 |
| EX-DOC-021 | ➖ | *idem* | — | M1.9 |
| EX-DOC-022 | ➖ | *idem* | — | M1.9 |
| EX-DOC-025 | ➖ | La finalisation n'est pas un rôle du secrétariat | — | M1.9 |
| EX-DOC-040 | ⚠️ | Les courriers se classent, sans registre unifié ni rattachement explicite | — | M1.14 |
| EX-DOC-041 | ➖ | Les trois archives citées par le maître d'ouvrage ne sont pas des vues d'un même registre | — | M1.14 |
| EX-DOC-050 | ➖ | Aucun état financier approuvé n'entre comme document de référence | — | — |
| EX-DOC-051 | ➖ | Aucun budget arrêté n'entre comme cadre d'exécution | — | — |
| EX-DOC-052 | ➖ | L'outil ignore le cadre organique | — | H4 |

*Les exigences absentes de ce tableau n'ont pas été confrontées au code : leur état n'est pas établi.*

---

# 10. Synthèse des écarts

## 10.1 Ce que pèse le dossier

| | |
|---|---|
| Exigences écrites | **477** |
| Modules spécifiés | 16 |
| Exigences confrontées à l'existant | **185** |
| Exigences dont l'état n'est pas établi | **292** |

**Les 292 non confrontées ne sont pas une omission, c'est une étape.** Elles ont été déduites du
fonctionnement de l'Agence, et personne n'est encore allé lire le code pour savoir si elles sont tenues.
Les tableaux d'écarts le disent module par module. L'établissement de leur état est un travail à part
entière, à conduire avant d'ouvrir les lots concernés.

## 10.2 L'état de ce qui a été vérifié

Sur les 185 exigences confrontées :

| État | Nombre | Part |
|---|---|---|
| ✅ tenue | **10** | 5 % |
| ⚠️ partielle | 19 | 10 % |
| ❌ non tenue | **113** | 61 % |
| ➖ absente — rien n'existe | **43** | 23 % |

Autrement dit : **sur vingt exigences vérifiées, une est tenue.** Ce chiffre est dur, et il faut le lire
pour ce qu'il est — non pas le constat d'un mauvais logiciel, mais la mesure de l'écart entre un outil
bâti par ajouts successifs et un système spécifié à partir du fonctionnement d'une institution. Les deux
tiers des manques étaient déjà connus, documentés et chiffrés dans `docs/INTERVENTIONS.md`. Le dernier
quart ne l'était pas.

## 10.3 Les exigences par module

| Module | Exigences | Confrontées | ✅ | ⚠️ | ❌ | ➖ |
|---|---|---|---|---|---|---|
| `SIG` Signataire | 26 | 14 | 1 | 2 | 4 | 7 |
| `REU` Réunions | 41 | 22 | 0 | 5 | 11 | 6 |
| `DEC` Décisions | 33 | 9 | 1 | 0 | 6 | 2 |
| `PLA` Plans de travail | 25 | 3 | 0 | 1 | 1 | 1 |
| `ATT` Attributions | 11 | 4 | 0 | 0 | 2 | 2 |
| `POR` Portefeuille | 24 | 11 | 0 | 1 | 10 | 0 |
| `TAC` Tâches | 25 | 14 | 2 | 2 | 8 | 2 |
| `LIV` Livrables | 29 | 17 | 1 | 1 | 13 | 2 |
| `PAR` Partenaires | 23 | 10 | 2 | 1 | 7 | 0 |
| `RIS` Risques | 19 | 5 | 0 | 0 | 4 | 1 |
| `RH` Ressources humaines | 39 | 26 | 2 | 1 | 19 | 4 |
| `ORG` Organisation | 28 | 14 | 1 | 0 | 6 | 7 |
| `ADM` Administration | 27 | 13 | 0 | 4 | 8 | 1 |
| `IA` Coéquipiers IA | 24 | 13 | 0 | 0 | 13 | 0 |
| `DOC` Documents | 26 | 10 | 0 | 1 | 1 | 8 |

Deux modules — **Plans de travail** et **Attributions** — ont des tableaux d'écarts très courts. Ce n'est
pas qu'ils soient sains : c'est que les 102 défauts les couvraient peu. Ils sont donc les premiers
candidats au travail d'établissement des états.

Un module se détache : **les coéquipiers IA, treize exigences confrontées, treize non tenues, aucune
tenue.**

## 10.4 Ce que la spécification a trouvé et que les défauts n'avaient pas vu

C'est le résultat le plus utile du dossier, et il justifie à lui seul de l'avoir écrit : **on ne peut pas
voir une absence en lisant du code.** Ces exigences n'ont aucun point d'intervention, parce que rien dans
le système ne les évoque.

**Les actes d'amont.** Le Conseil d'administration n'est pas outillé — c'est délibéré — mais **ses actes
entrent dans la gestion**, et rien ne les reçoit :

- `EX-DEC-050` — une résolution du conseil entre dans le système comme charge à suivre.
- `EX-DEC-051` — un budget arrêté par le conseil sert de cadre d'exécution.
- `EX-DOC-050` — les états financiers approuvés sont conservés comme document de référence.
- `EX-DOC-051` — le budget arrêté est consultable comme cadre d'exécution.

**La structure territoriale.** L'Agence est présente par six pools, et le système ne les connaît pas :

- `EX-ORG-004` — le type d'entité *pool*.
- `EX-ORG-005` — la fonction de directeur de pool.

**La continuité du service.**

- `EX-ORG-019` — l'intérim d'un chef d'entité. Le modèle institutionnel le signalait déjà comme manquant.
- `EX-ORG-007` — le catalogue des profils reflète qu'il n'y a **qu'un** directeur général adjoint.
- `EX-PLA-012` — l'écran dit à celui qui soumet un plan qui peut l'approuver.

## 10.5 Les exigences d'amont d'un travail déjà prévu

Ces exigences sont rattachées à un point d'intervention, mais ce point ne les couvre qu'en partie. Les
écrire avant d'ouvrir le lot évite de livrer la moitié du sujet.

- **La délégation de signature** — `EX-SIG-021` à `025` : délégation datée, bornes obligatoires, ouverture
  et fermeture automatiques, journal, mention portée sur l'acte signé. Le point M1.8 n'en nommait qu'une.
- **L'adoption collégiale d'un compte rendu** — `EX-REU-023` à `028` et `031` : amendement par les
  présents avec trace, adoption à la séance suivante, modifications consignées, et le cas d'une séance
  qui n'a pas de suivante.
- **Les types de livrables** — `EX-LIV-003` et `004` : à écrire quand la liste sera arrêtée.

## 10.6 Ce qui attend une décision du maître d'ouvrage

Aux huit décisions déjà listées dans `docs/PLAN-PROJET.md` § 6, la spécification en ajoute une :

- **Qui confirme une exécution déclarée** — le secrétariat de direction ou la direction générale.

---

# 11. Trajectoire

La trajectoire de mise en œuvre — sprints, jalons, chemin critique, décisions attendues et registre des
risques — fait l'objet de `docs/PLAN-PROJET.md`. Elle n'est pas répétée ici.

Rappel du lien entre les deux documents : **la spécification dit ce qui doit être, le plan de projet dit
quand et par qui.** Une exigence sans intervention correspondante est un manque du plan ; une
intervention sans exigence est un travail dont on n'a pas dit pourquoi on le fait.

---

# Annexe A — Glossaire

| Terme | Sens dans l'Agence et dans le système |
|---|---|
| **Acheminement** | Lien entre un courrier et un destinataire, portant sa mention, son état et son échéance. |
| **Antichambre** | Le secrétariat immédiat de la direction générale, par où passe tout ce qui lui est destiné. |
| **Attributions** | Ce dont une entité a la charge, selon le cadre organique. |
| **Cadre organique** | Le texte qui crée les entités de l'Agence et fixe leurs charges. |
| **Charge** | Ce qu'on attend d'une personne, quelle qu'en soit l'origine. |
| **Exercice** | L'année budgétaire, du 1er janvier au 31 décembre. |
| **Imputation** | L'affectation d'un courrier à une entité et à une personne, pour suite à donner. |
| **Intervenant** | Celui qui développe un point de l'ordre du jour d'une réunion. |
| **Pool** | Entité territoriale couvrant plusieurs provinces, dirigée par un directeur de pool. |
| **Pour attribution** | Formule administrative française pour *pour traitement* ; écartée ici pour éviter la confusion avec les fiches d'attributions. |
| **Rapporteur** | Celui qui programme une réunion, prend note et rédige le compte rendu. Il n'y décide rien. |
| **Réunion des directions** | La réunion hebdomadaire rassemblant directions et cellules. Jamais « comité de direction ». |
| **Signataire** | Le circuit par lequel un document recueille visas puis signature. En France : *signataire*. |
| **Visa** | L'accord d'une étape intermédiaire d'un circuit ; il n'engage pas l'Agence. |

---

# Annexe B — Matrice de traçabilité

*À produire : chaque exigence, son état, et le ou les points
d'intervention qui la tiennent.*
