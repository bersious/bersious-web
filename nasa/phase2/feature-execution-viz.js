/* ============================================================
   feature-execution-viz.js
   Bước bay và hạ cánh của trung tâm điều khiển.

   Ba phần nối tiếp nhau:
     1. BAY. Bản đồ quỹ đạo Hohmann 258,9 ngày. Dùng lại
        createMissionViz của src/mission-viz.js. Chỉ khi không nạp
        được module đó mới tự vẽ Canvas dự phòng theo cùng phong
        cách. Kèm dải số liệu thời gian thực: ngày, AU, km, trễ
        tín hiệu một chiều.
     2. TRUYỀN LỆNH. Đi được 75 phần trăm quãng bay thì dừng, chạy
        hiệu ứng sóng lệnh từ Trái Đất sang Sao Hỏa, xin người trên
        mặt đất cắm đèn hiệu dẫn đường.
     3. HẠ CÁNH EDL. Bảy phút kinh hoàng, ba mốc: bung dù, bật động
        cơ hãm, chạm đất. Sau đó là bảng tổng kết sứ mệnh.

   Quy tắc dự án:
     - đường dẫn lấy bằng new URL('.', import.meta.url).href
     - không dấu gạch dài trong chuỗi hiển thị
     - song ngữ Việt và Anh, chuỗi giữ trong chính file này
     - màu lấy từ ../src/css/tokens.css
     - vùng bấm tối thiểu 44px, tôn trọng chế độ giảm chuyển động
   ============================================================ */

const BASE = new URL('.', import.meta.url).href;

/* ---------- hằng số ---------- */

const TRANSFER_DAYS = 258.9;
const EARTH_MARS_PEAK_KM = 401000000;
const LIGHT_KM_S = 299792.458;
const COMMAND_AT = 0.75;          /* phần trăm quãng bay thì gửi lệnh */
const STAGE_MS = 2000;            /* mỗi mốc EDL khoảng hai giây */

/* ---------- chuỗi song ngữ ---------- */

const T = {
  vi: {
    title: 'Bay và hạ cánh',
    titleEn: 'Cruise and landing',
    tag: 'Bước 4',
    tagEn: 'Step 4',
    phaseCruise: 'Bay',
    phaseCruiseEn: 'Cruise',
    phaseCommand: 'Truyền lệnh',
    phaseCommandEn: 'Command uplink',
    phaseEdl: 'Hạ cánh',
    phaseEdlEn: 'EDL',
    phaseSummary: 'Tổng kết',
    phaseSummaryEn: 'Summary',

    dayLabel: 'Ngày bay',
    dayEn: 'Flight day',
    ofDays: 'trên 258,9 ngày',
    distanceLabel: 'Khoảng cách',
    delayLabel: 'Trễ tín hiệu một chiều',
    delayEn: 'One way light time',
    minutes: 'phút',
    etaLabel: 'Còn tới Sao Hỏa',

    speedUp: 'Tua nhanh hơn',
    play: 'Chạy tiếp',
    pause: 'Tạm dừng',

    cmdTitle: 'Sắp tới Sao Hỏa',
    cmdBody: 'Trái Đất gửi lệnh yêu cầu người trên mặt đất cắm đèn hiệu dẫn đường.',
    cmdBodyEn: 'Earth is sending a command asking the crew on the ground to set up the landing beacon.',
    cmdNote: 'Sóng lệnh đi từ Trái Đất sang Sao Hỏa, mất khoảng {min} phút mỗi chiều. Không ai bấm nút được hai lần nếu sai.',
    cmdSending: 'Đang gửi',
    cmdButton: 'Kích hoạt đèn hiệu bãi đáp',
    cmdButtonEn: 'Activate landing beacon',
    cmdAck: 'Đèn hiệu bãi đáp đã bật. Tàu bắt đầu vào khí quyển.',
    landNoBeaconWarn: 'Hạ cánh ngay là mạo hiểm: chưa có đèn hiệu, tàu sẽ đáp mù và rất dễ hỏng.',
    landNow: 'Hạ cánh ngay',

    edlTitle: 'Bảy phút kinh hoàng',
    edlTitleEn: 'Seven minutes of terror',
    edlSub: 'Tàu lao vào khí quyển Sao Hỏa. Mọi thứ phải tự chạy, không ai can thiệp kịp từ Trái Đất.',
    edlNasa: 'EDL, Entry Descent Landing',
    stage1: 'Bung dù giảm tốc',
    stage1En: 'Parachute deploy',
    stage1Note: 'Dù hình bán cầu mở ra, cản không khí hãm tàu lại.',
    stage2: 'Kích hoạt động cơ hãm',
    stage2En: 'Retro engine burn',
    stage2Note: 'Lửa phụt xuống, động cơ đẩy ngược để tàu chậm dần.',
    stage3: 'Chạm đất an toàn',
    stage3En: 'Safe touchdown',
    stage3Note: 'Bụi cuộn lên, tàu đứng yên trên mặt đất.',
    speedLabel: 'Tốc độ',
    kmh: 'km/h',
    altLabel: 'Độ cao',
    meter: 'm',
    waiting: 'Đang chờ',
    running: 'Đang chạy',
    done: 'Xong',

    sumTitle: 'Bảng tổng kết sứ mệnh',
    sumTitleEn: 'Mission summary',
    sumNasa: 'Kiến trúc tham chiếu',
    sumPlayer: 'Thiết kế của bạn',
    sumMass: 'Khối lượng',
    sumMassEn: 'Mass',
    sumCost: 'Chi phí',
    sumCostEn: 'Cost',
    sumDays: 'Thời gian bay',
    sumDaysEn: 'Flight time',
    sumVerdict: 'Kết luận',
    sumVerdictEn: 'Verdict',
    sumUnitKg: 'kg',
    sumUnitMusd: 'triệu USD',
    sumUnitDays: 'ngày',
    sumNoData: 'Chưa có số liệu so sánh từ engine.',
    sumDisclaimer:
      'Kiến trúc tham chiếu do nhóm làm game dựng lại từ dữ liệu NASA, không phải một con tàu NASA có thật đang bay. Con số dùng để so sánh, không phải bản thiết kế chính thức.',
    sumReference: 'Tham chiếu',
    sumBetter: 'nhẹ hơn',
    sumWorse: 'nặng hơn',
    sumCheaper: 'rẻ hơn',
    sumCostlier: 'đắt hơn',
    sumLonger: 'lâu hơn',
    sumShorter: 'nhanh hơn',
    sumSame: 'bằng nhau',
    replay: 'Chơi lại',
    replayEn: 'Play again',
    finish: 'Xong',
    finishEn: 'Done',
    landed: 'Đã hạ cánh',
  },
  en: {
    title: 'Cruise and landing',
    titleEn: 'Bay và hạ cánh',
    tag: 'Step 4',
    tagEn: 'Bước 4',
    phaseCruise: 'Cruise',
    phaseCruiseEn: 'Bay',
    phaseCommand: 'Command uplink',
    phaseCommandEn: 'Truyền lệnh',
    phaseEdl: 'EDL',
    phaseEdlEn: 'Hạ cánh',
    phaseSummary: 'Summary',
    phaseSummaryEn: 'Theo dõi',
    dayLabel: 'Flight day',
    dayEn: 'Ngày bay',
    ofDays: 'of 258.9 days',
    distanceLabel: 'Distance',
    delayLabel: 'One way light time',
    delayEn: 'Trễ tín hiệu',
    minutes: 'min',
    etaLabel: 'To Mars',
    speedUp: 'Faster',
    play: 'Continue',
    pause: 'Pause',
    cmdTitle: 'Approaching Mars',
    cmdBody: 'Earth is sending a command asking the crew on the ground to set up the landing beacon.',
    cmdBodyEn: 'Trái Đất gửi lệnh yêu cầu người trên mặt đất cắm đèn hiệu dẫn đường.',
    cmdNote: 'The command takes about {min} minutes each way. Nobody gets to press the button twice.',
    cmdSending: 'Sending',
    cmdButton: 'Activate landing beacon',
    cmdButtonEn: 'Kích hoạt đèn hiệu bãi đáp',
    cmdAck: 'Beacon is on. The craft is entering the atmosphere.',
    landNoBeaconWarn: 'Landing now is a gamble: with no beacon the ship lands blind and is very likely to crash.',
    landNow: 'Land now',
    edlTitle: 'Seven minutes of terror',
    edlTitleEn: 'Bảy phút kinh hoàng',
    edlSub: 'The craft hits the Martian atmosphere. Everything must run on its own, nobody on Earth can help in time.',
    edlNasa: 'EDL, Entry Descent Landing',
    stage1: 'Parachute deploy',
    stage1En: 'Bung dù giảm tốc',
    stage1Note: 'A hemispherical canopy opens and air drag slows the craft.',
    stage2: 'Retro engine burn',
    stage2En: 'Kích hoạt động cơ hãm',
    stage2Note: 'Engines fire downward and push the craft to a stop.',
    stage3: 'Safe touchdown',
    stage3En: 'Chạm đất an toàn',
    stage3Note: 'Dust rolls out and the craft settles on the ground.',
    speedLabel: 'Speed',
    kmh: 'km/h',
    altLabel: 'Altitude',
    meter: 'm',
    waiting: 'Waiting',
    running: 'Running',
    done: 'Done',
    sumTitle: 'Mission summary',
    sumTitleEn: 'Bảng tổng kết sứ mệnh',
    sumNasa: 'Reference architecture',
    sumPlayer: 'Your design',
    sumMass: 'Mass',
    sumMassEn: 'Khối lượng',
    sumCost: 'Cost',
    sumCostEn: 'Chi phí',
    sumDays: 'Flight time',
    sumDaysEn: 'Thời gian bay',
    sumVerdict: 'Verdict',
    sumVerdictEn: 'Kết luận',
    sumUnitKg: 'kg',
    sumUnitMusd: 'million USD',
    sumUnitDays: 'days',
    sumNoData: 'The engine has not returned comparison data yet.',
    sumDisclaimer:
      'The reference architecture is rebuilt by the game team from NASA data, it is not a real NASA spacecraft now flying. It exists for comparison, not as an official design.',
    sumReference: 'Reference',
    sumBetter: 'lighter',
    sumWorse: 'heavier',
    sumCheaper: 'cheaper',
    sumCostlier: 'costlier',
    sumLonger: 'longer',
    sumShorter: 'faster',
    sumSame: 'same',
    replay: 'Play again',
    replayEn: 'Chơi lại',
    finish: 'Done',
    finishEn: 'Xong',
    landed: 'Landed',
  },
};

