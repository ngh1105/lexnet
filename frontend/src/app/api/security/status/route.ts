import { NextResponse } from "next/server";
import { readStore } from "@/lib/platform/store";
import { requireAuth, AuthError } from "@/lib/platform/auth";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const store = await readStore();
  const required = ["NEXT_PUBLIC_LEXNET_DATA_MODE"];
  const env = required.map((name) => ({ name, configured: Boolean(process.env[name]) }));

  return NextResponse.json({
    mode: process.env.NEXT_PUBLIC_LEXNET_DATA_MODE || "local",
    testnetPaymentsEnabled: process.env.LEXNET_ENABLE_TESTNET_PAYMENTS === "true",
    env,
    incidents: store.security.incidents,
    lastBackupAt: store.security.lastBackupAt,
  });
}
