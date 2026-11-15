/* ============================================================
   phase2/feature-trajectory.js
   Cửa sổ chọn quy đạo bay cho Giai đoạn 2.

   Ba lựa chọn quy đạo, mỗi thẻ là một thẻ dọc gồm tên, ba con số
   (thời gian bay, delta-v, so sánh với solsRemaining), dòng mô tả
   đánh đổi, nút Chọn/Gỡ và một biểu đồ SVG riêng vẽ hình dạng
   quỹ đạo nhìn từ trên xuống (Mặt Trời ở giữa bên trái).

   API theo phase2/CONTRACT.md:
     openTrajectoryModal({ engine, onClose }) -> { root, close }

   CÁCH SUY RA CON SỐ DELTA-V (đề bài yêu cầu ghi rõ):
     Mốc đối chiếu là bốn chặng trong src/data/nasa/rescue_mission.json,
     lấy bằng deltaVLegs() và REQUIRED_DELTA_V_MS:
       leo_departure          3.570 m/s   (doc)
       heliocentric_transfer  5.594 m/s   (calculated, chỉ là số đo
                                           năng lượng của riêng phần
                                           chuyển tiếp, KHÔNG cộng dồn)
       mars_capture           2.080 m/s   (doc)
       mars_descent           1.000 m/s   (estimate)
     Ngân sách cộng dồn đúng để kiểm tra nhiên liệu là
     REQUIRED_DELTA_V_MS = 3570 + 2080 + 1000 = 6.650 m/s.
     Thời gian bay Hohmann 258,9 ngày cũng lấy từ cùng file JSON
     (transfer.flight_time_days).

     - hohmann: đúng hồ sơ của JSON, 258,9 ngày, phần chuyển tiếp
       nhật tâm 5.594 m/s (heliocentric_reference_ms). Đây là lựa
       chọn rẻ nhất và chậm nhất của cửa sổ phóng hẹp.
     - fast_transit: 180 ngày, khoảng 9.200 m/s. Suy luận: bay nhanh
       hơn Hohmann nghĩa là elip dài hơn, vận tốc vô cực khi rời
       Trái Đất tăng từ 2,945 km/s lên khoảng 4,3 km/s (công thức
       năng lượng trên bán trục lớn ngắn hơn), tức phần khởi hành
       tăng khoảng 1,3 km/s so với 3,570 m/s; phần hãm ở Sao Hỏa
       cũng tăng tương ứng vì tới với vận tốc dư cao hơn. Cộng dồn
       hai phần đó cho khoảng 9.200 m/s, tức tốn thêm khoảng
       3.600 m/s so với 5.594 m/s của phần chuyển tiếp, đổi lại
       nhanh hơn 79 ngày. Đây là ước tính của nhóm làm game, không
       phải số liệu NASA.
     - bi_elliptic: 320 ngày, khoảng 4.800 m/s. Suy luận: quy đạo
       hai xung vung tàu ra ngoài quỹ đạo Sao Hỏa rồi quay vào,
       xung thứ nhất nhẹ hơn nhiều so với đốt thẳng tới Sao Hỏa,
       nên tổng cộng dồn thấp hơn Hohmann khoảng 800 m/s. Cái giá
       là thời gian bay dài hơn Hohmann tới 61 ngày, đồng đội trên
       Sao Hỏa có thể không chờ được. Cũng là ước tính của nhóm.

   Quy tắc dự án:
     - CSS nạp bằng new URL('.', import.meta.url).href
     - không dấu gạch dài trong chuỗi hiển thị
     - song ngữ Việt và Anh, chuỗi giữ trong chính file này
     - màu lấy từ ../src/css/tokens.css, không hardcode
     - SVG thuần viewBox, không Canvas
     - tôn trọng prefers-reduced-motion và html.motion-off
   ============================================================ */

import { REQUIRED_DELTA_V_MS, deltaVLegs } from '../nasa-data.js';

