/* Boot: load on-device state, wire the Today tab and its sub-pages, four worksheets and settings sheet, register the service worker. */
import { today } from "./logic.js";
import { loadState, saveState, requestPersist } from "./store.js";
import { $, toast, wireRanges } from "./ui.js";
import * as mood from "./mood.js";
import * as thoughts from "./thoughts.js";
import * as triangle from "./triangle.js";
import * as activities from "./activities.js";
import * as planner from "./planner.js";
import * as backup from "./backup.js";
import * as support from "./support.js";
import * as todayTab from "./today.js";
import * as chips from "./chips.js";
import * as joy from "./joy.js";
import * as look from "./lookforward.js";
import * as good from "./goodthings.js";

const TABS = ["today", "joy", "look", "good", "mood", "thought", "tri", "act"];
const SUBPAGES = ["joy", "look", "good"]; // opened from Today; not in the tab bar
const sheets = [todayTab, joy, look, mood, thoughts, triangle, activities, planner, good];
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
  showTab: name => showTab(name),
  getChips: () => chips.get(),
  setChips: list => chips.set(list),
  joyCount: () => joy.count(),
  openJoyRandom: () => joy.openRandom(),
  joyExport: () => joy.exportItems(),
  joyReplace: list => joy.replaceAll(list),
  startJoyNote: (title, text) => joy.startNote(title, text),
  closeSettings: () => backup.closeSheet(),
  logFromPlan: p => activities.prefill(p),
};

function renderAll() { sheets.forEach(s => s.render()); }

function setTodayLabel() {
  $("todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function showTab(name) {
  const navName = SUBPAGES.includes(name) ? "today" : name;
  document.querySelectorAll("nav.tabs button").forEach(b => { const on = b.dataset.tab === navName; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
  document.querySelectorAll("section.tab").forEach(s => (s.hidden = s.id !== "tab-" + name));
  if (name === "today") { todayTab.render(); look.render(); planner.render(); good.render(); } // status may have changed on another tab
  window.scrollTo(0, 0);
}

/* The app always opens on Today; a #tab link (e.g. #thought) opens that worksheet instead. */
function initTabs() {
  const tabs = [...document.querySelectorAll("nav.tabs button")];
  tabs.forEach((b, i) => {
    b.addEventListener("click", () => showTab(b.dataset.tab));
    b.addEventListener("keydown", e => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); showTab(n.dataset.tab); }
    });
  });
  const hash = location.hash.slice(1);
  showTab(TABS.includes(hash) ? hash : "today");
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (TABS.includes(h)) showTab(h); });
}

function initAppearance() {
  const btns = [...document.querySelectorAll("#themeSeg button")];
  const mark = t => btns.forEach(b => b.setAttribute("aria-pressed", b.dataset.themeOpt === t));
  mark(window.steadyTheme?.get() ?? "auto");
  btns.forEach(b => (b.onclick = () => { window.steadyTheme?.set(b.dataset.themeOpt); mark(b.dataset.themeOpt); }));
}

/* If the app stays open past midnight, move the date pickers that were on "today" to the new day. */
function watchDayChange() {
  let day = today();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (today() === day) { todayTab.render(); return; } // greeting follows the time of day
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
  await Promise.all([support.load(), chips.load(), joy.load(), look.load(), good.load()]);
  wireRanges();
  sheets.forEach(s => s.init(ctx));
  backup.init(ctx);
  support.init(ctx);
  initAppearance();
  initTabs();
  renderAll();
  backup.updateNudge();
  watchDayChange();
  requestPersist();
  registerSW();
}

boot();
