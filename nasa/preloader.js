/* ============================================================
   preloader.js
   Màn chờ tải tài nguyên, hiện TRƯỚC khi vào game.

   Vì sao cần: trên mạng yếu, ảnh comic và sprite tải chậm, màn mở
   đầu dựng lên khi còn thiếu ảnh thì người chơi thấy khung trống và
   thứ tự khung truyện bị nhảy. Tải đủ rồi mới cho vào game.

   Cách dùng:
     import { startPreloader, runPreloader } from './preloader.js';

     startPreloader();                 // gọi ngay khi trang vừa mở
     await runPreloader();             // chờ, dùng lại đúng tiến trình đó

   runPreloader() gọi nhiều lần trả về CÙNG một Promise, nên không có
   chuyện mở hai màn chờ chồng nhau.

   Mọi đường dẫn dựng từ new URL('.', import.meta.url), không dùng
   location.href: trang được phục vụ ở /nasa không có dấu chéo cuối.
   ============================================================ */

const BASE = new URL('.', import.meta.url).href;

/* Toàn bộ thời gian tải bị chặn ở mức này. Hết giờ thì cho vào game
   dù còn thiếu, vì treo người chơi ở màn chờ còn tệ hơn thiếu một
   tấm ảnh. */
const TOTAL_TIMEOUT_MS = 12000;

/* Riêng tệp nhạc nền có hạn chờ ngắn hơn hẳn. Nhạc nền nặng gần 2 MB
   và không phải thứ chặn màn mở đầu: audio.js vẫn tự phát nó sau khi
   người chơi bấm, trình duyệt tải tiếp trong lúc chơi. Bắt người chơi
   đứng chờ tệp này tới sát hạn 12 giây là đánh đổi sai. Quá hạn này
   thì đếm vào nhóm lỗi, ghi cảnh báo, và đi tiếp. */
const AUDIO_GRACE_MS = 4000;

/* Số tài nguyên tải song song cùng lúc. Sáu là mức trình duyệt mở
   được trên một tên miền mà không xếp hàng quá lâu, và không làm
   nghẽn băng thông của người chơi mạng yếu. */
const CONCURRENCY = 6;

/* Khoảng chờ sau khi thanh chạm 100 phần trăm, trước khi mờ dần. */
const HOLD_MS = 200;
/* Thời gian mờ dần của cả lớp phủ. */
const FADE_MS = 400;
/* Thời gian giữ thông báo lỗi trước khi tự ẩn. */
const WARN_MS = 3000;

/* ---------- danh sách tài nguyên ---------- */

/* Mười hai khung comic của màn mở đầu. Đánh số hai chữ số cho khớp
   với tên file trong assets/art/. */
const COMIC = Array.from({ length: 12 }, (_, i) =>
  `assets/art/screen-${String(i + 1).padStart(2, '0')}.webp`);

/* Sprite nhân vật và ảnh nền màn căn cứ. */
const SPRITES = [
  'assets/art/char-healthy.webp',
  'assets/art/char-tired.webp',
  'assets/art/char-cold.webp',
];

const HAB_BG = [
  'assets/art/bg-hab.webp',
  'assets/art/bg-farm.webp',
  'assets/art/bg-radio.webp',
  'assets/art/bg-workbench.webp',
  'assets/art/bg-airlock.webp',
];

const AUDIO = 'assets/audio/ambient.mp3';

/* ---------- chữ song ngữ ----------
   Không đọc từ i18n.js ở cấp module: file này chạy ngay khi trang
   mở, sớm hơn phần còn lại, và một lỗi nạp i18n không được phép làm
   hỏng màn chờ. Đọc ngôn ngữ một lần trong lúc dựng, hỏng thì dùng
   tiếng Việt. */

const TEXT = {
  vi: {
    mission: 'ARES III · Chuẩn bị phòng điều khiển',
    images: 'Đang nạp hình ảnh',
    audio: 'Đang nạp âm thanh',
    almost: 'Sắp xong',
    fail: (n) => `${n} tệp chưa tải được, vẫn vào được game`,
    label: 'Đang tải tài nguyên',
  },
  en: {
    mission: 'ARES III · Preparing the control room',
    images: 'Loading images',
    audio: 'Loading audio',
    almost: 'Almost ready',
    fail: (n) => `${n} file could not be loaded, you can still play`,
    label: 'Loading resources',
  },
};

