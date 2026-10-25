#!/usr/bin/env python3
"""Convert the raw Fragrantica export into data/perfumes.json.

Usage:  python3 tools/convert.py [source.json] [output.json]

Maps each Fragrantica list to a journal status. Names are kept exactly as
exported; the in-app importer tidies punctuation ("Angel s Bread" -> "Angel's Bread").
"""
import json
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "fragrantica-with-lists.json"
OUT = sys.argv[2] if len(sys.argv) > 2 else "data/perfumes.json"

BADGE_STATUS = {"Have": "have", "Had": "had", "Want": "want"}


def status_for(item):
    lst = (item.get("list") or "").lower()
    if lst.startswith("perfumes i have"):
        return "have"
    if lst.startswith("perfumes i had"):
        return "had"
    if lst.startswith("perfumes i want"):
        return "want"
    if lst.startswith("for test"):
        return "testing"
    if lst.startswith("wardrobe"):
        return BADGE_STATUS.get(item.get("badge"), "have")
    # Reactions, Sunnydai, Reviews and anything else: perfumes she used to own.
    return "had"


def main():
    with open(SRC, encoding="utf-8") as f:
        raw = json.load(f)
    seen, out = set(), []
    for item in raw:
        fid = str(item["id"]).strip()
        if fid in seen:
            continue
        seen.add(fid)
        out.append({
            "fragranticaId": fid,
            "brand": item["brand"].strip(),
            "name": item["name"].strip(),
            "status": status_for(item),
            "fragranticaUrl": item.get("url") or "",
            "imageUrl": item.get("image") or "",
            "sourceList": item.get("list") or "",
        })
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    counts = {}
    for p in out:
        counts[p["status"]] = counts.get(p["status"], 0) + 1
    print(f"Wrote {len(out)} perfumes to {OUT}: {counts}")


if __name__ == "__main__":
    main()
