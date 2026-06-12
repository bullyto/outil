const $ = (id) => document.getElementById(id);

const state = {
  workerUrl: localStorage.getItem("adn66_worker_url") || "https://twillio-sms.apero-nuit-du-66.workers.dev",
  adminKey: localStorage.getItem("adn66_admin_key") || localStorage.getItem("adn66_admin_token") || "",
  deferredPrompt: null,
  clientsPage: 1,
  clientsPageSize: 300,
  clientsTotal: 0,
  clientsSearch: "",
  sendingCampaign: false
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
  navigator.serviceWorker.register("sw.js?v=11").catch(() => {});
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screen));
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.go));
});

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.screen === id));
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

function getAdminToken() {
  const token =
    localStorage.getItem("adn66_admin_key") ||
    localStorage.getItem("adn66_admin_token") ||
    state.adminKey ||
    "";
  state.adminKey = String(token || "").trim();
  return state.adminKey;
}

function headers() {
  const result = { "Content-Type": "application/json" };
  const token = getAdminToken();
  if (token) result.Authorization = "Bearer " + token;
  return result;
}

async function api(path, options = {}) {
  let finalPath = path;
  if (!options.method || String(options.method).toUpperCase() === "GET") {
    finalPath += (finalPath.includes("?") ? "&" : "?") + "_t=" + Date.now();
  }

  const response = await fetch(apiBase() + finalPath, {
    ...options,
    cache: "no-store",
    headers: { ...headers(), ...(options.headers || {}) }
  });

  const data = await response.json().catch(() => ({ success: false, error: "Réponse non JSON" }));
  if (!response.ok && data.success !== false) data.success = false;

  if (response.status === 401 || response.status === 403 || data.authenticated === false) {
    localStorage.removeItem("adn66_admin_key");
    localStorage.removeItem("adn66_admin_token");
    state.adminKey = "";
    if (typeof window.adnAdminGateLock === "function") {
      window.adnAdminGateLock();
    }
  }

  return data;
}

function fmtEuro(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return "--";
  return Number(value).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function parseContactLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;
  const phoneMatch = raw.match(/(\+33|0033|0)?[ .-]?[67](?:[ .-]?\d{2}){4}/);
  if (!phoneMatch) return { name: "", phone: raw };
  const phone = phoneMatch[0].trim();
  const name = raw.replace(phoneMatch[0], "").replace(/[;:,\-–—|]+/g, " ").trim();
  return { name, phone };
}

function splitContacts(rawText) {
  return String(rawText || "").split(/\n+/).map(parseContactLine).filter(Boolean);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if ((char === "," || char === ";") && !insideQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseMarketingCsv(rawText) {
  const lines = String(rawText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstLine = parseCsvLine(lines[0]).map(normalizeHeader);
  const hasHeader = firstLine.some((header) =>
    ["name", "nom", "client_name", "phone", "telephone", "numero", "source", "active"].includes(header)
  );

  const headers = hasHeader ? firstLine : ["name", "phone", "source", "active"];
  const startIndex = hasHeader ? 1 : 0;

  const contacts = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = cells[index] || "";
    });

    const name = row.name || row.nom || row.client_name || row.client || "";
    const phone = row.phone || row.telephone || row.numero || row.number || cells.find((cell) => /(\+33|0033|0)?[ .-]?[67](?:[ .-]?\d{2}){4}/.test(cell)) || "";
    const active = String(row.active ?? row.actif ?? "1").trim().toLowerCase();

    if (!phone) continue;
    if (["0", "false", "non", "no", "inactive", "desactive"].includes(active)) continue;

    contacts.push({
      name: String(name || "").trim(),
      phone: String(phone || "").trim(),
      source: String(row.source || "android_sms_contacts").trim() || "android_sms_contacts"
    });
  }

  return contacts;
}

