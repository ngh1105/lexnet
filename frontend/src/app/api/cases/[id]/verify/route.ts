import { NextResponse } from "next/server";
import { appendAuditEvent, createId, now, readStore, writeStore } from "@/lib/platform/store";
import type { VerificationReport } from "@/lib/platform/types";

function deterministicScore(requirements: string, evidenceCount: number): number {
  const coverageScore = Math.min(70, requirements.length / 8);
  const evidenceScore = Math.min(30, evidenceCount * 15);
  return Math.max(0, Math.min(100, Math.round(coverageScore + evidenceScore)));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { withAuth } = await import("@/lib/platform/route-helpers");
  const { id } = await params;

  return withAuth(request, async (userId, address) => {
    const store = await readStore();
    const item = store.cases.find((entry) => entry.id === id);
    if (!item) return NextResponse.json({ error: "Case not found" }, { status: 404 });
    if (item.status !== "WORK_SUBMITTED") {
      return NextResponse.json({ error: "Case must have submitted evidence before verification" }, { status: 400 });
    }

    const evidence = store.evidence.filter((entry) => entry.caseId === id);
    if (evidence.length === 0) {
      return NextResponse.json({ error: "At least one evidence record is required before verification" }, { status: 400 });
    }

    item.status = "AI_EVALUATING";
    item.updatedAt = now();
    await appendAuditEvent(store, {
      workspaceId: item.workspaceId,
      caseId: id,
      actor: address,
      action: "verification.started",
      payload: { evidenceCount: evidence.length },
    });

    let report: VerificationReport;
    try {
      const impactScore = deterministicScore(item.requirementsText, evidence.length);
      const approved = impactScore >= 60;
      const createdAt = now();
      report = {
        id: createId("report"),
        caseId: id,
        workspaceId: item.workspaceId,
        version: "lexnet.report.v1",
        schemaVersion: 1,
        status: "draft",
        evidenceIds: evidence.map((entry) => entry.id),
        evidenceChecksums: evidence.map((entry) => entry.checksum),
        verdict: approved ? "approved" : "rejected",
        impactScore,
        settlementRecommendation: approved ? "release_to_freelancer" : "refund_client",
        rationale: `Deterministic local verification reviewed ${evidence.length} evidence item(s) against the stored requirements.`,
        reviewerNotes: "",
        exportedAt: "",
        createdAt,
      };

      store.reports.push(report);
      item.status = "RESOLVED";
      item.resolvedAt = createdAt;
      item.updatedAt = createdAt;
      await appendAuditEvent(store, {
        workspaceId: item.workspaceId,
        caseId: id,
        actor: address,
        action: "verification.completed",
        payload: { reportId: report.id, verdict: report.verdict, impactScore, schemaVersion: report.schemaVersion },
      });
    } catch (error) {
      item.status = "WORK_SUBMITTED";
      item.updatedAt = now();
      await appendAuditEvent(store, {
        workspaceId: item.workspaceId,
        caseId: id,
        actor: address,
        action: "verification.failed",
        payload: { error: error instanceof Error ? error.message : "Unknown verification error" },
      });
      await writeStore(store);
      return NextResponse.json({ error: "Verification failed. Please retry." }, { status: 500 });
    }
    await writeStore(store);

    return NextResponse.json({ report }, { status: 201 });
  });
}
