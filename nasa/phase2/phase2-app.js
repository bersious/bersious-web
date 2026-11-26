/* ============================================================
   phase2/phase2-app.js
   Khung ứng dụng Trung tâm Điều khiển Sứ mệnh, Giai đoạn 2.

   Nhiệm vụ:
     1. Dựng ba vùng theo CONTRACT: thanh trạng thái 56px, sân khấu
        trung tâm, thanh thao tác dưới.
     2. Nạp mềm từng feature bằng import động trong try/catch. File nào
        chưa có thì hiện khung chờ có nội dung thật, không văng lỗi.
        File nào xuất hiện thì tự hiện nội dung ở lần vào bước đó.
     3. Nối bốn bước: cml1 -> cml3 -> cml4 -> execution -> tổng kết.
     4. Nghe engine: state:changed, step:changed, mission:landed.

   Mọi chữ đều song ngữ VI + EN, giữ tại chỗ trong CHUỖI dưới đây.
   Không dùng dấu gạch dài trong bất kỳ chuỗi hiển thị nào.
   ============================================================ */

/* Đường dẫn tuyệt đối tính từ chính file này. Không dùng location.href. */
const BASE = new URL('.', import.meta.url).href;

/* ============================================================
   CHUỖI SONG NGỮ
   ============================================================ */

const CHUOI = {
  vi: {
    'brand.eyebrow': 'Ares III · Điều khiển sứ mệnh',
    'brand.name': 'Trung tâm điều khiển',

    'dsn.label': 'Sóng DSN',
    'dsn.scanning': 'Đang quét',
    'dsn.locked': 'Đã khoá',
    'dsn.lost': 'Mất sóng',

    'delay.label': 'Trễ liên lạc',
    'delay.unit': 'phút',

    'survival.label': 'Đồng đội còn sống',
    'survival.unit': 'sol',

    'step.1': 'Mục tiêu',
    'step.2': 'Lắp tàu',
    'step.3': 'Duyệt phóng',
    'step.4': 'Bay và hạ cánh',

    'steps.aria': 'Bốn bước thiết kế sứ mệnh',

    'btn.prev': 'Bước trước',
    'btn.settings': 'Cài đặt',
    'nav.next': 'Tiếp',
    'nav.done': 'Hoàn tất',
    'btn.lang': 'Đổi ngôn ngữ',

    'board.aria': 'Bốn thanh đo an toàn của thiết kế',
    'board.time': 'Thời gian',
    'board.mass': 'Khối lượng',
    'board.power': 'Điện',
    'board.comms': 'Liên lạc',
    'board.of': 'trên',
    'wait.note': 'Đang tải bước này',
    'wait.note2': 'Phần nội dung của bước do một nhóm khác dựng. Khung đã sẵn sàng và sẽ tự hiện khi tệp được thêm vào thư mục phase2.',
    'wait.item1': 'Khung ba vùng đã dựng',
    'wait.item2': 'Engine đã nối',
    'wait.item3': 'Chờ tệp feature',

    'hint.default': 'Chọn một cấu hình ở khung giữa màn hình. Nút chuyển bước nằm ở thanh dưới cùng.',
    'hint.review': 'Đọc bảng đèn kiểm duyệt. Mọi mục đỏ phải chuyển xanh trước khi phóng.',

    'toast.landed': 'Tàu đã hạ cánh. Đồng đội đã nhận được tiếp tế.',
    'toast.launched': 'Đã phóng. Tàu đang trên đường tới Sao Hỏa.',
    'toast.failed': 'Sứ mệnh thất bại. Kiểm tra lại bảng đèn kiểm duyệt.',

    'set.title': 'Cài đặt',
    'set.close': 'Đóng',
    'set.lang': 'Ngôn ngữ',
    'set.lang.desc': 'Đổi ngôn ngữ cho toàn bộ giao diện Giai đoạn 2.',
    'set.motion': 'Hiệu ứng chuyển động',
    'set.motion.desc': 'Tắt để giảm chuyển động khi chóng mặt hoặc máy yếu.',
    'set.on': 'Bật',
    'set.off': 'Tắt',

    'sum.kicker': 'Bước 4 · Hoàn tất',
    'sum.title': 'Sứ mệnh hoàn tất',
    'sum.sub': 'Tàu cứu hộ đã hạ cánh và đồng đội trên Sao Hỏa đã có tiếp tế.',
    'sum.compare': 'So với kiến trúc tham chiếu của NASA',
    'sum.player': 'Thiết kế của bạn',
    'sum.mass': 'Khối lượng phóng',
    'sum.cost': 'Kinh phí',
    'sum.days': 'Thời gian bay',
    'sum.again': 'Thiết kế lại từ đầu',
    'sum.none': 'Chưa có số liệu so sánh.',
    'sum.unit.kg': 'kg',
    'sum.unit.musd': 'triệu USD',
    'sum.unit.days': 'ngày',
  },
  en: {
    'brand.eyebrow': 'Ares III · Mission control',
    'brand.name': 'Mission control center',

    'dsn.label': 'DSN link',
    'dsn.scanning': 'Acquiring',
    'dsn.locked': 'Locked',
    'dsn.lost': 'No signal',

    'delay.label': 'Signal delay',
    'delay.unit': 'min',

    'survival.label': 'Crew survival',
    'survival.unit': 'sols',

    'step.1': 'Objective',
    'step.2': 'Assemble',
    'step.3': 'Flight review',
    'step.4': 'Fly and land',

    'steps.aria': 'The four mission design steps',

    'btn.prev': 'Previous step',
    'btn.settings': 'Settings',
    'nav.next': 'Next',
    'nav.done': 'Complete',
    'btn.lang': 'Switch language',

    'board.aria': 'The four safety gauges of the design',
    'board.time': 'Time',
    'board.mass': 'Mass',
    'board.power': 'Power',
    'board.comms': 'Comms',
    'board.of': 'of',
    'wait.note': 'Loading this step',
    'wait.note2': 'This step is built by another team member. The frame is ready and will show the content as soon as the file lands in the phase2 folder.',
    'wait.item1': 'Three zone frame ready',
    'wait.item2': 'Engine connected',
    'wait.item3': 'Waiting for feature file',

    'hint.default': 'Pick a configuration in the centre panel. The next button sits in the bar at the bottom.',
    'hint.review': 'Read the review light board. Every red item has to turn green before launch.',

    'toast.landed': 'The ship has landed. The crew has supplies.',
    'toast.launched': 'Launched. The ship is on its way to Mars.',
    'toast.failed': 'Mission failed. Check the review light board again.',

    'set.title': 'Settings',
    'set.close': 'Close',
    'set.lang': 'Language',
    'set.lang.desc': 'Changes the language of the whole Phase 2 interface.',
    'set.motion': 'Motion effects',
    'set.motion.desc': 'Turn off to reduce movement if it makes you dizzy or on slow hardware.',
    'set.on': 'On',
    'set.off': 'Off',

    'sum.kicker': 'Step 4 · Complete',
    'sum.title': 'Mission complete',
    'sum.sub': 'The rescue ship has landed and the crew on Mars has supplies.',
    'sum.compare': 'Against the NASA reference architecture',
    'sum.player': 'Your design',
    'sum.mass': 'Launch mass',
    'sum.cost': 'Cost',
    'sum.days': 'Transit time',
    'sum.again': 'Design again from scratch',
    'sum.none': 'No comparison figures yet.',
    'sum.unit.kg': 'kg',
    'sum.unit.musd': 'million USD',
    'sum.unit.days': 'days',
  },
};

/* ============================================================
   NGÔN NGỮ
   Ưu tiên i18n.js của dự án để khoá ngôn ngữ dùng chung toàn game.
   Nếu tệp đó không nạp được thì tự giữ ngôn ngữ riêng.
   ============================================================ */

const LANG_KEY = 'smdg.lang';

let i18n = null;
let lang = 'vi';

try {
  lang = localStorage.getItem(LANG_KEY) || 'vi';
} catch (e) {
  lang = 'vi';
}

function t(key) {
  const table = CHUOI[lang] || CHUOI.vi;
  const val = table[key];
  if (val !== undefined) return val;
  const back = CHUOI.vi[key];
  return back !== undefined ? back : key;
}

/* ============================================================
   TIỆN ÍCH
   ============================================================ */

/* Số kiểu Việt dùng dấu phẩy thập phân, kiểu Anh dùng dấu chấm. */
function fmtSo(v, digits) {
  const n = Number(v);
  if (!isFinite(n)) return '0';
  const d = digits === undefined ? 0 : digits;
  let s = n.toFixed(d);
  if (lang === 'vi') s = s.replace('.', ',');
  return s;
}

