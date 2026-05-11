import { NextResponse } from "next/server";
import { appendAuditEvent, createId, now, readStore, writeStore } from "@/lib/platform/store";
import { ensurePlatformDefaults } from "@/lib/platform/ops";

export async function GET() {
  const store = await readStore();
  ensurePlatformDefaults(store);
  return NextResponse.json({ queue: store.queue, assignments: store.assignments });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { caseId?: string; operatorId?: string; workspaceId?: string; priority?: "low" | "normal" | "high" } | null;
  if (!body?.caseId) return NextResponse.json({ error: "caseId is required" }, { status: 400 });
  const store = await readStore();
  ensurePlatformDefaults(store);
  const item = store.cases.find((entry) => entry.id === body.caseId);
  if (!item) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  const workspaceId = body.workspaceId || item.workspaceId;
  const queueItem = { id: createId("queue"), workspaceId, caseId: item.id, priority: body.priority || "normal" as const, status: body.operatorId ? "assigned" as const : "waiting" as const, createdAt: now() };
  store.queue.push(queueItem);
  let assignment = null;
  if (body.operatorId) {
    assignment = { id: createId("assign"), workspaceId, caseId: item.id, operatorId: body.operatorId.toLowerCase(), queue: "review" as const, status: "open" as const, createdAt: now(), updatedAt: now() };
    store.assignments.push(assignment);
  }
  await appendAuditEvent(store, { workspaceId, caseId: item.id, actor: body.operatorId || "system", action: "queue.created", payload: { priority: queueItem.priority, assigned: Boolean(assignment) } });
  await writeStore(store);
  return NextResponse.json({ queueItem, assignment }, { status: 201 });
}
