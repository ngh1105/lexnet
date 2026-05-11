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

  const actionCounts: Record<string, number> = {};
  const dailyActivity: Record<string, number> = {};
  let avgImpact = 0;

  for (const event of store.auditEvents) {
    actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
    const day = event.createdAt.slice(0, 10);
    dailyActivity[day] = (dailyActivity[day] || 0) + 1;
  }

  const reportsWithImpact = store.reports.filter((r) => r.impactScore > 0);
  if (reportsWithImpact.length > 0) {
    avgImpact = Math.round(reportsWithImpact.reduce((sum, r) => sum + r.impactScore, 0) / reportsWithImpact.length);
  }

  return NextResponse.json({
    metrics: {
      totalCases: store.cases.length,
      totalEvidence: store.evidence.length,
      totalReports: store.reports.length,
      totalAuditEvents: store.auditEvents.length,
      totalPassports: store.passports.length,
      avgImpactScore: avgImpact,
      approvalRate: store.reports.length > 0
        ? Math.round((store.reports.filter((r) => r.verdict === "approved").length / store.reports.length) * 100)
        : 0,
      activeOperators: store.memberships.filter((m) => m.status === "active").length,
    },
    actionCounts,
    dailyActivity,
  });
}
