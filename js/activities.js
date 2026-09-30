/* Activity log (behavioral activation): date, 2-hour block, activity, life area, pleasure and mastery 0–10.
   A Log / Plan switch sits at the top; Plan mode lives in planner.js. */
import { today, topActivities, BLOCKS, areaCounts, predictionInsight } from "./logic.js";
import { $, esc, uid, toast, setRange, entry, emptyMsg, fmt, areaPicker, el } from "./ui.js";

let ctx, area, fromPlan = null;
function curBlock() { const h = new Date().getHours(); return h < 6 ? 9 : Math.min(8, Math.floor((h - 6) / 2)); }

function forgetPlan() { fromPlan = null; $("a-expect").hidden = true; }

export function setMode(m) {
  if (m !== "log") forgetPlan();
  document.querySelectorAll("#a-mode button").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === m));
  $("a-logMode").hidden = m !== "log";
  $("a-planMode").hidden = m !== "plan";
}

function resetForm() {
  $("a-what").value = ""; setRange("a-p", 5); setRange("a-m", 5); area.set(null);
  fromPlan = null; $("a-expect").hidden = true;
}

/* "Did it" on Today: open Log with the plan filled in. Saving logs it and removes the plan. */
export function prefill(p) {
  ctx.showTab("act");
  setMode("log");
  $("a-date").value = today();
  $("a-block").selectedIndex = BLOCKS.includes(p.block) ? BLOCKS.indexOf(p.block) : curBlock();
  $("a-what").value = p.what;
  area.set(p.area);
  fromPlan = p;
  $("a-expect").hidden = typeof p.expect !== "number";
  $("a-expect").textContent = `You expected ${p.expect}`;
  render();
  $("a-p").focus();
}

export function init(c) {
  ctx = c;
  BLOCKS.forEach(b => { const o = document.createElement("option"); o.textContent = b; $("a-block").append(o); });
  $("a-block").selectedIndex = curBlock();
  $("a-date").value = today();
  $("a-date").addEventListener("change", render);
  area = areaPicker("a-area");
  $("a-what").addEventListener("input", () => { if (!$("a-what").value.trim()) forgetPlan(); });
  document.querySelectorAll("#a-mode button").forEach(b => (b.onclick = () => setMode(b.dataset.mode)));
  $("a-save").onclick = async () => {
    const w = $("a-what").value.trim();
    if (!w) { toast("Write what you did first"); return; }
    const a = { id: uid(), date: $("a-date").value || today(), block: $("a-block").value, what: w, p: +$("a-p").value, m: +$("a-m").value };
    if (area.get()) a.area = area.get();
    if (typeof fromPlan?.expect === "number") a.expect = fromPlan.expect;
    ctx.state.activities.push(a);
    if (fromPlan) ctx.state.planned = ctx.state.planned.filter(x => x.id !== fromPlan.id);
    if (await ctx.persist()) { toast("Activity added"); resetForm(); }
    ctx.renderAll();
  };
}

function insight(label, text) {
  const d = el("div", "insight");
  d.append(el("span", "pill", label), el("span", null, text));
  return d;
}

export function render() {
  const S = ctx.state, day = $("a-date").value || today();
  $("a-daylabel").textContent = day === today() ? "Logged today" : "Logged on " + fmt(day);
  const L = $("a-list");
  L.replaceChildren();
  const list = S.activities.filter(a => a.date === day).sort((a, b) => BLOCKS.indexOf(a.block) - BLOCKS.indexOf(b.block));
  if (!list.length) emptyMsg(L, "Nothing logged for this day yet.");
  list.forEach(a => L.append(entry(a.date, `${a.block} · ${a.what}`, `P${a.p} M${a.m}`,
    [["Time", a.block], ["Activity", a.what], ["Life area", a.area], ["Pleasure", a.p], ["Expected", a.expect], ["Mastery", a.m]],
    async () => { ctx.state.activities = ctx.state.activities.filter(x => x.id !== a.id); if (await ctx.persist()) toast("Deleted"); render(); })));

  const top = topActivities(S.activities, today());
  const T = $("a-top");
  T.replaceChildren();
  if (!top.length) emptyMsg(T, "Log a few activities and your top ones will show up here.");
  top.forEach(o => {
    const d = document.createElement("div");
    d.className = "insight";
    d.innerHTML = `<span class="pill">${(o.p / o.n).toFixed(0)} P · ${(o.m / o.n).toFixed(0)} M</span><span>${esc(o.name)}${o.n > 1 ? ` <span class="hint">×${o.n}</span>` : ""}</span>`;
    T.append(d);
  });

  const I = $("a-insights");
  I.replaceChildren();
  const areas = areaCounts(S.activities, today());
  if (areas.length) I.append(insight("This week", areas.map(o => `${o.n} ${o.area}`).join(" · ")));
  const pr = predictionInsight(S.activities);
  if (pr) I.append(insight("Predictions", `Things went better than you expected ${pr.better} of ${pr.total} times.`));
}
