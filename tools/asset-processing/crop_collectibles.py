r"""
Auto-detect bounding boxes of each item in collectibles.png using
connected components + clustering. No more guessing from vision AI.
"""
from pathlib import Path
from PIL import Image
import numpy as np
from rembg import new_session, remove
from scipy import ndimage

INPUT = Path(r'C:\Users\nguye\Desktop\tmn 2010\tra sua bun bo.png')
OUTPUT = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')
TARGET_SIZE = 280

# Buoc 1: Remove background
print('Loading + removing background...')
img = Image.open(INPUT).convert('RGB')
w, h = img.size  # 2752 x 1536

# Resize for performance
max_dim = 2048
if max(img.size) > max_dim:
    ratio = max_dim / max(img.size)
    new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
    img_resized = img.resize(new_size, Image.LANCZOS)
else:
    img_resized = img

session = new_session('u2net')
result = remove(np.array(img_resized), session=session, only_mask=False)
mask = (result[:, :, 3] > 128).astype(np.uint8)  # binary: 1 = has content

print(f'  Mask: {mask.shape}, total pixels: {mask.sum()}')

# Buoc 2: Connected components
print('Finding connected components...')
labeled, n = ndimage.label(mask)
print(f'  Found {n} components')

# Lay bounding box cua moi component
bboxes = []
for i in range(1, n + 1):
    ys, xs = np.where(labeled == i)
    if len(ys) < 500:  # bo qua qua nho (noise, text, etc)
        continue
    bboxes.append({
        'id': i,
        'x1': xs.min(),
        'y1': ys.min(),
        'x2': xs.max(),
        'y2': ys.max(),
        'w': xs.max() - xs.min(),
        'h': ys.max() - ys.min(),
        'area': len(ys),
    })

print(f'  {len(bboxes)} components after size filter')

