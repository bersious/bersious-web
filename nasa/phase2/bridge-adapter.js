/* ============================================================
   bridge-adapter.js: cầu nối sự kiện giữa Giai đoạn 1 (tab Sao Hỏa)
   và Giai đoạn 2 (Trung tâm Điều khiển Sứ mệnh)

   Event bridge between phase 1 (the Mars tab) and phase 2 (mission
   control). Three named events, one shared state object:

     mars:sos-received        phase 1 -> phase 2
     earth:dsn-command-sent   phase 2 -> phase 1
     mars:beacon-deployed     phase 1 -> phase 2

   QUY TẮC / RULES
   - Không chạm DOM của ai khác, chỉ dùng window.dispatchEvent.
     Never touches anyone else's DOM, only window.dispatchEvent.
   - MARS_RESCUE_SHARED_STATE có thể chưa tồn tại, có thể là object
     rỗng, có thể bị tab khác ghi đè. Mọi lần đọc đều phải chịu được.
     The shared state may not exist, may be empty, may be replaced by
     another tab. Every read has to survive all three.
   - Song ngữ VI + EN cho mọi chuỗi. Không dấu gạch dài.
   ============================================================ */

const EVENT_SOS = 'mars:sos-received';
const EVENT_DSN = 'earth:dsn-command-sent';
const EVENT_BEACON = 'mars:beacon-deployed';

const SHARED_KEY = 'MARS_RESCUE_SHARED_STATE';

/* Người nghe nội bộ, để hàm onSos và onBeacon hoạt động cả khi
   không có window (chạy test bằng node).
   Local listener lists so onSos and onBeacon work even without a
   window object, which is how the node tests run them. */
const local = {
  sos: new Set(),
  beacon: new Set(),
};

/* ---------- tiện ích môi trường ---------- */

function hasWindow() {
  return typeof window !== 'undefined' && window && typeof window.dispatchEvent === 'function';
}

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (err) {
    return '';
  }
}

