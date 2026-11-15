/* Màn radio: gọi về Trái Đất. Yêu cầu 2 linh kiện + 1 băng keo theo
   getUnlocks(). Liên lạc được thì hồi tinh thần theo BALANCE, và
   hiện một đoạn hội thoại ngẫu nhiên từ đội Ares 3. */

import { t } from './i18n.js';

const BASE_URL = new URL('.', import.meta.url).href;

/* Câu trả lời từ Trái Đất, xoay vòng. Song ngữ đầy đủ. */
const REPLIES = [
  { vi: 'Johanssen: “Tín hiệu rõ. Cậu làm cho cả phòng điều khiển đứng dậy kìa.”',
    en: 'Johanssen: “Signal clear. You just got the whole control room on their feet.”' },
  { vi: 'Lewis: “Đội cứu hộ đã lên đường. Giữ điện năng, giữ nước, sống tới khi chúng tôi tới.”',
    en: 'Lewis: “The rescue crew has launched. Keep power, keep water, stay alive until we get there.”' },
  { vi: 'Martinez: “Nói cho cậu nghe nè, phần ăn tàu còn tệ hơn của cậu. Cười lên đi.”',
    en: 'Martinez: “For what it is worth, ship rations are worse than yours. Smile.”' },
  { vi: 'Beck: “Hãy ngủ đủ. Cơ thể cậu là tài sản của sứ mệnh, đừng phung phí nó.”',
    en: 'Beck: “Sleep properly. Your body is mission property, do not waste it.”' },
  { vi: 'Vogel: “Tính toán của chúng tôi cho thấy cậu đủ tới mốc. Tiếp tục đi.”',
    en: 'Vogel: “Our numbers say you make it. Keep going.”' },
];

export function openRadio({ container, stats, onClose, onContact } = {}) {
  const root = document.createElement('div');
  root.className = 'radio-screen';
  root.innerHTML = `
    <div class="radio-panel" role="dialog" aria-modal="true" aria-label="${t('base.radio.title')}">
      <header class="radio-head">
        <div>
          <h2 class="radio-title">${t('base.radio.title')}</h2>
          <p class="radio-sub"></p>
        </div>
        <button type="button" class="radio-close" aria-label="${t('base.close')}">×</button>
      </header>
      <div class="radio-body">
        <img class="radio-art" src="${BASE_URL}assets/art/bg-radio.jpg" alt="">
        <div class="radio-feed" aria-live="polite"></div>
      </div>
      <footer class="radio-foot">
        <button type="button" class="radio-call"></button>
        <span class="radio-limit"></span>
      </footer>
    </div>`;
  container.appendChild(root);

  const feed = root.querySelector('.radio-feed');
  const call = root.querySelector('.radio-call');
  const limit = root.querySelector('.radio-limit');
  const sub = root.querySelector('.radio-sub');

  const u = stats.getUnlocks();
  if (!u.radio) {
    sub.textContent = t('base.radio.locked');
    call.disabled = true;
    call.textContent = t('base.radio.buildFirst');
    limit.textContent = '';
  } else {
    sub.textContent = t('base.radio.sub');
    call.textContent = t('base.radio.call');
    limit.textContent = t('base.radio.limit');
  }

  function addLine(text, mine) {
    const p = document.createElement('p');
    p.className = 'radio-line' + (mine ? ' is-mine' : '');
    p.textContent = text;
    feed.appendChild(p);
    feed.scrollTop = feed.scrollHeight;
  }

  addLine(t('base.radio.intro'), true);

  call.addEventListener('click', () => {
    if (call.disabled) return;
    call.disabled = true;
    addLine(t('base.radio.calling'), true);

    /* giả độ trễ sóng: 1.2 giây rồi Trái Đất trả lời */
    setTimeout(() => {
      const r = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      addLine(r.vi || r.en, false);
      stats.addSanity(10);
      stats.save();
      call.disabled = false;
      if (typeof onContact === 'function') onContact();
    }, 1200);
  });

  root.querySelector('.radio-close').addEventListener('click', () => {
    root.remove();
    if (typeof onClose === 'function') onClose();
  });

  const onKey = (e) => {
    if (e.key === 'Escape') {
      root.remove();
      document.removeEventListener('keydown', onKey);
      if (typeof onClose === 'function') onClose();
    }
  };
  document.addEventListener('keydown', onKey);

  return { destroy: () => { root.remove(); document.removeEventListener('keydown', onKey); } };
}
