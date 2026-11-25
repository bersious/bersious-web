/* ============================================================
   phase2-endings-bridge.js
   Cầu nối giữa phase2/phase2-engine.js và màn kết thúc thua.

   Vì sao cần một file riêng thay vì sửa phase2-app.js: engine phát
   sự kiện 'mission:failed' qua cả subscribe() lẫn một window
   CustomEvent cùng tên. Window event là cửa công khai, không phụ
   thuộc vào việc app có subscribe hay chưa, và không bắt ai phải sửa
   file giao diện Giai đoạn 2.

   Nhiệm vụ:
     - nghe 'mission:failed'
     - ánh xạ failReason sang id cảnh kết thúc
     - dựng extra là delta-v, khối lượng, chi phí để màn kết thúc hiện
     - gọi showEnding() với ba handler thật (chơi lại, chọn mốc, mới)
   ============================================================ */

import { showEnding, ENDING_SPECS, isEndingOpen } from './endings.js';
import { hasSave, loadGame, applySave, clearSave, getSaveInfo } from './save-game.js';
import { getLang } from './i18n.js';

const BASE = new URL('.', import.meta.url).href;

/* Bốn kiểu thua của Giai đoạn 2, đúng theo id cảnh kết thúc. */
export const PHASE2_FAIL_REASONS = ['orbit_miss', 'comms_lost', 'edl_crash', 'mutiny'];

/* Ánh xạ lý do thua sang id cảnh. Giữ thành bảng để một lý do mới
   thêm vào engine không âm thầm rơi vào cảnh sai. */
const REASON_TO_ENDING = {
  orbit_miss: 'orbit_miss',
  comms_lost: 'comms_lost',
  edl_crash: 'edl_crash',
  mutiny: 'mutiny',
  /* Tên cũ hoặc cách gọi khác mà engine có thể dùng. */
  delta_v_short: 'orbit_miss',
  comms_margin_low: 'comms_lost',
  edl_incompatible: 'edl_crash',
  beacon_missing: 'edl_crash',
};

export function endingIdForFailReason(reason) {
  return REASON_TO_ENDING[reason] || 'orbit_miss';
}

/* Có cảnh kết thúc nào thuộc Giai đoạn 2 không. Dùng cho bảng test và
   cho cầu nối khác muốn kiểm nhanh. */
export function isPhase2Ending(id) {
  const spec = ENDING_SPECS.find((s) => s.id === id);
  return !!(spec && spec.phase === 2);
}

/* ------------------------------------------------------------
   Dựng bộ chỉ số phụ từ detail của engine.
   Màn kết thúc Giai đoạn 2 hiện delta-v, khối lượng, chi phí. Ba con
   số đó nằm trong detail.totals khi engine phát sự kiện; nếu vì lý do
   nào thiếu thì vẫn hiện được phần còn lại thay vì ô trống.
   ------------------------------------------------------------ */

export function buildExtra(detail, state) {
  const d = detail || {};
  const totals = d.totals || {};
  const st = state || {};

  const pickNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  return {
    deltaVMs: pickNum(
      d.deltaVAvailableMs,
      totals.deltaVAvailableMs,
      st.totals && st.totals.deltaVAvailableMs,
    ),
    massKg: pickNum(
      d.massKg,
      totals.massKg,
      st.totals && st.totals.massKg,
    ),
    costMusd: pickNum(
      d.costMusd,
      totals.costMusd,
      st.totals && st.totals.costMusd,
    ),
    /* Giữ thêm vài trường để bảng test và báo cáo đọc được. */
    deltaVNeededMs: pickNum(totals.deltaVNeededMs, st.totals && st.totals.deltaVNeededMs),
    shortfallMs: pickNum(d.shortfallMs),
    marginDb: pickNum(d.marginDb),
    conflictCount: pickNum(d.conflictCount),
    delayMinutes: pickNum(d.delayMinutes, totals.delayMinutes),
    daysToArrival: pickNum(totals.daysToArrival, st.totals && st.totals.daysToArrival),
  };
}

