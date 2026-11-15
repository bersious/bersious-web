/* Script chạy trong trình duyệt để nhảy thẳng vào màn căn cứ,
   bỏ qua toàn bộ màn kể chuyện. Dùng cho test tự động, không
   đưa vào bản phát hành.

   Cách dùng: paste vào console, hoặc gọi qua js() trong harness. */

window.__skipToBase = async function () {
  // Đóng mọi màn đang mở
  document.querySelectorAll('.story-screen, .intro-overlay, .video-intro')
    .forEach((e) => e.remove());

  const boot = document.getElementById('boot');
  if (boot) boot.style.display = 'none';

  const BASE = window.__BASE__ || (location.origin + location.pathname.replace(/[^/]*$/, ''));

  const { startBase } = await import(BASE + 'base.js');

  // Xoá base cũ nếu có
  document.querySelectorAll('.base-host').forEach((e) => e.remove());

  const host = document.createElement('div');
  host.className = 'base-host';
  document.body.appendChild(host);

  window.__baseInstance = startBase({
    container: host,
    playerName: 'Thiện Nhân',
    onExit: () => host.remove(),
  });

  return true;
};
