/* ============================================================
   prologue.js
   Màn mở đầu mới: MƯỜI HAI KHUNG TRUYỆN TRANH ĐỘNG, KHÔNG LỜI THOẠI.

   Khác biệt cốt lõi so với story.js cũ (24 lượt có chữ): ở đây không
   có bong bóng thoại, không phụ đề, không chú thích, không số khung,
   không tiêu đề. Người chơi hiểu chuyện bằng mắt. Thứ duy nhất có
   chữ trên màn hình là nút Bỏ qua ở góc dưới phải.

   Cách dựng: mỗi nhịp (beat) là một BỐ CỤC các ô tranh đặt trên một
   sân khấu tuyệt đối. Ô tranh được tái dùng giữa các nhịp, nên hiệu
   ứng "cái khung cũ thu nhỏ lại rồi khung mới hiện lớn bên cạnh" chỉ
   là đổi hình chữ nhật của cùng một phần tử: CSS chuyển vị trí và
   kích thước, mắt thấy ô cũ co lại đúng như phác thảo.

   Ảnh: assets/art/screen-01.webp tới screen-12.webp. Ảnh chưa có thì
   ô tranh tự hiện nền gradient tối, luồng chạy không dừng. Khi file
   xuất hiện, lần chơi sau ảnh tự hiện, không phải sửa code.

   Giao kèo với bên ngoài (giống story.js cũ để index.html đổi ít):
       startPrologue({ container, onDone }) -> { destroy() }

   Mọi đường dẫn ảnh ghép từ BASE_URL của art.js, KHÔNG dùng
   location.href và không ghép tương đối vào img.src.
   ============================================================ */

import { BASE_URL } from './art.js';
import { t, onLangChange } from './i18n.js';
import { getSettings } from './settings.js';
import { playOneShotSfx, stopAllSceneSfx } from './audio-sfx.js';

/* ============================================================
   KHE NHẠC NỀN CHO PROLOGUE
   Bốn chỗ chờ sẵn. Chỉ cần bỏ file vào assets/audio/prologue/
   đúng tên, không phải sửa dòng code nào.

   Tên file và ý đồ:
     theme-open.mp3    nhạc vào, từ nhịp 1 tới nhịp 3
     theme-storm.mp3   dồn dập khi bão ập tới, nhịp 4 tới 6
     theme-silence.mp3 nhịp 7 tới 8, gần như im để chuẩn bị cú nổ
     theme-hope.mp3    từ nhịp 9 tới 11, hồi lên khi tàu đi và mở mắt

   File nào chưa có thì bỏ qua êm, không lỗi, không chặn luồng.
   Nhạc tự cắt theo nhịp, có fade ngắn để không bị giật.
   ============================================================ */

const MUSIC_DIR = new URL('.', import.meta.url).href + 'assets/audio/prologue/';

/* Mỗi mục: file, nhịp bắt đầu, nhịp kết thúc (tính cả hai) */
const MUSIC_CUES = [
  { file: 'theme-open.mp3',    from: 1,  to: 3,  gain: 0.42, fadeMs: 1200 },
  { file: 'theme-storm.mp3',   from: 4,  to: 6,  gain: 0.56, fadeMs: 900  },
  { file: 'theme-silence.mp3', from: 7,  to: 8,  gain: 0.20, fadeMs: 1400 },
  { file: 'theme-hope.mp3',    from: 9,  to: 11, gain: 0.50, fadeMs: 1200 },
];

/* Trạng thái: phần tử audio đang phát, và chỉ số cue đang dùng */
let musicEl = null;
let musicCue = -1;
let musicTimer = null;

/* Nhạc chỉ phát khi người chơi bật nhạc trong cài đặt. */
function musicAllowed() {
  try {
    const st = getSettings();
    return !!(st && st.music);
  } catch { return true; }
}

function musicVolume(gain) {
  let base = 0.8;
  try { base = Math.max(0, Math.min(100, getSettings().volume)) / 100; } catch {}
  return Math.max(0, Math.min(1, base * gain));
}

