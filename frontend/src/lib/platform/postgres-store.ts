import { Pool, type PoolConfig } from "pg";

import type { PlatformStore } from "./types";
import {
  createDefaultPlatformStore,
  isPlatformStore,
  type PlatformStoreRepository,
} from "./store";

const DEFAULT_TABLE = "platform_store";
const SINGLETON_ID = 1;

interface PostgresStoreConfig {
  databaseUrl: string;
  table?: string;
  pool?: Pool;
}

let sharedPool: Pool | undefined;

function getOrCreatePool(databaseUrl: string): Pool {
  if (sharedPool) {
    return sharedPool;
  }
  const config: PoolConfig = {
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 10_000,
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  };
  sharedPool = new Pool(config);
  return sharedPool;
}

function shouldUseSsl(url: string): boolean {
  if (url.includes("sslmode=disable")) return false;
  if (/localhost|127\.0\.0\.1/i.test(url)) return false;
  return true;
}

export async function ensurePlatformStoreSchema(
  databaseUrl: string,
  table = DEFAULT_TABLE,
): Promise<void> {
  const pool = getOrCreatePool(databaseUrl);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${table} (
       id INTEGER PRIMARY KEY,
       data JSONB NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
}

export function createPostgresPlatformStoreRepository(
  config: PostgresStoreConfig,
): PlatformStoreRepository {
  const pool = config.pool ?? getOrCreatePool(config.databaseUrl);
  const table = config.table ?? DEFAULT_TABLE;

  async function read(): Promise<PlatformStore> {
    const result = await pool.query<{ data: PlatformStore }>(
      `SELECT data FROM ${table} WHERE id = $1`,
      [SINGLETON_ID],
    );

    if (result.rowCount === 0) {
      const fresh = createDefaultPlatformStore();
      await pool.query(
        `INSERT INTO ${table} (id, data) VALUES ($1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [SINGLETON_ID, fresh],
      );
      return fresh;
    }

    const parsed = result.rows[0].data;
    if (!isPlatformStore(parsed)) {
      throw new Error("Invalid platform store schema in postgres row");
    }
    return parsed;
  }

  async function write(store: PlatformStore): Promise<void> {
    await pool.query(
      `INSERT INTO ${table} (id, data, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [SINGLETON_ID, store],
    );
  }

  async function mutate(
    fn: (store: PlatformStore) => void | Promise<void>,
  ): Promise<PlatformStore> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<{ data: PlatformStore }>(
        `SELECT data FROM ${table} WHERE id = $1 FOR UPDATE`,
        [SINGLETON_ID],
      );

      let store: PlatformStore;
      if (selected.rowCount === 0) {
        store = createDefaultPlatformStore();
        await client.query(
          `INSERT INTO ${table} (id, data) VALUES ($1, $2)`,
          [SINGLETON_ID, store],
        );
      } else {
        store = selected.rows[0].data;
        if (!isPlatformStore(store)) {
          await client.query("ROLLBACK");
          throw new Error("Invalid platform store schema in postgres row");
        }
      }

      await fn(store);

      await client.query(
        `UPDATE ${table} SET data = $1, updated_at = now() WHERE id = $2`,
        [store, SINGLETON_ID],
      );
      await client.query("COMMIT");
      return store;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback errors
      }
      throw error;
    } finally {
      client.release();
    }
  }

  return { read, write, mutate };
}
