/* ============================================================
   game-time.js
   Đồng hồ trong game. Chỉ lo tính thời gian, không vẽ gì cả.

   Tốc độ theo yêu cầu: một ngày trong game dài 12 phút ngoài đời,
   tức mỗi giây ngoài đời trôi 2 phút trong game.

     MỘT NGÀY  = 1440 phút game = 720 giây thật = 12 phút thật
     1 GIÂY THẬT = 2 phút game

   Đồng hồ chạy theo thời gian thật của máy, nên nếu người chơi
   chuyển sang tab khác rồi quay lại, thời gian vẫn đúng chứ không
   bị đứng. Nhưng khi tab bị ẩn thì đồng hồ tự dừng để không trôi
   mất cả ngày trong lúc người chơi không nhìn.
   ============================================================ */

const MIN_PER_DAY = 24 * 60;          // 1440 phút game một ngày
const REAL_MS_PER_GAME_MIN = 500;      // 1 giây thật = 2 phút game
const REAL_MS_PER_DAY = MIN_PER_DAY * REAL_MS_PER_GAME_MIN;  // 720 000 ms = 12 phút

const SLEEP_WAKE_MINUTE = 7 * 60;      // thức dậy lúc 07:00

/* Hệ số tốc độ. 1x là nhịp chuẩn, 2x gấp đôi, và "chờ nhanh" chạy
   6x để người chơi không phải ngồi nhìn màn hình trống khi chờ việc
   xong. Không cho chạy nhanh hơn nữa vì chỉ số trôi theo thời gian,
   tua quá nhanh thì người chơi không kịp phản ứng khi có chỉ số tụt. */
const SPEEDS = [1, 2, 6];
const SPEED_LABELS = ['1x', '2x', 'fast'];

export function createClock({ startMinute = 6 * 60, day = 1 } = {}) {
  let minutes = startMinute;   // số phút tính từ 00:00 của ngày hiện tại
  let currentDay = day;
  let running = false;
  let rafId = null;
  let lastStamp = 0;
  let speedIndex = 0;          // chỉ số trong SPEEDS, mặc định 1x
  const listeners = new Set();
  const speedListeners = new Set();

  /* ---------- tiện ích ---------- */

  function state() {
    const total = ((minutes % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
    const hh = Math.floor(total / 60);
    const mm = Math.floor(total % 60);
    return {
      day: currentDay,
      minutes: total,
      hh,
      mm,
      label: String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'),
      /* Đêm tính từ 18:00 tới 05:59, đúng mốc GDD đặt ra để đổi
         không khí căn cứ và đổi cảnh nền. */
      isNight: hh >= 18 || hh < 6,
      /* tỉ lệ đã trôi qua trong ngày, 0 tới 1, dùng cho vòng tròn đồng hồ */
      progress: total / MIN_PER_DAY,
    };
  }

  function emit() {
    const s = state();
    for (const fn of listeners) {
      try { fn(s); } catch (err) { console.error('clock listener lỗi', err); }
    }
  }

  /* ---------- chạy ---------- */

  function step(stamp) {
    if (!running) return;

    if (!lastStamp) lastStamp = stamp;
    const elapsed = stamp - lastStamp;
    lastStamp = stamp;

    if (elapsed > 0) {
      /* Nhân với hệ số tốc độ. Dùng elapsed thật nên khi đổi tốc độ
         giữa đường vẫn đúng, không bị nhảy cóc. */
      minutes += (elapsed / REAL_MS_PER_GAME_MIN) * SPEEDS[speedIndex];

      /* qua ngày mới thì tăng số ngày, không dừng đồng hồ */
      while (minutes >= MIN_PER_DAY) {
        minutes -= MIN_PER_DAY;
        currentDay += 1;
      }
      emit();
    }

    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    running = true;
    lastStamp = 0;
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    lastStamp = 0;
  }

  /* ---------- ngủ ----------
     Người chơi dặn: đi ngủ thì nhảy tới 07:00 SÁNG HÔM SAU. Nên luôn
     tăng một ngày, kể cả khi bây giờ mới 06:05. Nếu không tăng, người
     chơi ngủ lúc rạng sáng sẽ thấy mình "ngủ xong mà vẫn ngày cũ",
     rất khó hiểu. */

  function sleep() {
    currentDay += 1;
    minutes = SLEEP_WAKE_MINUTE;
    emit();
    return state();
  }

  /* ---------- tua tay, dùng khi cần nhảy cóc ---------- */

  function skipTo(minuteOfDay) {
    const target = Math.max(0, Math.min(MIN_PER_DAY - 1, minuteOfDay));
    if (target <= minutes) currentDay += 1;
    minutes = target;
    emit();
    return state();
  }

  /* ---------- tốc độ ----------
     Ba mức: 1x, 2x, và chờ nhanh 6x. Người chơi bấm nút vật lý trên
     đồng hồ, không phải vào menu cài đặt. */

  function setSpeed(index) {
    const next = Math.max(0, Math.min(SPEEDS.length - 1, index));
    if (next === speedIndex) return speed();
    speedIndex = next;
    const info = speed();
    for (const fn of speedListeners) {
      try { fn(info); } catch (err) { console.error('speed listener lỗi', err); }
    }
    return info;
  }

  function speed() {
    return {
      index: speedIndex,
      factor: SPEEDS[speedIndex],
      label: SPEED_LABELS[speedIndex],
      count: SPEEDS.length,
    };
  }

  function onSpeedChange(fn) {
    speedListeners.add(fn);
    fn(speed());
    return () => speedListeners.delete(fn);
  }

  /* ---------- lắng nghe ---------- */

  function onTick(fn) {
    listeners.add(fn);
    fn(state());
    return () => listeners.delete(fn);
  }

  /* ---------- tab bị ẩn thì dừng ----------
     Không có bước này thì người chơi mở tab khác hai phút, quay lại
     đã mất mấy ngày trong game mà không hiểu vì sao. */

  function bindVisibility() {
    const handler = () => {
      if (document.hidden) {
        if (running) { stop(); wasRunningBeforeHide = true; }
      } else if (wasRunningBeforeHide) {
        wasRunningBeforeHide = false;
        start();
      }
    };
    let wasRunningBeforeHide = false;
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }

  return {
    start, stop, sleep, skipTo, onTick, state,
    bindVisibility, setSpeed, speed, onSpeedChange,
    get running() { return running; },
    /* hằng số cho nơi khác dùng lại, tránh gõ số rải rác */
    MIN_PER_DAY, REAL_MS_PER_DAY, SLEEP_WAKE_MINUTE,
  };
}
