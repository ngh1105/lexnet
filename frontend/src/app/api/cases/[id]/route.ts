import { NextResponse } from "next/server";
import { appendAuditEvent, readStore, writeStore, now } from "@/lib/platform/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await readStore();
  const item = store.cases.find((entry) => entry.id === id);
  if (!item) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const evidence = store.evidence.filter((entry) => entry.caseId === id);
  const reports = store.reports.filter((entry) => entry.caseId === id);
  const auditEvents = store.auditEvents.filter((entry) => entry.caseId === id);
  return NextResponse.json({ case: item, evidence, reports, auditEvents });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as { amount?: string; actor?: string } | null;
  const store = await readStore();
  const item = store.cases.find((entry) => entry.id === id);
  if (!item) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  if (body?.amount) {
    const amount = BigInt(body.amount);
    if (amount <= 0n) return NextResponse.json({ error: "amount must be greater than zero" }, { status: 400 });
    item.amount = amount.toString();
    item.feeAmount = (amount * 250n / 10000n).toString();
    item.status = "FUNDED";
    item.updatedAt = now();
    await appendAuditEvent(store, {
      workspaceId: item.workspaceId,
      caseId: item.id,
      actor: body.actor || item.client,
      action: "case.funded",
      payload: { amount: item.amount, feeAmount: item.feeAmount },
    });
  }

  await writeStore(store);
  return NextResponse.json({ case: item });
}
