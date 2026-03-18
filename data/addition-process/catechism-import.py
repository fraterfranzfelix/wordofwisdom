"""
catechism-import.py
===================
Two-stage workflow for importing CCC paragraphs into the commentary JSON files.

STAGE 1 — Proofread (default):
    python data/addition-process/catechism-import.py
    Parses commentary-unadded.txt and writes all formatted entries to:
      data/addition-process/proofreading.json
    Review that file before committing.

STAGE 2 — Commit:
    python data/addition-process/catechism-import.py --commit
    Reads proofreading.json and inserts entries into the individual commentary
    JSON files under:
      data/commentaries/catholicchurch/catechismofthecatholicchurch/2ndedition-with2267-en/

After committing, update the index:
    python data/commentaries/update-index.py
"""

import json
import os
import re
import sys

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT  = os.path.dirname(os.path.dirname(SCRIPT_DIR))   # up two levels
TXT_FILE      = os.path.join(SCRIPT_DIR, "commentary-unadded.txt")
PROOFREAD_FILE = os.path.join(SCRIPT_DIR, "proofreading.json")
WORK_DIR      = os.path.join(
    PROJECT_ROOT,
    "data", "commentaries", "catholicchurch",
    "catechismofthecatholicchurch", "2ndedition-with2267-en"
)

# ---------------------------------------------------------------------------
# Page number mapping (CCC paragraph → physical page in 2nd edition)
# UPDATE THIS FOR EACH NEW BATCH before running.
# ---------------------------------------------------------------------------

