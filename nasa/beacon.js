/* ============================================================
   beacon.js
   KHE CẢNH: trạm mặt đất bên Trái Đất nhận được tín hiệu.

   Đây là chỗ Minh Ngọc đang phác thảo. Cấu trúc đã dựng sẵn, chỉ chờ
   tranh comic và lời thoại. Bây giờ chạy bằng khung dựng tạm để luồng
   chơi không bị chặn.

   Nội dung cần có, theo đúng ý người dùng:
     - Trạm dưới mặt đất nhận được tín hiệu, mọi người reo lên
     - Họ họp lại, tinh thần nhân văn: dù phải chi cả tỷ đô cũng quyết
       cứu một mạng người
     - Dạng comic story, cùng kiểu với màn mở đầu, không lời thoại dài

   CÁCH THAY TRANH: bỏ file vào src/assets/art/beacon/ đúng tên
     beacon-01.webp tới beacon-05.webp
   Không phải sửa code. Có ảnh thì tự hiện, chưa có thì hiện khung tối
   có số thứ tự để người làm biết còn thiếu khung nào.
   ============================================================ */

import { t, getLang } from './i18n.js';
import { playOneShotSfx } from './audio-sfx.js';

const BASE_URL = new URL('.', import.meta.url).href;

/* Năm khung, đúng nhịp kể người dùng mô tả. Ghi rõ ý từng khung để
   bên vẽ có căn cứ. */
export const BEACON_FRAMES = [
  {
    file: 'beacon-01',
    /* Ý: phòng điều khiển trạm mặt đất, màn hình lớn, một kỹ thuật
       viên đang trực. Đèn cảnh báo chuyển từ đỏ sang xanh. */
    note_vi: 'Phòng điều khiển trạm mặt đất, màn hình lớn, một người đang trực. Đèn báo chuyển từ đỏ sang xanh.',
    note_en: 'Ground station control room, large screen, one operator on duty. The status light turns from red to green.',
  },
  {
    file: 'beacon-02',
    /* Ý: cận màn hình, dòng chữ hiện ra: có tín hiệu. Tay người vận
       hành đặt lên vai người bên cạnh. */
    note_vi: 'Cận màn hình, dòng tín hiệu hiện ra. Một bàn tay đặt lên vai người bên cạnh.',
    note_en: 'Close on the screen as the signal appears. A hand lands on the shoulder of the person beside.',
  },
  {
    file: 'beacon-03',
    /* Ý: cả phòng đứng dậy, có người giơ tay, có người ôm nhau. */
    note_vi: 'Cả phòng đứng dậy. Có người giơ tay, có người ôm nhau.',
    note_en: 'The whole room stands. Someone raises a hand, others embrace.',
  },
  {
    file: 'beacon-04',
    /* Ý: phòng họp, bàn dài, nhiều người ngồi, giữa bàn là bản đồ Sao
       Hỏa và một dãy số chi phí. Không khí nghiêm. */
    note_vi: 'Phòng họp, bàn dài, bản đồ Sao Hỏa giữa bàn, một dãy số chi phí bên cạnh. Không khí nghiêm.',
    note_en: 'Briefing room, long table, a map of Mars at the centre, a column of cost figures beside it. Serious mood.',
  },
  {
    file: 'beacon-05',
    /* Ý: một người đứng dậy, tay đặt lên bàn, cả phòng nhìn lên. Khoảnh
       khắc quyết định. */
    note_vi: 'Một người đứng dậy, tay đặt lên bàn, cả phòng nhìn lên. Khoảnh khắc quyết định.',
    note_en: 'One person stands, hand on the table, the room looks up. The moment of decision.',
  },
];

/* Năm câu, cùng nhịp với năm khung. Ngắn, không sáo rỗng, viết như
   người trong cuộc kể lại. Bên vẽ có thể sửa, chỉ cần giữ đúng số
   câu và đúng thứ tự. */
