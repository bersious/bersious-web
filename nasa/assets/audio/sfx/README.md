# assets/audio/sfx

Hiệu ứng âm thanh phân cảnh cho màn kể chuyện (`story.js` + `audio-sfx.js`).
Tất cả file nguồn đều có giấy phép **CC0 1.0 (Public Domain)** trên OpenGameArt.org — tự do sử dụng, chỉnh sửa, phân phối thương mại mà không bắt buộc ghi công.

| File | Thời lượng | Dung lượng | Chế độ | Phân cảnh / Lượt sử dụng |
|---|---|---|---|---|
| `wind-far.mp3` | 14.0 s | ~110 KB | Lặp (`loop`) | `earth-home`, `launchpad`, `mars-surface` (gió nhẹ từ xa) |
| `storm-wind.mp3` | 10.0 s | ~98 KB | Lặp (`loop`) | `storm-coming`, `storm-impact` (gió bão cát mạnh rít) |
| `metal-impact.mp3` | 2.8 s | ~34 KB | Một lần (`once`) | `storm-impact` lượt 23 (mảnh ăng-ten đập vào lưng nhân vật) |
| `flatline.mp3` | 4.2 s | ~42 KB | Một lần (`once`) | `storm-impact` lượt 24 (bộ đo sinh hiệu đứt — bíp rồi kéo dài thành đường thẳng) |
| `rocket-launch.mp3` | 4.8 s | ~48 KB | Một lần (`once`) | `departure` (động cơ MAV đốt tầng một, gầm rú rời sao Hỏa) |
| `hab-vent.mp3` | 6.0 s | ~47 KB | Lặp (`loop`) | `awake` (tiếng quạt lọc gió rì rì trong khoang Hab im ắng) |
| `radio-static.mp3` | 6.0 s | ~47 KB | Lặp (`loop`) / Điểm nhấn | `awake` lượt 34 (bật đài thu phát — loa chỉ xè xè tiếng nhiễu tĩnh điện) |

---

## Nguồn gốc chi tiết từng file

### 1. `wind-far.mp3` (Tiếng gió nhẹ, xa)
- **Tên gốc:** `wind1.wav` (trong bộ *wind1*)
- **Tác giả:** Luke.RUSTLTD
- **URL nguồn:** https://opengameart.org/content/wind1
- **File tải:** https://opengameart.org/sites/default/files/wind1.wav
- **Giấy phép:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- **Xử lý:** Cắt 14 giây, nối vòng lặp bằng crossfade equal-power 2 s, lọc thông thấp `lowpass=f=1200` tạo cảm giác gió thổi ngoài xa, chuẩn hoá `loudnorm=I=-24:TP=-4`, mono, MP3 64 kbps.

### 2. `storm-wind.mp3` (Tiếng gió bão cát mạnh, rít)
- **Tên gốc:** `wind woosh loop.ogg` (*wind whoosh loop*) kết hợp nền trầm từ `wind1.wav` (*wind1*)
- **Tác giả:** SketchMan3 (`wind woosh loop.ogg`), Luke.RUSTLTD (`wind1.wav`)
- **URL nguồn:**
  - https://opengameart.org/content/wind-whoosh-loop (`https://opengameart.org/sites/default/files/wind%20woosh%20loop.ogg`)
  - https://opengameart.org/content/wind1 (`https://opengameart.org/sites/default/files/wind1.wav`)
- **Giấy phép:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- **Xử lý:** Trộn tiếng gió rít tần số cao (`wind woosh loop.ogg`) với dải trầm của gió bão (`wind1.wav`), cắt vòng lặp 10 giây với crossfade equal-power 1.5 s, chuẩn hoá `loudnorm=I=-18:TP=-2`, mono, MP3 80 kbps.

