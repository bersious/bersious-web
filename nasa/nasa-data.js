/* ============================================================
   nasa-data.js: bộ dữ liệu NASA cho sứ mệnh giải cứu Sao Hỏa
   NASA data model for the Mars rescue mission
   ------------------------------------------------------------
   Song ngữ VI/EN. Mọi thông điệp hiển thị có cả hai bên.
   Bilingual VI/EN: every display string carries both languages.

   Nguồn số liệu: docs/11-NASA-RESOURCES.md
   Data source: docs/11-NASA-RESOURCES.md

   QUY TẮC / RULES
   - File này KHÔNG chạm DOM, KHÔNG fetch. Chỉ toán học thuần.
     This file NEVER touches the DOM and NEVER calls fetch.
   - Dữ liệu nạp bằng static import JSON, nên chạy được cả trong
     trình duyệt (ES module, Chrome 123+) và trong node 22+.
     Data is loaded with static JSON imports, so it runs both in
     the browser (ES module, Chrome 123+) and in node 22+.
   - Mọi hằng số đọc từ JSON, không viết lại trong code.
     Every constant is read from JSON, never retyped here.
   ============================================================ */

import rescueMission from './data/nasa/rescue_mission.json' with { type: 'json' };
import rescueModules from './data/nasa/rescue_modules.json' with { type: 'json' };
import crewRoles from './data/nasa/crew_roles.json' with { type: 'json' };

/* ------------------------------------------------------------
   1. NẠP DỮ LIỆU / LOADING
   ------------------------------------------------------------ */

let cached = null;

/**
 * Trả về toàn bộ dữ liệu NASA đã parse.
 * Returns the whole parsed NASA dataset.
 *
 * @returns {{mission: object, modules: object, crew: object, index: object}}
 */
export function loadRescueData() {
  if (cached) return cached;

  const moduleById = {};
  for (const m of rescueModules.modules) moduleById[m.id] = m;

  const roleById = {};
  for (const r of crewRoles.roles) roleById[r.id] = r;

  const launcherById = {};
  for (const v of rescueModules.reference_launchers.vehicles) launcherById[v.id] = v;

  cached = {
    mission: rescueMission,
    modules: rescueModules,
    crew: crewRoles,
    index: {
      moduleById,
      roleById,
      launcherById,
      moduleIds: rescueModules.modules.map((m) => m.id),
      roleIds: crewRoles.roles.map((r) => r.id),
      launcherIds: rescueModules.reference_launchers.vehicles.map((v) => v.id),
    },
  };
  return cached;
}

/* ------------------------------------------------------------
   2. HẰNG SỐ / CONSTANTS (đọc từ JSON / read from JSON)
   ------------------------------------------------------------ */

const CONST = rescueMission.physical_constants;
const SPEED_OF_LIGHT_KM_S = CONST.speed_of_light_km_s;      // 299 792,458 km/s
const G0 = CONST.standard_gravity_m_s2;                     // 9,80665 m/s2
const AU_KM = CONST.astronomical_unit_km;                   // 149 597 870,7 km

export const NASA_CONSTANTS = {
  speed_of_light_km_s: SPEED_OF_LIGHT_KM_S,
  g0: G0,
  au_km: AU_KM,
  mars_radius_km: CONST.mars_radius_km,
  mars_sol_hours: CONST.mars_sol_hours,
  earth_days_per_sol: CONST.mars_sol_hours / 24,
};

/** Delta-v cộng dồn thật của cả hành trình, đơn vị m/s.
 *  True additive delta-v budget for the whole trip, m/s. */
export const REQUIRED_DELTA_V_MS = rescueMission.delta_v_budget.additive_total_ms;

/* ------------------------------------------------------------
   3. PHƯƠNG TRÌNH TÊN LỬA TSIOLKOVSKY
   ------------------------------------------------------------ */

