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
    droit: "teams.manage",
    serveur: ["services.ts", "async managesTeam"],
    interface: ["pages/Teams.tsx", "t.can_manage"],
    pourquoi:
      "Gérer une équipe tient à trois choses que l'interface ne peut pas composer seule : en être responsable, détenir ce droit, ou administrer l'organisation — ce dernier rang supposant un rôle owner/admin SANS profil de fonction, que /api/me ne dit pas. Le serveur tranche dans `managesTeam` et pose le verdict sur la fiche de l'équipe (`can_manage`), que l'interface lit.",
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

/**
 * Deuxième garde-fou, né d'un manquement constaté : le test ci-dessus vérifie qu'un droit est consulté
 * QUELQUE PART dans l'interface, pas qu'il l'est à CHAQUE endroit qui appelle la route correspondante.
 * `ai.delegate` était bien consulté dans le tiroir d'une tâche, et six autres appels le réclamaient sans
 * le vérifier : point d'avancement, extraction de tâches, amélioration d'une description, suggestion de
 * sous-tâches, assignation d'un coéquipier IA, mention d'un coéquipier IA en commentaire.
 *
 * On liste donc les appels sensibles un par un : la route, le droit que le serveur exige, le fichier
 * serveur qui l'exige, et les fichiers d'interface autorisés à l'appeler — qui doivent tous consulter
 * ce droit. Un nouvel appel ailleurs fait échouer la suite.
 */
const COUCHE_DONNEES = ["lib/hooks.ts", "lib/api.ts"];
const APPELS: {
  appel: string;
  droit: string;
  serveur: [string, string];
  interfaces: string[];
  pourquoi: string;
}[] = [
  {
    // Le guillemet oblique final distingue `/ai/run` (confier) de `/ai/runs/:id/cancel` (arrêter), qui ne
    // demande que le rôle d'éditeur : arrêter une intervention en cours n'est pas en lancer une.
    appel: "/ai/run`",
    droit: "ai.delegate",
    serveur: ["ai/engine.ts", 'projectPerm(userId, t.project_id, "ai.delegate")'],
    interfaces: ["components/TaskDrawer.tsx"],
    pourquoi: "Confier une tâche à un coéquipier IA : le panneau « Coéquipiers IA » du tiroir.",
  },
  {
    appel: "/ai/subtasks",
    droit: "ai.delegate",
    serveur: ["ai/engine.ts", "async suggestSubtasks"],
    interfaces: ["components/TaskDrawer.tsx"],
    pourquoi: "Bouton « Suggérer » des sous-tâches : c'est l'IA qui les propose.",
  },
  {
    appel: "/ai/description",
    droit: "ai.delegate",
    serveur: ["ai/engine.ts", "async improveDescription"],
    interfaces: ["components/TaskDrawer.tsx"],
    pourquoi: "Bouton « Améliorer » la description d'une tâche.",
  },
  {
    appel: "/ai/parse",
    droit: "ai.delegate",
    serveur: ["ai/engine.ts", "async parseTasks"],
    interfaces: ["components/dialogs.tsx"],
    pourquoi: "Dialogue « Notes → tâches » : l'IA extrait les tâches d'un texte collé.",
  },
  {
    appel: "/ai/status",
    droit: "ai.delegate",
    serveur: ["ai/engine.ts", "async projectStatus"],
    interfaces: ["components/dialogs.tsx"],
    pourquoi: "Point d'avancement d'un projet, rédigé par l'IA.",
  },
  {
    appel: "/ai/rules",
    droit: "ai.rules",
    serveur: ["ai/engine.ts", 'projectPerm(userId, input.project_id, "ai.rules")'],
    interfaces: ["views/AutomationsView.tsx"],
    pourquoi: "Règles d'automatisation IA d'un projet : les créer, les modifier, les supprimer.",
  },
  {
    appel: "/api/ai/chat",
    droit: "ai.assistant",
    serveur: ["ai/engine.ts", 'requirePerm(userId, orgId, "ai.assistant")'],
    interfaces: ["components/Assistant.tsx"],
    pourquoi: "L'assistant conversationnel, ouvert depuis six endroits mais fermé à sa source.",
  },
];

describe("Les appels sensibles et leur garde", () => {
  it("ne cite que des droits du catalogue, avec une justification", () => {
    for (const a of APPELS) {
      expect(isPermission(a.droit), `${a.appel} : « ${a.droit} » n'est pas un droit du catalogue`).toBe(true);
      expect(a.pourquoi.length, `${a.appel} : justification trop courte`).toBeGreaterThan(30);
    }
  });

  it("vérifie que le serveur exige bien ce droit", () => {
    for (const a of APPELS) {
      const serveur = lu(a.serveur[0], SERVEUR);
      expect(serveur, `${a.appel} : fichier serveur ${a.serveur[0]} introuvable`).not.toBeNull();
      expect(serveur, `${a.appel} : ${a.serveur[0]} ne contient plus « ${a.serveur[1]} »`).toContain(a.serveur[1]);
      expect(serveur, `${a.appel} : ${a.serveur[0]} ne mentionne plus « ${a.droit} »`).toContain(a.droit);
    }
  });

  it("exige que chaque fichier d'interface qui appelle consulte le droit", () => {
    for (const a of APPELS) {
      for (const f of a.interfaces) {
        const ui = texte.get(f);
        expect(ui, `${a.appel} : fichier d'interface ${f} introuvable`).toBeDefined();
        expect(ui, `${a.appel} : ${f} ne consulte pas can("${a.droit}")`).toContain(`can("${a.droit}")`);
      }
    }
  });

  it("n'autorise aucun autre fichier de l'interface à appeler ces routes", () => {
    const fautes: string[] = [];
    for (const a of APPELS)
      for (const [chemin, src] of texte)
        if (src.includes(a.appel) && !a.interfaces.includes(chemin) && !COUCHE_DONNEES.includes(chemin))
          fautes.push(`${chemin} appelle ${a.appel} sans figurer dans APPELS (droit ${a.droit})`);
    expect(fautes).toEqual([]);
  });
});
