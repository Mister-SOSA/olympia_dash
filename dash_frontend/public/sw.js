/**
 * OlyDash Service Worker
 * 
 * Features:
 * - Static asset caching (cache-first strategy)
 * - API response caching (network-first with fallback)
 * - Offline page fallback
 * - Background sync for preferences
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `olydash-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `olydash-dynamic-${CACHE_VERSION}`;
const API_CACHE = `olydash-api-${CACHE_VERSION}`;

// Static assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/offline',
    '/manifest.json',
    '/OlyDash.png',
    '/icon-192.png',
    '/icon-512.png',
    '/notification.ogg',
];

// API routes to cache (with network-first strategy)
const CACHEABLE_API_ROUTES = [
    '/api/widgets',
    '/api/humidity',
    '/api/beef-prices',
    '/api/ac-infinity/controllers',
];

// Routes that should never be cached
const NO_CACHE_ROUTES = [
    '/auth/',
    '/api/auth/',
    '/api/admin/',
    '/socket.io/',
];

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Delete old versions of our caches
                            return name.startsWith('olydash-') &&
                                name !== STATIC_CACHE &&
                                name !== DYNAMIC_CACHE &&
                                name !== API_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch Event - Handle caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Check if this route should not be cached
    const shouldNotCache = NO_CACHE_ROUTES.some(route => url.pathname.startsWith(route));
    if (shouldNotCache) {
        return;
    }

    // API requests - Network first, fall back to cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(request, API_CACHE));
        return;
    }

    // Static assets and pages - Cache first, fall back to network
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
        return;
    }

    // Dynamic pages - Network first with offline fallback
    event.respondWith(networkFirstWithOfflineFallback(request));
});

/**
 * Cache-first strategy - Good for static assets
 */
async function cacheFirstStrategy(request, cacheName) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        // Return cached version and update cache in background
        updateCache(request, cacheName);
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache-first fetch failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first strategy - Good for API data
 */
async function networkFirstStrategy(request, cacheName) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Return a JSON error response for API requests
        return new Response(
            JSON.stringify({
                error: 'offline',
                message: 'You are offline. Showing cached data.',
                cached: false
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * Network-first with offline page fallback
 */
async function networkFirstWithOfflineFallback(request) {
    try {
        const networkResponse = await fetch(request);

        // Cache successful responses for dynamic pages
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, checking cache:', request.url);

        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('/offline');
            if (offlinePage) {
                return offlinePage;
            }
        }

        return new Response('Offline', { status: 503 });
    }
}

/**
 * Update cache in background (stale-while-revalidate)
 */
async function updateCache(request, cacheName) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Silently fail - we already have a cached version
    }
}

/**
 * Check if a path is a static asset
 */
function isStaticAsset(pathname) {
    const staticExtensions = [
        '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
        '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp', '.ogg', '.mp3'
    ];

    return staticExtensions.some(ext => pathname.endsWith(ext)) ||
        pathname === '/manifest.json';
}

/**
 * Message Handler - Communicate with the app
 */
self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0]?.postMessage({ success: true });
            });
            break;

        case 'GET_CACHE_SIZE':
            getCacheSize().then((size) => {
                event.ports[0]?.postMessage({ size });
            });
            break;

        case 'CACHE_URLS':
            if (payload?.urls) {
                cacheUrls(payload.urls).then(() => {
                    event.ports[0]?.postMessage({ success: true });
                });
            }
            break;
    }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames
            .filter(name => name.startsWith('olydash-'))
            .map(name => caches.delete(name))
    );
    console.log('[SW] All caches cleared');
}

/**
 * Get total cache size
 */
async function getCacheSize() {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
        return null;
    }

    const estimate = await navigator.storage.estimate();
    return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
    };
}

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.addAll(urls);
    console.log('[SW] Cached URLs:', urls);
}

/**
 * Push notification handler (for future use)
 */
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'New notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            timestamp: Date.now()
        },
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'OlyDash', options)
    );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

console.log('[SW] Service worker loaded');
