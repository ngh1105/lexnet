import CommerceDashboardClient from "@/components/CommerceDashboardClient";
import { readLexNetContractEnvironment } from "@/lib/lexnet-contract";
import { getAllCommerceCases, getRuntimeMode } from "@/lib/lexnet-service";

export default async function DashboardPage() {
  const cases = await getAllCommerceCases();
  const runtimeMode = getRuntimeMode();
  const contractEnvironment = readLexNetContractEnvironment();

  return (
    <CommerceDashboardClient
      seedCases={cases}
      runtimeMode={runtimeMode}
      contractEnvironment={contractEnvironment}
    />
  );
}
