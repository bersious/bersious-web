/* ============================================================
   flight.js
   Màn HÀNH TRÌNH BAY: ghép bản đồ quỹ đạo với đàm phán vai trò
   thành một trải nghiệm liền mạch.

   Trong 258,9 ngày bay, tàu đi qua bốn phase. Mỗi phase có vài mốc
   thời gian đã định trước; tới mốc thì bản đồ dừng lại, một cuộc
   tranh luận giữa ba vai trò mở ra, người chơi chọn một phương án,
   đọc phản ứng của người bị gạt ra ngoài, rồi tàu bay tiếp.

   Hai module đã có sẵn và file này chỉ nối vào, không sửa:
     - mission-viz.js  vẽ bản đồ, đẩy số liệu ra qua onFrame
     - negotiation.js  toàn bộ luật đàm phán, không chạm DOM

   Đường dẫn: luôn dựng base bằng new URL('.', import.meta.url).href.
   Trang deploy có thể không có dấu chéo cuối nên đường dẫn tương đối
   trần sẽ 404.
   ============================================================ */

import { t, getLang, onLangChange } from './i18n.js';
import { playOneShotSfx } from './audio-sfx.js';
import { createMissionViz } from './mission-viz.js';
import {
  createNegotiation,
  pickNextEvent,
  applyChoice,
  getCohesionStatus,
  getSummary,
  describeEffects,
  THRESHOLDS,
} from './negotiation.js';
import { TRANSFER_DAYS, AU_KM, formatNumber } from './mission-math.js';

const BASE = new URL('.', import.meta.url).href;
const DATA_URL = BASE + 'data/events/role_negotiations.json';

/* Đồng thuận khởi điểm. Bảy mươi là mức một đội vừa rời Trái Đất:
   chưa ai mất lòng ai, nhưng cũng chưa có tín nhiệm nào để tiêu. */
const START_COHESION = 70;

const SPEEDS = [1, 10, 50];

/* Bốn phase theo đúng tên trong role_negotiations.json. Mỗi phase có
   một khoảng ngày riêng, và số sự kiện của phase quyết định các mốc
   được rải đều trong khoảng đó. Không ghi cứng ngày của từng sự kiện:
   thêm bớt sự kiện trong JSON thì nhịp tự giãn ra hoặc khít lại.
   Hành trình: cruise phần lớn thời gian, approach khi đã gần Sao Hỏa,
   descent và surface dồn vào những ngày cuối. */
const PHASE_ORDER = ['cruise', 'approach', 'descent', 'surface'];
const PHASE_BANDS = {
  cruise: [10, 145],
  approach: [152, 236],
  descent: [239, 249],
  surface: [251, TRANSFER_DAYS - 3],
};

let cssInjected = false;

function injectCss() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css/flight.css';
  link.dataset.flightCss = '1';
  document.head.appendChild(link);
}

/* ---------- tiện ích ---------- */

function tr(key, vars) {
  let s = t(key);
  if (vars) {
    for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  }
  return s;
}

/* Nội dung dài của sự kiện đã có sẵn cả bản _vi lẫn _en trong JSON,
   nên đọc thẳng theo ngôn ngữ đang bật thay vì chép lại vào i18n. */
function pick(obj, field) {
  if (!obj) return '';
  const en = getLang() === 'en';
  return (en ? obj[field + '_en'] : obj[field + '_vi'])
    || obj[field + '_vi'] || obj[field + '_en'] || '';
}

const nf = (value, digits = 0) => formatNumber(value, digits, getLang());

/* Trạng thái của một thanh tin cậy, dùng chung ngưỡng với đồng thuận
   chung để ba thanh không bao giờ đổi màu theo hai thang khác nhau. */
function trustStatus(value) {
  if (value >= THRESHOLDS.good) return 'good';
  if (value >= THRESHOLDS.strained) return 'strained';
  if (value >= THRESHOLDS.critical) return 'critical';
  return 'mutiny';
}

function phaseKey(phase) {
  return PHASE_ORDER.includes(phase) ? phase : 'cruise';
}

function phaseLabel(phase) {
  return t('flight.phase.' + phaseKey(phase));
}

/* Mốc ngày của từng sự kiện, rải đều trong khoảng của phase. */
function buildSchedule(events) {
  const counts = {};
  for (const ev of events) {
    const p = phaseKey(ev.phase);
    counts[p] = (counts[p] || 0) + 1;
  }
  const out = [];
  for (const phase of PHASE_ORDER) {
    const n = counts[phase] || 0;
    if (!n) continue;
    const [from, to] = PHASE_BANDS[phase];
    const step = (to - from) / n;
    for (let i = 0; i < n; i += 1) {
      out.push({ phase, day: from + (i + 0.5) * step });
    }
  }
  out.sort((a, b) => a.day - b.day);
  return out;
}

