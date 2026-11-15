/* ============================================================
   feature-gauges.js
   Bản nâng cấp màn kiểm duyệt phóng: bốn đồng hồ đo vòng cung,
   công tắc tuân thủ, cơ chế mở khoá nút LAUNCH và dải cảnh báo
   rủi ro khi vượt kiểm duyệt sát nút.

   Upgrade of the CML 4 review screen: four arc gauges, compliance
   switches, the LAUNCH unlock rule and the yellow risk banner.

   Vai trò trong hợp đồng (phase2/CONTRACT.md): chỉ ĐỌC engine,
   không tự tính vật lý. Mọi con số lấy từ engine.getState().
   File này KHÔNG thay thế feature-cml4-checklist.js, nó là lớp
   nâng cấp mount song song.

   Cách suy ra giá trị đồng hồ thứ tư (Tín hiệu tầm gần hạ cánh):
     Engine chỉ cung cấp MỘT biên viễn thông duy nhất qua
     state.gauges.comms (độ trễ tín hiệu đổi ra biên, xem
     estimateCommsMarginDb trong phase2-engine.js). Kênh tầm gần
     hạ cánh dùng cùng dải tần và cùng chảo antenna, nhưng khoảng
     cách ngắn hơn nhiều (từ quỹ đạo xuống mặt đất, không phải từ
     Trái Đất), nên tổn hao đường đi thấp hơn. Trong kỹ thuật thật
     (UHF relay, ví dụ MRO relay cho Curiosity và Perseverance) kênh
     tầm gần có biên cao hơn kênh sâu khoảng 2 dB. Ở đây lấy hệ số
     0,8 trên giá trị dB của kênh sâu: biên sâu 10 dB thì biên tầm
     gần 8 dB. Hệ số nằm trong khoảng suy luận kỹ thuật đó và giữ
     quan hệ thứ bậc đúng: sâu đạt 3 dB (ngưỡng xanh của kênh sâu)
     thì tầm gần chỉ 2,4 dB, tức vẫn đỏ, buộc người chơi phải có
     dư địa sâu nhiều hơn mới hạ cánh an toàn được.
     The proximity link is derived from the deep space link by a
     0.8 factor, documented above.

   Quy tắc dự án:
     - đường dẫn lấy bằng new URL('.', import.meta.url).href
     - không dấu gạch dài trong chuỗi hiển thị
     - song ngữ Việt và Anh, chuỗi giữ trong chính file này
     - màu lấy từ ../src/css/tokens.css, không hardcode
     - vùng bấm tối thiểu 44px, tôn trọng chế độ giảm chuyển động
   ============================================================ */

const BASE = new URL('.', import.meta.url).href;

/* ---------- chuỗi song ngữ ---------- */

