import type { Requetable } from "./base.js";
import { verifier, type Maillon, type Verdict } from "./chaine.js";
import { trous } from "./chaine.js";

/* =========================================================================
   Lire le journal scellé, et dire ce qu'on ne sait pas.
   ========================================================================= */

export interface Page {
  actes: Array<Record<string, unknown>>;
  /** Vrai : il y en avait davantage. Les écrans doivent le dire, et ne jamais
      calculer de total sur une liste tronquée. */
  tronquee: boolean;
  /** Ce que vaut ce total : il ne porte que sur la fenêtre affichée. */
  total_affiche: number;
}

export async function journal(
  base: Requetable,
  o: { limite?: number; gravite?: string; genre?: string; source?: string } = {},
): Promise<Page> {
  const limite = Math.min(Math.max(o.limite ?? 300, 1), 5000);
  const ou: string[] = [];
  const p: unknown[] = [];
  if (o.gravite) { p.push(o.gravite); ou.push(`gravite = $${p.length}`); }
  /* On filtre sur le genre, jamais sur l'intitulé : l'intitulé est ce que
     l'application disait à ce moment-là, et il peut changer d'une entrée à
     l'autre pour le même genre. Ce n'est pas une clé. */
  if (o.genre) { p.push(o.genre); ou.push(`genre = $${p.length}`); }
  if (o.source) { p.push(o.source); ou.push(`source = $${p.length}`); }
  const filtre = ou.length ? `WHERE ${ou.join(" AND ")}` : "";

  p.push(limite + 1);
  const lignes = await base.query(
    `SELECT rang, id, empreinte, source, sequence, survenu_le, genre, gravite, categorie,
            auteur_id, auteur_nom, vise_id, organisation, recu_le, enveloppe
       FROM actes ${filtre}
      ORDER BY rang DESC LIMIT $${p.length}`,
    p,
  );

  const tronquee = lignes.length > limite;
  return { actes: tronquee ? lignes.slice(0, limite) : lignes, tronquee, total_affiche: Math.min(lignes.length, limite) };
}

/* --- Vérifier la chaîne, et garder la trace de l'avoir fait --------------
   Vérifier est un acte. Sans trace, « la chaîne était intacte » n'est qu'une
   affirmation de plus, et c'est précisément ce que cette chaîne existe pour
   remplacer. */
export async function verifierChaine(base: Requetable): Promise<Verdict & { duree_ms: number }> {
  const debut = Date.now();
  const lignes = await base.query<{ rang: string; empreinte: string; empreinte_precedente: string; enveloppe: unknown }>(
    `SELECT rang, empreinte, empreinte_precedente, enveloppe FROM actes ORDER BY rang`,
  );
  const maillons: Maillon[] = lignes.map((l) => ({
    rang: Number(l.rang),
    empreinte: l.empreinte,
    empreinte_precedente: l.empreinte_precedente,
    /* PGlite rend le JSONB déjà analysé, PostgreSQL aussi via pg — mais on se
       protège du cas où il arriverait en texte. */
    acte: typeof l.enveloppe === "string" ? JSON.parse(l.enveloppe) : l.enveloppe,
  }));

  const verdict = verifier(maillons);
  const duree = Date.now() - debut;

  await base.query(
    `INSERT INTO verifications (maillons, intacte, rang_en_defaut, raison, derniere_empreinte, duree_ms)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [verdict.maillons, verdict.intact,
     verdict.intact ? null : verdict.rangEnDefaut,
     verdict.intact ? null : verdict.raison,
     verdict.intact ? verdict.derniere : null,
     duree],
  );

  return { ...verdict, duree_ms: duree };
}

/* --- Le retard de scellement ---------------------------------------------
   Entre l'acte et son attestation il y a un délai — celui de la table de
   sortie et de la liaison. Dans une administration où l'écrit fait foi, cette
   fenêtre n'est pas un détail technique : pendant quelques minutes ou quelques
   jours, un acte a eu lieu sans être attesté.

   L'écran l'affiche en permanence, comme il affiche `tronquee`. Un centre de
   commande qui tairait son propre retard serait le premier à mentir. */
export async function etatDesSources(base: Requetable) {
  const sources = await base.query<{
    source: string; derniere_vue: string; premiere_vue: string; actes: string; dernier_lot_le: string;
  }>(`SELECT * FROM sources ORDER BY source`);

  const detail = [];
  for (const s of sources) {
    const seqs = (await base.query<{ sequence: string }>(
      `SELECT sequence FROM actes WHERE source = $1 ORDER BY sequence`, [s.source],
    )).map((r) => Number(r.sequence));
    const manquants = trous(seqs);
    const dernierActe = await base.une<{ survenu_le: string; recu_le: string }>(
      `SELECT survenu_le, recu_le FROM actes WHERE source = $1 ORDER BY rang DESC LIMIT 1`, [s.source],
    );
    detail.push({
      source: s.source,
      actes: Number(s.actes),
      sequence: { premiere: Number(s.premiere_vue), derniere: Number(s.derniere_vue) },
      /* Un trou veut dire qu'un acte s'est perdu en route. C'est le seul signal
         fiable que nous ayons, et le taire annulerait le mécanisme. */
      trous: manquants,
      actes_manquants: manquants.reduce((n, t) => n + (t.a - t.de + 1), 0),
      dernier_lot_le: s.dernier_lot_le,
      /* L'écart entre l'acte et son attestation, en secondes. */
      retard_s: dernierActe
        ? Math.round((+new Date(dernierActe.recu_le) - +new Date(dernierActe.survenu_le)) / 1000)
        : null,
    });
  }
  return detail;
}
