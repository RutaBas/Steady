import { test } from "node:test";
import assert from "node:assert/strict";
import { makeBreak, stillHeavy } from "../js/logic.js";

test("makeBreak: null when both empty; trims and caps at 500", () => {
  assert.equal(makeBreak("", "  ", "2026-09-29"), null);
  assert.equal(makeBreak(undefined, null, "2026-09-29"), null);
  const b = makeBreak("  work stress ", "", "2026-09-29");
  assert.equal(b.hard, "work stress");
  assert.equal(b.words, "");
  assert.equal(b.date, "2026-09-29");
  assert.ok(b.id);
  assert.equal(makeBreak("", "k".repeat(600), "2026-09-29").words.length, 500);
});

test("stillHeavy: balanced thought written and emotion dropped by less than 10", () => {
  assert.equal(stillHeavy({ balanced: "fairer view", emoInt: 70, emoNow: 65 }), true);
  assert.equal(stillHeavy({ balanced: "fairer view", emoInt: 70, emoNow: 60 }), false);
  assert.equal(stillHeavy({ balanced: "", emoInt: 70, emoNow: 70 }), false);
  assert.equal(stillHeavy({ balanced: "x", emoInt: 40, emoNow: 50 }), true); // got worse
});
