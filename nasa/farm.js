/* ============================================================
   farm.js
   Màn NÔNG TRẠI: mười hai khay đất trong nhà kính của căn cứ.

   Người chơi gieo khoai, chờ ba ngày trong game, rồi bấm khay
   đã chín để thu hoạch. Mỗi lần gieo tốn tám đơn vị nước và một
   hạt. Hết nước hoặc hết hạt thì khay trống mờ đi và một dòng
   chữ nói rõ vì sao.

   Trạng thái lưu vào localStorage dưới khoá 'smdg.farm'. Mở lại
   màn thì đọc số ngày hiện tại của đồng hồ và tự đôn cây lên
   đúng giai đoạn, nên tắt game giữa chừng không mất vụ mùa.

   File này chỉ logic + dựng DOM. Màu, cỡ, khoảng cách nằm trong
   css/farm.css và css/tokens.css.
   ============================================================ */

import { getLang, onLangChange } from './i18n.js';
import { playClick } from './audio.js';

/* ------------------------------------------------------------
   Chuỗi song ngữ. Không sửa i18n.js nên bảng chữ nằm ngay đây.
   Thêm khoá mới thì phải thêm cả vi lẫn en.
   ------------------------------------------------------------ */

const STRINGS = {
  vi: {
    'title': 'Khoang trồng',
    'sub': 'Mười hai khay đất dưới đèn. Khoai mọc sau ba ngày.',
    'close': 'Đóng',
    'clock': 'Ngày {n} · {hhmm}',

    'res.water': 'Nước',
    'res.seeds': 'Hạt',
    'res.waterVal': '{n} / 100',
    'res.seedsVal': '{n} / 20',

    'state.empty': 'Trống',
    'state.planted': 'Ngày {n}/3',
    'state.grown': '{n}%',
    'state.ripe': 'Chín',

    'act.sow': 'Bấm để gieo',
    'act.harvest': 'Bấm để thu hoạch',
    'act.growing': 'Cây đang lên',

    'note.noWater': 'Bể nước đã cạn. Cần 8 đơn vị nước cho mỗi khay.',
    'note.noSeeds': 'Kho hạt trống. Cần 1 hạt cho mỗi khay.',
    'note.noBoth': 'Hết cả nước lẫn hạt. Không gieo được khay nào.',

    'toast.sow': 'Đã gieo một khay. Tốn 8 nước và 1 hạt.',
    'toast.harvest': 'Thu được {kg} kg khoai.',
    'toast.ripe': '{n} khay vừa chín.',

    'foot.ripe': '{n} khay chín',
    'foot.rule': 'Ba ngày một vụ. Mỗi khay: 8 nước, 1 hạt.',
    'foot.esc': 'Esc để đóng',

    'aria.plot': 'Khay {n}, {state}',
    'aria.water': 'Nước còn {n} trên 100',
    'aria.seeds': 'Hạt còn {n} trên 20',
  },

  en: {
    'title': 'Grow bay',
    'sub': 'Twelve soil trays under the lamps. Potatoes come up in three days.',
    'close': 'Close',
    'clock': 'Day {n} · {hhmm}',

    'res.water': 'Water',
    'res.seeds': 'Seeds',
    'res.waterVal': '{n} / 100',
    'res.seedsVal': '{n} / 20',

    'state.empty': 'Empty',
    'state.planted': 'Day {n}/3',
    'state.grown': '{n}%',
    'state.ripe': 'Ripe',

    'act.sow': 'Tap to sow',
    'act.harvest': 'Tap to harvest',
    'act.growing': 'Still growing',

    'note.noWater': 'The tank is dry. Each tray needs 8 units of water.',
    'note.noSeeds': 'The seed locker is empty. Each tray needs 1 seed.',
    'note.noBoth': 'No water and no seeds left. Nothing can be sown.',

    'toast.sow': 'One tray sown. Eight water and one seed spent.',
    'toast.harvest': 'Harvested {kg} kg of potatoes.',
    'toast.ripe': '{n} trays just ripened.',

    'foot.ripe': '{n} ripe trays',
    'foot.rule': 'Three days per crop. Each tray: 8 water, 1 seed.',
    'foot.esc': 'Esc to close',

    'aria.plot': 'Tray {n}, {state}',
    'aria.water': 'Water {n} of 100 left',
    'aria.seeds': 'Seeds {n} of 20 left',
  },
};

