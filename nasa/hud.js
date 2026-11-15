/* ============================================================
   hud.js
   Thanh chỉ số sinh tồn, kiểu Máy tính bảng dã chiến NASA.

   Thay thanh trơn bằng thanh chia 10 vạch, mỗi chỉ số có icon và
   màu riêng theo bảng Art Direction, chỉ số Điện có mũi tên cho
   biết đang sạc hay đang hao. Khi bất kỳ chỉ số nào tụt dưới ngưỡng
   cảnh báo thì cả ô chuyển sang sọc đỏ nhấp nháy.

   Chỉ vẽ, không tính toán. Số liệu do hab-stats.js đẩy sang.
   ============================================================ */

const BASE = new URL('.', import.meta.url).href;

const T = {
  vi: {
    'hud.character': 'Phi hành gia',
    'hud.station': 'Trạm',
    'hud.stamina': 'Thể lực',
    'hud.calories': 'Calo',
    'hud.water': 'Nước',
    'hud.sanity': 'Tinh thần',
    'hud.power': 'Điện',
    'hud.oxygen': 'Oxy',
    'hud.seal': 'Độ kín',
  },
  en: {
    'hud.character': 'Astronaut',
    'hud.station': 'Station',
    'hud.stamina': 'Stamina',
    'hud.calories': 'Calories',
    'hud.water': 'Water',
    'hud.sanity': 'Sanity',
    'hud.power': 'Power',
    'hud.oxygen': 'Oxygen',
    'hud.seal': 'Seal',
  },
};

/* Số vạch chia trên mỗi thanh. Mười vạch đủ mịn để thấy thay đổi
   vài phần trăm mà vẫn đếm được bằng mắt, mười lăm vạch thì rối. */
const SEGMENTS = 10;

/* Icon vector nội tuyến. Bảy icon nhỏ mà mỗi cái một request file
   thì phí, với lại vector vẫn nét ở mọi kích thước màn hình. */
