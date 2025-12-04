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

// Enable clients to be controlled immediately
clientsClaim();

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// Set up navigation route to index.html
const navigationRoute = new NavigationRoute(
    createHandlerBoundToURL('index.html')
);
registerRoute(navigationRoute);

// Cache API responses with NetworkFirst strategy
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
        ],
    }),
    'GET'
);

// Cache CDN resources with StaleWhileRevalidate
registerRoute(
    ({ url }) => url.host.includes('aistudiocdn.com') || url.host.includes('cdn.jsdelivr.net'),
    new StaleWhileRevalidate({
        cacheName: 'snapify-cdn-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
            }),
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
    event.waitUntil(Promise.resolve(clientsClaim()));
});

// Handle messages from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});