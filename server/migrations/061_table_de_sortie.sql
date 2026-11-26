-- La table de sortie vers le centre de commande (docs/PLAN-PROJET.md § 11).
--
-- Décision du 26 novembre 2026 : c'est le journal du centre qui fait foi. Le nôtre redevient une
-- mémoire de travail, et tout ce qui s'y écrit doit lui parvenir — six pools, deux fuseaux, des
-- antennes mal reliées. L'entrée de journal et sa ligne de sortie s'écrivent dans la même
-- transaction : les deux, ou aucune. Un expéditeur vide la table quand il peut, le centre acquitte.
-- La ligne ne disparaît pas à l'acquittement : elle est marquée, parce qu'il faut pouvoir répondre
-- « attesté, et quand » pour un acte ancien. Sa purge attend la décision de rétention, qui est une
-- décision d'institution avant d'être un réglage.
CREATE TABLE outbox (
  -- L'identifiant frappé ici : c'est lui qui dédoublonne chez le centre. Livrer au moins une fois,
  -- c'est accepter les doublons ; sans identifiant stable, il n'y a aucun moyen de les reconnaître.
  id TEXT PRIMARY KEY,
  -- Quelle instance a produit l'acte. Les numéros ne se suivent que par source.
  source TEXT NOT NULL,
  sequence BIGINT NOT NULL,
  -- La date de l'acte, jamais celle de l'envoi : l'attestation porte la sienne, plus tard.
  occurred_at TIMESTAMPTZ NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('activity', 'security')),
  origin_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critique', 'importante', 'normale')),
  -- Ce que l'application savait au moment de l'acte. Rempli dans la transaction, jamais reconstitué
  -- ensuite : un champ dont la valeur dépend du moment où on le regarde n'a rien à faire dans une
  -- chaîne scellée.
  payload JSONB NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'en_attente' CHECK (state IN ('en_attente', 'atteste')),
  attempts INTEGER NOT NULL DEFAULT 0,
  attested_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un trou dans la série est le seul signal fiable d'un acte perdu. Deux lignes au même numéro
  -- rendraient ce signal muet.
  UNIQUE (source, sequence),
  UNIQUE (origin, origin_id)
);
-- Ce que l'expéditeur demande à chaque passage : ce qui attend, le plus grave d'abord.
CREATE INDEX outbox_a_expedier_idx ON outbox (state, severity, sequence);
CREATE INDEX outbox_origine_idx ON outbox (origin_id);

-- Le compteur est une ligne, pas une SEQUENCE PostgreSQL, et c'est délibéré : une séquence ne
-- revient pas en arrière quand la transaction est annulée. Elle laisserait filer un numéro, le
-- centre verrait un trou, et il lèverait une alarme pour un acte qui n'a jamais existé. Avec une
-- ligne, l'annulation rend le numéro. Le prix est que les actes d'une même source s'écrivent l'un
-- après l'autre sur cette ligne — c'est ce que coûte une série sans trou.
CREATE TABLE outbox_sequence (
  source TEXT PRIMARY KEY,
  next BIGINT NOT NULL DEFAULT 1
);
