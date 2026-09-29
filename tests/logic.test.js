import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blank, normalizeState, serializeBackup, parseBackup,
  activityInsights, sleepInsight, topActivities, parseHealthClipboard, daysSince, iso,
} from "../js/logic.js";

const m = (date, mood, extra = {}) => ({ id: date, date, mood, sleep: null, outside: null, moved: false, talked: false, enjoyed: false, note: "", ...extra });

test("blank has the four arrays", () => {
  assert.deepEqual(blank(), { mood: [], thoughts: [], triangles: [], activities: [] });
});

test("normalizeState fills missing arrays and drops non-array keys", () => {
  const s = normalizeState({ mood: [m("2026-01-01", 5)], thoughts: [], junk: 1, triangles: "x" });
  assert.deepEqual(Object.keys(s).sort(), ["activities", "mood", "thoughts", "triangles"]);
  assert.equal(s.mood.length, 1);
  assert.deepEqual(s.triangles, []);
  assert.throws(() => normalizeState(null));
});

test("backup round-trip preserves data", () => {
  const s = { ...blank(), mood: [m("2026-09-01", 6, { note: "ok" })], activities: [{ id: "a", date: "2026-09-01", block: "6–8 am", what: "walk", p: 7, m: 4 }] };
  const text = serializeBackup(s, new Date("2026-09-29T10:00:00Z"));
  const o = JSON.parse(text);
  assert.equal(o.app, "steady");
  assert.equal(o.v, 1);
  assert.equal(o.saved, "2026-09-29T10:00:00.000Z");
  assert.deepEqual(parseBackup(text), s);
});

test("parseBackup accepts a bare state (prototype paste)", () => {
  const s = { ...blank(), thoughts: [{ id: "t" }] };
  assert.deepEqual(parseBackup(JSON.stringify(s)), s);
});

test("parseBackup rejects malformed input", () => {
  assert.throws(() => parseBackup("not json"));
  assert.throws(() => parseBackup("{}"));
  assert.throws(() => parseBackup(JSON.stringify({ mood: [], thoughts: {} })));
  assert.throws(() => parseBackup(JSON.stringify({ mood: [], thoughts: [], triangles: 3 })));
  assert.throws(() => parseBackup("null"));
});

test("activityInsights needs >=3 days in each group", () => {
  const two = [m("d1", 7, { moved: true }), m("d2", 7, { moved: true }), m("d3", 3), m("d4", 3), m("d5", 3)];
  assert.equal(activityInsights(two).length, 0);
  const three = [...two, m("d6", 7, { moved: true })];
  const ins = activityInsights(three);
  assert.equal(ins.length, 1);
  assert.equal(ins[0].key, "moved");
  assert.equal(ins[0].withAvg, 7);
  assert.equal(ins[0].withoutAvg, 3);
  assert.equal(ins[0].diff, 4);
});

test("sleepInsight ignores entries without sleep and needs >=3 per group", () => {
  const base = [m("a", 7, { sleep: 8 }), m("b", 6, { sleep: 7 }), m("c", 5, { sleep: 9 }), m("d", 4, { sleep: 5 }), m("e", 3, { sleep: 6.5 }), m("f", 9)];
  assert.equal(sleepInsight(base), null);
  const full = [...base, m("g", 2, { sleep: 4 })];
  const r = sleepInsight(full);
  assert.equal(r.withAvg, 6);
  assert.equal(r.withoutAvg, 3);
  assert.equal(r.diff, 3);
});

test("topActivities: 7-day window, case-insensitive, ranked, max n", () => {
  const acts = [
    { date: "2026-09-29", what: "Walk", p: 8, m: 6 },
    { date: "2026-09-25", what: "walk", p: 6, m: 6 },
    { date: "2026-09-23", what: "Read", p: 9, m: 9 },
    { date: "2026-09-22", what: "Old", p: 10, m: 10 },
    { date: "2026-09-28", what: "Dishes", p: 1, m: 7 },
  ];
  const top = topActivities(acts, "2026-09-29");
  assert.deepEqual(top.map(t => t.name), ["Read", "Walk", "Dishes"]);
  assert.equal(top[1].n, 2);
  assert.equal(top[1].score, 13);
  const many = Array.from({ length: 8 }, (_, i) => ({ date: "2026-09-29", what: "x" + i, p: i, m: 0 }));
  assert.equal(topActivities(many, "2026-09-29").length, 5);
});

test("parseHealthClipboard", () => {
  assert.deepEqual(parseHealthClipboard("steady-sleep:2026-09-28:7.2"), { date: "2026-09-28", hours: 7.2 });
  assert.deepEqual(parseHealthClipboard("  steady-sleep: 2026-09-28 : 6,5 \n"), { date: "2026-09-28", hours: 6.5 });
  assert.deepEqual(parseHealthClipboard("steady-sleep:2026-09-28:7.26"), { date: "2026-09-28", hours: 7.3 });
  assert.equal(parseHealthClipboard("sleep:2026-09-28:7"), null);
  assert.equal(parseHealthClipboard("steady-sleep:2026-09-28:25"), null);
  assert.equal(parseHealthClipboard("steady-sleep:2026-13-40:7"), null);
  assert.equal(parseHealthClipboard(""), null);
  assert.equal(parseHealthClipboard(null), null);
});

test("daysSince and iso", () => {
  assert.equal(iso(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(daysSince("2026-09-20T12:00:00.000Z", new Date("2026-09-28T13:00:00.000Z")), 8);
  assert.equal(daysSince(null), null);
});
