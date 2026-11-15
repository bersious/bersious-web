/* ============================================================
   true-ending.js
   Phân cảnh kết thúc thành công (True Ending) gồm chín khung, phát
   sau khi tàu hạ cánh an toàn ở cuối Giai đoạn 2, rồi mở bảng tổng
   kết sứ mệnh.

   Vì sao tách khỏi intermission.js: màn chuyển tiếp kia kể chuyện
   Trái Đất phát hiện tín hiệu (13 khung, có dữ liệu telemetry đè
   lên tranh). Màn này kể chuyện giải cứu thành công (9 khung, không
   có chữ trên tranh, khung cuối chỉ có THE END). Hai màn khác nhịp
   và khác dữ liệu, gộp vào một file sẽ rối.

   Nguyên tắc hình ảnh bắt buộc:
     - Không logo NASA ở bất kỳ đâu. Chỉ HORIZON-IV hoặc MISSION
       CONTROL trên áo và tường.
     - Không chữ trên tranh, trừ khung 09 có THE END vẽ bằng HTML.
     - Khung 09 không có ảnh riêng: dùng lại ảnh khung 08 rồi phủ
       lớp tối dần, chữ THE END là một phần tử HTML riêng nên luôn
       sắc nét, không phụ thuộc font trong tranh.

   Cách dùng:
     import { openTrueEnding } from './true-ending.js';
     openTrueEnding({ stats, engine, onRestart, onExit });
   ============================================================ */

import { getLang, getSettings } from './i18n.js';

const BASE_URL = new URL('.', import.meta.url).href;

/* Đuôi ảnh dự phòng, cùng thứ tự với intermission.js và prologue.js
   để người vẽ chỉ cần ném file vào đúng thư mục là chạy. */
const FALLBACK_EXTS = ['jpg', 'jpeg', 'png', 'avif'];
const ART_DIR = 'assets/art/';
const ART_STEM = 'true-ending-';
const pad2 = (n) => String(n).padStart(2, '0');

/* ============================================================
   CHỮ SONG NGỮ
   Để trong file này chứ không thêm vào i18n.js: đây là chữ riêng
   của màn kết thúc, và một bảng cục bộ thì không thể hỏng vì lý do
   ở file khác.
   ============================================================ */

