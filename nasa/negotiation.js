/* ============================================================
   negotiation.js
   Lõi xử lý đàm phán giữa ba vai trò trên tàu cứu hộ.

   File này KHÔNG chạm DOM, KHÔNG đọc localStorage, KHÔNG gọi
   fetch. Nó chỉ nhận dữ liệu vào và trả trạng thái ra, nên chạy
   được cả trong trình duyệt lẫn trong node --test.

   Mô hình:
     - cohesion        : một con số 0 tới 100 cho cả nhóm
     - roles[x].trust  : niềm tin của từng vai trò, 0 tới 100
     - cohesion_pct    : mỗi phương án cộng/trừ thẳng vào cohesion
     - role_trust      : mỗi phương án cộng/trừ vào niềm tin từng người

   Vì sao tách hai lớp số: cohesion là thứ người chơi nhìn thấy và
   là điều kiện thua, còn trust là thứ quyết định ai sẽ phản đối
   to tiếng. Một nhóm có thể đồng thuận 62 phần trăm mà vẫn có một
   người đang giận, và chính người đó làm hỏng bước tiếp theo.
   ============================================================ */

export const ROLES = ['commander', 'engineer', 'comms'];

/* Ngưỡng trạng thái. Đổi ở đây thì đổi cho cả game. */
export const THRESHOLDS = {
  good: 60,
  strained: 35,
  critical: 12,
};

const COHESION_LABELS = {
  good: { vi: 'Gắn kết', en: 'Holding together' },
  strained: { vi: 'Căng thẳng', en: 'Strained' },
  critical: { vi: 'Bên bờ vỡ', en: 'On the edge' },
  mutiny: { vi: 'Tan rã', en: 'Broken' },
};

const ROLE_LABELS = {
  commander: { vi: 'Chỉ huy', en: 'Commander' },
  engineer: { vi: 'Kỹ thuật', en: 'Engineer' },
  comms: { vi: 'Liên lạc', en: 'Comms' },
};

/* Phản ứng của người bị gạt ra ngoài. Ba mức, chọn theo mức tụt
   niềm tin của chính người đó sau quyết định. Câu ngắn, đúng
   giọng một phi hành gia đang bực chứ không phải một câu thoại. */
const REACTIONS = {
  commander: {
    hard: {
      vi: 'Chỉ huy: "Tôi ghi lại ý kiến phản đối. Quyết định này là của tôi, và tôi nhớ ai đã cản."',
      en: 'Commander: "Objection noted. This call is mine, and I remember who stood in the way."',
    },
    mid: {
      vi: 'Chỉ huy: "Được. Nhưng nếu bước sau hỏng, chúng ta không tranh luận lại chuyện này."',
      en: 'Commander: "Fine. But if the next step fails, we do not relitigate this."',
    },
    soft: {
      vi: 'Chỉ huy: "Không phải điều tôi muốn. Tôi vẫn ký."',
      en: 'Commander: "Not what I wanted. I will still sign it."',
    },
  },
  engineer: {
    hard: {
      vi: 'Kỹ thuật: "Biên an toàn vừa bị lấy đi. Tôi sẽ ghi vào nhật ký kỹ thuật kèm giờ."',
      en: 'Engineer: "That took margin out of the system. It goes in the engineering log with a timestamp."',
    },
    mid: {
      vi: 'Kỹ thuật: "Tôi không đồng ý, nhưng tôi sẽ làm đúng quy trình. Không tắt cảnh báo."',
      en: 'Engineer: "I disagree, but I will run it by the book. No alarms get muted."',
    },
    soft: {
      vi: 'Kỹ thuật: "Số liệu nói khác. Tôi để đây, ai cần thì đọc."',
      en: 'Engineer: "The numbers disagree. I will leave them here for whoever wants to read them."',
    },
  },
  comms: {
    hard: {
      vi: 'Liên lạc: "Kênh xuống Trái Đất vừa bị bỏ. Không ai biết chúng ta đang làm gì."',
      en: 'Comms: "We just dropped the link. Nobody on Earth knows what we are doing."',
    },
    mid: {
      vi: 'Liên lạc: "Tôi sẽ báo về muộn. Họ sẽ hỏi vì sao, và tôi không có câu trả lời tử tế."',
      en: 'Comms: "I will report late. They will ask why, and I have no good answer."',
    },
    soft: {
      vi: 'Liên lạc: "Ghi nhận. Tôi vẫn giữ kênh mở."',
      en: 'Comms: "Copy. I will keep the channel open."',
    },
  },
};

