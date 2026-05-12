import { jsonOk } from "@/lib/platform/api";
import { buildPlatformSummary, readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  const store = await readPlatformStore();

  return jsonOk({
    workspaces: store.workspaces,
    memberships: store.memberships,
    summary: buildPlatformSummary(store),
  });
}
