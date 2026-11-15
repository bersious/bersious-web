/* ============================================================
   base-scene.js
   Sân khấu căn cứ kiểu point-and-click, phủ trọn màn hình.

   Đây là lớp NHÌN, không phải lớp luật chơi: nó dựng ảnh trạm Hab
   full-bleed, đặt phi hành gia và sáu trạm bấm được lên đúng vật
   thể trong tranh, rồi gọi onAction(id) khi người chơi bấm.

   Dùng:
     import { createBaseScene } from './base-scene.js';
     const scene = createBaseScene({ container, stats, clock, onAction });
     scene.setPhase('night');
     scene.setCharState('cold');
     scene.refresh();
     scene.destroy();

   Toạ độ sáu trạm tính bằng phần trăm trên CHÍNH khung ảnh, nên khi
   ảnh co giãn theo kiểu cover thì trạm vẫn dính đúng vật thể. Đọc
   bg-hab.webp (1600x900) để lấy mốc: cửa sổ tròn ở 28/44, tủ đồ
   bên trái ở 11/56, cụm tủ giữa ở 39/61, giàn điều khiển phải giữa
   ở 62/47, bàn làm việc phải dưới ở 84/71.
   ============================================================ */

import { t, getLang, onLangChange } from './i18n.js';

/* CSS nạp bằng URL tuyệt đối dựng từ module, không dùng đường dẫn
   tương đối trần: Vercel có thể phục vụ trang thiếu dấu / ở cuối nên
   href tương đối sẽ 404. */
const BASE_URL = new URL('.', import.meta.url).href;

const ART = {
  habitat: BASE_URL + 'assets/art/bg-hab.webp',
  char: {
    healthy: BASE_URL + 'assets/art/char-healthy.webp',
    tired: BASE_URL + 'assets/art/char-tired.webp',
    cold: BASE_URL + 'assets/art/char-cold.webp',
  },
};

/* Tỉ lệ ảnh gốc. Dùng để tính khung cover, nhờ vậy toạ độ phần trăm
   của trạm trùng khít với pixel của tranh ở mọi bề rộng màn hình. */
const ART_RATIO = 1600 / 900;

/* Đường chân trời trong tranh: chỗ phi hành gia đứng. Tính theo phần
   trăm chiều cao ảnh, đọc từ ảnh thật (mặt sàn bắt đầu khoảng 0,74
   nhưng chỗ đứng chắc chắn nhất là 0,795). */
const FLOOR_Y = 0.795;

const PHASES = ['day', 'night', 'storm'];
const CHAR_STATES = ['healthy', 'tired', 'cold'];

/* ---------- sáu trạm ----------
   x, y là tâm vùng bấm, tính bằng phần trăm khung ảnh.
   label và hint là khoá i18n, luôn có cả vi và en trong i18n.js. */

const STATIONS = [
  /* x, y là tâm vùng bấm tính bằng phần trăm khung ảnh, đọc theo vật
     thể trong bg-hab.webp. mx, my là vị trí cho màn dọc hẹp.

     Vì sao cần bộ toạ độ thứ hai: tranh 16:9, màn điện thoại dọc tỉ lệ
     390x844. Phóng tranh cho phủ kín màn thì chỉ còn 26 phần trăm bề
     ngang ảnh hiện ra, tủ đồ ở 11 phần trăm và bàn làm việc ở 84 phần
     trăm rơi ra ngoài cả hai mép, không bấm được. Nên trên màn dọc
     sáu trạm xếp lại thành lưới hai cột ba hàng trong vùng ngón tay
     với tới, nhãn luôn hiện nên vẫn rõ trạm nào là gì. */
  /* side: nhãn đặt về phía nào của nút. Nhãn luôn hiện trên màn rộng,
     nên phải chọn phía để nhãn không đè lên nhân vật đứng giữa trạm
     (tâm ảnh 44,5 phần trăm bề ngang). */
  { id: 'comms',      x: 62, y: 46, mx: 84.5, my: 30, side: 'right', label: 'scene.hotspot.comms',      hint: 'scene.hotspot.comms.hint' },
  { id: 'lifesupport', x: 36, y: 58, mx: 15.5, my: 30, side: 'left',  label: 'scene.hotspot.lifesupport', hint: 'scene.hotspot.lifesupport.hint' },
  { id: 'bag',        x: 12, y: 55, mx: 15.5, my: 50, side: 'right', label: 'scene.hotspot.bag',        hint: 'scene.hotspot.bag.hint' },
  { id: 'craft',      x: 84, y: 72, mx: 84.5, my: 50, side: 'left',  label: 'scene.hotspot.craft',      hint: 'scene.hotspot.craft.hint' },
  { id: 'explore',    x: 80, y: 87, mx: 84.5, my: 70, side: 'left',  label: 'scene.hotspot.explore',    hint: 'scene.hotspot.explore.hint' },
  { id: 'sleep',      x: 17, y: 87, mx: 15.5, my: 70, side: 'right', label: 'scene.hotspot.sleep',      hint: 'scene.hotspot.sleep.hint' },
];