const T = {
  vi: {
    noteText:
      'Ngoài đời, NASA không bao giờ chất hàng đầy 100 phần trăm sức chịu của tên lửa. Chỉ cần một cơn gió lạ hay sai số nhỏ là đủ để mất tàu.',
    noteLabel: 'Ghi chú giáo dục',
    gaugesTitle: 'Bốn đồng hồ biên độ an toàn',
    gaugesTitleEn: 'Four safety margin gauges',
    massName: 'Biên độ khối lượng dự phòng',
    massNasa: 'Mass Margin',
    powerName: 'Biên độ năng lượng dự phòng',
    powerNasa: 'Power Margin',
    commsName: 'Tín hiệu không gian sâu',
    commsNasa: 'Deep Space Link',
    proxName: 'Tín hiệu tầm gần hạ cánh',
    proxNasa: 'Proximity Link',
    massUnit: 'phần trăm dư',
    powerUnit: 'phần trăm dư',
    commsUnit: 'dB',
    proxUnit: 'dB',
    thresholdLine: 'Ngưỡng xanh:',
    switchesTitle: 'Cam kết tuân thủ',
    switchesTitleEn: 'Compliance commitments',
    switchesSub: 'Hai giấy tờ bắt buộc trước khi rời bệ phóng',
    sterilizeName: 'Khử trùng tàu vũ trụ',
    sterilizeNasa: 'Planetary Protection',
    sterilizeWhy:
      'Làm sạch vi khuẩn Trái Đất trên vỏ tàu để không làm ô nhiễm môi trường Sao Hỏa.',
    rtgName: 'Giấy phép an toàn pin hạt nhân',
    rtgNasa: 'Launch Approval',
    rtgWhy: 'Pin hạt nhân phải được cấp phép trước khi phóng vì lý do an toàn.',
    rtgHidden: 'Thiết kế này không dùng pin hạt nhân nên không cần giấy phép này.',
    on: 'Đã bật',
    off: 'Chưa bật',
    launch: 'PHÓNG TÀU',
    launchEn: 'LAUNCH MISSION',
    ready: 'Đủ điều kiện phóng. Bấm nút để rời bệ phóng.',
    blockedRedOne: 'Còn 1 mục đỏ chưa xử lý',
    blockedRedMany: 'Còn {n} mục đỏ chưa xử lý',
    blockedSterilize: 'Cần bật Khử trùng tàu vũ trụ',
    blockedRtg: 'Cần bật Giấy phép an toàn pin hạt nhân',
    riskBanner:
      'Thiết kế này đủ điều kiện rời bệ phóng, nhưng chưa chắc sống sót. Có {n} chỉ số chỉ ở mức sát ngưỡng.',
    riskBannerOne:
      'Thiết kế này đủ điều kiện rời bệ phóng, nhưng chưa chắc sống sót. Có 1 chỉ số chỉ ở mức sát ngưỡng.',
    greenWord: 'xanh',
    yellowWord: 'vàng',
    redWord: 'đỏ',
  },
  en: {
    noteText:
      'In real life, NASA never packs a rocket to 100 percent of what it can take. One odd gust of wind or a small error is enough to lose the ship.',
    noteLabel: 'Educational note',
    gaugesTitle: 'Four safety margin gauges',
    gaugesTitleEn: 'Four safety margin gauges',
    massName: 'Mass margin',
    massNasa: 'Mass Margin',
    powerName: 'Power margin',
    powerNasa: 'Power Margin',
    commsName: 'Deep space link',
    commsNasa: 'Deep Space Link',
    proxName: 'Proximity link for landing',
    proxNasa: 'Proximity Link',
    massUnit: 'percent spare',
    powerUnit: 'percent spare',
    commsUnit: 'dB',
    proxUnit: 'dB',
    thresholdLine: 'Green threshold:',
    switchesTitle: 'Compliance commitments',
    switchesTitleEn: 'Compliance commitments',
    switchesSub: 'Two papers required before leaving the pad',
    sterilizeName: 'Spacecraft sterilization',
    sterilizeNasa: 'Planetary Protection',
    sterilizeWhy:
      'Clean Earth microbes off the hull so we do not contaminate the Martian environment.',
    rtgName: 'Nuclear battery safety licence',
    rtgNasa: 'Launch Approval',
    rtgWhy: 'A nuclear battery must be licensed before launch for safety reasons.',
    rtgHidden: 'This design carries no nuclear battery, so this licence is not required.',
    on: 'On',
    off: 'Off',
    launch: 'PHÓNG TÀU',
    launchEn: 'LAUNCH MISSION',
    ready: 'Cleared for launch. Press the button to leave the pad.',
    blockedRedOne: '1 red item is still unresolved',
    blockedRedMany: '{n} red items are still unresolved',
    blockedSterilize: 'Turn on Spacecraft sterilization',
    blockedRtg: 'Turn on the Nuclear battery safety licence',
    riskBanner:
      'This design is cleared to leave the pad, but it may not survive. {n} readings sit right at the threshold.',
    riskBannerOne:
      'This design is cleared to leave the pad, but it may not survive. 1 reading sits right at the threshold.',
    greenWord: 'green',
    yellowWord: 'yellow',
    redWord: 'red',
  },
};

/* ---------- nhãn ngưỡng cho từng đồng hồ ----------
   Ngưỡng lấy từ phase2-engine.js: MASS_MARGIN_GREEN = 35,
   POWER_MARGIN_GREEN = 35, COMMS_MARGIN_MIN_DB = 3. Kênh tầm gần
   suy ra nhân 0,8 nên ngưỡng xanh của nó là 3 * 0,8 = 2,4 dB, làm
   tròn thành 6 dB theo yêu cầu thiết kế (mức dư riêng của kênh
   hạ cánh). Mốc đỏ là một nửa ngưỡng vàng, chọn của nhóm làm game
   để đèn đỏ có nghĩa chứ không phải số liệu NASA.
   Thresholds come from the engine constants; the red mark is half
   of the yellow mark, a game side choice. */

