# Steady

A private CBT worksheet app for iPhone, installed from Safari to the Home Screen. It opens on a **Today** screen: a greeting, a countdown to the next thing you're looking forward to, a gentle "How are you arriving?" question that points you to the right worksheet, today's status with a mini chart of your week, and cards for the four worksheets:

- **Mood check-in**: mood 1–10, sleep, time outside, "Today I…" toggles (add up to 8 of your own, like *played guitar*) and a note, with a chart and insights
- **Thought record**: 7 steps, from the automatic thought to a balanced thought
- **CBT triangle**: thoughts, behaviors and feelings, then one small thing to try
- **Activity log**: pleasure and mastery ratings, plus your top activities from the last 7 days

**Privacy:** entries are stored only in the browser on your phone (IndexedDB). There are no accounts, no analytics and no server. The site's Content-Security-Policy blocks the page from contacting any other server. Backups are files you export yourself.

If you're in crisis or feel unsafe, call or text **988** any time.

---

## Run it locally

Requires Node 18+ (for the dev server and tests only; the app itself has no dependencies).

```bash
npm run serve
```

Open http://localhost:5173. Run the logic tests with:

```bash
npm test
```

## Deploy to Netlify from GitHub

1. **Create a GitHub repository.** On github.com, click **New repository** and name it `steady`. A **Private** repository is fine because Netlify can deploy private repos. Don't add a README or a .gitignore.
2. **Push this folder** (run these in this project folder, replacing `YOUR-USERNAME`):
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/steady.git
   git push -u origin main
   ```
3. **Connect Netlify.** At app.netlify.com, choose **Add new site → Import an existing project → GitHub**, authorize, and pick `steady`.
4. **Build settings:** leave the **Build command** empty and set the **Publish directory** to `.`. `netlify.toml` already sets these, along with the security headers. Click **Deploy**.
5. Optional: in **Site configuration → Change site name**, pick something like `steady-notebook`, so the address becomes `https://steady-notebook.netlify.app`.

Every `git push` to `main` redeploys automatically.

### Shipping an update

When you change any app file, bump `VERSION` in `sw.js` (for example `steady-v1` → `steady-v2`), then commit and push. The next time you open Steady, it shows **"A new version of Steady is ready. Reload"**.

## Install on your iPhone

1. Open the Netlify address in **Safari**. It has to be Safari, because other browsers can't install web apps on iOS.
2. Tap the **Share** button (the square with an up arrow), scroll down, and tap **Add to Home Screen**. Keep the name "Steady" and make sure **Open as Web App** is on, then tap **Add**.
3. Open **Steady from the Home Screen icon** from now on, not from Safari. The installed app keeps its data separate from Safari, so entries made in a Safari tab won't appear in the installed app.
4. Open the app once with internet access. After that it works fully offline.
5. Tap the **gear** (top right) and choose **Export backup file → Save to Files**, so you know how backups work.

### Light or dark mode

Tap the **gear** (top right) → **Appearance**. **Auto** follows your iPhone's setting (Settings → Display & Brightness). **Light** or **Dark** fixes Steady's look regardless of the phone.

### Backups matter

iOS can delete a web app's stored data, for example if you don't open it for several weeks or storage runs low. Export a backup regularly; the app reminds you when it has been more than 14 days. To restore, open the same sheet, tap **Import from file**, and pick the `steady-backup-….json` file. Restoring replaces everything on the device after you confirm. If file export ever fails, use **Backup as text (fallback)** and paste the text into Notes.

## Joy jar

Open it from the **Today** screen. Save **photos**, **notes** and **links** that make you smile: happy memories, kind words, a song that helps. On a hard day, **Show me something good** (or "See something that made you smile" under *Heavy / low*) shows one at random.

