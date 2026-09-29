# Steady PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `steady-prototype.html` to an installable, offline, private PWA, per `docs/superpowers/specs/2026-09-28-steady-pwa-design.md`.

**Architecture:** Static ES-module app with no build step. Pure logic lives in `js/logic.js`, which is unit-tested with `node --test`. DOM code is split per worksheet. IndexedDB holds the whole state object. A cache-first service worker serves the app offline.

**Tech Stack:** HTML, CSS, vanilla JS (ES2022 modules), IndexedDB, Service Worker, Node 24 `node:test` (dev only), Netlify static hosting.

## Global Constraints

- Data shape: `{mood:[], thoughts:[], triangles:[], activities:[]}`, with fields exactly as in the prototype.
- Backup format: `{app:"steady", v:1, saved:<ISO>, data:<state>}`. Restore also accepts a bare state object.
- No network requests for data, no third-party origins, CSP `connect-src 'self'`.
- Copy, palette, fonts and layout come from the prototype. The 988 line is visible on every tab.
- Every delete uses an inline confirmation.
- Health clipboard format: `steady-sleep:YYYY-MM-DD:H.H`.
- Sleep insight threshold: 7 h. Every insight needs ≥3 entries in each group.

---

### Task 1: Pure logic module (TDD)

**Files:** Create `js/logic.js`, `tests/logic.test.js`, `package.json` (`{"type":"module","scripts":{"test":"node --test tests/"}}`)

**Produces:**
- `blank(): State`
- `normalizeState(obj): State`. Merges the object with `blank()`, keeps only array-valued keys, and throws on a non-object.
- `serializeBackup(state, now=new Date()): string`
- `parseBackup(text): State`. Accepts a wrapped or bare state. Throws `Error("invalid")` unless `mood` and `thoughts` are arrays and any present `triangles`/`activities` are arrays.
- `activityInsights(mood): {key,label,diff,withAvg,withoutAvg}[]`
- `sleepInsight(mood, threshold=7): {diff,withAvg,withoutAvg}|null`
- `topActivities(activities, todayIso, n=5)`
- `parseHealthClipboard(text): {date, hours}|null`
- `daysSince(iso, now)`
- Date helpers `iso`, `parseIso`

- [ ] Write tests covering: the ≥3 rule for each insight, sleep null exclusion, top-5 ranking with a 7-day window and case-insensitive grouping, the backup round-trip, malformed backups rejected, Health parse (valid, comma decimal, whitespace, bad prefix, >24, bad date).
- [ ] Run `npm test`. Expect FAIL (module missing).
- [ ] Implement `js/logic.js`.
- [ ] Run `npm test`. Expect PASS.
- [ ] Commit `feat: pure logic module with tests`.

### Task 2: Storage

**Files:** Create `js/store.js`

**Produces:** `loadState(): Promise<State>` (runs the migration from localStorage `steady-notebook-v1` when IndexedDB is empty), `saveState(state): Promise<boolean>`, `getMeta(key)`, `setMeta(key, value)`, `requestPersist()`.

The DB is `steady` v1 with object store `kv`. The key `state` holds the state and the key `meta:<name>` holds meta values.

- [ ] Implement it and verify in the browser (Task 5 smoke test).
- [ ] Commit.

### Task 3: App shell + worksheets port

**Files:** Create `index.html`, `css/app.css`, `js/ui.js`, `js/main.js`, `js/mood.js`, `js/thoughts.js`, `js/triangle.js`, `js/activities.js`

The code is ported from the prototype with these changes: inline `style=` attributes become classes; `save()` becomes async `saveState`; the insight maths comes from `logic.js`; the sleep insight is added; the "Fill from Health" button is added; touch targets are ≥44px; the header gets a safe-area top inset.

Each worksheet module exports `init(ctx)` and `render()`. `ctx = {get state(), set state(v), persist(): Promise<boolean>, toast(msg), renderAll()}`.

- [ ] Port and verify all four tabs in the browser at 390px.
- [ ] Commit.

### Task 4: Backup sheet, Health import, guides

**Files:** Create `js/backup.js`. Modify `index.html` (sheet markup) and `js/mood.js` (Health button).

This covers export via `navigator.share({files})` with a fallback to `<a download>`; import from a file with an inline replace confirmation; copy and paste of backup text; delete all; the last-backup line; the 14-day nudge on the Mood tab; and the collapsible guides for the "Steady sleep" shortcut and the evening automation.

- [ ] Implement it, then do an export → wipe → import round-trip in the browser.
- [ ] Commit.

### Task 5: PWA

**Files:** Create `manifest.webmanifest`, `sw.js`, `icons/*`, `fonts/*`, `netlify.toml`, `scripts/make-icons.mjs` (renders the PNGs using headless browser canvas or a small PNG encoder with zlib)

- [ ] Download the woff2 fonts, add `@font-face` rules, and add the licence files.
- [ ] Draw the icon SVG and generate the PNGs.
- [ ] Write the SW with a precache list, cache-first fetch, old-cache cleanup, and an update prompt.
- [ ] Verify: SW registered, reload works while offline, manifest has no errors, no cross-origin requests, no CSP errors.
- [ ] Commit.

### Task 6: README, deploy and final verification

**Files:** Create `README.md` and `.gitignore`

- [ ] Write the deploy and iPhone install steps and the Shortcut setup.
- [ ] Final checks: both themes at 390px, all deletes, and `npm test`.
- [ ] Commit.
