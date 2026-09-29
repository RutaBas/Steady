/* Pure logic: no DOM, no storage. Unit-tested in tests/logic.test.js. */

export const KEYS = ["mood", "thoughts", "triangles", "activities"];
export const blank = () => ({ mood: [], thoughts: [], triangles: [], activities: [] });

const pad = n => String(n).padStart(2, "0");
export const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const parseIso = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const today = () => iso(new Date());
export const addDays = (s, n) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };

/* Merge with blank() and keep only the four known array keys. */
export function normalizeState(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("invalid");
  const s = blank();
  for (const k of KEYS) if (Array.isArray(obj[k])) s[k] = obj[k];
  return s;
}

export function serializeBackup(state, now = new Date()) {
  return JSON.stringify({ app: "steady", v: 1, saved: now.toISOString(), data: normalizeState(state) });
}

/* Accepts the wrapped backup format or a bare state object (prototype-era pastes). */
export function parseBackup(text) {
  const o = JSON.parse(text);
  if (!o || typeof o !== "object") throw new Error("invalid");
  const d = o.data && typeof o.data === "object" ? o.data : o;
  if (!Array.isArray(d.mood) || !Array.isArray(d.thoughts)) throw new Error("invalid");
  for (const k of ["triangles", "activities"]) if (k in d && !Array.isArray(d[k])) throw new Error("invalid");
  return normalizeState(d);
}

export const countEntries = s => KEYS.reduce((n, k) => n + (s[k]?.length || 0), 0);

const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
const MIN_GROUP = 3;

export const ACTIVITY_FLAGS = [
  ["moved", "moved your body"],
  ["talked", "talked with someone"],
  ["enjoyed", "did something enjoyable"],
];

/* Average mood on days with vs. without each activity; only when both groups have >= 3 days. */
export function activityInsights(mood) {
  const out = [];
  for (const [key, label] of ACTIVITY_FLAGS) {
    const a = mood.filter(x => x[key]).map(x => x.mood);
    const b = mood.filter(x => !x[key]).map(x => x.mood);
    if (a.length >= MIN_GROUP && b.length >= MIN_GROUP) {
      const withAvg = avg(a), withoutAvg = avg(b);
      out.push({ key, label, diff: withAvg - withoutAvg, withAvg, withoutAvg });
    }
  }
  return out;
}

/* Mood after >= threshold hours of sleep vs. less. Entries without sleep are ignored. */
export function sleepInsight(mood, threshold = 7) {
  const withSleep = mood.filter(x => typeof x.sleep === "number" && !Number.isNaN(x.sleep));
  const a = withSleep.filter(x => x.sleep >= threshold).map(x => x.mood);
  const b = withSleep.filter(x => x.sleep < threshold).map(x => x.mood);
  if (a.length < MIN_GROUP || b.length < MIN_GROUP) return null;
  const withAvg = avg(a), withoutAvg = avg(b);
  return { diff: withAvg - withoutAvg, withAvg, withoutAvg };
}

/* Top activities over the last 7 days (today inclusive), ranked by average pleasure + mastery. */
export function topActivities(activities, todayIso, n = 5) {
  const cut = addDays(todayIso, -6);
  const agg = {};
  for (const a of activities) {
    if (a.date < cut || a.date > todayIso) continue;
    const k = a.what.toLowerCase();
    (agg[k] ||= { name: a.what, n: 0, p: 0, m: 0 });
    agg[k].n++; agg[k].p += a.p; agg[k].m += a.m;
  }
  return Object.values(agg)
    .map(o => ({ ...o, score: (o.p + o.m) / o.n }))
    .sort((x, y) => y.score - x.score)
    .slice(0, n);
}

/* "steady-sleep:YYYY-MM-DD:H.H" written by the iOS Shortcut. Returns {date, hours} or null. */
export function parseHealthClipboard(text) {
  if (typeof text !== "string") return null;
  const r = /^steady-sleep\s*:\s*(\d{4})-(\d{2})-(\d{2})\s*:\s*(\d{1,2}(?:[.,]\d+)?)$/i.exec(text.trim());
  if (!r) return null;
  const [, y, mo, d, h] = r;
  const dt = new Date(+y, +mo - 1, +d);
  if (dt.getFullYear() !== +y || dt.getMonth() !== +mo - 1 || dt.getDate() !== +d) return null;
  const hours = Math.round(parseFloat(h.replace(",", ".")) * 10) / 10;
  if (!(hours >= 0 && hours <= 24)) return null;
  return { date: `${y}-${mo}-${d}`, hours };
}

export function daysSince(isoString, now = new Date()) {
  if (!isoString) return null;
  const t = Date.parse(isoString);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / 86400000);
}
