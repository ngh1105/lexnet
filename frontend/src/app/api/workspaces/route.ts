import { jsonOk } from "@/lib/platform/api";
import { authorizeDemoPrivateApi } from "@/lib/platform/auth";
import { buildPlatformSummary, readPlatformStore } from "@/lib/platform/store";

export async function GET(request: Request) {
  const store = await readPlatformStore();
  const authorization = authorizeDemoPrivateApi(request, process.env, store);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const memberships = store.memberships.filter(
    (membership) => membership.operatorId === authorization.operator.id,
  );
  const workspaceIds = new Set(memberships.map((membership) => membership.workspaceId));

  return jsonOk({
    workspaces: store.workspaces
      .filter((workspace) => workspaceIds.has(workspace.id))
      .map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        createdAt: workspace.createdAt,
      })),
    memberships: memberships.map((membership) => ({
      workspaceId: membership.workspaceId,
      role: membership.role,
    })),
    summary: buildPlatformSummary(store),
  });
}
