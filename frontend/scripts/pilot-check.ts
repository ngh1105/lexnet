import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

import { buildPilotSummary } from "../src/lib/platform/pilot-summary";
import {
  buildPlatformReadinessStatus,
  type LexNetRuntimeMode,
  type PlatformReadinessEnv,
} from "../src/lib/platform/readiness";
import {
  DEFAULT_PLATFORM_STORE_PATH,
  createDefaultPlatformStore,
  readPlatformStore,
} from "../src/lib/platform/store";

const FORBIDDEN_STORE_SECRET_KEYS = new Set([
  "privateKey",
  "seedPhrase",
  "mnemonic",
  "walletSecret",
]);

export function findForbiddenStoreSecretKeys(
  value: unknown,
  path: string[] = [],
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenStoreSecretKeys(item, [...path, String(index)]),
    );
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const childPath = [...path, key];
    const findings = FORBIDDEN_STORE_SECRET_KEYS.has(key) ? [childPath.join(".")] : [];
    return [...findings, ...findForbiddenStoreSecretKeys(child, childPath)];
  });
}

export function shouldFailPilotCheck(
  mode: LexNetRuntimeMode,
  productionBlockers: string[],
  forbiddenSecretKeys: string[],
): boolean {
  return forbiddenSecretKeys.length > 0 || (mode === "production" && productionBlockers.length > 0);
}

export function parseRawStoreForSecretScan(rawJson: string): {
  rawStore: unknown | null;
  warning: string;
} {
  try {
    return { rawStore: JSON.parse(rawJson), warning: "" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      rawStore: null,
      warning: `Invalid platform store JSON; forbidden-secret scan skipped: ${detail}`,
    };
  }
}

export function isPathIgnoredByGitOutput(output: string): boolean {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line.length > 0 && !line.startsWith("fatal:"));
}

async function main() {
  const env = process.env as PlatformReadinessEnv;
  const readiness = buildPlatformReadinessStatus(env);
  const storeExists = existsSync(DEFAULT_PLATFORM_STORE_PATH);
  let storeReadWarning = "";
  let rawStore: unknown = null;

  if (storeExists) {
    const parsedRawStore = parseRawStoreForSecretScan(
      await readFile(DEFAULT_PLATFORM_STORE_PATH, "utf8"),
    );
    rawStore = parsedRawStore.rawStore;
    if (parsedRawStore.warning) {
      storeReadWarning = parsedRawStore.warning;
    }
  }

  const store = storeExists
    ? await readPlatformStore(DEFAULT_PLATFORM_STORE_PATH).catch((error) => {
      storeReadWarning = error instanceof Error ? error.message : String(error);
      return createDefaultPlatformStore();
    })
    : createDefaultPlatformStore();
  const summary = buildPilotSummary(store, env);
  const forbiddenSecretKeys = storeExists && rawStore !== null
    ? findForbiddenStoreSecretKeys(rawStore)
    : [];
  const gitIgnoreOutput = getGitIgnoreOutput(DEFAULT_PLATFORM_STORE_PATH);
  const storeIgnored = isPathIgnoredByGitOutput(gitIgnoreOutput);

  console.log("LexNet pilot readiness check");
  console.log(`Runtime mode: ${readiness.runtimeMode}`);
  console.log(`Auth status: production auth configured=${readiness.auth.productionAuthConfigured}; demo private API enabled=${readiness.auth.demoPrivateApiEnabled}; mutating routes allowed=${readiness.auth.mutatingRoutesAllowed}`);
  console.log(`Persistence status: ${readiness.persistence.mode}; filesystem allowed=${readiness.persistence.filesystemPersistenceAllowed}; managed configured=${readiness.persistence.managedPersistenceConfigured}`);
  console.log(`Evidence policy status: public HTTPS only=${readiness.evidencePolicy.allowPublicHttpsOnly}; raw evidence storage=${readiness.evidencePolicy.rawEvidenceStorage}; retention configured=${readiness.evidencePolicy.retentionPolicyConfigured}`);
  console.log(`GenLayer readiness: rpc=${readiness.genLayer.rpcUrlConfigured}; contract=${readiness.genLayer.contractAddressConfigured}; walletConnect=${readiness.genLayer.walletConnectProjectIdConfigured}; state verification capable=${readiness.genLayer.stateVerificationCapable}; network=${readiness.genLayer.networkLabel}`);
  console.log(`.lexnet-data git ignore status: ${storeIgnored ? "ignored" : "not ignored"}`);
  console.log(`Store path: ${DEFAULT_PLATFORM_STORE_PATH} (${storeExists ? "found" : "missing; using empty in-memory summary"})`);
  console.log(`Counts: cases=${summary.caseCount}; queue=${summary.queueCount}; published passports=${summary.publishedPassportCount}`);
  console.log(`GenLayer execution counts: ${JSON.stringify(summary.genLayerExecutionCounts)}`);

  const warnings = storeReadWarning
    ? [...readiness.blockingReasons, storeReadWarning]
    : readiness.blockingReasons;
  console.log(`Warnings: ${warnings.length === 0 ? "none" : warnings.join(" | ")}`);
  console.log(`Production blockers: ${readiness.productionBlockers.length === 0 ? "none" : readiness.productionBlockers.join(" | ")}`);
  console.log(`Forbidden secret findings: ${forbiddenSecretKeys.length === 0 ? "none" : forbiddenSecretKeys.join(" | ")}`);

  if (shouldFailPilotCheck(readiness.runtimeMode, readiness.productionBlockers, forbiddenSecretKeys)) {
    process.exitCode = 1;
  }
}

export function getGitIgnoreOutput(storePath: string): string {
  try {
    return execFileSync(
      "git",
      ["check-ignore", relative(process.cwd(), storePath)],
      { cwd: process.cwd(), encoding: "utf8" },
    );
  } catch (error) {
    const output = error && typeof error === "object" && "stdout" in error
      ? String((error as { stdout?: unknown }).stdout ?? "")
      : "";
    return output;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
