/* ============================================================
   story.js — chạy màn mở đầu: tiến / lùi, nhập tên, phụ đề
   Owner: @bersious

   Tách làm 3 file để dễ sửa:
     story-data.js  → TOÀN BỘ chữ (sửa lời thoại ở đây)
     art.js         → TOÀN BỘ tranh (KHE ẢNH, thay bằng <img> được)
     story.js       → logic (file này) — hiếm khi cần sửa
   ============================================================ */

import { STORY, CREW, PLAYER_ROLE } from './story-data.js';
import { ART } from './art.js';

const KEY_NAME = 'smdg.playerName';

export function startStory({ onFinish } = {}) {
  let i = 0;
  let playerName = localStorage.getItem(KEY_NAME) || '';

  /* ---------- dựng khung ---------- */
  const el = document.createElement('div');
  el.className = 'story-screen';
  el.innerHTML = `
    <div class="story-stage">
      <div class="story-caption"></div>
      <div class="story-art-slot"></div>
    </div>
    <div class="story-sub">
      <div class="story-body"></div>
      <div class="story-pips" aria-hidden="true"></div>
      <div class="story-nav">
        <button class="story-btn" data-dir="-1" aria-label="Lùi lại">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          <span class="story-btn-label">Trước</span>
        </button>
        <button class="story-btn story-btn-next" data-dir="1" aria-label="Tiếp theo">
          <span class="story-btn-label">Tiếp</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const stageArt = el.querySelector('.story-art-slot');
  const caption  = el.querySelector('.story-caption');
  const body     = el.querySelector('.story-body');
  const pips     = el.querySelector('.story-pips');
  const btnPrev  = el.querySelector('[data-dir="-1"]');
  const btnNext  = el.querySelector('[data-dir="1"]');

  /* ---------- tiện ích ---------- */

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // *chữ* → <em>, {name} → tên người chơi
  function fmt(text) {
    return esc(text)
      .replace(/\{name\}/g, `<span class="pname">${esc(playerName || 'bạn')}</span>`)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function drawPips() {
    pips.innerHTML = STORY.map((_, n) =>
      `<i class="${n < i ? 'done' : n === i ? 'now' : ''}"></i>`
    ).join('');
  }

  /* Nếu lượt hiện tại không khai báo 'art' (ví dụ dòng log), dùng tranh của
     lượt gần nhất có tranh — ưu tiên phía sau, rồi phía trước. Nhờ vậy màn
     log đầu tiên không bị trống. */
  function artFor(index) {
    if (STORY[index]?.art) return STORY[index].art;
    for (let n = index - 1; n >= 0; n--) if (STORY[n].art) return STORY[n].art;
    for (let n = index + 1; n < STORY.length; n++) if (STORY[n].art) return STORY[n].art;
    return null;
  }

  function drawArt(key) {
    const svg = ART[key];
    if (!svg) { stageArt.innerHTML = ''; stageArt.dataset.key = ''; return; }
    if (stageArt.dataset.key === key) return;   // cùng cảnh thì không vẽ lại
    stageArt.dataset.key = key;
    stageArt.innerHTML = svg;
    el.dataset.art = key;
    const art = stageArt.firstElementChild;
    if (art) { art.style.animation = 'none'; void art.offsetWidth; art.style.animation = ''; }
    // chú thích: lấy từ lượt hiện tại, nếu không có thì lấy lượt đầu của cảnh đó
    caption.textContent =
      STORY[i]?.caption || STORY.find((b) => b.art === key && b.caption)?.caption || '';
  }

  /* ---------- vẽ một lượt ---------- */

  function render() {
    const beat = STORY[i];
    if (!beat) return;

    drawPips();
    btnPrev.disabled = i === 0;
    btnNext.disabled = beat.type === 'name' && !playerName;

    const artKey = artFor(i);
    if (artKey) drawArt(artKey);

    if (beat.type === 'name') {
      body.innerHTML = `
        <div class="name-card">
          <div class="ask">${fmt(beat.prompt)}</div>
          <label class="field">
            <span class="field-label">Tên phi hành gia</span>
            <input class="inp" type="text" maxlength="18" autocomplete="off"
                   spellcheck="false" placeholder="${esc(beat.placeholder || '')}"
                   value="${esc(playerName)}">
          </label>
          <div class="hint">${esc(beat.hint || '')}</div>
          <button class="go" type="button" disabled>Ký tên</button>
        </div>`;
      const inp = body.querySelector('.inp');
      const go = body.querySelector('.go');
      inp.focus();
      inp.addEventListener('input', () => {
        const ok = inp.value.trim().length > 0;
        btnNext.disabled = !ok;
        go.disabled = !ok;
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commitName(); }
      });
      go.addEventListener('click', commitName);
      return;
    }

    if (beat.type === 'log') {
      // dòng nhật ký kỹ thuật: nhỏ, đều, như bản tin trạm điều khiển
      body.innerHTML = `<div class="story-log"><span>${fmt(beat.text)}</span></div>`;
      return;
    }

    if (beat.type === 'dialogue') {
      const who = CREW.find((c) => c.id === beat.who);
      body.innerHTML = `
        <div class="story-speaker" style="color:${who?.color || '#b9a68f'}">
          <span class="dot"></span>
          <span>${esc(who?.name || '')}</span>
          <span class="role">· ${esc(who?.role || '')}</span>
        </div>
        <p class="story-line">${fmt(beat.text)}</p>`;
      return;
    }

    body.innerHTML = `<p class="story-line">${fmt(beat.text)}</p>`;
  }

  /* ---------- nhập tên ---------- */

  function commitName() {
    const inp = body.querySelector('.inp');
    const v = (inp?.value || '').trim();
    if (!v) return;
    playerName = v;
    localStorage.setItem(KEY_NAME, v);
    btnNext.disabled = false;
    render();
    setTimeout(next, 220);
  }

  /* ---------- điều hướng ---------- */

  function next() {
    if (i >= STORY.length - 1) { finish(); return; }
    i++;
    render();
  }

  function prev() {
    if (i > 0) { i--; render(); }
  }

  function finish() {
    cleanup();
    el.classList.add('leaving');
    setTimeout(() => {
      el.remove();
      onFinish?.({ playerName, crew: CREW, playerRole: PLAYER_ROLE });
    }, 500);
  }

  /* ---------- gắn sự kiện ---------- */

  btnNext.addEventListener('click', () => {
    if (STORY[i]?.type === 'name') { commitName(); return; }
    next();
  });
  btnPrev.addEventListener('click', prev);

  function onKey(e) {
    if (document.activeElement?.classList?.contains('inp')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      btnNext.click();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      btnPrev.click();
    }
  }
  document.addEventListener('keydown', onKey);

  function cleanup() {
    document.removeEventListener('keydown', onKey);
  }

  render();

  return {
    destroy() { cleanup(); el.remove(); },
    get name() { return playerName; },
  };
}

export function getSavedName() {
  return localStorage.getItem(KEY_NAME) || '';
}
