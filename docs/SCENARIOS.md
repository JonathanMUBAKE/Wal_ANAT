# Scénarios de fonctionnement — ANAT Pilotage

> Chaque module est rejoué comme l'Agence le vivrait. Les incohérences trouvées sont corrigées et verrouillées
> par un test de `server/src/scenarios.test.ts` ; les éléments manquants sont listés pour les prochains lots.

Légende : ✅ corrigé et testé · 🟡 manque fonctionnel, à construire.

## 1. Réunions et comptes rendus

**Scénario.** La DG convoque un comité de direction. Le rédacteur saisit l'ordre du jour, les participants, les notes et les recommandations (responsable, échéance). Une autre personne valide : le compte rendu est figé, numéroté, exportable. Chaque responsable fait avancer sa recommandation ; un gestionnaire la clôt.

| Constat | Suite |
| --- | --- |
| On pouvait valider le compte rendu d'une réunion **pas encore tenue** | ✅ refusé |
| Une recommandation **sans responsable ni échéance** passait la validation : impossible à suivre | ✅ refusé, avec la liste des recommandations à compléter |
| Un responsable qui déclarait sa recommandation réalisée **ne prévenait personne** | ✅ le rédacteur est prévenu (« à vérifier puis clôturer ») |
| 🟡 Pas d'étape « soumettre pour validation » : le valideur n'est pas prévenu qu'un compte rendu l'attend | à construire |
| 🟡 Pas de réunions récurrentes (comité hebdomadaire) | à construire |

## 2. Portefeuille : projets et activités

**Scénario.** La DG est mandatée dans une commission. L'activité est créée, confiée à un responsable, avec mandat et date. Le responsable rend compte (issue, suites à donner) ; les suites sont suivies jusqu'à leur clôture.

| Constat | Suite |
| --- | --- |
| Une nouvelle date de fin n'était pas comparée au **début déjà enregistré** | ✅ refusé si la fin précède le début |
| Le responsable (non gestionnaire) pouvait **confier l'activité à un autre** ou **lever sa confidentialité** | ✅ réservé aux gestionnaires ; champs grisés à l'écran |
| 🟡 Pas d'état « annulée » ou « reportée » pour une activité | à construire |
| 🟡 Projet : un budget dépensé supérieur au budget prévu ne déclenche aucune alerte | à construire |

## 3. Tableau de bord DG

**Scénario.** Chaque matin, la DG lit l'état du portefeuille, ce qu'elle doit trancher, ce qui est en retard, ce qui l'attend.

| Constat | Suite |
| --- | --- |
| Les **activités confidentielles** (audiences) apparaissaient, avec leur titre, à tout lecteur du tableau de bord | ✅ visibles du seul responsable et des gestionnaires, comme dans le portefeuille |
| Une activité ou un projet **en retard** pouvait s'afficher « dans les temps » | ✅ l'état affiché passe à « à surveiller » dès qu'un retard existe |
| « Retards à résorber » ne comptait que tâches et recommandations | ✅ compte aussi livrables, activités de plan approuvé et courrier ; détail affiché sous le chiffre |
| Un indicateur **qui doit baisser** (délai, coût) affichait toujours 0 % | ✅ calcul juste dans les deux sens |
| Pas de **registre des décisions** : la décision de la DG n'était pas enregistrée (date, contenu, dossier) ; le champ « décision attendue » était simplement vidé | ✅ registre construit (§ 9) |

## 4. Plans de travail

**Scénario.** Chaque entité prépare son plan annuel (activité, responsable, cible, échéance, budget), le soumet, une autre personne l'approuve ; le prévu est figé, toute révision est tracée.

