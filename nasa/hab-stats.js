/* ============================================================
   hab-stats.js
   Lõi chỉ số sinh tồn của trạm Hab. Không đụng tới DOM.

   Bảy chỉ số chia hai nhóm:
     Nhân vật: thể lực, calo, nước, tinh thần
     Trạm:     điện, oxy, độ kín

   Mọi hàm ở đây thuần tính toán. Giao diện đọc qua onTick và get().
   Tách khỏi giao diện để test được bằng Node và để cân bằng số
   không bị trộn lẫn với code vẽ.
   ============================================================ */

const KEY = 'smdg.stats';
const MAX = 100;

/* ---------- bảng số cân bằng, gom một chỗ để dễ chỉnh ---------- */

export const BALANCE = {
  drain: {
    water: 3.5,       /* mỗi giờ game */
    calories: 2.5,
    stamina: 3.5,     /* khi thức */
    sanity: 1.5,
    staminaSleep: 10, /* hồi mỗi giờ khi ngủ */
    sanitySleep: 2.2, /* tinh thần hồi khi ngủ, chậm hơn thể lực */
    /* Trạm có hệ thống thu hồi nước. Trên ISS thật, hệ thống UPA
       thu hồi được 93 phần trăm nước thải. Ở đây lấy 70 phần trăm
       để vẫn còn áp lực mà không bắt người chơi chết chắc: không có
       số này thì tổng nước dự trữ chỉ đủ 11 ngày, không bao giờ tới
       được mốc 35 Sol mà thiết kế đặt ra. */
    waterRecycler: 0.70,
  },
  /* Tinh thần hồi từ những việc có mục đích. Thiết kế ban đầu chỉ
     cho hồi qua 2 đĩa nhạc, tổng 50 điểm, trong khi 35 Sol tiêu tới
     1260 điểm. Không có nguồn hồi bền vững thì tinh thần cạn sau 2
     ngày, và vì chế tạo nước đòi tinh thần trên 40, người chơi bị
     khoá luôn cơ chế sống còn. Đây là hồi theo việc làm thật. */
  sanityGain: {
    farmTend: 6,      /* chăm vườn mỗi ngày */
    harvest: 12,      /* thu hoạch được khoai */
    radioContact: 10, /* liên lạc được với Trái Đất */
  },
  empty: {
    waterStaminaPenalty: 5,   /* nước về 0 thì thể lực tụt thêm */
    waterDeathHours: 12,
    caloriesDeathHours: 24,
    caloriesStaminaCap: 50,   /* đói thì không hồi thể lực quá mức này */
  },
  power: {
    solarDay: 8,        /* sạc mỗi giờ ban ngày */
    solarStorm: 3.2,    /* bão bụi thì pin chỉ còn 40 phần trăm hiệu suất */
    drain: 3,           /* hệ thống sống tiêu thụ mỗi giờ */
    uvLamp: 2,          /* đèn UV nông trại nếu bật */
    oxygenDrainNoPower: 6,
    oxygenDrainBadSeal: 4,
  },
  start: {
    stamina: 80, calories: 75, water: 70, sanity: 65,
    power: 60, oxygen: 100, seal: 100,
  },
};

/* ---------- kho vật phẩm ---------- */

export const ITEMS = {
  ration:        { vi: 'Gói khẩu phần', en: 'Ration pack',      kind: 'food',  calories: 45 },
  water_bottle:  { vi: 'Bình nước',     en: 'Water bottle',     kind: 'drink', water: 40 },
  tape:          { vi: 'Băng keo chịu lực', en: 'Duct tape',    kind: 'part' },
  electronics:   { vi: 'Linh kiện điện tử', en: 'Electronics',  kind: 'part' },
  hydrazine:     { vi: 'Bình hydrazine', en: 'Hydrazine tank',  kind: 'part' },
  media:         { vi: 'Đĩa nhạc cũ',   en: 'Old record',       kind: 'comfort', sanity: 25 },
  potato:        { vi: 'Củ khoai tây',  en: 'Potato',           kind: 'food',  calories: 30, sanity: 20 },
  potato_seed:   { vi: 'Mẫu hạt giống', en: 'Seed sample',      kind: 'quest' },
};

/* ---------- công thức chế tạo ---------- */

