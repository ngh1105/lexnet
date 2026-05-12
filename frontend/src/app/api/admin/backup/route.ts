import { requireDemoOperator } from "@/lib/platform/auth";
import { jsonError, jsonOk } from "@/lib/platform/api";
import { mutatePlatformStore, readPlatformStore } from "@/lib/platform/store";

export async function GET(request: Request) {
  const currentStore = await readPlatformStore();
  if (!requireDemoOperator(request, currentStore)) {
    return jsonError("Unauthorized.", 401);
  }

  const exportedAt = new Date().toISOString();
  const store = await mutatePlatformStore((draft) => {
    const operator = requireDemoOperator(request, draft);
    draft.auditEvents.push({
      id: `audit-${exportedAt.replace(/\D/g, "")}-backup-exported`,
      type: "backup.exported",
      actorId: operator?.id ?? "system",
      entityType: "backup",
      entityId: "platform-store",
      detail: "Exported platform store backup",
      createdAt: exportedAt,
    });
  });

  return jsonOk({ exportedAt, store });
}
