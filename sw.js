/* PWA APERO DE NUIT 66® — Service Worker (SAFE / Installable)
   - Pré-cache minimal (sans casser si un fichier manque)
   - HTML en Network First (fallback cache)
   - Assets en Stale-While-Revalidate
   - Status (status-popup.js + status.json) TOUJOURS frais (no-store)
*/

const SW_VERSION = "v2026-01-25-01";
const CACHE_PREFIX = "adn66-apero";
const CACHE_NAME = `${CACHE_PREFIX}-${SW_VERSION}`;

// ⚠️ Liste volontairement courte et 100% réelle (pas de /assets/img/*)
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./status-popup.js",

  // images principales (présentes dans /assets/)
  "./assets/logo-header.png",
  "./assets/partage.png",
  "./assets/og-image-1200x630.jpg",

  // pages légales utiles (présentes à la racine)
  "./privacy.html",
  "./mentions.html",
  "./cgv.html",
  "./zone_livraison.html",
];

// Ajout tolérant : si 1 ressource manque, le SW s’installe quand même
async function precacheSafe(cache) {
  const results = await Promise.allSettled(
    CORE_ASSETS.map((url) =>
      cache.add(new Request(url, { cache: "reload" }))
    )
  );
  return results;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await precacheSafe(cache);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX + "-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Helpers
function isHTMLRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // ✅ 1) Toujours frais : status-popup.js (local)
  if (isSameOrigin(url) && url.pathname.endsWith("/status-popup.js")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  // ✅ 2) Toujours frais : status.json central (outil/apps/status/status.json)
  // + tout ce qui est sous /outil/apps/status/ (au cas où)
  if (url.href.includes("bullyto.github.io/outil/apps/status/")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  // ✅ 3) Ne pas cacher le cross-origin (évite opaque/bugs install)
  if (!isSameOrigin(url)) return;

  // ✅ 4) HTML = Network First (meilleure installabilité + mises à jour)
  if (isHTMLRequest(req)) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
          return res;
        } catch (e) {
          const cached = await caches.match(req);
          return cached || (await caches.match("./index.html")) || Response.error();
        }
      })()
    );
    return;
  }

  // ✅ 5) Assets = Stale-While-Revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const cache = await caches.open(CACHE_NAME);

      const fetchPromise = fetch(req)
        .then((res) => {
          // on ne met en cache que les réponses OK
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      // si on a du cache, on le sert tout de suite, et on met à jour en fond
      if (cached) {
        event.waitUntil(fetchPromise);
        return cached;
      }

      // sinon on attend le réseau
      const net = await fetchPromise;
      return net || Response.error();
    })()
  );
});
