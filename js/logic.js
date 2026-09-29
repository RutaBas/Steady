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

/* settings (optional): {support, chips}; joy (optional): Joy jar items with photos as data URLs.
   All are restored alongside the entries. */
export function serializeBackup(state, now = new Date(), settings, joy) {
  const o = { app: "steady", v: 1, saved: now.toISOString(), data: normalizeState(state) };
  const set = {};
  if (settings?.support) set.support = normalizeSupport(settings.support);
  if (settings?.chips) set.chips = normalizeChips(settings.chips);
  if (Object.keys(set).length) o.settings = set;
  if (Array.isArray(joy)) o.joy = joy;
  return JSON.stringify(o);
}

/* The optional settings block of a backup, or null (older backups and bare pastes have none). */
export function parseBackupSettings(text) {
  try {
    const st = JSON.parse(text)?.settings;
    if (!st || typeof st !== "object") return null;
    const out = {};
    if (st.support) out.support = normalizeSupport(st.support);
    if (Array.isArray(st.chips)) out.chips = normalizeChips(st.chips);
    return Object.keys(out).length ? out : null;
  } catch { return null; }
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

/* ---------- Support person (share mood with a friend) ---------- */

export const DEFAULT_SUPPORT = Object.freeze({
  name: "", phone: "", threshold: 3, prompt: true,
  message: "Rough day today (mood {mood}/10). Could you check in on me?",
});

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function normalizeSupport(o) {
  if (!o || typeof o !== "object") return { ...DEFAULT_SUPPORT };
  const t = Math.round(Number(o.threshold));
  return {
    name: str(o.name, 60),
    phone: str(o.phone, 30),
    threshold: Number.isFinite(t) ? Math.min(4, Math.max(2, t)) : DEFAULT_SUPPORT.threshold,
    prompt: o.prompt !== false,
    message: str(o.message, 500) || DEFAULT_SUPPORT.message,
  };
}

/* Offer "Let {name} know?" only for today's low check-in, once per day, when a support person is set. */
export function shouldPromptLowDay(entry, support, promptedDate, todayIso) {
  return !!(entry && support?.prompt && support.name && entry.date === todayIso &&
    entry.mood <= support.threshold && promptedDate !== todayIso);
}

export const fillMessage = (template, mood) => (template || DEFAULT_SUPPORT.message).replaceAll("{mood}", String(mood));

/* iOS Messages link. Returns null when there is no usable number (caller falls back to the share sheet). */
export function smsLink(phone, body) {
  const p = String(phone || "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  if (!/\d{3,}/.test(p)) return null;
  return `sms:${p}&body=${encodeURIComponent(body)}`;
}

const BARS = "▁▂▃▄▅▆▇█";

/* Plain-text summary of the last 7 days (today inclusive): mood scores only. Null if no check-ins. */
export function weekSummary(mood, todayIso, locale) {
  const series = weekSeries(mood, todayIso);
  if (!series) return null;
  const days = series.map(d => d.date), vals = series.map(d => d.mood);
  const got = vals.filter(v => v != null);
  const first = parseIso(days[0]), last = parseIso(days[6]);
  const md = d => d.toLocaleDateString(locale, { month: "short", day: "numeric" });
  const range = first.getMonth() === last.getMonth() ? `${md(first)}–${last.getDate()}` : `${md(first)}–${md(last)}`;
  const bars = vals.map(v => (v == null ? "_" : BARS[Math.round((v - 1) / 9 * 7)])).join("");
  const avgVal = (got.reduce((s, v) => s + v, 0) / got.length).toFixed(1);
  const low = Math.min(...got), lowDay = parseIso(days[vals.indexOf(low)]).toLocaleDateString(locale, { weekday: "short" });
  return [
    `My week in Steady (${range})`,
    `${bars}  avg ${avgVal} · ${got.length} of 7 days checked in`,
    `Daily: ${vals.map(v => (v == null ? "–" : v)).join(" ")}`,
    `Lowest: ${low} (${lowDay})`,
    "Mood 1–10 · _ or – = no check-in",
  ].join("\n");
}

/* ---------- Today tab ---------- */

export function greeting(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Hi there. Go gently tonight.";
}

/* The last 7 days (oldest first, today last) as {date, mood|null}; null when none has a check-in. */
export function weekSeries(mood, todayIso) {
  const byDate = Object.fromEntries(mood.map(m => [m.date, m.mood]));
  const series = Array.from({ length: 7 }, (_, i) => { const date = addDays(todayIso, i - 6); return { date, mood: byDate[date] ?? null }; });
  return series.some(d => d.mood != null) ? series : null;
}

export function todayStatus(state, todayIso) {
  const e = state.mood.find(m => m.date === todayIso);
  return { checkedIn: !!e, mood: e ? e.mood : null, activities: state.activities.filter(a => a.date === todayIso).length };
}

/* ---------- Custom "Today I…" chips ---------- */

export const MAX_CHIPS = 8, MAX_CHIP_LEN = 40;
const BUILT_IN_CHIPS = ACTIVITY_FLAGS.map(([, label]) => label.replace(/\byour\b/, "my"));
const sameLabel = (a, b) => a.toLowerCase() === b.toLowerCase();

export function normalizeChips(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const c of list) {
    if (!c || typeof c !== "object" || typeof c.label !== "string") continue;
    const label = c.label.trim().slice(0, MAX_CHIP_LEN);
    if (!label || out.some(x => sameLabel(x.label, label))) continue;
    const since = /^\d{4}-\d{2}-\d{2}$/.test(c.since) ? c.since : "1970-01-01";
    out.push({ label, since });
    if (out.length === MAX_CHIPS) break;
  }
  return out;
}

export function addChip(chips, raw, todayIso) {
  const label = String(raw ?? "").trim();
  if (!label) return { error: "Type what you did first." };
  if (label.length > MAX_CHIP_LEN) return { error: `Keep it under ${MAX_CHIP_LEN} characters.` };
  if (chips.some(c => sameLabel(c.label, label)) || BUILT_IN_CHIPS.some(b => sameLabel(b, label))) return { error: "You already have that one." };
  if (chips.length >= MAX_CHIPS) return { error: `You can have up to ${MAX_CHIPS} of your own.` };
  return { chips: [...chips, { label, since: todayIso }] };
}

/* Mood on days with vs. without each custom chip, counting only days since the chip was added. */
export function customInsights(mood, chips) {
  const out = [];
  for (const c of chips) {
    const span = mood.filter(x => x.date >= c.since);
    const has = x => (x.custom || []).some(l => sameLabel(l, c.label));
    const a = span.filter(has).map(x => x.mood), b = span.filter(x => !has(x)).map(x => x.mood);
    if (a.length >= MIN_GROUP && b.length >= MIN_GROUP) {
      const withAvg = avg(a), withoutAvg = avg(b);
      out.push({ label: c.label, diff: withAvg - withoutAvg, withAvg, withoutAvg });
    }
  }
  return out;
}

/* ---------- Joy jar ---------- */

/* http(s) links only; a bare domain gets https:// in front. Anything else (javascript:, data:, …) is rejected. */
export function safeUrl(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(t) ? t : (/^[\w-]+(\.[\w-]+)+([/?#]|$)/.test(t) ? "https://" + t : null);
  if (!withScheme) return null;
  try {
    const u = new URL(withScheme);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch { return null; }
}

const JOY_TYPES = ["photo", "note", "link"], PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/* Joy jar items from a backup (photos as data URLs), sanitized; null if the backup has no jar. */
export function parseBackupJoy(text) {
  let o;
  try { o = JSON.parse(text); } catch { return null; }
  if (!o || !Array.isArray(o.joy)) return null;
  const out = [];
  for (const it of o.joy.slice(0, 1000)) {
    if (!it || typeof it !== "object" || !JOY_TYPES.includes(it.type)) continue;
    const item = {
      id: typeof it.id === "string" && it.id ? it.id.slice(0, 40) : Math.random().toString(36).slice(2),
      type: it.type, title: str(it.title, 120), text: str(it.text, 5000), url: "",
      created: typeof it.created === "string" && !Number.isNaN(Date.parse(it.created)) ? it.created : new Date(0).toISOString(),
    };
    if (it.type === "link") { item.url = safeUrl(it.url); if (!item.url) continue; }
    if (it.type === "photo") { if (typeof it.photo !== "string" || !PHOTO_RE.test(it.photo)) continue; item.photo = it.photo; }
    out.push(item);
  }
  return out;
}

/* A random item, avoiding the one just shown when there is a choice. */
export function pickJoy(items, lastId, rand = Math.random) {
  if (!items.length) return null;
  const pool = items.length > 1 ? items.filter(i => i.id !== lastId) : items;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}
