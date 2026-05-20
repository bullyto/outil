/*
  Configuration ADN66 Push

  Étape actuelle :
  - GitHub Pages héberge ces fichiers statiques.
  - Le Worker Cloudflare sera ajouté ensuite.

  Quand le Worker sera prêt, remplacer WORKER_BASE_URL par son URL finale.
*/
window.ADN_PUSH_CONFIG = {
  WORKER_BASE_URL: "https://VOTRE-WORKER.workers.dev",

  // Clé publique VAPID à remplacer après génération côté Cloudflare / Web Push.
  VAPID_PUBLIC_KEY: "A_REMPLACER_PAR_LA_CLE_PUBLIQUE_VAPID",

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
