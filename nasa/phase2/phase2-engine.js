/* ============================================================
   phase2-engine.js: bộ não của Trung tâm Điều khiển Sứ mệnh
   Phase 2 mission control brain

   Bốn bước / four steps:
     cml1  chốt mục tiêu chuyến bay (objective)
     cml3  lắp tàu (module tradespace)
     cml4  kiểm duyệt và bấm phóng (review and launch)
     execution  bay, gửi lệnh, hạ cánh (cruise, command, landing)

   QUY TẮC / RULES
   - Không viết lại công thức vật lý. Mọi con số khối lượng, delta-v,
     trễ tín hiệu đều gọi từ src/nasa-data.js, nơi đã có test riêng.
     No physics is re-implemented here. Mass, delta-v and signal delay
     all come from src/nasa-data.js, which already carries its own tests.
   - Module thuần logic, không chạm DOM. Chỉ phát sự kiện qua
     subscribe() và qua window CustomEvent cho cầu nối.
     Pure logic, no DOM. Events go out through subscribe() and through
     window CustomEvents for the bridge.
   - Song ngữ VI + EN cho mọi chuỗi hiển thị. Không dấu gạch dài.
     Bilingual VI + EN for every display string. No em dashes.
   ============================================================ */

import {
  loadRescueData,
  getModule,
  summarizeModules,
  availableDeltaV_ms,
  REQUIRED_DELTA_V_MS,
  signalDelayMinutes,
  marsDistanceForSol,
  solToEarthDays,
  earthDaysToSol,
  formatVi,
} from '../nasa-data.js';

/* ============================================================
   1. HẰNG SỐ CỦA GIAI ĐOẠN 2
   Phase 2 constants
   ============================================================ */

/** Số ngày Trái Đất mà gói tiếp tế 412 sol tương ứng.
 *  Earth days for the 412 sol supply run. */
const SUPPLIES_SOLS = 412;

/** Chuyến đón người về đúng 258,9 ngày bay, đổi ra sol.
 *  The crew pickup run takes exactly 258.9 days, expressed in sols. */
const MAV_SOLS = earthDaysToSol(258.9);

/** Hiệu suất tấm pin mặt trời ở Sao Hỏa. Module ROSA ghi rõ trong
 *  tradeoff: ánh sáng yếu hơn Trái Đất khoảng 43 phần trăm nên 30 kW
 *  thực tế chỉ còn khoảng 17 kW. Dùng đúng con số đó, không tự đoán.
 *  Solar output at Mars. The ROSA module states 30 kW drops to about
 *  17 kW because sunlight is roughly 43 percent weaker there. */
const MARS_SOLAR_FACTOR = 0.57;

/** Trễ một chiều tối đa mà trò chơi coi là còn điều khiển được.
 *  One way delay the game treats as still workable. */
const COMMS_LIMIT_MINUTES = 30;

/** Băng thông tối thiểu để gửi dữ liệu y tế của phi hành đoàn.
 *  Minimum bandwidth for crew medical telemetry. */
const COMMS_MIN_KBPS = 64;
const COMMS_COMFORT_KBPS = 128;

/** Hệ số an toàn cho từng mục kiểm tra, tính bằng phần trăm dư.
 *  Margin factors for the checklist, in percent spare. */
const MASS_MARGIN_GREEN = 35;
const POWER_MARGIN_GREEN = 35;
const DELTA_V_MARGIN_GREEN = 5;
const LIFE_MARGIN_GREEN = 10;

/** Nhịp mô phỏng chuyến bay, tính bằng mili giây. Trong trình duyệt
 *  chỉ nên kéo khoảng mười mấy giây, không ai chờ 259 ngày.
 *  Cruise pacing in milliseconds, a demo length rather than 259 days. */
const DEFAULT_CRUISE_MS = 14000;
const DEFAULT_LANDING_DELAY_MS = 900;

/** Biên viễn thông tối thiểu, dB. Dưới ngưỡng này thì không còn dư
 *  địa sửa lỗi bit và gói lệnh hạ cánh không tới được.
 *  Minimum link margin in dB, below which bit error correction runs
 *  out and the landing command never lands. */
const COMMS_MARGIN_MIN_DB = 3;

/** Số mâu thuẫn chưa giải quyết thì phi hành đoàn tan rã. Xem ghi chú
 *  ở failMutiny() để biết vì sao là 3.
 *  Unresolved crew disputes before the team breaks. */
const MUTINY_CONFLICT_LIMIT = 3;

/** Mốc phát lệnh DSN, ba phần tư quãng bay.
 *  The DSN command is sent at three quarters of the way. */
const DSN_PROGRESS = 0.75;

/* Hai mục tiêu của CML1. Số ngày là hằng số của kịch bản, khối lượng
   là phần tải trọng riêng của từng lựa chọn.
   The two CML1 objectives: fixed transit times, per-objective payload. */
const OBJECTIVES = {
  supplies: {
    id: 'supplies',
    solsToArrival: SUPPLIES_SOLS,
    payloadKg: 0,
    payloadCostMusd: 0,
    extraSuppliesDays: 1000,
    nameVi: 'Gói tiếp tế duy trì sự sống',
    nameEn: 'Life support supply package',
  },
  mav_kit: {
    id: 'mav_kit',
    solsToArrival: Math.round(MAV_SOLS * 10) / 10,
    payloadKg: 5200,
    payloadCostMusd: 150,
    extraSuppliesDays: 0,
    nameVi: 'Bộ tên lửa đón phi hành đoàn về',
    nameEn: 'Mars ascent vehicle kit',
  },
};

/** Nhóm module tự động chọn, người chơi vẫn đổi được nếu muốn.
 *  Auto-picked groups the player may still override. */
const AUTO_GROUPS = ['propulsion', 'propellant', 'life_support', 'shielding', 'supplies'];

/** Ba hồ sơ đường bay của cửa sổ chuyển tiếp, đơn vị ngày Trái Đất.
 *  Ba id này trùng đúng id trong feature-trajectory.js và
 *  feature-component-modal.js; đổi một bên là phải đổi cả ba.
 *  The three transfer profiles, in Earth days. The ids match the two
 *  feature modules that offer the choice. */
const TRAJECTORY_DAYS = {
  hohmann: 258.9,
  fast_transit: 180,
  bi_elliptic: 320,
};

/** Cách chấm điểm "tốt nhất có sẵn" cho từng nhóm tự động. Đây là
 *  lựa chọn của nhóm làm game, không phải số liệu NASA.
 *  Scoring for the auto pick, a game side preference, not NASA data. */
const BEST_RULES = {
  propulsion: (m) => (m.isp_s || 0) * 100 - (m.mass_kg || 0) * 0.001,
  propellant: (m) => (m.propellant_kg || 0),
  life_support: (m) => (m.water_recovery_percent || 0) * 1000 - (m.mass_kg || 0) * 0.01,
  shielding: (m) => (m.effectiveness_percent || 0) * 100 - (m.mass_kg || 0) * 0.001,
  supplies: (m) => (m.days_covered || 0),
};

/** Nhóm nào nhận module id theo category nào.
 *  Which selection group maps to which module category. */
const GROUP_CATEGORY = {
  power: 'power',
  comms: 'communications',
  edl: 'science_and_edl',
  propulsion: 'propulsion',
  propellant: 'propellant',
  life_support: 'life_support',
  shielding: 'shielding',
  supplies: 'supplies',
};

const STEPS = ['cml1', 'cml3', 'cml4', 'execution'];

/**
 * Kiến trúc tham chiếu dùng cho bảng so sánh sau khi hạ cánh.
 * Reference architecture used by the after landing comparison.
 *
 * ĐÂY KHÔNG PHẢI MỘT TÀU NASA CÓ THẬT ĐANG BAY. Đây là kiến trúc
 * tham chiếu do nhóm làm game dựng lại từ dữ liệu NASA để có một mốc
 * so sánh công bằng. / This is NOT a real NASA spacecraft now flying.
 * It is a reference architecture the game team rebuilt from NASA data
 * so the player has a fair yardstick.
 */
const NASA_ANALOGUE = {
  nameVi: 'Mars Sample Return, kiến trúc tham chiếu',
  nameEn: 'Mars Sample Return, reference architecture',
  massKg: 41000,
  costMusd: 720,
  daysToArrival: 258.9,
  noteVi:
    'Đây là kiến trúc tham chiếu do nhóm làm game dựng lại từ dữ liệu NASA, không phải một tàu NASA có thật đang bay. Nó tồn tại để so sánh, không phải một thiết kế chính thức.',
  noteEn:
    'This is a reference architecture the game team rebuilt from NASA data, not a real NASA spacecraft now flying. It exists for comparison, not as an official design.',
};

/* ============================================================
   2. ĐỊNH DẠNG SỐ / NUMBER FORMATTING
   ============================================================ */

/** Số kiểu Việt Nam: chấm ngăn nghìn, phẩy thập phân. */
function numVi(value, digits = 0) {
  if (!Number.isFinite(value)) return '0';
  const s = formatVi(Math.abs(value), digits);
  const parts = s.split(',');
  const head = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const tail = digits > 0 && parts[1] ? ',' + parts[1] : '';
  return (value < 0 ? '-' : '') + head + tail;
}