async function importParsedContacts(contacts, defaultSource = "pwa_import_named") {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return { success: false, error: "Aucun contact à importer", totalRead: 0, added: 0, duplicates: 0, invalid: 0 };
  }

  const withNames = contacts.some((contact) => contact.name);

  if (!withNames) {
    return await api("/clients/import", {
      method: "POST",
      body: JSON.stringify({ phones: contacts.map((c) => c.phone), source: defaultSource })
    });
  }

  let added = 0;
  let duplicates = 0;
  let invalid = 0;
  const invalidNumbers = [];

  for (const contact of contacts) {
    const data = await api("/clients/add", {
      method: "POST",
      body: JSON.stringify({
        name: contact.name || "",
        phone: contact.phone,
        source: contact.source || defaultSource
      })
    });

    if (data.success && data.alreadyExists) {
      duplicates++;
    } else if (data.success) {
      added++;
    } else {
      invalid++;
      invalidNumbers.push(contact.phone);
    }
  }

  return { success: true, totalRead: contacts.length, added, duplicates, invalid, invalidNumbers };
}

async function importCsvFileContacts() {
  const input = $("importCsvFile");
  const file = input?.files?.[0];

  if (!file) {
    toast("Choisis d’abord le fichier CSV Android");
    showNiceResult("importResult", `<div class="badline"><strong>Erreur :</strong> Aucun fichier CSV sélectionné.</div>`);
    return;
  }

  setText("importCsvStatus", `Lecture du fichier : ${file.name}`);
  const rawText = await file.text();
  const contacts = parseMarketingCsv(rawText);

  if (contacts.length === 0) {
    setText("importCsvStatus", "Aucun contact valide trouvé dans ce fichier.");
    showNiceResult("importResult", `<div class="badline"><strong>Erreur :</strong> Aucun contact valide trouvé dans le CSV.</div>`);
    return;
  }

  setText("importCsvStatus", `${contacts.length} contact(s) trouvé(s). Import dans D1 en cours...`);
  const finalResult = await importParsedContacts(contacts, "android_sms_contacts");

  showNiceResult("importResult", humanImportResult(finalResult));
  setText(
    "importCsvStatus",
    finalResult.success
      ? `Import CSV terminé : ${finalResult.added || 0} ajouté(s), ${finalResult.duplicates || 0} doublon(s), ${finalResult.invalid || 0} invalide(s).`
      : `Erreur import CSV : ${finalResult.error || "import impossible"}`
  );

  toast(finalResult.success ? `CSV importé : ${finalResult.added || 0} ajouté(s)` : (finalResult.error || "Erreur import CSV"));
  await resetClientsToFirstPage();
  await refreshDashboard();
}

