import assert from "node:assert/strict";
import { test } from "node:test";
import crypto from "node:crypto";

const checksum = (input) => crypto.createHash("sha256").update(input).digest("hex");

function normalizeEvidenceUrl(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed.toString();
}

function addEvidence(store, caseId, body) {
  if (!body?.url || !body?.submittedBy) {
    return { status: 400, error: "url and submittedBy are required" };
  }

  let normalizedUrl;
  try {
    normalizedUrl = normalizeEvidenceUrl(body.url);
  } catch {
    return { status: 400, error: "Evidence URL must be a valid absolute URL" };
  }

  const item = store.cases.find((entry) => entry.id === caseId);
  if (!item) return { status: 404, error: "Case not found" };

  const existing = store.evidence.find((entry) => entry.caseId === caseId && entry.normalizedUrl === normalizedUrl);
  if (existing) return { status: 200, evidence: existing, deduped: true };

  const evidence = {
    id: `ev_${store.evidence.length + 1}`,
    caseId,
    workspaceId: item.workspaceId,
    submittedBy: body.submittedBy.toLowerCase(),
    url: body.url,
    normalizedUrl,
    status: "pending",
    checksum: checksum(normalizedUrl),
    createdAt: "2026-05-11T00:00:00.000Z",
  };

  store.evidence.push(evidence);
  item.submittedWorkUrl = body.url;
  item.status = "WORK_SUBMITTED";
  store.auditEvents.push({
    id: `audit_${store.auditEvents.length + 1}`,
    workspaceId: item.workspaceId,
    caseId,
    actor: evidence.submittedBy,
    action: "evidence.submitted",
    payload: { evidenceId: evidence.id, normalizedUrl },
    createdAt: evidence.createdAt,
  });

  return { status: 201, evidence, deduped: false };
}

function createStore() {
  return {
    cases: [{ id: "case_1", workspaceId: "default", submittedWorkUrl: "", status: "FUNDED" }],
    evidence: [],
    auditEvents: [],
  };
}

test("normalizes evidence URLs before checksum and dedupe", () => {
  const normalized = normalizeEvidenceUrl("HTTPS://Example.COM/path/#section");

  assert.equal(normalized, "https://example.com/path");
  assert.equal(checksum(normalized), "5faa4bf4918ff56562141cc328545ec8f7b6dd27470cbdf4a7487593b3e83738");
});

test("dedupes evidence by case and normalized URL", () => {
  const store = createStore();
  const first = addEvidence(store, "case_1", { url: "https://Example.com/work/", submittedBy: "0xABC" });
  const second = addEvidence(store, "case_1", { url: "https://example.com/work#readme", submittedBy: "0xDEF" });

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(second.deduped, true);
  assert.equal(store.evidence.length, 1);
  assert.equal(store.auditEvents.length, 1);
});

test("creates evidence and audit event for new submission", () => {
  const store = createStore();
  const result = addEvidence(store, "case_1", { url: "https://github.com/acme/app", submittedBy: "0xFREELANCER" });

  assert.equal(result.status, 201);
  assert.equal(result.evidence.submittedBy, "0xfreelancer");
  assert.equal(result.evidence.checksum, checksum("https://github.com/acme/app"));
  assert.equal(store.cases[0].status, "WORK_SUBMITTED");
  assert.deepEqual(store.auditEvents[0].payload, {
    evidenceId: result.evidence.id,
    normalizedUrl: "https://github.com/acme/app",
  });
});
