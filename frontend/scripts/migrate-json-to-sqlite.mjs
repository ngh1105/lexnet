import { readFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/lib/platform/schema.ts";

const STORE_PATH = process.env.LEXNET_STORE_PATH || path.join(process.cwd(), ".lexnet-data", "store.json");
const DB_PATH = process.env.LEXNET_DB_PATH || path.join(process.cwd(), ".lexnet-data", "lexnet.db");

async function main() {
  let raw;
  try {
    raw = await readFile(STORE_PATH, "utf8");
  } catch {
    console.log("No store.json found — nothing to migrate.");
    process.exit(0);
  }

  const store = JSON.parse(raw);

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  const insertCounts = {};

  const tables = [
    { key: "workspaces", table: schema.workspaces },
    { key: "users", table: schema.users },
    { key: "cases", table: schema.cases },
    { key: "evidence", table: schema.evidence },
    { key: "reports", table: schema.reports, transform: (r) => ({
      ...r,
      evidenceIds: JSON.stringify(r.evidenceIds || []),
      evidenceChecksums: JSON.stringify(r.evidenceChecksums || []),
    })},
    { key: "auditEvents", table: schema.auditEvents, transform: (e) => ({
      ...e,
      payload: JSON.stringify(e.payload || {}),
    })},
    { key: "passports", table: schema.passports, transform: (p) => ({
      ...p,
      scoreBreakdown: JSON.stringify(p.scoreBreakdown || {}),
      sourceReportIds: JSON.stringify(p.sourceReportIds || []),
    })},
    { key: "memberships", table: schema.memberships },
    { key: "invitations", table: schema.invitations },
    { key: "assignments", table: schema.assignments },
    { key: "queue", table: schema.queue },
    { key: "demoAccounts", table: schema.demoAccounts, transform: (a) => ({
      id: a.id,
      label: a.label || "",
      address: a.address,
      privateKeyRef: a.privateKeyRef || "",
      createdAt: a.createdAt,
    })},
    { key: "analyticsEvents", table: schema.analyticsEvents },
  ];

  const migrate = sqlite.transaction(() => {
    for (const { key, table, transform } of tables) {
      const rows = Array.isArray(store[key]) ? store[key] : [];
      if (rows.length === 0) continue;

      let count = 0;
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const mapped = transform ? transform(row) : row;
        try {
          db.insert(table).values(mapped).onConflictDoNothing().run();
          count++;
        } catch (err) {
          console.error(`  Error inserting into ${key}: ${err.message}`);
        }
      }
      insertCounts[key] = count;
    }
  });

  migrate();

  sqlite.close();

  console.log("Migration complete:");
  for (const [key, count] of Object.entries(insertCounts)) {
    console.log(`  ${key}: ${count} rows`);
  }
  console.log(`Total collections migrated: ${Object.keys(insertCounts).length}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
