"""
Extract chapter superscriptions from the 1899 Douay-Rheims HTML files and write
per-book JSON files to data/translations/1899drb/superscriptions/.

Source files: data/addition-process/douay-rheims-scraped/BBBCCC.htm
  BBB = 2-digit book number (01-73, Clementine Vulgate order)
  CCC = 3-digit chapter number

Run from the project root:
    python data/addition-process/drb-superscriptions.py
"""

import re
import json
import html as html_module
from pathlib import Path

# ---------------------------------------------------------------------------
# Book number (drbo.org Clementine Vulgate ordering) → app book ID
# Confirmed anchors: 01=gen, 22=prov, 23=eccl
# ---------------------------------------------------------------------------
BOOK_MAP = {
     1:'gen',   2:'exod',   3:'lev',    4:'num',    5:'deut',
     6:'josh',  7:'judg',   8:'ruth',   9:'1sam',  10:'2sam',
    11:'1kgs', 12:'2kgs',  13:'1chr',  14:'2chr',  15:'ezra',
    16:'neh',  17:'tob',   18:'jdt',   19:'esth',  20:'job',
    21:'ps',   22:'prov',  23:'eccl',  24:'song',  25:'wis',
    26:'sir',  27:'isa',   28:'jer',   29:'lam',   30:'bar',
    31:'ezek', 32:'dan',   33:'hos',   34:'joel',  35:'amos',
    36:'obad', 37:'jonah', 38:'mic',   39:'nah',   40:'hab',
    41:'zeph', 42:'hag',   43:'zech',  44:'mal',   45:'1macc',
    46:'2macc',47:'mt',    48:'mk',    49:'lk',    50:'jn',
    51:'acts', 52:'rom',   53:'1cor',  54:'2cor',  55:'gal',
    56:'eph',  57:'phil',  58:'col',   59:'1thess',60:'2thess',
    61:'1tim', 62:'2tim',  63:'tit',   64:'phlm',  65:'heb',
    66:'jam',  67:'1pet',  68:'2pet',  69:'1jn',   70:'2jn',
    71:'3jn',  72:'jude',  73:'rev',
}

RE_DESC = re.compile(r'<p\s+class=desc>(.*?)</p>', re.DOTALL | re.IGNORECASE)
RE_TAG  = re.compile(r'<[^>]+>')

INPUT_DIR  = Path('data/addition-process/douay-rheims-scraped')
OUTPUT_DIR = Path('data/translations/1899drb/superscriptions')
META_PATH  = Path('data/translations/1899drb/1899drb-meta.json')


def extract_superscription(html_text: str) -> str | None:
    m = RE_DESC.search(html_text)
    if not m:
        return None
    raw = m.group(1)
    raw = RE_TAG.sub('', raw)
    text = html_module.unescape(raw)
    text = re.sub(r'\s+', ' ', text).strip()
    if not text or text.lower().startswith('(no prolog'):
        return None
    return text


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    books: dict[str, list] = {}
    for htm_file in sorted(INPUT_DIR.glob('*.htm')):
        stem = htm_file.stem
        if len(stem) != 5 or not stem.isdigit():
            print(f"  SKIP unexpected filename: {htm_file.name}")
            continue
        book_num = int(stem[:2])
        chapter  = int(stem[2:])
        book_id  = BOOK_MAP.get(book_num)
        if not book_id:
            print(f"  WARNING: no mapping for book number {book_num} ({htm_file.name})")
            continue
        text = extract_superscription(
            htm_file.read_text(encoding='utf-8', errors='replace')
        )
        if text:
            books.setdefault(book_id, []).append(
                {"chapter": chapter, "verse": 1, "text": text}
            )

    for book_id, entries in sorted(books.items()):
        out = OUTPUT_DIR / f"{book_id}-superscriptions.json"
        out.write_text(
            json.dumps({"superscriptions": entries}, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )
        print(f"  {out.name}  ({len(entries)} superscriptions)")

    print(f"\nTotal books with superscriptions: {len(books)}")

    # Update meta.json
    meta = json.loads(META_PATH.read_text(encoding='utf-8'))
    meta['has-chapter-superscriptions'] = True
    META_PATH.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print("Updated 1899drb-meta.json")


if __name__ == '__main__':
    main()
