import { NextResponse } from "next/server";
import { now, readStore, writeStore } from "@/lib/platform/store";
import { ensurePlatformDefaults } from "@/lib/platform/ops";

export async function GET() {
  const store = await readStore();
  ensurePlatformDefaults(store);
  const required = ["NEXT_PUBLIC_LEXNET_DATA_MODE"];
  const env = required.map((name) => ({ name, configured: Boolean(process.env[name]) }));
  store.security.envValidatedAt = now();
  await writeStore(store);
  return NextResponse.json({
    mode: process.env.NEXT_PUBLIC_LEXNET_DATA_MODE || "local",
    testnetPaymentsEnabled: process.env.LEXNET_ENABLE_TESTNET_PAYMENTS === "true",
    env,
    incidents: store.security.incidents,
    lastBackupAt: store.security.lastBackupAt,
  });
}
