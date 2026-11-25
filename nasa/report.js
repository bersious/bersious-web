/* ============================================================
   report.js
   Nút Báo lỗi: mở sẵn thư soạn tới hộp thư của nhóm làm game.

   Vì sao không chỉ đặt một thẻ <a href="mailto:..."> cứng trong HTML:
   thư báo lỗi chỉ hữu ích khi người nhận biết lỗi xảy ra ở đâu, trên
   máy nào, phiên bản nào. Người chơi không có nghĩa vụ gõ mấy thông
   tin đó, nên phần mềm tự điền giúp vào phần thân thư.

   Thông tin tự điền, tất cả đều công khai và không định danh:
   - phiên bản game và số hiệu bản dựng
   - trình duyệt và hệ điều hành (chuỗi user agent)
   - kích thước cửa sổ, tỉ lệ điểm ảnh
   - ngôn ngữ giao diện đang chọn
   - thời điểm bấm nút
   Không đọc cookie, không đọc lịch sử, không đọc tên người chơi, không
   gửi gì lên mạng. Toàn bộ nội dung chỉ nằm trong thư do người chơi tự
   bấm Gửi, nên họ đọc lại và sửa được trước khi gửi.
   ============================================================ */

import { getLang } from './i18n.js';

/* Đổi địa chỉ ở đúng một chỗ này. */
export const REPORT_EMAIL = '25521290@gm.uit.edu';

const SUBJECT = {
  vi: '[ABANDONN] Báo lỗi',
  en: '[ABANDONN] Bug report',
};

const BODY_INTRO = {
  vi:
    'Mô tả lỗi:\n' +
    '(bạn viết giúp mình chuyện gì đã xảy ra, đang ở màn nào, và lỗi hiện ra thế nào)\n\n' +
    'Các bước để gặp lại lỗi:\n' +
    '1. \n' +
    '2. \n' +
    '3. \n\n' +
    '------------------------------\n' +
    'Thông tin tự điền, bạn không cần sửa:\n',
  en:
    'What went wrong:\n' +
    '(please describe what happened, which screen you were on, and how the bug looked)\n\n' +
    'Steps to reproduce:\n' +
    '1. \n' +
    '2. \n' +
    '3. \n\n' +
    '------------------------------\n' +
    'Filled in automatically, no need to edit:\n',
};

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

/* Mốc thời gian dạng đọc được, kèm múi giờ của máy người chơi, vì lỗi
   hiển thị thường phụ thuộc vào đúng thời điểm. */
function stamp(d) {
  const off = -d.getTimezoneOffset() / 60;
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
    ' UTC' + sign + (Number.isInteger(abs) ? abs : abs.toFixed(1))
  );
}

function versionText() {
  const el = document.querySelector('.menu-version, #menu-version, .boot-version');
  const t = el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  return t || 'không đọc được';
}

/* Gom thông tin máy thành danh sách dòng chữ thuần. */
export function buildDiagnostics() {
  const out = [];
  out.push('Phien ban: ' + versionText());
  out.push('Dia chi: ' + location.href);
  out.push('Thoi diem: ' + stamp(new Date()));
  out.push('Trinh duyet: ' + navigator.userAgent);
  out.push('Ngon ngu giao dien: ' + getLang());
  out.push('Ngon ngu trinh duyet: ' + (navigator.language || 'không rõ'));
  out.push(
    'Cua so: ' + window.innerWidth + 'x' + window.innerHeight +
    ' @' + (window.devicePixelRatio || 1) + 'x'
  );
  out.push('Man hinh: ' + screen.width + 'x' + screen.height);
  out.push('Nen tang: ' + (navigator.platform || 'không rõ'));
  return out;
}

/* Dựng đường dẫn mailto hoàn chỉnh. Tách riêng để test được mà không
   cần mở ứng dụng thư. */
export function buildReportUrl() {
  const lang = getLang() === 'en' ? 'en' : 'vi';
  const subject = SUBJECT[lang];
  const body = BODY_INTRO[lang] + buildDiagnostics().join('\n') + '\n';
  return (
    'mailto:' + REPORT_EMAIL +
    '?subject=' + encodeURIComponent(subject) +
    '&body=' + encodeURIComponent(body)
  );
}

/* Gắn hành vi cho mọi phần tử có data-report. Dùng uỷ quyền sự kiện ở
   cấp tài liệu để nút nào được thêm sau này cũng chạy, không phải gọi
   lại hàm này. */
export function bindReportButtons() {
  if (window.__reportBound) return;
  window.__reportBound = true;

  const go = (ev) => {
    const el = ev.target.closest('[data-report]');
    if (!el) return;
    ev.preventDefault();
    /* Địa chỉ dựng lại mỗi lần bấm, để mốc thời gian và kích thước cửa
       sổ phản ánh đúng lúc người chơi gặp lỗi, không phải lúc tải trang. */
    el.setAttribute('href', buildReportUrl());
    window.location.href = el.getAttribute('href');
  };

  document.addEventListener('click', go);
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const el = ev.target.closest && ev.target.closest('[data-report]');
    if (!el) return;
    ev.preventDefault();
    el.setAttribute('href', buildReportUrl());
    window.location.href = el.getAttribute('href');
  });
}

/* Cập nhật href ngay khi gắn, để rê chuột qua nút là trình duyệt hiện
   địa chỉ đúng ở thanh trạng thái. */
export function refreshReportHrefs() {
  const url = buildReportUrl();
  document.querySelectorAll('[data-report]').forEach((el) => {
    el.setAttribute('href', url);
  });
}
