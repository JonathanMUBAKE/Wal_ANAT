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
| `r-sm` | 6–8 px (`rounded-md`, `rounded-lg`) | Cases, compteurs, boutons-icônes, liens de navigation |
| `r-md` | 10 px (`rounded-[10px]`) | **Toutes les commandes** : boutons, champs, recherche, filtres, sélecteurs |
| `r-lg` | 14 px (`rounded-xl`) | Cartes internes : kanban, événements, détail |
| `r-xl` | 16 px (`rounded-2xl`) | Cartes de page et sections |
| `r-pill` | 999 px | **Seulement** les statuts (`Badge`) et les points de couleur |

### Hauteurs de commande
Une seule échelle : **32 px** (compacte : pagination, actions de ligne), **36 px** (par défaut : boutons, recherche, filtres, onglets segmentés), **40 px** (onglets soulignés). Deux commandes côte à côte ont toujours la même hauteur.

### Typographie (Geist)
| Rôle | Taille / graisse |
| --- | --- |
| Titre de page | 24 px, demi-gras, interlettrage −2,5 % |
| Chiffre clé | 30–32 px, demi-gras, chiffres tabulaires |
| Titre de carte | 15 px, demi-gras |
| Titre de groupe (liste) | 13,5 px, demi-gras |
| Corps | 13–13,5 px, normal |
| En-tête de colonne | 12 px, normal, gris, avec icône |
| Sceau (numéro officiel) | Mono 11 px |

