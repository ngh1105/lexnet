import { randomUUID } from "node:crypto";
import { jsonOk } from "@/lib/platform/api";
import { authorizePlatformMutation } from "@/lib/platform/auth";
import { redactSubject } from "@/lib/platform/passports";
import { buildPlatformSummary, mutatePlatformStore } from "@/lib/platform/store";

export async function GET(request: Request) {
  const exportedAt = new Date().toISOString();
  let unauthorizedResponse: Response | null = null;
  const store = await mutatePlatformStore(async (draft) => {
    const authorization = await authorizePlatformMutation(request, process.env, draft);
    if (!authorization.authorized) {
      unauthorizedResponse = authorization.response;
      return;
    }

    draft.auditEvents.push({
      id: `audit-${exportedAt.replace(/\D/g, "")}-backup-exported-${randomUUID().slice(0, 8)}`,
      type: "backup.exported",
      actorId: authorization.operator.id,
      entityType: "backup",
      entityId: "platform-store",
      detail: "Exported platform store backup",
      createdAt: exportedAt,
    });
  });

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

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
