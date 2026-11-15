/* Màn bàn chế tạo: ghép vật phẩm thành thứ dùng được.
   Bốn công thức lấy thẳng từ RECIPES của hab-stats.js để chỉ có một
   nguồn sự thật. Mỗi thẻ hiện rõ tốn gì, được gì, và rủi ro nếu có. */

import { t } from './i18n.js';
import { ITEMS, RECIPES } from './hab-stats.js';

const BASE_URL = new URL('.', import.meta.url).href;

const ICONS = {
  patch_seal:   'assets/art/icon-tape.webp',
  make_water:   'assets/art/icon-hydrazine.webp',
  water_filter: 'assets/art/icon-filter.webp',
  power_cell:   'assets/art/icon-solar.webp',
};

function costLine(cost) {
  return Object.entries(cost)
    .map(([id, n]) => {
      const name = t('base.item.' + id);
      const label = name.startsWith('base.item.') ? id : name;
      return `${n} × ${label}`;
    })
    .join(', ');
}

function givesLine(recipe) {
  if (recipe.gives) {
    return Object.entries(recipe.gives)
      .map(([id, n]) => {
        const name = t('base.item.' + id);
        const label = name.startsWith('base.item.') ? id : name;
        return `+${n} ${label}`;
      })
      .join(', ');
  }
  if (recipe.effect) {
    const parts = [];
    for (const [k, v] of Object.entries(recipe.effect)) {
      const nm = t('hud.' + k);
      parts.push(`${nm.startsWith('hud.') ? k : nm} +${v}`);
    }
    return parts.join(', ');
  }
  if (recipe.upgrade) {
    const nm = t('base.craft.upg.' + recipe.upgrade);
    return nm.startsWith('base.craft.upg.') ? recipe.upgrade : nm;
  }
  return '';
}

export function openCraft({ container, stats, onClose, onDone } = {}) {
  const root = document.createElement('div');
  root.className = 'craft-screen';
  root.innerHTML = `
    <div class="craft-panel" role="dialog" aria-modal="true" aria-label="${t('base.craft.title')}">
      <header class="craft-head">
        <div>
          <h2 class="craft-title">${t('base.craft.title')}</h2>
          <p class="craft-sub">${t('base.craft.sub')}</p>
        </div>
        <button type="button" class="craft-close" aria-label="${t('base.close')}">×</button>
      </header>
      <div class="craft-list" role="list"></div>
      <p class="craft-foot"></p>
    </div>`;
  container.appendChild(root);

  const list = root.querySelector('.craft-list');
  const foot = root.querySelector('.craft-foot');

  function render() {
    const inv = stats.getInventory();
    const st = stats.get();
    list.innerHTML = '';

    for (const [id, r] of Object.entries(RECIPES)) {
      const afford = Object.entries(r.cost).every(([k, n]) => (inv[k] || 0) >= n);

      const card = document.createElement('article');
      card.className = 'craft-card' + (afford ? '' : ' is-short');
      card.setAttribute('role', 'listitem');

      const img = ICONS[id]
        ? `<img class="craft-art" src="${BASE_URL}${ICONS[id]}" alt="">`
        : `<span class="craft-art craft-art-fallback"></span>`;

      const risky = r.risk && st.sanity < r.risk.sanityBelow;

      card.innerHTML = `
        ${img}
        <div class="craft-body">
          <h3 class="craft-name"></h3>
          <p class="craft-cost"></p>
          <p class="craft-gives"></p>
          ${risky ? `<p class="craft-risk"></p>` : ''}
        </div>
        <button type="button" class="craft-go"></button>`;

      card.querySelector('.craft-name').textContent = t('base.craft.' + id) || r[r ? 'vi' : 'vi'] || id;
      card.querySelector('.craft-cost').textContent = t('base.craft.cost') + ' ' + costLine(r.cost);
      card.querySelector('.craft-gives').textContent = t('base.craft.gives') + ' ' + givesLine(r);
      if (risky) {
        card.querySelector('.craft-risk').textContent =
          t('base.craft.risk').replace('{n}', String(Math.round(r.risk.chance * 100)));
      }

      const btn = card.querySelector('.craft-go');
      btn.textContent = afford ? t('base.craft.do') : t('base.craft.short');
      btn.disabled = !afford;
      btn.addEventListener('click', () => {
        const res = stats.craft(id);
        stats.save();
        if (res.ok) {
          foot.textContent = t('base.craft.done');
          if (typeof onDone === 'function') onDone(res);
        } else {
          foot.textContent = res.message || t('base.craft.fail');
        }
        render();
      });

      list.appendChild(card);
    }
  }

  root.querySelector('.craft-close').addEventListener('click', () => {
    root.remove();
    if (typeof onClose === 'function') onClose();
  });

  const onKey = (e) => {
    if (e.key === 'Escape') {
      root.remove();
      document.removeEventListener('keydown', onKey);
      if (typeof onClose === 'function') onClose();
    }
  };
  document.addEventListener('keydown', onKey);

  render();
  return { destroy: () => { root.remove(); document.removeEventListener('keydown', onKey); } };
}
