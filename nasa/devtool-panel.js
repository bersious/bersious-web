/* ============================================================
   devtool-panel.js
   Chế độ nhà phát triển: bảng điều khiển tối, mở từ bảng cài đặt.

   TÊN FILE: dự án chặn dev-*.js ở bước đồng bộ lên web, nên bảng này
   phải mang tên devtool- mới sống được trên bản live. Đừng đổi lại
   thành dev-panel.js hay dev-mode.js.

   ⚠ NHẮC VIỆC BẮT BUỘC: MỖI KHI THÊM MỘT TÍNH NĂNG MỚI VÀO GAME,
   PHẢI THÊM MỘT NÚT TEST TƯƠNG ỨNG VÀO ĐÂY. Không có nút test thì
   lần sau muốn kiểm tính năng đó phải chơi lại từ màn boot, mất cả
   buổi. Ba nhóm phải cập nhật: MILESTONES (nhảy tới màn), EVENTS
   (kích hoạt sự kiện có điều kiện), TOOLS (sửa trạng thái).
   Không có ngoại lệ.

   MẬT KHẨU: KHÔNG phải bảo mật thật. Mã nguồn tải về máy người chơi
   là thấy hết, hash ở đây chỉ để người chơi vô tình bấm vào không mở
   được, và để mật khẩu không nằm trần trong file cho ai đó đọc lướt
   qua. Đừng bao giờ đặt dữ liệu thật đằng sau nó.

   Bilingual VI + EN cho mọi chuỗi. Không dấu gạch dài.
   ============================================================ */

import { getLang, onLangChange } from './i18n.js';

const BASE_URL = new URL('.', import.meta.url).href;
const UNLOCK_KEY = 'smdg.devUnlocked';
const CSS_ID = 'devtool-panel-css';

/* ------------------------------------------------------------
   Mật khẩu: so sánh hash FNV-1a 32 bit của chuỗi "smdg:" + input.
   Không dùng chuỗi gốc ở đâu cả, kể cả trong comment.
   ------------------------------------------------------------ */

const PASS_HASH = '8d961462';

function fnv1a(str) {
  let x = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    x ^= str.charCodeAt(i);
    x = Math.imul(x, 0x01000193) >>> 0;
  }
  return x.toString(16).padStart(8, '0');
}

/* Đúng thì trả true. Chuỗi rỗng thì luôn sai, không để một cú Enter
   suông mở được cửa. */
export function checkPassword(input) {
  const s = typeof input === 'string' ? input.trim() : '';
  if (!s) return false;
  return fnv1a('smdg:' + s) === PASS_HASH;
}

