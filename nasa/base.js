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
import { t, onLangChange } from './i18n.js';
import { getSettings } from './settings.js';
import { playClick } from './audio.js';

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

/* ---------- kho vật phẩm khởi đầu ---------- */

function makeInventory() {
  return [
    { id: 'toolkit', qty: 1 },
    { id: 'oxygen',  qty: 2 },
    { id: 'ration',  qty: 3 },
    { id: 'radio',   qty: 1 },
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
  sleep: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>
  </svg>`,
};

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

  /* ---------- khung DOM ---------- */

  const el = document.createElement('div');
  el.className = 'base-screen';
  el.innerHTML = `
    <header class="base-topbar">
      <div class="base-who">
        <span class="base-who-label"></span>
        <span class="base-who-name"></span>
      </div>

      <div class="base-clock" role="timer" aria-live="off">
        <span class="base-clock-time">00:00</span>
        <span class="base-clock-day"></span>
        <div class="base-clock-bar" aria-hidden="true">
          <div class="base-clock-fill"></div>
        </div>
      </div>

      <div class="base-top-right">
        <span class="base-phase"></span>
      </div>
    </header>

    <main class="base-main">
      <h2 class="base-heading"></h2>
      <div class="base-grid" role="group"></div>
    </main>

    <footer class="base-foot">
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
  `;
  container.appendChild(el);

  const q = (sel) => el.querySelector(sel);

  const whoLabel  = q('.base-who-label');
  const whoName   = q('.base-who-name');
  const clockTime = q('.base-clock-time');
  const clockDay  = q('.base-clock-day');
  const clockFill = q('.base-clock-fill');
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
  const sleepFx   = q('.base-sleep');

  /* ---------- lưới hành động ---------- */

  const ACTIONS = [
    { id: 'farm',    locked: true },
    { id: 'bag',     locked: false },
    { id: 'explore', locked: false },
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

  function onAction(id) {
    playClick();
    if (id === 'farm') {
      showToast(t('base.farm.locked'));
      return;
    }
    if (id === 'explore') {
      showToast(t('base.explore.locked'));
      return;
    }
    if (id === 'bag') {
      openBag();
      return;
    }
    if (id === 'sleep') {
      doSleep();
      return;
    }
  }

  /* ---------- túi đồ ---------- */

  function openBag() {
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

  function renderBag() {
    bagTitle.textContent = t('base.bag.title');
    bagClose.setAttribute('aria-label', t('base.close'));
    bagGrid.innerHTML = '';
    for (const item of inventory) {
      const cell = document.createElement('div');
      cell.className = 'base-item';
      cell.innerHTML = `
        <span class="base-item-icon">${ITEM_ICONS[item.id]}</span>
        <span class="base-item-name"></span>
        <span class="base-item-qty">×${item.qty}</span>`;
      cell.querySelector('.base-item-name').textContent = t('base.item.' + item.id);
      bagGrid.appendChild(cell);
    }
  }

  /* ---------- đi ngủ ---------- */

  function doSleep() {
    if (sleeping) return;
    sleeping = true;
    const motion = getSettings().motion;

    const wake = () => {
      clock.sleep();               // nhảy tới 07:00 sáng hôm sau
      sleepFx.classList.remove('is-dark');
      const done = () => {
        sleepFx.hidden = true;
        sleeping = false;
      };
      if (motion) setTimeout(done, 900);
      else done();
    };

    if (motion) {
      sleepFx.hidden = false;
      requestAnimationFrame(() => sleepFx.classList.add('is-dark'));
      setTimeout(wake, 1000);      // 1 giây tối dần rồi sáng lại
    } else {
      wake();
    }
  }

  /* ---------- đồng hồ ---------- */

  const unTick = clock.onTick((s) => {
    clockTime.textContent = s.label;
    clockDay.textContent = t('base.day').replace('{n}', String(s.day));
    clockFill.style.width = (s.progress * 100).toFixed(2) + '%';
    el.classList.toggle('is-night', s.isNight);
    phase.textContent = s.isNight ? t('base.night') : t('base.daytime');
    footDays.textContent = t('base.footer.survived').replace('{n}', String(s.day));
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
    clockDay.textContent = t('base.day').replace('{n}', String(clock.state().day));
    footDays.textContent = t('base.footer.survived').replace('{n}', String(clock.state().day));

    for (const act of ACTIONS) {
      const btn = grid.querySelector(`[data-action="${act.id}"]`);
      if (!btn) continue;
      btn.querySelector('.base-card-name').textContent = t('base.' + act.id);
      btn.querySelector('.base-card-desc').textContent = t('base.' + act.id + '.desc');
    }
    updateFootItems();
    if (!bag.hidden) renderBag();
  }

  const unLang = onLangChange(() => applyTexts());

  /* ---------- chạy ---------- */

  const unVisibility = clock.bindVisibility();
  buildGrid();
  clock.start();

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    unTick();
    unLang();
    unVisibility();
    clock.stop();
    clearTimeout(toastTimer);
    el.remove();
  }

  return { destroy };
}
