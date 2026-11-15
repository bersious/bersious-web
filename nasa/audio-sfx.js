/* ============================================================
   audio-sfx.js
   Hiệu ứng âm thanh phân cảnh cho màn kể chuyện (story.js).

   Tách riêng khỏi audio.js để dễ bảo trì:
   - SCENE_SFX ánh xạ từ key cảnh sang tên hiệu ứng chính.
   - Các cảnh nền (gió xa, gió bão, quạt khoang Hab) phát lặp (loop)
     với hiệu ứng fade-in nhẹ khi vào cảnh.
   - Các hiệu ứng sự kiện (va đập kim loại, máy đo sinh hiệu tắt,
     động cơ tên lửa phóng, radio rè) phát một lần (one-shot) đúng
     thời điểm phân cảnh hoặc lượt truyện diễn ra.
   - Tôn trọng tuyệt đối getSettings().sfx, getSettings().volume,
     và cờ isAudioUnlocked() từ audio.js.
   ============================================================ */

import { getSettings, onSettingsChange } from './settings.js';
import { isAudioUnlocked } from './audio.js';

/* Lấy base từ URL của chính file module này, KHÔNG dùng location.href.
   location.href khi trang ở /nasa mà không có dấu chéo cuối sẽ cho ra
   gốc site (https://site/), làm mọi đường dẫn audio thành
   https://site/assets/... và 404. import.meta.url luôn trỏ đúng vào
   file này nên new URL('.', ...) luôn ra đúng thư mục chứa nó. */
const BASE = new URL('.', import.meta.url).href;
const SFX_DIR = BASE + 'assets/audio/sfx/';

/* Bản đồ ánh xạ từ key cảnh (art key) sang file hiệu ứng chính.
   Tám khung mở đầu đi theo nhịp bão: gió bão suốt từ khung 1 tới
   khung 5, rồi im lặng ở khung quỹ đạo (ngoài không gian không có
   tiếng), rồi tiếng quạt khoang Hab khi tỉnh dậy. */
export const SCENE_SFX = {
  /* màn mở đầu 8 khung */
  'bg-storm-wide':   'storm-wind',   // khung 1: tường bụi đang tới
  'bg-crew-running': 'storm-wind',   // khung 2: chạy trong bão
  'bg-running-pov':  'storm-wind',   // khung 3: góc nhìn thứ nhất, thở dốc
  'bg-face-closeup': 'storm-wind',   // khung 4: cận mặt, bão vẫn ngoài kính
  'bg-fall-buried':  'storm-wind',   // khung 5a: ngã xuống, cát phủ
  'bg-mars-orbit':   null,           // khung 5b và 6: ngoài không gian, im lặng
  'bg-waking-eyes':  'hab-vent',     // khung 7: mở mắt, chỉ có quạt lọc khí
  'bg-entering-hab': 'hab-vent',     // khung 8: bước vào căn cứ

  /* cảnh cũ, giữ lại cho các nhánh còn dùng */
  'mars-surface': 'wind-far',
  'storm-coming': 'storm-wind',
  'storm-impact': 'storm-wind',
  'departure':    'rocket-launch',
  'awake':        'hab-vent',

  /* Hồi tưởng gia đình trong nhà trên Trái Đất: hoàn toàn không có
     gió. Gán wind-far (gió Sao Hỏa) vào đây là sai bối cảnh, người
     chơi nghe tiếng gió hoang trên Hỏa tinh khi đang ở Houston. */
  'bg-houston-kitchen': null,
  'bg-moving-boxes':    null,
  'bg-farewell-door':   null,
};

