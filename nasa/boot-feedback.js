/* ============================================================
   boot-feedback.js
   Phản hồi nhìn thấy được, tức thì, khi người chơi bấm Bắt đầu.

   VÌ SAO CẦN FILE NÀY
   Bấm Bắt đầu trước đây dẫn thẳng vào đoạn phim mở đầu rồi mười hai
   khung truyện tranh. Suốt gần bốn mươi giây đó màn hình không có
   dấu hiệu nào cho biết game đã nhận cú bấm, nên người chấm tưởng
   game đơ và bấm lại nhiều lần. Yêu cầu đặt ra: trong 100ms phải
   thấy phản hồi.

   CÁCH LÀM
   Không giành quyền điều khiển nút với menu-cinematic.js. Module đó
   đã lo phần hoạt cảnh phóng tàu, cờ khoá chống bấm hai lần, và đổi
   chữ trên nút. File này chỉ QUAN SÁT nút và bổ sung đúng ba thứ còn
   thiếu, theo thứ tự ưu tiên:
     1. ép chữ trên nút thành "Đang chuẩn bị..." khi nút vào trạng
        thái đang tải, để câu chữ khớp với yêu cầu
     2. phủ một lớp mờ tối lên màn menu, báo đang chuyển cảnh
     3. giữ nút ở trạng thái khoá suốt thời gian chờ

   Vì sao quan sát bằng MutationObserver chứ không gắn listener
   click: menu-cinematic.js gắn listener của nó trong initMenu(), có
   thể chạy trước hoặc sau file này tuỳ thứ tự nạp. Quan sát thuộc
   tính data-loading trên chính nút thì không phụ thuộc thứ tự, và
   vẫn bắt được cả trường hợp nút bị khoá bằng đường khác.

   Không có phụ thuộc cứng vào file nào khác: thiếu nút thì module
   im lặng thoát, không ném lỗi, không chặn màn khởi động.
   ============================================================ */

import { t, onLangChange } from './i18n.js';

const PENDING_KEY = 'app.start.pending';

/* CSS tự tiêm. Đặt ở đây chứ không ở index.html vì màn menu đang được
   dựng lại song song ở file khác; một module tự mang kiểu của mình
   thì không bị xoá nhầm khi file kia đổi. */
const CSS = `
#boot .boot-pending {
  position: absolute;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  opacity: 0;
  transition: opacity .16s linear;
  background: radial-gradient(ellipse at center,
    rgba(6, 9, 14, .54) 0%, rgba(6, 9, 14, .86) 100%);
  backdrop-filter: blur(1.5px);
  -webkit-backdrop-filter: blur(1.5px);
}
#boot .boot-pending.is-on { opacity: 1; }

/* Nút đang chờ: đổi màu nhẹ để mắt thấy ngay là đã nhận cú bấm, và
   con trỏ thành đồng hồ cát. Không đổi kích thước để bố cục khỏi nhảy. */
#boot .mbtn.is-pending,
#boot .btn-start.is-pending,
#boot .mbtn-start:disabled {
  cursor: progress;
}

html.motion-off #boot .boot-pending { transition: none; }
`;

