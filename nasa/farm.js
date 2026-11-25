/* ============================================================
   farm.js
   Màn NÔNG TRẠI: mười hai khay đất trong nhà kính của căn cứ.

   Người chơi gieo khoai, chờ ba ngày trong game, rồi bấm khay
   đã chín để thu hoạch. Mỗi lần gieo tốn mười hai đơn vị nước và
   một hạt. Hết nước hoặc hết hạt thì khay trống mờ đi và một dòng
   chữ nói rõ vì sao.

   NƯỚC DÙNG CHUNG: bản trước file này giữ một bể riêng 100 đơn vị,
   tách hẳn khỏi chỉ số nước của phi hành gia, nên người chơi thấy vô
   lý: tưới cây bằng nước ở đâu ra mà không ảnh hưởng nước uống. Nay
   cả game chỉ có MỘT lượng nước. Gieo một khay là gọi
   stats.spendWater(WATER_COST), tức trừ thẳng vào nước của chính
   phi hành gia. Thanh nước trong màn này đọc đúng con số đó.

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

    'res.water': 'Nước dùng chung',
    'res.seeds': 'Hạt',
    'res.waterVal': '{n} / 100',
    'res.seedsVal': '{n} / 20',
    'res.waterNote': 'Đây là nước của chính bạn. Tưới cây là uống bớt phần của mình.',

    'state.empty': 'Trống',
    'state.planted': 'Ngày {n}/3',
    'state.grown': '{n}%',
    'state.ripe': 'Chín',

    'act.sow': 'Bấm để gieo',
    'act.harvest': 'Bấm để thu hoạch',
    'act.growing': 'Cây đang lên',

    'note.noWater': 'Không đủ nước dùng chung. Còn thiếu {n} đơn vị cho một khay.',
    'note.noSeeds': 'Kho hạt trống. Cần 1 hạt cho mỗi khay.',
    'note.noBoth': 'Hết cả nước lẫn hạt. Không gieo được khay nào.',

    'toast.sow': 'Đã gieo một khay. Tốn {n} nước dùng chung và 1 hạt.',
    'toast.harvest': 'Thu được {kg} kg khoai.',
    'toast.ripe': '{n} khay vừa chín.',

    'foot.ripe': '{n} khay chín',
    'foot.used': '{n} nước đã tưới',
    'foot.rule': 'Ba ngày một vụ. Mỗi khay: {n} nước chung, 1 hạt.',
    'foot.esc': 'Esc để đóng',

    'aria.plot': 'Khay {n}, {state}',
    'aria.water': 'Nước dùng chung còn {n} trên 100',
    'aria.seeds': 'Hạt còn {n} trên 20',
  },

  en: {
    'title': 'Grow bay',
    'sub': 'Twelve soil trays under the lamps. Potatoes come up in three days.',
    'close': 'Close',
    'clock': 'Day {n} · {hhmm}',

    'res.water': 'Shared water',
    'res.seeds': 'Seeds',
    'res.waterVal': '{n} / 100',
    'res.seedsVal': '{n} / 20',
    'res.waterNote': 'This is your own drinking water. Irrigation comes out of it.',

    'state.empty': 'Empty',
    'state.planted': 'Day {n}/3',
    'state.grown': '{n}%',
    'state.ripe': 'Ripe',

    'act.sow': 'Tap to sow',
    'act.harvest': 'Tap to harvest',
    'act.growing': 'Still growing',

    'note.noWater': 'Not enough shared water. Each tray still needs {n} more units.',
    'note.noSeeds': 'The seed locker is empty. Each tray needs 1 seed.',
    'note.noBoth': 'No water and no seeds left. Nothing can be sown.',

    'toast.sow': 'One tray sown: {n} shared water and one seed spent.',
    'toast.harvest': 'Harvested {kg} kg of potatoes.',
    'toast.ripe': '{n} trays just ripened.',

    'foot.ripe': '{n} ripe trays',
    'foot.used': '{n} water irrigated',
    'foot.rule': 'Three days per crop. Each tray: {n} shared water, 1 seed.',
    'foot.esc': 'Esc to close',

    'aria.plot': 'Tray {n}, {state}',
    'aria.water': 'Shared water {n} of 100 left',
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
const SEED_COST = 1;
const SEEDS_MAX = 20;
const KG_MIN = 2.5;
const KG_MAX = 3.5;

/* ---------- chi phí nước mỗi khay: 12 đơn vị ----------

   Cách tính, toàn số thật lấy từ hab-stats.js và game-time.js:

   1. Nước tiêu thật mỗi giờ game
      BALANCE.drain.water 3,5 × (1 - waterRecycler 0,70) = 1,05 nước/giờ.
      Có bộ lọc nước (waterFilter) thì còn 3,5 × 0,3 × 0,3 = 0,315.

   2. Một ngày game dài bao nhiêu
      game-time.js: MIN_PER_DAY 1440 phút game = 24 giờ game.
      Vậy 1,05 × 24 = 25,2 đơn vị nước mỗi ngày. 35 Sol cần khoảng
      882 đơn vị nếu không uống gì thêm. Kho ban đầu: 14 bình × 40 =
      560, cộng 70 sẵn có = 630; thám hiểm và đốt hydrazine (2 bình ×
      5 bình nước × 40 = 400) bù phần còn lại.

   3. Một khay khoai đổi được bao nhiêu calo
      base.js đổi kg thành củ: qty = round(kg / 0,25). Một khay cho
      2,5 tới 3,5 kg, tức 10 tới 14 củ. ITEMS.potato = 30 calo/củ,
      nên một khay cho 300 tới 420 calo.
      Người chơi tiêu 2,5 calo/giờ × 24 = 60 calo/ngày.
      Vậy MỘT khay nuôi được 5 tới 7 ngày calo.

   4. Quy ra ngày sống
      12 nước = 12 / 1,05 = 11,4 giờ uống, tức chưa tới nửa ngày
      sinh tồn. Đổi nửa ngày nước lấy 5 tới 7 ngày calo là lời rõ
      rệt, nên trồng luôn đáng. Nhưng nếu dồn cả 12 khay một lượt
      thì tốn 144 nước = 5,7 ngày nước cho một vụ, và đó là cái giá
      đủ đắt để người chơi phải chọn gieo bao nhiêu khay.

   5. Kiểm bằng mô phỏng (scripts/sim-water-farm.mjs, 16 ván mỗi mức)
        4 nước/khay : minh mẫn sống 35/35, nước thấp nhất 53 → không
                      còn áp lực gì, tưới cây thành miễn phí.
        8 nước/khay : sống 35/35, nước thấp nhất 52 → vẫn dư.
       12 nước/khay : sống 35/35, nước thấp nhất 26 → áp lực thật,
                      vừa chạm ngưỡng cảnh báo 25 của HUD.
       16 nước/khay : sống 35/35 nhưng nước thấp nhất 8, chỉ cần một
                      trận bão bụi là chết oan.
      Người chơi dở (uống khi cạn, ngủ 19:00, dồn 12 khay một lượt)
      chết trung bình ở Sol 17 với mọi mức từ 6 trở lên: chênh lệch
      giữa chơi tốt và chơi dở là rõ ràng, không phải may rủi.

   Chọn 12. Đây là con số duy nhất vừa giữ được áp lực (nước xuống
   tới 26) vừa không giết người chơi cẩn thận ở Sol 35.
   ------------------------------------------------------------ */

