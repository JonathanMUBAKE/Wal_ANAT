import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* =========================================================================
   La base du service.

   PGlite en local et en démonstration, PostgreSQL en production : le même
   dialecte, le même code. Ce choix n'est pas un confort de développement —
   l'Agence travaille hors connexion, sur des sites mal reliés, et une console
   qui exigerait un serveur de base de données joignable serait inutilisable
   là où on en a le plus besoin.
   ========================================================================= */

export interface Requetable {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  une<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  /** Plusieurs instructions d'un coup, sans paramètres : les migrations, et
      rien d'autre. `query` passe par une requête préparée, qui n'accepte
      qu'une instruction — c'est une protection, et on ne la contourne que là
      où le SQL ne vient d'aucune entrée. */
  executer(sql: string): Promise<void>;
  transaction<T>(f: (t: Requetable) => Promise<T>): Promise<T>;
  fermer(): Promise<void>;
}

const ici = dirname(fileURLToPath(import.meta.url));

export async function ouvrir(url?: string): Promise<Requetable> {
  /* Sans URL, on prend PGlite en mémoire : c'est ce qui tourne dans les tests
     et dans la démonstration, et rien n'y survit à l'arrêt — ce qui est exact
     pour une démonstration et serait une faute en production. */
  if (!url || url.startsWith("memory")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite(url && url !== "memory" ? url : undefined);
    const exec = async <T>(sql: string, params?: unknown[]): Promise<T[]> =>
      (await pg.query<T>(sql, params as never[])).rows;
    const base: Requetable = {
      query: exec,
      une: async <T>(sql: string, params?: unknown[]) => (await exec<T>(sql, params))[0] ?? null,
      executer: async (sql: string) => { await pg.exec(sql); },
      /* PGlite est monoprocessus : une transaction suffit à garantir le tout
         ou rien, et il n'y a pas de concurrence à arbitrer. */
      transaction: async (f) => {
        await pg.exec("BEGIN");
        try {
          const r = await f(base);
          await pg.exec("COMMIT");
          return r;
        } catch (e) {
          await pg.exec("ROLLBACK");
          throw e;
        }
      },
      fermer: () => pg.close(),
    };
    await migrer(base);
    return base;
  }

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url });
  const base: Requetable = {
    query: async <T>(sql: string, params?: unknown[]) => (await pool.query(sql, params as never[])).rows as T[],
    une: async <T>(sql: string, params?: unknown[]) => (await base.query<T>(sql, params))[0] ?? null,
    executer: async (sql: string) => { await pool.query(sql); },
    transaction: async (f) => {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const dans: Requetable = {
          query: async <T>(s: string, p?: unknown[]) => (await c.query(s, p as never[])).rows as T[],
          une: async <T>(s: string, p?: unknown[]) => (await dans.query<T>(s, p))[0] ?? null,
          executer: async (s: string) => { await c.query(s); },
          transaction: (g) => g(dans),
          fermer: async () => {},
        };
        const r = await f(dans);
        await c.query("COMMIT");
        return r;
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
    },
    fermer: () => pool.end(),
  };
  await migrer(base);
  return base;
}

/* --- Migrations ----------------------------------------------------------
   Appliquées dans l'ordre des noms, une fois chacune, et consignées. Elles ne
   se défont pas : une migration qui a touché le journal scellé ne peut pas
   être annulée sans casser la chaîne, et c'est voulu. */
async function migrer(base: Requetable) {
  await base.query(
    "CREATE TABLE IF NOT EXISTS migrations (nom TEXT PRIMARY KEY, appliquee_le TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
  const faites = new Set(
    (await base.query<{ nom: string }>("SELECT nom FROM migrations")).map((r) => r.nom),
  );
  const dossier = resolve(ici, "migrations");
  for (const nom of readdirSync(dossier).filter((f) => f.endsWith(".sql")).sort()) {
    if (faites.has(nom)) continue;
    const sql = readFileSync(join(dossier, nom), "utf8");
    await base.transaction(async (t) => {
      await t.executer(sql);
      await t.query("INSERT INTO migrations (nom) VALUES ($1)", [nom]);
    });
  }
}
