/* ============================================================
   probe-quest.js
   Chuỗi tìm ra xác tàu thăm dò rồi sửa để phát tín hiệu.

   Mạch truyện, theo đúng ý người dùng:
     Ngày 6 tới 7  người chơi sống sót được vài ngày, bắt đầu thấy
                  bất lực. Sáng ngủ dậy thì nhớ ra: sứ mệnh trước có
                  một tàu thăm dò bị bỏ hoang ngoài đồng bằng. Trong
                  phim The Martian, đó là Pathfinder, và Watney đào
                  nó lên để lấy máy phát liên lạc.
     Ngày 7 tới 9  phải ra đó, đào lên, thay pin và linh kiện.
                  Không đủ vật liệu thì phải đi thám hiểm nhặt thêm.
     Ngày 9        sửa xong mới phát được tín hiệu, đúng như bảng
                  giai đoạn 1 mô tả.

   Module này chỉ giữ trạng thái và quyết định mở khoá. Phần giao
   diện của màn sửa nằm ở repair.js.
   ============================================================ */

import { t } from './i18n.js';

const KEY = 'smdg.probeQuest';

/* Ngày mở thông báo nhớ ra xác tàu. Ngày 6 là lúc người chơi đã qua
   đủ vài ngày sinh tồn để thấy bất lực, nhưng chưa quá muộn để làm
   gì đó. */
export const PROBE_NOTICE_DAY = 6;

/* Ngày sớm nhất có thể phát tín hiệu. Cho ba ngày để ra đồng bằng,
   đào, thay pin, hàn mạch, căn chảo. */
export const EARLIEST_TRANSMIT_DAY = 9;

const DEFAULT_STATE = {
  /* Đã nghe thấy thông báo nhớ ra xác tàu chưa */
  noticed: false,
  /* Ngày nghe thông báo, để hiện trong nhật ký */
  noticedDay: 0,
  /* Đã ra tận nơi và đào được máy phát chưa */
  excavated: false,
  excavatedDay: 0,
};

export function loadQuest() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...d };
  } catch { return { ...DEFAULT_STATE }; }
}

export function saveQuest(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* chặn ghi thì bỏ qua */ }
}

export function resetQuest() {
  try { localStorage.removeItem(KEY); } catch { /* bỏ qua */ }
}

/* Gọi mỗi khi đồng hồ sang ngày mới hoặc khi ngủ dậy. Trả về một
   trong các mã sau để bên ngoài quyết định hiện gì:
     'notice'      vừa tới ngày 6 và chưa từng nghe thông báo
     'excavate'    đã nghe thông báo, chưa ra đào, và đủ ngày để đi
     null          không có gì mới
*/
export function tickQuest(state, day) {
  if (!state.noticed && day >= PROBE_NOTICE_DAY) {
    state.noticed = true;
    state.noticedDay = day;
    saveQuest(state);
    return 'notice';
  }
  if (state.noticed && !state.excavated) {
    return 'excavate';
  }
  return null;
}

export function markExcavated(state, day) {
  state.excavated = true;
  state.excavatedDay = day;
  saveQuest(state);
  return state;
}

/* Đã đủ điều kiện vào màn sửa chính thức chưa: phải tìm ra xác tàu
   trước đã, vì không có máy phát thì sửa cái gì. */
export function canOpenRepair(state = loadQuest()) {
  return !!state.excavated;
}

/* Còn bao nhiêu ngày nữa mới được phát, tính từ ngày hiện tại. */
export function daysUntilTransmit(day) {
  return Math.max(0, EARLIEST_TRANSMIT_DAY - day);
}

/* Câu thông báo khi ngủ dậy và nhớ ra xác tàu. Viết như người kể lại
   chuyện của chính mình, không phải thông báo hệ thống. */
export function noticeLines() {
  return [
    t('probe.notice.1'),
    t('probe.notice.2'),
    t('probe.notice.3'),
  ];
}

/* ---------- khung giao diện thông báo ---------- */

const BASE_URL = new URL('.', import.meta.url).href;

export function showProbeNotice({ onGo, onLater } = {}) {
  injectCss();
  const host = document.createElement('div');
  host.className = 'probe-root';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-labelledby', 'probe-title');

  host.innerHTML = `
    <div class="probe-scrim"></div>
    <div class="probe-panel">
      <div class="probe-art" aria-hidden="true">
        <div class="probe-art-glow"></div>
        <div class="probe-art-body">
          <div class="probe-art-dish"></div>
          <div class="probe-art-base"></div>
        </div>
      </div>
      <div class="probe-body">
        <p class="probe-kicker mono">${t('probe.kicker')}</p>
        <h2 class="probe-title" id="probe-title">${t('probe.title')}</h2>
        ${noticeLines().map((l) => `<p class="probe-line">${l}</p>`).join('')}
        <p class="probe-need">${t('probe.need')}</p>
        <div class="probe-acts">
          <button type="button" class="probe-go">${t('probe.go')}</button>
          <button type="button" class="probe-later">${t('probe.later')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(host);

  const close = () => host.remove();
  host.querySelector('.probe-later').addEventListener('click', () => {
    close();
    if (typeof onLater === 'function') onLater();
  });
  host.querySelector('.probe-go').addEventListener('click', () => {
    close();
    if (typeof onGo === 'function') onGo();
  });
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  return { destroy() { document.removeEventListener('keydown', onKey); host.remove(); } };
}

function injectCss() {
  if (document.querySelector('link[data-probe-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/probe.css';
  link.dataset.probeCss = '1';
  document.head.appendChild(link);
}