/* Rút gọn số lớn: 36010 -> 36.010 (VI) hoặc 36,010 (EN). */
function fmtNgan(v) {
  const n = Math.round(Number(v) || 0);
  return n.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

/* ============================================================
   ICON
   Mỗi icon là một tệp SVG riêng trong assets/. Dùng thẻ img để
   tránh nhúng chuỗi SVG vào JS, và để currentColor không áp được
   thì vẫn đổi màu bằng bộ lọc. Với icon cần đổi màu theo trạng
   thái, nạp inline qua fetch một lần rồi thay bằng <svg>.
   ============================================================ */

const ICON_FILES = {
  rocket: 'icon-rocket.svg',
  solar: 'icon-solar.svg',
  rtg: 'icon-rtg.svg',
  dish: 'icon-dish.svg',
  lander: 'icon-lander.svg',
  supplies: 'icon-supplies.svg',
  beacon: 'icon-beacon.svg',
  countdown: 'icon-countdown.svg',
  signal: 'icon-signal.svg',
  settings: 'icon-settings.svg',
};

/* Ảnh SVG nạp bằng <img> không nhận currentColor của trang, nên icon
   nào cần đổi màu theo trạng thái sẽ được nạp nội dung một lần và
   nhúng thẳng vào DOM. Icon tĩnh thì dùng <img> cho nhẹ. */
const iconCache = new Map();

async function iconInline(name) {
  if (iconCache.has(name)) return iconCache.get(name);
  const file = ICON_FILES[name];
  if (!file) return null;
  try {
    const res = await fetch(new URL('assets/' + file, BASE).href);
    if (!res.ok) throw new Error('icon ' + name + ' HTTP ' + res.status);
    const text = await res.text();
    iconCache.set(name, text);
    return text;
  } catch (e) {
    iconCache.set(name, null);
    return null;
  }
}

/* Chèn icon vào một ô. Trả về ô đó ngay, nội dung điền sau. */
function iconSlot(host, name, cls) {
  /* Nếu ô đã có class riêng thì nhúng thẳng vào nó. Bọc thêm một span
     nữa chỉ tạo hai tầng lồng nhau mà không thêm tác dụng gì. */
  const box = cls ? el('span', cls) : host;
  if (cls) host.appendChild(box);
  iconInline(name).then((text) => {
    if (!text || !box.isConnected) return;
    box.innerHTML = text;
  });
  return box;
}

/* ============================================================
   ENGINE
   Nạp phase2-engine.js của sub A. Nếu chưa có, dùng engine tối
   giản tại chỗ để thanh trạng thái và luồng bước vẫn chạy được.
   ============================================================ */

function createFallbackEngine() {
  const st = {
    step: 'cml1',
    solsRemaining: 300,
    solsToArrival: 412,
    crewOnMars: 1,
    signalStrength: 0.8,
    selection: {
      objective: 'mav_kit',
      launcher: 'sls_block1',
      power: 'power_solar_rosa',
      comms: 'comm_hga_xband',
      edl: 'edl_sensors',
      moduleIds: [],
    },
    totals: {
      massKg: 36010,
      costMusd: 666,
      powerW: 1180,
      deltaVAvailableMs: 7723,
      deltaVNeededMs: 6650,
      daysToArrival: 258.9,
      lifeSupportDays: 340,
    },
    gauges: {
      time: { value: 258.9, limit: 300, pct: 86, status: 'ok', labelKey: 'p2.gauge.time' },
      mass: { value: 36010, limit: 70000, pct: 51, status: 'ok', labelKey: 'p2.gauge.mass' },
      power: { value: 1180, limit: 1500, pct: 79, status: 'ok', labelKey: 'p2.gauge.power' },
      comms: { value: 22.5, limit: 30, pct: 75, status: 'ok', labelKey: 'p2.gauge.comms' },
    },
    checks: [],
    compliance: { sterilized: false, rtg_approved: false },
    launched: false,
    landed: false,
    failed: false,
    comparison: null,
  };
  const subs = new Map();

  function emit(evt, detail) {
    const list = subs.get(evt);
    if (list) list.slice().forEach((fn) => { try { fn(detail); } catch (e) { /* nuốt lỗi của người nghe */ } });
  }

  return {
    /* Cờ cho biết đây là engine tạm, để nơi khác biết mà hiện ghi chú. */
    __fallback: true,

    initFromPhase1(opts) {
      const o = opts || {};
      if (typeof o.solsRemaining === 'number') st.solsRemaining = o.solsRemaining;
      if (typeof o.crewOnMars === 'number') st.crewOnMars = o.crewOnMars;
      if (typeof o.signalStrength === 'number') st.signalStrength = o.signalStrength;
      emit('state:changed', { state: JSON.parse(JSON.stringify(st)), reason: 'init' });
      return this.getState();
    },

    setCmlStep(step) {
      if (!step || st.step === step) return this.getState();
      st.step = step;
      emit('step:changed', { step: step, state: this.getState() });
      emit('state:changed', { state: this.getState(), reason: 'step' });
      return this.getState();
    },

    updateSelection(patch) {
      const p = patch || {};
      if (p.group && p.part) st.selection[p.group] = p.part;
      emit('state:changed', { state: this.getState(), reason: 'selection' });
      return this.getState();
    },

    updateCompliance(patch) {
      const p = patch || {};
      if (p.key) st.compliance[p.key] = !!p.value;
      emit('state:changed', { state: this.getState(), reason: 'compliance' });
      return this.getState();
    },

    getState() {
      return JSON.parse(JSON.stringify(st));
    },

    subscribe(evt, fn) {
      if (!subs.has(evt)) subs.set(evt, []);
      subs.get(evt).push(fn);
      return () => {
        const list = subs.get(evt);
        if (!list) return;
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      };
    },

    launchMission() {
      st.launched = true;
      emit('mission:launched', { state: this.getState() });
      emit('state:changed', { state: this.getState(), reason: 'launch' });
      return this.getState();
    },

    completeMarsGroundPrep() {
      st.groundPrepDone = true;
      emit('state:changed', { state: this.getState(), reason: 'ground-prep' });
      return this.getState();
    },

    /* Chỉ engine tạm mới có hàm này. Engine thật tự xử lý hạ cánh. */
    __simulateLanding() {
      st.landed = true;
      st.comparison = null;
      emit('mission:landed', { state: this.getState() });
      emit('state:changed', { state: this.getState(), reason: 'landed' });
      return this.getState();
    },
  };
}

async function loadEngine() {
  if (window.phase2Engine && typeof window.phase2Engine.getState === 'function') {
    return window.phase2Engine;
  }
  try {
    const mod = await import(BASE + 'phase2-engine.js');
    const engine = mod.phase2Engine || mod.default || (mod.default && mod.default.phase2Engine) || null;
    if (engine && typeof engine.getState === 'function') {
      window.phase2Engine = engine;
      return engine;
    }
  } catch (e) {
    /* tệp chưa có, hoặc sai cú pháp. Rơi xuống engine tạm. */
  }
  const fb = createFallbackEngine();
  window.phase2Engine = fb;
  return fb;
}

/* ============================================================
   BRIDGE
   Nạp bridge-adapter.js của sub A. Thiếu thì dựng cầu tối giản
   để hai nút giả lập của trang demo vẫn có phản ứng thật.
   ============================================================ */

function createFallbackBridge(engine) {
  return {
    __fallback: true,

    simulateSosFromPhase1(detail) {
      const d = detail || { solsRemaining: 300, crewOnMars: 1, signalStrength: 0.8 };
      try {
        window.dispatchEvent(new CustomEvent('mars:sos-received', { detail: d }));
      } catch (e) { /* CustomEvent không dựng được thì thôi */ }
      window.MARS_RESCUE_SHARED_STATE = Object.assign(
        {},
        window.MARS_RESCUE_SHARED_STATE || {},
        { sos: d }
      );
      if (engine && typeof engine.initFromPhase1 === 'function') {
        engine.initFromPhase1(d);
      }
      return d;
    },

    deployBeacon(detail) {
      const d = detail || { ok: true };
      try {
        window.dispatchEvent(new CustomEvent('mars:beacon-deployed', { detail: d }));
      } catch (e) { /* như trên */ }
      window.MARS_RESCUE_SHARED_STATE = Object.assign(
        {},
        window.MARS_RESCUE_SHARED_STATE || {},
        { beacon: d }
      );
      if (engine && typeof engine.completeMarsGroundPrep === 'function') {
        engine.completeMarsGroundPrep();
      }
      return d;
    },
  };
}

async function loadBridge(engine) {
  if (window.phase2Bridge && typeof window.phase2Bridge.simulateSosFromPhase1 === 'function') {
    return window.phase2Bridge;
  }
  try {
    const mod = await import(BASE + 'bridge-adapter.js');
    const candidate = (mod && (mod.bridge || mod.bridgeAdapter || mod.default)) || mod;
    if (candidate && typeof candidate.simulateSosFromPhase1 === 'function') {
      /* Trộn thêm hàm còn thiếu từ cầu tạm, để hai nút demo luôn bấm được. */
      const fb = createFallbackBridge(engine);
      const merged = Object.assign({}, fb, candidate);
      if (typeof merged.deployBeacon !== 'function') merged.deployBeacon = fb.deployBeacon;
      window.phase2Bridge = merged;
      return merged;
    }
  } catch (e) {
    /* tệp chưa có */
  }
  const fb = createFallbackBridge(engine);
  window.phase2Bridge = fb;
  return fb;
}

/* ============================================================
   DANH SÁCH BƯỚC VÀ NẠP MỀM FEATURE
   ============================================================ */

const STEPS = [
  {
    id: 'cml1',
    dot: 1,
    file: 'feature-cml1-telemetry.js',
    fn: 'mountCml1',
    labelKey: 'step.1',
    next: 'cml3',
  },
  {
    id: 'cml3',
    dot: 2,
    file: 'feature-cml3-tradespace.js',
    fn: 'mountCml3',
    labelKey: 'step.2',
    next: 'cml4',
  },
  {
    id: 'cml4',
    dot: 3,
    file: 'feature-cml4-checklist.js',
    fn: 'mountCml4',
    labelKey: 'step.3',
    next: 'execution',
  },
  {
    id: 'execution',
    dot: 4,
    file: 'feature-execution-viz.js',
    fn: 'mountExecution',
    labelKey: 'step.4',
    next: 'summary',
  },
];

const stepById = (id) => STEPS.find((s) => s.id === id) || STEPS[0];

/* Bốn khoá của bảng thanh đo an toàn, dùng chung cho lúc dựng và lúc vẽ. */
const GAUGE_KEYS = ['time', 'mass', 'power', 'comms'];

/* ============================================================
   LỚP PHỦ CỦA BƯỚC 2 VÀ BƯỚC 3
   feature-cml3-tradespace.js tự dựng xưởng và con tàu nhưng không
   có sáu nút chỉ dẫn, bảng tổng, đồng hồ sinh tồn hay modal linh
   kiện. Ba tệp dưới đây lo phần đó, mỗi tệp một việc:
     feature-assembly-ui.js      sáu nút + bảng tổng + nút NEXT
     feature-component-modal.js  cửa sổ chọn linh kiện
     feature-trajectory.js       cửa sổ chọn quỹ đạo bay
   Nạp mềm từng tệp: thiếu tệp nào thì bước đó vẫn chạy với phần
   còn lại, không để màn trắng.
   ============================================================ */

async function loadOptional(file) {
  if (featureCache.has(file)) return featureCache.get(file);
  let mod = null;
  try {
    mod = await import(BASE + file);
  } catch (e) {
    mod = null;
  }
  featureCache.set(file, mod);
  return mod;
}

/* Nhóm của modal linh kiện ánh xạ sang nhóm của engine. Hai bên dùng
   tên khác nhau cho cùng một thứ, nên phải có bảng này ở giữa.
   The component modal groups map onto engine groups. */
const MODAL_GROUP_TO_ENGINE = {
  launcher: 'launcher',
  propellant: 'propellant',
  spacecraft: 'power',
  comms: 'comms',
  supplies: 'supplies',
  trajectory: 'trajectory',
};

/* Kết quả nạp module được nhớ lại, để file thiếu chỉ bị gọi một lần
   chứ không thử lại mỗi lần đổi bước. */
const featureCache = new Map();

/* Feature có thể đặt tên hàm khác một chút. Tìm hàm mount đầu tiên
   trong module thay vì bắt cứng đúng một cái tên. */
function pickMountFn(mod, wanted) {
  if (!mod) return null;
  if (typeof mod[wanted] === 'function') return mod[wanted];
  if (mod.default && typeof mod.default === 'function') return mod.default;
  if (mod.default && typeof mod.default[wanted] === 'function') return mod.default[wanted];
  const keys = Object.keys(mod);
  for (let i = 0; i < keys.length; i += 1) {
    if (/^mount/i.test(keys[i]) && typeof mod[keys[i]] === 'function') return mod[keys[i]];
  }
  /* tên hàm export mặc định trùng tên tệp */
  for (let i = 0; i < keys.length; i += 1) {
    if (/^start/i.test(keys[i]) && typeof mod[keys[i]] === 'function') return mod[keys[i]];
  }
  return null;
}

async function loadFeature(step) {
  if (featureCache.has(step.file)) return featureCache.get(step.file);
  let result = null;
  try {
    const mod = await import(BASE + step.file);
    const fn = pickMountFn(mod, step.fn);
    if (fn) result = { fn: fn, mod: mod };
  } catch (e) {
    /* Tệp chưa có, hoặc sai cú pháp. Ghi vào bộ nhớ đệm là không có. */
    result = null;
  }
  featureCache.set(step.file, result);
  return result;
}

/* ============================================================
   DỰNG KHUNG
   ============================================================ */

function buildFrame(container) {
  container.innerHTML = '';
  container.classList.add('p2-root');

  /* ---------- vùng 1: thanh trạng thái ---------- */
  const top = el('header', 'p2-top');
  top.setAttribute('role', 'banner');

  const brand = el('div', 'p2-brand');
  const mark = el('div', 'p2-brand-mark');
  brand.appendChild(mark);
  /* mark đã là span.p2-brand-mark, nhúng thẳng vào nó. */
  iconSlot(mark, 'rocket');
  const brandText = el('div', 'p2-brand-text');
  const eyebrow = el('span', 'p2-brand-eyebrow');
  const name = el('span', 'p2-brand-name');
  brandText.appendChild(eyebrow);
  brandText.appendChild(name);
  brand.appendChild(brandText);

  const statusbar = el('div', 'p2-statusbar');
  statusbar.setAttribute('role', 'status');
  statusbar.setAttribute('aria-live', 'polite');

  /* ô 1: sóng DSN */
  const statDsn = el('div', 'p2-stat is-scanning');
  const dsnIcon = el('span', 'p2-stat-icon');
  statDsn.appendChild(dsnIcon);
  iconSlot(dsnIcon, 'signal');
  const dsnDot = el('span', 'p2-dot');
  statDsn.appendChild(dsnDot);
  const dsnBody = el('div', 'p2-stat-body');
  const dsnLabel = el('span', 'p2-stat-label');
  const dsnValue = el('strong', 'p2-stat-value');
  dsnBody.appendChild(dsnLabel);
  dsnBody.appendChild(dsnValue);
  statDsn.appendChild(dsnBody);

  /* ô 2: độ trễ liên lạc */
  const statDelay = el('div', 'p2-stat');
  const delayIcon = el('span', 'p2-stat-icon');
  statDelay.appendChild(delayIcon);
  iconSlot(delayIcon, 'dish');
  const delayBody = el('div', 'p2-stat-body');
  const delayLabel = el('span', 'p2-stat-label');
  const delayValue = el('strong', 'p2-stat-value');
  delayBody.appendChild(delayLabel);
  delayBody.appendChild(delayValue);
  statDelay.appendChild(delayBody);

  /* ô 3: đếm ngược sinh tồn */
  const statSurv = el('div', 'p2-stat');
  const survIcon = el('span', 'p2-stat-icon');
  statSurv.appendChild(survIcon);
  iconSlot(survIcon, 'countdown');
  const survDot = el('span', 'p2-dot');
  statSurv.appendChild(survDot);
  const survBody = el('div', 'p2-stat-body');
  const survLabel = el('span', 'p2-stat-label');
  const survValue = el('strong', 'p2-stat-value');
  survBody.appendChild(survLabel);
  survBody.appendChild(survValue);
  statSurv.appendChild(survBody);

  statusbar.appendChild(statDsn);
  statusbar.appendChild(statDelay);
  statusbar.appendChild(statSurv);

  /* bốn chấm bước */
  const steps = el('ol', 'p2-steps');
  steps.setAttribute('aria-label', t('steps.aria'));
  const stepNodes = [];
  STEPS.forEach((s, i) => {
    if (i > 0) steps.appendChild(el('span', 'p2-step-sep'));
    const item = el('li', 'p2-step');
    const dot = el('span', 'p2-step-dot', String(s.dot));
    const nm = el('span', 'p2-step-name');
    item.appendChild(dot);
    item.appendChild(nm);
    steps.appendChild(item);
    stepNodes.push(item);
  });

  /* nút công cụ */
  const tools = el('div', 'p2-tools');

  const btnLang = el('button', 'p2-btn p2-lang');
  btnLang.type = 'button';
  btnLang.setAttribute('aria-label', t('btn.lang'));

  const btnSettings = el('button', 'p2-btn');
  btnSettings.type = 'button';
  btnSettings.setAttribute('aria-label', t('btn.settings'));
  const settingsIcon = el('span', 'p2-btn-icon');
  btnSettings.appendChild(settingsIcon);
  iconSlot(settingsIcon, 'settings');
  btnSettings.appendChild(el('span', 'p2-btn-text'));

  tools.appendChild(btnLang);
  tools.appendChild(btnSettings);

  top.appendChild(brand);
  top.appendChild(statusbar);
  top.appendChild(steps);
  top.appendChild(tools);

  /* ---------- vùng 2: sân khấu ---------- */
  const main = el('main', 'p2-main');
  const stage = el('section', 'p2-stage');
  stage.setAttribute('aria-label', t('brand.name'));

  const backdrop = el('div', 'p2-stage-backdrop');
  backdrop.setAttribute('aria-hidden', 'true');
  const grid = el('div', 'p2-stage-grid');
  grid.setAttribute('aria-hidden', 'true');

  const stageHead = el('div', 'p2-stage-head');
  const stageBadge = el('span', 'p2-stage-badge');
  const stageTitle = el('h2', 'p2-stage-title');
  stageHead.appendChild(stageBadge);
  stageHead.appendChild(stageTitle);

  const stageInner = el('div', 'p2-stage-inner');

  stage.appendChild(backdrop);
  stage.appendChild(grid);
  stage.appendChild(stageHead);
  stage.appendChild(stageInner);
  main.appendChild(stage);

  /* ---------- vùng 3: thanh thao tác ---------- */
  const actions = el('footer', 'p2-actions');
  actions.setAttribute('aria-label', t('brand.name'));

  /* Bảng bốn thanh đo an toàn. Đây là nội dung thật của vùng 3, để
     thanh thao tác không bao giờ là một dải trống rỗng. Nó cũng là
     nơi đọc ngay được thiết kế hiện tại đang căng ở đâu. */
  const board = el('div', 'p2-board');
  board.setAttribute('role', 'group');
  board.setAttribute('aria-label', t('board.aria'));
  const gaugeNodes = {};

  GAUGE_KEYS.forEach((key) => {
    const cell = el('div', 'p2-gauge');
    const head = el('div', 'p2-gauge-head');
    const label = el('span', 'p2-gauge-label');
    const num = el('span', 'p2-gauge-num', '\u2013');
    head.appendChild(label);
    head.appendChild(num);

    const track = el('div', 'p2-gauge-track');
    const fill = el('div', 'p2-gauge-fill');
    const mark = el('div', 'p2-gauge-mark');
    mark.style.left = '100%';
    track.appendChild(fill);
    track.appendChild(mark);

    const sub = el('div', 'p2-gauge-sub', '');

    cell.appendChild(head);
    cell.appendChild(track);
    cell.appendChild(sub);
    board.appendChild(cell);

    gaugeNodes[key] = { cell, label, num, fill, track, sub };
  });

  const actionsInner = el('div', 'p2-actions-inner');

  const navrow = el('div', 'p2-navrow');
  const navLeft = el('div', 'p2-navrow-left');
  const navRight = el('div', 'p2-navrow-right');

  const btnPrev = el('button', 'p2-btn p2-btn-ghost');
  btnPrev.type = 'button';
  const prevText = el('span', 'p2-btn-text');
  btnPrev.appendChild(el('span', 'p2-btn-icon', '\u2039'));
  btnPrev.appendChild(prevText);
  btnPrev.disabled = true;

  /* Nhãn bước ở góc phải hàng nút. Không phải nút bấm, nhưng cho hàng
     nút có nội dung ở cả hai đầu thay vì một nút đơn độc bên trái. */
  const navStep = el('span', 'p2-navstep');
  navStep.setAttribute('aria-hidden', 'true');

  navLeft.appendChild(btnPrev);
  navRight.appendChild(navStep);
  navrow.appendChild(navLeft);
  navrow.appendChild(navRight);

  actions.appendChild(board);
  actions.appendChild(actionsInner);
  actions.appendChild(navrow);

  /* ---------- thông báo ngắn ---------- */
  const toast = el('div', 'p2-toast');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  /* ---------- bảng cài đặt ---------- */
  const modal = el('div', 'p2-modal');
  modal.hidden = true;
  const panel = el('div', 'p2-modal-panel');
  const mHead = el('div', 'p2-modal-head');
  const mTitle = el('h3', 'p2-modal-title');
  const mClose = el('button', 'p2-btn');
  mClose.type = 'button';
  mClose.appendChild(el('span', 'p2-btn-icon', '\u00d7'));
  mHead.appendChild(mTitle);
  mHead.appendChild(mClose);
  const mBody = el('div', 'p2-modal-body');

  const rowLang = el('div', 'p2-set-row');
  const rowLangLabel = el('div', 'p2-set-label');
  const rowLangB = el('b');
  const rowLangSpan = el('span');
  rowLangLabel.appendChild(rowLangB);
  rowLangLabel.appendChild(rowLangSpan);
  const swLang = el('button', 'p2-switch');
  swLang.type = 'button';
  swLang.appendChild(el('span', 'p2-switch-dot'));
  swLang.appendChild(el('span', 'p2-switch-text'));
  rowLang.appendChild(rowLangLabel);
  rowLang.appendChild(swLang);

  const rowMotion = el('div', 'p2-set-row');
  const rowMotionLabel = el('div', 'p2-set-label');
  const rowMotionB = el('b');
  const rowMotionSpan = el('span');
  rowMotionLabel.appendChild(rowMotionB);
  rowMotionLabel.appendChild(rowMotionSpan);
  const swMotion = el('button', 'p2-switch');
  swMotion.type = 'button';
  swMotion.appendChild(el('span', 'p2-switch-dot'));
  swMotion.appendChild(el('span', 'p2-switch-text'));
  rowMotion.appendChild(rowMotionLabel);
  rowMotion.appendChild(swMotion);

  mBody.appendChild(rowLang);
  mBody.appendChild(rowMotion);
  panel.appendChild(mHead);
  panel.appendChild(mBody);
  modal.appendChild(panel);

  container.appendChild(top);
  container.appendChild(main);
  container.appendChild(actions);
  container.appendChild(toast);
  container.appendChild(modal);

  return {
    top, statusbar, statDsn, dsnLabel, dsnValue,
    statDelay, delayLabel, delayValue,
    statSurv, survLabel, survValue,
    steps, stepNodes,
    btnLang, btnSettings,
    stage, stageInner, stageBadge, stageTitle, stageHead,
    actions, actionsInner, navLeft, navRight, btnPrev, prevText,
    toast, modal, mTitle, mClose, mBody, swLang, swMotion,
    rowLangB, rowLangSpan, rowMotionB, rowMotionSpan,
    board, gaugeNodes, navStep,
  };
}

/* ============================================================
   KHUNG CHỜ
   Có icon, tên bước, ghi chú và danh sách việc đã xong. Cố ý
   không phải hộp đen rỗng: nó nói rõ đang chờ gì.
   ============================================================ */

const WAIT_ICONS = {
  cml1: 'dish',
  cml3: 'solar',
  cml4: 'lander',
  execution: 'rocket',
};

function buildWait(step) {
  const box = el('div', 'p2-wait');
  box.setAttribute('role', 'note');

  const iconWrap = el('div', 'p2-wait-icon');
  iconSlot(iconWrap, WAIT_ICONS[step.id] || 'rocket');
  box.appendChild(iconWrap);

  const body = el('div', 'p2-wait-body');
  const h = el('p', 'p2-wait-name', t('wait.note'));
  const note = el('p', 'p2-wait-note', t('wait.note2'));
  body.appendChild(h);
  body.appendChild(note);
  box.appendChild(body);

  const list = el('ul', 'p2-wait-list');
  ['wait.item1', 'wait.item2', 'wait.item3'].forEach((k) => {
    list.appendChild(el('li', null, t(k)));
  });
  box.appendChild(list);

  return box;
}

/* ============================================================
   MÀN TỔNG KẾT
   ============================================================ */

function buildSummary(state) {
  const wrap = el('div', 'p2-wait');
  wrap.style.borderStyle = 'solid';

  const body = el('div', 'p2-wait-body');
  const kicker = el('p', 'p2-wait-note', t('sum.kicker'));
  const h = el('p', 'p2-wait-name', t('sum.title'));
  const sub = el('p', 'p2-wait-note', t('sum.sub'));
  body.appendChild(kicker);
  body.appendChild(h);
  body.appendChild(sub);

  const cmp = state && state.comparison;
  if (cmp && cmp.player) {
    const label = el('p', 'p2-wait-note', t('sum.compare'));
    label.style.marginTop = '10px';
    body.appendChild(label);

    const grid = el('div', 'p2-set-row');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'minmax(0, 1fr) auto auto';
    grid.style.gap = '6px 14px';
    grid.style.textAlign = 'left';

    const head = [
      '',
      t('sum.player'),
      (cmp.nasaAnalogue && (cmp.nasaAnalogue.nameVi || cmp.nasaAnalogue.nameEn))
        ? (lang === 'vi' ? cmp.nasaAnalogue.nameVi : cmp.nasaAnalogue.nameEn)
        : 'NASA',
    ];
    head.forEach((v) => {
      const c = el('span', 'p2-stat-label', v);
      grid.appendChild(c);
    });

    const rows = [
      [t('sum.mass'), fmtNgan(cmp.player.massKg) + ' ' + t('sum.unit.kg'),
        cmp.nasaAnalogue ? fmtNgan(cmp.nasaAnalogue.massKg) + ' ' + t('sum.unit.kg') : ''],
      [t('sum.cost'), fmtSo(cmp.player.costMusd, 0) + ' ' + t('sum.unit.musd'),
        cmp.nasaAnalogue ? fmtSo(cmp.nasaAnalogue.costMusd, 0) + ' ' + t('sum.unit.musd') : ''],
      [t('sum.days'), fmtSo(cmp.player.daysToArrival, 1) + ' ' + t('sum.unit.days'),
        cmp.nasaAnalogue ? fmtSo(cmp.nasaAnalogue.daysToArrival, 1) + ' ' + t('sum.unit.days') : ''],
    ];
    rows.forEach((r) => {
      grid.appendChild(el('span', 'p2-stat-label', r[0]));
      grid.appendChild(el('strong', 'p2-stat-value', r[1]));
      grid.appendChild(el('span', 'p2-stat-value', r[2]));
    });

    body.appendChild(grid);
  } else {
    const none = el('p', 'p2-wait-note', t('sum.none'));
    none.style.marginTop = '10px';
    body.appendChild(none);
  }

  wrap.appendChild(body);
  return wrap;
}

/* ============================================================
   NẠP CSS
   Phase 2 gồm một tệp phase2.css chính và vài tệp phụ do từng feature
   nạp lấy. Tệp chính trước đây chỉ được khai báo trong trang demo, nên
   mở Phase 2 bằng đường khác là mất sạch style. Hàm dưới đây nạp đúng
   một lần, dùng thuộc tính data để không chèn trùng khi mở lại.
   ============================================================ */

let cssLoaded = false;

function loadPhase2Css() {
  if (cssLoaded || document.querySelector('link[data-phase2-css]')) return;
  cssLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'phase2.css';
  link.dataset.phase2Css = '1';
  link.addEventListener('error', () => {
    console.warn('[phase2] không nạp được phase2.css, giao diện sẽ thiếu style');
    /* Bỏ cờ để lần mở sau còn thử lại được. */
    cssLoaded = false;
    link.remove();
  });
  document.head.appendChild(link);
}

/* ============================================================
   MOUNT
   ============================================================ */

export async function mountPhase2(options) {
  const opts = options || {};
  const container = opts.container || document.querySelector('#phase2-root');
  if (!container) throw new Error('mountPhase2: thiếu container');

  /* Tự nạp CSS của Giai đoạn 2. Trước đây chỉ phase2-demo.html khai
     báo link tới phase2.css, nên khi mở Phase 2 từ nút bảng dev (dựng
     thẳng mountPhase2) thì DOM có đủ nhưng không có một dòng style
     nào, giao diện vỡ hoàn toàn. Nạp ở đây để mọi đường vào đều có
     style. */
  loadPhase2Css();

  const frame = buildFrame(container);

  /* ---------- i18n của dự án, nạp mềm ---------- */
  try {
    const mod = await import(new URL('../i18n.js', BASE).href);
    if (mod && typeof mod.getLang === 'function') {
      i18n = mod;
      lang = mod.getLang() || lang;
    }
  } catch (e) {
    i18n = null;
  }

  if (i18n && typeof i18n.onLangChange === 'function') {
    i18n.onLangChange((next) => {
      lang = next;
      repaintAll();
    });
  }

  /* ---------- engine và bridge ---------- */
  const engine = await loadEngine();
  const bridge = await loadBridge(engine);

  /* ---------- trạng thái cục bộ ---------- */
  let state = null;
  let currentStepId = null;
  let currentHandle = null;
  let currentOverlay = null;
  let destroyed = false;
  let history = [];
  let toastTimer = 0;
  let unsubscribers = [];
  let summaryShown = false;
  /* Cờ một lần: chỉ chiếu phân cảnh kết thúc ở lần mở tổng kết
     đầu tiên. Bấm "chơi lại" rồi thắng lại thì lại chiếu. */
  let summaryViaTrueEnding = false;

  /* ============================================================
     VẼ CHỮ THEO NGÔN NGỮ
     ============================================================ */

  function paintStatic() {
    frame.dsnLabel.textContent = t('dsn.label');
    frame.delayLabel.textContent = t('delay.label');
    frame.survLabel.textContent = t('survival.label');

    const brandEyebrow = frame.top.querySelector('.p2-brand-eyebrow');
    const brandName = frame.top.querySelector('.p2-brand-name');
    if (brandEyebrow) brandEyebrow.textContent = t('brand.eyebrow');
    if (brandName) brandName.textContent = t('brand.name');

    frame.steps.setAttribute('aria-label', t('steps.aria'));
    STEPS.forEach((s, i) => {
      const node = frame.stepNodes[i];
      if (!node) return;
      const nm = node.querySelector('.p2-step-name');
      if (nm) nm.textContent = t(s.labelKey);
    });

    frame.btnSettings.setAttribute('aria-label', t('btn.settings'));
    const setText = frame.btnSettings.querySelector('.p2-btn-text');
    if (setText) setText.textContent = t('btn.settings');

    frame.btnLang.setAttribute('aria-label', t('btn.lang'));
    frame.btnLang.innerHTML = '';
    const viSpan = el('span', lang === 'vi' ? 'p2-lang-on' : 'p2-lang-off', 'VI');
    const sep = el('span', 'p2-lang-off', ' / ');
    const enSpan = el('span', lang === 'en' ? 'p2-lang-on' : 'p2-lang-off', 'EN');
    frame.btnLang.appendChild(viSpan);
    frame.btnLang.appendChild(sep);
    frame.btnLang.appendChild(enSpan);

    frame.prevText.textContent = t('btn.prev');
    frame.btnPrev.setAttribute('aria-label', t('btn.prev'));

    frame.mTitle.textContent = t('set.title');
    frame.mClose.setAttribute('aria-label', t('set.close'));
    frame.rowLangB.textContent = t('set.lang');
    frame.rowLangSpan.textContent = t('set.lang.desc');
    frame.rowMotionB.textContent = t('set.motion');
    frame.rowMotionSpan.textContent = t('set.motion.desc');

    paintSwitch(frame.swLang, lang === 'vi' ? 'VI' : 'EN');
    paintSwitch(frame.swMotion, document.documentElement.classList.contains('motion-off') ? t('set.off') : t('set.on'));
  }

  function paintSwitch(btn, label) {
    const txt = btn.querySelector('.p2-switch-text');
    if (txt) txt.textContent = label;
    btn.classList.toggle('is-on', label === 'VI' || label === t('set.on'));
  }

  /* ---------- thanh trạng thái ---------- */

  function dsnMode() {
    const s = state || {};
    if (s.launched && !s.landed) return 'lost';
    if (s.failed) return 'lost';
    const strength = typeof s.signalStrength === 'number'
      ? s.signalStrength
      : (s.sosSignalStrength !== undefined ? s.sosSignalStrength : 0.8);
    if (strength >= 0.6) return 'locked';
    if (strength >= 0.2) return 'scanning';
    return 'lost';
  }

  /* ---------- bảng thanh đo an toàn ---------- */

  const GAUGE_UNITS = {
    /* Thời gian ở đây là sol Mars (engine so solToArrival với
       solsRemaining), nhãn phải là sol, không phải ngày Trái Đất.
       Time here is Mars sols (engine compares solsToArrival with
       solsRemaining), label must be sols, not Earth days. */
    time: 'sol',
    mass: 'kg',
    power: 'W',
    comms: 'min',
  };

  function gaugeUnitText(key) {
    const u = GAUGE_UNITS[key];
    if (u === 'days') return lang === 'vi' ? 'ngày' : 'days';
    if (u === 'min') return lang === 'vi' ? 'phút' : 'min';
    return u;
  }

  function paintGauges() {
    const s = state || {};
    const g = s.gauges || {};
    GAUGE_KEYS.forEach((key) => {
      const node = frame.gaugeNodes[key];
      if (!node) return;
      const item = g[key] || {};
      const pct = typeof item.pct === 'number' ? item.pct : 0;
      const status = item.status || 'ok';
      const limit = typeof item.limit === 'number' ? item.limit : 0;
      const value = typeof item.value === 'number' ? item.value : 0;

      node.cell.classList.remove('is-warn', 'is-fail');
      if (status === 'warn') node.cell.classList.add('is-warn');
      if (status === 'fail') node.cell.classList.add('is-fail');

      node.label.textContent = t('board.' + key);

      /* số hiển thị: chia theo đơn vị cho dễ đọc */
      let shown = value;
      const dv = (key === 'time' || key === 'comms') ? 1 : 0;
      /* Số lớn (khối lượng, công suất) dùng dấu phân cách hàng nghìn,
         số nhỏ để một chữ số thập phân. Trộn hai kiểu trong cùng một
         hàng thẻ thì đọc rất khó so sánh. */
      const isBig = key === 'mass' || key === 'power';

      node.num.textContent = (isBig ? fmtNgan(value) : fmtSo(shown, dv)) + ' ' + gaugeUnitText(key);

      const w = Math.max(0, Math.min(100, pct));
      node.fill.style.width = w + '%';

      const lim = isBig ? fmtNgan(limit) : fmtSo(limit, dv);
      node.sub.textContent = fmtSo(pct, 0) + '% ' + t('board.of') + ' ' + lim + ' ' + gaugeUnitText(key);

      node.cell.setAttribute('aria-label',
        t('board.' + key) + ': ' + node.num.textContent + ', ' + fmtSo(pct, 0) + '% ' + t('board.of'));
    });

    frame.board.setAttribute('aria-label', t('board.aria'));
  }

  function paintStatus() {
    const s = state || {};
    /* sóng DSN */
    const mode = dsnMode();
    frame.statDsn.classList.remove('is-scanning', 'is-locked', 'is-lost');
    frame.statDsn.classList.add('is-' + mode);
    frame.dsnValue.textContent = t('dsn.' + mode);

    /* độ trễ: ưu tiên gauges.comms của engine, không có thì 22,5 phút */
    let delay = 22.5;
    if (s.gauges && s.gauges.comms && typeof s.gauges.comms.value === 'number') {
      delay = s.gauges.comms.value;
    } else if (typeof s.signalDelayMinutes === 'number') {
      delay = s.signalDelayMinutes;
    }
    const digits = delay >= 100 ? 0 : 1;
    frame.delayValue.textContent = fmtSo(delay, digits) + ' ' + t('delay.unit');

    /* đếm ngược sinh tồn */
    let sols = 300;
    if (typeof s.solsRemaining === 'number') sols = s.solsRemaining;
    frame.survValue.textContent = fmtSo(sols, 0) + ' ' + t('survival.unit');
    frame.statSurv.classList.remove('is-caution', 'is-critical');
    if (sols <= 60) frame.statSurv.classList.add('is-critical');
    else if (sols <= 140) frame.statSurv.classList.add('is-caution');

    /* bốn chấm bước */
    /* 'summary' không phải một step trong STEPS. Nếu để stepById xử lý
       thì nó trả STEPS[0], cả bốn chấm mất trạng thái và dải bước nhảy
       về ô 1 ngay khi sứ mệnh đã xong — đúng cảm giác "cũ cũ" khi xem
       lại màn tổng kết. Ở màn tổng kết cả bốn bước đều đã qua. */
    const isSummary = currentStepId === 'summary';
    const step = stepById(currentStepId || 'cml1');
    STEPS.forEach((sp, i) => {
      const node = frame.stepNodes[i];
      if (!node) return;
      node.classList.toggle('is-current', !isSummary && sp.id === step.id);
      node.classList.toggle('is-done', isSummary || sp.dot < step.dot);
      node.setAttribute('aria-current', !isSummary && sp.id === step.id ? 'step' : 'false');
    });

    /* đầu sân khấu */
    if (currentStepId === 'summary') {
      frame.stageBadge.textContent = '04 / 04';
      frame.stageTitle.textContent = t('sum.title');
    } else {
      frame.stageBadge.textContent = '0' + step.dot + ' / 04';
      frame.stageTitle.textContent = t(step.labelKey);
    }

    paintGauges();

    /* Nhãn ở góc phải hàng nút: tên bước kế tiếp. Không lặp lại số
       bước vì đầu sân khấu đã có "01 / 04" rồi, in hai lần là thừa. */
    if (frame.navStep) {
      if (currentStepId === 'summary') {
        frame.navStep.textContent = t('nav.done');
      } else {
        const s2 = stepById(currentStepId || 'cml1');
        frame.navStep.textContent = s2.next === 'summary'
          ? t('nav.done')
          : t('nav.next') + ': ' + t(stepById(s2.next).labelKey);
      }
    }
  }

  /* ---------- gợi ý mặc định ở thanh thao tác ---------- */

  function buildHint() {
    const hint = el('div', 'p2-actions-hint');
    const ic = el('span', 'p2-actions-hint-icon');
    iconSlot(ic, 'signal');
    hint.appendChild(ic);
    const txt = el('span', null, currentStepId === 'cml4' ? t('hint.review') : t('hint.default'));
    hint.appendChild(txt);
    return hint;
  }

  /* ============================================================
     ĐỔI BƯỚC
     ============================================================ */

  function destroyCurrent() {
    closeModal();
    if (currentOverlay) {
      const ov = currentOverlay;
      currentOverlay = null;
      try {
        if (typeof ov.destroy === 'function') ov.destroy();
        else if (ov.root && ov.root.parentNode) ov.root.parentNode.removeChild(ov.root);
      } catch (e) {
        /* lớp phủ dọn hỏng thì bỏ qua, không chặn bước sau */
      }
    }
    if (!currentHandle) return;
    try {
      if (typeof currentHandle === 'function') currentHandle();
      else if (typeof currentHandle.destroy === 'function') currentHandle.destroy();
      else if (typeof currentHandle.unmount === 'function') currentHandle.unmount();
    } catch (e) {
      /* feature lỗi khi dọn thì bỏ qua, không chặn bước sau */
    }
    currentHandle = null;
  }

  function clearStage() {
    frame.stageInner.innerHTML = '';
    frame.actionsInner.innerHTML = '';
    /* Giữ lại nhãn bước ở góc phải, chỉ gỡ các nút động. */
    [...frame.navRight.children].forEach((n) => {
      if (n !== frame.navStep) n.remove();
    });
    frame.stage.classList.remove('has-feature');
  }

  async function showStep(stepId, optsStep) {
    const options2 = optsStep || {};
    const step = stepById(stepId);

    destroyCurrent();
    clearStage();

    currentStepId = step.id;
    summaryShown = false;
    paintStatus();
    frame.btnPrev.disabled = history.length === 0;

    frame.actionsInner.appendChild(buildHint());

    let loaded = null;
    try {
      loaded = await loadFeature(step);
    } catch (e) {
      loaded = null;
    }

    /* Người chơi có thể đã bấm sang bước khác trong lúc chờ nạp. */
    if (currentStepId !== step.id) return;

    if (!loaded) {
      frame.stageInner.appendChild(buildWait(step));
      return;
    }

    const host = el('div', 'p2-step-host');
    host.style.flex = '1 1 auto';
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.minHeight = '0';
    host.style.width = '100%';
    frame.stageInner.appendChild(host);
    frame.stage.classList.add('has-feature');

    /* Feature tự dựng nội dung vào thanh thao tác nếu muốn. */
    frame.actionsInner.innerHTML = '';

    const payload = {
      container: host,
      engine: engine,
      onNext: (arg) => {
        /* cml4 gọi onNext({ back: true }) khi người chơi bấm quay lại.
           Phải rẽ nhánh, nếu không nút quay lại sẽ đẩy đi tiếp. */
        if (arg && arg.back) goBack();
        else if (arg && arg.replay) { history = []; showStep('cml1'); }
        else goNext(step);
      },
      /* feature-execution-viz.js đặt tên tham số là onDone. Hai tên cùng
         trỏ về một chỗ, để bước nào cũng đi tiếp được. */
      onDone: (arg) => {
        if (arg && arg.replay) { history = []; showStep('cml1'); return; }
        goNext(step);
      },
      /* tiện ích thêm, không bắt buộc, feature nào cần thì dùng */
      actionsContainer: frame.actionsInner,
      state: state,
      t: t,
      lang: lang,
      getLang: () => lang,
      onLangChange: (fn) => registerLangHook(fn),
      assetsBase: new URL('assets/', BASE).href,
      bridge: bridge,
    };

    try {
      const handle = loaded.fn(payload);
      if (handle && typeof handle.then === 'function') {
        currentHandle = await handle;
      } else {
        currentHandle = handle;
      }
    } catch (e) {
      /* Feature nạp được nhưng dựng hỏng: hiện khung chờ thay vì màn trắng. */
      host.innerHTML = '';
      host.appendChild(buildWait(step));
      currentHandle = null;
    }

    /* Feature không dựng gì vào thanh thao tác thì trả gợi ý lại. */
    if (!frame.actionsInner.firstElementChild) {
      frame.actionsInner.appendChild(buildHint());
    }

    /* Lớp phủ của bước 2 và bước 3. Gắn sau feature vì lớp phủ cần
       thấy con tàu của cml3 để đo vị trí đường chỉ dẫn.
       The step 2 and 3 overlays go on after the feature, because the
       assembly callouts measure the ship that cml3 just drew. */
    if (currentStepId === step.id && currentHandle) {
      if (step.id === 'cml3') await mountAssemblyOverlay(host);
      else if (step.id === 'cml4') await mountGaugeOverlay(host);
    }

    if (options2.push !== false && options2.from !== 'history') {
      /* lịch sử chỉ ghi ở goNext và ở nút quay lại */
    }
  }

  /* ============================================================
     LỚP PHỦ BƯỚC 2 VÀ BƯỚC 3
     ============================================================ */

  /* Bảng đèn kiểm duyệt đã có cột công tắc và nút phóng riêng. Lớp
     phủ đồng hồ cũng có đúng hai thứ đó, nên khi lớp phủ gắn vào thì
     ẩn cột bên của bảng đèn đi: hai nút phóng trên cùng một màn là
     lỗi, người chơi không biết bấm cái nào.
     The checklist ships its own switch column and launch button. The
     gauge overlay has both too, so the checklist's side column is
     hidden once the overlay mounts. Two launch buttons on one screen
     is a bug, not a feature. */
  const CML4_HIDE_DUPES = '.cm4-col-side, .cm4-foot';

  function hideCml4Dupes(on) {
    const root = frame.stageInner.querySelector('.cm4');
    if (!root) return;
    root.classList.toggle('p2-dup-hidden', !!on);
  }

  /* Modal đang mở, để lần mở sau không chồng lên lần trước. */
  let openModal = null;

  function closeModal() {
    if (!openModal) return;
    const cur = openModal;
    openModal = null;
    try {
      if (typeof cur.close === 'function') cur.close();
      else if (cur.root && cur.root.parentNode) cur.root.parentNode.removeChild(cur.root);
    } catch (e) {
      /* modal tự dọn hỏng thì thôi, không chặn bước sau */
    }
  }

  /* Sáu nút chỉ dẫn + bảng tổng + nút NEXT cho bước lắp ráp. */
  async function mountAssemblyOverlay(host) {
    const mod = await loadOptional('feature-assembly-ui.js');
    if (!mod || typeof mod.mountAssemblyUi !== 'function') {
      /* Không có lớp phủ thì nút NEXT của cml3 vẫn dùng được. */
      return null;
    }
    if (destroyed || currentStepId !== 'cml3') return null;

    let handle = null;
    try {
      handle = mod.mountAssemblyUi({
        container: host,
        engine: engine,
        onOpenGroup: (group) => {
          /* Nhóm trajectory mở cửa sổ quỹ đạo, các nhóm còn lại mở
             danh mục linh kiện. Đây là chỗ nối mà trước đây thiếu,
             khiến nút "Quỹ đạo bay" bấm vào không mở gì.
             Trajectory opens the orbit window, the rest open parts. */
          if (group === 'trajectory') openTrajectory(handle);
          else openParts(group);
        },
      });
    } catch (e) {
      return null;
    }

    if (!handle) return null;

    /* Nút NEXT của lớp phủ chỉ mở khi mọi nhóm đã có lựa chọn, và khi
       engine không còn mục đỏ. Bọc lại để lớp phủ không tự đổi bước
       sau lưng app: nó phát 'ui:next', app bắt và gọi onNext.
       The overlay's NEXT stays locked until every group is picked and
       no engine check is red. It emits 'ui:next' and the app moves. */
    function syncNext() {
      if (!handle || !state) return;
      const missing = assemblyMissing(state);
      const red = (state.checks || []).some((c) => c.status === 'red');
      handle.setNextEnabled(missing.length === 0 && !red);
      handle.nextReason = missing;
    }

    const onUiNext = () => {
      if (assemblyMissing(state).length) return;
      goNext(stepById('cml3'));
    };
    window.addEventListener('ui:next', onUiNext);

    const offState = engine && typeof engine.subscribe === 'function'
      ? engine.subscribe('state:changed', () => syncNext())
      : null;

    syncNext();

    /* Bọc destroy để gỡ thêm ba thứ app vừa nối. */
    const innerDestroy = handle.destroy;
    handle.destroy = function destroyWithHooks() {
      window.removeEventListener('ui:next', onUiNext);
      if (typeof offState === 'function') offState();
      closeModal();
      try { innerDestroy.call(handle); } catch (e) { /* lớp phủ tự dọn hỏng */ }
    };

    currentOverlay = handle;
    return handle;
  }

  /* Bốn đồng hồ đo + công tắc + nút PHÓNG cho bước kiểm duyệt. */
  async function mountGaugeOverlay(host) {
    const mod = await loadOptional('feature-gauges.js');
    if (!mod || typeof mod.mountGaugePanel !== 'function') return null;
    if (destroyed || currentStepId !== 'cml4') return null;

    let handle = null;
    try {
      handle = mod.mountGaugePanel({
        container: host,
        engine: engine,
        onLaunch: () => {
          /* Nút PHÓNG đã gọi engine.launchMission() xong. Bước tiếp
             theo là bước 4, do app chuyển chứ không phải feature. */
          if (currentStepId === 'cml4') goNext(stepById('cml4'));
        },
      });
    } catch (e) {
      return null;
    }

    if (!handle) return null;
    currentOverlay = handle;
    hideCml4Dupes(true);
    /* Bọc destroy để trả lại cột bên nếu lớp phủ bị gỡ giữa chừng. */
    const innerGaugeDestroy = handle.destroy;
    handle.destroy = function destroyGauge() {
      hideCml4Dupes(false);
      try { innerGaugeDestroy.call(handle); } catch (e) { /* tự dọn hỏng */ }
    };
    return handle;
  }

  /* Nhóm nào còn thiếu lựa chọn. Trả mảng khoá, rỗng là đủ.
     Which assembly groups are still unpicked. */
  function assemblyMissing(st) {
    const sel = (st && st.selection) || {};
    const need = [
      ['launcher', 'Nhóm tên lửa đẩy'],
      ['propellant', 'Nhóm động cơ và nhiên liệu'],
      ['power', 'Nhóm thân tàu và nguồn điện'],
      ['comms', 'Nhóm liên lạc'],
      ['supplies', 'Nhóm tiếp tế'],
      ['trajectory', 'Nhóm đường bay'],
    ];
    return need.filter(([k]) => !sel[k]).map(([k, label]) => ({ key: k, label: label }));
  }

  /* Cửa sổ chọn linh kiện của một nhóm. */
  async function openParts(group) {
    const mod = await loadOptional('feature-component-modal.js');
    if (!mod || typeof mod.openComponentModal !== 'function') {
      showToast(lang === 'vi'
        ? 'Chưa nạp được danh mục linh kiện.'
        : 'The parts catalogue could not be loaded.', 'fail');
      return;
    }
    if (openModal) closeModal();
    try {
      openModal = mod.openComponentModal({
        group: group,
        engine: engine,
        onClose: () => {
          openModal = null;
          if (currentOverlay && typeof currentOverlay.refresh === 'function') currentOverlay.refresh();
        },
      });
    } catch (e) {
      openModal = null;
    }
  }

  /* Cửa sổ chọn quỹ đạo bay. Tách khỏi openParts vì đây là nhóm duy
     nhất mở bằng tệp khác: feature-trajectory.js vẽ ba hồ sơ có biểu
     đồ, còn modal linh kiện chỉ liệt kê danh mục.
     The orbit window is its own module, which is the whole point of
     the separate file. */
  async function openTrajectory(handle) {
    const mod = await loadOptional('feature-trajectory.js');
    if (!mod || typeof mod.openTrajectoryModal !== 'function') {
      showToast(lang === 'vi'
        ? 'Chưa nạp được cửa sổ quỹ đạo bay.'
        : 'The orbit window could not be loaded.', 'fail');
      return;
    }
    if (openModal) closeModal();
    try {
      openModal = mod.openTrajectoryModal({
        engine: engine,
        onClose: () => {
          openModal = null;
          if (handle && typeof handle.refresh === 'function') handle.refresh();
        },
      });
    } catch (e) {
      openModal = null;
    }
  }

  /* ---------- hook đổi ngôn ngữ của feature ---------- */

  const langHooks = [];
  function registerLangHook(fn) {
    if (typeof fn === 'function') langHooks.push(fn);
    return () => {
      const i = langHooks.indexOf(fn);
      if (i >= 0) langHooks.splice(i, 1);
    };
  }

  function repaintAll() {
    paintStatic();
    paintStatus();
    /* dòng gợi ý do app dựng nên phải vẽ lại chữ */
    const hint = frame.actionsInner.querySelector('.p2-actions-hint');
    if (hint) {
      const span = hint.lastElementChild;
      if (span) span.textContent = currentStepId === 'cml4' ? t('hint.review') : t('hint.default');
    }
    /* feature tự vẽ lại chữ của nó */
    langHooks.slice().forEach((fn) => {
      try { fn(lang); } catch (e) { /* bỏ qua lỗi của feature */ }
    });
    /* báo cho mọi module đang nghe, kể cả feature chưa đăng ký hook */
    try {
      document.dispatchEvent(new CustomEvent('phase2:lang', { detail: { lang: lang } }));
    } catch (e) { /* không dựng được CustomEvent thì thôi */ }

    /* khung chờ và màn tổng kết do app dựng nên phải dựng lại */
    if (currentStepId === 'summary') {
      frame.stageInner.innerHTML = '';
      frame.stageInner.appendChild(buildSummary(state));
    } else if (frame.stageInner.querySelector('.p2-wait')) {
      const step = stepById(currentStepId || 'cml1');
      frame.stageInner.innerHTML = '';
      frame.stageInner.appendChild(buildWait(step));
    }
  }

  /* ---------- điều hướng ---------- */

  function goNext(fromStep) {
    const step = fromStep || stepById(currentStepId);
    if (step.next === 'summary') {
      history.push(step.id);
      showSummary();
      return;
    }
    history.push(step.id);
    if (typeof engine.setCmlStep === 'function') {
      try { engine.setCmlStep(step.next); } catch (e) { /* engine tự lo */ }
    }
    /* engine thật sẽ phát step:changed và app chuyển theo; nếu engine
       không phát thì tự chuyển để không kẹt. */
    if (currentStepId === step.id) showStep(step.next);
  }

  function goBack() {
    if (!history.length) return;
    const prev = history.pop();
    if (typeof engine.setCmlStep === 'function') {
      try { engine.setCmlStep(prev); } catch (e) { /* engine tự lo */ }
    }
    if (currentStepId === prev && !summaryShown) return;
    showStep(prev);
  }

  function showSummary() {
    destroyCurrent();
    clearStage();
    currentStepId = 'summary';
    summaryShown = true;
    frame.stage.classList.add('has-feature');
    paintStatus();
    frame.btnPrev.disabled = history.length === 0;

    /* Trước khi hiện bảng tổng kết của app, chiếu phân cảnh kết thúc
       thành công (9 khung) nếu module có mặt. Bảng tổng kết chi tiết
       của true-ending.js được dùng thay cho bản đơn giản bên dưới:
       nó có xếp hạng, đối chiếu với tàu thật và hai nút thoát.
       Nạp mềm: thiếu module hay lỗi bất ngờ thì rơi về bản cũ, không
       bao giờ để trống màn hình. */
    if (!summaryViaTrueEnding) {
      summaryViaTrueEnding = true;
      const goPlain = () => {
        frame.stageInner.appendChild(buildSummary(state));
        frame.actionsInner.appendChild(buildHint());
        const again = el('button', 'p2-btn p2-btn-primary');
        again.type = 'button';
        again.appendChild(el('span', 'p2-btn-text', t('sum.again')));
        again.addEventListener('click', () => {
          history = [];
          if (typeof engine.setCmlStep === 'function') {
            try { engine.setCmlStep('cml1'); } catch (e) { /* engine tự lo */ }
          }
          showStep('cml1');
        });
        frame.navRight.appendChild(again);
      };
      const base = new URL('.', import.meta.url).href;
      /* true-ending.js nằm trong src/, không phải cạnh phase2/. Trước
         đây nối chuỗi '../true-ending.js' vào base của phase2/, phân
         giải ra /true-ending.js và 404, nên màn kết thúc thật không
         bao giờ mở, luôn rơi về bảng tổng kết đơn giản. */
      import(new URL('../true-ending.js', base).href)
        .then((mod) => {
          if (!mod || typeof mod.openTrueEnding !== 'function') {
            console.warn('[phase2] chưa có màn kết thúc, dùng bảng tổng kết đơn giản');
            goPlain();
            return;
          }
          mod.openTrueEnding({
            stats: null,
            engine,
            onRestart: () => {
              history = [];
              if (typeof engine.setCmlStep === 'function') {
                try { engine.setCmlStep('cml1'); } catch (e) { /* engine tự lo */ }
              }
              showStep('cml1');
            },
            onExit: () => {
              try {
                const ev = new CustomEvent('phase2:exit', { bubbles: true });
                document.dispatchEvent(ev);
              } catch (e) { /* không dựng được sự kiện thì thôi */ }
              window.location.reload();
            },
          });
        })
        .catch((err) => {
          console.warn('[phase2] màn kết thúc lỗi, dùng bảng tổng kết đơn giản', err);
          goPlain();
        });
      return;
    }

    frame.stageInner.appendChild(buildSummary(state));
    frame.actionsInner.appendChild(buildHint());

    const again = el('button', 'p2-btn p2-btn-primary');
    again.type = 'button';
    again.appendChild(el('span', 'p2-btn-text', t('sum.again')));
    again.addEventListener('click', () => {
      history = [];
      if (typeof engine.setCmlStep === 'function') {
        try { engine.setCmlStep('cml1'); } catch (e) { /* engine tự lo */ }
      }
      showStep('cml1');
    });
    frame.navRight.appendChild(again);
  }

  /* ---------- thông báo ---------- */

  function showToast(text, kind) {
    frame.toast.textContent = text;
    frame.toast.classList.remove('is-ok', 'is-fail');
    if (kind === 'ok') frame.toast.classList.add('is-ok');
    if (kind === 'fail') frame.toast.classList.add('is-fail');
    frame.toast.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      frame.toast.classList.remove('is-visible');
    }, 4200);
  }

  /* ============================================================
     NGHE ENGINE
     ============================================================ */

  function bindEngine() {
    if (!engine || typeof engine.subscribe !== 'function') return;

    unsubscribers.push(engine.subscribe('state:changed', (payload) => {
      const next = payload && payload.state ? payload.state : null;
      if (next) state = next;
      paintStatus();
    }));

    unsubscribers.push(engine.subscribe('step:changed', (payload) => {
      const step = payload && payload.step;
      if (!step) return;
      if (step === currentStepId) return;
      if (step === 'summary') {
        showSummary();
        return;
      }
      if (stepById(step).id === step) showStep(step);
    }));

    unsubscribers.push(engine.subscribe('mission:launched', () => {
      showToast(t('toast.launched'), 'ok');
      paintStatus();
    }));

    unsubscribers.push(engine.subscribe('mission:landed', (payload) => {
      if (payload && payload.state) state = payload.state;
      showToast(t('toast.landed'), 'ok');
      paintStatus();
      showSummary();
    }));

    unsubscribers.push(engine.subscribe('mission:failed', () => {
      showToast(t('toast.failed'), 'fail');
      paintStatus();
    }));
  }

  /* ============================================================
     SỰ KIỆN GIAO DIỆN
     ============================================================ */

  function setLang(next) {
    if (next !== 'vi' && next !== 'en') return;
    if (next === lang) return;
    lang = next;
    if (i18n && typeof i18n.setLang === 'function') {
      try { i18n.setLang(next); } catch (e) { /* i18n lỗi thì app tự vẽ */ }
    } else {
      try { localStorage.setItem(LANG_KEY, next); } catch (e) { /* chế độ riêng tư */ }
      document.documentElement.lang = next;
    }
    repaintAll();
  }

  frame.btnLang.addEventListener('click', () => {
    setLang(lang === 'vi' ? 'en' : 'vi');
  });

  frame.swLang.addEventListener('click', () => {
    setLang(lang === 'vi' ? 'en' : 'vi');
  });

  frame.btnSettings.addEventListener('click', () => {
    frame.modal.hidden = false;
    paintStatic();
    frame.mClose.focus();
  });

  frame.mClose.addEventListener('click', () => {
    frame.modal.hidden = true;
    frame.btnSettings.focus();
  });

  frame.modal.addEventListener('click', (ev) => {
    if (ev.target === frame.modal) frame.modal.hidden = true;
  });

  document.addEventListener('keydown', onGlobalKey);
  function onGlobalKey(ev) {
    if (ev.key === 'Escape' && !frame.modal.hidden) {
      frame.modal.hidden = true;
      frame.btnSettings.focus();
    }
  }

  frame.swMotion.addEventListener('click', () => {
    const root = document.documentElement;
    const off = root.classList.toggle('motion-off');
    try { localStorage.setItem('smdg.motionOff', off ? '1' : '0'); } catch (e) { /* chế độ riêng tư */ }
    paintStatic();
  });

  frame.btnPrev.addEventListener('click', goBack);

  /* ============================================================
     KHỞI ĐỘNG
     ============================================================ */

  /* Trạng thái ban đầu: lấy từ engine nếu đã có kết quả Giai đoạn 1. */
  try {
    state = typeof engine.getState === 'function' ? engine.getState() : null;
  } catch (e) {
    state = null;
  }

  /* Nếu engine chưa được khởi tạo từ Giai đoạn 1, khởi tạo với số mặc
     định để thanh trạng thái có số thật mà hiện, không hiện số 0. */
  if (!state || typeof state.solsRemaining !== 'number') {
    try {
      if (typeof engine.initFromPhase1 === 'function') {
        engine.initFromPhase1({ solsRemaining: 300, crewOnMars: 1, signalStrength: 0.8 });
        state = engine.getState();
      }
    } catch (e) {
      /* engine tự lo */
    }
  }

  paintStatic();
  bindEngine();

  const startStep = (state && state.step && stepById(state.step).id === state.step)
    ? state.step
    : 'cml1';

  await showStep(startStep);

  paintStatus();

  /* Trả về tay cầm để trang gọi có thể gỡ. */
  const api = {
    engine: engine,
    bridge: bridge,
    root: container,
    getState: () => state,
    /* 'summary' KHÔNG nằm trong STEPS: nó là trạng thái sau khi qua
       bước 4, do showSummary() dựng, không phải một step của dải bước.
       Trước đây chuyển thẳng vào showStep('summary') nên stepById trả
       STEPS[0] và bảng dev nhảy về màn "Bắt sóng cầu cứu" (cml1) — người
       dùng thấy như nút nhảy không đi đúng mạch truyện. */
    setStep: (id) => (id === 'summary' ? showSummary() : showStep(id)),
    setLang: setLang,
    getLang: () => lang,
    destroy() {
      destroyed = true;
      destroyCurrent();
      unsubscribers.forEach((fn) => { try { fn(); } catch (e) { /* bỏ qua */ } });
      unsubscribers = [];
      document.removeEventListener('keydown', onGlobalKey);
      container.innerHTML = '';
      container.classList.remove('p2-root');
    },
  };

  container.__phase2Api = api;
  return api;
}

/* Trang demo gọi được qua window. */
if (typeof window !== 'undefined') {
  window.mountPhase2 = mountPhase2;
}

export default mountPhase2;
