/* ============================================================
   story.js
   Chạy màn mở đầu: tiến lùi, nhập tên, phụ đề, song ngữ.

   Tách làm ba file cho dễ sửa:
     story-data.js  chứa toàn bộ chữ, mỗi câu có cả vi và en
     art.js         chứa toàn bộ tranh
     story.js       chứa logic, file này, hiếm khi cần sửa
   ============================================================ */

import { STORY, CREW, PLAYER_ROLE } from './story-data.js';
import { artFor, BASE_URL } from './art.js';
import { t, getLang, onLangChange } from './i18n.js';
import { playClick } from './audio.js';
import { playSceneSfx, playBeatSfx, stopAllSceneSfx } from './audio-sfx.js';
import { applyBeatFx, resetFx, fxMotionOn } from './story-fx.js';

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
  /* trim để tên toàn khoảng trắng không lọt qua, tránh trường hợp nút
     Tiếp sáng lên nhưng bấm vào không chạy gì. */
  let playerName = (localStorage.getItem(KEY_NAME) || '').trim();
  let busy = false;
  let transitionToken = 0;
  let watchdog = null;
  let lastRenderedBeat = -1;
  /* Mốc khoá bấm nút cho cú va đập ăng-ten. Dùng mốc thời gian riêng
     thay vì cờ busy, để không tranh chấp với quá trình chuyển cảnh
     đang chạy song song. Giờ do dữ liệu quyết định qua trường lock,
     không còn đóng cứng số lượt ở đây. */
  let fxLockUntil = 0;

  /* ---------- dựng khung ---------- */
  const el = document.createElement('div');
  el.className = 'story-screen';
  el.innerHTML = `
    <button class="story-skip" type="button"></button>
    <div class="story-stage">
      <div class="story-caption"></div>
      <div class="story-art-slot"></div>
    </div>
    <div class="story-sub">
      <div class="story-body" aria-live="polite" aria-atomic="false"><span class="story-next-hint"></span></div>
      <div class="story-nav">
        <button class="story-btn" data-dir="-1" aria-label="Lùi lại">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          <span class="story-btn-label"></span>
        </button>
        <button class="story-btn story-btn-next" data-dir="1" aria-label="Tiếp theo">
          <span class="story-btn-label"></span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const stageArt = el.querySelector('.story-art-slot');
  const caption  = el.querySelector('.story-caption');
  const body     = el.querySelector('.story-body');
  const btnSkip  = el.querySelector('.story-skip');
  btnSkip.textContent = pick({ vi: 'Bỏ qua', en: 'Skip' });
  btnSkip.setAttribute('aria-label', pick({
    vi: 'Bỏ qua phần kể chuyện và vào thẳng trò chơi',
    en: 'Skip the story and go straight into the game',
  }));
  const btnPrev  = el.querySelector('[data-dir="-1"]');
  const btnNext  = el.querySelector('[data-dir="1"]');
  const btnPrevLabel = btnPrev.querySelector('.story-btn-label');
  const btnNextLabel = btnNext.querySelector('.story-btn-label');

  /* ---------- tiện ích ---------- */

  /* Thoát ký tự nguy hiểm. Phải thoát CẢ dấu nháy kép và nháy đơn,
     vì tên người chơi được chèn vào thuộc tính value="..." của ô nhập.
     Thiếu hai ký tự này thì tên kiểu  a" onfocus="..."  sẽ chèn được
     thuộc tính lạ vào thẻ, tức là lỗ hổng chèn mã. */
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  function fmt(text) {
    /* Trước khi nhập tên, {name} phải hiện một tên tạm chứ không phải
       đại từ. Lý do: cảnh 1 và 2 có thoại của Vance và Sato gọi tên
       người chơi qua bộ đàm, mà lượt nhập tên nằm ở cảnh 4. Nếu hiện
       "bạn" hay "you" thì câu thoại thành "Mất tín hiệu bạn rồi!",
       nghe như đang nói với chính mình. Dùng tên tạm của nhân vật cho
       tới khi người chơi đặt tên thật. */
    const fallback = pick({ vi: 'Reid', en: 'Reid' });
    return esc(text)
      .replace(/\{name\}/g, `<span class="pname">${esc(playerName || fallback)}</span>`)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  /* Nhãn bối cảnh là textContent nên không nhận HTML. Cần bỏ thẻ do fmt
     sinh ra, chỉ giữ phần chữ và tên đã thay. */
  function stripTags(html) {
    return String(html).replace(/<[^>]*>/g, '');
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

    /* KHE ẢNH: người vẽ tay chỉ cần ném file vào assets/art/ đúng tên
       gốc, đuôi nào cũng được. Nếu file khai báo (mặc định webp) không
       có, ảnh báo lỗi và ta thử lần lượt jpg, png, avif. Không có thử
       này thì thay một tấm tranh bằng jpg là cả khung đen. */
    const img = stageArt.querySelector('img[data-fallbacks]');
    if (img) {
      img.addEventListener('error', function tryNext() {
        const chain = (img.dataset.fallbacks || '').split(';').filter(Boolean);
        if (!chain.length) {
          img.removeEventListener('error', tryNext);
          return;
        }
        /* Đường dẫn trong chuỗi là tương đối so với thư mục chứa module.
           Phải ghép với BASE_URL, KHÔNG dùng new URL(x, img.src), vì
           img.src là URL của chính file ảnh đang lỗi nên ghép vào sẽ
           cộng dồn thư mục: assets/art/ lặp năm lần. */
        const next = BASE_URL + chain.shift();
        img.dataset.fallbacks = chain.join(';');
        img.src = next;
      });
    }

    el.dataset.art = key;
    playSceneSfx(key);
  }

  /* Nhãn hồi đã bỏ theo yêu cầu. Người chơi chỉ cần nhãn bối cảnh
     ở góc trái, không cần biết mình đang ở hồi mấy. */

  function updateChrome() {
    btnPrevLabel.textContent = t('nav.prev');
    btnNextLabel.textContent = t('nav.next');

    const artKey = artKeyFor(i);

    const beat = STORY[i];
    /* caption cũng có thể chứa {name}, nên phải đi qua fmt chứ không
       gán textContent trực tiếp: nếu không người chơi thấy nguyên chuỗi
       "{name}" trên khung hình. */
    if (beat?.caption) caption.textContent = stripTags(fmt(pick(beat.caption)));
    else {
      const owner = STORY.find((b) => b.art === artKey && b.caption);
      caption.textContent = owner ? stripTags(fmt(pick(owner.caption))) : '';
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

    /* Áp hiệu ứng hình ảnh cho lượt này. Tách riêng để không rải
       lời gọi FX khắp các nhánh render bên dưới. */
    function runFx() {
      applyBeatFx({
        beatIndex: i,
        beatType: beat.type,
        artKey,
        root: el,
        body,
        stage: el.querySelector('.story-stage'),
        beatFx: beat.fx,
      });
      /* Khoá nút đúng nhịp cú va đập, để cú đập không bị cú bấm tiếp
         theo cắt ngang. Chỉ khoá khi chuyển động đang bật, vì tắt
         chuyển động thì không có cú đập nào để xem. */
      if (beat.lock && fxMotionOn()) fxLockUntil = Date.now() + 500;
      /* Một số lượt cần giữ người chơi lại đúng khoảng lặng: khung tối
         đen hai tới ba giây, hoặc câu cuối cùng của một hồi. Không dùng
         busy vì busy còn phục vụ chuyển cảnh. */
      if (beat.pause) {
        fxLockUntil = Math.max(fxLockUntil, Date.now() + beat.pause);
        /* Khoá luôn nút để người chơi thấy mình đang bị giữ, thay vì
           bấm mà không có gì xảy ra. Nhả khoá sau đúng khoảng lặng,
           nhưng chỉ khi vẫn còn ở lượt này. */
        const atBeat = i;
        btnNext.disabled = true;
        setTimeout(() => {
          if (i === atBeat) {
            btnNext.disabled = STORY[i]?.type === 'name' && !playerName;
          }
        }, beat.pause);
      }
    }

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
      runFx();
      return;
    }

    if (beat.type === 'log') {
      body.innerHTML = `<div class="story-log">${fmt(pick(beat.text))}</div>${hint}`;
      runFx();
      return;
    }

    if (beat.type === 'dialogue') {
      const who = CREW.find((c) => c.id === beat.who);
      /* Lượt của người chơi có name rỗng trong CREW, nên hiển thị tên
         đã nhập. Nếu chưa nhập thì để trống, đừng hiện "undefined". */
      const speaker = who?.id === 'player'
        ? (playerName || t('story.you'))
        : (who?.name || '');
      body.innerHTML = `
        <div class="story-speaker" style="color:${who?.color || 'var(--tx-bright)'}">
          <span class="dot"></span>
          <span>${esc(speaker)}</span>
          <span class="role">${esc(pick(who?.role) || '')}</span>
        </div>
        <p class="story-line">${fmt(pick(beat.text))}</p>${hint}`;
      runFx();
      return;
    }

    body.innerHTML = `<p class="story-line">${fmt(pick(beat.text))}</p>${hint}`;
    runFx();
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
    /* Dọn hiệu ứng của lượt cũ trước khi vẽ lượt mới, để rung hay
       nghiêng không sót sang lượt sau. */
    resetFx(el);
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

    /* Không có tên thì vẽ lại để nút Tiếp trở về trạng thái mờ.
       Trước đây hàm thoát im lặng, người chơi bấm mà không hiểu vì sao
       không chạy. */
    if (!v) { render(); return; }

    playerName = v;
    localStorage.setItem(KEY_NAME, v);
    btnNext.disabled = false;

    /* Đặt cờ bận NGAY, trước khi vẽ lại. Nếu không, nút Tiếp vừa được
       bật và người chơi bấm trong khoảng chờ sẽ chạy next() hai lần,
       mất một lượt kể. */
    busy = true;
    render();
    setTimeout(() => { busy = false; next(); }, 220);
  }

  /* ---------- điều hướng ---------- */

  function next() {
    /* Phải chặn ở đây, TRƯỚC khi tăng i. Nếu tăng trước rồi mới
       để transition() tự thoát vì đang bận thì số lượt bị nhảy cóc
       mà màn hình không vẽ, người chơi mất nội dung. */
    if (busy) return;
    if (Date.now() < fxLockUntil) return;
    if (i >= STORY.length - 1) { finish(); return; }
    i++;
    transition();
  }

  function prev() {
    if (busy) return;
    if (Date.now() < fxLockUntil) return;
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

  /* Nút bỏ qua toàn bộ phần kể chuyện. Trước đây nút có trong DOM
     nhưng không gắn sự kiện, không có CSS, nên vô hình và bấm không
     ăn. Giám khảo phải đọc hết hai mươi lượt thoại mới vào game. */
  btnSkip.addEventListener('click', (e) => {
    e.stopPropagation();
    playClick();
    finish();
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
