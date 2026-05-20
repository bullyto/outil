const cfg = window.ADN_PUSH_CONFIG;

const sendForm = document.getElementById("sendForm");
const adminStatus = document.getElementById("adminStatus");

const statTotal = document.getElementById("statTotal");
const statApero = document.getElementById("statApero");
const statCatalan = document.getElementById("statCatalan");
const statX = document.getElementById("statX");

function setAdminStatus(message, type = "") {
  adminStatus.textContent = message;
  adminStatus.className = "status " + type;
}

function isWorkerConfigured() {
  return cfg && cfg.WORKER_BASE_URL && !cfg.WORKER_BASE_URL.includes("VOTRE-WORKER");
}

async function loadStats() {
  if (!isWorkerConfigured()) {
    setAdminStatus("Page admin prête. Les statistiques fonctionneront après ajout du Worker Cloudflare.", "warn");
    return;
  }

  try {
    const adminKey = document.getElementById("adminKey").value.trim();

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

  const adminKey = document.getElementById("adminKey").value.trim();
  const target = document.getElementById("target").value;
  const title = document.getElementById("title").value.trim();
  const body = document.getElementById("body").value.trim();
  const url = document.getElementById("url").value.trim();

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
        url
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

sendForm.addEventListener("submit", sendNotification);
document.getElementById("adminKey").addEventListener("change", loadStats);

loadStats();
