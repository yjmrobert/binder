#!/usr/bin/env python3
"""Rebuild data/ from a checkout of taw/magic-search-engine.

    git clone --depth 1 https://github.com/taw/magic-search-engine tools/magic-search-engine
    python3 tools/build-index.py tools/magic-search-engine

Reads index/cards.jsonl, index/sets.json and index/scryfall_ids.txt from that
checkout and writes data/cards0.json, data/cards1.json and data/sets.json. Bump VERSION in sw.js
afterwards so installed clients pick up the new files.

Row shape in cards*.json:
  [name, types, subtypes, supertypes, mana_cost, colour_identity, oracle_text,
   keywords, mana_value, printings, power, toughness]
  printings: [[set_code, collector_number, rarity, scryfall_id_hex32], ...] in release order
  scryfall_id_hex32: the card's Scryfall id without dashes; images come from
    https://cards.scryfall.io/<size>/front/<id[0]>/<id[1]>/<id>.jpg
  rarity: 0 special, 1 common, 2 uncommon, 3 rare, 4 mythic
"""
import json, os, sys

SKIP_LAYOUTS = {"token", "emblem", "art_series", "double_faced_token"}

def main(src):
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(os.path.dirname(here), "data")
    os.makedirs(out, exist_ok=True)

    with open(os.path.join(src, "index", "sets.json")) as f:
        sets = json.load(f)
    setslim = {c: [s.get("name", c), (s.get("release_date") or "")[:4], s.get("types", [])[:3]] for c, s in sets.items()}

    ids = {}
    with open(os.path.join(src, "index", "scryfall_ids.txt")) as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 3:
                ids[(parts[0], parts[1])] = parts[2].replace("-", "")

    cards = []
    with open(os.path.join(src, "index", "cards.jsonl")) as f:
        for line in f:
            name, d = json.loads(line)
            prints = [[code, p.get("n", ""), p.get("r", 0), ids.get((code, p.get("n", "")), "")] for code, p in d.get("*", [])]
            if not prints or d.get("l") in SKIP_LAYOUTS:
                continue
            cards.append([name, d.get("t", []), d.get("tb", []), d.get("tp", []), d.get("m", ""), d.get("ci", ""),
                          d.get("o", ""), d.get("k", []), d.get("v", 0), prints, d.get("p"), d.get("to")])

    half = len(cards) // 2
    for i, part in enumerate([cards[:half], cards[half:]]):
        with open(os.path.join(out, f"cards{i}.json"), "w") as f:
            f.write(json.dumps(part, separators=(",", ":"), ensure_ascii=False))
    with open(os.path.join(out, "sets.json"), "w") as f:
        json.dump(setslim, f, separators=(",", ":"), ensure_ascii=False)
    print(f"{len(cards)} cards, {sum(len(c[9]) for c in cards)} printings, {len(setslim)} sets")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
