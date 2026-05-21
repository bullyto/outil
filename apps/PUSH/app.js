/*
  ADN66 Push - app.js complet
  Emplacement GitHub :
  /apps/PUSH/app.js

  Objectif :
  - bouton discret côté UX : "Recevoir les offres et alertes"
  - le navigateur affiche sa popup officielle d’autorisation
  - gestion intelligente :
    default  = demande possible
    granted  = déjà autorisé / resynchronisation D1
    denied   = bloqué dans le navigateur
  - si la popup est ignorée / fermée : cooldown local de 5 minutes
  - compatible avec plusieurs boutons sur une même page via :
    [data-push-subscribe]
    [data-push-unsubscribe]
*/

const cfg = window.ADN_PUSH_CONFIG;

const statusEl = document.getElementById("status");
const targetSelect = document.getElementById("targetSelect");

const subscribeButtons = [
  ...document.querySelectorAll("#subscribeBtn, [data-push-subscribe]")
];

const unsubscribeButtons = [
  ...document.querySelectorAll("#unsubscribeBtn, [data-push-unsubscribe]")
];

const DEFAULT_SUBSCRIBE_TEXT = "Recevoir les offres et alertes";
const ACTIVE_SUBSCRIBE_TEXT = "Alertes activées";
const DEFAULT_UNSUBSCRIBE_TEXT = "Ne plus recevoir les alertes";

const COOLDOWN_KEY = "adn66_push_ignored_cooldown_until";
const IGNORE_COOLDOWN_MS = 5 * 60 * 1000;

function setStatus(message, type = "") {
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = "status " + type;
}

function saveDefaultButtonTexts() {
  subscribeButtons.forEach((button) => {
    if (!button.dataset.defaultText) {
      const currentText = (button.textContent || "").trim();
      button.dataset.defaultText = currentText || DEFAULT_SUBSCRIBE_TEXT;
    }
  });

  unsubscribeButtons.forEach((button) => {
    if (!button.dataset.defaultText) {
      const currentText = (button.textContent || "").trim();
      button.dataset.defaultText = currentText || DEFAULT_UNSUBSCRIBE_TEXT;
    }
  });
}

function setButtonsState(isSubscribed) {
  subscribeButtons.forEach((button) => {
    button.dataset.subscribed = isSubscribed ? "1" : "0";
    button.setAttribute("aria-pressed", isSubscribed ? "true" : "false");

    if (isSubscribed) {
      button.textContent = ACTIVE_SUBSCRIBE_TEXT;
      button.classList.add("is-active");
    } else {
      button.textContent = button.dataset.defaultText || DEFAULT_SUBSCRIBE_TEXT;
      button.classList.remove("is-active");
    }
  });
}

function setButtonsDisabled(disabled) {
  subscribeButtons.forEach((button) => {
    button.disabled = disabled;
  });

  unsubscribeButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function setIgnoredCooldown() {
  const until = Date.now() + IGNORE_COOLDOWN_MS;
  localStorage.setItem(COOLDOWN_KEY, String(until));
}

function clearIgnoredCooldown() {
  localStorage.removeItem(COOLDOWN_KEY);
}

function getIgnoredCooldownRemainingMs() {
  const raw = localStorage.getItem(COOLDOWN_KEY);
  const until = Number(raw || 0);

  if (!until || Number.isNaN(until)) {
    return 0;
  }

  const remaining = until - Date.now();

  if (remaining <= 0) {
    clearIgnoredCooldown();
    return 0;
  }

  return remaining;
}

function formatRemainingMinutes(ms) {
  const minutes = Math.ceil(ms / 60000);
  return Math.max(1, minutes);
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
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

function getTargetFromButton(button) {
  const targetFromButton = button?.dataset?.target;

  if (targetFromButton) {
    return targetFromButton;
  }

  if (targetSelect && targetSelect.value) {
    return targetSelect.value;
  }

  return cfg.DEFAULT_TARGET || "apero";
}

function getDeniedMessage() {
  return "Les alertes sont bloquées dans votre navigateur. Pour les recevoir à nouveau, autorisez-les dans les paramètres du site.";
}

function getUnsupportedMessage() {
  return "Les alertes ne sont pas compatibles avec ce navigateur.";
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker non compatible avec ce navigateur.");
  }

  return navigator.serviceWorker.register("./sw.js", {
    scope: "./"
  });
}

async function getReadyRegistration() {
  await registerServiceWorker();
  return navigator.serviceWorker.ready;
}

async function saveSubscriptionToWorker(subscription, target) {
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

  return response.json();
}

async function getExistingSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("./");

  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

async function createOrRefreshSubscription(target) {
  const registration = await getReadyRegistration();

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.VAPID_PUBLIC_KEY)
    });
  }

  await saveSubscriptionToWorker(subscription, target);

  return subscription;
}

