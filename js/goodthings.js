/* Three good things, weekly (Seligman et al. 2005): a Today card for 3 days from the reminder day,
   one entry per week with an optional "why" per item. Entries live in state.good; the reminder
   setting and this week's dismissal are meta values. */
import { today, addDays, parseIso, weekKey, showGoodCard, saveGoodWeek, normalizeGoodSettings } from "./logic.js";
import { getMeta, setMeta } from "./store.js";
import { $, fmt, toast, delButton, emptyMsg, el, smallBtn } from "./ui.js";

let ctx, settings = normalizeGoodSettings(), dismissed = null;

export async function load() {
  settings = normalizeGoodSettings(await getMeta("goodThings"));
  dismissed = (await getMeta("goodDismissed")) ?? null;
}

const entries = () => ctx.state.good;
const key = () => weekKey(today(), settings.day);
let openWeek = null; // the week the open screen was filled for; Save files under it

async function setSettings(next) {
  settings = next;
  await setMeta("goodThings", settings);
  render();
}

export function init(c) {
  ctx = c;
  for (let i = 0; i < 3; i++) {
    const row = el("div", "good-row");
    row.innerHTML = `<label class="visually-hidden" for="goodT${i}">Good thing ${i + 1}</label>
      <input type="text" id="goodT${i}" maxlength="200" autocomplete="off" placeholder="A good thing">
      <label class="visually-hidden" for="goodW${i}">Why did it happen? (optional)</label>
      <input type="text" class="good-why" id="goodW${i}" maxlength="200" autocomplete="off" placeholder="Why did it happen? (optional)">`;
    $("goodRows").append(row);
  }
  const sel = $("goodDay");
  for (let d = 0; d < 7; d++) {
    const o = document.createElement("option");
    o.value = String(d);
    o.textContent = parseIso(addDays("2026-09-27", d)).toLocaleDateString(undefined, { weekday: "long" }); // 2026-09-27 is a Sunday
    sel.append(o);
  }
  $("goodBack").onclick = () => ctx.showTab("today");
  $("goodSave").onclick = saveWeek;
  $("goodRemind").onclick = () => setSettings({ ...settings, on: !settings.on });
  sel.onchange = () => setSettings({ ...settings, day: +sel.value });
  $("goodOpen").onclick = () => { ctx.closeSettings(); open(); };
}

/* Opens the screen with this week's entry filled in, or empty rows. */
export function open() {
  const k = (openWeek = key()), cur = entries().find(e => e.week === k);
  for (let i = 0; i < 3; i++) {
    $("goodT" + i).value = cur?.items[i]?.text || "";
    $("goodW" + i).value = cur?.items[i]?.why || "";
  }
  $("goodWeekLbl").textContent = "Week of " + fmt(k);
  ctx.showTab("good");
}

async function saveWeek() {
  const rows = [0, 1, 2].map(i => ({ text: $("goodT" + i).value, why: $("goodW" + i).value }));
  const r = saveGoodWeek(entries(), openWeek || key(), rows);
  if (r.error) { toast(r.error); $("goodT0").focus(); return; }
  ctx.state.good = r.good;
  if (await ctx.persist()) toast("Saved. Nice noticing.");
  render();
}

function renderCard() {
  const card = $("goodCard");
  card.hidden = !showGoodCard(today(), settings, entries(), dismissed);
  if (card.hidden) return;
  const row = el("div", "actions");
  row.append(
    smallBtn("Write them", "", open),
    smallBtn("Not this week", "ghost", async () => { dismissed = key(); await setMeta("goodDismissed", dismissed); render(); }),
  );
  card.replaceChildren(el("b", null, "Three good things this week?"), el("span", "hint", "Small counts, and one is enough."), row);
}

function week(e) {
  const d = el("div", "look-item");
  d.append(el("b", null, "Week of " + fmt(e.week)));
  for (const it of e.items) {
    const r = el("div", "good-item");
    r.append(el("span", null, it.text));
    if (it.why) r.append(el("span", "hint", it.why));
    r.append(smallBtn("Add to Joy jar", "ghost", () => ctx.startJoyNote(it.text.slice(0, 120), it.why)));
    d.append(r);
  }
  d.append(delButton(async () => {
    ctx.state.good = entries().filter(x => x.id !== e.id);
    if (await ctx.persist()) toast("Deleted");
    render();
  }, "Delete this week?"));
  return d;
}

export function render() {
  $("goodRemind").setAttribute("aria-pressed", settings.on);
  $("goodDay").value = String(settings.day);
  renderCard();
  const past = $("goodPast");
  past.replaceChildren(...entries().map(week));
  if (!entries().length) emptyMsg(past, "Your weeks will show up here.");
}