| Constat | Suite |
| --- | --- |
| Les approbateurs **n'étaient pas prévenus** qu'un plan les attendait | ✅ prévenus à la soumission (jamais l'auteur) |
| 🟡 Le plan d'une entité n'apparaît pas encore dans son panneau (Organisation › Structure) | à construire |
| 🟡 La validation d'un livrable ne fait pas avancer l'activité de plan qui le porte | à construire |
| 🟡 Le responsable d'une activité peut appartenir à une autre entité sans signal | à intégrer aux écarts |

## 5. Livrables et missions de consultants

**Scénario.** Une mission est signée avec un cabinet ; ses livrables sont soumis, mis en revue, validés par une autre personne que l'auteur. Un procès-verbal de réception est émis, le livrable devient « à payer », puis le paiement est constaté.

| Constat | Suite |
| --- | --- |
| Les procès-verbaux étaient numérotés **toutes années confondues** | ✅ numérotation annuelle (PV-2026-0001…) |
| On pouvait rattacher un livrable à une **mission terminée** | ✅ refusé |
| Une échéance pouvait **dépasser la fin de la mission** | ✅ refusé |
| Le signal « **à payer** » ne s'éteignait jamais | ✅ action « Constater le paiement » (gestionnaire des missions), datée, tracée, une seule fois |

## 6. Parapheur

**Scénario.** L'auteur prépare une note, compose le circuit (avis, visas, signature finale), le lance ; le contenu est scellé ; chaque intervenant agit dans l'ordre, éventuellement par délégation.

| Constat | Suite |
| --- | --- |
| Un intervenant **sans accès au parapheur** pouvait être placé dans le circuit : le document restait **bloqué** à son étape | ✅ refusé à la composition du circuit |
| Une délégation de signature pouvait être donnée à un **invité** (consultant) | ✅ refusé |
| 🟡 Pas de relance quand un document dépasse sa date limite | à construire |
| 🟡 Signature électronique reconnue juridiquement et pièces jointes | décision ouverte |

## 7. Courrier

**Scénario.** Le bureau d'ordre enregistre un courrier entrant (numéro annuel), l'impute à une entité et à une personne avec un délai ; la réponse est enregistrée et le courrier clôturé ; un retard remonte.

| Constat | Suite |
| --- | --- |
| Un courrier traité pouvait être **clôturé une seconde fois**, écrasant la première clôture | ✅ refusé |
| Le délai de réponse pouvait **précéder la réception** | ✅ refusé, à l'enregistrement comme à l'imputation |
| Un retard sur une entité **sans responsable** était marqué « remonté » sans que personne soit prévenu | ✅ remonte à la personne imputée, à défaut au bureau d'ordre |
| 🟡 Le courrier sortant n'est pas relié au courrier entrant auquel il répond | à construire |

## 8. Organisation, attributions et écarts

**Scénario.** On crée une entité, on définit aussitôt sa fiche d'attributions ; une autre personne l'approuve ; l'outil compare ensuite l'attendu au réalisé.

| Constat | Suite |
| --- | --- |
| 🟡 Deux entités peuvent être déclarées responsables d'un même domaine : l'écart n'apparaît qu'à la détection suivante, pas au moment d'approuver | avertir à l'approbation |
| 🟡 Les indicateurs n'ont pas d'historique de mesures (date, valeur, source) : pas de tendance | à construire |
| 🟡 Écrans de saisie des risques et des indicateurs | à construire |

## 9. Registre des décisions de la DG

**Scénario.** Le projet « Schéma national » attend une décision. La DG tranche en comité ; son secrétariat enregistre la décision depuis le tableau de bord (« Arbitrer ») : objet, texte, date, chargé d'exécution, échéance. La décision reçoit le numéro `DEC/2026/0001`, la décision attendue du projet est levée, le chargé d'exécution est prévenu. Il passe la décision « en cours », puis « exécutée » avec une note ; le secrétariat est prévenu.

| Règle | Contrôle serveur |
| --- | --- |
| Seul un profil autorisé (« Enregistrer les décisions de la DG ») enregistre ; un coéquipier IA ne le peut jamais | ✅ refusé |
| Numérotation annuelle sans trou ni doublon, même en cas d'enregistrements simultanés | ✅ |
| La date de décision n'est pas dans le futur ; l'échéance ne la précède pas | ✅ refusé |
| Le dossier d'origine (projet, activité, réunion) et le chargé d'exécution appartiennent à l'organisation ; le chargé est une personne, pas une IA | ✅ refusé |
| L'enregistrement lève la décision attendue du dossier | ✅ |
| Une décision est **figée** : aucun texte ne se modifie, seule l'exécution avance ; une décision exécutée ou remplacée est close | ✅ |
| Une erreur se corrige par une décision qui **remplace** la précédente | ✅ l'ancienne passe « remplacée » |
| Une décision sur un dossier confidentiel est confidentielle : visible du secrétariat, du chargé d'exécution et de son auteur seulement | ✅ |
| Chaque enregistrement et chaque étape d'exécution sont journalisés ; le chargé puis le secrétariat sont prévenus | ✅ |
| Une décision non exécutée à son échéance compte dans « Retards à résorber » | ✅ |
