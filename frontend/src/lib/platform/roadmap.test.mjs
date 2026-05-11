import assert from "node:assert/strict";
import { test } from "node:test";
import { NEXT_PHASE_ROADMAP } from "./roadmap.ts";

test("roadmap priorities are unique and ordered", () => {
  const priorities = NEXT_PHASE_ROADMAP.map((item) => item.priority);

  assert.deepEqual(priorities, [1, 2, 3]);
  assert.equal(new Set(priorities).size, priorities.length);
});

test("roadmap keeps one next item", () => {
  assert.equal(NEXT_PHASE_ROADMAP.filter((item) => item.status === "next").length, 1);
});

test("roadmap outcomes are concrete", () => {
  for (const item of NEXT_PHASE_ROADMAP) {
    assert.ok(item.outcome.length >= 40, `${item.id} outcome should be descriptive`);
  }
});
