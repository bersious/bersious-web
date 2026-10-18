"""Re-crop ảnh bonus (win/lose) bằng flood-fill từ 4 góc.

Script cũ dùng connected_components lấy largest component → fail với
ảnh có nhiều chi tiết rời (confetti, mồ hôi, X X).

Cách mới:
- Lấy màu seed từ 4 góc ảnh
- BFS tô vùng nền (4-connectivity, color dist < 35)
- Mask ngược = vật thể + chi tiết rời đều giữ
- Tìm bbox tight của TẤT CẢ pixel không phải nền (kể cả confetti, X)
- Crop tight với padding 20px
- Resize về 600x600 (transparent, nền sạch)
- Feather viền nhẹ 1px

Ảnh gốc 2048x2048, crop về 600x600 trong suốt.
"""

from PIL import Image
import numpy as np
from pathlib import Path

SRC_DIR = Path(r'C:\Users\nguye\Desktop\tmn 2010')
OUT_DIR = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')
TARGET_SIZE = 600
PADDING = 20
COLOR_TOLERANCE = 35


def flood_fill_background(arr_rgb: np.ndarray) -> np.ndarray:
    """Trả về mask BOOL: True = nền (4-connectivity flood từ 4 góc)."""
    h, w, _ = arr_rgb.shape
    seeds = []
    for sy, sx in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]:
        seeds.append((sy, sx))

    seed_color = arr_rgb[0, 0].astype(int)
    print(f'  Seed color (4 góc trùng? RGB = {seed_color})')

    visited = np.zeros((h, w), dtype=bool)
    is_bg = np.zeros((h, w), dtype=bool)
    stack = list(seeds)

    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w:
            continue
        if visited[y, x]:
            continue
        visited[y, x] = True

        # Color distance
        diff = arr_rgb[y, x].astype(int) - seed_color
        dist = np.sqrt((diff * diff).sum())
        if dist > COLOR_TOLERANCE:
            continue

        is_bg[y, x] = True
        stack.append((y + 1, x))
        stack.append((y - 1, x))
        stack.append((y, x + 1))
        stack.append((y, x - 1))

    return is_bg


def feather_alpha(alpha: np.ndarray, radius: int = 1) -> np.ndarray:
    """Làm mượt viền alpha bằng blur Gaussian."""
    from PIL import ImageFilter
    img = Image.fromarray(alpha)
    img = img.filter(ImageFilter.GaussianBlur(radius=radius))
    return np.array(img)


def process_one(src_path: Path, out_path: Path, name: str):
    print(f'\n--- {name} ---')
    img = Image.open(src_path).convert('RGB')
    arr = np.array(img)
    print(f'  Source: {img.size}')

    # 1. Flood-fill nền
    is_bg = flood_fill_background(arr)
    bg_pct = is_bg.sum() / is_bg.size * 100
    print(f'  Nền (flood-fill): {bg_pct:.1f}%')

    # 2. Mask ngược = vật thể
    fg_mask = ~is_bg

    # 3. Tìm bbox
    ys, xs = np.where(fg_mask)
    if len(xs) == 0:
        print('  WARN: Không tìm thấy vật thể, fallback toàn ảnh')
        return
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    print(f'  Bbox vật thể: x={x0}-{x1} ({x1-x0+1}px), y={y0}-{y1} ({y1-y0+1}px)')

    # 4. Crop + padding
    x0 = max(0, x0 - PADDING)
    y0 = max(0, y0 - PADDING)
    x1 = min(arr.shape[1] - 1, x1 + PADDING)
    y1 = min(arr.shape[0] - 1, y1 + PADDING)
    cropped = arr[y0:y1 + 1, x0:x1 + 1]
    cropped_bg = is_bg[y0:y1 + 1, x0:x1 + 1]
    print(f'  Cropped: {cropped.shape}')

    # 5. Resize giữ ratio → fit TARGET_SIZE
    h, w = cropped.shape[:2]
    if h > w:
        new_h = TARGET_SIZE
        new_w = int(w * TARGET_SIZE / h)
    else:
        new_w = TARGET_SIZE
        new_h = int(h * TARGET_SIZE / w)
    pil = Image.fromarray(cropped)
    pil = pil.resize((new_w, new_h), Image.LANCZOS)
    pil_bg = Image.fromarray((cropped_bg * 255).astype(np.uint8))
    pil_bg = pil_bg.resize((new_w, new_h), Image.LANCZOS)
    print(f'  Resized: {new_w}x{new_h}')

    # 6. Tạo RGBA, set nền = transparent
    rgba = np.array(pil.convert('RGBA'))
    bg_alpha = np.array(pil_bg)
    # Pixel nền (bg=1) → alpha=0
    rgba[:, :, 3] = np.where(bg_alpha > 128, 0, 255)
    # Feather viền
    rgba[:, :, 3] = feather_alpha(rgba[:, :, 3], radius=1)

    # 7. Embed trong canvas vuông TARGET_SIZE (nền transparent)
    canvas = np.zeros((TARGET_SIZE, TARGET_SIZE, 4), dtype=np.uint8)
    oy = (TARGET_SIZE - new_h) // 2
    ox = (TARGET_SIZE - new_w) // 2
    canvas[oy:oy + new_h, ox:ox + new_w] = rgba

    Image.fromarray(canvas, 'RGBA').save(out_path, optimize=True)
    print(f'  SAVED: {out_path} ({out_path.stat().st_size / 1024:.0f}KB)')


if __name__ == '__main__':
    for src_name, out_name in [
        ('win.png', 'duck-win.png'),
        ('lose.png', 'duck-lose.png'),
    ]:
        src = SRC_DIR / src_name
        out = OUT_DIR / out_name
        if src.exists():
            process_one(src, out, src_name)
        else:
            print(f'MISSING: {src}')