function clamp01to100(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* ---------- trạng thái chia sẻ / shared state ---------- */

/**
 * Đọc MARS_RESCUE_SHARED_STATE, luôn trả một object, không bao giờ ném.
 * Read the shared state, always return an object, never throw.
 */
function readShared() {
  if (typeof window === 'undefined' || !window) return {};
  try {
    const raw = window[SHARED_KEY];
    if (raw && typeof raw === 'object') return raw;
  } catch (err) {
    /* getter của tab khác ném lỗi thì coi như chưa có gì */
  }
  return {};
}

/**
 * Ghi thêm vài trường vào trạng thái chia sẻ, giữ nguyên phần còn lại.
 * Không ghi đè cả object, vì tab kia có thể đang giữ dữ liệu riêng.
 * Merge a patch into the shared state without clobbering the rest,
 * because the other tab may be holding its own fields there.
 *
 * @param {object} patch
 * @returns {object} trạng thái sau khi ghi
 */
function writeShared(patch) {
  if (typeof window === 'undefined' || !window) return Object.assign({}, patch);
  const next = Object.assign({}, readShared(), patch);
  try {
    window[SHARED_KEY] = next;
  } catch (err) {
    /* không ghi được biến toàn cục thì vẫn trả bản vừa ghép */
  }
  return next;
}

/**
 * Dò phần trăm dưỡng chất còn lại trong trạng thái chia sẻ.
 * Giai đoạn 1 có thể ghi lifeSupportPercent, cropHealthPercent, hoặc
 * một trong hai nằm lồng trong object con. Đọc hết các khả năng.
 * Find the remaining life support percentage. Phase 1 may write
 * lifeSupportPercent or cropHealthPercent, possibly nested, so try
 * every shape we know.
 *
 * @returns {number|null} 0 tới 100, hoặc null nếu không tìm thấy
 */
function readLifeSupportPercent(shared) {
  const src = shared || readShared();
  const direct = [
    'lifeSupportPercent',
    'life_support_percent',
    'cropHealthPercent',
    'crop_health_percent',
    'lifeSupport',
    'cropHealth',
  ];
  for (const key of direct) {
    const v = clamp01to100(src[key]);
    if (v !== null) return v;
  }
  const nested = [src.phase1, src.resources, src.life, src.crops, src.state, src.sos];
  for (const box of nested) {
    if (!box || typeof box !== 'object') continue;
    const v =
      clamp01to100(box.lifeSupportPercent) ??
      clamp01to100(box.life_support_percent) ??
      clamp01to100(box.cropHealthPercent) ??
      clamp01to100(box.crop_health_percent);
    if (v !== null) return v;
  }
  return null;
}

/* ---------- phát sự kiện / dispatch ---------- */

function dispatch(event, detail) {
  if (!hasWindow()) return false;
  try {
    const CE = typeof CustomEvent === 'function' ? CustomEvent : null;
    if (!CE) return false;
    window.dispatchEvent(new CE(event, { detail }));
    return true;
  } catch (err) {
    return false;
  }
}

/* ---------- phía Giai đoạn 1 phát sang Giai đoạn 2 ---------- */

/**
 * Giai đoạn 1 bắt được tín hiệu SOS và chuyển sang đây.
 * Phase 1 has a fix on the SOS and hands it over.
 *
 * @param {{solsRemaining?: number, crewOnMars?: number,
 *          signalStrength?: number, lifeSupportPercent?: number,
 *          cropHealthPercent?: number}} detail
 * @returns {object} detail đã chuẩn hoá
 */
function sendSosToPhase2(detail) {
  const d = detail || {};
  const shared = readShared();

  const sols =
    toNumber(d.solsRemaining) ??
    toNumber(shared.solsRemaining) ??
    toNumber(shared.sols_remaining) ??
    null;

  const percent = clamp01to100(d.lifeSupportPercent ?? d.cropHealthPercent) ?? readLifeSupportPercent(shared);

  const crew = toNumber(d.crewOnMars) ?? toNumber(shared.crewOnMars) ?? 1;

  /* Sóng yếu thì hạ độ tin cậy, nhưng đừng bao giờ để 0 vì engine
     dùng con số này để chia trễ tín hiệu.
     A weak link lowers confidence, never to zero, because the engine
     divides the signal delay by this figure. */
  let strength = toNumber(d.signalStrength) ?? toNumber(shared.signalStrength) ?? 0.8;
  if (percent !== null) {
    /* Dưỡng chất cạn thì pin liên lạc cũng yếu đi, phản ánh đúng
       thực tế là thiết bị chạy bằng năng lượng dự trữ.
       Dwindling supplies mean a weaker link, since the gear runs on
       reserve power. */
    const fromSupplies = 0.35 + (percent / 100) * 0.65;
    strength = Math.min(strength, fromSupplies);
  }
  strength = Math.min(1, Math.max(0.35, strength));

  const payload = {
    solsRemaining: sols === null ? 300 : Math.round(sols * 10) / 10,
    crewOnMars: Math.max(1, Math.round(crew)),
    signalStrength: Math.round(strength * 100) / 100,
    lifeSupportPercent: percent === null ? null : Math.round(percent * 10) / 10,
    at: nowIso(),
    source: 'phase1',
  };

  writeShared({
    sos: payload,
    sosReceived: true,
    solsRemaining: payload.solsRemaining,
    crewOnMars: payload.crewOnMars,
    signalStrength: payload.signalStrength,
    lifeSupportPercent: payload.lifeSupportPercent,
    stage: 'received',
  });

  dispatch(EVENT_SOS, payload);
  notifyLocal('sos', payload);
  forwardToEngine(payload);
  return payload;
}

/**
 * Tab Sao Hỏa báo đèn hiệu bãi đáp đã cắm xong.
 * The Mars tab reports the landing beacon is up.
 *
 * @param {{ok?: boolean, at?: string}} detail
 * @returns {object}
 */
function deployBeacon(detail) {
  const d = detail || {};
  const payload = {
    ok: d.ok === undefined ? true : !!d.ok,
    at: d.at || nowIso(),
    source: 'phase1',
  };

  writeShared({ beacon: payload, beaconDeployed: true, stage: 'beacon' });
  dispatch(EVENT_BEACON, payload);
  notifyLocal('beacon', payload);
  forwardGroundPrep(payload);
  return payload;
}

/* ---------- phía Giai đoạn 2 phát sang tab Sao Hỏa ---------- */

/**
 * Trái Đất gửi lệnh, thường ở ba phần tư quãng bay.
 * Earth sends the command, usually at three quarters of the way.
 *
 * @param {{solsToArrival?: number, etaDays?: number, progress?: number}} detail
 * @returns {object}
 */
function sendDsnCommand(detail) {
  const d = detail || {};
  const shared = readShared();

  const sols =
    toNumber(d.solsToArrival) ??
    toNumber(d.sols_remaining) ??
    toNumber(shared.solsToArrival) ??
    null;

  const eta = toNumber(d.etaDays) ?? toNumber(d.eta_days) ?? null;

  const payload = {
    solsToArrival: sols === null ? 0 : Math.round(sols * 10) / 10,
    etaDays: eta === null ? 0 : Math.round(eta * 10) / 10,
    progress: toNumber(d.progress) ?? 0.75,
    at: nowIso(),
    source: 'phase2',
  };

  writeShared({ dsnCommand: payload, dsnSent: true });
  dispatch(EVENT_DSN, payload);
  return payload;
}

/* ---------- nối vào engine, nếu engine có mặt ---------- */

function engineRef() {
  if (typeof window !== 'undefined' && window && window.phase2Engine) return window.phase2Engine;
  return null;
}

function forwardToEngine(payload) {
  const engine = engineRef();
  if (!engine || typeof engine.initFromPhase1 !== 'function') return;
  try {
    engine.initFromPhase1({
      solsRemaining: payload.solsRemaining,
      crewOnMars: payload.crewOnMars,
      signalStrength: payload.signalStrength,
      lifeSupportPercent: payload.lifeSupportPercent === null ? undefined : payload.lifeSupportPercent,
    });
  } catch (err) {
    /* engine ném lỗi thì cầu nối vẫn phải im lặng, tab kia đang chờ */
  }
}

function forwardGroundPrep() {
  const engine = engineRef();
  if (!engine || typeof engine.completeMarsGroundPrep !== 'function') return;
  try {
    engine.completeMarsGroundPrep();
  } catch (err) {
    /* như trên */
  }
}

/* ---------- nghe sự kiện / listening ---------- */

function notifyLocal(kind, payload) {
  const set = local[kind];
  if (!set) return;
  for (const fn of Array.from(set)) {
    try {
      fn(payload);
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('[bridge-adapter] người nghe lỗi / listener failed', err);
      }
    }
  }
}

