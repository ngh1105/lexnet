import { jsonOk, buildSecurityStatus } from "@/lib/platform/api";

export async function GET() {
  return jsonOk(buildSecurityStatus(process.env));
}
