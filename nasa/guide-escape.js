/* ============================================================
   guide-escape.js
   Cứu hộ khi màn hướng dẫn hoặc nhật ký lần đầu bị kẹt.

   Vì sao cần file riêng: lớp phủ nhắc mở nhật ký (ml-intro) và lớp
   thẻ hướng dẫn (onb-root) đều nằm trên toàn màn hình. Nếu một lỗi
   bất ngờ khiến chúng không tự đóng, người chơi mất luôn khả năng
   bấm bất cứ thứ gì trong game. Hàm dưới đây gỡ sạch mọi lớp phủ
   hướng dẫn và đánh dấu đã xem, để lần sau không hiện lại.

   Dùng từ bảng dev (nhóm công cụ) hoặc gọi tay trong console:
     import('./guide-escape.js').then(m => m.escapeGuides())
   ============================================================ */

const FLAGS = [
  'smdg.missionLogIntro',
  'smdg.tutorialsSeen',
];

export function escapeGuides() {
  const removed = [];

  /* Gỡ mọi lớp phủ hướng dẫn còn sót. */
  const selectors = [
    '.ml-intro',
    '.onb-root',
    '.onb-book',
    '.te-root',
  ];
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((n) => {
      n.remove();
      removed.push(sel);
    });
  }

  /* Đánh dấu đã xem để chúng không hiện lại ngay sau khi gỡ. */
  try {
    localStorage.setItem('smdg.missionLogIntro', '1');
    if (!localStorage.getItem('smdg.tutorialsSeen')) {
      localStorage.setItem('smdg.tutorialsSeen', '[]');
    }
  } catch (e) {
    /* trình duyệt chặn lưu thì thôi, lớp phủ đã gỡ là đủ */
  }

  /* Mở khoá con trỏ nếu lớp phủ nào đó đã khoá thân trang. */
  try {
    document.body.style.removeProperty('overflow');
    document.documentElement.classList.remove('is-locked', 'no-scroll');
  } catch (e) {
    /* không có khoá nào */
  }

  console.info('[guide-escape] đã gỡ', removed.length, 'lớp phủ hướng dẫn', removed);
  return { ok: true, removed, flags: FLAGS };
}
