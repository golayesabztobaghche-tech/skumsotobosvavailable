/* Offline support for the existing GitHub Pages site. */
'use strict';
const CACHE_PREFIX = 'sedaye-daneshjoo-offline-';
const CACHE_NAME = CACHE_PREFIX + 'v1';
const START_URLS = ['./', './index.html'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(START_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const isNavigation = request.mode === 'navigate';
    try {
      // Network-first: when online, refresh the page/assets; if offline, use saved copies.
      const response = await fetch(request);
      if (response && (response.ok || response.type === 'opaque')) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const saved = await cache.match(request);
      if (saved) return saved;
      if (isNavigation) {
        const home = await cache.match('./index.html') || await cache.match('./');
        if (home) return home;
      }
      return new Response('', {
        status: 503,
        statusText: 'Offline - resource not available in cache',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