function strings() {
  let lang = 'vi';
  try {
    const stored = localStorage.getItem('smdg.lang');
    if (stored === 'en' || stored === 'vi') lang = stored;
  } catch (e) { /* trình duyệt chặn lưu trữ thì dùng tiếng Việt */ }
  return TEXT[lang] || TEXT.vi;
}

/* ---------- trạng thái chuyển động ---------- */

/* Tôn trọng cả thiết lập hệ điều hành lẫn công tắc trong bảng cài
   đặt của game (settings-ui.js gắn class motion-off lên thẻ html).
   Đọc thêm bản lưu cài đặt, vì lúc màn chờ dựng lên thì settings-ui
   chưa kịp chạy và class motion-off chưa có trên thẻ html. */
function motionOff() {
  try {
    if (document.documentElement.classList.contains('motion-off')) return true;
    const raw = localStorage.getItem('smdg.settings');
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.motion === false) return true;
    }
  } catch (e) { /* bản lưu hỏng hoặc bị chặn thì xét tiếp bên dưới */ }
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  } catch (e) { /* không đọc được thì coi như bật chuyển động */ }
  return false;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- tải một tài nguyên ---------- */

function loadImage(url, signal) {
  return new Promise((resolve, reject) => {
    /* Tín hiệu đã huỷ trước khi bắt đầu thì đừng bắt đầu. Thiếu bước
       này, ảnh khởi động sau khi hết hạn chờ sẽ treo mãi: listener
       'abort' gắn vào một tín hiệu đã huỷ rồi thì không bao giờ chạy
       lại, nên không còn gì gỡ được nó. */
    if (signal.aborted) { reject(new Error(`hết giờ tải ảnh ${url}`)); return; }
    const img = new Image();
    img.decoding = 'async';
    const onAbort = () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      reject(new Error(`hết giờ tải ảnh ${url}`));
    };
    img.onload = () => {
      signal.removeEventListener('abort', onAbort);
      resolve(img);
    };
    img.onerror = () => {
      signal.removeEventListener('abort', onAbort);
      reject(new Error(`không tải được ảnh ${url}`));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    img.src = url;
  });
}

/* Âm thanh: chỉ tải và giữ trong cache, KHÔNG phát. Phát sớm sẽ bị
   trình duyệt chặn vì chưa có tương tác, và không cần thiết.

   Hai đường tải, vì fetch một mình không đủ chắc: một số proxy và
   chế độ tiết kiệm dữ liệu trả 204 rỗng cho tệp media, có nơi chặn
   hẳn. Thẻ Audio preload='auto' đi qua đúng đường tải media của trình
   duyệt nên qua được những chỗ đó. Thử fetch trước, hỏng thì lật sang
   thẻ Audio; cả hai hỏng mới tính là lỗi. */
async function loadAudio(url, signal) {
  try {
    const res = await fetch(url, { cache: 'force-cache', signal });
    if (res.ok && res.status !== 204) {
      const buf = await res.arrayBuffer();
      if (buf && buf.byteLength > 512) return;
    }
  } catch (e) {
    if (signal.aborted) throw e;
    /* rơi xuống đường thẻ Audio bên dưới */
  }
  if (signal.aborted) throw new Error('hết giờ tải âm thanh');
  await loadAudioElement(url, signal);
}

/* Đường dự phòng: để trình duyệt tự tải tệp media về cache, chờ tới
   khi có đủ dữ liệu để phát là xong. Không gọi play(). */
