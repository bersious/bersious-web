/* ============================================================
   settings-ui.js
   Bảng cài đặt hiện lên khi bấm nút răng cưa.

   Bốn nhóm: âm thanh, đồ hoạ, ngôn ngữ, dữ liệu.
   Mọi chữ đọc từ i18n.js ở CẢ HAI ngôn ngữ.
   ============================================================ */

import { t, getLang, setLang, onLangChange } from './i18n.js';
import { openDevMode as openDevPanel, askDevPassword, isDevUnlocked, lockDev, injectDevCss } from './devtool-panel.js';
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
              <button type="button" class="save-btn is-primary" data-act="save-now"
                      data-i18n-title="save.now.hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3"/><path d="M8 21v-7h8v7"/>
                </svg>
                <span data-i18n="save.now"></span>
              </button>
              <button type="button" class="save-btn is-danger" data-act="save-clear"
                      data-i18n-title="save.clear.hint">
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
              <p class="save-confirm-title" data-i18n="save.clear.title"></p>
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

        <!-- Chế độ nhà phát triển. Đặt ở CUỐI panel để người chơi thường
             cuộn hết các mục thật rồi mới gặp. Trạng thái (đã mở khoá
             hay chưa) do renderDevRow() điền, vì nó đọc localStorage và
             phải đổi ngay sau khi nhập mật khẩu hay bấm khoá lại. -->
        <section class="settings-group settings-group-dev">
          <h3 data-i18n="settings.dev"></h3>
          <div class="settings-row">
            <span class="settings-label">
              <span data-i18n="settings.dev.desc"></span>
              <small data-dev-status></small>
            </span>
            <span class="dev-row-actions">
              <button type="button" class="ghost-btn" data-act="dev-lock" hidden></button>
              <button type="button" class="ghost-btn" data-act="dev-open"></button>
            </span>
          </div>
        </section>

      </div>
    </div>`;

  document.body.appendChild(panel);
  ensureSaveCss();
  /* Hàng "chế độ nhà phát triển" ở cuối panel dùng kiểu của
     devtool-panel.css (nút 44px). Nạp ngay khi mở bảng cài đặt, không
     đợi tới lúc bấm: nếu không, hàng đó hiện ra với nút cao 21px rồi
     mới nhảy cỡ khi bấm. */
  injectDevCss();
  refresh();
  renderSaveBlock();

  /* ---------- lớp mờ đáy báo còn nội dung ----------
     Panel cao tối đa 92dvh nên trên điện thoại thân bảng luôn cuộn
     được. Không có dấu hiệu này người chơi tưởng bảng hết nội dung ở
     chỗ bị cắt. Bật lớp .is-scrollable khi còn cuộn được, tắt khi đã
     tới đáy. Không dùng IntersectionObserver: chỉ cần nghe sự kiện
     scroll và một lần đo lúc mở, rẻ hơn và không phụ thuộc layout. */
  const bodyEl = panel.querySelector('.settings-body');
  const panelEl = panel.querySelector('.settings-panel');

  function updateScrollFade() {
    if (!bodyEl || !panelEl) return;
    const overflow = bodyEl.scrollHeight - bodyEl.clientHeight;
    panelEl.classList.toggle('is-scrollable', overflow > 4);
    panelEl.classList.toggle('is-at-end', bodyEl.scrollTop >= overflow - 4);
  }
  bodyEl?.addEventListener('scroll', updateScrollFade, { passive: true });
  updateScrollFade();
  /* Nội dung đổi chiều cao sau khi ảnh và nhãn i18n vào chỗ (đổi ngôn
     ngữ làm nhãn dài ra), nên đo lại một nhịp sau khi mở. */
  setTimeout(updateScrollFade, 60);
  setTimeout(updateScrollFade, 320);

  /* ---------- đóng ---------- */
  const close = () => {
    panel.classList.add('closing');
    panel._cleanup?.();
    panel._cleanupLang?.();
    panel._offFs?.();
    /* Gỡ listener "dev đã khoá" trước khi bảng bị xoá khỏi DOM, để
       không còn con trỏ tới panel cũ. */
    if (typeof panel._cleanupDevLock === 'function') panel._cleanupDevLock();
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

  /* ---------- chế độ nhà phát triển ----------
     Ba trạng thái của cùng một hàng:
       chưa mở khoá  -> bấm là hiện ô mật khẩu, sai thì rung, đúng thì lưu cờ
       đã mở khoá    -> bấm là vào bảng điều khiển luôn, không hỏi lại
       đã mở khoá    -> nút Khoá lại riêng để trả về trạng thái đầu
     Trạng thái đọc từ localStorage mỗi lần render, nên mở lại bảng
     cài đặt là thấy đúng. */

  const devOpenBtn = panel.querySelector('[data-act="dev-open"]');
  const devLockBtn = panel.querySelector('[data-act="dev-lock"]');

  function renderDevRow() {
    if (!devOpenBtn) return;
    const unlocked = isDevUnlocked();
    const status = panel.querySelector('[data-dev-status]');
    if (status) status.textContent = t(unlocked ? 'settings.dev.unlocked' : 'settings.dev.locked');
    devOpenBtn.textContent = t(unlocked ? 'settings.dev.open' : 'settings.dev.unlock');
    devOpenBtn.dataset.unlocked = unlocked ? '1' : '0';
    if (devLockBtn) {
      devLockBtn.textContent = t('settings.dev.relock');
      /* Nút khoá chỉ có nghĩa khi đã mở khoá. Hiện nó lúc chưa mở là
         mời người chơi bấm một nút không làm gì. */
      devLockBtn.hidden = !unlocked;
    }
  }

  if (devOpenBtn) {
    devOpenBtn.addEventListener('click', async () => {
      injectDevCss();

      if (!isDevUnlocked()) {
        /* Hộp mật khẩu tự lo phần rung và câu báo sai. Ở đây chỉ chờ
           kết quả: mở được thì rơi xuống dưới và vào thẳng bảng. */
        const ok = await askDevPassword({
          onUnlock: () => { renderDevRow(); },
        });
        if (!ok) return;
        renderDevRow();
      }

      openDevPanel({
        onJump: (id, meta) => {
          const fn = window.__devJump;
          if (typeof fn === 'function') fn(id, meta);
        },
        onEvent: (id) => {
          const fn = window.__devEvent;
          if (typeof fn === 'function') fn(id);
        },
        onTool: (id, meta) => {
          const fn = window.__devTool;
          if (typeof fn === 'function') fn(id, meta);
        },
      });
    });
  }

  if (devLockBtn) {
    devLockBtn.addEventListener('click', () => {
      lockDev();
      renderDevRow();
    });
  }

  /* Bảng điều khiển có nút "Khoá lại" riêng. Khi bấm ở đó, bảng tự
     xoá cờ rồi đóng và phát sự kiện này. Không nghe thì hàng trong
     cài đặt vẫn hiện "Mở bảng điều khiển" sau khi đã khoá, và người
     dùng bấm vào lại tưởng còn mở. */
  const onDevLocked = () => { renderDevRow(); };
  window.addEventListener('smdg:dev-locked', onDevLocked);
  /* Gỡ khi đóng bảng, nếu không mỗi lần mở lại cài đặt là chồng thêm
     một listener, và sau vài chục lần mở thì renderDevRow chạy hàng
     chục lần cho một cú bấm. */
  const prevCleanup = panel._cleanupDevLock;
  panel._cleanupDevLock = () => {
    if (typeof prevCleanup === 'function') prevCleanup();
    window.removeEventListener('smdg:dev-locked', onDevLocked);
  };

  renderDevRow();

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
    /* Hàng xác nhận nằm cuối vùng cuộn, mở ra là bị mép dưới cắt mất
       hai nút. scrollIntoView với block:'nearest' không cuộn vì nó coi
       phần đã lộ là đủ, nên đẩy thẳng thân bảng xuống đáy: hộp xác
       nhận mới là phần tử cuối, cuộn hết là thấy trọn hai nút. */
    if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
    updateScrollFade();
    setTimeout(updateScrollFade, 60);
    setTimeout(updateScrollFade, 260);
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

  /* Nhãn phụ dạng title: nút lưu và nút xoá có tên rất ngắn, phần
     giải thích hậu quả nằm ở đây để không làm nút cao thêm. */
  panel.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const val = t(el.getAttribute('data-i18n-title'));
    if (val) el.setAttribute('title', val);
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
