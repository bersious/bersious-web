/* ============================================================
   hud-compact.js
   HUD dạng thanh nổi mỏng cho màn căn cứ.

   Thanh trên cùng bán trong suốt, làm mờ hậu cảnh bằng backdrop
   filter, chia ba cụm: nhân vật bên trái, đồng hồ và nhiệm vụ ở
   giữa, chỉ số trạm và bốn nút điều khiển bên phải. Dưới góc trái
   là widget nhật ký sứ mệnh thu gọn được. Nút [?] mở sổ tay hướng
   dẫn song ngữ.

   Chỉ vẽ. Số liệu do hab-stats.js và game-time.js đẩy sang.
   ============================================================ */

import { t, getLang, onLangChange } from './i18n.js';
import { DAY_LOG } from './base-flavor.js';

const BASE = new URL('.', import.meta.url).href;
const AVATAR_SRC = BASE + 'assets/art/char-healthy.webp';

const LOG_KEY = 'smdg.hud.logCollapsed';
const SETTINGS_KEY = 'smdg.settings';

/* Tám vạch cho mỗi chỉ số. Nhiều hơn thì cụm bên trái rộng ra và
   đẩy đồng hồ lệch khỏi giữa màn hình. */
const SEGS = 8;

/* Bốn chỉ số của nhân vật. Ngưỡng cảnh báo lấy đúng theo hab-stats. */
const VITALS = [
  { id: 'stamina', warn: 25 },
  { id: 'calories', warn: 25 },
  { id: 'water', warn: 25 },
  { id: 'sanity', warn: 25 },
];

/* Ba chỉ số của trạm. Độ kín ngược chiều: càng cao càng tốt. */
const STATION = [
  { id: 'power', unit: 'W', warn: 30, danger: 10, invert: false },
  { id: 'oxygen', unit: 'kPa', warn: 40, danger: 15, invert: false },
  { id: 'seal', unit: '%', warn: 85, danger: 65, invert: true },
];

const ICONS = {
  stamina: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M13 2 4.5 13.5H11l-1 8.5 9-11.5h-6.5z"/></svg>`,
  calories: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7 3v7a2.5 2.5 0 0 0 5 0V3"/><path d="M9.5 10v11"/>
    <path d="M17 3c-1.4 2-2 3.6-2 5.5 0 1.6.9 2.5 2 2.5s2-.9 2-2.5C19 6.6 18.4 5 17 3z"/>
    <path d="M17 11v10"/></svg>`,
  water: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 2.8c3.2 4 5.6 7 5.6 10.1A5.6 5.6 0 0 1 12 18.5a5.6 5.6 0 0 1-5.6-5.6C6.4 9.8 8.8 6.8 12 2.8z"/></svg>`,
  sanity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 4.5a5.5 5.5 0 0 0-3.3 9.9c.5.4.8 1 .8 1.6v.5h5v-.5c0-.6.3-1.2.8-1.6A5.5 5.5 0 0 0 12 4.5z"/>
    <path d="M9.8 19.5h4.4"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.5" y="7" width="16" height="10" rx="2.2"/>
    <path d="M21.5 10.5v3"/><path d="M9.6 9.6 12.4 12l-2 .4 1.2 2"/></svg>`,
  oxygen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="9" cy="13" r="5.2"/><circle cx="16" cy="9" r="3.2"/></svg>`,
  seal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 2.8 20 6v6.2c0 4.4-3.2 7.6-8 9.2-4.8-1.6-8-4.8-8-9.2V6z"/>
    <path d="m8.4 12 2.4 2.4 4.6-4.6"/></svg>`,
  guide: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/>
    <path d="M9.4 9a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.1-2.6 4"/><path d="M12 17.4h.01"/></svg>`,
  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3"/><path d="M8 21v-7h8v7"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3.1"/>
    <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/></svg>`,
  collapse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m6 14 6-6 6 6"/></svg>`,
  restore: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m6 10 6 6 6-6"/></svg>`,
  log: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 4h11l3 3v13H5z"/><path d="M8.5 9.5h7M8.5 13h7M8.5 16.5h4"/></svg>`,
  fast: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 5.5 12 12l-8 6.5zM13 5.5 21 12l-8 6.5z"/></svg>`,
};

