/* Thought record: 7 steps; history shows how much the emotion dropped. */
import { today, stillHeavy } from "./logic.js";
import { $, uid, toast, setRange, entry, emptyMsg } from "./ui.js";

let ctx;
const fields = ["t-sit", "t-thought", "t-emo", "t-for", "t-against", "t-bal"];

function clear() {
  fields.forEach(i => ($(i).value = ""));
  setRange("t-belief", 70); setRange("t-emoInt", 70); setRange("t-balBelief", 50); setRange("t-emoNow", 50);
  $("t-heavy").hidden = true;
}

export function init(c) {
  ctx = c;
  $("t-clear").onclick = clear;
  $("t-heavyGo").onclick = () => ctx.openKind();
  $("t-save").onclick = async () => {
    if (!$("t-thought").value.trim() && !$("t-sit").value.trim()) { toast("Write the situation or the thought first"); return; }
    const rec = {
      id: uid(), date: today(), situation: $("t-sit").value.trim(), thought: $("t-thought").value.trim(), belief: +$("t-belief").value,
      emotion: $("t-emo").value.trim(), emoInt: +$("t-emoInt").value, evFor: $("t-for").value.trim(), evAgainst: $("t-against").value.trim(),
      balanced: $("t-bal").value.trim(), balBelief: +$("t-balBelief").value, emoNow: +$("t-emoNow").value,
    };
    ctx.state.thoughts.unshift(rec);
    if (await ctx.persist()) { toast("Thought record saved"); clear(); $("t-heavy").hidden = !stillHeavy(rec); }
    render();
  };
}

export function render() {
  const L = $("t-list");
  L.replaceChildren();
  if (!ctx.state.thoughts.length) return emptyMsg(L, "Saved thought records will appear here.");
  ctx.state.thoughts.forEach(t => {
    const shift = t.balanced ? t.emoInt - t.emoNow : null;
    L.append(entry(t.date, t.thought || t.situation, shift != null && shift > 0 ? `−${shift}%` : "", [
      ["Situation", t.situation], ["Automatic thought", t.thought ? `${t.thought} (${t.belief}% belief)` : ""],
      ["Emotion", t.emotion ? `${t.emotion} · ${t.emoInt}%` : `${t.emoInt}%`], ["Evidence for", t.evFor], ["Evidence against", t.evAgainst],
      ["Balanced thought", t.balanced ? `${t.balanced} (${t.balBelief}% belief)` : ""], ["Emotion now", t.balanced ? `${t.emoNow}%` : ""]],
      async () => { ctx.state.thoughts = ctx.state.thoughts.filter(x => x.id !== t.id); if (await ctx.persist()) toast("Deleted"); render(); }));
  });
}
