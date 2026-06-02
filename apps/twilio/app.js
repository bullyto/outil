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
  navigator.serviceWorker.register("sw.js?v=6").catch(() => {});
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
  const result = { "Content-Type": "application/json" };
  if (state.adminKey) result.Authorization = "Bearer " + state.adminKey;
  return result;
}

async function api(path, options = {}) {
  const response = await fetch(apiBase() + path, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });

  const data = await response.json().catch(() => ({
    success: false,
    error: "Réponse non JSON"
  }));

  if (!response.ok && data.success !== false) data.success = false;
  return data;
}

function fmtEuro(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return "--";
  return Number(value).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function normalizeInputPhone(value) {
  return String(value || "").trim();
}

function parseContactLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;

  // Formats acceptés :
  // 0632354272
  // Kevin ; 0632354272
  // Kevin, 0632354272
  // Kevin - 0632354272
  const phoneMatch = raw.match(/(\+33|0033|0)?[ .-]?[67](?:[ .-]?\d{2}){4}/);
  if (!phoneMatch) return { name: "", phone: raw };

  const phone = phoneMatch[0].trim();
  let name = raw.replace(phoneMatch[0], "").replace(/[;,\-–—|]+/g, " ").trim();

  return { name, phone };
}

function splitContacts(rawText) {
  return String(rawText || "")
    .split(/\n+/)
    .map(parseContactLine)
    .filter(Boolean);
}

function humanImportResult(data) {
  if (!data.success) {
    return `<div class="badline"><strong>Erreur :</strong> ${escapeHtml(data.error || "Import impossible")}</div>`;
  }

  return `
    <div class="okline"><strong>Import terminé</strong></div>
    <div>Contacts lus : <strong>${data.totalRead || 0}</strong></div>
    <div>Nouveaux ajoutés : <strong>${data.added || 0}</strong></div>
    <div>Doublons ignorés : <strong>${data.duplicates || 0}</strong></div>
    <div>Numéros invalides : <strong>${data.invalid || 0}</strong></div>
  `;
}

function humanCampaignResult(data) {
  if (!data.success) {
    return {
      title: "Erreur campagne",
      text: data.error || "La campagne n’a pas pu être envoyée.",
      details: ""
    };
  }

  const mode = data.testMode ? "Mode test : aucun vrai SMS envoyé." : "Envoi réel effectué.";
  return {
    title: data.testMode ? "Test campagne réussi" : "Campagne envoyée",
    text: `${mode}\n${data.sent || 0} envoyé(s), ${data.failed || 0} échec(s), ${data.total || 0} destinataire(s).`,
    details: `
      Campagne n° ${data.campaignId}<br>
      Encodage : ${escapeHtml(data.encoding || "")}<br>
      Segments par SMS : ${data.segmentsPerSms || 0}<br>
      Total segments : ${data.totalSegments || 0}
    `
  };
}

function showNiceResult(id, html) {
  const box = $(id);
  if (!box) return;
  box.classList.remove("hidden");
  box.innerHTML = html;
}

function showModal(title, text, details = "") {
  const modal = $("adnResultModal");
  if (!modal) {
    alert(title + "\n\n" + text);
    return;
  }

  $("adnResultTitle").textContent = title;
  $("adnResultText").textContent = text;

  const detailsBox = $("adnResultDetails");
  if (details) {
    detailsBox.innerHTML = details;
    detailsBox.classList.remove("hidden");
  } else {
    detailsBox.classList.add("hidden");
  }

  modal.classList.remove("hidden");
}

$("adnResultClose")?.addEventListener("click", () => {
  $("adnResultModal")?.classList.add("hidden");
});

// ======================================================
// DASHBOARD
// ======================================================

