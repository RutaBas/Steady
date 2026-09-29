/* CBT triangle: situation, thoughts/behaviors/feelings, corner to change, small action, what happened afterward. */
import { today } from "./logic.js";
import { $, esc, uid, toast, entry, emptyMsg } from "./ui.js";

let ctx, corner = null;
const DEFAULT_TIP = "Behaviors is often the easiest place to start when energy is low.";
const tips = {
  Thoughts: "Try questioning the thought on the Thoughts tab. Is it completely true?",
  Behaviors: "Pick something small you can do anyway. Action often comes before motivation.",
  Feelings: "Name the feeling without judging it. Slow breathing or a short walk can soften it.",
};
const chips = () => document.querySelectorAll("#g-corner .chip");

function clear() {
  ["g-sit", "g-t", "g-b", "g-f", "g-act", "g-after"].forEach(i => ($(i).value = ""));
  corner = null;
  chips().forEach(x => x.setAttribute("aria-pressed", "false"));
  $("g-tip").textContent = DEFAULT_TIP;
}

export function init(c) {
  ctx = c;
  chips().forEach(b => (b.onclick = () => {
    corner = corner === b.dataset.v ? null : b.dataset.v;
    chips().forEach(x => x.setAttribute("aria-pressed", x.dataset.v === corner));
    $("g-tip").textContent = corner ? tips[corner] : DEFAULT_TIP;
  }));
  $("g-clear").onclick = clear;
  $("g-save").onclick = async () => {
    if (!["g-sit", "g-t", "g-b", "g-f"].some(i => $(i).value.trim())) { toast("Fill in at least one corner first"); return; }
    ctx.state.triangles.unshift({
      id: uid(), date: today(), situation: $("g-sit").value.trim(), thoughts: $("g-t").value.trim(), behaviors: $("g-b").value.trim(),
      feelings: $("g-f").value.trim(), corner, action: $("g-act").value.trim(), after: $("g-after").value.trim(),
    });
    if (await ctx.persist()) { toast("Triangle saved"); clear(); }
    render();
  };
}

export function render() {
  const L = $("g-list");
  L.replaceChildren();
  if (!ctx.state.triangles.length) return emptyMsg(L, "Saved triangles will appear here.");
  ctx.state.triangles.forEach(t => {
    const extra = document.createElement("div");
    extra.className = "field";
    const taId = "after-" + t.id;
    extra.innerHTML = `<label for="${esc(taId)}">${t.after ? "Update: what happened afterward" : "Add later: what happened afterward?"}</label><textarea id="${esc(taId)}">${esc(t.after)}</textarea>`;
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn ghost small start"; b.textContent = "Save note";
    b.onclick = async () => { t.after = extra.querySelector("textarea").value.trim(); if (await ctx.persist()) toast("Note saved"); render(); };
    extra.append(b);
    L.append(entry(t.date, t.situation || t.thoughts || "Triangle", t.corner || "",
      [["Thoughts", t.thoughts], ["Feelings", t.feelings], ["Behaviors", t.behaviors], ["Corner to change", t.corner], ["Small thing to try", t.action], ["What happened", t.after]],
      async () => { ctx.state.triangles = ctx.state.triangles.filter(x => x.id !== t.id); if (await ctx.persist()) toast("Deleted"); render(); }, extra));
  });
}