const WATER_COST = 12;

/* Thang của thanh nước. Chỉ số nước của phi hành gia cũng chạy 0 tới
   100 (MAX trong hab-stats.js), nên thanh vẽ đúng tỉ lệ mà không phải
   quy đổi. Không phải dung tích bể: bể riêng đã bỏ. */
const WATER_MAX = 100;

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

/* Dải ghi chú "nước dùng chung" cần một kiểu riêng: .farm-note trong
   farm.css là dải cảnh báo đỏ, dùng cho câu chặn gieo. Ghi chú giải
   thích thì phải trung tính, không được trông như lỗi. Nhét thẳng vào
   đây thay vì sửa farm.css để mọi thay đổi của màn nông trại nằm gọn
   trong một file. */
function injectWaterNoteCss() {
  if (document.getElementById('farm-water-note-css')) return;
  const style = document.createElement('style');
  style.id = 'farm-water-note-css';
  style.textContent = `
    .farm-water-note {
      margin: 0;
      padding: 6px clamp(9px, 1vw, 12px);
      background: var(--bg-inset);
      border-left: 3px solid var(--cyan-dim);
      border-radius: var(--st-radius);
      font-size: var(--st-size-cap);
      line-height: 1.45;
      color: var(--tx-soft);
    }
    @media (max-width: 680px) {
      .farm-water-note { padding: 5px 9px; line-height: 1.35; }
    }
  `;
  document.head.appendChild(style);
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

/* Nước KHÔNG còn nằm trong trạng thái nông trại. Nguồn duy nhất là
   chỉ số của phi hành gia trong hab-stats.js. Ở đây chỉ giữ khay và
   hạt, cộng thêm tổng nước đã tưới để hiện ở chân màn. */
function freshState() {
  return {
    plots: Array.from({ length: PLOT_COUNT }, emptyPlot),
    seeds: SEEDS_MAX,
    waterUsed: 0,
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

  blank.seeds = Number.isFinite(Number(raw.seeds))
    ? clampNum(Math.round(Number(raw.seeds)), 0, SEEDS_MAX)
    : SEEDS_MAX;
  blank.waterUsed = Number.isFinite(Number(raw.waterUsed))
    ? Math.max(0, Math.round(Number(raw.waterUsed)))
    : 0;

  return blank;
}

function saveState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      plots: state.plots.map((p) => ({ state: p.state, plantedDay: p.plantedDay })),
      seeds: state.seeds,
      waterUsed: state.waterUsed,
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

/* stats: đối tượng từ hab-stats.js. Bắt buộc phải có, vì nước tưới
   trừ thẳng vào nước của phi hành gia. Thiếu stats thì màn vẫn dựng
   được nhưng mọi khay bị khoá và thanh nước hiện 0: thà khoá rõ ràng
   còn hơn lặng lẽ cho gieo miễn phí. */
export function openFarm({ container, clock, stats, playerName = '', onClose, onHarvest } = {}) {
  injectCss();
  injectWaterNoteCss();

  const state = loadState();
  const today = () => (clock && typeof clock.state === 'function' ? clock.state().day : 1);
  advancePlants(state, today());

  /* Đọc nước từ chỉ số sinh tồn. Một nguồn duy nhất, không có bể riêng. */
  function waterNow() {
    if (!stats || typeof stats.get !== 'function') return 0;
    const snap = stats.get();
    return Number.isFinite(snap && snap.water) ? snap.water : 0;
  }

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

      <p class="farm-note farm-water-note" aria-live="off"></p>

      <p class="farm-note" role="status" aria-live="polite" hidden></p>

      <div class="farm-body">
        <div class="farm-grid" role="group"></div>
      </div>

      <footer class="farm-foot">
        <span class="farm-foot-rule"></span>
        <span class="farm-foot-sep" aria-hidden="true">·</span>
        <span class="farm-foot-ripe"></span>
        <span class="farm-foot-sep" aria-hidden="true">·</span>
        <span class="farm-foot-used"></span>
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
  const noteEl    = q('.farm-note[role="status"]');
  const waterNoteEl = q('.farm-water-note');
  const gridEl    = q('.farm-grid');
  const ruleEl    = q('.farm-foot-rule');
  const ripeEl    = q('.farm-foot-ripe');
  const usedEl    = q('.farm-foot-used');
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

  /* ---------- cạn tài nguyên ----------
     Nước đọc thẳng từ chỉ số phi hành gia. Câu chặn phải nói rõ còn
     thiếu bao nhiêu, vì "không đủ nước" mà không có số thì người chơi
     không biết phải uống hay chế thêm bao nhiêu mới gieo được. */

  function waterShort() {
    return Math.max(0, Math.ceil((WATER_COST - waterNow()) * 10) / 10);
  }

  function blockedReason() {
    const noWater = waterNow() < WATER_COST;
    const noSeed = state.seeds < SEED_COST;
    if (noWater && noSeed) return s('note.noBoth');
    if (noWater) {
      const short = waterShort();
      const txt = s('note.noWater', { n: short });
      /* Có bản dịch nào quên chỗ {n} thì vẫn phải hiện ra con số. */
      return txt.indexOf('{n}') === -1 ? txt : txt.replace('{n}', String(short));
    }
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

      /* Tooltip chỉ nhắc lại hành động khi khay còn bấm được. Khi bị
         chặn (thiếu nước/hạt) act rỗng nên aria đã là câu đầy đủ; ghép
         thêm lần nữa sẽ lặp "Bấm để gieo" hai lần liền nhau. */
      cell.title = aria;
    }

    const w = waterNow();
    const wPct = clampNum(w / WATER_MAX, 0, 1) * 100;
    const sPct = clampNum(state.seeds / SEEDS_MAX, 0, 1) * 100;
    waterFill.style.width = wPct.toFixed(1) + '%';
    seedFill.style.width = sPct.toFixed(1) + '%';
    waterVal.textContent = s('res.waterVal', { n: Math.round(w * 10) / 10 });
    seedVal.textContent = s('res.seedsVal', { n: state.seeds });
    waterM.classList.toggle('is-low', w < WATER_COST);
    seedM.classList.toggle('is-low', state.seeds < SEED_COST);
    /* Nhãn đọc màn hình phải theo cùng con số với thanh, nếu không
       trình đọc sẽ đọc lượng nước cũ sau khi vừa tưới. */
    waterM.setAttribute('aria-label', s('aria.water', { n: Math.round(w) }));
    seedM.setAttribute('aria-label', s('aria.seeds', { n: state.seeds }));

    if (blocked) {
      if (noteEl.textContent !== blocked) noteEl.textContent = blocked;
      noteEl.hidden = false;
    } else {
      noteEl.hidden = true;
    }

    const ripe = state.plots.filter((p) => p.state === 'ripe').length;
    ripeEl.textContent = s('foot.ripe', { n: ripe });
    usedEl.textContent = s('foot.used', { n: state.waterUsed });
  }

  /* ---------- chữ tĩnh ---------- */

  function applyTexts() {
    titleEl.textContent = s('title');
    subEl.textContent = s('sub');
    closeBtn.setAttribute('aria-label', s('close'));
    waterName.textContent = s('res.water');
    seedName.textContent = s('res.seeds');
    waterNoteEl.textContent = s('res.waterNote');
    ruleEl.textContent = s('foot.rule', { n: WATER_COST });
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
      /* Trừ nước TRƯỚC khi đánh dấu khay đã gieo. spendWater trả ok
         false khi vừa đủ thiếu (ví dụ nước 11,9 mà cần 12): lúc đó
         không được đổi khay thành planted, nếu không người chơi được
         một vụ miễn phí. Trừ xong mới ghi khay. */
      const paid = (stats && typeof stats.spendWater === 'function')
        ? stats.spendWater(WATER_COST)
        : { ok: false, short: WATER_COST, have: 0 };
      if (!paid.ok) {
        playClick();
        const short = Math.round((paid.short || WATER_COST) * 10) / 10;
        showToast(s('note.noWater', { n: short }));
        paint(day);
        return;
      }
      plot.state = 'planted';
      plot.plantedDay = day;
      state.seeds = clampNum(state.seeds - SEED_COST, 0, SEEDS_MAX);
      state.waterUsed += WATER_COST;
      saveState(state);
      playClick();
      paint(day);
      showToast(s('toast.sow', { n: WATER_COST }));
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

  /* ---------- nước chảy trong lúc màn đang mở ----------
     Đồng hồ vẫn chạy sau lưng nên nước của phi hành gia tụt dần ngay
     khi người chơi đứng nhìn khay. Không nối vào stats.onTick thì con
     số đứng yên, người chơi tưởng nước không đổi, rồi bấm gieo và
     thấy nó nhảy một cục.

     onTick bắn rất dày (mỗi khung hình đồng hồ), nên chỉ vẽ lại thanh
     nước chứ không vẽ lại cả mười hai khay.

     KHÔNG dùng requestAnimationFrame: tab bị ẩn (người chơi chuyển
     sang tab khác rồi quay lại) thì rAF không chạy, và thanh nước
     đứng im cho tới lần bấm kế tiếp. Throttle bằng mốc thời gian
     100ms là đủ mượt và chạy được cả khi tab ẩn. */
  const PAINT_MS = 100;
  let lastPaintAt = 0;

  function paintWater() {
    const w = waterNow();
    const wPct = clampNum(w / WATER_MAX, 0, 1) * 100;
    waterFill.style.width = wPct.toFixed(1) + '%';
    waterVal.textContent = s('res.waterVal', { n: Math.round(w * 10) / 10 });
    waterM.classList.toggle('is-low', w < WATER_COST);
    waterM.setAttribute('aria-label', s('aria.water', { n: Math.round(w) }));

    const blocked = blockedReason();
    if (blocked) {
      if (noteEl.textContent !== blocked) noteEl.textContent = blocked;
      noteEl.hidden = false;
    } else if (!noteEl.hidden) {
      noteEl.hidden = true;
    }
    /* Khay trống phải đổi trạng thái mờ theo nước, không chỉ theo hạt. */
    for (let i = 0; i < cells.length; i += 1) {
      const plot = state.plots[i];
      const isBlocked = plot.state === 'empty' && Boolean(blocked);
      cells[i].classList.toggle('is-blocked', isBlocked);
      cells[i].setAttribute('aria-disabled', isBlocked ? 'true' : 'false');
      /* Tooltip và nhãn aria phải theo cùng trạng thái: khi nước vừa
         về đủ, "Bấm để gieo" phải quay lại ngay chứ không đợi lần
         vẽ lại khay kế tiếp. */
      const act = actionFor(plot);
      const aria = s('aria.plot', { n: i + 1, state: tagFor(plot, today()) }) + (act ? '. ' + act : '');
      if (cells[i].getAttribute('aria-label') !== aria) cells[i].setAttribute('aria-label', aria);
      cells[i].title = aria;
    }
  }

  function scheduleWaterPaint() {
    if (closed) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - lastPaintAt < PAINT_MS) return;
    lastPaintAt = now;
    paintWater();
  }

  const unStats = (stats && typeof stats.onTick === 'function')
    ? stats.onTick(scheduleWaterPaint)
    : (() => {});

  /* ---------- chạy ---------- */

  applyTexts();
  if (clock && typeof clock.state === 'function') tickText(clock.state());
  /* Cây vừa được đôn theo ngày hiện tại ở đầu hàm. Ghi lại ngay để
     lần mở sau đọc đúng giai đoạn, kể cả khi người chơi đóng màn
     mà không bấm gì. */
  saveState(state);

  /* Lớp is-open phải vào sau khi trình duyệt đã vẽ khung hình đầu,
     nếu không hiệu ứng mờ dần bị bỏ qua và panel hiện đột ngột.
     Đường CHÍNH là setTimeout: tab bị ẩn thì requestAnimationFrame
     không chạy, panel sẽ kẹt ở trạng thái trong suốt. rAF chỉ để sớm
     hơn một nhịp khi nó có chạy. opened chống gắn class hai lần. */
  let opened = false;
  const openNow = () => {
    if (opened || closed) return;
    opened = true;
    el.classList.add('is-open');
    closeBtn.focus();
  };
  const openTimer = setTimeout(openNow, 80);
  requestAnimationFrame(openNow);

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    unTick();
    unLang();
    unStats();
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
