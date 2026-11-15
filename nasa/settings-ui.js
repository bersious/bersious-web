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
import {
  getSaveInfo, saveNow, clearSave, currentDay,
} from './save-game.js';

/* Đường dẫn CSS tuyệt đối, cùng lý do với các module khác: Vercel
   phục vụ trang ở /nasa không có dấu / cuối nên đường dẫn tương đối
   sẽ 404. */
const SAVE_CSS = new URL('.', import.meta.url).href + 'css/save-game.css';

function ensureSaveCss() {
  if (document.querySelector('link[data-save-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SAVE_CSS;
  link.dataset.saveCss = '1';
  document.head.appendChild(link);
}

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

          <!-- Khối lưu tiến trình. Trạng thái và dung lượng do
               renderSaveBlock() điền, vì chúng đổi sau mỗi lần lưu. -->
          <div class="save-block">
            <div class="save-status">
              <div class="save-status-line">
                <span class="save-status-label" data-i18n="save.status.label"></span>
                <span class="save-status-value" data-save-status></span>
              </div>
              <div class="save-meta" data-save-meta hidden>
                <span><b data-i18n="save.meta.day"></b><i data-save-day></i></span>
                <span><b data-i18n="save.meta.phase"></b><i data-save-phase></i></span>
                <span><b data-i18n="save.meta.size"></b><i data-save-size></i></span>
              </div>
              <small data-i18n="save.status.hint"></small>
            </div>

            <div class="save-actions">
              <button type="button" class="save-btn is-primary" data-act="save-now">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3"/><path d="M8 21v-7h8v7"/>
                </svg>
                <span data-i18n="save.now"></span>
              </button>
              <button type="button" class="save-btn is-danger" data-act="save-clear">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 7h16"/><path d="M9 7V4h6v3"/>
                  <path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>
                </svg>
                <span data-i18n="save.clear"></span>
              </button>
            </div>

            <!-- Hàng xác nhận: ẩn cho tới khi bấm nút xoá lần đầu, để
                 một cú bấm nhầm không xoá mất cả ván. -->
            <div class="save-confirm" data-save-confirm hidden>
              <p class="save-confirm-text" data-i18n="save.clear.body"></p>
              <div class="save-actions">
                <button type="button" class="save-btn is-danger" data-act="save-clear-yes"
                        data-i18n="save.clear.confirm"></button>
                <button type="button" class="save-btn" data-act="save-clear-no"
                        data-i18n="save.clear.cancel"></button>
              </div>
            </div>
          </div>

          <div class="settings-row">
            <span class="settings-label"><small data-i18n="settings.reset.desc"></small></span>
            <button class="danger" data-act="reset" data-i18n="settings.reset"></button>
          </div>
        </section>

      </div>
    </div>`;

  document.body.appendChild(panel);
  ensureSaveCss();
  refresh();
  renderSaveBlock();

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

  /* ---------- khối lưu tiến trình ---------- */

  const confirmBox = panel.querySelector('[data-save-confirm]');
  const clearBtn = panel.querySelector('[data-act="save-clear"]');

  panel.querySelector('[data-act="save-now"]').addEventListener('click', () => {
    saveNow({ reason: 'manual', day: currentDay() });
    renderSaveBlock();
  });

  /* Bấm lần đầu chỉ mở hàng xác nhận, chưa xoá gì. Cách này chắc
     chắn hơn kiểu "bấm hai lần liên tiếp": hàng xác nhận có nút Huỷ
     rõ ràng, người dùng thấy được mình đang xoá cái gì. */
  clearBtn.addEventListener('click', () => {
    confirmBox.hidden = false;
    clearBtn.setAttribute('aria-expanded', 'true');
    const yes = confirmBox.querySelector('[data-act="save-clear-yes"]');
    if (yes) yes.focus();
  });

  confirmBox.querySelector('[data-act="save-clear-no"]').addEventListener('click', () => {
    confirmBox.hidden = true;
    clearBtn.setAttribute('aria-expanded', 'false');
    clearBtn.focus();
  });

  confirmBox.querySelector('[data-act="save-clear-yes"]').addEventListener('click', () => {
    /* Phải dừng màn căn cứ TRƯỚC khi xoá. Đồng hồ trong màn căn cứ
       vẫn gọi stats.save() mỗi lần kim chạy, nên nếu xoá trước rồi mới
       tải lại thì khoá 'smdg.stats' được ghi lại ngay sau khi xoá và
       người chơi thấy tiến trình "sống dậy" sau khi đã xoá.
       Thứ tự đúng: dừng màn (base.js nghe sự kiện này) rồi mới xoá. */
    try {
      window.dispatchEvent(new CustomEvent('smdg:clear-save'));
    } catch { /* trình duyệt cũ không hỗ trợ CustomEvent thì bỏ qua */ }

    clearSave();
    confirmBox.hidden = true;
    /* Tải lại về màn khởi động. Không dùng location.href: chỉ cần
       nạp lại chính tài liệu đang mở, trình duyệt tự về trạng thái
       đầu vì mọi khoá đã trống. */
    try { window.location.reload(); } catch { close(); }
  });

  // đổi ngôn ngữ thì vẽ lại toàn bộ chữ trong bảng
  const offLang = onLangChange(() => { refresh(); renderSaveBlock(); });
  panel._cleanupLang = offLang;

  bindClickSounds(panel);
}

/* Điền trạng thái bản lưu: giờ lưu, ngày trong game, màn đang ở,
   dung lượng. Gọi lúc mở bảng, sau mỗi lần lưu tay, và khi đổi ngôn
   ngữ (vì nhãn màn và định dạng giờ đều đổi theo). */
function renderSaveBlock() {
  if (!panel) return;

  const info = getSaveInfo();
  const valueEl = panel.querySelector('[data-save-status]');
  const metaEl = panel.querySelector('[data-save-meta]');
  const dayEl = panel.querySelector('[data-save-day]');
  const phaseEl = panel.querySelector('[data-save-phase]');
  const sizeEl = panel.querySelector('[data-save-size]');
  const nowBtn = panel.querySelector('[data-act="save-now"]');
  const clearBtn = panel.querySelector('[data-act="save-clear"]');

  if (!info) {
    if (valueEl) {
      valueEl.textContent = t('save.status.none');
      valueEl.classList.add('is-empty');
    }
    if (metaEl) metaEl.hidden = true;
    if (clearBtn) clearBtn.disabled = true;
    return;
  }

  const when = new Date(info.savedAt);
  let time = info.savedAt;
  try {
    time = when.toLocaleString(getLang() === 'en' ? 'en-GB' : 'vi-VN', {
      hour: '2-digit', minute: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { /* trình duyệt thiếu bảng ngôn ngữ thì hiện ISO */ }

  if (valueEl) {
    valueEl.textContent = t('save.status.savedAt').replace('{time}', time);
    valueEl.classList.remove('is-empty');
  }

  if (metaEl) metaEl.hidden = false;
  if (dayEl) dayEl.textContent = String(info.day);
  if (phaseEl) phaseEl.textContent = t('save.phase.' + info.phase);
  /* Dấu phẩy thập phân cho tiếng Việt, dấu chấm cho tiếng Anh. */
  if (sizeEl) {
    const n = getLang() === 'en'
      ? info.sizeKb.toFixed(1)
      : String(info.sizeKb).replace('.', ',');
    sizeEl.textContent = n + ' KB';
  }

  if (clearBtn) clearBtn.disabled = false;
  if (nowBtn) nowBtn.disabled = false;
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
