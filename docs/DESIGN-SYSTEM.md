# Cadastre — système de design d'ANAT Pilotage

> Le cadastre est le plan qui découpe le territoire en parcelles nettes, numérotées et opposables.
> C'est l'esprit de l'interface : une grille rigoureuse, des pièces numérotées, de la couleur seulement
> là où elle porte un sens. Institutionnel, donc fiable ; raffiné, donc jamais austère.

Ce document fait foi pour tout nouvel écran. Le code de référence se trouve dans
`web/src/styles.css` (jetons), `web/src/components/ui.tsx` (primitives),
`web/src/components/gov.tsx` (formulaires et statuts) et `web/src/components/collection.tsx`
(listes, tableaux, calendriers).

## 1. Principes

| Principe | Ce que cela veut dire à l'écran |
| --- | --- |
| **Clarté d'abord** | Une page répond à une question. Le chiffre ou l'action qui compte est en haut à gauche. |
| **Preuve visible** | Tout document porte son numéro officiel (« sceau »), son statut écrit et son auteur. Un document validé se lit comme figé. |
| **Couleur signifiante** | Le bleu de l'Agence pour l'action, les couleurs d'état pour l'état, une teinte par forme d'activité. Aucune couleur décorative. Jamais la couleur seule : toujours un mot ou une icône. |
| **Mêmes gestes partout** | Toute collection (réunions, livrables, courrier…) a la même barre d'outils, les mêmes vues et la même pagination. |
| **L'IA propose, l'humain décide** | Ce que produit l'IA porte le violet réservé et un bouton de décision humaine. |

## 2. Jetons

### Surfaces
| Jeton | Clair | Usage |
| --- | --- | --- |
| `--bg` « sol » | `#F1F4F8` | Fond d'application, sous les cartes |
| `--panel` « parcelle » | `#FFFFFF` | Cartes, tableaux, panneaux |
| `--night` « encre » | `#0B2A45` | Élément actif fort (onglet, vue), cartes de synthèse |
| `--line` / `--line-strong` | 6 % / 12 % d'encre | Filets ; jamais d'ombre lourde |

### Couleurs de marque et d'état
- Action : `--primary` `#007BC4` (bleu ANAT), survol `#006BAB`.
- États : `--success` (validé, dans les temps), `--warning` (à surveiller, à valider), `--danger` (retard, refus), `--info` (en cours).
- Formes d'activité : `--form-projet_interne`, `--form-projet_confie`, `--form-commission`, `--form-conference`, `--form-rendez_vous`, `--form-interne`.
- IA : `--ai` violet, réservé.
- Chaque couleur existe en version « douce » (`*-soft`) pour les fonds de pastilles et d'événements.

### Rayons (géométrie)
| Jeton | Valeur | Pour |
| --- | --- | --- |
| `r-sm` | 8 px | Cases à cocher, petites étiquettes |
| `r-md` | 12 px | Champs, cartes d'événement, cellules de calendrier |
| `r-lg` | 18 px | Cartes internes (kanban, rappel) |
| `r-xl` | 24 px | Cartes de page, panneaux |
| `r-pill` | 999 px | Boutons, onglets, filtres, recherche, statuts |

### Typographie (Geist)
| Rôle | Taille / graisse |
| --- | --- |
| Titre de page | 32–38 px, demi-gras, interlettrage −3 % |
| Chiffre clé | 40–44 px, demi-gras, chiffres tabulaires |
| Titre de carte | 16–17 px, demi-gras |
| Corps | 13,5–14 px, normal |
| Libellé de champ / en-tête de colonne | 12–12,5 px, moyen, gris |
| Sceau (numéro officiel) | Mono 11,5–12 px |

### Espacement, élévation, mouvement
- Grille de 4 px ; marges de carte 20 px ; écart entre cartes 16 px.
- Élévation : `--shadow-sm` (posé), `--shadow-md` (survol, carte mise en avant), `--shadow-lg` (dialogue).
- Mouvement : 150–250 ms, sur l'opacité et la position ; cascades limitées à 12 éléments ; tout est coupé si le poste demande moins d'animations.

## 3. Composants

