/* ============================================================
   audio.js
   Nhạc nền và hiệu ứng âm thanh.

   Trình duyệt chặn phát âm thanh trước khi người dùng bấm gì đó,
   nên nhạc chỉ thật sự nổi lên sau lần bấm đầu tiên. Đây là quy
   định của trình duyệt, không phải lỗi.

   File nằm trong src/assets/audio/:
     ambient.mp3   nhạc nền, lặp vô hạn
     click.mp3     tiếng bấm, phát ngắn, không lặp
   ============================================================ */

import { getSettings, onSettingsChange } from './settings.js';

/* Lấy base từ URL của chính file module này, KHÔNG dùng location.href.
   location.href khi trang ở /nasa mà không có dấu chéo cuối sẽ cho ra
   gốc site (https://site/), làm mọi đường dẫn audio thành
   https://site/assets/... và 404. import.meta.url luôn trỏ đúng vào
   file này nên new URL('.', ...) luôn ra đúng thư mục chứa nó. */
const BASE = new URL('.', import.meta.url).href;

const SRC = {
  music: BASE + 'assets/audio/ambient.mp3',
  click: BASE + 'assets/audio/click.mp3',
};

let musicEl = null;
let clickEl = null;
let unlocked = false;
let lastClick = 0;

/* Trả về trạng thái đã mở khoá âm thanh sau tương tác đầu của người dùng. */
export function isAudioUnlocked() {
  return unlocked;
}

/* Đăng ký bắt lần tương tác đầu tiên để mở khoá âm thanh. */
export function initAudio() {
  if (!musicEl) {
    musicEl = new Audio(SRC.music);
    musicEl.loop = true;
    musicEl.preload = 'none';
    musicEl.volume = vol();
  }
  if (!clickEl) {
    clickEl = new Audio(SRC.click);
    clickEl.preload = 'auto';
    clickEl.volume = Math.min(1, vol() * 0.9);
  }

  const unlock = () => {
    unlocked = true;
    sync();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  onSettingsChange(sync);
  sync();
}

function vol() {
  const v = getSettings().volume;
  return Math.max(0, Math.min(100, v)) / 100;
}

/* Áp cài đặt hiện tại lên các phần tử âm thanh. */
export function sync() {
  if (!musicEl) return;
  const s = getSettings();

  musicEl.volume = vol() * musicScale;
  if (clickEl) clickEl.volume = Math.min(1, vol() * 0.9);

  const wantMusic = s.music && unlocked;
  if (wantMusic && musicEl.paused) {
    musicEl.play().catch(() => { /* trình duyệt từ chối, sẽ thử lại lần sau */ });
  } else if (!wantMusic && !musicEl.paused) {
    musicEl.pause();
  }
}

/* Gọi ở mỗi lần bấm nút hợp lệ. Chặn phát dồn khi bấm nhanh. */
export function playClick() {
  const s = getSettings();
  if (!s.sfx || !clickEl || !unlocked) return;
  const now = performance.now();
  if (now - lastClick < 60) return;   // 60ms, tránh chồng tiếng
  lastClick = now;
  try {
    clickEl.currentTime = 0;
    clickEl.play().catch(() => {});
  } catch { /* bỏ qua */ }
}

/* Hạ nhạc nền xuống một phần của âm lượng hiện tại, dùng khi mở màn
   kết thúc thua: tiếng báo tử phải nghe rõ, nhạc không được đè lên.
   Trả về hàm khôi phục mức cũ, để nơi gọi gọi khi đóng màn.

   Vì sao đặt ở đây chứ không ở endings.js: chỉ audio.js được giữ phần
   tử nhạc nền. Tạo một Audio mới ở file khác là hai luồng nhạc chồng
   nhau, và lần sau sync() lại kéo âm lượng về mức cũ giữa lúc màn kết
   thúc đang mở. */
let musicScale = 1;

export function clampMusicVolume(scale) {
  const s = Number(scale);
  if (!Number.isFinite(s) || s < 0 || s > 1) return () => {};
  const prev = musicScale;
  musicScale = s;
  if (musicEl) musicEl.volume = vol() * musicScale;
  return () => {
    musicScale = prev;
    if (musicEl) musicEl.volume = vol() * musicScale;
  };
}

/* Gắn tiếng bấm cho mọi nút trong một vùng. */
export function bindClickSounds(root = document) {
  root.querySelectorAll('button, .story-btn, .settings-tab').forEach((btn) => {
    if (btn.dataset.clickBound) return;
    btn.dataset.clickBound = '1';
    btn.addEventListener('click', playClick);
  });
}