export const RECIPES = {
  patch_seal: {
    vi: 'Vá lỗ thủng', en: 'Patch a hull breach',
    cost: { tape: 1 },
    effect: { seal: 15 },
    risk: null,
  },
  make_water: {
    vi: 'Đốt hydrazine tạo nước', en: 'Burn hydrazine for water',
    cost: { hydrazine: 1 },
    gives: { water_bottle: 5 },
    risk: { sanityBelow: 40, chance: 0.30, effect: { seal: -15, stamina: -20 } },
  },
  water_filter: {
    vi: 'Bộ lọc nước tái chế', en: 'Water recycler',
    cost: { electronics: 2, tape: 1 },
    upgrade: 'waterFilter',
  },
  power_cell: {
    vi: 'Pin mở rộng', en: 'Extra battery',
    cost: { electronics: 3, tape: 1 },
    upgrade: 'powerCell',
  },
};

const START_INVENTORY = {
  ration: 12, water_bottle: 14, tape: 4,
  electronics: 3, hydrazine: 2, media: 2,
  /* Một mẫu khoai trong gói khẩu phần Lễ Tạ ơn, đúng chi tiết gốc:
     chúng là thứ duy nhất còn tươi trong kho. Không có sẵn mẫu này
     thì điều kiện mở nông trại không bao giờ đạt được, và người chơi
     chết đói ở Sol 20 mà không có cách nào cứu. */
  potato: 0, potato_seed: 1,
};