/* Nhãn hiển thị cho các trường effects. Panel đọc bảng này để
   không phải tự viết chuỗi riêng. */
export const EFFECT_LABELS = {
  delta_v_ms: { vi: 'vận tốc', en: 'delta v', unit: 'm/s' },
  power_w: { vi: 'điện', en: 'power', unit: 'W' },
  fuel_kg: { vi: 'nhiên liệu', en: 'propellant', unit: 'kg' },
  water_kg: { vi: 'nước', en: 'water', unit: 'kg' },
  food_kg: { vi: 'lương thực', en: 'food', unit: 'kg' },
  o2_kg: { vi: 'oxy', en: 'oxygen', unit: 'kg' },
  payload_kg: { vi: 'khối lượng', en: 'mass', unit: 'kg' },
  radiation_mSv: { vi: 'bức xạ', en: 'dose', unit: 'mSv' },
  crew_morale_pct: { vi: 'tinh thần', en: 'morale', unit: '%' },
  cohesion_pct: { vi: 'đồng thuận', en: 'cohesion', unit: '%' },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* Chuỗi phải là duy nhất trong một lượt chơi. Không seed thì lấy
   Math.random, có seed thì lấy mulberry32 để test tái lập được. */
function makeRng(seed) {
  if (seed === undefined || seed === null) return Math.random;
  let a = seed >>> 0;
  return function rng() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeEvents(events) {
  if (!events) return [];
  const list = Array.isArray(events) ? events : events.events;
  if (!Array.isArray(list)) return [];
  return list.filter((e) => e && typeof e.id === 'string');
}

export function createNegotiation({ events, startCohesion = 70, seed = null } = {}) {
  const list = normalizeEvents(events);
  const start = clamp(Number(startCohesion) || 0, 0, 100);

  const state = {
    events: list,
    byId: {},
    byPhase: {},
    rng: makeRng(seed),
    startCohesion: start,
    cohesion: start,
    roles: {},
    used: {},
    order: [],
    log: [],
    current: null,
    lastResult: null,
    mutiny: false,
    done: false,
    turn: 0,
  };

  for (const role of ROLES) {
    state.roles[role] = {
      id: role,
      name_vi: ROLE_LABELS[role].vi,
      name_en: ROLE_LABELS[role].en,
      trust: start,
      startTrust: start,
    };
  }

  for (const ev of list) {
    state.byId[ev.id] = ev;
    const phase = ev.phase || 'cruise';
    if (!state.byPhase[phase]) state.byPhase[phase] = [];
    state.byPhase[phase].push(ev);
  }

  return state;
}

/* Chọn sự kiện kế tiếp trong một phase, không lặp lại sự kiện đã
   dùng. Hết sự kiện của phase thì trả null, người gọi tự quyết
   định chuyển phase hay kết thúc. */
export function pickNextEvent(state, phase) {
  if (!state || !Array.isArray(state.events)) return null;
  if (state.mutiny) return null;

  const pool = (state.byPhase[phase] || []).filter((e) => !state.used[e.id]);
  if (!pool.length) {
    state.current = null;
    return null;
  }

  const index = Math.floor(state.rng() * pool.length) % pool.length;
  const ev = pool[index];

  state.current = ev;
  state.used[ev.id] = true;
  state.order.push(ev.id);
  state.turn += 1;

  return ev;
}

/* Áp dụng một phương án cho sự kiện đang mở.
   Trả về một object tóm tắt để lớp hiển thị dùng lại, không phải
   tự tính lại hiệu ứng. */
export function applyChoice(state, optionId) {
  if (!state) throw new Error('applyChoice: thiếu state');
  if (!state.current) throw new Error('applyChoice: chưa có sự kiện nào đang mở');

  const ev = state.current;
  const option = (ev.options || []).find((o) => o.id === optionId);
  if (!option) {
    throw new Error(`applyChoice: sự kiện ${ev.id} không có phương án ${optionId}`);
  }

  const effects = option.effects || {};
  const before = state.cohesion;

  /* cohesion_pct và crew_morale_pct là phần trăm, không phải tài
     nguyên. Mọi khoá còn lại là tài nguyên và cộng dồn. */
  const resourceDeltas = {};
  for (const [key, value] of Object.entries(effects)) {
    if (key === 'cohesion_pct' || key === 'crew_morale_pct') continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    resourceDeltas[key] = value;
  }

  const cohesionDelta = Number(effects.cohesion_pct) || 0;
  state.cohesion = clamp(state.cohesion + cohesionDelta, 0, 100);

  const moraleDelta = Number(effects.crew_morale_pct) || 0;

  const trustDeltas = {};
  const trust = option.role_trust || {};
  for (const role of ROLES) {
    const d = Number(trust[role]) || 0;
    trustDeltas[role] = d;
    state.roles[role].trust = clamp(state.roles[role].trust + d, 0, 100);
  }

  const veto = getVetoReaction(state, option);

  const entry = {
    turn: state.turn,
    eventId: ev.id,
    phase: ev.phase,
    optionId: option.id,
    favors: option.favors || null,
    cohesionBefore: before,
    cohesionAfter: state.cohesion,
    cohesionDelta,
    moraleDelta,
    resourceDeltas,
    trustDeltas,
    opposed: veto ? veto.role : null,
  };
  state.log.push(entry);

  if (state.cohesion <= 0 && !state.mutiny) {
    state.mutiny = true;
    state.done = true;
  }

  state.current = null;
  state.lastResult = { ...entry, veto, mutiny: state.mutiny };

  return state.lastResult;
}

/* Trạng thái đồng thuận để panel hiển thị. Nhãn song ngữ nằm
   ngay trong kết quả nên không cần thêm bảng tra nào ở lớp giao diện. */
export function getCohesionStatus(state) {
  const value = state ? clamp(state.cohesion, 0, 100) : 0;
  let status;
  if (state && state.mutiny) status = 'mutiny';
  else if (value >= THRESHOLDS.good) status = 'good';
  else if (value >= THRESHOLDS.strained) status = 'strained';
  else if (value >= THRESHOLDS.critical) status = 'critical';
  else status = 'mutiny';

  const label = COHESION_LABELS[status];
  return {
    value,
    label_vi: label.vi,
    label_en: label.en,
    status,
    mutiny: status === 'mutiny',
  };
}

/* Vai trò bị chọc giận là vai trò mất niềm tin nhiều nhất trong
   phương án vừa chọn, và chỉ tính khi mức mất đủ lớn để đáng nói.
   Trả null nếu không ai bị gạt (ví dụ phương án cân bằng). */
export function getVetoReaction(state, option) {
  if (!state || !option) return null;

  const trust = option.role_trust || {};
  let worstRole = null;
  let worst = 0;

  for (const role of ROLES) {
    const d = Number(trust[role]) || 0;
    if (d < worst) {
      worst = d;
      worstRole = role;
    }
  }

  if (!worstRole || worst > -3) return null;

  const tier = worst <= -8 ? 'hard' : worst <= -5 ? 'mid' : 'soft';
  const line = REACTIONS[worstRole][tier];
  const row = state.roles[worstRole];

  return {
    role: worstRole,
    name_vi: row.name_vi,
    name_en: row.name_en,
    severity: worst <= -8 ? 'high' : worst <= -5 ? 'mid' : 'low',
    trust: row.trust,
    line_vi: line.vi,
    line_en: line.en,
  };
}

/* Sự kiện đang mở, dùng cho lớp hiển thị sau pickNextEvent. */
export function getCurrentEvent(state) {
  return state ? state.current : null;
}

/* Tổng kết cuối lượt chơi. */
export function getSummary(state) {
  if (!state) return null;
  const status = getCohesionStatus(state);
  return {
    turns: state.turn,
    cohesion: status.value,
    status: status.status,
    mutiny: !!state.mutiny,
    roles: ROLES.map((r) => ({
      id: r,
      name_vi: state.roles[r].name_vi,
      name_en: state.roles[r].name_en,
      trust: state.roles[r].trust,
    })),
    log: state.log.slice(),
  };
}

/* Tiện cho lớp giao diện: dịch nhãn hiệu ứng mà không phải tự
   dựng chuỗi. Trả về mảng {key, vi, en, value, unit}. */
export function describeEffects(effects, lang = 'vi') {
  if (!effects) return [];
  const out = [];
  for (const [key, value] of Object.entries(effects)) {
    if (typeof value !== 'number') continue;
    const meta = EFFECT_LABELS[key];
    if (!meta) continue;
    out.push({
      key,
      label: lang === 'en' ? meta.en : meta.vi,
      value,
      unit: meta.unit,
      sign: value > 0 ? '+' : value < 0 ? '' : '',
    });
  }
  return out;
}

export default {
  ROLES,
  THRESHOLDS,
  EFFECT_LABELS,
  createNegotiation,
  pickNextEvent,
  applyChoice,
  getCohesionStatus,
  getVetoReaction,
  getCurrentEvent,
  getSummary,
  describeEffects,
};
