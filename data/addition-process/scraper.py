#!/usr/bin/env python3
"""
Allioli-Arndt Bible Scraper
Extracts German verse text from HTML files and compiles JSON files for the
1914 Allioli-Arndt translation (id: 1914aab).

Usage:
    python assets/scraper.py

Reads from:  data/addition-process/allioli-arndt/
Writes to:   data/translations/1914aab/
"""

import re
import json
import html as html_module
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR    = Path(__file__).resolve().parent.parent
HTML_DIR    = BASE_DIR / "data" / "addition-process" / "allioli-arndt"
OUTPUT_DIR  = BASE_DIR / "data" / "translations" / "1914aab"
INDEX_FILE  = BASE_DIR / "data" / "translations" / "index.json"

TRANSLATION_ID = "1914aab"

# ---------------------------------------------------------------------------
# Book definitions  (German HTML abbreviation, testament, app book-id, chapters)
# ---------------------------------------------------------------------------

BOOKS = [
    # Old Testament
    ("1Mos",   "AT", "gen",    50),
    ("2Mos",   "AT", "exod",   40),
    ("3Mos",   "AT", "lev",    27),
    ("4Mos",   "AT", "num",    36),
    ("5Mos",   "AT", "deut",   34),
    ("Jos",    "AT", "josh",   24),
    ("Rich",   "AT", "judg",   21),
    ("Rut",    "AT", "ruth",    4),
    ("1Sam",   "AT", "1sam",   31),
    ("2Sam",   "AT", "2sam",   24),
    ("1Koe",   "AT", "1kgs",   22),
    ("2Koe",   "AT", "2kgs",   25),
    ("1Chr",   "AT", "1chr",   29),
    ("2Chr",   "AT", "2chr",   36),
    ("Esr",    "AT", "ezra",   10),
    ("Neh",    "AT", "neh",    13),
    ("Tob",    "AT", "tob",    14),
    ("Ju",     "AT", "jdt",    16),
    ("Est",    "AT", "esth",   16),
    ("1Mak",   "AT", "1macc",  16),
    ("2Mak",   "AT", "2macc",  15),
    ("Job",    "AT", "job",    42),
    ("Ps",     "AT", "ps",    150),
    ("Spr",    "AT", "prov",   31),
    ("Koh",    "AT", "eccl",   12),
    ("Hohel",  "AT", "song",    8),
    ("Weish",  "AT", "wis",    19),
    ("JSir",   "AT", "sir",    51),
    ("Jes",    "AT", "isa",    66),
    ("Jer",    "AT", "jer",    52),
    ("Klagel", "AT", "lam",     5),
    ("Baru",   "AT", "bar",     6),
    ("Ez",     "AT", "ezek",   48),
    ("Dan",    "AT", "dan",    14),
    ("Hos",    "AT", "hos",    14),
    ("Joe",    "AT", "joel",    3),
    ("Amos",   "AT", "amos",    9),
    ("Obadja", "AT", "obad",    1),
    ("Jonas",  "AT", "jonah",   4),
    ("Mic",    "AT", "mic",     7),
    ("Nah",    "AT", "nah",     3),
    ("Hab",    "AT", "hab",     3),
    ("Zeph",   "AT", "zeph",    3),
    ("Hagg",   "AT", "hag",     2),
    ("Sach",   "AT", "zech",   14),
    ("Mal",    "AT", "mal",     4),
    # New Testament
    ("Mt",     "NT", "mt",     28),
    ("Mk",     "NT", "mk",     16),
    ("Lk",     "NT", "lk",     24),
    ("Joh",    "NT", "jn",     21),
    ("Apg",    "NT", "acts",   28),
    ("Roem",   "NT", "rom",    16),
    ("1Kor",   "NT", "1cor",   16),
    ("2Kor",   "NT", "2cor",   13),
    ("Gal",    "NT", "gal",     6),
    ("Eph",    "NT", "eph",     6),
    ("Phil",   "NT", "phil",    4),
    ("Kol",    "NT", "col",     4),
    ("1Thes",  "NT", "1thess",  5),
    ("2Thes",  "NT", "2thess",  3),
    ("1Tim",   "NT", "1tim",    6),
    ("2Tim",   "NT", "2tim",    4),
    ("Tit",    "NT", "tit",     3),
    ("Philo",  "NT", "phlm",    1),
    ("Hebr",   "NT", "heb",    13),
    ("Jak",    "NT", "jam",     5),
    ("1Petr",  "NT", "1pet",    5),
    ("2Petr",  "NT", "2pet",    3),
    ("1Joh",   "NT", "1jn",     5),
    ("2Joh",   "NT", "2jn",     1),
    ("3Joh",   "NT", "3jn",     1),
    ("Judas",  "NT", "jude",    1),
    ("Offenb", "NT", "rev",    22),
]

