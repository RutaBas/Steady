import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeChips, addChip, customInsights, safeUrl, parseBackupJoy, pickJoy,
  serializeBackup, parseBackup, parseBackupSettings, blank,
} from "../js/logic.js";

test("normalizeChips drops junk, trims, dedupes (case-insensitive), caps at 8", () => {
  assert.deepEqual(normalizeChips(null), []);
  const c = normalizeChips([{ label: " played guitar ", since: "2026-09-01" }, { label: "Played Guitar", since: "2026-09-02" },
    { label: "" }, "x", { label: "y".repeat(50), since: "2026-09-01" }, { label: "no date" }]);
  assert.deepEqual(c.map(x => x.label), ["played guitar", "y".repeat(40), "no date"]);
  assert.equal(c[2].since, "1970-01-01");
  assert.equal(normalizeChips(Array.from({ length: 12 }, (_, i) => ({ label: "c" + i, since: "2026-09-01" }))).length, 8);
});

test("addChip validates and appends with today's date", () => {
  const r = addChip([], "  called Mom ", "2026-09-29");
  assert.deepEqual(r, { chips: [{ label: "called Mom", since: "2026-09-29" }] });
  assert.equal(addChip(r.chips, "CALLED MOM", "2026-09-29").error, "You already have that one.");
  assert.equal(addChip([], "   ", "2026-09-29").error, "Type what you did first.");
  assert.equal(addChip([], "moved my body", "2026-09-29").error, "You already have that one.");
  const eight = Array.from({ length: 8 }, (_, i) => ({ label: "c" + i, since: "2026-09-01" }));
  assert.equal(addChip(eight, "more", "2026-09-29").error, "You can have up to 8 of your own.");
  assert.equal(addChip([], "z".repeat(41), "2026-09-29").error, "Keep it under 40 characters.");
});

const m = (date, mood, custom) => ({ id: date, date, mood, custom });

test("customInsights uses only days since the chip was added, >=3 per group", () => {
  const chips = [{ label: "played guitar", since: "2026-09-10" }];
  const mood = [
    m("2026-09-01", 1), m("2026-09-02", 1), m("2026-09-03", 1), // before chip existed: ignored
    m("2026-09-10", 8, ["played guitar"]), m("2026-09-11", 7, ["Played guitar"]), m("2026-09-12", 9, ["played guitar"]),
    m("2026-09-13", 4, []), m("2026-09-14", 5), m("2026-09-15", 3, ["other"]),
  ];
  const [r] = customInsights(mood, chips);
  assert.equal(r.label, "played guitar");
  assert.equal(r.withAvg, 8);
  assert.equal(r.withoutAvg, 4);
  assert.equal(r.diff, 4);
  assert.deepEqual(customInsights(mood.slice(0, 8), chips), []);
});

test("safeUrl: http(s) only, adds https to bare domains", () => {
  assert.equal(safeUrl("https://example.com/a?b=1"), "https://example.com/a?b=1");
  assert.equal(safeUrl(" youtube.com/watch?v=x "), "https://youtube.com/watch?v=x");
  assert.equal(safeUrl("http://x.org"), "http://x.org/");
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("data:text/html,hi"), null);
  assert.equal(safeUrl("not a url"), null);
  assert.equal(safeUrl(""), null);
});

const JPEG = "data:image/jpeg;base64,/9j/4AAQ";

test("parseBackupJoy sanitizes items; null when the backup has no jar", () => {
  const text = JSON.stringify({ app: "steady", v: 1, data: blank(), joy: [
    { id: "a", type: "photo", title: "Beach", text: "", created: "2026-09-01T10:00:00.000Z", photo: JPEG },
    { id: "b", type: "link", title: "Song", url: "javascript:alert(1)", created: "2026-09-01T10:00:00.000Z" },
    { id: "c", type: "link", title: "Song", url: "open.spotify.com/track/1", created: "2026-09-01T10:00:00.000Z" },
    { id: "d", type: "photo", title: "bad", photo: "data:text/html;base64,AAAA" },
    { id: "e", type: "video", title: "?" },
    { id: "f", type: "note", title: "Kind words", text: "x".repeat(6000) },
  ] });
  const j = parseBackupJoy(text);
  assert.deepEqual(j.map(x => x.id), ["a", "c", "f"]);
  assert.equal(j[1].url, "https://open.spotify.com/track/1");
  assert.equal(j[2].text.length, 5000);
  assert.ok(j[2].created);
  assert.equal(parseBackupJoy(JSON.stringify({ app: "steady", v: 1, data: blank() })), null);
  assert.deepEqual(parseBackupJoy(JSON.stringify({ app: "steady", v: 1, data: blank(), joy: [] })), []);
  assert.equal(parseBackupJoy("nope"), null);
});

test("serializeBackup carries chips and jar; entries round-trip unchanged", () => {
  const s = { ...blank(), mood: [m("2026-09-29", 5, ["called Mom"])] };
  const chips = [{ label: "called Mom", since: "2026-09-29" }];
  const joy = [{ id: "n1", type: "note", title: "Hi", text: "You did great", url: "", created: "2026-09-29T10:00:00.000Z" }];
  const text = serializeBackup(s, new Date("2026-09-29T10:00:00Z"), { chips }, joy);
  assert.deepEqual(parseBackup(text), s);
  assert.deepEqual(parseBackupSettings(text), { chips });
  assert.deepEqual(parseBackupJoy(text), joy);
  assert.equal(JSON.parse(serializeBackup(s)).joy, undefined);
});

test("pickJoy avoids repeating the previous item when possible", () => {
  const items = [{ id: "a" }, { id: "b" }];
  assert.equal(pickJoy([], null, () => 0), null);
  assert.equal(pickJoy([{ id: "a" }], "a", () => 0).id, "a");
  assert.equal(pickJoy(items, "a", () => 0).id, "b");
  assert.equal(pickJoy(items, "b", () => 0.99).id, "a");
});
