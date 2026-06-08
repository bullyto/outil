/*
  ADN66 Push — admin refonte une page
  Admin prioritaire, mot de passe mémorisé localStorage, stats auto-refresh,
  historique prêt pour route Worker /admin/push/history.
*/
const cfg = window.ADN_PUSH_CONFIG || {};

const ADMIN_KEY_STORAGE = "adn66_admin_key";
const IMAGE_API = "https://api.github.com/repos/bullyto/outil/contents/apps/PUSH/images";
const IMAGE_BASE = "https://bullyto.github.io/outil/apps/PUSH/images/";
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

const $ = (id) => document.getElementById(id);

const adminStatus = $("adminStatus");
const statTotal = $("statTotal");
const statApero = $("statApero");
const statCatalan = $("statCatalan");
const statX = $("statX");
const statsUpdatedAt = $("statsUpdatedAt");
const historyList = $("historyList");
const historyStatus = $("historyStatus");
const imageSelect = $("imageGallerySelect");
const imageUrl = $("imageUrl");
const imagePreview = $("imagePreview");
const imagePreviewBox = $("imagePreviewBox");
const imageStatus = $("imageGalleryStatus");
const scheduleEnabled = $("scheduleEnabled");
const scheduleSlots = $("scheduleSlots");
const scheduleStateText = $("scheduleStateText");

let imageCatalog = [];
let statsTimer = null;
let historyTimer = null;

function setStatus(message, type = "") {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  adminStatus.className = "status" + (type ? " " + type : "");
}

function setMiniStatus(el, message, type = "") {
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
}

function isWorkerReady() {
  return cfg.WORKER_BASE_URL && !String(cfg.WORKER_BASE_URL).includes("VOTRE-WORKER");
}

function getAdminKey() {
  if (typeof window.adnAdminGateGetKey === "function") {
    const fromGate = window.adnAdminGateGetKey();
    if (fromGate) return fromGate;
  }
  try { return localStorage.getItem(ADMIN_KEY_STORAGE) || ""; } catch { return ""; }
}

function requireKey() {
  const key = getAdminKey().trim();
  if (!key) throw new Error("Mot de passe admin non mémorisé. Rechargez la page et reconnectez-vous.");
  return key;
}

function headers(json = false) {
  const h = { "X-Admin-Key": requireKey() };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function targetLabel(value) {
  return cfg.TARGETS?.[value]?.label || cfg.BRANDS?.[value]?.label || value || "Tous";
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).format(d);
}

function endpointShort(endpoint) {
  const raw = String(endpoint || "");
  if (!raw) return "—";
  return raw.length > 28 ? raw.slice(0, 16) + "…" + raw.slice(-8) : raw;
}

async function loadStats({ silent = false } = {}) {
  if (!isWorkerReady()) {
    if (!silent) setStatus("Worker Cloudflare non configuré.", "warn");
    return;
  }

  try {
    const res = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/stats`, {
      cache: "no-store",
      headers: headers(false)
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    if (statTotal) statTotal.textContent = data.total ?? 0;
    if (statApero) statApero.textContent = data.targets?.apero ?? 0;
    if (statCatalan) statCatalan.textContent = data.targets?.catalan ?? 0;
    if (statX) statX.textContent = data.targets?.x ?? 0;
    if (statsUpdatedAt) statsUpdatedAt.textContent = "MAJ " + new Intl.DateTimeFormat("fr-FR", {hour:"2-digit", minute:"2-digit", second:"2-digit"}).format(new Date());
    if (!silent) setStatus("Statistiques à jour.", "success");
  } catch (err) {
    if (!silent) setStatus("Stats indisponibles : " + err.message, "error");
  }
}

async function loadHistory({ silent = false } = {}) {
  if (!historyList || !isWorkerReady()) return;

  try {
    const res = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/history?limit=50`, {
      cache: "no-store",
      headers: headers(false)
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error("Route /admin/push/history à ajouter au Worker.");
      throw new Error("HTTP " + res.status);
    }
    const data = await res.json();
    const rows = data.history || data.items || data.rows || [];

    historyList.innerHTML = "";
    if (!rows.length) {
      historyList.innerHTML = `<div class="empty-box">Aucun historique pour le moment.</div>`;
    } else {
      for (const row of rows) {
        const action = row.action || row.event || "abonnement";
        const target = targetLabel(row.target);
        const created = formatDateTime(row.created_at || row.createdAt || row.date);
        const ua = row.user_agent || row.userAgent || row.device || "Appareil inconnu";
        const endpoint = endpointShort(row.endpoint);
        const item = document.createElement("article");
        item.className = "history-item";
        item.innerHTML = `
          <div>
            <strong>${created}</strong>
            <span>${action} — ${target}</span>
          </div>
          <small>${ua}</small>
          <code>${endpoint}</code>
        `;
        historyList.appendChild(item);
      }
    }
    setMiniStatus(historyStatus, "Historique à jour.", "success");
  } catch (err) {
    if (!silent) setMiniStatus(historyStatus, err.message, "warn");
  }
}

