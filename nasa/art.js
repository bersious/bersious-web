/* ============================================================
   art.js
   Tranh minh hoạ màn mở đầu.

   >>> KHE ẢNH <<<
   File này có hai nguồn ảnh, theo thứ tự ưu tiên:

     1. PHOTOS bên dưới. Nếu khai báo ảnh thật và ảnh tải được thì dùng ảnh.
     2. Không có ảnh thì quay về tranh SVG vẽ tay.

   Thêm ảnh thật: để file vào src/assets/ rồi khai báo vào PHOTOS:
        'mars-surface': 'assets/mars-surface.jpg',

   Ảnh phải là public domain. Nguồn hợp lệ: images.nasa.gov,
   mars.nasa.gov, Wikimedia Commons với file của NASA.

   Phần SVG giữ lại làm phương án dự phòng khi mạng chậm hoặc ảnh lỗi.
   ============================================================ */

/* ---------- ẢNH THẬT ----------
   Năm ảnh dựng từ ảnh NASA public domain, xem assets/CREDITS.md.
   File nằm trong src/assets/ (thư mục này được deploy thành gốc site).
   Xoá một dòng ở đây thì cảnh đó quay về tranh SVG vẽ tay. */
export const PHOTOS = {
  'mars-surface': 'assets/mars-surface.jpg',
  'storm-coming': 'assets/storm-coming.jpg',
  'storm-impact': 'assets/storm-impact.jpg',
  'departure': 'assets/departure.jpg',
  'awake': 'assets/awake.jpg',
};

/* ---------- SVG VẼ TAY, PHƯƠNG ÁN DỰ PHÒNG ---------- */

const W = 1120;
const H = 520;

/* bộ lọc dùng chung: làm nét vẽ hơi run như bút mực trên giấy */
const DEFS = `
<defs>
  <filter id="wobble" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="g"/>
    <feColorMatrix in="g" type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.1"/></feComponentTransfer>
    <feComposite operator="over" in2="SourceGraphic"/>
  </filter>
  <pattern id="hatch" width="7" height="7" patternTransform="rotate(38)" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="0" y2="7" stroke="#2a1408" stroke-width="1.4" opacity="0.5"/>
  </pattern>
  <pattern id="hatch2" width="5" height="5" patternTransform="rotate(-24)" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="0" y2="5" stroke="#1b0d05" stroke-width="1.1" opacity="0.45"/>
  </pattern>
</defs>`;

const frame = (inner, extra = '') =>
  `<svg class="story-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg" role="img" ${extra}>
     ${DEFS}${inner}
   </svg>`;


/* ---------- 1. bề mặt sao Hỏa, đang đào ---------- */
const marsSurface = frame(`
  <ellipse cx="560" cy="470" rx="720" ry="180" fill="#bd6a31"/>
  <path d="M0 392 Q160 356 300 388 T620 380 T900 396 T1120 372 L1120 520 L0 520Z" fill="#a85a22"/>
  <path d="M0 430 Q220 402 430 436 T820 424 T1120 444 L1120 520 L0 520Z" fill="#89400f"/>

  <!-- hố đào -->
  <ellipse cx="470" cy="466" rx="132" ry="34" fill="#3f1a06"/>
  <ellipse cx="470" cy="460" rx="112" ry="26" fill="#2a1002"/>
  <g filter="url(#wobble)" fill="none" stroke-linecap="round">
    <ellipse cx="470" cy="456" rx="134" ry="35" stroke="#1c0b03" stroke-width="6"/>
    <path d="M350 448 q120 -30 240 0" stroke="#f0b878" stroke-width="3.5" opacity="0.85"/>
  </g>

  <!-- đống đất bên cạnh -->
  <path d="M636 470 q34 -44 76 -6 q26 22 -8 28 q-56 10 -68 -22z" fill="#7a3813" stroke="#33150a" stroke-width="4"/>

  <!-- mặt trời nhỏ, bụi mờ -->
  <circle cx="872" cy="196" r="46" fill="#f5c76a" opacity="0.85"/>
  <circle cx="872" cy="196" r="60" fill="none" stroke="#f5c76a" stroke-width="3" opacity="0.35"/>

  <!-- núi xa -->
  <path d="M700 340 l58 -62 l40 30 l54 -52 l60 84z" fill="#8a4620" opacity="0.85"/>
  <path d="M840 340 l46 -44 l38 44z" fill="#9c5426" opacity="0.7"/>

  <!-- rover -->
  <g transform="translate(760 392)">
    <rect x="0" y="0" width="150" height="52" rx="9" fill="#e8e0d0" stroke="#1c0b03" stroke-width="5"/>
    <rect x="14" y="10" width="52" height="26" rx="4" fill="#5b7fa6" stroke="#33150a" stroke-width="3"/>
    <circle cx="30" cy="60" r="17" fill="#3b3229" stroke="#33150a" stroke-width="4"/>
    <circle cx="80" cy="60" r="17" fill="#3b3229" stroke="#33150a" stroke-width="4"/>
    <circle cx="126" cy="60" r="17" fill="#3b3229" stroke="#33150a" stroke-width="4"/>
    <line x1="122" y1="0" x2="138" y2="-42" stroke="#33150a" stroke-width="4"/>
    <circle cx="140" cy="-46" r="7" fill="#f0c48a" stroke="#33150a" stroke-width="3"/>
  </g>

  <!-- phi hành gia 1: đang cúi đào -->
  <g transform="translate(408 348)" filter="url(#wobble)">
    <path d="M6 96 q-6 -50 26 -62 q34 -12 46 26 q8 26 2 40z" fill="#fbf6ec" stroke="#1c0b03" stroke-width="6"/>
    <circle cx="42" cy="22" r="26" fill="#fbf6ec" stroke="#1c0b03" stroke-width="6"/>
    <path d="M22 20 a20 16 0 0 1 40 0 a20 13 0 0 1 -40 0z" fill="#17334d" stroke="#1c0b03" stroke-width="5"/>
    <path d="M60 60 q34 6 44 34" fill="none" stroke="#33150a" stroke-width="5" stroke-linecap="round"/>
    <rect x="98" y="88" width="34" height="9" rx="4" fill="#89400f" stroke="#33150a" stroke-width="3"/>
  </g>

  <!-- phi hành gia 2: đứng, chỉ tay -->
  <g transform="translate(576 330)" filter="url(#wobble)">
    <path d="M14 34 q22 -14 42 0 l10 74 q-32 12 -62 0z" fill="#fbf6ec" stroke="#1c0b03" stroke-width="6"/>
    <circle cx="35" cy="16" r="23" fill="#fbf6ec" stroke="#1c0b03" stroke-width="6"/>
    <path d="M17 14 a18 14 0 0 1 36 0 a18 12 0 0 1 -36 0z" fill="#17334d" stroke="#1c0b03" stroke-width="5"/>
    <path d="M16 52 q-24 4 -32 -22" fill="none" stroke="#33150a" stroke-width="5" stroke-linecap="round"/>
    <path d="M56 52 q26 8 30 36" fill="none" stroke="#33150a" stroke-width="5" stroke-linecap="round"/>
    <path d="M4 108 h20 M50 108 h20" stroke="#33150a" stroke-width="6" stroke-linecap="round"/>
  </g>

  <!-- phi hành gia 3: ở xa, gần rover, đang ghi chép -->
  <g transform="translate(690 322) scale(.72)" filter="url(#wobble)" opacity="0.92">
    <path d="M14 34 q22 -14 42 0 l8 70 q-30 12 -58 0z" fill="#f4ecdc" stroke="#1c0b03" stroke-width="7"/>
    <circle cx="35" cy="16" r="22" fill="#f4ecdc" stroke="#1c0b03" stroke-width="7"/>
    <path d="M18 14 a17 13 0 0 1 34 0 a17 11 0 0 1 -34 0z" fill="#17334d" stroke="#1c0b03" stroke-width="6"/>
    <path d="M56 54 q22 10 22 34" fill="none" stroke="#33150a" stroke-width="6" stroke-linecap="round"/>
    <path d="M6 104 h22 M46 104 h22" stroke="#33150a" stroke-width="7" stroke-linecap="round"/>
  </g>

  <!-- phi hành gia 4: cúi nhặt mẫu bên mép hố -->
  <g transform="translate(316 352) scale(.66)" filter="url(#wobble)" opacity="0.9">
    <path d="M8 96 q-8 -48 24 -60 q32 -12 44 24 q8 26 2 40z" fill="#f4ecdc" stroke="#1c0b03" stroke-width="7"/>
    <circle cx="42" cy="22" r="24" fill="#f4ecdc" stroke="#1c0b03" stroke-width="7"/>
    <path d="M24 20 a18 14 0 0 1 36 0 a18 12 0 0 1 -36 0z" fill="#17334d" stroke="#1c0b03" stroke-width="6"/>
    <path d="M58 62 q30 8 34 32" fill="none" stroke="#33150a" stroke-width="6" stroke-linecap="round"/>
  </g>

  <!-- gió thổi bụi -->
  <g stroke="#f3d9b0" stroke-width="3" opacity="0.45" fill="none" stroke-linecap="round">
    <path d="M60 300 q60 -14 120 4"/>
    <path d="M96 330 q70 -12 132 8"/>
    <path d="M40 372 q50 -10 96 4"/>
  </g>
`);

