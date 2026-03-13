"""
Convert TTF font files to WOFF2 format.
Requires: pip install fonttools brotli
"""

import os
from fontTools.ttLib import TTFont

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

TTF_FILES = [
    "EB_Garamond/EBGaramond-VariableFont_wght.ttf",
    "EB_Garamond/EBGaramond-Italic-VariableFont_wght.ttf",
    "Cormorant_Garamond/CormorantGaramond-VariableFont_wght.ttf",
    "Cormorant_Garamond/CormorantGaramond-Italic-VariableFont_wght.ttf",
    "Libre_Baskerville/LibreBaskerville-VariableFont_wght.ttf",
    "Libre_Baskerville/LibreBaskerville-Italic-VariableFont_wght.ttf",
    "Ibarra_Real_Nova/IbarraRealNova-VariableFont_wght.ttf",
    "Ibarra_Real_Nova/IbarraRealNova-Italic-VariableFont_wght.ttf",
]

for ttf_rel in TTF_FILES:
    ttf_path = os.path.join(SCRIPT_DIR, ttf_rel)
    woff2_path = ttf_path.replace(".ttf", ".woff2")

    if not os.path.exists(ttf_path):
        print(f"NOT FOUND: {ttf_rel}")
        continue

    print(f"Converting {ttf_rel} ...", end=" ", flush=True)
    font = TTFont(ttf_path)
    font.flavor = "woff2"
    font.save(woff2_path)
    print("done")

print("\nAll conversions complete.")