/* ---------- tiện ích ---------- */

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Dự án cấm dấu gạch dài. Chuỗi từ engine cũng phải đi qua đây. */
function clean(str) {
  return String(str == null ? '' : str).replace(/\s*[\u2013\u2014]\s*/g, ' - ');
}

function fill(str, vars) {
  let s = str;
  for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

/* Số kiểu Việt Nam: dấu chấm ngăn nghìn, dấu phẩy ngăn thập phân. */
function fmtNum(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(digits);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return digits > 0 ? parts.join(',') : parts[0];
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css-execution.css';
  link.dataset.featureCss = 'execution';
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

/* Trễ tín hiệu MỘT chiều, tính bằng phút, từ khoảng cách km. */
function delayMinutesFromKm(km) {
  const d = Number(km);
  if (!Number.isFinite(d) || d < 0) return 0;
  return d / LIGHT_KM_S / 60;
}

/* ---------- module chính ---------- */

export function mountExecution({ container, engine, onDone } = {}) {
  if (!container) throw new Error('mountExecution cần container');
  injectCss();

  const t = (key) => (T.vi[key] != null ? T.vi[key] : key);
  const e = (key) => (T.en[key] != null ? T.en[key] : key);

  const root = document.createElement('section');
  root.className = 'exv';
  root.setAttribute('aria-label', t('title'));
  root.innerHTML = `
    <header class="exv-head">
      <div class="exv-head-text">
        <p class="exv-tag">
          <span class="exv-tag-step">${esc(t('tag'))}</span>
          <span class="exv-tag-sep" aria-hidden="true"></span>
          <span class="exv-tag-en">${esc(t('tagEn'))}</span>
        </p>
        <h2 class="exv-title">
          <span class="exv-title-vi">${esc(t('title'))}</span>
          <span class="exv-title-en">${esc(t('titleEn'))}</span>
        </h2>
      </div>
      <ol class="exv-chips" aria-label="${esc(t('title'))}">
        <li class="exv-chip is-active" data-chip="cruise"><i aria-hidden="true">1</i><span>${esc(t('phaseCruise'))}</span></li>
        <li class="exv-chip" data-chip="command"><i aria-hidden="true">2</i><span>${esc(t('phaseCommand'))}</span></li>
        <li class="exv-chip" data-chip="edl"><i aria-hidden="true">3</i><span>${esc(t('phaseEdl'))}</span></li>
        <li class="exv-chip" data-chip="summary"><i aria-hidden="true">4</i><span>${esc(t('phaseSummary'))}</span></li>
      </ol>
    </header>

    <!-- PHẦN 1: BAY -->
    <section class="exv-phase exv-phase-cruise" data-phase="cruise">
      <div class="exv-strip">
        <div class="exv-strip-block">
          <span class="exv-strip-k">${esc(t('dayLabel'))}<em>${esc(t('dayEn'))}</em></span>
          <span class="exv-strip-v"><b data-out="day">0,0</b><i>${esc(t('ofDays'))}</i></span>
        </div>
        <div class="exv-strip-block">
          <span class="exv-strip-k">${esc(t('distanceLabel'))}</span>
          <span class="exv-strip-v"><b data-out="au">0,000</b><i>AU</i><u data-out="km">0</u><i>km</i></span>
        </div>
        <div class="exv-strip-block is-delay">
          <span class="exv-strip-k">${esc(t('delayLabel'))}<em>${esc(t('delayEn'))}</em></span>
          <span class="exv-strip-v"><b data-out="delay">0,0</b><i>${esc(t('minutes'))}</i></span>
        </div>
        <div class="exv-strip-block is-prog">
          <div class="exv-bar"><span class="exv-bar-fill" data-out="fill"></span><span class="exv-bar-mark" data-out="mark" aria-hidden="true"></span></div>
          <span class="exv-strip-k is-small"><span data-out="pct">0</span>% · ${esc(t('etaLabel'))} <b data-out="eta">258,9</b> ${esc(t('ofDays'))}</span>
        </div>
      </div>
      <div class="exv-viz-host"></div>
      <p class="exv-fallback-note" hidden></p>
    </section>

    <!-- PHẦN 2: TRUYỀN LỆNH -->
    <section class="exv-phase exv-phase-command" data-phase="command" hidden>
      <div class="exv-cmd">
        <div class="exv-cmd-visual">
          <svg class="exv-wave" viewBox="0 0 640 260" role="img" aria-label="${esc(t('cmdTitle'))}">
            <defs>
              <linearGradient id="exv-wave-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="var(--cyan)" stop-opacity=".18"></stop>
                <stop offset="55%" stop-color="var(--cyan)" stop-opacity=".9"></stop>
                <stop offset="100%" stop-color="var(--amber)" stop-opacity=".85"></stop>
              </linearGradient>
              <radialGradient id="exv-earth-grad" cx="38%" cy="34%" r="70%">
                <stop offset="0%" stop-color="#4fb8c9"></stop>
                <stop offset="62%" stop-color="#20505a"></stop>
                <stop offset="100%" stop-color="#0a1418"></stop>
              </radialGradient>
              <radialGradient id="exv-mars-grad" cx="38%" cy="34%" r="70%">
                <stop offset="0%" stop-color="#d9694f"></stop>
                <stop offset="62%" stop-color="#5c2a20"></stop>
                <stop offset="100%" stop-color="#170b08"></stop>
              </radialGradient>
            </defs>
            <path class="exv-wave-path" d="M 96 176 C 236 40, 404 40, 548 176" fill="none"></path>
            <g class="exv-wave-dots"></g>
            <circle class="exv-planet" cx="72" cy="188" r="34" fill="url(#exv-earth-grad)"></circle>
            <circle class="exv-planet-ring" cx="72" cy="188" r="41" fill="none"></circle>
            <circle class="exv-planet" cx="568" cy="188" r="26" fill="url(#exv-mars-grad)"></circle>
            <circle class="exv-planet-ring" cx="568" cy="188" r="33" fill="none"></circle>
            <text class="exv-planet-name" x="72" y="246" text-anchor="middle">TRÁI ĐẤT · EARTH</text>
            <text class="exv-planet-name" x="568" y="246" text-anchor="middle">SAO HỎA · MARS</text>
          </svg>
        </div>
        <div class="exv-cmd-text">
          <h3 class="exv-cmd-title">
            <span>${esc(t('cmdTitle'))}</span>
            <em>${esc(e('cmdTitle'))}</em>
          </h3>
          <p class="exv-cmd-body">${esc(t('cmdBody'))}</p>
          <p class="exv-cmd-body is-en">${esc(e('cmdBody'))}</p>
          <p class="exv-cmd-note" data-out="cmdNote"></p>
          <div class="exv-cmd-progress" aria-hidden="true"><span data-out="cmdFill"></span></div>
          <button type="button" class="exv-btn is-primary" data-act="beacon">
            <span>${esc(t('cmdButton'))}</span>
            <em>${esc(e('cmdButton'))}</em>
          </button>
          <button type="button" class="exv-btn exv-btn-ghost" data-act="land-now">
            <span>${esc(t('landNow'))}</span>
            <em>${esc(e('landNow'))}</em>
          </button>
          <p class="exv-cmd-ack" data-out="ack" hidden></p>
        </div>
      </div>
    </section>

    <!-- PHẦN 3: HẠ CÁNH -->
    <section class="exv-phase exv-phase-edl" data-phase="edl" hidden>
      <div class="exv-edl-head">
        <h3 class="exv-edl-title">
          <span>${esc(t('edlTitle'))}</span>
          <em>${esc(t('edlTitleEn'))}</em>
          <u>${esc(t('edlNasa'))}</u>
        </h3>
        <p class="exv-edl-sub">${esc(t('edlSub'))}</p>
      </div>

      <div class="exv-edl-body">
        <div class="exv-edl-stage-wrap">
          <canvas class="exv-edl-canvas" aria-hidden="true"></canvas>
          <div class="exv-edl-hud">
            <div class="exv-hud-speed">
              <span class="exv-hud-k">${esc(t('speedLabel'))}</span>
              <b data-out="speed">1500</b>
              <i>${esc(t('kmh'))}</i>
            </div>
            <div class="exv-hud-alt">
              <span class="exv-hud-k">${esc(t('altLabel'))}</span>
              <b data-out="alt">12 000</b>
              <i>${esc(t('meter'))}</i>
            </div>
          </div>
        </div>

        <ol class="exv-stages" role="list">
          <li class="exv-stage" data-stage="1">
            <span class="exv-stage-no" aria-hidden="true">1</span>
            <div class="exv-stage-text">
              <b>${esc(t('stage1'))}</b>
              <em>${esc(t('stage1En'))}</em>
              <p>${esc(t('stage1Note'))}</p>
            </div>
            <span class="exv-stage-speed" data-out="s1">1500 → 400</span>
            <span class="exv-stage-state" data-out="state1">${esc(t('waiting'))}</span>
          </li>
          <li class="exv-stage" data-stage="2">
            <span class="exv-stage-no" aria-hidden="true">2</span>
            <div class="exv-stage-text">
              <b>${esc(t('stage2'))}</b>
              <em>${esc(t('stage2En'))}</em>
              <p>${esc(t('stage2Note'))}</p>
            </div>
            <span class="exv-stage-speed" data-out="s2">400 → 20</span>
            <span class="exv-stage-state" data-out="state2">${esc(t('waiting'))}</span>
          </li>
          <li class="exv-stage" data-stage="3">
            <span class="exv-stage-no" aria-hidden="true">3</span>
            <div class="exv-stage-text">
              <b>${esc(t('stage3'))}</b>
              <em>${esc(t('stage3En'))}</em>
              <p>${esc(t('stage3Note'))}</p>
            </div>
            <span class="exv-stage-speed" data-out="s3">20 → 0</span>
            <span class="exv-stage-state" data-out="state3">${esc(t('waiting'))}</span>
          </li>
        </ol>
      </div>
    </section>

    <!-- TỔNG KẾT -->
    <section class="exv-phase exv-summary" data-phase="summary" hidden>
      <div class="exv-sum-head">
        <span class="exv-sum-badge">${esc(t('landed'))}</span>
        <h3 class="exv-sum-title">
          <span>${esc(t('sumTitle'))}</span>
          <em>${esc(t('sumTitleEn'))}</em>
        </h3>
      </div>
      <table class="exv-table">
        <thead>
          <tr>
            <th scope="col"><span>${esc(t('sumReference'))}</span></th>
            <th scope="col"><span>${esc(t('sumNasa'))}</span></th>
            <th scope="col"><span>${esc(t('sumPlayer'))}</span></th>
          </tr>
        </thead>
        <tbody data-out="rows"></tbody>
      </table>
      <p class="exv-sum-verdict" data-out="verdict"></p>
      <p class="exv-sum-note">${esc(t('sumDisclaimer'))}</p>
      <div class="exv-sum-actions">
        <button type="button" class="exv-btn" data-act="replay">
          <span>${esc(t('replay'))}</span>
          <em>${esc(t('replayEn'))}</em>
        </button>
        <button type="button" class="exv-btn is-primary" data-act="finish">
          <span>${esc(t('finish'))}</span>
          <em>${esc(t('finishEn'))}</em>
        </button>
      </div>
    </section>
  `;
  container.appendChild(root);

  /* ---------- tham chiếu DOM ---------- */

  const phaseEls = {
    cruise: root.querySelector('[data-phase="cruise"]'),
    command: root.querySelector('[data-phase="command"]'),
    edl: root.querySelector('[data-phase="edl"]'),
    summary: root.querySelector('[data-phase="summary"]'),
  };
  const vizHost = root.querySelector('.exv-viz-host');
  const fallbackNote = root.querySelector('.exv-fallback-note');
  const out = {
    day: root.querySelector('[data-out="day"]'),
    au: root.querySelector('[data-out="au"]'),
    km: root.querySelector('[data-out="km"]'),
    delay: root.querySelector('[data-out="delay"]'),
    fill: root.querySelector('[data-out="fill"]'),
    mark: root.querySelector('[data-out="mark"]'),
    pct: root.querySelector('[data-out="pct"]'),
    eta: root.querySelector('[data-out="eta"]'),
    cmdNote: root.querySelector('[data-out="cmdNote"]'),
    cmdFill: root.querySelector('[data-out="cmdFill"]'),
    ack: root.querySelector('[data-out="ack"]'),
    speed: root.querySelector('[data-out="speed"]'),
    alt: root.querySelector('[data-out="alt"]'),
    s1: root.querySelector('[data-out="s1"]'),
    s2: root.querySelector('[data-out="s2"]'),
    s3: root.querySelector('[data-out="s3"]'),
    state1: root.querySelector('[data-out="state1"]'),
    state2: root.querySelector('[data-out="state2"]'),
    state3: root.querySelector('[data-out="state3"]'),
    rows: root.querySelector('[data-out="rows"]'),
    verdict: root.querySelector('[data-out="verdict"]'),
  };
  const btnBeacon = root.querySelector('[data-act="beacon"]');
  const btnLandNow = root.querySelector('[data-act="land-now"]');
  const btnReplay = root.querySelector('[data-act="replay"]');
  const btnFinish = root.querySelector('[data-act="finish"]');
  const edlCanvas = root.querySelector('.exv-edl-canvas');
  const edlStageWrap = root.querySelector('.exv-edl-stage-wrap');
  const waveDots = root.querySelector('.exv-wave-dots');
  const wavePath = root.querySelector('.exv-wave-path');

  /* ---------- trạng thái ---------- */

  let motionOn = readMotion();
  let destroyed = false;
  let phase = 'cruise';
  let viz = null;                 /* instance createMissionViz nếu nạp được */
  let vizFallback = null;         /* bộ vẽ dự phòng */
  let commandShown = false;
  let beaconDone = false;
  let edlStarted = false;
  let edlDone = false;
  let stageTimers = [];
  let waveRaf = 0;
  let lastFrame = { day: 0, progress: 0, distanceKm: 0, delayMinutes: 0 };

  /* ---------- chuyển phần ---------- */

  const chipOf = (name) => root.querySelector(`.exv-chip[data-chip="${name}"]`);

  function setPhase(name) {
    const order = ['cruise', 'command', 'edl', 'summary'];
    const idx = order.indexOf(name);
    phase = name;
    order.forEach((key, i) => {
      const el = phaseEls[key];
      if (!el) return;
      el.hidden = key !== name;
      const chip = chipOf(key);
      if (chip) {
        chip.classList.toggle('is-active', i === idx);
        chip.classList.toggle('is-done', i < idx);
        if (i === idx) chip.setAttribute('aria-current', 'step');
        else chip.removeAttribute('aria-current');
      }
    });
  }

  /* ---------- PHẦN 1: bản đồ quỹ đạo ---------- */

  function paintStrip(frame) {
    const day = clamp(frame.day || 0, 0, TRANSFER_DAYS);
    const progress = clamp(day / TRANSFER_DAYS, 0, 1);
    const km = Number(frame.distanceKm) || 0;
    const au = km / 149597870.7;
    const delay = Number.isFinite(frame.delayMinutes) ? frame.delayMinutes : delayMinutesFromKm(km);

    out.day.textContent = fmtNum(day, 1);
    out.au.textContent = fmtNum(au, 3);
    out.km.textContent = fmtNum(km, 0);
    out.delay.textContent = fmtNum(delay, 1);
    out.pct.textContent = String(Math.round(progress * 100));
    out.eta.textContent = fmtNum(Math.max(0, TRANSFER_DAYS - day), 1);
    out.fill.style.width = (progress * 100).toFixed(2) + '%';

    if (out.mark) {
      out.mark.style.left = (COMMAND_AT * 100).toFixed(2) + '%';
      out.mark.classList.toggle('is-passed', progress >= COMMAND_AT);
    }
    out.fill.classList.toggle('is-past-mark', progress >= COMMAND_AT);
  }

  function onFrame(frame) {
    if (destroyed) return;
    lastFrame = Object.assign({}, lastFrame, frame);
    paintStrip(lastFrame);
    if (!commandShown && phase === 'cruise' && (frame.progress || 0) >= COMMAND_AT) {
      enterCommand();
    }
  }

  /* Bộ vẽ dự phòng, chỉ dùng khi không nạp được mission-viz.js. Cùng
     phong cách: nền tối, quỹ đạo mảnh, tàu là điểm hổ phách, không
     cần tương tác vì app thật luôn có module chính. */
  function makeFallbackViz(host) {
    const wrap = document.createElement('div');
    wrap.className = 'exv-fallback';
    wrap.innerHTML = '<canvas class="exv-fallback-canvas" aria-hidden="true"></canvas>';
    host.appendChild(wrap);
    const canvas = wrap.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    let w = 0;
    let h = 0;
    let dpr = 1;
    let day = 0;
    let playing = true;
    let raf = 0;
    let lastTs = 0;

    function resize() {
      const rect = wrap.getBoundingClientRect();
      w = Math.max(240, rect.width);
      h = Math.round(clamp(w * 0.56, 220, 520));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      const cx = w / 2;
      const cy = h / 2;
      const rMars = Math.min(w, h) * 0.34;
      const rEarth = rMars * 0.656;
      const p = clamp(day / TRANSFER_DAYS, 0, 1);

      ctx.clearRect(0, 0, w, h);

      /* sao nền, cố định để không nhấp nháy khi máy yếu */
      ctx.save();
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 97) % 1000) / 1000 * w;
        const sy = ((i * 191) % 1000) / 1000 * h;
        ctx.globalAlpha = 0.12 + ((i * 37) % 40) / 100;
        ctx.fillStyle = '#cfdcea';
        ctx.fillRect(sx, sy, 1, 1);
      }
      ctx.restore();

      /* quỹ đạo */
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(79, 184, 201, .28)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rEarth, rEarth, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(217, 105, 79, .34)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rMars, rMars, 0, 0, Math.PI * 2);
      ctx.stroke();

      /* Mặt Trời */
      const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
      sunGrad.addColorStop(0, 'rgba(232, 163, 61, .95)');
      sunGrad.addColorStop(0.45, 'rgba(232, 163, 61, .35)');
      sunGrad.addColorStop(1, 'rgba(232, 163, 61, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8a33d';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      /* hai hành tinh, góc pha đơn giản tăng theo ngày */
      const aEarth = -Math.PI / 2 + 0.0;
      const aMars = -Math.PI / 2 + (30 + p * 190) * Math.PI / 180;
      const ex = cx + Math.cos(aEarth) * rEarth;
      const ey = cy + Math.sin(aEarth) * rEarth;
      const mx = cx + Math.cos(aMars) * rMars;
      const my = cy + Math.sin(aMars) * rMars;

      ctx.fillStyle = '#4fb8c9';
      ctx.beginPath();
      ctx.arc(ex, ey, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d9694f';
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, Math.PI * 2);
      ctx.fill();

      /* đường chuyển tiếp: cung nối Trái Đất tới Sao Hỏa */
      ctx.strokeStyle = 'rgba(232, 163, 61, .55)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.quadraticCurveTo(cx + (mx - cx) * 0.32, cy + (my - cy) * 0.32 - rMars * 0.42, mx, my);
      ctx.stroke();
      ctx.setLineDash([]);

      /* tàu chạy dọc đường chuyển tiếp */
      const bez = (a, b, c, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
      const bx = bez(ex, cx + (mx - cx) * 0.32, mx, p);
      const by = bez(ey, cy + (my - cy) * 0.32 - rMars * 0.42, my, p);
      ctx.fillStyle = '#e8a33d';
      ctx.shadowColor = 'rgba(232, 163, 61, .85)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(bx, by, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function tick(ts) {
      if (destroyed) return;
      raf = requestAnimationFrame(tick);
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.12, (ts - lastTs) / 1000);
      lastTs = ts;
      if (!playing) return;
      day += dt * 2 * 4;
      if (day >= TRANSFER_DAYS) day = TRANSFER_DAYS;
      draw();
      onFrame({
        day,
        progress: day / TRANSFER_DAYS,
        distanceKm: EARTH_MARS_PEAK_KM * (0.55 + 0.45 * Math.sin(Math.PI * (day / TRANSFER_DAYS))),
      });
    }

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();
    raf = requestAnimationFrame(tick);

    return {
      setDay(v) {
        day = clamp(Number(v) || 0, 0, TRANSFER_DAYS);
        draw();
      },
      pause() {
        playing = false;
      },
      resume() {
        playing = true;
      },
      isPlaying() {
        return playing;
      },
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        wrap.remove();
      },
    };
  }

  function startCruise() {
    /* Thử nạp module bản đồ thật. Nạp động để trang vẫn chạy được
       khi file chưa có, và để lỗi mạng không làm hỏng cả bước. */
    import('../mission-viz.js')
      .then((mod) => {
        if (destroyed || !mod || typeof mod.createMissionViz !== 'function') {
          throw new Error('mission-viz không xuất createMissionViz');
        }
        viz = mod.createMissionViz({
          container: vizHost,
          lang: 'vi',
          onFrame,
        });
        /* Bản đồ thật chỉ vẽ, không tự chạy. Bật chạy ngay để người
           chơi thấy tàu đang bay, trừ khi họ tắt chuyển động. */
        if (motionOn && typeof viz.resume === 'function') viz.resume();
        if (typeof viz.setSpeed === 'function') viz.setSpeed(motionOn ? 5 : 1);
      })
      .catch(() => {
        if (destroyed) return;
        vizFallback = makeFallbackViz(vizHost);
        fallbackNote.hidden = false;
        fallbackNote.textContent = motionOn
          ? 'Bản đồ quỹ đạo đầy đủ chưa nạp được, đang dùng bản vẽ rút gọn.'
          : 'Bản đồ quỹ đạo đầy đủ chưa nạp được, đang dùng bản vẽ rút gọn.';
      });
  }

  /* ---------- PHẦN 2: truyền lệnh ---------- */

  function stopCruise() {
    if (viz && typeof viz.pause === 'function') viz.pause();
    if (vizFallback) vizFallback.pause();
  }

  function enterCommand() {
    if (commandShown) return;
    commandShown = true;
    stopCruise();
    setPhase('command');
    /* Đọc lại công tắc chuyển động ngay tại thời điểm này: người chơi
       có thể đã tắt chuyển động trong lúc đang bay. */
    motionOn = readMotion();

    const delay = Number(lastFrame.delayMinutes);
    const mins = Number.isFinite(delay) && delay > 0
      ? fmtNum(delay, 1)
      : fmtNum(delayMinutesFromKm(lastFrame.distanceKm || 0), 1);
    out.cmdNote.textContent = fill(t('cmdNote'), { min: mins });

    startWave();
  }

  /* Sóng lệnh: chấm sáng chạy dọc đường cong SVG, chạy tới khi bật
     đèn hiệu thì thôi. Tắt chuyển động thì rải chấm tĩnh. */
  function startWave() {
    if (!waveDots || !wavePath) return;

    const count = motionOn ? 7 : 11;
    waveDots.innerHTML = '';
    const dots = [];
    for (let i = 0; i < count; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', i % 3 === 0 ? '3.6' : '2.4');
      c.setAttribute('class', 'exv-wave-dot');
      waveDots.appendChild(c);
      dots.push(c);
    }

    const pathEl = wavePath;
    let len = 620;
    try {
      if (typeof pathEl.getTotalLength === 'function') len = pathEl.getTotalLength() || len;
    } catch {
      len = 620;
    }

    if (!motionOn) {
      dots.forEach((c, i) => {
        const u = (i + 0.5) / count;
        placeDot(c, u * len, u);
      });
      return;
    }

    let t0 = 0;
    function step(ts) {
      if (destroyed || beaconDone) return;
      if (!t0) t0 = ts;
      const elapsed = (ts - t0) / 1000;
      const SPEED = 150;          /* pixel mỗi giây trên đường cong */

      dots.forEach((c, i) => {
        const offset = (elapsed * SPEED + (i * len) / count) % (len * 1.05);
        const at = clamp(offset, 0, len);
        placeDot(c, at, at / len);
      });

      waveRaf = requestAnimationFrame(step);
    }

    function placeDot(circle, at, u) {
      let pt = { x: 0, y: 0 };
      try {
        pt = pathEl.getPointAtLength(at);
      } catch {
        pt = { x: 96 + u * 452, y: 176 - Math.sin(u * Math.PI) * 130 };
      }
      circle.setAttribute('cx', pt.x.toFixed(1));
      circle.setAttribute('cy', pt.y.toFixed(1));
      /* chấm đậm dần khi tới gần Sao Hỏa, như tín hiệu yếu dần */
      circle.setAttribute('opacity', (0.35 + u * 0.6).toFixed(2));
    }

    waveRaf = requestAnimationFrame(step);

    /* thanh tiến trình gửi lệnh, chạy song song cho có nhịp */
    if (motionOn) {
      let p = 0;
      const timer = setInterval(() => {
        if (destroyed || beaconDone) {
          clearInterval(timer);
          return;
        }
        p = Math.min(1, p + 0.03);
        out.cmdFill.style.width = (p * 100).toFixed(1) + '%';
      }, 120);
      stageTimers.push(() => clearInterval(timer));
    } else {
      out.cmdFill.style.width = '100%';
    }
  }

  function onBeacon() {
    if (beaconDone) return;
    beaconDone = true;
    if (waveRaf) cancelAnimationFrame(waveRaf);
    waveRaf = 0;
    out.cmdFill.style.width = '100%';
    out.ack.hidden = false;
    out.ack.textContent = t('cmdAck');
    btnBeacon.disabled = true;
    btnBeacon.classList.add('is-done');

    if (engine && typeof engine.completeMarsGroundPrep === 'function') {
      try {
        engine.completeMarsGroundPrep();
      } catch {
        /* engine hỏng thì vẫn cho chơi tiếp, app sẽ báo */
      }
    }

    const wait = motionOn ? 900 : 120;
    const id = setTimeout(() => { if (!destroyed) enterEdl(); }, wait);
    stageTimers.push(() => clearTimeout(id));
  }

  /* ---------- PHẦN 3: hạ cánh EDL ---------- */

  const EDL_STAGES = [
    { key: 1, from: 1500, to: 400, altFrom: 12000, altTo: 2200 },
    { key: 2, from: 400, to: 20, altFrom: 2200, altTo: 12 },
    { key: 3, from: 20, to: 0, altFrom: 12, altTo: 0 },
  ];

  /* Trạng thái vẽ của cảnh hạ cánh. Một nguồn sự thật duy nhất cho
     cả hoạt ảnh lẫn số liệu chữ, để hai bên không lệch nhau. */
  const edl = {
    stage: 0,           /* 0 chưa chạy, 1..3 mốc, 4 xong */
    t: 0,               /* tiến trình trong mốc, 0..1 */
    speed: 1500,
    alt: 12000,
    chute: 0,           /* độ mở dù, 0..1 */
    flame: 0,           /* độ mạnh lửa, 0..1 */
    dust: 0,            /* độ cuộn bụi, 0..1 */
    landed: false,
  };

  let edlRaf = 0;
  let edlLastTs = 0;
  let edlCtx = null;
  let edlW = 0;
  let edlH = 0;
  let dustParts = [];

  function buildDust() {
    dustParts = [];
    for (let i = 0; i < 46; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      dustParts.push({
        side,
        d: 0.1 + Math.random() * 0.9,
        speed: 0.35 + Math.random() * 0.6,
        r: 2 + Math.random() * 7,
        life: 0.5 + Math.random() * 0.5,
      });
    }
  }
  buildDust();

  function sizeEdlCanvas() {
    const rect = edlStageWrap.getBoundingClientRect();
    const w = Math.max(260, rect.width || 640);
    const h = Math.round(clamp(w * 0.5, 200, 400));
    edlW = w;
    edlH = h;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    edlCanvas.width = Math.round(w * dpr);
    edlCanvas.height = Math.round(h * dpr);
    edlCanvas.style.width = w + 'px';
    edlCanvas.style.height = h + 'px';
    edlCtx = edlCanvas.getContext('2d');
    edlCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawEdl();
  }

  function drawEdl() {
    if (!edlCtx) return;
    const ctx = edlCtx;
    const w = edlW;
    const h = edlH;
    const groundY = h * 0.82;
    const cx = w / 2;

    ctx.clearRect(0, 0, w, h);

    /* bầu trời Sao Hỏa: nâu đỏ ở chân trời, tối dần lên cao */
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#0a0806');
    sky.addColorStop(0.55, '#180d09');
    sky.addColorStop(0.86, '#3a1a10');
    sky.addColorStop(1, '#5a2a17');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);

    /* sao mờ trên cao */
    ctx.save();
    for (let i = 0; i < 34; i++) {
      const sx = ((i * 137) % 997) / 997 * w;
      const sy = ((i * 211) % 431) / 431 * groundY * 0.72;
      ctx.globalAlpha = 0.1 + ((i * 29) % 35) / 130;
      ctx.fillStyle = '#d8e4f0';
      ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.restore();

    /* mặt đất: lớp nâu đỏ, có vệt sáng nơi đèn hiệu */
    const soil = ctx.createLinearGradient(0, groundY, 0, h);
    soil.addColorStop(0, '#4a2316');
    soil.addColorStop(0.35, '#2c130c');
    soil.addColorStop(1, '#140806');
    ctx.fillStyle = soil;
    ctx.fillRect(0, groundY, w, h - groundY);

    /* đường chân trời */
    ctx.strokeStyle = 'rgba(232, 163, 61, .22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 0.5);
    ctx.lineTo(w, groundY + 0.5);
    ctx.stroke();

    /* đèn hiệu bãi đáp ở bên trái, nhấp nháy rất nhẹ */
    const beaconX = cx + Math.min(150, w * 0.28);
    const pulse = motionOn ? 0.55 + 0.45 * Math.sin(Date.now() / 520) : 1;
    const bg = ctx.createRadialGradient(beaconX, groundY - 4, 0, beaconX, groundY - 4, 34);
    bg.addColorStop(0, `rgba(111, 191, 138, ${(0.5 * pulse).toFixed(3)})`);
    bg.addColorStop(1, 'rgba(111, 191, 138, 0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(beaconX, groundY - 4, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6fbf8a';
    ctx.fillRect(beaconX - 2, groundY - 14, 4, 14);

    /* vị trí tàu: độ cao đổi thành cao độ trên khung vẽ */
    const altNorm = clamp(edl.alt / 12000, 0, 1);
    const craftY = groundY - 26 - altNorm * (groundY - 78);
    const craftX = cx - clamp((1 - altNorm) * 26, 0, 26);

    /* dù: hình bán cầu, mở dần theo edl.chute */
    if (edl.chute > 0.02) {
      const open = edl.chute;
      const r = 34 * open + 8;
      const cy = craftY - 46 - 18 * open;
      ctx.strokeStyle = `rgba(234, 241, 248, ${(0.30 + 0.55 * open).toFixed(2)})`;
      ctx.lineWidth = 1.2;
      /* dây treo */
      for (let i = -2; i <= 2; i++) {
        const tx = craftX + i * (r * 0.34);
        ctx.beginPath();
        ctx.moveTo(tx, cy + r * 0.15);
        ctx.lineTo(craftX, craftY - 6);
        ctx.stroke();
      }
      /* vành dù */
      const canopy = ctx.createLinearGradient(0, cy - r * 0.7, 0, cy + r * 0.3);
      canopy.addColorStop(0, 'rgba(231, 197, 154, .92)');
      canopy.addColorStop(1, 'rgba(158, 112, 72, .82)');
      ctx.fillStyle = canopy;
      ctx.beginPath();
      ctx.ellipse(craftX, cy, r, r * 0.62, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(74, 46, 28, .85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(craftX, cy, r, r * 0.62, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      /* vạch chia trên vành dù */
      ctx.strokeStyle = 'rgba(74, 46, 28, .5)';
      for (let i = 1; i < 4; i++) {
        const u = i / 4;
        const px = craftX - r + u * 2 * r;
        ctx.beginPath();
        ctx.moveTo(px, cy);
        ctx.lineTo(craftX + (px - craftX) * 0.86, cy - r * 0.52);
        ctx.stroke();
      }
    }

    /* lửa động cơ hãm: hai tia phụt xuống, dài theo edl.flame */
    if (edl.flame > 0.02) {
      const f = edl.flame;
      const flick = motionOn ? 0.82 + Math.random() * 0.36 : 1;
      const len = 18 + 44 * f * flick;
      const glow = ctx.createRadialGradient(craftX, craftY + 12, 0, craftX, craftY + 12, 26 + 34 * f);
      glow.addColorStop(0, 'rgba(232, 163, 61, .55)');
      glow.addColorStop(0.5, 'rgba(217, 105, 79, .22)');
      glow.addColorStop(1, 'rgba(217, 105, 79, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(craftX, craftY + 12, 26 + 34 * f, 0, Math.PI * 2);
      ctx.fill();

      [-9, 9].forEach((dx) => {
        const fg = ctx.createLinearGradient(0, craftY + 6, 0, craftY + 6 + len);
        fg.addColorStop(0, 'rgba(255, 241, 214, .95)');
        fg.addColorStop(0.4, 'rgba(232, 163, 61, .85)');
        fg.addColorStop(1, 'rgba(217, 105, 79, 0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(craftX + dx - 5, craftY + 6);
        ctx.lineTo(craftX + dx + 5, craftY + 6);
        ctx.lineTo(craftX + dx + 1, craftY + 6 + len);
        ctx.lineTo(craftX + dx - 1, craftY + 6 + len);
        ctx.closePath();
        ctx.fill();
      });
    }

    /* bụi cuộn lên khi chạm đất */
    if (edl.dust > 0.01) {
      dustParts.forEach((p) => {
        const d = clamp(edl.dust * p.speed * 2.6 - p.d * 0.5, 0, 1);
        if (d <= 0) return;
        const x = craftX + p.side * d * (60 + p.r * 10);
        const y = groundY - d * 14 - p.r * 0.4;
        const a = (1 - d) * p.life * 0.55;
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * (1 + d));
        g.addColorStop(0, `rgba(196, 138, 104, ${a.toFixed(3)})`);
        g.addColorStop(1, 'rgba(196, 138, 104, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, p.r * (1 + d), 0, Math.PI * 2);
        ctx.fill();
      });
    }

    /* thân tàu: hình nón cụt, chân đáp ba chân khi đã chạm */
    ctx.fillStyle = edl.landed ? '#d5dde8' : '#c3cedb';
    ctx.beginPath();
    ctx.moveTo(craftX - 13, craftY + 6);
    ctx.lineTo(craftX + 13, craftY + 6);
    ctx.lineTo(craftX + 8, craftY - 14);
    ctx.lineTo(craftX - 8, craftY - 14);
    ctx.closePath();
    ctx.fill();
    /* nắp trên */
    ctx.fillStyle = '#8f9dad';
    ctx.beginPath();
    ctx.moveTo(craftX - 8, craftY - 14);
    ctx.lineTo(craftX + 8, craftY - 14);
    ctx.lineTo(craftX, craftY - 21);
    ctx.closePath();
    ctx.fill();
    /* chân đáp */
    if (edl.landed) {
      ctx.strokeStyle = '#8f9dad';
      ctx.lineWidth = 1.6;
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(craftX + s * 10, craftY + 2);
        ctx.lineTo(craftX + s * 17, groundY - 1);
        ctx.stroke();
      });
    }
    /* tia sáng nhỏ trên thân, đủ để thấy tàu đang nghiêng nhẹ */
    ctx.strokeStyle = 'rgba(232, 163, 61, .7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(craftX - 6, craftY - 2);
    ctx.lineTo(craftX + 6, craftY - 2);
    ctx.stroke();
  }

  function stageLabel(key, text) {
    const el = root.querySelector(`.exv-stage[data-stage="${key}"]`);
    if (!el) return;
    const stateEl = el.querySelector('.exv-stage-state');
    if (stateEl) stateEl.textContent = text;
    el.classList.toggle('is-running', text === t('running'));
    el.classList.toggle('is-done', text === t('done'));
  }

  function paintEdlNumbers() {
    out.speed.textContent = fmtNum(edl.speed, 0);
    out.alt.textContent = fmtNum(edl.alt, 0);
    /* Mỗi dòng mốc ghi rõ cặp tốc độ đầu và cuối. Dòng đang chạy
       hiện thêm con số tức thời, để mắt bám được con số đang tụt chứ
       không chỉ thấy một cặp số tĩnh. */
    const st = EDL_STAGES;
    const live = (i) => (edl.stage === i + 1 ? ` · ${fmtNum(edl.speed, 0)}` : '');
    out.s1.textContent = `${fmtNum(st[0].from)} → ${fmtNum(st[0].to)}${live(0)}`;
    out.s2.textContent = `${fmtNum(st[1].from)} → ${fmtNum(st[1].to)}${live(1)}`;
    out.s3.textContent = `${fmtNum(st[2].from)} → ${fmtNum(st[2].to)}${live(2)}`;
  }

  function applyStageValues(stageIndex, localT) {
    const s = EDL_STAGES[stageIndex];
    edl.speed = s.from + (s.to - s.from) * localT;
    edl.alt = s.altFrom + (s.altTo - s.altFrom) * localT;
    /* Dù mở hết ở mốc 1. Sang mốc 2 thì cắt dù dần, vì tàu đã bật
       động cơ hãm và dù không còn tác dụng. Mốc 3 không còn dù. */
    if (stageIndex === 0) edl.chute = clamp(localT * 1.6, 0, 1);
    else if (stageIndex === 1) edl.chute = clamp(1 - localT * 2, 0, 1);
    else edl.chute = 0;
    edl.flame = stageIndex === 1 ? clamp(localT * 2.2, 0, 1) : stageIndex === 2 ? clamp(1 - localT * 2.4, 0, 1) : 0;
    edl.dust = stageIndex === 2 ? clamp(localT * 1.5, 0, 1) : 0;
    edl.landed = stageIndex === 2 && localT >= 0.999;
  }

  function runStage(index) {
    const key = index + 1;
    edl.stage = key;
    edl.t = 0;
    stageLabel(key, t('running'));

    const start = performance.now();

    function frame(now) {
      if (destroyed) return;
      const elapsed = now - start;
      const u = clamp(elapsed / STAGE_MS, 0, 1);
      edl.t = u;
      applyStageValues(index, u);
      paintEdlNumbers();
      drawEdl();

      if (u < 1) {
        edlRaf = requestAnimationFrame(frame);
        return;
      }
      stageLabel(key, t('done'));
      const el = root.querySelector(`.exv-stage[data-stage="${key}"]`);
      if (el) el.classList.add('is-done');

      if (index < 2) {
        const id = setTimeout(() => { if (!destroyed) runStage(index + 1); }, motionOn ? 260 : 0);
        stageTimers.push(() => clearTimeout(id));
      } else {
        finishEdl();
      }
    }

    edlRaf = requestAnimationFrame(frame);
  }

  function applyAllInstant() {
    /* Tắt chuyển động: dựng luôn cả ba mốc với số cuối, kèm nhãn.
       Không có hoạt ảnh nhưng mọi thông tin vẫn đủ. */
    EDL_STAGES.forEach((s, i) => {
      applyStageValues(i, 1);
      stageLabel(i + 1, t('done'));
      const el = root.querySelector(`.exv-stage[data-stage="${i + 1}"]`);
      if (el) el.classList.add('is-done');
    });
    edl.stage = 3;
    edl.t = 1;
    edl.speed = 0;
    edl.alt = 0;
    edl.chute = 0;
    edl.flame = 0;
    edl.dust = 1;
    edl.landed = true;
    paintEdlNumbers();
    drawEdl();
    /* Giữ khung hình chạm đất lại một nhịp đủ lâu để người chơi đọc
       ba nhãn mốc và thấy tàu đã đứng trên mặt đất, rồi mới sang bảng
       tổng kết. Không có hoạt ảnh nhưng vẫn phải thấy kết quả. */
    const id = setTimeout(() => { if (!destroyed) finishEdl(); }, 1600);
    stageTimers.push(() => clearTimeout(id));
  }

  function enterEdl() {
    if (edlStarted) return;
    edlStarted = true;
    setPhase('edl');
    sizeEdlCanvas();
    if (!motionOn) {
      applyAllInstant();
      return;
    }
    const id = setTimeout(() => { if (!destroyed) runStage(0); }, 320);
    stageTimers.push(() => clearTimeout(id));
  }

  function finishEdl() {
    if (edlDone) return;
    edlDone = true;
    if (edlRaf) cancelAnimationFrame(edlRaf);
    edlRaf = 0;
    drawEdl();

    const wait = motionOn ? 700 : 200;
    const id = setTimeout(() => {
      if (destroyed) return;
      renderSummary();
      setPhase('summary');
      /* Engine có thể điền comparison muộn hơn một nhịp so với lúc
         ta mở bảng. Thử lại vài lần rồi thôi, không bắt người chơi
         nhìn bảng trống. */
      waitForComparison(0);
    }, wait);
    stageTimers.push(() => clearTimeout(id));
  }

  let cmpTimer = 0;

  function waitForComparison(tries) {
    if (destroyed || tries > 12) return;
    const cmp = readComparison();
    if (cmp) {
      renderSummary();
      return;
    }
    cmpTimer = setTimeout(() => {
      if (destroyed) return;
      waitForComparison(tries + 1);
    }, 250);
    stageTimers.push(() => clearTimeout(cmpTimer));
  }

  /* ---------- bảng tổng kết ---------- */

  function readComparison() {
    if (!engine || typeof engine.getState !== 'function') return null;
    let state = null;
    try {
      state = engine.getState();
    } catch {
      return null;
    }
    return (state && state.comparison) || null;
  }

  function renderSummary() {
    const cmp = readComparison();
    if (!cmp) {
      out.rows.innerHTML = `<tr><td colspan="3" class="exv-td-note">${esc(t('sumNoData'))}</td></tr>`;
      out.verdict.textContent = '';
      return;
    }

    const nasa = cmp.nasaAnalogue || {};
    const player = cmp.player || {};

    const pMass = Number(player.massKg);
    const pCost = Number(player.costMusd);
    const pDays = Number(player.daysToArrival);

    function deltaLine(a, b, unit, betterWord, worseWord, digits) {
      const d = Number(a) - Number(b);
      if (!Number.isFinite(d)) return '';
      if (Math.abs(d) < 0.05) return `<u>${t('sumSame')}</u>`;
      const word = d < 0 ? betterWord : worseWord;
      return `<u>${fmtNum(Math.abs(d), digits)} ${unit} ${word}</u>`;
    }

    const rows = [];

    rows.push({
      label: t('sumMass'),
      labelEn: t('sumMassEn'),
      nasa: Number.isFinite(Number(nasa.massKg))
        ? `<b>${fmtNum(nasa.massKg, 0)}</b> <i>${t('sumUnitKg')}</i>`
        : '<b>?</b>',
      player: Number.isFinite(pMass)
        ? `<b>${fmtNum(pMass, 0)}</b> <i>${t('sumUnitKg')}</i>
           ${deltaLine(pMass, nasa.massKg, t('sumUnitKg'), t('sumBetter'), t('sumWorse'), 0)}`
        : '<b>?</b>',
    });

    rows.push({
      label: t('sumCost'),
      labelEn: t('sumCostEn'),
      nasa: Number.isFinite(Number(nasa.costMusd))
        ? `<b>${fmtNum(nasa.costMusd, 0)}</b> <i>${t('sumUnitMusd')}</i>`
        : '<b>?</b>',
      player: Number.isFinite(pCost)
        ? `<b>${fmtNum(pCost, 0)}</b> <i>${t('sumUnitMusd')}</i>
           ${Number.isFinite(Number(nasa.costMusd))
             ? deltaLine(pCost, nasa.costMusd, t('sumUnitMusd'), t('sumCheaper'), t('sumCostlier'), 0)
             : ''}`
        : '<b>?</b>',
    });

    rows.push({
      label: t('sumDays'),
      labelEn: t('sumDaysEn'),
      nasa: Number.isFinite(Number(nasa.daysToArrival))
        ? `<b>${fmtNum(nasa.daysToArrival, 1)}</b> <i>${t('sumUnitDays')}</i>`
        : '<b>?</b>',
      player: Number.isFinite(pDays)
        ? `<b>${fmtNum(pDays, 1)}</b> <i>${t('sumUnitDays')}</i>
           ${Number.isFinite(Number(nasa.daysToArrival))
             ? deltaLine(pDays, nasa.daysToArrival, t('sumUnitDays'), t('sumShorter'), t('sumLonger'), 1)
             : ''}`
        : '<b>?</b>',
    });

    rows.push({
      label: t('sumVerdict'),
      labelEn: t('sumVerdictEn'),
      nasa: '',
      player: '',
      isVerdict: true,
    });

    out.rows.innerHTML = rows
      .map((r) => {
        if (r.isVerdict) {
          return `
            <tr class="exv-tr is-verdict">
              <th scope="row"><b>${esc(r.label)}</b><em>${esc(r.labelEn)}</em></th>
              <td colspan="2"><p class="exv-verdict-cell">${esc(clean(cmp.verdictVi || ''))}</p>
              ${cmp.verdictEn ? `<p class="exv-verdict-cell is-en">${esc(clean(cmp.verdictEn))}</p>` : ''}</td>
            </tr>
          `;
        }
        return `
          <tr class="exv-tr">
            <th scope="row"><b>${esc(r.label)}</b><em>${esc(r.labelEn)}</em></th>
            <td class="exv-td-nasa">${r.nasa}</td>
            <td class="exv-td-player">${r.player}</td>
          </tr>
        `;
      })
      .join('');

    out.verdict.textContent = '';
    out.verdict.hidden = true;
  }

  /* ---------- nút ---------- */

  function onReplay() {
    if (typeof onDone === 'function') onDone({ replay: true });
  }

  function onFinish() {
    if (typeof onDone === 'function') onDone({ done: true });
  }

  /* Hạ cánh khi chưa cắm đèn hiệu: tàu đáp mù nên hỏng. Đây là đường
     thua edl_crash mà người chơi tự chọn, không phải chỉ bấm được từ
     bảng dev. Nút nằm cạnh nút đèn hiệu để thấy rõ hai lựa chọn: cắm
     đèn rồi hạ cánh, hay liều hạ cánh luôn. */
  function onLandNow() {
    if (beaconDone || edlStarted) return;
    btnLandNow.disabled = true;
    btnBeacon.disabled = true;
    out.ack.hidden = false;
    out.ack.textContent = t('landNoBeaconWarn');
    /* Đi qua requestLanding(), không phải failMission: failMission là
       hàm nội bộ của engine, không nằm trên API công khai, nên gọi
       engine.failMission luôn trả về false và nút này rơi vào nhánh
       "hạ cánh bình thường", tức là bấm khi chưa cắm đèn hiệu vẫn
       được hạ cánh thành công. requestLanding() thấy state chưa có
       groundPrepDone thì tự gọi land(), mà land() chặn ở beaconMissing
       và phát đúng kết thúc edl_crash.
       Go through requestLanding(): failMission is engine-private, so
       calling engine.failMission always missed and this button landed
       cleanly without a beacon. requestLanding() routes through
       land(), which fails with edl_crash when the beacon is missing. */
    const ok = (() => {
      if (!engine || typeof engine.requestLanding !== 'function') return false;
      try {
        const res = engine.requestLanding();
        /* requestLanding trả ok=false khi tàu đã thua. Thua vì thiếu
           đèn hiệu chính là kết quả mong muốn ở đây. */
        if (res && res.ok === false && !res.failed) return false;
        return true;
      } catch {
        return false;
      }
    })();
    if (!ok) {
      /* Engine chưa có hàm hạ cánh thì vẫn cho vào EDL bình thường,
         không để người chơi kẹt ở màn không có gì xảy ra. */
      const id = setTimeout(() => { if (!destroyed) enterEdl(); }, motionOn ? 900 : 120);
      stageTimers.push(() => clearTimeout(id));
    }
  }

  btnBeacon.addEventListener('click', onBeacon);
  if (btnLandNow) btnLandNow.addEventListener('click', onLandNow);
  btnReplay.addEventListener('click', onReplay);
  btnFinish.addEventListener('click', onFinish);

  /* ---------- co giãn khung vẽ EDL ---------- */

  let edlRo = null;
  try {
    edlRo = new ResizeObserver(() => {
      if (destroyed) return;
      if (phaseEls.edl.hidden) return;
      sizeEdlCanvas();
    });
    edlRo.observe(edlStageWrap);
  } catch {
    edlRo = null;
  }

  /* ---------- khởi động ---------- */

  const engineUnsubs = [];
  if (engine && typeof engine.subscribe === 'function') {
    try {
      const u = engine.subscribe('mission:landed', () => {
        if (destroyed || edlDone) return;
        /* Engine báo hạ cánh xong trước khi hoạt ảnh chạy hết: đợi
           hoạt ảnh, đừng nhảy cóc qua màn tổng kết. */
        if (!edlStarted) enterEdl();
      });
      if (typeof u === 'function') engineUnsubs.push(u);
    } catch {
      /* engine không có subscribe thì thôi */
    }
  }

  paintStrip({ day: 0, distanceKm: 0, delayMinutes: 0 });
  setPhase('cruise');
  startCruise();

  return {
    root,
    get phase() {
      return phase;
    },
    /* Dùng cho test và cho app cần nhảy cóc qua bước bay. */
    skipToCommand() {
      if (!commandShown) enterCommand();
    },
    skipToEdl() {
      if (!commandShown) enterCommand();
      beaconDone = true;
      enterEdl();
    },
    destroy() {
      destroyed = true;
      if (edlRaf) cancelAnimationFrame(edlRaf);
      if (waveRaf) cancelAnimationFrame(waveRaf);
      stageTimers.forEach((fn) => { try { fn(); } catch { /* bỏ qua */ } });
      stageTimers = [];
      engineUnsubs.forEach((u) => { try { u(); } catch { /* bỏ qua */ } });
      if (edlRo) edlRo.disconnect();
      if (viz && typeof viz.destroy === 'function') viz.destroy();
      if (vizFallback && typeof vizFallback.destroy === 'function') vizFallback.destroy();
      btnBeacon.removeEventListener('click', onBeacon);
    if (btnLandNow) btnLandNow.removeEventListener('click', onLandNow);
      btnReplay.removeEventListener('click', onReplay);
      btnFinish.removeEventListener('click', onFinish);
      root.remove();
    },
  };
}

export default mountExecution;
