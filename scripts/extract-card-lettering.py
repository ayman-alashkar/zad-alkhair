"""Extract the two-tone calligraphy of an old surah/juz share card as a transparent PNG.

Used once to carry the original lettering into the new cards (see social/cards/lettering).
Each pixel is modelled as alpha*ink + (1-alpha)*background, with ink either the
green or the gold of the original cards; the closer fit decides the ink.
Usage: python3 scripts/extract-card-lettering.py OLD.jpg OUT.png"""
import sys
import numpy as np
from PIL import Image

B = np.array([254, 246, 233], float)
INKS = np.array([[20, 101, 88], [194, 149, 68]], float)

def extract(src, out):
    a = np.asarray(Image.open(src).convert("RGB")).astype(float)
    h, w, _ = a.shape
    c = a - B
    best_alpha = np.zeros((h, w)); best_res = np.full((h, w), np.inf); best_ink = np.zeros((h, w), int)
    for k, ink in enumerate(INKS):
        v = ink - B
        al = np.clip((c @ v) / (v @ v), 0, 1)
        res = np.linalg.norm(c - al[..., None] * v, axis=2)
        m = res < best_res
        best_res[m], best_alpha[m], best_ink[m] = res[m], al[m], k
    alpha = best_alpha
    alpha[alpha < 0.05] = 0                      # JPEG noise on the plain ground
    # Drop the old frame and its diamonds: keep only the inner area.
    keep = np.zeros((h, w), bool); keep[56:h-56, 56:w-56] = True
    alpha[~keep] = 0
    rgb = INKS[best_ink]
    rgba = np.dstack([rgb, alpha * 255]).round().clip(0, 255).astype(np.uint8)
    im = Image.fromarray(rgba, "RGBA")
    im.crop(im.getbbox()).save(out, optimize=True)

if __name__ == "__main__":
    extract(sys.argv[1], sys.argv[2])
