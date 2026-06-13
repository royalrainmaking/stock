const CACHE_NAME = 'stockfanggie-v1';
const ASSETS = [
  './',
  './index.html',
  './index.css',
  './config.js',
  './app.js',
  './api.js',
  './auth.js',
  './ui.js',
  './logo.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // We use catch to prevent the SW from failing to install if a file is missing
        return Promise.all(
          ASSETS.map(url => {
            return cache.add(url).catch(err => console.log('Failed to cache', url, err));
          })
        );
      })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network First, fallback to cache)
// Because this is a dynamic app, we want fresh data from the network if possible.
self.addEventListener('fetch', event => {
  // Skip cross-origin requests, like Google API calls
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
