/* ============================================================
   base.js
   Màn CĂN CỨ: hiện ra sau khi màn mở đầu kết thúc.

   Kiểu 60 Seconds nhưng tông Mission Control Sao Hoả:
     - thanh trên cùng: tên phi hành gia, đồng hồ ngày/giờ chạy thật
     - lưới thẻ hành động: Nông trại (khoá), Túi đồ, Đi thám hiểm, Đi ngủ
     - chân màn hình: số ngày sống sót, tổng vật phẩm

   File này chỉ logic + dựng DOM. Màu, cỡ, khoảng cách nằm trong
   css/base.css và css/tokens.css.
   ============================================================ */

import { createClock } from './game-time.js';
import { createStats } from './hab-stats.js';
import { createHud } from './hud.js';
import { createCompactHud } from './hud-compact.js';
import { createBaseScene, pickCharState } from './base-scene.js';
import { createClockUi } from './clock-ui.js';
import { t, onLangChange, getLang } from './i18n.js';
import { getSettings } from './settings.js';
import { playClick } from './audio.js';
import { playMemory } from './memories.js';
import {
  loadQuest, tickQuest, markExcavated, canOpenRepair,
  showProbeNotice, daysUntilTransmit, noticeLines,
} from './probe-quest.js';
import { openRepairBay, isAllRepaired, repairedCount, REPAIR_PARTS } from './repair.js';
import { openBeaconScene } from './beacon.js';
import {
  applySave, loadGame, hasSave, saveGame, getSaveInfo, clockFromStats,
  takePendingClock, initSaveWatchers, bindClockAutoSave, showSaveChip,
  clearSave,
} from './save-game.js';
import {
  showEnding, endingIdForCause, isEndingOpen,
} from './endings.js';
import {
  maybeShow, resetTutorials, registerPhase2Hooks,
} from './onboarding.js';
import { recordMissionAction } from './mission-log.js';
import {
  DAY_LOG, IDLE_LINES, SLEEP_LINES, MORNING_LINES, NOTIFY,
} from './base-flavor.js';

/* Nạp CSS bằng đường dẫn tuyệt đối, cùng cơ chế với index.html:
   Vercel có thể phục vụ trang không có dấu / ở cuối, đường dẫn
   tương đối sẽ 404 nên phải dựng URL tuyệt đối từ module. */
const BASE_URL = new URL('.', import.meta.url).href;

