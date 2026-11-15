/* ============================================================
   rescue-designer.js
   Mission Design Lab: màn thiết kế tàu cứu hộ Sao Hỏa.

   Đây là phần gameplay chính. Người chơi chọn một module cho mỗi
   nhóm hệ thống, đọc ngay con số tổng ở cột phải, và phải giữ ba
   giới hạn trong mức an toàn: ngân sách, tải trọng tên lửa, delta-v.

   Nguồn số liệu duy nhất: data/nasa/rescue_modules.json và
   data/nasa/rescue_mission.json, đọc qua nasa-data.js.
   Không có con số cân bằng nào được viết lại trong file này, trừ
   ngân sách 700 triệu USD và số người trong phi hành đoàn, hai
   tham số của luật chơi chứ không phải số liệu NASA.

   Chuỗi giao diện: i18n.js, tiền tố 'rescue.'.
   Màu, cỡ chữ, khoảng cách: css/tokens.css, qua css/rescue.css.

   Đường dẫn: luôn lấy base bằng new URL('.', import.meta.url).href.
   Trang deploy ở /nasa không có dấu chéo cuối, nên dựng base từ
   location.href sẽ làm mọi file 404.
   ============================================================ */

import { t, getLang, onLangChange } from './i18n.js';
import { getSettings } from './settings.js';
import {
  loadRescueData,
  summarizeModules,
  availableDeltaV_ms,
  validateRescueDesign,
  tsiolkovskyFuelFraction,
  REQUIRED_DELTA_V_MS,
} from './nasa-data.js';

const BASE = new URL('.', import.meta.url).href;

/* Luật chơi, không phải số liệu NASA. / Game rules, not NASA figures.
   Ngân sách đặt 700 triệu USD chứ không phải 900: thiết kế đắt nhất
   mà bộ dữ liệu cho phép là khoảng 726 triệu, nên 900 sẽ là một thanh
   không bao giờ chạm tới và không dạy được gì. Ở 700 thì tiền thật sự
   cắn, và người chơi buộc phải cân nhắc giữa động cơ hạt nhân 420
   triệu với các hệ thống khác.
   The budget is 700 million USD, not 900: the priciest legal design in
   the dataset is about 726 million, so 900 would be a bar that never
   bites and teaches nothing. At 700 the money genuinely constrains. */
const BUDGET_MUSD = 700;
const CREW_COUNT = 3;

/* Nhóm bắt buộc, đúng thứ tự người chơi nên đi. */
const GROUP_ORDER = [
  { id: 'propulsion', cat: 'propulsion', required: true },
  { id: 'propellant', cat: 'propellant', required: true, multiple: true },
  { id: 'power', cat: 'power', required: true },
  { id: 'communications', cat: 'communications', required: true },
  { id: 'life_support', cat: 'life_support', required: true },
  { id: 'landing', cat: 'science_and_edl', required: true },
  { id: 'shielding', cat: 'shielding', required: false },
];

/* Số bản tối đa cho nhóm cho phép lắp nhiều bản, ví dụ hai bình nhiên liệu. */
const MAX_UNITS = 3;

/* Bộ ba thiết kế mẫu, chỉ là danh sách id. Mọi con số vẫn tính từ JSON. */
const PRESETS = {
  light: {
    labelKey: 'rescue.preset.light',
    pick: {
      propulsion: 'prop_nuclear_ntp_900',
      propellant: 'tank_propellant_main',
      power: 'power_solar_rosa',
      communications: 'comms_high_gain',
      life_support: 'life_moxie_filter',
      landing: 'sensor_edl_suite',
      shielding: null,
    },
    qty: { propellant: 1 },
  },
  balanced: {
    labelKey: 'rescue.preset.balanced',
    pick: {
      propulsion: 'prop_nuclear_ntp_900',
      propellant: 'tank_propellant_main',
      power: 'power_solar_rosa',
      communications: 'comms_high_gain',
      life_support: 'life_eclss_recycler',
      landing: 'sensor_edl_suite',
      shielding: 'shield_radiation',
    },
    qty: { propellant: 1 },
  },
  heavy: {
    labelKey: 'rescue.preset.heavy',
    pick: {
      propulsion: 'prop_nuclear_ntp_900',
      propellant: 'tank_propellant_main',
      power: 'power_solar_rosa',
      communications: 'comms_high_gain',
      life_support: 'life_eclss_recycler',
      landing: 'sensor_edl_suite',
      shielding: 'shield_radiation',
    },
    qty: { propellant: 2 },
  },
};

