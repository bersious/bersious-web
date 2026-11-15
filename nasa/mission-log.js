/* ============================================================
   mission-log.js
   Nhật ký Sứ mệnh: hai tab (Mục tiêu và Hướng dẫn / Ghi chép Hành
   trình), trạng thái hoàn thành của từng mục tiêu, và lớp phủ bắt
   buộc mở nhật ký ở lần đầu vào màn căn cứ.

   Vì sao tách khỏi hud-compact.js: hud-compact chỉ vẽ thanh HUD và
   dựng khung widget. Toàn bộ dữ liệu mục tiêu, cách đọc trạng thái
   thật của game, và lớp phủ hướng dẫn nằm ở đây, để sửa nội dung
   checklist không phải chạm vào file vẽ.

   Nguyên tắc: mỗi mục tiêu chỉ được đánh dấu xong khi đọc được trạng
   thái THẬT của game (localStorage hoặc phase2Engine). Không có
   đường tắt nào tự tick hộ người chơi.

   Hàm xuất ra:
     createMissionLog({ host, onNewlyDone })   dựng và theo dõi checklist
     startMissionLogIntro({ logEl })           lớp phủ lần đầu, trả Promise
     recordMissionAction(id)                   ghi nhận đã mở trạm nào
   ============================================================ */

import { getLang, onLangChange } from './i18n.js';
import { playOneShotSfx } from './audio-sfx.js';

/* Bốn khoá trạng thái. Tách riêng từng thứ vì vòng đời khác nhau:
   danh sách mục tiêu đã xong thì ghi dồn, còn "đã mở nhật ký" và
   "đã xem lớp phủ lần đầu" chỉ ghi một lần rồi thôi. */
const DONE_KEY = 'smdg.missionLogDone';
const OPENED_KEY = 'smdg.missionLogOpened';
const SEEN_KEY = 'smdg.mlSeen';
const INTRO_KEY = 'smdg.missionLogIntro';

const TICK_SFX = 'terminal-blip';

/* ---------- chữ song ngữ ----------
   Để trong file này vì đây là nội dung của riêng nhật ký; nhãn giao
   diện chung của HUD vẫn đọc qua i18n.js. */
