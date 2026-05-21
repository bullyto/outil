/*
  ADN66 Push - admin.js complet
  Emplacement GitHub :
  /apps/PUSH/admin.js

  Modifications :
  - image grande séparée de l’icône ; elle n’est plus remplacée par l’icône par défaut ;
  - choix des liens boutons : Apéro de Nuit 66 ou Apéro Catalan ;
  - choix de l’icône : automatique, Apéro de Nuit 66 ou Apéro Catalan ;
  - notification forte par défaut ;
  - envoi des champs utiles uniquement pour l’affichage et les clics.
*/

const cfg = window.ADN_PUSH_CONFIG;

const sendForm = document.getElementById("sendForm");
const scheduleForm = document.getElementById("scheduleForm");
const adminStatus = document.getElementById("adminStatus");

const statTotal = document.getElementById("statTotal");
const statApero = document.getElementById("statApero");
const statCatalan = document.getElementById("statCatalan");
const statX = document.getElementById("statX");

const instantTabBtn = document.getElementById("instantTabBtn");
const scheduledTabBtn = document.getElementById("scheduledTabBtn");
const instantPanel = document.getElementById("instantPanel");
const scheduledPanel = document.getElementById("scheduledPanel");

const adminKeyInput = document.getElementById("adminKey");
const scheduleAdminKeyInput = document.getElementById("scheduleAdminKey");

const DEFAULT_BRAND_KEY = "apero";
const DEFAULT_TAG = "adn66-alerte";
const DEFAULT_VIBRATE = [500, 150, 500, 150, 800];
const DEFAULT_ACTIONS = [
  {
    action: "open_site",
    title: "Voir le site"
  },
  {
    action: "install_app",
    title: "Télécharger l’app"
  }
];

const FALLBACK_BRANDS = {
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
};

function getBrands() {
  return {
    ...FALLBACK_BRANDS,
    ...(cfg?.BRANDS || {})
  };
}

function getBrand(brandKey) {
  const brands = getBrands();
  return brands[brandKey] || brands[DEFAULT_BRAND_KEY] || FALLBACK_BRANDS.apero;
}

function setAdminStatus(message, type = "") {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  adminStatus.className = "status " + type;
}

function isWorkerConfigured() {
  return cfg && cfg.WORKER_BASE_URL && !cfg.WORKER_BASE_URL.includes("VOTRE-WORKER");
}

function setActiveTab(tabName) {
  const isInstant = tabName === "instant";

  if (instantTabBtn) {
    instantTabBtn.classList.toggle("active", isInstant);
    instantTabBtn.setAttribute("aria-selected", isInstant ? "true" : "false");
  }

  if (scheduledTabBtn) {
    scheduledTabBtn.classList.toggle("active", !isInstant);
    scheduledTabBtn.setAttribute("aria-selected", !isInstant ? "true" : "false");
  }

  if (instantPanel) {
    instantPanel.classList.toggle("active", isInstant);
    instantPanel.hidden = !isInstant;
  }

  if (scheduledPanel) {
    scheduledPanel.classList.toggle("active", !isInstant);
    scheduledPanel.hidden = isInstant;
  }

  setAdminStatus(
    isInstant
      ? "Mode notification instantanée."
      : "Mode notification programmée. Le Worker de programmation sera ajouté ensuite.",
    isInstant ? "success" : "warn"
  );
}

function syncAdminKeys(source) {
  if (!adminKeyInput || !scheduleAdminKeyInput) return;

  if (source === "instant") {
    scheduleAdminKeyInput.value = adminKeyInput.value;
  } else {
    adminKeyInput.value = scheduleAdminKeyInput.value;
  }
}

