/* ============================================================
   fullscreen.js
   Chế độ toàn màn hình. Hoạt động như F11 nhưng do nút trong
   bảng cài đặt điều khiển, và có phím tắt riêng.

   Trình duyệt chỉ cho phép vào toàn màn hình khi có thao tác của
   người dùng, nên không thể tự bật khi tải trang.
   ============================================================ */

const KEY = 'smdg.fullscreen';

export function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

export function isSupported() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    localStorage.setItem(KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen() {
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    localStorage.setItem(KEY, '0');
    return true;
  } catch {
    return false;
  }
}

export async function toggleFullscreen() {
  return isFullscreen() ? exitFullscreen() : enterFullscreen();
}

/* Gọi hàm này mỗi khi trạng thái đổi, ví dụ để cập nhật nhãn nút. */
export function onFullscreenChange(fn) {
  const handler = () => fn(isFullscreen());
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}

/* Phím F và F11 đều bật tắt được, tránh bắt khi đang gõ chữ. */
export function bindFullscreenHotkey() {
  document.addEventListener('keydown', (e) => {
    const typing = document.activeElement?.tagName === 'INPUT' ||
                   document.activeElement?.tagName === 'TEXTAREA';
    if (typing) return;
    if (e.key === 'F' || e.key === 'f') {
      e.preventDefault();
      toggleFullscreen();
    }
  });
}