function humanImportResult(data) {
  if (!data.success) return `<div class="badline"><strong>Erreur :</strong> ${escapeHtml(data.error || "Import impossible")}</div>`;
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
    return { title: "Erreur campagne", text: data.error || "La campagne n’a pas pu être envoyée.", details: "" };
  }

  return {
    title: "Campagne terminée",
    text:
      `Envoi réel terminé.\n` +
      `${data.sent || 0} accepté(s) Twilio, ${data.failed || 0} échec(s), ${data.total || 0} destinataire(s).`,
    details: `
      Campagne n° ${data.campaignId}<br>
      Demandé : <strong>${data.requested || 0}</strong><br>
      Limite sécurité : <strong>${data.safetyLimit || 300}</strong>${data.cappedBySafety ? " — demande limitée" : ""}<br>
      Clients éligibles : <strong>${data.eligible || 0}</strong><br>
      Numéros valides envoyés : <strong>${data.validNumbers || data.total || 0}</strong><br>
      Rythme : <strong>1 SMS / seconde</strong><br>
      Encodage : ${escapeHtml(data.encoding || "")}<br>
      Segments par SMS : ${data.segmentsPerSms || 0}<br>
      Segments réels : <strong>${data.realSegments || data.totalSegments || 0}</strong>
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

$("adnResultClose")?.addEventListener("click", () => $("adnResultModal")?.classList.add("hidden"));

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
// CAMPAGNE
// ======================================================

function getUiSmsLimit() {
  return 300;
}

function readCampaignBody() {
  const maxLimit = getUiSmsLimit();
  const rawLimit = Number($("sendLimit")?.value || 0);
  const safeLimit = rawLimit > 0 ? Math.min(rawLimit, maxLimit) : maxLimit;

  if ($("sendLimit") && rawLimit > maxLimit) {
    $("sendLimit").value = String(maxLimit);
  }

  return {
    title: $("campaignTitle")?.value || "Campagne ADN66",
    message: $("campaignMessage")?.value || "",
    limit: safeLimit,
    requestedLimit: rawLimit,
    onlyActive: true,
    excludeAlreadySent: $("excludeAlreadySent")?.checked === true,
    targetMode: $("targetMode")?.value || "active_unsent"
  };
}

async function previewCampaign() {
  const body = readCampaignBody();

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
  setText("estLimit", preview.effectiveLimit || body.limit || preview.selectedClients || 0);
  setText("estChars", preview.characters ?? 0);
  setText("estSegments", preview.segmentsPerSms ?? 0);
  setText("estTotalSegments", preview.totalSegments ?? 0);
  setText("estCost", fmtEuro(preview.estimatedCost));
  setText("estBalance", fmtEuro(preview.balance));
  setText("estRemaining", fmtEuro(preview.estimatedAfter));

  const warning = $("estimateWarning");
  if (warning) {
    const messages = [];
    if (preview.cappedBySafety) messages.push("Sécurité : maximum 300 SMS par campagne. Votre demande a été limitée à 300.");
    if (preview.enoughBalance === false) messages.push("Attention : solde Twilio insuffisant pour cette estimation.");
    if (preview.eligibleClients !== undefined) messages.push(`Clients éligibles trouvés : ${preview.eligibleClients}.`);
    if (messages.length) {
      warning.textContent = messages.join(" ");
      warning.classList.remove("hidden");
    } else warning.classList.add("hidden");
  }
  toast("Estimation calculée");
}

async function sendCampaign() {
  if (state.sendingCampaign) {
    toast("Une campagne est déjà en cours");
    return;
  }

  const body = readCampaignBody();
  const estimatedCount = Number($("estClients")?.textContent || body.limit || 0);

  const confirmText =
    `Confirmer l’envoi réel ?\n\n` +
    `Maximum sécurité : 300 SMS\n` +
    `Rythme : 1 SMS par seconde\n` +
    `Cible estimée : ${estimatedCount || body.limit} client(s)\n\n` +
    `Ne fermez pas la page pendant l’envoi.`;

  if (!confirm(confirmText)) return;

  const btn = $("sendCampaignBtn");
  const previewBtn = $("previewBtn");
  const oldText = btn ? btn.textContent : "";

  state.sendingCampaign = true;
  if (btn) {
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.textContent = "Envoi en cours...";
  }
  if (previewBtn) previewBtn.disabled = true;

  const progress = $("sendProgress");
  if (progress) {
    progress.classList.remove("hidden");
    progress.innerHTML = `
      <strong>Envoi en cours</strong><br>
      1 SMS par seconde. Attendez la fin avant de quitter la page.<br>
      Historique réel en préparation...
    `;
  }

  try {
    const data = await api("/campaign/send", { method: "POST", body: JSON.stringify({ ...body, delayMs: 1000 }) });
    const result = humanCampaignResult(data);
    showModal(result.title, result.text, result.details);

    if (progress) {
      progress.innerHTML = data.success
        ? `
          <strong>Campagne terminée</strong><br>
          Demandé : <strong>${data.requested || 0}</strong><br>
          Clients éligibles : <strong>${data.eligible || 0}</strong><br>
          Numéros envoyés : <strong>${data.sent || 0}</strong><br>
          Échecs : <strong>${data.failed || 0}</strong><br>
          Segments réels : <strong>${data.realSegments || data.totalSegments || 0}</strong>
        `
        : `<strong>Erreur :</strong> ${escapeHtml(data.error || "Envoi impossible")}`;
    }

    await refreshDashboard();
    await loadHistory();
    await loadProblems();
    await loadClients();
    await loadSentTracking();
  } catch (error) {
    const msg = error?.message || "Erreur pendant l’envoi";
    showModal("Erreur campagne", msg);
    if (progress) progress.innerHTML = `<strong>Erreur :</strong> ${escapeHtml(msg)}`;
  } finally {
    state.sendingCampaign = false;
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("is-loading");
      btn.textContent = oldText || "Envoyer campagne";
    }
    if (previewBtn) previewBtn.disabled = false;
  }
}

// ======================================================
// CLIENTS
// ======================================================

async function addSingleClient() {
  const name = $("clientName")?.value.trim() || "";
  const phone = String($("clientPhone")?.value || "").trim();
  if (!phone) {
    showNiceResult("addClientResult", `<div class="badline"><strong>Erreur :</strong> numéro manquant.</div>`);
    return;
  }

  const data = await api("/clients/add", { method: "POST", body: JSON.stringify({ name, phone, source: "pwa_manual" }) });

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

  await resetClientsToFirstPage();
  await refreshDashboard();
}

async function importContacts() {
  const rawText = $("importNumbers")?.value || "";
  let contacts = parseMarketingCsv(rawText);

  if (contacts.length === 0) {
    contacts = splitContacts(rawText);
  }

  if (contacts.length === 0) {
    toast("Aucun contact à importer");
    showNiceResult("importResult", `<div class="badline"><strong>Erreur :</strong> Aucun numéro fourni</div>`);
    return;
  }

  const finalResult = await importParsedContacts(contacts, "pwa_import");

  showNiceResult("importResult", humanImportResult(finalResult));
  toast(finalResult.success ? `Import OK : ${finalResult.added || 0} ajouté(s), ${finalResult.duplicates || 0} doublon(s)` : (finalResult.error || "Erreur import"));
  await resetClientsToFirstPage();
  await refreshDashboard();
}

// ======================================================
// SYNCHRO FIDÉLITÉ → TWILIO
// ======================================================

const LOYALTY_WORKER_URL = "https://carte-de-fideliter.apero-nuit-du-66.workers.dev";
const LOYALTY_KEY_STORAGE = "adn66_admin_worker_key"; // même clé que l'admin fidélité actuel
const LOYALTY_KEY_ALT_STORAGE = "adn66_loyalty_admin_key";

function getSavedLoyaltyAdminKey() {
  // Même clé que l'Admin Fidélité : admin-gate.js la sauvegarde ici après validation serveur.
  // Comme /fidel/ et /twilio/ sont sur www.aperos.net, le localStorage est partagé.
  return String(
    localStorage.getItem(LOYALTY_KEY_STORAGE) ||
    localStorage.getItem(LOYALTY_KEY_ALT_STORAGE) ||
    localStorage.getItem("adn66_admin_worker_key") ||
    ""
  ).trim();
}

function saveLoyaltyAdminKey(key) {
  const value = String(key || "").trim();
  if (!value) return;
  localStorage.setItem(LOYALTY_KEY_STORAGE, value);
  localStorage.setItem(LOYALTY_KEY_ALT_STORAGE, value);
}

async function fetchAllLoyaltyCardsFromFidelityWorker(adminKey) {
  const all = [];
  const limit = 200;
  let offset = 0;

  while (true) {
    const url = `${LOYALTY_WORKER_URL}/admin/loyalty/history?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "x-admin-key": adminKey,
        "Accept": "application/json"
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Worker Fidélité HTTP ${response.status}`);
    }

    const items = Array.isArray(data.items) ? data.items : [];
    all.push(...items);

    if (items.length < limit) break;
    offset += limit;
    if (offset > 10000) break;
  }

  return all;
}

async function syncLoyaltyCardsIntoTwilio(options = {}) {
  const silent = options.silent === true;
  let adminKey = getSavedLoyaltyAdminKey();

  if (!adminKey) {
    if (silent) return { success: false, skipped: true, error: "Clé Admin Fidélité absente" };
    adminKey = prompt("Collez le ADMIN_KEY du Worker Fidélité pour synchroniser les cartes :") || "";
    adminKey = adminKey.trim();
    if (!adminKey) {
      toast("Synchronisation annulée");
      return { success: false, skipped: true };
    }
    saveLoyaltyAdminKey(adminKey);
  }

  const btn = $("syncLoyaltyBtn");
  if (btn) btn.disabled = true;
  if (!silent) setText("clientsSummary", "Synchronisation des cartes fidélité en cours...");

  try {
    const cards = await fetchAllLoyaltyCardsFromFidelityWorker(adminKey);

    const payload = cards
      .map((card) => ({
        client_id: card.client_id || "",
        name: card.name || "",
        phone: card.phone || card.phone_digits || "",
        points: card.points ?? 0,
        goal: card.goal ?? 8
      }))
      .filter((card) => String(card.phone || "").trim());

    const result = await api("/clients/loyalty-sync", {
      method: "POST",
      body: JSON.stringify({ cards: payload })
    });

    if (!result.success) {
      throw new Error(result.error || "Synchronisation Twilio impossible");
    }

    localStorage.setItem("adn66_twilio_loyalty_last_sync", String(Date.now()));

    if (!silent) {
      toast(`Cartes synchronisées : ${result.matched || 0} client(s)`);
      showModal(
        "Synchronisation terminée",
        `${result.matched || 0} client(s) Twilio reconnu(s) avec une carte fidélité.`,
        `Cartes lues côté Fidélité : <strong>${result.received || 0}</strong><br>Numéros valides : <strong>${result.valid || 0}</strong><br>Correspondances Twilio : <strong>${result.matched || 0}</strong>`
      );
    }

    state.clientsPage = 1;
    await loadClients();
    return result;
  } catch (error) {
    const msg = error?.message || "Synchronisation impossible";
    if (!silent) {
      toast(msg);
      showModal("Erreur synchronisation", msg, "La clé utilisée est celle de l’Admin Fidélité : localStorage adn66_admin_worker_key.");
    }
    if (/unauthorized/i.test(msg)) {
      localStorage.removeItem(LOYALTY_KEY_STORAGE);
      localStorage.removeItem(LOYALTY_KEY_ALT_STORAGE);
      // On ne supprime pas forcément adn66_admin_worker_key ici : elle appartient aussi à l'Admin Fidélité.
    }
    return { success: false, error: msg };
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function autoSyncLoyaltyIfPossible() {
  const key = getSavedLoyaltyAdminKey();
  if (!key) return;
  const last = Number(localStorage.getItem("adn66_twilio_loyalty_last_sync") || "0");
  const tenMinutes = 10 * 60 * 1000;
  if (Date.now() - last < tenMinutes) return;
  await syncLoyaltyCardsIntoTwilio({ silent: true });
}

async function loadClients() {
  const filter = $("clientFilter")?.value || "active";
  const tbody = $("clientsTable");
  if (!tbody) return;

  const pageSize = state.clientsPageSize || 300;
  const page = Math.max(1, Number(state.clientsPage || 1));
  const offset = (page - 1) * pageSize;
  const search = String(state.clientsSearch || "").trim();

  tbody.innerHTML = `<tr><td colspan="7">Chargement des clients...</td></tr>`;
  setText("clientsSummary", search ? `Recherche : ${search} — chargement...` : "Chargement...");

  let route = "/clients/list?filter=" + encodeURIComponent(filter)
    + "&limit=" + encodeURIComponent(pageSize)
    + "&offset=" + encodeURIComponent(offset);

  if (search) {
    route += "&search=" + encodeURIComponent(search);
  }

  const data = await api(route);
  tbody.innerHTML = "";

  if (!data.success) {
    tbody.innerHTML = `<tr><td colspan="7">Erreur chargement clients : ${escapeHtml(data.error || "réponse Worker invalide")}</td></tr>`;
    updateClientsPagination(0, page, pageSize, 0);
    return;
  }

  const clients = Array.isArray(data.clients) ? data.clients : [];
  const total = Number(data.total ?? clients.length ?? 0);
  state.clientsTotal = total;
  state.clientsPage = Number(data.page || page);

  updateClientsPagination(total, state.clientsPage, pageSize, clients.length);

  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Aucun client à afficher sur cette page.</td></tr>`;
    return;
  }

  clients.forEach((client) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(client.name || "—")}</td>
      <td>${escapeHtml(client.phone || "")}</td>
      <td>${statusPill(Number(client.is_active) === 1)}</td>
      <td>${client.total_sent || 0}</td>
      <td>${escapeHtml(client.last_error_message || "")}</td>
      <td>${loyaltyPill(client)}</td>
      <td>${clientActions(client)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateClientsPagination(total, page, pageSize, displayed) {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / pageSize));
  const safePage = Math.min(Math.max(1, Number(page || 1)), totalPages);
  const start = total === 0 ? 0 : ((safePage - 1) * pageSize) + 1;
  const end = total === 0 ? 0 : Math.min(start + Number(displayed || 0) - 1, total);
  const search = String(state.clientsSearch || "").trim();

  setText(
    "clientsSummary",
    search
      ? `${total} résultat(s) pour “${search}” — affichage ${start} à ${end}`
      : `${total} client(s) au total — affichage ${start} à ${end}`
  );

  setText("clientPageInfo", `Page ${safePage} / ${totalPages} — 300 clients par page`);

  const prev = $("prevClientsPageBtn");
  const next = $("nextClientsPageBtn");
  if (prev) prev.disabled = safePage <= 1;
  if (next) next.disabled = safePage >= totalPages;
}