/* Tắt nhạc hiện tại bằng cách hạ dần âm lượng rồi dừng, để không bị cụt. */
function stopMusic(fadeMs = 600) {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (!musicEl) return;
  const el = musicEl;
  musicEl = null;
  musicCue = -1;
  if (fadeMs <= 0) { try { el.pause(); } catch {} return; }
  const start = el.volume;
  const steps = Math.max(3, Math.round(fadeMs / 60));
  let i = 0;
  musicTimer = setInterval(() => {
    i += 1;
    const k = 1 - i / steps;
    if (k <= 0) {
      clearInterval(musicTimer); musicTimer = null;
      try { el.pause(); } catch {}
      return;
    }
    try { el.volume = Math.max(0, start * k); } catch {}
  }, 60);
}

/* Phát nhạc cho một nhịp. Gọi mỗi lần đổi nhịp, chỉ làm gì đó khi
   nhịp rơi vào cue khác cue đang chạy. */
function musicForBeat(beatNumber) {
  if (!musicAllowed()) { if (musicEl) stopMusic(400); return; }
  const want = MUSIC_CUES.findIndex((c) => beatNumber >= c.from && beatNumber <= c.to);
  if (want === -1) { if (musicEl) stopMusic(700); return; }
  if (want === musicCue) return;

  stopMusic(500);
  const cue = MUSIC_CUES[want];
  musicCue = want;

  const el = new Audio(MUSIC_DIR + cue.file);
  el.loop = true;
  el.preload = 'auto';
  el.volume = 0;
  musicEl = el;
  /* File chưa có thì bỏ qua êm. Không báo lỗi ra console vì đây là
     khe chờ, người dùng chưa bỏ nhạc vào là chuyện bình thường. */
  el.addEventListener('error', () => {
    if (musicEl === el) { musicEl = null; musicCue = -1; }
  });
  el.play().then(() => {
    if (musicEl !== el) return;
    /* Tăng dần tới âm lượng đích thay vì bật thẳng, tránh giật tai. */
    const target = musicVolume(cue.gain);
    const steps = Math.max(3, Math.round(cue.fadeMs / 60));
    let i = 0;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = setInterval(() => {
      i += 1;
      const k = i / steps;
      if (k >= 1) {
        clearInterval(musicTimer); musicTimer = null;
        try { el.volume = target; } catch {}
        return;
      }
      try { el.volume = target * k; } catch {}
    }, 60);
  }).catch(() => {
    /* Trình duyệt chặn phát thì bỏ qua, nhịp sau thử lại. */
    if (musicEl === el) { musicEl = null; musicCue = -1; }
  });
}

const FRAME_COUNT = 12;

/* Đuôi ảnh dự phòng, thử lần lượt khi webp 404. Cùng thứ tự với
   art.js để người vẽ chỉ cần ném file vào đúng thư mục. */
const FALLBACK_EXTS = ['jpg', 'jpeg', 'png', 'avif'];
const ART_STEM = 'assets/art/screen-';

const pad = (n) => String(n).padStart(2, '0');

/* ---------- bố cục ----------
   r = [x, y, w, h] tính theo phần trăm sân khấu. Đặt số ở đây, không
   đặt trong CSS, vì cùng một ô xuất hiện ở nhiều nhịp với hình chữ
   nhật khác nhau; giữ một bảng số duy nhất dễ đối chiếu phác thảo.

   Nhịp 3 là nhịp tác giả ghi rõ: khung 2 thu nhỏ thành ô góc trên
   trái, khung mới hiện LỚN bên phải. Nhịp 4 tới 6 là chuỗi ô vát
   chéo ở hàng dưới, rồi đẩy lên hàng trên để nhường chỗ ô rộng. */