const LINES = [
  { vi: 'Ba giờ sáng ở Goldstone. Kênh 401,5 MHz vẫn chỉ có nhiễu, cho tới khi có một nhịp ngắn chen vào.', en: 'Three in the morning at Goldstone. Channel 401.5 MHz was only noise, until one short pulse cut through.' },
  { vi: 'Không phải nhiễu. Có người đang gõ. Người trực ca đứng bật dậy, gọi thêm hai người nữa vào phòng.', en: 'Not noise. Someone was knocking. The duty officer stood straight up and called two more people into the room.' },
  { vi: 'Cả phòng đứng dậy cùng lúc. Có người giơ tay lên, có người không nói được câu nào.', en: 'The whole room rose at once. Someone raised a hand. Someone else could not speak at all.' },
  { vi: 'Họp lúc bốn giờ. Trên bàn là bản đồ Acidalia Planitia và một cột số: chi phí phóng, chi phí tàu, chi phí cho một chuyến đi không chắc quay về.', en: 'Meeting at four. On the table, a map of Acidalia Planitia and a column of figures: launch cost, spacecraft cost, the cost of a trip that might not come back.' },
  { vi: 'Một người đứng lên đặt tay lên bàn. Cả phòng im. Câu nói ngắn: dù có phải chi cả tỷ đô, chúng ta vẫn đi đón một người về.', en: 'One person stood and put a hand on the table. The room went quiet. A short sentence: whatever it costs, we are going to bring one person home.' },
];

/* ---------- trình chiếu ---------- */

export function openBeaconScene({ onDone } = {}) {
  injectCss();

  let idx = 0;
  const host = document.createElement('div');
  host.className = 'beacon-root';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-label', t('beacon.title'));

  host.innerHTML = `
    <div class="beacon-stage"></div>
    <button type="button" class="beacon-skip">${t('prologue.skip')}</button>
    <div class="beacon-progress"><span class="beacon-progress-fill"></span></div>
  `;

  document.body.appendChild(host);

  const stage = host.querySelector('.beacon-stage');
  const fill = host.querySelector('.beacon-progress-fill');

  function lang() {
    const l = getLang();
    return l === 'en' ? 'en' : 'vi';
  }

  function render() {
    const f = BEACON_FRAMES[idx];
    const line = LINES[idx];
    const langKey = lang();

    stage.innerHTML = `
      <figure class="beacon-frame">
        <div class="beacon-img-wrap">
          <img class="beacon-img" alt="" src="${BASE_URL}assets/art/beacon/${f.file}.webp"
               data-fallbacks="assets/art/beacon/${f.file}.jpg;assets/art/beacon/${f.file}.png">
          <div class="beacon-img-missing" hidden>
            <span class="mono">${String(idx + 1).padStart(2, '0')} / ${String(BEACON_FRAMES.length).padStart(2, '0')}</span>
            <span class="beacon-img-note">${f['note_' + langKey]}</span>
          </div>
        </div>
        <figcaption class="beacon-line">${line[langKey]}</figcaption>
      </figure>
    `;

    /* Ảnh chưa có thì hiện khung ghi chú, để bên vẽ biết còn thiếu
       khung nào và cần vẽ gì. Không chặn luồng chơi. */
    const img = stage.querySelector('.beacon-img');
    const missing = stage.querySelector('.beacon-img-missing');
    const fb = stage.querySelector('.beacon-img');
    img.addEventListener('error', function tryNext() {
      const chain = (img.dataset.fallbacks || '').split(';').filter(Boolean);
      if (!chain.length) {
        img.hidden = true;
        missing.hidden = false;
        img.removeEventListener('error', tryNext);
        return;
      }
      img.dataset.fallbacks = chain.join(';');
      img.src = BASE_URL + chain.shift();
    });

    fill.style.width = (100 * (idx + 1) / BEACON_FRAMES.length) + '%';

    /* Tiếng: khung 1 im, khung 2 tiếng tín hiệu, khung 3 reo, khung
       4 im, khung 5 im. */
    if (idx === 1) playOneShotSfx('terminal-blip', { overlay: true });
    if (idx === 2) playOneShotSfx('warning-chime', { overlay: true });
  }

  function next() {
    if (idx < BEACON_FRAMES.length - 1) {
      idx += 1;
      render();
    } else {
      finish();
    }
  }

  function finish() {
    host.remove();
    document.removeEventListener('keydown', onKey);
    if (typeof onDone === 'function') onDone();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); finish(); return; }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    }
  }

  host.addEventListener('click', (e) => {
    if (e.target.closest('.beacon-skip')) return;
    next();
  });
  host.querySelector('.beacon-skip').addEventListener('click', (e) => {
    e.stopPropagation();
    finish();
  });
  document.addEventListener('keydown', onKey);

  render();

  return { destroy() { document.removeEventListener('keydown', onKey); host.remove(); } };
}

function injectCss() {
  if (document.querySelector('link[data-beacon-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/beacon.css';
  link.dataset.beaconCss = '1';
  document.head.appendChild(link);
}
