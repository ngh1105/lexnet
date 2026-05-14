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
    queue: store.queue.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      status: item.status,
      priority: item.priority,
      assigned: Boolean(item.assignedOperatorId),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  });
}
