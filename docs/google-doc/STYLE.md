# Style du document Google — « Projet de système de pilotage de l'ANAT »

Relevé le 25 novembre 2026 dans le document existant
(`1at2DfgeGXNAzk0MHOzYqwgvXSHe_d8yLAeMEe-JX048`), avant remplacement du contenu.
**Ce fichier est la référence du convertisseur `scripts/md-vers-docs.mjs`.** Ne pas le réinventer ailleurs.

## Page

A4 — 595,28 × 841,89 pt. Marges de **70,85 pt** (2,5 cm) sur les quatre côtés.

## Styles nommés

| Style | Police | Taille | Couleur | Espace avant | Espace après |
|---|---|---|---|---|---|
| `TITLE` | Montserrat | 28 | — | — | 4 |
| `SUBTITLE` | — | 14 | #595959 | — | — |
| `HEADING_1` | Montserrat | 20 | **#0F4761** | 18 | 4 |
| `HEADING_2` | Montserrat | 16 | **#0F4761** | 8 | 4 |
| `HEADING_3` | — | 14 | **#0F4761** | 8 | 4 |
| `NORMAL_TEXT` | Montserrat | 12 | #000000 | — | 8 |

## Tableaux

Deux gabarits, tous deux en **Montserrat 10**, bordures noires pleines.

### Gabarit « fiche » — deux ou trois colonnes

Pour les fiches d'identité : première colonne en libellés.

- Première colonne : fond **#CDECFF**, texte **gras**.
- Autres colonnes : fond blanc.
- Bordures : #000000, **0,6 pt**, `SOLID`.
- Largeurs observées (3 colonnes) : 156,75 / 202,5 / 131,25 pt.

### Gabarit « matrice » — quatre à cinq colonnes

Pour les tableaux de modules, d'exigences, de lots.

- Ligne de bande (titre de module) : fond **#007BC4**, texte **blanc gras**, fusionnée sur toute la largeur.
- Ligne d'en-têtes de colonnes : fond **#D9D9D9**, texte **gras**.
- Lignes de corps : fond blanc.
- Bordures : #000000, **0,5 pt**, `SOLID`.
- Largeurs observées (5 colonnes) : 100,5 / 111,75 / 118,5 / 200,25 / 169,5 pt — total 700,5 pt, soit la
  largeur utile d'une A4 en paysage. **En portrait, la somme doit tenir dans 453,6 pt.**

## Note

**#007BC4 est le bleu d'identité de l'ANAT**, celui des documents, des graphiques et des référentiels du
système (`docs/DESIGN-SYSTEM.md`). Le document Google et l'application parlent donc déjà la même langue
de couleur. Le bleu des titres, #0F4761, en est la déclinaison sombre.

## Révision du 25 novembre 2026

Jonathan a demandé **Montserrat partout** — titres, texte courant et tableaux. Le document d'origine
employait Play pour les titres et Aptos pour le corps ; le tableau ci-dessus porte l'état retenu.
**Les couleurs, les tailles et les gabarits de tableau ne changent pas.**
