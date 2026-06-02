const $ = (id) => document.getElementById(id);

const state = {
  workerUrl: localStorage.getItem("adn66_worker_url") || "https://twillio-sms.apero-nuit-du-66.workers.dev",
  adminKey: localStorage.getItem("adn66_admin_key") || "",
  deferredPrompt: null
};

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.deferredPrompt = e;
  $("installBtn")?.classList.remove("hidden");
});

$("installBtn")?.addEventListener("click", async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  state.deferredPrompt = null;
  $("installBtn")?.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js?v=4").catch(() => {});
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screen));
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.screen === id);
  });

  const target = $(id);
  if (target) target.classList.add("active");
}

function toast(message) {
  const box = $("toast");
  if (!box) return;

  box.textContent = message;
  box.classList.remove("hidden");

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => box.classList.add("hidden"), 2600);
}

function apiBase() {
  return state.workerUrl.replace(/\/+$/, "");
}

function headers() {
  const result = {
    "Content-Type": "application/json"
  };

  if (state.adminKey) {
    result.Authorization = "Bearer " + state.adminKey;
  }

  return result;
}

async function api(path, options = {}) {
  const response = await fetch(apiBase() + path, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({
    success: false,
    error: "Réponse non JSON"
  }));

  if (!response.ok && data.success !== false) {
    data.success = false;
  }

  return data;
}

function fmtEuro(value) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "--";
  }

  return Number(value).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR"
  });
}

