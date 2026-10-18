"""Crop 2 ảnh bonus (win + lose) → sprite PNG nền trong suốt.

Input:  C:\\Users\\nguye\\Desktop\\tmn 2010\\win.png
        C:\\Users\\nguye\\Desktop\\tmn 2010\\lose.png
Output: C:\\Users\\nguye\\bersious-web\\assets\\game\\processed\\duck-win.png
        C:\\Users\\nguye\\bersious-web\\assets\\game\\processed\\duck-lose.png

Logic:
- Background gần trắng (>240 RGB) → set alpha = 0
- Có chân ở lose.png → ẩn 30% đáy (giữ 70% trên)
- win.png có confetti rải rác → dùng connected components, lấy cluster
   lớn nhất làm bbox (bỏ confetti nhỏ)
- Square-pad 600x600 (ảnh lose/win lớn để hiển thị đẹp)
"""

import os
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label


SRC = Path(r'C:\Users\nguye\Desktop\tmn 2010')
DST = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')

WHITE_THRESH = 240        # RGB > 240 → xem là nền
KEEP_TOP_RATIO = 0.70     # Giữ 70% phần trên (cắt 30% đáy - ẩn chân)
TARGET_SIZE = 600         # Kích thước vuông output


def find_content_bbox(img_rgb: np.ndarray) -> tuple:
    """Tìm bbox của vùng KHÔNG phải nền trắng.

    Returns (x_min, y_min, x_max, y_max) hoặc None nếu all white.
    """
    h, w = img_rgb.shape[:2]
    # Mask: pixel "có nội dung" = không gần trắng (ít nhất 1 kênh RGB < threshold)
    content_mask = np.any(img_rgb < WHITE_THRESH, axis=2)
    if not content_mask.any():
        return None
    ys, xs = np.where(content_mask)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))


def remove_white_bg(img: Image.Image) -> Image.Image:
    """Set alpha = 0 cho pixel gần trắng (nền)."""
    arr = np.array(img.convert('RGBA'))
    rgb = arr[:, :, :3]
    # Mask nền trắng (cả 3 kênh đều cao)
    white_mask = np.all(rgb > WHITE_THRESH, axis=2)
    # Anti-alias: pixel gần trắng nhưng không trắng hoàn toàn → alpha giảm dần
    near_white = (rgb.min(axis=2) > 200) & ~white_mask
    # Anti-aliasing nhẹ cho viền
    min_channel = rgb.min(axis=2)
    # Alpha gradient: min_channel từ 200 → 255 thì alpha từ 255 → 0
    edge_mask = min_channel > 200
    arr[edge_mask, 3] = np.clip(255 - (min_channel[edge_mask] - 200) * (255 / 55), 0, 255).astype(np.uint8)
    arr[white_mask, 3] = 0
    return Image.fromarray(arr, mode='RGBA')


def find_largest_component_bbox(alpha: np.ndarray) -> tuple:
    """Tìm bbox của connected component lớn nhất (bỏ nhiễu nhỏ).

    Tối ưu: downscale 4x trước khi tìm connected components (nhanh hơn ~16x).
    """
    h, w = alpha.shape
    scale = 4
    small = alpha[::scale, ::scale]
    mask = small > 30
    if not mask.any():
        return None
    labeled, n = label(mask)
    if n == 0:
        return None
    sizes = [(i, (labeled == i).sum()) for i in range(1, n + 1)]
    largest_id, _ = max(sizes, key=lambda x: x[1])
    ys, xs = np.where(labeled == largest_id)
    # Scale bbox lại full resolution
    return (int(xs.min() * scale), int(ys.min() * scale),
            int((xs.max() + 1) * scale), int((ys.max() + 1) * scale))


def crop_bottom_by(img: Image.Image, keep_top: float) -> Image.Image:
    """Cắt phần đáy, chỉ giữ `keep_top` phần trên (0.7 = giữ 70% trên)."""
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


def process(src_name: str, dst_name: str, keep_top: float = 1.0, use_largest_component: bool = False):
    src_path = SRC / src_name
    dst_path = DST / dst_name
    if not src_path.exists():
        print(f'  MISS: {src_name} not found')
        return False
    print(f'  {src_name} → {dst_name}', end=' ... ')

    img = Image.open(src_path)
    print(f'orig {img.size} {img.mode}', end=' → ')

    # Bước 1: Tách nền trắng
    img_rgba = remove_white_bg(img)
    arr = np.array(img_rgba)
    alpha = arr[:, :, 3]

    # Bước 2: Tìm bbox nội dung
    if use_largest_component:
        # Bỏ confetti rải rác - lấy cluster lớn nhất
        bbox = find_largest_component_bbox(alpha)
        if bbox is None:
            print('FAIL (no content)')
            return False
        x0, y0, x1, y1 = bbox
        print(f'largest comp bbox=({x0},{y0},{x1},{y1})', end=' → ')
        # Thêm padding 5%
        w, h = img_rgba.size
        pad = 5
        x0 = max(0, x0 - pad)
        y0 = max(0, y0 - pad)
        x1 = min(w, x1 + pad)
        y1 = min(h, y1 + pad)
    else:
        bbox = find_content_bbox(arr[:, :, :3])
        if bbox is None:
            print('FAIL (no content)')
            return False
        x0, y0, x1, y1 = bbox
        print(f'bbox=({x0},{y0},{x1},{y1})', end=' → ')

    cropped = img_rgba.crop((x0, y0, x1, y1))

    # Bước 3: Cắt đáy (ẩn chân)
    if keep_top < 1.0:
        cropped = crop_bottom_by(cropped, keep_top)
        print(f'cropped to {cropped.size}', end=' → ')

    # Bước 4: Square-pad
    final = square_pad(cropped, TARGET_SIZE)
    print(f'final {final.size}')

    # Save
    final.save(dst_path, optimize=True)
    return True


def main():
    DST.mkdir(parents=True, exist_ok=True)

    print('=== CROP WIN (full, có confetti - dùng largest component) ===')
    process('win.png', 'duck-win.png', keep_top=1.0, use_largest_component=True)

    print('\n=== CROP LOSE (cắt 30% đáy - ẩn chân) ===')
    process('lose.png', 'duck-lose.png', keep_top=KEEP_TOP_RATIO, use_largest_component=True)

    print('\n=== Done ===')
    for f in ['duck-win.png', 'duck-lose.png']:
        p = DST / f
        if p.exists():
            print(f'  {f}: {p.stat().st_size / 1024:.1f} KB')


if __name__ == '__main__':
    main()