# Short names used in the app (for books.json shortName field)
SHORT_NAMES = {
    "gen":    "Genesis",       "exod":   "Exodus",        "lev":    "Levitikus",
    "num":    "Numeri",        "deut":   "Deuteronomium", "josh":   "Josua",
    "judg":   "Richter",       "ruth":   "Rut",           "1sam":   "1 Samuel",
    "2sam":   "2 Samuel",      "1kgs":   "1 Könige",      "2kgs":   "2 Könige",
    "1chr":   "1 Chronik",     "2chr":   "2 Chronik",     "ezra":   "Esra",
    "neh":    "Nehemia",       "tob":    "Tobit",         "jdt":    "Judit",
    "esth":   "Ester",         "1macc":  "1 Makkabäer",   "2macc":  "2 Makkabäer",
    "job":    "Ijob",          "ps":     "Psalmen",       "prov":   "Sprichwörter",
    "eccl":   "Kohelet",       "song":   "Hoheslied",     "wis":    "Weisheit",
    "sir":    "Sirach",        "isa":    "Jesaja",        "jer":    "Jeremia",
    "lam":    "Klagelieder",   "bar":    "Baruch",        "ezek":   "Ezechiel",
    "dan":    "Daniel",        "hos":    "Hosea",         "joel":   "Joel",
    "amos":   "Amos",          "obad":   "Obadja",        "jonah":  "Jona",
    "mic":    "Micha",         "nah":    "Nahum",         "hab":    "Habakuk",
    "zeph":   "Zefanja",       "hag":    "Haggai",        "zech":   "Sacharja",
    "mal":    "Maleachi",
    "mt":     "Matthäus",      "mk":     "Markus",        "lk":     "Lukas",
    "jn":     "Johannes",      "acts":   "Apostelgeschichte", "rom": "Römer",
    "1cor":   "1 Korinther",   "2cor":   "2 Korinther",   "gal":    "Galater",
    "eph":    "Epheser",       "phil":   "Philipper",     "col":    "Kolosser",
    "1thess": "1 Thessalonicher", "2thess": "2 Thessalonicher",
    "1tim":   "1 Timotheus",   "2tim":   "2 Timotheus",   "tit":    "Titus",
    "phlm":   "Philemon",      "heb":    "Hebräer",       "jam":    "Jakobus",
    "1pet":   "1 Petrus",      "2pet":   "2 Petrus",      "1jn":    "1 Johannes",
    "2jn":    "2 Johannes",    "3jn":    "3 Johannes",    "jude":   "Judas",
    "rev":    "Offenbarung",
}

# ---------------------------------------------------------------------------
# Compiled regex patterns
# ---------------------------------------------------------------------------

RE_SUP         = re.compile(r'<sup[^>]*>.*?</sup>', re.DOTALL)
RE_CROSSREF    = re.compile(r'\[<i>.*?</i>\]', re.DOTALL)
RE_BRTAG       = re.compile(r'<br\s*/?>', re.IGNORECASE)
RE_TAG         = re.compile(r'<[^>]+>')
RE_VERSE       = re.compile(r'^(\d+)\.\s+(.+)$')
RE_TABLE       = re.compile(r'<table\b[^>]*border="1"[^>]*>.*?</table>', re.DOTALL)
RE_TR          = re.compile(r'<tr\b[^>]*>(.*?)</tr>', re.DOTALL)
RE_TD          = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL)
RE_H1_WRAP     = re.compile(
    r'<div class="mw-heading mw-heading1"><h1[^>]*>(.*?)</h1></div>', re.DOTALL
)
RE_COLSPAN_ROW = re.compile(
    r'<tr\b[^>]*>\s*<td[^>]*colspan\s*=\s*["\']?2["\']?[^>]*>(.*?)</td>', re.DOTALL
)
RE_CENTER      = re.compile(r'<center[^>]*>(.*?)</center>', re.DOTALL)
RE_NON_B_TAG   = re.compile(r'<(?!/?b\b)[^>]+>')  # strip all tags except <b></b>