const SHELL = `
  <div class="rescue-scrim"></div>

  <section class="rescue-panel" role="region" aria-labelledby="rescue-title">
    <header class="rescue-head">
      <div class="rescue-head-text">
        <p class="rescue-eyebrow" data-i18n="rescue.eyebrow"></p>
        <h2 class="rescue-title" id="rescue-title" data-i18n="rescue.title"></h2>
        <p class="rescue-sub" data-i18n="rescue.sub"></p>
      </div>
      <div class="rescue-head-actions">
        <div class="rescue-presets" role="group">
          <span class="rescue-presets-label" data-i18n="rescue.preset.label"></span>
          <button type="button" class="rescue-chip" data-preset="light"></button>
          <button type="button" class="rescue-chip" data-preset="balanced"></button>
          <button type="button" class="rescue-chip" data-preset="heavy"></button>
        </div>
        <button type="button" class="rescue-btn rescue-btn-ghost" data-action="clear">
          <span data-i18n="rescue.btn.clear"></span>
        </button>
      </div>
    </header>

    <div class="rescue-progress">
      <div class="rescue-progress-head">
        <span class="rescue-progress-label"></span>
        <span class="rescue-progress-count"></span>
      </div>
      <div class="rescue-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="rescue-progress-fill"></div>
      </div>
      <!-- Thông báo ngắn hiện đè lên dải tiến trình: đó là dải trạng
           thái duy nhất không chứa nội dung người chơi đang đọc, nên
           thông báo không bao giờ che chữ hay nút.
           The short notice covers the progress strip: that is the one
           status band with no content being read, so the notice never
           hides text or a button. -->
      <div class="rescue-toast" role="status" aria-live="polite" hidden></div>
    </div>

    <div class="rescue-cols">
      <section class="rescue-left" aria-labelledby="rescue-modules-h">
        <h3 class="rescue-col-h" id="rescue-modules-h" data-i18n="rescue.col.modules"></h3>
        <div class="rescue-groups"></div>
      </section>

      <aside class="rescue-right" aria-labelledby="rescue-summary-h">
        <div class="rescue-right-body">
        <h3 class="rescue-col-h" id="rescue-summary-h" data-i18n="rescue.col.summary"></h3>

        <div class="rescue-launcher">
          <label class="rescue-launcher-label" for="rescue-launcher-select" data-i18n="rescue.launcher.label"></label>
          <select class="rescue-select" id="rescue-launcher-select"></select>
          <p class="rescue-launcher-note" data-i18n="rescue.launcher.note"></p>
        </div>

        <div class="rescue-bars"></div>
        <dl class="rescue-sums"></dl>

        <div class="rescue-validation" aria-live="polite"></div>
        </div>

        <div class="rescue-actions">
          <button type="button" class="rescue-btn rescue-btn-check" data-action="check">
            <span data-i18n="rescue.btn.check"></span>
          </button>
          <button type="button" class="rescue-btn rescue-btn-launch" data-action="launch" disabled>
            <span data-i18n="rescue.btn.launch"></span>
          </button>
        </div>
        <p class="rescue-hint"></p>
      </aside>
    </div>
  </section>

  <div class="rescue-modal" hidden>
    <div class="rescue-modal-backdrop" data-modal-close></div>
    <div class="rescue-modal-panel" role="dialog" aria-modal="true" aria-labelledby="rescue-modal-title">
      <header class="rescue-modal-head">
        <h3 class="rescue-modal-title" id="rescue-modal-title"></h3>
        <button type="button" class="rescue-modal-close" data-modal-close aria-label=""></button>
      </header>
      <div class="rescue-modal-body"></div>
      <footer class="rescue-modal-foot">
        <button type="button" class="rescue-btn rescue-btn-ghost" data-modal-close>
          <span data-i18n="rescue.info.close"></span>
        </button>
      </footer>
    </div>
  </div>

`;

/* ---------- tiện ích ---------- */

function tr(key, vars) {
  let s = t(key);
  if (vars) {
    for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  }
  return s;
}

function fmt(n, digits = 0) {
  if (!Number.isFinite(n)) return '0';
  const fixed = Number(n).toFixed(digits);
  const neg = fixed.startsWith('-');
  const body = neg ? fixed.slice(1) : fixed;
  const parts = body.split('.');
  const sep = getLang() === 'en' ? ',' : '.';
  const dec = getLang() === 'en' ? '.' : ',';
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (neg ? '-' : '') + parts.join(dec);
}

/* Chuỗi gốc trong JSON đã có cả _vi lẫn _en, đọc thẳng theo
   ngôn ngữ đang bật thay vì chép lại vào i18n. */
function pick(obj, field) {
  if (!obj) return '';
  const en = getLang() === 'en';
  return (en ? obj[field + '_en'] : obj[field + '_vi']) || obj[field + '_vi'] || obj[field + '_en'] || '';
}

const reduceMotionQuery = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

function motionOn() {
  return Boolean(getSettings().motion) && !reduceMotionQuery.matches;
}

