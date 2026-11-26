import { createHash } from "node:crypto";

/* =========================================================================
   La chaîne scellée — le cœur du centre de commande.

   Chaque acte reçu est haché avec l'empreinte de celui qui le précède. Changer
   un acte ancien change son empreinte, donc celle du suivant, donc toutes les
   suivantes : on ne peut pas réécrire une entrée sans réécrire toute la fin de
   la chaîne, et la fin de la chaîne est ce qu'on publie.

   **Ce que cela prouve, et c'est moins que ce qu'on croit :** qu'aucune entrée
   n'a bougé depuis sa réception, et qu'aucune n'a été retirée. Pas que ce qui
   a été envoyé était vrai. Si l'application qui émet est compromise, elle
   envoie des faussetés que la chaîne scelle fidèlement. « Intègre depuis sa
   réception » est exact ; « preuve irréfutable » ne l'est pas, et aucun écran
   ne l'écrira.
   ========================================================================= */

/** L'empreinte du maillon zéro. Fixe, publique, sans secret. */
export const ORIGINE = "0".repeat(64);

/* --- Forme canonique -----------------------------------------------------
   Une empreinte qui dépendrait de l'ordre des clés JSON serait invérifiable :
   deux sérialiseurs honnêtes produiraient deux empreintes pour le même acte,
   et la chaîne se casserait sans que personne ait rien altéré. On fixe donc
   une forme unique — clés triées à toute profondeur, aucun espace. */
export function canonique(valeur: unknown): string {
  if (valeur === null || typeof valeur !== "object") return JSON.stringify(valeur) ?? "null";
  if (Array.isArray(valeur)) return "[" + valeur.map(canonique).join(",") + "]";
  const o = valeur as Record<string, unknown>;
  const cles = Object.keys(o).sort();
  return "{" + cles.map((c) => JSON.stringify(c) + ":" + canonique(o[c])).join(",") + "}";
}

/* --- Un maillon ----------------------------------------------------------
   Le préfixe de longueur n'est pas une coquetterie : sans lui, deux actes
   différents pourraient produire la même concaténation — « ab »+« c » et
   « a »+« bc » donnent la même suite d'octets. Avec la longueur devant,
   l'ambiguïté disparaît. */
export function sceller(empreintePrecedente: string, acte: unknown): string {
  const corps = canonique(acte);
  return createHash("sha256")
    .update(empreintePrecedente, "utf8")
    .update("|", "utf8")
    .update(String(corps.length), "utf8")
    .update("|", "utf8")
    .update(corps, "utf8")
    .digest("hex");
}

/* --- Vérifier une chaîne entière ---------------------------------------- */
export interface Maillon {
  rang: number;
  empreinte: string;
  empreinte_precedente: string;
  /** L'acte tel qu'il a été scellé, sans les colonnes ajoutées à la réception. */
  acte: unknown;
}

export type Verdict =
  | { intact: true; maillons: number; derniere: string }
  | {
      intact: false;
      maillons: number;
      /** Le premier rang en défaut. Tout ce qui précède reste prouvé. */
      rangEnDefaut: number;
      /** Ce qui ne va pas, dit à l'opérateur et non au développeur. */
      raison: string;
    };

export function verifier(maillons: Maillon[]): Verdict {
  let precedente = ORIGINE;
  for (const m of maillons) {
    if (m.empreinte_precedente !== precedente)
      return {
        intact: false, maillons: maillons.length, rangEnDefaut: m.rang,
        raison: `Le maillon ${m.rang} dit suivre une empreinte qui n'est pas celle du maillon précédent. `
          + `Une entrée a été retirée, ou l'ordre a été changé.`,
      };
    const attendue = sceller(precedente, m.acte);
    if (attendue !== m.empreinte)
      return {
        intact: false, maillons: maillons.length, rangEnDefaut: m.rang,
        raison: `Le contenu du maillon ${m.rang} ne correspond plus à son empreinte. `
          + `Cette entrée a été modifiée après sa réception.`,
      };
    precedente = m.empreinte;
  }
  return { intact: true, maillons: maillons.length, derniere: precedente };
}

/* --- Les trous dans une série -------------------------------------------
   L'agent serveur numérote ses actes par source, et sa numérotation ne saute
   jamais : il a pris une ligne de table plutôt qu'une séquence PostgreSQL,
   précisément pour qu'une transaction annulée ne laisse pas filer un numéro.
   Un trou veut donc dire qu'un acte s'est perdu en route — et c'est le seul
   signal fiable que nous ayons. Il s'affiche, il ne se tait pas. */
export function trous(recus: number[]): Array<{ de: number; a: number }> {
  if (recus.length === 0) return [];
  const tries = [...new Set(recus)].sort((a, b) => a - b);
  const manquants: Array<{ de: number; a: number }> = [];
  for (let i = 1; i < tries.length; i++) {
    const avant = tries[i - 1], apres = tries[i];
    if (apres > avant + 1) manquants.push({ de: avant + 1, a: apres - 1 });
  }
  return manquants;
}
