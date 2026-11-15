/* ============================================================
   mission-viz.js
   Bản đồ quỹ đạo Trái Đất tới Sao Hỏa, kiểu NASA Mission Viz.

   Canvas 2D, không WebGL, không thư viện ngoài. Mặt Trời ở giữa, quỹ
   đạo Trái Đất và Sao Hỏa vẽ đúng tâm sai, đường chuyển tiếp Hohmann
   của tàu cứu hộ, ba mốc đốt hiệu chỉnh có tooltip, kèm bảng thông số
   khoảng cách và trễ tín hiệu.

   Chỉ vẽ. Mọi phép tính nằm trong mission-math.js để test được bằng
   node mà không cần trình duyệt.
   ============================================================ */

import {
  TRANSFER_DAYS,
  TRANSFER_ORBIT,
  DELTA_V,
  TCM,
  missionState,
  transferAt,
  orbitState,
  EARTH_ORBIT,
  MARS_ORBIT,
  EARTH_PATH,
  MARS_PATH,
  AU_KM,
  formatNumber,
} from './mission-math.js';

const BASE = new URL('.', import.meta.url).href;

/* ---------- chữ ---------- */

const T = {
  vi: {
    'mviz.title': 'Bản đồ hành trình',
    'mviz.subtitle': 'Trái Đất tới Sao Hỏa, chuyển tiếp Hohmann',
    'mviz.sun': 'Mặt Trời',
    'mviz.earth': 'Trái Đất',
    'mviz.mars': 'Sao Hỏa',
    'mviz.craft': 'Tàu cứu hộ',
    'mviz.distance': 'Khoảng cách',
    'mviz.delay': 'Trễ tín hiệu một chiều',
    'mviz.phase': 'Góc pha',
    'mviz.elapsed': 'Thời gian bay',
    'mviz.remaining': 'Còn lại',
    'mviz.tcm': 'Đốt hiệu chỉnh',
    'mviz.tcmDone': 'đã đốt',
    'mviz.tcmNext': 'lần tới',
    'mviz.deltaV': 'Delta-v',
    'mviz.burn': 'Thời lượng đốt',
    'mviz.day': 'Ngày',
    'mviz.of': 'trên',
    'mviz.play': 'Chạy',
    'mviz.pause': 'Dừng',
    'mviz.fast': 'Tua nhanh',
    'mviz.reset': 'Về đầu',
    'mviz.scrub': 'Kéo để tua hành trình',
    'mviz.arrived': 'Đã tới quỹ đạo Sao Hỏa',
    'mviz.missionClock': 'Đồng hồ sứ mệnh',
    'mviz.legendTransfer': 'Đường chuyển tiếp',
    'mviz.legendEarth': 'Quỹ đạo Trái Đất',
    'mviz.legendMars': 'Quỹ đạo Sao Hỏa',
    'mviz.au': 'AU',
    'mviz.km': 'km',
    'mviz.min': 'phút',
    'mviz.deg': 'độ',
    'mviz.seconds': 'giây',
    'mviz.note': 'Đốt hiệu chỉnh chỉ vài mét trên giây, không phải lần đốt lớn.',
    'mviz.budget': 'Ngân sách delta-v',
    'mviz.budgetDep': 'Khởi hành',
    'mviz.budgetArr': 'Tới nơi',
    'mviz.budgetTotal': 'Tổng cộng',
  },
  en: {
    'mviz.title': 'Trajectory map',
    'mviz.subtitle': 'Earth to Mars, Hohmann transfer',
    'mviz.sun': 'Sun',
    'mviz.earth': 'Earth',
    'mviz.mars': 'Mars',
    'mviz.craft': 'Rescue craft',
    'mviz.distance': 'Distance',
    'mviz.delay': 'One way signal delay',
    'mviz.phase': 'Phase angle',
    'mviz.elapsed': 'Flight time',
    'mviz.remaining': 'Remaining',
    'mviz.tcm': 'Correction burn',
    'mviz.tcmDone': 'burned',
    'mviz.tcmNext': 'next',
    'mviz.deltaV': 'Delta-v',
    'mviz.burn': 'Burn duration',
    'mviz.day': 'Day',
    'mviz.of': 'of',
    'mviz.play': 'Play',
    'mviz.pause': 'Pause',
    'mviz.fast': 'Fast forward',
    'mviz.reset': 'Restart',
    'mviz.scrub': 'Drag to scrub the flight',
    'mviz.arrived': 'Mars orbit reached',
    'mviz.missionClock': 'Mission clock',
    'mviz.legendTransfer': 'Transfer path',
    'mviz.legendEarth': 'Earth orbit',
    'mviz.legendMars': 'Mars orbit',
    'mviz.au': 'AU',
    'mviz.km': 'km',
    'mviz.min': 'min',
    'mviz.deg': 'deg',
    'mviz.seconds': 's',
    'mviz.note': 'Correction burns are a few metres per second, not big burns.',
    'mviz.budget': 'Delta-v budget',
    'mviz.budgetDep': 'Departure',
    'mviz.budgetArr': 'Arrival',
    'mviz.budgetTotal': 'Total',
  },
};

/* Hai ngôn ngữ luôn cùng hiện: ngôn ngữ đang chọn đậm, ngôn ngữ kia
   mờ đi. Nhãn kỹ thuật vì thế đọc được với cả hai nhóm người chơi mà
   không phải chuyển qua lại. */
const OTHER = { vi: 'en', en: 'vi' };

/* ---------- màu ---------- */

const C = {
  void: '#07090d',
  panel: '#111721',
  inset: '#0a0e14',
  line: '#26313f',
  lineStrong: '#35455a',
  amber: '#e8a33d',
  amberSoft: 'rgba(232, 163, 61, .18)',
  cyan: '#4fb8c9',
  cyanSoft: 'rgba(79, 184, 201, .16)',
  mars: '#d9694f',
  marsSoft: 'rgba(217, 105, 79, .18)',
  txBright: '#eaf1f8',
  tx: '#b9c7d6',
  txSoft: '#8497aa',
  txDim: '#72879d',
  ok: '#6fbf8a',
  warn: '#e8c05a',
};

const MONO = "'JetBrains Mono', 'Consolas', monospace";
const DISPLAY = "'Barlow Condensed', 'Oswald', system-ui, sans-serif";

/* ---------- tham số vẽ ---------- */

/* Bán kính lớn nhất cần chứa: điểm xa Mặt Trời nhất của quỹ đạo Sao
   Hỏa, tính bằng viễn điểm, cộng lề cho nhãn. Viễn điểm không phụ
   thuộc hướng cận điểm nên con số này luôn đúng dù quỹ đạo bị quay. */
const MAX_AU = MARS_ORBIT.a * (1 + MARS_ORBIT.e) * 1.055;