PARA_TO_PAGE = {}
PARA_TO_PAGE[313] = 83
for p in range(355, 358): PARA_TO_PAGE[p] = 91
PARA_TO_PAGE[358] = "91-92"
for p in range(359, 362): PARA_TO_PAGE[p] = 92
PARA_TO_PAGE[362] = "92-93"
for p in range(363, 367): PARA_TO_PAGE[p] = 93
PARA_TO_PAGE[367] = "93-94"
for p in range(368, 372): PARA_TO_PAGE[p] = 94
for p in range(372, 377): PARA_TO_PAGE[p] = 95
for p in range(377, 385): PARA_TO_PAGE[p] = 96
for p in range(385, 388): PARA_TO_PAGE[p] = 97    # 385–387
for p in range(388, 392): PARA_TO_PAGE[p] = 98    # 388–391
for p in range(392, 396): PARA_TO_PAGE[p] = 99    # 392–395
for p in range(396, 400): PARA_TO_PAGE[p] = 100   # 396–399
PARA_TO_PAGE[400] = "100-101"
for p in range(401, 403): PARA_TO_PAGE[p] = 101   # 401–402
for p in range(403, 406): PARA_TO_PAGE[p] = 102   # 403–405
PARA_TO_PAGE[406] = "102-103"
for p in range(407, 410): PARA_TO_PAGE[p] = 103   # 407–409
for p in range(410, 414): PARA_TO_PAGE[p] = 104   # 410–413
PARA_TO_PAGE[414] = "104-105"
for p in range(415, 422): PARA_TO_PAGE[p] = 105   # 415–421
for p in range(422, 425): PARA_TO_PAGE[p] = 106   # 422–424
for p in range(425, 428): PARA_TO_PAGE[p] = 107   # 425–427
for p in range(428, 432): PARA_TO_PAGE[p] = 108   # 428–431
for p in range(432, 436): PARA_TO_PAGE[p] = 109   # 432–435
PARA_TO_PAGE[436] = "109-110"
for p in range(437, 440): PARA_TO_PAGE[p] = 110   # 437–439
PARA_TO_PAGE[440] = 111
PARA_TO_PAGE[441] = 111
PARA_TO_PAGE[442] = "111-112"
for p in range(443, 446): PARA_TO_PAGE[p] = 112   # 443–445
PARA_TO_PAGE[446] = "112-113"
for p in range(447, 451): PARA_TO_PAGE[p] = 113   # 447–450
PARA_TO_PAGE[451] = 114
for p in range(452, 456): PARA_TO_PAGE[p] = 114   # 452–455
for p in range(456, 460): PARA_TO_PAGE[p] = 115   # 456–459
for p in range(460, 464): PARA_TO_PAGE[p] = 116   # 460–463
for p in range(464, 467): PARA_TO_PAGE[p] = 117   # 464–466
PARA_TO_PAGE[467] = "117-118"
for p in range(468, 470): PARA_TO_PAGE[p] = 118   # 468–469
for p in range(470, 473): PARA_TO_PAGE[p] = 119   # 470–472
PARA_TO_PAGE[473] = "119-120"
for p in range(474, 477): PARA_TO_PAGE[p] = 120   # 474–476
PARA_TO_PAGE[477] = "120-121"
for p in range(478, 484): PARA_TO_PAGE[p] = 121   # 478–483
for p in range(484, 487): PARA_TO_PAGE[p] = 122   # 484–486
PARA_TO_PAGE[487] = 122
PARA_TO_PAGE[488] = "122-123"
PARA_TO_PAGE[489] = 123
PARA_TO_PAGE[490] = 123
PARA_TO_PAGE[491] = "123-124"
PARA_TO_PAGE[492] = 124
PARA_TO_PAGE[493] = 124
PARA_TO_PAGE[494] = "124-125"
PARA_TO_PAGE[495] = 125
PARA_TO_PAGE[496] = 125
PARA_TO_PAGE[497] = 126
PARA_TO_PAGE[498] = 126
for p in range(499, 501): PARA_TO_PAGE[p] = 126   # 499–500
for p in range(501, 506): PARA_TO_PAGE[p] = 127   # 501–505
PARA_TO_PAGE[506] = "127-128"
for p in range(507, 512): PARA_TO_PAGE[p] = 128   # 507–511
for p in range(512, 516): PARA_TO_PAGE[p] = 129   # 512–515
for p in range(516, 519): PARA_TO_PAGE[p] = 130   # 516–518
for p in range(519, 522): PARA_TO_PAGE[p] = 131   # 519–521
PARA_TO_PAGE[522] = "131-132"
for p in range(523, 526): PARA_TO_PAGE[p] = 132   # 523–525
for p in range(526, 528): PARA_TO_PAGE[p] = 133   # 526–527
PARA_TO_PAGE[528] = "133-134"
for p in range(529, 532): PARA_TO_PAGE[p] = 134   # 529–531
PARA_TO_PAGE[532] = "134-135"
for p in range(533, 535): PARA_TO_PAGE[p] = 135   # 533–534
PARA_TO_PAGE[535] = 136
PARA_TO_PAGE[536] = 136
PARA_TO_PAGE[537] = "136-137"
PARA_TO_PAGE[538] = 137
PARA_TO_PAGE[539] = 137
for p in range(540, 543): PARA_TO_PAGE[p] = 138   # 540–542
for p in range(543, 546): PARA_TO_PAGE[p] = 139   # 543–545
PARA_TO_PAGE[546] = "139-140"
for p in range(547, 550): PARA_TO_PAGE[p] = 140   # 547–549
for p in range(550, 553): PARA_TO_PAGE[p] = 141   # 550–552
for p in range(553, 555): PARA_TO_PAGE[p] = 142   # 553–554
PARA_TO_PAGE[555] = "142-143"
PARA_TO_PAGE[556] = 143
for p in range(557, 560): PARA_TO_PAGE[p] = 144   # 557–559
for p in range(560, 568): PARA_TO_PAGE[p] = 145   # 560–567
for p in range(568, 571): PARA_TO_PAGE[p] = 146   # 568–570

# ---------------------------------------------------------------------------
# Bible abbreviation → project book ID
# Sorted longest-first for greedy matching.
# ---------------------------------------------------------------------------

