/* On-device storage: IndexedDB "steady" / store "kv".
   Key "state" holds {mood, thoughts, triangles, activities}; keys "meta:<name>" hold small values. */
import { blank, normalizeState, countEntries } from "./logic.js";

const DB_NAME = "steady", STORE = "kv", LEGACY_KEY = "steady-notebook-v1";
let dbp;

function db() {
  return dbp ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = t.onabort = () => reject(t.error);
  }));
}

const get = key => tx("readonly", s => s.get(key));
const put = (key, value) => tx("readwrite", s => s.put(value, key));

function readLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch { return null; }
}

/* Load state. If IndexedDB is empty and the prototype left data in localStorage, copy it over once.
   The localStorage copy is left untouched as a safety net. */
export async function loadState() {
  let s = null;
  try { s = await get("state"); } catch { /* fall through to legacy */ }
  if (s) return normalizeState(s);
  const legacy = readLegacy();
  if (legacy && countEntries(legacy)) {
    try { await put("state", legacy); await put("meta:migratedAt", new Date().toISOString()); } catch { /* keep in memory */ }
    return legacy;
  }
  return blank();
}

export async function saveState(state) {
  try { await put("state", normalizeState(state)); return true; }
  catch { return false; }
}

export async function getMeta(name) {
  try { return await get("meta:" + name); } catch { return undefined; }
}

export async function setMeta(name, value) {
  try { await put("meta:" + name, value); return true; } catch { return false; }
}

/* Ask the browser to keep our data under storage pressure. Best effort; iOS may ignore it. */
export async function requestPersist() {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; }
  catch { return false; }
}
