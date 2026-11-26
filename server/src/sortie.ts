import { uid, type Db, type Queryable } from "./db.js";
import { severityOf, type Severity } from "./journal-severite.js";

/*
 * La table de sortie — ce que l'application doit au centre de commande.
 *
 * Décision du 26 novembre 2026 (docs/PLAN-PROJET.md § 11) : c'est le journal du centre qui fait foi.
 * Le nôtre redevient une mémoire de travail. Tout ce qui s'y écrit doit donc parvenir là-bas, et
 * l'application ne peut ni ralentir ni refuser une écriture quand la liaison est coupée — six pools,
 * deux fuseaux, des antennes mal reliées.
 *
 * Quatre propriétés, et rien de plus :
 *
 *   1. **Aucune perte.** La ligne naît dans la transaction de l'entrée de journal : les deux, ou
 *      aucune. C'est une garantie sur le journal, pas sur l'acte métier — voir l'avertissement au
 *      bas de ce fichier, qui nomme le trou qui reste.
 *   2. **Aucun trou.** Les numéros se suivent par source, et une transaction annulée rend le sien.
 *   3. **L'acte porte sa date, l'attestation en porte une autre.** Entre les deux, un acte a eu lieu
 *      sans être attesté ; cet état se lit, et aucun écran n'a le droit de dire « fait » à sa place.
 *   4. **Le critique part devant.** Une liaison lente retarde un commentaire de tâche, pas une
 *      suppression ni une décision de la direction générale.
 *
 * Ce que ce module ne fait pas : composer l'enveloppe envoyée au centre. Son format est arrêté avec
 * eux (`templates/tableau-de-bord/docs/08-format-des-evenements.md`) et l'expéditeur la montera à
 * partir d'ici. La table ne dépend pas du format ; c'est pourquoi elle peut exister d'abord.
 */

export type EtatSortie = "en_attente" | "atteste";

export interface LigneDeSortie {
  id: string;
  source: string;
  sequence: string | number;
  occurred_at: string;
  origin: "activity" | "security";
  origin_id: string;
  kind: string;
  severity: Severity;
  payload: Record<string, unknown>;
  state: EtatSortie;
  attempts: number;
  attested_at: string | null;
  last_error: string | null;
}

/** Ce qu'on dépose : une entrée de journal, sa date, et ce que l'application savait à ce moment-là. */
export interface ADeposer {
  origin: "activity" | "security";
  originId: string;
  kind: string;
  occurredAt: string | Date;
  payload?: Record<string, unknown>;
}

/**
 * Le nom de cette instance. Il entre dans chaque acte scellé et ne peut plus en sortir : deux pools
 * qui porteraient le même nom mêleraient leurs séries, et un trou deviendrait indétectable.
 */
export const sourceDeCetteInstance = () => process.env.ANAT_POOL?.trim() || "local";

export class TableDeSortie {
  readonly source = sourceDeCetteInstance();
  constructor(private db: Db) {}

