const $ = (id) => document.getElementById(id);
const state = { workerUrl: localStorage.getItem('adn66_worker_url') || 'https://twillio-sms.apero-nuit-du-66.workers.dev', adminKey: localStorage.getItem('adn66_admin_key') || '', deferredPrompt: null };

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.deferredPrompt = e; $('installBtn').classList.remove('hidden'); });
$('installBtn')?.addEventListener('click', async () => { if (!state.deferredPrompt) return; state.deferredPrompt.prompt(); state.deferredPrompt = null; $('installBtn').classList.add('hidden'); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.screen)));
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.go)));

function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.screen===id)); $(id).classList.add('active'); }
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2600); }
function apiBase(){ return state.workerUrl.replace(/\/+$/,''); }
function headers(){ const h={'Content-Type':'application/json'}; if(state.adminKey) h['Authorization']='Bearer '+state.adminKey; return h; }
async function api(path, options={}){ const res=await fetch(apiBase()+path,{...options,headers:{...headers(),...(options.headers||{})}}); const data=await res.json().catch(()=>({success:false,error:'Réponse non JSON'})); if(!res.ok && data.success!==false) data.success=false; return data; }
function fmtEuro(v){ if(v===null||v===undefined||isNaN(Number(v))) return '--'; return Number(v).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}); }

async function refreshDashboard(){
  try{
    const [dash,balance] = await Promise.all([api('/dashboard'), api('/twilio/balance')]);
    $('activeClients').textContent = dash?.stats?.activeClients ?? '--';
    $('problemCount').textContent = dash?.stats?.problems ?? '--';
    $('sentTotal').textContent = dash?.stats?.sentTotal ?? '--';
    $('balanceValue').textContent = balance?.success ? fmtEuro(balance.balance) : '--';
    $('balanceSub').textContent = balance?.success ? 'Compte Twilio' : (balance?.error || 'Erreur solde');
  } catch(e){ toast('Impossible actualiser'); }
}

async function previewCampaign(){
  const body = {
    message: $('campaignMessage').value,
    limit: Number($('sendLimit').value || 0),
    targetMode: $('targetMode').value,
    excludeAlreadySent: $('excludeAlreadySent').checked
  };
  const data = await api('/campaign/preview', {method:'POST', body:JSON.stringify(body)});
  if(!data.success){ toast(data.error || 'Erreur estimation'); return; }
  const p=data.preview;
  $('estClients').textContent=p.targetClients;
  $('estLimit').textContent=p.limit;
  $('estChars').textContent=p.characters;
  $('estSegments').textContent=p.segmentsPerSms;
  $('estTotalSegments').textContent=p.totalSegments;
  $('estCost').textContent=fmtEuro(p.estimatedCost);
  $('estBalance').textContent=fmtEuro(p.balance);
  $('estRemaining').textContent=fmtEuro(p.remainingBalance);
  const w=$('estimateWarning');
  if(p.warning){ w.textContent=p.warning; w.classList.remove('hidden'); } else w.classList.add('hidden');
}

async function sendCampaign(){
  const dryRun = $('dryRun').checked;
  const ok = dryRun || confirm('Confirmer l’envoi réel de la campagne SMS ?');
  if(!ok) return;
  const body={title:$('campaignTitle').value,message:$('campaignMessage').value,limit:Number($('sendLimit').value||0),targetMode:$('targetMode').value,excludeAlreadySent:$('excludeAlreadySent').checked,dryRun};
  const data=await api('/campaign/send',{method:'POST',body:JSON.stringify(body)});
  showResult(data);
  await refreshDashboard(); await loadHistory();
}

async function importContacts(){
  const raw=$('importNumbers').value;
  const data=await api('/clients/import',{method:'POST',body:JSON.stringify({raw,source:'pwa_import'})});
  $('importResult').classList.remove('hidden');
  $('importResult').textContent=JSON.stringify(data,null,2);
  await loadClients(); await refreshDashboard();
}

async function loadClients(){
  const f=$('clientFilter').value;
  const data=await api('/clients/list?filter='+encodeURIComponent(f));
  const tbody=$('clientsTable'); tbody.innerHTML='';
  (data.clients||[]).forEach(c=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${c.phone}</td><td>${statusPill(c.is_active,c.last_error_code)}</td><td>${c.total_sent||0}</td><td>${c.last_error_message||''}</td><td><button class="mini" data-action="deactivate" data-phone="${c.phone}">Désactiver</button> <button class="mini danger" data-action="delete" data-phone="${c.phone}">Supprimer</button></td>`;
    tbody.appendChild(tr);
  });
}
function statusPill(active,err){ if(!active) return '<span class="pill neutral">Désactivé</span>'; if(err) return '<span class="pill bad">Erreur</span>'; return '<span class="pill ok">Actif</span>'; }

document.addEventListener('click', async (e)=>{
  const btn=e.target.closest('[data-action]'); if(!btn) return;
  const phone=btn.dataset.phone, action=btn.dataset.action;
  if(action==='delete' && !confirm('Supprimer définitivement '+phone+' de D1 ?')) return;
  const data=await api('/clients/'+action,{method:'POST',body:JSON.stringify({phone})});
  toast(data.success?'Action effectuée':(data.error||'Erreur'));
  await loadClients(); await loadProblems(); await refreshDashboard();
});

async function loadProblems(){
  const data=await api('/problems/list');
  const tbody=$('problemsTable'); tbody.innerHTML='';
  (data.problems||[]).forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.phone}</td><td>${p.last_error_code||''}</td><td>${p.last_error_message||''}</td><td>${p.updated_at||''}</td><td><button class="mini" data-action="deactivate" data-phone="${p.phone}">Désactiver</button> <button class="mini danger" data-action="delete" data-phone="${p.phone}">Supprimer</button></td>`;
    tbody.appendChild(tr);
  });
}
async function loadHistory(){
  const data=await api('/campaigns/history');
  const tbody=$('historyTable'); tbody.innerHTML='';
  (data.campaigns||[]).forEach(c=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${c.id}</td><td>${c.title}</td><td>${c.requested_count||c.total_clients||0}</td><td>${c.sent_count||0}</td><td>${c.failed_count||0}</td><td>${fmtEuro(c.estimated_cost)}</td><td>${c.created_at||''}</td>`;
    tbody.appendChild(tr);
  });
}
function showResult(data){ toast(data.success?'Terminé':'Erreur'); console.log(data); alert(JSON.stringify(data,null,2)); }

$('workerUrl').value=state.workerUrl; $('adminKey').value=state.adminKey;
$('saveSettingsBtn').onclick=()=>{ state.workerUrl=$('workerUrl').value.trim(); state.adminKey=$('adminKey').value.trim(); localStorage.setItem('adn66_worker_url',state.workerUrl); localStorage.setItem('adn66_admin_key',state.adminKey); toast('Réglages enregistrés'); };
$('testWorkerBtn').onclick=async()=>{ $('saveSettingsBtn').click(); const data=await api('/status'); $('settingsResult').classList.remove('hidden'); $('settingsResult').textContent=JSON.stringify(data,null,2); };
$('refreshAllBtn').onclick=refreshDashboard; $('previewBtn').onclick=previewCampaign; $('sendCampaignBtn').onclick=sendCampaign; $('importBtn').onclick=importContacts; $('clearImportBtn').onclick=()=>$('importNumbers').value=''; $('loadClientsBtn').onclick=loadClients; $('clientFilter').onchange=loadClients; $('loadProblemsBtn').onclick=loadProblems; $('loadHistoryBtn').onclick=loadHistory;
refreshDashboard(); loadClients(); loadProblems(); loadHistory();
