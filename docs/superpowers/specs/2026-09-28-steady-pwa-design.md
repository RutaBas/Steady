# Steady PWA — Design

Date: 2026-09-28
Source of truth for features, copy and visuals: `steady-prototype.html` and `claude-code-handover.md`.

## Goal

Turn the single-file Steady prototype (four CBT worksheets) into an installable, fully offline iPhone PWA with private on-device storage, file backup/restore, a Shortcuts-based daily reminder, and a Shortcuts-based "Fill from Health" sleep import. Deploy as a static site on Netlify from GitHub.

## Decisions made

| Topic | Decision |
|---|---|
| Stack | Plain HTML/CSS/JS ES modules. No build step, no runtime dependencies. |
| Storage | IndexedDB, one record holding the whole `{mood, thoughts, triangles, activities}` object. One-time migration from the prototype's localStorage key `steady-notebook-v1`. |
| Reminder | v1: an in-app guide for an iOS Shortcuts Personal Automation. Real Web Push (Netlify scheduled function) is a possible later add-on and is not part of v1. |
| Sleep import | v1: iOS Shortcut reads Apple Health sleep and copies a tagged string; a "Fill from Health" button in the mood check-in reads the clipboard. Oura is covered by the Oura app → Apple Health sync. No direct Oura API. |
| Sleep insight | Added to the mood insights next to the three activity comparisons. |
| Restore | An import replaces all data on the device, after an inline confirmation. |
| Network | No data ever leaves the device. The CSP `connect-src 'self'` enforces this. |

## File layout

```
index.html              markup ported from prototype + PWA meta tags
manifest.webmanifest    name "Steady", display standalone, theme/background teal, icons
sw.js                   precache app shell; cache-first; versioned cache name
netlify.toml            security headers (CSP), no-cache for sw.js and manifest
css/app.css             prototype CSS + safe-area insets, 44px min touch targets, @font-face
js/main.js              boot: load store, migrate, render, register SW, tab routing
js/store.js             IndexedDB get/put of state; localStorage migration; persist() request
js/logic.js             pure functions (no DOM): insights, sleep insight, top activities,
                        backup serialize/parse/validate, Health clipboard parse, date helpers
js/ui.js                shared DOM helpers: $, toast, entry(), delButton() inline confirm
js/mood.js  js/thoughts.js  js/triangle.js  js/activities.js   one module per worksheet
js/backup.js            settings sheet: export file, import file, copy text, restore text,
                        delete all, last-backup date, reminder + Health guides
fonts/                  Bricolage Grotesque (500, 700) + Lexend (300–600), woff2, OFL licence
icons/                  icon.svg, apple-touch-icon-180.png, icon-192.png, icon-512.png,
                        icon-maskable-512.png
tests/logic.test.js     node --test for js/logic.js
README.md               local run, deploy, iPhone install, Shortcut setup
```

## Data

Unchanged from the prototype:

- `mood`: `{id, date, mood 1–10, sleep|null, outside|null, moved, talked, enjoyed, note}`, one per date
- `thoughts`: `{id, date, situation, thought, belief, emotion, emoInt, evFor, evAgainst, balanced, balBelief, emoNow}`
- `triangles`: `{id, date, situation, thoughts, behaviors, feelings, corner, action, after}`
- `activities`: `{id, date, block, what, p, m}`

One new field sits outside the data object, in a separate IndexedDB `meta` record: `lastBackup` (ISO string).

`sleep` on a mood entry means the hours slept on the night *ending* on that date.

Storage flow: on boot, read IndexedDB. If it is empty and localStorage has `steady-notebook-v1`, copy that into IndexedDB. The localStorage copy is left in place (no deletion). Every save writes the whole state. If a write fails, show the prototype's toast. Call `navigator.storage.persist()` once (best effort).

## Features (ported as-is from the prototype)

All four worksheets, the chart (2 wk / 4 wk / 3 mo, gaps for missed days, example data until 2 check-ins), the activity insights (≥3 days in each group), the thought-record emotion drop, the triangle corner tips, adding "what happened afterward" later from the history, the activity day list, the top 5 activities over 7 days, inline delete confirmations, the tab memory, and the visible 988 line.

## New in v1

### Sleep insight
Only mood entries with `sleep != null` count. They split into sleep ≥ 7 h and sleep < 7 h. The insight shows when each group has ≥3 entries: `+1.3 on days after 7+ hours of sleep (6.1 vs 4.8)`.