export function createStats({ clock, initialState } = {}) {
  /* ---------- trạng thái ---------- */

  let s = {
    stamina: BALANCE.start.stamina,
    calories: BALANCE.start.calories,
    water: BALANCE.start.water,
    sanity: BALANCE.start.sanity,
    power: BALANCE.start.power,
    oxygen: BALANCE.start.oxygen,
    seal: BALANCE.start.seal,
    storm: false,
    uvLamp: false,
    waterFilter: false,
    powerCell: false,
    /* đồng hồ đếm giờ liên tục ở mức 0, dùng để quyết định chết */
    zeroWaterHours: 0,
    zeroCaloriesHours: 0,
    totalMinutes: 0,
  };

  let inv = { ...START_INVENTORY };
  const listeners = new Set();

  /* Khôi phục từ localStorage TRƯỚC, rồi mới áp initialState.
     Thứ tự này quan trọng: nếu áp initialState trước thì kho khởi
     điểm sẽ ghi đè lên những gì người chơi đã nhặt được, và hạt
     giống vừa tìm thấy biến mất ngay lần mở lại. */
  if (!initialState) load();

  if (initialState) {
    Object.assign(s, initialState.stats || {});
    Object.assign(inv, initialState.inv || {});
  }

  /* ---------- tiện ích ---------- */

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function powerMax() {
    return s.powerCell ? 125 : MAX;
  }

  function emit() {
    const snap = get();
    for (const fn of listeners) {
      try { fn(snap); } catch (err) { console.error('stats listener lỗi', err); }
    }
  }

  /* ---------- tính một khoảng thời gian ----------
     Nhận số giờ thực của khoảng đó. Trước đây hàm này luôn trừ đúng
     một giờ bất kể bước dài bao nhiêu, nên tick 1440 phút (24 giờ)
     lại trừ như 48 giờ, gấp đôi. Nay nhân theo hours. */

  function applySpan(hourOfDay, hours, sleeping) {
    const recycle = BALANCE.drain.waterRecycler;
    const waterMul = (s.waterFilter ? 0.7 : 1) * (1 - recycle);

    s.water -= BALANCE.drain.water * waterMul * hours;
    s.calories -= BALANCE.drain.calories * hours;

    if (sleeping) {
      s.stamina += BALANCE.drain.staminaSleep * hours;
      /* Ngủ cũng hồi tinh thần, nhưng chậm hơn thể lực nhiều. Không
         có dòng này thì tinh thần chỉ giảm không tăng (chỉ có đĩa
         nhạc và khoai tây hồi), cạn sau vài ngày và khoá luôn cơ chế
         chế tạo đòi tinh thần trên 40. */
      s.sanity += BALANCE.drain.sanitySleep * hours;
    } else {
      s.stamina -= BALANCE.drain.stamina * hours;
      s.sanity -= BALANCE.drain.sanity * hours;
    }

    /* nước về 0 thì thể lực tụt nhanh hơn */
    if (s.water <= 0) {
      s.stamina -= BALANCE.empty.waterStaminaPenalty * hours;
      s.zeroWaterHours += hours;
    } else {
      s.zeroWaterHours = 0;
    }

    if (s.calories <= 0) {
      s.zeroCaloriesHours += hours;
    } else {
      s.zeroCaloriesHours = 0;
    }

    /* ---- điện năng: chia theo tỉ lệ giờ ngày và giờ đêm ----
       Không tính gộp cả khoảng thành một loại, vì một khoảng 12 giờ
       có thể vắt qua ranh giới 6 giờ hoặc 18 giờ. */
    let dayHours = 0;
    let nightHours = 0;
    let h = hourOfDay;
    let left = hours;
    while (left > 0) {
      const step = Math.min(left, 1);
      if (h >= 6 && h < 18) dayHours += step;
      else nightHours += step;
      h = (h + 1) % 24;
      left -= step;
    }

    if (dayHours > 0) {
      const solar = s.storm ? BALANCE.power.solarStorm : BALANCE.power.solarDay;
      s.power += solar * dayHours;
    }
    s.power -= BALANCE.power.drain * hours;
    if (s.uvLamp) s.power -= BALANCE.power.uvLamp * hours;

    /* ---- oxy ---- */
    if (s.power <= 0) {
      s.oxygen -= BALANCE.power.oxygenDrainNoPower * hours;
    } else if (s.seal < 80) {
      s.oxygen -= BALANCE.power.oxygenDrainBadSeal * hours;
    }

    /* ---- kẹp giới hạn ---- */
    const stamCap = s.calories <= 0 ? BALANCE.empty.caloriesStaminaCap : MAX;
    s.stamina = clamp(s.stamina, 0, stamCap);
    s.calories = clamp(s.calories, 0, MAX);
    s.water = clamp(s.water, 0, MAX);
    s.sanity = clamp(s.sanity, 0, MAX);
    s.power = clamp(s.power, 0, powerMax());
    s.oxygen = clamp(s.oxygen, 0, MAX);
    s.seal = clamp(s.seal, 0, MAX);
  }

  /* ---------- tick ----------
     Nhận số phút game đã trôi. Chia thành các bước nhỏ để qua được
     mốc ngày đêm, nhưng không chia tới từng phút cho khỏi nặng. */

  function tick(deltaGameMinutes, { sleeping = false } = {}) {
    if (!Number.isFinite(deltaGameMinutes) || deltaGameMinutes <= 0) return get();

    let remaining = deltaGameMinutes;
    const baseMinute = clock ? clock.state().minutes : 0;

    /* bước tối đa 60 phút game. Bước dài hơn thì phép chia ngày đêm
       kém chính xác, bước ngắn hơn thì tốn vòng lặp vô ích. */
    while (remaining > 0) {
      const stepMin = Math.min(remaining, 60);
      const hourOfDay = Math.floor(((baseMinute + (deltaGameMinutes - remaining)) % 1440) / 60);
      applySpan(hourOfDay, stepMin / 60, sleeping);
      remaining -= stepMin;
      s.totalMinutes += stepMin;
      if (checkDeath()) break;
    }

    emit();
    return get();
  }

  function get() {
    return {
      ...s,
      powerMax: powerMax(),
      alive: !checkDeath(),
    };
  }

  /* ---------- dùng vật phẩm ---------- */

  function useItem(itemId) {
    const item = ITEMS[itemId];
    if (!item) return { ok: false, message: 'không có vật phẩm này' };
    if (!inv[itemId] || inv[itemId] <= 0) {
      return { ok: false, message: 'đã hết' };
    }

    const effects = {};
    if (item.calories) {
      s.calories = clamp(s.calories + item.calories, 0, MAX);
      effects.calories = item.calories;
    }
    if (item.water) {
      s.water = clamp(s.water + item.water, 0, MAX);
      effects.water = item.water;
    }
    if (item.sanity) {
      s.sanity = clamp(s.sanity + item.sanity, 0, MAX);
      effects.sanity = item.sanity;
    }

    inv[itemId] -= 1;
    emit();
    return { ok: true, message: 'đã dùng', effects };
  }

  /* ---------- chế tạo ---------- */

  function craft(recipeId) {
    const r = RECIPES[recipeId];
    if (!r) return { ok: false, message: 'không có công thức này' };

    for (const [k, need] of Object.entries(r.cost)) {
      if ((inv[k] || 0) < need) {
        return { ok: false, message: 'thiếu ' + k };
      }
    }

    for (const [k, need] of Object.entries(r.cost)) inv[k] -= need;

    /* rủi ro: chỉ xảy ra khi tinh thần thấp */
    let risk = null;
    if (r.risk && s.sanity < r.risk.sanityBelow) {
      if (Math.random() < r.risk.chance) {
        risk = { triggered: true, effect: r.risk.effect };
        for (const [k, v] of Object.entries(r.risk.effect)) {
          s[k] = clamp(s[k] + v, 0, k === 'power' ? powerMax() : MAX);
        }
      } else {
        risk = { triggered: false };
      }
    }

    /* áp hiệu ứng chính */
    if (r.effect) {
      for (const [k, v] of Object.entries(r.effect)) {
        s[k] = clamp(s[k] + v, 0, k === 'power' ? powerMax() : MAX);
      }
    }
    if (r.gives) {
      for (const [k, v] of Object.entries(r.gives)) {
        inv[k] = (inv[k] || 0) + v;
      }
    }
    if (r.upgrade) s[r.upgrade] = true;

    emit();
    return { ok: true, message: 'xong', risk };
  }

  /* ---------- thám hiểm ---------- */

  function exploreCost(hours) {
    const cost = clamp(hours * 6, 10, 40);
    if (s.stamina < cost) {
      return { ok: false, staminaCost: cost, message: 'không đủ sức' };
    }
    s.stamina = clamp(s.stamina - cost, 0, MAX);
    /* đi ngoài trời cũng mất tinh thần một chút */
    s.sanity = clamp(s.sanity - 5, 0, MAX);
    emit();
    return { ok: true, staminaCost: cost };
  }

  /* ---------- ngủ ---------- */

  function sleepOver(deltaGameHours) {
    /* Trước đây gọi sleepOver() không tham số thì hàm trả về ngay,
       không hồi thể lực, không trôi thời gian. Hậu quả là người chơi
       bấm Đi ngủ thấy đồng hồ nhảy nhưng thể lực đứng yên, rồi chết
       dần vì kiệt sức ở ngày thứ mười mà không hiểu tại sao.

       Nay mặc định ngủ tới 07:00 sáng hôm sau, tính theo đồng hồ
       thật của game. */
    let hours = deltaGameHours;

    if (!Number.isFinite(hours) || hours <= 0) {
      const nowMin = clock ? clock.state().minutes : (8 * 60);
      const minOfDay = nowMin % 1440;
      const target = 7 * 60;
      let spanMin = target - minOfDay;
      if (spanMin <= 0) spanMin += 1440;
      hours = spanMin / 60;
    }

    tick(hours * 60, { sleeping: true });
    return get();
  }

  function forecastUntil(minuteOfDay) {
    /* Tính nháp trên bản sao, không đụng trạng thái thật. */
    const snapshot = { ...s };
    const snapshotInv = { ...inv };
    const now = clock ? clock.state().minutes : 0;

    let minutes = minuteOfDay - now;
    if (minutes <= 0) minutes += 1440;

    tick(minutes, { sleeping: true });
    const result = get();

    /* trả trạng thái về như cũ */
    Object.assign(s, snapshot);
    Object.keys(inv).forEach((k) => delete inv[k]);
    Object.assign(inv, snapshotInv);

    return result;
  }

  /* ---------- chết ---------- */

  function checkDeath() {
    if (s.oxygen <= 0) return { cause: 'oxygen', sinceMinutes: 0 };
    if (s.zeroWaterHours >= BALANCE.empty.waterDeathHours) {
      return { cause: 'water', sinceMinutes: s.zeroWaterHours * 60 };
    }
    if (s.zeroCaloriesHours >= BALANCE.empty.caloriesDeathHours) {
      return { cause: 'calories', sinceMinutes: s.zeroCaloriesHours * 60 };
    }
    return null;
  }

  /* ---------- mở khoá ---------- */

  function getUnlocks() {
    return {
      farm: (inv.potato_seed || 0) >= 1 && (inv.water_bottle || 0) >= 10 && (inv.tape || 0) >= 2,
      radio: (inv.electronics || 0) >= 2 && (inv.tape || 0) >= 1,
    };
  }

  function addItems(items) {
    for (const it of items || []) {
      if (!it || !it.id) continue;
      inv[it.id] = (inv[it.id] || 0) + (it.qty || 1);
    }
    emit();
  }

  function setStorm(on) {
    s.storm = !!on;
    emit();
  }

  function setUvLamp(on) {
    s.uvLamp = !!on;
    emit();
  }

  function onTick(fn) {
    listeners.add(fn);
    fn(get());
    return () => listeners.delete(fn);
  }

  function getInventory() {
    return { ...inv };
  }

  /* ---------- lưu và khôi phục ---------- */

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ stats: s, inv }));
    } catch { /* trình duyệt chặn thì bỏ qua */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d.stats) Object.assign(s, d.stats);
      if (d.inv) Object.assign(inv, d.inv);
      emit();
      return true;
    } catch {
      return false;
    }
  }

  /* Trừ nước cho một việc không phải uống: tưới cây, rửa, lau kính.
     Đây là điểm nối duy nhất giữa nông trại và chỉ số sinh tồn: cả
     game chỉ có MỘT lượng nước, nên tưới cây là uống bớt nước của
     chính mình. Trước đây farm.js giữ bể riêng 100 đơn vị nên người
     chơi thấy vô lý, tưới bao nhiêu cũng không ảnh hưởng nước uống.

     Trả về { ok, short, have }: short là số còn thiếu, để màn nông
     trại nói rõ "còn thiếu 3" thay vì chỉ báo "không đủ". */
  function spendWater(n) {
    const need = Number(n);
    if (!Number.isFinite(need) || need <= 0) {
      return { ok: true, spent: 0, short: 0, have: s.water };
    }
    if (s.water < need) {
      return { ok: false, spent: 0, short: Math.ceil((need - s.water) * 10) / 10, have: s.water };
    }
    s.water = clamp(s.water - need, 0, MAX);
    emit();
    save();
    return { ok: true, spent: need, short: 0, have: s.water };
  }

  /* ---------- công cụ cho chế độ nhà phát triển ----------
     CHỈ dùng từ dev-mode.js. Ghi đè thẳng một vài trường của chỉ số,
     không mô phỏng thời gian. Không có cửa nào khác trong game gọi
     hàm này, và nó không tự lưu: nơi gọi phải gọi save().

     Vì sao cần: các nút test "cho nước và calo đầy", "đặt ngày bất kỳ"
     phải nhảy thẳng tới trạng thái muốn kiểm, chứ không thể ngồi uống
     40 bình nước để đầy thanh. */
  function devPatch(patch) {
    if (!patch || typeof patch !== 'object') return get();
    for (const [k, v] of Object.entries(patch)) {
      if (!(k in s)) continue;
      if (typeof s[k] === 'boolean') { s[k] = !!v; continue; }
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      const hi = k === 'power' ? powerMax() : (k === 'totalMinutes' ? Number.MAX_SAFE_INTEGER : MAX);
      s[k] = clamp(n, 0, hi);
    }
    emit();
    return get();
  }

  /* Cộng tinh thần từ một việc có mục đích: liên lạc được với
     Trái Đất, chăm vườn, thu hoạch. Tách riêng khỏi useItem vì
     không tiêu vật phẩm nào. */
  function addSanity(n) {
    if (!Number.isFinite(n) || n === 0) return get();
    s.sanity = clamp(s.sanity + n, 0, MAX);
    emit();
    return get();
  }

  /* Trừ vật liệu theo số lượng, dùng khi chế tạo hoặc sửa chữa.
     Khác useItem ở chỗ không chạy hiệu ứng dùng vật phẩm: ăng-ten hay
     pin tiêu hao để thành một món khác, không phải để ăn hay uống.
     Trả về true nếu trừ được, false nếu kho không đủ. */
  function spendItem(itemId, count = 1) {
    const have = inv[itemId] || 0;
    if (have < count) return false;
    inv[itemId] = have - count;
    emit();
    save();
    return true;
  }

  return {
    tick, get, useItem, spendItem, spendWater, craft, exploreCost, sleepOver, forecastUntil,
    checkDeath, onTick, save, load, getUnlocks, addItems, setStorm,
    setUvLamp, getInventory, addSanity, devPatch,
    BALANCE, ITEMS, RECIPES,
  };
}
