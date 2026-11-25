/* ============================================================
   onboarding.js
   Hệ thống hướng dẫn người chơi theo khuôn mẫu.

   Toàn bộ nội dung nằm trong src/data/onboarding_tutorials.json.
   Muốn thêm hướng dẫn cho một tính năng mới, chỉ cần thêm một phần
   tử vào mảng tutorials trong file JSON đó, rồi gọi maybeShow ở chỗ
   mở tính năng. Không phải sửa file này.

   Bốn hàm xuất ra:
     showTutorial({ id, onDone })  mở một thẻ với spotlight
     maybeShow({ trigger, panel, screen })
                                   hiện thẻ nếu chưa xem
     resetTutorials()              xoá trạng thái đã xem
     openHandbook({ onClose })     mở sổ tay liệt kê mọi thẻ

   Spotlight dựng bằng bốn lớp tối (trên, dưới, trái, phải) bao quanh
   vùng sáng. Bốn lớp thay vì một lớp có lỗ khoét vì cách này không
   cần clip-path nên chạy đúng trên mọi trình duyệt và không cắt mất
   phần tử đang được khoanh sáng.
   ============================================================ */

import { getLang } from './i18n.js';

const BASE = new URL('.', import.meta.url).href;
const DATA_URL = BASE + 'data/onboarding_tutorials.json';

const SEEN_KEY = 'smdg.tutorialsSeen';

/* Bí danh tên panel: sân khấu căn cứ gọi trạm bằng id riêng
   (lifesupport, comms) trong khi lưới hành động cũ gọi là farm,
   radio. JSON khai một tên, hai cách mở đều khớp. */
const PANEL_ALIAS = {
  lifesupport: ['farm'],
  comms: ['radio'],
  farm: ['lifesupport'],
  radio: ['comms'],
};

/* Khoảng hở quanh vùng sáng, để viền khoanh không dính sát nút bấm. */
const HOLE_PAD = 12;
/* Khoảng cách giữa vùng sáng và thẻ nội dung. */
const GAP = 18;

/* ---------- nhãn giao diện, song ngữ ---------- */

const LABELS = {
  vi: {
    eyebrow: 'Hướng dẫn',
    how: 'Cách làm',
    nasa: 'Góc NASA',
    tip: 'Mẹo sống còn',
    of: 'Thẻ {n} trên {total}',
    later: 'Để sau',
    close: 'Đóng hướng dẫn',
    handbook: 'Sổ tay hướng dẫn',
    handbookSub: 'Mọi thẻ hướng dẫn, kể cả đã xem',
    group1: 'Giai đoạn 1 · Trạm Hab',
    group2: 'Giai đoạn 2 · Thiết kế sứ mệnh',
    seen: 'Đã xem',
    unseen: 'Chưa xem',
    empty: 'Chưa có thẻ hướng dẫn nào.',
    reset: 'Xem lại từ đầu',
  },
  en: {
    eyebrow: 'Guide',
    how: 'How to',
    nasa: 'NASA angle',
    tip: 'Survival tip',
    of: 'Card {n} of {total}',
    later: 'Later',
    close: 'Close guide',
    handbook: 'Handbook',
    handbookSub: 'Every tutorial, seen or not',
    group1: 'Phase 1 · Hab',
    group2: 'Phase 2 · Mission Design',
    seen: 'Seen',
    unseen: 'New',
    empty: 'No tutorial cards yet.',
    reset: 'Replay all',
  },
};

function L(key, vars) {
  const table = LABELS[getLang()] || LABELS.vi;
  let s = table[key] || LABELS.vi[key] || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', String(v));
  return s;
}

/* ---------- biểu tượng ---------- */

const ICON = {
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 12h13"/><path d="m12.5 6.5 5.8 5.5-5.8 5.5"/></svg>`,
  sat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="9.4" y="9.4" width="5.2" height="5.2" rx="1"/>
    <path d="m9.4 10.6-4.6-4.6"/><path d="m14.6 10.6 4.6-4.6"/>
    <path d="m9.4 13.4-4.6 4.6"/><path d="m14.6 13.4 4.6 4.6"/>
    <circle cx="12" cy="2.6" r="1"/><path d="M12 3.6v5.8"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3.2 21.4 20H2.6z"/><path d="M12 9.4v4.8"/><path d="M12 17.4h.01"/></svg>`,
};

/* ---------- nạp dữ liệu ---------- */

