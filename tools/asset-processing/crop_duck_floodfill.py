"""Tách nền 5 ảnh duck animation - dùng flood-fill từ 4 góc.

Phương pháp cũ (connected components trên white mask) bị lỗi: nếu khuôn
mặt vịt có vùng trắng → bị tính nhầm là nền → tách mất mặt.

Cách mới:
- Bắt đầu flood-fill từ 4 góc (chắc chắn là nền)
- Một pixel được coi là nền nếu GIỐNG màu seed (4 góc) trong tolerance
- Mọi pixel còn lại = vật thể → giữ lại
- Khử viền trắng mỏng quanh vật thể (border cleanup)

Input:  5 file duck-{30,45,60,70,80}kg-fly.png
Output: 15 file duck-{30,45,60,70,80}kg-f{1,2,3}.png
        Mỗi frame: 400x400 RGBA, nền transparent
"""

import os
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label


SRC = Path(r'C:\Users\nguye\Desktop\tmn 2010')
DST = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')

TOLERANCE = 35         # |R-R0| + |G-G0| + |B-B0| < TOL => cùng màu nền
KEEP_TOP_RATIO = 0.78  # Cắt 22% đáy (ẩn chân)
TARGET_SIZE = 400      # Output vuông


def flood_fill_corners(rgb: np.ndarray, tol: int = TOLERANCE) -> np.ndarray:
    """Trả về mask (True = nền) bằng flood-fill từ 4 góc.

    Dùng BFS đơn giản. Nhanh với ảnh vài nghìn pixel.
    """
    h, w = rgb.shape[:2]

    # Lấy màu seed từ 4 góc (chính giữa 4 góc)
    seeds = np.array([
        rgb[2, 2],
        rgb[2, w - 3],
        rgb[h - 3, 2],
        rgb[h - 3, w - 3],
    ], dtype=np.int16)

    # Tính khoảng cách Manhattan từ mỗi pixel đến seed gần nhất
    # Để tăng tốc: so với 4 seeds, lấy min
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)

    dist_min = np.full((h, w), 999, dtype=np.int16)
    for s in seeds:
        d = np.abs(r - s[0]) + np.abs(g - s[1]) + np.abs(b - s[2])
        dist_min = np.minimum(dist_min, d)

    # Pixels có dist < tol = gần giống góc = nền tiềm năng
    candidate = dist_min < tol

    # BFS từ 4 góc: chỉ lấy vùng candidate LIỀN KỀ với góc
    bg = np.zeros((h, w), dtype=bool)
    queue = []
    for (cy, cx) in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]:
        if candidate[cy, cx]:
            bg[cy, cx] = True
            queue.append((cy, cx))

    # BFS 4-connectivity
    while queue:
        y, x = queue.pop()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w:
                if not bg[ny, nx] and candidate[ny, nx]:
                    bg[ny, nx] = True
                    queue.append((ny, nx))

    return bg


def feather_alpha(alpha: np.ndarray, radius: int = 1) -> np.ndarray:
    """Smooth viền alpha để tránh răng cưa."""
    from scipy.ndimage import binary_dilation, binary_erosion
    mask = alpha > 10
    dilated = binary_dilation(mask, iterations=radius)
    eroded = binary_erosion(mask, iterations=radius)
    edge = dilated & ~eroded
    # Alpha gradient trên vùng edge
    new_alpha = alpha.copy()
    new_alpha[edge] = np.clip(new_alpha[edge] // 2, 0, 255)
    return new_alpha


def crop_bottom_by(img: Image.Image, keep_top: float) -> Image.Image:
    """Cắt đáy, chỉ giữ `keep_top` phần trên (0.78 = giữ 78%)."""
    w, h = img.size
    new_h = int(h * keep_top)
    return img.crop((0, 0, w, new_h))


def square_pad(img: Image.Image, size: int) -> Image.Image:
    """Resize giữ tỉ lệ + pad vuông với nền trong suốt."""
    w, h = img.size
    scale = size / max(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    offset_x = (size - new_w) // 2
    offset_y = (size - new_h) // 2
    canvas.paste(img_resized, (offset_x, offset_y), img_resized)
    return canvas


def process_one(kg: str, frame: int):
    src_path = SRC / f'duck-{kg}kg-fly.png'
    if not src_path.exists():
        print(f'  MISS: {src_path.name}')
        return False

    img = Image.open(src_path).convert('RGB')
    rgb = np.array(img)
    h, w = rgb.shape[:2]

    # 3 frame theo hàng ngang
    frame_w = w // 3
    frame_idx = frame - 1
    x0 = frame_idx * frame_w
    x1 = x0 + frame_w
    rgb_frame = rgb[:, x0:x1].copy()

    # 1) Tách nền bằng flood-fill từ 4 góc
    bg_mask = flood_fill_corners(rgb_frame, TOLERANCE)

    # 2) Ẩn 22% đáy (chân)
    h_f = rgb_frame.shape[0]
    bg_mask[int(h_f * KEEP_TOP_RATIO):, :] = True  # đáy coi như nền

    # 3) Tạo RGBA
    rgba = np.zeros((h_f, frame_w, 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb_frame
    rgba[:, :, 3] = np.where(bg_mask, 0, 255)

    # 4) Feather viền
    rgba[:, :, 3] = feather_alpha(rgba[:, :, 3], radius=1)

    img_rgba = Image.fromarray(rgba, mode='RGBA')

    # 5) Tìm bbox nội dung (để square-pad chuẩn)
    alpha = rgba[:, :, 3]
    if (alpha > 10).any():
        ys, xs = np.where(alpha > 10)
        bbox = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        cropped = img_rgba.crop(bbox)
    else:
        cropped = img_rgba

    # 6) Square-pad
    final = square_pad(cropped, TARGET_SIZE)

    # 7) Save
    dst_path = DST / f'duck-{kg}kg-f{frame}.png'
    final.save(dst_path, optimize=True)
    return True


def main():
    DST.mkdir(parents=True, exist_ok=True)

    print('=== RECROP DUCKS - FLOOD FILL FROM CORNERS ===')
    for kg in ['30', '45', '60', '70', '80']:
        for f in [1, 2, 3]:
            ok = process_one(kg, f)
            tag = 'OK' if ok else 'FAIL'
            print(f'  [{tag}] duck-{kg}kg-f{f}.png')

    print('\n=== Done ===')


if __name__ == '__main__':
    main()
