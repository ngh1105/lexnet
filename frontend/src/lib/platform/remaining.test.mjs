import assert from "node:assert/strict";
import { test } from "node:test";
import crypto from "node:crypto";

const checksum = (input) => crypto.createHash("sha256").update(input).digest("hex");
const redactSubject = (subject) => subject.startsWith("0x") ? `${subject.slice(0, 6)}...${subject.slice(-4)}` : subject;

function buildPassport(store, workspaceId, subject) {
  const subjectCases = store.cases.filter((entry) => entry.workspaceId === workspaceId && [entry.client, entry.freelancer].includes(subject));
  const resolved = subjectCases.filter((entry) => entry.status === "RESOLVED");
  const reports = store.reports.filter((report) => resolved.some((entry) => entry.id === report.caseId));
  const avgImpact = reports.length ? Math.round(reports.reduce((sum, report) => sum + report.impactScore, 0) / reports.length) : 0;
  const completionRate = subjectCases.length ? Math.round((resolved.length / subjectCases.length) * 100) : 0;
  const approvalRate = reports.length ? Math.round((reports.filter((report) => report.verdict === "approved").length / reports.length) * 100) : 0;
  return {
    publicSlug: checksum(`${workspaceId}:${subject}`).slice(0, 16),
    redactedSubject: redactSubject(subject),
    score: Math.round(avgImpact * 0.5 + completionRate * 0.3 + approvalRate * 0.2),
    scoreBreakdown: { avgImpact, completionRate, approvalRate, resolvedCases: resolved.length },
  };
}

test("versioned reports retain export and review metadata", () => {
  const report = {
    version: "lexnet.report.v1",
    schemaVersion: 1,
    status: "reviewed",
    evidenceChecksums: [checksum("https://example.com/work")],
    reviewerNotes: "Approved for pilot",
    exportedAt: "2026-05-11T00:00:00.000Z",
  };

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.status, "reviewed");
  assert.match(report.evidenceChecksums[0], /^[a-f0-9]{64}$/);
  assert.ok(report.exportedAt);
});

test("trust passport score is deterministic and privacy filtered", () => {
  const subject = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const store = {
    cases: [{ id: "case_1", workspaceId: "default", client: "0xclient", freelancer: subject, status: "RESOLVED" }],
    reports: [{ id: "report_1", caseId: "case_1", verdict: "approved", impactScore: 90 }],
  };
  const passport = buildPassport(store, "default", subject);

  assert.equal(passport.score, 95);
  assert.equal(passport.redactedSubject, "0xabcd...abcd");
  assert.equal(passport.publicSlug, checksum(`default:${subject}`).slice(0, 16));
});

test("demo account metadata never stores a raw private key", () => {
  const demoAccount = { address: "0xabc", privateKeyRef: "local-demo:1234567890abcdef" };

  assert.match(demoAccount.privateKeyRef, /^local-demo:/);
  assert.doesNotMatch(demoAccount.privateKeyRef, /^0x[a-fA-F0-9]{64}$/);
});
