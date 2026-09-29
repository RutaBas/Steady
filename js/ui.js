/* Shared DOM helpers ported from the prototype. */
import { parseIso } from "./logic.js";

export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmt = s => parseIso(s).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

let tTimer;
/* action: optional {label, onClick} rendered as a link-style button inside the toast. */
export function toast(msg, action, ms = 2600) {
  const t = $("toast");
  t.textContent = msg;
  if (action) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "linkbtn"; b.textContent = action.label;
    b.onclick = () => { t.hidden = true; action.onClick(); };
    t.append(b);
    ms = Math.max(ms, 5000);
  }
  t.hidden = false;
  clearTimeout(tTimer);
  tTimer = setTimeout(() => (t.hidden = true), ms);
}

/* Range inputs show their value in the sibling <output>; % for 0–100 scales. */
export function wireRanges(root = document) {
  root.querySelectorAll("input[type=range]").forEach(r => {
    const o = r.parentElement.querySelector("output");
    const upd = () => (o.textContent = r.value + (r.max === "100" ? "%" : ""));
    r.addEventListener("input", upd); upd();
  });
}
export function setRange(id, v) { const r = $(id); r.value = v; r.dispatchEvent(new Event("input")); }
export const toggle = btn => btn.addEventListener("click", () => btn.setAttribute("aria-pressed", btn.getAttribute("aria-pressed") !== "true"));
export const isOn = id => $(id).getAttribute("aria-pressed") === "true";
export const setOn = (id, v) => $(id).setAttribute("aria-pressed", !!v);

function btn(cls, text, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.className = cls; b.textContent = text; b.onclick = onClick;
  return b;
}

/* Inline delete confirmation: Delete → "Delete this entry?" [Yes, delete] [Keep]. */
export function delButton(onDelete, question = "Delete this entry?") {
  const wrap = document.createElement("div");
  wrap.className = "actions";
  const ask = () => {
    wrap.replaceChildren();
    const q = document.createElement("span"); q.className = "hint"; q.textContent = question;
    const keep = btn("btn ghost small", "Keep", () => { wrap.replaceWith(delButton(onDelete, question)); });
    wrap.append(q, btn("btn danger small", "Yes, delete", onDelete), keep);
    keep.focus();
  };
  wrap.append(btn("btn danger small", "Delete", ask));
  return wrap;
}

/* A collapsible history row: date, title, optional pill; details list; optional extra node; delete control. */
export function entry(date, title, pill, rows, onDelete, extra) {
  const d = document.createElement("details");
  d.className = "entry";
  d.innerHTML = `<summary><span class="date">${esc(fmt(date))}</span><span class="title">${esc(title)}</span>${pill ? `<span class="pill">${esc(pill)}</span>` : ""}</summary>
  <div class="body"><dl>${rows.filter(([, v]) => v !== "" && v != null).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>`;
  const body = d.querySelector(".body");
  if (extra) body.append(extra);
  body.append(delButton(onDelete));
  return d;
}

export function emptyMsg(el, msg) { el.innerHTML = `<div class="empty">${esc(msg)}</div>`; }
