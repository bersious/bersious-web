/* ============================================================
   feature-cml4-checklist.js
   Bước 3 của trung tâm điều khiển: bảng đèn kiểm duyệt an toàn
   trước khi phóng.

   Vai trò trong hợp đồng (phase2/CONTRACT.md, sub C): chỉ đọc
   engine, không tự tính toán vật lý. Mọi con số lấy từ
   engine.getState().

   Ba phần của màn hình:
     1. Bảy dòng đèn giao thông, xanh đạt, vàng cảnh báo nhẹ, đỏ
        là chặn phóng. Bấm một dòng thì mở thẻ giải thích tiếng
        Việt đời thường, kèm nút quay lại bước thiết kế nếu dòng
        đó đang đỏ.
     2. Hai công tắc tuân thủ. Công tắc giấy phép pin hạt nhân chỉ
        hiện khi thiết kế thật sự có pin hạt nhân.
     3. Nút phóng lớn. Bị chặn thì mờ đi và nói rõ còn vướng gì.

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
    stepTag: 'Bước 3',
    title: 'Kiểm tra an toàn trước khi phóng',
    subtitle: 'Bảng đèn kiểm duyệt bốn nhóm, kiểu CML 4 của NASA',
    subtitleNasa: 'CML 4 RYG Checklist',
    countsOk: 'đạt',
    countsWarn: 'cảnh báo',
    countsFail: 'nguy hiểm',
    legendOk: 'Xanh: đạt, phóng được',
    legendWarn: 'Vàng: cảnh báo nhẹ, vẫn phóng được nhưng nên xem lại',
    legendFail: 'Đỏ: nguy hiểm, cấm phóng',
    rowOpen: 'Mở giải thích',
    rowClose: 'Đóng giải thích',
    help: 'Giải thích mục này',
    cause: 'Chuyện gì đang xảy ra',
    fixable: 'Mục này đang đỏ nên chưa phóng được.',
    back: 'Quay lại sửa thiết kế',
    switchesTitle: 'Cam kết tuân thủ',
    switchesSub: 'Hai giấy tờ bắt buộc trước khi rời bệ phóng',
    sterilizeName: 'Khử trùng tàu vũ trụ',
    sterilizeNasa: 'Planetary Protection',
    sterilizeWhy: 'Làm sạch vi khuẩn Trái Đất trên vỏ tàu để không làm ô nhiễm môi trường Sao Hỏa.',
    rtgName: 'Giấy phép an toàn pin hạt nhân',
    rtgNasa: 'RTG Launch Approval',
    rtgWhy: 'Pin hạt nhân phải được cấp phép trước khi phóng vì lý do an toàn.',
    rtgHidden: 'Thiết kế này không dùng pin hạt nhân nên không cần giấy phép này.',
    on: 'Đã bật',
    off: 'Chưa bật',
    launch: 'PHÓNG TÊN LỬA',
    launchEn: 'Launch',
    ready: 'Đủ điều kiện phóng. Bấm nút để rời bệ phóng.',
    blockedRedOne: 'Còn một mục đỏ chưa xử lý.',
    blockedRedMany: 'Còn {n} mục đỏ chưa xử lý.',
    blockedSterilize: 'Chưa bật công tắc khử trùng tàu vũ trụ.',
    blockedRtg: 'Chưa bật công tắc giấy phép pin hạt nhân.',
    launching: 'Đang phóng.',
    emptyChecks: 'Chưa có dữ liệu kiểm duyệt. Quay lại bước thiết kế để chọn thiết bị.',
    footNote: 'Bảng đèn đọc thẳng từ bộ tính toán của sứ mệnh. Mỗi mục là một giới hạn thật, không phải điểm trang trí. Bấm vào một dòng để đọc lý do bằng tiếng Việt đời thường.',
    footNoteEn: 'The light board reads straight from the mission calculator. Every row is a real limit, not decoration.',
  },
  en: {
    stepTag: 'Step 3',
    title: 'Safety check before launch',
    subtitle: 'Four group review board, NASA CML 4 style',
    subtitleNasa: 'CML 4 RYG Checklist',
    countsOk: 'pass',
    countsWarn: 'warning',
    countsFail: 'danger',
    legendOk: 'Green: pass, cleared to fly',
    legendWarn: 'Yellow: mild warning, still cleared but worth a look',
    legendFail: 'Red: danger, launch forbidden',
    rowOpen: 'Open explanation',
    rowClose: 'Close explanation',
    help: 'Explain this item',
    cause: 'What is going on',
    fixable: 'This item is red, so launch is blocked.',
    back: 'Back to design',
    switchesTitle: 'Compliance commitments',
    switchesSub: 'Two papers required before leaving the pad',
    sterilizeName: 'Spacecraft sterilization',
    sterilizeNasa: 'Planetary Protection',
    sterilizeWhy: 'Clean Earth microbes off the hull so we do not contaminate the Martian environment.',
    rtgName: 'Nuclear battery safety licence',
    rtgNasa: 'RTG Launch Approval',
    rtgWhy: 'A nuclear battery must be licensed before launch for safety reasons.',
    rtgHidden: 'This design carries no nuclear battery, so this licence is not required.',
    on: 'On',
    off: 'Off',
    launch: 'LAUNCH THE ROCKET',
    launchEn: 'Phóng',
    ready: 'Cleared for launch. Press the button to leave the pad.',
    blockedRedOne: 'One red item is still unresolved.',
    blockedRedMany: '{n} red items are still unresolved.',
    blockedSterilize: 'The spacecraft sterilization switch is still off.',
    blockedRtg: 'The nuclear battery licence switch is still off.',
    launching: 'Launching.',
    emptyChecks: 'No review data yet. Go back to the design step and pick parts.',
    footNote: 'The light board reads straight from the mission calculator. Every row is a real limit, not decoration.',
    footNoteEn: 'Bảng đèn đọc thẳng từ bộ tính toán của sứ mệnh.',
  },
};

/* ---------- nhãn dễ hiểu cho từng mục kiểm tra ----------
   Engine trả id, labelKey, detail. Nhãn đời thường nằm ở đây để
   sub C không phải sửa i18n.js. Nếu engine tự gửi labelVi hoặc
   labelEn thì dùng bản của engine trước. */

