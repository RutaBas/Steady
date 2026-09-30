import { test } from "node:test";
import assert from "node:assert/strict";
import { daysUntil, untilLabel, splitPlans, planNudge, addPlan, blank, normalizeState, countEntries } from "../js/logic.js";

const P = (name, date, extra = {}) => ({ id: name, name, date, created: "2026-09-01T00:00:00Z", ...extra });

test("daysUntil counts calendar days, across months and DST", () => {
  assert.equal(daysUntil("2026-09-29", "2026-09-29"), 0);
  assert.equal(daysUntil("2026-09-30", "2026-09-29"), 1);
  assert.equal(daysUntil("2026-10-03", "2026-09-29"), 4);
  assert.equal(daysUntil("2026-09-28", "2026-09-29"), -1);
  assert.equal(daysUntil("2026-11-02", "2026-10-31"), 2); // US DST ends Nov 1
  assert.equal(daysUntil("2027-03-15", "2027-03-13"), 2); // US DST starts Mar 14
});

test("untilLabel", () => {
  assert.equal(untilLabel(0), "Today!");
  assert.equal(untilLabel(1), "Tomorrow");
  assert.equal(untilLabel(5), "in 5 days");
});

test("splitPlans: today is upcoming; upcoming ascending, past descending", () => {
  const plans = [P("b", "2026-10-05"), P("past1", "2026-09-20"), P("now", "2026-09-29"), P("past2", "2026-09-27"), P("a", "2026-10-01")];
  const { upcoming, past } = splitPlans(plans, "2026-09-29");
  assert.deepEqual(upcoming.map(p => p.name), ["now", "a", "b"]);
  assert.deepEqual(past.map(p => p.name), ["past2", "past1"]);
  assert.deepEqual(splitPlans([], "2026-09-29"), { upcoming: [], past: [] });
});

test("planNudge: most recent past item within 7 days that isn't done", () => {
  const t = "2026-09-29";
  assert.equal(planNudge([], t), null);
  assert.equal(planNudge([P("future", "2026-09-29")], t), null);
  assert.equal(planNudge([P("old", "2026-09-21")], t), null); // 8 days ago
  assert.equal(planNudge([P("wk", "2026-09-22")], t).name, "wk"); // 7 days ago
  assert.equal(planNudge([P("y", "2026-09-28"), P("older", "2026-09-25")], t).name, "y");
  assert.equal(planNudge([P("y", "2026-09-28", { done: true }), P("older", "2026-09-25")], t).name, "older");
});

test("addPlan validates and appends", () => {
  const r = addPlan([], "  Coffee with Mia ", "2026-10-03", "2026-09-29");
  assert.equal(r.plans.length, 1);
  assert.equal(r.plans[0].name, "Coffee with Mia");
  assert.equal(r.plans[0].date, "2026-10-03");
  assert.ok(r.plans[0].id && r.plans[0].created);
  assert.equal(addPlan([], "", "2026-10-03", "2026-09-29").error, "Give it a name first.");
  assert.equal(addPlan([], "x", "", "2026-09-29").error, "Pick a date.");
  assert.equal(addPlan([], "x", "2026-09-28", "2026-09-29").error, "Pick today or a later date.");
  assert.equal(addPlan(r.plans, "coffee with mia", "2026-10-03", "2026-09-29").error, "That's already on your list.");
  assert.equal(addPlan(r.plans, "Coffee with Mia", "2026-10-10", "2026-09-29").plans.length, 2); // same name, other day is fine
  assert.equal(addPlan([], "x".repeat(100), "2026-09-29", "2026-09-29").plans[0].name.length, 80);
});

test("plans are part of saved state; old backups without them load as []", () => {
  assert.deepEqual(blank().plans, []);
  assert.deepEqual(normalizeState({ mood: [] }).plans, []);
  assert.equal(countEntries({ ...blank(), plans: [P("a", "2026-10-01")] }), 1);
});