function resetClientsToFirstPage() {
  state.clientsPage = 1;
  return loadClients();
}

function clientActions(client) {
  const phone = escapeHtml(client.phone || "");
  const isActive = Number(client.is_active) === 1;
  if (isActive) {
    return `<button class="mini" data-action="deactivate" data-phone="${phone}">Désactiver</button><button class="mini disabled" disabled>Réactiver</button>`;
  }
  return `<button class="mini disabled" disabled>Désactiver</button><button class="mini reactivate" data-action="reactivate" data-phone="${phone}">Réactiver</button>`;
}

function loyaltyPill(client) {
  if (client && client.has_loyalty_card === true) {
    const pts = client.loyalty_points !== undefined && client.loyalty_points !== null ? ` · ${client.loyalty_points}/${client.loyalty_goal || 8}` : "";
    return `<span class="pill ok">Oui${pts}</span>`;
  }
  if (client && client.loyalty_error) {
    return `<span class="pill neutral" title="${escapeHtml(client.loyalty_error)}">Non</span>`;
  }
  return '<span class="pill neutral">Non</span>';
}

function statusPill(active) {
  if (!active) return '<span class="pill neutral">Désactivé</span>';
  return '<span class="pill ok">Actif</span>';
}

document.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-campaign-id]");
  if (row && !event.target.closest("button")) {
    await openCampaignDetails(row.dataset.campaignId);
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;
  const phone = button.dataset.phone;
  const action = button.dataset.action;
  if (!phone) return toast("Numéro manquant");

  let route = action === "reactivate" ? "/clients/reactivate" : "/clients/deactivate";
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
    const client = { phone: problem.phone, is_active: problem.is_active ?? 1 };
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(problem.phone || "")}</td>
      <td>${escapeHtml(problem.twilio_sid || "")}</td>
      <td>${escapeHtml(problem.error_message || "")}</td>
      <td>${escapeHtml(problem.created_at || "")}</td>
      <td>${clientActions(client)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ======================================================
// HISTORIQUE + DÉJÀ REÇUS
// ======================================================

async function loadHistory() {
  const data = await api("/campaigns/history");
  const tbody = $("historyTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  (data.campaigns || []).forEach((campaign) => {
    const sent = campaign.real_sent_count ?? campaign.sent_count ?? 0;
    const failed = campaign.real_failed_count ?? campaign.failed_count ?? 0;
    const requested = campaign.requested_clients || campaign.total_clients || 0;
    const realSegments = campaign.real_segments || campaign.total_segments || 0;

    const tr = document.createElement("tr");
    tr.dataset.campaignId = campaign.id;
    tr.innerHTML = `
      <td>${campaign.id}</td>
      <td>${escapeHtml(campaign.title || "")}</td>
      <td>${requested}</td>
      <td>${sent}</td>
      <td>${failed}</td>
      <td>${realSegments}</td>
      <td>${escapeHtml(campaign.status || "")}</td>
      <td>${escapeHtml(campaign.created_at || "")}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function openCampaignDetails(id) {
  const data = await api("/campaign/details?id=" + encodeURIComponent(id));
  if (!data.success) return showModal("Erreur", data.error || "Impossible de charger la campagne.");

  const campaign = data.campaign || {};
  const messages = data.messages || [];
  const delivered = campaign.delivered_count || messages.filter(m => String(m.status || "").toLowerCase() === "delivered").length;
  const queued = campaign.queued_count || messages.filter(m => ["queued","accepted","sending","sent"].includes(String(m.status || "").toLowerCase())).length;
  const failed = campaign.failed_count || messages.filter(m => ["failed","undelivered"].includes(String(m.status || "").toLowerCase())).length;
  const realSegments = campaign.real_segments || messages.reduce((sum, m) => sum + Number(m.segments || 0), 0);

  const rows = messages.map((m) => `
    <tr>
      <td>${escapeHtml(m.client_name || m.name || "—")}</td>
      <td>${escapeHtml(m.phone || "")}</td>
      <td>${escapeHtml(m.status || "")}</td>
      <td>${Number(m.segments || 0)}</td>
      <td>${escapeHtml(m.error_message || "")}</td>
    </tr>
  `).join("");

  showModal(
    `Campagne n° ${campaign.id || id}`,
    `${campaign.title || "Campagne"} — historique relié aux statuts Twilio enregistrés`,
    `
      <div class="msg-preview">${escapeHtml(campaign.message || "")}</div>
      <div class="campaign-real-summary">
        <div><span>Demandé</span><strong>${campaign.requested_clients || campaign.total_clients || 0}</strong></div>
        <div><span>Éligibles</span><strong>${campaign.eligible_clients || "—"}</strong></div>
        <div><span>Envoyés réels</span><strong>${campaign.real_sent_count || campaign.sent_count || 0}</strong></div>
        <div><span>Delivered</span><strong>${delivered}</strong></div>
        <div><span>En attente</span><strong>${queued}</strong></div>
        <div><span>Échecs</span><strong>${failed}</strong></div>
        <div><span>Segments réels</span><strong>${realSegments}</strong></div>
        <div><span>Statut final</span><strong>${escapeHtml(campaign.status || "")}</strong></div>
      </div>
      <table>
        <thead><tr><th>Nom</th><th>Numéro</th><th>Statut Twilio</th><th>Segments</th><th>Erreur</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">Aucun détail</td></tr>'}</tbody>
      </table>
    `
  );
}

async function loadSentTracking() {
  const data = await api("/history/sent-list");
  setText("sentTrackedCount", data?.summary?.alreadySent ?? "--");
  setText("remainingUnsentCount", data?.summary?.remaining ?? "--");

  const tbody = $("sentTrackingTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!data.success) {
    tbody.innerHTML = `<tr><td colspan="4">Erreur : ${escapeHtml(data.error || "chargement impossible")}</td></tr>`;
    return;
  }

  const items = data.contacts || [];
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">Aucun SMS réel enregistré depuis le dernier reset.</td></tr>`;
    return;
  }

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.name || "—")}</td>
      <td>${escapeHtml(item.phone || "")}</td>
      <td>${item.sms_count || 0}</td>
      <td>${escapeHtml(item.last_sent_at || "")}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function resetSentTracking() {
  const code = prompt("Mot de passe pour remettre la liste à 0");
  if (code !== "0000") {
    toast("Mot de passe incorrect");
    return;
  }

  const data = await api("/history/reset-sent-tracking", {
    method: "POST",
    body: JSON.stringify({ password: code })
  });

  showNiceResult("resetTrackingResult", data.success
    ? `<div class="okline"><strong>Liste remise à zéro</strong></div><div>Les anciens SMS restent dans l’historique, mais ils ne comptent plus comme déjà reçus.</div>`
    : `<div class="badline"><strong>Erreur :</strong> ${escapeHtml(data.error || "reset impossible")}</div>`
  );

  await loadSentTracking();
  await previewCampaign();
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
// HELPERS + EVENTS
// ======================================================

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("refreshAllBtn")?.addEventListener("click", refreshDashboard);
$("previewBtn")?.addEventListener("click", previewCampaign);
$("sendCampaignBtn")?.addEventListener("click", sendCampaign);
$("sendLimit")?.addEventListener("input", () => {
  const max = getUiSmsLimit();
  const value = Number($("sendLimit")?.value || 0);
  if (value > max) {
    $("sendLimit").value = String(max);
    toast("Sécurité : 300 SMS maximum par campagne");
  }
});
$("addClientBtn")?.addEventListener("click", addSingleClient);
$("importBtn")?.addEventListener("click", importContacts);
$("importCsvFileBtn")?.addEventListener("click", importCsvFileContacts);
$("importCsvFile")?.addEventListener("change", () => {
  const file = $("importCsvFile")?.files?.[0];
  setText("importCsvStatus", file ? `Fichier sélectionné : ${file.name}` : "Compatible avec l’export Android : name, phone, source, active.");
});
$("clearImportBtn")?.addEventListener("click", () => { if ($("importNumbers")) $("importNumbers").value = ""; });
$("loadClientsBtn")?.addEventListener("click", loadClients);
$("syncLoyaltyBtn")?.addEventListener("click", syncLoyaltyCardsIntoTwilio);
$("clientFilter")?.addEventListener("change", () => {
  state.clientsPage = 1;
  loadClients();
});
$("clientSearchBtn")?.addEventListener("click", () => {
  state.clientsSearch = $("clientSearch")?.value.trim() || "";
  state.clientsPage = 1;
  loadClients();
});
$("clearClientSearchBtn")?.addEventListener("click", () => {
  if ($("clientSearch")) $("clientSearch").value = "";
  state.clientsSearch = "";
  state.clientsPage = 1;
  loadClients();
});
$("clientSearch")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    state.clientsSearch = $("clientSearch")?.value.trim() || "";
    state.clientsPage = 1;
    loadClients();
  }
});
$("prevClientsPageBtn")?.addEventListener("click", () => {
  if (state.clientsPage > 1) {
    state.clientsPage -= 1;
    loadClients();
  }
});
$("nextClientsPageBtn")?.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(Number(state.clientsTotal || 0) / state.clientsPageSize));
  if (state.clientsPage < totalPages) {
    state.clientsPage += 1;
    loadClients();
  }
});
$("loadProblemsBtn")?.addEventListener("click", loadProblems);
$("loadHistoryBtn")?.addEventListener("click", loadHistory);
$("loadSentTrackingBtn")?.addEventListener("click", loadSentTracking);
$("resetSentTrackingBtn")?.addEventListener("click", resetSentTracking);

let appBooted = false;

function bootAppAfterAdminUnlock() {
  if (appBooted) return;
  if (!getAdminToken()) return;

  appBooted = true;
  initSettings();
  refreshDashboard();
  autoSyncLoyaltyIfPossible().then(() => loadClients()).catch(() => loadClients());
  loadProblems();
  loadHistory();
  loadSentTracking();
}

window.addEventListener("adn66:admin-unlocked", () => {
  bootAppAfterAdminUnlock();
});

setTimeout(() => {
  bootAppAfterAdminUnlock();
}, 250);
