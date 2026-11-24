import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
 * Règle 5.2.4 du système de design (docs/DESIGN-SYSTEM.md, ligne 201) : « Des champs ouverts et modifiés ne se
 * ferment pas sans confirmation (tiroir, page, navigation). »
 *
 * Le tiroir la tenait déjà (components/drawer.tsx : un drapeau `dirty` et une ConfirmDialog avant de se fermer).
 * Le RECHARGEMENT ne la tenait nulle part : un compte rendu de réunion en cours de rédaction — jusqu'à une
 * centaine de champs pour un comité de direction, un seul bouton « Enregistrer », aucune sauvegarde
 * intermédiaire — disparaissait sans un mot (constat d'un testeur).
 *
 * Ce test garde l'écran où la perte coûtait le plus cher, et dit franchement ce qui n'est pas encore couvert.
 */
const lire = (chemin: string) => readFileSync(new URL(`../../web/src/${chemin}`, import.meta.url), "utf8");

describe("Le brouillon d'un compte rendu ne se perd pas", () => {
  const editeur = lire("pages/Meetings.tsx");

  it("retient le rechargement et la fermeture de l'onglet tant que le brouillon est modifié", () => {
    expect(editeur, "Meetings.tsx n'écoute pas beforeunload").toContain("beforeunload");
    // Le garde-fou doit s'armer sur `dirty` : toujours actif, il gênerait sans rien protéger de plus.
    const pose = editeur.indexOf('addEventListener("beforeunload"');
    expect(pose, "beforeunload n'est jamais posé").toBeGreaterThan(-1);
    const bloc = editeur.slice(Math.max(0, pose - 1800), pose + 400);
    expect(bloc, "le garde-fou ne dépend pas du drapeau `dirty`").toContain("dirty");
    expect(editeur, "le garde-fou n'est jamais retiré").toContain('removeEventListener("beforeunload"');
  });

  it("retient un clic sur un lien interne tant que le brouillon est modifié", () => {
    // `useBlocker` exigerait un routeur de données (l'application est sur <BrowserRouter>) : on retient le clic
    // lui-même, en phase de capture, avant que le lien n'agisse.
    const pose = editeur.indexOf('addEventListener("click"');
    expect(pose, "aucune interception du clic sur un lien").toBeGreaterThan(-1);
    expect(editeur.slice(pose, pose + 80), "l'interception doit être en phase de capture").toContain("true");
    const bloc = editeur.slice(Math.max(0, pose - 1200), pose + 300);
    expect(bloc, "l'interception ne dépend pas du drapeau `dirty`").toContain("dirty");
    expect(bloc, "elle doit viser les liens").toContain('closest?.("a[href]")');
    expect(bloc, "un clic du milieu ou avec modificateur doit rester libre").toContain("metaKey");
    expect(bloc, "une ouverture dans un nouvel onglet doit rester libre").toContain('target === "_blank"');
    expect(editeur, "l'interception n'est jamais retirée").toContain('removeEventListener("click"');
  });

  it("reprend mot pour mot la phrase du tiroir, au lieu d'en inventer une autre", () => {
    const phrase = "Les modifications saisies n'ont pas été enregistrées. Si vous fermez, elles seront perdues.";
    expect(lire("components/drawer.tsx"), "la phrase de référence a changé dans drawer.tsx").toContain(phrase);
    expect(editeur, "l'éditeur doit reprendre la phrase du tiroir").toContain(phrase);
    expect(editeur, "l'éditeur doit reprendre le titre du tiroir").toContain("Abandonner les modifications ?");
  });

  /*
   * Ce qui reste hors de portée, et qu'on écrit pour ne pas le croire couvert : les boutons Précédent et Suivant
   * du navigateur. Les retenir demanderait un routeur de données (`createBrowserRouter`), donc une conversion qui
   * touche tous les écrans — lot à part, laissé à l'arbitrage. Ce test échouera ce jour-là, pour le rappeler.
   */
  it("signale le jour où le routeur changera, pour couvrir aussi Précédent et Suivant", () => {
    expect(lire("main.tsx"), "le routeur a changé : un useBlocker couvrirait enfin Précédent/Suivant").toContain(
      "<BrowserRouter>",
    );
  });
});
