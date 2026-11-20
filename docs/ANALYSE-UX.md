# Analyse UX, écran par écran

Analyse de l'expérience utilisateur d'ANAT Pilotage, menée le 20/11/2026 à la demande de l'utilisateur : « le logiciel
doit faciliter la compréhension de tout ce qui est mis ». Pour chaque écran : ce qui gêne la compréhension, la
disposition proposée, et des références (produits de travail réputés, systèmes de design publics, galeries de design).
Données fictives uniquement.

## Méthode

- Écrans parcourus dans la démonstration, sous le compte de la DG et d'un chef d'entité, en largeur de bureau
  (1440 px) et de téléphone (375 px). Les comptes sont désignés par leur fonction : Directrice générale, Directeur,
  Chef de cellule, Agent.
- Écrans examinés : Accueil, Tableau de bord DG, Mes tâches, Mon entité, Portefeuille, Projet (liste, tableau de bord),
  Décisions, Réunions (liste et fiche), Risques et indicateurs, Plans de travail, Partenaires, Conventions, Parapheur,
  Courrier, Structure, Ressources humaines, Congés, Coéquipiers IA.
- Recherche des normes applicables en 2026 et de références par type d'écran (Linear, Stripe, Asana, Attio, GOV.UK,
  GC Design System, DSFR, Dribbble). Limite : les galeries Dribbble et Pinterest ont été consultées par leurs fiches et
  leurs titres, sans pouvoir y ouvrir les images en grand ; les liens sont donnés pour que l'équipe les regarde.

## Normes en vigueur en 2026 pour un logiciel institutionnel