# ---------------------------------------------------------------------------
# HTML filename helper
# ---------------------------------------------------------------------------

def get_html_filename(abbrev: str, testament: str, chapter: int) -> str:
    """Return the HTML filename for a given book abbreviation and chapter number."""
    ch_str = f"{chapter:02d}" if chapter < 100 else str(chapter)
    return f"Kategorie_BIBLIA_SACRA_{testament}_{abbrev}{ch_str}.html"

# ---------------------------------------------------------------------------
# Title extraction
# ---------------------------------------------------------------------------

def extract_book_title(html_text: str) -> str:
    """
    Extract the German book title from the second mw-heading1 h1 in the page.
    The second h1 is the German one (first is Latin).
    Strips footnote markers, cross-refs, and the trailing chapter indicator.
    """
    content_start = html_text.find('<div id="mw-content-text"')
    if content_start == -1:
        return ""
    content_html = html_text[content_start:]

    matches = RE_H1_WRAP.findall(content_html)
    if len(matches) < 2:
        # Fallback: try any h1 text in the content area
        if matches:
            raw = matches[0]
        else:
            return ""
    else:
        raw = matches[1]

    # Strip sup tags and remaining HTML
    raw = RE_SUP.sub('', raw)
    raw = RE_TAG.sub('', raw)
    title = html_module.unescape(raw).strip()

    # Remove trailing chapter indicator in various forms:
    # "Kap. 1", "Kap 1", "Kap._1", "Kapitel 1", "Psalm 1", "Psalm_1"
    title = re.sub(
        r'\s*[-–]?\s*(?:Kap\.|Kap\b|Kapitel|Psalm(?:_|\s))\s*\d+\.?\s*$',
        '', title, flags=re.IGNORECASE
    ).strip()
    # Handle "Einziges Kapitel" / "Ein Kapitel"
    title = re.sub(r'\s*Einziges\s+Kapitel\s*$', '', title, flags=re.IGNORECASE).strip()
    title = re.sub(r'\s*Ein\s+Kapitel\s*$',       '', title, flags=re.IGNORECASE).strip()
    # Strip trailing punctuation and normalize spaces
    title = title.rstrip(' .,;:-–')
    title = re.sub(r'\s+', ' ', title).strip()
    return title

# ---------------------------------------------------------------------------
# Superscription extraction
# ---------------------------------------------------------------------------

def extract_chapter_superscription(html_text: str) -> str | None:
    """
    Extract the chapter intro paragraph from the first colspan=2 table row.
    The HTML pattern is: <tr><td colspan="2"><center>…text…</center></td></tr>
    Strips footnote markers and cross-references; preserves <b> tags for bold
    section titles (e.g. <b>Eingang. Die Erschaffung der Welt.</b>).
    Returns None when no superscription is present.
    """
    m = RE_COLSPAN_ROW.search(html_text)
    if not m:
        return None
    td_html = m.group(1)
    cm = RE_CENTER.search(td_html)
    inner = cm.group(1) if cm else td_html
    inner = RE_SUP.sub('', inner)        # strip footnote markers
    inner = RE_CROSSREF.sub('', inner)   # strip cross-references
    inner = RE_NON_B_TAG.sub('', inner)  # strip all tags except <b>
    text = html_module.unescape(inner)
    text = re.sub(r'\s+', ' ', text).strip()
    return text if text else None


