/* ============================================================
   save-game.js
   Một bản lưu duy nhất cho toàn bộ tiến trình.

   Trước file này, mỗi module tự giữ một khoá localStorage riêng:
   tên người chơi, cờ qua Giai đoạn 1, chỉ số sinh tồn, nông trại,
   thám hiểm, cài đặt, ngôn ngữ, toàn màn hình, kết quả chuyến bay.
   Chín khoá rời rạc như vậy không có mốc thời gian chung, không biết
   lần lưu gần nhất là khi nào, và không xoá sạch được trong một lần.

   Ở đây gom cả chín khoá vào MỘT bản ghi dưới khoá 'smdg.save', kèm
   savedAt, version và reason. Các module cũ vẫn đọc khoá riêng của
   chúng như trước, nên không phải sửa module nào: applySave() đổ
   ngược bản lưu về đúng chín khoá ấy.

   Quy ước: mọi lệnh localStorage đều bọc try/catch. Trình duyệt ở
   chế độ riêng tư, hoặc khi người dùng chặn cookie trang, sẽ ném
   lỗi ngay ở lệnh đọc đầu tiên. Ghi hỏng thì saveGame trả false để
   nơi gọi báo cho người chơi biết, không im lặng nuốt lỗi.
   ============================================================ */

import { t } from './i18n.js';

const SAVE_KEY = 'smdg.save';
const SAVE_VERSION = 1;

/* Chín khoá cũ, giữ nguyên tên. Thứ tự không quan trọng, nhưng để
   theo đúng thứ tự tài liệu cho dễ đối chiếu. */
export const SAVE_KEYS = [
  'smdg.playerName',
  'smdg.stage1Done',
  'smdg.stats',
  'smdg.explore',
  'smdg.farm',
  'smdg.settings',
  'smdg.lang',
  'smdg.fullscreen',
  'smdg.lastFlight',
];

/* Ba khoá là lựa chọn của người chơi chứ không phải tiến trình.
   Khi khôi phục, nếu máy đã có giá trị thì giữ nguyên giá trị đó:
   người chơi vừa đổi ngôn ngữ hay âm lượng mà mở lại bản lưu cũ thì
   không được kéo lựa chọn của họ về như cũ. */
const PREF_KEYS = ['smdg.settings', 'smdg.lang', 'smdg.fullscreen'];

const MINUTE_PER_DAY = 1440;
const AUTOSAVE_DELAY = 800;

/* ---------- đọc ghi an toàn ---------- */

