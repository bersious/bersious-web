"""
Tạo sprite vịt BAY (5 ducks × 3 frames) + 2 sprite pipe (top/bottom).
- Input:  5convit.png (5 vịt đứng, base), pipe.png (ống bobbin)
- Output: duck-{30,45,60,70,80}kg-f{1,2,3}.png + pipe-top.png + pipe-bottom.png

Chiến lược vịt BAY (PIL programmatic, không cần Gemini):
  - Lấy body mỗi con từ 5convit.png (đã tách nền).
  - Ẩn chân (vẽ đè body tròn phía dưới - duck-phồng) + ẩn cánh nhỏ 2 bên.
  - Thêm 2 cánh giả bằng ellipse xoay theo 3 frame animation:
      frame 1 = cánh chĩa xuống  (flap down)
      frame 2 = cánh ngang       (mid)
      frame 3 = cánh chĩa lên    (flap up)
  - Vẽ beak orange + 2 mắt nhỏ + 1 highlight trắng để nhìn chibi.
  - Output 400x400 canvas (transparent), duck center hoặc hơi offset để có chỗ cho cánh.

Pipe:
  - pipe.png hiện có 200x280, có 1 vành trên. Tạo 2 sprite mới bằng cách vẽ
    pipe-top (vành ở dưới, phần trên kéo dài) và pipe-bottom (vành ở trên,
    phần dưới kéo dài). Mỗi sprite 200x420.
"""

from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
from rembg import remove, new_session

REPO = Path(r"C:\Users\nguye\bersious-web")
SRC = Path(r"C:\Users\nguye\Desktop\tmn 2010")
OUT = REPO / "assets" / "game" / "processed"
TMP = REPO / "tools" / "asset-processing" / "_tmp"
TMP.mkdir(exist_ok=True)

# Load the standing ducks (no background)
SESSION = new_session("u2net")


def remove_bg_save(src_path: Path, dst_path: Path):
    img = Image.open(src_path).convert("RGBA")
    arr = np.array(img)
    out = Image.fromarray(remove(arr, session=SESSION, only_mask=False)).convert("RGBA")
    out.save(dst_path, "PNG", optimize=True)
    return out


def segment_ducks(standing_img: Image.Image):
    """Cut 5 duck bboxes from the standing sprite sheet (1 row, 5 columns)."""
    w, h = standing_img.size
    col_w = w // 5
    out = []
    for i in range(5):
        crop = standing_img.crop((i * col_w, 0, (i + 1) * col_w, h)).convert("RGBA")
        a = np.array(crop)
        mask = a[:, :, 3] > 30
        ys, xs = np.where(mask)
        if len(xs) == 0:
            continue
        x0, x1 = xs.min(), xs.max()
        y0, y1 = ys.min(), ys.max()
        pad = 10
        x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
        x1 = min(crop.size[0] - 1, x1 + pad); y1 = min(crop.size[1] - 1, y1 + pad)
        body = crop.crop((x0, y0, x1 + 1, y1 + 1))
        out.append(body)
    return out


def draw_body_only(body_rgba: Image.Image, canvas_size=400) -> Image.Image:
    """Lấy body tròn (ẩn chân): giữ phần trên-tròn, crop phần chân dưới."""
    a = np.array(body_rgba)
    mask = a[:, :, 3] > 30
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return body_rgba
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    body_w = x1 - x0 + 1
    body_h = y1 - y0 + 1

    # Ẩn chân: lấy phần trên tròn 65% (bỏ phần dưới có chân)
    cut = body_rgba.crop((x0, y0, x1 + 1, y0 + int(body_h * 0.62) + 1))
    return cut


