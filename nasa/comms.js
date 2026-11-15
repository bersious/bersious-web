/* ============================================================
   comms.js
   Giai đoạn 1: bảng điều khiển viễn thông ba bước.

   Người chơi phải làm ba việc liên tiếp để gửi tín hiệu cầu cứu
   đầu tiên về Trái Đất:
     1. Cắt tải không thiết yếu để dồn 850 W cho bộ phát.
     2. Bắt nhịp vệ tinh MRO trong cửa sổ 90 giây và căn ăng-ten.
     3. Đóng gói telemetry vừa 16 byte và phát về một trạm DSN.

   Nguồn số liệu duy nhất: data/nasa/mars_comms_protocol.json.
   Chuỗi giao diện: i18n.js, tiền tố 'comms.'.
   Màu, cỡ chữ, khoảng cách: css/tokens.css, qua css/comms.css.

   Đường dẫn: luôn lấy base bằng new URL('.', import.meta.url).href.
   Trang deploy ở /nasa không có dấu chéo cuối nên nếu dựng base từ
   location.href thì mọi file sẽ 404.
   ============================================================ */

import { t, getLang, onLangChange } from './i18n.js';
import { getSettings, onSettingsChange } from './settings.js';
import { playOneShotSfx } from './audio-sfx.js';

const BASE = new URL('.', import.meta.url).href;
const DATA_URL = BASE + 'data/nasa/mars_comms_protocol.json';
const ART = {
  mro: BASE + 'assets/art/icon-mro-satellite.webp',
  dsn: BASE + 'assets/art/icon-dsn-dish.webp',
  uhf: BASE + 'assets/art/icon-uhf-transmitter.webp',
  hex: BASE + 'assets/art/icon-hex-packet.webp',
};

/* Cửa sổ liên lạc vẽ trên radar, tính bằng độ quanh đỉnh trạm. */
const ARC_HALF_DEG = 52;
/* Một vòng quỹ đạo vẽ nhanh cho dễ nhìn, không phải 112 phút thật. */
const ORBIT_MS = 34000;
const WAIT_NEXT_PASS_MS = 5000;
const FLIGHT_MS = 3000;

