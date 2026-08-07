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
