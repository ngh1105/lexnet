import { buildSecurityStatus, jsonOk } from "@/lib/platform/api";
import { buildPlatformSummary, readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  const store = await readPlatformStore();

  return jsonOk({
    security: buildSecurityStatus(process.env),
    summary: buildPlatformSummary(store),
  });
}
