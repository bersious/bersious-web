/* ============================================================
   phase2/feature-act-intro.js
   Màn mở đầu Hồi 1 cho Giai đoạn 2: thẻ tiêu đề hồi và thẻ
   giao nhiệm vụ.

   Hai màn nối tiếp trong cùng một lớp phủ:
     Màn 1: HỒI 1 / CHIẾN DỊCH GIẢI CỨU, tự chuyển sau 2,4 giây
            hoặc khi người chơi bấm chuột, Space, Enter.
     Màn 2: Hồ sơ sứ mệnh NASA, chờ người chơi bấm
            BẮT ĐẦU THIẾT KẾ thì gọi onDone().

   Mọi chuỗi giữ song ngữ VI + EN ngay trong file này, không đụng
   src/i18n.js. Màu đọc từ tokens.css qua biến CSS.
   ============================================================ */

import { getLang, onLangChange } from '../i18n.js';

/* Đường dẫn tuyệt đối tính từ chính file này. */
const BASE = new URL('.', import.meta.url).href;

/* ============================================================
   CHUỖI SONG NGỮ
   ============================================================ */

const STR = {
  vi: {
    'act.title': 'HỒI 1',
    'act.sub': 'CHIẾN DỊCH GIẢI CỨU',
    'act.continue': 'Bấm để tiếp tục',

    'brief.kicker': 'HỒ SƠ SỨ MỆNH',
    'brief.title': 'YOUR MISSION',
    'brief.stamp': 'ARES III · RESCUE',
    'brief.body': 'Một đồng đội của chúng ta đang mắc kẹt một mình trên Sao Hỏa. Nhiệm vụ của bạn là thiết kế con tàu giải cứu tối ưu nhất, cân bằng giữa tải trọng, nhiên liệu, lương thực và quỹ đạo để đưa ba phi hành gia tới nơi và đón cậu ấy trở về an toàn.',
    'brief.stat1.label': 'Đồng đội còn sống được',
    'brief.stat1.unit': 'sol',
    'brief.stat2.label': 'Phi hành gia cứu hộ',
    'brief.stat2.unit': 'người',
    'brief.stat3.label': 'Khoảng cách tới Sao Hỏa',
    'brief.stat3.unit': 'triệu km',
    'brief.start': 'BẮT ĐẦU THIẾT KẾ',
  },
  en: {
    'act.title': 'ACT 1',
    'act.sub': 'THE RESCUE MISSION',
    'act.continue': 'Click to continue',

    'brief.kicker': 'MISSION BRIEF',
    'brief.title': 'YOUR MISSION',
    'brief.stamp': 'ARES III · RESCUE',
    'brief.body': 'One of our crewmates is stranded alone on Mars. Your mission is to design the best possible rescue ship, balancing payload, propellant, supplies and orbit to carry three astronauts there and bring him safely home.',
    'brief.stat1.label': 'Crewmate survival',
    'brief.stat1.unit': 'sols',
    'brief.stat2.label': 'Rescue crew',
    'brief.stat2.unit': 'astronauts',
    'brief.stat3.label': 'Distance to Mars',
    'brief.stat3.unit': 'million km',
    'brief.start': 'START DESIGN',
  },
};

function t(key) {
  const lang = getLang() === 'en' ? 'en' : 'vi';
  const table = STR[lang] || STR.vi;
  return table[key] !== undefined ? table[key] : (STR.vi[key] || key);
}

/* Số kiểu Việt: 225,4. Số kiểu Anh: 225.4. */
function fmtSo(v, digits) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  const d = digits === undefined ? 0 : digits;
  let s = n.toFixed(d);
  if (getLang() !== 'en') s = s.replace('.', ',');
  return s;
}

/* ============================================================
   CSS
   ============================================================ */

