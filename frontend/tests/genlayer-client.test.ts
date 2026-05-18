import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGenLayerCreateCaseRequest,
  type GenLayerCreateCaseInput,
} from "../src/lib/genlayer-client";

test("buildGenLayerCreateCaseRequest produces correct args", () => {
  const input: GenLayerCreateCaseInput = {
    contractAddress: "0xabc123",
    caseId: "lx-1",
    title: "Widget delivery",
    seller: "0xseller",
    agreementText: "Seller must deliver 10 widgets by end of month per PO-123.",
    acceptanceCriteria: ["Tracking shows delivered", "Receipt matches order"],
    amountReference: 500,
  };

  const request = buildGenLayerCreateCaseRequest(input);

  assert.equal(request.contractAddress, "0xabc123");
  assert.equal(request.method, "create_case");
  assert.equal(request.args[0], "Widget delivery");
  assert.equal(request.args[1], "0xseller");
  assert.equal(request.args[2], "Seller must deliver 10 widgets by end of month per PO-123.");
  assert.equal(request.args[3], JSON.stringify(["Tracking shows delivered", "Receipt matches order"]));
  assert.equal(request.args[4], "500");
});

test("buildGenLayerCreateCaseRequest with empty acceptanceCriteria produces '[]'", () => {
  const input: GenLayerCreateCaseInput = {
    contractAddress: "0xabc",
    caseId: "lx-2",
    title: "Test",
    seller: "0xseller",
    agreementText: "Agreement text that is at least forty characters long here.",
    acceptanceCriteria: [],
    amountReference: 100,
  };

  const request = buildGenLayerCreateCaseRequest(input);
  assert.equal(request.args[3], "[]");
});

test("buildGenLayerCreateCaseRequest rounds amountReference", () => {
  const input: GenLayerCreateCaseInput = {
    contractAddress: "0xabc",
    caseId: "lx-3",
    title: "Test",
    seller: "0xseller",
    agreementText: "Agreement text that is at least forty characters long here.",
    acceptanceCriteria: ["criterion"],
    amountReference: 99.7,
  };

  const request = buildGenLayerCreateCaseRequest(input);
  assert.equal(request.args[4], "100");
});