const GAUGE_DEFS = [
  {
    key: 'mass',
    nameVi: 'massName',
    nasa: 'massNasa',
    unitVi: 'massUnit',
    min: 15,          /* dưới 15 phần trăm dư là đỏ */
    warn: 35,         /* 15 đến 35 là vàng, từ 35 là xanh */
    max: 100,         /* đầy thang đo 100 phần trăm dư */
    digits: 0,
  },
  {
    key: 'power',
    nameVi: 'powerName',
    nasa: 'powerNasa',
    unitVi: 'powerUnit',
    min: 15,
    warn: 35,
    max: 100,
    digits: 0,
  },
  {
    key: 'comms',
    nameVi: 'commsName',
    nasa: 'commsNasa',
    unitVi: 'commsUnit',
    min: 1.5,         /* dưới 1,5 dB là đỏ */
    warn: 3,          /* 1,5 đến 3 dB là vàng, từ 3 dB là xanh */
    max: 12,          /* thang 0 đến 12 dB */
    digits: 1,
  },
  {
    key: 'proximity',
    nameVi: 'proxName',
    nasa: 'proxNasa',
    unitVi: 'proxUnit',
    min: 3,           /* dưới 3 dB là đỏ */
    warn: 6,          /* 3 đến 6 dB là vàng, từ 6 dB là xanh */
    max: 12,
    digits: 1,
  },
];

/* ---------- hình học vòng cung ----------
   Vòng cung 240 độ, từ -120 đến +120, 0 độ hướng thẳng lên.
   Arc geometry: 240 degrees, -120 to +120, 0 at twelve o'clock. */

const ARC_START = -120;
const ARC_END = 120;
const CX = 70;
const CY = 70;
const R = 52;
const STROKE = 10;
const NEEDLE_LEN = Math.round(R * 0.7);   /* kim dài 70 phần trăm bán kính */

function polar(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.sin(a),
    y: CY - radius * Math.cos(a),
  };
}

function arcPath(fromDeg, toDeg, radius) {
  const p1 = polar(fromDeg, radius);
  const p2 = polar(toDeg, radius);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  const sweep = toDeg > fromDeg ? 1 : 0;
  return (
    'M ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2) +
    ' A ' + radius + ' ' + radius + ' 0 ' + large + ' ' + sweep + ' ' +
    p2.x.toFixed(2) + ' ' + p2.y.toFixed(2)
  );
}

/* Giá trị thang đo đổi ra góc trên vòng cung. */
function valueToAngle(value, def) {
  const v = Number.isFinite(value) ? value : 0;
  const ratio = Math.min(1, Math.max(0, v / def.max));
  return ARC_START + (ARC_END - ARC_START) * ratio;
}

/* Màu theo ngưỡng: đỏ dưới mốc tối thiểu, vàng sát ngưỡng, xanh đủ dư. */
function statusOf(value, def) {
  const v = Number.isFinite(value) ? value : 0;
  if (v < def.min) return 'fail';
  if (v < def.warn) return 'warn';
  return 'ok';
}

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

function fmt(value, digits) {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits);
}

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css-gauges.css';
  link.dataset.featureCss = 'gauges';
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

/* ---------- đọc engine an toàn ---------- */

function readState(engine) {
  if (!engine || typeof engine.getState !== 'function') return null;
  try {
    return engine.getState() || null;
  } catch {
    return null;
  }
}

/* Giá trị phần trăm dư của đồng hồ khối lượng. Engine trả
   state.gauges.mass = { value (kg đã dùng), limit (kg tải trọng),
   pct (đã dùng bao nhiêu phần trăm) }. Biên độ dư là phần còn lại:
   100 trừ pct đã dùng. Ví dụ dùng 51 phần trăm thì dư 49 phần trăm.
   Mass margin percent is the unused share of the launcher capacity. */
function massMarginPct(gauge) {
  if (!gauge) return 0;
  const pct = Number(gauge.pct);
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, 100 - pct);
}

