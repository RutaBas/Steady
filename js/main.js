/* Boot: load on-device state, wire the four worksheets and the backup sheet, register the service worker. */
import { today } from "./logic.js";
import { loadState, saveState, requestPersist } from "./store.js";
import { $, toast, wireRanges } from "./ui.js";
import * as mood from "./mood.js";
import * as thoughts from "./thoughts.js";
import * as triangle from "./triangle.js";
import * as activities from "./activities.js";
import * as backup from "./backup.js";
import * as support from "./support.js";

const TAB_KEY = "steady-notebook-v1-tab", TABS = ["mood", "thought", "tri", "act"];
const sheets = [mood, thoughts, triangle, activities];
let state;

const ctx = {
  get state() { return state; },
  set state(v) { state = v; },
  async persist() {
    const ok = await saveState(state);
    if (!ok) toast("Couldn't save on this device. Copy a backup to keep this entry.");
    backup.updateNudge();
    return ok;
  },
  renderAll,
  openSheet: id => backup.openSheet(id),
  getSupport: () => support.get(),
  setSupport: s => support.set(s),
  afterMoodSave: e => support.afterMoodSave(e),
};

function renderAll() { sheets.forEach(s => s.render()); }

function setTodayLabel() {
  $("todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function initTabs() {
  const tabs = [...document.querySelectorAll("nav.tabs button")];
  const show = name => {
    tabs.forEach(b => { const on = b.dataset.tab === name; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
    document.querySelectorAll("section.tab").forEach(s => (s.hidden = s.id !== "tab-" + name));
    try { localStorage.setItem(TAB_KEY, name); } catch { /* private mode */ }
    window.scrollTo(0, 0);
  };
  tabs.forEach((b, i) => {
    b.addEventListener("click", () => show(b.dataset.tab));
    b.addEventListener("keydown", e => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); show(n.dataset.tab); }
    });
  });
  let start = "mood";
  try { start = localStorage.getItem(TAB_KEY) || "mood"; } catch { /* ignore */ }
  const hash = location.hash.slice(1);
  if (TABS.includes(hash)) start = hash;
  show(TABS.includes(start) ? start : "mood");
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (TABS.includes(h)) show(h); });
}

/* If the app stays open past midnight, move the date pickers that were on "today" to the new day. */
function watchDayChange() {
  let day = today();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || today() === day) return;
    ["m-date", "a-date"].forEach(id => { if ($(id).value === day) $(id).value = today(); });
    day = today();
    setTodayLabel();
    renderAll();
  });
}

function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  // Reload only when an update replaces an existing worker, not on the very first install.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloading) { reloading = true; location.reload(); }
  });
  navigator.serviceWorker.register("sw.js").then(reg => {
    const offer = w => {
      $("updateBar").hidden = false;
      $("updateReload").onclick = () => w.postMessage({ type: "SKIP_WAITING" });
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); });
    });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => { /* app still works online without SW */ });
}

async function boot() {
  setTodayLabel();
  state = await loadState();
  await support.load();
  wireRanges();
  sheets.forEach(s => s.init(ctx));
  backup.init(ctx);
  support.init(ctx);
  initTabs();
  renderAll();
  backup.updateNudge();
  watchDayChange();
  requestPersist();
  registerSW();
}

boot();