BOOK_MAP = {
    "1 Kings": "1kgs", "2 Kings": "2kgs",
    "1 Macc":  "1macc", "2 Macc":  "2macc",
    "1 Thess": "1thess","2 Thess": "2thess",
    "1 Cor":   "1cor",  "2 Cor":   "2cor",
    "1 Tim":   "1tim",  "2 Tim":   "2tim",
    "1 Pet":   "1pet",  "2 Pet":   "2pet",
    "1 Jn":    "1jn",   "2 Jn":    "2jn",   "3 Jn": "3jn",
    "1 Sam":   "1sam",  "2 Sam":   "2sam",
    "1 Kgs":   "1kgs",  "2 Kgs":   "2kgs",
    "1 Chr":   "1chr",  "2 Chr":   "2chr",
    "1 Th":    "1thess","2 Th":    "2thess",   # short forms occasionally used
    "1 Pt":    "1pet",  "2 Pt":    "2pet",     # short forms occasionally used
    "Gen":  "gen",  "Ex":   "exod", "Exod": "exod",
    "Lev":  "lev",  "Num":  "num",  "Deut": "deut", "Dt": "deut",
    "Josh": "josh", "Judg": "judg", "Ruth": "ruth",
    "Ezra": "ezra", "Neh":  "neh",
    "Tob":  "tob",  "Jdt":  "jdt",  "Esth": "esth",
    "Job":  "job",  "Ps":   "ps",   "Pss":  "ps",
    "Prov": "prov", "Eccl": "eccl", "Song": "song",
    "Wis":  "wis",  "Sir":  "sir",
    "Isa":  "isa",  "Is":   "isa",
    "Jer":  "jer",  "Lam":  "lam",  "Bar":  "bar",
    "Ezek": "ezek", "Dan":  "dan",
    "Hos":  "hos",  "Joel": "joel", "Amos": "amos",
    "Obad": "obad", "Jonah":"jonah","Mic":  "mic",
    "Nah":  "nah",  "Hab":  "hab",  "Zeph": "zeph",
    "Hag":  "hag",  "Zech": "zech", "Mal":  "mal",
    "Mt":   "mt",   "Mk":   "mk",   "Lk":   "lk",
    "Jn":   "jn",   "Acts": "acts", "Rom":  "rom",
    "Gal":  "gal",  "Eph":  "eph",  "Phil": "phil",
    "Col":  "col",  "Tit":  "tit",  "Phlm": "phlm",
    "Heb":  "heb",  "Jas":  "jam",  "Jam":  "jam",
    "Jude": "jude", "Rev":  "rev",
}

SORTED_ABBREVS = sorted(BOOK_MAP, key=len, reverse=True)

# ---------------------------------------------------------------------------
# Vatican II / papal / catechetical document abbreviations to italicize
# ---------------------------------------------------------------------------

DOC_ABBREVS = [
    "DV",  # Dei Verbum
    "LG",  # Lumen Gentium
    "GS",  # Gaudium et Spes
    "GCD", # General Catechetical Directory
    "CPG", # Credo of the People of God (Paul VI)
    "LH",  # Liturgia Horarum
    "AG",  # Ad Gentes
    "AA",  # Apostolicam Actuositatem
    "SC",  # Sacrosanctum Concilium
    "PO",  # Presbyterorum Ordinis
    "UR",  # Unitatis Redintegratio
    "NA",  # Nostra Aetate
    "GE",  # Gravissimum Educationis
    "OT",  # Optatam Totius
    "PC",  # Perfectae Caritatis
]

ALL_ABBREVS = sorted(list(BOOK_MAP.keys()) + DOC_ABBREVS, key=len, reverse=True)

# Single-pass regex: longest abbreviations listed first so e.g. "1 Jn" is
# consumed before the shorter "Jn" can be independently matched inside the tag.
_ABBREV_RE = re.compile(
    '|'.join(r'(?<!\w)' + re.escape(a) + r'(?!\w)' for a in ALL_ABBREVS)
)

# ---------------------------------------------------------------------------
# Step 1: Parse the TXT file into paragraphs and footnotes
# ---------------------------------------------------------------------------

