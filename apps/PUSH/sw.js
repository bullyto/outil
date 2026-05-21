const CACHE_NAME = "adn66-push-v2";
const WORKER_BASE_URL = "https://adn66-push.apero-nuit-du-66.workers.dev";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./style.css",
  "./config.js",
  "./app.js",
  "./admin.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", event => {
  event.waitUntil(showLatestNotification());
});

async function showLatestNotification() {
  let payload = {
    title: "ADN66",
    body: "Nouvelle notification.",
    url: "./"
  };

  try {
    if (eventHasDataAvailable()) {
      // Sécurité : garde une compatibilité si on ajoute plus tard un payload chiffré.
    }

    const response = await fetch(`${WORKER_BASE_URL}/push/latest`, {
      cache: "no-store"
    });

    if (response.ok) {
      const data = await response.json();

      if (data && data.notification) {
        payload = data.notification;
      }
    }
  } catch (error) {
    // Fallback silencieux : une notification générique est affichée.
  }

  const title = payload.title || "ADN66";

  const options = {
    body: payload.body || "",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data: {
      url: payload.url || "./"
    },
    requireInteraction: false
  };

  return self.registration.showNotification(title, options);
}

function eventHasDataAvailable() {
  return false;
}

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const url = event.notification.data?.url || "./";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(clientList => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
