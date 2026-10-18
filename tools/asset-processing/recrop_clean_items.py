"""Re-crop targeted items - clean approach.

Strategy: rembg tách nền → tìm LARGEST connected component → đó là đồ vật chính.
Bỏ hết noise/small components.
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
SAFE_MARGIN_PX = 12
MIN_AREA_PX = 8000


def remove_bg(img: Image.Image, session) -> Image.Image:
    arr = np.array(img.convert("RGBA"))
    out = remove(arr, session=session, only_mask=False)
    return Image.fromarray(out).convert("RGBA")


def keep_largest_component(rgba: np.ndarray, min_area: int) -> np.ndarray:
    """Chỉ giữ connected component lớn nhất. Trả về RGBA mới."""
    alpha = rgba[:, :, 3]
    mask = alpha > 30
    labels, n = ndimage.label(mask)
    if n == 0:
        return rgba
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    largest_idx = int(np.argmax(sizes)) + 1
    if sizes[largest_idx - 1] < min_area:
        return rgba
    # Zero out mọi component trừ largest
    new_alpha = np.where(labels == largest_idx, alpha, 0).astype(np.uint8)
    out = rgba.copy()
    out[:, :, 3] = new_alpha
    return out


def crop_with_safe_margin(rgba: np.ndarray, safe_margin: int) -> np.ndarray:
    """Crop theo bbox của pixel visible (alpha > 30), thêm safe margin."""
    alpha = rgba[:, :, 3]
    nz = np.argwhere(alpha > 30)
    if len(nz) == 0:
        return rgba
    ymin, xmin = nz.min(0)
    ymax, xmax = nz.max(0)
    h, w = rgba.shape[:2]
    nx1 = max(0, xmin - safe_margin)
    ny1 = max(0, ymin - safe_margin)
    nx2 = min(w, xmax + safe_margin + 1)
    ny2 = min(h, ymax + safe_margin + 1)
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
    # Bước 1: chỉ giữ component lớn nhất
    rgba_clean = keep_largest_component(rgba, MIN_AREA_PX)
    # Bước 2: crop theo bbox
    cropped = crop_with_safe_margin(rgba_clean, SAFE_MARGIN_PX)
    h, w = cropped.shape[:2]
    print(f"  {name}: cropped={h}x{w}")
    cropped = square_pad(cropped)
    cropped = resize_max(cropped, TARGET_MAX)
    out = OUTPUT_DIR / f"{name}.png"
    Image.fromarray(cropped).save(out, "PNG", optimize=True)
    return (cropped.shape[:2], out)


def main():
    print("=" * 60)
    print("RE-CROP TARGETED ITEMS (largest component only)")
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

    # Tea mango: cell (1,1)
    print("\n--- tea-mango ---")
    cell = full.crop((1 * cell_w, 1 * cell_h, 2 * cell_w, 2 * cell_h))
    process_cell(cell, session, "tea-mango")

    # Tea thai: cell (1,2)
    print("\n--- tea-thai ---")
    cell = full.crop((2 * cell_w, 1 * cell_h, 3 * cell_w, 2 * cell_h))
    process_cell(cell, session, "tea-thai")

    # Bun bo: cell (1,2) top 50% - comp 1 = bún bò
    print("\n--- bun-bo-hue (top 50% cell 1,2, comp 1 = bun) ---")
    cell = full.crop((2 * cell_w, 1 * cell_h, 3 * cell_w, 2 * cell_h))
    bun_h = int(cell.height * 0.50)
    cell_bun = cell.crop((0, 0, cell.width, bun_h))
    process_cell(cell_bun, session, "bun-bo-hue")

    print("\n=== DONE ===")


if __name__ == "__main__":
    main()
