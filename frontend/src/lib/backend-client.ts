import type { AuditEvent, EvidenceRecord, VerificationReport } from "@/lib/platform/types";

export interface CaseArtifacts {
  evidence: EvidenceRecord[];
  reports: VerificationReport[];
  auditEvents: AuditEvent[];
}

export async function getCaseArtifacts(caseId: string): Promise<CaseArtifacts> {
  const response = await fetch(`/api/cases/${caseId}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to load case artifacts: ${response.status}`);
  }
  return {
    evidence: payload.evidence || [],
    reports: payload.reports || [],
    auditEvents: payload.auditEvents || [],
  };
}

export async function getLatestReport(caseId: string): Promise<VerificationReport | null> {
  const response = await fetch(`/api/cases/${caseId}/report`);
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to load report: ${response.status}`);
  }
  return payload.report || null;
}

export async function reviewLatestReport(
  caseId: string,
  input: { status?: "draft" | "reviewed"; reviewerNotes?: string; actor?: string }
): Promise<VerificationReport> {
  const response = await fetch(`/api/cases/${caseId}/report`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Failed to review report: ${response.status}`);
  }
  return payload.report;
}

export function reportExportUrl(caseId: string, format: "download" | "print"): string {
  return `/api/cases/${caseId}/report?format=${format}`;
}