  /**
   * Dépose une ligne pour une entrée de journal. **À appeler dans la transaction qui écrit cette
   * entrée** en passant son `q` : c'est la seule façon de tenir « les deux, ou aucune ».
   *
   * Le numéro est pris sur la ligne du compteur, dans la même transaction : une annulation le rend.
   */
  async deposer(q: Queryable, e: ADeposer): Promise<string> {
    const [{ next }] = await q.query<{ next: string }>(
      `INSERT INTO outbox_sequence (source, next) VALUES ($1, 2)
         ON CONFLICT (source) DO UPDATE SET next = outbox_sequence.next + 1
         RETURNING outbox_sequence.next - 1 AS next`,
      [this.source],
    );
    const id = uid("act");
    await q.query(
      `INSERT INTO outbox (id, source, sequence, occurred_at, origin, origin_id, kind, severity, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        this.source,
        next,
        e.occurredAt instanceof Date ? e.occurredAt.toISOString() : e.occurredAt,
        e.origin,
        e.originId,
        e.kind,
        severityOf(e.kind),
        JSON.stringify(e.payload ?? {}),
      ],
    );
    return id;
  }

  /**
   * Ce qui attend, le plus grave d'abord, puis dans l'ordre des faits.
   *
   * L'expéditeur n'a aucune raison de respecter l'ordre chronologique entre deux gravités : le
   * centre scelle dans l'ordre d'arrivée et ne peut pas faire autrement, et c'est `occurred_at` et
   * `sequence` qui portent l'ordre des faits. Un acte en retard arrive au bout de la chaîne ; il ne
   * se range pas à sa place, et vouloir l'y insérer casserait le scellement.
   */
  async aExpedier(limit = 200): Promise<LigneDeSortie[]> {
    // Le classement est fait par la base, avant la borne, et c'est tout l'enjeu : trier en mémoire
    // la fenêtre déjà tirée ne ferait passer le critique devant que parmi les actes du même lot. Un
    // acte critique derrière un arriéré de deux cents commentaires n'aurait jamais doublé la file —
    // c'est-à-dire précisément dans le seul cas où la priorité sert à quelque chose.
    return this.db.query<LigneDeSortie>(
      `SELECT * FROM outbox WHERE state = 'en_attente' AND source = $1
        ORDER BY CASE severity WHEN 'critique' THEN 0 WHEN 'importante' THEN 1 ELSE 2 END, sequence
        LIMIT $2`,
      [this.source, Math.max(1, Math.min(5000, limit))],
    );
  }

  /** Le centre a acquitté. La ligne reste, marquée : il faut pouvoir répondre « attesté, et quand ». */
  async attester(ids: string[], at?: string): Promise<number> {
    if (!ids.length) return 0;
    const faites = await this.db.query<{ id: string }>(
      `UPDATE outbox SET state = 'atteste', attested_at = COALESCE($2::timestamptz, now()), last_error = NULL
        WHERE id = ANY($1) AND state = 'en_attente' RETURNING id`,
      [ids, at ?? null],
    );
    return faites.length;
  }

  /**
   * L'envoi a échoué. La ligne **reste en attente** et compte l'essai : c'est tout l'intérêt du
   * mécanisme. Renvoyer produira des doublons chez le centre, qui les reconnaît à l'identifiant ;
   * ne pas renvoyer produirait une perte, qu'on ne reconnaît à rien.
   */
  async echec(ids: string[], raison: string): Promise<void> {
    if (!ids.length) return;
    await this.db.query(
      `UPDATE outbox SET attempts = attempts + 1, last_error = $2 WHERE id = ANY($1) AND state = 'en_attente'`,
      [ids, raison.slice(0, 500)],
    );
  }

  /** Attesté ou pas, pour une entrée de journal. Ce que l'écran doit savoir avant d'afficher « fait ». */
  async etat(originId: string) {
    return (
      (await this.db.one<{
        state: EtatSortie;
        sequence: string | number;
        occurred_at: string;
        attested_at: string | null;
        attempts: number;
      }>("SELECT state, sequence, occurred_at, attested_at, attempts FROM outbox WHERE origin_id = $1", [originId])) ??
      null
    );
  }

  /** Le retard, chiffré : combien attendent, et depuis quand. À afficher en permanence, comme `truncated`. */
  async retard() {
    const r = await this.db.one<{ pending: string; oldest: string | null; critiques: string }>(
      `SELECT COUNT(*) AS pending, MIN(occurred_at) AS oldest,
              COUNT(*) FILTER (WHERE severity = 'critique') AS critiques
         FROM outbox WHERE state = 'en_attente' AND source = $1`,
      [this.source],
    );
    return { pending: Number(r?.pending ?? 0), oldest: r?.oldest ?? null, critiques: Number(r?.critiques ?? 0) };
  }
}

/*
 * Ce que cette table ne garantit pas, et qu'il ne faut pas laisser croire.
 *
 * « Dans la même transaction que l'acte » est ce que dit le plan ; ce qui est tenu ici est plus
 * étroit : **la même transaction que l'entrée de journal.** Aujourd'hui `Services.log` est appelé
 * après l'écriture métier, hors transaction, dans une centaine d'endroits. Si le serveur meurt entre
 * les deux, l'acte existe sans entrée de journal — et c'était déjà vrai avant cette table, qui n'y
 * change rien.
 *
 * Ce trou-là se referme en passant aux appelants la transaction de leur acte : `log` accepte un `q`
 * pour cela. Tant que les appelants ne le passent pas, la bonne formulation est « aucune entrée de
 * journal ne se perd en route vers le centre », pas « aucun acte n'échappe au journal ».
 *
 * Une affirmation littéralement vraie qui laisse croire davantage est un mensonge.
 */