const BASE = new URL('.', import.meta.url).href;
const CSS_URL = new URL('css-trajectory.css', import.meta.url).href;

/* ---------- chuỗi song ngữ ---------- */

const T = {
  vi: {
    eyebrow: 'LẬP KẾ HOẠCH BAY',
    title: 'Chọn quy đạo bay tới Sao Hỏa',
    titleEn: 'Pick the flight path to Mars',
    sub: 'Mỗi quy đạo là một cách tiêu nhiên liệu đổi lấy thời gian. Chọn chậm thì rẻ nhưng đồng đội phải chờ lâu hơn.',
    close: 'Đóng cửa sổ',
    pick: 'Chọn',
    picked: 'Gỡ',
    pickedMark: 'Đang chọn',
    statDays: 'Thời gian bay',
    statDv: 'Delta-v cộng dồn',
    statSols: 'So với thời gian đồng đội còn lại',
    solsLeft: '{n} sol còn lại',
    enough: 'Kip thời gian, còn dư {n} sol',
    late: 'Bay lâu hơn thời gian đồng đội còn lại {n} sol',
    warnLate: 'Đồng đội không chờ được lâu vậy',
    okInTime: 'Tới kịp, còn dư {n} sol',
    noteCompare: 'Con số so sánh lấy từ đồng hồ thời gian của engine: state.solsRemaining.',
    footNote: 'Con số delta-v lấy từ bốn chặng trong src/data/nasa/rescue_mission.json, xem phần giải thích ở đầu feature-trajectory.js.',
    chartCaption: '{d} ngày bay · {v} m/s',
    chartEarth: 'TD',
    chartMars: 'SH',
    chartSun: 'MT',
    chartTitle: 'Hình dạng quy đạo nhìn từ trên xuống',
  },
  en: {
    eyebrow: 'FLIGHT PLANNING',
    title: 'Pick the flight path to Mars',
    titleEn: 'Pick the flight path to Mars',
    sub: 'Each path trades propellant for time. The slow one is cheap, but the crew has to hold out much longer.',
    close: 'Close the window',
    pick: 'Select',
    picked: 'Remove',
    pickedMark: 'Selected',
    statDays: 'Flight time',
    statDv: 'Additive delta-v',
    statSols: 'Against the crew time left',
    solsLeft: '{n} sols left',
    enough: 'In time, {n} sols to spare',
    late: 'Flies {n} sols longer than the crew has left',
    warnLate: 'The crew cannot wait that long',
    okInTime: 'Arrives in time, {n} sols to spare',
    noteCompare: 'The comparison reads the engine time gauge: state.solsRemaining.',
    footNote: 'Delta-v figures come from the four legs in src/data/nasa/rescue_mission.json, see the derivation note at the top of feature-trajectory.js.',
    chartCaption: '{d} days of flight · {v} m/s',
    chartEarth: 'TD',
    chartMars: 'SH',
    chartSun: 'MT',
    chartTitle: 'Path shape seen from above',
  },
};

/* ---------- ba lựa chọn quy đạo ----------
   Con số và cách suy ra đã ghi ở đầu file. days là ngày Trái Đất,
   dvMs là ngân sách cộng dồn đúng để kiểm tra nhiên liệu. */

