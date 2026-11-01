"""Render the guide card using the site's own fonts and discovery-card geometry."""
from io import BytesIO
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SCALE = 3
PAPER, GREEN, GOLD = "#FEF6E9", "#075F53", "#C79537"
image = Image.new("RGB", (1200 * SCALE, 675 * SCALE), PAPER)
draw = ImageDraw.Draw(image)


def font(size):
    source = TTFont(ROOT / "fonts/aref-ruqaa-arabic-700.woff2")
    source.flavor = None
    data = BytesIO()
    source.save(data)
    data.seek(0)
    return ImageFont.truetype(data, size * SCALE)


def text(value, center, size, color):
    face = font(size)
    x0, y0, x1, y1 = draw.textbbox((0, 0), value, font=face, direction="rtl", language="ar")
    draw.text((center[0] * SCALE - (x1 + x0) / 2,
               center[1] * SCALE - (y1 + y0) / 2), value,
              font=face, fill=color, direction="rtl", language="ar")


def diamond(x, y, width=5, height=11):
    draw.polygon([(x * SCALE, (y-height) * SCALE), ((x+width) * SCALE, y * SCALE),
                  (x * SCALE, (y+height) * SCALE), ((x-width) * SCALE, y * SCALE)], fill=GOLD)


# Match the existing surah/juz cards: flat paper, fine rounded frame and diamonds.
draw.rounded_rectangle((31*SCALE, 31*SCALE, 1169*SCALE, 644*SCALE),
                       radius=39*SCALE, outline=GOLD, width=2*SCALE)
diamond(600, 31)
diamond(600, 644)

text("زاد الخير", (600, 151), 48, GREEN)
text("دليل مشغّل التلاوة", (600, 300), 139, GREEN)
draw.line((480*SCALE, 404*SCALE, 574*SCALE, 404*SCALE), fill=GOLD, width=SCALE)
draw.line((626*SCALE, 404*SCALE, 720*SCALE, 404*SCALE), fill=GOLD, width=SCALE)
diamond(600, 404, 4, 8)

text("شرح بالفيديو", (627, 490), 58, GOLD)
# A small line icon, using the same weight as the app's existing icons.
draw.rounded_rectangle((421*SCALE, 470*SCALE, 472*SCALE, 509*SCALE),
                       radius=6*SCALE, outline=GOLD, width=2*SCALE)
draw.polygon([(440*SCALE, 480*SCALE), (440*SCALE, 499*SCALE),
              (455*SCALE, 489.5*SCALE)], fill=GREEN)

image.resize((1200, 675), Image.Resampling.LANCZOS).save(
    ROOT / "social/player-guide-card-v3.jpg", quality=94, optimize=True)
