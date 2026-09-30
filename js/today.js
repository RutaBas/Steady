/* Today tab: greeting, "How are you arriving?", today's status + week mini chart, worksheet cards. */
import { greeting, weekSeries, todayStatus, today, parseIso } from "./logic.js";
import { $, esc, fmt } from "./ui.js";

let ctx;

const REPLIES = {
  okay: { text: "A quick check-in helps you spot patterns over time.", buttons: [["Check in", "mood"]] },
  low: {
    text: "That sounds hard. When energy is low, one small action can help. A shower, a short walk or a glass of water all count.",
    buttons: [["Log one small thing", "act"], ["Just check in", "mood", "ghost"]],
    crisis: true,
  },
  thought: { text: "Let's slow it down. Write the thought, then look at the evidence.", buttons: [["Start a thought record", "thought"]] },
  reflect: { text: "Map how your thoughts, feelings and actions feed each other.", buttons: [["Open the CBT triangle", "tri"]] },
};

function goBtn(label, tab, style = "") {
  const b = document.createElement("button");
  b.type = "button"; b.className = `btn ${style} small`.replace(/\s+/g, " ").trim(); b.textContent = label;
  b.onclick = () => ctx.showTab(tab);
  return b;
}

function choose(key) {
  const chips = document.querySelectorAll("#arrive .chip"), reply = $("arriveReply");
  const same = reply.dataset.key === key && !reply.hidden;
  chips.forEach(c => c.setAttribute("aria-pressed", !same && c.dataset.arrive === key));
  if (same) { reply.hidden = true; reply.dataset.key = ""; return; }
  const r = REPLIES[key];
  reply.replaceChildren();
  const p = document.createElement("p"); p.textContent = r.text;
  const row = document.createElement("div"); row.className = "actions";
  r.buttons.forEach(([label, tab, style]) => row.append(goBtn(label, tab, style)));
  reply.append(p, row);
  if (key === "low") {
    const k = document.createElement("button");
    k.type = "button"; k.className = "btn ghost small start"; k.textContent = "Be kind to yourself";
    k.onclick = () => ctx.openKind();
    reply.append(k);
  }
  if (key === "low" && ctx.joyCount() > 0) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn ghost small start"; b.textContent = "See something that made you smile";
    b.onclick = () => ctx.openJoyRandom();
    reply.append(b);
  }
  if (r.crisis) {
    const h = document.createElement("span"); h.className = "hint";
    h.innerHTML = 'If you feel unsafe, <a href="tel:988">call</a> or <a href="sms:988">text</a> 988 any time.';
    reply.append(h);
  }
  reply.dataset.key = key;
  reply.hidden = false;
}

export function init(c) {
  ctx = c;
  document.querySelectorAll("#arrive .chip").forEach(b => (b.onclick = () => choose(b.dataset.arrive)));
  document.querySelectorAll(".sheetcard").forEach(b => (b.onclick = () => (b.dataset.go === "kind" ? ctx.openKind() : ctx.showTab(b.dataset.go))));
}

function line(text, btn) {
  const d = document.createElement("div"); d.className = "row-line";
  const t = document.createElement("span"); t.textContent = text;
  d.append(t, btn);
  return d;
}

function miniChart(series) {
  const W = 280, H = 64, P = 8, x = i => P + i * (W - 2 * P) / 6, y = v => P + (H - 2 * P) * (1 - (v - 1) / 9);
  let g = "", seg = [];
  const flush = () => { if (seg.length > 1) g += `<path class="c-line" d="${seg.map((p, i) => (i ? "L" : "M") + p.join(" ")).join(" ")}"/>`; seg = []; };
  series.forEach((d, i) => { if (d.mood == null) flush(); else seg.push([x(i).toFixed(1), y(d.mood).toFixed(1)]); });
  flush();
  series.forEach((d, i) => { if (d.mood != null) g += `<circle class="c-dot${i === 6 ? " last" : ""}" cx="${x(i)}" cy="${y(d.mood)}" r="${i === 6 ? 4.5 : 3}"><title>${esc(fmt(d.date))}: ${d.mood}</title></circle>`; });
  const label = "Mood this week: " + series.map(d => d.mood ?? "no check-in").join(", ");
  const days = series.map(d => `<span>${esc(parseIso(d.date).toLocaleDateString(undefined, { weekday: "narrow" }))}</span>`).join("");
  return `<span class="hint">This week</span><svg class="mini" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><line class="c-grid dash" x1="${P}" x2="${W - P}" y1="${y(5.5)}" y2="${y(5.5)}"/>${g}</svg><div class="mini-days" aria-hidden="true">${days}</div>`;
}

export function render() {
  const now = new Date(), t = today();
  $("greeting").textContent = greeting(now.getHours());
  const st = todayStatus(ctx.state, t), box = $("todayStatus");
  box.replaceChildren(
    st.checkedIn ? line(`Checked in · mood ${st.mood}`, goBtn("Update", "mood", "ghost")) : line("Not checked in yet", goBtn("Check in", "mood")),
    st.activities ? line(`${st.activities} ${st.activities === 1 ? "activity" : "activities"} logged today`, goBtn("Add", "act", "ghost"))
      : line("No activities logged yet", goBtn("Log one", "act", "ghost")),
  );
  const series = weekSeries(ctx.state.mood, t);
  $("todayWeek").innerHTML = series ? miniChart(series) : "";
}