function readKey(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeKey(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function byteLength(str) {
  try {
    return new TextEncoder().encode(str).length;
  } catch {
    /* Trình duyệt cũ không có TextEncoder, đếm theo ký tự là đủ để
       hiện cỡ cho người chơi xem. */
    return str.length;
  }
}

/* ---------- ngày trong game ----------
   Chỉ số sinh tồn giữ tổng số phút game đã trôi (totalMinutes), nên
   ngày và giờ trong ngày đều suy ra được từ đó mà không phải lưu thêm
   biến đếm riêng. */

function clockFromStatsRaw(raw) {
  if (typeof raw !== 'string' || !raw) return { day: 1, minutes: 8 * 60 };
  try {
    const d = JSON.parse(raw);
    const total = Number(d && d.stats && d.stats.totalMinutes);
    if (!Number.isFinite(total) || total < 0) return { day: 1, minutes: 8 * 60 };
    const whole = Math.floor(total);
    return {
      day: Math.floor(whole / MINUTE_PER_DAY) + 1,
      minutes: whole % MINUTE_PER_DAY,
    };
  } catch {
    return { day: 1, minutes: 8 * 60 };
  }
}

function dayFromStatsRaw(raw) {
  return clockFromStatsRaw(raw).day;
}

export function currentDay() {
  return dayFromStatsRaw(readKey('smdg.stats'));
}

/* Giờ/ngày suy từ chỉ số đang lưu, dùng khi không có bản lưu để khôi
   phục nhưng chỉ số đã ở một ngày nào đó. Không có hàm này thì màn căn
   cứ mở lại ở ngày 1 trong khi chỉ số đã ở ngày 6, và dòng "đã sống
   sót" hiện sai so với bản lưu.
   Chỉ số không biết lúc đó mấy giờ, nên giờ trong ngày lấy mốc 08:00
   của ngày hôm đó. */
export function clockFromStats() {
  return clockFromStatsRaw(readKey('smdg.stats'));
}

/* ---------- đồng hồ đang chạy ----------
   Đồng hồ game không tự lưu, nên lúc lưu ta ghi kèm giờ/ngày hiện tại
   vào meta. Nhờ vậy khôi phục xong là đúng giờ cũ, không nhảy về 08:00
   ngày 1 trong khi các chỉ số đã ở ngày 5. */

let liveClock = null;

export function noteClock(state) {
  if (!state) return;
  const day = Number(state.day);
  const minutes = Number(state.minutes);
  if (!Number.isFinite(day) || !Number.isFinite(minutes)) return;
  liveClock = { day: Math.max(1, Math.round(day)), minutes: Math.min(MINUTE_PER_DAY - 1, Math.max(0, Math.round(minutes))) };
}

/* Giờ/ngày đọc được từ lần khôi phục gần nhất. startBase() lấy một
   lần rồi xoá, để lần mở màn căn cứ sau không dùng lại số cũ. */
let pendingClock = null;

export function takePendingClock() {
  const v = pendingClock;
  pendingClock = null;
  return v;
}

/* ============================================================
   LƯU
   ============================================================ */

/* Cờ chặn ghi sau khi người chơi bấm xoá tiến trình.
   Trong khoảng từ lúc xoá tới lúc trang tải lại, đồng hồ màn căn cứ
   vẫn chạy và vẫn gọi stats.save() với saveGame(): nếu không chặn,
   khoá 'smdg.stats' và bản lưu sống lại ngay sau khi vừa xoá. Cờ này
   chỉ bật một chiều, không tắt lại, vì sau đó trang được nạp mới. */
let muted = false;

/**
 * Gom chín khoá hiện có vào một bản ghi.
 * @returns {boolean} true nếu ghi được, false nếu trình duyệt chặn
 *   hoặc đang trong trạng thái vừa xoá tiến trình.
 */
export function saveGame({ reason = 'manual' } = {}) {
  if (muted) return false;

  const data = {};
  for (const key of SAVE_KEYS) {
    const v = readKey(key);
    if (v !== null) data[key] = v;
  }

  /* Mốc giờ cho bản lưu.
     Ngày lấy theo totalMinutes của chỉ số vì đó là con số tích luỹ
     thật; đồng hồ chỉ giữ giờ trong ngày và có thể đã dừng từ lâu.
     Nếu vì lý do nào đó đồng hồ đang chạy ở ngày xa hơn (người chơi
     vừa ngủ nhiều lần), lấy ngày lớn hơn để không ghi lùi tiến trình.
     Giờ trong ngày thì lấy theo đồng hồ đang chạy, vì chỉ số không
     biết lúc đó là mấy giờ. */
  const statsClock = clockFromStatsRaw(data['smdg.stats']);
  const meta = liveClock
    ? { day: Math.max(liveClock.day, statsClock.day), minutes: liveClock.minutes }
    : statsClock;

  const record = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    reason: String(reason || 'manual'),
    meta,
    data,
  };

  let json;
  try {
    json = JSON.stringify(record);
  } catch {
    return false;
  }
  return writeKey(SAVE_KEY, json);
}

/* ============================================================
   ĐỌC
   ============================================================ */

/**
 * Đọc bản lưu. Dữ liệu hỏng, JSON lỗi hay version lệch đều trả null
 * chứ không ném lỗi: người chơi không bao giờ thấy màn hình trắng chỉ
 * vì một khoá localStorage bị ghi dở.
 */
export function loadGame() {
  const raw = readKey(SAVE_KEY);
  if (!raw) return null;

  let rec;
  try {
    rec = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return null;
  if (Number(rec.version) !== SAVE_VERSION) return null;
  if (!rec.data || typeof rec.data !== 'object' || Array.isArray(rec.data)) return null;
  if (typeof rec.savedAt !== 'string' || Number.isNaN(Date.parse(rec.savedAt))) return null;

  return rec;
}

/**
 * Đổ bản lưu về đúng chín khoá cũ để các module hiện có đọc được y
 * như trước. Ba khoá lựa chọn (cài đặt, ngôn ngữ, toàn màn hình) chỉ
 * được ghi khi máy chưa có giá trị, để không đè lên thứ người chơi
 * vừa đổi.
 *
 * @returns {boolean} true nếu mọi khoá ghi được.
 */
export function applySave(save) {
  if (!save || typeof save !== 'object' || !save.data) return false;

  let ok = true;
  for (const key of SAVE_KEYS) {
    const value = save.data[key];
    if (typeof value !== 'string') continue;
    if (PREF_KEYS.includes(key) && readKey(key) !== null) continue;
    if (!writeKey(key, value)) ok = false;
  }

  /* Giữ lại giờ/ngày để màn căn cứ mở đúng chỗ. */
  const m = save.meta;
  if (m && Number.isFinite(Number(m.day)) && Number.isFinite(Number(m.minutes))) {
    pendingClock = {
      day: Math.max(1, Math.round(Number(m.day))),
      minutes: Math.min(MINUTE_PER_DAY - 1, Math.max(0, Math.round(Number(m.minutes)))),
    };
  } else {
    pendingClock = clockFromStatsRaw(save.data['smdg.stats']);
  }
  liveClock = { ...pendingClock };

  return ok;
}

/** Xoá bản lưu lẫn chín khoá cũ, rồi chặn mọi lần ghi sau đó. */
export function clearSave() {
  muted = true;
  removeKey(SAVE_KEY);
  for (const key of SAVE_KEYS) removeKey(key);
  liveClock = null;
  pendingClock = null;
  return true;
}

export function hasSave() {
  return loadGame() !== null;
}

/**
 * Thông tin ngắn để hiện trong bảng cài đặt.
 * @returns {{savedAt:string, playerName:string, day:number, phase:string, sizeKb:number, reason:string}|null}
 */
export function getSaveInfo() {
  const rec = loadGame();
  if (!rec) return null;

  const data = rec.data;
  const playerName = typeof data['smdg.playerName'] === 'string' ? data['smdg.playerName'] : '';

  /* Ngày trong game lấy theo chỉ số, không theo meta: meta chỉ là ảnh
     chụp đồng hồ lúc lưu và có thể thấp hơn nếu đồng hồ bị dựng lại.
     Chỉ số là con số tích luỹ nên luôn đúng chiều tăng. */
  const statsClock = clockFromStatsRaw(data['smdg.stats']);
  const metaDay = Number(rec.meta && rec.meta.day);
  const day = Math.max(
    statsClock.day,
    Number.isFinite(metaDay) && metaDay > 0 ? Math.round(metaDay) : 1,
  );

  /* Thứ tự kiểm quan trọng: còn cờ lastFlight nghĩa là đã bay xong,
     nên phải xét trước cờ qua Giai đoạn 1. */
  let phase = 'comms';
  if (data['smdg.lastFlight']) phase = 'flight';
  else if (data['smdg.stage1Done'] === '1') phase = 'base';

  let raw = '';
  try {
    raw = JSON.stringify(rec);
  } catch {
    raw = '';
  }
  const sizeKb = Math.round((byteLength(raw) / 1024) * 10) / 10;

  return { savedAt: rec.savedAt, playerName, day, phase, sizeKb, reason: rec.reason || 'auto' };
}

/* ============================================================
   TỰ ĐỘNG LƯU
   Sự kiện dồn dập (bấm qua ba lượt truyện trong một giây) không
   được ghi localStorage ba lần. Gom lại, chỉ ghi lần cuối sau khi
   yên 800ms.
   ============================================================ */

let autoTimer = null;

export function autoSave() {
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    autoTimer = null;
    saveGame({ reason: 'auto' });
  }, AUTOSAVE_DELAY);
}