/** Số kiểu Anh: phẩy ngăn nghìn, chấm thập phân. */
function numEn(value, digits = 0) {
  if (!Number.isFinite(value)) return '0';
  const s = Math.abs(value).toFixed(digits);
  const parts = s.split('.');
  const head = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const tail = digits > 0 && parts[1] ? '.' + parts[1] : '';
  return (value < 0 ? '-' : '') + head + tail;
}

function round(value, digits = 0) {
  if (!Number.isFinite(value)) return 0;
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

/* ============================================================
   3. TRẠNG THÁI GỐC / RAW STATE
   Chỉ giữ lựa chọn và cờ. Mọi con số tính lại mỗi lần buildState,
   nên không bao giờ có totals cũ nằm lại sau một lần đổi module.
   Only choices and flags live here. Every number is recomputed on
   each buildState, so stale totals can never linger.
   ============================================================ */

const subs = new Map();

let S = null;

let timers = { cruise: 0, dsn: 0, landing: 0 };
let cruiseMs = DEFAULT_CRUISE_MS;
let landingDelayMs = DEFAULT_LANDING_DELAY_MS;

/* ---------- tiện ích dữ liệu ---------- */

function data() {
  return loadRescueData();
}

function moduleIdsInCategory(category) {
  const d = data();
  return (d.modules.module_index && d.modules.module_index[category]) || [];
}

function firstOfCategory(category) {
  const ids = moduleIdsInCategory(category);
  for (const id of ids) {
    if (getModule(id)) return id;
  }
  return null;
}

/** Chọn module tốt nhất có sẵn trong một nhóm tự động. */
function pickBest(group) {
  const category = GROUP_CATEGORY[group];
  const ids = moduleIdsInCategory(category);
  const score = BEST_RULES[group] || (() => 0);
  let bestId = null;
  let bestScore = -Infinity;
  for (const id of ids) {
    const m = getModule(id);
    if (!m) continue;
    const s = score(m);
    if (s > bestScore) {
      bestScore = s;
      bestId = id;
    }
  }
  return bestId || firstOfCategory(category);
}

/** Chọn module ưu tiên, thiếu thì lấy module đầu tiên của category. */
function preferOrFirst(preferred, category) {
  const m = getModule(preferred);
  if (m && m.category === category) return preferred;
  return firstOfCategory(category);
}

function launcherOf(id) {
  const d = data();
  return (d.index && d.index.launcherById && d.index.launcherById[id]) || null;
}

function maxLauncherCapacityKg() {
  const d = data();
  const list = (d.modules.reference_launchers && d.modules.reference_launchers.vehicles) || [];
  let cap = 0;
  for (const v of list) cap = Math.max(cap, v.capacity_leo_kg || 0);
  return cap || 70000;
}

/* ============================================================
   4. TRẠNG THÁI MẶC ĐỊNH / DEFAULT STATE
   ============================================================ */

function defaultSelection() {
  return {
    objective: 'mav_kit',
    launcher: (launcherOf('sls_block1') && 'sls_block1') || (data().index.launcherIds[0] || 'sls_block1'),
    power: preferOrFirst('power_solar_rosa', 'power'),
    comms: preferOrFirst('comms_high_gain', 'communications'),
    edl: preferOrFirst('sensor_edl_suite', 'science_and_edl'),
    propulsion: pickBest('propulsion'),
    propellant: pickBest('propellant'),
    life_support: pickBest('life_support'),
    shielding: pickBest('shielding'),
    supplies: pickBest('supplies'),
    trajectory: 'hohmann',
  };
}

function defaultCounts() {
  return { propellant: 1 };
}

function freshState(opts) {
  const o = opts || {};
  const sols = Number.isFinite(o.solsRemaining) ? o.solsRemaining : 300;
  return {
    step: 'cml1',
    solsRemaining: sols,
    crewOnMars: Number.isFinite(o.crewOnMars) ? o.crewOnMars : 1,
    signalStrength: Number.isFinite(o.signalStrength) ? clamp(o.signalStrength, 0.2, 1) : 0.8,
    selection: defaultSelection(),
    counts: defaultCounts(),
    compliance: { sterilized: false, rtg_approved: false, rtgRequired: false },
    launched: false,
    landed: false,
    failed: false,
    /* Ba trường của hệ thống thua. Có từ đầu sứ mệnh để giao diện không
       phải kiểm kiểu trước khi đọc. */
    failReason: null,
    failedAt: null,
    failDetail: null,
    groundPrepDone: false,
    arrivalReached: false,
    launchedAt: null,
    comparison: null,
  };
}

function ensureState() {
  if (!S) S = freshState();
  return S;
}

/* ============================================================
   5. SỰ KIỆN / EVENTS
   ============================================================ */

function emit(event, payload) {
  const set = subs.get(event);
  if (!set || set.size === 0) return;
  for (const fn of Array.from(set)) {
    try {
      fn(payload);
    } catch (err) {
      /* Lỗi của người nghe không được làm sập engine. */
      if (typeof console !== 'undefined' && console.error) {
        console.error('[phase2-engine] người nghe lỗi / listener failed', err);
      }
    }
  }
}

function emitState(reason) {
  emit('state:changed', { state: getState(), reason: reason || 'update' });
}

/* ============================================================
   5b. THUA / FAILURE
   Bốn kiểu thua của Giai đoạn 2, mỗi kiểu đặt state.failed = true
   kèm state.failReason, phát 'mission:failed' qua cả subscribe lẫn
   window CustomEvent để cầu nối màn kết thúc bắt được.

   Vì sao phải có: trường state.failed đã tồn tại từ đầu nhưng chưa
   bao giờ được đặt thành true. Người chơi thiếu delta-v hay hạ cánh
   không radar thì engine vẫn báo hạ cánh thành công.
   ============================================================ */

/** Đánh dấu sứ mệnh thất bại. Gọi nhiều lần thì lần đầu thắng.
 *  Mark the mission failed. The first call wins, the rest are no ops. */
function failMission(reason, extra) {
  const state = ensureState();
  if (state.failed) return null;
  if (state.landed) return null;   // đã hạ cánh thì không thua nữa

  state.failed = true;
  state.failReason = reason;
  state.failedAt = Date.now();
  state.failDetail = extra ? cloneJson(extra) : null;

  /* Dừng mọi đồng hồ mô phỏng: một chuyến bay đã thua thì không được
     chạy tiếp tới hạ cánh rồi báo thành công. */
  clearAllTimers();

  const design = computeDesign(state);
  const totals = {
    massKg: round(design.wetMassKg, 0),
    costMusd: round(design.costMusd, 0),
    deltaVAvailableMs: round(design.deltaVAvailableMs, 0),
    deltaVNeededMs: design.deltaVNeededMs,
    daysToArrival: round(design.daysToArrival, 1),
    solsRemaining: round(state.solsRemaining, 1),
    signalStrength: round(state.signalStrength, 2),
    bandwidthKbps: design.bandwidthKbps,
    delayMinutes: round(design.delayMinutes, 1),
  };

  const detail = {
    reason,
    totals,
    /* extra của nơi gọi được gộp sau totals để giữ số liệu đặc thù
       của từng kiểu thua, ví dụ số mâu thuẫn chưa giải quyết. */
    ...(extra ? cloneJson(extra) : {}),
  };

  emit('mission:failed', { state: getState(), detail });
  emitState('failed');
  dispatchWindow('mission:failed', detail);
  shareState({ missionFailed: detail });

  return detail;
}

/** Có mục kiểm duyệt nào đang đỏ không. Dùng để biết người chơi cố
 *  phóng dù bảng đèn còn đỏ.
 *  Is any checklist item red. */
function redCheckIds(design, state) {
  return buildChecks(design, state)
    .filter((c) => c.status === 'red')
    .map((c) => c.id);
}

/** Biên viễn thông ước lượng, dB. Suy từ độ trễ và băng thông: mỗi
 *  lần trễ vượt 80 phần trăm ngưỡng trừ 3 dB, băng thông dưới mức
 *  thoải mái trừ thêm. Chỉ dùng để so với ngưỡng 3 dB, không phải mô
 *  hình link budget thật.
 *  Estimated link margin in dB, used only against the 3 dB floor. */
function estimateCommsMarginDb(design) {
  let db = 12;
  const delay = design.delayMinutes;
  if (delay > COMMS_LIMIT_MINUTES) {
    db -= (delay / COMMS_LIMIT_MINUTES) * 8;
  } else if (delay > COMMS_LIMIT_MINUTES * 0.8) {
    db -= 4;
  }
  if (!design.bandwidthKbps) return 0;
  if (design.bandwidthKbps < COMMS_MIN_KBPS) db -= 6;
  else if (design.bandwidthKbps < COMMS_COMFORT_KBPS) db -= 2;
  if (!design.dishDiameterM) db -= 8;
  return round(db, 1);
}

/**
 * Đếm mâu thuẫn chưa giải quyết của phi hành đoàn.
 *
 * ENGINE NÀY KHÔNG CÓ KHÁI NIỆM ĐỒNG THUẬN. Đàm phán vai trò nằm ở
 * src/negotiation.js và src/flight.js, một màn riêng chạy TRƯỚC
 * Giai đoạn 2, và nó tự xử lý binh biến bằng cờ state.mutiny của
 * chính nó. phase2-engine.js không giữ cohesion, không giữ trust.
 *
 * Nên điều kiện thua ở đây phải tự định nghĩa. Chọn cách đọc những
 * gì engine thật sự có:
 *   - cảnh báo đỏ của bảng kiểm duyệt mà người chơi bỏ qua
 *   - ba công tắc tuân thủ chưa bật
 *   - tín hiệu Giai đoạn 1 quá yếu
 * Mỗi mục là một mâu thuẫn giữa yêu cầu an toàn và quyết định của
 * người chơi. Ba mâu thuẫn cùng lúc nghĩa là không còn ai trong nhóm
 * ký vào kế hoạch, tức binh biến.
 */
function countUnresolvedConflicts(design, state) {
  const reasons = [];

  for (const id of redCheckIds(design, state)) reasons.push('check:' + id);

  if (!state.compliance.sterilized) reasons.push('compliance:sterilized');
  if (design.rtgRequired && !state.compliance.rtg_approved) {
    reasons.push('compliance:rtg_approved');
  }
  if (Number(state.signalStrength) < 0.35) reasons.push('signal:weak');

  return reasons;
}

/** Đánh giá binh biến. Trả về detail nếu thua, null nếu chưa. */
function checkMutiny(design, state) {
  const conflicts = countUnresolvedConflicts(design, state);
  if (conflicts.length < MUTINY_CONFLICT_LIMIT) return null;
  return failMission('mutiny', {
    conflicts,
    conflictCount: conflicts.length,
    conflictLimit: MUTINY_CONFLICT_LIMIT,
  });
}

function clearTimer(key) {
  if (timers[key]) {
    clearTimeout(timers[key]);
    timers[key] = 0;
  }
}

function clearAllTimers() {
  clearTimer('cruise');
  clearTimer('dsn');
  clearTimer('landing');
}

/* ============================================================
   6. TÍNH TOÁN THIẾT KẾ / DESIGN MATH
   ============================================================ */

/** Danh sách module id đang chọn, đủ để tính toàn bộ totals.
 *  Every chosen module id, enough to compute all totals. */
function buildModuleIds(sel, counts) {
  const ids = [];
  const push = (id) => {
    if (id && getModule(id)) ids.push(id);
  };
  push(sel.propulsion);
  const tankCount = clamp(counts.propellant || 1, 1, 8);
  for (let i = 0; i < tankCount; i++) push(sel.propellant);
  push(sel.life_support);
  push(sel.shielding);
  push(sel.supplies);
  push(sel.power);
  push(sel.comms);
  push(sel.edl);
  return ids;
}

/** Công suất phát thực tế ở Sao Hỏa. Tấm pin mặt trời bị suy giảm
 *  theo quỹ đạo, pin hạt nhân thì không.
 *  Real generation at Mars: solar arrays degrade, nuclear does not. */
function effectiveGenerationW(summary, ids) {
  let gen = 0;
  for (const id of ids) {
    const m = getModule(id);
    if (!m || !(m.power_w > 0)) continue;
    const isSolar = /solar|rosa/i.test(m.id) || typeof m.solar_area_m2 === 'number';
    gen += m.power_w * (isSolar ? MARS_SOLAR_FACTOR : 1);
  }
  /* Nếu dữ liệu có nguồn phát mà vòng trên không bắt được, dùng tổng
     thô của summarizeModules để không bỏ mất nguồn nào. */
  if (gen === 0 && summary.power_gen_w > 0) gen = summary.power_gen_w;
  return gen;
}

function isNuclearBatteryIds(ids) {
  return ids.some((id) => /rtg|mmrtg/i.test(String(id)));
}

/**
 * Tính toàn bộ con số của một thiết kế. Hàm thuần, không đụng state.
 * Compute every number for a design. Pure function, no state access.
 */
function computeDesign(state) {
  const sel = state.selection;
  const counts = state.counts || defaultCounts();
  const objective = OBJECTIVES[sel.objective] || OBJECTIVES.mav_kit;

  const ids = buildModuleIds(sel, counts);
  const summary = summarizeModules(ids);

  const propulsion = getModule(sel.propulsion);
  const ispS = propulsion && propulsion.isp_s ? propulsion.isp_s : 0;
  const deltaVAvailableMs = availableDeltaV_ms(summary, ispS);

  const launcher = launcherOf(sel.launcher);
  const capacityKg = launcher ? launcher.capacity_leo_kg : maxLauncherCapacityKg();

  const payloadKg = objective.payloadKg || 0;
  const wetMassKg = summary.wetMass_kg + payloadKg;
  const costMusd = summary.cost_musd + (objective.payloadCostMusd || 0);

  const powerDrawW = summary.power_draw_w;
  const powerGenW = effectiveGenerationW(summary, ids);

  /* Số sol tới nơi là hằng số của mục tiêu, nên đổi mục tiêu là đổi
     thẳng thanh thời gian. daysToArrival đổi ra ngày Trái Đất.
     Arrival sols come from the objective, so switching objectives moves
     the time gauge at once. daysToArrival is the Earth day figure. */
  /* Đường bay đã chọn chỉnh lại thời gian bay của chính mục tiêu, theo
     tỉ lệ so với hồ sơ Hohmann 258,9 ngày. Giữ nguyên khác biệt thời
     gian giữa hai mục tiêu, chỉ co giãn theo hồ sơ quỹ đạo.
     The chosen trajectory scales the objective's own transit time
     against the 258.9 day Hohmann baseline, so the difference between
     the two objectives survives while the profile still matters. */
  const hohmannDays = TRAJECTORY_DAYS.hohmann;
  const trajDays = TRAJECTORY_DAYS[sel.trajectory] || hohmannDays;
  const solsToArrival = Math.round(objective.solsToArrival * (trajDays / hohmannDays) * 10) / 10;
  const daysToArrival = solToEarthDays(solsToArrival);
  const lifeSupportDays = (summary.supplies_days || 0) + (objective.extraSuppliesDays || 0);

  /* Trễ tín hiệu ở chính điểm đến, chia thêm cho chất lượng sóng mà
     Giai đoạn 1 đo được. Sóng yếu thì thời gian chờ thực tế dài hơn.
     Delay at the arrival point, scaled by the signal quality reported
     by phase 1: a weaker link makes the usable delay longer. */
  const distanceKm = marsDistanceForSol(solsToArrival);
  const rawDelayMinutes = signalDelayMinutes(distanceKm);
  const linkFactor = clamp(state.signalStrength || 0.8, 0.35, 1);
  const delayMinutes = rawDelayMinutes / linkFactor;

  const commsModule = getModule(sel.comms);
  const bandwidthKbps = (commsModule && commsModule.bandwidth_kbps) || 0;
  const dishDiameterM = (commsModule && commsModule.dish_diameter_m) || 0;

  return {
    ids,
    summary,
    objective,
    ispS,
    deltaVAvailableMs,
    deltaVNeededMs: REQUIRED_DELTA_V_MS,
    launcher,
    launcherName: launcher ? launcher.name_en : 'chưa chọn',
    capacityKg,
    payloadKg,
    wetMassKg,
    costMusd,
    powerDrawW,
    powerGenW,
    solsToArrival,
    daysToArrival,
    lifeSupportDays,
    distanceKm,
    rawDelayMinutes,
    delayMinutes,
    bandwidthKbps,
    dishDiameterM,
  };
}

/* ============================================================
   7. THANH ĐO / GAUGES
   ok khi pct <= 80, warn khi 80 < pct <= 100, fail khi pct > 100
   ============================================================ */

function gaugeStatus(pct) {
  if (!Number.isFinite(pct)) return 'fail';
  if (pct > 100) return 'fail';
  if (pct > 80) return 'warn';
  return 'ok';
}

function makeGauge(value, limit, digits, labelKey, unit) {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 0;
  const pct = safeLimit > 0 ? (value / safeLimit) * 100 : value > 0 ? 999 : 0;
  return {
    value: round(value, digits),
    limit: round(safeLimit, digits),
    pct: round(clamp(pct, 0, 999), 1),
    status: gaugeStatus(pct),
    labelKey,
    unit,
  };
}

function buildGauges(design, state) {
  return {
    time: makeGauge(design.solsToArrival, state.solsRemaining, 1, 'p2.gauge.time', 'sol'),
    mass: makeGauge(design.wetMassKg, design.capacityKg, 0, 'p2.gauge.mass', 'kg'),
    power: makeGauge(design.powerDrawW, design.powerGenW, 0, 'p2.gauge.power', 'W'),
    comms: makeGauge(design.delayMinutes, COMMS_LIMIT_MINUTES, 1, 'p2.gauge.comms', 'min'),
  };
}

/* ============================================================
   8. BẢNG ĐÈN KIỂM DUYỆT / CML4 CHECKLIST
   ============================================================ */

function buildChecks(design, state) {
  const checks = [];

  /* ---------- 1. khối lượng / mass margin ---------- */
  {
    const mass = design.wetMassKg;
    const cap = design.capacityKg;
    const spare = cap > 0 ? ((cap - mass) / cap) * 100 : -100;
    const over = mass - cap;
    const launcherEn = design.launcher ? design.launcher.name_en : 'the selected rocket';

    const status = spare < 0 ? 'red' : spare < MASS_MARGIN_GREEN ? 'yellow' : 'green';
    const viHead =
      spare >= 0
        ? 'Khối lượng ' +
          numVi(mass) +
          ' kg trên giới hạn ' +
          numVi(cap) +
          ' kg của ' +
          launcherEn +
          ', dư ' +
          numVi(spare, 0) +
          ' phần trăm.'
        : 'Khối lượng ' +
          numVi(mass) +
          ' kg đã vượt giới hạn ' +
          numVi(cap) +
          ' kg của ' +
          launcherEn +
          ' mất ' +
          numVi(over) +
          ' kg.';
    const enHead =
      spare >= 0
        ? 'Mass ' +
          numEn(mass) +
          ' kg against the ' +
          numEn(cap) +
          ' kg limit of the ' +
          launcherEn +
          ', ' +
          numEn(spare, 0) +
          ' percent spare.'
        : 'Mass ' +
          numEn(mass) +
          ' kg is ' +
          numEn(over) +
          ' kg past the ' +
          numEn(cap) +
          ' kg limit of the ' +
          launcherEn +
          '.';
    const viTail =
      spare >= 0
        ? ' Còn ' +
          numVi(cap - mass) +
          ' kg để lắp thêm thiết bị. Ngưỡng an toàn của trò chơi là dư 35 phần trăm.'
        : ' Bỏ bớt một bình nhiên liệu hoặc đổi sang tên lửa lớn hơn.';
    const enTail =
      spare >= 0
        ? ' That leaves ' +
          numEn(cap - mass) +
          ' kg for late hardware. The game safety line is 35 percent spare.'
        : ' Drop one propellant tank or move to a bigger rocket.';

    checks.push({
      id: 'mass_margin',
      labelKey: 'p2.check.mass',
      hintKey: 'p2.check.mass.hint',
      labelVi: 'Khối lượng có vừa tên lửa không',
      labelEn: 'Does the mass fit the rocket',
      status,
      sparePercent: round(spare, 1),
      detailVi: viHead + viTail,
      detailEn: enHead + enTail,
    });
  }

  /* ---------- 2. điện năng / power margin ---------- */
  {
    const gen = design.powerGenW;
    const draw = design.powerDrawW;
    const spare = gen > 0 ? ((gen - draw) / gen) * 100 : -100;
    const deficit = draw - gen;
    const status = spare < 0 ? 'red' : spare < POWER_MARGIN_GREEN ? 'yellow' : 'green';

    const vi =
      spare >= 0
        ? 'Hệ thống phát ' +
          numVi(gen) +
          ' W sau khi tính ánh sáng yếu ở Sao Hỏa, tiêu thụ ' +
          numVi(draw) +
          ' W, còn dư ' +
          numVi(spare, 0) +
          ' phần trăm. ' +
          (spare >= POWER_MARGIN_GREEN
            ? 'Một tấm pin hỏng vẫn chưa mất cả hệ thống.'
            : 'Dư ít quá, hỏng một tấm pin là mất điện toàn tàu.')
        : 'Thiếu ' +
          numVi(deficit) +
          ' W: hệ thống cần ' +
          numVi(draw) +
          ' W mà chỉ phát được ' +
          numVi(gen) +
          ' W. Lắp thêm nguồn điện hoặc cắt bớt thiết bị tiêu thụ.';
    const en =
      spare >= 0
        ? 'Generation gives ' +
          numEn(gen) +
          ' W after the weaker sunlight at Mars, the ship draws ' +
          numEn(draw) +
          ' W, so ' +
          numEn(spare, 0) +
          ' percent is spare. ' +
          (spare >= POWER_MARGIN_GREEN
            ? 'One failed array would not take the whole system down.'
            : 'That margin is thin: one array fault blacks out the ship.')
        : 'Short ' +
          numEn(deficit) +
          ' W: the ship needs ' +
          numEn(draw) +
          ' W but generates only ' +
          numEn(gen) +
          ' W. Add a power source or drop some loads.';

    checks.push({
      id: 'power_margin',
      labelKey: 'p2.check.power',
      hintKey: 'p2.check.power.hint',
      labelVi: 'Điện phát ra có đủ dùng không',
      labelEn: 'Is there enough power',
      status,
      sparePercent: round(spare, 1),
      detailVi: vi,
      detailEn: en,
    });
  }

  /* ---------- 3. liên lạc / comms link ---------- */
  {
    const delay = design.delayMinutes;
    const bw = design.bandwidthKbps;
    const dish = design.dishDiameterM;
    let status = 'green';
    if (!bw || delay > COMMS_LIMIT_MINUTES || bw < COMMS_MIN_KBPS) status = 'red';
    else if (delay > COMMS_LIMIT_MINUTES * 0.8 || bw < COMMS_COMFORT_KBPS) status = 'yellow';

    const hasDish = bw > 0 && dish > 0;
    const vi = hasDish
      ? 'Sóng một chiều từ điểm đến mất ' +
        numVi(delay, 1) +
        ' phút, chảo ' +
        numVi(dish, 1) +
        ' m chở ' +
        numVi(bw) +
        ' kbps nên dữ liệu y tế vẫn về kịp. ' +
        (status === 'red'
          ? 'Nhưng trễ đã quá ngưỡng ' +
            numVi(COMMS_LIMIT_MINUTES) +
            ' phút của trò chơi, lệnh gửi đi sẽ tới sau khi tàu đã đổi tình huống.'
          : status === 'yellow'
            ? 'Chỉ còn ít dư địa trước ngưỡng ' + numVi(COMMS_LIMIT_MINUTES) + ' phút.'
            : 'Ngưỡng an toàn của trò chơi là ' + numVi(COMMS_LIMIT_MINUTES) + ' phút.')
      : 'Tàu không có ăng-ten, không gửi được dữ liệu y tế và không nhận được lệnh từ Trái Đất.';
    const en = hasDish
      ? 'The one way signal from the arrival point takes ' +
        numEn(delay, 1) +
        ' minutes, and a ' +
        numEn(dish, 1) +
        ' m dish carrying ' +
        numEn(bw) +
        ' kbps still returns medical data in time. ' +
        (status === 'red'
          ? 'But the delay is past the game limit of ' +
            numEn(COMMS_LIMIT_MINUTES) +
            ' minutes, so a command lands after the ship has already moved on.'
          : status === 'yellow'
            ? 'There is little room left before the ' + numEn(COMMS_LIMIT_MINUTES) + ' minute limit.'
            : 'The game safety line is ' + numEn(COMMS_LIMIT_MINUTES) + ' minutes.')
      : 'The ship has no antenna, so no medical telemetry goes home and no command comes in.';

    checks.push({
      id: 'comms_margin',
      labelKey: 'p2.check.comms',
      hintKey: 'p2.check.comms.hint',
      labelVi: 'Sóng liên lạc có về tới Trái Đất không',
      labelEn: 'Can the signal reach Earth',
      status,
      detailVi: vi,
      detailEn: en,
    });
  }

  /* ---------- 4. delta-v ---------- */
  {
    const avail = design.deltaVAvailableMs;
    const need = design.deltaVNeededMs;
    const spare = need > 0 ? ((avail - need) / need) * 100 : -100;
    const status = spare < 0 ? 'red' : spare < DELTA_V_MARGIN_GREEN ? 'yellow' : 'green';
    const short = need - avail;

    const vi =
      spare >= 0
        ? 'Nhiên liệu mang theo đốt được ' +
          numVi(avail) +
          ' m/s ở Isp ' +
          numVi(design.ispS) +
          ' giây, ngân sách cả hành trình là ' +
          numVi(need) +
          ' m/s, dư ' +
          numVi(spare, 0) +
          ' phần trăm. ' +
          (status === 'green'
            ? 'Vẫn đủ cho một lần đốt sửa đường.'
            : 'Dư mỏng quá, gần như không còn chỗ cho lần sửa đường nào.')
        : 'Delta-v khả dụng ' +
          numVi(avail) +
          ' m/s thiếu ' +
          numVi(short) +
          ' m/s so với ' +
          numVi(need) +
          ' m/s cần cho cả hành trình. Lắp thêm bình nhiên liệu hoặc đổi sang động cơ Isp cao hơn.';
    const en =
      spare >= 0
        ? 'The propellant on board delivers ' +
          numEn(avail) +
          ' m/s at Isp ' +
          numEn(design.ispS) +
          ' seconds against a ' +
          numEn(need) +
          ' m/s mission budget, ' +
          numEn(spare, 0) +
          ' percent spare. ' +
          (status === 'green'
            ? 'Enough is left for a mid course correction burn.'
            : 'That margin is thin, with almost nothing left for a correction burn.')
        : 'Available delta-v of ' +
          numEn(avail) +
          ' m/s is ' +
          numEn(short) +
          ' m/s short of the ' +
          numEn(need) +
          ' m/s the trip needs. Add a propellant tank or move to a higher Isp engine.';

    checks.push({
      id: 'delta_v',
      labelKey: 'p2.check.deltaV',
      hintKey: 'p2.check.deltaV.hint',
      labelVi: 'Nhiên liệu có đủ để bay tới Sao Hỏa không',
      labelEn: 'Is there enough fuel to reach Mars',
      status,
      sparePercent: round(spare, 1),
      detailVi: vi,
      detailEn: en,
    });
  }

  /* ---------- 5. nhu yếu phẩm / life support days ---------- */
  {
    const mission = data().mission;
    const transfer = mission.transfer || {};
    const requiredDays =
      (transfer.flight_time_days || 258.9) * 2 + (transfer.crew_surface_stay_days || 480);
    const days = design.lifeSupportDays;
    const spare = requiredDays > 0 ? ((days - requiredDays) / requiredDays) * 100 : -100;
    const status = days <= 0 ? 'red' : spare < 0 ? 'red' : spare < LIFE_MARGIN_GREEN ? 'yellow' : 'green';

    const vi =
      days <= 0
        ? 'Tàu không có khoang nhu yếu phẩm nào, phi hành đoàn không có gì để ăn uống trên đường.'
        : 'Nhu yếu phẩm đủ ' +
          numVi(days) +
          ' ngày, hành trình khứ hồi cộng thời gian chờ trên bề mặt cần ' +
          numVi(requiredDays) +
          ' ngày, ' +
          (spare >= 0 ? 'dư ' + numVi(spare, 0) + ' phần trăm.' : 'thiếu ' + numVi(-spare, 0) + ' phần trăm.') +
          (status === 'yellow' ? ' Vừa đủ, không có ngày nào cho một lần lỡ cửa sổ về.' : '');
    const en =
      days <= 0
        ? 'The ship carries no consumables bay at all, so the crew has nothing to eat or drink in transit.'
        : 'Consumables cover ' +
          numEn(days) +
          ' days, the round trip plus the surface stay needs ' +
          numEn(requiredDays) +
          ' days, ' +
          (spare >= 0 ? numEn(spare, 0) + ' percent spare.' : numEn(-spare, 0) + ' percent short.') +
          (status === 'yellow' ? ' That is just enough, with no slack for a missed return window.' : '');

    checks.push({
      id: 'life_support',
      labelKey: 'p2.check.life',
      hintKey: 'p2.check.life.hint',
      labelVi: 'Người trên tàu có đủ không khí và nước không',
      labelEn: 'Do the crew have air and water',
      status,
      sparePercent: round(spare, 1),
      detailVi: vi,
      detailEn: en,
    });
  }

  /* ---------- 6. khử trùng tàu / sterilization switch ---------- */
  {
    const on = !!state.compliance.sterilized;
    checks.push({
      id: 'sterilized',
      labelKey: 'p2.check.sterilized',
      hintKey: 'p2.check.sterilized.hint',
      labelVi: 'Tàu đã khử trùng chưa',
      labelEn: 'Is the spacecraft sterilized',
      status: on ? 'green' : 'yellow',
      detailVi: on
        ? 'Tàu đã qua quy trình khử trùng, không mang vi khuẩn Trái Đất xuống một hành tinh còn cần được giữ nguyên trạng.'
        : 'Công tắc khử trùng còn tắt. Chưa ai cấm phóng, nhưng mang vi khuẩn Trái Đất tới Sao Hỏa là việc không ai ký cho.',
      detailEn: on
        ? 'The spacecraft has been through sterilization, so it carries no Earth microbes onto a planet we still want to study untouched.'
        : 'The sterilization switch is still off. Nobody forbids the launch yet, but no one wants to sign for carrying Earth microbes to Mars.',
    });
  }

  /* ---------- 7. lịch trình / schedule against the crew clock ---------- */
  {
    const trip = design.solsToArrival;
    const life = state.solsRemaining;
    const spare = life > 0 ? ((life - trip) / life) * 100 : -100;
    const status = spare < 0 ? 'red' : spare < 10 ? 'yellow' : 'green';
    const late = trip - life;

    const vi =
      spare >= 0
        ? 'Tàu tới nơi sau ' +
          numVi(trip, 1) +
          ' sol, đồng đội còn ' +
          numVi(life, 1) +
          ' sol, về sớm hơn ' +
          numVi(life - trip, 1) +
          ' sol. ' +
          (status === 'yellow' ? 'Sát quá, một lần trễ cửa sổ là không kịp.' : 'Vẫn còn thời gian để hỏng hóc và sửa.')
        : 'Tàu cần ' +
          numVi(trip, 1) +
          ' sol để tới nơi nhưng đồng đội chỉ còn ' +
          numVi(life, 1) +
          ' sol, muộn mất ' +
          numVi(late, 1) +
          ' sol. Phải chọn chuyến nhanh hơn hoặc kéo dài được thời gian sống dưới bề mặt.';
    const en =
      spare >= 0
        ? 'The ship arrives after ' +
          numEn(trip, 1) +
          ' sols while the crew has ' +
          numEn(life, 1) +
          ' sols left, ' +
          numEn(life - trip, 1) +
          ' sols early. ' +
          (status === 'yellow' ? 'That is razor thin, one missed window and it is over.' : 'There is still room for a fault and a fix.')
        : 'The ship needs ' +
          numEn(trip, 1) +
          ' sols to arrive but the crew has only ' +
          numEn(life, 1) +
          ' sols left, ' +
          numEn(late, 1) +
          ' sols too late. Pick the faster run or stretch how long the crew can survive on the surface.';

    checks.push({
      id: 'schedule',
      labelKey: 'p2.check.schedule',
      hintKey: 'p2.check.schedule.hint',
      labelVi: 'Có kịp tới trước khi đồng đội hết thời gian không',
      labelEn: 'Will the ship arrive before the crew runs out of time',
      status,
      sparePercent: round(spare, 1),
      detailVi: vi,
      detailEn: en,
    });
  }

  /* ---------- 8. hạ cánh / EDL capability ---------- */
  {
    const edl = getModule(state.selection.edl);
    const hasEdl = !!(edl && edl.category === 'science_and_edl');
    const status = hasEdl ? 'green' : 'red';
    const vi = hasEdl
      ? 'Có bộ ' +
        edl.name_vi.toLowerCase() +
        ' gồm radar hạ cánh và cảm biến quán tính, đủ để bắt được mặt đất trong khí quyển chỉ dày bằng một phần trăm Trái Đất.'
      : 'Không có radar hạ cánh lẫn cảm biến quán tính. Khí quyển Sao Hỏa quá mỏng để dù tự lo, nên hạ cánh mà không có thiết bị đo là đâm xuống đất.';
    const en = hasEdl
      ? 'The ' +
        edl.name_en.toLowerCase() +
        ' brings landing radar and inertial sensors, enough to find the ground in an atmosphere barely one percent as thick as Earth\'s.'
      : 'There is no landing radar and no inertial sensor. The Martian atmosphere is far too thin for a parachute to do the job alone, so a landing without instruments is an impact.';

    checks.push({
      id: 'edl',
      labelKey: 'p2.check.edl',
      hintKey: 'p2.check.edl.hint',
      labelVi: 'Có đủ đồ để hạ cánh an toàn không',
      labelEn: 'Is there enough gear to land safely',
      status,
      detailVi: vi,
      detailEn: en,
    });
  }

  /* ---------- 9. pin hạt nhân / RTG launch approval ---------- */
  if (design.rtgRequired) {
    const approved = !!state.compliance.rtg_approved;
    checks.push({
      id: 'rtg_approved',
      labelKey: 'p2.check.rtg',
      hintKey: 'p2.check.rtg.hint',
      labelVi: 'Pin hạt nhân đã được cấp phép chưa',
      labelEn: 'Is the nuclear battery licensed',
      status: approved ? 'green' : 'red',
      detailVi: approved
        ? 'Giấy phép phóng nguồn phóng xạ đã có, bao gồm bản đánh giá rủi ro khi tên lửa nổ ngay sau khi rời bệ.'
        : 'Tàu đang lắp pin đồng vị phóng xạ nhưng chưa có giấy phép phóng nguồn phóng xạ. Không ai cho bay một lò plutonium 238 khi chưa qua thẩm định.',
      detailEn: approved
        ? 'The radioactive source launch licence is on file, including the risk study for a failure right after the rocket leaves the pad.'
        : 'The ship carries a radioisotope power source without a launch licence for it. Nobody flies a plutonium 238 unit before the safety review signs off.',
    });
  }

  return checks;
}

/* ============================================================
   9. SO SÁNH SAU HẠ CÁNH / COMPARISON
   ============================================================ */

function compareWord(viBetter, viWorse, enBetter, enWorse, better) {
  return {
    vi: better ? viBetter : viWorse,
    en: better ? enBetter : enWorse,
  };
}

function buildComparison(design) {
  const player = {
    massKg: round(design.wetMassKg, 0),
    costMusd: round(design.costMusd, 0),
    daysToArrival: round(design.daysToArrival, 1),
  };
  const nasa = NASA_ANALOGUE;

  const massWord = compareWord('nhẹ hơn', 'nặng hơn', 'lighter than', 'heavier than', player.massKg <= nasa.massKg);
  const costWord = compareWord('rẻ hơn', 'đắt hơn', 'cheaper than', 'pricier than', player.costMusd <= nasa.costMusd);
  const daysWord = compareWord('nhanh hơn', 'chậm hơn', 'faster than', 'slower than', player.daysToArrival <= nasa.daysToArrival);

  const massDiff = Math.abs(player.massKg - nasa.massKg);
  const costDiff = Math.abs(player.costMusd - nasa.costMusd);
  const daysDiff = Math.abs(player.daysToArrival - nasa.daysToArrival);

  const verdictVi =
    'Tàu của bạn nặng ' +
    numVi(player.massKg) +
    ' kg, ' +
    massWord.vi +
    ' kiến trúc tham chiếu ' +
    numVi(massDiff) +
    ' kg; giá ' +
    numVi(player.costMusd) +
    ' triệu USD, ' +
    costWord.vi +
    ' ' +
    numVi(costDiff) +
    ' triệu USD; tới nơi sau ' +
    numVi(player.daysToArrival, 1) +
    ' ngày, ' +
    daysWord.vi +
    ' ' +
    numVi(daysDiff, 1) +
    ' ngày. Cùng một bài toán, hai lời giải khác nhau, và cả hai đều phải trả giá bằng khối lượng.';
  const verdictEn =
    'Your ship weighs ' +
    numEn(player.massKg) +
    ' kg, ' +
    massWord.en +
    ' the reference architecture by ' +
    numEn(massDiff) +
    ' kg; it costs ' +
    numEn(player.costMusd) +
    ' million USD, ' +
    costWord.en +
    ' by ' +
    numEn(costDiff) +
    ' million; it arrives after ' +
    numEn(player.daysToArrival, 1) +
    ' days, ' +
    daysWord.en +
    ' by ' +
    numEn(daysDiff, 1) +
    ' days. Same problem, two different answers, and both pay in mass.';

  return {
    nasaAnalogue: {
      nameVi: nasa.nameVi,
      nameEn: nasa.nameEn,
      massKg: nasa.massKg,
      costMusd: nasa.costMusd,
      daysToArrival: nasa.daysToArrival,
      noteVi: nasa.noteVi,
      noteEn: nasa.noteEn,
    },
    player,
    verdictVi,
    verdictEn,
  };
}

/* ============================================================
   10. DỰNG STATE / BUILD STATE
   ============================================================ */

function buildState() {
  const state = ensureState();
  const design = computeDesign(state);
  design.rtgRequired = isNuclearBatteryIds(design.ids);
  state.compliance.rtgRequired = design.rtgRequired;

  const totals = {
    massKg: round(design.wetMassKg, 0),
    costMusd: round(design.costMusd, 0),
    powerW: round(design.powerGenW - design.powerDrawW, 0),
    deltaVAvailableMs: round(design.deltaVAvailableMs, 0),
    deltaVNeededMs: design.deltaVNeededMs,
    daysToArrival: round(design.daysToArrival, 1),
    lifeSupportDays: round(design.lifeSupportDays, 0),
    powerGenW: round(design.powerGenW, 0),
    powerDrawW: round(design.powerDrawW, 0),
    payloadKg: design.payloadKg,
    launcherCapacityKg: design.capacityKg,
    ispS: design.ispS,
    bandwidthKbps: design.bandwidthKbps,
  };

  const gauges = buildGauges(design, state);
  const checks = buildChecks(design, state);

  return {
    step: state.step,
    solsRemaining: round(state.solsRemaining, 1),
    solsToArrival: round(design.solsToArrival, 1),
    daysToArrival: round(design.daysToArrival, 1),
    crewOnMars: state.crewOnMars,
    signalStrength: round(state.signalStrength, 2),

    selection: {
      objective: state.selection.objective,
      launcher: state.selection.launcher,
      power: state.selection.power,
      comms: state.selection.comms,
      edl: state.selection.edl,
      propulsion: state.selection.propulsion,
      propellant: state.selection.propellant,
      life_support: state.selection.life_support,
      shielding: state.selection.shielding,
      supplies: state.selection.supplies,
      trajectory: state.selection.trajectory || null,
      counts: Object.assign({}, state.counts),
      moduleIds: design.ids.slice(),
    },

    totals,
    gauges,
    checks,
    compliance: {
      sterilized: !!state.compliance.sterilized,
      rtg_approved: !!state.compliance.rtg_approved,
      rtgRequired: !!design.rtgRequired,
    },
    /* Cờ tiện cho giao diện: thiết kế này có nguồn hạt nhân không.
       Convenience flag for the UI: does this design carry nuclear power. */
    hasNuclearPower: !!design.rtgRequired,

    launched: !!state.launched,
    landed: !!state.landed,
    failed: !!state.failed,
    /* Lý do thua để cầu nối màn kết thúc ánh xạ sang đúng cảnh. */
    failReason: state.failReason || null,
    failDetail: state.failDetail ? cloneJson(state.failDetail) : null,
    groundPrepDone: !!state.groundPrepDone,
    arrivalReached: !!state.arrivalReached,
    comparison: state.comparison ? cloneJson(state.comparison) : null,
  };
}

function cloneJson(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (err) {
      /* rơi xuống bản JSON, dữ liệu ở đây đều thuần */
    }
  }
  return JSON.parse(JSON.stringify(value));
}

