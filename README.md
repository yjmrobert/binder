# Binder

An offline Magic: The Gathering collection tracker that runs entirely in the browser. Point the camera at a card, it reads the name and collector number on the device, and the card goes in your binder. No account, no server, no network after the first load.

Live: https://www.yjmrobert.com/binder/ (the github.io address redirects there)

## What it does

- **Scan** — continuous: open the camera and pan over cards. When the frame is still and sharp and shows a different card from the last one, it is read on-device and added with a banner, a vibration and a click; uncertain matches go to the review queue without interrupting. Manual Capture and gallery photos still work. Tesseract.js reads the title band (three preprocessing variants), the type line and the collector line; the name is fuzzy-matched against the full index, the printing pinned from set code and number, and a frame-colour check guards against wrong matches.
- **Search** — the whole index with a Scryfall-style syntax subset: `t:goblin c:r mv<=2 owned`, `e:fdn -owned`, `o:draw`, `foil`. Colour-identity pip filters, owned-first sort.
- **Binder** — your collection by colour identity, nine cards a page.
- **Sets** — every set with `owned / base size` and a progress bar; open one for a 3-across grid in collector order where missing cards show as desaturated art behind a dashed frame, with Missing / Owned / Variants chips, rarity pips, sort, pinch to 3–6 columns, a milestone line ("3 more to finish the rares"), and a `+` on any missing slot that adds that printing in place.
- **Types** — every creature type with `owned / cards with the type`; open one for a list split into Has the type, Makes them (cards whose text creates or names the type) and Changelings. Set codes and creature subtypes on card pages link into Sets and Types; `#set/fdn` and `#type/saproling` deep-link.
- **Decks** — paste a decklist (Arena, Moxfield or plain lines), see what you own and what's missing, and get substitutes suggested from cards you already have.
- **Card art** — loaded on demand from Scryfall's image CDN by printing, over a typographic fallback card that stays when offline. Images you've viewed are cached by the service worker (up to a few thousand), so your own collection's art is available offline after one look. Toggle under More.
- **Prices and value** — per-printing prices from Scryfall's collection endpoint (TCGplayer USD, Cardmarket EUR), fetched only for what you own and the card you're viewing, cached for a day; collection total with a daily history line under More.
- **Google Drive sync** — optional. One file in the user's own Drive (`Binder/collection.json`, scope `drive.file`, so the app sees only what it created). Every sync is a merge: copies carry stable ids and removals leave tombstones, so the result is the union of copies minus tombstones on both sides; decks and bar/colour preferences are last-writer-wins. Syncs on open, when the app goes to the background, 20 s after a change, after a scan session, and on demand. Tokens come from the browser OAuth flow (no SDK) via `oauth.html`; they last an hour and background syncs simply wait for the next sign-in when one has expired.
- **Import and export** — import ManaBox, Delver Lens, TCGplayer, Dragon Shield, Moxfield, Archidekt, Deckbox, TopDecked, MTGGoldfish, Helvault or Card Kingdom CSV exports (or a plain decklist) with a match preview. Export back to any of them: each target is written in the layout and vocabulary of that app's own export (its headers, condition grades, finish words, set names), so the file imports without remapping; plus a compact CSV with Scryfall ids and a text list. On phones the file can be shared straight into the other app. Every export round-trips through Binder's own importer to the same printings. JSON backup and restore.

The look is "Top 8": charcoal tinted toward your action colour, condensed display type, cut corners. Two colours do all the work: one for actions (buttons, active filters, alerts) and one for what you own (counts, progress, the active tab, owned cards). Settings → Colours offers presets named for the basic lands (Top 8, Plains, Island, Swamp, Mountain, Forest, Steel) or lets you pick each role from the six colours; first open asks after the bottom bar. Appearance follows the system or can be pinned dark or light; light mode is the pairings sheet, paper and black type with the same two colours darkened to pass contrast.

The bottom bar holds four destinations of your choosing; everything else sits in the More tray. On first open you pick how you play (Collector, Deck builder, Player and trader, or choose yourself) and the bar is set to match; Settings → Bottom bar, or Edit bar in the tray, reorders, swaps and resets it at any time. The first pinned destination is the home screen.

Everything is stored in the browser's local storage. Add the page to your home screen for a full-screen install; the service worker caches the index and OCR engine so it keeps working with no signal. The phone's back button closes sheets and returns from card and deck screens, and tabs and cards are deep-linkable (`#sets`, `#binder`, `#card/Lightning%20Bolt`; `#demo/…` loads the demo collection first).

## Layout

