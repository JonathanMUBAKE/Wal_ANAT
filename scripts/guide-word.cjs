// Guide « ANAT Pilotage — module par module, avec scénarios » (Word). Données fictives uniquement.
// Usage : node scripts/guide-word.cjs  (écrit docs/word/ANAT-Pilotage-guide-module-par-module.docx)
const fs = require("fs");
const path = require("path");
const ROOT = process.argv[2] ?? path.resolve(__dirname, "..");
const docx = require(path.resolve(ROOT, "node_modules/docx"));
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, LevelFormat, Packer, PageBreak,
  PageNumber, Paragraph, ShadingType, Table, TableCell, TableOfContents, TableRow, TextRun, WidthType,
} = docx;

const BLUE = "007BC4";
const FONT = "Arial";
const W = 9638; // largeur utile A4 (marges 1134)
const logoPath = path.resolve(ROOT, "server/assets/anat-logo.png");

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 21, bold: o.bold, italics: o.italics, color: o.color });
const p = (text, o = {}) => new Paragraph({ spacing: { after: 100 }, children: Array.isArray(text) ? text : [t(text, o)] });
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(text)] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
const bullet = (text) =>
  new Paragraph({ numbering: { reference: "puces", level: 0 }, spacing: { after: 60 }, children: rich(text) });
const step = (text, ref) =>
  new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: rich(text) });
/** **gras** dans une ligne. */
function rich(line) {
  return line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) => (s.startsWith("**") ? t(s.slice(2, -2), { bold: true }) : t(s)));
}
const border = { style: BorderStyle.SINGLE, size: 4, color: "BFC8D2" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(head, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cols = widths.map((w) => Math.round((W * w) / total));
  cols[cols.length - 1] += W - cols.reduce((a, b) => a + b, 0);
  const cell = (text, i, header) =>
    new TableCell({
      borders,
      width: { size: cols[i], type: WidthType.DXA },
      shading: header ? { fill: "E6F0F8", type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ children: header ? [t(text, { bold: true, size: 19 })] : rich(text).map((r) => r) })],
    });
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(String(c), i, false)) })),
    ],
  });
}
/** Encadré « Scénario » : un tableau d'une cellule sur fond clair. */
let scen = 0;
function scenario(title, who, steps, result) {
  const ref = `scen${++scen}`;
  numberingConfigs.push({
    reference: ref,
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 300 } } } }],
  });
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: W, type: WidthType.DXA },
            shading: { fill: "F3F8FC", type: ShadingType.CLEAR, color: "auto" },
            borders: { top: { style: BorderStyle.SINGLE, size: 12, color: BLUE }, bottom: border, left: border, right: border },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({ spacing: { after: 80 }, children: [t(`Scénario · ${title}`, { bold: true, color: BLUE, size: 22 })] }),
              new Paragraph({ spacing: { after: 80 }, children: [t(who, { italics: true, color: "555555", size: 19 })] }),
              ...steps.map((s) => step(s, ref)),
              ...(result ? [new Paragraph({ spacing: { before: 80 }, children: rich(`**Résultat :** ${result}`) })] : []),
            ],
          }),
        ],
      }),
    ],
  });
}
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] });
const numberingConfigs = [
  {
    reference: "puces",
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }],
  },
];

/** Un module : rôle, accès, fonctionnalités, scénario(s), retouches. */
function module(title, o) {
  const out = [h1(title)];
  out.push(h2("À quoi il sert"), p(o.role));
  out.push(h2("Où et qui"), ...o.access.map(bullet));
  out.push(h2("Fonctionnalités"), ...o.features.map(bullet));
  if (o.rules) out.push(h2("Règles que l'outil fait respecter"), ...o.rules.map(bullet));
  for (const s of o.scenarios) out.push(gap(), scenario(...s));
  if (o.changes?.length) out.push(gap(), h2("Retouches de cette série"), ...o.changes.map(bullet));
  return out;
}

const PEOPLE =
  "Personnes fictives des scénarios : Bernadette, directrice générale (la DG) ; Esther, assistante de direction ; Fiston, chef du département Ingénierie territoriale ; Didier, directeur de la Communication et des Partenariats ; Clarisse, chargée d'études ; Gaston, chef du service Suivi-évaluation. Toute ressemblance avec des personnes réelles est fortuite.";

