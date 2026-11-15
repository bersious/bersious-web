/* ============================================================
   mission-math.js
   Toàn bộ phép tính của bản đồ sứ mệnh Trái Đất tới Sao Hỏa.

   Tách khỏi mission-viz.js để chạy được bằng node, không cần DOM.
   Ở đây không có một dòng nào đụng tới window, document hay canvas.

   Mô hình:
     - Quỹ đạo hành tinh là ellipse Kepler 2D, Mặt Trời ở một tiêu điểm.
       Bỏ qua độ nghiêng: bản đồ nhìn từ trên xuống, nghiêng 1,85 độ của
       Sao Hỏa và 0 độ của Trái Đất không nhìn ra được ở tỉ lệ này.
     - Tàu bay trên ellipse chuyển tiếp nối đúng vị trí Trái Đất lúc
       phóng với đúng vị trí Sao Hỏa lúc tới, nửa chu kỳ 258,9 ngày.
     - Góc pha lúc phóng KHÔNG chọn tuỳ ý: nó bằng 180 độ trừ quãng
       Sao Hỏa đi được trong 258,9 ngày, tức khoảng 44,3 độ, đúng bằng
       cửa sổ phóng Hohmann thật của Sao Hỏa.

   Số liệu quỹ đạo lấy từ docs/11-NASA-RESOURCES.md mục 4.5.
   ============================================================ */

/* ---------- hằng số ---------- */

export const AU_KM = 149597870.7;
export const LIGHT_KMS = 299792.458;

/* Thời gian bay chuyển tiếp Hohmann, ngày.
   Bằng nửa chu kỳ ellipse chuyển tiếp nên cũng là mốc "tới nơi". */
export const TRANSFER_DAYS = 258.9;

/* Delta-v heliocentric, km/s, từ bảng nhiệm vụ. */
export const DELTA_V = {
  departure: 2.945,
  arrival: 2.649,
  total: 5.594,
};

/* Dải trễ tín hiệu một chiều của cả cửa sổ sứ mệnh, phút.
   Dùng làm mốc so sánh trong bảng thông số, không dùng để tính. */
export const DELAY_BAND = {
  nearest: 3.0,
  mean: 12.5,
  farthest: 22.3,
};

export const EARTH_ORBIT = {
  id: 'earth',
  a: 1.0,
  e: 0.016708,
  period: 365.25638,
  periDeg: 0,
};

export const MARS_ORBIT = {
  id: 'mars',
  a: 1.523679,
  e: 0.0934,
  period: 686.971,
  periDeg: 0,
};

