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

/* ---------- bảng hiệu ứng theo số lượt (đếm từ 0) ---------- */

/* class gắn trên: root = .story-screen, stage = .story-stage,
   art = .story-art-slot, body = .story-body, overlay = lớp phủ,
   special = phần xử lý riêng bằng JS.

   Khoá là chỉ số mảng STORY, khớp thuộc tính data-beat mà story.js
   ghi ra DOM. Kịch bản đang có 40 lượt, thêm bớt lượt thì phải dời
   các khoá này theo, nên mỗi dòng ghi kèm nội dung để dò lại. */
const BEAT_FX = {
  /* cảnh ấm: nhà trên Trái Đất */
  4:  { body: ['fx-bounce-body'] },        /* Linh: thùng dán nhãn Cấm mở */
  11: { overlay: ['fx-vignette-warm'] },   /* tựa lưng tới 3 giờ sáng */

  /* bệ phóng */
  12: { special: 'typewriter' },           /* log T−6 giờ */
  13: { art: ['fx-panup'] },               /* đứng dưới chân tầng đẩy */
  15: { overlay: ['fx-flash-white'] },     /* Johanssen chụp ảnh */

  /* mặt sao Hỏa, hoang vắng */
  17: { overlay: ['fx-dust-red'] },
  18: { overlay: ['fx-dust-red'], body: ['fx-radio'], special: 'radio' },

  /* bão cát ập tới */
  19: { overlay: ['fx-dust-red', 'fx-border-red'] },  /* log cảnh báo bão */
  20: { overlay: ['fx-dust-red-dense', 'fx-dust-haze'] },
  21: { stage: ['fx-shake-wind'], root: ['fx-fast-text'], overlay: ['fx-dust-red'] },
  22: { stage: ['fx-shake-wind'], root: ['fx-fast-text'], overlay: ['fx-dust-red'] },
  23: { stage: ['fx-shake-wind'], root: ['fx-fast-text'], overlay: ['fx-dust-red'] },
  24: { art: ['fx-blur-bg'] },             /* bảng nhập tên */

  /* cao trào: ăng-ten đập vào lưng, tụt áp */
  25: { stage: ['fx-shake-hard'], overlay: ['fx-flash-impact', 'fx-flash-red'] },
  26: { overlay: ['fx-vignette-red'] },
  28: { art: ['fx-tilt'] },                /* tàu nghiêng 11,4 độ */
  30: { body: ['fx-jitter'] },             /* Martinez gắt */

  /* rời đi */
  32: { stage: ['fx-shake-fire'], overlay: ['fx-fire'] },  /* đốt tầng một */
  33: { overlay: ['fx-flood'] },

  /* thức giấc */
  35: { root: ['fx-blackout'] },           /* log Sol 7 */
  36: { overlay: ['fx-eyelids'], art: ['fx-unblur'] },     /* mở mắt */
  37: { art: ['fx-panx'] },                /* dãy giá treo đồ */
};

/* Lượt 16 tới 18: bụi đỏ trôi ngang suốt cảnh mặt sao Hỏa, kể cả dòng
   log nằm giữa. Khai báo riêng thay vì thêm từng khoá, để bảng bên
   trên vẫn chỉ chứa những lượt có hiệu ứng đặc thù. */
const RED_DUST_BEATS = new Set([16, 17, 18]);

/* Lượt 0 tới 11: cảnh ấm áp, zoom chậm và hạt bụi vàng. */
function isWarmScene(index) { return index >= 0 && index <= 11; }

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

export function applyBeatFx({ beatIndex, beatType, artKey, root, body, stage, fxOverlay }) {
  lastRoot = root;
  if (!root || !body || !stage) return;
  lastArgs = { beatIndex, beatType, artKey, root, body, stage, fxOverlay };
  if (!motionAllowed()) return;

  const art = root.querySelector('.story-art-slot');
  const plan = BEAT_FX[beatIndex] || {};

  const add = (elm, classes) => {
    if (!elm || !classes) return;
    classes.forEach((c) => elm.classList.add(c));
  };
  add(root, plan.root);
  add(stage, plan.stage);
  add(art, plan.art);
  add(body, plan.body);

  /* Lớp phủ toàn màn: một thẻ chứa, mỗi hiệu ứng là một lớp con. */
  const hasOverlay = plan.overlay || isWarmScene(beatIndex) || RED_DUST_BEATS.has(beatIndex);
  if (hasOverlay) {
    const ov = fxOverlay || root.querySelector('.fx-overlay') || document.createElement('div');
    if (!ov.isConnected) {
      ov.className = 'fx-overlay';
      ov.setAttribute('aria-hidden', 'true');
      root.appendChild(ov);
    }
    /* Vẽ lại cùng một lượt (nhập tên, đổi ngôn ngữ) thì dựng lại lớp
       phủ từ đầu, tránh chồng hai lớp giống nhau. */
    ov.innerHTML = '';
    (plan.overlay || []).forEach((c) => {
      const layer = document.createElement('div');
      layer.className = 'fx-layer ' + c;
      ov.appendChild(layer);
    });

    /* bụi đỏ trôi ngang suốt cảnh mặt sao Hỏa */
    if (RED_DUST_BEATS.has(beatIndex) && !ov.querySelector('.fx-dust-red')) {
      const dust = document.createElement('div');
      dust.className = 'fx-layer fx-dust-red';
      ov.appendChild(dust);
    }

    /* cảnh ấm: zoom cực chậm trên khung tranh và bụi vàng lơ lửng */
    if (isWarmScene(beatIndex)) {
      add(art, ['fx-zoom-warm']);
      const dust = document.createElement('div');
      dust.className = 'fx-layer fx-dust-warm';
      ov.appendChild(dust);
      spawnParticles(dust, 15, 'warm');
    }

    /* bụi đỏ bay ngang theo gió */
    const redDust = ov.querySelector('.fx-dust-red, .fx-dust-red-dense');
    if (redDust) spawnParticles(redDust, redDust.classList.contains('fx-dust-red-dense') ? 26 : 22, 'red');
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
    s.classList.remove('fx-shake-wind', 'fx-shake-hard', 'fx-shake-fire'));
  root.querySelectorAll('.story-art-slot').forEach((a) =>
    a.classList.remove('fx-zoom-warm', 'fx-panup', 'fx-blur-bg', 'fx-tilt', 'fx-unblur', 'fx-panx'));
  root.querySelectorAll('.story-body').forEach((b) =>
    b.classList.remove('fx-bounce-body', 'fx-jitter', 'fx-radio'));

  const ov = root.querySelector('.fx-overlay');
  if (ov) ov.innerHTML = '';
}
