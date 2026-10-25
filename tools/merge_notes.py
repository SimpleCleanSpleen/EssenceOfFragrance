#!/usr/bin/env python3
"""Copy notes from a notes export into data/perfumes.json, matched by fragranticaId.

Usage:  python3 tools/merge_notes.py [notes.json] [data/perfumes.json]

Only note fields are copied (topNotes, heartNotes, baseNotes, and `notes` for
perfumes Fragrantica lists without a top/heart/base pyramid). Status, names and
everything else in perfumes.json are left alone.
"""
import json
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "data/perfumes-with-notes.json"
DEST = sys.argv[2] if len(sys.argv) > 2 else "data/perfumes.json"
FIELDS = ["topNotes", "heartNotes", "baseNotes", "notes"]


def clean(values):
    seen, out = set(), []
    for v in values or []:
        v = " ".join(str(v).split())
        if v and v.lower() not in seen:
            seen.add(v.lower())
            out.append(v)
    return out


def main():
    with open(SRC, encoding="utf-8") as f:
        notes = {str(p["fragranticaId"]): p for p in json.load(f)}
    with open(DEST, encoding="utf-8") as f:
        perfumes = json.load(f)
    filled = 0
    for p in perfumes:
        src = notes.get(p["fragranticaId"])
        if not src:
            continue
        found = {k: clean(src.get(k)) for k in FIELDS}
        if any(found.values()):
            p.update(found)
            filled += 1
    with open(DEST, "w", encoding="utf-8") as f:
        json.dump(perfumes, f, ensure_ascii=False, indent=1)
    print(f"Added notes to {filled} of {len(perfumes)} perfumes in {DEST}")


if __name__ == "__main__":
    main()
