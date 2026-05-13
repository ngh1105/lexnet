import { randomUUID } from "node:crypto";
import { jsonOk } from "@/lib/platform/api";
import { authorizePlatformMutation } from "@/lib/platform/auth";
import { redactSubject } from "@/lib/platform/passports";
import { buildPlatformSummary, mutatePlatformStore, readPlatformStore } from "@/lib/platform/store";

export async function GET(request: Request) {
  const exportedAt = new Date().toISOString();
  const currentStore = await readPlatformStore();
  const authorization = authorizePlatformMutation(request, process.env, currentStore);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const actorId = authorization.operator.id;
  const store = await mutatePlatformStore((draft) => {
    draft.auditEvents.push({
      id: `audit-${exportedAt.replace(/\D/g, "")}-backup-exported-${randomUUID().slice(0, 8)}`,
      type: "backup.exported",
      actorId,
      entityType: "backup",
      entityId: "platform-store",
      detail: "Exported platform store backup",
      createdAt: exportedAt,
    });
  });

  return jsonOk({
    exportedAt,
    demoOnly: true,
    backup: {
      summary: buildPlatformSummary(store),
      auditEvents: store.auditEvents,
      cases: store.cases,
      passports: store.publishedPassports.map((passport) => ({
        ...passport,
        party: redactSubject(passport.party),
      })),
      queue: store.queue.map(({ assignedOperatorId: _assignedOperatorId, ...item }) => item),
    },
  });
}
