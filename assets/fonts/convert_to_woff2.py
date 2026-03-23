"""
Convert TTF -> WOFF2 with selective glyph subsetting.
Removes the specified Unicode codepoints from all fonts.
Preserves: naming tables, grid-fitting (hinting) instructions, all metadata.
Requires: pip install fonttools brotli
"""

import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
from fontTools import subset as ft_subset

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Codepoints to remove
# ---------------------------------------------------------------------------
REMOVE = set()

REMOVE |= {0x00A4, 0x0E3F}                        # Currency sign, Thai baht
REMOVE.update(range(0x20A0, 0x20C0))               # Currency symbols block
REMOVE |= {0x2012, 0x2023, 0x2025, 0x2027,
           0x202F, 0x2031, 0x2038, 0x205F}         # General Punctuation singles
REMOVE.update(range(0x2016, 0x2018))               # Double vertical line – double low line
REMOVE.update(range(0x2034, 0x2038))               # Triple/reversed primes, caret
REMOVE.update(range(0x203C, 0x2058))               # !! through asterism (0x203C-0x203E + 0x203F-0x2057)
REMOVE.update(range(0x2070, 0x209D))               # Superscripts & subscripts
REMOVE.update(range(0x2100, 0x2150))               # Letterlike symbols
REMOVE.update(range(0x2303, 0x2306))               # Technical: up arrowhead – projective
REMOVE |= {0x2318, 0x232B, 0x2380, 0x2387,
           0x238B, 0x2423}                         # Technical singles
REMOVE.update(range(0x2325, 0x2328))               # Option key – x in a rectangle
REMOVE.update(range(0x23CE, 0x23D0))               # Return symbol, eject symbol
REMOVE.update(range(0x2460, 0x246A))               # Circled digits 1-10
REMOVE.update(range(0x24B6, 0x24D0))               # Circled Latin letters A-Z
REMOVE.add(0x24EA)                                 # Circled digit zero
REMOVE.update(range(0x25A0, 0x25A3))               # Black/white square, white square w/ corners
REMOVE.add(0x25AA)                                 # Black small square
REMOVE.update(range(0x25B2, 0x25B4))               # Black/white up-pointing triangle
REMOVE.update(range(0x25B6, 0x25B8))               # Black/white right-pointing triangle
REMOVE.update(range(0x25BA, 0x25BE))               # Right/down-pointing pointers & triangles
REMOVE.update(range(0x25C0, 0x25C2))               # Black/white left-pointing triangle
REMOVE.update(range(0x25C4, 0x25C8))               # Left-pointing pointers & black/white diamond
REMOVE.update(range(0x25CA, 0x25CC))               # Lozenge, white circle
REMOVE |= {0x25CF, 0x25E6, 0x25EF}                # Black circle, white bullet, large circle
REMOVE.add(0x2600)                                 # Black sun with rays
REMOVE.update(range(0x2605, 0x2607))               # Black/white star
REMOVE |= {0x263C, 0x2661, 0x2665, 0x26A0}        # Misc symbols
REMOVE |= {0x2713, 0x2717, 0x2756, 0x2764}        # Check mark, ballot x, rotated floral, heavy heart
REMOVE.update(range(0x2780, 0x278A))               # Dingbat circled sans-serif digits 1-10
REMOVE.add(0x27EF)                                 # Dingbat
REMOVE.update(range(0x27F5, 0x27FB))               # Long arrows
REMOVE |= {0x2913, 0x2A38, 0x2B06, 0x2B1C, 0x2B24}  # Misc math / arrows
REMOVE.update(range(0x2B12, 0x2B14))               # Squares with upper/lower right diagonal half
REMOVE.update(range(0x2C7C, 0x2C80))               # Latin Extended-C modifier letters
REMOVE.update(range(0x1D00, 0x1D80))               # Phonetic Extensions (IPA, small caps)
REMOVE |= {0x1D9C, 0x1DA0, 0x1DBB, 0x1DBF}        # Phonetic Extensions singles
REMOVE.update(range(0x1DC0, 0x1E00))               # Combining Diacritical Marks Supplement
REMOVE.add(0xA7FF)                                 # Latin Extended-D
REMOVE.update(range(0xE000, 0xF900))               # Private Use Area
REMOVE.add(0x1F12F)                                # Copyleft symbol
REMOVE.update(range(0x1F130, 0x1F14A))             # Squared Latin letters
REMOVE.update(range(0x1F16A, 0x1F16C))             # Raised MC / MD signs
REMOVE |= {0x1F850, 0x1F852}                       # Supplemental arrows

