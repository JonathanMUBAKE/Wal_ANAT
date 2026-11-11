# Paramétrage et administration système — ANAT Pilotage (Lot H)

> Demande du 10 novembre 2026 : « dynamiser le paramétrage » ; les listes métier se modifient dans les paramètres,
> dans un espace réservé à l'administrateur système. **Une seule institution**, avec ses entités et ses provinces.

## 1. Principes

1. **Une seule institution.** L'ANAT n'a pas plusieurs organisations : l'interface ne propose ni de changer
   d'organisation ni d'en créer une. L'isolation par organisation reste en place côté serveur : elle ne coûte rien
   et protège les données (aucun test ni contrôle n'est retiré).
2. **Le siège et les provinces dans une même structure.** Une représentation provinciale est une entité comme une
   autre (responsable, attributions, plan, courrier), marquée « provinciale » par son type.
3. **Un référentiel plutôt qu'une liste figée**, chaque fois qu'aucune règle ne dépend de la valeur elle-même.
   Quand une règle en dépend, elle devient une **propriété** de la valeur (ex. « confidentielle par défaut »), ce
   qui permet d'ajouter des valeurs sans toucher au code.
4. **Rien ne se perd.** Une valeur a un **code stable**, attribué à la création et jamais modifié ; seuls libellé,
   pluriel, couleur, icône, ordre et propriétés changent. Une valeur ne se supprime pas : elle **s'archive**
   (elle reste affichée sur les dossiers qui l'utilisent, elle n'est plus proposée). La dernière valeur active d'une
   liste ne s'archive pas.
5. **Réservé et tracé.** Seul l'administrateur système modifie les référentiels ; chaque création et modification
   est journalisée. Tout le monde peut les lire (ils servent à afficher).

## 2. Inventaire des listes (H1)

| Liste | Aujourd'hui | Décision | Pourquoi |
| --- | --- | --- | --- |
| **Types d'activités** (commission, conférence, rendez-vous, activité interne) | Figée (base, serveur, écrans) | **Paramétrable — ce lot** | Demandé ; les règles deviennent des propriétés |
| **Types d'entités** (direction, service, représentation provinciale…) | Texte libre | **Paramétrable — ce lot** | Porte la notion de province |
| **Types de partenaires** (institution publique, entreprise privée, établissement public…) | Nouveau | **Paramétrable — lot PA1** | Nature juridique, un seul par fiche (`docs/CONCEPTION.md` § 4.3) |
| **Catégories de partenaires** (PTF, partenaire technique, prestataire…) | Nouveau | **Paramétrable — lot PA1** | Rôle dans la relation, plusieurs par fiche |
| États d'un partenaire (identifié, en discussion, actif, suspendu, clos) | Nouveau | **Reste fixe** | Le cycle et les droits du point focal en dépendent |
| Types de réunions (comité de direction, hebdomadaire…) | Texte libre | Paramétrable — lot suivant | Aucune règle n'en dépend |
| Natures de documents du parapheur (note, lettre, arrêté…) | Texte libre | Paramétrable — lot suivant | Aucune règle n'en dépend |
| Unités des indicateurs, sources | Texte libre | Paramétrable — lot suivant | Homogénéiser les tableaux |
| Domaines d'activité | Déjà un référentiel (Organisation › Référentiel) | Inchangé | Géré par l'administration courante |
| Statuts (livrables, plans, décisions, courrier, réunions) | Figée | **Reste fixe** | Les circuits de validation en dépendent |
| États de santé (dans les temps, à surveiller…) | Figée | **Reste fixe** | Le tableau de bord calcule dessus |
| Rôles d'attribution, types de rapports entre entités | Figée | **Reste fixe** | La détection des écarts en dépend |
| Actions du parapheur (avis, visa, signature), sens du courrier | Figée | **Reste fixe** | Règles du circuit et numérotation |

## 3. Propriétés qui remplacent les règles figées

| Liste | Propriété | Effet |
| --- | --- | --- |
| Type d'activité | `confidential_default` | Une nouvelle activité de ce type est confidentielle par défaut (était : « rendez-vous ») |
| Type d'activité | `tracks_progress` | L'avancement en % est suivi et affiché (était : « activité interne ») |
| Type d'activité | `counterpart_label` | Libellé du champ interlocuteur (« Instance », « Organisateur », « Interlocuteur »…) |
| Type d'entité | `provincial` | L'entité est une représentation en province : repérée dans la structure |
| Type de partenaire | `public` | Le partenaire relève de l'État ou d'une collectivité (statistiques de l'annuaire) |
| Catégorie de partenaire | `financial` | Peut porter des engagements financiers (lot PA4) |
| Catégorie de partenaire | `supplier` | Peut être choisi comme prestataire d'un contrat de projet (lot PA3) |

Chaque valeur a aussi un **libellé**, un **pluriel**, une **couleur** (parmi une palette de huit teintes du système
de design, lisibles en clair et en sombre) et une **icône** (parmi une liste fermée).

## 4. Espace « Administration système »

Réservé à l'administrateur système (rôle `super_admin`, double authentification exigée en production), accessible
depuis le menu du compte. Onglets : **Paramètres de l'institution** (référentiels) · Comptes · Inscriptions ·
Journal de sécurité. L'administration courante (structure, personnes, profils) reste dans Organisation.

## 5. Contrat serveur

| Route | Qui | Effet |
| --- | --- | --- |
| `GET /api/referentials` | toute personne de l'institution | Toutes les listes, valeurs archivées comprises |
| `POST /api/admin/referentials` | administrateur système | Ajoute une valeur ; le code est dérivé du libellé, unique |
| `PATCH /api/admin/referentials/:id` | administrateur système | Modifie libellé, pluriel, couleur, icône, ordre, propriétés ; archive ou réactive |

Contrôles : liste connue ; libellé non vide et unique dans la liste ; couleur et icône dans les listes fermées ;
propriétés connues pour la liste ; dernière valeur active non archivable. À la création d'une activité ou d'une
entité, le type doit être une valeur **active** de l'institution (une valeur archivée reste acceptée sur un dossier
qui la porte déjà). Pour la compatibilité, une entité peut encore être créée avec le libellé d'un type.

## 6. Parcours de référence

1. L'administrateur système ouvre Administration système › Paramètres de l'institution › Types d'activités.
2. Il ajoute « Mission de terrain » : couleur, icône, « avancement suivi ».
3. Le portefeuille propose aussitôt un onglet « Missions de terrain » et le tableau de bord compte ce type.
4. Il renomme « Rendez-vous » en « Audience » : le code ne change pas, tous les dossiers suivent.
