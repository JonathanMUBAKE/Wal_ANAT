import { describe, expect, it } from "vitest";
import { canonique, ORIGINE, sceller, trous, verifier, type Maillon } from "./chaine.js";

/* =========================================================================
   Ce que ces tests tiennent, et pourquoi chacun existe.

   Une chaîne scellée ne se migre pas et ne se répare pas : si elle est fausse,
   on le découvre le jour où quelqu'un conteste un acte, c'est-à-dire le pire
   jour possible. Chaque propriété est donc éprouvée ici plutôt que supposée.
   ========================================================================= */

const acte = (n: number) => ({
  v: 1 as const, id: `act_${n}`, source: "pool-a", sequence: n,
  occurred_at: "2026-11-26T10:00:00.000Z", kind: "test.fait", label: "Fait de test",
  category: "Test", severity: "normale" as const,
  actor_id: "u_1", actor_name: "Une personne", target_id: null, on_behalf_of: null,
  org_id: null, org_name: null, object_type: null, object_id: null,
  summary: "", corrects: null, ip: null, country: null, user_agent: null,
  vault: null, data: {},
});

function chaineDe(n: number): Maillon[] {
  const m: Maillon[] = [];
  let precedente = ORIGINE;
  for (let i = 1; i <= n; i++) {
    const a = acte(i);
    const e = sceller(precedente, a);
    m.push({ rang: i, empreinte: e, empreinte_precedente: precedente, acte: a });
    precedente = e;
  }
  return m;
}

describe("la forme canonique", () => {
  it("ne dépend pas de l'ordre des clés", () => {
    /* Sans cela, deux sérialiseurs honnêtes produiraient deux empreintes pour
       le même acte, et la chaîne se casserait sans que rien ait été altéré. */
    expect(canonique({ b: 1, a: 2 })).toBe(canonique({ a: 2, b: 1 }));
  });

  it("trie en profondeur, pas seulement à la racine", () => {
    expect(canonique({ x: { b: 1, a: 2 } })).toBe(canonique({ x: { a: 2, b: 1 } }));
  });

  it("distingue une absence d'une valeur nulle", () => {
    /* « absent » et « vide » ne veulent pas dire la même chose quand on relit
       six mois après : la chaîne doit les séparer. */
    expect(canonique({ a: 1 })).not.toBe(canonique({ a: 1, b: null }));
  });

  it("ne confond pas un nombre et sa chaîne", () => {
    expect(canonique({ a: 1 })).not.toBe(canonique({ a: "1" }));
  });

  it("garde l'ordre d'un tableau, qui est porteur de sens", () => {
    expect(canonique([1, 2])).not.toBe(canonique([2, 1]));
  });
});

describe("le scellement", () => {
  it("lie chaque maillon au précédent", () => {
    const a = acte(1);
    expect(sceller(ORIGINE, a)).not.toBe(sceller("f".repeat(64), a));
  });

  it("ne confond pas deux découpages d'une même suite d'octets", () => {
    /* Sans préfixe de longueur, « ab »+« c » et « a »+« bc » donneraient la
       même empreinte. C'est le genre de faille qu'on ne voit jamais à l'œil. */
    expect(sceller(ORIGINE, { a: "b", c: "" })).not.toBe(sceller(ORIGINE, { a: "", c: "bc" }));
  });

  it("rend la même empreinte pour le même acte", () => {
    expect(sceller(ORIGINE, acte(1))).toBe(sceller(ORIGINE, acte(1)));
  });
});

describe("la vérification", () => {
  it("accepte une chaîne intacte", () => {
    const v = verifier(chaineDe(5));
    expect(v.intact).toBe(true);
    if (v.intact) expect(v.maillons).toBe(5);
  });

  it("accepte une chaîne vide", () => {
    expect(verifier([]).intact).toBe(true);
  });

  it("voit une entrée modifiée, et dit laquelle", () => {
    const c = chaineDe(5);
    (c[2].acte as { summary: string }).summary = "modifié après coup";
    const v = verifier(c);
    expect(v.intact).toBe(false);
    if (!v.intact) {
      expect(v.rangEnDefaut).toBe(3);
      expect(v.raison).toMatch(/modifiée après sa réception/);
    }
  });

  it("voit une entrée retirée", () => {
    /* Retirer un maillon casse le chaînage du suivant : c'est précisément ce
       qui rend une suppression impossible à cacher. */
    const c = chaineDe(5);
    c.splice(2, 1);
    const v = verifier(c);
    expect(v.intact).toBe(false);
    if (!v.intact) expect(v.raison).toMatch(/retirée, ou l'ordre a été changé/);
  });

  it("voit deux entrées interverties", () => {
    const c = chaineDe(5);
    [c[1], c[2]] = [c[2], c[1]];
    expect(verifier(c).intact).toBe(false);
  });

  it("voit une entrée ajoutée au milieu", () => {
    const c = chaineDe(5);
    c.splice(2, 0, { rang: 99, empreinte: "0".repeat(64), empreinte_precedente: c[1].empreinte, acte: acte(99) });
    expect(verifier(c).intact).toBe(false);
  });

  it("désigne le PREMIER défaut, pas le dernier", () => {
    /* Tout ce qui précède le défaut reste prouvé, et cela se dit : une chaîne
       cassée au maillon 300 atteste encore des 299 premiers. */
    const c = chaineDe(6);
    (c[1].acte as { summary: string }).summary = "x";
    (c[4].acte as { summary: string }).summary = "y";
    const v = verifier(c);
    expect(v.intact).toBe(false);
    if (!v.intact) expect(v.rangEnDefaut).toBe(2);
  });
});

describe("les trous dans une numérotation", () => {
  it("n'en voit pas dans une série continue", () => {
    expect(trous([1, 2, 3, 4])).toEqual([]);
  });

  it("voit un trou d'un seul numéro", () => {
    expect(trous([1, 2, 4])).toEqual([{ de: 3, a: 3 }]);
  });

  it("voit un trou large et le borne", () => {
    expect(trous([1, 10])).toEqual([{ de: 2, a: 9 }]);
  });

  it("voit plusieurs trous", () => {
    expect(trous([1, 3, 5])).toEqual([{ de: 2, a: 2 }, { de: 4, a: 4 }]);
  });

  it("ne s'émeut pas d'un doublon", () => {
    /* Le serveur livre au moins une fois : les doublons sont normaux et ne
       doivent jamais être pris pour un trou. */
    expect(trous([1, 2, 2, 3])).toEqual([]);
  });

  it("ne dépend pas de l'ordre d'arrivée", () => {
    /* Les actes viennent de liaisons inégales et n'arrivent pas dans l'ordre. */
    expect(trous([5, 1, 3])).toEqual([{ de: 2, a: 2 }, { de: 4, a: 4 }]);
  });

  it("ne voit rien dans une série vide ou d'un seul élément", () => {
    expect(trous([])).toEqual([]);
    expect(trous([7])).toEqual([]);
  });
});
