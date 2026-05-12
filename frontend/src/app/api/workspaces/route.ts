import { jsonError, jsonOk } from "@/lib/platform/api";
import { requireDemoOperator } from "@/lib/platform/auth";
import { buildPlatformSummary, readPlatformStore } from "@/lib/platform/store";

export async function GET(request: Request) {
  const store = await readPlatformStore();
  if (!requireDemoOperator(request, store)) {
    return jsonError("Unauthorized.", 401);
  }

  return jsonOk({
    workspaces: store.workspaces,
    memberships: store.memberships,
    summary: buildPlatformSummary(store),
  });
}
