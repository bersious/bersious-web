/* ============================================================
   phase2/feature-assembly-ui.js
   Lớp phủ nâng cấp cho màn xưởng lắp ráp.
   Overlay upgrade for the assembly workshop screen.

   Đây là lớp PHỦ THÊM, không vẽ lại màn xưởng. Nó đọc state từ
   engine rồi vẽ chồng lên: sáu nút chỉ dẫn kỹ thuật quanh con
   tàu, bảng thông tin tổng, đồng hồ đếm ngược sinh tồn và nút
   NEXT.
   This is an ADDITIVE layer, it does not redraw the workshop. It
   reads engine state and paints on top: six engineering callout
   nodes around the ship, the spacecraft summary panel, the crew
   survival countdown and the NEXT button.

   QUY TẮC / RULES
   - Không sửa feature-cml3-tradespace.js. Chỉ đọc DOM của nó để
     biết con tàu đang ở đâu.
     Never touch feature-cml3-tradespace.js. Only read its DOM to
     find where the ship currently sits.
   - Song ngữ VI + EN, không dấu gạch dài.
     Bilingual VI + EN, no em dashes.
   - Màu lấy từ ../src/css/tokens.css qua css-assembly-ui.css.
     Colors come from tokens through css-assembly-ui.css.
   ============================================================ */

import { getLang, onLangChange } from '../src/i18n.js';

const BASE = new URL('.', import.meta.url).href;
const CSS_URL = new URL('css-assembly-ui.css', import.meta.url).href;
const CSS_ID = 'asm-ui-css';

/* ============================================================
   1. CHUỖI HIỂN THỊ / STRINGS
   Mỗi chuỗi giữ riêng trong file này, không sửa ../src/i18n.js vì
   các mô đun khác đang chạy song song trên cùng cây tệp.
   Every string lives here. src/i18n.js is off limits: sibling
   modules are editing it at the same time.
   ============================================================ */

const STR = {
  vi: {
    /* sáu nhóm kỹ thuật */
    gLauncher: 'Động cơ',
    gPropellant: 'Nhiên liệu',
    gSpacecraft: 'Phi thuyền',
    gComms: 'Liên lạc',
    gSupplies: 'Gói cứu hộ',
    gTrajectory: 'Quỹ đạo bay',

    calloutHint: 'Mở nhóm {name}',

    summaryTitle: 'Thông tin tổng của tàu',
    summaryNasa: 'Spacecraft summary',
    rowMass: 'Tổng khối lượng',
    rowTime: 'Thời gian bay',
    rowBudget: 'Ngân sách còn lại',
    rowDeltaV: 'Delta-v khả dụng',

    unitKg: 'kg',
    unitDays: 'ngày',
    unitMusd: 'triệu USD',
    unitMs: 'm/s',

    lateMsg: 'Tàu tới muộn hơn {n} ngày. Đồng đội sẽ không chờ được.',
    inTimeMsg: 'Tới kịp, còn dư {n} ngày.',

    crewTop: 'Đồng đội trên Sao Hỏa',
    crewSols: '{n} SOL',
    crewBar: 'Thời gian đồng đội còn trụ được, đã dùng {p} phần trăm',

    next: 'Tiếp theo',
    nextHint: 'Sang bước kiểm duyệt và phóng',
    nextDisabled: 'Còn mục chưa xong',
  },
  en: {
    gLauncher: 'Engine',
    gPropellant: 'Propellant',
    gSpacecraft: 'Spacecraft',
    gComms: 'Comms',
    gSupplies: 'Survival kit',
    gTrajectory: 'Trajectory',

    calloutHint: 'Open the {name} group',

    summaryTitle: 'Spacecraft summary',
    summaryNasa: 'Spacecraft summary',
    rowMass: 'Total mass',
    rowTime: 'Flight time',
    rowBudget: 'Budget remaining',
    rowDeltaV: 'Delta-v available',

    unitKg: 'kg',
    unitDays: 'days',
    unitMusd: 'million USD',
    unitMs: 'm/s',

    lateMsg: 'The ship arrives {n} days late. The crew cannot hold out that long.',
    inTimeMsg: 'Arrives in time, {n} days to spare.',

    crewTop: 'Crew on Mars',
    crewSols: '{n} SOL',
    crewBar: 'Crew survival clock, {p} percent spent',

    next: 'Next',
    nextHint: 'Go to the review and launch step',
    nextDisabled: 'Items still open',
  },
};

