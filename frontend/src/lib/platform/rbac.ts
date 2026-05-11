import { getDb } from "./db";
import * as schema from "./schema";
import { eq, and, or } from "drizzle-orm";
import type { WorkspaceRole } from "./types";

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  admin: 4,
  operator: 3,
  reviewer: 2,
  viewer: 1,
};

export function hasPermission(userRole: WorkspaceRole, requiredRole: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export async function getUserRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const db = getDb();
  // Match by either user.id or wallet address to handle both identity modes
  const rows = db.select()
    .from(schema.memberships)
    .where(and(
      or(eq(schema.memberships.userId, userId), eq(schema.memberships.userId, userId.toLowerCase())),
      eq(schema.memberships.workspaceId, workspaceId),
      eq(schema.memberships.status, "active"),
    ))
    .all();

  return rows.length > 0 ? (rows[0].role as WorkspaceRole) : null;
}

export async function requireRole(
  userId: string,
  workspaceId: string,
  requiredRole: WorkspaceRole,
): Promise<{ allowed: boolean; role: WorkspaceRole | null }> {
  const role = await getUserRole(userId, workspaceId);
  if (!role) return { allowed: false, role: null };
  return { allowed: hasPermission(role, requiredRole), role };
}

export async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = db.select()
    .from(schema.memberships)
    .where(and(
      or(eq(schema.memberships.userId, userId), eq(schema.memberships.userId, userId.toLowerCase())),
      eq(schema.memberships.status, "active"),
    ))
    .all();
  return rows.map((r) => r.workspaceId);
}

export async function resolveUserId(userId: string): Promise<string> {
  const db = getDb();
  // If userId looks like a wallet address, find the actual user.id
  if (userId.startsWith("0x")) {
    const user = db.select().from(schema.users).where(eq(schema.users.address, userId.toLowerCase())).get();
    if (user) return user.id;
  }
  return userId;
}
