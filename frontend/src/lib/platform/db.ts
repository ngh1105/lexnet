import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "node:path";
import { mkdirSync } from "node:fs";

const DB_PATH = process.env.LEXNET_DB_PATH || path.join(process.cwd(), ".lexnet-data", "lexnet.db");

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  _db = drizzle(sqlite, { schema });
  return _db;
}

export { DB_PATH };