function phaseForDay(day) {
  let phase = PHASE_ORDER[0];
  for (const p of PHASE_ORDER) {
    if (day >= PHASE_BANDS[p][0]) phase = p;
  }
  return phase;
}

/* ---------- khung DOM ---------- */

const SHELL = `
  <div class="flt-top">
    <div class="flt-id">
      <span class="flt-kicker"></span>
      <h1 class="flt-mission"></h1>
    </div>
    <div class="flt-phase" aria-live="polite">
      <span class="flt-phase-name"></span>
      <span class="flt-phase-day"></span>
    </div>
    <div class="flt-speeds" role="group">
      <span class="flt-speeds-label"></span>
      <button type="button" class="flt-speed is-active" data-speed="1">1x</button>
      <button type="button" class="flt-speed" data-speed="10">10x</button>
      <button type="button" class="flt-speed" data-speed="50">50x</button>
    </div>
    <button type="button" class="flt-info" aria-haspopup="dialog">
      <span class="flt-info-glyph" aria-hidden="true">i</span>
      <span class="flt-info-txt"></span>
    </button>
  </div>

  <div class="flt-map">
    <div class="flt-map-stage"></div>
    <div class="flt-tele">
      <div class="flt-tele-cell">
        <span class="flt-tele-k" data-k="dist"></span>
        <span class="flt-tele-v"><b class="flt-t-au">0,000</b><i>AU</i></span>
      </div>
      <div class="flt-tele-cell is-km">
        <span class="flt-tele-k" data-k="distKm"></span>
        <span class="flt-tele-v"><b class="flt-t-km">0</b><i class="flt-u-km">km</i></span>
      </div>
      <div class="flt-tele-cell">
        <span class="flt-tele-k" data-k="delay"></span>
        <span class="flt-tele-v"><b class="flt-t-delay">0,0</b><i class="flt-u-min"></i></span>
      </div>
      <div class="flt-tele-cell">
        <span class="flt-tele-k" data-k="day"></span>
        <span class="flt-tele-v"><b class="flt-t-day">0,0</b><i class="flt-u-of"></i></span>
      </div>
      <div class="flt-tele-cell is-tcm">
        <span class="flt-tele-k" data-k="tcm"></span>
        <span class="flt-tele-v"><b class="flt-t-tcm">0 / 3</b></span>
      </div>
    </div>
  </div>

  <aside class="flt-side">
    <div class="flt-bars">
      <div class="flt-bar is-main" data-status="good">
        <div class="flt-bar-head">
          <span class="flt-bar-name" data-k="cohesion"></span>
          <span class="flt-bar-val">70</span>
        </div>
        <div class="flt-bar-track"><span class="flt-bar-fill"></span></div>
        <span class="flt-bar-status"></span>
      </div>
      <div class="flt-bars-roles">
        <div class="flt-bar" data-role="commander" data-status="good">
          <div class="flt-bar-head">
            <span class="flt-bar-name"></span>
            <span class="flt-bar-val">70</span>
          </div>
          <div class="flt-bar-track"><span class="flt-bar-fill"></span></div>
        </div>
        <div class="flt-bar" data-role="engineer" data-status="good">
          <div class="flt-bar-head">
            <span class="flt-bar-name"></span>
            <span class="flt-bar-val">70</span>
          </div>
          <div class="flt-bar-track"><span class="flt-bar-fill"></span></div>
        </div>
        <div class="flt-bar" data-role="comms" data-status="good">
          <div class="flt-bar-head">
            <span class="flt-bar-name"></span>
            <span class="flt-bar-val">70</span>
          </div>
          <div class="flt-bar-track"><span class="flt-bar-fill"></span></div>
        </div>
      </div>
    </div>

    <div class="flt-body">
      <div class="flt-loading"></div>

      <div class="flt-idle" hidden>
        <b class="flt-idle-title"></b>
        <p class="flt-idle-text"></p>
        <div class="flt-log" hidden>
          <span class="flt-log-title"></span>
          <ol class="flt-log-list"></ol>
        </div>
      </div>

      <div class="flt-event" hidden>
        <span class="flt-ev-phase"></span>
        <h2 class="flt-ev-title"></h2>
        <p class="flt-ev-sit"></p>
        <p class="flt-ev-stakes"></p>
        <div class="flt-ev-prompt"></div>
        <div class="flt-options" role="group"></div>
        <div class="flt-result" hidden></div>
      </div>

      <div class="flt-error" hidden>
        <p class="flt-error-text"></p>
        <button type="button" class="flt-btn flt-retry"></button>
      </div>
    </div>

    <div class="flt-foot">
      <span class="flt-hint"></span>
      <button type="button" class="flt-btn flt-continue" hidden></button>
    </div>
  </aside>

  <div class="flt-overlay flt-fail" hidden>
    <div class="flt-card is-fail" role="dialog" aria-modal="true">
      <span class="flt-card-kicker"></span>
      <h2 class="flt-card-title"></h2>
      <p class="flt-card-body"></p>
      <p class="flt-card-stat"></p>
      <div class="flt-card-actions">
        <button type="button" class="flt-btn flt-fail-retry"></button>
      </div>
    </div>
  </div>

  <div class="flt-overlay flt-arrive" hidden>
    <div class="flt-card is-arrive" role="dialog" aria-modal="true">
      <span class="flt-card-kicker"></span>
      <h2 class="flt-card-title"></h2>
      <p class="flt-card-body"></p>
      <div class="flt-card-actions">
        <button type="button" class="flt-btn flt-arrive-ok"></button>
      </div>
    </div>
  </div>

  <div class="flt-overlay flt-modal" hidden>
    <div class="flt-card is-info" role="dialog" aria-modal="true" aria-labelledby="flt-info-title">
      <h2 class="flt-card-title" id="flt-info-title"></h2>
      <div class="flt-info-body">
        <section class="flt-info-sec">
          <h3 class="flt-info-h"></h3>
          <p class="flt-info-p" data-k="trade"></p>
        </section>
        <section class="flt-info-sec">
          <h3 class="flt-info-h" data-k="tcmH"></h3>
          <p class="flt-info-p" data-k="tcm"></p>
        </section>
      </div>
      <div class="flt-card-actions">
        <button type="button" class="flt-btn flt-info-close"></button>
      </div>
    </div>
  </div>
`;

