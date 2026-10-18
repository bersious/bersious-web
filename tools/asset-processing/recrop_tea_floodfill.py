"""Re-crop trà sữa + bún bò từ 'tra sua bun bo.png' sạch, không dính ống hút.

Cách làm:
1. Chia source thành 6 cell (3 cột × 2 hàng)
2. Mỗi cell: rembg tách nền → flood-fill 4 góc
3. Tìm bbox NON-BACKGROUND lớn nhất trong cell
4. Crop + margin + square pad + resize
"""
from __future__ import annotations
from pathlib import Path
import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

INPUT_DIR = Path(r"C:\Users\nguye\Desktop\tmn 2010")
OUTPUT_DIR = Path(r"C:\Users\nguye\bersious-web\assets\game\processed")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TARGET_MAX = 320
SAFE_MARGIN_PX = 8
MIN_AREA_PX = 8000

# 6 cell: 3 cột x 2 hàng
CELL_MAP = [
    (0, 0, "tea-brownsugar"),
    (0, 1, "tea-matcha"),
    (0, 2, "tea-strawberry"),
    (1, 0, "tea-taro"),
    (1, 1, "tea-mango"),
    (1, 2, "tea-thai"),
]


def remove_bg(img: Image.Image, session) -> Image.Image:
    arr = np.array(img.convert("RGBA"))
    out = remove(arr, session=session, only_mask=False)
    return Image.fromarray(out).convert("RGBA")


def flood_fill_4corners(mask: np.ndarray) -> np.ndarray:
    """Set to 0 any pixel connected to one of 4 corners (background)."""
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    stack = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]
    for y, x in stack:
        if 0 <= y < h and 0 <= x < w:
            visited[y, x] = True
    while stack:
        y, x = stack.pop()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and mask[ny, nx]:
                visited[ny, nx] = True
                stack.append((ny, nx))
    return mask & ~visited


def find_largest_component_bbox(mask: np.ndarray, min_area: int):
    labels, n = ndimage.label(mask)
    if n == 0:
        return None
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    if len(sizes) == 0:
        return None
    largest_idx = int(np.argmax(sizes)) + 1
    if sizes[largest_idx - 1] < min_area:
        return None
    ys, xs = np.where(labels == largest_idx)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))


def crop_with_safe_margin(rgba: np.ndarray, bbox, safe_margin: int) -> np.ndarray:
    h, w = rgba.shape[:2]
    x1, y1, x2, y2 = bbox
    nx1 = max(0, x1 - safe_margin)
    ny1 = max(0, y1 - safe_margin)
    nx2 = min(w, x2 + safe_margin + 1)
    ny2 = min(h, y2 + safe_margin + 1)
    return rgba[ny1:ny2, nx1:nx2]


def square_pad(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    s = max(h, w)
    canvas = np.zeros((s, s, 4), dtype=arr.dtype)
    y_off = (s - h) // 2
    x_off = (s - w) // 2
    canvas[y_off:y_off + h, x_off:x_off + w] = arr
    return canvas


def resize_max(arr: np.ndarray, target_max: int) -> np.ndarray:
    h, w = arr.shape[:2]
    if max(h, w) <= target_max:
        return arr
    ratio = target_max / max(h, w)
    img = Image.fromarray(arr)
    img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    return np.array(img)


def process_cell(img: Image.Image, session, name: str):
    rgba_pil = remove_bg(img, session)
    rgba = np.array(rgba_pil)
    alpha = rgba[:, :, 3]
    mask = alpha > 30
    mask_clean = flood_fill_4corners(mask)
    bbox = find_largest_component_bbox(mask_clean, MIN_AREA_PX)
    if bbox is None:
        raise RuntimeError(f"{name}: no component found")
    cropped = crop_with_safe_margin(rgba, bbox, SAFE_MARGIN_PX)
    bw = bbox[2] - bbox[0] + 1
    bh = bbox[3] - bbox[1] + 1
    print(f"  {name}: bbox={bbox}  bbox_dim={bw}x{bh}  cropped={cropped.shape[:2]}")
    cropped = square_pad(cropped)
    cropped = resize_max(cropped, TARGET_MAX)
    out = OUTPUT_DIR / f"{name}.png"
    Image.fromarray(cropped).save(out, "PNG", optimize=True)
    return (bbox, cropped.shape[:2], out)


def main():
    print("=" * 60)
    print("RE-CROP TRA SUA via flood-fill 4 goc (moi cell rieng)")
    print("=" * 60)
    session = new_session("u2net")
    src = INPUT_DIR / "tra sua bun bo.png"
    full = Image.open(src).convert("RGBA")
    print(f"Source: {src}  size={full.size}")
    max_dim = 2048
    if max(full.size) > max_dim:
        ratio = max_dim / max(full.size)
        full = full.resize((int(full.size[0] * ratio), int(full.size[1] * ratio)), Image.LANCZOS)
    W, H = full.size
    print(f"Resized: {full.size}")
    cell_w = W // 3
    cell_h = H // 2
    results = {}
    for row, col, name in CELL_MAP:
        x0, y0 = col * cell_w, row * cell_h
        x1, y1 = (col + 1) * cell_w, (row + 1) * cell_h
        cell = full.crop((x0, y0, x1, y1))
        print(f"\n--- Cell ({row},{col}) -> {name} ---")
        results[name] = process_cell(cell, session, name)
    print("\n=== SUMMARY ===")
    for name, (bbox, size, path) in results.items():
        bw = bbox[2] - bbox[0] + 1
        bh = bbox[3] - bbox[1] + 1
        print(f"  {name:20s} bbox={bbox}  bbox_dim={bw}x{bh}  out={size}  path={path.name}")


if __name__ == "__main__":
    main()