/* ============================================================
   11. MÔ PHỎNG CHUYẾN BAY / FLIGHT SIMULATION
   ============================================================ */

function dispatchWindow(event, detail) {
  if (typeof window === 'undefined' || !window || typeof window.dispatchEvent !== 'function') return;
  try {
    const CE = typeof CustomEvent === 'function' ? CustomEvent : null;
    if (!CE) return;
    window.dispatchEvent(new CE(event, { detail }));
  } catch (err) {
    /* trình duyệt không dựng được CustomEvent thì bỏ qua, engine vẫn chạy */
  }
}

function shareState(patch) {
  if (typeof window === 'undefined' || !window) return;
  try {
    window.MARS_RESCUE_SHARED_STATE = Object.assign(
      {},
      window.MARS_RESCUE_SHARED_STATE || {},
      patch
    );
  } catch (err) {
    /* không ghi được biến toàn cục thì thôi */
  }
}

function startCruise() {
  clearTimer('cruise');
  clearTimer('dsn');
  const state = ensureState();
  const design = computeDesign(state);

  timers.dsn = setTimeout(() => {
    timers.dsn = 0;
    if (!S || !S.launched || S.landed) return;
    /* Ba phần tư quãng bay: Trái Đất gửi lệnh, và đây là lúc con tàu
       không còn sửa được gì nữa nếu đội dưới bề mặt chưa sẵn sàng.
       At three quarters: Earth sends the command, the moment after
       which the ship cannot help if the ground team is not ready. */
    const remainingSols = round(design.solsToArrival * (1 - DSN_PROGRESS), 1);
    const detail = {
      solsToArrival: remainingSols,
      etaDays: round(solToEarthDays(remainingSols), 1),
      totalSols: round(design.solsToArrival, 1),
      totalDays: round(design.daysToArrival, 1),
      progress: DSN_PROGRESS,
    };
    dispatchWindow('earth:dsn-command-sent', detail);
    shareState({ dsnCommand: detail });
    emit('cruise:dsn-command-sent', detail);
  }, Math.round(cruiseMs * DSN_PROGRESS));

  timers.cruise = setTimeout(() => {
    timers.cruise = 0;
    if (!S || !S.launched || S.landed) return;
    S.arrivalReached = true;
    emitState('arrival');
    maybeLand('cruise-complete');
  }, cruiseMs);

  /* Không giữ tiến trình node sống chỉ vì một chuyến bay mô phỏng.
     Không có tác dụng trong trình duyệt.
     Do not hold the node process open for a simulated cruise. */
  if (timers.cruise && typeof timers.cruise.unref === 'function') timers.cruise.unref();
  if (timers.dsn && typeof timers.dsn.unref === 'function') timers.dsn.unref();
}

