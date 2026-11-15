# Nhạc nền cho màn mở đầu

Thư mục này chờ bốn file nhạc. Bỏ file vào đúng tên là game tự dùng, không phải
sửa một dòng code nào.

## Bốn chỗ chờ sẵn

| Tên file | Phát ở nhịp | Nên là nhạc gì | Âm lượng tự đặt |
|---|---|---|---|
| `theme-open.mp3` | 1 tới 3 | Vào chuyện. Không khí Sao Hỏa, có thể u ám, chậm, gợi điều sắp xảy ra. Đây là nhịp bão cát toàn cảnh và đội chạy. | 0,42 |
| `theme-storm.mp3` | 4 tới 6 | Dồn dập. Lúc phát hiện nguy hiểm, vấp ngã, té sập. Nhịp nhanh hơn, có sức ép, có thể thêm trống dồn. | 0,56 |
| `theme-silence.mp3` | 7 tới 8 | Gần như im. Nhân vật bị cát vùi, rồi góc nhìn từ trên xuống thấy tàu. Nên là tiếng nền rất mỏng, gợi khoảng lặng trước cú nổ. | 0,20 |
| `theme-hope.mp3` | 9 tới 11 | Hồi lên. Tàu cất cánh, bay ra khỏi Sao Hỏa, rồi nhân vật mở mắt. Có thể buồn nhưng có tia hy vọng. | 0,50 |

Nhịp 12 không có nhạc. Đó là cảnh tĩnh lặng cuối, cố ý để trống.

## Định dạng

- MP3 hoặc M4A. Nếu là định dạng khác (wav, ogg) thì đổi tên trong `prologue.js`
  phần `MUSIC_CUES`, cột `file`.
- Nên dài 20 giây trở lên, vì file sẽ được lặp (`loop`) cho tới khi hết nhịp.
- Tốt nhất là nhạc không có tiếng người, không có lời.
- Tự chuẩn hoá âm lượng thì càng tốt: mở bằng Audacity hoặc ffmpeg, đưa mức trung
  bình về khoảng -16 dB, giống các file hiệu ứng khác trong dự án.

## Cách hoạt động

Nhạc tự cắt khi chuyển nhịp, có fade vào và fade ra để không bị giật. Nếu người
chơi tắt nhạc trong cài đặt thì prologue không phát nhạc. Nếu người chơi bấm Bỏ
qua giữa chừng thì nhạc tắt có fade trong 0,7 giây, không bị cụt.

File nào chưa có thì bỏ qua êm, không báo lỗi, không chặn luồng chơi. Bỏ dần từng
file cũng được, không cần đủ cả bốn.

## Nếu muốn đổi nhịp nào dùng nhạc nào

Mở `src/prologue.js`, tìm khối `MUSIC_CUES`, sửa `from` và `to`:

```js
const MUSIC_CUES = [
  { file: 'theme-open.mp3',    from: 1,  to: 3,  gain: 0.42, fadeMs: 1200 },
  ...
];
```

`from` và `to` là số nhịp, tính cả hai đầu. `gain` là hệ số nhân với âm lượng
chung trong cài đặt. `fadeMs` là thời gian fade vào, tính bằng mili giây.
