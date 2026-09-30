/* Self-compassion break (after Kristin Neff): notice, common humanity, kindness.
   Saved breaks (what was hard, kind words) live in state.kind. */
import { today, makeBreak } from "./logic.js";
import { $, toast, entry, emptyMsg } from "./ui.js";

let ctx, step = 0;
const steps = () => document.querySelectorAll("#tab-kind .kind-step");
const syncJoy = () => ($("kindJoy").hidden = step !== 2 || !$("kindWords").value.trim());

function show(n) {
  step = n;
  steps().forEach((s, i) => (s.hidden = i !== n));
  document.querySelectorAll("#tab-kind .dots span").forEach((d, i) => d.classList.toggle("on", i <= n));
  $("kindPrev").hidden = n === 0;
  $("kindNext").hidden = n === 2;
  $("kindDone").hidden = n !== 2;
  syncJoy();
}

function reset() { $("kindHard").value = ""; $("kindWords").value = ""; show(0); }

/* Always starts fresh at step 1. */
export function open() { reset(); ctx.showTab("kind"); }

async function finish(toJoy) {
  const b = makeBreak($("kindHard").value, $("kindWords").value, today());
  if (b) {
    ctx.state.kind.unshift(b);
    if (await ctx.persist()) toast("Saved");
  }
  reset();
  render();
  if (b && toJoy) ctx.startJoyNote("Kind words to myself", b.words);
  else if (b) $("kindPastWrap").scrollIntoView({ block: "start", behavior: "smooth" });
}

export function init(c) {
  ctx = c;
  $("kindBack").onclick = () => ctx.showTab("today");
  $("kindNext").onclick = () => show(step + 1);
  $("kindPrev").onclick = () => show(step - 1);
  $("kindDone").onclick = () => finish(false);
  $("kindJoy").onclick = () => finish(true);
  $("kindWords").addEventListener("input", syncJoy);
  show(0);
}

export function render() {
  const L = $("kindList");
  L.replaceChildren();
  if (!ctx.state.kind.length) return emptyMsg(L, "Your past breaks will show up here, with the kind things you told yourself.");
  ctx.state.kind.forEach(k => L.append(entry(k.date, k.words || k.hard, "", [["What was hard", k.hard], ["Kind words", k.words]],
    async () => { ctx.state.kind = ctx.state.kind.filter(x => x.id !== k.id); if (await ctx.persist()) toast("Deleted"); render(); })));
}
