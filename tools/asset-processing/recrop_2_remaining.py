import sys
sys.path.insert(0, r'C:\Users\nguye\bersious-web\tools\asset-processing')
from PIL import Image
import numpy as np
from rembg import remove
from pathlib import Path

SRC = Path(r'C:\Users\nguye\Desktop\tmn 2010\tra sua bun bo.png')
OUT = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')
PAD = 12

ITEMS = [
    ('tea-thai',     1248, 494, 1497, 936),
    ('bun-bo-hue',   1691, 596, 2061, 920),
]

src = Image.open(SRC).convert('RGBA')
for name, x0, y0, x1, y1 in ITEMS:
    crop = src.crop((x0, y0, x1+1, y1+1))
    nobg = remove(crop)
    arr = np.array(nobg)
    h, w = arr.shape[:2]
    padded = np.zeros((h + 2*PAD, w + 2*PAD, 4), dtype=np.uint8)
    padded[PAD:PAD+h, PAD:PAD+w] = arr
    out_path = OUT / f'{name}.png'
    Image.fromarray(padded, 'RGBA').save(out_path)
    print(f'{name}: saved {out_path.stat().st_size:,} bytes', flush=True)
print('Done!', flush=True)