| Composant | Règle |
| --- | --- |
| **Bouton** | Pilule. Un seul bouton principal (bleu) par zone. Libellé = verbe + objet. |
| **Bouton rond** | Icône seule dans un cercle bordé, toujours avec une étiquette accessible. |
| **Statut (`Badge`)** | Pilule douce bordée, point de couleur + mot. |
| **Sceau** | Numéro officiel en mono, sur fond gris clair, jamais tronqué. |
| **Champ** | Libellé permanent au-dessus, halo bleu au focus, erreur écrite sous le champ. |
| **Sélecteur de vue** | Groupe segmenté d'icônes et de mots : Liste, Tableau, Calendrier. L'actif est en encre. |
| **Recherche** | Pilule avec loupe et raccourci « / ». |
| **Panneau de filtres** | Colonne repliable, groupes titrés en petites capitales, cases à cocher. Le bouton « Filtres » affiche le nombre de filtres actifs. |
| **Tableau de données** | Case de sélection, en-têtes triables, cellules sur deux lignes (titre + précision), actions à droite, pagination « Page 1 sur 4 · 10 lignes ». Barre d'actions groupées dès qu'une ligne est cochée. |
| **Colonne de tableau (kanban)** | En-tête : statut en pastille + nombre. Cartes de 18 px de rayon, paires libellé/valeur. |
| **Calendrier semaine** | Tuiles de jour en tête (le jour même en encre), grille horaire à filets, blocs d'événement teintés selon l'étape, liseré gauche de la couleur pleine. |
| **Carte de rappel** | Carte encre avec relief topographique : prochaine échéance et action directe. |
| **Panneau de détail** | À droite de la vue, sections titrées, actions en pied (secondaire + principal). |

## 4. Gabarits

### Collection (CRUD)
1. En-tête : icône, titre, compteur (« 12 réunions »), phrase d'aide, bouton principal.
2. Bande de chiffres (facultative) : 3 à 4 compteurs cliquables qui filtrent.
3. Barre d'outils : Filtres · sélecteur de vue · recherche.
4. Corps : panneau de filtres (repliable) + vue choisie.
5. Pied : pagination ou total.

Le choix de vue et le panneau de filtres sont mémorisés sur le poste.

### Calendrier
Colonne gauche : mini-mois, carte de rappel, légende-filtre. Centre : en-tête de période (‹ date ›, Aujourd'hui, Jour/Semaine/Mois). Droite : détail de l'élément choisi.

## 5. Écriture de l'interface

Ton : **institutionnel et chaleureux**. On vouvoie, on parle concret, on n'emploie ni jargon informatique ni anglicisme.

| Règle | Oui | Non |
| --- | --- | --- |
| Verbe + objet | « Créer la réunion », « Valider le compte rendu » | « OK », « Soumettre » |
| Même mot pour la même chose | « compte rendu », « recommandation », « rédacteur » | alterner « PV », « action », « auteur » |
| État vide = quoi + pourquoi + comment | « Aucune réunion cette semaine. Planifiez-en une avec « Nouvelle réunion ». » | « Pas de données » |
| Erreur = ce qui s'est passé + quoi faire | « Le compte rendu n'a pas été enregistré : la connexion a été perdue. Réessayez. » | « Erreur 500 » |
| Confirmation = action + conséquence | « Supprimer la réunion 0007/ANAT/… ? Le compte rendu et ses recommandations seront supprimés définitivement. » / « Supprimer » · « Conserver » | « Êtes-vous sûr ? » |
| Dates et heures à la française | « mar. 10 nov. », « 9 h 30 – 11 h » | « 11/10 », « 9:30 AM » |

### Lexique des réunions
| Terme | Définition affichée |
| --- | --- |
| À venir | Réunion planifiée dont la date n'est pas passée |
| Compte rendu à établir | Réunion passée sans compte rendu saisi |
| À valider | Compte rendu rédigé, en attente de validation par une autre personne que le rédacteur |
| Validé | Compte rendu figé, exportable au modèle officiel |
| Annulée | Réunion qui n'a pas eu lieu |

### Textes de référence des vues Réunions
- Sélecteur de vue : **Liste** · **Tableau** · **Calendrier**.
- Recherche : « Rechercher une réunion, un lieu, un numéro… ».
- Barre groupée : « 3 réunions sélectionnées » · « Exporter la sélection » · « Désélectionner ».
- Vide filtré : « Aucune réunion ne correspond à ces filtres. » · « Effacer les filtres ».
- Carte de rappel : « Prochaine réunion » · « Ouvrir le compte rendu ».
- Colonne vide du tableau : « Rien à cette étape. ».

### Notes de traduction
Les libellés français sont 15 à 30 % plus longs que l'anglais : boutons et pastilles s'élargissent avec leur texte, jamais de largeur fixe. Pas de majuscule à chaque mot.
