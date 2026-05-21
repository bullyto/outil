/*
  ADN66 Push - admin.js complet
  Emplacement GitHub :
  /apps/PUSH/admin.js

  Modifications :
  - image grande séparée de l’icône ; elle n’est plus remplacée par l’icône par défaut ;
  - choix des liens boutons : Apéro de Nuit 66 ou Apéro Catalan ;
  - choix de l’icône : automatique, Apéro de Nuit 66 ou Apéro Catalan ;
  - galerie automatique des images depuis GitHub API (/apps/PUSH/images/) ;
  - aperçu, URL, copie et sélection de l’image grande ;
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

const imageGallerySelect = document.getElementById("imageGallerySelect");
const scheduleImageGallerySelect = document.getElementById("scheduleImageGallerySelect");
const refreshImageGalleryBtn = document.getElementById("refreshImageGallery");
const scheduleRefreshImageGalleryBtn = document.getElementById("scheduleRefreshImageGallery");
const imageGalleryStatus = document.getElementById("imageGalleryStatus");
const scheduleImageGalleryStatus = document.getElementById("scheduleImageGalleryStatus");
const copyImageUrlBtn = document.getElementById("copyImageUrl");
const scheduleCopyImageUrlBtn = document.getElementById("scheduleCopyImageUrl");

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

const GITHUB_IMAGES_API_URL = "https://api.github.com/repos/bullyto/outil/contents/apps/PUSH/images";
const GITHUB_PAGES_IMAGES_BASE_URL = "https://bullyto.github.io/outil/apps/PUSH/images/";
const SUPPORTED_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i;
let imageCatalog = [];
let imageCatalogLoaded = false;

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

function buildGithubPagesImageUrl(fileName) {
  return GITHUB_PAGES_IMAGES_BASE_URL + encodeURIComponent(fileName).replace(/%20/g, "%20");
}

function getImageElements(prefix = "") {
  const schedule = prefix === "schedule";

  return {
    select: document.getElementById(schedule ? "scheduleImageGallerySelect" : "imageGallerySelect"),
    hiddenInput: document.getElementById(schedule ? "scheduleImageUrl" : "imageUrl"),
    previewBox: document.getElementById(schedule ? "scheduleImagePreviewBox" : "imagePreviewBox"),
    preview: document.getElementById(schedule ? "scheduleImagePreview" : "imagePreview"),
    name: document.getElementById(schedule ? "scheduleImagePreviewName" : "imagePreviewName"),
    url: document.getElementById(schedule ? "scheduleImagePreviewUrl" : "imagePreviewUrl"),
    open: document.getElementById(schedule ? "scheduleOpenImageUrl" : "openImageUrl"),
    status: document.getElementById(schedule ? "scheduleImageGalleryStatus" : "imageGalleryStatus")
  };
}

function setImageGalleryStatus(message, type = "") {
  for (const element of [imageGalleryStatus, scheduleImageGalleryStatus]) {
    if (!element) continue;
    element.textContent = message;
    element.dataset.type = type;
  }
}

async function loadImageCatalog(force = false) {
  if (imageCatalogLoaded && !force) {
    return imageCatalog;
  }

  setImageGalleryStatus("Chargement des images depuis GitHub...", "loading");

  const response = await fetch(GITHUB_IMAGES_API_URL, {
    cache: "no-store",
    headers: {
      "Accept": "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    throw new Error("Impossible de lire le dossier images GitHub : " + response.status);
  }

  const files = await response.json();

  imageCatalog = (Array.isArray(files) ? files : [])
    .filter(file => file && file.type === "file" && SUPPORTED_IMAGE_EXTENSIONS.test(file.name || ""))
    .map(file => ({
      name: file.name,
      url: buildGithubPagesImageUrl(file.name),
      apiUrl: file.download_url || ""
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  imageCatalogLoaded = true;
  return imageCatalog;
}

function renderImageSelector(prefix = "") {
  const elements = getImageElements(prefix);

  if (!elements.select) {
    return;
  }

  const previousValue = elements.select.value;
  elements.select.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Aucune image grande";
  elements.select.appendChild(emptyOption);

  for (const image of imageCatalog) {
    const option = document.createElement("option");
    option.value = image.url;
    option.textContent = image.name;
    option.dataset.name = image.name;
    elements.select.appendChild(option);
  }

  if (previousValue && imageCatalog.some(image => image.url === previousValue)) {
    elements.select.value = previousValue;
  }

  updateSelectedImage(prefix);
}

function renderImageSelectors() {
  renderImageSelector("");
  renderImageSelector("schedule");

  const count = imageCatalog.length;
  setImageGalleryStatus(
    count
      ? `${count} image${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}.`
      : "Aucune image trouvée dans /apps/PUSH/images/.",
    count ? "success" : "warn"
  );
}

function updateSelectedImage(prefix = "") {
  const elements = getImageElements(prefix);

  if (!elements.select || !elements.hiddenInput) {
    return;
  }

  const selectedUrl = elements.select.value || "";
  const selectedImage = imageCatalog.find(image => image.url === selectedUrl);

  elements.hiddenInput.value = selectedUrl;

  if (!selectedUrl || !selectedImage) {
    if (elements.previewBox) elements.previewBox.hidden = true;
    if (elements.preview) elements.preview.removeAttribute("src");
    if (elements.name) elements.name.textContent = "—";
    if (elements.url) elements.url.textContent = "—";
    if (elements.open) elements.open.href = "#";
    return;
  }

  if (elements.previewBox) elements.previewBox.hidden = false;
  if (elements.preview) elements.preview.src = selectedUrl;
  if (elements.name) elements.name.textContent = selectedImage.name;
  if (elements.url) elements.url.textContent = selectedUrl;
  if (elements.open) elements.open.href = selectedUrl;
}

async function refreshImageGallery(force = false) {
  try {
    await loadImageCatalog(force);
    renderImageSelectors();
  } catch (error) {
    console.error(error);
    setImageGalleryStatus(error.message, "error");

    for (const prefix of ["", "schedule"]) {
      const elements = getImageElements(prefix);
      if (elements.select && !elements.select.options.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Erreur chargement images";
        elements.select.appendChild(option);
      }
    }
  }
}

async function copySelectedImageUrl(prefix = "") {
  const elements = getImageElements(prefix);
  const value = elements.hiddenInput?.value || "";

  if (!value) {
    setAdminStatus("Aucune image sélectionnée à copier.", "warn");
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    setAdminStatus("URL de l’image copiée.", "success");
  } catch {
    setAdminStatus("Copie impossible automatiquement. URL : " + value, "warn");
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

  const finalImageUrl = imageUrl || "";

  return {
    target,
    title,
    body,

    // Clic normal + bouton "Voir le site"
    url: siteUrl,
    site_url: siteUrl,

    // Bouton "Télécharger l’app"
    install_url: playstoreUrl,
    playstore_url: playstoreUrl,

    // Icône + badge choisis depuis l’admin
    icon_url: iconUrl,
    badge_url: badgeUrl,

    // Grande image choisie depuis l’admin.
    // Plusieurs alias sont envoyés pour rester compatible avec le Worker actuel
    // et avec les futures versions.
    image_url: finalImageUrl,
    image: finalImageUrl,
    imageUrl: finalImageUrl,
    big_image_url: finalImageUrl,
    large_image_url: finalImageUrl,

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


if (imageGallerySelect) {
  imageGallerySelect.addEventListener("change", () => updateSelectedImage(""));
}

if (scheduleImageGallerySelect) {
  scheduleImageGallerySelect.addEventListener("change", () => updateSelectedImage("schedule"));
}

if (refreshImageGalleryBtn) {
  refreshImageGalleryBtn.addEventListener("click", () => refreshImageGallery(true));
}

if (scheduleRefreshImageGalleryBtn) {
  scheduleRefreshImageGalleryBtn.addEventListener("click", () => refreshImageGallery(true));
}

if (copyImageUrlBtn) {
  copyImageUrlBtn.addEventListener("click", () => copySelectedImageUrl(""));
}

if (scheduleCopyImageUrlBtn) {
  scheduleCopyImageUrlBtn.addEventListener("click", () => copySelectedImageUrl("schedule"));
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
refreshImageGallery(false);
loadStats();