/* ---------- tiện ích góc ---------- */

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function normDeg(deg) {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

export function meanMotionDeg(periodDays) {
  return 360 / periodDays;
}

/* ---------- Kepler ---------- */

/* Giải phương trình Kepler M = E - e sin E bằng Newton, xuất phát từ
   E = M. Với e dưới 0,26 như ở đây thì bốn vòng lặp là đủ chính xác
   tới 1e-12 radian, kể cả ở cận điểm. */
export function solveKepler(meanAnomalyDeg, e) {
  const M = normDeg(meanAnomalyDeg) * DEG;
  let E = M;
  for (let i = 0; i < 12; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const step = f / fp;
    E -= step;
    if (Math.abs(step) < 1e-12) break;
  }
  return E;
}

/* Vị trí trên một ellipse quanh Mặt Trời theo dị thường trung bình.
   Trả về bán kính (AU) và góc cực (độ), kèm toạ độ Descartes.
   Trục x hướng về viễn điểm của quỹ đạo. */
export function orbitState(orbit, meanAnomalyDeg) {
  const M = normDeg(meanAnomalyDeg);
  const E = solveKepler(M, orbit.e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);

  /* Bán kính theo dị thường lệch tâm: r = a (1 - e cos E).
     Công thức này ổn định hơn r = a(1-e^2)/(1+e cos nu) ở cận điểm. */
  const r = orbit.a * (1 - orbit.e * cosE);

  const nu = Math.atan2(Math.sqrt(1 - orbit.e * orbit.e) * sinE, cosE - orbit.e);
  const lonDeg = normDeg(orbit.periDeg + nu * RAD);
  const x = r * Math.cos(lonDeg * DEG);
  const y = r * Math.sin(lonDeg * DEG);

  return { M, E, nu: nu * RAD, lonDeg, r, x, y };
}

/* ---------- mốc khởi hành ---------- */

/* Dị thường trung bình để hành tinh đạt một bán kính cho trước.
   Từ r = a (1 - e cos E) suy ra cos E, rồi M = E - e sin E. */
export function meanAnomalyForRadius(orbit, radius) {
  const c = (1 - radius / orbit.a) / orbit.e;
  const E = Math.acos(clamp(c, -1, 1));
  return normDeg((E - orbit.e * Math.sin(E)) * RAD);
}

/* Góc cực tại một dị thường trung bình, chưa cộng hướng cận điểm. */
function trueAnomalyAt(orbit, meanAnomalyDeg) {
  return orbitState({ ...orbit, periDeg: 0 }, meanAnomalyDeg).nu;
}

/* ---------- đường chuyển tiếp ---------- */

/* Hohmann, dựng theo đúng ba ràng buộc của nhiệm vụ:
     1. thời gian bay 258,9 ngày, tức nửa chu kỳ, nên chu kỳ phải là
        517,8 ngày và bán trục lớn a = (517,8 / 365,25638)^(2/3) AU
     2. tàu rời đúng vị trí Trái Đất ngày phóng, ở cận điểm quỹ đạo
     3. tàu tới đúng vị trí Sao Hỏa ngày 258,9, ở viễn điểm đường bay

   Hai ràng buộc đầu khoá bán trục lớn và cận điểm. Viễn điểm suy ra
   từ a = (r_cận + r_viễn) / 2, nên không cần chọn tay: Sao Hỏa được
   đặt vào đúng bán kính đó lúc tàu tới. Nhờ vậy cả ba điều kiện cùng
   đúng một lúc, không phải nhân nhượng cái nào. */
const T_A = Math.cbrt(Math.pow((2 * TRANSFER_DAYS) / EARTH_ORBIT.period, 2));

/* Trái Đất xuất phát ở cận điểm quỹ đạo, kinh độ 0. Quy ước này cho
   hình vẽ một mốc đọc rõ và giữ được r = a(1-e) của Trái Đất. */
export const EARTH_M0 = 0;
export const EARTH_PERI_DEG = 0;

const R_DEPART = EARTH_ORBIT.a * (1 - EARTH_ORBIT.e);
const R_ARRIVE = 2 * T_A - R_DEPART;
const T_E = (R_ARRIVE - R_DEPART) / (R_ARRIVE + R_DEPART);

/* Sao Hỏa có mặt ở bán kính R_ARRIVE, kinh độ 180, vào ngày 258,9.
   Hướng cận điểm quỹ đạo Sao Hỏa chọn để điểm đó rơi đúng vào đó,
   rồi lùi lại quãng nó đã đi trong 258,9 ngày để ra vị trí lúc phóng. */
const MARS_M_ARRIVE = meanAnomalyForRadius(MARS_ORBIT, R_ARRIVE);
const MARS_NU_ARRIVE = trueAnomalyAt(MARS_ORBIT, MARS_M_ARRIVE);
export const MARS_PERI_DEG = normDeg(180 - MARS_NU_ARRIVE);
export const MARS_M0 = normDeg(MARS_M_ARRIVE - meanMotionDeg(MARS_ORBIT.period) * TRANSFER_DAYS);

/* Cửa sổ phóng: Sao Hỏa phải đi trước Trái Đất đúng 44,3 độ lúc
   phóng, để trong 258,9 ngày nó quay đủ 135,7 độ và tàu gặp nó ở
   kinh độ 180. Công thức cổ điển: 180 trừ quãng Sao Hỏa đi được.

   Đây là con số đo theo kinh độ trung bình, dùng để chọn ngày phóng.
   Góc pha THẬT lúc phóng, đo giữa hai hành tinh trên bản đồ, khác đi
   vì Sao Hỏa có tâm sai 0,0934. mission-viz hiển thị góc thật, lấy
   từ phaseSeparationDeg, và đó là con số đúng để nhìn. */
export const PHASE_AT_LAUNCH = normDeg(180 - meanMotionDeg(MARS_ORBIT.period) * TRANSFER_DAYS);

export const TRANSFER_ORBIT = {
  id: 'transfer',
  a: T_A,
  e: T_E,
  period: TRANSFER_DAYS * 2,
  periDeg: 0,
  rDepart: R_DEPART,
  rArrive: R_ARRIVE,
};

/* Trái Đất đã quay về đúng hướng cận điểm của nó. */
const EARTH = { ...EARTH_ORBIT, periDeg: EARTH_PERI_DEG };
const MARS = { ...MARS_ORBIT, periDeg: MARS_PERI_DEG };

/* Hai quỹ đạo đã quay về đúng hướng cận điểm thật. Phần vẽ phải dùng
   đúng hai bản này, không dùng EARTH_ORBIT và MARS_ORBIT gốc: bản gốc
   có hướng cận điểm bằng 0, vẽ ra vòng ellipse lệch hẳn so với chỗ
   hành tinh thật sự đứng. */
export const EARTH_PATH = EARTH;
export const MARS_PATH = MARS;

export function earthAt(day) {
  return orbitState(EARTH, EARTH_M0 + meanMotionDeg(EARTH_ORBIT.period) * day);
}

export function marsAt(day) {
  return orbitState(MARS, MARS_M0 + meanMotionDeg(MARS_ORBIT.period) * day);
}

/* ---------- đường chuyển tiếp ---------- */

/* Tàu chạy trên nửa đầu của ellipse, từ cận điểm tới viễn điểm. Dị
   thường trung bình vì thế đi đều từ 0 tới 180 độ trong 258,9 ngày,
   và bán kính tăng đơn điệu, đúng hình dạng một cung Hohmann. */
export function transferAt(day) {
  const d = clamp(day, 0, TRANSFER_DAYS);
  const M = 180 * (d / TRANSFER_DAYS);
  return orbitState(TRANSFER_ORBIT, TRANSFER_ORBIT.periDeg + M);
}

/* ---------- khoảng cách và trễ tín hiệu ---------- */

export function separationAu(day) {
  const e = earthAt(day);
  const m = marsAt(day);
  return Math.hypot(m.x - e.x, m.y - e.y);
}

export function auToKm(au) {
  return au * AU_KM;
}

/* Một chiều, phút. Khoảng cách chia tốc độ ánh sáng. */
export function delayMinutes(distanceAu) {
  return (distanceAu * AU_KM) / LIGHT_KMS / 60;
}

/* Góc pha Trái Đất nhìn Sao Hỏa, độ. 0 là cùng hướng, 180 là đối diện. */
export function phaseSeparationDeg(day) {
  const e = earthAt(day);
  const m = marsAt(day);
  let d = Math.abs(m.lonDeg - e.lonDeg) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/* ---------- định dạng số ---------- */

/* Một chỗ duy nhất quyết định dấu thập phân và dấu hàng nghìn, để cả
   bản đồ lẫn bảng số liệu không bao giờ trộn hai kiểu.

   Tiếng Việt: phẩy thập phân, chấm hàng nghìn, ví dụ 1.234,5
   Tiếng Anh:  chấm thập phân, phẩy hàng nghìn, ví dụ 1,234.5 */
export function formatNumber(value, digits = 0, lang = 'vi') {
  if (!Number.isFinite(value)) return '0';
  const fixed = Math.abs(value).toFixed(digits);
  const [intPart, decPart] = fixed.split('.');
  const thousands = lang === 'vi' ? '.' : ',';
  const decimal = lang === 'vi' ? ',' : '.';

  let out = '';
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) out += thousands;
    out += intPart[i];
  }
  if (decPart) out += decimal + decPart;
  return (value < 0 ? '-' : '') + out;
}