function injectCss() {
  if (document.querySelector('link[data-rescue-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'css/rescue.css';
  link.dataset.rescueCss = '1';
  document.head.appendChild(link);
}

/* ============================================================
   ĐIỂM VÀO / ENTRY POINT
   ============================================================ */

export function startRescueDesigner({ container, onDone } = {}) {
  injectCss();

  const host = container || document.body;
  const root = document.createElement('div');
  root.className = 'rescue-root';
  root.innerHTML = SHELL;
  host.appendChild(root);

  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => Array.from(root.querySelectorAll(sel));

  let destroyed = false;
  let DATA = null;

  try {
    DATA = loadRescueData();
  } catch (err) {
    q('.rescue-groups').innerHTML = '<p class="rescue-fatal"></p>';
    q('.rescue-fatal').textContent = tr('rescue.err.load');
    // eslint-disable-next-line no-console
    console.error('[rescue] không nạp được dữ liệu', err);
    return { destroy() { root.remove(); } };
  }

  const moduleById = DATA.index.moduleById;
  const launchers = DATA.modules.reference_launchers.vehicles;
  const suppliesModule = moduleById[DATA.modules.module_index.supplies[0]] || null;
  const mission = DATA.mission;

  /* ---------- nhóm và lựa chọn ---------- */

  const groups = GROUP_ORDER.map((g) => {
    const ids = DATA.modules.module_index[g.cat] || [];
    return {
      ...g,
      nameKey: 'rescue.group.' + g.id,
      hintKey: 'rescue.groupHint.' + g.id,
      options: ids
        .map((id) => moduleById[id])
        .filter(Boolean)
        .sort((a, b) => a.cost_musd - b.cost_musd),
    };
  });

  const requiredGroups = groups.filter((g) => g.required);

  const st = {
    pick: {},
    qty: {},
    launcherId: launchers.some((v) => v.id === 'sls_block1') ? 'sls_block1' : launchers[launchers.length - 1].id,
    checked: false,
    result: null,
  };

  /* ---------- phần tử ---------- */

  const elGroups = q('.rescue-groups');
  const elBars = q('.rescue-bars');
  const elSums = q('.rescue-sums');
  const elVal = q('.rescue-validation');
  const elLaunch = q('[data-action="launch"]');
  const elCheck = q('[data-action="check"]');
  const elHint = q('.rescue-hint');
  const elProgressLabel = q('.rescue-progress-label');
  const elProgressCount = q('.rescue-progress-count');
  const elProgressTrack = q('.rescue-progress-track');
  const elProgressFill = q('.rescue-progress-fill');
  const elSelect = q('#rescue-launcher-select');
  const elModal = q('.rescue-modal');
  const elModalTitle = q('.rescue-modal-title');
  const elModalBody = q('.rescue-modal-body');
  const elToast = q('.rescue-toast');

  /* ============================================================
     1. TÍNH TOÁN / DERIVED NUMBERS
     ============================================================ */

  function moduleIdsOf(pick, qty) {
    const ids = [];
    if (suppliesModule) ids.push(suppliesModule.id);
    for (const g of groups) {
      const id = pick[g.id];
      if (!id) continue;
      const n = g.multiple ? Math.min(MAX_UNITS, Math.max(1, (qty && qty[g.id]) || 1)) : 1;
      for (let i = 0; i < n; i += 1) ids.push(id);
    }
    return ids;
  }

  function currentLauncher() {
    return launchers.find((v) => v.id === st.launcherId) || null;
  }

  function engineOf(summary) {
    return summary.engines.length ? summary.engines[0] : null;
  }

  /* Số ngày cả hành trình cần, đọc từ JSON: hai chặng bay cộng thời
     gian chờ trên bề mặt. */
  function requiredDays() {
    const tr2 = mission && mission.transfer ? mission.transfer : null;
    if (!tr2) return 0;
    return tr2.flight_time_days * 2 + tr2.crew_surface_stay_days;
  }

  /* Khối lượng tiêu hao mỗi người mỗi ngày, suy ra từ chính khoang
     nhu yếu phẩm trong JSON, không viết lại bằng số. */
  function kgPerPersonDay() {
    if (!suppliesModule || !suppliesModule.days_covered || !suppliesModule.crew_count) return 0;
    return suppliesModule.mass_kg / (suppliesModule.days_covered * suppliesModule.crew_count);
  }

  function computeNumbers() {
    const ids = moduleIdsOf(st.pick, st.qty);
    const summary = summarizeModules(ids);
    const engine = engineOf(summary);
    const isp = engine ? engine.isp_s : 0;
    const launcher = currentLauncher();
    const dvAvailable = availableDeltaV_ms(summary, isp);
    const perDay = kgPerPersonDay();
    const suppliesMass = suppliesModule
      ? (summary.counts[suppliesModule.id] || 0) * suppliesModule.mass_kg
      : 0;
    const days = perDay > 0 ? suppliesMass / (perDay * CREW_COUNT) : 0;
    const fuelFraction = isp > 0 ? tsiolkovskyFuelFraction(REQUIRED_DELTA_V_MS, isp) : 0;

    return {
      ids,
      summary,
      engine,
      isp,
      launcher,
      dvAvailable,
      dvRequired: REQUIRED_DELTA_V_MS,
      fuelFraction,
      days,
      cost: summary.cost_musd,
      budget: BUDGET_MUSD,
      wetMass: summary.wetMass_kg,
      capacity: launcher ? launcher.capacity_leo_kg : 0,
      powerBalance: summary.power_balance_w,
    };
  }

  /* ============================================================
     2. DỰNG CỘT TRÁI / BUILD THE MODULE LIST
     ============================================================ */

  function optionCardHtml(group, mod) {
    const selected = st.pick[group.id] === mod.id;
    const power = mod.power_w;
    const powerText =
      power === 0
        ? tr('rescue.mod.powerNone')
        : (power > 0 ? '+' : '') + fmt(power) + ' W';
    const isp = mod.isp_s ? `<span class="rescue-mod-isp">Isp ${fmt(mod.isp_s)} s</span>` : '';
    return `
      <button type="button" class="rescue-mod${selected ? ' is-selected' : ''}"
              data-group="${group.id}" data-module-id="${mod.id}"
              aria-pressed="${selected ? 'true' : 'false'}">
        <span class="rescue-mod-mark" aria-hidden="true"></span>
        <span class="rescue-mod-body">
          <span class="rescue-mod-name">${escapeHtml(pick(mod, 'name'))}</span>
          <span class="rescue-mod-stats">
            <span class="rescue-mod-stat"><span class="rescue-mod-key">${tr('rescue.mod.mass')}</span> ${fmt(mod.mass_kg)} kg</span>
            <span class="rescue-mod-stat${power < 0 ? ' is-draw' : ''}"><span class="rescue-mod-key">${tr('rescue.mod.power')}</span> ${powerText}</span>
            <span class="rescue-mod-stat"><span class="rescue-mod-key">${tr('rescue.mod.cost')}</span> ${fmt(mod.cost_musd, 0)} M</span>
            ${isp}
          </span>
          <span class="rescue-mod-tradeoff">${escapeHtml(pick(mod, 'tradeoff'))}</span>
        </span>
      </button>`;
  }

  function groupHtml(group) {
    const picked = st.pick[group.id] || null;
    const isOptional = !group.required;
    const qty = Math.min(MAX_UNITS, Math.max(1, st.qty[group.id] || 1));
    const qtyHtml =
      group.multiple && picked
        ? `<div class="rescue-qty" data-qty-group="${group.id}">
             <span class="rescue-qty-label">${tr('rescue.qty.label')}</span>
             <button type="button" class="rescue-qty-btn" data-qty-step="-1"
                     aria-label="${tr('rescue.qty.dec')}">-</button>
             <span class="rescue-qty-value">${tr('rescue.qty.value', { n: fmt(qty) })}</span>
             <button type="button" class="rescue-qty-btn" data-qty-step="1"
                     aria-label="${tr('rescue.qty.inc')}">+</button>
           </div>`
        : '';

    const noneCard = isOptional
      ? `<button type="button" class="rescue-mod rescue-mod-none${picked ? '' : ' is-selected'}"
                 data-group="${group.id}" data-module-id=""
                 aria-pressed="${picked ? 'false' : 'true'}">
           <span class="rescue-mod-mark" aria-hidden="true"></span>
           <span class="rescue-mod-body">
             <span class="rescue-mod-name">${tr('rescue.opt.none')}</span>
             <span class="rescue-mod-tradeoff">${tr('rescue.groupHint.' + group.id + '.none')}</span>
           </span>
         </button>`
      : '';

    return `
      <section class="rescue-group${isOptional ? ' is-optional' : ''}" data-group-section="${group.id}">
        <header class="rescue-group-head">
          <div class="rescue-group-titles">
            <h4 class="rescue-group-name">${tr(group.nameKey)}</h4>
            <p class="rescue-group-hint">${tr(group.hintKey)}</p>
          </div>
          <button type="button" class="rescue-info" data-info="${group.id}"
                  aria-label="${tr('rescue.info.open')}">
            <span aria-hidden="true">i</span>
          </button>
        </header>
        <div class="rescue-opts" role="group" aria-label="${tr(group.nameKey)}">
          ${group.options.map((m) => optionCardHtml(group, m)).join('')}
          ${noneCard}
        </div>
        ${qtyHtml}
      </section>`;
  }

  function renderGroups() {
    elGroups.innerHTML = groups.map(groupHtml).join('');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Dòng "Nguồn" của mỗi module ghi tên tệp tài liệu trong repo
     (docs/11-NASA-RESOURCES.md). Bản deploy chỉ chứa phần chạy được của
     src/, không kèm docs/, nên nếu để nguyên văn thì giám khảo đọc thấy
     một đường dẫn mà bấm vào không mở được ở đâu cả. Đổi tên tệp thành
     liên kết thẳng tới tệp đó trên GitHub công khai. */
  const DOC_BASE = 'https://github.com/tranminhngoc171-bot/space-mission-design-game/blob/main/';
  function linkifySource(s) {
    return escapeHtml(s).replace(
      /(docs\/[0-9A-Za-z-]+\.md)/g,
      '<a class="rescue-src-link" href="' + DOC_BASE + '$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  /* ============================================================
     3. CỘT PHẢI / SUMMARY, BARS, ACTIONS
     ============================================================ */

  function barHtml(id, label, used, max, opts = {}) {
    const over = opts.over != null ? opts.over : used - max;
    const ratio = max > 0 ? Math.min(1, Math.max(0, used / max)) : 0;
    const isOver = over > 1e-9;
    const near = !isOver && max > 0 && ratio >= 0.92;
    const cls = isOver ? ' is-over' : near ? ' is-near' : '';
    const note = isOver
      ? opts.overText || tr('rescue.bar.over', { n: opts.overFmt || fmt(over) })
      : opts.okText || tr('rescue.bar.ok');
    return `
      <div class="rescue-bar${cls}" data-bar="${id}">
        <div class="rescue-bar-head">
          <span class="rescue-bar-label">${label}</span>
          <span class="rescue-bar-value">${opts.valueText || ''}</span>
        </div>
        <div class="rescue-bar-track">
          <div class="rescue-bar-fill" style="width:${(ratio * 100).toFixed(1)}%"></div>
          <span class="rescue-bar-limit" aria-hidden="true"></span>
        </div>
        <p class="rescue-bar-note">${note}</p>
      </div>`;
  }

  function renderBars(n) {
    const budgetOver = n.cost - n.budget;
    const massOver = n.wetMass - n.capacity;
    const dvShort = n.dvRequired - n.dvAvailable;
    const dvRatioRaw = n.dvRequired > 0 ? n.dvAvailable / n.dvRequired : 0;
    const dvRatio = Math.min(1, dvRatioRaw);

    const budget = barHtml(
      'budget',
      tr('rescue.bar.budget'),
      n.cost,
      n.budget,
      {
        valueText: tr('rescue.bar.of', { used: fmt(n.cost, 0), max: fmt(n.budget, 0), unit: t('rescue.unit.musd') }),
        overText: tr('rescue.bar.overBudget', { n: fmt(budgetOver, 0) }),
      }
    );

    const payload = barHtml(
      'payload',
      tr('rescue.bar.payload') + (n.launcher ? ' · ' + n.launcher.name_en : ''),
      n.wetMass,
      n.capacity,
      {
        valueText: tr('rescue.bar.of', { used: fmt(n.wetMass, 0), max: fmt(n.capacity, 0), unit: t('rescue.unit.kg') }),
        overText: tr('rescue.bar.overPayload', { n: fmt(massOver, 0) }),
      }
    );

    /* Delta-v không có thanh "vượt", nó chỉ có thể thiếu. */
    /* Thanh delta-v đầy 100 phần trăm nghĩa là vừa đủ. Dư nhiều thì
       đổi sang màu cyan để "vừa đủ" (xanh lá) và "dư" (cyan) không
       trông giống nhau.
       A full delta-v bar means exactly enough. A large surplus turns
       the fill cyan so "just enough" and "plenty spare" never look
       the same. */
    const dvCls = dvShort > 1e-9 ? ' is-over' : dvRatioRaw < 1.05 ? ' is-near' : ' is-spare';
    const dvNote = dvShort > 1e-9
      ? tr('rescue.bar.shortDv', { n: fmt(dvShort, 0) })
      : dvRatioRaw < 1.05
        ? tr('rescue.bar.thinDv', { n: fmt(n.dvAvailable - n.dvRequired, 0) })
        : tr('rescue.bar.spareDv', { n: fmt(n.dvAvailable - n.dvRequired, 0) });

    const dv = `
      <div class="rescue-bar${dvCls}" data-bar="deltav">
        <div class="rescue-bar-head">
          <span class="rescue-bar-label">${tr('rescue.bar.deltaV')}</span>
          <span class="rescue-bar-value">${fmt(n.dvAvailable, 0)} / ${fmt(n.dvRequired, 0)} ${t('rescue.unit.ms')}</span>
        </div>
        <div class="rescue-bar-track">
          <div class="rescue-bar-fill" style="width:${(dvRatio * 100).toFixed(1)}%"></div>
          <span class="rescue-bar-limit" aria-hidden="true"></span>
        </div>
        <p class="rescue-bar-note">${dvNote}</p>
      </div>`;

    elBars.innerHTML = budget + payload + dv;
  }

  function renderSums(n) {
    const rows = [
      ['rescue.sum.dry', fmt(n.summary.dryMass_kg, 0) + ' ' + t('rescue.unit.kg')],
      ['rescue.sum.fuel', fmt(n.summary.propellant_kg, 0) + ' ' + t('rescue.unit.kg')],
      ['rescue.sum.wet', fmt(n.wetMass, 0) + ' ' + t('rescue.unit.kg')],
      ['rescue.sum.power', fmt(n.summary.power_gen_w, 0) + ' / ' + fmt(-n.summary.power_draw_w, 0) + ' ' + t('rescue.unit.w')],
      ['rescue.sum.balance', (n.powerBalance >= 0 ? '+' : '') + fmt(n.powerBalance, 0) + ' ' + t('rescue.unit.w')],
      ['rescue.sum.cost', fmt(n.cost, 0) + ' ' + t('rescue.unit.musd')],
      ['rescue.sum.isp', n.isp ? fmt(n.isp, 0) + ' s' : t('rescue.sum.none')],
      ['rescue.sum.fuelFraction', n.isp ? fmt(n.fuelFraction, 1) + ' %' : t('rescue.sum.none')],
      ['rescue.sum.days', fmt(n.days, 0) + ' / ' + fmt(requiredDays(), 0) + ' ' + t('rescue.unit.days')],
      ['rescue.sum.crew', fmt(CREW_COUNT, 0)],
    ];

    elSums.innerHTML = rows
      .map(([k, v]) => {
        let cls = '';
        if (k === 'rescue.sum.balance' && n.powerBalance < 0) cls = ' class="is-bad"';
        if (k === 'rescue.sum.days' && n.days + 1e-9 < requiredDays()) cls = ' class="is-bad"';
        return `<div class="rescue-sum-row"${cls}>
          <dt>${t(k)}</dt><dd>${v}</dd>
        </div>`;
      })
      .join('');
  }

  function renderProgress() {
    const done = requiredGroups.filter((g) => Boolean(st.pick[g.id])).length;
    const total = requiredGroups.length;
    const pct = total > 0 ? (done / total) * 100 : 0;
    elProgressLabel.textContent = t('rescue.progress.label');
    elProgressCount.textContent = tr('rescue.progress.count', { n: fmt(done), m: fmt(total) });
    elProgressTrack.setAttribute('aria-valuenow', String(Math.round(pct)));
    elProgressTrack.setAttribute('aria-valuetext', tr('rescue.progress.count', { n: fmt(done), m: fmt(total) }));
    elProgressFill.style.width = pct.toFixed(1) + '%';
    elProgressTrack.classList.toggle('is-full', done === total);
  }

  function renderHint() {
    const n = computeNumbers();
    let key = 'rescue.hint.pick';
    if (st.checked && st.result && st.result.pass) key = 'rescue.hint.ready';
    else if (st.checked && st.result && !st.result.pass) key = 'rescue.hint.blocked';
    else if (!st.pick.propulsion) key = 'rescue.hint.noEngine';
    else if (!st.pick.propellant) key = 'rescue.hint.noTank';
    elHint.textContent = n.summary.engines.length === 0 ? t('rescue.hint.noEngine') : t(key);
  }

  /* Toàn bộ cột phải, gọi sau mỗi lần đổi lựa chọn. */
  function refresh() {
    const n = computeNumbers();
    renderBars(n);
    renderSums(n);
    renderProgress();
    renderHint();
    elLaunch.disabled = !(st.checked && st.result && st.result.pass);
    elLaunch.classList.toggle('is-ready', !elLaunch.disabled);
  }

  /* ============================================================
     4. KIỂM TRA THIẾT KẾ / VALIDATION OUTPUT
     ============================================================ */

  function designOf() {
    const n = computeNumbers();
    return {
      moduleIds: n.ids,
      launcherId: st.launcherId,
      isp_s: n.isp || undefined,
      crewCount: CREW_COUNT,
    };
  }

  function msgLine(item, kind) {
    const text = getLang() === 'en' ? item.en : item.vi;
    const fix = tr('rescue.fix.' + item.code);
    return `
      <li class="rescue-val-item is-${kind}">
        <span class="rescue-val-badge">${kind === 'fail' ? t('rescue.val.err') : t('rescue.val.warn')}</span>
        <span class="rescue-val-text">${escapeHtml(text)}</span>
        <span class="rescue-val-fix">${escapeHtml(fix)}</span>
      </li>`;
  }

  function renderValidation() {
    if (!st.checked || !st.result) {
      elVal.innerHTML = `<p class="rescue-val-idle">${t('rescue.val.idle')}</p>`;
      return;
    }
    const r = st.result;
    const head = r.pass
      ? `<p class="rescue-val-head is-pass">${t('rescue.val.pass')}</p>`
      : `<p class="rescue-val-head is-fail">${tr('rescue.val.fail', { n: fmt(r.failures.length) })}</p>`;

    const fails = r.failures.length
      ? `<ul class="rescue-val-list">${r.failures.map((f) => msgLine(f, 'fail')).join('')}</ul>`
      : '';
    const warns = r.warnings.length
      ? `<p class="rescue-val-sub">${tr('rescue.val.warningsN', { n: fmt(r.warnings.length) })}</p>
         <ul class="rescue-val-list">${r.warnings.map((w) => msgLine(w, 'warn')).join('')}</ul>`
      : '';
    elVal.innerHTML = head + fails + warns;
  }

  /* validateRescueDesign không kiểm tra tiền: ngân sách là luật chơi
     của phần này chứ không phải số liệu NASA, nên phép kiểm tra ngân
     sách được ghép thêm ở đây. Nếu để nguyên thì một thiết kế 748
     triệu vẫn "đạt" và vẫn phóng được, trong khi thanh ngân sách đã
     đỏ, tức là hai chỗ nói hai chuyện khác nhau.
     validateRescueDesign does not check money: the budget is a rule of
     this screen, not NASA data, so the budget failure is appended here.
     Otherwise a 748 million design would "pass" with a red budget bar. */
  function withBudgetCheck(result, cost) {
    if (cost - BUDGET_MUSD <= 1e-9) return result;
    const over = Math.round(cost - BUDGET_MUSD);
    const failure = {
      code: 'over_budget',
      vi: 'Tổng giá ' + fmt(cost, 0) + ' triệu USD vượt ngân sách ' + fmt(BUDGET_MUSD, 0) +
        ' triệu USD, vượt ' + fmt(over, 0) + ' triệu USD.',
      en: 'Total cost of ' + fmt(cost, 0) + ' million USD exceeds the ' + fmt(BUDGET_MUSD, 0) +
        ' million USD budget by ' + fmt(over, 0) + ' million USD.',
      detail: { cost_musd: Math.round(cost), budget_musd: BUDGET_MUSD, over_musd: over },
    };
    const failures = result.failures.concat([failure]);
    return { ...result, pass: false, failures };
  }

  function runCheck() {
    const design = designOf();
    const n = computeNumbers();
    st.result = withBudgetCheck(validateRescueDesign(design), n.cost);
    st.checked = true;
    renderValidation();
    refresh();
    /* Cuộn khung phải để danh sách lỗi hiện ra ngay. Dùng scrollTop
       của chính khung cuộn thay vì scrollIntoView, vì scrollIntoView
       còn đẩy cả trang và trên màn hẹp sẽ nhảy lung tung.
       Scroll the right pane to the result using its own scrollTop.
       scrollIntoView would also move the page and jumps around on
       narrow screens. */
    const body = root.querySelector('.rescue-right-body');
    if (body && body.scrollHeight > body.clientHeight) {
      /* offsetTop không dùng được vì gốc toạ độ của nó là phần tử
         định vị gần nhất, không phải khung cuộn. Lấy hiệu hai hình
         chữ nhật là chắc chắn đúng.
         offsetTop is unreliable here because its origin is the nearest
         positioned ancestor, not the scroll pane. The difference of the
         two client rects is exact. */
      /* Gán thẳng scrollTop, không dùng cuộn mượt: kết quả kiểm tra
         là thông tin người chơi cần đọc ngay, và cuộn mượt còn phụ
         thuộc khung hình nên có trình duyệt bỏ qua.
         Set scrollTop directly instead of a smooth scroll: the check
         result is what the player needs to read right now, and smooth
         scrolling depends on animation frames some browsers skip. */
      const delta = elVal.getBoundingClientRect().top - body.getBoundingClientRect().top;
      body.scrollTop = Math.max(0, body.scrollTop + delta - 8);
    }
    return st.result;
  }

  /* ============================================================
     5. PANEL [i] NASA RESOURCE / INFO MODAL
     ============================================================ */

  function impactLines(groupId) {
    const n = computeNumbers();
    const out = [];

    if (groupId === 'propellant') {
      if (n.isp > 0 && n.summary.wetMass_kg > n.summary.dryMass_kg) {
        /* Thêm 500 kg lương thực: khối lượng khô và khối lượng ướt cùng
           tăng 500 kg, nên hiệu số ln(m0/mf) co lại. Con số dưới đây
           tính đúng phép trừ đó, không phải ước lượng. */
        const heavier = {
          wetMass_kg: n.summary.wetMass_kg + 500,
          dryMass_kg: n.summary.dryMass_kg + 500,
        };
        const dvAfter = availableDeltaV_ms(heavier, n.isp);
        const loss = n.dvAvailable - dvAfter;
        out.push(
          tr('rescue.info.impact.food500', {
            now: fmt(n.dvAvailable, 0),
            after: fmt(dvAfter, 0),
            loss: fmt(loss, 0),
          })
        );
        out.push(
          tr('rescue.info.impact.ratio', {
            ratio: fmt(n.summary.wetMass_kg / n.summary.dryMass_kg, 2),
            pct: fmt((1 - n.summary.dryMass_kg / n.summary.wetMass_kg) * 100, 1),
          })
        );
      } else {
        out.push(tr('rescue.info.impact.noEngine'));
      }
    }

    if (groupId === 'propulsion') {
      if (n.isp > 0) {
        out.push(
          tr('rescue.info.impact.fraction', {
            isp: fmt(n.isp, 0),
            pct: fmt(n.fuelFraction, 1),
          })
        );
      }
      const engines = n.summary.engines;
      if (engines.length > 1) out.push(tr('rescue.info.impact.multiEngine', { n: fmt(engines.length) }));
    }

    if (groupId === 'power') {
      out.push(
        tr('rescue.info.impact.power', {
          gen: fmt(n.summary.power_gen_w, 0),
          draw: fmt(n.summary.power_draw_w, 0),
          bal: fmt(n.powerBalance, 0),
        })
      );
      if (n.powerBalance < 0) out.push(tr('rescue.info.impact.powerShort', { n: fmt(-n.powerBalance, 0) }));
    }

    if (groupId === 'life_support') {
      out.push(tr('rescue.info.impact.days', { days: fmt(n.days, 0), crew: fmt(CREW_COUNT) }));
      if (st.pick.life_support === 'life_moxie_filter') {
        out.push(tr('rescue.info.impact.moxie', { n: fmt(n.summary.power_draw_w, 0) }));
      }
      if (st.pick.life_support === 'life_eclss_recycler') {
        out.push(tr('rescue.info.impact.eclss'));
      }
    }

    if (groupId === 'communications') {
      const table = (mission && mission.signal_delay_table) || [];
      const far = table.reduce((a, r) => (!a || r.one_way_minutes > a.one_way_minutes ? r : a), null);
      if (far) {
        out.push(
          tr('rescue.info.impact.delay', {
            near: fmt(table[0].one_way_minutes, 1),
            far: fmt(far.one_way_minutes, 1),
          })
        );
      }
    }

    if (groupId === 'landing') {
      out.push(
        tr('rescue.info.impact.landing', {
          pct: fmt(n.wetMass > 0 ? (140 / n.wetMass) * 100 : 0, 2),
        })
      );
    }

    if (groupId === 'shielding') {
      out.push(tr('rescue.info.impact.shield'));
    }

    return out;
  }

  function openInfo(groupId) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const chosenId = st.pick[groupId];
    const mod = chosenId ? moduleById[chosenId] : null;

    elModalTitle.textContent = tr('rescue.info.title', { group: tr(group.nameKey) });

    const modBlock = mod
      ? `<div class="rescue-info-mod">
           <h4>${escapeHtml(pick(mod, 'name'))}</h4>
           <p class="rescue-info-label">${t('rescue.info.tradeoff')}</p>
           <p class="rescue-info-tradeoff">${escapeHtml(pick(mod, 'tradeoff'))}</p>
           <p class="rescue-info-source"><span class="rescue-info-key">${t('rescue.info.source')}:</span> ${linkifySource(mod.source || '')}</p>
         </div>`
      : `<div class="rescue-info-mod">
           <h4>${tr('rescue.opt.none')}</h4>
           <p class="rescue-info-tradeoff">${tr('rescue.groupHint.' + group.id + '.none')}</p>
         </div>`;

    const impacts = impactLines(groupId);

    elModalBody.innerHTML = `
      <p class="rescue-info-lead">${escapeHtml(tr(group.hintKey))}</p>
      ${modBlock}
      <div class="rescue-info-impact">
        <p class="rescue-info-label">${t('rescue.info.impact')}</p>
        ${impacts.map((line) => `<p class="rescue-info-line">${escapeHtml(line)}</p>`).join('')}
      </div>`;

    elModal.hidden = false;
    root.classList.add('is-modal');
    const closeBtn = elModal.querySelector('.rescue-modal-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeInfo() {
    elModal.hidden = true;
    root.classList.remove('is-modal');
  }

  /* ---------- toast ---------- */

  let toastTimer = 0;
  function toast(text) {
    elToast.textContent = text;
    elToast.hidden = false;
    elToast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elToast.classList.remove('is-on');
      toastTimer = setTimeout(() => { elToast.hidden = true; }, 220);
    }, 2400);
  }

  /* ============================================================
     6. HÀNH ĐỘNG CỦA NGƯỜI CHƠI / USER ACTIONS
     ============================================================ */

  function invalidate() {
    st.checked = false;
    st.result = null;
    renderValidation();
  }

  function selectModule(groupId, moduleId) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    if (!moduleId) {
      delete st.pick[groupId];
      delete st.qty[groupId];
    } else if (st.pick[groupId] === moduleId) {
      /* Bấm lại đúng module đang chọn: nhóm bắt buộc thì giữ, nhóm
         tùy chọn thì bỏ chọn cho gọn. */
      if (!group.required) {
        delete st.pick[groupId];
      } else {
        return;
      }
    } else {
      st.pick[groupId] = moduleId;
      if (group.multiple && !st.qty[groupId]) st.qty[groupId] = 1;
    }

    invalidate();
    renderGroups();
    refresh();
  }

  function stepQty(groupId, step) {
    const cur = st.qty[groupId] || 1;
    const next = Math.min(MAX_UNITS, Math.max(1, cur + step));
    if (next === cur) return;
    st.qty[groupId] = next;
    invalidate();
    renderGroups();
    refresh();
  }

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    st.pick = {};
    st.qty = {};
    for (const g of groups) {
      const id = p.pick[g.id];
      if (id) st.pick[g.id] = id;
    }
    for (const k of Object.keys(p.qty || {})) st.qty[k] = p.qty[k];
    invalidate();
    renderGroups();
    refresh();
    toast(tr('rescue.toast.preset', { name: t(p.labelKey) }));
  }

  function clearAll() {
    st.pick = {};
    st.qty = {};
    invalidate();
    renderGroups();
    refresh();
    toast(t('rescue.toast.cleared'));
  }

  function launch() {
    if (elLaunch.disabled) return;
    const design = designOf();
    const n = computeNumbers();
    const payload = {
      ...design,
      summary: n.summary,
      deltaV_ms: Math.round(n.dvAvailable),
      launcherId: st.launcherId,
      crewCount: CREW_COUNT,
    };
    if (typeof onDone === 'function') onDone(payload);
  }

  /* ---------- launcher ---------- */

  function fillLauncherSelect() {
    elSelect.innerHTML = launchers
      .map(
        (v) =>
          `<option value="${escapeHtml(v.id)}"${v.id === st.launcherId ? ' selected' : ''}>` +
          `${escapeHtml(v.name_en)} · ${fmt(v.capacity_leo_kg, 0)} kg</option>`
      )
      .join('');
  }

  /* ============================================================
     7. GẮN SỰ KIỆN / BIND
     ============================================================ */

  root.addEventListener('click', (ev) => {
    const presetBtn = ev.target.closest('[data-preset]');
    if (presetBtn) {
      applyPreset(presetBtn.getAttribute('data-preset'));
      return;
    }

    const infoBtn = ev.target.closest('[data-info]');
    if (infoBtn) {
      openInfo(infoBtn.getAttribute('data-info'));
      return;
    }

    const stepBtn = ev.target.closest('[data-qty-step]');
    if (stepBtn) {
      const holder = stepBtn.closest('[data-qty-group]');
      if (holder) stepQty(holder.getAttribute('data-qty-group'), Number(stepBtn.getAttribute('data-qty-step')));
      return;
    }

    const modBtn = ev.target.closest('[data-module-id]');
    if (modBtn) {
      selectModule(modBtn.getAttribute('data-group'), modBtn.getAttribute('data-module-id') || '');
      return;
    }

    const act = ev.target.closest('[data-action]');
    if (act) {
      const a = act.getAttribute('data-action');
      if (a === 'check') runCheck();
      else if (a === 'launch') launch();
      else if (a === 'clear') clearAll();
      return;
    }

    if (ev.target.closest('[data-modal-close]')) closeInfo();
  });

  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !elModal.hidden) {
      closeInfo();
      ev.stopPropagation();
    }
  });

  elSelect.addEventListener('change', () => {
    st.launcherId = elSelect.value;
    invalidate();
    refresh();
  });

  const offLang = onLangChange(() => {
    applyStaticText();
    renderGroups();
    renderValidation();
    refresh();
  });

  /* ============================================================
     8. KHỞI ĐỘNG / BOOT
     ============================================================ */

  function applyStaticText() {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val) el.textContent = val;
    });
    qa('[data-preset]').forEach((b) => {
      const p = PRESETS[b.getAttribute('data-preset')];
      if (p) b.textContent = t(p.labelKey);
    });
    const closeBtn = elModal.querySelector('.rescue-modal-close');
    if (closeBtn) {
      closeBtn.textContent = '\u00d7';
      closeBtn.setAttribute('aria-label', t('rescue.info.close'));
    }
  }

  applyStaticText();
  fillLauncherSelect();
  renderGroups();
  renderValidation();
  refresh();

  return {
    destroy() {
      destroyed = true;
      offLang();
      clearTimeout(toastTimer);
      root.remove();
    },
    /* Dùng cho trang kiểm thử và cho màn sau đọc lại trạng thái. */
    getDesign: designOf,
    getNumbers: computeNumbers,
    check: runCheck,
    select: selectModule,
    preset: applyPreset,
  };
}