/* ---------- 2. bão bụi kéo tới ---------- */
const stormComing = frame(`
  <path d="M0 200 H${W} V${H} H0 Z" fill="#a2581f"/>

  <!-- bức tường bụi -->
  <path d="M-20 520 L-20 150 q90 -70 200 -10 q70 40 60 120 q120 -90 250 -20 q140 70 190 280z"
        fill="#c98a44" opacity="0.95"/>
  <path d="M-20 520 L-20 230 q120 -60 200 10 q60 54 40 120 q160 -80 300 20 q120 86 160 160z"
        fill="#e0aa63" opacity="0.9"/>
  <path d="M-20 520 L-20 320 q150 -40 230 40 q90 78 60 160z" fill="#f0c48a" opacity="0.85"/>

  <!-- cuộn xoáy -->
  <g fill="none" stroke="#8a4a1e" stroke-width="6" opacity="0.55" stroke-linecap="round">
    <path d="M120 260 q90 -60 180 -10 q80 46 40 120"/>
    <path d="M300 200 q120 -50 210 30"/>
    <path d="M420 300 q110 -30 190 40"/>
  </g>

  <!-- cột ăng ten nghiêng -->
  <g transform="translate(824 350) rotate(-9)">
    <rect x="0" y="0" width="10" height="128" fill="#4a2a14" stroke="#33150a" stroke-width="3.5"/>
    <circle cx="5" cy="-6" r="13" fill="#e7decd" stroke="#33150a" stroke-width="4"/>
    <path d="M5 -6 q26 -22 46 -6" fill="none" stroke="#33150a" stroke-width="4"/>
  </g>

  <!-- một phi hành gia chạy về phía tàu -->
  <g transform="translate(646 372)" filter="url(#wobble)">
    <path d="M16 22 q20 -12 38 0 l6 66 q-28 10 -54 0z" fill="#fbf6ec" stroke="#1c0b03" stroke-width="6"/>
    <circle cx="34" cy="6" r="21" fill="#fbf6ec" stroke="#1c0b03" stroke-width="6"/>
    <path d="M17 4 a17 13 0 0 1 34 0 a17 11 0 0 1 -34 0z" fill="#17334d" stroke="#1c0b03" stroke-width="5"/>
    <path d="M14 40 q-26 -2 -30 -26" fill="none" stroke="#33150a" stroke-width="5" stroke-linecap="round"/>
    <path d="M56 42 q22 14 18 40" fill="none" stroke="#33150a" stroke-width="5" stroke-linecap="round"/>
    <path d="M6 92 l-12 22 M46 92 l14 22" stroke="#33150a" stroke-width="6" stroke-linecap="round"/>
  </g>

  <!-- hạt bụi bay -->
  <g fill="#f7dcb4" opacity="0.7">
    <circle cx="180" cy="120" r="3.5"/><circle cx="260" cy="90" r="2.5"/>
    <circle cx="360" cy="150" r="3"/><circle cx="500" cy="110" r="2.5"/>
    <circle cx="620" cy="170" r="3.5"/><circle cx="740" cy="120" r="2.5"/>
    <circle cx="900" cy="180" r="3"/><circle cx="1000" cy="130" r="2.5"/>
    <circle cx="120" cy="220" r="2.5"/><circle cx="430" cy="240" r="3"/>
  </g>
`);

/* ---------- 3. mảnh ốp kim loại va vào ---------- */
const stormImpact = frame(`
  <path d="M0 230 H${W} V${H} H0 Z" fill="#7d3d16"/>

  <!-- bụi dày -->
  <ellipse cx="560" cy="470" rx="760" ry="200" fill="#c08040" opacity="0.55"/>
  <ellipse cx="560" cy="500" rx="700" ry="150" fill="#d99a55" opacity="0.6"/>

  <!-- đường chuyển động của tấm ốp -->
  <path d="M120 60 q240 90 372 190" fill="none" stroke="#f7dcb4" stroke-width="5"
        stroke-linecap="round" stroke-dasharray="26 18" opacity="0.6"/>

  <!-- tấm ốp kim loại -->
  <g transform="translate(500 246) rotate(-28)">
    <path d="M0 0 h118 l22 16 l-22 16 H0 z" fill="#b9b3a6" stroke="#2b1a0c" stroke-width="4.5"/>
    <path d="M0 8 h116" stroke="#6e675c" stroke-width="2.5"/>
    <path d="M18 1 l6 30 M52 1 l6 30 M86 1 l6 30" stroke="#6e675c" stroke-width="2" opacity="0.8"/>
  </g>

  <!-- phi hành gia bị đập, ngã ngửa -->
  <g transform="translate(452 320)" filter="url(#wobble)">
    <path d="M0 40 q22 -18 44 -4 l24 48 q-30 20 -60 6z" fill="#fbf6ec" stroke="#1c0b03" stroke-width="6"/>
    <circle cx="66" cy="26" r="24" fill="#fbf6ec" stroke="#1c0b03" stroke-width="6"/>
    <path d="M48 24 a19 14 0 0 1 38 0 a19 12 0 0 1 -38 0z" fill="#17334d" stroke="#1c0b03" stroke-width="5"/>
    <path d="M4 46 q-28 -12 -34 -34" fill="none" stroke="#33150a" stroke-width="5" stroke-linecap="round"/>
    <path d="M60 66 q26 -6 42 6" fill="none" stroke="#33150a" stroke-width="5" stroke-linecap="round"/>
    <path d="M12 84 l-18 16 M52 84 l18 16" stroke="#33150a" stroke-width="6" stroke-linecap="round"/>
  </g>

  <!-- tia va chạm -->
  <g stroke="#f5c76a" stroke-width="4.5" stroke-linecap="round">
    <path d="M596 268 l40 -26"/>
    <path d="M600 292 l48 -4"/>
    <path d="M592 312 l36 20"/>
  </g>

  <!-- cảnh báo áp suất: vòng tròn đỏ nhấp nháy -->
  <g transform="translate(210 250)">
    <circle r="46" fill="none" stroke="#e04a2a" stroke-width="5" opacity="0.85"/>
    <circle r="30" fill="none" stroke="#e04a2a" stroke-width="3" opacity="0.5"/>
    <path d="M-6 -16 v22 h12 v-22z" fill="#e04a2a"/>
    <circle cx="0" cy="16" r="3.5" fill="#e04a2a"/>
  </g>
`);

