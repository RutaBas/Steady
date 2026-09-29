/* Support person: low-day prompt and "Share my week". Nothing is ever sent without a tap. */
import { DEFAULT_SUPPORT, normalizeSupport, shouldPromptLowDay, fillMessage, smsLink, weekSummary, today } from "./logic.js";
import { getMeta, setMeta } from "./store.js";
import { $, toast, isOn, setOn } from "./ui.js";

let ctx, current = normalizeSupport(null), lowDayMood = null;

export async function load() { current = normalizeSupport(await getMeta("support")); }
export const get = () => current;

export async function set(s) {
  current = normalizeSupport(s);
  const ok = await setMeta("support", current);
  renderSettings();
  return ok;
}

export function init(c) {
  ctx = c;
  $("s-prompt").addEventListener("click", () => setOn("s-prompt", !isOn("s-prompt")));
  $("s-save").onclick = saveSettings;
  $("lowDaySend").onclick = () => {
    sendText(fillMessage(current.message, lowDayMood));
    finishLowDay();
  };
  $("lowDayNo").onclick = finishLowDay;
  $("shareWeek").onclick = () => {
    const text = weekSummary(ctx.state.mood, today());
    if (!text) { toast("No check-ins in the last 7 days to share."); return; }
    sendText(text);
  };
  renderSettings();
}

export function renderSettings() {
  $("s-name").value = current.name;
  $("s-phone").value = current.phone;
  $("s-threshold").value = String(current.threshold);
  $("s-message").value = current.message;
  setOn("s-prompt", current.prompt);
  $("s-note").firstChild.textContent = `${current.name || "Your support person"} isn't a crisis service and may not see a message right away. In an emergency, call or text `;
  resetRemove();
}

async function saveSettings() {
  const next = {
    name: $("s-name").value, phone: $("s-phone").value, threshold: +$("s-threshold").value,
    prompt: isOn("s-prompt"), message: $("s-message").value,
  };
  if (!next.name.trim()) { toast("Add their name first"); $("s-name").focus(); return; }
  if (next.phone.trim() && !smsLink(next.phone, "")) { toast("That phone number doesn't look right. Leave it empty to choose an app each time."); return; }
  if (await set(next)) toast(`Saved. ${current.name} is your support person.`);
}

function resetRemove() {
  const row = $("supportRow");
  row.querySelector("#s-remove")?.remove();
  row.querySelector(".remove-ask")?.remove();
  if (!current.name) return;
  const b = document.createElement("button");
  b.type = "button"; b.id = "s-remove"; b.className = "btn danger small"; b.textContent = "Remove";
  b.onclick = askRemove;
  row.append(b);
}

function askRemove() {
  const row = $("supportRow");
  $("s-remove").remove();
  const wrap = document.createElement("span");
  wrap.className = "actions remove-ask";
  wrap.innerHTML = `<span class="hint"></span><button class="btn danger small" type="button">Yes, remove</button><button class="btn ghost small" type="button">Keep</button>`;
  wrap.querySelector(".hint").textContent = `Remove ${current.name} as your support person?`;
  const [yes, keep] = wrap.querySelectorAll("button");
  yes.onclick = async () => { await set(DEFAULT_SUPPORT); hideLowDay(); toast("Support person removed"); };
  keep.onclick = resetRemove;
  row.append(wrap);
  keep.focus();
}

/* Called by the mood tab after a check-in is saved. */
export async function afterMoodSave(entry) {
  const prompted = await getMeta("lowDayPrompted");
  if (!shouldPromptLowDay(entry, current, prompted, today())) { hideLowDay(); return; }
  lowDayMood = entry.mood;
  $("lowDayText").textContent = `Let ${current.name} know you're having a rough day?`;
  $("lowDay").hidden = false;
}

function hideLowDay() { $("lowDay").hidden = true; lowDayMood = null; }

function finishLowDay() {
  hideLowDay();
  setMeta("lowDayPrompted", today());
}

/* Must run straight from a tap: iOS only allows the share sheet during a user gesture. */
function sendText(text) {
  const link = smsLink(current.phone, text);
  if (link) { location.href = link; return; }
  if (navigator.share) {
    navigator.share({ text }).catch(e => { if (e?.name !== "AbortError") copyFallback(text); });
    return;
  }
  copyFallback(text);
}

function copyFallback(text) {
  navigator.clipboard?.writeText(text)
    .then(() => toast("Copied. Paste it into a message."))
    .catch(() => toast("Couldn't open sharing on this device."));
}
