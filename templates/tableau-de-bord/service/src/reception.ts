import { randomUUID } from "node:crypto";
import type { Requetable } from "./base.js";
import { ORIGINE, sceller, trous } from "./chaine.js";
import type { Enveloppe, Lot } from "./enveloppe.js";

/* =========================================================================
   Recevoir un lot — ce que la console fait de ce que le serveur lui envoie.

   Le contrat entre nous : **il livre au moins une fois, la console enregistre
   exactement une fois.** Sa table de sortie n'efface qu'après acquittement,
   donc aucune perte n'est possible — mais un acquittement qui se perd produit
   un renvoi, donc des doublons sont certains. C'est le bon côté du compromis :
   un doublon se reconnaît à son identifiant, une perte ne se reconnaît à rien.

   Trois règles tenues ici :

   1. **Tout ou rien par lot.** Si un acte du lot est refusé, aucun n'entre.
      Une chaîne à moitié écrite serait pire qu'un lot renvoyé.
   2. **Un acte déjà vu est ignoré en silence, et acquitté quand même.** Ne pas
      l'acquitter laisserait la table de sortie se remplir indéfiniment.
   3. **La signature est conservée même quand on ne peut pas la vérifier**, et
      l'écran le dit. Afficher « vérifié » sans l'avoir fait serait exactement
      la faute que cette chaîne existe pour éviter.
   ========================================================================= */

export interface Acquittement {
  lot: string;
  /** Les identifiants que la console a enregistrés ou reconnaît déjà. Le
      serveur peut effacer ces lignes de sa table de sortie. */
  acquittes: string[];
  retenus: number;
  deja_vus: number;
  /** Les trous détectés dans la numérotation de cette source, s'il y en a. */
  trous: Array<{ de: number; a: number }>;
  signature_verifiee: boolean;
  motif?: string;
}

/** Vraie quand la clé publique de la source est installée. Elle ne l'est pas
    encore : on conserve la signature sans la vérifier, et on l'écrit. */
function verifierSignature(_lot: Lot): { ok: boolean; motif?: string } {
  return {
    ok: false,
    motif:
      "La clé publique de cette source n'est pas installée dans la console. "
      + "La signature est conservée telle quelle et pourra être vérifiée plus tard : "
      + "tant qu'elle ne l'est pas, la chaîne n'est inaltérable que du point de vue de la console.",
  };
}

export async function recevoir(base: Requetable, lot: Lot): Promise<Acquittement> {
  const sig = verifierSignature(lot);

  return base.transaction(async (t) => {
    const lotId = randomUUID();

    /* Les actes déjà connus. On les reconnaît par leur identifiant frappé à la
       source, jamais par leur contenu : deux actes peuvent être identiques et
       avoir légitimement eu lieu deux fois. */
    const ids = lot.events.map((e) => e.id);
    const connus = new Set(
      (await t.query<{ id: string }>(
        `SELECT id FROM actes WHERE id = ANY($1::text[])`, [ids],
      )).map((r) => r.id),
    );
    const nouveaux = lot.events.filter((e) => !connus.has(e.id));

    await t.query(
      `INSERT INTO lots (id, source, signe_le, cle_signature, signature, verifiee, motif_non_verifiee, actes_annonces, actes_retenus)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [lotId, lot.source, lot.signed_at, lot.key_id, lot.signature, sig.ok, sig.motif ?? null,
       lot.events.length, nouveaux.length],
    );

    /* Le dernier maillon. La chaîne est écrite dans l'ordre de réception et ne
       peut pas faire autrement : un acte en retard arrive au bout, même si sa
       date est antérieure. Vouloir l'insérer à sa place casserait tout, et la
       chaîne n'a jamais prétendu attester l'ordre des faits. */
    const dernier = await t.une<{ empreinte: string }>(
      `SELECT empreinte FROM actes ORDER BY rang DESC LIMIT 1`,
    );
    let precedente = dernier?.empreinte ?? ORIGINE;

    /* On scelle dans l'ordre où la source les a numérotés : à l'intérieur d'un
       lot, c'est le seul ordre qui ait un sens. */
    const aEcrire = [...nouveaux].sort((a, b) => a.sequence - b.sequence);

    for (const e of aEcrire) {
      const empreinte = sceller(precedente, e satisfies Enveloppe);
      await t.query(
        `INSERT INTO actes (id, lot_id, empreinte, empreinte_precedente, enveloppe,
                            source, sequence, survenu_le, genre, gravite, categorie,
                            auteur_id, auteur_nom, vise_id, organisation)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [e.id, lotId, empreinte, precedente, JSON.stringify(e),
         e.source, e.sequence, e.occurred_at, e.kind, e.severity, e.category,
         e.actor_id, e.actor_name, e.target_id, e.org_name],
      );
      precedente = empreinte;
    }

    /* Où en est cette source, et ce qui lui manque. */
    const sequences = (await t.query<{ sequence: string }>(
      `SELECT sequence FROM actes WHERE source = $1 ORDER BY sequence`, [lot.source],
    )).map((r) => Number(r.sequence));

    if (sequences.length) {
      await t.query(
        `INSERT INTO sources (source, derniere_vue, premiere_vue, actes, dernier_lot_le)
         VALUES ($1,$2,$3,$4, now())
         ON CONFLICT (source) DO UPDATE
           SET derniere_vue = EXCLUDED.derniere_vue,
               premiere_vue = LEAST(sources.premiere_vue, EXCLUDED.premiere_vue),
               actes = EXCLUDED.actes,
               dernier_lot_le = now()`,
        [lot.source, Math.max(...sequences), Math.min(...sequences), sequences.length],
      );
    }

    return {
      lot: lotId,
      /* On acquitte TOUT ce que le lot portait, y compris les doublons : sans
         cela, la table de sortie du serveur ne se viderait jamais de ce qu'il
         nous a déjà livré. */
      acquittes: ids,
      retenus: nouveaux.length,
      deja_vus: connus.size,
      trous: trous(sequences),
      signature_verifiee: sig.ok,
      motif: sig.motif,
    };
  });
}
