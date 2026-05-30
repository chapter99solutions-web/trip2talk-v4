/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const CACHE_NAME = 'trip2talk-v2';

const NAV_ROUTES = ['/', '/trips', '/gallery', '/about', '/contact'];

// Caches we intentionally keep around. Anything else (e.g. an older
// `trip2talk-v1`) is purged on activate so a cache-name bump takes effect.
const EXPECTED_CACHES = new Set<string>([
  CACHE_NAME,
  'supabase-api',
  'images',
  'google-fonts-cache',
]);

// Precache Vite's hashed build output. Revision-based precaching means every
// deploy fetches the new hashed JS/CSS and prunes the old revisions, so we
// never get stuck serving stale built assets — the known staleness pitfall.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Warm the key public navigation routes into the versioned cache on install.
// Each route is added individually so one transient failure can't abort the
// whole service-worker install.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(NAV_ROUTES.map((route) => cache.add(route)))
    )
  );
  void self.skipWaiting();
});

// Drop any cache that isn't expected (and isn't Workbox-managed precache) so a
// version bump clears stale navigation entries.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !EXPECTED_CACHES.has(key) && !key.startsWith('workbox'))
          .map((key) => caches.delete(key))
      )
    )
  );
  void self.clients.claim();
});

// Navigation routes: cache-first against `trip2talk-v2`, falling back to the
// network. The new service worker re-warms these on each deploy (see install),
// so cached navigations stay in sync with freshly precached assets.
registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' && NAV_ROUTES.includes(url.pathname),
  new CacheFirst({
    cacheName: CACHE_NAME,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// Supabase API — network-first so data stays current, with an offline cache.
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 })],
  })
);

// Images — stale-while-revalidate.
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 604800 })],
  })
);

// Google Fonts.
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-cache' })
);