function splitNumbers(rawText) {
  return String(rawText || "")
    .split(/[\n,;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// ======================================================
// DASHBOARD
// ======================================================

async function refreshDashboard() {
  try {
    const dashboard = await api("/stats/dashboard");

    if ($("activeClients")) {
      $("activeClients").textContent = dashboard?.clients?.active ?? "--";
    }

    if ($("problemCount")) {
      $("problemCount").textContent = dashboard?.messages?.failed ?? "--";
    }

    if ($("sentTotal")) {
      $("sentTotal").textContent = dashboard?.messages?.sent ?? "--";
    }

    const balance = dashboard?.balance;

    if ($("balanceValue")) {
      $("balanceValue").textContent = balance?.success ? fmtEuro(balance.balance) : "--";
    }

    if ($("balanceSub")) {
      $("balanceSub").textContent = balance?.success ? "Compte Twilio" : (balance?.error || "Erreur solde");
    }
  } catch (error) {
    toast("Impossible d’actualiser");
  }
}

// ======================================================
// CAMPAGNE — PREVIEW
// ======================================================

async function previewCampaign() {
  const body = {
    title: $("campaignTitle")?.value || "Campagne ADN66",
    message: $("campaignMessage")?.value || "",
    limit: Number($("sendLimit")?.value || 0),
    onlyActive: true,
    excludeAlreadySent: $("excludeAlreadySent")?.checked === true
  };

  const data = await api("/campaign/preview", {
    method: "POST",
    body: JSON.stringify(body)
  });

  if (!data.success) {
    toast(data.error || "Erreur estimation");
    const warning = $("estimateWarning");
    if (warning) {
      warning.textContent = JSON.stringify(data, null, 2);
      warning.classList.remove("hidden");
    }
    return;
  }

  const preview = data.preview || {};

  setText("estClients", preview.selectedClients ?? 0);
  setText("estLimit", body.limit || preview.selectedClients || 0);
  setText("estChars", preview.characters ?? 0);
  setText("estSegments", preview.segmentsPerSms ?? 0);
  setText("estTotalSegments", preview.totalSegments ?? 0);
  setText("estCost", fmtEuro(preview.estimatedCost));
  setText("estBalance", fmtEuro(preview.balance));
  setText("estRemaining", fmtEuro(preview.estimatedAfter));

  const warning = $("estimateWarning");
  if (warning) {
    if (preview.enoughBalance === false) {
      warning.textContent = "Attention : solde Twilio insuffisant pour cette estimation.";
      warning.classList.remove("hidden");
    } else {
      warning.classList.add("hidden");
    }
  }

  toast("Estimation calculée");
}

// ======================================================
// CAMPAGNE — ENVOI
// ======================================================

async function sendCampaign() {
  const testMode = $("dryRun")?.checked === true;

  if (!testMode) {
    const confirmed = confirm("Confirmer l’envoi réel de la campagne SMS ?");
    if (!confirmed) return;
  }

  const body = {
    title: $("campaignTitle")?.value || "Campagne ADN66",
    message: $("campaignMessage")?.value || "",
    limit: Number($("sendLimit")?.value || 0),
    onlyActive: true,
    excludeAlreadySent: $("excludeAlreadySent")?.checked === true,
    testMode
  };

  const data = await api("/campaign/send", {
    method: "POST",
    body: JSON.stringify(body)
  });

  showResult(data);

  await refreshDashboard();
  await loadHistory();
  await loadProblems();
  await loadClients();
}

// ======================================================
// IMPORT CONTACTS
// ======================================================

async function importContacts() {
  const rawText = $("importNumbers")?.value || "";
  const phones = splitNumbers(rawText);

  if (phones.length === 0) {
    toast("Aucun numéro à importer");
    showInlineResult("importResult", {
      success: false,
      error: "Aucun numéro fourni"
    });
    return;
  }

  const data = await api("/clients/import", {
    method: "POST",
    body: JSON.stringify({
      phones,
      source: "pwa_import"
    })
  });

  showInlineResult("importResult", data);

  if (data.success) {
    toast(`Import OK : ${data.added || 0} ajouté(s), ${data.duplicates || 0} doublon(s)`);
  } else {
    toast(data.error || "Erreur import");
  }

  await loadClients();
  await refreshDashboard();
}

// ======================================================
// CLIENTS
// ======================================================

async function loadClients() {
  const filter = $("clientFilter")?.value || "all";
  const data = await api("/clients/list?filter=" + encodeURIComponent(filter));

  const tbody = $("clientsTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  (data.clients || []).forEach((client) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(client.phone || "")}</td>
      <td>${statusPill(client.is_active)}</td>
      <td>${client.total_sent || 0}</td>
      <td>${escapeHtml(client.last_error_message || "")}</td>
      <td>
        <button class="mini" data-action="deactivate" data-phone="${escapeHtml(client.phone || "")}">Désactiver</button>
        <button class="mini danger" data-action="delete" data-phone="${escapeHtml(client.phone || "")}">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function statusPill(active) {
  if (!active) {
    return '<span class="pill neutral">Désactivé</span>';
  }

  return '<span class="pill ok">Actif</span>';
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const phone = button.dataset.phone;
  const action = button.dataset.action;

  if (!phone) {
    toast("Numéro manquant");
    return;
  }

  if (action === "delete") {
    const confirmed = confirm("Supprimer définitivement " + phone + " de D1 ?");
    if (!confirmed) return;
  }

  const route = action === "delete" ? "/clients/delete" : "/clients/deactivate";

  const data = await api(route, {
    method: "POST",
    body: JSON.stringify({ phone })
  });

  toast(data.success ? "Action effectuée" : (data.error || "Erreur"));

  await loadClients();
  await loadProblems();
  await refreshDashboard();
});

// ======================================================
// PROBLÈMES
// ======================================================

async function loadProblems() {
  const data = await api("/problems/list");

  const tbody = $("problemsTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  (data.problems || []).forEach((problem) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(problem.phone || "")}</td>
      <td>${problem.twilioCode || problem.code || ""}</td>
      <td>${escapeHtml(problem.error_message || "")}</td>
      <td>${escapeHtml(problem.created_at || "")}</td>
      <td>
        <button class="mini" data-action="deactivate" data-phone="${escapeHtml(problem.phone || "")}">Désactiver</button>
        <button class="mini danger" data-action="delete" data-phone="${escapeHtml(problem.phone || "")}">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ======================================================
// HISTORIQUE
// ======================================================

async function loadHistory() {
  const data = await api("/campaigns/history");

  const tbody = $("historyTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  (data.campaigns || []).forEach((campaign) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${campaign.id}</td>
      <td>${escapeHtml(campaign.title || "")}</td>
      <td>${campaign.total_clients || 0}</td>
      <td>${campaign.status === "sent" ? campaign.total_clients || 0 : 0}</td>
      <td>${campaign.status === "partial" ? "Voir détail" : 0}</td>
      <td>${campaign.total_segments || 0} segment(s)</td>
      <td>${escapeHtml(campaign.created_at || "")}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ======================================================
// RÉGLAGES
// ======================================================

function initSettings() {
  if ($("workerUrl")) $("workerUrl").value = state.workerUrl;
  if ($("adminKey")) $("adminKey").value = state.adminKey;

  $("saveSettingsBtn")?.addEventListener("click", () => {
    state.workerUrl = $("workerUrl")?.value.trim() || state.workerUrl;
    state.adminKey = $("adminKey")?.value.trim() || "";

    localStorage.setItem("adn66_worker_url", state.workerUrl);
    localStorage.setItem("adn66_admin_key", state.adminKey);

    toast("Réglages enregistrés");
  });

  $("testWorkerBtn")?.addEventListener("click", async () => {
    $("saveSettingsBtn")?.click();

    const data = await api("/status");
    showInlineResult("settingsResult", data);
  });
}

// ======================================================
// HELPERS
// ======================================================

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function showInlineResult(id, data) {
  const box = $(id);
  if (!box) return;

  box.classList.remove("hidden");
  box.textContent = JSON.stringify(data, null, 2);
}

function showResult(data) {
  toast(data.success ? "Terminé" : "Erreur");
  console.log(data);
  alert(JSON.stringify(data, null, 2));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ======================================================
// EVENTS
// ======================================================

$("refreshAllBtn")?.addEventListener("click", refreshDashboard);
$("previewBtn")?.addEventListener("click", previewCampaign);
$("sendCampaignBtn")?.addEventListener("click", sendCampaign);
$("importBtn")?.addEventListener("click", importContacts);
$("clearImportBtn")?.addEventListener("click", () => {
  if ($("importNumbers")) $("importNumbers").value = "";
});
$("loadClientsBtn")?.addEventListener("click", loadClients);
$("clientFilter")?.addEventListener("change", loadClients);
$("loadProblemsBtn")?.addEventListener("click", loadProblems);
$("loadHistoryBtn")?.addEventListener("click", loadHistory);

initSettings();
refreshDashboard();
loadClients();
loadProblems();
loadHistory();
