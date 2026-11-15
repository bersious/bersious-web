/* engine.js — pure functions. No DOM, no fetch, no globals.
 *
 * Contract (frozen, see src/README.md):
 *   computeMission(design, scenarioId, opts) -> { resources, checks, objectives,
 *                                                 events, score, analysis }
 *
 * RULE: no balance numbers in this file. Every constant comes from
 * DATA[*].engineering_rules or from the data tables themselves.
 */

import { DATA as DEFAULT_DATA } from './data.generated.js';

const index = (list) => Object.fromEntries(list.map((x) => [x.id, x]));

/* Deterministic PRNG so a design + seed always replays identically. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function context(data = DEFAULT_DATA) {
  const inst = data.instruments;
  return {
    instruments: index(inst.instruments),
    bus: index(inst.bus_options.bus),
    power: index(inst.bus_options.power),
    battery: index(inst.bus_options.battery),
    rules: inst.engineering_rules,
    orbits: index(data.orbits.orbits),
    launchers: index(data.launchers.launchers),
    events: data.events.events,
    scenarios: index(data.scenarios.scenarios),
  };
}

export function listOptions(data = DEFAULT_DATA) {
  const c = context(data);
  return {
    instruments: Object.values(c.instruments),
    bus: Object.values(c.bus),
    power: Object.values(c.power),
    battery: Object.values(c.battery),
    orbits: Object.values(c.orbits),
    launchers: Object.values(c.launchers),
    scenarios: Object.values(c.scenarios),
  };
}

/* Science buckets: an instrument's category decides which objective metric it feeds. */
const BUCKET = {
  imaging: 'science_imaging',
  spectroscopy: 'science_thermal',
  sensing: 'science_thermal',
  space_physics: 'science_plasma',
  astronomy: 'science_other',
  geodesy: 'science_other',
  utility: null,
};

function scienceMetrics(payload, c) {
  const out = {
    science_total: 0, science_imaging: 0, science_thermal: 0,
    science_radar: 0, science_plasma: 0, science_magnetometry: 0, science_other: 0,
  };
  for (const i of payload) {
    out.science_total += i.science_value;
    const bucket = BUCKET[i.category];
    if (bucket) out[bucket] += i.science_value;
    if (i.id === 'radar_sar') out.science_radar += i.science_value;
    if (i.id === 'magnetometer') out.science_magnetometry += i.science_value;
  }
  return out;
}

export function emptyDesign(scenarioId, data = DEFAULT_DATA) {
  const c = context(data);
  const s = c.scenarios[scenarioId] || Object.values(c.scenarios)[0];
  return {
    scenarioId: s.id,
    bus: 'bus_small',
    power: 'solar_small',
    battery: 'bat_small',
    orbit: 'leo_sso_400',
    launcher: 'electron',
    duration_months: s.duration_months,
    instruments: [],
  };
}

