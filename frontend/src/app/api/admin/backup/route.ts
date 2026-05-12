import { getDemoOperator } from "@/lib/platform/auth";
import { jsonOk } from "@/lib/platform/api";
import { mutatePlatformStore } from "@/lib/platform/store";

export async function GET() {
  const exportedAt = new Date().toISOString();
  const store = await mutatePlatformStore((draft) => {
    const operator = getDemoOperator(draft);
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