/* Lấy chữ theo ngôn ngữ đang dùng. Thiếu bên en thì rơi về vi. */
function s(key, vars) {
  const table = STRINGS[getLang()] || STRINGS.vi;
  let out = table[key] ?? STRINGS.vi[key] ?? key;
  if (vars) {
    for (const k in vars) out = out.split('{' + k + '}').join(String(vars[k]));
  }
  return out;
}

/* ------------------------------------------------------------
   Hằng số cơ chế. Sửa ở đây, đừng rải số khắp file.
   ------------------------------------------------------------ */

const STORE_KEY = 'smdg.farm';
const PLOT_COUNT = 12;
const GROW_DAYS = 3;
const WATER_COST = 8;
const SEED_COST = 1;
const WATER_MAX = 100;
const SEEDS_MAX = 20;
const KG_MIN = 2.5;
const KG_MAX = 3.5;

/* CSS nạp bằng đường dẫn tuyệt đối dựng từ module, y như base.js.
   Vercel có thể phục vụ trang không có dấu / ở cuối, đường dẫn
   tương đối sẽ 404. */
const FARM_URL = new URL('.', import.meta.url).href;

function injectCss() {
  if (document.querySelector('link[data-farm-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FARM_URL + 'css/farm.css';
  link.dataset.farmCss = '1';
  document.head.appendChild(link);
}

/* ------------------------------------------------------------
   Hình vẽ từng giai đoạn. SVG nội tuyến, không tải ảnh ngoài.
   Khung nhìn 0 0 64 56: khay đất ở dưới, cây mọc lên trên.
   ------------------------------------------------------------ */

const SOIL = `
  <path class="farm-soil" d="M6 37h52v10a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5z"/>
  <path class="farm-soil-top" d="M6 37h52v3.5H6z"/>
  <path class="farm-furrow" d="M17 42.5v6M32 42.5v6M47 42.5v6"/>`;

const ART = {
  empty: `<svg viewBox="0 0 64 56" aria-hidden="true" focusable="false">${SOIL}</svg>`,

  planted: `<svg viewBox="0 0 64 56" aria-hidden="true" focusable="false">${SOIL}
    <path class="farm-mound" d="M25 37c2.4-4 11.6-4 14 0z"/>
    <path class="farm-stem" d="M32 36v-6.5"/>
    <path class="farm-leaf" d="M32 31.5c-3.4-.5-5.5-2.7-5.7-5.9 3.4.2 5.3 2.3 5.7 5.9z"/>
    <path class="farm-leaf" d="M32 29.6c2.6-.6 4.1-2.3 4.3-4.7-2.6.2-4 1.8-4.3 4.7z"/>
  </svg>`,

  grown: `<svg viewBox="0 0 64 56" aria-hidden="true" focusable="false">${SOIL}
    <path class="farm-stem" d="M32 37V17"/>
    <path class="farm-leaf" d="M32 30.4c-6-1.1-9-4.7-9.2-9.3 5.7-.6 8.8 3.1 9.2 9.3z"/>
    <path class="farm-leaf" d="M32 27.2c5.4-.9 8.2-4.1 8.4-8.4-5.1-.6-8 2.9-8.4 8.4z"/>
    <path class="farm-leaf" d="M32 21.4c-3.9-.8-5.9-3.1-6.1-6.1 3.6-.4 5.7 2 6.1 6.1z"/>
  </svg>`,

  ripe: `<svg viewBox="0 0 64 56" aria-hidden="true" focusable="false">${SOIL}
    <path class="farm-stem" d="M32 37V12"/>
    <path class="farm-leaf" d="M32 30.4c-6-1.1-9-4.7-9.2-9.3 5.7-.6 8.8 3.1 9.2 9.3z"/>
    <path class="farm-leaf" d="M32 26.6c5.4-.9 8.2-4.1 8.4-8.4-5.1-.6-8 2.9-8.4 8.4z"/>
    <path class="farm-leaf" d="M32 20c-3.9-.8-5.9-3.1-6.1-6.1 3.6-.4 5.7 2 6.1 6.1z"/>
    <circle class="farm-tuber" cx="19.5" cy="40" r="4.2"/>
    <circle class="farm-tuber" cx="44.5" cy="40" r="4.2"/>
    <circle class="farm-tuber" cx="32" cy="42.4" r="5.2"/>
  </svg>`,
};

const WATER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 3.5c3.4 4 5.5 6.7 5.5 9.4a5.5 5.5 0 0 1-11 0c0-2.7 2.1-5.4 5.5-9.4z"/>
  <path d="M9.6 13.4a2.4 2.4 0 0 0 2.4 2.3"/>
</svg>`;

const SEED_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 20c4.2 0 7-2.9 7-6.8C19 8.6 16.2 4 12 4S5 8.6 5 13.2C5 17.1 7.8 20 12 20z"/>
  <path d="M12 8.5v7"/>
</svg>`;

/* ------------------------------------------------------------
   Kho trạng thái
   ------------------------------------------------------------ */

function emptyPlot() {
  return { state: 'empty', plantedDay: 0 };
}

function freshState() {
  return {
    plots: Array.from({ length: PLOT_COUNT }, emptyPlot),
    water: WATER_MAX,
    seeds: SEEDS_MAX,
  };
}

function clampNum(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function loadState() {
  const blank = freshState();
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== 'object') return blank;

  const plots = Array.isArray(raw.plots) ? raw.plots : [];
  blank.plots = blank.plots.map((_, i) => {
    const p = plots[i];
    if (!p || typeof p !== 'object') return emptyPlot();
    const st = p.state;
    const day = Number(p.plantedDay);
    if (st !== 'planted' && st !== 'grown' && st !== 'ripe') return emptyPlot();
    /* Bản ghi thiếu ngày trồng thì không dựng lại được vụ mùa,
       trả khay về trống thay vì để cây treo lơ lửng. */
    if (!Number.isFinite(day) || day <= 0) return emptyPlot();
    return { state: st, plantedDay: Math.round(day) };
  });

  blank.water = Number.isFinite(Number(raw.water))
    ? clampNum(Math.round(Number(raw.water)), 0, WATER_MAX)
    : WATER_MAX;
  blank.seeds = Number.isFinite(Number(raw.seeds))
    ? clampNum(Math.round(Number(raw.seeds)), 0, SEEDS_MAX)
    : SEEDS_MAX;

  return blank;
}

function saveState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      plots: state.plots.map((p) => ({ state: p.state, plantedDay: p.plantedDay })),
      water: state.water,
      seeds: state.seeds,
    }));
  } catch {
    /* Chế độ riêng tư chặn localStorage. Màn vẫn chạy, chỉ mất phần lưu. */
  }
}

