# assets/audio/sfx

Hiệu ứng âm thanh phân cảnh cho màn kể chuyện (`story.js` + `audio-sfx.js`).
Tất cả file nguồn đều có giấy phép **CC0 1.0 (Public Domain)** trên OpenGameArt.org, tự do sử dụng, chỉnh sửa, phân phối thương mại mà không bắt buộc ghi công.

| File | Thời lượng | Dung lượng | Chế độ | Phân cảnh / Lượt sử dụng |
|---|---|---|---|---|
| `wind-far.mp3` | 14.0 s | ~110 KB | Lặp (`loop`) | `earth-home`, `launchpad`, `mars-surface` (gió nhẹ từ xa) |
| `storm-wind.mp3` | 10.0 s | ~98 KB | Lặp (`loop`) | `storm-coming`, `storm-impact` (gió bão cát mạnh rít) |
| `metal-impact.mp3` | 2.8 s | ~34 KB | Một lần (`once`) | `storm-impact` lượt 23 (mảnh ăng-ten đập vào lưng nhân vật) |
| `flatline.mp3` | 4.2 s | ~42 KB | Một lần (`once`) | `storm-impact` lượt 24 (bộ đo sinh hiệu đứt, bíp rồi kéo dài thành đường thẳng) |
| `rocket-launch.mp3` | 4.8 s | ~48 KB | Một lần (`once`) | `departure` (động cơ MAV đốt tầng một, gầm rú rời sao Hỏa) |
| `hab-vent.mp3` | 6.0 s | ~47 KB | Lặp (`loop`) | `awake` (tiếng quạt lọc gió rì rì trong khoang Hab im ắng) |
| `radio-static.mp3` | 6.0 s | ~47 KB | Lặp (`loop`) / Điểm nhấn | `awake` lượt 34 (bật đài thu phát, loa chỉ xè xè tiếng nhiễu tĩnh điện) |
| `shutter-click.mp3` | 0.3 s | ~3 KB | Một lần (`once`) | BEAT_SFX index 15 (Johanssen chụp ảnh cả đội trước bệ phóng, tiếng màn trập bấm một cái) |
| `terminal-blip.mp3` | 0.1 s | ~2 KB | Một lần (`once`) | BEAT_SFX index 12, 16, 19, 35 (mọi dòng `log`, tiếng bíp máy tính ngắn, khô) |
| `warning-chime.mp3` | 0.5 s | ~6 KB | Một lần (`once`) | BEAT_SFX index 19, phát chồng cùng `terminal-blip` (chuông khẩn hai nhịp khi bão vượt ngưỡng an toàn MAV) |
| `switch-flip.mp3` | 0.1 s | ~2 KB | Một lần (`once`) | BEAT_SFX index 32 (Lewis gạt nắp bảo vệ công tắc đánh lửa, nắp nhựa lật giòn) |
| `pen-scribble.mp3` | 0.8 s | ~7 KB | Một lần (`once`) | BEAT_SFX index 39 (ghi số khẩu phần vào sổ tay rồi gạch dưới hai đường) |
| `headset-click.mp3` | 0.4 s | ~4 KB | Một lần (`once`) | BEAT_SFX index 34 (Vogel tháo tai nghe rồi đeo lại hai lần, hai tiếng tách nhỏ) |
| `door-hatch.mp3` | 1.2 s | ~13 KB | Một lần (`once`) | BEAT_SFX index 35 (mở nắp khoang khí Hab sau cơn bão, kim loại nặng) |

---

## Nguồn gốc chi tiết từng file

### 1. `wind-far.mp3` (Tiếng gió nhẹ, xa)
- **Tên gốc:** `wind1.wav` (trong bộ *wind1*)
- **Tác giả:** Luke.RUSTLTD
- **URL nguồn:** https://opengameart.org/content/wind1
- **File tải:** https://opengameart.org/sites/default/files/wind1.wav
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Cắt 14 giây, nối vòng lặp bằng crossfade equal-power 2 s, lọc thông thấp `lowpass=f=1200` tạo cảm giác gió thổi ngoài xa, chuẩn hoá `loudnorm=I=-24:TP=-4`, mono, MP3 64 kbps.