let dataPromise = null;

function loadData() {
  if (!dataPromise) {
    dataPromise = fetch(DATA_URL, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((json) => {
        const list = Array.isArray(json && json.tutorials) ? json.tutorials : [];
        /* Sắp theo order rồi id, để số thứ tự "Thẻ n trên m" ổn định
           dù ai đó chèn thẻ mới vào giữa file. */
        return list.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      })
      .catch((err) => {
        console.warn('[onboarding] không đọc được dữ liệu hướng dẫn', err);
        return [];
      });
  }
  return dataPromise;
}

/* ---------- trạng thái đã xem ---------- */

function readSeen() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeSeen(list) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(new Set(list))));
  } catch { /* chế độ riêng tư chặn ghi thì thôi, không chặn người chơi */ }
}

function markSeen(id) {
  if (!id) return;
  const list = readSeen();
  if (list.includes(id)) return;
  list.push(id);
  writeSeen(list);
}

function isSeen(id) {
  return readSeen().includes(id);
}

/* ============================================================
   resetTutorials
   Xoá trạng thái đã xem. Bảng dev gọi hàm này để test lại từ đầu
   mà không phải xoá tay localStorage.
   ============================================================ */
export function resetTutorials() {
  try { localStorage.removeItem(SEEN_KEY); } catch { /* bỏ qua */ }
}

/* ---------- CSS ---------- */