function loadAudioElement(url, signal) {
  return new Promise((resolve, reject) => {
    const el = new Audio();
    el.preload = 'auto';
    el.muted = true;

    const done = (fn, arg) => {
      el.removeEventListener('canplaythrough', ok);
      el.removeEventListener('loadeddata', ok);
      el.removeEventListener('error', bad);
      signal.removeEventListener('abort', onAbort);
      el.removeAttribute('src');
      el.load();
      fn(arg);
    };
    const ok = () => done(resolve);
    const bad = () => done(reject, new Error(`không tải được âm thanh ${url}`));
    const onAbort = () => done(reject, new Error(`hết giờ tải âm thanh ${url}`));

    el.addEventListener('canplaythrough', ok, { once: true });
    el.addEventListener('loadeddata', ok, { once: true });
    el.addEventListener('error', bad, { once: true });
    signal.addEventListener('abort', onAbort, { once: true });
    el.src = url;
    try { el.load(); } catch (e) { done(reject, e); }
  });
}

/* ---------- hàng đợi có giới hạn ----------
   Chạy tối đa limit việc cùng lúc; mỗi việc xong, nợ hay hỏng, đều
   gọi onSettle để đếm tiến trình. Không dùng Promise.all trực tiếp
   vì như thế sẽ bắn cả bốn chục request cùng một lúc. */
function runPool(items, limit, worker, onSettle) {
  let next = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (next < items.length) {
      const i = next++;
      try {
        await worker(items[i]);
      } catch (e) {
        /* ném tiếp cho nơi gọi qua giá trị trả về của worker */
      }
      onSettle(items[i], i);
    }
  });
  return Promise.all(runners);
}

/* ---------- giao diện ---------- */

/* Vài dòng tối thiểu, gắn thẳng từ JS chứ không đợi preloader.css.
   Lý do: thẻ <link> tới preloader.css là request riêng, và trên mạng
   chậm nó về sau khi lớp phủ đã dựng. Trong khoảng đó lớp phủ là một
   khối chữ trần nằm dưới đáy trang, xấu hơn cả màn trắng. Khối này
   lo hình học, nền và cả vòng xoay, để màn chờ trông đúng ngay từ
   khung đầu; phần trình bày còn lại vẫn ở preloader.css. */
