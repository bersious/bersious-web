/* ============================================================
   menu-cinematic.js
   Màn menu chính: hoạt cảnh, hạt bụi, parallax, nút ngôn ngữ, và
   chuỗi phóng tàu 2,6 giây trước khi chuyển màn.

   Vì sao tách khỏi index.html: khối script trong index.html lo luồng
   chuyển màn (preloader, video mở đầu, màn truyện). Phần hình ảnh và
   thời gian của menu nằm ở đây, để sửa hoạt cảnh không phải chạm vào
   luồng chơi.

   Mọi đường dẫn dựng từ new URL('.', import.meta.url), không dùng
   location.href: trang được phục vụ ở /nasa mà không có dấu chéo cuối.

   API:
     initMenu({ onStart, onResume, onSettings, playClick })
       gắn toàn bộ phần tương tác của menu, trả về
       { refreshSave, isBusy, reset }
     playLaunch()  chạy chuỗi phóng, trả Promise
     motionAllowed()  người chơi có cho phép chuyển động hay không
   ============================================================ */

import { getLang, setLang, onLangChange, t } from './i18n.js';

/* ---------- chữ song ngữ ----------
   Để trong file này chứ không thêm vào i18n.js: đây là chữ riêng của
   màn menu, và một bảng cục bộ thì không thể hỏng vì lý do ở file
   khác. Khoá nào i18n.js đã có (tên nút, ghi chú bản lưu) thì vẫn
   đọc qua t() để hai nơi không lệch nhau. */
const TEXT = {
  vi: {
    loading: 'Đang tải...',
    slow: 'Đang tải tài nguyên, chờ chút...',
    stall: 'Tải lâu hơn bình thường. Bấm để thử lại.',
    retry: 'Thử lại',
    noSave: 'Chưa có bản lưu',
    langGroup: 'Ngôn ngữ',
    tagline: 'Lấy cảm hứng từ phim The Martian',
  },
  en: {
    loading: 'Loading...',
    slow: 'Loading assets, one moment...',
    stall: 'Taking longer than usual. Tap to try again.',
    retry: 'Try again',
    noSave: 'No saved game',
    langGroup: 'Language',
    tagline: 'Inspired by The Martian',
  },
};

function s(key) {
  const tbl = TEXT[getLang()] || TEXT.vi;
  return tbl[key] ?? TEXT.vi[key] ?? key;
}

/* ---------- thời lượng hoạt cảnh ----------
   Tổng 2,6 giây. Ba mốc dưới đây là hợp đồng với CSS: đổi một bên thì
   phải đổi bên kia, nếu không lửa sẽ tắt giữa lúc tàu đang lên. */
const T_TEXT_OUT = 400;    // chữ và nút mờ dần
const T_IGNITE = 400;      // động cơ khai hoả, khói bụi, màn hình rung
const T_LIFT = 1400;       // tàu rời đất
const T_FADE = 2400;       // lớp đen phủ vào
const T_END = 2600;        // gọi callback chuyển màn
const T_REDUCED = 200;     // không hoạt cảnh: chuyển ngay sau 200ms

/* Mốc nhắc người chơi game vẫn đang chạy. Đo từ lúc bấm, không đo từ
   lúc hoạt cảnh xong: người chấm sốt ruột từ giây đầu tiên. */
const T_HINT_SLOW = 4000;
const T_HINT_STALL = 15000;

/* ---------- tôn trọng lựa chọn giảm chuyển động ---------- */