function injectCss() {
  if (document.querySelector('link[data-comms-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css/comms.css';
  link.dataset.commsCss = '1';
  document.head.appendChild(link);
}

/* ---------- tiện ích ---------- */

function tr(key, vars) {
  let s = t(key);
  if (vars) {
    for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  }
  return s;
}

/* Nội dung dài (tên thiết bị, mô tả khoa học, hậu quả gói tin) nằm
   trong JSON và đã có sẵn cả bản _vi lẫn _en, nên đọc thẳng theo
   ngôn ngữ đang bật thay vì chép lại lần hai vào i18n. */
function pick(obj, field) {
  if (!obj) return '';
  const en = getLang() === 'en';
  return (en ? obj[field + '_en'] : obj[field + '_vi']) || obj[field + '_vi'] || obj[field + '_en'] || '';
}

function fmt(n, digits = 0) {
  const fixed = Number(n).toFixed(digits);
  const neg = fixed.startsWith('-');
  const body = neg ? fixed.slice(1) : fixed;
  const parts = body.split('.');
  const sep = getLang() === 'en' ? ',' : '.';
  const dec = getLang() === 'en' ? '.' : ',';
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (neg ? '-' : '') + parts.join(dec);
}

function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

const reduceMotionQuery = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

function motionOn() {
  return Boolean(getSettings().motion) && !reduceMotionQuery.matches;
}

/* Vòng lặp hoạt ảnh có đường lui.
   requestAnimationFrame bị trình duyệt bóp lại khi tab bị ẩn, và có
   môi trường (chế độ headless, cửa sổ thu nhỏ) nó không chạy chút nào.
   Nếu chỉ dựa vào rAF thì hoạt ảnh đứng im và màn chơi không bao giờ
   hoàn tất. Ở đây rAF lo độ mượt, còn một nhịp setInterval chỉ nhảy
   vào khi rAF đã im quá 120ms, để hoạt ảnh luôn chạy tới cuối. */
function runAnim(ms, onFrame, onEnd, reg) {
  const start = performance.now();
  let done = false;
  let lastRaf = 0;
  let raf = 0;
  let iv = 0;

  const cleanup = () => {
    if (raf) cancelAnimationFrame(raf);
    if (iv) clearInterval(iv);
    if (reg) { reg.delete(iv); }
  };

  const step = (now) => {
    if (done) return;
    const p = Math.min(1, Math.max(0, (now - start) / ms));
    onFrame(p);
    if (p >= 1) {
      done = true;
      cleanup();
      onEnd();
    }
  };

  const rafLoop = (now) => {
    if (done) return;
    lastRaf = now;
    step(now);
    if (!done && !destroyed) raf = requestAnimationFrame(rafLoop);
  };
  raf = requestAnimationFrame(rafLoop);

  iv = setInterval(() => {
    if (done) return;
    if (performance.now() - lastRaf > 120) step(performance.now());
  }, 90);
  if (reg) reg.add(iv);
}

/* ============================================================
   KHUNG DOM
   ============================================================ */

const SHELL = `
  <div class="comms-scrim"></div>
  <div class="comms-panel" role="dialog" aria-modal="true" aria-labelledby="comms-title">
    <header class="comms-head">
      <div class="comms-head-text">
        <p class="comms-eyebrow"></p>
        <h2 class="comms-title" id="comms-title"></h2>
      </div>
      <div class="comms-head-side">
        <ol class="comms-steps">
          <li class="comms-chip" data-chip="1"><span class="comms-chip-num">1</span><span class="comms-chip-txt"></span></li>
          <li class="comms-chip" data-chip="2"><span class="comms-chip-num">2</span><span class="comms-chip-txt"></span></li>
          <li class="comms-chip" data-chip="3"><span class="comms-chip-num">3</span><span class="comms-chip-txt"></span></li>
        </ol>
        <button type="button" class="comms-info-btn" aria-haspopup="dialog">
          <span aria-hidden="true">i</span>
        </button>
      </div>
    </header>

    <div class="comms-body">
      <p class="comms-loading"></p>

      <section class="comms-step" data-step="1" hidden>
        <div class="comms-col">
          <div class="comms-card">
            <div class="comms-card-head">
              <h3 class="comms-card-title" data-k="s1.envTitle"></h3>
              <span class="comms-card-note" data-k="s1.envSub"></span>
            </div>
            <dl class="comms-env">
              <div class="comms-env-item" data-env="tau">
                <dt data-k="s1.tau"></dt><dd class="comms-env-v"></dd>
              </div>
              <div class="comms-env-item" data-env="eff">
                <dt data-k="s1.eff"></dt><dd class="comms-env-v"></dd>
              </div>
              <div class="comms-env-item" data-env="temp">
                <dt data-k="s1.temp"></dt><dd class="comms-env-v"></dd>
              </div>
              <div class="comms-env-item" data-env="press">
                <dt data-k="s1.press"></dt><dd class="comms-env-v"></dd>
              </div>
              <div class="comms-env-item" data-env="wind">
                <dt data-k="s1.wind"></dt><dd class="comms-env-v"></dd>
              </div>
            </dl>
          </div>

          <div class="comms-card">
            <div class="comms-card-head">
              <h3 class="comms-card-title" data-k="s1.lifeTitle"></h3>
            </div>
            <div class="comms-gauge" data-gauge="o2">
              <div class="comms-gauge-line">
                <span data-k="s1.o2"></span>
                <b class="comms-gauge-v"></b>
              </div>
              <div class="comms-gauge-track"><span class="comms-gauge-fill"></span></div>
            </div>
            <div class="comms-gauge" data-gauge="temp">
              <div class="comms-gauge-line">
                <span data-k="s1.cabin"></span>
                <b class="comms-gauge-v"></b>
              </div>
              <div class="comms-gauge-track"><span class="comms-gauge-fill"></span></div>
            </div>
            <p class="comms-gauge-note" data-k="s1.lifeNote"></p>
          </div>
        </div>

        <div class="comms-col">
          <div class="comms-card comms-power">
            <div class="comms-meter-head">
              <span class="comms-meter-lbl" data-k="s1.used"></span>
              <span class="comms-meter-val"><b class="comms-used">0 W</b> <i>/</i> <span class="comms-avail mono"></span></span>
            </div>
            <div class="comms-bar">
              <span class="comms-seg comms-seg-ess"></span>
              <span class="comms-seg comms-seg-load"></span>
              <mark class="comms-need-mark"></mark>
            </div>
            <div class="comms-legend">
              <span class="comms-leg comms-leg-ess"><i></i><span data-k="s1.legEss"></span></span>
              <span class="comms-leg comms-leg-load"><i></i><span data-k="s1.legLoad"></span></span>
              <span class="comms-leg comms-leg-free"><i></i><span data-k="s1.legFree"></span></span>
            </div>
            <p class="comms-meter-note"></p>
          </div>

          <div class="comms-card comms-devices-card">
            <div class="comms-card-head">
              <h3 class="comms-card-title" data-k="s1.devTitle"></h3>
              <img class="comms-card-icon" alt="" />
            </div>
            <ul class="comms-devices"></ul>
          </div>
        </div>
      </section>

      <section class="comms-step" data-step="2" hidden>
        <div class="comms-col">
          <div class="comms-card comms-radar-card">
            <div class="comms-card-head">
              <h3 class="comms-card-title" data-k="s2.passTitle"></h3>
              <span class="comms-timer mono"></span>
            </div>
            <div class="comms-radar">
              <svg viewBox="0 0 320 320" role="img" aria-labelledby="comms-radar-desc">
                <title id="comms-radar-desc"></title>
                <g class="comms-radar-rings">
                  <circle cx="160" cy="160" r="150"></circle>
                  <circle cx="160" cy="160" r="108"></circle>
                  <circle cx="160" cy="160" r="66"></circle>
                </g>
                <path class="comms-arc" d=""></path>
                <g class="comms-mars">
                  <circle cx="160" cy="160" r="30" class="comms-mars-body"></circle>
                  <circle cx="150" cy="152" r="7" class="comms-mars-spot"></circle>
                  <circle cx="172" cy="170" r="4" class="comms-mars-spot"></circle>
                  <text x="160" y="212" class="comms-mars-lab">MARS</text>
                </g>
                <g class="comms-beam" aria-hidden="true">
                  <line class="comms-beam-a" x1="160" y1="298" x2="160" y2="160"></line>
                  <line class="comms-beam-b" x1="160" y1="298" x2="160" y2="160"></line>
                </g>
                <g class="comms-sat">
                  <circle r="13" class="comms-sat-glow"></circle>
                  <rect x="-9" y="-3" width="18" height="6" rx="1" class="comms-sat-body"></rect>
                  <rect x="-16" y="-6" width="6" height="12" rx="1" class="comms-sat-panel"></rect>
                  <rect x="10" y="-6" width="6" height="12" rx="1" class="comms-sat-panel"></rect>
                </g>
                <g class="comms-ground">
                  <path d="M150 300 L160 284 L170 300 Z" class="comms-ground-dish"></path>
                  <line x1="160" y1="284" x2="160" y2="272" class="comms-ground-mast"></line>
                </g>
              </svg>
            </div>
            <div class="comms-radar-foot">
              <span class="comms-radar-state"></span>
              <span class="comms-radar-spec"></span>
            </div>
          </div>
        </div>

        <div class="comms-col">
          <div class="comms-card comms-snr-card">
            <div class="comms-snr-head">
              <span data-k="s2.snr"></span>
              <b class="comms-snr-val mono"></b>
            </div>
            <div class="comms-snr-track">
              <span class="comms-snr-zone"></span>
              <span class="comms-snr-fill"></span>
              <mark class="comms-snr-mark"></mark>
            </div>
            <div class="comms-snr-foot">
              <span data-k="s2.threshold"></span>
              <span class="comms-snr-state"></span>
            </div>
          </div>

          <div class="comms-slider">
            <div class="comms-slider-head">
              <label class="comms-slider-lbl" for="comms-elev" data-k="s2.elev"></label>
              <b class="comms-slider-val mono"></b>
            </div>
            <input type="range" id="comms-elev" class="comms-range" step="0.5" />
            <div class="comms-slider-scale"><span>55°</span><span>68°</span><span>80°</span></div>
          </div>

          <div class="comms-slider">
            <div class="comms-slider-head">
              <label class="comms-slider-lbl" for="comms-freq" data-k="s2.freq"></label>
              <b class="comms-slider-val mono"></b>
            </div>
            <input type="range" id="comms-freq" class="comms-range" step="0.1" />
            <div class="comms-slider-scale"><span>399</span><span>401,5</span><span>404 MHz</span></div>
          </div>

          <p class="comms-hint" role="status" aria-live="polite"></p>
        </div>
      </section>

      <section class="comms-step" data-step="3" hidden>
        <div class="comms-col">
          <div class="comms-card">
            <div class="comms-card-head">
              <h3 class="comms-card-title" data-k="s3.pktTitle"></h3>
              <img class="comms-card-icon" alt="" />
            </div>
            <ul class="comms-pkts"></ul>
          </div>
        </div>

        <div class="comms-col">
          <div class="comms-card comms-budget">
            <div class="comms-card-head">
              <h3 class="comms-card-title" data-k="s3.budget"></h3>
              <span class="comms-budget-count mono"></span>
            </div>
            <div class="comms-bar comms-bar-sm"><span class="comms-budget-fill"></span></div>
            <p class="comms-budget-note"></p>
            <ul class="comms-chosen"></ul>
          </div>
          <button type="button" class="comms-transmit" disabled>
            <span class="comms-transmit-txt" data-k="s3.transmit"></span>
          </button>
          <p class="comms-transmit-note"></p>
        </div>

        <div class="comms-flight" hidden>
          <div class="comms-flight-head">
            <span class="comms-flight-lbl" data-k="s3.flying"></span>
            <b class="comms-flight-clock mono">00:00</b>
          </div>
          <div class="comms-flight-svgwrap">
            <svg class="comms-flight-svg" viewBox="0 0 660 220" aria-hidden="true">
              <path class="comms-flight-path" d="M 78 156 C 230 34, 430 34, 582 156"></path>
              <g class="comms-flight-mars">
                <circle cx="78" cy="156" r="26" class="comms-fm-body"></circle>
                <circle cx="70" cy="148" r="6" class="comms-fm-spot"></circle>
                <text x="78" y="200" class="comms-fm-lab">MARS</text>
              </g>
              <g class="comms-flight-earth">
                <circle cx="582" cy="156" r="18" class="comms-fe-body"></circle>
                <path d="M570 148 q12 -8 24 2" class="comms-fe-land"></path>
                <text x="582" y="200" class="comms-fe-lab">EARTH</text>
              </g>
              <g class="comms-flight-track"></g>
            </svg>
          </div>
          <p class="comms-flight-note" data-k="s3.delay"></p>

          <ul class="comms-dsn"></ul>

          <div class="comms-ack" hidden>
            <span class="comms-ack-badge"></span>
            <span class="comms-ack-text"></span>
          </div>
        </div>
      </section>
    </div>

    <footer class="comms-foot">
      <p class="comms-status" role="status" aria-live="polite"></p>
      <button type="button" class="comms-next" disabled></button>
    </footer>
  </div>

  <div class="comms-modal" hidden role="dialog" aria-modal="true" aria-labelledby="comms-modal-title">
    <div class="comms-modal-scrim"></div>
    <div class="comms-modal-panel">
      <div class="comms-modal-head">
        <h3 id="comms-modal-title"></h3>
        <button type="button" class="comms-modal-close" aria-label="">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="comms-modal-body"></div>
      <button type="button" class="comms-modal-ok" data-k="info.close"></button>
    </div>
  </div>
`;

/* ============================================================
   MODULE
   ============================================================ */

export function startComms({ container, onDone } = {}) {
  injectCss();

  const host = container || document.body;
  const root = document.createElement('div');
  root.className = 'comms-root';
  root.innerHTML = SHELL;
  host.appendChild(root);

  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => Array.from(root.querySelectorAll(sel));

  let DATA = null;
  let destroyed = false;
  const timers = new Set();
  let rafId = 0;

  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); if (!destroyed) fn(); }, ms);
    timers.add(id);
    return id;
  }

  const st = {
    step: 1,
    on: {},
    o2: 100,
    cabin: 21,
    elev: 63.5,
    freq: 400.2,
    snr: 0,
    locked: false,
    passLeft: 90,
    passDeadline: 0,
    passPhase: 'live',   // live | wait
    picked: new Set(),
    flying: false,
    finished: false,
    satAngle: 0,
  };

  /* ---------- phần tử ---------- */

  const elBody = q('.comms-body');
  const elLoading = q('.comms-loading');
  const elStatus = q('.comms-status');
  const elNext = q('.comms-next');
  const elInfoBtn = q('.comms-info-btn');
  const elModal = q('.comms-modal');

  /* ============================================================
     TẢI DỮ LIỆU
     ============================================================ */

  fetch(DATA_URL, { cache: 'no-cache' })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((json) => {
      if (destroyed) return;
      DATA = json;
      boot();
    })
    .catch((err) => {
      if (destroyed) return;
      elLoading.textContent = tr('comms.loadFail');
      elLoading.classList.add('is-error');
      elLoading.hidden = false;
      // eslint-disable-next-line no-console
      console.error('[comms] không nạp được dữ liệu', err);
    });

  /* ============================================================
     DỰNG TOÀN BỘ
     ============================================================ */

  function boot() {
    const P = DATA.power_budget;
    P.devices.forEach((d) => { st.on[d.id] = true; });

    elLoading.hidden = true;
    qa('.comms-step').forEach((s) => { s.hidden = false; });

    buildDevices();
    buildPackets();
    buildDsn();
    buildRadar();
    applyTexts();
    bindEvents();

    renderPower();
    renderGauges();
    renderSnr();
    renderBudget();
    setStep(1, { silent: true });

    /* nhịp sống của màn: O2, nhiệt độ khoang và đồng hồ cửa sổ bay.
       Trừ theo đồng hồ thật chứ không theo số lần gọi: trình duyệt bóp
       setInterval xuống một giây một lần khi tab bị ẩn, nếu trừ cố định
       thì cửa sổ bay đứng im. */
    let lastTick = performance.now();
    const tick = setInterval(() => {
      if (destroyed) return;
      const now = performance.now();
      const dt = Math.min(1.5, (now - lastTick) / 1000);
      lastTick = now;
      tickLife(dt);
      if (st.step === 2) tickPass();
    }, 250);
    timers.add(tick);

    drawSat();
    startOrbit();

    const firstSwitch = q('.comms-switch');
    if (firstSwitch) firstSwitch.focus({ preventScroll: true });
  }

  /* ============================================================
     BƯỚC 1: NGÂN SÁCH ĐIỆN
     ============================================================ */

  function buildDevices() {
    const P = DATA.power_budget;
    const ul = q('.comms-devices');
    ul.innerHTML = '';
    P.devices.forEach((d) => {
      const li = document.createElement('li');
      li.className = 'comms-dev' + (d.essential ? ' is-ess' : '');
      li.dataset.id = d.id;
      li.innerHTML = `
        <div class="comms-dev-main">
          <div class="comms-dev-name"><span class="comms-dev-txt"></span></div>
          <p class="comms-dev-desc"></p>
        </div>
        <div class="comms-dev-side">
          <span class="comms-dev-w mono"></span>
          <button type="button" class="comms-switch" role="switch" aria-checked="true">
            <span class="comms-switch-track"><span class="comms-switch-knob"></span></span>
            <span class="comms-switch-txt"></span>
          </button>
        </div>`;
      const txt = li.querySelector('.comms-dev-txt');
      txt.textContent = pick(d, 'name');
      if (d.essential) {
        const tag = document.createElement('span');
        tag.className = 'comms-tag';
        tag.dataset.k = 's1.essential';
        tag.textContent = tr('comms.s1.essential');
        txt.appendChild(tag);
      }
      li.querySelector('.comms-dev-desc').textContent = pick(d, 'desc');
      li.querySelector('.comms-dev-w').textContent = fmt(d.draw_w) + ' W';
      li.querySelector('.comms-switch').addEventListener('click', () => toggleDevice(d.id));
      ul.appendChild(li);
    });
  }

  function toggleDevice(id) {
    if (st.step !== 1 || st.finished) return;
    st.on[id] = !st.on[id];
    playOneShotSfx('switch-flip');
    const dev = DATA.power_budget.devices.find((d) => d.id === id);
    const row = q('.comms-dev[data-id="' + id + '"]');
    if (row) {
      row.classList.toggle('is-off', !st.on[id]);
      const sw = row.querySelector('.comms-switch');
      sw.setAttribute('aria-checked', String(st.on[id]));
      sw.querySelector('.comms-switch-txt').textContent = tr(st.on[id] ? 'comms.on' : 'comms.off');
    }
    if (dev && dev.essential && !st.on[id]) playOneShotSfx('warning-chime');
    renderPower();
  }

  function powerFigures() {
    const P = DATA.power_budget;
    let ess = 0;
    let load = 0;
    P.devices.forEach((d) => {
      if (!st.on[d.id]) return;
      if (d.essential) ess += d.draw_w; else load += d.draw_w;
    });
    const avail = P.solar_available_w;
    return { ess, load, used: ess + load, avail, free: avail - ess - load, tx: P.transmitter_draw_w };
  }

  function essentialsOff() {
    return DATA.power_budget.devices.filter((d) => d.essential && !st.on[d.id]);
  }

  function canLeaveStep1() {
    const f = powerFigures();
    return essentialsOff().length === 0 && f.free >= f.tx;
  }

  function renderPower() {
    if (!DATA) return;
    const f = powerFigures();
    const pct = (w) => Math.max(0, Math.min(100, (w / f.avail) * 100));

    q('.comms-used').textContent = fmt(f.used) + ' W';
    q('.comms-avail').textContent = fmt(f.avail) + ' W';
    q('.comms-seg-ess').style.width = pct(f.ess) + '%';
    q('.comms-seg-load').style.width = pct(f.load) + '%';
    q('.comms-need-mark').style.left = pct(f.avail - f.tx) + '%';

    const note = q('.comms-meter-note');
    const ok = f.free >= f.tx;
    note.classList.toggle('is-ok', ok && essentialsOff().length === 0);
    note.classList.toggle('is-bad', !ok || essentialsOff().length > 0);

    if (essentialsOff().length > 0) {
      note.textContent = tr('comms.s1.warnEss', { names: essentialsOff().map((d) => pick(d, 'name')).join(', ') });
    } else if (ok) {
      note.textContent = tr('comms.s1.freeOk', { n: fmt(f.free) });
    } else {
      note.textContent = tr('comms.s1.freeShort', { n: fmt(f.free), d: fmt(f.tx - f.free) });
    }

    updateGate();
  }

  function renderGauges() {
    if (!DATA) return;
    const o2 = q('[data-gauge="o2"]');
    const tp = q('[data-gauge="temp"]');
    o2.querySelector('.comms-gauge-fill').style.width = Math.max(0, Math.min(100, st.o2)) + '%';
    o2.querySelector('.comms-gauge-v').textContent = fmt(st.o2) + ' %';
    o2.classList.toggle('is-low', st.o2 < 40);

    const tpct = ((st.cabin - (-30)) / (25 - (-30))) * 100;
    tp.querySelector('.comms-gauge-fill').style.width = Math.max(0, Math.min(100, tpct)) + '%';
    tp.querySelector('.comms-gauge-v').textContent = fmt(st.cabin, 1) + ' °C';
    tp.classList.toggle('is-low', st.cabin < 10);
  }

  function tickLife(dt) {
    const oxygenOn = st.on.o2_pump !== false;
    const heatOn = st.on.heater_main !== false;
    const nextO2 = oxygenOn ? Math.min(100, st.o2 + dt * 3) : Math.max(0, st.o2 - dt * 4);
    const nextT = heatOn ? Math.min(21, st.cabin + dt * 0.6) : st.cabin - dt * 1.1;
    if (Math.abs(nextO2 - st.o2) > 0.05 || Math.abs(nextT - st.cabin) > 0.01) {
      st.o2 = nextO2;
      st.cabin = nextT;
      renderGauges();
    }
  }

  /* ============================================================
     BƯỚC 2: RADAR VÀ CĂN ĂNG-TEN
     ============================================================ */

  const R_CENTER = 160;
  const R_ORBIT = 108;

  function polar(angleDeg, radius) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: R_CENTER + Math.cos(a) * radius,
      y: R_CENTER + Math.sin(a) * radius,
    };
  }

  function buildRadar() {
    const a1 = polar(-ARC_HALF_DEG, R_ORBIT);
    const a2 = polar(ARC_HALF_DEG, R_ORBIT);
    q('.comms-arc').setAttribute(
      'd',
      `M ${a1.x.toFixed(2)} ${a1.y.toFixed(2)} A ${R_ORBIT} ${R_ORBIT} 0 0 1 ${a2.x.toFixed(2)} ${a2.y.toFixed(2)}`
    );
    const ant = DATA.antenna_tuning;
    const elev = q('#comms-elev');
    elev.min = String(ant.elevation_min_deg);
    elev.max = String(ant.elevation_max_deg);
    elev.value = String(st.elev);
    const freq = q('#comms-freq');
    freq.min = String(ant.freq_min_mhz);
    freq.max = String(ant.freq_max_mhz);
    freq.value = String(st.freq);
  }

  function drawSat() {
    const p = polar(st.satAngle, R_ORBIT);
    const g = q('.comms-sat');
    if (g) g.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);

    const inside = Math.abs(((st.satAngle + 180) % 360) - 180) <= ARC_HALF_DEG;
    g.classList.toggle('in-window', inside);

    const beam = q('.comms-beam');
    const ground = { x: R_CENTER, y: 286 };
    const a = q('.comms-beam-a');
    const b = q('.comms-beam-b');
    a.setAttribute('x1', ground.x); a.setAttribute('y1', ground.y);
    a.setAttribute('x2', p.x.toFixed(2)); a.setAttribute('y2', p.y.toFixed(2));
    b.setAttribute('x1', ground.x); b.setAttribute('y1', ground.y);
    b.setAttribute('x2', p.x.toFixed(2)); b.setAttribute('y2', p.y.toFixed(2));
    beam.classList.toggle('is-live', st.locked);
  }

  function startOrbit() {
    /* Chạy bằng setInterval thay vì requestAnimationFrame: tab bị ẩn
       thì rAF gần như dừng, còn nhịp 40ms vẫn đều. Quỹ đạo chỉ là hình
       trang trí nên 25 khung mỗi giây là đủ mượt. */
    if (rafId) { clearInterval(rafId); rafId = 0; }
    let last = performance.now();
    rafId = setInterval(() => {
      if (destroyed) return;
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (st.step === 2 && motionOn() && st.passPhase === 'live') {
        st.satAngle = (st.satAngle + (dt / ORBIT_MS) * 360) % 360;
        drawSat();
      }
    }, 40);
    timers.add(rafId);
  }

  function snrOf(elev, freq) {
    const A = DATA.antenna_tuning;
    const de = elev - A.elevation_target_deg;
    const df = freq - A.freq_target_mhz;
    return A.snr_max_db - 0.35 * de * de - 2.6 * df * df;
  }

  function renderSnr() {
    if (!DATA) return;
    const A = DATA.antenna_tuning;
    st.snr = snrOf(st.elev, st.freq);
    const pass = st.snr >= A.snr_threshold_db;
    const pct = Math.max(0, Math.min(100, (st.snr / A.snr_max_db) * 100));

    q('.comms-snr-fill').style.width = pct + '%';
    q('.comms-snr-mark').style.left = (A.snr_threshold_db / A.snr_max_db) * 100 + '%';
    q('.comms-snr-val').textContent = (st.snr >= 0 ? '' : '') + fmt(st.snr, 1) + ' dB';
    const card = q('.comms-snr-card');
    card.classList.toggle('is-pass', pass);
    card.classList.toggle('is-fail', !pass);
    q('.comms-snr-state').textContent = tr(pass ? 'comms.s2.pass' : 'comms.s2.noPass');

    q('#comms-elev').value = String(st.elev);
    q('#comms-freq').value = String(st.freq);
    const vals = qa('.comms-slider-val');
    if (vals[0]) vals[0].textContent = fmt(st.elev, 1) + '°';
    if (vals[1]) vals[1].textContent = fmt(st.freq, 1) + ' MHz';

    renderHint(pass);

    if (pass && !st.locked) {
      st.locked = true;
      playOneShotSfx('terminal-blip');
      q('#comms-elev').disabled = true;
      q('#comms-freq').disabled = true;
      qa('.comms-slider').forEach((s) => s.classList.add('is-locked'));
      drawSat();
      updateGate();
      flashStatus(tr('comms.s2.locked'));
    }
  }

  function renderHint(pass) {
    const A = DATA.antenna_tuning;
    const hint = q('.comms-hint');
    if (pass) {
      hint.textContent = tr('comms.s2.hintPass', { snr: fmt(st.snr, 1) });
      hint.className = 'comms-hint is-ok';
      return;
    }
    const de = st.elev - A.elevation_target_deg;
    const df = st.freq - A.freq_target_mhz;
    const parts = [];
    if (Math.abs(de) >= 0.5) {
      parts.push(tr(de > 0 ? 'comms.s2.hintHigh' : 'comms.s2.hintLow', { n: fmt(Math.abs(de), 1) }));
    }
    if (Math.abs(df) >= 0.1) {
      parts.push(tr(df > 0 ? 'comms.s2.hintFreqHigh' : 'comms.s2.hintFreqLow', { n: fmt(Math.abs(df), 1) }));
    }
    if (!parts.length) parts.push(tr('comms.s2.hintFine'));
    hint.textContent = parts.join(' ');
    hint.className = 'comms-hint is-warn';
  }

  /* Cửa sổ bay tính bằng mốc thời gian tuyệt đối, không trừ dồn.
     Trình duyệt bóp setInterval khi tab bị ẩn nên nếu trừ dồn thì đồng
     hồ chạy chậm hơn thời gian thật và cửa sổ 90 giây kéo dài vô tận. */
  function tickPass() {
    if (st.passPhase !== 'live' || st.locked) return;
    const left = (st.passDeadline - performance.now()) / 1000;
    st.passLeft = Math.max(0, left);
    paintTimer();
    if (st.passLeft <= 0) expirePass();
  }

  function paintTimer() {
    const el = q('.comms-timer');
    if (!el) return;
    el.textContent = fmtClock(st.passLeft);
    el.classList.toggle('is-low', st.passLeft <= 20 && st.passPhase === 'live');
  }

  function expirePass() {
    st.passPhase = 'wait';
    playOneShotSfx('radio-static');
    const card = q('.comms-radar-card');
    card.classList.add('is-out');
    q('.comms-radar-state').textContent = tr('comms.s2.expired');
    later(() => {
      if (destroyed) return;
      st.passPhase = 'live';
      st.passLeft = 90;
      st.passDeadline = performance.now() + 90000;
      card.classList.remove('is-out');
      paintTimer();
      q('.comms-radar-state').textContent = tr('comms.s2.inWindow');
      flashStatus(tr('comms.s2.nextPass'));
    }, WAIT_NEXT_PASS_MS);
  }

  function setElev(v) {
    if (st.locked || st.step !== 2) return;
    st.elev = Number(v);
    renderSnr();
  }

  function setFreq(v) {
    if (st.locked || st.step !== 2) return;
    st.freq = Number(v);
    renderSnr();
  }

  /* ============================================================
     BƯỚC 3: GÓI TIN VÀ PHÁT
     ============================================================ */

  function buildPackets() {
    const ul = q('.comms-pkts');
    ul.innerHTML = '';
    DATA.telemetry_packets.packets.forEach((p) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'comms-pkt';
      btn.dataset.id = p.id;
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = `
        <span class="comms-pkt-top">
          <span class="comms-pkt-name"></span>
          <span class="comms-pkt-bytes mono"></span>
        </span>
        <code class="comms-pkt-hex mono"></code>
        <span class="comms-pkt-desc"></span>
        <span class="comms-pkt-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
            stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
        </span>`;
      btn.querySelector('.comms-pkt-name').textContent = pick(p, 'name');
      btn.querySelector('.comms-pkt-bytes').textContent = fmt(p.bytes) + ' B';
      btn.querySelector('.comms-pkt-hex').textContent = p.hex;
      btn.querySelector('.comms-pkt-desc').textContent = pick(p, 'desc');
      btn.title = pick(p, 'consequence');
      btn.addEventListener('click', () => togglePacket(p.id));
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function togglePacket(id) {
    if (st.step !== 3 || st.flying || st.finished) return;
    const budget = DATA.telemetry_packets.budget_bytes;
    if (st.picked.has(id)) {
      st.picked.delete(id);
      playOneShotSfx('switch-flip');
    } else {
      if (st.picked.size >= 3) {
        playOneShotSfx('warning-chime');
        flashStatus(tr('comms.s3.tooMany'));
        return;
      }
      const total = totalBytes() + packetBytes(id);
      if (total > budget) {
        playOneShotSfx('warning-chime');
        flashStatus(tr('comms.s3.over', { n: fmt(total - budget) }));
        return;
      }
      playOneShotSfx('terminal-blip');
      st.picked.add(id);
    }
    qa('.comms-pkt').forEach((b) => {
      const on = st.picked.has(b.dataset.id);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    renderBudget();
  }

  function packetBytes(id) {
    const p = DATA.telemetry_packets.packets.find((x) => x.id === id);
    return p ? p.bytes : 0;
  }

  function totalBytes() {
    let n = 0;
    st.picked.forEach((id) => { n += packetBytes(id); });
    return n;
  }

  function selectionValid() {
    const T = DATA.telemetry_packets;
    const n = st.picked.size;
    return n > 0 && n <= 3 && totalBytes() <= T.budget_bytes;
  }

  function renderBudget() {
    if (!DATA) return;
    const T = DATA.telemetry_packets;
    const total = totalBytes();
    const budget = T.budget_bytes;
    const ratio = Math.min(1, total / budget);

    q('.comms-budget-fill').style.width = ratio * 100 + '%';
    q('.comms-budget-count').textContent = tr('comms.s3.ofBudget', { n: fmt(total), max: fmt(budget) });
    const bar = q('.comms-bar-sm');
    bar.classList.toggle('is-near', ratio >= 0.75 && ratio < 1);
    bar.classList.toggle('is-full', ratio >= 1);

    const note = q('.comms-budget-note');
    const over = total > budget;
    note.classList.toggle('is-bad', over);
    note.textContent = over
      ? tr('comms.s3.over', { n: fmt(total - budget) })
      : tr('comms.s3.left', { n: fmt(budget - total) });

    const chosen = q('.comms-chosen');
    chosen.innerHTML = '';
    if (st.picked.size === 0) {
      const li = document.createElement('li');
      li.className = 'comms-chosen-empty';
      li.textContent = tr('comms.s3.empty');
      chosen.appendChild(li);
    } else {
      st.picked.forEach((id) => {
        const p = T.packets.find((x) => x.id === id);
        if (!p) return;
        const li = document.createElement('li');
        li.innerHTML = `<span></span><b class="mono">${fmt(p.bytes)} B</b>`;
        li.firstChild.textContent = pick(p, 'name');
        chosen.appendChild(li);
      });
    }

    const ok = selectionValid();
    const btn = q('.comms-transmit');
    btn.disabled = !ok;
    btn.classList.toggle('is-ready', ok);
    q('.comms-transmit-note').textContent = ok
      ? tr('comms.s3.ready', { n: fmt(total), max: fmt(budget) })
      : tr('comms.s3.blocked');

    updateGate();
  }

  function buildDsn() {
    const ul = q('.comms-dsn');
    ul.innerHTML = '';
    DATA.dsn_stations.stations.forEach((s) => {
      const li = document.createElement('li');
      li.className = 'comms-dsn-item';
      li.dataset.id = s.id;
      li.innerHTML = `
        <img class="comms-dsn-icon" src="${ART.dsn}" alt="" width="28" height="28" />
        <span class="comms-dsn-main">
          <span class="comms-dsn-name"></span>
          <span class="comms-dsn-sub mono"></span>
        </span>
        <span class="comms-dsn-alt mono"></span>
        <span class="comms-dsn-state"></span>`;
      li.querySelector('.comms-dsn-name').textContent = pick(s, 'name');
      li.querySelector('.comms-dsn-sub').textContent = s.antenna_name + ' · ' + fmt(s.dish_size_m) + ' m';
      ul.appendChild(li);
    });
  }

  /* ---------- vị trí Sao Hỏa và trạm DSN đang trực ----------
     Không bốc ngẫu nhiên: tính độ cao của Sao Hỏa trên bầu trời
     từng trạm theo giờ UTC hiện tại rồi chọn trạm thấy Sao Hỏa cao
     nhất. Ba trạm cách nhau gần 120 độ kinh độ nên gần như lúc nào
     cũng có một trạm nhìn thấy. */

  const MARS_RA_DEG = 281.5;   // xấp xỉ cho kịch bản, không phải lịch thiên văn thật
  const MARS_DEC_DEG = -22.0;

  function julianDay(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  function gmstDeg(date) {
    const d = julianDay(date) - 2451545.0;
    let g = 280.46061837 + 360.98564736629 * d;
    g %= 360;
    return (g + 360) % 360;
  }

  function marsAltitude(station, date) {
    const lst = (gmstDeg(date) + station.longitude + 360) % 360;
    const H = ((lst - MARS_RA_DEG) * Math.PI) / 180;
    const dec = (MARS_DEC_DEG * Math.PI) / 180;
    const lat = (station.latitude * Math.PI) / 180;
    const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
    return (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;
  }

  function rankStations() {
    const now = new Date();
    return DATA.dsn_stations.stations
      .map((s) => ({ station: s, alt: marsAltitude(s, now) }))
      .sort((a, b) => b.alt - a.alt);
  }

  function renderStations(ranked, winnerId) {
    qa('.comms-dsn-item').forEach((li) => {
      const entry = ranked.find((r) => r.station.id === li.dataset.id);
      if (!entry) return;
      li.querySelector('.comms-dsn-alt').textContent = fmt(entry.alt, 1) + '°';
      li.classList.toggle('is-winner', entry.station.id === winnerId);
      const stateEl = li.querySelector('.comms-dsn-state');
      if (entry.station.id === winnerId) {
        stateEl.textContent = tr('comms.s3.standing');
      } else {
        stateEl.textContent = entry.alt >= 0 ? tr('comms.s3.listening') : tr('comms.s3.below');
      }
    });
  }

  /* ============================================================
     PHÁT TÍN HIỆU
     ============================================================ */

  function transmit() {
    if (!selectionValid() || st.flying || st.finished) return;
    st.flying = true;
    playOneShotSfx('radio-static');

    const ranked = rankStations();
    const winner = ranked[0];

    const flight = q('.comms-flight');
    flight.hidden = false;
    elBody.classList.add('is-flying');
    q('.comms-ack').hidden = true;
    renderStations(ranked, winner.station.id);

    const total = totalBytes();
    flashStatus(tr('comms.s3.transmitting', { n: fmt(total) }));

    const clock = q('.comms-flight-clock');
    const track = q('.comms-flight-track');
    track.innerHTML = '';
    const dots = [];
    for (let i = 0; i < 9; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', String(4.6 - i * 0.4));
      c.setAttribute('class', 'comms-wave');
      track.appendChild(c);
      dots.push(c);
    }

    const path = q('.comms-flight-path');
    const len = path.getTotalLength ? path.getTotalLength() : 640;

    const simulateSeconds = DATA.signal_timing.one_way_light_time_min * 60;

    const place = (p) => {
      const at = p * len;
      dots.forEach((c, i) => {
        const back = Math.max(0, at - i * 16);
        const pt = path.getPointAtLength(back);
        c.setAttribute('cx', pt.x.toFixed(1));
        c.setAttribute('cy', pt.y.toFixed(1));
        c.style.opacity = String(Math.max(0, 1 - i * 0.11) * (at > 4 ? 1 : 0));
      });
    };

    if (!motionOn()) {
      place(1);
      clock.textContent = fmtClock(simulateSeconds);
      later(() => arrive(winner), 420);
      return;
    }

    runAnim(FLIGHT_MS, (p) => {
      const eased = p * p * (3 - 2 * p);
      place(eased);
      clock.textContent = fmtClock(eased * simulateSeconds);
    }, () => arrive(winner), timers);
  }

  function arrive(winner) {
    if (destroyed) return;
    st.flying = false;
    elBody.classList.remove('is-flying');
    const s = winner.station;
    q('.comms-flight-lbl').textContent = tr('comms.s3.arrived');
    q('.comms-flight-clock').textContent = fmtClock(DATA.signal_timing.one_way_light_time_min * 60);

    const li = q('.comms-dsn-item[data-id="' + s.id + '"]');
    if (li) {
      li.classList.add('is-ack');
      li.querySelector('.comms-dsn-state').textContent = tr('comms.s3.acquired');
    }
    playOneShotSfx('warning-chime');

    const ack = q('.comms-ack');
    ack.hidden = false;
    ack.querySelector('.comms-ack-badge').textContent = 'SIGNAL ACQUIRED';
    ack.querySelector('.comms-ack-text').textContent = tr('comms.s3.ackText', { station: pick(s, 'name') });

    showSummary(s);
  }

  function showSummary(station) {
    const flight = q('.comms-flight');
    const box = document.createElement('div');
    box.className = 'comms-summary';
    const T = DATA.telemetry_packets;

    const rows = [];
    st.picked.forEach((id) => {
      const p = T.packets.find((x) => x.id === id);
      if (!p) return;
      rows.push(`<li><span>${pick(p, 'name')}</span><b class="mono">${fmt(p.bytes)} B</b></li>`);
    });

    box.innerHTML = `
      <h4>${tr('comms.s3.summary')}</h4>
      <ul class="comms-summary-list">${rows.join('')}</ul>
      <dl class="comms-summary-meta">
        <div><dt>${tr('comms.s3.sumBytes')}</dt><dd class="mono">${fmt(totalBytes())} B</dd></div>
        <div><dt>${tr('comms.s3.sumStation')}</dt><dd>${pick(station, 'name')}</dd></div>
        <div><dt>${tr('comms.s3.sumDelay')}</dt><dd class="mono">${fmt(DATA.signal_timing.one_way_light_time_min, 1)} min</dd></div>
      </dl>
      <button type="button" class="comms-summary-go"></button>
    `;
    box.querySelector('.comms-summary-go').textContent = tr('comms.s3.continue');
    box.querySelector('.comms-summary-go').addEventListener('click', finish);
    flight.appendChild(box);

    later(() => box.classList.add('is-open'), 16);
    later(finish, 3600);
  }

  function finish() {
    if (st.finished || destroyed) return;
    st.finished = true;
    q('.comms-transmit').disabled = true;
    elNext.disabled = true;
    flashStatus(tr('comms.s3.sent'));
    if (typeof onDone === 'function') onDone();
  }

  /* ============================================================
     ĐIỀU HƯỚNG BƯỚC
     ============================================================ */

  function setStep(n, { silent = false } = {}) {
    st.step = n;
    qa('.comms-step').forEach((s) => {
      const on = Number(s.dataset.step) === n;
      s.classList.toggle('is-active', on);
      s.hidden = !on;
    });
    qa('.comms-chip').forEach((c) => {
      const k = Number(c.dataset.chip);
      c.classList.toggle('is-done', k < n);
      c.classList.toggle('is-active', k === n);
      if (k === n) c.setAttribute('aria-current', 'step');
      else c.removeAttribute('aria-current');
    });
    if (n === 2) {
      st.passLeft = 90;
      st.passPhase = 'live';
      st.passDeadline = performance.now() + 90000;
      paintTimer();
      q('.comms-radar-card').classList.remove('is-out');
      q('.comms-radar-state').textContent = tr('comms.s2.inWindow');
      if (!silent) playOneShotSfx('radio-static');
      drawSat();
    }
    if (n === 3 && !silent) {
      renderBudget();
    }
    updateGate();
    elBody.scrollTop = 0;
  }

  function updateGate() {
    if (!DATA) return;
    if (st.step === 1) {
      const ok = canLeaveStep1();
      elNext.disabled = !ok;
      elNext.textContent = tr('comms.s1.next');
      if (ok) {
        elStatus.textContent = tr('comms.s1.statusOk');
        elStatus.className = 'comms-status is-ok';
      } else {
        const off = essentialsOff();
        elStatus.textContent = off.length
          ? tr('comms.s1.statusEss')
          : tr('comms.s1.statusShort', { n: fmt(powerFigures().tx - powerFigures().free) });
        elStatus.className = 'comms-status is-bad';
      }
    } else if (st.step === 2) {
      elNext.disabled = !st.locked;
      elNext.textContent = tr('comms.s2.next');
      elStatus.textContent = st.locked ? tr('comms.s2.statusOk') : tr('comms.s2.statusWait');
      elStatus.className = 'comms-status ' + (st.locked ? 'is-ok' : 'is-warn');
    } else {
      elNext.disabled = true;
      elNext.textContent = tr('comms.s3.next');
      elStatus.textContent = st.finished ? tr('comms.s3.sent') : tr('comms.s3.statusIdle');
      elStatus.className = 'comms-status ' + (st.finished ? 'is-ok' : '');
    }
  }

  let statusTimer = null;
  function flashStatus(msg) {
    elStatus.textContent = msg;
    elStatus.classList.add('is-flash');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      elStatus.classList.remove('is-flash');
      updateGate();
    }, 2600);
  }

  /* ============================================================
     SỰ KIỆN
     ============================================================ */

  function bindEvents() {
    elNext.addEventListener('click', () => {
      if (elNext.disabled) return;
      if (st.step === 1) {
        playOneShotSfx('switch-flip');
        setStep(2);
      } else if (st.step === 2) {
        playOneShotSfx('terminal-blip');
        setStep(3);
      }
    });

    q('#comms-elev').addEventListener('input', (e) => { setElev(e.target.value); });
    q('#comms-freq').addEventListener('input', (e) => { setFreq(e.target.value); });

    q('.comms-transmit').addEventListener('click', transmit);

    elInfoBtn.addEventListener('click', () => {
      playOneShotSfx('terminal-blip');
      openInfo(st.step);
    });

    q('.comms-modal-scrim').addEventListener('click', closeInfo);
    q('.comms-modal-close').addEventListener('click', closeInfo);
    q('.comms-modal-ok').addEventListener('click', closeInfo);
  }

  /* ---------- hộp giải thích ---------- */

  function openInfo(step) {
    const modal = elModal;
    const body = modal.querySelector('.comms-modal-body');
    const title = modal.querySelector('#comms-modal-title');
    const extra = [];

    if (step === 1) {
      const M = DATA.meda_conditions;
      const P = DATA.power_budget;
      extra.push(
        `<p class="comms-modal-fact"><span>τ</span><b>${fmt(M.optical_depth_tau, 1)}</b>` +
        `<em>${tr('comms.info.1.tau')}</em></p>`,
        `<p class="comms-modal-fact"><span>%</span><b>${fmt(M.solar_panel_efficiency_pct)}</b>` +
        `<em>${tr('comms.info.1.eff')}</em></p>`,
        `<p class="comms-modal-src">${pick(P, '_note')}</p>`
      );
    } else if (step === 2) {
      const S = DATA.mro_satellite;
      extra.push(
        `<p class="comms-modal-fact"><span>km</span><b>${fmt(S.orbit_altitude_min_km)} - ${fmt(S.orbit_altitude_max_km)}</b>` +
        `<em>${tr('comms.info.2.orbit')}</em></p>`,
        `<p class="comms-modal-fact"><span>min</span><b>${fmt(S.orbital_period_min)}</b>` +
        `<em>${tr('comms.info.2.period')}</em></p>`,
        `<p class="comms-modal-src">${tr('comms.info.source')}</p>`
      );
    } else {
      const T = DATA.telemetry_packets;
      extra.push(
        `<p class="comms-modal-fact"><span>B</span><b>${fmt(T.budget_bytes)}</b>` +
        `<em>${tr('comms.info.3.budget')}</em></p>`,
        `<p class="comms-modal-fact"><span>°</span><b>120</b>` +
        `<em>${tr('comms.info.3.spacing')}</em></p>`,
        `<p class="comms-modal-src">${tr('comms.info.source')}</p>`
      );
    }

    title.textContent = tr('comms.info.' + step + '.title');
    const bodyKey = 'comms.info.' + step + '.body';
    const paragraphs = String(t(bodyKey) || '').split('\n\n').filter(Boolean);
    body.innerHTML =
      paragraphs.map((p) => `<p>${p}</p>`).join('') + extra.join('');

    modal.hidden = false;
    later(() => modal.classList.add('is-open'), 16);
    modal.querySelector('.comms-modal-ok').focus({ preventScroll: true });
  }

  function closeInfo() {
    elModal.classList.remove('is-open');
    elModal.hidden = true;
    elInfoBtn.focus({ preventScroll: true });
  }

  /* ============================================================
     SONG NGỮ
     ============================================================ */

  function applyTexts() {
    q('.comms-eyebrow').textContent = tr('comms.eyebrow');
    q('.comms-title').textContent = tr('comms.title');
    q('.comms-loading').textContent = tr('comms.loading');

    qa('.comms-chip').forEach((c) => {
      c.querySelector('.comms-chip-txt').textContent = tr('comms.step' + c.dataset.chip);
    });

    elInfoBtn.setAttribute('aria-label', tr('comms.info.open'));
    elInfoBtn.title = tr('comms.info.open');
    q('.comms-modal-close').setAttribute('aria-label', tr('comms.info.close'));

    qa('[data-k]').forEach((el) => {
      el.textContent = tr('comms.' + el.dataset.k);
    });

    q('.comms-card-icon');
    qa('.comms-card-icon').forEach((img, i) => {
      img.src = i === 0 ? ART.uhf : ART.hex;
      img.alt = '';
    });

    if (!DATA) return;

    /* nội dung lấy từ JSON, đổi ngôn ngữ thì vẽ lại */
    const M = DATA.meda_conditions;
    q('[data-env="tau"] .comms-env-v').textContent = 'τ ' + fmt(M.optical_depth_tau, 1);
    q('[data-env="eff"] .comms-env-v').textContent = fmt(M.solar_panel_efficiency_pct) + ' %';
    q('[data-env="temp"] .comms-env-v').textContent = fmt(M.temp_c, 1) + ' °C';
    q('[data-env="press"] .comms-env-v').textContent = fmt(M.pressure_pa) + ' Pa';
    q('[data-env="wind"] .comms-env-v').textContent = fmt(M.wind_ms, 1) + ' m/s';

    DATA.power_budget.devices.forEach((d) => {
      const row = q('.comms-dev[data-id="' + d.id + '"]');
      if (!row) return;
      row.querySelector('.comms-dev-txt').textContent = pick(d, 'name');
      const tag = row.querySelector('.comms-tag');
      if (tag) {
        tag.textContent = tr('comms.s1.essential');
        row.querySelector('.comms-dev-txt').appendChild(tag);
      }
      row.querySelector('.comms-dev-desc').textContent = pick(d, 'desc');
      row.querySelector('.comms-switch-txt').textContent = tr(st.on[d.id] ? 'comms.on' : 'comms.off');
    });

    DATA.telemetry_packets.packets.forEach((p) => {
      const b = q('.comms-pkt[data-id="' + p.id + '"]');
      if (!b) return;
      b.querySelector('.comms-pkt-name').textContent = pick(p, 'name');
      b.querySelector('.comms-pkt-desc').textContent = pick(p, 'desc');
      b.title = pick(p, 'consequence');
    });

    DATA.dsn_stations.stations.forEach((s) => {
      const li = q('.comms-dsn-item[data-id="' + s.id + '"]');
      if (!li) return;
      li.querySelector('.comms-dsn-name').textContent = pick(s, 'name');
    });

    q('.comms-radar-spec').textContent =
      tr('comms.s2.spec', { period: fmt(DATA.mro_satellite.orbital_period_min), freq: fmt(DATA.mro_satellite.uhf_freq_mhz, 1) });
    q('#comms-radar-desc').textContent = tr('comms.s2.radarAlt');

    q('.comms-snr-foot span:first-child').textContent =
      tr('comms.s2.threshold', { n: fmt(DATA.antenna_tuning.snr_threshold_db) });

    q('.comms-flight-note').textContent =
      tr('comms.s3.delay', { n: fmt(DATA.signal_timing.one_way_light_time_min, 1) });

    q('.comms-transmit-txt').textContent = tr('comms.s3.transmit');

    renderPower();
    renderGauges();
    renderSnr();
    renderBudget();
    paintTimer();
    if (st.step === 2) q('.comms-radar-state').textContent = tr('comms.s2.inWindow');
    updateGate();
  }

  const unLang = onLangChange(() => applyTexts());
  const unSettings = onSettingsChange(() => { /* cỡ chữ và chuyển động do CSS lo */ });

  /* ============================================================
     DỌN DẸP
     ============================================================ */

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (rafId) { clearInterval(rafId); rafId = 0; }
    timers.forEach((id) => { clearTimeout(id); clearInterval(id); });
    timers.clear();
    unLang();
    unSettings();
    root.remove();
  }

  document.addEventListener('keydown', onKey);
  function onKey(e) {
    if (e.key === 'Escape' && !elModal.hidden) closeInfo();
  }

  return { destroy, root };
}