### Retenue (la règle d'Asana)
- Une seule action principale bleue par écran, en haut à droite.
- Les actions de ligne restent discrètes (60 % d'opacité) et se révèlent au survol.
- Pas d'ombre portée sur ce qui est posé : un filet suffit. L'ombre est réservée au survol, au menu, au dialogue.
- Les couleurs vives ne servent qu'aux statuts et aux formes d'activité ; le reste est en encre et en gris.
- Une page n'a qu'une rangée d'onglets. Pas de tuiles de chiffres sur une page de liste : les compteurs vivent dans les en-têtes de groupe.

### Espacement, élévation, mouvement
- Grille de 4 px ; marges de carte 20 px ; écart entre cartes 16 px.
- Élévation : `--shadow-sm` (posé), `--shadow-md` (survol, carte mise en avant), `--shadow-lg` (dialogue).
- Mouvement : 150–250 ms, sur l'opacité et la position ; cascades limitées à 12 éléments ; tout est coupé si le poste demande moins d'animations.

## 3. Composants

| Composant | Règle |
| --- | --- |
| **Bouton** | 36 px, rayon 10 px. Un seul bouton principal par zone, **à l'encre bleu nuit** (`btn-brand`) ; le bleu vif est réservé à la sélection, aux liens et aux onglets actifs. Libellé = verbe + objet. |
| **Vue d'ensemble** | Les chiffres clés vivent dans **une seule carte** découpée par des filets, chaque cellule : icône grise + libellé, chiffre, petite pastille d'état (vert, orange, rouge, gris). |
| **Bandeau IA** | Message de l'IA en bandeau clair d'une ligne sous l'en-tête, avec le carré d'icône IA ; jamais de gros bloc sombre. |
| **Bouton-icône** | 32 px, rayon 8 px, sans bordure, toujours avec une étiquette accessible. |
| **Onglets soulignés** | Vues et sections d'une page ; trait bleu de 2 px sous l'actif, icône bleue. |
| **Onglets segmentés** | Seulement pour une période (Jour · Semaine · Mois) : rail gris, actif blanc en relief. |
| **Statut (`Badge`)** | Pilule douce bordée, point de couleur + mot. |
| **Sceau** | Numéro officiel en mono, sur fond gris clair, jamais tronqué. |
| **Champ** | Libellé permanent au-dessus, halo bleu au focus, erreur écrite sous le champ. |
| **Recherche** | Champ de 36 px, rayon 10 px, loupe et raccourci « / ». |
| **Panneau de filtres** | Colonne repliable, groupes titrés en petites capitales, cases à cocher. Le bouton « Filtres » affiche le nombre de filtres actifs. |
| **Tableau de données** | Case de sélection, en-têtes triables, cellules sur deux lignes (titre + précision), actions à droite, pagination « Page 1 sur 4 · 10 lignes ». Barre d'actions groupées dès qu'une ligne est cochée. |
| **Colonne de tableau (kanban)** | En-tête : statut en pastille + nombre. Cartes de 18 px de rayon, paires libellé/valeur. |
| **Calendrier semaine** | Tuiles de jour en tête (le jour même en encre), grille horaire à filets, blocs d'événement teintés selon l'étape, liseré gauche de la couleur pleine. |
| **Carte de rappel** | Carte encre avec relief topographique : prochaine échéance et action directe. |
| **Panneau de détail** | À droite de la vue, sections titrées, actions en pied (secondaire + principal). |

## 4. Gabarits

### Collection (CRUD) — `CollectionHeader`
1. Fil d'Ariane (« Pilotage › Réunions »).
2. Ligne de titre : carré d'icône bleu 36 px, titre 24 px, compteur gris (« 5 réunions »), action principale à droite.
3. Phrase d'aide, une seule ligne.
4. Rangée d'onglets soulignés : les vues (Liste · Tableau · Calendrier), un séparateur, puis les sections voisines (Recommandations · Les miennes). À droite, sur la même ligne : recherche et Filtres.
5. Corps : panneau de filtres (repliable) + vue choisie.

**Liste groupée** (`GroupedTable`) : une section par étape, en-tête teinté de la couleur d'étape (8 %), chevron de repli, icône, libellé, compteur. Colonnes à largeur fixe identiques d'un groupe à l'autre, en-têtes avec icône. Le repli de chaque groupe et le choix de vue sont mémorisés sur le poste.

### Fiche — consulter d'abord, modifier ensuite (`components/record.tsx`)
1. Une fiche (partenaire, accord, réunion, activité, contact, document…) **s'ouvre toujours en lecture** : faits en paires libellé / valeur (`Facts`, `Fact`), textes longs en paragraphes (`LongText`), aucun champ de saisie.
2. En tête, à droite : **« Modifier »** si le profil le permet (`RecordActions`). Pendant la modification : **« Annuler »** (rien n'est perdu côté serveur) et **« Enregistrer »** (principal). On ne quitte jamais une fiche avec des champs ouverts sans l'avoir décidé.
3. Les actes du circuit (changer l'état, soumettre au parapheur, résilier…) restent des boutons distincts, chacun avec sa boîte de dialogue ; ils ne se mêlent pas à la modification.
4. Une petite fiche (contact, document, courrier, décision) s'ouvre dans un **tiroir** à droite, sur le même principe : lecture, puis « Modifier ».

### Grille CRUD
1. **Créer** : bouton principal en tête de page ou de section (« Nouveau partenaire », « Ajouter un contact », « Ajouter un document »).
2. **Consulter** : le clic sur la ligne ouvre la fiche en lecture.
3. **Modifier, supprimer** : boutons-icônes en bout de ligne (`RowActions` : œil, crayon, corbeille), puis les actions propres à l'objet (archiver, télécharger).
4. **Selon les droits** : un bouton n'apparaît que si le profil peut agir ; le serveur refuse de toute façon ce qui n'est pas permis. Ce qui ne se supprime pas par règle (pièce officielle, acte numéroté, fiche qui a une histoire) se clôt, s'archive ou se remplace : la corbeille n'apparaît pas et la fiche dit pourquoi.
5. **Contrôles** : toute règle de saisie (champ obligatoire selon le type, dates cohérentes, doublon) est vérifiée par le serveur ; l'écran la montre sous le champ avant l'envoi.

### Où s'ouvre quoi — page, tiroir, modal (`components/drawer.tsx`)
| Surface | Pour | Exemples |
| --- | --- | --- |
| **Page** | Un dossier qui a ses propres onglets et une vie longue | Partenaire, accord, projet, réunion, activité, plan |
| **Tiroir** (à droite, 600 px, plein écran sur téléphone) | **Consulter** une fiche secondaire sans quitter la liste, puis la modifier sur place | Contact, document, courrier, décision, document du parapheur, recommandation |
| **Modal** (centré) | **Décider** : confirmer, motiver, choisir une option courte | Supprimer, résilier, rejeter avec motif, changer d'état, abandonner des modifications |

Le modal n'est jamais une fiche de consultation ; le tiroir n'est jamais une confirmation. Un tiroir n'en ouvre pas un autre : un lien vers un autre objet mène à sa page ou remplace le contenu du tiroir.

### Charpente de l'application (modèle Tracklio / Oripio)
- **Barre du haut** (64 px, blanche, filet en bas) : recherche bordée à gauche (« Rechercher une réunion, un dossier, une personne… », ⌘K) ; à droite, carrés d'icône bordés de 40 px (Assistant IA, Boîte de réception, Notifications avec pastille rouge), puis la pastille du compte (photo, nom, rôle, chevron) qui ouvre profil, sécurité, organisations, thème et déconnexion.
- **Barre latérale** (256 px, blanche) : en tête, sur 64 px alignés avec la barre du haut, le logo ANAT, « ANAT Pilotage » et l'organisation. Puis Accueil, Mes tâches, Coéquipiers IA ; des sections titrées en **petites capitales** avec chevron : PILOTAGE, SUIVI-ÉVALUATION, SECRÉTARIAT, ORGANISATION. Le contenu de chaque section est fixé par `docs/ARCHITECTURE-INFORMATION.md`. Liens de 36 px, rayon 10 px, icône 18 px ; actif : fond bleu très léger, texte et icône bleus. En pied : Assistant IA.
- **Tableaux** : l'en-tête des colonnes est une **bande grise arrondie** (fond `--bg`, rayon 10 px) posée dans la carte blanche, libellés 12 px moyens.

### Calendrier
Colonne gauche : mini-mois, carte de rappel, légende-filtre. Centre : en-tête de période (‹ date ›, Aujourd'hui, Jour/Semaine/Mois). Droite : détail de l'élément choisi.

## 5. Règles de comportement — une institution publique

L'outil sert une administration : il doit inspirer confiance par sa **prévisibilité**. Ces règles s'appliquent à
chaque écran ; une revue d'écran les vérifie une à une.

### 5.1 Prévisibilité
1. **Un geste, un effet, partout le même** : le clic sur une ligne consulte ; le crayon modifie ; la corbeille supprime ; « Enregistrer » est toujours le bouton principal à droite ; « Annuler » ne fait jamais rien d'irréversible.
2. **Aucune action ne surprend** : un bouton annonce ce qu'il fait (verbe + objet : « Imputer le courrier », « Déclarer en vigueur »), jamais « OK » ni « Valider » seul.
3. **Ce qui n'est pas permis n'est pas proposé.** Un bouton absent vaut mieux qu'un bouton qui échoue ; quand la règle mérite d'être connue (pièce officielle, accord conclu), la fiche dit pourquoi l'action n'existe pas.

### 5.2 Aucune perte silencieuse
4. **Des champs ouverts et modifiés ne se ferment pas sans confirmation** (tiroir, page, navigation).
5. **Une saisie refusée reste à l'écran**, avec le message sous le champ concerné ; rien n'est vidé après une erreur.
6. **Pas d'enregistrement automatique des fiches** : la personne décide du moment où sa modification devient officielle.

### 5.3 Actes et conséquences
7. **Avant un acte irréversible** (supprimer, résilier, valider un compte rendu, déclarer en vigueur), le modal nomme l'objet, dit la conséquence et rappelle ce qui sera tracé. Le bouton de confirmation reprend le verbe (« Résilier »), en rouge s'il détruit.
8. **Ce qui fait foi ne se supprime pas** : acte numéroté, pièce officielle, fiche qui a une histoire. Il se remplace (avenant, décision de remplacement), se clôt ou s'archive.
9. **Le motif est obligatoire** pour suspendre, clore, rejeter, résilier, rouvrir : il est conservé à l'historique.

### 5.4 Lisibilité
10. **Un état se lit sans la couleur** : pastille + mot (« En vigueur »), jamais une couleur seule.
11. **Numéros officiels en sceau** (`CONV/2026/0004`, `ENT/2026/0142`), jamais tronqués ; dates au format **jj/mm/aaaa** ; montants avec séparateur de milliers et devise.
12. **Une valeur absente s'écrit « — »**, pas un champ vide ni « null ».
13. **Langue administrative sobre** : vouvoiement implicite, phrases courtes, pas d'anglicisme ni de familiarité, pas de point d'exclamation.

### 5.5 Retour d'information
14. **Succès** : message bref en bas d'écran (« Accord enregistré »), qui disparaît seul. **Échec** : message clair du serveur, en français, qui dit quoi faire ; il reste jusqu'à ce que la personne le ferme.
15. **Chargement** : squelette à la place du contenu, jamais d'écran blanc ; bouton en cours d'envoi désactivé (pas de double envoi).
16. **Liste vide** : une phrase qui dit pourquoi elle est vide et quoi faire, avec le bouton de création si le droit existe.

### 5.6 Traçabilité et confidentialité
17. **Chaque fiche dit qui l'a créée ou modifiée, et quand** (pied de fiche ou historique).
18. **Une information confidentielle porte son cadenas** partout où elle apparaît ; elle n'apparaît jamais à qui n'y a pas droit, même dans un compteur.

### 5.7 Accessibilité et clavier
19. Échap ferme le tiroir ou le modal (avec la confirmation de la règle 4) ; le focus revient à l'élément qui l'a ouvert.
20. Chaque bouton-icône a une étiquette ; chaque champ, un libellé permanent ; contraste conforme RGAA / WCAG AA.

## 6. Écriture de l'interface

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
