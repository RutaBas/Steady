# Steady

A private CBT worksheet app for iPhone, installed from Safari to the Home Screen. It has four worksheets:

- **Mood check-in**: mood 1–10, sleep, time outside, activity toggles and a note, with a chart and insights
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
5. Tap the download icon (top right) and choose **Export backup file → Save to Files**, so you know how backups work.

### Backups matter

iOS can delete a web app's stored data, for example if you don't open it for several weeks or storage runs low. Export a backup regularly; the app reminds you when it has been more than 14 days. To restore, open the same sheet, tap **Import from file**, and pick the `steady-backup-….json` file. Restoring replaces everything on the device after you confirm. If file export ever fails, use **Backup as text (fallback)** and paste the text into Notes.

## Optional: evening reminder and sleep from Apple Health / Oura

Web apps can't read Apple Health or schedule notifications without a server, so Steady uses iOS Shortcuts instead. Nothing leaves your phone. The full step-by-step guides are in the app, in the backup sheet under **Reminders & sleep**. In short:

- **"Steady sleep" shortcut:** Find Health Samples (Sleep, last 1 day, excluding In Bed and Awake) → sum the durations → convert to hours → build the text `steady-sleep:YYYY-MM-DD:H.H` → Copy to Clipboard. In Steady, tap **Fill from Health** → **Paste**.
- **Oura:** in the Oura app → Settings → **Apple Health**, turn on sleep syncing so Oura sleep flows into Health.
- **Evening reminder:** in Shortcuts → Automation → Time of Day (e.g. 8 pm, daily, Run Immediately) → Run Shortcut "Steady sleep", or just Show Notification. Then open Steady from the Home Screen.

The exact Shortcut action names can differ slightly between iOS versions. If Duration comes back in minutes, divide by 60 instead of 3600.

## Project layout

```
index.html              page markup
css/app.css             styles (light + dark themes, safe areas)
js/main.js              boot, tabs, service worker registration
js/logic.js             pure logic (insights, backup format, Health clipboard parsing), unit-tested
js/store.js             IndexedDB storage + one-time migration from the prototype's localStorage
js/ui.js                shared DOM helpers (toast, inline delete confirmation, history rows)
js/mood.js, thoughts.js, triangle.js, activities.js   one module per worksheet
js/backup.js            backup sheet: export/import, text fallback, delete all, guides
sw.js                   offline cache (bump VERSION on every release)
manifest.webmanifest    install metadata
fonts/                  self-hosted Bricolage Grotesque + Lexend (SIL Open Font License)
icons/                  app icons (regenerate PNGs with: node scripts/make-icons.mjs)
netlify.toml            hosting config and security headers
tests/                  node --test unit tests
```

Data shape (also the backup format's `data` field): `{mood:[], thoughts:[], triangles:[], activities:[]}`.
