/**
 * NexaERP — Service Worker v3
 * Offline-first PWA with background sync
 */

const CACHE_NAME = 'nexaerp-cache-v3';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache for offline operation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/dashboard.css',
  '/js/utils.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/modules.js',
  '/js/sap_modules.js',
  '/js/enterprise_modules.js',
  '/js/demo-data.js',
  '/js/inventory.js',
  '/js/pos.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
];

// API endpoints to cache with network-first strategy
const API_CACHE_PATTERNS = [
  /\/api\/products/,
  /\/api\/analytics/,
  /\/api\/forecast/,
];

// ─── Install: Pre-cache critical assets ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(PRECACHE_ASSETS.filter(url => !url.startsWith('http') || url.includes('fonts.goo')));
    }).catch(err => console.warn('[SW] Pre-cache failed (non-fatal):', err))
  );
  self.skipWaiting();
});

// ─── Activate: Clean old caches ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => { console.log('[SW] Removing old cache:', name); return caches.delete(name); })
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Serve cached or network ─────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-same-origin except allowed CDNs
  if (request.method !== 'GET') return;

  // Network-first for API calls (fall back to cache for GET)
  if (url.pathname.startsWith('/api/') && API_CACHE_PATTERNS.some(p => p.test(url.pathname))) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Skip all other API calls (must be online for mutations)
  if (url.pathname.startsWith('/api/')) return;

  // Cache-first for static assets
  event.respondWith(cacheFirstWithNetwork(request));
});

async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ success: false, offline: true, message: 'You are offline. Showing cached data.' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    if (networkResponse.ok) cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    if (request.headers.get('Accept')?.includes('text/html')) {
      return caches.match('/dashboard.html') || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('Offline', { status: 503 });
  }
}

// ─── Background Sync ────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'nexaerp-sync') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Communicate with client to flush IndexedDB queue
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_REQUESTED' }));
}

// ─── Push Notifications ─────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'NexaERP', {
      body: data.body || 'You have a new notification',
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-72.png',
      tag: data.tag || 'nexaerp-notification',
      data: data.url || '/dashboard.html',
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/dashboard.html'));
});
