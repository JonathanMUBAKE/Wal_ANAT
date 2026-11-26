-- =========================================================================
-- Le journal scellé du centre de commande.
--
-- C'est la mémoire de l'institution. Celui de l'application est sa mémoire de
-- travail : il peut être réécrit par qui atteint sa base, et sa moitié
-- sécurité s'efface d'elle-même au bout d'un an. Ici, rien ne s'efface et
-- rien ne se réécrit sans que la chaîne le dise.
--
-- Conséquence directe : la sauvegarde, la rétention et la disponibilité de
-- cette base ne sont plus des réglages d'exploitation. Ce sont des décisions
-- d'institution.
-- =========================================================================

-- Les lots reçus, gardés pour eux-mêmes : c'est la signature du serveur qui
-- rend la chaîne vérifiable par un tiers, et elle vit ici.
CREATE TABLE IF NOT EXISTS lots (
  id            TEXT PRIMARY KEY,
  source        TEXT NOT NULL,
  signe_le      TIMESTAMPTZ NOT NULL,
  cle_signature TEXT NOT NULL,
  signature     TEXT NOT NULL,
  -- Ce que la console a pu faire de cette signature. Tant que la clé publique
  -- du serveur n'est pas installée, on conserve sans vérifier — et on le dit,
  -- plutôt que d'afficher une garantie qu'on ne tient pas.
  verifiee      BOOLEAN NOT NULL DEFAULT FALSE,
  motif_non_verifiee TEXT,
  actes_annonces INTEGER NOT NULL,
  actes_retenus  INTEGER NOT NULL,
  recu_le       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lots_source ON lots(source, recu_le DESC);

-- La chaîne. `rang` est l'ordre de réception, et la chaîne ne peut pas
-- attester autre chose : les actes viennent de six pools sur deux fuseaux, et
-- `occurred_at` de deux sources différentes n'est pas comparable. L'ordre des
-- faits se reconstitue par `occurred_at` et `sequence`, jamais par `rang`.
CREATE TABLE IF NOT EXISTS actes (
  rang                 BIGSERIAL PRIMARY KEY,
  -- Frappé à la source. C'est lui qui dédoublonne : le serveur livre au moins
  -- une fois, la console enregistre exactement une fois.
  id                   TEXT NOT NULL UNIQUE,
  lot_id               TEXT NOT NULL REFERENCES lots(id),
  empreinte            TEXT NOT NULL,
  empreinte_precedente TEXT NOT NULL,
  -- L'enveloppe telle qu'elle est arrivée. C'est elle qui est scellée, et
  -- rien de ce que la console ajoute : sinon la vérification dépendrait de
  -- l'état de notre base au lieu du contenu de l'acte.
  enveloppe            JSONB NOT NULL,
  -- Colonnes extraites pour les écrans. Elles ne participent pas au scellement
  -- et peuvent donc évoluer librement.
  source               TEXT NOT NULL,
  sequence             BIGINT NOT NULL,
  survenu_le           TIMESTAMPTZ NOT NULL,
  genre                TEXT NOT NULL,
  gravite              TEXT NOT NULL CHECK (gravite IN ('critique','importante','normale')),
  categorie            TEXT NOT NULL,
  auteur_id            TEXT,
  auteur_nom           TEXT,
  vise_id              TEXT,
  organisation         TEXT,
  recu_le              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, sequence)
);
CREATE INDEX IF NOT EXISTS idx_actes_date    ON actes(survenu_le DESC);
CREATE INDEX IF NOT EXISTS idx_actes_genre   ON actes(genre);
CREATE INDEX IF NOT EXISTS idx_actes_gravite ON actes(gravite, survenu_le DESC);
CREATE INDEX IF NOT EXISTS idx_actes_auteur  ON actes(auteur_id);
CREATE INDEX IF NOT EXISTS idx_actes_vise    ON actes(vise_id);

-- Où en est chaque source : jusqu'où sa numérotation est allée, et ce qui
-- manque. Un trou veut dire qu'un acte s'est perdu en route — c'est le seul
-- signal fiable que nous ayons, et il s'affiche.
CREATE TABLE IF NOT EXISTS sources (
  source        TEXT PRIMARY KEY,
  derniere_vue  BIGINT NOT NULL,
  premiere_vue  BIGINT NOT NULL,
  actes         BIGINT NOT NULL DEFAULT 0,
  dernier_lot_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Le registre des vérifications de la chaîne. Vérifier est un acte, et il se
-- garde : sans trace, « la chaîne était intacte » n'est qu'une affirmation.
CREATE TABLE IF NOT EXISTS verifications (
  id          BIGSERIAL PRIMARY KEY,
  faite_le    TIMESTAMPTZ NOT NULL DEFAULT now(),
  maillons    BIGINT NOT NULL,
  intacte     BOOLEAN NOT NULL,
  rang_en_defaut BIGINT,
  raison      TEXT,
  derniere_empreinte TEXT,
  duree_ms    INTEGER NOT NULL
);