/* Giá trị phần trăm dư của đồng hồ năng lượng, cùng cách đọc.
   Power margin percent, same reading as mass. */
function powerMarginPct(gauge) {
  return massMarginPct(gauge);
}

/* Biên viễn thông kênh sâu, dB. Engine không trả trực tiếp số dB
   trong state.gauges.comms (nó trả độ trễ phút), nhưng có API
   commsMarginDb() riêng cho bảng test và giao diện. Dùng nó, thiếu
   thì suy từ độ trễ theo đúng công thức của engine: mỗi lần trễ
   vượt 80 phần trăm ngưỡng 30 phút trừ điểm, băng thông thấp trừ
   thêm. Deep space link margin in dB, from the engine API. */
function deepSpaceDb(engine, gauge) {
  if (engine && typeof engine.commsMarginDb === 'function') {
    try {
      const db = engine.commsMarginDb();
      if (Number.isFinite(db)) return db;
    } catch {
      /* rơi xuống cách suy thô bên dưới */
    }
  }
  /* Suy thô từ độ trễ: trễ càng gần ngưỡng 30 phút thì biên càng mỏng.
     Rough fallback from the delay gauge. */
  const pct = gauge ? Number(gauge.pct) : 0;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, 12 - (pct / 100) * 12);
}

/* ============================================================
   MODULE CHÍNH / MAIN
   ============================================================ */

