"""
distribute.py
Reads thetypographer.json and writes each entry back to its individual
[book]/[chapter].json file, overwriting any existing content for that
book/chapter.

Files for (book, chapter) pairs NOT present in thetypographer.json are
left untouched. To remove an entry, delete it from thetypographer.json
and also delete (or edit) the corresponding chapter JSON manually if needed.

Run from the log/ directory (or from anywhere; uses the script's own location).
"""

import json
import os
from collections import defaultdict

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(BASE_DIR, "thetypographer.json")


def main():
    if not os.path.exists(INPUT_FILE):
        print("distribute.py: thetypographer.json not found. Run fetch.py first.")
        return

    with open(INPUT_FILE, encoding="utf-8") as f:
        entries = json.load(f)

    # Group by (book, chapter), preserving order from the JSON
    groups = defaultdict(list)
    for entry in entries:
        key = (entry["book"], entry["chapter"])
        verse = {"v": entry["v"], "text": entry["text"]}
        if "p" in entry:
            verse["p"] = entry["p"]
        groups[key].append(verse)

    files_written = 0
    books_written = set()

    for (book, chapter), verses in groups.items():
        book_dir = os.path.join(BASE_DIR, book)
        os.makedirs(book_dir, exist_ok=True)

        out_path = os.path.join(book_dir, f"{chapter}.json")
        payload = {"verses": verses}

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        files_written += 1
        books_written.add(book)

    print(f"distribute.py: wrote {files_written} files across {len(books_written)} books.")


if __name__ == "__main__":
    main()
