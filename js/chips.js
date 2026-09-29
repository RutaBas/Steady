/* Custom "Today I…" chips on the mood form: add your own, remove in edit mode. Saved in meta:chips. */
import { normalizeChips, addChip, today } from "./logic.js";
import { getMeta, setMeta } from "./store.js";
import { $, toast } from "./ui.js";

let chips = [], editing = false, pressed = new Set(), askLabel = null, onChange = () => {};

export async function load() { chips = normalizeChips(await getMeta("chips")); }
export const get = () => chips;

export async function set(list) {
  chips = normalizeChips(list);
  const ok = await setMeta("chips", chips);
  render();
  onChange();
  return ok;
}

/* changed: called after the chip list changes (so the mood tab can refresh its insights). */
export function init(changed) {
  onChange = changed;
  $("m-chipAdd").onclick = () => { closeAsk(); $("m-chipForm").hidden = false; $("m-chipAdd").hidden = true; $("m-chipText").focus(); };
  $("m-chipCancel").onclick = closeForm;
  $("m-chipSave").onclick = save;
  $("m-chipText").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); save(); } });
  $("m-chipEdit").onclick = () => { editing = !editing; closeAsk(); render(); };
  $("m-chipAskYes").onclick = async () => {
    const label = askLabel;
    closeAsk();
    await set(chips.filter(c => c.label !== label));
    if (!chips.length) editing = false;
    render();
    toast(`Removed “${label}”. Past check-ins keep it.`);
  };
  $("m-chipAskNo").onclick = closeAsk;
  render();
}

async function save() {
  const r = addChip(chips, $("m-chipText").value, today());
  if (r.error) { toast(r.error); $("m-chipText").focus(); return; }
  const label = r.chips[r.chips.length - 1].label;
  pressed.add(label); // you're adding it because you did it today
  closeForm();
  await set(r.chips);
}

function closeForm() { $("m-chipForm").hidden = true; $("m-chipText").value = ""; $("m-chipAdd").hidden = editing; }
function closeAsk() { askLabel = null; $("m-chipAsk").hidden = true; }

export function render() {
  const box = $("m-custom");
  box.replaceChildren();
  for (const c of chips) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip" + (editing ? " removing" : ""); b.textContent = c.label;
    if (editing) {
      b.setAttribute("aria-label", `Remove ${c.label}`);
      b.onclick = () => { askLabel = c.label; $("m-chipAskText").textContent = `Remove “${c.label}” from your options? Past check-ins keep it.`; $("m-chipAsk").hidden = false; $("m-chipAskNo").focus(); };
    } else {
      b.setAttribute("aria-pressed", pressed.has(c.label));
      b.onclick = () => { pressed.has(c.label) ? pressed.delete(c.label) : pressed.add(c.label); b.setAttribute("aria-pressed", pressed.has(c.label)); };
    }
    box.append(b);
  }
  $("m-chipAdd").hidden = editing || !$("m-chipForm").hidden;
  $("m-chipEdit").hidden = !chips.length;
  $("m-chipEdit").textContent = editing ? "Done editing" : "Edit my options";
}

/* The mood form's view of which custom chips are on. */
export const pressedLabels = () => chips.map(c => c.label).filter(l => pressed.has(l));
export function setPressed(labels) {
  pressed = new Set((labels || []).filter(l => chips.some(c => c.label === l)));
  editing = false;
  closeAsk();
  render();
}