async function refreshDashboard() {
  try {
    const dashboard = await api("/stats/dashboard");

    setText("activeClients", dashboard?.clients?.active ?? "--");
    setText("problemCount", dashboard?.messages?.failed ?? "--");
    setText("sentTotal", dashboard?.messages?.sent ?? "--");

    const balance = dashboard?.balance;
    setText("balanceValue", balance?.success ? fmtEuro(balance.balance) : "--");
    setText("balanceSub", balance?.success ? "Compte Twilio" : (balance?.error || "Erreur solde"));
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

  const data = await api("/campaign/preview", { method: "POST", body: JSON.stringify(body) });

  if (!data.success) {
    toast(data.error || "Erreur estimation");
    const warning = $("estimateWarning");
    if (warning) {
      warning.textContent = data.error || "Erreur estimation";
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

  const data = await api("/campaign/send", { method: "POST", body: JSON.stringify(body) });
  const result = humanCampaignResult(data);
  showModal(result.title, result.text, result.details);

  await refreshDashboard();
  await loadHistory();
  await loadProblems();
  await loadClients();
}

// ======================================================
// AJOUT CLIENT NOM + NUMÉRO
// ======================================================

async function addSingleClient() {
  const name = $("clientName")?.value.trim() || "";
  const phone = normalizeInputPhone($("clientPhone")?.value || "");

  if (!phone) {
    showNiceResult("addClientResult", `<div class="badline"><strong>Erreur :</strong> numéro manquant.</div>`);
    return;
  }

  const data = await api("/clients/add", {
    method: "POST",
    body: JSON.stringify({ name, phone, source: "pwa_manual" })
  });

  if (data.success) {
    showNiceResult("addClientResult", data.alreadyExists
      ? `<div><strong>Client déjà existant</strong><br>${escapeHtml(phone)}</div>`
      : `<div class="okline"><strong>Client ajouté</strong></div><div>${escapeHtml(name || "Sans nom")} — ${escapeHtml(phone)}</div>`
    );
    $("clientName").value = "";
    $("clientPhone").value = "";
  } else {
    showNiceResult("addClientResult", `<div class="badline"><strong>Erreur :</strong> ${escapeHtml(data.error || "Ajout impossible")}</div>`);
  }

  await loadClients();
  await refreshDashboard();
}

// ======================================================
// IMPORT CONTACTS AVEC NOM POSSIBLE
// ======================================================

async function importContacts() {
  const rawText = $("importNumbers")?.value || "";
  const contacts = splitContacts(rawText);

  if (contacts.length === 0) {
    toast("Aucun contact à importer");
    showNiceResult("importResult", `<div class="badline"><strong>Erreur :</strong> Aucun numéro fourni</div>`);
    return;
  }

  const withNames = contacts.some((contact) => contact.name);
  let finalResult;

  if (!withNames) {
    const phones = contacts.map((contact) => contact.phone);
    finalResult = await api("/clients/import", {
      method: "POST",
      body: JSON.stringify({ phones, source: "pwa_import" })
    });
  } else {
    let added = 0, duplicates = 0, invalid = 0;

    for (const contact of contacts) {
      const data = await api("/clients/add", {
        method: "POST",
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone,
          source: "pwa_import_named"
        })
      });

      if (data.success && data.alreadyExists) duplicates++;
      else if (data.success) added++;
      else invalid++;
    }

    finalResult = {
      success: true,
      totalRead: contacts.length,
      added,
      duplicates,
      invalid,
      invalidNumbers: []
    };
  }

  showNiceResult("importResult", humanImportResult(finalResult));

  if (finalResult.success) {
    toast(`Import OK : ${finalResult.added || 0} ajouté(s), ${finalResult.duplicates || 0} doublon(s)`);
  } else {
    toast(finalResult.error || "Erreur import");
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
      <td>${escapeHtml(client.name || "—")}</td>
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
  if (!active) return '<span class="pill neutral">Désactivé</span>';
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
  const data = await api(route, { method: "POST", body: JSON.stringify({ phone }) });

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
      <td>${escapeHtml(problem.twilio_sid || "")}</td>
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
    showNiceResult("settingsResult", data.success
      ? `<div class="okline"><strong>Worker connecté</strong></div><div>${escapeHtml(data.service || "")}</div>`
      : `<div class="badline"><strong>Erreur :</strong> ${escapeHtml(data.error || "Worker inaccessible")}</div>`
    );
  });
}

// ======================================================
// HELPERS
// ======================================================

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
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
$("addClientBtn")?.addEventListener("click", addSingleClient);
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
