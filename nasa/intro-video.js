/* ============================================================
   intro-video.js
   Phân đoạn mở đầu (3–8 giây) phát ngay sau khi người chơi bấm
   Bắt đầu ở màn khởi động, trước khi vào phần kể chuyện.

   Luồng:
     1. Nếu người chơi tắt chuyển động (getSettings().motion === false)
        hoặc hệ điều hành bật prefers-reduced-motion: reduce
        → resolve ngay lập tức, vào thẳng truyện.
     2. Tạo lớp phủ toàn màn hình (.intro-overlay) với nền đen sẵn,
        kết hợp:
          - Lớp nền vũ trụ / Sao Hoả quay chậm + vệt tàu bay bằng
            CSS + SVG thuần (luôn sẵn sàng, không chớp trắng).
          - Video thực (assets/video/intro.mp4, câm hoàn toàn) phủ
            lên trên khi tải và phát thành công.
          - Chữ điện ảnh ARES III · ACIDALIA PLANITIA hiện dần.
          - Nút Bỏ qua hiện ở góc dưới phải sau 1 giây (hoặc bấm
            Space / Enter để qua ngay).
     3. Nếu video lỗi (404, mạng chặn, hoặc trình duyệt chặn phát)
        → tự động bỏ qua và vào thẳng truyện, không treo màn hình đen.
     4. Khi video kết thúc hoặc người chơi bấm Bỏ qua → làm mờ ngắn
        (.is-leaving) rồi gỡ DOM và resolve Promise.
   ============================================================ */

import { getSettings } from './settings.js';
import { getLang, onLangChange } from './i18n.js';

const COPY = {
  vi: {
    kicker: 'HỒI KÝ SỨ MỆNH · NASA ARES PROGRAM',
    title: 'ARES III',
    sub: 'ACIDALIA PLANITIA · SOL 1 — SOL 19',
    skip: 'Bỏ qua',
    skipHint: 'Space / Enter',
  },
  en: {
    kicker: 'MISSION ARCHIVE · NASA ARES PROGRAM',
    title: 'ARES III',
    sub: 'ACIDALIA PLANITIA · SOL 1 — SOL 19',
    skip: 'Skip',
    skipHint: 'Space / Enter',
  },
};

/* Hằng số ảnh 1×1 đen tuyền làm poster để thẻ <video> không bao giờ
   chớp khung trắng trước khi khung hình đầu tiên giải mã xong. */
const BLACK_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';

function resolveBase() {
  if (typeof window !== 'undefined' && window.__BASE__) return window.__BASE__;
  const parts = location.pathname.split('/');
  if (parts[parts.length - 1].indexOf('.') !== -1) parts[parts.length - 1] = '';
  return location.origin + parts.join('/').replace(/\/?$/, '/');
}

function shouldSkipForMotion() {
  try {
    const s = getSettings();
    if (s && s.motion === false) return true;
  } catch {
    /* bỏ qua nếu settings chưa sẵn sàng */
  }
  if (document.documentElement.classList.contains('motion-off')) return true;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return true;
  }
  return false;
}

/**
 * Phát phân đoạn mở đầu ngắn (khoảng 6.5 giây).
 * @param {Object} [options]
 * @param {string} [options.src] Đường dẫn video tuỳ chọn (mặc định: assets/video/intro.mp4)
 * @returns {Promise<void>} Resolve khi kết thúc hoặc được bỏ qua.
 */
