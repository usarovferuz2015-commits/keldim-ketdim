// Keldim Ketdim - PWA service worker
// Static assetlarni (JS/CSS/rasm) keshlab, ilovani o'rnatiladigan va tezroq
// qiladi. API so'rovlari (autentifikatsiya, davomat, GPS, hisobotlar) doim
// tarmoqdan olinadi - eski/keshlangan ma'lumot ko'rsatilmaydi.

const CACHE_NAME = 'keldim-ketdim-v1';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Push bildirishnomalar - masalan "chiqishni unutmang" eslatmasi.
// Backend JSON payload yuboradi: { title, body, tag, url }.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Keldim Ketdim', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Keldim Ketdim';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'keldim-ketdim-notify',
    data: { url: data.url || '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirishnomaga bosilganda, tegishli sahifani ochadi (yoki mavjud
// oynani shu sahifaga fokuslaydi, agar allaqachon ochiq bo'lsa)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin && 'focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API so'rovlarini hech qachon keshlamaymiz - har doim jonli ma'lumot kerak
  if (url.pathname.startsWith('/api/')) return;

  // Faqat o'zimiz manzilimizdagi statik resurslarni keshlaymiz
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      // Statik chunk/rasm/font uchun kesh-birinchi, tezkor javob
      if (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/icons/') ||
        request.destination === 'image' ||
        request.destination === 'font'
      ) {
        return cached || networkFetch;
      }

      // Sahifalar uchun tarmoq-birinchi (yangi kod/versiya olish uchun),
      // tarmoq bo'lmasa keshga tushamiz (asosiy offline qobiq)
      return networkFetch;
    })
  );
});
