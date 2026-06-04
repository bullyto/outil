const CACHE='adn66-stock-mobile-json-v1';
const FILES=['./','./index.html','./manifest.webmanifest','./assets/placeholder.svg','./assets/camera-beta.svg','./stock/_snapshot.json','./stock/_snapshot_local.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
