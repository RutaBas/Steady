/* Activity log (behavioral activation): date, 2-hour block, activity, pleasure and mastery 0–10. */
import { today, topActivities } from "./logic.js";
import { $, esc, fmt, uid, toast, setRange, entry, emptyMsg } from "./ui.js";

let ctx;
const blocks = ["6–8 am", "8–10 am", "10 am–12 pm", "12–2 pm", "2–4 pm", "4–6 pm", "6–8 pm", "8–10 pm", "10 pm–12 am", "Overnight"];
function curBlock() { const h = new Date().getHours(); return h < 6 ? 9 : Math.min(8, Math.floor((h - 6) / 2)); }

export function init(c) {
  ctx = c;
  blocks.forEach(b => { const o = document.createElement("option"); o.textContent = b; $("a-block").append(o); });
  $("a-block").selectedIndex = curBlock();
  $("a-date").value = today();
  $("a-date").addEventListener("change", render);
  $("a-save").onclick = async () => {
    const w = $("a-what").value.trim();
    if (!w) { toast("Write what you did first"); return; }
    ctx.state.activities.push({ id: uid(), date: $("a-date").value || today(), block: $("a-block").value, what: w, p: +$("a-p").value, m: +$("a-m").value });
    if (await ctx.persist()) { toast("Activity added"); $("a-what").value = ""; setRange("a-p", 5); setRange("a-m", 5); }
    render();
  };
}

export function render() {
  const S = ctx.state, day = $("a-date").value || today();
  $("a-daylabel").textContent = day === today() ? "Logged today" : "Logged on " + fmt(day);
  const L = $("a-list");
  L.replaceChildren();
  const list = S.activities.filter(a => a.date === day).sort((a, b) => blocks.indexOf(a.block) - blocks.indexOf(b.block));
  if (!list.length) emptyMsg(L, "Nothing logged for this day yet.");
  list.forEach(a => L.append(entry(a.date, `${a.block} · ${a.what}`, `P${a.p} M${a.m}`,
    [["Time", a.block], ["Activity", a.what], ["Pleasure", a.p], ["Mastery", a.m]],
    async () => { ctx.state.activities = ctx.state.activities.filter(x => x.id !== a.id); if (await ctx.persist()) toast("Deleted"); render(); })));

  const top = topActivities(S.activities, today());
  const T = $("a-top");
  T.replaceChildren();
  if (!top.length) return emptyMsg(T, "Log a few activities and your top ones will show up here.");
  top.forEach(o => {
    const d = document.createElement("div");
    d.className = "insight";
    d.innerHTML = `<span class="pill">${(o.p / o.n).toFixed(0)} P · ${(o.m / o.n).toFixed(0)} M</span><span>${esc(o.name)}${o.n > 1 ? ` <span class="hint">×${o.n}</span>` : ""}</span>`;
    T.append(d);
  });
}
