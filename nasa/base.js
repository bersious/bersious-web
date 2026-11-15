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
import { createClockUi } from './clock-ui.js';
import { t, onLangChange, getLang } from './i18n.js';
import { getSettings } from './settings.js';
import { playClick } from './audio.js';
import { playMemory } from './memories.js';
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


/* Ảnh cảnh căn cứ. Mỗi hành động đổi một cảnh để khung hình có
   chuyển động, và ban đêm dùng ảnh khác ban ngày. */
const SCENES = {
  day:   { src: 'assets/art/bg-hab.jpg',        cap: 'Bên trong trạm Hab, ban ngày' },
  night: { src: 'assets/art/bg-hab.jpg',        cap: 'Trạm Hab, đêm xuống' },
  farm:  { src: 'assets/art/bg-farm.jpg',       cap: 'Khu nhà kính trồng khoai' },
  work:  { src: 'assets/art/bg-workbench.jpg',  cap: 'Bàn chế tạo' },
  radio: { src: 'assets/art/bg-radio.jpg',      cap: 'Góc liên lạc' },
  air:   { src: 'assets/art/bg-airlock.jpg',    cap: 'Cửa khí chuyển tiếp' },
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
  if (capEl) capEl.textContent = sc.cap;
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

export function startBase({ container, playerName = '', onExit } = {}) {
  injectCss();

  const inventory = makeInventory();
  /* Ngày bắt đầu lúc 08:00 chứ không phải 06:00. Màn căn cứ mở ra khi
     người chơi đã thức, nên nếu để 06:00 thì lần ngủ đầu chỉ nhảy được
     một tiếng trong cùng ngày, không sang ngày mới. 08:00 cũng cho
     người chơi một ngày đủ dài trước khi trời tối. */
  const clock = createClock({ startMinute: 8 * 60, day: 1 });

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

  /* ---------- lưới hành động ---------- */

  const ACTIONS = [
    { id: 'farm',    locked: true },
    { id: 'bag',     locked: false },
    { id: 'explore', locked: false },
    { id: 'craft',   locked: false },
    { id: 'radio',   locked: false },
    { id: 'sleep',   locked: false },
  ];

  function buildGrid() {
    grid.innerHTML = '';
    for (const act of ACTIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'base-card' + (act.locked ? ' is-locked' : '');
      btn.dataset.action = act.id;
      btn.innerHTML = `
        <span class="base-card-icon">${ICONS[act.id]}</span>
        <span class="base-card-name"></span>
        <span class="base-card-desc"></span>
        ${act.locked ? `<span class="base-card-lock" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2"/>
            <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
          </svg></span>` : ''}`;
      btn.addEventListener('click', () => onAction(act.id));
      grid.appendChild(btn);
    }
    applyTexts();
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
      openRadioScreen();
      return;
    }
  }

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
          onFind: ({ id, name, qty }) => {
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

  /* ---------- vật phẩm dùng được ----------
     Đa số vật phẩm chỉ để đếm. Riêng tấm ảnh gia đình là vật phẩm kể
     chuyện: bấm vào thì chạy đoạn hồi tưởng chứ không trừ số lượng và
     không đụng tới chỉ số sinh tồn. Để bảng riêng thay vì chuỗi if
     trong renderBag, vì sau này còn thêm vật phẩm kể chuyện khác. */
  const ITEM_ACTIONS = {
    family_photo: () => openFamilyMemory(),
  };

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

  function renderBag() {
    bagTitle.textContent = t('base.bag.title');
    bagClose.setAttribute('aria-label', t('base.close'));
    bagGrid.innerHTML = '';
    for (const item of inventory) {
      const act = ITEM_ACTIONS[item.id];
      const cell = document.createElement(act ? 'button' : 'div');
      cell.className = 'base-item' + (act ? ' is-usable' : '');
      if (act) {
        cell.type = 'button';
        cell.setAttribute('aria-label', t('base.item.' + item.id));
      }
      cell.innerHTML = `
        <span class="base-item-icon">${itemIcon(item.id)}</span>
        <span class="base-item-name"></span>
        <span class="base-item-qty">×${item.qty}</span>
        ${act ? `<span class="base-item-hint"></span>` : ''}`;
      cell.querySelector('.base-item-name').textContent = t('base.item.' + item.id);
      if (act) {
        cell.querySelector('.base-item-hint').textContent =
          t('base.item.' + item.id + '.desc');
        cell.addEventListener('click', () => { playClick(); act(); });
      }
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
    }

    el.classList.toggle('is-night', s.isNight);
    phase.textContent = s.isNight ? t('base.night') : t('base.daytime');
    footDays.textContent = t('base.footer.survived').replace('{n}', String(s.day));
    if (s.day !== shownDay) renderDayLog(s.day);
  });

  /* ---------- thanh chỉ số ---------- */

  const hud = createHud({
    container: el.querySelector('.base-hud-slot'),
    stats,
    getLang,
    onLangChange,
  });

  /* ---------- đồng hồ LCD + nút tốc độ ---------- */

  const clockUi = createClockUi({
    container: el.querySelector('.base-clock-slot'),
    clock,
    getLang,
    onLangChange,
  });

  function updateFootItems() {
    const total = inventory.reduce((sum, it) => sum + it.qty, 0);
    footItems.textContent = t('base.footer.items').replace('{n}', String(total));
  }

  /* ---------- song ngữ ---------- */

  function applyTexts() {
    whoLabel.textContent = t('base.who');
    whoName.textContent = playerName || t('base.whoFallback');
    heading.textContent = t('base.heading');
    phase.textContent = clock.state().isNight ? t('base.night') : t('base.daytime');
    footDays.textContent = t('base.footer.survived').replace('{n}', String(clock.state().day));

    for (const act of ACTIONS) {
      const btn = grid.querySelector(`[data-action="${act.id}"]`);
      if (!btn) continue;
      btn.querySelector('.base-card-name').textContent = t('base.' + act.id);
      btn.querySelector('.base-card-desc').textContent = t('base.' + act.id + '.desc');
    }
    updateFootItems();
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

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    unTick();
    unLang();
    unVisibility();
    clock.stop();
    if (hud && typeof hud.destroy === 'function') hud.destroy();
    stats.save();
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