/* ------------------------------------------------------------
   Hành động của ba nút

   Cả ba đều phải làm việc thật, không chỉ đóng màn:
     1. chơi lại từ điểm lưu: đọc bản lưu, đổ về chín khoá, dựng lại
        Giai đoạn 2 từ đúng ngày đã lưu
     2. chọn mốc khác: mở danh sách trong màn kết thúc. Hệ thống lưu
        hiện chỉ giữ một bản ghi nên danh sách có một mục.
     3. bắt đầu mới: xoá bản lưu rồi về màn khởi động
   ------------------------------------------------------------ */

/* Mở lại Giai đoạn 2 sau khi đã applySave().
   Không import phase2-app.js trực tiếp: nó nặng và chỉ tồn tại trong
   thư mục phase2/. Nạp động để cầu nối này không làm hỏng Giai đoạn 1
   khi phase2/ chưa deploy. */
async function remountPhase2(host) {
  const candidates = [
    BASE + '../phase2/phase2-app.js',
    BASE + 'phase2/phase2-app.js',
  ];
  for (const url of candidates) {
    try {
      const mod = await import(url);
      if (mod && typeof mod.mountPhase2 === 'function') {
        const api = await mod.mountPhase2({ container: host });
        return api;
      }
    } catch (err) {
      /* thử đường dẫn kế tiếp */
    }
  }
  return null;
}

/* Dọn mọi lớp phủ đang mở trước khi dựng lại màn, nếu không hai màn
   chồng nhau và bấm không được. */
function clearScreens() {
  document.querySelectorAll(
    '.p2-host, .base-host, .rescue-host, .flight-host, .comms-host,'
    + ' .story-root, .prologue-root, .intro-overlay, .beacon-root,'
    + ' .ending-root'
  ).forEach((el) => el.remove());
}

/* Về màn khởi động: hiện lại khối #boot và bỏ dấu đã bấm Bắt đầu. */
function backToBoot() {
  clearScreens();
  const boot = document.getElementById('boot');
  if (boot) boot.style.display = '';
  const start = document.getElementById('start');
  if (start) delete start.dataset.started;
  /* Báo cho phần còn lại của app biết đã về màn đầu, để nút Tiếp tục
     tự cập nhật trạng thái bản lưu. */
  try {
    window.dispatchEvent(new CustomEvent('smdg:back-to-boot'));
  } catch { /* trình duyệt không dựng được CustomEvent thì thôi */ }
}

/* ------------------------------------------------------------
   Ba handler, tạo mỗi lần mở màn để bắt đúng trạng thái bản lưu
   ------------------------------------------------------------ */

function makeHandlers() {
  return {
    onRetry() {
      const save = loadGame();
      if (!save) return;
      applySave(save);
      clearScreens();

      /* Bản lưu ghi phase; nếu là 'base' thì về màn căn cứ Giai đoạn 1,
         nếu không thì mở lại Giai đoạn 2. Đọc getSaveInfo() sau
         applySave để lấy ngày và phase đã khôi phục. */
      const info = getSaveInfo();

      if (info && info.phase === 'base') {
        /* Người chơi chết ở Giai đoạn 1: về đúng ngày đã lưu bằng cách
           để base.js đọc takePendingClock() vừa được applySave nạp. */
        const boot = document.getElementById('boot');
        if (boot) boot.style.display = 'none';
        if (typeof window.__devJump === 'function') {
          window.__devJump('base', { day: info.day || 1 });
        } else {
          backToBoot();
        }
        return;
      }

      /* Giai đoạn 2: dựng lại khung và mount lại app từ bản lưu. */
      const boot = document.getElementById('boot');
      if (boot) boot.style.display = 'none';
      const host = document.createElement('div');
      host.className = 'p2-host';
      document.body.appendChild(host);
      remountPhase2(host).then((api) => {
        if (!api) {
          /* Không nạp được Giai đoạn 2 thì về màn đầu thay vì để
             người chơi nhìn khung trống. */
          host.remove();
          backToBoot();
        }
      }).catch(() => {
        host.remove();
        backToBoot();
      });
    },

    /* Chọn mốc khác: màn kết thúc tự mở danh sách bên trong nó và gọi
       lại onRetry() khi người chơi chọn. Handler này chỉ để dành cho
       nơi khác cần mở danh sách từ ngoài. */
    onLoadSlot() {
      const info = getSaveInfo();
      if (!info) return;
      /* Không có nhiều mốc để chọn, nên chọn mốc duy nhất là quay lại
         nó. Đây là hành vi đúng, không phải nút rỗng. */
      handlers.onRetry();
    },

    onRestart() {
      clearSave();
      backToBoot();
      /* Tải lại trang để mọi module khởi tạo lại từ đầu. Đây là đường
         duy nhất chắc chắn không còn trạng thái cũ trong bộ nhớ. */
      try {
        window.location.reload();
      } catch {
        backToBoot();
      }
    },
  };
}

