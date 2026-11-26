/* =========================================================================
   La couche d'accès — le seul endroit de la console qui parle au réseau.

   Deux règles tenues ici, et elles valent pour toute la console :

   1. **Un écran qui affiche 0 alors qu'il n'a pas pu lire est un mensonge.**
      Aucune fonction d'ici ne renvoie de valeur par défaut en cas d'échec.
      Elle lève, l'écran l'apprend, et il le dit.

   2. **Un refus n'est pas une panne.** Un 403 est une réponse normale de
      l'application : la personne n'a pas ce droit, et l'écran l'écrit en
      toutes lettres au lieu d'afficher une erreur rouge ou un tableau vide.

   La console n'a pas d'identité propre. Elle porte le cookie de session de
   la personne connectée, et se heurte aux mêmes refus que n'importe quelle
   autre fenêtre sur l'application.
   ========================================================================= */

export type NatureEchec = "refus" | "absent" | "reseau" | "serveur";

export class EchecAppel extends Error {
  constructor(
    readonly nature: NatureEchec,
    readonly statut: number,
    /** Le message de l'application, affiché tel quel. Jamais reformulé. */
    message: string,
    readonly route: string,
  ) {
    super(message);
    this.name = "EchecAppel";
  }
}

/** Dit à l'opérateur ce qui s'est passé, sans jargon et sans dramatiser. */
export function expliquer(e: unknown): { titre: string; texte: string; ton: "vigilance" | "critique" } {
  if (e instanceof EchecAppel) {
    if (e.nature === "refus")
      return {
        titre: "Vous n'avez pas le droit de voir ceci",
        texte: `${e.message} La console n'ouvre aucune porte que l'application vous fermerait.`,
        ton: "vigilance",
      };
    if (e.nature === "absent")
      return { titre: "Introuvable", texte: `${e.route} n'existe pas sur ce serveur.`, ton: "vigilance" };
    if (e.nature === "reseau")
      return {
        titre: "L'application est injoignable",
        texte: "Rien n'est affiché plutôt qu'un chiffre faux. Vérifiez que le serveur répond, puis réessayez.",
        ton: "critique",
      };
  }
  return {
    titre: "La lecture a échoué",
    texte: e instanceof Error ? e.message : "Erreur inconnue.",
    ton: "critique",
  };
}

const BASE = "";

export async function lire<T>(route: string, options?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(BASE + route, {
      ...options,
      credentials: "include",
      headers: { Accept: "application/json", ...(options?.headers ?? {}) },
    });
  } catch {
    throw new EchecAppel("reseau", 0, "Le serveur n'a pas répondu.", route);
  }

  if (!r.ok) {
    /* Le message de l'application est repris tel quel : c'est elle qui sait
       pourquoi elle refuse, pas nous. */
    let message = `Le serveur a répondu ${r.status}.`;
    try {
      const corps = (await r.json()) as { error?: string; message?: string };
      message = corps.error ?? corps.message ?? message;
    } catch { /* corps non JSON : on garde le message générique */ }
    const nature: NatureEchec =
      r.status === 401 || r.status === 403 ? "refus" : r.status === 404 ? "absent" : "serveur";
    throw new EchecAppel(nature, r.status, message, route);
  }

  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

export async function ecrire<T>(route: string, methode: "POST" | "PUT" | "PATCH" | "DELETE", corps?: unknown): Promise<T> {
  return lire<T>(route, {
    method: methode,
    ...(corps === undefined ? {} : { body: JSON.stringify(corps), headers: { "Content-Type": "application/json" } }),
  });
}
