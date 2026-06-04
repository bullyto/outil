/*!
 * admin-gate.js — Apéro de Nuit 66®
 * Pop-up d'accès admin inspirée de l'Age Gate.
 *
 * Intégration sur chaque page admin :
 *   <script src="./admin-gate.js"></script>
 *
 * Optionnel AVANT le script :
 *   <script>
 *     window.ADN_ADMIN_GATE = {
 *       passwordHash: "SHA256_DU_MOT_DE_PASSE",
 *       rememberHours: 2160
 *     };
 *   </script>
 *
 * Important :
 * - Le mot de passe n'est jamais affiché dans l'interface.
 * - Le code ne montre pas le mot de passe en clair.
 * - Pour une vraie sécurité serveur, il faudra ensuite protéger par Worker/API.
 */
(function(){
  "use strict";

  const DEFAULT_PASSWORD_HASH = "c7c084318b6f1bece6f74ffce1ea53596070345272dee8040037497c7d4cbffe";

  const CFG = Object.assign({
    passwordHash: DEFAULT_PASSWORD_HASH,
    rememberHours: 2160,
    title: "Accès admin",
    subtitle: "Espace réservé",
    storageKey: "adn66_admin_gate_until",
    lastTryKey: "adn66_admin_gate_last_try",
    requireCloudflareToken: true,
    authUrl: "https://twillio-sms.apero-nuit-du-66.workers.dev/auth/login",
    tokenStorageKey: "adn66_admin_key",
    sharedTokenStorageKey: "adn66_admin_token"
  }, window.ADN_ADMIN_GATE || {});

  const STYLE_ID = "adn-admin-gate-style";
  const OVERLAY_ID = "adnAdminGate";
  const INPUT_ID = "adnAdminGatePassword";
  const ERROR_ID = "adnAdminGateError";

  function now(){ return Date.now(); }

  function storageAvailable(){
    try{
      const k = "__adn_admin_gate_test__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    }catch(e){
      return false;
    }
  }

  const CAN_LS = storageAvailable();

  function cookieSet(name, value, maxAgeSeconds){
    const v = encodeURIComponent(String(value));
    const max = Number.isFinite(maxAgeSeconds) ? "; Max-Age=" + Math.max(0, Math.floor(maxAgeSeconds)) : "";
    document.cookie = name + "=" + v + max + "; Path=/; SameSite=Lax";
  }

  function cookieGet(name){
    const safe = name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
    const m = document.cookie.match(new RegExp("(?:^|; )" + safe + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function cookieDel(name){
    document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax";
  }

  function storeSetInt(key, value, maxAgeSeconds){
    if(CAN_LS){
      try{ localStorage.setItem(key, String(value)); return; }catch(e){}
    }
    cookieSet(key, String(value), maxAgeSeconds);
  }

  function storeGetInt(key){
    let v = null;
    if(CAN_LS){
      try{ v = localStorage.getItem(key); }catch(e){ v = null; }
    }
    if(v === null) v = cookieGet(key);
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  function storeDel(key){
    if(CAN_LS){
      try{ localStorage.removeItem(key); }catch(e){}
    }
    cookieDel(key);
  }

  function getStoredAdminToken(){
    let token = "";
    if(CAN_LS){
      try{
        token = localStorage.getItem(CFG.tokenStorageKey) || localStorage.getItem(CFG.sharedTokenStorageKey) || "";
      }catch(e){ token = ""; }
    }
    if(!token) token = cookieGet(CFG.tokenStorageKey) || cookieGet(CFG.sharedTokenStorageKey) || "";
    return String(token || "").trim();
  }

  function storeAdminToken(token){
    const cleanToken = String(token || "").trim();
    if(!cleanToken) return;
    if(CAN_LS){
      try{
        localStorage.setItem(CFG.tokenStorageKey, cleanToken);
        localStorage.setItem(CFG.sharedTokenStorageKey, cleanToken);
        return;
      }catch(e){}
    }
    const ttl = Math.max(1, Number(CFG.rememberHours || 12)) * 60 * 60;
    cookieSet(CFG.tokenStorageKey, cleanToken, ttl);
    cookieSet(CFG.sharedTokenStorageKey, cleanToken, ttl);
  }

  function clearAdminToken(){
    if(CAN_LS){
      try{
        localStorage.removeItem(CFG.tokenStorageKey);
        localStorage.removeItem(CFG.sharedTokenStorageKey);
      }catch(e){}
    }
    cookieDel(CFG.tokenStorageKey);
    cookieDel(CFG.sharedTokenStorageKey);
  }

  function isUnlocked(){
    const gateOk = storeGetInt(CFG.storageKey) > now();
    if(!gateOk) return false;
    if(CFG.requireCloudflareToken !== true) return true;
    return !!getStoredAdminToken();
  }

  function unlock(){
    const ttl = Math.max(1, Number(CFG.rememberHours || 12)) * 60 * 60 * 1000;
    storeSetInt(CFG.storageKey, now() + ttl, Math.floor(ttl / 1000));
  }

  function lock(){
    storeDel(CFG.storageKey);
    clearAdminToken();
  }

  async function sha256(text){
    const normalized = String(text || "");
    if(!window.crypto || !window.crypto.subtle){
      throw new Error("Crypto indisponible");
    }
    const data = new TextEncoder().encode(normalized);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
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
  background:rgba(2,6,12,.72);
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
}
.adnAdminGateOverlay.show{display:flex;}
.adnAdminGateCard{
  width:min(520px,94vw);
  border-radius:22px;
  overflow:hidden;
  color:#f8fafc;
  background:linear-gradient(180deg,rgba(17,24,39,.97),rgba(23,32,51,.97));
  border:1px solid #283447;
  box-shadow:0 30px 80px rgba(0,0,0,.55);
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
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
.adnAdminGateBrand{
  display:flex;
  align-items:center;
  gap:14px;
  min-width:0;
}
.adnAdminGateBadge{
  width:38px;
  height:38px;
  border-radius:14px;
  display:grid;
  place-items:center;
  background:rgba(93,183,238,.18);
  border:1px solid rgba(93,183,238,.30);
  font-weight:950;
  color:#5db7ee;
  flex:0 0 auto;
}
.adnAdminGateBrand b{
  letter-spacing:.12em;
  text-transform:uppercase;
  font-size:13px;
  color:#cbd5e1;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.adnAdminGateBody{padding:18px;}
.adnAdminGateTitle{
  margin:6px 0 8px;
  font-size:28px;
  line-height:1.1;
  font-weight:950;
}
.adnAdminGateLead{
  margin:0 0 14px;
  color:#cbd5e1;
  line-height:1.45;
  font-size:15px;
  font-weight:700;
}
.adnAdminGateField{
  display:grid;
  gap:8px;
  margin-top:14px;
}
.adnAdminGateField label{
  color:#cbd5e1;
  font-size:12px;
  font-weight:900;
}
.adnAdminGateField input{
  width:100%;
  border:1px solid #283447;
  background:#0f172a;
  color:#f8fafc;
  border-radius:16px;
  padding:14px;
  font-size:18px;
  outline:none;
}
.adnAdminGateField input:focus{
  border-color:#5db7ee;
  box-shadow:0 0 0 4px rgba(93,183,238,.14);
}
.adnAdminGateError{
  display:none;
  margin-top:12px;
  padding:11px 12px;
  border-radius:14px;
  color:#fecaca;
  background:rgba(220,38,38,.10);
  border:1px solid rgba(220,38,38,.34);
  font-size:13px;
  font-weight:800;
}
.adnAdminGateError.show{display:block;}
.adnAdminGateBtns{
  display:grid;
  grid-template-columns:1fr;
  gap:10px;
  margin-top:14px;
}
.adnAdminGateBtn{
  border:1px solid #5db7ee;
  background:#5db7ee;
  color:#fff;
  padding:14px;
  border-radius:16px;
  cursor:pointer;
  font-weight:950;
  font-size:15px;
}
.adnAdminGateBtnSecondary{
  background:#0f172a;
  border-color:#283447;
  color:#f8fafc;
}
.adnAdminGateFine{
  margin:12px 0 0;
  color:#94a3b8;
  font-size:12px;
  line-height:1.35;
  text-align:center;
  font-weight:700;
}
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
              <button class="adnAdminGateBtn" type="submit">Entrer</button>
              <button class="adnAdminGateBtn adnAdminGateBtnSecondary" type="button" id="adnAdminGateClear">Effacer</button>
            </div>

            <div class="adnAdminGateFine">Accès mémorisé temporairement sur cet appareil.</div>
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

  function showGate(){
    const overlay = document.getElementById(OVERLAY_ID);
    const input = document.getElementById(INPUT_ID);
    if(!overlay) return;
    overlay.classList.add("show");
    lockScroll();
    setTimeout(() => input && input.focus(), 80);
  }

  function hideGate(){
    const overlay = document.getElementById(OVERLAY_ID);
    if(!overlay) return;
    overlay.classList.remove("show");
    unlockScroll();
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

  async function verifyPassword(value){
    const expected = String(CFG.passwordHash || "").trim().toLowerCase();
    const got = (await sha256(value)).toLowerCase();
    return expected && got === expected;
  }

async function verifyCloudflareAccess(password){
    if(CFG.requireCloudflareToken !== true) return true;

    const authUrl = String(CFG.authUrl || "").trim();
    if(!authUrl){
      throw new Error("URL d'authentification Cloudflare manquante.");
    }

    const response = await fetch(authUrl, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: String(password || "") })
    });

    const data = await response.json().catch(() => ({ success:false, error:"Réponse Cloudflare invalide" }));

    if(!response.ok || data.success !== true || data.authenticated !== true || !data.token){
      throw new Error(data.error || "Cloudflare refuse l'accès.");
    }

    storeAdminToken(data.token);
    return true;
  }

  function notifyUnlocked(){
    try{
      window.dispatchEvent(new CustomEvent("adn66:admin-unlocked", {
        detail: { token: getStoredAdminToken() }
      }));
    }catch(e){}
  }

  function wire(){
    const form = document.getElementById("adnAdminGateForm");
    const input = document.getElementById(INPUT_ID);
    const clear = document.getElementById("adnAdminGateClear");

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
          const ok = await verifyPassword(value);
          if(!ok){
            setError("Mot de passe incorrect.");
            if(input) input.select();
            return;
          }

          try{
            await verifyCloudflareAccess(value);
          }catch(authErr){
            setError(authErr && authErr.message ? authErr.message : "Cloudflare refuse l'accès.");
            if(input) input.select();
            return;
          }

          unlock();
          if(input) input.value = "";
          hideGate();
          notifyUnlocked();

          if(typeof window.__adnAdminGatePending === "function"){
            const fn = window.__adnAdminGatePending;
            window.__adnAdminGatePending = null;
            fn();
          }
        }catch(err){
          setError("Vérification impossible sur ce navigateur.");
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

    const overlay = document.getElementById(OVERLAY_ID);
    if(overlay && !overlay.__adnAdminGateBound){
      overlay.__adnAdminGateBound = true;
      overlay.addEventListener("click", (e) => {
        if(e.target === overlay){
          // volontairement aucune fermeture par clic dehors
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      const overlay = document.getElementById(OVERLAY_ID);
      const isOpen = overlay && overlay.classList.contains("show");
      if(isOpen && e.key === "Escape") e.preventDefault();
    });
  }

  function requireAdminThen(fn){
    if(isUnlocked()){
      fn();
      return;
    }
    window.__adnAdminGatePending = fn;
    showGate();
  }

  function init(){
    ensureStyle();
    ensureOverlay();
    wire();

    window.requireAdminThen = requireAdminThen;
    window.adnAdminGateLock = function(){
      lock();
      showGate();
    };
    window.adnAdminGateUnlockUntil = function(hours){
      const old = CFG.rememberHours;
      CFG.rememberHours = Number(hours || old);
      unlock();
      CFG.rememberHours = old;
      hideGate();
      notifyUnlocked();
    };

    window.adnAdminGateGetToken = getStoredAdminToken;

    if(!isUnlocked()) showGate();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
})();
