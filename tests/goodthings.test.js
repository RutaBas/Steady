import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGoodSettings, weekKey, showGoodCard, saveGoodWeek } from "../js/logic.js";

test("normalizeGoodSettings", () => {
  assert.deepEqual(normalizeGoodSettings(undefined), { on: true, day: 0 });
  assert.deepEqual(normalizeGoodSettings({ on: false, day: 3 }), { on: false, day: 3 });
  assert.deepEqual(normalizeGoodSettings({ day: 9 }), { on: true, day: 0 });
  assert.deepEqual(normalizeGoodSettings({ day: "2" }), { on: true, day: 2 });
});

test("weekKey: most recent reminder day on or before today", () => {
  // 2026-09-29 is a Tuesday
  assert.equal(weekKey("2026-09-29", 0), "2026-09-27"); // Sunday before
  assert.equal(weekKey("2026-09-29", 2), "2026-09-29"); // today is the reminder day
  assert.equal(weekKey("2026-09-29", 3), "2026-09-23"); // Wednesday of last week
  assert.equal(weekKey("2026-10-01", 0), "2026-09-27"); // across a month
  assert.equal(weekKey("2027-01-02", 0), "2026-12-27"); // across a year
});

test("showGoodCard: 3-day window, not dismissed, not already saved, reminder on", () => {
  const on = { on: true, day: 0 };
  assert.equal(showGoodCard("2026-09-27", on, [], null), true);  // Sunday
  assert.equal(showGoodCard("2026-09-29", on, [], null), true);  // Tuesday, day 3 of the window
  assert.equal(showGoodCard("2026-09-30", on, [], null), false); // Wednesday
  assert.equal(showGoodCard("2026-09-28", on, [], "2026-09-27"), false);
  assert.equal(showGoodCard("2026-09-28", on, [], "2026-09-20"), true); // last week's dismissal
  assert.equal(showGoodCard("2026-09-28", on, [{ week: "2026-09-27" }], null), false);
  assert.equal(showGoodCard("2026-09-28", { on: false, day: 0 }, [], null), false);
});

test("saveGoodWeek trims, drops empty rows, needs one thing, replaces the week", () => {
  const r = saveGoodWeek([], "2026-09-27", [{ text: " Coffee ", why: " I slowed down " }, { text: "", why: "orphan" }, { text: "Call", why: "" }]);
  assert.equal(r.good.length, 1);
  assert.deepEqual(r.good[0].items, [{ text: "Coffee", why: "I slowed down" }, { text: "Call", why: "" }]);
  assert.equal(r.good[0].week, "2026-09-27");
  assert.ok(r.good[0].id && r.good[0].created);
  assert.equal(saveGoodWeek([], "2026-09-27", [{ text: " " }, {}, { text: "" }]).error, "Write at least one good thing.");
  const again = saveGoodWeek(r.good, "2026-09-27", [{ text: "Walk", why: "" }]);
  assert.equal(again.good.length, 1);
  assert.equal(again.good[0].id, r.good[0].id);
  assert.deepEqual(again.good[0].items, [{ text: "Walk", why: "" }]);
  const two = saveGoodWeek(r.good, "2026-10-04", [{ text: "Later" }]);
  assert.deepEqual(two.good.map(e => e.week), ["2026-10-04", "2026-09-27"]);
  assert.equal(saveGoodWeek([], "2026-09-27", [{ text: "x".repeat(300), why: "y".repeat(300) }]).good[0].items[0].text.length, 200);
  assert.equal(saveGoodWeek([], "2026-09-27", [{ text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }]).good[0].items.length, 3);
});
