import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SUPPORT, normalizeSupport, shouldPromptLowDay, fillMessage, smsLink, weekSummary,
  serializeBackup, parseBackup, parseBackupSettings, blank,
} from "../js/logic.js";

const sup = (o = {}) => normalizeSupport({ name: "Ana", phone: "+1 (555) 123-4567", ...o });

test("normalizeSupport fills defaults and sanitizes", () => {
  assert.deepEqual(normalizeSupport(null), DEFAULT_SUPPORT);
  assert.deepEqual(normalizeSupport("junk"), DEFAULT_SUPPORT);
  const s = normalizeSupport({ name: "  Ana  ", phone: " +1 555 ", threshold: 9, prompt: "yes", message: "   " });
  assert.equal(s.name, "Ana");
  assert.equal(s.phone, "+1 555");
  assert.equal(s.threshold, 4);
  assert.equal(s.prompt, true);
  assert.equal(s.message, DEFAULT_SUPPORT.message);
  assert.equal(normalizeSupport({ threshold: 0 }).threshold, 2);
  assert.equal(normalizeSupport({ threshold: "3" }).threshold, 3);
  assert.equal(normalizeSupport({ prompt: false }).prompt, false);
  assert.equal(normalizeSupport({ name: "x".repeat(200) }).name.length, 60);
});

test("shouldPromptLowDay: today, at/below threshold, enabled, named, not already today", () => {
  const e = { date: "2026-09-29", mood: 3 };
  assert.equal(shouldPromptLowDay(e, sup(), null, "2026-09-29"), true);
  assert.equal(shouldPromptLowDay({ ...e, mood: 4 }, sup(), null, "2026-09-29"), false);
  assert.equal(shouldPromptLowDay({ ...e, mood: 4 }, sup({ threshold: 4 }), null, "2026-09-29"), true);
  assert.equal(shouldPromptLowDay({ ...e, date: "2026-09-28" }, sup(), null, "2026-09-29"), false);
  assert.equal(shouldPromptLowDay(e, sup({ prompt: false }), null, "2026-09-29"), false);
  assert.equal(shouldPromptLowDay(e, sup({ name: "" }), null, "2026-09-29"), false);
  assert.equal(shouldPromptLowDay(e, sup(), "2026-09-29", "2026-09-29"), false);
  assert.equal(shouldPromptLowDay(e, sup(), "2026-09-28", "2026-09-29"), true);
});

test("fillMessage replaces every {mood}", () => {
  assert.equal(fillMessage("Mood {mood}/10, yes {mood}", 3), "Mood 3/10, yes 3");
  assert.equal(fillMessage("", 3), fillMessage(DEFAULT_SUPPORT.message, 3));
  assert.match(fillMessage(DEFAULT_SUPPORT.message, 2), /mood 2\/10/);
});

test("smsLink keeps + and digits, encodes body, null without a number", () => {
  assert.equal(smsLink("+1 (555) 123-4567", "Hi & bye?"), "sms:+15551234567&body=Hi%20%26%20bye%3F");
  assert.equal(smsLink("", "x"), null);
  assert.equal(smsLink("call me", "x"), null);
  assert.equal(smsLink("0044 20 1234", "x"), "sms:0044201234&body=x");
});

const m = (date, mood) => ({ id: date, date, mood });

test("weekSummary: bars, missed days, average, count, lowest", () => {
  const mood = [m("2026-09-23", 5), m("2026-09-24", 4), m("2026-09-25", 3), m("2026-09-26", 4), m("2026-09-27", 6), m("2026-09-29", 5), m("2026-09-15", 1)];
  const s = weekSummary(mood, "2026-09-29", "en-US");
  assert.deepEqual(s.split("\n"), [
    "My week in Steady (Sep 23–29)",
    "▄▃▃▃▅_▄  avg 4.5 · 6 of 7 days checked in",
    "Daily: 5 4 3 4 6 – 5",
    "Lowest: 3 (Fri)",
    "Mood 1–10 · _ or – = no check-in",
  ]);
});

test("weekSummary: bar extremes, month boundary, single check-in, empty", () => {
  const s = weekSummary([m("2026-10-01", 1), m("2026-10-04", 10)], "2026-10-04", "en-US").split("\n");
  assert.equal(s[0], "My week in Steady (Sep 28–Oct 4)");
  assert.equal(s[1], "___▁__█  avg 5.5 · 2 of 7 days checked in");
  assert.equal(s[2], "Daily: – – – 1 – – 10");
  assert.equal(s[3], "Lowest: 1 (Thu)");
  assert.match(weekSummary([m("2026-09-29", 7)], "2026-09-29", "en-US"), /1 of 7 days checked in/);
  assert.equal(weekSummary([m("2026-09-01", 5)], "2026-09-29", "en-US"), null);
  assert.equal(weekSummary([], "2026-09-29", "en-US"), null);
});

test("backup carries optional support settings", () => {
  const s = { ...blank(), mood: [m("2026-09-29", 5)] };
  const withSettings = serializeBackup(s, new Date("2026-09-29T10:00:00Z"), { support: sup() });
  assert.deepEqual(parseBackup(withSettings), s);
  assert.deepEqual(parseBackupSettings(withSettings), { support: sup() });
  const without = serializeBackup(s, new Date("2026-09-29T10:00:00Z"));
  assert.equal(JSON.parse(without).settings, undefined);
  assert.equal(parseBackupSettings(without), null);
  assert.equal(parseBackupSettings(JSON.stringify(s)), null);
  assert.deepEqual(parseBackupSettings(JSON.stringify({ app: "steady", v: 1, data: s, settings: { support: { name: "Bo", threshold: 12 } } })).support.threshold, 4);
});