const TRAJECTORIES = [
  {
    id: 'hohmann',
    name_vi: 'Quy đạo Hohmann tiết kiệm',
    name_en: 'Lean Hohmann transfer',
    tradeoff_vi:
      'Re nhất và chậm nhất của cửa sổ phóng hẹp. Một lần đốt mỗi chặng, tốn ít nhiên liệu nhất, nhưng 258,9 ngày trên đường là rất lâu khi có người đang chờ cứu.',
    tradeoff_en:
      'The cheapest and slowest option of the narrow launch window. One burn per leg, the least propellant of any path, but 258.9 days in flight is a long time when people are waiting for rescue.',
    days: 258.9,
    dvMs: 5594,
    dvNote_vi: 'Đúng phần chuyển tiếp nhật tâm 5.594 m/s của hồ sơ Hohmann trong rescue_mission.json.',
    dvNote_en: 'Exactly the 5594 m/s heliocentric transfer of the Hohmann profile in rescue_mission.json.',
    /* Hình dạng: nửa vòng elip rộng, rời Trái Đất cong nhẹ ra ngoài
       rồi vào thẳng Sao Hỏa. */
    chart: 'hohmann',
  },
  {
    id: 'fast_transit',
    name_vi: 'Đường bay tốc độ cao',
    name_en: 'High speed transit',
    tradeoff_vi:
      'Nhanh hơn 79 ngày nhưng tốn thêm khoảng 3.600 m/s. Elip dài hơn phải đốt mạnh hơn lúc rời Trái Đất và hãm gắt hơn lúc tới nơi, tức bình nhiên liệu to hơn.',
    tradeoff_en:
      '79 days faster but about 3600 m/s more expensive. The longer ellipse burns harder leaving Earth and brakes harder on arrival, which means a bigger tank.',
    days: 180,
    dvMs: 9200,
    dvNote_vi: 'Ước tính của nhóm làm game: khởi hành tăng khoảng 1,3 km/s cộng hãm tăng tương ứng, so với 5.594 m/s của Hohmann.',
    dvNote_en: 'A game side estimate: departure up about 1.3 km/s plus a matching harder capture, against the 5594 m/s Hohmann figure.',
    /* Hình dạng: cung ngắn hơn nhưng vọt xa ra ngoài quỹ đạo. */
    chart: 'fast',
  },
  {
    id: 'bi_elliptic',
    name_vi: 'Quy đạo hai xung',
    name_en: 'Bi elliptic transfer',
    tradeoff_vi:
      'Rẻ nhất về nhiên liệu nhưng chậm: vung tàu ra ngoài quỹ đạo Sao Hỏa rồi mới quay vào, tiết kiệm khoảng 800 m/s, đổi lại 320 ngày và đồng đội có thể không chờ được.',
    tradeoff_en:
      'The cheapest in propellant but slow: swing out beyond Mars orbit and curve back in, saving about 800 m/s at the cost of 320 days, and the crew may not last that long.',
    days: 320,
    dvMs: 4800,
    dvNote_vi: 'Ước tính của nhóm làm game: xung thứ nhất nhẹ hơn đốt thẳng tới Sao Hỏa, tổng thấp hơn Hohmann khoảng 800 m/s.',
    dvNote_en: 'A game side estimate: the first burn is gentler than flying straight to Mars, so the total sits about 800 m/s under Hohmann.',
    /* Hình dạng: vòng lớn vung ra ngoài quỹ đạo Sao Hỏa rồi mới
       quay vào đón Sao Hỏa. */
    chart: 'bi',
  },
];

/* ---------- tiện ích ---------- */

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fill(str, vars) {
  let s = str;
  for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

function fmt(n, digits = 0) {
  if (!Number.isFinite(Number(n))) return '0';
  const fixed = Number(n).toFixed(digits);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
}

function fmtEn(n, digits = 0) {
  if (!Number.isFinite(Number(n))) return '0';
  return Number(n).toFixed(digits);
}

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  link.dataset.featureCss = 'trajectory';
  document.head.appendChild(link);
}

function readMotion() {
  let gameOn = true;
  try {
    if (document.documentElement.classList.contains('motion-off')) gameOn = false;
  } catch {
    /* không có document thì bỏ qua */
  }
  let osOk = true;
  try {
    osOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    osOk = true;
  }
  return gameOn && osOk;
}

function currentLang() {
  try {
    const lang = (document.documentElement.getAttribute('lang') || 'vi').toLowerCase();
    return lang.indexOf('vi') === 0 ? 'vi' : 'en';
  } catch {
    return 'vi';
  }
}

function readState(engine) {
  if (!engine || typeof engine.getState !== 'function') return null;
  try {
    return engine.getState() || null;
  } catch {
    return null;
  }
}

