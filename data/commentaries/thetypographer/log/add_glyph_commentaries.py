#!/usr/bin/env python3
"""
Scan all 1611akjv book JSON files for ¶, yͤ (U+0364), yͭ (U+036D).
For each verse containing a glyph, add the standard commentary entry to
thetypographer.json if not already present.
Exceptions (have custom entries): gen 1:6 (¶), 1jn 1:1 (yͤ), acts 1:15 (yͭ).
"""
import json, os, glob, sys
sys.stdout.reconfigure(encoding='utf-8')

PILCROW = '¶'
YE_CHAR = 'y\u0364'   # yͤ = "the"
YT_CHAR = 'y\u036d'   # yͭ = "that"

GLYPHS = [PILCROW, YE_CHAR, YT_CHAR]

GLYPH_TEXT = {
    PILCROW:  'In the 1611 KJV: ¶ = New paragraph. (See Genesis 1:6 for more.)',
    YE_CHAR:  'In the 1611 KJV: y\u0364 = <i>the.</i> (See 1 John 1:1 for more.)',
    YT_CHAR:  'In the 1611 KJV: y\u036d = <i>that.</i> (See Acts 1:15 for more.)',
}

EXCEPTIONS = {
    PILCROW:  {('gen', 1, 6)},
    YE_CHAR:  {('1jn', 1, 1)},
    YT_CHAR:  {('acts', 1, 15)},
}

BOOK_ORDER = [
    'gen','exod','lev','num','deut','josh','judg','ruth','1sam','2sam',
    '1kgs','2kgs','1chr','2chr','ezra','neh','esth','tob','jdt','1macc',
    '2macc','job','ps','prov','eccl','song','wis','sir','isa','jer','lam',
    'bar','ezek','dan','hos','joel','amos','obad','jonah','mic','nah',
    'hab','zeph','hag','zech','mal','orman',
    'mt','mk','lk','jn','acts','rom','1cor','2cor','gal','eph','phil',
    'col','1thess','2thess','1tim','2tim','tit','phlm','heb','jam',
    '1pet','2pet','1jn','2jn','3jn','jude','rev',
    '1esd','2esd',
]
BOOK_RANK = {b: i for i, b in enumerate(BOOK_ORDER)}
GLYPH_ORDER = {PILCROW: 0, YE_CHAR: 1, YT_CHAR: 2}

BASE_DIR    = os.path.dirname(__file__)
BOOKS_DIR   = os.path.join(BASE_DIR, '..', 'translations', '1611akjv', 'books')
TYPOG_FILE  = os.path.join(BASE_DIR, '..', 'commentaries', 'thetypographer', 'log', 'thetypographer.json')

def main():
    # Load existing commentary entries
    with open(TYPOG_FILE, 'r', encoding='utf-8') as f:
        entries = json.load(f)

    existing = {
        (e['book'], e['chapter'], e['v'], e['text'])
        for e in entries
    }

    new_entries = []
    counts = {g: 0 for g in GLYPHS}

    for json_file in sorted(glob.glob(os.path.join(BOOKS_DIR, '*.json'))):
        book_id = os.path.splitext(os.path.basename(json_file))[0]
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for chapter_obj in data.get('chapters', []):
            ch = chapter_obj['chapter']
            for verse_obj in chapter_obj.get('verses', []):
                v = verse_obj['v']
                text = verse_obj.get('text', '')
                for glyph in GLYPHS:
                    if glyph not in text:
                        continue
                    if (book_id, ch, v) in EXCEPTIONS[glyph]:
                        continue
                    entry_text = GLYPH_TEXT[glyph]
                    if (book_id, ch, v, entry_text) in existing:
                        continue
                    new_entries.append({
                        'book': book_id,
                        'chapter': ch,
                        'v': v,
                        'text': entry_text,
                        '_sort': (BOOK_RANK.get(book_id, 999), ch, v, GLYPH_ORDER[glyph]),
                    })
                    existing.add((book_id, ch, v, entry_text))
                    counts[glyph] += 1

    new_entries.sort(key=lambda e: e['_sort'])
    for e in new_entries:
        del e['_sort']

    entries.extend(new_entries)

    with open(TYPOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f"Added {len(new_entries)} new entries:")
    print(f"  ¶  (pilcrow):  {counts[PILCROW]}")
    print(f"  yͤ (the):      {counts[YE_CHAR]}")
    print(f"  yͭ (that):     {counts[YT_CHAR]}")
    print("Done.")


if __name__ == '__main__':
    main()
