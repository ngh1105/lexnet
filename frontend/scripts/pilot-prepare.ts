import { pathToFileURL } from "node:url";

import { buildPilotSummary } from "../src/lib/platform/pilot-summary";
import {
  buildGenLayerReadinessStatus,
  getLexNetRuntimeMode,
  type PlatformReadinessEnv,
} from "../src/lib/platform/readiness";
import { readPlatformStore } from "../src/lib/platform/store";
import {
  getDemoSeedPublicPassportSlugs,
  resetDemoPlatformStore,
  seedDemoPlatformStore,
} from "../src/lib/platform/demo-seed";

export function canRunPilotPrepare(env: PlatformReadinessEnv): boolean {
  return getLexNetRuntimeMode(env) !== "production";
}

async function main() {
  const env = process.env as PlatformReadinessEnv;

  if (!canRunPilotPrepare(env)) {
    console.error("pilot:prepare refuses to run in production mode.");
    process.exitCode = 1;
    return;
  }

  await resetDemoPlatformStore();
  await seedDemoPlatformStore();

  const store = await readPlatformStore();
  const summary = buildPilotSummary(store, env);
  const genLayer = buildGenLayerReadinessStatus(env);

  console.log("LexNet pilot data prepared");
  console.log(`Runtime mode: ${summary.runtimeMode}`);
  console.log(`Seeded case count: ${summary.caseCount}`);
  console.log(`Seeded queue count: ${summary.queueCount}`);
  console.log(`Seeded published passport count: ${summary.publishedPassportCount}`);
  console.log(`Public passport slugs: ${getDemoSeedPublicPassportSlugs(store).join(", ")}`);
  console.log(`GenLayer state verification capable: ${genLayer.stateVerificationCapable}`);

  for (const reason of summary.blockingReasons) {
    console.log(`Readiness warning: ${reason}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
