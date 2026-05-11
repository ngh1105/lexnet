import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/platform/auth";
import { getUserRole } from "@/lib/platform/rbac";
import type { WorkspaceRole } from "@/lib/platform/types";

interface AuthContext {
  userId: string;
  address: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export async function withWorkspaceAuth(
  request: Request,
  workspaceId: string | null,
  requiredRole: WorkspaceRole,
  handler: (ctx: AuthContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const session = await requireAuth(request);
    const wsId = workspaceId || "default";
    const role = await getUserRole(session.userId, wsId);

    if (!role) {
      return NextResponse.json({ error: "No access to this workspace" }, { status: 403 });
    }

    const ROLE_HIERARCHY: Record<WorkspaceRole, number> = { admin: 4, operator: 3, reviewer: 2, viewer: 1 };
    if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[requiredRole]) {
      return NextResponse.json({ error: `Requires ${requiredRole} role or higher` }, { status: 403 });
    }

    return handler({ userId: session.userId, address: session.address, workspaceId: wsId, role });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
