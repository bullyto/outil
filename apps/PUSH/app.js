const cfg = window.ADN_PUSH_CONFIG;

const statusEl = document.getElementById("status");
const subscribeBtn = document.getElementById("subscribeBtn");
const unsubscribeBtn = document.getElementById("unsubscribeBtn");
const targetSelect = document.getElementById("targetSelect");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = "status " + type;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function isConfigReady() {
  return (
    cfg &&
    cfg.WORKER_BASE_URL &&
    !cfg.WORKER_BASE_URL.includes("VOTRE-WORKER") &&
    cfg.VAPID_PUBLIC_KEY &&
    !cfg.VAPID_PUBLIC_KEY.includes("A_REMPLACER")
  );
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker non compatible avec ce navigateur.");
  }

  return navigator.serviceWorker.register("./sw.js", {
    scope: "./"
  });
}

async function subscribe() {
  try {
    if (!("Notification" in window)) {
      setStatus("Les notifications ne sont pas compatibles avec ce navigateur.", "error");
      return;
    }

    if (!("PushManager" in window)) {
      setStatus("Le Push Web n’est pas compatible avec ce navigateur.", "error");
      return;
    }

    if (!isConfigReady()) {
      setStatus(
        "Dossier GitHub prêt. Il faudra ajouter l’URL Worker et la clé VAPID publique après la configuration Cloudflare.",
        "warn"
      );
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setStatus("Autorisation refusée ou ignorée. Aucune inscription effectuée.", "warn");
      return;
    }

    const registration = await registerServiceWorker();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.VAPID_PUBLIC_KEY)
    });

    const target = targetSelect.value || cfg.DEFAULT_TARGET;

    const response = await fetch(`${cfg.WORKER_BASE_URL}/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        target,
        subscription,
        userAgent: navigator.userAgent
      })
    });

    if (!response.ok) {
      throw new Error("Erreur Worker : " + response.status);
    }

    setStatus("Notifications activées sur cet appareil.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Erreur : " + error.message, "error");
  }
}

async function unsubscribe() {
  try {
    const registration = await navigator.serviceWorker.getRegistration("./");
    if (!registration) {
      setStatus("Aucune inscription trouvée sur cet appareil.", "warn");
      return;
    }

    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      setStatus("Aucune notification active sur cet appareil.", "warn");
      return;
    }

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    if (isConfigReady()) {
      await fetch(`${cfg.WORKER_BASE_URL}/push/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ endpoint })
      });
    }

    setStatus("Notifications désactivées sur cet appareil.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Erreur : " + error.message, "error");
  }
}

async function init() {
  targetSelect.value = cfg.DEFAULT_TARGET || "apero";

  try {
    await registerServiceWorker();
  } catch (error) {
    console.warn(error);
  }

  if (!isConfigReady()) {
    setStatus("Dossier GitHub prêt. Cloudflare Worker à configurer ensuite.", "warn");
  } else {
    setStatus("Prêt à activer les notifications.", "success");
  }
}

subscribeBtn.addEventListener("click", subscribe);
unsubscribeBtn.addEventListener("click", unsubscribe);

init();
