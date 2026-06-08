function extractClientIdFromAny(raw){
  let s = String(raw || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if(!s) return "";
  try{
    const mId = s.match(/[?&#]id=([^&#\s]+)/i) || s.match(/\bid=([^&#\s]+)/i);
    if(mId && mId[1]) return decodeURIComponent(mId[1]).trim();
  }catch(_){}
  try{
    if(/^https?:\/\//i.test(s)){
      const u = new URL(s);
      const id = u.searchParams.get("id") || u.searchParams.get("client_id");
      if(id) return String(id).trim();
    }
  }catch(_){}
  try{
    if(s[0] === "{"){
      const o = JSON.parse(s);
      const id = o && (o.id || o.cid || o.client_id || o.clientId);
      if(id) return String(id).trim();
    }
  }catch(_){}
  const mm = s.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if(mm && mm[0]) return mm[0];
  return s;
}

const API_BASE = "https://carte-de-fideliter.apero-nuit-du-66.workers.dev";
const ADMIN_LS = "adn66_loyalty_local_pin";
const LOCAL_MODULE_PIN = "0000";
const WORKER_KEY_STORAGE = "adn66_admin_worker_key";
const RESTORE_PREFIX = "https://www.aperos.net/fidel/client.html?restore=1&id=";

const $ = (id) => document.getElementById(id);
const video = $("video");
const scanHint = $("scanHint");
const scanModal = $("scanModal");
const smartModal = $("smartModal");
const qrModal = $("qrFull");

let stream = null;
let scanning = false;
let currentClient = { id:"", name:"", phone:"", points:null };
let currentQr = { id:"", url:"", meta:null };
let zxingControls = null;

function normalizePhone(raw){ return (raw||"").replace(/[^0-9+]/g,"").trim(); }
function escapeHtml(s){ return String(s||"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function maskPhone(phone){ phone=(phone||"").replace(/\s+/g,""); return phone.length < 6 ? phone : phone.slice(0,2)+" ** ** "+phone.slice(-2); }
function displayPhone(phone, phoneLast4=""){
  const clean = normalizePhone(phone || "");
  if(clean) return clean.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  const l4 = String(phoneLast4 || "").trim();
  return l4 ? "•• •• •• " + l4 : "—";
}
function formatDateTime(iso){
  if(!iso) return "—";
  const d = new Date(String(iso));
  if(Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("fr-FR", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"});
}
function getWorkerAdminKey(){
  try{
    if(window.ADNAdminGate && typeof window.ADNAdminGate.getWorkerKey === "function"){
      const k = window.ADNAdminGate.getWorkerKey();
      if(k) return String(k).trim();
    }
    return String(sessionStorage.getItem(WORKER_KEY_STORAGE) || "").trim();
  }catch(_){ return ""; }
}
function checkLocalPin(){
  const pin = ($("adminKey") && $("adminKey").value || "").trim();
  if(pin !== LOCAL_MODULE_PIN){ showError("Code module incorrect. Le code local est obligatoire avant d’afficher ou modifier les données."); return false; }
  localStorage.setItem(ADMIN_LS, pin);
  return true;
}
function requireAdminAccess(){
  if(!checkLocalPin()) return "";
  const key = getWorkerAdminKey();
  if(!key){ showError("Mot de passe Age Gate manquant. Fermez puis rouvrez la page et entrez le mot de passe admin."); return ""; }
  return key;
}
function pointsLabel(points){ return points === null || points === undefined || points === "" ? "Points : ?" : `Points : ${Number(points||0)}/8`; }
function clientName(meta){ return (meta && (meta.name || meta.prenom || meta.firstname)) || "Client"; }
function isValidClientId(id){
  const s = String(id||"").trim();
  if(!s) return false;
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return true;
  if(/^[0-9A-HJKMNP-TV-Z]{26}$/.test(s)) return true;
  return s.length >= 8;
}

function setEnvPill(){ const el=$("envPill"); if(el) el.innerHTML = "Mode : <b>" + (API_BASE ? "Serveur" : "Démo") + "</b>"; }
function setApiState(ok, msg){
  const dot = $("dot"); if(dot){ dot.classList.remove("ok","warn","bad"); dot.classList.add(ok ? "ok" : "warn"); }
  const apiState = $("apiState"); if(apiState) apiState.textContent = msg || (ok ? "OK" : "Erreur");
}
function setMainStatus(msg){ const el=$("mainStatus"); if(el) el.textContent = msg || ""; }

async function api(path, opts={}){
  const url = API_BASE + path;
  const res = await fetch(url, { headers:{"content-type":"application/json"}, ...opts });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if(!res.ok) throw new Error((data && data.error) ? data.error : ("HTTP "+res.status));
  return data;
}

function setClient(id, meta={}){
  const cleanId = String(id || "").trim();
  currentClient = {
    id: cleanId,
    name: meta.name || currentClient.name || "",
    phone: meta.phone || currentClient.phone || "",
    points: meta.points !== undefined ? meta.points : currentClient.points
  };
  const idEl = $("clientId"); if(idEl) idEl.value = cleanId;
  const title = $("currentClientTitle"); if(title) title.textContent = cleanId ? (currentClient.name || "Client sélectionné") : "Aucun client sélectionné";
  const points = $("currentClientPoints"); if(points) points.textContent = cleanId ? pointsLabel(currentClient.points) : "—";
  const small = $("currentClientId"); if(small) small.textContent = cleanId || "Scanne une carte ou recherche par téléphone.";
}

function setScanned(raw){
  window.__adn66_last_scan_raw = String(raw || "").trim();
  const id = extractClientIdFromAny(raw);
  setClient(id, {points:null});
  return id;
}

document.addEventListener("input", (e)=>{
  const t=e.target;
  if(t && t.id === "clientId"){
    const id = extractClientIdFromAny(t.value || "");
    if(id && id !== t.value) t.value = id;
    setClient(id, {points:currentClient.points});
  }
}, true);

function openModal(el){ if(el) el.classList.add("open"); }
function closeModal(el){ if(el) el.classList.remove("open"); }

function showSmart({title="", sub="", body="", actions=[]}){
  $("smartTitle").textContent = title;
  $("smartSub").textContent = sub;
  $("smartBody").innerHTML = body;
  const host = $("smartActions");
  host.className = "modal-actions" + (actions.length === 2 ? " two" : actions.length === 3 ? " three" : "");
  host.innerHTML = "";
  actions.forEach(a=>{
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = a.label;
    btn.className = a.className || (a.secondary ? "secondary" : "");
    btn.addEventListener("click", async ()=>{
      if(a.close !== false) closeModal(smartModal);
      if(a.onClick) await a.onClick();
    });
    host.appendChild(btn);
  });
  openModal(smartModal);
}

function showError(message){
  showSmart({title:"Erreur", sub:"Action impossible", body:escapeHtml(message), actions:[{label:"OK", secondary:true}]});
}

function showScanConfirm(id){
  showSmart({
    title:"Carte détectée ✅",
    sub:"Client prêt à être validé",
    body:`<p><b>ID client :</b><br><span class="mono">${escapeHtml(id)}</span></p><p>${pointsLabel(currentClient.points)}</p>`,
    actions:[
      {label:"Ajouter +1 point", onClick:()=>confirmStampClient({client_id:id, points:currentClient.points})},
      {label:"Afficher QR", secondary:true, onClick:()=>showRecoveryQr(id, currentClient)},
      {label:"Annuler", secondary:true}
    ]
  });
}

async function startScan(){
  if(scanning) return;
  scanning = true;
  openModal(scanModal);
  scanHint.textContent = "Ouverture caméra…";
  const constraints = { video:{ facingMode:{ ideal:"environment" } }, audio:false };
  const finish = async (raw)=>{
    const cid = extractClientIdFromAny(raw);
    if(!cid) return;
    setScanned(raw || cid);
    scanHint.textContent = "QR détecté ✅";
    await stopScan(false);
    closeModal(scanModal);
    showScanConfirm(cid);
  };
  try{
    if("BarcodeDetector" in window){
      const detector = new BarcodeDetector({formats:["qr_code"]});
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await video.play();
      scanHint.textContent = "Scan en cours…";
      while(scanning){
        const barcodes = await detector.detect(video);
        if(barcodes && barcodes.length){
          const val = barcodes[0].rawValue || "";
          if(extractClientIdFromAny(val)){ await finish(val); return; }
        }
        await new Promise(r=>setTimeout(r,200));
      }
      return;
    }
    if(window.ZXing && window.ZXing.BrowserQRCodeReader){
      const reader = new window.ZXing.BrowserQRCodeReader();
      scanHint.textContent = "Scan en cours…";
      zxingControls = await reader.decodeFromVideoDevice(undefined, video, (result, err, controls)=>{
        if(!scanning) return;
        if(result && result.getText){ finish(result.getText()); }
      });
      return;
    }
    scanHint.textContent = "Scan non supporté sur ce navigateur.";
    scanning = false;
  }catch(e){
    scanning = false;
    scanHint.textContent = "Erreur caméra : " + (e && e.message ? e.message : String(e));
    try{ await stopScan(false); }catch(_){}
  }
}

async function stopScan(close=true){
  scanning = false;
  try{ if(zxingControls && zxingControls.stop) zxingControls.stop(); }catch(_){}
  zxingControls = null;
  try{ video.pause(); }catch(_){}
  if(stream){ try{ stream.getTracks().forEach(t=>t.stop()); }catch(_){} stream = null; }
  if(video) video.srcObject = null;
  if(scanHint) scanHint.textContent = "Arrêt.";
  if(close) closeModal(scanModal);
}

function demoSearchByPhone(phone){
  const results=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k && k.startsWith("adn66_demo_profile_c_")){
      const cid=k.replace("adn66_demo_profile_","");
      const p=JSON.parse(localStorage.getItem(k)||"null");
      if(p && normalizePhone(p.phone) === phone){
        const s=JSON.parse(localStorage.getItem("adn66_demo_state_"+cid)||"{}");
        results.push({client_id:cid,name:p.name,phone:p.phone,points:s.points||0,completed_at:s.completed_at||null});
      }
    }
  }
  return results;
}

function renderResults(items){
  const host=$("results");
  if(!items || !items.length){ host.innerHTML = "<div class='hint'>Aucun résultat.</div>"; return; }
  host.innerHTML = "";
  items.forEach((it, index)=>{
    const cid = it.client_id || it.id || it.cid || "";
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="result-top">
        <div>
          <div class="result-name">${escapeHtml(it.name || "Client")}</div>
          <div class="result-meta mono">${escapeHtml(maskPhone(it.phone || ""))}</div>
        </div>
        <div class="result-meta">${pointsLabel(it.points)}</div>
      </div>
      <div class="result-actions">
        <button class="small" data-action="stamp">+1</button>
        <button class="secondary small" data-action="qr">QR</button>
        <button class="secondary small" data-action="select">Sélect.</button>
        <button class="secondary small" data-action="copy">Copier</button>
      </div>`;
    card.querySelector('[data-action="stamp"]').addEventListener("click", ()=>confirmStampClient({...it, client_id:cid}));
    card.querySelector('[data-action="qr"]').addEventListener("click", ()=>showRecoveryQr(cid, it));
    card.querySelector('[data-action="select"]').addEventListener("click", ()=>{ setClient(cid, it); setMainStatus("Client sélectionné depuis la recherche."); });
    card.querySelector('[data-action="copy"]').addEventListener("click", ()=>copyText(cid, "ID copié."));
    host.appendChild(card);
  });
}

function confirmStampClient(client){
  const cid = client.client_id || client.id || currentClient.id || $("clientId").value;
  if(!cid) return showError("Aucun client sélectionné.");
  showSmart({
    title:"Confirmer +1 point ?",
    sub:clientName(client),
    body:`<p><b>Téléphone :</b> ${escapeHtml(maskPhone(client.phone || currentClient.phone || "—"))}</p><p><b>${pointsLabel(client.points ?? currentClient.points)}</b></p><p class="mono">${escapeHtml(cid)}</p>`,
    actions:[
      {label:"Confirmer +1", onClick:()=>stampClient(cid, client)},
      {label:"Afficher QR", secondary:true, onClick:()=>showRecoveryQr(cid, client)},
      {label:"Annuler", secondary:true}
    ]
  });
}

async function stampClient(cid, meta={}){
  const key = requireAdminAccess();
  cid = String(cid || "").trim();
  if(!key) return;
  if(!isValidClientId(cid)) return showError("ID client invalide.");
  $("who").textContent = "PIN local OK";
  setClient(cid, meta);
  if(!API_BASE){
    const stKey = "adn66_demo_state_"+cid;
    const state = JSON.parse(localStorage.getItem(stKey) || '{"points":0,"completed_at":null}');
    if(state.points >= 8 && state.completed_at){
      showPointResult(cid, meta, state.points, true, "Carte déjà complétée. Attendre le reset auto.");
      return;
    }
    state.points = (state.points || 0) + 1;
    if(state.points >= 8){ state.points = 8; state.completed_at = new Date().toISOString(); }
    localStorage.setItem(stKey, JSON.stringify(state));
    setApiState(true, "Démo locale");
    setClient(cid, {...meta, points:state.points});
    showPointResult(cid, meta, state.points, state.points >= 8);
    return;
  }
  try{
    const r = await api("/loyalty/stamp", {method:"POST", headers:{"content-type":"text/plain;charset=utf-8"}, body:JSON.stringify({admin_key:key, client_id:cid})});
    const points = r.points ?? r.total_points ?? r.current_points ?? meta.points ?? null;
    setApiState(true, "Validé ✅");
    setClient(cid, {...meta, points});
    showPointResult(cid, meta, points, Number(points) >= 8);
  }catch(e){
    setApiState(false, "Erreur");
    showError("Erreur validation : " + e.message);
  }
}

function showPointResult(cid, meta={}, points=null, complete=false, custom=""){
  const title = complete ? "Carte complète 🎁" : "Point ajouté ✅";
  const body = custom ? escapeHtml(custom) : `<p><b>${clientName(meta)}</b></p><p>Le client a maintenant : <b>${pointsLabel(points).replace("Points : ","")}</b></p>`;
  showSmart({
    title,
    sub: complete ? "Récompense à donner maintenant" : "Validation enregistrée",
    body,
    actions:[
      {label:"Scanner un autre", onClick:()=>startScan()},
      {label:"Afficher QR", secondary:true, onClick:()=>showRecoveryQr(cid, {...meta, points})},
      {label:"Fermer", secondary:true}
    ]
  });
}

async function stamp(){
  const cid = ($("clientId").value || currentClient.id || "").trim();
  confirmStampClient({client_id:cid, ...currentClient});
}

async function search(){
  const key = requireAdminAccess();
  const phone = normalizePhone($("searchPhone").value);
  if(!key) return;
  if(!phone || phone.length < 10) return showError("Téléphone invalide.");
  setMainStatus("Recherche en cours…");
  if(!API_BASE){
    const items = demoSearchByPhone(phone);
    renderResults(items);
    setApiState(true, "Démo locale");
    setMainStatus(items.length ? `${items.length} résultat(s).` : "Aucun résultat.");
    return;
  }
  try{
    const items = await api("/admin/loyalty/search?phone="+encodeURIComponent(phone)+"&admin_key="+encodeURIComponent(key), {method:"GET"});
    const results = items.found && items.client ? [items.client] : (items.results || []);
    renderResults(results);
    setApiState(true, "OK");
    setMainStatus(results.length ? `${results.length} résultat(s).` : "Aucun résultat.");
  }catch(e){
    setApiState(false, "Erreur");
    showError("Erreur recherche : " + e.message);
  }
}

function clearResults(){ $("results").innerHTML = ""; $("searchPhone").value = ""; setMainStatus("Recherche effacée."); }

function renderHistory(items){
  const host = $("historyList");
  if(!host) return;
  if(!items || !items.length){ host.innerHTML = "<div class='hint'>Aucune carte créée pour le moment.</div>"; return; }
  host.innerHTML = "";
  items.forEach(it=>{
    const cid = it.client_id || it.id || "";
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="result-top">
        <div>
          <div class="result-name">${escapeHtml(it.name || "Client")}</div>
          <div class="result-meta mono">${escapeHtml(displayPhone(it.phone || it.phone_digits || "", it.phone_last4))}</div>
          <div class="result-meta">Créée le ${escapeHtml(formatDateTime(it.created_at))}</div>
        </div>
        <div class="result-meta">${pointsLabel(it.points)}<br>${it.completed_at ? "Complète" : ""}</div>
      </div>
      <div class="result-actions">
        <button class="small" data-action="stamp">+1 point</button>
        <button class="secondary small" data-action="select">Sélect.</button>
        <button class="secondary small" data-action="qr">QR</button>
        <button class="secondary small" data-action="copy">Copier</button>
      </div>`;
    card.querySelector('[data-action="stamp"]').addEventListener("click", ()=>confirmStampClient({client_id:cid, name:it.name, phone:it.phone || it.phone_digits, phone_last4:it.phone_last4, points:it.points}));
    card.querySelector('[data-action="select"]').addEventListener("click", ()=>{ setClient(cid, {name:it.name, phone:it.phone || it.phone_digits, points:it.points}); setMainStatus("Client sélectionné depuis l’historique."); });
    card.querySelector('[data-action="qr"]').addEventListener("click", ()=>showRecoveryQr(cid, {name:it.name, phone:it.phone || it.phone_digits, points:it.points}));
    card.querySelector('[data-action="copy"]').addEventListener("click", ()=>copyText(cid, "ID copié."));
    host.appendChild(card);
  });
}

async function loadHistory(){
  const key = requireAdminAccess();
  if(!key) return;
  setMainStatus("Chargement de l’historique…");
  if(!API_BASE){ renderHistory([]); setApiState(true, "Démo locale"); return; }
  try{
    const r = await api("/admin/loyalty/history?limit=100&admin_key="+encodeURIComponent(key), {method:"GET"});
    const items = r.items || r.history || [];
    renderHistory(items);
    setApiState(true, "Historique OK");
    setMainStatus(items.length ? `${items.length} carte(s) affichée(s).` : "Aucune carte trouvée.");
  }catch(e){
    setApiState(false, "Erreur");
    showError("Erreur historique : " + e.message);
  }
}

function qrRender(payload){
  const host = $("qrSvg"); if(!host) return;
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  host.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.background = "#fff"; wrap.style.padding = "18px"; wrap.style.borderRadius = "18px"; wrap.style.display = "inline-block";
  host.appendChild(wrap);
  try{
    if(typeof window.QRCode !== "function"){ wrap.textContent = "QR indisponible"; return; }
    new QRCode(wrap, {text:String(text||""), width:260, height:260, correctLevel:QRCode.CorrectLevel.M});
  }catch(e){ wrap.textContent = "QR indisponible"; }
}

function showRecoveryQr(cid, meta={}){
  try{
    const id = String(cid || "").trim();
    if(!id) return showError("ID client manquant pour le QR.");
    const restoreUrl = RESTORE_PREFIX + encodeURIComponent(id);
    currentQr = {id, url:restoreUrl, meta};
    $("qrSub").textContent = `${clientName(meta)} • ${pointsLabel(meta.points)} • ${restoreUrl}`;
    qrRender(restoreUrl);
    openModal(qrModal);
  }catch(e){ showError("Erreur QR : " + (e && e.message ? e.message : e)); }
}

function copyText(text, ok="Copié."){
  if(!text) return;
  if(navigator.clipboard){ navigator.clipboard.writeText(text).then(()=>setMainStatus(ok)).catch(()=>showSmart({title:"Copie manuelle",sub:"Copie impossible",body:`<p class="mono">${escapeHtml(text)}</p>`,actions:[{label:"OK",secondary:true}]})); }
  else showSmart({title:"Copie manuelle",sub:"Copie impossible",body:`<p class="mono">${escapeHtml(text)}</p>`,actions:[{label:"OK",secondary:true}]});
}

$("btnScan").addEventListener("click", startScan);
$("btnStop").addEventListener("click", ()=>stopScan(true));
$("btnManualClose").addEventListener("click", ()=>stopScan(true));
$("btnStamp").addEventListener("click", stamp);
$("btnSearch").addEventListener("click", search);
$("btnClear").addEventListener("click", clearResults);
if($("btnHistory")) $("btnHistory").addEventListener("click", loadHistory);
$("btnCloseQr").addEventListener("click", ()=>closeModal(qrModal));
$("btnCopy").addEventListener("click", ()=>copyText(($("clientId").value||"").trim(), "ID copié."));
$("btnQrStamp").addEventListener("click", ()=>{ closeModal(qrModal); confirmStampClient({client_id:currentQr.id, ...currentQr.meta}); });
$("btnCopyQrId").addEventListener("click", ()=>copyText(currentQr.id, "ID copié."));
$("btnCopyQrLink").addEventListener("click", ()=>copyText(currentQr.url, "Lien QR copié."));
$("btnQrSelect").addEventListener("click", ()=>{ setClient(currentQr.id, currentQr.meta||{}); closeModal(qrModal); setMainStatus("Client sélectionné depuis le QR."); });

$("searchPhone").addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); search(); } });
$("adminKey").addEventListener("input", ()=>{ $("who").textContent = ($("adminKey").value || "").trim() === LOCAL_MODULE_PIN ? "PIN local OK" : "—"; });
window.addEventListener("adn-admin-gate-unlocked", ()=>setMainStatus("Accès Age Gate validé. Vous pouvez charger l’historique."));

const saved = localStorage.getItem(ADMIN_LS);
if(saved){ $("adminKey").value = saved; }
$("who").textContent = saved === LOCAL_MODULE_PIN ? "PIN local OK" : "—";
setEnvPill();
setApiState(true, API_BASE ? "Serveur" : "Démo locale");
setClient("", {});
setMainStatus("Prêt.");
