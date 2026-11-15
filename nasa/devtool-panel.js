/* ============================================================
   devtool-panel.js  ·  bảng điều khiển nhà phát triển (bản nhanh)

   MỤC ĐÍCH: nhảy tới bất kỳ mốc nào trong game để test, không phải
   chơi lại từ đầu. Có thêm nhóm nút phát sự kiện để test các khúc có
   điều kiện mở (bắt sóng, truyền lệnh, cắm đèn hiệu).

   LUẬT CỦA DỰ ÁN: mỗi khi thêm tính năng mới vào game, PHẢI thêm một
   nút test tương ứng vào bảng này. Không có nút test nghĩa là lần sau
   muốn kiểm tính năng đó phải chơi lại từ đầu.

   Mật khẩu chỉ để tránh người chơi vô tình mở, KHÔNG phải bảo mật
   thật. Mã nguồn tĩnh thì ai đọc cũng thấy, đừng coi đây là khoá.
   ============================================================ */

const BASE_URL = new URL('.', import.meta.url).href;
const UNLOCK_KEY = 'smdg.devUnlocked';

/* Mật khẩu đúng: nhanngoc. Lưu dạng băm chuỗi để không nằm trần
   trong file khi ai đó mở nguồn xem nhanh. Đây không phải mã hoá
   an toàn, chỉ là lớp che mắt. */
