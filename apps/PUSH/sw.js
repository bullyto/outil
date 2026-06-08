/*
  ADN66 Push - sw.js complet avancé
  Emplacement GitHub :
  /apps/PUSH/sw.js

  Fonctions :
  - récupère la dernière notification via /push/latest
  - affiche title/body/icon_url/image_url/badge_url
  - gère tag, renotify, requireInteraction, silent, vibrate
  - gère les boutons d’action :
      install_app -> playstore_url
  - clic normal sur la notification -> site
  - choix retenu : pas de bouton "Voir le site" car Android/Chrome inverse les actions quand il y a 2 boutons sur certains téléphones
*/

const CACHE_NAME = "adn66-push-v15-history-phrases-desabo";
const WORKER_BASE_URL = "https://adn66-push.apero-nuit-du-66.workers.dev";

const DEFAULT_ICON = "https://bullyto.github.io/outil/apps/PUSH/icons/icon-adn66-192.png";
const DEFAULT_BADGE = "https://bullyto.github.io/outil/apps/PUSH/icons/badge-adn66-96.png";
const DEFAULT_URL = "https://aperos.net/";
const DEFAULT_PLAYSTORE_URL = "https://play.google.com/store/apps/details?id=fr.aperos.nuit66";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./config.js",
  "./app.js",
  "./admin.js",
  "./images.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-adn66-192.png",
  "./icons/icon-adn66-512.png",
  "./icons/icon-catalan-192.png",
  "./icons/icon-catalan-512.png",
  "./icons/badge-adn66-96.png",
  "./icons/badge-catalan-96.png"
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

  const iconUrl = cleanNotificationImageUrl(firstValue(
    payload.icon_url,
    payload.icon,
    payload.iconUrl
  )) || DEFAULT_ICON;

  const badgeUrl = cleanNotificationImageUrl(firstValue(
    payload.badge_url,
    payload.badge,
    payload.badgeUrl
  )) || "";

  // Grande image : on accepte plusieurs noms de champs.
  // Si le Worker renvoie par erreur l’icône comme image, on l’ignore pour éviter
  // d’afficher le logo en grand à la place de l’image promo.
  const rawImageUrl = firstValue(
    payload.image_url,
    payload.image,
    payload.imageUrl,
    payload.big_image_url,
    payload.large_image_url
  );
  const imageUrl = cleanLargeImageUrl(rawImageUrl, iconUrl);

  // Liens : "Voir le site" ne doit jamais ouvrir le Play Store.
  const rawClickUrl = firstValue(payload.url, payload.site_url, DEFAULT_URL);
  const clickUrl = cleanSiteUrl(rawClickUrl) || DEFAULT_URL;

  const rawSiteUrl = firstValue(payload.site_url, payload.url, DEFAULT_URL);
  const siteUrl = cleanSiteUrl(rawSiteUrl) || clickUrl || DEFAULT_URL;

  const rawInstallUrl = firstValue(
    payload.install_url,
    payload.playstore_url,
    payload.app_url,
    payload.download_url,
    DEFAULT_PLAYSTORE_URL
  );
  const installUrl = cleanNotificationUrl(rawInstallUrl) || DEFAULT_PLAYSTORE_URL;

  const options = {
    body: cleanText(payload.body) || "Service ouvert ce soir.",
    icon: iconUrl,
    data: {
      url: clickUrl,
      site_url: siteUrl,
      install_url: installUrl,
      playstore_url: installUrl,
      target: payload.target || "all"
    },
    tag: cleanTag(payload.tag) || "adn66-alerte",
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.require_interaction),
    silent: Boolean(payload.silent),
    vibrate: cleanVibrate(payload.vibrate),
    // Solution fiable Android/Chrome : 1 seul bouton action.
    // Le clic sur la notification complète ouvre le site.
    // Deux boutons affichés, mais les deux ouvrent volontairement le site.
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
    install_url: DEFAULT_PLAYSTORE_URL,
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

function firstValue(...values) {
  for (const value of values) {
    const text = String(value || "").trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function isPlayStoreUrl(value) {
  const url = cleanNotificationUrl(value);

  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("play.google.com");
  } catch {
    return false;
  }
}

function cleanSiteUrl(value) {
  const url = cleanNotificationUrl(value);

  if (!url || isPlayStoreUrl(url)) {
    return "";
  }

  return url;
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

function cleanLargeImageUrl(value, iconUrl = "") {
  const imageUrl = cleanNotificationImageUrl(value);

  if (!imageUrl) {
    return "";
  }

  const normalizedImage = imageUrl.toLowerCase();
  const normalizedIcon = String(iconUrl || "").toLowerCase();

  // Sécurité : si le Worker renvoie l’icône comme grande image par défaut,
  // on ne l’utilise pas comme image large.
  if (normalizedIcon && normalizedImage === normalizedIcon) {
    return "";
  }

  if (normalizedImage.includes("/apps/push/icons/icon-") || normalizedImage.includes("/apps/push/icons/badge-")) {
    return "";
  }

  return imageUrl;
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
  // On ignore volontairement les actions venant du Worker/D1.
  // On affiche deux boutons, mais dans notificationclick les deux ouvrent le site.
  return [
    {
      action: "open_site",
      title: "Voir le site"
    },
    {
      action: "install_app",
      title: "Télécharger l’app"
    }
  ];
}

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const data = event.notification.data || {};
  const target = String(data.target || "").toLowerCase();
  const urlText = String(data.url || "").toLowerCase();
  const siteText = String(data.site_url || "").toLowerCase();

  const isCatalan =
    target === "catalan" ||
    urlText.includes("catalan.aperos.net") ||
    siteText.includes("catalan.aperos.net");

  const siteUrl = isCatalan
    ? "https://catalan.aperos.net/"
    : "https://aperos.net/";

  // Choix demandé : les deux boutons ouvrent le site.
  // - clic sur la notification complète = site
  // - bouton Voir le site = site
  // - bouton Télécharger l’app = site aussi
  // Aucun clic de cette notification n’ouvre le Play Store dans cette version.
  const targetUrl = siteUrl;

  event.waitUntil(openCleanWindow(targetUrl));
});

async function openCleanWindow(url) {
  const finalUrl = cleanNotificationUrl(url) || DEFAULT_URL;

  if (clients.openWindow) {
    return clients.openWindow(finalUrl);
  }

  return undefined;
}
