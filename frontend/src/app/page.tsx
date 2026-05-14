import CommerceDashboardClient from "@/components/CommerceDashboardClient";
import { readLexNetContractEnvironment } from "@/lib/lexnet-contract";
import { getSeedCommerceCases, getRuntimeMode } from "@/lib/lexnet-service";
import { getDashboardPlatformData } from "@/lib/platform/store";

export default async function DashboardPage() {
  const runtimeMode = getRuntimeMode();
  const contractEnvironment = readLexNetContractEnvironment();
  const { cases, platformSummary, queueItems } = await getDashboardPlatformData(
    getSeedCommerceCases(),
  );

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