function hashPass(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
const PASS_HASH = hashPass('nhanngoc');

export function isDevUnlocked() {
  try { return localStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; }
}

export function lockDev() {
  try { localStorage.removeItem(UNLOCK_KEY); } catch (e) { /* riêng tư chặn ghi */ }
}

/* Dải mốc nhảy tới. `id` dùng cho onJump. */
const STOPS = [
  { id: 'boot',       vi: 'Màn khởi động',              en: 'Boot screen',              descVi: 'Màn đầu tiên khi mở game' },
  { id: 'intro',      vi: 'Video mở đầu',               en: 'Intro video',              descVi: 'Đoạn phim The Martian' },
  { id: 'prologue',   vi: 'Comic mở đầu (12 khung)',    en: 'Opening comic, 12 frames', descVi: 'Chuỗi tranh không lời' },
  { id: 'story',      vi: 'Hội thoại mở đầu',           en: 'Opening dialogue',         descVi: 'Hai mươi lượt thoại' },
  { id: 'base1',      vi: 'Căn cứ, ngày 1',             en: 'Hab, day 1',               descVi: 'Bắt đầu sinh tồn' },
  { id: 'base6',      vi: 'Căn cứ, ngày 6',             en: 'Hab, day 6',               descVi: 'Lúc nhớ ra xác tàu thăm dò' },
  { id: 'base9',      vi: 'Căn cứ, ngày 9',             en: 'Hab, day 9',               descVi: 'Ngày phát được tín hiệu' },
  { id: 'base20',     vi: 'Căn cứ, ngày 20',            en: 'Hab, day 20',              descVi: 'Giữa hành trình sinh tồn' },
  { id: 'repair',     vi: 'Màn sửa chữa ba món',        en: 'Repair bench',             descVi: 'Chảo ăng-ten, pin, bo mạch' },
  { id: 'beacon',     vi: 'Trạm Trái Đất nhận tin',     en: 'Earth receiving station',   descVi: 'Năm khung comic của Ngọc' },
  { id: 'comms',      vi: 'Viễn thông ba bước',         en: 'Three-step comms',         descVi: 'Điện, vệ tinh, đóng gói' },
  { id: 'p2cml1',     vi: 'Giai đoạn 2, bước 1',        en: 'Phase 2, step 1',          descVi: 'Bắt sóng, chọn mục tiêu' },
  { id: 'p2cml3',     vi: 'Giai đoạn 2, bước 2',        en: 'Phase 2, step 2',          descVi: 'Lắp ráp tàu' },
  { id: 'p2cml4',     vi: 'Giai đoạn 2, bước 3',        en: 'Phase 2, step 3',          descVi: 'Kiểm duyệt an toàn' },
  { id: 'p2exec',     vi: 'Giai đoạn 2, bước 4',        en: 'Phase 2, step 4',          descVi: 'Bay và hạ cánh' },
  { id: 'flight',     vi: 'Màn bay 258,9 ngày',         en: 'Flight, 258.9 days',       descVi: 'Bản đồ quỹ đạo' },
  { id: 'summary',    vi: 'Màn tổng kết',               en: 'Summary screen',           descVi: 'So sánh với kiến trúc NASA' },
];

/* Sự kiện có thể bắn để test khúc có điều kiện mở. */
const EVENTS = [
  {
    id: 'sos',
    vi: 'Nhận tín hiệu SOS từ Sao Hỏa',
    en: 'Receive SOS from Mars',
    ev: 'mars:sos-received',
    detail: { solsRemaining: 300, crewOnMars: 1, signalStrength: 0.8 },
    descVi: 'Mở khúc bắt sóng ở Giai đoạn 2 mà không phải chơi hết Giai đoạn 1',
  },
  {
    id: 'dsn',
    vi: 'Trái Đất gửi lệnh DSN',
    en: 'Earth sends DSN command',
    ev: 'earth:dsn-command-sent',
    detail: { solsToArrival: 258.9, etaDays: 60 },
    descVi: 'Mở khúc truyền lệnh ở mốc 75 phần trăm quãng bay',
  },
  {
    id: 'beaconEv',
    vi: 'Cắm xong đèn hiệu bãi đáp',
    en: 'Beacon deployed',
    ev: 'mars:beacon-deployed',
    detail: { ok: true },
    descVi: 'Mở khúc hạ cánh bảy phút kinh hoàng',
  },
  {
    id: 'phase1done',
    vi: 'Phát tín hiệu thành công, hết Giai đoạn 1',
    en: 'Signal sent, Phase 1 complete',
    ev: null,
    descVi: 'Chạy đúng luồng kết Giai đoạn 1 để test chuyển sang trạm Trái Đất rồi sang Giai đoạn 2',
  },
];

/* Công cụ chỉnh trạng thái để test. */
const TOOLS = [
  { id: 'reset',  vi: 'Xoá toàn bộ tiến trình', en: 'Reset all progress', descVi: 'Xoá hết dữ liệu lưu, về như lần đầu' },
  { id: 'unlock', vi: 'Mở khoá mọi thứ',        en: 'Unlock everything',  descVi: 'Đánh dấu đã qua mở màn và Giai đoạn 1' },
  { id: 'items',  vi: 'Cho đầy vật phẩm',       en: 'Fill inventory',     descVi: 'Mỗi món hai mươi cái' },
  { id: 'stats',  vi: 'Chỉ số đầy',             en: 'Fill stats',         descVi: 'Nước, calo, thể lực, tinh thần về tối đa' },
];

let panel = null;

function label(item) {
  const lang = (document.documentElement.lang || 'vi').slice(0, 2);
  return lang === 'en' ? item.en : item.vi;
}
function descOf(item) {
  const lang = (document.documentElement.lang || 'vi').slice(0, 2);
  return lang === 'en' ? (item.descEn || item.descVi || '') : (item.descVi || '');
}

export function openDevPanel({ onJump, onEvent, onTool } = {}) {
  if (panel) return panel;

  const ov = document.createElement('div');
  ov.className = 'dvp-overlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Bảng điều khiển nhà phát triển');

  const stopRows = STOPS.map((s) => `
    <li class="dvp-row">
      <span class="dvp-row-main">
        <b>${label(s)}</b>
        <small>${descOf(s)}</small>
      </span>
      <button type="button" class="dvp-go" data-stop="${s.id}">Nhảy tới</button>
    </li>`).join('');

  const eventRows = EVENTS.map((s) => `
    <li class="dvp-row">
      <span class="dvp-row-main">
        <b>${label(s)}</b>
        <small>${descOf(s)}</small>
        ${s.ev ? `<code class="dvp-ev">${s.ev}</code>` : ''}
      </span>
      <button type="button" class="dvp-go dvp-go-ev" data-ev="${s.id}">Bắn</button>
    </li>`).join('');

  const toolRows = TOOLS.map((s) => `
    <li class="dvp-row">
      <span class="dvp-row-main">
        <b>${label(s)}</b>
        <small>${descOf(s)}</small>
      </span>
      <button type="button" class="dvp-go dvp-go-tool" data-tool="${s.id}">Chạy</button>
    </li>`).join('');

  ov.innerHTML = `
    <div class="dvp-panel" role="document">
      <header class="dvp-head">
        <span class="dvp-badge">DEV</span>
        <h2>Bảng điều khiển nhà phát triển</h2>
        <button type="button" class="dvp-close" aria-label="Đóng">×</button>
      </header>
      <p class="dvp-warn">Chỉ để test. Người chơi thường không thấy mục này.</p>
      <div class="dvp-scroll">
        <section class="dvp-sec">
          <h3>Nhảy tới màn</h3>
          <ul class="dvp-list">${stopRows}</ul>
        </section>
        <section class="dvp-sec">
          <h3>Kích hoạt sự kiện</h3>
          <p class="dvp-note">Dùng cho các khúc có điều kiện mở, không nhảy thẳng được.</p>
          <ul class="dvp-list">${eventRows}</ul>
        </section>
        <section class="dvp-sec">
          <h3>Công cụ</h3>
          <ul class="dvp-list">${toolRows}</ul>
        </section>
      </div>
      <footer class="dvp-foot">
        <span class="dvp-status" aria-live="polite"></span>
        <button type="button" class="dvp-lock">Khoá lại</button>
      </footer>
    </div>`;

  document.body.appendChild(ov);
  panel = ov;

  const status = ov.querySelector('.dvp-status');
  function say(msg) {
    status.textContent = msg;
    clearTimeout(say._t);
    say._t = setTimeout(() => { status.textContent = ''; }, 2600);
  }

  function close() {
    if (!panel) return;
    panel.remove();
    panel = null;
    document.removeEventListener('keydown', onKey, true);
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  }
  document.addEventListener('keydown', onKey, true);

  ov.querySelector('.dvp-close').addEventListener('click', close);
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });

  ov.querySelector('.dvp-lock').addEventListener('click', () => {
    lockDev();
    say('Đã khoá. Lần sau phải nhập mật khẩu.');
    setTimeout(close, 900);
  });

  ov.querySelectorAll('[data-stop]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.stop;
      say('Đang nhảy tới ' + id);
      close();
      if (typeof onJump === 'function') onJump(id);
    });
  });

  ov.querySelectorAll('[data-ev]').forEach((b) => {
    b.addEventListener('click', () => {
      const spec = EVENTS.find((x) => x.id === b.dataset.ev);
      if (!spec) return;
      if (spec.ev) {
        window.dispatchEvent(new CustomEvent(spec.ev, { detail: spec.detail }));
        say('Đã bắn ' + spec.ev);
      }
      if (typeof onEvent === 'function') onEvent(spec.id);
    });
  });

  ov.querySelectorAll('[data-tool]').forEach((b) => {
    b.addEventListener('click', () => {
      if (typeof onTool === 'function') onTool(b.dataset.tool);
      say('Đã chạy: ' + b.dataset.tool);
    });
  });

  return { close };
}