/* ---------- hệ số nén thời lượng toàn cục ----------

   Giám khảo ngồi chấm không chờ được gần một phút cho màn mở đầu, mà
   mười hai khung cộng lại đúng 52.600 ms theo bảng số gốc bên dưới.
   Mục tiêu là khoảng 30 giây, đủ để đọc hết truyện mà không lê thê.

   Vì sao 0,57 chứ không phải 0,45: con số 0,45 trong bản mô tả được
   tính trên giả định tổng cũ là 70 giây, và 70 × 0,45 ≈ 31,5 giây.
   Đo lại bảng BEATS thật thì tổng chỉ 52,6 giây, nên 52,6 × 0,45 =
   23,7 giây, ngắn hơn mục tiêu khá nhiều. Giữ đúng ý đồ (khoảng 30
   giây) trên bảng số thật thì hệ số là 0,57, cho 29.982 ms.

   Nhân ở MỘT chỗ duy nhất trong hàm B() chứ không sửa từng số: tỷ lệ
   tương đối giữa các khung giữ nguyên tuyệt đối, nên khung mở mí mắt
   7600 ms vẫn là khung dài nhất (4332 ms sau khi nén). Muốn chỉnh
   nhanh toàn bộ màn mở đầu thì chỉ đổi số dưới đây. */
const PP_SCALE = 0.57;

const B = (ms, panels, extra = {}) => ({ ms: Math.round(ms * PP_SCALE), panels, ...extra });

const BEATS = [
  /* 1: một ảnh phủ kín, máy đẩy chậm vào */
  B(4900, [
    { id: 'p1', frame: 1, r: [0, 0, 100, 100], anim: 'zoom-in' },
  ], { ambient: 'storm-wind' }),

  /* 2: cắt thẳng sang ảnh mới, rung theo nhịp chân chạy */
  B(3800, [
    { id: 'p2', frame: 2, r: [0, 0, 100, 100], anim: 'jitter' },
  ], { ambient: 'storm-wind' }),

  /* 3: ảnh cũ THU NHỎ thành ô góc trên trái, ảnh mới LỚN bên phải
        trượt vào từ phải. Đây là hiệu ứng cốt lõi của phác thảo. */
  B(4900, [
    { id: 'p2', frame: 2, r: [3, 5, 30, 30] },
    { id: 'p3', frame: 3, r: [36, 5, 61, 88], anim: 'slide-right' },
  ], { ambient: 'storm-wind' }),

  /* 4: giữ ô nhỏ và ô tàu ở hàng trên, ô vát chéo mới trượt lên */
  B(4300, [
    { id: 'p2', frame: 2, r: [3, 5, 30, 30] },
    { id: 'p3', frame: 3, r: [36, 5, 61, 30] },
    { id: 'p4', frame: 4, r: [3, 39, 94, 56], anim: 'slide-up', clip: 'a' },
  ], { ambient: 'storm-wind', hit: 'metal-impact' }),

  /* 5: ô vát chéo dưới chia đôi, nửa phải trượt vào từ phải */
  B(4300, [
    { id: 'p2', frame: 2, r: [3, 5, 30, 30] },
    { id: 'p3', frame: 3, r: [36, 5, 61, 30] },
    { id: 'p4', frame: 4, r: [3, 39, 46, 56], clip: 'a' },
    { id: 'p5', frame: 5, r: [51, 39, 46, 56], anim: 'slide-right', clip: 'b' },
  ], { ambient: 'storm-wind', hit: 'metal-impact' }),

  /* 6: hai ô mặt và chân lên hàng trên, ô rộng mở ra từ giữa */
  B(4300, [
    { id: 'p4', frame: 4, r: [3, 5, 46, 37], clip: 'a' },
    { id: 'p5', frame: 5, r: [51, 5, 46, 37], clip: 'b' },
    { id: 'p6', frame: 6, r: [3, 45, 94, 50], anim: 'open-x' },
  ], { ambient: 'storm-wind' }),

  /* 7: phủ kín, viền kép kiểu trang truyện in giấy cũ, cát phủ dần,
        ảnh mờ dần về cuối nhịp */
  B(5100, [
    { id: 'p7', frame: 7, r: [0, 0, 100, 100], paper: true, sand: true, anim: 'sand-late' },
  ], { ambient: 'storm-wind' }),

  /* 8: phủ kín, góc nhìn từ trên xuống. Bão đã qua từ nhịp 7, nên từ
        đây không còn tiếng gió: khoảng lặng trước cú khai hỏa. */
  B(3400, [
    { id: 'p8', frame: 8, r: [0, 0, 100, 100], anim: 'drift-down' },
  ]),

  /* 9: phủ kín, rung mạnh theo nhịp động cơ khai hỏa */
  B(3900, [
    { id: 'p9', frame: 9, r: [0, 0, 100, 100], anim: 'shake-strong' },
  ], { hit: 'rocket-launch' }),

  /* 10: phủ kín, ảnh thu nhỏ dần về cuối nhịp, gợi cảm giác xa dần */
  B(4100, [
    { id: 'p10', frame: 10, r: [0, 0, 100, 100], anim: 'zoom-out' },
  ]),

  /* 11: phủ kín, MỞ MÍ MẮT. Nhịp chậm hơn hẳn vì đây là điểm nhấn
         cảm xúc: hai dải đen khép kín rồi mở ra, hình từ nhòe sang rõ. */
  B(7600, [
    { id: 'p11', frame: 11, r: [0, 0, 100, 100], anim: 'focus-in' },
  ], { ambient: 'hab-vent', lids: true }),

  /* 12: phủ kín, tĩnh lặng hoàn toàn, giữ 1,5 giây rồi kết thúc */
  B(2000, [
    { id: 'p12', frame: 12, r: [0, 0, 100, 100] },
  ], { silent: true }),
];