export function isDevUnlocked() {
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function lockDev() {
  try { localStorage.removeItem(UNLOCK_KEY); } catch { /* chặn ghi thì thôi */ }
}

function persistUnlock() {
  try { localStorage.setItem(UNLOCK_KEY, '1'); } catch { /* chặn ghi thì thôi */ }
}

/* ------------------------------------------------------------
   Chuỗi song ngữ. Bảng chữ nằm ngay đây, cùng kiểu với farm.js,
   để chế độ test không làm phình i18n.js của game thật.
   ------------------------------------------------------------ */

const STRINGS = {
  vi: {
    'title': 'Chế độ nhà phát triển',
    'sub': 'Bảng điều khiển dành cho người làm game. Chỉ để test, người chơi thường không thấy mục này.',
    'warn': 'Cảnh báo: các nút dưới đây nhảy thẳng qua nội dung và sửa tiến trình. Đừng bấm khi đang chơi thật.',
    'close': 'Đóng',
    'esc': 'Esc để đóng',

    'group.milestones': 'Nhảy tới mốc',
    'group.events': 'Kích hoạt sự kiện (test các khúc có điều kiện)',
    'group.tools': 'Công cụ',
    'group.endings': 'Bắn ending thua (xem tám màn kết thúc)',
    'group.water': 'Test nước dùng chung (nông trại)',
    'group.guide': 'Hướng dẫn',
    'go': 'Nhảy tới',
    'run': 'Chạy',
    'done': 'Đã chạy: {name}',

    'end.hypoxia': 'Thua: hết oxy',
    'end.hypoxia.d': 'Mở màn kết thúc hypoxia với chỉ số giả: Sol 4, oxy 0 phần trăm.',
    'end.dehydration': 'Thua: hết nước',
    'end.dehydration.d': 'Mở màn kết thúc dehydration với chỉ số giả: Sol 7, nước 0 phần trăm.',
    'end.starvation': 'Thua: hết lương thực',
    'end.starvation.d': 'Mở màn kết thúc starvation với chỉ số giả: Sol 19, calo 0 phần trăm.',
    'end.blackout': 'Thua: mất điện',
    'end.blackout.d': 'Mở màn kết thúc blackout với chỉ số giả: Sol 11, điện 0 phần trăm.',
    'end.orbit_miss': 'Thua: trượt quỹ đạo',
    'end.orbit_miss.d': 'Màn Giai đoạn 2 với delta-v 5.120 trên 6.650 m/s cần dùng.',
    'end.mutiny': 'Thua: binh biến',
    'end.mutiny.d': 'Màn Giai đoạn 2 với ba mâu thuẫn chưa giải quyết.',
    'end.comms_lost': 'Thua: mất liên lạc',
    'end.comms_lost.d': 'Màn Giai đoạn 2 với biên viễn thông 1,2 dB dưới ngưỡng 3 dB.',
    'end.edl_crash': 'Thua: hạ cánh thất bại',
    'end.edl_crash.d': 'Màn Giai đoạn 2 thiếu bộ radar hạ cánh, tàu đâm xuống đá.',

    'm.boot': 'Màn boot',
    'm.boot.d': 'Khung khởi động, nút Bắt đầu và Tiếp tục.',
    'm.video': 'Video mở đầu',
    'm.video.d': 'Đoạn phim ngắn trước màn truyện.',
    'm.comic': 'Comic mở đầu (12 khung)',
    'm.comic.d': 'Mười hai khung tranh không lời thoại.',
    'm.story': 'Story hội thoại',
    'm.story.d': 'Màn kể chuyện có ô nhập tên.',
    'm.base.n': 'Căn cứ ngày {n}',
    'm.base.d': 'Mở màn căn cứ đúng ngày đó, đồng hồ đặt sẵn buổi sáng.',
    'm.repair': 'Màn sửa chữa ba món',
    'm.repair.d': 'Chảo ăng-ten, pin, bo mạch: bảng sửa của repair.js, kèm vật liệu cần.',
    'm.comms': 'Màn viễn thông 3 bước',
    'm.comms.d': 'Bảng Giai đoạn 1: chọn tần số, căn ăng-ten, phát khung tin.',
    'm.earth': 'Scene Trái Đất nhận tin',
    'm.earth.d': 'Trạm mặt đất bắt được tín hiệu.',
    'm.p2': 'Giai đoạn 2 bước {n}',
    'm.p2.d1': 'Bắt sóng và chọn mục tiêu.',
    'm.p2.d2': 'Lắp tàu trong xưởng.',
    'm.p2.d3': 'Bảng đèn kiểm duyệt.',
    'm.p2.d4': 'Bay và hạ cánh EDL.',
    'm.flight': 'Màn bay 258,9 ngày',
    'm.flight.d': 'Bản đồ quỹ đạo ghép đàm phán vai trò.',
    'm.summary': 'Màn tổng kết',
    'm.summary.d': 'Bảng điểm cuối của Giai đoạn 2.',

    'ev.sos': 'Giả lập nhận tín hiệu SOS từ Sao Hỏa',
    'ev.sos.d': 'Phát mars:sos-received. Test khúc bắt sóng ở Giai đoạn 2 mà không phải chơi hết Giai đoạn 1.',
    'ev.dsn': 'Giả lập Trái Đất gửi lệnh DSN',
    'ev.dsn.d': 'Phát earth:dsn-command-sent. Test khúc truyền lệnh ở mốc 75 phần trăm quãng bay.',
    'ev.beacon': 'Giả lập cắm xong đèn hiệu bãi đáp',
    'ev.beacon.d': 'Phát mars:beacon-deployed. Test khúc hạ cánh EDL.',
    'ev.signal': 'Giả lập phát tín hiệu thành công ở cuối Giai đoạn 1',
    'ev.signal.d': 'Chạy đúng luồng kết thúc Giai đoạn 1: đánh dấu xong, đóng bảng viễn thông, mở scene Trái Đất nhận tin.',
    'ev.skipvideo': 'Bỏ qua video mở đầu',
    'ev.skipvideo.d': 'Gỡ lớp phim và đi tiếp, không chờ hết đoạn.',
    'ev.skipcomic': 'Bỏ qua comic mở đầu',
    'ev.skipcomic.d': 'Gỡ mười hai khung tranh và sang màn kể chuyện.',

    'tool.reset': 'Đặt lại toàn bộ tiến trình',
    'tool.reset.d': 'Xoá mọi khoá smdg.* rồi tải lại trang về màn boot.',
    'tool.unlock': 'Mở khoá mọi thứ',
    'tool.unlock.d': 'Đánh dấu đã qua Giai đoạn 1, mở nông trại, liên lạc, thiết kế tàu.',
    'tool.items': 'Cho đầy đủ vật phẩm',
    'tool.items.d': 'Cộng 20 mỗi món trong kho, kể cả hạt giống.',
    'tool.fill': 'Cho nước và calo đầy',
    'tool.fill.d': 'Đặt nước 100 và calo 100 để test phần khác.',
    'tool.day': 'Đặt ngày bất kỳ',
    'tool.day.d': 'Nhập ngày 1 tới 35, mở lại căn cứ ở đúng ngày đó.',
    'tool.day.apply': 'Đặt ngày',
    'tool.day.label': 'Ngày',

    'tool.water50': 'Cho nước về 50',
    'tool.water50.d': 'Đặt nước của phi hành gia về đúng 50 để test thanh nước nông trại.',
    'tool.water0': 'Xả sạch nước',
    'tool.water0.d': 'Đặt nước về 0 để test câu chặn gieo khi không đủ nước.',
    'tool.guideEscape': 'Thoát hướng dẫn bị kẹt', 'tool.guideEscape.d': 'Gỡ mọi lớp phủ hướng dẫn còn sót và đánh dấu đã xem. Dùng khi màn hình bị chặn, bấm gì cũng không ăn.', 'tool.guide': 'Đặt lại hướng dẫn',
    'tool.guide.d': 'Gọi resetTutorials() của onboarding.js nếu module đó có, để xem lại các hộp hướng dẫn từ đầu.',

    'water.missing': 'Chưa có màn căn cứ nào mở, nên chưa có chỉ số để sửa. Vào căn cứ trước rồi bấm lại.',
    'water.done': 'Nước phi hành gia: {n} trên 100.',
    'water.zero': 'Nước phi hành gia: 0 trên 100. Mở nông trại để test câu chặn gieo.',
    'guide.done': 'Đã đặt lại hướng dẫn.',
    'guide.missing': 'Chưa có module hướng dẫn nào (onboarding.js) để đặt lại.',
    'ending.missing': 'Chưa có module màn kết thúc (endings.js) nên không bắn được.',

    'lock.title': 'Đã mở khoá',
    'lock.body': 'Thiết bị này đã mở chế độ nhà phát triển. Bấm khoá lại để lần sau phải nhập mật khẩu.',
    'lock.btn': 'Khoá lại',

    'pw.title': 'Nhập mật khẩu',
    'pw.label': 'Mật khẩu',
    'pw.placeholder': 'Nhập mật khẩu',
    'pw.ok': 'Mở khoá',
    'pw.cancel': 'Huỷ',
    'pw.wrong': 'Sai mật khẩu',
    'pw.hint': 'Chỉ dành cho người làm game.',
  },

  en: {
    'title': 'Developer mode',
    'sub': 'A control panel for the people building the game. Test only, regular players never see this entry.',
    'warn': 'Warning: these buttons skip content and rewrite progress. Do not press them during a real playthrough.',
    'close': 'Close',
    'esc': 'Esc to close',

    'group.milestones': 'Jump to a milestone',
    'group.events': 'Fire events (test conditional beats)',
    'group.tools': 'Tools',
    'group.endings': 'Fire a losing ending (see all eight screens)',
    'group.water': 'Shared water test (farm)',
    'group.guide': 'Guides',
    'go': 'Jump',
    'run': 'Run',
    'done': 'Ran: {name}',

    'end.hypoxia': 'Lose: out of oxygen',
    'end.hypoxia.d': 'Opens the hypoxia ending with sample stats: Sol 4, oxygen 0 percent.',
    'end.dehydration': 'Lose: out of water',
    'end.dehydration.d': 'Opens the dehydration ending with sample stats: Sol 7, water 0 percent.',
    'end.starvation': 'Lose: out of food',
    'end.starvation.d': 'Opens the starvation ending with sample stats: Sol 19, calories 0 percent.',
    'end.blackout': 'Lose: total blackout',
    'end.blackout.d': 'Opens the blackout ending with sample stats: Sol 11, power 0 percent.',
    'end.orbit_miss': 'Lose: orbit missed',
    'end.orbit_miss.d': 'Phase 2 screen with 5,120 of the 6,650 m/s delta-v the trip needs.',
    'end.mutiny': 'Lose: mutiny',
    'end.mutiny.d': 'Phase 2 screen with three unresolved crew conflicts.',
    'end.comms_lost': 'Lose: comms lost',
    'end.comms_lost.d': 'Phase 2 screen with a 1.2 dB link margin under the 3 dB floor.',
    'end.edl_crash': 'Lose: landing failed',
    'end.edl_crash.d': 'Phase 2 screen with no landing radar, the ship hits the rocks.',

    'm.boot': 'Boot screen',
    'm.boot.d': 'The loading frame, Start and Continue buttons.',
    'm.video': 'Opening video',
    'm.video.d': 'The short film before the story.',
    'm.comic': 'Opening comic (12 frames)',
    'm.comic.d': 'Twelve wordless frames.',
    'm.story': 'Dialogue story',
    'm.story.d': 'The story screen with the name field.',
    'm.base.n': 'Base, day {n}',
    'm.base.d': 'Opens the base screen on that exact day, the clock set to morning.',
    'm.repair': 'Repair bay, three parts',
    'm.repair.d': 'Antenna dish, battery, board: the repair.js panel, with the parts it needs.',
    'm.comms': 'Comms console, three steps',
    'm.comms.d': 'Phase 1 board: pick a band, aim the dish, send the frame.',
    'm.earth': 'Earth receives the signal',
    'm.earth.d': 'The ground station picks up the call.',
    'm.p2': 'Phase 2 step {n}',
    'm.p2.d1': 'Acquire the signal and pick the objective.',
    'm.p2.d2': 'Assemble the ship in the bay.',
    'm.p2.d3': 'The compliance checklist.',
    'm.p2.d4': 'Cruise and EDL landing.',
    'm.flight': '258.9 day flight',
    'm.flight.d': 'Orbit map plus the crew role negotiation.',
    'm.summary': 'Summary screen',
    'm.summary.d': 'Final Phase 2 scoreboard.',

    'ev.sos': 'Simulate an SOS from Mars',
    'ev.sos.d': 'Fires mars:sos-received. Tests the Phase 2 signal acquisition without playing all of Phase 1.',
    'ev.dsn': 'Simulate Earth sending the DSN command',
    'ev.dsn.d': 'Fires earth:dsn-command-sent. Tests the command beat at 75 percent of the cruise.',
    'ev.beacon': 'Simulate the landing beacon being placed',
    'ev.beacon.d': 'Fires mars:beacon-deployed. Tests the EDL descent beat.',
    'ev.signal': 'Simulate a successful signal at the end of Phase 1',
    'ev.signal.d': 'Runs the real Phase 1 ending: mark it done, close the console, open the Earth scene.',
    'ev.skipvideo': 'Skip the opening video',
    'ev.skipvideo.d': 'Tears down the film layer and moves on without waiting.',
    'ev.skipcomic': 'Skip the opening comic',
    'ev.skipcomic.d': 'Tears down the twelve frames and goes to the story screen.',

    'tool.reset': 'Reset all progress',
    'tool.reset.d': 'Clears every smdg.* key and reloads to the boot screen.',
    'tool.unlock': 'Unlock everything',
    'tool.unlock.d': 'Marks Phase 1 done and opens the farm, comms and ship design.',
    'tool.items': 'Give a full inventory',
    'tool.items.d': 'Adds 20 of every item, seeds included.',
    'tool.fill': 'Fill water and calories',
    'tool.fill.d': 'Sets water to 100 and calories to 100 so you can test something else.',
    'tool.day': 'Set an arbitrary day',
    'tool.day.d': 'Enter a day from 1 to 35 and reopen the base on that day.',
    'tool.day.apply': 'Set day',
    'tool.day.label': 'Day',

    'tool.water50': 'Set water to 50',
    'tool.water50.d': 'Sets the astronaut water to exactly 50 to test the farm water meter.',
    'tool.water0': 'Drain all water',
    'tool.water0.d': 'Sets water to 0 to test the sowing block when water is short.',
    'tool.guideEscape': 'Escape stuck guides', 'tool.guideEscape.d': 'Removes any leftover guide overlays and marks them seen. Use when the screen is blocked.', 'tool.guide': 'Reset guides',
    'tool.guide.d': 'Calls resetTutorials() of onboarding.js when that module exists, so the guide popups play again from the start.',

    'water.missing': 'No base screen is open, so there are no stats to edit. Open the base first, then press again.',
    'water.done': 'Astronaut water: {n} of 100.',
    'water.zero': 'Astronaut water: 0 of 100. Open the farm to test the sowing block.',
    'guide.done': 'Guides reset.',
    'guide.missing': 'No guide module (onboarding.js) exists to reset.',
    'ending.missing': 'No ending module (endings.js) exists, so nothing can fire.',

    'lock.title': 'Unlocked',
    'lock.body': 'This device has developer mode open. Press lock again to require the password next time.',
    'lock.btn': 'Lock again',

    'pw.title': 'Enter the password',
    'pw.label': 'Password',
    'pw.placeholder': 'Type the password',
    'pw.ok': 'Unlock',
    'pw.cancel': 'Cancel',
    'pw.wrong': 'Wrong password',
    'pw.hint': 'For the people building the game only.',
  },
};

function t(key, vars) {
  const lang = getLang() === 'en' ? 'en' : 'vi';
  let out = STRINGS[lang][key] ?? STRINGS.vi[key] ?? key;
  if (vars) {
    for (const k in vars) out = out.split('{' + k + '}').join(String(vars[k]));
  }
  return out;
}

/* ------------------------------------------------------------
   Danh sách mốc. id phải khớp với router ở index.html.

   "base-n" là màn căn cứ mở đúng ngày n. Trước đây chỉ có một mục
   "căn cứ" kèm ô nhập ngày, nên muốn xem ngày 20 phải gõ số rồi
   bấm; các mốc hay dùng thì nay là nút bấm một phát.

   "repair" là màn sửa ba món (chảo ăng-ten, pin, bo mạch) trong
   repair.js. Muốn xem giao diện đó mà không chơi tới ngày 6 và đào
   máy phát thì phải có mốc riêng.
   ------------------------------------------------------------ */

export const MILESTONES = [
  { id: 'boot', nameKey: 'm.boot', descKey: 'm.boot.d' },
  { id: 'video', nameKey: 'm.video', descKey: 'm.video.d' },
  { id: 'comic', nameKey: 'm.comic', descKey: 'm.comic.d' },
  { id: 'story', nameKey: 'm.story', descKey: 'm.story.d' },
  { id: 'base-1', nameKey: 'm.base.n', nameVars: { n: 1 }, descKey: 'm.base.d', day: 1 },
  { id: 'base-6', nameKey: 'm.base.n', nameVars: { n: 6 }, descKey: 'm.base.d', day: 6 },
  { id: 'base-9', nameKey: 'm.base.n', nameVars: { n: 9 }, descKey: 'm.base.d', day: 9 },
  { id: 'base-20', nameKey: 'm.base.n', nameVars: { n: 20 }, descKey: 'm.base.d', day: 20 },
  { id: 'base-35', nameKey: 'm.base.n', nameVars: { n: 35 }, descKey: 'm.base.d', day: 35 },
  { id: 'repair', nameKey: 'm.repair', descKey: 'm.repair.d', day: 6 },
  { id: 'earth', nameKey: 'm.earth', descKey: 'm.earth.d' },
  { id: 'comms', nameKey: 'm.comms', descKey: 'm.comms.d' },
  { id: 'p2-1', nameKey: 'm.p2', nameVars: { n: 1 }, descKey: 'm.p2.d1' },
  { id: 'p2-2', nameKey: 'm.p2', nameVars: { n: 2 }, descKey: 'm.p2.d2' },
  { id: 'p2-3', nameKey: 'm.p2', nameVars: { n: 3 }, descKey: 'm.p2.d3' },
  { id: 'p2-4', nameKey: 'm.p2', nameVars: { n: 4 }, descKey: 'm.p2.d4' },
  { id: 'flight', nameKey: 'm.flight', descKey: 'm.flight.d' },
  { id: 'summary', nameKey: 'm.summary', descKey: 'm.summary.d' },
];

export const EVENTS = [
  { id: 'ev:sos', nameKey: 'ev.sos', descKey: 'ev.sos.d' },
  { id: 'ev:dsn', nameKey: 'ev.dsn', descKey: 'ev.dsn.d' },
  { id: 'ev:beacon', nameKey: 'ev.beacon', descKey: 'ev.beacon.d' },
  { id: 'ev:signal', nameKey: 'ev.signal', descKey: 'ev.signal.d' },
  { id: 'ev:skipvideo', nameKey: 'ev.skipvideo', descKey: 'ev.skipvideo.d' },
  { id: 'ev:skipcomic', nameKey: 'ev.skipcomic', descKey: 'ev.skipcomic.d' },
];

export const TOOLS = [
  { id: 'tool:reset', nameKey: 'tool.reset', descKey: 'tool.reset.d' },
  { id: 'tool:unlock', nameKey: 'tool.unlock', descKey: 'tool.unlock.d' },
  { id: 'tool:items', nameKey: 'tool.items', descKey: 'tool.items.d' },
  { id: 'tool:fill', nameKey: 'tool.fill', descKey: 'tool.fill.d' },
];

/* ------------------------------------------------------------
   Nhóm test nước dùng chung.

   Phần gộp nước gộp bể riêng của nông trại vào chỉ số của phi hành
   gia, nên muốn kiểm thanh nước và câu chặn gieo thì phải đặt được
   nước về một con số biết trước. Ghi thẳng qua stats.devPatch của
   màn căn cứ đang mở (window.__devBase), không mô phỏng thời gian:
   ngồi chờ nước tụt từ 70 xuống 12 mất gần một ngày game.

   Không dùng tool:fill vì nút đó đặt 100, mà 100 thì mọi khay đều
   gieo được, không kiểm được nhánh thiếu nước.
   ------------------------------------------------------------ */

export const WATER_TOOLS = [
  { id: 'water:50', nameKey: 'tool.water50', descKey: 'tool.water50.d', value: 50 },
  { id: 'water:0', nameKey: 'tool.water0', descKey: 'tool.water0.d', value: 0 },
];

/* ------------------------------------------------------------
   Nhóm hướng dẫn. onboarding.js là module riêng, chưa chắc đã có
   trong bản đang chạy, nên nút này nạp mềm: thiếu module thì báo
   trong toast chứ không làm sập bảng.
   ------------------------------------------------------------ */

export const GUIDE_TOOLS = [
  { id: 'guide:escape', nameKey: 'tool.guideEscape', descKey: 'tool.guideEscape.d' },
  { id: 'guide:reset', nameKey: 'tool.guide', descKey: 'tool.guide.d' },
];

/* ------------------------------------------------------------
   Nhóm "bắn ending thua".

   Mỗi nút gọi thẳng showEnding() với dữ liệu giả hợp lý, để xem được
   giao diện của cả tám cảnh mà không phải chơi tới lúc chết. Đây là
   LUẬT của dự án: tính năng mới phải có nút test.

   id ở đây trùng đúng id trong ENDING_SPECS của src/endings.js.
   ------------------------------------------------------------ */

export const ENDINGS = [
  { id: 'ending:hypoxia', endingId: 'hypoxia', nameKey: 'end.hypoxia', descKey: 'end.hypoxia.d' },
  { id: 'ending:dehydration', endingId: 'dehydration', nameKey: 'end.dehydration', descKey: 'end.dehydration.d' },
  { id: 'ending:starvation', endingId: 'starvation', nameKey: 'end.starvation', descKey: 'end.starvation.d' },
  { id: 'ending:blackout', endingId: 'blackout', nameKey: 'end.blackout', descKey: 'end.blackout.d' },
  { id: 'ending:orbit_miss', endingId: 'orbit_miss', nameKey: 'end.orbit_miss', descKey: 'end.orbit_miss.d' },
  { id: 'ending:mutiny', endingId: 'mutiny', nameKey: 'end.mutiny', descKey: 'end.mutiny.d' },
  { id: 'ending:comms_lost', endingId: 'comms_lost', nameKey: 'end.comms_lost', descKey: 'end.comms_lost.d' },
  { id: 'ending:edl_crash', endingId: 'edl_crash', nameKey: 'end.edl_crash', descKey: 'end.edl_crash.d' },
];

/* ------------------------------------------------------------
   CSS
   ------------------------------------------------------------ */

function injectCss() {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.id = CSS_ID;
  link.rel = 'stylesheet';
  link.href = BASE_URL + 'css/devtool-panel.css';
  document.head.appendChild(link);
}

/* ------------------------------------------------------------
   Bảng điều khiển
   ------------------------------------------------------------ */

let openPanel = null;

export function isDevOpen() {
  return !!openPanel;
}

/**
 * Mở bảng điều khiển.
 * @param {{onJump?: (id: string, meta?: object) => void}} options
 */
export function openDevMode({ onJump, onEvent, onTool } = {}) {
  injectCss();
  if (openPanel) return openPanel;

  const lang = getLang() === 'en' ? 'en' : 'vi';

  const overlay = document.createElement('div');
  overlay.className = 'dev-overlay';
  overlay.innerHTML = `
    <div class="dev-panel" role="dialog" aria-modal="true" aria-labelledby="dev-title">
      <header class="dev-head">
        <div class="dev-head-text">
          <h2 class="dev-title" id="dev-title"></h2>
          <p class="dev-sub"></p>
        </div>
        <button type="button" class="dev-close" aria-label="">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </header>

      <p class="dev-warn"></p>

      <div class="dev-body">
        <section class="dev-group" data-group="milestones">
          <h3 class="dev-group-title"></h3>
          <ul class="dev-list" role="list"></ul>
        </section>

        <section class="dev-group" data-group="events">
          <h3 class="dev-group-title"></h3>
          <ul class="dev-list" role="list"></ul>
        </section>

        <section class="dev-group" data-group="tools">
          <h3 class="dev-group-title"></h3>
          <ul class="dev-list" role="list"></ul>
          <div class="dev-day-row">
            <label class="dev-day-label" for="dev-day-input"></label>
            <input id="dev-day-input" class="dev-day-input" type="number" min="1" max="35" step="1" value="1"
                   inputmode="numeric" autocomplete="off">
            <button type="button" class="dev-btn dev-day-apply"></button>
          </div>
        </section>

        <section class="dev-group" data-group="endings">
          <h3 class="dev-group-title"></h3>
          <ul class="dev-list" role="list"></ul>
        </section>

        <section class="dev-group" data-group="water">
          <h3 class="dev-group-title"></h3>
          <ul class="dev-list" role="list"></ul>
        </section>

        <section class="dev-group" data-group="guide">
          <h3 class="dev-group-title"></h3>
          <ul class="dev-list" role="list"></ul>
        </section>

        <section class="dev-group dev-group-lock">
          <h3 class="dev-group-title"></h3>
          <p class="dev-lock-body"></p>
          <button type="button" class="dev-btn dev-lock-btn"></button>
        </section>
      </div>

      <footer class="dev-foot">
        <span class="dev-foot-esc"></span>
      </footer>

      <div class="dev-status" role="status" aria-live="polite" hidden></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const q = (sel) => overlay.querySelector(sel);
  const panel = q('.dev-panel');
  const statusEl = q('.dev-status');
  const closeBtn = q('.dev-close');

  /* ---------- chữ ---------- */

  function paintText() {
    q('.dev-title').textContent = t('title');
    q('.dev-sub').textContent = t('sub');
    q('.dev-warn').textContent = t('warn');
    closeBtn.setAttribute('aria-label', t('close'));
    q('.dev-foot-esc').textContent = t('esc');

    q('[data-group="milestones"] .dev-group-title').textContent = t('group.milestones');
    q('[data-group="events"] .dev-group-title').textContent = t('group.events');
    q('[data-group="tools"] .dev-group-title').textContent = t('group.tools');
    q('[data-group="endings"] .dev-group-title').textContent = t('group.endings');
    q('[data-group="water"] .dev-group-title').textContent = t('group.water');
    q('[data-group="guide"] .dev-group-title').textContent = t('group.guide');
    q('.dev-group-lock .dev-group-title').textContent = t('lock.title');
    q('.dev-lock-body').textContent = t('lock.body');
    q('.dev-lock-btn').textContent = t('lock.btn');
    q('.dev-day-label').textContent = t('tool.day.label');
    q('.dev-day-apply').textContent = t('tool.day.apply');
  }

  /* ---------- dựng danh sách ---------- */

  function buildList(groupSel, items, { withDay } = {}) {
    const list = q(groupSel + ' .dev-list');
    list.innerHTML = '';
    for (const item of items) {
      const li = document.createElement('li');
      li.className = 'dev-item';
      li.dataset.id = item.id;

      const text = document.createElement('div');
      text.className = 'dev-item-text';

      const name = document.createElement('span');
      name.className = 'dev-item-name';
      name.textContent = t(item.nameKey, item.nameVars);

      const desc = document.createElement('span');
      desc.className = 'dev-item-desc';
      desc.textContent = t(item.descKey);

      text.append(name, desc);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dev-btn dev-go';
      btn.dataset.act = item.id;
      btn.textContent = withDay ? t('go') : t('run');
      /* Tooltip ghi rõ nó phát sự kiện gì, để người test không phải
         mở mã nguồn đối chiếu. */
      btn.setAttribute('title', t(item.descKey));
      btn.setAttribute('aria-label', t(item.nameKey, item.nameVars) + '. ' + t(item.descKey));

      btn.addEventListener('click', () => fire(item.id));

      li.append(text, btn);
      list.appendChild(li);
    }
  }

  function buildAll() {
    paintText();
    buildList('[data-group="milestones"]', MILESTONES, { withDay: true });
    buildList('[data-group="events"]', EVENTS);
    buildList('[data-group="tools"]', TOOLS);
    buildList('[data-group="endings"]', ENDINGS);
    buildList('[data-group="water"]', WATER_TOOLS);
    buildList('[data-group="guide"]', GUIDE_TOOLS);

    q('.dev-day-input').value = String(dayValue());
  }

  /* ---------- ngày đang chọn trong ô nhập ---------- */

  function dayValue() {
    const inp = q('.dev-day-input');
    const n = Number(inp && inp.value);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(35, Math.round(n)));
  }

  q('.dev-day-apply').addEventListener('click', () => {
    fire('tool:day', { day: dayValue() });
  });

  /* ---------- chạy một mục ---------- */

  function showStatus(msg) {
    toast(msg);
  }

  /* Toast nổi trên trang, dùng cho các phản hồi phải thấy được SAU
     khi bảng đã đóng (ví dụ "nước về 50" rồi mở nông trại xem thanh)
     hoặc khi bảng giữ mở mà người bấm nhìn xuống đáy màn. Tự xoá sau
     2,6 giây, đúng nhịp của .dev-status. */
  function toast(msg) {
    if (!msg) return;
    let el = document.getElementById('devtool-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'devtool-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toast._id);
    toast._id = setTimeout(() => { el.classList.remove('is-on'); }, 2600);
  }

  /* ---------- bắn thử một cảnh kết thúc ----------
     Dữ liệu giả nhưng hợp lý: Sol và các chỉ số khớp với từng kiểu
     chết, để giao diện có số thật mà đọc. Giai đoạn 2 truyền delta-v,
     khối lượng, chi phí thay cho oxy và nước.

     Nạp endings.js động: bảng dev phải mở được kể cả khi màn kết thúc
     chưa từng dùng trong ván này, và một lỗi ở đó không được làm hỏng
     cả bảng điều khiển. Thiếu module thì báo bằng toast trên màn hình,
     không chỉ console.warn: người bấm cần thấy lý do ngay tại chỗ.

     Trả Promise<boolean> để nơi gọi biết có bắn được hay không. */
  function fireEnding(endingId) {
    const P2_IDS = ['orbit_miss', 'mutiny', 'comms_lost', 'edl_crash'];
    const isP2 = P2_IDS.indexOf(endingId) !== -1;

    const STATS_SAMPLES = {
      hypoxia:     { day: 4,  oxygen: 0,  water: 22, calories: 41, power: 55 },
      dehydration: { day: 7,  oxygen: 78, water: 0,  calories: 29, power: 61 },
      starvation:  { day: 19, oxygen: 82, water: 34, calories: 0,  power: 48 },
      blackout:    { day: 11, oxygen: 64, water: 51, calories: 47, power: 0 },
    };

    const EXTRA_SAMPLES = {
      orbit_miss: { deltaVMs: 5120, massKg: 38400, costMusd: 742 },
      mutiny:     { deltaVMs: 7180, massKg: 41200, costMusd: 816 },
      comms_lost: { deltaVMs: 7460, massKg: 39800, costMusd: 790 },
      edl_crash:  { deltaVMs: 7610, massKg: 42900, costMusd: 858 },
    };

    return import('./endings.js').then((mod) => {
      if (!mod || typeof mod.showEnding !== 'function') {
        console.warn('[dev] endings.js không export showEnding');
        toast(t('ending.missing'));
        return false;
      }
      close();
      mod.showEnding({
        id: endingId,
        stats: isP2 ? {} : (STATS_SAMPLES[endingId] || {}),
        extra: isP2 ? (EXTRA_SAMPLES[endingId] || {}) : {},
        /* Test giao diện thì luôn hiện nút chơi lại ở trạng thái bật,
           để thấy được cả hai dáng. Bản lưu thật không bị đụng tới. */
        hasSave: false,
        saveInfo: null,
        onRetry: () => { console.info('[dev] nút chơi lại từ bản lưu'); },
        onLoadSlot: () => { /* màn kết thúc tự mở danh sách */ },
        onRestart: () => { console.info('[dev] nút bắt đầu sứ mệnh mới'); },
      });
      return true;
    }).catch((err) => {
      console.error('[dev] không nạp được endings.js', err);
      toast(t('ending.missing'));
      return false;
    });
  }

  /* ---------- test nước dùng chung ----------
     Ghi thẳng qua stats của màn căn cứ đang mở. Không có màn căn cứ
     thì không có chỉ số nào để sửa, và bấm nút mà không có phản hồi
     thì người test tưởng nút hỏng: nói rõ trong toast.

     Không đóng bảng: đang test nước thì thường bấm 50 rồi bấm 0 ngay
     sau để so hai trạng thái, đóng bảng giữa chừng bắt mở lại mật
     khẩu. */
  function setWater(value) {
    const bridge = window.__devBase;
    const stats = bridge && bridge.stats;
    if (!stats || typeof stats.devPatch !== 'function') {
      console.warn('[dev] không có stats của màn căn cứ để đặt nước');
      toast(t('water.missing'));
      return false;
    }
    stats.devPatch({ water: value });
    if (typeof stats.save === 'function') stats.save();
    const now = typeof stats.get === 'function' ? stats.get() : {};
    const n = Math.round((Number(now && now.water) || 0) * 10) / 10;
    toast(value === 0 ? t('water.zero') : t('water.done', { n }));
    return true;
  }

  /* ---------- đặt lại hướng dẫn ----------
     onboarding.js là module riêng và chưa chắc đã có trong bản đang
     chạy, nên nạp mềm: thiếu file hay thiếu hàm thì báo toast, không
     ném lỗi ra ngoài. Đây là chỗ DUY NHẤT gọi resetTutorials, và nó
     được gọi từ bảng dev chứ không phải từ luồng chơi. */
  /* Gỡ mọi lớp phủ hướng dẫn còn sót. Dùng khi màn hình bị chặn: thẻ
   hướng dẫn hoặc lớp phủ nhắc mở nhật ký không tự đóng, bấm gì cũng
   không ăn. Nạp mềm guide-escape.js để không phụ thuộc module đó. */
function escapeGuides() {
  import(new URL('guide-escape.js', import.meta.url).href)
    .then((mod) => {
      if (!mod || typeof mod.escapeGuides !== 'function') {
        toast(t('guide.missing'));
        return false;
      }
      const r = mod.escapeGuides();
      toast(t('done', { name: t('tool.guideEscape') }));
      return !!(r && r.ok);
    })
    .catch(() => {
      toast(t('guide.missing'));
      return false;
    });
}

function resetGuides() {
    return import('./onboarding.js').then((mod) => {
      if (!mod || typeof mod.resetTutorials !== 'function') {
        toast(t('guide.missing'));
        return false;
      }
      mod.resetTutorials();
      toast(t('guide.done'));
      return true;
    }).catch(() => {
      /* 404 vì module chưa tồn tại là chuyện bình thường, không phải
         lỗi: báo đúng sự thật là chưa có module để đặt lại. */
      toast(t('guide.missing'));
      return false;
    });
  }

  function fire(id, meta) {
    const allItems = [
      ...MILESTONES.map((x) => ({ ...x, kind: 'jump' })),
      ...EVENTS.map((x) => ({ ...x, kind: 'event' })),
      ...TOOLS.map((x) => ({ ...x, kind: 'tool' })),
      ...WATER_TOOLS.map((x) => ({ ...x, kind: 'water' })),
      ...GUIDE_TOOLS.map((x) => ({ ...x, kind: 'guide' })),
      ...ENDINGS.map((x) => ({ ...x, kind: 'ending' })),
    ];
    const item = allItems.find((x) => x.id === id);
    const label = item ? t(item.nameKey, item.nameVars) : id;
    /* Tiền tố id quyết định gọi hàm nào. Trước đây mọi mục đều đi qua
       onJump, nên bấm "Giả lập SOS" chỉ nhảy màn chứ không phát sự
       kiện: nút trông như chạy mà thứ cần test thì không xảy ra. */
    const kind = item
      ? item.kind
      : (id.startsWith('ev:') ? 'event'
        : (id.startsWith('tool:') ? 'tool'
          : (id.startsWith('water:') ? 'water'
            : (id.startsWith('guide:') ? 'guide'
              : (id.startsWith('ending:') ? 'ending' : 'jump')))));

    /* Hai nhóm test tại chỗ, không chuyển màn: giữ bảng mở. */
    if (kind === 'water') {
      setWater(Number(item && item.value) || 0);
      return label;
    }
    if (kind === 'guide') {
      if (id === 'guide:escape') {
        escapeGuides();
        return label;
      }
      resetGuides();
      return label;
    }

    /* Mốc căn cứ mang sẵn số ngày trong danh sách; mục "đặt ngày" của
       nhóm công cụ thì đọc ô nhập. Gom ở đây để router chỉ phải đọc
       meta.day, không phải tự đoán. */
    const withDay = id === 'tool:day' || (item && Number.isFinite(item.day));
    const dayForItem = (item && Number.isFinite(item.day)) ? item.day : dayValue();
    const payload = Object.assign(
      { day: withDay ? dayForItem : undefined },
      meta || {},
    );

    /* Nhóm ending bắn thẳng màn kết thúc, không đi qua router của
       index.html: lớp phủ đó độc lập và không cần màn nền nào, đi qua
       router sẽ gỡ mất màn đang chơi dở. fireEnding tự đóng bảng khi
       nạp được module, và giữ bảng mở khi thiếu module để người bấm
       đọc được câu báo. */
    if (kind === 'ending' && item && item.endingId) {
      fireEnding(item.endingId);
      return label;
    }

    /* Đóng bảng TRƯỚC khi gọi router: router sẽ gỡ mọi lớp phủ của
       game, và nếu bảng dev còn nằm trong danh sách bị gỡ thì nó biến
       mất giữa lúc đang chạy, để lại listener bàn phím mồ côi. */
    close();

    const handler = kind === 'event' ? onEvent : (kind === 'tool' ? onTool : onJump);
    if (typeof handler === 'function') {
      try {
        handler(id, payload);
      } catch (err) {
        console.error('[devtool-panel] handler lỗi', kind, id, err);
      }
    }
    return label;
  }

  /* ---------- khoá lại ---------- */

  q('.dev-lock-btn').addEventListener('click', () => {
    lockDev();
    close();
    /* Đóng cả bảng cài đặt để lần sau bấm vào là thấy ô mật khẩu,
       không phải bảng đang mở dở trạng thái cũ. */
    try { window.dispatchEvent(new CustomEvent('smdg:dev-locked')); } catch { /* thôi */ }
  });

  /* ---------- đóng ---------- */

  const prevFocus = document.activeElement;
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    unLang();
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
    openPanel = null;
    if (prevFocus && typeof prevFocus.focus === 'function' && document.contains(prevFocus)) {
      prevFocus.focus();
    }
  }

  function onKey(ev) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      close();
      return;
    }
    if (ev.key !== 'Tab') return;
    const nodes = Array.from(panel.querySelectorAll('button, input'))
      .filter((n) => !n.disabled && n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  }
  document.addEventListener('keydown', onKey, true);

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const unLang = onLangChange(() => { if (!closed) buildAll(); });

  buildAll();
  q('.dev-day-input').value = String(dayValue());
  requestAnimationFrame(() => {
    if (closed) return;
    overlay.classList.add('is-open');
    closeBtn.focus();
  });

  openPanel = { close };
  void lang;
  return openPanel;
}

/* ---------- tên cũ, giữ để chỗ khác không vỡ ----------
   settings-ui.js import openDevPanel / askDevPassword / injectDevCss.
   Tên chính là openDevMode / openPasswordPrompt; hai bản cũ vẫn được
   xuất lại để một cái tên lệch không làm trắng cả bảng cài đặt. */
export const openDevPanel = openDevMode;
export const askDevPassword = askPassword;
export const injectDevCss = injectCss;

/**
 * Hộp nhập mật khẩu. Trả Promise<boolean>: true nếu mở khoá được.
 * Sai thì rung ô nhập, báo "Sai mật khẩu", xoá trắng ô, giữ hộp mở
 * để người chơi gõ lại. Esc hoặc nút Huỷ đóng và trả false.
 */
export function askPassword({ onUnlock } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dev-pw-overlay';
    overlay.innerHTML = `
      <form class="dev-pw-panel" role="dialog" aria-modal="true" aria-labelledby="dev-pw-title" novalidate>
        <h3 class="dev-pw-title" id="dev-pw-title"></h3>
        <p class="dev-pw-hint"></p>
        <label class="dev-pw-label" for="dev-pw-input"></label>
        <input id="dev-pw-input" class="dev-pw-input" type="password" autocomplete="off"
               autocapitalize="off" spellcheck="false" required>
        <p class="dev-pw-error" role="alert" hidden></p>
        <div class="dev-pw-actions">
          <button type="submit" class="dev-btn dev-pw-ok"></button>
          <button type="button" class="dev-btn dev-pw-cancel"></button>
        </div>
      </form>
    `;
    injectCss();
    document.body.appendChild(overlay);

    const q = (sel) => overlay.querySelector(sel);
    const form = q('.dev-pw-panel');
    const input = q('.dev-pw-input');
    const errorEl = q('.dev-pw-error');

    function paint() {
      q('.dev-pw-title').textContent = t('pw.title');
      q('.dev-pw-hint').textContent = t('pw.hint');
      q('.dev-pw-label').textContent = t('pw.label');
      input.placeholder = t('pw.placeholder');
      q('.dev-pw-ok').textContent = t('pw.ok');
      q('.dev-pw-cancel').textContent = t('pw.cancel');
    }
    paint();

    let closed = false;
    let unlockTimer = 0;

    function done(ok) {
      if (closed) return;
      closed = true;
      clearTimeout(unlockTimer);
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      resolve(!!ok);
    }

    function onKey(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        done(false);
      }
    }
    document.addEventListener('keydown', onKey, true);

    function shake() {
      /* Rung nhẹ: gỡ lớp rồi ép đọc lại layout để hiệu ứng chạy lại được
         ở lần gõ sai thứ hai. Không có reflow thì lần hai im ru. */
      input.classList.remove('is-wrong');
      void input.offsetWidth;
      input.classList.add('is-wrong');
      errorEl.textContent = t('pw.wrong');
      errorEl.hidden = false;
      input.value = '';
      input.focus();
      setTimeout(() => { if (!closed) input.classList.remove('is-wrong'); }, 460);
    }

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!checkPassword(input.value)) {
        shake();
        return;
      }
      persistUnlock();
      if (typeof onUnlock === 'function') {
        try { onUnlock(); } catch (err) { console.error('[devtool-panel] onUnlock lỗi', err); }
      }
      /* Giữ hộp thêm một nhịp ngắn để người bấm thấy nó phản hồi,
         rồi mới trả true. Trả ngay làm hộp biến mất cùng lúc bảng
         điều khiển hiện lên, trông như cú bấm bị nuốt. */
      unlockTimer = setTimeout(() => done(true), 90);
    });

    q('.dev-pw-cancel').addEventListener('click', () => done(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) done(false); });

    requestAnimationFrame(() => { if (!closed) input.focus(); });
  });
}

/* Giữ tên cũ cho nơi gọi bằng openPasswordPrompt, trả về cùng Promise. */
export function openPasswordPrompt(opts) {
  return askPassword(opts);
}