async function subscribe(event) {
  const button = event?.currentTarget || null;
  const target = getTargetFromButton(button);

  try {
    setButtonsDisabled(true);

    if (!("Notification" in window)) {
      setStatus(getUnsupportedMessage(), "error");
      setButtonsState(false);
      return;
    }

    if (!("PushManager" in window)) {
      setStatus(getUnsupportedMessage(), "error");
      setButtonsState(false);
      return;
    }

    if (!isConfigReady()) {
      setStatus("Configuration incomplète : service indisponible pour le moment.", "warn");
      setButtonsState(false);
      return;
    }

    if (Notification.permission === "denied") {
      setStatus(getDeniedMessage(), "error");
      setButtonsState(false);
      return;
    }

    if (Notification.permission === "default") {
      const cooldownRemaining = getIgnoredCooldownRemainingMs();

      if (cooldownRemaining > 0) {
        const minutes = formatRemainingMinutes(cooldownRemaining);
        setStatus(`Vous pourrez réessayer dans environ ${minutes} min.`, "warn");
        setButtonsState(false);
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        clearIgnoredCooldown();
        setStatus(getDeniedMessage(), "error");
        setButtonsState(false);
        return;
      }

      if (permission !== "granted") {
        setIgnoredCooldown();
        setStatus("Action annulée. Vous pourrez réessayer dans 5 min.", "warn");
        setButtonsState(false);
        return;
      }

      clearIgnoredCooldown();
    }

    await createOrRefreshSubscription(target);

    clearIgnoredCooldown();
    setStatus("C’est activé sur cet appareil.", "success");
    setButtonsState(true);
  } catch (error) {
    console.error(error);
    setStatus("Erreur : " + error.message, "error");
  } finally {
    setButtonsDisabled(false);
  }
}

async function unsubscribe() {
  try {
    setButtonsDisabled(true);

    const registration = await navigator.serviceWorker.getRegistration("./");

    if (!registration) {
      setStatus("Aucune alerte active sur cet appareil.", "warn");
      setButtonsState(false);
      return;
    }

    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      setStatus("Aucune alerte active sur cet appareil.", "warn");
      setButtonsState(false);
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

    setStatus("C’est désactivé sur cet appareil.", "success");
    setButtonsState(false);
  } catch (error) {
    console.error(error);
    setStatus("Erreur : " + error.message, "error");
  } finally {
    setButtonsDisabled(false);
  }
}

async function refreshState() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    setStatus(getUnsupportedMessage(), "error");
    setButtonsState(false);
    return;
  }

  if (!isConfigReady()) {
    setStatus("Service temporairement indisponible.", "warn");
    setButtonsState(false);
    return;
  }

  if (Notification.permission === "denied") {
    setStatus(getDeniedMessage(), "error");
    setButtonsState(false);
    return;
  }

  if (Notification.permission === "default") {
    const cooldownRemaining = getIgnoredCooldownRemainingMs();

    if (cooldownRemaining > 0) {
      const minutes = formatRemainingMinutes(cooldownRemaining);
      setStatus(`Vous pourrez réessayer dans environ ${minutes} min.`, "warn");
      setButtonsState(false);
      return;
    }

    setStatus("Recevez les offres, ouvertures et infos importantes.", "success");
    setButtonsState(false);
    return;
  }

  try {
    await registerServiceWorker();

    const subscription = await getExistingSubscription();

    if (subscription) {
      const target = targetSelect?.value || cfg.DEFAULT_TARGET || "apero";

      await saveSubscriptionToWorker(subscription, target);

      clearIgnoredCooldown();
      setStatus("C’est déjà activé sur cet appareil.", "success");
      setButtonsState(true);
      return;
    }

    setStatus("Cliquez pour finaliser l’activation sur cet appareil.", "warn");
    setButtonsState(false);
  } catch (error) {
    console.warn(error);
    setStatus("Recevez les offres, ouvertures et infos importantes.", "success");
    setButtonsState(false);
  }
}

async function init() {
  saveDefaultButtonTexts();

  if (targetSelect) {
    targetSelect.value = cfg.DEFAULT_TARGET || "apero";

    targetSelect.addEventListener("change", async () => {
      if ("Notification" in window && Notification.permission === "granted") {
        await refreshState();
      }
    });
  }

  subscribeButtons.forEach((button) => {
    button.addEventListener("click", subscribe);
  });

  unsubscribeButtons.forEach((button) => {
    button.addEventListener("click", unsubscribe);
  });

  await refreshState();
}

init();
