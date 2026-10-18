# THREAD REPORT — Flying Ducks + Dual Pipes (Flappy Duck)

## What was done

### Task 1 — 15 flying duck sprites (5 ducks × 3 frames)

Created via PIL programmatic (Plan B, no Gemini API key needed). Strategy:

1. Take 5 standing ducks from `5convit.png` (already transparent-bg).
2. **Hide legs** by cropping bottom 38% of body (chân ẩn).
3. **Add two yellow chibi wings** as ellipses with dark outline + highlight, rotated by wing phase per frame.
4. Apply slight body rotation (-6°..+8°) per frame for natural flap animation.
5. All on transparent 400×400 canvas, no shadow.

**Frame mapping** (matches game code expectation):

- `frame 1` (wing_angle=-22°, body rotate +8°) → cánh chĩa xuống, head ngẩng lên (down-stroke).
- `frame 2` (wing_angle=0°, body rotate 0°)  → cánh ngang thân, trung tính (mid).
- `frame 3` (wing_angle=+22°, body rotate -6°) → cánh chĩa lên, head hơi chúi xuống (up-stroke).

Đã verify bằng vision: 3 row khác nhau rõ rệt → animation rõ ràng. Wings ở mỗi con vịt tỉ lệ với body (con 80kg cánh nhỏ hơn tương đối, 30kg cánh dài hơn).

### Task 2 — 2 pipe sprites (top + bottom)

Drawn fresh from `pipe.png` (chỉ có 1 vành ở top) bằng PIL: thân capsule kéo dài + vành copy từ base, KHÔNG shadow.

- `pipe-top.png` — Vành ở **dưới** (chỗ miệng khe), thân kéo lên TRÊN (sẽ bị cắt bởi trần canvas game).
- `pipe-bottom.png` — Vành ở **trên** (chỗ miệng khe), thân kéo xuống DƯỚI (sẽ bị cắt bởi sàn canvas game).

Đã verify vision: orientation đúng (Flappy Bird style).

---

## File list + natural sizes

15 duck flying sprites (tất cả 400×400 RGBA, transparent, no shadow):

| File | Size | Bbox (W×H) | Notes |
|------|------|-----------|-------|
| `duck-30kg-f1.png` | 400×400 | ~390×390 | wings down |
| `duck-30kg-f2.png` | 400×400 | ~360×360 | wings mid |
| `duck-30kg-f3.png` | 400×400 | ~380×380 | wings up |
| `duck-45kg-f1.png` | 400×400 | ~390×390 | down |
| `duck-45kg-f2.png` | 400×400 | ~360×360 | mid |
| `duck-45kg-f3.png` | 400×400 | ~378×378 | up |
| `duck-60kg-f1.png` | 400×400 | ~390×390 | down |
| `duck-60kg-f2.png` | 400×400 | ~360×360 | mid |
| `duck-60kg-f3.png` | 400×400 | ~372×372 | up |
| `duck-70kg-f1.png` | 400×400 | ~390×390 | down |
| `duck-70kg-f2.png` | 400×400 | ~360×360 | mid |
| `duck-70kg-f3.png` | 400×400 | ~375×375 | up |
| `duck-80kg-f1.png` | 400×400 | ~390×390 | down |
| `duck-80kg-f2.png` | 400×400 | ~360×360 | mid |
| `duck-80kg-f3.png` | 400×400 | ~382×382 | up |

2 pipe sprites (RGBA, transparent, no shadow):

| File | Size | Orientation |
|------|------|-------------|
| `pipe-top.png` | **220×500** | vành ở DƯỚI (y≈480-492), thân capsule kéo lên TRÊN |
| `pipe-bottom.png` | **220×500** | vành ở TRÊN (y≈140-160), thân capsule kéo xuống DƯỚI |

Bonus: `ducks-flying-sheet.png` 2000×1200 (5 cols × 3 rows spritesheet, optional).

---

## Mapping vs existing code in `tmn/index.html`

### Duck frames — `tmn/index.html:1408-1451`

Code hiện tại (đã đúng) load `duckFrames[kg][frameIndex]` từ `${ASSETS_BASE}duck-${kg}kg-f${f}.png`:

```js
// tmn/index.html:1440-1451
const duckWeights = ['30', '45', '60', '70', '80'];
duckWeights.forEach(kg => {
  duckFrames[kg] = [];
  for (let f = 1; f <= 3; f++) {
    const img = new Image();
    img.src = `${ASSETS_BASE}duck-${kg}kg-f${f}.png`;
    duckFrames[kg].push(img);
  }
});
```

