/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Self-invoke to start the service worker
declare const self: ServiceWorkerGlobalScope;

const SW_VERSION = 'snapify-sw-1.1';

// Enable clients to be controlled immediately
clientsClaim();

// Precache all assets - this will be replaced by workbox-inject-manifest
try {
  precacheAndRoute(self.__WB_MANIFEST);
} catch (error) {
  console.error('Service worker precaching failed:', error);
  // Notify the client about precaching failure
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PRECACHE_FAILED',
        error: error.message,
        url: 'manifest'
      });
    });
  });
}

// Set up navigation route to index.html with network-first so shell updates without manual cache clears
const navigationHandler = async (params: { event: FetchEvent }) => {
    const networkFirst = new NetworkFirst({
        cacheName: 'snapify-shell-cache',
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({
                maxEntries: 10,
                maxAgeSeconds: 24 * 60 * 60, // 1 day
            }),
        ],
    });

    try {
        return await networkFirst.handle(params);
    } catch (error) {
        return createHandlerBoundToURL('index.html')(params);
    }
};
registerRoute(new NavigationRoute(navigationHandler));

// Cache API responses with NetworkFirst strategy and enhanced error handling
registerRoute(
    ({ url }) => url.pathname.startsWith('/api/') &&
        !url.pathname.includes('/api/proxy-media') &&
        !url.pathname.includes('/api/media'),
    new NetworkFirst({
        cacheName: 'snapify-api-cache',
        networkTimeoutSeconds: 5,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
            }),
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
            new BackgroundSyncPlugin('snapify-upload-queue', {
                maxRetentionTime: 24 * 60, // 24 hours in minutes
            }),
            // Enhanced error handling for API failures
            {
                fetchDidFail: async ({ request }) => {
                    console.error(`API request failed: ${request.url}`);
                    // Notify clients about API failures for better UX
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({
                                type: 'API_REQUEST_FAILED',
                                url: request.url,
                                method: request.method,
                                timestamp: Date.now()
                            });
                        });
                    });
                    return null; // Let the request fail gracefully
                },
                cachedResponseWillBeUsed: async ({ cacheName, request, cachedResponse }) => {
                    // Log when falling back to cache
                    if (cachedResponse) {
                        console.log(`Using cached response for: ${request.url}`);
                    }
                    return cachedResponse;
                }
            }
        ],
    }),
    'GET'
);

// Cache CDN resources with StaleWhileRevalidate and enhanced error handling
registerRoute(
    ({ url }) => url.host.includes('aistudiocdn.com') || url.host.includes('cdn.jsdelivr.net'),
    new StaleWhileRevalidate({
        cacheName: 'snapify-cdn-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
            }),
            new CacheableResponsePlugin({
                statuses: [0, 200]
            }),
            // Enhanced error handling for CDN failures
            {
                fetchDidFail: async ({ request }) => {
                    console.warn(`CDN request failed for: ${request.url}`);
                    // Notify the client about CDN failures
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({
                                type: 'CDN_LOAD_FAILED',
                                url: request.url,
                                timestamp: Date.now()
                            });
                        });
                    });
                    return null; // Let the request fail gracefully
                },
                fetchDidSucceed: async ({ request, response }) => {
                    // Log successful CDN loads for monitoring
                    if (response.status === 200) {
                        console.log(`CDN resource loaded successfully: ${request.url}`);
                    }
                    return response;
                }
            }
        ],
    })
);

// Cache static assets with CacheFirst
registerRoute(
    ({ request }) => request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'image' ||
        request.destination === 'font',
    new CacheFirst({
        cacheName: 'snapify-assets-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            }),
        ],
    })
);

// Handle offline queue for POST/PUT/DELETE requests
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
        event.respondWith(
            fetch(request.clone()).catch(() => {
                // Queue failed requests for later processing
                return new Response(
                    JSON.stringify({
                        queued: true,
                        message: 'Request queued for when connection is restored'
                    }),
                    {
                        status: 202,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            })
        );
    }
});

// Skip waiting and claim clients immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.resolve(clientsClaim())
            .then(() => {
                // Clean up old caches to prevent version mismatch issues
                return caches.keys().then(cacheNames => {
                    return Promise.all(
                        cacheNames.map(cacheName => {
                            if (
                                cacheName !== 'workbox-precache' &&
                                cacheName !== 'snapify-api-cache' &&
                                cacheName !== 'snapify-cdn-cache' &&
                                cacheName !== 'snapify-assets-cache' &&
                                cacheName !== 'snapify-shell-cache'
                            ) {
                                return caches.delete(cacheName);
                            }
                            return Promise.resolve();
                        })
                    );
                }).then(() => {
                    // Notify all clients that a new SW version is active so they can refresh if needed
                    return self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
                        });
                    });
                });
            })
    );
});

// Handle messages from the client with enhanced error handling
self.addEventListener('message', (event) => {
    try {
        if (event.data && event.data.type === 'SKIP_WAITING') {
            self.skipWaiting();
        } else if (event.data && event.data.type === 'PRECACHE_FAILED') {
            console.warn('Client reported precache failure:', event.data.url);
            // This could trigger a service worker update if needed
        } else if (event.data && event.data.type === 'CHECK_VERSION') {
            // Respond with current service worker version
            event.ports[0]?.postMessage({
                type: 'VERSION_RESPONSE',
                version: '2.0.0'
            });
        } else if (event.data && event.data.type === 'NETWORK_STATUS_CHECK') {
            // Check network connectivity and respond
            const isOnline = navigator.onLine;
            event.ports[0]?.postMessage({
                type: 'NETWORK_STATUS_RESPONSE',
                isOnline: isOnline,
                timestamp: Date.now()
            });
        } else if (event.data && event.data.type === 'FORCE_CACHE_REFRESH') {
            // Force refresh specific caches
            const cacheNamesToRefresh = event.data.cacheNames || ['snapify-api-cache', 'snapify-cdn-cache'];
            Promise.all(
                cacheNamesToRefresh.map(async (cacheName) => {
                    const cache = await caches.open(cacheName);
                    const requests = await cache.keys();
                    return Promise.all(requests.map(request => cache.delete(request)));
                })
            ).then(() => {
                event.ports[0]?.postMessage({
                    type: 'CACHE_REFRESH_COMPLETE',
                    refreshedCaches: cacheNamesToRefresh
                });
            }).catch(error => {
                console.error('Cache refresh failed:', error);
                event.ports[0]?.postMessage({
                    type: 'CACHE_REFRESH_FAILED',
                    error: error.message
                });
            });
        }
    } catch (error) {
        console.error('Error handling service worker message:', error);
        // Send error response if possible
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
                type: 'MESSAGE_HANDLING_ERROR',
                error: error.message
            });
        }
    }
});

// Add version check to prevent running outdated service workers
const CURRENT_VERSION = '2.0.0'; // Update this when making breaking changes

// Check if this is an outdated service worker by comparing with stored version
self.addEventListener('install', (event) => {
    console.log(`Service Worker ${CURRENT_VERSION} installing...`);

    // Store the version in cache for later comparison
    event.waitUntil(
        caches.open('snapify-version-cache').then(cache => {
            return cache.put('version', new Response(CURRENT_VERSION));
        })
    );
});
