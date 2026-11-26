import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ouvrir, type Requetable } from "./base.js";
import { recevoir } from "./reception.js";
import { verifierChaine, journal, etatDesSources } from "./lecture.js";
import type { Enveloppe, Lot } from "./enveloppe.js";

const acte = (n: number, o: Partial<Enveloppe> = {}): Enveloppe => ({
  v: 1, id: `act_${n}`, source: "pool-kinshasa", sequence: n,
  occurred_at: new Date(Date.UTC(2026, 10, 26, 10, 0, n)).toISOString(),
  kind: "attribution.approved", label: "Fiche d'attribution approuvée",
  category: "Organisation", severity: "normale",
  actor_id: "u_alice", actor_name: "Directrice générale", target_id: null, on_behalf_of: null,
  org_id: "org_1", org_name: "ANAT (démonstration)", object_type: null, object_id: null,
  summary: "", corrects: null, ip: null, country: null, user_agent: null, vault: null, data: {},
  ...o,
});

const lot = (actes: Enveloppe[], source = "pool-kinshasa"): Lot => ({
  source, events: actes,
  signed_at: new Date().toISOString(),
  key_id: "anat-2026-11",
  signature: "signature-de-demonstration",
});

let base: Requetable;
beforeEach(async () => { base = await ouvrir(); });
afterEach(async () => { await base.fermer(); });

describe("recevoir un lot", () => {
  it("enregistre les actes et scelle la chaîne", async () => {
    const r = await recevoir(base, lot([acte(1), acte(2), acte(3)]));
    expect(r.retenus).toBe(3);
    expect((await verifierChaine(base)).intact).toBe(true);
  });

  it("n'enregistre qu'une fois un acte livré deux fois", async () => {
    /* Le contrat : il livre au moins une fois, la console enregistre
       exactement une fois. Un acquittement perdu produit un renvoi. */
    await recevoir(base, lot([acte(1), acte(2)]));
    const r = await recevoir(base, lot([acte(1), acte(2), acte(3)]));
    expect(r.deja_vus).toBe(2);
    expect(r.retenus).toBe(1);
    const p = await journal(base);
    expect(p.actes).toHaveLength(3);
  });

  it("acquitte aussi les doublons", async () => {
    /* Ne pas les acquitter laisserait la table de sortie du serveur se
       remplir indéfiniment de ce qu'il nous a déjà livré. */
    await recevoir(base, lot([acte(1)]));
    const r = await recevoir(base, lot([acte(1)]));
    expect(r.acquittes).toContain("act_1");
  });

  it("garde la chaîne intacte après un renvoi", async () => {
    await recevoir(base, lot([acte(1), acte(2)]));
    await recevoir(base, lot([acte(2), acte(3)]));
    expect((await verifierChaine(base)).intact).toBe(true);
  });

  it("scelle dans l'ordre des numéros à l'intérieur d'un lot", async () => {
    await recevoir(base, lot([acte(3), acte(1), acte(2)]));
    const p = await journal(base);
    const rangs = p.actes.map((a) => Number(a.sequence)).reverse();
    expect(rangs).toEqual([1, 2, 3]);
    expect((await verifierChaine(base)).intact).toBe(true);
  });

  it("met un acte en retard au bout de la chaîne, sans le ranger à sa place", async () => {
    /* La chaîne atteste l'ordre de RÉCEPTION et ne peut pas faire autrement.
       L'ordre des faits se lit sur `occurred_at` et `sequence`. Vouloir
       insérer un retardataire au bon endroit casserait tout. */
    await recevoir(base, lot([acte(5)]));
    await recevoir(base, lot([acte(2)]));
    const p = await journal(base);
    expect(Number(p.actes[0].sequence)).toBe(2);
    expect((await verifierChaine(base)).intact).toBe(true);
  });
});

describe("les trous dans la numérotation", () => {
  it("signale ce qui manque", async () => {
    const r = await recevoir(base, lot([acte(1), acte(2), acte(5)]));
    expect(r.trous).toEqual([{ de: 3, a: 4 }]);
  });

  it("referme un trou quand le retardataire arrive", async () => {
    await recevoir(base, lot([acte(1), acte(3)]));
    const r = await recevoir(base, lot([acte(2)]));
    expect(r.trous).toEqual([]);
  });

  it("compte les actes manquants dans l'état des sources", async () => {
    await recevoir(base, lot([acte(1), acte(6)]));
    const [s] = await etatDesSources(base);
    expect(s.actes_manquants).toBe(4);
  });

  it("ne mélange pas les numérotations de deux sources", async () => {
    /* Chaque pool numérote pour lui seul : un numéro 1 à Kinshasa et un
       numéro 1 à Lubumbashi sont deux actes différents. */
    await recevoir(base, lot([acte(1)], "pool-kinshasa"));
    await recevoir(base, lot([{ ...acte(1), id: "act_lub_1", source: "pool-lubumbashi" }], "pool-lubumbashi"));
    const etats = await etatDesSources(base);
    expect(etats).toHaveLength(2);
    expect(etats.every((e) => e.trous.length === 0)).toBe(true);
  });
});

