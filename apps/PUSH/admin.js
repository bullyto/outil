/*
  ADN66 Push - admin.js complet
  Emplacement GitHub :
  /apps/PUSH/admin.js

  Fonctions :
  - onglets Notification instantanée / Notification programmée
  - stats abonnés
  - envoi instantané avec icon_url / image_url
  - préparation formulaire programmation
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
      : "Mode notification programmée. Le formulaire est prêt, le Worker de programmation sera ajouté ensuite.",
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

function normalizeImageUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw, window.location.href);

    if (url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function getSelectedIcon(prefix = "") {
  const preset = document.getElementById(prefix + "IconPreset")?.value?.trim() || "";
  const custom = document.getElementById(prefix + "IconUrl")?.value?.trim() || "";

  return normalizeImageUrl(custom || preset);
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

    statTotal.textContent = data.total ?? 0;
    statApero.textContent = data.targets?.apero ?? 0;
    statCatalan.textContent = data.targets?.catalan ?? 0;
    statX.textContent = data.targets?.x ?? 0;

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
  const url = document.getElementById("url").value.trim();
  const iconUrl = getSelectedIcon("");

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
    const response = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey
      },
      body: JSON.stringify({
        target,
        title,
        body,
        url,
        icon_url: iconUrl,
        image_url: iconUrl
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Erreur Worker : " + response.status);
    }

    const result = await response.json();

    setAdminStatus(
      `Notification envoyée. Succès : ${result.sent_count ?? 0}, échecs : ${result.failed_count ?? 0}.`,
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
  const url = document.getElementById("scheduleUrl").value.trim();
  const iconUrl = getSelectedIcon("schedule");

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
    const response = await fetch(`${cfg.WORKER_BASE_URL}/admin/push/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey
      },
      body: JSON.stringify({
        target,
        mode,
        weekday,
        date,
        time,
        title,
        body,
        url,
        icon_url: iconUrl,
        image_url: iconUrl
      })
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
      `Programmation enregistrée${result.id ? " #" + result.id : ""}.`,
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
