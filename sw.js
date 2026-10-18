/* Binder service worker.
   - Precaches the app shell and card index on install, bypassing the HTTP cache so a new
     version never installs with stale files (GitHub Pages serves 10-minute max-age).
   - Reuses the previous version's copy of the big data files when they are unchanged.
   - Caches the OCR engine on first use and card art as it is viewed (separate cache that
     survives app updates, trimmed at ART_MAX).
   - Serves everything cache-first afterwards; navigations are network-first.
   Bump VERSION whenever an app file changes; bump DATA_VERSION only when data/ changes. */
const VERSION = "binder-20261018a";
const DATA_VERSION = "data-20261018";
const ART = "binder-art";
const ART_MAX = 4000;

const APP_FILES = [
  "./",
  "./index.html",
  "./css/binder.css?v=20261018a",
  "./js/binder.js?v=20261018a",
  "./js/vendor/tesseract.min.js?v=5.1.1",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
const DATA_FILES = ["./data/sets.json", "./data/cards0.json", "./data/cards1.json"];
const RUNTIME_PREFIXES = ["/ocr/", "/data/", "/js/", "/css/", "/icons/"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(APP_FILES.map((u) => fetch(new Request(u, { cache: "reload" })).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return c.put(u, r); })));
    // Data: reuse an older cache's copy when the data version is unchanged, else fetch fresh.
    const old = (await caches.keys()).filter((k) => k !== VERSION && k !== ART);
    for (const u of DATA_FILES) {
      let hit = null;
      for (const k of old) {
        const oc = await caches.open(k);
        const stamp = await oc.match("./data-version");
        if (stamp && (await stamp.text()) === DATA_VERSION) { hit = await oc.match(u); if (hit) break; }
      }
      if (hit) await c.put(u, hit);
      else { const r = await fetch(new Request(u, { cache: "reload" })); if (!r.ok) throw new Error(u + " " + r.status); await c.put(u, r); }
    }
    await c.put("./data-version", new Response(DATA_VERSION));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== ART).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fontHost = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.hostname === "cards.scryfall.io") {
    e.respondWith(caches.open(ART).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") { c.put(req, res.clone()); trimArt(c); }
      return res;
    }))));
    return;
  }
  if (!sameOrigin && !fontHost) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { caches.open(VERSION).then((c) => c.put("./index.html", res.clone())); return res; })
      .catch(() => caches.open(VERSION).then((c) => c.match("./index.html"))));
    return;
  }
  e.respondWith(caches.open(VERSION).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && (fontHost || RUNTIME_PREFIXES.some((p) => url.pathname.includes(p)))) c.put(req, res.clone());
    return res;
  }))));
});

let trimming = false;
async function trimArt(c) {
  if (trimming) return;
  trimming = true;
  try {
    const keys = await c.keys();
    if (keys.length > ART_MAX) await Promise.all(keys.slice(0, keys.length - ART_MAX + 200).map((k) => c.delete(k)));
  } finally { trimming = false; }
}
