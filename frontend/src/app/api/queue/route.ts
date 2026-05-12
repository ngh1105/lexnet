import { jsonOk } from "@/lib/platform/api";
import { readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  const store = await readPlatformStore();

  return jsonOk({ queue: store.queue });
}