def parse_txt(path):
    """
    Returns:
        paragraphs  – dict  {para_num (int): text (str)}
        footnotes   – dict  {fn_num   (int): text (str)}

    Section headers (e.g. "IN BRIEF", "I. THE ANGELS") are distinguished from
    genuine continuation text (e.g. multi-line Canticles) by the number of
    consecutive non-blank lines in the block:
      - A block with exactly ONE non-blank line → header, skip.
      - A block with MULTIPLE consecutive non-blank lines → prose continuation, keep.
    """
    with open(path, encoding="utf-8") as f:
        raw = f.read()

    # The footnote section is separated from paragraphs by 3+ blank lines
    # (= 4+ consecutive newline characters). Using \n{4,} avoids false splits
    # on 2-blank-line gaps that can appear between section headers in main text.
    parts = re.split(r'\n{4,}', raw, maxsplit=1)
    main_text = parts[0]
    fn_text   = parts[1] if len(parts) > 1 else ""

    paragraphs = {}
    footnotes  = {}

    blocks = re.split(r'\n\n+', main_text)

    current_num   = None
    current_lines = []

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        block_lines = [l for l in block.splitlines() if l.strip()]
        if not block_lines:
            continue

        m = re.match(r'^(\d{3,4}) (.+)', block_lines[0])
        if m:
            num = int(m.group(1))
            if current_num is not None:
                paragraphs[current_num] = " ".join(current_lines).strip()
            current_num   = num
            current_lines = [m.group(2).strip()]
            for l in block_lines[1:]:
                current_lines.append(l.strip())
        else:
            # Single-line non-numbered blocks are headers → skip.
            # Multi-line non-numbered blocks are prose continuations → keep.
            if current_num is not None and len(block_lines) > 1:
                for l in block_lines:
                    current_lines.append(l.strip())

    if current_num is not None:
        paragraphs[current_num] = " ".join(current_lines).strip()

    # --- Parse footnotes (1–3 digit numbers starting a line) ---
    current_fn    = None
    current_fntxt = []
    for line in fn_text.splitlines():
        m = re.match(r'^(\d{1,3})\s*(.+)', line)
        if m:
            fn_num = int(m.group(1))
            if current_fn is not None:
                footnotes[current_fn] = " ".join(current_fntxt).strip()
            current_fn    = fn_num
            current_fntxt = [m.group(2).strip()]
        elif current_fn is not None and line.strip():
            current_fntxt.append(line.strip())

    if current_fn is not None:
        footnotes[current_fn] = " ".join(current_fntxt).strip()

    return paragraphs, footnotes

# ---------------------------------------------------------------------------
# Step 2: Detect footnote reference numbers in raw paragraph text
#
# Three patterns, each safe against false-positive verse numbers:
#   a) After .  ;  "  '  ,        → 1–3 digit numbers
#   b) After :  (block-quote intro) → 1–3 digit numbers (verse numbers in body
#                                       text are rare outside parentheticals)
#   c) Immediately after a letter  → 1–3 digit numbers followed by whitespace
#                                     (mid-sentence refs like "earth248 as")
# ---------------------------------------------------------------------------

_FN_PATTERN_A = re.compile(r'(?<=[.;"\'",])\s*(\d{1,3})(?=\s|$)')
_FN_PATTERN_B = re.compile(r'(?<=:)\s*(\d{1,3})(?=\s|$)')
_FN_PATTERN_C = re.compile(r'(?<=[a-zA-Z])(\d{1,3})(?=\s|$)')


def find_fn_refs(raw_text):
    """Return sorted list of unique footnote reference numbers in raw_text."""
    nums = set()
    for m in _FN_PATTERN_A.finditer(raw_text):
        nums.add(int(m.group(1)))
    for m in _FN_PATTERN_B.finditer(raw_text):
        nums.add(int(m.group(1)))
    for m in _FN_PATTERN_C.finditer(raw_text):
        nums.add(int(m.group(1)))
    return sorted(nums)

# ---------------------------------------------------------------------------
# Step 3: Clean paragraph text
# ---------------------------------------------------------------------------

def italicize_text(text):
    """Apply <i> tags to Bible book and document abbreviations anywhere in text.
    Uses a single-pass regex so longer forms (e.g. '1 Jn') are consumed before
    shorter sub-strings (e.g. 'Jn') can be re-tagged inside an existing tag."""
    return _ABBREV_RE.sub(lambda m: f'<i>{m.group()}</i>', text)


def italicize_in_parens(text):
    """Apply italicization only inside parenthetical (...) regions."""
    def replace_in_parens(m):
        return f'({italicize_text(m.group(1))})'
    return re.sub(r'\(([^)]+)\)', replace_in_parens, text)


def _make_fn_replacer(footnotes):
    def replace_fn(m):
        fn_num = int(m.group(1))
        if fn_num in footnotes:
            fn_content = italicize_text(footnotes[fn_num])
            return f' ({fn_content})'
        return ''
    return replace_fn


def substitute_fn_refs(text, footnotes):
    """Replace each footnote reference number with formatted footnote text in parens."""
    replacer = _make_fn_replacer(footnotes)
    text = _FN_PATTERN_A.sub(replacer, text)
    text = _FN_PATTERN_B.sub(replacer, text)
    text = _FN_PATTERN_C.sub(replacer, text)
    return text.strip()