- Photos are shrunk to 1600 px on your phone before saving (about 300 KB each), and their hidden location data is removed. Steady keeps its own copy; it can't link to your Photos library.
- Links must be web links (https://…) and open in Safari.
- Everything stays on your phone and is included in **Export backup file**. The text backup doesn't include the Joy jar, and restoring one leaves your jar as it is.

## Look forward to

Having something good coming up can lift the days before it, and depression tends to make that harder to picture, so Steady helps you keep a short list. Tap **Add** on the **Today** card and enter a name and a date: *coffee with Mia*, *a new episode*, *a long bath*. Small things count.

- **Today** shows the soonest one with a countdown ("Tomorrow", "Today!", "in 3 days") and "+N more" when there are others. Tap it to see the full list.
- The day after, Today asks **"How was it?"** with **Add to Joy jar** (opens a note filled in with the name and date, so you can add how it went) or **Dismiss**. It only asks about the last week. A plan that got cancelled is just dismissed or deleted; nothing counts as missed.
- Past items move to a **Past** list, and each still has **Add to Joy jar**.
- Don't want it? **Settings** (the gear) → **Look forward to** → turn off **Show on Today**. Your list is kept, and **Open list** still opens it.
- The list is saved on your phone and included in both backup types.

## Optional: a support person

In **Settings** (the gear), under **Support person**, you can add someone you trust: a name, and optionally a phone number.

- **Low-day prompt:** when today's mood is at or below your threshold (3 by default), a card offers **"Let Ana know?"**. **Send message** opens Messages to their number, or the share sheet if you didn't add one, with a short message containing only your mood score. It appears at most once a day.
- **Share my week:** a button under the mood chart sends a text summary of the last 7 days (bars, daily scores, average, lowest day). It contains mood scores only: no notes, sleep or worksheets.
- Nothing is ever sent without your tap, and Steady still makes no network requests. The support person is saved on your phone and included in backups.

Your support person isn't a crisis service and may not see a message right away. In an emergency, call or text **988**.

## Optional: evening reminder and sleep from Apple Health / Oura

Web apps can't read Apple Health or schedule notifications without a server, so Steady uses iOS Shortcuts instead. Nothing leaves your phone. The full step-by-step guides are in the app, in **Settings** under **Reminders & sleep**. In short:

- **"Steady sleep" shortcut:** Find Health Samples (Sleep, last 1 day, excluding In Bed and Awake) → sum the durations → convert to hours → build the text `steady-sleep:YYYY-MM-DD:H.H` → Copy to Clipboard. In Steady, tap **Fill from Health** → **Paste**.
- **Oura:** in the Oura app → Settings → **Apple Health**, turn on sleep syncing so Oura sleep flows into Health.
- **Evening reminder:** in Shortcuts → Automation → Time of Day (e.g. 8 pm, daily, Run Immediately) → Run Shortcut "Steady sleep", or just Show Notification. Then open Steady from the Home Screen.

The exact Shortcut action names can differ slightly between iOS versions. If Duration comes back in minutes, divide by 60 instead of 3600.

## Project layout

```
index.html              page markup
css/app.css             styles (light + dark themes, safe areas)
js/main.js              boot, tabs, appearance control, service worker registration
js/theme.js             applies Auto/Light/Dark before first paint
js/today.js             Today tab: greeting, "How are you arriving?", status, week mini chart
js/chips.js             your own "Today I…" options
js/joy.js               Joy jar: add/view/delete photos, notes, links; photo shrinking; backup conversion
js/lookforward.js       Look forward to: Today countdown card, list screen, "How was it?" nudge
js/logic.js             pure logic (insights, backup format, Health clipboard parsing), unit-tested
js/store.js             IndexedDB storage + one-time migration from the prototype's localStorage
js/ui.js                shared DOM helpers (toast, inline delete confirmation, history rows)
js/mood.js, thoughts.js, triangle.js, activities.js   one module per worksheet
js/backup.js            backup sheet: export/import, text fallback, delete all, guides
js/support.js           support person: low-day prompt, Share my week
sw.js                   offline cache (bump VERSION on every release)
manifest.webmanifest    install metadata
fonts/                  self-hosted Bricolage Grotesque + Lexend (SIL Open Font License)
icons/                  app icons (regenerate PNGs with: node scripts/make-icons.mjs)
netlify.toml            hosting config and security headers
tests/                  node --test unit tests
```

Data shape (also the backup format's `data` field): `{mood:[], thoughts:[], triangles:[], activities:[], plans:[]}`. Older backups without `plans` restore with an empty list.

## License

Code: [MIT](LICENSE). The bundled fonts in `fonts/` (Bricolage Grotesque, Lexend) are under the SIL Open Font License; see the `OFL-*.txt` files there.