```
index.html              app shell
css/binder.css          the Top 8 theme: scheme primitives, semantic tokens (dark; light under prefers-color-scheme or data-theme), components
fonts/                  Khand, Barlow and IBM Plex Mono, latin subsets, self-hosted (OFL)
js/binder.js            the whole app: index loading, search, OCR pipeline, scan, binder, decks
js/vendor/              tesseract.js 5.1.1 main script
ocr/                    tesseract.js worker, LSTM core (simd + fallback), English model (fast int)
data/                   card index: 36k cards, 114k printings (with Scryfall ids), 774 sets with base set sizes
sw.js                   service worker (precache shell + data, runtime-cache OCR)
manifest.webmanifest    PWA manifest
oauth.html              OAuth redirect target: stores the Drive token and hands it back to the app
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

## Turning on Google Drive sync for a deployment

1. In Google Cloud, create a project, enable the Google Drive API, and configure the OAuth consent screen with only the `https://www.googleapis.com/auth/drive.file` scope (non-sensitive: no verification review needed; publish it to "In production" or test users' grants expire after seven days).
2. Create an OAuth client of type Web application. Authorized JavaScript origins: your site origin (and `http://localhost:8765` for local work). Authorized redirect URIs: `<site>/oauth.html` (and the localhost one).
3. Put the client ID in `GDRIVE_CLIENT_ID` in `js/binder.js`. With it empty, Settings explains that sync isn't set up on this install.

`tools/` has nothing to run for this; a stand-in Drive server used in testing lives with the test scripts, not the app.

## Completion rules

A set's checklist is the printings whose collector number is a plain integer from 1 to the set's base size (from magic-search-engine; the highest plain number when absent). Numbers past that, or with a letter suffix, are variants: tracked and priced under their own chip, never counted toward completion and never in Missing. Each set counts only its own printings. Basics count like any other slot. Tokens, emblems and art cards are not in the index. A card belongs to a creature type when the type is on its type line; cards that only mention it in rules text are the Makes them group; changelings are their own group so they never pad a type's denominator.

## Recognition notes

`recognize(file)` in `js/binder.js` is the whole pipeline:

1. Quality gates on the title band: Laplacian-variance sharpness and a blown-highlight share for glare. Live mode skips frames that fail; photo mode lowers confidence.
2. OCR the top 30% (page segmentation mode 6) as grayscale; if the name match is under 0.92, retry an Otsu-thresholded copy, then an inverted copy (light-on-dark titles). Photo mode also falls back to a sparse-text pass over the whole image.
3. Match against all 36k names: trigram candidate pass, then Dice similarity, with a penalty for short names matching inside long lines.
4. OCR the type line (55–67%) and compare it with the candidate's type line; OCR the bottom 14% for the collector number and set code to pin the printing; sample the side margins for the frame colour and compare with the candidate's colour identity.
5. Composite confidence: name score, plus a small bonus for an agreeing type line, a penalty for a disagreeing type line or frame colour or a soft image, then capped at 84/78/72 when the printing is not confirmed so the set becomes the only decision on the sheet. `THRESHOLD` (85) decides auto-accept versus confirm. Every signal is stored on the copy (`sig`) so weights can be retuned from real corrections.

Live mode samples the guide region every 120 ms at thumbnail size: motion against the previous sample, sharpness, and a difference hash. Three still samples whose sharpness is at least half the best seen in the last few seconds (floor 12, cap 35) trigger recognition on the full-resolution crop, but only when a card is lined up (a strong horizontal edge in the top 16% of the frame: card top plus title bar); the result is added only with corroboration (name ≥ 0.85, or name ≥ 0.6 with an agreeing type line or confirmed collector line), so garbage from a gap between cards is dropped rather than queued; the guide frame shows the state (dashed: looking, solid white: hold still, amber pulse: reading) and a full-screen flash marks each capture (white: added, amber: sent to review); the next add is armed only once the region differs from the sample taken at add time (hash distance or mean brightness change), so hovering never double-adds but flipping through four copies adds four.

If the OCR engine can't start (no WebAssembly), the Scan screen says so and falls back to a demo recognizer so the rest of the flows stay usable.

## Licences and attribution

- App code: MIT.
- Fonts: [Khand](https://github.com/itfoundry/khand), [Barlow](https://github.com/jpt/barlow) and [IBM Plex Mono](https://github.com/IBM/plex), SIL Open Font License 1.1, latin subsets via Fontsource.
- [tesseract.js](https://github.com/naptha/tesseract.js) and tesseract.js-core: Apache-2.0. English training data from [tesseract-ocr/tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast), Apache-2.0.
- Card index derived from [magic-search-engine](https://github.com/taw/magic-search-engine) (MIT). Card images are served by [Scryfall](https://scryfall.com) and shown whole and unaltered per their image guidelines. Card names, text, set data and images are © Wizards of the Coast; this is unofficial fan content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy) and is not endorsed by Wizards.
