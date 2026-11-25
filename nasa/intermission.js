/* ============================================================
   intermission.js
   MÀN CHUYỂN TIẾP: MƯỜI BA KHUNG TRUYỆN TRANH NỐI GIAI ĐOẠN 1 SANG
   GIAI ĐOẠN 2.

   Chuyện kể ở phía Trái Đất: tín hiệu từ Sao Hỏa chạm tới Mạng lưới
   Không gian Sâu, phòng điều khiển Houston vỡ oà, họ mở gói dữ liệu,
   đọc được tấm bảng "TÔI CÒN SỐNG!" và bảng telemetry của trạm Hab,
   rồi Giám đốc chương trình hạ quyết tâm dốc toàn lực cứu một người.

   Cách dựng giống prologue.js: mỗi khung là một beat trong mảng
   BEATS có thời lượng riêng, ảnh nền object-fit cover, khung mới vào
   bằng mờ dần và trượt nhẹ. Khác prologue ở chỗ màn này CÓ CHỮ: dòng
   dẫn cảnh, hộp thoại, chữ hiệu ứng comic, và hai lớp dữ liệu đặc
   biệt cho khung 9 (tấm bảng) và khung 10 (bốn thanh đo lấy số thật
   của người chơi).

   Ảnh: assets/art/bg-im-01.webp tới bg-im-13.webp. Ảnh chưa có thì
   ô tranh tự hiện khung tối có số thứ tự, luồng chạy tiếp, không vỡ,
   chỉ ghi console.warn. Khi file xuất hiện, lần chơi sau ảnh tự hiện.

   Giao kèo với bên ngoài:
       openIntermission({ container, stats, onDone })
         -> { root, destroy }

   stats là object có get() của hab-stats.js. Không truyền cũng chạy:
   module tự đọc window.__devBase.stats, rồi tới bản lưu smdg.stats.

   Mọi đường dẫn dựng từ BASE_URL của chính module này (new URL('.',
   import.meta.url)), không dùng location.href, vì game vào ở /nasa
   không có dấu chéo cuối.
   ============================================================ */

import { getLang, onLangChange } from './i18n.js';
import { getSettings } from './settings.js';

const BASE_URL = new URL('.', import.meta.url).href;

/* Đuôi ảnh dự phòng, thử lần lượt khi webp 404. Cùng thứ tự với
   prologue.js và art.js để người vẽ chỉ cần ném file vào đúng thư mục. */
const FALLBACK_EXTS = ['jpg', 'jpeg', 'png', 'avif'];

const ART_DIR = 'assets/art/';
const ART_STEM = 'bg-im-';

const pad2 = (n) => String(n).padStart(2, '0');

/* ============================================================
   BẢNG SỐ CÂN BẰNG DÙNG CHO CÔNG THỨC SOL CẦM CỰ

   Chép lại đúng bốn con số của BALANCE trong hab-stats.js. Chép chứ
   không import: màn này phải chạy được cả khi hab-stats.js đổi cấu
   trúc, và một màn phim ngắn không nên kéo cả lõi chỉ số vào. Nếu
   bên hab-stats đổi số cân bằng thì sửa bốn dòng dưới cho khớp.
   ============================================================ */

const BAL = {
  waterDrainPerHour: 3.5,   /* điểm nước mỗi giờ game */
  waterRecycler: 0.70,      /* trạm thu hồi được 70 phần trăm nước thải */
  calDrainPerHour: 2.5,     /* điểm calo mỗi giờ game */
  bottleWater: 40,          /* một bình nước cho 40 điểm nước */
  rationCal: 45,            /* một gói khẩu phần cho 45 điểm calo */
  solsScale: 35,            /* mốc no đủ để vẽ thanh SOL: 35 Sol */
};

/* Ảnh dự phòng khi không đọc được chỉ số nào: đúng bộ số khởi điểm
   của hab-stats.js (BALANCE.start), để thanh đo không bao giờ trống. */
const DEFAULT_SNAP = { calories: 75, water: 70, oxygen: 100 };

/* ============================================================
   MƯỜI BA KHUNG

   Mỗi phần tử:
     id      khoá ổn định, dùng cho data-* và cho test
     art     đường dẫn ảnh, KHÔNG kèm đuôi
     ms      thời lượng tự chuyển
     layout  luôn 'full': mỗi ảnh đã là một trang truyện nhiều panel
     caption dòng dẫn cảnh góc dưới trái
     say     hộp thoại: who (tên người nói), tx (lời), x/y/w là toạ độ
             phần trăm của hộp trên khung
     sfx     chữ hiệu ứng comic: tx, x/y, rot (độ nghiêng), size
     board   khung 9: chữ đè lên tấm bảng trắng
     gauges  khung 10: bốn thanh đo, số lấy từ stats.get()

   TOẠ ĐỘ CHỮ: mọi x/y/w tính theo phần trăm khung hình, ước lượng
   theo bố cục phác thảo. ẢNH ĐỔI THÌ PHẢI CHỈNH LẠI: mở ảnh thật,
   đo vùng trống (không có mặt người), sửa x/y/w cho khớp. Hộp thoại
   cố ý đặt ở nửa dưới hoặc nửa trống của khung, không đè lên mặt.
   ============================================================ */

