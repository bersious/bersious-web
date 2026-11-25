/* ============================================================
   explore.js
   Màn ĐI THÁM HIỂM: lớp phủ toàn màn đè lên căn cứ.

   Bản đồ 20 ô quanh căn cứ, bấm ô chưa thám hiểm thì lùng sục
   3 tới 5 giây, xong rút thăm một trong bốn kết quả. Mỗi ngày
   tối đa 3 lượt. Trạng thái lưu localStorage 'smdg.explore'.

   File này chỉ logic + dựng DOM. Màu, cỡ, khoảng cách nằm trong
   css/explore.css và css/tokens.css.
   ============================================================ */

import { getLang, onLangChange } from './i18n.js';
import { playClick } from './audio.js';
import { loadQuest, markExcavated, PROBE_NOTICE_DAY } from './probe-quest.js';

const BASE_URL = new URL('.', import.meta.url).href;

function injectCss() {
  if (document.querySelector('link[data-explore-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/explore.css';
  link.dataset.exploreCss = '1';
  document.head.appendChild(link);
}

/* ---------- song ngữ, khai báo ngay trong file ---------- */

const STRINGS = {
  vi: {
    'exp.title': 'Khu vực quanh căn cứ',
    'exp.subtitle': 'Chọn một ô chưa lùng sục để ra ngoài tìm đồ.',
    'exp.close': 'Đóng',
    'exp.turnsLeft': 'Còn {n} lượt hôm nay',
    'exp.turnsOut': 'Hết lượt hôm nay. Nghỉ đã, mai lùng tiếp.',
    'exp.done': 'Đã lùng xong',
    'exp.searching': 'Đang lùng sục...',
    'exp.result.found': 'Tìm thấy',
    'exp.result.nothing': 'Không tìm thấy gì',
    'exp.result.drain': 'Tìm thấy nhưng tốn pin',
    'exp.result.incident': 'Sự cố nhỏ',
    'exp.msg.nothing': 'Lục hết góc này, túi vẫn trống trơn.',
    'exp.msg.drain': 'Máy đo pin của bộ đồ tụt 15%. Đồ vẫn nhét được vào túi.',
    'exp.msg.incident': 'Bão bụi ập tới từ hướng tây. Phải quay về căn cứ ngay, mất thêm một giờ.',
    'exp.msg.hour': 'Đã mất 1 giờ trong game.',
    /* Ten vat pham nhat duoc. Phai khop dung id trong LOOT va ten
       trong ITEMS cua hab-stats.js. Lech ten thi toast hien chuoi tho
       kieu exp.item.tape thay vi ten tieng Viet. */
    'exp.item.ration': 'Gói khẩu phần',
    'exp.item.water_bottle': 'Bình nước',
    'exp.item.tape': 'Băng keo chịu lực',
    'exp.item.electronics': 'Linh kiện điện tử',
    'exp.item.hydrazine': 'Bình hydrazine',
    'exp.item.media': 'Đĩa nhạc cũ',
    'exp.item.potato_seed': 'Mẫu hạt giống',
    'exp.terrain.rock': 'Bãi đá đỏ',
    'exp.terrain.wreck': 'Xác tàu đổ bộ',
    'exp.terrain.solar': 'Giàn pin mặt trời',
    'exp.terrain.sand': 'Hố cát',
    'exp.terrain.track': 'Vết bánh xe cũ',
    'exp.terrain.ridge': 'Sườn đồi dốc',
    'exp.terrain.ice': 'Mặt băng bám bụi',
    'exp.terrain.cave': 'Miệng hang nông',
    'exp.terrain.antenna': 'Chân ăng-ten gãy',
    'exp.terrain.crater': 'Miệng hố nhỏ',
    'exp.terrain.pipe': 'Ống dẫn nước lộ ra',
    'exp.terrain.dune': 'Đụn cát cao',
    'exp.terrain.plant': 'Nhà kính đổ nát',
    'exp.terrain.rover': 'Xe rover kẹt cát',
    'exp.terrain.boulder': 'Đá tảng lăn',
    'exp.terrain.dig': 'Hố đào bỏ dở',
    'exp.terrain.panel': 'Tấm chắn rơi',
    'exp.terrain.well': 'Giếng khoan cũ',
    'exp.terrain.flag': 'Cột cờ cong',
    'exp.terrain.debris': 'Bãi rải vụn kim loại',
    'exp.resultBtn': 'Đã hiểu',
    'exp.energy': 'Năng lượng bộ đồ',
    'exp.probe': 'Đào máy phát từ xác tàu',
    'exp.probe.hint': 'Xác tàu thăm dò nằm ở ô này. Bấm để đào nó lên.',
    'exp.probe.done': 'Đã đào được máy phát. Về căn cứ sửa ba món rồi phát tín hiệu.',
  },

  en: {
    'exp.title': 'Grounds around the base',
    'exp.subtitle': 'Pick a spot you have not searched yet and go look for gear.',
    'exp.close': 'Close',
    'exp.turnsLeft': '{n} trips left today',
    'exp.turnsOut': 'No trips left today. Rest up, search again tomorrow.',
    'exp.done': 'Searched',
    'exp.searching': 'Searching...',
    'exp.result.found': 'Found',
    'exp.result.nothing': 'Nothing found',
    'exp.result.drain': 'Found, but the suit drained',
    'exp.result.incident': 'Small incident',
    'exp.msg.nothing': 'Turned over every rock here. The pack is still empty.',
    'exp.msg.drain': 'The suit battery gauge dropped 15%. The gear still fits in the pack.',
    'exp.msg.incident': 'A dust wall rolled in from the west. Back to the base now, one more hour gone.',
    'exp.msg.hour': '1 in-game hour spent.',
    'exp.item.ration': 'Ration pack',
    'exp.item.water_bottle': 'Water bottle',
    'exp.item.tape': 'Duct tape',
    'exp.item.electronics': 'Electronics',
    'exp.item.hydrazine': 'Hydrazine tank',
    'exp.item.media': 'Old record',
    'exp.item.potato_seed': 'Seed sample',
    'exp.terrain.rock': 'Red boulder field',
    'exp.terrain.wreck': 'Lander wreck',
    'exp.terrain.solar': 'Solar array row',
    'exp.terrain.sand': 'Sand pit',
    'exp.terrain.track': 'Old wheel tracks',
    'exp.terrain.ridge': 'Steep ridge',
    'exp.terrain.ice': 'Dust-caked ice patch',
    'exp.terrain.cave': 'Shallow cave mouth',
    'exp.terrain.antenna': 'Snapped antenna base',
    'exp.terrain.crater': 'Small crater',
    'exp.terrain.pipe': 'Exposed water pipe',
    'exp.terrain.dune': 'Tall dune',
    'exp.terrain.plant': 'Collapsed greenhouse',
    'exp.terrain.rover': 'Rover stuck in sand',
    'exp.terrain.boulder': 'Toppled boulder',
    'exp.terrain.dig': 'Abandoned dig hole',
    'exp.terrain.panel': 'Fallen shield panel',
    'exp.terrain.well': 'Old drill well',
    'exp.terrain.flag': 'Bent flag pole',
    'exp.terrain.debris': 'Metal debris field',
    'exp.resultBtn': 'Got it',
    'exp.energy': 'Suit energy',
    'exp.probe': 'Dig the transmitter out of the probe',
    'exp.probe.hint': 'The probe wreck is on this cell. Tap to dig it up.',
    'exp.probe.done': 'Transmitter dug out. Back at the base, repair the three parts and transmit.',
  },
};

function tr(key) {
  const lang = getLang();
  return (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.vi[key] ?? key;
}

/* ---------- bảng dữ liệu 20 ô ---------- */

const TERRAIN_ICONS = {
  rock: `<path d="M6 19 9 9l4-3 5 4 1 9z"/><path d="M9 9l3 4 4-2"/>`,
  wreck: `<path d="M4 18h16"/><path d="M7 18V9l5-4 5 4v9"/><path d="M10 12h4"/>`,
  solar: `<path d="M3 5h18v9H3z"/><path d="M7 5v9M12 5v9M17 5v9M3 9.5h18"/><path d="M12 14v5M8 19h8"/>`,
  sand: `<path d="M3 18c3-6 7-8 9-8s6 2 9 8"/><path d="M8 18c1-3 3-4 4-4"/>`,
  track: `<path d="M3 16c4 0 4-4 8-4s4 4 8 4"/><path d="M3 19c4 0 4-4 8-4s4 4 8 4"/>`,
  ridge: `<path d="M3 19 10 5l4 8 3-4 4 10z"/>`,
  ice: `<path d="M12 3v18M5 7l14 10M19 7 5 17"/><path d="M12 3l-2 3h4zM12 21l-2-3h4z"/>`,
  cave: `<path d="M3 19h18"/><path d="M5 19c0-6 3-10 7-10s7 4 7 10"/><path d="M9 19c0-3 1.5-5 3-5s3 2 3 5"/>`,
  antenna: `<path d="M4 19h16"/><path d="M12 19V9"/><path d="M12 9 17 4"/><path d="M8 6l4 3"/>`,
  crater: `<ellipse cx="12" cy="15" rx="8" ry="4"/><path d="M8 13c1-2 6-2 8 0"/>`,
  pipe: `<path d="M3 14h11a3 3 0 0 0 3-3V5"/><path d="M17 3h4v4h-4z"/><path d="M3 12v4"/>`,
  dune: `<path d="M3 19c2-8 6-11 9-11s7 3 9 11z"/><path d="M9 12c1-2 3-2 5-1"/>`,
  plant: `<path d="M3 19h18"/><path d="M4 19 7 8h10l3 11"/><path d="M9 8 8 3M15 8l1-5"/><path d="M10 19v-5h4v5"/>`,
  rover: `<circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M4 14h12l3 3"/><path d="M8 14V9h6l2 5"/>`,
  boulder: `<circle cx="10" cy="12" r="6"/><path d="M17 18l4 1"/>`,
  dig: `<path d="M4 19h16"/><path d="M7 19c0-4 2-7 5-7s5 3 5 7"/><path d="M11 12l6-8"/>`,
  panel: `<path d="M4 19h16"/><path d="M6 19 8 8l9-3 1 11"/><path d="M9 12l7-2"/>`,
  well: `<path d="M4 19h16"/><path d="M8 19v-6h8v6"/><path d="M8 13l4-8 4 8"/><path d="M12 5v4"/>`,
  flag: `<path d="M6 21V4"/><path d="M6 5c4-2 8 2 12 0v6c-4 2-8-2-12 0"/>`,
  debris: `<path d="M4 19h16"/><path d="M6 16l3-4 2 4zM13 16l2-3 3 3z"/><path d="M9 8h3M15 6h2"/>`,
};

/* 5x4 = 20 ô, mỗi ô một loại địa hình. */
const SITES = [
  'rock', 'wreck', 'solar', 'sand',
  'track', 'ridge', 'ice', 'cave',
  'antenna', 'crater', 'pipe', 'dune',
  'plant', 'rover', 'boulder', 'dig',
  'panel', 'well', 'flag', 'debris',
];

/* ---------- bảng tỉ lệ kết quả ---------- */
/* 45% tìm thấy đồ, 20% không có gì, 20% tìm thấy nhưng tụt pin,
   15% bão bụi phải quay về. Tổng 100. */
const OUTCOMES = [
  { id: 'found',    weight: 45 },
  { id: 'nothing',  weight: 20 },
  { id: 'drain',    weight: 20 },
  { id: 'incident', weight: 15 },
];

/* Danh sách vật phẩm tìm được khi thám hiểm. id phải khớp CHÍNH XÁC
   với id trong hab-stats.js, nếu không thì nhặt được đồ mà kho không
   nhận, và người chơi không bao giờ đủ điều kiện mở nông trại.

   Hạt giống để tỉ lệ thấp nhưng vẫn có, vì nó là điều kiện mở khoá
   nông trại, thiếu nó là kẹt cứng không lối thoát. */
const FIND_ITEMS = [
  { id: 'ration',      min: 1, max: 2 },
  { id: 'water_bottle', min: 1, max: 2 },
  { id: 'tape',        min: 1, max: 2 },
  { id: 'electronics', min: 1, max: 2 },
  { id: 'hydrazine',   min: 1, max: 1 },
  { id: 'media',       min: 1, max: 1 },
  { id: 'potato_seed', min: 1, max: 1, rare: true },
];

/* Vật phẩm hiếm chỉ rơi khi qua được bước tung xúc xắc phụ. */
const RARE_CHANCE = 0.14;

const DRAIN_PCT = 15;          // tụt pin khi gặp kết quả 'drain'
const INCIDENT_EXTRA_HOURS = 1; // bão bụi mất thêm một giờ
const MAX_TRIPS_PER_DAY = 3;
const STORE_KEY = 'smdg.explore';
const SEARCH_MIN_MS = 3000;
const SEARCH_MAX_MS = 5000;

function rollOutcome() {
  const total = OUTCOMES.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of OUTCOMES) {
    r -= o.weight;
    if (r < 0) return o.id;
  }
  return 'nothing';
}

function rollItem() {
  /* Vật phẩm hiếm chỉ xuất hiện sau khi qua xúc xắc phụ, nên hạt
     giống không rơi quá nhiều nhưng vẫn chắc chắn có đường lấy. */
  const pool = FIND_ITEMS.filter((it) => !it.rare || Math.random() < RARE_CHANCE);
  const list = pool.length ? pool : FIND_ITEMS;
  const it = list[Math.floor(Math.random() * list.length)];
  const qty = it.min + Math.floor(Math.random() * (it.max - it.min + 1));
  return { id: it.id, qty };
}

/* ---------- lưu trạng thái ---------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (Array.isArray(s.cells) && s.cells.length === 20) return s;
    }
  } catch (err) { /* hỏng thì dựng lại từ đầu */ }
  return {
    cells: SITES.map((type) => ({ done: false, type })),
    tripsLeft: MAX_TRIPS_PER_DAY,
    day: 1,
  };
}

