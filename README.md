# Steady

A private CBT worksheet app for iPhone, installed from Safari to the Home Screen. It opens on a **Today** screen: a greeting, a countdown to the next thing you're looking forward to, a weekly "Three good things?" card, a gentle "How are you arriving?" question that points you to the right worksheet, today's status and plans with a mini chart of your week, and cards for five worksheets:

- **Mood check-in**: mood 1–10, sleep, time outside, "Today I…" toggles (add up to 8 of your own, like *played guitar*) and a note, with a chart and insights
- **Thought record**: 7 steps, from the automatic thought to a balanced thought
- **CBT triangle**: thoughts, behaviors and feelings, then one small thing to try
- **Activity log**: log what you did with pleasure and mastery ratings, or **plan** something small ahead, with life areas and a guess at how much you'll enjoy it
- **Self-compassion break**: three short guided steps for when you're being hard on yourself

Extras on Today: the **Joy jar**, **Look forward to** and **Three good things**. Everything is optional, and nothing is ever counted against you.

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

## Plan something small

On the **Activities** tab, switch to **Plan** to plan a small activity for today or a later day, with an optional time, life area and a guess at how much you'll enjoy it. Planning ahead is the core of behavioral activation, which works about as well as full CBT for depression (Cuijpers et al., 2007; Ekers et al., 2014).

- **Life areas** (optional): Relationships, Health & body, Fun & creativity, Work & learning, Daily responsibilities. You can tag logged activities too.
- **Enjoyment guess** (optional): move the slider to guess 0–10, or leave it on "–" to skip.
- Upcoming plans are listed under **Coming up**, each with a delete button.
- Today's plans show on **Today** with **Did it**, which opens the log with the activity filled in and your guess shown above the Pleasure slider. Saving logs it and removes the plan; leaving without saving keeps it.
- If a plan didn't happen, Today shows a gentle line: **Try today** or **Let it go**. Plans older than 3 days disappear quietly. Nothing is counted.
- Under **What's been lifting you**, two lines appear once there's enough data: **This week** (how many activities in each life area) and **Predictions** ("Things went better than you expected 4 of 5 times"). The Predictions line only shows when that's true more often than not: depression often underestimates how much you'll enjoy things.

## Three good things

Once a week, Today asks for up to three good things from your week and why they happened. Writing down good things and their causes has reduced depressive symptoms in studies (Seligman et al., 2005), and doing it weekly works better than more often (Lyubomirsky et al., 2005).

- The card appears on your reminder day and stays for 3 days, until you tap **Write them** or **Not this week**.
- One good thing is enough. The "Why did it happen?" line under each is optional, but it's the part the research says helps most.
- Reopening the screen in the same week lets you edit that week's entry. Past weeks are listed below it, and any item can go into the Joy jar.
- **Settings** (the gear) → **Three good things**: change the reminder day (Sunday by default), turn **Remind me on Today** off, or **Open** the screen. Your entries are kept when the reminder is off.

## Self-compassion break

A three-step exercise for when you're being hard on yourself, after Kristin Neff. Self-compassion is linked to lower depression (MacBeth & Gumley, 2012), and self-compassion exercises reduce it (Ferrari et al., 2019).

1. **Notice** that this is hard, with an optional line for what's hard right now.
2. **You're not alone**: other people feel this too.
3. **Kindness**: write what you'd say to a friend feeling this way.

- Open it from its card on **Today**, from **Heavy / low**, or from the "Still feels heavy?" card after a thought record whose emotion barely dropped.
- **Done** saves the break under **Past breaks** (nothing is saved if you didn't write anything). **Save to Joy jar too** also puts your kind words in the jar for a future hard day.

Plans, good things and self-compassion breaks are saved on your phone and included in both backup types. The good-things reminder day and on/off setting stay on the device and aren't part of backups.

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
js/planner.js           Plan mode on Activities, today's plans on Today, missed-plan line
js/goodthings.js        Three good things: weekly Today card, screen, past weeks, settings
js/kindness.js          Self-compassion break: three steps, past breaks
js/logic.js             pure logic (insights, planning, weeks, backup format, Health clipboard parsing), unit-tested
js/store.js             IndexedDB storage + one-time migration from the prototype's localStorage
js/ui.js                shared DOM helpers (toast, inline delete confirmation, history rows, life area chips)
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

Data shape (also the backup format's `data` field): `{mood:[], thoughts:[], triangles:[], activities:[], plans:[], planned:[], good:[], kind:[]}`. `plans` is Look forward to; `planned` is Plan mode. Older backups without the newer lists restore them as empty.

## License

Code: [MIT](LICENSE). The bundled fonts in `fonts/` (Bricolage Grotesque, Lexend) are under the SIL Open Font License; see the `OFL-*.txt` files there.
