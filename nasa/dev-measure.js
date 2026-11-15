/* Helper cho test tự động: vào thẳng màn căn cứ, rồi đo tràn.

   Vì sao cần: mỗi lần trang nạp lại là phải bấm Bắt đầu, bỏ qua video,
   đi hết 40 lượt truyện mới tới căn cứ. Lặp lại đoạn đó trong từng
   lần test thì vừa dài vừa dễ sai. Gói lại một chỗ. */

window.__enterBase = async function () {
  const boot = document.getElementById('boot');
  if (boot) boot.style.display = 'none';
  document.querySelectorAll('.story-screen, .intro-overlay, .video-intro')
    .forEach((e) => e.remove());

  const B = window.__BASE__ || (location.origin + location.pathname.replace(/[^/]*$/, ''));
  const { startBase } = await import(B + 'base.js');

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

/* Đo tràn ngang và tràn dọc của vùng nội dung, cùng mọi chỗ chữ bị
   cắt mép phải trong từng ô chỉ số. */
window.__measureOverflow = function () {
  const out = { main: null, cellIssues: [], groupRight: null, viewport: window.innerWidth };

  const main = document.querySelector('.base-main');
  if (main) out.main = { scroll: main.scrollHeight, client: main.clientHeight };

  const grp = document.querySelector('.hud-group');
  if (grp) out.groupRight = Math.round(grp.getBoundingClientRect().right);

  for (const cell of document.querySelectorAll('.hud-cell')) {
    const c = cell.getBoundingClientRect();
    const v = cell.querySelector('.hud-value');
    const b = cell.querySelector('.hud-bar');
    const vr = v ? v.getBoundingClientRect() : null;
    const br = b ? b.getBoundingClientRect() : null;
    const issues = [];
    if (vr && vr.right > c.right - 0.5) issues.push('value');
    if (br && br.right > c.right - 0.5) issues.push('bar');
    if (issues.length) {
      out.cellIssues.push({
        stat: cell.dataset.stat,
        issues,
        cellRight: Math.round(c.right),
        valueRight: vr ? Math.round(vr.right) : null,
        barRight: br ? Math.round(br.right) : null,
      });
    }
  }

  return out;
};
