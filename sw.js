/* Binder service worker: precache the app shell and card index on install,
   cache the OCR engine the first time it is fetched, serve everything
   cache-first afterwards so the app works with no network at all.
   Bump VERSION whenever app.js, app.css or the data files change. */
const VERSION = "binder-2026-10-17c";
const ART = "binder-art"; // survives app updates; trimmed to ART_MAX entries
const ART_MAX = 4000;
const SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/vendor/tesseract.min.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./data/sets.json",
  "./data/cards0.json",
  "./data/cards1.json",
];
const RUNTIME_PREFIXES = ["ocr/", "data/", "js/", "css/", "icons/"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== ART).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fontHost = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const artHost = url.hostname === "cards.scryfall.io";
  if (artHost) {
    e.respondWith(
      caches.open(ART).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === "opaque") { c.put(req, res.clone()); trimArt(c); }
        return res;
      })))
    );
    return;
  }
  if (!sameOrigin && !fontHost) return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("./index.html", copy)); return res; }).catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && (fontHost || RUNTIME_PREFIXES.some((p) => url.pathname.includes("/" + p)))) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
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
