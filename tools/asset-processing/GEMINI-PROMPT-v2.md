PROMPT CHO GEMINI (Imagen 3) — BỘ ITEM GAME CHUPPIYDBIRD
==================================================================

YÊU CẦU CHUNG:
- Phong cách: kawaii (dễ thương, mắt to, mặt cười)
- Nền: MÀU XANH LÁ CYAN ĐẬM (#00E5CC hoặc tương tự) — CHỈ 1 MÀU ĐỒNG NHẤT
  + Lý do: dễ tách nền tự động (rembg), KHÔNG cần mask thủ công
  + Màu cyan không trùng với bất kỳ item nào (trà, bún, bánh)
- Mỗi item đặt CHÍNH GIỮA khung hình, chiếm ~70% diện tích
- Không có bóng đổ (để khi ghép vào game không bị cộng dồn)
- Độ phân giải đề xuất: 1024x1024 cho mỗi item
- Xuất file PNG (giữ alpha nếu được)
- KHÔNG thêm text/watermark
- Nhân vật: KHÔNG CÓ (chỉ vật phẩm)

==================================================================
DANH SÁCH 9 ITEM CẦN GEN (chia thành 3x3 grid nếu gen 1 lần):
==================================================================

HÀNG 1 — TRÀ SỮA (6 ly):
---------------------------
1. Trà sữa trân châu đường nâu (brownsugar)
   - Ly nhựa trong suốt, nắp dome
   - Nước màu caramel nâu nhạt (#D2B48C)
   - Trân châu đen ở đáy
   - Ống hút vàng nhạt
   - Mặt kawaii (mắt chấm đen, miệng cười cong, má hồng)

2. Trà sữa matcha
   - Ly tương tự
   - Nước màu xanh matcha (#9ACD32)
   - Trân châu đen
   - Ống hút xanh
   - Mặt kawaii

3. Trà sữa dâu tây (strawberry)
   - Ly tương tự
   - Nước màu hồng đậm (#FF69B4)
   - Trân châu đen
   - Ống hút hồng
   - Mặt kawaii

4. Trà sữa khoai môn (taro)
   - Ly tương tự
   - Nước màu tím lavender (#B19CD9)
   - Trân châu đen
   - Ống hút tím
   - Mặt kawaii

5. Trà sữa xoài (mango)
   - Ly tương tự
   - Nước màu vàng cam (#FFA500)
   - Trân châu đen
   - Ống hút cam
   - Mặt kawaii

6. Trà sữa Thái (Thai milk tea)
   - Ly tương tự
   - Nước màu cam đào (#FFB07A) — KHÁC với mango
   - Trân châu đen
   - Ống hút xanh dương nhạt
   - Mặt kawaii

HÀNG 2 — BÚN BÒ (1 tô):
---------------------------
7. Tô bún bò Huế
   - Tô sứ trắng, viền hồng cam
   - Nước dùng đỏ cam
   - Sợi bún trắng
   - Thịt bò lát
   - Rau thơm xanh
   - Ớt đỏ cắt lát
   - Hành lá xanh
   - Mặt kawaii trên tô
   - KHÔNG CÓ ĐŨA (để tách nền dễ)
   - KHÔNG có hơi nước

HÀNG 3 — BÁNH NGỌT (2 loại):
-------------------------------
8. Bánh bông lan trứng muối (custard lava cake)
   - Hình tròn, vàng nâu
   - Bên trong lòng đỏ chảy
   - Rắc hạt mè đen
   - Mặt kawaii trên bánh
   - Kích thước ~ nhỏ gọn 1 đĩa

9. Bánh tart dâu (strawberry tart)
   - Đế bánh vàng
   - Kem trắng phía trên
   - Dâu tây đỏ tươi xếp trên
   - Có thể thêm lá mint
   - Mặt kawaii

==================================================================
ĐẦU RA MONG MUỐN:
==================================================================
Một ảnh grid 3x3 (3072x3072) chứa 9 item trên nền CYAN đồng nhất
HOẶC 9 ảnh PNG riêng lẻ (1024x1024 mỗi ảnh) nền CYAN

Đặt tên file:
- tea-brownsugar.png
- tea-matcha.png
- tea-strawberry.png
- tea-taro.png
- tea-mango.png
- tea-thai.png
- bun-bo-hue.png
- cake-custard.png
- cake-tart-strawberry.png

Sau khi có ảnh, tôi sẽ:
1. Crop từng item từ ảnh (hoặc dùng từng file riêng)
2. Tách nền bằng rembg (nền cyan dễ tách)
3. Resize về ~250x400px
4. Lưu vào assets/game/processed/

==================================================================
NẾU GEN 1 ẢNH GRID (3x3):
==================================================================
Grid phải đều, mỗi cell 1024x1024, có đường viền mỏng cyan giữa
các cell để dễ crop. Hoặc KHÔNG có viền — chỉ cần đặt đều.

Layout:
[tea-brownsugar] [tea-matcha] [tea-strawberry]
[tea-taro]       [tea-mango]  [tea-thai]
[bun-bo-hue]     [cake-cust]  [cake-tart]

==================================================================
NẾU IMAGEN CẦN THÊM CHI TIẾT:
==================================================================
- Style reference: "kawaii chibi food illustration, pastel color palette,
  flat shading, soft outlines, no human characters, items only"
- Background: "solid #00E5CC cyan, no gradient, no pattern, no shadow"
- Resolution: "1024x1024 per item, transparent PNG or solid color BG"