const TEXT = {
  vi: {
    stage: 'Phân cảnh kết thúc',
    progress: 'Tiến trình phân cảnh',
    skip: 'Bỏ qua',
    skipAria: 'Bỏ qua phân cảnh kết thúc và xem tổng kết',
    theEnd: 'HẾT',
    summaryTitle: 'BÁO CÁO TỔNG KẾT SỨ MỆNH',
    summarySub: 'HORIZON-IV · CHIẾN DỊCH GIẢI CỨU',
    rankLabel: 'Xếp hạng sứ mệnh',
    rankS: 'Hoàn hảo',
    rankA: 'Xuất sắc',
    rankB: 'Đạt yêu cầu',
    rankHow: 'Xếp hạng dựa trên số Sol đã sống, ngân sách còn dư và biên an toàn của bốn đồng hồ đo.',
    statSols: 'Sol đã sống',
    statBudget: 'Ngân sách còn dư',
    statMass: 'Khối lượng tàu',
    statFlight: 'Thời gian bay',
    compareTitle: 'ĐỐI CHIẾU KỸ THUẬT',
    compareSub: 'Cấu hình của bạn đặt cạnh ba tàu thám hiểm Sao Hỏa có thật.',
    compareYours: 'Thiết kế của bạn',
    compareReal: 'Tàu có thật',
    curiosity: 'Curiosity',
    perseverance: 'Perseverance',
    maven: 'MAVEN',
    curiosityFact: '899 kg · hạ cánh bằng cần cẩu trên không · pin hạt nhân RTG',
    perseveranceFact: '1.025 kg · hạ cánh bằng cần cẩu trên không · pin hạt nhân RTG',
    mavenFact: '903 kg · bay theo quỹ đạo · pin mặt trời',
    restart: 'Chơi lại sứ mệnh mới',
    exit: 'Về menu chính',
    sol: 'Sol',
    days: 'ngày',
    noData: 'chưa có số',
  },
  en: {
    stage: 'True ending sequence',
    progress: 'Ending progress',
    skip: 'Skip',
    skipAria: 'Skip the ending sequence and open the summary',
    theEnd: 'THE END',
    summaryTitle: 'POST MISSION ANALYSIS',
    summarySub: 'HORIZON-IV · RESCUE OPERATION',
    rankLabel: 'Mission rank',
    rankS: 'Flawless',
    rankA: 'Excellent',
    rankB: 'Acceptable',
    rankHow: 'Rank comes from the Sols survived, the budget left and the safety margins on all four gauges.',
    statSols: 'Sols survived',
    statBudget: 'Budget left',
    statMass: 'Ship mass',
    statFlight: 'Flight time',
    compareTitle: 'TECHNICAL COMPARISON',
    compareSub: 'Your configuration beside three real Mars explorers.',
    compareYours: 'Your design',
    compareReal: 'Real spacecraft',
    curiosity: 'Curiosity',
    perseverance: 'Perseverance',
    maven: 'MAVEN',
    curiosityFact: '899 kg · sky crane landing · RTG nuclear power',
    perseveranceFact: '1,025 kg · sky crane landing · RTG nuclear power',
    mavenFact: '903 kg · orbital insertion · solar arrays',
    restart: 'Play a new mission',
    exit: 'Back to main menu',
    sol: 'Sol',
    days: 'days',
    noData: 'no data',
  },
};

function pick(key) {
  const tbl = TEXT[getLang()] || TEXT.vi;
  return tbl[key] ?? TEXT.vi[key] ?? key;
}

/* ============================================================
   CHÍN KHUNG
   Thời lượng cộng lại khoảng 40 giây, đủ để kể chuyện mà không bắt
   người chấm ngồi chờ. Khung 09 dùng lại ảnh khung 08.
   ============================================================ */

const FRAMES = [
  { n: 1, ms: 4000 },
  { n: 2, ms: 4200 },
  { n: 3, ms: 4200 },
  { n: 4, ms: 4600 },
  { n: 5, ms: 5000 },
  { n: 6, ms: 4800 },
  { n: 7, ms: 4600 },
  { n: 8, ms: 4600 },
  { n: 9, ms: 3500, reuseArtOf: 8, isEnd: true },
];

/* ============================================================
   TIỆN ÍCH
   ============================================================ */

function motionOn() {
  let s = { motion: true };
  try {
    s = getSettings();
  } catch (e) {
    /* chưa nạp cài đặt thì coi như bật chuyển động */
  }
  return s.motion !== false
    && !document.documentElement.classList.contains('motion-off');
}

let cssInjected = false;
function injectCss() {
  if (cssInjected || document.querySelector('link[data-true-ending-css]')) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/true-ending.css';
  link.dataset.trueEndingCss = '1';
  document.head.appendChild(link);
}

/* Dò ảnh bằng HEAD trước khi gán src, giống intermission.js: thẻ img
   trỏ vào file không tồn tại sinh một dòng lỗi trong console, chín
   khung nhân bốn đuôi là gần bốn chục dòng rác che mất lỗi thật. */
async function artUrl(n) {
  const stem = ART_DIR + ART_STEM + pad2(n);
  const candidates = ['webp', ...FALLBACK_EXTS].map((ext) => BASE_URL + stem + '.' + ext);
  for (const url of candidates) {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.ok) return url;
    } catch (e) {
      /* mạng lỗi thì thử đuôi kế tiếp */
    }
  }
  console.warn('[true-ending] chưa có tranh cho khung', n, 'dùng khung tối');
  return null;
}

