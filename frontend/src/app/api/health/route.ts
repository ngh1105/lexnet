import { NextResponse } from "next/server";
import { getDb } from "@/lib/platform/db";

export async function GET() {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  const dbStart = Date.now();
  try {
    const db = getDb();
    db.run("SELECT 1");
    checks.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }

  const envOk = !!(process.env.NEXT_PUBLIC_LEXNET_DATA_MODE);
  checks.env = { ok: envOk };

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;

  return NextResponse.json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    mode: process.env.NEXT_PUBLIC_LEXNET_DATA_MODE || "unset",
    contractAddress: process.env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS || "unset",
    checks,
  }, { status });
}
