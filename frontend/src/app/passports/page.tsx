import TrustPassportsClient from "@/components/TrustPassportsClient";
import { getAllCommerceCases } from "@/lib/lexnet-service";
import { getSafePassportRecords } from "@/lib/platform/store";

export const dynamic = "force-dynamic";

export default async function TrustPassportsPage() {
  const [cases, backendPassports] = await Promise.all([
    getAllCommerceCases(),
    getSafePassportRecords(),
  ]);

  return (
    <TrustPassportsClient
      seedCases={cases}
      initialBackendPassports={backendPassports}
    />
  );
}
