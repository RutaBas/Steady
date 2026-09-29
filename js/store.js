/* On-device storage: IndexedDB "steady".
   Store "kv": key "state" holds {mood, thoughts, triangles, activities}; keys "meta:<name>" hold small values.
   Store "joy" (added in DB version 2): Joy jar items keyed by id, photos stored as Blobs. */
import { blank, normalizeState, countEntries } from "./logic.js";

const DB_NAME = "steady", STORE = "kv", JOY = "joy", LEGACY_KEY = "steady-notebook-v1";
let dbp;

function db() {
  return dbp ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      if (!d.objectStoreNames.contains(JOY)) d.createObjectStore(JOY, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn, store = STORE) {
  return db().then(d => new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
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

/* ---------- Joy jar ---------- */

export async function listJoy() {
  const items = (await tx("readonly", s => s.getAll(), JOY)) || [];
  return items.sort((a, b) => (a.created < b.created ? 1 : -1));
}
export const putJoy = item => tx("readwrite", s => s.put(item), JOY);
export const deleteJoy = id => tx("readwrite", s => s.delete(id), JOY);

/* Replace the whole jar in one transaction (restore / delete all). */
export function replaceJoy(items) {
  return tx("readwrite", s => { s.clear(); for (const it of items) s.put(it); }, JOY);
}