/* Cấu hình chi tiết từng file SFX trong src/assets/audio/sfx/ */
export const SFX_CONFIG = {
  'wind-far':      { file: 'wind-far.mp3',      loop: true,  gain: 0.62, fadeMs: 600 },
  'storm-wind':    { file: 'storm-wind.mp3',    loop: true,  gain: 0.86, fadeMs: 450 },
  'metal-impact':  { file: 'metal-impact.mp3',  loop: false, gain: 0.90, fadeMs: 40  },
  'flatline':      { file: 'flatline.mp3',      loop: false, gain: 0.80, fadeMs: 60  },
  'rocket-launch': { file: 'rocket-launch.mp3', loop: false, gain: 0.85, fadeMs: 250 },
  'hab-vent':      { file: 'hab-vent.mp3',      loop: true,  gain: 0.68, fadeMs: 600 },
  'radio-static':  { file: 'radio-static.mp3',  loop: false, gain: 0.70, fadeMs: 200 },
  'shutter-click': { file: 'shutter-click.mp3', loop: false, gain: 0.85, fadeMs: 40  },
  'terminal-blip': { file: 'terminal-blip.mp3', loop: false, gain: 0.70, fadeMs: 40  },
  'warning-chime': { file: 'warning-chime.mp3', loop: false, gain: 0.85, fadeMs: 40  },
  'switch-flip':   { file: 'switch-flip.mp3',   loop: false, gain: 0.80, fadeMs: 40  },
  'pen-scribble':  { file: 'pen-scribble.mp3',  loop: false, gain: 0.75, fadeMs: 40  },
  'headset-click': { file: 'headset-click.mp3', loop: false, gain: 0.75, fadeMs: 40  },
  'door-hatch':    { file: 'door-hatch.mp3',    loop: false, gain: 0.85, fadeMs: 60  },
};

/* Ánh xạ thêm hiệu ứng sự kiện đi kèm khi bắt đầu một cảnh cụ thể.
   Cú ăng-ten đập vào lưng nằm ở khung 4, cùng cảnh bg-face-closeup
   với hai lượt trước, nên không thể gắn vào lúc đổi cảnh được: phải
   gắn theo lượt, xem BEAT_SFX. */
const SCENE_ONESHOT_ON_ENTER = {};

/* Ánh xạ một số lượt (beat index) có hiệu ứng sự kiện đặc thù trong nội dung.
   Giá trị có thể là một tên SFX, hoặc một mảng tên khi lượt đó cần hai tiếng
   chồng lên nhau. Chỉ số khớp mảng STORY trong story-data.js: */
export const BEAT_SFX = {
  0:  ['terminal-blip', 'warning-chime'], // log mở màn: gió 137 km/h đã vượt ngưỡng
  3:  'radio-static',                     // Lewis gọi qua kênh chung trong bão
  11: ['terminal-blip', 'warning-chime'], // HUD quét, phát hiện vật thể cách 1,4 m
  13: 'metal-impact',                     // Chảo ăng-ten đập vào lưng nhân vật
  15: 'terminal-blip',                    // log áp suất bộ đồ đang tụt
  18: ['terminal-blip', 'headset-click'], // log mất tín hiệu từ bề mặt
  20: 'radio-static',                     // đóng kênh, chỉ còn nhiễu
  21: 'terminal-blip',                    // log Sol 7, áp suất khoang 101,3 kPa
  25: 'door-hatch',                       // bước qua cửa trong, nắp kim loại nặng
  27: 'door-hatch',                       // log cửa ngoài đóng kín
  32: 'radio-static',                     // bật đài thu phát hai mươi phút
  35: 'pen-scribble',                     // ghi Sol 7 và gạch dưới 1.398
};

const cache = new Map();
const fadeTimers = new Map();

let currentSceneKey = null;
let activeLoopName = null;
let activeOneShotName = null;

function baseVol() {
  const v = getSettings().volume;
  return Math.max(0, Math.min(100, v)) / 100;
}

function targetVol(name) {
  const cfg = SFX_CONFIG[name];
  if (!cfg) return 0;
  return Math.min(1, baseVol() * (cfg.gain ?? 0.8));
}

function getAudioEl(name) {
  const cfg = SFX_CONFIG[name];
  if (!cfg) return null;
  let el = cache.get(name);
  if (!el) {
    el = new Audio(SFX_DIR + cfg.file);
    el.loop = Boolean(cfg.loop);
    el.preload = 'auto';
    cache.set(name, el);
  }
  return el;
}

