# Conception d'ensemble — ANAT Pilotage

> Rédigé le 11 novembre 2026. Ce document donne **la vision commune** du système : ce qu'il est, pour qui, module par
> module, avec les fonctionnalités, leur état et ce qui reste à construire. Il ajoute le **module Partenaires**
> (conception détaillée en partie 4).
>
> Il s'appuie sur, sans les répéter : `docs/PARCOURS-METIER.md` (les gestes de l'administration),
> `docs/ARCHITECTURE-INFORMATION.md` (ce qui va où), `docs/PARAMETRAGE.md` (les listes paramétrables),
> `docs/DESIGN-SYSTEM.md` (l'apparence), `docs/PLAN-DE-TRAVAIL.md` (l'ordre des travaux).
> Aucun code n'est modifié par ce document.

Légende des états : ✅ construit · 🟡 partiel · ⬜ à construire.

---

## 1. La vision

### 1.1 En une phrase

**ANAT Pilotage est l'outil avec lequel la Direction générale de l'Agence pilote tout ce que l'Agence s'est engagée à
faire, avec qui elle le fait, et où elle en est** : chaque engagement vit dans un dossier, chaque acte officiel est
numéroté et figé, chaque passage de main prévient quelqu'un, et l'IA propose pendant qu'un humain décide.

### 1.2 Les cinq questions auxquelles l'outil répond chaque matin

| Question de la DG | Où la réponse se lit |
| --- | --- |
| Qu'ai-je à trancher ou à signer ? | Tableau de bord DG (décisions attendues, signataire) |
| Qu'est-ce qui est en retard, et qui en répond ? | Tableau de bord DG (retards), dossiers |
| Où en est l'exécution du plan de l'année ? | Plans de travail, avancement remonté des dossiers |
| Qu'avons-nous promis, et à qui ? | Décisions, courrier, **conventions avec les partenaires** |
| Qui nous finance, nous appuie, nous accompagne, et sur quoi ? | **Partenaires** (nouveau) |

### 1.3 Les principes qui ne se négocient pas

1. **Un objet, un domicile.** Tout travail appartient à un dossier (projet ou activité) ; les écrans transverses sont
   des vues. Exception : les registres officiels (courrier, comptes rendus, décisions, **conventions**) qui portent une
   numérotation continue.
2. **Le plan dit quoi, le dossier dit comment.** L'avancement et la dépense remontent du dossier au plan, puis au
   tableau de bord.
3. **Ce qui est validé est figé.** Une correction est un nouvel acte (révision, décision de remplacement, **avenant**),
   jamais une modification silencieuse.
4. **Tout se contrôle côté serveur, tout se trace.** Chaque route figure dans `matrice.test.ts` ; chaque action
   sensible est journalisée.
5. **Paramétrable quand aucune règle n'en dépend.** Sinon la règle devient une propriété de la valeur
   (`docs/PARAMETRAGE.md`).
