"""
Recrop 9 item tu trasuabanhngot.png (Gemini v2)
Nen teal/turquoise (de tach bang rembg)
"""
from PIL import Image
import numpy as np
from rembg import remove
from scipy import ndimage
from pathlib import Path
import sys

SRC = Path(r'C:\Users\nguye\Desktop\tmn 2010\trasuabanhngot.png')
OUT = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')
PAD = 12

# Mapping: name -> bbox (x0, y0, x1, y1)
# Sort by size (desc) -> C1..C9
# C9 (brownsugar, top-left) ... C1 (bun-bo, bot-left)
ITEMS = [
    ('tea-brownsugar', 183,   59,  498,  632),  # C9 top-left
    ('tea-matcha',     865,   59, 1182,  632),  # C7 top-mid
    ('tea-strawberry', 1549,  59, 1865,  632),  # C8 top-right
    ('tea-taro',       183,  735,  498, 1314),  # C6 mid-left
    ('tea-mango',      865,  735, 1182, 1314),  # C5 mid-mid
    ('tea-thai',       1549, 735, 1865, 1314),  # C4 mid-right
    ('bun-bo-hue',     73,  1499,  606, 1959),  # C1 bot-left
    ('cake-flan',      749, 1533, 1298, 1907),  # C2 bot-mid
    ('cake-tart',      1471,1497, 1942, 1914),  # C3 bot-right
]

print(f'Loading {SRC}')
src = Image.open(SRC).convert('RGBA')
W, H = src.size
print(f'  size: {W}x{H}')

# Pre-compute rembg 1 lan
print('Removing background (1 pass)...')
removed_full = remove(src)  # tung lan cho ca anh
removed_full.save(r'C:\Users\nguye\AppData\Local\Temp\trasuabanhngot_nobg.png')

arr_full = np.array(removed_full)
alpha_full = arr_full[:, :, 3]

# Crop truc tiep tu arr_full (nhanh hon goi remove nhieu lan)
for name, x0, y0, x1, y1 in ITEMS:
    # Crop vung bbox (RGB + alpha)
    crop = arr_full[y0:y1+1, x0:x1+1]  # (h, w, 4)
    h, w = crop.shape[:2]

    # Pad them PAD pixels
    padded = np.zeros((h + 2*PAD, w + 2*PAD, 4), dtype=np.uint8)
    padded[PAD:PAD+h, PAD:PAD+w] = crop

    out_path = OUT / f'{name}.png'
    Image.fromarray(padded, 'RGBA').save(out_path)
    print(f'  {name}: bbox=({x0},{y0})-({x1},{y1}) -> {out_path.name} ({out_path.stat().st_size:,} bytes, padded: {padded.shape[1]}x{padded.shape[0]})')

print('\nDone!')