/* Mốc đối chiếu: tổng cộng dồn của các chặng thật. Dùng làm ghi chú
   kiểm chứng ở chân modal, không dùng để chặn lựa chọn. */
function legsSummary() {
  try {
    const legs = deltaVLegs();
    return legs.map((l) => l.id + ' ' + fmt(l.delta_v_ms, 0)).join(' + ');
  } catch {
    return '';
  }
}

/* ============================================================
   BA BIỂU ĐỒ SVG
   Cùng một viewBox 0 0 660 150, cùng bố cục: Mặt Trời ở giữa bên
   trái, Trái Đất và Sao Hỏa ở hai bán kính quỹ đạo khác nhau.
   Khác nhau nằm ở đường bay:
     hohmann      nửa vòng elip rộng, cong nhẹ ra ngoài rồi vào
     fast_transit cung ngắn hơn nhưng vọt xa khỏi quỹ đạo
     bi_elliptic  vòng lớn vung ra ngoài quỹ đạo Sao Hỏa rồi mới
                  quay vào
   ============================================================ */

const CH_W = 660;
const CH_H = 150;

/* Khung nhìn là cửa sổ nhìn từ trên xuống, góc nhìn xiên nên quỹ đạo
   tròn hiện ra thành elip dẹt. Mặt Trời nằm giữa bên trái và là TÂM
   của cả hai elip, nên hai quỹ đạo đồng tâm đúng như thật.

   Chỉ vẽ phần cung quay về phía phải (khoảng -92 tới +92 độ): đó là
   phần cửa sổ nhìn thấy được, và cũng tránh cảnh cắt cụt nửa elip
   bên trái khiến hình trông như lệch tâm. */
const SUN_X = 76;
const SUN_Y = 80;
const E_RX = 215;
const E_RY = 30;
const M_RX = 505;
const M_RY = 58;
const ARC_FROM = -92;
const ARC_TO = 92;

function ellipsePoint(cx, cy, rx, ry, deg) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
}

/* Cung elip quanh Mặt Trời, dùng lệnh A của SVG. */
function ellipseArcPath(rx, ry, fromDeg, toDeg) {
  const p1 = ellipsePoint(SUN_X, SUN_Y, rx, ry, fromDeg);
  const p2 = ellipsePoint(SUN_X, SUN_Y, rx, ry, toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return (
    'M ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1) +
    ' A ' + rx + ' ' + ry + ' 0 ' + large + ' 1 ' +
    p2.x.toFixed(1) + ' ' + p2.y.toFixed(1)
  );
}

/* Trái Đất lúc phóng ở góc 24 độ, Sao Hỏa lúc tàu tới ở góc -24 độ:
   hai điểm nằm hai bên trục ngang, chừa chỗ cho đường bay vòng lên. */
const EARTH_DEG = 24;
const MARS_DEG = -24;

const E = ellipsePoint(SUN_X, SUN_Y, E_RX, E_RY, EARTH_DEG);
const M = ellipsePoint(SUN_X, SUN_Y, M_RX, M_RY, MARS_DEG);

const n = (v) => v.toFixed(1);

function orbitSvg() {
  const eArc = ellipseArcPath(E_RX, E_RY, ARC_FROM, ARC_TO);
  const mArc = ellipseArcPath(M_RX, M_RY, ARC_FROM, ARC_TO);
  return `
    <path class="tj-orbit tj-orbit-earth" d="${eArc}"></path>
    <path class="tj-orbit tj-orbit-mars" d="${mArc}"></path>`;
}

function sunSvg() {
  return `
    <circle class="tj-sun-glow" cx="${SUN_X}" cy="${SUN_Y}" r="30"></circle>
    <circle class="tj-sun-glow2" cx="${SUN_X}" cy="${SUN_Y}" r="19"></circle>
    <circle class="tj-sun" cx="${SUN_X}" cy="${SUN_Y}" r="10"></circle>`;
}

/* Ba đường bay, ba chuỗi d khác nhau hoàn toàn và khác nhau về hình
   dạng thấy được, không chỉ khác độ dài chuỗi:
     hohmann  một vòm êm, đỉnh nằm gọn GIỮA hai quỹ đạo (khoảng y 34)
     fast     cung ngắn nhưng vọt lên tới y 4, vượt hẳn đỉnh quỹ đạo
              Sao Hỏa (y 22), rồi mới cắm xuống đón
     bi       một thuỳ lớn vung xa sang phải tới x 606, vượt cả bán
              kính quỹ đạo Sao Hỏa, rồi móc ngược trở lại điểm hẹn */

/* Đuôi đường bay dừng lại trước chấm Sao Hỏa đúng một khoảng, để đầu
   mũi tên nằm ngoài chấm và nhìn thấy được, không bị chấm che mất. */
const ARROW_GAP = 16;

function backOff(from, to, dist) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: to.x - (dx / len) * dist, y: to.y - (dy / len) * dist };
}