const TEXT = {
  vi: {
    tabCheck: 'Mục tiêu và Hướng dẫn',
    tabJournal: 'Ghi chép Hành trình',
    phase1: 'Giai đoạn 1 · Trạm Hab Sao Hỏa',
    phase2: 'Giai đoạn 2 · Xưởng Thiết kế và Giải cứu',
    count: '{done}/{total} mục tiêu',
    urgent: 'Khẩn cấp: mặc đồ bay, ra Cửa khóa khí và cắm đèn hiệu dẫn đường bãi đáp.',
    peekNone: 'Đã xong mọi mục tiêu đang mở',
    boxTodo: '[ ]',
    boxDone: '[x]',
    introEyebrow: 'Nhật ký Sứ mệnh',
    introText: 'Khoan đã! Trước khi chạm vào bất kỳ nút nào, hãy bấm mở Nhật ký để xem tình trạng trạm và danh sách việc cần làm đầu tiên của bạn.',
    introStep2: 'Tốt. Đọc xong thì bấm lại để đóng nhật ký và bắt tay vào việc.',
    introOpen: 'Mở nhật ký',
    introClose: 'Đóng nhật ký',
    a11yDone: 'Đã xong',
    a11yTodo: 'Chưa làm',
    step: {
      p1s1: {
        t: 'Đọc Nhật ký trạm',
        g: 'Kiểm tra tình trạng sinh tồn và vật tư còn lại.',
      },
      p1s2: {
        t: 'Ổn định điện và dưỡng khí',
        g: 'Bấm vào trạm Hệ thống sống, cấp điện cho máy tạo Oxy và máy lọc nước, giữ Oxy và nhiệt độ ở mức an toàn.',
      },
      p1s3: {
        t: 'Bắt sóng vệ tinh MRO',
        g: 'Bấm vào Bàn liên lạc, chỉnh góc ăng-ten cho vạch tín hiệu chạm vùng xanh.',
      },
      p1s4: {
        t: 'Gửi tín hiệu về Trái Đất',
        g: 'Chọn tối đa ba gói dữ liệu sống còn rồi bấm nút Phát tín hiệu trên bảng liên lạc.',
      },
      p2s1: {
        t: 'Lắp ráp đủ 6 bộ phận tàu',
        g: 'Bấm lần lượt vào các đường chỉ dẫn trên thân tàu (Động cơ, Nhiên liệu, Phi thuyền, Liên lạc, Gói hàng, Quỹ đạo) để chọn linh kiện phù hợp.',
      },
      p2s2: {
        t: 'Cân đối thời gian bay',
        g: 'Đảm bảo thời gian tàu bay tới nơi nhỏ hơn số Sol sống sót của đồng đội trên Sao Hỏa.',
      },
      p2s3: {
        t: 'Kiểm duyệt an toàn JPL CML 4',
        g: 'Bấm Next, tinh chỉnh sao cho 4 đồng hồ đỏ đạt từ 80 phần trăm đến Xanh trở lên và tick đủ thủ tục bắt buộc của NASA.',
      },
      p2s4: {
        t: 'Phóng tàu và Phối hợp hạ cánh',
        g: 'Bấm LAUNCH MISSION, theo dõi hành trình và phối hợp kích hoạt đèn hiệu bãi đáp để đón đồng đội.',
      },
    },
  },
  en: {
    tabCheck: 'Objectives & Guide',
    tabJournal: 'Journey entries',
    phase1: 'Phase 1 · Mars Hab Station',
    phase2: 'Phase 2 · Design Bay & Rescue',
    count: '{done}/{total} objectives',
    urgent: 'Emergency: suit up, head out the Airlock and plant the landing beacon.',
    peekNone: 'Every open objective is done',
    boxTodo: '[ ]',
    boxDone: '[x]',
    introEyebrow: 'Mission Log',
    introText: 'Hold on! Before touching any controls, open your Mission Log to check the Hab status and your first survival checklist.',
    introStep2: 'Good. Once you have read it, press again to close the log and get to work.',
    introOpen: 'Open the log',
    introClose: 'Close the log',
    a11yDone: 'done',
    a11yTodo: 'to do',
    step: {
      p1s1: {
        t: 'Read the station log',
        g: 'Check your survival status and what supplies are left.',
      },
      p1s2: {
        t: 'Stabilize power and the air loop',
        g: 'Open the Life Support station, power the oxygen generator and water recycler, and keep oxygen and temperature in the safe band.',
      },
      p1s3: {
        t: 'Acquire the MRO satellite',
        g: 'Open the Comms Console and turn the antenna until the signal bar climbs into the green zone.',
      },
      p1s4: {
        t: 'Send the signal to Earth',
        g: 'Pick up to three survival data packets, then press the Transmit button on the comms board.',
      },
      p2s1: {
        t: 'Assemble all 6 ship systems',
        g: 'Tap each callout on the hull (engine, fuel, spacecraft, comms, supplies, trajectory) and pick the right component.',
      },
      p2s2: {
        t: 'Balance the flight time',
        g: 'Keep the arrival time below the Sols your crew can still survive on Mars.',
      },
      p2s3: {
        t: 'Pass the JPL CML 4 safety review',
        g: 'Press Next, tune the four gauges until they reach 80 percent or better, and tick every required NASA procedure.',
      },
      p2s4: {
        t: 'Launch and coordinate the landing',
        g: 'Press LAUNCH MISSION, follow the flight, and switch on the landing beacon to bring the crew home.',
      },
    },
  },
};

function L(key) {
  const tbl = TEXT[getLang()] || TEXT.vi;
  return tbl[key] ?? TEXT.vi[key] ?? key;
}

function stepText(id, field) {
  const tbl = TEXT[getLang()] || TEXT.vi;
  const entry = (tbl.step && tbl.step[id]) || (TEXT.vi.step && TEXT.vi.step[id]);
  return entry ? entry[field] || '' : '';
}

/* ---------- đọc / ghi localStorage ---------- */

function readFlag(key) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

function writeFlag(key) {
  try { localStorage.setItem(key, '1'); } catch { /* chế độ riêng tư: thôi */ }
}

