import assert from "node:assert/strict";
import { test } from "node:test";

const ROLE_HIERARCHY = { admin: 4, operator: 3, reviewer: 2, viewer: 1 };

function hasPermission(userRole, requiredRole) {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

test("admin has all permissions", () => {
  assert.equal(hasPermission("admin", "admin"), true);
  assert.equal(hasPermission("admin", "operator"), true);
  assert.equal(hasPermission("admin", "reviewer"), true);
  assert.equal(hasPermission("admin", "viewer"), true);
});

test("operator can do operator and below but not admin", () => {
  assert.equal(hasPermission("operator", "admin"), false);
  assert.equal(hasPermission("operator", "operator"), true);
  assert.equal(hasPermission("operator", "reviewer"), true);
  assert.equal(hasPermission("operator", "viewer"), true);
});

test("reviewer can review and view but not operate or admin", () => {
  assert.equal(hasPermission("reviewer", "admin"), false);
  assert.equal(hasPermission("reviewer", "operator"), false);
  assert.equal(hasPermission("reviewer", "reviewer"), true);
  assert.equal(hasPermission("reviewer", "viewer"), true);
});

test("viewer can only view", () => {
  assert.equal(hasPermission("viewer", "admin"), false);
  assert.equal(hasPermission("viewer", "operator"), false);
  assert.equal(hasPermission("viewer", "reviewer"), false);
  assert.equal(hasPermission("viewer", "viewer"), true);
});

test("role hierarchy values are distinct and ordered", () => {
  const values = Object.values(ROLE_HIERARCHY);
  assert.deepEqual(values, [4, 3, 2, 1]);
});