function maybeLand(source) {
  const state = ensureState();
  if (!state.launched || state.landed || state.failed) return;
  if (!state.arrivalReached) return;

  /* ---------- bay xong mà không bắt được quỹ đạo ----------
     Đến nơi rồi mới biết ngân sách delta-v không đủ cho lần đốt bắt
     quỹ đạo. Đây là điều kiện thua đúng theo đặc tả: mô phỏng bay
     xong mà tàu vẫn không vào được quỹ đạo Sao Hỏa. Kiểm ở đây chứ
     không chỉ ở launchMission(), vì người chơi có thể phóng hợp lệ
     rồi mới đổi module giữa đường. */
  const design = computeDesign(state);
  if (design.deltaVAvailableMs < design.deltaVNeededMs) {
    failMission('orbit_miss', {
      reason: 'delta_v_short',
      deltaVAvailableMs: round(design.deltaVAvailableMs, 0),
      deltaVNeededMs: design.deltaVNeededMs,
      shortfallMs: Math.round(design.deltaVNeededMs - design.deltaVAvailableMs),
      source: source || 'cruise-complete',
    });
    return;
  }

  /* Chưa cắm đèn hiệu bãi đáp thì tàu giữ trên quỹ đạo chờ, không tự
     hạ cánh: không có mốc dưới mặt đất để radar dò. Đây là trạng thái
     CHỜ, không phải thua, vì Giai đoạn 1 còn có thể cắm đèn hiệu.
     Đường thua edl_crash vì thiếu đèn hiệu đi qua requestLanding():
     người chơi chủ động cho tàu xuống khi chưa có mốc. */
  if (!state.groundPrepDone) {
    emit('mission:awaiting-beacon', {
      solsToArrival: round(design.solsToArrival, 1),
      state: getState(),
    });
    return;
  }
  land(source);
}

