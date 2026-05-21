/*
  ADN66 Push - sw.js complet avancé
  Emplacement GitHub :
  /apps/PUSH/sw.js

  Fonctions :
  - récupère la dernière notification via /push/latest
  - affiche title/body/icon_url/image_url/badge_url
  - gère tag, renotify, requireInteraction, silent, vibrate
  - gère les boutons d’action :
      open_site   -> site_url
      install_app -> playstore_url
  - clic normal sur la notification -> url
*/

const CACHE_NAME = "adn66-push-v4-advanced";
const WORKER_BASE_URL = "https://adn66-push.apero-nuit-du-66.workers.dev";

const DEFAULT_ICON = "https://bullyto.github.io/outil/apps/PUSH/icons/icon-192.png";
const DEFAULT_BADGE = "https://bullyto.github.io/outil/apps/PUSH/icons/badge-96.png";
const DEFAULT_URL = "https://aperos.net/";
const DEFAULT_PLAYSTORE_URL = "https://play.google.com/store/apps/details?id=fr.aperos.nuit66";

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
  event.waitUntil(showLatestNotification());
});

async function showLatestNotification() {
  let payload = getDefaultPayload();

  try {
    /*
      Le Worker envoie volontairement un push vide.
      Le Service Worker récupère ensuite le dernier message depuis /push/latest.
      Cela garde un système simple sans payload chiffré.
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

  const title = cleanText(payload.title) || "Apéro de Nuit 66";

  const iconUrl = cleanNotificationImageUrl(payload.icon_url) || DEFAULT_ICON;
  const badgeUrl = cleanNotificationImageUrl(payload.badge_url) || "";
  const imageUrl = cleanNotificationImageUrl(payload.image_url);

  const clickUrl = cleanNotificationUrl(payload.url) || DEFAULT_URL;
  const siteUrl = cleanNotificationUrl(payload.site_url) || clickUrl || DEFAULT_URL;
  const playstoreUrl = cleanNotificationUrl(payload.playstore_url) || DEFAULT_PLAYSTORE_URL;

  const options = {
    body: cleanText(payload.body) || "Service ouvert ce soir.",
    icon: iconUrl,
    data: {
      url: clickUrl,
      site_url: siteUrl,
      playstore_url: playstoreUrl,
      target: payload.target || "all"
    },
    tag: cleanTag(payload.tag) || "adn66-alerte",
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.require_interaction),
    silent: Boolean(payload.silent),
    vibrate: cleanVibrate(payload.vibrate),
    actions: cleanActions(payload.actions)
  };

  /*
    Badge Android :
    Il doit idéalement être un pictogramme monochrome transparent.
    Si l’URL badge n’existe pas ou n’est pas adaptée, Android peut l’ignorer.
    On ne force pas badge si l’URL est vide.
  */
  if (badgeUrl) {
    options.badge = badgeUrl;
  }

  /*
    Grande image Android/Chrome.
    Certains navigateurs l’ignorent : l’icône reste alors utilisée.
  */
  if (imageUrl) {
    options.image = imageUrl;
  }

  return self.registration.showNotification(title, options);
}

function getDefaultPayload() {
  return {
    title: "Apéro de Nuit 66",
    body: "Service ouvert ce soir, livraison de 19h à 6h.",
    url: DEFAULT_URL,
    site_url: DEFAULT_URL,
    playstore_url: DEFAULT_PLAYSTORE_URL,
    target: "all",
    icon_url: DEFAULT_ICON,
    image_url: "",
    badge_url: DEFAULT_BADGE,
    tag: "adn66-alerte",
    renotify: true,
    require_interaction: true,
    silent: false,
    vibrate: [500, 150, 500, 150, 800],
    actions: [
      {
        action: "open_site",
        title: "Voir le site"
      },
      {
        action: "install_app",
        title: "Télécharger l’app"
      }
    ]
  };
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanTag(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 80);
}

function cleanNotificationUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw, self.location.href);

    if (!["https:", "http:"].includes(url.protocol)) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function cleanNotificationImageUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw, self.location.href);

    if (url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function cleanVibrate(value) {
  const fallback = [500, 150, 500, 150, 800];

  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && v >= 0 && v <= 2000)
    .slice(0, 10);

  return cleaned.length ? cleaned : fallback;
}

function cleanActions(value) {
  const fallback = [
    {
      action: "open_site",
      title: "Voir le site"
    },
    {
      action: "install_app",
      title: "Télécharger l’app"
    }
  ];

  if (!Array.isArray(value)) {
    return fallback;
  }

  const allowedActions = new Set(["open_site", "install_app"]);

  const cleaned = value
    .map(action => ({
      action: String(action?.action || "").trim(),
      title: String(action?.title || "").trim().slice(0, 40)
    }))
    .filter(action => allowedActions.has(action.action) && action.title)
    .slice(0, 2);

  return cleaned.length ? cleaned : fallback;
}

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const data = event.notification.data || {};

  let targetUrl = data.url || DEFAULT_URL;

  if (event.action === "open_site") {
    targetUrl = data.site_url || data.url || DEFAULT_URL;
  }

  if (event.action === "install_app") {
    targetUrl = data.playstore_url || DEFAULT_PLAYSTORE_URL;
  }

  event.waitUntil(openOrFocusUrl(targetUrl));
});

async function openOrFocusUrl(url) {
  const finalUrl = cleanNotificationUrl(url) || DEFAULT_URL;

  const clientList = await clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  for (const client of clientList) {
    if ("focus" in client) {
      try {
        await client.navigate(finalUrl);
        return client.focus();
      } catch {
        return client.focus();
      }
    }
  }

  if (clients.openWindow) {
    return clients.openWindow(finalUrl);
  }

  return undefined;
}
