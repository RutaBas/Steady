import { test } from "node:test";
import assert from "node:assert/strict";
import { greeting, weekSeries, todayStatus, weekSummary, blank } from "../js/logic.js";

test("greeting by hour", () => {
  assert.equal(greeting(5), "Good morning");
  assert.equal(greeting(11), "Good morning");
  assert.equal(greeting(12), "Good afternoon");
  assert.equal(greeting(16), "Good afternoon");
  assert.equal(greeting(17), "Good evening");
  assert.equal(greeting(21), "Good evening");
  assert.equal(greeting(22), "Hi there. Go gently tonight.");
  assert.equal(greeting(0), "Hi there. Go gently tonight.");
  assert.equal(greeting(4), "Hi there. Go gently tonight.");
});

const m = (date, mood) => ({ id: date, date, mood });

test("weekSeries: 7 days oldest→today with nulls for gaps; ignores outside window", () => {
  const s = weekSeries([m("2026-09-23", 5), m("2026-09-25", 3), m("2026-09-29", 7), m("2026-09-22", 9), m("2026-09-30", 1)], "2026-09-29");
  assert.deepEqual(s.map(d => d.date), ["2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29"]);
  assert.deepEqual(s.map(d => d.mood), [5, null, 3, null, null, null, 7]);
  assert.equal(weekSeries([m("2026-09-01", 5)], "2026-09-29"), null);
});

test("todayStatus", () => {
  const S = { ...blank(), mood: [m("2026-09-29", 6), m("2026-09-28", 4)],
    activities: [{ date: "2026-09-29" }, { date: "2026-09-29" }, { date: "2026-09-28" }] };
  assert.deepEqual(todayStatus(S, "2026-09-29"), { checkedIn: true, mood: 6, activities: 2 });
  assert.deepEqual(todayStatus(blank(), "2026-09-29"), { checkedIn: false, mood: null, activities: 0 });
});

test("weekSummary still matches after refactor onto weekSeries", () => {
  const s = weekSummary([m("2026-09-23", 5), m("2026-09-29", 5)], "2026-09-29", "en-US");
  assert.match(s, /^My week in Steady \(Sep 23–29\)\n▄_____▄  avg 5\.0 · 2 of 7 days checked in/);
});
