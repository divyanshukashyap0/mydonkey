const CACHE_NAME = 'my-donkey-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/index.css',
    'https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png'
];

self.addEventListener('install', (event) => {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Tell the active service worker to take control of the page immediately.
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // 1. Navigation Requests (HTML) -> Network First, Fallback to Cache (App Shell)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match('/index.html')
                        .then(response => response || caches.match('/'));
                })
        );
        return;
    }

    // 2. Image Requests -> Cache First (Optimization)
    if (request.destination === 'image') {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                // Return cache if found, but also update in background if it's from our own origin
                if (cachedResponse) return cachedResponse;
                return fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                });
            })
        );
        return;
    }

    // 3. Stale-While-Revalidate for other assets (JS, CSS, Fonts)
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                });
                return cachedResponse || fetchPromise;
            })
    );
});
