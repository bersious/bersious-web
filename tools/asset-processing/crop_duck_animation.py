r"""Crop 5 ảnh duck animation (3 frame hàng ngang) → 15 sprite PNG.

Input:  C:\Users\nguye\Desktop\tmn 2010\duck-{30,45,60,70,80}kg-fly.png
        Mỗi ảnh 3168x1344 RGBA, 3 frame theo hàng ngang, nền trắng

Output: C:\Users\nguye\bersious-web\assets\game\processed\duck-{kg}kg-f{1,2,3}.png
        Mỗi sprite 400x400 RGBA, transparent bg, không chân, không bóng

Phương pháp: dùng white-pixel mask (nền trắng) → connected components
→ tìm 3 bbox lớn nhất → crop + xóa chân (chỉ lấy 70% trên) + ẩn shadow
"""

import numpy as np
from PIL import Image
from scipy import ndimage
from pathlib import Path
import sys

INPUT_DIR = Path(r'C:\Users\nguye\Desktop\tmn 2010')
OUTPUT_DIR = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')
TARGET_SIZE = 400  # output vuông

WEIGHTS = ['30', '45', '60', '70', '80']

def find_3_ducks(img_array):
    """Tìm bbox 3 con vịt trong ảnh bằng connected components.

    Logic: nền trắng → ngược lại là vật thể. Lọc component quá nhỏ (noise).
    """
    # Detect non-white pixels (vịt có màu sắc, không trắng)
    # Dùng cả 3 channel RGB
    if img_array.shape[2] == 4:
        rgb = img_array[:, :, :3]
        alpha = img_array[:, :, 3]
        # Pixel là "vật" nếu KHÔNG phải trắng HOẶC alpha > 0
        is_object = ~((rgb[:, :, 0] > 240) & (rgb[:, :, 1] > 240) & (rgb[:, :, 2] > 240))
        # Kết hợp với alpha (nếu có nền trong suốt, dùng alpha)
        has_alpha = alpha < 250
        is_object = is_object | has_alpha
    else:
        rgb = img_array
        is_object = ~((rgb[:, :, 0] > 240) & (rgb[:, :, 1] > 240) & (rgb[:, :, 2] > 240))

    # Connected components
    labeled, num = ndimage.label(is_object)
    print(f'  Tìm thấy {num} components')

    # Lấy 3 component lớn nhất
    sizes = ndimage.sum(is_object, labeled, range(1, num + 1))
    if len(sizes) == 0:
        return []

    top3_idx = np.argsort(sizes)[-3:][::-1]  # 3 lớn nhất
    bboxes = []
    for idx in top3_idx:
        component_id = idx + 1
        ys, xs = np.where(labeled == component_id)
        if len(ys) == 0:
            continue
        bbox = (xs.min(), ys.min(), xs.max(), ys.max())
        size = sizes[idx]
        bboxes.append((bbox, int(size)))

    # Sắp xếp theo x (trái → phải)
    bboxes.sort(key=lambda b: b[0][0])
    return bboxes


def crop_duck_sprite(img, bbox, kg, frame_num):
    """Crop 1 con vịt từ bbox, ẩn chân, xóa shadow, resize vuông."""
    x1, y1, x2, y2 = bbox
    w = x2 - x1
    h = y2 - y1

    # Ẩn chân: chỉ lấy 70% trên của bbox
    # (chân vịt chiếm khoảng 20-30% chiều cao dưới)
    new_h = int(h * 0.70)
    y2_new = y1 + new_h

    # Margin 8% để không cắt cánh
    margin_x = int(w * 0.08)
    margin_y_top = int(new_h * 0.05)
    margin_y_bot = int(new_h * 0.05)

    x1_pad = max(0, x1 - margin_x)
    y1_pad = max(0, y1 - margin_y_top)
    x2_pad = min(img.size[0], x2 + margin_x)
    y2_pad = min(img.size[1], y2_new + margin_y_bot)

    # Crop
    cropped = img.crop((x1_pad, y1_pad, x2_pad, y2_pad))

    # Convert sang RGBA + tạo nền trong suốt
    if cropped.mode != 'RGBA':
        cropped = cropped.convert('RGBA')
    arr = np.array(cropped)

    # Tạo alpha mask: pixel trắng → trong suốt
    rgb = arr[:, :, :3]
    is_white = (rgb[:, :, 0] > 240) & (rgb[:, :, 1] > 240) & (rgb[:, :, 2] > 240)
    alpha = np.where(is_white, 0, 255).astype(np.uint8)
    arr[:, :, 3] = alpha

    # Xóa shadow tối màu (chỉ giữ phần tươi)
    # Shadow thường có gray value thấp (50-150) và không phải màu chính
    # Heuristic: nếu pixel rất tối (< 80) → có thể là shadow → trong suốt
    is_dark = (rgb[:, :, 0] < 80) & (rgb[:, :, 1] < 80) & (rgb[:, :, 2] < 80)
    # Trừ khi là vùng có màu đậm (mắt, viền) - giữ nguyên
    # Ở đây giữ đơn giản: chỉ xóa nếu vùng rộng > 30 pixel (shadow lớn)
    dark_labeled, dark_num = ndimage.label(is_dark)
    if dark_num > 0:
        dark_sizes = ndimage.sum(is_dark, dark_labeled, range(1, dark_num + 1))
        for i, sz in enumerate(dark_sizes):
            if sz > 200:  # Vùng tối lớn > 200 pixel → có thể là shadow
                alpha[dark_labeled == (i + 1)] = 0
    arr[:, :, 3] = alpha

    # Tạo ảnh mới từ array
    out_img = Image.fromarray(arr, mode='RGBA')

    # Resize vuông (center-crop) → TARGET_SIZE
    w2, h2 = out_img.size
    side = min(w2, h2)
    cx = w2 // 2
    cy = h2 // 2
    half = side // 2
    square = out_img.crop((cx - half, cy - half, cx + half, cy + half))
    final = square.resize((TARGET_SIZE, TARGET_SIZE), Image.LANCZOS)

    return final


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for kg in WEIGHTS:
        input_path = INPUT_DIR / f'duck-{kg}kg-fly.png'
        if not input_path.exists():
            print(f'⚠️  Missing: {input_path}')
            continue

        print(f'\n=== duck-{kg}kg-fly.png ===')
        img = Image.open(input_path).convert('RGBA')
        arr = np.array(img)
        print(f'  Size: {img.size}')

        # Tìm 3 bbox
        bboxes = find_3_ducks(arr)
        if len(bboxes) < 3:
            print(f'  ❌ Chỉ tìm được {len(bboxes)} bbox, cần 3')
            continue

        for i, (bbox, size) in enumerate(bboxes[:3], 1):
            print(f'  Frame {i}: bbox=({bbox[0]},{bbox[1]})-({bbox[2]},{bbox[3]}) size={bbox[2]-bbox[0]}x{bbox[3]-bbox[1]} pixels={size}')

            sprite = crop_duck_sprite(img, bbox, kg, i)
            output_path = OUTPUT_DIR / f'duck-{kg}kg-f{i}.png'
            sprite.save(output_path, optimize=True)
            print(f'    → {output_path.name} ({sprite.size}, {output_path.stat().st_size//1024} KB)')


if __name__ == '__main__':
    main()