function readDone() {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeDone(list) {
  try { localStorage.setItem(DONE_KEY, JSON.stringify(Array.from(new Set(list)))); } catch { /* bỏ qua */ }
}

/* ---------- đọc trạng thái thật của game ---------- */

function stage1Done() {
  try { return localStorage.getItem('smdg.stage1Done') === '1'; } catch { return false; }
}

function phase2State() {
  try {
    const api = window.phase2Engine;
    if (api && typeof api.getState === 'function') return api.getState();
  } catch { /* engine chưa nạp hoặc lỗi: coi như chưa có */ }
  return null;
}

/* Sáu nhóm linh kiện trên thân tàu ở màn lắp ráp. Tên nhóm theo
   feature-assembly-ui.js, không theo tên trường của engine, để hai
   bên không lệch nhau khi engine đổi tên trường. */
const ASSEMBLY_GROUPS = [
  ['launcher', 'launcher'],
  ['propellant', 'propellant'],
  ['spacecraft', 'propulsion'],
  ['comms', 'comms'],
  ['supplies', 'supplies'],
  ['trajectory', 'objective'],
];

function assemblyPicked(state) {
  if (!state || !state.selection) return 0;
  let n = 0;
  for (const [, field] of ASSEMBLY_GROUPS) {
    const v = state.selection[field];
    if (v != null && v !== '') n += 1;
  }
  return n;
}

/* Bốn đồng hồ của CML 4: đạt khi mọi cái đều ở mức 'ok' (tức là còn
   dưới 80 phần trăm giới hạn, lý tưởng là vùng xanh). */
function cml4Ready(state) {
  if (!state || !state.gauges) return false;
  const g = state.gauges;
  const allOk = ['time', 'mass', 'power', 'comms'].every((k) => g[k] && g[k].status === 'ok');
  if (!allOk) return false;
  const c = state.compliance || {};
  if (!c.sterilized) return false;
  if (c.rtgRequired && !c.rtg_approved) return false;
  return true;
}

const STEPS = [
  {
    id: 'p1s1',
    phase: 1,
    /* Bước 1 xong khi người chơi đã mở nhật ký ít nhất một lần. */
    done: () => readFlag(OPENED_KEY),
  },
  {
    id: 'p1s2',
    phase: 1,
    /* Trạm duy trì sự sống được ghi nhận lúc bấm vào trạm. */
    done: () => readFlag(SEEN_KEY + '.lifesupport'),
  },
  {
    id: 'p1s3',
    phase: 1,
    done: () => readFlag(SEEN_KEY + '.comms'),
  },
  {
    id: 'p1s4',
    phase: 1,
    /* Chỉ cờ do chính màn viễn thông ghi sau khi phát thành công. */
    done: () => stage1Done(),
  },
  {
    id: 'p2s1',
    phase: 2,
    done: () => assemblyPicked(phase2State()) >= ASSEMBLY_GROUPS.length,
    extra: () => {
      const n = assemblyPicked(phase2State());
      return n > 0 ? n + '/' + ASSEMBLY_GROUPS.length : '';
    },
  },
  {
    id: 'p2s2',
    phase: 2,
    /* Tàu bay tới nơi trước khi đồng đội hết thời gian sống trên Hỏa tinh. */
    done: () => {
      const s = phase2State();
      if (!s) return false;
      const days = Number(s.totals && s.totals.daysToArrival);
      const sols = Number(s.solsRemaining);
      return Number.isFinite(days) && Number.isFinite(sols) && sols > 0 && days > 0 && days <= sols;
    },
  },
  {
    id: 'p2s3',
    phase: 2,
    done: () => cml4Ready(phase2State()),
  },
  {
    id: 'p2s4',
    phase: 2,
    done: () => {
      const s = phase2State();
      return !!(s && (s.launched || s.landed));
    },
  },
];

/* ============================================================
   recordMissionAction
   base.js gọi mỗi lần người chơi bấm một trạm. Chỉ ghi lại trạm
   nào đã từng mở, không quyết định gì thêm: việc chấm xong hay
   chưa vẫn do probe của từng mục tiêu quyết định.
   ============================================================ */
export function recordMissionAction(id) {
  if (!id) return;
  const table = {
    lifesupport: 'lifesupport',
    farm: 'lifesupport',
    comms: 'comms',
    radio: 'comms',
  };
  const slot = table[id];
  if (slot) writeFlag(SEEN_KEY + '.' + slot);
}

export function markMissionLogOpened() {
  writeFlag(OPENED_KEY);
}

/* Bảng ánh xạ "dấu hiệu trong DOM" sang trạm của checklist. Dùng DOM
   chứ không dùng cú bấm: một cú bấm vào trạm viễn thông có thể bị chặn
   vì chưa đào được máy phát, và lúc đó trạm đâu có mở. Chỉ khi panel
   thật sự nằm trong trang mới tính là đã mở. */
const PANEL_SIGNS = [
  { sel: '.farm-overlay', slot: 'lifesupport' },
  { sel: '.comms-root', slot: 'comms' },
  { sel: '.comms-host', slot: 'comms' },
  { sel: '.radio-screen', slot: 'comms' },
];

function watchPanels() {
  if (typeof MutationObserver !== 'function') return () => {};
  let queued = false;

  function scan() {
    queued = false;
    for (const sign of PANEL_SIGNS) {
      let found = null;
      try { found = document.querySelector(sign.sel); } catch { found = null; }
      if (found) writeFlag(SEEN_KEY + '.' + sign.slot);
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(scan);
  }

  const obs = new MutationObserver(schedule);
  obs.observe(document.body, { childList: true, subtree: true });
  schedule();
  return () => obs.disconnect();
}

export function missionLogTabLabels() {
  return { check: L('tabCheck'), journal: L('tabJournal') };
}

/* ============================================================
   createMissionLog
   Dựng checklist vào host và tự theo dõi trạng thái game.
   ============================================================ */
export function createMissionLog({ host, onNewlyDone } = {}) {
  if (!host) return { render() {}, nextStep: () => null, destroy() {} };

  let lastDone = null;
  let pollTimer = 0;
  let offLang = null;
  let unsubP2 = null;
  let unWatch = null;
  let destroyed = false;

  const listeners = new Set();
  if (typeof onNewlyDone === 'function') listeners.add(onNewlyDone);

  function persist() {
    const stored = readDone();
    const set = new Set(stored);
    for (const step of STEPS) {
      if (set.has(step.id)) continue;
      let ok = false;
      try { ok = !!step.done(); } catch { ok = false; }
      if (ok) set.add(step.id);
    }
    const next = Array.from(set);
    if (next.length !== stored.length) writeDone(next);
    return next;
  }

  function visibleSteps() {
    const p2 = stage1Done();
    return STEPS.filter((s) => s.phase === 1 || p2);
  }

  function nextStep() {
    const done = new Set(persist());
    for (const step of visibleSteps()) {
      if (!done.has(step.id)) return step;
    }
    return null;
  }

  function render() {
    if (destroyed) return;
    const doneList = persist();
    const doneSet = new Set(doneList);
    const steps = visibleSteps();
    const showP2 = stage1Done();

    /* Đếm số mục tiêu vừa xong so với lần vẽ trước. Lần vẽ đầu thì
       không báo gì: người chơi vừa tải trang đâu có làm gì. */
    let finished = 0;
    for (const step of steps) if (doneSet.has(step.id)) finished += 1;
    const increased = lastDone !== null && finished > lastDone;
    lastDone = finished;

    host.innerHTML = '';

    const head = document.createElement('p');
    head.className = 'ml-count';
    head.textContent = L('count')
      .replace('{done}', String(finished))
      .replace('{total}', String(steps.length));
    host.appendChild(head);

    const nextId = (steps.find((s) => !doneSet.has(s.id)) || {}).id || '';

    const groups = [
      { phase: 1, label: L('phase1') },
      { phase: 2, label: L('phase2') },
    ];

    for (const g of groups) {
      if (g.phase === 2 && !showP2) continue;
      const items = steps.filter((s) => s.phase === g.phase);
      if (!items.length) continue;

      const sec = document.createElement('section');
      sec.className = 'ml-phase';
      sec.dataset.phase = String(g.phase);

      const h = document.createElement('h4');
      h.className = 'ml-ph';
      h.textContent = g.label;
      sec.appendChild(h);

      const ol = document.createElement('ol');
      ol.className = 'ml-list';

      for (const step of items) {
        const done = doneSet.has(step.id);
        const li = document.createElement('li');
        li.className = 'ml-step';
        li.dataset.step = step.id;
        li.dataset.done = done ? 'true' : 'false';
        if (!done && step.id === nextId) li.classList.add('is-next');
        li.setAttribute('aria-label',
          stepText(step.id, 't') + ' — ' + L(done ? 'a11yDone' : 'a11yTodo'));

        const box = document.createElement('span');
        box.className = 'ml-box';
        box.setAttribute('aria-hidden', 'true');
        box.textContent = L(done ? 'boxDone' : 'boxTodo');

        const body = document.createElement('div');
        body.className = 'ml-body';

        const tEl = document.createElement('span');
        tEl.className = 'ml-t';
        tEl.textContent = stepText(step.id, 't');

        const extraText = typeof step.extra === 'function' ? step.extra() : '';
        if (extraText) {
          const ex = document.createElement('b');
          ex.className = 'ml-extra';
          ex.textContent = extraText;
          tEl.appendChild(ex);
        }

        const gEl = document.createElement('span');
        gEl.className = 'ml-g';
        gEl.textContent = stepText(step.id, 'g');

        body.append(tEl, gEl);
        li.append(box, body);
        ol.appendChild(li);
      }

      sec.appendChild(ol);

      if (g.phase === 1 && showP2) {
        const warn = document.createElement('p');
        warn.className = 'ml-urgent';
        warn.textContent = L('urgent');
        sec.appendChild(warn);
      }

      host.appendChild(sec);
    }

    if (increased) listeners.forEach((fn) => { try { fn(); } catch { /* bỏ qua */ } });
  }

  function tick() {
    if (destroyed) return;
    if (document.hidden) return;
    render();
  }

  function start() {
    render();
    pollTimer = window.setInterval(tick, 1400);
    offLang = onLangChange(() => { lastDone = null; render(); });
    unWatch = watchPanels();
    /* Engine Giai đoạn 2 phát 'state:changed' mỗi lần chọn linh kiện.
       Không có engine thì thôi, nhịp quét 1,4 giây vẫn đủ nhanh. */
    try {
      const api = window.phase2Engine;
      if (api && typeof api.subscribe === 'function') {
        unsubP2 = api.subscribe('state:changed', () => { if (!document.hidden) render(); });
      }
    } catch { /* bỏ qua */ }
  }

  start();

  return {
    render,
    nextStep,
    nextStepLabel() {
      const s = nextStep();
      if (!s) return L('peekNone');
      return stepText(s.id, 't');
    },
    isDone(id) {
      return readDone().includes(id);
    },
    destroy() {
      destroyed = true;
      window.clearInterval(pollTimer);
      if (typeof offLang === 'function') offLang();
      if (typeof unsubP2 === 'function') unsubP2();
      if (typeof unWatch === 'function') unWatch();
    },
  };
}

/* ============================================================
   Lớp phủ lần đầu vào căn cứ
   Dùng đúng cơ chế của onboarding.js: bốn tấm tối bao quanh một vùng
   sáng, không dùng clip-path nên chạy đúng trên mọi trình duyệt và
   không cắt mất phần tử đang được khoanh. Khác một chỗ: vùng sáng ở
   đây luôn là widget nhật ký, và lớp phủ chỉ tan khi người chơi mở
   rồi đóng nhật ký, chứ không tan khi bấm ra ngoài.
   ============================================================ */
const HOLE_PAD = 10;

export function startMissionLogIntro({ logEl } = {}) {
  if (!logEl) return Promise.resolve(false);
  if (readFlag(INTRO_KEY)) return Promise.resolve(false);
  if (typeof MutationObserver !== 'function') return Promise.resolve(false);

  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'ml-intro';
    root.innerHTML = `
      <div class="ml-dim" data-dim="top"></div>
      <div class="ml-dim" data-dim="bottom"></div>
      <div class="ml-dim" data-dim="left"></div>
      <div class="ml-dim" data-dim="right"></div>
      <div class="ml-ring" aria-hidden="true"></div>
      <div class="ml-card" role="alertdialog" aria-modal="true" aria-labelledby="ml-card-title" aria-describedby="ml-card-text">
        <span class="ml-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v14"/><path d="m6 12 6 6 6-6"/></svg>
        </span>
        <span class="ml-eyebrow" id="ml-card-title"></span>
        <p class="ml-text" id="ml-card-text"></p>
      </div>
    `;
    document.body.appendChild(root);

    const dims = {
      top: root.querySelector('[data-dim="top"]'),
      bottom: root.querySelector('[data-dim="bottom"]'),
      left: root.querySelector('[data-dim="left"]'),
      right: root.querySelector('[data-dim="right"]'),
    };
    const ring = root.querySelector('.ml-ring');
    const card = root.querySelector('.ml-card');
    const eyebrow = root.querySelector('.ml-eyebrow');
    const textEl = root.querySelector('.ml-text');
    const arrow = root.querySelector('.ml-arrow');

    let expandedOnce = logEl.dataset.collapsed !== 'true';
    let finished = false;

    function paintText() {
      eyebrow.textContent = L('introEyebrow');
      textEl.textContent = L(expandedOnce && logEl.dataset.collapsed === 'false' ? 'introStep2' : 'introText');
      card.setAttribute('aria-label', L('introEyebrow'));
    }

    function layout() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const b = logEl.getBoundingClientRect();
      const x = Math.max(0, b.left - HOLE_PAD);
      const y = Math.max(0, b.top - HOLE_PAD);
      const w = Math.max(0, Math.min(vw - x, b.width + HOLE_PAD * 2));
      const h = Math.max(0, Math.min(vh - y, b.height + HOLE_PAD * 2));

      dims.top.style.cssText = `left:0;top:0;width:${vw}px;height:${y}px;`;
      dims.bottom.style.cssText = `left:0;top:${y + h}px;width:${vw}px;height:${Math.max(0, vh - y - h)}px;`;
      dims.left.style.cssText = `left:0;top:${y}px;width:${x}px;height:${h}px;`;
      dims.right.style.cssText = `left:${x + w}px;top:${y}px;width:${Math.max(0, vw - x - w)}px;height:${h}px;`;
      ring.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;

      /* Thẻ chú thích nằm dưới widget nếu còn chỗ, không thì lên trên.
         Trên màn hẹp widget đã neo đáy nên gần như luôn phải lên trên. */
      card.classList.remove('is-above');
      card.style.left = '';
      card.style.right = '';
      card.style.top = '';
      card.style.bottom = '';
      const below = y + h + 16 + 150 < vh;
      if (below) {
        card.style.left = '50%';
        card.style.transform = 'translateX(-50%)';
        card.style.top = (y + h + 16) + 'px';
        arrow.style.transform = 'rotate(180deg)';
      } else {
        card.classList.add('is-above');
        card.style.left = '50%';
        card.style.transform = 'translateX(-50%)';
        card.style.bottom = (vh - y + 16) + 'px';
        arrow.style.transform = 'none';
      }
    }

    function finish() {
      if (finished) return;
      finished = true;
      writeFlag(INTRO_KEY);
      obs.disconnect();
      window.clearInterval(settle);
      window.clearTimeout(settleDone);
      window.removeEventListener('resize', layout);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey, true);
      root.remove();
      resolve(true);
    }

    function onKey(e) {
      /* Lớp phủ này không có đường tắt: mục đích là ép đọc nhật ký.
         Chặn Esc để không lỡ tay đóng rồi tưởng game bị treo. */
      e.stopPropagation();
      e.preventDefault();
      ring.classList.remove('is-nudge');
      void ring.offsetWidth;
      ring.classList.add('is-nudge');
    }

    function inspect() {
      const collapsed = logEl.dataset.collapsed === 'true';
      if (!collapsed) {
        if (!expandedOnce) {
          expandedOnce = true;
          writeFlag(OPENED_KEY);
        }
        paintText();
      } else if (expandedOnce) {
        finish();
        return;
      }
      layout();
    }

    const obs = new MutationObserver(inspect);
    obs.observe(logEl, { attributes: true, attributeFilter: ['class', 'data-collapsed'] });
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => layout());
      ro.observe(logEl);
    }

    /* Bố cục của màn căn cứ chưa ổn định ngay khi widget vừa dựng: ảnh
       nền, thanh công cụ và nhãn pha còn đổi chiều cao trong vài trăm
       mili giây đầu, nên lỗ khoét đo ở khung hình đầu có thể lệch cả
       nghìn điểm ảnh. Quét lại bố cục trong 1,2 giây đầu là cách rẻ
       nhất để lỗ khoét luôn trùm đúng widget. */
    let settle = 0;
    const settleDone = window.setTimeout(() => { window.clearInterval(settle); }, 1200);
    settle = window.setInterval(layout, 80);

    function onScroll() { layout(); }

    window.addEventListener('resize', layout);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey, true);

    /* Bấm ra vùng tối thì rung vòng khoanh thay vì im lặng: người chơi
       phải biết vì sao cú bấm của mình không có tác dụng. */
    for (const d of Object.values(dims)) {
      d.addEventListener('click', () => {
        ring.classList.remove('is-nudge');
        void ring.offsetWidth;
        ring.classList.add('is-nudge');
      });
    }

    paintText();
    layout();
    requestAnimationFrame(() => {
      root.classList.add('is-in');
      layout();
    });
  });
}
