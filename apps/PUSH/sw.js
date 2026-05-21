const CACHE_NAME = "adn66-push-v3";
const WORKER_BASE_URL = "https://adn66-push.apero-nuit-du-66.workers.dev";

const DEFAULT_ICON = "./icons/icon-192.png";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./style.css",
  "./config.js",
  "./app.js",
  "./admin.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
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
  event.waitUntil(showLatestNotification(event));
});

async function showLatestNotification(event) {
  let payload = {
    title: "ADN66",
    body: "Nouvelle notification.",
    url: "./",
    icon_url: DEFAULT_ICON,
    image_url: ""
  };

  try {
    /*
      Le Worker envoie volontairement un push vide.
      Le Service Worker récupère ensuite le dernier message depuis /push/latest.
      Cela permet de garder un système simple sans payload chiffré.
    */
    const response = await fetch(`${WORKER_BASE_URL}/push/latest`, {
      cache: "no-store"
    });

    if (response.ok) {
      const data = await response.json();

      if (data && data.notification) {
        payload = {
          ...payload,
          ...data.notification
        };
      }
    }
  } catch (error) {
    // Fallback silencieux : notification générique.
  }

  const title = payload.title || "ADN66";
  const iconUrl = cleanNotificationImageUrl(payload.icon_url) || DEFAULT_ICON;
  const imageUrl = cleanNotificationImageUrl(payload.image_url);

  const options = {
    body: payload.body || "",
    icon: iconUrl,
    badge: iconUrl,
    data: {
      url: payload.url || "./"
    },
    requireInteraction: false
  };

  /*
    Chrome peut afficher une image large avec "image".
    Certains navigateurs l’ignorent : l’icône reste alors utilisée.
  */
  if (imageUrl) {
    options.image = imageUrl;
  }

  return self.registration.showNotification(title, options);
}

function cleanNotificationImageUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  /*
    Accepte :
    - URL absolue https://...
    - chemin relatif local ./icons/icon-192.png
  */
  if (raw.startsWith("./") || raw.startsWith("/")) {
    return raw;
  }

  try {
    const url = new URL(raw);

    if (url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
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
