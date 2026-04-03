#!/usr/bin/env python3
"""
Extract inline cross-references from allioli-arndt HTML files and save
as per-book JSON files in data/translations/1914aab/crossreferences/.

Usage: python3 data/addition-process/extract_crossreferences.py
Run from the wordofwisdom/ root directory.
"""

import os
import re
import json
from collections import defaultdict
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────

INPUT_DIR  = Path("data/addition-process/allioli-arndt")
OUTPUT_DIR = Path("data/translations/1914aab/crossreferences")

# ── German book abbreviation → app book ID ─────────────────────────────────

BOOK_MAP = {
    # Pentateuch
    "1Mos": "gen",  "2Mos": "exod", "3Mos": "lev",  "4Mos": "num",  "5Mos": "deut",
    # Historical
    "Jos":  "josh", "Rich": "judg", "Ju":   "jdt",  "Rut":  "ruth",
    "1Sam": "1sam", "2Sam": "2sam", "1Koe": "1kgs", "2Koe": "2kgs",
    "1Chr": "1chr", "2Chr": "2chr", "Esr":  "ezra", "Neh":  "neh",
    "Tob":  "tob",  "Est":  "esth", "1Mak": "1macc","2Mak": "2macc",
    # Wisdom
    "Job":   "job",  "Ijob":  "job",  "Ps":    "ps",   "Spr":   "prov",
    "Koh":   "eccl", "Hohel": "song", "Weish": "wis",  "JSir":  "sir",
    # Prophets
    "Jes":    "isa",   "Jer":    "jer",   "Klagel": "lam",
    "Baru":   "bar",   "Bar":    "bar",   "Ez":     "ezek",  "Dan":    "dan",
    "Hos":    "hos",   "Joe":    "joel",  "Joel":   "joel",  "Amos":   "amos",
    "Obadja": "obad",  "Obd":    "obad",  "Jonas":  "jonah", "Mic":    "mic",
    "Nah":    "nah",   "Hab":    "hab",   "Zeph":   "zeph",
    "Hagg":   "hag",   "Sach":   "zech",  "Mal":    "mal",
    # NT Gospels & Acts
    "Mt":   "mt",    "Mk":   "mk",    "Lk":   "lk",    "Joh":  "jn",
    "Apg":  "acts",
    # NT Letters
    "Roem":  "rom",    "1Kor":  "1cor",  "2Kor":  "2cor",
    "Gal":   "gal",    "Eph":   "eph",   "Phil":  "phil",  "Kol":   "col",
    "1Thes": "1thess", "2Thes": "2thess","1Tim":  "1tim",  "2Tim":  "2tim",
    "Tit":   "tit",    "Philo": "phlm",  "Hebr":  "heb",
    "Jak":   "jam",    "1Petr": "1pet",  "2Petr": "2pet",
    "1Joh":  "1jn",   "2Joh":  "2jn",   "3Joh":  "3jn",
    "Judas": "jude",   "Offenb":"rev",
}

# HTM book code → app book ID (file naming uses same abbreviations as refs)
FILE_BOOK_MAP = {k.lower(): v for k, v in BOOK_MAP.items()}
# Add exact-case variants for the file-name book codes
FILE_BOOK_MAP.update({k: v for k, v in BOOK_MAP.items()})

# ── Helpers ────────────────────────────────────────────────────────────────

# Match the book code used inside filenames.
# Book codes may start with a digit (e.g. 1Chr, 2Sam, 4Mos).
# Pattern: optional leading digit, then letters (book code), then chapter digits.
FILE_RE = re.compile(
    r"Kategorie_BIBLIA_SACRA_(?:AT|NT)_(\d?[A-Za-z]+)(\d+)\.html$"
)

VERSE_START_RE = re.compile(r"^\s*(\d+)\.")
REF_BLOCK_RE   = re.compile(r"\[<i>(.*?)</i>\]", re.DOTALL)
ANCHOR_RE      = re.compile(r"<a[^>]*>([^<]+)</a>")
REF_TEXT_RE    = re.compile(r"^(\S+)\s+(\d+)(?:,(\S+))?")


