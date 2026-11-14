/* ============================================================
   settings.js
   Lưu và áp cài đặt: âm thanh, đồ hoạ, cỡ chữ, ngôn ngữ.

   Mọi cài đặt lưu vào localStorage dưới một khoá duy nhất.
   Muốn thêm cài đặt mới: thêm vào DEFAULTS, thêm UI trong
   settings-ui.js, thêm chữ vào i18n.js ở CẢ HAI ngôn ngữ.
   ============================================================ */

const KEY = 'smdg.settings';

export const DEFAULTS = {
  music: true,
  sfx: true,
  volume: 55,          // 0 tới 100
  quality: 'auto',     // auto | high | low
  motion: true,
  textSize: 100,       // phần trăm, 90 tới 130
};

let state = { ...DEFAULTS };
const listeners = new Set();

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    state = { ...DEFAULTS };
  }
  applySettings();
  return state;
}

export function getSettings() {
  return { ...state };
}

export function setSetting(name, value) {
  if (!(name in DEFAULTS)) return;
  state[name] = value;
  localStorage.setItem(KEY, JSON.stringify(state));
  applySettings();
  listeners.forEach((fn) => fn(getSettings()));
}

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetSettings() {
  state = { ...DEFAULTS };
  localStorage.removeItem(KEY);
  applySettings();
  listeners.forEach((fn) => fn(getSettings()));
}

/* Áp cài đặt lên gốc tài liệu bằng thuộc tính data-*, CSS lo phần còn lại. */
export function applySettings() {
  const root = document.documentElement;
  root.dataset.quality = state.quality;
  root.dataset.motion = state.motion ? 'on' : 'off';
  root.style.setProperty('--st-scale', state.textSize / 100);
  root.classList.toggle('motion-off', !state.motion || state.quality === 'low');
}
