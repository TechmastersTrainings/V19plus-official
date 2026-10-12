// V19Plus Service Worker Self-Unregistering Cleanup Worker
// Purpose: Safely cleans up stale Workbox/PWA caches and unregisters itself
// for any client browsers or mobile devices that previously had a service worker installed.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Claim all active clients immediately so fetch interception ceases
      await self.clients.claim();

      // 2. Clear stale Workbox and PWA caches belonging strictly to this app
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => {
              const lower = name.toLowerCase();
              return (
                lower.startsWith('workbox-') ||
                lower.startsWith('next-') ||
                lower.includes('v19') ||
                lower === 'start-url' ||
                lower === 'pages' ||
                lower === 'pages-rsc' ||
                lower === 'pages-rsc-prefetch' ||
                lower === 'apis' ||
                lower === 'cross-origin' ||
                lower.startsWith('static-') ||
                lower.startsWith('google-fonts-')
              );
            })
            .map((name) => caches.delete(name))
        );
      } catch (err) {
        // Cache cleanup failure is non-fatal
      }

      // 3. Unregister this service worker registration permanently
      try {
        const registration = await self.registration;
        if (registration) {
          await registration.unregister();
        }
      } catch (err) {
        // Unregister failure is non-fatal
      }

      // 4. Force reload open clients if they were showing cached offline content
      const clientList = await self.clients.matchAll({ type: 'window' });
      for (const client of clientList) {
        if (client.url && 'navigate' in client) {
          try {
            await client.navigate(client.url);
          } catch (e) {}
        }
      }
    })()
  );
});

// Pass all requests directly through to live network without caching
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
