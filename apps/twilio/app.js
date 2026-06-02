const $ = id => document.getElementById(id);

const DEFAULT_API = "https://twillio-sms.apero-nuit-du-66.workers.dev";
let contacts = [];

function getApiUrl(){
  return (localStorage.getItem("adn66_sms_api") || DEFAULT_API).replace(/\/+$/,"");
}

function setStatus(ok, text){
  const el = $("apiStatus");
  el.textContent = text;
  el.className = "badge " + (ok ? "ok" : "ko");
}

function normalizePhone(p){
  if(!p) return null;
  let cleaned = String(p).trim().replace(/\s+/g,"").replace(/[.-]/g,"");
  if(cleaned.startsWith("+33") && cleaned.length === 12) return cleaned;
  if(cleaned.startsWith("0033") && cleaned.length === 13) return "+33" + cleaned.slice(4);
  if(cleaned.startsWith("0") && cleaned.length === 10) return "+33" + cleaned.slice(1);
  if((cleaned.startsWith("6") || cleaned.startsWith("7")) && cleaned.length === 9) return "+33" + cleaned;
  return null;
}

function parseContacts(text){
  const raw = text.split(/[\n,; \t]+/).map(x=>x.trim()).filter(Boolean);
  const normalized = raw.map(normalizePhone).filter(Boolean);
  return [...new Set(normalized)];
}

function calculateSmsSegments(message){
  const gsm7Regex = /^[\u000A\u000D\u0020-\u007E€£¥èéùìòÇØøÅåÄÖÑÜ§¿äöñüà^{}\\[~\]|]*$/;
  const isGsm7 = gsm7Regex.test(message);
  if(isGsm7) return {encoding:"GSM-7",segments: message.length <= 160 ? 1 : Math.ceil(message.length/153)};
  return {encoding:"UCS-2",segments: message.length <= 70 ? 1 : Math.ceil(message.length/67)};
}

function updateStats(){
  const msg = $("messageInput").value || "";
  const info = calculateSmsSegments(msg);
  contacts = parseContacts($("contactsInput").value || "");
  $("charCount").textContent = msg.length;
  $("encoding").textContent = info.encoding;
  $("segments").textContent = info.segments;
  $("clientCount").textContent = contacts.length;
}

async function api(path, options={}){
  const res = await fetch(getApiUrl()+path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  return await res.json();
}

$("apiUrl").value = getApiUrl();
$("saveApi").onclick = () => {
  localStorage.setItem("adn66_sms_api", $("apiUrl").value.trim());
  setStatus(true, "URL OK");
};
$("testApi").onclick = async () => {
  try{
    const data = await api("/status");
    setStatus(!!data.success, data.success ? "API OK" : "API KO");
  }catch(e){ setStatus(false, "API KO"); }
};
$("cleanContacts").onclick = () => {
  contacts = parseContacts($("contactsInput").value);
  $("contactsInput").value = contacts.join("\n");
  $("contactsResult").textContent = contacts.length + " numéro(s) valide(s).";
  updateStats();
};
$("importContacts").onclick = async () => {
  contacts = parseContacts($("contactsInput").value);
  if(!contacts.length){ $("contactsResult").textContent = "Aucun numéro valide."; return; }
  try{
    const data = await api("/clients/import", {method:"POST", body:JSON.stringify({phones:contacts, source:"pwa"})});
    $("contactsResult").textContent = JSON.stringify(data, null, 2);
  }catch(e){ $("contactsResult").textContent = "Erreur import : " + e.message; }
};
$("previewCampaign").onclick = async () => {
  contacts = parseContacts($("contactsInput").value);
  try{
    const data = await api("/campaign/preview", {method:"POST", body:JSON.stringify({message:$("messageInput").value, phones:contacts})});
    $("campaignResult").textContent = JSON.stringify(data, null, 2);
  }catch(e){ $("campaignResult").textContent = "Erreur preview : " + e.message; }
};
$("sendCampaign").onclick = async () => {
  contacts = parseContacts($("contactsInput").value);
  if(!contacts.length){ $("campaignResult").textContent = "Aucun contact."; return; }
  if(!confirm("Envoyer la campagne à " + contacts.length + " client(s) ?")) return;
  try{
    const data = await api("/twilio/send", {method:"POST", body:JSON.stringify({title:$("campaignTitle").value, message:$("messageInput").value, phones:contacts})});
    $("campaignResult").textContent = JSON.stringify(data, null, 2);
  }catch(e){ $("campaignResult").textContent = "Erreur envoi : " + e.message; }
};
$("loadClients").onclick = async () => {
  try{
    const data = await api("/clients/list");
    $("clientsList").innerHTML = (data.clients||[]).map(c=>`<div class="item"><b>${c.phone}</b><small>${c.name||""} ${c.source||""} - ${c.created_at||""}</small></div>`).join("") || "Aucun client";
  }catch(e){ $("clientsList").textContent = e.message; }
};
$("loadHistory").onclick = async () => {
  try{
    const data = await api("/campaigns/history");
    $("historyList").innerHTML = (data.campaigns||[]).map(c=>`<div class="item"><b>#${c.id} ${c.title}</b><small>${c.status} - ${c.total_clients} client(s) - ${c.created_at}</small><p>${c.message}</p></div>`).join("") || "Aucun historique";
  }catch(e){ $("historyList").textContent = e.message; }
};

$("messageInput").addEventListener("input", updateStats);
$("contactsInput").addEventListener("input", updateStats);
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
updateStats();
$("testApi").click();
