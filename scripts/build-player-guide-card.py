"""Render the original video-guide composition with an ivory outer background."""
from io import BytesIO
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
import cairosvg

ROOT = Path(__file__).resolve().parent.parent
SCALE = 3
PAPER, GREEN, GOLD = "#FEF6E9", "#082D29", "#B3914A"
image = Image.new("RGB", (1200 * SCALE, 675 * SCALE), PAPER)
draw = ImageDraw.Draw(image)


def font(size, family="aref-ruqaa-arabic-700"):
    source = TTFont(ROOT / f"fonts/{family}.woff2")
    source.flavor = None
    data = BytesIO()
    source.save(data)
    data.seek(0)
    return ImageFont.truetype(data, size * SCALE)


def text(value, right, center_y, size, color, family="aref-ruqaa-arabic-700"):
    face = font(size, family)
    x0, y0, x1, y1 = draw.textbbox((0, 0), value, font=face, direction="rtl", language="ar")
    draw.text((right * SCALE - x1, center_y * SCALE - (y1 + y0) / 2), value,
              font=face, fill=color, direction="rtl", language="ar")


# Preserve the initial card's border, portrait poster and right-aligned copy.
draw.rounded_rectangle((24*SCALE, 24*SCALE, 1175*SCALE, 650*SCALE),
                       radius=27*SCALE, outline=GOLD, width=SCALE)
poster = Image.open(ROOT / "media/player-guide-poster.jpg").convert("RGB")
poster = poster.resize((310*SCALE, 548*SCALE), Image.Resampling.LANCZOS)
mask = Image.new("L", poster.size)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, poster.width-1, poster.height-1),
                                      radius=23*SCALE, fill=255)
image.paste(poster, (91*SCALE, 64*SCALE), mask)
draw.rounded_rectangle((88*SCALE, 62*SCALE, 404*SCALE, 612*SCALE),
                       radius=25*SCALE, outline=GOLD, width=SCALE)

mark_bytes = cairosvg.svg2png(url=str(ROOT / "icons/zad-mark.svg"),
                             output_width=64*SCALE, output_height=64*SCALE)
mark = Image.open(BytesIO(mark_bytes)).convert("RGBA")
image.paste(mark, (1048*SCALE, 107*SCALE), mark)
text("زاد الخير", 1028, 139, 55, GOLD)
text("دليل مشغّل التلاوة", 1090, 268, 64, GREEN)
text("تعرّف على إعدادات", 1090, 365, 29, "#647267", "alexandria-arabic-400-800")
text("مشغّل التلاوة", 1090, 413, 29, "#647267", "alexandria-arabic-400-800")

draw.rounded_rectangle((770*SCALE, 500*SCALE, 1091*SCALE, 568*SCALE),
                       radius=25*SCALE, fill="#E2CB83")
text("شاهد الدليل", 1004, 534, 27, GREEN, "alexandria-arabic-400-800")
draw.polygon([(1025*SCALE, 520*SCALE), (1025*SCALE, 547*SCALE),
              (1048*SCALE, 533.5*SCALE)], fill=GREEN)

image.resize((1200, 675), Image.Resampling.LANCZOS).save(
    ROOT / "social/player-guide-card-v5.jpg", quality=94, optimize=True)