const LABELS = {
  mass_margin: {
    vi: 'Khối lượng có vừa tên lửa không',
    en: 'Does the mass fit the rocket',
    nasa: 'Mass Margin',
  },
  power: {
    vi: 'Điện phát ra có đủ dùng không',
    en: 'Is there enough power',
    nasa: 'Power Generation vs Load',
  },
  power_margin: {
    vi: 'Điện phát ra có đủ dùng không',
    en: 'Is there enough power',
    nasa: 'Power Margin',
  },
  comms: {
    vi: 'Sóng liên lạc có về tới Trái Đất không',
    en: 'Can the signal reach Earth',
    nasa: 'Telecommunications Link Margin',
  },
  comms_margin: {
    vi: 'Sóng liên lạc có về tới Trái Đất không',
    en: 'Can the signal reach Earth',
    nasa: 'Telecommunications Link Margin',
  },
  comms_link: {
    vi: 'Sóng liên lạc có về tới Trái Đất không',
    en: 'Can the signal reach Earth',
    nasa: 'Telecom Link Margin',
  },
  life_support: {
    vi: 'Người trên tàu có đủ không khí và nước không',
    en: 'Do the crew have air and water',
    nasa: 'ECLSS Life Support Margin',
  },
  life: {
    vi: 'Người trên tàu có đủ không khí và nước không',
    en: 'Do the crew have air and water',
    nasa: 'Life Support Margin',
  },
  delta_v: {
    vi: 'Nhiên liệu có đủ để bay tới Sao Hỏa không',
    en: 'Is there enough fuel to reach Mars',
    nasa: 'Delta-v Budget',
  },
  propellant: {
    vi: 'Nhiên liệu có đủ để bay tới Sao Hỏa không',
    en: 'Is there enough fuel to reach Mars',
    nasa: 'Propellant Budget',
  },
  edl: {
    vi: 'Có đủ đồ để hạ cánh an toàn không',
    en: 'Is there enough gear to land safely',
    nasa: 'EDL Capability',
  },
  thermal: {
    vi: 'Tàu có chịu được lạnh và nóng không',
    en: 'Can the craft survive heat and cold',
    nasa: 'Thermal Control',
  },
  radiation: {
    vi: 'Kíp bay có được che bức xạ không',
    en: 'Is the crew shielded from radiation',
    nasa: 'Radiation Shielding',
  },
  launch_window: {
    vi: 'Có cửa sổ phóng kịp không',
    en: 'Is there a launch window in time',
    nasa: 'Launch Window',
  },
  schedule: {
    vi: 'Có kịp tới trước khi đồng đội hết thời gian không',
    en: 'Will we arrive before the crew runs out of time',
    nasa: 'Schedule Margin',
  },
  rtg: {
    vi: 'Pin hạt nhân có được cấp phép chưa',
    en: 'Is the nuclear battery licensed',
    nasa: 'RTG Launch Approval',
  },
  sterilized: {
    vi: 'Tàu đã khử trùng chưa',
    en: 'Is the spacecraft sterilized',
    nasa: 'Planetary Protection',
  },
  rtg_approved: {
    vi: 'Pin hạt nhân đã được cấp phép chưa',
    en: 'Is the nuclear battery licensed',
    nasa: 'RTG Launch Approval',
  },
};