function injectCss() {
  if (document.getElementById('boot-feedback-css')) return;
  const st = document.createElement('style');
  st.id = 'boot-feedback-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

let overlay = null;
let currentLabel = null;
let savedLabel = null;
let langOff = null;
let installed = false;
/* Trạng thái đã áp lần trước. Chốt chống lặp vô hạn: nếu không giữ
   cờ này, mỗi lần module thêm class is-pending là observer lại bắn,
   lại thêm class, và vòng đó khoá cứng luồng chính khiến cả trang
   đứng hình. */
let applied = false;

/* Tìm phần tử mang chữ trên nút. Menu mới bọc chữ trong .mbtn-label;
   bản cũ để chữ trực tiếp trong nút. Nhận cả hai kiểu. */
function labelNode(btn) {
  if (!btn) return null;
  return btn.querySelector('.mbtn-label')
    || btn.querySelector('.btn-start-label')
    || btn;
}

function ensureOverlay(boot) {
  if (overlay && overlay.isConnected) return overlay;
  if (!boot) return null;
  overlay = document.createElement('div');
  overlay.className = 'boot-pending';
  overlay.setAttribute('aria-hidden', 'true');
  boot.appendChild(overlay);
  return overlay;
}

/* Đổi chữ sang câu "đang chuẩn bị". Giữ câu gốc để trả lại đúng chữ
   khi luồng thất bại và nút phải bấm được lần nữa. */
function paintPending(label) {
  if (!label) return;
  if (savedLabel === null) {
    savedLabel = label.dataset.idle || label.textContent || '';
    if (!label.dataset.idle) label.dataset.idle = savedLabel;
  }
  const want = t(PENDING_KEY);
  if (label.textContent !== want) label.textContent = want;
}

function restoreLabel(label) {
  if (!label || savedLabel === null) return;
  label.textContent = label.dataset.idle || savedLabel;
  savedLabel = null;
}

function setPending(on) {
  if (!currentLabel) return;
  /* Chỉ làm việc khi trạng thái ĐỔI. Đây là chốt chống lặp: hàm này
     thêm class lên chính nút mà observer đang theo dõi. */
  if (applied === !!on) return;
  applied = !!on;

  const boot = document.getElementById('boot');
  const ov = ensureOverlay(boot);

  if (on) {
    paintPending(currentLabel);
    if (ov) ov.classList.add('is-on');
    currentLabel.classList.add('is-pending');
    const btn = currentLabel.closest('button') || document.getElementById('start');
    if (btn) btn.classList.add('is-pending');
  } else {
    if (ov) ov.classList.remove('is-on');
    currentLabel.classList.remove('is-pending');
    const btn = currentLabel.closest('button') || document.getElementById('start');
    if (btn) btn.classList.remove('is-pending');
    /* Chỉ trả chữ khi nút đã thật sự hết trạng thái tải. Nếu còn
       data-loading thì để menu-cinematic.js tự trả, tránh hai bên
       ghi đè nhau giữa hai khung hình. */
    const b = labelNode(btn);
    if (b && (!btn || btn.dataset.loading !== '1')) restoreLabel(b);
  }
}

/* Đọc trạng thái hiện tại của nút và áp phản hồi tương ứng. */
function sync() {
  const btn = document.getElementById('start');
  if (!btn) return;
  const label = labelNode(btn);
  if (!label) return;
  currentLabel = label;

  const busy = btn.dataset.loading === '1' || btn.disabled === true;
  setPending(!!busy);
}

export function installBootFeedback() {
  if (installed) return { ready: true };
  const btn = document.getElementById('start');
  if (!btn) return { ready: false };

  installed = true;
  injectCss();
  currentLabel = labelNode(btn);
  applied = false;
  savedLabel = null;

  /* Theo dõi HAI thuộc tính quyết định trạng thái: data-loading do
     menu-cinematic.js bật/tắt, và disabled do bất kỳ bên nào đặt.
     Tuyệt đối KHÔNG theo dõi `class`: setPending() tự thêm class
     is-pending lên chính nút này, thêm `class` vào đây là tự bắn vào
     mình thành vòng lặp vô hạn làm đứng cả trang. */
  const obs = new MutationObserver(() => {
    try { sync(); } catch (e) { console.warn('[boot-feedback] đồng bộ lỗi', e); }
  });
  obs.observe(btn, { attributes: true, attributeFilter: ['data-loading', 'disabled'] });

  /* Bắt cú bấm sớm nhất: đọc lại trạng thái ở microtask, tức ngay sau
     khi mọi handler đồng bộ của sự kiện click đã chạy xong. Không
     chặn cú bấm của ai. */
  btn.addEventListener('click', () => {
    queueMicrotask(() => { try { sync(); } catch (e) { /* observer lo */ } });
  }, true);

  /* Đổi ngôn ngữ giữa lúc chờ thì câu "đang chuẩn bị" phải đổi theo,
     không để nửa Việt nửa Anh trên cùng một nút. */
  langOff = onLangChange(() => {
    const b = document.getElementById('start');
    if (!b || !currentLabel) return;
    if (b.dataset.loading === '1' || b.disabled) paintPending(currentLabel);
  });

  return {
    ready: true,
    /* Cho nơi khác gọi tay khi cần, ví dụ lúc thử lại sau lỗi. */
    sync,
    destroy() {
      obs.disconnect();
      if (typeof langOff === 'function') langOff();
      langOff = null;
      setPending(false);
      if (overlay) { overlay.remove(); overlay = null; }
      installed = false;
    },
  };
}

export default installBootFeedback;
