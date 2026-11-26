import { z } from "zod";

/* =========================================================================
   L'enveloppe d'un acte — arrêtée avec l'agent serveur le 26 novembre 2026,
   et décrite au champ près dans `docs/08-format-des-evenements.md`.

   **Elle ne se migre pas.** Une chaîne scellée n'admet pas qu'on ajoute un
   champ aux entrées passées : il faudrait les réécrire, et une chaîne qu'on
   réécrit n'est plus une chaîne. Les champs des lots à venir — `country`,
   `vault`, `on_behalf_of` — existent donc dès la première entrée, vides mais
   présents. Un champ vide pendant six mois ne coûte rien ; un champ absent
   coûte six mois d'histoire d'une autre forme, et *absent* et *vide* ne
   veulent pas dire la même chose quand on relit.
   ========================================================================= */

export const Gravite = z.enum(["critique", "importante", "normale"]);
export type Gravite = z.infer<typeof Gravite>;

export const Enveloppe = z.object({
  /** Version de l'enveloppe. La chaîne peut en porter plusieurs et le dire. */
  v: z.literal(1),

  /* --- identité de l'acte, frappée à la source --- */
  id: z.string().min(1).max(128),
  source: z.string().min(1).max(64),
  sequence: z.number().int().nonnegative(),

  /* --- les faits --- */
  occurred_at: z.string().datetime({ offset: true }),
  kind: z.string().min(1).max(128),
  /** L'intitulé français écrit par l'application. Jamais reconstruit ici, et
      jamais utilisé comme clé : on regroupe et on filtre sur `kind`. */
  label: z.string().max(512),
  category: z.string().max(128),
  severity: Gravite,

  /* --- qui --- */
  actor_id: z.string().max(128).nullable(),
  actor_name: z.string().max(256).nullable(),
  /** Le compte visé quand ce n'est pas l'auteur. Sans lui, « Profil modifié »
      est une entrée scellée pour toujours qui ne dit pas sur qui. */
  target_id: z.string().max(128).nullable(),
  /** Emprunt de session : les deux identités, sans exception. Vide jusqu'au
      lot qui l'ouvrira — mais présent, sinon les entrées d'avant ne pourraient
      pas dire « personne n'empruntait ». */
  on_behalf_of: z.object({ id: z.string(), name: z.string() }).nullable(),

  /* --- quoi --- */
  org_id: z.string().max(128).nullable(),
  org_name: z.string().max(256).nullable(),
  object_type: z.string().max(128).nullable(),
  object_id: z.string().max(128).nullable(),
  summary: z.string().max(4096),
  /** Cette entrée en corrige une autre. Cette administration amende son écrit
      comme geste ordinaire ; une chaîne scellée ne permet pas d'amender, elle
      permet d'ajouter une entrée qui déclare corriger. Le motif compte autant
      que le lien : « erreur de saisie » et « décision revue en séance » ne se
      relisent pas de la même façon. */
  corrects: z.object({ id: z.string(), reason: z.string().max(512) }).nullable(),

  /* --- d'où --- */
  ip: z.string().max(64).nullable(),
  /** Le pays seulement, jamais la ville : l'Agence travaille hors connexion,
      la base est embarquée, et une ville fausse sur un écran de sécurité est
      pire qu'une case vide. */
  country: z.string().max(8).nullable(),
  user_agent: z.string().max(512).nullable(),

  /* --- le coffre, quand l'acte fait disparaître quelque chose --- */
  vault: z.object({
    ref: z.string(),
    bytes: z.number().int().nonnegative(),
    rows: z.number().int().nonnegative(),
    /** Vrai quand le sous-arbre dépassait la borne. La règle est de refuser
        la suppression dans ce cas : si ce drapeau est vrai, quelque chose a
        été capturé à moitié et il faut le savoir. */
    truncated: z.boolean(),
  }).nullable(),

  data: z.record(z.string(), z.unknown()).default({}),
});
export type Enveloppe = z.infer<typeof Enveloppe>;

/* --- Le lot expédié ------------------------------------------------------
   La signature est la condition de tout : sans elle, la chaîne n'est
   inaltérable que du point de vue de celui qui la tient — c'est-à-dire de la
   console. Avec elle, n'importe qui peut reprendre la chaîne et vérifier
   qu'aucune entrée n'a bougé, sans avoir à faire confiance à l'un des deux.

   `key_id` permet de faire tourner la clé sans que les lots anciens cessent
   d'être vérifiables, et il doit exister dès la première signature pour la
   même raison que les champs vides de l'enveloppe. */
export const Lot = z.object({
  source: z.string().min(1).max(64),
  events: z.array(Enveloppe).min(1).max(5000),
  signed_at: z.string().datetime({ offset: true }),
  key_id: z.string().min(1).max(64),
  signature: z.string().min(1).max(4096),
});
export type Lot = z.infer<typeof Lot>;

/* --- Ce qui est scellé ---------------------------------------------------
   On scelle l'enveloppe telle qu'elle est arrivée, et rien de ce que la
   console y ajoute : ni le rang, ni l'heure de réception, ni l'identifiant du
   lot. Sinon la vérification dépendrait de l'état de notre base plutôt que du
   contenu de l'acte, et elle ne prouverait plus rien à quelqu'un d'extérieur. */
export const acteScelle = (e: Enveloppe): Enveloppe => e;