/* ---------- tiện ích ---------- */

function pad2(n) {
  return String(n).padStart(2, '0');
}

function readMotion() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.motion === false) return false;
    }
  } catch { /* chế độ riêng tư chặn đọc thì coi như bật */ }
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch { /* trình duyệt cũ không hỗ trợ thì bỏ qua */ }
  return true;
}

function readLogCollapsed() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (raw === '0') return false;
  } catch { /* bỏ qua */ }
  return true;
}

function writeLogCollapsed(collapsed) {
  try { localStorage.setItem(LOG_KEY, collapsed ? '1' : '0'); } catch { /* bỏ qua */ }
}

/* Chuyện gì đang phải làm. Tín hiệu cầu cứu đã gửi hay chưa: đọc từ
   bản lưu của màn căn cứ, và nhận thêm tín hiệu do nơi khác đẩy vào
   qua setSignalSent(). Không có nguồn nào thì mặc định là chưa gửi. */
function readSignalSent(snap) {
  if (snap && (snap.signalSent === true || snap.rescueSignal === true)) return true;
  try {
    if (localStorage.getItem('smdg.signal') === '1') return true;
  } catch { /* bỏ qua */ }
  return false;
}

/* ---------- dựng ---------- */

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css/hud-compact.css';
  document.head.appendChild(link);
}