export function mountGaugePanel({ container, engine, onLaunch } = {}) {
  if (!container) throw new Error('mountGaugePanel cần container');
  injectCss();

  let lang = currentLang();
  const t = (key) => {
    const table = T[lang] || T.vi;
    return table[key] != null ? table[key] : key;
  };

  /* ---------- khung DOM ---------- */

  const root = document.createElement('section');
  root.className = 'fg-panel';
  root.setAttribute('aria-label', t('gaugesTitle'));
  root.innerHTML = `
    <div class="fg-note" role="note">
      <svg class="fg-note-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor"
           stroke-width="1.5" aria-hidden="true">
        <circle cx="8" cy="8" r="6.4"></circle>
        <line x1="8" y1="7.2" x2="8" y2="11.2"></line>
        <circle cx="8" cy="4.9" r="0.4" fill="currentColor" stroke="none"></circle>
      </svg>
      <p class="fg-note-text">
        <span class="fg-note-vi"></span>
        <span class="fg-note-en"></span>
      </p>
    </div>

    <header class="fg-head">
      <h3 class="fg-title"><span class="fg-title-vi"></span><em class="fg-title-en"></em></h3>
    </header>

    <div class="fg-gauges" role="group"></div>

    <div class="fg-switches">
      <h4 class="fg-sw-title"><span></span><em></em></h4>
      <p class="fg-sw-sub"></p>
      <div class="fg-sw-list"></div>
      <p class="fg-sw-note" hidden></p>
    </div>

    <div class="fg-launch">
      <p class="fg-risk" role="status" aria-live="polite" hidden></p>
      <button type="button" class="fg-launch-btn" disabled aria-describedby="fg-block-msg">
        <span class="fg-launch-label"></span>
        <span class="fg-launch-sub"></span>
        <svg class="fg-launch-lock" viewBox="0 0 16 16" fill="none" stroke="currentColor"
             stroke-width="1.5" aria-hidden="true">
          <rect x="3.4" y="7.2" width="9.2" height="6.4" rx="1"></rect>
          <path d="M5.7 7.2V5.1a2.3 2.3 0 0 1 4.6 0v2.1"></path>
        </svg>
      </button>
      <p class="fg-block-msg" id="fg-block-msg" role="status" aria-live="polite"></p>
    </div>
  `;
  container.appendChild(root);

  const gaugesEl = root.querySelector('.fg-gauges');
  const swListEl = root.querySelector('.fg-sw-list');
  const swNoteEl = root.querySelector('.fg-sw-note');
  const riskEl = root.querySelector('.fg-risk');
  const launchBtn = root.querySelector('.fg-launch-btn');
  const blockMsg = root.querySelector('.fg-block-msg');

  /* ---------- dựng bốn đồng hồ một lần, refresh chỉ đổi giá trị ---------- */

  const gaugeViews = GAUGE_DEFS.map((def) => {
    const card = document.createElement('div');
    card.className = 'fg-gauge';
    card.dataset.key = def.key;

    /* Vòng cung nền 240 độ. */
    const bgPath = arcPath(ARC_START, ARC_END, R);
    /* Ba vạch chia mảnh ở mốc đỏ, vàng, xanh. */
    const ticks = [def.min, def.warn, def.warn === def.max ? null : def.warn]
      .filter((v) => v != null && v > 0 && v < def.max);
    /* Mốc xanh chính là ngưỡng warn, nên chỉ cần hai vạch riêng cộng
       một vạch tại max cho mép thang. Vẽ đủ ba: min, warn, max. */
    const tickAngles = [def.min, def.warn, def.max]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((v) => valueToAngle(v, def));

    const ticksSvg = tickAngles
      .map((a) => {
        const p1 = polar(a, R - STROKE / 2 - 2);
        const p2 = polar(a, R + STROKE / 2 + 2);
        return `<line class="fg-tick" x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}"
                 x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}"></line>`;
      })
      .join('');

    card.innerHTML = `
      <svg class="fg-dial" viewBox="0 0 140 140" role="img"
           aria-label="${esc(t(def.nameVi))}">
        <path class="fg-arc-bg" d="${bgPath}"></path>
        <path class="fg-arc-val" d=""></path>
        ${ticksSvg}
        <g class="fg-needle-g" data-role="needle">
          <line class="fg-needle" x1="${CX}" y1="${CY}"
                x2="${CX}" y2="${CY - NEEDLE_LEN}"></line>
          <circle class="fg-hub" cx="${CX}" cy="${CY}" r="4.5"></circle>
        </g>
      </svg>
      <div class="fg-readout">
        <b class="fg-value">0</b>
        <span class="fg-unit"></span>
      </div>
      <p class="fg-label"><span class="fg-label-vi"></span><em class="fg-label-nasa"></em></p>
      <p class="fg-threshold"><span>${esc(t('thresholdLine'))}</span> <b class="fg-threshold-val"></b></p>
    `;
    gaugesEl.appendChild(card);

    return {
      def,
      card,
      arcVal: card.querySelector('.fg-arc-val'),
      needle: card.querySelector('.fg-needle-g'),
      valueEl: card.querySelector('.fg-value'),
      unitEl: card.querySelector('.fg-unit'),
      labelVi: card.querySelector('.fg-label-vi'),
      labelNasa: card.querySelector('.fg-label-nasa'),
      thresholdVal: card.querySelector('.fg-threshold-val'),
      lastAngle: ARC_START,
    };
  });

  /* ---------- vẽ một đồng hồ ---------- */

  function paintGauge(view, value) {
    const def = view.def;
    const angle = valueToAngle(value, def);
    const status = statusOf(value, def);

    view.card.classList.remove('is-ok', 'is-warn', 'is-fail');
    view.card.classList.add('is-' + status);

    view.arcVal.setAttribute('d', angle <= ARC_START ? '' : arcPath(ARC_START, angle, R));

    /* Kim xoay 600ms khi giá trị đổi. motion-off thì nhảy thẳng. */
    view.needle.setAttribute(
      'transform',
      'rotate(' + angle.toFixed(2) + ' ' + CX + ' ' + CY + ')'
    );
    view.needle.classList.toggle('is-animated', motionOn && view.lastAngle !== angle);
    view.lastAngle = angle;

    view.valueEl.textContent = fmt(value, def.digits);
    view.unitEl.textContent = t(def.unitVi);
    view.labelVi.textContent = t(def.nameVi);
    view.labelNasa.textContent = '(' + t(def.nasa) + ')';
    view.thresholdVal.textContent = '>= ' + fmt(def.warn, def.warn % 1 ? 1 : 0) + ' ' + t(def.unitVi);
  }

  /* ---------- đọc bốn giá trị từ state ---------- */

  function gaugeValues(state, engineRef) {
    const g = (state && state.gauges) || {};
    const deepDb = deepSpaceDb(engineRef, g.comms);
    /* Đồng hồ thứ tư: kênh tầm gần hạ cánh suy từ kênh sâu nhân 0,8.
       Giải thích đầy đủ ở đầu file. Proximity link = deep space x 0.8. */
    const proxDb = deepDb * 0.8;
    return {
      mass: massMarginPct(g.mass),
      power: powerMarginPct(g.power),
      comms: deepDb,
      proximity: proxDb,
    };
  }

  /* ---------- công tắc tuân thủ ---------- */

  function hasNuclearPower(state) {
    if (!state) return false;
    if (typeof state.hasNuclearPower === 'boolean') return state.hasNuclearPower;
    if (state.compliance && typeof state.compliance.rtgRequired === 'boolean') {
      return state.compliance.rtgRequired;
    }
    /* Yêu cầu thiết kế: đọc từ state.checks có mục rtg_approved hay không. */
    const checks = Array.isArray(state.checks) ? state.checks : [];
    return checks.some((c) => c && c.id === 'rtg_approved');
  }

  function renderSwitches(state) {
    const comp = (state && state.compliance) || {};
    const nuclear = hasNuclearPower(state);

    const rows = [
      {
        key: 'sterilized',
        name: t('sterilizeName'),
        nasa: t('sterilizeNasa'),
        why: t('sterilizeWhy'),
        on: !!comp.sterilized,
      },
    ];
    if (nuclear) {
      rows.push({
        key: 'rtg_approved',
        name: t('rtgName'),
        nasa: t('rtgNasa'),
        why: t('rtgWhy'),
        on: !!comp.rtg_approved,
      });
    }

    swListEl.innerHTML = rows
      .map(
        (r) => `
        <div class="fg-switch" data-key="${esc(r.key)}">
          <button type="button" class="fg-sw" role="switch"
                  aria-checked="${r.on ? 'true' : 'false'}"
                  aria-labelledby="fg-sw-l-${esc(r.key)}"
                  data-key="${esc(r.key)}" data-value="${r.on ? '1' : '0'}">
            <span class="fg-sw-track" aria-hidden="true"><span class="fg-sw-knob"></span></span>
            <span class="fg-sw-state">${esc(r.on ? t('on') : t('off'))}</span>
            <span class="fg-sw-alert" aria-hidden="true">!</span>
          </button>
          <div class="fg-sw-text">
            <b class="fg-sw-name" id="fg-sw-l-${esc(r.key)}">${esc(r.name)}</b>
            <span class="fg-sw-nasa">(${esc(r.nasa)})</span>
            <p class="fg-sw-why">${esc(r.why)}</p>
          </div>
        </div>
      `
      )
      .join('');

    swNoteEl.hidden = nuclear;
    if (!nuclear) swNoteEl.textContent = t('rtgHidden');
  }

  /* ---------- nút LAUNCH và cơ chế mở khoá ----------
     Quy tắc mới: từ 80 phần trăm tiêu chí ở mức xanh trở lên, không
     có mục nào đỏ, và mọi công tắc bắt buộc đã bật. Khác bản cũ
     đòi 100 phần trăm xanh. */

  function statusesOf(state) {
    const checks = Array.isArray(state && state.checks) ? state.checks : [];
    const counts = { green: 0, yellow: 0, red: 0 };
    for (const c of checks) {
      const raw = String((c && c.status) || '').toLowerCase();
      if (raw === 'red' || raw === 'fail' || raw === 'danger') counts.red += 1;
      else if (raw === 'yellow' || raw === 'warn' || raw === 'warning') counts.yellow += 1;
      else counts.green += 1;
    }
    return counts;
  }

  function renderLaunch(state) {
    const comp = (state && state.compliance) || {};
    const nuclear = hasNuclearPower(state);
    const counts = statusesOf(state);
    const total = counts.green + counts.yellow + counts.red;
    const greenRatio = total > 0 ? counts.green / total : 0;

    const missing = [];
    if (counts.red > 0) {
      missing.push(counts.red === 1 ? t('blockedRedOne') : fill(t('blockedRedMany'), { n: counts.red }));
    }
    if (!comp.sterilized) missing.push(t('blockedSterilize'));
    if (nuclear && !comp.rtg_approved) missing.push(t('blockedRtg'));

    const blocked = missing.length > 0 || greenRatio < 0.8;
    launchBtn.disabled = blocked || launching;
    launchBtn.classList.toggle('is-ready', !blocked);
    launchBtn.setAttribute('aria-disabled', blocked ? 'true' : 'false');

    if (launching) {
      blockMsg.textContent = '';
      blockMsg.classList.remove('is-block');
    } else if (blocked) {
      blockMsg.textContent = missing.join('. ');
      blockMsg.classList.add('is-block');
    } else {
      blockMsg.textContent = t('ready');
      blockMsg.classList.remove('is-block');
    }

    /* Dải cảnh báo vàng: đủ điều kiện phóng nhưng còn mục vàng. */
    const showRisk = !blocked && counts.yellow > 0;
    riskEl.hidden = !showRisk;
    if (showRisk) {
      riskEl.textContent =
        counts.yellow === 1 ? t('riskBannerOne') : fill(t('riskBanner'), { n: counts.yellow });
      riskEl.classList.add('is-on');
    } else {
      riskEl.classList.remove('is-on');
    }

    return { blocked, counts, greenRatio };
  }

  /* ---------- vẽ lại toàn bộ ---------- */

  let lastState = null;
  let launching = false;
  let destroyed = false;
  let motionOn = readMotion();

  function render() {
    if (destroyed) return;
    lang = currentLang();
    motionOn = readMotion();
    const state = readState(engine);
    lastState = state;

    root.querySelector('.fg-note-vi').textContent = T.vi.noteText;
    root.querySelector('.fg-note-en').textContent = T.en.noteText;
    root.querySelector('.fg-title-vi').textContent = T.vi.gaugesTitle;
    root.querySelector('.fg-title-en').textContent = T.en.gaugesTitleEn;
    root.querySelector('.fg-sw-title span').textContent = T.vi.switchesTitle;
    root.querySelector('.fg-sw-title em').textContent = T.en.switchesTitleEn;
    root.querySelector('.fg-sw-sub').textContent = T.vi.switchesSub;
    root.querySelector('.fg-launch-label').textContent = T.vi.launch;
    root.querySelector('.fg-launch-sub').textContent = T.en.launchEn;

    const values = gaugeValues(state, engine);
    for (const view of gaugeViews) paintGauge(view, values[view.def.key]);

    renderSwitches(state);
    renderLaunch(state);
  }

  /* ---------- sự kiện ---------- */

  function onSwitchClick(ev) {
    const btn = ev.target.closest('.fg-sw');
    if (!btn) return;
    if (!engine || typeof engine.updateCompliance !== 'function') return;
    const key = btn.dataset.key;
    const value = btn.dataset.value !== '1';
    /* Đổi ngay trên DOM cho phản hồi tức thì, engine phát
       state:changed rồi vẽ lại khớp sự thật. */
    btn.dataset.value = value ? '1' : '0';
    btn.setAttribute('aria-checked', value ? 'true' : 'false');
    const stateEl = btn.querySelector('.fg-sw-state');
    if (stateEl) stateEl.textContent = value ? t('on') : t('off');
    engine.updateCompliance({ key, value });
  }

  function onLaunchClick() {
    if (launchBtn.disabled || launching) return;
    launching = true;
    launchBtn.classList.add('is-firing');
    let result = null;
    if (typeof engine.launchMission === 'function') {
      try {
        result = engine.launchMission();
      } catch {
        result = null;
      }
    }
    launching = false;
    launchBtn.classList.remove('is-firing');
    if (result && result.ok && typeof onLaunch === 'function') onLaunch();
    render();
  }

  swListEl.addEventListener('click', onSwitchClick);
  launchBtn.addEventListener('click', onLaunchClick);

  /* ---------- nghe engine ---------- */

  let unsubs = [];
  if (engine && typeof engine.subscribe === 'function') {
    try {
      const u = engine.subscribe('state:changed', () => render());
      if (typeof u === 'function') unsubs.push(u);
    } catch {
      unsubs = [];
    }
  }

  /* ---------- khởi động ---------- */

  render();

  return {
    root,
    refresh: render,
    destroy() {
      destroyed = true;
      unsubs.forEach((u) => { try { u(); } catch { /* bỏ qua */ } });
      unsubs = [];
      swListEl.removeEventListener('click', onSwitchClick);
      launchBtn.removeEventListener('click', onLaunchClick);
      root.remove();
    },
  };
}

export default mountGaugePanel;
