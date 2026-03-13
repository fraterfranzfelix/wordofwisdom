"""
pre-commit.py — Run before every git commit/push.

1. Updates "Last update DD.MM.YYYY." in index.html with today's date.
2. Deletes any individual file (not folder) over 100 MB in the project root.
3. Counts total commentary entries across all JSON files in data/commentaries/.
4. Calculates how many of the 35,527 Bible verses are covered.
   Updates both statistics in README.md.
"""

import json
import os
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent

# ---------------------------------------------------------------------------
# Task 1 — Update date in index.html
# ---------------------------------------------------------------------------
index_html = ROOT / "index.html"
html = index_html.read_text(encoding="utf-8")
today_str = date.today().strftime("%d.%m.%Y")
new_html, n = re.subn(
    r"Last update \d{2}\.\d{2}\.\d{4}\.",
    f"Last update {today_str}.",
    html,
)
if n:
    index_html.write_text(new_html, encoding="utf-8")
    print(f"[1] index.html date updated to {today_str}.")
else:
    print("[1] WARNING: 'Last update' pattern not found in index.html.")

# ---------------------------------------------------------------------------
# Task 2 — Delete files over 100 MB (never delete folders)
# ---------------------------------------------------------------------------
LIMIT = 100 * 1024 * 1024  # 100 MB in bytes
deleted = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    # Skip .git to avoid corrupting the repository
    dirnames[:] = [d for d in dirnames if d != ".git"]
    for fname in filenames:
        fpath = Path(dirpath) / fname
        try:
            size = fpath.stat().st_size
        except OSError:
            continue
        if size > LIMIT:
            print(f"[2] Deleting oversized file ({size / 1024 / 1024:.1f} MB): {fpath.relative_to(ROOT)}")
            fpath.unlink()
            deleted.append(fpath)
if not deleted:
    print("[2] No files over 100 MB found.")

# ---------------------------------------------------------------------------
# Tasks 3 & 4 — Count commentary entries and unique verse coverage
# ---------------------------------------------------------------------------
COMMENTARIES_DIR = ROOT / "data" / "commentaries"
TOTAL_BIBLE_VERSES = 35_527
EXCLUDED_NAMES = {"meta.json", "index.json"}

total_entries = 0
covered_verses: set[tuple[str, str, int]] = set()

for json_file in COMMENTARIES_DIR.rglob("*.json"):
    if json_file.name in EXCLUDED_NAMES:
        continue

    try:
        data = json.loads(json_file.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"[3/4] WARNING: Could not parse {json_file.relative_to(ROOT)}: {e}")
        continue

    verses = data.get("verses", [])
    if not isinstance(verses, list):
        continue

    total_entries += len(verses)

    # Derive (book, chapter) from the file path: .../[book]/[chapter].json
    book = json_file.parent.name
    chapter = json_file.stem  # filename without .json

    for entry in verses:
        v = entry.get("v")
        if v is None:
            continue
        v_str = str(v)
        if "-" in v_str:
            try:
                start, end = v_str.split("-", 1)
                for verse_num in range(int(start), int(end) + 1):
                    covered_verses.add((book, chapter, verse_num))
            except ValueError:
                pass
        else:
            try:
                covered_verses.add((book, chapter, int(v_str)))
            except ValueError:
                pass

unique_covered = len(covered_verses)
pct = (unique_covered / TOTAL_BIBLE_VERSES) * 100
print(f"[3] Total commentary entries: {total_entries}")
print(f"[4] Unique verses covered: {unique_covered} / {TOTAL_BIBLE_VERSES} ({pct:05.2f} %)")

# ---------------------------------------------------------------------------
# Update README.md
# ---------------------------------------------------------------------------
readme = ROOT / "README.md"
readme_text = readme.read_text(encoding="utf-8")

readme_text, n1 = re.subn(
    r"- \d+ commentary entries in total[^\n]+",
    f"- {total_entries} commentary entries in total to annotate the Bible text.",
    readme_text,
)
readme_text, n2 = re.subn(
    r"- [\d.]+ % of the Bible text[^\n]+",
    f"- {pct:05.2f} % of the Bible text covered with commentary.",
    readme_text,
)

if n1 and n2:
    readme.write_text(readme_text, encoding="utf-8")
    print("[3/4] README.md statistics updated.")
else:
    if not n1:
        print("[3] WARNING: Commentary entries line not found in README.md.")
    if not n2:
        print("[4] WARNING: Bible coverage line not found in README.md.")
