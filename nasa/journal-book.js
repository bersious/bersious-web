/* ============================================================
   journal-book.js
   Quyển sổ nhật ký lật trang, mở từ widget nhật ký HUD.

   >>> CÁCH NỐI (đọc dòng này là đủ) <<<
   Chỉ cần thêm thuộc tính data-open-journal vào bất kỳ phần tử nào
   (ví dụ nút tiêu đề widget nhật ký trong hud-compact), rồi gọi một
   lần sau khi HUD dựng xong:

     import { bindJournalTriggers, openJournalBook } from './journal-book.js';
     import { JOURNAL_DAYS } from './journal-entries.js';

     bindJournalTriggers({
       root: document.body,
       onOpen: () => openJournalBook({
         container: document.body,
         playerName: 'Watney',
         days: JOURNAL_DAYS,
         startDay: clock.state().day,
       }),
     });

   Mọi click trên phần tử có [data-open-journal] (kể cả phần tử con)
   sẽ gọi onOpen(). File này không sửa hud-compact.js, base.js hay
   i18n.js, nên không cần thêm khoá dịch ở đâu cả.

   API: openJournalBook({ container, playerName, days, startDay, onClose })
        trả về { root, close, gotoDay, destroy }.
   ============================================================ */

import { getLang, onLangChange } from './i18n.js';

const BASE = new URL('.', import.meta.url).href;

/* Nhãn giao diện, hai ngôn ngữ. Để ở đây chứ không thêm vào i18n.js
   vì quy tắc của đợt này là không sửa file đó. */
const LABELS = {
  close: { vi: 'Đóng sổ', en: 'Close the book' },
  prev: { vi: 'Trang trước', en: 'Previous page' },
  next: { vi: 'Trang sau', en: 'Next page' },
  empty: { vi: 'Ngày này chưa viết gì', en: 'Nothing written for this day' },
  week: { vi: 'Tuần', en: 'Week' },
  day: { vi: 'Ngày', en: 'Day' },
  dialog: { vi: 'Nhật ký sứ mệnh', en: 'Mission journal' },
  jump: { vi: 'Nhảy tới một ngày', en: 'Jump to a day' },
  mood: {
    calm: { vi: 'bình tĩnh', en: 'calm' },
    tired: { vi: 'mệt', en: 'tired' },
    scared: { vi: 'hoảng', en: 'scared' },
    hopeful: { vi: 'hy vọng', en: 'hopeful' },
    bitter: { vi: 'cay đắng', en: 'bitter' },
    numb: { vi: 'trống rỗng', en: 'numb' },
  },
};

const FLIP_MS = 520;

/* ---------- tiện ích ---------- */

function pad2(n) {
  return String(n).padStart(2, '0');
}

function label(key, lang) {
  const row = LABELS[key];
  return row ? (row[lang] ?? row.vi) : key;
}

/* Giả ngẫu nhiên có hạt giống: cùng một ngày luôn ra cùng vị trí vết
   ố, nên mở sổ lại không thấy trang nhảy chỗ. */
function seeded(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* Tôn trọng cả html.motion-off lẫn prefers-reduced-motion. */
function motionOn() {
  try {
    if (document.documentElement.classList.contains('motion-off')) return false;
  } catch { /* bỏ qua */ }
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch { /* bỏ qua */ }
  return true;
}

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css/journal-book.css';
  document.head.appendChild(link);
}

const ICONS = {
  prev: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  pen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m14.5 4.5 5 5L8 21H3v-5z"/><path d="m12.5 6.5 5 5"/></svg>`,
};

/* ============================================================
   openJournalBook
   ============================================================ */