const content = [];
// ------------------------------------------------------------------ couverture
if (fs.existsSync(logoPath)) {
  const data = fs.readFileSync(logoPath);
  const ratio = data.readUInt32BE(20) / data.readUInt32BE(16);
  content.push(new Paragraph({ spacing: { before: 1200, after: 600 }, children: [new ImageRun({ type: "png", data, transformation: { width: 220, height: Math.round(220 * ratio) } })] }));
}
content.push(
  new Paragraph({ spacing: { after: 200 }, children: [t("ANAT Pilotage", { bold: true, size: 56, color: BLUE })] }),
  new Paragraph({ spacing: { after: 200 }, children: [t("Guide module par module, avec scénarios d'utilisation", { size: 32 })] }),
  new Paragraph({ spacing: { after: 600 }, children: [t("Fonctionnement, fonctionnalités et retouches de la série de corrections — novembre 2026", { size: 22, color: "555555" })] }),
  p(PEOPLE, { italics: true, color: "555555", size: 19 }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ spacing: { after: 200 }, children: [t("Sommaire", { bold: true, size: 34, color: BLUE })] }),
  new TableOfContents("Sommaire", { hyperlink: true, headingStyleRange: "1-1" }),
);

// ------------------------------------------------------------------ introduction
content.push(
  h1("1. Comment lire ce guide"),
  p("Ce guide décrit ce que fait l'outil aujourd'hui, module par module : à quoi sert le module, où le trouver et qui y a accès, ses fonctionnalités, les règles qu'il fait respecter, puis un scénario concret pas à pas. Chaque module se termine par les retouches apportées dans la série de corrections."),
  h2("Les principes communs"),
  ...[
    "**Chacun ne voit que ce qui lui est ouvert** : droits du profil, appartenance au projet, entité dirigée, confidentialité.",
    "**Préparer n'est pas valider** : celui qui soumet un plan, une revue, un compte rendu ou une demande d'arbitrage ne la valide pas lui-même.",
    "**Ce qui est validé est figé** : décisions, comptes rendus validés, accords en vigueur, revues validées. On corrige par un acte nouveau (remplacement, avenant, révision tracée).",
    "**L'IA propose, un humain décide** : un coéquipier IA n'inscrit jamais de décision et ne valide rien.",
    "**Tout est tracé** dans le journal d'audit ; chaque étape prévient les personnes concernées.",
    "**Exporter** ouvre toujours le choix du format : Word ou PDF pour un document, Excel, PDF, Word ou CSV pour un tableau.",
  ].map(bullet),
  h2("Les profils"),
  table(
    ["Profil", "Ce qu'il fait"],
    [
      ["DG", "Voit tout le pilotage, tranche et inscrit les décisions, approuve, signe. Peut tout saisir elle-même depuis le bloc « Saisir »."],
      ["Assistant(e) de direction", "Saisit pour la DG : courrier (enregistrement, imputation sur instruction), agenda, réunions, décisions prises par la DG. Ne signe pas, n'approuve pas, ne valide pas les comptes rendus."],
      ["DGA", "Pilote l'ensemble, approuve les plans, gère réunions et courrier, consulte les dossiers RH ; n'inscrit pas les décisions de la DG."],
      ["Chef d'entité", "Confie les tâches et suit ses agents, prépare le plan, porte les projets, valide les livrables, tient les réunions de son entité, gère les risques."],
      ["Agent", "Ses tâches, son entité, son courrier, son dossier."],
      ["Stagiaire, Consultant", "Accès restreint ; le consultant ne voit que ce qui lui est partagé."],
      ["Responsable informatique", "Administre l'outil (personnes, profils, messagerie) sans accès au pilotage ni aux décisions."],
    ],
    [2.2, 7],
  ),
  h1("2. Les retouches de la série de corrections"),
  p("L'analyse « Fonctionnement module par module » (docs/FONCTIONNEMENT-PAR-MODULE.md) a relevé des incohérences numérotées I-01 à I-36. Voici ce qui a été corrigé."),
  table(
    ["N°", "Constat", "Correction"],
    [
      ["I-01", "« Arbitrer » depuis le tableau de bord inscrivait une décision sans clore l'arbitrage en attente.", "Une seule porte : inscrire une décision sur un dossier tranche l'arbitrage qui y attendait ; le tableau de bord propose « Trancher » et ouvre l'arbitrage."],
      ["I-02", "La « décision attendue » se modifiait à la main, même pendant un arbitrage.", "Elle naît d'une demande d'arbitrage ; elle ne se réécrit plus à la main pendant un arbitrage."],
      ["I-03", "Les activités n'avaient pas d'arbitrage.", "Commissions, conférences, rendez-vous et activités internes demandent aussi un arbitrage."],
      ["I-10", "Trois mesures de santé différentes selon l'écran.", "Une seule santé calculée, reprise partout ; la santé déclarée reste affichée ; une difficulté déclarée est retenue."],
      ["I-11", "Les retards n'étaient pas comptés pareil.", "Un retard est partout une tâche principale échue."],
      ["I-12", "Risques et indicateurs affichés sans écran de saisie.", "Écran « Risques et indicateurs » ; risques rattachés aux projets, indicateurs aux activités du plan."],
      ["I-13", "« Toutes les activités » excluait les projets.", "« Tous les dossiers » réunit projets et activités."],
      ["I-16", "Le plan de l'Agence n'apparaissait dans aucune direction.", "Ligne « niveau de l'Agence » dans la vue par direction."],
      ["I-20", "La répétition d'une tâche ne se choisissait pas à la création.", "Champ « Répétition » dans le formulaire de création."],
      ["I-22", "L'export manquait sur plusieurs tableaux.", "Export du portefeuille, des partenaires, des conventions, des risques et indicateurs."],
      ["I-23", "La convocation restait en champs modifiables en lecture.", "La convocation se consulte ; ses champs s'ouvrent avec « Modifier »."],
      ["I-30", "Pas de profil pour l'assistant(e) de la DG.", "Profil « Assistant(e) de direction »."],
      ["I-31", "Les saisies de la DG étaient dispersées.", "Bloc « Saisir » sur l'accueil et le tableau de bord DG."],
      ["I-32", "La DG voyait la charge nominative des agents.", "Synthèse seulement ; le détail reste au chef d'entité."],
      ["I-36", "Démonstration aux profils génériques.", "Profils institutionnels pour chaque personne fictive ; l'en-tête affiche le profil réel."],
    ],
    [0.9, 4, 5],
  ),
);

