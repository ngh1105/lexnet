import { NextResponse } from "next/server";
import { checksum, readStore } from "@/lib/platform/store";
import { ensurePlatformDefaults } from "@/lib/platform/ops";

export async function GET() {
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