function T(key, vars) {
  const table = STR[getLang()] || STR.vi;
  let s = table[key] != null ? table[key] : STR.vi[key];
  if (s == null) return key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.split('{' + k + '}').join(String(vars[k]));
    }
  }
  return s;
}

/* Số kiểu Việt Nam: chấm ngăn nghìn, phẩy thập phân. */
function fmt(value, digits) {
  if (!Number.isFinite(value)) return '0';
  const d = digits == null ? 0 : digits;
  const en = getLang() === 'en';
  const fixed = Math.abs(value).toFixed(d);
  const parts = fixed.split('.');
  const head = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, en ? ',' : '.');
  const tail = d > 0 && parts[1] ? (en ? '.' : ',') + parts[1] : '';
  return (value < 0 ? '-' : '') + head + tail;
}

/* ============================================================
   2. SÁU NHÓM CHỈ DẪN
   Thứ tự trong mảng là thứ tự cắm vào DOM. Trường side và slot quyết
   định nút nằm cột trái hay phải, ở độ cao nào; trường target là điểm
   trên thân tàu mà đường gấp khúc chỉ tới, tính theo tỉ lệ của hộp
   bao quanh con tàu.
   The array order is the DOM order. side and slot pick the column and
   the height, target is the point on the hull the leader line points
   at, as a fraction of the ship bounding box.
   ============================================================ */

const CALLOUTS = [
  { group: 'comms',      side: 'left',  pct: 22, target: [0.50, 0.07], icon: 'dish' },
  { group: 'spacecraft', side: 'left',  pct: 50, target: [0.36, 0.44], icon: 'capsule' },
  { group: 'launcher',   side: 'left',  pct: 78, target: [0.40, 0.92], icon: 'engine' },
  { group: 'trajectory', side: 'right', pct: 22, target: [0.68, 0.20], icon: 'orbit' },
  { group: 'supplies',   side: 'right', pct: 50, target: [0.70, 0.52], icon: 'kit' },
  { group: 'propellant', side: 'right', pct: 78, target: [0.66, 0.80], icon: 'tank' },
];

/* Nhóm nào của engine quyết định chấm trạng thái của nút.
   Which engine selection field decides the status dot. */
const GROUP_FIELDS = {
  launcher: ['launcher'],
  propellant: ['propellant'],
  spacecraft: ['propulsion'],
  comms: ['comms'],
  supplies: ['supplies'],
  trajectory: ['objective'],
};

/* Icon vẽ nét mảnh 2px, màu currentColor. */
const ICONS = {
  engine:
    '<path d="M7 4h10l-1.6 6.4A3 3 0 0 1 12.5 13h-1A3 3 0 0 1 8.6 10.4Z"/>' +
    '<path d="M9.4 13 8 20M14.6 13 16 20"/>',
  tank:
    '<rect x="6.5" y="4.5" width="11" height="15" rx="3.2"/>' +
    '<path d="M6.5 9.5h11M6.5 14.5h11"/>',
  capsule:
    '<path d="M12 3.6c3.3 2 5 5.4 5 9.1v5.6a1.7 1.7 0 0 1-1.7 1.7H8.7A1.7 1.7 0 0 1 7 18.3v-5.6c0-3.7 1.7-7.1 5-9.1Z"/>' +
    '<circle cx="12" cy="11" r="1.9"/>',
  dish:
    '<path d="M4.6 13.4a8 8 0 0 1 8-8"/>' +
    '<path d="M4.6 13.4 17 9.2 12.8 21.6"/>' +
    '<path d="M6.8 11.2 14.4 15"/>',
  kit:
    '<rect x="3.8" y="7.6" width="16.4" height="11.4" rx="2"/>' +
    '<path d="M9 7.6V6a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 6v1.6"/>' +
    '<path d="M12 10.8v5M9.5 13.3h5"/>',
  orbit:
    '<ellipse cx="12" cy="12" rx="8.4" ry="4.2" transform="rotate(-28 12 12)"/>' +
    '<circle cx="17.4" cy="7.6" r="1.9"/>',
};