function land(source) {
  const state = ensureState();
  if (state.landed || state.failed) return;
  clearAllTimers();

  const design = computeDesign(state);

  /* ---------- hạ cánh thất bại ----------
     Hai đường dẫn tới cùng một cảnh thua:
       1. bộ hạ cánh không tương thích khối lượng, tức mục edl đang đỏ
       2. chưa cắm đèn hiệu bãi đáp mà vẫn hạ cánh
     Kiểm trước khi đặt landed = true, nếu không engine sẽ báo hạ cánh
     thành công rồi mới phát hiện mình vừa đâm xuống đất. */
  const checks = buildChecks(design, state);
  const edlCheck = checks.find((c) => c.id === 'edl');
  const edlRed = !edlCheck || edlCheck.status === 'red';
  const beaconMissing = !state.groundPrepDone;

  if (edlRed || beaconMissing) {
    failMission('edl_crash', {
      reason: edlRed ? 'edl_incompatible' : 'beacon_missing',
      edlStatus: edlCheck ? edlCheck.status : 'missing',
      beaconDeployed: !!state.groundPrepDone,
      source: source || 'landing',
      payloadKg: round(design.payloadKg, 0),
      massKg: round(design.wetMassKg, 0),
    });
    return;
  }

  /* ---------- trượt quỹ đạo ----------
     Bay xong mà delta-v đã dùng hết trước khi kịp đốt bắt quỹ đạo
     thì tàu bay ngang qua Sao Hỏa. Đây là đường thua cho trường hợp
     người chơi phóng được nhưng ngân sách nhiên liệu vẫn thiếu. */
  if (design.deltaVAvailableMs < design.deltaVNeededMs) {
    failMission('orbit_miss', {
      reason: 'delta_v_short',
      deltaVAvailableMs: round(design.deltaVAvailableMs, 0),
      deltaVNeededMs: design.deltaVNeededMs,
      shortfallMs: Math.round(design.deltaVNeededMs - design.deltaVAvailableMs),
      source: source || 'cruise-complete',
    });
    return;
  }

  state.landed = true;
  state.arrivalReached = true;
  state.comparison = buildComparison(design);
  const payload = { state: getState(), reason: source || 'landed' };
  emit('mission:landed', payload);
  emitState('landed');
}