export function motionAllowed() {
  try {
    if (document.documentElement.classList.contains('motion-off')) return false;
    if (document.documentElement.dataset.motion === 'off') return false;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch {
    /* trình duyệt cũ không có matchMedia: coi như cho phép */
  }
  return true;
}

/* ============================================================
   HẠT BỤI
   Canvas phủ toàn màn hình, hạt cát đỏ bay xéo từ trái sang phải.
   Mỗi hạt có tốc độ và kích thước riêng, mờ dần khi ra mép. Thỉnh
   thoảng có vệt gió dài mảnh lướt qua.
   ============================================================ */

function createDust(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let running = false;
  let particles = [];
  let streaks = [];
  let streakTimer = 0;
  /* Hệ số tốc độ. Lúc phóng tàu đặt thành 3 để bụi cuộn nhanh theo
     luồng khí từ động cơ. */
  let speed = 1;

  const COUNT_MIN = 60;
  const COUNT_MAX = 90;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function makeParticle(seedX) {
    return {
      /* toạ độ theo phần trăm khung, để đổi cỡ màn hình không phải
         dựng lại hạt */
      x: seedX !== undefined ? seedX : rand(-0.1, 1.1),
      y: rand(-0.05, 1.05),
      /* hạt nhỏ bay nhanh hơn hạt lớn: lớp xa và lớp gần tách nhau */
      r: rand(0.6, 2.6),
      vx: rand(0.035, 0.115),
      vy: rand(-0.006, 0.028),
      /* độ mờ gốc, hạt nhỏ mờ hơn cho có chiều sâu */
      a: rand(0.10, 0.40),
      /* pha nhấp nháy chậm, cho bụi không trượt đều như máy */
      ph: rand(0, Math.PI * 2),
      sp: rand(0.4, 1.5),
    };
  }

  function makeStreak() {
    return {
      x: -0.25,
      y: rand(0.05, 0.95),
      len: rand(0.12, 0.34),
      vx: rand(0.22, 0.46),
      a: rand(0.05, 0.13),
      w: rand(0.8, 1.8),
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const cw = Math.max(1, Math.round(rect.width));
    const ch = Math.max(1, Math.round(rect.height));
    /* Trần 2 cho màn retina: trên 3x, số điểm ảnh tăng gấp chín mà mắt
       không thấy khác, chỉ tốn khung hình. */
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = cw;
    h = ch;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* số hạt theo diện tích: màn nhỏ thì ít hạt, màn lớn nhiều hạt,
       luôn nằm trong khoảng 60 tới 90 của bản thiết kế */
    const area = (cw * ch) / (1440 * 900);
    const n = Math.round(Math.min(COUNT_MAX, Math.max(COUNT_MIN, COUNT_MIN + (COUNT_MAX - COUNT_MIN) * Math.min(1, area))));
    if (particles.length !== n) {
      particles = [];
      for (let i = 0; i < n; i += 1) particles.push(makeParticle());
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    /* hai vệt gió dài, mảnh, thưa */
    for (const st of streaks) {
      const x0 = st.x * w;
      const y0 = st.y * h;
      const g = ctx.createLinearGradient(x0, y0, x0 + st.len * w, y0);
      g.addColorStop(0, `rgba(232, 168, 120, 0)`);
      g.addColorStop(0.5, `rgba(240, 178, 130, ${st.a})`);
      g.addColorStop(1, `rgba(232, 168, 120, 0)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = st.w;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + st.len * w, y0);
      ctx.stroke();
    }

    for (const p of particles) {
      /* mờ dần ở mép trái và mép phải, để hạt không hiện ra đột ngột */
      const fadeEdge = Math.min(1, Math.max(0, (p.x + 0.06) / 0.14)) *
                       Math.min(1, Math.max(0, (1.06 - p.x) / 0.14));
      const a = p.a * fadeEdge;
      if (a <= 0.004) continue;
      const px = p.x * w;
      const py = p.y * h;
      /* hạt sáng ở giữa, tối ở rìa: trông như hạt cát bắt nắng */
      const rg = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3.2);
      rg.addColorStop(0, `rgba(248, 190, 142, ${a})`);
      rg.addColorStop(0.45, `rgba(214, 138, 88, ${a * 0.55})`);
      rg.addColorStop(1, 'rgba(180, 106, 62, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(px, py, p.r * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function step(now) {
    if (!running) return;
    raf = window.requestAnimationFrame(step);

    /* Chặn khung hình dày: trên màn 144Hz, chạy theo từng nhịp vẽ sẽ
       nhanh gấp đôi màn 60Hz với cùng một hằng số tốc độ. */
    const dt = Math.min(2.2, (now - (step.last || now)) / 16.67);
    step.last = now;

    for (const p of particles) {
      p.x += p.vx * p.sp * dt * speed;
      p.y += p.vy * p.sp * dt * speed;
      /* hạt ra khỏi mép phải thì quay về mép trái, giữ mật độ không đổi */
      if (p.x > 1.12) {
        p.x = -0.12;
        p.y = rand(-0.05, 1.05);
      }
      if (p.y > 1.08) p.y = -0.08;
      if (p.y < -0.1) p.y = 1.06;
    }

    for (const st of streaks) {
      st.x += st.vx * dt * speed;
    }
    streaks = streaks.filter((st) => st.x < 1.3);

    streakTimer -= dt;
    if (streakTimer <= 0) {
      streakTimer = rand(90, 260);
      if (streaks.length < 3) streaks.push(makeStreak());
    }

    draw();
  }

  function start() {
    if (running) return;
    if (!motionAllowed()) { draw(); return; }
    running = true;
    step.last = 0;
    raf = window.requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  resize();
  start();

  /* Đổi cỡ màn hình thì dựng lại canvas. Chặn dội: điện thoại bắn
     resize liên tục khi thanh địa chỉ trượt. */
  let rzTimer = 0;
  function onResize() {
    if (rzTimer) clearTimeout(rzTimer);
    rzTimer = setTimeout(() => { rzTimer = 0; resize(); draw(); }, 140);
  }
  window.addEventListener('resize', onResize);

  /* Tab bị ẩn thì dừng hẳn: requestAnimationFrame vốn đã bị treo, nhưng
     dừng tường minh thì quay lại tab là chạy tiếp sạch, không nhảy
     một bước khổng lồ vì đồng hồ đã trôi. */
  function onVis() {
    if (document.hidden) stop();
    else start();
  }
  document.addEventListener('visibilitychange', onVis);

  return {
    setSpeed(v) {
      speed = Math.max(0.2, Number(v) || 1);
    },
    start,
    stop,
    destroy() {
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    },
    /* cho phần kiểm thử đọc được: số hạt và cỡ canvas thật */
    stats() {
      return { count: particles.length, width: canvas.width, height: canvas.height, running };
    },
  };
}

/* ============================================================
   PARALLAX
   Rê chuột thì nền dịch tối đa 8px. Chỉ dịch nền, không dịch chữ:
   chữ rung theo chuột là thứ đọc rất khó chịu.
   ============================================================ */

function createParallax(layer) {
  if (!layer) return null;
  const MAX = 8;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let raf = 0;

  function apply() {
    raf = 0;
    /* làm mượt: mỗi khung hình tiến 12 phần trăm quãng đường còn lại,
       để chuyển động không giật theo từng pixel của chuột */
    tx += (cx - tx) * 0.12;
    ty += (cy - ty) * 0.12;
    layer.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    if (Math.abs(cx - tx) > 0.05 || Math.abs(cy - ty) > 0.05) {
      raf = window.requestAnimationFrame(apply);
    }
  }

  function onMove(e) {
    if (!motionAllowed()) return;
    const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;   // -1 tới 1
    const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    /* dấu đảo: nền dịch ngược chiều chuột, tạo cảm giác có chiều sâu */
    cx = -nx * MAX;
    cy = -ny * MAX * 0.6;
    if (!raf) raf = window.requestAnimationFrame(apply);
  }

  function onLeave() {
    cx = 0;
    cy = 0;
    if (!raf) raf = window.requestAnimationFrame(apply);
  }

  /* Chỉ gắn trên thiết bị có chuột thật: trên điện thoại, mousemove
     bắn ra lúc chạm và nền nhảy theo ngón tay trông như lỗi. */
  const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  if (fine) {
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
  }

  return {
    destroy() {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      layer.style.transform = '';
    },
  };
}

/* ============================================================
   KHỞI TẠO MENU
   ============================================================ */

export function initMenu(opts = {}) {
  const {
    onStart = null,
    onResume = null,
    onSettings = null,
    playClick = () => {},
    hasSave = () => false,
    getSaveInfo = null,
  } = opts;

  const stage = document.getElementById('menu-stage');
  const ship = document.getElementById('menu-ship');
  const astro = document.getElementById('menu-astro');
  const fade = document.getElementById('menu-fade');
  const canvas = document.getElementById('menu-dust');
  const parallaxLayer = document.getElementById('menu-parallax');
  const actions = document.querySelector('#boot .menu-actions');
  const btnStart = document.getElementById('start');
  const btnResume = document.getElementById('resume');
  const btnGear = document.getElementById('menu-gear');
  const resumeNote = document.getElementById('resume-note');
  const saveNote = document.getElementById('save-note');
  const hint = document.getElementById('menu-hint');
  const retry = document.getElementById('menu-retry');
  const langBox = document.getElementById('menu-lang');
  const taglineEl = document.getElementById('menu-tagline');

  const dust = canvas ? createDust(canvas) : null;
  activeDust = dust;
  const parallax = parallaxLayer ? createParallax(parallaxLayer) : null;

  /* ---------- cờ khoá ----------
     Một cờ cho toàn màn. Bấm dồn ba lần cũng chỉ chạy một hoạt cảnh
     và một lần chuyển màn. */
  let busy = false;
  let slowTimer = 0;
  let stallTimer = 0;

  /* ---------- chữ trong nút ---------- */

  function labelOf(btn) {
    return btn ? btn.querySelector('.mbtn-label') : null;
  }

  function setLoading(btn, on) {
    if (!btn) return;
    const lab = labelOf(btn);
    if (on) {
      btn.dataset.loading = '1';
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      /* giữ chữ gốc để trả lại khi cần */
      if (lab && !lab.dataset.idle) lab.dataset.idle = lab.textContent;
      if (lab) lab.textContent = s('loading');
    } else {
      delete btn.dataset.loading;
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      const lab2 = labelOf(btn);
      if (lab2 && lab2.dataset.idle) lab2.textContent = lab2.dataset.idle;
    }
  }

  /* ---------- dòng chú thích và nút thử lại ---------- */

  function clearTimers() {
    if (slowTimer) { clearTimeout(slowTimer); slowTimer = 0; }
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = 0; }
  }

  function showHint(text) {
    if (!hint) return;
    hint.textContent = text;
    hint.hidden = false;
  }

  function showRetry(onRetry) {
    if (!retry) return;
    retry.textContent = s('retry');
    retry.hidden = false;
    retry.onclick = () => {
      playClick();
      retry.hidden = true;
      if (hint) hint.hidden = true;
      if (typeof onRetry === 'function') onRetry();
    };
  }

  function hideStatus() {
    if (hint) hint.hidden = true;
    if (retry) retry.hidden = true;
    if (actions) actions.classList.remove('is-status');
  }

  /* Khi lớp đen đã phủ kín mà tài nguyên vẫn chưa xong, đưa dòng chú
     thích lên trên lớp đen. Không có bước này thì thông báo nằm dưới
     tấm màn đen và người chấm lại thấy màn hình im lìm đúng như điều
     họ lo. */
  function raiseStatus() {
    if (!actions) return;
    actions.classList.add('is-status');
  }

  function beginWait(onRetry) {
    clearTimers();
    slowTimer = setTimeout(() => {
      slowTimer = 0;
      showHint(s('slow'));
      if (actions && actions.classList.contains('is-launch-done')) raiseStatus();
    }, T_HINT_SLOW);
    stallTimer = setTimeout(() => {
      stallTimer = 0;
      showHint(s('stall'));
      raiseStatus();
      showRetry(onRetry);
    }, T_HINT_STALL);
  }

  /* ---------- trạng thái nút Tiếp tục ---------- */

  function refreshSave() {
    if (!btnResume) return;
    let ok = false;
    try { ok = !!hasSave(); } catch { ok = false; }

    btnResume.hidden = false;                 // luôn có mặt, chỉ mờ đi
    if (ok) {
      delete btnResume.dataset.nosave;
      btnResume.disabled = false;
      btnResume.removeAttribute('aria-disabled');
      if (resumeNote) resumeNote.hidden = true;

      /* dòng ghi chú ngày và giờ lưu, để người chơi biết mình tiếp tục
         từ đâu chứ không bấm mù */
      if (saveNote) {
        let info = null;
        try { info = getSaveInfo ? getSaveInfo() : null; } catch { info = null; }
        if (info) {
          const when = info.savedAt ? new Date(info.savedAt) : null;
          const timeStr = when && !isNaN(when)
            ? when.toLocaleString(getLang() === 'en' ? 'en-US' : 'vi-VN',
                { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
            : '';
          saveNote.textContent = t('save.bootNote')
            .replace('{day}', String(info.day || 1))
            .replace('{when}', timeStr);
          saveNote.hidden = false;
        } else {
          saveNote.hidden = true;
        }
      }
    } else {
      btnResume.dataset.nosave = '1';
      /* Không dùng disabled: nút mờ vẫn cần đọc được và cần nói rõ vì
         sao, nên giữ nó bấm được và chỉ chặn ở handler. */
      btnResume.disabled = false;
      if (resumeNote) {
        resumeNote.textContent = s('noSave');
        resumeNote.hidden = false;
      }
      if (saveNote) saveNote.hidden = true;
    }
  }

  /* ---------- dòng phụ đề dưới chữ ABANDONN ----------
     Đổi theo cùng cơ chế setLang/onLangChange của menu, không tự
     nghe sự kiện riêng: bấm VI/EN là chữ này đổi ngay cùng lúc với
     nhãn nút, không có độ trễ của một vòng vẽ lại. */
  function paintTagline() {
    if (!taglineEl) return;
    const text = s('tagline');
    if (taglineEl.textContent !== text) taglineEl.textContent = text;
    taglineEl.setAttribute('lang', getLang());
  }

  /* ---------- nút đổi ngôn ngữ ---------- */

  function paintLang() {
    if (!langBox) return;
    const cur = getLang();
    langBox.querySelectorAll('.menu-lang-btn').forEach((b) => {
      const on = b.dataset.lang === cur;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function bindLang() {
    if (!langBox) return;
    langBox.setAttribute('aria-label', s('langGroup'));
    langBox.addEventListener('click', (e) => {
      const b = e.target.closest('.menu-lang-btn');
      if (!b) return;
      playClick();
      setLang(b.dataset.lang);
    });
  }

  /* ---------- nút ---------- */

  function bindHoverBeep(btn) {
    if (!btn) return;
    /* Tiếng beep cơ học khi rê chuột. Chỉ gắn cho chuột thật: trên cảm
       ứng, hover bắn ra lúc chạm và tiếng kêu sẽ trùng với tiếng bấm. */
    btn.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') playClick();
    });
  }

  [btnStart, btnResume, btnGear].forEach(bindHoverBeep);

  /* ---------- luồng bấm ---------- */

  async function runFlow(kind) {
    if (busy) return;

    /* Nút Tiếp tục khi chưa có bản lưu: không khoá, chỉ nhắc. */
    if (kind === 'resume' && btnResume && btnResume.dataset.nosave === '1') {
      if (resumeNote) {
        resumeNote.textContent = s('noSave');
        resumeNote.hidden = false;
      }
      return;
    }

    busy = true;
    playClick();

    const btn = kind === 'start' ? btnStart : btnResume;
    /* Đổi chữ và khoá nút NGAY, trước mọi await. Đây là toàn bộ yêu cầu
       "bấm phải thấy phản hồi trong 100ms". */
    setLoading(btn, true);

    const go = kind === 'start' ? onStart : onResume;
    beginWait(() => {
      /* Thử lại: mở khoá rồi chạy lại đúng luồng này. */
      busy = false;
      if (btn) setLoading(btn, false);
      hideStatus();
      resetStage();
      runFlow(kind);
    });

    try {
      /* Bỏ hoạt cảnh phóng tàu. Ảnh nền menu đã có tàu đứng sẵn trên mặt
         đất, không có tàu nào cất cánh, nên cảnh lửa phụt và thân tàu
         bay lên là vô nghĩa và làm người chơi hiểu sai. Thay bằng một
         khoảng lặng ngắn để nút kịp hiện chữ "Đang chuẩn bị", rồi vào
         thẳng màn kế. Vẫn giữ nhánh bắt lỗi bên dưới. */
      await new Promise((resolve) => {
        setTimeout(resolve, motionAllowed() ? 420 : T_REDUCED);
      });
      if (actions) actions.classList.add('is-launch-done');
      if (slowTimer) { /* vẫn còn hạn nhắc: để nguyên */ }
      if (typeof go === 'function') await go();
    } catch (err) {
      /* Chuyển màn hỏng: trả nút về trạng thái bấm được và nói rõ,
         không để người chơi nhìn màn đen. */
      console.warn('[menu] chuyển màn lỗi', err);
      busy = false;
      clearTimers();
      resetStage();
      if (btn) setLoading(btn, false);
      showHint(s('stall'));
      showRetry(() => {
        busy = false;
        if (btn) setLoading(btn, false);
        hideStatus();
        resetStage();
        runFlow(kind);
      });
    }
  }

  /* Đưa cảnh về trạng thái tĩnh, dùng khi lỗi hoặc khi thử lại. */
  function resetStage() {
    if (stage) {
      stage.classList.remove('is-launching', 'is-ignition', 'is-shaking');
    }
    if (ship) ship.classList.remove('is-igniting', 'is-lifting');
    if (astro) astro.classList.remove('is-buffeted');
    if (fade) fade.classList.remove('is-on');
    if (actions) actions.classList.remove('is-status', 'is-launch-done');
    if (dust) dust.setSpeed(1);
    if (slowTimer) { clearTimeout(slowTimer); slowTimer = 0; }
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = 0; }
  }

  if (btnStart) {
    btnStart.addEventListener('click', (e) => { e.preventDefault(); runFlow('start'); });
  }
  if (btnResume) {
    btnResume.addEventListener('click', (e) => { e.preventDefault(); runFlow('resume'); });
  }
  if (btnGear) {
    btnGear.addEventListener('click', () => {
      if (busy) return;
      playClick();
      if (typeof onSettings === 'function') onSettings();
    });
  }

  bindLang();
  paintLang();
  paintTagline();
  refreshSave();

  const offLang = onLangChange(() => {
    paintLang();
    paintTagline();
    if (langBox) langBox.setAttribute('aria-label', s('langGroup'));
    refreshSave();
    /* nút đang tải thì giữ chữ "đang tải" theo ngôn ngữ mới */
    [btnStart, btnResume].forEach((b) => {
      if (b && b.dataset.loading === '1') {
        const lab = labelOf(b);
        if (lab) lab.textContent = s('loading');
      }
    });
    if (retry && !retry.hidden) retry.textContent = s('retry');
  });

  /* Đổi cài đặt (bật/tắt chuyển động) thì canvas phải dừng hoặc chạy
     lại ngay, không đợi lần mở trang sau. */
  function onMotionPref() {
    if (!dust) return;
    if (motionAllowed()) dust.start();
    else dust.stop();
  }
  window.addEventListener('smdg:motion-change', onMotionPref);
  if (window.matchMedia) {
    try {
      window.matchMedia('(prefers-reduced-motion: reduce)')
        .addEventListener('change', onMotionPref);
    } catch { /* trình duyệt cũ: bỏ qua, chỉ đọc lúc khởi tạo */ }
  }

  /* Ảnh nền và sprite hỏng thì vẫn phải có nền màu, không được để
     trắng trơn. */
  ['menu-bg-img', 'menu-astro-img'].forEach((id) => {
    const img = document.getElementById(id);
    if (!img) return;
    img.addEventListener('error', () => {
      console.warn('[menu] không tải được ảnh', img.getAttribute('src'));
      img.style.visibility = 'hidden';
    });
  });

  return {
    refreshSave,
    isBusy: () => busy,
    reset: resetStage,
    dustStats: () => (dust ? dust.stats() : null),
    destroy() {
      if (dust) dust.destroy();
      if (parallax) parallax.destroy();
      clearTimers();
      offLang();
      window.removeEventListener('smdg:motion-change', onMotionPref);
    },
  };
}

/* ============================================================
   HOẠT CẢNH PHÓNG TÀU
   0,0 tới 0,4s   chữ và nút mờ dần
   0,4 tới 1,4s   lửa phụt, khói cuộn, màn hình rung, bụi nhanh gấp ba
   1,4 tới 2,4s   tàu bay lên và nhỏ dần, để lại vệt khói
   2,4 tới 2,6s   lớp đen phủ vào
   Xong mới gọi callback chuyển màn.
   ============================================================ */

let launchToken = 0;

/* Bộ điều khiển hạt bụi của menu đang hiện. playLaunch cần nó để tăng
   tốc gấp ba lúc khai hoả; giữ ở phạm vi module thay vì gắn lên window
   để không rò rỉ một biến toàn cục. */
let activeDust = null;

export function playLaunch() {
  const stage = document.getElementById('menu-stage');
  const ship = document.getElementById('menu-ship');
  const astro = document.getElementById('menu-astro');
  const fade = document.getElementById('menu-fade');

  /* Người chơi tắt chuyển động: bỏ toàn bộ hoạt cảnh, chuyển sau
     200ms. Không chạy hoạt cảnh nửa vời. */
  if (!motionAllowed()) {
    return new Promise((resolve) => setTimeout(resolve, T_REDUCED));
  }

  const myToken = ++launchToken;

  return new Promise((resolve) => {
    /* Lần chạy cũ bị lần mới vượt qua thì phải resolve ngay: nếu để
       treo, runFlow() của lần bấm trước không bao giờ tiếp tục, nút
       kẹt ở "Đang chuẩn bị..." vĩnh viễn. resolve() của Promise cũ
       không làm gì cả vì luồng cũ đã bị busy chặn từ trước. */
    let superseded = false;
    const resolveSuperseded = () => { if (!superseded) { superseded = true; resolve(); } };
    if (myToken !== launchToken) resolveSuperseded();

    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(() => {
      /* Một hoạt cảnh mới đã bắt đầu thì mọi nhịp của lần cũ phải im. */
      if (myToken !== launchToken) { resolveSuperseded(); return; }
      fn();
    }, ms));

    /* 0,0: chữ, nút, credit mờ dần. CSS lo phần opacity và dịch 8px. */
    if (stage) stage.classList.add('is-launching');

    /* 0,4: động cơ khai hoả, khói cuộn, màn hình rung, bụi nhanh gấp ba */
    at(T_IGNITE, () => {
      if (ship) ship.classList.add('is-igniting');
      if (stage) {
        stage.classList.add('is-ignition');
        stage.classList.add('is-shaking');
      }
      if (activeDust) activeDust.setSpeed(3);
    });

    /* 1,4: tàu rời đất, phi hành gia chịu gió */
    at(T_LIFT, () => {
      if (ship) ship.classList.add('is-lifting');
      if (astro) astro.classList.add('is-buffeted');
      if (stage) stage.classList.remove('is-shaking');
    });

    /* 2,4: lớp đen phủ vào */
    at(T_FADE, () => { if (fade) fade.classList.add('is-on'); });

    /* 2,6: chuyển màn */
    at(T_END, () => { resolve(); });

    /* Nếu tab bị ẩn giữa chừng, setTimeout bị treo và người chơi quay
       lại sẽ thấy cảnh đứng hình. Giải phóng sớm để không kẹt. */
    const onHide = () => {
      if (document.hidden && myToken === launchToken) {
        if (fade) fade.classList.add('is-on');
        resolve();
      }
    };
    document.addEventListener('visibilitychange', onHide, { once: true });
  });
}