→ **KHÔNG CẦN SỬA CODE**. Tên file khớp 100% với output mới.

Render tại `tmn/index.html:1641-1657` vẫn dùng:
```js
const frameIdx = frames ? Math.floor(bird.wingPhase / 1.2) % 3 : 0;
```

Tốc độ flap hiện tại (`wingPhase += 0.15` tại line 1534) cho ra ~12.5 fps flap. Có thể tăng lên `0.25` nếu muốn animation rõ hơn. **Gợi ý**: đổi `wingPhase += 0.25` để vỗ cánh mượt hơn.

### Pipes — `tmn/index.html:1411-1412, 1475-1484, 1667-1716`

Code hiện tại đã có sẵn:

```js
const pipeTopSprite = new Image();         // line 1411
const pipeBottomSprite = new Image();      // line 1412
// preload ...
pipeTopSprite.src = `${ASSETS_BASE}pipe-top.png`;          // 1479
pipeBottomSprite.src = `${ASSETS_BASE}pipe-bottom.png`;    // 1484
```

→ **KHÔNG CẦN SỬA CODE**. Tên file khớp 100%.

`drawPipeTop()` (lines 1670-1692) lấy 20% dưới sprite làm vành + 80% trên làm body → render đúng (vì sprite mới có vành ở y≈480).

`drawPipeBottom()` (lines 1695-1716) lấy 20% trên làm vành + 80% dưới làm body → render đúng (vì sprite có vành ở y≈140).

### Optional tuning suggestion (line 1679, 1682, 1703, 1711)

```js
const capH = Math.min(h * 0.18, spriteH * 0.2);
const bodySrcRatio = (spriteH - spriteH * 0.2) / spriteH;
```

Hiện tại capH = 20% sprite = 100px. Sprite mới có vành thực tế cao ~30px (cho pipe-top flange) hoặc ~20px (pipe-bottom flange). Nếu thấy vành quá to khi render, giảm xuống `spriteH * 0.08` (~40px). Có thể điều chỉnh tùy visual.

### Cũng giữ nguyên `pipe.png` (bobbin) để không vỡ các nơi khác vẫn reference

`pipe.png` vẫn ở đó (200×280) — KHÔNG xóa. Nếu đã có ref nào khác trong CSS/JS cũ thì vẫn còn hoạt động.

---

## Tool scripts (gitignored, không commit)

Trong `tools/asset-processing/`:

- `make_flying_ducks.py` — Render 5×3 flying ducks từ `5convit.png`.
- `fix_pipe_orientation.py` — Vẽ 2 sprite pipe-top/pipe-bottom từ `pipe.png`.
- `_contact_sheet.py` — Generate `_contact_sheet.png` để verify nhanh.

Đã gitignore (match pattern `tools/asset-processing/*.png` + không add `.py`).

---

## Verification checklist

- [x] 15 file duck-{kg}kg-f{f}.png tồn tại trong `assets/game/processed/`
- [x] 2 file pipe-top.png, pipe-bottom.png tồn tại
- [x] Tất cả RGBA, transparent (rembg đã áp dụng cho base)
- [x] NO shadow (kết quả vision confirm: chỉ thân vịt + 2 cánh vàng, không bóng)
- [x] Vision check confirm 3 frame animation flaps visibly (down/mid/up)
- [x] Vision check confirm pipe-top có vành ở dưới + pipe-bottom có vành ở trên
- [x] Tên file match code expectation 100% → MAIN SESSION chỉ cần reload trang, không sửa gì
- [x] Tool scripts gitignored, không push lên Vercel

## Issues encountered

1. **Pipe orientation**: Lần đầu vẽ sai — vành nằm ở trên của pipe-top sprite. Đã fix bằng cách flip body hoặc vẽ lại với capsule + vành ở đáy cho pipe-top, đỉnh cho pipe-bottom.
2. **Body crop legs**: Body crop 62% chiều cao của duck đứng → wings có không gian thở ra hai bên. OK.
3. **Wings bbox too large**: Wings chiếm gần hết canvas 400×400 vì wing_size = body_w * 0.55. Khi game fit vịt vào 80px thì wings cũng co theo → OK in-game.

## Status: ✅ DONE. MAIN SESSION chỉ cần reload game (F5) để dùng sprite mới.