/* Giảm nhạc nền trong lúc chiếu phim, khôi phục khi đóng. Nạp mềm:
   audio.js đổi cấu trúc thì chỉ mất phần giảm âm, phim vẫn chạy. */
let restoreMusic = null;
async function duckMusic() {
  try {
    const mod = await import(BASE_URL + 'audio.js');
    if (mod && typeof mod.clampMusicVolume === 'function') {
      const undo = mod.clampMusicVolume(0.6);
      if (typeof undo === 'function') restoreMusic = undo;
    }
  } catch (e) {
    /* thiếu module âm thanh thì thôi */
  }
}
function unduckMusic() {
  if (typeof restoreMusic === 'function') {
    try {
      restoreMusic();
    } catch (e) {
      /* đã khôi phục rồi */
    }
  }
  restoreMusic = null;
}

const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/* ============================================================
   PHẦN A: CHÍN KHUNG
   ============================================================ */

export function openTrueEnding({ container, stats, engine, onRestart, onExit } = {}) {
  injectCss();
  duckMusic();

  /* Dọn màn cũ, tránh hai lớp phủ chồng nhau khi luồng bị gọi hai lần
     (bảng dev nhảy màn, hoặc người chơi bấm dồn). */
  document.querySelectorAll('.te-root').forEach((n) => n.remove());

  const host = container || document.body;
  const animated = motionOn();

  const root = document.createElement('div');
  root.className = 'te-root';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', pick('stage'));

  const stage = document.createElement('div');
  stage.className = 'te-stage';
  root.appendChild(stage);

  /* thanh tiến trình mảnh ở đáy */
  const bar = document.createElement('div');
  bar.className = 'te-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', pick('progress'));
  bar.setAttribute('aria-valuemin', '1');
  bar.setAttribute('aria-valuemax', String(FRAMES.length));
  const barFill = document.createElement('i');
  bar.appendChild(barFill);
  root.appendChild(bar);

  const counter = document.createElement('span');
  counter.className = 'te-count';
  root.appendChild(counter);

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'te-skip';
  skip.textContent = pick('skip');
  skip.setAttribute('aria-label', pick('skipAria'));
  root.appendChild(skip);

  /* Lớp tối dần riêng cho khung 09, nằm trên ảnh nhưng dưới chữ. */
  const dim = document.createElement('div');
  dim.className = 'te-dim';
  root.appendChild(dim);

  /* Chữ THE END là phần tử HTML riêng nên luôn sắc nét. */
  const endTitle = document.createElement('div');
  endTitle.className = 'te-end';
  endTitle.textContent = pick('theEnd');
  endTitle.setAttribute('aria-hidden', 'true');
  root.appendChild(endTitle);

  host.appendChild(root);

  let idx = 0;
  let timer = null;
  let finished = false;
  const cards = [];
  const urls = new Map();

  function buildCard(frame) {
    const card = document.createElement('div');
    card.className = 'te-card';
    card.dataset.frame = String(frame.n);
    const img = document.createElement('img');
    img.className = 'te-art';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.decoding = 'async';
    card.appendChild(img);
    /* Số khung lớn giữa khung, chỉ hiện khi ảnh thiếu. */
    const ph = document.createElement('div');
    ph.className = 'te-ph';
    ph.textContent = pad2(frame.n);
    card.appendChild(ph);
    stage.appendChild(card);
    cards.push({ card, img, frame, loaded: false });
    return card;
  }

  function paint() {
    const frame = FRAMES[idx];
    const last = idx === FRAMES.length - 1;
    cards.forEach((c, i) => {
      c.card.classList.toggle('is-on', i === idx);
      c.card.classList.toggle('is-prev', i < idx);
    });
    barFill.style.width = `${Math.round(((idx + 1) / FRAMES.length) * 100)}%`;
    bar.setAttribute('aria-valuenow', String(idx + 1));
    counter.textContent = `${idx + 1} / ${FRAMES.length}`;

    /* Khung 09: tối dần rồi hiện chữ. Khung khác: gỡ cả hai. */
    if (last && frame.isEnd) {
      root.classList.add('is-ending');
      requestAnimationFrame(() => {
        dim.classList.add('is-on');
        endTitle.classList.add('is-on');
      });
    } else {
      root.classList.remove('is-ending');
      dim.classList.remove('is-on');
      endTitle.classList.remove('is-on');
    }
  }

  function schedule() {
    window.clearTimeout(timer);
    const frame = FRAMES[idx];
    timer = window.setTimeout(() => next(), frame.ms);
  }

  function next() {
    if (finished) return;
    if (idx >= FRAMES.length - 1) {
      finish();
      return;
    }
    idx += 1;
    paint();
    schedule();
  }

  function prev() {
    if (finished) return;
    if (idx <= 0) return;
    idx -= 1;
    paint();
    schedule();
  }

  function finish() {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    document.removeEventListener('keydown', onKey, true);
    root.removeEventListener('click', onClick);
    skip.removeEventListener('click', onSkip);
    unduckMusic();
    /* Bàn giao sang bảng tổng kết. Tách microtask để sự kiện click
       không lan sang lớp vừa dựng. */
    Promise.resolve().then(() => {
      openSummary({ stats, engine, onRestart, onExit });
    });
  }

  function onSkip(e) {
    e.stopPropagation();
    finish();
  }

  function onClick(e) {
    /* Bấm nút Bỏ qua thì đã xử lý riêng. */
    if (e.target instanceof Element && e.target.closest('.te-skip')) return;
    next();
  }

  function onKey(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      next();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    }
  }

  skip.addEventListener('click', onSkip);
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey, true);

  /* Dựng sẵn chín khung rồi mới chiếu, để đổi khung không phải chờ
     mạng. Khung 09 dùng lại đường dẫn của khung 08. */
  (async () => {
    for (const frame of FRAMES) {
      const artOf = frame.reuseArtOf || frame.n;
      buildCard(frame);
      if (!urls.has(artOf)) urls.set(artOf, await artUrl(artOf));
      const c = cards[cards.length - 1];
      const url = urls.get(artOf);
      if (url) {
        c.img.src = url;
        c.img.addEventListener('load', () => {
          c.loaded = true;
          c.card.classList.add('has-art');
        }, { once: true });
        c.img.addEventListener('error', () => {
          console.warn('[true-ending] ảnh khung', frame.n, 'không tải được');
        }, { once: true });
      }
    }
    if (finished) return;
    if (!animated) root.classList.add('te-static');
    paint();
    schedule();
  })();

  return {
    root,
    destroy() {
      finished = true;
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      unduckMusic();
      root.remove();
    },
  };
}