function listenLocal(kind, cb) {
  if (typeof cb !== 'function') return () => {};
  const set = local[kind];
  set.add(cb);
  let done = false;
  return function unsubscribe() {
    if (done) return;
    done = true;
    set.delete(cb);
  };
}

/**
 * Đăng ký nghe tín hiệu SOS. Nghe được cả sự kiện window lẫn lời gọi
 * nội bộ, nên chạy đúng trong trình duyệt và trong test node.
 * Listen for the SOS. Catches both the window event and in-process
 * calls, so it behaves the same in a browser and in a node test.
 *
 * @param {(detail: object) => void} cb
 * @returns {() => void} hàm huỷ đăng ký / unsubscribe
 */
function onSos(cb) {
  if (typeof cb !== 'function') return () => {};
  const offLocal = listenLocal('sos', cb);

  let offWindow = () => {};
  if (hasWindow() && typeof window.addEventListener === 'function') {
    const handler = (ev) => {
      try {
        cb(ev && ev.detail ? ev.detail : {});
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[bridge-adapter] onSos handler lỗi', err);
        }
      }
    };
    window.addEventListener(EVENT_SOS, handler);
    offWindow = () => {
      try {
        window.removeEventListener(EVENT_SOS, handler);
      } catch (err) {
        /* window đã bị thay thì thôi */
      }
    };
  }

  let done = false;
  return function unsubscribe() {
    if (done) return;
    done = true;
    offLocal();
    offWindow();
  };
}

/**
 * Đăng ký nghe chuyện cắm đèn hiệu bãi đáp.
 * Listen for the landing beacon being planted.
 *
 * @param {(detail: object) => void} cb
 * @returns {() => void}
 */
function onBeacon(cb) {
  if (typeof cb !== 'function') return () => {};
  const offLocal = listenLocal('beacon', cb);

  let offWindow = () => {};
  if (hasWindow() && typeof window.addEventListener === 'function') {
    const handler = (ev) => {
      try {
        cb(ev && ev.detail ? ev.detail : { ok: true });
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[bridge-adapter] onBeacon handler lỗi', err);
        }
      }
    };
    window.addEventListener(EVENT_BEACON, handler);
    offWindow = () => {
      try {
        window.removeEventListener(EVENT_BEACON, handler);
      } catch (err) {
        /* như trên */
      }
    };
  }

  let done = false;
  return function unsubscribe() {
    if (done) return;
    done = true;
    offLocal();
    offWindow();
  };
}