/* Từ điển dự phòng, dùng khi engine trả một id lạ mà bảng trên
   chưa có. Ghép từ khoá trong id thành một câu tiếng Việt đọc
   được, không để lộ id thô ra màn hình. */
const TOKENS = [
  [/mass|weight|khoi/, 'Khối lượng có vừa tên lửa không', 'Does the mass fit the rocket', 'Mass Margin'],
  [/power|dien|energy|solar/, 'Điện phát ra có đủ dùng không', 'Is there enough power', 'Power Margin'],
  [/comm|signal|radio|dsn|anten/, 'Sóng liên lạc có về tới Trái Đất không', 'Can the signal reach Earth', 'Telecom Link Margin'],
  [/life|eclss|oxygen|air|water/, 'Người trên tàu có đủ không khí và nước không', 'Do the crew have air and water', 'Life Support Margin'],
  [/delta|fuel|propel|tank|isp/, 'Nhiên liệu có đủ để bay tới Sao Hỏa không', 'Is there enough fuel to reach Mars', 'Delta-v Budget'],
  [/edl|land|parachute|heat_?shield/, 'Có đủ đồ để hạ cánh an toàn không', 'Is there enough gear to land safely', 'EDL Capability'],
  [/thermal|temp|heat/, 'Tàu có chịu được lạnh và nóng không', 'Can the craft survive heat and cold', 'Thermal Control'],
  [/radiat|shield/, 'Kíp bay có được che bức xạ không', 'Is the crew shielded from radiation', 'Radiation Shielding'],
  [/window|schedule|time|sol/, 'Có kịp tới trước khi đồng đội hết thời gian không', 'Will we arrive in time', 'Schedule Margin'],
  [/struct|bus|slot/, 'Kết cấu có chở nổi các thiết bị không', 'Can the structure carry the parts', 'Structural Capacity'],
];

function labelFor(check) {
  const id = String(check && check.id ? check.id : '');
  const known = LABELS[id];
  if (known) {
    return {
      vi: check.labelVi || known.vi,
      en: check.labelEn || known.en,
      nasa: check.labelNasa || known.nasa,
    };
  }
  const low = id.toLowerCase();
  for (const row of TOKENS) {
    if (row[0].test(low)) {
      return { vi: check.labelVi || row[1], en: check.labelEn || row[2], nasa: check.labelNasa || row[3] };
    }
  }
  /* Không nhận ra: dùng chính nhãn engine gửi, hoặc một câu chung
     chung nhưng vẫn đọc được. */
  const fallbackName = check.labelVi || check.label || check.nameVi || id.replace(/[_-]+/g, ' ');
  return {
    vi: check.labelVi || 'Mục kiểm tra an toàn',
    en: check.labelEn || 'Safety check item',
    nasa: check.labelNasa || String(fallbackName),
  };
}

/* ---------- tiện ích ---------- */

const VI_NUM = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];

function viCount(n) {
  return n >= 0 && n <= 10 ? VI_NUM[n] : String(n);
}