/**
 * Tỷ lệ khối lượng là nhiên liệu, tính từ phương trình Tsiolkovsky.
 * Propellant mass fraction from the Tsiolkovsky rocket equation.
 *
 * Công thức / Formula:
 *   dv   = ve * ln(m0 / mf)              (NASA Basics of Space Flight ch.3)
 *   ve   = Isp * g0                      (g0 = 9,80665 m/s2)
 *   m0   = khối lượng đầy / wet mass
 *   mf   = khối lượng khô / dry mass
 *   R    = m0 / mf = exp(dv / ve)        (tỷ lệ khối lượng / mass ratio)
 *   nhiên liệu / propellant = m0 - mf
 *   tỷ lệ    / fraction     = 1 - (mf / m0) = 1 - 1 / R
 *
 * Ví dụ kiểm chứng / worked example:
 *   dv = 5 600 m/s, Isp = 320 s  ->  ve = 3 138,128 m/s
 *   R = exp(5600 / 3138,128) = 5,96   ->   tỷ lệ = 83,2 %
 *   (khớp bảng trong docs mục 5.2 nhóm F / matches the doc table)
 *
 * @param {number} deltaV_ms  delta-v cần, m/s
 * @param {number} isp_s      xung lực riêng, giây / specific impulse, seconds
 * @returns {number} phần trăm khối lượng là nhiên liệu (0 tới 100)
 */
export function tsiolkovskyFuelFraction(deltaV_ms, isp_s) {
  if (!(deltaV_ms > 0)) return 0;
  if (!(isp_s > 0)) {
    throw new Error(
      'isp_s phải lớn hơn 0 / isp_s must be greater than 0'
    );
  }
  const ve = isp_s * G0;                 // vận tốc xả hiệu dụng / effective exhaust velocity
  const massRatio = Math.exp(deltaV_ms / ve);
  return (1 - 1 / massRatio) * 100;
}

/**
 * Tỷ lệ khối lượng m0/mf, tiện cho việc kiểm tra thiết kế.
 * Wet to dry mass ratio, handy for design checks.
 *
 * @param {number} deltaV_ms
 * @param {number} isp_s
 * @returns {number}
 */
export function tsiolkovskyMassRatio(deltaV_ms, isp_s) {
  if (!(deltaV_ms > 0)) return 1;
  return Math.exp(deltaV_ms / (isp_s * G0));
}

/**
 * Nhiên liệu cần cho một delta-v, khi đã biết khối lượng khô.
 * Propellant needed for a delta-v given a dry mass.
 *
 *   m_prop = m_dry * (exp(dv / ve) - 1)
 *
 * @param {number} deltaV_ms
 * @param {number} isp_s
 * @param {number} dryMass_kg
 * @returns {number} kg nhiên liệu / kg of propellant
 */
export function propellantNeededKg(deltaV_ms, isp_s, dryMass_kg) {
  if (!(deltaV_ms > 0)) return 0;
  return dryMass_kg * (Math.exp(deltaV_ms / (isp_s * G0)) - 1);
}

/* ------------------------------------------------------------
   4. TRỄ TÍN HIỆU / SIGNAL DELAY
   ------------------------------------------------------------ */

/**
 * Trễ một chiều khi tín hiệu đi một khoảng cách.
 * One-way light time for a given distance.
 *
 *   t = d / c,  c = 299 792,458 km/s
 *   phút = (d / c) / 60
 *
 * Ví dụ / example: 225 000 000 km -> 12,51 phút (docs ghi 12,5)
 *
 * @param {number} distanceKm
 * @returns {number} phút một chiều / one-way minutes
 */
export function signalDelayMinutes(distanceKm) {
  if (!(distanceKm >= 0)) {
    throw new Error(
      'distanceKm phải là số không âm / distanceKm must be non-negative'
    );
  }
  return distanceKm / SPEED_OF_LIGHT_KM_S / 60;
}

/**
 * Trễ khứ hồi, tức gấp đôi trễ một chiều.
 * Round-trip delay, twice the one-way time.
 *
 * @param {number} distanceKm
 * @returns {number} phút khứ hồi / round-trip minutes
 */
export function signalDelayRoundTripMinutes(distanceKm) {
  return signalDelayMinutes(distanceKm) * 2;
}

/**
 * Xếp một khoảng cách vào ba mốc gần, trung bình, xa của bảng trễ.
 * Bucket a distance into the near, average or far row of the table.
 *
 * @param {number} distanceKm
 * @returns {{id: string, name_vi: string, name_en: string,
 *            one_way_minutes: number, round_trip_minutes: number}|null}
 */
