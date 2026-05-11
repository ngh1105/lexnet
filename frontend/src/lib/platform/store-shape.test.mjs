import assert from "node:assert/strict";
import { test } from "node:test";

import { migrateStore } from "./store.ts";

const requiredCollections = [
  "workspaces",
  "users",
  "cases",
  "evidence",
  "reports",
  "auditEvents",
  "passports",
  "memberships",
  "invitations",
  "assignments",
  "queue",
  "demoAccounts",
  "analyticsEvents",
  "backups",
];

test("migrated stores expose every platform collection", () => {
  const migrated = migrateStore({ cases: [{ id: "case_1" }] });

  for (const key of requiredCollections) {
    assert.ok(Array.isArray(migrated[key]), `${key} should be an array`);
  }

  assert.deepEqual(migrated.security, {
    rateLimits: [],
    incidents: [],
    envValidatedAt: "",
    lastBackupAt: "",
  });
});

test("demo accounts only persist references, never raw private keys", () => {
  const migrated = migrateStore({
    demoAccounts: [{ id: "acct_1", address: "0xabc", privateKey: "0xsecret", privateKeyRef: "local-demo:abcdef1234567890" }],
  });

  assert.equal(migrated.demoAccounts[0].privateKey, undefined);
  assert.match(migrated.demoAccounts[0].privateKeyRef, /^local-demo:[a-f0-9]{16}$/);
});

test("partial security state keeps default fields", () => {
  const migrated = migrateStore({
    security: {
      incidents: [{ id: "inc_1", severity: "low", title: "Demo incident", status: "open", createdAt: "2026-05-11T00:00:00.000Z" }],
    },
  });

  assert.deepEqual(migrated.security.rateLimits, []);
  assert.equal(migrated.security.envValidatedAt, "");
  assert.equal(migrated.security.lastBackupAt, "");
  assert.equal(migrated.security.incidents.length, 1);
});

test("malformed security and demo account entries fall back safely", () => {
  const migrated = migrateStore({
    security: {
      rateLimits: null,
      incidents: {},
      envValidatedAt: 123,
      lastBackupAt: false,
    },
    demoAccounts: [null, 42, { id: "acct_2", address: "0xdef", privateKey: "0xsecret", privateKeyRef: "local-demo:1234567890abcdef" }],
  });

  assert.deepEqual(migrated.security.rateLimits, []);
  assert.deepEqual(migrated.security.incidents, []);
  assert.equal(migrated.security.envValidatedAt, "");
  assert.equal(migrated.security.lastBackupAt, "");
  assert.equal(migrated.demoAccounts.length, 1);
  assert.equal(migrated.demoAccounts[0].privateKey, undefined);
  assert.equal(migrated.demoAccounts[0].privateKeyRef, "local-demo:1234567890abcdef");
});
