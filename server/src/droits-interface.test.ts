import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, isPermission } from "./permissions.js";

/*
 * Règle 5.1.3 du système de design : « Ce qui n'est pas permis n'est pas proposé. Un bouton absent vaut mieux qu'un
 * bouton qui échoue. » Le serveur reste seul juge, mais l'interface ne doit jamais offrir un geste qu'il refusera.
 *
 * Ce test balaie l'arborescence `web/src` et exige que chaque droit du catalogue y soit consulté, de l'une des deux
 * façons admises :
 *   1. un appel `can("<droit>")` (le hook `useCan` lit la liste plate `me.permissions`) ;
 *   2. un drapeau calculé au serveur et renvoyé dans la charge utile — le meilleur procédé, puisque la règle n'est
 *      alors écrite qu'une fois. Le droit figure dans ce cas dans DRAPEAUX ci-dessous, avec le fichier serveur qui
 *      calcule le drapeau et le fichier d'interface qui le lit.
 *
 * Un droit ajouté au catalogue sans l'une des deux fait échouer la suite. La liste DRAPEAUX ne se vide pas pour
 * faire passer le test : chaque entrée est vérifiée (les fichiers cités doivent exister et contenir le drapeau cité),
 * et un droit qui finit par être consulté par `can()` doit en sortir.
 */

const WEB = new URL("../../web/src/", import.meta.url);
const SERVEUR = new URL("./", import.meta.url);

/** Tous les fichiers de code d'un dossier, en descendant. */
function sources(dir: URL): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const child = new URL(`${e.name}${e.isDirectory() ? "/" : ""}`, dir);
    if (e.isDirectory()) return sources(child);
    return /\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [child] : [];
  });
}

const fichiers = sources(WEB);
const texte = new Map(fichiers.map((f) => [f.href.slice(WEB.href.length), readFileSync(f, "utf8")] as const));
const lu = (chemin: string, racine: URL) => {
  try {
    return readFileSync(new URL(chemin, racine), "utf8");
  } catch {
    return null;
  }
};

/** Droits consultés par un appel `can("…")` quelque part dans l'interface. */
const CONSULTES = new Set<string>(
  [...texte.values()].flatMap((src) => [...src.matchAll(/\bcan\(\s*"([a-z_]+\.[a-z_]+)"/g)].map((m) => m[1])),
);

/**
 * Droits que l'interface respecte par un drapeau du serveur plutôt que par `can()`, ou qui ne gouvernent aucun bouton.
 * `serveur` : le fichier et l'expression qui décident. `interface` : le fichier et l'expression qui en tiennent lieu.
 * `pourquoi` : la justification, en une phrase. Une entrée sans justification est un échec.
 */
const DRAPEAUX: { droit: string; serveur: [string, string]; interface: [string, string]; pourquoi: string }[] = [
  {
    droit: "meetings.validate",
    serveur: ["meetings.ts", 'validate: perms.includes("meetings.validate")'],
    interface: ["pages/Meetings.tsx", "draft.can.decide"],
    pourquoi:
      "Valider un compte rendu revient à la présidence de séance quand elle est désignée, sinon au détenteur du droit, et jamais à la personne qui a rédigé : seul le serveur connaît ces trois conditions. Il les réduit au drapeau `can.decide` de la réunion, que les boutons « Retourner » et « Valider » lisent.",
  },
  {
    droit: "attributions.approve",
    serveur: ["attributions.ts", 'approve: s.status === "draft" && perms.includes("attributions.approve")'],
    interface: ["pages/Attributions.tsx", "existing.data?.can.approve"],
    pourquoi:
      "Approuver une fiche d'attributions suppose en outre qu'elle soit encore au brouillon et qu'on n'en soit pas l'auteur : le serveur renvoie `can.approve` déjà composé, que le bouton « Approuver » lit.",
  },
  {
    droit: "deliverables.validate",
    serveur: ["deliverables.ts", 'p.includes("deliverables.validate") || d.validator_id === actorId'],
    interface: ["pages/ProjectDossier.tsx", "d.can.review"],
    pourquoi:
      "Le valideur nommé sur un livrable vaut le droit général, et la personne responsable ne valide pas son propre livrable : le serveur compose ces conditions avec l'état du livrable dans `can.review` et `can.decide`, que lisent les boutons de réception et de décision.",
  },
  {
    droit: "deliverables.view",
    serveur: ["deliverables.ts", 'const follow = perms.includes("deliverables.view")'],
    interface: ["pages/ProjectDossier.tsx", "/api/deliverables"],
    pourquoi:
      "Ce droit ne commande aucun bouton : il élargit ce que la liste des livrables renvoie, au-delà des siens, sur les projets que l'on peut lire. L'interface affiche ce que le serveur lui donne ; il n'y a rien à cacher.",
  },
  {
    droit: "ai.approve",
    serveur: ["ai/engine.ts", 'includes("ai.approve")'],
    interface: ["components/ai.tsx", 'can("ai.approve")'],
    pourquoi:
      "Décider d'une proposition de l'IA exige aussi le rôle d'éditeur sur le projet et de ne pas être la personne visée : le serveur ne renvoie dans `/api/ai/approvals` que les demandes décidables. Le droit est néanmoins consulté à l'ouverture du panneau, car une demande née de l'assistant est listée à son auteur sans ce contrôle.",
  },
];

describe("Les droits du catalogue et l'interface", () => {
  it("balaie bien l'arborescence de l'interface", () => {
    expect(texte.size).toBeGreaterThan(40);
    expect([...texte.keys()]).toContain("lib/hooks.ts");
    expect(CONSULTES.size).toBeGreaterThan(30);
  });

  it("ne cite dans DRAPEAUX que des droits du catalogue, une seule fois chacun", () => {
    const droits = DRAPEAUX.map((d) => d.droit);
    expect(droits.filter((d) => !isPermission(d))).toEqual([]);
    expect(droits.filter((d, i) => droits.indexOf(d) !== i)).toEqual([]);
  });

  it("justifie chaque exception, pièces à l'appui", () => {
    for (const e of DRAPEAUX) {
      expect(e.pourquoi.length, `${e.droit} : justification trop courte`).toBeGreaterThan(80);
      const serveur = lu(e.serveur[0], SERVEUR);
      expect(serveur, `${e.droit} : fichier serveur ${e.serveur[0]} introuvable`).not.toBeNull();
      expect(serveur, `${e.droit} : ${e.serveur[0]} ne contient plus « ${e.serveur[1]} »`).toContain(e.serveur[1]);
      const ui = texte.get(e.interface[0]);
      expect(ui, `${e.droit} : fichier d'interface ${e.interface[0]} introuvable`).toBeDefined();
      expect(ui, `${e.droit} : ${e.interface[0]} ne lit plus « ${e.interface[1]} »`).toContain(e.interface[1]);
    }
  });

  it("consulte chaque droit du catalogue, par `can()` ou par un drapeau justifié", () => {
    const couverts = new Set([...CONSULTES, ...DRAPEAUX.map((d) => d.droit)]);
    expect(ALL_PERMISSIONS.filter((p) => !couverts.has(p))).toEqual([]);
  });
});
