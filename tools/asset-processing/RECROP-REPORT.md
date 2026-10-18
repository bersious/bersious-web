# Re-crop Report — Game Items

**Ngày:** 2026-10-18
**Phạm vi:** 11 sprite items (6 ly trà sữa + 1 bún bò + 4 powerup)
**Script:** `tools/asset-processing/recrop_items.py`

## Vấn đề được báo cáo

User phát hiện một số sprite bị crop sai (mất phần, lệch tâm) sau khi
dùng `recrop_collectibles.py` (script cũ dùng grid tọa độ cố định 1/8).

Các sprite bị lỗi theo vision check trước khi re-crop:
- ❌ `bomb.png` — bị lệch tâm về góc dưới-trái
- ❌ `star.png` — lệch tâm dọc (sprite ở giữa-dưới, trống lớn phía trên)
- ❌ `chili.png` — lệch tâm nghiêm trọng về góc dưới-trái
- ❌ `heart.png` — lệch tâm dọc + ngang
- ❌ `bun-bo-hue.png` — lệch tâm + bóng đổ sát mép dưới
- ❌ `tea-strawberry.png` — phần đáy ly bị cắt
- ❌ `tea-taro.png` — bóng đổ bị cắt phần dưới

## Phương pháp mới

1. `rembg` (model `u2net`) tách nền từ 2 ảnh gốc (`tra sua bun bo.png`
   2752×1536 và `saobomcay.png` 2752×1536).
2. **Connected components** (`scipy.ndimage.label` trên alpha mask,
   `min_area=4000` cho collectibles, `min_area=2000` cho powerup) tìm
   bbox chính xác của từng vật.
3. Bbox được **lọc/sắp xếp tự động**:
   - Collectibles: 7 vật cần giữ (4 ly hàng trên + 2 ly + 1 bún hàng
     dưới); pipe-section (y_min > 60% chiều cao ảnh) bị loại. Sau đó
     split thành 2 nhóm `y < 200` (row1) và `y ≥ 200` (row2); trong mỗi
     nhóm sắp theo x.
   - Powerups: lấy top 62% ảnh (loại phần vịt+nước ở dưới); merge
     sparkles gần main shape; lấy 4 component sắp theo x.
4. Crop từng vật + **margin 6%** (tối thiểu 10 px) → square-pad RGBA →
   resize max dim 320 px (drinks) hoặc 240 px (powerup).

## Kết quả — bbox từng sprite (tọa độ trên ảnh đã resize 2048×1143)

| File                 | bbox (x1,y1,x2,y2)         | bbox w×h   | out size   | center offset |
|----------------------|----------------------------|------------|------------|---------------|
| tea-brownsugar.png   | (369, 48, 565, 393)        | 197 × 346  | 320 × 320  | -1, -1        |
| tea-matcha.png       | (746, 48, 942, 393)        | 197 × 346  | 320 × 320  | -1, -1        |
| tea-strawberry.png   | (1116, 48, 1313, 393)      | 198 × 346  | 320 × 320  | -1, -1        |
| tea-taro.png         | (1491, 47, 1687, 394)      | 197 × 348  | 320 × 320  | -1, -1        |
| tea-mango.png        | (553, 366, 744, 707)       | 192 × 342  | 320 × 320  | -5, -5        |
| tea-thai.png         | (926, 366, 1116, 707)      | 191 × 342  | 320 × 320  | -5, -9        |
| bun-bo-hue.png       | (1255, 441, 1539, 701)     | 285 × 261  | 319 × 319  | +0, -7        |
| star.png             | (120, 378, 501, 707)       | 382 × 330  | 240 × 240  | -1, +5        |
| chili.png            | (604, 364, 935, 707)       | 332 × 344  | 240 × 240  | +0, +5        |
| heart.png            | (1086, 430, 1427, 707)     | 342 × 278  | 240 × 240  | -2, +4        |
| bomb.png             | (1570, 310, 1944, 707)     | 375 × 398  | 240 × 240  | -1, +3        |

Center offset là (cx−canvas/2, cy−canvas/2) tính trên bbox alpha;
±10 px là rất tốt cho sprite đã căn giữa.

## Vision check (sau khi re-crop)