function cubicD(p0, c1, c2, p3) {
  return (
    `M ${n(p0.x)} ${n(p0.y)} ` +
    `C ${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(p3.x)} ${n(p3.y)}`
  );
}

function multiCubicD(p0, chunks) {
  let d = `M ${n(p0.x)} ${n(p0.y)} `;
  for (const c of chunks) {
    d += `C ${n(c.c1.x)} ${n(c.c1.y)} ${n(c.c2.x)} ${n(c.c2.y)} ${n(c.p.x)} ${n(c.p.y)} `;
  }
  return d.trim();
}

function pathHohmann() {
  const c1 = { x: 320, y: 44 };
  const c2 = { x: 470, y: 30 };
  return cubicD(E, c1, c2, backOff(c2, M, ARROW_GAP));
}

function pathFast() {
  const c1 = { x: 276, y: 30 };
  const mid = { x: 410, y: 6 };
  const c3 = { x: 520, y: 26 };
  return multiCubicD(E, [
    { c1, c2: { x: 330, y: 4 }, p: mid },
    { c1: { x: 470, y: 8 }, c2: c3, p: backOff(c3, M, ARROW_GAP) },
  ]);
}

function pathBi() {
  const mid = { x: 430, y: 4 };
  const far = { x: 606, y: 60 };
  const c5 = { x: 570, y: 96 };
  return multiCubicD(E, [
    { c1: { x: 320, y: 40 }, c2: { x: 360, y: 6 }, p: mid },
    { c1: { x: 520, y: 2 }, c2: { x: 600, y: 20 }, p: far },
    { c1: { x: 610, y: 92 }, c2: c5, p: backOff(c5, M, ARROW_GAP) },
  ]);
}

const PATHS = { hohmann: pathHohmann, fast: pathFast, bi: pathBi };

let chartSeq = 0;

function chartSvg(traj, t) {
  chartSeq += 1;
  const arrowId = 'tj-arrow-' + chartSeq;
  const d = (PATHS[traj.chart] || pathHohmann)();
  return `
    <svg class="tj-chart" viewBox="0 0 ${CH_W} ${CH_H}" role="img"
         aria-label="${esc(traj.name_vi)} · ${esc(t('chartTitle'))}"
         preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="${arrowId}" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" class="tj-arrow-head"></path>
        </marker>
      </defs>
      ${orbitSvg()}
      ${sunSvg()}
      <path class="tj-flight" d="${d}" marker-end="url(#${arrowId})"></path>
      <circle class="tj-dot-halo tj-dot-halo-earth" cx="${n(E.x)}" cy="${n(E.y)}" r="10"></circle>
      <circle class="tj-dot tj-dot-earth" cx="${n(E.x)}" cy="${n(E.y)}" r="5.5"></circle>
      <text class="tj-tag tj-tag-earth" x="${n(E.x)}" y="${n(E.y + 20)}" text-anchor="middle">${esc(t('chartEarth'))}</text>
      <circle class="tj-dot-halo tj-dot-halo-mars" cx="${n(M.x)}" cy="${n(M.y)}" r="12"></circle>
      <circle class="tj-dot tj-dot-mars" cx="${n(M.x)}" cy="${n(M.y)}" r="7"></circle>
      <text class="tj-tag tj-tag-mars" x="${n(M.x)}" y="${n(M.y + 24)}" text-anchor="middle">${esc(t('chartMars'))}</text>
      <text class="tj-tag tj-tag-sun" x="${SUN_X}" y="${n(SUN_Y + 27)}" text-anchor="middle">${esc(t('chartSun'))}</text>
    </svg>`;
}

