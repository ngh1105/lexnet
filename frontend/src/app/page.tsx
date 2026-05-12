import CommerceDashboardClient from "@/components/CommerceDashboardClient";
import { readLexNetContractEnvironment } from "@/lib/lexnet-contract";
import { getAllCommerceCases, getRuntimeMode } from "@/lib/lexnet-service";
import { buildPlatformSummary, readPlatformStore } from "@/lib/platform/store";

export default async function DashboardPage() {
  const cases = await getAllCommerceCases();
  const runtimeMode = getRuntimeMode();
  const contractEnvironment = readLexNetContractEnvironment();
  const platformStore = await readPlatformStore();
  const platformSummary = buildPlatformSummary(platformStore);
  const queueItems = platformStore.queue;

  return (
    <CommerceDashboardClient
      seedCases={cases}
      runtimeMode={runtimeMode}
      contractEnvironment={contractEnvironment}
      platformSummary={platformSummary}
      queueItems={queueItems}
    />
  );
}