/* ---------- theo dõi mốc trong DOM ----------
   Màn truyện và màn viễn thông do sub-agent khác giữ, không sửa vào
   được. Nhưng cả hai đều ghi trạng thái ra DOM: màn truyện đặt
   data-beat, màn viễn thông bật/tắt thuộc tính hidden trên từng
   bước. Theo dõi những thay đổi đó là cách bám mốc mà không phải
   sửa file của người khác. */

let watchersOn = false;
let lastBeat = null;
let lastStep = null;
let lastBase = null;
let lastChild = null;

function hasBaseHost() {
  return !!document.querySelector('.base-host');
}

function hasChildScreen() {
  return !!document.querySelector('.farm-overlay, .exp-screen, .craft-screen, .radio-screen');
}

function scanMilestones() {
  const story = document.querySelector('.story-screen');
  const beat = story ? (story.dataset.beat || '') : null;
  if (beat !== lastBeat) {
    lastBeat = beat;
    if (beat !== null) autoSave();
  }

  const stepEl = document.querySelector('.comms-step.is-active');
  const step = stepEl ? (stepEl.dataset.step || '') : null;
  if (step !== lastStep) {
    lastStep = step;
    if (step !== null) autoSave();
  }

  const base = hasBaseHost();
  if (base !== lastBase) {
    lastBase = base;
    if (base) autoSave();
  }

  /* Mở hay đóng màn con đều đáng lưu: đóng xong là người chơi vừa
     thu hoạch hoặc vừa nhặt được đồ. */
  const child = hasChildScreen();
  if (child !== lastChild) {
    lastChild = child;
    autoSave();
  }
}