def parse_ref(text: str) -> str | None:
    """Convert a German reference string to app format.

    '1Mos 12,3'    → 'gen:12:3'
    '1Mos 25'      → 'gen:25'
    'Lk 3,23-38'   → 'lk:3:23-38'
    '2Chr 36,4.8'  → '2chr:36:4.8'
    '1Mos 21,2ff'  → 'gen:21:2ff'
    """
    text = text.strip()
    m = REF_TEXT_RE.match(text)
    if not m:
        return None
    book_abbr, chapter, verse = m.group(1), m.group(2), m.group(3)
    book_id = BOOK_MAP.get(book_abbr)
    if not book_id:
        return None
    if verse:
        return f"{book_id}:{chapter}:{verse}"
    return f"{book_id}:{chapter}"


def extract_german_column(html: str) -> str:
    """Return the inner HTML of the German (third) <td> in the main table.

    Each HTML file has three <td> elements:
      1. Header row spanning both columns (<td colspan="2">)
      2. Latin Vulgate column
      3. German Arndt translation column  ← we want this one
    Splitting on </td> gives us index [2] as the third segment.
    """
    parts = re.split(r"</td>", html, flags=re.DOTALL)
    if len(parts) < 3:
        return ""
    third = parts[2]
    m = re.search(r"<td>(.*)", third, re.DOTALL)
    if not m:
        return third
    return m.group(1)


def process_chapter(html: str) -> dict[int, list[str]]:
    """Parse one chapter file and return {verse_number: [refs]}."""
    german = extract_german_column(html)

    # Split on <br /> to get logical lines
    lines = re.split(r"<br\s*/>", german)

    verse_refs: dict[int, list[str]] = defaultdict(list)
    current_verse: int | None = None
    unknown_abbrs: set[str] = set()

    for line in lines:
        # Detect verse start
        vm = VERSE_START_RE.match(line)
        if vm:
            current_verse = int(vm.group(1))

        # Extract all [<i>...</i>] cross-reference blocks on this line
        for ref_block in REF_BLOCK_RE.finditer(line):
            block_html = ref_block.group(1)
            for a_match in ANCHOR_RE.finditer(block_html):
                ref_text = a_match.group(1).strip()
                ref = parse_ref(ref_text)
                if ref is None:
                    # Track unknown abbreviations for warning
                    abbr_m = REF_TEXT_RE.match(ref_text)
                    if abbr_m:
                        unknown_abbrs.add(abbr_m.group(1))
                    continue
                if current_verse is not None:
                    verse_refs[current_verse].append(ref)

    return dict(verse_refs), unknown_abbrs


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Group HTML files by book code (preserve original casing from filename)
    book_chapters: dict[str, list[tuple[int, Path]]] = defaultdict(list)

    for path in INPUT_DIR.iterdir():
        m = FILE_RE.match(path.name)
        if not m:
            continue
        book_code = m.group(1)   # e.g. "Mt", "1Koe"
        chapter   = int(m.group(2))
        book_chapters[book_code].append((chapter, path))

    total_files = 0
    total_refs  = 0
    all_unknown: set[str] = set()
    books_written = 0

    for book_code in sorted(book_chapters):
        app_id = BOOK_MAP.get(book_code)
        if app_id is None:
            print(f"  WARNING: no app ID for file book code '{book_code}' — skipped")
            continue

        chapters_data = []
        chapters_sorted = sorted(book_chapters[book_code], key=lambda t: t[0])

        for chapter_num, path in chapters_sorted:
            html = path.read_text(encoding="utf-8", errors="replace")
            verse_refs, unknown = process_chapter(html)
            all_unknown |= unknown
            total_files += 1

            if not verse_refs:
                continue

            verses_list = [
                {"v": v, "refs": refs}
                for v, refs in sorted(verse_refs.items())
            ]
            total_refs += sum(len(r["refs"]) for r in verses_list)
            chapters_data.append({"chapter": chapter_num, "verses": verses_list})

        if not chapters_data:
            continue

        out = {"book": app_id, "chapters": chapters_data}
        out_path = OUTPUT_DIR / f"{app_id}-crossreferences.json"
        out_path.write_text(
            json.dumps(out, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        books_written += 1

    print(f"\nDone.")
    print(f"  HTML files processed : {total_files}")
    print(f"  Book JSON files written : {books_written}")
    print(f"  Total cross-references : {total_refs}")
    if all_unknown:
        print(f"  Unknown abbreviations skipped : {sorted(all_unknown)}")


if __name__ == "__main__":
    main()