export function openJournalBook({
  container,
  playerName = '',
  days = [],
  startDay = 1,
  onClose,
} = {}) {
  injectCss();

  const host = container || document.body;
  const byDay = new Map();
  for (const d of days) {
    if (d && Number.isFinite(d.day)) byDay.set(Math.round(d.day), d);
  }
  const maxDay = byDay.size ? Math.max(...byDay.keys()) : 1;

  let lang = getLang();
  /* current là ngày ở TRANG TRÁI, trang phải là current + 1, đúng như
     sách thật: lật một tờ thì tờ vừa lật thành trang trái của lượt sau. */
  let current = Math.min(Math.max(1, Math.round(startDay) || 1), maxDay);
  let flipping = false;
  let flipTimer = 0;
  let closed = false;

  const root = document.createElement('div');
  root.className = 'jb-root';
  if (!motionOn()) root.classList.add('is-static');

  root.innerHTML = `
    <div class="jb-veil" data-jb-veil></div>
    <div class="jb-stage" role="dialog" aria-modal="true" aria-label="">
      <div class="jb-bookw">
        <button type="button" class="jb-close" data-jb-close aria-label="">
          <span aria-hidden="true">${ICONS.close}</span>
        </button>
        <div class="jb-book">
          <div class="jb-stack" aria-hidden="true"></div>
          <div class="jb-spread">
            <div class="jb-page jb-page-l" data-jb-page="l"></div>
            <div class="jb-page jb-page-r" data-jb-page="r"></div>
            <div class="jb-spine" aria-hidden="true"></div>
            <div class="jb-leaf" data-jb-leaf aria-hidden="true">
              <div class="jb-face jb-face-front" data-jb-leaf-front></div>
              <div class="jb-face jb-face-back"></div>
            </div>
          </div>
        </div>
        <button type="button" class="jb-nav jb-prev" data-jb-prev aria-label="">
          <span aria-hidden="true">${ICONS.prev}</span>
        </button>
        <button type="button" class="jb-nav jb-next" data-jb-next aria-label="">
          <span aria-hidden="true">${ICONS.next}</span>
        </button>
      </div>
      <div class="jb-index" data-jb-index role="group" aria-label=""></div>
      <p class="jb-sr" data-jb-status role="status" aria-live="polite"></p>
    </div>
  `;
  host.appendChild(root);

  const q = (sel) => root.querySelector(sel);
  const pageL = q('[data-jb-page="l"]');
  const pageR = q('[data-jb-page="r"]');
  const leaf = q('[data-jb-leaf]');
  const leafFront = q('[data-jb-leaf-front]');
  const prevBtn = q('[data-jb-prev]');
  const nextBtn = q('[data-jb-next]');
  const closeBtn = q('[data-jb-close]');
  const indexEl = q('[data-jb-index]');
  const stageEl = q('.jb-stage');
  const statusEl = q('[data-jb-status]');

  const dots = [];
  const lastFocus = document.activeElement;

  /* ---------- vẽ một trang ---------- */

  /* Vết ố nước hoặc vết cà phê: vị trí giả ngẫu nhiên theo số ngày,
     có trang sạch, có trang hai vệt, mở lại không nhảy chỗ. */
  function paintStains(pageEl, day, side) {
    const rand = seeded(day * 7 + (side === 'r' ? 3 : 1));
    const roll = rand();
    const count = roll > .46 ? 2 : (roll > .16 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'jb-stain';
      s.style.setProperty('--jb-stain-w', (70 + Math.round(rand() * 130)) + 'px');
      s.style.setProperty('--jb-stain-x', (4 + rand() * 72).toFixed(1) + '%');
      s.style.setProperty('--jb-stain-y', (6 + rand() * 70).toFixed(1) + '%');
      s.style.setProperty('--jb-stain-o', (.28 + rand() * .38).toFixed(2));
      pageEl.appendChild(s);
    }
  }

  function renderSheet(sheet, day) {
    const entry = byDay.get(day);
    sheet.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'jb-pagehead';
    const dayEl = document.createElement('span');
    dayEl.className = 'jb-pagehead-day';
    dayEl.textContent = (lang === 'en' ? 'DAY ' : 'NGÀY ') + pad2(day);
    head.appendChild(dayEl);
    if (entry && entry.mood && LABELS.mood[entry.mood]) {
      const moodEl = document.createElement('span');
      moodEl.className = 'jb-pagehead-mood';
      /* Bảng mood lồng một cấp: LABELS.mood.calm = { vi, en }.
         label('mood.calm') lại tra LABELS['mood.calm'] nên ra undefined
         và in nguyên chuỗi "mood.calm" lên đầu trang. Lấy thẳng hàng đã
         kiểm ở điều kiện trên. */
      const moodRow = LABELS.mood[entry.mood];
      moodEl.textContent = moodRow[lang] ?? moodRow.vi;
      head.appendChild(moodEl);
    }
    sheet.appendChild(head);

    const lines = document.createElement('div');
    lines.className = 'jb-lines';
    lines.setAttribute('aria-hidden', 'true');
    sheet.appendChild(lines);

    if (entry && (entry.vi || entry.en)) {
      const body = document.createElement('div');
      body.className = 'jb-body';
      const text = document.createElement('div');
      text.className = 'jb-text';
      const p = document.createElement('p');
      p.textContent = (lang === 'en' ? entry.en : entry.vi) || entry.vi || entry.en || '';
      text.appendChild(p);
      body.appendChild(text);
      sheet.appendChild(body);

      const sig = document.createElement('div');
      sig.className = 'jb-sig';
      sig.textContent = (playerName ? playerName + ', ' : '') + 'sol ' + pad2(day);
      sheet.appendChild(sig);
    } else {
      const empty = document.createElement('div');
      empty.className = 'jb-empty';
      empty.innerHTML = `
        <span class="jb-empty-ico" aria-hidden="true">${ICONS.pen}</span>
        <span class="jb-empty-txt"></span>
      `;
      empty.querySelector('.jb-empty-txt').textContent = label('empty', lang);
      sheet.appendChild(empty);
    }
  }

  function renderPage(pageEl, day, side) {
    pageEl.innerHTML = '';
    const entry = byDay.get(day);
    pageEl.dataset.mood = entry && entry.mood ? entry.mood : 'blank';
    /* vết ố nằm dưới tấm giấy chữ, thêm trước */
    paintStains(pageEl, day, side);
    const sheet = document.createElement('div');
    sheet.className = 'jb-sheet';
    pageEl.appendChild(sheet);
    renderSheet(sheet, day);
  }

  function paint() {
    renderPage(pageL, current, 'l');
    renderPage(pageR, current + 1, 'r');
    prevBtn.disabled = current <= 1;
    nextBtn.disabled = current >= maxDay;
    for (const d of dots) {
      d.classList.toggle('is-on', Number(d.dataset.day) === current);
    }
    statusEl.textContent = (lang === 'en' ? 'Day ' : 'Ngày ') + current
      + (current + 1 <= maxDay ? ' / ' + (current + 1) : '');
  }

  /* ---------- lật trang ----------
     Sách thật: lật tờ bên phải sang trái, tờ đó thành trang trái của
     lượt sau, trang phải mới lộ ra bên dưới. Đi lùi thì ngược lại.
     Trong lúc bay, mặt trước lá là trang vừa rời, mặt sau là giấy đậm
     không chữ. Hết 520ms mới vẽ nội dung mới lên hai trang tĩnh. */

  function flip(dir) {
    if (flipping) return;

    if (!motionOn()) {
      current += dir === 'next' ? 1 : -1;
      paint();
      return;
    }

    flipping = true;

    /* mặt trước của lá: đúng trang đang rời đi */
    leafFront.innerHTML = '';
    leafFront.dataset.mood =
      (byDay.get(dir === 'next' ? current + 1 : current) || {}).mood || 'blank';
    const sheet = document.createElement('div');
    sheet.className = 'jb-sheet';
    leafFront.appendChild(sheet);
    renderSheet(sheet, dir === 'next' ? current + 1 : current);

    if (dir === 'next') {
      /* lá nằm nửa phải, bản lề ở gáy; trang phải mới lộ ra từ dưới */
      leaf.dataset.dir = 'next';
      renderPage(pageR, current + 2, 'r');
    } else {
      leaf.dataset.dir = 'prev';
      renderPage(pageL, current - 1, 'l');
    }

    leaf.classList.add('is-on');
    void leaf.offsetWidth; /* ép layout để transition bắt được */
    leaf.classList.add('is-run');

    window.clearTimeout(flipTimer);
    flipTimer = window.setTimeout(() => {
      leaf.classList.remove('is-run', 'is-on');
      current += dir === 'next' ? 1 : -1;
      flipping = false;
      paint();
    }, FLIP_MS);
  }

  function gotoDay(day) {
    if (flipping) return;
    const target = Math.min(Math.max(1, Math.round(day) || 1), maxDay);
    const delta = target - current;
    if (delta === 0) return;
    if (Math.abs(delta) === 1) {
      flip(delta > 0 ? 'next' : 'prev');
      return;
    }
    current = target;
    paint();
  }

  /* ---------- thanh chọn ngày ---------- */

  function buildIndex() {
    indexEl.innerHTML = '';
    dots.length = 0;
    const perWeek = 7;
    for (let w = 0; w * perWeek < maxDay; w++) {
      const week = document.createElement('div');
      week.className = 'jb-week';
      const k = document.createElement('span');
      k.className = 'jb-week-k';
      k.textContent = label('week', lang) + ' ' + (w + 1);
      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'jb-week-dots';
      week.append(k, dotsWrap);

      const from = w * perWeek + 1;
      const to = Math.min(maxDay, from + perWeek - 1);
      for (let d = from; d <= to; d++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'jb-dot';
        dot.dataset.day = String(d);
        dot.dataset.empty = byDay.has(d) ? 'false' : 'true';
        dot.setAttribute('aria-label', label('day', lang) + ' ' + d);
        dot.addEventListener('click', () => gotoDay(d));
        dotsWrap.appendChild(dot);
        dots.push(dot);
      }
      indexEl.appendChild(week);
    }
  }

  /* ---------- đóng ---------- */

  function close() {
    if (closed) return;
    closed = true;
    window.clearTimeout(flipTimer);
    document.removeEventListener('keydown', onKeydown, true);
    langOff();
    const done = () => {
      root.remove();
      if (lastFocus && typeof lastFocus.focus === 'function'
        && document.contains(lastFocus)) {
        lastFocus.focus({ preventScroll: true });
      }
      if (typeof onClose === 'function') {
        try { onClose(); } catch (err) { console.error('onClose lỗi', err); }
      }
    };
    if (motionOn()) {
      root.classList.add('is-closing');
      window.setTimeout(done, 200);
    } else {
      done();
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      gotoDay(current - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      gotoDay(current + 1);
    }
  }

  /* ---------- sự kiện ---------- */

  prevBtn.addEventListener('click', () => gotoDay(current - 1));
  nextBtn.addEventListener('click', () => gotoDay(current + 1));
  closeBtn.addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('[data-jb-veil]')) close();
  });

  /* ---------- ngôn ngữ ---------- */

  function applyLang() {
    stageEl.setAttribute('aria-label', label('dialog', lang));
    indexEl.setAttribute('aria-label', label('jump', lang));
    closeBtn.setAttribute('aria-label', label('close', lang));
    closeBtn.title = label('close', lang);
    prevBtn.setAttribute('aria-label', label('prev', lang));
    prevBtn.title = label('prev', lang);
    nextBtn.setAttribute('aria-label', label('next', lang));
    nextBtn.title = label('next', lang);
    buildIndex();
    paint();
  }

  const langOff = onLangChange((next) => {
    lang = next;
    applyLang();
  });

  /* ---------- khởi động ---------- */

  applyLang();
  document.addEventListener('keydown', onKeydown, true);
  window.setTimeout(() => {
    if (!closed && typeof closeBtn.focus === 'function') {
      closeBtn.focus({ preventScroll: true });
    }
  }, 30);

  return {
    root,
    close,
    gotoDay,
    destroy() {
      closed = true;
      window.clearTimeout(flipTimer);
      document.removeEventListener('keydown', onKeydown, true);
      langOff();
      root.remove();
    },
  };
}

/* ============================================================
   bindJournalTriggers
   Gọi một lần sau khi HUD dựng xong. Mọi click trên phần tử có
   [data-open-journal], kể cả phần tử con, sẽ gọi onOpen().
   Trả về hàm gỡ listener.
   ============================================================ */

export function bindJournalTriggers({ root, onOpen } = {}) {
  const host = root || document;
  const handler = (e) => {
    const tgt = e.target instanceof Element
      ? e.target.closest('[data-open-journal]')
      : null;
    if (!tgt) return;
    e.preventDefault();
    if (typeof onOpen === 'function') {
      try { onOpen(tgt); } catch (err) { console.error('journal onOpen lỗi', err); }
    }
  };
  host.addEventListener('click', handler);
  return () => host.removeEventListener('click', handler);
}
