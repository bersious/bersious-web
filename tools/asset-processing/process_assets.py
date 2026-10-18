r"""
Process game assets: remove background + crop sprites + resize for web.

Input:  C:\Users\nguye\Desktop\tmn 2010\*.png (6 file goc tu Gemini)
Output: C:\Users\nguye\bersious-web\assets\game\processed\ (nhieu file da tach)

Workflow:
1. Tach nen tat ca anh goc bang rembg -> PNG trong suot
2. Cat sprite sheet vit (5 con tren 1 hang) -> 5 file rieng
3. Cat collectibles (6 tra sua + 1 bun bo + 2 ong) -> 9 file rieng
4. Cat powerups (sao, ot, tim, bom) -> 4 file rieng
5. Tach 3 layer background
6. Resize ve kich thuoc toi uu
"""
import os
import sys
from pathlib import Path
from PIL import Image
import numpy as np
from rembg import remove, new_session

# === CONFIG ===
INPUT_DIR = Path(r'C:\Users\nguye\Desktop\tmn 2010')
OUTPUT_DIR = Path(r'C:\Users\nguye\bersious-web\assets\game\processed')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Tên file input + cách xử lý
ASSETS = {
    'duck-flying.png': {
        'input': 'vitbay.png',
        'type': 'sprite_h',  # sprite sheet nằm ngang, 5 frame
        'frames': 5,
        'names': ['duck-30kg', 'duck-45kg', 'duck-60kg', 'duck-70kg', 'duck-80kg'],
        'target_size': 240,  # px, chiều dài lớn nhất
    },
    'duck-standing.png': {
        'input': '5convit.png',
        'type': 'sprite_h',
        'frames': 5,
        'names': ['duck-stand-1', 'duck-stand-2', 'duck-stand-3', 'duck-stand-4', 'duck-stand-5'],
        'target_size': 240,
    },
    'collectibles.png': {
        'input': 'tra sua bun bo.png',
        'type': 'food_grid',  # 6 ly top row, 1 bún + 2 ống bottom
        'frames': 9,
        'names': [
            'tea-brownsugar', 'tea-matcha', 'tea-strawberry', 'tea-taro',
            'tea-mango', 'tea-thai', 'bun-bo-hue',
            'pipe-top', 'pipe-bottom',
        ],
        'target_size': 280,
    },
    'powerups.png': {
        'input': 'saobomcay.png',
        'type': 'powerup_row',  # 4 item ngang
        'frames': 4,
        'names': ['star', 'chili', 'heart', 'bomb'],
        'target_size': 200,
    },
    'bg-layers.png': {
        'input': '3 layer.png',
        'type': 'bg_3layer',  # 3 dải ngang
        'frames': 3,
        'names': ['bg-far', 'bg-mid', 'bg-near'],
        'target_size': 1920,  # chiều rộng target
    },
    'bg-game.png': {
        'input': 'backgroundgame.png',
        'type': 'bg_full',  # ảnh nền full, không cắt
        'frames': 1,
        'names': ['bg-full'],
        'target_size': 1920,
    },
}


def remove_bg(input_path: Path, output_path: Path) -> None:
    """Tach nen bang rembg u2net (model nhe, it RAM hon bria-rmbg-2.0)."""
    img = Image.open(input_path).convert('RGBA')
    # Resize xuong max 2048px truoc khi xu ly de tiet kiem RAM
    max_dim = 2048
    if max(img.size) > max_dim:
        ratio = max_dim / max(img.size)
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    img_array = np.array(img)
    # Tao session voi model u2net (nhe hon bria-rmbg-2.0)
    session = new_session('u2net')
    result = remove(img_array, session=session, only_mask=False)
    out = Image.fromarray(result).convert('RGBA')
    out.save(output_path, 'PNG', optimize=True)
    print(f'  [OK] Removed bg: {output_path.name}  ({out.size}, {output_path.stat().st_size // 1024} KB)')


def crop_sprite_h(img: Image.Image, frames: int, names: list, target_size: int) -> list:
    """Cắt sprite sheet nằm ngang thành N frame đều nhau."""
    w, h = img.size
    frame_w = w // frames
    cropped = []
    for i in range(frames):
        # Crop với padding nhỏ
        pad = 8
        x1 = i * frame_w + pad
        x2 = (i + 1) * frame_w - pad
        box = (x1, pad, x2, h - pad)
        frame = img.crop(box)
        # Resize về target_size (giữ aspect ratio)
        ratio = target_size / max(frame.size)
        new_size = (int(frame.size[0] * ratio), int(frame.size[1] * ratio))
        frame = frame.resize(new_size, Image.LANCZOS)
        cropped.append((names[i], frame))
    return cropped


