/* Look forward to: a short list of dated things to look forward to. Items live in state.plans.
   Today shows the soonest one and a gentle "How was it?" nudge for a recent past one. */
import { today, daysUntil, untilLabel, splitPlans, planNudge, addPlan } from "./logic.js";
import { getMeta, setMeta } from "./store.js";
import { $, fmt, toast, delButton } from "./ui.js";

let ctx, shown = true;

export async function load() { shown = (await getMeta("lookForward")) !== false; }

export function init(c) {
  ctx = c;
  $("lookBack").onclick = () => ctx.showTab("today");
  $("lookAdd").onclick = add;
  $("lookName").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); add(); } });
  $("lookShow").onclick = async () => {
    shown = !shown;
    $("lookShow").setAttribute("aria-pressed", shown);
    await setMeta("lookForward", shown);
    render();
  };
  $("lookOpen").onclick = () => { ctx.closeSettings(); ctx.showTab("look"); };
}

const plans = () => ctx.state.plans;

async function save(next, msg) {
  ctx.state.plans = next;
  const ok = await ctx.persist();
  render();
  if (ok && msg) toast(msg);
}

function add() {
  const t = today(), r = addPlan(plans(), $("lookName").value, $("lookDate").value, t);
  if (r.error) { toast(r.error); (r.error.includes("name") ? $("lookName") : $("lookDate")).focus(); return; }
  $("lookName").value = "";
  save(r.plans, "Added. Something to look forward to.");
}

const markDone = id => save(plans().map(p => (p.id === id ? { ...p, done: true } : p)));
const remove = id => save(plans().filter(p => p.id !== id), "Deleted");

function toJoy(p) {
  markDone(p.id);
  ctx.startJoyNote(p.name, fmt(p.date) + ". ");
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function button(label, style, onClick) {
  const b = el("button", `btn ${style} small`.replace(/\s+/g, " ").trim(), label);
  b.type = "button"; b.onclick = onClick;
  return b;
}

/* "yesterday" / "on Fri, Sep 25" for the nudge. */
const whenPast = (date, t) => (daysUntil(date, t) === -1 ? "yesterday" : "on " + fmt(date));

function renderCard(t) {
  const card = $("lookCard");
  card.hidden = !shown;
  if (!shown) return;
  const { upcoming } = splitPlans(plans(), t), nudge = planNudge(plans(), t);
  card.replaceChildren();
  if (upcoming.length) {
    const next = upcoming[0], open = el("button", "look-next");
    open.type = "button";
    open.append(el("span", "lbl", "Looking forward to"), el("b", null, next.name),
      el("span", "look-when", untilLabel(daysUntil(next.date, t))));
    if (upcoming.length > 1) open.append(el("span", "hint", `+${upcoming.length - 1} more`));
    open.onclick = () => ctx.showTab("look");
    card.append(open);
  } else {
    const row = el("div", "row-line");
    row.append(el("span", null, "Something to look forward to?"), button("Add", "ghost", () => { ctx.showTab("look"); $("lookName").focus(); }));
    card.append(row);
  }
  if (nudge) {
    const box = el("div", "look-nudge");
    box.setAttribute("role", "status");
    box.append(el("span", null, `${nudge.name} was ${whenPast(nudge.date, t)}. How was it?`));
    const row = el("div", "actions");
    row.append(button("Add to Joy jar", "", () => toJoy(nudge)), button("Dismiss", "ghost", () => markDone(nudge.id)));
    box.append(row);
    card.append(box);
  }
}

function item(p, t, past) {
  const d = el("div", "look-item");
  const head = el("div", "look-head");
  head.append(el("b", null, p.name), el("span", "hint", fmt(p.date) + (past ? "" : " · " + untilLabel(daysUntil(p.date, t)))));
  d.append(head);
  const del = delButton(() => remove(p.id), "Delete this?");
  if (past) del.prepend(button("Add to Joy jar", "ghost", () => toJoy(p)));
  d.append(del);
  return d;
}

function renderList(t) {
  const { upcoming, past } = splitPlans(plans(), t);
  $("lookDate").min = t;
  if (!$("lookDate").value || $("lookDate").value < t) $("lookDate").value = t;
  const up = $("lookUpcoming"), ps = $("lookPast");
  up.replaceChildren(...upcoming.map(p => item(p, t, false)));
  if (!upcoming.length) up.innerHTML = '<div class="empty">Nothing planned yet. Small things count: a walk with a friend, a show you like, a favorite meal.</div>';
  ps.replaceChildren(...past.map(p => item(p, t, true)));
  $("lookPastWrap").hidden = !past.length;
}

export function render() {
  const t = today();
  $("lookShow").setAttribute("aria-pressed", shown);
  renderCard(t);
  renderList(t);
}