function injectCss() {
  if (document.querySelector('link[data-onboarding-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css/onboarding.css';
  link.dataset.onboardingCss = '1';
  document.head.appendChild(link);
}

/* ---------- đọc vùng sáng ---------- */

function rectOf(el) {
  const b = el.getBoundingClientRect();
  return { x: b.left, y: b.top, w: b.width, h: b.height };
}

/* Gộp nhiều selector thành một hình chữ nhật bao trọn. Thẻ có
   spotlight dạng mảng (ví dụ ba nút tủ đồ, bàn kỹ thuật, airlock)
   thì vùng sáng phải phủ cả ba. */
function measureSpot(spotlight) {
  if (!spotlight || spotlight === 'all') return null;
  const sels = Array.isArray(spotlight) ? spotlight : [spotlight];
  let out = null;
  for (const sel of sels) {
    let nodes = [];
    try { nodes = Array.from(document.querySelectorAll(sel)); } catch { continue; }
    for (const node of nodes) {
      if (!(node instanceof Element)) continue;
      const r = rectOf(node);
      if (r.w <= 0 || r.h <= 0) continue;
      out = out
        ? {
          x: Math.min(out.x, r.x),
          y: Math.min(out.y, r.y),
          w: Math.max(out.x + out.w, r.x + r.w) - Math.min(out.x, r.x),
          h: Math.max(out.y + out.h, r.y + r.h) - Math.min(out.y, r.y),
        }
        : r;
    }
  }
  return out;
}

/* ============================================================
   Lớp phủ dùng chung
   Một lớp duy nhất được dựng lần đầu rồi tái sử dụng, để mở thẻ
   liên tiếp không sinh ra hàng loạt div rác trong DOM.
   ============================================================ */

let layer = null;

function buildLayer() {
  injectCss();
  /* Nếu module bị nạp hai lần (đường dẫn module khác nhau), lớp phủ
     của bản nạp trước vẫn còn trong DOM. Dùng lại nó thay vì dựng
     thêm, nếu không hai tấm tối chồng nhau và nút bấm bị nuốt. */
  const existing = document.querySelector('.onb-root');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.className = 'onb-root';
  root.hidden = true;
  root.innerHTML = `
    <div class="onb-dim" data-dim="top"></div>
    <div class="onb-dim" data-dim="bottom"></div>
    <div class="onb-dim" data-dim="left"></div>
    <div class="onb-dim" data-dim="right"></div>
    <div class="onb-ring" hidden aria-hidden="true"></div>
    <div class="onb-card" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <header class="onb-head">
        <span class="onb-eyebrow"></span>
        <h2 class="onb-title" id="onb-title"></h2>
      </header>
      <div class="onb-blocks">
        <section class="onb-block onb-how">
          <span class="onb-ico onb-ico-how" aria-hidden="true">${ICON.arrow}</span>
          <div class="onb-block-body">
            <h3 class="onb-block-h"></h3>
            <p class="onb-block-p"></p>
          </div>
        </section>
        <section class="onb-block onb-nasa">
          <span class="onb-ico onb-ico-nasa" aria-hidden="true">${ICON.sat}</span>
          <div class="onb-block-body">
            <h3 class="onb-block-h"></h3>
            <p class="onb-block-p"></p>
          </div>
        </section>
        <section class="onb-block onb-tip">
          <span class="onb-ico onb-ico-tip" aria-hidden="true">${ICON.warn}</span>
          <div class="onb-block-body">
            <h3 class="onb-block-h"></h3>
            <p class="onb-block-p"></p>
          </div>
        </section>
      </div>
      <button type="button" class="onb-go"></button>
      <footer class="onb-foot">
        <span class="onb-count"></span>
        <button type="button" class="onb-later"></button>
      </footer>
    </div>
  `;
  document.body.appendChild(root);

  const dims = {
    top: root.querySelector('[data-dim="top"]'),
    bottom: root.querySelector('[data-dim="bottom"]'),
    left: root.querySelector('[data-dim="left"]'),
    right: root.querySelector('[data-dim="right"]'),
  };

  layer = {
    root,
    dims,
    ring: root.querySelector('.onb-ring'),
    card: root.querySelector('.onb-card'),
    eyebrow: root.querySelector('.onb-eyebrow'),
    title: root.querySelector('.onb-title'),
    blocks: Array.from(root.querySelectorAll('.onb-block')),
    go: root.querySelector('.onb-go'),
    count: root.querySelector('.onb-count'),
    later: root.querySelector('.onb-later'),
    onResize: null,
  };
  return layer;
}

function paintDims(hole) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { dims, ring } = layer;

  if (!hole) {
    /* Không khoanh gì: một tấm tối phủ kín, ba lớp còn lại rỗng. */
    dims.top.style.cssText = `left:0;top:0;width:${vw}px;height:${vh}px;`;
    dims.bottom.style.cssText = 'left:0;top:0;width:0;height:0;';
    dims.left.style.cssText = 'left:0;top:0;width:0;height:0;';
    dims.right.style.cssText = 'left:0;top:0;width:0;height:0;';
    ring.hidden = true;
    return;
  }

  const x = Math.max(0, hole.x - HOLE_PAD);
  const y = Math.max(0, hole.y - HOLE_PAD);
  const w = Math.min(vw - x, hole.w + HOLE_PAD * 2);
  const h = Math.min(vh - y, hole.h + HOLE_PAD * 2);

  dims.top.style.cssText = `left:0;top:0;width:${vw}px;height:${y}px;`;
  dims.bottom.style.cssText = `left:0;top:${y + h}px;width:${vw}px;height:${Math.max(0, vh - y - h)}px;`;
  dims.left.style.cssText = `left:0;top:${y}px;width:${x}px;height:${h}px;`;
  dims.right.style.cssText = `left:${x + w}px;top:${y}px;width:${Math.max(0, vw - x - w)}px;height:${h}px;`;

  ring.hidden = false;
  ring.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
}

function paintCard(hole) {
  const card = layer.card;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const narrow = vw < 640;

  /* Xoá vị trí cũ trước khi đo lại, nếu không chiều cao cũ làm lệch
     phép tính khi thẻ đổi nội dung dài ngắn khác nhau. */
  card.style.left = '';
  card.style.top = '';
  card.style.bottom = '';
  card.style.transform = '';
  card.style.maxHeight = '';

  if (!hole) {
    card.classList.add('is-center');
    if (narrow) {
      card.style.left = '12px';
      card.style.right = '12px';
      card.style.top = 'calc(env(safe-area-inset-top, 0px) + 56px)';
      card.style.maxHeight = 'calc(100dvh - 112px)';
      return;
    }
    card.style.left = '50%';
    card.style.top = '50%';
    card.style.transform = 'translate(-50%, -50%)';
    card.style.maxHeight = 'calc(100dvh - 96px)';
    return;
  }

  card.classList.remove('is-center');

  if (narrow) {
    /* Màn hẹp: vùng sáng thường chiếm gần hết bề ngang, nên đặt thẻ
       ở nửa còn lại theo chiều dọc và cho phép cuộn bên trong. */
    const below = hole.y + hole.h / 2 < vh / 2;
    card.style.left = '10px';
    card.style.right = '10px';
    if (below) {
      const top = Math.min(vh - 96, hole.y + hole.h + HOLE_PAD + GAP);
      card.style.top = top + 'px';
      card.style.maxHeight = Math.max(180, vh - top - 10) + 'px';
    } else {
      const bottom = Math.min(vh - 96, vh - hole.y + HOLE_PAD + GAP);
      card.style.bottom = bottom + 'px';
      card.style.maxHeight = Math.max(180, vh - bottom - 10) + 'px';
    }
    return;
  }

  /* Màn rộng: thẻ nằm ngoài vùng sáng. Vùng sáng ở nửa trên thì thẻ
     xuống dưới, ngược lại thì thẻ lên trên. Bề ngang thẻ do CSS giữ
     ở mức dễ đọc, ở đây chỉ căn giữa theo trục ngang. */
  card.style.left = '50%';
  card.style.transform = 'translateX(-50%)';

  if (hole.h + hole.y < vh / 2) {
    const top = Math.min(vh - 120, hole.y + hole.h + HOLE_PAD + GAP);
    card.style.top = top + 'px';
    card.style.maxHeight = Math.max(220, vh - top - 16) + 'px';
  } else {
    const bottom = Math.min(vh - 120, vh - hole.y + HOLE_PAD + GAP);
    card.style.bottom = bottom + 'px';
    card.style.maxHeight = Math.max(220, vh - Math.max(16, bottom) - 16) + 'px';
  }
}

/* ---------- vẽ nội dung thẻ ---------- */

function paintCardText(item, index, total) {
  const lang = getLang();
  const pick = (field) => {
    const v = item[field];
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v[lang] || v.vi || v.en || '';
  };

  layer.eyebrow.textContent = L('eyebrow');
  layer.title.textContent = pick('title');

  const heads = [L('how'), L('nasa'), L('tip')];
  const bodies = [pick('action'), pick('nasaFact'), pick('survivalTip')];
  layer.blocks.forEach((sec, i) => {
    sec.querySelector('.onb-block-h').textContent = heads[i] || '';
    sec.querySelector('.onb-block-p').textContent = bodies[i] || '';
  });

  layer.go.textContent = pick('button') || (lang === 'en' ? 'Got it' : 'Đã hiểu');
  layer.count.textContent = L('of', { n: index + 1, total });
  layer.later.textContent = L('later');
}

/* ============================================================
   showTutorial
   Mở một thẻ theo id.

   @param {object} opts
   @param {string} opts.id           id thẻ trong JSON
   @param {Function} [opts.onDone]   gọi sau khi đóng (đã đánh dấu xem)
   @param {boolean} [opts.readOnly]  mở từ sổ tay: không đánh dấu đã xem
   ============================================================ */
export async function showTutorial({ id, onDone, readOnly = false } = {}) {
  const list = await loadData();
  const index = list.findIndex((x) => x.id === id);
  if (index < 0) {
    console.warn('[onboarding] không có thẻ nào mang id', id);
    return null;
  }
  const item = list[index];
  const total = list.length;

  const ui = buildLayer();
  const spot = measureSpot(item.spotlight);

  paintCardText(item, index, total);
  ui.root.hidden = false;
  ui.root.dataset.mode = readOnly ? 'read' : 'flow';

  /* Đo vùng sáng sau khi đã mở lớp phủ, vì một số panel của game
     đổi kích thước khi lớp phủ xuất hiện. */
  paintDims(spot);
  paintCard(spot);

  /* Chốt an toàn: thẻ hướng dẫn tự đóng sau 40 giây nếu người chơi
     không bấm gì. Mục đích không phải ép đọc nhanh, mà để một lỗi bất
     ngờ (script chết, trình duyệt chặn sự kiện) không nhốt được người
     chơi vào thẻ không có đường ra. Nút Để sau và phím Esc vẫn đóng
     ngay. Khai báo ở đây, ngay trước finish, để không vướng vùng chết
     tạm thời. */
  const watchdog = window.setTimeout(() => {
    console.warn('[onboarding] thẻ hướng dẫn quá 40 giây, tự đóng để không chặn game');
    finish(false);
  }, 40000);

  const finish = (seen) => {
    window.clearTimeout(watchdog);
    if (seen && !readOnly) markSeen(item.id);
    ui.root.hidden = true;
    ui.root.dataset.mode = '';
    if (typeof ui.onResize === 'function') {
      window.removeEventListener('resize', ui.onResize);
      window.removeEventListener('scroll', ui.onResize, true);
      ui.onResize = null;
    }
    document.removeEventListener('keydown', onKey, true);
    if (typeof ui.onDoneCb === 'function') ui.onDoneCb();
    ui.onDoneCb = null;
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      finish(false);
    }
  };

  ui.onDoneCb = typeof onDone === 'function' ? onDone : null;

  ui.go.onclick = () => finish(true);
  ui.later.onclick = () => finish(false);
  /* Bấm ra vùng tối mới tính như "Để sau". Ở chế độ chỉ đọc (mở từ sổ
     tay) thì KHÔNG gắn: cú bấm vào thẻ trong sổ tay rơi xuống lớp tối
     của thẻ vừa dựng, nên nếu lớp tối cũng đóng thì thẻ hiện ra rồi tắt
     ngay sau một nhịp. Đó đúng là lỗi "bấm vào thẻ thấy hiện một giây
     rồi mất". */
  if (!readOnly) {
    for (const d of Object.values(ui.dims)) d.onclick = () => finish(false);
  }

  ui.onResize = () => {
    const r = measureSpot(item.spotlight);
    paintDims(r);
    paintCard(r);
  };
  window.addEventListener('resize', ui.onResize);
  window.addEventListener('scroll', ui.onResize, true);
  document.addEventListener('keydown', onKey, true);

  /* Hiện thẻ. KHÔNG dùng requestAnimationFrame làm đường duy nhất:
     rAF bị trình duyệt hoãn khi tab đang ẩn, khi cửa sổ mất focus,
     hoặc khi máy đang nghẽn. Đo thật trên Chrome: với tab ẩn,
     document.hidden === true và callback rAF KHÔNG chạy trong 500ms —
     nên is-in không bao giờ được thêm, thẻ ở lại opacity 0 và người
     chơi thấy khung trống dù chữ nằm đủ trong DOM. Đó đúng là lỗi
     "bấm vào thẻ không đọc được, nó tự đóng lại".
     Giờ dùng setTimeout làm đường chính (luôn chạy) và rAF chỉ để
     sớm hơn một nhịp khi nó có chạy. addIfNeeded chống gọi hai lần. */
  let shown = false;
  const show = () => {
    if (shown) return;
    shown = true;
    ui.root.classList.add('is-in');
    if (ui.go && typeof ui.go.focus === 'function') ui.go.focus({ preventScroll: true });
  };
  requestAnimationFrame(show);
  window.setTimeout(show, 32);
  /* is-in KHÔNG bị gỡ sau khi hiệu ứng vào chạy xong. CSS chỉ cho thẻ
     sáng khi có is-in:
       html:not(.motion-off) .onb-card { opacity: 0 }
       html:not(.motion-off) .onb-root.is-in .onb-card { opacity: 1 }
     Trước đây có một setTimeout 260ms gỡ is-in với ý "vào xong rồi thì
     thôi", nhưng gỡ ra là thẻ quay về opacity 0 và biến mất hẳn. is-in
     ở lại suốt vòng đời thẻ; finish() mới là chỗ gỡ cùng lúc ẩn. */

  return item;
}

