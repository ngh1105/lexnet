import { NextResponse } from "next/server";

import { buildPlatformObservabilityStatus } from "@/lib/platform/observability";
import { buildPlatformReadinessStatus } from "@/lib/platform/readiness";
import { readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  const store = await readPlatformStore();

  return NextResponse.json({
    readiness: buildPlatformReadinessStatus(process.env),
    observability: buildPlatformObservabilityStatus(store, process.env),
  });
}
