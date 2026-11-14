# assets/audio

Âm thanh cho game. Cả hai file đều **CC0 (public domain)** — dùng thương mại tự do, không bắt buộc ghi công.

| File | Thời lượng | Dung lượng | Nguồn |
|---|---|---|---|
| `ambient.mp3` | 2:00 | ~1.2 MB | "Cathedral in the forest (ambient loop)" — congusbongus |
| `click.mp3` | 0.15 s | ~2.5 KB | "Interface Sounds" (`glass_002.ogg`) — Kenney |

## Nguồn gốc chi tiết

**ambient.mp3**
- Trang gốc: https://opengameart.org/content/cathedral-in-the-forest-ambient-loop
- File tải: https://opengameart.org/sites/default/files/forest_2_0.ogg
- Tác giả: congusbongus
- Giấy phép: CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- Mô tả gốc: "Seamless ambient loop, for space or dark games. Pads and bells."
- Xử lý: cắt còn 120 s, nối vòng lặp bằng crossfade equal-power 2 s (thay vì fade-in/fade-out
  tuần tự, vốn tạo khoảng lặng 4 s mỗi vòng), chuẩn hoá loudnorm I=-22 LUFS / TP=-3 dBTP,
  mono, MP3 80 kbps.

**click.mp3**
- Trang gốc: https://opengameart.org/content/interface-sounds
- File tải: https://opengameart.org/sites/default/files/kenney_interfaceSounds.zip → `Audio/glass_002.ogg`
- Tác giả: Kenney (https://kenney.nl) — ghi công không bắt buộc
- Giấy phép: CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- Xử lý: cắt còn 1 blip ~55 ms (sóng ~1984 Hz, decay hàm mũ), thêm 2 ms silent attack
  và 25 ms đuôi lặng để encoder không cắt mất transient, đỉnh -6 dBFS, mono, MP3 96 kbps.

## Dựng lại

```bash
python scripts/build_audio.py <thư-mục-chứa-file-nguồn>
```

Script cần `ffmpeg` và `numpy`. Thư mục nguồn phải có `forest_2.ogg` và
`kenney/Audio/glass_002.ogg` (tải từ hai link phía trên).

## Ghi chú kỹ thuật

- **Vòng lặp**: `audio.js` đặt `musicEl.loop = true`, nên file phải nối liền mạch. Crossfade
  2 s ở điểm nối làm mẫu cuối chuyển sang mẫu đầu như một bước sóng bình thường, không có
  tiếng "cụp" và không bị hụt âm lượng ở mỗi vòng.
- **Mức âm lượng**: -22 LUFS là mức nhạc nền, đủ chìm dưới giọng đọc và hiệu ứng. Không tăng
  thêm khi xem trên loa điện thoại — người chơi chỉnh bằng thanh volume trong Settings.
- **Định dạng**: MP3 mono. Nhạc nền không gian một kênh là đủ và tiết kiệm một nửa dung lượng
  so với stereo.
