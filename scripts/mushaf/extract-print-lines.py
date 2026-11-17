"""Line kinds and narrow-line widths of the 1441H Madina Mushaf, from quran-qcf4.

Run once when the source changes (it is not part of `npm run build`):

    npm pack quran-qcf4@1.0.3 && tar xzf quran-qcf4-1.0.3.tgz
    python3 scripts/mushaf/extract-print-lines.py package data/mushaf-src/print-1441-lines.json

quran-qcf4's page JSON (MIT, Mohamad Hajj Rabee) lists every line of the print as
KFGQPC's QCF4 font draws it. Only metadata is kept: which of a page's lines is a
surah title, a basmala or Quran text, and, for text lines narrower than a full
line (pages 1-2 and some surah ends), their width as a share of a full line,
measured from the glyph advances. No glyph or font data is kept.
Requires fontTools (pip install fonttools brotli).
"""
import json, os, statistics, sys
from fontTools.ttLib import TTFont

def main(pkg, out):
    fonts = {}
    def advance(font, code):
        if font not in fonts:
            t = TTFont(os.path.join(pkg, "fonts-woff2", f"{font}_W.woff2"))
            fonts[font] = (t.getBestCmap(), t["hmtx"])
        cmap, hmtx = fonts[font]
        return hmtx[cmap[code]][0]
    pages, widths = [], []
    for p in range(1, 605):
        with open(os.path.join(pkg, "pages", f"{p:03d}.json"), encoding="utf-8") as fh:
            data = json.load(fh)
        lines = []
        for line in data["lines"]:
            kinds = {w["type"] for w in line["words"]}
            if "surah_header" in kinds:
                lines.append({"k": "sura", "s": line["words"][0]["sura"]})
            elif "bismillah" in kinds:
                lines.append({"k": "bism"})
            else:
                adv = sum(advance(w["font"], w["code"]) for w in line["words"])
                widths.append(adv)
                lines.append({"k": "text", "_adv": adv})
        pages.append(lines)
    full = statistics.median(widths)
    for lines in pages:
        for line in lines:
            adv = line.pop("_adv", None)
            if adv is not None and adv / full < 0.9:
                line["w"] = round(adv / full, 4)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"source": "Line kinds and narrow-line widths of the KFGQPC 1441H Madina Mushaf, "
                             "derived from quran-qcf4 1.0.3 page data (MIT); see scripts/mushaf/extract-print-lines.py",
                   "pages": pages}, fh, ensure_ascii=False, separators=(",", ":"))
    narrow = sum(1 for p in pages for l in p if "w" in l)
    print(f"{sum(len(p) for p in pages)} lines, {narrow} narrow; full advance {full}")

if __name__ == "__main__":
    main(*sys.argv[1:3])
