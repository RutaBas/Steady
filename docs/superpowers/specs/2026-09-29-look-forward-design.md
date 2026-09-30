# Look forward to — design

**Date:** 2026-09-29
**Status:** approved in chat, implementing

## Why

Anticipation is its own source of positive emotion (Nawijn et al. 2010; Van Boven & Ashworth 2007),
and depression specifically blunts *anticipatory* pleasure and positive future thinking
(MacLeod & Byrne 1996; Gard et al. 2006). Scheduling pleasant events is a core part of
Behavioral Activation. A short list of dated things to look forward to, surfaced on Today,
supports all three. Small, frequent things matter more than one distant big one, so this is a
list, not a single date.

## Behavior

**Items.** `{ id, name, date: "YYYY-MM-DD", created: ISO string, done?: true }`.
Name + date only (max 80 chars). Upcoming vs past is derived from the date, never stored.
An item dated today is upcoming ("Today!"). `done` means the "How was it?" nudge was answered.

**Today card** (under the greeting, above "How are you arriving?"):
- No upcoming items: one quiet line, *"Something to look forward to?"* + **Add**.
- Upcoming items: the soonest one, e.g. **Coffee with Mia** · *in 3 days*
  ("Tomorrow", "Today!"), plus **+N more** when there are others. The whole card opens the
  Look forward screen.
- Nudge: for the most recent past item dated within the last 7 days without `done`,
  *"Coffee with Mia was yesterday. How was it?"* with **Add to Joy jar** and **Dismiss**.
  Either action sets `done`. Only one nudge shows at a time.

**Look forward screen** (sub-page opened from Today, like the Joy jar; back button to Today):
- Add form: name + date (min = today). Enter or **Add** saves.
- **Upcoming**, soonest first: name, date, relative label, delete (inline confirm).
- **Past**, newest first: name, date, **Add to Joy jar**, delete.
- Empty state text when nothing has been added.

**Add to Joy jar** opens the Joy jar with a new note pre-filled: title = name,
text = "<date, e.g. Fri, Oct 3>. " so the person can add how it went, or just save.
It marks the item `done`.

**Settings toggle.** "Show on Today" chip under a **Look forward to** heading in the gear sheet,
on by default, stored as meta `lookForward`. Off hides the Today card and the nudge; the data is
kept and the screen stays reachable from an **Open list** button in that settings section.

**No "missed" state.** A cancelled plan is dismissed or deleted; nothing is counted against you.

## Architecture

- `js/logic.js`: add `"plans"` to `KEYS` so storage, backup/restore, entry counts and
  "Delete all" include it automatically. Pure helpers, unit-tested:
  - `daysUntil(date, today)` → integer
  - `untilLabel(n)` → "Today!" / "Tomorrow" / "in N days"
  - `splitPlans(plans, today)` → `{ upcoming (asc), past (desc) }`
  - `planNudge(plans, today)` → the item to ask about, or null (past, ≤7 days, not `done`)
  - `addPlan(plans, name, date, today)` → `{ plans }` or `{ error }` (validates name/date)
- `js/lookforward.js`: Today card, screen rendering, add/delete/dismiss, Joy jar hand-off.
- `js/joy.js`: export `startNote(title, text)` to open the jar with a prefilled note.
- `js/main.js`: register the module and the `look` tab (a sub-page of Today, like `joy`).
- `index.html`, `css/app.css`: the card, the screen, the settings toggle.
- `js/backup.js`: include plans in the counts line.
- `sw.js`: add `js/lookforward.js`, bump VERSION.

## Out of scope

Times of day, reminders/notifications, recurring events, emoji/photos, notes on items.

## Testing

`tests/lookforward.test.js` covers the pure helpers, including month/DST boundaries, today
counting as upcoming, the 7-day nudge window, and old backups without `plans` loading as `[]`.
Manual check in the browser preview: add, countdown, past + nudge, Joy jar hand-off, toggle,
dark mode, phone width.
