/* ============================================================
   memories.js
   Đoạn hồi tưởng gia đình, phát từ trong túi đồ của màn căn cứ.

   Vì sao tách khỏi story.js: màn mở đầu là nhịp điện ảnh, cắt nhanh,
   không có nút Bỏ qua vì mỗi khung chỉ vài giây. Hồi tưởng thì ngược
   lại: người chơi chủ động mở ra, nên phải có nút Bỏ qua, phải đọc
   được chữ, và phải khác tông bằng một lớp sepia nhẹ để không lẫn với
   màn chính.

   Dùng:
     const session = playMemory({ container, memoryId: 'family', onDone });
     session.destroy();   // dọn ngay, không gọi onDone

   Dữ liệu nằm ở data/memories.json, song ngữ bắt buộc cả vi và en.
   ============================================================ */

import { artFor } from './art.js';
import { t, getLang, onLangChange } from './i18n.js';
import { CREW } from './story-data.js';
import { playClick } from './audio.js';
import { playOneShotSfx } from './audio-sfx.js';
import { getSettings } from './settings.js';

const BASE_URL = new URL('.', import.meta.url).href;
const DATA_URL = BASE_URL + 'data/memories.json';

/* ---------- nạp CSS một lần ---------- */

function injectCss() {
  if (document.querySelector('link[data-memories-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/memories.css';
  link.dataset.memoriesCss = '1';
  document.head.appendChild(link);
}

/* ---------- tôn trọng cài đặt giảm chuyển động ---------- */

function motionOn() {
  if (getSettings().motion === false) return false;
  if (document.documentElement.classList.contains('motion-off')) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

/* ---------- nạp dữ liệu, nhớ lại giữa các lần mở ---------- */

let dataPromise = null;

function loadMemories() {
  if (!dataPromise) {
    dataPromise = fetch(DATA_URL, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .catch((err) => {
        /* Nạp hỏng thì trả null, phía dưới báo lỗi ra giao diện thay vì
           im lặng đóng. Người chơi mở ảnh mà không thấy gì sẽ tưởng
           nút hỏng. */
        console.error('memories.json nạp lỗi:', err);
        dataPromise = null;
        return null;
      });
  }
  return dataPromise;
}

/* ---------- chọn chuỗi theo ngôn ngữ ---------- */

function pick(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const lang = getLang();
  return value[lang] ?? value.vi ?? '';
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function fmt(text, playerName) {
  return esc(text)
    .replace(/\{name\}/g, `<span class="mem-name">${esc(playerName || 'bạn')}</span>`)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/* ============================================================ */

export function playMemory({ container, memoryId = 'family', onDone, playerName = '' } = {}) {
  injectCss();

  const host = container || document.body;
  let index = 0;
  let busy = false;
  let closed = false;
  let memory = null;
  let offLang = null;
  let timers = [];

  const el = document.createElement('div');
  el.className = 'mem-screen';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="mem-letterbox" aria-hidden="true"></div>
    <div class="mem-frame">
      <header class="mem-head">
        <div class="mem-head-text">
          <span class="mem-title"></span>
          <span class="mem-sub"></span>
        </div>
        <button type="button" class="mem-skip"></button>
      </header>

      <div class="mem-stage">
        <div class="mem-art"></div>
        <div class="mem-cap"></div>
      </div>

      <div class="mem-body" aria-live="polite" aria-atomic="true"></div>

      <footer class="mem-foot">
        <div class="mem-dots" aria-hidden="true"></div>
        <div class="mem-nav">
          <button type="button" class="mem-back"></button>
          <button type="button" class="mem-next"></button>
        </div>
      </footer>
    </div>`;

  host.appendChild(el);

  const titleEl  = el.querySelector('.mem-title');
  const subEl    = el.querySelector('.mem-sub');
  const skipBtn  = el.querySelector('.mem-skip');
  const artEl    = el.querySelector('.mem-art');
  const capEl    = el.querySelector('.mem-cap');
  const bodyEl   = el.querySelector('.mem-body');
  const dotsEl   = el.querySelector('.mem-dots');
  const nextBtn  = el.querySelector('.mem-next');
  const backBtn  = el.querySelector('.mem-back');

  if (!motionOn()) el.classList.add('is-static');

  /* ---------- dựng và vẽ ---------- */

  function drawDots() {
    if (!memory) return;
    dotsEl.innerHTML = '';
    memory.beats.forEach((_, n) => {
      const d = document.createElement('span');
      d.className = 'mem-dot' + (n === index ? ' is-on' : '') + (n < index ? ' is-past' : '');
      dotsEl.appendChild(d);
    });
  }

  function drawBeat() {
    if (!memory) return;
    const beat = memory.beats[index];
    if (!beat) return;

    el.dataset.beat = String(index);
    /* Nút quay lại trước đây không được gán chữ hay icon nào, nên nó là
       một ô trống 96x34 cạnh nút TIẾP. Người chơi không biết đó là nút
       gì. Nay gán chữ từ i18n, và aria-label cũng theo ngôn ngữ hiện
       hành thay vì hardcode tiếng Anh. */
    backBtn.textContent = t('mem.back');
    backBtn.setAttribute('aria-label', t('mem.back'));
    backBtn.disabled = index === 0;

    const last = index === memory.beats.length - 1;
    nextBtn.textContent = last ? pick(memory.close) : pick(memory.next);

    capEl.textContent = pick(beat.caption);
    capEl.hidden = !beat.caption;

    /* ảnh: dùng lại khe ảnh của art.js, chỉ khác là khung riêng */
    const key = beat.art;
    if (key && artEl.dataset.key !== key) {
      artEl.dataset.key = key;
      artEl.innerHTML = artFor(key);

      /* artFor trả ảnh kèm data-fallbacks, nhưng chỉ story.js gắn
         listener lỗi để đổi đuôi. Thiếu listener thì khi người vẽ thay
         tranh bằng jpg thay vì webp, khung hồi tưởng sẽ đen. Gắn ở đây
         để hành vi giống story.js. */
      const artImg = artEl.querySelector('img[data-fallbacks]');
      if (artImg) {
        artImg.addEventListener('error', function tryNext() {
          const chain = (artImg.dataset.fallbacks || '').split(';').filter(Boolean);
          if (!chain.length) {
            artImg.removeEventListener('error', tryNext);
            return;
          }
          const next = BASE_URL + chain.shift();
          artImg.dataset.fallbacks = chain.join(';');
          artImg.src = next;
        });
      }
      el.dataset.art = key;
    }

    let html = '';
    if (beat.type === 'dialogue') {
      const who = CREW.find((c) => c.id === beat.who);
      html += `
        <div class="mem-speaker" style="color:${who?.color || 'currentColor'}">
          <span class="mem-dot-sep"></span>
          <span>${esc(who?.name || '')}</span>
          <span class="mem-role">${esc(pick(who?.role) || '')}</span>
        </div>`;
    }
    html += `<p class="mem-line">${fmt(pick(beat.text), playerName)}</p>`;
    bodyEl.innerHTML = html;

    /* vẽ lại cùng lượt (đổi ngôn ngữ) thì dựng lại hiệu ứng từ đầu */
    el.classList.remove('is-enter');
    if (motionOn()) {
      // ép trình duyệt tính lại để animation chạy lại
      void el.offsetWidth;
      el.classList.add('is-enter');
    }
    drawDots();
  }

  /* ---------- điều hướng ---------- */

  function step(dir) {
    if (busy || closed || !memory) return;
    const target = index + dir;
    if (target < 0) return;

    if (target >= memory.beats.length) { finish(); return; }

    busy = true;
    const swap = () => {
      index = target;
      drawBeat();
      playClick();
      timers.push(setTimeout(() => { busy = false; }, 120));
    };

    if (motionOn()) {
      el.classList.add('is-leaving');
      timers.push(setTimeout(() => {
        el.classList.remove('is-leaving');
        swap();
      }, 160));
    } else {
      swap();
    }
  }

  function finish() {
    if (closed) return;
    closed = true;
    offLang?.();
    timers.forEach(clearTimeout);
    timers = [];
    el.classList.remove('is-enter');
    el.classList.add('is-out');
    const done = () => {
      el.remove();
      onDone?.();
    };
    if (motionOn()) timers.push(setTimeout(done, 260));
    else done();
  }

  /* ---------- sự kiện ---------- */

  skipBtn.addEventListener('click', (e) => { e.stopPropagation(); finish(); });
  nextBtn.addEventListener('click', () => step(1));
  backBtn.addEventListener('click', () => step(-1));

  /* Bấm ra ngoài khung thì đóng. Dùng sự kiện trên chính lớp nền, không
     dùng click trên document, để cú bấm vào nút không bị tính hai lần. */
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.classList.contains('mem-letterbox')) finish();
  });

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); finish(); return; }
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  }
  document.addEventListener('keydown', onKey);

  offLang = onLangChange(() => { if (!closed && !busy) drawBeat(); });

  /* ---------- khởi động ---------- */

  let session = {
    destroy() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      offLang?.();
      timers.forEach(clearTimeout);
      timers = [];
      el.remove();
    },
    get index() { return index; },
  };

  loadMemories().then((all) => {
    if (closed) return;
    memory = all?.[memoryId] || null;

    if (!memory) {
      /* Không có dữ liệu thì báo rõ ràng ngay trong khung, không đóng im. */
      titleEl.textContent = t('mem.error.title');
      subEl.textContent = '';
      capEl.hidden = true;
      artEl.innerHTML = '';
      bodyEl.innerHTML = `<p class="mem-line">${esc(t('mem.error.body'))}</p>`;
      skipBtn.textContent = t('mem.close');
      nextBtn.hidden = true;
      backBtn.hidden = true;
      return;
    }

    titleEl.textContent = pick(memory.title);
    subEl.textContent = pick(memory.subtitle);
    skipBtn.textContent = pick(memory.skip);

    /* mở đầu hồi tưởng có một tiếng mở hộp giấy nhẹ, đúng chất lục đồ
       cũ trong ba lô. Không có file riêng nên dùng tiếng lật công tắc,
       ngắn và khô, không lẫn với gió Sao Hỏa. */
    playOneShotSfx('switch-flip');

    index = 0;
    drawBeat();
    if (motionOn()) el.classList.add('is-enter');

    return session;
  });

  return session;
}

export default playMemory;