export function signalDelayBucketFor(distanceKm) {
  const table = rescueMission.signal_delay_table;
  let best = null;
  let bestGap = Infinity;
  for (const row of table) {
    const gap = Math.abs(row.distance_km - distanceKm);
    if (gap < bestGap) {
      bestGap = gap;
      best = row;
    }
  }
  return best;
}

/* ------------------------------------------------------------
   5. KHOẢNG CÁCH TRÁI ĐẤT TỚI SAO HỎA THEO SOL
   ------------------------------------------------------------ */

/** Ngày Trái Đất trong một sol. / Earth days in one sol. */
const EARTH_DAYS_PER_SOL = CONST.mars_sol_hours / 24;

/** Đổi sol sang ngày Trái Đất. / Convert sol to Earth days. */
export function solToEarthDays(solNumber) {
  return solNumber * EARTH_DAYS_PER_SOL;
}

/** Đổi ngày Trái Đất sang sol. / Convert Earth days to sol. */
export function earthDaysToSol(earthDays) {
  return earthDays / EARTH_DAYS_PER_SOL;
}

/**
 * Giải phương trình Kepler bằng Newton, sai số 1e-12 rad.
 * Solve Kepler's equation with Newton's method, 1e-12 rad tolerance.
 *
 *   M = E - e * sin(E)
 *
 * @param {number} M  dị thường trung bình, rad / mean anomaly
 * @param {number} e  độ lệch tâm / eccentricity
 * @returns {number} E  dị thường lệch tâm, rad / eccentric anomaly
 */
