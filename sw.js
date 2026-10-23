// Service Worker for GIFT FOR TMN PWA - AUTO BYPASS FOR DYNAMIC / RMIT PATHS
const CACHE_NAME = 'gift-tmn-v2-nocache';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. TUYỆT ĐỐI KHÔNG CACHE BẤT KỲ ĐƯỜNG DẪN NÀO LIÊN QUAN ĐẾN /rmit HOẶC /api
  if (url.pathname.startsWith('/rmit') || url.pathname.startsWith('/api')) {
    return; // Để trình duyệt fetch thẳng từ mạng (Network only)
  }

  // 2. Với các trang HTML chính (/, /tmn): Ưu tiên Network first để luôn thấy bản mới nhất
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Với các tài sản tĩnh (ảnh, mp3 lớn của game tmn)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
