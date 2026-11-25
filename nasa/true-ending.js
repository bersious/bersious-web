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

import { getLang } from './i18n.js';
/* Cài đặt nằm ở settings.js, KHÔNG phải i18n.js. Import nhầm chỗ này
   làm cả module true-ending.js không nạp được (SyntaxError: i18n.js
   không export getSettings), và engine Giai đoạn 2 rơi về bảng tổng
   kết đơn giản — mất nguyên màn kết thúc đẹp nhất của game. */
import { getSettings } from './settings.js';

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
    whyTitle: 'VÌ SAO KẾT QUẢ NÀY',
    whySolsGood: 'Bạn giữ đoàn sống {n} Sol, trong hạn mức {cap} Sol mà NASA định cho một kíp cứu hộ. Thời gian là thứ đắt nhất trên Sao Hỏa: cứ thêm một Sol là thêm một chu kỳ tiêu hao oxy, nước và thức ăn.',
    whySolsBad: 'Bạn cần {n} Sol để xong việc, vượt hạn mức {cap} Sol. Phần dôi ra không chỉ là thời gian — nó là oxy, nước và calo bị đốt thêm mỗi ngày, và là rủi ro bão bụi tích tụ.',
    whyBudgetGood: 'Bạn còn {pct}% ngân sách. Dự án thật của NASA bị cắt khi vượt trần chi phí, nên giữ dư là điều kiện sống còn chứ không phải điểm cộng thẩm mỹ.',
    whyBudgetBad: 'Bạn chỉ còn {pct}% ngân sách, dưới mức an toàn {cap}%. Một sứ mệnh không có dự phòng thì mọi hỏng hóc nhỏ đều thành thảm hoạ, vì không còn tiền để phóng bù hay chế tạo lại linh kiện.',
    whyGaugeGood: 'Cả {n} đồng hồ đo chính đều nằm trong vùng xanh: khối lượng, nguồn điện và liên lạc đều còn biên an toàn.',
    whyGaugeBad: 'Có {red} đồng hồ đo ở vùng đỏ. Một hệ thống đỏ nghĩa là nó đã chạm ngưỡng giới hạn — trong thiết kế thật, đó là lý do bị loại ở vòng duyệt.',
    whyGaugePart: 'Chỉ {n} trên 3 đồng hồ đo đạt vùng xanh. Còn thiếu biên an toàn ở hệ thống còn lại, nghĩa là thiết kế vừa đủ chạy nhưng không đủ dư để chịu sai số.',
    whyMassNote: 'Tàu của bạn nặng {mass} kg. Curiosity là 899 kg, Perseverance là 1.025 kg — mỗi kg thêm vào đều làm tên lửa đắt hơn và ăng-ten liên lạc yếu đi.',
    whyNoData: 'Một số chỉ số không đọc được từ dữ liệu ván chơi, nên phần phân tích này chỉ dựa trên những gì đo được.',
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
    whyTitle: 'WHY THIS OUTCOME',
    whySolsGood: 'You kept the crew alive {n} Sols, inside the {cap}-Sol window NASA allows a rescue crew. Time is the scarcest resource on Mars: every extra Sol burns another cycle of oxygen, water and food.',
    whySolsBad: 'You needed {n} Sols, past the {cap}-Sol window. The overrun is not just calendar time — it is oxygen, water and calories burned every extra day, plus the dust-storm risk that piles up.',
    whyBudgetGood: 'You kept {pct}% of the budget. Real NASA projects get cancelled when they breach cost caps, so headroom is survival, not a cosmetic bonus.',
    whyBudgetBad: 'Only {pct}% of budget left, under the {cap}% safety floor. A mission with no reserve turns every small failure into a catastrophe, because there is no money for a reflight or a rebuilt part.',
    whyGaugeGood: 'All {n} primary gauges sit in the green band: mass, power and comms all keep a safety margin.',
    whyGaugeBad: '{red} gauge(s) in the red band. A red system has hit its hard limit — in real design reviews that is a disqualifier.',
    whyGaugePart: 'Only {n} of 3 gauges reached green. The remaining system has no margin, meaning the design barely runs but cannot absorb error.',
    whyMassNote: 'Your craft weighs {mass} kg. Curiosity is 899 kg, Perseverance is 1.025 kg — every extra kilogram makes the launch costlier and the comms link weaker.',
    whyNoData: 'Some figures could not be read from this run, so this analysis only uses what was measurable.',
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

/* Lấy chuỗi theo ngôn ngữ hiện tại. Tham số thứ hai là bảng nội suy:
   các chỗ giữ {n}, {cap}, {pct}, {mass}, {red} trong câu sẽ được thay
   bằng số thật của ván chơi. Nhờ vậy phần giải thích lý do nói được
   con số cụ thể chứ không chỉ câu chung chung. */
