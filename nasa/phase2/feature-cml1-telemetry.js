/* ============================================================
   phase2/feature-cml1-telemetry.js
   Giai đoạn 2, bước 1: BẮT SÓNG CẦU CỨU + CHỐT MỤC TIÊU GIẢI CỨU.

   Đây là màn mở đầu của phòng điều khiển. Ban đầu màn hình tối và
   radar của mạng ăng-ten vũ trụ sâu DSN quét liên tục trong nhiễu
   tĩnh. Khi Giai đoạn 1 phát sự kiện 'mars:sos-received' thì tín hiệu
   được khoá, màn hình bật sáng, và hai lựa chọn mục tiêu hiện ra.

   Ngôn ngữ bình dân: không có chữ "KPP" hay "CML 1-2" đứng một mình.
   Mỗi nhãn kỹ thuật đều đi kèm tên dễ hiểu, tên gốc NASA để trong
   ngoặc nhỏ, và nút [?] giải thích một tới hai câu.

   API theo phase2/CONTRACT.md:
     mountCml1({ container, engine, onNext }) -> { destroy() }

   Đường dẫn: luôn lấy base bằng new URL('.', import.meta.url).href.
   Trang deploy không có dấu chéo cuối nên dựng base từ location.href
   sẽ làm CSS 404.
   ============================================================ */

import { getLang, onLangChange } from '../i18n.js';

const BASE = new URL('.', import.meta.url).href;

/* ============================================================
   CHUỖI SONG NGỮ CỦA RIÊNG MÀN NÀY
   Không thêm vào src/i18n.js vì bốn sub đang chạy song song.
   ============================================================ */