/* ============================================================
   PHẦN B: BẢNG TỔNG KẾT SỨ MỆNH
   ============================================================ */

/* Ba tàu thám hiểm Sao Hỏa có thật. Chỉ nhắc tên sứ mệnh, tuyệt đối
   không dùng logo NASA theo yêu cầu bản quyền của đề bài. */
const REAL_CRAFT = [
  { key: 'curiosity' },
  { key: 'perseverance' },
  { key: 'maven' },
];

/* Đọc số thật từ stats và engine. Thiếu nguồn nào thì trả null và
   giao diện in "chưa có số" thay vì bịa. */
function readFacts(stats, engine) {
  const out = { sols: null, budgetPct: null, budgetMusd: null, massKg: null, flightDays: null, gauges: null };
  try {
    const s = stats && typeof stats.get === 'function' ? stats.get() : null;
    if (s) {
      if (Number.isFinite(s.day)) out.sols = s.day;
      else if (Number.isFinite(s.totalMinutes)) out.sols = Math.floor(s.totalMinutes / 1440) + 1;
    }
  } catch (e) {
    /* stats chưa sẵn sàng */
  }
  try {
    const st = engine && typeof engine.getState === 'function' ? engine.getState() : null;
    if (st) {
      const totals = st.totals || {};
      if (Number.isFinite(totals.massKg)) out.massKg = totals.massKg;
      if (Number.isFinite(totals.costMusd)) out.budgetMusd = totals.costMusd;
      if (Number.isFinite(totals.daysToArrival)) out.flightDays = totals.daysToArrival;
      if (st.gauges) out.gauges = st.gauges;
      if (Number.isFinite(st.budgetMusd)) out.budgetMusd = st.budgetMusd;
      if (Number.isFinite(st.budgetRemainingPct)) out.budgetPct = st.budgetRemainingPct;
    }
  } catch (e) {
    /* engine chưa sẵn sàng */
  }
  return out;
}