### Fill from Health
- The mood form gets a small ghost button, "Fill from Health", next to "Hours slept".
- It calls `navigator.clipboard.readText()`, which triggers iOS's own Paste callout.
- Expected format: `steady-sleep:YYYY-MM-DD:H.H` (whitespace tolerated, `,` also accepted as the decimal separator for non-US locales). The value must be between 0 and 24.
- On success it fills "Hours slept" and toasts `Filled 7.2 h (night ending Mon, Sep 28)`. If the clipboard date differs from the form date, it still fills, and the toast names the night so you can tell.
- On failure (permission denied, wrong format) it toasts `No Health sleep found on the clipboard. Run the "Steady sleep" shortcut first.` plus a link that opens the setup guide.
- Nothing is saved until the user taps Save check-in.

### Shortcut guides (in the settings sheet, collapsible, and in the README)
1. **"Steady sleep" shortcut:** Find Health Samples (Sleep Analysis, End Date is in the last 1 day, value is Asleep/Core/Deep/REM, i.e. not In Bed or Awake) → get Duration of each → Calculate Statistics Sum → divide by 3600 and round to 1 decimal → Text `steady-sleep:[Current Date yyyy-MM-dd]:[hours]` → Copy to Clipboard → Show Notification "Sleep copied — open Steady to check in".
2. **Evening reminder:** Shortcuts → Automation → Time of Day (e.g. 8 pm, daily, Run Immediately) → Run Shortcut "Steady sleep" (or just Show Notification "How's your mood today?"). Then open Steady from the Home Screen.

The exact Health action names and the summing step have to be verified on a real iPhone. The guide says so.

### Backup and restore
- **Export backup file:** builds the prototype-format JSON `{app:"steady", v:1, saved, data}`, named `steady-backup-YYYY-MM-DD.json`. It uses `navigator.share({files})` when `canShare` allows, which opens the iOS share sheet → Save to Files. Otherwise it falls back to an `<a download>` blob. On success it records `lastBackup`.
- **Import from file:** a `<input type=file accept=".json,application/json">` → parse and validate (same checks as the prototype, plus type checks on each array) → inline confirmation "Replace N entries on this device with M from the backup?" → write.
- **Copy backup text** and **Restore from pasted text** are kept from the prototype. Pasted restore also uses the inline confirmation.
- A note explains that iOS may clear website data if the app goes unused for a while, so backups should be regular. It shows "Last backup: Sep 20 (8 days ago)" or "No backup yet". If the last backup is more than 14 days old and there is data, a quiet one-line nudge appears at the top of the mood tab.
- **Delete all:** keeps the prototype's inline confirmation.

## PWA