# Sap xep theo y roi x (top-left to bottom-right)
bboxes.sort(key=lambda b: (b['y1'] // 200, b['x1']))  # group by row (~200px height)

# Buoc 3: Phan loai theo hang (top/mid/bottom) va cot (left/right)
# 9 item can tim: 4 top + 3 mid + 2 bottom
# Tinh tam diem de xac dinh row
rows = {'top': [], 'mid': [], 'bot': []}
H = mask.shape[0]
for b in bboxes:
    cy = (b['y1'] + b['y2']) / 2
    if cy < H * 0.30:
        rows['top'].append(b)
    elif cy < H * 0.65:
        rows['mid'].append(b)
    else:
        rows['bot'].append(b)

for r, items in rows.items():
    items.sort(key=lambda b: b['x1'])
    print(f'  {r}: {len(items)} items')

# Buoc 4: Merge small bboxes cung vi tri (vi 1 item co the co 2-3 components)
# Lay bbox lon nhat trong moi "cluster"
def merge_cluster(cluster, gap_threshold=50):
    """Merge cac bbox gan nhau thanh 1 bbox lon."""
    if not cluster:
        return None
    x1 = min(b['x1'] for b in cluster)
    y1 = min(b['y1'] for b in cluster)
    x2 = max(b['x2'] for b in cluster)
    y2 = max(b['y2'] for b in cluster)
    return {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}

# Top row: 4 items
top_merged = []
for b in rows['top']:
    # tim cluster trong top_merged
    found = False
    for m in top_merged:
        if abs(m['x1'] - b['x1']) < 50 or abs(m['x2'] - b['x2']) < 50:
            # merge
            m['x1'] = min(m['x1'], b['x1'])
            m['x2'] = max(m['x2'], b['x2'])
            m['y1'] = min(m['y1'], b['y1'])
            m['y2'] = max(m['y2'], b['y2'])
            found = True
            break
    if not found:
        top_merged.append(dict(b))
top_merged.sort(key=lambda b: b['x1'])

# Mid row: 3 items
mid_merged = []
for b in rows['mid']:
    found = False
    for m in mid_merged:
        if abs(m['x1'] - b['x1']) < 50 or abs(m['x2'] - b['x2']) < 50:
            m['x1'] = min(m['x1'], b['x1'])
            m['x2'] = max(m['x2'], b['x2'])
            m['y1'] = min(m['y1'], b['y1'])
            m['y2'] = max(m['y2'], b['y2'])
            found = True
            break
    if not found:
        mid_merged.append(dict(b))
mid_merged.sort(key=lambda b: b['x1'])

# Bottom row: 2 items
bot_merged = []
for b in rows['bot']:
    found = False
    for m in bot_merged:
        if abs(m['x1'] - b['x1']) < 50 or abs(m['x2'] - b['x2']) < 50:
            m['x1'] = min(m['x1'], b['x1'])
            m['x2'] = max(m['x2'], b['x2'])
            m['y1'] = min(m['y1'], b['y1'])
            m['y2'] = max(m['y2'], b['y2'])
            found = True
            break
    if not found:
        bot_merged.append(dict(b))
bot_merged.sort(key=lambda b: b['x1'])

# Visualize bounding boxes
vis = Image.open(INPUT).convert('RGB').copy()
vis_resized = vis.resize((mask.shape[1], mask.shape[0]), Image.LANCZOS)
from PIL import ImageDraw
draw = ImageDraw.Draw(vis_resized)
colors = ['red', 'blue', 'green', 'orange', 'purple', 'cyan', 'magenta', 'yellow', 'lime']

print('\nDetected items:')
all_items = top_merged + mid_merged + bot_merged
for i, b in enumerate(all_items):
    draw.rectangle([(b['x1'], b['y1']), (b['x2'], b['y2'])], outline=colors[i % len(colors)], width=4)
    draw.text((b['x1'], b['y1']), f'#{i}', fill=colors[i % len(colors)])
    print(f'  #{i}: ({b["x1"]}, {b["y1"]}) -> ({b["x2"]}, {b["y2"]})  {b["x2"]-b["x1"]}x{b["y2"]-b["y1"]}')

vis_resized.save(OUTPUT / '_debug_bboxes.png')
print(f'\nSaved debug visualization with {len(all_items)} bboxes')

# Buoc 5: Scale toa do ve anh goc (2752x1536)
# Luu y: bounding box dang tinh tren anh da resize, can scale nguoc
scale_x = 2752 / vis_resized.size[0]
scale_y = 1536 / vis_resized.size[1]

# Gan ten cho tung bbox
NAMES = [
    'tea-brownsugar', 'tea-matcha', 'tea-strawberry', 'tea-taro',  # top row
    'tea-mango', 'tea-thai', 'bun-bo-hue',  # mid row
    'pipe-top', 'pipe-bottom',  # bottom row
]

if len(all_items) == 9:
    print('\nCropping and saving...')
    bg_removed_img = Image.fromarray(result).convert('RGBA')
    for name, b in zip(NAMES, all_items):
        # Scale bbox to original size
        ox1 = int(b['x1'] * scale_x)
        oy1 = int(b['y1'] * scale_y)
        ox2 = int(b['x2'] * scale_x)
        oy2 = int(b['y2'] * scale_y)

        # Add small padding
        pad = 20
        ox1 = max(0, ox1 - pad)
        oy1 = max(0, oy1 - pad)
        ox2 = min(2752, ox2 + pad)
        oy2 = min(1536, oy2 + pad)

        # Use bg_removed_img at original size - need to re-do bg removal at original size
        # For now use resized version (will be slightly lower quality)
        # Scale back to bg_removed_img size
        # Actually bg_removed_img is same size as mask = resized, so use directly
        sx1 = max(0, b['x1'] - pad)
        sy1 = max(0, b['y1'] - pad)
        sx2 = min(bg_removed_img.size[0], b['x2'] + pad)
        sy2 = min(bg_removed_img.size[1], b['y2'] + pad)

        frame = bg_removed_img.crop((sx1, sy1, sx2, sy2))

        # Resize to TARGET_SIZE
        ratio = TARGET_SIZE / max(frame.size)
        if ratio < 1:
            new_size = (int(frame.size[0] * ratio), int(frame.size[1] * ratio))
            frame = frame.resize(new_size, Image.LANCZOS)

        out_path = OUTPUT / f'{name}.png'
        frame.save(out_path, 'PNG', optimize=True)
        size_kb = out_path.stat().st_size // 1024
        print(f'  [OK] {name}.png  ({frame.size}, {size_kb} KB)')
else:
    print(f'\n[WARNING] Expected 9 items, got {len(all_items)}. Skipping crop.')