function pick(key, vars) {
  const tbl = TEXT[getLang()] || TEXT.vi;
  let s = tbl[key] ?? TEXT.vi[key] ?? key;
  if (vars && typeof s === 'string') {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split('{' + k + '}').join(String(v));
    }
  }
  return s;
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

    /* Khung 09: tối dần rồi hiện chữ. Khung khác: gỡ cả hai.
       rAF không làm đường duy nhất: nếu khung cuối hiện đúng lúc tab bị
       ẩn thì rAF không chạy và chữ THE END không bao giờ hiện. */
    if (last && frame.isEnd) {
      root.classList.add('is-ending');
      let endShown = false;
      const showEnd = () => {
        if (endShown || finished) return;
        endShown = true;
        dim.classList.add('is-on');
        endTitle.classList.add('is-on');
      };
      requestAnimationFrame(showEnd);
      window.setTimeout(showEnd, 32);
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
      /* Số Sol đã sống: lấy từ engine khi nguồn stats không có.
         Giai đoạn 2 gọi bảng tổng kết với stats = null, nên trước đây ô
         'SOL ĐÃ SỐNG' luôn hiện chữ dự phòng dù engine có số thật.
         Engine giữ solsRemaining (số Sol đồng đội còn sống được) và
         solsToArrival (số Sol chuyến bay). Đã sống = 300 trừ còn lại
         cộng số Sol đã bay, cùng đơn vị Sol nên cộng trừ trực tiếp. */
      if (out.sols === null) {
        const conLai = Number(st.solsRemaining);
        const daBay = Number(st.solsToArrival);
        if (Number.isFinite(conLai)) {
          out.sols = Math.max(0, Math.round(300 - conLai + (Number.isFinite(daBay) ? daBay : 0)));
        }
      }
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
/* Dựng danh sách lý do cụ thể cho kết quả ván chơi.
   Đây là phần ban giám khảo NASA chấm nặng nhất trong đề bài: game phải
   giải thích ĐƯỢC VÌ SAO thắng hay thua, chứ không chỉ hiện một huy hiệu
   hạng. Mỗi dòng dưới đây gắn với một con số thật của ván chơi; dòng nào
   thiếu dữ liệu thì bỏ qua chứ không bịa. */
function buildWhy(f, pick) {
  const out = [];
  const solsCap = 20;

  if (f.sols !== null) {
    const ok = f.sols <= solsCap;
    out.push(pick(ok ? 'whySolsGood' : 'whySolsBad', { n: f.sols, cap: solsCap }));
  }

  if (f.budgetPct !== null) {
    const cap = 20;
    const ok = f.budgetPct >= cap;
    out.push(pick(ok ? 'whyBudgetGood' : 'whyBudgetBad', { pct: Math.round(f.budgetPct), cap }));
  }

  const gauges = f.gauges || {};
  const keys = ['mass', 'power', 'comms'];
  const present = keys.filter((k) => gauges[k]);
  const greens = present.filter((k) => {
    const g = gauges[k];
    if (typeof g.status === 'string') return g.status === 'green';
    const v = Number(g.value ?? g);
    return Number.isFinite(v) && v >= 35;
  }).length;
  const reds = present.filter((k) => gauges[k].status === 'red').length;

  if (reds > 0) {
    out.push(pick('whyGaugeBad', { red: reds }));
  } else if (greens === keys.length) {
    out.push(pick('whyGaugeGood', { n: greens }));
  } else if (present.length > 0) {
    out.push(pick('whyGaugePart', { n: greens }));
  }

  if (f.massKg !== null) {
    out.push(pick('whyMassNote', { mass: fmt(f.massKg) }));
  }

  if (out.length === 0) out.push(pick('whyNoData'));
  return out;
}

function rankOf(f) {
  /* Gauges từ engine là object {value, limit, pct, status}, không phải
     số trần. Trước đây ép Number(gauges[k]) nên luôn ra NaN, greens
     bằng 0 và hạng không bao giờ lên S. Giờ đọc thẳng status: một
     đồng hồ "xanh" là khi engine đánh giá nó ở mức green. */
  const gauges = f.gauges || {};
  const keys = ['mass', 'power', 'comms'];
  const greens = keys.filter((k) => {
    const g = gauges[k];
    if (!g) return false;
    if (typeof g.status === 'string') return g.status === 'green';
    /* dự phòng cho dạng số trần nếu bảng dev truyền số */
    const v = Number(g.value ?? g);
    if (!Number.isFinite(v)) return false;
    return v >= 35;
  }).length;
  const reds = keys.filter((k) => gauges[k] && gauges[k].status === 'red').length;
  const noRed = reds === 0;
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

      <section class="te-sum-why">
        <h3 class="te-sum-why-h"></h3>
        <ul class="te-sum-why-list"></ul>
      </section>

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

  /* ---- vì sao kết quả này ---- */
  root.querySelector('.te-sum-why-h').textContent = pick('whyTitle');
  const whyList = root.querySelector('.te-sum-why-list');
  for (const reason of buildWhy(f, pick)) {
    const li = document.createElement('li');
    li.className = 'te-sum-why-item';
    li.textContent = reason;
    whyList.appendChild(li);
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
  /* Hiện bảng tổng kết. rAF bị hoãn khi tab ẩn / cửa sổ mất focus /
     máy nghẽn, nên nếu chỉ có rAF thì bảng kẹt ở opacity 0 và người
     chơi không bấm được nút Chơi lại. setTimeout làm đường chính. */
  let shown = false;
  const showRoot = () => {
    if (shown || !root.isConnected) return;
    shown = true;
    root.classList.add('is-in');
    if (typeof restartBtn.focus === 'function') restartBtn.focus({ preventScroll: true });
  };
  requestAnimationFrame(showRoot);
  window.setTimeout(showRoot, 32);

  return { root, close, rank, facts: f };
}