export const INTERMISSION_FRAMES = [
  /* ---------- nhịp 1: tín hiệu tới (1 tới 5) ---------- */
  {
    id: 'signal-arrives',
    art: ART_STEM + '01',
    ms: 4000,
    layout: 'full',
    caption: {
      vi: '225 triệu km từ Sao Hỏa... Một tín hiệu yếu ớt vừa chạm tới Mạng lưới Không gian Sâu của Trái Đất.',
      en: '225 million km from Mars... A faint signal has just reached Earth\u2019s Deep Space Network.',
    },
  },
  {
    id: 'houston-room',
    art: ART_STEM + '02',
    ms: 3800,
    layout: 'full',
    caption: {
      vi: 'Phòng điều khiển Houston, sau thảm họa Horizon IV.',
      en: 'Houston control room, after the Horizon IV disaster.',
    },
  },
  {
    id: 'screen-lights',
    art: ART_STEM + '03',
    ms: 3600,
    layout: 'full',
    caption: {
      vi: 'Một gói tin mới. Không phải nhiễu.',
      en: 'A new packet. Not noise.',
    },
  },
  {
    id: 'operator-shock',
    art: ART_STEM + '04',
    ms: 4200,
    layout: 'full',
    /* hộp thoại đặt nửa dưới khung, chừa mặt nhân vật ở nửa trên */
    say: { who: { vi: 'Nhân viên trực sóng', en: 'Duty operator' }, x: 6, y: 66, w: 56 },
    tx: {
      vi: 'Khoan đã... Cậu ấy còn sống! Tín hiệu từ Sao Hỏa, cậu ấy còn sống!',
      en: 'Wait... He\u2019s alive! The signal is from Mars, he\u2019s alive!',
    },
  },
  {
    id: 'paper-throw',
    art: ART_STEM + '05',
    ms: 4400,
    layout: 'full',
    sfx: {
      tx: { vi: 'CÒN SỐNG RỒI!', en: 'HE\u2019S ALIVE!' },
      x: 50, y: 40, rot: -4, size: 'xl',
    },
  },

  /* ---------- nhịp 2: mở gói tin (6 tới 10) ---------- */
  {
    id: 'decode-packet',
    art: ART_STEM + '06',
    ms: 4400,
    layout: 'full',
    say: { who: { vi: 'Nhân viên trực sóng', en: 'Duty operator' }, x: 5, y: 64, w: 54 },
    tx: {
      vi: 'Gói dữ liệu giải mã xong rồi... Có một tệp ảnh đính kèm và thông số trạm Hab.',
      en: 'The packet is decoded... There is an image attachment and the Hab telemetry.',
    },
  },
  {
    id: 'the-click',
    art: ART_STEM + '07',
    ms: 4000,
    layout: 'full',
    sfx: {
      tx: { vi: '*CLICK!*', en: '*CLICK!*' },
      x: 50, y: 42, rot: 5, size: 'l',
    },
  },
  {
    id: 'envelope-open',
    art: ART_STEM + '08',
    ms: 4200,
    layout: 'full',
  },
  {
    id: 'whiteboard',
    art: ART_STEM + '09',
    ms: 4600,
    layout: 'full',
    /* TOẠ ĐỘ CẦN CHỈNH THEO ẢNH THẬT: tấm bảng trắng chiếm khoảng
       30 tới 70 phần trăm bề ngang và 24 tới 62 phần trăm chiều cao
       trong phác thảo. Đổi ảnh thì đo lại bốn số này. */
    board: {
      tx: { vi: 'TÔI CÒN SỐNG!', en: 'I\u2019M ALIVE!' },
      x: 50, y: 43, w: 40, rot: -3,
    },
  },
  {
    id: 'telemetry',
    art: ART_STEM + '10',
    ms: 5000,
    layout: 'full',
    /* bảng số đặt nửa phải khung, chỗ bảng telemetry trên màn hình */
    gauges: { x: 52, y: 18, w: 44 },
    say: { who: { vi: 'Kỹ sư hệ thống', en: 'Systems engineer' }, x: 5, y: 68, w: 52 },
    tx: {
      vi: 'Lương thực, nước và Oxy của cậu ấy đang cạn dần... Chúng ta không còn nhiều thời gian!',
      en: 'His food, water and oxygen are running out... We do not have much time!',
    },
  },

  /* ---------- nhịp 3: quyết định (11 tới 13) ---------- */
  {
    id: 'director-slam',
    art: ART_STEM + '11',
    ms: 4200,
    layout: 'full',
    say: { who: { vi: 'Giám đốc chương trình', en: 'Program director' }, x: 5, y: 62, w: 56 },
    tx: {
      vi: 'Tất cả nghe đây! Ngừng mọi lịch trình khác lại!',
      en: 'Listen up, everyone! Stop every other schedule now!',
    },
  },
  {
    id: 'director-close',
    art: ART_STEM + '12',
    ms: 4800,
    layout: 'full',
    say: { who: { vi: 'Giám đốc chương trình', en: 'Program director' }, x: 5, y: 60, w: 58 },
    tx: {
      vi: 'Dù có phải bỏ ra hàng tỷ đô la, chúng ta cũng sẽ dốc toàn lực để cứu cậu ấy về. Trong vũ trụ này, một mạng người là vô giá.',
      en: 'Whatever it costs, we are putting everything into bringing him home. In this universe, one life is priceless.',
    },
  },
  {
    id: 'fists-up',
    art: ART_STEM + '13',
    ms: 4400,
    layout: 'full',
    sfx: {
      tx: { vi: 'QUYẾT TÂM!', en: 'WE WILL!' },
      x: 50, y: 38, rot: -3, size: 'l',
    },
    sub: {
      tx: { vi: 'YES!', en: 'YES!' },
      x: 50, y: 62, rot: 3,
    },
  },
];