const AVATAR_SVG =
  '<svg class="asm-avatar" viewBox="0 0 40 40" aria-hidden="true" fill="none" ' +
  'stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="20" cy="20" r="17.4"/>' +
  '<path d="M13 17.4c0-4.2 3.1-7.1 7-7.1s7 2.9 7 7.1v3.4c0 1.2-.7 2-1.9 2h-10.2c-1.2 0-1.9-.8-1.9-2Z"/>' +
  '<path d="M16.6 16.6h1.5M21.9 16.6h1.5"/>' +
  '<path d="M15.6 22.8c1.1 1.1 2.7 1.8 4.4 1.8s3.3-.7 4.4-1.8"/>' +
  '<path d="M20 10.3v-2M11.6 20.8v2.4c0 1.6 1.3 2.9 2.9 2.9h1"/>' +
  '</svg>';

const WARN_SVG =
  '<svg class="asm-survive-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M12 4 3.4 19.2h17.2Z"/><path d="M12 9.6v4.2M12 16.6v.1"/></svg>';

const OK_SVG =
  '<svg class="asm-survive-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M4.6 12.6 9.4 17.4 19.4 7"/></svg>';

const NEXT_ARROW =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
  'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></svg>';

/* ============================================================
   3. TIỆN ÍCH
   ============================================================ */

const SVGNS = 'http://www.w3.org/2000/svg';

let mounted = null;   // tay cầm của lần mount gần nhất, cho setNextEnabled

function injectCss() {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.id = CSS_ID;
  link.rel = 'stylesheet';
  link.href = CSS_URL;
  document.head.appendChild(link);
}

function motionOff() {
  if (typeof document === 'undefined') return true;
  if (document.documentElement.classList.contains('motion-off')) return true;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }
  return false;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** Đọc state an toàn: engine hỏng thì trả null chứ không ném.
 *  Safe state read: a broken engine returns null instead of throwing. */
function readState(engine) {
  if (!engine || typeof engine.getState !== 'function') return null;
  try {
    const s = engine.getState();
    return s && typeof s === 'object' ? s : null;
  } catch (err) {
    return null;
  }
}

/* ============================================================
   4. ĐIỂM VÀO / ENTRY POINT
   ============================================================ */

/**
 * Gắn lớp phủ lên màn xưởng lắp ráp.
 * Mount the overlay on top of the assembly screen.
 *
 * @param {{container: Element, engine: object,
 *          onOpenGroup?: (group: string) => void}} opts
 * @returns {{root: HTMLElement, refresh: Function,
 *            destroy: Function, setNextEnabled: Function}}
 */