const STR = {
  vi: {
    eyebrow: 'PHÒNG ĐIỀU KHIỂN SỨ MỆNH',
    step: 'Bước 1 trên 4',
    title: 'Bắt sóng cầu cứu',
    lead:
      'Ba ăng-ten vũ trụ sâu của NASA đang quét toàn bộ vùng trời hướng Sao Hỏa. ' +
      'Tín hiệu cầu cứu đi hơn hai trăm triệu ki lô mét nên tới đây rất yếu, ' +
      'phải chờ đúng lúc một chảo chĩa đúng hướng mới nghe được.',

    radarLabel: 'Radar quét tín hiệu Sao Hỏa',
    radarCaption: 'DSN · ba trạm · quét toàn bầu trời',
    scanState: 'Đang quét. Chưa có tín hiệu.',
    lockState: 'Đã khoá sóng. Tín hiệu đang giải mã.',

    readoutTitle: 'Bản ghi thu sóng',
    roBand: 'Băng tần',
    roBandVal: 'X band, 8,4 GHz',
    roDelay: 'Trễ một chiều',
    roDelayVal: 'khoảng 22 phút',
    roStrength: 'Độ mạnh tín hiệu',
    roStrengthVal: 'rất yếu, dưới ngưỡng ồn',
    roStrengthLock: 'vừa đủ khoá, đang lọc nhiễu',
    roSource: 'Nguồn phát',
    roSourceVal: 'chưa xác định',
    roSourceLock: 'bộ phát dã chiến trên bề mặt Sao Hỏa',

    stTitle: 'Ba trạm thu trên Trái Đất',
    stNote: 'Ba chảo cách nhau khoảng một trăm hai mươi độ quanh Trái Đất, nên lúc nào cũng có ít nhất một chảo nhìn thấy Sao Hỏa.',
    specTitle: 'Phổ thu quanh 8,4 GHz',
    specValNoise: 'chỉ thấy nhiễu nền',
    specValPeak: 'một vạch hẹp vừa nhô lên',

    tk1: 'Bắt sóng cầu cứu',
    tk2: 'Chốt mục tiêu giải cứu',
    tk3: 'Lắp ráp tàu và cân đối đánh đổi',
    tk4: 'Kiểm duyệt rồi phóng',

    logEmpty: 'Chưa có bản ghi nào. Radar vẫn đang quét.',
    log1: 'Nhiễu nền cao, không có tín hiệu dưới ngưỡng.',
    log2: 'Phát hiện một vạch hẹp ở 8,4 GHz, chưa đủ mạnh.',
    log3: 'Đã bắt được tín hiệu từ Sao Hỏa! Đồng đội chỉ còn đủ dưỡng khí và lương thực trong {n} ngày nữa.',
    log4: 'Tín hiệu lặp lại đúng chu kỳ, xác nhận là bộ phát của phi hành đoàn.',

    lockChip: 'TÍN HIỆU ĐÃ KHOÁ',
    alertHead: 'Đã bắt được tín hiệu từ Sao Hỏa!',
    alertBody: 'Đồng đội chỉ còn đủ dưỡng khí và lương thực trong {n} ngày nữa.',
    alertCrew: '{crew} người trên bề mặt, cách Trái Đất hơn hai trăm triệu ki lô mét.',

    pickHead: 'Bước 1: Chốt mục tiêu giải cứu',
    pickSub: 'Chọn mang đồ duy trì sự sống lâu dài, hay mang nhiên liệu đón người về ngay.',
    pickNasa: 'CML 1 - 2 · Key Performance Parameter',

    card1Title: 'Gói tiếp tế duy trì sự sống',
    card1Sub: 'Tàu nhẹ hơn nên tốn ít nhiên liệu, nhưng tới nơi chậm hơn.',
    card1Meta: 'Tới nơi khoảng 412 ngày',
    card1Nasa: 'Life support resupply package',
    card1Why:
      'Mang theo nước, oxy và thức ăn đủ dùng thêm gần một nghìn ngày. ' +
      'Hàng nhẹ nên tên lửa đỡ vất vả, đổi lại tàu bay theo quỹ đạo tiết kiệm nhiên liệu và tới muộn hơn.',

    card2Title: 'Tên lửa đón người về ngay',
    card2Sub: 'Tàu nặng hơn nên tốn nhiên liệu, nhưng tới nơi nhanh hơn hẳn.',
    card2Meta: 'Tới nơi đúng 258,9 ngày',
    card1MetaDyn: 'Tới nơi khoảng {n} ngày',
    card2MetaDyn: 'Tới nơi đúng {n} ngày',
    card2Nasa: 'Mars Ascent Vehicle kit',
    card2Why:
      'Chở theo tên lửa nhỏ để đưa đồng đội rời bề mặt Sao Hỏa ngay khi tới. ' +
      'Khối nặng hơn nên phải dùng tên lửa đẩy lớn, bù lại thời gian bay ngắn hơn gần một trăm năm mươi ngày.',

    rulerHead: 'Thời gian tàu bay tới nơi so với thời gian đồng đội cầm cự được',
    rulerTrip: 'Tàu bay tới nơi',
    rulerLife: 'Đồng đội cầm cự được',
    rulerDays: '{n} ngày',
    rulerNone: 'Chưa chọn mục tiêu',
    rulerNoneHint: 'Bấm một trong hai thẻ ở trên để xem tàu tới kịp hay không.',
    verdictOk: 'Tới kịp. Còn dư {n} ngày trước khi đồng đội hết dưỡng khí.',
    verdictFail: 'Không kịp. Thiếu {n} ngày so với lúc đồng đội cạn dưỡng khí.',
    scaleZero: '0',
    scaleNow: 'hôm nay',

    pickLabel: 'CHỌN MỤC TIÊU NÀY',
    pickPicked: 'ĐÃ CHỌN',

    next: 'Sang bước 2: Lắp ráp tàu',
    nextHint: 'Chọn một mục tiêu trước khi sang bước lắp ráp.',
    back: 'Quay lại Giai đoạn 1',

    infoClose: 'Đã hiểu',
    infoSource: 'Nguồn',
    infoSourceVal: 'NASA, sứ mệnh giải cứu Sao Hỏa, tài liệu nội bộ docs/11-NASA-RESOURCES.md',

    missingEngine: 'Không tìm thấy bộ máy sứ mệnh. Màn này cần phase2-engine.js.',
  },

  en: {
    eyebrow: 'MISSION CONTROL',
    step: 'Step 1 of 4',
    title: 'Acquire the distress signal',
    lead:
      'NASA has three Deep Space Network dishes sweeping the whole sky toward Mars. ' +
      'The distress call has crossed more than two hundred million kilometres, so it ' +
      'arrives very faint and only a dish pointed the right way can hear it.',

    radarLabel: 'Signal sweep radar for Mars',
    radarCaption: 'DSN, three stations, full sky sweep',
    scanState: 'Sweeping. No signal yet.',
    lockState: 'Signal locked. Decoding now.',

    readoutTitle: 'Acquisition log',
    roBand: 'Band',
    roBandVal: 'X band, 8.4 GHz',
    roDelay: 'One way delay',
    roDelayVal: 'about 22 minutes',
    roStrength: 'Signal strength',
    roStrengthVal: 'very faint, below the noise floor',
    roStrengthLock: 'just enough to lock, filtering',
    roSource: 'Transmitter',
    roSourceVal: 'not identified',
    roSourceLock: 'field transmitter on the Martian surface',

    stTitle: 'Three dishes on Earth',
    stNote: 'The three dishes sit about one hundred and twenty degrees apart around Earth, so at least one of them always has Mars in view.',
    specTitle: 'Spectrum around 8.4 GHz',
    specValNoise: 'only the noise floor',
    specValPeak: 'a narrow line just lifting out',

    tk1: 'Acquire the signal',
    tk2: 'Lock the rescue objective',
    tk3: 'Build the ship, balance the tradeoffs',
    tk4: 'Approve and launch',

    logEmpty: 'No entries yet. The radar is still sweeping.',
    log1: 'High background noise, nothing above threshold.',
    log2: 'A narrow line at 8.4 GHz, not strong enough yet.',
    log3: 'Signal acquired from Mars! The crew has only {n} days of air and food left.',
    log4: 'The signal repeats on a steady cycle. It is the crew transmitter.',

    lockChip: 'SIGNAL LOCKED',
    alertHead: 'Signal acquired from Mars!',
    alertBody: 'The crew has only {n} days of air and food left.',
    alertCrew: '{crew} crew on the surface, more than two hundred million kilometres from Earth.',

    pickHead: 'Step 1: Lock the rescue objective',
    pickSub: 'Bring long term life support, or bring fuel to pick them up right away.',
    pickNasa: 'CML 1 - 2, Key Performance Parameter',

    card1Title: 'Life support resupply package',
    card1Sub: 'A lighter ship burns less fuel, but it arrives later.',
    card1Meta: 'Arrives in about 412 days',
    card1Nasa: 'Life support resupply package',
    card1Why:
      'Carries water, oxygen and food for nearly a thousand more days. ' +
      'The light cargo is easier on the rocket, but the ship flies a fuel saving trajectory and lands later.',

    card2Title: 'A rocket to bring them home',
    card2Sub: 'A heavier ship burns more fuel, but it gets there much sooner.',
    card2Meta: 'Arrives in exactly 258.9 days',
    card1MetaDyn: 'Arrives in about {n} days',
    card2MetaDyn: 'Arrives in exactly {n} days',
    card2Nasa: 'Mars Ascent Vehicle kit',
    card2Why:
      'Carries a small rocket so the crew can leave the Martian surface the moment it lands. ' +
      'The extra mass needs a heavy lift vehicle, and in exchange the trip is almost one hundred and fifty days shorter.',

    rulerHead: 'Ship travel time against the time the crew can hold out',
    rulerTrip: 'Ship arrives in',
    rulerLife: 'Crew holds out for',
    rulerDays: '{n} days',
    rulerNone: 'No objective chosen',
    rulerNoneHint: 'Pick one of the two cards above to see whether the ship makes it in time.',
    verdictOk: 'In time. {n} days to spare before the crew runs out of air.',
    verdictFail: 'Too late. Short by {n} days when the crew runs out of air.',
    scaleZero: '0',
    scaleNow: 'today',

    pickLabel: 'CHOOSE THIS OBJECTIVE',
    pickPicked: 'CHOSEN',

    next: 'Go to step 2: Build the ship',
    nextHint: 'Choose an objective before moving to the assembly bay.',
    back: 'Back to Phase 1',

    infoClose: 'Got it',
    infoSource: 'Source',
    infoSourceVal: 'NASA, Mars rescue mission, internal reference docs/11-NASA-RESOURCES.md',

    missingEngine: 'Mission engine not found. This screen needs phase2-engine.js.',
  },
};

