/* ============================================================
   i18n.js
   Hệ thống song ngữ Việt / Anh cho toàn bộ game.

   >>> KHI THÊM NỘI DUNG MỚI, BẮT BUỘC THÊM CẢ HAI BẢN <<<
   Mọi câu chữ hiện ra cho người chơi phải có khoá trong VI và EN.
   Thiếu một bên là lỗi, không phải "để sau".

   Cách dùng trong JS:
       import { t, setLang, getLang, onLangChange } from './i18n.js';
       el.textContent = t('settings.title');

   Cách dùng trong HTML tĩnh:
       <span data-i18n="settings.title"></span>
   rồi gọi applyToDom() sau khi đổi ngôn ngữ.
   ============================================================ */

const KEY = 'smdg.lang';

export const STRINGS = {
  vi: {
    /* ---------- chung ---------- */
    'app.title': 'Space Mission Design Game',
    'app.tagline': 'Thiết kế một sứ mệnh không gian và hiểu ra cái giá của từng quyết định.',
    'app.start': 'Bắt đầu',
    'app.again': 'Xem lại mở đầu',
    'app.continue': 'Tiếp tục',

    /* ---------- điều hướng màn mở đầu ---------- */
    'nav.prev': 'Trước',
    'nav.next': 'Tiếp',

    /* ---------- hồi ---------- */
    'act.0': 'Hồi I · Trên Trái Đất',
    'act.1': 'Hồi II · Khảo sát',
    'act.2': 'Hồi III · Cơn bão',
    'act.3': 'Hồi IV · Sol 19',

    /* ---------- nhập tên ---------- */
    'name.label': 'Tên phi hành gia',
    'name.sign': 'Ký tên',
    'name.placeholder': 'Tên của bạn',
    'name.prompt': 'Bạn là ai trong nhóm này?',
    'name.hint': 'Nhật ký sứ mệnh cần một cái tên. Gõ vào rồi bấm Enter.',

    /* ---------- bảng cài đặt ---------- */
    'settings.open': 'Cài đặt',
    'settings.title': 'Cài đặt',
    'settings.close': 'Đóng',

    'settings.audio': 'Âm thanh',
    'settings.music': 'Nhạc nền',
    'settings.music.desc': 'Nhạc không lời phát trong suốt màn chơi.',
    'settings.sfx': 'Hiệu ứng âm thanh',
    'settings.sfx.desc': 'Tiếng bấm nút và phản hồi giao diện.',
    'settings.volume': 'Âm lượng',

    'settings.graphics': 'Đồ hoạ',
    'settings.fullscreen': 'Chế độ toàn màn hình',
    'settings.fullscreen.desc': 'Giống phím F11. Bấm F để bật tắt nhanh.',
    'settings.fullscreen.enter': 'Bật toàn màn hình',
    'settings.fullscreen.exit': 'Thoát toàn màn hình',
    'settings.quality': 'Chất lượng hình',
    'settings.quality.auto': 'Tự động',
    'settings.quality.high': 'Cao',
    'settings.quality.low': 'Thấp',
    'settings.quality.desc': 'Mức thấp tắt hiệu ứng chuyển động để máy yếu chạy mượt hơn.',
    'settings.motion': 'Hiệu ứng chuyển động',
    'settings.motion.desc': 'Tắt để giảm chuyển động, phù hợp khi chóng mặt hoặc máy yếu.',
    'settings.textsize': 'Cỡ chữ',
    'settings.textsize.desc': 'Tăng cỡ chữ nếu đọc trên màn hình lớn thấy nhỏ.',

    'settings.language': 'Ngôn ngữ',
    'settings.language.desc': 'Đổi ngôn ngữ cho toàn bộ giao diện và lời kể.',

    'settings.data': 'Dữ liệu',
    'settings.reset': 'Xoá dữ liệu đã lưu',
    'settings.reset.desc': 'Xoá tên đã lưu và mọi cài đặt, đưa game về trạng thái ban đầu.',
    'settings.reset.confirm': 'Xoá hết?',
    'settings.credits': 'Ghi nguồn',

    /* ---------- giá trị bật tắt ---------- */
    'on': 'Bật',
    'off': 'Tắt',

    /* ---------- màn căn cứ ---------- */
    'base.who': 'Phi hành gia',
    'base.whoFallback': 'Chưa đặt tên',
    'base.heading': 'Chọn việc cho hôm nay',
    'base.day': 'Ngày {n}',
    'base.night': 'Ban đêm',
    'base.daytime': 'Ban ngày',
    'base.close': 'Đóng',

    'base.farm': 'Nông trại',
    'base.farm.desc': 'Khoang trồng rau trong nhà kính. Chưa có gì để gieo.',
    'base.farm.locked': 'Cần hạt giống. Kho hạt giống nằm ngoài căn cứ.',

    'base.bag': 'Túi đồ',
    'base.bag.desc': 'Mọi thứ bạn còn lại sau cơn bão.',
    'base.bag.title': 'Túi đồ của bạn',

    'base.explore': 'Đi thám hiểm',
    'base.explore.desc': 'Ra ngoài khảo sát địa hình quanh căn cứ.',
    'base.explore.locked': 'Khu vực này chưa dựng xong. Bản đồ còn đang vẽ.',

    'base.sleep': 'Đi ngủ',
    'base.sleep.desc': 'Ngủ qua đêm, thức dậy lúc 07:00 sáng hôm sau.',

    'base.footer.survived': 'Đã sống sót {n} ngày',
    'base.footer.items': '{n} vật phẩm',

    'base.item.toolkit': 'Hộp dụng cụ',
    'base.item.oxygen': 'Bình oxy',
    'base.item.ration': 'Khẩu phần ăn',
    'base.item.radio': 'Máy liên lạc hỏng',
  },

  en: {
    /* ---------- general ---------- */
    'app.title': 'Space Mission Design Game',
    'app.tagline': 'Design a space mission and learn what every decision costs.',
    'app.start': 'Begin',
    'app.again': 'Replay the prologue',
    'app.continue': 'Continue',

    /* ---------- prologue navigation ---------- */
    'nav.prev': 'Back',
    'nav.next': 'Next',

    /* ---------- acts ---------- */
    'act.0': 'Act I · On Earth',
    'act.1': 'Act II · The Survey',
    'act.2': 'Act III · The Storm',
    'act.3': 'Act IV · Sol 19',

    /* ---------- name entry ---------- */
    'name.label': 'Astronaut name',
    'name.sign': 'Sign',
    'name.placeholder': 'Your name',
    'name.prompt': 'Who are you in this crew?',
    'name.hint': 'The mission log needs a name. Type it and press Enter.',

    /* ---------- settings ---------- */
    'settings.open': 'Settings',
    'settings.title': 'Settings',
    'settings.close': 'Close',

    'settings.audio': 'Audio',
    'settings.music': 'Background music',
    'settings.music.desc': 'Instrumental score that plays throughout.',
    'settings.sfx': 'Sound effects',
    'settings.sfx.desc': 'Button clicks and interface feedback.',
    'settings.volume': 'Volume',

    'settings.graphics': 'Graphics',
    'settings.fullscreen': 'Fullscreen mode',
    'settings.fullscreen.desc': 'Same as pressing F11. Press F to toggle quickly.',
    'settings.fullscreen.enter': 'Enter fullscreen',
    'settings.fullscreen.exit': 'Exit fullscreen',
    'settings.quality': 'Image quality',
    'settings.quality.auto': 'Auto',
    'settings.quality.high': 'High',
    'settings.quality.low': 'Low',
    'settings.quality.desc': 'Low disables motion effects so weaker machines stay smooth.',
    'settings.motion': 'Motion effects',
    'settings.motion.desc': 'Turn off to reduce movement, useful if it makes you dizzy or on slow hardware.',
    'settings.textsize': 'Text size',
    'settings.textsize.desc': 'Increase if the text reads small on a large screen.',

    'settings.language': 'Language',
    'settings.language.desc': 'Changes the language for the whole interface and the story.',

    'settings.data': 'Data',
    'settings.reset': 'Clear saved data',
    'settings.reset.desc': 'Removes your saved name and all settings, resetting the game.',
    'settings.reset.confirm': 'Clear everything?',
    'settings.credits': 'Credits',

    /* ---------- toggles ---------- */
    'on': 'On',
    'off': 'Off',

    /* ---------- base screen ---------- */
    'base.who': 'Astronaut',
    'base.whoFallback': 'Unnamed',
    'base.heading': 'Pick today\'s work',
    'base.day': 'Day {n}',
    'base.night': 'Night',
    'base.daytime': 'Daylight',
    'base.close': 'Close',

    'base.farm': 'Greenhouse',
    'base.farm.desc': 'The indoor grow bay. Nothing to sow yet.',
    'base.farm.locked': 'Seeds needed. The seed locker is outside the base.',

    'base.bag': 'Pack',
    'base.bag.desc': 'Everything you have left after the storm.',
    'base.bag.title': 'Your pack',

    'base.explore': 'Explore',
    'base.explore.desc': 'Head outside and survey the ground around the base.',
    'base.explore.locked': 'This area is not built yet. The map is still being drawn.',

    'base.sleep': 'Sleep',
    'base.sleep.desc': 'Sleep through the night, wake at 07:00 next morning.',

    'base.footer.survived': 'Survived {n} days',
    'base.footer.items': '{n} items',

    'base.item.toolkit': 'Tool kit',
    'base.item.oxygen': 'Oxygen tank',
    'base.item.ration': 'Ration pack',
    'base.item.radio': 'Broken radio',
  },
};

let lang = localStorage.getItem(KEY) || 'vi';
const listeners = new Set();

export function getLang() {
  return lang;
}

export function setLang(next) {
  if (!STRINGS[next] || next === lang) return;
  lang = next;
  localStorage.setItem(KEY, next);
  document.documentElement.lang = next;
  applyToDom();
  listeners.forEach((fn) => fn(next));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, fallback) {
  const table = STRINGS[lang] || STRINGS.vi;
  return table[key] ?? STRINGS.vi[key] ?? fallback ?? key;
}

/* Gán lại chữ cho mọi phần tử có data-i18n trong DOM tĩnh. */
export function applyToDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val) el.setAttribute('placeholder', val);
  });
}

/* Áp ngôn ngữ đã lưu ngay khi nạp module. */
document.documentElement.lang = lang;
