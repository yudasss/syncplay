// Harmonia PWA Service Worker
const CACHE_NAME = 'harmonia-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Let audio stream and external API bypass SW cache
  if (
    e.request.url.includes('/api/') ||
    e.request.url.includes('googlevideo.com') ||
    e.request.url.includes('youtube') ||
    e.request.method !== 'GET'
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