/* Xếp hạng:
     S: sống không quá 20 Sol, ngân sách còn dư từ 20 phần trăm, cả
        bốn đồng hồ đều trên ngưỡng xanh, không mục đỏ.
     A: sống không quá 30 Sol, ngân sách còn dư từ 10 phần trăm,
        không mục đỏ.
     B: còn lại.
   Số nào thiếu thì tiêu chí đó bị bỏ qua thay vì ép xuống hạng B,
   để bảng tổng kết vẫn dùng được khi mở riêng lẻ. */
function rankOf(f) {
  const gauges = f.gauges || {};
  const greens = ['mass', 'power', 'comms'].filter((k) => {
    const v = Number(gauges[k]);
    if (!Number.isFinite(v)) return false;
    return k === 'comms' ? v >= 3 : v >= 35;
  }).length;
  const noRed = gauges.redCount === undefined || Number(gauges.redCount) === 0;
  const budgetOk = (pct) => f.budgetPct === null || f.budgetPct >= pct;
  const solsOk = (cap) => f.sols === null || f.sols <= cap;

  if (solsOk(20) && budgetOk(20) && greens >= 3 && noRed) return 'S';
  if (solsOk(30) && budgetOk(10) && noRed) return 'A';
  return 'B';
}

/* Hàm này export riêng để bảng dev và test gọi được mà không phải
   chạy hết chín khung phim. */
