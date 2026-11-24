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
    const bloc = editeur.slice(Math.max(0, pose - 400), pose + 200);
    expect(bloc, "le garde-fou ne dépend pas du drapeau `dirty`").toContain("dirty");
    expect(bloc, "le garde-fou n'est jamais retiré").toContain("removeEventListener");
  });

  /*
   * La navigation interne — cliquer dans la barre latérale — n'est PAS couverte, et ce test le dit plutôt que de
   * laisser croire le contraire. `useBlocker` de react-router exige un routeur de données ; l'application est
   * montée sur `<BrowserRouter>` (web/src/main.tsx), et le convertir touche tous les écrans : c'est un lot à
   * part, laissé à l'arbitrage. Le jour où il sera converti, ce test est l'endroit où exiger le garde-fou.
   */
  it("reste monté sur BrowserRouter, donc la navigation interne n'est pas encore couverte", () => {
    expect(lire("main.tsx"), "le routeur a changé : il est temps d'armer un garde-fou de navigation").toContain(
      "<BrowserRouter>",
    );
    expect(editeur, "un blocage de route ne peut pas fonctionner sous BrowserRouter").not.toContain("useBlocker(");
  });

  it("garde intacte la phrase de référence du tiroir, pour le jour où la navigation sera couverte", () => {
    expect(lire("components/drawer.tsx")).toContain(
      "Les modifications saisies n'ont pas été enregistrées. Si vous fermez, elles seront perdues.",
    );
  });
});
