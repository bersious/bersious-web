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

const BASE = new URL('.', location.href).href;
const SFX_DIR = BASE + 'assets/audio/sfx/';

/* Bản đồ ánh xạ từ key cảnh (art key) sang file hiệu ứng chính */
export const SCENE_SFX = {
  'earth-home':   'wind-far',
  'farewell':     null,
  'launchpad':    'wind-far',
  'mars-surface': 'wind-far',
  'storm-coming': 'storm-wind',
  'storm-impact': 'storm-wind',
  'departure':    'rocket-launch',
  'awake':        'hab-vent',
};

/* Cấu hình chi tiết từng file SFX trong src/assets/audio/sfx/ */
export const SFX_CONFIG = {
  'wind-far':      { file: 'wind-far.mp3',      loop: true,  gain: 0.45, fadeMs: 600 },
  'storm-wind':    { file: 'storm-wind.mp3',    loop: true,  gain: 0.75, fadeMs: 450 },
  'metal-impact':  { file: 'metal-impact.mp3',  loop: false, gain: 0.90, fadeMs: 40  },
  'flatline':      { file: 'flatline.mp3',      loop: false, gain: 0.80, fadeMs: 60  },
  'rocket-launch': { file: 'rocket-launch.mp3', loop: false, gain: 0.85, fadeMs: 250 },
  'hab-vent':      { file: 'hab-vent.mp3',      loop: true,  gain: 0.55, fadeMs: 600 },
  'radio-static':  { file: 'radio-static.mp3',  loop: false, gain: 0.70, fadeMs: 200 },
};

/* Ánh xạ thêm hiệu ứng sự kiện đi kèm khi bắt đầu một cảnh cụ thể
   (ví dụ: vừa sang cảnh storm-impact ở lượt 25 là mảng ăng-ten đập vào lưng) */
const SCENE_ONESHOT_ON_ENTER = {
  'storm-impact': 'metal-impact',
};

/* Ánh xạ một số lượt (beat index) có hiệu ứng sự kiện đặc thù trong nội dung */
export const BEAT_SFX = {
  25: 'metal-impact',   // Mảnh ăng-ten đập vào lưng nhân vật
  26: 'flatline',       // Bộ đo sinh hiệu đứt (flatlined)
  32: 'rocket-launch',  // "Đốt tầng một."
  38: 'radio-static',   // Bật đài thu phát suốt hai mươi phút, chỉ có tiếng nhiễu tĩnh điện
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

/* Phát hiệu ứng một lần (va đập, flatline, radio-static, rocket-launch) */
export function playOneShotSfx(name) {
  if (!name || !SFX_CONFIG[name]) return;
  if (activeOneShotName && activeOneShotName !== name) {
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

/* Phát hiệu ứng theo lượt (beat) cụ thể nếu lượt đó có điểm nhấn âm thanh riêng */
export function playBeatSfx(beatIndex) {
  const sfxName = BEAT_SFX[beatIndex];
  if (!sfxName) return;
  /* Nếu vừa mới kích hoạt cùng one-shot này ở playSceneSfx (như lượt 25 metal-impact)
     thì không cần reset lại từ đầu nếu đang phát dưới 150ms */
  const el = cache.get(sfxName);
  if (activeOneShotName === sfxName && el && !el.paused && el.currentTime < 0.15) {
    return;
  }
  playOneShotSfx(sfxName);
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
