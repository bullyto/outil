
const CACHE = "gps-v11";
const ASSETS = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./data/adresses.csv"];
self.addEventListener("install",(e)=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener("activate",(e)=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch",(e)=>{
  const url = new URL(e.request.url);
  if(url.origin === location.origin){
    e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
  }
});