/* ---------- 4. tàu rời đi ---------- */
const departure = frame(`
  <path d="M0 300 H${W} V${H} H0 Z" fill="#3a1c0a"/>
  <ellipse cx="560" cy="520" rx="700" ry="160" fill="#89400f" opacity="0.8"/>
  <ellipse cx="560" cy="520" rx="520" ry="110" fill="#bd6a31" opacity="0.55"/>

  <!-- sao -->
  <g fill="#f7e9cf" opacity="0.85">
    <circle cx="120" cy="70" r="2"/><circle cx="250" cy="130" r="1.6"/>
    <circle cx="400" cy="58" r="2.2"/><circle cx="620" cy="96" r="1.7"/>
    <circle cx="800" cy="54" r="2"/><circle cx="980" cy="120" r="1.6"/>
    <circle cx="180" cy="200" r="1.4"/><circle cx="1040" cy="220" r="1.8"/>
  </g>

  <!-- tàu leo lên -->
  <g transform="translate(556 150) rotate(6)" filter="url(#wobble)">
    <path d="M0 96 l24 -96 l24 96 q-24 12 -48 0z" fill="#e7decd" stroke="#2b1a0c" stroke-width="5"/>
    <circle cx="24" cy="58" r="9" fill="#5b7fa6" stroke="#2b1a0c" stroke-width="3.5"/>
    <path d="M0 96 l-20 34 q44 16 88 0 l-20 -34" fill="#c9c0b1" stroke="#2b1a0c" stroke-width="4"/>
  </g>

  <!-- khói/plume -->
  <path d="M534 296 q26 46 26 92 q0 -46 26 -92" fill="#f0c48a" opacity="0.8"/>
  <path d="M544 300 q16 40 16 74 q0 -34 16 -74" fill="#fff2d6" opacity="0.9"/>
  <g fill="#f0c48a" opacity="0.45">
    <ellipse cx="560" cy="430" rx="120" ry="40"/>
    <ellipse cx="560" cy="470" rx="180" ry="46"/>
  </g>

  <!-- vệt bay -->
  <path d="M560 400 q6 60 -4 108" stroke="#fff2d6" stroke-width="3" opacity="0.4" fill="none"/>

  <!-- trên mặt đất: một người nằm, nhìn lên (nhân vật chính, chưa biết còn sống) -->
  <g transform="translate(180 402)" filter="url(#wobble)" opacity="0.9">
    <path d="M0 30 q26 -12 52 0 l8 20 q-34 12 -62 0z" fill="#efe6d6" stroke="#2b1a0c" stroke-width="4.5"/>
    <circle cx="62" cy="24" r="18" fill="#efe6d6" stroke="#2b1a0c" stroke-width="4.5"/>
    <path d="M48 22 a14 10 0 0 1 28 0 a14 9 0 0 1 -28 0z" fill="#2f4a63" stroke="#2b1a0c" stroke-width="3.5"/>
  </g>
`);

/* ---------- 5. tỉnh dậy trong khoang ---------- */
const awake = frame(`
  <rect x="0" y="0" width="${W}" height="${H}" fill="#160d07"/>

  <!-- thành khoang hình vòm -->
  <path d="M60 520 q0 -400 500 -400 q500 0 500 400z" fill="#241509" stroke="#3d2410" stroke-width="6"/>
  <path d="M96 520 q0 -360 464 -360 q464 0 464 360z" fill="#1d1108" stroke="#33200f" stroke-width="4"/>

  <!-- khung vách -->
  <g stroke="#3d2410" stroke-width="5" opacity="0.9">
    <path d="M300 520 q10 -260 260 -290"/>
    <path d="M820 520 q-10 -260 -260 -290"/>
  </g>

  <!-- đèn khẩn cấp nhấp nháy -->
  <g transform="translate(560 128)">
    <circle r="34" fill="#e04a2a" opacity="0.22"/>
    <circle r="17" fill="#ff6a3d"/>
    <circle r="17" fill="none" stroke="#ffb07a" stroke-width="3" opacity="0.7"/>
  </g>
  <path d="M560 162 l-120 260 h240z" fill="#ff6a3d" opacity="0.07"/>

  <!-- giường/người nằm -->
  <g transform="translate(392 372)" filter="url(#wobble)">
    <rect x="-10" y="66" width="300" height="26" rx="8" fill="#33200f" stroke="#2b1a0c" stroke-width="4"/>
    <path d="M6 62 q40 -22 84 -6 l110 4 q26 8 20 12 H6z" fill="#efe6d6" stroke="#2b1a0c" stroke-width="4.5"/>
    <circle cx="52" cy="34" r="24" fill="#efe6d6" stroke="#2b1a0c" stroke-width="4.5"/>
    <path d="M36 32 a17 12 0 0 1 34 0 a17 10 0 0 1 -34 0z" fill="#2f4a63" stroke="#2b1a0c" stroke-width="3.5"/>
    <path d="M96 52 q56 -6 112 6" fill="none" stroke="#2b1a0c" stroke-width="4" stroke-linecap="round"/>
  </g>

  <!-- mặt bàn, màn hình tối -->
  <g transform="translate(806 330)">
    <rect x="0" y="0" width="150" height="96" rx="7" fill="#0d0906" stroke="#3d2410" stroke-width="4"/>
    <path d="M18 30 h60 M18 48 h40 M18 66 h52" stroke="#3d2410" stroke-width="3" stroke-linecap="round"/>
    <rect x="56" y="96" width="38" height="16" fill="#33200f"/>
    <rect x="30" y="112" width="90" height="9" rx="4" fill="#33200f"/>
  </g>

  <!-- bụi lơ lửng trong tia sáng -->
  <g fill="#f0c48a" opacity="0.5">
    <circle cx="470" cy="210" r="2.2"/><circle cx="620" cy="250" r="1.8"/>
    <circle cx="540" cy="300" r="2"/><circle cx="700" cy="200" r="1.6"/>
    <circle cx="430" cy="272" r="1.7"/><circle cx="660" cy="318" r="2.1"/>
  </g>
`);

