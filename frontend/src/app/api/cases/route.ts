import { NextResponse } from "next/server";
import { appendAuditEvent, createId, now, readStore, writeStore } from "@/lib/platform/store";
import type { PlatformCase } from "@/lib/platform/types";

const DEFAULT_WORKSPACE = "default";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ cases: store.cases });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    client?: string;
    freelancer?: string;
    requirementsText?: string;
    workspaceId?: string;
  } | null;

  if (!body?.client || !body?.freelancer || !body?.requirementsText) {
    return NextResponse.json({ error: "client, freelancer, and requirementsText are required" }, { status: 400 });
  }

  const store = await readStore();
  const timestamp = now();
  const item: PlatformCase = {
    id: createId("case"),
    workspaceId: body.workspaceId || DEFAULT_WORKSPACE,
    client: body.client.toLowerCase(),
    freelancer: body.freelancer.toLowerCase(),
    requirementsText: body.requirementsText,
    amount: "0",
    feeAmount: "0",
    status: "CREATED",
    submittedWorkUrl: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    resolvedAt: "0",
  };

  store.cases.push(item);
  await appendAuditEvent(store, {
    workspaceId: item.workspaceId,
    caseId: item.id,
    actor: item.client,
    action: "case.created",
    payload: { freelancer: item.freelancer },
  });
  await writeStore(store);

  return NextResponse.json({ case: item }, { status: 201 });
}