// ------------------------------------------------------------------ modules
content.push(
  ...module("3. Accueil et « Saisir »", {
    role: "Ouvrir l'outil sur ce que chacun doit faire aujourd'hui, et donner à la direction ses saisies en un seul endroit.",
    access: ["Menu : Accueil. Tout le monde.", "Le bloc « Saisir » n'apparaît qu'à ceux qui ont au moins une des saisies (DG, assistant(e), DGA, gestionnaires)."],
    features: [
      "**Saisir** : inscrire une décision, trancher un arbitrage (avec le nombre en attente), enregistrer un courrier, programmer une réunion, nouvelle activité, viser ou signer. Chaque bouton ouvre directement le formulaire du module.",
      "**Ce qui vous attend** : courrier à imputer ou Mon courrier, documents à viser ou signer, retards de l'entité dirigée, décisions à exécuter.",
      "**Mes tâches** (à venir, en retard, terminées) et **Mes prochaines réunions** (convocations à répondre en tête).",
    ],
    scenarios: [
      ["un lundi matin au secrétariat de la DG", "Esther, assistante de direction.", [
        "Esther ouvre l'outil : l'accueil affiche « Courrier à imputer : 2 » et le bloc « Saisir ».",
        "Elle clique **Enregistrer un courrier** : le formulaire s'ouvre directement. Elle saisit la lettre d'un ministère, joint le scan, valide : numéro ENT/2026/0142.",
        "La DG lui dicte une décision prise en réunion restreinte. Esther clique **Inscrire une décision**, la saisit : elle reçoit le numéro DEC/2026/0004 et le chargé d'exécution est prévenu.",
        "Elle clique **Programmer une réunion** pour le comité de direction de jeudi, puis envoie la convocation.",
      ], "la DG n'a rien saisi elle-même ; tout est tracé au nom d'Esther, et la DG peut faire la même chose depuis son tableau de bord quand elle le souhaite."],
    ],
    changes: ["Bloc « Saisir » ajouté (I-31).", "L'en-tête affiche le profil réel de la personne (I-36)."],
  }),
  ...module("4. Mes tâches et tâches récurrentes", {
    role: "La liste personnelle de tout ce qui est confié à la personne, tous projets et entités confondus.",
    access: ["Menu : Mes tâches. Tout le monde, pour ses propres tâches."],
    features: [
      "Regroupement : en retard, cette semaine, plus tard, sans échéance ; livrables à produire en tête.",
      "**Tâche hors projet** : rangée dans le registre de l'entité de la personne.",
      "Fiche de la tâche : chargé, dates, priorité, étiquettes, sous-tâches, conversation, pièces jointes, aide de l'IA.",
      "**Répétition** (jour, semaine, quinzaine, mois, trimestre, année), dès la création : terminer la tâche fait naître la suivante, une seule fois, avec ses sous-tâches à refaire.",
    ],
    rules: ["Un agent ne confie pas de tâche à un collègue dans le registre d'entité : c'est le chef qui confie.", "Une sous-tâche ne se répète pas seule."],
    scenarios: [
      ["le rapport hebdomadaire", "Fiston, chef du département Ingénierie territoriale.", [
        "Fiston crée « Consolider le rapport hebdomadaire de l'entité », échéance lundi, **Répétition : chaque semaine**.",
        "Lundi, il la coche terminée : une nouvelle tâche identique apparaît pour le lundi suivant.",
        "S'il rouvre puis recoche la tâche, aucun doublon n'est créé.",
      ], "le travail courant se répète sans ressaisie ; l'activité garde la trace de chaque occurrence."],
    ],
    changes: ["Répétition proposée dès la création d'une tâche (I-20)."],
  }),
  ...module("5. Mon entité", {
    role: "L'espace de travail d'une entité (direction, service, cellule), à la manière d'Asana.",
    access: ["Menu : Mon entité. Les agents de l'entité, son chef, les chefs des entités au-dessus."],
    features: [
      "Onglets : vue d'ensemble, liste, tableau, calendrier, chronologie, projets, réunions, suivi des agents.",
      "Tableau de bord : tâches ouvertes et en retard, tendance sur 8 semaines, charge par agent, échéances, projets, réunions.",
      "Le chef **confie** une tâche à un agent ; l'agent **note** ses propres tâches ; création de projet rattaché à l'entité ; réunions de l'entité.",
    ],
    scenarios: [
      ["confier une tâche à un agent", "Fiston, chef d'entité ; Gaston, agent.", [
        "Fiston ouvre Mon entité › Liste et clique « Confier une tâche ».",
        "Il choisit Gaston, l'échéance, la priorité, et éventuellement une répétition.",
        "Gaston est prévenu ; la tâche apparaît dans Mes tâches et dans le suivi de l'entité.",
      ], "Fiston suit la charge de chaque agent dans l'onglet Suivi ; la DG, elle, ne voit que la synthèse."],
    ],
  }),
  ...module("6. Tableau de bord DG et vue par direction", {
    role: "L'essentiel pour décider aujourd'hui, et la photo de chaque direction.",
    access: ["Menu : Pilotage › Tableau de bord DG. Profils de pilotage (DG, DGA, assistant(e))."],
    features: [
      "Bloc **Saisir**, puis quatre chiffres : activités suivies, décisions attendues, retards à résorber (avec leur détail), à signer.",
      "**Par direction** : une ligne pour le niveau de l'Agence puis une par direction — appréciation écrite (sous contrôle, vigilance, alerte) et ses raisons, projets et santé, plan réalisé face à l'attendu (le trait vertical), retards.",
      "**Fiche d'une direction** : chiffres clés, services rattachés (on y descend d'un clic), ce qui a dépassé son échéance, synthèse du travail des équipes, projets, activités du plan.",
      "Décisions attendues : **Trancher** ouvre l'arbitrage en attente du dossier ; agenda de la semaine ; indicateurs et risques (liens vers leur écran de gestion).",
    ],
    rules: ["La santé d'un projet est la même partout : celle calculée d'après les faits, ou celle déclarée si elle est plus grave.", "Un retard est une tâche principale échue.", "La DG voit la synthèse du travail des équipes, pas la charge nominative des agents."],
    scenarios: [
      ["la revue du lundi", "La DG.", [
        "La DG ouvre le tableau de bord : la Direction technique est en **Alerte** — « 1 activité du plan échue non achevée · 1 décision en retard d'exécution ».",
        "Elle clique sur la ligne : la fiche montre le plan à 67 % pour 89 % attendus, et la décision en retard avec son chargé.",
        "Dans « Décisions attendues », un projet affiche **Trancher** : elle ouvre l'arbitrage et choisit l'option recommandée.",
      ], "en trois clics, la DG sait où agir et agit ; la décision est inscrite au registre."],
    ],
    changes: ["Santé et retards unifiés (I-10, I-11).", "Ligne « niveau de l'Agence » (I-16).", "Charge nominative retirée de la vue DG (I-32).", "« Trancher » ouvre l'arbitrage (I-01)."],
  }),
  ...module("7. Portefeuille, revue et arbitrages", {
    role: "La vue de tous les dossiers que la direction pilote — projets et activités — pour comparer, prioriser et arbitrer. Le portefeuille ne contient rien de propre : c'est une vue.",
    access: ["Menu : Pilotage › Portefeuille. Revue et arbitrages : profils de pilotage et ceux qui inscrivent les décisions."],
    features: [
      "**Revue de portefeuille** : santé déclarée face à santé calculée (calendrier, livrables, budget, tâches, arbitrage), raisons écrites, projets **en écart** en tête.",
      "**Arbitrages** : toutes les demandes (projets et activités), en attente d'abord ; tiroir de décision avec les options et la recommandation.",
      "**Tous les dossiers** : projets et activités ensemble ; onglets par nature (projets, commissions, conférences, rendez-vous, activités internes).",
      "Export de chaque vue (Excel, PDF, Word, CSV).",
    ],
    rules: ["Un arbitrage oppose au moins deux options ; un seul en attente par dossier.", "Celui qui demande ne tranche pas.", "La décision s'inscrit au registre, rattachée au dossier ; son responsable est chargé de l'exécution."],
    scenarios: [
      ["un arbitrage sur une commission", "Clarisse, chargée d'études, responsable de la commission foncière ; la DG.", [
        "Sur la fiche de la commission, Clarisse clique **Demander un arbitrage** : « Quelle position l'Agence défend-elle ? », deux options (position ferme, position de compromis), recommandation : compromis.",
        "La question devient la décision attendue de la commission ; la DG et son assistante sont prévenues.",
        "La DG clique **Trancher** au tableau de bord, garde l'option recommandée et ajoute une échéance.",
        "La décision DEC/2026/0003 est inscrite, rattachée à la commission ; Clarisse est prévenue ; la fiche affiche « Tranché · retenu : position de compromis ».",
      ], "une seule porte pour décider, et une trace complète du raisonnement."],
    ],
    changes: ["Arbitrages étendus aux activités (I-03).", "« Tous les dossiers » (I-13).", "Export du portefeuille (I-22)."],
  }),
  ...module("8. Projets", {
    role: "Exécuter un projet du début à la fin : un objectif, une fin, une équipe, des tâches, des livrables, un budget.",
    access: ["Portefeuille › Projets, une entité, ou la recherche. Membres du projet selon leur rôle (administrateur, éditeur, commentateur, lecteur)."],
    features: [
      "Vues : liste, tableau, calendrier, chronologie, livrables, contrats, réunions, documents, tableau de bord, automatisations.",
      "Tableau de bord du projet : gouvernance (origine, commanditaire, chef de projet, entité, budget, activité du plan), **risques du projet**, **arbitrages de la DG**, équipe, retards, échéances.",
      "Livrables : prévu, en cours, soumis, en revue, à corriger ou validé, payé ; responsable et valideur distincts.",
    ],
    scenarios: [
      ["signaler un risque sur un projet", "Fiston, chef du projet « Refonte de la plateforme ».", [
        "Sur le tableau de bord du projet, section « Risques du projet », il clique **Ajouter un risque**.",
        "« Retard de livraison des données », probabilité 4, impact 3 : niveau Élevé (12) ; responsable, parade.",
        "Le risque apparaît dans le projet pour toute l'équipe, et dans le registre des risques de la DG.",
      ], "le risque n'est plus une note isolée : il est rattaché, suivi et visible au bon niveau."],
    ],
    changes: ["Risques du projet (I-12).", "La décision attendue n'est plus un champ libre (I-02)."],
  }),
  ...module("9. Décisions", {
    role: "Le registre officiel des décisions de la DG : chaque décision est numérotée, figée, confiée à un chargé d'exécution et suivie jusqu'à son exécution.",
    access: ["Menu : Pilotage › Décisions. Consulter : profils de pilotage et agents ; inscrire : DG et assistant(e)."],
    features: [
      "Numéro DEC/AAAA/NNNN, texte figé, dossier rattaché, chargé d'exécution, échéance, confidentialité.",
      "Exécution à sens unique : à exécuter, en cours, exécutée ; rappels avant l'échéance et en retard.",
      "Remplacement : une décision erronée est remplacée par une nouvelle ; l'ancienne reste lisible.",
      "Origines : saisie directe, arbitrage tranché, validation d'un compte rendu de réunion.",
    ],
    rules: ["Inscrire une décision sur un dossier tranche l'arbitrage qui y attendait.", "Jamais par un coéquipier IA."],
    scenarios: [
      ["exécuter une décision", "Didier, directeur de la Communication et des Partenariats.", [
        "Didier reçoit l'avis « Décision à exécuter : lancer la campagne d'information ».",
        "Il passe la décision « en cours », puis « exécutée » avec une note.",
        "La DG voit la décision sortir des retards du tableau de bord.",
      ], "le registre dit à tout moment ce qui a été décidé et ce qui a été fait."],
    ],
    changes: ["Une seule porte avec les arbitrages (I-01)."],
  }),
  ...module("10. Réunions", {
    role: "Du calendrier au compte rendu officiel, et le suivi de ce qui y a été décidé.",
    access: ["Menu : Pilotage › Réunions ; aussi dans chaque entité, projet, activité et partenaire."],
    features: [
      "Programmer, convoquer (personnes ou entité entière), recueillir les réponses.",
      "Ordre du jour, pièces (aperçu), présences, notes, recommandations et décisions de séance.",
      "Compte rendu : brouillon, soumis, retourné ou validé (figé) ; les décisions de séance entrent au registre à la validation.",
      "Export du compte rendu en Word (modèle officiel) ou en PDF.",
    ],
    scenarios: [
      ["le comité de direction", "Esther prépare ; la DG préside ; Fiston rédige.", [
        "Esther programme le comité et envoie la convocation ; chaque convoqué répond.",
        "Fiston saisit le compte rendu, les recommandations et une décision de séance, puis soumet.",
        "La DG valide : la décision reçoit son numéro au registre ; le compte rendu est figé.",
        "Esther clique **Exporter › PDF** pour diffusion.",
      ], "un compte rendu officiel, des recommandations suivies, des décisions au registre."],
    ],
    changes: ["Convocation en lecture, champs ouverts avec « Modifier » (I-23).", "Export Word ou PDF au choix."],
  }),
  ...module("11. Plans de travail et revue trimestrielle", {
    role: "Le plan annuel de chaque entité, son suivi et ses revues trimestrielles.",
    access: ["Menu : Suivi-évaluation › Plans de travail."],
    features: [
      "Plan : en préparation, soumis, approuvé ; activités avec responsable, cible, date de fin, budget ; révisions tracées.",
      "L'avancement d'une activité réalisée par des projets ou activités remonte d'eux.",
      "**Revue trimestrielle** : avancement constaté et attendu relevés, appréciation proposée puis corrigée, cause et mesure exigées pour tout retard, synthèse ; validation par la DG ; revue figée.",
    ],
    scenarios: [
      ["la revue du quatrième trimestre", "Fiston prépare ; la DG valide.", [
        "Fiston ouvre le plan de sa direction et clique **Préparer la revue** du T4.",
        "L'audit de sécurité est proposé « compromis » (45 % pour 100 % attendus) : il indique la cause et la mesure.",
        "Il rédige la synthèse et soumet ; une soumission sans synthèse aurait été refusée.",
        "La DG valide : la revue est figée.",
      ], "chaque trimestre laisse une trace de ce qui a été dit et décidé."],
    ],
  }),
  ...module("12. Risques et indicateurs", {
    role: "Les risques qui menacent les engagements de l'Agence, et les indicateurs qui mesurent l'atteinte du plan.",
    access: ["Menu : Pilotage › Risques et indicateurs. Gestion : DG, DGA, chefs d'entité."],
    features: [
      "Risques : probabilité et impact de 1 à 5, niveau (modéré, élevé, critique), responsable, parade, état (ouvert, maîtrisé, clos), projet menacé.",
      "Indicateurs : référence, cible, résultat, unité, source, taux d'atteinte, activité du plan mesurée.",
      "Export (Excel, PDF, Word, CSV) ; affichage au tableau de bord DG.",
    ],
    scenarios: [
      ["suivre un indicateur du plan", "La DG ; Esther.", [
        "Esther crée « Communes couvertes par un schéma » : référence 10, cible 40, résultat 18, rattaché à l'activité « Élaborer le schéma ».",
        "Le tableau de bord DG affiche l'indicateur et son taux d'atteinte.",
      ], "ce que la DG voit est désormais saisi et mis à jour dans l'outil."],
    ],
    changes: ["Écran de saisie, risques rattachés aux projets, indicateurs reliés au plan (I-12)."],
  }),
  ...module("13. Partenaires et conventions", {
    role: "L'annuaire unique des tiers, et le registre des actes conclus avec eux.",
    access: ["Menu : Partenariats."],
    features: [
      "Partenaires : états (identifié, en discussion, actif, suspendu, clos), contacts, documents, historique, fusion des doublons, rapprochement.",
      "Conventions : en préparation, au parapheur, en vigueur (CONV/AAAA/NNNN), échue, résiliée ; avenants ; alertes d'échéance à 90, 30, 7 jours.",
      "Export de l'annuaire et du registre.",
    ],
    scenarios: [
      ["faire entrer une convention en vigueur", "Le point focal ; la DG.", [
        "Le point focal prépare l'accord et le soumet au parapheur.",
        "La DG signe : l'accord entre en vigueur et reçoit son numéro ; son texte est figé.",
      ], "le registre juridique est à jour sans ressaisie."],
    ],
    changes: ["Export de l'annuaire et du registre des conventions (I-22)."],
  }),
  ...module("14. Parapheur et courrier", {
    role: "Le circuit de visa et de signature, et le circuit du courrier du bureau d'ordre à la réponse.",
    access: ["Menu : Secrétariat."],
    features: [
      "Parapheur : circuit de visas puis signature, approbation ou rejet commenté, délégation de signature, document figé pendant le circuit.",
      "Courrier : enregistrement (ENT ou SOR), imputation par la direction puis en cascade par le chef d'entité, copies, annotations, prise en charge, réponse par le parapheur, clôture ou classement motivé ; « Mon courrier » pour chacun.",
    ],
    scenarios: [
      ["un courrier imputé en cascade", "Esther ; Fiston ; Gaston.", [
        "Esther enregistre la lettre et l'impute à l'Ingénierie territoriale, « pour traitement », délai 10 jours, copie à la DGA.",
        "Fiston l'impute à Gaston ; Gaston la prend en charge et prépare la réponse, qui part au parapheur.",
        "Signée, la réponse est enregistrée en sortie et le courrier entrant est clos.",
      ], "chaque étape est tracée ; un retard remonte au chef d'entité."],
    ],
  }),
  ...module("15. Organisation, ressources humaines et administration", {
    role: "La structure de l'Agence, les dossiers des agents et l'administration de l'outil.",
    access: ["Menu : Organisation ; Administration système pour l'administrateur de la plateforme."],
    features: [
      "Structure : organigramme, attributions, écarts de participation, personnes, profils et droits, domaines, messagerie.",
      "Ressources humaines : registre des agents ; créer un agent ouvre son compte (profil Agent, Stagiaire ou Consultant) ; Mon dossier.",
      "Administration : état du système, comptes, sessions, rôles et droits, bandeau, journal d'audit (export tracé).",
    ],
    scenarios: [
      ["donner son profil à l'assistante de la DG", "L'administrateur.", [
        "Dans Structure › Personnes, il choisit Esther et lui attribue le profil **Assistant(e) de direction**.",
        "Esther voit aussitôt le bloc « Saisir », le courrier à imputer et le tableau de bord DG.",
      ], "chacun voit l'outil tel que son rôle le demande."],
    ],
    changes: ["Profil Assistant(e) de direction (I-30)."],
  }),
  ...module("16. Fonctions transverses", {
    role: "Ce qui vaut partout : notifications, documents, recherche, export, mise en page.",
    access: ["Tout le monde."],
    features: [
      "Notifications par domaine, préférences de courriel, rappels d'échéance.",
      "Documents typés, aperçu partout, pièces officielles non supprimables.",
      "Recherche (Ctrl ou ⌘ K).",
      "**Exporter** : choix du format, charte de l'agence, export tracé.",
      "Toutes les pages au même gabarit : le contenu ne glisse plus d'une page à l'autre.",
    ],
    scenarios: [
      ["exporter un registre", "Esther.", [
        "Dans Décisions, Esther clique **Exporter** et choisit **Excel**.",
        "Le fichier reprend exactement ce qui est affiché (onglet et filtres compris), aux couleurs de l'agence.",
      ], "l'export est inscrit au journal : titre, format, nombre de lignes."],
    ],
  }),
);