function injectCss() {
  if (document.querySelector('link[data-phase2-act-intro]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('css-act-intro.css', BASE).href;
  link.dataset.phase2ActIntro = '1';
  document.head.appendChild(link);
}

/* ============================================================
   TIỆN ÍCH
   ============================================================ */

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/* Chế độ giảm chuyển động: hệ điều hành hoặc công tắc của game. */
function motionOff() {
  const root = document.documentElement;
  if (root.classList.contains('motion-off')) return true;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

/* Đọc số từ engine. Engine chưa sẵn sàng hoặc getState() lỗi thì
   dùng số mặc định, không bao giờ văng lỗi ra màn hình. */
function readEngineNumbers(engine) {
  const out = {
    solsRemaining: 300,
    rescueCrew: 3,
    distanceMkm: 225,
  };
  if (!engine || typeof engine.getState !== 'function') return out;
  try {
    const st = engine.getState();
    if (st && typeof st === 'object') {
      if (Number.isFinite(st.solsRemaining)) out.solsRemaining = st.solsRemaining;
      if (Number.isFinite(st.crewOnMars) && st.crewOnMars > 0) {
        /* Số người cần cứu: đồng đội trên Sao Hỏa cộng hai người còn
           lại của đội ba người. Engine chỉ cho biết một người, phần
           còn lại là hằng số kịch bản. */
        out.rescueCrew = 3;
      }
      const dist = st.distanceKm !== undefined ? st.distanceKm
        : (st.totals && st.totals.distanceKm !== undefined ? st.totals.distanceKm : undefined);
      if (Number.isFinite(dist) && dist > 0) out.distanceMkm = Math.round((dist / 1e6) * 10) / 10;
    }
  } catch (e) {
    /* engine chưa sẵn sàng, giữ số mặc định */
  }
  return out;
}

/* ============================================================
   MOUNT
   ============================================================ */

export function mountActIntro(options) {
  const opts = options || {};
  const container = opts.container || document.body;
  const engine = opts.engine || (typeof window !== 'undefined' ? window.phase2Engine : null);
  const onDone = typeof opts.onDone === 'function' ? opts.onDone : function noop() {};

  injectCss();

  const numbers = readEngineNumbers(engine);

  /* ---------- lớp phủ ---------- */

  const root = el('div', 'act-intro');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', t('act.title') + ' ' + t('act.sub'));

  /* ---------- màn 1: thẻ tiêu đề hồi ---------- */

  const screenTitle = el('div', 'act-intro-screen act-intro-screen-title');

  const band = el('div', 'act-intro-band');
  band.setAttribute('aria-hidden', 'true');

  const titleBox = el('div', 'act-intro-titlebox');
  const actTitle = el('h1', 'act-intro-act', t('act.title'));
  const actSub = el('p', 'act-intro-sub', t('act.sub'));
  titleBox.appendChild(actTitle);
  titleBox.appendChild(actSub);

  const hint = el('p', 'act-intro-hint', t('act.continue'));

  screenTitle.appendChild(band);
  screenTitle.appendChild(titleBox);
  screenTitle.appendChild(hint);

  /* ---------- màn 2: hồ sơ sứ mệnh ---------- */

  const screenBrief = el('div', 'act-intro-screen act-intro-screen-brief');
  screenBrief.hidden = true;

  const card = el('section', 'act-intro-card');
  card.setAttribute('aria-label', t('brief.title'));
  card.tabIndex = -1;
  card.classList.add('is-pre');

  /* Hàng đầu: nhãn hồ sơ bên trái, ô đóng dấu bên phải, cùng
     một trục chân chữ để không thành hai món đồ rời. */
  const head = el('div', 'act-intro-head');
  const kicker = el('p', 'act-intro-kicker', t('brief.kicker'));
  const stamp = el('span', 'act-intro-stamp', t('brief.stamp'));
  stamp.setAttribute('aria-hidden', 'true');
  head.appendChild(kicker);
  head.appendChild(stamp);

  const briefTitle = el('h2', 'act-intro-brief-title', t('brief.title'));
  const body = el('p', 'act-intro-body', t('brief.body'));

  const stats = el('ul', 'act-intro-stats');
  /* Giữ số thô, định dạng lúc vẽ, để đổi ngôn ngữ thì dấu thập phân
     cũng đổi theo (VI dùng phẩy, EN dùng chấm). */
  const statDefs = [
    { key: 'brief.stat1.label', unit: 'brief.stat1.unit', raw: numbers.solsRemaining, digits: 0 },
    { key: 'brief.stat2.label', unit: 'brief.stat2.unit', raw: numbers.rescueCrew, digits: 0 },
    { key: 'brief.stat3.label', unit: 'brief.stat3.unit', raw: numbers.distanceMkm, digits: 1 },
  ];
  statDefs.forEach((s) => {
    const li = el('li', 'act-intro-stat');
    const label = el('span', 'act-intro-stat-label');
    const value = el('strong', 'act-intro-stat-value');
    li.appendChild(label);
    li.appendChild(value);
    stats.appendChild(li);
  });

  const startBtn = el('button', 'act-intro-start');
  startBtn.type = 'button';
  startBtn.textContent = t('brief.start');

  card.appendChild(head);
  card.appendChild(briefTitle);
  card.appendChild(body);
  card.appendChild(stats);
  card.appendChild(startBtn);

  screenBrief.appendChild(card);

  root.appendChild(screenTitle);
  root.appendChild(screenBrief);
  container.appendChild(root);

  /* ---------- luồng màn ---------- */

  let phase = 'title';
  let destroyed = false;
  let autoTimer = 0;
  let subTimer = 0;
  let settleTimer = 0;
  let doneCalled = false;

  function clearAutoTimer() {
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = 0;
    }
    if (subTimer) {
      clearTimeout(subTimer);
      subTimer = 0;
    }
  }

  /* Chốt an toàn: sau một nhịp, tắt hẳn transition của lớp phủ và
     ép mọi thứ về trạng thái hiện rõ. Nếu trình duyệt không chạy
     được transition (tab ẩn, máy yếu, trình duyệt chặn hoạt ảnh)
     thì chữ và thẻ vẫn hiện, không bao giờ có màn hình trống. */
  function settle() {
    if (destroyed) return;
    actTitle.classList.remove('is-pre');
    actSub.classList.remove('is-pre');
    card.classList.remove('is-pre');
    root.classList.add('is-settled');
  }

  function goBrief() {
    if (destroyed || phase !== 'title') return;
    phase = 'brief';
    clearAutoTimer();
    screenTitle.hidden = true;
    screenBrief.hidden = false;
    /* Hiệu ứng vào của thẻ: chỉ khi chuyển động còn bật. Thẻ đang ở
       trạng thái is-pre (trượt xuống 20px, mờ). Gỡ lớp là transition
       đưa thẻ về vị trí thật. */
    if (motionOff()) card.classList.add('is-no-motion');
    requestAnimationFrame(() => {
      if (!destroyed) card.classList.remove('is-pre');
    });
    try { card.focus({ preventScroll: true }); } catch (e) { /* focus lỗi thì thôi */ }
  }

  function finish() {
    if (destroyed || doneCalled) return;
    doneCalled = true;
    clearAutoTimer();
    onDone();
  }

  /* ---------- sự kiện ---------- */

  function onPointerDown(ev) {
    if (phase !== 'title') return;
    ev.preventDefault();
    goBrief();
  }

  function onKeyDown(ev) {
    if (ev.key !== ' ' && ev.key !== 'Spacebar' && ev.key !== 'Enter') return;
    if (phase === 'title') {
      ev.preventDefault();
      goBrief();
      return;
    }
    /* Ở màn hồ sơ, Space hoặc Enter trên nút đã do nút tự lo. */
  }

  function onStartClick() {
    finish();
  }

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  startBtn.addEventListener('click', onStartClick);

  const unsubLang = onLangChange(() => {
    if (destroyed) return;
    repaintLang();
  });

  function repaintLang() {
    actTitle.textContent = t('act.title');
    actSub.textContent = t('act.sub');
    hint.textContent = t('act.continue');
    root.setAttribute('aria-label', t('act.title') + ' ' + t('act.sub'));

    stamp.textContent = t('brief.stamp');
    kicker.textContent = t('brief.kicker');
    briefTitle.textContent = t('brief.title');
    body.textContent = t('brief.body');
    startBtn.textContent = t('brief.start');

    statDefs.forEach((s, i) => {
      const li = stats.children[i];
      if (!li) return;
      li.querySelector('.act-intro-stat-label').textContent = t(s.key);
      li.querySelector('.act-intro-stat-value').textContent = fmtSo(s.raw, s.digits) + ' ' + t(s.unit);
    });
  }

  repaintLang();

  /* ---------- hẹn giờ tự chuyển màn 1 ---------- */

  const autoDelay = motionOff() ? 800 : 2400;
  autoTimer = setTimeout(goBrief, autoDelay);

  /* ---------- chữ tiêu đề vào bằng hiệu ứng ----------
     Dòng trên hiện trước, dòng dưới sau 200ms. Cả hai trượt lên 12px. */

  if (motionOff()) {
    actTitle.classList.remove('is-pre');
    actSub.classList.remove('is-pre');
  } else {
    actTitle.classList.add('is-pre');
    actSub.classList.add('is-pre');
    /* Một khung hình để trình duyệt nhận trạng thái ẩn trước khi gỡ,
       nếu không transition sẽ không chạy. */
    requestAnimationFrame(() => {
      if (destroyed) {
        actTitle.classList.remove('is-pre');
        actSub.classList.remove('is-pre');
        return;
      }
      actTitle.classList.remove('is-pre');
      subTimer = setTimeout(() => {
        actSub.classList.remove('is-pre');
      }, 200);
    });
  }

  /* Chốt an toàn sau 1,4 giây: mọi thứ phải hiện rõ dù máy có chạy
     transition hay không. */
  settleTimer = setTimeout(() => {
    settleTimer = 0;
    settle();
  }, 1400);

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    clearAutoTimer();
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = 0;
    }
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
    startBtn.removeEventListener('click', onStartClick);
    if (typeof unsubLang === 'function') unsubLang();
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  return { root: root, destroy: destroy };
}

export default mountActIntro;

if (typeof window !== 'undefined') {
  window.mountActIntro = mountActIntro;
}
