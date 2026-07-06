self.addEventListener('install', event => {
  // Placeholder: implement cache-first for shell, stale-while-revalidate for API.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
