/*
  Configuration ADN66 Push
  GitHub Pages + Cloudflare Worker
*/
window.ADN_PUSH_CONFIG = {
  WORKER_BASE_URL: "https://adn66-push.apero-nuit-du-66.workers.dev",

  VAPID_PUBLIC_KEY: "BG7Vo1rUSIoCQSqEx-tS91696VwWDpxAl65__ilnZW-eKP7Bzu8HrHhsRT8J0gI5aZ0-wPmIXDhNdb-iQ5LsCS8",

  DEFAULT_TARGET: "apero",

  TARGETS: {
    apero: {
      label: "Apéro de Nuit 66",
      defaultUrl: "https://aperos.net"
    },
    catalan: {
      label: "Apéro Catalan",
      defaultUrl: "https://catalan.aperos.net"
    },
    x: {
      label: "X — futur projet",
      defaultUrl: "https://aperos.net"
    }
  }
};
