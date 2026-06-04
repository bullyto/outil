/*!
 * admin-gate.js — Apéro de Nuit 66®
 * Verrouillage admin côté PWA + validation réelle côté Cloudflare Worker.
 * Tant que Cloudflare ne valide pas le mot de passe, l'application reste masquée
 * et aucune donnée D1/Twilio n'est chargée.
 */
(function(){
  "use strict";

  const CFG = Object.assign({
    workerUrl: localStorage.getItem("adn66_worker_url") || "https://twillio-sms.apero-nuit-du-66.workers.dev",
    rememberHours: 2160,
    title: "Accès admin",
    subtitle: "Espace réservé Apéro de Nuit 66",
    tokenKey: "adn66_admin_token",
    untilKey: "adn66_admin_gate_until"
  }, window.ADN_ADMIN_GATE || {});

  const STYLE_ID = "adn-admin-gate-style";
  const OVERLAY_ID = "adnAdminGate";
  const INPUT_ID = "adnAdminGatePassword";
  const ERROR_ID = "adnAdminGateError";

  function now(){ return Date.now(); }

  function apiBase(){
    return String(CFG.workerUrl || "").replace(/\/+$/, "");
  }

  function getToken(){
    return localStorage.getItem(CFG.tokenKey) || localStorage.getItem("adn66_admin_key") || "";
  }

  function getUntil(){
    const n = parseInt(localStorage.getItem(CFG.untilKey) || "0", 10);
    return Number.isFinite(n) ? n : 0;
  }

  function setSession(token, expiresSeconds){
    const ttlMs = Number(expiresSeconds || CFG.rememberHours * 3600) * 1000;
    const until = now() + Math.max(60_000, ttlMs);
    localStorage.setItem(CFG.tokenKey, token);
    localStorage.setItem("adn66_admin_key", token);
    localStorage.setItem(CFG.untilKey, String(until));
  }

  function clearSession(){
    localStorage.removeItem(CFG.tokenKey);
    localStorage.removeItem("adn66_admin_key");
    localStorage.removeItem(CFG.untilKey);
  }

  async function workerLogin(password){
    const response = await fetch(apiBase() + "/auth/login", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const data = await response.json().catch(() => ({ success:false, error:"Réponse Worker invalide" }));
    if (!response.ok || !data.success || !data.token) {
      throw new Error(data.error || "Mot de passe incorrect");
    }
    return data;
  }

  async function workerCheck(){
    const token = getToken();
    if (!token || getUntil() <= now()) return false;

    const response = await fetch(apiBase() + "/auth/check?_t=" + Date.now(), {
      method: "GET",
      cache: "no-store",
      headers: { "Authorization": "Bearer " + token }
    });

    const data = await response.json().catch(() => ({ success:false }));
    return response.ok && data.success === true;
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;

    const css = `
.adnAdminGateOverlay{
  position:fixed;
  inset:0;
  z-index:999999;
  display:none;
  align-items:center;
  justify-content:center;
  padding:18px;
  background:rgba(2,6,12,.78);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
}
.adnAdminGateOverlay.show{display:flex;}
.adnAdminGateCard{
  width:min(520px,94vw);
  border-radius:22px;
  overflow:hidden;
  color:#f8fafc;
  background:linear-gradient(180deg,rgba(17,24,39,.98),rgba(23,32,51,.98));
  border:1px solid #283447;
  box-shadow:0 30px 80px rgba(0,0,0,.55);
}
.adnAdminGateTop{
  padding:16px 18px 12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  border-bottom:1px solid #283447;
  background:linear-gradient(180deg,rgba(93,183,238,.10),rgba(17,24,39,.08));
}
.adnAdminGateBrand{display:flex;align-items:center;gap:14px;min-width:0;}
.adnAdminGateBadge{
  width:38px;height:38px;border-radius:14px;display:grid;place-items:center;
  background:rgba(93,183,238,.18);border:1px solid rgba(93,183,238,.30);
  font-weight:950;color:#5db7ee;flex:0 0 auto;
}
.adnAdminGateBrand b{
  letter-spacing:.12em;text-transform:uppercase;font-size:13px;color:#cbd5e1;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.adnAdminGateBody{padding:18px;}
.adnAdminGateTitle{margin:6px 0 8px;font-size:28px;line-height:1.1;font-weight:950;}
.adnAdminGateLead{margin:0 0 14px;color:#cbd5e1;line-height:1.45;font-size:15px;font-weight:700;}
.adnAdminGateField{display:grid;gap:8px;margin-top:14px;}
.adnAdminGateField label{color:#cbd5e1;font-size:12px;font-weight:900;}
.adnAdminGateField input{
  width:100%;box-sizing:border-box;border:1px solid #283447;background:#0f172a;color:#f8fafc;
  border-radius:16px;padding:14px;font-size:18px;outline:none;
}
.adnAdminGateField input:focus{border-color:#5db7ee;box-shadow:0 0 0 4px rgba(93,183,238,.14);}
.adnAdminGateError{
  display:none;margin-top:12px;padding:11px 12px;border-radius:14px;color:#fecaca;
  background:rgba(220,38,38,.10);border:1px solid rgba(220,38,38,.34);
  font-size:13px;font-weight:800;
}
.adnAdminGateError.show{display:block;}
.adnAdminGateBtns{display:grid;grid-template-columns:1fr;gap:10px;margin-top:14px;}
.adnAdminGateBtn{
  border:1px solid #5db7ee;background:#5db7ee;color:#fff;padding:14px;border-radius:16px;
  cursor:pointer;font-weight:950;font-size:15px;
}
.adnAdminGateBtn:disabled{opacity:.65;cursor:wait;}
.adnAdminGateBtnSecondary{background:#0f172a;border-color:#283447;color:#f8fafc;}
.adnAdminGateFine{margin:12px 0 0;color:#94a3b8;font-size:12px;line-height:1.35;text-align:center;font-weight:700;}
`;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureOverlay(){
    if(document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement("div");
    overlay.className = "adnAdminGateOverlay";
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="adnAdminGateCard">
        <div class="adnAdminGateTop">
          <div class="adnAdminGateBrand">
            <div class="adnAdminGateBadge">AD</div>
            <b>APÉRO DE NUIT 66</b>
          </div>
        </div>
        <div class="adnAdminGateBody">
          <div class="adnAdminGateTitle">${CFG.title}</div>
          <p class="adnAdminGateLead">${CFG.subtitle}</p>
          <form id="adnAdminGateForm" autocomplete="off">
            <div class="adnAdminGateField">
              <label for="${INPUT_ID}">Mot de passe</label>
              <input id="${INPUT_ID}" type="password" inputmode="text" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Mot de passe" />
            </div>
            <div class="adnAdminGateError" id="${ERROR_ID}">Mot de passe incorrect.</div>
            <div class="adnAdminGateBtns">
              <button class="adnAdminGateBtn" id="adnAdminGateSubmit" type="submit">Entrer</button>
              <button class="adnAdminGateBtn adnAdminGateBtnSecondary" type="button" id="adnAdminGateClear">Effacer</button>
            </div>
            <div class="adnAdminGateFine">Validation par Cloudflare Worker. Aucune donnée n’est chargée avant autorisation.</div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function lockScroll(){
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function unlockScroll(){
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function setError(msg){
    const el = document.getElementById(ERROR_ID);
    if(!el) return;
    el.textContent = msg || "Mot de passe incorrect.";
    el.classList.add("show");
  }

  function clearError(){
    const el = document.getElementById(ERROR_ID);
    if(!el) return;
    el.classList.remove("show");
  }

  function showGate(){
    document.documentElement.classList.add("adn66-locked");
    const overlay = document.getElementById(OVERLAY_ID);
    const input = document.getElementById(INPUT_ID);
    if(overlay) overlay.classList.add("show");
    lockScroll();
    setTimeout(() => input && input.focus(), 80);
  }

  function hideGate(){
    const overlay = document.getElementById(OVERLAY_ID);
    if(overlay) overlay.classList.remove("show");
    unlockScroll();
  }

  async function unlockApp(){
    document.documentElement.classList.remove("adn66-locked");
    hideGate();
    if (typeof window.ADN_BOOT_APP === "function") {
      await window.ADN_BOOT_APP();
    }
  }

  function lockApp(){
    clearSession();
    window.__adn66AppBooted = false;
    showGate();
  }

  function wire(){
    const form = document.getElementById("adnAdminGateForm");
    const input = document.getElementById(INPUT_ID);
    const clear = document.getElementById("adnAdminGateClear");
    const submit = document.getElementById("adnAdminGateSubmit");

    if(form && !form.__adnAdminGateBound){
      form.__adnAdminGateBound = true;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearError();

        const value = String(input && input.value || "").trim();
        if(!value){
          setError("Mot de passe obligatoire.");
          return;
        }

        try{
          if (submit) {
            submit.disabled = true;
            submit.textContent = "Vérification...";
          }
          const data = await workerLogin(value);
          setSession(data.token, data.expiresSeconds);
          if(input) input.value = "";
          await unlockApp();
        }catch(err){
          setError(err.message || "Mot de passe incorrect.");
          if(input) input.select();
        }finally{
          if (submit) {
            submit.disabled = false;
            submit.textContent = "Entrer";
          }
        }
      });
    }

    if(clear && !clear.__adnAdminGateBound){
      clear.__adnAdminGateBound = true;
      clear.addEventListener("click", () => {
        if(input) input.value = "";
        clearError();
        setTimeout(() => input && input.focus(), 50);
      });
    }

    document.addEventListener("keydown", (e) => {
      const overlay = document.getElementById(OVERLAY_ID);
      const isOpen = overlay && overlay.classList.contains("show");
      if(isOpen && e.key === "Escape") e.preventDefault();
    });
  }

  async function init(){
    ensureStyle();
    ensureOverlay();
    wire();

    window.ADN_ADMIN_LOCK = lockApp;
    window.adnAdminGateLock = lockApp;

    try{
      if (await workerCheck()) {
        await unlockApp();
      } else {
        lockApp();
      }
    }catch(e){
      lockApp();
      setError("Cloudflare inaccessible ou session expirée.");
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
})();
