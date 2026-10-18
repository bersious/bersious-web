"""Re-crop duck sprite TIGHT theo body thật, giữ margin đầy đủ.

Ảnh gốc 3168x1344 RGBA (thực tế là nền trắng, alpha=255 everywhere),
3 frame NGANG, mỗi frame 1056x1344.

Bug cũ:
- recrop_duck_tight.py cũ lấy bbox alpha > 10 -> 4 cạnh = full canvas
- Vì alpha=255 ở nền trắng, bbox = full frame
- Body vịt 80kg có chân chạm rìa -> viền vuông

Fix:
- Tìm bbox vật thể (pixel KHÁC trắng, tolerance 30) trên ảnh RGB
- Crop body + padding 50px
- Resize fit vào canvas 400x400 (giữ tỉ lệ - không méo)
- Tách nền trắng bằng flood-fill 4 góc -> alpha
- Embed body fit vào canvas vuông 400x400 (transparent)
- Kết quả: vịt nằm gọn trong canvas, KHÔNG chạm rìa, có margin
"""

from PIL import Image
import numpy as np
from pathlib import Path

SRC_DIR = Path(r'C:\Users\nguye\Desktop\tmn 2010')
OUT_DIR = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')
TARGET_SIZE = 400
PADDING = 50  # margin xung quanh body
SAFE_MARGIN = 30  # margin tối thiểu trong canvas (đảm bảo body không chạm rìa)
COLOR_TOLERANCE = 30  # pixel khác trắng > 30 = vật thể


def find_body_bbox(arr: np.ndarray) -> tuple:
    """Tìm bbox body vịt (pixel không trắng) trên ảnh RGB."""
    diff = np.abs(arr.astype(int) - 255).sum(axis=2)
    fg = diff > COLOR_TOLERANCE
    ys, xs = np.where(fg)
    if len(xs) == 0:
        return None
    return (xs.min(), ys.min(), xs.max(), ys.max())


def flood_fill_background(arr_rgb: np.ndarray) -> np.ndarray:
    """Flood-fill nền trắng từ 4 góc."""
    h, w, _ = arr_rgb.shape
    seed = arr_rgb[0, 0].astype(int)
    visited = np.zeros((h, w), dtype=bool)
    is_bg = np.zeros((h, w), dtype=bool)
    stack = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]

    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or visited[y, x]:
            continue
        visited[y, x] = True
        diff = arr_rgb[y, x].astype(int) - seed
        if np.sqrt((diff * diff).sum()) > COLOR_TOLERANCE:
            continue
        is_bg[y, x] = True
        stack.extend([(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)])

    return is_bg


def feather_alpha(alpha: np.ndarray, radius: int = 1) -> np.ndarray:
    from PIL import ImageFilter
    return np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(radius=radius)))


def recrop_frame(frame_arr: np.ndarray, name: str) -> Image:
    """Từ 1 frame ảnh gốc -> sprite 400x400 transparent."""
    h, w = frame_arr.shape[:2]
    print(f'    Source: {w}x{h}')

    # 1. Tìm bbox body thật
    bbox = find_body_bbox(frame_arr)
    if bbox is None:
        print(f'    WARN: no body found')
        return None
    x0, y0, x1, y1 = bbox
    body_w, body_h = x1 - x0 + 1, y1 - y0 + 1
    print(f'    Body bbox: x={x0}-{x1} (w={body_w}), y={y0}-{y1} (h={body_h})')

    # 2. Crop body + padding
    px0 = max(0, x0 - PADDING)
    py0 = max(0, y0 - PADDING)
    px1 = min(w - 1, x1 + PADDING)
    py1 = min(h - 1, y1 + PADDING)
    cropped = frame_arr[py0:py1 + 1, px0:px1 + 1]
    print(f'    Cropped: {cropped.shape[1]}x{cropped.shape[0]}')

    # 3. Resize fit TARGET_SIZE (giữ tỉ lệ, đảm bảo body + margin nằm gọn)
    cw, ch = cropped.shape[1], cropped.shape[0]
    # Scale để vừa body + SAFE_MARGIN mỗi bên -> body nằm trong vùng (TARGET_SIZE - 2*SAFE_MARGIN)
    safe_size = TARGET_SIZE - 2 * SAFE_MARGIN
    scale = min(safe_size / cw, safe_size / ch)
    new_w, new_h = int(cw * scale), int(ch * scale)
    pil_rgb = Image.fromarray(cropped).resize((new_w, new_h), Image.LANCZOS)
    print(f'    Resized: {new_w}x{new_h} (safe margin {SAFE_MARGIN}px)')

    # 4. Tách nền trắng -> alpha
    rgb_arr = np.array(pil_rgb)
    is_bg = flood_fill_background(rgb_arr)
    alpha = np.where(is_bg, 0, 255).astype(np.uint8)
    alpha = feather_alpha(alpha, radius=1)
    transp = (alpha == 0).sum() / alpha.size * 100
    print(f'    Transparent: {transp:.1f}%')

    # 5. Embed vào canvas vuông TARGET_SIZE
    rgba = np.zeros((TARGET_SIZE, TARGET_SIZE, 4), dtype=np.uint8)
    oy = (TARGET_SIZE - new_h) // 2
    ox = (TARGET_SIZE - new_w) // 2
    rgba[oy:oy + new_h, ox:ox + new_w, :3] = rgb_arr
    rgba[oy:oy + new_h, ox:ox + new_w, 3] = alpha

    return Image.fromarray(rgba, 'RGBA')


def process_one(src_name: str, kg: str):
    print(f'\n=== {kg}kg ===')
    src = SRC_DIR / src_name
    if not src.exists():
        print(f'  MISSING: {src}')
        return

    img = np.array(Image.open(src).convert('RGB'))
    # 3 frame NGANG, mỗi frame 1056x1344
    frame_w = img.shape[1] // 3
    frames = [
        img[:, 0:frame_w],
        img[:, frame_w:frame_w * 2],
        img[:, frame_w * 2:frame_w * 3],
    ]

    for i, frame in enumerate(frames, 1):
        print(f'\n  -- Frame {i} --')
        result = recrop_frame(frame, f'frame{i}')
        if result is None:
            continue
        out = OUT_DIR / f'duck-{kg}kg-f{i}.png'
        result.save(out, optimize=True)
        print(f'  SAVED: {out.name} ({out.stat().st_size / 1024:.0f}KB)')


if __name__ == '__main__':
    for kg in ['30', '45', '60', '70', '80']:
        process_one(f'duck-{kg}kg-fly.png', kg)
