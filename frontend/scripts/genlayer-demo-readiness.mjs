import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_RPC_URL = "https://studio.genlayer.com/api";
const DEFAULT_NETWORK_LABEL = "Studionet";

function readEnvFile(filePath) {
  try {
    return Object.fromEntries(
      readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

function readConfig() {
  const localEnv = readEnvFile(resolve(process.cwd(), ".env.local"));
  const exampleEnv = readEnvFile(resolve(process.cwd(), ".env.example"));
  const env = { ...exampleEnv, ...localEnv, ...process.env };

  return {
    contractAddress: normalize(env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS),
    rpcUrl: normalize(env.NEXT_PUBLIC_GENLAYER_RPC_URL) ?? DEFAULT_RPC_URL,
    networkLabel: normalize(env.NEXT_PUBLIC_GENLAYER_NETWORK_LABEL) ?? DEFAULT_NETWORK_LABEL,
  };
}

function normalize(value) {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildDemoPayloads() {
  const acceptanceCriteria = [
    "Evidence includes public delivery URLs.",
    "Delivery satisfies the buyer agreement.",
  ];
  const evidenceUrls = [
    "https://example.com/delivery-proof",
    "https://github.com/vendor/source",
  ];

  return {
    create_case: {
      title: "Demo commerce verification case",
      seller: "0xseller-demo-address",
      agreement_text:
        "Deliver the agreed commerce order with public evidence links, matching the buyer acceptance criteria and handoff requirements.",
      acceptance_criteria_json: JSON.stringify(acceptanceCriteria),
      amount_reference: 2500,
    },
    submit_evidence: {
      case_id: "lx-<returned-case-id>",
      evidence_json: JSON.stringify(evidenceUrls),
    },
    verify_case: {
      case_id: "lx-<returned-case-id>",
    },
  };
}

const config = readConfig();
const blockingReasons = [];

if (!config.contractAddress) {
  blockingReasons.push("NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS is not configured.");
}
if (!config.rpcUrl) {
  blockingReasons.push("NEXT_PUBLIC_GENLAYER_RPC_URL is not configured.");
}

const output = {
  phase: "Phase 2: script-driven on-chain demo",
  status: blockingReasons.length === 0 ? "READY_FOR_MANUAL_CONTRACT_CALL" : "CONFIG_INCOMPLETE",
  config,
  blockingReasons,
  payloads: buildDemoPayloads(),
  nextStep:
    blockingReasons.length === 0
      ? "Use these payloads with the GenLayer SDK/CLI or Phase 3 guarded UI write path. No private key was read or stored."
      : "Configure the missing public env values, then rerun npm run demo:genlayer-readiness.",
};

console.log(JSON.stringify(output, null, 2));

if (blockingReasons.length > 0) {
  process.exitCode = 1;
}