### 2. `storm-wind.mp3` (Tiếng gió bão cát mạnh, rít)
- **Tên gốc:** `wind woosh loop.ogg` (*wind whoosh loop*) kết hợp nền trầm từ `wind1.wav` (*wind1*)
- **Tác giả:** SketchMan3 (`wind woosh loop.ogg`), Luke.RUSTLTD (`wind1.wav`)
- **URL nguồn:**
  - https://opengameart.org/content/wind-whoosh-loop (`https://opengameart.org/sites/default/files/wind%20woosh%20loop.ogg`)
  - https://opengameart.org/content/wind1 (`https://opengameart.org/sites/default/files/wind1.wav`)
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Trộn tiếng gió rít tần số cao (`wind woosh loop.ogg`) với dải trầm của gió bão (`wind1.wav`), cắt vòng lặp 10 giây với crossfade equal-power 1.5 s, chuẩn hoá `loudnorm=I=-18:TP=-2`, mono, MP3 80 kbps.

### 3. `metal-impact.mp3` (Tiếng va đập kim loại nặng)
- **Tên gốc:** `clang - Marker #10.wav` (trong bộ *Metal clang sounds*) + `metal_slam_01.ogg` (trong bộ *100 CC0 metal and wood SFX*)
- **Tác giả:** bart (`clangs.zip`), rubberduck (`100-CC0-wood-metal-SFX.zip`)
- **URL nguồn:**
  - https://opengameart.org/content/metal-clang-sounds (`https://opengameart.org/sites/default/files/clangs.zip`)
  - https://opengameart.org/content/100-cc0-metal-and-wood-sfx (`https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip`)
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Ghép tiếng va đập kim loại nặng (`metal_slam_01.ogg`) vào đầu tiếng ngân ống thép trầm (`clang - Marker #10.wav`), dài 2.8 s, fade-out 0.4 s cuối, mono, MP3 96 kbps.

### 4. `flatline.mp3` (Tiếng bíp máy đo sinh hiệu đều đều rồi tắt thành đường thẳng)
- **Tên gốc:** `beep.ogg` (*Beep Sound*)
- **Tác giả:** Test User
- **URL nguồn:** https://opengameart.org/content/beep-sound
- **File tải:** https://opengameart.org/sites/default/files/beep.ogg
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Dựng từ mẫu sóng `beep.ogg` (~1208 Hz): 3 nhịp bíp ngắn (140 ms mỗi nhịp, cách nhau 0.7 s) tiếp nối bằng tiếng ngân phẳng kéo dài 2.0 s (flatline) rồi tắt dần, tổng thời lượng 4.2 s, mono, MP3 80 kbps.