/* ============================================================
   12. API CÔNG KHAI / PUBLIC API
   ============================================================ */

function getState() {
  return cloneJson(buildState());
}

const phase2Engine = {
  /* ---------- khởi tạo ---------- */

  /**
   * Nhận trạng thái từ Giai đoạn 1 và mở lại một lượt chơi mới.
   * Seed from phase 1 and open a fresh run.
   *
   * @param {{solsRemaining?: number, crewOnMars?: number,
   *          signalStrength?: number, lifeSupportPercent?: number}} opts
   */
  initFromPhase1(opts) {
    const o = opts || {};
    clearAllTimers();
    const next = freshState(o);
    /* Giai đoạn 1 có thể chỉ báo phần trăm dưỡng chất còn lại. Khi
       không có solsRemaining thì quy đổi theo mốc 300 sol.
       Phase 1 may only report a life support percentage. Without an
       explicit sols figure, scale it against the 300 sol baseline. */
    if (!Number.isFinite(o.solsRemaining) && Number.isFinite(o.lifeSupportPercent)) {
      next.solsRemaining = Math.round((300 * clamp(o.lifeSupportPercent, 0, 100)) / 100);
    }
    S = next;
    emitState('init');
    return getState();
  },

  /** Chuyển bước CML. / Move to another CML step. */
  setCmlStep(step) {
    const state = ensureState();
    if (STEPS.indexOf(step) < 0) return getState();
    if (state.step === step) return getState();
    state.step = step;
    emit('step:changed', { step, state: getState() });
    emitState('step');
    return getState();
  },

  /**
   * Đổi một lựa chọn rồi tính lại toàn bộ totals và gauges.
   * Change one choice, then recompute totals and gauges.
   *
   * @param {{group: string, part: string, count?: number}} patch
   */
  updateSelection(patch) {
    const state = ensureState();
    const p = patch || {};
    const group = p.group;
    const part = p.part;
    if (!group || !part) {
      /* Riêng nhóm trajectory cho phép gỡ: part = null nghĩa là bỏ chọn
         hồ sơ đường bay. Các nhóm module không cho gỡ vì engine luôn
         phải có một module trong mỗi nhóm.
         Trajectory alone may be cleared with part = null. */
      if (group === 'trajectory' && part === null) {
        state.selection.trajectory = null;
        emitState('selection');
      }
      return getState();
    }

    let accepted = false;

    if (group === 'objective') {
      if (OBJECTIVES[part]) {
        state.selection.objective = part;
        accepted = true;
      }
    } else if (group === 'launcher') {
      if (launcherOf(part)) {
        state.selection.launcher = part;
        accepted = true;
      }
    } else if (group === 'trajectory') {
      if (TRAJECTORY_DAYS[part]) {
        state.selection.trajectory = part;
        accepted = true;
      }
    } else if (GROUP_CATEGORY[group]) {
      const m = getModule(part);
      if (m && m.category === GROUP_CATEGORY[group]) {
        state.selection[group] = part;
        accepted = true;
        if (Number.isFinite(p.count)) {
          state.counts[group] = clamp(Math.round(p.count), 1, 8);
        } else if (group === 'propellant') {
          state.counts.propellant = 1;
        }
      }
    }

    if (!accepted && typeof console !== 'undefined' && console.warn) {
      console.warn('[phase2-engine] lựa chọn không hợp lệ / unknown choice', group, part);
    }

    /* Module đẩy đổi thì Isp đổi, bình nhiên liệu đổi thì khối lượng
       đổi, nên lần nào cũng phải tính lại từ đầu.
       A new engine changes Isp, a new tank changes mass, so every call
       recomputes from scratch. */
    emitState('selection');
    return getState();
  },

  /** Bật tắt công tắc tuân thủ. / Flip a compliance switch. */
  updateCompliance(patch) {
    const state = ensureState();
    const p = patch || {};
    if (p.key === 'sterilized' || p.key === 'rtg_approved') {
      state.compliance[p.key] = !!p.value;
    }
    emitState('compliance');
    return getState();
  },

  getState,

  /** Đăng ký nghe. Trả hàm huỷ đăng ký. / Subscribe, returns unsubscribe. */
  subscribe(event, fn) {
    if (typeof fn !== 'function' || !event) return () => {};
    if (!subs.has(event)) subs.set(event, new Set());
    subs.get(event).add(fn);
    let done = false;
    return function unsubscribe() {
      if (done) return;
      done = true;
      const set = subs.get(event);
      if (!set) return;
      set.delete(fn);
      if (set.size === 0) subs.delete(event);
    };
  },

  /**
   * Phóng. Chỉ chạy khi không còn mục đỏ và không còn công tắc bắt
   * buộc nào chưa bật.
   *
   * Có một ngoại lệ: người chơi được phép CỐ PHÓNG dù bảng đèn còn
   * đỏ, bằng { force: true }. Đó là đường thua của Giai đoạn 2, không
   * phải một đường tắt: thiếu delta-v thì tàu trượt quỹ đạo, biên
   * viễn thông quá mỏng thì mất kênh điều khiển.
   * Launch, only when nothing is red and no required switch is off. A
   * player may still force the launch anyway, and that is where two of
   * the phase 2 endings come from.
   *
   * @param {{force?: boolean}} [opts]
   * @returns {{ok: boolean, blockedBy?: string[], failed?: string,
   *            state?: object}}
   */
  launchMission(opts) {
    const state = ensureState();
    const force = !!(opts && opts.force);

    if (state.launched) {
      return {
        ok: false,
        blockedBy: ['already_launched'],
        messageVi: 'Tàu đã rời bệ phóng rồi.',
        messageEn: 'The ship has already left the pad.',
        state: getState(),
      };
    }

    const view = buildState();
    const blockedBy = [];

    for (const check of view.checks) {
      if (check.status === 'red') blockedBy.push(check.id);
    }
    if (!view.compliance.sterilized) blockedBy.push('compliance.sterilized');
    if (view.compliance.rtgRequired && !view.compliance.rtg_approved) {
      blockedBy.push('compliance.rtg_approved');
    }

    /* ---------- cố phóng dù còn đỏ ----------
       Thứ tự kiểm quan trọng: thiếu delta-v thì tàu không tới nơi
       được, đó là lỗi nặng nhất và phải báo trước. Mất kênh liên lạc
       đứng sau vì tàu vẫn bay được, chỉ là không ai điều khiển. */
    if (force && blockedBy.length > 0) {
      const design = computeDesign(state);
      const marginDb = estimateCommsMarginDb(design);

      if (view.totals.deltaVAvailableMs < view.totals.deltaVNeededMs
          || blockedBy.includes('delta_v')
          || blockedBy.includes('mass_margin')) {
        const detail = failMission('orbit_miss', {
          forced: true,
          reason: 'delta_v_short',
          deltaVAvailableMs: view.totals.deltaVAvailableMs,
          deltaVNeededMs: view.totals.deltaVNeededMs,
          shortfallMs: Math.round(view.totals.deltaVNeededMs - view.totals.deltaVAvailableMs),
        });
        return {
          ok: false,
          blockedBy,
          failed: 'orbit_miss',
          messageVi: 'Đã cố phóng. Không đủ delta-v để bắt quỹ đạo Sao Hỏa.',
          messageEn: 'Forced the launch. There is not enough delta-v to capture at Mars.',
          detail,
          state: getState(),
        };
      }

      if (marginDb < COMMS_MARGIN_MIN_DB || blockedBy.includes('comms_margin')) {
        const detail = failMission('comms_lost', {
          forced: true,
          reason: 'comms_margin_low',
          marginDb,
          minDb: COMMS_MARGIN_MIN_DB,
          delayMinutes: view.totals.daysToArrival != null ? round(design.delayMinutes, 1) : null,
        });
        return {
          ok: false,
          blockedBy,
          failed: 'comms_lost',
          messageVi: 'Đã cố phóng. Biên viễn thông dưới 3 dB, mất kênh điều khiển.',
          messageEn: 'Forced the launch. The link margin is under 3 dB and the control channel is gone.',
          detail,
          state: getState(),
        };
      }

      /* Các mục đỏ khác mà vẫn cố phóng: không có cảnh thua riêng,
         chỉ là binh biến nếu số mâu thuẫn đủ nhiều. */
      const mutiny = checkMutiny(design, state);
      if (mutiny) {
        return {
          ok: false,
          blockedBy,
          failed: 'mutiny',
          messageVi: 'Đã cố phóng khi cả nhóm phản đối. Không ai còn ký kế hoạch.',
          messageEn: 'Forced the launch over the crew objections. Nobody signs the plan any more.',
          detail: mutiny,
          state: getState(),
        };
      }
    }

    if (blockedBy.length > 0) {
      /* Bị chặn thì không đổi gì cả, chỉ trả lý do.
         When blocked nothing changes, only the reasons come back. */
      return {
        ok: false,
        blockedBy,
        messageVi:
          'Chưa phóng được, còn ' +
          blockedBy.length +
          ' mục phải xử lý trước khi bấm nút.',
        messageEn:
          'Launch is on hold, ' +
          blockedBy.length +
          ' items still have to be cleared first.',
        state: getState(),
      };
    }

    state.launched = true;
    state.launchedAt = Date.now();
    state.landed = false;
    state.failed = false;
    state.failReason = null;
    state.arrivalReached = false;
    state.comparison = null;

    emit('mission:launched', { state: getState(), reason: 'launch' });
    emitState('launch');
    startCruise();

    return { ok: true, blockedBy: [], state: getState() };
  },

  /**
   * Giai đoạn 1 báo đèn hiệu bãi đáp đã cắm xong. Từ đây con tàu
   * chạy tiếp tới hạ cánh.
   * Phase 1 reports the landing beacon is up, so the ship runs on to
   * touchdown.
   */
  completeMarsGroundPrep() {
    const state = ensureState();
    if (!state.launched) {
      return {
        ok: false,
        blockedBy: ['not_launched'],
        messageVi: 'Tàu còn chưa rời bệ, chưa cần bãi đáp.',
        messageEn: 'The ship has not left the pad, so it does not need a landing zone yet.',
        state: getState(),
      };
    }
    if (state.landed) {
      return { ok: true, blockedBy: [], alreadyLanded: true, state: getState() };
    }

    state.groundPrepDone = true;
    emitState('ground-prep');

    /* Bãi đáp xong nghĩa là chặng còn lại không phụ thuộc gì bên
       ngoài nữa, cho tàu chạy thẳng tới điểm hạ cánh.
       With the pad ready the rest of the trip needs nothing else, so
       let the ship run straight to touchdown. */
    clearTimer('cruise');
    clearTimer('dsn');
    state.arrivalReached = true;

    clearTimer('landing');
    timers.landing = setTimeout(() => {
      timers.landing = 0;
      maybeLand('ground-prep');
    }, landingDelayMs);
    if (timers.landing && typeof timers.landing.unref === 'function') timers.landing.unref();

    return { ok: true, blockedBy: [], state: getState() };
  },

  /* ---------- cửa cho màn kết thúc và cho bảng test ----------
     Hai hàm dưới đây chỉ tồn tại để màn kết thúc thua và bảng test nhà
     phát triển bắn được từng cảnh mà không phải chơi lại cả Giai đoạn
     2. Chúng đi qua đúng failMission() như một lần thua thật, nên sự
     kiện mission:failed vẫn phát và state.failed vẫn được đặt. */

  /**
   * Bắn một kiểu thua của Giai đoạn 2.
   * Force one of the phase 2 endings through the real failure path.
   *
   * @param {'orbit_miss'|'comms_lost'|'edl_crash'|'mutiny'} reason
   * @returns {object|null} detail của lần thua, null nếu không hợp lệ
   */
  forceFailure(reason) {
    const allowed = ['orbit_miss', 'comms_lost', 'edl_crash', 'mutiny'];
    if (allowed.indexOf(reason) < 0) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[phase2-engine] kiểu thua không hỗ trợ / unknown reason', reason);
      }
      return null;
    }
    const state = ensureState();
    /* Bắn thử từ bảng test mà chưa phóng: đặt launched để trạng thái
       đọc ra hợp lý, và bỏ qua kiểm landed để cảnh thua luôn mở được. */
    if (!state.launched) state.launched = true;
    state.landed = false;
    state.failed = false;
    return failMission(reason, { forced: true, from: 'forceFailure' });
  },

  /**
   * Đếm mâu thuẫn chưa giải quyết, cho bảng test và cho giao diện hiện
   * con số trước khi binh biến xảy ra.
   * Count unresolved conflicts, for the dev panel and for the UI.
   */
  listConflicts() {
    const state = ensureState();
    const design = computeDesign(state);
    const conflicts = countUnresolvedConflicts(design, state);
    return {
      conflicts,
      count: conflicts.length,
      limit: MUTINY_CONFLICT_LIMIT,
      mutiny: conflicts.length >= MUTINY_CONFLICT_LIMIT,
    };
  },

  /** Biên viễn thông ước lượng, dB, cho bảng test và giao diện. */
  commsMarginDb() {
    const state = ensureState();
    return estimateCommsMarginDb(computeDesign(state));
  },

  /**
   * Người chơi chủ động cho tàu hạ cánh, dùng cho nút "hạ cánh ngay"
   * và cho bảng test. Khác completeMarsGroundPrep() ở chỗ hàm này
   * KHÔNG đánh dấu đã cắm đèn hiệu, nên nếu chưa có mốc thì đó chính
   * là đường thua edl_crash.
   * Ask the ship down now. Unlike completeMarsGroundPrep() this does
   * not mark the beacon as placed, so an unmarked descent is the
   * edl_crash ending.
   */
  requestLanding() {
    const state = ensureState();
    if (!state.launched) {
      return {
        ok: false,
        blockedBy: ['not_launched'],
        messageVi: 'Tàu còn chưa rời bệ, chưa hạ cánh được.',
        messageEn: 'The ship has not left the pad yet, so it cannot come down.',
        state: getState(),
      };
    }
    if (state.landed) return { ok: true, landed: true, state: getState() };
    if (state.failed) return { ok: false, failed: true, state: getState() };

    state.arrivalReached = true;
    land('request-landing');
    return {
      ok: !state.failed,
      failed: state.failed || null,
      failReason: state.failReason || null,
      state: getState(),
    };
  },

  /** Danh sách mục tiêu CML1 kèm số sol tới nơi. */
  listObjectives() {
    return Object.keys(OBJECTIVES).map((id) => ({
      id,
      solsToArrival: OBJECTIVES[id].solsToArrival,
      daysToArrival: round(solToEarthDays(OBJECTIVES[id].solsToArrival), 1),
      payloadKg: OBJECTIVES[id].payloadKg,
      nameVi: OBJECTIVES[id].nameVi,
      nameEn: OBJECTIVES[id].nameEn,
    }));
  },

  /** Danh sách module hợp lệ cho một nhóm lắp ráp. */
  listOptions(group) {
    if (group === 'launcher') {
      const list = (data().modules.reference_launchers && data().modules.reference_launchers.vehicles) || [];
      return list.map((v) => ({
        id: v.id,
        nameVi: v.name_en,
        nameEn: v.name_en,
        capacityLeoKg: v.capacity_leo_kg,
        costMusd: v.cost_musd,
      }));
    }
    const category = GROUP_CATEGORY[group];
    if (!category) return [];
    return moduleIdsInCategory(category)
      .map((id) => getModule(id))
      .filter(Boolean)
      .map((m) => ({ id: m.id, nameVi: m.name_vi, nameEn: m.name_en, massKg: m.mass_kg, costMusd: m.cost_musd }));
  },

  /** Chỉnh nhịp mô phỏng, dùng cho test và cho chế độ tua nhanh. */
  configure(opts) {
    const o = opts || {};
    if (Number.isFinite(o.cruiseDurationMs) && o.cruiseDurationMs > 0) {
      cruiseMs = o.cruiseDurationMs;
    }
    if (Number.isFinite(o.landingDelayMs) && o.landingDelayMs >= 0) {
      landingDelayMs = o.landingDelayMs;
    }
    return { cruiseMs, landingDelayMs };
  },

  /** Xoá sạch đồng hồ mô phỏng và mọi người nghe, dùng khi tháo trang. */
  reset() {
    clearAllTimers();
    subs.clear();
    S = null;
    cruiseMs = DEFAULT_CRUISE_MS;
    landingDelayMs = DEFAULT_LANDING_DELAY_MS;
    return phase2Engine;
  },
};

/* Gắn lên window để trang demo gọi được. Kiểm tra typeof trước để
   engine vẫn import được trong node.
   Attach to window for the demo page, guarded so node can import it. */
if (typeof window !== 'undefined' && window) {
  window.phase2Engine = phase2Engine;
}

export { phase2Engine };
export default phase2Engine;
