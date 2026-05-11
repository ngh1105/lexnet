import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";

const frontendDir = path.resolve(".");

test("verify-demo-account script prints safe summary without private key", () => {
  const result = spawnSync("node", ["scripts/verify-demo-account.mjs"], {
    cwd: frontendDir,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_LEXNET_DATA_MODE: "local",
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0x08a9897bbE5aEa24b41447f758FeD246035648B3",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.mode, "local");
  assert.equal(payload.contractAddress, "0x08a9897bbE5aEa24b41447f758FeD246035648B3");
  assert.equal(typeof payload.demoAccount.address, "string");
  assert.equal(payload.demoAccount.address.startsWith("0x"), true);
  assert.equal(typeof payload.demoAccount.privateKeyRef, "string");
  assert.equal(payload.demoAccount.privateKeyRef.startsWith("local-demo:"), true);
  assert.equal("privateKey" in payload.demoAccount, false);
  assert.equal(Array.isArray(payload.mockEscrowIds), true);
  assert.equal(payload.mockEscrowIds.length > 0, true);
});

test("verify-testnet-account dry-run script outputs safe JSON with reachability info", () => {
  const result = spawnSync("node", ["scripts/verify-testnet-account.mjs"], {
    cwd: frontendDir,
    encoding: "utf8",
    timeout: 30000,
    env: {
      ...process.env,
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0x08a9897bbE5aEa24b41447f758FeD246035648B3",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.mode, "testnet-dry-run");
  assert.equal(payload.contractAddress, "0x08a9897bbE5aEa24b41447f758FeD246035648B3");
  assert.equal(typeof payload.rpcUrl, "string");
  assert.equal(typeof payload.demoAccount.address, "string");
  assert.equal(payload.demoAccount.address.startsWith("0x"), true);
  assert.equal("privateKey" in payload.demoAccount, false);
  assert.equal(typeof payload.reachable, "boolean");
  if (payload.reachable) {
    assert.equal(typeof payload.treasury, "string");
  }
});

test("verify-testnet-account fails cleanly when contract address is missing", () => {
  const result = spawnSync("node", ["scripts/verify-testnet-account.mjs"], {
    cwd: frontendDir,
    encoding: "utf8",
    timeout: 15000,
    env: {
      ...process.env,
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    },
  });

  assert.notEqual(result.status, 0, "Should exit non-zero when contract address is missing");
  const output = result.stdout + result.stderr;
  assert.equal(output.includes("error") || output.includes("missing") || output.includes("required"), true);
});
