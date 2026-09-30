/* Backup & settings sheet: export/import file, text fallback, delete all, last-backup nudge, guides. */
import { serializeBackup, parseBackup, parseBackupSettings, parseBackupJoy, blank, countEntries, daysSince, today } from "./logic.js";
import { getMeta, setMeta } from "./store.js";
import { $, toast } from "./ui.js";

let ctx, pending = null, pendingSettings = null, pendingJoy = null, prepared = null, lastFocus = null;
const NUDGE_DAYS = 14, NUDGE_MIN_ENTRIES = 5;

export function init(c) {
  ctx = c;
  $("openSettings").onclick = () => openSheet();
  $("closeSettings").onclick = closeSheet;
  $("backupNudgeBtn").onclick = () => openSheet();
  $("sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden) closeSheet(); });
  $("exportFile").onclick = exportFile;
  $("importFile").addEventListener("change", importFile);
  $("importYes").onclick = applyPending;
  $("importNo").onclick = cancelPending;
  $("copyBackup").onclick = copyText;
  $("restore").onclick = () => stageRestore($("backupText").value);
  resetWipe();
}

export async function openSheet(sectionId) {
  lastFocus = document.activeElement;
  counts();
  prepareExport();
  await showLastBackup();
  $("sheet").hidden = false;
  document.body.style.overflow = "hidden";
  $("closeSettings").focus({ preventScroll: true });
  if (sectionId) {
    const d = $(sectionId);
    d.open = true;
    d.scrollIntoView({ block: "start" });
  }
}

export function closeSheet() {
  $("sheet").hidden = true;
  document.body.style.overflow = "";
  cancelPending();
  resetWipe();
  lastFocus?.focus?.();
}

function counts() {
  const S = ctx.state, j = ctx.joyCount();
  const n = (k, one, many) => `${S[k].length} ${S[k].length === 1 ? one : many}`;
  $("counts").textContent = [n("mood", "check-in", "check-ins"), n("thoughts", "thought record", "thought records"),
    n("triangles", "triangle", "triangles"), n("activities", "activity", "activities"),
    n("plans", "thing to look forward to", "things to look forward to"),
    n("planned", "planned activity", "planned activities"),
    `${j} Joy jar ${j === 1 ? "item" : "items"}`].join(" · ");
}

async function showLastBackup() {
  const last = await getMeta("lastBackup"), n = daysSince(last);
  const when = n == null ? null : n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
  $("lastBackup").textContent = when
    ? `Last backup: ${new Date(last).toLocaleDateString(undefined, { month: "short", day: "numeric" })} (${when})`
    : "No backup yet.";
}

/* Quiet banner on the Mood tab when a backup is overdue. */
export async function updateNudge() {
  const total = countEntries(ctx.state), last = await getMeta("lastBackup"), n = daysSince(last);
  const show = n == null ? total >= NUDGE_MIN_ENTRIES : n > NUDGE_DAYS && total > 0;
  $("backupNudgeText").textContent = n == null ? "You haven't backed up your entries yet." : `Your last backup was ${n} days ago.`;
  $("backupNudge").hidden = !show;
}

async function markBackedUp() {
  await setMeta("lastBackup", new Date().toISOString());
  await showLastBackup();
  await updateNudge();
}

/* Web Share with a file opens the iOS share sheet (Save to Files, AirDrop, Notes…). Falls back to a download. */
/* Settings travel with the entries so a restore brings them back. joy: Joy jar items (file export only). */
const backupText = joy => {
  const support = ctx.getSupport(), chips = ctx.getChips(), settings = {};
  if (support.name) settings.support = support;
  if (chips.length) settings.chips = chips;
  return serializeBackup(ctx.state, new Date(), settings, joy);
};

/* Photos have to be converted before the tap: iOS only opens the share sheet straight from a user gesture. */
function prepareExport() {
  prepared = null;
  const b = $("exportFile");
  b.disabled = true; b.textContent = "Preparing backup…";
  ctx.joyExport()
    .then(joy => { prepared = backupText(joy); })
    .catch(() => { prepared = backupText(); toast("Couldn't include Joy jar photos in this backup."); })
    .finally(() => { b.disabled = false; b.textContent = "Export backup file"; });
}

async function exportFile() {
  if (!prepared) { toast("Still preparing your backup. Try again in a moment."); return; }
  const text = prepared, name = `steady-backup-${today()}.json`;
  let file = null;
  try { file = new File([text], name, { type: "application/json" }); } catch { /* old browsers */ }
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Steady backup" });
      await markBackedUp();
      toast("Backup exported");
      return;
    } catch (e) {
      if (e?.name === "AbortError") return; // user closed the share sheet
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  await markBackedUp();
  toast("Backup file downloaded");
}

async function importFile(e) {
  const f = e.target.files?.[0];
  e.target.value = "";
  if (!f) return;
  try { stageRestore(await f.text()); }
  catch { toast("Couldn't read that file."); }
}

/* Validate, then ask inline before replacing anything. */
function stageRestore(text) {
  let data;
  try { data = parseBackup(text); }
  catch { toast("That doesn't look like a Steady backup. Check the file or paste the full text."); return; }
  const have = countEntries(ctx.state), incoming = countEntries(data);
  pending = data;
  pendingSettings = parseBackupSettings(text);
  pendingJoy = parseBackupJoy(text);
  const jarHave = ctx.joyCount();
  if (have === 0 && (pendingJoy == null || jarHave === 0)) { applyPending(); return; }
  const jarNote = pendingJoy == null ? "" : ` Your Joy jar (${jarHave}) will be replaced with ${pendingJoy.length} from the backup.`;
  $("importConfirmText").textContent = `Replace the ${have} entr${have === 1 ? "y" : "ies"} on this device with ${incoming} from the backup?${jarNote} This can't be undone.`;
  $("importConfirm").hidden = false;
  $("importNo").focus();
}

async function applyPending() {
  if (!pending) return;
  ctx.state = pending;
  const settings = pendingSettings, joy = pendingJoy;
  pending = pendingSettings = pendingJoy = null;
  $("importConfirm").hidden = true;
  if (settings?.support) await ctx.setSupport(settings.support);
  if (settings?.chips) await ctx.setChips(settings.chips);
  let jarOk = true;
  if (joy) { try { await ctx.joyReplace(joy); } catch { jarOk = false; } }
  const ok = await ctx.persist();
  ctx.renderAll();
  counts();
  prepareExport();
  if (!jarOk) toast("Entries restored, but the Joy jar didn't fit. Your phone may be low on space.");
  if (ok) toast("Backup restored");
}

function cancelPending() { pending = pendingSettings = pendingJoy = null; $("importConfirm").hidden = true; }

async function copyText() {
  const txt = backupText(), ta = $("backupText");
  ta.value = txt;
  try {
    await navigator.clipboard.writeText(txt);
    await markBackedUp();
    toast("Backup copied. Paste it into your notes app.");
  } catch {
    ta.focus(); ta.select();
    toast("Backup selected. Copy it from the box.");
  }
}

function resetWipe() {
  const r = $("wipeRow");
  r.innerHTML = '<button class="btn danger small" id="wipe" type="button">Delete all entries</button>';
  $("wipe").onclick = askWipe;
}

function askWipe() {
  const r = $("wipeRow");
  r.innerHTML = '<span class="hint">This deletes all entries and your Joy jar on this device.</span><button class="btn danger small" id="wipeYes" type="button">Delete everything</button><button class="btn ghost small" id="wipeNo" type="button">Cancel</button>';
  $("wipeYes").onclick = async () => {
    ctx.state = blank();
    try { await ctx.joyReplace([]); } catch { /* entries still cleared */ }
    const ok = await ctx.persist();
    ctx.renderAll(); counts(); resetWipe(); prepareExport();
    if (ok) toast("All entries deleted");
  };
  $("wipeNo").onclick = resetWipe;
  $("wipeNo").focus();
}