/* ============================================================
   MODULE CHÍNH / MAIN
   ============================================================ */

let uid = 0;

export function openTrajectoryModal({ engine, onClose } = {}) {
  injectCss();

  uid += 1;
  const titleId = 'tj-title-' + uid;

  let lang = currentLang();
  const t = (key) => {
    const table = T[lang] || T.vi;
    return table[key] != null ? table[key] : key;
  };
  const fmtNum = (n, digits) => (lang === 'en' ? fmtEn(n, digits) : fmt(n, digits));

  /* Chọn hiện có, đọc từ engine. Engine có thể chưa hỗ trợ nhóm
     trajectory, nên đọc an toàn và mặc định là chưa chọn. */
  const state0 = readState(engine);
  let pickedId =
    (state0 && state0.selection && state0.selection.trajectory) || null;
  if (pickedId && !TRAJECTORIES.some((tr) => tr.id === pickedId)) pickedId = null;

  const root = document.createElement('div');
  root.className = 'tj-root';
  root.innerHTML = `
    <div class="tj-scrim" data-close="scrim"></div>
    <div class="tj-modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <header class="tj-head">
        <div class="tj-head-text">
          <p class="tj-eyebrow mono">${esc(t('eyebrow'))}</p>
          <h2 class="tj-title" id="${titleId}">${esc(t('title'))}</h2>
          <p class="tj-sub">${esc(t('sub'))}</p>
        </div>
        <button type="button" class="tj-x" data-close="x" aria-label="${esc(t('close'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
               stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="tj-scroll">
        <div class="tj-cards"></div>
        <p class="tj-note">${esc(t('noteCompare'))}</p>
        <p class="tj-footnote">${esc(t('footNote'))}${legsSummary() ? ' · ' + esc(legsSummary()) : ''}</p>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const cardsEl = root.querySelector('.tj-cards');
  const solsRemaining = Number(state0 && state0.solsRemaining);
  const hasSols = Number.isFinite(solsRemaining) && solsRemaining > 0;

  /* ---------- dựng ba thẻ ---------- */

  const cardViews = TRAJECTORIES.map((traj) => {
    const card = document.createElement('article');
    card.className = 'tj-card';
    card.dataset.id = traj.id;

    /* Cảnh báo sinh tồn: so thời gian bay với solsRemaining. */
    let survivalClass = '';
    let survivalText = '';
    if (hasSols) {
      if (traj.days > solsRemaining) {
        survivalClass = 'is-late';
        survivalText = t('late').replace('{n}', fmtNum(traj.days - solsRemaining, 0));
      } else {
        survivalClass = 'is-in-time';
        survivalText = t('enough').replace('{n}', fmtNum(solsRemaining - traj.days, 0));
      }
    }

    const dv = fmtNum(traj.dvMs, 0);
    card.innerHTML = `
      <div class="tj-card-head">
        <h3 class="tj-name"><span class="tj-name-vi">${esc(traj.name_vi)}</span>
            <em class="tj-name-en">${esc(traj.name_en)}</em></h3>
        <button type="button" class="tj-pick" data-act="pick" data-id="${esc(traj.id)}">
          <span class="tj-pick-txt"></span>
        </button>
      </div>
      <dl class="tj-stats">
        <div class="tj-stat"><dt>${esc(t('statDays'))}</dt><dd class="mono">${fmtNum(traj.days, 1)}</dd></div>
        <div class="tj-stat"><dt>${esc(t('statDv'))}</dt><dd class="mono">${dv} m/s</dd></div>
        <div class="tj-stat tj-stat-sols"><dt>${esc(t('statSols'))}</dt>
          <dd class="mono ${survivalClass}">${hasSols ? fill(t('solsLeft'), { n: fmtNum(solsRemaining, 0) }) : '...'}</dd></div>
      </dl>
      <p class="tj-survival ${survivalClass}" role="status">${esc(survivalText)}</p>
      <p class="tj-trade"><span class="tj-lang mono">VI</span><span class="tj-txt">${esc(traj.tradeoff_vi)}</span></p>
      <p class="tj-trade tj-trade-en"><span class="tj-lang mono">EN</span><span class="tj-txt">${esc(traj.tradeoff_en)}</span></p>
      <p class="tj-dvnote">${esc(lang === 'en' ? traj.dvNote_en : traj.dvNote_vi)}</p>
      <div class="tj-chart-wrap">${chartSvg(traj, t)}</div>
      <p class="tj-caption mono">${fill(t('chartCaption'), { d: fmtNum(traj.days, 1), v: dv })}</p>
    `;
    cardsEl.appendChild(card);

    return { traj, card, pickBtn: card.querySelector('.tj-pick') };
  });

  /* ---------- vẽ trạng thái chọn ---------- */

  function paint() {
    for (const v of cardViews) {
      const on = pickedId === v.traj.id;
      v.card.classList.toggle('is-picked', on);
      v.pickBtn.classList.toggle('is-on', on);
      v.pickBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      v.pickBtn.querySelector('.tj-pick-txt').textContent = on ? t('picked') : t('pick');
    }
  }

  /* ---------- chọn: gọi engine trong try/catch ----------
     Engine có thể chưa hỗ trợ nhóm trajectory, vẫn gọi và ghi rõ
     ở comment: hợp đồng yêu cầu gọi đúng dạng này, engine từ chối
     thì chỉ là cảnh báo, không làm vỡ modal. */

  function choose(traj) {
    const turningOff = pickedId === traj.id;
    pickedId = turningOff ? null : traj.id;
    try {
      if (engine && typeof engine.updateSelection === 'function') {
        engine.updateSelection({ group: 'trajectory', part: turningOff ? null : traj.id });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[tj] updateSelection lỗi', err);
    }
    paint();
  }

  cardsEl.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-act="pick"]');
    if (!btn) return;
    const traj = TRAJECTORIES.find((x) => x.id === btn.dataset.id);
    if (traj) choose(traj);
  });

  /* ---------- đóng ---------- */

  let destroyed = false;
  let lastFocus = document.activeElement;

  function close() {
    if (destroyed) return;
    destroyed = true;
    document.removeEventListener('keydown', onKey, true);
    root.classList.add('is-closing');
    if (typeof onClose === 'function') {
      try {
        onClose();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[tj] onClose lỗi', err);
      }
    }
    root.remove();
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try {
        lastFocus.focus({ preventScroll: true });
      } catch {
        /* phần tử cũ đã bị gỡ thì thôi */
      }
    }
  }

  function focusables() {
    const sel = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(root.querySelectorAll(sel)).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  function onKey(ev) {
    if (destroyed) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      close();
      return;
    }
    if (ev.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    if (list.indexOf(active) < 0) {
      ev.preventDefault();
      first.focus();
      return;
    }
    if (!ev.shiftKey && active === last) {
      ev.preventDefault();
      first.focus();
    } else if (ev.shiftKey && active === first) {
      ev.preventDefault();
      last.focus();
    }
  }

  root.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-close]')) close();
  });

  document.addEventListener('keydown', onKey, true);

  const xBtn = root.querySelector('.tj-x');
  if (xBtn) xBtn.focus({ preventScroll: true });

  paint();

  return { root, close };
}

export default openTrajectoryModal;
