/* ============================================================
   repair.js
   Ba món phải sửa trước khi phát được tín hiệu cầu cứu.

   Vì sao có file này: bản trước cho người chơi bấm PHÁT TÍN HIỆU ngay
   từ đầu. Nhưng cả câu chuyện là ăng-ten gãy, pin hết, mạch hỏng. Cho
   phát luôn thì mở màn không còn ý nghĩa gì, và ba bước viễn thông
   thành một bài tập điền số chứ không phải một cuộc sửa chữa.

   Thiết kế: ba món, mỗi món hỏng ở một kiểu khác nhau, và mỗi kiểu
   sửa dạy một ý khoa học khác nhau.
     1. Chảo ăng-ten gãy  → phải hàn lại, cần băng keo chịu lực
     2. Pin dự phòng cạn → phải nạp, cần điện và thời gian
     3. Bo mạch điều khiển cháy → phải thay linh kiện
   ============================================================ */

import { t, getLang } from './i18n.js';
import { playOneShotSfx } from './audio-sfx.js';

const BASE_URL = new URL('.', import.meta.url).href;

/* Ba món, theo thứ tự nên sửa. Mỗi món có vật liệu cần, thời gian
   sửa tính bằng phút trong game, và một câu giải thích vì sao. */
export const REPAIR_PARTS = [
  {
    id: 'dish',
    nameKey: 'repair.dish.name',
    whyKey: 'repair.dish.why',
    stepKey: 'repair.dish.step',
    cost: { tape: 2 },
    minutes: 45,
    icon: 'icon-antenna-board',
    /* Vì sao phải sửa: không có chảo thì sóng không hội tụ được, công
       suất phát rải ra mọi hướng và không tới được vệ tinh. */
  },
  {
    id: 'battery',
    nameKey: 'repair.battery.name',
    whyKey: 'repair.battery.why',
    stepKey: 'repair.battery.step',
    cost: { electronics: 1 },
    minutes: 60,
    icon: 'icon-battery-spare',
  },
  {
    id: 'board',
    nameKey: 'repair.board.name',
    whyKey: 'repair.board.why',
    stepKey: 'repair.board.step',
    cost: { electronics: 2, tape: 1 },
    minutes: 75,
    icon: 'icon-antenna-board',
  },
];

/* Trạng thái sửa chữa lưu riêng, không lẫn vào kho vật phẩm. */
const KEY = 'smdg.repairs';

export function loadRepairs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const d = JSON.parse(raw);
    return d && typeof d === 'object' ? d : {};
  } catch { return {}; }
}

export function saveRepairs(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* chặn ghi thì bỏ qua */ }
}

export function isAllRepaired(state = loadRepairs()) {
  return REPAIR_PARTS.every((p) => state[p.id] === true);
}

export function repairedCount(state = loadRepairs()) {
  return REPAIR_PARTS.filter((p) => state[p.id] === true).length;
}

/* Món nào sửa được với kho hiện tại. Dùng để tô sáng nút và báo thiếu gì. */
export function canRepair(part, inventory) {
  return Object.entries(part.cost).every(([item, n]) => (inventory[item] || 0) >= n);
}

/* Câu báo thiếu vật liệu, ghi rõ thiếu món gì bao nhiêu. */
export function missingText(part, inventory) {
  const missing = Object.entries(part.cost)
    .filter(([item, n]) => (inventory[item] || 0) < n)
    .map(([item, n]) => `${n - (inventory[item] || 0)} ${t('item.' + item)}`);
  return missing.join(', ');
}

/* ============================================================
   MÀN SỬA CHỮA
   Trả về { destroy }. Gọi onDone khi cả ba món xong.
   ============================================================ */

