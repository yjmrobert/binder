# Binder

An offline Magic: The Gathering collection tracker that runs entirely in the browser. Point the camera at a card, it reads the name and collector number on the device, and the card goes in your binder. No account, no server, no network after the first load.

Live: https://www.yjmrobert.com/binder/ (the github.io address redirects there)

## What it does

- **Scan** — continuous: open the camera and pan over cards. When the frame is still and sharp and shows a different card from the last one, it is read on-device and added with a banner, a vibration and a click; uncertain matches go to the review queue without interrupting. Manual Capture and gallery photos still work. Tesseract.js reads the title band (three preprocessing variants), the type line and the collector line; the name is fuzzy-matched against the full index, the printing pinned from set code and number, and a frame-colour check guards against wrong matches.
- **Search** — the whole index with a Scryfall-style syntax subset: `t:goblin c:r mv<=2 owned`, `e:fdn -owned`, `o:draw`, `foil`. Colour-identity pip filters, owned-first sort.
- **Binder** — your collection by colour identity, nine cards a page, with set breakdowns.
- **Decks** — paste a decklist (Arena, Moxfield or plain lines), see what you own and what's missing, and get substitutes suggested from cards you already have.
- **Card art** — loaded on demand from Scryfall's image CDN by printing, over a typographic fallback card that stays when offline. Images you've viewed are cached by the service worker (up to a few thousand), so your own collection's art is available offline after one look. Toggle under More.
- **Prices and value** — per-printing prices from Scryfall's collection endpoint (TCGplayer USD, Cardmarket EUR), fetched only for what you own and the card you're viewing, cached for a day; collection total with a daily history line under More.
- **Import and export** — import ManaBox, Delver Lens, TCGplayer, Dragon Shield, Moxfield or Archidekt CSV exports (or a plain decklist) with a match preview; export CSV with Scryfall ids or a Moxfield-style list; JSON backup and restore.

Everything is stored in the browser's local storage. Add the page to your home screen for a full-screen install; the service worker caches the index and OCR engine so it keeps working with no signal. The phone's back button closes sheets and returns from card and deck screens, and tabs and cards are deep-linkable (`#binder`, `#card/Lightning%20Bolt`; `#demo/…` loads the demo collection first).

## Layout

```
index.html              app shell
css/binder.css          theme tokens (dark-first, light under prefers-color-scheme) and components
js/binder.js            the whole app: index loading, search, OCR pipeline, scan, binder, decks
js/vendor/              tesseract.js 5.1.1 main script
ocr/                    tesseract.js worker, LSTM core (simd + fallback), English model (fast int)
data/                   card index: 36k cards, 114k printings (with Scryfall ids), 774 sets
sw.js                   service worker (precache shell + data, runtime-cache OCR)
manifest.webmanifest    PWA manifest
tools/build-index.py    regenerates data/ from a magic-search-engine checkout
```

No build step. Any static file server works for local development, e.g. `python3 -m http.server` from the repo root. The camera needs a secure context, so on a phone use `localhost` over USB or a tunnel, or just the GitHub Pages deployment.

## Updating the card index

The index is derived from [taw/magic-search-engine](https://github.com/taw/magic-search-engine), which tracks new sets closely.

```
git clone --depth 1 https://github.com/taw/magic-search-engine tools/magic-search-engine
python3 tools/build-index.py tools/magic-search-engine
```

Then bump `DATA_VERSION` in `sw.js`. For app changes, bump `VERSION` in `sw.js`, the `?v=` on the two asset URLs in `index.html` and `sw.js`, and `APP_VERSION` in `js/binder.js`; open clients reload themselves once the new service worker takes over. The install step fetches with `cache: "reload"` so GitHub Pages' 10-minute HTTP cache can never seed a new version with stale files.

## Recognition notes

`recognize(file)` in `js/binder.js` is the whole pipeline:

1. Grayscale the image; OCR the top 30% (page segmentation mode 6) for the name, falling back to a sparse-text pass over the whole image if the match is weak.
2. Match against all 36k names: trigram candidate pass, then Dice similarity, with a penalty for short names matching inside long lines.
3. OCR the bottom 14% for the collector number and set code and pick the printing. Name plus number gives full confidence; name alone caps at 84%, which routes to the confirm sheet so the set is the only decision.
4. `THRESHOLD` (85) decides auto-accept versus confirm.

If the OCR engine can't start (no WebAssembly), the Scan screen says so and falls back to a demo recognizer so the rest of the flows stay usable.

## Licences and attribution

- App code: MIT.
- [tesseract.js](https://github.com/naptha/tesseract.js) and tesseract.js-core: Apache-2.0. English training data from [tesseract-ocr/tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast), Apache-2.0.
- Card index derived from [magic-search-engine](https://github.com/taw/magic-search-engine) (MIT). Card images are served by [Scryfall](https://scryfall.com) and shown whole and unaltered per their image guidelines. Card names, text, set data and images are © Wizards of the Coast; this is unofficial fan content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy) and is not endorsed by Wizards.
