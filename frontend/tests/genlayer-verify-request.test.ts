import test from "node:test";
import assert from "node:assert/strict";

import { buildVerifyCaseRequest } from "../src/lib/genlayer-verify-request";

test("buildVerifyCaseRequest produces correct POST body shape", () => {
  const result = buildVerifyCaseRequest({
    caseId: "case-123",
    walletConnected: true,
    connectedWalletAddress: "0xABC",
  });

  assert.equal(result.method, "POST");
  assert.equal(result.headers["content-type"], "application/json");
  assert.equal(result.headers["x-lexnet-operator-id"], "operator-demo");
  assert.equal(result.headers["authorization"], undefined);

  const body = JSON.parse(result.body);
  assert.deepEqual(body, {
    caseId: "case-123",
    walletConnected: true,
    connectedWalletAddress: "0xABC",
  });
});

test("buildVerifyCaseRequest includes Authorization header when demoToken is set", () => {
  const result = buildVerifyCaseRequest({
    caseId: "case-456",
    walletConnected: false,
    connectedWalletAddress: undefined,
    demoToken: "secret-token",
  });

  assert.equal(result.headers["authorization"], "Bearer secret-token");

  const body = JSON.parse(result.body);
  assert.equal(body.caseId, "case-456");
  assert.equal(body.walletConnected, false);
  assert.equal(body.connectedWalletAddress, null);
});

test("buildVerifyCaseRequest omits Authorization header when demoToken is empty", () => {
  const result = buildVerifyCaseRequest({
    caseId: "case-789",
    walletConnected: true,
    connectedWalletAddress: "0xDEF",
    demoToken: "",
  });

  assert.equal(result.headers["authorization"], undefined);
});
