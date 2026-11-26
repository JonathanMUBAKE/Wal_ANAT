import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
 * Lot F1.1 / F1.8 : « Tout bouton passe par `Button` ou `IconButton` ». La taille et la forme d'un bouton ne varient
 * pas d'un module à l'autre ; seule l'accentuation varie, selon l'insistance de l'action.
 *
 * Ce test balaie `web/src` et échoue si une balise `<button` apparaît hors des fichiers de briques. Il ne se contente
 * pas d'interdire : chaque fichier qui garde des balises brutes figure dans EXCEPTIONS avec leur NOMBRE EXACT et la
 * raison pour laquelle `Button` ne convient pas. Le nombre est vérifié dans les deux sens : une balise de plus fait
 * échouer (rechute), une balise de moins aussi (la liste se resserre ; on ne la laisse pas se périmer).
 *
 * Ce qui reste brut n'est jamais un bouton d'action de la maison (étiquette, taille 32/36/40 px, accentuation) :
 * c'est un élément qui porte sa propre forme. Les catégories :
 *   LIGNE    cellule, ligne ou carte entière cliquable (sa forme est celle de la ligne, pas d'un bouton) ;
 *   DECLEUR  déclencheur d'un sélecteur/menu Radix (`asChild`) dont le contenu est une valeur affichée (puce
 *            d'échéance, avatar, priorité…), pas un libellé d'action ;
 *   ONGLET   onglet, bouton radio ou case d'un groupe segmenté, dont l'état sélectionné est la forme ;
 *   LIEN     action textuelle en ligne, qui se lit comme un lien (soulignée au survol), au milieu d'une phrase ;
 *   PASTILLE pastille de choix (couleur, icône, étoile) ou petite croix de retrait dans une puce : taille fixée par
 *            ce qu'elle contient, hors des trois gabarits ;
 *   CHROME   commande de l'enveloppe (barre du haut, volet latéral) qui a son propre gabarit.
 */

const WEB = new URL("../../web/src/", import.meta.url);

/** Fichiers de briques : seuls autorisés à écrire `<button`. */
const BRIQUES = ["components/ui.tsx"];

function sources(dir: URL): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const child = new URL(`${e.name}${e.isDirectory() ? "/" : ""}`, dir);
    if (e.isDirectory()) return sources(child);
    return /\.tsx$/.test(e.name) ? [child] : [];
  });
}

const comptes = new Map<string, number>();
for (const f of sources(WEB)) {
  const chemin = f.href.slice(WEB.href.length);
  const n = (readFileSync(f, "utf8").match(/<button\b/g) ?? []).length;
  if (n > 0) comptes.set(chemin, n);
}

