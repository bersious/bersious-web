"""Re-crop duck sprite TIGHT theo body thật (bỏ chân, bỏ nhiễu).

Ảnh gốc 3168x1344 RGBA, 3 frame NGANG, mỗi frame 1056x1344, nền TRẮNG.
- Bước 1: Tách nền trắng → alpha (flood-fill 4 góc)
- Bước 2: Bỏ 25% đáy (chân) → mask
- Bước 3: Largest component → body
- Bước 4: Tight bbox + 5% padding
- Bước 5: Scale theo CHIỀU CAO body → chuẩn hóa cùng chiều cao
- Bước 6: Square-pad 400x400

→ 5 sprite (30/45/60/70/80) cùng chiều cao, không giật khi đổi.
"""

import numpy as np
from PIL import Image
from pathlib import Path
from scipy.ndimage import label


SRC = Path(r'C:\Users\nguye\Desktop\tmn 2010')
DST = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')

REPRESENTATIVE_FRAME = 1  # f1 = cánh khép, thân rõ
TARGET_SIZE = 400
TOLERANCE = 35
CROP_BOTTOM_RATIO = 0.78  # Bỏ 22% đáy (chân)


def flood_fill_corners(rgb: np.ndarray, tol: int = TOLERANCE) -> np.ndarray:
    """Tách nền trắng bằng flood-fill từ 4 góc → trả về mask nền."""
    h, w = rgb.shape[:2]
    seeds = np.array([
        rgb[2, 2], rgb[2, w - 3],
        rgb[h - 3, 2], rgb[h - 3, w - 3],
    ], dtype=np.int16)
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    dist_min = np.full((h, w), 999, dtype=np.int16)
    for s in seeds:
        d = np.abs(r - s[0]) + np.abs(g - s[1]) + np.abs(b - s[2])
        dist_min = np.minimum(dist_min, d)
    candidate = dist_min < tol
    bg = np.zeros((h, w), dtype=bool)
    queue = []
    for (cy, cx) in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]:
        if candidate[cy, cx]:
            bg[cy, cx] = True
            queue.append((cy, cx))
    while queue:
        y, x = queue.pop()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w:
                if not bg[ny, nx] and candidate[ny, nx]:
                    bg[ny, nx] = True
                    queue.append((ny, nx))
    return bg


def get_tight_body_bbox(alpha_mask: np.ndarray) -> tuple:
    """Bỏ chân → tìm largest component → bbox.

    Returns (x0, y0, x1, y1) hoặc None.
    """
    h, w = alpha_mask.shape
    # Bỏ 25% đáy (chân)
    body_region = alpha_mask.copy()
    body_region[int(h * CROP_BOTTOM_RATIO):, :] = False

    if not body_region.any():
        return None

    labeled, n = label(body_region)
    if n == 0:
        return None
    sizes = [(i, (labeled == i).sum()) for i in range(1, n + 1)]
    largest_id, _ = max(sizes, key=lambda x: x[1])
    body_mask = labeled == largest_id

    if not body_mask.any():
        return None
    ys, xs = np.where(body_mask)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def process_one(kg: str):
    src_path = SRC / f'duck-{kg}kg-fly.png'
    if not src_path.exists():
        print(f'  MISS: {src_path.name}')
        return False

    img = Image.open(src_path).convert('RGB')
    rgb = np.array(img)
    h_full, w_full = rgb.shape[:2]

    # 3 frame theo hàng ngang
    frame_w = w_full // 3
    frame_idx = REPRESENTATIVE_FRAME - 1
    x0 = frame_idx * frame_w
    x1 = x0 + frame_w
    rgb_frame = rgb[:, x0:x1].copy()

    # Bước 1: Tách nền trắng
    bg_mask = flood_fill_corners(rgb_frame, TOLERANCE)

    # Bước 2: Force transparent 25% đáy
    h_f = rgb_frame.shape[0]
    bg_mask[int(h_f * CROP_BOTTOM_RATIO):, :] = True

    # Bước 3: Tạo alpha (255 = body, 0 = nền)
    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)

    # Bước 4: Tìm tight body bbox
    body_mask = alpha > 30
    bbox = get_tight_body_bbox(body_mask)
    if bbox is None:
        print(f'  {kg}kg: no body found!')
        return False
    bx0, by0, bx1, by1 = bbox
    body_w = bx1 - bx0
    body_h = by1 - by0
    print(f'  {kg}kg: body bbox=({bx0},{by0},{bx1},{by1})  size={body_w}x{body_h}')

    # Bước 5: Tạo RGBA cho frame này (gồm alpha mask)
    rgba_frame = np.zeros((h_f, frame_w, 4), dtype=np.uint8)
    rgba_frame[:, :, :3] = rgb_frame
    rgba_frame[:, :, 3] = alpha

    # Bước 6: Crop tight + 5% padding
    pad = max(body_w, body_h) * 0.05
    cx0 = max(0, int(bx0 - pad))
    cy0 = max(0, int(by0 - pad))
    cx1 = min(frame_w, int(bx1 + pad))
    cy1 = min(h_f, int(by1 + pad))
    cropped = Image.fromarray(rgba_frame, mode='RGBA').crop((cx0, cy0, cx1, cy1))

    # Bước 7: Scale theo CHIỀU CAO (chiều rộng co giãn theo tỉ lệ)
    new_h = TARGET_SIZE
    new_w = int(cropped.size[0] * (new_h / cropped.size[1]))
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)

    # Bước 8: Căn giữa trong canvas 400x400 transparent
    canvas = Image.new('RGBA', (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
    off_x = (TARGET_SIZE - new_w) // 2
    off_y = 0
    canvas.paste(resized, (off_x, off_y), resized)

    # Save
    dst_path = DST / f'duck-{kg}kg-f1.png'
    canvas.save(dst_path, optimize=True)
    print(f'    → {dst_path.name}  ({dst_path.stat().st_size/1024:.1f} KB)  body_ratio={body_w/body_h:.2f}')
    return True


def main():
    DST.mkdir(parents=True, exist_ok=True)
    print('=== RE-CROP TIGHT (chuẩn hóa chiều cao) ===\n')
    for kg in ['30', '45', '60', '70', '80']:
        process_one(kg)
        print()


if __name__ == '__main__':
    main()
