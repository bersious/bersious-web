/* ============================================================
   hud.js
   Thanh chỉ số sinh tồn. Chỉ vẽ, không tính toán.

   Nhận dữ liệu từ hab-stats.js qua onTick, vẽ bảy thanh chia hai
   nhóm: bốn chỉ số nhân vật, ba chỉ số trạm. Thanh nào tụt dưới
   ngưỡng nguy hiểm thì nhấp nháy đỏ để người chơi thấy ngay mà
   không phải đọc số.
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
    'hud.perHour': '/giờ',
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
    'hud.perHour': '/hr',
  },
};

/* Nhóm chỉ số, kèm màu và ngưỡng cảnh báo. Ngưỡng là mức dưới đó
   thanh đổi sang màu cảnh báo, nên người chơi không cần nhớ con số. */
const GROUPS = [
  {
    key: 'character',
    items: [
      { id: 'stamina',  warn: 25, color: '#e8a33d' },
      { id: 'calories', warn: 25, color: '#d9a84f' },
      { id: 'water',    warn: 25, color: '#4fb8c9' },
      { id: 'sanity',   warn: 30, color: '#a98ac8' },
    ],
  },
  {
    key: 'station',
    items: [
      { id: 'power',  warn: 20, color: '#e8c05a' },
      { id: 'oxygen', warn: 30, color: '#6fbf8a' },
      { id: 'seal',   warn: 80, color: '#8fb08a', invert: true },
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
    <div class="hud-rate" hidden></div>
  `;
  container.appendChild(root);

  const groupsEl = root.querySelector('.hud-groups');
  const rateEl = root.querySelector('.hud-rate');

  /* ---------- dựng thanh ---------- */

  const bars = {};

  GROUPS.forEach((group) => {
    const box = document.createElement('div');
    box.className = 'hud-group';

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

      cell.innerHTML = `
        <div class="hud-cell-head">
          <span class="hud-name"></span>
          <span class="hud-value">--</span>
        </div>
        <div class="hud-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100">
          <div class="hud-fill"></div>
        </div>
      `;

      row.appendChild(cell);

      bars[item.id] = {
        cell,
        nameEl: cell.querySelector('.hud-name'),
        valueEl: cell.querySelector('.hud-value'),
        fill: cell.querySelector('.hud-fill'),
        bar: cell.querySelector('.hud-bar'),
        spec: item,
        lastPct: -1,
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
      if (typeof raw !== 'number') continue;

      const max = id === 'power' ? (snapshot.powerMax || 100) : 100;
      const pct = Math.max(0, Math.min(100, (raw / max) * 100));
      const shown = Math.round(raw);

      /* ngưỡng cảnh báo: seal thì cảnh báo khi XUỐNG DƯỚI 80,
         các chỉ số khác cũng vậy, nên công thức chung là như nhau */
      const danger = raw <= b.spec.warn;

      /* chỉ ghi vào DOM khi số đổi, tránh trình duyệt tính lại
         bố cục mỗi khung hình */
      if (shown !== b.lastPct) {
        b.lastPct = shown;
        b.valueEl.textContent = shown;
        b.bar.setAttribute('aria-valuenow', String(shown));
      }

      b.fill.style.setProperty('--fill', pct + '%');
      b.fill.style.setProperty('--color', danger ? '#d9694f' : b.spec.color);
      b.cell.classList.toggle('is-danger', danger);
      b.cell.classList.toggle('is-low', !danger && pct < 45);
    }
  }

  /* ---------- nhãn ---------- */

  function applyLang() {
    for (const [id, b] of Object.entries(bars)) {
      b.nameEl.textContent = t('hud.' + id);
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
    offLang = onLangChange(applyLang);
  }

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    if (typeof offStats === 'function') offStats();
    if (typeof offLang === 'function') offLang();
    root.remove();
  }

  return { destroy, paint };
}
