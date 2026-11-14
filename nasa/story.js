/* ============================================================
   story.js
   Chạy màn mở đầu: tiến lùi, nhập tên, phụ đề, song ngữ.

   Tách làm ba file cho dễ sửa:
     story-data.js  chứa toàn bộ chữ, mỗi câu có cả vi và en
     art.js         chứa toàn bộ tranh
     story.js       chứa logic, file này, hiếm khi cần sửa
   ============================================================ */

import { STORY, CREW, PLAYER_ROLE } from './story-data.js';
import { artFor } from './art.js';
import { t, getLang, onLangChange } from './i18n.js';
import { playClick } from './audio.js';
import { playSceneSfx, playBeatSfx, stopAllSceneSfx } from './audio-sfx.js';

const KEY_NAME = 'smdg.playerName';

/* Lấy chuỗi theo ngôn ngữ hiện tại. Nếu dữ liệu là chuỗi thuần
   thì trả về luôn, để không vỡ khi ai đó lỡ viết tắt. */
function pick(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  const lang = getLang();
  return value[lang] ?? value.vi ?? '';
}

export function startStory({ onFinish } = {}) {
  let i = 0;
  let playerName = localStorage.getItem(KEY_NAME) || '';
  let busy = false;
  let transitionToken = 0;
  let watchdog = null;
  let lastRenderedBeat = -1;

  /* ---------- dựng khung ---------- */
  const el = document.createElement('div');
  el.className = 'story-screen';
  el.innerHTML = `
    <div class="story-stage">
      <div class="story-caption"></div>
      <div class="story-act"></div>
      <div class="story-art-slot"></div>
    </div>
    <div class="story-sub">
      <div class="story-body"><span class="story-next-hint"></span></div>
      <div class="story-nav">
        <button class="story-btn" data-dir="-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          <span class="story-btn-label"></span>
        </button>
        <button class="story-btn story-btn-next" data-dir="1">
          <span class="story-btn-label"></span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const stageArt = el.querySelector('.story-art-slot');
  const caption  = el.querySelector('.story-caption');
  const actLabel = el.querySelector('.story-act');
  const body     = el.querySelector('.story-body');
  const btnPrev  = el.querySelector('[data-dir="-1"]');
  const btnNext  = el.querySelector('[data-dir="1"]');
  const btnPrevLabel = btnPrev.querySelector('.story-btn-label');
  const btnNextLabel = btnNext.querySelector('.story-btn-label');

  /* ---------- tiện ích ---------- */

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function fmt(text) {
    return esc(text)
      .replace(/\{name\}/g, `<span class="pname">${esc(playerName || 'bạn')}</span>`)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  /* tìm art key gần nhất cho beat này (beat có thể không khai báo art) */
  function artKeyFor(index) {
    if (STORY[index]?.art) return STORY[index].art;
    for (let n = index - 1; n >= 0; n--) if (STORY[n].art) return STORY[n].art;
    for (let n = index + 1; n < STORY.length; n++) if (STORY[n].art) return STORY[n].art;
    return null;
  }

  function drawArt(key) {
    /* artFor trả ảnh thật nếu PHOTOS có khai báo, không thì tranh SVG */
    const markup = artFor(key);
    if (!markup) { stageArt.innerHTML = ''; stageArt.dataset.key = ''; return; }
    if (stageArt.dataset.key === key) return;
    stageArt.dataset.key = key;
    stageArt.innerHTML = markup;
    el.dataset.art = key;
    playSceneSfx(key);
  }

  /* Số hồi chia theo cảnh, để người chơi biết mình đang ở đâu
     mà không cần thanh tiến độ. */
  const ACTS = [
    { key: 'earth-home',   label: 'act.0' },
    { key: 'farewell',     label: 'act.0' },
    { key: 'launchpad',    label: 'act.0' },
    { key: 'mars-surface', label: 'act.1' },
    { key: 'storm-coming', label: 'act.2' },
    { key: 'storm-impact', label: 'act.2' },
    { key: 'departure',    label: 'act.2' },
    { key: 'awake',        label: 'act.3' },
  ];

  function updateChrome() {
    btnPrevLabel.textContent = t('nav.prev');
    btnNextLabel.textContent = t('nav.next');

    const artKey = artKeyFor(i);
    if (artKey) {
      const actKey = ACTS.find((a) => a.key === artKey)?.label;
      actLabel.textContent = actKey ? t(actKey) : '';
    }

    const beat = STORY[i];
    if (beat?.caption) caption.textContent = pick(beat.caption);
    else {
      const owner = STORY.find((b) => b.art === artKey && b.caption);
      caption.textContent = owner ? pick(owner.caption) : '';
    }
  }

  /* ---------- vẽ một lượt ---------- */

  function render() {
    const beat = STORY[i];
    if (!beat) return;

    /* ghi số lượt ra DOM để dễ soi khi gỡ lỗi, không ảnh hưởng hiển thị */
    el.dataset.beat = String(i);

    btnPrev.disabled = i === 0;
    btnNext.disabled = beat.type === 'name' && !playerName;

    const artKey = artKeyFor(i);
    if (artKey) drawArt(artKey);
    if (lastRenderedBeat !== i) {
      lastRenderedBeat = i;
      playBeatSfx(i);
    }
    updateChrome();

    const hint = '<span class="story-next-hint"></span>';

    if (beat.type === 'name') {
      body.innerHTML = `
        <div class="name-card">
          <div class="ask">${fmt(pick(beat.prompt))}</div>
          <label class="field">
            <span class="field-label">${esc(t('name.label'))}</span>
            <input class="inp" type="text" maxlength="18" autocomplete="off"
                   spellcheck="false" placeholder="${esc(pick(beat.placeholder))}"
                   value="${esc(playerName)}">
          </label>
          <div class="hint">${esc(pick(beat.hint))}</div>
          <button class="go" type="button" disabled>${esc(t('name.sign'))}</button>
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
      body.innerHTML = `<div class="story-log">${fmt(pick(beat.text))}</div>${hint}`;
      return;
    }

    if (beat.type === 'dialogue') {
      const who = CREW.find((c) => c.id === beat.who);
      body.innerHTML = `
        <div class="story-speaker" style="color:${who?.color || 'var(--tx-bright)'}">
          <span class="dot"></span>
          <span>${esc(who?.name || '')}</span>
          <span class="role">${esc(pick(who?.role) || '')}</span>
        </div>
        <p class="story-line">${fmt(pick(beat.text))}</p>${hint}`;
      return;
    }

    body.innerHTML = `<p class="story-line">${fmt(pick(beat.text))}</p>${hint}`;
  }

  /* ---------- chuyển cảnh ----------
     Thời lượng đọc từ tokens.css nên chỉnh nhịp ở đó là đủ. */

  function cssMs(name, fallback) {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function transition() {
    if (busy) return;
    busy = true;

    /* Chốt an toàn: nếu vì bất kỳ lý do gì mà quá trình chuyển cảnh
       không hoàn tất, cờ busy tự nhả sau 2 giây để nút không bị kẹt. */
    const token = ++transitionToken;
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (token === transitionToken) {
        busy = false;
        el.classList.remove('is-fading', 'is-revealing');
      }
    }, 2000);

    const outMs = cssMs('--st-fade-out-ms', 130);
    const inMs  = cssMs('--st-fade-in-ms', 320);

    el.classList.add('is-fading');
    setTimeout(() => {
      if (token !== transitionToken) return;
      try {
        render();
      } catch (err) {
        console.error('render lỗi ở lượt', i, err);
      }
      el.classList.remove('is-fading');
      el.classList.add('is-revealing');
      setTimeout(() => {
        if (token !== transitionToken) return;
        el.classList.remove('is-revealing');
        clearTimeout(watchdog);
        busy = false;
      }, inMs);
    }, outMs);
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
    /* Phải chặn ở đây, TRƯỚC khi tăng i. Nếu tăng trước rồi mới
       để transition() tự thoát vì đang bận thì số lượt bị nhảy cóc
       mà màn hình không vẽ, người chơi mất nội dung. */
    if (busy) return;
    if (i >= STORY.length - 1) { finish(); return; }
    i++;
    transition();
  }

  function prev() {
    if (busy) return;
    if (i <= 0) return;
    i--;
    transition();
  }

  function finish() {
    cleanup();
    el.classList.add('leaving');
    setTimeout(() => {
      el.remove();
      onFinish?.({ playerName, crew: CREW, playerRole: PLAYER_ROLE });
    }, 520);
  }

  /* ---------- gắn sự kiện ---------- */

  btnNext.addEventListener('click', () => {
    playClick();
    if (STORY[i]?.type === 'name') { commitName(); return; }
    next();
  });
  btnPrev.addEventListener('click', () => {
    playClick();
    prev();
  });

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

  /* đổi ngôn ngữ giữa chừng thì vẽ lại lượt hiện tại, không mất vị trí */
  const offLang = onLangChange(() => {
    if (!busy) render();
  });

  function cleanup() {
    document.removeEventListener('keydown', onKey);
    offLang();
    stopAllSceneSfx();
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
