/* Mood check-in: 1–10 scale, sleep, outside, activity toggles, note; chart + insights + history. */
import { iso, parseIso, today, activityInsights, sleepInsight, parseHealthClipboard } from "./logic.js";
import { $, esc, fmt, uid, toast, toggle, isOn, setOn, entry, emptyMsg } from "./ui.js";

let ctx, moodVal = null, chartDays = 28;
const scale = () => $("m-scale");

export function init(c) {
  ctx = c;
  for (let i = 1; i <= 10; i++) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = i; b.setAttribute("aria-pressed", "false");
    b.onclick = () => { moodVal = i; [...scale().children].forEach(x => x.setAttribute("aria-pressed", +x.textContent === i)); };
    scale().append(b);
  }
  ["m-moved", "m-talked", "m-enjoyed"].forEach(id => toggle($(id)));
  $("m-date").value = today();
  $("m-date").addEventListener("change", loadForm);
  $("m-save").onclick = save;
  $("m-health").onclick = fillFromHealth;
  document.querySelectorAll("#m-range button").forEach(b => (b.onclick = () => {
    chartDays = +b.dataset.days;
    document.querySelectorAll("#m-range button").forEach(x => x.setAttribute("aria-pressed", x === b));
    renderChart();
  }));
}

function loadForm() {
  const e = ctx.state.mood.find(m => m.date === $("m-date").value);
  moodVal = e ? e.mood : null;
  [...scale().children].forEach(c => c.setAttribute("aria-pressed", !!e && +c.textContent === e.mood));
  $("m-sleep").value = e?.sleep ?? ""; $("m-outside").value = e?.outside ?? ""; $("m-note").value = e?.note ?? "";
  setOn("m-moved", e?.moved); setOn("m-talked", e?.talked); setOn("m-enjoyed", e?.enjoyed);
  $("m-save").textContent = e ? "Update check-in" : "Save check-in";
}

const num = id => { const v = $(id).value; if (v === "") return null; const n = +v; return Number.isFinite(n) ? n : null; };

async function save() {
  if (!moodVal) { toast("Pick a mood from 1 to 10 first"); return; }
  const date = $("m-date").value || today();
  const S = ctx.state;
  const rec = { id: uid(), date, mood: moodVal, sleep: num("m-sleep"), outside: num("m-outside"),
    moved: isOn("m-moved"), talked: isOn("m-talked"), enjoyed: isOn("m-enjoyed"), note: $("m-note").value.trim() };
  const i = S.mood.findIndex(m => m.date === date), upd = i >= 0;
  if (upd) S.mood[i] = rec; else S.mood.push(rec);
  S.mood.sort((a, b) => (a.date < b.date ? 1 : -1));
  if (await ctx.persist()) toast(upd ? "Check-in updated" : "Check-in saved");
  render();
  ctx.afterMoodSave(rec);
}

async function fillFromHealth() {
  let text = null;
  try { text = await navigator.clipboard.readText(); } catch { /* denied or unsupported */ }
  const r = parseHealthClipboard(text);
  if (!r) {
    toast('No Health sleep found on the clipboard. Run the "Steady sleep" shortcut first.',
      { label: "How to set it up", onClick: () => ctx.openSheet("healthGuide") });
    return;
  }
  $("m-sleep").value = r.hours;
  toast(`Filled ${r.hours} h (night ending ${fmt(r.date)})`);
}

function sampleData() {
  const base = [5, 4, 4, 5, 6, 5, 3, 4, 5, 6, 6, 7, 5, 6], t = new Date(), out = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(t); d.setDate(t.getDate() - i); out.push({ date: iso(d), mood: base[13 - i] }); }
  return out;
}