export function mountAssemblyUi({ container, engine, onOpenGroup } = {}) {
  injectCss();

  const host = container || document.body;

  /* Lớp phủ bám theo khung chứa. Khung chứa phải là gốc định vị,
     nếu không lớp phủ sẽ trôi lên tận phần tử cha gần nhất có
     position. Chỉ đặt khi khung chưa tự định vị.
     The overlay is positioned against its container, so the
     container has to be the containing block. Only touch it when it
     does not position itself already. */
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    const pos = window.getComputedStyle(host).position;
    if (pos === 'static') host.style.position = 'relative';
  }

  const root = document.createElement('div');
  root.className = 'asm-ui';
  root.setAttribute('data-assembly-ui', '');
  root.innerHTML = SHELL;
  host.appendChild(root);

  const q = (s) => root.querySelector(s);
  const qa = (s) => Array.from(root.querySelectorAll(s));

  const svg = q('.asm-leader');
  const summary = q('.asm-summary');
  const survBox = q('.asm-survive');
  const survText = q('.asm-survive p');
  const survMark = q('.asm-survive-mark');
  const crewSols = q('.asm-crew-sols');
  const crewBarFill = q('.asm-crew-bar i');
  const crewBox = q('.asm-crew');
  const nextBtn = q('.asm-next');

  /* --- dựng sáu nút chỉ dẫn một lần, sau đó chỉ cập nhật --- */

  const nodes = CALLOUTS.map((cfg, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'asm-callout is-' + cfg.side;
    wrap.dataset.group = cfg.group;
    wrap.dataset.index = String(index);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'asm-node';
    btn.dataset.group = cfg.group;
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      ICONS[cfg.icon] +
      '</svg><i class="asm-dot" aria-hidden="true"></i>';

    const label = document.createElement('span');
    label.className = 'asm-label';

    wrap.appendChild(btn);
    wrap.appendChild(label);
    root.appendChild(wrap);

    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', '');
    svg.appendChild(path);
    const dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('r', '0');
    svg.appendChild(dot);

    return { cfg, wrap, btn, label, path, dot, done: null };
  });

  let destroyed = false;
  let raf = 0;
  const timers = [];
  const lastValues = {};
  let unsubState = null;
  let unsubLang = null;

  /* ---------- tra cứu phần tử con tàu ---------- */

  function findShip() {
    /* Con tàu do feature-cml3-tradespace.js vẽ. Chỉ đọc, không sửa.
       The ship belongs to feature-cml3-tradespace.js. Read only. */
    return (
      host.querySelector('.cml3-ship') ||
      document.querySelector('.cml3-ship') ||
      host.querySelector('.cml3-stage-canvas') ||
      null
    );
  }

  /* ---------- bố cục / layout ---------- */

  function layout() {
    raf = 0;
    if (destroyed) return;

    const R = root.getBoundingClientRect();
    if (!R.width || !R.height) return;

    const compact = R.width < 900;
    root.classList.toggle('is-compact', compact);

    const shipEl = findShip();
    let sx, sy, sw, sh;
    if (shipEl) {
      const S = shipEl.getBoundingClientRect();
      sx = S.left - R.left;
      sy = S.top - R.top;
      sw = S.width;
      sh = S.height;
    } else {
      /* Không có tàu thì lấy giữa khung, để nút vẫn đứng đúng chỗ. */
      sw = Math.min(R.width * 0.46, 420);
      sh = Math.min(R.height * 0.62, 460);
      sx = (R.width - sw) / 2;
      sy = (R.height - sh) / 2;
    }

    svg.setAttribute('viewBox', '0 0 ' + Math.round(R.width) + ' ' + Math.round(R.height));
    svg.setAttribute('width', String(Math.round(R.width)));
    svg.setAttribute('height', String(Math.round(R.height)));

    const NODE = 48;
    const GAP = 96;           /* khoảng hở giữa mép tàu và tâm nút */
    const EDGE = 8;           /* lề tối thiểu sát mép khung */
    /* Chỗ mà nhãn chữ chiếm bên ngoài nút. Cột trái đẩy nhãn sang trái,
       cột phải đẩy sang phải, nên khi canh nút phải trừ (hoặc cộng) đúng
       khoảng này, nếu không nhãn tràn ra ngoài sân khấu và đè lên cột
       thẻ linh kiện. Đo từ .asm-label: max-width 96px, gap 9px.
       The label sits outside the node, so the clamp has to reserve its
       width or the text spills over the parts column. */
    const LABEL_W = 96 + 9;
    const COL_W = NODE + LABEL_W;

    /* Cột nút phải nằm trong sân khấu vẽ tàu, không trôi ra đè lên
       cột thẻ linh kiện hay cột thanh đo của màn gốc.
       The node columns must stay inside the drawing canvas, never
       drifting over the parts cards or the gauge column. */
    const canvas = host.querySelector('.cml3-stage-canvas');
    let cx0 = EDGE;
    let cx1 = R.width - EDGE;
    let cy0 = EDGE;
    let cy1 = R.height - EDGE;
    if (canvas) {
      const C = canvas.getBoundingClientRect();
      cx0 = Math.max(cx0, C.left - R.left + 6);
      cx1 = Math.min(cx1, C.right - R.left - 6);
      /* Canh cả theo chiều dọc. Lớp phủ cao bằng cả màn (599), còn ô vẽ
         tàu chỉ chiếm phần giữa (395). Nếu chỉ canh ngang thì nút ở
         pct 22 bay lên tận phần tiêu đề, ra ngoài sân khấu. */
      cy0 = Math.max(cy0, C.top - R.top + NODE / 2 + 6);
      cy1 = Math.min(cy1, C.bottom - R.top - NODE / 2 - 6);
    }

    nodes.forEach((n, i) => {
      const cfg = n.cfg;
      let nodeCx;
      let nodeCy;

      if (compact) {
        /* Hai hàng ba nút ở đáy: hàng trên và hàng dưới. */
        const cols = 3;
        const row = i < cols ? 0 : 1;
        const col = i % cols;
        const cell = R.width / cols;
        nodeCx = cell * col + cell / 2;
        /* Hai hàng nằm trên nút NEXT, không đè lên nó. */
        nodeCy = R.height - (row === 0 ? 208 : 140);
        n.wrap.style.left = (nodeCx - NODE / 2) + 'px';
        n.wrap.style.right = 'auto';
        n.wrap.style.top = (nodeCy - NODE / 2) + 'px';
        n.wrap.style.transform = 'none';
      } else {
        /* Trải đều ba nút trong khoảng dọc đã canh, thay vì kẹp từng nút
           riêng lẻ. Kẹp riêng thì hai nút gần nhau dồn về cùng một mức
           và chồng lên nhau. */
        nodeCy = cy0 + (cy1 - cy0) * (cfg.pct / 100);
        if (cfg.side === 'left') {
          /* Nút nằm ngoài mép trái thân tàu, nhãn xa hơn về phía mép
             sân khấu. Neo bằng right để nút tự bám mép phải.
             The node sits left of the hull, the label further out.
             Cận dưới phải là cx0 + COL_W: cả cụm nút + nhãn rộng chừng
             ấy, neo bằng right nghĩa là mép trái cụm = nodeRight - COL_W. */
          const nodeRight = clamp(sx - GAP, cx0 + COL_W, cx1 - NODE);
          nodeCx = nodeRight - NODE / 2;
          n.wrap.style.right = (R.width - nodeRight) + 'px';
          n.wrap.style.left = 'auto';
        } else {
          /* Cận trên là cx1 - COL_W: mép phải cụm = nodeLeft + COL_W. */
          const nodeLeft = clamp(sx + sw + GAP - NODE, cx0, cx1 - COL_W);
          nodeCx = nodeLeft + NODE / 2;
          n.wrap.style.left = nodeLeft + 'px';
          n.wrap.style.right = 'auto';
        }
        /* Ghi bằng pi-xen theo toạ độ đã canh, không ghi lại phần trăm.
           Ghi phần trăm sau khi đã canh là vứt bỏ kết quả canh, và nút
           ở mốc 22 phần trăm lại bay lên phần tiêu đề. */
        n.wrap.style.top = nodeCy + 'px';
        n.wrap.style.transform = 'translateY(-50%)';
      }

      /* Điểm trên thân tàu mà đường chỉ tới. */
      const tx = sx + sw * cfg.target[0];
      const ty = sy + sh * cfg.target[1];

      /* Đường gấp khúc kiểu bản vẽ kỹ thuật: đi ngang trước rồi mới
         chéo tới thân tàu, không bao giờ là một đường thẳng.
         Engineering leader: a horizontal run first, then the diagonal
         to the hull. Never a plain straight line. */
      const startX = compact ? nodeCx : (cfg.side === 'left' ? nodeCx + NODE / 2 : nodeCx - NODE / 2);
      const startY = compact ? nodeCy - NODE / 2 : nodeCy;
      const dx = tx - startX;
      const elbowX = startX + Math.sign(dx || 1) * Math.min(Math.abs(dx) * 0.62, Math.abs(dx) - 14);

      n.path.setAttribute(
        'd',
        'M' + startX.toFixed(1) + ' ' + startY.toFixed(1) +
        'H' + elbowX.toFixed(1) +
        'L' + tx.toFixed(1) + ' ' + ty.toFixed(1)
      );
      n.dot.setAttribute('cx', tx.toFixed(1));
      n.dot.setAttribute('cy', ty.toFixed(1));
      n.dot.setAttribute('r', compact ? '0' : '2.4');
    });
  }

  function scheduleLayout() {
    if (destroyed) return;
    if (raf) return;
    raf = (typeof requestAnimationFrame === 'function')
      ? requestAnimationFrame(layout)
      : setTimeout(layout, 16);
  }

  /* ---------- số liệu / numbers ---------- */

  function flash(el) {
    if (destroyed || motionOff() || !el) return;
    el.classList.remove('is-flash');
    /* đọc lại kiểu để animation chạy lại từ đầu */
    void el.offsetWidth;
    el.classList.add('is-flash');
    timers.push(setTimeout(() => { if (!destroyed) el.classList.remove('is-flash'); }, 220));
  }

  function setValue(rowKey, el, text) {
    if (!el) return;
    const changed = lastValues[rowKey] !== text;
    if (el.textContent !== text) el.textContent = text;
    if (changed) {
      lastValues[rowKey] = text;
      flash(el);
    }
  }

  /* ---------- chấm trạng thái / status dots ---------- */

  function groupDone(state, group) {
    const sel = (state && state.selection) || null;
    if (!sel) return false;
    const fields = GROUP_FIELDS[group] || [group];
    return fields.every((f) => {
      const v = sel[f];
      return v != null && v !== '';
    });
  }

  function paintDots(state) {
    nodes.forEach((n) => {
      const done = groupDone(state, n.cfg.group);
      if (n.done === done) return;
      n.done = done;
      n.btn.querySelector('.asm-dot').classList.toggle('is-done', done);
      n.btn.setAttribute('aria-pressed', done ? 'true' : 'false');
    });
  }

  /* ---------- bảng thông tin tổng ---------- */

  function paintSummary(state) {
    const totals = (state && state.totals) || {};
    const mass = Number(totals.massKg) || 0;
    const days = Number(totals.daysToArrival) || 0;
    const cost = Number(totals.costMusd) || 0;
    const dv = Number(totals.deltaVAvailableMs) || 0;
    const dvNeed = Number(totals.deltaVNeededMs) || 6650;

    setValue('mass', q('[data-v="mass"]'), fmt(mass, 0) + ' ' + T('unitKg'));
    setValue('days', q('[data-v="days"]'), fmt(days, 1) + ' ' + T('unitDays'));
    setValue('cost', q('[data-v="cost"]'), fmt(cost, 0) + ' ' + T('unitMusd'));
    setValue('dv', q('[data-v="dv"]'), fmt(dv, 0) + ' / ' + fmt(dvNeed, 0) + ' ' + T('unitMs'));

    /* Dòng cảnh báo sinh tồn: so thời gian bay với số sol đồng đội
       còn sống được.
       Survival line: flight time against the crew survival clock. */
    const sols = Number(state && state.solsRemaining);
    const late = Number.isFinite(sols) && days > sols;
    const diff = late ? days - sols : sols - days;

    if (survBox) {
      survBox.classList.toggle('is-late', late);
      survBox.setAttribute('data-late', late ? 'true' : 'false');
      if (survMark) {
        const mark = late ? 'warn' : 'ok';
        if (survMark.dataset.mark !== mark) {
          survMark.dataset.mark = mark;
          survMark.innerHTML = late ? WARN_SVG : OK_SVG;
        }
      }
      if (survText) {
        const msg = late
          ? T('lateMsg', { n: fmt(diff, 1) })
          : T('inTimeMsg', { n: fmt(diff, 1) });
        if (survText.textContent !== msg) {
          survText.textContent = msg;
          flash(survText);
        }
      }
    }
  }

  /* ---------- đồng hồ sinh tồn ---------- */

  function paintCrew(state) {
    const sols = Number(state && state.solsRemaining);
    const days = Number((state && state.totals && state.totals.daysToArrival)) || 0;
    if (crewSols) {
      const text = T('crewSols', { n: fmt(Number.isFinite(sols) ? sols : 0, 0) });
      if (crewSols.textContent !== text) {
        crewSols.textContent = text;
        flash(crewSols);
      }
    }
    if (crewBarFill) {
      /* Tỉ lệ thời gian đã trôi của đồng đội: chuyến bay chiếm bao
         nhiêu phần quỹ sống còn lại.
         How much of the survival clock the flight already eats. */
      const ratio = Number.isFinite(sols) && sols > 0 ? clamp(days / sols, 0, 1) : 0;
      const tight = Number.isFinite(sols) && days >= sols * 0.92;
      crewBarFill.style.width = (ratio * 100).toFixed(1) + '%';
      crewBarFill.classList.toggle('is-tight', tight);
      if (crewBox) {
        crewBox.setAttribute('data-tight', tight ? 'true' : 'false');
        crewBox.setAttribute('title', T('crewBar', { p: fmt(ratio * 100, 0) }));
      }
    }
  }

  /* ---------- cập nhật toàn bộ ---------- */

  function refresh() {
    if (destroyed) return;
    const state = readState(engine);
    paintDots(state);
    paintSummary(state);
    paintCrew(state);
  }

  /* ---------- chữ theo ngôn ngữ ---------- */

  function applyStrings() {
    nodes.forEach((n) => {
      const label = T(labelKeyFor(n.cfg.group));
      n.label.textContent = label;
      n.btn.setAttribute('aria-label', T('calloutHint', { name: label }));
      n.btn.setAttribute('title', label);
    });

    const title = q('.asm-summary-title');
    if (title) title.textContent = T('summaryTitle');
    qa('[data-k]').forEach((el) => {
      const key = el.getAttribute('data-k');
      el.textContent = T(key);
    });
    const crewTop = q('.asm-crew-top');
    if (crewTop) crewTop.textContent = T('crewTop');
    const nextLabel = q('.asm-next-label');
    if (nextLabel) nextLabel.textContent = T('next');
    if (nextBtn) {
      nextBtn.setAttribute('aria-label', T('next'));
      nextBtn.setAttribute('title', T('next') + '. ' + T('nextHint'));
    }
    refresh();
    scheduleLayout();
  }

  function labelKeyFor(group) {
    return {
      launcher: 'gLauncher',
      propellant: 'gPropellant',
      spacecraft: 'gSpacecraft',
      comms: 'gComms',
      supplies: 'gSupplies',
      trajectory: 'gTrajectory',
    }[group] || 'gSpacecraft';
  }

  /* ---------- tương tác / interaction ---------- */

  function setHot(n, on) {
    n.path.classList.toggle('is-hot', on);
    n.dot.classList.toggle('is-hot', on);
  }

  nodes.forEach((n) => {
    n.btn.addEventListener('mouseenter', () => setHot(n, true));
    n.btn.addEventListener('mouseleave', () => setHot(n, false));
    n.btn.addEventListener('focus', () => setHot(n, true));
    n.btn.addEventListener('blur', () => setHot(n, false));
    n.btn.addEventListener('click', () => {
      if (destroyed) return;
      if (typeof onOpenGroup === 'function') {
        try {
          onOpenGroup(n.cfg.group);
        } catch (err) {
          if (typeof console !== 'undefined' && console.error) {
            console.error('[assembly-ui] onOpenGroup lỗi / failed', err);
          }
        }
      }
    });
  });

  /* ---------- nút NEXT ---------- */

  function setNextEnabled(ok) {
    if (!nextBtn) return;
    nextBtn.disabled = !ok;
    nextBtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
    nextBtn.setAttribute('title', T('next') + '. ' + (ok ? T('nextHint') : T('nextDisabled')));
  }

  nextBtn.addEventListener('click', () => {
    if (destroyed || nextBtn.disabled) return;
    if (engine && typeof engine.setCmlStep === 'function') {
      try {
        engine.setCmlStep('cml4');
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[assembly-ui] setCmlStep lỗi / failed', err);
        }
      }
    }
    /* Báo cho app biết người chơi đã bấm NEXT. App bắt sự kiện này
       để tự chuyển bước, không phải đọc lại state.
       Tell the app the player pressed NEXT, so it can move the step
       without polling state. */
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('ui:next', {
          detail: { step: 'cml4', source: 'assembly-ui' },
        }));
      } catch (err) {
        /* CustomEvent không dựng được thì thôi, engine đã đổi bước */
      }
    }
  });

  /* ---------- nghe engine và khung nhìn ---------- */

  if (engine && typeof engine.subscribe === 'function') {
    try {
      unsubState = engine.subscribe('state:changed', () => refresh());
    } catch (err) {
      unsubState = null;
    }
  }

  if (typeof onLangChange === 'function') {
    unsubLang = onLangChange(() => {
      if (!destroyed) applyStrings();
    });
  }

  const onViewport = () => scheduleLayout();
  window.addEventListener('resize', onViewport);
  window.addEventListener('scroll', onViewport, true);

  let ro = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => scheduleLayout());
    ro.observe(root);
    const ship = findShip();
    if (ship) ro.observe(ship);
  }

  applyStrings();
  refresh();
  scheduleLayout();

  /* Chờ con tàu của feature-cml3 dựng xong rồi mới đo lại, vì lúc
     mount khung vẽ có thể còn trống.
     The ship may not exist yet at mount time, so measure again after
     the workshop finishes painting. */
  timers.push(setTimeout(() => scheduleLayout(), 260));
  timers.push(setTimeout(() => scheduleLayout(), 900));

  const handle = {
    root,
    refresh: () => { refresh(); scheduleLayout(); },
    setNextEnabled,
    destroy() {
      destroyed = true;
      if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      timers.forEach((id) => clearTimeout(id));
      timers.length = 0;
      if (unsubState) unsubState();
      if (unsubLang) unsubLang();
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onViewport);
      window.removeEventListener('scroll', onViewport, true);
      root.remove();
      if (mounted === handle) mounted = null;
    },
  };

  mounted = handle;
  return handle;
}

