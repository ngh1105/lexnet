import { NextResponse } from "next/server";
import { checksum, readStore } from "@/lib/platform/store";
import { ensurePlatformDefaults } from "@/lib/platform/ops";
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
  ensurePlatformDefaults(store);
  const actionCounts = store.auditEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.action] = (acc[event.action] || 0) + 1;
    return acc;
  }, {});
  return NextResponse.json({
    summary: {
      workspaces: store.workspaces.length,
      cases: store.cases.length,
      reports: store.reports.length,
      passports: store.passports.length,
      operators: store.memberships.length,
      auditEvents: store.auditEvents.length,
      demoAccounts: store.demoAccounts.map((entry) => ({ id: entry.id, label: entry.label, address: entry.address, privateKeyRef: entry.privateKeyRef })),
      storeChecksum: checksum(JSON.stringify({ cases: store.cases, reports: store.reports, passports: store.passports })),
    },
    actionCounts,
  });
}
