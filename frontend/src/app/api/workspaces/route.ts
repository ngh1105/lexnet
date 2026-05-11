import { NextResponse } from "next/server";
import { appendAuditEvent, createId, now, readStore, writeStore } from "@/lib/platform/store";
import { ensurePlatformDefaults } from "@/lib/platform/ops";
import type { WorkspaceRole } from "@/lib/platform/types";

export async function GET() {
  const store = await readStore();
  ensurePlatformDefaults(store);
  return NextResponse.json({ workspaces: store.workspaces, memberships: store.memberships, invitations: store.invitations });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: string; actor?: string; inviteEmail?: string; inviteRole?: WorkspaceRole } | null;
  if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const store = await readStore();
  ensurePlatformDefaults(store);
  const workspace = { id: createId("ws"), name: body.name, createdAt: now() };
  store.workspaces.push(workspace);
  if (body.actor) {
    const actor = body.actor.toLowerCase();
    store.memberships.push({ id: createId("member"), workspaceId: workspace.id, userId: actor, role: "admin", status: "active", createdAt: workspace.createdAt });
  }
  if (body.inviteEmail) {
    store.invitations.push({ id: createId("invite"), workspaceId: workspace.id, email: body.inviteEmail.toLowerCase(), role: body.inviteRole || "operator", status: "pending", token: createId("token"), createdAt: workspace.createdAt });
  }
  await appendAuditEvent(store, { workspaceId: workspace.id, actor: body.actor || "system", action: "workspace.created", payload: { name: workspace.name } });
  await writeStore(store);
  return NextResponse.json({ workspace }, { status: 201 });
}
