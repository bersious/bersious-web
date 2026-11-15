/* Script test tự động cho màn căn cứ: bấm mọi nút, mở mọi popup,
   ghi lại lỗi console và ảnh 404. Dùng cho kiểm thử trước khi nộp.

   Cách dùng trong harness:
     await window.__runButtonTest()  ->  trả về báo cáo dạng object  */

window.__runButtonTest = async function () {
  const report = {
    buttons: [],
    popups: [],
    errors: [],
    failedImages: [],
    warnings: [],
  };

  const errBefore = window.__e || [];

  // thu mọi ảnh lỗi
  document.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.src) {
      report.failedImages.push(img.src);
    }
  });

  const btnSel = [
    '[data-action="farm"]',
    '[data-action="bag"]',
    '[data-action="explore"]',
    '[data-action="sleep"]',
    '.settings-btn',
    '[data-bag-close]',
  ];

  for (const sel of btnSel) {
    const el = document.querySelector(sel);
    if (!el) {
      report.buttons.push({ sel, status: 'KHONG TIM THAY' });
      continue;
    }
    const r = el.getBoundingClientRect();
    const ok44 = r.width >= 44 && r.height >= 44;
    report.buttons.push({
      sel,
      status: 'co',
      size: `${Math.round(r.width)}x${Math.round(r.height)}`,
      hit44: ok44,
    });
    if (!ok44) report.warnings.push(`${sel} nhỏ hơn 44px: ${Math.round(r.width)}x${Math.round(r.height)}`);
  }

  // mở túi đồ, đếm item, kiểm tra ảnh
  const bagBtn = document.querySelector('[data-action="bag"]');
  if (bagBtn) {
    bagBtn.click();
    await new Promise((r) => setTimeout(r, 700));
    const items = document.querySelectorAll('.base-item');
    const imgs = document.querySelectorAll('.base-item-img');
    const broken = Array.from(imgs).filter((i) => !i.naturalWidth);
    report.popups.push({
      name: 'túi đồ',
      items: items.length,
      images: imgs.length,
      brokenImages: broken.length,
    });
    if (broken.length) report.failedImages.push(...broken.map((i) => i.src));

    const close = document.querySelector('[data-bag-close]');
    if (close) close.click();
    await new Promise((r) => setTimeout(r, 500));
  }

  // mở thám hiểm
  const expBtn = document.querySelector('[data-action="explore"]');
  if (expBtn) {
    expBtn.click();
    await new Promise((r) => setTimeout(r, 1200));
    const cells = document.querySelectorAll('.exp-cell');
    report.popups.push({ name: 'thám hiểm', cells: cells.length });
    const expClose = document.querySelector('.exp-close');
    if (expClose) expClose.click();
    await new Promise((r) => setTimeout(r, 500));
  }

  // mở nông trại
  const farmBtn = document.querySelector('[data-action="farm"]');
  if (farmBtn) {
    farmBtn.click();
    await new Promise((r) => setTimeout(r, 1200));
    const plots = document.querySelectorAll('[class*="plot"], [class*="farm-cell"]');
    report.popups.push({ name: 'nông trại', plots: plots.length });
    const farmClose = document.querySelector('.farm-close, [data-farm-close]');
    if (farmClose) farmClose.click();
    await new Promise((r) => setTimeout(r, 500));
  }

  // mở cài đặt
  const setBtn = document.querySelector('.settings-btn');
  if (setBtn) {
    setBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    const panel = document.querySelector('.set-panel, [class*="set-panel"]');
    report.popups.push({ name: 'cài đặt', opened: !!panel });
    const rows = document.querySelectorAll('.set-row, [class*="set-row"]');
    if (rows.length) report.popups[report.popups.length - 1].rows = rows.length;
    const setClose = document.querySelector('.set-close, [data-set-close]');
    if (setClose) setClose.click();
    await new Promise((r) => setTimeout(r, 500));
  }

  // thử đi ngủ, đo nhảy ngày
  const sleepBtn = document.querySelector('[data-action="sleep"]');
  if (sleepBtn) {
    const dayBefore = document.querySelector('.base-clock-day')?.textContent;
    sleepBtn.click();
    await new Promise((r) => setTimeout(r, 3000));
    const dayAfter = document.querySelector('.base-clock-day')?.textContent;
    report.popups.push({ name: 'đi ngủ', dayBefore, dayAfter, jumped: dayBefore !== dayAfter });
    if (dayBefore === dayAfter) report.warnings.push('Đi ngủ không nhảy ngày');
  }

  // lỗi mới phát sinh
  const errAfter = (window.__e || []).slice(errBefore.length);
  report.errors = errAfter;

  // tràn khung
  const main = document.querySelector('.base-main');
  if (main && main.scrollHeight > main.clientHeight + 2) {
    report.warnings.push(`Màn tràn ${main.scrollHeight - main.clientHeight}px`);
  }

  // ảnh nào trả 404
  document.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.src && !report.failedImages.includes(img.src)) {
      report.failedImages.push(img.src);
    }
  });

  return report;
};
