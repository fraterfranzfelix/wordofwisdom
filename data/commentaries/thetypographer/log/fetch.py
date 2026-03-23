"""
fetch.py
Reads all [book]/[chapter].json files in this directory and consolidates
them into thetypographer.json — one flat entry per verse, sorted by
book → chapter → verse.

Run from the log/ directory (or from anywhere; uses the script's own location).
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, "thetypographer.json")

SKIP_FILES = {"thetypographer.json"}
SKIP_DIRS  = set()


def sort_key(entry):
    v = entry["v"]
    try:
        v_sort = (0, int(v))
    except (ValueError, TypeError):
        v_sort = (1, str(v))
    return (entry["book"], entry["chapter"], v_sort)


def main():
    entries = []
    books_seen = set()

    for item in sorted(os.listdir(BASE_DIR)):
        book_dir = os.path.join(BASE_DIR, item)
        if not os.path.isdir(book_dir) or item in SKIP_DIRS:
            continue

        book = item

        for fname in sorted(os.listdir(book_dir)):
            if not fname.endswith(".json"):
                continue
            stem = fname[:-5]
            try:
                chapter = int(stem)
            except ValueError:
                continue  # skip non-numeric filenames

            fpath = os.path.join(book_dir, fname)
            try:
                with open(fpath, encoding="utf-8") as f:
                    data = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                print(f"  Warning: could not read {fpath}: {e}")
                continue

            verses = data.get("verses", [])
            for verse in verses:
                entry = {"book": book, "chapter": chapter, "v": verse["v"], "text": verse["text"]}
                if "p" in verse:
                    entry["p"] = verse["p"]
                entries.append(entry)
                books_seen.add(book)

    entries.sort(key=sort_key)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f"fetch.py: wrote {len(entries)} entries from {len(books_seen)} books -> thetypographer.json")


if __name__ == "__main__":
    main()