/* ---------- mốc đốt hiệu chỉnh ---------- */

/* Ba lần đốt TCM, cỡ vài mét trên giây, đúng thực tế: TCM không phải
   lần đốt lớn, nó chỉnh sai số vài phần nghìn mét trên giây sau khi
   tên lửa đẩy đã làm xong việc. Ngày đốt rải đều ba phần hành trình. */
export const TCM = [
  {
    id: 'tcm1',
    index: 1,
    day: 14.6,
    dvMs: 4.2,
    burnSeconds: 96,
    label: { vi: 'Đốt hiệu chỉnh 1', en: 'Correction burn 1' },
    note: {
      vi: 'Sửa sai số tên lửa đẩy ngay sau khi tách',
      en: 'Fix launcher dispersion right after separation',
    },
  },
  {
    id: 'tcm2',
    index: 2,
    day: 96.3,
    dvMs: 1.8,
    burnSeconds: 41,
    label: { vi: 'Đốt hiệu chỉnh 2', en: 'Correction burn 2' },
    note: {
      vi: 'Chỉnh điểm tới sau khi đo lại quỹ đạo',
      en: 'Trim the arrival point after orbit determination',
    },
  },
  {
    id: 'tcm3',
    index: 3,
    day: 201.5,
    dvMs: 0.9,
    burnSeconds: 22,
    label: { vi: 'Đốt hiệu chỉnh 3', en: 'Correction burn 3' },
    note: {
      vi: 'Đốt cuối, khoá góc vào khí quyển Sao Hỏa',
      en: 'Final burn, lock the entry angle at Mars',
    },
  },
];

