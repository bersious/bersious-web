/* ============================================================
   phase2/feature-cml3-tradespace.js
   Giai đoạn 2, bước 2: XƯỞNG LẮP RÁP TÀU CỨU HỘ.

   Ba vùng trên một màn:
     - trái: bốn nhóm thẻ linh kiện (tên lửa đẩy, nguồn điện,
       liên lạc, hạ cánh)
     - giữa: sân khấu lắp ráp. Con tàu vẽ bằng SVG nhiều lớp,
       mỗi lớp là một bộ phận và gắn vào tàu khi người chơi chọn
     - phải: bốn thanh đo an toàn đọc từ engine.getState().gauges

   Ngôn ngữ bình dân bắt buộc: mỗi nhãn kỹ thuật có tên dễ hiểu,
   tên gốc NASA trong ngoặc nhỏ, và nút [?] giải thích một tới hai câu.

   API theo phase2/CONTRACT.md:
     mountCml3({ container, engine, onNext }) -> { destroy() }

   Đường dẫn: base lấy bằng new URL('.', import.meta.url).href.
   ============================================================ */

import { getLang, onLangChange } from '../i18n.js';

const BASE = new URL('.', import.meta.url).href;
const DATA_URL = new URL('../data/nasa/rescue_modules.json', import.meta.url).href;

/* ============================================================
   CHUỖI SONG NGỮ CỦA RIÊNG MÀN NÀY
   ============================================================ */

