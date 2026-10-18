r"""
Re-crop collectibles.png with CORRECT coordinates (based on grid analysis).
Each item's pixel coordinates were measured from the grid visualization.
"""
from pathlib import Path
from PIL import Image
from rembg import new_session, remove
import numpy as np

INPUT = Path(r'C:\Users\nguye\Desktop\tmn 2010\tra sua bun bo.png')
OUTPUT = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')

# Toa do pixel chinh xac (do bang grid 1/8)
# Format: (ten_file, x1, y1, x2, y2) - toa do goc 2752x1536
ITEMS = [
    # Top row: 4 ly tra sua
    ('tea-brownsugar',  344,  192, 1032,  576),
    ('tea-matcha',     1032,  192, 1376,  576),
    ('tea-strawberry', 1376,  192, 2064,  576),
    ('tea-taro',       2064,  192, 2408,  576),
    # Mid row: 2 tra sua + 1 bun bo
    ('tea-mango',      1032,  576, 1376,  960),
    ('tea-thai',       1376,  576, 1720,  960),
    ('bun-bo-hue',     1720,  576, 2408,  960),
    # Bottom: 2 ong cot
    ('pipe-top',        688,  960, 1376, 1536),
    ('pipe-bottom',    1720,  960, 2064, 1536),
]

TARGET_SIZE = 280  # px, canh lon nhat

print('Re-cropping collectibles...')
# Buoc 1: Tach nen 1 lan (dung cho ca 9 item)
img_orig = Image.open(INPUT).convert('RGBA')
max_dim = 2048
if max(img_orig.size) > max_dim:
    ratio = max_dim / max(img_orig.size)
    new_size = (int(img_orig.size[0] * ratio), int(img_orig.size[1] * ratio))
    img_orig = img_orig.resize(new_size, Image.LANCZOS)

print(f'  Removing background from {img_orig.size}...')
session = new_session('u2net')
result = remove(np.array(img_orig), session=session, only_mask=False)
bg_removed = Image.fromarray(result).convert('RGBA')

# Scale factor tu anh goc (2752x1536) -> anh da resize
scale_x = bg_removed.size[0] / 2752
scale_y = bg_removed.size[1] / 1536
print(f'  Scale: x={scale_x:.3f}, y={scale_y:.3f}')

# Buoc 2: Crop tung item theo toa do da scale
for name, x1, y1, x2, y2 in ITEMS:
    # Scale toa do
    sx1, sy1 = int(x1 * scale_x), int(y1 * scale_y)
    sx2, sy2 = int(x2 * scale_x), int(y2 * scale_y)
    frame = bg_removed.crop((sx1, sy1, sx2, sy2))

    # Resize giu ti le, max = TARGET_SIZE
    ratio = TARGET_SIZE / max(frame.size)
    if ratio < 1:
        new_size = (int(frame.size[0] * ratio), int(frame.size[1] * ratio))
        frame = frame.resize(new_size, Image.LANCZOS)

    out_path = OUTPUT / f'{name}.png'
    frame.save(out_path, 'PNG', optimize=True)
    size_kb = out_path.stat().st_size // 1024
    print(f'  [OK] {name}.png  ({frame.size}, {size_kb} KB)')

print('\nDone!')
