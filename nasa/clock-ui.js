/* ============================================================
   clock-ui.js
   Khung đồng hồ LCD kiểu thiết bị dã chiến, kèm ba nút tốc độ.

   Hiển thị SOL và giờ dạng màn hình tinh thể lỏng, một ô tròn xoay
   chuyển giữa biểu tượng mặt trời và mặt trăng theo giờ trong ngày,
   và ba nút vật lý nổi khối [1x] [2x] [Chờ nhanh].

   Chỉ vẽ. Việc tính thời gian do game-time.js lo.
   ============================================================ */

const BASE = new URL('.', import.meta.url).href;

const T = {
  vi: {
    'clock.sol': 'SOL',
    'clock.day': 'NGÀY',
    'clock.speed': 'Tốc độ thời gian',
    'clock.fast': 'Chờ nhanh',
    'clock.fastShort': '⏩',
    'clock.fastHint': 'Tua nhanh tới khi xong việc',
  },
  en: {
    'clock.sol': 'SOL',
    'clock.day': 'DAY',
    'clock.speed': 'Time speed',
    'clock.fast': 'Fast',
    'clock.fastShort': '⏩',
    'clock.fastHint': 'Fast-forward until idle work ends',
  },
};

const SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" aria-hidden="true">
  <circle cx="12" cy="12" r="4.2"/>
  <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2"/>
  <path d="M5.6 5.6 7.2 7.2M16.8 16.8l1.6 1.6M18.4 5.6 16.8 7.2M7.2 16.8l-1.6 1.6"/>
</svg>`;

const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M20.5 14.8A8.6 8.6 0 0 1 9.2 3.5a8.6 8.6 0 1 0 11.3 11.3z"/>
</svg>`;

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css/clock.css';
  document.head.appendChild(link);
}

export function createClockUi({ container, clock, getLang = () => 'vi', onLangChange }) {
  injectCss();

  const t = (key) => (T[getLang()] || T.vi)[key] || key;

  const root = document.createElement('div');
  root.className = 'clock';
  root.innerHTML = `
    <div class="clock-lcd" role="timer" aria-live="off">
      <div class="clock-sol">
        <span class="clock-sol-label"></span>
        <span class="clock-sol-num">01</span>
      </div>
      <div class="clock-sep" aria-hidden="true"></div>
      <div class="clock-time">07:00</div>
      <div class="clock-orb" aria-hidden="true">
        <span class="clock-orb-icon"></span>
      </div>
      <div class="clock-progress" aria-hidden="true">
        <span class="clock-progress-fill"></span>
      </div>
    </div>
    <div class="clock-speeds" role="group"></div>
  `;
  container.appendChild(root);

  const solLabel = root.querySelector('.clock-sol-label');
  const solNum = root.querySelector('.clock-sol-num');
  const timeEl = root.querySelector('.clock-time');
  const orbIcon = root.querySelector('.clock-orb-icon');
  const progressFill = root.querySelector('.clock-progress-fill');
  const speedsEl = root.querySelector('.clock-speeds');

  /* ---------- nút tốc độ ---------- */

  const speedButtons = [];
  const speedInfo = typeof clock.speed === 'function' ? clock.speed() : { count: 1 };

  for (let i = 0; i < (speedInfo.count || 1); i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'clock-speed-btn';
    btn.dataset.speed = String(i);
    btn.addEventListener('click', () => {
      if (typeof clock.setSpeed === 'function') clock.setSpeed(i);
    });
    speedsEl.appendChild(btn);
    speedButtons.push(btn);
  }

  function paintSpeed(info) {
    if (!info) return;
    speedButtons.forEach((btn, i) => {
      const isFast = i === speedButtons.length - 1 && speedButtons.length > 2;
      /* Nút thứ ba có thêm mũi tên tua để phân biệt với hai nút
         hệ số, vì nhãn chữ "Chờ nhanh" một mình dễ bị đọc thành một
         hành động khác chứ không phải mức tốc độ. */
      /* Trên màn hẹp chỉ còn mũi tên, vì nhãn chữ đẩy hàng nút
         rộng ra và làm topbar cao thêm một dòng. */
      const narrow = window.matchMedia('(max-width: 720px)').matches;
      btn.textContent = isFast
        ? (narrow ? t('clock.fastShort') : '⏩ ' + t('clock.fast'))
        : (i + 1) + 'x';
      btn.title = isFast ? t('clock.fastHint') : '';
      btn.classList.toggle('is-active', i === info.index);
      btn.setAttribute('aria-pressed', i === info.index ? 'true' : 'false');
    });
    root.dataset.speed = String(info.factor);
  }

  /* ---------- vẽ ---------- */

  let lastLabel = '';
  let lastDay = -1;
  let lastNight = null;

  function paint(state) {
    if (!state) return;

    if (state.label !== lastLabel) {
      lastLabel = state.label;
      timeEl.textContent = state.label;
    }

    if (state.day !== lastDay) {
      lastDay = state.day;
      solNum.textContent = String(state.day).padStart(2, '0');
    }

    if (state.isNight !== lastNight) {
      lastNight = state.isNight;
      orbIcon.innerHTML = state.isNight ? MOON : SUN;
      root.classList.toggle('is-night', !!state.isNight);
    }

    progressFill.style.setProperty('--p', (state.progress * 100).toFixed(1) + '%');
  }

  /* ---------- nhãn ---------- */

  function applyLang() {
    solLabel.textContent = t('clock.sol');
    speedsEl.setAttribute('aria-label', t('clock.speed'));
  }

  applyLang();

  let offTick = null;
  if (typeof clock.onTick === 'function') offTick = clock.onTick(paint);

  let offSpeed = null;
  if (typeof clock.onSpeedChange === 'function') offSpeed = clock.onSpeedChange(paintSpeed);

  let offLang = null;
  if (typeof onLangChange === 'function') {
    offLang = onLangChange(() => { applyLang(); paintSpeed(clock.speed()); });
  }

  return {
    root,
    destroy() {
      if (typeof offTick === 'function') offTick();
      if (typeof offSpeed === 'function') offSpeed();
      if (typeof offLang === 'function') offLang();
      root.remove();
    },
  };
}
