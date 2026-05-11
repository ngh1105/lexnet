import { NextResponse } from "next/server";
import { appendAuditEvent, checksum, createId, normalizeEvidenceUrl, now, readStore, writeStore } from "@/lib/platform/store";
import type { EvidenceRecord } from "@/lib/platform/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as { url?: string; submittedBy?: string } | null;
  if (!body?.url || !body?.submittedBy) {
    return NextResponse.json({ error: "url and submittedBy are required" }, { status: 400 });
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeEvidenceUrl(body.url);
  } catch {
    return NextResponse.json({ error: "Evidence URL must be a valid absolute URL" }, { status: 400 });
  }

  const store = await readStore();
  const item = store.cases.find((entry) => entry.id === id);
  if (!item) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const existing = store.evidence.find((entry) => entry.caseId === id && entry.normalizedUrl === normalizedUrl);
  if (existing) return NextResponse.json({ evidence: existing, deduped: true });

  const evidence: EvidenceRecord = {
    id: createId("ev"),
    caseId: id,
    workspaceId: item.workspaceId,
    submittedBy: body.submittedBy.toLowerCase(),
    url: body.url,
    normalizedUrl,
    status: "pending",
    checksum: checksum(normalizedUrl),
    createdAt: now(),
  };

  store.evidence.push(evidence);
  item.submittedWorkUrl = body.url;
  item.status = "WORK_SUBMITTED";
  item.updatedAt = now();
  await appendAuditEvent(store, {
    workspaceId: item.workspaceId,
    caseId: id,
    actor: evidence.submittedBy,
    action: "evidence.submitted",
    payload: { evidenceId: evidence.id, normalizedUrl },
  });
  await writeStore(store);

  return NextResponse.json({ evidence, deduped: false }, { status: 201 });
}