function renderChart() {
  const S = ctx.state, box = $("chart"), real = S.mood.length >= 2, data = real ? S.mood : sampleData();
  const days = real ? chartDays : 14, W = 520, H = 230, L = 34, R = 12, T = 14, B = 30, pw = W - L - R, ph = H - T - B;
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(end.getDate() - (days - 1));
  const x = d => L + pw * Math.round((parseIso(d) - start) / 86400000) / (days - 1 || 1);
  const y = v => T + ph * (1 - (v - 1) / 9);
  const byDate = Object.fromEntries(data.map(m => [m.date, m.mood]));
  const segs = [], pts = []; let cur = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); const k = iso(d);
    if (byDate[k] != null) { const p = [x(k), y(byDate[k])]; cur.push(p); pts.push([k, byDate[k], ...p]); }
    else if (cur.length) { segs.push(cur); cur = []; }
  }
  if (cur.length) segs.push(cur);
  let g = "";
  [1, 4, 7, 10].forEach(v => {
    g += `<line class="c-grid${v === 1 ? "" : " dash"}" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="c-tick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  });
  const nT = days <= 28 ? 4 : 6;
  for (let i = 0; i < nT; i++) {
    const d = new Date(start); d.setDate(start.getDate() + Math.round(i * (days - 1) / (nT - 1))); const k = iso(d);
    g += `<text class="c-tick" x="${x(k)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : i === nT - 1 ? "end" : "middle"}">${esc(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }))}</text>`;
  }
  const k = real ? "" : " ex";
  segs.forEach(s => {
    const dPath = s.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    if (s.length > 1) g += `<path class="c-area${k}" d="${dPath} L${s[s.length - 1][0].toFixed(1)} ${T + ph} L${s[0][0].toFixed(1)} ${T + ph} Z"/><path class="c-line${k}" d="${dPath}"/>`;
  });
  pts.forEach((p, i) => {
    const last = i === pts.length - 1;
    g += `<circle class="c-dot${k}${last ? " last" : ""}" cx="${p[2]}" cy="${p[3]}" r="${last ? 5 : 3}"><title>${esc(fmt(p[0]))}: ${p[1]}</title></circle>`;
  });
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${real ? "Mood chart" : "Example mood chart"}">${g}</svg>${real ? "" : '<span class="example-tag">Example</span>'}`;

  const ins = $("insights");
  if (!real) { ins.innerHTML = `<p class="lede flush">This is example data. Your own chart appears after two check-ins.</p>`; return; }
  const startIso = iso(start);
  const recent = S.mood.filter(m => m.date >= startIso);
  const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
  const sign = d => (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(1);
  const rows = [];
  if (recent.length) rows.push(`<div class="insight"><b>${avg(recent.map(m => m.mood)).toFixed(1)}</b><span>average mood over this period (${recent.length} check-in${recent.length > 1 ? "s" : ""})</span></div>`);
  const sl = sleepInsight(S.mood);
  if (sl) rows.push(`<div class="insight"><b>${sign(sl.diff)}</b><span>on days after 7+ hours of sleep (${sl.withAvg.toFixed(1)} vs ${sl.withoutAvg.toFixed(1)})</span></div>`);
  for (const r of activityInsights(S.mood)) rows.push(`<div class="insight"><b>${sign(r.diff)}</b><span>on days you ${esc(r.label)} (${r.withAvg.toFixed(1)} vs ${r.withoutAvg.toFixed(1)})</span></div>`);
  if (S.mood.length < 10 && rows.length < 2) rows.push(`<p class="lede flush">Patterns show up here once you have a few check-ins with and without each activity.</p>`);
  ins.innerHTML = rows.join("");
}

export function render() {
  loadForm();
  renderChart();
  const S = ctx.state, L = $("m-list");
  L.replaceChildren();
  if (!S.mood.length) return emptyMsg(L, "Your check-ins will appear here.");
  S.mood.slice(0, 60).forEach(m => {
    const did = [m.moved && "moved", m.talked && "talked with someone", m.enjoyed && "did something enjoyable"].filter(Boolean).join(", ");
    L.append(entry(m.date, m.note || did || "Check-in", "Mood " + m.mood,
      [["Hours slept", m.sleep ?? ""], ["Minutes outside", m.outside ?? ""], ["Did", did], ["Note", m.note]],
      async () => { ctx.state.mood = ctx.state.mood.filter(x => x.id !== m.id); if (await ctx.persist()) toast("Deleted"); render(); }));
  });
}