function T(key, vars) {
  const table = STR[getLang()] || STR.vi;
  let s = table[key] ?? STR.vi[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  }
  return s;
}

function fmt(n, digits = 0) {
  if (!Number.isFinite(Number(n))) return '0';
  const fixed = Number(n).toFixed(digits);
  const neg = fixed.startsWith('-');
  const body = neg ? fixed.slice(1) : fixed;
  const parts = body.split('.');
  const sep = getLang() === 'en' ? ',' : '.';
  const dec = getLang() === 'en' ? '.' : ',';
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (neg ? '-' : '') + parts.join(dec);
}

function injectCss() {
  if (document.querySelector('link[data-phase2-cml1]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css-cml1.css';
  link.dataset.phase2Cml1 = '1';
  document.head.appendChild(link);
}

/* Hai mục tiêu. Số ngày dưới đây là số của kịch bản: gói tiếp tế bay
   quỹ đạo tiết kiệm nhiên liệu khoảng 412 sol, tên lửa đón người bay
   chặng nhanh 258,9 ngày theo rescue_mission.json. Khi engine đã có
   thiết kế thật thì số của engine thắng, để thẻ và thước đo không
   bao giờ nói hai con số khác nhau trên cùng một màn hình. */
const OBJECTIVES = {
  supplies: { days: 412, bearing: 0 },
  mav_kit: { days: 258.9, bearing: 0 },
};

const BASE_DAYS = {
  supplies: { days: 412, daysLabel: 'card1Meta' },
  mav_kit: { days: 258.9, daysLabel: 'card2Meta' },
};

/* ============================================================
   KHUNG DOM
   ============================================================ */

const RADAR = `
<svg class="cml1-radar-svg" viewBox="0 0 420 420" role="img" aria-labelledby="cml1-radar-t">
  <title id="cml1-radar-t"></title>

  <defs>
    <radialGradient id="cml1-sweep-grad" cx="0" cy="0" r="1"
      gradientUnits="userSpaceOnUse" gradientTransform="translate(210 210) rotate(17) scale(190)">
      <stop offset="0" stop-color="currentColor" stop-opacity=".45"/>
      <stop offset="1" stop-color="currentColor" stop-opacity="0"/>
    </radialGradient>
    <filter id="cml1-noise-f" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch">
        <animate attributeName="baseFrequency" dur=".6s" values="0.85;0.95;0.8;0.85" repeatCount="indefinite"/>
      </feTurbulence>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <filter id="cml1-glow-f" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <g class="cml1-grid">
    <circle cx="210" cy="210" r="190"></circle>
    <circle cx="210" cy="210" r="142"></circle>
    <circle cx="210" cy="210" r="94"></circle>
    <circle cx="210" cy="210" r="46"></circle>
    <line x1="210" y1="20" x2="210" y2="400"></line>
    <line x1="20" y1="210" x2="400" y2="210"></line>
    <line class="cml1-tick" x1="210" y1="20" x2="210" y2="34"></line>
    <line class="cml1-tick" x1="210" y1="386" x2="210" y2="400"></line>
    <line class="cml1-tick" x1="20" y1="210" x2="34" y2="210"></line>
    <line class="cml1-tick" x1="386" y1="210" x2="400" y2="210"></line>
  </g>

  <g class="cml1-az" aria-hidden="true">
    <text x="210" y="14" class="cml1-az-l" text-anchor="middle">000</text>
    <text x="406" y="215" class="cml1-az-l" text-anchor="middle">090</text>
    <text x="210" y="414" class="cml1-az-l" text-anchor="middle">180</text>
    <text x="14" y="215" class="cml1-az-l" text-anchor="middle">270</text>
    <text x="248" y="76" class="cml1-rg-l">0,5 AU</text>
    <text x="248" y="124" class="cml1-rg-l">1,0 AU</text>
    <text x="248" y="172" class="cml1-rg-l">1,5 AU</text>
  </g>

  <g class="cml1-sweep">
    <path class="cml1-sweep-cone" d="M210 210 L210 20 A190 190 0 0 1 316.2 52.1 Z"></path>
    <line class="cml1-sweep-edge" x1="210" y1="210" x2="210" y2="20"></line>
  </g>

  <g class="cml1-blip" aria-hidden="true">
    <circle class="cml1-blip-ring" cx="283.9" cy="115.4" r="26"></circle>
    <circle class="cml1-blip-core" cx="283.9" cy="115.4" r="6" filter="url(#cml1-glow-f)"></circle>
    <line class="cml1-blip-lead" x1="289" y1="110" x2="336" y2="76"></line>
    <text class="cml1-blip-label" x="340" y="72">MARS</text>
  </g>

  <g class="cml1-ring-mark" aria-hidden="true">
    <circle cx="210" cy="210" r="10"></circle>
    <circle cx="210" cy="210" r="2.5"></circle>
  </g>

  <rect class="cml1-static" x="20" y="20" width="380" height="380" filter="url(#cml1-noise-f)"></rect>
</svg>
`;

const SHELL = `
  <div class="cml1-bg-grid" aria-hidden="true"></div>

  <header class="cml1-head">
    <div class="cml1-head-left">
      <p class="cml1-eyebrow" data-l="eyebrow"></p>
      <h1 class="cml1-title" data-l="title"></h1>
    </div>
    <div class="cml1-head-right">
      <span class="cml1-step mono" data-l="step"></span>
      <span class="cml1-live"><i aria-hidden="true"></i><span class="cml1-live-txt">DSN</span></span>
    </div>
  </header>

  <div class="cml1-body">
    <section class="cml1-radar-col" aria-label="radar">
      <div class="cml1-radar-frame">
        <div class="cml1-radar-corner cml1-rn" aria-hidden="true"></div>
        <div class="cml1-radar-corner cml1-rs" aria-hidden="true"></div>
        <div class="cml1-radar-corner cml1-rw" aria-hidden="true"></div>
        <div class="cml1-radar-corner cml1-re" aria-hidden="true"></div>
        <div class="cml1-radar-wrap">${RADAR}</div>
        <p class="cml1-radar-cap mono" data-l="radarCaption"></p>
      </div>
      <p class="cml1-scan-state" role="status" aria-live="polite" data-l="scanState"></p>
      <p class="cml1-lead" data-l="lead"></p>
    </section>

    <section class="cml1-side">
      <div class="cml1-readout">
        <h2 class="cml1-panel-h" data-l="readoutTitle"></h2>
        <dl class="cml1-ro">
          <div><dt data-l="roBand"></dt><dd class="mono" data-l="roBandVal"></dd></div>
          <div><dt data-l="roDelay"></dt><dd class="mono" data-l="roDelayVal"></dd></div>
          <div><dt data-l="roStrength"></dt><dd class="mono" data-ro="strength" data-l="roStrengthVal"></dd></div>
          <div><dt data-l="roSource"></dt><dd data-ro="source" data-l="roSourceVal"></dd></div>
        </dl>
        <ul class="cml1-log" role="log" aria-live="polite"></ul>
      </div>

      <div class="cml1-stations">
        <h2 class="cml1-panel-h" data-l="stTitle"></h2>
        <ul class="cml1-st-list">
          <li class="cml1-st" data-st="goldstone">
            <svg class="cml1-st-ico" viewBox="0 0 32 32" aria-hidden="true" fill="none"
              stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 13a8 8 0 0 1 16 0Z"/><path d="M16 13v8"/><path d="M11 25h10"/><path d="M16 21v4"/>
            </svg>
            <span class="cml1-st-name">Goldstone</span>
            <span class="cml1-st-bar" aria-hidden="true"><i></i></span>
            <span class="cml1-st-val mono">0%</span>
          </li>
          <li class="cml1-st" data-st="madrid">
            <svg class="cml1-st-ico" viewBox="0 0 32 32" aria-hidden="true" fill="none"
              stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 13a8 8 0 0 1 16 0Z"/><path d="M16 13v8"/><path d="M11 25h10"/><path d="M16 21v4"/>
            </svg>
            <span class="cml1-st-name">Madrid</span>
            <span class="cml1-st-bar" aria-hidden="true"><i></i></span>
            <span class="cml1-st-val mono">0%</span>
          </li>
          <li class="cml1-st" data-st="canberra">
            <svg class="cml1-st-ico" viewBox="0 0 32 32" aria-hidden="true" fill="none"
              stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 13a8 8 0 0 1 16 0Z"/><path d="M16 13v8"/><path d="M11 25h10"/><path d="M16 21v4"/>
            </svg>
            <span class="cml1-st-name">Canberra</span>
            <span class="cml1-st-bar" aria-hidden="true"><i></i></span>
            <span class="cml1-st-val mono">0%</span>
          </li>
        </ul>
        <p class="cml1-st-note" data-l="stNote"></p>

        <div class="cml1-spectrum">
          <div class="cml1-spec-head">
            <span class="cml1-spec-lbl" data-l="specTitle"></span>
            <span class="cml1-spec-val mono" data-l="specValNoise"></span>
          </div>
          <svg class="cml1-spec-svg" viewBox="0 0 300 84" preserveAspectRatio="none"
            role="img" aria-labelledby="cml1-spec-d">
            <title id="cml1-spec-d"></title>
            <path class="cml1-spec-floor" d="M0 62 L14 58 L28 65 L42 55 L56 61 L70 57 L84 64 L98 59
              L112 63 L126 56 L140 62 L154 58 L168 64 L182 59 L196 63 L210 57 L224 62 L238 58
              L252 64 L266 60 L280 63 L300 59"></path>
            <path class="cml1-spec-noise" d="M0 54 L10 47 L20 57 L30 44 L40 55 L50 48 L60 58 L70 46
              L80 56 L90 49 L100 59 L110 45 L120 55 L130 48 L140 58 L150 46 L160 56 L170 50
              L180 58 L190 47 L200 57 L210 49 L220 58 L230 46 L240 56 L250 50 L260 58 L270 48
              L280 57 L290 50 L300 56"></path>
            <path class="cml1-spec-peak" d="M146 62 L150 62 L152 36 L154 8 L156 34 L158 62 L162 62"></path>
            <line class="cml1-spec-axis" x1="0" y1="70" x2="300" y2="70"></line>
          </svg>
          <div class="cml1-spec-scale mono">
            <span>8,39</span><span>8,40</span><span>8,41 GHz</span>
          </div>
        </div>
      </div>

      <div class="cml1-lock" hidden>
        <div class="cml1-lock-chip mono" data-l="lockChip"></div>
        <div class="cml1-alert">
          <svg class="cml1-alert-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none"
            stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v9"/><path d="M6.5 6.5a7.8 7.8 0 0 0 0 11"/><path d="M17.5 6.5a7.8 7.8 0 0 1 0 11"/>
            <path d="M3.4 3.4a12 12 0 0 0 0 17.2"/><path d="M20.6 3.4a12 12 0 0 1 0 17.2"/>
            <circle cx="12" cy="16.5" r="1.6"/>
          </svg>
          <div>
            <h3 class="cml1-alert-head" data-l="alertHead"></h3>
            <p class="cml1-alert-body"></p>
            <p class="cml1-alert-crew"></p>
          </div>
        </div>
      </div>
    </section>
  </div>

  <ol class="cml1-track" aria-label="steps">
    <li class="cml1-tk is-now" data-tk="1">
      <span class="cml1-tk-n mono">1</span>
      <span class="cml1-tk-t" data-l="tk1"></span>
    </li>
    <li class="cml1-tk" data-tk="2">
      <span class="cml1-tk-n mono">2</span>
      <span class="cml1-tk-t" data-l="tk2"></span>
    </li>
    <li class="cml1-tk" data-tk="3">
      <span class="cml1-tk-n mono">3</span>
      <span class="cml1-tk-t" data-l="tk3"></span>
    </li>
    <li class="cml1-tk" data-tk="4">
      <span class="cml1-tk-n mono">4</span>
      <span class="cml1-tk-t" data-l="tk4"></span>
    </li>
  </ol>

  <section class="cml1-picker" hidden>
    <div class="cml1-pick-head">
      <div>
        <h2 class="cml1-pick-title" data-l="pickHead"></h2>
        <p class="cml1-pick-sub" data-l="pickSub"></p>
      </div>
      <span class="cml1-nasa-tag mono" data-l="pickNasa"></span>
    </div>

    <div class="cml1-cards" role="radiogroup" aria-labelledby="cml1-pick-h">
      <article class="cml1-card" data-obj="supplies" role="radio" aria-checked="false" tabindex="0">
        <div class="cml1-card-art" aria-hidden="true">
          <svg viewBox="0 0 96 96" class="cml1-ico">
            <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M26 34h44v34a10 10 0 0 1-10 10H36a10 10 0 0 1-10-10V34Z"/>
              <path d="M26 34 36 20h24l10 14"/>
              <path d="M38 12h20"/>
              <path d="M48 12v8"/>
              <path d="M26 46h44"/>
              <path d="M38 58v10M58 58v10"/>
            </g>
          </svg>
        </div>
        <div class="cml1-card-main">
          <div class="cml1-card-top">
            <h3 class="cml1-card-title" data-l="card1Title"></h3>
            <button type="button" class="cml1-q" data-info="obj1" aria-label="info">
              <span aria-hidden="true">?</span>
            </button>
          </div>
          <p class="cml1-card-sub" data-l="card1Sub"></p>
          <p class="cml1-card-nasa mono" data-l="card1Nasa"></p>
          <div class="cml1-card-foot">
            <span class="cml1-card-meta mono"></span>
            <span class="cml1-card-pick mono" data-l="pickLabel"></span>
          </div>
        </div>
      </article>

      <article class="cml1-card" data-obj="mav_kit" role="radio" aria-checked="false" tabindex="0">
        <div class="cml1-card-art" aria-hidden="true">
          <svg viewBox="0 0 96 96" class="cml1-ico">
            <g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M48 10c9 8 13 20 13 32v20H35V42c0-12 4-24 13-32Z"/>
              <circle cx="48" cy="34" r="6"/>
              <path d="M35 50 24 66v10l11-8M61 50l11 16v10l-11-8"/>
              <path d="M42 62h12v10l-6 14-6-14V62Z"/>
            </g>
          </svg>
        </div>
        <div class="cml1-card-main">
          <div class="cml1-card-top">
            <h3 class="cml1-card-title" data-l="card2Title"></h3>
            <button type="button" class="cml1-q" data-info="obj2" aria-label="info">
              <span aria-hidden="true">?</span>
            </button>
          </div>
          <p class="cml1-card-sub" data-l="card2Sub"></p>
          <p class="cml1-card-nasa mono" data-l="card2Nasa"></p>
          <div class="cml1-card-foot">
            <span class="cml1-card-meta mono"></span>
            <span class="cml1-card-pick mono" data-l="pickLabel"></span>
          </div>
        </div>
      </article>
    </div>

    <div class="cml1-ruler" data-state="none">
      <div class="cml1-ruler-head">
        <h3 class="cml1-ruler-title" data-l="rulerHead"></h3>
        <p class="cml1-ruler-verdict" role="status" aria-live="polite"></p>
      </div>
      <div class="cml1-ruler-body">
        <div class="cml1-ruler-track" role="img" aria-labelledby="cml1-ruler-desc">
          <span id="cml1-ruler-desc" class="cml1-sr" data-l="rulerHead"></span>
          <span class="cml1-ruler-fill"></span>
          <span class="cml1-ruler-life"><i aria-hidden="true"></i></span>
          <span class="cml1-ruler-trip"><i aria-hidden="true"></i></span>
        </div>
        <div class="cml1-ruler-scale mono">
          <span class="cml1-scale-0" data-l="scaleZero"></span>
          <span class="cml1-scale-mid"></span>
          <span class="cml1-scale-max"></span>
        </div>
        <dl class="cml1-ruler-legend">
          <div class="cml1-leg-trip">
            <dt><i aria-hidden="true"></i><span data-l="rulerTrip"></span></dt>
            <dd class="mono"><b class="cml1-trip-v">0</b></dd>
          </div>
          <div class="cml1-leg-life">
            <dt><i aria-hidden="true"></i><span data-l="rulerLife"></span></dt>
            <dd class="mono"><b class="cml1-life-v">0</b></dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="cml1-foot">
      <p class="cml1-hint" role="status" aria-live="polite" data-l="nextHint"></p>
      <button type="button" class="cml1-next" disabled>
        <span data-l="next"></span>
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></svg>
      </button>
    </div>
  </section>

  <div class="cml1-modal" hidden>
    <div class="cml1-modal-scrim" data-close></div>
    <div class="cml1-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cml1-modal-t">
      <h3 class="cml1-modal-title" id="cml1-modal-t"></h3>
      <p class="cml1-modal-body"></p>
      <p class="cml1-modal-src"><span data-l="infoSource"></span>: <span class="cml1-modal-src-v"></span></p>
      <button type="button" class="cml1-modal-ok" data-close data-l="infoClose"></button>
    </div>
  </div>
`;

/* ============================================================
   ĐIỂM VÀO
   ============================================================ */

export function mountCml1({ container, engine, onNext } = {}) {
  injectCss();

  const host = container || document.body;
  const root = document.createElement('div');
  root.className = 'cml1-root';
  root.innerHTML = SHELL;
  host.appendChild(root);

  const q = (s) => root.querySelector(s);
  const qa = (s) => Array.from(root.querySelectorAll(s));

  if (!engine || typeof engine.getState !== 'function') {
    q('.cml1-side').innerHTML = '<p class="cml1-fatal">' + T('missingEngine') + '</p>';
    return { destroy() { root.remove(); } };
  }

  let destroyed = false;
  let received = false;
  let picked = null;
  let timers = [];
  let unsubLang = null;

  const elScan = q('.cml1-scan-state');
  const elLog = q('.cml1-log');
  const elLock = q('.cml1-lock');
  const elPick = q('.cml1-picker');
  const elNext = q('.cml1-next');
  const elHint = q('.cml1-hint');
  const elRuler = q('.cml1-ruler');
  const cards = qa('.cml1-card');

  const ringTitle = q('#cml1-radar-t');
  const specTitle = q('#cml1-spec-d');

  /* ---------- ba trạm DSN nhấp nháy khi quét ----------
     Vùng này không được để trống: nó cho thấy hệ thống đang thật sự
     làm việc. Nhịp 420ms đủ chậm để không gây mỏi mắt, và mỗi trạm
     lệch pha nhau nên mắt đọc được là ba chảo đang quét khác nhịp.
     Không dùng requestAnimationFrame vì ở tab ẩn nó bị bóp lại. */
  const ST_PHASE = { goldstone: 0, madrid: 2.1, canberra: 4.2 };
  let stTimer = 0;
  let stTick = 0;

  function paintStations() {
    qa('.cml1-st').forEach((li) => {
      const key = li.dataset.st;
      const ph = ST_PHASE[key] || 0;
      /* Sóng sin cộng nhiễu giả tất định: không cần Math.random nên
         mỗi lần vẽ lại vẫn ra cùng một hình. */
      const base = received ? 96 : 34 + 22 * Math.sin(stTick / 2.4 + ph);
      const jitter = 6 * Math.sin(stTick / .7 + ph * 3);
      const pct = Math.max(6, Math.min(100, Math.round(base + jitter)));
      li.querySelector('.cml1-st-bar i').style.width = pct + '%';
      li.querySelector('.cml1-st-val').textContent = pct + '%';
      li.classList.toggle('is-hot', received && pct > 88);
    });
  }

  function startStations() {
    paintStations();
    stTimer = setInterval(() => {
      if (destroyed) return;
      stTick += 1;
      paintStations();
    }, 420);
  }

  function later(fn, ms) {
    const id = setTimeout(() => { if (!destroyed) fn(); }, ms);
    timers.push(id);
    return id;
  }

  /* ---------- đọc số liệu từ engine ---------- */

  function readSols() {
    let st = null;
    try { st = engine.getState(); } catch (err) { st = null; }
    if (!st) return { sols: 300, crew: 1 };
    const sols = Number.isFinite(st.solsRemaining) ? st.solsRemaining : 300;
    const crew = Number.isFinite(st.crewOnMars) ? st.crewOnMars : 1;
    return { sols, crew };
  }

  function readDays() {
    if (!picked) return null;
    const fallback = OBJECTIVES[picked].days;
    let st = null;
    try { st = engine.getState(); } catch (err) { st = null; }
    if (!st) return fallback;
    /* Chỉ tin số của engine khi mục tiêu trong state đúng là mục tiêu
       đang chọn. Nếu engine còn giữ mặc định của kịch bản thì con số
       đó chưa nói về lựa chọn này. */
    const obj = st.selection && st.selection.objective;
    if (obj !== picked) return fallback;
    const t = st.totals || {};
    if (Number.isFinite(t.daysToArrival) && t.daysToArrival > 0) return t.daysToArrival;
    return fallback;
  }

  /* ---------- chữ ---------- */

  function applyStrings() {
    qa('[data-l]').forEach((el) => {
      el.textContent = T(el.getAttribute('data-l'));
    });
    if (ringTitle) ringTitle.textContent = T('radarLabel');
    if (specTitle) specTitle.textContent = T('specTitle');
    q('.cml1-spec-val').textContent = T(received ? 'specValPeak' : 'specValNoise');
    q('.cml1-spec-val').classList.toggle('is-peak', received);
    /* Dòng "tới nơi khoảng X" trên thẻ phải cùng nguồn với thước đo.
       Nếu engine đã tính ra số khác con số kịch bản, in số của engine. */
    const c1 = q('.cml1-card[data-obj="supplies"] .cml1-card-meta');
    const c2 = q('.cml1-card[data-obj="mav_kit"] .cml1-card-meta');
    if (c1) c1.textContent = metaLine('supplies');
    if (c2) c2.textContent = metaLine('mav_kit');
    const st = readSols();
    q('.cml1-alert-body').textContent = T('alertBody', { n: fmt(st.sols) });
    q('.cml1-alert-crew').textContent = T('alertCrew', { crew: fmt(st.crew) });
    if (received) {
      elScan.textContent = T('lockState');
      elLog.innerHTML = '';
      addLog(T('log1'));
      addLog(T('log2'));
      addLog(T('log3', { n: fmt(st.sols) }));
      addLog(T('log4'));
      q('.cml1-alert-head').textContent = T('alertHead');
    }
    updateRuler();
  }

  function addLog(text) {
    const li = document.createElement('li');
    li.className = 'cml1-log-line';
    li.textContent = text;
    elLog.appendChild(li);
    if (elLog.children.length > 6) elLog.removeChild(elLog.firstElementChild);
    elLog.scrollTop = elLog.scrollHeight;
  }

  /* Câu ghi thời gian tới nơi của từng thẻ. Giữ nguyên câu chữ của
     thẻ, chỉ thay con số khi engine đã trả về số của chính lựa chọn đó. */
  function metaLine(key) {
    const base = OBJECTIVES[key].days;
    let days = base;
    let st = null;
    try { st = engine.getState(); } catch (err) { st = null; }
    if (st && st.selection && st.selection.objective === key) {
      const t = st.totals || {};
      if (Number.isFinite(t.daysToArrival) && t.daysToArrival > 0) days = t.daysToArrival;
    }
    if (days === base) return T(key === 'supplies' ? 'card1Meta' : 'card2Meta');
    return T(key === 'supplies' ? 'card1MetaDyn' : 'card2MetaDyn', { n: fmt(days, 1) });
  }

  /* ---------- thước đo ---------- */

  function updateRuler() {
    const st = readSols();
    const lifeEl = q('.cml1-life-v');
    const tripEl = q('.cml1-trip-v');
    const verdict = q('.cml1-ruler-verdict');
    const life = st.sols;

    lifeEl.textContent = T('rulerDays', { n: fmt(life) });

    if (!picked) {
      elRuler.dataset.state = 'none';
      tripEl.textContent = T('rulerDays', { n: '0' });
      verdict.textContent = T('rulerNoneHint');
      verdict.dataset.tone = 'none';
      q('.cml1-ruler-fill').style.width = '0%';
      q('.cml1-ruler-life').style.left = '0%';
      q('.cml1-ruler-trip').style.left = '0%';
      const mx = Math.ceil(life / 100) * 100;
      q('.cml1-scale-max').textContent = T('rulerDays', { n: fmt(mx) });
      const mid0 = q('.cml1-scale-mid');
      mid0.textContent = T('rulerDays', { n: fmt(Math.round(mx / 2)) });
      mid0.style.left = '50%';
      mid0.style.transform = 'translateX(-50%)';
      return;
    }

    const trip = readDays();
    /* Thang đo rộng hơn cả hai con số để hai vạch không bao giờ chạm
       mép thanh, nhìn là thấy khoảng cách thật giữa hai mốc. */
    const max = Math.max(trip, life) * 1.25;
    const tripPct = Math.min(100, (trip / max) * 100);
    const lifePct = Math.min(100, (life / max) * 100);
    const inTime = trip <= life;

    elRuler.dataset.state = inTime ? 'ok' : 'fail';
    tripEl.textContent = T('rulerDays', { n: fmt(trip, 1) });
    q('.cml1-ruler-fill').style.width = tripPct.toFixed(2) + '%';
    q('.cml1-ruler-life').style.left = lifePct.toFixed(2) + '%';
    q('.cml1-ruler-trip').style.left = tripPct.toFixed(2) + '%';
    q('.cml1-scale-max').textContent = T('rulerDays', { n: fmt(Math.round(max)) });
    const mid = q('.cml1-scale-mid');
    mid.textContent = T('rulerDays', { n: fmt(Math.round(max / 2)) });
    /* Nhãn giữa đặt đúng nửa thanh, không chia đều ba nhãn: chia đều
       thì số "một nửa" lại nằm lệch khỏi điểm giữa thật của thang. */
    mid.style.left = '50%';
    mid.style.transform = 'translateX(-50%)';

    const diff = Math.abs(life - trip);
    verdict.textContent = inTime
      ? T('verdictOk', { n: fmt(diff, 1) })
      : T('verdictFail', { n: fmt(diff, 1) });
    verdict.dataset.tone = inTime ? 'ok' : 'fail';
  }

  /* ---------- chọn mục tiêu ---------- */

  function choose(part) {
    if (destroyed) return;
    picked = part;

    cards.forEach((c) => {
      const on = c.dataset.obj === part;
      c.classList.toggle('is-picked', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
      const lab = c.querySelector('.cml1-card-pick');
      if (lab) lab.textContent = T(on ? 'pickPicked' : 'pickLabel');
    });

    try {
      engine.updateSelection({ group: 'objective', part });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[cml1] updateSelection lỗi', err);
    }

    updateRuler();
    const c1 = q('.cml1-card[data-obj="supplies"] .cml1-card-meta');
    const c2 = q('.cml1-card[data-obj="mav_kit"] .cml1-card-meta');
    if (c1) c1.textContent = metaLine('supplies');
    if (c2) c2.textContent = metaLine('mav_kit');

    elNext.disabled = false;
    elHint.textContent = '';
    elRuler.classList.remove('cml1-ruler-pop');
    /* Buộc trình duyệt tính lại để animation chạy lại mỗi lần đổi thẻ. */
    void elRuler.offsetWidth;
    elRuler.classList.add('cml1-ruler-pop');
  }

  /* ---------- bắt sóng ---------- */

  function receive(detail) {
    if (destroyed || received) return;
    received = true;

    const st = readSols();
    const sols = detail && Number.isFinite(detail.solsRemaining) ? detail.solsRemaining : st.sols;
    const crew = detail && Number.isFinite(detail.crewOnMars) ? detail.crewOnMars : st.crew;

    root.classList.add('is-locked');
    const tk1 = q('.cml1-tk[data-tk="1"]');
    const tk2 = q('.cml1-tk[data-tk="2"]');
    if (tk1) { tk1.classList.remove('is-now'); tk1.classList.add('is-done'); }
    if (tk2) tk2.classList.add('is-now');

    elLog.innerHTML = '';
    addLog(T('log1'));
    later(() => addLog(T('log2')), 260);
    later(() => addLog(T('log3', { n: fmt(sols) })), 620);
    later(() => addLog(T('log4')), 980);

    elScan.textContent = T('lockState');

    const ddStrength = q('[data-ro="strength"]');
    const ddSource = q('[data-ro="source"]');
    ddStrength.textContent = T('roStrengthLock');
    ddStrength.classList.add('is-hot');
    ddSource.textContent = T('roSourceLock');

    later(() => {
      elLock.hidden = false;
      elLock.classList.add('cml1-in');
      q('.cml1-alert-body').textContent = T('alertBody', { n: fmt(sols) });
      q('.cml1-alert-crew').textContent = T('alertCrew', { crew: fmt(crew) });
    }, 340);

    later(() => {
      elPick.hidden = false;
      elPick.classList.add('cml1-in');
      /* Không gọi scrollIntoView ở đây. Bản cũ cuộn cả sân khấu xuống
         hơn bảy trăm pi-xen để lôi phần chọn mục tiêu vào, kết quả là
         ngay sau khi khoá sóng, radar và chấm MARS bị đẩy ra ngoài khung
         nhìn: người chơi vừa bấm nhận tín hiệu xong lại không thấy tín
         hiệu. Phần chọn mục tiêu tự hiện ngay dưới cột phải, còn radar
         thu nhỏ lại ở dòng dưới. Chỉ cuộn khi khung chứa đã bị đẩy lên
         cao, tức là người chơi đã tự cuộn trước đó. */
      const scroller = elPick.closest('.p2-stage-inner');
      if (scroller && scroller.scrollTop > 0) {
        const need = elPick.offsetTop + elPick.offsetHeight - scroller.clientHeight;
        if (need > scroller.scrollTop) scroller.scrollTo({ top: need, behavior: 'smooth' });
      }
    }, 760);

    /* Radar thu nhỏ lại nhường chỗ cho phần chọn mục tiêu. */
    later(() => root.classList.add('is-picking'), 900);
  }

  const onSos = (ev) => receive(ev && ev.detail ? ev.detail : {});
  window.addEventListener('mars:sos-received', onSos);

  /* Nếu Giai đoạn 1 đã phát sự kiện trước khi màn này mount, dùng
     trạng thái chia sẻ để khỏi phải bắt lại lần hai. */
  const shared = window.MARS_RESCUE_SHARED_STATE;
  const alreadySos =
    shared && (shared.sosReceived || shared.sos_received || shared.stage === 'received');

  /* ---------- sự kiện DOM ---------- */

  function onCardClick(ev) {
    const card = ev.target.closest('.cml1-card');
    if (!card) return;
    /* Nút [?] nằm trong thẻ, bấm vào đó thì mở giải thích, không chọn. */
    if (ev.target.closest('.cml1-q')) return;
    choose(card.dataset.obj);
  }

  function onCardKey(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const card = ev.target.closest('.cml1-card');
    if (!card) return;
    ev.preventDefault();
    choose(card.dataset.obj);
  }

  function onInfoClick(ev) {
    const btn = ev.target.closest('[data-info]');
    if (!btn) return;
    ev.stopPropagation();
    const which = btn.dataset.info;
    const isObj1 = which === 'obj1';
    q('.cml1-modal-title').textContent = T(isObj1 ? 'card1Title' : 'card2Title');
    q('.cml1-modal-body').textContent = T(isObj1 ? 'card1Why' : 'card2Why');
    q('.cml1-modal-src-v').textContent = T('infoSourceVal');
    q('.cml1-modal').hidden = false;
    q('.cml1-modal-ok').focus();
  }

  function onModalClose() {
    q('.cml1-modal').hidden = true;
  }

  function onNextClick() {
    if (!picked) return;
    if (typeof onNext === 'function') onNext();
  }

  function onEsc(ev) {
    if (ev.key === 'Escape' && !q('.cml1-modal').hidden) onModalClose();
  }

  root.addEventListener('click', onCardClick);
  root.addEventListener('keydown', onCardKey);
  root.addEventListener('click', onInfoClick);
  root.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-close]')) onModalClose();
  });
  elNext.addEventListener('click', onNextClick);
  document.addEventListener('keydown', onEsc);

  /* ---------- dựng chuỗi lần đầu ---------- */

  q('.cml1-pick-title').id = 'cml1-pick-h';
  cards.forEach((c) => {
    const label = c.querySelector('.cml1-card-pick');
    if (label) label.dataset.l = 'pickLabel';
  });
  applyStrings();
  startStations();
  if (!received) {
    elLog.innerHTML = '';
    addLog(T('logEmpty'));
  }

  unsubLang = onLangChange(() => {
    applyStrings();
  });

  if (alreadySos) {
    const d = { solsRemaining: shared.solsRemaining, crewOnMars: shared.crewOnMars };
    later(() => receive(d), 420);
  }

  return {
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      if (stTimer) clearInterval(stTimer);
      timers = [];
      window.removeEventListener('mars:sos-received', onSos);
      document.removeEventListener('keydown', onEsc);
      if (unsubLang) unsubLang();
      root.remove();
    },
    /* Dùng cho trang demo và cho test: phát sự kiện như Giai đoạn 1. */
    simulateSos(detail) {
      receive(detail || { solsRemaining: readSols().sols, crewOnMars: readSols().crew });
    },
  };
}