/* ============================================================
   maybeShow
   Hiện thẻ đầu tiên khớp điều kiện mà người chơi chưa xem.

   @param {object} q
   @param {string} q.trigger  'firstEnter' | 'firstOpenPanel' | 'manual'
   @param {string} [q.panel]  mã panel khi trigger là firstOpenPanel
   @param {string} [q.screen] mã màn khi trigger là firstEnter
   ============================================================ */
export async function maybeShow({ trigger, panel, screen } = {}) {
  if (!trigger || trigger === 'manual') return null;
  if (layer && !layer.root.hidden) return null;

  const list = await loadData();
  const seen = readSeen();

  const hit = list.find((item) => {
    if (seen.includes(item.id)) return false;
    const tr = item.trigger || {};
    if (tr.type !== trigger) return false;
    if (trigger === 'firstOpenPanel') {
      /* Panel có thể khai nhiều mã, cách nhau bởi dấu phẩy, khi một
         thẻ dùng chung cho nhiều nút (ví dụ comms và radio). */
      const want = String(tr.panel || '').split(',').map((s) => s.trim()).filter(Boolean);
      for (const key of want) {
        if (key === panel) return true;
        /* Bí danh: sân khấu mới gọi trạm là lifesupport / comms, còn
           lưới hành động cũ gọi là farm / radio. Một thẻ phải khớp
           được với cả hai cách gọi, nếu không thì mở trạm bằng nút
           nào cũng không hiện hướng dẫn. */
        const alias = PANEL_ALIAS[key] || [];
        if (alias.includes(panel)) return true;
      }
      return false;
    }
    if (trigger === 'firstEnter') {
      return !tr.screen || tr.screen === screen;
    }
    return true;
  });

  if (!hit) return null;
  return showTutorial({ id: hit.id });
}