export function initSaveWatchers() {
  if (watchersOn || typeof document === 'undefined' || !document.body) return () => {};
  watchersOn = true;

  lastBeat = null;
  lastStep = null;
  lastBase = hasBaseHost();
  lastChild = hasChildScreen();

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    /* Gộp mọi thay đổi trong cùng một nhịp thành một lần quét.
       Không dùng requestAnimationFrame: trình duyệt hoãn khung hình
       khi tab bị ẩn, nên chuyển tab đi rồi quay lại sẽ mất mốc. */
    setTimeout(() => {
      queued = false;
      scanMilestones();
    }, 60);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    /* Chỉ hai thuộc tính này đổi khi có mốc mới: truyện ghi data-beat,
       viễn thông bật tắt hidden trên từng bước. Không theo dõi class
       vì đồng hồ và thanh chỉ số đổi class liên tục, theo dõi sẽ sinh
       ra một lượt quét mỗi khung hình mà không có mốc nào mới. */
    attributeFilter: ['data-beat', 'hidden'],
  });

  return () => {
    observer.disconnect();
    watchersOn = false;
  };
}

/* Theo dõi mốc ngay khi module được nạp, không đợi tới màn căn cứ.
   index.html nạp base.js (và qua đó nạp file này) ở đầu chương trình,
   trước cả màn truyện, nên các mốc "qua một lượt truyện" và "qua một
   bước viễn thông" vẫn được bắt. startBase() gọi lại lần nữa, hàm
   thoát ngay vì đã bật rồi. */
if (typeof document !== 'undefined') {
  if (document.body) {
    initSaveWatchers();
  } else {
    document.addEventListener('DOMContentLoaded', () => initSaveWatchers(), { once: true });
  }
}

/* ---------- mốc theo đồng hồ game ----------
   Đồng hồ gọi listener mỗi khung hình, 60 lần một giây. Chỉ lưu khi
   kim nhảy sang giờ mới hoặc sang ngày mới: ở tốc độ 1x đó là 30
   giây một lần, đủ dày để mất điện không mất quá một giờ game, mà
   không ghi localStorage 60 lần một giây. */

export function bindClockAutoSave(clock) {
  if (!clock || typeof clock.onTick !== 'function') return () => {};

  let lastHour = null;
  let lastDay = null;

  const off = clock.onTick((s) => {
    if (!s) return;
    noteClock(s);

    if (lastHour === null) {
      lastHour = s.day * 24 + s.hh;
      lastDay = s.day;
      return;
    }
    if (s.day !== lastDay) {
      lastDay = s.day;
      lastHour = s.day * 24 + s.hh;
      autoSave();
      return;
    }
    const hour = s.day * 24 + s.hh;
    if (hour !== lastHour) {
      lastHour = hour;
      autoSave();
    }
  });

  return typeof off === 'function' ? off : () => {};
}

