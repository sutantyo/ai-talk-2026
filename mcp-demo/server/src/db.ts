import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));

/** Copied beside the compiled output by `build:server`, like the phrasebook does. */
export const SCHEMA_SQL = readFileSync(resolve(here, 'schema.sql'), 'utf8');

export interface QueryResult<R> {
  rows: R[];
  rowCount: number | null;
}

/** The slice of `pg.PoolClient` the stores use. */
export interface DbClient {
  query<R = any>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
  release(error?: Error): void;
}

/**
 * The slice of `pg.Pool` the stores use. On Railway this is a real `pg.Pool`;
 * locally, with no `DATABASE_URL`, it is PGlite (Postgres compiled to run
 * inside Node) behind the same shape, so nothing above this file knows which.
 */
export interface Db {
  query<R = any>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
  connect(): Promise<DbClient>;
  end(): Promise<void>;
}

export function createPgPool(databaseUrl: string): Db {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    // Railway's Postgres certificate does not chain to Node's trust store; this
    // is the connection Railway documents, inside its private network.
    ssl: databaseUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
    max: 5
  });
  return pool as unknown as Db;
}

/**
 * PGlite is a single connection, so a transaction (`connect()` … `release()`)
 * holds a lock that every other query waits behind. Without it, a query from
 * another request could land inside someone else's `begin` … `commit`.
 */
export async function createPgliteDb(dataDir: string | null): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  if (dataDir !== null) mkdirSync(dataDir, { recursive: true });
  const db = dataDir === null ? new PGlite() : new PGlite(dataDir);
  await db.waitReady;

  let tail: Promise<void> = Promise.resolve();
  const lock = async (): Promise<() => void> => {
    let unlock!: () => void;
    const next = new Promise<void>((r) => (unlock = r));
    const previous = tail;
    tail = previous.then(() => next);
    await previous;
    return unlock;
  };

  const run = async <R>(text: string, params?: unknown[]): Promise<QueryResult<R>> => {
    // `exec` handles several statements (the schema file); `query` takes parameters.
    if (params === undefined || params.length === 0) {
      const results = await db.exec(text);
      const last = results[results.length - 1];
      return { rows: (last?.rows ?? []) as R[], rowCount: last?.affectedRows ?? last?.rows.length ?? 0 };
    }
    const result = await db.query<R>(text, params as any[]);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  };

  return {
    async query(text, params) {
      const unlock = await lock();
      try {
        return await run(text, params);
      } finally {
        unlock();
      }
    },
    async connect() {
      const unlock = await lock();
      let released = false;
      return {
        query: (text, params) => run(text, params),
        release() {
          if (!released) {
            released = true;
            unlock();
          }
        }
      };
    },
    async end() {
      await db.close();
    }
  };
}

/** Idempotent: every statement in the schema is `if not exists`. Runs on every boot. */
export async function migrate(db: Db): Promise<void> {
  await db.query(SCHEMA_SQL);
}