function injectCss() {
  if (document.querySelector('link[data-base-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/base.css';
  link.dataset.baseCss = '1';
  document.head.appendChild(link);
}

/* CSS của hệ thống lưu. Nút lưu nằm trong thanh trên của màn căn cứ
   nhưng kiểu dáng thuộc save-game.css, nên file này nạp hộ: quy tắc
   chỉ cho sửa save-game.css nghĩa là mọi thứ liên quan tới lưu phải
   nằm trong đó, không rải sang base.css. */
function injectSaveCss() {
  if (document.querySelector('link[data-save-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/save-game.css';
  link.dataset.saveCss = '1';
  document.head.appendChild(link);
}

/* CSS của sân khấu mới và lớp ghi đè ẩn giao diện cũ. Chỉ nạp khi
   sân khấu mới chạy được, nếu lỗi thì game quay về bản cũ nguyên vẹn. */
function injectNewSceneCss() {
  for (const href of ['css/base-scene.css', 'css/hud-compact.css', 'css/base-new-scene.css']) {
    if (document.querySelector('link[data-new-scene-css="' + href + '"]')) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = BASE_URL + href;
    link.dataset.newSceneCss = href;
    document.head.appendChild(link);
  }
}


/* Ảnh cảnh căn cứ. Mỗi hành động đổi một cảnh để khung hình có
   chuyển động, và ban đêm dùng ảnh khác ban ngày. */
const SCENES = {
  day:   { src: 'assets/art/bg-hab.webp',
           cap: { vi: 'Bên trong trạm Hab, ban ngày', en: 'Inside the Hab module, daylight' } },
  night: { src: 'assets/art/bg-hab.webp',
           cap: { vi: 'Trạm Hab, đêm xuống', en: 'Hab module, night' } },
  farm:  { src: 'assets/art/bg-farm.webp',
           cap: { vi: 'Khu nhà kính trồng khoai', en: 'The greenhouse' } },
  work:  { src: 'assets/art/bg-workbench.webp',
           cap: { vi: 'Bàn chế tạo', en: 'The workbench' } },
  radio: { src: 'assets/art/bg-radio.webp',
           cap: { vi: 'Góc liên lạc', en: 'The comms corner' } },
  air:   { src: 'assets/art/bg-airlock.webp',
           cap: { vi: 'Cửa khí chuyển tiếp', en: 'The airlock' } },
};

function setScene(sceneEl, capEl, key) {
  const sc = SCENES[key] || SCENES.day;
  if (!sceneEl) return;
  const img = sceneEl.querySelector('.base-scene-img');
  const url = BASE_URL + sc.src;
  if (img && img.getAttribute('src') !== url) {
    img.src = url;
    sceneEl.classList.add('is-swap');
    window.setTimeout(() => sceneEl.classList.remove('is-swap'), 380);
  }
  if (capEl) capEl.textContent = sc.cap[getLang()] || sc.cap.vi || '';
}

/* ---------- kho vật phẩm khởi đầu ---------- */

/* Kho hiển thị trong túi đồ. Khởi điểm lấy đúng bộ vật phẩm của
   hab-stats.js để hai nơi không lệch nhau: trước đây túi đồ dùng
   id riêng (toolkit, oxygen, radio) trong khi hệ thống chỉ số dùng
   id khác, nên nhặt được đồ mà túi không hiện.

   family_photo không phải vật tư: bấm vào là mở đoạn hồi tưởng, xem
   ON_USE bên dưới. Đặt qty 1 để không ai hiểu nhầm là dùng được
   nhiều lần như khẩu phần. */
function makeInventory() {
  return [
    { id: 'ration',       qty: 12 },
    { id: 'water_bottle', qty: 14 },
    { id: 'tape',         qty: 4 },
    { id: 'electronics',  qty: 3 },
    { id: 'hydrazine',    qty: 2 },
    { id: 'media',        qty: 2 },
    { id: 'family_photo', qty: 1 },
  ];
}

const ICONS = {
  farm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 21h18"/><path d="M5 21v-8l7-5 7 5v8"/>
    <path d="M9 21v-5h6v5"/><path d="M12 8V4"/><path d="M12 4c1.5 0 2.5-1 2.5-2.5C13 1.5 12 2 12 4z"/>
  </svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="7" width="16" height="13" rx="2"/>
    <path d="M9 7V5a3 3 0 0 1 6 0v2"/><path d="M4 13h16"/>
  </svg>`,
  explore: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 13 13l-4.5 2.5L11 11z"/>
  </svg>`,
  craft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3z"/>
    <path d="M14.7 6.3 17 4a2.8 2.8 0 0 1 4 4l-2.3 2.3"/>
  </svg>`,
  radio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="2"/>
    <path d="M7.8 7.8a6 6 0 0 0 0 8.4"/><path d="M16.2 16.2a6 6 0 0 0 0-8.4"/>
    <path d="M5 5a10 10 0 0 0 0 14"/><path d="M19 19a10 10 0 0 0 0-14"/>
  </svg>`,
  rescue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 2.5c2.6 2.4 4 6 4 10l-8 0c0-4 1.4-7.6 4-10z"/>
    <path d="M8 12.5 5 16v3.5l3-1.4"/><path d="M16 12.5 19 16v3.5l-3-1.4"/>
    <circle cx="12" cy="9" r="1.4"/><path d="M10 18.5 12 22l2-3.5"/>
  </svg>`,
  sleep: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>
  </svg>`,
};


/* Ảnh icon thật do model sinh ra, đã xử lý qua scripts/process-assets.py.
   Dùng ảnh trước, thiếu thì mới rơi về SVG vẽ tay bên dưới. */
const ITEM_IMAGES = {
  ration:        'assets/art/icon-ration.webp',
  water_bottle:  'assets/art/icon-water.webp',
  potato:        'assets/art/icon-potato.webp',
  potato_seed:   'assets/art/icon-seed.webp',
  tape:          'assets/art/icon-tape.webp',
  electronics:   'assets/art/icon-electronics.webp',
  hydrazine:     'assets/art/icon-hydrazine.webp',
  media:         'assets/art/icon-media.webp',
  toolkit:       'assets/art/icon-toolbox.webp',
  battery:       'assets/art/icon-solar.webp',
  cable:         'assets/art/icon-cable.webp',
  filter:        'assets/art/icon-filter.webp',
  solar:         'assets/art/icon-solar.webp',
  family_photo:  'assets/art/icon-family-photo.webp',
};

function itemIcon(id) {
  const img = ITEM_IMAGES[id];
  if (img) {
    /* Không dùng loading="lazy": ảnh nằm trong popup còn ẩn nên
       trình duyệt coi là ngoài khung nhìn và không buồn tải, tới lúc
       mở túi đồ thì hiện ô trống. Icon nhẹ (4 KB mỗi cái) nên tải
       ngay lúc dựng không ảnh hưởng tốc độ. */
    return `<img class="base-item-img" src="${BASE_URL}${img}" alt="" decoding="async">`;
  }
  return ITEM_ICONS[id] || '';
}

const ITEM_ICONS = {
  toolkit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="8" width="18" height="12" rx="2"/>
    <path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M3 13h18"/>
  </svg>`,
  oxygen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="7" y="6" width="10" height="15" rx="4"/>
    <path d="M10 6V3h4v3"/><path d="M10 11h4"/>
  </svg>`,
  ration: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="7" width="16" height="12" rx="2"/>
    <path d="M4 11h16"/><path d="M8 7v12"/>
  </svg>`,
  radio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="9" width="18" height="11" rx="2"/>
    <path d="M7 9 17 4"/><circle cx="8.5" cy="14.5" r="2.5"/><path d="M14 13h4M14 16.5h4"/>
  </svg>`,
  family_photo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/>
    <circle cx="9" cy="10" r="1.7"/><circle cx="15" cy="10" r="1.7"/>
    <path d="M6.5 16c.9-1.7 2.4-2.6 4.3-2.6M13.2 16c.9-1.7 2.4-2.6 4.3-2.6"/>
    <path d="M3.5 4.5 20 19.5" stroke-opacity=".28"/>
  </svg>`,
};

/* ============================================================ */

export function startBase({ container, playerName = '', onExit, onLaunchRescue } = {}) {
  injectCss();
  injectSaveCss();

  const inventory = makeInventory();
  /* Ngày bắt đầu lúc 08:00 chứ không phải 06:00. Màn căn cứ mở ra khi
     người chơi đã thức, nên nếu để 06:00 thì lần ngủ đầu chỉ nhảy được
     một tiếng trong cùng ngày, không sang ngày mới. 08:00 cũng cho
     người chơi một ngày đủ dài trước khi trời tối. */
  /* Ưu tiên giờ/ngày của bản lưu. Không có bản lưu thì vẫn phải đọc
     chỉ số đang lưu: chỉ số tự khôi phục từ localStorage ngay trong
     createStats() bên dưới, nên nếu đồng hồ cứng ở ngày 1 thì màn căn
     cứ hiện "đã sống sót 1 ngày" trong khi chỉ số đã ở ngày 6, và mỗi
     lần qua ngày sẽ lệch thêm. */
  const restoredClock = takePendingClock() || clockFromStats();
  const clock = createClock({
    startMinute: restoredClock.minutes,
    day: restoredClock.day,
  });

  /* Trạng thái chuỗi xác tàu thăm dò. Khai báo sớm vì các handler
     bên dưới dùng tới, không đặt cuối hàm được. */
  const quest = loadQuest();

  /* Bộ chỉ số sinh tồn, tách khỏi giao diện. Chỉ số tự lưu vào
     localStorage nên đóng tab mở lại vẫn còn nguyên tiến độ. */
  const stats = createStats({ clock });

  /* ---------- khung DOM ---------- */

  const el = document.createElement('div');
  el.className = 'base-screen';
  el.innerHTML = `
    <header class="base-topbar">
      <div class="base-who">
        <span class="base-who-label"></span>
        <span class="base-who-name"></span>
      </div>

      <!-- Đồng hồ LCD dựng bằng module riêng, chèn vào đây -->
      <div class="base-clock-slot"></div>

      <div class="base-top-right">
        <span class="base-phase"></span>
      </div>
    </header>

    <main class="base-main">
      <!-- Cảnh căn cứ: ảnh nền lớn cho khung sinh tồn có trọng tâm
           thị giác, thay vì một khoảng đen trống giữa màn hình. -->
      <figure class="base-scene">
        <img class="base-scene-img" alt="" loading="eager" decoding="async">
        <figcaption class="base-scene-cap" aria-live="polite"></figcaption>
      </figure>
      <div class="base-hud-slot"></div>
      <h2 class="base-heading"></h2>
      <section class="base-log" aria-live="polite">
        <span class="base-log-label"></span>
        <p class="base-log-text"></p>
      </section>
      <div class="base-grid" role="group"></div>
    </main>

    <footer class="base-foot">
      <span class="base-idle" aria-live="polite"></span>
      <span class="base-foot-days"></span>
      <span class="base-foot-sep" aria-hidden="true">·</span>
      <span class="base-foot-items"></span>
      <button type="button" class="base-replay" data-action="comms"></button>

      <!-- Nút lưu tay. Đặt ở chân màn hình chứ không ở thanh trên vì
           trên màn hẹp thanh trên chỉ còn hai ô và css/base.css ẩn
           khối bên phải đi; chân màn hình thì hiện đủ ở mọi bề rộng.
           Tự động lưu vẫn chạy nền, nút này để người chơi chủ động
           chắc chắn trước khi đóng tab. -->
      <button type="button" class="base-save" data-action="save">
        <span class="base-save-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3"/><path d="M8 21v-7h8v7"/>
          </svg>
        </span>
        <span class="base-save-label"></span>
      </button>
    </footer>

    <div class="base-toast" role="status" aria-live="polite" hidden></div>

    <div class="base-bag" hidden>
      <div class="base-bag-backdrop" data-bag-close></div>
      <div class="base-bag-panel" role="dialog" aria-modal="true" aria-labelledby="base-bag-title">
        <header class="base-bag-head">
          <h3 id="base-bag-title"></h3>
          <button type="button" class="base-bag-close" data-bag-close aria-label=""></button>
        </header>
        <div class="base-bag-grid"></div>
      </div>
    </div>

    <div class="base-sleep" hidden aria-hidden="true"></div>

    <p class="base-sleep-line" aria-live="polite" hidden></p>
  `;
  container.appendChild(el);

  const q = (sel) => el.querySelector(sel);

  const whoLabel  = q('.base-who-label');
  const whoName   = q('.base-who-name');
  const phase     = q('.base-phase');
  const heading   = q('.base-heading');
  const grid      = q('.base-grid');
  const footDays  = q('.base-foot-days');
  const footItems = q('.base-foot-items');
  const toast     = q('.base-toast');
  const bag       = q('.base-bag');
  const bagTitle  = q('#base-bag-title');
  const bagGrid   = q('.base-bag-grid');
  const bagClose  = q('.base-bag-close');
  const sceneEl   = q('.base-scene');
  const sceneCap  = q('.base-scene-cap');
  const sleepFx   = q('.base-sleep');
  const logLabel  = q('.base-log-label');
  const logText   = q('.base-log-text');
  const idleLine  = q('.base-idle');
  const sleepLine = q('.base-sleep-line');
  const replayBtn = q('.base-replay');
  const saveBtn   = q('.base-save');
  const saveLabel = q('.base-save-label');

  /* ---------- lưới hành động ---------- */

  const ACTIONS = [
    /* locked ở đây chỉ là giá trị khởi điểm. Trạng thái thật lấy từ
       stats.getUnlocks() và phải cập nhật lại mỗi lần chỉ số đổi, nếu
       không thì nút nông trại hiện ổ khoá vĩnh viễn dù đã đủ điều kiện
       mở, người chơi tưởng bị chặn nên không bấm. */
    { id: 'farm',    locked: true },
    { id: 'bag',     locked: false },
    { id: 'explore', locked: false },
    { id: 'craft',   locked: false },
    { id: 'radio',   locked: false },
    { id: 'rescue',  locked: true },
    { id: 'sleep',   locked: false },
  ];

  function buildGrid() {
    grid.innerHTML = '';
    for (const act of ACTIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'base-card' + (act.locked ? ' is-locked' : '');
      btn.dataset.action = act.id;
      /* Ổ khoá luôn có mặt trong DOM, ẩn hiện bằng class. Trước đây nó
         chỉ được chèn lúc dựng nên muốn gỡ khoá phải dựng lại cả lưới. */
      btn.innerHTML = `
        <span class="base-card-icon">${ICONS[act.id]}</span>
        <span class="base-card-name"></span>
        <span class="base-card-desc"></span>
        <span class="base-card-lock" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2"/>
            <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
          </svg></span>`;
      btn.addEventListener('click', () => onAction(act.id));
      grid.appendChild(btn);
    }
    applyTexts();
    refreshLocks();
  }

  /* Cập nhật trạng thái khoá theo điều kiện thật. Gọi sau mỗi lần chỉ số
     hoặc kho đổi, vì nông trại mở khoá khi đã có đủ hạt, nước và băng
     keo. Nếu không gọi lại, nút hiện ổ khoá vĩnh viễn dù bấm vẫn mở
     được, người chơi tưởng bị chặn nên không bấm. */
  function refreshLocks() {
    const u = stats.getUnlocks();
    /* Nút thiết kế tàu cứu hộ chỉ mở SAU khi đã phát được tín hiệu cầu
       cứu. Trước đó không ai biết người chơi còn sống nên chưa có sứ
       mệnh giải cứu nào để thiết kế. Cờ nằm trong localStorage do màn
       viễn thông ghi khi phát xong. */
    let signalSent = false;
    try { signalSent = localStorage.getItem('smdg.stage1Done') === '1'; } catch (e) { /* chặn ghi */ }
    const want = { farm: !!u.farm, rescue: signalSent };
    let changed = false;
    grid.querySelectorAll('.base-card').forEach((btn) => {
      const id = btn.dataset.action;
      if (!(id in want)) return;
      const locked = !want[id];
      const was = btn.classList.contains('is-locked');
      if (was !== locked) changed = true;
      btn.classList.toggle('is-locked', locked);
      btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    });
    /* Chấm việc ở sân khấu cũng phải theo: trước đây refreshLocks chỉ
       chạy một lần lúc dựng lưới, nên phát tín hiệu xong mà không nhảy
       màn thì nút Thiết kế tàu cứu hộ vẫn trông như bị khoá, và chấm
       nhắc ở trạm liên lạc vẫn sáng.

       Chỉ gọi khi trạng thái khoá THẬT SỰ đổi: refresh() của sân khấu
       đọc lại chỉ số và vẽ lại chấm, gọi mỗi nhịp đồng hồ là thừa. */
    if (changed && baseScene && typeof baseScene.refresh === 'function') {
      try { baseScene.refresh(); } catch (err) { /* trang trí, không chặn game */ }
    }
  }

  /* ---------- hành vi từng nút ---------- */

  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => { toast.hidden = true; }, 250);
    }, 2400);
  }

  let sleeping = false;

  /* ---------- câu chữ lấy từ base-flavor.js ----------
     File dữ liệu chứa cả vi và en cho từng câu, nên chỉ cần chọn
     đúng bên theo ngôn ngữ đang dùng. */

  function localized(entry) {
    if (!entry) return '';
    const lang = getLang();
    return entry[lang] || entry.vi || '';
  }

  function pickEntry(list) {
    if (!list || !list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  /* ---------- nhật ký ngày ----------
     DAY_LOG đánh số ngày từ 1 nên chỉ số là (day - 1) % length.
     Quá 24 ngày thì lặp vòng, không thêm dòng mới ở đây. */

  let shownDay = 0;

  function renderDayLog(day) {
    shownDay = day;
    const index = ((day - 1) % DAY_LOG.length + DAY_LOG.length) % DAY_LOG.length;
    logLabel.textContent = t('base.day').replace('{n}', String(day));
    logText.textContent = localized(DAY_LOG[index]);
    setScene(sceneEl, sceneCap, 'day');
  }

  /* ---------- câu hiện khi rảnh ----------
     20 tới 35 giây một lần, đổi dòng riêng phía trên dòng số ngày. */

  let idleTimer = null;
  let idleEntry = null;

  function showIdle() {
    idleEntry = pickEntry(IDLE_LINES);
    if (!idleEntry) return;
    idleLine.textContent = localized(idleEntry);
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    const wait = 20000 + Math.random() * 15000;
    idleTimer = setTimeout(() => { showIdle(); scheduleIdle(); }, wait);
  }

  function stopIdle() {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  function onAction(id) {
    playClick();
    /* Ghi nhận đã mở trạm nào, cho checklist mục tiêu trong nhật ký.
       Hàm tự lọc: chỉ các trạm có mục tiêu tương ứng mới được ghi. */
    try { recordMissionAction(id); } catch (err) { /* không chặn game */ }
    if (id === 'farm') {
      /* Nông trại chỉ mở khi đã đủ điều kiện. Nếu chưa đủ thì nói rõ
         thiếu gì, đừng chỉ nói "chưa mở" chung chung. */
      const u = stats.getUnlocks();
      if (!u.farm) {
        const inv = stats.getInventory();
        const need = [];
        if ((inv.potato_seed || 0) < 1) need.push(t('base.farm.needSeed'));
        if ((inv.water_bottle || 0) < 10) need.push(t('base.farm.needWater'));
        if ((inv.tape || 0) < 2) need.push(t('base.farm.needTape'));
        showToast(t('base.farm.locked') + ' ' + need.join(', '));
        return;
      }
      setScene(sceneEl, sceneCap, 'farm');
    openFarmScreen();
      return;
    }
    if (id === 'explore') {
      openExploreScreen();
      return;
    }
    if (id === 'excavate') {
      /* Đào máy phát khỏi xác tàu. Chỉ mở khi đã tới ngày 6 và đã nghe
         thông báo, để người chơi không mò ra đó từ ngày đầu. */
      if (!quest.noticed) {
        showToast(t('probe.log.noticed'));
        return;
      }
      if (quest.excavated) {
        showToast(t('probe.log.excavated'));
        return;
      }
      markExcavated(quest, clock.state().day);
      sockLog(t('probe.log.excavated'));
      playClick();
      showToast(t('probe.log.excavated'));
      return;
    }
    if (id === 'bag') {
      openBag();
      return;
    }
    if (id === 'sleep') {
      openSleepConfirm();
      return;
    }
    if (id === 'craft') {
      setScene(sceneEl, sceneCap, 'work');
      openCraftScreen();
      return;
    }
    if (id === 'radio') {
      setScene(sceneEl, sceneCap, 'radio');
      /* Chuỗi mở khoá: phải đào được máy phát từ xác tàu thăm dò trước
         đã, rồi sửa ba món, rồi mới phát được tín hiệu. Không có máy
         phát thì cái ăng-ten gãy ngoài kia không nối vào đâu cả. */
      if (!canOpenRepair(quest)) {
        const need = daysUntilTransmit(clock.state().day);
        showToast(need > 0
          ? t('probe.log.noticed')
          : t('probe.need'));
        return;
      }
      if (!isAllRepaired()) {
        openRepairBay({
          stats,
          onDone: () => {
            /* Sửa xong ba món thì mới vào màn phát tín hiệu. */
            showToast(t('repair.done'));
            openTransmitConsole();
          },
          onClose: () => {},
        });
        return;
      }
      openTransmitConsole();
      return;
    }
    if (id === 'rescue') {
      /* Chốt lần nữa ở đây: kể cả nếu lớp khoá bị lỗi hiển thị thì cũng
         không cho nhảy vào xưởng thiết kế trước khi phát tín hiệu. */
      let sent = false;
      try { sent = localStorage.getItem('smdg.stage1Done') === '1'; } catch (e) { /* chặn ghi */ }
      if (!sent) {
        showToast(t('base.rescue.locked'));
        return;
      }
      /* Chuyển sang màn thiết kế tàu cứu hộ ở index.html. base.js không
         import rescue-designer.js để giữ hai màn độc lập; nơi dựng màn
         là index.html và nó biết phải làm gì sau khi thiết kế xong. */
      if (typeof onLaunchRescue === 'function') {
        onLaunchRescue();
      } else {
        showToast(t('base.rescue.disabled'));
      }
      return;
    }
    if (id === 'save') {
      /* Lưu tay: ghi rồi hiện chip. Hàm hiện chip nằm trong
         save-game.js để mọi nơi gọi lưu đều báo cùng một kiểu. */
      const ok = saveGame({ reason: 'manual' });
      showSaveChip({ ok, day: clock.state().day });
      return;
    }
    if (id === 'comms') {
      /* Chơi lại Giai đoạn 1. Phải xoá cờ trước khi mở, nếu không
         index.html thấy cờ còn thì sẽ bỏ qua màn. Việc mở bảng viễn
         thông do index.html lo, ở đây chỉ phát tín hiệu: base.js không
         import comms.js để tránh hai màn phụ thuộc vòng vào nhau. */
      try { localStorage.removeItem('smdg.stage1Done'); } catch (e) { /* chế độ riêng tư chặn ghi */ }
      window.dispatchEvent(new CustomEvent('smdg:comms-replay'));
      return;
    }
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', () => onAction('comms'));
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', () => onAction('save'));
  }

  /* ---------- tự động lưu ----------
     Ba nguồn mốc, cùng gộp qua autoSave() với cửa sổ 800ms:
       1. đồng hồ nhảy sang giờ mới hoặc sang ngày mới
       2. mở/đóng màn con (nông trại, thám hiểm, chế tạo, liên lạc)
       3. vào lại màn căn cứ, và mốc ở màn truyện / màn viễn thông do
          MutationObserver bám qua data-beat và thuộc tính hidden

     Đồng hồ gọi listener 60 lần một giây, nên tuyệt đối không ghi
     localStorage ở đây: ghi mỗi khung hình là giật cả màn hình. */
  const unClockSave = bindClockAutoSave(clock);
  const unWatchers = initSaveWatchers();

  /* Người chơi bấm "Xoá tiến trình" trong cài đặt: dừng đồng hồ và
     ngừng ghi chỉ số NGAY, trước khi settings-ui.js xoá khoá. Không
     có bước này, nhịp đồng hồ kế tiếp ghi lại 'smdg.stats' và tiến
     trình vừa xoá sống dậy ngay giây sau đó. */
  let cleared = false;
  const onClearSave = () => {
    cleared = true;
    clock.stop();
    unTick();
    unClockSave();
    unWatchers();
  };
  window.addEventListener('smdg:clear-save', onClearSave);

  /* Vừa vào căn cứ là một mốc đáng lưu: người chơi có thể đóng tab
     ngay sau khi màn hiện ra. */
  saveGame({ reason: 'auto' });

  /* ---------- màn con: nông trại và thám hiểm ---------- */

  let childScreen = null;

  function openFarmScreen() {
    if (!bag.hidden) closeBag();
    if (childScreen) return;
    closeChild(() => {
      import('./farm.js').then((mod) => {
        childScreen = mod.openFarm({
          container: el,
          clock,
          /* Nước tưới trừ vào nước uống của phi hành gia: farm.js
             không còn bể riêng nào, nên phải đưa đúng đối tượng chỉ
             số sang. Thiếu tham số này là mọi khay bị khoá. */
          stats,
          playerName,
          onClose: () => closeChild(),
          onHarvest: ({ kg, day }) => {
            /* Thu hoạch đổi kg thành số củ, mỗi củ khoảng 250 gam. */
            const qty = Math.max(1, Math.round(kg / 0.25));
            stats.addItems([{ id: 'potato', qty }]);
            stats.save();
            updateFootItems();
            showToast(t('base.farm.harvested')
              .replace('{n}', String(qty))
              .replace('{day}', String(day)));
          },
        });
      });
    });
  }

  function openCraftScreen() {
    /* đóng túi đồ nếu đang mở, vì cả hai đều là lớp phủ toàn màn */
    if (!bag.hidden) closeBag();
    if (childScreen) return;
    closeChild(() => {
      import('./craft.js').then((mod) => {
        childScreen = mod.openCraft({
          container: el,
          stats,
          onClose: () => closeChild(),
          onDone: () => { updateFootItems(); },
        });
      });
    });
  }

  function openRadioScreen() {
    if (!bag.hidden) closeBag();
    if (childScreen) return;
    closeChild(() => {
      import('./radio.js').then((mod) => {
        childScreen = mod.openRadio({
          container: el,
          stats,
          onClose: () => closeChild(),
          onContact: () => { showToast(t('base.radio.contactToast')); },
        });
      });
    });
  }

  /* Màn viễn thông ba bước của Giai đoạn 1 (comms.js) là màn PHÁT tín
     hiệu thật. Trước đây base.js gọi openRadioScreen() ở đây, mà
     radio.js chỉ là khung chat gọi về nhà: nó không ghi smdg.stage1Done,
     nên sửa xong ba món là ngõ cụt, nút Thiết kế tàu cứu hộ khoá vĩnh
     viễn và cả Giai đoạn 1 không có lối ra.

     Bảng viễn thông do index.html dựng (nó giữ openStage1 và biết phải
     mở scene Trái Đất nhận tin sau khi phát xong), nên ở đây chỉ phát
     sự kiện. index.html đã nghe smdg:comms-replay cho đúng việc này;
     dùng lại đúng đường đó thay vì tự dựng một bản sao. */
  function openTransmitConsole() {
    if (!bag.hidden) closeBag();
    closeChild();
    window.dispatchEvent(new CustomEvent('smdg:comms-replay'));
  }

  function openExploreScreen() {
    if (!bag.hidden) closeBag();
    if (childScreen) return;
    closeChild(() => {
      import('./explore.js').then((mod) => {
        childScreen = mod.openExplore({
          container: el,
          clock,
          playerName,
          onClose: () => closeChild(),
          onFind: ({ id, name, qty, quest: isQuest }) => {
            /* Máy phát từ xác tàu thăm dò là vật cốt truyện, nằm trong
               smdg.probeQuest chứ không nằm trong kho. Nhét nó vào kho
               thì túi đồ hiện một món không có trong ITEMS, bấm vào
               không làm gì được. */
            if (isQuest) {
              /* Nạp lại trạng thái quest: explore.js vừa ghi đè
                 smdg.probeQuest, còn biến quest của màn này vẫn là bản
                 cũ nên canOpenRepair() sẽ trả false cho tới lần mở lại. */
              Object.assign(quest, loadQuest());
              sockLog(t('probe.log.excavated'));
              showToast(t('probe.log.excavated'));
              return;
            }
            stats.addItems([{ id, qty }]);
            stats.save();
            updateFootItems();
            showToast(t('base.explore.found')
              .replace('{name}', name || id)
              .replace('{n}', String(qty)));
          },
        });
      });
    });
  }

  function closeChild(then) {
    if (childScreen && typeof childScreen.destroy === 'function') {
      childScreen.destroy();
    }
    childScreen = null;
    if (typeof then === 'function') then();
  }

  /* ---------- túi đồ ---------- */

  function openBag() {
    /* Túi đồ là lớp riêng, không nằm trong childScreen. Nếu đang mở
       màn con khác thì đóng lại trước, tránh hai lớp chồng nhau. */
    if (childScreen) closeChild();
    renderBag();
    bag.hidden = false;
    requestAnimationFrame(() => bag.classList.add('is-open'));
    bagClose.focus();
  }

  function closeBag() {
    bag.classList.remove('is-open');
    setTimeout(() => { bag.hidden = true; }, 180);
  }

  bag.querySelectorAll('[data-bag-close]').forEach((n) =>
    n.addEventListener('click', () => { playClick(); closeBag(); }));

  /* ---------- vật phẩm trong túi ----------

     Bảng dưới đây là nguồn sự thật DUY NHẤT về "bấm vào vật phẩm này
     thì làm gì". Trước đây bảng chỉ có đúng một mục là tấm ảnh gia đình,
     nên tám trên chín ô trong túi hiện ra như ô chết: người chơi bấm
     không có gì xảy ra và tưởng game hỏng.

     Ba nhóm, phân biệt bằng viền và dòng chữ nhỏ dưới tên:
       eat   đồ ăn, đồ uống, đĩa nhạc: bấm là dùng ngay, trừ 1 món
       part  vật liệu chế tạo: bấm mở bảng giải thích, không trừ gì
       story vật phẩm kể chuyện: mở đoạn hồi tưởng

     Hiệu ứng (calo, nước, tinh thần) KHÔNG viết lại ở đây. Mọi con số
     lấy từ hab-stats.js qua stats.useItem(), nên bằng số trong bảng
     ITEMS và trong màn chế tạo, không có hai nguồn lệch nhau. */

  const ITEM_ORDER = [
    'ration', 'water_bottle', 'potato', 'media',
    'tape', 'electronics', 'hydrazine', 'potato_seed', 'family_photo',
  ];

  /* Chỉ số nào đã đầy thì món đó không dùng được nữa. Kiểm trước khi
     gọi useItem, vì useItem vẫn trừ vật phẩm kể cả khi chỉ số đã kịch
     trần: ăn lúc đã no là mất gói khẩu phần mà không được thêm calo. */
  function bagBlockReason(itemId, st) {
    const def = stats.ITEMS && stats.ITEMS[itemId];
    if (!def) return '';
    if (def.calories && st.calories >= 100) return t('base.bag.full.calories');
    if (def.water && st.water >= 100) return t('base.bag.full.water');
    if (def.sanity && st.sanity >= 100) return t('base.bag.full.sanity');
    return '';
  }

  /* Các món ăn, uống, nghe. Mỗi mục: câu toast và câu ghi nhật ký.
     Câu nhật ký để trống ở món không cần ghi. */
  const CONSUMABLES = {
    ration:       { toast: 'base.bag.ate.ration',     log: 'base.bag.log.ration' },
    water_bottle: { toast: 'base.bag.drank.water',    log: '' },
    potato:       { toast: 'base.bag.ate.potato',     log: '' },
    media:        { toast: 'base.bag.played.media',   log: 'base.bag.log.media' },
  };

  /* Công thức nào cần vật liệu này, đọc thẳng từ RECIPES của
     hab-stats.js. Không chép tay danh sách công thức sang đây, vì mai
     kia thêm một công thức mới là bảng chép tay lệch ngay. */
  function recipesUsing(itemId) {
    const out = [];
    const all = (stats.RECIPES) || {};
    for (const [id, r] of Object.entries(all)) {
      if (r && r.cost && r.cost[itemId]) out.push(id);
    }
    return out;
  }

  function useConsumable(itemId) {
    const st = stats.get();
    const blocked = bagBlockReason(itemId, st);
    if (blocked) { showToast(blocked); return; }

    const res = stats.useItem(itemId);
    if (!res || !res.ok) {
      showToast(t('base.bag.none.left'));
      return;
    }
    stats.save();

    const conf = CONSUMABLES[itemId];
    if (conf && conf.toast) showToast(t(conf.toast));
    if (conf && conf.log) sockLog(t(conf.log));

    /* Vẽ lại ngay: số lượng giảm một, và ô biến mất khi về 0. */
    renderBag();
    updateFootItems();
  }

  /* ---------- bảng giải thích vật liệu ----------
     Bấm vào băng keo, linh kiện, hydrazine hay hạt giống thì mở một
     bảng nhỏ giữa màn hình: vật liệu này dùng làm gì, và công thức nào
     đang cần nó. Đóng bằng nút × hoặc phím Esc. */

  let itemNote = null;

  function closeItemNote() {
    if (!itemNote) return;
    document.removeEventListener('keydown', onItemNoteKey, true);
    itemNote.remove();
    itemNote = null;
  }

  function onItemNoteKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      e.stopPropagation();
      closeItemNote();
    }
  }

  function openItemNote(itemId) {
    closeItemNote();

    const wrap = document.createElement('div');
    wrap.className = 'base-note';
    wrap.innerHTML = `
      <div class="base-note-backdrop" data-note-close></div>
      <div class="base-note-panel" role="dialog" aria-modal="true" aria-labelledby="base-note-title">
        <header class="base-note-head">
          <span class="base-note-icon">${itemIcon(itemId)}</span>
          <h4 id="base-note-title"></h4>
          <button type="button" class="base-note-close" data-note-close aria-label=""></button>
        </header>
        <p class="base-note-about"></p>
        <div class="base-note-recipes">
          <p class="base-note-label"></p>
          <ul class="base-note-list"></ul>
        </div>
      </div>`;

    wrap.querySelector('#base-note-title').textContent = t('base.item.' + itemId);
    wrap.querySelector('.base-note-about').textContent = t('base.item.' + itemId + '.about');
    wrap.querySelector('.base-note-close').setAttribute('aria-label', t('base.close'));
    wrap.querySelector('.base-note-label').textContent = t('base.bag.panel.recipes');

    const list = wrap.querySelector('.base-note-list');
    const ids = recipesUsing(itemId);
    if (!ids.length) {
      const li = document.createElement('li');
      li.className = 'is-empty';
      li.textContent = t('base.bag.panel.none');
      list.appendChild(li);
    } else {
      for (const rid of ids) {
        const li = document.createElement('li');
        li.textContent = t('base.craft.' + rid);
        list.appendChild(li);
      }
    }

    wrap.querySelectorAll('[data-note-close]').forEach((n) => {
      n.addEventListener('click', () => { playClick(); closeItemNote(); });
    });

    el.appendChild(wrap);
    itemNote = wrap;
    /* Lắng nghe ở pha capture để phím Esc tới bảng này trước mọi
       listener khác của màn căn cứ. */
    document.addEventListener('keydown', onItemNoteKey, true);
    const close = wrap.querySelector('.base-note-close');
    if (close) close.focus();
  }

  /* Hành động cho từng vật phẩm. Giữ tên ITEM_ACTIONS vì chỗ khác có
     thể đang tham chiếu, nhưng nay phủ đủ mọi món trong ITEMS. */
  const ITEM_ACTIONS = {
    ration:       () => useConsumable('ration'),
    water_bottle: () => useConsumable('water_bottle'),
    potato:       () => useConsumable('potato'),
    media:        () => useConsumable('media'),
    tape:         () => openItemNote('tape'),
    electronics:  () => openItemNote('electronics'),
    hydrazine:    () => openItemNote('hydrazine'),
    potato_seed:  () => openItemNote('potato_seed'),
    family_photo: () => openFamilyMemory(),
  };

  /* Nhóm hiển thị của từng món, quyết định viền và dòng chữ nhỏ. */
  function itemKind(itemId) {
    if (CONSUMABLES[itemId]) return 'use';
    if (itemId === 'family_photo') return 'story';
    const def = stats.ITEMS && stats.ITEMS[itemId];
    if (def && (def.kind === 'part' || def.kind === 'quest')) return 'part';
    return 'part';
  }

  function itemHint(itemId) {
    const kind = itemKind(itemId);
    if (kind === 'use') return t('base.item.' + itemId + '.hint');
    if (itemId === 'family_photo') return t('base.item.family_photo.desc');
    if (itemId === 'potato_seed') return t('base.item.potato_seed.hint');
    return t('base.item.part.hint');
  }

  let memoryScreen = null;

  function openFamilyMemory() {
    if (memoryScreen) return;
    /* Đóng túi đồ trước để hai lớp không tranh nhau bắt cú bấm. */
    closeBag();
    memoryScreen = playMemory({
      container: document.body,
      memoryId: 'family',
      playerName,
      onDone: () => { memoryScreen = null; },
    });
  }

  /* Danh sách vật phẩm đang có, đọc từ kho chỉ số chứ không đọc mảng
     khởi điểm. Đây là chỗ sửa gốc lỗi "dùng xong số lượng không đổi":
     trước đây túi vẽ từ makeInventory() nên luôn hiện đúng bộ số ban
     đầu, dùng hay không dùng cũng vậy. */
  function bagItems() {
    const inv = stats.getInventory() || {};
    const out = [];
    const seen = new Set();

    for (const id of ITEM_ORDER) {
      seen.add(id);
      /* Tấm ảnh không nằm trong kho chỉ số: nó là vật kỷ niệm, dùng
         bao nhiêu lần cũng còn. */
      const qty = id === 'family_photo' ? 1 : (Number(inv[id]) || 0);
      if (qty > 0) out.push({ id, qty });
    }

    /* Vật phẩm phát sinh ngoài danh sách chuẩn (sau này thêm món mới)
       vẫn phải hiện ra, không được im lặng bỏ qua. */
    for (const [id, n] of Object.entries(inv)) {
      const qty = Number(n) || 0;
      if (seen.has(id) || qty <= 0) continue;
      out.push({ id, qty });
    }
    return out;
  }

  function renderBag() {
    bagTitle.textContent = t('base.bag.title');
    bagClose.setAttribute('aria-label', t('base.close'));
    bagGrid.innerHTML = '';

    const items = bagItems();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'base-bag-empty';
      empty.textContent = t('base.bag.empty');
      bagGrid.appendChild(empty);
      return;
    }

    for (const item of items) {
      const act = ITEM_ACTIONS[item.id];
      /* Mọi ô đều là <button>. Ô không có hành động thì không còn tồn
         tại: bảng ITEM_ACTIONS phủ đủ mọi món trong ITEMS, còn món lạ
         thì rơi về bảng giải thích chung. Nhờ vậy không còn ô chết. */
      const fallback = () => {
        if (act) { act(); return; }
        showToast(t('base.item.' + item.id + '.hint') === 'base.item.' + item.id + '.hint'
          ? t('base.bag.none.left')
          : t('base.item.' + item.id + '.hint'));
      };

      const cell = document.createElement('button');
      cell.type = 'button';
      const kind = itemKind(item.id);
      cell.className = 'base-item is-usable is-' + kind;
      cell.dataset.item = item.id;
      cell.setAttribute('aria-label', t('base.item.' + item.id));
      cell.innerHTML = `
        <span class="base-item-icon">${itemIcon(item.id)}</span>
        <span class="base-item-name"></span>
        <span class="base-item-qty">×${item.qty}</span>
        <span class="base-item-hint"></span>`;
      cell.querySelector('.base-item-name').textContent = t('base.item.' + item.id);
      cell.querySelector('.base-item-hint').textContent = itemHint(item.id);
      cell.addEventListener('click', () => { playClick(); fallback(); });
      bagGrid.appendChild(cell);
    }
  }

  /* ---------- đi ngủ ----------
     Trước khi lớp phủ đen hiện lên thì đọc một câu từ SLEEP_LINES,
     sau khi lớp phủ tan thì đọc một câu từ MORNING_LINES. Tắt chuyển
     động thì bỏ phần mờ dần, câu vẫn hiện và vẫn đủ lâu để đọc. */

  let sleepTimers = [];
  let sleepLineTimer = null;
  let sleepEntry = null;

  function later(fn, ms) {
    const id = setTimeout(() => {
      sleepTimers = sleepTimers.filter((x) => x !== id);
      fn();
    }, ms);
    sleepTimers.push(id);
    return id;
  }

  function clearSleepTimers() {
    for (const id of sleepTimers) clearTimeout(id);
    sleepTimers = [];
    clearTimeout(sleepLineTimer);
    sleepLineTimer = null;
  }

  function showSleepText(entry, holdMs) {
    if (!entry) return;
    sleepEntry = entry;
    clearTimeout(sleepLineTimer);
    sleepLine.textContent = localized(entry);
    sleepLine.hidden = false;
    sleepLine.classList.add('is-visible');
    if (holdMs) {
      sleepLineTimer = setTimeout(() => { hideSleepText(); }, holdMs);
    }
  }

  function hideSleepText() {
    sleepEntry = null;
    sleepLine.classList.remove('is-visible');
    sleepLine.hidden = true;
    sleepLine.textContent = '';
  }

  /* Bảng dự báo trước khi ngủ: tính chỉ số lúc 07:00 sáng mai trên
     bản sao, rồi hỏi người chơi xác nhận. Trước đây bấm Đi ngủ là
     ngủ luôn, người chơi chết khát trong lúc ngủ mà không hề hay biết,
     đúng cái GDD gọi là "chết oan". */
  let sleepConfirm = null;

  function openSleepConfirm() {
    if (sleeping || sleepConfirm) return;
    const fc = stats.forecastUntil(7 * 60);
    if (!fc) { doSleep(); return; }

    const ov = document.createElement('div');
    ov.className = 'sleep-confirm';
    ov.innerHTML = `
      <div class="sleep-confirm-panel" role="dialog" aria-modal="true" aria-label="Dự báo sáng mai">
        <h3 class="sleep-confirm-title"></h3>
        <p class="sleep-confirm-sub"></p>
        <div class="sleep-confirm-grid"></div>
        <div class="sleep-confirm-warn" hidden></div>
        <div class="sleep-confirm-actions">
          <button type="button" class="sleep-confirm-yes"></button>
          <button type="button" class="sleep-confirm-no"></button>
        </div>
      </div>`;
    el.appendChild(ov);

    ov.querySelector('.sleep-confirm-title').textContent = t('base.sleep.forecastTitle');
    ov.querySelector('.sleep-confirm-sub').textContent = t('base.sleep.forecastSub');

    /* Dùng đúng key hud.* đã có bản dịch, không tự đặt key mới.
       Kèm mức chênh so với hiện tại để người chơi thấy sẽ mất bao
       nhiêu, thay vì chỉ một con số trần. */
    const now = stats.get();
    const rows = ['power', 'oxygen', 'water', 'calories', 'stamina'];
    const grid = ov.querySelector('.sleep-confirm-grid');
    for (const key of rows) {
      const cell = document.createElement('div');
      cell.className = 'sleep-confirm-cell';
      const v = Math.round(fc[key] ?? 0);
      const cur = Math.round(now[key] ?? 0);
      const delta = v - cur;

      const lab = document.createElement('span');
      lab.className = 'sc-label';
      lab.textContent = t('hud.' + key);

      const val = document.createElement('span');
      val.className = 'sc-val';
      val.textContent = String(v) + '%';

      const dl = document.createElement('span');
      dl.className = 'sc-delta';
      if (delta === 0) dl.textContent = '0';
      else dl.textContent = (delta > 0 ? '+' : '') + delta;
      if (delta < 0) dl.classList.add('is-down');
      else if (delta > 0) dl.classList.add('is-up');

      cell.append(lab, val, dl);
      if (v <= 20) cell.classList.add('is-danger');
      else if (v <= 40) cell.classList.add('is-warn');
      grid.appendChild(cell);
    }

    /* cảnh báo nếu sáng mai chết hoặc thiếu trầm trọng */
    const warn = ov.querySelector('.sleep-confirm-warn');
    if (fc.alive === false) {
      warn.hidden = false;
      warn.textContent = t('base.sleep.forecastDeath');
    } else if ((fc.water ?? 100) <= 15) {
      warn.hidden = false;
      warn.textContent = t('base.sleep.forecastThirsty');
    }

    const yes = ov.querySelector('.sleep-confirm-yes');
    const no = ov.querySelector('.sleep-confirm-no');
    yes.textContent = t('base.sleep.confirmYes');
    no.textContent = t('base.sleep.confirmNo');
    yes.addEventListener('click', () => { ov.remove(); sleepConfirm = null; doSleep(); });
    no.addEventListener('click', () => { ov.remove(); sleepConfirm = null; });
    sleepConfirm = ov;
  }

  function doSleep() {
    if (sleeping) return;
    sleeping = true;
    const motion = getSettings().motion;
    clearSleepTimers();

    const wake = () => {
      clock.sleep();               // nhảy tới 07:00 sáng hôm sau
      sleepFx.classList.remove('is-dark');
      const done = () => {
        sleepFx.hidden = true;
        sleeping = false;
        showSleepText(pickEntry(MORNING_LINES), 2500);
      };
      if (motion) later(done, 900);
      else done();
    };

    const startBlack = () => {
      hideSleepText();
      sleepFx.hidden = false;
      if (motion) requestAnimationFrame(() => sleepFx.classList.add('is-dark'));
      else sleepFx.classList.add('is-dark');
      later(wake, 1000);            // 1 giây tối rồi sáng lại
    };

    showSleepText(pickEntry(SLEEP_LINES));
    /* có chuyển động: đọc câu 1,5 giây rồi mới tối màn.
       tắt chuyển động: lớp phủ hiện ngay, giữ câu đủ lâu để đọc. */
    later(startBlack, motion ? 1500 : 1200);
  }

  /* ---------- đồng hồ ---------- */

  /* Chỉ số sinh tồn phải trôi theo giờ game, nên nối vào nhịp đồng hồ
     thay vì chạy timer riêng. Đếm số phút đã trôi giữa hai lần tick
     để chỉ số luôn khớp với kim đồng hồ. */
  let lastClockMinutes = clock.state().minutes + clock.state().day * 1440;

  /* ---------- theo dõi cái chết ----------
     Đây là chỗ lấp lỗ hổng lớn nhất của Giai đoạn 1: checkDeath() đã
     trả về nguyên nhân chết từ lâu nhưng không ai hiển thị, nên người
     chơi chết mà game vẫn chạy và chỉ số âm dần xuống dưới 0.

     Ba việc phải làm khi chết:
       1. dừng đồng hồ (không cho thời gian trôi tiếp)
       2. khoá mọi nút bấm của màn căn cứ
       3. mở màn kết thúc đúng cảnh

     Hàm dưới đây idempotent: gọi nhiều lần cũng chỉ mở một màn. */

  let dead = false;
  let deathScreen = null;

  function lockBaseUI() {
    /* Khoá bằng class trên khung, CSS lo phần vô hiệu hoá con trỏ và
       độ mờ. Không đặt disabled từng nút vì màn con (nông trại, túi
       đồ) tự dựng nút của nó, khoá từng cái sẽ sót. */
    el.classList.add('is-dead');
    el.setAttribute('aria-busy', 'false');
    /* Dừng mọi hiệu ứng phụ đang chạy, nếu không câu thoại nhàn rỗi
       vẫn nhảy trên màn hình sau khi chết. */
    stopIdle();
    clearSleepTimers();
    if (sleepConfirm) {
      sleepConfirm.remove();
      sleepConfirm = null;
    }
  }

  /* Bộ đếm mất điện riêng. Không đánh giá ngay lần đầu điện về 0 vì
     người chơi còn kịp sạc lại; chỉ tính là chết khi đã qua 3 giờ
     game liên tục trong bóng tối, ban đêm hoặc trong bão. */
  let blackoutHours = 0;
  const BLACKOUT_DEATH_HOURS = 3;

  function checkBlackout(hours, s) {
    const c = clock.state();
    const noPower = Number(stats.get().power) <= 0;
    const dark = !!c.isNight || !!s.storm;
    if (noPower && dark) {
      blackoutHours += hours;
    } else {
      blackoutHours = 0;
    }
    return blackoutHours >= BLACKOUT_DEATH_HOURS;
  }

  function triggerDeath(endingId, cause) {
    if (dead) return;
    dead = true;

    clock.stop();
    lockBaseUI();

    /* Lưu ngay trạng thái chết xuống đĩa? KHÔNG. Bản lưu phải là mốc
       TRƯỚC khi chết, nếu không nút "chơi lại từ điểm lưu" sẽ nạp lại
       đúng trạng thái đã chết. autoSave() đã ghi mốc gần nhất trong
       lúc chơi, nên ở đây chỉ cần đóng băng chỉ số, không ghi đè. */
    const statsNow = stats.get();
    statsNow.day = clock.state().day;

    const info = getSaveInfo();
    const ok = hasSave();

    deathScreen = showEnding({
      id: endingId,
      stats: statsNow,
      extra: {},
      hasSave: ok,
      saveInfo: info,
      onRetry: () => retryFromSave(),
      onLoadSlot: () => { /* màn kết thúc tự mở danh sách bên trong */ },
      onRestart: () => restartMission(),
    });

    /* Ghi lý do chết ra console để lúc test biết cảnh nào đã mở. */
    console.info('[base] kết thúc sứ mệnh:', endingId, cause || '');
  }

  /* Chơi lại từ điểm lưu: đổ bản lưu về chín khoá rồi dựng lại màn căn
     cứ đúng ngày đã lưu. Không dùng location.href để tránh mất tiền tố
     /nasa không có dấu chéo cuối. */
  function retryFromSave() {
    const save = loadGame();
    if (!save) return;

    /* Tháo màn hiện tại trước khi applySave, để destroy() không ghi đè
       bản lưu vừa đọc bằng trạng thái đã chết. */
    const host = el.parentElement;
    destroy();
    applySave(save);
    clearChildScreens();

    if (host) {
      /* Dựng lại đúng màn căn cứ trong cùng khung chứa. startBase() đọc
         takePendingClock() do applySave() vừa nạp, nên mở đúng ngày. */
      startBase({ container: host, playerName, onExit, onLaunchRescue });
      return;
    }

    /* Không còn khung chứa (bị gỡ ở đâu đó): về màn đầu bằng cầu nối
       của app thay vì tự dựng DOM. */
    if (typeof window.__devJump === 'function') {
      window.__devJump('base', { day: (getSaveInfo() || {}).day || 1 });
    }
  }

  /* Dọn màn con đang mở, dùng trước khi dựng lại. */
  function clearChildScreens() {
    document.querySelectorAll('.farm-overlay, .exp-screen, .craft-screen, .radio-screen, .ending-root')
      .forEach((node) => node.remove());
  }

  /* Bắt đầu sứ mệnh mới: xoá sạch bản lưu rồi về màn khởi động. */
  function restartMission() {
    /* Bật cờ cleared TRƯỚC khi xoá: destroy() bên dưới vẫn gọi
       stats.save() và saveGame(), và nếu cờ chưa bật thì hai lệnh đó
       ghi lại đúng những khoá vừa xoá, làm bản lưu sống dậy ngay sau
       khi người chơi bấm "bắt đầu mới". */
    cleared = true;
    clearSave();

    const host = el.parentElement;
    destroy();
    clearChildScreens();

    /* destroy() đã bật cờ và bỏ qua phần ghi, nhưng khoá smdg.stats
       do chính stats.save() bên trong createStats ghi lúc chơi vẫn còn
       trên đĩa nếu người chơi mở lại tab. clearSave() đã xoá nó; dọn
       thêm lần nữa cho chắc, vì một khoá còn sót là ván chơi cũ sống
       lại ở lần mở sau. */
    try {
      localStorage.removeItem('smdg.stats');
      localStorage.removeItem('smdg.stage1Done');
    } catch { /* chặn ghi thì thôi */ }

    if (typeof onExit === 'function') {
      /* Ưu tiên onExit của app: nó biết cách hiện lại màn khởi động và
         xoá cờ baseStarted, việc mà base.js không tự làm được. */
      try { onExit(); return; } catch (err) { console.error('[base] onExit lỗi', err); }
    }
    if (host) host.remove();
  }

  const unTick = clock.onTick((s) => {
    const absMin = s.day * 1440 + s.minutes;
    let delta = absMin - lastClockMinutes;

    /* qua nửa đêm thì số tuyệt đối vẫn tăng đều nên không cần bù,
       nhưng nếu kim bị tua lùi thì bỏ qua thay vì trừ ngược chỉ số */
    if (delta < 0) delta = 0;
    lastClockMinutes = absMin;

    if (delta > 0) {
      stats.tick(delta);
      stats.save();

      /* Chết vì oxy, nước hay calo: checkDeath() trả về nguyên nhân.
         Dừng ngay, không chạy thêm nhịp nào. */
      const death = stats.checkDeath();
      if (death) {
        const id = endingIdForCause(death.cause);
        if (id) {
          triggerDeath(id, death);
          return;
        }
      }

      /* Mất điện kéo dài. Đếm theo giờ game đã trôi trong nhịp này. */
      if (checkBlackout(delta / 60, stats.get())) {
        triggerDeath('blackout', { cause: 'power', hours: blackoutHours });
        return;
      }
    }

    /* Trạng thái khoá tô lại mỗi nhịp: nông trại mở khi đủ hạt và nước,
       nút cứu hộ mở khi đã phát tín hiệu. Trước đây chỉ gọi một lần
       lúc dựng lưới, nên nhặt đủ đồ giữa chừng mà nút vẫn hiện ổ khoá.
       Rẻ: vài class toggle, không dựng lại DOM. */
    refreshLocks();
    el.classList.toggle('is-night', s.isNight);
    phase.textContent = s.isNight ? t('base.night') : t('base.daytime');
    footDays.textContent = t(s.day === 1 ? 'base.footer.survived.one' : 'base.footer.survived').replace('{n}', String(s.day));
    if (s.day !== shownDay) {
      renderDayLog(s.day);
      checkProbeQuest(s.day);
    }
  });

  /* ---------- chuỗi tìm xác tàu thăm dò ----------
     Chỉ chạy một lần mỗi ngày, khi đồng hồ sang ngày mới. Ngày 6 thì
     hiện thông báo nhớ ra xác tàu. Từ đó tới khi đào được thì mỗi sáng
     nhắc lại bằng một dòng trong nhật ký. */

  function checkProbeQuest(day) {
    const ev = tickQuest(quest, day);
    if (ev === 'notice') {
      sockLog(t('probe.log.noticed'));
      showProbeNotice({
        onGo: () => { /* người chơi tự ra đồng bằng bằng nút thám hiểm */ showToast(t('probe.go')); },
        onLater: () => showToast(t('probe.later')),
      });
    } else if (ev === 'excavate') {
      /* Chưa đào thì nhắc nhẹ, không chặn gì. */
      const left = daysUntilTransmit(day);
      if (left > 0) showToast(t('probe.log.noticed'));
    }
  }

  /* Ghi thêm một dòng vào nhật ký ngày đang hiện. Dùng cho sự kiện
     đặc biệt như nhớ ra xác tàu, để dòng quest chen giữa các dòng
     DAY_LOG thường. Không ghi đè dòng cũ, chỉ thay đúng dòng nhật ký
     bằng phiên bản có thêm câu quest ở cuối. */
  /* Khai báo ở phạm vi hàm chứ không phải const tại chỗ: sockLog được
     gọi từ rất sớm (nhặt đồ, sự kiện xác tàu) trước khi dòng khai báo
     này chạy tới, nên const sẽ ném ReferenceError vì vùng chết tạm thời.
     Dùng biến khai báo trước và khởi tạo lười bên trong hàm. */
  var questLogLines = null;
  function sockLog(line) {
    if (!questLogLines) questLogLines = new Set();
    if (!line || questLogLines.has(line)) return;
    questLogLines.add(line);
    if (!logText) return;
    const base = logText.textContent || '';
    logText.textContent = base ? base + ' ' + line : line;
  }

  /* ---------- thanh chỉ số ---------- */

  /* HUD mới: thanh nổi mỏng ở trên cùng, có nhật ký và sổ tay.
     HUD cũ vẫn giữ làm dự phòng nếu thanh mới lỗi. */
  let hud;
  try {
    hud = createCompactHud({
      container: el,
      stats,
      clock,
      playerName,
      onOpenGuide: () => {},
      onSave: () => { if (typeof saveNow === 'function') saveNow(); },
      onOpenSettings: () => { if (typeof openSettings === 'function') openSettings(); },
    });
  } catch (err) {
    console.warn('[base] thanh HUD mới lỗi, dùng bản cũ', err);
    hud = createHud({
      container: el.querySelector('.base-hud-slot'),
      stats,
      getLang,
      onLangChange,
    });
  }

  /* ---------- sân khấu căn cứ toàn màn hình (mới) ---------- */

  /* Sân khấu point-and-click: ảnh căn cứ phủ kín màn hình, nhân vật
     phi hành gia đứng giữa, sáu trạm bấm trực tiếp trên tranh. Đặt sau
     HUD để ảnh nền nằm dưới thanh nổi, nhưng vẫn trên nền cũ. */
  let baseScene = null;
  try {
    injectNewSceneCss();
    baseScene = createBaseScene({
      container: el,
      stats,
      clock,
      onAction: (id) => {
        /* Sáu trạm của sân khấu mới ánh xạ sang hành động cũ, để không
           phải viết lại toàn bộ logic bên dưới. */
        const map = {
          comms: 'radio',
          lifesupport: 'farm',
          bag: 'bag',
          craft: 'craft',
          explore: 'explore',
          sleep: 'sleep',
        };
        const target = map[id] || id;
        const btn = grid.querySelector('[data-action="' + target + '"]');
        if (btn) btn.click();
      },
    });
    /* Sân khấu mới thay hẳn khung cảnh cũ. Ẩn ảnh nền cũ, tiêu đề và
       ô nhật ký để không đè lên tranh; giữ lưới nút vì vẫn cần cho
       người chơi bấm, nhưng dời xuống đáy và thu nhỏ thành thanh công
       cụ để nhường chỗ cho cảnh. */
    if (baseScene && baseScene.root) {
      baseScene.root.style.zIndex = '1';
      el.insertBefore(baseScene.root, el.firstChild);
      el.classList.add('has-new-scene');
    }
  } catch (err) {
    console.warn('[base] sân khấu mới lỗi, giữ bản cũ', err);
    baseScene = null;
  }

  /* Đổi tư thế nhân vật theo chỉ số. Gọi mỗi lần chỉ số đổi. */
  function syncCharPose() {
    if (!baseScene || typeof baseScene.setCharState !== 'function') return;
    try {
      baseScene.setCharState(pickCharState(stats.state ? stats.state() : stats));
    } catch (err) { /* không chặn game vì lỗi trang trí */ }
  }

  /* Đổi pha nền theo giờ và thời tiết trong ngày. */
  function syncPhase() {
    if (!baseScene || typeof baseScene.setPhase !== 'function') return;
    try {
      const c = clock.state();
      baseScene.setPhase(c.storm ? 'storm' : (c.isNight ? 'night' : 'day'));
    } catch (err) { /* không chặn game */ }
  }
  syncCharPose();
  syncPhase();

  /* ---------- đồng hồ LCD + nút tốc độ ---------- */

  const clockUi = createClockUi({
    container: el.querySelector('.base-clock-slot'),
    clock,
    getLang,
    onLangChange,
  });

  function updateFootItems() {
    /* Đếm từ kho chỉ số, không đếm từ mảng khởi điểm: dùng một gói
       khẩu phần thì con số ở chân màn hình phải giảm ngay. Tấm ảnh
       gia đình không nằm trong kho chỉ số nên cộng thêm một. */
    const inv = stats.getInventory() || {};
    let total = 0;
    for (const [id, n] of Object.entries(inv)) {
      if (id === 'family_photo') continue;
      const q = Number(n) || 0;
      if (q > 0) total += q;
    }
    total += 1; /* tấm ảnh gia đình */
    footItems.textContent = t('base.footer.items').replace('{n}', String(total));
  }

  /* ---------- song ngữ ---------- */

  function applyTexts() {
    whoLabel.textContent = t('base.who');
    whoName.textContent = playerName || t('base.whoFallback');
    heading.textContent = t('base.heading');
    phase.textContent = clock.state().isNight ? t('base.night') : t('base.daytime');
    footDays.textContent = t(clock.state().day === 1 ? 'base.footer.survived.one' : 'base.footer.survived').replace('{n}', String(clock.state().day));

    for (const act of ACTIONS) {
      const btn = grid.querySelector(`[data-action="${act.id}"]`);
      if (!btn) continue;
      btn.querySelector('.base-card-name').textContent = t('base.' + act.id);
      btn.querySelector('.base-card-desc').textContent = t('base.' + act.id + '.desc');
    }
    updateFootItems();
    if (replayBtn) {
      replayBtn.textContent = t('base.replayComms');
      replayBtn.title = t('base.replayComms.hint');
      replayBtn.setAttribute('aria-label', t('base.replayComms'));
    }
    if (saveBtn) {
      saveBtn.title = t('save.now.hint');
      saveBtn.setAttribute('aria-label', t('save.now'));
    }
    if (saveLabel) saveLabel.textContent = t('save.now');
    if (!bag.hidden) renderBag();
    if (shownDay) renderDayLog(shownDay);
    if (idleEntry) idleLine.textContent = localized(idleEntry);
    if (sleepEntry) sleepLine.textContent = localized(sleepEntry);
  }

  const unLang = onLangChange(() => applyTexts());

  /* ---------- chạy ---------- */

  const unVisibility = clock.bindVisibility();
  buildGrid();
  clock.start();
  scheduleIdle();
  /* Khoá phải tính lại sau khi sân khấu đã dựng: refreshLocks() ở
     buildGrid() chạy trước khi baseScene tồn tại, nên lần gọi đó chỉ
     tô được lưới nút, không chấm được việc ở sân khấu. */
  refreshLocks();

  /* Cầu cho bảng test nhà phát triển: ba công cụ "cho đầy vật phẩm",
     "cho nước và calo đầy", "mở khoá mọi thứ" cần đối tượng stats
     thật của màn này. index.html không giữ nó, nên ghi ra window.
     Gỡ khi tháo màn để không còn con trỏ tới stats của một ván đã
     đóng. */
  window.__devBase = { stats, clock, showEnding, endingIdForCause };

  /* ---------- hướng dẫn người chơi ---------- */

  /* Màn căn cứ vừa dựng xong là lúc hiện thẻ chào mừng (hab_intro),
     nếu người chơi chưa từng xem.

     Lần đầu vào căn cứ thì lớp phủ nhật ký chạy trước, và thẻ chào
     mừng đợi tới khi lớp phủ tan. Hai lớp phủ cùng lúc thì thẻ nằm
     dưới và cú bấm của người chơi rơi vào tấm tối của lớp trên. */
  function showBaseTutorial() {
    maybeShow({ trigger: 'firstEnter', screen: 'base' });
  }

  /* ---------- lần đầu vào căn cứ: bắt buộc mở nhật ký ----------
     Lớp phủ làm tối cả màn trừ widget nhật ký, mũi tên chỉ vào đó,
     và chỉ tan khi người chơi mở rồi đóng nhật ký. Ghi cờ một lần
     duy nhất vào smdg.missionLogIntro, lần sau vào căn cứ không hiện
     lại. Lớp phủ nằm trong mission-log.js và dùng đúng cách khoanh
     sáng bốn phía của onboarding.js, nên hai hệ thống trông như một. */
  let introPromise = null;
  try {
    if (hud && typeof hud.startIntro === 'function') introPromise = hud.startIntro();
  } catch (err) {
    console.warn('[base] lớp phủ nhật ký lỗi, bỏ qua', err);
  }

  if (introPromise && typeof introPromise.then === 'function') {
    introPromise.then((shown) => { if (shown) showBaseTutorial(); });
  } else {
    showBaseTutorial();
  }

  /* Sổ tay đọc từ JSON nên cần hàm reset để test lại từ đầu. */
  window.__devOnboarding = { resetTutorials, registerPhase2Hooks };

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    unTick();
    unLang();
    unVisibility();
    unClockSave();
    unWatchers();
    clock.stop();
    if (hud && typeof hud.destroy === 'function') hud.destroy();
    window.removeEventListener('smdg:clear-save', onClearSave);
    if (window.__devBase && window.__devBase.stats === stats) delete window.__devBase;
    /* Màn kết thúc còn mở thì đóng theo. Không có bước này, lớp phủ
       của ván vừa tháo nằm lại trên màn khởi động và chặn mọi cú bấm. */
    if (deathScreen && typeof deathScreen.close === 'function') {
      deathScreen.close();
      deathScreen = null;
    }

    /* Vừa bấm xoá tiến trình thì destroy() cũng phải im lặng: màn căn
       cứ bị tháo sau khi xoá, và nếu ghi ở đây thì khoá vừa xoá sống
       lại đúng lúc trang đang tải lại. */
    if (!cleared) {
      stats.save();
      /* Ghi bản lưu tổng lần cuối trước khi tháo màn, để chỉ số và giờ
         vừa đổi ở giây cuối không bị mất. */
      saveGame({ reason: 'auto' });
    }
    clearTimeout(toastTimer);
    stopIdle();
    clearSleepTimers();
    sleepLineTimer = null;
    /* Nếu người chơi đang xem hồi tưởng lúc thoát màn căn cứ thì dọn
       luôn, nếu không khung ký ức sẽ nằm lại trên màn khởi động. */
    if (memoryScreen && typeof memoryScreen.destroy === 'function') {
      memoryScreen.destroy();
      memoryScreen = null;
    }
    el.remove();
  }

  return { destroy, stats, clock };
}

/* ============================================================
   TIẾP TỤC VÁN ĐÃ LƯU
   Gọi khi người chơi bấm nút "Tiếp tục" ở màn khởi động.

   Hàm này không tự dựng màn: nó đổ bản lưu về chín khoá cũ, rồi trả
   về thông tin để nơi gọi quyết định mở màn nào. Lý do: màn khởi động
   và luồng chuyển màn nằm ở index.html, mà file đó do sub-agent khác
   giữ. Cách này cho phép nối vào chỉ bằng một dòng ở index.html.

   @returns {{ok:boolean, playerName:string, phase:string, day:number}|{ok:false}}
   ============================================================ */
export function resumeFromSave() {
  const save = loadGame();
  if (!save) return { ok: false };

  applySave(save);
  const info = getSaveInfo();

  return {
    ok: true,
    playerName: (info && info.playerName) || '',
    phase: (info && info.phase) || 'base',
    day: (info && info.day) || 1,
    savedAt: (info && info.savedAt) || '',
  };
}

/* Cho nơi khác hỏi nhanh mà không phải import save-game.js. */
export { hasSave };

