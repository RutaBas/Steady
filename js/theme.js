/* Appearance (Auto / Light / Dark). A classic script loaded in <head> so the saved choice
   applies before the first paint; main.js calls window.steadyTheme.set() when it changes. */
(function () {
  var KEY = "steady-theme", BG = { light: "#EEF2F1", dark: "#121A19" };
  function get() {
    try { var t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : "auto"; }
    catch (e) { return "auto"; }
  }
  function apply(t) {
    var root = document.documentElement;
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
    else root.removeAttribute("data-theme");
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      var sysDark = /dark/.test(metas[i].media);
      metas[i].content = t === "auto" ? (sysDark ? BG.dark : BG.light) : BG[t];
    }
  }
  function set(t) {
    try { if (t === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch (e) { /* private mode */ }
    apply(t);
  }
  window.steadyTheme = { get: get, set: set };
  apply(get());
})();