export const FRAME_COUNT = INTERMISSION_FRAMES.length;

/* ============================================================
   CHUỖI GIAO DIỆN
   Giữ trong file này, không thêm vào i18n.js: file đó đang được sửa
   song song ở nhánh khác. Mỗi chuỗi có đủ VI và EN.
   ============================================================ */

const UI = {
  skip: { vi: 'BỎ QUA', en: 'SKIP' },
  stage: { vi: 'Màn chuyển tiếp: Trái Đất nhận tin', en: 'Intermission: Earth receives the signal' },
  progress: { vi: 'Tiến trình khung truyện', en: 'Comic frame progress' },
  frameOf: { vi: 'Khung {n} trên {t}', en: 'Frame {n} of {t}' },
  gaugeGroup: { vi: 'Chỉ số trạm Hab gửi về', en: 'Hab station telemetry' },
  sol: { vi: 'SOL CẦM CỰ', en: 'SOLS LEFT' },
  food: { vi: 'THỨC ĂN', en: 'FOOD' },
  water: { vi: 'NƯỚC', en: 'WATER' },
  oxy: { vi: 'OXY', en: 'OXYGEN' },
  unitSol: { vi: 'sol', en: 'sols' },
  pct: { vi: '%', en: '%' },
  artMissing: { vi: 'khung chưa có tranh', en: 'art not drawn yet' },
};

function lang() {
  try { return getLang() === 'en' ? 'en' : 'vi'; } catch { return 'vi'; }
}

function pick(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  const l = lang();
  return obj[l] != null ? obj[l] : (obj.vi || '');
}

/* ============================================================
   ĐỌC CHỈ SỐ THẬT
   Ba đường, theo thứ tự ưu tiên:
     1. stats truyền vào (object có get())
     2. window.__devBase.stats, do base.js đặt khi màn căn cứ chạy
     3. bản lưu smdg.stats, dựng lại qua createStats() của hab-stats.js
   Không đường nào ra thì dùng bộ số khởi điểm, thanh đo vẫn có số.
   ============================================================ */

function isStatsLike(o) {
  return !!(o && typeof o.get === 'function');
}

function snapshotOf(o) {
  try {
    if (isStatsLike(o)) return o.get() || {};
    if (o && typeof o === 'object') return o;
  } catch (err) {
    console.warn('[intermission] không đọc được chỉ số', err);
  }
  return {};
}

function inventoryOf(o, snap) {
  try {
    if (o && typeof o.getInventory === 'function') return o.getInventory() || {};
  } catch (err) { /* kho hỏng thì coi như rỗng */ }
  if (snap && snap.inv && typeof snap.inv === 'object') return snap.inv;
  return {};
}

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- công thức SOL cầm cự ----------

   Người chơi còn ba nguồn sống: điểm nước trong trạm, điểm calo trong
   cơ thể, và đồ dự trữ trong kho (bình nước, gói khẩu phần). Quy hết
   về GIỜ:

     nước  = (water + 40 * số bình nước) / (3,5 * (1 - 0,70))
             chia cho (1 - 0,70) vì trạm thu hồi lại 70 phần trăm nước
             thải, nên mỗi giờ chỉ mất 30 phần trăm của 3,5 điểm.
     calo  = (calories + 45 * số gói khẩu phần) / 2,5

     giờ cầm cự = min(giờ nước, giờ calo)     (cạn cái nào chết trước)
     Sol         = floor(giờ cầm cự / 24), kẹp trong 1 tới 400

   Lấy min chứ không lấy tổng: thiếu nước thì calo còn cũng vô nghĩa,
   đúng như cơ chế chết của hab-stats.js (nước về 0 mười hai giờ là
   chết, calo về 0 hai tư giờ là chết).
   ---------------------------------------- */

