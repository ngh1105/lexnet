import { NextResponse } from "next/server";
import { appendAuditEvent, createId, now, readStore, writeStore } from "@/lib/platform/store";
import { ensureDemoAccount } from "@/lib/platform/ops";
import type { WorkspaceRole } from "@/lib/platform/types";

export async function GET() {
  const store = await readStore();
  return NextResponse.json({ users: store.users, memberships: store.memberships, demoAccounts: store.demoAccounts });
}

export async function POST(request: Request) {
  const { withAuth } = await import("@/lib/platform/route-helpers");
  return withAuth(request, async (userId, address) => {
    const body = await request.json().catch(() => null) as { address?: string; workspaceId?: string; role?: WorkspaceRole; generateDemoAccount?: boolean; label?: string } | null;
    const store = await readStore();
    const workspaceId = body?.workspaceId || "default";
    const operatorAddress = body?.generateDemoAccount ? (await ensureDemoAccount(body.label)).address : body?.address?.toLowerCase();
    if (!operatorAddress) return NextResponse.json({ error: "address or generateDemoAccount is required" }, { status: 400 });
    if (!store.users.some((entry) => entry.address === operatorAddress)) store.users.push({ id: createId("user"), address: operatorAddress, createdAt: now() });
    const membership = { id: createId("member"), workspaceId, userId, role: body?.role || "operator" as WorkspaceRole, status: "active" as const, createdAt: now() };
    store.memberships.push(membership);
    await appendAuditEvent(store, { workspaceId, actor: userId, action: "operator.added", payload: { role: membership.role } });
    await writeStore(store);
    return NextResponse.json({ membership, demoAccounts: store.demoAccounts }, { status: 201 });
  });
}