/** Fichier -> nombre exact de balises brutes tolérées, et pourquoi. */
const EXCEPTIONS: Record<string, { n: number; raison: string }> = {
  "components/ai.tsx": { n: 1, raison: "LIEN : « Arrêter » dans le bandeau d'exécution d'un agent, texte de 12 px sans cadre." },
  "components/Assistant.tsx": {
    n: 2,
    raison: "LIGNE : suggestions de question (cartes arrondies pleine largeur) ; l'envoi est un carré d'icône plein (bg-fg) propre au champ de saisie.",
  },
  "components/AttachmentPreview.tsx": { n: 1, raison: "ONGLET : sélecteur de pièce dans la visionneuse, 28 px, état actif." },
  "components/Attachments.tsx": { n: 2, raison: "LIGNE : vignette et nom d'une pièce jointe, qui ouvrent l'aperçu." },
  "components/AvatarUpload.tsx": { n: 2, raison: "DECLEUR : l'avatar lui-même est le bouton de changement de photo." },
  "components/collection.tsx": {
    n: 19,
    raison:
      "LIGNE/ONGLET/LIEN : en-têtes de colonne triables, bascules de groupe, segments de vue, jour et événements du calendrier, " +
      "croix d'effacement de la recherche, liens « Effacer » / « Désélectionner » ; RoundBtn et le déclencheur « Filtres » portent leur gabarit propre (rond, compteur).",
  },
  "components/dialogs.tsx": {
    n: 12,
    raison:
      "PASTILLE/LIGNE/DECLEUR : choix de couleur et d'icône, cartes de choix d'accès et de modèle, puces d'échéance/assigné/priorité " +
      "(déclencheurs de sélecteurs), croix de retrait.",
  },
  "components/documents.tsx": { n: 1, raison: "LIGNE : nom du document qui ouvre l'aperçu." },
  "components/ErrorBoundary.tsx": {
    n: 1,
    raison:
      "A CONVERTIR PLUS TARD : « Recharger » est un vrai bouton, mais il est en bg-primary au lieu du bleu nuit de `Button primary` ; " +
      "le convertir change la couleur de l'écran de secours, décision de design à prendre.",
  },
  "components/export-menu.tsx": { n: 1, raison: "DECLEUR : déclencheur du menu d'export, rendu en carré d'icône par la barre d'outils." },
  "components/ImportProject.tsx": { n: 3, raison: "LIGNE/DECLEUR : zone de dépôt de fichier (glisser-déposer) et puces d'échéance." },
  "components/MeetingViews.tsx": {
    n: 4,
    raison: "LIEN/LIGNE : « Effacer les filtres » dans un état vide, cartes de réunion cliquables, ligne de la prochaine réunion, « Ouvrir le compte rendu » (pleine largeur de carte, bleu nuit propre).",
  },
  "components/pickers.tsx": { n: 2, raison: "LIGNE : options d'un sélecteur de personne et d'échéance." },
  "components/ProjectGovernance.tsx": { n: 2, raison: "LIGNE/PASTILLE : ligne de tâche cliquable ; crayon de la fiche en icône de 12 px sans cadre." },
  "components/refselect.tsx": { n: 1, raison: "LIEN : « Ajouter une valeur » sous un champ de référentiel." },
  "components/Sidebar.tsx": {
    n: 8,
    raison: "CHROME : entrées repliables du volet, barre du haut (menu, recherche 40 px, assistant, boîte de réception, notifications, compte) en carrés de 40 px propres à l'enveloppe.",
  },
  "components/tabs.tsx": { n: 1, raison: "ONGLET : brique des onglets elle-même." },
  "components/TaskDrawer.tsx": {
    n: 16,
    raison:
      "DECLEUR/LIGNE/ONGLET/LIEN : champs de la fiche tâche qui ouvrent un sélecteur (responsable, dates, priorité, section, récurrence), " +
      "description cliquable, étiquettes, onglets du tiroir, sous-tâches, retraits.",
  },
  "components/TaskRow.tsx": { n: 2, raison: "LIGNE : titre de tâche et en-tête de groupe repliable." },
  "components/unit-dashboard.tsx": { n: 3, raison: "LIGNE : tâche, carte de projet et carte « Nouveau projet » entièrement cliquables." },
  "components/views.tsx": { n: 2, raison: "LIGNE/PASTILLE : case de matrice des risques et titre de risque qui ouvre la fiche." },
  "pages/Admin.tsx": { n: 3, raison: "LIGNE/LIEN : nom d'un compte qui ouvre son journal, cartes d'option de politique." },
  "pages/AdminPlus.tsx": { n: 1, raison: "PASTILLE : croix de masquage du bandeau d'annonce." },
  "pages/AdminReferentials.tsx": { n: 3, raison: "ONGLET/PASTILLE : onglets des listes, choix de teinte et d'icône." },
  "pages/Agents.tsx": { n: 2, raison: "LIGNE/LIEN : exécution sélectionnable dans la liste, lien « Ouvrir la tâche »." },
  "pages/Agreements.tsx": { n: 2, raison: "PASTILLE/LIEN : retrait d'un partenaire ou d'un visa dans une puce." },
  "pages/Home.tsx": { n: 3, raison: "ONGLET/LIGNE : onglets de l'accueil, questions suggérées à l'assistant, ligne de journal d'exécution." },
  "pages/Hr.tsx": { n: 1, raison: "LIEN : nom d'un agent dans le tableau, qui ouvre sa fiche." },
  "pages/Inbox.tsx": { n: 3, raison: "ONGLET/LIEN/LIGNE : filtres de la boîte, « Voir la tâche », notification cliquable." },
  "pages/Login.tsx": { n: 4, raison: "LIEN/LIGNE : « Retour », « Mot de passe oublié ? », « Demander un accès », comptes de démonstration." },
  "pages/Meetings.tsx": { n: 4, raison: "ONGLET/PASTILLE/LIEN : choix passée/à venir en radio, retraits d'invités, lien vers la tâche." },
  "pages/OrgAccess.tsx": { n: 3, raison: "LIGNE/LIEN/ONGLET : profil sélectionnable, « Tout cocher » d'un groupe, niveaux d'accès en radio." },
  "pages/Organization.tsx": { n: 4, raison: "LIGNE/DECLEUR : repli d'un nœud d'organigramme, sélection, déclencheur de choix du responsable, option." },
  "pages/OrgMail.tsx": { n: 2, raison: "PASTILLE : copier et modifier une adresse, icônes de 28 px en bout de ligne." },
  "pages/Signataire.tsx": { n: 2, raison: "LIEN/PASTILLE : lien de préremplissage, retrait d'une copie." },
  "pages/Partners.tsx": { n: 2, raison: "LIEN/PASTILLE : retrait d'un visa, bascule « Afficher les archivés »." },
  "pages/Pilotage.tsx": { n: 3, raison: "LIGNE/LIEN : tuiles de chiffres cliquables, titre d'une alerte, arbitrage d'une demande." },
  "pages/Project.tsx": { n: 4, raison: "DECLEUR/LIGNE : pastille de statut, échéance, membres du projet, option d'ajout de membre." },
  "pages/ProjectDossier.tsx": { n: 3, raison: "LIGNE/PASTILLE : lignes de document cliquables, étoiles de notation." },
  "pages/Teams.tsx": { n: 2, raison: "LIGNE/PASTILLE : cartes de visibilité, choix de couleur." },
  "views/AutomationsView.tsx": { n: 2, raison: "LIGNE : exécution dépliable, choix d'agent." },
  "views/CalendarView.tsx": { n: 2, raison: "LIGNE/PASTILLE : tâche dans une case de jour, « + » d'ajout au survol." },
  "views/TimelineView.tsx": { n: 2, raison: "LIGNE : libellé de ligne et barre de tâche de la frise." },
};

describe("F1.8 : aucune balise <button> hors des briques", () => {
  it("les fichiers de briques existent", () => {
    for (const b of BRIQUES) expect(comptes.has(b), `${b} devrait contenir <button`).toBe(true);
  });

  it("aucun fichier ne porte une balise brute sans exception écrite", () => {
    const inconnus = [...comptes.keys()].filter((f) => !BRIQUES.includes(f) && !(f in EXCEPTIONS));
    expect(inconnus, `Balises <button> brutes hors brique : utilisez Button ou IconButton (components/ui.tsx), ou justifiez l'exception.`).toEqual([]);
  });

  it("chaque exception porte son nombre exact et une raison", () => {
    for (const [f, e] of Object.entries(EXCEPTIONS)) {
      expect(e.raison.trim().length, `${f} : raison manquante`).toBeGreaterThan(20);
      expect(comptes.get(f) ?? 0, `${f} : nombre de <button> brut (exception : ${e.n})`).toBe(e.n);
    }
  });
});