function fill(str, vars) {
  let s = str;
  for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* '-', em dash, en dash: dự án cấm hiển thị. Chuỗi lấy từ engine
   cũng phải đi qua đây, phòng khi bên kia lỡ tay. */
function clean(str) {
  return String(str == null ? '' : str).replace(/\s*[\u2013\u2014]\s*/g, ' - ');
}

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css-cml4.css';
  link.dataset.featureCss = 'cml4';
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

/* ---------- module chính ---------- */

export function mountCml4({ container, engine, onNext } = {}) {
  if (!container) throw new Error('mountCml4 cần container');
  injectCss();

  const t = (key) => (T.vi[key] != null ? T.vi[key] : key);
  const e = (key) => (T.en[key] != null ? T.en[key] : key);

  /* ---------- khung DOM ---------- */

  const root = document.createElement('section');
  root.className = 'cm4';
  root.setAttribute('aria-label', t('title'));
  root.innerHTML = `
    <header class="cm4-head">
      <div class="cm4-head-text">
        <p class="cm4-tag">
          <span class="cm4-tag-step">${esc(t('stepTag'))}</span>
          <span class="cm4-tag-sep" aria-hidden="true"></span>
          <span class="cm4-tag-en">Step 3</span>
        </p>
        <h2 class="cm4-title">
          <span class="cm4-title-vi">${esc(t('title'))}</span>
          <span class="cm4-title-en">${esc(e('title'))}</span>
        </h2>
        <p class="cm4-sub">
          <span class="cm4-sub-vi">${esc(t('subtitle'))}</span>
          <span class="cm4-sub-nasa">${esc(t('subtitleNasa'))}</span>
        </p>
      </div>
      <ul class="cm4-counts" aria-live="polite">
        <li class="cm4-count is-ok"><i class="cm4-dot is-green" aria-hidden="true"></i><b data-count="green">0</b><span>${esc(t('countsOk'))}</span></li>
        <li class="cm4-count is-warn"><i class="cm4-dot is-yellow" aria-hidden="true"></i><b data-count="yellow">0</b><span>${esc(t('countsWarn'))}</span></li>
        <li class="cm4-count is-fail"><i class="cm4-dot is-red" aria-hidden="true"></i><b data-count="red">0</b><span>${esc(t('countsFail'))}</span></li>
      </ul>
    </header>

    <div class="cm4-body">
      <div class="cm4-col-main">
        <ul class="cm4-list" role="list"></ul>
        <p class="cm4-empty" hidden></p>

        <ul class="cm4-legend" aria-hidden="true">
          <li><i class="cm4-dot is-green"></i><span>${esc(t('legendOk'))}</span></li>
          <li><i class="cm4-dot is-yellow"></i><span>${esc(t('legendWarn'))}</span></li>
          <li><i class="cm4-dot is-red"></i><span>${esc(t('legendFail'))}</span></li>
        </ul>
      </div>

      <aside class="cm4-col-side">
        <div class="cm4-switches">
          <h3 class="cm4-side-title">
            <span>${esc(t('switchesTitle'))}</span>
            <em>${esc(e('switchesTitle'))}</em>
          </h3>
          <p class="cm4-side-sub">${esc(t('switchesSub'))}</p>
          <div class="cm4-switch-list"></div>
          <p class="cm4-switch-note" hidden></p>
        </div>

        <div class="cm4-launch">
          <button type="button" class="cm4-launch-btn" disabled aria-describedby="cm4-block-msg">
            <span class="cm4-launch-label">${esc(t('launch'))}</span>
            <span class="cm4-launch-sub">${esc(t('launchEn'))}</span>
            <svg class="cm4-launch-lock" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                 stroke-width="1.5" aria-hidden="true">
              <rect x="3.4" y="7.2" width="9.2" height="6.4" rx="1"></rect>
              <path d="M5.7 7.2V5.1a2.3 2.3 0 0 1 4.6 0v2.1"></path>
            </svg>
          </button>
          <p class="cm4-block-msg" id="cm4-block-msg" role="status" aria-live="polite"></p>
        </div>
      </aside>
    </div>

    <footer class="cm4-foot">
      <span class="cm4-foot-rule"></span>
      <p class="cm4-foot-note">${esc(t('footNote'))}<em>${esc(t('footNoteEn'))}</em></p>
    </footer>
  `;
  container.appendChild(root);

  const listEl = root.querySelector('.cm4-list');
  const emptyEl = root.querySelector('.cm4-empty');
  const switchListEl = root.querySelector('.cm4-switch-list');
  const switchNoteEl = root.querySelector('.cm4-switch-note');
  const launchBtn = root.querySelector('.cm4-launch-btn');
  const blockMsg = root.querySelector('.cm4-block-msg');
  const countEls = {
    green: root.querySelector('[data-count="green"]'),
    yellow: root.querySelector('[data-count="yellow"]'),
    red: root.querySelector('[data-count="red"]'),
  };

  /* ---------- trạng thái cục bộ ---------- */

  let openId = null;         /* id dòng đang mở giải thích */
  let lastState = null;
  let launching = false;
  let destroyed = false;
  let motionOn = readMotion();

  /* ---------- đọc engine an toàn ---------- */

  function readState() {
    if (!engine || typeof engine.getState !== 'function') return null;
    try {
      return engine.getState() || null;
    } catch {
      return null;
    }
  }

  function checksOf(state) {
    if (!state) return [];
    if (Array.isArray(state.checks)) return state.checks;
    if (state.checks && Array.isArray(state.checks.items)) return state.checks.items;
    return [];
  }

  function statusOf(check) {
    const raw = String((check && check.status) || '').toLowerCase();
    if (raw === 'red' || raw === 'fail' || raw === 'danger') return 'red';
    if (raw === 'yellow' || raw === 'warn' || raw === 'warning') return 'yellow';
    if (raw === 'green' || raw === 'ok' || raw === 'pass') return 'green';
    /* Engine cũ có thể chỉ trả pass: true/false */
    if (check && check.pass === true) return 'green';
    if (check && check.pass === false) return 'red';
    return 'yellow';
  }

  /* Thiết kế có pin hạt nhân không. Ưu tiên cờ engine tự khai, rồi
     soi danh sách module và lựa chọn nguồn điện. */
  function hasNuclearPower(state) {
    if (!state) return false;
    if (typeof state.hasNuclearPower === 'boolean') return state.hasNuclearPower;
    if (state.compliance && typeof state.compliance.rtgRequired === 'boolean') {
      return state.compliance.rtgRequired;
    }
    const sel = state.selection || {};
    const ids = Array.isArray(sel.moduleIds) ? sel.moduleIds : [];
    const hay = ids.concat([sel.power, sel.rtg, sel.nuclear]).filter(Boolean).join(' ').toLowerCase();
    return /rtg|mmrtg|nuclear|ntp|pu_?238|plutonium/.test(hay);
  }

  function complianceOf(state) {
    const c = (state && state.compliance) || {};
    return { sterilized: !!c.sterilized, rtg_approved: !!c.rtg_approved };
  }

  /* ---------- vẽ danh sách đèn ---------- */

  function renderChecks(state) {
    const checks = checksOf(state);
    const counts = { green: 0, yellow: 0, red: 0 };

    listEl.innerHTML = checks
      .map((check, i) => {
        const id = String(check && check.id != null ? check.id : 'check_' + i);
        const status = statusOf(check);
        counts[status] += 1;
        const lb = labelFor(check || {});
        const open = openId === id;
        const statusWord = status === 'green' ? t('countsOk') : status === 'yellow' ? t('countsWarn') : t('countsFail');
        const detailVi = clean(check && check.detailVi ? check.detailVi : '');
        const detailEn = clean(check && check.detailEn ? check.detailEn : '');
        return `
          <li class="cm4-item is-${status}${open ? ' is-open' : ''}" data-id="${esc(id)}">
            <div class="cm4-row" role="button" tabindex="0"
                 aria-expanded="${open ? 'true' : 'false'}"
                 aria-controls="cm4-detail-${esc(id)}"
                 aria-label="${esc(lb.vi)}: ${esc(statusWord)}">
              <span class="cm4-light" aria-hidden="true"><i class="cm4-dot is-${status === 'green' ? 'green' : status === 'yellow' ? 'yellow' : 'red'}"></i></span>
              <span class="cm4-row-text">
                <b class="cm4-row-label">${esc(lb.vi)}</b>
                <em class="cm4-row-label-en">${esc(lb.en)}</em>
                <span class="cm4-row-nasa">(${esc(lb.nasa)})</span>
              </span>
              <span class="cm4-row-status">${esc(statusWord)}</span>
              <button type="button" class="cm4-help" aria-label="${esc(t('help'))}: ${esc(lb.vi)}" title="${esc(t('help'))}">?</button>
            </div>
            <div class="cm4-detail" id="cm4-detail-${esc(id)}" role="region" ${open ? '' : 'hidden'}>
              <p class="cm4-detail-k">${esc(t('cause'))}</p>
              <p class="cm4-detail-vi">${esc(detailVi || t('emptyChecks'))}</p>
              ${detailEn ? `<p class="cm4-detail-en">${esc(detailEn)}</p>` : ''}
              ${status === 'red' ? `
                <p class="cm4-detail-warn">${esc(t('fixable'))}</p>
                <button type="button" class="cm4-back">${esc(t('back'))}<em>Back to design</em></button>
              ` : ''}
            </div>
          </li>
        `;
      })
      .join('');

    emptyEl.hidden = checks.length > 0;
    if (!checks.length) emptyEl.textContent = t('emptyChecks');

    countEls.green.textContent = String(counts.green);
    countEls.yellow.textContent = String(counts.yellow);
    countEls.red.textContent = String(counts.red);
    return counts;
  }

  /* ---------- công tắc ---------- */

  function renderSwitches(state) {
    const comp = complianceOf(state);
    const nuclear = hasNuclearPower(state);

    const rows = [
      {
        key: 'sterilized',
        name: t('sterilizeName'),
        nasa: t('sterilizeNasa'),
        why: t('sterilizeWhy'),
        on: comp.sterilized,
        required: true,
      },
    ];
    if (nuclear) {
      rows.push({
        key: 'rtg_approved',
        name: t('rtgName'),
        nasa: t('rtgNasa'),
        why: t('rtgWhy'),
        on: comp.rtg_approved,
        required: true,
      });
    }

    switchListEl.innerHTML = rows
      .map(
        (r) => `
        <div class="cm4-switch" data-key="${esc(r.key)}">
          <button type="button" class="cm4-sw" role="switch"
                  aria-checked="${r.on ? 'true' : 'false'}"
                  aria-labelledby="cm4-sw-l-${esc(r.key)}"
                  data-key="${esc(r.key)}" data-value="${r.on ? '1' : '0'}">
            <span class="cm4-sw-track" aria-hidden="true"><span class="cm4-sw-knob"></span></span>
            <span class="cm4-sw-state">${esc(r.on ? t('on') : t('off'))}</span>
          </button>
          <div class="cm4-sw-text">
            <b class="cm4-sw-name" id="cm4-sw-l-${esc(r.key)}">${esc(r.name)}</b>
            <span class="cm4-sw-nasa">(${esc(r.nasa)})</span>
            <p class="cm4-sw-why">${esc(r.why)}</p>
          </div>
        </div>
      `
      )
      .join('');

    /* Ghi chú chỉ hiện khi thiết kế không có pin hạt nhân, để người
       chơi không tưởng là mình bỏ sót một công tắc. */
    switchNoteEl.hidden = nuclear;
    if (!nuclear) switchNoteEl.textContent = t('rtgHidden');

    return { rows, comp, nuclear };
  }

  /* ---------- nút phóng ---------- */

  function renderLaunch(state, counts) {
    const comp = complianceOf(state);
    const nuclear = hasNuclearPower(state);
    const red = counts.red;
    const missing = [];
    if (!comp.sterilized) missing.push(t('blockedSterilize'));
    if (nuclear && !comp.rtg_approved) missing.push(t('blockedRtg'));

    if (red > 0) {
      missing.unshift(
        red === 1 ? t('blockedRedOne') : fill(t('blockedRedMany'), { n: viCount(red) })
      );
    }

    const blocked = missing.length > 0;
    launchBtn.disabled = blocked || launching;
    launchBtn.classList.toggle('is-ready', !blocked);
    launchBtn.setAttribute('aria-disabled', blocked ? 'true' : 'false');

    if (launching) {
      blockMsg.textContent = t('launching');
      blockMsg.classList.remove('is-block');
    } else if (blocked) {
      blockMsg.textContent = missing.join(' ');
      blockMsg.classList.add('is-block');
    } else {
      blockMsg.textContent = t('ready');
      blockMsg.classList.remove('is-block');
    }
    return { blocked, comp, nuclear, red };
  }

  /* ---------- vẽ lại toàn bộ ---------- */

  function render() {
    if (destroyed) return;
    const state = readState();
    lastState = state;
    const counts = renderChecks(state);
    renderSwitches(state);
    renderLaunch(state, counts);
  }

  /* ---------- sự kiện ---------- */

  function detailOf(li) {
    return li ? li.querySelector('.cm4-detail') : null;
  }

  function toggleItem(li, force) {
    if (!li) return;
    const id = li.dataset.id;
    const willOpen = force === undefined ? !li.classList.contains('is-open') : force;
    /* Chỉ một thẻ mở ở một lúc, để bảng không dài lê thê trên điện
       thoại. Mở cái mới là đóng cái cũ. */
    listEl.querySelectorAll('.cm4-item.is-open').forEach((other) => {
      if (other === li) return;
      other.classList.remove('is-open');
      const d = detailOf(other);
      if (d) d.hidden = true;
      const r = other.querySelector('.cm4-row');
      if (r) r.setAttribute('aria-expanded', 'false');
    });
    li.classList.toggle('is-open', willOpen);
    const d = detailOf(li);
    if (d) d.hidden = !willOpen;
    const r = li.querySelector('.cm4-row');
    if (r) r.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    openId = willOpen ? id : null;
  }

  function onListClick(ev) {
    const back = ev.target.closest('.cm4-back');
    if (back) {
      ev.preventDefault();
      if (typeof onNext === 'function') onNext({ back: true });
      return;
    }
    const help = ev.target.closest('.cm4-help');
    if (help) {
      ev.preventDefault();
      ev.stopPropagation();
      const li = help.closest('.cm4-item');
      toggleItem(li, true);
      return;
    }
    const row = ev.target.closest('.cm4-row');
    if (!row) return;
    toggleItem(row.closest('.cm4-item'));
  }

  function onListKey(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
    const row = ev.target.closest('.cm4-row');
    if (!row || ev.target.closest('.cm4-help')) return;
    ev.preventDefault();
    toggleItem(row.closest('.cm4-item'));
  }

  function onSwitchClick(ev) {
    const btn = ev.target.closest('.cm4-sw');
    if (!btn) return;
    if (!engine || typeof engine.updateCompliance !== 'function') return;
    const key = btn.dataset.key;
    const value = btn.dataset.value !== '1';
    /* Đổi ngay trên DOM cho phản hồi tức thì, rồi để engine phát
       state:changed vẽ lại lần nữa cho khớp sự thật. */
    btn.dataset.value = value ? '1' : '0';
    btn.setAttribute('aria-checked', value ? 'true' : 'false');
    const stateEl = btn.querySelector('.cm4-sw-state');
    if (stateEl) stateEl.textContent = value ? t('on') : t('off');
    engine.updateCompliance({ key, value });
  }

  function onLaunchClick() {
    if (launchBtn.disabled || launching) return;
    const state = readState();
    const counts = renderCountsFromState(state);
    if (counts.red > 0) return;
    const comp = complianceOf(state);
    if (!comp.sterilized) return;
    if (hasNuclearPower(state) && !comp.rtg_approved) return;

    launching = true;
    renderLaunch(state, counts);
    launchBtn.classList.add('is-firing');

    if (typeof engine.launchMission === 'function') {
      try {
        engine.launchMission();
      } catch {
        /* engine hỏng thì vẫn để người chơi đi tiếp, app sẽ báo lỗi */
      }
    }
    if (typeof onNext === 'function') {
      const delay = motionOn ? 420 : 0;
      if (delay) setTimeout(() => { if (!destroyed) onNext(); }, delay);
      else onNext();
    }
  }

  function renderCountsFromState(state) {
    const counts = { green: 0, yellow: 0, red: 0 };
    checksOf(state).forEach((c) => { counts[statusOf(c)] += 1; });
    return counts;
  }

  listEl.addEventListener('click', onListClick);
  listEl.addEventListener('keydown', onListKey);
  switchListEl.addEventListener('click', onSwitchClick);
  launchBtn.addEventListener('click', onLaunchClick);

  /* ---------- nghe engine ---------- */

  let unsubs = [];
  if (engine && typeof engine.subscribe === 'function') {
    try {
      const u = engine.subscribe('state:changed', () => render());
      if (typeof u === 'function') unsubs.push(u);
      const u2 = engine.subscribe('step:changed', () => render());
      if (typeof u2 === 'function') unsubs.push(u2);
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
      listEl.removeEventListener('click', onListClick);
      listEl.removeEventListener('keydown', onListKey);
      switchListEl.removeEventListener('click', onSwitchClick);
      launchBtn.removeEventListener('click', onLaunchClick);
      root.remove();
    },
  };
}

export default mountCml4;