function clearFade(name) {
  const id = fadeTimers.get(name);
  if (id) {
    clearInterval(id);
    fadeTimers.delete(name);
  }
}

function stopTrack(name) {
  if (!name) return;
  clearFade(name);
  const el = cache.get(name);
  if (el) {
    try {
      el.pause();
      el.currentTime = 0;
    } catch { /* bỏ qua */ }
  }
  if (activeLoopName === name) activeLoopName = null;
  if (activeOneShotName === name) activeOneShotName = null;
}

function startTrack(name, { resetTime = true } = {}) {
  const cfg = SFX_CONFIG[name];
  if (!cfg) return;

  const s = getSettings();
  if (!s.sfx || !isAudioUnlocked()) return;

  const el = getAudioEl(name);
  if (!el) return;

  clearFade(name);
  el.loop = Boolean(cfg.loop);

  const endVol = targetVol(name);
  const fadeMs = cfg.fadeMs ?? 300;

  try {
    if (resetTime) el.currentTime = 0;
    if (fadeMs > 60 && endVol > 0) {
      el.volume = Math.min(endVol, 0.02);
    } else {
      el.volume = endVol;
    }

    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => { /* trình duyệt chặn hoặc hủy, bỏ qua êm */ });
    }

    if (fadeMs > 60 && endVol > 0) {
      const steps = Math.max(4, Math.round(fadeMs / 40));
      let step = 0;
      const timer = setInterval(() => {
        step++;
        if (!getSettings().sfx || el.paused) {
          clearFade(name);
          return;
        }
        const ratio = Math.min(1, step / steps);
        el.volume = Math.min(1, targetVol(name) * ratio);
        if (step >= steps) clearFade(name);
      }, 40);
      fadeTimers.set(name, timer);
    }
  } catch { /* bỏ qua êm nếu trình duyệt chưa cho phép */ }
}

/* Phát hiệu ứng một lần (va đập, flatline, radio-static, rocket-launch).
   overlay: true thì giữ nguyên tiếng đang phát và chồng tiếng mới lên,
   dùng cho các lượt cần hai hiệu ứng cùng lúc (ví dụ bíp máy + chuông cảnh báo). */
export function playOneShotSfx(name, { overlay = false } = {}) {
  if (!name || !SFX_CONFIG[name]) return;
  if (!overlay && activeOneShotName && activeOneShotName !== name) {
    stopTrack(activeOneShotName);
  }
  activeOneShotName = name;

  const s = getSettings();
  if (!s.sfx || !isAudioUnlocked()) return;

  startTrack(name, { resetTime: true });
}

/* Phát hiệu ứng cho phân cảnh (gọi khi đổi cảnh tranh).
   Có fade-in nhẹ và tự dừng hiệu ứng cảnh trước khi chuyển sang cảnh mới. */
export function playSceneSfx(sceneKey) {
  if (!sceneKey) {
    stopAllSceneSfx();
    return;
  }

  const prevScene = currentSceneKey;
  currentSceneKey = sceneKey;

  const sfxName = SCENE_SFX[sceneKey] ?? null;

  /* Nếu cảnh mới không có SFX, dừng hết SFX đang phát */
  if (!sfxName) {
    if (activeLoopName) stopTrack(activeLoopName);
    if (activeOneShotName) stopTrack(activeOneShotName);
    return;
  }

  const cfg = SFX_CONFIG[sfxName];
  if (!cfg) return;

  if (cfg.loop) {
    /* Nếu đổi từ một loop khác sang loop mới thì dừng loop cũ */
    if (activeLoopName && activeLoopName !== sfxName) {
      stopTrack(activeLoopName);
    }
    if (activeOneShotName) {
      stopTrack(activeOneShotName);
    }

    const wasSameLoop = activeLoopName === sfxName;
    activeLoopName = sfxName;

    const el = getAudioEl(sfxName);
    if (!wasSameLoop || !el || el.paused) {
      startTrack(sfxName, { resetTime: !wasSameLoop });
    }
  } else {
    /* Hiệu ứng cảnh dạng phát 1 lần (như departure -> rocket-launch) */
    if (activeLoopName) {
      stopTrack(activeLoopName);
    }
    if (prevScene !== sceneKey) {
      playOneShotSfx(sfxName);
    }
  }

  /* Nếu cảnh mới có kèm hiệu ứng va đập mở màn (như storm-impact -> metal-impact) */
  const enterOneShot = SCENE_ONESHOT_ON_ENTER[sceneKey];
  if (enterOneShot && prevScene !== sceneKey) {
    playOneShotSfx(enterOneShot);
  }
}