const CRITICAL_CSS = `
.pre-root{position:fixed;inset:0;z-index:200;display:grid;place-items:center;
  background:#07090d;overflow:hidden;pointer-events:none}
.pre-root .pre-card{display:flex;flex-direction:column;align-items:center;
  text-align:center;gap:18px;width:100%;max-width:360px;padding:0 24px}
.pre-root .pre-track{position:relative;width:100%;max-width:320px;height:3px;
  background:#1b232e;border-radius:2px;overflow:hidden}
.pre-root .pre-fill{position:absolute;inset:0 auto 0 0;width:0%;
  background:#e8a33d;border-radius:2px}
.pre-root .pre-meta{display:flex;justify-content:space-between;gap:12px;
  width:100%;max-width:320px}
.pre-root .pre-emblem{display:block;width:96px;height:96px;
  animation:pre-spin-c 12s linear infinite;transform-origin:50% 50%}
.pre-root.pre-static .pre-emblem{animation:none;transform:none}
@keyframes pre-spin-c{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;

function injectCritical() {
  try {
    if (document.getElementById('pre-critical')) return;
    const st = document.createElement('style');
    st.id = 'pre-critical';
    st.textContent = CRITICAL_CSS;
    document.head.appendChild(st);
  } catch (e) { /* không chèn được thì thôi, preloader.css vẫn lo phần lớn */ }
}

function buildOverlay() {
  const S = strings();
  injectCritical();
  const root = document.createElement('div');
  root.className = 'pre-root';
  root.setAttribute('role', 'progressbar');
  root.setAttribute('aria-label', S.label);
  root.setAttribute('aria-valuemin', '0');
  root.setAttribute('aria-valuemax', '100');
  root.setAttribute('aria-valuenow', '0');

  root.innerHTML = `
    <div class="pre-card">
      <img class="pre-emblem" src="${BASE}assets/art/loading-emblem.webp"
           alt="" width="96" height="96" decoding="async"
           onerror="this.style.display='none'">
      <div class="pre-mission">${S.mission}</div>
      <div class="pre-track"><div class="pre-fill"></div></div>
      <div class="pre-meta">
        <span class="pre-status">${S.images}</span>
        <span class="pre-pct">0%</span>
      </div>
    </div>`;

  document.body.appendChild(root);
  return {
    root,
    fill: root.querySelector('.pre-fill'),
    pct: root.querySelector('.pre-pct'),
    status: root.querySelector('.pre-status'),
  };
}

/* ---------- một lần chạy ---------- */

let task = null;

async function runOnce(opts) {
  const minMs = Number.isFinite(opts.minMs) ? Math.max(0, opts.minMs) : 900;
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
  const t0 = performance.now();

  /* Dựng lớp phủ TRƯỚC mọi việc khác. Đây là thứ che khoảng trắng đầu
     tiên, nên nó phải có mặt trước cả lần import art.js bên dưới. Đặt
     sau thì mỗi lần import chậm là một khung trắng lộ ra. */
  const ui = buildOverlay();
  const S = strings();
  const fixedBits = motionOff();
  if (fixedBits) ui.root.classList.add('pre-static');

  /* Bàn giao màn chờ nhúng trong index.html (lớp .pb-root) cho lớp phủ
     này. Hai màn cùng che màn hình sẽ thành hai thanh tiến trình chồng
     nhau, nên ngay khi lớp phủ thật đã dựng xong thì lớp nhúng mờ đi.
     Gọi trong try/catch: trang nào không có lớp nhúng (hoặc file dựng
     riêng cho test) thì hàm không tồn tại, không được ném lỗi. */
  try {
    if (typeof window.__pbHide === 'function') window.__pbHide();
  } catch (e) { /* không có lớp nhúng thì thôi */ }

  /* Ảnh PHOTOS khai báo trong art.js. Nạp hỏng thì bỏ qua phần này
     chứ không làm hỏng cả màn chờ: PHOTOS chỉ là ảnh minh hoạ thêm. */
  let photos = [];
  try {
    const art = await import(new URL('art.js', import.meta.url).href);
    const decl = art && art.PHOTOS ? art.PHOTOS : {};
    const base = art && art.BASE_URL ? art.BASE_URL : BASE;
    photos = Object.values(decl).map((p) => (/^(https?:|data:|\/)/.test(p) ? p : base + p));
  } catch (e) {
    console.warn('[preloader] không đọc được PHOTOS trong art.js', e);
  }

  const imageUrls = [...COMIC, ...photos, ...SPRITES, ...HAB_BG].map((p) => (/^(https?:|\/)/.test(p) ? p : BASE + p));
  const items = [
    ...imageUrls.map((url) => ({ kind: 'img', url })),
    { kind: 'audio', url: BASE + AUDIO },
  ];
  const total = items.length;

  let settled = 0;
  let okCount = 0;
  const failed = [];
  const done = new Array(total || 0).fill(false);
  const keep = [];   // giữ tham chiếu ảnh để không bị thu hồi giữa chừng

  const paint = () => {
    const pct = total ? Math.min(100, Math.round((settled / total) * 100)) : 0;
    ui.pct.textContent = `${pct}%`;
    ui.fill.style.width = `${pct}%`;
    ui.root.setAttribute('aria-valuenow', String(pct));

    /* Trạng thái theo nhóm đang tải: ảnh trước, âm thanh sau, rồi
       "sắp xong" khi đã đếm đủ. */
    const imagesLeft = imageUrls.length - Math.min(settled, imageUrls.length);
    if (settled >= total) ui.status.textContent = S.almost;
    else if (imagesLeft > 0) ui.status.textContent = S.images;
    else ui.status.textContent = S.audio;

    if (onProgress) {
      try { onProgress(settled, total); } catch (e) { /* callback hỏng không chặn tải */ }
    }

    /* Báo số liệu THẬT về thanh của màn chờ nhúng trong index.html,
       cho trường hợp màn chờ thật chưa kịp dựng (mạng chậm) mà người
       chơi đã nhìn thấy thanh kia. Không có lớp nhúng thì bỏ qua. */
    try {
      if (typeof window.__pbProgress === 'function') window.__pbProgress(settled, total);
    } catch (e) { /* bỏ qua */ }
  };
  paint();

  const ctrl = new AbortController();
  /* Hạn chờ tính từ lúc TRANG bắt đầu nạp, không phải từ lúc hàm này
     chạy. performance.now() đếm từ mốc điều hướng, nên trên mạng chậm
     phần nạp module đã ăn mất mấy giây đầu và số đó phải bị trừ vào
     hạn chung. Tính từ lúc hàm chạy thì tổng thời gian người chơi phải
     đứng chờ vượt hẳn con số đã định. */
  const alreadyMs = performance.now();
  const budgetLeft = Math.max(0, TOTAL_TIMEOUT_MS - alreadyMs);
  const timeoutId = setTimeout(() => ctrl.abort(new Error('hết hạn chờ chung')), budgetLeft);

  const worker = async (item) => {
    try {
      if (item.kind === 'img') {
        const img = await loadImage(item.url, ctrl.signal);
        keep.push(img);
      } else {
        /* Nhạc nền có hạn chờ riêng, ngắn hơn hạn chung. Không có nó
           thì một tệp media bị nghẽn giữ người chơi ở màn chờ gần hết
           12 giây, trong khi ảnh đã sẵn sàng từ lâu. */
        const grace = new AbortController();
        const onTotalAbort = () => grace.abort(new Error('hết hạn chờ chung'));
        ctrl.signal.addEventListener('abort', onTotalAbort, { once: true });
        const graceTimer = setTimeout(() => grace.abort(new Error('quá hạn chờ nhạc nền')), AUDIO_GRACE_MS);
        try {
          await loadAudio(item.url, grace.signal);
        } finally {
          clearTimeout(graceTimer);
          ctrl.signal.removeEventListener('abort', onTotalAbort);
        }
      }
      okCount += 1;
    } catch (e) {
      failed.push(item.url);
      /* Hết hạn chờ chung thì hàng chục tài nguyên cùng bị huỷ một lúc.
         Ghi từng cái một sẽ thành một tràng cảnh báo không đọc được;
         cuối hàm có một dòng tổng kết cho trường hợp này. */
      if (!ctrl.signal.aborted) {
        console.warn('[preloader] bỏ qua tài nguyên tải hỏng:', item.url, e && e.message ? e.message : e);
      }
    }
  };

  await Promise.race([
    runPool(items, CONCURRENCY, worker, (item, idx) => {
      if (done[idx]) return;
      done[idx] = true;
      settled += 1;
      paint();
    }),
    /* Chốt chặn cuối: hết hạn chung là đi tiếp, không chờ pool. Không
       có nhánh này, ảnh đang tải dở vẫn giữ pool sống tiếp nhiều giây
       sau khi đã huỷ tín hiệu, và người chơi đứng ở màn chờ lâu hơn
       hạn đã định. Đếm nốt phần còn lại vào nhóm lỗi bên dưới. */
    new Promise((resolve) => {
      if (ctrl.signal.aborted) { resolve(); return; }
      ctrl.signal.addEventListener('abort', resolve, { once: true });
    }),
  ]);

  clearTimeout(timeoutId);
  const timedOut = ctrl.signal.aborted;

  /* Phần chưa đếm xong khi hết hạn: tính vào nhóm lỗi để con số báo
     lại đúng với thực tế, thay vì nói "xong hết" trong khi còn tệp
     đang dở. Khử trùng vì một tệp có thể vừa bị huỷ vừa chưa kịp đếm. */
  const failSet = new Set(failed);
  for (let i = 0; i < total; i += 1) {
    if (!done[i]) failSet.add(items[i].url);
  }
  const failedList = [...failSet];

  /* Giữ màn chờ đủ lâu để không chớp giật khi mạng nhanh. */
  const elapsed = performance.now() - t0;
  if (elapsed < minMs) await wait(minMs - elapsed);

  /* Chạm 100 phần trăm rồi mới rời đi, để mắt kịp thấy là đã xong. */
  ui.fill.style.width = '100%';
  ui.pct.textContent = '100%';
  ui.root.setAttribute('aria-valuenow', '100');
  ui.status.textContent = S.almost;
  if (onProgress) {
    try { onProgress(total, total); } catch (e) { /* bỏ qua */ }
  }

  /* Thông báo lỗi nằm ngoài lớp phủ, ở chân màn hình, nên vẫn đọc
     được sau khi lớp phủ đã mờ đi. Nền trong suốt, chỉ một dòng chữ
     vàng nhạt, không chặn bấm. */
  let warnEl = null;
  if (failedList.length) {
    warnEl = attachWarn(document.body, S.fail(failedList.length));
    console.warn(`[preloader] ${failedList.length}/${total} tệp chưa tải được:`, failedList);
    /* Ba giây, tính từ lúc dòng chữ hiện ra. Nó nằm ngoài lớp phủ ở
       chân màn hình nên vẫn đọc được trong lúc lớp phủ mờ đi. */
    setTimeout(() => { if (warnEl) warnEl.remove(); }, WARN_MS);
  }

  await wait(fixedBits ? 0 : HOLD_MS);

  if (fixedBits) {
    ui.root.remove();
  } else {
    ui.root.classList.add('pre-out');
    await wait(FADE_MS);
    ui.root.remove();
  }

  return {
    ok: failedList.length === 0,
    failed: failedList,
    ms: Math.round(performance.now() - t0),
    loaded: okCount,
    total,
    timeout: timedOut,
  };
}

function attachWarn(host, text) {
  const el = document.createElement('div');
  el.className = 'pre-warn';
  el.setAttribute('role', 'status');
  el.textContent = text;
  host.appendChild(el);
  return el;
}

/* ---------- API công khai ---------- */

/* Bắt đầu tải ngay, không chờ. Gọi khi trang vừa mở để màn chờ che
   khoảng trắng đầu tiên. Gọi lại thì trả về tiến trình đang chạy. */
export function startPreloader(opts = {}) {
  if (!task) task = runOnce(opts);
  return task;
}

/* Chờ tải xong. Trả Promise resolve { ok, failed, ms, loaded, total,
   timeout }. Không bao giờ reject: mọi lỗi tài nguyên đều được đếm
   vào failed để game vẫn vào được. */
export async function runPreloader(opts = {}) {
  try {
    return await startPreloader(opts);
  } catch (e) {
    /* Lỗi bất ngờ trong chính màn chờ (ví dụ không dựng được DOM) thì
       dọn phần còn lại và cho vào game. */
    console.warn('[preloader] màn chờ lỗi, bỏ qua bước tải', e);
    try {
      const r = document.querySelector('.pre-root');
      if (r) r.remove();
    } catch (_) { /* đã gỡ rồi */ }
    return { ok: false, failed: [], ms: 0, loaded: 0, total: 0, timeout: false };
  }
}

/* Cho nơi khác biết màn chờ đã chạy chưa, để nút Bắt đầu biết có phải
   chờ hay không. */
export function isPreloading() {
  return !!task;
}


/* ============================================================
   Cổng chặn chuyển cảnh (gate)
   ============================================================
   Khi chuyển giữa các màn lớn (menu → comic → story → căn cứ →
   Phase 2 → bay → tổng kết) hoặc khi bấm nút mở màn mới, nội dung
   màn mới dựng lên khi còn thiếu ảnh thì lộ khung trống. Cổng này
   hiện lớp phủ tối + huy hiệu xoay + chữ "đang tải", chờ tối thiểu
   một nhịp vẽ để màn mới kịp dựng khung, rồi mới gỡ.

   Cách dùng:
     import { gate } from './preloader.js';

     await gate(async () => {
       await openStory();          // dựng màn mới
     });

   Hành vi:
   - Lớp phủ hiện NGAY (đồng bộ) trước khi callback chạy, nên không
     có khung trắng nào kịp lộ ra.
   - Chờ tối thiểu minMs (mặc định 450ms) để hoạt cảnh chuyển cảnh
     không bị nháy quá nhanh, tối đa maxMs (mặc định 6000ms) để
     không bao giờ treo người chơi.
   - Callback ném lỗi thì vẫn gỡ lớp phủ rồi ném tiếp, không nuốt
     lỗi của người gọi.
   - Gọi lồng nhau: đếm tham chiếu, lớp phủ chỉ gỡ khi cổng ngoài
     cùng đóng. Motion off thì bỏ hoạt cảnh mờ dần.
   ============================================================ */

let gateDepth = 0;
let gateUi = null;
let gateTimer = null;

function gateMotionOff() {
  try {
    return document.documentElement.classList.contains('motion-off') ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) { return false; }
}

function gateShow(label) {
  if (gateDepth > 0) { gateDepth += 1; return; }
  gateDepth = 1;
  const S = strings();
  const root = document.createElement('div');
  root.className = 'pre-root pre-gate';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-label', label || S.label);
  root.innerHTML = `
    <div class="pre-card">
      <div class="pre-emblem" aria-hidden="true"></div>
      <div class="pre-status">${label || S.gateDefault || S.label}</div>
    </div>`;
  if (gateMotionOff()) root.classList.add('pre-static');
  document.body.appendChild(root);
  gateUi = root;
}

function gateHide() {
  gateDepth -= 1;
  if (gateDepth > 0) return;
  gateDepth = 0;
  const root = gateUi;
  gateUi = null;
  if (!root) return;
  if (gateMotionOff()) { root.remove(); return; }
  root.classList.add('pre-out');
  /* Chờ đúng thời gian mờ dần của .pre-root.pre-gate (200ms trong
     preloader.css) rồi mới gỡ. Bản cũ gỡ sau 240ms trong khi transition
     là 400ms: lớp cổng đang còn khoảng 40 phần trăm đục thì bị cắt
     ngang, và nếu màn mới là video mở đầu thì đúng lúc đó video hiện ra
     sau một tấm màn xám. */
  setTimeout(() => { try { root.remove(); } catch (_) {} }, 220);
}

/* Chạy một việc trong lúc lớp phủ chặn màn hình. Trả về kết quả của
   callback. Lỗi của callback được ném lại sau khi đã gỡ lớp phủ. */
export async function gate(job, opts = {}) {
  /* Người chơi tắt chuyển động: không có hoạt cảnh nào để chờ, nên bỏ
     luôn thời gian giữ tối thiểu. Giữ 450ms mặc định chỉ để mắt kịp
     thấy một lớp phủ đang mờ dần — không có mờ dần thì đó là 450ms
     đứng chờ vô nghĩa, và cộng với 200ms của playLaunch thành gần
     3/4 giây trước khi màn mới hiện ra. */
  const still = gateMotionOff();
  const defMin = still ? 0 : 450;
  const minMs = Number.isFinite(opts.minMs) ? (still ? 0 : Math.max(0, opts.minMs)) : defMin;
  const maxMs = Number.isFinite(opts.maxMs) ? Math.max(0, opts.maxMs) : 6000;
  const label = opts.label || null;
  gateShow(label);
  const t0 = performance.now();
  try {
    /* Chạy callback và chờ. Nếu callback chưa xong sau maxMs thì vẫn
       gỡ lớp phủ để không treo, nhưng KHÔNG huỷ công việc. */
    const work = Promise.resolve().then(job);
    const timeout = new Promise((res) => { gateTimer = setTimeout(res, maxMs); });
    await Promise.race([work, timeout]);
    clearTimeout(gateTimer);
    /* Đảm bảo lớp phủ hiện ít nhất minMs để không nháy. */
    const left = minMs - (performance.now() - t0);
    if (left > 0) await new Promise((r) => setTimeout(r, left));
    return await work;
  } finally {
    clearTimeout(gateTimer);
    gateHide();
  }
}

/* Bản tiện lợi cho việc chỉ cần chặn một nhịp dựng màn: hiện lớp phủ,
   chờ một requestAnimationFrame (màn mới kịp sơn khung đầu), gỡ. */
export async function gateFrame(minMs = 450) {
  return gate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))), { minMs });
}