const ICONS = {
  stamina: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M13 2 4.5 13.5H11l-1 8.5 9-11.5h-6.5z"/></svg>`,
  calories: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7 3v7a2.5 2.5 0 0 0 5 0V3"/><path d="M9.5 10v11"/>
    <path d="M17 3c-1.4 2-2 3.6-2 5.5 0 1.6.9 2.5 2 2.5s2-.9 2-2.5C19 6.6 18.4 5 17 3z"/>
    <path d="M17 11v10"/></svg>`,
  water: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 2.8c3.2 4 5.6 7 5.6 10.1A5.6 5.6 0 0 1 12 18.5a5.6 5.6 0 0 1-5.6-5.6C6.4 9.8 8.8 6.8 12 2.8z"/></svg>`,
  sanity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 4.5a5.5 5.5 0 0 0-3.3 9.9c.5.4.8 1 .8 1.6v.5h5v-.5c0-.6.3-1.2.8-1.6A5.5 5.5 0 0 0 12 4.5z"/>
    <path d="M9.8 19.5h4.4"/><path d="M9 9.6a3 3 0 0 1 3-2.4"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.5" y="7" width="16" height="10" rx="2.2"/>
    <path d="M21.5 10.5v3"/><path d="M9.6 9.6 12.4 12l-2 .4 1.2 2"/></svg>`,
  oxygen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="9" cy="13" r="5.2"/><circle cx="16" cy="9" r="3.2"/></svg>`,
  seal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 2.8 20 6v6.2c0 4.4-3.2 7.6-8 9.2-4.8-1.6-8-4.8-8-9.2V6z"/>
    <path d="m8.4 12 2.4 2.4 4.6-4.6"/></svg>`,
};

/* Nhóm chỉ số, kèm màu lấy đúng từ bảng Art Direction và ngưỡng
   cảnh báo riêng. Độ kín cảnh báo sớm hơn vì thủng vỏ là chuyện
   nghiêm trọng hơn thiếu nước. */
const GROUPS = [
  {
    key: 'character',
    items: [
      { id: 'stamina',  warn: 25, color: '#EAB308' },
      { id: 'calories', warn: 25, color: '#F97316' },
      { id: 'water',    warn: 25, color: '#0EA5E9' },
      { id: 'sanity',   warn: 25, color: '#A855F7' },
    ],
  },
  {
    key: 'station',
    items: [
      { id: 'power',  warn: 25, color: '#22C55E', directional: true },
      { id: 'oxygen', warn: 25, color: '#38BDF8' },
      { id: 'seal',   warn: 75, color: '#94A3B8' },
    ],
  },
];

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css/hud.css';
  document.head.appendChild(link);
}

export function createHud({ container, stats, getLang = () => 'vi', onLangChange }) {
  injectCss();

  const t = (key) => (T[getLang()] || T.vi)[key] || key;

  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <div class="hud-groups"></div>
  `;
  container.appendChild(root);

  const groupsEl = root.querySelector('.hud-groups');

  /* ---------- dựng thanh ---------- */

  const bars = {};

  GROUPS.forEach((group) => {
    const box = document.createElement('div');
    box.className = 'hud-group';
    box.dataset.group = group.key;

    const label = document.createElement('div');
    label.className = 'hud-group-label';
    label.textContent = t('hud.' + group.key);
    box.appendChild(label);

    const row = document.createElement('div');
    row.className = 'hud-row';

    group.items.forEach((item) => {
      const cell = document.createElement('div');
      cell.className = 'hud-cell';
      cell.dataset.stat = item.id;

      /* Dựng sẵn mười vạch rồi chỉ bật tắt class, không tạo lại DOM
         mỗi lần vẽ: tạo phần tử trong vòng tick làm trình duyệt tính
         lại bố cục liên tục và giật. */
      let segs = '';
      for (let i = 0; i < SEGMENTS; i++) segs += '<span class="hud-seg"></span>';

      cell.innerHTML = `
        <div class="hud-cell-head">
          <span class="hud-icon">${ICONS[item.id] || ''}</span>
          <span class="hud-name"></span>
          <span class="hud-trend" aria-hidden="true"></span>
          <span class="hud-value">--</span>
        </div>
        <div class="hud-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100">
          <span class="hud-segs">${segs}</span>
        </div>
      `;

      row.appendChild(cell);

      bars[item.id] = {
        cell,
        nameEl: cell.querySelector('.hud-name'),
        valueEl: cell.querySelector('.hud-value'),
        trendEl: cell.querySelector('.hud-trend'),
        segs: Array.from(cell.querySelectorAll('.hud-seg')),
        bar: cell.querySelector('.hud-bar'),
        spec: item,
        litCount: -1,
        lastShown: -1,
        lastRaw: null,
        trendDir: 0,
      };
    });

    box.appendChild(row);
    groupsEl.appendChild(box);
  });

  /* ---------- vẽ ---------- */

  function paint(snapshot) {
    if (!snapshot) return;

    for (const [id, b] of Object.entries(bars)) {
      const raw = snapshot[id];
      if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;

      const max = id === 'power' ? (snapshot.powerMax || 100) : 100;
      const pct = Math.max(0, Math.min(100, (raw / max) * 100));
      const shown = Math.round(raw);
      const danger = raw <= b.spec.warn;

      /* Chỉ số Điện có mũi tên: so với lần vẽ trước để biết đang
         sạc hay đang hao. Không đổi thì để nguyên mũi tên cũ, tránh
         nhấp nháy liên tục khi chỉ số đứng yên. */
      if (b.spec.directional) {
        if (b.lastRaw !== null && shown !== b.lastRaw) {
          const dir = shown > b.lastRaw ? 1 : -1;
          if (dir !== b.trendDir) {
            b.trendDir = dir;
            b.trendEl.textContent = dir > 0 ? '▲' : '▼';
            b.trendEl.classList.toggle('is-up', dir > 0);
            b.trendEl.classList.toggle('is-down', dir < 0);
          }
        }
        b.lastRaw = shown;
      }

      if (shown !== b.lastShown) {
        b.lastShown = shown;
        b.valueEl.textContent = shown;
        b.bar.setAttribute('aria-valuenow', String(shown));
      }

      /* Số vạch đã đầy. Làm tròn lên để chỉ số còn sống sót mà thấp
         vẫn hiện ít nhất một vạch, nhìn là biết chưa chết hẳn. */
      const lit = raw <= 0 ? 0 : Math.min(SEGMENTS, Math.ceil((pct / 100) * SEGMENTS));
      if (lit !== b.litCount) {
        b.litCount = lit;
        for (let i = 0; i < SEGMENTS; i++) {
          b.segs[i].classList.toggle('is-on', i < lit);
        }
      }

      b.cell.style.setProperty('--stat-color', danger ? '#E5484D' : b.spec.color);
      b.cell.classList.toggle('is-danger', danger);
      b.cell.classList.toggle('is-low', !danger && pct < 45);
    }
  }

  /* ---------- nhãn ---------- */

  function applyLang() {
    for (const [id, b] of Object.entries(bars)) {
      b.nameEl.textContent = t('hud.' + id);
      b.cell.setAttribute('aria-label', t('hud.' + id));
    }
    root.querySelectorAll('.hud-group-label').forEach((el, i) => {
      el.textContent = t('hud.' + GROUPS[i].key);
    });
  }

  applyLang();

  /* ---------- theo dõi ---------- */

  let offStats = null;
  if (stats && typeof stats.onTick === 'function') {
    offStats = stats.onTick(paint);
  }

  let offLang = null;
  if (typeof onLangChange === 'function') {
    offLang = onLangChange(() => { applyLang(); paint(stats.get()); });
  }

  /* Vẽ ngay lần đầu, vì onTick chỉ bắn khi số đổi, mà lúc mới mở
     thì số chưa đổi lần nào. */
  if (stats && typeof stats.get === 'function') paint(stats.get());

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    if (typeof offStats === 'function') offStats();
    if (typeof offLang === 'function') offLang();
    root.remove();
  }

  return { destroy, paint };
}