/* Tỉ lệ ngày mô phỏng trên giây thực ở tốc độ 1x.
   Cả hành trình 258,9 ngày mất khoảng 130 giây, đủ chậm để nhìn ra
   chuyển động mà không phải ngồi chờ quá lâu. */
const BASE_DAYS_PER_SEC = 2;

const SPEEDS = [1, 5, 20];

/* ---------- tiện ích ---------- */

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css/mission-viz.css';
  document.head.appendChild(link);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Đọc công tắc chuyển động: cài đặt trong game trước, rồi tới thiết
   lập hệ điều hành. Một trong hai tắt là coi như tắt. */
function readMotion() {
  let gameOn = true;
  let quality = 'auto';
  try {
    const raw = localStorage.getItem('smdg.settings');
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.motion === false) gameOn = false;
      if (s && typeof s.quality === 'string') quality = s.quality;
    }
  } catch {
    gameOn = true;
  }
  if (quality === 'low') gameOn = false;
  try {
    if (document.documentElement.classList.contains('motion-off')) gameOn = false;
  } catch {
    /* không có document thì bỏ qua */
  }
  let osOk = true;
  try {
    osOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    osOk = true;
  }
  return gameOn && osOk;
}

function fmt(n, digits) {
  return Number(n).toFixed(digits);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/* ---------- module chính ---------- */

export function createMissionViz({ container, lang = 'vi', onFrame } = {}) {
  injectCss();

  let currentLang = lang === 'en' ? 'en' : 'vi';
  const t = (key) => (T[currentLang] || T.vi)[key] || key;
  const tOther = (key) => (T[OTHER[currentLang]] || T.en)[key] || key;

  /* Một hàm định dạng số duy nhất cho cả bản đồ lẫn bảng số liệu, để
     dấu thập phân không chỗ nào phẩy chỗ nào chấm. */
  const num = (value, digits) => formatNumber(value, digits, currentLang);

  /* ---------- khung DOM ---------- */

  const root = document.createElement('section');
  root.className = 'mviz';
  root.setAttribute('aria-label', t('mviz.title'));
  root.innerHTML = `
    <div class="mviz-main">
      <header class="mviz-head">
        <div class="mviz-head-text">
          <h2 class="mviz-title">
            <span class="mviz-title-vi"></span>
            <span class="mviz-title-en"></span>
          </h2>
          <p class="mviz-sub"></p>
        </div>
        <div class="mviz-legend" aria-hidden="true">
          <span class="mviz-key"><i class="mviz-swatch is-transfer"></i><b class="mviz-key-vi"></b><em class="mviz-key-en"></em></span>
          <span class="mviz-key"><i class="mviz-swatch is-earth"></i><b class="mviz-key-vi"></b><em class="mviz-key-en"></em></span>
          <span class="mviz-key"><i class="mviz-swatch is-mars"></i><b class="mviz-key-vi"></b><em class="mviz-key-en"></em></span>
        </div>
      </header>

      <div class="mviz-stage">
        <canvas class="mviz-canvas"></canvas>
        <div class="mviz-tip" role="status" aria-live="polite" hidden>
          <span class="mviz-tip-name"></span>
          <span class="mviz-tip-name-en"></span>
          <span class="mviz-tip-row"><i></i><span class="mviz-tip-dv"></span></span>
          <span class="mviz-tip-row"><i></i><span class="mviz-tip-time"></span></span>
          <span class="mviz-tip-note"></span>
        </div>
        <p class="mviz-badge" hidden></p>
      </div>

      <div class="mviz-controls">
        <div class="mviz-progress">
          <div class="mviz-track" role="slider" tabindex="0"
               aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <span class="mviz-track-fill"></span>
            <span class="mviz-track-knob"></span>
            <span class="mviz-track-tcm"></span>
          </div>
          <div class="mviz-progress-row">
            <span class="mviz-day"><b class="mviz-day-num">0,0</b><span class="mviz-day-of"></span></span>
            <span class="mviz-pct">0%</span>
          </div>
        </div>
        <div class="mviz-buttons">
          <button type="button" class="mviz-btn is-icon" data-act="play"></button>
          <button type="button" class="mviz-btn" data-speed="1">1x</button>
          <button type="button" class="mviz-btn" data-speed="5">5x</button>
          <button type="button" class="mviz-btn is-fast" data-speed="20"></button>
          <button type="button" class="mviz-btn is-icon" data-act="reset"></button>
        </div>
      </div>
    </div>

    <aside class="mviz-side">
      <div class="mviz-side-block" data-l="distance">
        <span class="mviz-label"><b class="mviz-l-vi"></b><em class="mviz-l-en"></em></span>
        <div class="mviz-big">
          <span class="mviz-big-num" data-out="distanceAu">1,139</span>
          <span class="mviz-unit" data-u="au"><b>AU</b></span>
        </div>
        <div class="mviz-sub-line">
          <span class="mviz-sub-num" data-out="distanceKm">170 400 000</span>
          <span class="mviz-unit" data-u="km">km</span>
        </div>
      </div>

      <div class="mviz-side-block" data-l="delay">
        <span class="mviz-label"><b class="mviz-l-vi"></b><em class="mviz-l-en"></em></span>
        <div class="mviz-big">
          <span class="mviz-big-num is-delay" data-out="delay">9,5</span>
          <span class="mviz-unit" data-u="delay"><b></b></span>
        </div>
        <div class="mviz-sub-line">
          <span class="mviz-phase-wrap"><span class="mviz-mini-label" data-l="phase"></span> <b data-out="phase">52,5</b><span class="mviz-unit" data-u="phase"></span></span>
        </div>
      </div>

      <div class="mviz-side-block" data-l="clock">
        <span class="mviz-label"><b class="mviz-l-vi"></b><em class="mviz-l-en"></em></span>
        <div class="mviz-clock">
          <span class="mviz-clock-main" data-out="clock">T+000:00:00</span>
          <span class="mviz-clock-sub" data-out="date">2033-04-09 04:12 UTC</span>
        </div>
        <div class="mviz-sub-line is-split">
          <span><span class="mviz-mini-label" data-l="elapsed"></span> <b data-out="elapsed">0,0</b></span>
          <span><span class="mviz-mini-label" data-l="remaining"></span> <b data-out="remaining">258,9</b></span>
        </div>
      </div>

      <div class="mviz-side-block is-tcm" data-l="tcm">
        <span class="mviz-label"><b class="mviz-l-vi"></b><em class="mviz-l-en"></em></span>
        <ul class="mviz-tcm-list"></ul>
        <p class="mviz-note"></p>
      </div>

      <div class="mviz-side-block is-budget" data-l="budget">
        <span class="mviz-label"><b class="mviz-l-vi"></b><em class="mviz-l-en"></em></span>
        <ul class="mviz-budget">
          <li><span class="mviz-budget-k" data-b="dep"></span><b data-bv="dep">2,945</b><i>km/s</i></li>
          <li><span class="mviz-budget-k" data-b="arr"></span><b data-bv="arr">2,649</b><i>km/s</i></li>
          <li class="is-total"><span class="mviz-budget-k" data-b="tot"></span><b data-bv="tot">5,594</b><i>km/s</i></li>
        </ul>
      </div>
    </aside>
  `;
  container.appendChild(root);

  const stage = root.querySelector('.mviz-stage');
  const canvas = root.querySelector('.mviz-canvas');
  const ctx = canvas.getContext('2d');
  const tip = root.querySelector('.mviz-tip');
  const badge = root.querySelector('.mviz-badge');
  const track = root.querySelector('.mviz-track');
  const fill = root.querySelector('.mviz-track-fill');
  const knob = root.querySelector('.mviz-track-knob');
  const tcmStrip = root.querySelector('.mviz-track-tcm');
  const dayNum = root.querySelector('.mviz-day-num');
  const pctEl = root.querySelector('.mviz-pct');
  const btnPlay = root.querySelector('[data-act="play"]');
  const btnReset = root.querySelector('[data-act="reset"]');
  const out = {
    distanceAu: root.querySelector('[data-out="distanceAu"]'),
    distanceKm: root.querySelector('[data-out="distanceKm"]'),
    delay: root.querySelector('[data-out="delay"]'),
    phase: root.querySelector('[data-out="phase"]'),
    clock: root.querySelector('[data-out="clock"]'),
    date: root.querySelector('[data-out="date"]'),
    elapsed: root.querySelector('[data-out="elapsed"]'),
    remaining: root.querySelector('[data-out="remaining"]'),
  };

  /* ---------- trạng thái ---------- */

  let day = 0;
  let speedIdx = 0;            /* chỉ số trong SPEEDS */
  let speed = SPEEDS[0];
  let playing = false;
  let motionOn = readMotion();
  let lastTs = 0;
  let rafId = 0;
  let destroyed = false;
  let scrubbing = false;

  /* kích thước vẽ, tính bằng CSS pixel */
  let w = 0;
  let h = 0;
  let cx = 0;
  let cy = 0;
  let scale = 1;               /* pixel trên AU */
  let dpr = 1;

  /* điểm mốc TCM trên màn hình, để dò chuột */
  let tcmHits = [];
  let hoverId = null;

  /* ---------- sao nền ---------- */

  const starLayer = document.createElement('canvas');
  let starCount = 0;

  function buildStars() {
    const sctx = starLayer.getContext('2d');
    starLayer.width = Math.max(1, Math.round(w * dpr));
    starLayer.height = Math.max(1, Math.round(h * dpr));
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);

    const rng = mulberry32(20260409);
    const area = w * h;
    starCount = Math.max(90, Math.min(420, Math.round(area / 5200)));

    for (let i = 0; i < starCount; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = rng() < 0.86 ? 0.45 + rng() * 0.7 : 1.0 + rng() * 0.9;
      const a = 0.14 + rng() * 0.55;
      const warm = rng();
      const tint = warm > 0.9
        ? `rgba(232, 196, 160, ${a.toFixed(3)})`
        : warm > 0.78
          ? `rgba(180, 208, 232, ${a.toFixed(3)})`
          : `rgba(226, 236, 246, ${a.toFixed(3)})`;
      sctx.beginPath();
      sctx.arc(x, y, r, 0, Math.PI * 2);
      sctx.fillStyle = tint;
      sctx.fill();
    }
  }

  /* ---------- toạ độ ---------- */

  function toPx(state) {
    return { x: cx + state.x * scale, y: cy - state.y * scale };
  }

  /* Đường ellipse vẽ theo mẫu dị thường trung bình, nên tâm sai hiện
     ra đúng: Mặt Trời lệch khỏi tâm hình học một đoạn e * a. */
  function orbitPath(orbit, steps = 180) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      pts.push(toPx(orbitState(orbit, (360 * i) / steps)));
    }
    return pts;
  }

  function strokePolyline(pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  /* ---------- vẽ ---------- */

  let starPhase = 0;

  function draw(s) {
    if (!ctx || w <= 0 || h <= 0) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    /* nền */
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.78);
    bg.addColorStop(0, '#0b1017');
    bg.addColorStop(0.55, '#080c12');
    bg.addColorStop(1, C.void);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    /* sao nền tĩnh */
    ctx.drawImage(starLayer, 0, 0, w, h);

    /* vài sao sáng nhấp nháy rất nhẹ, chỉ khi chuyển động được bật */
    if (motionOn) {
      const rng = mulberry32(7717);
      const n = Math.min(26, Math.max(10, Math.round(starCount / 12)));
      for (let i = 0; i < n; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const ph = rng() * Math.PI * 2;
        const a = 0.12 + 0.30 * (0.5 + 0.5 * Math.sin(starPhase * 0.9 + ph));
        ctx.beginPath();
        ctx.arc(x, y, 1.15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 241, 248, ${a.toFixed(3)})`;
        ctx.fill();
      }
    }

    drawGrid();
    drawSun();

    /* quỹ đạo Sao Hỏa */
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = 'rgba(217, 105, 79, .42)';
    ctx.setLineDash([]);
    strokePolyline(orbitPath(MARS_PATH));

    /* quỹ đạo Trái Đất */
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = 'rgba(79, 184, 201, .48)';
    strokePolyline(orbitPath(EARTH_PATH, 240));

    drawTransfer(s);
    drawDistanceLine(s);
    const planetInfo = drawPlanets(s);
    drawCraft(s, planetInfo);
    drawTcm(s);
    drawScaleBadge();
  }

  /* Lưới cực mờ theo bước 0,5 AU, kèm nhãn nhỏ. Giúp mắt đọc ra tỉ lệ
     thay vì chỉ thấy hai đường cong. Bỏ vòng 1,0 AU vì quỹ đạo Trái
     Đất đã ở đó, vẽ thêm một vòng tròn nữa chỉ gây nhầm. */
  function drawGrid() {
    ctx.save();
    ctx.setLineDash([2, 6]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(53, 69, 90, .30)';
    for (const au of [0.5, 1.5]) {
      ctx.beginPath();
      ctx.arc(cx, cy, au * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.font = `400 9px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    for (const au of [0.5, 1.5]) {
      const label = num(au, 1) + ' AU';
      const x = cx + 3;
      const y = cy - au * scale - 3;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(8, 12, 18, .72)';
      ctx.fillRect(x - 2, y - 9, tw + 4, 10);
      ctx.fillStyle = 'rgba(114, 135, 157, .62)';
      ctx.fillText(label, x, y);
    }
    ctx.restore();
  }

  function drawSun() {
    const r = Math.max(5.5, Math.min(13, w * 0.012));

    const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 7);
    glow.addColorStop(0, 'rgba(232, 163, 61, .40)');
    glow.addColorStop(0.35, 'rgba(232, 163, 61, .13)');
    glow.addColorStop(1, 'rgba(232, 163, 61, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 7, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.2, cx, cy, r);
    core.addColorStop(0, '#fff4dd');
    core.addColorStop(0.55, '#f0b95c');
    core.addColorStop(1, '#c9822a');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    labelBoth(cx, cy + r + 15, t('mviz.sun'), tOther('mviz.sun'), C.warn, 'center');
  }

  /* Đường chuyển tiếp: nét đứt mảnh cho cả ellipse, nét đậm cho phần
     tàu đã bay. Hai đầu có vạch mốc phóng và tới. */
  function drawTransfer(s) {
    /* Nửa ellipse đầu tiên, từ cận điểm tới viễn điểm, chính là toàn
       bộ đường bay. Phần chưa đi vẽ nét đứt, phần đã đi vẽ nét đậm. */
    const full = orbitPath(TRANSFER_ORBIT, 220);
    const half = full.slice(0, Math.floor(full.length / 2) + 1);

    ctx.save();
    ctx.setLineDash([5, 7]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(232, 163, 61, .34)';
    strokePolyline(half);
    ctx.restore();

    /* phần đã đi, lấy mẫu đều theo ngày */
    const flown = [];
    const steps = 140;
    for (let i = 0; i <= steps; i++) {
      const d = s.day * (i / steps);
      flown.push(toPx(transferAt(d)));
    }
    ctx.save();
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(232, 163, 61, .92)';
    ctx.shadowColor = 'rgba(232, 163, 61, .45)';
    ctx.shadowBlur = 9;
    strokePolyline(flown);
    ctx.restore();

    /* vạch mốc hai đầu */
    markerTick(toPx(transferAt(0)), C.cyan, 7);
    markerTick(toPx(transferAt(TRANSFER_DAYS)), C.mars, 7);
  }

  function markerTick(p, color, len) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p.x - len / 2, p.y);
    ctx.lineTo(p.x + len / 2, p.y);
    ctx.moveTo(p.x, p.y - len / 2);
    ctx.lineTo(p.x, p.y + len / 2);
    ctx.stroke();
    ctx.restore();
  }

  /* Đường nối Trái Đất và Sao Hỏa, chấm mảnh, để mắt thấy ngay đoạn
     đang đo. Nhãn số đặt ở giữa đoạn. */
  function drawDistanceLine(s) {
    const a = toPx(s.earth);
    const b = toPx(s.mars);

    ctx.save();
    ctx.setLineDash([1, 5]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(185, 199, 214, .30)';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();

    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const txt = num(s.distanceAu, 3) + ' AU';
    /* Hai hành tinh quá gần nhau trên màn hình thì nhãn số sẽ đè lên
       chính hai quả cầu. Bỏ nhãn, giữ đường nối. */
    const sep = Math.hypot(b.x - a.x, b.y - a.y);
    if (sep < 46) return;

    ctx.save();
    ctx.font = `500 10px ${MONO}`;
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(10, 14, 20, .78)';
    ctx.fillRect(mx - tw / 2 - 5, my - 8, tw + 10, 15);
    ctx.fillStyle = 'rgba(185, 199, 214, .85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, mx, my);
    ctx.restore();
  }

  function drawPlanets(s) {
    const pr = Math.max(3.4, Math.min(6.4, w * 0.006));
    const e = toPx(s.earth);
    const c = toPx(s.craft);

    /* Lúc phóng, tàu nằm đúng trên Trái Đất. Vẽ cả hai chồng lên nhau
       thì quả cầu Trái Đất bị tàu che mất và nhãn hai bên đè nhau.
       Những khung đầu tiên vì thế đẩy tàu ra ngoài một chút. */
    const docked = Math.hypot(c.x - e.x, c.y - e.y) < pr * 2.4;

    /* Nhãn đặt lệch ra phía xa Mặt Trời, tức phía ngoài quỹ đạo. Nhãn
       nằm phía trong sẽ chồng lên đường bay và lên nhãn của tàu, vì cả
       hai đều ở gần nhau trong những ngày đầu. */
    const outE = outward(e);
    const lblE = { x: e.x + outE.x * (pr + 16), y: e.y + outE.y * (pr + 12) };
    const alignE = outE.x > 0.25 ? 'left' : outE.x < -0.25 ? 'right' : 'center';

    drawGlobe(e.x, e.y, pr, C.cyan, 'rgba(79, 184, 201, .30)');
    labelBoth(lblE.x, lblE.y, t('mviz.earth'), tOther('mviz.earth'), C.cyan, alignE);

    const m = toPx(s.mars);
    const outM = outward(m);
    const lblM = { x: m.x + outM.x * (pr + 16), y: m.y + outM.y * (pr + 12) };
    const alignM = outM.x > 0.25 ? 'left' : outM.x < -0.25 ? 'right' : 'center';

    drawGlobe(m.x, m.y, pr * 0.92, C.mars, 'rgba(217, 105, 79, .30)');
    labelBoth(lblM.x, lblM.y, t('mviz.mars'), tOther('mviz.mars'), C.mars, alignM);

    return { docked, earthPx: e, craftPx: c, planetR: pr, outE };
  }

  /* Vector đơn vị hướng từ Mặt Trời ra điểm đang xét. Dùng để đặt nhãn
     ra phía ngoài, chỗ trống nhất. */
  function outward(p) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  function drawGlobe(x, y, r, color, halo) {
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.2);
    g.addColorStop(0, halo);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(234, 241, 248, .55)';
    ctx.stroke();
  }

  /* Tàu là mũi tam giác hướng theo vận tốc tức thời, có quầng sáng
     và một vệt đuôi ngắn. Khi còn dính vào Trái Đất, tàu vẽ lệch ra
     ngoài một chút và nhãn đặt xuống dưới, để không che quả cầu và
     không đè lên nhãn Trái Đất. */
  function drawCraft(s, planetInfo) {
    const docked = planetInfo && planetInfo.docked;
    const base = toPx(s.craft);
    /* Khi còn dính bệ phóng, tàu vẽ lệch ra phía ngoài quỹ đạo, cùng
       hướng với vector ra của Trái Đất nhưng xa hơn, để nhãn tàu và
       nhãn Trái Đất không chồng lên nhau. */
    const p = docked
      ? {
          x: base.x + planetInfo.outE.x * (planetInfo.planetR + 22),
          y: base.y + planetInfo.outE.y * (planetInfo.planetR + 22) - 16,
        }
      : base;

    const before = toPx(transferAt(Math.max(0, s.day - 1.2)));
    const after = toPx(transferAt(Math.min(TRANSFER_DAYS, s.day + 1.2)));
    let ang = Math.atan2(after.y - before.y, after.x - before.x);
    if (!Number.isFinite(ang) || (Math.abs(after.x - before.x) < 1e-6 && Math.abs(after.y - before.y) < 1e-6)) {
      ang = 0;
    }
    const r = Math.max(4.2, Math.min(7, w * 0.0062));

    /* quầng */
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
    g.addColorStop(0, 'rgba(234, 241, 248, .30)');
    g.addColorStop(0.4, 'rgba(232, 163, 61, .16)');
    g.addColorStop(1, 'rgba(232, 163, 61, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
    ctx.fill();

    /* vệt đuôi, không vẽ khi tàu chưa rời bệ phóng */
    if (!docked) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      const tail = ctx.createLinearGradient(-r * 9, 0, 0, 0);
      tail.addColorStop(0, 'rgba(232, 163, 61, 0)');
      tail.addColorStop(1, 'rgba(232, 163, 61, .45)');
      ctx.fillStyle = tail;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.45);
      ctx.lineTo(-r * 9, 0);
      ctx.lineTo(0, r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    /* thân tam giác */
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(r * 1.7, 0);
    ctx.lineTo(-r * 0.9, -r * 0.85);
    ctx.lineTo(-r * 0.35, 0);
    ctx.lineTo(-r * 0.9, r * 0.85);
    ctx.closePath();
    ctx.fillStyle = C.txBright;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(232, 163, 61, .9)';
    ctx.stroke();
    ctx.restore();

    if (docked) {
      labelBoth(p.x, p.y - r * 3.2, t('mviz.craft'), tOther('mviz.craft'), C.txBright, 'center');
    } else {
      labelBoth(p.x, p.y - r * 2.4 - 6, t('mviz.craft'), tOther('mviz.craft'), C.txBright, 'center');
    }
  }

  /* Ba mốc TCM nằm ngay trên đường bay, hình thoi nhỏ. Mốc đã qua
     tô đậm màu hổ phách, mốc chưa tới để rỗng. */
  function drawTcm(s) {
    tcmHits = [];
    for (const item of TCM) {
      const pos = toPx(transferAt(item.day));
      const done = s.day >= item.day;
      const hot = hoverId === item.id;
      const size = hot ? 7 : 5;

      tcmHits.push({ id: item.id, x: pos.x, y: pos.y, tcm: item });

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.rect(-size / 2, -size / 2, size, size);
      if (done) {
        ctx.fillStyle = C.amber;
        ctx.fill();
      }
      ctx.lineWidth = hot ? 2 : 1.4;
      ctx.strokeStyle = done ? 'rgba(255, 236, 205, .9)' : 'rgba(232, 163, 61, .85)';
      ctx.stroke();
      ctx.restore();

      if (hot) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 13, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(232, 163, 61, .55)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* số thứ tự, chỉ hiện khi đủ chỗ */
      if (w > 460) {
        ctx.save();
        ctx.font = `600 9px ${MONO}`;
        ctx.fillStyle = done ? C.amber : C.txDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('T' + item.index, pos.x, pos.y - 13);
        ctx.restore();
      }
    }
  }

  /* Nhãn tỉ lệ ở góc: một thanh dài đúng 0,5 AU. */
  function drawScaleBadge() {
    const px = 0.5 * scale;
    const x = 18;
    const y = h - 18;
    const label = '0.5 AU';
    ctx.save();
    ctx.font = `400 9px ${MONO}`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(8, 12, 18, .74)';
    ctx.fillRect(x - 5, y - 17, Math.max(px, tw) + 12, 24);

    ctx.strokeStyle = 'rgba(185, 199, 214, .5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y);
    ctx.lineTo(x + px, y);
    ctx.lineTo(x + px, y - 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(132, 151, 170, .85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, x, y - 6);
    ctx.restore();
  }

  /* Nhãn hai dòng: ngôn ngữ đang chọn đậm, ngôn ngữ kia mờ.
     Có tấm nền mờ phía sau, vì nhãn nằm ngay trên đường quỹ đạo và
     đường bay. Không có nền thì nét đứt chạy xuyên qua chữ, đọc không
     ra, nhất là ở cỡ chữ nhỏ. */
  function labelBoth(x, y, primary, secondary, color, align) {
    if (w < 380 && align === 'center') {
      secondary = '';
    }
    const a = align || 'center';

    ctx.save();
    ctx.font = `600 10px ${DISPLAY}`;
    const t1 = primary.toUpperCase();
    const w1 = ctx.measureText(t1).width;
    let w2 = 0;
    let t2 = '';
    if (secondary) {
      ctx.font = `400 8px ${MONO}`;
      t2 = secondary.toUpperCase();
      w2 = ctx.measureText(t2).width;
    }
    const boxW = Math.max(w1, w2) + 10;
    const boxH = secondary ? 23 : 14;
    let boxX = x - boxW / 2;
    if (a === 'left') boxX = x - 5;
    if (a === 'right') boxX = x - boxW + 5;
    const boxY = y - 12;

    ctx.fillStyle = 'rgba(7, 9, 13, .78)';
    ctx.beginPath();
    const rr = 3;
    ctx.moveTo(boxX + rr, boxY);
    ctx.lineTo(boxX + boxW - rr, boxY);
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + rr);
    ctx.lineTo(boxX + boxW, boxY + boxH - rr);
    ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - rr, boxY + boxH);
    ctx.lineTo(boxX + rr, boxY + boxH);
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - rr);
    ctx.lineTo(boxX, boxY + rr);
    ctx.quadraticCurveTo(boxX, boxY, boxX + rr, boxY);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = a;
    ctx.textBaseline = 'bottom';
    ctx.font = `600 10px ${DISPLAY}`;
    ctx.fillStyle = color;
    ctx.fillText(t1, x, y);

    if (t2) {
      ctx.font = `400 8px ${MONO}`;
      ctx.fillStyle = 'rgba(132, 151, 170, .85)';
      ctx.fillText(t2, x, y + 9);
    }
    ctx.restore();
  }

  /* ---------- bảng số liệu ---------- */

  const last = {};

  function setText(el, key, value) {
    if (!el) return;
    if (last[key] === value) return;
    last[key] = value;
    el.textContent = value;
  }

  function paintPanel(s) {
    setText(out.distanceAu, 'au', num(s.distanceAu, 3));
    setText(out.distanceKm, 'km', num(s.distanceKm, 0));
    setText(out.delay, 'delay', num(s.delayMinutes, 1));
    setText(out.phase, 'phase', num(s.phaseDeg, 1));

    const c = s.clock;
    setText(out.clock, 'clock', `T+${String(c.days).padStart(3, '0')}:${pad2(c.hours)}:${pad2(c.minutes)}`);

    const d = s.date;
    const iso =
      `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ` +
      `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
    setText(out.date, 'date', iso);

    setText(out.elapsed, 'elapsed', num(s.day, 1));
    setText(out.remaining, 'remaining', num(Math.max(0, TRANSFER_DAYS - s.day), 1));

    /* thanh tiến trình */
    const pct = s.progress * 100;
    fill.style.width = pct.toFixed(2) + '%';
    knob.style.left = pct.toFixed(2) + '%';
    track.setAttribute('aria-valuenow', String(Math.round(pct)));
    track.setAttribute('aria-valuetext', `${num(s.day, 1)} / ${TRANSFER_DAYS}`);

    setText(dayNum, 'dayNum', num(s.day, 1));
    setText(pctEl, 'pct', Math.round(pct) + '%');

    /* badge tới nơi */
    if (s.arrived) {
      if (badge.hidden) badge.hidden = false;
    } else if (!badge.hidden) {
      badge.hidden = true;
    }

    /* danh sách TCM */
    paintTcmList(s);
  }

  function paintTcmList(s) {
    const items = root.querySelectorAll('.mviz-tcm-item');
    items.forEach((li, i) => {
      const item = TCM[i];
      if (!item) return;
      const done = s.day >= item.day;
      li.classList.toggle('is-done', done);
      li.classList.toggle('is-next', s.nextTcm && s.nextTcm.id === item.id);
      const stateEl = li.querySelector('.mviz-tcm-state');
      const txt = done ? t('mviz.tcmDone') : t('mviz.tcmNext');
      setText(stateEl, 'tcmState' + i, done ? txt : (s.nextTcm && s.nextTcm.id === item.id ? txt : ''));
    });
  }

  /* ---------- tooltip ---------- */

  function showTip(hit) {
    const item = hit.tcm;
    const dateStr = new Date(Date.parse('2033-04-09T04:12:00Z') + item.day * 86400000);
    const iso = `${dateStr.getUTCFullYear()}-${pad2(dateStr.getUTCMonth() + 1)}-${pad2(dateStr.getUTCDate())}`;

    tip.querySelector('.mviz-tip-name').textContent = `TCM ${item.index} · ${item.label.vi}`;
    tip.querySelector('.mviz-tip-name-en').textContent = item.label.en;
    tip.querySelector('.mviz-tip-dv').textContent =
      `${t('mviz.deltaV')}: ${num(item.dvMs, 1)} m/s · ${item.burnSeconds} ${t('mviz.seconds')}`;
    tip.querySelector('.mviz-tip-time').textContent =
      `${t('mviz.day')} ${num(item.day, 1)} · ${iso}`;
    tip.querySelector('.mviz-tip-note').textContent =
      currentLang === 'vi' ? item.note.vi : item.note.en;

    tip.hidden = false;

    const rect = stage.getBoundingClientRect();
    const tipW = tip.offsetWidth || 200;
    const tipH = tip.offsetHeight || 90;
    let x = hit.x + 16;
    let y = hit.y - tipH - 12;
    if (x + tipW > rect.width - 8) x = hit.x - tipW - 16;
    if (x < 8) x = 8;
    if (y < 8) y = hit.y + 18;
    if (y + tipH > rect.height - 8) y = rect.height - tipH - 8;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }

  function hideTip() {
    tip.hidden = true;
  }

  function onPointerMove(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    let best = null;
    let bestD = 18;
    for (const hit of tcmHits) {
      const d = Math.hypot(hit.x - x, hit.y - y);
      if (d < bestD) {
        bestD = d;
        best = hit;
      }
    }

    const id = best ? best.id : null;
    if (id !== hoverId) {
      hoverId = id;
      if (best) showTip(best);
      else hideTip();
      renderOnce();
    } else if (best) {
      /* vẫn trên cùng mốc: cập nhật vị trí cho tooltip đi theo con trỏ
         là không cần, giữ yên cho khỏi nhấp nháy */
    }
    canvas.style.cursor = best ? 'pointer' : 'grab';
  }

  function onPointerLeave() {
    hoverId = null;
    hideTip();
    canvas.style.cursor = '';
    renderOnce();
  }

  /* ---------- kích thước ---------- */

  function resize() {
    const rect = stage.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const newDpr = Math.min(window.devicePixelRatio || 1, 2);
    const nw = Math.round(rect.width);
    const nh = Math.round(rect.height);

    if (nw === w && nh === h && newDpr === dpr) return;

    w = nw;
    h = nh;
    dpr = newDpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    /* Không đặt width/height bằng 100 phần trăm ở đây. Canvas là phần
       tử thay thế, trình duyệt tự co giãn theo thuộc tính width và
       height. Ghi đè bằng CSS phần trăm sẽ làm nó lệch khỏi vùng vẽ
       thật sau mỗi lần đổi bố cục. */
    canvas.style.width = '';
    canvas.style.height = '';

    cx = w * 0.5;
    /* Tâm đặt hơi lệch xuống một chút vì nhãn Mặt Trời nằm dưới quả
       cầu, còn phía trên không có gì. 0,50 giữ viễn điểm Sao Hỏa cách
       mép trên và mép dưới gần bằng nhau. */
    cy = h * 0.50;

    /* Chừa lề cho nhãn hành tinh và cho thanh tỉ lệ dưới đáy. 0,455
       chừa khoảng 8 phần trăm mỗi bên, đủ để nhãn không bị cắt. */
    const usable = Math.min(w * 0.455, h * 0.455);
    scale = usable / MAX_AU;

    buildStars();
    renderOnce();
  }

  /* ---------- vòng lặp ---------- */

  function currentState() {
    return missionState(day);
  }

  function emit(s) {
    if (typeof onFrame === 'function') {
      onFrame({
        day: s.day,
        progress: s.progress,
        distanceKm: s.distanceKm,
        delayMinutes: s.delayMinutes,
        tcmPassed: s.tcmPassed,
      });
    }
  }

  let lastEmit = -1;

  function renderOnce() {
    if (destroyed) return;
    const s = currentState();
    draw(s);
    paintPanel(s);
    if (s.day !== lastEmit) {
      lastEmit = s.day;
      emit(s);
    }
  }

  function tick(ts) {
    if (destroyed) return;
    rafId = requestAnimationFrame(tick);

    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.12, (ts - lastTs) / 1000);
    lastTs = ts;

    if (motionOn) starPhase += dt;

    let moved = false;
    if (playing && !scrubbing) {
      const before = day;
      day += dt * BASE_DAYS_PER_SEC * speed;
      if (day >= TRANSFER_DAYS) {
        day = TRANSFER_DAYS;
        playing = false;
        syncPlayButton();
      }
      if (day !== before) moved = true;
    }

    /* Vẽ mỗi khung hình vì quầng sáng và sao nhấp nháy có nhịp riêng,
       nhưng khi dừng hẳn và không có chuyển động thì chỉ vẽ lại lúc
       cần, đỡ tốn CPU trên máy yếu. */
    if (moved || motionOn || !lastTs) {
      const s = currentState();
      draw(s);
      paintPanel(s);
      /* emit theo từng khung khi đang chạy, để đồng hồ sứ mệnh ở nơi
         khác của game mượt theo */
      if (moved) emit(s);
    }
  }

  /* ---------- điều khiển ---------- */

  /* ---------- icon vector ---------- */

  /* Dùng SVG nội tuyến cho nút, không dùng ký tự emoji. Ký tự như ⏩
     hay ❚❚ phụ thuộc font của máy, có máy hiện thành ô vuông rỗng,
     nút trông như bị lỗi. Vector thì nét ở mọi nơi. */
  const ICON_PLAY = `<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M4 2.6v10.8L13.2 8z"/></svg>`;
  const ICON_PAUSE = `<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true"><rect x="3.6" y="2.6" width="3.1" height="10.8"/><rect x="9.3" y="2.6" width="3.1" height="10.8"/></svg>`;
  const ICON_FAST = `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M1.6 2.8v10.4L8 8z"/><path d="M8.4 2.8v10.4L14.8 8z"/></svg>`;
  const ICON_RESET = `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2.9 8a5.1 5.1 0 1 0 1.5-3.6"/><path d="M2.4 2.4v3h3"/></svg>`;

  function syncPlayButton() {
    btnPlay.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    btnPlay.setAttribute('aria-label', playing ? t('mviz.pause') : t('mviz.play'));
    btnPlay.setAttribute('title', playing ? t('mviz.pause') : t('mviz.play'));
    btnPlay.classList.toggle('is-playing', playing);
  }

  function setSpeed(multiplier) {
    const m = Number(multiplier);
    if (!Number.isFinite(m) || m <= 0) return;
    speed = m;
    let idx = SPEEDS.indexOf(m);
    if (idx < 0) {
      /* tốc độ ngoài ba nút có sẵn: vẫn nhận, chỉ không nút nào sáng */
      idx = -1;
    }
    speedIdx = idx >= 0 ? idx : speedIdx;
    root.querySelectorAll('[data-speed]').forEach((b) => {
      b.classList.toggle('is-active', Number(b.dataset.speed) === m);
    });
    root.dataset.speed = String(m);
  }

  function pause() {
    playing = false;
    syncPlayButton();
    renderOnce();
  }

  function resume() {
    if (day >= TRANSFER_DAYS) day = 0;
    playing = true;
    syncPlayButton();
  }

  function setDay(value) {
    const v = Number(value);
    if (!Number.isFinite(v)) return;
    day = Math.max(0, Math.min(TRANSFER_DAYS, v));
    renderOnce();
  }

  function reset() {
    day = 0;
    playing = false;
    lastEmit = -1;
    syncPlayButton();
    renderOnce();
  }

  /* ---------- kéo thanh tiến trình ---------- */

  function dayFromClientX(clientX) {
    const rect = track.getBoundingClientRect();
    const p = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    return Math.max(0, Math.min(1, p)) * TRANSFER_DAYS;
  }

  function onTrackDown(ev) {
    scrubbing = true;
    track.setPointerCapture && track.setPointerCapture(ev.pointerId);
    day = dayFromClientX(ev.clientX);
    renderOnce();
    ev.preventDefault();
  }

  function onTrackMove(ev) {
    if (!scrubbing) return;
    day = dayFromClientX(ev.clientX);
    renderOnce();
  }

  function onTrackUp() {
    if (!scrubbing) return;
    scrubbing = false;
  }

  function onTrackKey(ev) {
    const step = ev.shiftKey ? 10 : 1;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
      day = Math.min(TRANSFER_DAYS, day + step);
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
      day = Math.max(0, day - step);
    } else if (ev.key === 'Home') {
      day = 0;
    } else if (ev.key === 'End') {
      day = TRANSFER_DAYS;
    } else {
      return;
    }
    ev.preventDefault();
    renderOnce();
  }

  /* ---------- gắn sự kiện ---------- */

  btnPlay.addEventListener('click', () => {
    if (playing) pause();
    else resume();
  });

  btnReset.addEventListener('click', reset);

  root.querySelectorAll('[data-speed]').forEach((btn) => {
    btn.addEventListener('click', () => setSpeed(Number(btn.dataset.speed)));
  });

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);

  track.addEventListener('pointerdown', onTrackDown);
  track.addEventListener('pointermove', onTrackMove);
  track.addEventListener('pointerup', onTrackUp);
  track.addEventListener('pointercancel', onTrackUp);
  track.addEventListener('keydown', onTrackKey);

  /* ---------- nhãn ---------- */

  function fillTcmList() {
    const ul = root.querySelector('.mviz-tcm-list');
    ul.innerHTML = '';
    tcmStrip.innerHTML = '';
    for (const item of TCM) {
      const li = document.createElement('li');
      li.className = 'mviz-tcm-item';
      li.innerHTML = `
        <span class="mviz-tcm-dot"></span>
        <span class="mviz-tcm-body">
          <span class="mviz-tcm-name"><b class="vi"></b><em class="en"></em></span>
          <span class="mviz-tcm-meta"></span>
        </span>
        <span class="mviz-tcm-state"></span>
      `;
      li.querySelector('.mviz-tcm-name .vi').textContent = item.label.vi;
      li.querySelector('.mviz-tcm-name .en').textContent = item.label.en;
      li.querySelector('.mviz-tcm-meta').textContent =
        `Δv ${num(item.dvMs, 1)} m/s · ${t('mviz.day')} ${num(item.day, 1)}`;
      ul.appendChild(li);

      /* vạch mốc trên thanh tiến trình */
      const tick = document.createElement('i');
      tick.className = 'mviz-tcm-tick';
      tick.style.left = ((item.day / TRANSFER_DAYS) * 100).toFixed(2) + '%';
      tcmStrip.appendChild(tick);
    }
  }

  function applyLang() {
    root.querySelector('.mviz-title-vi').textContent = T.vi['mviz.title'];
    root.querySelector('.mviz-title-en').textContent = T.en['mviz.title'];
    root.querySelector('.mviz-title-vi').classList.toggle('is-primary', currentLang === 'vi');
    root.querySelector('.mviz-title-en').classList.toggle('is-primary', currentLang === 'en');
    root.querySelector('.mviz-sub').textContent =
      `${t('mviz.subtitle')} · ${tOther('mviz.subtitle')}`;

    root.querySelector('.mviz-badge').textContent =
      `${t('mviz.arrived')} · ${tOther('mviz.arrived')}`;

    const keys = root.querySelectorAll('.mviz-legend .mviz-key');
    const legendKeys = ['mviz.legendTransfer', 'mviz.legendEarth', 'mviz.legendMars'];
    keys.forEach((el, i) => {
      el.querySelector('.mviz-key-vi').textContent = T.vi[legendKeys[i]];
      el.querySelector('.mviz-key-en').textContent = T.en[legendKeys[i]];
      el.querySelector('.mviz-key-vi').classList.toggle('is-primary', currentLang === 'vi');
      el.querySelector('.mviz-key-en').classList.toggle('is-primary', currentLang === 'en');
    });

    /* nhãn ô số liệu, chọn theo data-l để không phụ thuộc thứ tự DOM */
    const LABEL_OF = {
      distance: 'mviz.distance',
      delay: 'mviz.delay',
      clock: 'mviz.missionClock',
      tcm: 'mviz.tcm',
      budget: 'mviz.budget',
    };
    root.querySelectorAll('.mviz-side-block').forEach((block) => {
      const vi = block.querySelector('.mviz-l-vi');
      const en = block.querySelector('.mviz-l-en');
      if (!vi || !en) return;
      const key = LABEL_OF[block.dataset.l];
      if (!key) return;
      vi.textContent = T.vi[key];
      en.textContent = T.en[key];
      vi.classList.toggle('is-primary', currentLang === 'vi');
      en.classList.toggle('is-primary', currentLang === 'en');
    });

    /* nhãn ngân sách delta-v */
    const BUDGET_OF = {
      dep: 'mviz.budgetDep',
      arr: 'mviz.budgetArr',
      tot: 'mviz.budgetTotal',
    };
    root.querySelectorAll('[data-b]').forEach((el) => {
      const key = BUDGET_OF[el.dataset.b];
      if (key) el.textContent = t(key);
    });
    root.querySelector('[data-bv="dep"]').textContent = num(DELTA_V.departure, 3);
    root.querySelector('[data-bv="arr"]').textContent = num(DELTA_V.arrival, 3);
    root.querySelector('[data-bv="tot"]').textContent = num(DELTA_V.total, 3);

    /* đơn vị, chọn theo data-u để không phụ thuộc thứ tự DOM */
    const uAu = root.querySelector('[data-u="au"]');
    const uKm = root.querySelector('[data-u="km"]');
    const uDelay = root.querySelector('[data-u="delay"]');
    const uPhase = root.querySelector('[data-u="phase"]');
    if (uAu) uAu.innerHTML = '<b>AU</b>';
    if (uKm) uKm.textContent = 'km';
    if (uDelay) uDelay.innerHTML = `<b>${t('mviz.min')}</b>`;
    if (uPhase) uPhase.textContent = t('mviz.deg');

    root.querySelectorAll('.mviz-mini-label').forEach((el) => {
      const key = el.dataset.l === 'elapsed'
        ? 'mviz.elapsed'
        : el.dataset.l === 'phase'
          ? 'mviz.phase'
          : 'mviz.remaining';
      el.textContent = t(key);
    });

    root.querySelector('.mviz-day-of').textContent = `${t('mviz.of')} ${TRANSFER_DAYS}`;
    root.querySelector('.mviz-note').textContent =
      `${t('mviz.note')} ${tOther('mviz.note')}`;

    track.setAttribute('aria-label', t('mviz.scrub'));
    btnReset.setAttribute('aria-label', t('mviz.reset'));
    btnReset.setAttribute('title', t('mviz.reset'));

    const fastBtn = root.querySelector('[data-speed="20"]');
    if (fastBtn) {
      fastBtn.innerHTML = ICON_FAST;
      fastBtn.setAttribute('title', `${t('mviz.fast')} · ${tOther('mviz.fast')}`);
      fastBtn.setAttribute('aria-label', t('mviz.fast'));
    }
    btnReset.innerHTML = ICON_RESET;

    root.dataset.lang = currentLang;
    syncPlayButton();
    fillTcmList();
    last.dayNum = null;
    renderOnce();
  }

  /* ---------- khởi động ---------- */

  const ro = new ResizeObserver(() => resize());
  ro.observe(stage);

  /* CSS của module được nhúng bằng thẻ link, nên nó tới SAU khi module
     chạy. Lần đo đầu tiên vì thế có thể rơi vào lúc khung chưa có
     aspect-ratio và trả về một chiều cao sai. Đo lại vài lần ở các mốc
     khác nhau để chắc chắn bắt được bố cục cuối cùng, dù ResizeObserver
     có bỏ sót nhịp nào. */
  const lateChecks = [0, 60, 240, 700, 1500].map((ms) =>
    setTimeout(() => { if (!destroyed) resize(); }, ms)
  );

  function onWindowResize() {
    if (!destroyed) resize();
  }
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('orientationchange', onWindowResize);

  let motionQuery = null;
  function onMotionQuery() {
    motionOn = readMotion();
    renderOnce();
  }
  try {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionQuery);
  } catch {
    motionQuery = null;
  }

  fillTcmList();
  applyLang();
  setSpeed(SPEEDS[0]);
  resize();
  /* Không tự chạy khi người chơi đã tắt chuyển động: bản đồ đứng yên
     ở ngày 0 cho tới khi họ tự bấm chạy hoặc kéo thanh. */
  if (!motionOn) {
    playing = false;
    syncPlayButton();
  }
  renderOnce();
  rafId = requestAnimationFrame(tick);

  /* ---------- API ---------- */

  return {
    root,
    get day() {
      return day;
    },
    get progress() {
      return day / TRANSFER_DAYS;
    },
    setSpeed,
    setDay,
    pause,
    resume,
    reset,
    setLang(next) {
      currentLang = next === 'en' ? 'en' : 'vi';
      applyLang();
    },
    get lang() {
      return currentLang;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      lateChecks.forEach((id) => clearTimeout(id));
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('orientationchange', onWindowResize);
      if (motionQuery && motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', onMotionQuery);
      }
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      track.removeEventListener('pointerdown', onTrackDown);
      track.removeEventListener('pointermove', onTrackMove);
      track.removeEventListener('pointerup', onTrackUp);
      track.removeEventListener('pointercancel', onTrackUp);
      track.removeEventListener('keydown', onTrackKey);
      root.remove();
    },
    /* tiện cho nơi khác cần số liệu tĩnh */
    constants: { TRANSFER_DAYS, DELTA_V, AU_KM },
  };
}
