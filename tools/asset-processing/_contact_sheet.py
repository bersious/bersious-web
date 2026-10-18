"""Verify all flying ducks + pipes - generate a contact sheet."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(r"C:\Users\nguye\bersious-web\assets\game\processed")
TOOL = Path(r"C:\Users\nguye\bersious-web\tools\asset-processing")

ks = ["30kg", "45kg", "60kg", "70kg", "80kg"]
fs = [1, 2, 3]

# Build contact sheet 5 cols × 3 rows of ducks
CELL = 200
PAD = 10
COLS = 5
ROWS = 3
W = COLS * CELL + (COLS + 1) * PAD
H = ROWS * CELL + (ROWS + 1) * PAD + 40
sheet = Image.new("RGBA", (W, H), (255, 255, 255, 255))
d = ImageDraw.Draw(sheet)
try:
    fnt = ImageFont.truetype("arial.ttf", 16)
except Exception:
    fnt = ImageFont.load_default()

for ri, f in enumerate(fs):
    for ci, k in enumerate(ks):
        f_img = Image.open(OUT / f"duck-{k}-f{f}.png").convert("RGBA")
        thumb = f_img.copy()
        thumb.thumbnail((CELL - 10, CELL - 30), Image.LANCZOS)
        x = PAD + ci * (CELL + PAD) + (CELL - thumb.size[0]) // 2
        y = PAD + ri * (CELL + PAD) + (CELL - thumb.size[1]) // 2 + 20
        sheet.alpha_composite(Image.new("RGBA", thumb.size, (0, 0, 0, 0)))
        sheet.paste(thumb, (x, y), thumb)
        d.text((PAD + ci * (CELL + PAD) + 4, PAD + ri * (CELL + PAD) + 4),
               f"f{f}", fill=(50, 50, 50, 255), font=fnt)
    d.text((PAD, PAD + ri * (CELL + PAD) + 4),
           f"row f={fs[ri]}", fill=(180, 50, 50, 255), font=fnt)

# Add pipe comparison in a strip
PIPE_H = 400
strip = Image.new("RGBA", (W, PIPE_H), (255, 255, 255, 255))
pt = Image.open(OUT / "pipe-top.png").convert("RGBA")
pb = Image.open(OUT / "pipe-bottom.png").convert("RGBA")
pt.thumbnail((CELL, PIPE_H - 20), Image.LANCZOS)
pb.thumbnail((CELL, PIPE_H - 20), Image.LANCZOS)
strip.paste(pt, (PAD + 1 * (CELL + PAD), 20), pt)
d2 = ImageDraw.Draw(strip)
d2.text((PAD + 1 * (CELL + PAD), PIPE_H - 18), "pipe-top", fill=(0, 0, 0), font=fnt)
strip.paste(pb, (PAD + 3 * (CELL + PAD), 20), pb)
d2.text((PAD + 3 * (CELL + PAD), PIPE_H - 18), "pipe-bottom", fill=(0, 0, 0), font=fnt)

# Save final composite
final_h = H + PIPE_H + 20
final = Image.new("RGB", (W, final_h), (255, 255, 255))
final.paste(sheet.convert("RGB"), (0, 0))
final.paste(strip.convert("RGB"), (0, H + 20))
final.save(TOOL / "_contact_sheet.png")
print(f"✓ _contact_sheet.png {final.size}")