export function createCompactHud({
  container,
  stats,
  clock,
  playerName = '',
  onOpenGuide,
  onSave,
  onOpenSettings,
} = {}) {
  injectCss();
  const host = container || document.body;

  let signalSent = false;
  let motionOn = readMotion();
  let logCollapsed = readLogCollapsed();
  let langOff = null;
  let statsOff = null;
  let clockOff = null;
  let speedOff = null;
  let escOff = null;
  let savedTimer = 0;
  let lastDay = -1;

  const root = document.createElement('div');
  root.className = 'hud2';
  root.dataset.collapsed = 'false';
  root.dataset.night = '0';
  root.innerHTML = `
    <div class="hud2-bar" role="region" aria-label="HUD">
      <div class="hud2-slot hud2-left">
        <div class="hud2-avatar" aria-hidden="true">
          <img class="hud2-avatar-img" alt="" decoding="async">
          <span class="hud2-avatar-ini"></span>
        </div>
        <div class="hud2-id">
          <span class="hud2-name"></span>
          <div class="hud2-vitals"></div>
        </div>
      </div>

      <div class="hud2-slot hud2-center">
        <div class="hud2-clock-row">
          <div class="hud2-clock" role="timer" aria-live="off">
            <span class="hud2-sol">SOL 01</span>
            <span class="hud2-sep" aria-hidden="true">·</span>
            <span class="hud2-time">06:00</span>
          </div>
          <div class="hud2-speeds" role="group"></div>
        </div>
        <div class="hud2-quest">
          <span class="hud2-quest-k"></span>
          <span class="hud2-quest-v"></span>
        </div>
      </div>

      <div class="hud2-slot hud2-right">
        <div class="hud2-station"></div>
        <div class="hud2-actions">
          <button type="button" class="hud2-btn" data-act="guide">
            <span class="hud2-btn-ico">${ICONS.guide}</span>
            <span class="hud2-btn-label"></span>
          </button>
          <button type="button" class="hud2-btn" data-act="save">
            <span class="hud2-btn-ico">${ICONS.save}</span>
            <span class="hud2-btn-label"></span>
          </button>
          <button type="button" class="hud2-btn" data-act="settings">
            <span class="hud2-btn-ico">${ICONS.settings}</span>
            <span class="hud2-btn-label"></span>
          </button>
          <button type="button" class="hud2-btn hud2-btn-icon" data-act="collapse">
            <span class="hud2-btn-ico">${ICONS.collapse}</span>
          </button>
          <span class="hud2-saved" role="status" aria-live="polite"></span>
        </div>
      </div>
    </div>

    <button type="button" class="hud2-restore" data-act="restore">
      <span class="hud2-restore-ico">${ICONS.restore}</span>
      <span class="hud2-restore-label"></span>
    </button>

    <section class="hud2-log" aria-label="">
      <header class="hud2-log-head">
        <span class="hud2-log-ico">${ICONS.log}</span>
        <h3 class="hud2-log-title"></h3>
        <button type="button" class="hud2-log-toggle" data-act="log">
          <span class="hud2-log-toggle-ico">${ICONS.collapse}</span>
        </button>
      </header>
      <div class="hud2-log-body" role="log" aria-live="off">
        <ol class="hud2-log-list"></ol>
      </div>
    </section>

    <div class="hud2-guide" hidden>
      <div class="hud2-guide-veil" data-guide-close></div>
      <div class="hud2-guide-panel" role="dialog" aria-modal="true" aria-labelledby="hud2-guide-title">
        <header class="hud2-guide-head">
          <h2 class="hud2-guide-title" id="hud2-guide-title"></h2>
          <button type="button" class="hud2-guide-x" data-guide-close>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="hud2-guide-body">
          <section class="hud2-guide-sec">
            <h3 class="hud2-guide-h"></h3>
            <p class="hud2-guide-p"></p>
          </section>
          <section class="hud2-guide-sec">
            <h3 class="hud2-guide-h"></h3>
            <p class="hud2-guide-p"></p>
          </section>
          <section class="hud2-guide-sec">
            <h3 class="hud2-guide-h"></h3>
            <p class="hud2-guide-p"></p>
          </section>
          <section class="hud2-guide-sec hud2-guide-facts">
            <h3 class="hud2-guide-h"></h3>
            <dl class="hud2-facts"></dl>
          </section>
        </div>
      </div>
    </div>
  `;
  host.appendChild(root);

  const q = (sel) => root.querySelector(sel);

  const barEl = q('.hud2-bar');
  const avatarImg = q('.hud2-avatar-img');
  const avatarIni = q('.hud2-avatar-ini');
  const nameEl = q('.hud2-name');
  const vitalsEl = q('.hud2-vitals');
  const solEl = q('.hud2-sol');
  const timeEl = q('.hud2-time');
  const speedsEl = q('.hud2-speeds');
  const questK = q('.hud2-quest-k');
  const questV = q('.hud2-quest-v');
  const stationEl = q('.hud2-station');
  const savedEl = q('.hud2-saved');
  const restoreEl = q('.hud2-restore');
  const restoreLabel = q('.hud2-restore-label');
  const collapseBtn = q('[data-act="collapse"]');
  const guideBtn = q('[data-act="guide"]');
  const saveBtn = q('[data-act="save"]');
  const settingsBtn = q('[data-act="settings"]');
  const logEl = q('.hud2-log');
  const logTitle = q('.hud2-log-title');
  const logToggle = q('.hud2-log-toggle');
  const logToggleIco = q('.hud2-log-toggle-ico');
  const logList = q('.hud2-log-list');
  const logBody = q('.hud2-log-body');
  const guideEl = q('.hud2-guide');
  const guideTitle = q('.hud2-guide-title');
  const guideSecs = Array.from(root.querySelectorAll('.hud2-guide-sec'));
  const factsEl = q('.hud2-facts');

  if (!motionOn) root.classList.add('is-static');

  /* ---------- ảnh chân dung ---------- */

  const initials = (() => {
    const parts = String(playerName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();
  avatarIni.textContent = initials;

  avatarImg.addEventListener('load', () => root.classList.add('has-avatar'));
  avatarImg.addEventListener('error', () => {
    root.classList.remove('has-avatar');
    avatarImg.removeAttribute('src');
  });
  avatarImg.src = AVATAR_SRC;

  /* ---------- bốn chỉ số nhân vật ---------- */

  const vitals = {};

  for (const spec of VITALS) {
    const chip = document.createElement('div');
    chip.className = 'hud2-vital';
    chip.dataset.stat = spec.id;

    let segs = '';
    for (let i = 0; i < SEGS; i++) segs += '<span class="hud2-seg"></span>';

    chip.innerHTML = `
      <span class="hud2-vital-ico">${ICONS[spec.id] || ''}</span>
      <span class="hud2-vital-k"></span>
      <span class="hud2-segs">${segs}</span>
      <span class="hud2-vital-v">--</span>
    `;
    vitalsEl.appendChild(chip);

    vitals[spec.id] = {
      chip,
      keyEl: chip.querySelector('.hud2-vital-k'),
      valEl: chip.querySelector('.hud2-vital-v'),
      segs: Array.from(chip.querySelectorAll('.hud2-seg')),
      spec,
      lit: -1,
      shown: -1,
    };
  }

  /* ---------- ba chỉ số trạm ---------- */

  const station = {};

  for (const spec of STATION) {
    const cell = document.createElement('div');
    cell.className = 'hud2-st';
    cell.dataset.stat = spec.id;
    cell.dataset.level = 'ok';
    cell.innerHTML = `
      <span class="hud2-st-ico">${ICONS[spec.id] || ''}</span>
      <span class="hud2-st-k"></span>
      <span class="hud2-st-v">--</span>
      <span class="hud2-st-u"></span>
    `;
    stationEl.appendChild(cell);

    station[spec.id] = {
      cell,
      keyEl: cell.querySelector('.hud2-st-k'),
      valEl: cell.querySelector('.hud2-st-v'),
      unitEl: cell.querySelector('.hud2-st-u'),
      shown: -1,
      spec,
    };
  }

  /* ---------- ba nút tốc độ ---------- */

  const speedBtns = [];
  const speedInfo = typeof clock?.speed === 'function' ? clock.speed() : { count: 3 };
  const speedCount = Math.max(3, speedInfo.count || 3);

  for (let i = 0; i < speedCount; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hud2-speed';
    btn.dataset.speed = String(i);
    btn.addEventListener('click', () => {
      if (typeof clock?.setSpeed === 'function') clock.setSpeed(i);
    });
    speedsEl.appendChild(btn);
    speedBtns.push(btn);
  }

  function paintSpeed(info) {
    const cur = info || (typeof clock?.speed === 'function' ? clock.speed() : { index: 0 });
    speedBtns.forEach((btn, i) => {
      const isFast = i === speedBtns.length - 1;
      btn.dataset.kind = isFast ? 'fast' : 'x';
      btn.innerHTML = isFast
        ? `<span class="hud2-speed-ico">${ICONS.fast}</span><span class="hud2-speed-txt"></span>`
        : `<span class="hud2-speed-txt">${i + 1}x</span>`;
      if (isFast) btn.querySelector('.hud2-speed-txt').textContent = t('hud2.speedFast');
      const active = i === cur.index;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('aria-label', isFast ? t('hud2.speedFast') : `${i + 1}x`);
      btn.title = isFast ? t('hud2.speedFast') : `${i + 1}x`;
    });
  }

  /* ---------- vẽ ---------- */

  function paintVitals(snap) {
    if (!snap) return;
    for (const [id, b] of Object.entries(vitals)) {
      const raw = snap[id];
      if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;

      const pct = Math.max(0, Math.min(100, raw));
      const shown = Math.round(raw);
      const danger = raw <= b.spec.warn;

      if (shown !== b.shown) {
        b.shown = shown;
        b.valEl.textContent = String(shown);
        b.chip.setAttribute('aria-label', t('hud2.a11y.vital')
          .replace('{name}', t('hud2.' + id))
          .replace('{value}', String(shown)));
      }

      const lit = raw <= 0 ? 0 : Math.min(SEGS, Math.ceil((pct / 100) * SEGS));
      if (lit !== b.lit) {
        b.lit = lit;
        for (let i = 0; i < SEGS; i++) b.segs[i].classList.toggle('is-on', i < lit);
      }

      b.chip.classList.toggle('is-danger', danger);
      b.chip.classList.toggle('is-low', !danger && pct < 45);
    }
  }

  function paintStation(snap) {
    if (!snap) return;
    for (const [id, b] of Object.entries(station)) {
      const raw = snap[id];
      if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;

      const shown = Math.round(raw);
      if (shown !== b.shown) {
        b.shown = shown;
        b.valEl.textContent = String(shown);
        b.cell.setAttribute('aria-label', t('hud2.a11y.station')
          .replace('{name}', t('hud2.' + id))
          .replace('{value}', String(shown))
          .replace('{unit}', b.unitEl.textContent || ''));
      }

      let level = 'ok';
      if (b.spec.invert) {
        if (raw < b.spec.danger) level = 'fail';
        else if (raw < b.spec.warn) level = 'warn';
      } else {
        if (raw <= b.spec.danger) level = 'fail';
        else if (raw <= b.spec.warn) level = 'warn';
      }
      if (b.cell.dataset.level !== level) b.cell.dataset.level = level;
    }
  }

  function paintClock(state) {
    if (!state) return;
    const sol = 'SOL ' + pad2(state.day);
    if (solEl.textContent !== sol) solEl.textContent = sol;
    if (timeEl.textContent !== state.label) timeEl.textContent = state.label;
    const night = state.isNight ? '1' : '0';
    if (root.dataset.night !== night) root.dataset.night = night;

    /* qua ngày mới thì tự ghi thêm một dòng nhật ký, để widget có
       chuyện để đọc dù nơi khác không gọi pushLog. */
    if (state.day !== lastDay) {
      const first = lastDay === -1;
      lastDay = state.day;
      if (!first) appendFlavor(state.day);
    }
  }

  function paintQuest() {
    const sent = signalSent;
    const key = sent ? 'hud2.quest.wait' : 'hud2.quest.signal';
    const text = t(key);
    if (questV.textContent !== text) questV.textContent = text;
    root.dataset.quest = sent ? 'wait' : 'signal';
  }

  /* ---------- nhật ký ---------- */

  const logItems = [];
  let logDirty = true;

  function flavorFor(day) {
    if (!DAY_LOG.length) return null;
    const index = ((day - 1) % DAY_LOG.length + DAY_LOG.length) % DAY_LOG.length;
    const entry = DAY_LOG[index];
    return { vi: entry.vi, en: entry.en };
  }

  function appendFlavor(day) {
    const entry = flavorFor(day);
    if (!entry) return;
    logItems.push({ day, entry });
    if (logItems.length > 60) logItems.shift();
    logDirty = true;
    renderLog();
  }

  /* Nơi khác gọi khi có việc xảy ra: thu hoạch, nhặt được đồ, mất điện.
     Chữ truyền vào là chữ đã dịch sẵn, cùng một câu cho cả hai ngôn ngữ,
     vì người gọi biết rõ ngữ cảnh hơn widget này. */
  function pushLog(text) {
    if (!text) return;
    const day = clock && typeof clock.state === 'function' ? clock.state().day : 1;
    logItems.push({ day, entry: { vi: String(text), en: String(text) } });
    if (logItems.length > 60) logItems.shift();
    logDirty = true;
    renderLog();
  }

  function renderLog() {
    if (!logDirty) return;
    logDirty = false;

    const frag = document.createDocumentFragment();
    const lang = getLang();

    for (const item of logItems) {
      const li = document.createElement('li');
      li.className = 'hud2-log-line';

      const tag = document.createElement('span');
      tag.className = 'hud2-log-day';
      tag.textContent = t('hud2.log.day').replace('{n}', pad2(item.day));

      const txt = document.createElement('span');
      txt.className = 'hud2-log-text';
      txt.textContent = (lang === 'en' ? item.entry.en : item.entry.vi) || item.entry.vi || '';

      li.append(tag, txt);
      frag.appendChild(li);
    }

    logList.innerHTML = '';
    logList.appendChild(frag);
    applyLogVisibility();
  }

  function applyLogVisibility() {
    const lines = Array.from(logList.children);
    const keep = logCollapsed ? 4 : lines.length;
    const from = lines.length - keep;
    lines.forEach((el, i) => { el.hidden = i < from; });
    logEl.dataset.collapsed = logCollapsed ? 'true' : 'false';
    logToggle.setAttribute('aria-expanded', logCollapsed ? 'false' : 'true');
    logToggle.setAttribute('aria-label', logCollapsed ? t('hud2.log.expand') : t('hud2.log.collapse'));
    logToggle.title = logCollapsed ? t('hud2.log.expand') : t('hud2.log.collapse');
    logToggleIco.innerHTML = logCollapsed ? ICONS.restore : ICONS.collapse;
    if (!logCollapsed) logBody.scrollTop = logBody.scrollHeight;
  }

  function setLogCollapsed(next) {
    logCollapsed = !!next;
    writeLogCollapsed(logCollapsed);
    applyLogVisibility();
  }

  /* Dòng đầu tiên: vài ngày gần nhất, lấy từ base-flavor.js, để widget
     không mở ra trống trơn ở lần chơi đầu và đủ bốn dòng cho chế độ
     thu gọn. */
  function seedLog() {
    if (logItems.length) return;
    const day = clock && typeof clock.state === 'function' ? clock.state().day : 1;
    lastDay = day;
    const from = Math.max(1, day - 4);
    for (let d = from; d <= day; d++) {
      const entry = flavorFor(d);
      if (entry) logItems.push({ day: d, entry });
    }
    logDirty = true;
    renderLog();
  }

  /* ---------- sổ tay ---------- */

  const FACTS = ['dust', 'moxie', 'dsn'];

  function buildFacts() {
    factsEl.innerHTML = '';
    for (const id of FACTS) {
      const dt = document.createElement('dt');
      dt.className = 'hud2-fact-t';
      dt.dataset.fact = id;
      const dd = document.createElement('dd');
      dd.className = 'hud2-fact-b';
      dd.dataset.fact = id;
      factsEl.append(dt, dd);
    }
  }
  buildFacts();

  let guideOpen = false;
  let lastFocus = null;

  function openGuide() {
    if (guideOpen) return;
    guideOpen = true;
    lastFocus = document.activeElement;
    guideEl.hidden = false;
    root.dataset.guide = '1';
    /* Đóng bằng Esc và bằng bấm ra ngoài: cả hai đều gắn ở document,
       gỡ ngay khi đóng để không giữ listener thừa. */
    document.addEventListener('keydown', onKeydown);
    const x = q('.hud2-guide-x');
    if (x) x.focus({ preventScroll: true });
    if (typeof onOpenGuide === 'function') {
      try { onOpenGuide(); } catch (err) { console.error('onOpenGuide lỗi', err); }
    }
  }

  function closeGuide() {
    if (!guideOpen) return;
    guideOpen = false;
    guideEl.hidden = true;
    delete root.dataset.guide;
    document.removeEventListener('keydown', onKeydown);
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeGuide();
    }
  }

  guideEl.addEventListener('click', (e) => {
    const tgt = e.target;
    if (tgt instanceof Element && tgt.closest('[data-guide-close]')) closeGuide();
  });

  /* ---------- nút ---------- */

  function flashSaved() {
    savedEl.textContent = t('hud2.saveDone');
    savedEl.classList.add('is-on');
    window.clearTimeout(savedTimer);
    savedTimer = window.setTimeout(() => savedEl.classList.remove('is-on'), 1600);
  }

  guideBtn.addEventListener('click', () => openGuide());

  saveBtn.addEventListener('click', () => {
    flashSaved();
    if (typeof onSave === 'function') {
      try { onSave(); } catch (err) { console.error('onSave lỗi', err); }
    }
  });

  settingsBtn.addEventListener('click', () => {
    if (typeof onOpenSettings === 'function') {
      try { onOpenSettings(); } catch (err) { console.error('onOpenSettings lỗi', err); }
    }
  });

  function setCollapsed(next) {
    const value = !!next;
    root.dataset.collapsed = value ? 'true' : 'false';
    collapseBtn.setAttribute('aria-expanded', value ? 'false' : 'true');
    collapseBtn.setAttribute('aria-label', value ? t('hud2.expand') : t('hud2.collapse'));
    collapseBtn.title = value ? t('hud2.expand') : t('hud2.collapse');
    if (value) collapseBtn.blur();
  }

  collapseBtn.addEventListener('click', () => setCollapsed(true));
  restoreEl.addEventListener('click', () => setCollapsed(false));

  logToggle.addEventListener('click', () => setLogCollapsed(!logCollapsed));

  /* ---------- nhãn ---------- */

  function applyLang() {
    nameEl.textContent = playerName || t('hud2.astronaut');
    avatarIni.textContent = initials;

    for (const [id, b] of Object.entries(vitals)) {
      b.keyEl.textContent = t('hud2.' + id);
      b.valEl.setAttribute('title', t('hud2.' + id));
    }

    for (const [id, b] of Object.entries(station)) {
      b.keyEl.textContent = t('hud2.' + id);
      b.unitEl.textContent = t('hud2.unit.' + id);
    }

    speedsEl.setAttribute('aria-label', t('hud2.speed'));
    paintSpeed(clock && typeof clock.speed === 'function' ? clock.speed() : null);

    questK.textContent = t('hud2.quest.label');
    paintQuest();

    guideBtn.querySelector('.hud2-btn-label').textContent = t('hud2.guide');
    guideBtn.setAttribute('aria-label', t('hud2.guide'));
    guideBtn.title = t('hud2.guide');

    saveBtn.querySelector('.hud2-btn-label').textContent = t('hud2.save');
    saveBtn.setAttribute('aria-label', t('hud2.save'));
    saveBtn.title = t('hud2.save');

    settingsBtn.querySelector('.hud2-btn-label').textContent = t('hud2.settings');
    settingsBtn.setAttribute('aria-label', t('hud2.settings'));
    settingsBtn.title = t('hud2.settings');

    const collapsed = root.dataset.collapsed === 'true';
    collapseBtn.setAttribute('aria-label', collapsed ? t('hud2.expand') : t('hud2.collapse'));
    collapseBtn.title = collapsed ? t('hud2.expand') : t('hud2.collapse');
    restoreLabel.textContent = t('hud2.expand');
    restoreEl.setAttribute('aria-label', t('hud2.expand'));
    restoreEl.title = t('hud2.expand');

    logTitle.textContent = t('hud2.log.title');
    logEl.setAttribute('aria-label', t('hud2.log.title'));

    guideTitle.textContent = t('hud2.guide.title');
    const x = q('.hud2-guide-x');
    if (x) x.setAttribute('aria-label', t('hud2.guide.close'));

    const heads = [
      ['hud2.guide.how', 'hud2.guide.how.body'],
      ['hud2.guide.stats', 'hud2.guide.stats.body'],
      ['hud2.guide.signal', 'hud2.guide.signal.body'],
      ['hud2.guide.facts', null],
    ];
    guideSecs.forEach((sec, i) => {
      const pair = heads[i];
      if (!pair) return;
      const h = sec.querySelector('.hud2-guide-h');
      const p = sec.querySelector('.hud2-guide-p');
      if (h) h.textContent = t(pair[0]);
      if (p && pair[1]) p.textContent = t(pair[1]);
    });

    factsEl.querySelectorAll('[data-fact]').forEach((el) => {
      const id = el.dataset.fact;
      el.textContent = t(el.tagName === 'DT' ? 'hud2.guide.' + id : 'hud2.guide.' + id + '.body');
    });

    logDirty = true;
    renderLog();
    applyLogVisibility();
  }

  /* ---------- nối vào nguồn số ---------- */

  function paintAll() {
    const snap = stats && typeof stats.get === 'function' ? stats.get() : null;
    if (snap) {
      signalSent = signalSent || readSignalSent(snap);
      paintVitals(snap);
      paintStation(snap);
    }
    if (clock && typeof clock.state === 'function') paintClock(clock.state());
    paintQuest();
  }

  if (stats && typeof stats.onTick === 'function') {
    statsOff = stats.onTick((snap) => {
      if (readSignalSent(snap)) signalSent = true;
      paintVitals(snap);
      paintStation(snap);
      paintQuest();
    });
  }

  if (clock && typeof clock.onTick === 'function') {
    clockOff = clock.onTick((state) => {
      paintClock(state);
    });
  }

  if (clock && typeof clock.onSpeedChange === 'function') {
    speedOff = clock.onSpeedChange(paintSpeed);
  }

  langOff = onLangChange(() => {
    applyLang();
    paintAll();
  });

  applyLang();
  seedLog();
  setCollapsed(false);
  setLogCollapsed(logCollapsed);
  paintAll();

  /* ---------- dọn dẹp ---------- */

  function destroy() {
    if (typeof statsOff === 'function') statsOff();
    if (typeof clockOff === 'function') clockOff();
    if (typeof speedOff === 'function') speedOff();
    if (typeof langOff === 'function') langOff();
    document.removeEventListener('keydown', onKeydown);
    window.clearTimeout(savedTimer);
    root.remove();
  }

  return {
    root,
    refresh() {
      motionOn = readMotion();
      root.classList.toggle('is-static', !motionOn);
      applyLang();
      paintAll();
      logDirty = true;
      renderLog();
    },
    setSignalSent(on) {
      signalSent = !!on;
      paintQuest();
    },
    pushLog,
    openGuide,
    closeGuide,
    destroy,
  };
}
