/*
  Configuration ADN66 Push
  GitHub Pages + Cloudflare Worker
*/
window.ADN_PUSH_CONFIG = {
  WORKER_BASE_URL: "https://adn66-push.apero-nuit-du-66.workers.dev",

  VAPID_PUBLIC_KEY: "BG7Vo1rUSIoCQSqEx-tS91696VwWDpxAl65__ilnZW-eKP7Bzu8HrHhsRT8J0gI5aZ0-wPmIXDhNdb-iQ5LsCS8",

  DEFAULT_TARGET: "apero",

  BRANDS: {
    apero: {
      label: "Apéro de Nuit 66",
      siteUrl: "https://aperos.net/",
      playstoreUrl: "https://play.google.com/store/apps/details?id=fr.aperos.nuit66",
      iconUrl: "https://bullyto.github.io/outil/apps/PUSH/icons/icon-adn66-192.png",
      badgeUrl: "https://bullyto.github.io/outil/apps/PUSH/icons/badge-adn66-96.png"
    },
    catalan: {
      label: "Apéro Catalan",
      siteUrl: "https://catalan.aperos.net/",
      playstoreUrl: "https://play.google.com/store/apps/details?id=net.aperos.catalan",
      iconUrl: "https://bullyto.github.io/outil/apps/PUSH/icons/icon-catalan-192.png",
      badgeUrl: "https://bullyto.github.io/outil/apps/PUSH/icons/badge-catalan-96.png"
    }
  },

  TARGETS: {
    apero: {
      label: "Apéro de Nuit 66",
      defaultUrl: "https://aperos.net/"
    },
    catalan: {
      label: "Apéro Catalan",
      defaultUrl: "https://catalan.aperos.net/"
    },
    x: {
      label: "X — futur projet",
      defaultUrl: "https://aperos.net/"
    }
  }
};