/* Icon vẽ tay bằng SVG, mỗi cái gợi đúng vật thể trong tranh. Nhỏ
   và nét mảnh để không che mất ảnh nền. */
const ICONS = {
  comms: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 20h16"/><path d="M8 20V9"/><path d="M16 20V9"/>
    <path d="M8 9h8"/><path d="M12 9V5"/><path d="M9.2 3.2a4 4 0 0 1 5.6 0"/>
    <path d="M7 1.6a7 7 0 0 1 10 0" stroke-opacity=".55"/>
  </svg>`,
  lifesupport: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="3" width="16" height="18" rx="2.4"/>
    <path d="M8 7h8"/><circle cx="12" cy="13.5" r="3.2"/>
    <path d="M12 10.3v6.4M8.8 13.5h6.4"/>
  </svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3.5" y="4" width="17" height="16" rx="2"/>
    <path d="M12 4v16"/><path d="M7.5 10.5h1.4M7.5 14h1.4M15.1 10.5h1.4M15.1 14h1.4"/>
  </svg>`,
  craft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3z"/>
    <path d="M14.7 6.3 17 4a2.8 2.8 0 0 1 4 4l-2.3 2.3"/>
  </svg>`,
  explore: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="3.5" width="16" height="17" rx="2.6"/>
    <circle cx="12" cy="12" r="3.1"/><path d="M12 3.5v2.2M12 18.3v2.2M4 12h2.2M17.8 12H20"/>
    <path d="M9.6 12a2.4 2.4 0 0 1 4.8 0"/>
  </svg>`,
  sleep: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 18.5v-3.2h18v3.2"/><path d="M6.5 15.3V9.8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5.5"/>
    <path d="M9.4 11.6h1.6"/>
  </svg>`,
};

/* Đèn LED trên bảng điều khiển. Toạ độ phần trăm trên ảnh, đặt quanh
   giàn điều khiển phải giữa và hộp nối trên trần. Chu kỳ khác nhau
   để không nhấp nháy đồng loạt. */
const LEDS = [
  { x: 60.5, y: 41, dur: 2.6, delay: 0 },
  { x: 63.4, y: 43.5, dur: 3.9, delay: .7 },
  { x: 66.1, y: 39.4, dur: 1.9, delay: 1.4 },
  { x: 59.2, y: 45.8, dur: 4.7, delay: 2.1 },
  { x: 55.6, y: 13.2, dur: 3.1, delay: .4 },
  { x: 58.9, y: 11.6, dur: 5.3, delay: 1.9 },
  { x: 61.8, y: 14.4, dur: 2.3, delay: 2.8 },
];

let cssInjected = false;
function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  if (document.querySelector('link[data-base-scene-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/base-scene.css';
  link.dataset.baseSceneCss = '1';
  document.head.appendChild(link);
}

const num = (v, fallback = 100) =>
  (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/* ============================================================
   pickCharState
   Nhận bộ chỉ số (bảy chỉ số của hab-stats) và trả về tư thế
   nhân vật. Xếp theo mức độ nặng: lạnh trước, rồi mệt, còn lại
   là khỏe. Cùng ngưỡng với hud.js để mắt người chơi khớp với
   thanh chỉ số đang đỏ.

   Nhiệt độ không nằm trong bảy chỉ số, nên suy ra từ ba thứ đại
   diện cho việc giữ ấm trong trạm: oxy để thở, điện để chạy lò
   sưởi, độ kín để không mất nhiệt ra ngoài. Hệ thống chỉ số sau
   này mà có thêm trường temperature thì hàm tự dùng trường đó.
   ============================================================ */
export function pickCharState(s = {}) {
  const oxygen = num(s.oxygen);
  const power = num(s.power);
  const seal = num(s.seal);
  const calories = num(s.calories);
  const water = num(s.water);
  const stamina = num(s.stamina);
  const temp = typeof s.temperature === 'number' && Number.isFinite(s.temperature)
    ? s.temperature
    : Math.min(oxygen, seal, power * 2);

  if (oxygen < 35 || temp < 40 || seal < 55) return 'cold';
  if (calories < 30 || water < 30 || stamina < 30) return 'tired';
  return 'healthy';
}

/* ============================================================
   createBaseScene
   ============================================================ */
export function createBaseScene({ container, stats, clock, onAction } = {}) {
  injectCss();

  const host = container || document.body;

  const root = document.createElement('div');
  root.className = 'bs-root';
  root.dataset.phase = 'day';
  root.innerHTML = `
    <div class="bs-fill" aria-hidden="true"></div>

    <div class="bs-stage">
      <div class="bs-bg" aria-hidden="true">
        <div class="bs-layer bs-layer--day bs-layer--on"></div>
        <div class="bs-layer bs-layer--night"></div>
        <div class="bs-layer bs-layer--storm"></div>
        <div class="bs-glass">
          <span class="bs-glass-glow"></span>
        </div>
      </div>

      <div class="bs-leds" aria-hidden="true"></div>

      <div class="bs-char" data-state="healthy">
        <span class="bs-char-shadow" aria-hidden="true"></span>
        <span class="bs-char-ph" aria-hidden="true"></span>
        <img class="bs-char-img" alt="" decoding="async">
      </div>

      <div class="bs-hotspots" role="group"></div>

    </div>

    <!-- Nhãn pha nằm ngoài khung ảnh: khung ảnh có lúc rộng hơn màn
         hình nên phần tử con đặt sát mép khung sẽ bị đẩy ra ngoài. -->
    <p class="bs-phase">
      <span class="bs-phase-dot" aria-hidden="true"></span>
      <span class="bs-phase-label"></span>
    </p>
  `;
  host.appendChild(root);

  const stageEl = root.querySelector('.bs-stage');
  const glassEl = root.querySelector('.bs-glass');
  const ledsEl = root.querySelector('.bs-leds');
  const charEl = root.querySelector('.bs-char');
  const charImg = root.querySelector('.bs-char-img');
  const hotspotBox = root.querySelector('.bs-hotspots');
  const phaseLabel = root.querySelector('.bs-phase-label');

  /* Hạt bụi trong ô cửa sổ: tạo một lần, vị trí và nhịp cố định để
     mỗi lần mở màn hình trông như nhau, không nhảy loạn. */
  const MOTE_SEEDS = [
    { x: 22, y: 74, s: 2.4, dur: 7.5, delay: 0, dx: 12 },
    { x: 44, y: 62, s: 1.7, dur: 9.2, delay: 1.1, dx: -8 },
    { x: 63, y: 80, s: 2.9, dur: 6.4, delay: 2.4, dx: 9 },
    { x: 35, y: 44, s: 1.5, dur: 11, delay: .6, dx: 14 },
    { x: 72, y: 36, s: 2.1, dur: 8.1, delay: 3.2, dx: -11 },
    { x: 51, y: 24, s: 1.3, dur: 10.4, delay: 1.8, dx: 7 },
    { x: 15, y: 30, s: 1.9, dur: 8.8, delay: 4.1, dx: 10 },
    { x: 83, y: 55, s: 2.6, dur: 7.1, delay: 2.9, dx: -13 },
    { x: 28, y: 15, s: 1.6, dur: 9.7, delay: 5.2, dx: 8 },
    { x: 60, y: 90, s: 2.2, dur: 6.9, delay: 3.7, dx: -9 },
  ];
  for (const m of MOTE_SEEDS) {
    const dot = document.createElement('span');
    dot.className = 'bs-mote-dot';
    dot.style.setProperty('--mx', m.x + '%');
    dot.style.setProperty('--my', m.y + '%');
    dot.style.setProperty('--ms', m.s + 'px');
    dot.style.setProperty('--mdur', m.dur + 's');
    dot.style.setProperty('--mdel', m.delay + 's');
    dot.style.setProperty('--mdx', m.dx + 'px');
    glassEl.appendChild(dot);
  }

  for (const led of LEDS) {
    const dot = document.createElement('span');
    dot.className = 'bs-led';
    dot.style.setProperty('--lx', led.x + '%');
    dot.style.setProperty('--ly', led.y + '%');
    dot.style.setProperty('--ldur', led.dur + 's');
    dot.style.setProperty('--ldel', led.delay + 's');
    ledsEl.appendChild(dot);
  }

  /* ---------- dựng sáu trạm ---------- */

  const hotEls = {};

  for (const st of STATIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bs-hot';
    btn.dataset.id = st.id;
    btn.dataset.side = st.side || 'bottom';
    btn.style.setProperty('--hx', st.x + '%');
    btn.style.setProperty('--hy', st.y + '%');
    btn.innerHTML = `
      <span class="bs-hot-frame" aria-hidden="true"></span>
      <span class="bs-hot-icon">${ICONS[st.id] || ''}</span>
      <span class="bs-hot-label"></span>
      <span class="bs-hot-dot" aria-hidden="true"></span>
      <span class="bs-hot-key">${st.id === 'sleep' ? 'Z' : ''}</span>
    `;
    btn.addEventListener('click', () => {
      clearTodo(st.id);
      if (typeof onAction === 'function') onAction(st.id);
    });
    hotspotBox.appendChild(btn);
    hotEls[st.id] = btn;
  }

  /* ---------- khung ảnh ----------
     Ba chế độ, chọn theo tỉ lệ khung nhìn. Nguyên tắc chung: ảnh phủ
     kín màn, và cả sáu trạm phải nằm trong tầm bấm được.

     1. Màn ngang gần 16:9 (crop ngang dưới 8 phần trăm): phóng cover
        rồi kéo khung lên cho mặt sàn luôn trong khung nhìn. Canh giữa
        thuần thì trên màn siêu rộng chân phi hành gia và hai trạm dưới
        rơi ra ngoài mép dưới.
     2. Màn ngang hẹp hơn, ví dụ 4:3 của iPad nằm ngang: cover sẽ cắt
        mất hơn 20 phần trăm bề ngang, tủ đồ ở 11 phần trăm và bàn làm
        việc ở 84 phần trăm rơi ra ngoài. Nên thu cả tranh vào cho đủ
        sáu trạm, đặt giữa, phần trên dưới lấp bằng chính tấm ảnh phóng
        to làm mờ: vẫn kín tranh, không có ô đen nào.
     3. Màn dọc dưới 760px: khung ảnh bằng khung nhìn, ảnh cover kín
        màn, sáu trạm dùng bộ toạ độ mx/my xếp thành lưới hai cột ba
        hàng trong vùng ngón tay với tới. */

  function layout() {
    /* Lấy kích thước khung nhìn từ window chứ không từ root: lần đo
       đầu tiên file CSS có thể chưa áp xong, clientHeight đọc ra 0. */
    const vw = window.innerWidth || root.clientWidth || 1;
    const vh = window.innerHeight || root.clientHeight || 1;
    const narrow = vw < 760;

    let w;
    let h;
    let left = 0;
    let top = 0;
    let fit = false;

    if (narrow) {
      w = vw;
      h = vh;
    } else {
      const coverW = Math.max(vw, vh * ART_RATIO);
      /* Tỉ lệ bề ngang ảnh bị cắt mất khi phóng cover. Mốc 0,16 là
         mức còn giữ được tủ đồ ở 11 phần trăm và bàn làm việc ở 84
         phần trăm bên trong khung: 16:10 và 16:9 lọt qua, 4:3 thì
         không. */
      const sideCrop = 1 - vw / coverW;

      if (sideCrop <= 0.16) {
        h = Math.max(vh, vw / ART_RATIO);
        w = h * ART_RATIO;
        const maxTop = vh * 0.94 - h * FLOOR_Y;
        left = Math.round((vw - w) / 2);
        top = Math.round(Math.min((vh - h) / 2, maxTop));
      } else {
        /* Màn 4:3 hoặc hẹp hơn 16:9: không phóng cover được vì hai trạm
           ngoài cùng sẽ rơi khỏi màn. Nhưng cũng không cần thu về đúng
           bề ngang màn, vì như vậy dải lấp trên dưới dày tới cả trăm
           điểm ảnh. Lấy bề ngang lớn nhất mà hai trạm biên vẫn còn lọt
           trong khung (cộng 36 điểm ảnh đệm), rồi mới lấp phần còn lại
           bằng ảnh mờ. */
        fit = true;
        const pad = 36;
        const minX = Math.min(...STATIONS.map((st) => st.x / 100));
        const maxX = Math.max(...STATIONS.map((st) => st.x / 100));
        const limitLo = (vw / 2 - pad) / (0.5 - minX);
        const limitHi = (vw / 2 - pad) / (maxX - 0.5);
        w = Math.min(coverW, limitLo, limitHi);
        w = Math.max(w, vw);
        h = w / ART_RATIO;
        if (h > vh) { h = vh; w = vh * ART_RATIO; }
        left = Math.round((vw - w) / 2);
        top = Math.round((vh - h) / 2);
      }
    }

    stageEl.style.width = w + 'px';
    stageEl.style.height = h + 'px';
    stageEl.style.left = left + 'px';
    stageEl.style.top = top + 'px';
    root.style.setProperty('--bs-stage-h', h + 'px');
    root.style.setProperty('--bs-stage-w', w + 'px');
    root.classList.toggle('is-narrow', narrow);
    root.classList.toggle('is-fit', fit);

    for (const st of STATIONS) {
      const btn = hotEls[st.id];
      if (!btn) continue;
      btn.style.setProperty('--hx', (narrow ? st.mx : st.x) + '%');
      btn.style.setProperty('--hy', (narrow ? st.my : st.y) + '%');
    }

    measureChrome();
  }

  /* ---------- đo chiều cao thanh màu xám ----------
     Hai thanh chiếm chỗ trên màn (HUD trên, thanh công cụ đáy) có chiều
     cao không cố định: HUD xuống hai hàng ở màn hẹp, thanh công cụ đổi
     khi chữ phóng to. Nhãn pha, widget nhật ký và dòng nhàn rỗi đều neo
     vào hai mép ấy, nên chúng phải đọc số đo thật. Ghi lên thẻ html để
     cả ba file CSS đều dùng được, kể cả phần tử nằm ngoài .bs-root. */
  function measureChrome() {
    const hudBar = document.querySelector('.hud2-bar');
    const toolbar = document.querySelector('.base-grid');
    const logBox = document.querySelector('.hud2-log');
    const hudH = hudBar ? Math.round(hudBar.getBoundingClientRect().height) : 0;
    const toolbarH = toolbar ? Math.round(toolbar.getBoundingClientRect().height) : 0;
    const logH = logBox ? Math.ceil(logBox.getBoundingClientRect().height) : 0;
    const ds = document.documentElement.style;
    if (hudH > 0) {
      root.style.setProperty('--bs-hud-h', hudH + 'px');
      ds.setProperty('--bs-hud-h', hudH + 'px');
      ds.setProperty('--hud2-bar-h', hudH + 'px');
    }
    if (toolbarH > 0) {
      root.style.setProperty('--bs-toolbar-h', toolbarH + 'px');
      ds.setProperty('--base-toolbar-h', toolbarH + 'px');
      ds.setProperty('--bs-toolbar-h', toolbarH + 'px');
    }
    /* Chiều cao widget nhật ký: trên màn hẹp widget nằm ở góc dưới trái
       nên dòng nhàn rỗi phải nhảy lên trên nó. Đo thật vì widget đổi
       chiều cao khi mở rộng hoặc khi có thêm dòng. */
    if (logH > 0) ds.setProperty('--hud2-log-h', logH + 'px');
  }

  /* ---------- chuyển động ----------
     Hai nguồn tắt hiệu ứng: media query prefers-reduced-motion (xử lý
     thuần trong CSS) và công tắc trong game. Công tắc thường do
     settings.js áp bằng class motion-off lên thẻ html; ở đây đọc thêm
     khoá lưu một lần để sân khấu vẫn tôn trọng lựa chọn đó khi được
     dùng riêng, không kèm settings.js. */

  function syncMotion() {
    try {
      const raw = localStorage.getItem('smdg.settings');
      if (!raw) return;
      const cfg = JSON.parse(raw);
      if (cfg && cfg.motion === false) {
        document.documentElement.classList.add('motion-off');
      }
    } catch (err) {
      /* không đọc được thì để CSS lo theo thiết lập hệ điều hành */
    }
  }

  syncMotion();
  window.addEventListener('focus', syncMotion);

  /* Ô cửa sổ: bám đúng LÒNG KÍNH trong tranh. Số đo trên bg-hab.webp
     (1600 x 900) bằng mặt nạ độ sáng, quét gradient theo bán kính để
     tìm chỗ độ sáng rơi mạnh nhất: tâm (464, 406) px và bán kính
     55.5 px, tức 111 px đường kính.

     Đổi ra phần trăm của khung ảnh:
       tâm ngang   464 / 1600 = 29.00%
       tâm dọc      406 / 900 = 45.11%
       đường kính   111 / 1600 = 6.94%

     Suy ra toạ độ đặt phần tử:
       left   = 29.00 - 6.94/2 = 25.53%
       top    = 45.11 - 6.94/2 = 38.64%   (tính theo chiều cao khung:
                6.94% bề rộng = 6.94*1600/900 = 12.34% chiều cao,
                nên top = 45.11 - 12.34/2 = 38.94%)
       width  = 6.94%   (chiều cao suy ra từ aspect-ratio: 1)

     Vì sao dùng left/top tính từ tâm chứ không phải tâm trực tiếp:
     phần tử định vị bằng góc trên trái, nên phải trừ nửa đường kính.
     Bản cũ để 23.5% / 37.5% / 10.1% - phỏng chừng theo khung thép
     chứ không đo, nên vừa to hơn lòng kính 45% vừa lệch xuống. */
  function placeGlass() {
    glassEl.style.left = '25.53%';
    glassEl.style.top = '38.94%';
    glassEl.style.width = '6.94%';
  }

  /* ---------- pha ---------- */

  let phaseLocked = false;

  function setPhase(phase, { locked = true } = {}) {
    const next = PHASES.includes(phase) ? phase : 'day';
    if (locked) phaseLocked = true;
    root.dataset.phase = next;
    root.querySelectorAll('.bs-layer').forEach((el) => {
      el.classList.toggle('bs-layer--on', el.classList.contains('bs-layer--' + next));
    });
    phaseLabel.textContent = t('scene.phase.' + next);
    return next;
  }

  /* ---------- nhân vật ---------- */

  let charState = 'healthy';
  let lastSrc = '';

  charImg.addEventListener('error', () => {
    charEl.classList.add('is-noart');
  });
  charImg.addEventListener('load', () => {
    charEl.classList.remove('is-noart');
  });

  function setCharState(state) {
    const next = CHAR_STATES.includes(state) ? state : 'healthy';
    charState = next;
    charEl.dataset.state = next;
    const src = ART.char[next];
    if (lastSrc !== src) {
      lastSrc = src;
      /* Khi ảnh chưa có trong kho, onerror sẽ bật tư thế vẽ bằng CSS.
         Vẫn gán src để lần sau ảnh xuất hiện là hiện ngay. */
      charImg.src = src;
    }
    charImg.alt = t('scene.char.alt.' + next);
    return next;
  }

  /* ---------- chấm thông báo ----------
     Châm theo việc thật, không bật bừa: người chơi phải tin được
     cái chấm này, nếu không thì nó thành nhiễu. */

  const todos = {};

  function markTodo(id, on) {
    const btn = hotEls[id];
    if (!btn) return;
    todos[id] = !!on;
    btn.classList.toggle('has-todo', !!on);
    btn.dataset.todo = on ? '1' : '';
  }

  function clearTodo(id) {
    if (todos[id]) markTodo(id, false);
  }

  /* Mốc kho để biết có vật phẩm mới: lần refresh đầu chỉ ghi mốc,
     từ lần sau tăng thêm thì bật chấm ở tủ đồ. */
  let invBaseline = null;

  function readStats() {
    try {
      if (stats && typeof stats.get === 'function') return stats.get() || {};
    } catch (err) {
      console.error('base-scene: không đọc được chỉ số', err);
    }
    return {};
  }

  function readInv() {
    try {
      if (stats && typeof stats.getInventory === 'function') return stats.getInventory() || {};
    } catch (err) {
      /* không có kho thì coi như rỗng */
    }
    return {};
  }

  function countInv(inv) {
    return Object.values(inv).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }

  function canCraft(inv) {
    /* Đủ vật tư cho ít nhất một công thức thì bàn chế tạo có việc. */
    const recipes = [
      { tape: 1 },
      { hydrazine: 1 },
      { electronics: 2, tape: 1 },
      { electronics: 3, tape: 1 },
    ];
    return recipes.some((cost) =>
      Object.entries(cost).every(([k, need]) => (Number(inv[k]) || 0) >= need));
  }

  /* ---------- đọc chỉ số và chỉnh giao diện ---------- */

  function refresh() {
    const s = readStats();
    setCharState(pickCharState(s));

    const inv = readInv();
    const total = countInv(inv);

    if (invBaseline === null) invBaseline = total;
    if (total > invBaseline) {
      markTodo('bag', true);
      invBaseline = total;
    } else if (total < invBaseline) {
      invBaseline = total;
    }

    markTodo('lifesupport', num(s.oxygen) < 60 || num(s.seal) < 70);
    markTodo('craft', canCraft(inv));
    /* Chỉ chấm khi đi được một chuyến ra hồn: thể lực trên 70 thì mới
       đủ sức đi xa. Để ngưỡng thấp thì chấm sáng gần như vĩnh viễn và
       người chơi học cách phớt lờ nó. */
    markTodo('explore', num(s.stamina) >= 70);
    markTodo('sleep', num(s.stamina) < 30 || isNight());
    markTodo('comms', !stage1Done());

    /* Pha tự đổi theo đồng hồ và bão bụi, trừ khi bên ngoài đã gọi
       setPhase() để ép một pha cụ thể. */
    if (!phaseLocked) {
      if (s.storm) setPhase('storm', { locked: false });
      else setPhase(isNight() ? 'night' : 'day', { locked: false });
    }
    return s;
  }

  function isNight() {
    try {
      if (clock && typeof clock.state === 'function') {
        const st = clock.state();
        if (st && typeof st.isNight === 'boolean') return st.isNight;
      }
    } catch (err) { /* đồng hồ chưa sẵn sàng thì coi là ban ngày */ }
    return false;
  }

  function stage1Done() {
    try {
      return !!localStorage.getItem('smdg.stage1Done');
    } catch (err) {
      return true; /* chế độ riêng tư: đừng bật chấm vô căn cứ */
    }
  }

  /* ---------- chữ ---------- */

  function applyTexts() {
    hotspotBox.setAttribute('aria-label', t('scene.group.label'));
    for (const st of STATIONS) {
      const btn = hotEls[st.id];
      const name = t(st.label);
      btn.setAttribute('aria-label', name);
      btn.setAttribute('title', name + ' · ' + t(st.hint));
      btn.querySelector('.bs-hot-label').textContent = name;
    }
    phaseLabel.textContent = t('scene.phase.' + root.dataset.phase);
    charImg.alt = t('scene.char.alt.' + charState);
    root.querySelector('.bs-phase').setAttribute('aria-label', t('scene.phase.aria'));
  }

  /* ---------- theo dõi ---------- */

  let offStats = null;
  if (stats && typeof stats.onTick === 'function') {
    offStats = stats.onTick(() => { refresh(); });
  }

  let offClock = null;
  if (clock && typeof clock.onTick === 'function') {
    offClock = clock.onTick(() => { refresh(); });
  }

  let offLang = null;
  if (typeof onLangChange === 'function') {
    offLang = onLangChange(() => { applyTexts(); refresh(); });
  }

  /* Hai nguồn báo đổi kích thước: ResizeObserver bám phần tử gốc, và
     sự kiện resize của cửa sổ. Cần cả hai vì trình duyệt nhúng và chế
     độ giả lập thiết bị có lúc chỉ bắn một trong hai. */
  const ro = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => layout())
    : null;
  if (ro) ro.observe(root);
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);

  function unbindResize() {
    if (ro) ro.disconnect();
    window.removeEventListener('resize', layout);
    window.removeEventListener('orientationchange', layout);
  }

  /* ---------- chạy ---------- */

  layout();
  placeGlass();
  applyTexts();
  setCharState('healthy');
  refresh();

  /* Ảnh nền lớn nên vẽ xong khung trước, ảnh hiện sau. Chờ một nhịp
     để bố cục chốt rồi mới đo lại, tránh khung lệch khi thanh cuộn
     của trang biến mất. */
  requestAnimationFrame(() => layout());

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    if (typeof offStats === 'function') offStats();
    if (typeof offClock === 'function') offClock();
    if (typeof offLang === 'function') offLang();
    unbindResize();
    window.removeEventListener('focus', syncMotion);
    root.remove();
  }

  return { root, setPhase, setCharState, refresh, destroy };
}