6. **Interne et externe sont distincts.** Une personne extérieure (consultant, contact d'un partenaire) n'est jamais un
   agent ; elle ne voit que ce qui la concerne, et seulement le temps nécessaire.
7. **L'IA propose, un humain décide.** Aucun acte officiel n'est posé par un coéquipier IA.

### 1.4 Pour qui

| Profil | Ce qu'il fait dans l'outil |
| --- | --- |
| **Directrice générale** et cabinet | Lit le tableau de bord, tranche, signe, préside, suit les partenariats stratégiques |
| **Directeurs et chefs de service** (siège et provinces) | Conduisent les dossiers, préparent les plans, valident livrables et comptes rendus |
| **Agents** | Exécutent les tâches, rédigent, instruisent le courrier |
| **Secrétariat de direction, bureau d'ordre** | Programment les réunions, enregistrent le courrier, tiennent les registres |
| **Cellule de coopération / partenariats** (nouveau) | Tient l'annuaire des partenaires, prépare et suit les conventions et les engagements |
| **Service administratif et financier** | Constate les paiements, suit les décaissements des partenaires |
| **Administrateur système** | Paramètre l'institution (référentiels, sécurité, comptes) |
| **Consultants** (externes) | Ne voient que le projet de leur contrat, pendant sa durée |
| **Coéquipiers IA** | Résument, préparent, proposent ; jamais ne valident |

---

## 2. La carte des modules

```
                         ┌──────────────────────────────────────────────┐
                         │   TABLEAU DE BORD DG  (vue, aucun domicile)  │
                         └──────────────────────────────────────────────┘
                                         ▲ remonte
 ORGANISATION            SUIVI-ÉVALUATION          PILOTAGE                    PARTENARIATS (nouveau)
 Structure, provinces ─▶ Plans de travail ◀──────  Portefeuille (dossiers)  ◀─▶ Partenaires
 Attributions            Indicateurs, risques      ├ Projet : tâches,            Conventions et accords
 Personnes, profils                                │  livrables, contrats,        Engagements financiers
 Équipes                                           │  réunions, documents
                                                   ├ Activité : mandat, suites
                                                   Décisions (registre)
                                                   Réunions (registre des CR)
 SECRÉTARIAT : Signataire (signe les actes) · Courrier (registre entrant / sortant)
 SOCLE : Authentification · Droits · Journal · Paramétrage · Documents · Messagerie · Coéquipiers IA · Accès externe
```

**Navigation cible** (la ligne « Partenariats » est nouvelle) :

```
Accueil · Mes tâches · Coéquipiers IA
PILOTAGE            Tableau de bord DG · Portefeuille · Décisions · Réunions
SUIVI-ÉVALUATION    Plans de travail · Indicateurs et risques
PARTENARIATS        Partenaires · Conventions
SECRÉTARIAT         Signataire · Courrier
ORGANISATION        Structure · Équipes · (Administration système)
```

---

## 3. Les modules, un par un

Chaque module dit : **son rôle**, **ses objets**, **ses fonctionnalités** avec leur état, **ce qui reste**.

### 3.1 Socle — accès, droits, journal

**Rôle.** Garantir que chacun ne voit et ne fait que ce que son profil permet, et que tout acte sensible est tracé.

| Fonctionnalité | État |
| --- | --- |
| Connexion e-mail + mot de passe (scrypt), sessions révocables, mot de passe oublié | ✅ |
| Double authentification, obligatoire pour administrer en HTTPS | ✅ |
| Limites de tentatives et de débit, en-têtes de sécurité, contrôle d'origine | ✅ |
| Profils de droits dynamiques, exceptions par personne, profil Lecture seule | ✅ |
| Matrice des droits rejouée par les tests (`matrice.test.ts`) | ✅ |
| Journal de sécurité | ✅ |
| Journal d'audit unifié avec écran, filtres, export CSV (Lot E) | 🟡 |
| Historique des connexions par personne, politiques de mot de passe (Lot E) | ⬜ |
| Politiques RLS par organisation sur Supabase réel | ⬜ |

### 3.2 Administration système et paramétrage (Lot H)

**Rôle.** Adapter l'outil à l'Agence sans toucher au code.

| Fonctionnalité | État |
| --- | --- |
| Espace réservé à l'administrateur système | ✅ |
| Référentiels : code stable, archivage, couleur, icône, propriétés, journalisés | ✅ |
| Types d'activités, types d'entités (dont « représentation provinciale ») | ✅ |
| Types de réunions, natures de documents du signataire, unités des indicateurs | ⬜ |
| **Types et catégories de partenaires** (partie 4, lot PA1) | ✅ |
| Types d'accords, natures de pièces de collaboration (lot PA2) | ✅ |
| Délais administratifs en paramètres : convocation, compte rendu, réponse au courrier, mission (P5) | ⬜ |

### 3.3 Organisation

**Rôle.** Dire qui est qui et qui répond de quoi.

| Fonctionnalité | État |
| --- | --- |
| Structure (organigramme) du siège et des provinces, responsables | ✅ |
| Fiche d'attributions par entité : approuvée par un autre, figée, versionnée | ✅ |
| Écarts de participation (attributions ↔ activité réelle) | ✅ |
| Personnes, invitations acceptées par le titulaire, profils | ✅ |
| Équipes (groupes de travail internes) | ✅ |
| Plan de travail de l'entité visible dans son panneau | ⬜ |
| **Partenaires suivis par l'entité visibles dans son panneau** (partie 4) | ⬜ |

### 3.4 Pilotage — Tableau de bord DG

**Rôle.** La page du matin de la DG. Une vue : elle ne stocke rien.

| Fonctionnalité | État |
| --- | --- |
| Quatre chiffres d'action, santé du portefeuille, décisions attendues, agenda des sept jours | ✅ |
| Retards (tâches, recommandations, livrables, plan, courrier) avec détail | ✅ |
| Indicateurs et risques affichés | ✅ (saisie à construire, § 3.9) |
| Carte Assistant IA (point de situation) | ✅ |
| Alerte de dépassement budgétaire d'un projet | ⬜ |
| **Conventions arrivant à échéance, engagements des partenaires (annoncé / décaissé)** | ⬜ |

### 3.5 Pilotage — Portefeuille et dossiers

**Rôle.** Le domicile de tout le travail. Deux sortes de dossiers : le **projet** (un travail à produire) et
l'**activité** (une représentation ou un engagement ponctuel).

| Fonctionnalité | État |
| --- | --- |
| Projets internes ou confiés, activités par type paramétrable, vues liste / tableau / calendrier | ✅ |
| Projet complet : Vue d'ensemble · Tâches · Livrables · Contrats · Réunions | ✅ |
| Tâches (liste, kanban, calendrier, frise), commentaires, pièces jointes, aperçu, import Word/Excel | ✅ |
| Livrables : soumission, revue, validation par un autre, PV de réception numéroté | ✅ |
| Contrats de prestataires dans le projet, tranches de paiement par livrable, paiement constaté | ✅ |
| Vue « Contrats et paiements » pour le service financier | ✅ |
| Rattachement à l'activité du plan, avancement remonté | ✅ |
| Activité : mandat, délégation, suites à donner | ✅ |
| Onglets Décisions et Documents du projet | 🟡 |
| États « annulée » / « reportée » d'une activité | ⬜ |
| Accès externe des consultants qui expire avec le contrat, TdR structurés (P4) | ⬜ |
| **Financement du projet par source (partenaire, budget propre)** (partie 4) | ⬜ |
| **Le commanditaire, l'interlocuteur, le prestataire choisis dans l'annuaire des partenaires** (partie 4, lot PA3) | ✅ |

### 3.6 Pilotage — Décisions de la DG

**Rôle.** Registre officiel : ce que la DG a tranché, qui l'exécute, où en est l'exécution.

| Fonctionnalité | État |
| --- | --- |
| Numéro annuel `DEC/AAAA/NNNN`, texte figé, exécution à sens unique, remplacement | ✅ |
| Décisions de séance inscrites à la validation du compte rendu | ✅ |
| Confidentialité héritée du dossier | ✅ |
| Mandat d'une activité inscrit au registre | ⬜ |

### 3.7 Pilotage — Réunions et comptes rendus

**Rôle.** Préparer, tenir et suivre les réunions ; registre des comptes rendus.

| Fonctionnalité | État |
| --- | --- |
| Programmation : présidence, visioconférence, convoqués (personne, entité, extérieur), série | ✅ |
| Convocation, réponses (présent / excusé / représenté), pièces de l'ordre du jour | ✅ |
| Circuit soumettre → retourner / valider par la présidence, numéro, figé, export Word, diffusion | ✅ |
| Recommandations suivies, devenant tâches du projet | ✅ |
| Rattachement à un projet ou une activité | ✅ |
| **Réunion avec un partenaire : convoqués extérieurs pris parmi ses contacts** (partie 4, lot PA3) | ✅ |
| Invitation de calendrier envoyée aux convoqués (Lot G) | ⬜ |

### 3.8 Suivi-évaluation — Plans de travail

| Fonctionnalité | État |
| --- | --- |
| Préparation par entité, soumission, approbation par un autre, plan figé, révisions motivées | ✅ |
| Catalogue des activités du plan, avancement remonté des dossiers | ✅ |
| Note de cadrage, revue trimestrielle, rapport annuel de performance généré | ⬜ |
| Signal d'une activité hors attributions | ⬜ |

### 3.9 Suivi-évaluation — Indicateurs et risques

| Fonctionnalité | État |
| --- | --- |
| Calcul de l'atteinte (sens « monter » ou « baisser »), affichage au tableau de bord | ✅ |
| Écrans de saisie des indicateurs (valeurs, sources, unités paramétrables) | ⬜ |
| Registre des risques (cotation, mesures, responsable, rattachement à un dossier) | ⬜ |

### 3.10 Secrétariat — Signataire

| Fonctionnalité | État |
| --- | --- |
| Circuit avis → visa → signature, délégations | ✅ |
| Document signé rattaché au projet | 🟡 |
| Un document signé alimente le courrier sortant | ⬜ |
| **Une convention signée au signataire passe « en vigueur » dans le module Partenaires** (partie 4, lot PA2) | ✅ |

### 3.11 Secrétariat — Courrier

| Fonctionnalité | État |
| --- | --- |
| Registre entrant / sortant numéroté, imputation avec instruction, délai, relance remontée | ✅ |
| Réponse sortante liée à l'entrant, qui le clôt ; rattachement à un dossier | ✅ |
| **Correspondant choisi dans l'annuaire des partenaires ; courrier visible sur la fiche** (partie 4, lot PA3) | ✅ |

### 3.12 Espace personnel

| Fonctionnalité | État |
| --- | --- |
| Accueil, Mes tâches (tâches, livrables à produire / valider, recommandations) | ✅ |
| Boîte de réception, notifications, temps réel | ✅ |
| Recherche « / » et palette de commandes | ✅ |

### 3.13 Coéquipiers IA

| Fonctionnalité | État |
| --- | --- |
| Coéquipiers membres des projets, @mention, validations humaines, règles, mémoire | ✅ |
| Lecture des pièces jointes, mode démo | ✅ |
| Fiche agent configurable : prompt, modèle, outils attribués, clé chiffrée, essai, consommation (Lot D) | ⬜ (attend Q1) |
| **Outils Partenaires : note de préparation, résumé de la relation, extraction d'une convention** (partie 4) | ⬜ |

### 3.14 Documents, messagerie, connecteurs

| Fonctionnalité | État |
| --- | --- |
| Pièces jointes (25 Mo, type réel contrôlé), aperçu intégré, export Word à la charte | ✅ |
| Adresses de service par entité, envoi SMTP | ✅ |
| File d'envoi par organisation avec reprise (Lot B) | ⬜ |
| Stockage objet (Supabase Storage) quand `STORAGE_URL` est défini | ⬜ |
| Connecteurs : messageries, visioconférence, drives, courriel entrant (Lot G) | ⬜ |

---

## 4. Le module Partenaires — conception détaillée

### 4.1 Pourquoi un module, et pourquoi maintenant

Aujourd'hui, les tiers de l'Agence sont **du texte libre éparpillé** : `projects.sponsor` (commanditaire),
`agency_activities.counterpart` (interlocuteur), `correspondence.correspondent` (expéditeur ou destinataire),
`consultant_contracts.consultant_name` (prestataire), les convoqués extérieurs des réunions. Conséquences :
- le même ministère s'écrit de trois façons et l'on ne peut rien rassembler ;
- personne ne sait répondre à « que faisons-nous avec la Banque mondiale ? » ;
- les conventions et accords signés n'ont pas de registre, ni d'alerte d'échéance ;
- les engagements financiers des partenaires techniques et financiers (PTF) ne sont pas suivis.

**Le module Partenaires crée un annuaire unique des tiers de l'Agence** et en fait le domicile de la **relation** :
qui est ce partenaire, sur quoi nous travaillons ensemble (accords), qui y parle à qui (contacts, points focaux),
ce qui s'est passé (réunions, courriers, dossiers), ce qu'il s'est engagé à apporter, et les pièces qui le prouvent.

### 4.2 Les objets

| Objet | Ce que c'est | Domicile |
| --- | --- | --- |
| **Partenaire** | Une organisation tierce : ministère, collectivité, entreprise, établissement public, bailleur, ONG, université… | Partenariats › Partenaires |
| **Type de partenaire** (référentiel) | Sa **nature juridique** : un seul par partenaire | Administration système › Paramètres |
| **Catégorie** (référentiel) | Son **rôle dans la relation** (PTF, partenaire technique, institutionnel, prestataire…) : plusieurs possibles | Administration système › Paramètres |
| **Contact** | Une personne **chez le partenaire** (nom, fonction, coordonnées) — jamais un compte de l'outil | Dans le partenaire |
| **Point focal** | L'agent de l'Agence qui suit la relation (un principal, d'autres possibles), et l'entité qui la porte | Dans le partenaire |
| **Accord** (convention, protocole, accord de financement, contrat-cadre…) | L'acte qui encadre une collaboration : objet, parties, dates, engagements, pièces. **Registre numéroté** | Dans le partenaire ; registre Partenariats › Conventions |
| **Avenant** | Modification d'un accord en vigueur : un nouvel acte lié, jamais une retouche | Dans l'accord |
| **Engagement** | Ce qu'un partenaire s'engage à apporter au titre d'un accord : financier (don, prêt, cofinancement), technique (expertise, formation), en nature (locaux, matériel, données) | Dans l'accord |
| **Décaissement** | Une tranche d'un engagement financier : prévue, appelée, reçue | Dans l'engagement |
| **Pièce de collaboration** | Document joint au partenaire ou à un accord, avec sa **nature** (référentiel) | Dans le partenaire ou l'accord |
| **Interaction** | Fil chronologique : réunions, courriers, dossiers, notes d'échange | Calculé sur la fiche (une vue) ; seules les **notes d'échange** y sont saisies |

**Pourquoi type et catégorie sont séparés** : un même partenaire est un *établissement public* (type) et à la fois
*partenaire technique* et *PTF* (catégories). Le type répond à « qui est-il ? », la catégorie à « que fait-il pour
nous ? ». Filtrer par l'un ou l'autre répond à des questions différentes de la DG.

### 4.3 Référentiels paramétrables (à ajouter à `docs/PARAMETRAGE.md`)

| Liste | Valeurs de départ | Propriétés (règles portées) |
| --- | --- | --- |
| `partner_type` — Types de partenaires | Institution publique (ministère, administration) · Collectivité territoriale · Établissement public · Entreprise privée · Organisation internationale · Agence de coopération bilatérale · ONG / association · Université, centre de recherche · Autre | `public` (booléen : relève de l'État, utile aux statistiques) |
| `partner_category` — Catégories | PTF (partenaire technique et financier) · Partenaire technique · Partenaire institutionnel · Partenaire de mise en œuvre · Prestataire · Mécène / sponsor | `financial` (booléen : peut porter des engagements financiers) · `supplier` (booléen : peut être choisi comme prestataire d'un contrat) |
| `agreement_type` — Types d'accords | Convention de partenariat · Protocole d'accord (MoU) · Accord de financement · Convention de subvention · Contrat-cadre · Lettre d'intention | `binding` (booléen : juridiquement contraignant, exige la signature au signataire) · `financial` (booléen : porte des engagements financiers) |
| `partner_doc_nature` — Natures de pièces | Convention signée · Avenant · Lettre d'intention · Rapport d'activité · Rapport financier · Compte rendu · Correspondance · Fiche de présentation · Autre | `official` (booléen : figée dès son dépôt, ne se supprime pas) |

Le **pays** et la **zone d'intervention** (provinces) se choisissent dans des listes fermées : pays (norme ISO) et
entités provinciales de la structure.

### 4.4 Les états

Les états **restent fixes** (des règles en dépendent, principe 5) ; leurs libellés sont ceux-ci.

**Partenaire — l'état de la relation**

```
 Identifié ──▶ En discussion ──▶ Actif ──▶ Clos
     │               │             │  ▲
     └───────────────┴──▶ Suspendu ┘──┘   (Suspendu ⇄ Actif)
```

| État | Sens | Règle |
| --- | --- | --- |
| **Identifié** | Partenaire potentiel repéré, aucun échange formel | État de départ |
| **En discussion** | Échanges en cours, accord en préparation | Atteint automatiquement à la création d'un accord en négociation |
| **Actif** | Au moins un accord en vigueur, ou relation de travail reconnue | Atteint automatiquement à l'entrée en vigueur d'un accord |
| **Suspendu** | Relation gelée (différend, gel des financements…) | **Motif obligatoire**, réservé aux gestionnaires, tracé ; plus d'accord nouveau tant qu'il dure |
| **Clos** | Relation terminée | Refusé tant qu'un accord est en vigueur ; motif obligatoire ; le partenaire reste consultable, il n'est plus proposé |

Un partenaire **ne se supprime jamais dès qu'il est cité** (accord, courrier, dossier, réunion) : il se clôt.
Une fiche créée par erreur et jamais citée peut être supprimée par un gestionnaire (tracé).

**Accord — son cycle de vie**

```
 En préparation ──▶ En négociation ──▶ En signature ──▶ En vigueur ──▶ Échu
                                      (signataire)          │
                                                           ├──▶ Résilié (motif)
                                                           └──▶ Avenant (nouvel acte lié)
```

| État | Règle |
| --- | --- |
| **En préparation / En négociation** | Le texte et les engagements se modifient librement. *Construit (PA2) : un seul état « En préparation » couvre les deux ; la création d'un accord fait passer ses partenaires « En discussion ».* |
| **En signature** | Le texte est soumis au signataire (si le type est `binding`) ; plus modifiable sauf retour du circuit |
| **En vigueur** | Atteint à la signature (ou à la saisie de la date de signature pour un accord non contraignant). Numéro `CONV/AAAA/NNNN` attribué, **texte et pièce signée figés** |
| **Échu** | Calculé à la date de fin si rien n'est fait ; alerte au point focal **90, 30 et 7 jours** avant (délais paramétrables, P5) |
| **Résilié** | Motif et date obligatoires, réservé aux gestionnaires |

### 4.5 La fiche partenaire

En-tête : nom (et sigle), type, catégories (pastilles), état, pays, point focal, entité porteuse.
Onglets :

| Onglet | Contenu | Actions |
| --- | --- | --- |
| **Vue d'ensemble** | Présentation, domaines d'intervention (référentiel des domaines), zone d'intervention, chiffres (accords en vigueur, engagé / décaissé, dossiers liés, dernière interaction), prochaines échéances | Modifier, changer d'état |
| **Accords** | Liste des accords et avenants, par état | Nouvel accord, ouvrir un accord |
| **Engagements** | Pour les catégories `financial` : engagé, appelé, reçu, par accord et par projet financé | Prévoir un décaissement, constater une réception |
| **Contacts** | Personnes du partenaire, contact principal | Ajouter, archiver un contact |
| **Dossiers** | Projets et activités menés avec ce partenaire (commanditaire, financeur, interlocuteur, prestataire) | Lier un dossier |
| **Réunions** | Réunions avec ce partenaire (passées, à venir) | **Programmer une réunion avec le partenaire** |
| **Courrier** | Courriers entrants et sortants avec ce partenaire | Ouvrir au registre |
| **Documents** | Pièces de collaboration, par nature, avec aperçu intégré | Joindre une pièce |
| **Historique** | Fil chronologique : tout ce qui précède + notes d'échange + changements d'état | Ajouter une note d'échange |

**Créer une réunion avec le partenaire** : ouvre la programmation de réunion habituelle (Pilotage › Réunions) avec
le partenaire prérempli, ses contacts proposés comme **convoqués extérieurs** et l'accord concerné éventuellement
choisi. La réunion garde son domicile dans Réunions (registre des comptes rendus) et apparaît sur la fiche.

### 4.6 La fiche accord

Champs : type (référentiel), objet, partenaire(s) — **un accord peut lier plusieurs partenaires** (convention
tripartite), avec un partenaire chef de file —, référence du partenaire, date de signature, d'entrée en vigueur, de
fin, reconduction tacite (oui / non), entité porteuse, point focal, domaines, **activités du plan concernées**,
**projets mis en œuvre au titre de l'accord**, confidentialité.

Blocs : **Engagements** (de chaque partie, y compris ceux de l'Agence : contrepartie, locaux, personnel) ·
**Échéancier des décaissements** · **Pièces** (texte signé, annexes, avenants) · **Comité de suivi** (réunions
rattachées) · **Obligations de rapport** (ex. « rapport financier semestriel au bailleur » : chaque échéance devient
une tâche du point focal) · **Historique**.

### 4.7 Les liens avec les autres modules

Le principe : **là où l'on tapait un nom de tiers, on choisit désormais un partenaire de l'annuaire** (avec la
possibilité de le créer à la volée, à l'état « Identifié »). Le texte libre existant est conservé et proposé à la
reprise (§ 4.11).

| Module | Aujourd'hui | Demain |
| --- | --- | --- |
| **Projet** | `sponsor` (texte) | Commanditaire = partenaire ; **sources de financement** : budget propre ou engagement d'un partenaire (montant par source) ; accord de rattachement |
| **Activité** | `counterpart` (texte) | Interlocuteur / organisateur = partenaire (le libellé reste celui du type d'activité) |
| **Contrat de prestataire** | `consultant_name` (texte) | Cabinet = partenaire de catégorie `supplier` ; un consultant individuel reste un nom (ce n'est pas une organisation) |
| **Courrier** | `correspondent` (texte) | Correspondant = partenaire (et contact facultatif) ; le courrier apparaît sur la fiche |
| **Réunion** | Convoqués extérieurs (nom) | Partenaire(s) concerné(s) ; convoqués extérieurs = contacts du partenaire |
| **Signataire** | Documents signés | Un accord `binding` passe « en vigueur » à la signature ; la pièce signée est rangée dans l'accord |
| **Décisions** | Rattachées à un dossier | Une décision peut viser un partenaire (ex. « suspendre la convention ») |
| **Plans de travail** | Activités du plan | Un accord dit à quelles activités du plan il contribue ; le plan montre les financements attendus |
| **Structure** | Entités | Le panneau d'une entité liste les partenaires qu'elle porte |
| **Tableau de bord DG** | — | Accords arrivant à échéance, engagés / décaissés des PTF, partenaires actifs par catégorie, relations sans interaction depuis 6 mois |

### 4.8 Droits

| Droit | Qui par défaut | Permet |
| --- | --- | --- |
| `partners.view` | Tous les agents | Consulter l'annuaire et les fiches non confidentielles (contacts compris) |
| `partners.manage` | Cellule de coopération, cabinet de la DG | Créer, modifier, changer d'état, gérer les accords et engagements |
| `partners.finance` | Service administratif et financier | Voir les montants, constater les décaissements reçus |
| Point focal (rôle sur la fiche) | Désigné | Modifier la fiche et les accords qu'il suit, ajouter notes, contacts, pièces ; pas de changement d'état « Suspendu / Clos » |

Règles complémentaires :
- Un **accord confidentiel** (ou un partenaire confidentiel) n'est visible que des gestionnaires, du point focal et de
  la DG — comme les activités confidentielles.
- Les **coordonnées des contacts** sont des données personnelles : affichées aux détenteurs de `partners.view`,
  jamais exportées sans `partners.manage`, jamais envoyées à un coéquipier IA hors de la fiche demandée.
- Un **coéquipier IA** lit, résume et propose ; il ne crée ni ne modifie aucun partenaire, accord ou engagement sans
  validation humaine, et ne change jamais un état.
- Les contacts d'un partenaire n'ont **pas de compte**. Un portail partenaire (dépôt de rapports par le bailleur)
  est une évolution possible, sur le modèle de l'accès externe des consultants (P4) — hors de ce module.

### 4.9 Règles contrôlées par le serveur

| Règle | Effet |
| --- | --- |
| Nom obligatoire ; type = valeur **active** du référentiel ; catégories = valeurs actives | Refus sinon (une valeur archivée reste acceptée sur une fiche qui la porte) |
| **Doublon** : même nom normalisé (sans accents, casse, ponctuation) ou même sigle, ou même identifiant officiel (NIF, RCCM) | Refus de création avec lien vers la fiche existante ; un gestionnaire peut **fusionner** deux fiches (tous les liens suivent, tracé) |
| Changement d'état selon le cycle § 4.4 uniquement ; motif obligatoire pour Suspendu et Clos | Refus sinon |
| Partenaire « Clos » ou « Suspendu » | Plus proposé dans les sélecteurs ; aucun nouvel accord |
| Accord en vigueur : texte, parties, montants des engagements figés | Toute modification passe par un **avenant** |
| Numéro `CONV/AAAA/NNNN` attribué à l'entrée en vigueur, continu, jamais réutilisé | Registre des conventions |
| Accord de type `binding` | Entre en vigueur seulement par la signature au signataire |
| Engagement financier seulement si le partenaire a une catégorie `financial` **et** l'accord est d'un type `financial` | Refus sinon |
| Somme des décaissements prévus ≤ montant de l'engagement ; reçu constaté une seule fois, par `partners.finance` | Refus sinon, tracé |
| Financement d'un projet par un engagement : la somme affectée aux projets ≤ montant de l'engagement | Refus sinon |
| Pièce de nature `official` | Ne se supprime pas ; un remplacement crée une nouvelle pièce |
| Partenaire cité ailleurs | Ne se supprime pas (il se clôt) |
| Toute création, modification, changement d'état, fusion, constat de décaissement | Journalisé (qui, quand, avant / après) |
| Toutes les nouvelles routes | Déclarées dans `matrice.test.ts` |

### 4.10 Le coéquipier IA dans les partenariats

Toujours en proposition, validée par un humain :

| Demande | Ce que l'IA produit |
| --- | --- |
| « Prépare ma rencontre avec X jeudi » | Note de briefing : historique, accords en vigueur, engagements en retard, derniers courriers, points en suspens, propositions de messages clés |
| « Où en sommes-nous avec X ? » | Résumé de la relation à partir de la fiche |
| Dépôt d'une convention scannée | **Proposition** de fiche accord (parties, dates, montants, obligations de rapport) à relire avant création |
| Veille | Signale accords proches de l'échéance, engagements non décaissés, relations dormantes, doublons probables |
| Après une réunion avec un partenaire | Propose les obligations et suites à créer à partir du compte rendu |

### 4.11 Données (à titre de cadrage, migration `026_partenaires.sql`)

```
partners             id, org_id, name, acronym, type_code, state, country, website, address,
                     official_id, description, unit_id, focal_id, confidential,
                     state_reason, created_by, created_at, closed_at
partner_categories   partner_id, category_code                         (plusieurs par partenaire)
partner_focals       partner_id, user_id, principal                    (points focaux)
partner_contacts     id, partner_id, name, title, email, phone, principal, archived
partner_notes        id, partner_id, author_id, body, happened_on       (notes d'échange)
agreements           id, org_id, type_code, title, state, year, seq, partner_ref,
                     signed_on, effective_on, end_on, tacit_renewal, unit_id, focal_id,
                     confidential, parent_id (avenant), sign_document_id, ended_reason
agreement_parties    agreement_id, partner_id, lead
agreement_links      agreement_id, project_id | plan_activity_id
commitments          id, agreement_id, partner_id, nature (financier, technique, en nature),
                     kind (don, prêt, cofinancement…), amount, currency, description
disbursements        id, commitment_id, planned_on, amount, status (prévu, appelé, reçu),
                     received_on, reference, recorded_by
project_funding      project_id, commitment_id | NULL (budget propre), amount
partner_documents    id, partner_id | agreement_id, nature_code, filename, mime, size, data,
                     uploader_id, created_at
liens ajoutés        projects.sponsor_partner_id, agency_activities.counterpart_partner_id,
                     correspondence.partner_id / contact_id, consultant_contracts.partner_id,
                     meeting_partners (meeting_id, partner_id), meeting_attendees.contact_id
```

Toutes les tables portent `org_id` avec clés composites et RLS, comme les migrations 010 et suivantes.
États et cycles en contraintes `CHECK` ; types et catégories en codes du référentiel (`ref_values`).

**Reprise de l'existant** : un écran « Rapprocher » propose, pour chaque texte libre distinct (commanditaire,
interlocuteur, correspondant, prestataire), de le lier à un partenaire existant ou d'en créer un. Rien n'est lié
automatiquement sans relecture ; le texte d'origine est conservé.

### 4.12 Parcours de référence

**Parcours 9 — Nouer et suivre un partenariat technique et financier.**
Cas fictif : un bailleur propose d'appuyer l'élaboration des schémas provinciaux.

| Étape | Qui | Ce que l'on fait | Ce que l'outil fait ensuite |
| --- | --- | --- | --- |
| 1. Enregistrer | Cellule de coopération | Fiche partenaire : nom, sigle, type « Agence de coopération bilatérale », catégories « PTF », contact principal, point focal | Contrôle des doublons ; état « Identifié » |
| 2. Échanger | Point focal | Réunion programmée depuis la fiche, contacts convoqués ; compte rendu validé | État « En discussion » à l'ouverture de l'accord ; la réunion apparaît sur la fiche |
| 3. Négocier | Point focal, juriste | Accord « Accord de financement » : objet, engagements (montant, tranches), activités du plan, obligations de rapport | Accord « En négociation » |
| 4. Signer | DG, au signataire | Visa du juriste et de la direction financière, signature | Accord « En vigueur », numéro `CONV/2026/0004`, texte figé, partenaire « Actif » ; décision inscrite au registre si la DG le demande |
| 5. Mettre en œuvre | Responsable de projet | Projet financé : source = engagement du bailleur | Le projet affiche son financement ; le plan montre le financement attendu |
| 6. Recevoir les fonds | Service financier | Constate chaque décaissement reçu | Engagé / reçu à jour sur la fiche et au tableau de bord |
| 7. Rendre compte | Point focal | Rapport semestriel (tâche créée d'office), joint comme pièce `official` | Obligation close |
| 8. Prolonger ou clore | DG | Avenant de prolongation, ou échéance | Alerte à 90 / 30 / 7 jours ; « Échu » à défaut |

### 4.13 Lots de construction proposés

| Lot | Contenu | Dépend de |
| --- | --- | --- |
| **PA1. L'annuaire** ✅ | Référentiels (types, catégories), fiche partenaire, états et cycle, contacts, points focaux, doublons et fusion, notes d'échange, liste filtrable (type, catégorie, état, recherche), droits, journal, matrice | — |
| **PA2. Accords et pièces** ✅ | Types d'accords, fiche accord multi-parties, cycle de vie, registre `CONV/AAAA/NNNN`, avenants, pièces de collaboration par nature, passage au signataire, alertes d'échéance | PA1 |
| **PA3. Les liens** ✅ | Partenaire choisi dans projets, activités, courrier, contrats, réunions (programmer depuis la fiche, contacts convoqués) ; onglets Dossiers, Réunions, Courrier, Historique ; écran de rapprochement de l'existant | PA1 |
| **PA4. Engagements et financement** | Engagements, décaissements, financement des projets par source, lien au plan, cartes du tableau de bord DG | PA2 |
| **PA5. IA** | Note de préparation, résumé de la relation, proposition d'accord à partir d'un scan, veille | PA2, Lot D souhaitable |

Chaque lot : tests d'abord (`partenaires.test.ts`), routes dans la matrice, vérification au navigateur, données de
démonstration fictives (`npm run demo:anat`) — **jamais de vrai partenaire de l'Agence dans le dépôt**.

---

## 5. Ordre d'ensemble proposé

| Rang | Chantier | Pourquoi à ce rang |
| --- | --- | --- |
| 1 | **PA1, PA2, PA3** — Partenaires : annuaire, accords, liens | Demande nouvelle ; met fin au texte libre des tiers dans quatre modules |
| 2 | **P4** — Accès externe des consultants | Termine le dossier projet |
| 3 | **P5** — Délais en paramètres et relances | Sert réunions, courrier, missions **et échéances des accords** |
| 4 | **PA4** — Engagements et financement ; indicateurs et risques (saisie) | Complète le tableau de bord DG |
| 5 | Lot E — audit unifié ; Lot B — robustesse (file d'e-mails) | Avant la mise en production |
| 6 | Lot D — agents IA configurables, puis **PA5** | Attend la réponse à Q1 |
| 7 | Lot G — connecteurs | Plus tard |

---

## 6. Questions à trancher

| N° | Question | Proposition par défaut |
| --- | --- | --- |
| Q8 | Un **prestataire** (cabinet) est-il un partenaire de l'annuaire, ou une liste à part ? | **Un seul annuaire des tiers**, la catégorie « Prestataire » les distingue ; un consultant individuel reste un nom sur son contrat |
| Q9 | Qui tient l'annuaire : une cellule de coopération dédiée, le cabinet de la DG, chaque direction ? | Les gestionnaires (`partners.manage`) tiennent l'annuaire ; chaque direction est **point focal** des partenaires qu'elle porte |
| Q10 | Les **ministères et collectivités** (tutelle, provinces) sont-ils des partenaires ? | Oui, de type « Institution publique » / « Collectivité », catégorie « Partenaire institutionnel » : le courrier et les commissions s'y rattachent |
| Q11 | Les montants des engagements sont-ils visibles de tous les agents ? | Non : `partners.finance`, gestionnaires, point focal et DG |
| Q12 | Faut-il un **portail** pour que les bailleurs déposent leurs pièces ? | Pas dans ce module ; à envisager après P4 (accès externe) |
| Q13 | Liste des types, catégories, types d'accords et natures de pièces de départ (§ 4.3) | À valider avec la cellule de coopération ; modifiables ensuite dans les paramètres |