/** Bật tắt nút NEXT của lần mount gần nhất. App gọi khi có mục đỏ.
 *  Toggle the NEXT button of the latest mount, for callers outside. */
export function setNextEnabled(ok) {
  if (mounted && typeof mounted.setNextEnabled === 'function') {
    mounted.setNextEnabled(ok);
    return true;
  }
  return false;
}

/* ============================================================
   5. KHUNG HTML
   ============================================================ */

const SHELL = `
  <svg class="asm-leader" aria-hidden="true" focusable="false"></svg>

  <aside class="asm-crew" aria-live="polite">
    ${AVATAR_SVG}
    <div class="asm-crew-lines">
      <p class="asm-crew-top"></p>
      <p class="asm-crew-sols"></p>
    </div>
    <div class="asm-crew-bar" aria-hidden="true"><i></i></div>
  </aside>

  <section class="asm-summary" aria-labelledby="asm-summary-h">
    <h2 class="asm-summary-title" id="asm-summary-h"></h2>
    <div class="asm-row">
      <span class="asm-k" data-k="rowMass"></span>
      <span class="asm-v" data-v="mass">0</span>
    </div>
    <div class="asm-row">
      <span class="asm-k" data-k="rowTime"></span>
      <span class="asm-v" data-v="days">0</span>
    </div>
    <div class="asm-row is-extra">
      <span class="asm-k" data-k="rowBudget"></span>
      <span class="asm-v" data-v="cost">0</span>
    </div>
    <div class="asm-row is-extra">
      <span class="asm-k" data-k="rowDeltaV"></span>
      <span class="asm-v" data-v="dv">0</span>
    </div>
    <div class="asm-survive" role="status">
      <span class="asm-survive-mark" data-mark="ok">${OK_SVG}</span>
      <p></p>
    </div>
  </section>

  <button type="button" class="asm-next">
    <span class="asm-next-label"></span>
    ${NEXT_ARROW}
  </button>
`;

export default mountAssemblyUi;
