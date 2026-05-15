import PlatformReadinessClient from "@/components/PlatformReadinessClient";
import { buildPlatformObservabilityStatus } from "@/lib/platform/observability";
import { buildPlatformReadinessStatus } from "@/lib/platform/readiness";
import { readPlatformStore } from "@/lib/platform/store";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const store = await readPlatformStore();
  const readiness = buildPlatformReadinessStatus(process.env);
  const observability = buildPlatformObservabilityStatus(store, process.env);

  return <PlatformReadinessClient readiness={readiness} observability={observability} />;
}
