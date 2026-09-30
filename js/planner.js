/* Plan mode on the Activities tab (behavioral activation): small planned activities with an optional
   life area and enjoyment guess. Items live in state.planned. */
import { today, BLOCKS, ANY_TIME, addPlanned, upcomingPlanned, prunePlanned } from "./logic.js";
import { $, fmt, toast, setRange, delButton, areaPicker, el } from "./ui.js";

let ctx, area, expectSet = false;

function setExpect(on) {
  expectSet = on;
  $("p-expectWrap").classList.toggle("skipped", !on);
  $("p-expectSkip").hidden = !on;
  if (!on) $("p-expectWrap").querySelector("output").textContent = "–";
}

export function init(c) {
  ctx = c;
  [ANY_TIME, ...BLOCKS].forEach(b => { const o = document.createElement("option"); o.textContent = b; $("p-block").append(o); });
  area = areaPicker("p-area");
  $("p-expect").addEventListener("input", () => { if (!expectSet) setExpect(true); });
  $("p-expectSkip").onclick = () => setExpect(false);
  setExpect(false);
  $("p-add").onclick = add;
  $("p-what").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); add(); } });
  // Drop plans older than the 3-day window. Not persisted here (backup.init hasn't run yet);
  // the next save writes the pruned list, and nothing renders them in the meantime.
  ctx.state.planned = prunePlanned(ctx.state.planned, today());
}

async function save(next, msg) {
  ctx.state.planned = next;
  const ok = await ctx.persist();
  ctx.renderAll();
  if (ok && msg) toast(msg);
}

async function add() {
  const r = addPlanned(ctx.state.planned, {
    what: $("p-what").value, date: $("p-date").value, block: $("p-block").value,
    area: area.get(), expect: expectSet ? +$("p-expect").value : undefined,
  }, today());
  if (r.error) { toast(r.error); (r.error.includes("day") ? $("p-date") : $("p-what")).focus(); return; }
  $("p-what").value = ""; area.set(null); setRange("p-expect", 5); setExpect(false);
  save(r.planned, "Planned. Small steps count.");
}

function item(p) {
  const d = el("div", "look-item"), head = el("div", "look-head");
  const meta = [fmt(p.date), p.block, p.area, typeof p.expect === "number" ? `you guessed ${p.expect}/10` : ""].filter(Boolean).join(" · ");
  head.append(el("b", null, p.what), el("span", "hint", meta));
  d.append(head, delButton(() => save(ctx.state.planned.filter(x => x.id !== p.id), "Deleted"), "Delete this plan?"));
  return d;
}

export function render() {
  const t = today();
  $("p-date").min = t;
  if (!$("p-date").value || $("p-date").value < t) $("p-date").value = t;
  const up = upcomingPlanned(ctx.state.planned, t);
  $("p-list").replaceChildren(...up.map(item));
  $("p-listWrap").hidden = !up.length;
}