let handlers = null;

/* ------------------------------------------------------------
   Nghe sự kiện
   ------------------------------------------------------------ */

let installed = false;
let lastFailDetail = null;

/**
 * Cài cầu nối. Gọi một lần lúc khởi động; gọi lại thì không làm gì.
 * @param {{onShow?: Function}} [opts]
 * @returns {() => void} hàm tháo
 */
export function installPhase2EndingsBridge(opts) {
  if (installed) return () => {};
  if (typeof window === 'undefined') return () => {};
  installed = true;

  const onFailed = (ev) => {
    const detail = (ev && ev.detail) || {};

    /* Engine phát cùng MỘT object detail qua hai kênh (subscribe và
       window CustomEvent). So sánh tham chiếu object là cách duy nhất
       chắc chắn: khoá theo lý do cộng thời điểm sẽ chặn nhầm lần thua
       thứ hai trong cùng mili giây (bảng test bắn liền nhau), còn so
       theo nội dung thì phát lại một lần thua cũ cũng bị chặn oan. */
    if (detail && detail === lastFailDetail) return;
    lastFailDetail = detail || null;

    /* Màn kết thúc đã mở thì không mở chồng. isEndingOpen() tự đối
       chiếu DOM nên không bị kẹt khi lớp phủ cũ đã bị gỡ bằng tay. */
    if (isEndingOpen()) return;

    const id = endingIdForFailReason(detail.reason);
    handlers = makeHandlers();

    /* Đọc bản lưu thật để nút chơi lại sáng hay mờ đúng sự thật. */
    let info = null;
    let ok = false;
    try {
      ok = hasSave();
      info = ok ? getSaveInfo() : null;
    } catch (err) {
      ok = false;
      info = null;
    }

    /* Đọc chỉ số sinh tồn THẬT của Giai đoạn 1 từ localStorage.
       Trước đây chỗ này truyền object rỗng nên màn kết thúc luôn hiện
       "chưa qua ngày nào" và mọi thanh phần trăm về 0, dù người chơi
       đã sống mấy chục Sol và cạn nước thật. hab-stats.js ghi vào
       smdg.stats, đúng khoá dưới đây. */
    let liveStats = {};
    try {
      const raw = localStorage.getItem('smdg.stats');
      if (raw) liveStats = JSON.parse(raw) || {};
    } catch (err) {
      liveStats = {};
    }

    showEnding({
      id,
      stats: liveStats,
      extra: buildExtra(detail, window.MARS_RESCUE_SHARED_STATE || null),
      hasSave: ok,
      saveInfo: info,
      onRetry: handlers.onRetry,
      onLoadSlot: handlers.onLoadSlot,
      onRestart: handlers.onRestart,
    });

    if (typeof opts === 'object' && opts && typeof opts.onShow === 'function') {
      try { opts.onShow(id, detail); } catch (err) { console.error('[p2-bridge] onShow lỗi', err); }
    }
  };

  window.addEventListener('mission:failed', onFailed);

  return () => {
    window.removeEventListener('mission:failed', onFailed);
    installed = false;
    lastFailDetail = null;
  };
}

/* Cho bảng test và cho nơi khác biết ngôn ngữ đang bật, tránh import
   vòng khi chỉ cần đọc một chuỗi. */
export function bridgeLang() {
  return getLang() === 'en' ? 'en' : 'vi';
}
