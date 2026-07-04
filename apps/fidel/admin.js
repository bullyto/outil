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
const LOCAL_MODULE_PIN_HASH = "9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0";
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
async function sha256Text(text){
  if(!window.crypto || !window.crypto.subtle) throw new Error("Crypto indisponible");
  const data = new TextEncoder().encode(String(text || ""));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
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
    // Version simplifiée : le champ visible sert directement de mot de passe serveur ADMIN_KEY.
    // On lit d'abord ce que l'admin vient de taper, puis l'ancienne valeur mémorisée.
    const typed = ($("adminKey") && $("adminKey").value || "").trim();
    if(typed) return typed;

    const saved = String(localStorage.getItem(WORKER_KEY_STORAGE) || "").trim();
    if(saved) return saved;

    // Compatibilité si un ancien admin-gate est encore présent sur une vieille page en cache.
    if(window.ADNAdminGate && typeof window.ADNAdminGate.getWorkerKey === "function"){
      const k = window.ADNAdminGate.getWorkerKey();
      if(k) return String(k).trim();
    }
    return "";
  }catch(_){ return ""; }
}
function saveWorkerAdminKey(key){
  try{ localStorage.setItem(WORKER_KEY_STORAGE, String(key || "").trim()); }catch(_){}
}
function clearWorkerAdminKey(){
  try{
    localStorage.removeItem(WORKER_KEY_STORAGE);
    localStorage.removeItem(ADMIN_LS); // ancien code local, supprimé pour éviter les conflits après changement ADMIN_KEY
  }catch(_){}
}
function getSavedLocalPin(){ return ""; }
function saveLocalPin(_pin){}
async function checkLocalPin(){ return true; }
async function requireAdminAccess(){
  const key = getWorkerAdminKey();
  if(!key){
    showError("Mot de passe admin serveur obligatoire. Mets ici la valeur actuelle de ADMIN_KEY Cloudflare.");
    return "";
  }
  saveWorkerAdminKey(key);
  const input = $("adminKey");
  if(input && !input.value) input.value = key;
  const who = $("who");
  if(who) who.textContent = "Accès serveur prêt";
  return key;
}
function pointsLabel(points){ return points === null || points === undefined || points === "" ? "Points : ?" : `Points : ${Number(points||0)}/8`; }

function isCompleteCard(points){
  return Number(points || 0) >= 8;
}
async function fetchClientCardById(cid){
  const id = String(cid || "").trim();
  if(!id || !API_BASE) return null;
  try{
    const r = await api("/loyalty/me?client_id=" + encodeURIComponent(id), {method:"GET"});
    const card = r && r.card ? r.card : null;
    if(!card) return null;
    return {
      client_id: id,
      name: card.name || "",
      phone: card.phone || "",
      phone_last4: card.phone_last4 || "",
      points: Number(card.points || 0),
      goal: Number(card.goal || 8),
      completed_at: card.completed_at || null,
      free_delivery: card.free_delivery || {active:false}
    };
  }catch(_){
    return null;
  }
}

