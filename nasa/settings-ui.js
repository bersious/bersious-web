/* ============================================================
   settings-ui.js
   Bảng cài đặt hiện lên khi bấm nút răng cưa.

   Bốn nhóm: âm thanh, đồ hoạ, ngôn ngữ, dữ liệu.
   Mọi chữ đọc từ i18n.js ở CẢ HAI ngôn ngữ.
   ============================================================ */

import { t, getLang, setLang, onLangChange } from './i18n.js';
import { getSettings, setSetting, resetSettings } from './settings.js';
import { bindClickSounds } from './audio.js';
import { isFullscreen, toggleFullscreen, onFullscreenChange, isSupported } from './fullscreen.js';

let panel = null;

export function openSettings() {
  if (panel) return;

  const s = getSettings();

  panel = document.createElement('div');
  panel.className = 'settings-overlay';
  panel.innerHTML = `
    <div class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header class="settings-head">
        <h2 id="settings-title" data-i18n="settings.title"></h2>
        <button class="settings-close" aria-label="${t('settings.close')}" data-i18n-aria="settings.close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <div class="settings-body">

        <section class="settings-group">
          <h3 data-i18n="settings.audio"></h3>

          <label class="settings-row">
            <span class="settings-label">
              <span data-i18n="settings.music"></span>
              <small data-i18n="settings.music.desc"></small>
            </span>
            <input type="checkbox" class="switch" data-key="music" ${s.music ? 'checked' : ''}>
          </label>

          <label class="settings-row">
            <span class="settings-label">
              <span data-i18n="settings.sfx"></span>
              <small data-i18n="settings.sfx.desc"></small>
            </span>
            <input type="checkbox" class="switch" data-key="sfx" ${s.sfx ? 'checked' : ''}>
          </label>

          <label class="settings-row settings-row-range">
            <span class="settings-label"><span data-i18n="settings.volume"></span></span>
            <input type="range" class="range" data-key="volume" min="0" max="100" step="5" value="${s.volume}">
          </label>
        </section>

        <section class="settings-group">
          <h3 data-i18n="settings.graphics"></h3>

          <div class="settings-row">
            <span class="settings-label">
              <span data-i18n="settings.fullscreen"></span>
              <small data-i18n="settings.fullscreen.desc"></small>
            </span>
            <button class="ghost-btn" data-act="fullscreen" data-i18n="settings.fullscreen.enter"></button>
          </div>

          <div class="settings-row">
            <span class="settings-label">
              <span data-i18n="settings.quality"></span>
              <small data-i18n="settings.quality.desc"></small>
            </span>
            <div class="segmented" data-key="quality">
              <button data-val="auto" data-i18n="settings.quality.auto"></button>
              <button data-val="high" data-i18n="settings.quality.high"></button>
              <button data-val="low" data-i18n="settings.quality.low"></button>
            </div>
          </div>

          <label class="settings-row">
            <span class="settings-label">
              <span data-i18n="settings.motion"></span>
              <small data-i18n="settings.motion.desc"></small>
            </span>
            <input type="checkbox" class="switch" data-key="motion" ${s.motion ? 'checked' : ''}>
          </label>

          <label class="settings-row settings-row-range">
            <span class="settings-label">
              <span data-i18n="settings.textsize"></span>
              <small data-i18n="settings.textsize.desc"></small>
            </span>
            <input type="range" class="range" data-key="textSize" min="90" max="130" step="5" value="${s.textSize}">
          </label>
        </section>

        <section class="settings-group">
          <h3 data-i18n="settings.language"></h3>
          <div class="settings-row">
            <span class="settings-label"><small data-i18n="settings.language.desc"></small></span>
            <div class="segmented" data-key="lang">
              <button data-val="vi">Tiếng Việt</button>
              <button data-val="en">English</button>
            </div>
          </div>
        </section>

        <section class="settings-group">
          <h3 data-i18n="settings.data"></h3>
          <div class="settings-row">
            <span class="settings-label"><small data-i18n="settings.reset.desc"></small></span>
            <button class="danger" data-act="reset" data-i18n="settings.reset"></button>
          </div>
        </section>

      </div>
    </div>`;

  document.body.appendChild(panel);
  refresh();

  /* ---------- đóng ---------- */
  const close = () => {
    panel.classList.add('closing');
    panel._cleanup?.();
    panel._cleanupLang?.();
    panel._offFs?.();
    setTimeout(() => { panel?.remove(); panel = null; }, 180);
  };

  panel.querySelector('.settings-close').addEventListener('click', close);
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  };
  document.addEventListener('keydown', onKey);
  panel._cleanup = () => document.removeEventListener('keydown', onKey);

  /* ---------- gắn hành vi ---------- */

  // công tắc bật tắt
  panel.querySelectorAll('.switch').forEach((el) => {
    el.addEventListener('change', () => setSetting(el.dataset.key, el.checked));
  });

  // thanh trượt
  panel.querySelectorAll('.range').forEach((el) => {
    el.addEventListener('input', () => setSetting(el.dataset.key, Number(el.value)));
  });

  // nút chọn một trong nhiều
  panel.querySelectorAll('.segmented').forEach((group) => {
    group.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = group.dataset.key;
        const val = btn.dataset.val;
        if (key === 'lang') setLang(val);
        else setSetting(key, val);
        refresh();
      });
    });
  });

  // toàn màn hình
  const fsBtn = panel.querySelector('[data-act="fullscreen"]');
  if (isSupported()) {
    fsBtn.addEventListener('click', async () => {
      await toggleFullscreen();
      updateFsLabel();
    });
    panel._offFs = onFullscreenChange(updateFsLabel);
  } else {
    fsBtn.disabled = true;
    fsBtn.style.opacity = '.4';
    fsBtn.style.cursor = 'not-allowed';
  }

  function updateFsLabel() {
    if (!fsBtn) return;
    const on = isFullscreen();
    fsBtn.textContent = t(on ? 'settings.fullscreen.exit' : 'settings.fullscreen.enter');
  }
  updateFsLabel();

  // xoá dữ liệu
  panel.querySelector('[data-act="reset"]').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.armed !== '1') {
      btn.dataset.armed = '1';
      btn.textContent = t('settings.reset.confirm');
      setTimeout(() => {
        if (!btn.isConnected) return;
        btn.dataset.armed = '';
        btn.textContent = t('settings.reset');
      }, 3000);
      return;
    }
    resetSettings();
    localStorage.removeItem('smdg.playerName');
    localStorage.removeItem('smdg.lang');
    btn.dataset.armed = '';
    close();
  });

  // đổi ngôn ngữ thì vẽ lại toàn bộ chữ trong bảng
  const offLang = onLangChange(() => refresh());
  panel._cleanupLang = offLang;

  bindClickSounds(panel);
}

/* Vẽ lại toàn bộ chữ và trạng thái đang chọn. */
function refresh() {
  if (!panel) return;

  panel.querySelectorAll('[data-i18n]').forEach((el) => {
    const val = t(el.getAttribute('data-i18n'));
    if (val) el.textContent = val;
  });

  const s = getSettings();

  panel.querySelectorAll('.segmented').forEach((group) => {
    const key = group.dataset.key;
    const current = key === 'lang' ? getLang() : s[key];
    group.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.val === current);
    });
  });

  panel.querySelectorAll('.switch').forEach((el) => {
    el.checked = !!s[el.dataset.key];
  });

  panel.querySelectorAll('.range').forEach((el) => {
    el.value = s[el.dataset.key];
  });
}

export function isSettingsOpen() {
  return !!panel;
}