// ------------------------------------------------------------------ reste à faire
content.push(
  h1("17. Ce qui reste à trancher ou à faire"),
  ...[
    "**Ce qui est adressé à la DG (I-33)** : faut-il une notion de « dossier suivi par la DG » (transmis par une direction, ou stratégique par nature) pour que son portefeuille ne montre que ces dossiers ? Qui transmet un dossier ?",
    "**Profils (I-34)** : le DGA inscrit-il des décisions par délégation ? Le responsable informatique est-il administrateur de droit ? Les stagiaires voient-ils le portefeuille ?",
    "**Saisie pour le compte de la DG** : faut-il que la DG confirme d'un clic une décision inscrite par son assistant(e) avant qu'elle soit numérotée ?",
    "**Grilles homogènes (I-21)** : Décisions, Parapheur, Plans et Structure en « consulter puis Modifier » avec actions en ligne.",
    "**Congés et absences (I-35)** : prêts sur leur branche, à fusionner quand vous le déciderez.",
    "**Finance des partenariats** : engagements et décaissements, reportés à votre demande.",
    "**Décision de séance et décision attendue (I-04)** : relier une décision prise en réunion à la décision attendue du dossier rattaché.",
  ].map(bullet),
);

const doc = new Document({
  creator: "ANAT Pilotage",
  title: "ANAT Pilotage — guide module par module",
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 34, bold: true, color: BLUE }, paragraph: { spacing: { before: 240, after: 160 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 26, bold: true, color: "1F2A37" }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 22, bold: true }, paragraph: { spacing: { before: 160, after: 80 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: { config: numberingConfigs },
  features: { updateFields: true },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t("ANAT Pilotage · guide module par module", { size: 16, color: "888888" })] })] }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ font: FONT, size: 16, color: "888888", children: ["Page ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES] })] })],
        }),
      },
      children: content,
    },
  ],
});
Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(process.argv[3] ?? path.resolve(ROOT, "docs/word/ANAT-Pilotage-guide-module-par-module.docx"), b);
  console.log("ok", b.length);
});
