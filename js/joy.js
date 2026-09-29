/* Joy jar: photos, notes and links that make you smile. Stored on-device in IndexedDB (store "joy"). */
import { safeUrl, pickJoy } from "./logic.js";
import { listJoy, putJoy, deleteJoy, replaceJoy } from "./store.js";
import { $, uid, toast, delButton } from "./ui.js";

const MAX_SIDE = 1600, QUALITY = 0.82;
let ctx, items = [], draft = null, lastShown = null, viewFocus = null;
const objUrls = new Map(), dataUrls = new Map(); // id → blob: URL (display) / data: URL (backup)

export async function load() { try { items = await listJoy(); } catch { items = []; } }
export const count = () => items.length;

export function init(c) {
  ctx = c;
  $("joyOpen").onclick = () => ctx.showTab("joy");
  $("joyRandom").onclick = () => openRandom();
  $("joyBack").onclick = () => ctx.showTab("today");
  $("joyFile").addEventListener("change", pickPhoto);
  $("joyAddNote").onclick = () => startDraft({ type: "note" });
  $("joyAddLink").onclick = () => startDraft({ type: "link" });
  $("joySave").onclick = saveDraft;
  $("joyCancel").onclick = endDraft;
  $("joyViewClose").onclick = closeView;
  $("joyView").addEventListener("click", e => { if (e.target.id === "joyView") closeView(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("joyView").hidden) closeView(); });
  $("joyAnother").onclick = () => openRandom();
}

function urlFor(item) {
  if (!item.photo) return "";
  if (!objUrls.has(item.id)) objUrls.set(item.id, URL.createObjectURL(item.photo));
  return objUrls.get(item.id);
}
function forget(id) {
  if (objUrls.has(id)) URL.revokeObjectURL(objUrls.get(id));
  objUrls.delete(id); dataUrls.delete(id);
}

/* ---------- adding ---------- */

/* Scale to fit MAX_SIDE and re-encode as JPEG. Re-encoding also drops EXIF data such as location. */
async function shrink(file) {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * k); canvas.height = Math.round(img.naturalHeight * k);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", QUALITY));
    if (!blob) throw new Error("encode");
    return blob;
  } finally { URL.revokeObjectURL(src); }
}

async function pickPhoto(e) {
  const f = e.target.files?.[0];
  e.target.value = "";
  if (!f) return;
  try { startDraft({ type: "photo", photo: await shrink(f) }); }
  catch { toast("Couldn't read that photo. Try another one."); }
}

const FORM = {
  photo: { heading: "Add a photo", title: "Caption", text: "Why it makes you smile" },
  note: { heading: "Add a note", title: "Title", text: "Note" },
  link: { heading: "Add a link", title: "What is it?", text: "Why it makes you smile" },
};

function startDraft(d) {
  endDraft();
  draft = d;
  const f = FORM[d.type];
  $("joyFormTitle").textContent = f.heading;
  $("joyTitleLbl").textContent = f.title;
  $("joyTextLbl").innerHTML = f.text + (d.type === "note" ? "" : ' <span class="hint">(optional)</span>');
  $("joyUrlField").hidden = d.type !== "link";
  if (d.type === "photo") { draft.preview = URL.createObjectURL(d.photo); $("joyPreview").src = draft.preview; }
  $("joyPreview").hidden = d.type !== "photo";
  $("joyForm").hidden = false;
  $("joyForm").scrollIntoView({ block: "start", behavior: "smooth" });
  (d.type === "link" ? $("joyUrl") : $("joyTitle")).focus({ preventScroll: true });
}

function endDraft() {
  if (draft?.preview) URL.revokeObjectURL(draft.preview);
  draft = null;
  $("joyForm").hidden = true;
  ["joyUrl", "joyTitle", "joyText"].forEach(id => ($(id).value = ""));
  $("joyPreview").removeAttribute("src");
}

async function saveDraft() {
  if (!draft) return;
  const title = $("joyTitle").value.trim(), text = $("joyText").value.trim();
  const item = { id: uid(), type: draft.type, title, text, url: "", created: new Date().toISOString() };
  if (draft.type === "link") {
    item.url = safeUrl($("joyUrl").value);
    if (!item.url) { toast("That link doesn't look right. It should start with https://"); $("joyUrl").focus(); return; }
    if (!item.title) item.title = new URL(item.url).hostname.replace(/^www\./, "");
  }
  if (draft.type === "note" && !title && !text) { toast("Write something first"); $("joyText").focus(); return; }
  if (draft.type === "photo") item.photo = draft.photo;
  try { await putJoy(item); }
  catch { toast("Couldn't save. Your phone may be low on space."); return; }
  items.unshift(item);
  endDraft();
  render();
  toast("Added to your Joy jar");
}