function estimateSols(waterPts, calPts) {
  const effectiveWaterDrain = BAL.waterDrainPerHour * (1 - BAL.waterRecycler);
  const waterHours = waterPts / Math.max(0.01, effectiveWaterDrain);
  const calHours = calPts / Math.max(0.01, BAL.calDrainPerHour);
  const hours = Math.min(waterHours, calHours);
  if (!Number.isFinite(hours)) return 1;
  return clamp(Math.floor(hours / 24), 1, 400);
}

/* Ba mức màu: xanh khi trên 60 phần trăm, vàng từ 25 tới 60, đỏ dưới 25. */
function levelOf(pct) {
  if (pct > 60) return 'ok';
  if (pct >= 25) return 'warn';
  return 'low';
}

/* ============================================================
   TIỆN ÍCH DOM
   ============================================================ */

function injectCss() {
  if (document.querySelector('link[data-intermission-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/intermission.css';
  link.dataset.intermissionCss = '1';
  document.head.appendChild(link);
}

function motionOn() {
  let s = { motion: true };
  try { s = getSettings(); } catch (e) { /* chưa nạp cài đặt thì coi như bật */ }
  return s.motion !== false
    && !document.documentElement.classList.contains('motion-off');
}

/* ---------- một ô ảnh ----------
   Ảnh chưa có thì ô giữ nền tối và hiện số khung. Số luôn có sẵn trong
   DOM, chỉ ẩn đi khi ảnh tải xong (lớp has-art).

   VÌ SAO KHÔNG DÒ BẰNG fetch HEAD TRƯỚC KHI GÁN src (bản cũ làm vậy và
   ảnh mất khoảng hai giây mới hiện): HEAD chạy tuần tự từng đuôi file,
   xong mới có URL để gán src, nên trình duyệt chỉ BẮT ĐẦU tải ảnh sau
   khi HEAD kết thúc. Nay gán thẳng bg-im-NN.webp ngay trong nhịp dựng
   khung, ảnh tải song song với mọi việc khác, hiện trong khung hình
   đầu. Đuôi khác chỉ được thử khi .webp báo lỗi (onerror), nên console
   vẫn không có dòng rác nào cho tới khi thật sự thiếu tranh.

   MỘT KHUNG CHỈ MỘT Ô: mỗi file bg-im-NN.webp đã là MỘT TRANG truyện
   gồm hai hoặc ba panel xếp sẵn (ví dụ 04 là trang hai panel dọc: trên
   là phòng điều khiển có màn hình thư, dưới là người đàn ông đeo kính
   hoảng sợ chỉ tay lên). Bản cũ chia trang đó thành 2-3 ô dùng CHUNG
   một file, mỗi ô chỉ khác objectPosition, nên người chơi thấy cùng một
   bức tranh hai lần và mỗi ô chỉ là một mẩu bị cắt cụt. Vì ảnh gốc đã
   là trang nhiều panel, cách đúng là hiện TRỌN trang trong một ô. */

/* Nhớ URL đã chốt theo stem, để lần dựng lại khung (quay lui bằng phím
   trái) không phải dò lại từ đầu. Giá trị null = đã biết là thiếu tranh. */
const artCache = new Map();

/* Dò thật sự, chỉ chạy khi .webp hỏng. Bắt đầu từ jpg vì webp vừa lỗi
   rồi, không thử lại làm gì. */
async function probeArt(stem) {
  if (artCache.has(stem)) return artCache.get(stem);
  let found = null;
  for (const ext of FALLBACK_EXTS) {
    const url = BASE_URL + stem + '.' + ext;
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (r && r.ok) { found = url; break; }
    } catch (e) { /* mạng hỏng, hoặc file:// chặn fetch: thử đuôi kế */ }
  }
  artCache.set(stem, found);
  return found;
}

/* Một khung = một ô, ảnh hiện trọn trang truyện. Tham số pos giữ lại
   cho tương thích nhưng luôn là '50% 45%': không cắt, không lặp. */
function makeCell(frameNo, pos) {
  const cell = document.createElement('div');
  cell.className = 'im-cell';

  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  img.draggable = false;
  img.dataset.frame = String(frameNo);
  img.style.objectPosition = pos || '50% 45%';

  const ph = document.createElement('span');
  ph.className = 'im-noart';
  ph.setAttribute('aria-hidden', 'true');
  ph.innerHTML = '<b>' + pad2(frameNo) + '</b><i>' + '/' + pad2(FRAME_COUNT) + '</i>';

  cell.appendChild(img);
  cell.appendChild(ph);

  const stem = ART_DIR + ART_STEM + pad2(frameNo);
  let triedFallback = false;

  function markDead() {
    if (cell.dataset.dead === '1') return;
    cell.dataset.dead = '1';
    cell.classList.add('no-art');
    console.warn('[intermission] thiếu tranh khung ' + frameNo + ' (' + stem + '.*), hiện khung tối');
  }

  img.addEventListener('load', () => { cell.classList.add('has-art'); });

  /* .webp hỏng hoặc không có: mới đi dò các đuôi còn lại, rồi gán lại
     src đúng một lần. Lỗi lần hai thì chịu, hiện khung tối. */
  img.addEventListener('error', () => {
    if (cell.dataset.dead === '1') return;
    if (triedFallback) { markDead(); return; }
    triedFallback = true;
    probeArt(stem).then((url) => {
      if (url) { img.src = url; return; }
      markDead();
    }).catch(markDead);
  });

  /* Gán thẳng, không chờ dò: ảnh bắt đầu tải ngay khi khung được dựng. */
  img.src = BASE_URL + stem + '.webp';

  return cell;
}

function buildCells(beat, frameNo) {
  const box = document.createElement('div');
  box.className = 'im-cells';
  /* Mọi khung đều một ô: ảnh gốc đã là trang nhiều panel, cắt thêm sẽ
     lặp tranh. Bỏ hẳn nhánh duo/trio thay vì để đó rồi không dùng. */
  box.dataset.layout = 'full';
  box.appendChild(makeCell(frameNo, '50% 45%'));
  return box;
}

/* ============================================================
   CHÍNH
   ============================================================ */

export function openIntermission({ container, stats, onDone } = {}) {
  injectCss();

  /* Dọn màn cũ nếu có, tránh hai lớp phủ chồng nhau khi luồng bị gọi
     hai lần (dev jump, hoặc người chơi bấm dồn). */
  document.querySelectorAll('.intermission-root').forEach((n) => n.remove());

  const host = container || document.body;

  /* ---------- khung ngoài ---------- */

  const root = document.createElement('div');
  root.className = 'intermission-root';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', pick(UI.stage));

  const stage = document.createElement('div');
  stage.className = 'im-stage';
  root.appendChild(stage);

  /* thanh tiến trình mảnh ở đáy + số khung */
  const bar = document.createElement('div');
  bar.className = 'im-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', pick(UI.progress));
  bar.setAttribute('aria-valuemin', '1');
  bar.setAttribute('aria-valuemax', String(FRAME_COUNT));
  const barFill = document.createElement('i');
  bar.appendChild(barFill);
  root.appendChild(bar);

  const counter = document.createElement('div');
  counter.className = 'im-count';
  root.appendChild(counter);

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'im-skip';
  skip.textContent = pick(UI.skip);
  root.appendChild(skip);

  host.appendChild(root);

  /* ---------- trạng thái ---------- */

  const frames = new Map();      /* id -> phần tử khung đã dựng */
  const timers = new Set();
  let idx = 0;
  let done = false;
  let advanceTimer = 0;
  let liveStats = isStatsLike(stats) ? stats
    : (window.__devBase && isStatsLike(window.__devBase.stats) ? window.__devBase.stats : null);
  let statsTried = false;

  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, Math.max(0, ms));
    timers.add(id);
    return id;
  }

  /* ---------- chỉ số ---------- */

  /* Không có stats truyền vào: thử bản lưu qua hab-stats.js. Nạp động
     và nuốt lỗi, vì đây chỉ là đường phụ trợ cho thanh đo. Xong thì
     vẽ lại khung 10 nếu đang đứng ở đó. */
  function hydrateStats() {
    if (liveStats || statsTried) return;
    statsTried = true;
    import(BASE_URL + 'hab-stats.js').then((mod) => {
      try {
        if (mod && typeof mod.createStats === 'function') {
          liveStats = mod.createStats();
          repaintGaugesIfVisible();
        }
      } catch (err) {
        console.warn('[intermission] không dựng lại được chỉ số từ bản lưu', err);
      }
    }).catch(() => { /* thiếu file thì thôi, dùng bộ số mặc định */ });
  }

  function readGaugeData() {
    const snap = snapshotOf(liveStats) || {};
    const inv = inventoryOf(liveStats, snap);

    const fallback = !liveStats;
    const water = clamp(num(snap.water, DEFAULT_SNAP.water), 0, 100);
    const cal = clamp(num(snap.calories, DEFAULT_SNAP.calories), 0, 100);
    const oxy = clamp(num(snap.oxygen, DEFAULT_SNAP.oxygen), 0, 100);

    /* điểm dự trữ: bình nước và gói khẩu phần trong kho */
    const waterPts = water + BAL.bottleWater * num(inv.water_bottle, 0);
    const calPts = cal + BAL.rationCal * num(inv.ration, 0);

    const sols = estimateSols(waterPts, calPts);

    return {
      fallback,
      rows: [
        {
          key: 'sols',
          label: pick(UI.sol),
          /* thanh SOL vẽ theo thang 35 Sol, mốc no đủ của thiết kế */
          pct: clamp(Math.round((sols / BAL.solsScale) * 100), 0, 100),
          value: String(sols),
          unit: ' ' + pick(UI.unitSol),
        },
        { key: 'food', label: pick(UI.food), pct: Math.round(cal), value: String(Math.round(cal)), unit: pick(UI.pct) },
        { key: 'water', label: pick(UI.water), pct: Math.round(water), value: String(Math.round(water)), unit: pick(UI.pct) },
        { key: 'oxy', label: pick(UI.oxy), pct: Math.round(oxy), value: String(Math.round(oxy)), unit: pick(UI.pct) },
      ],
    };
  }

  /* ---------- lớp phủ chữ của một khung ---------- */

  function makeCaption(beat) {
    const el = document.createElement('p');
    el.className = 'im-caption';
    el.setAttribute('aria-live', 'polite');
    const tag = document.createElement('span');
    tag.className = 'im-caption-tag';
    tag.textContent = ('0' + (idx + 1)).slice(-2) + '/' + pad2(FRAME_COUNT);
    const tx = document.createElement('span');
    tx.className = 'im-caption-tx';
    tx.textContent = pick(beat.caption);
    el.appendChild(tag);
    el.appendChild(tx);
    return el;
  }

  function makeSay(beat) {
    const fig = document.createElement('figure');
    fig.className = 'im-say';
    fig.style.setProperty('--x', (beat.say.x || 5) + '%');
    fig.style.setProperty('--y', (beat.say.y || 62) + '%');
    fig.style.setProperty('--w', (beat.say.w || 50) + '%');

    const who = document.createElement('figcaption');
    who.className = 'im-say-who';
    who.textContent = pick(beat.say.who);

    const p = document.createElement('p');
    p.className = 'im-say-tx';
    p.textContent = pick(beat.tx);

    fig.appendChild(who);
    fig.appendChild(p);
    return fig;
  }

  function makeSfx(beat) {
    const el = document.createElement('div');
    el.className = 'im-sfx' + (beat.sfx.size === 'xl' ? ' is-xl' : '');
    el.style.setProperty('--x', (beat.sfx.x || 50) + '%');
    el.style.setProperty('--y', (beat.sfx.y || 42) + '%');
    el.style.setProperty('--rot', (beat.sfx.rot || -4) + 'deg');
    const span = document.createElement('span');
    span.textContent = pick(beat.sfx.tx);
    el.appendChild(span);
    return el;
  }

  function makeSub(beat) {
    const el = document.createElement('div');
    el.className = 'im-sfx is-sub';
    el.style.setProperty('--x', (beat.sub.x || 50) + '%');
    el.style.setProperty('--y', (beat.sub.y || 62) + '%');
    el.style.setProperty('--rot', (beat.sub.rot || 3) + 'deg');
    const span = document.createElement('span');
    span.textContent = pick(beat.sub.tx);
    el.appendChild(span);
    return el;
  }

  /* Khung 9: chữ viết bút dạ trên tấm bảng trắng. Toạ độ phần trăm,
     xem ghi chú ở INTERMISSION_FRAMES. */
  function makeBoard(beat) {
    const el = document.createElement('div');
    el.className = 'im-board';
    el.style.setProperty('--x', (beat.board.x || 50) + '%');
    el.style.setProperty('--y', (beat.board.y || 43) + '%');
    el.style.setProperty('--w', (beat.board.w || 40) + '%');
    el.style.setProperty('--rot', (beat.board.rot || -3) + 'deg');
    el.textContent = pick(beat.board.tx);
    return el;
  }

  /* Khung 10: bốn thanh đo, số lấy từ stats.get(). Vẽ bằng DOM chứ
     không bằng ảnh để ngưỡng màu luôn khớp số thật. */
  function makeGauges(beat) {
    const box = document.createElement('div');
    box.className = 'im-gauges';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', pick(UI.gaugeGroup));
    box.style.setProperty('--x', (beat.gauges.x || 52) + '%');
    box.style.setProperty('--y', (beat.gauges.y || 18) + '%');
    box.style.setProperty('--w', (beat.gauges.w || 44) + '%');

    const data = readGaugeData();
    data.rows.forEach((row) => {
      const line = document.createElement('div');
      line.className = 'im-g lv-' + levelOf(row.pct);
      line.dataset.k = row.key;
      line.dataset.pct = String(row.pct);

      const lab = document.createElement('span');
      lab.className = 'im-g-lab';
      lab.textContent = row.label;

      const track = document.createElement('span');
      track.className = 'im-g-track';
      const fill = document.createElement('i');
      fill.style.width = row.pct + '%';
      track.appendChild(fill);

      const val = document.createElement('span');
      val.className = 'im-g-val';
      val.textContent = row.value;
      if (row.unit) {
        const u = document.createElement('em');
        u.textContent = row.unit;
        val.appendChild(u);
      }

      line.appendChild(lab);
      line.appendChild(track);
      line.appendChild(val);
      box.appendChild(line);
    });

    return box;
  }

  function paintOverlay(fr, beat) {
    const ov = fr.querySelector('.im-ov');
    ov.textContent = '';
    if (beat.caption) ov.appendChild(makeCaption(beat));
    if (beat.say && beat.tx) ov.appendChild(makeSay(beat));
    if (beat.sfx) ov.appendChild(makeSfx(beat));
    if (beat.sub) ov.appendChild(makeSub(beat));
    if (beat.board) ov.appendChild(makeBoard(beat));
    if (beat.gauges) ov.appendChild(makeGauges(beat));
  }

  /* Đổi ngôn ngữ giữa chừng: vẽ lại lớp chữ của khung đang đứng, giữ
     nguyên ảnh và vị trí. Không đụng ảnh nên không nháy. */
  function repaintCurrent() {
    const beat = INTERMISSION_FRAMES[idx];
    const fr = frames.get(beat.id);
    if (fr) paintOverlay(fr, beat);
    skip.textContent = pick(UI.skip);
    root.setAttribute('aria-label', pick(UI.stage));
    bar.setAttribute('aria-label', pick(UI.progress));
    updateCounter();
  }

  function repaintGaugesIfVisible() {
    const beat = INTERMISSION_FRAMES[idx];
    if (!beat || !beat.gauges) return;
    const fr = frames.get(beat.id);
    if (!fr) return;
    const old = fr.querySelector('.im-gauges');
    if (!old) return;
    old.replaceWith(makeGauges(beat));
  }

  function updateCounter() {
    counter.textContent = pick(UI.frameOf)
      .replace('{n}', String(idx + 1))
      .replace('{t}', String(FRAME_COUNT));
  }

  /* ---------- dựng và hiện khung ---------- */

  function ensureFrame(beat, n) {
    let fr = frames.get(beat.id);
    if (fr) return fr;

    fr = document.createElement('div');
    fr.className = 'im-frame';
    fr.dataset.id = beat.id;
    fr.dataset.n = String(n);
    fr.appendChild(buildCells(beat, n));

    const vig = document.createElement('div');
    vig.className = 'im-vig';
    vig.setAttribute('aria-hidden', 'true');
    fr.appendChild(vig);

    const ov = document.createElement('div');
    ov.className = 'im-ov';
    fr.appendChild(ov);

    paintOverlay(fr, beat);
    stage.appendChild(fr);
    frames.set(beat.id, fr);
    return fr;
  }

  function render() {
    const beat = INTERMISSION_FRAMES[idx];
    const staticMode = !motionOn();
    root.classList.toggle('is-static', staticMode);

    /* khung trước mờ đi rồi bỏ khỏi DOM cho nhẹ; giữ lại phần tử để
       quay lui không phải dựng lại ảnh */
    frames.forEach((fr, id) => {
      if (id === beat.id) return;
      fr.classList.remove('is-on');
      fr.setAttribute('aria-hidden', 'true');
    });

    const fr = ensureFrame(beat, idx + 1);
    fr.removeAttribute('aria-hidden');
    /* Thứ tự chồng lớp theo z-index, KHÔNG append lại: chèn lại phần tử
       đã nằm trong DOM sẽ cắt ngang transition mờ dần và khung hiện ra
       đột ngột. */
    fr.style.zIndex = String(10 + idx);
    /* gỡ rồi gắn lại để hiệu ứng chữ comic chạy lại từ đầu khi quay lui */
    fr.classList.remove('is-on');
    if (!staticMode) { void fr.offsetWidth; }
    fr.classList.add('is-on');

    barFill.style.width = (((idx + 1) / FRAME_COUNT) * 100) + '%';
    bar.setAttribute('aria-valuenow', String(idx + 1));
    bar.setAttribute('aria-valuetext', String(idx + 1) + '/' + FRAME_COUNT);
    updateCounter();

    if (beat.gauges) hydrateStats();
  }

  /* ---------- điều khiển ---------- */

  function schedule() {
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(advance, INTERMISSION_FRAMES[idx].ms);
  }

  function go(n) {
    if (done) return;
    idx = clamp(n, 0, FRAME_COUNT - 1);
    render();
    schedule();
  }

  function advance() {
    if (done) return;
    if (idx >= FRAME_COUNT - 1) { finish(); return; }
    go(idx + 1);
  }

  function back() {
    if (done) return;
    if (idx <= 0) return;
    go(idx - 1);
  }

  /* ---------- nạp dữ liệu thật sang Giai đoạn 2 ----------
     Sol cầm cự lấy đúng con số đang hiện trên thanh đo khung 10, để
     người chơi thấy gì thì engine nhận đúng cái đó. */

  function pushToPhase2() {
    let sols = 1;
    try { sols = estimateSolsFallback(); } catch (e) { sols = 30; }

    const payload = { solsRemaining: sols, crewOnMars: 1, signalStrength: 0.8 };

    try {
      const eng = window.phase2Engine;
      if (eng && typeof eng.initFromPhase1 === 'function') {
        eng.initFromPhase1(payload);
        return;
      }
    } catch (err) {
      console.warn('[intermission] engine Giai đoạn 2 từ chối dữ liệu', err);
    }

    /* Chưa có engine trên window: thử nạp module ở các đường dẫn quen
       thuộc rồi đẩy tiếp. Nuốt lỗi, đây chỉ là bước chuẩn bị.
       Thứ tự: './phase2/' (bản deploy gom src/ về gốc, phase2/ nằm cạnh
       index.html) phải thử TRƯỚC '../phase2/' (chỉ đúng khi chạy dev
       server trong src/). Để ngược lại thì bản live thử một URL không
       tồn tại trước mỗi lần vào màn chuyển tiếp, sinh 404 thừa. */
    const candidates = [
      new URL('./phase2/phase2-engine.js', import.meta.url).href,
      new URL('../phase2/phase2-engine.js', import.meta.url).href,
      '/phase2/phase2-engine.js',
    ];
    (async () => {
      for (const url of candidates) {
        try {
          const mod = await import(url);
          const eng = mod.phase2Engine || mod.default;
          if (eng && typeof eng.initFromPhase1 === 'function') {
            if (!window.phase2Engine) window.phase2Engine = eng;
            eng.initFromPhase1(payload);
            return;
          }
        } catch (err) { /* thử đường dẫn kế tiếp */ }
      }
      console.warn('[intermission] chưa có engine Giai đoạn 2, bỏ qua bước nạp');
    })();
  }

  /* Sol dùng cho Giai đoạn 2: cùng công thức với thanh đo, đọc lại
     tại đúng lúc kết thúc để không lệch nếu chỉ số đổi giữa chừng. */
  function estimateSolsFallback() {
    const snap = snapshotOf(liveStats) || {};
    const inv = inventoryOf(liveStats, snap);
    const water = clamp(num(snap.water, DEFAULT_SNAP.water), 0, 100);
    const cal = clamp(num(snap.calories, DEFAULT_SNAP.calories), 0, 100);
    const waterPts = water + BAL.bottleWater * num(inv.water_bottle, 0);
    const calPts = cal + BAL.rationCal * num(inv.ration, 0);
    return estimateSols(waterPts, calPts);
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
    root.remove();
  }

  function finish() {
    if (done) return;
    done = true;
    pushToPhase2();
    cleanup();
    if (typeof onDone === 'function') onDone();
  }

  function onPointer(e) {
    if (e.target && e.target.closest && e.target.closest('.im-skip')) return;
    /* chọn chữ trong hộp thoại thì không tính là bấm sang khung */
    const sel = window.getSelection ? String(window.getSelection()) : '';
    if (sel) return;
    advance();
  }

  function onSkipClick(e) {
    e.preventDefault();
    e.stopPropagation();
    finish();
  }

  function onKey(e) {
    if (document.activeElement === skip) {
      /* để trình duyệt tự kích hoạt nút khi nó đang được chọn */
      if (e.key === 'Tab') return;
    }
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      e.preventDefault();
      advance();
      return;
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); advance(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); back(); return; }
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
  }

  const offLang = onLangChange(() => repaintCurrent());

  root.addEventListener('pointerdown', onPointer);
  skip.addEventListener('click', onSkipClick);
  document.addEventListener('keydown', onKey);

  render();
  schedule();

  return {
    root,
    /* chỉ số đang dùng, cho test và cho màn sau đọc lại nếu cần */
    get readings() { return readGaugeData(); },
    get index() { return idx; },
    destroy() {
      if (done) { if (root.isConnected) root.remove(); return; }
      done = true;
      cleanup();
    },
  };
}