/* Hộp nhập mật khẩu. Trả Promise resolve true nếu mở khoá được. */
export function askDevPassword() {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'dvp-overlay dvp-overlay-pass';
    ov.innerHTML = `
      <div class="dvp-pass" role="dialog" aria-modal="true" aria-label="Nhập mật khẩu nhà phát triển">
        <h2>Chế độ nhà phát triển</h2>
        <p>Nhập mật khẩu để mở bảng test.</p>
        <input type="password" class="dvp-input" autocomplete="off" spellcheck="false"
               placeholder="Mật khẩu" aria-label="Mật khẩu nhà phát triển">
        <p class="dvp-err" role="alert"></p>
        <div class="dvp-pass-actions">
          <button type="button" class="dvp-cancel">Huỷ</button>
          <button type="button" class="dvp-ok">Mở khoá</button>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const input = ov.querySelector('.dvp-input');
    const err = ov.querySelector('.dvp-err');
    const box = ov.querySelector('.dvp-pass');
    input.focus();

    function done(v) {
      ov.remove();
      document.removeEventListener('keydown', onKey, true);
      resolve(v);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); done(false); }
      if (e.key === 'Enter') submit();
    }
    function submit() {
      if (hashPass(input.value.trim()) === PASS_HASH) {
        try { localStorage.setItem(UNLOCK_KEY, '1'); } catch (e) { /* chặn ghi */ }
        done(true);
      } else {
        err.textContent = 'Sai mật khẩu.';
        input.value = '';
        box.classList.remove('is-shake');
        void box.offsetWidth;
        box.classList.add('is-shake');
        input.focus();
      }
    }

    ov.querySelector('.dvp-cancel').addEventListener('click', () => done(false));
    ov.querySelector('.dvp-ok').addEventListener('click', submit);
    document.addEventListener('keydown', onKey, true);
  });
}

/* Nạp CSS một lần. */
export function injectDevCss() {
  if (document.querySelector('link[data-dev-css]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = BASE_URL + 'css/devtool-panel.css';
  l.dataset.devCss = '1';
  document.head.appendChild(l);
}