### 3. `metal-impact.mp3` (Tiếng va đập kim loại nặng)
- **Tên gốc:** `clang - Marker #10.wav` (trong bộ *Metal clang sounds*) + `metal_slam_01.ogg` (trong bộ *100 CC0 metal and wood SFX*)
- **Tác giả:** bart (`clangs.zip`), rubberduck (`100-CC0-wood-metal-SFX.zip`)
- **URL nguồn:**
  - https://opengameart.org/content/metal-clang-sounds (`https://opengameart.org/sites/default/files/clangs.zip`)
  - https://opengameart.org/content/100-cc0-metal-and-wood-sfx (`https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip`)
- **Giấy phép:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- **Xử lý:** Ghép tiếng va đập kim loại nặng (`metal_slam_01.ogg`) vào đầu tiếng ngân ống thép trầm (`clang - Marker #10.wav`), dài 2.8 s, fade-out 0.4 s cuối, mono, MP3 96 kbps.

### 4. `flatline.mp3` (Tiếng bíp máy đo sinh hiệu đều đều rồi tắt thành đường thẳng)
- **Tên gốc:** `beep.ogg` (*Beep Sound*)
- **Tác giả:** Test User
- **URL nguồn:** https://opengameart.org/content/beep-sound
- **File tải:** https://opengameart.org/sites/default/files/beep.ogg
- **Giấy phép:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- **Xử lý:** Dựng từ mẫu sóng `beep.ogg` (~1208 Hz): 3 nhịp bíp ngắn (140 ms mỗi nhịp, cách nhau 0.7 s) tiếp nối bằng tiếng ngân phẳng kéo dài 2.0 s (flatline) rồi tắt dần, tổng thời lượng 4.2 s, mono, MP3 80 kbps.

### 5. `rocket-launch.mp3` (Tiếng động cơ tên lửa khởi động, gầm rú)
- **Tên gốc:** `Audio/thrusterFire_000.ogg` + `Audio/spaceEngineLarge_000.ogg` (trong bộ *Sci-Fi Sounds*)
- **Tác giả:** Kenney (https://kenney.nl)
- **URL nguồn:** https://opengameart.org/content/sci-fi-sounds
- **File tải:** https://opengameart.org/sites/default/files/sci-fi_sounds.zip
- **Giấy phép:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- **Xử lý:** Phối lớp tiếng lửa buồng đốt (`thrusterFire_000.ogg`) và tiếng gầm tần số thấp của động cơ lớn (`spaceEngineLarge_000.ogg`), dài 4.8 s, fade-in 0.25 s và fade-out 0.8 s, mono, MP3 80 kbps.

### 6. `hab-vent.mp3` (Tiếng quạt thông gió / khoang tàu im ắng)
- **Tên gốc:** `ambient_01.ogg` + `machine_11.ogg` (trong bộ *30 CC0 SFX loops*)
- **Tác giả:** rubberduck
- **URL nguồn:** https://opengameart.org/content/30-cc0-sfx-loops
- **File tải:** https://opengameart.org/sites/default/files/sfx_loops.zip
- **Giấy phép:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- **Xử lý:** Trộn tiếng rì rì máy lọc không khí (`machine_11.ogg`) với âm nền khoang kín (`ambient_01.ogg`), lọc thông thấp `lowpass=f=900`, nối vòng lặp 6.0 s bằng crossfade equal-power 1.0 s, chuẩn hoá `loudnorm=I=-23:TP=-4`, mono, MP3 64 kbps.

### 7. `radio-static.mp3` (Tiếng radio rè, nhiễu tĩnh điện)
- **Tên gốc:** `ScatterNoise1.mp3` (*Static*)
- **Tác giả:** xhunterko
- **URL nguồn:** https://opengameart.org/content/static
- **File tải:** https://opengameart.org/sites/default/files/ScatterNoise1.mp3
- **Giấy phép:** CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- **Xử lý:** Cắt 6.0 s, nối vòng lặp bằng crossfade equal-power 1.0 s, lọc dải tần bộ đàm (`highpass=f=300, lowpass=f=3400`), chuẩn hoá `loudnorm=I=-21:TP=-3`, mono, MP3 64 kbps.