def crop_food_grid(img: Image.Image, names: list, target_size: int) -> list:
    """
    collectibles.png layout (theo vision_analyze):
    - Top row: 4 trà sữa (trái qua phải)
    - Bottom row: 2 trà sữa + 1 bún bò (trái qua phải, bún ở phải)
    - Phần dưới (có divider): 2 ống cột
    """
    w, h = img.size
    # Tỉ lệ theo vision: 4 top, 3 mid, 2 pipe bottom
    # Chia theo chiều dọc: 50% top section, 20% middle, 30% bottom pipes
    # (sẽ tinh chỉnh sau khi xem ảnh thực tế)

    # Top row: 4 items
    top_section = img.crop((0, 0, w, int(h * 0.45)))
    top_w, top_h = top_section.size
    item_w = top_w // 4
    cropped = []
    for i in range(4):
        frame = top_section.crop((i * item_w, 0, (i + 1) * item_w, top_h))
        ratio = target_size / max(frame.size)
        new_size = (int(frame.size[0] * ratio), int(frame.size[1] * ratio))
        frame = frame.resize(new_size, Image.LANCZOS)
        cropped.append((names[i], frame))

    # Middle row: 2 trà + 1 bún (3 items, bún ở phải)
    mid_section = img.crop((0, int(h * 0.45), w, int(h * 0.75)))
    mid_w, mid_h = mid_section.size
    # 3 items: 2 trà bên trái + 1 bún bên phải
    # Cắt theo tỉ lệ: trà chiếm 2/3 trái, bún chiếm 1/3 phải
    tea_part = int(mid_w * 2 / 3)
    # 2 trà sữa trong tea_part
    tea_w = tea_part // 2
    for i in range(2):
        frame = mid_section.crop((i * tea_w, 0, (i + 1) * tea_w, mid_h))
        ratio = target_size / max(frame.size)
        new_size = (int(frame.size[0] * ratio), int(frame.size[1] * ratio))
        frame = frame.resize(new_size, Image.LANCZOS)
        cropped.append((names[4 + i], frame))
    # 1 bún bò ở phải
    bun_frame = mid_section.crop((tea_part, 0, mid_w, mid_h))
    ratio = target_size / max(bun_frame.size)
    new_size = (int(bun_frame.size[0] * ratio), int(bun_frame.size[1] * ratio))
    bun_frame = bun_frame.resize(new_size, Image.LANCZOS)
    cropped.append((names[6], bun_frame))

    # Bottom: 2 ống cột
    bot_section = img.crop((0, int(h * 0.75), w, h))
    bot_w, bot_h = bot_section.size
    pipe_w = bot_w // 2
    for i in range(2):
        frame = bot_section.crop((i * pipe_w, 0, (i + 1) * pipe_w, bot_h))
        ratio = target_size / max(frame.size)
        new_size = (int(frame.size[0] * ratio), int(frame.size[1] * ratio))
        frame = frame.resize(new_size, Image.LANCZOS)
        cropped.append((names[7 + i], frame))

    return cropped


def crop_powerup_row(img: Image.Image, names: list, target_size: int) -> list:
    """4 item ngang (sao, ớt, tim, bom) - bỏ qua con vịt ở dưới nước nếu có."""
    w, h = img.size
    # Phần trên: 4 item chính (chiếm ~60% chiều cao)
    top_h = int(h * 0.6)
    top = img.crop((0, 0, w, top_h))
    top_w = top.size[0]
    item_w = top_w // 4
    cropped = []
    for i in range(4):
        frame = top.crop((i * item_w, 0, (i + 1) * item_w, top_h))
        ratio = target_size / max(frame.size)
        new_size = (int(frame.size[0] * ratio), int(frame.size[1] * ratio))
        frame = frame.resize(new_size, Image.LANCZOS)
        cropped.append((names[i], frame))
    return cropped


def crop_bg_3layer(img: Image.Image, names: list, target_w: int) -> list:
    """Cắt ảnh thành 3 dải ngang bằng nhau (parallax 3 layer)."""
    w, h = img.size
    layer_h = h // 3
    cropped = []
    for i in range(3):
        frame = img.crop((0, i * layer_h, w, (i + 1) * layer_h))
        # Resize về target_w
        ratio = target_w / w
        new_size = (target_w, int(layer_h * ratio))
        frame = frame.resize(new_size, Image.LANCZOS)
        cropped.append((names[i], frame))
    return cropped


def crop_bg_full(img: Image.Image, name: str, target_w: int) -> list:
    """Resize full background về target_w (giữ tỉ lệ)."""
    w, h = img.size
    ratio = target_w / w
    new_size = (target_w, int(h * ratio))
    return [(name, img.resize(new_size, Image.LANCZOS))]


# === MAIN ===
print('=' * 60)
print('GAME ASSET PROCESSOR')
print('=' * 60)

for out_name, cfg in ASSETS.items():
    print(f'\n[{out_name}]')
    input_path = INPUT_DIR / cfg['input']
    if not input_path.exists():
        print(f'  ✗ NOT FOUND: {input_path}')
        continue

    # Bước 1: Tách nền
    tmp_path = OUTPUT_DIR / f'_tmp_{out_name}'
    print(f'  Removing background...')
    remove_bg(input_path, tmp_path)

    # Bước 2: Crop theo type
    img = Image.open(tmp_path).convert('RGBA')
    print(f'  Source: {img.size}')

    if cfg['type'] == 'sprite_h':
        frames = crop_sprite_h(img, cfg['frames'], cfg['names'], cfg['target_size'])
    elif cfg['type'] == 'food_grid':
        frames = crop_food_grid(img, cfg['names'], cfg['target_size'])
    elif cfg['type'] == 'powerup_row':
        frames = crop_powerup_row(img, cfg['names'], cfg['target_size'])
    elif cfg['type'] == 'bg_3layer':
        frames = crop_bg_3layer(img, cfg['names'], cfg['target_size'])
    elif cfg['type'] == 'bg_full':
        frames = crop_bg_full(img, cfg['names'][0], cfg['target_size'])
    else:
        print(f'  ✗ Unknown type: {cfg["type"]}')
        continue

    # Bước 3: Lưu từng frame
    for name, frame_img in frames:
        out_path = OUTPUT_DIR / f'{name}.png'
        frame_img.save(out_path, 'PNG', optimize=True)
        size_kb = out_path.stat().st_size // 1024
        print(f'  ✓ {name}.png  ({frame_img.size}, {size_kb} KB)')

    # Cleanup tmp
    tmp_path.unlink()

print('\n' + '=' * 60)
print(f'OUTPUT: {OUTPUT_DIR}')
print('=' * 60)
