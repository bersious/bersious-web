/* ============================================================
   story-fx.js
   Hiệu ứng điện ảnh cho màn kể chuyện, theo từng số lượt.

   Nguyên tắc:
     - Chỉ dùng transform và opacity khi chuyển động (GPU).
     - Không chặn nút bấm, trừ lượt 25 được khoá 0,5 giây ở story.js.
     - motion === false hoặc prefers-reduced-motion thì tắt hết.
     - resetFx dọn sạch mọi class và lớp phủ trước khi đổi lượt.
   ============================================================ */

import { getSettings, onSettingsChange } from './settings.js';

/* ---------- nạp CSS ---------- */

const FX_URL = new URL('.', import.meta.url).href;

function injectFxCss() {
  if (document.querySelector('link[data-fx-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FX_URL + 'css/fx.css';
  link.dataset.fxCss = '1';
  document.head.appendChild(link);
}
injectFxCss();

/* ---------- trạng thái mô-đun ---------- */

let fxEnabled = true;
let lastRoot = null;
/* Nhớ tham số của lượt đang hiện, để khi người chơi bật lại chuyển
   động giữa chừng thì hiệu ứng của lượt đó được dựng lại ngay. */
let lastArgs = null;
const timers = new Set();
/* Nhớ đoạn chữ đang chạy máy đánh chữ để khôi phục nguyên vẹn nếu
   hiệu ứng bị ngắt giữa chừng (đổi cài đặt, đổi lượt). */
let typingRestore = null;

function later(fn, ms) {
  const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
  timers.add(id);
  return id;
}

function motionAllowed() {
  if (!fxEnabled) return false;
  if (getSettings().motion === false) return false;
  if (document.documentElement.classList.contains('motion-off')) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

export function setFxEnabled(on) {
  fxEnabled = !!on;
  if (!fxEnabled && lastRoot) resetFx(lastRoot);
}

/* story.js hỏi trước khi khoá nút ở lượt 25. Người chơi tắt chuyển
   động thì không thấy cú đập, nên cũng không bị giữ nút. */
export function fxMotionOn() {
  return motionAllowed();
}

/* Đổi cài đặt giữa chừng thì có hiệu lực ngay, không cần tải lại.
   Tắt thì dọn sạch ngay; bật lại thì dựng lại hiệu ứng của lượt đang
   hiện, để người chơi không phải chuyển lượt mới thấy tác dụng. */
onSettingsChange(() => {
  if (!lastRoot) return;
  if (!motionAllowed()) { resetFx(lastRoot); return; }
  if (lastArgs) applyBeatFx(lastArgs);
});

/* ---------- bảng hiệu ứng mặc định theo số lượt (đếm từ 0) ----------

   Lượt có trường fx riêng trong story-data.js thì bảng này KHÔNG áp
   dụng: dữ liệu thắng, vì nhịp 8 khung cần đổi hiệu ứng theo từng
   khung và các khoá số ở đây sẽ lệch ngay khi thêm bớt một lượt.
   Bảng dưới chỉ còn giữ cho những lượt không khai báo fx. */

const BEAT_FX = {
  /* khung 3: góc nhìn thứ nhất, thở dốc */
  6:  { stage: ['fx-breath'], overlay: ['fx-dust-red-dense'] },
  7:  { stage: ['fx-breath'], overlay: ['fx-dust-red-dense'] },
  8:  { stage: ['fx-breath'], overlay: ['fx-dust-red'] },
  9:  { stage: ['fx-breath'], overlay: ['fx-dust-red'] },

  /* khung 4: tia quét ngang mặt kính */
  10: { overlay: ['fx-scan'] },
  11: { overlay: ['fx-scan'], special: 'typewriter' },
  13: { stage: ['fx-shake-hard'], overlay: ['fx-flash-impact', 'fx-flash-red'] },

  /* khung 5: cát phủ dần rồi lùi máy */
  14: { art: ['fx-zoom-far'], overlay: ['fx-sand-in'] },
  15: { overlay: ['fx-sand-in'] },
  16: { art: ['fx-zoom-far'] },
  17: { art: ['fx-zoom-far'] },

  /* khung 6: tối đen */
  19: { root: ['fx-blackout'] },
  20: { root: ['fx-blackout'] },

  /* khung 7: mí mắt mở */
  21: { overlay: ['fx-eyelids'], art: ['fx-unblur'] },
  22: { overlay: ['fx-eyelids'], art: ['fx-unblur'] },
  24: { art: ['fx-panx'] },

  /* khung 8: đi vào căn cứ, thở dốc */
  25: { stage: ['fx-breath-hard'], overlay: ['fx-dust-warm'] },
  26: { stage: ['fx-breath-hard'] },

  /* nhập tên */
  28: { art: ['fx-blur-bg'] },
};

/* ---------- hạt bụi ---------- */

function spawnParticles(container, count, kind) {
  const frag = document.createDocumentFragment();
  for (let n = 0; n < count; n++) {
    const p = document.createElement('span');
    p.className = 'fx-particle ' + kind;
    const size = kind === 'warm' ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2.5;
    p.style.width = size.toFixed(1) + 'px';
    p.style.height = size.toFixed(1) + 'px';
    if (kind === 'warm') {
      p.style.left = (Math.random() * 100).toFixed(1) + '%';
      p.style.bottom = (-4 - Math.random() * 10).toFixed(1) + '%';
      p.style.animationDuration = (9 + Math.random() * 7).toFixed(1) + 's';
      p.style.animationDelay = (-Math.random() * 14).toFixed(1) + 's';
    } else {
      p.style.top = (Math.random() * 100).toFixed(1) + '%';
      p.style.left = (104 + Math.random() * 10).toFixed(1) + '%';
      p.style.animationDuration = (6 + Math.random() * 6).toFixed(1) + 's';
      p.style.animationDelay = (-Math.random() * 10).toFixed(1) + 's';
    }
    p.style.opacity = (0.25 + Math.random() * 0.5).toFixed(2);
    frag.appendChild(p);
  }
  container.appendChild(frag);
}

/* ---------- chạy chữ kiểu máy đánh chữ ---------- */

function typewriter(body) {
  const log = body.querySelector('.story-log');
  if (!log) return;
  const full = log.textContent;
  if (!full) return;
  log.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'fx-cursor';
  log.appendChild(cursor);
  typingRestore = { el: log, full };
  let n = 0;
  const step = () => {
    if (n >= full.length) { typingRestore = null; return; }
    n += 1;
    cursor.before(document.createTextNode(full[n - 1]));
    /* 30ms mỗi ký tự, nằm giữa khoảng 25 tới 35 đã đặt ra. */
    later(step, 30);
  };
  step();
}

/* ---------- icon sóng âm cho thoại qua radio ---------- */

const WAVE_SVG = `<svg class="fx-wave" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
  <path d="M4 10v4"/><path d="M8 7v10"/><path d="M12 4v16"/>
  <path d="M16 7v10"/><path d="M20 10v4"/>
</svg>`;

function radioBadge(body) {
  /* Gắn vào chính khối chữ, không phụ thuộc khung tên người nói: lượt
     nghe qua bộ đàm có thể là lời kể chứ không phải thoại, khi đó
     không có .story-speaker để bám vào. */
  const frame = document.createElement('div');
  frame.className = 'fx-radio-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.innerHTML = WAVE_SVG;
  body.appendChild(frame);
}

/* ---------- áp hiệu ứng cho một lượt ---------- */

export function applyBeatFx({ beatIndex, beatType, artKey, root, body, stage, beatFx }) {
  lastRoot = root;
  if (!root || !body || !stage) return;
  lastArgs = { beatIndex, beatType, artKey, root, body, stage, beatFx };
  if (!motionAllowed()) return;

  const art = root.querySelector('.story-art-slot');
  /* Dữ liệu thắng bảng mặc định. Lượt khai báo fx riêng thì dùng đúng
     nó, kể cả khi fx rỗng, để dữ liệu luôn là nguồn sự thật duy nhất. */
  const plan = (beatFx !== undefined ? beatFx : BEAT_FX[beatIndex]) || {};

  const add = (elm, classes) => {
    if (!elm || !classes) return;
    classes.forEach((c) => elm.classList.add(c));
  };
  add(root, plan.root);
  add(stage, plan.stage);
  add(art, plan.art);
  add(body, plan.body);

  /* Lớp phủ toàn màn: một thẻ chứa, mỗi hiệu ứng là một lớp con. */
  const hasOverlay = plan.overlay && plan.overlay.length;
  if (hasOverlay) {
    const ov = root.querySelector('.fx-overlay') || document.createElement('div');
    if (!ov.isConnected) {
      ov.className = 'fx-overlay';
      ov.setAttribute('aria-hidden', 'true');
      root.appendChild(ov);
    }
    /* Vẽ lại cùng một lượt (nhập tên, đổi ngôn ngữ) thì dựng lại lớp
       phủ từ đầu, tránh chồng hai lớp giống nhau. */
    ov.innerHTML = '';
    plan.overlay.forEach((c) => {
      const layer = document.createElement('div');
      layer.className = 'fx-layer ' + c;
      ov.appendChild(layer);
    });

    /* bụi bay ngang theo gió, số hạt theo độ dày của lớp */
    const redDust = ov.querySelector('.fx-dust-red, .fx-dust-red-dense');
    if (redDust) spawnParticles(redDust, redDust.classList.contains('fx-dust-red-dense') ? 26 : 22, 'red');

    /* bụi vàng lơ lửng của cảnh ấm trong hồi tưởng */
    const warmDust = ov.querySelector('.fx-dust-warm');
    if (warmDust) spawnParticles(warmDust, 15, 'warm');
  } else {
    const ov = root.querySelector('.fx-overlay');
    if (ov) ov.innerHTML = '';
  }

  if (plan.special === 'typewriter') typewriter(body);
  if (plan.special === 'radio') radioBadge(body);
}

/* ---------- dọn sạch khi đổi lượt ---------- */

export function resetFx(root) {
  timers.forEach((id) => clearTimeout(id));
  timers.clear();

  /* Khôi phục dòng nhật ký nếu máy đánh chữ bị ngắt giữa chừng. */
  if (typingRestore) {
    typingRestore.el.textContent = typingRestore.full;
    typingRestore = null;
  }

  if (!root) return;
  root.classList.remove('fx-fast-text', 'fx-blackout');
  root.querySelectorAll('.story-stage').forEach((s) =>
    s.classList.remove(
      'fx-shake-wind', 'fx-shake-hard', 'fx-shake-fire',
      'fx-breath', 'fx-breath-hard'
    ));
  root.querySelectorAll('.story-art-slot').forEach((a) =>
    a.classList.remove(
      'fx-zoom-warm', 'fx-panup', 'fx-blur-bg', 'fx-tilt', 'fx-unblur',
      'fx-panx', 'fx-zoom-far'
    ));
  root.querySelectorAll('.story-body').forEach((b) =>
    b.classList.remove('fx-bounce-body', 'fx-jitter', 'fx-radio'));

  const ov = root.querySelector('.fx-overlay');
  if (ov) ov.innerHTML = '';
}