/* Phát hiệu ứng theo lượt (beat) cụ thể nếu lượt đó có điểm nhấn âm thanh riêng.
   BEAT_SFX[beatIndex] có thể là một tên SFX hoặc một mảng tên phát chồng nhau. */
export function playBeatSfx(beatIndex) {
  const entry = BEAT_SFX[beatIndex];
  if (!entry) return;
  const names = Array.isArray(entry) ? entry : [entry];
  names.forEach((sfxName, idx) => {
    /* Nếu vừa mới kích hoạt cùng one-shot này ở playSceneSfx (như lượt 25 metal-impact)
       thì không cần reset lại từ đầu nếu đang phát dưới 150ms */
    const el = cache.get(sfxName);
    if (activeOneShotName === sfxName && el && !el.paused && el.currentTime < 0.15) {
      return;
    }
    /* Tiếng đầu thay thế tiếng cũ như trước, các tiếng sau chồng lên để không cắt tiếng trước */
    playOneShotSfx(sfxName, { overlay: idx > 0 });
  });
}

/* Dừng toàn bộ hiệu ứng phân cảnh (gọi khi kết thúc màn truyện hoặc tắt SFX) */
export function stopAllSceneSfx() {
  for (const name of fadeTimers.keys()) {
    clearFade(name);
  }
  for (const el of cache.values()) {
    try {
      el.pause();
      el.currentTime = 0;
    } catch { /* bỏ qua */ }
  }
  currentSceneKey = null;
  activeLoopName = null;
  activeOneShotName = null;
}

/* Trạng thái nội bộ phục vụ kiểm thử (xác nhận cảnh đang phát hoặc đã tắt) */
export function getSceneSfxState() {
  const loopEl = activeLoopName ? cache.get(activeLoopName) : null;
  const oneShotEl = activeOneShotName ? cache.get(activeOneShotName) : null;
  return {
    sceneKey: currentSceneKey,
    activeLoop: activeLoopName,
    activeOneShot: activeOneShotName,
    loopPlaying: Boolean(loopEl && !loopEl.paused),
    oneShotPlaying: Boolean(oneShotEl && !oneShotEl.paused),
    sfxEnabled: Boolean(getSettings().sfx),
    volume: getSettings().volume,
  };
}

/* Đồng bộ ngay khi người chơi bật/tắt SFX hoặc kéo thanh âm lượng trong Cài đặt */
onSettingsChange((s) => {
  if (!s.sfx) {
    for (const name of fadeTimers.keys()) clearFade(name);
    for (const el of cache.values()) {
      try { el.pause(); } catch { /* bỏ qua */ }
    }
    return;
  }

  /* Cập nhật âm lượng cho các rãnh đang phát */
  if (activeLoopName) {
    const el = getAudioEl(activeLoopName);
    if (el) {
      el.volume = targetVol(activeLoopName);
      if (el.paused && isAudioUnlocked()) {
        startTrack(activeLoopName, { resetTime: false });
      }
    }
  }
  if (activeOneShotName) {
    const el = cache.get(activeOneShotName);
    if (el && !el.paused) {
      el.volume = targetVol(activeOneShotName);
    }
  }
});