/* ---------- 6. nhà ngoại ô Trái Đất, đêm trước ngày đi ---------- */
const earthHome = frame(`
  <defs>
    <linearGradient id="ehSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#080f1d"/>
      <stop offset="0.55" stop-color="#122238"/>
      <stop offset="1" stop-color="#1b3050"/>
    </linearGradient>
    <radialGradient id="ehMoon" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#f0ead2" stop-opacity="0.34"/>
      <stop offset="0.45" stop-color="#f0ead2" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#f0ead2" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ehSpill" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#f6c96f" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#f6c96f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ehDoor" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#f0b45c" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#f0b45c" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- trời đêm, chuyển màu mềm -->
  <rect x="0" y="0" width="1120" height="520" fill="url(#ehSky)"/>

  <!-- sao đêm -->
  <g fill="#dfe8f5" opacity="0.9">
    <circle cx="90" cy="60" r="2.2"/><circle cx="180" cy="112" r="1.6"/>
    <circle cx="268" cy="48" r="1.9"/><circle cx="352" cy="140" r="1.5"/>
    <circle cx="452" cy="70" r="2"/><circle cx="540" cy="126" r="1.5"/>
    <circle cx="620" cy="42" r="1.8"/><circle cx="742" cy="104" r="1.6"/>
    <circle cx="1010" cy="70" r="2"/><circle cx="1064" cy="160" r="1.5"/>
    <circle cx="120" cy="190" r="1.5"/><circle cx="330" cy="212" r="1.4"/>
    <circle cx="700" cy="196" r="1.5"/><circle cx="880" cy="236" r="1.4"/>
  </g>
  <g fill="#a9bcd8" opacity="0.55">
    <circle cx="220" cy="80" r="1"/><circle cx="410" cy="106" r="1"/>
    <circle cx="600" cy="86" r="1"/><circle cx="820" cy="150" r="1"/>
    <circle cx="960" cy="120" r="1"/><circle cx="60" cy="150" r="1"/>
    <circle cx="500" cy="198" r="1"/><circle cx="1050" cy="240" r="1"/>
  </g>

  <!-- trăng, có quầng sáng thật -->
  <ellipse cx="884" cy="118" rx="190" ry="180" fill="url(#ehMoon)"/>
  <circle cx="884" cy="118" r="50" fill="#ece4c4" stroke="#1c0b03" stroke-width="4"/>
  <g fill="#d8cfae" opacity="0.85">
    <circle cx="868" cy="102" r="9"/><circle cx="900" cy="128" r="12"/>
    <circle cx="870" cy="140" r="6"/>
  </g>

  <!-- rặng cây xa hai bên -->
  <path d="M0 386 q70 -44 140 -8 q60 32 120 -4 q70 -40 140 2 l0 46 H0 Z" fill="#0a1320"/>
  <path d="M1120 376 q-80 -46 -160 -6 q-64 34 -130 -2 l0 50 H1120 Z" fill="#0a1320"/>

  <!-- thảm cỏ, mặt đất nhận ánh trăng lạnh rất nhẹ -->
  <path d="M0 412 Q280 396 560 410 T1120 402 L1120 520 L0 520 Z" fill="#0f1b28"/>
  <path d="M0 452 Q300 438 620 452 T1120 446 L1120 520 L0 520 Z" fill="#0a1420"/>
  <ellipse cx="960" cy="452" rx="230" ry="54" fill="#3d5372" opacity="0.10"/>

  <!-- bóng ngôi nhà đổ sang trái, vì trăng ở bên phải -->
  <path d="M336 430 L360 430 L212 486 L118 486 Z" fill="#050a12" opacity="0.75"/>
  <ellipse cx="562" cy="430" rx="250" ry="16" fill="#050a12" opacity="0.55"/>

  <!-- vệt sáng ấm hắt xuống sân từ hai cửa sổ và cửa ra vào -->
  <ellipse cx="431" cy="440" rx="120" ry="26" fill="url(#ehSpill)"/>
  <ellipse cx="565" cy="440" rx="120" ry="26" fill="url(#ehSpill)"/>
  <ellipse cx="689" cy="448" rx="110" ry="30" fill="url(#ehDoor)"/>

  <!-- ống khói -->
  <rect x="700" y="176" width="38" height="80" fill="#232d40" stroke="#1c0b03" stroke-width="5"/>
  <path d="M738 196 v-18 h6 v18 Z" fill="#2f3b52"/>

  <!-- mái nhà -->
  <path d="M296 268 L562 146 L828 268 Z" fill="#1d2739" stroke="#1c0b03" stroke-width="6"/>
  <path d="M562 146 L828 268 L790 268 L562 162 Z" fill="#33415c" opacity="0.85"/>
  <!-- viền trăng trên mái phải -->
  <path d="M600 168 L822 262" stroke="#cfd8e8" stroke-width="3" opacity="0.55" fill="none"/>
  <!-- thân nhà -->
  <rect x="336" y="262" width="452" height="166" fill="#35415a" stroke="#1c0b03" stroke-width="6"/>
  <!-- viền trăng trên mép phải thân nhà -->
  <path d="M786 272 V424" stroke="#cfd8e8" stroke-width="3.5" opacity="0.5" fill="none"/>

  <!-- cửa sổ trái, có bóng người -->
  <rect x="384" y="294" width="94" height="76" fill="#f6c96f" stroke="#1c0b03" stroke-width="5"/>
  <g fill="#2a1a0d">
    <circle cx="436" cy="330" r="13"/>
    <path d="M420 366 q4 -24 16 -24 q14 0 17 24z"/>
  </g>
  <path d="M431 294 v76 M384 332 h94" stroke="#1c0b03" stroke-width="3.5" opacity="0.7"/>

  <!-- cửa sổ phải, sáng ấm -->
  <rect x="518" y="294" width="94" height="76" fill="#f0bd60" stroke="#1c0b03" stroke-width="5"/>
  <path d="M565 294 v76 M518 332 h94" stroke="#1c0b03" stroke-width="3.5" opacity="0.7"/>

  <!-- cửa ra vào -->
  <rect x="652" y="300" width="74" height="128" fill="#c98a3c" stroke="#1c0b03" stroke-width="5"/>
  <circle cx="714" cy="366" r="4.5" fill="#1c0b03"/>
  <rect x="642" y="424" width="94" height="10" rx="3" fill="#2a3448" stroke="#1c0b03" stroke-width="4"/>

  <!-- đèn hiên, để nguồn sáng ấm có lý -->
  <ellipse cx="689" cy="300" rx="54" ry="40" fill="url(#ehDoor)"/>
  <circle cx="689" cy="286" r="7" fill="#f8d78a" stroke="#1c0b03" stroke-width="3"/>

  <!-- lối đi -->
  <path d="M660 430 L724 430 L788 520 L588 520 Z" fill="#182636"/>
  <path d="M684 436 L706 436 L742 520 L620 520 Z" fill="#20303f" opacity="0.75"/>

  <!-- hàng rào bên trái -->
  <g stroke="#0b1421" stroke-width="6" stroke-linecap="round">
    <path d="M40 448 H280"/>
    <path d="M56 448 v-70 M116 448 v-70 M176 448 v-70 M236 448 v-70"/>
  </g>
  <g stroke="#16233a" stroke-width="3" opacity="0.7">
    <path d="M40 404 H280"/>
  </g>
  <!-- bóng hàng rào đổ sang trái -->
  <g stroke="#050a12" stroke-width="5" opacity="0.6" stroke-linecap="round">
    <path d="M56 450 l-26 16 M116 450 l-26 16 M176 450 l-26 16 M236 450 l-26 16"/>
  </g>

  <!-- hòm thư, dịu màu và có bóng tiếp xúc -->
  <ellipse cx="258" cy="470" rx="30" ry="7" fill="#050a12" opacity="0.7"/>
  <g transform="translate(258 392)">
    <rect x="-10" y="34" width="9" height="44" fill="#2a3448" stroke="#1c0b03" stroke-width="3"/>
    <rect x="-22" y="0" width="44" height="36" rx="8" fill="#8f4a2e" stroke="#1c0b03" stroke-width="4"/>
    <path d="M-14 12 h28" stroke="#1c0b03" stroke-width="3"/>
  </g>
`);