# ---------------------------------------------------------------------------
# Font pairs: (TTF source, WOFF2 output)
# Inter uses different output names from its TTF names.
# ---------------------------------------------------------------------------
FONT_PAIRS = [
    ("Inter/Inter-VariableFont_opsz,wght.ttf",                        "Inter/InterVariable.woff2"),
    ("Inter/Inter-Italic-VariableFont_opsz,wght.ttf",                 "Inter/InterVariable-Italic.woff2"),
    ("EB_Garamond/EBGaramond-VariableFont_wght.ttf",                  "EB_Garamond/EBGaramond-VariableFont_wght.woff2"),
    ("EB_Garamond/EBGaramond-Italic-VariableFont_wght.ttf",           "EB_Garamond/EBGaramond-Italic-VariableFont_wght.woff2"),
    ("Cormorant_Garamond/CormorantGaramond-VariableFont_wght.ttf",    "Cormorant_Garamond/CormorantGaramond-VariableFont_wght.woff2"),
    ("Cormorant_Garamond/CormorantGaramond-Italic-VariableFont_wght.ttf", "Cormorant_Garamond/CormorantGaramond-Italic-VariableFont_wght.woff2"),
    ("Libre_Baskerville/LibreBaskerville-VariableFont_wght.ttf",      "Libre_Baskerville/LibreBaskerville-VariableFont_wght.woff2"),
    ("Libre_Baskerville/LibreBaskerville-Italic-VariableFont_wght.ttf", "Libre_Baskerville/LibreBaskerville-Italic-VariableFont_wght.woff2"),
    ("Ibarra_Real_Nova/IbarraRealNova-VariableFont_wght.ttf",         "Ibarra_Real_Nova/IbarraRealNova-VariableFont_wght.woff2"),
    ("Ibarra_Real_Nova/IbarraRealNova-Italic-VariableFont_wght.ttf",  "Ibarra_Real_Nova/IbarraRealNova-Italic-VariableFont_wght.woff2"),
]

# ---------------------------------------------------------------------------
# Convert
# ---------------------------------------------------------------------------
for ttf_rel, woff2_rel in FONT_PAIRS:
    ttf_path   = os.path.join(SCRIPT_DIR, ttf_rel)
    woff2_path = os.path.join(SCRIPT_DIR, woff2_rel)

    if not os.path.exists(ttf_path):
        print(f"NOT FOUND: {ttf_rel}")
        continue

    before = os.path.getsize(woff2_path) if os.path.exists(woff2_path) else 0
    print(f"Processing {os.path.basename(ttf_path)} ...", end=" ", flush=True)

    options = ft_subset.Options()
    options.flavor      = 'woff2'
    options.hinting     = True           # keep all grid-fitting instructions
    options.drop_tables = []             # don't silently drop any tables
    options.no_subset_tables += ['name'] # leave the naming table entirely untouched

    font = ft_subset.load_font(ttf_path, options)
    cmap = font.getBestCmap()
    keep = set(cmap.keys()) - REMOVE
    removed_count = len(REMOVE & set(cmap.keys()))

    subs = ft_subset.Subsetter(options=options)
    subs.populate(unicodes=list(keep))
    subs.subset(font)
    ft_subset.save_font(font, woff2_path, options)

    after = os.path.getsize(woff2_path)
    print(f"{before/1024:.1f} KB -> {after/1024:.1f} KB  ({removed_count} glyphs removed)")

print("\nAll conversions complete.")