export function openSummary({ container, stats, engine, onRestart, onExit } = {}) {
  injectCss();
  document.querySelectorAll('.te-sum').forEach((n) => n.remove());

  const f = readFacts(stats, engine);
  const rank = rankOf(f);
  const host = container || document.body;

  const root = document.createElement('div');
  root.className = 'te-sum';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'te-sum-title');

  const rankDesc = rank === 'S' ? pick('rankS') : rank === 'A' ? pick('rankA') : pick('rankB');

  root.innerHTML = `
    <div class="te-sum-veil"></div>
    <div class="te-sum-panel">
      <header class="te-sum-head">
        <p class="te-sum-sub"></p>
        <h2 class="te-sum-title" id="te-sum-title"></h2>
      </header>

      <section class="te-sum-rank">
        <div class="te-sum-badge" data-rank=""></div>
        <div class="te-sum-rank-txt">
          <span class="te-sum-rank-lab"></span>
          <strong class="te-sum-rank-desc"></strong>
          <p class="te-sum-rank-how"></p>
        </div>
      </section>

      <section class="te-sum-stats"></section>

      <section class="te-sum-cmp">
        <h3 class="te-sum-cmp-h"></h3>
        <p class="te-sum-cmp-sub"></p>
        <div class="te-sum-cmp-cols">
          <span></span><span class="te-sum-cmp-yours"></span><span class="te-sum-cmp-real"></span>
        </div>
        <ul class="te-sum-cmp-list"></ul>
      </section>

      <footer class="te-sum-foot">
        <button type="button" class="te-sum-btn te-sum-restart"></button>
        <button type="button" class="te-sum-btn te-sum-exit"></button>
      </footer>
    </div>
  `;

  root.querySelector('.te-sum-sub').textContent = pick('summarySub');
  root.querySelector('.te-sum-title').textContent = pick('summaryTitle');
  const badge = root.querySelector('.te-sum-badge');
  badge.dataset.rank = rank;
  badge.textContent = rank;
  root.querySelector('.te-sum-rank-lab').textContent = pick('rankLabel');
  root.querySelector('.te-sum-rank-desc').textContent = rankDesc;
  root.querySelector('.te-sum-rank-how').textContent = pick('rankHow');

  /* ---- bốn chỉ số ---- */
  const statsEl = root.querySelector('.te-sum-stats');
  const tiles = [
    { k: 'statSols', v: f.sols === null ? pick('noData') : `${fmt(f.sols)} ${pick('sol')}` },
    {
      k: 'statBudget',
      v: f.budgetPct === null && f.budgetMusd === null
        ? pick('noData')
        : [
          f.budgetPct === null ? null : `${Math.round(f.budgetPct)}%`,
          f.budgetMusd === null ? null : `${fmt(f.budgetMusd)} M`,
        ].filter(Boolean).join(' · '),
    },
    { k: 'statMass', v: f.massKg === null ? pick('noData') : `${fmt(f.massKg)} kg` },
    { k: 'statFlight', v: f.flightDays === null ? pick('noData') : `${fmt(f.flightDays)} ${pick('days')}` },
  ];
  for (const t of tiles) {
    const d = document.createElement('div');
    d.className = 'te-sum-tile';
    const lab = document.createElement('span');
    lab.className = 'te-sum-tile-k';
    lab.textContent = pick(t.k);
    const val = document.createElement('strong');
    val.className = 'te-sum-tile-v';
    val.textContent = t.v;
    d.append(lab, val);
    statsEl.appendChild(d);
  }

  /* ---- bảng đối chiếu ---- */
  root.querySelector('.te-sum-cmp-h').textContent = pick('compareTitle');
  root.querySelector('.te-sum-cmp-sub').textContent = pick('compareSub');
  root.querySelector('.te-sum-cmp-yours').textContent = pick('compareYours');
  root.querySelector('.te-sum-cmp-real').textContent = pick('compareReal');

  const mine = f.massKg === null ? pick('noData') : `${fmt(f.massKg)} kg`;
  const list = root.querySelector('.te-sum-cmp-list');
  for (const c of REAL_CRAFT) {
    const li = document.createElement('li');
    li.className = 'te-sum-cmp-row';
    const name = document.createElement('span');
    name.className = 'te-sum-cmp-name';
    name.textContent = pick(c.key);
    const yours = document.createElement('span');
    yours.className = 'te-sum-cmp-cell';
    yours.textContent = mine;
    const real = document.createElement('span');
    real.className = 'te-sum-cmp-cell';
    real.textContent = pick(c.key + 'Fact');
    li.append(name, yours, real);
    list.appendChild(li);
  }

  const restartBtn = root.querySelector('.te-sum-restart');
  restartBtn.textContent = pick('restart');
  const exitBtn = root.querySelector('.te-sum-exit');
  exitBtn.textContent = pick('exit');

  function close() {
    root.remove();
    document.removeEventListener('keydown', onKey, true);
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      if (typeof onExit === 'function') onExit();
    }
  }

  restartBtn.addEventListener('click', () => {
    close();
    if (typeof onRestart === 'function') onRestart();
  });
  exitBtn.addEventListener('click', () => {
    close();
    if (typeof onExit === 'function') onExit();
  });
  document.addEventListener('keydown', onKey, true);

  host.appendChild(root);
  requestAnimationFrame(() => {
    root.classList.add('is-in');
    if (typeof restartBtn.focus === 'function') restartBtn.focus({ preventScroll: true });
  });

  return { root, close, rank, facts: f };
}