def smartquotes(text):
    """
    Convert straight quotation marks to typographic (curly) quotes using
    state-tracking.

      "  →  U+201C (opening) / U+201D (closing)
      '  →  U+2018 (opening) / U+2019 (closing or apostrophe)

    Single-quote flanked by letters on both sides → apostrophe (U+2019).
    """
    result = []
    in_double = False
    in_single = False
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if c == '"':
            if not in_double:
                result.append('\u201C')
                in_double = True
            else:
                result.append('\u201D')
                in_double = False
        elif c == "'":
            prev = text[i - 1] if i > 0 else ' '
            nxt  = text[i + 1] if i + 1 < n else ' '
            if prev.isalpha() and nxt.isalpha():
                result.append('\u2019')   # contraction apostrophe
            elif not in_single:
                result.append('\u2018')
                in_single = True
            else:
                result.append('\u2019')
                in_single = False
        else:
            result.append(c)
        i += 1
    return ''.join(result)


def clean_text(raw_text, footnotes):
    step1 = italicize_in_parens(raw_text)       # italicize inside inline parens
    step2 = substitute_fn_refs(step1, footnotes) # replace fn numbers with text
    return smartquotes(step2)                    # curly quotes

# ---------------------------------------------------------------------------
# Step 4: Parse Bible references from a ref string
# ---------------------------------------------------------------------------

def parse_refs(ref_string):
    """
    Parses a string like "Mt 6:26-34; Ps 55:23; Acts 7:53"
    Returns list of (book_id, chapter, verse_or_range) tuples.
    """
    refs = []
    cur_book    = None
    cur_chapter = None

    ref_string = re.split(r'\.\s+[a-z]', ref_string)[0]
    ref_string = re.sub(r'\([^)]*\)', '', ref_string)
    ref_string = re.sub(r'\bCf\.\s*', '', ref_string, flags=re.IGNORECASE)
    ref_string = ref_string.strip().rstrip('.')

    segments = [s.strip() for s in ref_string.split(';') if s.strip()]

    for seg in segments:
        matched_abbr = None
        for abbr in SORTED_ABBREVS:
            if re.match(r'^' + re.escape(abbr) + r'(?=\s|\d|$)', seg):
                matched_abbr = abbr
                break

        if matched_abbr:
            cur_book  = BOOK_MAP[matched_abbr]
            remainder = seg[len(matched_abbr):].strip()
        else:
            remainder = seg.strip()

        if cur_book is None or not remainder:
            continue

        if re.match(r'^\d+:\d+-\d+:\d+', remainder):
            cur_chapter = None
            continue

        m = re.match(r'^(\d+):(.+)', remainder)
        if m:
            cur_chapter = int(m.group(1))
            verse_part  = m.group(2).strip().rstrip('.')
            for vi in [v.strip() for v in verse_part.split(',')]:
                vi = vi.rstrip('.')
                if re.match(r'^\d+(-\d+)?$', vi):
                    refs.append((cur_book, cur_chapter, vi if '-' in vi else int(vi)))
            continue

        if re.match(r'^\d+$', remainder.rstrip('.')):
            continue   # bare chapter, skip

    return refs

# ---------------------------------------------------------------------------
# Step 5: Collect all Bible refs for a paragraph
# ---------------------------------------------------------------------------

def collect_refs_for_paragraph(raw_text, footnotes):
    all_refs = []

    for paren in re.findall(r'\(([^)]+)\)', raw_text):
        all_refs.extend(parse_refs(paren))

    for fn_num in find_fn_refs(raw_text):
        if fn_num in footnotes:
            all_refs.extend(parse_refs(footnotes[fn_num]))

    seen, unique = set(), []
    for ref in all_refs:
        key = (ref[0], ref[1], str(ref[2]))
        if key not in seen:
            seen.add(key)
            unique.append(ref)

    return unique

# ---------------------------------------------------------------------------
# Step 6: JSON file helpers
# ---------------------------------------------------------------------------

def load_json(path):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {"verses": []}


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    lines = ['{\n"verses": [']
    verse_lines = [json.dumps(v, ensure_ascii=False) for v in data["verses"]]
    lines.append(",\n".join(verse_lines))
    lines.append("]\n}")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

# ---------------------------------------------------------------------------
# Stage 1: Generate proofreading.json
# ---------------------------------------------------------------------------