const ICON_ARROW = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8h10"/><path d="M8.6 4l4 4-4 4"/></svg>';

/* ============================================================ */

export function startFlight({ container, design, onDone } = {}) {
  injectCss();

  const host = container || document.body;
  const root = document.createElement('div');
  root.className = 'flt';
  root.innerHTML = SHELL;
  host.appendChild(root);

  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => Array.from(root.querySelectorAll(sel));

  /* ---------- phần tử ---------- */

  const elMapStage = q('.flt-map-stage');
  const elMission = q('.flt-mission');
  const elKicker = q('.flt-kicker');
  const elPhaseName = q('.flt-phase-name');
  const elPhaseDay = q('.flt-phase-day');
  const elSpeedsLabel = q('.flt-speeds-label');
  const elSpeedGroup = q('.flt-speeds');
  const elInfoBtn = q('.flt-info');
  const elInfoTxt = q('.flt-info-txt');

  const elBarMain = q('.flt-bar.is-main');
  const elBarMainVal = elBarMain.querySelector('.flt-bar-val');
  const elBarMainFill = elBarMain.querySelector('.flt-bar-fill');
  const elBarMainStatus = elBarMain.querySelector('.flt-bar-status');
  const elBarsRoles = q('.flt-bars-roles');

  const elBody = q('.flt-body');
  const elLoading = q('.flt-loading');
  const elIdle = q('.flt-idle');
  const elIdleTitle = q('.flt-idle-title');
  const elIdleText = q('.flt-idle-text');
  const elLog = q('.flt-log');
  const elLogTitle = q('.flt-log-title');
  const elLogList = q('.flt-log-list');
  const elEvent = q('.flt-event');
  const elEvPhase = q('.flt-ev-phase');
  const elEvTitle = q('.flt-ev-title');
  const elEvSit = q('.flt-ev-sit');
  const elEvStakes = q('.flt-ev-stakes');
  const elEvPrompt = q('.flt-ev-prompt');
  const elOptions = q('.flt-options');
  const elResult = q('.flt-result');
  const elError = q('.flt-error');
  const elErrorText = q('.flt-error-text');
  const elRetry = q('.flt-retry');

  const elHint = q('.flt-hint');
  const elContinue = q('.flt-continue');

  const elFail = q('.flt-fail');
  const elFailKicker = elFail.querySelector('.flt-card-kicker');
  const elFailTitle = elFail.querySelector('.flt-card-title');
  const elFailBody = elFail.querySelector('.flt-card-body');
  const elFailStat = elFail.querySelector('.flt-card-stat');
  const elFailRetry = q('.flt-fail-retry');

  const elArrive = q('.flt-arrive');
  const elArriveKicker = elArrive.querySelector('.flt-card-kicker');
  const elArriveTitle = elArrive.querySelector('.flt-card-title');
  const elArriveBody = elArrive.querySelector('.flt-card-body');
  const elArriveOk = q('.flt-arrive-ok');

  const elModal = q('.flt-modal');
  const elInfoTitle = q('#flt-info-title');
  const elInfoClose = q('.flt-info-close');

  const elTeleAu = q('.flt-t-au');
  const elTeleKm = q('.flt-t-km');
  const elTeleDelay = q('.flt-t-delay');
  const elTeleDay = q('.flt-t-day');
  const elTeleTcm = q('.flt-t-tcm');

  /* ---------- trạng thái ---------- */

  let eventsData = null;
  let schedule = [];
  let neg = null;
  let viz = null;

  let slotIndex = 0;
  let eventOpen = false;
  let finished = false;
  let failed = false;
  let destroyed = false;
  let started = false;

  let speed = SPEEDS[0];
  let lastFrame = null;
  let currentEvent = null;
  /* Ngày bay tại từng lượt, để nhật ký ghi đúng mốc thời gian. Lõi đàm
     phán không biết gì về ngày bay nên chỉ lớp này mới có con số đó. */
  const dayByTurn = {};
  const teleCache = { au: '', km: '', delay: '', day: '', tcm: '', phase: '' };
  const timers = new Set();

  function later(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!destroyed) fn();
    }, ms);
    timers.add(id);
    return id;
  }

  /* ---------- chữ ---------- */

  function applyLang() {
    const lang = getLang();
    const missionName = (design && (design.name || design.mission || design.title)) || '';
    elKicker.textContent = t('flight.kicker');
    elMission.textContent = missionName || t('flight.missionFallback');
    elSpeedsLabel.textContent = t('flight.speeds');
    elSpeedGroup.setAttribute('aria-label', t('flight.speeds'));
    elInfoTxt.textContent = t('flight.infoBtn');
    elInfoBtn.setAttribute('aria-label', t('flight.infoBtn'));
    elBarMain.querySelector('.flt-bar-name').textContent = t('flight.cohesion');

    q('.flt-tele [data-k="dist"]').textContent = t('flight.tele.distance');
    q('.flt-tele [data-k="distKm"]').textContent = t('flight.tele.km');
    q('.flt-tele [data-k="delay"]').textContent = t('flight.tele.delay');
    q('.flt-tele [data-k="day"]').textContent = t('flight.tele.day');
    /* Bộ chọn phải nằm trong khung riêng: cùng một data-k 'tcm' có mặt
       ở cả bảng thông số lẫn phần giải thích, nếu không giới hạn thì
       câu giải thích dài sẽ đè lên nhãn ngắn của ô thông số. */
    q('.flt-tele [data-k="tcm"]').textContent = t('flight.tele.tcm');
    q('.flt-u-km').textContent = 'km';
    q('.flt-u-min').textContent = t('flight.unit.min');
    /* Đơn vị của ô ngày bay phải kèm tổng, nếu không nó chỉ còn chữ
       "trên" lơ lửng và người chơi không biết đang trên bao nhiêu. */
    q('.flt-u-of').textContent = `${t('flight.unit.of')} ${nf(TRANSFER_DAYS, 1)}`;

    elLoading.textContent = t('flight.loading');
    elErrorText.textContent = t('flight.loadError');
    elRetry.textContent = t('flight.retry');
    elHint.textContent = t('flight.hint');
    elContinue.innerHTML = `${t('flight.continue')} ${ICON_ARROW}`;

    elEvPrompt.textContent = t('flight.choosePrompt');
    elFailKicker.textContent = t('flight.fail.kicker');
    elFailRetry.textContent = t('flight.fail.retry');
    elArriveKicker.textContent = t('flight.arrive.kicker');
    elArriveOk.textContent = t('flight.arrive.ok');
    elInfoTitle.textContent = t('flight.info.title');
    elInfoClose.textContent = t('flight.info.close');
    q('.flt-info-sec h3').textContent = t('flight.info.tradeH');
    q('.flt-modal [data-k="trade"]').textContent = t('flight.info.tradeBody');
    q('.flt-modal [data-k="tcmH"]').textContent = t('flight.info.tcmH');
    q('.flt-modal [data-k="tcm"]').textContent = t('flight.info.tcmBody');

    elPhaseDay.textContent = tr('flight.totalDays', { n: nf(TRANSFER_DAYS, 1) });

    for (const role of Object.keys((neg && neg.roles) || {})) {
      const row = elBarsRoles.querySelector(`[data-role="${role}"] .flt-bar-name`);
      if (row) row.textContent = lang === 'en' ? neg.roles[role].name_en : neg.roles[role].name_vi;
    }

    if (viz && typeof viz.setLang === 'function') viz.setLang(lang);
    if (neg) {
      renderBars();
      if (eventOpen && currentEvent) renderEvent(currentEvent);
    } else {
      renderIdle();
    }
    if (!elFail.hidden) renderFail();
    if (!elArrive.hidden) renderArrive();
  }

  /* ---------- ba thanh đồng thuận ---------- */

  function renderBars() {
    if (!neg) return;
    const cs = getCohesionStatus(neg);
    elBarMain.dataset.status = cs.status;
    elBarMainVal.textContent = nf(cs.value, 0);
    elBarMainFill.style.setProperty('--fill', Math.round(cs.value) + '%');
    elBarMainStatus.textContent = getLang() === 'en' ? cs.label_en : cs.label_vi;
    elBarMainStatus.dataset.status = cs.status;

    for (const role of Object.keys(neg.roles)) {
      const row = elBarsRoles.querySelector(`[data-role="${role}"]`);
      if (!row) continue;
      const r = neg.roles[role];
      row.dataset.status = trustStatus(r.trust);
      row.querySelector('.flt-bar-val').textContent = nf(r.trust, 0);
      row.querySelector('.flt-bar-fill').style.setProperty('--fill', Math.round(r.trust) + '%');
    }
  }

  /* ---------- bảng thông số trực tiếp ---------- */

  function paintTelemetry(frame) {
    if (!frame) return;
    const au = frame.distanceKm / AU_KM;
    const auText = nf(au, 3);
    const kmText = nf(frame.distanceKm, 0);
    const delayText = nf(frame.delayMinutes, 1);
    const dayText = nf(frame.day, 1);
    const tcmText = `${frame.tcmPassed} / 3`;
    const phase = phaseForDay(frame.day);
    const phaseText = phaseLabel(phase);

    if (auText !== teleCache.au) { teleCache.au = auText; elTeleAu.textContent = auText; }
    if (kmText !== teleCache.km) { teleCache.km = kmText; elTeleKm.textContent = kmText; }
    if (delayText !== teleCache.delay) { teleCache.delay = delayText; elTeleDelay.textContent = delayText; }
    if (dayText !== teleCache.day) { teleCache.day = dayText; elTeleDay.textContent = dayText; }
    if (tcmText !== teleCache.tcm) { teleCache.tcm = tcmText; elTeleTcm.textContent = tcmText; }
    if (phaseText !== teleCache.phase) {
      teleCache.phase = phaseText;
      elPhaseName.textContent = phaseText;
    }
  }

  /* ---------- idle ---------- */

  function nextSlot() {
    return slotIndex < schedule.length ? schedule[slotIndex] : null;
  }

  function renderIdle() {
    elIdle.hidden = !started || eventOpen || finished || failed;
    if (elIdle.hidden) return;
    const slot = nextSlot();
    elIdleTitle.textContent = t('flight.idle.title');
    elIdleText.textContent = slot
      ? tr('flight.idle.next', { day: nf(slot.day, 1) })
      : t('flight.idle.end');
    renderLog();
  }

  /* Nhật ký quyết định. Panel bên phải còn trống suốt những chặng bay
     dài, và chỗ trống đó đúng là chỗ cần nhất: người chơi vừa đánh đổi
     ba thứ, họ phải đọc lại được mình đã đổi cái gì. */
  function renderLog() {
    const log = (neg && neg.log) || [];
    elLog.hidden = log.length === 0;
    elLogTitle.textContent = t('flight.log.title');
    if (!log.length) {
      elLogList.innerHTML = '';
      return;
    }
    const lang = getLang();
    elLogList.innerHTML = '';
    for (const entry of log.slice().reverse()) {
      const li = document.createElement('li');
      const ev = neg.byId[entry.eventId];
      const opt = ev && (ev.options || []).find((o) => o.id === entry.optionId);
      const title = ev ? pick(ev, 'title') : entry.eventId;
      const label = opt ? pick(opt, 'label') : entry.optionId;
      li.dataset.sign = entry.cohesionDelta < 0 ? 'neg' : entry.cohesionDelta > 0 ? 'pos' : 'flat';
      li.innerHTML = `
        <span class="flt-log-day"></span>
        <span class="flt-log-body">
          <span class="flt-log-ev"></span>
          <span class="flt-log-opt"></span>
        </span>
        <span class="flt-log-delta"></span>
      `;
      li.querySelector('.flt-log-day').textContent = 'D+' + nf(dayByTurn[entry.turn] || 0, 0);
      li.querySelector('.flt-log-ev').textContent = title;
      li.querySelector('.flt-log-opt').textContent = label;
      li.querySelector('.flt-log-delta').textContent =
        (entry.cohesionDelta > 0 ? '+' : '') + nf(entry.cohesionDelta, 0);
      if (lang === 'en') li.title = title;
      elLogList.appendChild(li);
    }
  }

  /* ---------- sự kiện ---------- */

  function optionLetter(i) {
    return String.fromCharCode(65 + i);
  }

  function renderEvent(ev) {
    if (!ev) return;
    elEvent.hidden = false;
    elEvPhase.textContent = phaseLabel(ev.phase);
    elEvTitle.textContent = pick(ev, 'title');
    elEvSit.textContent = pick(ev, 'situation');
    elEvStakes.textContent = pick(ev, 'stakes');

    elOptions.innerHTML = '';
    (ev.options || []).forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flt-opt';
      btn.dataset.option = opt.id;
      /* Mức đổi đồng thuận để lớp ngoài (test tự động, bảng phân tích
         sau này) đọc được mà không phải dò chữ trong chip. */
      btn.dataset.cohesion = String((opt.effects && opt.effects.cohesion_pct) || 0);
      const favors = opt.favors && neg && neg.roles[opt.favors]
        ? (getLang() === 'en' ? neg.roles[opt.favors].name_en : neg.roles[opt.favors].name_vi)
        : '';
      btn.innerHTML = `
        <span class="flt-opt-key" aria-hidden="true">${optionLetter(i)}</span>
        <span class="flt-opt-body">
          <span class="flt-opt-label"></span>
          <span class="flt-opt-risk"></span>
        </span>
        ${favors ? `<span class="flt-opt-tag"><span class="flt-opt-tag-k"></span>${favors}</span>` : ''}
      `;
      btn.querySelector('.flt-opt-label').textContent = pick(opt, 'label');
      btn.querySelector('.flt-opt-risk').textContent = pick(opt, 'risk');
      if (favors) btn.querySelector('.flt-opt-tag-k').textContent = t('flight.favors');
      btn.addEventListener('click', () => choose(opt.id));
      elOptions.appendChild(btn);
    });

    elResult.hidden = true;
    elResult.innerHTML = '';
    elContinue.hidden = true;
    elIdle.hidden = true;
    elBody.scrollTop = 0;
  }

  function openEvent(slot) {
    const ev = pickNextEvent(neg, slot.phase);
    if (!ev) return false;
    currentEvent = ev;
    eventOpen = true;
    if (viz) {
      viz.pause();
      /* Ở 50x một khung hình nhảy tới mười mấy ngày, nên có thể đã lố
         qua mốc trước khi kịp dừng. Kéo đồng hồ về đúng mốc để người
         chơi thấy sự kiện xảy ra ở ngày ghi trong kế hoạch, không phải
         ở ngày tàu tình cờ dừng. */
      if (lastFrame && lastFrame.day > slot.day + 0.05) viz.setDay(slot.day);
    }
    renderEvent(ev);
    renderIdle();
    playOneShotSfx('warning-chime');
    const first = elOptions.querySelector('.flt-opt');
    if (first) first.focus({ preventScroll: true });
    return true;
  }

  function choose(optionId) {
    if (!eventOpen || !neg || !currentEvent || finished || failed) return;
    const opt = (currentEvent.options || []).find((o) => o.id === optionId);
    if (!opt) return;

    let result;
    try {
      result = applyChoice(neg, optionId);
    } catch {
      return;
    }
    dayByTurn[result.turn] = lastFrame ? lastFrame.day : 0;
    playOneShotSfx('terminal-blip');

    qa('.flt-opt').forEach((b) => { b.disabled = true; });

    renderBars();
    renderResult(result, opt);
    renderLog();
    elContinue.hidden = false;
    elContinue.focus({ preventScroll: true });

    if (neg.mutiny) {
      failed = true;
      eventOpen = false;
      elContinue.hidden = true;
      later(showFail, 420);
    }
  }

  function renderResult(result, opt) {
    elResult.hidden = false;
    elResult.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'flt-result-head';
    head.textContent = t('flight.after.title');
    elResult.appendChild(head);

    const chosen = document.createElement('p');
    chosen.className = 'flt-result-chosen';
    chosen.textContent = opt ? pick(opt, 'label') : '';
    elResult.appendChild(chosen);

    const chips = document.createElement('div');
    chips.className = 'flt-chips';
    const push = (text, dir) => {
      const chip = document.createElement('span');
      chip.className = 'flt-chip' + (dir < 0 ? ' is-neg' : dir > 0 ? ' is-pos' : '');
      chip.textContent = text;
      chips.appendChild(chip);
    };

    const lang = getLang();
    for (const e of describeEffects(opt && opt.effects, lang)) {
      if (!e.value) continue;
      const sign = e.value > 0 ? '+' : '';
      push(`${sign}${nf(e.value, 0)} ${e.label}`, e.value);
    }
    if (result.cohesionDelta) {
      push(t('flight.chip.cohesion') + ' ' + (result.cohesionDelta > 0 ? '+' : '') + nf(result.cohesionDelta, 0), result.cohesionDelta);
    }
    if (result.trustDeltas) {
      for (const role of Object.keys(result.trustDeltas)) {
        const d = result.trustDeltas[role];
        if (!d) continue;
        const name = lang === 'en' ? neg.roles[role].name_en : neg.roles[role].name_vi;
        push(`${name} ${d > 0 ? '+' : ''}${nf(d, 0)}`, d);
      }
    }
    if (chips.children.length) elResult.appendChild(chips);

    const react = document.createElement('div');
    react.className = 'flt-reaction';
    if (result.veto) {
      react.dataset.severity = result.veto.severity;
      const who = lang === 'en' ? result.veto.name_en : result.veto.name_vi;
      react.innerHTML = `<span class="flt-reaction-who"></span><p class="flt-reaction-line"></p>`;
      react.querySelector('.flt-reaction-who').textContent =
        tr('flight.after.veto', { role: who, trust: nf(result.veto.trust, 1) });
      react.querySelector('.flt-reaction-line').textContent =
        lang === 'en' ? result.veto.line_en : result.veto.line_vi;
    } else {
      react.dataset.severity = 'none';
      react.innerHTML = `<p class="flt-reaction-line"></p>`;
      react.querySelector('.flt-reaction-line').textContent = t('flight.after.noVeto');
    }
    elResult.appendChild(react);
  }

  function continueFlight() {
    if (finished || failed || !eventOpen) return;
    eventOpen = false;
    currentEvent = null;
    elEvent.hidden = true;
    elContinue.hidden = true;
    elResult.hidden = true;
    renderIdle();
    if (viz) viz.resume();
  }

  /* ---------- thất bại ---------- */

  function showFail() {
    if (destroyed) return;
    renderFail();
    elFail.hidden = false;
    elFailRetry.focus({ preventScroll: true });
  }

  function renderFail() {
    const dayValue = lastFrame ? lastFrame.day : 0;
    const summary = neg ? getSummary(neg) : null;
    elFailTitle.textContent = tr('flight.fail.title', { day: nf(dayValue, 1) });
    elFailBody.textContent = t('flight.fail.body');
    elFailStat.textContent = tr('flight.fail.stat', {
      n: summary ? nf(summary.turns, 0) : '0',
      total: nf(schedule.length, 0),
    });
  }

  /* ---------- tới đích ---------- */

  function finish() {
    if (finished || failed) return;
    finished = true;
    if (viz) viz.pause();
    const summary = neg ? getSummary(neg) : null;
    const success = !!(summary && !summary.mutiny && summary.cohesion > 0);
    renderArrive();
    elArrive.hidden = false;
    elContinue.hidden = true;
    elEvent.hidden = true;
    elIdle.hidden = true;
    elArriveOk.focus({ preventScroll: true });
    if (typeof onDone === 'function') {
      onDone({
        negotiationState: neg,
        elapsedDays: lastFrame ? Math.min(TRANSFER_DAYS, lastFrame.day) : TRANSFER_DAYS,
        success,
      });
    }
  }

  function renderArrive() {
    const summary = neg ? getSummary(neg) : null;
    elArriveTitle.textContent = t('flight.arrive.title');
    elArriveBody.textContent = tr('flight.arrive.body', {
      days: nf(TRANSFER_DAYS, 1),
      cohesion: summary ? nf(summary.cohesion, 0) : '0',
      turns: summary ? nf(summary.turns, 0) : '0',
    });
    elArriveOk.textContent = t('flight.arrive.ok');
  }

  /* ---------- vòng chạy của bản đồ ---------- */

  function onFrame(frame) {
    if (destroyed) return;
    lastFrame = frame;
    paintTelemetry(frame);
    if (!started || finished || failed) return;

    /* Sự kiện tới mốc thì mở ngay trong khung hình này và dừng bản đồ
       lại, nên dù tua 50 lần thì ngày cũng không chạy tiếp qua mốc.
       Vòng while xử lý trường hợp một khung hình nhảy qua nhiều mốc
       cùng lúc: mỗi mốc vẫn mở đủ, không mốc nào bị bỏ. */
    while (!eventOpen && !finished && !failed && slotIndex < schedule.length
      && frame.day >= schedule[slotIndex].day - 1e-6) {
      const slot = schedule[slotIndex];
      slotIndex += 1;
      if (openEvent(slot)) break;
    }

    if (!eventOpen && !finished && !failed
      && slotIndex >= schedule.length
      && frame.day >= TRANSFER_DAYS - 0.02) {
      finish();
    }

    if (!eventOpen) renderIdle();
  }

  /* ---------- bản đồ ---------- */

  function lockScrub() {
    const track = elMapStage.querySelector('.mviz-track');
    if (!track) return;
    track.setAttribute('tabindex', '-1');
    track.setAttribute('aria-disabled', 'true');
    track.style.pointerEvents = 'none';
  }

  function createViz() {
    elMapStage.innerHTML = '';
    viz = createMissionViz({
      container: elMapStage,
      lang: getLang(),
      onFrame,
    });
    viz.setSpeed(speed);
    lockScrub();
    /* Bản đồ tự không chạy khi người chơi tắt chuyển động, nhưng ở
       màn này chuyển động chính là nội dung: tàu phải bay thì mới có
       sự kiện. Gọi resume tường minh, còn phần sao nền vẫn đứng yên
       theo đúng cài đặt của mission-viz. */
    viz.resume();
  }

  function destroyViz() {
    if (!viz) return;
    try { viz.destroy(); } catch { /* bản đồ đã bị gỡ */ }
    viz = null;
  }

  /* ---------- tua nhanh ---------- */

  function setSpeed(multiplier) {
    const m = Number(multiplier);
    if (!Number.isFinite(m) || m <= 0) return;
    speed = m;
    if (viz) viz.setSpeed(m);
    qa('.flt-speed').forEach((b) => {
      b.classList.toggle('is-active', Number(b.dataset.speed) === m);
      b.setAttribute('aria-pressed', Number(b.dataset.speed) === m ? 'true' : 'false');
    });
  }

  qa('.flt-speed').forEach((btn) => {
    btn.addEventListener('click', () => setSpeed(btn.dataset.speed));
  });

  elContinue.addEventListener('click', continueFlight);

  /* ---------- modal giải thích ---------- */

  let modalReturnFocus = null;

  function openInfo() {
    modalReturnFocus = document.activeElement;
    elModal.hidden = false;
    elInfoClose.focus({ preventScroll: true });
  }

  function closeInfo() {
    elModal.hidden = true;
    if (modalReturnFocus && modalReturnFocus.focus) modalReturnFocus.focus({ preventScroll: true });
    modalReturnFocus = null;
  }

  elInfoBtn.addEventListener('click', openInfo);
  elInfoClose.addEventListener('click', closeInfo);
  elModal.addEventListener('click', (e) => {
    if (e.target === elModal) closeInfo();
  });

  /* ---------- bàn phím ---------- */

  function onKeyDown(e) {
    if (destroyed) return;
    if (!elModal.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeInfo(); }
      return;
    }
    if (!elFail.hidden || !elArrive.hidden) return;
    if (!eventOpen) return;
    if (elContinue.hidden) {
      /* đang chọn: phím số chọn nhanh phương án */
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        const btn = elOptions.querySelectorAll('.flt-opt')[n - 1];
        if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      /* Phím nằm trên một nút khác (nút tốc độ, nút thông tin) thì để
         trình duyệt lo, đừng cướp phím của họ. Chỉ khi không có nút nào
         đang giữ tiêu điểm, hoặc chính nút bay tiếp đang giữ, mới coi
         Enter hay Space là bay tiếp. */
      const active = document.activeElement;
      const onOtherButton = active && active !== elContinue
        && active.tagName === 'BUTTON';
      if (onOtherButton) return;
      e.preventDefault();
      continueFlight();
    }
  }
  document.addEventListener('keydown', onKeyDown);

  /* ---------- khởi động ---------- */

  elLoading.hidden = false;
  elEvent.hidden = true;
  elIdle.hidden = true;

  fetch(DATA_URL, { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((data) => {
      if (destroyed) return;
      const list = Array.isArray(data) ? data : (data && data.events) || [];
      if (!list.length) throw new Error('no events');
      eventsData = data;
      schedule = buildSchedule(list);
      elLoading.hidden = true;
      elError.hidden = true;
      begin();
    })
    .catch(() => {
      if (destroyed) return;
      elLoading.hidden = true;
      elError.hidden = false;
      elRetry.focus({ preventScroll: true });
    });

  elRetry.addEventListener('click', () => {
    if (eventsData) { elError.hidden = true; begin(); return; }
    window.location.reload();
  });

  function begin() {
    if (!eventsData || destroyed) return;
    const list = Array.isArray(eventsData) ? eventsData : eventsData.events;
    neg = createNegotiation({ events: list, startCohesion: START_COHESION });
    slotIndex = 0;
    for (const k of Object.keys(dayByTurn)) delete dayByTurn[k];
    eventOpen = false;
    finished = false;
    failed = false;
    currentEvent = null;
    lastFrame = null;
    teleCache.au = ''; teleCache.km = ''; teleCache.delay = '';
    teleCache.day = ''; teleCache.tcm = ''; teleCache.phase = '';

    elFail.hidden = true;
    elArrive.hidden = true;
    elEvent.hidden = true;
    elResult.hidden = true;
    elContinue.hidden = true;
    elError.hidden = true;

    elPhaseName.textContent = phaseLabel(PHASE_ORDER[0]);
    elPhaseDay.textContent = tr('flight.totalDays', { n: nf(TRANSFER_DAYS, 1) });

    started = true;
    applyLang();
    renderBars();
    renderIdle();

    destroyViz();
    createViz();
    setSpeed(speed);
  }

  elFailRetry.addEventListener('click', () => {
    playOneShotSfx('switch-flip');
    begin();
  });

  elArriveOk.addEventListener('click', () => {
    elArrive.hidden = true;
  });

  const offLang = onLangChange(() => applyLang());

  /* ---------- API ---------- */

  return {
    root,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      document.removeEventListener('keydown', onKeyDown);
      offLang();
      destroyViz();
      root.remove();
    },
    get state() {
      return neg;
    },
    get day() {
      return lastFrame ? lastFrame.day : 0;
    },
  };
}

export default startFlight;