/* ---------- viewing ---------- */

export function openRandom() {
  const item = pickJoy(items, lastShown);
  if (item) openView(item, true);
}

function openView(item, random = false) {
  lastShown = item.id;
  if ($("joyView").hidden) viewFocus = document.activeElement;
  const body = $("joyViewBody");
  body.replaceChildren();
  $("joyViewTitle").textContent = random ? "Something good" : item.type === "photo" ? "Photo" : item.type === "link" ? "Link" : "Note";
  if (item.photo) { const img = document.createElement("img"); img.src = urlFor(item); img.alt = item.title || "Photo from your Joy jar"; body.append(img); }
  if (item.title) { const h = document.createElement("h3"); h.textContent = item.title; body.append(h); }
  if (item.text) { const p = document.createElement("p"); p.textContent = item.text; body.append(p); }
  if (item.url) {
    const a = document.createElement("a");
    a.className = "btn"; a.href = item.url; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.textContent = "Open " + new URL(item.url).hostname.replace(/^www\./, "");
    body.append(a);
  }
  const when = document.createElement("span");
  when.className = "when";
  when.textContent = "Added " + new Date(item.created).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  body.append(when);
  $("joyAnother").hidden = !random || items.length < 2;
  $("joyDelRow").replaceChildren(delButton(() => remove(item.id), "Delete this from your Joy jar?"));
  $("joyView").hidden = false;
  document.body.style.overflow = "hidden";
  $("joyViewClose").focus();
}

function closeView() {
  $("joyView").hidden = true;
  document.body.style.overflow = "";
  viewFocus?.focus?.();
}

async function remove(id) {
  try { await deleteJoy(id); } catch { toast("Couldn't delete. Try again."); return; }
  items = items.filter(i => i.id !== id);
  forget(id);
  closeView();
  render();
  toast("Deleted");
}

/* ---------- rendering ---------- */

function tile(item) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "joy-item";
  if (item.photo) {
    const img = document.createElement("img"); img.src = urlFor(item); img.alt = ""; img.loading = "lazy"; b.append(img);
  } else {
    const k = document.createElement("span"); k.className = "jk"; k.textContent = item.type === "link" ? "Link" : "Note";
    const n = document.createElement("span"); n.className = "jn"; n.textContent = item.text || item.url || "";
    b.append(k, n);
  }
  const t = document.createElement("span"); t.className = "jt"; t.textContent = item.title || (item.type === "photo" ? "Photo" : "Untitled");
  b.append(t);
  b.setAttribute("aria-label", `${item.type}: ${t.textContent}`);
  b.onclick = () => openView(item);
  return b;
}

export function render() {
  const grid = $("joyGrid");
  grid.replaceChildren(...items.map(tile));
  if (!items.length) grid.innerHTML = '<div class="empty">Your jar is empty. Add a photo, a note or a link that makes you smile.</div>';
  // Today card
  $("joyCount").textContent = items.length ? `${items.length} ${items.length === 1 ? "thing" : "things"}` : "";
  $("joyLede").hidden = items.length > 0;
  $("joyRandom").hidden = !items.length;
  const photos = items.filter(i => i.photo).slice(0, 3);
  $("joyPeek").replaceChildren(...photos.map(p => { const img = document.createElement("img"); img.src = urlFor(p); img.alt = ""; return img; }));
}

/* ---------- backup ---------- */

const toDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });

function toBlob(dataUrl) {
  const [head, b64] = dataUrl.split(",");
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: head.slice(5, head.indexOf(";")) });
}

/* Items for a backup file, photos as data URLs (cached, so re-exports are quick). */
export async function exportItems() {
  const out = [];
  for (const it of items) {
    const { photo, ...rest } = it;
    if (photo) {
      if (!dataUrls.has(it.id)) dataUrls.set(it.id, await toDataUrl(photo));
      rest.photo = dataUrls.get(it.id);
    }
    out.push(rest);
  }
  return out;
}

/* Replace the whole jar (restore from backup, or [] to empty it). Photos arrive as data URLs. */
export async function replaceAll(list) {
  const next = list.map(it => (it.photo ? { ...it, photo: toBlob(it.photo) } : it));
  await replaceJoy(next);
  items.forEach(i => forget(i.id));
  items = next.sort((a, b) => (a.created < b.created ? 1 : -1));
  render();
}
