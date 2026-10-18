"""Re-crop game items using rembg + connected components.

We trust connected components fully — every collectible has its own bbox.
For powerups we also trust the components. Pipes are skipped by aspect.
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Tuple

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

INPUT_DIR = Path(r"C:\Users\nguye\Desktop\tmn 2010")
OUTPUT_DIR = Path(r"C:\Users\nguye\bersious-web\assets\game\processed")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TARGET_MAX_DRINK = 320
TARGET_MAX_POWERUP = 240
MARGIN_PCT = 0.06
MIN_MARGIN_PX = 10


def remove_bg(img: Image.Image, session) -> Image.Image:
    arr = np.array(img.convert("RGBA"))
    out = remove(arr, session=session, only_mask=False)
    return Image.fromarray(out).convert("RGBA")


def find_components(mask: np.ndarray, min_area: int = 4000) -> List[Tuple[int, int, int, int, int]]:
    labels, n = ndimage.label(mask)
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(labels == i)
        area = len(xs)
        if area < min_area:
            continue
        comps.append((int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()), area))
    return comps


def crop_with_margin(img: Image.Image, bbox, margin_pct: float, min_margin: int) -> Image.Image:
    x1, y1, x2, y2 = bbox
    w, h = img.size
    bw, bh = x2 - x1 + 1, y2 - y1 + 1
    mx = max(int(bw * margin_pct), min_margin)
    my = max(int(bh * margin_pct), min_margin)
    nx1 = max(0, x1 - mx)
    ny1 = max(0, y1 - my)
    nx2 = min(w, x2 + mx + 1)
    ny2 = min(h, y2 + my + 1)
    return img.crop((nx1, ny1, nx2, ny2))


def square_pad(img: Image.Image) -> Image.Image:
    w, h = img.size
    s = max(w, h)
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(img, ((s - w) // 2, (s - h) // 2))
    return canvas


def resize_max(img: Image.Image, target_max: int) -> Image.Image:
    w, h = img.size
    if max(w, h) <= target_max:
        return img
    ratio = target_max / max(w, h)
    return img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)


# ---------------------------------------------------------------- collectibles

COLLECTIBLE_NAMES = [
    "tea-brownsugar",   # row1 col1
    "tea-matcha",       # row1 col2
    "tea-strawberry",   # row1 col3
    "tea-taro",         # row1 col4
    "tea-mango",        # row2 col1
    "tea-thai",         # row2 col2
    "bun-bo-hue",       # row2 col3 (bún bò is wider, takes right half)
]


def process_collectibles(session) -> dict:
    src = INPUT_DIR / "tra sua bun bo.png"
    img = Image.open(src).convert("RGBA")
    max_dim = 2048
    if max(img.size) > max_dim:
        ratio = max_dim / max(img.size)
        img = img.resize((int(img.size[0] * ratio), int(img.size[1] * ratio)), Image.LANCZOS)
    print(f"[collectibles] resized to {img.size}")
    rgba = remove_bg(img, session)
    arr = np.array(rgba)
    mask = arr[:, :, 3] > 30

    comps = find_components(mask, min_area=4000)
    h_img, w_img = mask.shape
    print(f"[collectibles] {len(comps)} raw components")

    # Skip pipes — they live in the bottom band (y_min > ~60% of image height).
    h_img, w_img = mask.shape
    keep = []
    for c in comps:
        x1, y1, x2, y2, a = c
        bw, bh = x2 - x1 + 1, y2 - y1 + 1
        # Pipes are in the bottom region (pipes section of source image)
        if y1 > 0.60 * h_img:
            print(f"    [skip pipe/duck] bbox=({x1},{y1})-({x2},{y2}) dim={bw}x{bh}")
            continue
        keep.append(c)
    print(f"[collectibles] {len(keep)} components after bottom-band filter")

    if len(keep) != 7:
        raise RuntimeError(f"Expected exactly 7 collectibles, got {len(keep)}: {keep}")

    # Split into 2 rows. y_min < 200 = top row (4 ly), else bottom row
    # (2 ly + bún bò). The split is well-defined since top row of ly
    # starts near y=47 and bottom row of ly starts near y=366+.
    row1 = sorted([c for c in keep if c[1] < 200], key=lambda c: c[0])
    row2 = sorted([c for c in keep if c[1] >= 200], key=lambda c: c[0])
    print(f"[collectibles] row1 ({len(row1)}): {[c[:4] for c in row1]}")
    print(f"[collectibles] row2 ({len(row2)}): {[c[:4] for c in row2]}")
    ordered = row1 + row2

    if len(ordered) != 7 or len(row1) != 4 or len(row2) != 3:
        raise RuntimeError(f"Row split mismatch: row1={len(row1)}, row2={len(row2)}")

    results = {}
    for name, bbox in zip(COLLECTIBLE_NAMES, [c[:4] for c in ordered]):
        crop = crop_with_margin(rgba, bbox, MARGIN_PCT, MIN_MARGIN_PX)
        crop = square_pad(crop)
        crop = resize_max(crop, TARGET_MAX_DRINK)
        out = OUTPUT_DIR / f"{name}.png"
        crop.save(out, "PNG", optimize=True)
        results[name] = (bbox, crop.size, out)
        bw = bbox[2] - bbox[0] + 1
        bh = bbox[3] - bbox[1] + 1
        print(f"  [OK] {name}.png  size={crop.size}  bbox={bbox}  bbox_dim={bw}x{bh}")
    return results


# ---------------------------------------------------------------- powerups

POWERUP_NAMES = ["star", "chili", "heart", "bomb"]


def process_powerups(session) -> dict:
    src = INPUT_DIR / "saobomcay.png"
    img = Image.open(src).convert("RGBA")
    max_dim = 2048
    if max(img.size) > max_dim:
        ratio = max_dim / max(img.size)
        img = img.resize((int(img.size[0] * ratio), int(img.size[1] * ratio)), Image.LANCZOS)
    print(f"[powerups] resized to {img.size}")
    rgba = remove_bg(img, session)
    arr = np.array(rgba)
    h_img, w_img = arr.shape[:2]

    # Powerups live in upper portion; lower portion has duck scene.
    # Use top 60% so we exclude the duck + water.
    top_y2 = int(h_img * 0.62)
    mask = arr[:top_y2, :, 3] > 30

    comps = find_components(mask, min_area=2000)
    print(f"[powerups] {len(comps)} components in top region")

    if len(comps) > 4:
        # Merge small sparkles next to a main item. Sort by x first, then
        # merge any pair whose gap is < 60 px.
        comps.sort(key=lambda c: c[0])
        merged = []
        i = 0
        while i < len(comps):
            cur = list(comps[i])
            j = i + 1
            while j < len(comps) and comps[j][0] - cur[2] < 60:
                cur[0] = min(cur[0], comps[j][0])
                cur[1] = min(cur[1], comps[j][1])
                cur[2] = max(cur[2], comps[j][2])
                cur[3] = max(cur[3], comps[j][3])
                cur[4] += comps[j][4]
                j += 1
            merged.append(tuple(cur))
            i = j
        comps = merged
        print(f"[powerups] {len(comps)} after merge")
    elif len(comps) < 4:
        raise RuntimeError(f"Expected 4 powerups, got {len(comps)}")

    comps = comps[:4]  # in case extras persist

    results = {}
    for name, comp in zip(POWERUP_NAMES, comps):
        bbox = comp[:4]
        crop = crop_with_margin(rgba, bbox, MARGIN_PCT, MIN_MARGIN_PX)
        crop = square_pad(crop)
        crop = resize_max(crop, TARGET_MAX_POWERUP)
        out = OUTPUT_DIR / f"{name}.png"
        crop.save(out, "PNG", optimize=True)
        results[name] = (bbox, crop.size, out)
        bw = bbox[2] - bbox[0] + 1
        bh = bbox[3] - bbox[1] + 1
        print(f"  [OK] {name}.png  size={crop.size}  bbox={bbox}  bbox_dim={bw}x{bh}")
    return results


def main() -> None:
    print("=" * 60)
    print("RE-CROP GAME ITEMS via rembg + connected components")
    print("=" * 60)
    session = new_session("u2net")

    print("\n=== Collectibles (6 trà sữa + 1 bún bò) ===")
    res_a = process_collectibles(session)

    print("\n=== Powerups (sao/ớt/heart/bom) ===")
    res_b = process_powerups(session)

    print("\n=== Summary ===")
    for name, (bbox, size, path) in {**res_a, **res_b}.items():
        w = bbox[2] - bbox[0] + 1
        h = bbox[3] - bbox[1] + 1
        print(f"  {name:18s} bbox={bbox}  bbox_dim={w}x{h}  out={size}")


if __name__ == "__main__":
    main()