/* ---------- 7. tạm biệt gia đình ở hành lang ---------- */
const farewell = frame(`
  <defs>
    <linearGradient id="fwDoor" x1="0.1" y1="0" x2="0.5" y2="1">
      <stop offset="0" stop-color="#f6cb85"/>
      <stop offset="0.55" stop-color="#e6ab5c"/>
      <stop offset="1" stop-color="#b87a3c"/>
    </linearGradient>
    <linearGradient id="fwBeam" x1="0.15" y1="0" x2="0.75" y2="1">
      <stop offset="0" stop-color="#f6c96f" stop-opacity="0.40"/>
      <stop offset="1" stop-color="#f6c96f" stop-opacity="0.02"/>
    </linearGradient>
    <radialGradient id="fwWall" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#96622f" stop-opacity="0.9"/>
      <stop offset="0.6" stop-color="#96622f" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#96622f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fwLamp" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffdca0" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffdca0" stop-opacity="0"/>
    </radialGradient>
    <!-- ánh sáng ấm rọi lên mặt phía gần nguồn -->
    <linearGradient id="fwLitL" x1="0" y1="0.2" x2="1" y2="0.8">
      <stop offset="0" stop-color="#ffd9a0" stop-opacity="0.62"/>
      <stop offset="0.5" stop-color="#ffd9a0" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fwLitR" x1="1" y1="0.2" x2="0" y2="0.8">
      <stop offset="0" stop-color="#ffdcaa" stop-opacity="0.66"/>
      <stop offset="0.5" stop-color="#ffdcaa" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffdcaa" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- ===== vỏ cảnh: tường, ốp chân tường, sàn ===== -->
  <rect x="0" y="0" width="1120" height="520" fill="#2b1a11"/>
  <rect x="0" y="0" width="1120" height="360" fill="#3a2418"/>
  <g stroke="#291810" stroke-width="3" opacity="0.6">
    <path d="M0 100 H1120 M0 210 H1120"/>
    <path d="M300 0 V360 M760 0 V360 M980 0 V360"/>
  </g>
  <!-- tường ngay sau đầu nhân vật được nâng sáng, để hình người tách khỏi nền -->
  <ellipse cx="530" cy="290" rx="410" ry="205" fill="url(#fwWall)"/>
  <rect x="0" y="358" width="1120" height="16" fill="#452b19" stroke="#1c0b03" stroke-width="3"/>
  <path d="M0 374 H1120" stroke="#140b06" stroke-width="7"/>
  <rect x="0" y="374" width="1120" height="146" fill="#241511"/>
  <g stroke="#1a0e08" stroke-width="3" opacity="0.8">
    <path d="M530 374 L140 520 M530 374 L330 520 M530 374 L760 520 M530 374 L1010 520"/>
    <path d="M0 410 H1120 M0 452 H1120 M0 496 H1120"/>
  </g>

  <!-- ===== ảnh gia đình treo tường, gần nhóm nhân vật ===== -->
  <g transform="translate(812 232)">
    <rect x="0" y="0" width="118" height="88" rx="3" fill="#241511" stroke="#1c0b03" stroke-width="4"/>
    <rect x="9" y="9" width="100" height="70" fill="#7a4e2a"/>
    <rect x="9" y="46" width="100" height="33" fill="#5e3a1e"/>
    <g fill="#2a1710">
      <circle cx="34" cy="32" r="8"/><path d="M24 46 q3 -14 10 -14 q8 0 10 14z"/>
      <circle cx="64" cy="30" r="8"/><path d="M54 44 q3 -14 10 -14 q8 0 10 14z"/>
      <circle cx="90" cy="36" r="6"/><path d="M82 48 q3 -11 8 -11 q6 0 8 11z"/>
    </g>
    <path d="M56 0 v-12" stroke="#1c0b03" stroke-width="3"/>
  </g>

  <!-- ===== đèn tường bên phải: nguồn sáng phụ, cho viền sáng phải ===== -->
  <ellipse cx="1012" cy="196" rx="96" ry="86" fill="url(#fwLamp)"/>
  <path d="M994 166 h36 l-8 -20 h-20 Z" fill="#5c3d24" stroke="#1c0b03" stroke-width="3.5"/>
  <circle cx="1012" cy="176" r="8" fill="#f8d78a" stroke="#1c0b03" stroke-width="3"/>

  <!-- ===== ô cửa mở bên trái: nhỏ hơn, sáng dịu ===== -->
  <rect x="50" y="156" width="140" height="216" fill="url(#fwDoor)"/>
  <!-- khung cửa có độ dày -->
  <rect x="44" y="150" width="152" height="222" fill="none" stroke="#1c0b03" stroke-width="9"/>
  <path d="M196 150 L216 158 V374 H196 Z" fill="#5e3e26" stroke="#1c0b03" stroke-width="4"/>
  <path d="M44 142 H216 V156 H44 Z" fill="#6b4a2c" stroke="#1c0b03" stroke-width="4"/>
  <!-- cánh cửa mở vào trong -->
  <path d="M50 156 L98 168 V372 H50 Z" fill="#a97544" stroke="#1c0b03" stroke-width="4"/>
  <circle cx="92" cy="268" r="3.5" fill="#3a2313"/>

  <!-- ===== vệt sáng từ cửa tràn xuống sàn ===== -->
  <path d="M50 372 L196 372 L400 520 L104 520 Z" fill="url(#fwBeam)"/>
  <ellipse cx="150" cy="398" rx="118" ry="24" fill="#f6c96f" opacity="0.16"/>

  <!-- ===== bóng nhân vật đổ chéo sang phải, tránh xa cửa ===== -->
  <g fill="#150b06" opacity="0.55">
    <path d="M298 462 L362 462 L404 486 L332 486 Z"/>
    <path d="M378 462 L452 462 L556 500 L448 496 Z"/>
    <path d="M556 462 L640 462 L748 502 L636 498 Z"/>
    <path d="M692 462 L742 462 L806 492 L728 490 Z"/>
  </g>
  <!-- bóng tiếp xúc sát chân, neo nhân vật xuống sàn -->
  <g fill="#0d0603" opacity="0.85">
    <ellipse cx="408" cy="464" rx="52" ry="9"/>
    <ellipse cx="580" cy="464" rx="54" ry="9"/>
    <ellipse cx="716" cy="462" rx="36" ry="7"/>
    <ellipse cx="330" cy="464" rx="42" ry="8"/>
  </g>

  <!-- ===== NGƯỜI RA ĐI (bên trái, quay sang phải) ===== -->
  <g filter="url(#wobble)">
    <!-- ba lô sau lưng, đọc rõ -->
    <path d="M344 386 q-8 -74 10 -84 q30 -12 46 4 q12 12 8 80 Z"
          fill="#6f5a3f" stroke="#1c0b03" stroke-width="5"/>
    <path d="M347 320 q30 -16 56 0" fill="none" stroke="#1c0b03" stroke-width="4"/>
    <rect x="368" y="352" width="14" height="10" rx="2" fill="#3a2a18" stroke="#1c0b03" stroke-width="3"/>

    <!-- cổ -->
    <rect x="406" y="286" width="20" height="24" fill="#c98a5e" stroke="#1c0b03" stroke-width="4"/>
    <!-- thân áo khoác: vai rõ -->
    <path d="M386 306 Q417 291 448 306 L458 392 Q417 404 376 392 Z"
          fill="#2c3a4a" stroke="#1c0b03" stroke-width="5"/>
    <!-- dây ba lô trên ngực -->
    <path d="M402 304 L408 356 M434 304 L426 356" stroke="#54677e" stroke-width="7" stroke-linecap="round"/>
    <path d="M414 392 V404" stroke="#1c0b03" stroke-width="4"/>

    <!-- đầu + tóc + nét mặt tối giản -->
    <ellipse cx="417" cy="262" rx="27" ry="30" fill="#d99b6e" stroke="#1c0b03" stroke-width="5"/>
    <path d="M390 254 q2 -32 27 -32 q25 0 27 30 q-11 -15 -27 -15 q-17 0 -27 17 Z"
          fill="#2a1710" stroke="#1c0b03" stroke-width="4"/>
    <path d="M444 257 l8 8 l-8 6 Z" fill="#c98a5e" stroke="#1c0b03" stroke-width="2.5"/>
    <circle cx="430" cy="258" r="2.6" fill="#1c0b03"/>

    <!-- chân -->
    <g fill="none" stroke-linecap="round">
      <path d="M401 388 L396 450" stroke="#1c0b03" stroke-width="20"/>
      <path d="M401 388 L396 450" stroke="#241a14" stroke-width="14"/>
      <path d="M433 388 L437 450" stroke="#1c0b03" stroke-width="20"/>
      <path d="M433 388 L437 450" stroke="#241a14" stroke-width="14"/>
    </g>
    <!-- ủng, mũi giày hướng sang phải, đế chạm đất -->
    <path d="M378 446 h28 l26 12 q5 4 -2 4 h-48 q-5 0 -4 -4 Z" fill="#1c0b03"/>
    <path d="M410 446 h28 l26 12 q5 4 -2 4 h-48 q-5 0 -4 -4 Z" fill="#1c0b03"/>
    <path d="M382 452 h24 M414 452 h24" stroke="#4a3a2c" stroke-width="2.5"/>

    <!-- tay trái: cầm quai túi -->
    <g fill="none" stroke-linecap="round">
      <path d="M392 312 Q362 344 330 390" stroke="#1c0b03" stroke-width="22"/>
      <path d="M392 312 Q362 344 330 390" stroke="#2c3a4a" stroke-width="16"/>
    </g>
    <!-- tay phải: vươn sang nắm tay người thân -->
    <g fill="none" stroke-linecap="round">
      <path d="M446 310 Q486 300 506 326" stroke="#1c0b03" stroke-width="22"/>
      <path d="M446 310 Q486 300 506 326" stroke="#2c3a4a" stroke-width="16"/>
    </g>

    <!-- ánh sáng ấm hắt lên vai và mặt phía cửa -->
    <path d="M388 306 Q380 350 379 390" stroke="#f6c96f" stroke-width="4" opacity="0.45" fill="none"/>
    <path d="M394 248 q-8 12 -4 26" stroke="#fbe7bd" stroke-width="3" opacity="0.55" fill="none"/>
    <path d="M417 291 q14 4 22 12" stroke="#f6c96f" stroke-width="3" opacity="0.3" fill="none"/>
    <!-- lớp sáng ấm phủ nửa trái thân + đầu (phía cửa) -->
    <path d="M386 306 Q417 291 448 306 L452 336 Q412 322 380 338 Z" fill="url(#fwLitL)"/>
    <path d="M392 236 a27 30 0 0 1 26 -4 q-14 10 -20 30 q-8 -12 -6 -26 Z" fill="url(#fwLitL)"/>
  </g>

  <!-- ===== TÚI XÁCH, có bàn tay cầm quai ===== -->
  <g>
    <path d="M308 414 q18 -22 36 0" fill="none" stroke="#1c0b03" stroke-width="5"/>
    <rect x="296" y="410" width="70" height="52" rx="8" fill="#4d6480" stroke="#1c0b03" stroke-width="5"/>
    <path d="M296 428 h70" stroke="#1c0b03" stroke-width="3.5"/>
    <circle cx="360" cy="436" r="3.5" fill="#1c0b03"/>
    <!-- bàn tay nắm quai -->
    <ellipse cx="326" cy="400" rx="12" ry="10" fill="#d99b6e" stroke="#1c0b03" stroke-width="4"/>
    <path d="M318 396 q8 5 16 0 M318 403 q8 5 16 0" stroke="#b97c50" stroke-width="2.4" fill="none"/>
  </g>

  <!-- ===== NGƯỜI Ở LẠI (giữa, quay sang trái) ===== -->
  <g filter="url(#wobble)">
    <rect x="588" y="286" width="20" height="26" fill="#c98a5e" stroke="#1c0b03" stroke-width="4"/>
    <path d="M566 302 Q598 288 630 302 L648 398 Q598 412 548 398 Z"
          fill="#b5623c" stroke="#1c0b03" stroke-width="5"/>
    <!-- khăn quàng -->
    <path d="M574 296 q24 12 50 0 q-4 14 -25 16 q-21 -2 -25 -16 Z"
          fill="#8a4a24" stroke="#1c0b03" stroke-width="3.5"/>

    <!-- đầu, tóc dài hơn -->
    <ellipse cx="598" cy="262" rx="27" ry="30" fill="#d99b6e" stroke="#1c0b03" stroke-width="5"/>
    <path d="M571 264 q-2 -38 27 -38 q29 0 28 36 q-6 -19 -13 -23 q-15 -8 -27 -2 q-12 6 -15 27 Z"
          fill="#2a1710" stroke="#1c0b03" stroke-width="4"/>
    <path d="M622 248 q12 24 4 46 q-10 -22 -8 -46 Z" fill="#2a1710" stroke="#1c0b03" stroke-width="3"/>
    <path d="M570 257 l-8 8 l8 6 Z" fill="#c98a5e" stroke="#1c0b03" stroke-width="2.5"/>
    <circle cx="584" cy="258" r="2.6" fill="#1c0b03"/>

    <!-- chân -->
    <g fill="none" stroke-linecap="round">
      <path d="M578 396 L570 450" stroke="#1c0b03" stroke-width="20"/>
      <path d="M578 396 L570 450" stroke="#38241a" stroke-width="14"/>
      <path d="M614 396 L622 450" stroke="#1c0b03" stroke-width="20"/>
      <path d="M614 396 L622 450" stroke="#38241a" stroke-width="14"/>
    </g>
    <!-- giày, mũi hướng sang trái -->
    <path d="M594 446 h-28 l-26 12 q-5 4 2 4 h48 q5 0 4 -4 Z" fill="#1c0b03"/>
    <path d="M562 446 h-28 l-26 12 q-5 4 2 4 h48 q5 0 4 -4 Z" fill="#1c0b03"/>
    <path d="M590 452 h-24 M558 452 h-24" stroke="#4a3a2c" stroke-width="2.5"/>

    <!-- tay trái vươn sang nắm tay người ra đi -->
    <g fill="none" stroke-linecap="round">
      <path d="M566 308 Q540 300 522 328" stroke="#1c0b03" stroke-width="21"/>
      <path d="M566 308 Q540 300 522 328" stroke="#b5623c" stroke-width="15"/>
    </g>
    <!-- tay phải đưa xuống nắm tay con -->
    <g fill="none" stroke-linecap="round">
      <path d="M634 312 Q664 348 674 380" stroke="#1c0b03" stroke-width="21"/>
      <path d="M634 312 Q664 348 674 380" stroke="#b5623c" stroke-width="15"/>
    </g>

    <!-- ánh sáng ấm: vai trái bắt sáng, viền sáng bên phải -->
    <path d="M568 302 Q558 350 550 396" stroke="#f6c96f" stroke-width="4.5" opacity="0.5" fill="none"/>
    <path d="M576 244 q-9 14 -5 30" stroke="#fbe7bd" stroke-width="3" opacity="0.6" fill="none"/>
    <path d="M646 322 Q652 360 650 396" stroke="#f7d9a8" stroke-width="3" opacity="0.55" fill="none"/>
    <path d="M622 240 q8 20 5 34" stroke="#f7d9a8" stroke-width="2.5" opacity="0.5" fill="none"/>
    <!-- lớp sáng ấm phía trái (về cửa) -->
    <path d="M566 302 Q598 288 630 302 L636 330 Q598 316 560 334 Z" fill="url(#fwLitL)"/>
    <path d="M572 234 a27 30 0 0 1 26 -2 q-16 12 -22 32 q-8 -13 -4 -30 Z" fill="url(#fwLitL)"/>
    <!-- viền sáng ấm đậm hơn ở mép phải: đèn tường bên phải rọi vào -->
    <path d="M648 306 Q656 352 652 398" stroke="#ffdcaa" stroke-width="6" opacity="0.85" fill="none" stroke-linecap="round"/>
    <path d="M626 234 q10 22 6 42" stroke="#ffdcaa" stroke-width="4.5" opacity="0.8" fill="none" stroke-linecap="round"/>
    <path d="M668 350 q8 22 4 40" stroke="#ffdcaa" stroke-width="4" opacity="0.6" fill="none" stroke-linecap="round"/>
  </g>

  <!-- ===== ĐỨA TRẺ (bên phải, quay sang trái) ===== -->
  <g filter="url(#wobble)">
    <rect x="710" y="346" width="14" height="18" fill="#e0a97c" stroke="#1c0b03" stroke-width="3.5"/>
    <path d="M698 358 Q716 350 734 358 L740 422 Q716 430 692 422 Z"
          fill="#4f6f96" stroke="#1c0b03" stroke-width="5"/>
    <!-- khăn quàng -->
    <path d="M700 352 q16 9 32 0 q-2 11 -16 13 q-14 -2 -16 -13 Z"
          fill="#c2553a" stroke="#1c0b03" stroke-width="3.5"/>

    <!-- đầu + mũ len -->
    <ellipse cx="716" cy="338" rx="20" ry="22" fill="#e2b184" stroke="#1c0b03" stroke-width="5"/>
    <path d="M696 332 q2 -26 20 -26 q18 0 20 26 q-20 -10 -40 0 Z"
          fill="#c2553a" stroke="#1c0b03" stroke-width="4"/>
    <circle cx="716" cy="304" r="6" fill="#e8b06a" stroke="#1c0b03" stroke-width="3"/>
    <path d="M695 336 l-6 6 l6 5 Z" fill="#c98a5e" stroke="#1c0b03" stroke-width="2.2"/>
    <circle cx="705" cy="336" r="2.2" fill="#1c0b03"/>

    <!-- chân -->
    <g fill="none" stroke-linecap="round">
      <path d="M708 422 L704 450" stroke="#1c0b03" stroke-width="16"/>
      <path d="M708 422 L704 450" stroke="#2f4257" stroke-width="11"/>
      <path d="M726 422 L730 450" stroke="#1c0b03" stroke-width="16"/>
      <path d="M726 422 L730 450" stroke="#2f4257" stroke-width="11"/>
    </g>
    <path d="M714 446 h-22 l-20 10 q-4 4 2 4 h40 q4 0 3 -4 Z" fill="#1c0b03"/>
    <path d="M740 446 h-22 l-20 10 q-4 4 2 4 h40 q4 0 3 -4 Z" fill="#1c0b03"/>
    <path d="M708 452 h-16 M734 452 h-16" stroke="#4a3a2c" stroke-width="2.2"/>

    <!-- tay trái vươn lên nắm tay mẹ -->
    <g fill="none" stroke-linecap="round">
      <path d="M700 362 Q690 374 682 384" stroke="#1c0b03" stroke-width="17"/>
      <path d="M700 362 Q690 374 682 384" stroke="#4f6f96" stroke-width="11"/>
    </g>
    <!-- tay phải buông xuống, có bàn tay -->
    <g fill="none" stroke-linecap="round">
      <path d="M734 364 Q744 386 742 404" stroke="#1c0b03" stroke-width="15"/>
      <path d="M734 364 Q744 386 742 404" stroke="#4f6f96" stroke-width="10"/>
    </g>
    <ellipse cx="742" cy="408" rx="7.5" ry="8" fill="#e2b184" stroke="#1c0b03" stroke-width="3.5"/>

    <!-- ánh sáng: vai trái bắt sáng, viền phải -->
    <path d="M700 358 Q692 390 692 420" stroke="#f6c96f" stroke-width="3.5" opacity="0.45" fill="none"/>
    <path d="M736 344 q4 16 2 26" stroke="#f7d9a8" stroke-width="2.5" opacity="0.5" fill="none"/>
    <path d="M702 358 Q716 350 734 358 L736 382 Q716 374 698 384 Z" fill="url(#fwLitL)"/>
    <!-- viền sáng ấm mép phải đứa trẻ -->
    <path d="M740 360 Q746 392 741 424" stroke="#ffdcaa" stroke-width="5" opacity="0.8" fill="none" stroke-linecap="round"/>
    <path d="M736 318 q6 14 3 24" stroke="#ffdcaa" stroke-width="4" opacity="0.75" fill="none" stroke-linecap="round"/>
  </g>

  <!-- ===== HAI ĐIỂM NẮM TAY, mỗi điểm là một khối liền ===== -->
  <g>
    <!-- tay người ra đi + tay người ở lại: một nắm to, đọc rõ là nắm -->
    <ellipse cx="514" cy="328" rx="24" ry="18" transform="rotate(-14 514 328)"
             fill="#cf9064" stroke="#1c0b03" stroke-width="5"/>
    <!-- mu bàn tay trên, chồng lên, sáng hơn vì hứng ánh cửa -->
    <ellipse cx="509" cy="323" rx="15" ry="11" transform="rotate(-18 509 323)"
             fill="#e6aa7b" stroke="#1c0b03" stroke-width="3.5"/>
    <path d="M499 317 q11 7 22 1 M499 326 q11 7 21 1 M500 334 q10 6 19 1"
          stroke="#b97c50" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <!-- ngón cái vòng qua -->
    <path d="M524 316 q10 8 4 18" stroke="#e6aa7b" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M524 316 q10 8 4 18" stroke="#1c0b03" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>
    <!-- tay mẹ + tay con: một nắm nhỏ -->
    <ellipse cx="679" cy="386" rx="15" ry="12" transform="rotate(-16 679 386)"
             fill="#d29a6e" stroke="#1c0b03" stroke-width="4.5"/>
    <ellipse cx="675" cy="382" rx="9" ry="7" transform="rotate(-18 675 382)"
             fill="#e6aa7b" stroke="#1c0b03" stroke-width="3"/>
    <path d="M669 378 q8 5 15 1 M670 386 q7 4 13 1" stroke="#c98a5e" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </g>
`);