/* ---------- tiện ích ---------- */

function injectCss() {
  if (document.querySelector('link[data-prologue-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/prologue.css';
  link.dataset.prologueCss = '1';
  document.head.appendChild(link);
}

function motionOn() {
  let s = { motion: true };
  try { s = getSettings(); } catch (e) { /* chưa nạp cài đặt thì coi như bật */ }
  return s.motion !== false
    && !document.documentElement.classList.contains('motion-off');
}

/* Phát lại một lớp hiệu ứng từ đầu. Gỡ lớp, ép trình duyệt tính lại
   kiểu, rồi gắn lại. Không có bước ép này thì gắn cùng lớp hai lần
   liền nhau trình duyệt coi là không đổi và hiệu ứng không chạy. */
function restartAnim(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/* ---------- ảnh ---------- */

/* Gắn listener lỗi theo đúng cách art.js làm: mỗi lần ảnh 404 thì lấy
   đuôi kế tiếp trong data-fallbacks, ghép lại bằng BASE_URL. Tuyệt
   đối không ghép tương đối vào img.src vì img.src đang là URL của
   file hỏng, ghép vào sẽ cộng dồn thư mục và ra địa chỉ rác. */
function onImgError(e) {
  const img = e.currentTarget;
  if (!img || img.dataset.dead === '1') return;

  const chain = (img.dataset.fallbacks || '').split(';').filter(Boolean);
  const stem = img.dataset.stem || '';

  if (chain.length && stem) {
    const ext = chain.shift();
    img.dataset.fallbacks = chain.join(';');
    img.src = BASE_URL + stem + '.' + ext;
    return;
  }

  /* Hết đuôi để thử: bỏ ảnh, ô tranh giữ nền gradient tối. Luồng
     không dừng, người chơi vẫn đi hết mười hai nhịp. */
  img.dataset.dead = '1';
  const panel = img.parentElement;
  if (panel) panel.classList.add('no-art');
  img.remove();
}

function makePanel(spec) {
  const el = document.createElement('div');
  el.className = 'pp';
  el.dataset.panel = spec.id;

  const vig = document.createElement('div');
  vig.className = 'pp-vig';
  vig.setAttribute('aria-hidden', 'true');
  el.appendChild(vig);

  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  img.draggable = false;
  img.dataset.stem = ART_STEM + pad(spec.frame);
  img.dataset.fallbacks = FALLBACK_EXTS.join(';');
  img.addEventListener('error', onImgError);
  img.src = BASE_URL + img.dataset.stem + '.webp';
  el.appendChild(img);

  return { el, img };
}

/* ---------- chính ---------- */

export function startPrologue({ container, onDone } = {}) {
  injectCss();

  /* Nạp trước cả 12 ảnh ngay khi vào, để nhịp nào cũng có ảnh sẵn
     trong bộ nhớ đệm. Không có bước này thì nhịp 3 trở đi sẽ trống
     khung trong lúc chờ ảnh tải, nhất là trên mạng chậm hoặc lần đầu
     vào. Ảnh chỉ 1,74 MB tổng nên nạp hết một lượt là hợp lý.
     Dùng Image() chứ không chèn vào DOM, nên không tốn bộ nhớ hiển thị. */
  for (let i = 1; i <= 12; i++) {
    const im = new Image();
    im.src = new URL(`assets/art/screen-${String(i).padStart(2, '0')}.webp`, import.meta.url).href;
  }

  const host = container || document.body;

  const root = document.createElement('div');
  root.className = 'prologue-root';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', t('prologue.aria.stage'));

  const stage = document.createElement('div');
  stage.className = 'prologue-stage';
  root.appendChild(stage);

  /* Hai dải đen của hiệu ứng mở mí mắt. Nằm ngoài sân khấu để phủ cả
     khung hình, không phải phủ riêng một ô tranh. */
  const lids = document.createElement('div');
  lids.className = 'prologue-lids';
  lids.setAttribute('aria-hidden', 'true');
  const lidTop = document.createElement('span');
  lidTop.className = 'lid lid-top';
  const lidBot = document.createElement('span');
  lidBot.className = 'lid lid-bottom';
  lids.appendChild(lidTop);
  lids.appendChild(lidBot);
  root.appendChild(lids);

  const bar = document.createElement('div');
  bar.className = 'prologue-progress';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', t('prologue.aria.progress'));
  bar.setAttribute('aria-valuemin', '1');
  bar.setAttribute('aria-valuemax', String(FRAME_COUNT));
  const barFill = document.createElement('i');
  bar.appendChild(barFill);
  root.appendChild(bar);

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'prologue-skip';
  skip.textContent = t('prologue.skip');
  /* Nút Bỏ qua phải TO và hiện ngay từ khung đầu tiên. Bản cũ để cỡ
     chữ nhỏ bằng nhãn phụ và chỉ mờ dần hiện ra, nên người xem tưởng
     màn hình đơ và không tìm ra lối thoát. Đặt thẳng kiểu ở đây thay
     vì sửa css/prologue.css: file CSS đó không thuộc phần được phép
     sửa trong đợt này (sub khác đang chạy song song), còn nút do
     chính file này dựng nên sửa tại chỗ là gọn nhất. */
  skip.style.cssText = [
    'font-size:max(13px,calc(var(--st-size-label) * 1.18))',
    'font-weight:600',
    'letter-spacing:.16em',
    'padding:0 22px',
    'min-height:52px',
    'min-width:132px',
    'color:var(--tx-bright)',
    'background:color-mix(in srgb,var(--bg-void) 82%,transparent)',
    'border:1px solid var(--amber-dim)',
    'border-left:3px solid var(--amber)',
    'box-shadow:0 6px 22px rgba(0,0,0,.5)',
  ].join(';');
  root.appendChild(skip);

  host.appendChild(root);

  /* ---------- trạng thái ---------- */

  const live = new Map();   /* id -> { el, img } */
  const timers = new Set();
  let idx = 0;
  let done = false;
  let advanceTimer = 0;

  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  }

  function applyRect(p, r) {
    p.el.style.left = r[0] + '%';
    p.el.style.top = r[1] + '%';
    p.el.style.width = r[2] + '%';
    p.el.style.height = r[3] + '%';
  }

  function ensureSand(p) {
    if (p.el.querySelector('.pp-sand')) return;
    const sand = document.createElement('div');
    sand.className = 'pp-sand';
    sand.setAttribute('aria-hidden', 'true');
    p.el.appendChild(sand);
  }

  /* Gỡ hết lớp hiệu ứng cũ. Ô tranh được tái dùng giữa các nhịp, nếu
     không gỡ thì hiệu ứng của nhịp trước còn giữ transform và ô bị
     lệch khỏi hình chữ nhật vừa đặt. */
  function clearAnims(p) {
    Array.from(p.el.classList).forEach((c) => {
      if (c.indexOf('anim-') === 0) p.el.classList.remove(c);
    });
    Array.from(p.img.classList).forEach((c) => {
      if (c.indexOf('anim-') === 0) p.img.classList.remove(c);
    });
  }

  /* Hiện một ô. Chế độ tĩnh chỉ đổi độ mờ, không chạy hiệu ứng. */
  function reveal(p, spec, staticMode) {
    p.el.classList.add('is-in');
    if (staticMode) return;
    if (spec.anim) p.el.classList.add('anim-' + spec.anim);
  }

  /* Tiếng nền là vòng lặp: gọi lại mỗi nhịp mà không kiểm tra thì tiếng
     gió bị tua về đầu bảy lần, nghe thành từng cú giật. Giữ tên đang
     phát ở đây và chỉ phát lại khi đổi sang tiếng khác. */
  let ambientName = null;
  function ambient(name) {
    if (ambientName === name) return;
    ambientName = name;
    playOneShotSfx(name);
  }

  function render() {
    const beat = BEATS[idx];
    const staticMode = !motionOn();
    root.classList.toggle('is-static', staticMode);
    root.style.setProperty('--pp-ms', beat.ms + 'ms');

    const wanted = new Set(beat.panels.map((s) => s.id));

    /* ô không còn trong nhịp này thì mờ đi rồi gỡ */
    for (const [id, p] of live) {
      if (wanted.has(id)) continue;
      p.el.classList.add('is-out');
      live.delete(id);
      later(() => p.el.remove(), staticMode ? 240 : 460);
    }

    beat.panels.forEach((spec, order) => {
      let p = live.get(spec.id);
      const isNew = !p;
      if (isNew) {
        p = makePanel(spec);
        live.set(spec.id, p);
        /* Phải gắn vào sân khấu TRƯỚC khi gắn lớp hiệu ứng, nếu không
           hiệu ứng chạy trên phần tử chưa nằm trong tài liệu và không
           bao giờ hiện. */
        applyRect(p, spec.r);
        stage.appendChild(p.el);
      }

      if (!isNew) clearAnims(p);
      applyRect(p, spec.r);
      p.el.classList.toggle('clip-a', spec.clip === 'a');
      p.el.classList.toggle('clip-b', spec.clip === 'b');
      p.el.classList.toggle('is-paper', !!spec.paper);
      p.el.style.zIndex = String(10 + order);

      if (spec.sand) ensureSand(p);

      /* ảnh mờ dần về cuối nhịp 7 */
      if (spec.anim === 'sand-late' && !staticMode) {
        restartAnim(p.img, 'anim-blur-late');
      }

      reveal(p, spec, staticMode);
    });

    /* mí mắt: chỉ nhịp 11, và chỉ khi bật chuyển động */
    const wantLids = !!beat.lids && !staticMode;
    if (wantLids) {
      /* gỡ rồi gắn lại để animation chạy từ đầu mỗi lần vào nhịp này */
      lids.classList.remove('is-on');
      void lids.offsetWidth;
      lids.classList.add('is-on');
    } else {
      lids.classList.remove('is-on');
    }

    /* thanh tiến trình: chỉ độ dài, không số, không chữ */
    barFill.style.width = (((idx + 1) / FRAME_COUNT) * 100) + '%';
    bar.setAttribute('aria-valuenow', String(idx + 1));

    /* Nút Bỏ qua hiện NGAY từ khung đầu tiên. Bản cũ chỉ hiện từ khung
       thứ hai, tức người xem phải chờ hơn một nhịp mới thấy lối thoát.
       Giờ màn mở đầu có mặt là có nút, không chờ nhịp nào. */
    skip.classList.add('is-on');
    skip.tabIndex = 0;

    /* Nhạc nền prologue, theo khe đã chừa. Gọi ở mọi nhịp kể cả nhịp
       im lặng, để hàm tự tắt nếu nhịp đó không rơi vào cue nào. */
    musicForBeat(idx + 1);

    /* âm thanh */
    if (beat.silent) {
      stopAllSceneSfx();
      ambientName = null;
    } else {
      if (beat.ambient) {
        ambient(beat.ambient);
      } else if (ambientName) {
        /* nhịp không có tiếng nền: dừng hẳn, đừng để gió chạy tiếp */
        stopAllSceneSfx();
        ambientName = null;
      }
      /* Tiếng va đập chồng lên tiếng nền, không cắt tiếng gió. Đánh
         dấu overlay để playOneShotSfx không dừng vòng lặp đang chạy. */
      if (beat.hit) playOneShotSfx(beat.hit, { overlay: true });
    }
  }

  function schedule() {
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(advance, BEATS[idx].ms);
  }

  function go(n) {
    if (done) return;
    idx = Math.max(0, Math.min(FRAME_COUNT - 1, n));
    /* Một lỗi bất kỳ trong lúc dựng nhịp (ảnh hỏng, phần tử thiếu, âm
       thanh ném lỗi) không được để người chơi nhìn khung đứng yên.
       Bắt tại đây, ghi rõ ra console, rồi kết thúc màn mở đầu để
       index.html đi tiếp vào phần truyện. */
    try {
      render();
    } catch (err) {
      console.error('[prologue] dựng nhịp lỗi, bỏ qua màn mở đầu', err);
      finish();
      return;
    }
    schedule();
  }

  function advance() {
    if (done) return;
    if (idx >= FRAME_COUNT - 1) { finish(); return; }
    go(idx + 1);
  }

  function cleanup() {
    clearTimeout(advanceTimer);
    advanceTimer = 0;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    document.removeEventListener('keydown', onKey);
    root.removeEventListener('pointerdown', onPointer);
    skip.removeEventListener('click', onSkipClick);
    offLang();
    stopAllSceneSfx();
    /* Tắt nhạc prologue có fade, để nó không bị cụt khi bấm Bỏ qua
       giữa nhịp. Không để nhạc chạy tiếp vào màn nhập tên. */
    stopMusic(700);
    root.remove();
  }

  function finish() {
    if (done) return;
    done = true;
    cleanup();
    if (typeof onDone === 'function') onDone();
  }

  /* ---------- điều khiển ---------- */

  function onPointer(e) {
    if (e.target && e.target.closest && e.target.closest('.prologue-skip')) return;
    advance();
  }

  function onSkipClick(e) {
    e.preventDefault();
    e.stopPropagation();
    finish();
  }

  function onKey(e) {
    /* Nút Bỏ qua đang được chọn: để trình duyệt tự kích hoạt nút, không
       preventDefault rồi đi tiếp nhầm nhịp. */
    if (document.activeElement === skip) return;
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      advance();
    }
  }

  const offLang = onLangChange(() => {
    skip.textContent = t('prologue.skip');
    root.setAttribute('aria-label', t('prologue.aria.stage'));
    bar.setAttribute('aria-label', t('prologue.aria.progress'));
  });

  root.addEventListener('pointerdown', onPointer);
  skip.addEventListener('click', onSkipClick);
  document.addEventListener('keydown', onKey);

  render();
  schedule();

  return {
    destroy() {
      if (done) { if (root.isConnected) root.remove(); return; }
      done = true;
      cleanup();
    },
    get index() { return idx; },
  };
}