export function playIntro(options = {}) {
  if (shouldSkipForMotion()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const base = resolveBase();
    const videoUrl = options.src || base + 'assets/video/intro.mp4';
    const lang = getLang() === 'en' ? 'en' : 'vi';
    const text = COPY[lang];

    let finished = false;
    let skipShown = false;
    let skipTimer = null;
    let safetyTimer = null;
    let fadeTimer = null;
    let blobUrl = null;
    const abortCtrl = new AbortController();

    /* ---------- dựng DOM overlay ---------- */
    const el = document.createElement('div');
    el.className = 'intro-overlay';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', text.title);

    el.innerHTML = `
      <div class="intro-stage" aria-hidden="true">
        <!-- Lớp cinematic CSS + SVG thuần: sao lấp lánh, Sao Hoả quay chậm, vệt tàu bay -->
        <div class="intro-cosmos">
          <div class="intro-stars intro-stars-far"></div>
          <div class="intro-stars intro-stars-near"></div>
          <svg class="intro-planet-svg" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
            <defs>
              <radialGradient id="intro-mars-atmo" cx="50%" cy="50%" r="50%">
                <stop offset="58%" stop-color="#e87a3d" stop-opacity="0"/>
                <stop offset="76%" stop-color="#d96932" stop-opacity="0.22"/>
                <stop offset="86%" stop-color="#f2a263" stop-opacity="0.38"/>
                <stop offset="94%" stop-color="#4fb8c9" stop-opacity="0.12"/>
                <stop offset="100%" stop-color="#06090f" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="intro-mars-body" cx="36%" cy="34%" r="64%">
                <stop offset="0%" stop-color="#d8753b"/>
                <stop offset="38%" stop-color="#a8471d"/>
                <stop offset="72%" stop-color="#57200b"/>
                <stop offset="94%" stop-color="#180904"/>
                <stop offset="100%" stop-color="#070404"/>
              </radialGradient>
              <clipPath id="intro-mars-clip">
                <circle cx="400" cy="400" r="220"/>
              </clipPath>
              <linearGradient id="intro-ship-trail" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4fb8c9" stop-opacity="0"/>
                <stop offset="75%" stop-color="#e8a33d" stop-opacity="0.55"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0.95"/>
              </linearGradient>
            </defs>

            <!-- Quầng khí quyển mỏng quanh rìa Sao Hoả -->
            <circle cx="400" cy="400" r="268" fill="url(#intro-mars-atmo)"/>

            <!-- Khối cầu Sao Hoả -->
            <circle cx="400" cy="400" r="220" fill="url(#intro-mars-body)"/>

            <!-- Địa hình bề mặt (Acidalia Planitia & Valles Marineris) quay chậm -->
            <g clip-path="url(#intro-mars-clip)">
              <g class="intro-mars-surface">
                <path d="M220 270 Q320 230 410 265 T580 280 L560 340 Q430 320 310 335 Z"
                      fill="#2b1107" opacity="0.46"/>
                <path d="M180 395 Q330 375 490 405 L540 422 Q370 408 190 416 Z"
                      fill="#1d0a04" opacity="0.62"/>
                <ellipse cx="470" cy="340" rx="74" ry="38" fill="#3a1609" opacity="0.38"/>
                <ellipse cx="310" cy="465" rx="92" ry="44" fill="#331307" opacity="0.42"/>
                <circle cx="435" cy="445" r="24" fill="none" stroke="#f09b59" stroke-width="1.2" opacity="0.22"/>
                <circle cx="355" cy="325" r="16" fill="none" stroke="#f09b59" stroke-width="1" opacity="0.18"/>
              </g>
              <!-- Bóng tối đêm (terminator) -->
              <ellipse cx="525" cy="425" rx="230" ry="240" fill="#05070b" opacity="0.68"/>
            </g>

            <!-- Vệt tàu Hermes / Ares III cắt ngang quỹ đạo -->
            <g class="intro-ship-flight">
              <line x1="90" y1="500" x2="290" y2="395" stroke="url(#intro-ship-trail)" stroke-width="2" stroke-linecap="round"/>
              <circle cx="290" cy="395" r="3" fill="#fff6e5"/>
              <circle cx="290" cy="395" r="8" fill="#e8a33d" opacity="0.38"/>
            </g>
          </svg>
        </div>

        <!-- Video thực: câm hoàn toàn, phủ kín màn hình -->
        <video class="intro-video"
               muted
               playsinline
               preload="auto"
               poster="${BLACK_POSTER}"></video>

        <div class="intro-vignette"></div>
      </div>

      <!-- Chữ điện ảnh hiện dần giữa màn -->
      <div class="intro-typography">
        <div class="intro-kicker" data-intro-i18n="kicker">${text.kicker}</div>
        <div class="intro-title" data-intro-i18n="title">${text.title}</div>
        <div class="intro-rule"></div>
        <div class="intro-sub" data-intro-i18n="sub">${text.sub}</div>
      </div>

      <!-- Nút Bỏ qua góc dưới phải (hiện sau 1 giây) -->
      <button type="button" class="intro-skip" aria-label="${text.skip}">
        <span class="intro-skip-label" data-intro-i18n="skip">${text.skip}</span>
        <span class="intro-skip-key" data-intro-i18n="skipHint">${text.skipHint}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="5 4 15 12 5 20 5 4"></polygon>
          <line x1="19" y1="5" x2="19" y2="19"></line>
        </svg>
      </button>
    `;

    document.body.appendChild(el);

    const video = el.querySelector('.intro-video');
    const skipBtn = el.querySelector('.intro-skip');

    /* Luôn khoá tiếng trên thẻ video để không bao giờ phát tiếng đè lên nhạc nền */
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;

    /* Đồng bộ ngôn ngữ nếu người chơi đổi ngôn ngữ giữa chừng */
    const offLang = onLangChange((nextLang) => {
      const c = COPY[nextLang === 'en' ? 'en' : 'vi'];
      el.querySelectorAll('[data-intro-i18n]').forEach((node) => {
        const k = node.getAttribute('data-intro-i18n');
        if (c[k]) node.textContent = c[k];
      });
      skipBtn.setAttribute('aria-label', c.skip);
    });

    /* ---------- dọn dẹp & thoát ---------- */
    function cleanup() {
      clearTimeout(skipTimer);
      clearTimeout(safetyTimer);
      clearTimeout(fadeTimer);
      abortCtrl.abort();
      window.removeEventListener('keydown', onKeyDown, true);
      offLang();
      try {
        video.pause();
        video.removeAttribute('src');
        video.remove();
      } catch {
        /* bỏ qua */
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
    }

    function finish({ immediate = false } = {}) {
      if (finished) return;
      finished = true;
      window.removeEventListener('keydown', onKeyDown, true);
      clearTimeout(skipTimer);
      clearTimeout(safetyTimer);

      if (immediate || shouldSkipForMotion()) {
        cleanup();
        el.remove();
        resolve();
        return;
      }

      el.classList.add('is-leaving');
      fadeTimer = setTimeout(() => {
        cleanup();
        el.remove();
        resolve();
      }, 420);
    }

    /* ---------- phím tắt Space / Enter để bỏ qua ---------- */
    function onKeyDown(e) {
      if (finished) return;
      /* Nếu bảng cài đặt đang mở thì không nuốt phím của bảng cài đặt */
      if (document.querySelector('.settings-modal.open, .settings-backdrop.open')) return;
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        finish();
      }
    }

    window.addEventListener('keydown', onKeyDown, true);

    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      finish();
    });

    /* Hiện nút Bỏ qua sau đúng 1 giây */
    skipTimer = setTimeout(() => {
      if (finished) return;
      skipShown = true;
      skipBtn.classList.add('is-visible');
    }, 1000);

    /* Chuẩn thời lượng cinematic ~6.4 giây: khi video kết thúc tự nhiên
       hoặc hết thời lượng cinematic CSS+SVG thì chuyển mượt vào truyện. */
    safetyTimer = setTimeout(() => {
      finish();
    }, 6400);

    /* ---------- nạp và phát video ---------- */
    video.addEventListener('playing', () => {
      if (finished) return;
      el.classList.add('is-video-ready');
    });

    video.addEventListener('ended', () => {
      finish();
    });

    /* Tải và kiểm tra file video qua fetch:
       Nếu file video bị chặn hoặc trả về lỗi (404 / network error)
       → tự động bỏ qua ngay lập tức và vào thẳng màn kể chuyện,
       tuyệt đối không treo màn hình đen. */
    fetch(videoUrl, { signal: abortCtrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.blob();
      })
      .then((blob) => {
        if (finished) return;
        if (!blob || blob.size === 0) throw new Error('Empty video');
        blobUrl = URL.createObjectURL(blob);
        video.src = blobUrl;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            /* Nếu trình duyệt chặn hoặc không có bộ giải mã video phần cứng,
               lớp cinematic CSS + SVG (.intro-cosmos) vẫn đang chạy mượt
               và sẽ tự động chuyển cảnh khi hết 6.4s hoặc bấm Bỏ qua. */
          });
        }
      })
      .catch((err) => {
        if (err && err.name === 'AbortError') return;
        finish({ immediate: true });
      });
  });
}