/**
 * Nghe lệnh DSN phía tab Sao Hỏa.
 * Listen for the DSN command on the Mars tab side.
 *
 * @param {(detail: object) => void} cb
 * @returns {() => void}
 */
function onDsnCommand(cb) {
  if (typeof cb !== 'function') return () => {};
  if (!hasWindow() || typeof window.addEventListener !== 'function') return () => {};
  const handler = (ev) => {
    try {
      cb(ev && ev.detail ? ev.detail : {});
    } catch (err) {
      /* người nghe lỗi không được làm sập cầu nối */
    }
  };
  window.addEventListener(EVENT_DSN, handler);
  let done = false;
  return function unsubscribe() {
    if (done) return;
    done = true;
    try {
      window.removeEventListener(EVENT_DSN, handler);
    } catch (err) {
      /* thôi */
    }
  };
}

/* ---------- giả lập cho trang demo ---------- */

/**
 * Giả lập Giai đoạn 1 phát SOS, vì Giai đoạn 1 thật chưa nối.
 * Simulate the phase 1 SOS, because the real phase 1 is not wired yet.
 *
 * Đọc trạng thái chia sẻ trước để lấy số liệu thật nếu có, chỉ dùng
 * số mặc định khi không tìm thấy gì.
 * Reads the shared state first so real figures win, and only falls
 * back to defaults when nothing is there.
 *
 * @param {object} [detail]
 * @returns {object} payload đã phát
 */
function simulateSosFromPhase1(detail) {
  const d = detail || {};
  const shared = readShared();
  const percent = readLifeSupportPercent(shared);

  const merged = {
    solsRemaining:
      toNumber(d.solsRemaining) ??
      toNumber(shared.solsRemaining) ??
      (percent === null ? 288 : Math.round((300 * percent) / 100)),
    crewOnMars: toNumber(d.crewOnMars) ?? toNumber(shared.crewOnMars) ?? 1,
    signalStrength: toNumber(d.signalStrength) ?? 0.72,
    lifeSupportPercent: percent,
  };

  return sendSosToPhase2(merged);
}

/**
 * Giả lập Giai đoạn 1 cắm xong đèn hiệu.
 * Simulate phase 1 finishing the beacon.
 *
 * @returns {object}
 */
function simulateBeaconFromPhase1() {
  return deployBeacon({ ok: true });
}

/* ---------- tiện ích đọc trạng thái ---------- */

/** Ảnh chụp trạng thái chia sẻ, đã chuẩn hoá các trường hay dùng. */
function getSharedSnapshot() {
  const shared = readShared();
  const percent = readLifeSupportPercent(shared);
  return {
    solsRemaining: toNumber(shared.solsRemaining),
    crewOnMars: toNumber(shared.crewOnMars),
    signalStrength: toNumber(shared.signalStrength),
    lifeSupportPercent: percent,
    sosReceived: !!(shared.sosReceived || shared.sos_received),
    beaconDeployed: !!(shared.beaconDeployed || shared.beacon),
    dsnCommand: shared.dsnCommand || null,
    stage: shared.stage || null,
  };
}

const bridgeAdapter = {
  /* phát */
  sendSosToPhase2,
  sendDsnCommand,
  deployBeacon,
  simulateSosFromPhase1,
  simulateBeaconFromPhase1,

  /* nghe */
  onSos,
  onBeacon,
  onDsnCommand,

  /* trạng thái chia sẻ */
  readShared,
  writeShared,
  readLifeSupportPercent,
  getSharedSnapshot,

  /* tên sự kiện, để nơi khác khỏi phải chép chuỗi */
  events: { SOS: EVENT_SOS, DSN: EVENT_DSN, BEACON: EVENT_BEACON },
  SHARED_KEY,
};

/* Gắn lên window để trang demo gọi được, kể cả khi tab kia nạp trước.
   Attach to window for the demo page, even if the other tab loads first. */
if (typeof window !== 'undefined' && window) {
  window.phase2Bridge = bridgeAdapter;
}

export { bridgeAdapter, bridgeAdapter as bridge };
export default bridgeAdapter;