function normalizeHttpsUrl(value, allowEmpty = true) {
  const raw = String(value || "").trim();

  if (!raw) {
    return allowEmpty ? "" : null;
  }

  try {
    const url = new URL(raw, window.location.href);

    if (url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getSelectedBrand(prefix = "") {
  const elementId = prefix ? `${prefix}BrandChoice` : "brandChoice";
  const brandKey = document.getElementById(elementId)?.value || DEFAULT_BRAND_KEY;
  return getBrand(brandKey);
}

function getSelectedIconBrand(prefix = "") {
  const brand = getSelectedBrand(prefix);
  const elementId = prefix ? `${prefix}IconChoice` : "iconChoice";
  const choice = document.getElementById(elementId)?.value || "auto";

  if (choice === "auto") {
    return brand;
  }

  return getBrand(choice);
}

function getImageUrl(inputId) {
  const raw = document.getElementById(inputId)?.value?.trim() || "";

  if (!raw) {
    return "";
  }

  const imageUrl = normalizeHttpsUrl(raw);

  if (!imageUrl) {
    throw new Error("URL de l’image grande invalide. Elle doit commencer par https:// et ouvrir directement une image.");
  }

  return imageUrl;
}

function buildNotificationPayload({ target, title, body, brand, iconBrand, imageUrl }) {
  const siteUrl = normalizeHttpsUrl(brand.siteUrl, false) || FALLBACK_BRANDS.apero.siteUrl;
  const playstoreUrl = normalizeHttpsUrl(brand.playstoreUrl, false) || FALLBACK_BRANDS.apero.playstoreUrl;
  const iconUrl = normalizeHttpsUrl(iconBrand.iconUrl, false) || FALLBACK_BRANDS.apero.iconUrl;
  const badgeUrl = normalizeHttpsUrl(iconBrand.badgeUrl, true) || "";

  return {
    target,
    title,
    body,
    url: siteUrl,
    site_url: siteUrl,
    playstore_url: playstoreUrl,
    icon_url: iconUrl,
    image_url: imageUrl || "",
    badge_url: badgeUrl,
    tag: DEFAULT_TAG,
    renotify: true,
    require_interaction: true,
    silent: false,
    vibrate: DEFAULT_VIBRATE,
    actions: DEFAULT_ACTIONS
  };
}

async function loadStats() {
  if (!isWorkerConfigured()) {
    setAdminStatus("Page admin prête. Les statistiques fonctionneront après ajout du Worker Cloudflare.", "warn");
    return;
  }

  try {
    const adminKey = (adminKeyInput?.value || scheduleAdminKeyInput?.value || "").trim();

    const response = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/stats`, {
      headers: {
        "X-Admin-Key": adminKey
      }
    });

    if (!response.ok) {
      throw new Error("Stats indisponibles : " + response.status);
    }

    const data = await response.json();

    if (statTotal) statTotal.textContent = data.total ?? 0;
    if (statApero) statApero.textContent = data.targets?.apero ?? 0;
    if (statCatalan) statCatalan.textContent = data.targets?.catalan ?? 0;
    if (statX) statX.textContent = data.targets?.x ?? 0;

    setAdminStatus("Statistiques chargées.", "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Erreur stats : " + error.message, "error");
  }
}

async function sendNotification(event) {
  event.preventDefault();

  const adminKey = adminKeyInput.value.trim();
  const target = document.getElementById("target").value;
  const title = document.getElementById("title").value.trim();
  const body = document.getElementById("body").value.trim();
  const brand = getSelectedBrand("");
  const iconBrand = getSelectedIconBrand("");

  let imageUrl = "";

  try {
    imageUrl = getImageUrl("imageUrl");
  } catch (error) {
    setAdminStatus(error.message, "error");
    return;
  }

  if (!adminKey) {
    setAdminStatus("Code admin obligatoire.", "warn");
    return;
  }

  if (!title || !body) {
    setAdminStatus("Titre et message obligatoires.", "warn");
    return;
  }

  if (!isWorkerConfigured()) {
    setAdminStatus("Impossible d’envoyer : l’URL du Worker Cloudflare n’est pas encore configurée.", "warn");
    return;
  }

  try {
    const payload = buildNotificationPayload({
      target,
      title,
      body,
      brand,
      iconBrand,
      imageUrl
    });

    const response = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Erreur Worker : " + response.status);
    }

    const result = await response.json();

    setAdminStatus(
      `Notification envoyée. Succès : ${result.sent_count ?? 0}, échecs : ${result.failed_count ?? 0}. Site : ${payload.site_url}. Image : ${payload.image_url || "aucune image grande"}`,
      "success"
    );

    await loadStats();
  } catch (error) {
    console.error(error);
    setAdminStatus("Erreur envoi : " + error.message, "error");
  }
}

async function saveSchedule(event) {
  event.preventDefault();

  const adminKey = scheduleAdminKeyInput.value.trim();
  const target = document.getElementById("scheduleTarget").value;
  const mode = document.getElementById("scheduleMode").value;
  const weekday = document.getElementById("scheduleWeekday").value;
  const date = document.getElementById("scheduleDate").value;
  const time = document.getElementById("scheduleTime").value;
  const title = document.getElementById("scheduleTitle").value.trim();
  const body = document.getElementById("scheduleBody").value.trim();
  const brand = getSelectedBrand("schedule");
  const iconBrand = getSelectedIconBrand("schedule");

  let imageUrl = "";

  try {
    imageUrl = getImageUrl("scheduleImageUrl");
  } catch (error) {
    setAdminStatus(error.message, "error");
    return;
  }

  if (!adminKey) {
    setAdminStatus("Code admin obligatoire.", "warn");
    return;
  }

  if (!title || !body) {
    setAdminStatus("Titre et message obligatoires.", "warn");
    return;
  }

  if (!time) {
    setAdminStatus("Heure d’envoi obligatoire.", "warn");
    return;
  }

  if (mode === "once" && !date) {
    setAdminStatus("Pour une notification unique, la date précise est obligatoire.", "warn");
    return;
  }

  if ((mode === "weekly" || mode === "rotation") && weekday === "") {
    setAdminStatus("Pour une programmation hebdomadaire ou en rotation, choisissez un jour de la semaine.", "warn");
    return;
  }

  if (!isWorkerConfigured()) {
    setAdminStatus("Impossible d’enregistrer : l’URL du Worker Cloudflare n’est pas encore configurée.", "warn");
    return;
  }

  try {
    const notificationPayload = buildNotificationPayload({
      target,
      title,
      body,
      brand,
      iconBrand,
      imageUrl
    });

    const schedulePayload = {
      target,
      mode,
      weekday,
      date,
      time,
      ...notificationPayload
    };

    const response = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey
      },
      body: JSON.stringify(schedulePayload)
    });

    if (!response.ok) {
      const text = await response.text();

      if (response.status === 404) {
        throw new Error("La route de programmation n’existe pas encore dans le Worker. On l’ajoutera à l’étape suivante.");
      }

      throw new Error(text || "Erreur Worker : " + response.status);
    }

    const result = await response.json();

    setAdminStatus(
      `Programmation enregistrée${result.id ? " #" + result.id : ""}. Site : ${notificationPayload.site_url}. Image : ${notificationPayload.image_url || "aucune image grande"}`,
      "success"
    );
  } catch (error) {
    console.error(error);
    setAdminStatus("Erreur programmation : " + error.message, "error");
  }
}

if (instantTabBtn) {
  instantTabBtn.addEventListener("click", () => setActiveTab("instant"));
}

if (scheduledTabBtn) {
  scheduledTabBtn.addEventListener("click", () => setActiveTab("scheduled"));
}

if (sendForm) {
  sendForm.addEventListener("submit", sendNotification);
}

if (scheduleForm) {
  scheduleForm.addEventListener("submit", saveSchedule);
}

if (adminKeyInput) {
  adminKeyInput.addEventListener("input", () => syncAdminKeys("instant"));
  adminKeyInput.addEventListener("change", loadStats);
}

if (scheduleAdminKeyInput) {
  scheduleAdminKeyInput.addEventListener("input", () => syncAdminKeys("scheduled"));
  scheduleAdminKeyInput.addEventListener("change", loadStats);
}

setActiveTab("instant");
loadStats();
