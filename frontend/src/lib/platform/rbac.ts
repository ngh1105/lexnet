import { getDb } from "./db";
import * as schema from "./schema";
import { eq, and } from "drizzle-orm";
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
  const rows = db.select()
    .from(schema.memberships)
    .where(and(
      eq(schema.memberships.userId, userId),
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
      eq(schema.memberships.userId, userId),
      eq(schema.memberships.status, "active"),
    ))
    .all();
  return rows.map((r) => r.workspaceId);
}