/* ============================================================
   openHandbook
   Sổ tay: liệt kê TẤT CẢ thẻ trong JSON, chia hai nhóm giai đoạn,
   kèm nhãn đã xem cho thẻ nào từng mở.
   ============================================================ */
export async function openHandbook({ onClose } = {}) {
  injectCss();
  const list = await loadData();

  const root = document.createElement('div');
  root.className = 'onb-book';
  root.innerHTML = `
    <div class="onb-book-veil" data-book-close></div>
    <div class="onb-book-panel" role="dialog" aria-modal="true" aria-labelledby="onb-book-title">
      <header class="onb-book-head">
        <div>
          <h2 class="onb-book-title" id="onb-book-title"></h2>
          <p class="onb-book-sub"></p>
        </div>
        <button type="button" class="onb-book-x" data-book-close aria-label="">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="onb-book-body"></div>
    </div>
  `;
  document.body.appendChild(root);

  /* Lớp phủ "mở nhật ký lần đầu" (ml-intro, z 125) chặn Esc và nuốt
     click. Nếu nó đang mở mà người chơi bấm nút [?], sách nằm dưới và
     mọi thao tác rơi vào lớp phủ kia, cảm giác như sách tự đóng sau
     một giây. Gỡ nó ra và ghi cờ đã xem: người chơi đã chủ động mở
     sổ tay thì coi như đã đọc nhật ký, không cần ép nữa. */
  const introLayer = document.querySelector('.ml-intro');
  if (introLayer) {
    try {
      localStorage.setItem('smdg.missionLogIntro', '1');
    } catch (_) { /* trình duyệt chặn lưu, bỏ qua */ }
    introLayer.remove();
  }

  /* Thẻ hướng dẫn đang mở cũng phải dẹp. Nếu để nguyên, nó nằm trên sổ
     tay và nuốt mọi cú bấm, khiến sổ tay hiện ra rồi biến mất ngay khi
     người chơi vừa chạm vào. Chỉ gỡ phần tử, không đụng tới cờ đã xem
     của từng thẻ, để lần sau mở panel vẫn được nhắc đúng. */
  const tutLayer = document.querySelector('.onb-root');
  if (tutLayer) {
    try { tutLayer.remove(); } catch (_) { /* DOM đã đổi, bỏ qua */ }
  }

  const titleEl = root.querySelector('.onb-book-title');
  const subEl = root.querySelector('.onb-book-sub');
  const bodyEl = root.querySelector('.onb-book-body');
  const xEl = root.querySelector('.onb-book-x');

  const lang = getLang();
  titleEl.textContent = L('handbook');
  subEl.textContent = L('handbookSub');
  xEl.setAttribute('aria-label', L('close') || L('later'));

  const seenNow = readSeen();

  function paint() {
    bodyEl.innerHTML = '';
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'onb-book-empty';
      p.textContent = L('empty');
      bodyEl.appendChild(p);
      return;
    }
    const groups = [
      { id: 1, label: L('group1'), items: list.filter((x) => (x.phase || 1) === 1) },
      { id: 2, label: L('group2'), items: list.filter((x) => (x.phase || 1) === 2) },
    ];
    const seenSet = new Set(readSeen());
    for (const g of groups) {
      if (!g.items.length) continue;
      const sec = document.createElement('section');
      sec.className = 'onb-book-group';
      const h = document.createElement('h3');
      h.className = 'onb-book-gh';
      h.textContent = g.label;
      sec.appendChild(h);

      for (const item of g.items) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'onb-book-item' + (seenSet.has(item.id) ? ' is-seen' : ' is-new');
        b.dataset.tutId = item.id;
        const title = item.title ? (item.title[lang] || item.title.vi || '') : item.id;
        b.innerHTML = `
          <span class="onb-book-num"></span>
          <span class="onb-book-txt"></span>
          <span class="onb-book-flag"></span>
        `;
        b.querySelector('.onb-book-num').textContent = String((item.order || 0)).padStart(2, '0');
        b.querySelector('.onb-book-txt').textContent = title;
        b.querySelector('.onb-book-flag').textContent = seenSet.has(item.id) ? L('seen') : L('unseen');
        sec.appendChild(b);
      }
      bodyEl.appendChild(sec);
    }
  }
  paint();

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    root.remove();
    if (typeof onClose === 'function') onClose();
  }

  function onKey(e) {
    if (e.key !== 'Escape') return;
    /* Khi một thẻ hướng dẫn đang mở đè lên sổ tay, Esc phải đóng THẺ
       trước. Trước đây handler này gắn ở capture nên chạy trước handler
       của thẻ, đóng luôn cả sổ tay: người chơi bấm Esc trong một thẻ thì
       mất cả sổ, không quay lại danh sách được.
       Kiểm sự tồn tại của .onb-root đang hiện là đủ để nhường quyền. */
    const tut = document.querySelector('.onb-root');
    if (tut && !tut.hidden) return;
    e.stopPropagation();
    e.preventDefault();
    close();
  }

  root.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-book-close]')) { close(); return; }
    const btn = t.closest('.onb-book-item');
    if (!btn) return;
    /* Bấm một thẻ: ẩn sổ tay, mở thẻ ở chế độ chỉ đọc, đóng thì
       quay lại sổ tay đúng chỗ cũ. */
    const id = btn.dataset.tutId;
    root.style.display = 'none';
    showTutorial({
      id,
      readOnly: true,
      onDone: () => {
        if (closed) return;
        root.style.display = '';
        paint();
        const back = root.querySelector(`[data-tut-id="${id}"]`);
        if (back && typeof back.focus === 'function') back.focus({ preventScroll: true });
      },
    });
  });

  document.addEventListener('keydown', onKey, true);
  /* Sổ tay cũng phải hiện kể cả khi rAF bị hoãn (tab ẩn, cửa sổ mất
     focus). Cùng lý do với showTutorial: setTimeout làm đường chính,
     rAF chỉ để sớm hơn một nhịp khi có chạy. */
  let bookShown = false;
  const showBook = () => {
    if (bookShown || closed) return;
    bookShown = true;
    root.classList.add('is-in');
    if (xEl && typeof xEl.focus === 'function') xEl.focus({ preventScroll: true });
  };
  requestAnimationFrame(showBook);
  window.setTimeout(showBook, 32);

  return { close };
}