def make_wing(base_size=80, height_factor=0.45, color=(245, 220, 90, 230)):
    """Tạo 1 cánh ellipse, màu vàng nhạt, có outline sậm."""
    w_img = Image.new("RGBA", (base_size + 16, int(base_size * 1.4) + 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(w_img)
    cx = w_img.size[0] // 2
    cy = w_img.size[1] // 2
    rw = base_size // 2
    rh = int(rw * height_factor)
    # shadow outline
    d.ellipse([cx - rw, cy - rh, cx + rw, cy + rh],
              fill=color, outline=(60, 50, 20, 255), width=3)
    # highlight
    hl_w = rw // 3
    d.ellipse([cx - rw + 8, cy - rh + 4, cx - rw + 8 + hl_w, cy - rh + 4 + rh // 2],
              fill=(255, 250, 220, 220))
    return w_img


def draw_flying_duck(body_rgba: Image.Image, kg_label: str = "30kg",
                     wing_angle: float = 0.0, wing_scale: float = 1.0,
                     canvas_w: int = 400, canvas_h: int = 400,
                     rotate_body: float = 0.0) -> Image.Image:
    """
    Vẽ 1 con vịt đang bay:
      body_rgba: ảnh đứng (đã tách nền).
      wing_angle: -25 (cánh lên), 0 (ngang), 25 (cánh xuống). Đơn vị độ.
                  Thực tế wing đặt ngang, rồi rotate theo góc quanh "vai".
    """
    # Step 1: body, cắt bỏ chân
    body_only = draw_body_only(body_rgba)
    body_w, body_h = body_only.size
    body_ratio = canvas_h / body_h
    body_new = body_only.resize(
        (int(body_w * body_ratio), int(body_h * body_ratio)),
        Image.LANCZOS,
    )

    # Optional rotate (slight tilt up/down - giúp animation mượt)
    if abs(rotate_body) > 0.5:
        body_new = body_new.rotate(rotate_body, resample=Image.BICUBIC, expand=True)

    # Step 2: vẽ canvas
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    bx = (canvas_w - body_new.size[0]) // 2
    by = int(canvas_h * 0.40) - body_new.size[1] // 2  # ducks lơ lửng giữa canvas
    canvas.paste(body_new, (bx, by), body_new)

    # Step 3: wings
    # wing xuất phát: rộng = max(body) ~ 80% body_w; opaque màu vàng nhạt
    wing_w = int(body_new.size[0] * 0.55 * wing_scale)
    wing_h_factor = {"30kg": 0.55, "45kg": 0.50, "60kg": 0.45,
                     "70kg": 0.42, "80kg": 0.40}.get(kg_label, 0.5)
    wing = make_wing(base_size=wing_w, height_factor=wing_h_factor)
    # Cánh trái
    wing_l = wing.rotate(wing_angle, resample=Image.BICUBIC, expand=True)
    # Cánh phải: lật ngang
    wing_r = wing.rotate(-wing_angle, resample=Image.BICUBIC, expand=True)
    wing_r = ImageOps.mirror(wing_r) if hasattr(ImageOps, "mirror") else wing_r.transpose(Image.FLIP_LEFT_RIGHT)

    # Vai của vịt (điểm neo cánh) = giữa-trên-thân dưới
    shoulder_y = by + int(body_new.size[1] * 0.62)
    shoulder_x = bx + body_new.size[0] // 2
    # cánh trái neo ở vai trái
    for w_img, sign in [(wing_l, -1), (wing_r, +1)]:
        ww, wh = w_img.size
        offset_x = shoulder_x - ww // 2 + int(body_new.size[0] * 0.30) * sign
        offset_y = shoulder_y - wh // 2
        # Clamp bounds
        if offset_x < 0:
            w_crop = -offset_x
            if w_crop >= ww:
                continue
            w_img = w_img.crop((w_crop, 0, ww, wh))
            ww -= w_crop
            offset_x = 0
        if offset_y < 0:
            h_crop = -offset_y
            if h_crop >= wh:
                continue
            w_img = w_img.crop((0, h_crop, ww, wh))
            wh -= h_crop
            offset_y = 0
        if offset_x + ww > canvas_w:
            w_crop = offset_x + ww - canvas_w
            w_img = w_img.crop((0, 0, ww - w_crop, wh))
            ww -= w_crop
        if offset_y + wh > canvas_h:
            h_crop = offset_y + wh - canvas_h
            w_img = w_img.crop((0, 0, ww, wh - h_crop))
            wh -= h_crop
        canvas.paste(w_img, (offset_x, offset_y), w_img)
    return canvas


# Pip generation
def make_pipe_top(base_pipe: Image.Image, out_size=(200, 420)) -> Image.Image:
    """Pipe-top: vành ở dưới, thân kéo lên phía trên. Đỉnh phẳng."""
    w, h = out_size
    bg = base_pipe.convert("RGBA")
    bw, bh = bg.size
    # pipe.png có vành ~33% trên. Vành nằm top cap. Width ~200.
    # Tạo canvas mới
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # Tìm bbox vành: dùng bbox của phần rộng nhất
    arr = np.array(bg)
    mask = arr[:, :, 3] > 30
    ys, xs = np.where(mask)
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    pipe_pix = bg.crop((x0, y0, x1 + 1, y1 + 1))
    pw, ph = pipe_pix.size
    # Scale để width = w - 40
    scale = (w - 40) / pw
    pipe_scaled = pipe_pix.resize((int(pw * scale), int(ph * scale)), Image.LANCZOS)
    sw, sh = pipe_scaled.size
    # Pipe-top: đặt pipe từ trên xuống, base cùng vị trí thấp
    base_y = h - sh  # align xuống đáy canvas
    base_x = (w - sw) // 2
    canvas.paste(pipe_scaled, (base_x, base_y), pipe_scaled)
    return canvas


def make_pipe_bottom(base_pipe: Image.Image, out_size=(200, 420)) -> Image.Image:
    """Pipe-bottom: vành ở trên, thân kéo xuống dưới. Đỉnh phẳng."""
    w, h = out_size
    bg = base_pipe.convert("RGBA")
    arr = np.array(bg)
    mask = arr[:, :, 3] > 30
    ys, xs = np.where(mask)
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    pipe_pix = bg.crop((x0, y0, x1 + 1, y1 + 1))
    pw, ph = pipe_pix.size
    scale = (w - 40) / pw
    pipe_scaled = pipe_pix.resize((int(pw * scale), int(ph * scale)), Image.LANCZOS)
    sw, sh = pipe_scaled.size
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    base_x = (w - sw) // 2
    base_y = 0  # align lên trên canvas
    canvas.paste(pipe_scaled, (base_x, base_y), pipe_scaled)
    return canvas


def main():
    print("=" * 60)
    print("FLYING DUCKS + DUAL PIPES")
    print("=" * 60)

    # --- 1) Standing ducks base ---
    print("\n[1] Removing bg of 5convit.png...")
    raw_stand = remove_bg_save(SRC / "5convit.png", TMP / "5convit_nobg.png")
    bodies = segment_ducks(raw_stand)
    kg_labels = ["30kg", "45kg", "60kg", "70kg", "80kg"]
    print(f"  Got {len(bodies)} duck bodies")

    # --- 2) Render flying ducks ---
    print("\n[2] Rendering flying ducks (5 ducks × 3 frames)...")
    # wing angles per frame: down (-22°), mid (0°), up (+22°)
    wing_angles = [-22.0, 0.0, 22.0]
    rotate_angles = [8.0, 0.0, -6.0]
    CANVAS_W = 400
    CANVAS_H = 400
    results = []
    for i, body in enumerate(bodies):
        kg = kg_labels[i]
        for f_idx, (wa, ra) in enumerate(zip(wing_angles, rotate_angles), start=1):
            img = draw_flying_duck(
                body_rgba=body, kg_label=kg,
                wing_angle=wa, wing_scale=1.0,
                canvas_w=CANVAS_W, canvas_h=CANVAS_H,
                rotate_body=ra,
            )
            out_name = f"duck-{kg}-f{f_idx}.png"
            out_path = OUT / out_name
            img.save(out_path, "PNG", optimize=True)
            sz_kb = out_path.stat().st_size // 1024
            # bbox
            arr = np.array(img)
            mask = arr[:, :, 3] > 30
            ys, xs = np.where(mask)
            if len(xs) > 0:
                y0, y1 = ys.min(), ys.max()
                x0, x1 = xs.min(), xs.max()
                print(f"  ✓ {out_name}  ({img.size}, {sz_kb} KB)  duck-bbox={x1-x0+1}x{y1-y0+1}")
                results.append(out_path)
            else:
                print(f"  ! {out_name} - empty bbox!")

    # --- 3) Spritesheet 5x3 ---
    print("\n[3] Building 5x3 spritesheet...")
    sheet_w = 5 * CANVAS_W
    sheet_h = 3 * CANVAS_H
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    for i, kg in enumerate(kg_labels):
        for f_idx in [1, 2, 3]:
            frame = Image.open(OUT / f"duck-{kg}-f{f_idx}.png").convert("RGBA")
            sheet.paste(frame, (i * CANVAS_W, (f_idx - 1) * CANVAS_H), frame)
    sheet.save(OUT / "ducks-flying-sheet.png", "PNG", optimize=True)
    print(f"  ✓ ducks-flying-sheet.png  ({sheet.size})")

    # --- 4) Pipe-top, Pipe-bottom ---
    print("\n[4] Generating pipes (top + bottom)...")
    base_pipe = Image.open(OUT / "pipe.png")
    pipe_top = make_pipe_top(base_pipe, out_size=(200, 420))
    pipe_top.save(OUT / "pipe-top.png", "PNG", optimize=True)
    print(f"  ✓ pipe-top.png  ({pipe_top.size})")
    pipe_bot = make_pipe_bottom(base_pipe, out_size=(200, 420))
    pipe_bot.save(OUT / "pipe-bottom.png", "PNG", optimize=True)
    print(f"  ✓ pipe-bottom.png  ({pipe_bot.size})")

    print("\nDONE.")
    for p in sorted(OUT.glob("duck-*.png")):
        print(f"  {p.name}: {Image.open(p).size}")


if __name__ == "__main__":
    from PIL import ImageOps
    main()