async function loadImages(force = false) {
  if (!imageSelect || (!force && imageCatalog.length)) return;
  setMiniStatus(imageStatus, "Chargement images…", "warn");
  try {
    const res = await fetch(IMAGE_API, { cache: "no-store", headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error("GitHub HTTP " + res.status);
    const files = await res.json();
    imageCatalog = (Array.isArray(files) ? files : [])
      .filter(f => f?.type === "file" && IMAGE_EXT.test(f.name || ""))
      .map(f => ({ name: f.name, url: IMAGE_BASE + encodeURIComponent(f.name).replace(/%20/g, "%20") }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

    imageSelect.innerHTML = `<option value="">Aucune image</option>`;
    for (const img of imageCatalog) {
      const opt = document.createElement("option");
      opt.value = img.url;
      opt.textContent = img.name;
      imageSelect.appendChild(opt);
    }
    setMiniStatus(imageStatus, `${imageCatalog.length} image(s) disponible(s).`, "success");
  } catch (err) {
    setMiniStatus(imageStatus, "Images indisponibles : " + err.message, "error");
  }
}

function updateImagePreview() {
  const url = imageSelect?.value || "";
  if (imageUrl) imageUrl.value = url;
  if (!imagePreviewBox || !imagePreview) return;
  if (!url) {
    imagePreviewBox.hidden = true;
    imagePreview.removeAttribute("src");
    return;
  }
  imagePreview.src = url;
  imagePreviewBox.hidden = false;
}

function getBrand(key) {
  return cfg.BRANDS?.[key] || cfg.BRANDS?.apero || {};
}

function cleanUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const u = new URL(raw, window.location.href);
  if (u.protocol !== "https:") throw new Error("URL image invalide : HTTPS obligatoire.");
  return u.toString();
}

async function sendNotification(e) {
  e.preventDefault();
  try {
    const target = $("target")?.value || "all";
    const brandKey = $("brandChoice")?.value || "apero";
    const iconKey = $("iconChoice")?.value === "auto" ? brandKey : ($("iconChoice")?.value || brandKey);
    const brand = getBrand(brandKey);
    const iconBrand = getBrand(iconKey);
    const title = $("title")?.value.trim() || "";
    const body = $("body")?.value.trim() || "";
    const img = cleanUrl($("imageUrl")?.value || "");

    if (!title || !body) throw new Error("Titre et message obligatoires.");
    if (!isWorkerReady()) throw new Error("Worker Cloudflare non configuré.");

    const payload = {
      target, title, body,
      url: brand.siteUrl || "https://aperos.net/",
      site_url: brand.siteUrl || "https://aperos.net/",
      install_url: brand.playstoreUrl || "https://play.google.com/store/apps/details?id=fr.aperos.nuit66",
      playstore_url: brand.playstoreUrl || "https://play.google.com/store/apps/details?id=fr.aperos.nuit66",
      icon_url: iconBrand.iconUrl || brand.iconUrl || "",
      badge_url: iconBrand.badgeUrl || brand.badgeUrl || "",
      image_url: img,
      tag: "adn66-alerte",
      renotify: true,
      require_interaction: true,
      silent: false,
      vibrate: [500, 150, 500, 150, 800]
    };

    setStatus("Envoi en cours…", "warn");
    const res = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/send`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text() || "HTTP " + res.status);
    const result = await res.json().catch(() => ({}));
    setStatus(`Notification envoyée. Succès : ${result.sent_count ?? 0} / Échecs : ${result.failed_count ?? 0}.`, "success");
    await Promise.allSettled([loadStats({ silent: true }), loadHistory({ silent: true })]);
  } catch (err) {
    setStatus("Erreur envoi : " + err.message, "error");
  }
}

const DAYS = [
  ["1", "Lundi"], ["2", "Mardi"], ["3", "Mercredi"], ["4", "Jeudi"],
  ["5", "Vendredi"], ["6", "Samedi"], ["0", "Dimanche"]
];

function createSlot(slot = { days: ["1"], time: "19:30" }) {
  if (!scheduleSlots) return;
  const row = document.createElement("div");
  row.className = "slot-row";
  row.innerHTML = `
    <select class="slot-day" multiple size="3">${DAYS.map(([v,l]) => `<option value="${v}" ${slot.days?.includes(v) ? "selected" : ""}>${l}</option>`).join("")}</select>
    <input class="slot-time" type="time" value="${slot.time || "19:30"}">
    <button class="secondary-btn danger-mini" type="button">Supprimer</button>
  `;
  row.querySelector("button").addEventListener("click", () => row.remove());
  scheduleSlots.appendChild(row);
}

function getSlots() {
  return [...document.querySelectorAll(".slot-row")].map(row => ({
    days: [...row.querySelector(".slot-day").selectedOptions].map(o => o.value),
    time: row.querySelector(".slot-time").value || "19:30"
  })).filter(s => s.days.length && s.time);
}

function updateScheduleText() {
  if (!scheduleStateText) return;
  scheduleStateText.textContent = scheduleEnabled?.checked ? "Programmation activée" : "Programmation désactivée";
}

async function loadSchedule() {
  if (!isWorkerReady()) return;
  try {
    const res = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/schedule-settings`, { cache: "no-store", headers: headers(false) });
    if (!res.ok) return;
    const data = await res.json();
    const settings = data.settings || data || {};
    if (scheduleEnabled) scheduleEnabled.checked = Boolean(settings.enabled);
    if (scheduleSlots) scheduleSlots.innerHTML = "";
    const slots = settings.slots?.length ? settings.slots : [{ days:["1","4","6"], time:"19:30" }];
    slots.forEach(createSlot);
    updateScheduleText();
  } catch {}
}

async function saveSchedule(e) {
  e.preventDefault();
  try {
    const payload = { enabled: Boolean(scheduleEnabled?.checked), mode: "weekly_rotation", rotation: true, slots: getSlots() };
    if (payload.enabled && !payload.slots.length) throw new Error("Ajoutez au moins un jour et une heure.");
    const res = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/schedule-settings`, {
      method: "POST", headers: headers(true), body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text() || "HTTP " + res.status);
    setStatus(payload.enabled ? "Programmation enregistrée." : "Programmation désactivée.", "success");
  } catch (err) {
    setStatus("Erreur programmation : " + err.message, "error");
  }
}

function startAutoRefresh() {
  clearInterval(statsTimer);
  clearInterval(historyTimer);
  statsTimer = setInterval(() => loadStats({ silent: true }), 4000);
  historyTimer = setInterval(() => loadHistory({ silent: true }), 8000);
}

function bindTabs() {
  const buttons = document.querySelectorAll("[data-admin-tab]");
  const panels = document.querySelectorAll("[data-admin-panel]");
  function open(name) {
    buttons.forEach(b => b.classList.toggle("active", b.dataset.adminTab === name));
    panels.forEach(p => p.classList.toggle("active", p.dataset.adminPanel === name));
    if (name === "history") loadHistory();
  }
  buttons.forEach(b => b.addEventListener("click", () => open(b.dataset.adminTab)));
  open("dashboard");
}

function init() {
  bindTabs();
  $("refreshStatsBtn")?.addEventListener("click", () => loadStats());
  $("refreshHistoryBtn")?.addEventListener("click", () => loadHistory());
  $("sendForm")?.addEventListener("submit", sendNotification);
  $("scheduleForm")?.addEventListener("submit", saveSchedule);
  $("addScheduleSlot")?.addEventListener("click", () => createSlot({ days: [], time: "19:30" }));
  scheduleEnabled?.addEventListener("change", updateScheduleText);
  imageSelect?.addEventListener("change", updateImagePreview);
  $("refreshImageGallery")?.addEventListener("click", () => loadImages(true));
  $("logoutAdminBtn")?.addEventListener("click", () => window.adnAdminGateLock?.());
  window.addEventListener("adn66-push-subscription-changed", () => Promise.allSettled([loadStats(), loadHistory({ silent: true })]));
  window.addEventListener("adn66-admin-unlocked", () => Promise.allSettled([loadStats(), loadSchedule(), loadHistory({ silent: true })]));

  if (!scheduleSlots?.children.length) createSlot({ days:["1","4","6"], time:"19:30" });
  updateScheduleText();
  loadImages(false);
  setTimeout(() => Promise.allSettled([loadStats({ silent: true }), loadSchedule(), loadHistory({ silent: true })]), 250);
  startAutoRefresh();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