def write_superscriptions(book_id: str, entries: list[dict]):
    """Write {book_id}-superscriptions.json. entries = [{"chapter": N, "verse": 1, "text": "…"}]"""
    path = OUTPUT_DIR / f"{book_id}-superscriptions.json"
    path.write_text(
        json.dumps({"superscriptions": entries}, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f"  {path.name}  ({len(entries)} superscriptions)")


# ---------------------------------------------------------------------------
# Table / verse extraction
# ---------------------------------------------------------------------------

def has_verse_numbers(td_html: str) -> bool:
    """Return True if the td contains at least one numbered verse line."""
    clean = RE_TAG.sub('', td_html)
    return bool(re.search(r'^\s*\d+\.\s+\S', clean, re.MULTILINE))


def extract_german_td(table_html: str) -> str | None:
    """
    From a single <table> block, return the inner HTML of the second <td>
    in the second <tr> (the German translation column).
    The first <tr> is the chapter intro (colspan="2") and is skipped.
    If a table has more than two <tr> elements (multiple content rows),
    all German tds are concatenated.
    """
    trs = RE_TR.findall(table_html)
    if not trs:
        return None

    german_parts = []
    for tr in trs:
        # Skip intro rows that have colspan
        if 'colspan' in tr:
            continue
        tds = RE_TD.findall(tr)
        if len(tds) >= 2:
            german_parts.append(tds[1])

    return '\n'.join(german_parts) if german_parts else None


def find_content_german_td(html_text: str) -> str | None:
    """
    Locate the relevant Bible table in the page and return the German column's
    inner HTML.  Picks the LAST table in the whole file that contains numbered
    verse text.

    Searching the entire file (not just the pre-Fußnote area) is intentional:
    some files (e.g. JSir01, Klagel01) contain a book-level prologue table
    followed by a Fußnote, then the actual Chapter-1 table.  Footnote prose
    never uses the "N. text" verse pattern, so false positives are not an issue.
    """
    tables = list(RE_TABLE.finditer(html_text))
    if not tables:
        return None

    # Walk tables from last to first; return first one with verse numbers
    for m in reversed(tables):
        german_td = extract_german_td(m.group(0))
        if german_td and has_verse_numbers(german_td):
            return german_td

    # Absolute fallback: last table regardless
    return extract_german_td(tables[-1].group(0))


def extract_verses(german_td_html: str) -> list[dict]:
    """
    Parse numbered Bible verses from the raw inner HTML of the German column.
    Strips footnote markers, cross-references, and all remaining HTML tags.
    Returns a list of {"v": int, "text": str} dicts.
    """
    text = german_td_html

    # 1. Remove footnote superscripts BEFORE splitting on <br />
    text = RE_SUP.sub('', text)

    # 2. Remove cross-references [<i>…</i>] (may span multiple lines)
    text = RE_CROSSREF.sub('', text)

    # 3. Replace <br /> variants with a newline sentinel
    text = RE_BRTAG.sub('\n', text)

    # 4. Strip remaining HTML tags
    text = RE_TAG.sub('', text)

    # 5. Decode HTML entities (&amp; → &, &nbsp; → space, etc.)
    text = html_module.unescape(text)

    # 6. Split into lines and parse verse numbers
    lines = text.split('\n')
    verses: list[dict] = []
    current_num: int | None = None
    current_parts: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        m = RE_VERSE.match(stripped)
        if m:
            # Save the accumulated previous verse
            if current_num is not None:
                verse_text = re.sub(r'\s+', ' ', ' '.join(current_parts)).strip()
                if verse_text:
                    verses.append({"v": current_num, "text": verse_text})
            current_num = int(m.group(1))
            current_parts = [m.group(2).strip()]
        elif current_num is not None:
            # Skip single-word labels ending with a period — these are Hebrew
            # acrostic letter headings in Lamentations ("Aleph.", "Beth.", etc.)
            # that appear between verse lines and must not bleed into verse text.
            if not re.search(r'\s', stripped) and stripped.endswith('.'):
                continue
            # Continuation of the current verse (rare after cross-ref removal)
            current_parts.append(stripped)

    # Flush the last verse
    if current_num is not None:
        verse_text = re.sub(r'\s+', ' ', ' '.join(current_parts)).strip()
        if verse_text:
            verses.append({"v": current_num, "text": verse_text})

    return verses

# ---------------------------------------------------------------------------
# Main processing loop
# ---------------------------------------------------------------------------

def process_book(abbrev: str, testament: str, book_id: str, chapter_count: int):
    """Process all chapters of one book and write its JSON file and superscriptions file."""
    chapters_data = []
    superscriptions = []
    book_title = None

    for chapter_num in range(1, chapter_count + 1):
        filename = get_html_filename(abbrev, testament, chapter_num)
        filepath = HTML_DIR / filename

        if not filepath.exists():
            print(f"  WARNING: missing file {filename}")
            continue

        html_text = filepath.read_text(encoding='utf-8')

        # Extract book title once (from chapter 1)
        if book_title is None:
            book_title = extract_book_title(html_text)

        # Extract chapter superscription
        sup_text = extract_chapter_superscription(html_text)
        if sup_text:
            superscriptions.append({"chapter": chapter_num, "verse": 1, "text": sup_text})

        german_td = find_content_german_td(html_text)
        if german_td is None:
            print(f"  WARNING: no content table found in {filename}")
            continue

        verses = extract_verses(german_td)
        if not verses:
            print(f"  WARNING: no verses found in {filename}")
            continue

        chapters_data.append({"chapter": chapter_num, "verses": verses})

    # Write book JSON
    out_path = OUTPUT_DIR / f"{book_id}.json"
    out_path.write_text(
        json.dumps({"chapters": chapters_data}, ensure_ascii=False, indent=3),
        encoding='utf-8'
    )
    verse_count = sum(len(ch["verses"]) for ch in chapters_data)
    print(f"  {out_path.name}  ({len(chapters_data)} chapters, {verse_count} verses)")

    # Write superscriptions JSON (only if any were found)
    if superscriptions:
        write_superscriptions(book_id, superscriptions)

    return book_title or book_id


def write_meta():
    meta = {
        "id": TRANSLATION_ID,
        "title": "1914 Allioli-Arndt German Catholic Bible",
        "translation-abbreviation": "1914-AAB",
        "psalms-structure": "greek",
        "psalms-superscription": False,
        "has-chapter-superscriptions": True,
        "metadata": {
            "year": 1914,
            "place": "Regensburg, Germany",
            "translator": "Joseph Franz von Allioli",
            "publisher": "G. J. Manz",
            "editor": "Michael Arndt",
            "imprimatur": "",
            "language": "German"
        },
        "copyright": "Public Domain",
        "description": (
            "German Catholic Bible translation based on the Vulgate, "
            "originally by Joseph Franz von Allioli (1830), "
            "revised edition 1914 by Michael Arndt."
        )
    }
    meta_path = OUTPUT_DIR / f"{TRANSLATION_ID}-meta.json"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Written {meta_path.name}")


def write_books_json(books_list: list[dict]):
    books_path = OUTPUT_DIR / f"{TRANSLATION_ID}-books.json"
    books_path.write_text(
        json.dumps(books_list, ensure_ascii=False, indent=0,
                   separators=(',\n', ': ')),
        encoding='utf-8'
    )
    print(f"Written {books_path.name}  ({len(books_list)} books)")


def update_index():
    index = json.loads(INDEX_FILE.read_text(encoding='utf-8'))
    if any(entry["id"] == TRANSLATION_ID for entry in index):
        print("index.json: 1914aab already present, skipping.")
        return
    index.append({
        "id": TRANSLATION_ID,
        "name": "1914 Allioli-Arndt German Catholic Bible",
        "orthodox": True
    })
    INDEX_FILE.write_text(
        json.dumps(index, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print("Updated index.json")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    books_list = []

    for abbrev, testament, book_id, chapter_count in BOOKS:
        print(f"Processing {book_id} ({abbrev}, {chapter_count} chapters)…")
        book_title = process_book(abbrev, testament, book_id, chapter_count)
        books_list.append({
            "id": book_id,
            "supertitle": "",
            "name": book_title,
            "subtitle": "",
            "shortName": SHORT_NAMES[book_id],
            "chapters": chapter_count
        })

    write_meta()
    write_books_json(books_list)
    update_index()

    print("\nDone. Files written to:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