const STR = {
  vi: {
    eyebrow: 'XƯỞNG LẮP RÁP · PHÒNG ĐIỀU KHIỂN',
    step: 'Bước 2 trên 4',
    title: 'Lắp ráp tàu và cân đối đánh đổi',
    lead: 'Lắp càng nhiều đồ thì tàu càng nặng, tốn nhiên liệu, bay chậm hơn. Bốn thanh đo cho biết thiết kế còn an toàn hay không.',
    nasaNote: 'CML 3 · Trade Space',

    stageTitle: 'Sân khấu lắp ráp',
    stageSub: 'Chọn một linh kiện, bộ phận đó sẽ gắn vào tàu.',
    stageEmpty: 'Tàu chưa có gì ngoài khung thân. Chọn linh kiện để lắp.',
    massReadout: 'Tải trọng phóng',
    costReadout: 'Chi phí',
    dryReadout: 'Khối lượng khô',

    shipHull: 'Thân chính',
    shipLauncher: 'Tên lửa đẩy',
    shipPowerSolar: 'Tấm pin mặt trời',
    shipPowerRtg: 'Khối RTG',
    shipComms: 'Chảo ăng-ten',
    shipEdl: 'Khoang hạ cánh',

    groupLauncher: 'Tên lửa đẩy',
    groupLauncherNasa: 'Launch vehicle',
    groupPower: 'Nguồn điện',
    groupPowerNasa: 'Power system',
    groupComms: 'Liên lạc',
    groupCommsNasa: 'Communications',
    groupEdl: 'Hạ cánh',
    groupEdlNasa: 'Entry, descent and landing',

    hintLauncher: 'Tên lửa càng lớn thì chở được tàu càng nặng, nhưng tiền phóng tăng vọt. Tên lửa SLS một mình đã ngốn hơn nửa ngân sách.',
    hintLauncherNasa: 'Dry mass margin',
    hintPower: 'Sao Hỏa hay có bão bụi che nắng, pin mặt trời giữa bão thì sập nguồn.',
    hintPowerNasa: 'Power margin',
    hintComms: 'Hàng trăm triệu ki lô mét làm sóng rất yếu, cần chảo đủ mạnh để Trái Đất nghe được.',
    hintCommsNasa: 'Comms link margin',
    hintEdl: 'Bộ cảm biến giúp hạ cánh chính xác nhưng là khối lượng không phục vụ việc cứu người.',

    warnSolar: 'Sao Hỏa hay có bão bụi che nắng, pin mặt trời giữa bão thì sập nguồn. Hãy tính tới chuyện mất điện vài tuần.',
    warnRtg: 'RTG dùng plutonium 238 nên phải có giấy phép an toàn hạt nhân trước khi phóng, và quy trình duyệt mất nhiều tháng.',
    warnRtgOk: 'Giấy phép hạt nhân đã có, nhưng RTG chỉ cho 110 W nên không đủ cho hệ sinh hoạt lớn.',

    cardMass: 'Khối lượng',
        cardCost: 'Chi phí',
        cardPower: 'Điện',
        cardPick: 'Lắp bộ phận này',
        cardPicked: 'Đang lắp',
        cardNotFit: 'Không lắp',

    fitYes: 'Đã lắp',
    fitNo: 'Chưa lắp',

    gaugesTitle: 'Bốn thanh đo an toàn',
    gaugesSub: 'Xanh là thoải mái, vàng là sát giới hạn, đỏ là đã vượt.',
    gaugeTime: 'Thời gian bay',
    gaugeTimeNasa: 'Flight time',
    gaugeMass: 'Độ dư tải trọng an toàn',
    gaugeMassNasa: 'Dry Mass Margin',
    gaugePower: 'Dự trữ điện năng',
    gaugePowerNasa: 'Power Margin',
    gaugeComms: 'Độ rõ sóng liên lạc',
    gaugeCommsNasa: 'Comms Link Margin',
    gaugeNeed: 'tối thiểu 35 phần trăm dự phòng',
    gaugeNoteTime: '{v} sol trên giới hạn {l} sol đồng đội còn sống',
    gaugeNoteMass: '{v} kg trên sức chở {l} kg',
    gaugeNotePower: '{v} W trên mức phát {l} W',
    gaugeNoteComms: 'trễ một chiều {v} phút trên ngưỡng {l} phút',

    statusOk: 'An toàn',
    statusWarn: 'Sát giới hạn',
    statusFail: 'Vượt giới hạn',

    infoOpen: 'Giải thích đánh đổi của nhóm này',
    infoTradeoff: 'Đánh đổi',
    infoSource: 'Nguồn',
    infoClose: 'Đã hiểu',
    infoNothing: 'Chưa chọn linh kiện nào trong nhóm này. Nội dung đánh đổi sẽ hiện khi bạn chọn một linh kiện.',

    next: 'Xong, sang bước kiểm tra',
    nextHint: 'Thiết kế sẽ được kiểm duyệt ở bước sau.',
    nextWarn: 'Có thanh đỏ. Vẫn sang được bước kiểm tra, nhưng bảng đèn sẽ báo lỗi.',

    loadErr: 'Không nạp được danh mục linh kiện. Kiểm tra file rescue_modules.json.',
    noEngine: 'Không tìm thấy bộ máy sứ mệnh. Màn này cần phase2-engine.js.',

    liftToLeo: 'Sức chở {n} kg lên quỹ đạo thấp',
    unitKg: 'kg',
    unitMusd: 'triệu USD',
  },

  en: {
    eyebrow: 'ASSEMBLY BAY · MISSION CONTROL',
    step: 'Step 2 of 4',
    title: 'Build the ship and balance the tradeoffs',
    lead: 'Every part you add makes the ship heavier, burns more fuel and flies slower. The four gauges tell you whether the design is still safe.',
    nasaNote: 'CML 3, Trade Space',

    stageTitle: 'Assembly stage',
    stageSub: 'Pick a part and it attaches to the ship.',
    stageEmpty: 'The ship is just a bare hull. Choose parts to build it up.',
    massReadout: 'Launch mass',
    costReadout: 'Cost',
    dryReadout: 'Dry mass',

    shipHull: 'Main hull',
    shipLauncher: 'Launch vehicle',
    shipPowerSolar: 'Solar array',
    shipPowerRtg: 'RTG block',
    shipComms: 'High gain dish',
    shipEdl: 'Landing capsule',

    groupLauncher: 'Launch vehicle',
    groupLauncherNasa: 'Launch vehicle',
    groupPower: 'Power',
    groupPowerNasa: 'Power system',
    groupComms: 'Communications',
    groupCommsNasa: 'Communications',
    groupEdl: 'Landing',
    groupEdlNasa: 'Entry, descent and landing',

    hintLauncher: 'A bigger rocket lifts a heavier ship, but the launch price jumps hard. SLS alone eats more than half the budget.',
    hintLauncherNasa: 'Dry mass margin',
    hintPower: 'Mars has dust storms that block the Sun, and a solar array loses power in the middle of one.',
    hintPowerNasa: 'Power margin',
    hintComms: 'Hundreds of millions of kilometres make the signal very weak, so the dish has to be strong enough for Earth to hear it.',
    hintCommsNasa: 'Comms link margin',
    hintEdl: 'The sensor suite buys a precise landing, but it is mass that serves nothing on the rescue itself.',

    warnSolar: 'Mars has dust storms that block the Sun, and a solar array loses power in the middle of one. Plan for weeks without sunlight.',
    warnRtg: 'An RTG runs on plutonium 238, so it needs a nuclear safety licence before launch, and that review takes months.',
    warnRtgOk: 'The nuclear licence is in hand, but an RTG gives only 110 W, not enough for a large life support load.',

    cardMass: 'Mass',
        cardCost: 'Cost',
        cardPower: 'Power',
        cardPick: 'Fit this part',
        cardPicked: 'Fitted',
        cardNotFit: 'Leave out',

    fitYes: 'Fitted',
    fitNo: 'Not fitted',

    gaugesTitle: 'Four safety gauges',
    gaugesSub: 'Green is comfortable, amber is close to the limit, red is over it.',
    gaugeTime: 'Flight time',
    gaugeTimeNasa: 'Flight time',
    gaugeMass: 'Safe load margin',
    gaugeMassNasa: 'Dry Mass Margin',
    gaugePower: 'Power reserve',
    gaugePowerNasa: 'Power Margin',
    gaugeComms: 'Signal clarity',
    gaugeCommsNasa: 'Comms Link Margin',
    gaugeNeed: 'at least 35 percent spare required',
    gaugeNoteTime: '{v} sols against a limit of {l} sols the crew can hold out',
    gaugeNoteMass: '{v} kg against a {l} kg capacity',
    gaugeNotePower: '{v} W against {l} W generated',
    gaugeNoteComms: 'a {v} minute one way delay against a {l} minute limit',

    statusOk: 'Safe',
    statusWarn: 'Near the limit',
    statusFail: 'Over the limit',

    infoOpen: 'Explain the tradeoffs in this group',
    infoTradeoff: 'Tradeoff',
    infoSource: 'Source',
    infoClose: 'Got it',
    infoNothing: 'Nothing chosen in this group yet. The tradeoff text appears once you pick a part.',

    next: 'Done, go to the checks',
    nextHint: 'The design goes through the approval board next.',
    nextWarn: 'A red bar is showing. You can still go to the checks, but the board will flag it.',

    loadErr: 'Could not load the parts catalogue. Check rescue_modules.json.',
    noEngine: 'Mission engine not found. This screen needs phase2-engine.js.',

    liftToLeo: 'Lifts {n} kg to low Earth orbit',
    unitKg: 'kg',
    unitMusd: 'M USD',
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

function pick(obj, field) {
  if (!obj) return '';
  const en = getLang() === 'en';
  return (en ? obj[field + '_en'] : obj[field + '_vi']) || obj[field + '_vi'] || obj[field + '_en'] || '';
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
  if (document.querySelector('link[data-phase2-cml3]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css-cml3.css';
  link.dataset.phase2Cml3 = '1';
  document.head.appendChild(link);
}

/* ============================================================
   ICON LINH KIỆN
   Mỗi module một hình riêng vẽ nội tuyến. Tất cả dùng
   currentColor nên đổi màu theo trạng thái thẻ mà không cần
   thêm biến.
   ============================================================ */

const ICONS = {
  /* động cơ hóa học: chuông tên lửa có ngọn lửa ngắn */
  prop_chemical_320: `
    <path d="M34 14h28l-6 26H40Z"/>
    <path d="M40 40h16"/>
    <path d="M42 46c2 8 4 14 6 20 2-6 4-12 6-20"/>
    <path d="M30 24h4M62 24h4" />`,
  /* hypergolic: hai chuông đôi */
  prop_hypergolic_450: `
    <path d="M22 16h20l-5 22H27Z"/>
    <path d="M54 16h20l-5 22H59Z"/>
    <path d="M27 38h10l-5 16-5-16Z"/>
    <path d="M59 38h10l-5 16-5-16Z"/>
    <path d="M46 26h8"/>`,
  /* NTP: lò phản ứng, vòng tròn nguyên tử */
  prop_nuclear_ntp_900: `
    <rect x="38" y="12" width="20" height="18" rx="3"/>
    <path d="M38 22h20M46 12v18M52 12v18"/>
    <circle cx="48" cy="48" r="14"/>
    <circle cx="48" cy="48" r="3.4"/>
    <ellipse cx="48" cy="48" rx="14" ry="5.4"/>
    <ellipse cx="48" cy="48" rx="14" ry="5.4" transform="rotate(60 48 48)"/>
    <ellipse cx="48" cy="48" rx="14" ry="5.4" transform="rotate(120 48 48)"/>
    <path d="M48 30v-2"/>`,
  /* pin mặt trời: hai cánh có ô */
  power_solar_rosa: `
    <rect x="42" y="20" width="12" height="56" rx="2"/>
    <path d="M42 34h12M42 48h12M42 62h12"/>
    <path d="M14 28h24v26H14Z"/><path d="M14 41h24M26 28v26"/>
    <path d="M58 28h24v26H58Z"/><path d="M58 41h24M70 28v26"/>`,
  /* RTG: khối có cánh tản nhiệt */
  power_rtg_mmrtg: `
    <rect x="34" y="26" width="28" height="30" rx="4"/>
    <path d="M34 34h28M34 44h28"/>
    <path d="M62 32h12v6H62ZM62 44h12v6H62Z"/>
    <path d="M26 32h-12v6h12ZM26 44h-12v6h12Z"/>
    <path d="M48 56v10"/>
    <path d="M40 66h16"/>`,
  /* ăng-ten: chảo parabol có trụ đỡ */
  comms_high_gain: `
    <path d="M48 12c14 0 24 10 24 22H24c0-12 10-22 24-22Z"/>
    <path d="M48 34v20"/>
    <path d="M38 62h20"/>
    <path d="M48 34 30 24M48 34l18-10"/>
    <circle cx="48" cy="28" r="3"/>
    <path d="M36 72c4-4 8-6 12-6s8 2 12 6"/>`,
  /* EDL: khoang hạ cánh có ba chân */
  sensor_edl_suite: `
    <path d="M30 26h36l-6 24H36Z"/>
    <path d="M36 50h24"/>
    <path d="M36 50 26 70M60 50l10 20M48 50v22"/>
    <circle cx="48" cy="34" r="4"/>
    <path d="M48 8v10"/>`,
  /* tên lửa đẩy: thân đứng có hai tầng và vây */
  launcher: `
    <path d="M48 8c8 8 12 18 12 30v26H36V38c0-12 4-22 12-30Z"/>
    <path d="M36 46h24M36 56h24"/>
    <path d="M36 64 26 78h10M60 64l10 14H60"/>
    <path d="M44 78h8"/>`,
};

function iconFor(id) {
  if (ICONS[id]) return ICONS[id];
  if (id && id.startsWith('launcher')) return ICONS.launcher;
  return `<circle cx="48" cy="48" r="22"/><path d="M48 34v28M34 48h28"/>`;
}

function svgIcon(id, cls = 'cml3-ico') {
  return `<svg class="${cls}" viewBox="0 0 96 96" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    ${iconFor(id)}
  </svg>`;
}

/* ============================================================
   SÂN KHẤU: CON TÀU
   Mỗi lớp là một nhóm <g> mang id riêng. JS bật tắt lớp bằng
   class .is-fitted, CSS lo hiệu ứng trượt vào.
   ============================================================ */

const SHIP = `
<svg class="cml3-ship" viewBox="0 0 400 640" role="img" aria-labelledby="cml3-ship-t">
  <title id="cml3-ship-t"></title>
  <defs>
    <linearGradient id="cml3-hull-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" class="cml3-g-hull-a"/>
      <stop offset=".34" class="cml3-g-hull-b"/>
      <stop offset=".58" class="cml3-g-hull-c"/>
      <stop offset="1" class="cml3-g-hull-d"/>
    </linearGradient>
    <linearGradient id="cml3-panel-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="cml3-g-panel-a"/>
      <stop offset="1" class="cml3-g-panel-b"/>
    </linearGradient>
    <linearGradient id="cml3-flame-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="cml3-g-flame-a"/>
      <stop offset=".55" class="cml3-g-flame-b"/>
      <stop offset="1" class="cml3-g-flame-c"/>
    </linearGradient>
    <radialGradient id="cml3-rtg-g" cx=".35" cy=".3" r=".9">
      <stop offset="0" class="cml3-g-rtg-a"/>
      <stop offset="1" class="cml3-g-rtg-b"/>
    </radialGradient>
    <filter id="cml3-glow" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="3.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- khung dựng: dầm giữ và vòng bệ -->
  <g class="cml3-rig" aria-hidden="true">
    <path d="M60 196v310M340 196v310"/>
    <path d="M60 240h30M310 240h30M60 420h30M310 420h30"/>
    <path d="M40 506h320"/>
    <path d="M74 506l-14 22h288l-14-22"/>
    <ellipse cx="200" cy="530" rx="152" ry="12" class="cml3-bay-floor"/>
  </g>

  <!-- THÂN CHÍNH: luôn có mặt, là khung chờ các bộ phận -->
  <g class="cml3-part cml3-hull is-fitted" data-part="hull">
    <path class="cml3-hull-body" d="M156 196h88v212h-88Z" fill="url(#cml3-hull-g)"/>
    <path class="cml3-hull-nose" d="M156 196c0-26 18-44 44-44s44 18 44 44Z" fill="url(#cml3-hull-g)"/>
    <path class="cml3-hull-belt" d="M152 236h96M152 374h96"/>
    <path class="cml3-hull-strut" d="M166 196v212M234 196v212"/>
    <g class="cml3-hull-ports">
      <circle cx="200" cy="268" r="9"/><circle cx="200" cy="300" r="9"/><circle cx="200" cy="332" r="9"/>
    </g>
    <path class="cml3-hull-hatch" d="M186 396h28v18h-28Z"/>
    <path class="cml3-hull-ladder" d="M176 248v150M176 262h-10M176 282h-10M176 302h-10M176 322h-10M176 342h-10M176 362h-10M176 382h-10"/>
    <path class="cml3-hull-tag" d="M228 214v40"/>
  </g>

  <!-- CHẢO ĂNG-TEN: trên đỉnh, trượt xuống khi lắp -->
  <g class="cml3-part cml3-comms" data-part="comms" data-from="top">
    <!-- Cột đỡ ăng-ten ăn sâu vào nắp mũi để chảo không bị lơ lửng. -->
    <path class="cml3-mast" d="M200 158v-22"/>
    <path class="cml3-mast-base" d="M190 156h20"/>
    <path class="cml3-dish" d="M162 152c0-22 17-36 38-36s38 14 38 36Z"/>
    <path class="cml3-dish-rim" d="M162 152h76"/>
    <path class="cml3-dish-feed" d="M200 116v26"/>
    <circle class="cml3-dish-tip" cx="200" cy="114" r="4"/>
    <path class="cml3-dish-strut" d="M174 148 200 138l26 10"/>
    <circle class="cml3-wave" cx="200" cy="100" r="12"/>
  </g>

  <!-- KHOANG HẠ CÁNH: mũi tàu, có ba chân và tấm chắn nhiệt -->
  <g class="cml3-part cml3-edl" data-part="edl" data-from="top">
    <!-- Tấm chắn nhiệt ôm mũi. Ba chân bung ra hai bên, có bàn chân
         dẹt, để nhìn ra ngay đây là khoang hạ cánh chứ không phải
         một cái nắp mũi trang trí. -->
    <path class="cml3-heat" d="M154 196c4-32 21-52 46-52s42 20 46 52Z"/>
    <path class="cml3-heat-line" d="M166 178h68"/>
    <path class="cml3-heat-line" d="M172 166h56"/>
    <path class="cml3-leg" d="M158 200 130 248M242 200l28 48"/>
    <path class="cml3-leg" d="M200 196v56"/>
    <path class="cml3-foot" d="M122 250h18M260 250h18M191 254h18"/>
    <path class="cml3-leg-joint" d="M130 248v-8M270 248v-8M200 252v-8"/>
    <circle class="cml3-edl-sensor" cx="200" cy="172" r="5"/>
    <circle class="cml3-edl-sensor" cx="182" cy="182" r="3"/>
    <circle class="cml3-edl-sensor" cx="218" cy="182" r="3"/>
  </g>

  <!-- TÊN LỬA ĐẨY: dưới đáy, thân phóng và các cụm tăng lực -->
  <g class="cml3-part cml3-launcher" data-part="launcher" data-from="bottom">
    <g class="cml3-booster-bank">
      <path class="cml3-booster" d="M252 404h30v74h-30Z"/>
      <path class="cml3-booster-cap" d="M252 404c0-12 7-20 15-20s15 8 15 20Z"/>
      <path class="cml3-bell" d="M258 478h18l-4 16h-10Z"/>
      <path class="cml3-flame" d="M262 494h10l-5 30Z"/>
      <path class="cml3-booster" d="M118 404h30v74h-30Z"/>
      <path class="cml3-booster-cap" d="M118 404c0-12 7-20 15-20s15 8 15 20Z"/>
      <path class="cml3-bell" d="M124 478h18l-4 16h-10Z"/>
      <path class="cml3-flame" d="M128 494h10l-5 30Z"/>
    </g>
    <path class="cml3-core-stage" d="M166 408h68v66h-68Z"/>
    <path class="cml3-core-band" d="M166 424h68M166 448h68"/>
    <path class="cml3-bell cml3-bell-main" d="M176 474h20l-5 20h-10Z"/>
    <path class="cml3-bell cml3-bell-main" d="M204 474h20l-5 20h-10Z"/>
    <path class="cml3-flame cml3-flame-main" d="M180 494h12l-6 34Z"/>
    <path class="cml3-flame cml3-flame-main" d="M208 494h12l-6 34Z"/>
    <path class="cml3-skirt" d="M162 408 148 414v8l14 6M238 408l14 6v8l-14 6"/>
  </g>

  <!-- PIN MẶT TRỜI: hai cánh bung ra hai bên -->
  <g class="cml3-part cml3-solar" data-part="power" data-variant="solar" data-from="left">
    <path class="cml3-arm" d="M156 268h-14M244 268h14"/>
    <path class="cml3-wing" d="M66 232h76v72H66Z"/>
    <path class="cml3-wing-cell" d="M66 256h76M66 280h76M92 232v72M118 232v72"/>
    <path class="cml3-wing" d="M258 232h76v72h-76Z"/>
    <path class="cml3-wing-cell" d="M258 256h76M258 280h76M284 232v72M310 232v72"/>
    <path class="cml3-wing-edge" d="M66 232h76M258 232h76"/>
  </g>

  <!-- KHỐI RTG: hộp tản nhiệt gắn sát thân -->
  <g class="cml3-part cml3-rtg" data-part="power" data-variant="rtg" data-from="left">
    <path class="cml3-rtg-body" d="M112 300h38v66h-38Z" fill="url(#cml3-rtg-g)"/>
    <path class="cml3-rtg-fin" d="M112 312H96v8h16M112 330H96v8h16M112 348H96v8h16"/>
    <path class="cml3-rtg-arm" d="M150 330h6"/>
    <circle class="cml3-rtg-dot" cx="131" cy="316" r="3"/>
    <circle class="cml3-rtg-dot" cx="131" cy="334" r="3"/>
    <circle class="cml3-rtg-dot" cx="131" cy="352" r="3"/>
    <path class="cml3-rtg-heat" d="M131 372c-6 10-2 16 0 22 2-6 6-12 0-22Z"/>
  </g>
</svg>
`;

/* Bốn nhóm linh kiện theo đúng hợp đồng. */
const GROUPS = [
  {
    id: 'launcher',
    labelKey: 'groupLauncher',
    nasaKey: 'groupLauncherNasa',
    hintKey: 'hintLauncher',
    source: 'launcher',
  },
  { id: 'power', labelKey: 'groupPower', nasaKey: 'groupPowerNasa', hintKey: 'hintPower', source: 'modules' },
  { id: 'comms', labelKey: 'groupComms', nasaKey: 'groupCommsNasa', hintKey: 'hintComms', source: 'modules' },
  { id: 'edl', labelKey: 'groupEdl', nasaKey: 'groupEdlNasa', hintKey: 'hintEdl', source: 'modules' },
];

/* Nhóm nào gắn vào lớp SVG nào. */
const PART_MAP = {
  launcher: 'launcher',
  power: 'power',
  comms: 'comms',
  edl: 'edl',
};

const SHELL = `
  <div class="cml3-bg" aria-hidden="true"></div>

  <header class="cml3-head">
    <div class="cml3-head-left">
      <p class="cml3-eyebrow" data-l="eyebrow"></p>
      <h1 class="cml3-title" data-l="title"></h1>
    </div>
    <div class="cml3-head-right">
      <span class="cml3-nasa mono" data-l="nasaNote"></span>
      <span class="cml3-step mono" data-l="step"></span>
    </div>
  </header>

  <p class="cml3-lead" data-l="lead"></p>

  <div class="cml3-grid">
    <!-- trái: bốn nhóm thẻ -->
    <section class="cml3-parts" aria-label="parts"></section>

    <!-- giữa: sân khấu -->
    <section class="cml3-stage" aria-labelledby="cml3-stage-h">
      <div class="cml3-stage-head">
        <div>
          <h2 class="cml3-stage-title" id="cml3-stage-h" data-l="stageTitle"></h2>
          <p class="cml3-stage-sub" data-l="stageSub"></p>
        </div>
        <dl class="cml3-stage-read">
          <div><dt data-l="massReadout"></dt><dd class="mono" data-read="mass">0</dd></div>
          <div><dt data-l="costReadout"></dt><dd class="mono" data-read="cost">0</dd></div>
        </dl>
      </div>

      <div class="cml3-stage-canvas">
        <div class="cml3-canvas-grid" aria-hidden="true"></div>
        <div class="cml3-canvas-glow" aria-hidden="true"></div>
        ${SHIP}
        <p class="cml3-stage-empty" data-l="stageEmpty"></p>
      </div>

      <ul class="cml3-manifest" aria-live="polite"></ul>
    </section>

    <!-- phải: bốn thanh đo -->
    <aside class="cml3-gauges" aria-labelledby="cml3-gauges-h">
      <div class="cml3-gauges-head">
        <h2 class="cml3-gauges-title" id="cml3-gauges-h" data-l="gaugesTitle"></h2>
        <p class="cml3-gauges-sub" data-l="gaugesSub"></p>
      </div>
      <div class="cml3-gauge-list"></div>
      <p class="cml3-warn" role="status" aria-live="polite" hidden></p>
      <div class="cml3-actions">
        <button type="button" class="cml3-next">
          <span data-l="next"></span>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12h15"/><path d="m13 6 6 6-6 6"/>
          </svg>
        </button>
        <p class="cml3-next-hint" data-l="nextHint"></p>
      </div>
    </aside>
  </div>

  <div class="cml3-modal" hidden>
    <div class="cml3-modal-scrim" data-close></div>
    <div class="cml3-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cml3-modal-t">
      <header class="cml3-modal-head">
        <h3 class="cml3-modal-title" id="cml3-modal-t"></h3>
        <button type="button" class="cml3-modal-x" data-close aria-label="close">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
            stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="cml3-modal-body"></div>
      <button type="button" class="cml3-modal-ok" data-close data-l="infoClose"></button>
    </div>
  </div>
`;

/* ============================================================
   ĐIỂM VÀO
   ============================================================ */

export function mountCml3(opts = {}) {
  /* Chấp nhận cả {container, engine, onNext} (API gốc) lẫn
     {host, engine, onDone} (kiểm thử). Alias để cả hai đều chạy. */
  const container = opts.container || opts.host;
  const engine = opts.engine || window.phase2Engine;
  const onNext = opts.onNext || opts.onDone;
  injectCss();

  const host = container || document.body;
  const root = document.createElement('div');
  root.className = 'cml3-root';
  root.innerHTML = SHELL;
  host.appendChild(root);

  const q = (s) => root.querySelector(s);
  const qa = (s) => Array.from(root.querySelectorAll(s));

  let destroyed = false;
  let unsubLang = null;
  let unsubState = null;
  let DATA = null;
  const timers = [];

  const later = (fn, ms) => {
    const id = setTimeout(() => { if (!destroyed) fn(); }, ms);
    timers.push(id);
    return id;
  };

  if (!engine || typeof engine.getState !== 'function') {
    q('.cml3-stage-canvas').innerHTML = '<p class="cml3-fatal">' + T('noEngine') + '</p>';
    return { destroy() { root.remove(); } };
  }

  /* Thẻ linh kiện: mỗi nhóm một danh sách. */
  const partsByGroup = { launcher: [], power: [], comms: [], edl: [] };

  const CAT_TO_GROUP = {
    power: 'power',
    communications: 'comms',
    science_and_edl: 'edl',
  };

  function buildCatalog() {
    if (!DATA) return;
    const modules = DATA.modules || [];
    const idx = DATA.module_index || {};

    for (const [cat, ids] of Object.entries(idx)) {
      const group = CAT_TO_GROUP[cat];
      if (!group) continue;
      for (const id of ids) {
        const m = modules.find((x) => x.id === id);
        if (m) partsByGroup[group].push(m);
      }
    }

    const vehicles = (DATA.reference_launchers && DATA.reference_launchers.vehicles) || [];
    partsByGroup.launcher = vehicles
      .map((v) => ({
        id: v.id,
        name_vi: v.name_en,
        name_en: v.name_en,
        mass_kg: 0,
        capacity_leo_kg: v.capacity_leo_kg,
        cost_musd: v.cost_musd,
        isVehicle: true,
      }))
      .sort((a, b) => a.capacity_leo_kg - b.capacity_leo_kg);
  }

  /* ---------- dựng cột thẻ ---------- */

  function renderParts() {
    const wrap = q('.cml3-parts');
    wrap.innerHTML = '';

    GROUPS.forEach((g) => {
      const sec = document.createElement('section');
      sec.className = 'cml3-group';
      sec.dataset.group = g.id;

      const head = document.createElement('div');
      head.className = 'cml3-group-head';
      head.innerHTML = `
        <div class="cml3-group-titles">
          <h3 class="cml3-group-title">${T(g.labelKey)}</h3>
          <p class="cml3-group-nasa mono">${T(g.nasaKey)}</p>
        </div>
        <button type="button" class="cml3-q" data-info="${g.id}"
          aria-label="${T('infoOpen')}"><span aria-hidden="true">?</span></button>`;
      sec.appendChild(head);

      const list = document.createElement('div');
      list.className = 'cml3-opts';
      list.setAttribute('role', 'radiogroup');
      list.setAttribute('aria-label', T(g.labelKey));

      const opts = partsByGroup[g.id] || [];
      opts.forEach((m) => {
              const card = document.createElement('button');
              card.type = 'button';
              card.className = 'cml3-opt';
              card.dataset.group = g.id;
              card.dataset.part = m.id;
              card.setAttribute('role', 'radio');
              card.setAttribute('aria-checked', 'false');

              const name = m.isVehicle ? m.name_vi : pick(m, 'name');
              /* Tên lửa đẩy: tên thương mại giữ nguyên vì là danh từ riêng,
                 còn dòng phụ ghi sức chở lên quỹ đạo thấp bằng lời thường.
                 Module: dòng phụ là tên ngôn ngữ kia (song ngữ). */
              const sub = m.isVehicle
                ? T('liftToLeo', { n: fmt(m.capacity_leo_kg, 0) })
                : (getLang() === 'en' ? m.name_vi : m.name_en) || pick(m, 'name');
              const massTxt = m.isVehicle
                ? fmt(m.capacity_leo_kg, 0)
                : fmt(m.mass_kg, 0);
              const trade = m.isVehicle ? T(g.hintKey) : pick(m, 'tradeoff');

              /* Ảnh thật 128x128 webp nếu có, kèm SVG fallback. onerror sẽ
                 ẩn ảnh và lộ SVG qua listener capture ở root.
                 KHÔNG dùng loading="lazy" ở đây. Đo thật: cả 9 ảnh nằm
                 trong khung cuộn có chiều cao giới hạn, trình duyệt coi
                 chúng là ngoài khung nhìn nên không tải, naturalWidth
                 đứng ở 0 và người chơi chỉ thấy icon SVG dự phòng. Đổi
                 sang eager thì 9/9 tải đúng 128x128. Ảnh chỉ 2 tới 6 KB
                 nên tải hết ngay không tốn kém gì. */
              const artId = m.isVehicle ? 'launcher_' + m.id : m.id;
              const artUrl = BASE + 'assets/art/parts/' + artId + '.webp';
              const artHtml = `
                <img class="cml3-opt-img" src="${artUrl}" alt="" decoding="async"
                     data-part-art="${artId}">
                <span class="cml3-ico-fallback">${svgIcon(m.isVehicle ? 'launcher' : m.id)}</span>`;

              /* Chip công suất: chỉ hiện cho module có power_w khác 0.
                 Dương = phát điện (pin mặt trời), âm = tiêu thụ. */
              const powerChip = (!m.isVehicle && Number.isFinite(m.power_w) && m.power_w !== 0)
                ? `<span class="cml3-stat" data-kind="${m.power_w > 0 ? 'power-pos' : 'power-neg'}">
                     <i class="cml3-stat-k">${T('cardPower')}</i>
                     <span class="cml3-stat-val">${m.power_w > 0 ? '+' : ''}${fmt(m.power_w, 0)} W</span>
                   </span>`
                : '';

              card.innerHTML = `
                <span class="cml3-opt-art">${artHtml}</span>
                <span class="cml3-opt-main">
                  <span class="cml3-opt-name">${escapeHtml(name)}</span>
                  <span class="cml3-opt-nasa mono">${escapeHtml(sub)}</span>
                  <span class="cml3-opt-stats">
                    <span class="cml3-stat"><i class="cml3-stat-k">${T('cardMass')}</i><span class="cml3-stat-val">${escapeHtml(massTxt)}</span> <span class="cml3-stat-unit">${T('unitKg')}</span></span>
                    <span class="cml3-stat"><i class="cml3-stat-k">${T('cardCost')}</i><span class="cml3-stat-val">${fmt(m.cost_musd, 1)}</span> <span class="cml3-stat-unit">${T('unitMusd')}</span></span>
                    ${powerChip}
                  </span>
                  <span class="cml3-opt-trade">${escapeHtml(trade)}</span>
                </span>
              `;
              list.appendChild(card);
            });

      if (!opts.length) {
        const p = document.createElement('p');
        p.className = 'cml3-opt-none';
        p.textContent = T('infoNothing');
        list.appendChild(p);
      }

      sec.appendChild(list);
      wrap.appendChild(sec);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- bốn thanh đo ---------- */

  const GAUGE_DEFS = [
    { key: 'time', labelKey: 'gaugeTime', nasaKey: 'gaugeTimeNasa', noteKey: 'gaugeNoteTime', digits: 1, unit: '' },
    { key: 'mass', labelKey: 'gaugeMass', nasaKey: 'gaugeMassNasa', noteKey: 'gaugeNoteMass', digits: 0, unit: 'kg' },
    { key: 'power', labelKey: 'gaugePower', nasaKey: 'gaugePowerNasa', noteKey: 'gaugeNotePower', digits: 0, unit: 'W' },
    { key: 'comms', labelKey: 'gaugeComms', nasaKey: 'gaugeCommsNasa', noteKey: 'gaugeNoteComms', digits: 1, unit: 'dB' },
  ];

  function renderGaugeShells() {
    const wrap = q('.cml3-gauge-list');
    wrap.innerHTML = '';
    GAUGE_DEFS.forEach((d) => {
      const box = document.createElement('div');
      box.className = 'cml3-gauge';
      box.dataset.gauge = d.key;
      box.dataset.status = 'ok';
      box.innerHTML = `
        <div class="cml3-gauge-top">
          <span class="cml3-gauge-lbl">
            <b class="cml3-gauge-name">${T(d.labelKey)}</b>
            <i class="cml3-gauge-nasa mono">${T(d.nasaKey)}</i>
          </span>
          <span class="cml3-gauge-state mono">${T('statusOk')}</span>
        </div>
        <div class="cml3-gauge-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <span class="cml3-gauge-fill"></span>
          <span class="cml3-gauge-cap"></span>
        </div>
        <p class="cml3-gauge-note"></p>`;
      wrap.appendChild(box);
    });
  }

  /* Đọc state một lần, cập nhật cả bốn thanh, không dựng lại DOM. */
  function updateGauges() {
    let st = null;
    try { st = engine.getState(); } catch (err) { st = null; }
    if (!st || !st.gauges) return;

    const g = st.gauges;
    GAUGE_DEFS.forEach((d) => {
      const box = q('.cml3-gauge[data-gauge="' + d.key + '"]');
      if (!box) return;
      const data = g[d.key];
      if (!data) return;

      const pct = Math.max(0, Math.min(140, Number(data.pct) || 0));
      const status = data.status === 'fail' ? 'fail' : data.status === 'warn' ? 'warn' : 'ok';

      box.dataset.status = status;
      box.querySelector('.cml3-gauge-fill').style.width = Math.min(100, pct) + '%';
      const track = box.querySelector('.cml3-gauge-track');
      track.setAttribute('aria-valuenow', String(Math.round(pct)));

      const stateEl = box.querySelector('.cml3-gauge-state');
      stateEl.textContent = T(status === 'fail' ? 'statusFail' : status === 'warn' ? 'statusWarn' : 'statusOk');

      const v = Number.isFinite(data.value) ? data.value : 0;
      const l = Number.isFinite(data.limit) ? data.limit : 0;
      box.querySelector('.cml3-gauge-note').textContent = T(d.noteKey, {
        v: fmt(v, d.digits),
        l: fmt(l, d.digits),
      });

      /* Thanh điện nháy vàng khi chọn pin mặt trời: đúng lời nhắc. */
      const isPowerSolar = d.key === 'power' && current().power === 'power_solar_rosa';
      box.classList.toggle('is-flash', isPowerSolar && status !== 'fail');
    });

    updateReadouts(st);
    updateManifest(st);
  }

  function updateReadouts(st) {
    const totals = st.totals || {};
    const massEl = q('[data-read="mass"]');
    const costEl = q('[data-read="cost"]');
    if (massEl) massEl.textContent = fmt(totals.massKg || 0, 0) + ' kg';
    if (costEl) costEl.textContent = fmt(totals.costMusd || 0, 0) + ' ' + T('unitMusd');
  }

  function updateManifest(st) {
    const ul = q('.cml3-manifest');
    if (!ul) return;
    const sel = st.selection || {};
    const items = [
      { k: 'launcher', txt: vehicleLabel(sel.launcher) },
      { k: 'power', txt: moduleLabel(sel.power) },
      { k: 'comms', txt: moduleLabel(sel.comms) },
      { k: 'edl', txt: moduleLabel(sel.edl) },
    ];

    ul.innerHTML = items
      .map((it) => {
        const on = Boolean(it.txt);
        return `<li class="cml3-man ${on ? 'is-on' : ''}" data-man="${it.k}">
          <span class="cml3-man-dot" aria-hidden="true"></span>
          <span class="cml3-man-txt">${escapeHtml(it.txt || T('fitNo'))}</span>
        </li>`;
      })
      .join('');

    const anyFitted = items.some((i) => i.txt);
    q('.cml3-stage-empty').hidden = anyFitted;
  }

  function moduleLabel(id) {
    if (!id) return '';
    const all = []
      .concat(partsByGroup.power, partsByGroup.comms, partsByGroup.edl);
    const m = all.find((x) => x.id === id);
    return m ? pick(m, 'name') : id;
  }

  function vehicleLabel(id) {
    if (!id) return '';
    const v = partsByGroup.launcher.find((x) => x.id === id);
    return v ? v.name_vi : id;
  }

  /* ---------- gắn bộ phận vào tàu ---------- */

  function current() {
    let st = null;
    try { st = engine.getState(); } catch (err) { st = null; }
    return (st && st.selection) || {};
  }

  function syncShip(animate) {
      const sel = current();

      /* tên lửa đẩy: bật lớp, và số cụm tăng lực theo sức chở.
         data-tier phân bốn bậc: light (<5T), medium (5-15T), heavy (15-30T),
         super (>30T). CSS dùng tier này để ẩn/hiện booster bank và co lõi. */
      const launchEl = q('.cml3-part[data-part="launcher"]');
      const veh = partsByGroup.launcher.find((v) => v.id === sel.launcher);
      if (launchEl) {
        setFitted(launchEl, Boolean(sel.launcher), animate);
        const cap = veh ? veh.capacity_leo_kg : 0;
        const tier = cap >= 30000 ? 'super' : cap >= 15000 ? 'heavy' : cap >= 5000 ? 'medium' : 'light';
        launchEl.dataset.tier = tier;
      }

    /* nguồn điện: hai biến thể, chỉ một cái hiện */
    const powerEls = qa('.cml3-part[data-part="power"]');
    powerEls.forEach((el) => {
      const variant = el.dataset.variant === 'rtg' ? 'power_rtg_mmrtg' : 'power_solar_rosa';
      setFitted(el, Boolean(sel.power) && sel.power === variant, animate);
    });

    const commsEl = q('.cml3-part[data-part="comms"]');
    if (commsEl) setFitted(commsEl, Boolean(sel.comms), animate);

    const edlEl = q('.cml3-part[data-part="edl"]');
        if (edlEl) setFitted(edlEl, Boolean(sel.edl), animate);

        /* thẻ đang lắp */
        qa('.cml3-opt').forEach((c) => {
          const on = sel[c.dataset.group] === c.dataset.part;
          c.classList.toggle('is-picked', on);
          c.setAttribute('aria-checked', on ? 'true' : 'false');
        });

        /* callout: sáng đèn khi nhóm tương ứng đã lắp */
        syncCallouts();
      }

  function setFitted(el, on, animate) {
    const was = el.classList.contains('is-fitted');
    el.classList.toggle('is-fitted', on);
    if (on && !was && animate) {
      el.classList.remove('is-fitting');
      void el.getBoundingClientRect();
      el.classList.add('is-fitting');
      later(() => el.classList.remove('is-fitting'), 620);
    }
  }

  /* ---------- chọn linh kiện ---------- */

  function choose(group, part) {
    if (destroyed) return;
    try {
      engine.updateSelection({ group, part });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[cml3] updateSelection lỗi', err);
    }
    syncShip(true);
    updateGauges();
    showGroupWarn(group, part);
  }

  function showGroupWarn(group, part) {
    const box = q('.cml3-warn');
    if (!box) return;
    let txt = '';
    if (group === 'power' && part === 'power_solar_rosa') txt = T('warnSolar');
    if (group === 'power' && part === 'power_rtg_mmrtg') {
      const st = engine.getState ? engine.getState() : null;
      const ok = st && st.compliance && st.compliance.rtg_approved;
      txt = ok ? T('warnRtgOk') : T('warnRtg');
    }
    if (!txt) {
      box.hidden = true;
      box.textContent = '';
      return;
    }
    box.hidden = false;
    box.textContent = txt;
    box.dataset.group = group;
    box.classList.remove('cml3-warn-pop');
    void box.offsetWidth;
    box.classList.add('cml3-warn-pop');
  }

  /* ---------- panel [?] ---------- */

  function openInfo(groupId) {
    const g = GROUPS.find((x) => x.id === groupId);
    if (!g) return;
    const sel = current();
    const chosenId = sel[groupId];
    const part = (partsByGroup[groupId] || []).find((x) => x.id === chosenId);

    q('.cml3-modal-title').textContent = T(g.labelKey) + ' · ' + T('infoTradeoff');

    if (!part) {
      q('.cml3-modal-body').innerHTML =
        `<p class="cml3-modal-lead">${escapeHtml(T(g.hintKey))}</p>
         <p class="cml3-modal-none">${escapeHtml(T('infoNothing'))}</p>`;
    } else {
      const tradeoff = part.isVehicle ? T(g.hintKey) : pick(part, 'tradeoff');
      const src = part.isVehicle
        ? pick(DATA.reference_launchers, 'source') ||
          (DATA.reference_launchers && DATA.reference_launchers.source) || ''
        : part.source || '';
      q('.cml3-modal-body').innerHTML =
        `<p class="cml3-modal-lead">${escapeHtml(part.isVehicle ? part.name_vi : pick(part, 'name'))}</p>
         <p class="cml3-modal-label mono">${escapeHtml(T('infoTradeoff'))}</p>
         <p class="cml3-modal-trade">${escapeHtml(tradeoff)}</p>
         ${src ? `<p class="cml3-modal-src"><span class="mono">${escapeHtml(T('infoSource'))}:</span> ${escapeHtml(src)}</p>` : ''}`;
    }

    q('.cml3-modal').hidden = false;
    q('.cml3-modal-ok').focus();
  }

  /* ---------- sự kiện ---------- */

  function onPartClick(ev) {
    const btn = ev.target.closest('.cml3-opt');
    if (!btn) return;
    choose(btn.dataset.group, btn.dataset.part);
  }

  function onInfoClick(ev) {
    const btn = ev.target.closest('[data-info]');
    if (!btn) return;
    ev.stopPropagation();
    openInfo(btn.dataset.info);
  }

  function onClose(ev) {
    if (ev.target.closest('[data-close]')) q('.cml3-modal').hidden = true;
  }

  function onKey(ev) {
    if (ev.key === 'Escape' && !q('.cml3-modal').hidden) {
      q('.cml3-modal').hidden = true;
      return;
    }
    /* Điều hướng bằng phím trong nhóm thẻ, giống một nhóm radio. */
    const card = ev.target.closest && ev.target.closest('.cml3-opt');
    if (!card) return;
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    ev.preventDefault();
    const list = Array.from(card.parentElement.querySelectorAll('.cml3-opt'));
    const i = list.indexOf(card);
    const next = list[(i + (ev.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length];
    if (next) next.focus();
  }

  /* Tên hàm phải khác tham số onNext ở trên. Nếu đặt trùng, khai báo
     hàm sẽ che mất callback của app và onNext() gọi lại chính nó. */
  function goNext() {
    try {
      if (typeof engine.setCmlStep === 'function') engine.setCmlStep('cml4');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[cml3] setCmlStep lỗi', err);
    }
    if (typeof onNext === 'function') onNext();
  }

  /* ---------- ảnh linh kiện: load thành công thì ẩn SVG fallback ---------- */
    /* Dùng capture phase vì error/load không bubble. Khi ảnh load xong,
       thêm class .is-art-ready để CSS ẩn SVG và hiện ảnh. Khi ảnh lỗi,
       thêm class .no-art để CSS ẩn ảnh và giữ SVG. */
    root.addEventListener('load', (ev) => {
      if (ev.target && ev.target.classList && ev.target.classList.contains('cml3-opt-img')) {
        const art = ev.target.closest('.cml3-opt-art');
        if (art) art.classList.add('is-art-ready');
      }
    }, true);

    root.addEventListener('error', (ev) => {
      if (ev.target && ev.target.classList && ev.target.classList.contains('cml3-opt-img')) {
        const art = ev.target.closest('.cml3-opt-art');
        if (art) art.classList.add('no-art');
      }
    }, true);

    /* ---------- callout: chú thích quanh tàu ---------- */
    /* Bốn chip ở bốn góc sân khấu, mỗi chip đại diện một nhóm bộ phận.
       Khi bộ phận được lắp, chip sáng đèn xanh và đường dẫn nổi bật. */
    const calloutDefs = [
      { group: 'edl', pos: 'tl', labelKey: 'groupEdl' },
      { group: 'comms', pos: 'tr', labelKey: 'groupComms' },
      { group: 'power', pos: 'bl', labelKey: 'groupPower' },
      { group: 'launcher', pos: 'br', labelKey: 'groupLauncher' },
    ];

    const calloutWrap = document.createElement('div');
    calloutWrap.className = 'cml3-callouts';
    calloutWrap.setAttribute('aria-hidden', 'true');
    calloutDefs.forEach((def) => {
      const el = document.createElement('div');
      el.className = 'cml3-callout';
      el.dataset.pos = def.pos;
      el.dataset.group = def.group;
      el.innerHTML = `
        <span class="cml3-callout-dot"></span>
        <span class="cml3-callout-label">${T(def.labelKey)}</span>
      `;
      calloutWrap.appendChild(el);
    });
    const canvas = q('.cml3-stage-canvas');
    if (canvas) canvas.appendChild(calloutWrap);

    function syncCallouts() {
      const sel = current();
      calloutDefs.forEach((def) => {
        const el = calloutWrap.querySelector(`[data-group="${def.group}"]`);
        if (el) el.classList.toggle('is-on', Boolean(sel[def.group]));
      });
    }

    root.addEventListener('click', onPartClick);
    root.addEventListener('click', onInfoClick);
    root.addEventListener('click', onClose);
    root.addEventListener('keydown', onKey);
  /* Esc phải đóng modal kể cả khi tiêu điểm đã rời khỏi root (ví dụ người
     chơi vừa bấm ra ngoài rồi bấm Esc). Lắng nghe trên document cho phím
     Escape riêng; onKey trên root vẫn giữ cho mũi tên trong nhóm thẻ. */
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const m = q('.cml3-modal');
    if (m && !m.hidden) m.hidden = true;
  });
  q('.cml3-next').addEventListener('click', goNext);

  /* ---------- chữ ---------- */

  function applyStrings() {
    qa('[data-l]').forEach((el) => {
      el.textContent = T(el.getAttribute('data-l'));
    });
    const t = q('#cml3-ship-t');
    if (t) t.textContent = T('stageTitle');
    /* Nhãn bộ phận vẽ trong SVG không dịch được bằng data-l vì SVG
       dùng <text> với toạ độ, nên chỉ dịch phần chú thích ngoài. */
  }

  /* ---------- nạp dữ liệu rồi dựng ---------- */

  function boot(data) {
    DATA = data;
    buildCatalog();
    renderParts();
    renderGaugeShells();
    applyStrings();
    syncShip(false);
    updateGauges();
    const sel = current();
    if (sel.power) showGroupWarn('power', sel.power);
  }

  /* Khung xương hiện ngay, dữ liệu nạp sau cho khỏi trắng màn. */
  renderGaugeShells();
  applyStrings();

  fetch(DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((json) => {
      if (!destroyed) boot(json);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[cml3] không nạp được rescue_modules.json', err);
      if (!destroyed) {
        const box = q('.cml3-parts');
        box.innerHTML = '<p class="cml3-fatal">' + escapeHtml(T('loadErr')) + '</p>';
        /* Giữ thông điệp gốc trên thuộc tính dữ liệu, không in ra
           màn hình: người chơi không cần đọc stack trace, nhưng khi
           gỡ lỗi thì vẫn tra được ngay trong DOM. */
        box.dataset.err = String((err && err.stack) || err);
      }
    });

  /* Đăng ký nghe thay đổi state: bốn thanh đo cập nhật tại chỗ. */
  if (typeof engine.subscribe === 'function') {
    unsubState = engine.subscribe('state:changed', () => {
      if (destroyed) return;
      syncShip(true);
      updateGauges();
    });
  }

  unsubLang = onLangChange(() => {
    applyStrings();
    if (DATA) {
      renderParts();
      renderGaugeShells();
      syncShip(false);
      updateGauges();
    }
  });

  return {
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      if (unsubState) unsubState();
      if (unsubLang) unsubLang();
      root.remove();
    },
  };
}
