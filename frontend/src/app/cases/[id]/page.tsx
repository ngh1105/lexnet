import CaseDetailClient from "@/components/CaseDetailClient";
import { readLexNetContractEnvironment } from "@/lib/lexnet-contract";
import { getCommerceCase } from "@/lib/lexnet-service";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const commerceCase = await getCommerceCase(id);
  const contractEnvironment = readLexNetContractEnvironment();

  return (
    <CaseDetailClient
      caseId={id}
      seedCase={commerceCase}
      contractEnvironment={contractEnvironment}
    />
  );
}
