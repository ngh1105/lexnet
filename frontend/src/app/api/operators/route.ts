import { jsonOk } from "@/lib/platform/api";
import { authorizeDemoPrivateApi } from "@/lib/platform/auth";
import { readPlatformStore } from "@/lib/platform/store";

export async function GET(request: Request) {
  const store = await readPlatformStore();
  const authorization = authorizeDemoPrivateApi(request, process.env, store);
  if (!authorization.authorized) {
    return authorization.response;
  }

  return jsonOk({
    operators: store.operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
    })),
    memberships: store.memberships
      .filter((membership) => membership.operatorId === authorization.operator.id)
      .map((membership) => ({
        workspaceId: membership.workspaceId,
        role: membership.role,
      })),
  });
}
