import crypto from "node:crypto";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const contractAddress = process.env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS || "";
const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const hasWrite = process.argv.includes("--write");

const checksum = (input) => crypto.createHash("sha256").update(input).digest("hex");

function fail(message, extra = {}) {
  process.stdout.write(JSON.stringify({ error: message, ...extra }));
  process.exit(1);
}

if (!contractAddress) {
  fail("NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS is required", { missing: ["contractAddress"] });
}

const demoAccount = createAccount();
const safeAccount = {
  address: demoAccount.address.toLowerCase(),
  privateKeyRef: `ephemeral:${checksum(demoAccount.address).slice(0, 16)}`,
};

const basePayload = {
  mode: "testnet-dry-run",
  contractAddress,
  rpcUrl,
  demoAccount: safeAccount,
};

const client = createClient({ endpoint: rpcUrl, chain: studionet, account: demoAccount });

async function run() {
  let reachable = false;
  let treasury = null;
  let contractReadFailed = false;
  let readError = null;

  try {
    treasury = await client.readContract({
      address: contractAddress,
      functionName: "get_treasury",
      args: [],
    });
    reachable = true;
  } catch (err) {
    readError = err.message || String(err);
    try {
      await client.waitForTransactionReceipt({ hash: "0x" + "0".repeat(64), retries: 1, interval: 500 });
    } catch {
    }
    try {
      const controller = new AbortController();
      const resp = await fetch(rpcUrl, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) });
      if (resp.ok) { reachable = true; contractReadFailed = true; } else { reachable = false; }
    } catch {
      reachable = false;
    }
  }

  const payload = { ...basePayload, reachable, ...(treasury !== null ? { treasury: String(treasury) } : {}), ...(contractReadFailed ? { contractReadFailed, readError } : {}) };

  if (!hasWrite || !reachable) {
    process.stdout.write(JSON.stringify(payload));
    return;
  }

  payload.txAttempted = true;
  try {
    const freelancerAddress = "0x0000000000000000000000000000000000000001";
    const requirementsText = "LexNet testnet verify: ephemeral dry-run create_escrow";
    const txHash = await client.writeContract({
      address: contractAddress,
      functionName: "create_escrow",
      args: [freelancerAddress, requirementsText],
      value: 0n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash: txHash, retries: 120, interval: 3000 });
    payload.txHash = txHash;
    payload.txStatus = receipt.statusName || receipt.status || "unknown";
    payload.success = true;
  } catch (err) {
    payload.success = false;
    payload.writeError = err.message || String(err);
  }

  process.stdout.write(JSON.stringify(payload));
}

run().catch((err) => {
  fail(err.message || "Unexpected error", { reachable: false });
});
