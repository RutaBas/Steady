/* Offline support: precache the whole app shell, serve cache-first, clean up old caches.
   Bump VERSION whenever any file below changes so phones pick up the update. */
const VERSION = "steady-v5";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/main.js",
  "js/logic.js",
  "js/store.js",
  "js/ui.js",
  "js/mood.js",
  "js/thoughts.js",
  "js/triangle.js",
  "js/activities.js",
  "js/backup.js",
  "js/support.js",
  "js/today.js",
  "js/theme.js",
  "js/chips.js",
  "js/joy.js",
  "js/lookforward.js",
  "js/planner.js",
  "js/goodthings.js",
  "js/kindness.js",
  "fonts/bricolage-latin.woff2",
  "fonts/bricolage-latin-ext.woff2",
  "fonts/lexend-latin.woff2",
  "fonts/lexend-latin-ext.woff2",
  "icons/icon.svg",
  "icons/apple-touch-icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", e => { if (e.data?.type === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    // Navigations (including ?query or #tab links) get the cached app page.
    if (req.mode === "navigate") return (await cache.match("index.html")) || fetch(req);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return new Response("", { status: 504, statusText: "Offline" });
    }
  })());
});
