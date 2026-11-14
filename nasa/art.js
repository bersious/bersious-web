/* ============================================================
   art.js — tranh minh hoạ màn mở đầu
   Owner: @bersious

   >>> KHE ẢNH <<<
   Mỗi khoá dưới đây là một CẢNH. Giá trị là chuỗi SVG vẽ tay.
   Khi có tranh thật (do bạn vẽ / thuê vẽ / chụp), chỉ cần đổi giá trị
   thành:
        '<img class="story-art" src="art/mars-surface.png" alt="">'
   Không phải sửa JS, CSS hay story.js. Xem docs/11-INTRO-SCREEN.md.

   Phong cách: nét dày, tay run, tô phẳng, gạch bóng (hatching).
   Bộ lọc "wobble" làm nét hơi rung để không giống vector máy.
   ============================================================ */

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

export const ART = {
  'mars-surface': marsSurface,
  'storm-coming': stormComing,
  'storm-impact': stormImpact,
  'departure': departure,
  'awake': awake,
};

export const ART_KEYS = Object.keys(ART);
