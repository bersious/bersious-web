# assets/video

Đoạn phim mở đầu (`intro.mp4`) phát ngay sau khi người chơi bấm **Bắt đầu** ở màn khởi động, trước khi vào phần kể chuyện.

| File | Thời lượng | Độ phân giải | Dung lượng | Giấy phép |
|---|---|---|---|---|
| `intro.mp4` | 6.5 s | 1280×720 (24 fps, H.264, không âm thanh) | ~662 KB | **CC0 1.0 (Public Domain)** |

---

## Nguồn gốc chi tiết

File `intro.mp4` được dựng từ hai đoạn hoạt cảnh 3D Sao Hoả có giấy phép **CC0 1.0 Universal (Public Domain Dedication)** trên Wikimedia Commons, kết hợp bản đồ địa hình/màu sắc thuộc phạm vi công cộng (Public Domain) của NASA / USGS:

### 1. Cảnh 1 (0.0 s – 3.7 s): Trạm không gian trên quỹ đạo Sao Hoả
- **Tên gốc:** `File:Mars space station animation.webm`
- **Tác giả:** Wikideas1 (dựng bằng Blender với dữ liệu địa hình/màu sắc từ NASA / USGS)
- **URL trang nguồn:** https://commons.wikimedia.org/wiki/File:Mars_space_station_animation.webm
- **URL file gốc:** https://upload.wikimedia.org/wikipedia/commons/e/e2/Mars_space_station_animation.webm
- **Dữ liệu gốc NASA/USGS:**
  - Bản đồ màu: [Mars Viking Global Color Mosaic 925m](https://astrogeology.usgs.gov/search/map/mars_viking_global_color_mosaic_925m) (NASA / USGS — Public Domain)
  - Bản đồ độ cao: [Mars MGS MOLA DEM 463m](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m) (NASA / MGS / USGS — Public Domain)
- **Giấy phép:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/

### 2. Cảnh 2 (3.2 s – 6.5 s): Toàn cảnh cầu Sao Hoả tự quay (vùng Acidalia Planitia & Valles Marineris)
- **Tên gốc:** `File:Mars 360.webm`
- **Tác giả:** Wikideas1
- **URL trang nguồn:** https://commons.wikimedia.org/wiki/File:Mars_360.webm
- **URL file gốc:** https://upload.wikimedia.org/wikipedia/commons/0/05/Mars_360.webm
- **Giấy phép:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/

---

## Quy trình xử lý (`ffmpeg`)

- Cắt cảnh 1 (4.2 s đầu) ở khung 16:9 (1280×720) và cảnh 2 (3.3 s đầu) đặt giữa khung 16:9 nền đen tuyền.
- Chuyển cảnh mượt bằng `xfade=transition=fade:duration=1.0:offset=3.2`.
- Chỉnh màu điện ảnh (`eq=contrast=1.18:brightness=-0.03:saturation=1.22`), thêm `vignette=PI/4`, fade-in 0.8 s từ nền đen ở đầu và fade-out 0.8 s về nền đen ở cuối.
- Loại bỏ hoàn toàn kênh âm thanh (`-an`) để nhạc nền ambient của game phát liền mạch không bị gián đoạn.
- Mã hoá H.264 (`-c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart`), dung lượng cuối ~662 KB (dưới ngưỡng 3 MB).