def stage_proofread():
    if not PARA_TO_PAGE:
        print("ERROR: PARA_TO_PAGE is empty. Fill in page numbers before running.")
        sys.exit(1)

    paragraphs, footnotes = parse_txt(TXT_FILE)
    print(f"Parsed {len(paragraphs)} paragraphs, {len(footnotes)} footnotes.\n")

    entries = []
    skipped_no_refs = []

    for para_num in sorted(paragraphs):
        raw_text   = paragraphs[para_num]
        clean      = clean_text(raw_text, footnotes)
        page       = PARA_TO_PAGE.get(para_num, para_num)
        text_field = f"{para_num}.\u2003{clean}"

        refs = collect_refs_for_paragraph(raw_text, footnotes)

        if not refs:
            skipped_no_refs.append(para_num)
            continue

        targets = []
        for (book_id, chapter, verse) in refs:
            rel_path = f"{book_id}/{chapter}.json"
            targets.append({
                "book":    book_id,
                "chapter": chapter,
                "v":       verse,
                "p":       page,
                "file":    rel_path,
            })

        entries.append({
            "para":    para_num,
            "page":    page,
            "text":    text_field,
            "targets": targets,
        })

    with open(PROOFREAD_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(entries)} paragraph entries to proofreading.json")
    if skipped_no_refs:
        print(f"  [NO REFS] paras skipped (no Bible references): {skipped_no_refs}")
    print(f"\nReview proofreading.json, then run:")
    print(f"  python data/addition-process/catechism-import.py --commit")

# ---------------------------------------------------------------------------
# Stage 2: Commit proofreading.json into individual commentary files
# ---------------------------------------------------------------------------

def cleanup_previous_run(pages_to_remove):
    """Remove all entries whose `p` value is in pages_to_remove from WORK_DIR."""
    removed_total = 0
    for dirpath, _dirs, files in os.walk(WORK_DIR):
        for fname in files:
            if not fname.endswith(".json") or fname == "meta.json":
                continue
            fpath = os.path.join(dirpath, fname)
            data  = load_json(fpath)
            if "verses" not in data:
                continue
            before = len(data["verses"])
            data["verses"] = [
                v for v in data["verses"]
                if v.get("p") not in pages_to_remove
            ]
            removed = before - len(data["verses"])
            if removed:
                save_json(fpath, data)
                removed_total += removed
    if removed_total:
        print(f"[CLEANUP] Removed {removed_total} stale entries.\n")


def stage_commit():
    if not os.path.exists(PROOFREAD_FILE):
        print(f"ERROR: {PROOFREAD_FILE} not found. Run without --commit first.")
        sys.exit(1)

    with open(PROOFREAD_FILE, encoding="utf-8") as f:
        entries = json.load(f)

    # Derive the page set from the current proofreading file for cleanup.
    # Skip cleanup with --no-cleanup when a page number overlaps a prior batch.
    if "--no-cleanup" not in sys.argv:
        pages_to_remove = {e["page"] for e in entries}
        cleanup_previous_run(pages_to_remove)
    else:
        print("[CLEANUP] Skipped (--no-cleanup).\n")

    added   = 0
    skipped = 0

    for entry in entries:
        text_field = entry["text"]
        for target in entry["targets"]:
            book_id  = target["book"]
            chapter  = target["chapter"]
            verse    = target["v"]
            page     = target["p"]
            json_path = os.path.join(WORK_DIR, book_id, f"{chapter}.json")
            data      = load_json(json_path)

            verse_str = str(verse)
            duplicate = any(
                str(e.get("v")) == verse_str
                and str(e.get("p")) == str(page)
                and e.get("text") == text_field
                for e in data["verses"]
            )
            if duplicate:
                print(f"  [SKIP]  {book_id}/{chapter}.json  v={verse}  p={page}")
                skipped += 1
                continue

            data["verses"].append({"v": verse, "p": page, "text": text_field})
            save_json(json_path, data)
            print(f"  [ADD]   {book_id}/{chapter}.json  v={verse}  p={page}")
            added += 1

    print(f"\nDone. {added} entries added, {skipped} duplicates skipped.")
    print("\nNext step: run  python data/commentaries/update-index.py")

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if "--commit" in sys.argv:
        stage_commit()
    else:
        stage_proofread()
