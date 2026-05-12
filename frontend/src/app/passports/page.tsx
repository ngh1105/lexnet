import TrustPassportsClient from "@/components/TrustPassportsClient";
import { getAllCommerceCases } from "@/lib/lexnet-service";

export default async function TrustPassportsPage() {
  const cases = await getAllCommerceCases();

  return <TrustPassportsClient seedCases={cases} />;
}