/* ============================================================
   CHIP THÔNG BÁO
   Chỉ hiện khi người chơi chủ động bấm lưu. Tự động lưu thì im
   lặng, nếu không mỗi 30 giây lại có một chip nhảy ra và người chơi
   sẽ học cách bỏ qua nó, tới lúc lưu hỏng thật thì cũng bỏ qua luôn.
   ============================================================ */

const CHIP_HOLD = 1600;
const CHIP_FADE = 260;

let chipEl = null;
let chipTimer = null;
let chipHideTimer = null;

const ICON_DISK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3"/><path d="M8 21v-7h8v7"/>
</svg>`;

const ICON_WARN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/>
</svg>`;

function ensureChipCss() {
  if (document.querySelector('link[data-save-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('.', import.meta.url).href + 'css/save-game.css';
  link.dataset.saveCss = '1';
  document.head.appendChild(link);
}

function ensureChip() {
  /* Tìm trong DOM trước, không chỉ dựa vào biến module: nếu module
     này bị nạp hai lần (đường dẫn có query khác nhau, hoặc trình
     duyệt tải lại một phần), mỗi bản sẽ giữ một biến riêng và màn
     hình sẽ có hai chip chồng nhau. Dùng lại phần tử đã có là cách
     duy nhất đúng trong cả hai trường hợp. */
  if (chipEl && chipEl.isConnected) return chipEl;

  const existing = document.querySelector('.save-chip');
  if (existing) {
    chipEl = existing;
    return chipEl;
  }

  ensureChipCss();
  chipEl = document.createElement('div');
  chipEl.className = 'save-chip';
  chipEl.setAttribute('role', 'status');
  chipEl.setAttribute('aria-live', 'polite');
  chipEl.hidden = true;
  document.body.appendChild(chipEl);
  return chipEl;
}

/**
 * Hiện chip "Đã lưu · Ngày n" trong 1,6 giây.
 * @param {{ok?:boolean, day?:number}} opts ok=false thì hiện cảnh báo
 *   trình duyệt đang chặn ghi.
 */
export function showSaveChip({ ok = true, day = null } = {}) {
  if (typeof document === 'undefined' || !document.body) return;

  const el = ensureChip();
  const n = Number.isFinite(Number(day)) && Number(day) > 0
    ? Math.round(Number(day))
    : currentDay();

  if (ok) {
    el.className = 'save-chip is-ok';
    el.innerHTML = `<span class="save-chip-icon" aria-hidden="true">${ICON_DISK}</span>
      <span class="save-chip-text"></span>`;
    el.querySelector('.save-chip-text').textContent =
      t('save.chip.saved').replace('{n}', String(n));
  } else {
    el.className = 'save-chip is-fail';
    el.innerHTML = `<span class="save-chip-icon" aria-hidden="true">${ICON_WARN}</span>
      <span class="save-chip-text"></span>`;
    el.querySelector('.save-chip-text').textContent = t('save.chip.failed');
  }

  clearTimeout(chipTimer);
  clearTimeout(chipHideTimer);
  el.hidden = false;
  el.classList.remove('is-leaving');
  /* Đọc offsetHeight để trình duyệt kịp dựng phần tử trước khi thêm
     lớp hiện, nếu không hiệu ứng chuyển tiếp bị bỏ qua. */
  void el.offsetHeight;
  el.classList.add('is-visible');

  chipTimer = setTimeout(() => {
    el.classList.add('is-leaving');
    el.classList.remove('is-visible');
    chipHideTimer = setTimeout(() => {
      el.hidden = true;
      el.classList.remove('is-leaving');
    }, CHIP_FADE);
  }, CHIP_HOLD);
}

/** Lưu thủ công: ghi rồi báo bằng chip, kèm cảnh báo nếu ghi hỏng. */
export function saveNow({ reason = 'manual', day = null } = {}) {
  const ok = saveGame({ reason });
  const d = Number.isFinite(Number(day)) && Number(day) > 0 ? Number(day) : currentDay();
  showSaveChip({ ok, day: d });
  return ok;
}

export { ICON_DISK };
