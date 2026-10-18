"""
Recrop 7 items (6 tea + 1 bun bo) từ composite gốc
Dùng bbox chính xác từ connected components sau khi rembg
Mỗi item: rembg riêng (loại bỏ hẳn nền trắng) + crop bbox + pad 10px
KHÔNG flood-fill, KHÔNG keep_largest - vì mỗi cell đã là 1 component riêng
"""
from PIL import Image
import numpy as np
from rembg import remove
from pathlib import Path
import os

SRC = Path(r'C:\Users\nguye\Desktop\tmn 2010\tra sua bun bo.png')
OUT = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')

# Mapping bbox từ components (đã verify với vision)
# Format: (name, x0, y0, x1, y1)
ITEMS = [
    # Hàng trên (4 trà đầu) - bbox xác định từ components
    ('tea-brownsugar', 502,   66, 757,  513),  # C1
    ('tea-matcha',    1007,   66, 1260, 513),  # C2
    ('tea-strawberry',1504,   66, 1760, 509),  # C3
    ('tea-taro',      2009,   66, 2263, 513),  # C4
    # Hàng giữa (2 trà + 1 bún)
    ('tea-mango',      748,  494,  997, 935),  # C5
    ('tea-thai',      1248,  494, 1497, 936),  # C6
    ('bun-bo-hue',    1691,  596, 2061, 920),  # C7
]

PAD = 12  # padding xung quanh item

print(f'Loading source: {SRC}')
src = Image.open(SRC).convert('RGBA')
W, H = src.size
print(f'  size: {W}x{H}')

for name, x0, y0, x1, y1 in ITEMS:
    # Crop vùng bbox
    crop = src.crop((x0, y0, x1+1, y1+1))
    print(f'\n{name}: bbox=({x0},{y0})-({x1},{y1}) -> {crop.size}')

    # Rembg: loại bỏ hẳn nền trắng
    nobg = remove(crop)

    # Pad thêm
    arr = np.array(nobg)
    h, w = arr.shape[:2]
    padded = np.zeros((h + 2*PAD, w + 2*PAD, 4), dtype=np.uint8)
    padded[PAD:PAD+h, PAD:PAD+w] = arr

    out_path = OUT / f'{name}.png'
    Image.fromarray(padded, 'RGBA').save(out_path)
    print(f'  saved: {out_path.name} ({os.path.getsize(out_path):,} bytes) size={padded.shape[1]}x{padded.shape[0]}')

print('\nDone!')
