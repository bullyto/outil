// PATH: /apps/status/app.js
const $ = (id) => document.getElementById(id);

function getVal(id, fallback = ""){
  const el = $(id);
  const v = el ? (el.value ?? "") : "";
  const t = String(v).trim();
  return t || fallback;
}

function setVal(id, value){
  const el = $(id);
  if(el) el.value = value;
}

function nowIsoParisish(){
  const d = new Date();
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(tz)/60)).padStart(2,"0");
  const mm = String(Math.abs(tz)%60).padStart(2,"0");
  return d.toISOString().replace("Z", `${sign}${hh}:${mm}`);
}

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(()=> t.classList.remove("show"), 2400);
}

async function loadStatus(){
  const r = await fetch("./status.json", { cache: "no-store" });
  return await r.json();
}

// AVANT: token GitHub localStorage
// MAINTENANT: PIN admin (0000) => le Worker utilise le secret GITHUB_TOKEN côté Cloudflare
function readAdminPin(){
  const fromInput = getVal("ghToken","").trim();
  if(fromInput) return fromInput;

  const saved = (localStorage.getItem("admin_pin") || "").trim();
  if(saved) return saved;

  return "";
}

function getCheckedDays(){
  const box = $("schedDays");
  if(!box) return [1,2,3,4,5,6,0];
  const checks = Array.from(box.querySelectorAll("input[type=checkbox]"));
  const days = checks.filter(c => c.checked).map(c => parseInt(c.value,10)).filter(n => Number.isFinite(n));
  return days.length ? days : [1,2,3,4,5,6,0];
}

function setCheckedDays(days){
  const box = $("schedDays");
  if(!box) return;
  const set = new Set((days||[]).map(n => String(n)));
  Array.from(box.querySelectorAll("input[type=checkbox]")).forEach(c => c.checked = set.has(String(c.value)));
}

/** --------- helpers affichage --------- */
function safeText(elId, txt, fallback="—"){
  const el = $(elId);
  if(!el) return;
  const t = (txt === null || txt === undefined) ? "" : String(txt);
  el.textContent = t.trim() ? t : fallback;
}

function safeImg(elId, src, fallback="images/panne.png"){
  const el = $(elId);
  if(!el) return;
  const s = (src === null || src === undefined) ? "" : String(src).trim();
  el.src = s || fallback;
}

