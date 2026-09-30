import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KEYS, blank, normalizeState, parseBackup, countEntries, BLOCKS, ANY_TIME, LIFE_AREAS,
  addPlanned, plannedFor, upcomingPlanned, plannedNudge, prunePlanned, missedLabel, areaCounts, predictionInsight,
} from "../js/logic.js";

const T = "2026-09-29"; // a Tuesday
const pl = (what, date, block = ANY_TIME, extra = {}) => ({ id: what, what, date, block, created: "2026-09-01T00:00:00Z", ...extra });
const act = (date, extra = {}) => ({ id: Math.random().toString(36), date, block: BLOCKS[0], what: "x", p: 5, m: 5, ...extra });

test("new keys are part of saved state; old backups load them as []", () => {
  for (const k of ["planned", "good", "kind"]) {
    assert.ok(KEYS.includes(k));
    assert.deepEqual(blank()[k], []);
    assert.deepEqual(normalizeState({ mood: [] })[k], []);
  }
  const old = parseBackup(JSON.stringify({ app: "steady", v: 1, data: { mood: [], thoughts: [] } }));
  assert.deepEqual(old.planned, []);
  assert.throws(() => parseBackup(JSON.stringify({ mood: [], thoughts: [], planned: "x" })));
  assert.equal(countEntries({ ...blank(), planned: [pl("a", T)], good: [{}], kind: [{}] }), 3);
});

test("addPlanned validates, trims and keeps only valid optional fields", () => {
  const r = addPlanned([], { what: "  Short walk ", date: T, block: "4–6 pm", area: "Health & body", expect: 3 }, T);
  assert.equal(r.planned.length, 1);
  const p = r.planned[0];
  assert.equal(p.what, "Short walk");
  assert.equal(p.block, "4–6 pm");
  assert.equal(p.area, "Health & body");
  assert.equal(p.expect, 3);
  assert.ok(p.id && p.created);
  const bare = addPlanned([], { what: "x", date: T, block: "nonsense", area: "Nope", expect: 11 }, T).planned[0];
  assert.equal(bare.block, ANY_TIME);
  assert.equal("area" in bare, false);
  assert.equal("expect" in bare, false);
  assert.equal(addPlanned([], { what: "x", date: T, expect: 0 }, T).planned[0].expect, 0);
  assert.equal(addPlanned([], { what: " ", date: T }, T).error, "Write what you'll do first.");
  assert.equal(addPlanned([], { what: "x", date: "" }, T).error, "Pick a day.");
  assert.equal(addPlanned([], { what: "x", date: "2026-09-28" }, T).error, "Pick today or a later day.");
  assert.equal(addPlanned([], { what: "x".repeat(100), date: T }, T).planned[0].what.length, 80);
});

test("plannedFor: only that day, Any time first, then block order", () => {
  const list = [pl("late", T, "8–10 pm"), pl("other day", "2026-09-30"), pl("any", T), pl("early", T, "8–10 am")];
  assert.deepEqual(plannedFor(list, T).map(p => p.what), ["any", "early", "late"]);
});

test("upcomingPlanned: today and later, by date then block", () => {
  const list = [pl("tomorrow", "2026-09-30"), pl("past", "2026-09-28"), pl("today late", T, "8–10 pm"), pl("today any", T)];
  assert.deepEqual(upcomingPlanned(list, T).map(p => p.what), ["today any", "today late", "tomorrow"]);
});

test("plannedNudge: most recent plan from the last 3 days, never today", () => {
  assert.equal(plannedNudge([], T), null);
  assert.equal(plannedNudge([pl("today", T)], T), null);
  assert.equal(plannedNudge([pl("four", "2026-09-25")], T), null);
  assert.equal(plannedNudge([pl("three", "2026-09-26")], T).what, "three");
  assert.equal(plannedNudge([pl("three", "2026-09-26"), pl("one", "2026-09-28")], T).what, "one");
});

test("prunePlanned keeps 3 days back and drops older", () => {
  const list = [pl("four", "2026-09-25"), pl("three", "2026-09-26"), pl("future", "2026-10-02")];
  assert.deepEqual(prunePlanned(list, T).map(p => p.what), ["three", "future"]);
});

test("missedLabel", () => {
  assert.equal(missedLabel("2026-09-28", T, "en-US"), "Yesterday's plan");
  assert.equal(missedLabel("2026-09-27", T, "en-US"), "Sunday's plan");
});

test("areaCounts: last 7 days, areas with activities only, most first", () => {
  const acts = [
    act(T, { area: "Relationships" }),
    act("2026-09-23", { area: "Health & body" }), // 6 days ago: included
    act("2026-09-24", { area: "Health & body" }),
    act("2026-09-22", { area: "Relationships" }), // 7 days ago: excluded
    act(T), // no area
    act(T, { area: "Not an area" }),
  ];
  assert.deepEqual(areaCounts(acts, T), [{ area: "Health & body", n: 2 }, { area: "Relationships", n: 1 }]);
  assert.deepEqual(areaCounts([], T), []);
  assert.deepEqual(LIFE_AREAS.length, 5);
});

test("predictionInsight: needs 3 predictions and more than half better; ties are not better", () => {
  const e = (p, expect) => act(T, { p, expect });
  assert.equal(predictionInsight([e(6, 3), e(7, 2)]), null);
  assert.deepEqual(predictionInsight([e(6, 3), e(7, 2), e(1, 5), e(8, 1), e(2, 4)]), { better: 3, total: 5 });
  assert.equal(predictionInsight([e(6, 3), e(7, 2), e(1, 5), e(2, 4)]), null); // 2 of 4
  assert.equal(predictionInsight([e(5, 5), e(5, 5), e(6, 5)]), null); // 1 of 3
  assert.equal(predictionInsight([act(T), act(T), act(T)]), null); // no predictions
});