/* Đôn cây theo ngày hiện tại của đồng hồ. Trả về số khay vừa chín. */
function advancePlants(state, today) {
  let ripened = 0;
  for (const p of state.plots) {
    if (p.state === 'empty') continue;
    const elapsed = Math.max(0, today - p.plantedDay);
    const next = elapsed >= GROW_DAYS ? 'ripe'
      : elapsed >= 1 ? 'grown'
      : 'planted';
    if (next === 'ripe' && p.state !== 'ripe') ripened += 1;
    p.state = next;
  }
  return ripened;
}

/* ------------------------------------------------------------
   Màn hình
   ------------------------------------------------------------ */

export function openFarm({ container, clock, playerName = '', onClose, onHarvest } = {}) {
  injectCss();

  const state = loadState();
  const today = () => (clock && typeof clock.state === 'function' ? clock.state().day : 1);
  advancePlants(state, today());

  /* ---------- khung DOM ---------- */

  const el = document.createElement('div');
  el.className = 'farm-overlay';
  el.innerHTML = `
    <div class="farm-panel" role="dialog" aria-modal="true" aria-labelledby="farm-title">
      <header class="farm-head">
        <div class="farm-head-text">
          <h2 class="farm-title" id="farm-title"></h2>
          <p class="farm-sub"></p>
        </div>
        <div class="farm-head-side">
          <span class="farm-clock" role="timer" aria-live="off"></span>
          <button type="button" class="farm-close" aria-label=""></button>
        </div>
      </header>

      <div class="farm-res">
        <div class="farm-meter farm-meter-water">
          <span class="farm-meter-icon">${WATER_ICON}</span>
          <span class="farm-meter-name"></span>
          <span class="farm-meter-val"></span>
          <span class="farm-meter-bar" aria-hidden="true"><span class="farm-meter-fill"></span></span>
        </div>
        <div class="farm-meter farm-meter-seed">
          <span class="farm-meter-icon">${SEED_ICON}</span>
          <span class="farm-meter-name"></span>
          <span class="farm-meter-val"></span>
          <span class="farm-meter-bar" aria-hidden="true"><span class="farm-meter-fill"></span></span>
        </div>
      </div>

      <p class="farm-note" role="status" aria-live="polite" hidden></p>

      <div class="farm-body">
        <div class="farm-grid" role="group"></div>
      </div>

      <footer class="farm-foot">
        <span class="farm-foot-rule"></span>
        <span class="farm-foot-sep" aria-hidden="true">·</span>
        <span class="farm-foot-ripe"></span>
        <span class="farm-foot-sep farm-foot-esc-sep" aria-hidden="true">·</span>
        <span class="farm-foot-esc"></span>
      </footer>

      <div class="farm-toast" role="status" aria-live="polite" hidden></div>
    </div>
  `;
  container.appendChild(el);

  const q = (sel) => el.querySelector(sel);
  const panel     = q('.farm-panel');
  const titleEl   = q('.farm-title');
  const subEl     = q('.farm-sub');
  const clockEl   = q('.farm-clock');
  const closeBtn  = q('.farm-close');
  const waterM    = q('.farm-meter-water');
  const seedM     = q('.farm-meter-seed');
  const waterName = waterM.querySelector('.farm-meter-name');
  const waterVal  = waterM.querySelector('.farm-meter-val');
  const waterFill = waterM.querySelector('.farm-meter-fill');
  const seedName  = seedM.querySelector('.farm-meter-name');
  const seedVal   = seedM.querySelector('.farm-meter-val');
  const seedFill  = seedM.querySelector('.farm-meter-fill');
  const noteEl    = q('.farm-note');
  const gridEl    = q('.farm-grid');
  const ruleEl    = q('.farm-foot-rule');
  const ripeEl    = q('.farm-foot-ripe');
  const escEl     = q('.farm-foot-esc');
  const escSep    = q('.farm-foot-esc-sep');
  const toastEl   = q('.farm-toast');

  if (playerName) el.dataset.player = playerName;

  /* ---------- mười hai khay ---------- */

  const cells = [];
  for (let i = 0; i < PLOT_COUNT; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'farm-plot is-empty';
    btn.dataset.idx = String(i);
    btn.innerHTML = `<span class="farm-plot-art">${ART.empty}</span>
      <span class="farm-plot-tag"></span>`;
    btn.addEventListener('click', () => onPlot(i));
    cells.push(btn);
    gridEl.appendChild(btn);
  }

  /* ---------- thông báo ngắn ---------- */

  let toastTimer = null;
  let toastHide = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    clearTimeout(toastHide);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
      toastHide = setTimeout(() => { toastEl.hidden = true; }, 220);
    }, 2200);
  }

  /* ---------- cạn tài nguyên ---------- */

  function blockedReason() {
    const noWater = state.water < WATER_COST;
    const noSeed = state.seeds < SEED_COST;
    if (noWater && noSeed) return s('note.noBoth');
    if (noWater) return s('note.noWater');
    if (noSeed) return s('note.noSeeds');
    return '';
  }

  /* ---------- vẽ lại ---------- */

  function tagFor(plot, day) {
    if (plot.state === 'empty') return s('state.empty');
    const elapsed = clampNum(day - plot.plantedDay, 0, GROW_DAYS);
    if (plot.state === 'ripe') return s('state.ripe');
    if (plot.state === 'grown') return s('state.grown', { n: Math.round(elapsed / GROW_DAYS * 100) });
    return s('state.planted', { n: elapsed });
  }

  function actionFor(plot) {
    if (plot.state === 'empty') return blockedReason() ? '' : s('act.sow');
    if (plot.state === 'ripe') return s('act.harvest');
    return s('act.growing');
  }

  let lastStateSeen = cells.map(() => null);

  function paint(day) {
    const blocked = blockedReason();
    for (let i = 0; i < cells.length; i += 1) {
      const plot = state.plots[i];
      const cell = cells[i];

      if (lastStateSeen[i] !== plot.state) {
        cell.querySelector('.farm-plot-art').innerHTML = ART[plot.state] || ART.empty;
        lastStateSeen[i] = plot.state;
      }

      cell.classList.toggle('is-empty', plot.state === 'empty');
      cell.classList.toggle('is-planted', plot.state === 'planted');
      cell.classList.toggle('is-grown', plot.state === 'grown');
      cell.classList.toggle('is-ripe', plot.state === 'ripe');
      cell.classList.toggle('is-blocked', plot.state === 'empty' && Boolean(blocked));

      const tag = tagFor(plot, day);
      const tagEl = cell.querySelector('.farm-plot-tag');
      if (tagEl.textContent !== tag) tagEl.textContent = tag;

      const act = actionFor(plot);
      const aria = s('aria.plot', { n: i + 1, state: tag }) + (act ? '. ' + act : '');
      if (cell.getAttribute('aria-label') !== aria) cell.setAttribute('aria-label', aria);
      cell.setAttribute('aria-disabled', (plot.state === 'empty' && blocked) ? 'true' : 'false');

      const tip = act ? (aria + '. ' + act) : aria;
      cell.title = tip;
    }

    const wPct = clampNum(state.water / WATER_MAX, 0, 1) * 100;
    const sPct = clampNum(state.seeds / SEEDS_MAX, 0, 1) * 100;
    waterFill.style.width = wPct.toFixed(1) + '%';
    seedFill.style.width = sPct.toFixed(1) + '%';
    waterVal.textContent = s('res.waterVal', { n: state.water });
    seedVal.textContent = s('res.seedsVal', { n: state.seeds });
    waterM.classList.toggle('is-low', state.water < WATER_COST);
    seedM.classList.toggle('is-low', state.seeds < SEED_COST);

    if (blocked) {
      if (noteEl.textContent !== blocked) noteEl.textContent = blocked;
      noteEl.hidden = false;
    } else {
      noteEl.hidden = true;
    }

    const ripe = state.plots.filter((p) => p.state === 'ripe').length;
    ripeEl.textContent = s('foot.ripe', { n: ripe });
  }

  /* ---------- chữ tĩnh ---------- */

  function applyTexts() {
    titleEl.textContent = s('title');
    subEl.textContent = s('sub');
    closeBtn.setAttribute('aria-label', s('close'));
    waterName.textContent = s('res.water');
    seedName.textContent = s('res.seeds');
    waterM.setAttribute('aria-label', s('aria.water', { n: state.water }));
    seedM.setAttribute('aria-label', s('aria.seeds', { n: state.seeds }));
    ruleEl.textContent = s('foot.rule');
    escEl.textContent = s('foot.esc');
    paint(today());
  }

  /* ---------- hành động trên khay ---------- */

  function onPlot(i) {
    const plot = state.plots[i];
    const day = today();

    if (plot.state === 'empty') {
      const reason = blockedReason();
      if (reason) {
        playClick();
        showToast(reason);
        return;
      }
      plot.state = 'planted';
      plot.plantedDay = day;
      state.water = clampNum(state.water - WATER_COST, 0, WATER_MAX);
      state.seeds = clampNum(state.seeds - SEED_COST, 0, SEEDS_MAX);
      saveState(state);
      playClick();
      paint(day);
      showToast(s('toast.sow'));
      return;
    }

    if (plot.state === 'ripe') {
      const kg = Math.round((KG_MIN + Math.random() * (KG_MAX - KG_MIN)) * 10) / 10;
      state.plots[i] = emptyPlot();
      saveState(state);
      playClick();
      paint(day);
      showToast(s('toast.harvest', { kg: kg.toFixed(1) }));
      if (typeof onHarvest === 'function') onHarvest({ kg, day });
      return;
    }

    /* gieo rồi, chưa chín: nói rõ còn bao lâu thay vì im lặng */
    playClick();
    const left = Math.max(0, GROW_DAYS - clampNum(day - plot.plantedDay, 0, GROW_DAYS));
    showToast(tagFor(plot, day) + (left > 0 ? ' · ' + s('act.growing') : ''));
  }

  /* ---------- đóng ---------- */

  const prevFocus = document.activeElement;
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    playClick();
    if (typeof onClose === 'function') onClose();
    destroy();
  }

  closeBtn.addEventListener('click', close);

  el.addEventListener('click', (e) => {
    if (e.target === el) close();
  });

  /* ---------- bàn phím: Esc đóng, Tab chạy vòng trong panel ---------- */

  function onKey(ev) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
      return;
    }
    if (ev.key !== 'Tab') return;
    const nodes = Array.from(panel.querySelectorAll('button:not([disabled])'))
      .filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (ev.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  }
  document.addEventListener('keydown', onKey);

  /* ---------- đồng hồ: chỉ vẽ lại khi sang ngày mới ---------- */

  let lastDay = today();
  let lastLabel = '';

  function tickText(st) {
    const label = st.label || '';
    if (label !== lastLabel) {
      lastLabel = label;
      clockEl.textContent = s('clock', { n: st.day, hhmm: label });
    }
    if (st.day !== lastDay) {
      lastDay = st.day;
      const ripened = advancePlants(state, st.day);
      saveState(state);
      paint(st.day);
      if (ripened > 0) showToast(s('toast.ripe', { n: ripened }));
    }
  }

  const unTick = (clock && typeof clock.onTick === 'function')
    ? clock.onTick(tickText)
    : (() => {});

  /* ---------- song ngữ ---------- */

  const unLang = onLangChange(() => {
    applyTexts();
    const st = clock && typeof clock.state === 'function' ? clock.state() : null;
    if (st) { lastLabel = ''; tickText(st); }
  });

  /* ---------- chạy ---------- */

  applyTexts();
  if (clock && typeof clock.state === 'function') tickText(clock.state());
  /* Cây vừa được đôn theo ngày hiện tại ở đầu hàm. Ghi lại ngay để
     lần mở sau đọc đúng giai đoạn, kể cả khi người chơi đóng màn
     mà không bấm gì. */
  saveState(state);

  /* Lớp is-open phải vào sau khi trình duyệt đã vẽ khung hình đầu,
     nếu không hiệu ứng mờ dần bị bỏ qua và panel hiện đột ngột.
     Thêm một mốc thời gian dự phòng: tab bị ẩn thì requestAnimationFrame
     không chạy, panel sẽ kẹt ở trạng thái trong suốt. */
  let opened = false;
  const openNow = () => {
    if (opened || closed) return;
    opened = true;
    el.classList.add('is-open');
    closeBtn.focus();
  };
  requestAnimationFrame(openNow);
  const openTimer = setTimeout(openNow, 80);

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    unTick();
    unLang();
    document.removeEventListener('keydown', onKey);
    clearTimeout(toastTimer);
    clearTimeout(toastHide);
    clearTimeout(openTimer);
    el.remove();
    if (prevFocus && typeof prevFocus.focus === 'function' && document.contains(prevFocus)) {
      prevFocus.focus();
    }
  }

  return { destroy };
}
