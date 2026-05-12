import { jsonOk } from "@/lib/platform/api";
import { authorizeDemoPrivateApi } from "@/lib/platform/auth";
import { redactSubject } from "@/lib/platform/passports";
import { buildPlatformSummary, mutatePlatformStore, readPlatformStore } from "@/lib/platform/store";

export async function GET(request: Request) {
  const currentStore = await readPlatformStore();
  const authorization = authorizeDemoPrivateApi(request, process.env, currentStore);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const exportedAt = new Date().toISOString();
  const store = await mutatePlatformStore((draft) => {
    draft.auditEvents.push({
      id: `audit-${exportedAt.replace(/\D/g, "")}-backup-exported`,
      type: "backup.exported",
      actorId: authorization.operator.id,
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