export function computeMission(design, scenarioId = design.scenarioId, opts = {}) {
  const c = context(opts.data || DEFAULT_DATA);
  const scenario = c.scenarios[scenarioId] || Object.values(c.scenarios)[0];
  const bus = c.bus[design.bus];
  const power = c.power[design.power];
  const battery = c.battery[design.battery];
  const orbit = c.orbits[design.orbit];
  const launcher = c.launchers[design.launcher];
  const payload = design.instruments.map((id) => c.instruments[id]).filter(Boolean);

  /* Thời lượng lấy từ scenario, không bắt buộc design phải mang theo.
     Trước đây truyền design thiếu trường này là ngân sách và tuổi thọ
     tính ra NaN, kéo theo điểm tổng cũng null. */
  const durationMonths = Number.isFinite(design.duration_months) && design.duration_months > 0
    ? design.duration_months
    : scenario.duration_months;
  const years = durationMonths / 12;
  const marginFactor = 1 + c.rules.mass_margin_pct / 100;

  /* ---- Mass ---- */
  const dryMass = bus.dry_mass_kg + power.mass_kg + battery.mass_kg +
    payload.reduce((n, i) => n + i.mass_kg, 0);
  const massWithMargin = dryMass * marginFactor;
  const capacity = (launcher.capacity_kg && launcher.capacity_kg[design.orbit]) || 0;

  /* ---- Power ---- */
  const generation = power.power_gen_w;
  const draw = bus.power_overhead_w + payload.reduce((n, i) => n + i.power_w, 0);
  const eclipseWh = draw * (c.rules.battery_eclipse_minutes / 60);

  /* ---- Budget ---- */
  const payloadCost = payload.reduce((n, i) => n + i.cost_musd, 0);
  const cost = bus.cost_musd * orbit.cost_multiplier + power.cost_musd + battery.cost_musd +
    payloadCost + launcher.cost_musd + c.rules.ops_cost_musd_per_year * years;

  /* ---- Data & comms ---- */
  const generatedGbDay = payload.reduce((n, i) => n + (i.data_gb_day || 0), 0);
  const downlinkGbDay = (orbit.comm_window_pct / 100) * orbit.downlink_mbps * 86.4 +
    payload.reduce((n, i) => n + (i.downlink_gb_day || 0), 0);
  const deliveredPct = generatedGbDay > 0
    ? Math.min(100, (100 * downlinkGbDay) / generatedGbDay)
    : 100;

  /* ---- Time ---- */
  const lifetime = orbit.base_lifetime_years * (1 - 0.1 * orbit.radiation_index);

  /* ---- Seeded events, then their consequences ---- */
  const rand = mulberry32(opts.seed ?? 1);
  const phases = ['launch', 'commissioning', 'operations'];
  const fired = [];
  let genAfter = generation;
  let downlinkAfter = downlinkGbDay;
  let scienceAfter = scienceMetrics(payload, c);
  let costAfter = cost;
  let lifetimeAfter = lifetime;
  let batteryAfter = battery.capacity_wh;

  for (const phase of phases) {
    if (opts.noEvents) break;
    for (const ev of c.events) {
      if (ev.trigger_phase !== phase) continue;
      if (rand() > ev.probability) continue;
      fired.push(ev);
      const e = ev.effect || {};
      if (e.power_gen_pct) genAfter *= 1 + e.power_gen_pct / 100;
      if (e.downlink_pct) downlinkAfter *= 1 + e.downlink_pct / 100;
      if (e.cost_pct) costAfter *= 1 + e.cost_pct / 100;
      if (e.lifetime_pct) lifetimeAfter *= 1 + e.lifetime_pct / 100;
      if (e.battery_capacity_pct) batteryAfter *= 1 + e.battery_capacity_pct / 100;
      if (e.science_pct) {
        for (const k of Object.keys(scienceAfter)) {
          scienceAfter[k] *= 1 + e.science_pct / 100;
        }
      }
    }
  }

  const deliveredAfter = generatedGbDay > 0
    ? Math.min(100, (100 * downlinkAfter) / generatedGbDay)
    : 100;

  /* ---- Resources ---- */
  const pct = (value, limit) => (limit > 0 ? Math.min(100, (100 * value) / limit) : 0);
  const status = (ok, warn) => (ok ? 'ok' : warn ? 'warn' : 'fail');
  const resources = {
    mass: {
      label: 'Khối lượng',
      value: massWithMargin, limit: capacity, unit: 'kg',
      pct: pct(massWithMargin, capacity),
      status: capacity > 0 && massWithMargin <= capacity ? 'ok' : 'fail',
      detail: `${dryMass.toFixed(1)} kg khô + ${c.rules.mass_margin_pct}% biên`,
    },
    power: {
      label: 'Điện năng',
      value: draw, limit: genAfter, unit: 'W',
      pct: pct(draw, genAfter),
      status: status(draw <= genAfter * (1 - c.rules.power_margin_pct / 100),
        draw <= genAfter),
      detail: `${genAfter.toFixed(0)} W phát sau sự kiện`,
    },
    battery: {
      label: 'Pin (eclipse)',
      value: batteryAfter, limit: eclipseWh, unit: 'Wh',
      pct: pct(batteryAfter, eclipseWh),
      status: status(batteryAfter >= eclipseWh, batteryAfter >= eclipseWh * 0.85),
      detail: `cần ${eclipseWh.toFixed(0)} Wh cho ${c.rules.battery_eclipse_minutes} phút tối`,
    },
    budget: {
      label: 'Ngân sách',
      value: costAfter, limit: scenario.budget_musd, unit: 'triệu USD',
      pct: pct(costAfter, scenario.budget_musd),
      status: status(costAfter <= scenario.budget_musd,
        costAfter <= scenario.budget_musd * 1.1),
      detail: `ops ${(c.rules.ops_cost_musd_per_year * years).toFixed(1)}M cho ${years.toFixed(1)} năm`,
    },
    data: {
      label: 'Dữ liệu',
      value: generatedGbDay, limit: downlinkAfter, unit: 'GB/ngày',
      pct: pct(generatedGbDay, downlinkAfter),
      status: status(deliveredAfter >= 90, deliveredAfter >= 70),
      detail: `gửi được ${deliveredAfter.toFixed(0)}%`,
    },
    comms: {
      label: 'Liên lạc',
      value: orbit.comm_window_pct, limit: 100, unit: '% quỹ đạo',
      pct: orbit.comm_window_pct,
      status: status(orbit.comm_window_pct >= 40, orbit.comm_window_pct >= 20),
      detail: `${orbit.downlink_mbps} Mbps trong cửa sổ`,
    },
    time: {
      label: 'Thời gian',
      value: years, limit: lifetimeAfter, unit: 'năm',
      pct: pct(years, lifetimeAfter),
      status: status(years <= lifetimeAfter, years <= lifetimeAfter * 1.1),
      detail: `tuổi thọ ${lifetimeAfter.toFixed(2)} năm tại ${orbit.altitude_km} km`,
    },
  };

  /* ---- Hard compatibility checks ---- */
  const reachable = launcher.capacity_kg && launcher.capacity_kg[design.orbit] > 0;
  const checks = [
    {
      id: 'mass', label: 'Khối lượng vs. tên lửa',
      pass: capacity > 0 && massWithMargin <= capacity,
      detail: `${massWithMargin.toFixed(0)} kg (đã +${c.rules.mass_margin_pct}%) / ${capacity} kg`,
      fix: capacity > 0 && massWithMargin > capacity
        ? `Bỏ bớt thiết bị hoặc đổi tên lửa lớn hơn — thừa ${(massWithMargin - capacity).toFixed(0)} kg`
        : null,
    },
    {
      id: 'power', label: 'Phát điện vs. tiêu thụ',
      pass: draw <= power.power_gen_w,
      detail: `${draw.toFixed(0)} W / ${power.power_gen_w.toFixed(0)} W`,
      fix: draw > power.power_gen_w
        ? `Thiếu ${(draw - power.power_gen_w).toFixed(0)} W — đổi mảng pin lớn hơn hoặc bỏ thiết bị`
        : null,
    },
    {
      id: 'battery', label: 'Pin đủ cho eclipse',
      pass: battery.capacity_wh >= eclipseWh,
      detail: `${battery.capacity_wh.toFixed(0)} Wh / ${eclipseWh.toFixed(0)} Wh`,
      fix: battery.capacity_wh < eclipseWh
        ? `Thiếu ${(eclipseWh - battery.capacity_wh).toFixed(0)} Wh — pin lớn hơn, hoặc giảm tải`
        : null,
    },
    {
      id: 'orbit_class', label: 'Tên lửa tới được quỹ đạo',
      pass: reachable,
      detail: reachable ? `${launcher.name} → ${orbit.name}` : `${launcher.name} không tới ${orbit.name}`,
      fix: reachable ? null : 'Chọn tên lửa hạng cao hơn hoặc quỹ đạo thấp hơn',
    },
    {
      id: 'slots', label: 'Số thiết bị vs. bus',
      pass: payload.length <= bus.max_instruments,
      detail: `${payload.length} / ${bus.max_instruments} khe`,
      fix: payload.length > bus.max_instruments
        ? `Bỏ ${payload.length - bus.max_instruments} thiết bị hoặc đổi bus lớn hơn`
        : null,
    },
  ];

  /* ---- Objectives ---- */
  const metrics = {
    ...scienceAfter,
    revisit_hours: orbit.revisit_hours,
    lifetime_years: lifetimeAfter,
    data_delivered_pct: deliveredAfter,
    comm_window_pct: orbit.comm_window_pct,
    mass_kg: massWithMargin,
    cost_musd: costAfter,
  };

  const objectives = scenario.objectives.map((o) => {
    const actual = metrics[o.metric];
    const pass = actual === undefined ? false
      : o.operator === 'min' ? actual >= o.target : actual <= o.target;
    return {
      id: o.id, label: o.label, metric: o.metric, operator: o.operator,
      target: o.target, actual: actual ?? null, weight: o.weight, pass,
      explain: o.explain,
      gap: actual === undefined ? null : (o.operator === 'min'
        ? Math.max(0, o.target - actual)
        : Math.max(0, actual - o.target)),
    };
  });

  /* ---- Score: 40 mission / 25 science / 20 efficiency / 15 robustness ---- */
  const gatesPass = checks.every((k) => k.pass);
  const missionSuccess = gatesPass
    ? 100 * objectives.reduce((n, o) => n + (o.pass ? o.weight : 0), 0)
    : 0;

  const maxSlots = Math.max(...Object.values(c.bus).map((b) => b.max_instruments));
  const ceiling = Object.values(c.instruments)
    .map((i) => i.science_value)
    .sort((a, b) => b - a)
    .slice(0, maxSlots)
    .reduce((n, v) => n + v, 0);
  const scienceValue = ceiling > 0 ? Math.min(100, (100 * scienceAfter.science_total) / ceiling) : 0;

  const headroom = (r) => Math.max(0, Math.min(1, 1 - r.value / (r.limit || 1)));
  const efficiency = 100 * (
    headroom(resources.mass) * 0.4 +
    headroom(resources.budget) * 0.4 +
    headroom(resources.power) * 0.2
  );

  const firedPenalty = fired.reduce((n, ev) => n + (ev.severity === 'high' ? 22 : ev.severity === 'medium' ? 12 : 6), 0);
  const mitigated = fired.filter((ev) => {
    const e = ev.effect || {};
    if (e.power_gen_pct) return resources.power.limit > resources.power.value * 1.15;
    if (e.downlink_pct) return deliveredAfter >= 85;
    if (e.battery_capacity_pct) return batteryAfter >= eclipseWh;
    if (e.lifetime_pct) return lifetimeAfter > years * 1.1;
    if (e.science_pct) return resources.data.status === 'ok';
    return false;
  });
  const robustness = Math.max(0, Math.min(100,
    100 - firedPenalty + mitigated.length * 10));

  const total = Math.round(
    missionSuccess * 0.40 + scienceValue * 0.25 + efficiency * 0.20 + robustness * 0.15
  );

  /* ---- Itemised analysis: why it failed, and what would fix it ---- */
  const analysis = [];
  for (const k of checks.filter((k) => !k.pass)) {
    analysis.push({
      level: 'fail', area: k.label,
      message: `${k.label} không đạt — ${k.detail}`,
      fix: k.fix,
    });
  }
  for (const r of Object.entries(resources)) {
    const [key, res] = r;
    if (key === 'mass' || key === 'power' || key === 'battery') continue;
    if (res.status === 'fail') {
      analysis.push({
        level: 'fail', area: res.label,
        message: `${res.label}: ${res.value.toFixed(1)} / ${res.limit.toFixed(1)} ${res.unit} — ${res.detail}`,
        fix: fixFor(key),
      });
    } else if (res.status === 'warn') {
      analysis.push({
        level: 'warn', area: res.label,
        message: `${res.label} sát giới hạn: ${res.detail}`,
        fix: fixFor(key),
      });
    }
  }
  for (const o of objectives.filter((o) => !o.pass)) {
    analysis.push({
      level: 'fail', area: o.label,
      message: `${o.label}: cần ${o.operator === 'min' ? '≥' : '≤'} ${o.target}, thực tế ${o.actual === null ? '—' : o.actual.toFixed(1)} (lệch ${o.gap.toFixed(1)})`,
      fix: o.explain || null,
    });
  }
  if (!analysis.length) {
    analysis.push({
      level: 'ok', area: 'Toàn bộ',
      message: 'Mọi cổng tương thích và mọi mục tiêu đều đạt. Điểm còn lại đến từ hiệu quả tài nguyên và mức chịu sự cố.',
      fix: null,
    });
  }

  return {
    design, scenario,
    resources, checks, objectives,
    events: fired.map((ev) => ({ id: ev.id, name: ev.name, phase: ev.trigger_phase, narrative: ev.narrative, mitigation_hint: ev.mitigation_hint, severity: ev.severity })),
    score: {
      total,
      mission_success: Math.round(missionSuccess),
      science_value: Math.round(scienceValue),
      resource_efficiency: Math.round(efficiency),
      robustness: Math.round(robustness),
      band: total >= 80 ? 'excellent' : total >= 60 ? 'good' : total >= 40 ? 'marginal' : 'failed',
      gates_pass: gatesPass,
    },
    analysis,
    derived: { dryMass, massWithMargin, draw, generation, eclipseWh, cost: costAfter, generatedGbDay, downlinkGbDay: downlinkAfter, deliveredPct: deliveredAfter, lifetime: lifetimeAfter },
  };

  function fixFor(key) {
    switch (key) {
      case 'budget': return 'Bỏ một thiết bị đắt, đổi tên lửa rẻ hơn, hoặc giảm thời gian hoạt động';
      case 'data': return 'Thêm thiết bị downlink, hoặc chọn quỹ đạo có cửa sổ liên lạc rộng hơn';
      case 'comms': return 'MEO/GEO có cửa sổ lớn hơn nhưng tốn tên lửa và tiền hơn';
      case 'time': return 'Giảm thời gian sứ mệnh, hoặc chọn quỹ đạo ít bức xạ hơn';
      default: return null;
    }
  }
}