export function openRepairBay({ stats, onDone, onClose } = {}) {
  injectCss();

  const state = loadRepairs();
  const host = document.createElement('div');
  host.className = 'repair-root';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-labelledby', 'repair-title');

  host.innerHTML = `
    <div class="repair-scrim"></div>
    <div class="repair-panel">
      <header class="repair-head">
        <div>
          <h2 class="repair-title" id="repair-title">${t('repair.title')}</h2>
          <p class="repair-sub">${t('repair.sub')}</p>
        </div>
        <button type="button" class="repair-close" aria-label="${t('repair.close')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>

      <div class="repair-progress">
        <div class="repair-progress-bar"><span class="repair-progress-fill"></span></div>
        <span class="repair-progress-text mono"></span>
      </div>

      <ul class="repair-list"></ul>

      <footer class="repair-foot">
        <p class="repair-status" role="status" aria-live="polite"></p>
        <button type="button" class="repair-done" disabled>${t('repair.done')}</button>
      </footer>
    </div>
  `;

  document.body.appendChild(host);

  const listEl = host.querySelector('.repair-list');
  const statusEl = host.querySelector('.repair-status');
  const doneBtn = host.querySelector('.repair-done');
  const fillEl = host.querySelector('.repair-progress-fill');
  const progressTxt = host.querySelector('.repair-progress-text');

  function refresh() {
    const inv = stats ? stats.getInventory() : {};
    listEl.innerHTML = '';

    REPAIR_PARTS.forEach((part, i) => {
      const done = state[part.id] === true;
      const ok = canRepair(part, inv);
      const li = document.createElement('li');
      li.className = 'repair-item' + (done ? ' is-done' : '') + (ok && !done ? ' is-ready' : '');

      li.innerHTML = `
        <div class="repair-item-num mono">${String(i + 1).padStart(2, '0')}</div>
        <div class="repair-item-body">
          <h3 class="repair-item-name">${t(part.nameKey)}</h3>
          <p class="repair-item-why">${t(part.whyKey)}</p>
          <p class="repair-item-step"><b>${t('repair.howTo')}</b> ${t(part.stepKey)}</p>
          <p class="repair-item-cost">
            <b>${t('repair.needs')}</b>
            ${Object.entries(part.cost).map(([item, n]) => {
              const have = inv[item] || 0;
              const enough = have >= n;
              return `<span class="repair-chip${enough ? '' : ' is-short'}">${t('item.' + item)} ${have}/${n}</span>`;
            }).join('')}
            <span class="repair-chip is-time">${t('repair.minutes').replace('{n}', String(part.minutes))}</span>
          </p>
        </div>
        <div class="repair-item-act">
          ${done
            ? `<span class="repair-check" aria-label="${t('repair.repaired')}">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                   <path d="M4 12.5l5.5 5.5L20 6.5"/></svg>
               </span>`
            : `<button type="button" class="repair-btn" data-part="${part.id}" ${ok ? '' : 'disabled'}>
                 ${t('repair.doIt')}
               </button>`}
        </div>
      `;

      const btn = li.querySelector('.repair-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          if (!canRepair(part, inv)) return;
          /* Trừ vật liệu qua stats để kho, HUD và màn túi đồ cùng cập nhật. */
          Object.entries(part.cost).forEach(([item, n]) => {
            if (stats && typeof stats.spendItem === 'function') stats.spendItem(item, n);
          });
          state[part.id] = true;
          saveRepairs(state);
          playOneShotSfx('switch-flip', { overlay: true });
          statusEl.textContent = t('repair.doneOne').replace('{name}', t(part.nameKey));
          refresh();
        });
      }
      listEl.appendChild(li);
    });

    const doneN = repairedCount(state);
    fillEl.style.width = (100 * doneN / REPAIR_PARTS.length) + '%';
    progressTxt.textContent = t('repair.progress')
      .replace('{n}', String(doneN)).replace('{max}', String(REPAIR_PARTS.length));
    doneBtn.disabled = !isAllRepaired(state);
  }

  function close() {
    host.remove();
    if (typeof onClose === 'function') onClose();
  }

  host.querySelector('.repair-close').addEventListener('click', close);
  host.querySelector('.repair-scrim').addEventListener('click', close);
  doneBtn.addEventListener('click', () => {
    host.remove();
    if (typeof onDone === 'function') onDone();
  });

  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  refresh();
  statusEl.textContent = t('repair.hint');

  return {
    destroy() {
      document.removeEventListener('keydown', onKey);
      host.remove();
    },
  };
}

/* ---------- css ---------- */

function injectCss() {
  if (document.querySelector('link[data-repair-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/repair.css';
  link.dataset.repairCss = '1';
  document.head.appendChild(link);
}