function solveKepler(M, e) {
  // Chuẩn hóa M vào khoảng -pi tới pi / normalise M to [-pi, pi]
  let Mn = M % (2 * Math.PI);
  if (Mn > Math.PI) Mn -= 2 * Math.PI;
  if (Mn < -Math.PI) Mn += 2 * Math.PI;

  let E = e < 0.8 ? Mn : Math.PI * Math.sign(Mn || 1);
  for (let i = 0; i < 60; i++) {
    const f = E - e * Math.sin(E) - Mn;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/**
 * Vị trí một hành tinh trên mặt phẳng quỹ đạo trong hệ nhật tâm, đơn vị AU.
 * Planet position in its orbital plane, heliocentric, in AU.
 *
 * Dùng nguyên công thức trong bảng quỹ đạo NASA Mission Viz:
 * Uses the formulas from the NASA Mission Viz orbital table:
 *   n  = 2*pi / period_days
 *   M  = n * (t - tau)          (đơn giản hóa: tau là pha gốc / tau is the phase)
 *   r  = a * (1 - e * cos(E))
 *   v  = 2 * atan2( sqrt(1+e) * sin(E/2), sqrt(1-e) * cos(E/2) )   (dị thường thật / true anomaly)
 *
 * @param {object} body   phần tử quỹ đạo / orbital elements
 * @param {number} days   ngày Trái Đất kể từ mốc gốc / Earth days from epoch
 * @returns {{r_au: number, lon_deg: number}}
 */
function bodyPosition(body, days) {
  const n = (2 * Math.PI) / body.period_days;
  const M = n * (days - body.tau);
  const E = solveKepler(M, body.eccentricity);
  const r = body.sma_au * (1 - body.eccentricity * Math.cos(E));
  const nu =
    2 *
    Math.atan2(
      Math.sqrt(1 + body.eccentricity) * Math.sin(E / 2),
      Math.sqrt(1 - body.eccentricity) * Math.cos(E / 2)
    );
  const lonDeg = ((nu * 180) / Math.PI + body.omega_deg + 360) % 360;
  return { r_au: r, lon_deg: lonDeg };
}

/**
 * Ước lượng khoảng cách Trái Đất tới Sao Hỏa tại một sol.
 * Estimate the Earth to Mars distance at a given sol.
 *
 * ĐÂY LÀ ƯỚC LƯỢNG ĐƠN GIẢN HÓA / THIS IS A SIMPLIFIED ESTIMATE:
 *   - Coi hai quỹ đạo cùng nằm trên một mặt phẳng, bỏ qua độ nghiêng.
 *     Both orbits treated as coplanar, inclination ignored.
 *   - Dùng các phần tử quỹ đạo trung bình trong bảng NASA Mission Viz,
 *     không dùng ephemeris thật của JPL.
 *     Mean orbital elements from the NASA Mission Viz table, not a JPL ephemeris.
 *   - Bỏ qua nhiễu loạn của Sao Mộc và các hành tinh khác.
 *     Perturbations from Jupiter and the other planets are ignored.
 *   Sai số so với khoảng cách thật có thể tới vài triệu km, đủ tốt cho
 *   cơ chế trễ tín hiệu trong game, không đủ cho dẫn đường thật.
 *   The error against the true distance can reach a few million km: fine
 *   for a game's signal-delay mechanic, not for real navigation.
 *
 * @param {number} solNumber  sol kể từ mốc gốc / sol since epoch
 * @returns {number} khoảng cách, km / distance in km
 */
export function marsDistanceForSol(solNumber) {
  const bodies = rescueMission.orbit_elements.bodies;
  const days = solNumber * EARTH_DAYS_PER_SOL;
  const earth = bodyPosition(bodies.earth, days);
  const mars = bodyPosition(bodies.mars, days);

  const dLon = ((earth.lon_deg - mars.lon_deg) * Math.PI) / 180;
  // Định lý cos trong tam giác Mặt Trời, Trái Đất, Sao Hỏa
  // Law of cosines on the Sun, Earth, Mars triangle
  const r2 =
    earth.r_au * earth.r_au +
    mars.r_au * mars.r_au -
    2 * earth.r_au * mars.r_au * Math.cos(dLon);
  return Math.sqrt(Math.max(0, r2)) * AU_KM;
}

/**
 * Bản chi tiết của marsDistanceForSol, kèm trễ tín hiệu.
 * Detailed version of marsDistanceForSol that also returns the delay.
 *
 * @param {number} solNumber
 * @returns {{distance_km: number, distance_au: number,
 *            one_way_minutes: number, round_trip_minutes: number,
 *            method_vi: string, method_en: string}}
 */
export function marsDistanceDetailForSol(solNumber) {
  const km = marsDistanceForSol(solNumber);
  const one = signalDelayMinutes(km);
  return {
    distance_km: km,
    distance_au: km / AU_KM,
    one_way_minutes: one,
    round_trip_minutes: one * 2,
    method_vi:
      'Ước lượng đơn giản hóa: hai quỹ đạo đồng phẳng, phần tử trung bình từ bảng NASA Mission Viz, bỏ qua nhiễu loạn.',
    method_en:
      'Simplified estimate: coplanar orbits, mean elements from the NASA Mission Viz table, perturbations ignored.',
  };
}

/* ------------------------------------------------------------
   6. KIỂM TRA THIẾT KẾ / DESIGN VALIDATION
   ------------------------------------------------------------ */

/** Thông điệp song ngữ. / Bilingual message. */
function msg(code, vi, en, detail) {
  return detail ? { code, vi, en, detail } : { code, vi, en };
}

/**
 * Cộng khối lượng và công suất của một tổ hợp module.
 * Sum mass and power for a module set.
 *
 * Module được phép lặp id để mua nhiều bản, ví dụ hai bình nhiên liệu.
 * A module id may repeat to buy several units, e.g. two propellant tanks.
 *
 * @param {string[]} moduleIds
 * @returns {object} tổng hợp / summary
 */
export function summarizeModules(moduleIds) {
  const { index } = loadRescueData();
  const counts = {};
  let dryMass = 0;
  let propellantMass = 0;
  let powerDraw = 0;
  let powerGen = 0;
  let cost = 0;
  let suppliesDays = null;
  let crewCount = null;
  let o2Days = null;
  let waterDays = null;
  const engines = [];
  const tanks = [];

  for (const id of moduleIds) {
    const m = index.moduleById[id];
    if (!m) continue;
    counts[id] = (counts[id] || 0) + 1;
    dryMass += m.mass_kg;
    cost += m.cost_musd;
    if (m.power_w < 0) powerDraw += -m.power_w;
    else powerGen += m.power_w;
    if (m.propellant_kg) propellantMass += m.propellant_kg;
    if (m.category === 'propulsion') engines.push(m);
    if (m.category === 'propellant') tanks.push(m);
    if (m.days_covered) {
      suppliesDays = (suppliesDays || 0) + m.days_covered;
      crewCount = Math.max(crewCount || 0, m.crew_count || 0);
      o2Days = (o2Days || 0) + m.days_covered;
      waterDays = (waterDays || 0) + m.days_covered;
    }
    if (m.water_recovery_percent) {
      // Hệ tái chế kéo dài nước dùng được theo tỷ lệ thu hồi
      // The recycler stretches the water supply by the recovery ratio
      const stretch = 1 / Math.max(0.01, 1 - m.water_recovery_percent / 100);
      if (suppliesDays) waterDays = suppliesDays * stretch;
    }
  }

  return {
    counts,
    dryMass_kg: dryMass,
    propellant_kg: propellantMass,
    wetMass_kg: dryMass + propellantMass,
    power_draw_w: powerDraw,
    power_gen_w: powerGen,
    power_balance_w: powerGen - powerDraw,
    cost_musd: cost,
    engines,
    tanks,
    supplies_days: suppliesDays,
    crew_count: crewCount,
    water_days: waterDays,
    o2_days: o2Days,
  };
}

/**
 * Delta-v khả dụng của một thiết kế, tính bằng phương trình tên lửa.
 * Delta-v available to a design, from the rocket equation.
 *
 *   dv = Isp * g0 * ln(m0 / mf)
 *   m0 = khối lượng ướt (khô + nhiên liệu) / wet mass (dry + propellant)
 *   mf = khối lượng khô / dry mass
 *
 * @param {object} summary  kết quả summarizeModules / summarizeModules output
 * @param {number} isp_s
 * @returns {number} m/s
 */
export function availableDeltaV_ms(summary, isp_s) {
  if (!(isp_s > 0)) return 0;
  if (summary.wetMass_kg <= summary.dryMass_kg) return 0;
  return isp_s * G0 * Math.log(summary.wetMass_kg / summary.dryMass_kg);
}

/**
 * Kiểm tra một thiết kế tàu cứu hộ có bay được không.
 * Check whether a rescue ship design can actually fly.
 *
 * @param {object} design
 * @param {string[]} design.moduleIds  danh sách id module, được lặp
 * @param {string}  [design.launcherId]  id tên lửa trong reference_launchers
 * @param {number}  [design.isp_s]  ghi đè Isp của động cơ / override engine Isp
 * @param {number}  [design.crewCount]  số người, mặc định lấy từ module tiếp tế
 * @returns {{pass: boolean, failures: Array, warnings: Array, summary: object}}
 */
export function validateRescueDesign(design) {
  const data = loadRescueData();
  const failures = [];
  const warnings = [];

  const moduleIds = Array.isArray(design && design.moduleIds) ? design.moduleIds : [];
  const summary = summarizeModules(moduleIds);

  // --- Không có module nào / empty design ---
  if (moduleIds.length === 0) {
    failures.push(
      msg(
        'empty_design',
        'Thiết kế chưa có module nào.',
        'The design has no modules yet.'
      )
    );
  }

  // --- Module không tồn tại / unknown module id ---
  for (const id of moduleIds) {
    if (!data.index.moduleById[id]) {
      failures.push(
        msg(
          'unknown_module',
          'Không có module nào mang id "' + id + '".',
          'No module exists with the id "' + id + '".',
          id
        )
      );
    }
  }

  // --- Động cơ / engine ---
  if (summary.engines.length === 0) {
    failures.push(
      msg(
        'no_engine',
        'Thiếu động cơ đẩy, tàu không thể đổi vận tốc.',
        'No propulsion module, the ship cannot change velocity.'
      )
    );
  } else if (summary.engines.length > 1) {
    warnings.push(
      msg(
        'multiple_engines',
        'Có ' +
          summary.engines.length +
          ' động cơ cùng lắp, khối lượng tăng mà Isp không cộng dồn. Chỉ tính động cơ đầu tiên.',
        'You mounted ' +
          summary.engines.length +
          ' engines. Mass goes up but Isp does not stack. Only the first one counts.',
        summary.engines.length
      )
    );
  }

  // --- Nhiên liệu / propellant ---
  if (summary.tanks.length === 0) {
    failures.push(
      msg(
        'no_propellant',
        'Thiếu bình nhiên liệu, delta-v khả dụng bằng 0.',
        'No propellant tank, so available delta-v is zero.'
      )
    );
  }

  // --- Delta-v / delta-v budget ---
  const chosenIsp = Number(design && design.isp_s) || (summary.engines[0] ? summary.engines[0].isp_s : 0);
  const dvAvailable = availableDeltaV_ms(summary, chosenIsp);
  if (summary.engines.length > 0 && summary.tanks.length > 0) {
    if (dvAvailable + 1e-9 < REQUIRED_DELTA_V_MS) {
      failures.push(
        msg(
          'delta_v_shortfall',
          'Delta-v khả dụng ' +
            Math.round(dvAvailable) +
            ' m/s thấp hơn mức cần ' +
            REQUIRED_DELTA_V_MS +
            ' m/s, thiếu ' +
            Math.round(REQUIRED_DELTA_V_MS - dvAvailable) +
            ' m/s.',
          'Available delta-v of ' +
            Math.round(dvAvailable) +
            ' m/s falls short of the required ' +
            REQUIRED_DELTA_V_MS +
            ' m/s, missing ' +
            Math.round(REQUIRED_DELTA_V_MS - dvAvailable) +
            ' m/s.',
          {
            available_ms: Math.round(dvAvailable),
            required_ms: REQUIRED_DELTA_V_MS,
            short_ms: Math.round(REQUIRED_DELTA_V_MS - dvAvailable),
          }
        )
      );
    } else if (dvAvailable < REQUIRED_DELTA_V_MS * 1.05) {
      warnings.push(
        msg(
          'thin_delta_v_margin',
          'Delta-v chỉ dư dưới 5 phần trăm, không có biên cho lần đốt sửa đường.',
          'Delta-v margin is under 5 percent, leaving nothing for a mid-course correction burn.',
          { available_ms: Math.round(dvAvailable), required_ms: REQUIRED_DELTA_V_MS }
        )
      );
    }
  }

  // --- Phương tiện phóng / launch vehicle ---
  const launcher = design && design.launcherId ? data.index.launcherById[design.launcherId] : null;
  if (design && design.launcherId && !launcher) {
    failures.push(
      msg(
        'unknown_launcher',
        'Không có phương tiện phóng nào mang id "' + design.launcherId + '".',
        'No launch vehicle exists with the id "' + design.launcherId + '".',
        design.launcherId
      )
    );
  }
  if (launcher) {
    if (summary.wetMass_kg > launcher.capacity_leo_kg) {
      failures.push(
        msg(
          'overweight_launch',
          'Khối lượng ướt ' +
            Math.round(summary.wetMass_kg) +
            ' kg vượt sức chở ' +
            launcher.capacity_leo_kg +
            ' kg lên LEO của ' +
            launcher.name_en +
            ', vượt ' +
            Math.round(summary.wetMass_kg - launcher.capacity_leo_kg) +
            ' kg.',
          'Wet mass of ' +
            Math.round(summary.wetMass_kg) +
            ' kg exceeds the ' +
            launcher.capacity_leo_kg +
            ' kg LEO capacity of ' +
            launcher.name_en +
            ' by ' +
            Math.round(summary.wetMass_kg - launcher.capacity_leo_kg) +
            ' kg.',
          {
            wet_mass_kg: Math.round(summary.wetMass_kg),
            capacity_kg: launcher.capacity_leo_kg,
            over_kg: Math.round(summary.wetMass_kg - launcher.capacity_leo_kg),
          }
        )
      );
    } else if (summary.wetMass_kg > launcher.capacity_leo_kg * 0.92) {
      warnings.push(
        msg(
          'thin_mass_margin',
          'Khối lượng đã dùng trên 92 phần trăm sức chở, không còn chỗ cho linh kiện phát sinh.',
          'Mass is above 92 percent of capacity, leaving no room for late hardware.',
          { wet_mass_kg: Math.round(summary.wetMass_kg), capacity_kg: launcher.capacity_leo_kg }
        )
      );
    }
  } else if (!design || !design.launcherId) {
    warnings.push(
      msg(
        'no_launcher',
        'Chưa chọn phương tiện phóng nên không kiểm tra được khối lượng.',
        'No launch vehicle chosen, so the mass check was skipped.'
      )
    );
  }

  // --- Cân bằng điện / power balance ---
  if (summary.power_balance_w < 0) {
    failures.push(
      msg(
        'power_deficit',
        'Thiếu ' +
          Math.round(-summary.power_balance_w) +
          ' W điện: hệ thống tiêu thụ ' +
          Math.round(summary.power_draw_w) +
          ' W trong khi chỉ sản xuất ' +
          Math.round(summary.power_gen_w) +
          ' W.',
        'Short ' +
          Math.round(-summary.power_balance_w) +
          ' W of power: systems draw ' +
          Math.round(summary.power_draw_w) +
          ' W while generation is only ' +
          Math.round(summary.power_gen_w) +
          ' W.',
        {
          deficit_w: Math.round(-summary.power_balance_w),
          draw_w: Math.round(summary.power_draw_w),
          gen_w: Math.round(summary.power_gen_w),
        }
      )
    );
  } else if (summary.power_balance_w < summary.power_gen_w * 0.1) {
    warnings.push(
      msg(
        'thin_power_margin',
        'Biên điện dưới 10 phần trăm, một hỏng hóc tấm pin là mất cả hệ thống.',
        'Power margin is under 10 percent, one array fault takes the system down.',
        { balance_w: Math.round(summary.power_balance_w) }
      )
    );
  }

  // --- Nhu yếu phẩm / consumables ---
  const crewWanted = Number(design && design.crewCount) || summary.crew_count || 3;
  const requiredDays =
    rescueMission.transfer.flight_time_days * 2 + rescueMission.transfer.crew_surface_stay_days;
  if (!summary.supplies_days) {
    failures.push(
      msg(
        'no_supplies',
        'Không có khoang nhu yếu phẩm, phi hành đoàn không có gì để ăn uống.',
        'No consumables bay, the crew has nothing to eat or drink.'
      )
    );
  } else if (summary.supplies_days < requiredDays) {
    failures.push(
      msg(
        'supplies_shortfall',
        'Nhu yếu phẩm chỉ đủ ' +
          Math.round(summary.supplies_days) +
          ' ngày, cần ' +
          Math.round(requiredDays) +
          ' ngày cho cả hành trình khứ hồi và thời gian chờ trên bề mặt.',
        'Consumables cover only ' +
          Math.round(summary.supplies_days) +
          ' days but the round trip plus surface stay needs ' +
          Math.round(requiredDays) +
          ' days.',
        { covered_days: Math.round(summary.supplies_days), required_days: Math.round(requiredDays) }
      )
    );
  }

  if (summary.crew_count && summary.crew_count < crewWanted) {
    warnings.push(
      msg(
        'supplies_for_fewer',
        'Khoang nhu yếu phẩm tính cho ' +
          summary.crew_count +
          ' người nhưng thiết kế cần ' +
          crewWanted +
          ' người.',
        'The consumables bay is sized for ' +
          summary.crew_count +
          ' people but the design carries ' +
          crewWanted +
          '.',
        { supplies_crew: summary.crew_count, design_crew: crewWanted }
      )
    );
  }

  // --- Lá chắn bức xạ / radiation shield ---
  const hasShield = moduleIds.some((id) => data.index.moduleById[id] && data.index.moduleById[id].category === 'shielding');
  if (!hasShield) {
    warnings.push(
      msg(
        'no_radiation_shield',
        'Không có lá chắn bức xạ, phi hành đoàn chịu toàn bộ liều trong hành trình dài.',
        'No radiation shield, so the crew absorbs the full dose over a long transit.'
      )
    );
  }

  // --- Liên lạc / link ---
  const hasComms = moduleIds.some(
    (id) => data.index.moduleById[id] && data.index.moduleById[id].category === 'communications'
  );
  if (!hasComms) {
    failures.push(
      msg(
        'no_comms',
        'Không có ăng-ten, không gửi được dữ liệu y tế và không nhận được lệnh từ Trái Đất.',
        'No antenna, so no medical telemetry and no commands from Earth.'
      )
    );
  }

  return {
    pass: failures.length === 0,
    failures,
    warnings,
    summary: {
      ...summary,
      isp_s: chosenIsp,
      delta_v_available_ms: Math.round(dvAvailable),
      delta_v_required_ms: REQUIRED_DELTA_V_MS,
      required_days: Math.round(requiredDays),
      launcher: launcher ? launcher.name_en : null,
      launcher_capacity_kg: launcher ? launcher.capacity_leo_kg : null,
    },
  };
}

/* ------------------------------------------------------------
   7. TIỆN ÍCH HIỂN THỊ / DISPLAY HELPERS
   ------------------------------------------------------------ */

/**
 * Định dạng số theo kiểu Việt Nam, dấu phẩy thập phân.
 * Format a number in Vietnamese style with a decimal comma.
 *
 * @param {number} value
 * @param {number} [digits]
 * @returns {string}
 */
export function formatVi(value, digits = 1) {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits).replace('.', ',');
}

/**
 * Lấy danh sách chặng delta-v kèm nhãn song ngữ.
 * Get the delta-v legs with bilingual labels.
 *
 * @returns {Array<{id: string, order: number, name_vi: string, name_en: string,
 *                  delta_v_ms: number, confidence: string, source: string}>}
 */
export function deltaVLegs() {
  return rescueMission.delta_v_legs
    .slice()
    .sort((a, b) => a.order - b.order);
}

/**
 * Lấy một module theo id.
 * Get one module by id.
 *
 * @param {string} id
 * @returns {object|null}
 */
export const deltaVLlegs = deltaVLegs;

export function getModule(id) {
  return loadRescueData().index.moduleById[id] || null;
}

/**
 * Lấy một vai trò phi hành đoàn theo id.
 * Get one crew role by id.
 *
 * @param {string} id
 * @returns {object|null}
 */
export function getCrewRole(id) {
  return loadRescueData().index.roleById[id] || null;
}

/**
 * Kiểm tra một quyết định có chạm quyền phủ quyết của vai trò nào không.
 * Check which roles would veto a decision topic.
 *
 * @param {string} topic  ví dụ / e.g. "cut_life_support"
 * @returns {Array<object>} các vai trò phản đối / the vetoing roles
 */
export function rolesOpposing(topic) {
  return crewRoles.roles.filter((r) => r.veto_topics.includes(topic));
}

/**
 * Mọi chuỗi hiển thị trong file này, gom một chỗ để i18n kiểm tra.
 * Every display string in this file, collected so i18n can audit it.
 */
export const NASA_UI_TEXT = {
  missionTitle: {
    vi: 'Sứ mệnh giải cứu Sao Hỏa',
    en: 'Mars rescue mission',
  },
  deltaV: { vi: 'Delta-v', en: 'Delta-v' },
  flightTime: { vi: 'Thời gian bay', en: 'Flight time' },
  signalDelay: { vi: 'Trễ tín hiệu', en: 'Signal delay' },
  oneWay: { vi: 'một chiều', en: 'one way' },
  roundTrip: { vi: 'khứ hồi', en: 'round trip' },
  fuelFraction: { vi: 'Phần khối lượng là nhiên liệu', en: 'Propellant mass fraction' },
  wetMass: { vi: 'Khối lượng ướt', en: 'Wet mass' },
  dryMass: { vi: 'Khối lượng khô', en: 'Dry mass' },
  powerBalance: { vi: 'Cân bằng điện', en: 'Power balance' },
  pass: { vi: 'Đạt', en: 'Pass' },
  fail: { vi: 'Không đạt', en: 'Fail' },
  sourceLabel: { vi: 'Nguồn', en: 'Source' },
  estimatedLabel: { vi: 'Ước tính', en: 'Estimate' },
  calculatedLabel: { vi: 'Tính toán', en: 'Calculated' },
};
