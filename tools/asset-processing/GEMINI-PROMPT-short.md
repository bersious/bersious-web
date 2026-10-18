# Prompt ngắn cho Gemini (copy & paste)

## Phiên bản 9 ảnh riêng (khuyến nghị)

Cho mỗi item bên dưới, dùng prompt:

```
Generate a single kawaii-style food illustration on SOLID CYAN background (#00E5CC, no gradient, no pattern, no shadow). Resolution 1024x1024, PNG format.

Item: [MÔ TẢ Ở DƯỚI]
Style: chibi kawaii, pastel palette, flat shading, soft black outlines (2px), no human characters, food item only, centered in frame, taking ~70% of canvas, no drop shadow, no watermark, no text.

Mặt kawaii: 2 mắt chấm đen tròn (^.^), miệng cười cong nhỏ, 2 má hồng blush hồng pastel.
```

### Item 1 — Trà sữa đường nâu
```
A bubble milk tea cup with dome lid, caramel-brown liquid (#D2B48C), black tapioca pearls at bottom, beige straw, kawaii face on cup body.
```

### Item 2 — Trà sữa matcha
```
A bubble milk tea cup with dome lid, matcha-green liquid (#9ACD32), black tapioca pearls, green straw, kawaii face.
```

### Item 3 — Trà sữa dâu
```
A bubble milk tea cup with dome lid, strawberry-pink liquid (#FF69B4), black tapioca pearls, pink straw, kawaii face.
```

### Item 4 — Trà sữa khoai môn
```
A bubble milk tea cup with dome lid, taro-lavender liquid (#B19CD9), black tapioca pearls, purple straw, kawaii face.
```

### Item 5 — Trà sữa xoài
```
A bubble milk tea cup with dome lid, mango-orange liquid (#FFA500), black tapioca pearls, orange straw, kawaii face.
```

### Item 6 — Trà sữa Thái
```
A bubble milk tea cup with dome lid, Thai-milk-tea peach-orange liquid (#FFB07A), black tapioca pearls, light-blue straw, kawaii face.
```

### Item 7 — Tô bún bò Huế
```
A white ceramic bowl with pink rim, orange-red broth, white rice noodles, beef slices, green herbs, red chili slices, green onion, kawaii face on bowl. NO chopsticks, NO steam.
```

### Item 8 — Bánh bông lan trứng muối
```
A small round golden-brown lava custard cake on a white plate, melted egg yolk center oozing out, sprinkled with black sesame seeds on top, kawaii face.
```

### Item 9 — Bánh tart dâu
```
A small round strawberry tart: golden pastry base, white cream filling, fresh red strawberries on top with mint leaf, kawaii face.
```

## Phiên bản 1 ảnh grid 3x3 (nhanh hơn)

```
Generate a 3x3 grid (3072x3072 PNG) of 9 kawaii food illustrations on SOLID CYAN background (#00E5CC, no gradient, no pattern, no shadow, no watermark, no text).

Style: chibi kawaii, pastel palette, flat shading, soft black outlines (2px), no human characters, food items only.

Each cell 1024x1024. Layout (left to right, top to bottom):
Row 1: bubble milk tea (brownsugar) | bubble milk tea (matcha) | bubble milk tea (strawberry)
Row 2: bubble milk tea (taro) | bubble milk tea (mango) | bubble milk tea (Thai)
Row 3: bún bò Huế bowl (no chopsticks) | custard lava cake | strawberry tart

All 6 milk tea: dome lid, kawaii face on body (eyes ^.^, smile, blush).
```

---

## Sau khi Gemini gen xong

1. Lưu 9 ảnh PNG vào `Desktop/tmn 2010/items-v2/`
2. Tôi sẽ tự động:
   - Tách nền bằng rembg (cyan dễ tách)
   - Crop bbox chính xác
   - Resize ~250x400
   - Lưu vào `assets/game/processed/`
3. Game tự dùng bộ mới