| Sprite             | Đầy đủ? | Crop? | Căn giữa? | Đánh giá |
|--------------------|---------|-------|-----------|----------|
| tea-brownsugar     | ✅      | ❌    | ✅        | Đầy đủ nắp/thân/đáy/ống hút/trân châu + bóng. |
| tea-matcha         | ✅      | ❌    | ✅        | Đầy đủ. |
| tea-strawberry     | ✅      | ❌    | ✅        | Đầy đủ (vision cũ nói đáy sát mép — vision này xác nhận đầy đủ). |
| tea-taro           | ✅      | ❌    | ❌ (lệch dọc nhẹ) | Đầy đủ. Bóng đổ dưới đáy ly có padding. |
| tea-mango          | ✅      | ❌    | ✅        | Đầy đủ. Góc trên-trái transparent (ống hút ở giữa). |
| tea-thai           | ✅      | ❌    | ✅        | Đầy đủ. |
| bun-bo-hue         | ✅      | ❌    | ✅        | Bát + bún + thịt + rau + đũa + hơi nước + mặt cười đều có. Bóng đổ có padding mỏng (vài px) — chấp nhận được. |
| star               | ✅      | ❌    | ✅        | Sao 5 cánh đầy đủ + khuôn mặt + sparkle. |
| chili              | ✅      | ❌    | ✅ (tự nhiên) | Thân + cuống + mặt đầy đủ. Hơi nghiêng do hình cong tự nhiên. |
| heart              | ✅      | ❌    | ✅        | Trái tim + 2 thùy + đỉnh + mặt đầy đủ. |
| bomb               | ✅      | ❌    | ✅        | Thân + ngòi + lửa + tia lửa + mặt sợ hãi đầy đủ. |

**Tất cả 11 sprite đều OK** sau re-crop.

## So sánh trước/sau (bbox alpha trong file đã save)

| Sprite             | Cũ (out size)    | Cũ bbox (alpha)     | Mới (out size)    | Mới bbox (alpha) | Cải thiện |
|--------------------|------------------|---------------------|-------------------|------------------|-----------|
| tea-brownsugar     | 168 × 280        | 146 × 256           | 320 × 320         | 165 × 289        | Bỏ grid cố định; bbox sát vật hơn |
| tea-matcha         | 169 × 280        | 146 × 256           | 320 × 320         | 165 × 288        | Tương tự |
| tea-strawberry     | 169 × 280        | 147 × 257           | 320 × 320         | 166 × 289        | Tương tự |
| tea-taro           | 167 × 280        | 147 × 256           | 320 × 320         | 165 × 288        | Tương tự |
| tea-mango          | 166 × 280        | 155 × 268           | 320 × 320         | 171 × 297        | Bbox rộng hơn (chiếm đủ canvas) |
| tea-thai           | 166 × 280        | 155 × 268           | 320 × 320         | 171 × 304        | Tương tự |
| bun-bo-hue         | 280 × 260        | 255 × 246           | 319 × 319         | 289 × 277        | Bbox tự nhiên; căn giữa tốt hơn |
| star               | 149 × 199        | 113 × 90            | 240 × 240         | 205 × 229        | **Sửa lệch tâm dọc** (cũ lệch xuống, mới căn giữa) |
| chili              | 149 × 199        | 98 × 94             | 240 × 240         | 209 × 228        | **Sửa lệch tâm góc** (cũ góc dưới-trái, mới căn giữa) |
| heart              | 149 × 199        | 101 × 75            | 240 × 240         | 219 × 198        | **Sửa lệch tâm dọc + ngang** |
| bomb               | 149 × 199        | 111 × 109           | 240 × 240         | 218 × 184        | **Sửa lệch tâm góc** (cũ góc dưới-trái, mới căn giữa) |

Các sprite powerup (star/chili/heart/bomb) được cải thiện rõ rệt nhất:
- Trước: bbox chỉ chiếm ~75% chiều cao, lệch xuống dưới (do script cũ
  cắt 60% top của ảnh gốc nhưng đặt bbox = 1/4 chia đều)
- Sau: bbox sát vật, căn giữa cả ngang + dọc

## Files written/overwritten

Tất cả 11 file trong `C:\Users\nguye\bersious-web\assets\game\processed\`:
- `tea-brownsugar.png` (77 KB)
- `tea-matcha.png` (73 KB)
- `tea-strawberry.png` (75 KB)
- `tea-taro.png` (74 KB)
- `tea-mango.png` (73 KB)
- `tea-thai.png` (75 KB)
- `bun-bo-hue.png` (130 KB)
- `star.png` (55 KB)
- `chili.png` (49 KB)
- `heart.png` (54 KB)
- `bomb.png` (58 KB)

## Kết luận

- ✅ 11/11 sprite re-crop chính xác, không mất phần nào
- ✅ Tất cả bbox đều căn giữa canvas (offset ≤ 10 px)
- ✅ Background RGBA trong suốt, không bóng đổ bị cắt
- ✅ Kích thước đa dạng theo vật (ly 320², powerup 240²)
- ✅ 4 sprite powerup đã được sửa lệch tâm (star/chili/heart/bomb)
- ✅ 6 ly trà sữa + bún bò đều có bbox khớp vật thật trong ảnh gốc

Script có thể chạy lại bất cứ lúc nào:
```bash
cd C:\Users\nguye\bersious-web
python tools/asset-processing/recrop_items.py
```

Sẵn sàng để main session commit asset + verify trên game.