function ensureHibairAdminStyles(){
  if(document.getElementById('adn66HibairAdminStyles')) return;
  const st = document.createElement('style');
  st.id = 'adn66HibairAdminStyles';
  st.textContent = `
    .hibair-mini{display:grid;gap:6px;margin-top:2px;padding:9px;border:1px solid rgba(93,183,238,.18);border-radius:14px;background:rgba(93,183,238,.06)}
    .hibair-line{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font-size:12px;font-weight:900;line-height:1.2}
    .hibair-line b{color:var(--text);font-weight:1000}.hibair-line .ok{color:var(--green2)}.hibair-line .off{color:var(--soft)}.hibair-line .warn{color:#fde68a}
    .hibair-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}.hibair-badge{border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.86);color:var(--muted);border-radius:999px;padding:5px 8px;font-size:11px;font-weight:1000;white-space:nowrap}.hibair-badge.active{border-color:rgba(22,163,74,.42);background:rgba(22,163,74,.14);color:var(--green2)}.hibair-badge.game{border-color:rgba(93,183,238,.42);background:rgba(93,183,238,.14);color:#bfdbfe}.hibair-badge.wheel{border-color:rgba(250,204,21,.45);background:rgba(250,204,21,.13);color:#fde68a}.hibair-detail-grid{display:grid;gap:8px}.hibair-detail-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.08);padding:7px 0;color:var(--muted);font-weight:800}.hibair-detail-row b{color:var(--text);text-align:right}.hibair-detail-title{margin:12px 0 4px;color:var(--blue);font-weight:1000;letter-spacing:.04em;text-transform:uppercase;font-size:12px}`;
  document.head.appendChild(st);
}
function rawPhoneForClient(it){ return it.phone || it.phone_digits || ''; }
function formatDateTimeSeconds(iso){
  if(!iso) return '—';
  const d = new Date(String(iso));
  if(Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'});
}
function msLeftLabel(iso){
  if(!iso) return '';
  const ms = Date.parse(String(iso)) - Date.now();
  if(!Number.isFinite(ms) || ms <= 0) return 'expirée';
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if(d > 0) return `${d}j ${h}h ${m}min ${sec}s`;
  if(h > 0) return `${h}h ${m}min ${sec}s`;
  if(m > 0) return `${m}min ${sec}s`;
  return `${sec}s`;
}
function getGameInfo(it){ return (it && it.game && typeof it.game === 'object') ? it.game : {has_played:false}; }
function getFreeDeliveryInfo(it){ return (it && it.free_delivery && typeof it.free_delivery === 'object') ? it.free_delivery : {active:false}; }

function getWheelInfo(it){ return (it && it.wheel && typeof it.wheel === 'object') ? it.wheel : {has_claim:false}; }
function wheelRewardNiceLabel(w){
  const id = String(w && w.reward_id || '');
  const label = String(w && w.reward_label || '').trim();
  if(id === 'WHEEL_DELIVERY_7D') return label || 'Livraison offerte 1 semaine';
  if(id === 'WHEEL_STAMP') return label || '1 tampon fidélité';
  if(id === 'WHEEL_REROLL') return label || 'Retourner la roue';
  return label || (id ? id : '—');
}
function wheelRewardShortLabel(w){
  const id = String(w && w.reward_id || '');
  if(id === 'WHEEL_DELIVERY_7D') return 'Livraison gagnée';
  if(id === 'WHEEL_STAMP') return 'Tampon gagné';
  if(id === 'WHEEL_REROLL') return 'Relance';
  return w && w.has_claim ? 'Gain roue' : 'Non';
}

function getGoogleReviewInfo(it){
  const gr = it && it.google_review && typeof it.google_review === 'object' ? it.google_review : null;
  const src = gr || {};

  // Compat Worker / GitHub :
  // Le Worker ADN66 renvoie "review_count_after" pour le compteur actuel.
  // L'ancienne interface admin affichait seulement "review_count_now", donc elle mettait "—".
  const before =
    src.review_count_before ??
    src.google_review_count_before ??
    (it && it.review_count_before) ??
    (it && it.google_review_count_before) ??
    null;

  const after =
    src.review_count_now ??
    src.review_count_after ??
    src.google_review_count_now ??
    src.google_review_count_after ??
    (it && it.review_count_now) ??
    (it && it.review_count_after) ??
    (it && it.google_review_count_now) ??
    (it && it.google_review_count_after) ??
    null;

  const checkedAt =
    src.checked_at ??
    src.last_checked_at ??
    src.checked_10min_at ??
    src.checked_1h_at ??
    (it && it.checked_at) ??
    (it && it.last_checked_at) ??
    (it && it.checked_10min_at) ??
    (it && it.checked_1h_at) ??
    (it && it.google_review_checked_at) ??
    null;

  const rewardedAt =
    src.rewarded_at ??
    (it && it.rewarded_at) ??
    (it && it.google_review_rewarded_at) ??
    null;

  const status =
    src.status ??
    (it && it.status) ??
    (it && it.google_review_status) ??
    'none';

  return {
    ...src,
    status,
    clicked_at: src.clicked_at ?? (it && it.clicked_at) ?? (it && it.google_review_clicked_at) ?? null,
    review_count_before: before,
    review_count_now: after,
    review_count_after: after,
    checked_at: checkedAt,
    rewarded_at: rewardedAt,
    rewarded_method: src.rewarded_method ?? (it && it.google_review_rewarded_method) ?? null,
    stamp_given: !!(src.stamp_given || status === 'rewarded' || status === 'manual_rewarded' || (it && it.google_review_stamp_given)),
    error_message: src.error_message ?? src.error ?? (it && it.google_review_error) ?? null
  };
}

function googleReviewStatusLabel(gr){
  const s = String(gr && gr.status || 'none');
  if(s === 'pending_10min') return 'En attente 10 min';
  if(s === 'waiting_1h') return 'En attente 1h';
  if(s === 'rewarded') return 'Tampon donné';
  if(s === 'manual_rewarded') return 'Tampon manuel';
  if(s === 'expired') return 'Expiré';
  if(s === 'error') return 'Erreur';
  if(s === 'api_missing') return 'Google non configuré';
  return 'Aucun';
}
function googleReviewStatusClass(gr){
  const s = String(gr && gr.status || 'none');
  if(s === 'rewarded' || s === 'manual_rewarded') return 'ok';
  if(s === 'pending_10min' || s === 'waiting_1h') return 'warn';
  if(s === 'expired' || s === 'error' || s === 'api_missing') return 'bad';
  return 'off';
}
function googleReviewShortLine(it){
  const gr = getGoogleReviewInfo(it);
  const label = googleReviewStatusLabel(gr);
  const s = String(gr.status || 'none');
  if(s === 'pending_10min' && gr.clicked_at) return label + ' · clic ' + formatDateTime(gr.clicked_at);
  if(s === 'waiting_1h' && gr.clicked_at) return label + ' · clic ' + formatDateTime(gr.clicked_at);
  if((s === 'rewarded' || s === 'manual_rewarded') && gr.rewarded_at) return label + ' · ' + formatDateTime(gr.rewarded_at);
  if(s === 'expired' && gr.checked_at) return label + ' · ' + formatDateTime(gr.checked_at);
  if(s === 'error' && gr.error_message) return label + ' · ' + gr.error_message;
  return label;
}
function googleReviewMessageForStatus(gr){
  const s = String(gr && gr.status || 'none');
  if(s === 'rewarded' || s === 'manual_rewarded') return 'Merci pour votre avis Google ⭐ Votre tampon fidélité a bien été ajouté à votre carte.';
  if(s === 'expired') return 'Bonjour, nous n’avons pas encore pu détecter votre avis Google. Vous pourrez réessayer plus tard depuis votre carte fidélité.';
  return 'Bonjour, votre avis Google est en cours de vérification. Patientez quelques minutes après publication, votre carte fidélité sera mise à jour automatiquement si l’avis est bien détecté.';
}
function renderGoogleReviewDetails(it){
  const gr = getGoogleReviewInfo(it);
  return `
      <div class="hibair-detail-title">Avis Google</div>
      <div class="hibair-detail-row"><span>Statut</span><b>${escapeHtml(googleReviewStatusLabel(gr))}</b></div>
      <div class="hibair-detail-row"><span>Mode automatique</span><b>${Number(it.points || 0) === 3 ? 'Oui · carte à 3 tampons' : 'Non · réservé au 3/8'}</b></div>
      <div class="hibair-detail-row"><span>Mode manuel admin</span><b>${Number(it.points || 0) < Number(it.goal || 8) && !(gr.stamp_given || gr.status === 'rewarded' || gr.status === 'manual_rewarded') ? 'Possible si avis déjà publié' : 'Bloqué / déjà donné'}</b></div>
      <div class="hibair-detail-row"><span>Tampon Google donné</span><b>${gr.stamp_given || gr.status === 'rewarded' || gr.status === 'manual_rewarded' ? 'Oui' : 'Non'}</b></div>
      <div class="hibair-detail-row"><span>Avis avant clic</span><b>${gr.review_count_before !== undefined && gr.review_count_before !== null ? Number(gr.review_count_before) : '—'}</b></div>
      <div class="hibair-detail-row"><span>Avis actuel</span><b>${gr.review_count_now !== undefined && gr.review_count_now !== null ? Number(gr.review_count_now) : '—'}</b></div>
      <div class="hibair-detail-row"><span>Date du clic</span><b>${escapeHtml(formatDateTimeSeconds(gr.clicked_at))}</b></div>
      <div class="hibair-detail-row"><span>Dernière vérification</span><b>${escapeHtml(formatDateTimeSeconds(gr.checked_at))}</b></div>
      <div class="hibair-detail-row"><span>Récompense</span><b>${escapeHtml(formatDateTimeSeconds(gr.rewarded_at))}</b></div>
      <div class="hibair-detail-row"><span>Méthode</span><b>${escapeHtml(gr.rewarded_method || '—')}</b></div>
      ${gr.error_message ? `<div class="hibair-detail-row"><span>Erreur</span><b>${escapeHtml(gr.error_message)}</b></div>` : ''}`;
}
function googleReviewClientId(obj){ return obj && (obj.client_id || obj.id || obj.cid || currentClient.id || ''); }
async function postGoogleReviewRoute(path, payload){
  const key = await requireAdminAccess();
  if(!key) return null;
  const body = JSON.stringify({admin_key:key, ...payload});
  return api(path, {method:'POST', headers:{'content-type':'text/plain;charset=utf-8','x-admin-key':key}, body});
}
function friendlyGoogleError(message){
  const m = String(message || '');
  if(m.includes('not_exactly_3_points')) return 'Le mode automatique est réservé aux cartes à 3/8. Utilisez le tampon manuel admin si le client avait déjà publié son avis avant.';
  if(m.includes('google_review_already_rewarded')) return 'Le tampon Google a déjà été donné sur cette carte.';
  if(m.includes('card_already_completed') || m.includes('already_completed')) return 'La carte est déjà complète, impossible d’ajouter un tampon Google.';
  if(m.includes('client_not_found') || m.includes('not_found')) return 'Client introuvable.';
  return m || 'Erreur inconnue.';
}
async function verifyGoogleReviewForClient(client){
  const cid = googleReviewClientId(client);
  if(!cid) return showError('Client introuvable pour la vérification Google.');
  try{
    setMainStatus('Vérification avis Google en cours…');
    await postGoogleReviewRoute('/admin/google-review/check', {client_id:cid});
    setApiState(true, 'Avis vérifié ✅');
    setMainStatus('Vérification Google terminée.');
    try{ await loadGoogleReviews(); }catch(_){}
    try{ await loadHistory(); }catch(_){}
  }catch(e){ setApiState(false, 'Erreur Google'); showError('Erreur avis Google : ' + friendlyGoogleError(e.message)); }
}
function confirmManualGoogleReward(client){
  const cid = googleReviewClientId(client);
  if(!cid) return showError('Client introuvable.');
  showSmart({
    title:'Donner le tampon Google manuellement ?',
    sub:clientName(client),
    body:`<p>Mode manuel admin : cette action ajoute +1 tampon Google même si la carte n’est pas exactement à 3/8.</p><p>À utiliser si le client avait déjà publié son avis Google avant la nouvelle règle.</p><p><b>${escapeHtml(pointsLabel(client.points))}</b></p><p class="mono">${escapeHtml(cid)}</p>`,
    actions:[
      {label:'Confirmer +1 tampon', onClick:()=>manualGoogleReward(client)},
      {label:'Annuler', secondary:true}
    ]
  });
}
async function manualGoogleReward(client){
  const cid = googleReviewClientId(client);
  try{
    setMainStatus('Ajout manuel du tampon Google…');
    const r = await postGoogleReviewRoute('/admin/google-review/manual-reward', {client_id:cid});
    const points = r && (r.points ?? r.total_points ?? r.current_points);
    if(points !== undefined) setClient(cid, {...client, points});
    setApiState(true, 'Tampon Google ✅');
    showPointResult(cid, {...client, points: points ?? client.points}, points ?? client.points, Number(points ?? client.points) >= 8, 'Tampon Google ajouté manuellement.');
    try{ await loadGoogleReviews(); }catch(_){}
    try{ await loadHistory(); }catch(_){}
  }catch(e){ setApiState(false, 'Erreur Google'); showError('Erreur tampon Google : ' + friendlyGoogleError(e.message)); }
}
function confirmResetGoogleReview(client){
  const cid = googleReviewClientId(client);
  if(!cid) return showError('Client introuvable.');
  showSmart({
    title:'Réinitialiser la demande Google ?',
    sub:clientName(client),
    body:`<p>La demande d’avis Google sera remise à zéro. Le client pourra recommencer plus tard depuis sa carte si les règles le permettent.</p><p class="mono">${escapeHtml(cid)}</p>`,
    actions:[
      {label:'Réinitialiser', className:'danger', onClick:()=>resetGoogleReview(client)},
      {label:'Annuler', secondary:true}
    ]
  });
}
async function resetGoogleReview(client){
  const cid = googleReviewClientId(client);
  try{
    setMainStatus('Réinitialisation avis Google…');
    await postGoogleReviewRoute('/admin/google-review/reset', {client_id:cid});
    setApiState(true, 'Avis Google reset ✅');
    setMainStatus('Demande avis Google réinitialisée.');
    try{ await loadGoogleReviews(); }catch(_){}
    try{ await loadHistory(); }catch(_){}
  }catch(e){ setApiState(false, 'Erreur Google'); showError('Erreur reset avis Google : ' + friendlyGoogleError(e.message)); }
}
function showGoogleReviewClientPanel(client){
  const cid = googleReviewClientId(client);
  const gr = getGoogleReviewInfo(client);
  showSmart({
    title:'Avis Google ⭐',
    sub:clientName(client),
    body:`<div class="hibair-detail-grid">
      <div class="hibair-detail-row"><span>Client</span><b>${escapeHtml(clientName(client))}</b></div>
      <div class="hibair-detail-row"><span>Téléphone</span><b>${escapeHtml(displayPhone(rawPhoneForClient(client), client.phone_last4))}</b></div>
      <div class="hibair-detail-row"><span>Carte</span><b>${escapeHtml(pointsLabel(client.points))}</b></div>
      ${renderGoogleReviewDetails(client)}
      <div class="hibair-detail-title">Message client</div>
      <div class="google-review-note">${escapeHtml(googleReviewMessageForStatus(gr))}</div>
      <div class="hibair-detail-title">ID</div>
      <div class="mono" style="font-size:11px;color:var(--soft);overflow-wrap:anywhere">${escapeHtml(cid)}</div>
    </div>`,
    actions:[
      {label:'Vérifier', onClick:()=>verifyGoogleReviewForClient(client)},
      {label:'Tampon manuel', onClick:()=>confirmManualGoogleReward(client)},
      {label:'Reset', secondary:true, onClick:()=>confirmResetGoogleReview(client)},
      {label:'Copier message', secondary:true, onClick:()=>copyText(googleReviewMessageForStatus(gr), 'Message avis Google copié.')},
      {label:'Fermer', secondary:true}
    ]
  });
}
function renderGoogleReviewStats(data){
  const host = $('googleReviewStats');
  if(!host) return;
  const stats = (data && data.stats) || data || {};
  host.innerHTML = `
    <div class="google-stat"><span>En attente</span><b>${Number(stats.pending || stats.waiting || 0)}</b></div>
    <div class="google-stat"><span>Récompensés</span><b>${Number(stats.rewarded || 0)}</b></div>
    <div class="google-stat"><span>Erreurs</span><b>${Number(stats.errors || stats.error || 0)}</b></div>`;
}
function normalizeGoogleReviewRequest(it){
  const gr = getGoogleReviewInfo(it);
  return {
    ...it,
    google_review: gr,
    client_id: it.client_id || it.card_id || it.id || '',
    name: it.name || it.client_name || 'Client',
    phone: it.phone || it.phone_digits || '',
    points: it.points ?? it.points_before ?? null
  };
}
function renderGoogleReviewRequests(items){
  const host = $('googleReviewList');
  if(!host) return;
  if(!items || !items.length){ host.innerHTML = '<div class="hint">Aucune demande d’avis Google à afficher.</div>'; return; }
  host.innerHTML = '';
  items.forEach(raw=>{
    const it = normalizeGoogleReviewRequest(raw);
    const gr = getGoogleReviewInfo(it);
    const cid = googleReviewClientId(it);
    const card = document.createElement('article');
    card.className = 'google-review-card';
    card.innerHTML = `
      <div class="result-top">
        <div>
          <div class="result-name">${escapeHtml(it.name || 'Client')}</div>
          <div class="result-meta mono">${escapeHtml(displayPhone(it.phone || it.phone_digits || '', it.phone_last4))}</div>
          <div class="result-meta">Clic : ${escapeHtml(formatDateTime(gr.clicked_at))}</div>
        </div>
        <div class="result-meta"><span class="google-status ${googleReviewStatusClass(gr)}">⭐ ${escapeHtml(googleReviewStatusLabel(gr))}</span><br>${escapeHtml(pointsLabel(it.points))}</div>
      </div>
      <div class="google-review-note">Avis avant : <b>${gr.review_count_before ?? '—'}</b> · Avis actuel : <b>${gr.review_count_now ?? '—'}</b>${gr.error_message ? '<br>Erreur : '+escapeHtml(gr.error_message) : ''}</div>
      <div class="result-actions">
        <button class="small" data-action="check">Vérifier</button>
        <button class="secondary small" data-action="details">Détails</button>
        <button class="secondary small" data-action="manual">Tampon</button>
        <button class="secondary small" data-action="copy">Message</button>
      </div>`;
    card.querySelector('[data-action="check"]').addEventListener('click', ()=>verifyGoogleReviewForClient({...it, client_id:cid}));
    card.querySelector('[data-action="details"]').addEventListener('click', ()=>showGoogleReviewClientPanel({...it, client_id:cid}));
    card.querySelector('[data-action="manual"]').addEventListener('click', ()=>confirmManualGoogleReward({...it, client_id:cid}));
    card.querySelector('[data-action="copy"]').addEventListener('click', ()=>copyText(googleReviewMessageForStatus(gr), 'Message avis Google copié.'));
    host.appendChild(card);
  });
}
async function loadGoogleReviews(){
  const key = await requireAdminAccess();
  if(!key) return;
  setMainStatus('Chargement avis Google…');
  if(!API_BASE){ renderGoogleReviewStats({pending:0,rewarded:0,errors:0}); renderGoogleReviewRequests([]); setApiState(true, 'Démo locale'); return; }
  try{
    const r = await api('/admin/google-review/requests?limit=50', {method:'GET', headers:{'x-admin-key':key}});
    renderGoogleReviewStats(r.stats ? r : {stats:r});
    renderGoogleReviewRequests(r.items || r.requests || r.history || []);
    setApiState(true, 'Avis Google OK');
    setMainStatus('Avis Google actualisés.');
  }catch(e){
    renderGoogleReviewStats({pending:0,rewarded:0,errors:1});
    const msg = String(e && e.message || e);
    const host = $('googleReviewList');
    if(host) host.innerHTML = `<div class="hint">Routes Avis Google pas encore disponibles ou erreur Worker : ${escapeHtml(msg)}</div>`;
    setApiState(false, 'Avis Google indisponible');
    setMainStatus('Avis Google indisponible pour le moment.');
  }
}
function renderHibairMini(it){
  ensureHibairAdminStyles();
  const g = getGameInfo(it);
  const fd = getFreeDeliveryInfo(it);
  const wheel = getWheelInfo(it);
  const hasWheel = !!wheel.has_claim;
  const hasGame = !!g.has_played;
  const best = (g.best_score !== null && g.best_score !== undefined) ? Number(g.best_score || 0) : null;
  const stampAt = g.reward_stamp_claimed_at || (it.rewards && it.rewards.GAME_25) || null;
  const deliveryClaimAt = g.free_delivery_claimed_at || (it.rewards && it.rewards.GAME_35) || null;
  const fdActive = !!fd.active;
  const fdTxt = fdActive ? `Active · ${msLeftLabel(fd.expires_at)}` : (fd.expires_at ? `Expirée le ${formatDateTime(fd.expires_at)}` : 'Non');
  const gr = getGoogleReviewInfo(it);
  const grClass = googleReviewStatusClass(gr);
  return `
    <div class="hibair-mini">
      <div class="hibair-line"><span>🎮 Hib’air Drink</span><b class="${hasGame ? 'ok' : 'off'}">${hasGame ? 'Oui' : 'Non'}${hasGame && best !== null ? ' · Score max '+best : ''}</b></div>
      <div class="hibair-line"><span>🚚 Livraison offerte</span><b class="${fdActive ? 'ok' : 'off'}">${escapeHtml(fdTxt)}</b></div>
      <div class="hibair-line"><span>🎡 Roue de la chance</span><b class="${hasWheel ? 'ok' : 'off'}">${hasWheel ? escapeHtml(wheelRewardShortLabel(wheel)) : 'Non'}</b></div>
      <div class="hibair-line"><span>⭐ Avis Google</span><b class="${grClass}">${escapeHtml(googleReviewShortLine(it))}</b></div>
      <div class="hibair-badges">
        ${stampAt ? '<span class="hibair-badge game">+1 jeu débloqué</span>' : '<span class="hibair-badge">+1 jeu non réclamé</span>'}
        ${deliveryClaimAt ? '<span class="hibair-badge game">Palier 35 réclamé</span>' : '<span class="hibair-badge">Palier 35 non réclamé</span>'}
        ${fdActive ? '<span class="hibair-badge active">Livraison active</span>' : ''}
        ${hasWheel ? '<span class="hibair-badge wheel">Roue : '+escapeHtml(wheelRewardShortLabel(wheel))+'</span>' : '<span class="hibair-badge">Roue non jouée</span>'}
        ${gr.status && gr.status !== 'none' ? '<span class="hibair-badge '+(grClass === 'ok' ? 'active' : grClass === 'warn' ? 'wheel' : '')+'">Avis Google : '+escapeHtml(googleReviewStatusLabel(gr))+'</span>' : '<span class="hibair-badge">Avis Google aucun</span>'}
      </div>
    </div>`;
}
function showClientDetails(it){
  const cid = it.client_id || it.id || it.cid || currentClient.id || '';
  const g = getGameInfo(it);
  const fd = getFreeDeliveryInfo(it);
  const wheel = getWheelInfo(it);
  const stampAt = g.reward_stamp_claimed_at || (it.rewards && it.rewards.GAME_25) || null;
  const deliveryClaimAt = g.free_delivery_claimed_at || (it.rewards && it.rewards.GAME_35) || null;
  const hasGame = !!g.has_played;
  const complete = isCompleteCard(it.points);
  const body = `
    <div class="hibair-detail-grid">
      <div class="hibair-detail-title">Client</div>
      <div class="hibair-detail-row"><span>Nom</span><b>${escapeHtml(it.name || 'Client')}</b></div>
      <div class="hibair-detail-row"><span>Téléphone</span><b>${escapeHtml(displayPhone(rawPhoneForClient(it), it.phone_last4))}</b></div>
      <div class="hibair-detail-row"><span>Carte</span><b>${escapeHtml(pointsLabel(it.points))}</b></div>
      ${complete ? '<div class="hibair-detail-row"><span>Action disponible</span><b>Remise à 0 possible</b></div>' : ''}
      <div class="hibair-detail-row"><span>Créée le</span><b>${escapeHtml(formatDateTimeSeconds(it.created_at))}</b></div>
      <div class="hibair-detail-row"><span>Dernière mise à jour</span><b>${escapeHtml(formatDateTimeSeconds(it.updated_at))}</b></div>
      <div class="hibair-detail-title">Hib’air Drink</div>
      <div class="hibair-detail-row"><span>A joué</span><b>${hasGame ? 'Oui' : 'Non'}</b></div>
      <div class="hibair-detail-row"><span>Pseudo jeu</span><b>${escapeHtml(g.public_name || '—')}</b></div>
      <div class="hibair-detail-row"><span>Meilleur score</span><b>${g.best_score !== undefined && g.best_score !== null ? Number(g.best_score || 0) : '—'}</b></div>
      <div class="hibair-detail-row"><span>Dernier score</span><b>${g.last_score !== undefined && g.last_score !== null ? Number(g.last_score || 0) : '—'}</b></div>
      <div class="hibair-detail-row"><span>Dernière partie</span><b>${escapeHtml(formatDateTimeSeconds(g.last_played_at))}</b></div>
      <div class="hibair-detail-title">Roue de la chance</div>
      <div class="hibair-detail-row"><span>A tourné / récupéré</span><b>${wheel.has_claim ? 'Oui' : 'Non'}</b></div>
      <div class="hibair-detail-row"><span>Gain obtenu</span><b>${escapeHtml(wheelRewardNiceLabel(wheel))}</b></div>
      <div class="hibair-detail-row"><span>Date du gain</span><b>${escapeHtml(formatDateTimeSeconds(wheel.claimed_at))}</b></div>
      <div class="hibair-detail-row"><span>ID gain roue</span><b>${escapeHtml(wheel.reward_id || '—')}</b></div>
      <div class="hibair-detail-title">Récompenses jeu</div>
      <div class="hibair-detail-row"><span>+1 tampon jeu</span><b>${stampAt ? 'Oui · '+escapeHtml(formatDateTime(stampAt)) : 'Non'}</b></div>
      <div class="hibair-detail-row"><span>Livraison offerte gagnée</span><b>${deliveryClaimAt ? 'Oui · '+escapeHtml(formatDateTime(deliveryClaimAt)) : 'Non'}</b></div>
      <div class="hibair-detail-title">Livraison offerte</div>
      <div class="hibair-detail-row"><span>Statut</span><b>${fd.active ? 'Active' : (fd.expires_at ? 'Expirée' : 'Non')}</b></div>
      <div class="hibair-detail-row"><span>Activée le</span><b>${escapeHtml(formatDateTime(fd.starts_at || fd.created_at))}</b></div>
      <div class="hibair-detail-row"><span>Expire le</span><b>${escapeHtml(formatDateTimeSeconds(fd.expires_at))}</b></div>
      <div class="hibair-detail-row"><span>Temps restant</span><b>${fd.active ? escapeHtml(msLeftLabel(fd.expires_at)) : '—'}</b></div>
      ${renderGoogleReviewDetails(it)}
      <div class="hibair-detail-title">ID</div>
      <div class="mono" style="font-size:11px;color:var(--soft);overflow-wrap:anywhere">${escapeHtml(cid)}</div>
    </div>`;
  const actions = [];
  if(complete){
    actions.push({label:'Remettre à 0', className:'danger', onClick:()=>confirmResetClient({...it, client_id:cid})});
  }else{
    actions.push({label:'Sélectionner', onClick:()=>{ setClient(cid, {name:it.name, phone:rawPhoneForClient(it), points:it.points}); setMainStatus('Client sélectionné depuis les détails.'); }});
  }
  actions.push({label:'Avis Google', secondary:true, onClick:()=>showGoogleReviewClientPanel({...it, client_id:cid})});
  actions.push({label:'QR', secondary:true, onClick:()=>showRecoveryQr(cid, it)});
  actions.push({label:'Fermer', secondary:true});
  showSmart({
    title:'Fiche client',
    sub: it.name || 'Client fidélité',
    body,
    actions
  });
}

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
  if(!res.ok){
    if(res.status === 401){
      clearWorkerAdminKey();
      const input = $("adminKey");
      if(input) input.value = "";
      const who = $("who");
      if(who) who.textContent = "Mot de passe refusé";
      throw new Error("Mot de passe admin serveur incorrect. Remets la nouvelle ADMIN_KEY Cloudflare dans le champ puis recommence.");
    }
    throw new Error((data && data.error) ? data.error : ("HTTP "+res.status));
  }
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

async function showScanConfirm(id){
  const fresh = await fetchClientCardById(id);
  if(fresh){
    setClient(id, {name:fresh.name, phone:fresh.phone, points:fresh.points});
  }
  const client = fresh || currentClient || {points:null};
  const complete = isCompleteCard(client.points);
  showSmart({
    title: complete ? "Carte complète 🎁" : "Carte détectée ✅",
    sub: complete ? "Remise à zéro disponible" : "Client prêt à être validé",
    body:`<p><b>ID client :</b><br><span class="mono">${escapeHtml(id)}</span></p><p>${pointsLabel(client.points)}</p>${complete ? '<p>La carte est à 8/8. Vous pouvez remettre uniquement les points à 0, sans supprimer la carte.</p>' : ''}`,
    actions: complete ? [
      {label:"Remettre à 0", className:"danger", onClick:()=>confirmResetClient({...client, client_id:id})},
      {label:"Afficher QR", secondary:true, onClick:()=>showRecoveryQr(id, client)},
      {label:"Annuler", secondary:true}
    ] : [
      {label:"Ajouter +1 point", onClick:()=>confirmStampClient({client_id:id, points:client.points, name:client.name, phone:client.phone})},
      {label:"Afficher QR", secondary:true, onClick:()=>showRecoveryQr(id, client)},
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
    await showScanConfirm(cid);
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
      ${renderHibairMini(it)}
      <div class="result-actions">
        <button class="small" data-action="stamp">+1</button>
        <button class="secondary small" data-action="qr">QR</button>
        <button class="secondary small" data-action="select">Détails</button>
        <button class="secondary small" data-action="copy">Copier</button>
      </div>`;
    card.querySelector('[data-action="stamp"]').addEventListener("click", ()=>confirmStampClient({...it, client_id:cid}));
    card.querySelector('[data-action="qr"]').addEventListener("click", ()=>showRecoveryQr(cid, it));
    card.querySelector('[data-action="select"]').addEventListener("click", ()=>showClientDetails({...it, client_id:cid}));
    card.querySelector('[data-action="copy"]').addEventListener("click", ()=>copyText(cid, "ID copié."));
    host.appendChild(card);
  });
}

function confirmStampClient(client){
  const cid = client.client_id || client.id || currentClient.id || $("clientId").value;
  if(!cid) return showError("Aucun client sélectionné.");
  if(isCompleteCard(client.points ?? currentClient.points)){
    return confirmResetClient({...client, client_id:cid});
  }
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
  const key = await requireAdminAccess();
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


function confirmResetClient(client){
  const cid = client.client_id || client.id || currentClient.id || $("clientId").value;
  if(!cid) return showError("Aucun client sélectionné.");
  showSmart({
    title:"Remettre la carte à 0 ?",
    sub:clientName(client),
    body:`<p><b>Carte actuelle :</b> ${escapeHtml(pointsLabel(client.points ?? currentClient.points))}</p><p>Cette action conserve le client, le téléphone, le QR, l’historique, Hib’air Drink et la livraison offerte.</p><p><b>Seuls les points repassent à 0/8.</b></p><p class="mono">${escapeHtml(cid)}</p>`,
    actions:[
      {label:"Confirmer remise à 0", className:"danger", onClick:()=>resetClientPoints(cid, client)},
      {label:"Afficher QR", secondary:true, onClick:()=>showRecoveryQr(cid, client)},
      {label:"Annuler", secondary:true}
    ]
  });
}

async function resetClientPoints(cid, meta={}){
  const key = await requireAdminAccess();
  cid = String(cid || "").trim();
  if(!key) return;
  if(!isValidClientId(cid)) return showError("ID client invalide.");
  $("who").textContent = "PIN local OK";
  setClient(cid, meta);

  if(!API_BASE){
    const stKey = "adn66_demo_state_"+cid;
    const state = JSON.parse(localStorage.getItem(stKey) || '{"points":0,"completed_at":null}');
    state.points = 0;
    state.completed_at = null;
    state.last_stamp_ts = null;
    localStorage.setItem(stKey, JSON.stringify(state));
    setApiState(true, "Démo locale");
    setClient(cid, {...meta, points:0});
    showPointResult(cid, meta, 0, false, "Carte remise à 0/8.");
    return;
  }

  try{
    const r = await api("/loyalty/reset-points", {method:"POST", headers:{"content-type":"text/plain;charset=utf-8"}, body:JSON.stringify({admin_key:key, client_id:cid})});
    const points = r.points ?? 0;
    setApiState(true, "Remise à 0 ✅");
    setClient(cid, {...meta, points});
    showPointResult(cid, {...meta, points}, points, false, "Carte remise à 0/8. Le client, le QR et les informations restent conservés.");
    try{ await loadHistory(); }catch(_){}
  }catch(e){
    setApiState(false, "Erreur");
    showError("Erreur remise à zéro : " + e.message);
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
  const key = await requireAdminAccess();
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
    const items = await api("/admin/loyalty/search?phone="+encodeURIComponent(phone), {method:"GET", headers:{"x-admin-key":key}});
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
      ${renderHibairMini(it)}
      <div class="result-actions">
        <button class="small ${isCompleteCard(it.points) ? 'danger' : ''}" data-action="${isCompleteCard(it.points) ? 'reset' : 'stamp'}">${isCompleteCard(it.points) ? 'Remettre à 0' : '+1 point'}</button>
        <button class="secondary small" data-action="select">Détails</button>
        <button class="secondary small" data-action="qr">QR</button>
        <button class="secondary small" data-action="copy">Copier</button>
      </div>`;
    const mainAction = card.querySelector('[data-action="stamp"], [data-action="reset"]');
    if(mainAction){
      mainAction.addEventListener("click", ()=> isCompleteCard(it.points)
        ? confirmResetClient({client_id:cid, name:it.name, phone:it.phone || it.phone_digits, phone_last4:it.phone_last4, points:it.points})
        : confirmStampClient({client_id:cid, name:it.name, phone:it.phone || it.phone_digits, phone_last4:it.phone_last4, points:it.points})
      );
    }
    card.querySelector('[data-action="select"]').addEventListener("click", ()=>showClientDetails({...it, client_id:cid}));
    card.querySelector('[data-action="qr"]').addEventListener("click", ()=>showRecoveryQr(cid, {name:it.name, phone:it.phone || it.phone_digits, points:it.points}));
    card.querySelector('[data-action="copy"]').addEventListener("click", ()=>copyText(cid, "ID copié."));
    host.appendChild(card);
  });
}

async function loadHistory(){
  const key = await requireAdminAccess();
  if(!key) return;
  setMainStatus("Chargement de l’historique…");
  if(!API_BASE){ renderHistory([]); setApiState(true, "Démo locale"); return; }
  try{
    const r = await api("/admin/loyalty/history?limit=100", {method:"GET", headers:{"x-admin-key":key}});
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
    const qrAction = $("btnQrStamp");
    if(qrAction){
      qrAction.textContent = isCompleteCard(meta.points) ? "Remettre à 0" : "+1 point";
      qrAction.classList.toggle("danger", isCompleteCard(meta.points));
    }
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
if($("btnGoogleReviews")) $("btnGoogleReviews").addEventListener("click", loadGoogleReviews);
$("btnCloseQr").addEventListener("click", ()=>closeModal(qrModal));
$("btnCopy").addEventListener("click", ()=>copyText(($("clientId").value||"").trim(), "ID copié."));
$("btnQrStamp").addEventListener("click", ()=>{
  closeModal(qrModal);
  const client = {client_id:currentQr.id, ...currentQr.meta};
  if(isCompleteCard(client.points)) confirmResetClient(client);
  else confirmStampClient(client);
});
$("btnCopyQrId").addEventListener("click", ()=>copyText(currentQr.id, "ID copié."));
$("btnCopyQrLink").addEventListener("click", ()=>copyText(currentQr.url, "Lien QR copié."));
$("btnQrSelect").addEventListener("click", ()=>{ setClient(currentQr.id, currentQr.meta||{}); closeModal(qrModal); setMainStatus("Client sélectionné depuis le QR."); });

$("searchPhone").addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); search(); } });
$("adminKey").addEventListener("input", ()=>{
  const v = $("adminKey").value.trim();
  if(v) saveWorkerAdminKey(v);
  $("who").textContent = v ? "ADMIN_KEY saisi" : "—";
});
$("adminKey").addEventListener("keydown", (e)=>{
  if(e.key === "Enter"){
    e.preventDefault();
    loadHistory();
  }
});
window.addEventListener("adn-admin-gate-unlocked", ()=>setMainStatus("Accès admin validé. Vous pouvez charger l’historique."));

// Migration : l'ancienne version utilisait un code local séparé. On le retire pour éviter
// qu'un ancien 0000 soit confondu avec la nouvelle ADMIN_KEY Cloudflare.
try{ localStorage.removeItem(ADMIN_LS); }catch(_){}
const saved = (()=>{ try{ return String(localStorage.getItem(WORKER_KEY_STORAGE) || "").trim(); }catch(_){ return ""; } })();
if(saved && $("adminKey")) $("adminKey").value = saved;
$("who").textContent = saved ? "Accès serveur mémorisé" : "—";
setEnvPill();
setApiState(true, API_BASE ? "Serveur" : "Démo locale");
setClient("", {});
setMainStatus("Prêt. Mets la nouvelle ADMIN_KEY Cloudflare dans le champ, puis actualise l’historique.");