/* ---------- 8. bệ phóng lúc chạng vạng ---------- */
const launchpad = frame(`
  <defs>
    <linearGradient id="lpSky" x1="0.2" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#0a1226"/>
      <stop offset="0.24" stop-color="#1b1d40"/>
      <stop offset="0.46" stop-color="#3b2a52"/>
      <stop offset="0.65" stop-color="#6b3a52"/>
      <stop offset="0.82" stop-color="#a3563c"/>
      <stop offset="1" stop-color="#d3854e"/>
    </linearGradient>
    <radialGradient id="lpSun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffcf8a" stop-opacity="0.75"/>
      <stop offset="0.45" stop-color="#f0a35e" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#f0a35e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="lpBody" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6f6350"/>
      <stop offset="0.34" stop-color="#a4977e"/>
      <stop offset="0.72" stop-color="#cfc3ad"/>
      <stop offset="1" stop-color="#f2ddb4"/>
    </linearGradient>
    <linearGradient id="lpDeck" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c142e"/>
      <stop offset="0.65" stop-color="#2a1f42"/>
      <stop offset="1" stop-color="#4a3557"/>
    </linearGradient>
  </defs>

  <!-- ===== trời chạng vạng: một dải chuyển màu mềm, không còn vạch bậc ===== -->
  <rect x="0" y="0" width="1120" height="520" fill="url(#lpSky)"/>
  <!-- vầng mặt trời vừa lặn, lệch phải: nguồn sáng duy nhất của cảnh -->
  <ellipse cx="1128" cy="404" rx="440" ry="300" fill="url(#lpSun)"/>
  <ellipse cx="1120" cy="392" rx="150" ry="26" fill="#ffd79a" opacity="0.55"/>

  <!-- sao, chỉ ở phần trời tối phía trên và mờ dần xuống -->
  <g fill="#e8ecf7">
    <circle cx="120" cy="54" r="1.8" opacity="0.85"/>
    <circle cx="250" cy="82" r="1.4" opacity="0.6"/>
    <circle cx="380" cy="38" r="2" opacity="0.9"/>
    <circle cx="470" cy="90" r="1.3" opacity="0.5"/>
    <circle cx="650" cy="44" r="1.8" opacity="0.8"/>
    <circle cx="800" cy="76" r="1.4" opacity="0.55"/>
    <circle cx="940" cy="34" r="2" opacity="0.85"/>
    <circle cx="1030" cy="70" r="1.3" opacity="0.45"/>
    <circle cx="180" cy="126" r="1.3" opacity="0.4"/>
    <circle cx="560" cy="118" r="1.4" opacity="0.45"/>
  </g>

  <!-- ===== mặt đất, đón ánh hoàng hôn ở phía phải ===== -->
  <path d="M0 388 H1120 V520 H0 Z" fill="#150f26"/>
  <path d="M0 400 Q360 390 700 400 T1120 394 L1120 470 L0 470 Z" fill="#1d1733"/>
  <ellipse cx="1010" cy="452" rx="300" ry="60" fill="#7a4a3a" opacity="0.22"/>

  <!-- bóng bệ phóng đổ sang trái, vì mặt trời ở bên phải -->
  <path d="M250 470 L330 470 L470 470 L150 518 L40 518 Z" fill="#080513" opacity="0.7"/>
  <path d="M700 470 L830 470 L1080 514 L780 514 Z" fill="#080513" opacity="0.45"/>

  <!-- ===== sàn bệ phóng: khối bê tông có mặt trên và mặt trước ===== -->
  <path d="M300 396 H812 L900 470 H214 Z" fill="url(#lpDeck)" stroke="#1c0b03" stroke-width="6"/>
  <path d="M214 470 H900 V492 H214 Z" fill="#120c22" stroke="#1c0b03" stroke-width="5"/>
  <!-- mép bắt sáng hoàng hôn -->
  <path d="M700 400 H812 L900 470" stroke="#e8a86a" stroke-width="4" opacity="0.7" fill="none"/>
  <g stroke="#3a2c50" stroke-width="3" opacity="0.8">
    <path d="M300 420 H840 M270 444 H866"/>
  </g>

  <!-- rãnh thoát lửa dưới chân tên lửa -->
  <path d="M470 404 L652 404 L706 470 L420 470 Z" fill="#0b0718"/>
  <path d="M470 404 L652 404" stroke="#57406b" stroke-width="4"/>
  <path d="M486 414 L640 414 L684 462 L444 462 Z" fill="#060310"/>

  <!-- kẹp giữ tên lửa ở bốn góc bệ -->
  <g fill="#4a3a58" stroke="#1c0b03" stroke-width="4">
    <rect x="486" y="386" width="22" height="18" rx="2"/>
    <rect x="614" y="386" width="22" height="18" rx="2"/>
  </g>
  <path d="M497 386 v-10 M625 386 v-10" stroke="#1c0b03" stroke-width="6" stroke-linecap="round"/>

  <!-- ===== giàn giáo trái: cao, cùng một hệ lưới, chân đặt trên bệ ===== -->
  <g stroke="#241a34" stroke-width="8" stroke-linecap="round">
    <path d="M306 148 V396 M386 148 V396"/>
    <path d="M306 148 H386"/>
  </g>
  <g stroke="#241a34" stroke-width="4.5" stroke-linecap="round">
    <path d="M306 196 H386 M306 244 H386 M306 292 H386 M306 340 H386"/>
    <path d="M306 148 L386 196 M386 148 L306 196
             M306 196 L386 244 M386 196 L306 244
             M306 244 L386 292 M386 244 L306 292
             M306 292 L386 340 M386 292 L306 340
             M306 340 L386 396 M386 340 L306 396"/>
  </g>
  <!-- viền sáng hoàng hôn trên cạnh phải giàn trái -->
  <path d="M386 150 V394" stroke="#f0b06a" stroke-width="3.5" opacity="0.65"/>
  <path d="M306 148 V396" stroke="#1c0b03" stroke-width="2" opacity="0.5"/>
  <!-- cột thoát hiểm + đèn đỉnh -->
  <path d="M306 148 V110" stroke="#241a34" stroke-width="5"/>
  <circle cx="306" cy="106" r="6" fill="#ffcf8a" stroke="#1c0b03" stroke-width="3"/>

  <!-- ===== giàn giáo phải: thấp hơn, cùng hệ, cùng hướng sáng ===== -->
  <g stroke="#241a34" stroke-width="8" stroke-linecap="round">
    <path d="M712 214 V396 M792 214 V396"/>
    <path d="M712 214 H792"/>
  </g>
  <g stroke="#241a34" stroke-width="4.5" stroke-linecap="round">
    <path d="M712 262 H792 M712 310 H792 M712 358 H792"/>
    <path d="M712 214 L792 262 M792 214 L712 262
             M712 262 L792 310 M792 262 L712 310
             M712 310 L792 358 M792 310 L712 358
             M712 358 L792 396 M792 358 L712 396"/>
  </g>
  <path d="M792 216 V394" stroke="#f0b06a" stroke-width="3.5" opacity="0.75"/>
  <circle cx="792" cy="206" r="5.5" fill="#ffcf8a" stroke="#1c0b03" stroke-width="3"/>

  <!-- ===== cần tiếp cận: chạm hẳn vào thân tên lửa ===== -->
  <g stroke="#2c2140" stroke-width="10" stroke-linecap="round">
    <path d="M386 232 H524"/>
    <path d="M386 320 H500"/>
    <path d="M712 296 H626"/>
  </g>
  <g stroke="#1c0b03" stroke-width="2.5" opacity="0.6">
    <path d="M386 228 H524 M386 324 H500 M712 292 H626"/>
  </g>
  <path d="M386 228 H524 M386 316 H500 M712 292 H626" stroke="#f0b06a" stroke-width="3" opacity="0.6"/>

  <!-- ===== TÊN LỬA: đứng vuông góc với mặt đất ===== -->
  <g>
    <!-- hai tầng đẩy phụ -->
    <path d="M496 250 L509 212 L522 250 Z" fill="#9d9179" stroke="#1c0b03" stroke-width="4.5"/>
    <rect x="496" y="250" width="26" height="146" fill="#a89b81" stroke="#1c0b03" stroke-width="4.5"/>
    <path d="M598 250 L611 212 L624 250 Z" fill="#b9ab90" stroke="#1c0b03" stroke-width="4.5"/>
    <rect x="598" y="250" width="26" height="146" fill="#c4b69a" stroke="#1c0b03" stroke-width="4.5"/>
    <!-- viền sáng phải của tầng đẩy -->
    <path d="M624 252 V394 M611 214 L624 250" stroke="#ffe1a8" stroke-width="3" opacity="0.85" fill="none"/>

    <!-- cánh lái -->
    <path d="M524 338 L478 396 L524 386 Z" fill="#7d6f58" stroke="#1c0b03" stroke-width="5"/>
    <path d="M596 338 L642 396 L596 386 Z" fill="#b4a487" stroke="#1c0b03" stroke-width="5"/>
    <path d="M596 338 L642 396" stroke="#ffe1a8" stroke-width="3" opacity="0.8" fill="none"/>

    <!-- mũi -->
    <path d="M560 58 L596 150 H524 Z" fill="url(#lpBody)" stroke="#1c0b03" stroke-width="5.5"/>
    <path d="M560 58 L596 150" stroke="#ffe9be" stroke-width="3.5" opacity="0.9" fill="none"/>
    <path d="M560 58 L524 150" stroke="#1c0b03" stroke-width="2.5" opacity="0.45" fill="none"/>

    <!-- thân, có khối sáng tối rõ theo hướng mặt trời bên phải -->
    <rect x="524" y="150" width="72" height="246" fill="url(#lpBody)" stroke="#1c0b03" stroke-width="5.5"/>
    <path d="M596 152 V394" stroke="#ffe9be" stroke-width="4" opacity="0.9" fill="none"/>
    <path d="M528 154 V392" stroke="#1c0b03" stroke-width="3" opacity="0.35" fill="none"/>
    <path d="M524 150 H596" stroke="#1c0b03" stroke-width="4"/>
    <g stroke="#5a4f3e" stroke-width="3.5" opacity="0.75">
      <path d="M524 214 H596 M524 300 H596 M524 352 H596"/>
    </g>
    <!-- cửa sổ khoang, hắt sáng dịu sang phải -->
    <circle cx="562" cy="184" r="15" fill="#7d93a8" stroke="#1c0b03" stroke-width="4"/>
    <circle cx="566" cy="180" r="5.5" fill="#dceaf5"/>

    <!-- vòi phun -->
    <path d="M536 396 h20 l-5 16 h-10 Z" fill="#3b3229" stroke="#1c0b03" stroke-width="4"/>
    <path d="M584 396 h20 l-5 16 h-10 Z" fill="#3b3229" stroke="#1c0b03" stroke-width="4"/>
  </g>

  <!-- ===== hơi lạnh rò ra, mép bắt sáng ấm ===== -->
  <g fill="#cfd8e6" opacity="0.3">
    <ellipse cx="506" cy="430" rx="52" ry="13"/>
    <ellipse cx="648" cy="440" rx="58" ry="13"/>
  </g>
  <path d="M490 424 q-26 -30 -12 -58" stroke="#f6d3a4" stroke-width="3" opacity="0.4" fill="none" stroke-linecap="round"/>
  <path d="M660 432 q26 -26 12 -52" stroke="#f6d3a4" stroke-width="3" opacity="0.5" fill="none" stroke-linecap="round"/>

  <!-- ===== người nhỏ ở chân bệ: thước đo tỉ lệ, có bóng đổ cùng hướng ===== -->
  <g fill="#0d0819" opacity="0.55">
    <ellipse cx="838" cy="474" rx="26" ry="6"/>
    <ellipse cx="872" cy="476" rx="20" ry="5"/>
  </g>
  <g filter="url(#wobble)">
    <path d="M832 436 q8 -5 16 0 l3 26 q-11 5 -22 0 Z" fill="#140e22" stroke="#1c0b03" stroke-width="3.5"/>
    <circle cx="840" cy="428" r="7.5" fill="#140e22" stroke="#1c0b03" stroke-width="3.5"/>
    <path d="M834 462 l-2 12 M846 462 l2 12" stroke="#1c0b03" stroke-width="4" stroke-linecap="round"/>
    <path d="M848 438 q3 10 2 20" stroke="#f0b06a" stroke-width="2" opacity="0.7" fill="none"/>

    <path d="M868 442 q7 -4 14 0 l2 22 q-9 4 -18 0 Z" fill="#140e22" stroke="#1c0b03" stroke-width="3.5"/>
    <circle cx="875" cy="435" r="6.5" fill="#140e22" stroke="#1c0b03" stroke-width="3.5"/>
    <path d="M870 464 l-2 10 M880 464 l2 10" stroke="#1c0b03" stroke-width="4" stroke-linecap="round"/>
    <path d="M882 443 q3 9 2 17" stroke="#f0b06a" stroke-width="2" opacity="0.7" fill="none"/>
  </g>
`);

/* ---------- XUẤT RA ---------- */

const SVG_ART = {
  'earth-home': earthHome,
  'farewell': farewell,
  'launchpad': launchpad,
  'mars-surface': marsSurface,
  'storm-coming': stormComing,
  'storm-impact': stormImpact,
  'departure': departure,
  'awake': awake,
};

/* Chọn ảnh: ưu tiên ảnh thật nếu PHOTOS có khai báo.
   Trả về chuỗi HTML để story.js gán bằng innerHTML. */
export function artFor(key) {
  const photo = PHOTOS[key];
  if (photo) {
    return `<img class="story-art story-art-photo" src="${photo}" alt="" decoding="async">`;
  }
  return SVG_ART[key] || '';
}

export const ART = SVG_ART;