describe("ce que la console ne prétend pas", () => {
  it("conserve la signature sans affirmer l'avoir vérifiée", async () => {
    /* Tant que la clé publique du serveur n'est pas installée, la chaîne
       n'est inaltérable que du point de vue de la console. L'écrire est la
       seule façon de ne pas promettre plus que ce qu'on tient. */
    const r = await recevoir(base, lot([acte(1)]));
    expect(r.signature_verifiee).toBe(false);
    expect(r.motif).toMatch(/clé publique/);
    const l = await base.une<{ signature: string; verifiee: boolean }>("SELECT signature, verifiee FROM lots LIMIT 1");
    expect(l?.signature).toBe("signature-de-demonstration");
    expect(l?.verifiee).toBe(false);
  });

  it("dit quand une liste est tronquée", async () => {
    await recevoir(base, lot(Array.from({ length: 12 }, (_, i) => acte(i + 1))));
    const p = await journal(base, { limite: 5 });
    expect(p.tronquee).toBe(true);
    expect(p.actes).toHaveLength(5);
    /* Le total ne porte que sur ce qui est affiché : annoncer 12 ici serait
       un mensonge arithmétique. */
    expect(p.total_affiche).toBe(5);
  });

  it("ne se dit pas tronquée quand elle ne l'est pas", async () => {
    await recevoir(base, lot([acte(1), acte(2)]));
    expect((await journal(base, { limite: 5 })).tronquee).toBe(false);
  });
});

describe("la vérification laisse une trace", () => {
  it("consigne chaque vérification, réussie ou non", async () => {
    await recevoir(base, lot([acte(1)]));
    await verifierChaine(base);
    await verifierChaine(base);
    const n = await base.une<{ n: string }>("SELECT count(*) AS n FROM verifications");
    expect(Number(n?.n)).toBe(2);
  });

  it("détecte une entrée modifiée directement en base", async () => {
    /* Le cas qui compte : quelqu'un atteint la base et réécrit une entrée.
       C'est exactement ce que la chaîne existe pour rendre visible. */
    await recevoir(base, lot([acte(1), acte(2), acte(3)]));
    await base.query(
      `UPDATE actes SET enveloppe = jsonb_set(enveloppe, '{summary}', '"réécrit"') WHERE sequence = 2`,
    );
    const v = await verifierChaine(base);
    expect(v.intact).toBe(false);
    if (!v.intact) expect(v.rangEnDefaut).toBe(2);
  });

  it("détecte une entrée supprimée directement en base", async () => {
    await recevoir(base, lot([acte(1), acte(2), acte(3)]));
    await base.query(`DELETE FROM actes WHERE sequence = 2`);
    expect((await verifierChaine(base)).intact).toBe(false);
  });
});

describe("l'enveloppe porte les champs des lots à venir", () => {
  it("accepte et scelle les deux identités d'un emprunt de session", async () => {
    /* Le champ existe dès la première entrée : s'il n'apparaissait qu'au lot
       qui l'ouvre, les entrées d'avant ne pourraient pas dire « personne
       n'empruntait » — elles ne pourraient rien dire du tout. */
    await recevoir(base, lot([acte(1, { on_behalf_of: { id: "u_2", name: "Un agent" } })]));
    const p = await journal(base);
    const e = p.actes[0].enveloppe as { on_behalf_of: { name: string } };
    expect(e.on_behalf_of.name).toBe("Un agent");
    expect((await verifierChaine(base)).intact).toBe(true);
  });

  it("accepte une correction qui déclare ce qu'elle corrige", async () => {
    /* Cette administration amende son écrit comme geste ordinaire, et une
       chaîne scellée ne permet pas d'amender : elle permet d'ajouter une
       entrée qui déclare corriger une autre. */
    await recevoir(base, lot([acte(1)]));
    await recevoir(base, lot([acte(2, { corrects: { id: "act_1", reason: "décision revue en séance" } })]));
    const p = await journal(base);
    const e = p.actes[0].enveloppe as { corrects: { reason: string } };
    expect(e.corrects.reason).toBe("décision revue en séance");
  });
});
