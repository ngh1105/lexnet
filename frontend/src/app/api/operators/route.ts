import { NextResponse } from "next/server";
import { appendAuditEvent, createId, now, readStore, writeStore } from "@/lib/platform/store";
import { ensureDemoAccount } from "@/lib/platform/ops";
import type { WorkspaceRole } from "@/lib/platform/types";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ users: store.users, memberships: store.memberships, demoAccounts: store.demoAccounts });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { address?: string; workspaceId?: string; role?: WorkspaceRole; generateDemoAccount?: boolean; label?: string } | null;
  const store = await readStore();
  const workspaceId = body?.workspaceId || "default";
  const address = body?.generateDemoAccount ? (await ensureDemoAccount(body.label)).address : body?.address?.toLowerCase();
  if (!address) return NextResponse.json({ error: "address or generateDemoAccount is required" }, { status: 400 });
  if (!store.users.some((entry) => entry.address === address)) store.users.push({ id: createId("user"), address, createdAt: now() });
  const membership = { id: createId("member"), workspaceId, userId: address, role: body?.role || "operator" as WorkspaceRole, status: "active" as const, createdAt: now() };
  store.memberships.push(membership);
  await appendAuditEvent(store, { workspaceId, actor: address, action: "operator.added", payload: { role: membership.role } });
  await writeStore(store);
  return NextResponse.json({ membership, demoAccounts: store.demoAccounts }, { status: 201 });
}
