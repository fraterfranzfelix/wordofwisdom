"""
update-index.py — Rebuilds the inventory in index.json from files on disk.

For every author/work the inventory (books → chapters) is derived by
scanning the filesystem.  All other metadata (author name, orthodox flag,
work title, language) is preserved from the existing index.json, or read
from meta.json for works that are new to the index.

Usage:
    python update-index.py
"""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH  = os.path.join(SCRIPT_DIR, "index.json")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def build_inventory(work_dir: str) -> dict:
    """Return {book_id: [chapter_ints, ...]} by scanning work_dir."""
    inventory = {}

    try:
        book_entries = list(os.scandir(work_dir))
    except FileNotFoundError:
        return inventory

    for book_entry in book_entries:
        if not book_entry.is_dir():
            continue

        chapters = []
        try:
            for ch_entry in os.scandir(book_entry.path):
                if ch_entry.is_file() and ch_entry.name.endswith(".json"):
                    stem = os.path.splitext(ch_entry.name)[0]
                    try:
                        chapters.append(int(stem))
                    except ValueError:
                        pass  # skip non-numeric files (e.g. meta.json)
        except OSError:
            continue

        if chapters:
            inventory[book_entry.name] = sorted(chapters)

    return dict(sorted(inventory.items()))


def read_meta(work_dir: str) -> tuple:
    """Return (title, language) from meta.json, or ('', '') if absent."""
    meta_path = os.path.join(work_dir, "meta.json")
    try:
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
        title    = meta.get("title", "")
        language = meta.get("metadata", {}).get("language", "")
        return title, language
    except (FileNotFoundError, json.JSONDecodeError):
        return "", ""


def find_meta_works(base_dir: str) -> list:
    """
    Walk base_dir looking for meta.json files.
    Returns [(author_id, work_id, work_abs_path), ...].
    Stops descending once a meta.json is found so book folders are not
    mistaken for nested works.
    """
    results = []
    for root, dirs, files in os.walk(base_dir):
        rel   = os.path.relpath(root, base_dir)
        parts = rel.replace("\\", "/").split("/")

        if parts[0] == ".":
            continue  # skip base_dir itself

        if "meta.json" in files:
            author_id = parts[0]
            work_id   = "/".join(parts[1:]) if len(parts) > 1 else parts[0]
            results.append((author_id, work_id, root))
            dirs.clear()  # don't recurse into a work directory

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # 1. Load existing index
    with open(INDEX_PATH, encoding="utf-8") as f:
        existing = json.load(f)

    # Build lookup tables from existing index
    author_lookup = {}   # author_id -> {id, name, orthodox}
    work_lookup   = {}   # (author_id, work_id) -> {title, language}

    for author in existing.get("authors", []):
        aid = author["id"]
        author_lookup[aid] = {
            "id":       aid,
            "name":     author.get("name", aid),
            "orthodox": author.get("orthodox", False),
        }
        for work in author.get("works", []):
            work_lookup[(aid, work["id"])] = {
                "title":    work.get("title", ""),
                "language": work.get("language", ""),
            }

    # 2. Collect all works to process
    #    Start from existing index entries, then add any new ones found via
    #    meta.json on disk.
    #    Structure: {author_id: {work_id: work_abs_path}}
    all_works = {}

    # Seed with known works from index.json
    for (aid, wid) in work_lookup:
        work_dir = os.path.join(SCRIPT_DIR, aid, *wid.split("/"))
        all_works.setdefault(aid, {})[wid] = work_dir

    # Add works discovered via meta.json that are not yet in index.json
    for aid, wid, work_dir in find_meta_works(SCRIPT_DIR):
        if wid not in all_works.get(aid, {}):
            all_works.setdefault(aid, {})[wid] = work_dir
            print(f"  [NEW]  {aid}/{wid}")

    # 3. Build updated authors list
    new_authors = []
    for aid in sorted(all_works):
        a_meta = author_lookup.get(aid, {"id": aid, "name": aid, "orthodox": False})

        works = []
        for wid in sorted(all_works[aid]):
            work_dir  = all_works[aid][wid]
            inventory = build_inventory(work_dir)

            # Prefer existing index metadata; fall back to meta.json on disk
            ex_wm            = work_lookup.get((aid, wid), {})
            fs_title, fs_lang = read_meta(work_dir)
            title    = ex_wm.get("title")    or fs_title
            language = ex_wm.get("language") or fs_lang

            works.append({
                "id":        wid,
                "title":     title,
                "language":  language,
                "inventory": inventory,
            })

            total_entries = sum(len(chs) for chs in inventory.values())
            print(f"  {aid}/{wid}: {len(inventory)} books, {total_entries} entries")

        new_authors.append({
            "id":       a_meta["id"],
            "name":     a_meta["name"],
            "orthodox": a_meta["orthodox"],
            "works":    works,
        })

    # 4. Write updated index.json
    new_index = {"authors": new_authors}
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(new_index, f, ensure_ascii=False, indent=2)

    total_works = sum(len(a["works"]) for a in new_authors)
    print(f"\nWrote {INDEX_PATH}")
    print(f"  {len(new_authors)} authors · {total_works} works")


if __name__ == "__main__":
    main()
