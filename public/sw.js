import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache images with a Cache First strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Cache Firestore data with a Network First strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/firestore'),
  new NetworkFirst({
    cacheName: 'firestore-data',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// Cache other assets with a Stale While Revalidate strategy
registerRoute(
  ({ request }) => 
    request.destination === 'script' ||
    request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

// Handle offline fallback
self.addEventListener('install', (event) => {
  const offlineFallbackPage = new Response(
    '<html><body><h1>Offline</h1><p>You are currently offline. Please check your internet connection.</p></body></html>',
    {
      headers: { 'Content-Type': 'text/html' },
    }
  );

  event.waitUntil(
    caches
      .open('offline-fallback')
      .then((cache) => cache.put('/offline.html', offlineFallbackPage))
  );
});