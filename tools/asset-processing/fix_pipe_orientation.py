"""
Sửa lại orientation của pipe-top: vành phải nằm ở DƯỚI cùng (chỗ thắt = miệng khe bay)
Còn pipe-bottom vành ở TRÊN (đã đúng).
Vẽ thêm pipe-top có body kéo LÊN TRÊN từ miệng vành.
"""

from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

OUT = Path(r"C:\Users\nguye\bersious-web\assets\game\processed")


def make_pipe_top_correct(base_pipe: Image.Image, out_size=(200, 480)) -> Image.Image:
    """Pipe-top (ống TRÊN trong Flappy Bird):
       - Vành MỞ RỘNG nằm ở DƯỚI cùng của sprite (chỗ tiếp giáp khe hở).
       - Thân ống kéo LÊN TRÊN từ vành (gắn vào trần).
       - Trên cùng sprite phẳng/không hiện gì (sẽ bị cắt bởi trần canvas game).
       Canvas: trên = transparent (sẽ hide), dưới = vành.
    """
    w, h = out_size
    bg = base_pipe.convert("RGBA")
    arr = np.array(bg)
    mask = arr[:, :, 3] > 30
    ys, xs = np.where(mask)
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    pipe_pix = bg.crop((x0, y0, x1 + 1, y1 + 1))
    pw, ph = pipe_pix.size
    # The base pipe has vành ở TRÊN, thân ở DƯỚI.
    # Trong Flappy, pipe-top cần: vành ở DƯỚI, thân kéo lên TRÊN.
    # → Flip vertically.
    pipe_pix = pipe_pix.transpose(Image.FLIP_TOP_BOTTOM)
    scale = (w - 40) / pw
    pipe_scaled = pipe_pix.resize((int(pw * scale), int(ph * scale)), Image.LANCZOS)
    sw, sh = pipe_scaled.size
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    base_x = (w - sw) // 2
    base_y = h - sh  # align xuống đáy canvas (vành ở dưới, thân kéo lên trên - hết chiều cao canvas)
    canvas.paste(pipe_scaled, (base_x, base_y), pipe_scaled)
    return canvas


def make_pipe_bottom_correct(base_pipe: Image.Image, out_size=(200, 480)) -> Image.Image:
    """Pipe-bottom (ống DƯỚI trong Flappy Bird):
       - Vành ở TRÊN cùng của sprite (chỗ miệng khe).
       - Thân ống kéo XUỐNG đáy (gắn vào sàn).
       Dùng base pipe nguyên bản: vành ở top → đúng orientation.
    """
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
    # If sh hơi ngắn so với h, kéo dài canvas lên
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    base_x = (w - sw) // 2
    base_y = 0  # top-aligned
    canvas.paste(pipe_scaled, (base_x, base_y), pipe_scaled)
    return canvas


# === EXTEND body with simple rectangles to fill taller height ===
def extend_pipe_top_capsule(base_pipe: Image.Image, out_size=(220, 480)) -> Image.Image:
    """Vẽ pipe-top dạng capsule:
       - Vành ở dưới (lấy từ base_pipe thật).
       - Thân ống là capsule cao kéo dài, màu pink pastel, có outline.
       - Thân có width = vành trong.
    """
    w, h = out_size
    base = base_pipe.convert("RGBA")
    a = np.array(base)
    mask = a[:, :, 3] > 30
    ys, xs = np.where(mask)
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    pipe_pix = base.crop((x0, y0, x1 + 1, y1 + 1))
    pw, ph = pipe_pix.size

    # Scale pipe sao cho width ~ 110 (in-game body width)
    target_w_body = 110
    scale = target_w_body / pw
    pipe_scaled = pipe_pix.resize((int(pw * scale), int(ph * scale)), Image.LANCZOS)
    sw, sh = pipe_scaled.size
    # Detect body width (no flange): use the narrowest row width
    arr_s = np.array(pipe_scaled)
    mask_s = arr_s[:, :, 3] > 30
    body_widths = mask_s.sum(axis=1)
    body_w = int(np.percentile(body_widths[body_widths > 0], 30)) if (body_widths > 0).any() else sw
    # flange width = max width of pipe
    flange_w = int(body_widths.max())

    # Draw capsule body first (full height), then paste flange on top.
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    body_x0 = (w - body_w) // 2
    body_x1 = body_x0 + body_w
    # Capsule rounded rect từ (0, 0) → (w, h - sh)
    body_top = 0
    body_bot = h - sh  # bottom = top of flange
    radius = body_w // 2
    if body_bot > body_top:
        d.rounded_rectangle([body_x0 + 2, body_top, body_x1 - 2, body_bot],
                            radius=radius, fill=(252, 215, 230, 255),
                            outline=(180, 130, 170, 255), width=3)
        # Vertical highlight
        hl_x = body_x0 + body_w // 4
        d.line([(hl_x, body_top + radius // 2), (hl_x, body_bot - radius // 2)],
               fill=(255, 245, 250, 200), width=6)

    # Paste flange (vành) ở DƯỚI
    flange_x = (w - sw) // 2
    flange_y = h - sh
    canvas.paste(pipe_scaled, (flange_x, flange_y), pipe_scaled)
    return canvas


def extend_pipe_bottom_capsule(base_pipe: Image.Image, out_size=(220, 480)) -> Image.Image:
    """Vẽ pipe-bottom dạng capsule:
       - Vành ở trên.
       - Thân ống kéo xuống dưới.
    """
    w, h = out_size
    base = base_pipe.convert("RGBA")
    a = np.array(base)
    mask = a[:, :, 3] > 30
    ys, xs = np.where(mask)
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    pipe_pix = base.crop((x0, y0, x1 + 1, y1 + 1))
    pw, ph = pipe_pix.size
    target_w_body = 110
    scale = target_w_body / pw
    pipe_scaled = pipe_pix.resize((int(pw * scale), int(ph * scale)), Image.LANCZOS)
    sw, sh = pipe_scaled.size

    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    body_x0 = (w - 110) // 2
    body_x1 = body_x0 + 110
    body_top = sh  # body bắt đầu sau khi flange kết thúc
    body_bot = h
    radius = 110 // 2
    if body_bot > body_top + radius:
        d.rounded_rectangle([body_x0 + 2, body_top, body_x1 - 2, body_bot],
                            radius=radius, fill=(252, 215, 230, 255),
                            outline=(180, 130, 170, 255), width=3)
        hl_x = body_x0 + 110 // 4
        d.line([(hl_x, body_top + radius // 2), (hl_x, body_bot - radius // 2)],
               fill=(255, 245, 250, 200), width=6)
    # Paste flange (vành) ở TRÊN
    flange_x = (w - sw) // 2
    canvas.paste(pipe_scaled, (flange_x, 0), pipe_scaled)
    return canvas


def main():
    base = Image.open(OUT / "pipe.png")
    pipe_top = extend_pipe_top_capsule(base, out_size=(220, 500))
    pipe_top.save(OUT / "pipe-top.png", "PNG", optimize=True)
    print(f"✓ pipe-top.png  {pipe_top.size}")

    pipe_bot = extend_pipe_bottom_capsule(base, out_size=(220, 500))
    pipe_bot.save(OUT / "pipe-bottom.png", "PNG", optimize=True)
    print(f"✓ pipe-bottom.png  {pipe_bot.size}")


if __name__ == "__main__":
    main()