### 5. `rocket-launch.mp3` (Tiếng động cơ tên lửa khởi động, gầm rú)
- **Tên gốc:** `Audio/thrusterFire_000.ogg` + `Audio/spaceEngineLarge_000.ogg` (trong bộ *Sci-Fi Sounds*)
- **Tác giả:** Kenney (https://kenney.nl)
- **URL nguồn:** https://opengameart.org/content/sci-fi-sounds
- **File tải:** https://opengameart.org/sites/default/files/sci-fi_sounds.zip
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Phối lớp tiếng lửa buồng đốt (`thrusterFire_000.ogg`) và tiếng gầm tần số thấp của động cơ lớn (`spaceEngineLarge_000.ogg`), dài 4.8 s, fade-in 0.25 s và fade-out 0.8 s, mono, MP3 80 kbps.

### 6. `hab-vent.mp3` (Tiếng quạt thông gió / khoang tàu im ắng)
- **Tên gốc:** `ambient_01.ogg` + `machine_11.ogg` (trong bộ *30 CC0 SFX loops*)
- **Tác giả:** rubberduck
- **URL nguồn:** https://opengameart.org/content/30-cc0-sfx-loops
- **File tải:** https://opengameart.org/sites/default/files/sfx_loops.zip
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Trộn tiếng rì rì máy lọc không khí (`machine_11.ogg`) với âm nền khoang kín (`ambient_01.ogg`), lọc thông thấp `lowpass=f=900`, nối vòng lặp 6.0 s bằng crossfade equal-power 1.0 s, chuẩn hoá `loudnorm=I=-23:TP=-4`, mono, MP3 64 kbps.

### 7. `radio-static.mp3` (Tiếng radio rè, nhiễu tĩnh điện)
- **Tên gốc:** `ScatterNoise1.mp3` (*Static*)
- **Tác giả:** xhunterko
- **URL nguồn:** https://opengameart.org/content/static
- **File tải:** https://opengameart.org/sites/default/files/ScatterNoise1.mp3
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Cắt 6.0 s, nối vòng lặp bằng crossfade equal-power 1.0 s, lọc dải tần bộ đàm (`highpass=f=300, lowpass=f=3400`), chuẩn hoá `loudnorm=I=-21:TP=-3`, mono, MP3 64 kbps.

### 8. `shutter-click.mp3` (Tiếng màn trập máy ảnh bấm một cái)
- **Tên gốc:** `photo.ogg` (*Camera*)
- **Tác giả:** themightyglider
- **URL nguồn:** https://opengameart.org/content/camera
- **File tải:** https://opengameart.org/sites/default/files/photo.ogg
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Cắt lấy tiếng bấm màn trập ở đầu file (0.28 s), lọc thông cao `highpass=f=180`, fade-out 0.06 s cuối, chuẩn hoá `loudnorm=I=-16:TP=-2`, mono, MP3 64 kbps.

### 9. `terminal-blip.mp3` (Tiếng bíp máy tính ngắn, khô)
- **Tên gốc:** `beep.wav` (*Beep Tone Sound Sfx*)
- **Tác giả:** qubodup
- **URL nguồn:** https://opengameart.org/content/beep-tone-sound-sfx
- **File tải:** https://opengameart.org/sites/default/files/beep.wav
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Giữ nguyên nhịp bíp 0.1 s, fade-out nhanh 0.035 s cuối, chuẩn hoá `loudnorm=I=-18:TP=-4`, mono, MP3 64 kbps.

### 10. `warning-chime.mp3` (Tiếng chuông cảnh báo khẩn, hai nhịp)
- **Tên gốc:** `alarm.ogg` (*Short alarm*)
- **Tác giả:** yd
- **URL nguồn:** https://opengameart.org/content/short-alarm
- **File tải:** https://opengameart.org/sites/default/files/alarm_0.ogg
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Cắt hai nhịp còi đầu tiên (0.13 s mỗi nhịp) rồi ghép lại thành hai tiếng cách nhau 0.2 s, fade-out 0.03 s mỗi nhịp, chuẩn hoá `loudnorm=I=-15:TP=-2`, mono, MP3 80 kbps.

### 11. `switch-flip.mp3` (Tiếng lật nắp nhựa công tắc, giòn và ngắn)
- **Tên gốc:** `toggle_001.ogg` (trong bộ *Interface Sounds*)
- **Tác giả:** Kenney (https://kenney.nl)
- **URL nguồn:** https://opengameart.org/content/interface-sounds
- **File tải:** https://opengameart.org/sites/default/files/kenney_interfaceSounds.zip
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Giữ nguyên tiếng lật nắp 0.15 s, lọc thông cao `highpass=f=200`, chuẩn hoá `loudnorm=I=-16:TP=-3`, mono, MP3 64 kbps.

### 12. `pen-scribble.mp3` (Tiếng bút gạch hai đường lên giấy)
- **Tên gốc:** `pencil_write.ogg` (trong bộ *Pencil Sounds*, mẫu gốc `pencil_write` của NachtmahrTV trên freesound.org/s/571800)
- **Tác giả:** AntumDeluge
- **URL nguồn:** https://opengameart.org/content/pencil-sounds
- **File tải:** https://opengameart.org/sites/default/files/pencil.zip
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Cắt một đường gạch (0.46 s) rồi nhân đôi thành hai đường cách nhau 0.38 s, lọc thông cao `highpass=f=400`, khuếch đại 2.2 lần, chuẩn hoá `loudnorm=I=-19:TP=-3`, mono, MP3 64 kbps.

### 13. `headset-click.mp3` (Tiếng tháo và đeo tai nghe, hai tiếng tách nhỏ)
- **Tên gốc:** `toggle_003.ogg` (trong bộ *Interface Sounds*)
- **Tác giả:** Kenney (https://kenney.nl)
- **URL nguồn:** https://opengameart.org/content/interface-sounds
- **File tải:** https://opengameart.org/sites/default/files/kenney_interfaceSounds.zip
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Nhân đôi tiếng tách nhựa 0.14 s thành hai tiếng cách nhau 0.26 s (tiếng sau nhỏ hơn 0.8 lần), lọc thông cao `highpass=f=150`, chuẩn hoá `loudnorm=I=-19:TP=-3`, mono, MP3 64 kbps.

### 14. `door-hatch.mp3` (Tiếng mở nắp khoang khí kim loại nặng)
- **Tên gốc:** `metal_open_01.ogg` + `metal_sheet_03.ogg` (trong bộ *100 CC0 metal and wood SFX*)
- **Tác giả:** rubberduck
- **URL nguồn:** https://opengameart.org/content/100-cc0-metal-and-wood-sfx
- **File tải:** https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip
- **Giấy phép:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Xử lý:** Trộn tiếng khoá kim loại nhả (`metal_open_01.ogg`) với tiếng tấm thép rung (`metal_sheet_03.ogg`) trễ 0.12 s, lọc dải `highpass=f=45, lowpass=f=6000`, fade-out 0.2 s cuối, chuẩn hoá `loudnorm=I=-17:TP=-2`, mono, MP3 80 kbps.