export function tcmPassed(day) {
  let n = 0;
  for (const t of TCM) if (day >= t.day) n++;
  return n;
}

export function tcmNext(day) {
  for (const t of TCM) if (day < t.day) return t;
  return null;
}

/* ---------- đồng hồ sứ mệnh ---------- */

/* Mốc phóng cố định để mọi máy hiện cùng một ngày. Giờ UTC. */
export const LAUNCH_ISO = '2033-04-09T04:12:00Z';
const LAUNCH_MS = Date.parse(LAUNCH_ISO);

export function missionDate(day) {
  return new Date(LAUNCH_MS + day * 86400000);
}

/* Ngày và giờ dạng số, để UI tự định dạng. Giờ luôn tính theo UTC
   nên không phụ thuộc múi giờ máy người chơi. */
export function missionClock(day) {
  const d = clamp(day, 0, TRANSFER_DAYS);
  const totalMinutes = Math.round(d * 1440);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    totalMinutes,
  };
}

/* ---------- gói trạng thái cho một khung hình ---------- */

export function missionState(day) {
  const d = clamp(day, 0, TRANSFER_DAYS);
  const earth = earthAt(d);
  const mars = marsAt(d);
  const craft = transferAt(d);
  const distanceAu = separationAu(d);

  return {
    day: d,
    progress: d / TRANSFER_DAYS,
    distanceAu,
    distanceKm: auToKm(distanceAu),
    delayMinutes: delayMinutes(distanceAu),
    phaseDeg: phaseSeparationDeg(d),
    earth,
    mars,
    craft,
    tcmPassed: tcmPassed(d),
    nextTcm: tcmNext(d),
    arrived: d >= TRANSFER_DAYS,
    clock: missionClock(d),
    date: missionDate(d),
  };
}

/* ---------- quét cả hành trình ---------- */

/* Lấy mẫu khoảng cách theo từng bước ngày. Test dùng để kiểm tra hình
   dạng đường cong, UI dùng để vẽ vệt mờ của đường bay. */
export function rangeSamples(stepDays = 1) {
  const step = stepDays > 0 ? stepDays : 1;
  const out = [];
  for (let d = 0; d <= TRANSFER_DAYS + 1e-9; d += step) {
    out.push({ day: Math.min(d, TRANSFER_DAYS), au: separationAu(d) });
  }
  return out;
}

/* Cực trị khoảng cách trong cả cửa sổ. Trả về cả ngày xảy ra để UI
   đánh dấu được lên bản đồ. */
export function rangeExtremes(stepDays = 0.1) {
  const samples = rangeSamples(stepDays);
  let min = samples[0];
  let max = samples[0];
  for (const s of samples) {
    if (s.au < min.au) min = s;
    if (s.au > max.au) max = s;
  }
  return {
    minDay: min.day,
    minAu: min.au,
    maxDay: max.day,
    maxAu: max.au,
  };
}

/* ---------- xuất gọn cho một lần gọi ---------- */

export const MISSION = {
  transferDays: TRANSFER_DAYS,
  deltaV: DELTA_V,
  delayBand: DELAY_BAND,
  phaseAtLaunchDeg: PHASE_AT_LAUNCH,
  tcm: TCM,
};