| Référentiel | Ce qu'il impose | Conséquence pour ANAT Pilotage |
|---|---|---|
| RGAA 4.1.2 (France, opposable) | Accessibilité des services publics numériques, sur la base des WCAG 2.1 AA | Niveau minimal à atteindre et à déclarer (déclaration d'accessibilité) |
| RGAA 5 (publication prévue fin 2026) | Reprise des WCAG 2.2 et des applications mobiles | Anticiper dès maintenant les critères WCAG 2.2 |
| WCAG 2.2 AA | Neuf critères nouveaux : cible d'au moins 24 px, focus jamais masqué, alternative au glisser-déposer, aide au même endroit, pas de ressaisie, authentification sans test cognitif | Tableau de tâches : chaque glisser doit avoir un équivalent par menu ; boutons-icônes à 24 px au moins ; barre du haut qui ne masque pas le focus |
| EN 301 549 v4.1.1 (septembre 2026) | Norme européenne harmonisée, alignée sur les WCAG 2.2, qui couvre aussi les documents et logiciels | Les exports (Word, PDF, tableur) doivent être accessibles : titres structurés, tableaux avec en-têtes, texte réel |
| Acte européen d'accessibilité (en vigueur depuis le 28/06/2025) | Accessibilité des produits et services numériques | Référence pour tout bailleur ou partenaire européen qui évalue l'outil |
| Systèmes de design publics (DSFR en France, GC Design System au Canada, GOV.UK) | Composants éprouvés : liste de synthèse (« summary list »), liste de tâches, chronologie, tableau, étiquette de statut | Reprendre leurs modèles de présentation, sans leur charte graphique (l'ANAT garde la sienne) |

Le GC Design System canadien est sorti de sa phase d'essai en mars 2026 et vise au moins les WCAG 2.1 AA ; c'est la
référence la plus proche de la politique d'accès déjà retenue (modèle canadien).

## Constats transverses

1. **L'action passe avant l'information.** Le tableau de bord DG ouvre sur un bloc « Saisir » de six boutons ; sur
   téléphone, il occupe tout le premier écran et les chiffres n'apparaissent qu'après défilement. Un tableau de bord
   répond d'abord à « où en est-on ? », puis propose d'agir.
2. **Deux écrans disent la même chose.** L'Accueil de la DG et le Tableau de bord DG présentent chacun courrier,
   parapheur, entité, congés, tâches et projets, avec des chiffres qui se recoupent.
3. **Des phrases dans les cellules.** La colonne « Appréciation » du tableau par direction contient deux ou trois
   phrases par ligne ; les pastilles des chiffres clés sont tronquées (« 5 tâches, 1 suite d'activité… »).
4. **Un objet, plusieurs statuts.** Le portefeuille affiche « À surveiller » et dessous « déclaré : Dans les temps » ;
   le lecteur ne sait pas lequel croire.
5. **Des champs vides affichés.** La fiche réunion montre « Animation — », « Gardien du temps — », « Convoqué par — »,
   « Dossier — » ; le lieu se répète (« Visioconférence · visioconférence ») ; participants et convoqués sont deux listes
   presque identiques.
6. **Trop d'onglets.** Portefeuille : neuf onglets sur deux lignes ; Projet : dix onglets ; Mon entité : neuf.
7. **Des tableaux qui débordent sur téléphone.** Décisions, courrier et conventions défilent de côté sur mobile ; le
   titre de la décision est coupé.
8. **Des titres tronqués.** Le nom d'un projet est coupé dans son en-tête alors que la place existe en dessous.
9. **Des chiffres sans repère.** « Activités suivies : 13 » ne dit pas si c'est bien ou mal ; aucune tendance, aucune
   cible.
10. **Des graphiques vides.** La pyramide des âges des RH affiche cinq barres à zéro, avec la mention « 17 dossiers sans
    date de naissance ».
11. **Des pluriels techniques.** « 1 absent(s) aujourd'hui », « 1 document(s) en attente ».
12. **Un ton de page d'accueil commerciale.** La page Coéquipiers IA s'ouvre sur un grand titre de deux lignes et trois
    cartes d'explication avant de montrer les coéquipiers.
13. **Thème sombre par défaut dans la démonstration.** Les systèmes publics proposent un thème clair par défaut, le
    sombre restant un choix ; le contraste des textes secondaires en sombre est à vérifier.

## Principes cibles

Ils s'inspirent de Linear (sobriété, liste et panneau de détail), de Stripe (pages de synthèse et de détail), d'Asana
(statut de projet et portefeuille), d'Attio (fiche avec chronologie) et des systèmes de design publics.

| Principe | Ce que cela veut dire à l'écran | Inspiré de |
|---|---|---|
| Une question par écran | Le titre dit la question (« Où en est l'Agence ? »), le premier bloc y répond | Stripe, pages de synthèse |
| Information, puis action | Chiffres et exceptions d'abord ; actions dans l'en-tête ou au clic droit | Linear : ne pas réclamer une attention non méritée |
| Un seul statut visible | Le statut calculé s'affiche ; le statut déclaré n'apparaît qu'en cas d'écart, avec son explication | Asana, statut de projet |
| Liste, puis détail à côté | Un clic ouvre un panneau latéral ; la liste reste visible ; plein écran au besoin | Linear, vue partagée |
| Fiche = synthèse + chronologie | Propriétés en liste clé-valeur à droite, contenu au centre, historique daté en dessous | Stripe (page de détail), Attio, GOV.UK (liste de synthèse), chronologie MoJ/DWP |
| Ne montrer que ce qui est renseigné | Un champ vide disparaît en lecture ; il reparaît en modification | GOV.UK, liste de synthèse |
| Chiffre + repère | Chaque chiffre clé porte sa tendance ou sa cible, et un lien vers le détail | Stripe, chiffres clés |
| Statut = couleur + icône + mot | Jamais la couleur seule (exigence d'accessibilité) | WCAG 2.2, DSFR (étiquettes) |
| Sur téléphone, des cartes | Une ligne de tableau devient une carte : titre, statut, échéance, responsable | Guides 2026 sur les tableaux de données |
| Cinq onglets au plus | Le reste passe dans un menu « Plus » ou devient une section | Asana, en-tête de projet |

## Écran par écran

### Accueil

**Ce qui gêne.** Le très grand « Bonjour » et la date occupent le haut de l'écran sans information ; quatre cartes,
puis mes tâches, puis les projets, puis les réunions à droite : tout a le même poids. Pour la DG, l'écran double son
tableau de bord.

**Disposition proposée.** Un en-tête court (« Bonjour » et le prénom sur une ligne, la date en petit). Puis une seule
rangée « Ce qui m'attend aujourd'hui » : trois à quatre compteurs cliquables (à signer, à imputer, à valider, en retard),
chacun avec son action. En dessous, deux colonnes : à gauche « Mes tâches » (cinq au plus, lien « Tout voir ») ; à droite
« Mon agenda » (réunions du jour et de la semaine). Les projets passent dans « Portefeuille ». Pour la DG et le cabinet,
l'Accueil devient leur tableau de bord (un seul écran au lieu de deux).

**Références.** Asana, « My Dashboard » ; Stripe, page d'accueil du tableau de bord (chiffres clés, puis activité).

### Tableau de bord DG

**Ce qui gêne.** Le bloc « Saisir » passe avant les chiffres ; les chiffres clés n'ont ni tendance ni cible ; la
colonne « Appréciation » est rédigée ; les blocs du bas (santé, décisions, agenda, priorités, IA, indicateurs, risques)
ont tous la même taille, sans ordre de lecture.

**Disposition proposée.**
1. En-tête : titre « Où en est l'Agence », date, un bouton « Nouvelle… » qui ouvre le menu des six saisies.
2. Rangée de quatre chiffres clés (activités dans les temps, décisions à prendre, retards, à signer), chacun avec sa
   tendance sur quatre semaines et un lien vers la liste filtrée.
3. Bloc « À trancher par la DG » : arbitrages, décisions à confirmer et documents à signer, en une seule liste
   d'exceptions triée par échéance.
4. Tableau « Par direction » réduit à cinq colonnes : direction, statut (une étiquette), plan de travail (barre avec
   repère de l'attendu), retards (un nombre), lien. Les phrases d'appréciation passent en infobulle ou dans la fiche
   de la direction.
5. En bas, deux colonnes : risques majeurs (matrice compacte) et indicateurs stratégiques (barres avec cible).
6. L'assistant IA quitte le corps de la page et reste accessible depuis la barre du haut.

**Références.** Stripe, modèle de page de synthèse (chiffres et graphiques en tête, modules secondaires en colonne) ;
exemple de tableau de bord du secteur public SimpleKPI (délais, file d'attente, cibles) ; collection Dribbble « KPI
Cards ».

### Mes tâches

**Ce qui gêne.** Le bouton « Tâche hors projet » flotte au milieu de l'en-tête ; les livrables et les tâches se suivent
sans distinction forte ; la ligne de tâche affiche étiquettes, projet, drapeau, date et avatar avec le même poids.

**Disposition proposée.** En-tête : titre, recherche et filtres à droite, bouton « Nouvelle tâche » à droite. Deux
onglets : « Tâches » et « Livrables ». Liste groupée par échéance (En retard, Aujourd'hui, Cette semaine, Plus tard),
chaque ligne : case, titre, projet (texte gris), échéance (rouge si dépassée). Étiquettes et priorité en survol ou dans
le panneau de détail. Le détail s'ouvre en panneau latéral.

**Références.** Linear, « My Issues » (groupes, ligne sobre, panneau de détail) ; Asana, « Mes tâches ».

### Mon entité

**Ce qui gêne.** L'en-tête porte le titre, un lien, un sélecteur et trois boutons sur une ligne ; neuf onglets ; la
première carte (« Réunions de l'entité ») affiche une phrase d'état vide au lieu d'un raccourci.

**Disposition proposée.** En-tête : nom de l'entité et sélecteur d'entité dans le titre même (menu déroulant), un seul
bouton « Confier une tâche » et un menu « Nouveau » (réunion, projet). Onglets ramenés à cinq : Vue d'ensemble, Tâches
(avec bascule liste, tableau, calendrier, chronologie), Projets, Réunions, Agents. Vue d'ensemble : chiffres clés
(ouvertes, en retard, sous sept jours, achèvement), puis « Ce qui presse » et « Charge par agent » (barres
horizontales).

**Références.** Linear, page d'équipe (vues dans un seul onglet avec bascule d'affichage) ; Dribbble, « Team Management
Calendar UI Dashboard ».

### Portefeuille

**Ce qui gêne.** Neuf onglets sur deux lignes ; deux statuts superposés ; des colonnes peu utiles (« Suites ouvertes » à
« — » partout) ; actions en icônes seulement sur une partie des lignes.

**Disposition proposée.** Trois onglets : « Revue » (DG et cabinet), « Dossiers », « Arbitrages ». Dans « Dossiers », un
filtre « Nature » (projet, commission, conférence…) remplace les onglets par nature. Colonnes : dossier, nature,
responsable, échéance, santé (une étiquette ; l'écart avec la santé déclarée signalé par une icône et expliqué en
infobulle), avancement (barre). Une vue « Cartes » en option pour la revue, à la manière des portefeuilles Asana.

**Références.** Asana, portefeuilles (statut par projet, vue d'ensemble) ; Stripe, listes avec filtres.

### Projet

**Ce qui gêne.** Nom tronqué ; description sur deux lignes dans l'en-tête ; dix onglets ; trois boutons d'action ;
dans le tableau de bord du projet, la liste des risques répète la colonne « Projet ».

**Disposition proposée.** En-tête sur deux lignes : nom complet et statut ; puis responsable, échéance, accès, membres.
La description passe dans l'onglet « Aperçu ». Onglets : Aperçu, Tâches (liste, tableau, calendrier, chronologie en
bascule), Livrables, Documents, Plus (contrats, réunions, automatisations). Aperçu : statut déclaré avec son mot du
responsable (comme une mise à jour de statut Asana), budget, prochaines échéances, risques (sans colonne Projet),
arbitrages.

**Références.** Asana, onglet « Aperçu » et mises à jour de statut ; Linear, page de projet.

### Décisions

**Ce qui gêne.** Le titre de la décision est coupé ; la fiche s'ouvre en panneau mais mêle consignes, champs et
actions ; sur téléphone, le tableau défile de côté.

**Disposition proposée.** Liste groupée par état (déjà en place), colonnes : numéro, décision (titre sur deux lignes au
plus), chargé d'exécution, échéance, état. Fiche en panneau : en haut le numéro et l'état ; au centre le texte de la
décision ; à droite (ou en dessous sur téléphone) la liste de synthèse (décidée le, source, chargé d'exécution,
échéance) ; en bas la chronologie (inscrite, confirmée, déclarée exécutée, confirmée exécutée). Sur téléphone, une carte
par décision.

**Références.** GOV.UK, liste de synthèse ; chronologie des systèmes MoJ et DWP ; Stripe, page de détail.

### Réunions

**Ce qui gêne.** Liste : neuf colonnes dont plusieurs tronquées. Fiche : champs vides affichés, lieu répété,
participants et convoqués en double, le bouton « Envoyer la convocation » au milieu de la page.

**Disposition proposée.** Liste par défaut en vue « Agenda » (date en grand à gauche, titre, lieu, rôle « Vous
présidez ») plutôt qu'en tableau. Fiche : une barre d'étapes en haut (Programmée → Convoquée → Tenue → Compte rendu
validé), l'action de l'étape en cours en bouton principal ; à gauche l'ordre du jour et les délibérations ; à droite la
liste de synthèse (date, lieu, présidence, rédaction) sans champ vide ; une seule liste « Convoqués » avec la présence
en colonne.

**Références.** Fellow (ordre du jour et actions) ; GOV.UK, liste de tâches pour la barre d'étapes ; GOV.UK, liste de
synthèse.

### Risques et indicateurs

**Ce qui gêne.** Les risques sont une liste ; le niveau se lit en texte (« probabilité 4 × impact 5 ») ; aucune vue
d'ensemble.

**Disposition proposée.** En tête, une matrice 5 × 5 (probabilité en ligne, impact en colonne, cases colorées du vert au
rouge, chaque risque en pastille numérotée cliquable). En dessous, la liste triée par niveau, avec le niveau en étiquette
colorée et le chiffre. Indicateurs : une carte par indicateur avec la valeur, la cible et une courbe des mesures.

**Références.** Démonstration amCharts « Risk heatmap » (25 cases du vert au rouge) ; cartes de chaleur HighBond (3 × 3,
4 × 4, 5 × 5) ; collection Dribbble « Data Visualization ».

### Plans de travail

**Ce qui gêne.** Le bandeau de campagne énumère onze entités et leurs chefs dans un paragraphe.

**Disposition proposée.** Bandeau réduit à une barre « Campagne 2027 : 0 plan sur 11 » et un bouton « Voir les
entités sans plan » (liste ou infobulle). Tableau des plans inchangé ; fiche d'un plan : activités en liste avec
responsable, cible et barre d'avancement par trimestre.

**Références.** GOV.UK, liste de tâches (état de chaque entité dans la campagne).

### Partenaires et conventions

**Ce qui gêne.** La liste est claire ; la fiche partenaire et la fiche convention sont longues et linéaires.

**Disposition proposée.** Fiche en deux colonnes à la manière d'un logiciel de relation partenaires : à gauche les
propriétés (état, type, catégories, point focal, coordonnées) ; au centre des onglets « Activité » (chronologie des
échanges, courriers, réunions), « Conventions », « Contacts », « Pièces ». Conventions : la même structure ; une barre
d'étapes (préparation → parapheur → en vigueur → échue ou résiliée) ; l'échéance en évidence avec le compte à rebours.

**Références.** Attio, fiche d'entreprise (panneau des propriétés, onglet Activité en chronologie, onglets de
relations).

### Parapheur

**Ce qui gêne.** Une liste de tableau ; pour signer, il faut ouvrir une fenêtre ; on ne voit ni le document ni le
circuit d'un coup d'œil.

**Disposition proposée.** Une boîte de traitement à deux volets, comme une messagerie : à gauche la liste de ce qui
attend la personne (seulement cela par défaut), à droite le document, son circuit en étapes (qui a visé, qui doit
viser, où l'on en est) et les boutons « Viser » ou « Signer » et « Renvoyer ». Les autres onglets (mes documents, tous
mes circuits, délégations) restent accessibles.

**Références.** Boîte de réception Legalesign (n'affiche que ce qui attend la personne) ; nouvelle boîte de Skribble
(tri, filtre, gestion des demandes) ; Dribbble, Kuba Ficek (signature électronique) et composant « Approval
Workflow ».

### Courrier

**Ce qui gêne.** Le compteur « À moi · en retard : 0 · 0 » est difficile à lire ; trois icônes d'action sans libellé.

**Disposition proposée.** Quatre compteurs simples (à imputer, en cours, en retard, traités ce mois) ; « À moi » devient
un filtre. Même boîte à deux volets que le parapheur : la liste à gauche, le courrier et son circuit d'imputation à
droite, avec les actions en boutons libellés.

**Références.** Les mêmes que le parapheur ; Stripe, liste et détail.

### Structure (organisation)

**Ce qui gêne.** L'arbre et le panneau de droite sont efficaces ; le panneau mélange propriétés, attributions,
sous-entités et équipes.

**Disposition proposée.** Garder l'arbre ; ajouter une bascule « Organigramme » (boîtes reliées, chef et effectif par
entité, mise en évidence de la branche choisie). Panneau : propriétés en liste de synthèse, puis sections repliables.

**Références.** Dribbble, « Employee ORG Chart Dashboard » et « Organization Structure Editor » ; composant OrgFlow Pro
(mise en évidence de la ligne hiérarchique).

### Ressources humaines

**Ce qui gêne.** La pyramide des âges est vide (dates de naissance absentes) mais affichée ; le tableau des agents a huit
colonnes denses.

**Disposition proposée.** Un graphique sans données est remplacé par une invitation (« 17 dossiers sans date de
naissance : compléter »). Tableau : matricule, agent (nom et fonction sur deux lignes), entité, statut, compte. Fiche
d'agent en deux colonnes (propriétés à gauche, onglets Situation, Affectations, Diplômes, Congés).

**Références.** Dribbble, « HR Management App » ; collection « HR Dashboard ».

### Congés et absences

**Ce qui gêne.** Le chef arrive sur « Mes demandes » vide alors qu'une demande attend sa validation ; pas de vue
calendrier de l'équipe.

**Disposition proposée.** Pour qui valide, ouverture sur « À valider ». Ajouter une vue « Calendrier de l'équipe » (une
ligne par agent, les absences en barres sur le mois, les jours fériés marqués), d'où l'on accorde ou refuse.

**Références.** Calendrier d'équipe d'Employment Hero (validation depuis le calendrier) ; LeaveBoard ; Dribbble,
« Time-off requests management » (SynergyCodes).

### Coéquipiers IA

**Ce qui gêne.** Titre de deux lignes, mention du mode démonstration en double, trois cartes d'explication avant les
coéquipiers.

**Disposition proposée.** Titre simple « Coéquipiers IA » ; les coéquipiers en premier (cartes : rôle, projets, actions
en attente de validation) ; la règle « l'IA propose, une personne décide » en une ligne ⓘ ; les actions à valider en
tête quand il y en a.

**Références.** Linear, sobriété des pages de paramètres.

### Téléphone

**Ce qui gêne.** Tableaux qui défilent de côté ; bloc d'actions en tête du tableau de bord ; en-têtes qui empilent
titre, boutons et explication.

**Disposition proposée.** Sous 640 px, chaque tableau devient une liste de cartes (titre, statut, échéance,
responsable) ; les actions secondaires passent dans un menu « … » ; un bouton flottant pour l'action principale de
l'écran ; les chiffres clés en carrousel horizontal.

**Références.** Guide 2026 des tableaux de données (tables difficiles sur mobile, listes et cartes faciles) ; article
« Five ways to replace a table » ; patrons de tableaux réactifs accessibles de Smashing Magazine.

## Feuille de route proposée

| Lot | Contenu | Gain | Effort |
|---|---|---|---|
| UX-1 | Composants communs : en-tête de page compact, liste de synthèse sans champs vides, étiquette de statut unique, chronologie, chiffre clé avec repère, pluriels corrects, état vide des graphiques | Effet sur tous les écrans à la fois | Moyen |
| UX-2 | Tableau de bord DG et Accueil fusionnés ; ordre information puis action ; tableau par direction réduit | La DG comprend la situation en dix secondes | Moyen |
| UX-3 | Boîte à deux volets pour le parapheur et le courrier ; barre d'étapes des réunions et des conventions | Moins de clics pour viser, signer, imputer | Moyen à fort |
| UX-4 | Onglets ramenés à cinq (projet, entité, portefeuille) ; matrice des risques ; calendrier des congés ; organigramme | Écrans plus lisibles | Moyen |
| UX-5 | Téléphone : tableaux en cartes, bouton d'action flottant ; thème clair par défaut ; contrôle WCAG 2.2 (cibles de 24 px, alternative au glisser, focus visible) | Conformité RGAA 5 et usage mobile | Moyen |

Ordre conseillé : UX-1 d'abord (il fournit les briques), puis UX-2, UX-3, UX-5 et UX-4. Chaque lot se vérifie dans le
navigateur, en bureau et en téléphone, sous les profils DG, chef d'entité et agent.

## Sources

- Accessibilité : [RGAA 5, publication prévue fin 2026 (plan annuel DILA)](https://dila.gouv.fr/IMG/pdf/dila-accessibilite-plan-annuel-2026.pdf) ;
  [RGAA 5 et WCAG 2.2 (Binclusive)](https://www.binclusive.io/en/blog/rgaa-5-france-digital-accessibility-standard) ;
  [EN 301 549 v4.1.1 publiée (NDA Irlande)](https://nda.ie/news/en301549-published) ;
  [EN 301 549 v4.1.1 : ce qui change (Deque)](https://www.deque.com/fr/blog/en-301-549-v4-1-1-is-final-what-changed-what-it-means-and-what-you-should-do/) ;
  [Acte européen d'accessibilité, mise à jour des normes (DWT)](https://www.dwt.com/insights/2026/09/european-accessibility-act-ict-standards-update).
- Systèmes de design publics : [DSFR, composants](https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/) ;
  [GC Design System](https://design-system.canada.ca/en/) et [sa sortie de phase d'essai (mars 2026)](https://digital.canada.ca/2026/03/10/stable-amp-safe-gc-design-system-is-mature-amp-exiting-the-alpha-stage) ;
  [GOV.UK, liste de synthèse](https://design-system.service.gov.uk/components/summary-list/) ;
  [GOV.UK, liste de tâches](https://design-system.service.gov.uk/components/task-list) ;
  [DWP, chronologie](https://design-system.dwp.gov.uk/components/timeline/how-it-works).
- Produits de référence : [Linear, refonte de l'interface](https://linear.app/now/how-we-redesigned-the-linear-ui) ;
  [Linear, principes de la dernière refonte](https://linear.app/now/behind-the-latest-design-refresh) ;
  [Stripe, modèles de pages](https://docs.stripe.com/stripe-apps/patterns) et [page de détail](https://docs.stripe.com/stripe-apps/components/detailpage.md?app-sdk-version=9) ;
  [Asana, statut et avancement des projets](https://help.asana.com/s/article/project-progress-and-status-updates) ;
  [Asana, portefeuilles](https://help.asana.com/s/article/portfolio-progress-and-reporting) ;
  [Attio, fiches](https://attio.com/help/reference/attio-101/attios-data-model/understanding-records) ;
  [Fellow, ordres du jour](https://fellow.app/go/meeting-agenda-app) ;
  [Legalesign, boîte de signature](https://legalesign.com/blog/introducing-inbox-sign-and-manage-multiple-documents-in-one-place/) ;
  [Skribble, nouvelle boîte](https://feedback.skribble.com/changelog/mag-the-new-inbox) ;
  [Employment Hero, calendrier d'équipe](https://help.employmenthero.com/hc/en-au/articles/17427183407887).
- Galeries et exemples : [Dribbble, HR Management App](https://dribbble.com/shots/8760176-HR-Management-App) ;
  [Dribbble, Time-off requests management](https://dribbble.com/SynergyCodes/projects/5480860-Leave-Management-App) ;
  [Dribbble, Team Management Calendar](https://dribbble.com/shots/24177180-Team-Management-Calendar-UI-Dashboard) ;
  [Dribbble, Employee ORG Chart Dashboard](https://dribbble.com/shots/25495671-Employee-ORG-Chart-Dashboard) ;
  [Dribbble, Organization Structure Editor](https://www.dribbble.com/shots/20652767-Organization-Structure-Editor) ;
  [Dribbble, Kuba Ficek (signature électronique)](https://dribbble.com/kuba_ficek) ;
  [Dribbble, Approval Workflow](https://dribbble.com/AtishG/collections/7628563-Workflow) ;
  [Dribbble, Data Visualization](https://dribbble.com/winniec1/collections/4412814-Data-Visualization) ;
  [amCharts, Risk heatmap](https://www.amcharts.com/demos/risk-heatmap/) ;
  [HighBond, cartes de chaleur des risques](https://help.highbond.com/helpdocs/highbond/en-us/Content/risk_manager/dashboards_risk_manager.htm) ;
  [SimpleKPI, tableau de bord du secteur public](https://www.simplekpi.com/kpi-dashboard-examples/public-sector-kpi-dashboard-example).
- Tableaux et mobile : [Guide 2026 des tableaux de données (Setproduct)](https://www.setproduct.com/blog/data-table-ui-design) ;
  [Five ways to replace a table](https://uxdesign.cc/five-ways-to-replace-a-table-and-make-it-better-on-mobile-f9cc3daf8258) ;
  [Tableaux réactifs accessibles (Smashing Magazine)](https://shop.smashingmagazine.com/2022/12/accessible-front-end-patterns-responsive-tables-part2/).

## Direction visuelle retenue (révision du 20/11/2026)

L'utilisateur a jugé les premières retouches insuffisantes : l'outil doit être épuré, presque sans texte et très
professionnel. Une première piste (barre latérale bleu nuit, angles durs) a été refusée. Les références qu'il a
ensuite données convergent toutes vers la même famille :

| Référence | Ce qu'elle apporte |
|---|---|
| « Project Management Dashboard » de Pickolab (Dribbble) | Le modèle visuel : fenêtre blanche sur fond gris pâle, barre latérale claire, encre noire, cartes à filet fin, petits carrés de couleur pour les statuts, barres d'avancement noires |
| Catalogue designsystems.one (122 systèmes) | Le positionnement : la famille shadcn/ui, Linear, Geist pour l'apparence ; IBM Carbon, Siemens iX et SAP Fiori pour la rigueur des tableaux ; GOV.UK et le GC Design System pour l'accessibilité et la sobriété des mots |
| Kobra Systems | Des composants de cette famille : tableau groupé dense, étiquettes à pastille, lignes fines |

L'outil est déjà construit avec React, Tailwind et Radix, les mêmes briques que shadcn/ui : cette direction s'applique
sans changer de technique.

Règles retenues :

| Sujet | Règle |
|---|---|
| Surfaces | Blanc partout ; l'application est une fenêtre arrondie posée sur un fond gris pâle ; aucune ombre |
| Encre et couleur | Texte presque noir ; bouton principal noir ; la couleur n'apparaît que dans les statuts et les retards |
| Barre latérale | Claire ; l'entrée active sur fond gris avec un trait noir au bord ; compteurs en petits carrés |
| Cartes | Filet d'un pixel, rayon de 12 px ; titre en haut à gauche, flèche vers le détail en haut à droite |
| Statuts | Étiquette teintée, petit carré de couleur, mot à l'encre |
| Chiffres | Un libellé d'un ou deux mots, une icône discrète, un chiffre ; l'explication au survol |
| Texte | Un titre par écran, pas de phrase dans une cellule, pas de sous-titre explicatif |
| Police | Onest (grotesque ronde, proche de la référence) |

Écran témoin livré : l'Accueil de la direction (six cartes de chiffres, les directions, trois cartes de listes). Les
autres écrans ont reçu l'habillage (couleurs, filets, rayons, barre latérale, police) mais gardent leur structure : ils
se traitent un par un après accord, dans l'ordre Décisions, Courrier et Parapheur, Réunions, Mon entité, Projet,
Portefeuille, RH et Congés.

Compléments demandés le même jour :

| Demande | Réponse |
|---|---|
| Garder l'ancien design pour comparer, et pouvoir y revenir | Étiquette Git `design-avant-2026-11-20` (état juste avant les retouches du jour) ; la nouvelle direction vit sur la branche `design-sobre`, non fusionnée |
| « Trop fade » : des accents sur les points d'attention | La couleur dit l'urgence : rouge pour un retard ou une alerte, ambre pour ce qui attend une action, vert pour ce qui est tenu, bleu pour l'information ; carte « Retards » teintée, liseré de couleur sur les lignes en alerte, barre d'avancement colorée |
| Un composant adapté à chaque contenu, avec bascule de vue | Agenda en semaine (sept colonnes) ou en liste ; risques en matrice probabilité × impact ou en liste ; la bascule se retient sur le poste. À étendre : réunions, congés (calendrier d'équipe), tâches (liste, tableau, calendrier), organigramme |

Dernière précision de l'utilisateur (20/11/2026, en fin de journée) : la direction artistique d'origine était déjà
bonne ; ce qui gênait, c'était la disposition des contenus (à l'horizontal). La règle devient donc :

| Sujet | Règle définitive |
|---|---|
| Apparence | Celle d'origine : graphite et bleu de l'Agence, police Geist ; **sombre par défaut**, thème clair soigné en second |
| Visibilité | Cartes pleines qui se détachent du fond ; la couleur dit l'urgence (rouge, ambre, vert, bleu) |
| Disposition | À la verticale : un fait par ligne (libellé à gauche, valeur à droite), fiches en colonne de lecture |
| Composants | À la manière de shadcn/ui (mêmes briques : React, Tailwind, Radix) : carte titrée, lignes libellé-valeur, bascule de vue |
| Abandonné | La fenêtre blanche sur fond gris, la barre latérale claire à trait noir, la police Onest, la barre latérale bleu nuit |

### Fluidité (référence : HeroSpace, de l'équipe HeroUI)

| Geste | Ce qui bouge |
|---|---|
| Changer d'onglet, de vue ou de page du menu | L'indicateur glisse d'un élément à l'autre, sur ressort |
| Changer de page ou de vue | Le contenu se fond avec un léger flou |
| Ouvrir un menu, une bulle, une fiche | Le panneau sort de son point d'attache ; le tiroir glisse sur une courbe douce, le fond se floute |
| Arriver sur l'Accueil | Les chiffres entrent en cascade et montent jusqu'à leur valeur ; les barres se remplissent |
| Survoler une carte | Elle se soulève d'un pixel |
| Changer de thème | Les couleurs fondent au lieu de sauter |

Tout repose sur la bibliothèque Motion, déjà présente. Le réglage système « réduire les animations » est respecté.
Adopter les composants HeroUI eux-mêmes reste possible, comme chantier séparé.

## Avancement

| Date | Lot | Fait |
|---|---|---|
| 20/11/2026 | UX-1, première partie | Pluriels accordés ; champs facultatifs vides masqués (fiche réunion) ; lieu sans doublon ; participants affichés seulement après la séance ; statut unique au portefeuille ; graphique vide remplacé par une phrase (RH) ; tableau de bord DG : information d'abord, saisies dans le menu « Saisir » |
| 20/11/2026 | UX-2 | Accueil et tableau de bord DG fusionnés pour la direction : une note du jour en tête (chiffres cliquables, retards en rouge) à la place des quatre cartes, « Ce qui vous attend » selon la fonction, puis les directions ; sur téléphone, la situation se lit dès le premier écran |
| 20/11/2026 | Composants partagés | Onglets (`TabBar`), bascule de vue (`ViewSwitch`) et tableau de tâches (`TaskBoard`, glisser-déposer) uniques et réutilisés ; Mes tâches calquée sur la page projet (Liste, Tableau, Calendrier) ; tableaux sur une seule ligne par cellule, même dessin dans Réunions, Partenaires, Décisions, Courrier ; agenda de l'accueil en frise de sept jours avec heures et lieux ; contraste des textes secondaires relevé en thème sombre. |