- `<meta name="apple-mobile-web-app-capable" content="yes">`, `mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` = `default`, `apple-mobile-web-app-title` = "Steady", `viewport-fit=cover`, `theme-color` light and dark, and `apple-touch-icon`.
- Safe areas: the header gets `padding-top: env(safe-area-inset-top)`, the tab bar and toast already use the bottom inset, and the side insets are added.
- Service worker: precaches every file in the app shell under `steady-v<N>`. Fetch is cache-first for same-origin GET, with a network fallback that is also cached. `activate` deletes old caches. When a new SW is waiting, a toast-style bar says "Update ready — Reload", which triggers `skipWaiting` → reload.
- Icon: an original mark, a rounded teal square (#2F6F6A) with a simple white shape (a steady horizon line with a gentle rise, echoing the mood chart). Drawn as SVG and rasterised to PNG with a small local script or in-browser canvas. The maskable version keeps the mark inside the safe zone.
- Fonts: woff2 files downloaded once into `fonts/` with `font-display: swap`. The Google Fonts links are removed.

## Security / privacy headers (netlify.toml)

`Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; script-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`.

Also `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy` that disables camera, microphone and geolocation. Inline `style=` attributes from the prototype move into CSS classes so `style-src 'self'` holds. The chart sets SVG presentation attributes, not style attributes, so it is unaffected.

## Accessibility and motion

The prototype's ARIA stays. Buttons, chips and tabs get a minimum 44×44 px touch target. `prefers-reduced-motion` disables transitions and smooth scrolling. Both themes follow the system setting.

## Testing

- `node --test tests/` covers the pure logic: activity and sleep insights (thresholds, the ≥3 rule), top activities, backup round-trip (serialize → parse equals input), rejection of malformed backups, Health clipboard parsing (valid, comma decimal, bad prefix, out of range), and the localStorage-migration shape merge.
- Browser pane at 390 px in light and dark: every tab renders, saves work, and inline deletes work. An export → delete all → import round-trip restores identical data. Offline check: after the first load, the SW goes offline (DevTools network offline) and a reload still works. The manifest and SW are checked for installability (Lighthouse PWA/DevTools). Also confirmed: no requests leave the origin, and there are no CSP violations in the console.
- Cannot test here: real iPhone install, the iOS share-sheet export, the iOS clipboard Paste prompt, the Shortcuts/Health actions, and data eviction. These are listed in the final report with manual steps.

## Deploy

Static site at the repo root, with Netlify publish directory `.` and no build command. The README gives step-by-step instructions: create the GitHub repo and push, then Netlify → Add new site → Import from GitHub → deploy. On iPhone: open the URL in Safari → Share → Add to Home Screen → open from the Home Screen → export a first backup. Then set up the two Shortcuts.

## Out of scope for v1

Web Push reminders, direct Oura API, native app, accounts, sync between devices, and a merge-style import.

---

# Addendum (2026-09-29): sharing mood with a support person

## Phase A (build now): you-initiated sharing, no server

**Support person settings** live in the backup sheet and are stored in IndexedDB `meta:support`:
`{name, phone, threshold 2–4 (default 3), prompt true|false, message}`.
- `phone` is optional. With a phone number, messages open `sms:<phone>&body=<text>` (the iOS Messages link format). Without one, the Web Share sheet (`navigator.share({text})`) opens. If that is unavailable, the text is copied to the clipboard.
- The default message is `Rough day today (mood {mood}/10). Could you check in on me?`, where `{mood}` is replaced with the score.
- The settings are included in backups as an optional top-level `settings.support` field. Backups without it still restore. "Delete all entries" keeps the settings. "Remove support person" uses an inline confirmation.
- Copy shown with the settings: "{Name} isn't a crisis service and may not see this right away. In an emergency, call or text 988."

**Low-day prompt:** after saving a check-in the prompt shows when all of these hold: the entry's date is today, `mood <= threshold`, prompt is on, a name is set, and `meta:lowDayPrompted !== today`. An inline card below Save reads "Let {name} know you're having a rough day?" with [Send message] [Not now]. Either button records `lowDayPrompted = today`. The message contains only the mood score.

**Share my week:** a button in the mood chart card. It covers the last 7 days including today:
```
My week in Steady (Sep 23–29)
▄▃▃▃▅_▄  avg 4.5 · 6 of 7 days checked in
Daily: 5 4 3 4 6 – 5
Lowest: 3 (Fri)
Mood 1–10 · _ or – = no check-in
```
Bars are `▁▂▃▄▅▆▇█`, with index `round((mood-1)/9*7)`. When the week spans two months the range shows both months (`Sep 28–Oct 4`). With no check-ins in the window, the toast says "No check-ins in the last 7 days to share." Only mood scores and check-in days are included. The message goes to the support person's number if one is set, otherwise to the share sheet.

Nothing is ever sent without a tap, and Steady still makes no network requests.

**Pure functions (tested):** `normalizeSupport`, `shouldPromptLowDay`, `fillMessage`, `smsLink`, `weekSummary`, `serializeBackup(state, now, settings?)`, `parseBackupSettings(text)`.

## Phase B (planned, not built): live mood-only sharing

The app would upload an end-to-end-encrypted record `{date, mood}` after each check-in to a small store (a Netlify Function plus Netlify Blobs or similar). The key lives only in the URL fragment of the friend's link, so the server stores ciphertext only. The friend gets a view page with the chart, and a daily scheduled function sends Web Push alerts to the friend for "no check-in for N days" or "mood ≤ threshold twice in a row". Phase B would reuse the Phase A settings (name, threshold, mood-only scope). It needs a CSP `connect-src` exception for that one endpoint, VAPID keys, and friend opt-in to notifications.

---

# Addendum (2026-09-29): Today home tab, gear + appearance

**Today tab** (first of 5 tabs; the app opens here unless the URL has a tab hash; the last-tab memory is removed):
1. Greeting by hour: 5–11 "Good morning", 12–16 "Good afternoon", 17–21 "Good evening", 22–4 "Hi there. Go gently tonight." A date line sits below.
2. "How are you arriving?" with four choices. Each reveals an inline reply with a primary button:
   - Doing okay → "A quick check-in helps you spot patterns over time." [Check in] → Mood
   - Heavy / low → "That sounds hard. When energy is low, one small action can help. A shower, a short walk or a glass of water all count." [Log one small thing] → Activities, plus [Just check in] → Mood, with the 988 line
   - Caught in a thought → "Let's slow it down. Write the thought, then look at the evidence." [Start a thought record] → Thoughts
   - Want to reflect → "Map how your thoughts, feelings and actions feed each other." [Open the CBT triangle] → Triangle
3. Today strip: "Checked in · mood 6" or "Not checked in yet" [Check in]; "N activities logged today"; a 7-day mini chart when ≥1 check-in falls in the window (gaps for missed days).
4. Worksheet cards: Mood ("30 seconds to notice how today is going"), Thought record ("When a thought won't let go"), CBT triangle ("See how thoughts, feelings and actions connect"), Activity log ("Notice what lifts you, even a little").
The backup nudge moves from the Mood tab to Today. No streaks and no missed-day counts.

**Settings:** the header button becomes a gear labelled "Settings", and the sheet is titled "Settings". An Appearance control (Auto / Light / Dark) sits first. The choice is stored per device in localStorage `steady-theme` and applied before first paint by a classic script `js/theme.js` in `<head>`, which sets `data-theme` and both theme-color metas. It is not part of backups.

**Pure functions (tested):** `greeting(hour)`, `weekSeries(mood, todayIso)` (7 values or null, also used by `weekSummary`), `todayStatus(state, todayIso)`.

---

# Addendum (2026-09-29): custom "Today I…" chips and the Joy jar

## Custom chips
- Chips are stored in `meta:chips` as `[{label, since}]`, where `since` is the date the chip was added. Up to 8 chips, each 1–40 characters, labels unique ignoring case. Chips are included in backups as `settings.chips`.
- Mood entries gain an optional `custom: [label]` field. Older entries without it are read as `[]`. Removing a chip never rewrites history. When an entry is re-saved, labels on it that aren't current chips are kept.
- UI: "+ Add your own" opens an inline input. "Edit" puts custom chips into remove mode, with an inline confirmation for each removal.
- Insight: `on days with “{label}”`. It uses only entries dated on or after `since`, and needs ≥3 days with and ≥3 without.

## Joy jar
- IndexedDB moves to version 2 with a new object store `joy` (keyPath `id`). Items are `{id, type: "photo"|"note"|"link", title, text, url, created, photo?: Blob}`.
- Photos are chosen with `<input type=file accept="image/*">`, which on iOS gives a JPEG. The image is drawn to a canvas scaled to fit 1600px and re-encoded with `toBlob("image/jpeg", 0.82)`, which also drops EXIF data including location.
- Links must be http(s). A bare domain gets `https://` added in front. Any other scheme is rejected. Links open with `target=_blank rel="noopener noreferrer"`. There are no link previews.
- UI:
  - The Today tab gets a Joy jar card with a count, up to 3 photo thumbnails, [Open Joy jar] and [Show me something good].
  - The "Heavy / low" reply adds "See something that made you smile" when the jar isn't empty.
  - The Joy jar view is `#joy`, not in the tab bar (Today stays highlighted). It has add buttons (Photo / Note / Link), inline add forms, and a 2-column grid.
  - Tapping an item opens a detail sheet with the full photo, text, link and Delete (inline confirmation). A random pick adds "Another one", which avoids showing the same item twice in a row.
- Backups: the file export includes `joy: [...]`, with photos as `data:image/jpeg;base64,…`. The file is prepared when Settings opens, so the iOS share call still runs directly from the tap. On restore, a backup with a `joy` array replaces the jar, and a backup without one keeps the current jar. The text fallback leaves the jar out, and says so. "Delete all" also empties the jar, and its warning says so.
- Validation on import (`parseBackupJoy`): the item type must be known, the URL must be http(s), photo data URLs must match `^data:image/(jpeg|png|webp);base64,`, text lengths are capped, and at most 1000 items are accepted.
- Pure functions (tested): `normalizeChips`, `addChip`, `customInsights`, `safeUrl`, `parseBackupJoy`, `pickJoy`, and `serializeBackup(state, now, settings, joy)`.