function pickFirst(obj, keys){
  for(const k of keys){
    if(obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function getLiveCfg(data){
  const active = !!data.active;
  const mode = data.mode || "none";
  if(!active || !mode || mode === "none") return null;

  if(data.modes && data.modes[mode]) return data.modes[mode];
  if(data.presets && data.presets[mode]) return data.presets[mode];
  if(data.modes && data.modes[mode]) return data.modes[mode];

  return null;
}

function normalizeStatus(raw){
  const data = (window.structuredClone ? structuredClone(raw) : JSON.parse(JSON.stringify(raw)));
  if(!data.modes) data.modes = {};
  if(!data.presets) data.presets = {};

  Object.keys(data.modes).forEach(k => {
    if(k !== "info" && k !== "warning"){
      if(!data.presets[k]) data.presets[k] = data.modes[k];
    }
  });

  if(!data.modes.info){
    data.modes.info = { title:"Information", message:"", image:"images/panne.png", severity:"info", ok_delay_seconds:5 };
  }
  if(!data.modes.warning){
    data.modes.warning = {
      title:"Service momentanément indisponible",
      message:"Impossible de commander pour le moment.",
      image:"images/panne.png",
      severity:"warning",
      block_order:true,
      warning_click_message:"Ce n'est actuellement pas possible de commander.",
      block_schedule:{ enabled:false, days:[1,2,3,4,5,6,0], start:"19:00", end:"06:00" }
    };
  }

  const ensurePreset = (key, title, message, image) => {
    if(!data.presets[key]){
      data.presets[key] = { title, message, image, severity:"info" };
    }
  };

  ensurePreset("incident","Incident","Incident en cours. Merci de votre compréhension.","images/incident.png");
  ensurePreset("météo","Météo","Conditions météo compliquées. Service possiblement ralenti.","images/météo.png");
  ensurePreset("panne","Panne","Panne technique en cours. Service impacté.","images/panne.png");
  ensurePreset("sécurité","Sécurité","Mesure de sécurité en cours. Service temporairement indisponible.","images/sécurité.png");
  ensurePreset("ouverture_2230","Ouverture exceptionnelle","Le service ouvrira exceptionnellement à partir de 22h30 ce soir. Merci de votre compréhension.","images/panne.png");

  if(!data.presets.libre) data.presets.libre = { title:"", message:"", image:"images/panne.png", severity:"info" };

  return data;
}


function formatDateFr(value){
  if(!value) return "—";
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday:"long", day:"numeric", month:"long", year:"numeric",
    hour:"2-digit", minute:"2-digit"
  }).format(d).replace(":", "h");
}

function modeLabel(mode){
  if(mode === "info") return "Information";
  if(mode === "warning") return "Alerte / blocage";
  return "Aucun";
}

function formatCountdown(seconds){
  const n = Number(seconds || 0);
  if(!Number.isFinite(n) || n <= 0) return "Non";
  if(n < 60) return `Activé — durée : ${n} seconde${n > 1 ? "s" : ""}`;
  const min = Math.floor(n / 60);
  const rest = n % 60;
  if(!rest) return `Activé — durée : ${min} minute${min > 1 ? "s" : ""}`;
  return `Activé — durée : ${min} minute${min > 1 ? "s" : ""} et ${rest} seconde${rest > 1 ? "s" : ""}`;
}

function catalogAdn66(){
  return Array.isArray(window.STATUS_IMAGES_ADN66) ? window.STATUS_IMAGES_ADN66 : [];
}

function catalogCatalan(){
  return Array.isArray(window.STATUS_IMAGES_CATALAN) ? window.STATUS_IMAGES_CATALAN : [];
}

function fillImageSelect(selId, list){
  const sel = $(selId);
  if(!sel) return;
  sel.innerHTML = list.map(item => `<option value="${item.value}">${item.label}</option>`).join("");
}

function fillAdnImageSelect(){ fillImageSelect("adnImageSelect", catalogAdn66()); }
function fillCatalanImageSelect(){ fillImageSelect("catalanImageSelect", catalogCatalan()); }

function imageLabelFromAnyCatalog(value){
  const v = String(value || "").trim();
  if(!v) return "Aucune image";
  const found = [...catalogAdn66(), ...catalogCatalan()].find(x => x.value === v);
  return found ? found.label : v;
}

function imageLabelFromCatalog(value){
  return imageLabelFromAnyCatalog(value);
}

function syncAdnImageUi(){
  const method = getVal("adnImageMethod", "none");
  const listWrap = $("adnImageListWrap");
  const urlWrap = $("adnImageUrlWrap");
  if(listWrap) listWrap.classList.toggle("ui-hide", method !== "list");
  if(urlWrap) urlWrap.classList.toggle("ui-hide", method !== "url");
}

function getAdnImageState(){
  const method = getVal("adnImageMethod", "none");
  if(method === "list") return { value:getVal("adnImageSelect", ""), method };
  if(method === "url") return { value:getVal("image", ""), method };
  return { value:"", method:"none" };
}

function setAdnFormFromCfg(cfg){
  fillAdnImageSelect();
  const value = String(cfg?.image || "").trim();
  const list = catalogAdn66();
  if(value && list.some(x => x.value === value)){
    setVal("adnImageMethod", "list");
    setVal("adnImageSelect", value);
    setVal("image", value);
  }else if(value){
    setVal("adnImageMethod", "url");
    setVal("image", value);
  }else{
    setVal("adnImageMethod", "none");
    setVal("image", "");
  }
  syncAdnImageUi();
}

function syncCatalanImageUi(){
  const method = getVal("catalanImageMethod", "same");
  const listWrap = $("catalanImageListWrap");
  const urlWrap = $("catalanImageUrlWrap");
  if(listWrap) listWrap.classList.toggle("ui-hide", method !== "list");
  if(urlWrap) urlWrap.classList.toggle("ui-hide", method !== "url");
}

function getCatalanImageState(){
  const method = getVal("catalanImageMethod", "same");
  if(method === "none") return { value:"", disabled:true, method };
  if(method === "list") return { value:getVal("catalanImageSelect", ""), disabled:false, method };
  if(method === "url") return { value:getVal("catalanImageUrl", ""), disabled:false, method };
  return { value:"", disabled:false, method:"same" };
}

function setCatalanFormFromCfg(cfg){
  fillCatalanImageSelect();
  const disabled = !!cfg?.image_catalan_disabled;
  const value = String(cfg?.image_catalan || "").trim();
  const list = catalogCatalan();

  if(disabled){
    setVal("catalanImageMethod", "none");
  }else if(value && list.some(x => x.value === value)){
    setVal("catalanImageMethod", "list");
    setVal("catalanImageSelect", value);
  }else if(value){
    setVal("catalanImageMethod", "url");
    setVal("catalanImageUrl", value);
  }else{
    setVal("catalanImageMethod", "same");
  }
  syncCatalanImageUi();
}

function catalanImageForDisplay(cfg){
  if(cfg?.image_catalan_disabled) return "";
  return String(cfg?.image_catalan || cfg?.image || "").trim();
}

function scheduleText(cfg){
  if(!cfg || !cfg.block_order) return "Non";
  const s = cfg.block_schedule || {};
  if(!s.enabled) return "Oui — blocage permanent";
  const days = Array.isArray(s.days) ? s.days : [];
  const names = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const dayText = days.length ? days.map(d => names[d] || d).join(", ") : "tous les jours";
  return `Oui — ${s.start || "—"} → ${s.end || "—"}, ${dayText}`;
}

function fillPresetSelect(data){
  const sel = $("preset");
  if(!sel) return;
  const presets = data.presets || {};
  const keys = Object.keys(presets);

  const order = ["météo","incident","panne","sécurité","ouverture_2230","libre"];
  const sorted = Array.from(new Set([...order, ...keys]));

  sel.innerHTML = sorted
    .filter(k => presets[k])
    .map(k => `<option value="${k}">${k === "libre" ? "message libre" : (k === "ouverture_2230" ? "ouverture 22h30" : k)}</option>`)
    .join("");
}

function syncModePanels(){
  const mode = getVal("mode","none");
  const infoBox = $("infoBox");
  const warningBox = $("warningBox");
  if(infoBox) infoBox.classList.toggle("ui-hide", mode !== "info");
  if(warningBox) warningBox.classList.toggle("ui-hide", mode !== "warning");
}

/** ✅ Publié en ligne : complet + ne met plus "—" inutilement */
function renderLivePreview(data){
  const active = !!data.active;
  const mode = data.mode || "none";
  const cfg = getLiveCfg(data) || {};
  const card = $("publishedNow");
  if(!card) return;

  safeText("liveActive", active ? "ACTIF" : "INACTIF");
  safeText("liveMode", mode);
  safeText("liveUpdated", formatDateFr(data.last_update || ""));

  const bd = card.querySelector(".bd");
  if(!bd) return;

  if(!active || mode === "none" || !getLiveCfg(data)){
    bd.innerHTML = `
      <div class="adn-lite-inline-card">
        <h3 style="margin:0 0 10px;font-size:22px;color:#f8fafc">Aucun statut n’est publié actuellement.</h3>
        <div class="small">Dernière modification : <b>${formatDateFr(data.last_update)}</b></div>
      </div>`;
    return;
  }

  const imgAdn = String(cfg.image || "").trim();
  const imgCat = catalanImageForDisplay(cfg);
  const countdown = mode === "info" ? formatCountdown(cfg.ok_delay_seconds) : "Non";
  const blocked = mode === "warning" && cfg.block_order;

  bd.innerHTML = `
    <div class="adn-lite-inline-card">
      <h3 style="margin:0 0 12px;font-size:22px;color:#f8fafc">Statut actuellement publié</h3>
      ${imgAdn ? `<img src="${imgAdn}" alt="Image Apéro de Nuit 66" style="width:100%;max-height:240px;object-fit:cover;border-radius:18px;margin-bottom:12px">` : ""}
      <div class="kv" aria-label="Détails publication">
        <div class="k">Titre :</div><div><b>${cfg.title || "—"}</b></div>
        <div class="k">Message :</div><div><b>${cfg.message || "—"}</b></div>
        <div class="k">Mode :</div><div><b>${modeLabel(mode)}</b></div>
        <div class="k">Publié le :</div><div><b>${formatDateFr(data.published_at || data.last_update)}</b></div>
        <div class="k">Commande bloquée :</div><div><b>${blocked ? "Oui" : "Non"}</b></div>
        <div class="k">Compte à rebours :</div><div><b>${countdown}</b></div>
        ${mode === "warning" ? `<div class="k">Blocage :</div><div><b>${scheduleText(cfg)}</b></div>` : ""}
        ${mode === "warning" && cfg.warning_click_message ? `<div class="k">Message au clic :</div><div><b>${cfg.warning_click_message}</b></div>` : ""}
        <div class="k">Image ADN66 :</div><div><b>${imgAdn ? imageLabelFromAnyCatalog(imgAdn) : "Aucune image"}</b></div>
        <div class="k">Image ADN66 :</div><div><b>${imgAdn ? imageLabelFromAnyCatalog(imgAdn) : "Aucune image"}</b></div>
        <div class="k">Image ADN66 :</div><div><b>${imgAdn ? imageLabelFromAnyCatalog(imgAdn) : "Aucune image"}</b></div>
        <div class="k">Image Catalan :</div><div><b>${cfg.image_catalan_disabled ? "Aucune image Catalan" : (cfg.image_catalan ? imageLabelFromCatalog(cfg.image_catalan) : "Même image que ADN66")}</b></div>
      </div>
      ${imgCat && imgCat !== imgAdn ? `<div style="margin-top:14px"><div class="small" style="margin-bottom:8px"><b>Aperçu image Catalan</b></div><img src="${imgCat}" alt="Image Apéro Catalan" style="width:100%;max-height:220px;object-fit:cover;border-radius:18px"></div>` : ""}
    </div>`;
}

function renderPreview(data){
  const active = getVal("active", "false") === "true";
  const mode = getVal("mode", "none");
  const cfg = data.modes?.[mode] || {};
  const preview = document.querySelector(".preview .bd");

  if ($("pActive")) $("pActive").textContent = active ? "ACTIF" : "INACTIF";
  if ($("pMode")) $("pMode").textContent = mode;

  if(!preview) return;

  if(!active || mode === "none"){
    preview.innerHTML = `
      <div class="adn-lite-inline-card">
        <h3 style="margin:0 0 10px;font-size:22px;color:#f8fafc">Aucun statut publié actuellement</h3>
        <div class="small">Dernière modification : <b>${formatDateFr(data.last_update)}</b></div>
      </div>`;
    return;
  }

  const imgAdn = String(cfg.image || "").trim();
  const imgCat = catalanImageForDisplay(cfg);
  const countdown = mode === "info" ? formatCountdown(cfg.ok_delay_seconds) : "Non";
  const blocked = mode === "warning" && cfg.block_order;

  preview.innerHTML = `
    ${imgAdn ? `<img id="pImg" alt="Aperçu image ADN66" src="${imgAdn}" />` : ""}
    <div class="badge" style="margin-top:12px">
      <span>Dernière maj :</span> <b>${formatDateFr(data.last_update)}</b>
      <span style="opacity:.5">•</span>
      <span>Mode :</span> <b>${modeLabel(mode)}</b>
    </div>
    <div style="margin-top:12px;font-weight:900;font-size:24px;color:#f8fafc">${cfg.title || "—"}</div>
    <div style="margin-top:8px;color:#cbd5e1;font-weight:700;line-height:1.35">${(cfg.message || "—").replace(/\n/g,"<br>")}</div>
    <div class="adn-lite-inline-card">
      <div class="kv">
        <div class="k">Commande bloquée :</div><div><b>${blocked ? "Oui" : "Non"}</b></div>
        <div class="k">Compte à rebours :</div><div><b>${countdown}</b></div>
        ${mode === "warning" ? `<div class="k">Blocage :</div><div><b>${scheduleText(cfg)}</b></div>` : ""}
        <div class="k">Image ADN66 :</div><div><b>${imgAdn ? imageLabelFromAnyCatalog(imgAdn) : "Aucune image"}</b></div>
        <div class="k">Image Catalan :</div><div><b>${cfg.image_catalan_disabled ? "Aucune image Catalan" : (cfg.image_catalan ? imageLabelFromCatalog(cfg.image_catalan) : "Même image que ADN66")}</b></div>
      </div>
      ${imgCat && imgCat !== imgAdn ? `<div style="margin-top:12px"><div class="small" style="margin-bottom:8px"><b>Aperçu Catalan</b></div><img src="${imgCat}" alt="Aperçu image Catalan" style="width:100%;max-height:220px;object-fit:cover;border-radius:18px"></div>` : ""}
    </div>`;
}

function setFormFromStatus(data){
  setVal("active", String(!!data.active));

  let uiMode = "none";
  let presetKey = "libre";
  const rawMode = data.mode || "none";

  if(rawMode === "info" || rawMode === "warning" || rawMode === "none"){
    uiMode = rawMode;
    presetKey = "libre";
  } else {
    presetKey = rawMode;
    const cfgOld = data.presets?.[presetKey] || data.modes?.[presetKey] || {};
    const sev = String(cfgOld.severity || "info");
    uiMode = (sev === "warning" || sev === "danger") ? "warning" : "info";
  }

  if(!data.active) uiMode = "none";

  setVal("mode", uiMode);

  fillPresetSelect(data);
  if($("preset")) setVal("preset", presetKey);

  const preset = data.presets?.[presetKey] || {};
  setVal("title", preset.title || "");
  setVal("message", preset.message || "");

  const modeCfgForAdn = data.modes?.[uiMode] || {};
  const adnSource = (presetKey && presetKey !== "libre") ? preset : modeCfgForAdn;
  setAdnFormFromCfg(adnSource);

  const modeCfgForCatalan = data.modes?.[uiMode] || {};
  const catalanSource = (presetKey && presetKey !== "libre") ? preset : modeCfgForCatalan;
  setCatalanFormFromCfg(catalanSource);

  const infoCfg = data.modes?.info || {};
  setVal("okDelay", String(infoCfg.ok_delay_seconds ?? 5));

  const warnCfg = data.modes?.warning || {};
  setVal("warningClickMsg", warnCfg.warning_click_message || "Ce n'est actuellement pas possible de commander.");
  const sched = warnCfg.block_schedule || {};
  setVal("schedEnabled", String(!!sched.enabled));
  setVal("schedStart", sched.start || "19:00");
  setVal("schedEnd", sched.end || "06:00");
  setCheckedDays(sched.days || [1,2,3,4,5,6,0]);

  // Remplir le PIN enregistré si vide
  const savedPin = (localStorage.getItem("admin_pin") || "").trim();
  if(savedPin && $("ghToken") && !getVal("ghToken","")) setVal("ghToken", savedPin);

  syncModePanels();

  renderPreview(buildUpdatedStatus(data));
  renderLivePreview(data);
}

function buildUpdatedStatus(current){
  const data = (window.structuredClone ? structuredClone(current) : JSON.parse(JSON.stringify(current)));

  const active = getVal("active", "false") === "true";
  let mode = getVal("mode", "none");
  const presetKey = getVal("preset","libre");

  if (!active){
    mode = "none";
    setVal("mode", "none");
  }

  data.active = active;
  data.mode = mode;
  data.last_update = nowIsoParisish();

  if(!data.created_at) data.created_at = data.last_update;
  data.published_at = data.last_update;
  if(active && mode !== "none"){
    if(!data.starts_at) data.starts_at = data.last_update;
    if(data.ends_at === undefined) data.ends_at = "";
  } else {
    if(data.ends_at === undefined) data.ends_at = "";
  }

  if (!data.modes) data.modes = {};
  if (!data.presets) data.presets = {};

  if(!data.modes.info) data.modes.info = { title:"", message:"", image:"images/panne.png", severity:"info", ok_delay_seconds:5 };
  if(!data.modes.warning) data.modes.warning = {
    title:"", message:"", image:"images/panne.png", severity:"warning", block_order:true,
    warning_click_message:"Ce n'est actuellement pas possible de commander.",
    block_schedule:{ enabled:false, days:[1,2,3,4,5,6,0], start:"19:00", end:"06:00" }
  };

  const title = getVal("title","").trim();
  const message = getVal("message","").trim();
  const adnImage = getAdnImageState();
  const image = adnImage.value;
  const catalanImage = getCatalanImageState();

  if(presetKey && presetKey !== "libre"){
    if(!data.presets[presetKey]) data.presets[presetKey] = {};
    data.presets[presetKey].title = title;
    data.presets[presetKey].message = message;
    data.presets[presetKey].image = image;
    data.presets[presetKey].image_catalan = catalanImage.value;
    data.presets[presetKey].image_catalan_disabled = !!catalanImage.disabled;
  }

  if (mode !== "none" && active){
    if(mode === "info"){
      data.modes.info.title = title;
      data.modes.info.message = message;
      data.modes.info.image = image;
      data.modes.info.image_catalan = catalanImage.value;
      data.modes.info.image_catalan_disabled = !!catalanImage.disabled;
      data.modes.info.severity = "info";
      const d = parseInt(getVal("okDelay","5"),10);
      data.modes.info.ok_delay_seconds = Number.isFinite(d) && d >= 0 ? d : 5;
    }

    if(mode === "warning"){
      data.modes.warning.title = title;
      data.modes.warning.message = message;
      data.modes.warning.image = image;
      data.modes.warning.image_catalan = catalanImage.value;
      data.modes.warning.image_catalan_disabled = !!catalanImage.disabled;
      data.modes.warning.severity = "warning";
      data.modes.warning.block_order = true;
      data.modes.warning.warning_click_message = getVal("warningClickMsg","Ce n'est actuellement pas possible de commander.").trim();
      data.modes.warning.block_schedule = {
        enabled: getVal("schedEnabled","false") === "true",
        start: getVal("schedStart","19:00"),
        end: getVal("schedEnd","06:00"),
        days: getCheckedDays()
      };
    }
  }

  return data;
}

function startClock(){
  const clock = $("clock");
  const today = $("today");
  const fmtTime = new Intl.DateTimeFormat("fr-FR", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  const fmtDate = new Intl.DateTimeFormat("fr-FR", { weekday:"long", year:"numeric", month:"long", day:"2-digit" });
  const tick = () => {
    const d = new Date();
    if(clock) clock.textContent = fmtTime.format(d);
    if(today) today.textContent = fmtDate.format(d);
  };
  tick();
  setInterval(tick, 1000);
}

async function refreshOnlinePublished(){
  try{
    const raw = await loadStatus();
    const normalized = normalizeStatus(raw);
    renderLivePreview(normalized);
  }catch(e){
    console.warn("refreshOnlinePublished failed", e);
  }
}

async function main(){
  startClock();

  // On garde ces champs (UI) sans les casser, mais la publication n’en dépend plus.
  setVal("ghOwner", localStorage.getItem("gh_owner") || getVal("ghOwner","bullyto") || "bullyto");
  setVal("ghRepo", localStorage.getItem("gh_repo") || getVal("ghRepo","outil") || "outil");
  setVal("ghBranch", localStorage.getItem("gh_branch") || getVal("ghBranch","main") || "main");
  setVal("ghPath", localStorage.getItem("gh_path") || getVal("ghPath","apps/status/status.json") || "apps/status/status.json");

  let currentRaw = await loadStatus();
  let current = normalizeStatus(currentRaw);

  if ($("mode")){
    $("mode").innerHTML =
      `<option value="none">Aucun (service OK)</option>` +
      ["info","warning"].map(m => `<option value="${m}">${m}</option>`).join("");
  }

  fillAdnImageSelect();
  fillCatalanImageSelect();
  setFormFromStatus(current);

  const rerender = () => {
    syncModePanels();
    renderPreview(buildUpdatedStatus(current));
  };

  if($("preset")) $("preset").addEventListener("change", ()=>{
    const key = getVal("preset","libre");
    const p = current.presets?.[key] || {};
    setVal("title", p.title || "");
    setVal("message", p.message || "");
    setAdnFormFromCfg(p);
    setCatalanFormFromCfg(p);
    rerender();
  });

  if ($("active")) $("active").addEventListener("change", rerender);
  if ($("mode")) $("mode").addEventListener("change", ()=> { syncModePanels(); rerender(); });

  ["title","message","adnImageMethod","adnImageSelect","image","catalanImageMethod","catalanImageSelect","catalanImageUrl","okDelay","schedEnabled","schedStart","schedEnd","warningClickMsg"].forEach(id => {
    const el = $(id);
    if(el) el.addEventListener("input", rerender);
    if(el) el.addEventListener("change", rerender);
  });
  if($("schedDays")) $("schedDays").addEventListener("change", rerender);
  if($("adnImageMethod")) $("adnImageMethod").addEventListener("change", () => { syncAdnImageUi(); rerender(); });
  if($("catalanImageMethod")) $("catalanImageMethod").addEventListener("change", () => { syncCatalanImageUi(); rerender(); });

  // Boutons "token" => deviennent "PIN"
  if ($("btnSaveToken")) $("btnSaveToken").addEventListener("click", ()=>{
    const pin = readAdminPin();
    if(!pin){ toast("Mot de passe vide."); return; }
    localStorage.setItem("admin_pin", pin);
    toast("Mot de passe enregistré sur cet appareil.");
  });
  if ($("btnClearToken")) $("btnClearToken").addEventListener("click", ()=>{
    localStorage.removeItem("admin_pin");
    setVal("ghToken","");
    toast("Mot de passe supprimé.");
  });

  ["ghOwner","ghRepo","ghBranch","ghPath"].forEach(id => {
    const el = $(id);
    if(!el) return;
    el.addEventListener("change", ()=>{
      localStorage.setItem(id.replace("gh","gh_").toLowerCase(), getVal(id,""));
    });
  });

  if ($("btnPublish")) $("btnPublish").addEventListener("click", async ()=>{
    try{
      const pin = readAdminPin();
      if(!pin){ toast("Entre le mot de passe (0000)."); return; }

      const updated = buildUpdatedStatus(current);

      toast("Publication via Cloudflare...");
      const r = await fetch("https://quiet-sunset-9161.apero-nuit-du-66.workers.dev/api/status/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, content: updated })
      });

      const txt = await r.text();
      let j = null;
      try{ j = JSON.parse(txt); }catch(e){}

      if(!r.ok || !j || j.ok !== true){
        const msg = (j && j.error) ? String(j.error) : `HTTP ${r.status}`;
        throw new Error(msg);
      }

      localStorage.setItem("admin_pin", pin);
      current = updated;

      toast("Vérification en ligne...");
      await refreshOnlinePublished();

      toast("Publié ✅");
    }catch(err){
      console.error(err);
      toast("Erreur : " + (err?.message || err));
    }
  });

  refreshOnlinePublished();
}

main();