function saveState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (err) { /* không lưu được thì chơi tạm trong phiên */ }
}

/* ============================================================ */

export function openExplore({ container, clock, playerName = '', onClose, onFind } = {}) {
  injectCss();

  const state = loadState();

  const el = document.createElement('div');
  el.className = 'exp-screen';
  el.innerHTML = `
    <div class="exp-backdrop"></div>
    <div class="exp-panel" role="dialog" aria-modal="true" aria-labelledby="exp-title">
      <header class="exp-head">
        <div class="exp-head-text">
          <h2 id="exp-title" class="exp-title"></h2>
          <p class="exp-subtitle"></p>
        </div>
        <div class="exp-head-right">
          <span class="exp-turns" role="status"></span>
          <button type="button" class="exp-close" aria-label="">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18"/>
            </svg>
          </button>
        </div>
      </header>

      <div class="exp-map" role="group"></div>

      <div class="exp-result" hidden>
        <button type="button" class="exp-result-card">
          <span class="exp-result-icon" aria-hidden="true"></span>
          <span class="exp-result-body">
            <span class="exp-result-kind"></span>
            <span class="exp-result-name"></span>
            <span class="exp-result-note"></span>
          </span>
        </button>
      </div>

      <div class="exp-probe" hidden>
        <button type="button" class="exp-probe-btn">
          <span class="exp-probe-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19h16"/><path d="M7 19V9l5-4 5 4v10"/><path d="M10 12h4"/>
              <path d="M9 19v-3h6v3"/></svg>
          </span>
          <span class="exp-probe-body">
            <span class="exp-probe-title"></span>
            <span class="exp-probe-hint"></span>
          </span>
        </button>
      </div>

      <p class="exp-foot"></p>
    </div>
  `;
  container.appendChild(el);

  const q = (sel) => el.querySelector(sel);
  const map = q('.exp-map');
  const turnsEl = q('.exp-turns');
  const closeBtn = q('.exp-close');
  const resultBox = q('.exp-result');
  const resultCard = q('.exp-result-card');
  const resultIcon = q('.exp-result-icon');
  const resultKind = q('.exp-result-kind');
  const resultName = q('.exp-result-name');
  const resultNote = q('.exp-result-note');
  const footEl = q('.exp-foot');
  const probeBox = q('.exp-probe');
  const probeBtn = q('.exp-probe-btn');
  const probeTitle = q('.exp-probe-title');
  const probeHint = q('.exp-probe-hint');

  const RESULT_ICONS = {
    found: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 12l5 5L20 6"/></svg>`,
    nothing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M7 7l10 10"/></svg>`,
    drain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="8" width="16" height="9" rx="2"/><path d="M21 11v3"/><path d="M7 8v9"/></svg>`,
    incident: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 4 3 19h18z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>`,
  };

  /* ---------- dựng lưới bản đồ ---------- */

  function buildMap() {
    map.innerHTML = '';
    state.cells.forEach((cell, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'exp-cell' + (cell.done ? ' is-done' : '');
      btn.dataset.index = String(i);
      btn.innerHTML = `
        <span class="exp-cell-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round">${TERRAIN_ICONS[cell.type] || TERRAIN_ICONS.rock}</svg>
        </span>
        <span class="exp-cell-name"></span>
        <span class="exp-cell-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
        </span>
        <span class="exp-cell-progress" aria-hidden="true"><span class="exp-cell-fill"></span></span>`;
      btn.addEventListener('click', () => onCellClick(i, btn));
      map.appendChild(btn);
    });
    applyTexts();
  }

  /* ---------- đếm lượt ---------- */

  function checkNewDay() {
    if (!clock) return;
    const s = clock.state();
    if (s.day !== state.day) {
      state.day = s.day;
      state.tripsLeft = MAX_TRIPS_PER_DAY;
      saveState(state);
      renderTurns();
    }
  }

  function renderTurns() {
    turnsEl.textContent = tr('exp.turnsLeft').replace('{n}', String(state.tripsLeft));
    turnsEl.classList.toggle('is-out', state.tripsLeft <= 0);
  }

  /* ---------- cầu nối chuỗi xác tàu thăm dò ----------
     Chỗ DUY NHẤT để đào máy phát. Trước đây base.js có nhánh
     onAction('excavate') nhưng không nút nào bấm tới nó, nên chuỗi
     quest đứng im ở bước "nhớ ra xác tàu": không bao giờ đào được,
     màn sửa chữa không bao giờ mở, và ván chơi kẹt vĩnh viễn.

     Nút chỉ hiện khi đã nghe thông báo (ngày 6 trở đi) và chưa đào.
     Đào xong thì ghi vào smdg.probeQuest qua markExcavated(). */
  let quest = loadQuest();

  function refreshProbe() {
    if (!probeBox) return;
    if (!quest.noticed || quest.excavated) {
      probeBox.hidden = true;
      return;
    }
    probeBox.hidden = false;
    probeTitle.textContent = tr('exp.probe');
    probeHint.textContent = tr('exp.probe.hint');
    probeBtn.setAttribute('aria-label', tr('exp.probe') + '. ' + tr('exp.probe.hint'));
  }

  probeBtn?.addEventListener('click', () => {
    if (quest.excavated) return;
    playClick();
    const day = clock && typeof clock.state === 'function' ? clock.state().day : PROBE_NOTICE_DAY;
    markExcavated(quest, day);
    showToast(footEl, tr('exp.probe.done'));
    if (typeof onFind === 'function') {
      /* Không đẩy vật phẩm: máy phát là vật cốt truyện, nằm trong trạng
         thái quest chứ không nằm trong kho. Chỉ báo cho màn căn cứ biết
         để ghi nhật ký. */
      onFind({ id: 'probe_transmitter', name: tr('exp.probe'), qty: 1, quest: true });
    }
    refreshProbe();
  });

  /* ---------- đẩy đồng hồ thêm giờ ----------
     game-time.js không có hàm cộng phút, chỉ có skipTo. Dùng skipTo khi
     còn đủ chỗ trong ngày; nếu đã sát nửa đêm thì thôi, để đồng hồ tự
     chạy tiếp chứ không nhảy lùi. */

  function advanceHour(hours) {
    if (!clock || typeof clock.skipTo !== 'function') return;
    const s = clock.state();
    const target = s.minutes + hours * 60;
    if (target < 24 * 60) clock.skipTo(target);
  }

  /* ---------- thám hiểm một ô ---------- */

  let searching = false;

  function onCellClick(i, btn) {
    checkNewDay();
    if (searching) return;
    if (state.cells[i].done) return;
    if (state.tripsLeft <= 0) {
      playClick();
      showToast(footEl, tr('exp.turnsOut'));
      return;
    }
    playClick();
    searching = true;

    const duration = SEARCH_MIN_MS + Math.random() * (SEARCH_MAX_MS - SEARCH_MIN_MS);
    btn.classList.add('is-searching');
    const fill = btn.querySelector('.exp-cell-fill');
    const start = performance.now();

    /* Hai đường chạy song song, đường nào tới trước thì thắng.
       requestAnimationFrame cho thanh mượt, nhưng rAF bị trình duyệt
       hoãn hẳn khi tab bị ẩn hoặc cửa sổ mất focus — lúc đó tick()
       không bao giờ chạy tiếp, thanh đứng im và `searching` kẹt ở true,
       người chơi không bấm tìm được nữa. setTimeout 100ms lo phần bảo
       hiểm: chạy được cả khi tab ẩn. Biến done chống chạy finish hai lần
       vì hai đường có thể cùng chạm đích trong một nhịp. */
    let done = false;
    const finishOnce = (now) => {
      if (done) return;
      const p = Math.min(1, (now - start) / duration);
      fill.style.width = (p * 100).toFixed(1) + '%';
      if (p < 1) return;
      done = true;
      clearInterval(iv);
      finish(i, btn);
    };

    function tick(now) {
      if (done) return;
      const p = Math.min(1, (now - start) / duration);
      fill.style.width = (p * 100).toFixed(1) + '%';
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        done = true;
        clearInterval(iv);
        finish(i, btn);
      }
    }

    const iv = setInterval(() => finishOnce(performance.now()), 100);
    requestAnimationFrame(tick);
  }

  function finish(i, btn) {
    btn.classList.remove('is-searching');
    btn.querySelector('.exp-cell-fill').style.width = '0';

    state.cells[i].done = true;
    state.tripsLeft -= 1;
    saveState(state);
    btn.classList.add('is-done');
    renderTurns();

    const outcome = rollOutcome();
    let kind, name, note;

    if (outcome === 'found' || outcome === 'drain') {
      const item = rollItem();
      kind = tr('exp.result.' + outcome);
      name = tr('exp.item.' + item.id) + ' ×' + item.qty;
      note = outcome === 'drain'
        ? tr('exp.msg.drain')
        : tr('exp.msg.hour');
      if (onFind) onFind({ id: item.id, name: tr('exp.item.' + item.id), qty: item.qty });
    } else if (outcome === 'nothing') {
      kind = tr('exp.result.nothing');
      name = tr('exp.terrain.' + state.cells[i].type);
      note = tr('exp.msg.nothing');
    } else {
      kind = tr('exp.result.incident');
      name = tr('exp.terrain.' + state.cells[i].type);
      note = tr('exp.msg.incident') + ' ' + tr('exp.msg.hour');
    }

    resultIcon.innerHTML = RESULT_ICONS[outcome];
    resultIcon.className = 'exp-result-icon exp-ri-' + outcome;
    resultKind.textContent = kind;
    resultName.textContent = name;
    resultNote.textContent = note;
    resultBox.hidden = false;
    searching = false;

    /* mỗi lần ra ngoài tốn một giờ, bão bụi thì thêm một giờ nữa */
    advanceHour(outcome === 'incident' ? 1 + INCIDENT_EXTRA_HOURS : 1);
    checkNewDay();
  }

  resultCard.addEventListener('click', () => {
    playClick();
    resultBox.hidden = true;
  });

  /* ---------- thông báo ngắn trong panel ---------- */

  let footTimer = null;
  function showToast(node, msg) {
    node.textContent = msg;
    node.classList.add('is-flash');
    clearTimeout(footTimer);
    footTimer = setTimeout(() => node.classList.remove('is-flash'), 2000);
  }

  /* ---------- đóng ---------- */

  function close() {
    playClick();
    el.classList.remove('is-open');
    setTimeout(() => {
      if (onClose) onClose();
      destroy();
    }, 180);
  }
  closeBtn.addEventListener('click', close);

  /* ---------- song ngữ ---------- */

  function applyTexts() {
    q('.exp-title').textContent = tr('exp.title');
    q('.exp-subtitle').textContent = tr('exp.subtitle');
    closeBtn.setAttribute('aria-label', tr('exp.close'));
    renderTurns();
    for (const btn of map.querySelectorAll('.exp-cell')) {
      const cell = state.cells[Number(btn.dataset.index)];
      const nameEl = btn.querySelector('.exp-cell-name');
      nameEl.textContent = tr('exp.terrain.' + cell.type);
      btn.title = cell.done
        ? tr('exp.done') + ': ' + nameEl.textContent
        : nameEl.textContent;
    }
    resultCard.setAttribute('aria-label', tr('exp.resultBtn'));
    refreshProbe();
  }

  const unLang = onLangChange(() => applyTexts());

  /* ---------- mở ---------- */

  checkNewDay();
  buildMap();
  /* đồng hồ sang ngày mới thì trả lại 3 lượt ngay, không đợi người chơi bấm */
  const unTick = clock && typeof clock.onTick === 'function'
    ? clock.onTick(() => checkNewDay())
    : () => {};
  /* is-open phải vào sau khung hình đầu để hiệu ứng mở chạy. Nhưng rAF
     KHÔNG được là đường duy nhất: tab ẩn hoặc cửa sổ mất focus thì nó
     không chạy, và màn thám hiểm kẹt ở trạng thái trong suốt (vẫn bấm
     được nhưng người chơi không thấy gì). setTimeout làm đường chính.
     shown chống gắn class hai lần khi cả hai đường cùng chạy. */
  let shown = false;
  const show = () => {
    if (shown || !el.isConnected) return;
    shown = true;
    el.classList.add('is-open');
  };
  requestAnimationFrame(show);
  window.setTimeout(show, 32);
  closeBtn.focus();

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    unLang();
    unTick();
    clearTimeout(footTimer);
    el.remove();
  }

  return { destroy };
}
