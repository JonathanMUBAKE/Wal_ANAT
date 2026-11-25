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
| 5.2 | Signataire (circuits de visa et de signature) | à rédiger |
| 5.3 | Réunions et comptes rendus | à rédiger |
| 5.4 | Décisions de la direction générale | à rédiger |
| 5.5 | Plans de travail | à rédiger |
| 5.6 | Attributions des entités | à rédiger |
| 5.7 | Portefeuille, activités et projets | à rédiger |
| 5.8 | Tâches et charges | à rédiger |
| 5.9 | Livrables et consultants | à rédiger |
| 5.10 | Partenaires et conventions | à rédiger |
| 5.11 | Risques et indicateurs | à rédiger |
| 5.12 | Ressources humaines, congés et absences | à rédiger |
| 5.13 | Organisation et structure | à rédiger |
| 5.14 | Administration du système | à rédiger |
| 5.15 | Coéquipiers IA et validations humaines | à rédiger |
| 5.16 | Documents, modèles et archives | à rédiger |
| 6 | Modèle de données | à rédiger |
| 7 | Architecture technique | à rédiger |
| 8 | Exigences non fonctionnelles | à rédiger |
| 9 | Recette et vérification | à rédiger |
| 10 | Synthèse des écarts | à rédiger |
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

**L'Agence travaille sur registres.** Courrier, décisions, comptes rendus, conventions, parapheur : la
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
| EX-TRA-050 | ❌ Quatre actes engageants sont muets | `Parapheur.tsx`, `ProjectDossier.tsx:861` | F3.1 |
| EX-TRA-052 | ⚠️ Tenue pour le tiroir et l'éditeur de compte rendu ; pas pour les autres formulaires de page | `276f78b` | F4.4 |
| EX-TRA-061 | ❌ « Parapheur » employé 232 fois ; « rapporteur » désigne l'intervenant | `Meetings.tsx:1968` | F5.1, M2.3 |
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

## 5.2 à 5.16 — *à rédiger*

Les modules suivants sont à spécifier sur le modèle du § 5.1 par l'agent `chef-de-projet`.

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
| **Signataire** | Le circuit par lequel un document recueille visas puis signature. En France : *parapheur*. |
| **Visa** | L'accord d'une étape intermédiaire d'un circuit ; il n'engage pas l'Agence. |

---

# Annexe B — Matrice de traçabilité

*À produire une fois les modules 5.2 à 5.16 rédigés : chaque exigence, son état, et le ou les points
d'intervention qui la tiennent.*