/* ============================================================
   registerPhase2Hooks
   MÓC TẠM CHO GIAI ĐOẠN 2.

   Phase 2 dựng DOM của nó trong các file feature-*.js mà lần này
   không được sửa, nên không có chỗ gọi maybeShow trực tiếp. Cách
   duy nhất không đụng vào chúng là theo dõi DOM bằng MutationObserver
   rồi gọi maybeShow lần đầu thấy dấu hiệu đặc trưng của từng màn.

   Đây là cách tạm. Khi nào được phép sửa Phase 2 thì mỗi feature
   tự gọi maybeShow ở chỗ dựng xong giao diện và xoá được cả khối này.
   ============================================================ */
export function registerPhase2Hooks() {
  if (typeof MutationObserver !== 'function') return () => {};

  /* selector -> mã màn trong JSON. Thứ tự quan trọng: màn hẹp hơn
     (modal) phải đứng trước màn rộng (cả xưởng), nếu không thì vừa
     mở modal là màn cha đã giành mất lượt hiện thẻ. */
  const RULES = [
    { sel: '.cm4, .cml4-root, [class^="cml4-"]', screen: 'cml4' },
    { sel: '.cmp-modal, [class^="cmp-"]', screen: 'componentModal' },
    { sel: '.trj-modal, [class^="trj-"]', screen: 'trajectoryModal' },
    { sel: '.p2-stage', screen: 'assembly' },
  ];

  const fired = new Set();
  let queued = false;

  function scan() {
    queued = false;
    for (const rule of RULES) {
      if (fired.has(rule.screen)) continue;
      let found = null;
      try { found = document.querySelector(rule.sel); } catch { found = null; }
      if (!found) continue;
      fired.add(rule.screen);
      maybeShow({ trigger: 'firstEnter', screen: rule.screen });
      /* Chỉ hiện một thẻ mỗi lượt quét, để hai màn cùng xuất hiện
         không chồng hai thẻ lên nhau. */
      return;
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(scan);
  }

  const obs = new MutationObserver(schedule);
  obs.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'hidden'],
  });
  schedule();

  return () => obs.disconnect();
}
